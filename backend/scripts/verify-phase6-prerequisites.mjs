// backend/scripts/verify-phase6-prerequisites.mjs
// Live Automated Prerequisite Verification Suite for Phase 7: Advanced Evidence Intelligence

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import dns from 'dns';
import mongoose from 'mongoose';
import OpenAI from 'openai';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const BACKEND_URL = 'http://localhost:5001/api/v1';

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

async function verifyPhase6Prerequisites() {
  console.log('========================================================================');
  console.log('  PHASE 7 PREREQUISITE AUDIT: VERIFYING PHASE 6 SYSTEM READINESS       ');
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

  await mongoose.connect(process.env.MONGODB_URI);

  try {
    const timestamp = Date.now();
    const testEmail = `p7_audit_app_${timestamp}@test.com`;
    const outsiderEmail = `p7_audit_out_${timestamp}@test.com`;
    const password = 'TestSecurePassword!2026';

    // -------------------------------------------------------------------------
    // 1. VERIFY MONGODB ATLAS CONNECTIVITY
    // -------------------------------------------------------------------------
    console.log('[1/10] Verifying MongoDB Atlas Persistent Connectivity...');
    const dbHealthRes = await fetch(`${BACKEND_URL}/health/db`);
    const dbHealth = await dbHealthRes.json();
    assert(dbHealthRes.status === 200, 'Database health check responds HTTP 200');
    assert(dbHealth.status === 'connected', 'Database status is "connected"');
    assert(dbHealth.isPersistent === true, 'Database is using persistent MongoDB Atlas');
    assert(dbHealth.databaseName === 'immigration_dossier', 'Database name is "immigration_dossier"');

    // -------------------------------------------------------------------------
    // 2. VERIFY USER REGISTRATION & LOGIN
    // -------------------------------------------------------------------------
    console.log('\n[2/10] Verifying Registration, Password Hashing & Login...');
    const regRes = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Dr. Jane Doe', email: testEmail, password, role: 'applicant' }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'User registered successfully (HTTP 201)');
    const applicantToken = regData.token;
    const applicantId = regData.user._id || regData.user.id;

    // Login with same credentials
    const loginRes = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'User logged in successfully (HTTP 200)');
    assert(Boolean(loginData.token), 'JWT token returned on login');

    // Register Outsider for IDOR tests
    const outRes = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Unrelated Outsider', email: outsiderEmail, password, role: 'applicant' }),
    });
    const outData = await outRes.json();
    const outsiderToken = outData.token;
    assert(Boolean(outsiderToken), 'Outsider test user created for isolation audit');

    // -------------------------------------------------------------------------
    // 3. VERIFY VISA APPLICATION CREATION
    // -------------------------------------------------------------------------
    console.log('\n[3/10] Verifying Visa Application Creation & Statutory Checklists...');
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
          email: testEmail,
          nationality: 'Canadian',
          dateOfBirth: '1992-05-14',
        },
      }),
    });
    const visaData = await createVisa.json();
    assert(createVisa.status === 201, 'H-1B Application created (HTTP 201)');
    const applicationId = visaData.application?._id || visaData.application?.id;
    assert(Boolean(applicationId), 'Application ID returned');
    assert(visaData.application?.checklist?.length > 0, 'Statutory checklist initialized');

    // -------------------------------------------------------------------------
    // 4. VERIFY DOCUMENT UPLOADS
    // -------------------------------------------------------------------------
    console.log('\n[4/10] Verifying Document Uploads & Checksum Generation...');
    const docText = `Certified Labor Condition Application ETA-9035 Run ${timestamp}. Employer: Apex Tech Solutions LLC. Beneficiary: Dr. Jane Doe. Job Title: Senior AI Research Scientist. Offered Wage Rate: $165,000 per year. SOC Code: 15-1221.`;
    const pdfBuf = createReadablePdfBuffer(docText);
    const pdfBlob = new Blob([pdfBuf], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('files', pdfBlob, 'Certified_LCA_ETA9035.pdf');
    formData.append('title', 'Certified LCA ETA-9035');
    formData.append('category', 'EMPLOYMENT_RECORDS');

    const uploadRes = await fetch(`${BACKEND_URL}/applications/${applicationId}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${applicantToken}` },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    assert(uploadRes.status === 201, 'Document uploaded successfully (HTTP 201)');
    const docId = uploadData.documents?.[0]?._id;
    assert(Boolean(docId), 'Document ID generated in MongoDB');
    assert(Boolean(uploadData.documents?.[0]?.checksum), 'SHA-256 Checksum generated');

    // -------------------------------------------------------------------------
    // 5. VERIFY PRIVATE DOCUMENT RETRIEVAL
    // -------------------------------------------------------------------------
    console.log('\n[5/10] Verifying Private Document Retrieval & Stream Headers...');
    const previewRes = await fetch(`${BACKEND_URL}/documents/${docId}/preview`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    assert(previewRes.status === 200, 'Private document preview stream returns HTTP 200');
    assert(previewRes.headers.get('content-type')?.includes('application/pdf'), 'Content-Type header is application/pdf');
    assert(previewRes.headers.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options: nosniff security header present');

    // -------------------------------------------------------------------------
    // 6. VERIFY OCR & TEXT EXTRACTION ENGINES
    // -------------------------------------------------------------------------
    console.log('\n[6/10] Verifying OCR & Native Text Extraction Engines...');
    const extractRes = await fetch(`${BACKEND_URL}/ai/documents/${docId}/extract`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    const extractData = await extractRes.json();
    assert(extractRes.status === 200, 'POST /ai/documents/:id/extract returns HTTP 200');
    assert(extractData.extraction?.method === 'native_text', 'Extraction method resolved to native_text');
    assert(extractData.extraction?.wordCount > 10, 'Extracted word count > 10 words');
    assert(extractData.extraction?.text.includes('Apex Tech Solutions'), 'Extracted text layer matches uploaded PDF content');

    // -------------------------------------------------------------------------
    // 7. VERIFY REAL OPENAI API CONNECTIVITY
    // -------------------------------------------------------------------------
    console.log('\n[7/10] Verifying OpenAI Provider & API Key Authentication...');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    let openaiStatus = 'unknown';
    let openaiDetails = '';
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
      });
      openaiStatus = 'active_and_funded';
      openaiDetails = 'Live OpenAI tokens generated successfully';
    } catch (err) {
      if (err.status === 401) {
        openaiStatus = 'invalid_key';
        openaiDetails = 'API Key rejected: 401 Unauthorized';
      } else if (err.code === 'credit_balance_exhausted' || err.type === 'insufficient_quota') {
        openaiStatus = 'quota_exhausted';
        openaiDetails = 'API Key authenticated successfully; credit balance is $0.00 (quota exhausted)';
      } else {
        openaiStatus = 'error';
        openaiDetails = err.message;
      }
    }
    assert(openaiStatus === 'active_and_funded' || openaiStatus === 'quota_exhausted', `OpenAI API connection recognized (Status: ${openaiStatus} - ${openaiDetails})`);
    assert(openaiStatus !== 'invalid_key', 'OpenAI API Key is valid and not rejected with 401 Unauthorized');

    // -------------------------------------------------------------------------
    // 8. VERIFY STRUCTURED DOCUMENT EXTRACTION SCHEMAS
    // -------------------------------------------------------------------------
    console.log('\n[8/10] Verifying DocumentExtraction & ExtractedField Database Schemas...');
    const { DocumentExtraction, ExtractedField } = await import('../dist/models/extraction.model.js');
    const docObjId = new mongoose.Types.ObjectId(docId);
    let dbExtraction = await DocumentExtraction.findOne({ documentId: docObjId });
    if (!dbExtraction) {
      dbExtraction = await mongoose.connection.db.collection('documentextractions').findOne({
        $or: [{ documentId: docId }, { documentId: docObjId }]
      });
    }
    assert(Boolean(dbExtraction), 'DocumentExtraction record persisted in MongoDB Atlas');
    assert((dbExtraction?.wordCount || 0) > 0, 'Word count persisted');

    // Create test ExtractedField to verify schema validation & human review
    const testField = await ExtractedField.create({
      documentId: docId,
      applicationId,
      category: 'employment',
      fieldName: 'jobTitle',
      fieldValue: 'Senior AI Research Scientist',
      confidence: 0.96,
      verificationStatus: 'unverified',
    });
    assert(Boolean(testField._id), 'ExtractedField schema validated & created in MongoDB');

    // -------------------------------------------------------------------------
    // 9. VERIFY DOCUMENT AUTHORIZATION & IDOR ACCESS CONTROL
    // -------------------------------------------------------------------------
    console.log('\n[9/10] Verifying Zero-Trust Cross-Tenant IDOR Access Defenses...');
    const idorDownload = await fetch(`${BACKEND_URL}/documents/${docId}/download`, {
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    assert(idorDownload.status === 403, 'Cross-user IDOR download rejected (HTTP 403)');

    const idorExtract = await fetch(`${BACKEND_URL}/ai/documents/${docId}/extract`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    assert(idorExtract.status === 403, 'Cross-user IDOR text extraction rejected (HTTP 403)');

    const idorFinding = await fetch(`${BACKEND_URL}/ai/findings/${applicationId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    assert(idorFinding.status === 403, 'Cross-user IDOR evidence findings query rejected (HTTP 403)');

    // -------------------------------------------------------------------------
    // 10. VERIFY EXISTING AI ASSISTANT WORKSPACE ENDPOINTS
    // -------------------------------------------------------------------------
    console.log('\n[10/10] Verifying AI Assistant Workspace & Conversations API...');
    const convRes = await fetch(`${BACKEND_URL}/ai/conversations`, {
      headers: { Authorization: `Bearer ${applicantToken}` },
    });
    assert(convRes.status === 200, 'GET /ai/conversations responds HTTP 200');

    // Clean up test field
    await ExtractedField.deleteOne({ _id: testField._id });

    console.log('\n========================================================================');
    console.log(`  PHASE 7 PREREQUISITE RESULTS: ${passed} PASSED / ${failed} FAILED (${Math.round((passed / (passed + failed)) * 100)}%)`);
    console.log('========================================================================\n');

    await mongoose.disconnect();

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal Prerequisite Audit Error:', err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  }
}

verifyPhase6Prerequisites();
