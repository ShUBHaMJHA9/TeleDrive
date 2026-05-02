import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';

export const generateToken = (userId, telegramId) => {
  return jwt.sign(
    { userId, telegramId },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

import { User } from '../models/index.js';

export const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.query.apiKey || req.headers['x-api-key'];

  if (apiKey) {
    try {
      const user = await User.findOne({ developerApiKey: apiKey });
      if (!user) return res.status(401).json({ error: 'Invalid API Key' });
      req.user = { userId: user._id.toString(), telegramId: user.telegramId };
      return next();
    } catch (err) {
      return res.status(500).json({ error: 'Database error validating API Key' });
    }
  }

  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authorization token or API Key missing' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
