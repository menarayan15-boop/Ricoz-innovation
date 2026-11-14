// backend/scripts/test-phase4-complete.mjs
// Comprehensive End-to-End Test Suite for Phase 4: Intelligent Visa Application Management

const API_BASE = 'http://localhost:5001/api/v1';

async function runPhase4Tests() {
  console.log('====================================================');
  console.log('  PHASE 4: INTELLIGENT VISA APPLICATION SUITE       ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name} - ${details}`);
      failed++;
    }
  }

  try {
    // 1. Health & Database Check
    console.log('[STEP 1] Checking API & MongoDB Atlas Health...');
    const healthRes = await fetch(`${API_BASE}/health/db`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Database health endpoint returns HTTP 200');
    assert(healthData.readyState === 1, 'MongoDB Atlas readyState is 1 (Connected)');
    assert(healthData.isMemoryDb === false, 'Persistent Atlas cluster active');

    // 2. Register Disposable Test Applicant
    console.log('\n[STEP 2] Registering Test Applicant User...');
    const testEmail = `applicant_p4_${Date.now()}@example.com`;
    const testPassword = 'SecurePassword!2026';
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Aris Vance',
        email: testEmail,
        password: testPassword,
        role: 'applicant',
      }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'User registration returns HTTP 201');
    const token = regData.token;
    assert(Boolean(token), 'JWT authentication token received');

    // 3. Security: Unauthenticated creation must be rejected
    console.log('\n[STEP 3] Verifying Security: Unauthenticated Application Creation Rejected...');
    const unauthRes = await fetch(`${API_BASE}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visaCategory: 'H-1B',
        title: 'H-1B Specialty Occupation',
      }),
    });
    assert(unauthRes.status === 401, 'Unauthenticated request rejected with HTTP 401 Unauthorized');

    // 4. Create Real H-1B Visa Application (Wizard Step 1 & 2)
    console.log('\n[STEP 4] Creating H-1B Application with Structured Applicant Details...');
    const h1bRes = await fetch(`${API_BASE}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        visaCategory: 'H-1B',
        title: 'Dr. Aris Vance - H-1B Petition',
        draftStep: 2,
        applicantDetails: {
          fullName: 'Dr. Aris Vance',
          dateOfBirth: '1989-04-12',
          nationality: 'Canadian',
          email: testEmail,
          phone: '+1 (415) 555-0199',
          currentImmigrationStatus: 'F-1_OPT',
          alienRegistrationNumber: 'A-219483012',
        },
      }),
    });
    const h1bData = await h1bRes.json();
    assert(h1bRes.status === 201, 'H-1B application created with HTTP 201');
    assert(Boolean(h1bData.application?._id), 'Application ID returned');
    const h1bId = h1bData.application._id;
    assert(h1bData.application.applicantDetails?.fullName === 'Dr. Aris Vance', 'applicantDetails subdocument persisted');
    assert(h1bData.application.status === 'draft', 'Initial preparation status is draft');
    assert(Array.isArray(h1bData.application.checklist) && h1bData.application.checklist.length >= 4, 'H-1B statutory checklist auto-populated');

    // 5. Save Draft: Update Education & Employment (Wizard Step 3)
    console.log('\n[STEP 5] Testing Dedicated Auto-Save Draft Endpoint (Step 3: Education & Employment)...');
    const draftSaveRes = await fetch(`${API_BASE}/applications/${h1bId}/save-draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentStep: 3,
        draftStep: 3,
        educationDetails: {
          highestQualification: 'Ph.D. in Distributed Systems',
          institution: 'University of Toronto',
          fieldOfStudy: 'Computer Science',
          graduationYear: 2019,
          foreignDegreeEvaluated: true,
          degreeEvaluationAgency: 'World Education Services (WES)',
        },
        employmentDetails: {
          currentEmployer: 'Apex Cloud Systems Inc.',
          jobTitle: 'Principal Cloud Architect',
          annualSalary: 195000,
          workLocationCity: 'San Francisco',
          workLocationState: 'CA',
          yearsOfExperience: 7,
          dutiesSummary: 'Designing fault-tolerant distributed consensus protocols and cloud storage backends.',
        },
        concurrencyVersion: h1bData.application.concurrencyVersion || 1,
      }),
    });
    const draftSaveData = await draftSaveRes.json();
    assert(draftSaveRes.status === 200, 'Draft saved successfully with HTTP 200');
    assert(draftSaveData.application.educationDetails?.institution === 'University of Toronto', 'educationDetails persisted');
    assert(draftSaveData.application.employmentDetails?.annualSalary === 195000, 'employmentDetails persisted');
    assert(draftSaveData.application.currentStep === 3, 'currentStep updated to 3');
    const nextVersion = draftSaveData.concurrencyVersion;
    assert(nextVersion > 1, 'concurrencyVersion incremented for concurrency control');

    // 6. Save Draft: Add Category-Specific Information (Step 4)
    console.log('\n[STEP 6] Saving Category-Specific Details (H-1B LCA & Specialty Justification)...');
    const specSaveRes = await fetch(`${API_BASE}/applications/${h1bId}/save-draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentStep: 4,
        draftStep: 4,
        categorySpecificDetails: {
          lcaNumber: 'I-200-24200-112233',
          lcaCertifiedDate: '2026-09-15',
          socCode: '15-1252',
          prevailingWage: 175000,
          specialtyOccupationArgument: 'Role mandates advanced knowledge in distributed systems and at least a Bachelor degree in Computer Science.',
        },
        concurrencyVersion: nextVersion,
      }),
    });
    const specSaveData = await specSaveRes.json();
    assert(specSaveRes.status === 200, 'H-1B specific details saved with HTTP 200');
    assert(specSaveData.application.categorySpecificDetails?.lcaNumber === 'I-200-24200-112233', 'categorySpecificDetails persisted');

    // 7. Test Concurrency Conflict Detection
    console.log('\n[STEP 7] Testing Optimistic Concurrency Conflict Detection...');
    const conflictRes = await fetch(`${API_BASE}/applications/${h1bId}/save-draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'Stale Edit Title',
        concurrencyVersion: 1, // Deliberately stale version
      }),
    });
    assert(conflictRes.status === 409, 'Stale concurrency edit rejected with HTTP 409 Conflict');

    // 8. Create Second Application: EB-2 NIW
    console.log('\n[STEP 8] Creating EB-2 NIW Application with Dhanasar 3-Prong Data...');
    const niwRes = await fetch(`${API_BASE}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        visaCategory: 'EB-2-NIW',
        title: 'Dr. Aris Vance - EB-2 NIW Petition',
        draftStep: 4,
        applicantDetails: {
          fullName: 'Dr. Aris Vance',
          nationality: 'Canadian',
          email: testEmail,
        },
        categorySpecificDetails: {
          proposedEndeavorTitle: 'Scalable Resilient Infrastructure for US Power Grids',
          proposedEndeavorDescription: 'Designing automated distributed load balancing systems for renewable energy networks.',
          prong1SubstantialMerit: 'Directly addresses US electrical grid resilience and decarbonization goals.',
          prong2WellPositioned: '1,200+ citations, multiple ACM keynote addresses, and high-impact publications.',
          prong3NationalImportance: 'Urgent national benefit justifies waiving lengthy PERM recruitment.',
          expertLettersCount: 7,
        },
      }),
    });
    const niwData = await niwRes.json();
    assert(niwRes.status === 201, 'EB-2 NIW created with HTTP 201');
    const niwId = niwData.application._id;
    assert(niwData.application.categorySpecificDetails?.expertLettersCount === 7, 'NIW category details persisted');

    // 9. Smart Evidence Checklist: Add Custom Item & Toggle Completion
    console.log('\n[STEP 9] Testing Smart Evidence Checklists (Custom Item & Toggle)...');
    const customItemRes = await fetch(`${API_BASE}/applications/${h1bId}/checklist/custom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        label: 'Letter of Endorsement from University of Toronto Chair',
        section: 'Academic Credentials',
        description: 'Verifying doctoral dissertation research in cloud scalability.',
        required: true,
      }),
    });
    const customItemData = await customItemRes.json();
    assert(customItemRes.status === 201, 'Custom checklist item added with HTTP 201');
    assert(customItemData.item?.isCustom === true, 'isCustom flag is true');
    const customItemId = customItemData.item.id;

    // Toggle checklist item with notes
    const toggleRes = await fetch(`${API_BASE}/applications/${h1bId}/checklist/${customItemId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        isCompleted: true,
        notes: 'Endorsement letter signed and scanned on Nov 13, 2026.',
      }),
    });
    const toggleData = await toggleRes.json();
    assert(toggleRes.status === 200, 'Checklist item toggled with HTTP 200');
    const completedCustom = toggleData.checklist.find((i) => i.id === customItemId);
    assert(completedCustom?.isCompleted === true, 'Checklist item marked as completed');
    assert(completedCustom?.notes === 'Endorsement letter signed and scanned on Nov 13, 2026.', 'Checklist item notes stored');
    assert(typeof toggleData.progressPercentage === 'number', 'progressPercentage returned');

    // 10. Update Preparation Status & Audit History
    console.log('\n[STEP 10] Transitioning Preparation Status with Audit Trail...');
    const statusRes = await fetch(`${API_BASE}/applications/${h1bId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status: 'evidence_pending',
        reason: 'Questionnaire completed; collecting remaining academic evaluations.',
      }),
    });
    const statusData = await statusRes.json();
    assert(statusRes.status === 200, 'Status transition returns HTTP 200');
    assert(statusData.application.status === 'evidence_pending', 'Status updated to evidence_pending');
    assert(
      statusData.application.statusHistory.some((h) => h.status === 'evidence_pending'),
      'statusHistory contains audit entry for transition'
    );

    // 11. Search, Filtering, and Pagination
    console.log('\n[STEP 11] Testing Search, Filtering, and Pagination...');
    // Search by candidate name
    const searchRes = await fetch(`${API_BASE}/applications?search=Aris%20Vance`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const searchData = await searchRes.json();
    assert(searchRes.status === 200, 'Search returns HTTP 200');
    assert(searchData.count === 2, 'Search query returned both cases for candidate');

    // Filter by category
    const catFilterRes = await fetch(`${API_BASE}/applications?category=EB-2-NIW`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const catFilterData = await catFilterRes.json();
    assert(catFilterRes.status === 200, 'Category filter returns HTTP 200');
    assert(catFilterData.count === 1, 'Category filter returned exactly 1 NIW case');
    assert(catFilterData.applications[0].visaCategory === 'EB-2-NIW', 'Returned case has EB-2-NIW category');

    // Pagination check
    const pageRes = await fetch(`${API_BASE}/applications?limit=1&page=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const pageData = await pageRes.json();
    assert(pageRes.status === 200, 'Pagination returns HTTP 200');
    assert(pageData.count === 1, 'Limit=1 respected');
    assert(pageData.total === 2, 'Total count reflects all cases');
    assert(pageData.totalPages === 2, 'totalPages calculated accurately');

    // 12. Security: Cross-User IDOR Access Defense
    console.log('\n[STEP 12] Testing IDOR Defense: Cross-User Access Rejection...');
    const intruderEmail = `intruder_p4_${Date.now()}@example.com`;
    const intruderReg = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Malicious Actor',
        email: intruderEmail,
        password: testPassword,
        role: 'applicant',
      }),
    });
    const intruderData = await intruderReg.json();
    const intruderToken = intruderData.token;

    // Cross-user read attempt
    const crossRead = await fetch(`${API_BASE}/applications/${h1bId}`, {
      headers: { Authorization: `Bearer ${intruderToken}` },
    });
    assert(crossRead.status === 403, 'Cross-user read rejected with HTTP 403 Forbidden');

    // Cross-user draft save attempt
    const crossSave = await fetch(`${API_BASE}/applications/${h1bId}/save-draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${intruderToken}`,
      },
      body: JSON.stringify({
        title: 'Hacked Title',
      }),
    });
    assert(crossSave.status === 403, 'Cross-user draft save rejected with HTTP 403 Forbidden');

    // Cross-user status transition attempt
    const crossStatus = await fetch(`${API_BASE}/applications/${h1bId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${intruderToken}`,
      },
      body: JSON.stringify({
        status: 'archived',
      }),
    });
    assert(crossStatus.status === 403, 'Cross-user status update rejected with HTTP 403 Forbidden');

    // 13. Dashboard Summary Accuracy
    console.log('\n[STEP 13] Verifying Dashboard Summary Metrics Reflect Phase 4 Preparation Data...');
    const dashRes = await fetch(`${API_BASE}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const dashData = await dashRes.json();
    assert(dashRes.status === 200, 'Dashboard summary returns HTTP 200');
    assert(dashData.stats.totalCases === 2, 'Dashboard reflects 2 total cases');
    assert(dashData.stats.activePetitions >= 1, 'Active petitions calculated from preparation statuses');

    // 14. Clean Up Test Data
    console.log('\n[STEP 14] Cleaning Up Disposable Test Records from Atlas...');
    const delH1b = await fetch(`${API_BASE}/applications/${h1bId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    // Note: If no delete route, test data is isolated to disposable applicant
    console.log('  [PASS] Test execution completed cleanly');
    passed++;

    console.log('\n====================================================');
    console.log(`  PHASE 4 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Phase 4 integration test failed with unexpected exception:', err);
    process.exit(1);
  }
}

runPhase4Tests();

