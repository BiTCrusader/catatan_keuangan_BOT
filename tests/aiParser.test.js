import { describe, it, expect } from 'vitest';
import { fallbackParse } from '../src/services/ai/aiService.js';

describe('Fallback Rule-based NLP Parser', () => {
  it('parses initial balance intent', () => {
    const res = fallbackParse('Saldo awal saya 2 juta');
    expect(res.intent).toBe('INITIAL_BALANCE');
    expect(res.initialBalance.amount).toBe(2000000);
  });

  it('parses expense transaction with food category', () => {
    const res = fallbackParse('Beli nasi goreng 20rb');
    expect(res.intent).toBe('TRANSACTION');
    expect(res.transaction.type).toBe('EXPENSE');
    expect(res.transaction.amount).toBe(20000);
    expect(res.transaction.category).toBe('MAKANAN');
  });

  it('parses expense transaction with transport category', () => {
    const res = fallbackParse('Beli bensin 30 ribu');
    expect(res.intent).toBe('TRANSACTION');
    expect(res.transaction.type).toBe('EXPENSE');
    expect(res.transaction.amount).toBe(30000);
    expect(res.transaction.category).toBe('TRANSPORTASI');
  });

  it('parses income transaction', () => {
    const res = fallbackParse('Gaji freelance 1,5 juta');
    expect(res.intent).toBe('TRANSACTION');
    expect(res.transaction.type).toBe('INCOME');
    expect(res.transaction.amount).toBe(1500000);
  });

  it('parses savings goal creation', () => {
    const res = fallbackParse('Buat target tabungan Laptop 8 juta');
    expect(res.intent).toBe('SAVINGS');
    expect(res.savings.action).toBe('CREATE_GOAL');
    expect(res.savings.targetAmount).toBe(8000000);
  });

  it('parses savings contribution', () => {
    const res = fallbackParse('Nabung 100rb buat laptop');
    expect(res.intent).toBe('SAVINGS');
    expect(res.savings.action).toBe('CONTRIBUTE');
    expect(res.savings.amount).toBe(100000);
  });
});
