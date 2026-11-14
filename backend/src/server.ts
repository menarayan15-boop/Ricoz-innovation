import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

import { createApp } from './app.js';
import { config } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';

const startServer = async () => {
  try {
    // 1. Initialize Express Application
    const app = createApp();

    // 2. Start Listening explicitly on 0.0.0.0 for universal IPv4/IPv6 loopback reachability
    const server = app.listen(config.port, '0.0.0.0', () => {
      logger.info(`=======================================================`);
      logger.info(`  Immigration & Work Visa Dossier Builder API Service`);
      logger.info(`  Environment : ${config.nodeEnv}`);
      logger.info(`  Listening   : http://0.0.0.0:${config.port} (and http://localhost:${config.port})`);
      logger.info(`  Health Check: http://localhost:${config.port}/api/v1/health`);
      logger.info(`  DB Health   : http://localhost:${config.port}/api/v1/health/db`);
      logger.info(`=======================================================`);
    });

    // 3. Connect to Database (attempt initial connect, keep API running if Atlas is warming up/retrying)
    try {
      await connectDatabase();
    } catch (dbErr) {
      logger.error('Initial MongoDB connection attempt error:', (dbErr as Error).message);
      logger.warn('API server is active on port 5001. Endpoint /api/v1/health/db will report live database status.');
    }

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Gracefully shutting down server...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        await disconnectDatabase();
        logger.info('Application exited cleanly.');
        process.exit(0);
      });

      // Force close if graceful shutdown takes longer than 10s
      setTimeout(() => {
        logger.error('Forcefully terminating process after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection:', { reason, promise });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception thrown:', error);
      process.exit(1);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

