import { env } from '../../config/env.js';
import { callGemini, callGeminiVision } from './geminiProvider.js';
import { callGroq } from './groqProvider.js';
import { parseNaturalAmount } from '../../utils/currency.js';
import { logger } from '../../utils/logger.js';

const SYSTEM_PROMPT = `
Kamu adalah asisten keuangan AI cerdas berbahasa Indonesia.
Tugasmu adalah menganalisis pesan pengguna dan mengklasifikasikannya ke dalam format JSON yang tepat.

Kategori transaksi yang didukung:
- MAKANAN: Makanan, minuman, kopi, camilan, restoran, sembako dapur harian.
- TRANSPORTASI: Bensin, ojek online, parkir, tol, servis kendaraan, tiket kereta/pesawat.
- PENDIDIKAN: Kursus, buku, spp, perlengkapan kuliah/sekolah.
- HIBURAN: Nonton bioskop, game, langganan streaming (Netflix, Spotify), nongkrong.
- TAGIHAN: Listrik PLN, air PDAM, internet/wifi, pulsa, bpjs, sewa kos.
- KESEHATAN: Obat, dokter, rumah sakit, vitamin, suplemen.
- BELANJA: Baju, sepatu, gadget, aksesoris, perabotan.
- LAIN_LAIN: Kebutuhan lainnya yang tidak masuk kategori di atas.

Intent yang didukung:
1. "TRANSACTION": Pencatatan pengeluaran atau pemasukan.
2. "INITIAL_BALANCE": Pengaturan saldo awal akun.
3. "SAVINGS": Pembuatan target tabungan atau penambahan tabungan ke target.
4. "REMINDER": Pengaturan pengingat keuangan atau tagihan.
5. "QUERY": Pertanyaan umum mengenai keuangan atau saldo.
6. "UNKNOWN": Jika teks tidak dapat dipahami atau ambigu.

Format JSON yang HARUS dikembalikan:
{
  "intent": "TRANSACTION" | "INITIAL_BALANCE" | "SAVINGS" | "REMINDER" | "QUERY" | "UNKNOWN",
  "confidence": number (0.0 - 1.0),
  "transaction": {
    "type": "INCOME" | "EXPENSE" | null,
    "amount": number | null,
    "category": "MAKANAN" | "TRANSPORTASI" | "PENDIDIKAN" | "HIBURAN" | "TAGIHAN" | "KESEHATAN" | "BELANJA" | "LAIN_LAIN",
    "description": string,
    "isExplicitDate": boolean,
    "dateString": string | null
  },
  "initialBalance": {
    "amount": number | null
  },
  "savings": {
    "action": "CREATE_GOAL" | "CONTRIBUTE" | null,
    "goalName": string | null,
    "targetAmount": number | null,
    "amount": number | null
  },
  "reminder": {
    "title": string | null,
    "type": "DAILY" | "MONTHLY" | "BILL" | "SAVINGS" | "EXPENSE" | null,
    "time": string | null,
    "dayOfMonth": number | null
  },
  "clarificationNeeded": string | null
}

Aturan penting:
- Jangan pernah mengarang nominal jika tidak disebutkan. Jika nominal tidak ada, set amount = null dan berikan pesan pada clarificationNeeded.
- "Gaji 3 juta", "Dapat transfer 500rb", "Pemasukan freelance 1jt" adalah TRANSACTION bertipe INCOME.
- "Beli nasi goreng 20rb", "Beli bensin 30rb", "Kopi 18rb" adalah TRANSACTION bertipe EXPENSE.
- "Saldo awal 2 juta", "Uang saya sekarang 5 juta" adalah INITIAL_BALANCE.
- "Buat target laptop 8 juta" -> SAVINGS action CREATE_GOAL.
- "Nabung 100rb buat laptop" -> SAVINGS action CONTRIBUTE.
- Tanggal default adalah waktu sekarang kecuali pengguna menyebutkan "kemarin", "tadi pagi", dll.
`;

/**
 * Fallback regex-based parser if AI provider is down or limits exceeded.
 */
