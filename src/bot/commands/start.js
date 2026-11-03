import { formatIDR } from '../../utils/currency.js';
import { menuKeyboards } from '../keyboards/menuKeyboards.js';
import { transactionService } from '../../services/transaction/transactionService.js';

export async function handleStart(ctx) {
  const user = ctx.state.user;
  const firstName = ctx.from?.first_name || 'Teman';

  if (!user.isRegistered) {
    const welcomeMsg =
      `👋 **Halo, ${firstName}! Selamat datang di AI Personal Finance Bot!**\n\n` +
      `Saya adalah asisten keuangan pribadi cerdas Anda yang siap membantu mencatat, menganalisis, dan memantau keuangan Anda setiap hari.\n\n` +
      `🆔 **Telegram ID**: \`${user.telegramId}\`\n\n` +
      `⚠️ **Langkah Awal:**\n` +
      `Anda belum mengatur saldo awal. Silakan ketik saldo awal Anda dengan bahasa alami.\n\n` +
      `Contoh:\n` +
      `• *"Saldo awal saya 2 juta"*\n` +
      `• *"Uang saya sekarang 5.500.000"*\n` +
      `• *"Mulai catat keuangan dengan saldo 1jt"*`;

    return await ctx.reply(welcomeMsg, { parse_mode: 'Markdown' });
  }

  const balance = await transactionService.getBalance(user.id);

  const registeredMsg =
    `👋 **Selamat datang kembali, ${firstName}!**\n\n` +
    `💰 **Saldo Saat Ini**: ${formatIDR(balance.currentBalance)}\n` +
    `🟢 **Pemasukan**: ${formatIDR(balance.totalIncome)}\n` +
    `🔴 **Pengeluaran**: ${formatIDR(balance.totalExpense)}\n\n` +
    `💡 *Anda bisa langsung mengetik transaksi seperti:*\n` +
    `• *"Beli makan siang 25rb"*\n` +
    `• *"Gaji freelance 1,5 juta"*\n` +
    `• Atau kirim foto struk belanja untuk scan otomatis!\n\n` +
    `Pilih menu di bawah untuk fitur lainnya:`;

  return await ctx.reply(registeredMsg, {
    parse_mode: 'Markdown',
    ...menuKeyboards.mainMenu(),
  });
}
