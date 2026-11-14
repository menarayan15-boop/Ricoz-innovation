const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function check() {
  console.log('Connecting to:', MONGODB_URI.replace(/:([^:@]+)@/, ':****@'));
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });

  const db = mongoose.connection.db;
  console.log('Database name:', mongoose.connection.name);

  const collections = await db.listCollections().toArray();
  console.log('Collections in database:', collections.map(c => c.name));

  const usersCollection = db.collection('users');
  const totalCount = await usersCollection.countDocuments();
  console.log('Total documents in users collection:', totalCount);

  const exactUser = await usersCollection.findOne({ email: 'menarayan.15@gmail.com' });
  console.log('Exact lookup for menarayan.15@gmail.com:', exactUser);

  const partialMatches = await usersCollection.find({ email: { $regex: 'menarayan', $options: 'i' } }).toArray();
  console.log('Partial matches for "menarayan":', partialMatches);

  const allUsers = await usersCollection.find({}, { projection: { email: 1, name: 1, role: 1, createdAt: 1 } }).toArray();
  console.log('\nAll users in Atlas:');
  allUsers.forEach((u, i) => {
    console.log(` ${i}: ${u.email} | Name: ${u.name} | Role: ${u.role} | Created: ${u.createdAt}`);
  });

  await mongoose.disconnect();
}

check().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

