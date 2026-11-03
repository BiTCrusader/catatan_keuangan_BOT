import { describe, it, expect } from 'vitest';
import { formatIDR, parseNaturalAmount } from '../src/utils/currency.js';

describe('Currency Utility', () => {
  it('formats numbers into Indonesian Rupiah format correctly', () => {
    expect(formatIDR(0)).toBe('Rp\u00a00');
    expect(formatIDR(20000)).toBe('Rp\u00a020.000');
    expect(formatIDR(1500000)).toBe('Rp\u00a01.500.000');
    expect(formatIDR(-50000)).toBe('-Rp\u00a050.000');
  });

  it('parses natural language amounts accurately', () => {
    expect(parseNaturalAmount('2 juta')).toBe(2000000);
    expect(parseNaturalAmount('1,5 juta')).toBe(1500000);
    expect(parseNaturalAmount('1.5jt')).toBe(1500000);
    expect(parseNaturalAmount('500 ribu')).toBe(500000);
    expect(parseNaturalAmount('500rb')).toBe(500000);
    expect(parseNaturalAmount('50k')).toBe(50000);
    expect(parseNaturalAmount('10rb')).toBe(10000);
    expect(parseNaturalAmount('Rp 25.000')).toBe(25000);
    expect(parseNaturalAmount('15000')).toBe(15000);
    expect(parseNaturalAmount('5.500.000')).toBe(5500000);
  });

  it('returns null for unparseable or zero amounts', () => {
    expect(parseNaturalAmount('')).toBe(null);
    expect(parseNaturalAmount('halo apa kabar')).toBe(null);
  });
});
