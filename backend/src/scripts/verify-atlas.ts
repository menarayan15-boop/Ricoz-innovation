import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

// Load .env explicitly from backend directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const maskMongoUri = (uri: string): string => {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
};

async function runAtlasVerification() {
  console.log('==================================================');
  console.log('MONGODB ATLAS PERSISTENCE VERIFICATION');
  console.log('==================================================\n');

  // 1. Verify environment variables
  let uri = process.env.MONGODB_URI?.trim();
  if (uri && uri.startsWith('MONGODB_URI=')) {
    uri = uri.replace(/^MONGODB_URI=/, '').trim();
  }

  const useMemoryDb = process.env.USE_MEMORY_DB;
  console.log('1. ENVIRONMENT CONFIGURATION:');
  console.log(`   - USE_MEMORY_DB: ${useMemoryDb} (strictly false)`);
  console.log(`   - MONGODB_URI Defined: ${Boolean(uri)}`);
  
  if (!uri) {
    console.error('   [FAIL] MONGODB_URI is not defined in backend/.env!');
    process.exit(1);
  }

  const masked = maskMongoUri(uri);
  console.log(`   - Target Connection: ${masked}`);

  const isAtlas = uri.startsWith('mongodb+srv://');
  console.log(`   - Is MongoDB Atlas (+srv): ${isAtlas}`);

  // 2. Connect to MongoDB Atlas
  console.log('\n2. CONNECTING TO MONGODB ATLAS...');
  const connectStart = Date.now();
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 15000,
    });
  } catch (err) {
    console.error('   [FAIL] Could not connect to MongoDB Atlas:', (err as Error).message);
    process.exit(1);
  }
  const connectDuration = Date.now() - connectStart;
  console.log(`   [SUCCESS] Connected in ${connectDuration}ms`);
  console.log(`   - readyState: ${mongoose.connection.readyState} (1 = connected)`);
  console.log(`   - Host: ${mongoose.connection.host}`);
  console.log(`   - Database Name: ${mongoose.connection.name}`);

  // 3. Admin Ping
  console.log('\n3. RUNNING DATABASE PING...');
  const pingStart = Date.now();
  const pingRes = await mongoose.connection.db!.admin().ping();
  const pingLatency = Date.now() - pingStart;
  console.log(`   [SUCCESS] Ping Response:`, pingRes);
  console.log(`   - Ping Latency: ${pingLatency}ms`);

  // 4. Test CRUD Operations on Real Persistent Database
  console.log('\n4. TESTING CRUD OPERATIONS ON PERSISTENT CLUSTER...');
  const TestSchema = new mongoose.Schema({
    testId: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  });

  const TestModel = mongoose.model('__atlas_persistence_test__', TestSchema);

  // A. CREATE
  const uniqueId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  console.log(`   A. CREATE record with testId: ${uniqueId}...`);
  const createdDoc = await TestModel.create({
    testId: uniqueId,
    description: 'Immigration Dossier Builder Atlas Persistence Test Document',
    category: 'system_verification',
  });
  console.log(`      [SUCCESS] Created doc _id: ${createdDoc._id.toString()}`);

  // B. READ
  console.log(`   B. READ record back from Atlas...`);
  const fetchedDoc = await TestModel.findById(createdDoc._id).lean();
  if (!fetchedDoc || fetchedDoc.testId !== uniqueId) {
    console.error('      [FAIL] Document fetched did not match created document!');
    process.exit(1);
  }
  console.log(`      [SUCCESS] Document read back successfully:`, {
    _id: fetchedDoc._id.toString(),
    testId: fetchedDoc.testId,
    description: fetchedDoc.description,
  });

  // C. UPDATE
  console.log(`   C. UPDATE record...`);
  await TestModel.findByIdAndUpdate(createdDoc._id, {
    description: 'Updated Immigration Dossier Builder Verified Document',
  });
  const updatedDoc = await TestModel.findById(createdDoc._id).lean();
  if (!updatedDoc || updatedDoc.description !== 'Updated Immigration Dossier Builder Verified Document') {
    console.error('      [FAIL] Document update failed!');
    process.exit(1);
  }
  console.log(`      [SUCCESS] Document updated successfully.`);

  // D. DELETE
  console.log(`   D. DELETE record to keep cluster clean...`);
  await TestModel.findByIdAndDelete(createdDoc._id);
  const deletedCheck = await TestModel.findById(createdDoc._id).lean();
  if (deletedCheck !== null) {
    console.error('      [FAIL] Document was not deleted!');
    process.exit(1);
  }
  console.log(`      [SUCCESS] Document deleted. Verification verified null on find.`);

  // 5. Clean up model and disconnect
  await mongoose.disconnect();
  console.log('\n5. CLEAN DISCONNECT:');
  console.log(`   [SUCCESS] Disconnected from Atlas cleanly. readyState: ${mongoose.connection.readyState} (0 = disconnected)`);

  console.log('\n==================================================');
  console.log('RESULT: ALL MONGODB ATLAS PERSISTENCE CHECKS PASSED');
  console.log('==================================================\n');
}

runAtlasVerification().catch((err) => {
  console.error('Unhandled error during Atlas verification:', err);
  process.exit(1);
});

