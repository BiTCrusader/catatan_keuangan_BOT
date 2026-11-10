import { describe, it, expect } from 'vitest';
import { reportService } from '../src/services/report/reportService.js';

describe('Financial Report Service', () => {
  it('formats report message with positive net and category breakdown', () => {
    const mockReport = {
      period: 'Bulan Ini',
      dateRangeStr: 'November 2026',
      metrics: {
        totalIncome: 5000000,
        totalExpense: 2000000,
        net: 3000000,
        transactionCount: 5,
        categoryBreakdown: [
          { category: 'MAKANAN', amount: 1200000, percentage: '60.0' },
          { category: 'TRANSPORTASI', amount: 800000, percentage: '40.0' },
        ],
      },
      balance: {
        currentBalance: 8000000,
      },
      comparison: {
        previousExpense: 2500000,
        expenseDiff: -500000,
      },
    };

    const text = reportService.formatReportMessage(mockReport);
    expect(text).toContain('LAPORAN KEUANGAN (BULAN INI)');
    expect(text).toContain('MAKANAN: Rp\u00a01.200.000 (60.0%)');
    expect(text).toContain('TRANSPORTASI: Rp\u00a0800.000 (40.0%)');
    expect(text).toContain('Pengeluaran hemat 20% dibanding periode sebelumnya');
    expect(text).toContain('<b>Saldo Saat Ini</b>: Rp\u00a08.000.000');
  });
});
