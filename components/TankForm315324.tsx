import React, { useState, useEffect } from 'react';
import { parseInput, formatNumber } from '../utils';
import { InputField, ChipGroup, ResultBox } from './UIComponents';
import { Calculator } from 'lucide-react';
import { SharedTankData } from '../App';

// Transfer proportion: when 315 loses 1mm, 324 gains 1.2814mm
// Based on real data: 315 (427→260, -167mm) → 324 (360→574, +214mm)
// Coefficient: 214/167 ≈ 1.2814
const TRANSFER_PROPORTION_315_TO_324 = 1.2814;

interface TankForm315324Props {
  sharedData: SharedTankData;
  updateSharedData: (updates: Partial<SharedTankData>) => void;
}

const TankForm315324: React.FC<TankForm315324Props> = ({ sharedData, updateSharedData }) => {
  // Target Logic - initialize from sharedData
  const [target315, setTarget315] = useState<number>(sharedData.target315);
  const [useCustom315, setUseCustom315] = useState(false);
  const [customTarget315Str, setCustomTarget315Str] = useState('');

  // Update shared state when target changes
  useEffect(() => {
    updateSharedData({ target315 });
  }, [target315]);

  // Batch Logic
  const [batchMm315, setBatchMm315] = useState<number | null>(null);
  const [useCustomBatch315, setUseCustomBatch315] = useState(false);
  const [customBatch315Str, setCustomBatch315Str] = useState('');

  // Constants
  const minLevel324 = 350.0; // Dead volume in mm

  const calculate = () => {
    const l315 = parseInput(sharedData.level315);
    const l324 = parseInput(sharedData.level324);
    const rate = parseInput(sharedData.consumptionRate324);

    if (l315 === null || l324 === null || rate === null) {
      updateSharedData({ result315324: 'Проверь ввод: три числа.' });
      return;
    }
    if (rate <= 0) {
      updateSharedData({ result315324: 'Скорость должна быть > 0.' });
      return;
    }

    let warning = '';
    if (l324 < minLevel324) {
      warning = `⚠️ Внимание: Уровень в 324 (${l324} мм) ниже неснижаемого остатка (${minLevel324} мм).\n`;
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
      updateSharedData({
        result315324: `В 315 уже ${formatNumber(l315)} мм, это ≤ выбранного значения ${formatNumber(actualTarget)} мм. Перекачка не требуется.`
      });
      return;
    }

    const mmToTransfer = Math.max(l315 - actualTarget, 0);

    // Calculate final level in 324 considering transfer proportion
    // When 315 loses X mm, 324 gains X * TRANSFER_PROPORTION_315_TO_324 mm
    const mmGainedIn324 = mmToTransfer * TRANSFER_PROPORTION_315_TO_324;
    const finalLevel324 = l324 + mmGainedIn324;

    // Dead Volume Logic: 350mm is unusable
    const usefulMm = Math.max(finalLevel324 - minLevel324, 0);
    const hours = usefulMm / rate;

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

    // Calculate time when solution will end (reach 350mm)
    const currentDate = new Date();
    const endTimeDate = new Date(currentDate.getTime() + hours * 60 * 60 * 1000);
    const endTimeStr = `${endTimeDate.getHours().toString().padStart(2, '0')}:${endTimeDate.getMinutes().toString().padStart(2, '0')}`;

    // Add batch end time if batch is selected
    let batchEndTimeLine = '';
    if (currentBatchMm !== null && currentBatchMm > 0) {
      const batchMmIn324 = currentBatchMm * TRANSFER_PROPORTION_315_TO_324;
      const batchHours = batchMmIn324 / rate;
      const batchEndTimeDate = new Date(endTimeDate.getTime() + batchHours * 60 * 60 * 1000);
      const batchEndTimeStr = `${batchEndTimeDate.getHours().toString().padStart(2, '0')}:${batchEndTimeDate.getMinutes().toString().padStart(2, '0')}`;
      batchEndTimeLine = `Новый раствор закончится в: ${batchEndTimeStr}`;
    }

    updateSharedData({
      result315324: [
        warning,
        `Перекачиваем 315 до: ${formatNumber(actualTarget)} мм`,
        `Из 315 убывает: ${formatNumber(mmToTransfer, 1)} мм`,
        `В 324 прибывает: ${formatNumber(mmGainedIn324, 1)} мм (коэфф. ×${TRANSFER_PROPORTION_315_TO_324})`,
        `Итоговый уровень в 324: ${formatNumber(finalLevel324, 1)} мм`,
        `Полезный объем (сверх ${minLevel324} мм): ${formatNumber(usefulMm, 1)} мм`,
        `На сколько хватит полезного объема: ${formatNumber(hours, 2)} ч`,
        `Раствор закончится (324 достигнет 350 мм) в: ${endTimeStr}`,
        batchLine,
        batchEndTimeLine
      ].filter(Boolean).join('\n')
    });
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
          value={sharedData.level324}
          onChange={(e) => updateSharedData({ level324: e.target.value })}
          placeholder="Например: 200"
        />
        <InputField
          label="Уровень в 315 (мм)"
          value={sharedData.level315}
          onChange={(e) => updateSharedData({ level315: e.target.value })}
          placeholder="Например: 600"
        />
        <InputField
          label="Скорость расхода (мм/ч)"
          value={sharedData.consumptionRate324}
          onChange={(e) => updateSharedData({ consumptionRate324: e.target.value })}
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

        <ResultBox result={sharedData.result315324} />
      </div>
    </div>
  );
};

export default TankForm315324;
