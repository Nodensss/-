import type { PairConfig } from './config';
import type { Forecast } from './forecast';
import { formatDecimal, formatDuration, formatEnd } from './format';
export const STATUS_LABELS = ['НОРМА', 'ВНИМАНИЕ', 'СРОЧНО', 'НЕТ ПРОГНОЗА'] as const;
export function forecastLines(config: PairConfig, result: Forecast, targetMm: number, batchMm: number,
  ratePerHour: number | null, now: number, mode: string, reason = ''): string[] {
  const level = (value: number | null) => value === null ? '—' : formatDecimal(value, config.unit === '%' ? 1 : 0);
  const duration = (hours: number | null, end: number | null) => `${formatDuration(hours)} → ${formatEnd(end, now)}`;
  const visible = result.valid;
  return [
    `Расчёт ${config.source}→${config.feed} [${STATUS_LABELS[result.status]}]`,
    `Расход ${config.feed} за ${config.windowMin} мин: ${visible && ratePerHour !== null ? formatDecimal(ratePerHour, config.unit === '%' ? 2 : 1) : '—'} ${config.unit}/ч (${mode})`,
    `До ${config.deadLevel} ${config.unit} без перекачки: ${duration(result.hoursBefore, result.endBefore)}`,
    !result.sourceValid ? 'Источник недостоверен: прогноз перекачки и партии —' :
      !visible ? 'Перекачка: —' : result.sourceMm === 0 ? 'Перекачка не нужна' :
        `Перекачка ${config.source} до ${formatDecimal(targetMm)} мм: −${formatDecimal(result.sourceMm)} мм → +${level(result.addedFeed)} ${config.unit}`,
    `${config.feed} после перекачки: ${visible ? level(result.finalLevel) : '—'} ${config.unit}`,
    `Хватит на: ${duration(result.hoursAfter, result.endAfter)}`,
    `Новая партия ${formatDecimal(batchMm)} мм: +${duration(result.batchHours, result.batchEnd)}`,
    result.belowDead ? 'Уровень ниже неснижаемого остатка' : '',
    result.overfill && visible ? `Перелив! Расчётная граница источника ${config.source}: не ниже ${formatDecimal(result.sourceMinNoOverfillMm, 1)} мм` : '',
    !visible ? reason || 'Нет прогноза: проверь расход и достоверность уровня' : reason,
  ].filter(Boolean);
}
