import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Cleanup stale records periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000);

export const createRateLimiter = (options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // In test environment, bypass rate limit so automated suites don't throttle
    if (process.env.NODE_ENV === 'test') {
      next();
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
      rateLimitMap.set(ip, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      next();
      return;
    }

    if (record.count >= options.maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.status(429).json({
        success: false,
        message:
          options.message ||
          `Too many authentication attempts. Please try again after ${retryAfterSeconds} seconds.`,
      });
      return;
    }

    record.count += 1;
    next();
  };
};

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 30, // 30 requests per window
  message: 'Too many login or registration attempts. Please wait 15 minutes before trying again.',
});

