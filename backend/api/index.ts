import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

// @ts-ignore
import { createApp } from '../dist/app.js';
// @ts-ignore
import { connectDatabase } from '../dist/config/database.js';
// @ts-ignore
import { logger } from '../dist/utils/logger.js';

const app = createApp();
let isConnected = false;

// Serverless Handler for Vercel
export default async function handler(req: any, res: any) {
  // If Vercel serverless rewrite changed req.url to /api/index, restore the true requested path
  const matchedPath = req.headers['x-matched-path'] || req.headers['x-forwarded-path'];
  if (matchedPath && req.url && req.url.startsWith('/api/index')) {
    req.url = matchedPath;
  }

  // Connect to persistent MongoDB if not yet connected
  if (!isConnected) {
    try {
      await connectDatabase();
      isConnected = true;
    } catch (err: any) {
      logger.error('[Serverless] MongoDB connection error:', err?.message || err);
    }
  }

  // Pass request to Express application
  return app(req, res);
}
