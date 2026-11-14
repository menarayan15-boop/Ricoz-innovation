import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

import mongoose from 'mongoose';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

export interface DatabaseStatus {
  isConnected: boolean;
  readyState: number;
  host: string;
  name: string;
  isMemoryDb: boolean;
  isPersistent: boolean;
  error?: string | null;
}

let lastDbError: string | null = null;
let connectionPromise: Promise<typeof mongoose> | null = null;

export const getLastDbError = (): string | null => lastDbError;

// Attach Mongoose lifecycle event listeners
mongoose.connection.on('connected', () => {
  lastDbError = null;
  logger.info(`Mongoose connected to persistent MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);
});

mongoose.connection.on('error', (err) => {
  const errMsg = err?.message || String(err);
  if (errMsg.includes('alert number 80') || errMsg.includes('whitelisted') || errMsg.includes('SSL routines')) {
    lastDbError = 'MongoDB Atlas connection blocked by IP Access List. Please add your current IP address (or 0.0.0.0/0 to allow dynamic IPs) in MongoDB Atlas -> Security -> Network Access.';
  } else {
    lastDbError = errMsg;
  }
  logger.error('Mongoose persistent connection error:', lastDbError);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose persistent connection disconnected.');
});

mongoose.connection.on('reconnected', () => {
  lastDbError = null;
  logger.info('Mongoose persistent connection reconnected.');
});

/**
 * Connect to real persistent MongoDB instance (Local or Atlas)
 * Fails fast if MONGODB_URI is missing, invalid, or unreachable.
 * Uses singleton connection promise and connection pooling.
 * NO in-memory fallback allowed.
 */
export const connectDatabase = async (): Promise<typeof mongoose> => {
  // 1. If already connected, return immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // 2. If already connecting, return existing promise to prevent duplicate concurrent connections
  if (connectionPromise) {
    return connectionPromise;
  }

  let uri = config.mongodbUri?.trim();
  if (uri && uri.startsWith('MONGODB_URI=')) {
    uri = uri.replace(/^MONGODB_URI=/, '').trim();
  }

  if (!uri || typeof uri !== 'string' || uri.trim() === '') {
    const errorMsg = 'FATAL: MONGODB_URI is not defined in environment variables. A real persistent MongoDB connection is required.';
    lastDbError = errorMsg;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Validate standard MongoDB URI protocol
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    const errorMsg = 'FATAL: MONGODB_URI must begin with either "mongodb://" or "mongodb+srv://".';
    lastDbError = errorMsg;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Sanitize URI for log output to ensure no credentials are ever leaked
  const sanitizedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  logger.info(`Connecting to persistent MongoDB at: ${sanitizedUri}`);

  const options: mongoose.ConnectOptions = {
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 20000,
  };

  connectionPromise = mongoose
    .connect(uri, options)
    .then((m) => {
      lastDbError = null;
      connectionPromise = null;
      logger.info(
        `Persistent MongoDB connected successfully to host: ${mongoose.connection.host}, database: ${mongoose.connection.name}`
      );
      return m;
    })
    .catch((err) => {
      connectionPromise = null;
      const rawMsg = (err as Error).message || String(err);
      if (
        rawMsg.includes('alert number 80') ||
        rawMsg.includes('whitelisted') ||
        rawMsg.includes('SSL routines') ||
        rawMsg.includes('Could not connect to any servers')
      ) {
        lastDbError =
          'MongoDB Atlas access blocked: Client IP is not on the Atlas Network Access IP Whitelist. Add your current IP (or 0.0.0.0/0) in MongoDB Atlas -> Security -> Network Access.';
      } else {
        lastDbError = rawMsg;
      }
      logger.error('Failed to establish persistent MongoDB connection:', lastDbError);
      throw err;
    });

  return connectionPromise;
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    connectionPromise = null;
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      logger.info('Persistent MongoDB disconnected cleanly.');
    }
  } catch (err) {
    logger.error('Error during database disconnection:', err);
    throw err;
  }
};

export const getDatabaseStatus = (): DatabaseStatus => {
  return {
    isConnected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host || 'none',
    name: mongoose.connection.name || 'none',
    isMemoryDb: false, // In-memory database has been completely removed
    isPersistent: true,
    error: lastDbError,
  };
};
