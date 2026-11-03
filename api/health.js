import { prisma } from '../src/config/database.js';
import { env } from '../src/config/env.js';

export default async function handler(req, res) {
  const startTime = Date.now();
  let dbStatus = 'disconnected';
  let dbError = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (error) {
    dbError = error.message;
  }

  const responsePayload = {
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    service: 'ai-personal-finance-telegram-bot',
    version: '1.0.0',
    timezone: env.TIMEZONE,
    aiProvider: env.AI_PROVIDER,
    database: {
      status: dbStatus,
      error: dbError ? 'Database connection failure' : null,
    },
    latencyMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  };

  const statusCode = dbStatus === 'connected' ? 200 : 503;
  return res.status(statusCode).json(responsePayload);
}
