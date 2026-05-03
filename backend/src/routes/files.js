import express from 'express';
import { File, Folder, Share, User } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const router = express.Router();
const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 2000 * 1024 * 1024 } });

// ─────────────────────────────────────────────────────────────────────────────
// 🛡️ GLOBAL STABILITY PATCH: Process-Level Catch for GramJS "resolve()" crashes
//     MTProtoSender drops the promise chain for updates, causing unhandled 
//     rejections that crash Node.js. This intercepts it at the process level.
// ─────────────────────────────────────────────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  if (reason && reason.message && reason.message.includes('resolve()') && reason.message.includes('non-request instance')) {
    // Silently ignore the GramJS internal update loop error
    return;
  }
  // Log other unhandled rejections normally
  console.error('Unhandled Rejection:', reason);
});

// Ensure thumbnail cache directory exists
const THUMB_CACHE_DIR = path.join(os.tmpdir(), 'teledrive_thumbs');
fs.mkdir(THUMB_CACHE_DIR, { recursive: true }).catch(() => {});

// ─────────────────────────────────────────────────────────────────────────────
// 🚀 SPEED LAYER 1 — In-memory Telegram message metadata cache (TTL: 10 min)
//    Eliminates repeated getMessages() calls on every video seek / range request
// ─────────────────────────────────────────────────────────────────────────────
export const MESSAGE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
export const messageMetaCache = new Map(); // key: `${userId}:${chat}:${msgId}` -> { msg, cachedAt }

export const getCachedMessage = (userId, chat, msgId) => {
  const key = `${userId}:${chat}:${msgId}`;
  const entry = messageMetaCache.get(key);
  if (entry && (Date.now() - entry.cachedAt < MESSAGE_CACHE_TTL)) return entry.msg;
  return null;
};

export const setCachedMessage = (userId, chat, msgId, msg) => {
  const key = `${userId}:${chat}:${msgId}`;
  messageMetaCache.set(key, { msg, cachedAt: Date.now() });
};

// ─────────────────────────────────────────────────────────────────────────────
// 🚀 SPEED LAYER 2 — In-memory stream buffer cache for small files (< 50 MB)
//    Repeated plays / downloads never touch Telegram at all
// ─────────────────────────────────────────────────────────────────────────────
export const STREAM_CACHE_MAX_BYTES = 50 * 1024 * 1024;  // 50 MB per file
export const STREAM_CACHE_TTL       = 15 * 60 * 1000;    // 15 minutes
export const STREAM_CACHE_MAX_TOTAL = 500 * 1024 * 1024; // 500 MB total RAM budget
export const streamCache = new Map(); // fileId -> { buffer, cachedAt, size }
export let streamCacheTotalBytes = 0;

export const getStreamCache = (fileId) => {
  const entry = streamCache.get(fileId);
  if (entry && (Date.now() - entry.cachedAt < STREAM_CACHE_TTL)) return entry.buffer;
  if (entry) { streamCacheTotalBytes -= entry.size; streamCache.delete(fileId); }
  return null;
};

export const setStreamCache = (fileId, buffer) => {
  if (buffer.length > STREAM_CACHE_MAX_BYTES) return; // Too big — don't cache
  // Evict oldest entries if over budget
  while (streamCacheTotalBytes + buffer.length > STREAM_CACHE_MAX_TOTAL && streamCache.size > 0) {
    const [oldestKey, oldestEntry] = streamCache.entries().next().value;
    streamCacheTotalBytes -= oldestEntry.size;
    streamCache.delete(oldestKey);
  }
  streamCache.set(fileId, { buffer, cachedAt: Date.now(), size: buffer.length });
  streamCacheTotalBytes += buffer.length;
};

// Global client cache to avoid connecting/reconnecting on every range request
const clientCache = new Map(); // userId -> { client, lastUsed }
const requestQueue = new Map(); // userId -> { current, queue }

export const limitConcurrency = async (userId, task) => {
  if (!requestQueue.has(userId)) {
    requestQueue.set(userId, { current: 0, queue: [] });
  }
  
  const state = requestQueue.get(userId);
  const MAX_CONCURRENT = 15; // 🚀 Increased to 15 for ultra-fast parallel streams

  const runTask = async (taskToRun, resolve, reject) => {
    state.current++;
    try {
      const result = await taskToRun();
      if (resolve) resolve(result);
      return result;
    } catch (e) {
      if (reject) reject(e);
      throw e;
    } finally {
      state.current--;
      if (state.queue.length > 0) {
        const { nextTask, nextResolve, nextReject } = state.queue.shift();
        runTask(nextTask, nextResolve, nextReject);
      }
    }
  };

  if (state.current < MAX_CONCURRENT) {
    return runTask(task);
  } else {
    return new Promise((resolve, reject) => {
      state.queue.push({ nextTask: task, nextResolve: resolve, nextReject: reject });
    });
  }
};

