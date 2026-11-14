const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const { createApp } = require('../dist/app.js');
const { connectDatabase } = require('../dist/config/database.js');
const { logger } = require('../dist/utils/logger.js');

const app = createApp();
let isConnected = false;

module.exports = async function handler(req, res) {
  // If Vercel serverless rewrite passed matched path header, restore original requested URL
  const matchedPath = req.headers['x-matched-path'] || req.headers['x-forwarded-path'];
  if (matchedPath && req.url && req.url.startsWith('/api/index')) {
    req.url = matchedPath;
  }

  // Connect to persistent MongoDB if not yet connected
  if (!isConnected) {
    try {
      await connectDatabase();
      isConnected = true;
    } catch (err) {
      logger.error('[Serverless] MongoDB connection error:', err?.message || err);
    }
  }

  return app(req, res);
};
