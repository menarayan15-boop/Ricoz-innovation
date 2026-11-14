import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/token.util.js';
import { User, IUser } from '../models/user.model.js';
import { logger } from '../utils/logger.js';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  tokenPayload?: TokenPayload;
}

const parseCookies = (cookieHeader?: string): Record<string, string> => {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, pair) => {
    const [k, ...v] = pair.trim().split('=');
    if (k && v.length) acc[k] = decodeURIComponent(v.join('='));
    return acc;
  }, {} as Record<string, string>);
};

export const authenticateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // 1. Check Authorization Bearer header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]?.trim();
    }

    // 2. Fallback to HttpOnly cookie
    if (!token && req.headers.cookie) {
      const cookies = parseCookies(req.headers.cookie);
      token = cookies['auth_token'];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. No session token provided.',
      });
      return;
    }

    // 3. Verify JWT
    let payload: TokenPayload;
    try {
      payload = verifyToken(token);
    } catch (jwtErr) {
      res.status(401).json({
        success: false,
        message: 'Authentication session expired or invalid. Please sign in again.',
      });
      return;
    }

    // 4. Load User from MongoDB
    const user = await User.findById(payload.id);
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User account not found. Session is no longer valid.',
      });
      return;
    }

    req.user = user;
    req.tokenPayload = payload;
    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication verification.',
    });
  }
};

