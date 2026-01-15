
import React, { useState, useEffect, useMemo } from 'react';
import { AppState, Store, Employee, ShiftType, DayStatus, Announcement } from './types';
import { INITIAL_STORES, COLORS } from './constants';
import Planner from './components/Planner';
import Locations from './components/Locations';
import Announcements from './components/Announcements';
import History from './components/History';
import Team from './components/Team';
import Settings from './components/Settings';

const STORAGE_KEY = 'sheetz_flex_app_state_v1';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return {
      district: '42',
      darkMode: true,
      driveTimeLabel: 'Drive Time',
      stores: INITIAL_STORES,
      employees: [],
      schedule: {},
      announcements: []
    };
  });

  const [activeTab, setActiveTab] = useState('Planner');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updateState = (updater: (prev: AppState) => AppState) => {
    setState(prev => updater(prev));
  };

  const currentThemeClass = state.darkMode ? 'bg-black text-white' : 'bg-gray-50 text-gray-900';

  return (
    <div className={`min-h-screen flex flex-col ${currentThemeClass} transition-colors duration-300`}>
      {/* Header */}
      <header className="sticky top-0 z-50 shadow-lg" style={{ backgroundColor: COLORS.sheetzRed }}>
        <div className="px-4 py-3 flex justify-between items-center">
          <h1 className="font-black text-xl tracking-tighter text-white uppercase italic">
            FLEX<span style={{ color: COLORS.sheetzGold }}>SHEETZ</span>
            <span className="ml-2 font-normal text-xs opacity-90 block sm:inline not-italic lowercase">District {state.district}</span>
          </h1>
          <div className="text-[9px] font-black text-white/40 uppercase tracking-widest hidden sm:block">Real-time Sync Active</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24 overflow-x-hidden">
        {activeTab === 'Planner' && <Planner state={state} updateState={updateState} />}
        {activeTab === 'Locations' && <Locations state={state} updateState={updateState} />}
        {activeTab === 'Announcements' && <Announcements state={state} updateState={updateState} />}
        {activeTab === 'History' && <History state={state} updateState={updateState} />}
        {activeTab === 'Team' && <Team state={state} updateState={updateState} />}
        {activeTab === 'Settings' && <Settings state={state} updateState={updateState} />}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-t border-white/10 px-2 py-2">
        <div className="flex justify-around items-center max-w-4xl mx-auto">
          {[
            { id: 'Planner', icon: '📅' },
            { id: 'Locations', icon: '📍' },
            { id: 'Announcements', icon: '📢' },
            { id: 'History', icon: '📂' },
            { id: 'Team', icon: '👥' },
            { id: 'Settings', icon: '⚙️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                activeTab === tab.id ? 'bg-white/10 text-white' : 'text-gray-500'
              }`}
            >
              <span className="text-xl mb-1">{tab.icon}</span>
              <span className="text-[10px] uppercase font-bold tracking-widest">{tab.id}</span>
              {activeTab === tab.id && (
                <div className="h-1 w-4 rounded-full mt-1" style={{ backgroundColor: COLORS.sheetzRed }} />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default App;
