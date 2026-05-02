import { User } from '../models/index.js';
import { generateToken } from '../middleware/auth.js';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import bcrypt from 'bcryptjs';

// In-memory store for pending auth clients
const pendingClients = new Map();

export const requestCode = async (req, res) => {
  let { phone, apiId, apiHash } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Phone number required' });
  }

  if (!apiId || !apiHash) {
    return res.status(400).json({ error: 'API ID and API Hash are required' });
  }

  // Ensure phone starts with +
  if (!phone.startsWith('+')) {
    phone = '+' + phone;
  }

  try {
    const parsedApiId = parseInt(apiId);

    if (isNaN(parsedApiId)) {
      return res.status(400).json({ error: 'API ID must be a valid number' });
    }

    const client = new TelegramClient(new StringSession(""), parsedApiId, apiHash, {
      connectionRetries: 5,
    });

    await client.connect();

    const result = await client.sendCode(
      {
        apiId: parsedApiId,
        apiHash,
      },
      phone
    );

    pendingClients.set(phone, {
      client,
      apiId: parsedApiId,
      apiHash,
      phoneCodeHash: result.phoneCodeHash
    });

    console.log(`📱 Real OTP requested for ${phone}`);

    res.json({
      message: 'Code sent via Telegram',
      phone
    });
  } catch (error) {
    console.error("Error sending code:", error);
    res.status(500).json({ error: error.message || 'Failed to send code' });
  }
};

export const verifyCode = async (req, res) => {
  let { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ error: 'Phone and code required' });
  }

  // Ensure phone starts with +
  if (!phone.startsWith('+')) {
    phone = '+' + phone;
  }

  const pendingData = pendingClients.get(phone);
  if (!pendingData) {
    return res.status(400).json({ error: 'Session expired or invalid phone. Request code again.' });
  }

  const { client, apiId, apiHash, phoneCodeHash } = pendingData;

  try {
    const signInResult = await client.invoke(new Api.auth.SignIn({
      phoneNumber: phone,
      phoneCodeHash: phoneCodeHash,
      phoneCode: code
    }));
    
    // Save session string
    const sessionData = client.session.save();
    
    pendingClients.delete(phone);
    
    // Check if user exists or create
    let user = await User.findOne({ phone });
    if (!user) {
      user = new User({
        telegramId: signInResult.user.id,
        phone,
        firstName: signInResult.user.firstName || 'User',
        sessionData,
        apiId,
        apiHash
      });
      await user.save();
    } else {
      user.sessionData = sessionData;
      user.telegramId = signInResult.user.id;
      user.apiId = apiId;
      user.apiHash = apiHash;
      await user.save();
    }

    const token = generateToken(user._id.toString(), user.telegramId);

    console.log(`✅ User ${phone} logged in successfully`);

    res.json({
      token,
      user: {
        _id: user._id,
        phone: user.phone,
        firstName: user.firstName,
      },
    });
    
  } catch (error) {
    console.error("Error verifying code:", error);
    res.status(401).json({ error: error.message || 'Invalid code' });
  }
};

export const refresh = (req, res) => {
  res.json({ message: 'Token refresh not yet implemented' });
};

export const logout = (req, res) => {
  res.json({ message: 'Logged out' });
};

export const setPassword = async (req, res) => {
  const { password } = req.body;
  const userId = req.user.userId;
  
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    await User.findByIdAndUpdate(userId, { passwordHash: hash });
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const loginPassword = async (req, res) => {
  let { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ error: 'Phone and password required' });
  }

  if (!phone.startsWith('+')) phone = '+' + phone;

  try {
    const user = await User.findOne({ phone });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials or password not set' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Now check if Telegram session is still valid
    let sessionValid = false;
    let client = null;

    if (user.sessionData && user.apiId && user.apiHash) {
      try {
        client = new TelegramClient(new StringSession(user.sessionData), user.apiId, user.apiHash, {
          connectionRetries: 1,
          requestRetries: 1,
        });
        await client.connect();
        const isAuth = await client.isUserAuthorized();
        if (isAuth) {
          sessionValid = true;
        }
      } catch (e) {
        console.error("Telegram session check failed:", e.message);
      }
    }

    if (sessionValid) {
      const token = generateToken(user._id.toString(), user.telegramId);
      console.log(`✅ User ${phone} logged in with password`);
      return res.json({
        token,
        user: { _id: user._id, phone: user.phone, firstName: user.firstName },
      });
    } else {
      // Session invalid, we need to generate OTP
      console.log(`⚠️ User ${phone} session expired. Requesting OTP.`);
      
      if (!user.apiId || !user.apiHash) {
         return res.status(400).json({ error: 'API credentials missing in database. Please login via Telegram OTP mode.' });
      }

      if (!client) {
        client = new TelegramClient(new StringSession(""), user.apiId, user.apiHash, {
          connectionRetries: 1,
        });
        await client.connect();
      }

      const result = await client.sendCode({ apiId: user.apiId, apiHash: user.apiHash }, phone);
      pendingClients.set(phone, {
        client,
        apiId: user.apiId,
        apiHash: user.apiHash,
        phoneCodeHash: result.phoneCodeHash
      });

      return res.status(202).json({ 
        message: 'Telegram connection expired. Please enter the OTP sent to your Telegram app.', 
        requireOtp: true 
      });
    }

  } catch (error) {
    console.error("Login password error:", error);
    res.status(500).json({ error: error.message });
  }
};

import crypto from 'crypto';

export const generateApiKey = async (req, res) => {
  const userId = req.user.userId;
  try {
    const newApiKey = 'td_live_' + crypto.randomBytes(32).toString('hex');
    await User.findByIdAndUpdate(userId, { developerApiKey: newApiKey });
    res.json({ apiKey: newApiKey });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
