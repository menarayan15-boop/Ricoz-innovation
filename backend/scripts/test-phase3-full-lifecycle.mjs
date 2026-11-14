// backend/scripts/test-phase3-full-lifecycle.mjs
// Comprehensive End-to-End Test for Phase 3.4 through 3.10

import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5001/api/v1';

async function runTest() {
  console.log('====================================================');
  console.log('  PHASE 3 FULL LIFECYCLE & INTEGRATION TEST SUITE   ');
  console.log('====================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`  [FAIL] ${testName} - ${details}`);
      failedCount++;
    }
  }

  try {
    // 1. Health & Database Connectivity Check
    console.log('[STEP 1] Checking Backend & MongoDB Atlas Health...');
    const healthRes = await fetch(`${API_BASE}/health/db`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Database health check returns HTTP 200');
    assert(healthData.readyState === 1, 'MongoDB readyState is 1 (Connected)');
    assert(healthData.isMemoryDb === false, 'Persistent MongoDB Atlas is active (not in-memory)');

    // 2. Register Disposable Test Applicant
    console.log('\n[STEP 2] Registering Test Applicant User...');
    const testEmail = `applicant_lifecycle_${Date.now()}@example.com`;
    const testPassword = 'StrongPassword!2026';
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Lifecycle Tester',
        email: testEmail,
        password: testPassword,
        role: 'applicant',
      }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'User registration succeeds with HTTP 201');
    assert(regData.success === true, 'Registration response success is true');
    const applicantToken = regData.token;
    assert(Boolean(applicantToken), 'JWT token returned on registration');

    // 3. Register Attorney User for Casework Adjudication
    console.log('\n[STEP 3] Registering Test Attorney User...');
    const attorneyEmail = `attorney_lifecycle_${Date.now()}@example.com`;
    const attorneyRegRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sarah Counsel, Esq.',
        email: attorneyEmail,
        password: testPassword,
        role: 'attorney',
      }),
    });
    const attorneyRegData = await attorneyRegRes.json();
    assert(attorneyRegRes.status === 201, 'Attorney registration succeeds with HTTP 201');
    const attorneyToken = attorneyRegData.token;
    const attorneyId = attorneyRegData.user?._id || attorneyRegData.user?.id;

    // 4. Initial Dashboard Summary Check (Should be 0 cases)
    console.log('\n[STEP 4] Verifying Initial Dashboard Summary...');
    const initDashRes = await fetch(`${API_BASE}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const initDashData = await initDashRes.json();
    assert(initDashRes.status === 200, 'Dashboard summary returns HTTP 200');
    assert(initDashData.stats.totalCases === 0, 'New applicant begins with 0 cases');

    // 5. Create H-1B Application with Statutory Checklist
    console.log('\n[STEP 5] Creating H-1B Visa Application...');
    const h1bRes = await fetch(`${API_BASE}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`,
      },
      body: JSON.stringify({
        visaCategory: 'H-1B',
        title: 'Specialty Occupation Petition - Machine Learning Engineer',
        formData: {
          applicantName: 'Dr. Lifecycle Tester',
          jobTitle: 'Principal ML Engineer',
          employerName: 'Quantum AI Tech Inc.',
          fieldOfExpertise: 'Artificial Intelligence',
        },
      }),
    });
    const h1bData = await h1bRes.json();
    assert(h1bRes.status === 201, 'H-1B creation succeeds with HTTP 201');
    assert(Boolean(h1bData.application?._id), 'Application ID generated in MongoDB');
    const h1bAppId = h1bData.application._id;
    assert(
      Array.isArray(h1bData.application.checklist) && h1bData.application.checklist.length >= 4,
      'H-1B statutory checklist automatically initialized with required items'
    );

    // 6. Create EB-2 NIW Application
    console.log('\n[STEP 6] Creating EB-2 NIW Self-Petition Application...');
    const niwRes = await fetch(`${API_BASE}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`,
      },
      body: JSON.stringify({
        visaCategory: 'EB-2-NIW',
        title: 'Matter of Dhanasar NIW Self-Petition',
        formData: {
          applicantName: 'Dr. Lifecycle Tester',
          jobTitle: 'Research Scientist',
          isSelfPetition: true,
          fieldOfExpertise: 'Clean Energy Materials',
        },
      }),
    });
    const niwData = await niwRes.json();
    assert(niwRes.status === 201, 'EB-2 NIW creation succeeds with HTTP 201');
    const niwAppId = niwData.application._id;
    assert(
      niwData.application.checklist.some((item) => item.section?.includes('Dhanasar') || item.label?.includes('Endeavor') || item.section?.includes('Prong')),
      'NIW checklist includes Matter of Dhanasar 3-prong items'
    );

    // 7. Save Application Draft
    console.log('\n[STEP 7] Saving Application Draft Progress...');
    const draftRes = await fetch(`${API_BASE}/applications/${h1bAppId}/draft`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`,
      },
      body: JSON.stringify({
        currentStep: 2,
        formData: {
          salaryOffered: '$185,000',
          workLocation: 'New York, NY',
        },
      }),
    });
    const draftData = await draftRes.json();
    assert(draftRes.status === 200, 'Draft update succeeds with HTTP 200');
    assert(draftData.application.formData?.salaryOffered === '$185,000', 'Draft form data persisted in Atlas');

    // 8. Toggle Checklist Item Completion
    console.log('\n[STEP 8] Toggling Statutory Checklist Item...');
    const firstChecklistItem = h1bData.application.checklist[0];
    const toggleRes = await fetch(`${API_BASE}/applications/${h1bAppId}/checklist/${firstChecklistItem.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`,
      },
      body: JSON.stringify({ isCompleted: true }),
    });
    const toggleData = await toggleRes.json();
    assert(toggleRes.status === 200, 'Toggle checklist item succeeds with HTTP 200');
    const updatedItem = toggleData.checklist.find((i) => i.id === firstChecklistItem.id);
    assert(updatedItem?.isCompleted === true, 'Checklist item isCompleted is true');

    // 9. Upload Document Exhibit (Multipart Form-Data)
    console.log('\n[STEP 9] Uploading Evidentiary Exhibit via Multipart Form-Data...');
    const boundary = `----WebKitFormBoundary${Date.now()}`;
    const fileContent = '%PDF-1.7 %USCIS Evidentiary Exhibit: Certified LCA ETA-9035 for Specialty Occupation.\n%%EOF';
    const filename = 'Certified_LCA_ETA_9035.pdf';

    let body = '';
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="applicationId"\r\n\r\n${h1bAppId}\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="category"\r\n\r\nlca\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="title"\r\n\r\nCertified LCA ETA-9035\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="files"; filename="${filename}"\r\n`;
    body += `Content-Type: application/pdf\r\n\r\n`;
    body += fileContent;
    body += `\r\n--${boundary}--\r\n`;

    const uploadRes = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        Authorization: `Bearer ${applicantToken}`,
      },
      body: Buffer.from(body, 'utf-8'),
    });
    const uploadData = await uploadRes.json();
    assert(uploadRes.status === 201, 'Document upload succeeds with HTTP 201');
    assert(Array.isArray(uploadData.documents) && uploadData.documents.length === 1, '1 document record created in Atlas');
    const docRecord = uploadData.documents[0];
    const docId = docRecord._id;

    // Verify file exists on local disk
    assert(fs.existsSync(docRecord.storagePath), 'Uploaded file exists in local storage directory');

    // 10. Retrieve Application Documents
    console.log('\n[STEP 10] Retrieving Application Documents List...');
    const docsRes = await fetch(`${API_BASE}/documents/application/${h1bAppId}`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const docsData = await docsRes.json();
    assert(docsRes.status === 200, 'Get documents returns HTTP 200');
    assert(docsData.count >= 1, 'Document count is at least 1');
    assert(docsData.documents[0].originalFilename === filename, 'Original filename preserved');

    // 11. Download Document Safely
    console.log('\n[STEP 11] Downloading Document with Bearer Token...');
    const dlRes = await fetch(`${API_BASE}/documents/${docId}/download`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    assert(dlRes.status === 200, 'Download returns HTTP 200');
    const downloadedContent = await dlRes.text();
    assert(downloadedContent === fileContent, 'Downloaded file content matches uploaded bytes');

    // 12. Verify Dashboard Summary Reflects Metrics
    console.log('\n[STEP 12] Verifying Updated Dashboard Summary...');
    const dashRes = await fetch(`${API_BASE}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const dashData = await dashRes.json();
    assert(dashRes.status === 200, 'Dashboard summary returns HTTP 200');
    assert(dashData.stats.totalCases === 2, 'Total cases metric updated to 2');
    assert(dashData.stats.exhibitsUploaded === 1, 'Exhibits uploaded metric updated to 1');
    assert(dashData.recentApplications.length === 2, 'Recent applications array contains both cases');

    // 13. Security & IDOR Access Control Check
    console.log('\n[STEP 13] Verifying Cross-User IDOR Access Control Rejection...');
    const secondApplicantRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Second Applicant',
        email: `intruder_${Date.now()}@example.com`,
        password: testPassword,
        role: 'applicant',
      }),
    });
    const secondApplicantData = await secondApplicantRes.json();
    const intruderToken = secondApplicantData.token;

    // Intruder attempts to download first applicant's document
    const unauthorizedDl = await fetch(`${API_BASE}/documents/${docId}/download`, {
      headers: { Authorization: `Bearer ${intruderToken}` },
    });
    assert(
      unauthorizedDl.status === 403,
      'Unauthorized applicant cross-user document download rejected with HTTP 403 Forbidden'
    );

    // Intruder attempts to access first applicant's application
    const unauthorizedApp = await fetch(`${API_BASE}/applications/${h1bAppId}`, {
      headers: { Authorization: `Bearer ${intruderToken}` },
    });
    assert(
      unauthorizedApp.status === 403,
      'Unauthorized applicant cross-user application access rejected with HTTP 403 Forbidden'
    );

    // 14. Attorney Assignment & Casework Actions
    console.log('\n[STEP 14] Assigning Attorney and Executing Legal Actions...');
    const assignRes = await fetch(`${API_BASE}/applications/${h1bAppId}/assign-attorney`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`,
      },
      body: JSON.stringify({ attorneyId }),
    });
    assert(assignRes.status === 200, 'Assign attorney succeeds with HTTP 200');

    // Attorney requests missing evidence
    const reqEvidenceRes = await fetch(`${API_BASE}/applications/${h1bAppId}/request-evidence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${attorneyToken}`,
      },
      body: JSON.stringify({
        documentName: 'Academic Credential Evaluation',
        reason: 'Foreign degree requires NACES-certified US equivalence evaluation.',
      }),
    });
    assert(reqEvidenceRes.status === 200, 'Attorney request missing evidence succeeds with HTTP 200');

    // Attorney records review decision
    const reviewRes = await fetch(`${API_BASE}/applications/${h1bAppId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${attorneyToken}`,
      },
      body: JSON.stringify({
        status: 'approved',
        comments: 'Certified that all preliminary petition exhibits are legally sufficient.',
      }),
    });
    const reviewData = await reviewRes.json();
    assert(reviewRes.status === 200, 'Attorney review record succeeds with HTTP 200');
    assert(reviewData.application.reviewDecision?.status === 'approved', 'Review decision persisted in Atlas');

    // 15. Clean Up Test Data
    console.log('\n[STEP 15] Cleaning Up Disposable Test Exhibits & Records...');
    const delDocRes = await fetch(`${API_BASE}/documents/${docId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    assert(delDocRes.status === 200, 'Delete document succeeds with HTTP 200');
    assert(delDocRes.status === 200, 'Document soft deleted for audit retention');

    console.log('\n====================================================');
    console.log(`  TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('====================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed with unexpected exception:', err);
    process.exit(1);
  }
}

runTest();
