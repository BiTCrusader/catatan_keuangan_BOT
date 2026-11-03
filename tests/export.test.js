import { describe, it, expect, vi } from 'vitest';
import { excelService } from '../src/services/export/excelService.js';
import { pdfService } from '../src/services/export/pdfService.js';
import { prisma } from '../src/config/database.js';

describe('Export Service (PDF & Excel)', () => {
  it('generates an Excel buffer with correct xlsx signature', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 'usr_test',
      firstName: 'Budi',
      username: 'budi_finance',
    });

    vi.spyOn(prisma.transaction, 'findMany').mockResolvedValue([
      {
        id: 'tx_1',
        type: 'INCOME',
        category: 'LAIN_LAIN',
        amount: 5000000,
        description: 'Gaji Bulanan',
        transactionDate: new Date('2026-11-01T08:00:00Z'),
      },
      {
        id: 'tx_2',
        type: 'EXPENSE',
        category: 'MAKANAN',
        amount: 50000,
        description: 'Makan Siang',
        transactionDate: new Date('2026-11-02T12:00:00Z'),
      },
    ]);

    const buffer = await excelService.generateTransactionExcel('usr_test', 'Asia/Makassar');
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(100);
    // Excel xlsx files start with ZIP signature PK\x03\x04
    expect(buffer[0]).toBe(0x50); // 'P'
    expect(buffer[1]).toBe(0x4b); // 'K'
  });

  it('generates a PDF buffer with valid PDF header (%PDF-)', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      id: 'usr_test',
      firstName: 'Budi',
      username: 'budi_finance',
    });

    vi.spyOn(prisma.transaction, 'findMany').mockResolvedValue([
      {
        id: 'tx_1',
        type: 'INCOME',
        category: 'LAIN_LAIN',
        amount: 5000000,
        description: 'Gaji Bulanan',
        transactionDate: new Date('2026-11-01T08:00:00Z'),
      },
    ]);

    const buffer = await pdfService.generateTransactionPDF('usr_test', 'Asia/Makassar');
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(200);
    // PDF files start with %PDF-
    const header = buffer.subarray(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');
  });
});