export function fallbackParse(text) {
  const lower = text.toLowerCase().trim();

  // 1. Initial balance check
  if (lower.includes('saldo awal') || lower.startsWith('uang saya sekarang') || lower.startsWith('mulai catat')) {
    const amountMatch = lower.match(/(\d+[\d.,]*\s*(?:juta|jt|ribu|rb|k|miliar|m)?)/i);
    const amount = amountMatch ? parseNaturalAmount(amountMatch[1]) : null;
    return {
      intent: 'INITIAL_BALANCE',
      confidence: 0.9,
      transaction: null,
      initialBalance: { amount },
      savings: null,
      reminder: null,
      clarificationNeeded: amount ? null : 'Berapa nominal saldo awal Anda?',
    };
  }

  // 2. Savings check
  if (lower.startsWith('buat target tabungan') || lower.startsWith('target tabungan')) {
    const nameMatch = lower.replace(/^(buat\s+)?target\s+tabungan\s+/i, '');
    const amountMatch = nameMatch.match(/(\d+[\d.,]*\s*(?:juta|jt|ribu|rb|k)?)/i);
    const targetAmount = amountMatch ? parseNaturalAmount(amountMatch[1]) : null;
    const goalName = nameMatch.replace(/(\d+[\d.,]*\s*(?:juta|jt|ribu|rb|k)?)/i, '').trim() || 'Tabungan';

    return {
      intent: 'SAVINGS',
      confidence: 0.85,
      transaction: null,
      initialBalance: null,
      savings: {
        action: 'CREATE_GOAL',
        goalName,
        targetAmount,
        amount: null,
      },
      reminder: null,
      clarificationNeeded: targetAmount ? null : 'Berapa target nominal tabungan Anda?',
    };
  }

  if (lower.startsWith('tambahkan tabungan') || lower.startsWith('nabung')) {
    const amountMatch = lower.match(/(\d+[\d.,]*\s*(?:juta|jt|ribu|rb|k)?)/i);
    const amount = amountMatch ? parseNaturalAmount(amountMatch[1]) : null;
    let goalName = 'Umum';
    const forMatch = lower.match(/(?:ke|untuk|buat)\s+(?:target\s+)?([a-zA-Z0-9_\s]+)/i);
    if (forMatch) {
      goalName = forMatch[1].trim();
    }

    return {
      intent: 'SAVINGS',
      confidence: 0.85,
      transaction: null,
      initialBalance: null,
      savings: {
        action: 'CONTRIBUTE',
        goalName,
        targetAmount: null,
        amount,
      },
      reminder: null,
      clarificationNeeded: amount ? null : 'Berapa jumlah yang ingin Anda tabung?',
    };
  }

  // 3. Income indicators
  const incomeKeywords = ['gaji', 'dapat uang', 'pemasukan', 'transfer masuk', 'jual', 'freelance', 'bonus', 'thr', 'kembalian'];
  const isIncome = incomeKeywords.some((kw) => lower.includes(kw));

  // 4. Amount parsing
  const amountMatch = lower.match(/(\d+[\d.,]*\s*(?:juta|jt|ribu|rb|k|miliar|m)?)/i);
  const amount = amountMatch ? parseNaturalAmount(amountMatch[1]) : null;

  if (amount) {
    let category = 'LAIN_LAIN';
    if (lower.includes('nasi') || lower.includes('makan') || lower.includes('kopi') || lower.includes('minum') || lower.includes('snack') || lower.includes('bakso') || lower.includes('ayam')) {
      category = 'MAKANAN';
    } else if (lower.includes('bensin') || lower.includes('gojek') || lower.includes('grab') || lower.includes('parkir') || lower.includes('tol') || lower.includes('transport')) {
      category = 'TRANSPORTASI';
    } else if (lower.includes('listrik') || lower.includes('wifi') || lower.includes('pulsa') || lower.includes('pdam') || lower.includes('tagihan') || lower.includes('kos')) {
      category = 'TAGIHAN';
    } else if (lower.includes('film') || lower.includes('bioskop') || lower.includes('game') || lower.includes('nongkrong') || lower.includes('netflix') || lower.includes('spotify')) {
      category = 'HIBURAN';
    } else if (lower.includes('obat') || lower.includes('dokter') || lower.includes('apotek') || lower.includes('vitamin')) {
      category = 'KESEHATAN';
    } else if (lower.includes('baju') || lower.includes('celana') || lower.includes('sepatu') || lower.includes('beli barang')) {
      category = 'BELANJA';
    } else if (lower.includes('buku') || lower.includes('kursus') || lower.includes('kuliah') || lower.includes('sekolah')) {
      category = 'PENDIDIKAN';
    }

    const type = isIncome ? 'INCOME' : 'EXPENSE';
    // Clean description
    const desc = text.trim();

    return {
      intent: 'TRANSACTION',
      confidence: 0.8,
      transaction: {
        type,
        amount,
        category,
        description: desc,
        isExplicitDate: false,
        dateString: null,
      },
      initialBalance: null,
      savings: null,
      reminder: null,
      clarificationNeeded: null,
    };
  }

  // 5. Unknown query
  return {
    intent: 'QUERY',
    confidence: 0.5,
    transaction: null,
    initialBalance: null,
    savings: null,
    reminder: null,
    clarificationNeeded: null,
    rawText: text,
  };
}

