const BASE_URL = 'http://localhost:5001/api/v1';

async function runLiveAuthTests() {
  console.log('===============================================================');
  console.log('  PHASE 3.2: LIVE USER REGISTRATION & LOGIN TEST SUITE');
  console.log('===============================================================\n');

  const testEmail = `auth.test.${Date.now()}@legaltech-visa.example`;
  const testPassword = 'SecurePassword123!';
  const testName = 'Dr. Priya Sharma';
  let authToken = '';
  let authCookie = '';

  // 1. Test Registration
  console.log('1. Testing POST /auth/register...');
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: testPassword,
      role: 'applicant',
    }),
  });
  const regData = await regRes.json();
  console.log('   Status Code:', regRes.status);
  console.log('   Success:', regData.success);
  console.log('   User ID:', regData.user?._id || regData.user?.id);
  console.log('   User Email:', regData.user?.email);
  console.log('   User Role:', regData.user?.role);
  console.log('   Password Hashed (not in response):', regData.user?.password === undefined);

  // Extract set-cookie
  const rawCookie = regRes.headers.get('set-cookie');
  console.log('   HttpOnly Cookie Set:', Boolean(rawCookie && rawCookie.includes('auth_token=')));

  if (regRes.status !== 201 || !regData.token || !regData.user) {
    throw new Error('Registration failed!');
  }
  authToken = regData.token;
  authCookie = rawCookie || '';

  // 2. Test Duplicate Registration Rejection
  console.log('\n2. Testing Duplicate Registration Rejection (409 Conflict)...');
  const dupRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Duplicate User',
      email: testEmail,
      password: 'AnotherPassword123!',
      role: 'applicant',
    }),
  });
  const dupData = await dupRes.json();
  console.log('   Status Code (expect 409):', dupRes.status);
  console.log('   Message:', dupData.message);
  if (dupRes.status !== 409) {
    throw new Error('Duplicate email was not rejected with 409 Conflict!');
  }

  // 3. Test Validation Rejection
  console.log('\n3. Testing Validation Rejection (400 Bad Request)...');
  const invalidRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '',
      email: 'not-an-email',
      password: 'short',
    }),
  });
  const invalidData = await invalidRes.json();
  console.log('   Status Code (expect 400):', invalidRes.status);
  console.log('   Field Errors:', invalidData.errors);
  if (invalidRes.status !== 400) {
    throw new Error('Invalid input was not rejected with 400 Bad Request!');
  }

  // 4. Test Login with Valid Credentials
  console.log('\n4. Testing POST /auth/login with valid credentials...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  const loginData = await loginRes.json();
  console.log('   Status Code:', loginRes.status);
  console.log('   Success:', loginData.success);
  console.log('   Authenticated User:', loginData.user?.email);
  console.log('   Token Issued:', Boolean(loginData.token));
  if (loginRes.status !== 200 || !loginData.token) {
    throw new Error('Valid login failed!');
  }

  // 5. Test Login with Wrong Password
  console.log('\n5. Testing POST /auth/login with incorrect password (expect 401)...');
  const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'WrongPassword999!',
    }),
  });
  const badLoginData = await badLoginRes.json();
  console.log('   Status Code (expect 401):', badLoginRes.status);
  console.log('   Message:', badLoginData.message);
  if (badLoginRes.status !== 401) {
    throw new Error('Incorrect password was not rejected with 401 Unauthorized!');
  }

  // 6. Test Protected Route: GET /auth/me with Bearer Token
  console.log('\n6. Testing GET /auth/me with Bearer Token...');
  const meRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const meData = await meRes.json();
  console.log('   Status Code:', meRes.status);
  console.log('   Profile Retrieved:', meData.user?.email, 'Role:', meData.user?.role);
  if (meRes.status !== 200 || meData.user?.email !== testEmail.toLowerCase()) {
    throw new Error('Profile retrieval with Bearer token failed!');
  }

  // 7. Test Protected Route: Unauthenticated Access Rejection
  console.log('\n7. Testing GET /auth/me without Token (expect 401)...');
  const unauthRes = await fetch(`${BASE_URL}/auth/me`);
  const unauthData = await unauthRes.json();
  console.log('   Status Code (expect 401):', unauthRes.status);
  console.log('   Message:', unauthData.message);
  if (unauthRes.status !== 401) {
    throw new Error('Unauthenticated request was not rejected with 401!');
  }

  // 8. Test Password Reset Flow
  console.log('\n8. Testing Password Reset Flow...');
  const forgotRes = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail }),
  });
  const forgotData = await forgotRes.json();
  console.log('   Forgot Password Status:', forgotRes.status);
  console.log('   Dev Reset Token Generated:', Boolean(forgotData.devResetToken));

  const newPassword = 'BrandNewPassword456!';
  const resetRes = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: forgotData.devResetToken,
      password: newPassword,
    }),
  });
  const resetData = await resetRes.json();
  console.log('   Reset Password Status:', resetRes.status);
  console.log('   Reset Message:', resetData.message);

  // Test that login with old password fails
  const oldLoginCheck = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  console.log('   Old Password Login (expect 401):', oldLoginCheck.status);
  if (oldLoginCheck.status !== 401) {
    throw new Error('Old password was still accepted after reset!');
  }

  // Test that login with new password succeeds
  const newLoginCheck = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: newPassword }),
  });
  console.log('   New Password Login (expect 200):', newLoginCheck.status);
  if (newLoginCheck.status !== 200) {
    throw new Error('New password failed to authenticate!');
  }

  // 9. Test Logout
  console.log('\n9. Testing POST /auth/logout...');
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, { method: 'POST' });
  const logoutData = await logoutRes.json();
  console.log('   Logout Status:', logoutRes.status);
  console.log('   Logout Message:', logoutData.message);

  console.log('\n===============================================================');
  console.log('  PHASE 3.2: ALL AUTHENTICATION TESTS PASSED (100%)');
  console.log('===============================================================');
}

runLiveAuthTests().catch((err) => {
  console.error('\n[FAIL] Live Auth test failed:', err);
  process.exit(1);
});

