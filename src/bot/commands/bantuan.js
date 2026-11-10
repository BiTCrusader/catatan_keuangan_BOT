import { menuKeyboards } from '../keyboards/menuKeyboards.js';

export async function handleBantuan(ctx) {
  const helpText =
    `📖 <b>PANDUAN PENGGUNAAN BOT KEUANGAN</b>\n\n` +
    `Anda cukup berbicara atau mengetik santai dalam bahasa Indonesia, bot akan memprosesnya otomatis!\n\n` +
    `📌 <b>1. Catat Pengeluaran</b>\n` +
    `• Beli nasi padang 20rb\n` +
    `• Beli bensin 35 ribu\n` +
    `• Bayar tagihan wifi 350.000\n` +
    `• Kopi kenangan 18k\n\n` +
    `📌 <b>2. Catat Pemasukan</b>\n` +
    `• Gaji bulan ini 5 juta\n` +
    `• Dapat transfer 500rb dari teman\n` +
    `• Pemasukan freelance 1,5 jt\n\n` +
    `📌 <b>3. Scan Struk Belanja</b>\n` +
    `Cukup kirim foto struk (Indomaret, Alfamart, restoran, dll), bot akan mengekstrak total belanja dan meminta konfirmasi Anda sebelum disimpan.\n\n` +
    `📌 <b>4. Target Tabungan</b>\n` +
    `• Buat target tabungan Laptop 8 juta\n` +
    `• Nabung 100rb buat laptop\n\n` +
    `📌 <b>5. Pengingat</b>\n` +
    `• Ingatkan catat pengeluaran jam 20:00\n` +
    `• Ingatkan bayar kos tanggal 1 jam 08:00\n\n` +
    `📌 <b>6. Perintah Bot Cepat</b>\n` +
    `• /saldo - Cek ringkasan saldo Anda\n` +
    `• /hariini - Laporan keuangan hari ini\n` +
    `• /mingguini - Laporan minggu ini\n` +
    `• /bulanini - Laporan bulan berjalan\n` +
    `• /riwayat - Riwayat transaksi lengkap\n` +
    `• /tabungan - Kelola target tabungan\n` +
    `• /export - Ekspor file PDF & Excel\n` +
    `• /menu - Tampilkan menu tombol`;

  return await ctx.reply(helpText, {
    parse_mode: 'HTML',
    ...menuKeyboards.mainMenu(),
  });
}
