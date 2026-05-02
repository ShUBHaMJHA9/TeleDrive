import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, unique: true, required: true },
  username: String,
  phone: String,
  firstName: String,
  lastName: String,
  sessionData: { type: String }, // encrypted gramjs session
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const folderSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  path: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Folder' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const fileSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  size: { type: Number, required: true },
  mimeType: String,
  chunks: [{
    index: Number,
    size: Number,
    telegramFileId: String,
    uploadedAt: Date,
  }],
  encrypted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const uploadSessionSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadId: { type: String, unique: true, required: true },
  fileName: String,
  fileSize: Number,
  chunkCount: Number,
  uploadedChunks: [Number],
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder' },
  status: { type: String, enum: ['uploading', 'completed', 'failed'], default: 'uploading' },
  createdAt: { type: Date, default: Date.now, expires: 86400 }, // 24-hour TTL
});

const shareSchema = new mongoose.Schema({
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['public', 'private'], default: 'public' },
  token: { type: String, unique: true, required: true },
  expiresAt: Date,
  permissions: {
    read: { type: Boolean, default: true },
    download: { type: Boolean, default: true },
    write: { type: Boolean, default: false },
  },
  allowedUsers: [Number], // telegramIds for private shares
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model('User', userSchema);
export const Folder = mongoose.model('Folder', folderSchema);
export const File = mongoose.model('File', fileSchema);
export const UploadSession = mongoose.model('UploadSession', uploadSessionSchema);
export const Share = mongoose.model('Share', shareSchema);