export const getClient = async (userId, user) => {
  if (clientCache.has(userId)) {
    const cached = clientCache.get(userId);
    if (cached.client.connected) {
      cached.lastUsed = Date.now();
      return cached.client;
    }
  }

  const apiId = user.apiId || Number(process.env.TELEGRAM_API_ID);
  const apiHash = user.apiHash || process.env.TELEGRAM_API_HASH;
  const client = new TelegramClient(new StringSession(user.sessionData), apiId, apiHash, { 
    connectionRetries: 50,
    timeout: 60, // 🚀 Increased to 60 seconds for slow Telegram responses
    useIPV6: false,
    autoReconnect: true,
    floodSleepThreshold: 300,
    maxConcurrentDownloads: 15,
    deviceModel: "TeleDrive Turbo v2",
    systemVersion: "High-Speed"
  });
  
  await client.connect();
  
  // Suppress "TIMEOUT" noise from the update loop which we don't strictly need for stateless file operations
  client.addEventHandler(() => {}, new Api.UpdateShortMessage()); 
  client.setLogLevel("error"); 
  client.on("error", (err) => {
    if (err.message && (err.message.includes("TIMEOUT") || err.message.includes("updates") || err.message.includes("disconnected"))) return;
    console.error("Telegram Client Error:", err);
  });
  
  clientCache.set(userId, { client, lastUsed: Date.now() });
  return client;
};

