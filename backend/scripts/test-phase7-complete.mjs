// backend/scripts/test-phase7-complete.mjs
// Authoritative End-to-End Test Suite for Phase 7:
// Advanced Evidence Intelligence, Cross-Document Verification, Evidence Gap Analysis & Human Review Workflows

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import dns from 'dns';
import mongoose from 'mongoose';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const BACKEND_URL = process.env.TEST_BACKEND_URL || 'http://localhost:5001/api/v1';

function createReadablePdfBuffer(text) {
  const cleanText = text.replace(/[\\()\r\n]/g, ' ');
  const streamContent = `BT /F1 12 Tf 72 712 Td (${cleanText}) Tj ET\n`;
  const streamLen = streamContent.length;
  const body =
    '%PDF-1.4\n' +
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj\n' +
    '4 0 obj<</Length ' +
    streamLen +
    '>>stream\n' +
    streamContent +
    'endstream\nendobj\n' +
    'xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000216 00000 n\n' +
    'trailer<</Size 5/Root 1 0 R>>\nstartxref\n350\n%%EOF';
  return Buffer.from(body);
}

async function runPhase7TestSuite() {
  console.log('========================================================================');
  console.log('  PHASE 7 AUTHORITATIVE END-TO-END TEST SUITE                          ');
  console.log('  Advanced Evidence Intelligence, Cross-Doc Verification & Human Review ');
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

  // Test suite executes via live Express backend REST API
  try {
    const timestamp = Date.now();
    const applicantEmail = `p7_applicant_${timestamp}@test.com`;
    const outsiderEmail = `p7_outsider_${timestamp}@test.com`;
    const password = 'Password123!';

    // -------------------------------------------------------------------------
    // 1. SETUP APPLICANT & OUTSIDER SESSIONS
    // -------------------------------------------------------------------------
    console.log('[1/8] Setting Up Authenticated Applicant & Outsider Sessions...');

    const regApplicant = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Dr. Jane Doe', email: applicantEmail, password, role: 'applicant' }),
    });
    const regApplicantData = await regApplicant.json();
    const applicantToken = regApplicantData.token;
    assert(regApplicant.status === 201 && Boolean(applicantToken), 'Applicant registered & authenticated');

    const regOutsider = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Outsider Mallory', email: outsiderEmail, password, role: 'applicant' }),
    });
    const regOutsiderData = await regOutsider.json();
    const outsiderToken = regOutsiderData.token;
    assert(regOutsider.status === 201 && Boolean(outsiderToken), 'Outsider registered for IDOR isolation tests');

    // -------------------------------------------------------------------------
    // 2. CREATE H-1B PETITION
    // -------------------------------------------------------------------------
    console.log('\n[2/8] Creating H-1B Visa Application...');
    const appRes = await fetch(`${BACKEND_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`,
      },
      body: JSON.stringify({
        visaCategory: 'H-1B',
        title: 'H-1B Petition: Senior AI Research Scientist',
      }),
    });
    const appData = await appRes.json();
    const applicationId = appData.application?._id || appData.application?.id;
    assert(appRes.status === 201 && Boolean(applicationId), 'H-1B Application created with statutory checklist');

    // -------------------------------------------------------------------------
    // 3. UPLOAD MULTIPLE EVIDENTIARY EXHIBITS WITH SYNTHETIC DISCREPANCIES
    // -------------------------------------------------------------------------
    console.log('\n[3/8] Uploading & Extracting Multi-Document Evidentiary Exhibits...');

    // Exhibit 1: Certified LCA Form ETA-9035 (Beneficiary: Dr. Jane Doe, Prevailing Wage: $150,000, Offered: $165,000)
    const lcaText = `Department of Labor Form ETA-9035 Certified Labor Condition Application. Beneficiary: Dr. Jane Doe. Employer Name: Apex AI Innovations LLC. Job Title: Senior AI Research Scientist. Offered Wage Rate: $165,000 per year. Prevailing Wage: $150,000 per year. SOC Code: 15-1221. Validity: 10/01/2026 to 09/30/2029.`;
    const lcaBuf = createReadablePdfBuffer(lcaText);
    const lcaForm = new FormData();
    lcaForm.append('files', new Blob([lcaBuf], { type: 'application/pdf' }), 'Certified_LCA_ETA9035.pdf');
    lcaForm.append('title', 'Certified LCA ETA-9035');
    lcaForm.append('category', 'EMPLOYMENT_RECORDS');

    const lcaUpRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${applicantToken}` },
      body: lcaForm,
    });
    const lcaUpData = await lcaUpRes.json();
    const lcaDocId = lcaUpData.documents?.[0]?._id;
    assert(lcaUpRes.status === 201 && Boolean(lcaDocId), 'Exhibit 1: Certified LCA uploaded');

    // Exhibit 2: Employment Offer Letter (Name variant: "Jane E. Doe", Offered Salary: $165,000)
    const offerText = `Official Employment Offer Letter from Apex AI Innovations LLC. Beneficiary: Jane E. Doe. Position: Senior AI Research Scientist. Base Salary: $165,000 annually. Duties include developing deep reinforcement models.`;
    const offerBuf = createReadablePdfBuffer(offerText);
    const offerForm = new FormData();
    offerForm.append('files', new Blob([offerBuf], { type: 'application/pdf' }), 'Employment_Offer_Letter.pdf');
    offerForm.append('title', 'Employment Offer Letter');
    offerForm.append('category', 'JOB_OFFER');

    const offerUpRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${applicantToken}` },
      body: offerForm,
    });
    const offerUpData = await offerUpRes.json();
    const offerDocId = offerUpData.documents?.[0]?._id;
    assert(offerUpRes.status === 201 && Boolean(offerDocId), 'Exhibit 2: Employment Offer Letter uploaded');

    // Exhibit 3: Master's Degree Diploma & Transcripts (Graduated: 2020)
    const degreeText = `University of California. Degree of Master of Science in Computer Science Conferred 2020. Beneficiary: Jane Doe. GPA 3.94.`;
    const degreeBuf = createReadablePdfBuffer(degreeText);
    const degreeForm = new FormData();
    degreeForm.append('files', new Blob([degreeBuf], { type: 'application/pdf' }), 'Master_Degree_Diploma.pdf');
    degreeForm.append('title', 'Master Degree Diploma');
    degreeForm.append('category', 'EDUCATION');

    const degreeUpRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${applicantToken}` },
      body: degreeForm,
    });
    const degreeUpData = await degreeUpRes.json();
    const degreeDocId = degreeUpData.documents?.[0]?._id;
    assert(degreeUpRes.status === 201 && Boolean(degreeDocId), 'Exhibit 3: University Diploma uploaded');

    // Exhibit 4: Prior Employment Verification Letter (Tenure: 2018 to 2021 - overlapping degree!)
    const expText = `Employment Experience Verification Letter. Quantum Dynamics Labs certifies that Jane Doe was employed as Machine Learning Researcher for the Period: 2018 to 2021.`;
    const expBuf = createReadablePdfBuffer(expText);
    const expForm = new FormData();
    expForm.append('files', new Blob([expBuf], { type: 'application/pdf' }), 'Experience_Letter_Quantum.pdf');
    expForm.append('title', 'Experience Letter Quantum Dynamics');
    expForm.append('category', 'EXPERIENCE');

    const expUpRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${applicantToken}` },
      body: expForm,
    });
    const expUpData = await expUpRes.json();
    const expDocId = expUpData.documents?.[0]?._id;
    assert(expUpRes.status === 201 && Boolean(expDocId), 'Exhibit 4: Prior Experience Letter uploaded');

    // Extract text for all 4 exhibits
    const docIds = [lcaDocId, offerDocId, degreeDocId, expDocId];
    for (const dId of docIds) {
      const extRes = await fetch(`${BACKEND_URL}/ai/documents/${dId}/extract`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${applicantToken}` },
      });
      assert(extRes.status === 200, `Text extracted successfully for document [${dId.slice(-6)}]`);
    }

    // -------------------------------------------------------------------------
    // 4. EXECUTE CROSS-DOCUMENT ANALYSIS ENGINE
    // -------------------------------------------------------------------------
    console.log('\n[4/8] Triggering Cross-Document Evidence Intelligence Analysis...');
    const analyzeRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/evidence/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const analyzeData = await analyzeRes.json();
    assert(analyzeRes.status === 200 && analyzeData.success, 'POST /applications/:id/evidence/analyze returns HTTP 200');
    assert(analyzeData.data?.analysis?.status === 'completed', 'Analysis status is "completed"');
    assert(analyzeData.data?.analysis?.summaryMetrics?.documentsAnalyzed === 4, '4 documents analyzed');
    assert(analyzeData.data?.findings?.length > 0, 'Discrepancy findings detected');
    assert(analyzeData.data?.gaps?.length > 0, 'Evidence gaps identified');
    assert(analyzeData.data?.mappings?.length >= 4, 'H-1B statutory criteria mappings generated');

    // Check specific deterministic findings
    const findingsList = analyzeData.data?.findings || [];
    const nameFinding = findingsList.find((f) => f.category === 'identity_discrepancy');
    assert(Boolean(nameFinding), 'Name variation finding detected ("Jane Doe" vs "Jane E. Doe")');
    if (nameFinding) {
      assert(nameFinding.severity === 'low', 'Minor middle name variation assigned review priority "low"');
      assert(nameFinding.reviewStatus === 'awaiting_review', 'Initial review status is "awaiting_review"');
    }

    const wageFinding = findingsList.find((f) => f.category === 'wage_inconsistency');
    assert(Boolean(wageFinding), 'Wage & LCA compliance evaluated');
    if (wageFinding) {
      assert(wageFinding.severity === 'informational', 'Salary ($165k) >= Prevailing Wage ($150k) flagged as informational compliant');
    }

    // -------------------------------------------------------------------------
    // 5. QUERY FINDINGS & SEVERITY FILTERING
    // -------------------------------------------------------------------------
    console.log('\n[5/8] Verifying Findings Queries & Severity Breakdown Filters...');
    const getFindingsRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/evidence/findings`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const getFindingsData = await getFindingsRes.json();
    assert(getFindingsRes.status === 200, 'GET /applications/:id/evidence/findings returns HTTP 200');
    assert(getFindingsData.totalCount === findingsList.length, 'Total findings count matches');
    assert(Boolean(getFindingsData.severityBreakdown), 'Severity breakdown object returned');

    // Filter by severity=low
    const filterRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/evidence/findings?severity=low`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const filterData = await filterRes.json();
    assert(filterRes.status === 200, 'Filtered query by severity=low returns HTTP 200');
    assert(filterData.findings.every((f) => f.severity === 'low'), 'All returned findings have severity "low"');

    // -------------------------------------------------------------------------
    // 6. HUMAN LEGAL REVIEW STATUS TRANSITIONS
    // -------------------------------------------------------------------------
    console.log('\n[6/8] Testing Human Verification & Audit Review Workflow...');
    const targetFinding = findingsList[0];
    const findingId = targetFinding._id;

    // 6a. Confirm Finding
    const reviewRes1 = await fetch(`${BACKEND_URL}/evidence/findings/${findingId}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`,
      },
      body: JSON.stringify({
        reviewStatus: 'confirmed',
        reviewNotes: 'Verified variation against passport bio page. Name affidavit required.',
      }),
    });
    const reviewData1 = await reviewRes1.json();
    assert(reviewRes1.status === 200 && reviewData1.finding?.reviewStatus === 'confirmed', 'Finding transitioned to "confirmed"');
    assert(reviewData1.finding?.reviewNotes.includes('passport bio page'), 'Review notes persisted in MongoDB');

    // 6b. Correct Finding
    const reviewRes2 = await fetch(`${BACKEND_URL}/evidence/findings/${findingId}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`,
      },
      body: JSON.stringify({
        reviewStatus: 'corrected',
        humanCorrection: 'Correct legal name: Dr. Jane Eleanor Doe',
        reviewNotes: 'Form I-94 matches full name with middle initial.',
      }),
    });
    const reviewData2 = await reviewRes2.json();
    assert(reviewRes2.status === 200 && reviewData2.finding?.reviewStatus === 'corrected', 'Finding transitioned to "corrected"');
    assert(reviewData2.finding?.humanCorrection === 'Correct legal name: Dr. Jane Eleanor Doe', 'Human correction persisted');

    // 6c. Dismiss Finding
    const reviewRes3 = await fetch(`${BACKEND_URL}/evidence/findings/${findingId}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`,
      },
      body: JSON.stringify({
        reviewStatus: 'dismissed',
        reviewNotes: 'Non-material variation between professional title and diploma.',
      }),
    });
    const reviewData3 = await reviewRes3.json();
    assert(reviewRes3.status === 200 && reviewData3.finding?.reviewStatus === 'dismissed', 'Finding transitioned to "dismissed"');

    // -------------------------------------------------------------------------
    // 7. EVIDENCE GAPS, STATUTORY MAPPINGS, ANALYSES & DOSSIER REPORT
    // -------------------------------------------------------------------------
    console.log('\n[7/8] Verifying Evidence Gaps, Criteria Mappings & Dossier Report...');

    // 7a. Evidence Gaps
    const gapsRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/evidence/gaps`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const gapsData = await gapsRes.json();
    assert(gapsRes.status === 200 && gapsData.gaps?.length > 0, 'GET /applications/:id/evidence/gaps returns statutory gaps');
    const firstGapId = gapsData.gaps[0]._id;

    // Waive a gap
    const waiveRes = await fetch(`${BACKEND_URL}/evidence/gaps/${firstGapId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`,
      },
      body: JSON.stringify({
        resolutionStatus: 'waived',
        waivedReason: 'Beneficiary has existing unexpired status on file.',
      }),
    });
    const waiveData = await waiveRes.json();
    assert(waiveRes.status === 200 && waiveData.gap?.resolutionStatus === 'waived', 'Evidence gap updated to "waived" with audit justification');

    // 7b. Criteria Mappings
    const mappingsRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/evidence/mappings`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const mappingsData = await mappingsRes.json();
    assert(mappingsRes.status === 200 && mappingsData.mappings?.length >= 4, 'GET /applications/:id/evidence/mappings returns H-1B prongs');
    assert(mappingsData.coveragePercentage > 0, `Criteria coverage calculated (${mappingsData.coveragePercentage}%)`);

    // 7c. Analysis History Runs
    const analysesRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/evidence/analyses`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const analysesData = await analysesRes.json();
    assert(analysesRes.status === 200 && analysesData.analyses?.length > 0, 'GET /applications/:id/evidence/analyses returns run history');
    assert(analysesData.analyses[0].rulesVersion.includes('deterministic-ai-hybrid'), 'Rules engine version logged');

    // 7d. Structured Dossier Summary Report
    const reportRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/evidence/report`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const reportData = await reportRes.json();
    assert(reportRes.status === 200 && Boolean(reportData.report?.reportId), 'GET /applications/:id/evidence/report returns HTTP 200');
    assert(reportData.report.application?.category === 'H-1B', 'Report application category is H-1B');
    assert(reportData.report.documents?.length === 4, 'Report lists all 4 analyzed exhibits');
    assert(reportData.report.verifiedFacts?.length > 0, 'Report includes verified facts');
    assert(reportData.report.findings?.length > 0, 'Report includes discrepancy audit trail');
    assert(reportData.report.statutoryCriteria?.length >= 4, 'Report includes statutory visa criteria breakdown');

    // -------------------------------------------------------------------------
    // 8. ZERO-TRUST CROSS-TENANT IDOR ACCESS DEFENSES
    // -------------------------------------------------------------------------
    console.log('\n[8/8] Verifying Zero-Trust Cross-Tenant IDOR Security Controls...');

    // Outsider cannot run analysis on applicant's petition
    const idorAnalyze = await fetch(`${BACKEND_URL}/applications/${applicationId}/evidence/analyze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    assert(idorAnalyze.status === 403, 'Cross-user IDOR analysis execution rejected (HTTP 403)');

    // Outsider cannot read applicant's findings
    const idorFindings = await fetch(`${BACKEND_URL}/applications/${applicationId}/evidence/findings`, {
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    assert(idorFindings.status === 403, 'Cross-user IDOR findings retrieval rejected (HTTP 403)');

    // Outsider cannot review applicant's findings
    const idorReview = await fetch(`${BACKEND_URL}/evidence/findings/${findingId}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${outsiderToken}`,
      },
      body: JSON.stringify({ reviewStatus: 'dismissed' }),
    });
    assert(idorReview.status === 403, 'Cross-user IDOR finding review action rejected (HTTP 403)');

    // Outsider cannot access applicant's gaps
    const idorGaps = await fetch(`${BACKEND_URL}/applications/${applicationId}/evidence/gaps`, {
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    assert(idorGaps.status === 403, 'Cross-user IDOR evidence gaps query rejected (HTTP 403)');

    // Outsider cannot generate applicant's dossier report
    const idorReport = await fetch(`${BACKEND_URL}/applications/${applicationId}/evidence/report`, {
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    assert(idorReport.status === 403, 'Cross-user IDOR dossier report generation rejected (HTTP 403)');

    console.log('\n========================================================================');
    console.log(`  PHASE 7 TEST RESULTS: ${passed} PASSED / ${failed} FAILED (${Math.round((passed / (passed + failed)) * 100)}%)`);
    console.log('========================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Fatal Phase 7 Test Suite Error:', error);
    process.exit(1);
  }
}

runPhase7TestSuite();
