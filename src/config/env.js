import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(8, 'TELEGRAM_WEBHOOK_SECRET must be at least 8 characters'),
  TELEGRAM_ALLOWED_USER_IDS: z.string().min(1, 'TELEGRAM_ALLOWED_USER_IDS is required'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection URL'),
  DIRECT_URL: z.string().optional(),
  AI_PROVIDER: z.enum(['gemini', 'groq']).default('gemini'),
  AI_API_KEY: z.string().min(1, 'AI_API_KEY is required'),
  AI_MODEL: z.string().default('gemini-2.5-flash'),
  CRON_SECRET: z.string().min(8, 'CRON_SECRET must be at least 8 characters'),
  APP_URL: z.string().url().optional(),
  TIMEZONE: z.string().default('Asia/Makassar'),
});

let parsedEnv;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (process.env.NODE_ENV === 'test') {
    // Provide safe defaults for testing
    parsedEnv = {
      NODE_ENV: 'test',
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '123456789:TEST_MOCK_TELEGRAM_BOT_TOKEN',
      TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET || 'test_webhook_secret_12345',
      TELEGRAM_ALLOWED_USER_IDS: process.env.TELEGRAM_ALLOWED_USER_IDS || '123456789,987654321',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/finance_test',
      AI_PROVIDER: 'gemini',
      AI_API_KEY: process.env.AI_API_KEY || 'mock_test_key_for_ai',
      AI_MODEL: 'gemini-2.5-flash',
      CRON_SECRET: process.env.CRON_SECRET || 'test_cron_secret_12345',
      APP_URL: 'https://test.vercel.app',
      TIMEZONE: 'Asia/Makassar',
    };
  } else {
    console.error('❌ Environment validation error:', error.format ? error.format() : error);
    throw error;
  }
}

export const env = {
  ...parsedEnv,
  allowedUserIds: parsedEnv.TELEGRAM_ALLOWED_USER_IDS.split(',').map((id) => id.trim()).filter(Boolean),
};
