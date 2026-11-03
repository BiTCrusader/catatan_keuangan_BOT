import PDFDocument from 'pdfkit';
import { prisma } from '../../config/database.js';
import { formatDate } from '../../utils/date.js';
import { formatIDR } from '../../utils/currency.js';

export const pdfService = {
  /**
   * Generates a PDF report as an in-memory Buffer
   */
  async generateTransactionPDF(userId, tz = 'Asia/Makassar') {
    const [user, transactions] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.transaction.findMany({
        where: { userId, isDeleted: false },
        orderBy: { transactionDate: 'desc' },
        take: 100, // Safe limit for clean PDF presentation
      }),
    ]);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        // Header Banner
        doc
          .fillColor('#1E3A8A')
          .fontSize(20)
          .font('Helvetica-Bold')
          .text('LAPORAN KEUANGAN PRIBADI', { align: 'center' });

        doc
          .fillColor('#64748B')
          .fontSize(10)
          .font('Helvetica')
          .text(`Dihasilkan otomatis oleh AI Personal Finance Bot`, { align: 'center' })
          .moveDown(1.5);

        // User info box
        doc
          .fillColor('#1E293B')
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(`Nama Pengguna: ${user.firstName || 'Telegram User'} (@${user.username || '-'})`)
          .font('Helvetica')
          .text(`Tanggal Cetak: ${formatDate(new Date(), tz)}`)
          .moveDown(1);

        // Calculate Totals
        let totalIncome = 0;
        let totalExpense = 0;
        for (const t of transactions) {
          const amt = Number(t.amount);
          if (t.type === 'INCOME') totalIncome += amt;
          else totalExpense += amt;
        }

        // Summary Card
        const summaryY = doc.y;
        doc.rect(40, summaryY, 515, 50).fillAndStroke('#F1F5F9', '#CBD5E1');

        doc
          .fillColor('#16A34A')
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(`Total Pemasukan: ${formatIDR(totalIncome)}`, 55, summaryY + 12);

        doc
          .fillColor('#DC2626')
          .text(`Total Pengeluaran: ${formatIDR(totalExpense)}`, 55, summaryY + 28);

        doc
          .fillColor('#0F172A')
          .text(`Saldo Bersih: ${formatIDR(totalIncome - totalExpense)}`, 320, summaryY + 20);

        doc.moveDown(4);

        // Table Header
        const tableTop = doc.y + 15;
        doc.rect(40, tableTop, 515, 20).fill('#2563EB');

        doc
          .fillColor('#FFFFFF')
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('TANGGAL', 45, tableTop + 5)
          .text('TIPE', 140, tableTop + 5)
          .text('KATEGORI', 200, tableTop + 5)
          .text('KETERANGAN', 280, tableTop + 5)
          .text('NOMINAL', 450, tableTop + 5, { width: 100, align: 'right' });

        let currentY = tableTop + 24;

        // Table Rows
        doc.font('Helvetica').fontSize(8.5);

        for (const t of transactions) {
          if (currentY > 740) {
            doc.addPage();
            currentY = 40;
          }

          const amt = Number(t.amount);
          const isIncome = t.type === 'INCOME';

          doc
            .fillColor('#334155')
            .text(formatDate(t.transactionDate, tz, 'DD/MM/YY HH:mm'), 45, currentY)
            .fillColor(isIncome ? '#16A34A' : '#DC2626')
            .text(isIncome ? 'PEMASUKAN' : 'PENGELUARAN', 140, currentY)
            .fillColor('#334155')
            .text(t.category, 200, currentY)
            .text(t.description.slice(0, 30), 280, currentY)
            .fillColor(isIncome ? '#16A34A' : '#DC2626')
            .text(formatIDR(amt), 450, currentY, { width: 100, align: 'right' });

          doc
            .strokeColor('#E2E8F0')
            .lineWidth(0.5)
            .moveTo(40, currentY + 14)
            .lineTo(555, currentY + 14)
            .stroke();

          currentY += 18;
        }

        // Footer
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          doc
            .fillColor('#94A3B8')
            .fontSize(8)
            .text(`Halaman ${i + 1} dari ${pageCount}`, 40, 800, { align: 'center', width: 515 });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  },
};
