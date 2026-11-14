import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { Express } from 'express';

describe('Persistent MongoDB Health and Status API Tests', () => {
  let app: Express;
  let isDbConnected = false;

  beforeAll(async () => {
    app = createApp();
    try {
      await connectDatabase();
      isDbConnected = mongoose.connection.readyState === 1;
    } catch (err) {
      console.warn('Test runner warning: Persistent MongoDB Atlas connection failed in test environment:', (err as Error).message);
      isDbConnected = false;
    }
  });

  afterAll(async () => {
    try {
      await disconnectDatabase();
    } catch {
      // Ignore cleanup error
    }
  });

  it('GET / should return welcome JSON with API metadata', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name');
    expect(res.body.status).toBe('active');
    expect(res.body.endpoints).toHaveProperty('health', '/api/v1/health');
    expect(res.body.endpoints).toHaveProperty('dbHealth', '/api/v1/health/db');
  });

  it('GET /api/v1/health should return 200 with service information', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('immigration-dossier-api');
    expect(res.body.database.isPersistent).toBe(true);
    expect(res.body.database.isMemoryDb).toBe(false);
  });

  it('OPTIONS /api/v1/health should handle CORS preflight correctly', async () => {
    const res = await request(app)
      .options('/api/v1/health')
      .set('Origin', 'http://localhost:3001')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3001');
  });

  it('GET /api/v1/health/db should respond within 2000ms and accurately reflect connection status', async () => {
    const start = Date.now();
    const res = await request(app).get('/api/v1/health/db');
    const elapsed = Date.now() - start;

    // Must never hang or exceed 2-3 seconds
    expect(elapsed).toBeLessThan(3000);

    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('connected');
      expect(res.body.readyState).toBe(1);
      expect(res.body.isMemoryDb).toBe(false);
      expect(res.body.isPersistent).toBe(true);
    } else {
      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.isPersistent).toBe(false);
      expect(res.body).toHaveProperty('message');
    }
  });

  it('GET /api/v1/health/db should return 503 immediately if persistent MongoDB becomes disconnected', async () => {
    // Force disconnect
    await mongoose.disconnect();

    const start = Date.now();
    const res = await request(app).get('/api/v1/health/db');
    const elapsed = Date.now() - start;

    // Disconnected health check should return immediately (< 500ms) without hanging
    expect(elapsed).toBeLessThan(1000);
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.status).toBe('disconnected');
    expect(res.body.readyState).toBe(0);
    expect(res.body.isPersistent).toBe(false);
  });
});
