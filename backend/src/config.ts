import dotenv from 'dotenv';
dotenv.config();
export default {
  PORT: process.env.PORT || '4000',
  DATABASE_URL: process.env.MONGODB_URI || 'mongodb://localhost:27017/velosync',
  JWT_SECRET: process.env.JWT_SECRET || 'change-me',
  JWT_EXP: process.env.JWT_EXP || '15m',
  REFRESH_EXP: process.env.REFRESH_EXP || '7d',
  UPLOADS_DIR: process.env.UPLOADS_DIR || './uploads',
  NODE_ENV: process.env.NODE_ENV || 'development'
};
