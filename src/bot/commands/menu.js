import { menuKeyboards } from '../keyboards/menuKeyboards.js';
import { escapeHtml } from '../../utils/format.js';

export async function handleMenu(ctx) {
  const firstName = escapeHtml(ctx.from?.first_name || 'Teman');
  return await ctx.reply(
    `📋 <b>MENU UTAMA KEUANGAN</b>\n\nHalo ${firstName}, silakan pilih menu yang ingin Anda akses:`,
    {
      parse_mode: 'HTML',
      ...menuKeyboards.mainMenu(),
    }
  );
}
