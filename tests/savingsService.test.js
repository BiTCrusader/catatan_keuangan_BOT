import { describe, it, expect } from 'vitest';
import { savingsService } from '../src/services/savings/savingsService.js';

describe('Savings Goal Calculations', () => {
  it('correctly calculates remaining amount and percentage', () => {
    const goals = [
      {
        id: 'goal-1',
        name: 'Laptop ROG',
        targetAmount: 10000000,
        currentAmount: 2500000,
        isCompleted: false,
        numericTarget: 10000000,
        numericCurrent: 2500000,
        remaining: 7500000,
        progress: 25,
      },
    ];

    const formatted = savingsService.formatGoalsMessage(goals);
    expect(formatted).toContain('Laptop ROG');
    expect(formatted).toContain('25%');
    expect(formatted).toContain('Rp\u00a07.500.000');
  });

  it('handles empty savings goal list gracefully', () => {
    const formatted = savingsService.formatGoalsMessage([]);
    expect(formatted).toContain('Anda belum memiliki target tabungan');
  });
});
