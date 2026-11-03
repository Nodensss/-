export const parseInput = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};
export const formatNumber = (value: number, decimals = 0): string => value.toFixed(decimals);
export const formatDecimal = (value: number, decimals = 0): string => value.toFixed(decimals).replace('.', ',');
export function formatDuration(hours: number | null): string {
  if (hours === null || !Number.isFinite(hours) || hours < 0) return '—';
  const minutes = Math.floor(hours * 60 + 1e-6);
  return `${Math.floor(minutes / 60)} ч ${String(minutes % 60).padStart(2, '0')} мин`;
}
export function formatClock(time: number): string {
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(time);
}
export function formatEnd(time: number | null, now: number): string {
  if (time === null || !Number.isFinite(time)) return '—';
  const parts = (value: number) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value).map(part => [part.type, part.value]));
  const date = parts(time), today = parts(now);
  const dayNumber = (p: Record<string, string>) => Date.UTC(+p.year, +p.month - 1, +p.day) / 86400000;
  const days = dayNumber(date) - dayNumber(today);
  const prefix = days === 0 ? '' : days === 1 ? 'завтра ' : `${date.day}.${date.month} `;
  return prefix + formatClock(time);
}
