import { bot } from '../src/bot/bot.js';
import { env } from '../src/config/env.js';
import { logger } from '../src/utils/logger.js';

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Verify Telegram Webhook Secret Token header
  const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
  if (secretHeader !== env.TELEGRAM_WEBHOOK_SECRET) {
    logger.warn('Unauthorized webhook request: secret token mismatch');
    return res.status(403).json({ error: 'Forbidden: Invalid secret token' });
  }

  try {
    const update = req.body;
    if (!update || typeof update !== 'object') {
      return res.status(400).json({ error: 'Bad Request: Missing update payload' });
    }

    // Process update with Telegraf
    await bot.handleUpdate(update);

    return res.status(200).json({ ok: true });
  } catch (error) {
    logger.error('Error processing Telegram update in webhook:', error.message);
    // Respond 200 to Telegram so it does not retry endlessly on application-level exceptions
    return res.status(200).json({ ok: false, error: 'Internal processing handled' });
  }
}
