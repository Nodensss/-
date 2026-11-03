import { appendSample, calculateRate, emptyHistory, evolveLevels, transfer,
  type PairConfig, type LevelHistory, type LevelSample, type RateResult } from '../core';
export interface PlantState {
  at: number; sourceLevelMm: number; feedLevel: number; seed: number; noise: number;
  trueRatePerHour: number; targetMm: number; batchMm: number; autoTransfer: boolean;
  transferRemainingMm: number; transferStepMm: number; prepareRemainingMm: number; prepareStepMm: number;
  faultRemainingMin: number; history: LevelHistory; trend: LevelSample[]; rate: RateResult;
}
export type PlantEvent = 'transfer' | 'prepare' | 'fault';
// Параметры длительности относятся только к макету, не к реальной установке.
export const MODEL_TRANSFER_MIN = 10;
export const MODEL_PREPARE_MIN = 20;
export const MODEL_FAULT_MIN = 10;
export function nextRandom(seed: number): { seed: number; value: number } {
  const next = (Math.imul(1664525, seed) + 1013904223) >>> 0;
  return { seed: next, value: next / 4294967296 };
}
export function createPlant(config: PairConfig, sourceLevelMm: number, feedLevel: number,
  trueRatePerHour: number, targetMm: number, at: number, seed = 321): PlantState {
  const sample = { at, level: feedLevel, ok: true, transferOn: false };
  const history = appendSample(emptyHistory(), sample, config.dtMin, config.windowMin);
  return { at, sourceLevelMm, feedLevel, trueRatePerHour, targetMm, seed, noise: config.noise,
    batchMm: config.batchesMm[0], autoTransfer: false, transferRemainingMm: 0, transferStepMm: 0,
    prepareRemainingMm: 0, prepareStepMm: 0, faultRemainingMin: 0, history, trend: [sample],
    rate: calculateRate(config, { samples: history.samples, startedAt: at, now: at }) };
}
export function plantEvent(config: PairConfig, state: PlantState, event: PlantEvent): PlantState {
  if (event === 'transfer') {
    if (state.transferRemainingMm > 0 || state.prepareRemainingMm > 0) return state;
    const movedMm = transfer(config, state.sourceLevelMm, state.targetMm).sourceMm;
    return { ...state, transferRemainingMm: movedMm, transferStepMm: movedMm / MODEL_TRANSFER_MIN };
  }
  if (event === 'prepare') {
    if (state.transferRemainingMm > 0 || state.prepareRemainingMm > 0) return state;
    const capacityMm = config.sourceMaxMm === null ? Infinity : Math.max(0, config.sourceMaxMm - state.sourceLevelMm);
    const preparedMm = Math.min(state.batchMm, capacityMm);
    return { ...state, prepareRemainingMm: preparedMm, prepareStepMm: preparedMm / MODEL_PREPARE_MIN };
  }
  const samples = state.history.samples.map((s, i, all) => i === all.length - 1 ? { ...s, ok: false } : s);
  const trend = state.trend.map((s, i, all) => i === all.length - 1 ? { ...s, ok: false } : s);
  return { ...state, faultRemainingMin: MODEL_FAULT_MIN, history: { ...state.history, samples }, trend,
    rate: calculateRate(config, { samples, startedAt: state.history.startedAt, now: state.at, lastGood: state.rate.lastGood }) };
}
export function advancePlant(config: PairConfig, initial: PlantState, minutes: number): PlantState {
  let state = initial;
  for (let index = 0; index < Math.floor(minutes); index++) {
    if (state.autoTransfer && state.feedLevel <= config.deadLevel && !state.transferRemainingMm) state = plantEvent(config, state, 'transfer');
    const movedMm = Math.min(state.transferRemainingMm, state.transferStepMm);
    const preparedMm = Math.min(state.prepareRemainingMm, state.prepareStepMm);
    const levels = evolveLevels(config, state.sourceLevelMm, state.feedLevel, state.trueRatePerHour, 1 / 60, movedMm, preparedMm);
    const random = nextRandom(state.seed), at = state.at + 60000;
    const remaining = Math.max(0, state.faultRemainingMin - 1);
    const sample = { at, level: levels.feedLevel + (random.value * 2 - 1) * state.noise,
      ok: remaining === 0, transferOn: movedMm > 1e-9 };
    const history = appendSample(state.history, sample, config.dtMin, config.windowMin);
    state = { ...state, ...levels, at, seed: random.seed, faultRemainingMin: remaining,
      transferRemainingMm: Math.max(0, state.transferRemainingMm - movedMm),
      prepareRemainingMm: Math.max(0, state.prepareRemainingMm - preparedMm),
      history, trend: [...state.trend, sample].slice(-181),
      rate: calculateRate(config, { samples: history.samples, startedAt: history.startedAt, now: at, lastGood: state.rate.lastGood }) };
  }
  return state;
}
