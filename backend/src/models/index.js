import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, unique: true, required: true },
  username: String,
  phone: String,
  firstName: String,
  lastName: String,
  sessionData: { type: String }, // encrypted gramjs session
  apiId: { type: Number },
  apiHash: { type: String },
  passwordHash: { type: String },
  developerApiKey: { type: String, sparse: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const folderSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  path: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Folder' }],
  chatId: String, // Telegram Chat/Channel ID
  joinLink: String,
  folderType: { type: String, enum: ['personal', 'channel', 'group'], default: 'personal' },
  isOwner: { type: Boolean, default: false },
  isTrashed: { type: Boolean, default: false },
  trashedAt: Date,
  isStarred: { type: Boolean, default: false },
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
  isTrashed: { type: Boolean, default: false },
  trashedAt: Date,
  isStarred: { type: Boolean, default: false },
  thumbnailId: String,
  senderName: String, // Name of the user who uploaded to channel/group
  senderId: String,
  lastViewedAt: { type: Date, default: Date.now },
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
  status: { type: String, enum: ['uploading', 'completed', 'failed', 'downloading', 'processing'], default: 'uploading' },
  createdAt: { type: Date, default: Date.now, expires: 86400 }, // 24-hour TTL
});

const shareSchema = new mongoose.Schema({
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['public', 'private'], default: 'public' },
  token: { type: String, unique: true, required: true },
  password: { type: String }, // optional share password
  expiresAt: Date,
  permissions: {
    read: { type: Boolean, default: true },
    download: { type: Boolean, default: true },
    write: { type: Boolean, default: false },
  },
  allowedUsers: [Number], // telegramIds for private shares
  createdAt: { type: Date, default: Date.now },
});

// Indexes for high-speed lookups
folderSchema.index({ ownerId: 1, parentId: 1 });
folderSchema.index({ chatId: 1 });
fileSchema.index({ ownerId: 1, folderId: 1 });
fileSchema.index({ ownerId: 1, isTrashed: 1 });
fileSchema.index({ name: 'text' }); // Enable text search
uploadSessionSchema.index({ uploadId: 1 }, { unique: true });
uploadSessionSchema.index({ ownerId: 1 });
shareSchema.index({ token: 1 }, { unique: true });

export const User = mongoose.model('User', userSchema);
export const Folder = mongoose.model('Folder', folderSchema);
export const File = mongoose.model('File', fileSchema);
export const UploadSession = mongoose.model('UploadSession', uploadSessionSchema);
export const Share = mongoose.model('Share', shareSchema);
