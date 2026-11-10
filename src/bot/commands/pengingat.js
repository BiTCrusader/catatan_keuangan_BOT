import { reminderService } from '../../services/reminder/reminderService.js';
import { menuKeyboards } from '../keyboards/menuKeyboards.js';
import { escapeHtml } from '../../utils/format.js';

export async function handlePengingat(ctx) {
  const user = ctx.state.user;
  const reminders = await reminderService.getUserReminders(user.id);

  let text = '⏰ <b>DAFTAR PENGINGAT KEUANGAN</b>\n\n';

  if (reminders.length === 0) {
    text += 'Anda belum memiliki pengingat aktif.\n\n';
  } else {
    for (const r of reminders) {
      const statusIcon = r.isActive ? '🟢 Aktif' : '⚪ Nonaktif';
      text += `🔔 <b>${escapeHtml(r.title)}</b> (${statusIcon})\n`;
      text += `• Waktu: ${escapeHtml(r.reminderTime)} WITA (${escapeHtml(r.type)})\n`;
      if (r.dayOfMonth) text += `• Tanggal: Setiap tanggal ${r.dayOfMonth}\n`;
      text += '\n';
    }
  }

  text +=
    '💡 <b>Cara Menambah Pengingat:</b>\n' +
    'Ketik dengan bahasa alami:\n' +
    '• <i>"Ingatkan catat keuangan jam 20:00"</i>\n' +
    '• <i>"Ingatkan bayar wifi tanggal 15 jam 09:00"</i>\n' +
    '• <i>"Ingatkan menabung setiap hari jam 21:00"</i>';

  return await ctx.reply(text, {
    parse_mode: 'HTML',
    ...menuKeyboards.mainMenu(),
  });
}
