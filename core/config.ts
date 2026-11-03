export interface PairConfig {
  id: '321-323' | '315-324'; source: string; feed: string; unit: '%' | 'мм';
  gainPerMm: number; deadLevel: number; sourceMaxMm: number | null; feedMax: number | null;
  targetsMm: readonly number[]; batchesMm: readonly number[];
  dtMin: number; windowMin: number; inflowStep: number; guard: number; settle: number;
  minValidMin: number; holdMaxMin: number; rateMinPerHour: number; warnHours: number; urgentHours: number;
  sourceScaleMm: number; feedScale: number; noise: number;
}
const common = {
  dtMin: 1, windowMin: 60, guard: 1, settle: 2, minValidMin: 20, holdMaxMin: 120,
  warnHours: 2, urgentHours: 1, // УТОЧНИТЬ у технолога.
  feedMax: null, // УТОЧНИТЬ: проверка перелива выключена до задания максимума.
} as const;
export const PAIR_321: PairConfig = {
  ...common, id: '321-323', source: '321', feed: '323', unit: '%', gainPerMm: 38 / 382,
  deadLevel: 30, sourceMaxMm: 634, targetsMm: [160, 0], batchesMm: [382, 600, 900],
  inflowStep: 0.5, rateMinPerHour: 0.2, // УТОЧНИТЬ по трендам.
  sourceScaleMm: 634, feedScale: 100, noise: 0.1,
};
export const PAIR_315: PairConfig = {
  ...common, id: '315-324', source: '315', feed: '324', unit: 'мм', gainPerMm: 1.2814,
  deadLevel: 350, sourceMaxMm: null, // УТОЧНИТЬ.
  targetsMm: [260, 0], batchesMm: [300, 600, 900],
  inflowStep: 3, rateMinPerHour: 1, // УТОЧНИТЬ по трендам.
  sourceScaleMm: 800, feedScale: 800, noise: 1, // Только шкалы макета, не максимумы установки.
};
