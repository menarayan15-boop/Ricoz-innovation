const mongoose = require('mongoose');

async function runTest() {
  console.log('====================================================');
  console.log('PERSISTENT MONGODB VERIFICATION & CRUD INTEGRITY TEST');
  console.log('====================================================');

  const uri = 'mongodb://127.0.0.1:27017/immigration_dossier_db';
  console.log(`\n1. Connecting directly to persistent MongoDB: ${uri}`);
  await mongoose.connect(uri);

  console.log('2. Connected! Verifying connection details:');
  console.log('   Host:', mongoose.connection.host);
  console.log('   Port:', mongoose.connection.port);
  console.log('   Database Name:', mongoose.connection.name);
  console.log('   ReadyState:', mongoose.connection.readyState);

  console.log('\n3. Executing real admin.ping() on database...');
  const pingStart = Date.now();
  const pingRes = await mongoose.connection.db.admin().ping();
  const pingLatency = Date.now() - pingStart;
  console.log('   Admin Ping Result:', pingRes);
  console.log('   Ping Latency:', pingLatency, 'ms');

  console.log('\n4. Defining temporary schema and creating test record...');
  const DossierAuditSchema = new mongoose.Schema({
    testId: String,
    visaCategory: String,
    description: String,
    createdAt: { type: Date, default: Date.now }
  });
  const DossierAudit = mongoose.models.DossierAudit || mongoose.model('DossierAudit', DossierAuditSchema);

  const testId = 'TEST-NIW-' + Date.now();
  const createdRecord = await DossierAudit.create({
    testId,
    visaCategory: 'EB-2-NIW',
    description: 'Verifying persistent disk write for petition evidence index'
  });
  console.log('   Test record created successfully with _id:', createdRecord._id.toString());
  console.log('   testId:', createdRecord.testId);

  console.log('\n5. Reading test record back from persistent MongoDB...');
  const fetchedRecord = await DossierAudit.findOne({ testId });
  console.log('   Fetched record:', {
    _id: fetchedRecord._id.toString(),
    testId: fetchedRecord.testId,
    visaCategory: fetchedRecord.visaCategory,
    description: fetchedRecord.description,
    createdAt: fetchedRecord.createdAt
  });

  if (!fetchedRecord || fetchedRecord.testId !== testId) {
    throw new Error('Data read-back verification failed!');
  }
  console.log('   Data integrity check: PASSED');

  console.log('\n6. Deleting temporary test record...');
  await DossierAudit.deleteOne({ _id: createdRecord._id });
  const checkDeleted = await DossierAudit.findOne({ testId });
  console.log('   Record post-deletion search result (should be null):', checkDeleted);
  if (checkDeleted !== null) {
    throw new Error('Deletion verification failed!');
  }
  console.log('   Deletion verification: PASSED');

  await mongoose.disconnect();
  console.log('\n7. Disconnected from persistent MongoDB cleanly.');

  console.log('\n8. Querying live Express backend /api/v1/health/db:');
  const response = await fetch('http://localhost:5001/api/v1/health/db');
  const healthData = await response.json();
  console.log(JSON.stringify(healthData, null, 2));

  console.log('\n====================================================');
  console.log('ALL PERSISTENT MONGODB VERIFICATION TESTS PASSED!');
  console.log('====================================================');
}

runTest().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});

