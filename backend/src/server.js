import 'dotenv/config.js';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/auth.js';
import fileRoutes from './routes/files.js';
import uploadRoutes from './routes/uploads.js';
import shareRoutes from './routes/shares.js';

// Middleware
import { authenticateJWT } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS - Allow localhost and Codespaces URLs
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
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
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
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
app.use('/api/me', authenticateJWT, (req, res) => {
  res.json({ user: req.user });
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
