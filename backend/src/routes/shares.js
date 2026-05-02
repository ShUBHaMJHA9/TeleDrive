import express from 'express';
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

// ─── Thumbnail helper (no-auth, uses share token) ────────────────────────────
const serveThumbnail = async (req, res, file, owner) => {
  try {
    const { getClient } = await import('./files.js');
    const client = await getClient(owner._id.toString(), owner);

    let targetChat = 'me';
    if (file.folderId) {
      const folder = await Folder.findById(file.folderId);
      if (folder && folder.chatId) targetChat = folder.chatId;
    }

    // Try custom thumbnailId first, then fall back to first chunk
    const telegramId = file.thumbnailId || (file.chunks && file.chunks[0]?.telegramFileId);
    if (!telegramId) return res.status(404).json({ error: 'No media available' });

    const messages = await client.getMessages(targetChat, { ids: [parseInt(telegramId, 10)] });
    if (!messages || messages.length === 0 || !messages[0]) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Download a small thumbnail (use thumb size for speed)
    const buffer = await client.downloadMedia(messages[0], {
      workers: 2,
      thumb: messages[0].media?.photo?.sizes
        ? messages[0].media.photo.sizes[Math.min(1, messages[0].media.photo.sizes.length - 1)]
        : undefined,
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
  const { getClient } = await import('./files.js');
  const client = await getClient(owner._id.toString(), owner);

  let targetChat = 'me';
  if (file.folderId) {
    const folder = await Folder.findById(file.folderId);
    if (folder && folder.chatId) targetChat = folder.chatId;
  }

  const mime = file.mimeType || 'application/octet-stream';
  const totalSize = file.size;

  if (rangeHeader && mode !== 'download') {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 1024 * 1024 - 1, totalSize - 1);
    const chunksize = end - start + 1;

    res.status(206).set({
      'Content-Range': `bytes ${start}-${end}/${totalSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': mime,
      'Cache-Control': 'no-cache',
    });

    let currentOffset = 0;
    try {
      for (const chunk of file.chunks) {
        if (res.destroyed) break;
        const chunkEnd = currentOffset + chunk.size - 1;
        if (start <= chunkEnd && end >= currentOffset) {
          const messageId = parseInt(chunk.telegramFileId, 10);
          const messages = await client.getMessages(targetChat, { ids: [messageId] });
          if (messages && messages[0]?.media) {
            const relativeStart = Math.max(0, start - currentOffset);
            const relativeEnd = Math.min(chunk.size - 1, end - currentOffset);
            const length = relativeEnd - relativeStart + 1;
            const buffer = await client.downloadFile(messages[0].media, {
              offset: BigInt(relativeStart), limit: length, workers: 8, requestSize: 256 * 1024,
            });
            if (buffer && !res.destroyed) res.write(buffer);
          }
        }
        currentOffset += chunk.size;
      }
    } finally {
      if (!res.destroyed) res.end();
    }
  } else {
    res.set({
      'Content-Type': mime,
      'Content-Length': totalSize,
      'Content-Disposition': mode === 'download' ? `attachment; filename="${file.name}"` : 'inline',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    });
    try {
      for (const chunk of file.chunks) {
        if (res.destroyed) break;
        const messageId = parseInt(chunk.telegramFileId, 10);
        const messages = await client.getMessages(targetChat, { ids: [messageId] });
        if (messages && messages[0]?.media) {
          const buffer = await client.downloadFile(messages[0].media, { workers: 16, requestSize: 1024 * 1024 });
          if (buffer && !res.destroyed) res.write(buffer);
        }
      }
    } finally {
      if (!res.destroyed) res.end();
    }
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
      const file = await File.findOne({ _id: req.params.fileId, folderId: share.folderId });
      if (!file) return res.status(403).json({ error: 'File not in shared folder' });
    }

    const file   = await File.findById(fileId);
    if (!file)   return res.status(404).json({ error: 'File not found' });
    const owner  = await User.findById(share.ownerId);
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

    const file   = await File.findById(fileId);
    if (!file)   return res.status(404).json({ error: 'File not found' });
    const owner  = await User.findById(share.ownerId);
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
    if (!share.folderId) return res.status(400).json({ error: 'Not a folder share' });

    const file = await File.findOne({ _id: req.params.fileId, folderId: share.folderId });
    if (!file) return res.status(403).json({ error: 'File not in shared folder' });

    const owner = await User.findById(share.ownerId);
    if (!owner) return res.status(404).json({ error: 'Owner not found' });

    await serveThumbnail(req, res, file, owner);
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

export default router;
