/**
 * Utility functions for Indonesian Rupiah (IDR) currency formatting and parsing.
 * Handles Decimal, number, and natural language values (e.g. "2 juta", "500 ribu", "50k").
 */

export function formatIDR(amount) {
  if (amount === null || amount === undefined) return 'Rp0';
  const numeric = typeof amount === 'object' && amount.toNumber ? amount.toNumber() : Number(amount);
  if (isNaN(numeric)) return 'Rp0';

  const isNegative = numeric < 0;
  const absVal = Math.abs(numeric);
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absVal);

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Parses natural language monetary amount in Indonesian.
 * Examples:
 * - "2 juta" -> 2000000
 * - "1,5 jt" -> 1500000
 * - "500 ribu" -> 500000
 * - "50k" -> 50000
 * - "10rb" -> 10000
 * - "Rp 25.000" -> 25000
 */
export function parseNaturalAmount(text) {
  if (!text) return null;
  const clean = text.toLowerCase().trim().replace(/rp\.?\s*/g, '');

  // Check for combined patterns like "1.5 juta" or "1,5jt" or "500 rb"
  const jtRegex = /^(\d+(?:[.,]\d+)?)\s*(?:juta|jt)$/i;
  const rbRegex = /^(\d+(?:[.,]\d+)?)\s*(?:ribu|rb|k)$/i;
  const mRegex = /^(\d+(?:[.,]\d+)?)\s*(?:m|milyar|miliar)$/i;

  const jtMatch = clean.match(jtRegex);
  if (jtMatch) {
    const val = parseFloat(jtMatch[1].replace(',', '.'));
    return Math.round(val * 1000000);
  }

  const rbMatch = clean.match(rbRegex);
  if (rbMatch) {
    const val = parseFloat(rbMatch[1].replace(',', '.'));
    return Math.round(val * 1000);
  }

  const mMatch = clean.match(mRegex);
  if (mMatch) {
    const val = parseFloat(mMatch[1].replace(',', '.'));
    return Math.round(val * 1000000000);
  }

  // Standard numeric with dots / commas
  // e.g. "50.000" or "50000"
  // If it matches an Indonesian phone number (starting with 08, 9-14 digits), ignore as currency
  if (/^08\d{8,12}$/.test(clean.replace(/[\s.-]/g, ''))) {
    return null;
  }

  const numericOnly = clean.replace(/\./g, '').replace(/,/g, '.');
  const parsed = parseFloat(numericOnly);
  if (!isNaN(parsed) && parsed > 0) {
    // Postgres Decimal(15, 2) maximum is 9,999,999,999,999
    if (parsed > 9999999999999) return null;
    return Math.round(parsed);
  }

  return null;
}
