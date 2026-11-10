import { transactionService } from '../../services/transaction/transactionService.js';
import { formatDate } from '../../utils/date.js';
import { formatIDR } from '../../utils/currency.js';
import { escapeHtml } from '../../utils/format.js';
import { menuKeyboards } from '../keyboards/menuKeyboards.js';
import { env } from '../../config/env.js';

export async function handleRiwayat(ctx, page = 1) {
  const user = ctx.state.user;
  const tz = user.settings?.timezone || env.TIMEZONE;
  const history = await transactionService.getHistory(user.id, { page, limit: 5 });

  if (history.totalCount === 0) {
    return await ctx.reply(
      '📜 <b>RIWAYAT TRANSAKSI</b>\n\n' +
      'Belum ada transaksi yang tercatat.\n\n' +
      'Mulai catat dengan mengetik:\n' +
      '• <i>"Beli makan siang 25rb"</i>\n' +
      '• <i>"Gaji 3 juta"</i>',
      {
        parse_mode: 'HTML',
        ...menuKeyboards.mainMenu(),
      }
    );
  }

  let text = `📜 <b>RIWAYAT TRANSAKSI (Halaman ${history.page}/${history.totalPages})</b>\n`;
  text += `Total Transaksi: ${history.totalCount}\n\n`;

  for (const t of history.transactions) {
    const isIncome = t.type === 'INCOME';
    const icon = isIncome ? '🟢' : '🔴';
    const typeLabel = isIncome ? 'Pemasukan' : 'Pengeluaran';
    const shortId = escapeHtml(t.id.slice(-4));
    const desc = escapeHtml(t.description);
    const cat = escapeHtml(t.category);

    text += `${icon} <b>[#${shortId}]</b> ${formatDate(t.transactionDate, tz, 'DD/MM HH:mm')}\n`;
    text += `   • ${typeLabel} (${cat})\n`;
    text += `   • ${desc}: <b>${formatIDR(t.amount)}</b>\n\n`;
  }

  return await ctx.reply(text, {
    parse_mode: 'HTML',
    ...menuKeyboards.historyPagination(history.page, history.totalPages, history.transactions),
  });
}
