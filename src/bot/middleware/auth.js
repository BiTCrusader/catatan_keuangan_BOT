import { env } from '../../config/env.js';
import { transactionService } from '../../services/transaction/transactionService.js';
import { logger } from '../../utils/logger.js';

export async function authMiddleware(ctx, next) {
  const telegramId = ctx.from?.id ? String(ctx.from.id) : null;

  if (!telegramId) {
    return; // Ignore non-user updates
  }

  // Check Whitelist
  const isAllowed = env.allowedUserIds.includes(telegramId);

  if (!isAllowed) {
    logger.warn(`Unauthorized access attempt from Telegram ID: ${telegramId}`);
    try {
      await ctx.reply(
        '⛔ **AKSES DITOLAK**\n\n' +
        'Maaf, bot keuangan ini bersifat pribadi dan hanya dapat diakses oleh Telegram ID yang telah terdaftar dalam whitelist.\n\n' +
        `🆔 ID Telegram Anda: \`${telegramId}\``,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      // Ignore send errors for unauthorized
    }
    return;
  }

  // Attach user to context state
  try {
    const user = await transactionService.getOrCreateUser(telegramId, {
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
    });

    ctx.state.user = user;
    return await next();
  } catch (error) {
    logger.error('Database connection error in authMiddleware:', error.message);
    await ctx.reply('⚠️ Terjadi gangguan koneksi database. Silakan coba sesaat lagi.');
  }
}
