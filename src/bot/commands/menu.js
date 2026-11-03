import { menuKeyboards } from '../keyboards/menuKeyboards.js';

export async function handleMenu(ctx) {
  const firstName = ctx.from?.first_name || 'Teman';
  return await ctx.reply(
    `📋 **MENU UTAMA KEUANGAN**\n\nHalo ${firstName}, silakan pilih menu yang ingin Anda akses:`,
    {
      parse_mode: 'Markdown',
      ...menuKeyboards.mainMenu(),
    }
  );
}
