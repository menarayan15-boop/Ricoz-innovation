import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Search for .env file across standard possible locations
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend', '.env'),
  path.resolve(process.cwd(), '..', 'backend', '.env'),
];

for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
    break;
  }
}

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/immigration_dossier_db',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_jwt_secret_immigration_dossier_secure_key_12345',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'dev_refresh_secret_immigration_dossier_secure_key_67890',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  },
  storage: {
    driver: process.env.STORAGE_DRIVER || 'local',
    uploadDir: process.env.UPLOAD_DIR || (process.env.VERCEL ? '/tmp/uploads' : './uploads'),
  },
  ai: {
    provider: process.env.AI_PROVIDER || 'openai',
    apiKey: process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    maxOutputTokens: parseInt(process.env.AI_MAX_OUTPUT_TOKENS || '2000', 10),
  },
} as const;
