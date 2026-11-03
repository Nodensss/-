import { it, expect } from 'vitest';
import { calculateRate, twoMeasurementRate, forecast, PAIR_321, PAIR_315, appendSample, emptyHistory, formatDuration, formatEnd, type LevelSample } from './index';
const now = new Date(2026, 10, 3, 8, 0).getTime();
const linear = (start = 47.5, drop = 2.5): LevelSample[] => Array.from({ length: 61 }, (_, i) => ({ at: now - (60 - i) * 60000, level: start - drop * i / 60, ok: true, transferOn: false }));
it('Б4: всё окно', () => { const r = calculateRate(PAIR_321, { samples: linear(), now }); expect(r.ratePerHour).toBeCloseTo(2.5); expect(r.state).toBe(0); expect(r.usedMin).toBe(60); });
it('Б5: приток, GUARD, SETTLE', () => {
  const samples = linear(40).map((s, i) => ({ ...s, level: s.level + Math.min(Math.max(i - 30, 0), 10) * 3.8 }));
  const r = calculateRate(PAIR_321, { samples, now });
  expect(r.usedMin).toBe(47); expect(r.excludedMin).toBe(13); expect(r.state).toBe(1); expect(r.ratePerHour).toBeCloseTo(2.5);
  expect(r.excluded.map((value, i) => value ? i + 1 : 0).filter(Boolean)).toEqual(Array.from({ length: 13 }, (_, i) => i + 30));
  const f = forecast(PAIR_321, { sourceLevelMm: 160, targetMm: 160, feedLevel: 75.5, ratePerHour: r.ratePerHour, batchMm: 0, now });
  expect(formatDuration(f.hoursBefore)).toBe('18 ч 12 мин');
});
it('Б6: сбой и удержание, срок не обновляется', () => {
  const samples = linear().map((s, i) => ({ ...s, ok: i < 10 || i > 55 }));
  const lastGood = { ratePerHour: 2.5, at: now - 30 * 60000 };
  const r = calculateRate(PAIR_321, { samples, now, lastGood });
  expect(r.usedMin).toBe(13); expect(r.state).toBe(2); expect(r.holdAgeMin).toBe(30); expect(r.lastGood).toEqual(lastGood);
  expect(calculateRate(PAIR_321, { samples, now }).state).toBe(5);
  expect(calculateRate(PAIR_321, { samples, now: now + 91 * 60000, lastGood }).state).toBe(5);
});
it('Б7: нет расхода', () => { const r = calculateRate(PAIR_321, { samples: linear(50, 0), now }); expect(r.state).toBe(4); expect(r.valid).toBe(false); });
it('Б8: шум сокращается на концах участков', () => {
  const samples = linear().map((s, i) => ({ ...s, level: s.level + (i % 2 ? -0.2 : 0.2) }));
  const r = calculateRate(PAIR_321, { samples, now }); expect(r.ratePerHour).toBeCloseTo(2.5); expect(r.excludedMin).toBe(0);
});
it('Б9: накопление', () => expect(calculateRate(PAIR_321, { samples: linear().slice(46), now }).state).toBe(3));
it('Б10: перелив', () => {
  const r = forecast({ ...PAIR_321, feedMax: 90 }, { sourceLevelMm: 634, feedLevel: 60, targetMm: 0, batchMm: 0, ratePerHour: 2.5, now });
  expect(r.overfill).toBe(true); expect(r.finalLevel).toBeCloseTo(123.068, 2); expect(r.sourceMinNoOverfillMm).toBeCloseTo(332.4, 1);
});
it('Б11: авторасход 324 и дата партии', () => {
  const r = calculateRate(PAIR_315, { samples: linear(465, 15), now }); expect(r.ratePerHour).toBe(15);
  const f = forecast(PAIR_315, { sourceLevelMm: 427, feedLevel: 450, targetMm: 260, batchMm: 300, ratePerHour: r.ratePerHour, now });
  expect(f.addedFeed).toBeCloseTo(213.994, 2); expect(formatDuration(f.hoursBefore)).toBe('6 ч 40 мин');
  expect(formatDuration(f.hoursAfter)).toBe('20 ч 55 мин'); expect(formatEnd(f.endAfter, now)).toBe('завтра 04:55');
  expect(formatEnd(f.batchEnd, now)).toBe('05.11 06:33');
});
it('Б12: два замера с перекачкой', () => expect(twoMeasurementRate(PAIR_321, 30, 65.5, 60, 382)).toBe(2.5));
it('Б13: индикация', () => {
  const base = { sourceLevelMm: 500, targetMm: 160, batchMm: 0, ratePerHour: 2.5, now };
  expect(forecast(PAIR_321, { ...base, feedLevel: 34 }).status).toBe(1);
  expect(forecast(PAIR_321, { ...base, feedLevel: 32 }).status).toBe(2);
});
it('Недостоверность важнее ручного режима; ручной режим важнее окна', () => {
  const samples = linear(); samples[60].ok = false;
  expect(calculateRate(PAIR_321, { samples, now, manualRatePerHour: 7 }).state).toBe(7);
  samples[60].ok = true; const r = calculateRate(PAIR_321, { samples, now, manualRatePerHour: 7 }); expect(r.state).toBe(6); expect(r.ratePerHour).toBe(7);
});
it('Признак перекачки исключает оба соседних интервала даже без роста', () => {
  const samples = linear(); samples[30].transferOn = true;
  const r = calculateRate(PAIR_321, { samples, now }); expect(r.excludedMin).toBe(5); expect(r.ratePerHour).toBeCloseTo(2.5);
});
it('Пропущенный такт недостоверен; буфер ограничен; повторный такт не пишет', () => {
  let h = appendSample(emptyHistory(), { at: now, level: 45, ok: true, transferOn: false });
  expect(appendSample(h, { ...h.samples[0], at: now + 1000 })).toBe(h);
  h = appendSample(h, { at: now + 3 * 60000, level: 44, ok: true, transferOn: false });
  expect(h.samples.map(s => s.ok)).toEqual([true, false, false, true]);
  h = appendSample(h, { at: now + 500 * 60000, level: 40, ok: true, transferOn: false });
  expect(h.samples).toHaveLength(61); expect(h.startedAt).toBe(now);
  expect(calculateRate(PAIR_321, { samples: h.samples, startedAt: h.startedAt, now: now + 500 * 60000 }).state).toBe(5);
});
it.each([[30, 45, 60, 0], [45, 30, 0, 0], [45, 30, -1, 0], [45, 30, 60, -1]])('Некорректные замеры', (a,b,t,x) => expect(twoMeasurementRate(PAIR_321,a,b,t,x)).toBeNull());
it('Малый и отрицательный расход не строят прогноз', () => {
  for (const drop of [-2, 0.1]) expect(calculateRate(PAIR_321, { samples: linear(50, drop), now }).valid).toBe(false);
});
it('Граница удержания 120 минут включительна', () => {
  const samples = linear().map((s,i) => ({...s, ok: i === 60}));
  expect(calculateRate(PAIR_321, { samples, now, lastGood: {ratePerHour: 2.5, at: now - 120*60000} }).state).toBe(2);
});
