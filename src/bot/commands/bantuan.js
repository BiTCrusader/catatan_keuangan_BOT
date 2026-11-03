import { menuKeyboards } from '../keyboards/menuKeyboards.js';

export async function handleBantuan(ctx) {
  const helpText =
    `📖 **PANDUAN PENGGUNAAN BOT KEUANGAN**\n\n` +
    `Anda cukup berbicara atau mengetik santai dalam bahasa Indonesia, bot akan memprosesnya otomatis!\n\n` +
    `📌 **1. Catat Pengeluaran**\n` +
    `• Beli nasi padang 20rb\n` +
    `• Beli bensin 35 ribu\n` +
    `• Bayar tagihan wifi 350.000\n` +
    `• Kopi kenangan 18k\n\n` +
    `📌 **2. Catat Pemasukan**\n` +
    `• Gaji bulan ini 5 juta\n` +
    `• Dapat transfer 500rb dari teman\n` +
    `• Pemasukan freelance 1,5 jt\n\n` +
    `📌 **3. Scan Struk Belanja**\n` +
    `Cukup kirim foto struk (Indomaret, Alfamart, restoran, dll), bot akan mengekstrak total belanja dan meminta konfirmasi Anda sebelum disimpan.\n\n` +
    `📌 **4. Target Tabungan**\n` +
    `• Buat target tabungan Laptop 8 juta\n` +
    `• Nabung 100rb buat laptop\n\n` +
    `📌 **5. Pengingat**\n` +
    `• Ingatkan catat pengeluaran jam 20:00\n` +
    `• Ingatkan bayar kos tanggal 1 jam 08:00\n\n` +
    `📌 **6. Perintah Bot Cepat**\n` +
    `• /saldo - Cek ringkasan saldo Anda\n` +
    `• /hariini - Laporan keuangan hari ini\n` +
    `• /mingguini - Laporan minggu ini\n` +
    `• /bulanini - Laporan bulan berjalan\n` +
    `• /riwayat - Riwayat transaksi lengkap\n` +
    `• /tabungan - Kelola target tabungan\n` +
    `• /export - Ekspor file PDF & Excel\n` +
    `• /menu - Tampilkan menu tombol`;

  return await ctx.reply(helpText, {
    parse_mode: 'Markdown',
    ...menuKeyboards.mainMenu(),
  });
}
