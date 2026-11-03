import React, { useEffect, useState } from 'react';
import type { SharedTankData } from '../App';
import { PAIR_321, PAIR_315, type PairConfig, parseInput, forecast, forecastLines, formatDecimal,
  formatClock, RATE_LABELS, calculateRate } from '../core';
import { createPlant, advancePlant, plantEvent, type PlantState } from '../sim/plantSim';
import { InputField } from './UIComponents';
// Сохраняем промежуточный текст (например «2,»), пока пользователь вводит число.
function ModelNumberField({ label, value, onValid }: { label: string; value: number; onValid: (value: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(current => parseInput(current) === value ? current : String(value)), [value]);
  return <InputField label={label} value={text} onChange={event => {
    setText(event.target.value); const parsed = parseInput(event.target.value);
    if (parsed !== null && parsed >= 0) onValid(parsed);
  }} />;
}
function Trend({ config, plant }: { config: PairConfig; plant: PlantState }) {
  const result = calculateRate({ ...config, windowMin: 120 }, { samples: plant.trend.slice(-121), now: plant.at });
  // Полный трёхчасовой тренд, маска исключений рассчитывается тем же ядром по двум перекрывающимся окнам.
  const old = calculateRate({ ...config, windowMin: 120 }, { samples: plant.trend.slice(0, 121), now: plant.at });
  const bad = plant.trend.map((s, i) => !s.ok || (i < old.excluded.length ? old.excluded[i] : false)
    || (i >= plant.trend.length - result.samples.length && result.excluded[i - (plant.trend.length - result.samples.length)]));
  const values = plant.trend.filter(s => s.ok).map(s => s.level);
  const min = Math.min(config.deadLevel, ...values), max = Math.max(min + 1, ...values);
  const x = (index: number) => (180 - plant.trend.length + 1 + index) / 180 * 320;
  const y = (level: number) => 64 - (level - min) / (max - min) * 52;
  return <div className="mnemo-trend"><svg viewBox="0 0 320 78" role="img" aria-label={`Тренд ${config.feed} за последние 3 часа; исключённые интервалы отмечены штрихами`}>
    {plant.trend.map((s,i) => i && bad[i-1] ? <rect key={`b${i}`} x={x(i-1)} width="2" height="68" fill="#c8b38c" /> : null)}
    <line x1="0" x2="320" y1={y(config.deadLevel)} y2={y(config.deadLevel)} stroke="#999" strokeDasharray="3 3" />
    {plant.trend.map((s,i) => i && s.ok && plant.trend[i-1].ok ? <line key={i} x1={x(i-1)} x2={x(i)}
      y1={y(plant.trend[i-1].level)} y2={y(s.level)} stroke="#333" strokeWidth="1.5" /> : null)}
    <text x="1" y="77" fontSize="9">−3 ч</text><text x="280" y="77" fontSize="9">сейчас</text>
  </svg><small>Тренд 3 ч · штрихи: исключённые интервалы · разрыв: сбой</small></div>;
}
function PairPanel({ config, initial, running, speed }: { config: PairConfig; initial: () => PlantState; running: boolean; speed: number }) {
  const [plant, setPlant] = useState(initial);
  const [expanded, setExpanded] = useState(false);
  const [manual, setManual] = useState(false);
  const [manualText, setManualText] = useState(String(plant.trueRatePerHour));
  const [feedMaxText, setFeedMaxText] = useState('');
  const [sourceOk, setSourceOk] = useState(true);
  const [targetChoice, setTargetChoice] = useState(String(plant.targetMm));
  const [customTargetText, setCustomTargetText] = useState(String(plant.targetMm));
  useEffect(() => {
    if (!running) return;
    let carriedMin = 0;
    const timer = setInterval(() => {
      carriedMin += speed / 60;
      const steps = Math.floor(carriedMin); carriedMin -= steps;
      if (steps) setPlant(current => advancePlant(config, current, steps));
    }, 1000);
    return () => clearInterval(timer);
  }, [config, running, speed]);
  const manualValue = parseInput(manualText);
  useEffect(() => setPlant(current => ({ ...current, manualRatePerHour: manual ? manualValue ?? NaN : null })), [manual, manualText]);
  const rate = calculateRate(config, { samples: plant.history.samples, now: plant.at, startedAt: plant.history.startedAt,
    lastGood: plant.rate.lastGood, manualRatePerHour: manual ? manualValue ?? NaN : null });
  const feedMax = parseInput(feedMaxText);
  const maxInvalid = Boolean(feedMaxText.trim()) && (feedMax === null || feedMax <= 0);
  const result = forecast({ ...config, feedMax }, { sourceLevelMm: plant.sourceLevelMm, feedLevel: plant.history.samples.at(-1).level,
    ratePerHour: rate.valid && !maxInvalid ? rate.ratePerHour : null, targetMm: plant.targetMm, batchMm: plant.batchMm,
    now: plant.at, sourceOk, feedOk: plant.history.samples.at(-1).ok });
  const lines = forecastLines(config, result, plant.targetMm, plant.batchMm, rate.ratePerHour, plant.at,
    manual ? 'РУЧН' : 'авто', maxInvalid ? 'Проверь максимум: положительное число или пустое поле' : rate.valid ? '' : RATE_LABELS[rate.state]);
  const modeHint = [rate.transferNow ? 'идёт перекачка' : '', rate.state === 2 ? `расход удержан (${formatDecimal(rate.holdAgeMin)} мин назад)` : '',
    rate.excludedMin ? 'часть окна исключена (перекачка/сбой)' : '', manual ? 'РУЧН' : ''].filter(Boolean).join(' · ');
  const numericChange = (value: string, key: 'trueRatePerHour' | 'noise' | 'batchMm' | 'targetMm') => {
    const number = parseInput(value); if (number !== null && number >= 0) setPlant(s => ({ ...s, [key]: number }));
  };
  return <section className="mnemo-pair">
    <div className="mnemo-flow" aria-label={`Схема ${config.source} → ${config.feed} → на дозирование`}>
      <div><strong>{config.source}</strong><span>{sourceOk ? formatDecimal(plant.sourceLevelMm) : '—'} мм</span></div>
      <span>→</span><div><strong>{config.feed}</strong><span>{plant.history.samples.at(-1).ok ? formatDecimal(plant.history.samples.at(-1).level, config.unit === '%' ? 1 : 0) : '—'} {config.unit}</span></div><span>→ на дозирование</span>
    </div>
    <button className={`mnemo-block status-${result.status}`} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
      <strong>{lines[0]}</strong>{lines.slice(1).map((line,i) => <span key={i}>{line}</span>)}
      {modeHint && <em>{modeHint}</em>}
      <small>Учтено {rate.usedMin} мин · исключено {rate.excludedMin} мин · код {rate.state} · параметры ↓</small>
    </button>
    <small>задано {formatDecimal(plant.trueRatePerHour, config.unit === '%' ? 2 : 1)} {config.unit}/ч · посчитано {rate.valid ? formatDecimal(rate.ratePerHour, config.unit === '%' ? 2 : 1) : '—'} {config.unit}/ч · {formatClock(plant.at)}</small>
    {expanded && <div className="mnemo-parameters">
      <h3>Параметры информационного расчёта</h3>
      <label>Цель, мм <select value={targetChoice} onChange={e => { const value = e.target.value; setTargetChoice(value); if (value !== 'custom') numericChange(value, 'targetMm'); }}>
        {config.targetsMm.map(value => <option key={value} value={value}>{value}</option>)}<option value="custom">другое</option></select></label>
      {targetChoice === 'custom' && <InputField label="Другая цель, мм" value={customTargetText} onChange={e => { setCustomTargetText(e.target.value); numericChange(e.target.value, 'targetMm'); }} />}
      <ModelNumberField label="Новая партия, мм (0 — не считать)" value={plant.batchMm} onValid={batchMm => setPlant(s => ({...s,batchMm}))} />
      <label><input type="checkbox" checked={manual} onChange={e => setManual(e.target.checked)} /> Ручной расход</label>
      {manual && <InputField label={`Ручной расход, ${config.unit}/ч`} value={manualText} onChange={e => setManualText(e.target.value)} />}
      <InputField label={`Максимум ${config.feed}, ${config.unit} — УТОЧНИТЬ (пусто: выключено)`} value={feedMaxText} onChange={e => setFeedMaxText(e.target.value)} />
      <label><input type="checkbox" checked={sourceOk} onChange={e => setSourceOk(e.target.checked)} /> Источник достоверен (имитация)</label>
    </div>}
    <Trend config={config} plant={plant} />
    <div className="mnemo-events" aria-label={`События модели ${config.source}`}>
      <button onClick={() => setPlant(s => plantEvent(config,s,'transfer'))}>Имитировать перекачку (10 мин)</button>
      <button onClick={() => setPlant(s => plantEvent(config,s,'prepare'))}>Имитировать партию (20 мин)</button>
      <button onClick={() => setPlant(s => plantEvent(config,s,'fault'))}>Отказ датчика (10 мин)</button>
      <button onClick={() => setPlant(s => advancePlant(config,s,60))}>+60 мин модели</button>
      <button onClick={() => { setManual(false); setPlant(initial()); }}>Сброс модели</button>
    </div>
    <details><summary>Настройки имитатора</summary>
      <ModelNumberField label={`Заданный расход, ${config.unit}/ч`} value={plant.trueRatePerHour} onValid={trueRatePerHour => setPlant(s => ({...s,trueRatePerHour}))} />
      <ModelNumberField label={`Шум ±, ${config.unit}`} value={plant.noise} onValid={noise => setPlant(s => ({...s,noise}))} />
      <label><input type="checkbox" checked={plant.autoTransfer} onChange={e => setPlant(s => ({...s,autoTransfer:e.target.checked}))} /> Автоперекачка в модели у неснижаемого остатка</label>
    </details>
  </section>;
}
export default function MnemoMockup({ sharedData }: { sharedData: SharedTankData }) {
  const [running, setRunning] = useState(false), [speed, setSpeed] = useState(60);
  const [start] = useState(() => Date.now());
  return <div className="mnemo">
    <div className="mnemo-banner"><strong>МАКЕТ.</strong> Данные имитированы. Не для управления процессом.</div>
    <div className="mnemo-toolbar"><h2>Мнемосхема (макет)</h2><button onClick={() => setRunning(!running)}>{running ? 'Пауза модели' : 'Старт модели'}</button>
      <label>Ускорение <select value={speed} onChange={e => setSpeed(Number(e.target.value))}>{[1,60,600].map(n => <option key={n} value={n}>×{n}</option>)}</select></label></div>
    <div className="mnemo-grid">
      <PairPanel config={PAIR_321} running={running} speed={speed} initial={() => createPlant(PAIR_321, parseInput(sharedData.level321) ?? 0, parseInput(sharedData.level323) ?? 0, parseInput(sharedData.flowRate323) ?? 0, sharedData.target321, start)} />
      <PairPanel config={PAIR_315} running={running} speed={speed} initial={() => createPlant(PAIR_315, parseInput(sharedData.level315) ?? 0, parseInput(sharedData.level324) ?? 0, parseInput(sharedData.consumptionRate324) ?? 0, sharedData.target315, start, 315)} />
    </div>
    <p className="mnemo-footnote">Расчёт — информационная подсказка. Не управляет оборудованием, не заменяет регламент, сигнализацию, блокировки и ПАЗ. Цвет — информационная индикация, без звука и журнала тревог. Максимумы, пороги расхода и индикации — УТОЧНИТЬ на установке. Длительности событий и шум относятся только к модели.</p>
  </div>;
}
