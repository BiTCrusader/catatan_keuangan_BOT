import { transactionService } from '../../services/transaction/transactionService.js';
import { formatDate } from '../../utils/date.js';
import { formatIDR } from '../../utils/currency.js';
import { menuKeyboards } from '../keyboards/menuKeyboards.js';
import { env } from '../../config/env.js';

export async function handleRiwayat(ctx, page = 1) {
  const user = ctx.state.user;
  const tz = user.settings?.timezone || env.TIMEZONE;
  const history = await transactionService.getHistory(user.id, { page, limit: 5 });

  if (history.totalCount === 0) {
    return await ctx.reply(
      '📜 **RIWAYAT TRANSAKSI**\n\n' +
      'Belum ada transaksi yang tercatat.\n\n' +
      'Mulai catat dengan mengetik:\n' +
      '• *"Beli makan siang 25rb"*\n' +
      '• *"Gaji 3 juta"*',
      {
        parse_mode: 'Markdown',
        ...menuKeyboards.mainMenu(),
      }
    );
  }

  let text = `📜 **RIWAYAT TRANSAKSI (Halaman ${history.page}/${history.totalPages})**\n`;
  text += `Total Transaksi: ${history.totalCount}\n\n`;

  for (const t of history.transactions) {
    const isIncome = t.type === 'INCOME';
    const icon = isIncome ? '🟢' : '🔴';
    const typeLabel = isIncome ? 'Pemasukan' : 'Pengeluaran';
    const shortId = t.id.slice(-4);

    text += `${icon} **[#${shortId}]** ${formatDate(t.transactionDate, tz, 'DD/MM HH:mm')}\n`;
    text += `   • ${typeLabel} (${t.category})\n`;
    text += `   • ${t.description}: **${formatIDR(t.amount)}**\n\n`;
  }

  return await ctx.reply(text, {
    parse_mode: 'Markdown',
    ...menuKeyboards.historyPagination(history.page, history.totalPages, history.transactions),
  });
}
