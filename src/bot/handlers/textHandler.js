import { parseUserInputWithAI, generateFinancialInsight } from '../../services/ai/aiService.js';
import { transactionService } from '../../services/transaction/transactionService.js';
import { reportService } from '../../services/report/reportService.js';
import { savingsService } from '../../services/savings/savingsService.js';
import { reminderService } from '../../services/reminder/reminderService.js';
import { formatIDR, parseNaturalAmount } from '../../utils/currency.js';
import { escapeHtml } from '../../utils/format.js';
import { menuKeyboards } from '../keyboards/menuKeyboards.js';
import { handleSaldo } from '../commands/saldo.js';
import { handleStart } from '../commands/start.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';

export async function handleTextMessage(ctx) {
  const user = ctx.state.user;
  const text = ctx.message?.text?.trim();

  if (!text) return;

  // 1. Check if user is not registered and inputting initial balance
  if (!user.isRegistered) {
    const parsedAmount = parseNaturalAmount(text);
    if (parsedAmount && parsedAmount > 0) {
      await transactionService.setInitialBalance(user.id, parsedAmount);
      const balance = await transactionService.getBalance(user.id);

      return await ctx.reply(
        `✅ <b>Saldo awal berhasil diatur!</b>\n\n` +
        `🏦 Saldo awal Anda: <b>${formatIDR(parsedAmount)}</b>\n` +
        `💎 Saldo sekarang: <b>${formatIDR(balance.currentBalance)}</b>\n\n` +
        `Mulai sekarang Anda bisa langsung mencatat pengeluaran atau pemasukan secara natural!\n` +
        `Contoh: <i>"Beli bensin 30rb"</i>, <i>"Gaji 3 juta"</i>, atau kirim foto struk belanja.`,
        {
          parse_mode: 'HTML',
          ...menuKeyboards.mainMenu(),
        }
      );
    } else {
      return await ctx.reply(
        `⚠️ Mohon masukkan nominal saldo awal Anda dengan jelas.\nContoh: <i>"2 juta"</i>, <i>"Rp 1.500.000"</i>, atau <i>"500rb"</i>.`,
        { parse_mode: 'HTML' }
      );
    }
  }

  // 2. Direct natural queries for balance
  const lower = text.toLowerCase();
  if (
    lower === 'saldo' ||
    lower.includes('berapa saldo') ||
    lower.includes('sisa uang') ||
    lower.includes('cek saldo')
  ) {
    return await handleSaldo(ctx);
  }

  if (lower === 'menu') {
    return await handleStart(ctx);
  }

  // 3. AI / NLP Processing
  try {
    const aiResult = await parseUserInputWithAI(text);
    logger.info(`AI classification result: ${aiResult.intent}`);

    // If clarification is needed
    if (aiResult.clarificationNeeded && !aiResult.transaction?.amount) {
      return await ctx.reply(
        `🤔 ${escapeHtml(aiResult.clarificationNeeded)}\n\n<i>Contoh: "Beli nasi goreng 20rb" atau "Gaji freelance 1,5 juta"</i>`,
        { parse_mode: 'HTML' }
      );
    }

    // 4. Handle TRANSACTION (INCOME / EXPENSE)
    if (aiResult.intent === 'TRANSACTION' && aiResult.transaction?.amount) {
      const { type, amount, category, description, isExplicitDate, dateString } = aiResult.transaction;
      const numAmount = Number(amount);

      if (isNaN(numAmount) || numAmount <= 0) {
        return await ctx.reply('⚠️ Nominal transaksi tidak valid.');
      }

      if (numAmount > 9999999999999) {
        return await ctx.reply(
          '⚠️ <b>Nominal transaksi terlalu besar!</b>\n\n' +
          'Batas maksimal nominal transaksi adalah Rp 9,99 Triliun. Jika Anda menyertakan nomor rekening, nomor HP, atau nomor meteran, pastikan hanya menuliskan nominal uang yang ditransaksikan (contoh: <i>"Beli pulsa 50rb"</i> atau <i>"Transfer 100rb"</i>).',
          { parse_mode: 'HTML' }
        );
      }

      let txDate = new Date();
      if (isExplicitDate && dateString) {
        const parsedD = new Date(dateString);
        if (!isNaN(parsedD.getTime())) txDate = parsedD;
      }

      const tx = await transactionService.createTransaction({
        userId: user.id,
        type: type || 'EXPENSE',
        category: category || 'LAIN_LAIN',
        amount,
        description: description || (type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'),
        transactionDate: txDate,
      });

      const balance = await transactionService.getBalance(user.id);
      const typeLabel = tx.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran';
      const icon = tx.type === 'INCOME' ? '🟢' : '🔴';

      const replyMsg =
        `✅ <b>Transaksi berhasil dicatat!</b>\n\n` +
        `${icon} <b>Jenis</b>: ${typeLabel}\n` +
        `📁 <b>Kategori</b>: ${escapeHtml(tx.category)}\n` +
        `📝 <b>Keterangan</b>: ${escapeHtml(tx.description)}\n` +
        `💵 <b>Nominal</b>: ${formatIDR(tx.amount)}\n\n` +
        `💎 <b>Saldo sekarang</b>: ${formatIDR(balance.currentBalance)}`;

      return await ctx.reply(replyMsg, {
        parse_mode: 'HTML',
        ...menuKeyboards.mainMenu(),
      });
    }

    // 5. Handle INITIAL_BALANCE update
    if (aiResult.intent === 'INITIAL_BALANCE' && aiResult.initialBalance?.amount) {
      await transactionService.setInitialBalance(user.id, aiResult.initialBalance.amount);
      const balance = await transactionService.getBalance(user.id);

      return await ctx.reply(
        `✅ <b>Saldo awal berhasil diperbarui!</b>\n\n` +
        `🏦 Saldo awal baru: <b>${formatIDR(aiResult.initialBalance.amount)}</b>\n` +
        `💎 Saldo saat ini: <b>${formatIDR(balance.currentBalance)}</b>`,
        {
          parse_mode: 'HTML',
          ...menuKeyboards.mainMenu(),
        }
      );
    }

    // 6. Handle SAVINGS
    if (aiResult.intent === 'SAVINGS' && aiResult.savings) {
      const { action, goalName, targetAmount, amount } = aiResult.savings;

      if (action === 'CREATE_GOAL' && targetAmount) {
        const goal = await savingsService.createGoal(user.id, {
          name: goalName || 'Tabungan Baru',
          targetAmount,
        });

        return await ctx.reply(
          `🎯 <b>Target Tabungan Berhasil Dibuat!</b>\n\n` +
          `📌 Nama: <b>${escapeHtml(goal.name)}</b>\n` +
          `🎯 Target: <b>${formatIDR(targetAmount)}</b>\n\n` +
          `Ketik <i>"Nabung 100rb buat ${escapeHtml(goal.name)}"</i> setiap kali Anda menabung!`,
          {
            parse_mode: 'HTML',
            ...menuKeyboards.savingsMenu(),
          }
        );
      } else if (action === 'CONTRIBUTE' && amount) {
        const result = await savingsService.contribute(user.id, {
          goalName,
          amount,
        });

        const progress = Math.min(
          100,
          Math.round((Number(result.goal.currentAmount) / Number(result.goal.targetAmount)) * 100)
        );

        return await ctx.reply(
          `🎉 <b>Setoran Tabungan Berhasil!</b>\n\n` +
          `📌 Target: <b>${escapeHtml(result.goal.name)}</b>\n` +
          `💰 Disetor: <b>${formatIDR(amount)}</b>\n` +
          `📈 Terkumpul: <b>${formatIDR(result.goal.currentAmount)} / ${formatIDR(result.goal.targetAmount)}</b> (${progress}%)\n` +
          (result.goal.isCompleted ? `\n🏆 <b>SELAMAT! Target tabungan ini telah tercapai!</b> 🥳` : ''),
          {
            parse_mode: 'HTML',
            ...menuKeyboards.savingsMenu(),
          }
        );
      }
    }

    // 7. Handle REMINDER
    if (aiResult.intent === 'REMINDER' && aiResult.reminder?.title) {
      const { title, type, time, dayOfMonth } = aiResult.reminder;
      const reminderTime = time || '20:00';

      const rem = await reminderService.createReminder(user.id, {
        title,
        type: type || 'DAILY',
        reminderTime,
        dayOfMonth,
      });

      return await ctx.reply(
        `⏰ <b>Pengingat Berhasil Diatur!</b>\n\n` +
        `🔔 <b>Judul</b>: ${escapeHtml(rem.title)}\n` +
        `⏰ <b>Waktu</b>: ${escapeHtml(rem.reminderTime)} WITA (${escapeHtml(rem.type)})\n` +
        (rem.dayOfMonth ? `📅 Setiap tanggal: ${rem.dayOfMonth}\n\n` : '\n') +
        `Bot akan otomatis mengirimkan notifikasi pada jam tersebut.`,
        {
          parse_mode: 'HTML',
          ...menuKeyboards.mainMenu(),
        }
      );
    }

    // 8. Handle AI Financial Insights / Queries
    const tz = user.settings?.timezone || env.TIMEZONE;
    const monthlyReport = await reportService.getMonthlyReport(user.id, tz);

    const categoriesText = monthlyReport.metrics.categoryBreakdown
      .map((c) => `${c.category}: ${formatIDR(c.amount)} (${c.percentage}%)`)
      .join(', ');

    const insight = await generateFinancialInsight({
      formattedIncome: formatIDR(monthlyReport.metrics.totalIncome),
      formattedExpense: formatIDR(monthlyReport.metrics.totalExpense),
      formattedNet: formatIDR(monthlyReport.metrics.net),
      formattedBalance: formatIDR(monthlyReport.balance.currentBalance),
      topCategoriesSummary: categoriesText,
      transactionCount: monthlyReport.metrics.transactionCount,
    });

    return await ctx.reply(insight, menuKeyboards.mainMenu());
  } catch (error) {
    logger.error('Error handling text message:', error.message);
    const userFacingMsg = error.message?.includes('melebihi batas')
      ? `⚠️ ${escapeHtml(error.message)}`
      : '⚠️ Maaf, terjadi kesalahan saat memproses pesan Anda. Silakan coba kembali atau gunakan menu di bawah.';
    return await ctx.reply(userFacingMsg, menuKeyboards.mainMenu());
  }
}
