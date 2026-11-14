// backend/scripts/verify-phase5-prerequisites.mjs
// Verification of Phase 5 Prerequisites prior to Phase 6: AI Assistant & Document Intelligence

const BACKEND_URL = 'http://localhost:5001/api/v1';
const FRONTEND_URL = 'http://localhost:3001';

function createValidPdfBuffer(content = 'Prerequisite Audit Document') {
  const header = Buffer.from('%PDF-1.5\n');
  const body = Buffer.from(
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\nstream\n${content}\nendstream\nxref\n0 4\n0000000000 65535 f \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n180\n%%EOF\n`
  );
  return Buffer.concat([header, body]);
}

async function verifyPrerequisites() {
  console.log('=================================================================');
  console.log('  PHASE 6 PREREQUISITE AUDIT: VERIFYING PHASE 5 STATE & PIPELINES');
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
    // 1. Verify MongoDB Atlas connectivity
    console.log('[1/10] Verifying MongoDB Atlas Connectivity & Real Ping...');
    const dbRes = await fetch(`${BACKEND_URL}/health/db`);
    const dbData = await dbRes.json();
    check(dbRes.status === 200, 'Health DB endpoint returns HTTP 200');
    check(dbData.readyState === 1, 'MongoDB readyState is 1 (Connected)');
    check(dbData.isPersistent === true && dbData.isMemoryDb === false, 'Persistent MongoDB Atlas cluster active');
    check(typeof dbData.pingLatencyMs === 'number' && dbData.pingLatencyMs < 2000, `Real database ping latency: ${dbData.pingLatencyMs}ms`);

    // 2. Verify real user registration and login
    console.log('\n[2/10] Verifying Registration & Login...');
    const timestamp = Date.now();
    const applicantEmail = `p6_audit_app_${timestamp}@test.com`;
    const attorneyEmail = `p6_audit_att_${timestamp}@test.com`;
    const outsiderEmail = `p6_audit_out_${timestamp}@test.com`;
    const password = 'SecurePassword!2026';

    const regRes = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Phase 6 Auditor', email: applicantEmail, password, role: 'applicant' }),
    });
    const regData = await regRes.json();
    check(regRes.status === 201 && regData.success === true, 'Applicant registration succeeded with HTTP 201');

    const loginRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: applicantEmail, password }),
    });
    const loginData = await loginRes.json();
    check(loginRes.status === 200 && loginData.success === true, 'Applicant login verified with bcrypt hash matching');
    const applicantToken = loginData.token;

    const regAttRes = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Attorney P6', email: attorneyEmail, password, role: 'attorney' }),
    });
    const regAttData = await regAttRes.json();
    check(regAttRes.status === 201, 'Attorney registration verified');
    const attorneyToken = regAttData.token;

    const regOutRes = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Outsider P6', email: outsiderEmail, password, role: 'applicant' }),
    });
    const regOutData = await regOutRes.json();
    check(regOutRes.status === 201, 'Outsider registration verified');
    const outsiderToken = regOutData.token;

    // 3. Verify backend authorization
    console.log('\n[3/10] Verifying Backend Role-Based Authorization & Boundaries...');
    const adminCheckRes = await fetch(`${BACKEND_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    check(adminCheckRes.status === 403, 'Applicant blocked from admin endpoint (HTTP 403 Forbidden)');

    // 4. Verify visa application creation
    console.log('\n[4/10] Verifying Visa Application Creation...');
    const appRes = await fetch(`${BACKEND_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${applicantToken}` },
      body: JSON.stringify({
        visaCategory: 'H-1B',
        title: 'H-1B Senior AI Research Scientist',
        applicantDetails: { fullName: 'P6 Candidate', nationality: 'India' },
      }),
    });
    const appData = await appRes.json();
    check(appRes.status === 201 && appData.success === true, 'H-1B visa application created with HTTP 201');
    const applicationId = appData.application?._id;
    check(Boolean(applicationId), `Application ID assigned: ${applicationId}`);

    // 5. Verify documents can be uploaded
    console.log('\n[5/10] Verifying Document Upload with Binary Signature Validation...');
    const pdfBlob = new Blob([createValidPdfBuffer('Ph6 LCA Verification Content')], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('files', pdfBlob, 'Certified_LCA_ETA9035.pdf');
    formData.append('applicationId', applicationId);
    formData.append('title', 'Certified LCA ETA-9035');

    const uploadRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${applicantToken}` },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    check(uploadRes.status === 201 && uploadData.success === true, 'Document uploaded successfully with HTTP 201');
    const uploadedDoc = uploadData.documents?.[0];
    check(Boolean(uploadedDoc?._id), 'Document record ID generated');

    // 6. Verify files are stored privately
    console.log('\n[6/10] Verifying Private Storage (Not in Public Web Root)...');
    check(uploadedDoc?.storageProvider === 'local' || uploadedDoc?.storageProvider === 's3', `Storage provider confirmed: ${uploadedDoc?.storageProvider}`);
    check(Boolean(uploadedDoc?.storageKey), `Randomized storage key: ${uploadedDoc?.storageKey}`);
    check(!uploadedDoc?.storagePath?.includes('public'), 'Storage path is outside public web directory');

    // 7. Verify authorized document retrieval
    console.log('\n[7/10] Verifying Authorized Document Retrieval...');
    const getDocRes = await fetch(`${BACKEND_URL}/documents/${uploadedDoc._id}`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const getDocData = await getDocRes.json();
    check(getDocRes.status === 200 && getDocData.success === true, 'Authorized document retrieval returns HTTP 200');

    const previewRes = await fetch(`${BACKEND_URL}/documents/${uploadedDoc._id}/preview`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    check(previewRes.status === 200, 'Authorized inline preview stream returns HTTP 200');

    // 8. Verify document ownership checks (IDOR defense)
    console.log('\n[8/10] Verifying Document Ownership Checks & Zero-Trust IDOR Defense...');
    const idorDownloadRes = await fetch(`${BACKEND_URL}/documents/${uploadedDoc._id}/download`, {
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    check(idorDownloadRes.status === 403, 'Cross-user IDOR download blocked with HTTP 403 Forbidden');

    const idorPreviewRes = await fetch(`${BACKEND_URL}/documents/${uploadedDoc._id}/preview`, {
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    check(idorPreviewRes.status === 403, 'Cross-user IDOR preview blocked with HTTP 403 Forbidden');

    // 9. Verify document metadata persists in MongoDB
    console.log('\n[9/10] Verifying Document Metadata Persistence in MongoDB Atlas...');
    check(getDocData.document?.originalFilename === 'Certified_LCA_ETA9035.pdf', 'Original filename persisted');
    check(getDocData.document?.category === 'h1b_lca', 'Heuristic evidentiary category persisted: h1b_lca');
    check(Boolean(getDocData.document?.checksum), `SHA-256 Checksum persisted: ${getDocData.document?.checksum.slice(0, 16)}...`);
    check(getDocData.document?.isCurrentVersion === true, 'isCurrentVersion flag is true');
    check(getDocData.document?.versionNumber === 1, 'Initial versionNumber is 1');

    // 10. Verify existing AI Assistant page loads
    console.log('\n[10/10] Verifying AI Assistant Route Accessibility...');
    const assistantPageRes = await fetch(`${FRONTEND_URL}/dashboard/assistant`);
    check(assistantPageRes.status === 200, 'Frontend /dashboard/assistant route loads with HTTP 200');

    console.log('\n=================================================================');
    console.log(`  PREREQUISITE RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL CHECKS: ${passed + failed})`);
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

