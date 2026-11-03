import { parseUserInputWithAI, generateFinancialInsight } from '../../services/ai/aiService.js';
import { transactionService } from '../../services/transaction/transactionService.js';
import { reportService } from '../../services/report/reportService.js';
import { savingsService } from '../../services/savings/savingsService.js';
import { reminderService } from '../../services/reminder/reminderService.js';
import { formatIDR, parseNaturalAmount } from '../../utils/currency.js';
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
        `✅ **Saldo awal berhasil diatur!**\n\n` +
        `🏦 Saldo awal Anda: **${formatIDR(parsedAmount)}**\n` +
        `💎 Saldo sekarang: **${formatIDR(balance.currentBalance)}**\n\n` +
        `Mulai sekarang Anda bisa langsung mencatat pengeluaran atau pemasukan secara natural!\n` +
        `Contoh: *"Beli bensin 30rb"*, *"Gaji 3 juta"*, atau kirim foto struk belanja.`,
        {
          parse_mode: 'Markdown',
          ...menuKeyboards.mainMenu(),
        }
      );
    } else {
      return await ctx.reply(
        `⚠️ Mohon masukkan nominal saldo awal Anda dengan jelas.\nContoh: *"2 juta"*, *"Rp 1.500.000"*, atau *"500rb"*.`
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
        `🤔 ${aiResult.clarificationNeeded}\n\n*Contoh: "Beli nasi goreng 20rb" atau "Gaji freelance 1,5 juta"*`,
        { parse_mode: 'Markdown' }
      );
    }

    // 4. Handle TRANSACTION (INCOME / EXPENSE)
    if (aiResult.intent === 'TRANSACTION' && aiResult.transaction?.amount) {
      const { type, amount, category, description, isExplicitDate, dateString } = aiResult.transaction;

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
        `✅ **Transaksi berhasil dicatat!**\n\n` +
        `${icon} **Jenis**: ${typeLabel}\n` +
        `📁 **Kategori**: ${tx.category}\n` +
        `📝 **Keterangan**: ${tx.description}\n` +
        `💵 **Nominal**: ${formatIDR(tx.amount)}\n\n` +
        `💎 **Saldo sekarang**: ${formatIDR(balance.currentBalance)}`;

      return await ctx.reply(replyMsg, {
        parse_mode: 'Markdown',
        ...menuKeyboards.mainMenu(),
      });
    }

    // 5. Handle INITIAL_BALANCE update
    if (aiResult.intent === 'INITIAL_BALANCE' && aiResult.initialBalance?.amount) {
      await transactionService.setInitialBalance(user.id, aiResult.initialBalance.amount);
      const balance = await transactionService.getBalance(user.id);

      return await ctx.reply(
        `✅ **Saldo awal berhasil diperbarui!**\n\n` +
        `🏦 Saldo awal baru: **${formatIDR(aiResult.initialBalance.amount)}**\n` +
        `💎 Saldo saat ini: **${formatIDR(balance.currentBalance)}**`,
        {
          parse_mode: 'Markdown',
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
          `🎯 **Target Tabungan Berhasil Dibuat!**\n\n` +
          `📌 Nama: **${goal.name}**\n` +
          `🎯 Target: **${formatIDR(targetAmount)}**\n\n` +
          `Ketik *"Nabung 100rb buat ${goal.name}"* setiap kali Anda menabung!`,
          {
            parse_mode: 'Markdown',
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
          `🎉 **Setoran Tabungan Berhasil!**\n\n` +
          `📌 Target: **${result.goal.name}**\n` +
          `💰 Disetor: **${formatIDR(amount)}**\n` +
          `📈 Terkumpul: **${formatIDR(result.goal.currentAmount)} / ${formatIDR(result.goal.targetAmount)}** (${progress}%)\n` +
          (result.goal.isCompleted ? `\n🏆 **SELAMAT! Target tabungan ini telah tercapai!** 🥳` : ''),
          {
            parse_mode: 'Markdown',
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
        `⏰ **Pengingat Berhasil Diatur!**\n\n` +
        `🔔 **Judul**: ${rem.title}\n` +
        `⏰ **Waktu**: ${rem.reminderTime} WITA (${rem.type})\n` +
        (rem.dayOfMonth ? `📅 Setiap tanggal: ${rem.dayOfMonth}\n\n` : '\n') +
        `Bot akan otomatis mengirimkan notifikasi pada jam tersebut.`,
        {
          parse_mode: 'Markdown',
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

    return await ctx.reply(insight, {
      parse_mode: 'Markdown',
      ...menuKeyboards.mainMenu(),
    });
  } catch (error) {
    logger.error('Error handling text message:', error.message);
    return await ctx.reply(
      '⚠️ Maaf, terjadi kesalahan saat memproses pesan Anda. Silakan coba kembali atau gunakan menu di bawah.',
      menuKeyboards.mainMenu()
    );
  }
}
