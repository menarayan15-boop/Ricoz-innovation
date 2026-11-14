const BASE_URL = 'http://localhost:5001/api/v1';

async function runAtlasVerification() {
  console.log('===============================================================');
  console.log('  PHASE 3.1: MONGODB ATLAS REPAIR & PERSISTENCE VERIFICATION');
  console.log('===============================================================\n');

  // 1. Check Backend General Health
  console.log('1. Testing GET /health...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthData = await healthRes.json();
  console.log('   Status Code:', healthRes.status);
  console.log('   Backend Service:', healthData.service);
  console.log('   Database Mode:', healthData.database?.mode);
  console.log('   Database Connected:', healthData.database?.connected);
  console.log('   Is Memory DB:', healthData.database?.isMemoryDb);

  if (healthRes.status !== 200 || !healthData.database?.connected) {
    throw new Error('Backend health reported database disconnected!');
  }

  // 2. Check Dedicated Database Health & Admin Ping
  console.log('\n2. Testing GET /health/db (MongoDB Atlas Ping & Status)...');
  const dbRes = await fetch(`${BASE_URL}/health/db`);
  const dbData = await dbRes.json();
  console.log('   Status Code:', dbRes.status);
  console.log('   Connection Status:', dbData.status);
  console.log('   Mongoose readyState:', dbData.readyState);
  console.log('   Provider:', dbData.provider);
  console.log('   Host:', dbData.host);
  console.log('   Database Name:', dbData.databaseName);
  console.log('   Ping Latency:', dbData.pingLatencyMs, 'ms');
  console.log('   Is Persistent:', dbData.isPersistent);
  console.log('   Is Memory DB:', dbData.isMemoryDb);

  if (
    dbRes.status !== 200 ||
    dbData.status !== 'connected' ||
    dbData.readyState !== 1 ||
    dbData.isMemoryDb !== false ||
    dbData.isPersistent !== true
  ) {
    throw new Error('Database health check failed expected criteria!');
  }

  // 3. Test Full CRUD Lifecycle (Create, Read, Update, Delete)
  console.log('\n3. Testing GET /health/db/verify-crud (Create, Read, Update, Delete)...');
  const crudRes = await fetch(`${BASE_URL}/health/db/verify-crud`);
  const crudData = await crudRes.json();
  console.log('   Status Code:', crudRes.status);
  console.log('   Result Message:', crudData.message);
  console.log('   Operations Verified:');
  console.log('     - Create:', crudData.operations?.create);
  console.log('     - Read:', crudData.operations?.read);
  console.log('     - Update:', crudData.operations?.update);
  console.log('     - Delete:', crudData.operations?.delete);

  if (!crudData.operations?.create || !crudData.operations?.read || !crudData.operations?.update || !crudData.operations?.delete) {
    throw new Error('CRUD lifecycle verification failed!');
  }

  // 4. Persistence Across Restart: Create Retained Record
  const token = `RESTART_AUDIT_${Date.now()}`;
  console.log(`\n4. Creating retained test record on MongoDB Atlas (Token: ${token})...`);
  const postRes = await fetch(`${BASE_URL}/health/db/persistence-record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      label: 'Pre-restart persistence verification record',
    }),
  });
  const postData = await postRes.json();
  console.log('   Record Created ID:', postData.record?._id);
  console.log('   Record Token:', postData.record?.token);

  console.log('\n[PASS] All pre-restart checks succeeded.');
  return token;
}

runAtlasVerification().catch((err) => {
  console.error('\n[FAIL] Phase 3.1 verification failed:', err);
  process.exit(1);
});
