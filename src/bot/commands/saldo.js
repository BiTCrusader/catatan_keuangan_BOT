import { transactionService } from '../../services/transaction/transactionService.js';
import { formatIDR } from '../../utils/currency.js';
import { menuKeyboards } from '../keyboards/menuKeyboards.js';

export async function handleSaldo(ctx) {
  const user = ctx.state.user;
  const balance = await transactionService.getBalance(user.id);

  const msg =
    `💰 <b>RINGKASAN SALDO KEUANGAN</b>\n\n` +
    `🏦 <b>Saldo Awal</b>: ${formatIDR(balance.initialBalance)}\n` +
    `🟢 <b>Total Pemasukan</b>: ${formatIDR(balance.totalIncome)}\n` +
    `🔴 <b>Total Pengeluaran</b>: ${formatIDR(balance.totalExpense)}\n` +
    `──────────────────\n` +
    `💎 <b>SALDO SEKARANG</b>: ${formatIDR(balance.currentBalance)}\n\n` +
    `💡 <i>Tips</i>: Ketik pemasukan atau pengeluaran secara langsung untuk memperbarui saldo.`;

  return await ctx.reply(msg, {
    parse_mode: 'HTML',
    ...menuKeyboards.saldoMenu(),
  });
}
