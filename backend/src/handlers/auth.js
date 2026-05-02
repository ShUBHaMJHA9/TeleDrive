import { User } from '../models/index.js';
import { generateToken } from '../middleware/auth.js';

// Simulate Telegram OTP (in production, use real gramjs)
const telegramOTPs = new Map(); // In-memory store for demo

export const requestCode = async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Phone number required' });
  }

  // Simulate OTP generation (in production, use gramjs to send real OTP)
  const code = '123456'; // Demo code
  telegramOTPs.set(phone, code);

  console.log(`📱 OTP for ${phone}: ${code} (demo only)`);

  res.json({
    message: 'Code sent to Telegram',
    phone,
    // In demo, return code for testing (remove in production)
    ...(process.env.NODE_ENV === 'development' && { code }),
  });
};

export const verifyCode = async (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ error: 'Phone and code required' });
  }

  // Verify OTP
  const storedCode = telegramOTPs.get(phone);
  if (!storedCode || storedCode !== code) {
    return res.status(401).json({ error: 'Invalid code' });
  }

  telegramOTPs.delete(phone);

  // Find or create user
  // In real implementation, extract telegramId from gramjs session
  const telegramId = Math.floor(Math.random() * 1000000000); // Demo ID
  
  let user = await User.findOne({ phone });
  if (!user) {
    user = new User({
      telegramId,
      phone,
      firstName: 'User',
    });
    await user.save();
  }

  const token = generateToken(user._id.toString(), telegramId);

  res.json({
    token,
    user: {
      _id: user._id,
      phone: user.phone,
      firstName: user.firstName,
    },
  });
};

export const refresh = (req, res) => {
  // Implement token refresh logic
  res.json({ message: 'Token refresh not yet implemented' });
};

export const logout = (req, res) => {
  res.json({ message: 'Logged out' });
};
