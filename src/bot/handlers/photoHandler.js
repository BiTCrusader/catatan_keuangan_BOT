import { ocrService } from '../../services/ocr/ocrService.js';
import { formatIDR } from '../../utils/currency.js';
import { menuKeyboards } from '../keyboards/menuKeyboards.js';
import { logger } from '../../utils/logger.js';

export async function handlePhotoMessage(ctx, bot) {
  const photos = ctx.message?.photo;
  if (!photos || photos.length === 0) return;

  // Telegram sends photos in multiple sizes; pick the largest
  const largestPhoto = photos[photos.length - 1];

  await ctx.reply('🔍 *Sedang memindai gambar struk dengan AI OCR...*', {
    parse_mode: 'Markdown',
  });

  try {
    const imageBuffer = await ocrService.downloadTelegramPhoto(bot, largestPhoto.file_id);
    const result = await ocrService.scanReceipt(imageBuffer);

    if (!result.isClear || !result.totalAmount) {
      return await ctx.reply(
        '⚠️ **Nominal struk tidak terbaca jelas.**\n\n' +
        (result.notes || 'Pastikan foto struk memiliki pencahayaan cukup dan tidak blur.') +
        '\n\nSilakan catat manual dengan mengetik nominal, contoh:\n' +
        '*"Beli belanjaan 75rb"*\n' +
        'atau kirim ulang foto yang lebih jelas.',
        { parse_mode: 'Markdown' }
      );
    }

    let preview = `🧾 **HASIL PEMINDAIAN STRUK PEMBAYARAN**\n\n`;
    preview += `🏪 **Toko / Merchant**: ${result.merchantName || '-'}\n`;
    if (result.transactionDate) preview += `📅 **Tanggal**: ${result.transactionDate}\n`;
    preview += `💰 **Total Pembayaran**: **${formatIDR(result.totalAmount)}**\n`;
    preview += `📁 **Kategori**: ${result.suggestedCategory || 'BELANJA'}\n\n`;

    if (result.items && result.items.length > 0) {
      preview += `🛒 **Daftar Barang (terbaca):**\n`;
      for (const item of result.items.slice(0, 5)) {
        preview += `• ${item.name}: ${formatIDR(item.price)}\n`;
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
      parse_mode: 'Markdown',
      ...menuKeyboards.confirmReceipt(compactToken),
    });
  } catch (error) {
    logger.error('Error handling photo message:', error.message);
    return await ctx.reply(
      '⚠️ Terjadi kegagalan saat membaca foto. Silakan kirim ulang atau catat transaksi secara manual.'
    );
  }
}
