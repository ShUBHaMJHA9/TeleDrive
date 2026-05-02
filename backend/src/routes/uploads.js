import express from 'express';
import { UploadSession, File } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

// Initialize upload
router.post('/init', async (req, res) => {
  try {
    const { name, size, mime, folderId } = req.body;
    const userId = req.user.userId;

    const uploadId = uuidv4();
    const chunkCount = Math.ceil(size / CHUNK_SIZE);

    const session = new UploadSession({
      ownerId: userId,
      uploadId,
      fileName: name,
      fileSize: size,
      chunkCount,
      folderId: folderId || null,
    });

    await session.save();

    res.json({
      uploadId,
      chunkSize: CHUNK_SIZE,
      chunkCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload chunk
router.post('/:uploadId/chunk', async (req, res) => {
  try {
    const { uploadId } = req.params;
    const { index } = req.body;
    const userId = req.user.userId;

    const session = await UploadSession.findOne({ uploadId, ownerId: userId });
    if (!session) {
      return res.status(404).json({ error: 'Upload session not found' });
    }

    // Track uploaded chunk (in real impl, store chunk data)
    if (!session.uploadedChunks.includes(index)) {
      session.uploadedChunks.push(index);
      await session.save();
    }

    res.json({
      uploadId,
      chunkIndex: index,
      message: 'Chunk uploaded',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Commit upload
router.post('/:uploadId/commit', async (req, res) => {
  try {
    const { uploadId } = req.params;
    const userId = req.user.userId;

    const session = await UploadSession.findOne({ uploadId, ownerId: userId });
    if (!session) {
      return res.status(404).json({ error: 'Upload session not found' });
    }

    // Create file record (in real impl, upload to Telegram here)
    const file = new File({
      ownerId: userId,
      name: session.fileName,
      size: session.fileSize,
      folderId: session.folderId,
      mimeType: 'application/octet-stream',
      chunks: Array.from({ length: session.chunkCount }, (_, i) => ({
        index: i,
        size: CHUNK_SIZE,
        telegramFileId: `demo-file-${uploadId}-chunk-${i}`,
        uploadedAt: new Date(),
      })),
    });

    await file.save();
    session.status = 'completed';
    await session.save();

    res.json({
      fileId: file._id,
      message: 'Upload completed',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get upload status
router.get('/:uploadId/status', async (req, res) => {
  try {
    const { uploadId } = req.params;
    const userId = req.user.userId;

    const session = await UploadSession.findOne({ uploadId, ownerId: userId });
    if (!session) {
      return res.status(404).json({ error: 'Upload session not found' });
    }

    const progress = Math.round((session.uploadedChunks.length / session.chunkCount) * 100);

    res.json({
      uploadId,
      fileName: session.fileName,
      progress,
      uploadedChunks: session.uploadedChunks.length,
      totalChunks: session.chunkCount,
      status: session.status,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
