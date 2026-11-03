export interface LevelSample { at: number; level: number; ok: boolean; transferOn: boolean }
export interface LevelHistory { samples: LevelSample[]; startedAt: number | null }
export const emptyHistory = (): LevelHistory => ({ samples: [], startedAt: null });
// Такты привязаны к первому отсчёту. Пропуски не интерполируются.
export function appendSample(history: LevelHistory, sample: LevelSample, dtMin = 1, windowMin = 60): LevelHistory {
  if (!(dtMin > 0) || windowMin < dtMin || windowMin > 120) throw new RangeError('Недопустимое окно истории');
  const stepMs = dtMin * 60000;
  const previous = history.samples.at(-1);
  if (previous && sample.at < previous.at + stepMs) return history;
  const capacity = Math.floor(windowMin / dtMin) + 1;
  const next = history.samples.slice();
  if (previous) {
    const steps = Math.floor((sample.at - previous.at) / stepMs);
    // При длинном разрыве создаём только то, что поместится в буфер.
    for (let index = Math.max(1, steps - capacity + 1); index < steps; index++) {
      next.push({ at: previous.at + index * stepMs, level: 0, ok: false, transferOn: false });
    }
    next.push({ ...sample, at: previous.at + steps * stepMs });
  } else next.push(sample);
  return { samples: next.slice(-capacity), startedAt: history.startedAt ?? sample.at };
}
