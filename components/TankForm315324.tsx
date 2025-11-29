import React, { useState } from 'react';
import { parseInput, formatNumber } from '../utils';
import { InputField, ChipGroup, ResultBox } from './UIComponents';
import { Calculator } from 'lucide-react';

// Transfer proportion: when 315 loses 1mm, 324 gains 1.2814mm
// Based on real data: 315 (427→260, -167mm) → 324 (360→574, +214mm)
// Coefficient: 214/167 ≈ 1.2814
const TRANSFER_PROPORTION_315_TO_324 = 1.2814;

const TankForm315324: React.FC = () => {
  const [level315, setLevel315] = useState('');
  const [level324, setLevel324] = useState('');
  const [consumptionRate, setConsumptionRate] = useState('');
  const [result, setResult] = useState('');

  // Target Logic
  const [target315, setTarget315] = useState<number>(260.0);
  const [useCustom315, setUseCustom315] = useState(false);
  const [customTarget315Str, setCustomTarget315Str] = useState('');

  // Batch Logic
  const [batchMm315, setBatchMm315] = useState<number | null>(null);
  const [useCustomBatch315, setUseCustomBatch315] = useState(false);
  const [customBatch315Str, setCustomBatch315Str] = useState('');

  const calculate = () => {
    const l315 = parseInput(level315);
    const l324 = parseInput(level324);
    const rate = parseInput(consumptionRate);

    if (l315 === null || l324 === null || rate === null) {
      setResult('Проверь ввод: три числа.');
      return;
    }
    if (rate <= 0) {
      setResult('Скорость должна быть > 0.');
      return;
    }

    // Determine actual target
    let actualTarget = target315;
    if (useCustom315) {
        const parsedCustom = parseInput(customTarget315Str);
        if (parsedCustom !== null) {
            actualTarget = parsedCustom;
        }
    }

    if (l315 <= actualTarget) {
      setResult(`В 315 уже ${formatNumber(l315)} мм, это ≤ выбранного значения ${formatNumber(actualTarget)} мм. Перекачка не требуется.`);
      return;
    }

    const mmToTransfer = Math.max(l315 - actualTarget, 0);
    
    // Calculate final level in 324 considering transfer proportion
    // When 315 loses X mm, 324 gains X * TRANSFER_PROPORTION_315_TO_324 mm
    const mmGainedIn324 = mmToTransfer * TRANSFER_PROPORTION_315_TO_324;
    const finalLevel324 = l324 + mmGainedIn324;
    const hours = finalLevel324 / rate;

    let batchLine = '';
    let currentBatchMm = batchMm315;

    if (useCustomBatch315) {
        const parsedBatch = parseInput(customBatch315Str);
        currentBatchMm = parsedBatch;
   }

    if (currentBatchMm !== null && currentBatchMm > 0) {
      const batchMmIn324 = currentBatchMm * TRANSFER_PROPORTION_315_TO_324;
      const batchHours = batchMmIn324 / rate;
      batchLine = `\nЕсли потом приготовим новый раствор ${formatNumber(currentBatchMm)} мм (по 315) = ${formatNumber(batchMmIn324, 1)} мм (по 324), то при расходе ${formatNumber(rate, 1)} мм/ч его хватит на ${formatNumber(batchHours, 2)} ч`;
    }

    setResult([
      `Перекачиваем 315 до: ${formatNumber(actualTarget)} мм`,
      `Из 315 убывает: ${formatNumber(mmToTransfer, 1)} мм`,
      `В 324 прибывает: ${formatNumber(mmGainedIn324, 1)} мм (коэфф. ×${TRANSFER_PROPORTION_315_TO_324})`,
      `Итоговый уровень в 324: ${formatNumber(finalLevel324, 1)} мм`,
      `На сколько раствора хватит при расходе ${formatNumber(rate, 1)} мм/ч: ${formatNumber(hours, 2)} ч`,
      batchLine
    ].filter(Boolean).join('\n'));
  };

  const handleTargetSelect = (val: number | null, isCustom: boolean) => {
    setUseCustom315(isCustom);
    if (!isCustom && val !== null) {
      setTarget315(val);
      setCustomTarget315Str('');
    }
  };

  const handleBatchSelect = (val: number | null, isCustom: boolean) => {
    setUseCustomBatch315(isCustom);
    if (!isCustom) {
      setBatchMm315(val);
      setCustomBatch315Str('');
    }
  };

  return (
    <div className="bg-orange-50 p-4 rounded-lg min-h-[calc(100vh-120px)]">
      <div className="max-w-lg mx-auto bg-white/50 p-6 rounded-xl backdrop-blur-sm shadow-sm">
        <InputField 
          label="Уровень в 324 (мм)" 
          value={level324} 
          onChange={(e) => setLevel324(e.target.value)} 
          placeholder="Например: 200"
        />
        <InputField 
          label="Уровень в 315 (мм)" 
          value={level315} 
          onChange={(e) => setLevel315(e.target.value)} 
          placeholder="Например: 600"
        />
        <InputField 
          label="Скорость расхода (мм/ч)" 
          value={consumptionRate} 
          onChange={(e) => setConsumptionRate(e.target.value)} 
          placeholder="Например: 15"
        />

        <div className="my-4 border-t border-gray-300"></div>

        <ChipGroup
          label="Перекачиваем 315 до:"
          options={[
            { label: '260', value: 260 },
            { label: '0', value: 0 },
          ]}
          selectedValue={target315}
          isCustom={useCustom315}
          onSelect={handleTargetSelect}
          customInputValue={customTarget315Str}
          onCustomInputChange={setCustomTarget315Str}
          customLabel="Значение 315 (мм)"
        />

        <div className="my-4 border-t border-gray-300"></div>

        <ChipGroup
          label="Новый раствор (опционально): эквивалент в мм по 315"
          options={[
            { label: '300', value: 300 },
            { label: '600', value: 600 },
            { label: '900', value: 900 },
            { label: 'Нет', value: null },
          ]}
          selectedValue={batchMm315}
          isCustom={useCustomBatch315}
          onSelect={handleBatchSelect}
          customInputValue={customBatch315Str}
          onCustomInputChange={setCustomBatch315Str}
          customLabel="Объём нового раствора (мм по 315)"
        />

        <div className="mt-8 flex justify-center">
          <button
            onClick={calculate}
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shadow transition-all active:scale-95"
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

export default TankForm315324;
