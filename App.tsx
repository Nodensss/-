import React, { useState } from 'react';
import TankForm323321 from './components/TankForm323321';
import TankForm315324 from './components/TankForm315324';
import TankSimulation from './components/TankSimulation';
import { Droplets } from 'lucide-react';

export interface SharedTankData {
  // System 321 → 323
  level323: string;
  level321: string;
  flowRate323: string;
  result323321: string;
  target321: number; // Target level for 321 transfer (160, 0, or custom)

  // System 315 → 324
  level315: string;
  level324: string;
  consumptionRate324: string;
  result315324: string;
  target315: number; // Target level for 315 transfer (260, 0, or custom)
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);

  // Shared state for all tabs
  const [sharedData, setSharedData] = useState<SharedTankData>({
    level323: '45',
    level321: '500',
    flowRate323: '2.5',
    result323321: '',
    target321: 160, // Default target

    level315: '600',
    level324: '200',
    consumptionRate324: '15',
    result315324: '',
    target315: 260, // Default target
  });

  const updateSharedData = (updates: Partial<SharedTankData>) => {
    setSharedData(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* AppBar / Header */}
      <header className="bg-indigo-600 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Droplets className="w-6 h-6" />
          <h1 className="text-xl font-bold tracking-wide">Tank App</h1>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={() => setActiveTab(0)}
            className={`flex-1 py-3 text-sm font-medium uppercase tracking-wider border-b-4 transition-colors ${activeTab === 0
              ? 'border-white bg-indigo-700/50 text-white'
              : 'border-transparent text-indigo-200 hover:bg-indigo-700/30'
              }`}
          >
            321 → 323
          </button>
          <button
            onClick={() => setActiveTab(1)}
            className={`flex-1 py-3 text-sm font-medium uppercase tracking-wider border-b-4 transition-colors ${activeTab === 1
              ? 'border-white bg-indigo-700/50 text-white'
              : 'border-transparent text-indigo-200 hover:bg-indigo-700/30'
              }`}
          >
            315 → 324
          </button>
          <button
            onClick={() => setActiveTab(2)}
            className={`flex-1 py-3 text-sm font-medium uppercase tracking-wider border-b-4 transition-colors ${activeTab === 2
              ? 'border-white bg-indigo-700/50 text-white'
              : 'border-transparent text-indigo-200 hover:bg-indigo-700/30'
              }`}
          >
            Симуляция
          </button>
        </div>
      </header>

      {/* Content Body */}
      <main className="w-full">
        {activeTab === 0 ? (
          <TankForm323321 sharedData={sharedData} updateSharedData={updateSharedData} />
        ) : activeTab === 1 ? (
          <TankForm315324 sharedData={sharedData} updateSharedData={updateSharedData} />
        ) : (
          <TankSimulation sharedData={sharedData} />
        )}
      </main>
    </div>
  );
};

export default App;