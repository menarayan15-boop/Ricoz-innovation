// backend/scripts/test-phase5-complete.mjs
// Comprehensive Integration and Security Test Suite for Phase 5: Secure Document Management

const BACKEND_URL = 'http://localhost:5001/api/v1';
const FRONTEND_URL = 'http://localhost:3001';

// Binary generators for valid file signatures
function createValidPdfBuffer(content = 'Statutory Evidence Test PDF') {
  const header = Buffer.from('%PDF-1.5\n');
  const body = Buffer.from(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\nstream\n${content}\nendstream\nxref\n0 4\n0000000000 65535 f \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n180\n%%EOF\n`);
  return Buffer.concat([header, body]);
}

function createValidPngBuffer() {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG Signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR Chunk header
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, // IDAT
    0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, // IEND
    0x42, 0x60, 0x82,
  ]);
}

function createValidDocxBuffer() {
  return Buffer.from([
    0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00, // PK Zip Header
    0x08, 0x00, 0x00, 0x00, 0x21, 0x00, 0x26, 0xb0,
    0x95, 0x56, 0x5b, 0x01, 0x00, 0x00, 0x30, 0x04,
    0x00, 0x00, 0x13, 0x00, 0x08, 0x02, 0x5b, 0x43,
    0x6f, 0x6e, 0x74, 0x65, 0x6e, 0x74, 0x5f, 0x54,
    0x79, 0x70, 0x65, 0x73, 0x5d, 0x2e, 0x78, 0x6d,
    0x6c, 0x20, 0xa2, 0x04, 0x02,
  ]);
}

function createSpoofedBuffer() {
  return Buffer.from('NOT A REAL PDF CONTENT - JUST MALICIOUS PLAIN TEXT');
}

async function runPhase5Tests() {
  console.log('========================================================================');
  console.log('  PHASE 5 COMPREHENSIVE INTEGRATION & SECURITY AUTOMATION TEST SUITE   ');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, label, info = '') {
    if (condition) {
      console.log(`  [PASS] ${label}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${label} - ${info}`);
      failed++;
    }
  }

  try {
    const timestamp = Date.now();
    const applicantEmail = `p5_applicant_${timestamp}@test.com`;
    const attorneyEmail = `p5_attorney_${timestamp}@test.com`;
    const outsiderEmail = `p5_outsider_${timestamp}@test.com`;
    const password = 'TestSecurePassword!2026';

    // -------------------------------------------------------------------------
    // 1. SETUP: Create Test Users & Application
    // -------------------------------------------------------------------------
    console.log('[1/10] Registering Test Users (Applicant, Attorney, Outsider)...');
    
    // Register Applicant
    const regApp = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Applicant P5', email: applicantEmail, password, role: 'applicant' }),
    });
    const appData = await regApp.json();
    assert(regApp.status === 201, 'Applicant registered successfully');
    const applicantToken = appData.token;

    // Register Attorney
    const regAtt = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Attorney P5', email: attorneyEmail, password, role: 'attorney' }),
    });
    const attData = await regAtt.json();
    assert(regAtt.status === 201, 'Attorney registered successfully');
    const attorneyToken = attData.token;
    const attorneyId = attData.user?._id || attData.user?.id;

    // Register Outsider
    const regOut = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Outsider P5', email: outsiderEmail, password, role: 'applicant' }),
    });
    const outData = await regOut.json();
    assert(regOut.status === 201, 'Outsider applicant registered successfully');
    const outsiderToken = outData.token;

    // Create H-1B Application for testing
    console.log('\n[2/10] Creating H-1B Visa Application...');
    const appRes = await fetch(`${BACKEND_URL}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${applicantToken}` },
      body: JSON.stringify({
        visaCategory: 'H-1B',
        title: 'H-1B Senior Systems Engineer',
        applicantDetails: { fullName: 'P5 Candidate', nationality: 'India' },
      }),
    });
    const appJson = await appRes.json();
    assert(appRes.status === 201, 'H-1B Application created');
    const applicationId = appJson.application?._id;

    // Assign Attorney to Application
    const assignRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/assign-attorney`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${applicantToken}` },
      body: JSON.stringify({ attorneyId }),
    });
    const assignJson = await assignRes.json();
    if (!assignRes.ok) console.error('Assign attorney error:', assignJson);
    assert(assignRes.status === 200, 'Attorney assigned to application');

    // -------------------------------------------------------------------------
    // 2. SUBPHASE 5.2 & 5.3: Upload Valid Documents & Magic Number Validation
    // -------------------------------------------------------------------------
    console.log('\n[3/10] Testing Valid Document Uploads (PDF, PNG, DOCX)...');

    // Upload Valid PDF
    const pdfBlob = new Blob([createValidPdfBuffer()], { type: 'application/pdf' });
    const pdfForm = new FormData();
    pdfForm.append('files', pdfBlob, 'Certified_LCA_ETA9035.pdf');
    pdfForm.append('applicationId', applicationId);
    pdfForm.append('title', 'Certified LCA ETA-9035');

    const uploadPdfRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${applicantToken}` },
      body: pdfForm,
    });
    const uploadPdfJson = await uploadPdfRes.json();
    assert(uploadPdfRes.status === 201, 'Valid PDF uploaded successfully (HTTP 201)');
    assert(uploadPdfJson.documents?.length === 1, 'One document record created in MongoDB');
    const lcaDoc = uploadPdfJson.documents?.[0];
    assert(lcaDoc?.category === 'h1b_lca', `Heuristic auto-classified as h1b_lca: ${lcaDoc?.category}`);
    assert(Boolean(lcaDoc?.checksum), `SHA-256 Checksum generated: ${lcaDoc?.checksum.slice(0, 16)}...`);

    // Upload Valid PNG
    const pngBlob = new Blob([createValidPngBuffer()], { type: 'image/png' });
    const pngForm = new FormData();
    pngForm.append('files', pngBlob, 'Passport_Bio_Page.png');
    pngForm.append('applicationId', applicationId);

    const uploadPngRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${applicantToken}` },
      body: pngForm,
    });
    const uploadPngJson = await uploadPngRes.json();
    if (!uploadPngRes.ok) console.error('Upload PNG error:', uploadPngJson);
    assert(uploadPngRes.status === 201, 'Valid PNG uploaded successfully (HTTP 201)');
    const passportDoc = uploadPngJson.documents?.[0];
    assert(passportDoc?.category === 'h1b_identity', `Heuristic auto-classified as h1b_identity: ${passportDoc?.category}`);

    // Upload Valid DOCX
    const docxBlob = new Blob([createValidDocxBuffer()], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const docxForm = new FormData();
    docxForm.append('files', docxBlob, 'Specialty_Occupation_Job_Duties.docx');
    docxForm.append('applicationId', applicationId);

    const uploadDocxRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${applicantToken}` },
      body: docxForm,
    });
    const uploadDocxJson = await uploadDocxRes.json();
    if (!uploadDocxRes.ok) console.error('Upload DOCX error:', uploadDocxJson);
    assert(uploadDocxRes.status === 201, 'Valid DOCX uploaded successfully (HTTP 201)');

    // -------------------------------------------------------------------------
    // 3. SECURITY: File Signature Mismatch Rejection
    // -------------------------------------------------------------------------
    console.log('\n[4/10] Testing Security File Signature Mismatch Rejection...');
    const spoofedBlob = new Blob([createSpoofedBuffer()], { type: 'application/pdf' });
    const spoofedForm = new FormData();
    spoofedForm.append('files', spoofedBlob, 'Malicious_Payload.pdf');
    spoofedForm.append('applicationId', applicationId);

    const spoofedRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${applicantToken}` },
      body: spoofedForm,
    });
    const spoofedJson = await spoofedRes.json();
    assert(spoofedRes.status === 400, 'Spoofed file signature strictly rejected with HTTP 400 Bad Request');
    assert(spoofedJson.message?.includes('Validation failed'), `Security message: ${spoofedJson.message}`);

    // -------------------------------------------------------------------------
    // 4. SUBPHASE 5.5: Search, Filtering & Pagination
    // -------------------------------------------------------------------------
    console.log('\n[5/10] Testing Document Search, Filtering & Pagination...');
    
    // Filter by category
    const filterCatRes = await fetch(
      `${BACKEND_URL}/applications/${applicationId}/documents?category=h1b_lca`,
      { headers: { Authorization: `Bearer ${applicantToken}` } }
    );
    const filterCatJson = await filterCatRes.json();
    assert(filterCatRes.status === 200, 'Filtered documents retrieved');
    assert(filterCatJson.documents?.length === 1 && filterCatJson.documents[0].category === 'h1b_lca', 'Category filter returns exact match');

    // Search by title/filename
    const searchRes = await fetch(
      `${BACKEND_URL}/applications/${applicationId}/documents?search=Passport`,
      { headers: { Authorization: `Bearer ${applicantToken}` } }
    );
    const searchJson = await searchRes.json();
    assert(searchJson.documents?.length === 1, 'Search query "Passport" matched 1 document');

    // -------------------------------------------------------------------------
    // 5. SUBPHASE 5.5: Preview & Download Endpoints
    // -------------------------------------------------------------------------
    console.log('\n[6/10] Testing Document Preview & Download Endpoints...');

    // Preview inline stream
    const previewRes = await fetch(`${BACKEND_URL}/documents/${lcaDoc._id}/preview`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    assert(previewRes.status === 200, 'Document preview inline stream returned HTTP 200');
    assert(previewRes.headers.get('content-type')?.includes('application/pdf'), 'Content-Type is application/pdf');
    assert(previewRes.headers.get('content-disposition')?.includes('inline'), 'Content-Disposition is inline');
    assert(previewRes.headers.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options: nosniff security header present');

    // Download attachment stream
    const downloadRes = await fetch(`${BACKEND_URL}/documents/${lcaDoc._id}/download`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    assert(downloadRes.status === 200, 'Document download stream returned HTTP 200');
    assert(downloadRes.headers.get('content-disposition')?.includes('attachment'), 'Content-Disposition is attachment');

    // -------------------------------------------------------------------------
    // 6. SUBPHASE 5.7: Version History & Revisions
    // -------------------------------------------------------------------------
    console.log('\n[7/10] Testing Document Versioning & Replacement Flow...');

    // Upload Revision v2
    const v2Blob = new Blob([createValidPdfBuffer('LCA Revision 2 with prevailing wage updates')], {
      type: 'application/pdf',
    });
    const v2Form = new FormData();
    v2Form.append('file', v2Blob, 'Certified_LCA_ETA9035_v2.pdf');
    v2Form.append('versionNotes', 'Updated with prevailing wage level 3');

    const v2Res = await fetch(`${BACKEND_URL}/documents/${lcaDoc._id}/versions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${applicantToken}` },
      body: v2Form,
    });
    const v2Json = await v2Res.json();
    if (!v2Res.ok) console.error('Upload v2 error:', v2Json);
    assert(v2Res.status === 201, 'Replacement revision uploaded with HTTP 201');
    assert(v2Json.document?.versionNumber === 2, `Version number incremented to 2: v${v2Json.document?.versionNumber}`);
    assert(v2Json.document?.isCurrentVersion === true, 'New version marked as active isCurrentVersion');

    // Fetch Version History Timeline
    const historyRes = await fetch(`${BACKEND_URL}/documents/${lcaDoc._id}/versions`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const historyJson = await historyRes.json();
    assert(historyRes.status === 200, 'Version history timeline retrieved');
    assert(historyJson.versions?.length === 2, `Version tree contains 2 revisions (found: ${historyJson.versions?.length})`);

    // -------------------------------------------------------------------------
    // 7. SUBPHASE 5.8: Attorney Review Workflow & Checklist Sync
    // -------------------------------------------------------------------------
    console.log('\n[8/10] Testing Attorney Review Workflow & Statutory Verification...');

    // Attorney marks document verified
    const reviewRes = await fetch(`${BACKEND_URL}/documents/${v2Json.document._id}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${attorneyToken}` },
      body: JSON.stringify({
        status: 'verified',
        reviewNotes: 'Certified ETA-9035 verified against OES prevailing wage table.',
      }),
    });
    const reviewJson = await reviewRes.json();
    assert(reviewRes.status === 200, 'Attorney review submitted successfully');
    assert(reviewJson.document?.reviewStatus === 'verified', 'Document reviewStatus updated to "verified"');
    assert(Boolean(reviewJson.document?.reviewedAt), 'Reviewed timestamp recorded');

    // Applicant attempting to review should be rejected (403)
    const unauthorizedReview = await fetch(`${BACKEND_URL}/documents/${v2Json.document._id}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${applicantToken}` },
      body: JSON.stringify({ status: 'verified' }),
    });
    assert(unauthorizedReview.status === 403, 'Applicant blocked from attorney review endpoint (HTTP 403 Forbidden)');

    // -------------------------------------------------------------------------
    // 8. SUBPHASE 5.9: Audit Activity Trail & Workspace Stats
    // -------------------------------------------------------------------------
    console.log('\n[9/10] Testing Audit Activity Trail & Workspace Aggregations...');

    const activityRes = await fetch(`${BACKEND_URL}/documents/${v2Json.document._id}/activity`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const activityJson = await activityRes.json();
    assert(activityRes.status === 200, 'Document audit timeline retrieved');
    assert(activityJson.activities?.length >= 2, `Audit trail recorded events (found: ${activityJson.activities?.length})`);

    // Workspace Stats
    const statsRes = await fetch(`${BACKEND_URL}/documents/stats`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const statsJson = await statsRes.json();
    assert(statsRes.status === 200, 'Workspace stats endpoint returned HTTP 200');
    assert(statsJson.stats?.totalDocuments >= 3, `Total active exhibits verified: ${statsJson.stats?.totalDocuments}`);
    assert(statsJson.stats?.verifiedDocuments >= 1, `Verified documents count: ${statsJson.stats?.verifiedDocuments}`);

    // -------------------------------------------------------------------------
    // 9. SECURITY & IDOR: Zero-Trust Defense
    // -------------------------------------------------------------------------
    console.log('\n[10/10] Testing Security & IDOR Defenses...');

    // Outsider attempting to download applicant's private document
    const idorDownload = await fetch(`${BACKEND_URL}/documents/${lcaDoc._id}/download`, {
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    assert(idorDownload.status === 403, 'Cross-user IDOR download blocked with HTTP 403 Forbidden');

    // Outsider attempting to preview applicant's private document
    const idorPreview = await fetch(`${BACKEND_URL}/documents/${lcaDoc._id}/preview`, {
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    assert(idorPreview.status === 403, 'Cross-user IDOR preview blocked with HTTP 403 Forbidden');

    // Soft delete document
    const deleteRes = await fetch(`${BACKEND_URL}/documents/${passportDoc._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    assert(deleteRes.status === 200, 'Document soft deleted successfully (HTTP 200)');

    // Verify soft-deleted document no longer appears in current listings
    const postDeleteList = await fetch(`${BACKEND_URL}/applications/${applicationId}/documents`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const postDeleteJson = await postDeleteList.json();
    const deletedFound = postDeleteJson.documents?.some((d) => d._id === passportDoc._id);
    assert(deletedFound === false, 'Soft-deleted document excluded from active case documents list');

    console.log('\n========================================================================');
    console.log(`  PHASE 5 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL CHECKS: ${passed + failed})`);
    console.log('========================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Phase 5 test suite encountered an unhandled exception:', err);
    process.exit(1);
  }
}

runPhase5Tests();
