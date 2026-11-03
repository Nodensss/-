import { it, expect } from 'vitest';
import { PAIR_321, PAIR_315 } from '../core';
import { createPlant, advancePlant, plantEvent } from './plantSim';
const now = new Date(2026, 10, 3, 8, 0).getTime();
for (const [config, feed, rate] of [[PAIR_321, 45, 2.5], [PAIR_315, 450, 15]] as const) {
  it(`${config.id}: постоянный расход с шумом и перекачкой`, () => {
    let state = createPlant(config, 600, feed, rate, config.targetsMm[0], now);
    state = advancePlant(config, state, 60);
    expect(state.rate.valid).toBe(true); expect(Math.abs(state.rate.ratePerHour - rate) / rate).toBeLessThanOrEqual(0.25);
    state = plantEvent(config, state, 'transfer');
    for (let i = 0; i < 75; i++) {
      state = advancePlant(config, state, 1);
      if (state.rate.ratePerHour !== null) expect(state.rate.ratePerHour).toBeGreaterThan(0);
    }
    expect(Math.abs(state.rate.ratePerHour - rate) / rate).toBeLessThanOrEqual(0.25);
  });
}
it('Детерминированность seed и независимость входа', () => {
  const initial = createPlant(PAIR_321, 500, 45, 2.5, 160, now);
  expect(advancePlant(PAIR_321, initial, 90)).toEqual(advancePlant(PAIR_321, initial, 90));
  expect(initial.history.samples).toHaveLength(1); expect(initial.at).toBe(now);
});
it('Ступенька расхода догоняется за полное окно', () => {
  let s = advancePlant(PAIR_321, createPlant(PAIR_321, 500, 60, 2.5, 160, now), 60);
  s = advancePlant(PAIR_321, { ...s, trueRatePerHour: 5, noise: 0 }, 61);
  expect(s.rate.ratePerHour).toBeCloseTo(5, 8);
});
it('Сбой длится 10 минут, затем достоверность восстанавливается', () => {
  let s = advancePlant(PAIR_321, createPlant(PAIR_321, 500, 45, 2.5, 160, now), 60);
  s = plantEvent(PAIR_321, s, 'fault'); expect(s.rate.state).toBe(7);
  s = advancePlant(PAIR_321, s, 9); expect(s.rate.state).toBe(7);
  s = advancePlant(PAIR_321, s, 1); expect(s.rate.valid).toBe(true);
});
it('Приготовление партии и автоперекачка относятся только к модели', () => {
  let s = createPlant(PAIR_321, 160, 29, 2.5, 160, now);
  s = advancePlant(PAIR_321, plantEvent(PAIR_321, s, 'prepare'), 20);
  expect(s.sourceLevelMm).toBeCloseTo(542);
  s = advancePlant(PAIR_321, { ...s, autoTransfer: true, noise: 0 }, 10);
  expect(s.sourceLevelMm).toBeCloseTo(160); expect(s.feedLevel).toBeGreaterThan(30);
});
it('Ручной режим не обновляет сохранённый авторасход', () => {
  let s = advancePlant(PAIR_321, createPlant(PAIR_321,500,60,2.5,160,now),60);
  const last = s.rate.lastGood;
  s = advancePlant(PAIR_321,{...s,manualRatePerHour:7},30);
  expect(s.rate.state).toBe(6); expect(s.rate.ratePerHour).toBe(7); expect(s.rate.lastGood).toEqual(last);
});
