// ==========================================
// src/config/index.ts
// ==========================================
import dotenv from 'dotenv';
dotenv.config();

function requireEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',

  // JWT
  JWT_SECRET: requireEnvVar('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,

  // Database
  DATABASE_URL: requireEnvVar('DATABASE_URL'),

  // Server
  PORT: Number(process.env.PORT ?? 5000),

  // SMTP
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_PORT: Number(process.env.SMTP_PORT ?? 587),

  // 👇 IMPORTANT — ADD THIS
  EMAIL_FROM: process.env.EMAIL_FROM ?? 'no-reply@veleco.com',
};