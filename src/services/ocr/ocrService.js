import { callGeminiVision } from '../ai/geminiProvider.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';

const OCR_PROMPT = `
Kamu adalah sistem OCR struk belanja & faktur pembayaran berbahasa Indonesia.
Baca struk pada gambar ini dengan sangat teliti.

Ekstrak informasi ke dalam format JSON berikut:
{
  "isReceipt": boolean,
  "isClear": boolean,
  "merchantName": string | null,
  "transactionDate": string | null (format YYYY-MM-DD jika terbaca),
  "totalAmount": number | null,
  "items": [
    {
      "name": string,
      "price": number
    }
  ],
  "suggestedCategory": "MAKANAN" | "BELANJA" | "KESEHATAN" | "TRANSPORTASI" | "TAGIHAN" | "LAIN_LAIN",
  "notes": string | null
}

Aturan penting:
- totalAmount HARUS angka murni (misal 54000, bukan "54.000").
- Jika nominal tidak terbaca jelas atau blur, set isClear = false dan totalAmount = null.
- Jangan pernah mengarang angka jika tidak terbaca.
`;

export const ocrService = {
  /**
   * Downloads photo from Telegram Bot API into an in-memory Buffer
   */
  async downloadTelegramPhoto(bot, fileId) {
    const fileLink = await bot.telegram.getFileLink(fileId);
    const response = await fetch(fileLink.href);
    if (!response.ok) {
      throw new Error(`Gagal mengunduh gambar struk dari Telegram: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  },

  /**
   * Performs AI OCR on receipt buffer
   */
  async scanReceipt(imageBuffer, mimeType = 'image/jpeg') {
    try {
      if (env.AI_PROVIDER !== 'gemini') {
        // Groq text-only fallback: inform user
        return {
          isReceipt: true,
          isClear: false,
          merchantName: 'Struk Belanja',
          totalAmount: null,
          items: [],
          suggestedCategory: 'BELANJA',
          notes: 'OCR struk memerlukan Gemini Vision API. Silakan masukkan nominal secara manual.',
        };
      }

      const rawJson = await callGeminiVision(OCR_PROMPT, imageBuffer, mimeType);
      const parsed = JSON.parse(rawJson);
      return parsed;
    } catch (error) {
      logger.error('OCR processing error:', error.message);
      return {
        isReceipt: false,
        isClear: false,
        merchantName: null,
        totalAmount: null,
        items: [],
        suggestedCategory: 'LAIN_LAIN',
        notes: 'Gagal memproses gambar struk. Silakan coba lagi atau catat manual.',
      };
    }
  },
};
