import { handleSaldo } from '../commands/saldo.js';
import { handleStart } from '../commands/start.js';
import {
  handleLaporanHariIni,
  handleLaporanMingguIni,
  handleLaporanBulanIni,
} from '../commands/laporan.js';
import { handleRiwayat } from '../commands/riwayat.js';
import { handleTabungan } from '../commands/tabungan.js';
import { handlePengingat } from '../commands/pengingat.js';
import { handleBantuan } from '../commands/bantuan.js';
import { handleExportMenu } from '../commands/export.js';
import { transactionService } from '../../services/transaction/transactionService.js';
import { reportService } from '../../services/report/reportService.js';
import { generateFinancialInsight } from '../../services/ai/aiService.js';
import { pdfService } from '../../services/export/pdfService.js';
import { excelService } from '../../services/export/excelService.js';
import { formatIDR } from '../../utils/currency.js';
import { menuKeyboards } from '../keyboards/menuKeyboards.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';

export async function handleCallbackQuery(ctx) {
  const data = ctx.callbackQuery?.data;
  const user = ctx.state.user;

  if (!data) return;

  try {
    // Always acknowledge callback query to dismiss loading clock in Telegram UI
    await ctx.answerCbQuery().catch(() => {});

    // 1. Navigation Menus
    if (data === 'menu_main') return await handleStart(ctx);
    if (data === 'menu_saldo') return await handleSaldo(ctx);
    if (data === 'menu_report_today') return await handleLaporanHariIni(ctx);
    if (data === 'menu_report_week') return await handleLaporanMingguIni(ctx);
    if (data === 'menu_report_month') return await handleLaporanBulanIni(ctx);
    if (data === 'menu_history') return await handleRiwayat(ctx, 1);
    if (data === 'menu_savings') return await handleTabungan(ctx);
    if (data === 'menu_reminders') return await handlePengingat(ctx);
    if (data === 'menu_help') return await handleBantuan(ctx);
    if (data === 'menu_export') return await handleExportMenu(ctx);

    if (data === 'savings_new_help') {
      return await ctx.reply(
        '💡 **Cara Membuat Target Tabungan:**\n\n' +
        'Ketik di chat:\n' +
        '• *"Buat target tabungan Laptop 8 juta"*\n' +
        '• *"Buat target tabungan Liburan 5.000.000"*\n\n' +
        'Lalu tambah tabungan dengan cara:\n' +
        '• *"Nabung 200rb buat laptop"*',
        { parse_mode: 'Markdown' }
      );
    }

    // 2. History Pagination
    if (data.startsWith('hist_page_')) {
      const page = parseInt(data.replace('hist_page_', ''), 10) || 1;
      return await handleRiwayat(ctx, page);
    }

    // 3. Delete Transaction Prompt
    if (data.startsWith('del_tx_')) {
      const txId = data.replace('del_tx_', '');
      const tx = await transactionService.getTransactionById(txId, user.id);
      if (!tx) {
        return await ctx.reply('⚠️ Transaksi tidak ditemukan.');
      }

      return await ctx.reply(
        `⚠️ **Konfirmasi Hapus Transaksi**\n\n` +
        `Keterangan: **${tx.description}**\n` +
        `Nominal: **${formatIDR(tx.amount)}** (${tx.type})\n\n` +
        `Apakah Anda yakin ingin membatalkan/menghapus transaksi ini?`,
        {
          parse_mode: 'Markdown',
          ...menuKeyboards.confirmDelete(tx.id),
        }
      );
    }

    // 4. Confirm Delete Transaction
    if (data.startsWith('confirm_del_')) {
      const txId = data.replace('confirm_del_', '');
      await transactionService.deleteTransaction(txId, user.id);
      const balance = await transactionService.getBalance(user.id);

      return await ctx.reply(
        `🗑 **Transaksi berhasil dibatalkan/dihapus!**\n\n` +
        `💎 Saldo sekarang: **${formatIDR(balance.currentBalance)}**`,
        {
          parse_mode: 'Markdown',
          ...menuKeyboards.mainMenu(),
        }
      );
    }

    // 5. AI Insight Button
    if (data === 'menu_ai_insight') {
      await ctx.reply('🤖 *AI sedang menganalisis data keuangan Anda...*', { parse_mode: 'Markdown' });

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
    }

    // 6. Export PDF
    if (data === 'export_pdf') {
      await ctx.reply('⏳ *Sedang menyusun file PDF laporan keuangan Anda...*', { parse_mode: 'Markdown' });
      const tz = user.settings?.timezone || env.TIMEZONE;
      const pdfBuffer = await pdfService.generateTransactionPDF(user.id, tz);

      return await ctx.replyWithDocument(
        {
          source: pdfBuffer,
          filename: `Laporan_Keuangan_${new Date().toISOString().slice(0, 10)}.pdf`,
        },
        {
          caption: '📄 Laporan Keuangan Pribadi (PDF)',
        }
      );
    }

    // 7. Export Excel
    if (data === 'export_excel') {
      await ctx.reply('⏳ *Sedang menyusun file Excel laporan keuangan Anda...*', { parse_mode: 'Markdown' });
      const tz = user.settings?.timezone || env.TIMEZONE;
      const excelBuffer = await excelService.generateTransactionExcel(user.id, tz);

      return await ctx.replyWithDocument(
        {
          source: excelBuffer,
          filename: `Riwayat_Transaksi_${new Date().toISOString().slice(0, 10)}.xlsx`,
        },
        {
          caption: '📊 Data Transaksi Keuangan Lengkap (Excel)',
        }
      );
    }

    // 8. OCR Receipt Actions
    if (data.startsWith('rcpt_save_')) {
      // payload format: rcpt_save_<base64 encoded JSON>
      const encoded = data.replace('rcpt_save_', '');
      const jsonStr = Buffer.from(encoded, 'base64').toString('utf-8');
      const rcpt = JSON.parse(jsonStr);

      const tx = await transactionService.createTransaction({
        userId: user.id,
        type: 'EXPENSE',
        category: rcpt.category || 'BELANJA',
        amount: rcpt.amount,
        description: rcpt.merchant ? `Struk ${rcpt.merchant}` : 'Struk Belanja',
        transactionDate: rcpt.date ? new Date(rcpt.date) : new Date(),
      });

      const balance = await transactionService.getBalance(user.id);

      return await ctx.reply(
        `✅ **Struk berhasil disimpan!**\n\n` +
        `🏪 Toko: **${rcpt.merchant || 'Toko'}**\n` +
        `💵 Total: **${formatIDR(tx.amount)}**\n` +
        `📁 Kategori: ${tx.category}\n\n` +
        `💎 Saldo sekarang: **${formatIDR(balance.currentBalance)}**`,
        {
          parse_mode: 'Markdown',
          ...menuKeyboards.mainMenu(),
        }
      );
    }

    if (data === 'rcpt_cancel') {
      return await ctx.reply('❌ Pencatatan struk dibatalkan.');
    }
  } catch (error) {
    logger.error('Error handling callback query:', error.message);
    return await ctx.reply('⚠️ Terjadi kendala saat memproses permintaan.');
  }
}
