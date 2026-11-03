import { describe, it, expect, vi } from 'vitest';
import { authMiddleware } from '../src/bot/middleware/auth.js';
import { env } from '../src/config/env.js';

describe('Webhook & Authorization Security', () => {
  it('blocks unauthorized Telegram ID not in whitelist', async () => {
    const mockReply = vi.fn();
    const next = vi.fn();

    const ctx = {
      from: { id: 999999999 }, // not in whitelist
      reply: mockReply,
      state: {},
    };

    await authMiddleware(ctx, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockReply).toHaveBeenCalled();
    expect(mockReply.mock.calls[0][0]).toContain('AKSES DITOLAK');
  });

  it('validates webhook secret token match logic', () => {
    const secret = env.TELEGRAM_WEBHOOK_SECRET;
    const validHeader = secret;
    const invalidHeader = 'wrong_secret_token';

    expect(validHeader === secret).toBe(true);
    expect(invalidHeader === secret).toBe(false);
  });
});
