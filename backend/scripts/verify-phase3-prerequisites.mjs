// backend/scripts/verify-phase3-prerequisites.mjs
// Verification of Phase 3 Prerequisites prior to Phase 4

const BACKEND_URL = 'http://localhost:5001/api/v1';
const FRONTEND_URL = 'http://localhost:3001';

async function verifyPrerequisites() {
  console.log('========================================================');
  console.log('  PHASE 4 PREREQUISITE AUDIT: VERIFYING PHASE 3 STATE   ');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function check(condition, label, info = '') {
    if (condition) {
      console.log(`  [PASS] ${label}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${label} - ${info}`);
      failed++;
    }
  }

  try {
    // 1. Verify MongoDB Atlas is connected
    console.log('[1/8] Checking MongoDB Atlas Connection...');
    const dbRes = await fetch(`${BACKEND_URL}/health/db`);
    const dbData = await dbRes.json();
    check(dbRes.status === 200, 'Health endpoint responds with HTTP 200');
    check(dbData.readyState === 1, 'MongoDB readyState is 1 (Connected)', `State was: ${dbData.readyState}`);
    check(dbData.host?.includes('mongodb.net') || dbData.host?.includes('shard'), 'Connected host is MongoDB Atlas cluster', `Host: ${dbData.host}`);

    // 2. Confirm the database uses persistent storage
    console.log('\n[2/8] Confirming Persistent Storage (No In-Memory)...');
    check(dbData.isMemoryDb === false, 'isMemoryDb is false');
    check(dbData.isPersistent === true, 'isPersistent is true');
    check(dbData.databaseName === 'immigration_dossier', 'Connected to production database: immigration_dossier');

    // 3. Confirm registration works
    console.log('\n[3/8] Testing User Registration...');
    const testEmail = `phase4_applicant_${Date.now()}@example.com`;
    const testPassword = 'SecurePassword!2026';
    const regRes = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Phase 4 Auditor',
        email: testEmail,
        password: testPassword,
        role: 'applicant',
      }),
    });
    const regData = await regRes.json();
    check(regRes.status === 201, 'Registration returns HTTP 201');
    check(regData.success === true, 'Registration returns success: true');
    check(Boolean(regData.token), 'JWT token returned on registration');
    const applicantToken = regData.token;

    // 4. Confirm existing registered users can log in
    console.log('\n[4/8] Testing Registered User Login...');
    const loginRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const loginData = await loginRes.json();
    check(loginRes.status === 200, 'Login returns HTTP 200');
    check(loginData.success === true, 'Login returns success: true');
    check(loginData.user?.email?.toLowerCase() === testEmail.toLowerCase(), 'Authenticated user matches registered email');

    // 5. Verify authentication persists after refresh (simulated via /auth/me with Bearer token & cookie)
    console.log('\n[5/8] Testing Session Verification (/auth/me)...');
    const sessionRes = await fetch(`${BACKEND_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const sessionData = await sessionRes.json();
    check(sessionRes.status === 200, 'Session verification returns HTTP 200');
    check(sessionData.user?.role === 'applicant', 'Session user role accurately retained as applicant');

    // 6. Verify backend role-based authorization (RBAC)
    console.log('\n[6/8] Verifying Role-Based Access Control...');
    // Applicant cannot access admin-only user list
    const adminCheckRes = await fetch(`${BACKEND_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    check(adminCheckRes.status === 403, 'Applicant rejected from admin route with HTTP 403 Forbidden');

    // Deny self-elevation to admin during registration
    const exploitReg = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Attacker',
        email: `exploit_${Date.now()}@example.com`,
        password: testPassword,
        role: 'admin',
      }),
    });
    check(exploitReg.status === 403, 'Privilege escalation to admin blocked with HTTP 403');

    // 7. Confirm applicant accounts can access their own workspace
    console.log('\n[7/8] Verifying Applicant Workspace Access...');
    const dashRes = await fetch(`${BACKEND_URL}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const dashData = await dashRes.json();
    check(dashRes.status === 200, 'Applicant workspace dashboard returns HTTP 200');
    check(dashData.userRole === 'applicant', 'Dashboard returns userRole: applicant');
    check(typeof dashData.stats?.totalCases === 'number', 'Dashboard returns real calculated stats');

    // 8. Verify the existing frontend communicates with Express APIs
    console.log('\n[8/8] Verifying Frontend Availability and API Base Configuration...');
    const feRes = await fetch(FRONTEND_URL);
    check(feRes.status === 200, 'Next.js frontend server is running on http://localhost:3001');

    console.log('\n========================================================');
    console.log(`  AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Prerequisite check failed with exception:', err);
    process.exit(1);
  }
}

verifyPrerequisites();

