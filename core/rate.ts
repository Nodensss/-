import type { PairConfig } from './config';
import type { LevelSample } from './history';
export type RateState = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export interface LastRate { ratePerHour: number; at: number }
export interface RateInput {
  samples: readonly LevelSample[]; now: number; lastGood?: LastRate | null;
  manualRatePerHour?: number | null; startedAt?: number | null;
}
export function twoMeasurementRate(config: PairConfig, earlierLevel: number, currentLevel: number,
  elapsedMin: number, transferredMm: number): number | null {
  if (![earlierLevel, currentLevel, elapsedMin, transferredMm].every(Number.isFinite)
    || elapsedMin <= 0 || transferredMm < 0 || earlierLevel < 0 || currentLevel < 0) return null;
  const ratePerHour = (earlierLevel - currentLevel + transferredMm * config.gainPerMm) * 60 / elapsedMin;
  return ratePerHour > 0 ? ratePerHour : null;
}
export function calculateRate(config: PairConfig, input: RateInput) {
  const { now } = input;
  const samples = input.samples.slice(-Math.floor(config.windowMin / config.dtMin) - 1);
  const count = samples.length - 1;
  const inflow = Array.from({ length: Math.max(count, 0) }, (_, index) => {
    const a = samples[index], b = samples[index + 1];
    return a.transferOn || b.transferOn || (a.ok && b.ok && b.level - a.level > config.inflowStep);
  });
  const excluded = inflow.map((_, index) => {
    const a = samples[index], b = samples[index + 1];
    if (!a.ok || !b.ok || !Number.isFinite(a.level) || !Number.isFinite(b.level)
      || Math.abs(b.at - a.at - config.dtMin * 60000) > 1) return true;
    for (let j = Math.max(0, index - config.settle); j <= Math.min(count - 1, index + config.guard); j++) {
      if (inflow[j]) return true;
    }
    return false;
  });
  // Суммируем разности концов целых участков, чтобы шум внутри участка сократился.
  let totalDrop = 0, usedMin = 0, start = -1;
  for (let index = 0; index <= count; index++) {
    if (index < count && !excluded[index]) { if (start < 0) start = index; }
    else if (start >= 0) {
      totalDrop += samples[start].level - samples[index].level;
      usedMin += (index - start) * config.dtMin; start = -1;
    }
  }
  const excludedMin = excluded.filter(Boolean).length * config.dtMin;
  const current = samples.at(-1);
  const transferNow = current?.transferOn ?? false;
  const transferInWindow = inflow.some(Boolean);
  let state: RateState = 5, ratePerHour: number | null = null, holdAgeMin: number | null = null;
  let lastGood = input.lastGood ?? null;
  if (current && (!current.ok || !Number.isFinite(current.level))) state = 7;
  else if (input.manualRatePerHour !== undefined && input.manualRatePerHour !== null) {
    ratePerHour = input.manualRatePerHour; state = 6;
  } else if (usedMin >= config.minValidMin) {
    ratePerHour = totalDrop * 60 / usedMin; state = excludedMin > 0 ? 1 : 0;
    lastGood = { ratePerHour, at: now };
  } else if (lastGood && Number.isFinite(lastGood.ratePerHour) && now >= lastGood.at
    && (now - lastGood.at) / 60000 <= config.holdMaxMin) {
    ratePerHour = lastGood.ratePerHour; holdAgeMin = (now - lastGood.at) / 60000; state = 2;
  } else if ((now - (input.startedAt ?? samples[0]?.at ?? now)) / 60000 < config.minValidMin) state = 3;
  if (ratePerHour !== null && (!Number.isFinite(ratePerHour) || ratePerHour < config.rateMinPerHour)) state = 4;
  const valid = state === 0 || state === 1 || state === 2 || state === 6;
  return { ratePerHour, state, valid, usedMin, excludedMin, transferNow, transferInWindow, holdAgeMin,
    lastGood, excluded, samples };
}
export type RateResult = ReturnType<typeof calculateRate>;
export const RATE_LABELS: Record<RateState, string> = {
  0: 'по всему окну', 1: 'часть окна исключена (перекачка/сбой)', 2: 'расход удержан',
  3: 'накопление данных', 4: 'нет расхода', 5: 'нет данных', 6: 'РУЧН', 7: 'датчик недостоверен',
};
