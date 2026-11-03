import React, { useState, useEffect, useCallback } from 'react';
import { parseInput, formatNumber, PAIR_321, PAIR_315, transfer, evolveLevels } from '../core';
import { InputField } from './UIComponents';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { SharedTankData } from '../App';

interface TankLevels {
    tank321: number;
    tank323: number;
    tank315: number;
    tank324: number;
}

interface TransferState {
    transfer315to324: boolean;
    transfer321to323: boolean;
}

interface TankSimulationProps {
    sharedData: SharedTankData;
}

const TankSimulation: React.FC<TankSimulationProps> = ({ sharedData }) => {
    // Use shared data for initial values
    const getInitialLevelsFromShared = (): TankLevels => ({
        tank321: parseInput(sharedData.level321) || 500,
        tank323: parseInput(sharedData.level323) || 45,
        tank315: parseInput(sharedData.level315) || 600,
        tank324: parseInput(sharedData.level324) || 200,
    });

    // Initial levels
    const [initialLevels, setInitialLevels] = useState<TankLevels>(getInitialLevelsFromShared());

    // Update initial levels when shared data changes
    useEffect(() => {
        setInitialLevels(getInitialLevelsFromShared());
        setCurrentTime(0); // Reset simulation when data changes
    }, [sharedData.level321, sharedData.level323, sharedData.level315, sharedData.level324, sharedData.target321, sharedData.target315]);

    // Current simulation state
    const [currentLevels, setCurrentLevels] = useState<TankLevels>(initialLevels);

    // Consumption rates from shared data
    const consumptionRate324 = sharedData.consumptionRate324;
    const consumptionRate323 = sharedData.flowRate323;

    // Time control
    const [currentTime, setCurrentTime] = useState(0); // hours elapsed
    const [maxTime, setMaxTime] = useState(48); // hours
    const [isPlaying, setIsPlaying] = useState(false);

    // Transfer states
    const [transferState, setTransferState] = useState<TransferState>({
        transfer315to324: false,
        transfer321to323: false,
    });

    // Format time for display (current time + elapsed hours)
    const formatTimeDisplay = (elapsedHours: number): string => {
        const currentDate = new Date();
        currentDate.setHours(currentDate.getHours() + Math.floor(elapsedHours));
        currentDate.setMinutes(currentDate.getMinutes() + Math.round((elapsedHours % 1) * 60));

        const hours = currentDate.getHours().toString().padStart(2, '0');
        const minutes = currentDate.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    // Calculate state at specific time
    const calculateStateAtTime = useCallback((timeHours: number): { levels: TankLevels; transfers: TransferState } => {
        const rate324 = parseInput(consumptionRate324) || 15;
        const rate323 = parseInput(consumptionRate323) || 2.5;

        let levels = { ...initialLevels };
        let transfers = { transfer315to324: false, transfer321to323: false };

        const timeStep = 0.01; // hours - smaller steps for more precision
        let t = 0;

        while (t < timeHours) {
            const dt = Math.min(timeStep, timeHours - t);

            // Consume from tank 324
            levels.tank324 = evolveLevels(PAIR_315, levels.tank315, levels.tank324, rate324, dt).feedLevel;

            // Consume from tank 323
            levels.tank323 = evolveLevels(PAIR_321, levels.tank321, levels.tank323, rate323, dt).feedLevel;

            // Check if transfer 315→324 should activate
            // Transfer from 315 down to target level (from shared data)
            const target315 = sharedData.target315;
            if (levels.tank324 <= PAIR_315.deadLevel && levels.tank315 > target315) {
                transfers.transfer315to324 = true;
                // Transfer from 315 down to target level
                const moved = transfer(PAIR_315, levels.tank315, target315);
                levels.tank324 += moved.addedFeed;
                levels.tank315 = target315;
            } else {
                transfers.transfer315to324 = false;
            }

            // Check if transfer 321→323 should activate
            // Transfer from 321 down to target level (from shared data)
            const target321 = sharedData.target321;
            if (levels.tank323 <= PAIR_321.deadLevel && levels.tank321 > target321) {
                transfers.transfer321to323 = true;
                // Transfer from 321 down to target level
                const moved = transfer(PAIR_321, levels.tank321, target321);
                levels.tank323 += moved.addedFeed;
                levels.tank321 = target321;
            } else {
                transfers.transfer321to323 = false;
            }

            t += dt;
        }

        return { levels, transfers };
    }, [initialLevels, consumptionRate324, consumptionRate323]);

    // Update current state when time changes
    useEffect(() => {
        const { levels, transfers } = calculateStateAtTime(currentTime);
        setCurrentLevels(levels);
        setTransferState(transfers);
    }, [currentTime, calculateStateAtTime]);

    // Auto-play functionality
    useEffect(() => {
        if (!isPlaying) return;

        const interval = setInterval(() => {
            setCurrentTime(prev => {
                if (prev >= maxTime) {
                    setIsPlaying(false);
                    return maxTime;
                }
                return prev + 0.1;
            });
        }, 100);

        return () => clearInterval(interval);
    }, [isPlaying, maxTime]);

    const handleReset = () => {
        setIsPlaying(false);
        setCurrentTime(0);

        const newLevels = getInitialLevelsFromShared();
        setInitialLevels(newLevels);
        setCurrentLevels(newLevels);
    };

    const TankVisual: React.FC<{
        label: string;
        level: number;
        max: number;
        unit: string;
        color: string;
        isTransferring?: boolean;
    }> = ({ label, level, max, unit, color, isTransferring }) => {
        const percentage = Math.min((level / max) * 100, 100);

        return (
            <div className="flex flex-col items-center">
                <div className="text-sm font-semibold mb-2">{label}</div>
                <div className="relative w-20 h-40 bg-gray-200 rounded-lg border-2 border-gray-400 overflow-hidden">
                    <div
                        className={`absolute bottom-0 w-full transition-all duration-300 ${color}`}
                        style={{ height: `${percentage}%` }}
                    >
                        {isTransferring && (
                            <div className="absolute inset-0 animate-pulse bg-white/30"></div>
                        )}
                    </div>
                </div>
                <div className="mt-2 text-center">
                    <div className="text-lg font-bold">{formatNumber(level, 1)}</div>
                    <div className="text-xs text-gray-600">{unit}</div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-lg min-h-[calc(100vh-120px)]">
            <div className="max-w-6xl mx-auto">
                {/* Info Banner */}
                <div className="bg-blue-100 border-l-4 border-blue-500 p-4 mb-6 rounded">
                    <p className="text-sm text-blue-800">
                        <strong>💡 Совет:</strong> Данные автоматически загружаются из вкладок расчета. Измените значения на вкладках "321 → 323" или "315 → 324", и они сразу отобразятся здесь.
                    </p>
                </div>

                {/* Current Values Display */}
                <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl shadow-lg mb-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-800">Текущие параметры симуляции</h2>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Left Panel - 321→323 */}
                        <div className="space-y-2">
                            <h3 className="font-semibold text-teal-700 mb-3">Система 321 → 323</h3>
                            <div className="text-sm">
                                <span className="text-gray-600">Уровень в 321:</span> <strong>{sharedData.level321 || '—'} мм</strong>
                            </div>
                            <div className="text-sm">
                                <span className="text-gray-600">Уровень в 323:</span> <strong>{sharedData.level323 || '—'} %</strong>
                            </div>
                            <div className="text-sm">
                                <span className="text-gray-600">Расход 323:</span> <strong>{sharedData.flowRate323 || '—'} %/ч</strong>
                            </div>
                            <div className="text-sm">
                                <span className="text-gray-600">Перекачка до:</span> <strong>{sharedData.target321} мм</strong>
                            </div>
                        </div>

                        {/* Right Panel - 315→324 */}
                        <div className="space-y-2">
                            <h3 className="font-semibold text-orange-700 mb-3">Система 315 → 324</h3>
                            <div className="text-sm">
                                <span className="text-gray-600">Уровень в 315:</span> <strong>{sharedData.level315 || '—'} мм</strong>
                            </div>
                            <div className="text-sm">
                                <span className="text-gray-600">Уровень в 324:</span> <strong>{sharedData.level324 || '—'} мм</strong>
                            </div>
                            <div className="text-sm">
                                <span className="text-gray-600">Расход 324:</span> <strong>{sharedData.consumptionRate324 || '—'} мм/ч</strong>
                            </div>
                            <div className="text-sm">
                                <span className="text-gray-600">Перекачка до:</span> <strong>{sharedData.target315} мм</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Visualization Section */}
                <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl shadow-lg mb-6">
                    <h2 className="text-xl font-bold mb-6 text-gray-800 text-center">
                        Визуализация ёмкостей
                    </h2>

                    <div className="flex justify-around items-end mb-8">
                        <div className="text-center">
                            <TankVisual
                                label="321"
                                level={currentLevels.tank321}
                                max={PAIR_321.sourceScaleMm}
                                unit="мм"
                                color="bg-teal-400"
                                isTransferring={transferState.transfer321to323}
                            />
                            {transferState.transfer321to323 && (
                                <div className="mt-2 text-xs font-semibold text-teal-600 animate-pulse">
                                    ⬇ Перекачка
                                </div>
                            )}
                        </div>

                        <TankVisual
                            label="323"
                            level={currentLevels.tank323}
                            max={PAIR_321.feedScale}
                            unit="%"
                            color="bg-teal-500"
                        />

                        <div className="w-12"></div>

                        <div className="text-center">
                            <TankVisual
                                label="315"
                                level={currentLevels.tank315}
                                max={PAIR_315.sourceScaleMm}
                                unit="мм"
                                color="bg-orange-400"
                                isTransferring={transferState.transfer315to324}
                            />
                            {transferState.transfer315to324 && (
                                <div className="mt-2 text-xs font-semibold text-orange-600 animate-pulse">
                                    ⬇ Перекачка
                                </div>
                            )}
                        </div>

                        <TankVisual
                            label="324"
                            level={currentLevels.tank324}
                            max={PAIR_315.feedScale}
                            unit="мм"
                            color="bg-orange-500"
                        />
                    </div>

                    {/* Transfer Status */}
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                        <div className={`p-3 rounded-lg ${transferState.transfer321to323 ? 'bg-teal-100 border-2 border-teal-500' : 'bg-gray-100'}`}>
                            <div className="font-semibold text-sm">321 → 323</div>
                            <div className="text-xs mt-1">
                                {transferState.transfer321to323 ? `🟢 Активна (до ${sharedData.target321} мм)` : '⚪ Неактивна'}
                            </div>
                        </div>
                        <div className={`p-3 rounded-lg ${transferState.transfer315to324 ? 'bg-orange-100 border-2 border-orange-500' : 'bg-gray-100'}`}>
                            <div className="font-semibold text-sm">315 → 324</div>
                            <div className="text-xs mt-1">
                                {transferState.transfer315to324 ? `🟢 Активна (до ${sharedData.target315} мм)` : '⚪ Неактивна'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Time Control Section */}
                <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-800">Временная шкала</h2>
                        <div className="text-3xl font-bold text-indigo-600 tabular-nums">
                            {formatTimeDisplay(currentTime)}
                        </div>
                    </div>

                    <div className="text-sm text-gray-600 mb-2 text-right">
                        Прошло: {formatNumber(currentTime, 1)} ч
                    </div>

                    {/* Time Slider */}
                    <div className="mb-6">
                        <input
                            type="range"
                            min="0"
                            max={maxTime}
                            step="0.1"
                            value={currentTime}
                            onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                            className="w-full h-3 bg-gradient-to-r from-indigo-200 to-indigo-400 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <div className="flex justify-between text-xs text-gray-600 mt-1">
                            <span>{formatTimeDisplay(0)}</span>
                            <span>{formatTimeDisplay(maxTime)}</span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold shadow transition-all active:scale-95 ${isPlaying
                                ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                : 'bg-green-500 hover:bg-green-600 text-white'
                                }`}
                        >
                            {isPlaying ? (
                                <>
                                    <Pause size={20} />
                                    Пауза
                                </>
                            ) : (
                                <>
                                    <Play size={20} />
                                    Старт
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold shadow transition-all active:scale-95"
                        >
                            <RotateCcw size={20} />
                            Сброс
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          background: #4f46e5;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          background: #4f46e5;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          border: none;
        }
      `}</style>
        </div>
    );
};

export default TankSimulation;
