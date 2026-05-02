import express from 'express';
import { Share, File } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Create share link
router.post('/', async (req, res) => {
  try {
    const { fileId, type = 'public', expiresAt } = req.body;
    const userId = req.user?.userId;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const token = uuidv4().replace(/-/g, '').slice(0, 16);

    const share = new Share({
      fileId,
      ownerId: userId,
      type,
      token,
      expiresAt,
    });

    await share.save();

    res.status(201).json({
      token,
      shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/s/${token}`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get share (public endpoint)
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const share = await Share.findOne({ token });
    if (!share || (share.expiresAt && share.expiresAt < new Date())) {
      return res.status(404).json({ error: 'Share not found or expired' });
    }

    const file = await File.findById(share.fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({
      file: {
        _id: file._id,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
      },
      permissions: share.permissions,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
