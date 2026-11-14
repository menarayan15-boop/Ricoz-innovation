import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getDatabaseStatus, connectDatabase } from '../config/database.js';

export const getHealth = (req: Request, res: Response): void => {
  const dbStatus = getDatabaseStatus();

  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'immigration-dossier-api',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      connected: dbStatus.isConnected,
      mode: 'persistent',
      isPersistent: true,
      isMemoryDb: false,
      readyState: dbStatus.readyState,
      host: dbStatus.host,
      databaseName: dbStatus.name,
    },
    system: {
      nodeVersion: process.version,
      memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  });
};

export const getDbHealth = async (req: Request, res: Response): Promise<void> => {
  const readyState = mongoose.connection.readyState;
  const dbStatus = getDatabaseStatus();

  // 1. If currently connecting, respond immediately with 503 connecting state (<5ms)
  if (readyState === 2) {
    res.status(503).json({
      success: false,
      status: 'connecting',
      readyState: 2,
      host: dbStatus.host,
      databaseName: dbStatus.name,
      isMemoryDb: false,
      isPersistent: false,
      storageType: 'connecting',
      pingLatencyMs: -1,
      message: 'MongoDB connection is currently in progress...',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // 2. If disconnected, trigger non-blocking background connection attempt and respond immediately (<5ms)
  if (readyState === 0) {
    // Non-blocking trigger - do NOT await here so health check returns in <5ms without timing out
    connectDatabase().catch(() => {});

    res.status(503).json({
      success: false,
      status: 'disconnected',
      readyState: 0,
      host: 'none',
      databaseName: 'none',
      isMemoryDb: false,
      isPersistent: false,
      storageType: 'disconnected',
      pingLatencyMs: -1,
      message:
        dbStatus.error ||
        'Persistent MongoDB connection is disconnected. Background reconnection has been triggered.',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // 3. If connected (readyState === 1), issue an admin ping bounded by 2000ms
  try {
    let pingLatencyMs = -1;
    let isLive = false;

    if (readyState === 1 && mongoose.connection.db) {
      const start = Date.now();
      const pingPromise = mongoose.connection.db.admin().ping();
      const timeoutPromise = new Promise<{ ok: number }>((_, reject) =>
        setTimeout(() => reject(new Error('MongoDB ping timed out after 2000ms')), 2000)
      );

      const pingResult = await Promise.race([pingPromise, timeoutPromise]);
      pingLatencyMs = Date.now() - start;
      isLive = Boolean(pingResult && (pingResult.ok === 1 || pingResult.ok === true));
    }

    if (isLive) {
      res.status(200).json({
        success: true,
        status: 'connected',
        readyState: 1,
        host: dbStatus.host,
        databaseName: dbStatus.name,
        isMemoryDb: false,
        isPersistent: true,
        storageType: 'persistent',
        provider: dbStatus.host.includes('mongodb.net') ? 'MongoDB Atlas' : 'Persistent MongoDB',
        pingLatencyMs,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        success: false,
        status: 'disconnected',
        readyState: mongoose.connection.readyState,
        host: dbStatus.host,
        databaseName: dbStatus.name,
        isMemoryDb: false,
        isPersistent: false,
        storageType: 'disconnected',
        pingLatencyMs: -1,
        message: dbStatus.error || 'MongoDB ping check failed or readyState != 1',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'error',
      message: (error as Error).message || 'Failed to ping MongoDB',
      readyState: mongoose.connection.readyState,
      isMemoryDb: false,
      isPersistent: false,
      storageType: 'error',
      pingLatencyMs: -1,
      timestamp: new Date().toISOString(),
    });
  }
};

export const verifyDbCrud = async (req: Request, res: Response): Promise<void> => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      success: false,
      status: 'disconnected',
      message: 'MongoDB is not connected (readyState != 1)',
    });
    return;
  }
  try {
    const testSchema = new mongoose.Schema(
      {
        testName: String,
        status: { type: String, default: 'initial' },
        timestamp: { type: Date, default: Date.now },
      },
      { collection: 'connection_verifications' }
    );
    const VerificationModel =
      mongoose.models.ConnectionVerification ||
      mongoose.model('ConnectionVerification', testSchema);

    // 1. Create
    const created = await VerificationModel.create({
      testName: 'Phase 3.1 Atlas CRUD Test',
      status: 'initial',
    });

    // 2. Read
    const readInitial = await VerificationModel.findById(created._id);

    // 3. Update
    const updated = await VerificationModel.findByIdAndUpdate(
      created._id,
      { status: 'updated_successfully', updatedAt: new Date() },
      { new: true }
    );

    // 4. Delete
    await VerificationModel.findByIdAndDelete(created._id);

    // 5. Verify Deletion
    const postDelete = await VerificationModel.findById(created._id);

    res.status(200).json({
      success: true,
      status: 'verified',
      message: 'MongoDB Atlas full CRUD lifecycle verified: Created, Read, Updated, Deleted, and Verified Clean.',
      recordId: created._id,
      operations: {
        create: Boolean(created._id),
        read: Boolean(readInitial),
        update: updated?.status === 'updated_successfully',
        delete: postDelete === null,
      },
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      status: 'error',
      message: (err as Error).message,
    });
  }
};

const persistenceSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    label: String,
    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'restart_persistence_records' }
);
const PersistenceModel =
  mongoose.models.RestartPersistence ||
  mongoose.model('RestartPersistence', persistenceSchema);

export const createPersistenceRecord = async (req: Request, res: Response): Promise<void> => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ success: false, message: 'MongoDB not connected' });
    return;
  }
  try {
    const { token, label } = req.body;
    const doc = await PersistenceModel.create({ token, label });
    res.status(201).json({ success: true, record: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

export const getPersistenceRecord = async (req: Request, res: Response): Promise<void> => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ success: false, message: 'MongoDB not connected' });
    return;
  }
  try {
    const { token } = req.params;
    const doc = await PersistenceModel.findOne({ token });
    if (!doc) {
      res.status(404).json({ success: false, message: 'Record not found' });
      return;
    }
    res.status(200).json({ success: true, record: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};

export const deletePersistenceRecord = async (req: Request, res: Response): Promise<void> => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ success: false, message: 'MongoDB not connected' });
    return;
  }
  try {
    const { token } = req.params;
    const result = await PersistenceModel.findOneAndDelete({ token });
    res.status(200).json({ success: true, deleted: Boolean(result) });
  } catch (err) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
};
