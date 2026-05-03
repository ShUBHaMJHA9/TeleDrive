import express from 'express';
import path from 'path';
import { 
  getClient, limitConcurrency, getCachedMessage, setCachedMessage, 
  getStreamCache, setStreamCache, STREAM_CACHE_MAX_BYTES 
} from './files.js';
import { Share, File, Folder, User } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

// ─── Create share link (supports both files and folders) ─────────────────────
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const { fileId, folderId, type = 'public', expiresAt, password, permissions } = req.body;
    const userId = req.user.userId;

    if (!fileId && !folderId) {
      return res.status(400).json({ error: 'Either fileId or folderId is required' });
    }

    // Validate the resource exists and belongs to user
    if (fileId) {
      const file = await File.findOne({ _id: fileId, ownerId: userId });
      if (!file) return res.status(404).json({ error: 'File not found' });
    }
    if (folderId) {
      const folder = await Folder.findOne({ _id: folderId, ownerId: userId });
      if (!folder) return res.status(404).json({ error: 'Folder not found' });
    }

    const token = uuidv4().replace(/-/g, '').slice(0, 16);

    const share = new Share({
      fileId: fileId || null,
      folderId: folderId || null,
      ownerId: userId,
      type,
      token,
      password,
      expiresAt,
      permissions: permissions || { read: true, download: true, write: false },
    });

    await share.save();

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.status(201).json({
      token,
      shareUrl: `${baseUrl}/share/${token}`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Get share metadata (public) ──────────────────────────────────────────────
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const share = await Share.findOne({ token });
    if (!share || (share.expiresAt && share.expiresAt < new Date())) {
      return res.status(404).json({ error: 'Share not found or expired' });
    }

    const owner = await User.findById(share.ownerId).select('firstName lastName username');

    if (share.folderId) {
      // Folder share
      const folder = await Folder.findById(share.folderId);
      if (!folder) return res.status(404).json({ error: 'Folder not found' });

      return res.json({
        isFolder: true,
        folder: {
          _id: folder._id,
          name: folder.name,
          folderType: folder.folderType,
        },
        ownerName: owner ? `${owner.firstName || ''}${owner.lastName ? ' ' + owner.lastName : ''}`.trim() : 'Unknown',
        hasPassword: !!share.password,
        permissions: share.permissions,
      });
    } else {
      // File share
      const file = await File.findById(share.fileId).select('name size mimeType');
      if (!file) return res.status(404).json({ error: 'File not found' });

      return res.json({
        isFolder: false,
        file: {
          _id: file._id,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
        },
        ownerName: owner ? `${owner.firstName || ''}${owner.lastName ? ' ' + owner.lastName : ''}`.trim() : 'Unknown',
        hasPassword: !!share.password,
        permissions: share.permissions,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Get folder contents for a shared folder (public) ────────────────────────
router.get('/:token/folder-contents', async (req, res) => {
  try {
    const { token } = req.params;
    const share = await Share.findOne({ token });

    if (!share || (share.expiresAt && share.expiresAt < new Date())) {
      return res.status(404).json({ error: 'Share not found or expired' });
    }
    if (!share.folderId) {
      return res.status(400).json({ error: 'This share is not a folder share' });
    }

    const [files, folders] = await Promise.all([
      File.find({ folderId: share.folderId, isTrashed: { $ne: true } })
          .select('name size mimeType createdAt thumbnailId'),
      Folder.find({ parentId: share.folderId, isTrashed: { $ne: true } })
            .select('name folderType createdAt'),
    ]);

    res.json({ files, folders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Recursive Chat ID Resolver ──────────────────────────────────────────────
const getChatId = async (folderId) => {
  if (!folderId) return 'me';
  let currentFolder = await Folder.findById(folderId).lean();
  while (currentFolder) {
    if (currentFolder.chatId) return currentFolder.chatId;
    if (!currentFolder.parentId) break;
    currentFolder = await Folder.findById(currentFolder.parentId).lean();
  }
  return 'me';
};

// ─── Thumbnail helper (no-auth, uses share token) ────────────────────────────
const serveThumbnail = async (req, res, file, owner) => {
  try {
    const { getClient } = await import('./files.js');
    const client = await getClient(owner._id.toString(), owner);

    const targetChat = await getChatId(file.folderId);

    // Try custom thumbnailId first, then fall back to first chunk
    const telegramId = file.thumbnailId || (file.chunks && file.chunks[0]?.telegramFileId);
    if (!telegramId) return res.status(404).json({ error: 'No media available' });

    const messages = await client.getMessages(targetChat, { ids: [parseInt(telegramId, 10)] });
    if (!messages || messages.length === 0 || !messages[0]) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const media = messages[0].media;
    let thumbToDownload = undefined;

    if (media?.photo?.sizes) {
      thumbToDownload = media.photo.sizes[Math.min(1, media.photo.sizes.length - 1)];
    } else if (media?.document?.thumbs) {
      thumbToDownload = media.document.thumbs[Math.min(1, media.document.thumbs.length - 1)];
    }

    // Download a small thumbnail
    const buffer = await client.downloadMedia(messages[0], {
      workers: 2,
      thumb: thumbToDownload,
    });

    if (!buffer) return res.status(404).json({ error: 'Could not generate thumbnail' });

    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400, immutable',
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  } catch (err) {
    console.error('Thumbnail error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
};

// ─── Shared Telegram media stream helper ─────────────────────────────────────
const streamFile = async (res, file, owner, rangeHeader, mode) => {
  try {
    const userId = owner._id.toString();
    const client = await getClient(userId, owner);
    const targetChat = await getChatId(file.folderId);
    const totalSize = file.size;
    const fileId = file._id.toString();

    let mime = file.mimeType || 'application/octet-stream';
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.pdf'))  mime = 'application/pdf';
    if (fileName.endsWith('.mkv'))  mime = 'video/x-matroska';
    if (fileName.endsWith('.mp4'))  mime = 'video/mp4';
    if (fileName.endsWith('.webm')) mime = 'video/webm';

    // ── 1. RAM Cache Check ───────────────────────────────────────────────
    const cachedBuffer = getStreamCache(fileId);
    if (cachedBuffer && totalSize > 0) {
      if (rangeHeader && mode !== 'download') {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
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

    // ── 2. Pre-fetch Metadata (Turbo Layer 1) ───────────────────────────
    const uniqueMessageIds = [...new Set(file.chunks.map(c => parseInt(c.telegramFileId, 10)))];
    const toFetch = uniqueMessageIds.filter(id => !getCachedMessage(userId, targetChat, id));
    if (toFetch.length > 0) {
      try {
        let fetched = [];
        try {
          fetched = await client.getMessages(targetChat, { ids: toFetch });
        } catch (e) {
          // Failover: Try 'me' if channel fetch fails
          if (targetChat !== 'me') {
            fetched = await client.getMessages('me', { ids: toFetch });
          } else throw e;
        }

        if (Array.isArray(fetched)) {
          for (const msg of fetched) {
            if (msg) setCachedMessage(userId, targetChat, msg.id, msg);
          }
        }
      } catch (err) {
        console.error("Turbo Metadata fetch error:", err.message);
      }
    }
    const messageMap = new Map(
      uniqueMessageIds
        .map(id => [id, getCachedMessage(userId, targetChat, id)])
        .filter(([, m]) => m)
    );

    // ── 3. Optimized Streaming ──────────────────────────────────────────
    if (rangeHeader && mode !== 'download' && totalSize > 0) {
      const parts     = rangeHeader.replace(/bytes=/, '').split('-');
      const start     = parseInt(parts[0], 10);
      const end       = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 10 * 1024 * 1024 - 1, totalSize - 1);
      const chunksize = (end - start) + 1;

      res.status(206).set({
        'Content-Range':        `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges':        'bytes',
        'Content-Length':       chunksize,
        'Content-Type':         mime,
        'Cache-Control':        'no-cache',
        'X-Cache':              'MISS',
      });

      let currentOffset = 0;
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

      const PARALLEL = 4;
      for (let i = 0; i < rangeChunks.length; i += PARALLEL) {
        if (res.destroyed) break;
        const batch = rangeChunks.slice(i, i + PARALLEL);
        const buffers = await Promise.all(batch.map(({ msg, relativeStart, relativeEnd }) =>
          limitConcurrency(userId, () =>
            client.downloadFile(msg.media, {
              offset:      BigInt(relativeStart),
              limit:       (relativeEnd - relativeStart) + 1,
              workers:     16,
              requestSize: 2 * 1024 * 1024, // 🚀 Increased to 2MB for speed
            })
          )
        ));
        for (const buf of buffers) {
          if (buf && !res.destroyed) {
            res.write(buf);
          }
        }
      }
      if (!res.destroyed) res.end();
    } else {
      res.set({
        'Content-Type':        mime,
        'Content-Disposition': mode === 'download' ? `attachment; filename="${file.name}"` : 'inline',
        'Accept-Ranges':       'bytes',
        'Cache-Control':       'no-cache',
        'X-Cache':             'MISS',
        ...(totalSize > 0 ? { 'Content-Length': totalSize } : {}),
      });

      const collectedBuffers = [];
      const shouldCache = totalSize > 0 && totalSize <= STREAM_CACHE_MAX_BYTES;

      // 🚀 Turbo Layer 3 — Parallel Full Stream with Sliding Window
      const allSubChunks = [];
      for (const chunk of file.chunks) {
        const msg = messageMap.get(parseInt(chunk.telegramFileId, 10));
        if (!msg?.media) continue;
        const STEP = 2 * 1024 * 1024;
        for (let offset = 0; offset < chunk.size; offset += STEP) {
          allSubChunks.push({
            msg,
            offset: BigInt(offset),
            limit: Math.min(STEP, chunk.size - offset)
          });
        }
      }

      const PARALLEL_FULL = 6; 
      for (let i = 0; i < allSubChunks.length; i += PARALLEL_FULL) {
        if (res.destroyed) break;
        const batch = allSubChunks.slice(i, i + PARALLEL_FULL);
        const buffers = await Promise.all(batch.map(({ msg, offset, limit }) =>
          limitConcurrency(userId, () =>
            client.downloadFile(msg.media, {
              offset,
              limit,
              workers: 16,
              requestSize: 1024 * 1024
            })
          )
        ));
        for (const buf of buffers) {
          if (buf && !res.destroyed) {
            res.write(buf);
            if (shouldCache) collectedBuffers.push(buf);
          }
        }
      }
      if (!res.destroyed) res.end();
      if (shouldCache && collectedBuffers.length > 0) {
        setStreamCache(fileId, Buffer.concat(collectedBuffers));
      }
    }
  } catch (err) {
    console.error("Turbo Share Stream Error:", err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
    else res.end();
  }
};

// ─── Shared File: direct download/preview ────────────────────────────────────
const handleSharedFileStream = async (req, res, mode) => {
  try {
    const share = await Share.findOne({ token: req.params.token });
    if (!share || (share.expiresAt && share.expiresAt < new Date())) {
      return res.status(404).json({ error: 'Share not found or expired' });
    }

    const fileId = req.params.fileId || share.fileId;
    if (!fileId) return res.status(400).json({ error: 'No file associated' });

    // If fetching a file inside a shared folder, verify it belongs to that folder
    if (req.params.fileId && share.folderId) {
      const folderFile = await File.findOne({ _id: req.params.fileId, folderId: share.folderId });
      if (!folderFile) return res.status(403).json({ error: 'File not in shared folder' });
    }

    const file   = await File.findById(fileId).lean();
    if (!file)   return res.status(404).json({ error: 'File not found' });
    const owner  = await User.findById(share.ownerId).lean();
    if (!owner)  return res.status(404).json({ error: 'Owner not found' });

    await streamFile(res, file, owner, req.headers.range, mode);
  } catch (error) {
    console.error('Share stream error:', error);
    if (!res.headersSent) res.status(500).json({ error: error.message });
    else res.end();
  }
};

// Routes for single-file shares
router.get('/:token/download',  (req, res) => handleSharedFileStream(req, res, 'download'));
router.get('/:token/preview',   (req, res) => handleSharedFileStream(req, res, 'preview'));
router.get('/:token/thumbnail', async (req, res) => {
  try {
    const share = await Share.findOne({ token: req.params.token });
    if (!share || (share.expiresAt && share.expiresAt < new Date())) {
      return res.status(404).json({ error: 'Share not found or expired' });
    }
    const fileId = share.fileId;
    if (!fileId) return res.status(400).json({ error: 'Not a file share' });

    const file   = await File.findById(fileId).lean();
    if (!file)   return res.status(404).json({ error: 'File not found' });
    const owner  = await User.findById(share.ownerId).lean();
    if (!owner)  return res.status(404).json({ error: 'Owner not found' });

    await serveThumbnail(req, res, file, owner);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// Routes for files inside a shared folder
router.get('/:token/files/:fileId/download',  (req, res) => handleSharedFileStream(req, res, 'download'));
router.get('/:token/files/:fileId/preview',   (req, res) => handleSharedFileStream(req, res, 'preview'));
router.get('/:token/files/:fileId/thumbnail', async (req, res) => {
  try {
    const share = await Share.findOne({ token: req.params.token });
    if (!share || (share.expiresAt && share.expiresAt < new Date())) {
      return res.status(404).json({ error: 'Share not found or expired' });
    }
    
    // Verify file belongs to shared folder
    if (!share.folderId) return res.status(400).json({ error: 'Not a folder share' });
    const file = await File.findOne({ _id: req.params.fileId, folderId: share.folderId });
    if (!file) return res.status(404).json({ error: 'File not found in share' });
    
    const owner = await User.findById(share.ownerId);
    if (!owner) return res.status(404).json({ error: 'Owner not found' });

    await serveThumbnail(req, res, file, owner);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});


export default router;
