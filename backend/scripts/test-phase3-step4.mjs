import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('backend/.env') });

const BASE_URL = 'http://localhost:5001/api/v1';

async function runStep4Tests() {
  console.log('===============================================================');
  console.log('  STEP 4: COMPLETE END-TO-END AUTHENTICATION TEST SUITE');
  console.log('===============================================================\n');

  // 1. MongoDB Connection
  console.log('1. Checking MongoDB Atlas Live Connection...');
  const healthRes = await fetch(`${BASE_URL}/health/db`);
  const healthData = await healthRes.json();
  console.log('   HTTP Status:', healthRes.status);
  console.log('   Atlas State:', healthData.status);
  console.log('   Atlas Host:', healthData.host);
  console.log('   Database Name:', healthData.databaseName);
  console.log('   Ping Latency:', healthData.pingLatencyMs, 'ms');
  if (healthRes.status !== 200 || healthData.status !== 'connected') {
    throw new Error('Database is not connected!');
  }

  // 2. Existing User Lookup (Direct Atlas Query via Mongoose)
  console.log('\n2. Checking Existing User in MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const usersCollection = mongoose.connection.db.collection('users');

  const targetEmail = 'menarayan.15@gmail.com';
  const existingUser = await usersCollection.findOne({ email: targetEmail });
  console.log(`   Normalized Lookup for [${targetEmail}]:`, existingUser ? 'EXISTS' : 'NOT FOUND (null)');
  if (!existingUser) {
    console.log('   DIAGNOSIS CONFIRMED: The email was never submitted or registered in the database.');
  }

  // 3. Registration with a new disposable test account
  const timestamp = Date.now();
  const disposableEmail = `disposable.audit.${timestamp}@legaltech-visa.example`;
  const disposablePassword = 'ValidPassword2026!';
  const disposableName = 'Audit Verification User';

  console.log('\n3. Registration with New Disposable Test Account...');
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: disposableName,
      email: disposableEmail,
      password: disposablePassword,
      role: 'applicant',
    }),
  });
  const regData = await regRes.json();
  console.log('   Status Code (expect 201):', regRes.status);
  console.log('   Registration Success:', regData.success);
  console.log('   Assigned MongoDB _id:', regData.user?._id || regData.user?.id);
  console.log('   Returned Email:', regData.user?.email);
  console.log('   JWT Token Generated:', Boolean(regData.token));
  console.log('   Password Masked:', regData.user?.password === undefined);
  if (regRes.status !== 201 || !regData.token) {
    throw new Error('Registration failed!');
  }
  const token = regData.token;

  // Verify persistence in Atlas
  const persistedInAtlas = await usersCollection.findOne({ email: disposableEmail });
  console.log('   Direct MongoDB Atlas Verification:', persistedInAtlas ? 'PERSISTED DIRECTLY IN ATLAS' : 'NOT FOUND');
  console.log('   Atlas Password Hash Algorithm:', persistedInAtlas?.password?.substring(0, 7)); // $2a$12$

  // 4. Login with Correct Test Credentials
  console.log('\n4. Login with Correct Test Credentials...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: disposableEmail,
      password: disposablePassword,
    }),
  });
  const loginData = await loginRes.json();
  console.log('   Status Code (expect 200):', loginRes.status);
  console.log('   Login Success:', loginData.success);
  console.log('   Authenticated Profile:', loginData.user?.email);
  if (loginRes.status !== 200 || !loginData.token) {
    throw new Error('Valid login failed!');
  }

  // 5. Login with Incorrect Credentials
  console.log('\n5. Login with Incorrect Password...');
  const wrongPassRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: disposableEmail,
      password: 'WrongPassword999!',
    }),
  });
  const wrongPassData = await wrongPassRes.json();
  console.log('   Status Code (expect 401):', wrongPassRes.status);
  console.log('   Sanitized Error Message:', wrongPassData.message);
  console.log('   Specific Reason Code:', wrongPassData.reason);
  if (wrongPassRes.status !== 401 || wrongPassData.reason !== 'incorrect_password') {
    throw new Error('Incorrect password was not handled properly!');
  }

  // 5b. Login with Non-Existent User
  console.log('\n5b. Login with Unregistered Email...');
  const nonExistRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: targetEmail,
      password: 'AnyPassword123!',
    }),
  });
  const nonExistData = await nonExistRes.json();
  console.log('   Status Code (expect 401):', nonExistRes.status);
  console.log('   Sanitized Error Message:', nonExistData.message);
  console.log('   Specific Reason Code:', nonExistData.reason);
  if (nonExistRes.status !== 401 || nonExistData.reason !== 'account_not_found') {
    throw new Error('Non-existent email was not reported clearly!');
  }

  // 6. Secure Session Creation
  console.log('\n6. Verifying Secure Session Creation...');
  const cookieHeader = loginRes.headers.get('set-cookie');
  console.log('   HttpOnly Cookie Header:', Boolean(cookieHeader && cookieHeader.includes('auth_token=')));
  console.log('   SameSite Lax Configured:', Boolean(cookieHeader && cookieHeader.includes('SameSite=Lax')));

  // 7. Protected Dashboard Access
  console.log('\n7. Protected Dashboard Access (/applications)...');
  const dashRes = await fetch(`${BASE_URL}/applications`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const dashData = await dashRes.json();
  console.log('   Status Code (expect 200):', dashRes.status);
  console.log('   Workspace Query Success:', dashData.success);
  console.log('   Scoped Applications:', dashData.count);
  if (dashRes.status !== 200) {
    throw new Error('Protected dashboard access failed!');
  }

  // 8. Page Refresh Simulation (/auth/me)
  console.log('\n8. Page Refresh Simulation with Active Session (/auth/me)...');
  const meRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meData = await meRes.json();
  console.log('   Status Code (expect 200):', meRes.status);
  console.log('   Retrieved Name:', meData.user?.name);
  console.log('   Retrieved Email:', meData.user?.email);
  console.log('   Retrieved Role:', meData.user?.role);
  if (meRes.status !== 200 || meData.user?.email !== disposableEmail) {
    throw new Error('Session profile retrieval failed!');
  }

  // 9. Logout
  console.log('\n9. Testing Logout (/auth/logout)...');
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const logoutData = await logoutRes.json();
  console.log('   Status Code (expect 200):', logoutRes.status);
  console.log('   Logout Response:', logoutData.message);

  // 10. Clean up disposable test account
  console.log('\n10. Cleaning up disposable test account in MongoDB Atlas...');
  const deleteResult = await usersCollection.deleteOne({ email: disposableEmail });
  console.log('   Deleted Disposable Record Count:', deleteResult.deletedCount);

  await mongoose.disconnect();

  console.log('\n===============================================================');
  console.log('  ALL STEP 4 END-TO-END TESTS PASSED (100%)');
  console.log('===============================================================');
}

runStep4Tests().catch(err => {
  console.error('\nSTEP 4 TEST FAILED:', err);
  process.exit(1);
});

