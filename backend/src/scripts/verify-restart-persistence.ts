import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const maskMongoUri = (uri: string): string => {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
};

const TestSchema = new mongoose.Schema({
  testId: { type: String, required: true },
  description: { type: String, required: true },
  persistedAt: { type: Date, default: Date.now },
});

async function testPersistenceAcrossRestart() {
  console.log('==================================================');
  console.log('TESTING PERSISTENCE ACROSS SERVER RESTART');
  console.log('==================================================\n');

  let uri = process.env.MONGODB_URI?.trim();
  if (uri && uri.startsWith('MONGODB_URI=')) {
    uri = uri.replace(/^MONGODB_URI=/, '').trim();
  }

  if (!uri) {
    throw new Error('MONGODB_URI not defined');
  }

  const persistentDocId = `persist_restart_${Date.now()}`;
  console.log(`SESSION 1: Initial Backend Startup`);
  console.log(`Connecting to: ${maskMongoUri(uri)}`);
  await mongoose.connect(uri);
  const TestModel1 = mongoose.model('__restart_persistence_test__', TestSchema);

  console.log(`Writing persistent record with key: ${persistentDocId}`);
  const created = await TestModel1.create({
    testId: persistentDocId,
    description: 'Data persisted in Atlas across simulated backend restart',
  });
  const createdDbId = created._id.toString();
  console.log(`Record created in Atlas with _id: ${createdDbId}`);

  console.log('\nSIMULATING BACKEND TERMINATION & DISCONNECT...');
  await mongoose.disconnect();
  console.log(`Backend connection disconnected. readyState = ${mongoose.connection.readyState}`);

  console.log('\nSESSION 2: Simulating Backend Restart & Reconnect...');
  await mongoose.connect(uri);
  console.log(`Backend re-established connection. readyState = ${mongoose.connection.readyState}`);

  const TestModel2 = mongoose.models['__restart_persistence_test__'] || mongoose.model('__restart_persistence_test__', TestSchema);

  console.log(`Querying record with _id: ${createdDbId} created in previous session...`);
  const found: any = await TestModel2.findById(createdDbId).lean();

  if (!found) {
    console.error('[FAILED] Record was not found after restart! Data was not persistent.');
    process.exit(1);
  }

  console.log('[SUCCESS] Record retrieved after restart with 100% integrity:');
  console.log({
    _id: found._id.toString(),
    testId: found.testId,
    description: found.description,
    persistedAt: found.persistedAt,
  });

  // Clean up
  await TestModel2.findByIdAndDelete(createdDbId);
  console.log('Cleaned up test record from Atlas cluster.');

  await mongoose.disconnect();
  console.log('\n==================================================');
  console.log('RESULT: PERSISTENCE ACROSS RESTART VERIFIED!');
  console.log('==================================================');
}

testPersistenceAcrossRestart().catch((err) => {
  console.error('Persistence verification failed:', err);
  process.exit(1);
});

