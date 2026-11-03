import { transactionService } from '../../services/transaction/transactionService.js';
import { formatIDR } from '../../utils/currency.js';
import { menuKeyboards } from '../keyboards/menuKeyboards.js';

export async function handleSaldo(ctx) {
  const user = ctx.state.user;
  const balance = await transactionService.getBalance(user.id);

  const msg =
    `💰 **RINGKASAN SALDO KEUANGAN**\n\n` +
    `🏦 **Saldo Awal**: ${formatIDR(balance.initialBalance)}\n` +
    `🟢 **Total Pemasukan**: ${formatIDR(balance.totalIncome)}\n` +
    `🔴 **Total Pengeluaran**: ${formatIDR(balance.totalExpense)}\n` +
    `──────────────────\n` +
    `💎 **SALDO SEKARANG**: ${formatIDR(balance.currentBalance)}\n\n` +
    `💡 *Tips*: Ketik pemasukan atau pengeluaran secara langsung untuk memperbarui saldo.`;

  return await ctx.reply(msg, {
    parse_mode: 'Markdown',
    ...menuKeyboards.saldoMenu(),
  });
}
