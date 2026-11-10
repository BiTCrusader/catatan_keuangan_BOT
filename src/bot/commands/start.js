import { formatIDR } from '../../utils/currency.js';
import { menuKeyboards } from '../keyboards/menuKeyboards.js';
import { transactionService } from '../../services/transaction/transactionService.js';
import { escapeHtml } from '../../utils/format.js';

export async function handleStart(ctx) {
  const user = ctx.state.user;
  const firstName = escapeHtml(ctx.from?.first_name || 'Teman');

  if (!user.isRegistered) {
    const welcomeMsg =
      `👋 <b>Halo, ${firstName}! Selamat datang di AI Personal Finance Bot!</b>\n\n` +
      `Saya adalah asisten keuangan pribadi cerdas Anda yang siap membantu mencatat, menganalisis, dan memantau keuangan Anda setiap hari.\n\n` +
      `🆔 <b>Telegram ID</b>: <code>${escapeHtml(user.telegramId)}</code>\n\n` +
      `⚠️ <b>Langkah Awal:</b>\n` +
      `Anda belum mengatur saldo awal. Silakan ketik saldo awal Anda dengan bahasa alami.\n\n` +
      `Contoh:\n` +
      `• <i>"Saldo awal saya 2 juta"</i>\n` +
      `• <i>"Uang saya sekarang 5.500.000"</i>\n` +
      `• <i>"Mulai catat keuangan dengan saldo 1jt"</i>`;

    return await ctx.reply(welcomeMsg, { parse_mode: 'HTML' });
  }

  const balance = await transactionService.getBalance(user.id);

  const registeredMsg =
    `👋 <b>Selamat datang kembali, ${firstName}!</b>\n\n` +
    `💰 <b>Saldo Saat Ini</b>: ${formatIDR(balance.currentBalance)}\n` +
    `🟢 <b>Pemasukan</b>: ${formatIDR(balance.totalIncome)}\n` +
    `🔴 <b>Pengeluaran</b>: ${formatIDR(balance.totalExpense)}\n\n` +
    `💡 <i>Anda bisa langsung mengetik transaksi seperti:</i>\n` +
    `• <i>"Beli makan siang 25rb"</i>\n` +
    `• <i>"Gaji freelance 1,5 juta"</i>\n` +
    `• Atau kirim foto struk belanja untuk scan otomatis!\n\n` +
    `Pilih menu di bawah untuk fitur lainnya:`;

  return await ctx.reply(registeredMsg, {
    parse_mode: 'HTML',
    ...menuKeyboards.mainMenu(),
  });
}
