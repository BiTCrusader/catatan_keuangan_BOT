import { prisma } from '../../config/database.js';
import { dayjs } from '../../utils/date.js';
import { escapeHtml, stripHtml } from '../../utils/format.js';
import { logger } from '../../utils/logger.js';

export const reminderService = {
  /**
   * Create a new reminder
   */
  async createReminder(userId, { title, type = 'DAILY', reminderTime = '20:00', dayOfMonth = null }) {
    return await prisma.reminder.create({
      data: {
        userId,
        title,
        type,
        reminderTime,
        dayOfMonth: dayOfMonth ? parseInt(dayOfMonth, 10) : null,
        isActive: true,
        status: 'ACTIVE',
      },
    });
  },

  /**
   * List user reminders
   */
  async getUserReminders(userId) {
    return await prisma.reminder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Toggle active state
   */
  async toggleReminder(reminderId, userId) {
    const reminder = await prisma.reminder.findFirst({
      where: { id: reminderId, userId },
    });

    if (!reminder) throw new Error('Pengingat tidak ditemukan');

    return await prisma.reminder.update({
      where: { id: reminderId },
      data: { isActive: !reminder.isActive },
    });
  },

  /**
   * Delete reminder
   */
  async deleteReminder(reminderId, userId) {
    return await prisma.reminder.deleteMany({
      where: { id: reminderId, userId },
    });
  },

  /**
   * Process due reminders triggered by Serverless Cron
   * Prevents double-sending by comparing lastSentAt with today's date in user's timezone
   */
  async processDueReminders(bot, tz = 'Asia/Makassar') {
    const now = dayjs().tz(tz);
    const currentHourMinute = now.format('HH:mm');
    const currentDayOfMonth = now.date();
    const todayStart = now.startOf('day').toDate();

    logger.info(`Processing due reminders at ${currentHourMinute} (${tz})`);

    // Fetch active reminders
    const reminders = await prisma.reminder.findMany({
      where: {
        isActive: true,
      },
      include: {
        user: true,
      },
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const reminder of reminders) {
      // 1. Check if already sent today
      if (reminder.lastSentAt && reminder.lastSentAt >= todayStart) {
        continue;
      }

      // 2. Check time match (allowing small cron drift window, matching hour:minute)
      const isTimeDue = reminder.reminderTime === currentHourMinute;

      // 3. For MONTHLY / BILL reminders, check day of month
      let isDayDue = true;
      if (reminder.type === 'MONTHLY' || reminder.type === 'BILL') {
        if (reminder.dayOfMonth && reminder.dayOfMonth !== currentDayOfMonth) {
          isDayDue = false;
        }
      }

      if (isTimeDue && isDayDue) {
        try {
          const reminderMsg =
            `⏰ <b>PENGINGAT KEUANGAN</b>\n\n` +
            `🔔 <b>${escapeHtml(reminder.title)}</b>\n` +
            `Waktu: ${escapeHtml(reminder.reminderTime)} WITA\n\n` +
            `Jangan lupa catat transaksi hari ini dengan mengetik pesan biasa ke bot ini! ✨`;

          try {
            await bot.telegram.sendMessage(reminder.user.telegramId, reminderMsg, {
              parse_mode: 'HTML',
            });
          } catch (sendErr) {
            if (sendErr?.message?.includes("can't parse entities")) {
              await bot.telegram.sendMessage(reminder.user.telegramId, stripHtml(reminderMsg));
            } else {
              throw sendErr;
            }
          }

          await prisma.reminder.update({
            where: { id: reminder.id },
            data: {
              lastSentAt: new Date(),
              status: 'SENT',
            },
          });

          sentCount++;
          logger.info(`Reminder sent to telegramId ${reminder.user.telegramId}`);
        } catch (err) {
          failedCount++;
          logger.error(`Failed sending reminder ${reminder.id} to ${reminder.user.telegramId}:`, err.message);

          await prisma.reminder.update({
            where: { id: reminder.id },
            data: {
              status: 'FAILED',
            },
          });
        }
      }
    }

    return {
      totalFound: reminders.length,
      sentCount,
      failedCount,
      processedTime: currentHourMinute,
    };
  },
};
