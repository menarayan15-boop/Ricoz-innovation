import { Router } from 'express';
import {
  register,
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();

// Public Authentication Endpoints (Rate Limited)
router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', authRateLimiter, resetPassword);

// Session Endpoints
router.post('/logout', logout);
router.get('/me', authenticateUser, getMe);

export default router;

