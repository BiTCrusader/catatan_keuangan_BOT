import { reminderService } from '../../services/reminder/reminderService.js';
import { menuKeyboards } from '../keyboards/menuKeyboards.js';

export async function handlePengingat(ctx) {
  const user = ctx.state.user;
  const reminders = await reminderService.getUserReminders(user.id);

  let text = '⏰ **DAFTAR PENGINGAT KEUANGAN**\n\n';

  if (reminders.length === 0) {
    text += 'Anda belum memiliki pengingat aktif.\n\n';
  } else {
    for (const r of reminders) {
      const statusIcon = r.isActive ? '🟢 Aktif' : '⚪ Nonaktif';
      text += `🔔 **${r.title}** (${statusIcon})\n`;
      text += `• Waktu: ${r.reminderTime} WITA (${r.type})\n`;
      if (r.dayOfMonth) text += `• Tanggal: Setiap tanggal ${r.dayOfMonth}\n`;
      text += '\n';
    }
  }

  text +=
    '💡 **Cara Menambah Pengingat:**\n' +
    'Ketik dengan bahasa alami:\n' +
    '• *"Ingatkan catat keuangan jam 20:00"*\n' +
    '• *"Ingatkan bayar wifi tanggal 15 jam 09:00"*\n' +
    '• *"Ingatkan menabung setiap hari jam 21:00"*';

  return await ctx.reply(text, {
    parse_mode: 'Markdown',
    ...menuKeyboards.mainMenu(),
  });
}
