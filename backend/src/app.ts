import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { requestLogger } from './middleware/requestLogger.middleware.js';
import { connectDatabase } from './config/database.js';

let isConnected = false;

export const createApp = (): Express => {
  const app = express();

  // Ensure persistent MongoDB connection in serverless or container environments
  app.use(async (req, res, next) => {
    if (!isConnected && config.nodeEnv !== 'test') {
      try {
        await connectDatabase();
        isConnected = true;
      } catch (err) {
        // Non-blocking: database status is reported in detail by /api/v1/health/db
      }
    }
    next();
  });

  // Security Middleware
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS Configuration - Permissive for all local development loopback ports and configured frontend
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow server-to-server, curl, mobile, or direct requests without Origin header
      if (!origin) return callback(null, true);
      // Allow any loopback / local dev URL (localhost, 127.0.0.1, [::1]) on any port
      const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
      if (isLocalhost || origin === config.frontendUrl) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 200,
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // Body Parsing Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Logging
  if (config.nodeEnv !== 'test') {
    app.use(requestLogger);
    app.use(morgan('dev'));
  }

  // Base API v1 Routing
  app.use('/api/v1', routes);

  // Root Welcome route & diagnostic
  app.get(['/', '/api', '/api/index'], (req, res) => {
    res.status(200).json({
      name: 'Immigration & Work Visa Dossier Builder API',
      version: '1.0.0',
      status: 'active',
      endpoints: {
        health: '/api/v1/health',
        dbHealth: '/api/v1/health/db',
        auth: '/api/v1/auth',
      },
    });
  });

  // Root Routing (fallback for serverless gateways that strip /api/v1 prefix)
  app.use('/', routes);

  // 404 handler
  app.use(notFoundHandler);

  // Global Error Handler
  app.use(errorHandler);

  return app;
};

const defaultApp = createApp();
export default defaultApp;

