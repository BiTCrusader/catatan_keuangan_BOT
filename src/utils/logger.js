/**
 * Logger that automatically scrubs credentials, bot tokens, and database passwords from output.
 */

function sanitize(message) {
  if (typeof message !== 'string') {
    try {
      message = JSON.stringify(message);
    } catch {
      return String(message);
    }
  }

  // Mask Telegram Bot Token (e.g., 123456789:AA...)
  message = message.replace(/\d{8,10}:[a-zA-Z0-9_-]{35}/g, '[MASKED_BOT_TOKEN]');

  // Mask PostgreSQL connection password (e.g. postgresql://user:pass@host/db)
  message = message.replace(/(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@.+)/g, '$1[MASKED_DB_PASS]$3');

  // Mask API Keys (e.g. AIzaSy..., gsk_...)
  message = message.replace(/AIzaSy[a-zA-Z0-9_-]{33}/g, '[MASKED_GEMINI_KEY]');
  message = message.replace(/gsk_[a-zA-Z0-9_-]{30,}/g, '[MASKED_GROQ_KEY]');

  return message;
}

export const logger = {
  info: (msg, ...args) => {
    console.log(`[INFO] ${sanitize(msg)}`, ...args.map(sanitize));
  },
  warn: (msg, ...args) => {
    console.warn(`[WARN] ${sanitize(msg)}`, ...args.map(sanitize));
  },
  error: (msg, ...args) => {
    console.error(`[ERROR] ${sanitize(msg)}`, ...args.map(sanitize));
  },
  debug: (msg, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${sanitize(msg)}`, ...args.map(sanitize));
    }
  },
};
