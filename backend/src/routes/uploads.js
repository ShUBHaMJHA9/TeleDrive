import express from 'express';
import axios from 'axios';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { UploadSession, File, User, Folder } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { CustomFile } from 'telegram/client/uploads.js';

const router = express.Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit per chunk
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

const getTempFilePath = (uploadId) => {
  const tmpDir = path.resolve(os.tmpdir(), 'teledrive');
  return path.join(tmpDir, `upload-${uploadId}.tmp`);
};

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
router.post('/:uploadId/chunk', upload.single('data'), async (req, res) => {
  try {
    const { uploadId } = req.params;
    const { index } = req.body;
    const userId = req.user.userId;

    const session = await UploadSession.findOne({ uploadId, ownerId: userId });
    if (!session) {
      return res.status(404).json({ error: 'Upload session not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No data file provided' });
    }

    const chunkBuffer = req.file.buffer;
    const offset = Number(index) * CHUNK_SIZE;
    const tempFile = getTempFilePath(uploadId);

    // Write chunk
    let fh;
    try {
      fh = await fs.open(tempFile, 'a'); // Ensure file exists
    } finally {
      if (fh) await fh.close();
    }
    
    fh = await fs.open(tempFile, 'r+');
    await fh.write(chunkBuffer, 0, chunkBuffer.length, offset);
    await fh.close();

    // Track uploaded chunk
    const idx = Number(index);
    if (!session.uploadedChunks.includes(idx)) {
      session.uploadedChunks.push(idx);
      await session.save();
    }

    res.json({
      uploadId,
      chunkIndex: idx,
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

    const tempFile = getTempFilePath(uploadId);
    
    const user = await User.findById(userId);
    const apiId = user.apiId || Number(process.env.TELEGRAM_API_ID);
    const apiHash = user.apiHash || process.env.TELEGRAM_API_HASH;
    
    const client = new TelegramClient(new StringSession(user.sessionData), apiId, apiHash, { connectionRetries: 1 });
    await client.connect();

    // Check if folder has a chatId
    let targetChat = "me";
    if (session.folderId) {
        const folder = await Folder.findById(session.folderId);
        if (folder && folder.chatId) {
            targetChat = folder.chatId;
        }
    }

    const stats = await fs.stat(tempFile);
    const totalSize = stats.size;
    const PART_SIZE = 1900 * 1024 * 1024; // 1.9GB safe limit for Telegram
    const totalParts = Math.ceil(totalSize / PART_SIZE);
    
    console.log(`Committing upload for ${session.fileName} (${totalSize} bytes, ${totalParts} parts)...`);
    
    const chunks = [];
    const uploadPromises = [];
    
    // Function to upload a single part
    const uploadPart = async (i) => {
        const start = i * PART_SIZE;
        const end = Math.min(totalSize, start + PART_SIZE);
        const currentPartSize = end - start;
        console.log(`[Turbo Upload] Starting part ${i+1}/${totalParts} (${currentPartSize} bytes)...`);
        
        const buffer = Buffer.alloc(currentPartSize);
        await fileHandle.read(buffer, 0, currentPartSize, start);

        const fileExt = path.extname(session.fileName);
        const baseName = path.basename(session.fileName, fileExt);
        const partFileName = totalParts > 1 ? `${baseName} part${i+1}${fileExt}` : session.fileName;

        const toUpload = await client.uploadFile({
            file: new CustomFile(partFileName, currentPartSize, "", buffer),
            workers: 32, // Maximum parallel workers for turbo speed
        });

        const result = await client.sendFile(targetChat, {
            file: toUpload,
            caption: partFileName,
            forceDocument: true,
        });

        return {
            index: i,
            size: currentPartSize,
            telegramFileId: result.id.toString(),
            uploadedAt: new Date(),
        };
    };

    try {
        // Upload parts in parallel batches of 3 to maximize throughput without DC disconnects
        for (let i = 0; i < totalParts; i += 3) {
            const batch = [];
            for (let j = i; j < Math.min(i + 3, totalParts); j++) {
                batch.push(uploadPart(j));
            }
            const batchResults = await Promise.all(batch);
            chunks.push(...batchResults);
        }
    } finally {
        await fileHandle.close().catch(() => {});
    }

    const file = new File({
      ownerId: userId,
      name: session.fileName,
      size: totalSize,
      folderId: session.folderId || null,
      mimeType: session.mimeType || 'application/octet-stream',
      senderName: user.firstName + (user.lastName ? ` ${user.lastName}` : ''),
      senderId: userId,
      chunks: chunks,
    });

    await file.save();
    session.status = 'completed';
    await session.save();
    
    // Cleanup
    await fs.unlink(tempFile).catch(() => {});

    res.json({
      fileId: file._id,
      message: 'Upload completed',
    });
  } catch (error) {
    console.error("Commit error:", error);
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

// Import from URL
router.post('/import-url', async (req, res) => {
  try {
    const { url, folderId } = req.body;
    const userId = req.user.userId;

    if (!url) return res.status(400).json({ error: 'URL is required' });

    let fileName = url.split('/').pop().split('?')[0];
    if (!fileName) fileName = 'imported_file';

    const uploadId = uuidv4();
    const tempFile = getTempFilePath(uploadId);

    // Create a session for tracking progress
    const session = new UploadSession({
      ownerId: userId,
      uploadId,
      fileName: fileName,
      fileSize: 0,
      status: 'downloading',
      folderId: folderId || null,
    });
    await session.save();

    // Respond with uploadId immediately so frontend can poll
    res.json({
      uploadId,
      message: 'Import started',
    });

    // Run the rest in background
    (async () => {
      try {
        // Download file
        console.log(`Starting download from ${url}...`);
        const response = await axios({
          method: 'GET',
          url: url,
          responseType: 'stream',
          timeout: 600000,
          maxRedirects: 5,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*'
          }
        });

        const mimeType = response.headers['content-type'] || 'application/octet-stream';
        const tempDir = path.dirname(tempFile);
        await fs.mkdir(tempDir, { recursive: true });

        const writer = createWriteStream(tempFile);
        await pipeline(response.data, writer);
        
        const stats = await fs.stat(tempFile);
        session.fileSize = stats.size;
        session.status = 'uploading';
        await session.save();

        const user = await User.findById(userId);
        const apiId = user.apiId || Number(process.env.TELEGRAM_API_ID);
        const apiHash = user.apiHash || process.env.TELEGRAM_API_HASH;
        
        const client = new TelegramClient(new StringSession(user.sessionData), apiId, apiHash, { 
          connectionRetries: 10,
          timeout: 600000
        });
        
        await client.connect();
        
        const isMedia = mimeType.startsWith('image/') || mimeType.startsWith('video/');

        // Pass the file path directly to GramJS to avoid OOM for large files
        const toUpload = await client.uploadFile({
            file: tempFile, // GramJS handles file paths efficiently
            workers: 16,
            onProgress: async (p) => {
                session.uploadedChunks = [Math.round(p * 100)];
                session.status = 'uploading';
                await session.save();
            }
        });

        // Check if folder has a chatId
        let targetChat = "me";
        if (folderId) {
            const folder = await Folder.findById(folderId);
            if (folder && folder.chatId) {
                targetChat = folder.chatId;
            }
        }

        const result = await client.sendFile(targetChat, {
          file: toUpload,
          caption: fileName,
          forceDocument: !isMedia,
        });
        
        const file = new File({
          ownerId: userId,
          name: fileName,
          size: session.fileSize,
          folderId: folderId || null,
          mimeType: mimeType,
          senderName: user.firstName + (user.lastName ? ` ${user.lastName}` : ''),
          senderId: userId,
          chunks: [{
            index: 0,
            size: session.fileSize,
            telegramFileId: result.id.toString(),
            uploadedAt: new Date(),
          }],
        });

        await file.save();
        session.status = 'completed';
        await session.save();
        await fs.unlink(tempFile).catch(() => {});
      } catch (err) {
        console.error("Background import error:", err);
        session.status = 'failed';
        await session.save();
      }
    })();

  } catch (error) {
    console.error("Import error detail:", {
      message: error.message,
      stack: error.stack,
      url: req.body.url
    });
    res.status(500).json({ error: `Import failed: ${error.message}` });
  }
});

export default router;
