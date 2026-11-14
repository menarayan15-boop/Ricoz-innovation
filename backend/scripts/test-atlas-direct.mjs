import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

console.log('Testing connection to:', process.env.MONGODB_URI.replace(/:([^@]+)@/, ':****@'));

async function testConnection() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });
    console.log('SUCCESSFULLY_CONNECTED_TO_ATLAS!');
    console.log('Host:', mongoose.connection.host);
    console.log('Database:', mongoose.connection.name);
    console.log('ReadyState:', mongoose.connection.readyState);
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections count:', collections.length);
    console.log('Collections:', collections.map(c => c.name));
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('FAILED_TO_CONNECT_TO_ATLAS:');
    console.error('Error Name:', err.name);
    console.error('Error Message:', err.message);
    if (err.cause) {
      console.error('Cause:', err.cause);
    }
    process.exit(1);
  }
}

testConnection();

