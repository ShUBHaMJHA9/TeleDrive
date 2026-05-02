import express from 'express';
import { File, Folder, Share } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get folder contents
router.get('/:folderId?', async (req, res) => {
  try {
    const folderId = req.params.folderId === 'root' ? null : req.params.folderId;
    const userId = req.user.userId;

    const files = await File.find({
      ownerId: userId,
      folderId: folderId || null,
    }).select('-chunks.telegramFileId'); // Don't expose internal details

    const folders = await Folder.find({
      ownerId: userId,
      parentId: folderId || null,
    });

    res.json({ files, folders });
  } catch (error) {
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

// Rename folder
router.patch('/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    const { name } = req.body;
    const userId = req.user.userId;

    const folder = await Folder.findOne({ _id: folderId, ownerId: userId });
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    folder.name = name || folder.name;
    await folder.save();

    res.json(folder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete folder
router.delete('/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.userId;

    const result = await Folder.deleteOne({ _id: folderId, ownerId: userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    res.json({ message: 'Folder deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
