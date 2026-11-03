import { describe, it, expect } from 'vitest';
import { getTodayRange, getThisMonthRange, formatDate } from '../src/utils/date.js';

describe('Date & Timezone Utility (Asia/Makassar)', () => {
  it('formats dates in Asia/Makassar timezone correctly', () => {
    // 2026-11-03 00:00:00 UTC = 2026-11-03 08:00:00 WITA (UTC+8)
    const utcDate = new Date('2026-11-03T00:00:00.000Z');
    const formatted = formatDate(utcDate, 'Asia/Makassar', 'YYYY-MM-DD HH:mm');
    expect(formatted).toBe('2026-11-03 08:00');
  });

  it('produces valid today range bounds', () => {
    const { start, end } = getTodayRange('Asia/Makassar');
    expect(start).toBeInstanceOf(Date);
    expect(end).toBeInstanceOf(Date);
    expect(start.getTime()).toBeLessThan(end.getTime());
  });

  it('produces valid month range bounds', () => {
    const { start, end } = getThisMonthRange('Asia/Makassar');
    expect(start.getDate()).toBe(1);
    expect(start.getTime()).toBeLessThan(end.getTime());
  });
});
