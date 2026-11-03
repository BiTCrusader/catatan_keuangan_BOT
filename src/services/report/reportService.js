import { prisma } from '../../config/database.js';
import { getTodayRange, getThisWeekRange, getThisMonthRange, getLastMonthRange, dayjs } from '../../utils/date.js';
import { formatIDR } from '../../utils/currency.js';
import { transactionService } from '../transaction/transactionService.js';

export const reportService = {
  /**
   * Generates aggregated statistics for a specific date range
   */
  async getMetricsForRange(userId, startDate, endDate) {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        isDeleted: false,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryBreakdown = {};

    for (const t of transactions) {
      const amt = Number(t.amount);
      if (t.type === 'INCOME') {
        totalIncome += amt;
      } else {
        totalExpense += amt;
        categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + amt;
      }
    }

    const net = totalIncome - totalExpense;

    // Sort categories descending
    const sortedCategories = Object.entries(categoryBreakdown)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalIncome,
      totalExpense,
      net,
      transactionCount: transactions.length,
      categoryBreakdown: sortedCategories,
    };
  },

  /**
   * Daily report (`/hariini`)
   */
  async getDailyReport(userId, tz = 'Asia/Makassar') {
    const { start, end } = getTodayRange(tz);
    const metrics = await this.getMetricsForRange(userId, start, end);
    const balance = await transactionService.getBalance(userId);

    // Yesterday comparison
    const yesterdayStart = dayjs(start).subtract(1, 'day').toDate();
    const yesterdayEnd = dayjs(end).subtract(1, 'day').toDate();
    const yesterdayMetrics = await this.getMetricsForRange(userId, yesterdayStart, yesterdayEnd);

    return {
      period: 'Hari Ini',
      dateRangeStr: dayjs().tz(tz).format('dddd, DD MMMM YYYY'),
      metrics,
      balance,
      comparison: {
        previousExpense: yesterdayMetrics.totalExpense,
        expenseDiff: metrics.totalExpense - yesterdayMetrics.totalExpense,
      },
    };
  },

  /**
   * Weekly report (`/mingguini`)
   */
  async getWeeklyReport(userId, tz = 'Asia/Makassar') {
    const { start, end } = getThisWeekRange(tz);
    const metrics = await this.getMetricsForRange(userId, start, end);
    const balance = await transactionService.getBalance(userId);

    return {
      period: 'Minggu Ini',
      dateRangeStr: `${dayjs(start).tz(tz).format('DD MMM')} - ${dayjs(end).tz(tz).format('DD MMM YYYY')}`,
      metrics,
      balance,
    };
  },

  /**
   * Monthly report (`/bulanini` or `/laporan`)
   */
  async getMonthlyReport(userId, tz = 'Asia/Makassar') {
    const { start, end } = getThisMonthRange(tz);
    const metrics = await this.getMetricsForRange(userId, start, end);
    const balance = await transactionService.getBalance(userId);

    // Last month comparison
    const { start: lastStart, end: lastEnd } = getLastMonthRange(tz);
    const lastMonthMetrics = await this.getMetricsForRange(userId, lastStart, lastEnd);

    return {
      period: 'Bulan Ini',
      dateRangeStr: dayjs().tz(tz).format('MMMM YYYY'),
      metrics,
      balance,
      comparison: {
        previousExpense: lastMonthMetrics.totalExpense,
        expenseDiff: metrics.totalExpense - lastMonthMetrics.totalExpense,
      },
    };
  },

  /**
   * Formats report data into friendly Indonesian Telegram message
   */
  formatReportMessage(reportData) {
    const { period, dateRangeStr, metrics, balance, comparison } = reportData;

    let msg = `📊 **LAPORAN KEUANGAN (${period.toUpperCase()})**\n`;
    msg += `📅 *${dateRangeStr}*\n\n`;

    msg += `🟢 **Total Pemasukan**: ${formatIDR(metrics.totalIncome)}\n`;
    msg += `🔴 **Total Pengeluaran**: ${formatIDR(metrics.totalExpense)}\n`;
    msg += `⚖️ **Selisih**: ${formatIDR(metrics.net)}\n\n`;

    if (metrics.categoryBreakdown.length > 0) {
      msg += `📁 **Rincian Pengeluaran per Kategori:**\n`;
      for (const cat of metrics.categoryBreakdown) {
        msg += `• ${cat.category}: ${formatIDR(cat.amount)} (${cat.percentage}%)\n`;
      }
      msg += '\n';
    } else {
      msg += `📁 Belum ada pengeluaran pada periode ini.\n\n`;
    }

    if (comparison && comparison.previousExpense > 0) {
      const diff = comparison.expenseDiff;
      const pct = Math.abs(Math.round((diff / comparison.previousExpense) * 100));
      if (diff > 0) {
        msg += `📈 Pengeluaran naik ${pct}% dibanding periode sebelumnya (+${formatIDR(diff)})\n\n`;
      } else if (diff < 0) {
        msg += `📉 Pengeluaran hemat ${pct}% dibanding periode sebelumnya (-${formatIDR(Math.abs(diff))})\n\n`;
      }
    }

    msg += `💰 **Saldo Saat Ini**: ${formatIDR(balance.currentBalance)}`;
    return msg;
  },
};
