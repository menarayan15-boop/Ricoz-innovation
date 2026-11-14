// backend/scripts/test-phase6-complete.mjs
// Comprehensive End-to-End Test Suite for Phase 6: AI Assistant, OCR & Intelligent Document Analysis

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const BACKEND_URL = 'http://localhost:5001/api/v1';

// Binary PDF Generator with Valid Embedded Text Stream
function createReadablePdfBuffer(text) {
  const cleanText = text.replace(/[\(\)\\\r\n]/g, ' ');
  const streamContent = `BT /F1 12 Tf 72 712 Td (${cleanText}) Tj ET\n`;
  const streamLen = streamContent.length;
  const body =
    '%PDF-1.4\n' +
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj\n' +
    '4 0 obj<</Length ' + streamLen + '>>stream\n' +
    streamContent +
    'endstream\nendobj\n' +
    'xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000216 00000 n\n' +
    'trailer<</Size 5/Root 1 0 R>>\nstartxref\n350\n%%EOF';
  return Buffer.from(body);
}

async function runPhase6Tests() {
  console.log('========================================================================');
  console.log('  PHASE 6: AI ASSISTANT, OCR & INTELLIGENT ANALYSIS COMPLETE TEST SUITE ');
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

  // Connect Mongoose in test runner for test fixture setup & assertion audits
  await mongoose.connect(process.env.MONGODB_URI);

  try {
    const timestamp = Date.now();
    const applicantEmail = `p6_applicant_${timestamp}@test.com`;
    const attorneyEmail = `p6_attorney_${timestamp}@test.com`;
    const outsiderEmail = `p6_outsider_${timestamp}@test.com`;
    const password = 'TestSecurePassword!2026';

    // -------------------------------------------------------------------------
    // 1. DIRECT MODULE & EXTRACTION UNIT CHECKS
    // -------------------------------------------------------------------------
    console.log('[1/10] Verifying Extraction & OCR Engines...');

    // 1.1 Test Native PDF Parsing
    const sampleLcaText = 'Petitioner: Apex Tech Solutions LLC. Beneficiary: Dr. Jane Doe. Position: Senior AI Research Scientist. SOC Code: 15-1221. Offered Wage: $165,000 per year. Stanford University Ph.D. in Computer Science.';
    const pdfBuf = createReadablePdfBuffer(sampleLcaText);
    assert(pdfBuf.length > 100, 'Valid PDF binary buffer generated');

    const pdfModule = await import('pdf-parse');
    assert(Boolean(pdfModule.PDFParse || pdfModule.default), 'pdf-parse library is installed and importable');

    if (pdfModule.PDFParse) {
      const parser = new pdfModule.PDFParse({ data: pdfBuf });
      await parser.load();
      const parsedText = await parser.getText();
      assert(parsedText.text.includes('Apex Tech Solutions'), 'Native PDF text extraction successfully extracted text layer');
      assert(parsedText.total >= 1, 'PDF page count correctly resolved');
      await parser.destroy();
    }

    // 1.2 Test Tesseract.js OCR Engine Availability
    const tesseract = await import('tesseract.js');
    assert(typeof tesseract.createWorker === 'function', 'Tesseract.js OCR engine is installed and exportable');

    // 1.3 Test Mammoth DOCX Engine Availability
    const mammoth = await import('mammoth');
    assert(typeof mammoth.extractRawText === 'function', 'Mammoth DOCX extraction engine is installed and exportable');

    // -------------------------------------------------------------------------
    // 2. BACKEND HEALTH & DB CONNECTIVITY
    // -------------------------------------------------------------------------
    console.log('\n[2/10] Verifying Backend & MongoDB Health...');

    const healthRes = await fetch(`${BACKEND_URL}/health`);
    assert(healthRes.status === 200, 'Backend API health check responds HTTP 200');

    const dbHealthRes = await fetch(`${BACKEND_URL}/health/db`);
    const dbHealthData = await dbHealthRes.json();
    assert(dbHealthRes.status === 200 && dbHealthData.status === 'connected', 'MongoDB Atlas database is connected');

    // -------------------------------------------------------------------------
    // 3. USER SETUP & VISA APPLICATION CREATION
    // -------------------------------------------------------------------------
    console.log('\n[3/10] Registering Test Users & Creating Petition Application...');

    // Register Applicant
    const regApp = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Dr. Jane Doe', email: applicantEmail, password, role: 'applicant' }),
    });
    const appData = await regApp.json();
    assert(regApp.status === 201, 'Applicant account registered successfully');
    const applicantToken = appData.token;

    // Register Attorney
    const regAtt = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Attorney Legal Counsel', email: attorneyEmail, password, role: 'attorney' }),
    });
    const attData = await regAtt.json();
    assert(regAtt.status === 201, 'Attorney account registered successfully');
    const attorneyToken = attData.token;

    // Register Outsider
    const regOut = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Unrelated Outsider', email: outsiderEmail, password, role: 'applicant' }),
    });
    const outData = await regOut.json();
    assert(regOut.status === 201, 'Outsider account registered successfully');
    const outsiderToken = outData.token;

    // Create Visa Application (H-1B Specialty Occupation)
    const createVisa = await fetch(`${BACKEND_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`,
      },
      body: JSON.stringify({
        visaCategory: 'H-1B',
        title: 'H-1B Specialty Occupation Petition: Senior AI Research Scientist',
        applicantDetails: {
          fullName: 'Dr. Jane Doe',
          email: applicantEmail,
          nationality: 'Canadian',
          dateOfBirth: '1992-05-14',
        },
      }),
    });
    const visaData = await createVisa.json();
    assert(createVisa.status === 201, 'H-1B Visa Application created successfully');
    const applicationId = visaData.application?._id || visaData.application?.id;
    assert(Boolean(applicationId), 'Application ID returned');

    // -------------------------------------------------------------------------
    // 4. UPLOAD EVIDENTIARY EXHIBITS
    // -------------------------------------------------------------------------
    console.log('\n[4/10] Uploading Real Evidentiary Exhibits to Petition Dossier...');

    // Doc 1: Certified LCA
    const lcaContent = 'Certified Labor Condition Application ETA-9035. Employer: Apex Tech Solutions LLC. Job Title: Senior AI Research Scientist. Offered Wage Rate: $165,000 per year. Prevailing Wage: $145,000 per year. SOC Code: 15-1221. Location: San Jose, CA.';
    const lcaPdf = createReadablePdfBuffer(lcaContent);
    const lcaBlob = new Blob([lcaPdf], { type: 'application/pdf' });
    const lcaFormData = new FormData();
    lcaFormData.append('files', lcaBlob, 'LCA_Form_ETA_9035.pdf');
    lcaFormData.append('title', 'Certified Labor Condition Application ETA-9035');
    lcaFormData.append('category', 'EMPLOYMENT_RECORDS');

    const uploadLcaRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${applicantToken}` },
      body: lcaFormData,
    });
    const uploadLcaData = await uploadLcaRes.json();
    assert(uploadLcaRes.status === 201, 'LCA Document uploaded successfully');
    const lcaDocId = uploadLcaData.documents?.[0]?._id;
    assert(Boolean(lcaDocId), 'LCA Document ID generated');

    // Doc 2: Stanford Doctorate Diploma
    const diplomaContent = 'Stanford University Board of Trustees hereby confers upon Jane Marie Doe the Degree of Doctor of Philosophy in Computer Science. Conferred June 12, 2022. Doctoral Dissertation: Scalable Deep Learning Architectures.';
    const diplomaPdf = createReadablePdfBuffer(diplomaContent);
    const diplomaBlob = new Blob([diplomaPdf], { type: 'application/pdf' });
    const diplomaFormData = new FormData();
    diplomaFormData.append('files', diplomaBlob, 'Stanford_Doctorate_Diploma.pdf');
    diplomaFormData.append('title', 'Stanford University Ph.D. Diploma');
    diplomaFormData.append('category', 'EDUCATION');

    const uploadDipRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${applicantToken}` },
      body: diplomaFormData,
    });
    const uploadDipData = await uploadDipRes.json();
    assert(uploadDipRes.status === 201, 'Stanford Diploma uploaded successfully');
    const diplomaDocId = uploadDipData.documents?.[0]?._id;
    assert(Boolean(diplomaDocId), 'Stanford Diploma Document ID generated');

    // -------------------------------------------------------------------------
    // 5. DOCUMENT TEXT EXTRACTION & OCR API ENDPOINTS
    // -------------------------------------------------------------------------
    console.log('\n[5/10] Testing Document Text Extraction & OCR API (POST /ai/documents/:id/extract)...');

    const extractLcaRes = await fetch(`${BACKEND_URL}/ai/documents/${lcaDocId}/extract`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const extractLcaData = await extractLcaRes.json();
    assert(extractLcaRes.status === 200, 'POST /ai/documents/:id/extract returns HTTP 200');
    assert(extractLcaData.extraction?.method === 'native_text', 'Extraction method identified as native_text');
    assert(extractLcaData.extraction?.wordCount > 10, 'Document word count extracted accurately (>10 words)');
    assert(extractLcaData.extraction?.text.includes('Apex Tech Solutions'), 'Extracted text layer matches uploaded LCA document');

    // Test GET /ai/documents/:id/extraction
    const getExtRes = await fetch(`${BACKEND_URL}/ai/documents/${lcaDocId}/extraction`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const getExtData = await getExtRes.json();
    assert(getExtRes.status === 200, 'GET /ai/documents/:id/extraction returns HTTP 200');
    assert(getExtData.extraction?.documentId === lcaDocId, 'Retrieved extraction matches document ID');

    // -------------------------------------------------------------------------
    // 6. HUMAN-IN-THE-LOOP FIELD VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n[6/10] Testing Human-in-the-Loop Field Verification & Corrections...');

    const { ExtractedField } = await import('../dist/models/extraction.model.js');
    const testField = await ExtractedField.create({
      documentId: lcaDocId,
      applicationId,
      category: 'employment',
      fieldName: 'offeredSalary',
      fieldValue: '$165,000',
      confidence: 0.98,
      verificationStatus: 'unverified',
    });
    assert(Boolean(testField._id), 'Test extracted field created in MongoDB');

    // Review field: Confirm
    const confirmRes = await fetch(`${BACKEND_URL}/ai/fields/${testField._id}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`,
      },
      body: JSON.stringify({ status: 'confirmed' }),
    });
    const confirmData = await confirmRes.json();
    assert(confirmRes.status === 200, 'PATCH /ai/fields/:id/review to confirm returns HTTP 200');
    assert(confirmData.field?.verificationStatus === 'confirmed', 'Field verification status updated to confirmed');
    assert(Boolean(confirmData.field?.reviewedAt), 'Field review timestamp recorded');

    // Review field: Correct with human correction
    const correctRes = await fetch(`${BACKEND_URL}/ai/fields/${testField._id}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`,
      },
      body: JSON.stringify({ status: 'corrected', humanCorrection: '$165,000 USD Annual' }),
    });
    const correctData = await correctRes.json();
    assert(correctRes.status === 200, 'PATCH /ai/fields/:id/review to correct returns HTTP 200');
    assert(correctData.field?.verificationStatus === 'corrected', 'Field verification status updated to corrected');
    assert(correctData.field?.humanCorrection === '$165,000 USD Annual', 'Human correction value persisted');

    // -------------------------------------------------------------------------
    // 7. AI DOCUMENT SUMMARIZATION
    // -------------------------------------------------------------------------
    console.log('\n[7/10] Testing AI Document Summarization (POST /ai/documents/:id/summarize)...');

    const sumRes = await fetch(`${BACKEND_URL}/ai/documents/${lcaDocId}/summarize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const sumData = await sumRes.json();

    if (sumRes.status === 200) {
      assert(true, 'POST /ai/documents/:id/summarize completed successfully with live OpenAI credits');
      assert(typeof sumData.summary === 'string' && sumData.summary.length > 20, 'Document summary generated');
      assert(Array.isArray(sumData.keyPoints), 'Key evidentiary points array returned');
    } else {
      assert(sumRes.status === 503, 'POST /ai/documents/:id/summarize returned HTTP 503 Service Unavailable when quota is exhausted');
      assert(sumData.message.includes('Quota') || sumData.message.includes('credits'), `Actionable error message returned: "${sumData.message.slice(0, 80)}..."`);
    }

    // -------------------------------------------------------------------------
    // 8. CONVERSATIONAL AI CHAT (RAG WITH CITATIONS) & CONVERSATION LIFECYCLE
    // -------------------------------------------------------------------------
    console.log('\n[8/10] Testing Conversational AI Chat & RAG Grounding (POST /ai/chat)...');

    const chatRes = await fetch(`${BACKEND_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`,
      },
      body: JSON.stringify({
        applicationId,
        message: 'What is the offered salary and job title for the beneficiary according to the uploaded LCA?',
      }),
    });
    const chatData = await chatRes.json();

    if (chatRes.status === 200) {
      assert(true, 'POST /ai/chat completed successfully with live OpenAI completions');
      assert(Boolean(chatData.conversationId), 'Active conversationId generated and returned');
      assert(Boolean(chatData.message?.content), 'AI Assistant generated grounded legal response');
      assert(Array.isArray(chatData.message?.citations), 'AI Citations array returned');
    } else {
      assert(chatRes.status === 503, 'POST /ai/chat returns HTTP 503 Service Unavailable when OpenAI quota is exhausted');
      assert(chatData.message.includes('Quota') || chatData.message.includes('credits'), `Explicit actionable diagnostic returned: "${chatData.message.slice(0, 80)}..."`);
    }

    // Test Conversation CRUD with deterministic DB record
    const { AIConversation, AIMessage } = await import('../dist/models/ai-conversation.model.js');
    const testConvId = 'test-conv-' + timestamp;
    const testConv = await AIConversation.create({
      conversationId: testConvId,
      userId: appData.user._id,
      applicationId,
      title: 'Legal Inquiry: H-1B Specialty Occupation Requirements',
    });
    await AIMessage.create({
      conversationId: testConvId,
      userId: appData.user._id,
      role: 'user',
      content: 'Does a Ph.D. in Computer Science qualify for SOC 15-1221?',
    });
    assert(Boolean(testConv._id), 'Test AI conversation persisted in MongoDB');

    // List Conversations
    const listConvRes = await fetch(`${BACKEND_URL}/ai/conversations`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const listConvData = await listConvRes.json();
    assert(listConvRes.status === 200, 'GET /ai/conversations returns HTTP 200');
    assert(listConvData.count >= 1, 'Conversations list count >= 1');

    // Get Conversation By ID
    const getConvRes = await fetch(`${BACKEND_URL}/ai/conversations/${testConvId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const getConvData = await getConvRes.json();
    assert(getConvRes.status === 200, 'GET /ai/conversations/:id returns HTTP 200');
    assert(getConvData.messages?.length >= 1, 'Conversation message history returned');

    // Delete Conversation
    const delConvRes = await fetch(`${BACKEND_URL}/ai/conversations/${testConvId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    assert(delConvRes.status === 200, 'DELETE /ai/conversations/:id returns HTTP 200');

    // Verify Deletion
    const verifyDel = await fetch(`${BACKEND_URL}/ai/conversations/${testConvId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    assert(verifyDel.status === 404, 'Deleted conversation returns HTTP 404');

    // -------------------------------------------------------------------------
    // 9. EVIDENCE INCONSISTENCY & DISCREPANCY AUDIT
    // -------------------------------------------------------------------------
    console.log('\n[9/10] Testing Evidence Inconsistency & Discrepancy Analysis...');

    const auditRes = await fetch(`${BACKEND_URL}/ai/analyze-evidence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`,
      },
      body: JSON.stringify({ applicationId }),
    });
    const auditData = await auditRes.json();

    if (auditRes.status === 200) {
      assert(true, 'POST /ai/analyze-evidence completed successfully');
      assert(Array.isArray(auditData.findings), 'Discrepancy findings array returned');
    } else {
      assert(auditRes.status === 503, 'POST /ai/analyze-evidence returns HTTP 503 when AI quota exhausted');
    }

    // Deterministic Finding Review Test
    const { EvidenceFinding } = await import('../dist/models/extraction.model.js');
    const testFinding = await EvidenceFinding.create({
      applicationId,
      findingType: 'inconsistent_name',
      title: 'Name Discrepancy: Jane Doe vs Jane Marie Doe',
      explanation: 'Passport declares Jane Doe whereas Diploma declares Jane Marie Doe.',
      severity: 'medium',
      status: 'detected',
    });
    assert(Boolean(testFinding._id), 'Test EvidenceFinding created in MongoDB');

    // Get Findings
    const getFindingsRes = await fetch(`${BACKEND_URL}/ai/findings/${applicationId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const getFindingsData = await getFindingsRes.json();
    assert(getFindingsRes.status === 200, 'GET /ai/findings/:applicationId returns HTTP 200');
    assert(getFindingsData.count >= 1, 'Findings retrieved successfully');

    // Review Finding: Acknowledge
    const reviewFindingRes = await fetch(`${BACKEND_URL}/ai/findings/${testFinding._id}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`,
      },
      body: JSON.stringify({ status: 'acknowledged' }),
    });
    const reviewFindingData = await reviewFindingRes.json();
    assert(reviewFindingRes.status === 200, 'PATCH /ai/findings/:id/review returns HTTP 200');
    assert(reviewFindingData.finding?.status === 'acknowledged', 'Finding status updated to acknowledged');
    assert(Boolean(reviewFindingData.finding?.resolvedAt), 'Finding resolution timestamp recorded');

    // -------------------------------------------------------------------------
    // 10. MULTI-TENANT ISOLATION, IDOR DEFENSE & INPUT VALIDATION
    // -------------------------------------------------------------------------
    console.log('\n[10/10] Testing Multi-Tenant Isolation, IDOR Defense & Input Validation...');

    // 10.1 Outsider tries to extract Applicant's document
    const idorExtract = await fetch(`${BACKEND_URL}/ai/documents/${lcaDocId}/extract`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    assert(idorExtract.status === 403, 'Cross-tenant IDOR: Outsider cannot extract Applicant document (HTTP 403)');

    // 10.2 Outsider tries to view Applicant's document extraction
    const idorGetExt = await fetch(`${BACKEND_URL}/ai/documents/${lcaDocId}/extraction`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    assert(idorGetExt.status === 403, 'Cross-tenant IDOR: Outsider cannot view Applicant document extraction (HTTP 403)');

    // 10.3 Outsider tries to review Applicant's extracted field
    const idorReviewField = await fetch(`${BACKEND_URL}/ai/fields/${testField._id}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${outsiderToken}`,
      },
      body: JSON.stringify({ status: 'confirmed' }),
    });
    assert(idorReviewField.status === 403, 'Cross-tenant IDOR: Outsider cannot review Applicant field (HTTP 403)');

    // 10.4 Outsider tries to trigger Evidence Inconsistency Analysis on Applicant's case
    const idorAudit = await fetch(`${BACKEND_URL}/ai/analyze-evidence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${outsiderToken}`,
      },
      body: JSON.stringify({ applicationId }),
    });
    assert(idorAudit.status === 403, 'Cross-tenant IDOR: Outsider cannot trigger analysis on Applicant case (HTTP 403)');

    // 10.5 Outsider tries to view Applicant's case findings
    const idorGetFindings = await fetch(`${BACKEND_URL}/ai/findings/${applicationId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    assert(idorGetFindings.status === 403, 'Cross-tenant IDOR: Outsider cannot view Applicant findings (HTTP 403)');

    // 10.6 Input Validation: Empty message to AI Chat
    const emptyMsgRes = await fetch(`${BACKEND_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`,
      },
      body: JSON.stringify({ message: '   ' }),
    });
    assert(emptyMsgRes.status === 400, 'Input Validation: Empty chat message returns HTTP 400');

    // 10.7 Input Validation: Invalid document ID to extraction
    const invalidDocRes = await fetch(`${BACKEND_URL}/ai/documents/invalid-id-format/extract`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    assert(invalidDocRes.status === 400, 'Input Validation: Malformed document ID returns HTTP 400');

    // 10.8 Input Validation: Invalid field review status
    const invalidStatusRes = await fetch(`${BACKEND_URL}/ai/fields/${testField._id}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${applicantToken}`,
      },
      body: JSON.stringify({ status: 'malicious_status' }),
    });
    assert(invalidStatusRes.status === 400, 'Input Validation: Invalid review status returns HTTP 400');

    console.log('\n========================================================================');
    console.log(`  PHASE 6 TEST SUITE RESULTS: ${passed} PASSED / ${failed} FAILED (${Math.round((passed / (passed + failed)) * 100)}%)`);
    console.log('========================================================================\n');

    await mongoose.disconnect();

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal Test Runner Error:', err);
    try {
      await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
  }
}

runPhase6Tests();
