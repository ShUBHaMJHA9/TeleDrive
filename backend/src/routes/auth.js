import express from 'express';
import { requestCode, verifyCode, refresh, logout } from '../handlers/auth.js';

const router = express.Router();

router.post('/telegram/request_code', requestCode);
router.post('/telegram/verify_code', verifyCode);
router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;

