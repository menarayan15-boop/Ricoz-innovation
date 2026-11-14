import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/models/user.model.js';
import { Application } from '../src/models/application.model.js';
import { generateToken } from '../src/utils/token.util.js';
import { Express } from 'express';

describe('Phase 3.3: Role-Based Access Control (RBAC) & Ownership Verification', () => {
  let app: Express;

  // Test accounts
  let applicant1User: any;
  let applicant1Token: string;

  let applicant2User: any;
  let applicant2Token: string;

  let attorneyUser: any;
  let attorneyToken: string;

  let employerUser: any;
  let employerToken: string;

  let adminUser: any;
  let adminToken: string;

  let testApplicationId: string;

  beforeAll(async () => {
    app = createApp();
    try {
      await connectDatabase();
    } catch (err) {
      console.warn('DB connect error in test suite:', (err as Error).message);
    }

    if (mongoose.connection.readyState === 1) {
      const ts = Date.now();

      // Create Applicant 1
      applicant1User = await User.create({
        name: 'Applicant One',
        email: `app1.${ts}@example.com`,
        password: 'Password123!',
        role: 'applicant',
      });
      applicant1Token = generateToken({
        id: applicant1User._id.toString(),
        email: applicant1User.email,
        role: applicant1User.role,
      });

      // Create Applicant 2
      applicant2User = await User.create({
        name: 'Applicant Two',
        email: `app2.${ts}@example.com`,
        password: 'Password123!',
        role: 'applicant',
      });
      applicant2Token = generateToken({
        id: applicant2User._id.toString(),
        email: applicant2User.email,
        role: applicant2User.role,
      });

      // Create Attorney
      attorneyUser = await User.create({
        name: 'Sarah Jenkins, Esq.',
        email: `attorney.${ts}@example.com`,
        password: 'Password123!',
        role: 'attorney',
      });
      attorneyToken = generateToken({
        id: attorneyUser._id.toString(),
        email: attorneyUser.email,
        role: attorneyUser.role,
      });

      // Create Employer
      employerUser = await User.create({
        name: 'Nexus Corp HR',
        email: `employer.${ts}@example.com`,
        password: 'Password123!',
        role: 'employer',
      });
      employerToken = generateToken({
        id: employerUser._id.toString(),
        email: employerUser.email,
        role: employerUser.role,
      });

      // Create Admin
      adminUser = await User.create({
        name: 'System Administrator',
        email: `admin.${ts}@example.com`,
        password: 'Password123!',
        role: 'admin',
      });
      adminToken = generateToken({
        id: adminUser._id.toString(),
        email: adminUser.email,
        role: adminUser.role,
      });
    }
  });

  afterAll(async () => {
    try {
      if (mongoose.connection.readyState === 1) {
        if (applicant1User) await User.findByIdAndDelete(applicant1User._id);
        if (applicant2User) await User.findByIdAndDelete(applicant2User._id);
        if (attorneyUser) await User.findByIdAndDelete(attorneyUser._id);
        if (employerUser) await User.findByIdAndDelete(employerUser._id);
        if (adminUser) await User.findByIdAndDelete(adminUser._id);
        if (testApplicationId) await Application.findByIdAndDelete(testApplicationId);
      }
      await disconnectDatabase();
    } catch {
      // Ignore cleanup error
    }
  });

  it('1. Strict Privilege Escalation Guard: Denies admin self-registration with 403 Forbidden', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      name: 'Hacker Admin',
      email: `hacker.admin.${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'admin',
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Administrator accounts cannot be created');
  });

  it('2. Applicant creates Application A in MongoDB Atlas', async () => {
    if (mongoose.connection.readyState !== 1) return;

    const res = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${applicant1Token}`)
      .send({
        title: 'H-1B Petition for Senior ML Research Engineer',
        visaCategory: 'H-1B',
        formData: { wage: 175000, jobTitle: 'Senior ML Engineer' },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.application._id).toBeDefined();
    expect(res.body.application.applicantId).toBe(applicant1User._id.toString());
    testApplicationId = res.body.application._id;
  });

  it('3. Cross-User Isolation: Applicant B is rejected with 403 Forbidden when trying to access Applicant A\'s application', async () => {
    if (!testApplicationId) return;

    const res = await request(app)
      .get(`/api/v1/applications/${testApplicationId}`)
      .set('Authorization', `Bearer ${applicant2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('another applicant');
  });

  it('4. Unassigned Attorney Restriction: Attorney is rejected with 403 when trying to access an unassigned case', async () => {
    if (!testApplicationId) return;

    const res = await request(app)
      .get(`/api/v1/applications/${testApplicationId}`)
      .set('Authorization', `Bearer ${attorneyToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('not the assigned attorney');
  });

  it('5. Employer Access Restriction: Unauthorized employer is rejected with 403 when trying to access an unsponsored case', async () => {
    if (!testApplicationId) return;

    const res = await request(app)
      .get(`/api/v1/applications/${testApplicationId}`)
      .set('Authorization', `Bearer ${employerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('employer-sponsored');
  });

  it('6. Unauthorized Role Action: Applicant cannot submit attorney review decisions', async () => {
    if (!testApplicationId) return;

    const res = await request(app)
      .post(`/api/v1/applications/${testApplicationId}/review`)
      .set('Authorization', `Bearer ${applicant1Token}`)
      .send({
        decision: 'approved',
        comments: 'Self-approving my own application',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('not authorized');
  });

  it('7. Case Assignment: Case owner assigns attorney to Application A', async () => {
    if (!testApplicationId) return;

    const res = await request(app)
      .post(`/api/v1/applications/${testApplicationId}/assign-attorney`)
      .set('Authorization', `Bearer ${applicant1Token}`)
      .send({
        attorneyId: attorneyUser._id.toString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.application.assignedAttorneyId).toBe(attorneyUser._id.toString());
    expect(res.body.application.status).toBe('under_attorney_review');
  });

  it('8. Authorized Attorney Access: Assigned attorney can now access Application A and submit review', async () => {
    if (!testApplicationId) return;

    // View application
    const getRes = await request(app)
      .get(`/api/v1/applications/${testApplicationId}`)
      .set('Authorization', `Bearer ${attorneyToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);

    // Submit review decision
    const reviewRes = await request(app)
      .post(`/api/v1/applications/${testApplicationId}/review`)
      .set('Authorization', `Bearer ${attorneyToken}`)
      .send({
        decision: 'changes_requested',
        comments: 'Please attach official university transcripts and degree evaluation.',
      });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.success).toBe(true);
    expect(reviewRes.body.application.status).toBe('changes_requested');
    expect(reviewRes.body.application.reviewDecision.status).toBe('changes_requested');
  });

  it('9. Admin Route Protection: Non-admin users are rejected with 403 on /api/v1/admin/users', async () => {
    if (!applicant1Token) return;

    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${applicant1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('10. Admin Authority: Admin user can access /api/v1/admin/users and view system statistics', async () => {
    if (!adminToken) return;

    const usersRes = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(usersRes.status).toBe(200);
    expect(usersRes.body.success).toBe(true);
    expect(usersRes.body.users).toBeDefined();

    const statsRes = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.success).toBe(true);
    expect(statsRes.body.stats.users).toBeDefined();
    expect(statsRes.body.stats.applications).toBeDefined();
  });
});
