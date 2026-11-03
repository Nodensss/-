import type { PairConfig } from './config';
export type ForecastStatus = 0 | 1 | 2 | 3;
export interface ForecastInput {
  sourceLevelMm: number; feedLevel: number; ratePerHour: number | null;
  targetMm: number; batchMm: number; now: number; sourceOk?: boolean; feedOk?: boolean;
}
export function transfer(config: PairConfig, sourceLevelMm: number, targetMm: number) {
  const sourceMm = Math.min(Math.max(sourceLevelMm - targetMm, 0), config.sourceMaxMm ?? Infinity);
  return { sourceMm, addedFeed: sourceMm * config.gainPerMm };
}
export function forecast(config: PairConfig, input: ForecastInput) {
  const { sourceLevelMm, feedLevel, ratePerHour, targetMm, batchMm, now } = input;
  const valid = input.feedOk !== false && Number.isFinite(feedLevel) && Number.isFinite(ratePerHour)
    && ratePerHour !== null && ratePerHour > 0;
  const sourceValid = input.sourceOk !== false && [sourceLevelMm, targetMm, batchMm].every(Number.isFinite)
    && sourceLevelMm >= 0 && targetMm >= 0 && batchMm >= 0;
  const usefulBefore = Math.max(feedLevel - config.deadLevel, 0);
  const hoursBefore = valid ? usefulBefore / ratePerHour : null;
  const moved = sourceValid ? transfer(config, sourceLevelMm, targetMm) : null;
  const finalLevel = moved ? feedLevel + moved.addedFeed : null;
  const usefulAfter = finalLevel === null ? null : Math.max(finalLevel - config.deadLevel, 0);
  const hoursAfter = valid && usefulAfter !== null ? usefulAfter / ratePerHour : null;
  const batchHours = valid && sourceValid && batchMm > 0 ? batchMm * config.gainPerMm / ratePerHour : null;
  const endBefore = hoursBefore === null ? null : now + hoursBefore * 3600000;
  const endAfter = hoursAfter === null ? null : now + hoursAfter * 3600000;
  const batchEnd = endAfter !== null && batchHours !== null ? endAfter + batchHours * 3600000 : null;
  const overfill = finalLevel !== null && config.feedMax !== null && finalLevel > config.feedMax;
  const sourceMinNoOverfillMm = overfill ? sourceLevelMm - (config.feedMax - feedLevel) / config.gainPerMm : null;
  const status: ForecastStatus = !valid ? 3 : feedLevel <= config.deadLevel || hoursBefore < config.urgentHours
    ? 2 : hoursBefore < config.warnHours ? 1 : 0;
  return { valid, sourceValid, usefulBefore, hoursBefore, endBefore, sourceMm: moved?.sourceMm ?? null,
    addedFeed: moved?.addedFeed ?? null, finalLevel, usefulAfter, hoursAfter, endAfter, batchHours, batchEnd,
    belowDead: feedLevel < config.deadLevel, overfill, sourceMinNoOverfillMm, status };
}
export type Forecast = ReturnType<typeof forecast>;
// Динамика уровня для имитаторов; пересчёт единиц остаётся в ядре.
export function evolveLevels(config: PairConfig, sourceLevelMm: number, feedLevel: number,
  consumedPerHour: number, elapsedHours: number, movedMm = 0, preparedMm = 0) {
  return { sourceLevelMm: Math.max(0, sourceLevelMm - movedMm + preparedMm),
    feedLevel: Math.max(0, feedLevel - consumedPerHour * elapsedHours) + movedMm * config.gainPerMm };
}
