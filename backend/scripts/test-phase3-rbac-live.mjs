const BASE_URL = 'http://localhost:5001/api/v1';

async function runLiveRBACTests() {
  console.log('===============================================================');
  console.log('  PHASE 3.3: LIVE ROLE-BASED ACCESS CONTROL (RBAC) TEST SUITE');
  console.log('===============================================================\n');

  const ts = Date.now();

  // 1. Attempt Admin Self-Registration (Privilege Escalation Attack)
  console.log('1. Testing Admin Self-Registration Rejection (Privilege Escalation)...');
  const adminRegRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rogue Admin',
      email: `rogue.admin.${ts}@example.com`,
      password: 'Password123!',
      role: 'admin',
    }),
  });
  const adminRegData = await adminRegRes.json();
  console.log('   Status Code (expect 403):', adminRegRes.status);
  console.log('   Security Message:', adminRegData.message);
  if (adminRegRes.status !== 403) {
    throw new Error('Admin self-registration was NOT blocked!');
  }

  // 2. Register Two Real Applicants in MongoDB Atlas
  console.log('\n2. Registering Applicant 1 and Applicant 2 in MongoDB Atlas...');
  const app1Res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dr. Siddharth Rao',
      email: `siddharth.${ts}@example.com`,
      password: 'Password123!',
      role: 'applicant',
    }),
  });
  const app1Data = await app1Res.json();
  const app1Token = app1Data.token;
  console.log('   Applicant 1 Registered:', app1Data.user?.email, 'ID:', app1Data.user?._id || app1Data.user?.id);

  const app2Res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Elena Rostova',
      email: `elena.${ts}@example.com`,
      password: 'Password123!',
      role: 'applicant',
    }),
  });
  const app2Data = await app2Res.json();
  const app2Token = app2Data.token;
  console.log('   Applicant 2 Registered:', app2Data.user?.email, 'ID:', app2Data.user?._id || app2Data.user?.id);

  // 3. Register Attorney
  console.log('\n3. Registering Attorney in MongoDB Atlas...');
  const attorneyRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Sarah Jenkins, Esq.',
      email: `sarah.jenkins.${ts}@lawfirm.example`,
      password: 'Password123!',
      role: 'attorney',
    }),
  });
  const attorneyData = await attorneyRes.json();
  const attorneyToken = attorneyData.token;
  const attorneyId = attorneyData.user?._id || attorneyData.user?.id;
  console.log('   Attorney Registered:', attorneyData.user?.email, 'ID:', attorneyId);

  // 4. Applicant 1 Creates Application A
  console.log('\n4. Applicant 1 creates Application A in MongoDB Atlas...');
  const createAppRes = await fetch(`${BASE_URL}/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${app1Token}`,
    },
    body: JSON.stringify({
      title: 'O-1A Extraordinary Ability Dossier for Quantum Computing Scientist',
      visaCategory: 'O-1',
      formData: { fieldOfEndeavor: 'Quantum Computing', patentsCount: 6 },
    }),
  });
  const createAppResult = await createAppRes.json();
  console.log('   Status Code:', createAppRes.status);
  console.log('   Application ID:', createAppResult.application?._id);
  const applicationId = createAppResult.application?._id;
  if (createAppRes.status !== 201 || !applicationId) {
    throw new Error('Application creation failed!');
  }

  // 5. Cross-User Isolation: Applicant 2 attempts to read Applicant 1's application
  console.log('\n5. Cross-User Isolation Check (IDOR Guard): Applicant 2 queries Application A...');
  const crossUserRes = await fetch(`${BASE_URL}/applications/${applicationId}`, {
    headers: { Authorization: `Bearer ${app2Token}` },
  });
  const crossUserData = await crossUserRes.json();
  console.log('   Status Code (expect 403):', crossUserRes.status);
  console.log('   Rejection Reason:', crossUserData.message);
  if (crossUserRes.status !== 403) {
    throw new Error('Cross-user application access was NOT blocked!');
  }

  // 6. Unassigned Attorney Check: Attorney attempts to access Application A before assignment
  console.log('\n6. Unassigned Attorney Check: Attorney queries Application A before assignment...');
  const unassignedRes = await fetch(`${BASE_URL}/applications/${applicationId}`, {
    headers: { Authorization: `Bearer ${attorneyToken}` },
  });
  const unassignedData = await unassignedRes.json();
  console.log('   Status Code (expect 403):', unassignedRes.status);
  console.log('   Rejection Reason:', unassignedData.message);
  if (unassignedRes.status !== 403) {
    throw new Error('Unassigned attorney access was NOT blocked!');
  }

  // 7. Case Assignment: Applicant 1 assigns Attorney to Application A
  console.log('\n7. Case Assignment: Applicant 1 assigns Attorney to Application A...');
  const assignRes = await fetch(`${BASE_URL}/applications/${applicationId}/assign-attorney`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${app1Token}`,
    },
    body: JSON.stringify({ attorneyId }),
  });
  const assignData = await assignRes.json();
  console.log('   Status Code:', assignRes.status);
  console.log('   Assignment Message:', assignData.message);
  console.log('   New Status:', assignData.application?.status);
  if (assignRes.status !== 200 || assignData.application?.assignedAttorneyId !== attorneyId) {
    throw new Error('Attorney assignment failed!');
  }

  // 8. Authorized Attorney Access: Attorney queries Application A after assignment
  console.log('\n8. Authorized Attorney Access: Attorney queries Application A after assignment...');
  const authorizedAttorneyRes = await fetch(`${BASE_URL}/applications/${applicationId}`, {
    headers: { Authorization: `Bearer ${attorneyToken}` },
  });
  const authorizedAttorneyData = await authorizedAttorneyRes.json();
  console.log('   Status Code (expect 200):', authorizedAttorneyRes.status);
  console.log('   Case Title:', authorizedAttorneyData.application?.title);
  if (authorizedAttorneyRes.status !== 200) {
    throw new Error('Assigned attorney access failed!');
  }

  // 9. Attorney Records Review Decision
  console.log('\n9. Attorney records Casework Review Decision...');
  const reviewRes = await fetch(`${BASE_URL}/applications/${applicationId}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${attorneyToken}`,
    },
    body: JSON.stringify({
      decision: 'changes_requested',
      comments: 'Evidence is strong. Please include citation count index and independent reference letters.',
    }),
  });
  const reviewData = await reviewRes.json();
  console.log('   Status Code:', reviewRes.status);
  console.log('   Review Message:', reviewData.message);
  console.log('   Updated Status:', reviewData.application?.status);
  if (reviewRes.status !== 200 || reviewData.application?.status !== 'changes_requested') {
    throw new Error('Attorney review recording failed!');
  }

  // 10. Admin Route Protection Check: Non-Admin attempts to access /admin/users
  console.log('\n10. Non-Admin queries /api/v1/admin/users (expect 403)...');
  const adminRouteRes = await fetch(`${BASE_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${app1Token}` },
  });
  const adminRouteData = await adminRouteRes.json();
  console.log('   Status Code (expect 403):', adminRouteRes.status);
  console.log('   Rejection Reason:', adminRouteData.message);
  if (adminRouteRes.status !== 403) {
    throw new Error('Non-admin user was not blocked from /admin routes!');
  }

  console.log('\n===============================================================');
  console.log('  PHASE 3.3: ALL RBAC AND AUTHORIZATION TESTS PASSED (100%)');
  console.log('===============================================================');
}

runLiveRBACTests().catch((err) => {
  console.error('\n[FAIL] Live RBAC test failed:', err);
  process.exit(1);
});

