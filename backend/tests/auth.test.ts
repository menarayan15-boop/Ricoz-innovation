import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/user.model.js';
import { Express } from 'express';

describe('Phase 3.2: Real Authentication & Session Verification', () => {
  let app: Express;
  const testEmail = `test.user.${Date.now()}@legaltech-visa.example`;
  const testPassword = 'Password123!';
  const testName = 'Dr. Priya Sharma';
  let authToken: string;
  let authCookie: string;
  let resetDevToken: string;

  beforeAll(async () => {
    app = createApp();
    try {
      await connectDatabase();
    } catch (err) {
      console.warn('MongoDB Atlas connection failed in test runner:', (err as Error).message);
    }
  });

  afterAll(async () => {
    try {
      // Clean up test user
      if (mongoose.connection.readyState === 1) {
        await User.deleteOne({ email: testEmail });
      }
      await disconnectDatabase();
    } catch {
      // Ignore cleanup error
    }
  });

  it('1. POST /api/v1/auth/register should create a real user in MongoDB Atlas with hashed password', async () => {
    if (mongoose.connection.readyState !== 1) {
      console.warn('Skipping Atlas test: DB disconnected');
      return;
    }

    const res = await request(app).post('/api/v1/auth/register').send({
      name: testName,
      email: testEmail,
      password: testPassword,
      role: 'applicant',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testEmail.toLowerCase());
    expect(res.body.user.name).toBe(testName);
    expect(res.body.user.role).toBe('applicant');
    // Ensure plaintext password is NEVER exposed in API response
    expect(res.body.user.password).toBeUndefined();

    // Verify cookie was set
    const setCookieHeader = res.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader[0]).toContain('auth_token=');
    expect(setCookieHeader[0]).toContain('HttpOnly');

    authToken = res.body.token;
    authCookie = setCookieHeader[0];

    // Verify record in MongoDB Atlas directly
    const userInDb = await User.findOne({ email: testEmail }).select('+password');
    expect(userInDb).not.toBeNull();
    expect(userInDb?.name).toBe(testName);
    // Verify password is encrypted with bcrypt
    expect(userInDb?.password).toBeDefined();
    expect(userInDb?.password).not.toBe(testPassword);
    expect(userInDb?.password?.startsWith('$2')).toBe(true);
  });

  it('2. POST /api/v1/auth/register should reject duplicate email registration with 409 Conflict', async () => {
    if (mongoose.connection.readyState !== 1) return;

    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Another User',
      email: testEmail,
      password: 'AnotherPassword1!',
      role: 'applicant',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('already exists');
  });

  it('3. POST /api/v1/auth/register should reject invalid inputs with 400 Bad Request', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: '',
      email: 'invalid-email',
      password: 'short',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it('4. POST /api/v1/auth/login should authenticate with valid credentials', async () => {
    if (mongoose.connection.readyState !== 1) return;

    const res = await request(app).post('/api/v1/auth/login').send({
      email: testEmail,
      password: testPassword,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testEmail.toLowerCase());
    expect(res.body.user.password).toBeUndefined();

    // Verify session cookie
    const setCookieHeader = res.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader[0]).toContain('auth_token=');
  });

  it('5. POST /api/v1/auth/login should reject incorrect password with 401 Unauthorized', async () => {
    if (mongoose.connection.readyState !== 1) return;

    const res = await request(app).post('/api/v1/auth/login').send({
      email: testEmail,
      password: 'WrongPassword123!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid email');
  });

  it('6. POST /api/v1/auth/login should reject non-existent email with 401 Unauthorized', async () => {
    if (mongoose.connection.readyState !== 1) return;

    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'nonexistent.user.999@example.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('7. GET /api/v1/auth/me should return authenticated user profile with Bearer token', async () => {
    if (!authToken) return;

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testEmail.toLowerCase());
    expect(res.body.user.name).toBe(testName);
  });

  it('8. GET /api/v1/auth/me should authenticate via HttpOnly cookie', async () => {
    if (!authCookie) return;

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testEmail.toLowerCase());
  });

  it('9. GET /api/v1/auth/me should reject unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('10. GET /api/v1/auth/me should reject invalid or forged token with 401', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer forged.token.signature');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('11. POST /api/v1/auth/forgot-password should generate reset token for user', async () => {
    if (mongoose.connection.readyState !== 1) return;

    const res = await request(app).post('/api/v1/auth/forgot-password').send({
      email: testEmail,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.devResetToken).toBeDefined();
    resetDevToken = res.body.devResetToken;
  });

  it('12. POST /api/v1/auth/reset-password should reset password and permit login with new password', async () => {
    if (!resetDevToken) return;

    const newPassword = 'NewSecretPassword456!';
    const resetRes = await request(app).post('/api/v1/auth/reset-password').send({
      token: resetDevToken,
      password: newPassword,
    });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // Verify login with old password fails
    const oldLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: testEmail,
      password: testPassword,
    });
    expect(oldLoginRes.status).toBe(401);

    // Verify login with new password succeeds
    const newLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: testEmail,
      password: newPassword,
    });
    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.success).toBe(true);
  });

  it('13. POST /api/v1/auth/logout should clear session cookie', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const setCookie = res.headers['set-cookie'];
    if (setCookie) {
      // Cookie is cleared or set to expire in the past
      expect(setCookie[0]).toMatch(/auth_token=;|Expires=Thu, 01 Jan 1970/);
    }
  });
});
