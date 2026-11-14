import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

import { createApp } from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { logger } from '../src/utils/logger.js';

const app = createApp();

let isConnected = false;

// Serverless Handler for Vercel
export default async function handler(req: any, res: any) {
  // Connect to persistent MongoDB if not yet connected
  if (!isConnected) {
    try {
      await connectDatabase();
      isConnected = true;
    } catch (err: any) {
      logger.error('[Serverless] MongoDB connection error:', err?.message || err);
      // Do not throw here so that /api/v1/health can still return detailed error diagnostics
    }
  }

  // Pass request to Express application
  return app(req, res);
}
