import { bot } from '../../src/bot/bot.js';
import { env } from '../../src/config/env.js';
import { reminderService } from '../../src/services/reminder/reminderService.js';
import { logger } from '../../src/utils/logger.js';

export default async function handler(req, res) {
  // Verify authorization header using CRON_SECRET
  // Vercel Cron automatically attaches `Authorization: Bearer <CRON_SECRET>`
  const authHeader = req.headers['authorization'];
  const expectedAuth = `Bearer ${env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expectedAuth) {
    logger.warn('Unauthorized cron invocation attempted');
    return res.status(401).json({ error: 'Unauthorized: Invalid CRON_SECRET' });
  }

  try {
    const result = await reminderService.processDueReminders(bot, env.TIMEZONE);
    return res.status(200).json({
      ok: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error running reminders cron:', error.message);
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
}
