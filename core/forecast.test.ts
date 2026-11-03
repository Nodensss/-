import { describe, it, expect } from 'vitest';
import { forecast, PAIR_321, PAIR_315, parseInput, formatDuration, formatEnd } from './index';
const now = new Date(2026, 10, 3, 8, 0).getTime();
const base = { sourceLevelMm: 500, feedLevel: 45, ratePerHour: 2.5, targetMm: 160, batchMm: 382, now };
describe('Регрессия ядра', () => {
  it('Б1: 321→323', () => {
    const r = forecast(PAIR_321, base);
    expect(r.hoursBefore).toBe(6); expect(r.sourceMm).toBe(340);
    expect(r.addedFeed).toBeCloseTo(33.822, 2); expect(r.finalLevel).toBeCloseTo(78.822, 2);
    expect(r.usefulAfter).toBeCloseTo(48.822, 2); expect(r.hoursAfter).toBeCloseTo(19.5288, 2);
    expect(r.batchHours).toBeCloseTo(15.2); expect(r.status).toBe(0);
    expect(formatDuration(r.hoursAfter)).toBe('19 ч 31 мин');
    expect(formatEnd(r.endAfter, now)).toBe('завтра 03:31');
    expect(formatEnd(r.batchEnd, now)).toBe('завтра 18:43');
  });
  it('Б2: 315→324', () => {
    const r = forecast(PAIR_315, { ...base, sourceLevelMm: 600, feedLevel: 200, ratePerHour: 15, targetMm: 260, batchMm: 300 });
    expect(r.belowDead).toBe(true); expect(r.status).toBe(2); expect(r.hoursBefore).toBe(0);
    expect(r.sourceMm).toBe(340); expect(r.addedFeed).toBeCloseTo(435.676, 3);
    expect(r.hoursAfter).toBeCloseTo(19.0451, 3); expect(r.batchHours).toBeCloseTo(25.628, 3);
  });
  it('Б3: перекачка не нужна', () => {
    const r = forecast(PAIR_321, { ...base, sourceLevelMm: 150, feedLevel: 60 });
    expect(r.sourceMm).toBe(0); expect(r.hoursBefore).toBe(12); expect(r.hoursAfter).toBe(12);
  });
  it.each([0, -1, NaN, Infinity])('Невалидный расход %s', ratePerHour => {
    const r = forecast(PAIR_321, { ...base, ratePerHour });
    expect(r.valid).toBe(false); expect(r.hoursBefore).toBeNull(); expect(r.hoursAfter).toBeNull();
  });
  it.each([['2,5', 2.5], ['', null], [' ', null], ['ошибка', null], ['12мм', null]])('Ввод %s', (text, expected) => expect(parseInput(text)).toBe(expected));
  it('Недостоверный источник не мешает прогнозу без перекачки', () => {
    const r = forecast(PAIR_321, { ...base, sourceOk: false });
    expect(r.hoursBefore).toBe(6); expect(r.hoursAfter).toBeNull(); expect(r.batchHours).toBeNull();
  });
  it('Ограничение объёма перекачки 321 сохраняется', () => expect(forecast(PAIR_321, { ...base, sourceLevelMm: 1000, targetMm: 0 }).sourceMm).toBe(634));
});
