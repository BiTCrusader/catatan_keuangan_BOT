import { ocrService } from '../../services/ocr/ocrService.js';
import { formatIDR } from '../../utils/currency.js';
import { escapeHtml } from '../../utils/format.js';
import { menuKeyboards } from '../keyboards/menuKeyboards.js';
import { logger } from '../../utils/logger.js';

export async function handlePhotoMessage(ctx, bot) {
  const photos = ctx.message?.photo;
  if (!photos || photos.length === 0) return;

  // Telegram sends photos in multiple sizes; pick the largest
  const largestPhoto = photos[photos.length - 1];

  await ctx.reply('🔍 <i>Sedang memindai gambar struk dengan AI OCR...</i>', {
    parse_mode: 'HTML',
  });

  try {
    const imageBuffer = await ocrService.downloadTelegramPhoto(bot, largestPhoto.file_id);
    const result = await ocrService.scanReceipt(imageBuffer);

    if (!result.isClear || !result.totalAmount) {
      return await ctx.reply(
        '⚠️ <b>Nominal struk tidak terbaca jelas.</b>\n\n' +
        escapeHtml(result.notes || 'Pastikan foto struk memiliki pencahayaan cukup dan tidak blur.') +
        '\n\nSilakan catat manual dengan mengetik nominal, contoh:\n' +
        '<i>"Beli belanjaan 75rb"</i>\n' +
        'atau kirim ulang foto yang lebih jelas.',
        { parse_mode: 'HTML' }
      );
    }

    let preview = `🧾 <b>HASIL PEMINDAIAN STRUK PEMBAYARAN</b>\n\n`;
    preview += `🏪 <b>Toko / Merchant</b>: ${escapeHtml(result.merchantName || '-')}\n`;
    if (result.transactionDate) preview += `📅 <b>Tanggal</b>: ${escapeHtml(result.transactionDate)}\n`;
    preview += `💰 <b>Total Pembayaran</b>: <b>${formatIDR(result.totalAmount)}</b>\n`;
    preview += `📁 <b>Kategori</b>: ${escapeHtml(result.suggestedCategory || 'BELANJA')}\n\n`;

    if (result.items && result.items.length > 0) {
      preview += `🛒 <b>Daftar Barang (terbaca):</b>\n`;
      for (const item of result.items.slice(0, 5)) {
        preview += `• ${escapeHtml(item.name)}: ${formatIDR(item.price)}\n`;
      }
      if (result.items.length > 5) {
        preview += `• ...dan ${result.items.length - 5} barang lainnya.\n`;
      }
      preview += '\n';
    }

    preview += `Silakan periksa kembali data di atas. Apakah ingin disimpan?`;

    // Encode minimal payload for callback query (max 64 bytes in Telegram callback_data!)
    // Format: { a: amount, c: category, m: merchant, d: date }
    const payload = {
      amount: result.totalAmount,
      category: result.suggestedCategory || 'BELANJA',
      merchant: (result.merchantName || 'Struk').slice(0, 15),
      date: result.transactionDate || null,
    };
    const token = Buffer.from(JSON.stringify(payload)).toString('base64');

    // If base64 is longer than 50 chars, create a trimmed payload
    const compactToken = token.length <= 50 ? token : Buffer.from(JSON.stringify({
      amount: result.totalAmount,
      category: result.suggestedCategory || 'BELANJA',
    })).toString('base64');

    return await ctx.reply(preview, {
      parse_mode: 'HTML',
      ...menuKeyboards.confirmReceipt(compactToken),
    });
  } catch (error) {
    logger.error('Error handling photo message:', error.message);
    return await ctx.reply(
      '⚠️ Terjadi kegagalan saat membaca foto. Silakan kirim ulang atau catat transaksi secara manual.'
    );
  }
}
