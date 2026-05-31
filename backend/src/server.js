import 'dotenv/config.js';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import helmet from 'helmet';

// Import routes
import authRoutes from './routes/auth.js';
import fileRoutes from './routes/files.js';
import uploadRoutes from './routes/uploads.js';
import shareRoutes from './routes/shares.js';

// Middleware
import { authenticateJWT } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Production Speed & Security
app.use(helmet({
  contentSecurityPolicy: false, 
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());

// CORS - Allow localhost and Codespaces URLs
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://teledrive-e27w.vercel.app',
      process.env.FRONTEND_URL,
    ].filter(Boolean);
    
    // Allow any github.dev Codespaces URL
    if (!origin || allowedOrigins.includes(origin) || /\.github\.dev$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for development and account switching
  message: { error: 'Too many requests from this IP, please try again later.' },
});
app.use('/api/', limiter);

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/telegram-drive', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

connectDB();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', authenticateJWT, fileRoutes);
app.use('/api/folders', authenticateJWT, fileRoutes); // Same route handler
app.use('/api/uploads', authenticateJWT, uploadRoutes);
app.use('/api/shares', shareRoutes);
import { User, File, Folder } from './models/index.js';

app.use('/api/me', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const totalSize = await File.aggregate([
      { $match: { ownerId: new mongoose.Types.ObjectId(req.user.userId), isTrashed: { $ne: true } } },
      { $group: { _id: null, total: { $sum: "$size" } } }
    ]);
    
    res.json({ 
      user, 
      storage: {
        used: totalSize.length > 0 ? totalSize[0].total : 0,
        limit: null // Unlimited
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search', authenticateJWT, async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.user.userId;

    if (!q) return res.json({ files: [], folders: [] });

    // Case-insensitive regex search
    const regex = new RegExp(q, 'i');

    const files = await File.find({
      ownerId: userId,
      isTrashed: { $ne: true },
      name: { $regex: regex }
    }).select('-chunks.telegramFileId').limit(50);

    const folders = await Folder.find({
      ownerId: userId,
      isTrashed: { $ne: true },
      name: { $regex: regex }
    }).limit(50);

    res.json({ files, folders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