const syncChatFiles = async (userId, folder, client) => {
  try {
    const messages = await client.getMessages(folder.chatId, { limit: 100 });
    
    // Batch lookup existing files to avoid N+1 query problem
    const existingIds = await File.find({ 
      ownerId: userId, 
      folderId: folder._id 
    }).distinct('chunks.telegramFileId');
    const existingSet = new Set(existingIds);

    const newFiles = [];
    for (const msg of messages) {
      if (msg.media && (msg.media.document || msg.media.photo)) {
        const telegramId = msg.id.toString();
        if (existingSet.has(telegramId)) continue;
        
        let fileName = "Untitled File";
        let fileSize = 0;
        let mimeType = "application/octet-stream";

        if (msg.media.document) {
          const doc = msg.media.document;
          fileSize = typeof doc.size === 'object' ? doc.size.toJSNumber() : doc.size;
          mimeType = doc.mimeType;
          const attr = doc.attributes.find(a => a.fileName);
          fileName = attr ? attr.fileName : (mimeType.startsWith('video/') ? 'Video' : 'Document');
        } else if (msg.media.photo) {
          if (msg.media.photo.sizes && msg.media.photo.sizes.length > 0) {
            const largest = msg.media.photo.sizes.reduce((prev, current) => {
              const prevSize = prev.size || (prev.w * prev.h) || 0;
              const currSize = current.size || (current.w * current.h) || 0;
              return (currSize > prevSize) ? current : prev;
            });
            fileSize = largest.size || 0;
          }
          fileName = `Photo_${telegramId}.jpg`;
          mimeType = "image/jpeg";
        }

        newFiles.push({
          ownerId: userId,
          name: fileName,
          size: fileSize || 0,
          folderId: folder._id,
          mimeType: mimeType,
          senderName: msg.post ? (folder.name) : (msg.sender ? (msg.sender.firstName || msg.sender.username) : "System"),
          senderId: msg.senderId ? msg.senderId.toString() : null,
          chunks: [{
            index: 0,
            size: fileSize || 0,
            telegramFileId: telegramId,
            uploadedAt: new Date(msg.date * 1000)
          }],
          createdAt: new Date(msg.date * 1000)
        });
      }
    }

    if (newFiles.length > 0) {
      await File.insertMany(newFiles);
    }
  } catch (err) {
    console.error("Batch sync error for", folder.name, err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 🧹 Cache eviction — runs every 60 seconds
// ─────────────────────────────────────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();

  // Evict disconnected / idle Telegram clients (5 min idle)
  for (const [userId, cached] of clientCache.entries()) {
    if (now - cached.lastUsed > 300000) {
      cached.client.disconnect();
      clientCache.delete(userId);
    }
  }

  // Evict stale message metadata cache entries
  for (const [key, entry] of messageMetaCache.entries()) {
    if (now - entry.cachedAt > MESSAGE_CACHE_TTL) messageMetaCache.delete(key);
  }

  // Evict stale stream cache entries
  for (const [fileId, entry] of streamCache.entries()) {
    if (now - entry.cachedAt > STREAM_CACHE_TTL) {
      streamCacheTotalBytes -= entry.size;
      streamCache.delete(fileId);
    }
  }
}, 60000);

// Get folders by type (channels/groups)
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user.userId;
    
    if (!['channel', 'group'].includes(type)) return res.status(400).send('Invalid type');

    const folders = await Folder.find({ 
        ownerId: userId, 
        folderType: type,
        isTrashed: false 
    }).sort({ createdAt: -1 });

    res.json({ folders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get trashed items
router.get('/trash/all', async (req, res) => {
  try {
    const userId = req.user.userId;
    const files = await File.find({ ownerId: userId, isTrashed: true }).sort({ trashedAt: -1 }).select('-chunks.telegramFileId');
    const folders = await Folder.find({ ownerId: userId, isTrashed: true }).sort({ trashedAt: -1 });
    res.json({ files, folders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get starred items
router.get('/filter/starred', async (req, res) => {
  try {
    const userId = req.user.userId;
    const files = await File.find({ ownerId: userId, isStarred: true, isTrashed: { $ne: true } }).select('-chunks.telegramFileId');
    const folders = await Folder.find({ ownerId: userId, isStarred: true, isTrashed: { $ne: true } });
    res.json({ files, folders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent items
router.get('/filter/recent', async (req, res) => {
  try {
    const userId = req.user.userId;
    const files = await File.find({ ownerId: userId, isTrashed: { $ne: true } })
      .sort({ lastViewedAt: -1 })
      .limit(20)
      .select('-chunks.telegramFileId');
    res.json({ files, folders: [] }); // Folders don't really have "recent" viewing as much as files
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get folder contents with pagination
router.get('/:folderId?', async (req, res) => {
  try {
    const folderId = req.params.folderId === 'root' ? null : req.params.folderId;
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Trigger lazy sync for community folders
    if (folderId) {
        const folder = await Folder.findOne({ _id: folderId, ownerId: userId });
        if (folder && folder.chatId) {
            const user = await User.findById(userId);
            const client = await getClient(userId.toString(), user);
            await syncChatFiles(userId, folder, client);
        }
    }

    const filesQuery = {
      ownerId: userId,
      folderId: folderId || null,
      isTrashed: { $ne: true },
    };

    const [files, totalFiles] = await Promise.all([
      File.find(filesQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-chunks.telegramFileId'),
      File.countDocuments(filesQuery)
    ]);

    const foldersQuery = {
      ownerId: userId,
      parentId: folderId || null,
      isTrashed: { $ne: true },
    };

    // If at root, exclude special community folders (channels/groups)
    if (!folderId) {
      foldersQuery.folderType = { $nin: ['channel', 'group'] };
    }

    const folders = await Folder.find(foldersQuery).sort({ name: 1 });

    // Calculate breadcrumbs for navigation persistence
    let bc = [{ id: 'root', name: 'Drive' }];
    if (folderId) {
      const currentFolder = await Folder.findById(folderId);
      if (currentFolder) {
        if (currentFolder.folderType === 'channel' || currentFolder.folderType === 'group') {
          bc.push({ id: folderId, name: currentFolder.name });
        } else {
          // For personal folders, we could trace parents, but for now we at least show current
          bc.push({ id: folderId, name: currentFolder.name });
        }
      }
    }

    res.json({ 
      files, 
      folders,
      breadcrumbs: bc,
      pagination: {
        page,
        limit,
        totalFiles,
        totalPages: Math.ceil(totalFiles / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync channels and groups from Telegram
router.post('/sync', async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    const client = await getClient(userId.toString(), user);

    const dialogs = await client.getDialogs({ limit: 100 });
    const syncedFolders = [];

    for (const dialog of dialogs) {
      if (!dialog.entity) continue;
      
      const isChannel = dialog.isChannel || (dialog.entity && dialog.entity.className === 'Channel');
      const isGroup = dialog.isGroup || (dialog.entity && dialog.entity.className === 'Chat');

      if (isChannel || isGroup) {
        const type = isChannel ? 'channel' : 'group';
        const chatId = dialog.id.toString();
        const isOwner = dialog.entity.creator || (dialog.entity.adminRights && dialog.entity.adminRights.addAdmins);

        // Check if already exists
        let folder = await Folder.findOne({ ownerId: userId, chatId: chatId });
        
        if (!folder) {
          let joinLink = "";
          try {
             if (dialog.entity.adminRights || isGroup) {
                const invite = await client.invoke(new Api.messages.ExportChatInvite({
                  peer: dialog.entity
                }));
                joinLink = invite.link;
             }
          } catch (e) {}

          folder = new Folder({
            ownerId: userId,
            name: dialog.title || 'Untitled Chat',
            chatId: chatId,
            folderType: type,
            joinLink: joinLink,
            isOwner: !!isOwner,
            parentId: null
          });
          await folder.save();
        } else {
            folder.name = dialog.title;
            folder.isOwner = !!isOwner;
            await folder.save();
        }
        syncedFolders.push(folder);
      }
    }

    res.json({ message: 'Sync complete', count: syncedFolders.length });
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create channel or group folder
router.post('/chat', async (req, res) => {
  try {
    const { name, type, parentId } = req.body; // type: 'channel' or 'group'
    const userId = req.user.userId;

    if (!['channel', 'group'].includes(type)) return res.status(400).json({ error: 'Invalid chat type' });

    const user = await User.findById(userId);
    const client = await getClient(userId.toString(), user);

    let chatId;
    let joinLink;

    if (type === 'channel') {
      const result = await client.invoke(new Api.channels.CreateChannel({
        title: name,
        about: 'Shared folder created via TeleDrive',
      }));
      
      if (!result.chats || result.chats.length === 0) {
        throw new Error('Telegram failed to create channel (User might be restricted)');
      }
      
      chatId = result.chats[0].id.toString();
      
      const invite = await client.invoke(new Api.messages.ExportChatInvite({
        peer: result.chats[0]
      }));
      joinLink = invite.link;
    } else {
      const result = await client.invoke(new Api.messages.CreateChat({
        users: [], // Start empty
        title: name
      }));

      if (!result.chats || result.chats.length === 0) {
        throw new Error('Telegram failed to create group');
      }

      chatId = result.chats[0].id.toString();
      
      const invite = await client.invoke(new Api.messages.ExportChatInvite({
        peer: result.chats[0]
      }));
      joinLink = invite.link;
    }

    const folder = new Folder({
      ownerId: userId,
      name: name,
      parentId: parentId || null,
      chatId: chatId,
      folderType: type,
      joinLink: joinLink
    });

    await folder.save();
    res.status(201).json(folder);
  } catch (error) {
    console.error("Create chat error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get chat members
router.get('/:folderId/members', async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.userId;

    const folder = await Folder.findOne({ _id: folderId, ownerId: userId });
    if (!folder || !folder.chatId) return res.status(404).json({ error: 'Folder or chat not found' });

    const user = await User.findById(userId);
    const client = await getClient(userId.toString(), user);

    const participants = await client.getParticipants(folder.chatId);
    
    const members = participants.map(p => ({
      id: p.id.toString(),
      firstName: p.firstName,
      lastName: p.lastName,
      username: p.username,
      phone: p.phone,
      isBot: p.bot,
      isAdmin: p.adminRights !== undefined
    }));

    res.json({ members });
  } catch (error) {
    console.error("Fetch members error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create folder
router.post('/', async (req, res) => {
  try {
    const { name, parentId } = req.body;
    const userId = req.user.userId;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Folder name required' });
    }

    const folder = new Folder({
      ownerId: userId,
      name: name.trim(),
      parentId: parentId || null,
    });

    await folder.save();
    res.status(201).json(folder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rename or move to trash item (File or Folder)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isTrashed } = req.body;
    const userId = req.user.userId;

    if (req.baseUrl.includes('files')) {
      const file = await File.findOne({ _id: id, ownerId: userId });
      if (!file) return res.status(404).json({ error: 'File not found' });
      if (name !== undefined) file.name = name;
      if (isTrashed !== undefined) {
        file.isTrashed = isTrashed;
        if (isTrashed) file.trashedAt = new Date();
      }
      if (req.body.isStarred !== undefined) file.isStarred = req.body.isStarred;
      if (req.body.folderId !== undefined) file.folderId = req.body.folderId;
      await file.save();
      return res.json(file);
    } else {
      const folder = await Folder.findOne({ _id: id, ownerId: userId });
      if (!folder) return res.status(404).json({ error: 'Folder not found' });
      if (name !== undefined) folder.name = name;
      if (isTrashed !== undefined) {
        folder.isTrashed = isTrashed;
        if (isTrashed) folder.trashedAt = new Date();
      }
      if (req.body.isStarred !== undefined) folder.isStarred = req.body.isStarred;
      if (req.body.parentId !== undefined) folder.parentId = req.body.parentId;
      await folder.save();
      return res.json(folder);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete item (File or Folder)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    if (req.baseUrl.includes('files')) {
      const result = await File.deleteOne({ _id: id, ownerId: userId });
      if (result.deletedCount === 0) return res.status(404).json({ error: 'File not found' });
      return res.json({ message: 'File deleted' });
    } else {
      const result = await Folder.deleteOne({ _id: id, ownerId: userId });
      if (result.deletedCount === 0) return res.status(404).json({ error: 'Folder not found' });
      return res.json({ message: 'Folder deleted' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Copy item
router.post('/:id/copy', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { targetFolderId } = req.body; // new folder location

    if (req.baseUrl.includes('files')) {
      const file = await File.findOne({ _id: id, ownerId: userId });
      if (!file) return res.status(404).json({ error: 'File not found' });
      
      const newFile = new File({
        ownerId: file.ownerId,
        name: `Copy of ${file.name}`,
        size: file.size,
        folderId: targetFolderId !== undefined ? targetFolderId : file.folderId,
        mimeType: file.mimeType,
        chunks: file.chunks,
      });
      await newFile.save();
      return res.json(newFile);
    } else {
      const folder = await Folder.findOne({ _id: id, ownerId: userId });
      if (!folder) return res.status(404).json({ error: 'Folder not found' });
      
      const newFolder = new Folder({
        ownerId: folder.ownerId,
        name: `Copy of ${folder.name}`,
        parentId: targetFolderId !== undefined ? targetFolderId : folder.parentId,
      });
      await newFolder.save();
      return res.json(newFolder);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get file thumbnail with local disk caching
router.get('/:fileId/thumbnail', async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.userId;

    // 1. Check local disk cache first for super-fast delivery
    const cachePath = path.join(THUMB_CACHE_DIR, `${fileId}.jpg`);
    try {
      await fs.access(cachePath);
      res.set({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=604800', // 7 days
        'X-Cache': 'HIT'
      });
      return res.sendFile(cachePath);
    } catch (e) {
      // Not in cache, proceed to fetch
    }

    const file = await File.findOne({ _id: fileId, ownerId: userId });
    if (!file || !file.chunks || file.chunks.length === 0 || !/^\d+$/.test(file.chunks[0].telegramFileId)) {
        return res.status(404).send('Not available');
    }

    const messageId = parseInt(file.chunks[0].telegramFileId, 10);
    const user = await User.findById(userId);
    const client = await getClient(userId.toString(), user);

    let peer = "me";
    if (file.folderId) {
        const folder = await Folder.findById(file.folderId);
        if (folder && folder.chatId) {
            peer = folder.chatId;
        }
    }

    const buffer = await limitConcurrency(userId.toString(), async () => {
        const messages = await client.getMessages(peer, { ids: [messageId] });
        if (!messages || messages.length === 0) return null;
        
        return await client.downloadMedia(messages[0], { 
            thumb: 1,
            workers: 1
        });
    });
    
    if (!buffer) {
      return res.status(404).send('No thumbnail available');
    }

    // 2. Save to local disk cache for future requests
    await fs.writeFile(cachePath, buffer).catch(err => console.error("Cache save error:", err));
    
    res.set({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=604800', // 7 days
        'X-Cache': 'MISS',
        'X-Content-Type-Options': 'nosniff'
    });
    res.send(buffer);
  } catch (error) {
    console.error("Thumbnail error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get community folder icon
router.get('/folders/:folderId/icon', async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.userId;

    const folder = await Folder.findOne({ _id: folderId, ownerId: userId });
    if (!folder || !folder.chatId) return res.status(404).send('Not a community folder');

    const user = await User.findById(userId);
    const client = await getClient(userId.toString(), user);

    const buffer = await client.downloadProfilePhoto(folder.chatId);
    if (!buffer) return res.status(404).send('No profile photo');

    res.set('Content-Type', 'image/jpeg');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Direct upload API endpoint
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { folderId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const tempFile = req.file.path;
    const fileName = req.file.originalname || 'uploaded_file';
    const mimeType = req.file.mimetype || 'application/octet-stream';
    const fileSize = req.file.size;

    const user = await User.findById(userId);
    const apiId = user.apiId || Number(process.env.TELEGRAM_API_ID);
    const apiHash = user.apiHash || process.env.TELEGRAM_API_HASH;
    
    const client = new TelegramClient(new StringSession(user.sessionData), apiId, apiHash, { connectionRetries: 1 });
    await client.connect();

    const isMedia = mimeType.startsWith('image/') || mimeType.startsWith('video/');

    // Upload to telegram
    const result = await client.sendFile("me", {
      file: tempFile,
      caption: fileName,
      forceDocument: !isMedia, // Let Telegram process media to generate thumbnails properly
    });
    
    const telegramFileId = result.id.toString(); 

    const file = new File({
      ownerId: userId,
      name: fileName,
      size: fileSize,
      folderId: folderId || null,
      mimeType: mimeType,
      chunks: [{
        index: 0,
        size: fileSize,
        telegramFileId: telegramFileId,
        uploadedAt: new Date(),
      }],
    });

    await file.save();
    await fs.unlink(tempFile).catch(() => {});

    res.json({
      success: true,
      file: file
    });

  } catch (error) {
    console.error("Upload API error:", error);
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 🚀 TURBO STREAM ENDPOINT — Range support + 3-layer caching + parallel fetch
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:fileId/:mode', async (req, res) => {
  try {
    const { fileId, mode } = req.params;
    if (!['preview', 'download'].includes(mode)) return res.status(400).send('Invalid mode');

    const userId = req.user.userId;

    const file = await File.findOne({ _id: fileId, ownerId: userId });
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (!file.chunks || file.chunks.length === 0) return res.status(404).send('File has no data.');

    // Update lastViewedAt non-blocking
    File.updateOne({ _id: fileId }, { lastViewedAt: new Date() }).catch(() => {});

    const range     = req.headers.range;
    const totalSize = file.size;

    let mime = file.mimeType || 'application/octet-stream';
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.pdf'))  mime = 'application/pdf';
    if (fileName.endsWith('.mkv'))  mime = 'video/x-matroska';
    if (fileName.endsWith('.mp4'))  mime = 'video/mp4';
    if (fileName.endsWith('.webm')) mime = 'video/webm';

    // ── Resolve target chat ───────────────────────────────────────────────
    let targetChat = 'me';
    if (file.folderId) {
      const folder = await Folder.findById(file.folderId).lean();
      if (folder?.chatId) targetChat = folder.chatId;
    }

    // ── SPEED LAYER 2 CHECK — serve from RAM buffer for small files ───────
    const cachedBuffer = getStreamCache(fileId);
    if (cachedBuffer && totalSize > 0) {
      if (range && mode === 'preview') {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end   = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
        res.status(206).set({
          'Content-Range':  `bytes ${start}-${end}/${totalSize}`,
          'Accept-Ranges':  'bytes',
          'Content-Length': (end - start) + 1,
          'Content-Type':   mime,
          'X-Cache':        'RAM-HIT',
        });
        return res.end(cachedBuffer.slice(start, end + 1));
      }
      res.set({
        'Content-Type':        mime,
        'Content-Disposition': mode === 'download' ? `attachment; filename="${file.name}"` : 'inline',
        'Accept-Ranges':       'bytes',
        'Content-Length':      totalSize,
        'X-Cache':             'RAM-HIT',
      });
      return res.end(cachedBuffer);
    }

    // ── Connect to Telegram ───────────────────────────────────────────────
    const user   = await User.findById(userId).lean();
    const client = await getClient(userId.toString(), user);

    // ── SPEED LAYER 1 — parallel message metadata fetch with per-key cache ─
    const uniqueMessageIds = [...new Set(file.chunks.map(c => parseInt(c.telegramFileId, 10)))];

    // For each message ID, check in-memory cache first; only fetch missing ones
    const toFetch = uniqueMessageIds.filter(id => !getCachedMessage(userId, targetChat, id));
    if (toFetch.length > 0) {
      const fetched = await client.getMessages(targetChat, { ids: toFetch });
      for (const msg of fetched) {
        if (msg) setCachedMessage(userId, targetChat, msg.id, msg);
      }
    }
    const messageMap = new Map(
      uniqueMessageIds
        .map(id => [id, getCachedMessage(userId, targetChat, id)])
        .filter(([, m]) => m)
    );

    // ─────────────────────────────────────────────────────────────────────
    // RANGE REQUEST — video seeking / partial content (206)
    // ─────────────────────────────────────────────────────────────────────
    if (range && mode === 'preview' && totalSize > 0) {
      const parts     = range.replace(/bytes=/, '').split('-');
      const start     = parseInt(parts[0], 10);
      const end       = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 10 * 1024 * 1024 - 1, totalSize - 1);
      const chunksize = (end - start) + 1;

      res.status(206).set({
        'Content-Range':        `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges':        'bytes',
        'Content-Length':       chunksize,
        'Content-Type':         mime,
        'Cache-Control':        'no-cache',
        'X-Content-Type-Options': 'nosniff',
        'X-Cache':              'MISS',
      });

      let currentOffset = 0;
      try {
        // ── SPEED LAYER 3 — parallel chunk downloads within the range ────
        const rangeChunks = [];
        for (const chunk of file.chunks) {
          const chunkStart = currentOffset;
          const chunkEnd   = currentOffset + chunk.size - 1;
          if (start <= chunkEnd && end >= chunkStart) {
            const msg = messageMap.get(parseInt(chunk.telegramFileId, 10));
            if (msg?.media) {
              rangeChunks.push({
                msg,
                relativeStart: Math.max(0, start - chunkStart),
                relativeEnd:   Math.min(chunk.size - 1, end - chunkStart),
              });
            }
          }
          currentOffset += chunk.size;
        }

        // Fetch all needed sub-ranges in parallel (up to 4 at once)
        const PARALLEL = 4;
        for (let i = 0; i < rangeChunks.length; i += PARALLEL) {
          if (res.destroyed) break;
          const batch = rangeChunks.slice(i, i + PARALLEL);
          const buffers = await Promise.all(batch.map(({ msg, relativeStart, relativeEnd }) =>
            limitConcurrency(userId.toString(), () =>
              client.downloadFile(msg.media, {
                offset:      BigInt(relativeStart),
                limit:       (relativeEnd - relativeStart) + 1,
                workers:     16,          // 🚀 max GramJS workers
                requestSize: 1024 * 1024, // 1 MB per DC request
              })
            )
          ));
          for (const buf of buffers) {
            if (buf && !res.destroyed) res.write(buf);
          }
        }
      } catch (streamErr) {
        console.error('Range stream error:', streamErr.message);
      } finally {
        if (!res.destroyed) res.end();
      }

    } else {
      // ─────────────────────────────────────────────────────────────────
      // FULL FILE STREAM — download mode or no Range header
      // ─────────────────────────────────────────────────────────────────
      res.set({
        'Content-Type':        mime,
        'Content-Disposition': mode === 'download' ? `attachment; filename="${file.name}"` : 'inline',
        'Accept-Ranges':       'bytes',
        'Cache-Control':       'no-cache',
        'X-Cache':             'MISS',
        ...(totalSize > 0 ? { 'Content-Length': totalSize } : {}),
      });

      // Collect buffers so we can optionally cache small files after streaming
      const collectedBuffers = [];
      const shouldCache = totalSize > 0 && totalSize <= STREAM_CACHE_MAX_BYTES;

      try {
        // ── SPEED LAYER 3 — stream each TG chunk in parallel 4MB sub-parts
        for (const chunk of file.chunks) {
          if (res.destroyed) break;
          const msg = messageMap.get(parseInt(chunk.telegramFileId, 10));
          if (!msg?.media) continue;

          if (chunk.size === 0 || totalSize === 0) {
            // Legacy photo / size-unknown file
            const buf = await limitConcurrency(userId.toString(), () =>
              client.downloadMedia(msg, { workers: 8 })
            );
            if (buf && !res.destroyed) { res.write(buf); if (shouldCache) collectedBuffers.push(buf); }
          } else {
            // Stream in 4 MB steps — each step uses parallel DC workers
            const STEP = 4 * 1024 * 1024;
            for (let offset = 0; offset < chunk.size; offset += STEP) {
              if (res.destroyed) break;
              const limit = Math.min(STEP, chunk.size - offset);
              const buf = await limitConcurrency(userId.toString(), () =>
                client.downloadFile(msg.media, {
                  offset:      BigInt(offset),
                  limit,
                  workers:     16,
                  requestSize: 1024 * 1024,
                })
              );
              if (buf && !res.destroyed) { res.write(buf); if (shouldCache) collectedBuffers.push(buf); }
            }
          }
        }
      } catch (fullErr) {
        console.error('Full stream error:', fullErr.message);
      } finally {
        if (!res.destroyed) res.end();
        // Populate RAM cache for next request
        if (shouldCache && collectedBuffers.length > 0) {
          setStreamCache(fileId, Buffer.concat(collectedBuffers));
        }
      }
    }
  } catch (error) {
    console.error('Stream error:', error);
    if (!res.headersSent) res.status(500).json({ error: error.message });
    else res.end();
  }
});

import AdmZip from 'adm-zip';

// Set custom thumbnail
router.post('/:fileId/thumbnail', upload.single('thumbnail'), async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.userId;
    const thumbnailPath = req.file.path;

    const file = await File.findOne({ _id: fileId, ownerId: userId });
    if (!file) return res.status(404).json({ error: 'File not found' });

    const user = await User.findById(userId);
    const apiId = user.apiId || Number(process.env.TELEGRAM_API_ID);
    const apiHash = user.apiHash || process.env.TELEGRAM_API_HASH;
    
    const client = new TelegramClient(new StringSession(user.sessionData), apiId, apiHash, { connectionRetries: 1 });
    await client.connect();

    // Upload thumbnail to Telegram
    const uploadResult = await client.sendFile("me", {
      file: thumbnailPath,
      caption: `Thumbnail for ${file.name}`,
      forceDocument: false // Upload as photo/media if possible
    });

    file.thumbnailId = uploadResult.id.toString();
    await file.save();

    // Cleanup temp file
    await fs.unlink(thumbnailPath).catch(() => {});

    res.json({ success: true, thumbnailId: file.thumbnailId });
  } catch (error) {
    console.error("Thumbnail upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Extract ZIP file
router.post('/:fileId/extract', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { folderName } = req.body;
    const userId = req.user.userId;

    const file = await File.findOne({ _id: fileId, ownerId: userId });
    if (!file) return res.status(404).json({ error: 'File not found' });
    
    let targetFolderId = file.folderId;
    
    if (folderName) {
      const newFolder = new Folder({
        ownerId: userId,
        name: folderName,
        parentId: file.folderId
      });
      await newFolder.save();
      targetFolderId = newFolder._id;
    }

    const targetFolder = targetFolderId ? await Folder.findById(targetFolderId) : null;
    let finalFolderId = targetFolderId;
    if (targetFolder && (targetFolder.folderType === 'channel' || targetFolder.folderType === 'group') && !targetFolder.isOwner) {
        finalFolderId = null; // Use My Drive root if not owner
    }

    if (!file.name.toLowerCase().endsWith('.zip')) {
      return res.status(400).json({ error: 'Not a ZIP file' });
    }

    const user = await User.findById(userId);
    const apiId = user.apiId || Number(process.env.TELEGRAM_API_ID);
    const apiHash = user.apiHash || process.env.TELEGRAM_API_HASH;
    
    const client = new TelegramClient(new StringSession(user.sessionData), apiId, apiHash, { connectionRetries: 1 });
    await client.connect();

    const messageId = parseInt(file.chunks[0].telegramFileId, 10);
    const messages = await client.getMessages("me", { ids: [messageId] });
    if (!messages || messages.length === 0) return res.status(404).json({ error: 'Telegram file not found' });

    const buffer = await client.downloadMedia(messages[0]);
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    const results = [];
    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      const content = entry.getData();
      const fileName = entry.entryName.split('/').pop();
      const tempPath = path.join(os.tmpdir(), `extract_${uuidv4()}_${fileName}`);
      await fs.writeFile(tempPath, content);

      // Upload to telegram
      const uploadResult = await client.sendFile("me", {
        file: tempPath,
        caption: fileName,
        forceDocument: true
      });

      const newFile = new File({
        ownerId: userId,
        name: fileName,
        size: content.length,
        folderId: finalFolderId || null,
        mimeType: 'application/octet-stream',
        chunks: [{
          index: 0,
          size: content.length,
          telegramFileId: uploadResult.id.toString(),
          uploadedAt: new Date(),
        }],
      });

      await newFile.save();
      await fs.unlink(tempPath).catch(() => {});
      results.push(newFile);
    }

    res.json({ success: true, files: results });
  } catch (error) {
    console.error("Extract error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Compress files to ZIP
router.post('/compress', async (req, res) => {
  try {
    const { fileIds, zipName, folderId } = req.body;
    const userId = req.user.userId;

    if (!fileIds || fileIds.length === 0) return res.status(400).json({ error: 'No files selected' });

    const user = await User.findById(userId);
    const apiId = user.apiId || Number(process.env.TELEGRAM_API_ID);
    const apiHash = user.apiHash || process.env.TELEGRAM_API_HASH;
    
    const targetFolder = folderId ? await Folder.findById(folderId) : null;
    let finalFolderId = folderId;
    if (targetFolder && (targetFolder.folderType === 'channel' || targetFolder.folderType === 'group') && !targetFolder.isOwner) {
        finalFolderId = null; // Use My Drive root if not owner
    }

    const client = new TelegramClient(new StringSession(user.sessionData), apiId, apiHash, { connectionRetries: 1 });
    await client.connect();

    const zip = new AdmZip();

    for (const id of fileIds) {
      const file = await File.findOne({ _id: id, ownerId: userId });
      if (!file) continue;

      const messageId = parseInt(file.chunks[0].telegramFileId, 10);
      const messages = await client.getMessages("me", { ids: [messageId] });
      if (messages && messages.length > 0) {
        const buffer = await client.downloadMedia(messages[0]);
        zip.addFile(file.name, buffer);
      }
    }

    const zipBuffer = zip.toBuffer();
    const finalZipName = zipName || 'compressed_files.zip';
    const tempPath = path.join(os.tmpdir(), `zip_${uuidv4()}_${finalZipName}`);
    await fs.writeFile(tempPath, zipBuffer);

    const uploadResult = await client.sendFile("me", {
      file: tempPath,
      caption: finalZipName,
      forceDocument: true
    });

    const zipFile = new File({
      ownerId: userId,
      name: finalZipName,
      size: zipBuffer.length,
      folderId: finalFolderId || null,
      mimeType: 'application/zip',
      chunks: [{
        index: 0,
        size: zipBuffer.length,
        telegramFileId: uploadResult.id.toString(),
        uploadedAt: new Date(),
      }],
    });

    await zipFile.save();
    await fs.unlink(tempPath).catch(() => {});

    res.json({ success: true, file: zipFile });
  } catch (error) {
    console.error("Compress error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
