import { menuKeyboards } from '../keyboards/menuKeyboards.js';

export async function handleExportMenu(ctx) {
  return await ctx.reply(
    '📥 **EKSPOR LAPORAN KEUANGAN**\n\n' +
    'Silakan pilih format laporan yang ingin Anda unduh:\n\n' +
    '• **PDF**: Dokumen siap cetak dan mudah dibaca.\n' +
    '• **Excel (XLSX)**: Spreadsheet lengkap dengan rumus dan rincian data transaksi.',
    {
      parse_mode: 'Markdown',
      ...menuKeyboards.exportMenu(),
    }
  );
}
