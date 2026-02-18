import dotenv from 'dotenv';
dotenv.config();

// Validate required environment variables
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET environment variable is required and must be at least 32 characters');
}

// Get allowed origins from environment or use defaults
const getAllowedOrigins = (): string[] => {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim()).filter(Boolean);
  }
  // Development defaults
  return [
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean) as string[];
};

export default {
  PORT: process.env.PORT || '4005',
  DATABASE_URL: process.env.MONGODB_URI || 'mongodb://localhost:27017/velosync',
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXP: process.env.JWT_EXP || '7d',
  REFRESH_EXP: process.env.REFRESH_EXP || '7d',
  UPLOADS_DIR: process.env.UPLOADS_DIR || './uploads',
  NODE_ENV: process.env.NODE_ENV || 'development',
  ALLOWED_ORIGINS: getAllowedOrigins()
};
