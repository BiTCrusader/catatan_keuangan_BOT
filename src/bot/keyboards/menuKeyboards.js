import { Markup } from 'telegraf';

export const menuKeyboards = {
  /**
   * Main Interactive Menu Keyboard
   */
  mainMenu() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('💰 Cek Saldo', 'menu_saldo'),
        Markup.button.callback('📊 Laporan Bulan Ini', 'menu_report_month'),
      ],
      [
        Markup.button.callback('📅 Hari Ini', 'menu_report_today'),
        Markup.button.callback('📆 Minggu Ini', 'menu_report_week'),
      ],
      [
        Markup.button.callback('📜 Riwayat Transaksi', 'menu_history'),
        Markup.button.callback('🎯 Target Tabungan', 'menu_savings'),
      ],
      [
        Markup.button.callback('📥 Ekspor Data', 'menu_export'),
        Markup.button.callback('💡 Ringkasan AI', 'menu_ai_insight'),
      ],
      [
        Markup.button.callback('⏰ Pengingat', 'menu_reminders'),
        Markup.button.callback('❓ Bantuan', 'menu_help'),
      ],
    ]);
  },

  /**
   * Quick action buttons for balance view
   */
  saldoMenu() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('📊 Laporan Lengkap', 'menu_report_month'),
        Markup.button.callback('📜 Riwayat', 'menu_history'),
      ],
      [
        Markup.button.callback('📥 Unduh Excel', 'export_excel'),
        Markup.button.callback('🔙 Menu Utama', 'menu_main'),
      ],
    ]);
  },

  /**
   * Report period selection
   */
  reportMenu() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('📅 Hari Ini', 'menu_report_today'),
        Markup.button.callback('📆 Minggu Ini', 'menu_report_week'),
        Markup.button.callback('📊 Bulan Ini', 'menu_report_month'),
      ],
      [
        Markup.button.callback('🤖 Analisis AI', 'menu_ai_insight'),
        Markup.button.callback('📥 Ekspor PDF', 'export_pdf'),
      ],
      [Markup.button.callback('🔙 Menu Utama', 'menu_main')],
    ]);
  },

  /**
   * Pagination keyboard for transaction history
   */
  historyPagination(currentPage, totalPages, transactions = []) {
    const rows = [];

    // Optional delete action buttons for the listed transactions on this page
    if (transactions.length > 0) {
      const delRow = transactions.slice(0, 3).map((t, idx) => {
        return Markup.button.callback(`🗑 Hapus #${t.id.slice(-4)}`, `del_tx_${t.id}`);
      });
      rows.push(delRow);
    }

    // Pagination controls
    const navRow = [];
    if (currentPage > 1) {
      navRow.push(Markup.button.callback('⬅️ Sebelumnya', `hist_page_${currentPage - 1}`));
    }
    navRow.push(Markup.button.callback(`📄 ${currentPage} / ${totalPages}`, 'noop'));
    if (currentPage < totalPages) {
      navRow.push(Markup.button.callback('Selanjutnya ➡️', `hist_page_${currentPage + 1}`));
    }
    rows.push(navRow);

    rows.push([
      Markup.button.callback('📥 Unduh Excel', 'export_excel'),
      Markup.button.callback('🔙 Menu Utama', 'menu_main'),
    ]);

    return Markup.inlineKeyboard(rows);
  },

  /**
   * Delete confirmation keyboard
   */
  confirmDelete(transactionId) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Ya, Hapus Transaksi', `confirm_del_${transactionId}`),
        Markup.button.callback('❌ Batal', 'menu_history'),
      ],
    ]);
  },

  /**
   * OCR Receipt confirmation keyboard
   */
  confirmReceipt(receiptDataToken) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Ya, Simpan Transaksi', `rcpt_save_${receiptDataToken}`),
        Markup.button.callback('❌ Batalkan', 'rcpt_cancel'),
      ],
    ]);
  },

  /**
   * Export format choices
   */
  exportMenu() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('📄 Ekspor PDF', 'export_pdf'),
        Markup.button.callback('📊 Ekspor Excel (XLSX)', 'export_excel'),
      ],
      [Markup.button.callback('🔙 Menu Utama', 'menu_main')],
    ]);
  },

  /**
   * Savings quick menu
   */
  savingsMenu() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('➕ Buat Target Baru', 'savings_new_help'),
        Markup.button.callback('🔙 Menu Utama', 'menu_main'),
      ],
    ]);
  },
};
