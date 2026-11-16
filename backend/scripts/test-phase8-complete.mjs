// backend/scripts/test-phase8-complete.mjs
// Authoritative End-to-End Test Suite for Phase 8:
// AI-Powered Dossier Automation, Case Readiness Scoring, Attorney Review & Bates PDF Generation

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import dns from 'dns';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

import { createApp } from '../dist/app.js';
import { connectDatabase, disconnectDatabase } from '../dist/config/database.js';

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

async function runPhase8TestSuite() {
  console.log('========================================================================');
  console.log('  PHASE 8 AUTHORITATIVE END-TO-END TEST SUITE                          ');
  console.log('  AI Dossier Automation, Readiness Scoring, Attorney Review & Bates PDF ');
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

  let server;

  try {
    console.log('Connecting to persistent MongoDB Atlas...');
    await connectDatabase();
    console.log('Initializing Express application server...');
    const app = createApp();

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        resolve();
      });
    });

    const port = server.address().port;
    const BACKEND_URL = `http://127.0.0.1:${port}/api/v1`;
    console.log(`Self-hosted test API active at: ${BACKEND_URL}\n`);

    const timestamp = Date.now();
    const applicantEmail = `p8_applicant_${timestamp}@test.com`;
    const attorneyEmail = `p8_attorney_${timestamp}@test.com`;
    const unauthorizedEmail = `p8_stranger_${timestamp}@test.com`;
    const testPassword = 'Password123!Secure';

    // STEP 1: Registration of Applicant, Attorney, and Unauthorized User
    console.log('[1/10] Registering Test Accounts (Applicant, Attorney, Unauthorized)...');

    // Register Applicant
    const regAppRes = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Jane Doe, Ph.D.',
        email: applicantEmail,
        password: testPassword,
        role: 'applicant',
      }),
    });
    const regAppData = await regAppRes.json();
    assert(regAppRes.status === 201 && regAppData.token, 'Applicant registration succeeded');
    const applicantToken = regAppData.token;

    // Register Attorney
    const regAttRes = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Counsel Marcus Vance, Esq.',
        email: attorneyEmail,
        password: testPassword,
        role: 'attorney',
      }),
    });
    const regAttData = await regAttRes.json();
    assert(regAttRes.status === 201 && regAttData.token, 'Attorney registration succeeded');
    const attorneyToken = regAttData.token;

    // Register Unauthorized User
    const regUnauthRes = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Eve Unauthorized',
        email: unauthorizedEmail,
        password: testPassword,
        role: 'applicant',
      }),
    });
    const regUnauthData = await regUnauthRes.json();
    assert(regUnauthRes.status === 201 && regUnauthData.token, 'Unauthorized user registration succeeded');
    const unauthorizedToken = regUnauthData.token;

    // STEP 2: Create H-1B / EB-2 Application
    console.log('\n[2/10] Creating Formally Qualified Immigrant Application...');
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
    assert(appRes.status === 201 && Boolean(applicationId), 'Application created successfully');

    // STEP 3: Upload Evidentiary Exhibits
    console.log('\n[3/10] Uploading Grounded Evidentiary Exhibits...');
    const uploadDoc = async (category, title, filename, text) => {
      const pdfBuf = createReadablePdfBuffer(text);
      const form = new FormData();
      form.append('files', new Blob([pdfBuf], { type: 'application/pdf' }), filename);
      form.append('title', title);
      form.append('category', category);

      const upRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${applicantToken}` },
        body: form,
      });
      const data = await upRes.json();
      return data.documents?.[0]?._id;
    };

    const doc1Id = await uploadDoc(
      'EDUCATION',
      'PhD Degree Diploma',
      'PhD_Diploma_Jane_Doe.pdf',
      'Stanford University confers upon Jane Doe the Degree of Doctor of Philosophy in Computer Science in June 2018.'
    );
    assert(Boolean(doc1Id), 'Exhibit A (PhD Diploma) uploaded');

    const doc2Id = await uploadDoc(
      'EXPERIENCE',
      'Prior Employment Verification Letter',
      'Prior_Employment_Verification_Letter.pdf',
      'DeepLearning Research Group confirms Jane Doe was employed as Staff Research Scientist from August 2018 to December 2022.'
    );
    assert(Boolean(doc2Id), 'Exhibit B (Employment Verification Letter) uploaded');

    const doc3Id = await uploadDoc(
      'JOB_OFFER',
      'Employment Offer Letter',
      'Employment_Offer_Letter.pdf',
      'Apex AI Innovations LLC officially offers Dr. Jane Doe the position of Senior AI Research Scientist at offered wage rate of $185,000 per annum.'
    );
    assert(Boolean(doc3Id), 'Exhibit C (Employment Offer Letter) uploaded');

    // Extract text for all 3 exhibits
    for (const docId of [doc1Id, doc2Id, doc3Id]) {
      await fetch(`${BACKEND_URL}/documents/${docId}/extract`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${applicantToken}` },
      });
    }

    // STEP 4: Run Evidence Intelligence Analysis (Phase 7 prerequisite)
    console.log('\n[4/10] Running Evidence Intelligence Analysis to Seed Findings...');
    const analyzeRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/evidence/analyze`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${applicantToken}`,
        'Content-Type': 'application/json',
      },
    });
    const analyzeData = await analyzeRes.json();
    assert(analyzeRes.status === 200 && analyzeData.success, 'Evidence Intelligence analysis completed');

    // STEP 5: Generate Dossier Draft
    console.log('\n[5/10] Generating Initial Dossier Draft with Bates Stamping...');
    const genDossierRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/dossier/generate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${applicantToken}`,
        'Content-Type': 'application/json',
      },
    });
    const genDossierData = await genDossierRes.json();
    assert(genDossierRes.status === 201 && genDossierData.success, 'Dossier draft generated successfully');
    assert(genDossierData.dossier?.version === 1, 'Dossier version is 1');
    assert(genDossierData.dossier?.status === 'draft', 'Dossier status is "draft"');
    assert(
      genDossierData.dossier?.batesNumbering?.prefix?.startsWith('H1B-EX'),
      `Bates prefix correctly assigned (${genDossierData.dossier?.batesNumbering?.prefix})`
    );
    assert(
      genDossierData.dossier?.sections?.length >= 5,
      `Dossier contains structured filing sections (${genDossierData.dossier?.sections?.length} sections)`
    );
    assert(
      genDossierData.dossier?.readinessScore?.overallScore !== undefined,
      `Initial readiness score calculated (${genDossierData.dossier?.readinessScore?.overallScore} / 100)`
    );
    const dossierId = genDossierData.dossier._id;

    // STEP 6: Verify Case Readiness Score Breakdown
    console.log('\n[6/10] Auditing Case Readiness Score Breakdown & Transparency...');
    const readRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/dossier/readiness`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${applicantToken}`,
      },
    });
    const readData = await readRes.json();
    assert(readRes.status === 200 && readData.success, 'Readiness score endpoint responded successfully');
    const score = readData.readinessScore || readData.score;
    assert(
      score && score.overallScore >= 0 && score.overallScore <= 100,
      `Overall score within valid 0-100 range: ${score?.overallScore}`
    );
    assert(score.breakdown?.requiredDocsAvailable !== undefined, 'Required docs breakdown component present');
    assert(score.breakdown?.evidenceVerification !== undefined, 'Evidence verification component present');
    assert(score.breakdown?.missingEvidence !== undefined, 'Missing evidence component present');
    assert(score.breakdown?.unresolvedInconsistencies !== undefined, 'Unresolved inconsistencies component present');
    assert(score.breakdown?.attorneyReview !== undefined, 'Attorney review component present');
    const explanation = score.formulaExplanation || score.explanation;
    assert(typeof explanation === 'string' && explanation.length > 20, 'Transparent score explanation included');

    // STEP 7: Edit AI Narrative (Human in the Loop)
    console.log('\n[7/10] Human-in-the-Loop Narrative Revision & Audit Trail...');
    const updatedOverview =
      'REVISED LEGAL NARRATIVE: Dr. Jane Doe is a distinguished researcher in trustworthy AI, possessing an earned Stanford Ph.D. and 5+ years of demonstrable breakthroughs in scalable alignment.';
    const editRes = await fetch(`${BACKEND_URL}/dossier/${dossierId}/summary`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${applicantToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        overview: updatedOverview,
      }),
    });
    const editData = await editRes.json();
    assert(editRes.status === 200 && editData.success, 'Human narrative edit succeeded');
    assert(editData.dossier?.aiCaseSummary?.isEditedByHuman === true, 'isEditedByHuman flag set to true');
    assert(
      editData.dossier?.aiCaseSummary?.overview === updatedOverview,
      'Updated narrative persisted in MongoDB'
    );
    assert(
      editData.dossier?.auditHistory?.some((log) => log.action === 'ai_summary_edited'),
      'Audit log recorded ai_summary_edited event'
    );

    // STEP 8: Security & Cross-Tenant RBAC Protection (IDOR)
    console.log('\n[8/10] Verifying Security, IDOR Protection & RBAC Enforcement...');
    // Unauthorized applicant attempting to read dossier
    const unauthReadRes = await fetch(`${BACKEND_URL}/dossier/${dossierId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${unauthorizedToken}` },
    });
    assert(unauthReadRes.status === 403, 'Cross-tenant dossier retrieval forbidden (HTTP 403)');

    // Applicant attempting to perform attorney review adjudication
    const appReviewRes = await fetch(`${BACKEND_URL}/dossier/${dossierId}/review`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${applicantToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        decision: 'approved',
        reviewNotes: 'Trying to self-approve as applicant',
      }),
    });
    assert(appReviewRes.status === 403, 'Applicant denied attorney adjudication privilege (HTTP 403)');

    // STEP 9: Attorney Review Adjudication
    console.log('\n[9/10] Attorney Review Adjudication (Changes Requested -> Formal Approval)...');
    // Sub-step A: Request Changes
    const reqChangesRes = await fetch(`${BACKEND_URL}/dossier/${dossierId}/review`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${attorneyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        decision: 'changes_requested',
        reviewNotes: 'Please confirm official Stanford registrar translation seal on Exhibit A.',
        requestedEvidence: ['Registrar Certification Seal'],
      }),
    });
    const reqChangesData = await reqChangesRes.json();
    assert(reqChangesRes.status === 200 && reqChangesData.dossier?.status === 'changes_requested', 'Attorney successfully requested changes');

    // Sub-step B: Formal Approval
    const approveRes = await fetch(`${BACKEND_URL}/dossier/${dossierId}/review`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${attorneyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        decision: 'approved',
        reviewNotes: 'All Dhanasar prongs verified and statutory exhibits conform to USCIS standards.',
      }),
    });
    const approveData = await approveRes.json();
    assert(approveRes.status === 200 && approveData.dossier?.status === 'approved', 'Attorney approved dossier draft');
    assert(
      approveData.dossier?.readinessScore?.breakdown?.attorneyReview?.satisfied === true,
      'Score recalculated with attorney review satisfied (+20 pts)'
    );

    // Finalize Dossier
    const finalizeRes = await fetch(`${BACKEND_URL}/dossier/${dossierId}/finalize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${attorneyToken}`,
      },
    });
    const finalizeData = await finalizeRes.json();
    assert(finalizeRes.status === 200 && finalizeData.dossier?.status === 'finalized', 'Dossier successfully locked and finalized');

    // STEP 10: Bates-Numbered PDF Compilation & Export
    console.log('\n[10/10] Generating Publication-Ready Bates-Numbered PDF Dossier...');
    const pdfRes = await fetch(`${BACKEND_URL}/dossier/${dossierId}/pdf`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${applicantToken}`,
      },
    });
    assert(pdfRes.status === 200, `PDF endpoint returned HTTP 200 (status: ${pdfRes.status})`);
    assert(
      pdfRes.headers.get('content-type')?.includes('application/pdf'),
      `Content-Type is application/pdf (${pdfRes.headers.get('content-type')})`
    );

    const pdfArrayBuffer = await pdfRes.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfArrayBuffer);
    assert(pdfBuffer.length > 1000, `PDF generated with substantial content (${pdfBuffer.length} bytes)`);

    const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
    assert(pdfHeader === '%PDF-', `Valid PDF binary magic bytes verified: ${pdfHeader}`);

    console.log('\n========================================================================');
    console.log(`  PHASE 8 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed unexpectedly:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDatabase().catch(() => {});
  }
}

runPhase8TestSuite();
