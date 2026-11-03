import React, { useState, useEffect } from 'react';
import { parseInput, formatNumber, forecast, PAIR_321 } from '../core';
import { InputField, ChipGroup, ResultBox } from './UIComponents';
import { Calculator } from 'lucide-react';
import { SharedTankData } from '../App';

interface TankForm323321Props {
  sharedData: SharedTankData;
  updateSharedData: (updates: Partial<SharedTankData>) => void;
}

const TankForm323321: React.FC<TankForm323321Props> = ({ sharedData, updateSharedData }) => {
  // Target Logic - initialize from sharedData
  const [target321, setTarget321] = useState<number>(sharedData.target321);
  const [useCustom321, setUseCustom321] = useState(false);
  const [customTarget321Str, setCustomTarget321Str] = useState('');

  // Update shared state when target changes
  useEffect(() => {
    updateSharedData({ target321 });
  }, [target321]);

  // Batch Logic
  const [batchMm321, setBatchMm321] = useState<number | null>(null);
  const [useCustomBatch321, setUseCustomBatch321] = useState(false);
  const [customBatch321Str, setCustomBatch321Str] = useState('');

  const minLevel323 = PAIR_321.deadLevel;
  const mmPerPercent = 1 / PAIR_321.gainPerMm;

  const calculate = () => {
    const l323 = parseInput(sharedData.level323);
    const l321 = parseInput(sharedData.level321);
    const rate = parseInput(sharedData.flowRate323);

    if (l323 === null || l321 === null || rate === null) {
      updateSharedData({ result323321: 'Проверь ввод: нужны три числа.' });
      return;
    }

    if (rate <= 0) {
      updateSharedData({ result323321: 'Скорость должна быть > 0.' });
      return;
    }

    let warning = '';
    if (l323 < minLevel323) {
      warning = `⚠️ Внимание: Уровень в 323 (${l323}%) ниже неснижаемого остатка (${minLevel323}%).\n`;
    }

    // Determine actual target
    let actualTarget = target321;
    if (useCustom321) {
      const parsedCustom = parseInput(customTarget321Str);
      if (parsedCustom !== null) {
        actualTarget = parsedCustom;
      }
    }

    if (l321 <= actualTarget) {
      updateSharedData({
        result323321: `В 321 уже ${formatNumber(l321)} мм, это ≤ выбранного значения ${formatNumber(actualTarget)} мм. Перекачка не нужна.`
      });
      return;
    }

    const result = forecast(PAIR_321, { sourceLevelMm: l321, feedLevel: l323, ratePerHour: rate,
      targetMm: actualTarget, batchMm: 0, now: Date.now() });
    const pumpMm = result.sourceMm;
    const addedPercentTo323 = result.addedFeed;
    const totalPercentIn323 = result.finalLevel;
    const usefulPercent = result.usefulAfter;
    const hours = result.hoursAfter;

    let batchLine = '';
    let currentBatchMm = batchMm321;

    if (useCustomBatch321) {
      const parsedBatch = parseInput(customBatch321Str);
      currentBatchMm = parsedBatch;
    }

    if (currentBatchMm !== null && currentBatchMm > 0) {
      const batchPercent = forecast(PAIR_321, { sourceLevelMm: l321, feedLevel: l323, ratePerHour: rate, targetMm: actualTarget, batchMm: currentBatchMm, now: Date.now() }).batchHours * rate;
      const batchHours = forecast(PAIR_321, { sourceLevelMm: l321, feedLevel: l323, ratePerHour: rate, targetMm: actualTarget, batchMm: currentBatchMm, now: Date.now() }).batchHours;
      batchLine = `\nЕсли потом приготовим новый раствор объёмом ${formatNumber(currentBatchMm)} мм, то при расходе ${formatNumber(rate, 1)} %/ч его хватит на ${formatNumber(batchHours, 2)} ч`;
    }

    // Calculate time when solution will end (reach 30%)
    const currentDate = new Date();
    const endTimeDate = new Date(currentDate.getTime() + hours * 60 * 60 * 1000);
    const endTimeStr = `${endTimeDate.getHours().toString().padStart(2, '0')}:${endTimeDate.getMinutes().toString().padStart(2, '0')}`;

    // Add batch end time if batch is selected
    let batchEndTimeLine = '';
    if (currentBatchMm !== null && currentBatchMm > 0) {
      const batchPercent = forecast(PAIR_321, { sourceLevelMm: l321, feedLevel: l323, ratePerHour: rate, targetMm: actualTarget, batchMm: currentBatchMm, now: Date.now() }).batchHours * rate;
      const batchHours = forecast(PAIR_321, { sourceLevelMm: l321, feedLevel: l323, ratePerHour: rate, targetMm: actualTarget, batchMm: currentBatchMm, now: Date.now() }).batchHours;
      const batchEndTimeDate = new Date(endTimeDate.getTime() + batchHours * 60 * 60 * 1000);
      const batchEndTimeStr = `${batchEndTimeDate.getHours().toString().padStart(2, '0')}:${batchEndTimeDate.getMinutes().toString().padStart(2, '0')}`;
      batchEndTimeLine = `Новый раствор закончится в: ${batchEndTimeStr}`;
    }

    updateSharedData({
      result323321: [
        warning,
        `Перекачиваем 321 до: ${formatNumber(actualTarget)} мм`,
        `Из 321 убывает: ${formatNumber(pumpMm)} мм`,
        `В 323 прибывает: ${formatNumber(addedPercentTo323, 1)}% (коэфф. ${formatNumber(mmPerPercent, 2)} мм/%)`,
        `Итоговый уровень в 323: ${formatNumber(totalPercentIn323, 1)}%`,
        `Полезный объем (сверх ${minLevel323}%): ${formatNumber(usefulPercent, 1)}%`,
        `На сколько хватит полезного объема: ${formatNumber(hours, 2)} ч`,
        `Раствор закончится (323 достигнет 30%) в: ${endTimeStr}`,
        batchLine,
        batchEndTimeLine
      ].filter(Boolean).join('\n')
    });
  };

  const handleTargetSelect = (val: number | null, isCustom: boolean) => {
    setUseCustom321(isCustom);
    if (!isCustom && val !== null) {
      setTarget321(val);
      setCustomTarget321Str('');
    } else if (isCustom) {
      // Update target from custom input when changed
      const parsedCustom = parseInput(customTarget321Str);
      if (parsedCustom !== null) {
        setTarget321(parsedCustom);
      }
    }
  };

  const handleBatchSelect = (val: number | null, isCustom: boolean) => {
    setUseCustomBatch321(isCustom);
    if (!isCustom) {
      setBatchMm321(val);
      setCustomBatch321Str('');
    }
  };

  return (
    <div className="bg-teal-50 p-4 rounded-lg min-h-[calc(100vh-120px)]">
      <div className="max-w-lg mx-auto bg-white/50 p-6 rounded-xl backdrop-blur-sm shadow-sm">
        <InputField
          label="Уровень в 323 (%)"
          value={sharedData.level323}
          onChange={(e) => updateSharedData({ level323: e.target.value })}
          placeholder="Например: 45"
        />
        <InputField
          label="Уровень в 321 (мм)"
          value={sharedData.level321}
          onChange={(e) => updateSharedData({ level321: e.target.value })}
          placeholder="Например: 500"
        />
        <InputField
          label="Расход (%/ч)"
          value={sharedData.flowRate323}
          onChange={(e) => updateSharedData({ flowRate323: e.target.value })}
          placeholder="Например: 2.5"
        />

        <div className="my-4 border-t border-gray-300"></div>

        <ChipGroup
          label="Перекачиваем 321 до:"
          options={[
            ...PAIR_321.targetsMm.map(value => ({ label: String(value), value })),
          ]}
          selectedValue={target321}
          isCustom={useCustom321}
          onSelect={handleTargetSelect}
          customInputValue={customTarget321Str}
          onCustomInputChange={setCustomTarget321Str}
          customLabel="Значение 321 (мм)"
        />

        <div className="my-4 border-t border-gray-300"></div>

        <ChipGroup
          label="Новый раствор (опционально): эквивалент в мм по 321"
          options={[
            ...PAIR_321.batchesMm.map(value => ({ label: String(value), value })),
            { label: 'Нет', value: null },
          ]}
          selectedValue={batchMm321}
          isCustom={useCustomBatch321}
          onSelect={handleBatchSelect}
          customInputValue={customBatch321Str}
          onCustomInputChange={setCustomBatch321Str}
          customLabel="Объём нового раствора (мм по 321)"
        />

        <div className="mt-8 flex justify-center">
          <button
            onClick={calculate}
            className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow transition-all active:scale-95"
          >
            <Calculator size={20} />
            Рассчитать
          </button>
        </div>

        <ResultBox result={sharedData.result323321} />
      </div>
    </div>
  );
};

export default TankForm323321;
