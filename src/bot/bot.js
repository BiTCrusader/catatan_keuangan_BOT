import { Telegraf } from 'telegraf';
import { env } from '../config/env.js';
import { authMiddleware } from './middleware/auth.js';
import { dedupMiddleware } from './middleware/dedup.js';
import { handleStart } from './commands/start.js';
import { handleMenu } from './commands/menu.js';
import { handleSaldo } from './commands/saldo.js';
import {
  handleLaporanHariIni,
  handleLaporanMingguIni,
  handleLaporanBulanIni,
} from './commands/laporan.js';
import { handleRiwayat } from './commands/riwayat.js';
import { handleTabungan } from './commands/tabungan.js';
import { handlePengingat } from './commands/pengingat.js';
import { handleExportMenu } from './commands/export.js';
import { handleBantuan } from './commands/bantuan.js';
import { handleTextMessage } from './handlers/textHandler.js';
import { handleCallbackQuery } from './handlers/callbackHandler.js';
import { handlePhotoMessage } from './handlers/photoHandler.js';
import { stripHtml } from '../utils/format.js';
import { logger } from '../utils/logger.js';

export function createBot() {
  const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

  // Safe reply wrapper to catch entity parsing errors and retry as clean plain text
  bot.use(async (ctx, next) => {
    if (ctx.reply) {
      const origReply = ctx.reply.bind(ctx);
      ctx.reply = async (text, extra = {}) => {
        try {
          return await origReply(text, extra);
        } catch (err) {
          if (err?.message?.includes("can't parse entities")) {
            logger.warn(`Telegram entity parsing failed, retrying plain text: ${err.message}`);
            const { parse_mode, ...safeExtra } = extra;
            return await origReply(stripHtml(text), safeExtra);
          }
          throw err;
        }
      };
    }
    return await next();
  });

  // Middlewares
  bot.use(dedupMiddleware);
  bot.use(authMiddleware);

  // Commands
  bot.command('start', handleStart);
  bot.command('menu', handleMenu);
  bot.command('saldo', handleSaldo);
  bot.command('hariini', handleLaporanHariIni);
  bot.command('mingguini', handleLaporanMingguIni);
  bot.command('bulanini', handleLaporanBulanIni);
  bot.command('laporan', handleLaporanBulanIni);
  bot.command('riwayat', (ctx) => handleRiwayat(ctx, 1));
  bot.command('tabungan', handleTabungan);
  bot.command('pengingat', handlePengingat);
  bot.command('export', handleExportMenu);
  bot.command('bantuan', handleBantuan);

  // Message Handlers
  bot.on('text', handleTextMessage);
  bot.on('callback_query', handleCallbackQuery);
  bot.on('photo', (ctx) => handlePhotoMessage(ctx, bot));

  // Catch unhandled errors gracefully
  bot.catch((err, ctx) => {
    logger.error(`Telegraf error for update ${ctx?.update?.update_id}:`, err.message);
  });

  return bot;
}

export const bot = createBot();
