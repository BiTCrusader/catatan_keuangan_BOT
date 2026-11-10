import { menuKeyboards } from '../keyboards/menuKeyboards.js';

export async function handleExportMenu(ctx) {
  return await ctx.reply(
    '📥 <b>EKSPOR LAPORAN KEUANGAN</b>\n\n' +
    'Silakan pilih format laporan yang ingin Anda unduh:\n\n' +
    '• <b>PDF</b>: Dokumen siap cetak dan mudah dibaca.\n' +
    '• <b>Excel (XLSX)</b>: Spreadsheet lengkap dengan rumus dan rincian data transaksi.',
    {
      parse_mode: 'HTML',
      ...menuKeyboards.exportMenu(),
    }
  );
}
