import React, { useState } from 'react';
import TankForm323321 from './components/TankForm323321';
import TankForm315324 from './components/TankForm315324';
import { Droplets } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<0 | 1>(0);

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
            className={`flex-1 py-3 text-sm font-medium uppercase tracking-wider border-b-4 transition-colors ${
              activeTab === 0
                ? 'border-white bg-indigo-700/50 text-white'
                : 'border-transparent text-indigo-200 hover:bg-indigo-700/30'
            }`}
          >
            321 → 323
          </button>
          <button
            onClick={() => setActiveTab(1)}
            className={`flex-1 py-3 text-sm font-medium uppercase tracking-wider border-b-4 transition-colors ${
              activeTab === 1
                ? 'border-white bg-indigo-700/50 text-white'
                : 'border-transparent text-indigo-200 hover:bg-indigo-700/30'
            }`}
          >
            315 → 324
          </button>
        </div>
      </header>

      {/* Content Body */}
      <main className="w-full">
        {activeTab === 0 ? <TankForm323321 /> : <TankForm315324 />}
      </main>
    </div>
  );
};

export default App;