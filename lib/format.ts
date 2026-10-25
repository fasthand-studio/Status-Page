const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatUptime(percent: number | null): string {
  if (percent === null || Number.isNaN(percent)) return '—';
  if (percent >= 100) return '100%';
  const truncated = Math.floor(Math.max(0, percent) * 100) / 100;
  return `${truncated.toFixed(2).replace(/\.?0+$/, '')}%`;
}

export function formatPercent(percent: number | null): string {
  return formatUptime(percent);
}

export function formatRelativeTime(iso: string | null, now: Date = new Date()): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'unknown';

  const delta = Math.round((then - now.getTime()) / 1000);
  const future = delta > 0;
  const seconds = Math.abs(delta);

  let value: number;
  let unit: string;

  if (seconds < 45) {
    return future ? 'in a moment' : 'just now';
  } else if (seconds < HOUR) {
    value = Math.round(seconds / MINUTE);
    unit = 'min';
  } else if (seconds < DAY) {
    value = Math.round(seconds / HOUR);
    unit = 'hr';
  } else {
    value = Math.round(seconds / DAY);
    unit = 'day';
  }

  const plural = value === 1 ? '' : 's';
  return future ? `in ${value} ${unit}${plural}` : `${value} ${unit}${plural} ago`;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(date) + ' UTC';
}

export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(date);
}

export function formatDayLabel(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return day;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatMonthLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  if (seconds < MINUTE) return `${Math.round(seconds)} sec`;
  if (seconds < HOUR) return `${Math.round(seconds / MINUTE)} min`;
  if (seconds < DAY) {
    const hours = Math.floor(seconds / HOUR);
    const minutes = Math.round((seconds % HOUR) / MINUTE);
    return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
  }
  const days = Math.floor(seconds / DAY);
  const hours = Math.round((seconds % DAY) / HOUR);
  return hours > 0 ? `${days} day${days === 1 ? '' : 's'} ${hours} hr` : `${days} day${days === 1 ? '' : 's'}`;
}

export function formatWindow(startIso: string, endIso: string): string {
  return `${formatDateTime(startIso)} → ${formatDateTime(endIso)}`;
}

export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function daysAgo(days: number, now: Date = new Date()): Date {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

export function secondsSince(iso: string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 1000));
}

export function plural(count: number, singular: string, pluralWord = `${singular}s`): string {
  return count === 1 ? singular : pluralWord;
}

export function markdownExcerpt(markdown: string, maxLength = 220): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .split('\n')
    .map((line) => line.replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/, ''))
    .join(' ')
    .replace(/[*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}
