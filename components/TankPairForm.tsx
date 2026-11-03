import React, { useState } from 'react';
import type { SharedTankData } from '../App';
import { type PairConfig, parseInput, forecast, twoMeasurementRate, forecastLines, formatDecimal } from '../core';
import { InputField, ChipGroup, ResultBox } from './UIComponents';
import { Calculator } from 'lucide-react';
export interface TankFormProps { sharedData: SharedTankData; updateSharedData: (updates: Partial<SharedTankData>) => void }
export default function TankPairForm({ config, sharedData, updateSharedData }: TankFormProps & { config: PairConfig }) {
  const first = config.id === '321-323';
  const sourceKey = first ? 'level321' : 'level315';
  const feedKey = first ? 'level323' : 'level324';
  const rateKey = first ? 'flowRate323' : 'consumptionRate324';
  const targetKey = first ? 'target321' : 'target315';
  const resultKey = first ? 'result323321' : 'result315324';
  const [customTarget, setCustomTarget] = useState(false);
  const [targetText, setTargetText] = useState('');
  const [batchMm, setBatchMm] = useState<number | null>(null);
  const [customBatch, setCustomBatch] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [mode, setMode] = useState<'manual' | 'measurements'>('manual');
  const [earlierText, setEarlierText] = useState('');
  const [elapsedText, setElapsedText] = useState('60');
  const [transferredText, setTransferredText] = useState('0');
  const [feedMaxText, setFeedMaxText] = useState('');
  const change = (key: keyof SharedTankData, value: string | number) => updateSharedData({ [key]: value });
  const calculate = () => {
    const sourceLevelMm = parseInput(sharedData[sourceKey]), feedLevel = parseInput(sharedData[feedKey]);
    const targetMm = customTarget ? parseInput(targetText) : sharedData[targetKey];
    const selectedBatchMm = customBatch ? parseInput(batchText) : batchMm ?? 0;
    const earlierLevel = parseInput(earlierText), elapsedMin = parseInput(elapsedText), transferredMm = parseInput(transferredText);
    const ratePerHour = mode === 'manual' ? parseInput(sharedData[rateKey]) :
      earlierLevel !== null && feedLevel !== null && elapsedMin !== null && transferredMm !== null ?
        twoMeasurementRate(config, earlierLevel, feedLevel, elapsedMin, transferredMm) : null;
    const feedMax = feedMaxText.trim() ? parseInput(feedMaxText) : config.feedMax;
    if ([sourceLevelMm, feedLevel, targetMm, selectedBatchMm].some(value => value === null || value < 0)
      || (feedMaxText.trim() && (feedMax === null || feedMax <= 0))) {
      change(resultKey, 'Проверь ввод: нужны неотрицательные числа; максимум должен быть положительным.'); return;
    }
    if (ratePerHour === null || ratePerHour <= 0) {
      change(resultKey, mode === 'measurements' ? 'Проверь замеры: расход должен быть больше нуля.' : 'Расход должен быть больше нуля.'); return;
    }
    const now = Date.now();
    const result = forecast({ ...config, feedMax }, { sourceLevelMm, feedLevel,
      ratePerHour: ratePerHour >= config.rateMinPerHour ? ratePerHour : null, targetMm, batchMm: selectedBatchMm, now });
    updateSharedData({ [resultKey]: forecastLines(config, result, targetMm, selectedBatchMm, ratePerHour, now,
      mode === 'manual' ? 'РУЧН' : 'по двум замерам', ratePerHour < config.rateMinPerHour ? 'Нет расхода: ниже RATE_MIN (УТОЧНИТЬ)' : '').join('\n'),
      [targetKey]: targetMm, ...(mode === 'measurements' ? { [rateKey]: String(ratePerHour) } : {}) });
  };
  return <div className={`${first ? 'bg-teal-50' : 'bg-orange-50'} p-4 rounded-lg min-h-[calc(100vh-120px)]`}>
    <div className="max-w-lg mx-auto bg-white/50 p-6 rounded-xl backdrop-blur-sm shadow-sm">
      <InputField label={`Уровень в ${config.feed} (${config.unit}), сейчас`} value={sharedData[feedKey]} onChange={e => change(feedKey, e.target.value)} />
      <InputField label={`Уровень в ${config.source} (мм)`} value={sharedData[sourceKey]} onChange={e => change(sourceKey, e.target.value)} />
      <label className="block text-sm mb-4">Расход:
        <select className="block w-full p-2 border rounded" value={mode} onChange={e => setMode(e.target.value as typeof mode)}>
          <option value="manual">вручную</option><option value="measurements">по двум замерам</option>
        </select>
      </label>
      {mode === 'manual' ? <InputField label={`Расход (${config.unit}/ч)`} value={sharedData[rateKey]} onChange={e => change(rateKey, e.target.value)} /> : <>
        <InputField label={`Уровень ${config.feed} раньше (${config.unit})`} value={earlierText} onChange={e => setEarlierText(e.target.value)} />
        <InputField label="Сколько минут назад" value={elapsedText} onChange={e => setElapsedText(e.target.value)} />
        <InputField label={`Перекачано из ${config.source} за это время, мм`} value={transferredText} onChange={e => setTransferredText(e.target.value)} />
      </>}
      <div className="my-4 border-t border-gray-300" />
      <ChipGroup label={`Расчёт перекачки ${config.source} до:`} options={config.targetsMm.map(value => ({ label: String(value), value }))}
        selectedValue={sharedData[targetKey]} isCustom={customTarget} onSelect={(value, custom) => { setCustomTarget(custom); if (value !== null) change(targetKey, value); }}
        customInputValue={targetText} onCustomInputChange={value => { setTargetText(value); const parsed = parseInput(value); if (parsed !== null && parsed >= 0) change(targetKey, parsed); }} customLabel="Цель (мм)" />
      <div className="my-4 border-t border-gray-300" />
      <ChipGroup label={`Новый раствор, мм по ${config.source}`} options={[...config.batchesMm.map(value => ({ label: String(value), value })), { label: 'Нет', value: null }]}
        selectedValue={batchMm} isCustom={customBatch} onSelect={(value, custom) => { setCustomBatch(custom); setBatchMm(value); }}
        customInputValue={batchText} onCustomInputChange={setBatchText} customLabel="Объём партии (мм)" />
      <details className="text-sm mb-4"><summary>Проверка перелива — УТОЧНИТЬ</summary>
        <InputField label={`Максимум ${config.feed} (${config.unit}), пусто — не задан`} value={feedMaxText} onChange={e => setFeedMaxText(e.target.value)} />
        <p>УТОЧНИТЬ на установке. Без максимума проверка выключена. RATE_MIN: {formatDecimal(config.rateMinPerHour, 1)} {config.unit}/ч — УТОЧНИТЬ.</p>
      </details>
      <div className="mt-8 flex justify-center"><button onClick={calculate} className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow">
        <Calculator size={20} />Рассчитать</button></div>
      <ResultBox result={sharedData[resultKey]} />
      <p className="text-xs text-gray-600 mt-4">Расчёт информационный. Не управляет оборудованием, не заменяет регламент, сигнализацию, блокировки и ПАЗ.</p>
    </div>
  </div>;
}