/**
 * Main AI Parsing function with robust fallback.
 */
export async function parseUserInputWithAI(text) {
  try {
    let rawOutput = '';
    const userPrompt = `Analisis teks keuangan berikut:\n"${text}"`;

    if (env.AI_PROVIDER === 'groq') {
      rawOutput = await callGroq(userPrompt, SYSTEM_PROMPT, true);
    } else {
      rawOutput = await callGemini(userPrompt, SYSTEM_PROMPT, true);
    }

    const parsed = JSON.parse(rawOutput);
    return parsed;
  } catch (error) {
    logger.warn('AI Parsing failed, falling back to rule-based parser:', error.message);
    return fallbackParse(text);
  }
}

/**
 * Financial summary generation based on strictly controlled numbers from the database.
 * AI is not allowed to query the DB directly or hallucinate numbers.
 */
export async function generateFinancialInsight(metrics) {
  const prompt = `
Berikut adalah data keuangan pengguna bulan ini:
- Total Pemasukan: ${metrics.formattedIncome}
- Total Pengeluaran: ${metrics.formattedExpense}
- Selisih / Net: ${metrics.formattedNet}
- Saldo Sekarang: ${metrics.formattedBalance}
- Pengeluaran Terbesar per Kategori: ${metrics.topCategoriesSummary || 'Belum ada data'}
- Jumlah Transaksi: ${metrics.transactionCount}

Berikan analisis keuangan singkat (maksimal 3-4 paragraf santai & membangun), rekomendasi menabung, dan evaluasi pengeluaran.
Gunakan bahasa Indonesia yang hangat dan solutif.
HANYA gunakan angka yang disediakan di atas, jangan mengarang angka lain.
`;

  try {
    let result = '';
    if (env.AI_PROVIDER === 'groq') {
      result = await callGroq(prompt, 'Kamu adalah konsultan keuangan pribadi yang bijak dan ramah.', false);
    } else {
      result = await callGemini(prompt, 'Kamu adalah konsultan keuangan pribadi yang bijak dan ramah.', false);
    }
    return result;
  } catch (error) {
    logger.warn('AI financial insight generation failed, returning standard template:', error.message);
    return `📊 **Ringkasan Keuangan Anda**:\n\n` +
      `• Pemasukan: ${metrics.formattedIncome}\n` +
      `• Pengeluaran: ${metrics.formattedExpense}\n` +
      `• Saldo Saat Ini: ${metrics.formattedBalance}\n\n` +
      `💡 *Tips*: Pertahankan rasio pengeluaran di bawah 70% dari pemasukan Anda untuk menyisihkan dana tabungan!`;
  }
}
