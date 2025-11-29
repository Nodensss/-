import React, { useState } from 'react';
import { parseInput, formatNumber } from '../utils';
import { InputField, ChipGroup, ResultBox } from './UIComponents';
import { Calculator } from 'lucide-react';

const TankForm323321: React.FC = () => {
  const [level323, setLevel323] = useState('');
  const [level321, setLevel321] = useState('');
  const [flowRate, setFlowRate] = useState('');
  const [result, setResult] = useState('');

  // Target Logic
  const [target321, setTarget321] = useState<number>(160.0);
  const [useCustom321, setUseCustom321] = useState(false);
  const [customTarget321Str, setCustomTarget321Str] = useState('');

  // Batch Logic
  const [batchMm321, setBatchMm321] = useState<number | null>(null);
  const [useCustomBatch321, setUseCustomBatch321] = useState(false);
  const [customBatch321Str, setCustomBatch321Str] = useState('');

  // Constants
  const minLevel323 = 30.0;
  const maxLevel321 = 634.0;
  // Transfer proportion based on real data: 382mm from 321 → 38% increase in 323
  // Coefficient: 382 / 38 = 10.05 mm/%
  const proportionIncrease323 = 38.0;
  const proportionVolume321 = 382.0;
  const mmPerPercent = proportionVolume321 / proportionIncrease323;

  const calculate = () => {
    const l323 = parseInput(level323);
    const l321 = parseInput(level321);
    const rate = parseInput(flowRate);

    if (l323 === null || l321 === null || rate === null) {
      setResult('Проверь ввод: нужны три числа.');
      return;
    }

    if (rate <= 0) {
      setResult('Скорость должна быть > 0.');
      return;
    }

    if (l323 < minLevel323) {
      setResult(`В 323 сейчас ${l323}%, это ниже минимума ${minLevel323}%. Перекачка запрещена.`);
      return;
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
      setResult(`В 321 уже ${formatNumber(l321)} мм, это ≤ выбранного значения ${formatNumber(actualTarget)} мм. Перекачка не нужна.`);
      return;
    }

    // Calc pump amount
    const pumpMm = Math.min(Math.max(l321 - actualTarget, 0), maxLevel321);

    // Convert mm -> % for time calculation based on rate (%/h)
    const addedPercentTo323 = pumpMm / mmPerPercent;
    
    // Calculate total time based on current level + added amount
    // This fixes the issue where different 323 levels gave the same result.
    const totalPercentIn323 = l323 + addedPercentTo323;
    const hours = totalPercentIn323 / rate;

    let batchLine = '';
    let currentBatchMm = batchMm321;
    
    if (useCustomBatch321) {
         const parsedBatch = parseInput(customBatch321Str);
         currentBatchMm = parsedBatch;
    }

    if (currentBatchMm !== null && currentBatchMm > 0) {
      const batchPercent = currentBatchMm / mmPerPercent;
      const batchHours = batchPercent / rate;
      batchLine = `\nЕсли потом приготовим новый раствор объёмом ${formatNumber(currentBatchMm)} мм, то при расходе ${formatNumber(rate, 1)} %/ч его хватит на ${formatNumber(batchHours, 2)} ч`;
    }

    setResult([
      `Перекачиваем 321 до: ${formatNumber(actualTarget)} мм`,
      `Из 321 убывает: ${formatNumber(pumpMm)} мм`,
      `В 323 прибывает: ${formatNumber(addedPercentTo323, 1)}% (коэфф. ${formatNumber(mmPerPercent, 2)} мм/%)`,
      `Итоговый уровень в 323: ${formatNumber(totalPercentIn323, 1)}%`,
      `На сколько раствора хватит при расходе ${formatNumber(rate, 1)} %/ч: ${formatNumber(hours, 2)} ч`,
      batchLine
    ].filter(Boolean).join('\n'));
  };

  const handleTargetSelect = (val: number | null, isCustom: boolean) => {
    setUseCustom321(isCustom);
    if (!isCustom && val !== null) {
      setTarget321(val);
      setCustomTarget321Str('');
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
          value={level323} 
          onChange={(e) => setLevel323(e.target.value)} 
          placeholder="Например: 45"
        />
        <InputField 
          label="Уровень в 321 (мм)" 
          value={level321} 
          onChange={(e) => setLevel321(e.target.value)} 
          placeholder="Например: 500"
        />
        <InputField 
          label="Расход (%/ч)" 
          value={flowRate} 
          onChange={(e) => setFlowRate(e.target.value)} 
          placeholder="Например: 2.5"
        />

        <div className="my-4 border-t border-gray-300"></div>

        <ChipGroup
          label="Перекачиваем 321 до:"
          options={[
            { label: '160', value: 160 },
            { label: '0', value: 0 },
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
            { label: '382', value: 382 },
            { label: '600', value: 600 },
            { label: '900', value: 900 },
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

        <ResultBox result={result} />
      </div>
    </div>
  );
};

export default TankForm323321;
