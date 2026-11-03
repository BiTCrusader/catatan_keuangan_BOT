import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { env } from '../config/env.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_TZ = env.TIMEZONE || 'Asia/Makassar';

export function getNow(tz = DEFAULT_TZ) {
  return dayjs().tz(tz);
}

export function formatDate(date, tz = DEFAULT_TZ, format = 'DD/MM/YYYY HH:mm') {
  if (!date) return '-';
  return dayjs(date).tz(tz).format(format);
}

export function formatShortDate(date, tz = DEFAULT_TZ) {
  if (!date) return '-';
  return dayjs(date).tz(tz).format('DD MMM YYYY');
}

export function getTodayRange(tz = DEFAULT_TZ) {
  const start = dayjs().tz(tz).startOf('day').toDate();
  const end = dayjs().tz(tz).endOf('day').toDate();
  return { start, end };
}

export function getThisWeekRange(tz = DEFAULT_TZ) {
  const start = dayjs().tz(tz).startOf('week').toDate();
  const end = dayjs().tz(tz).endOf('week').toDate();
  return { start, end };
}

export function getThisMonthRange(tz = DEFAULT_TZ) {
  const start = dayjs().tz(tz).startOf('month').toDate();
  const end = dayjs().tz(tz).endOf('month').toDate();
  return { start, end };
}

export function getLastMonthRange(tz = DEFAULT_TZ) {
  const lastMonth = dayjs().tz(tz).subtract(1, 'month');
  const start = lastMonth.startOf('month').toDate();
  const end = lastMonth.endOf('month').toDate();
  return { start, end };
}

export { dayjs };
