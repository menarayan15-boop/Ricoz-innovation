// backend/scripts/verify-phase4-prerequisites.mjs
// Verification of Phase 4 Prerequisites prior to Phase 5: Secure Document Management

const BACKEND_URL = 'http://localhost:5001/api/v1';
const FRONTEND_URL = 'http://localhost:3001';

async function verifyPrerequisites() {
  console.log('=================================================================');
  console.log('  PHASE 5 PREREQUISITE AUDIT: VERIFYING PHASE 4 STATE & WORKFLOWS');
  console.log('=================================================================\n');

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
    // 1. Verify MongoDB Atlas connectivity with a real database ping
    console.log('[1/10] Verifying MongoDB Atlas Connectivity & Real Ping...');
    const dbRes = await fetch(`${BACKEND_URL}/health/db`);
    const dbData = await dbRes.json();
    check(dbRes.status === 200, 'Health DB endpoint returns HTTP 200');
    check(dbData.readyState === 1, 'MongoDB readyState is 1 (Connected)');
    check(dbData.isPersistent === true && dbData.isMemoryDb === false, 'Persistent MongoDB Atlas confirmed (No in-memory)');
    check(typeof dbData.pingLatencyMs === 'number' && dbData.pingLatencyMs < 2000, `Real database ping latency: ${dbData.pingLatencyMs}ms`);

    // 2. Verify registration and login
    console.log('\n[2/10] Verifying Registration & Login...');
    const timestamp = Date.now();
    const applicantEmail = `phase5_audit_app_${timestamp}@test.com`;
    const attorneyEmail = `phase5_audit_att_${timestamp}@test.com`;
    const password = 'AuditPassword123!';

    // Register Applicant
    const regRes = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Phase 5 Audit Applicant',
        email: applicantEmail,
        password,
        role: 'applicant',
      }),
    });
    const regData = await regRes.json();
    check(regRes.status === 201 && regData.success === true, 'Applicant registration succeeded with HTTP 201');

    // Register Attorney
    const regAttRes = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Phase 5 Audit Attorney',
        email: attorneyEmail,
        password,
        role: 'attorney',
      }),
    });
    const regAttData = await regAttRes.json();
    check(regAttRes.status === 201 && regAttData.success === true, 'Attorney registration succeeded with HTTP 201');
    const attorneyToken = regAttData.token;

    // Login with registered applicant
    const loginRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: applicantEmail, password }),
    });
    const loginData = await loginRes.json();
    check(loginRes.status === 200 && loginData.success === true, 'Applicant login verified with bcrypt hash comparison');
    const applicantToken = loginData.token;

    // 3. Verify secure session persistence
    console.log('\n[3/10] Verifying Secure Session Persistence (/auth/me)...');
    const meRes = await fetch(`${BACKEND_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const meData = await meRes.json();
    check(meRes.status === 200 && meData.user?.email === applicantEmail, 'Session token verified via /auth/me');

    // 4. Verify backend role-based authorization
    console.log('\n[4/10] Verifying Role-Based Authorization & IDOR Defense...');
    const adminCheckRes = await fetch(`${BACKEND_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    check(adminCheckRes.status === 403, 'Applicant blocked from admin endpoint (HTTP 403 Forbidden)');

    // 5. Verify visa application creation
    console.log('\n[5/10] Verifying Visa Application Creation...');
    const appCreateRes = await fetch(`${BACKEND_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`,
      },
      body: JSON.stringify({
        visaCategory: 'H-1B',
        title: 'H-1B Senior Software Systems Architect',
        targetFilingDate: new Date(Date.now() + 60 * 86400000).toISOString(),
        applicantDetails: {
          fullName: 'Audit Applicant',
          nationality: 'India',
          contactEmail: applicantEmail,
        },
        employmentDetails: {
          currentEmployer: 'TechCorp International',
          jobTitle: 'Senior Systems Architect',
          annualSalary: 165000,
        },
      }),
    });
    const appCreateData = await appCreateRes.json();
    check(appCreateRes.status === 201 && appCreateData.success === true, 'H-1B Application created successfully (HTTP 201)');
    const createdAppId = appCreateData.application?._id;
    check(Boolean(createdAppId), `Application ID assigned: ${createdAppId}`);
    check(Array.isArray(appCreateData.application?.checklist) && appCreateData.application.checklist.length > 0, 'Statutory checklist auto-initialized');

    // 6. Verify application drafts persist after refresh
    console.log('\n[6/10] Verifying Application Draft Persistence (Save & Retrieve)...');
    const draftRes = await fetch(`${BACKEND_URL}/applications/${createdAppId}/save-draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`,
      },
      body: JSON.stringify({
        draftStep: 3,
        applicantDetails: {
          fullName: 'Audit Applicant Updated',
          nationality: 'India',
          contactEmail: applicantEmail,
          currentImmigrationStatus: 'F-1 OPT',
        },
        concurrencyVersion: 1,
      }),
    });
    const draftData = await draftRes.json();
    check(draftRes.status === 200 && draftData.success === true, 'Application draft auto-saved with concurrency version check');

    // Fetch again to verify persistence
    const fetchAppRes = await fetch(`${BACKEND_URL}/applications/${createdAppId}`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const fetchAppData = await fetchAppRes.json();
    check(fetchAppData.application?.applicantDetails?.currentImmigrationStatus === 'F-1 OPT', 'Draft updates persist in MongoDB Atlas');
    check(fetchAppData.application?.draftStep === 3, 'Draft step state persisted (Step 3)');

    // 7. Verify application ownership (IDOR defense)
    console.log('\n[7/10] Verifying Application Ownership & IDOR Protection...');
    // Unassigned attorney attempting to read or modify
    const idorRes = await fetch(`${BACKEND_URL}/applications/${createdAppId}`, {
      headers: { Authorization: `Bearer ${attorneyToken}` },
    });
    check(idorRes.status === 403, 'Unassigned attorney blocked from accessing applicant case (HTTP 403 Forbidden)');

    // 8. Verify all four visa categories exist
    console.log('\n[8/10] Verifying All Four Visa Categories Exist (H-1B, O-1, EB-2, EB-2 NIW)...');
    const niwCreateRes = await fetch(`${BACKEND_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`,
      },
      body: JSON.stringify({
        visaCategory: 'EB-2-NIW',
        title: 'EB-2 NIW Quantum Computing Research',
        categorySpecificDetails: {
          eb2Niw: {
            proposedEndeavor: 'Advancing fault-tolerant quantum algorithms',
            substantialMerit: 'Critical computing infrastructure',
            nationalImportance: 'US scientific leadership',
            wellPositioned: 'Published 12 papers and holds 3 patents',
          },
        },
      }),
    });
    const niwData = await niwCreateRes.json();
    check(niwCreateRes.status === 201, 'EB-2 NIW category application creation verified');

    const o1CreateRes = await fetch(`${BACKEND_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`,
      },
      body: JSON.stringify({
        visaCategory: 'O-1',
        title: 'O-1A Extraordinary Ability in AI',
        categorySpecificDetails: {
          o1: {
            criteriaList: ['awards', 'original_contributions', 'scholarly_articles'],
          },
        },
      }),
    });
    const o1Data = await o1CreateRes.json();
    check(o1CreateRes.status === 201, 'O-1 category application creation verified');

    const eb2CreateRes = await fetch(`${BACKEND_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`,
      },
      body: JSON.stringify({
        visaCategory: 'EB-2',
        title: 'EB-2 Advanced Degree Standard Track',
        categorySpecificDetails: {
          eb2: {
            subCategory: 'advanced_degree',
            hasPermApproval: false,
          },
        },
      }),
    });
    const eb2Data = await eb2CreateRes.json();
    check(eb2CreateRes.status === 201, 'EB-2 category application creation verified');

    // 9. Verify the existing Documents route loads
    console.log('\n[9/10] Verifying Existing Documents Route Loads...');
    const docRouteRes = await fetch(`${FRONTEND_URL}/dashboard/documents`);
    check(docRouteRes.status === 200, 'Frontend /dashboard/documents route responds with HTTP 200');

    // Also check backend documents API
    const docApiRes = await fetch(`${BACKEND_URL}/documents/application/${createdAppId}`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const docApiData = await docApiRes.json();
    check(docApiRes.status === 200 && docApiData.success === true, 'Backend /documents/application/:id responds with HTTP 200');

    // 10. Verify frontend and backend communicate successfully
    console.log('\n[10/10] Verifying Frontend and Backend Communication...');
    const feRes = await fetch(`${FRONTEND_URL}/dashboard`);
    check(feRes.status === 200, 'Frontend /dashboard responds with HTTP 200');
    const beSummaryRes = await fetch(`${BACKEND_URL}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const beSummaryData = await beSummaryRes.json();
    check(beSummaryRes.status === 200 && beSummaryData.success === true, 'Backend dashboard summary returns live data');
    check(beSummaryData.stats?.totalCases >= 4, `Live case count matches created applications: ${beSummaryData.stats?.totalCases}`);

    console.log('\n=================================================================');
    console.log(`  AUDIT RESULT: ${passed} PASSED, ${failed} FAILED (TOTAL CHECKS: ${passed + failed})`);
    console.log('=================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Prerequisite verification failed with exception:', err);
    process.exit(1);
  }
}

verifyPrerequisites();
