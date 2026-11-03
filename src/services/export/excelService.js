import ExcelJS from 'exceljs';
import { prisma } from '../../config/database.js';
import { formatDate } from '../../utils/date.js';

export const excelService = {
  /**
   * Generates an Excel report as an in-memory Buffer
   */
  async generateTransactionExcel(userId, tz = 'Asia/Makassar') {
    const [user, transactions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          isDeleted: false,
        },
        orderBy: { transactionDate: 'desc' },
      }),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AI Personal Finance Bot';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Riwayat Transaksi');

    // Title rows
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'LAPORAN RIWAYAT TRANSAKSI KEUANGAN';
    titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 32;

    sheet.mergeCells('A2:F2');
    const subtitleCell = sheet.getCell('A2');
    subtitleCell.value = `Pengguna: ${user.firstName || 'Telegram User'} (@${user.username || '-'}) | Diunduh: ${formatDate(new Date(), tz)}`;
    subtitleCell.font = { italic: true, size: 10 };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 20;

    // Header row
    const headers = ['No', 'Tanggal', 'Tipe', 'Kategori', 'Keterangan', 'Nominal (IDR)'];
    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    headerRow.height = 24;

    headerRow.eachCell((cell) => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'medium' },
        right: { style: 'thin' },
      };
    });

    // Data rows
    let rowIdx = 1;
    let totalIncome = 0;
    let totalExpense = 0;

    for (const t of transactions) {
      const amt = Number(t.amount);
      if (t.type === 'INCOME') totalIncome += amt;
      else totalExpense += amt;

      const row = sheet.addRow([
        rowIdx++,
        formatDate(t.transactionDate, tz),
        t.type === 'INCOME' ? 'PEMASUKAN' : 'PENGELUARAN',
        t.category,
        t.description,
        amt,
      ]);

      row.height = 20;

      // Colorize type
      const typeCell = row.getCell(3);
      if (t.type === 'INCOME') {
        typeCell.font = { color: { argb: 'FF16A34A' }, bold: true };
      } else {
        typeCell.font = { color: { argb: 'FFDC2626' }, bold: true };
      }

      // Format currency
      const amountCell = row.getCell(6);
      amountCell.numFmt = '"Rp "#,##0';
      amountCell.alignment = { horizontal: 'right' };
    }

    // Summary section
    sheet.addRow([]);
    const summaryRow1 = sheet.addRow(['', '', '', '', 'TOTAL PEMASUKAN', totalIncome]);
    summaryRow1.font = { bold: true, color: { argb: 'FF16A34A' } };
    summaryRow1.getCell(6).numFmt = '"Rp "#,##0';

    const summaryRow2 = sheet.addRow(['', '', '', '', 'TOTAL PENGELUARAN', totalExpense]);
    summaryRow2.font = { bold: true, color: { argb: 'FFDC2626' } };
    summaryRow2.getCell(6).numFmt = '"Rp "#,##0';

    const net = totalIncome - totalExpense;
    const summaryRow3 = sheet.addRow(['', '', '', '', 'SELISIH (NET)', net]);
    summaryRow3.font = { bold: true };
    summaryRow3.getCell(6).numFmt = '"Rp "#,##0';

    // Auto-fit columns
    sheet.columns = [
      { width: 8 },  // No
      { width: 22 }, // Tanggal
      { width: 16 }, // Tipe
      { width: 18 }, // Kategori
      { width: 35 }, // Keterangan
      { width: 20 }, // Nominal
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  },
};
