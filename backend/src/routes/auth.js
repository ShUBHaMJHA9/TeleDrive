import express from 'express';
import { requestCode, verifyCode, refresh, logout, setPassword, loginPassword, generateApiKey } from '../handlers/auth.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

router.post('/telegram/request_code', requestCode);
router.post('/telegram/verify_code', verifyCode);
router.post('/login', loginPassword);
router.post('/password', authenticateJWT, setPassword);
router.post('/api-key', authenticateJWT, generateApiKey);
router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;

