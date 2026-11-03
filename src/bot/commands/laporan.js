import { reportService } from '../../services/report/reportService.js';
import { menuKeyboards } from '../keyboards/menuKeyboards.js';
import { env } from '../../config/env.js';

export async function handleLaporanHariIni(ctx) {
  const user = ctx.state.user;
  const tz = user.settings?.timezone || env.TIMEZONE;
  const report = await reportService.getDailyReport(user.id, tz);
  const text = reportService.formatReportMessage(report);

  return await ctx.reply(text, {
    parse_mode: 'Markdown',
    ...menuKeyboards.reportMenu(),
  });
}

export async function handleLaporanMingguIni(ctx) {
  const user = ctx.state.user;
  const tz = user.settings?.timezone || env.TIMEZONE;
  const report = await reportService.getWeeklyReport(user.id, tz);
  const text = reportService.formatReportMessage(report);

  return await ctx.reply(text, {
    parse_mode: 'Markdown',
    ...menuKeyboards.reportMenu(),
  });
}

export async function handleLaporanBulanIni(ctx) {
  const user = ctx.state.user;
  const tz = user.settings?.timezone || env.TIMEZONE;
  const report = await reportService.getMonthlyReport(user.id, tz);
  const text = reportService.formatReportMessage(report);

  return await ctx.reply(text, {
    parse_mode: 'Markdown',
    ...menuKeyboards.reportMenu(),
  });
}
