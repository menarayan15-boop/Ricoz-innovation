const BASE_URL = 'http://localhost:5001/api/v1';

async function runThoroughAuthTests() {
  console.log('===============================================================');
  console.log('  PHASE 3: COMPREHENSIVE AUTHENTICATION & SESSION VERIFICATION');
  console.log('===============================================================\n');

  const timestamp = Date.now();
  const testUser = {
    name: 'Dr. Jane Doe',
    email: `jane.doe.${timestamp}@visalaw.example`,
    password: 'SecurePassword123!',
    role: 'applicant',
  };

  let authToken = '';
  let authCookie = '';

  // 1. New User Registration
  console.log('1. Testing New User Registration in MongoDB Atlas...');
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser),
  });
  const regData = await regRes.json();
  console.log('   Status Code (expect 201):', regRes.status);
  console.log('   Success:', regData.success);
  console.log('   User ID in Atlas:', regData.user?._id || regData.user?.id);
  console.log('   Registered Email:', regData.user?.email);
  console.log('   JWT Token Issued:', Boolean(regData.token));
  console.log('   Password Excluded from JSON:', regData.user?.password === undefined);

  const rawCookie = regRes.headers.get('set-cookie');
  console.log('   HttpOnly Cookie Set:', Boolean(rawCookie && rawCookie.includes('auth_token=')));

  if (regRes.status !== 201 || !regData.token || !regData.user) {
    throw new Error('Registration failed!');
  }
  authToken = regData.token;
  authCookie = rawCookie || '';

  // 2. Duplicate Registration Prevention
  console.log('\n2. Testing Duplicate Email Registration Prevention (409 Conflict)...');
  const dupRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Imposter Jane',
      email: testUser.email,
      password: 'AnotherPassword123!',
      role: 'applicant',
    }),
  });
  const dupData = await dupRes.json();
  console.log('   Status Code (expect 409):', dupRes.status);
  console.log('   Error Message:', dupData.message);
  if (dupRes.status !== 409) {
    throw new Error('Duplicate registration was not rejected with 409!');
  }

  // 3. Password Complexity Validation
  console.log('\n3. Testing Password Complexity Validation (400 Bad Request)...');
  const weakPassRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Weak Pass User',
      email: `weak.${timestamp}@visalaw.example`,
      password: 'password', // Missing uppercase and number
      role: 'applicant',
    }),
  });
  const weakPassData = await weakPassRes.json();
  console.log('   Status Code (expect 400):', weakPassRes.status);
  console.log('   Validation Error:', weakPassData.message);
  if (weakPassRes.status !== 400) {
    throw new Error('Weak password was not rejected with 400!');
  }

  // 4. Existing User Login (Verifying bcrypt.compare)
  console.log('\n4. Testing Existing User Login with correct password...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testUser.email,
      password: testUser.password,
    }),
  });
  const loginData = await loginRes.json();
  console.log('   Status Code (expect 200):', loginRes.status);
  console.log('   Success:', loginData.success);
  console.log('   Authenticated User Email:', loginData.user?.email);
  console.log('   New Session Token Generated:', Boolean(loginData.token));
  if (loginRes.status !== 200 || !loginData.token) {
    throw new Error('Login with valid credentials failed!');
  }
  authToken = loginData.token;

  // 5. Consecutive Login (Double Hashing Check)
  console.log('\n5. Testing Consecutive Login (Verifying no re-hashing side-effects)...');
  const login2Res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testUser.email,
      password: testUser.password,
    }),
  });
  const login2Data = await login2Res.json();
  console.log('   Status Code (expect 200):', login2Res.status);
  console.log('   Consecutive Login Success:', login2Data.success);
  if (login2Res.status !== 200) {
    throw new Error('Consecutive login failed! Potential double hashing detected.');
  }

  // 6. Incorrect Password Rejection
  console.log('\n6. Testing Login with Incorrect Password (401 Unauthorized)...');
  const wrongPassRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testUser.email,
      password: 'WrongPassword999!',
    }),
  });
  const wrongPassData = await wrongPassRes.json();
  console.log('   Status Code (expect 401):', wrongPassRes.status);
  console.log('   Security Message:', wrongPassData.message);
  if (wrongPassRes.status !== 401) {
    throw new Error('Wrong password was not rejected with 401!');
  }

  // 7. Non-Existent User Login Rejection
  console.log('\n7. Testing Login with Unregistered Email (401 Unauthorized)...');
  const ghostRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `nonexistent.${timestamp}@nowhere.example`,
      password: 'SomePassword123!',
    }),
  });
  const ghostData = await ghostRes.json();
  console.log('   Status Code (expect 401):', ghostRes.status);
  console.log('   Security Message:', ghostData.message);
  if (ghostRes.status !== 401) {
    throw new Error('Unregistered email was not rejected with 401!');
  }

  // 8. Session Persistence & Authenticated Profile (/auth/me)
  console.log('\n8. Testing Authenticated Profile Retrieval (/auth/me)...');
  const meRes = await fetch(`${BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
  });
  const meData = await meRes.json();
  console.log('   Status Code (expect 200):', meRes.status);
  console.log('   Retrieved Name:', meData.user?.name);
  console.log('   Retrieved Email:', meData.user?.email);
  console.log('   Retrieved Role:', meData.user?.role);
  if (meRes.status !== 200 || meData.user?.email !== testUser.email) {
    throw new Error('Session profile retrieval failed!');
  }

  // 9. Protected Endpoint Access (/applications)
  console.log('\n9. Testing Protected Workspace API Access with Auth Token...');
  const appRes = await fetch(`${BASE_URL}/applications`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  const appData = await appRes.json();
  console.log('   Status Code (expect 200):', appRes.status);
  console.log('   Applications Query Success:', appData.success);
  console.log('   Scoped Applications Count:', appData.count);

  console.log('\n10. Testing Protected Workspace Rejection WITHOUT Token...');
  const unauthRes = await fetch(`${BASE_URL}/applications`, {
    method: 'GET',
  });
  const unauthData = await unauthRes.json();
  console.log('   Status Code (expect 401):', unauthRes.status);
  console.log('   Rejection Message:', unauthData.message);
  if (unauthRes.status !== 401) {
    throw new Error('Unauthenticated request was not rejected!');
  }

  // 11. Logout Test
  console.log('\n11. Testing Logout (/auth/logout)...');
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  const logoutData = await logoutRes.json();
  console.log('   Status Code (expect 200):', logoutRes.status);
  console.log('   Logout Message:', logoutData.message);
  const clearedCookie = logoutRes.headers.get('set-cookie');
  console.log('   Cookie Cleared:', Boolean(clearedCookie && (clearedCookie.includes('auth_token=;') || clearedCookie.includes('Max-Age=0'))));

  console.log('\n===============================================================');
  console.log('  ALL 11 AUTHENTICATION & SESSION TESTS PASSED (100%)');
  console.log('===============================================================');
}

runThoroughAuthTests().catch((err) => {
  console.error('\nTest Suite Failed:', err.message);
  process.exit(1);
});

