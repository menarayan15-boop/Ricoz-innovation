const BASE_URL = 'http://localhost:5001/api/v1';

async function verifyPostRestart(token) {
  console.log('===============================================================');
  console.log('  POST-RESTART PERSISTENCE VERIFICATION');
  console.log('===============================================================\n');

  console.log(`1. Reading retained record from MongoDB Atlas (Token: ${token})...`);
  const getRes = await fetch(`${BASE_URL}/health/db/persistence-record/${token}`);
  const getData = await getRes.json();
  console.log('   Status Code:', getRes.status);
  console.log('   Record Retrieved:', getData.success);
  console.log('   Retrieved Label:', getData.record?.label);
  console.log('   Created At:', getData.record?.createdAt);

  if (getRes.status !== 200 || !getData.record) {
    throw new Error('Retained record could not be found after server restart! Persistence failed.');
  }

  console.log('\n2. Cleaning up retained record from Atlas...');
  const delRes = await fetch(`${BASE_URL}/health/db/persistence-record/${token}`, {
    method: 'DELETE',
  });
  const delData = await delRes.json();
  console.log('   Deleted Successfully:', delData.deleted);

  console.log('\n3. Verifying record is completely deleted...');
  const verifyDelRes = await fetch(`${BASE_URL}/health/db/persistence-record/${token}`);
  console.log('   Post-deletion check (expect 404):', verifyDelRes.status);

  if (verifyDelRes.status !== 404) {
    throw new Error('Record was not properly deleted during cleanup.');
  }

  console.log('\n===============================================================');
  console.log('  PHASE 3.1: ALL DATABASE PERSISTENCE TESTS PASSED (100%)');
  console.log('===============================================================');
}

const token = process.argv[2];
if (!token) {
  console.error('Error: Token argument is required.');
  process.exit(1);
}

verifyPostRestart(token).catch((err) => {
  console.error('\n[FAIL] Post-restart verification failed:', err);
  process.exit(1);
});
