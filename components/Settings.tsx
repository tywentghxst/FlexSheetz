
import React, { useState } from 'react';
import { AppState } from '../types';
import { INITIAL_STORES, COLORS } from '../constants';
import { generateId } from '../utils';

interface SettingsProps {
  state: AppState;
  updateState: (updater: (prev: AppState) => AppState) => void;
}

const Settings: React.FC<SettingsProps> = ({ state, updateState }) => {
  const [newStore, setNewStore] = useState({ number: '', address: '' });

  const handleReset = () => {
    if (confirm('WIPE ALL DATA? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const addStore = () => {
    if (!newStore.number || !newStore.address) return;
    updateState(prev => ({
      ...prev,
      stores: [...prev.stores, { id: generateId(), ...newStore }]
    }));
    setNewStore({ number: '', address: '' });
  };

  const removeStore = (id: string) => {
    if (state.stores.length <= 1) return alert("Must have at least one store.");
    updateState(prev => ({
      ...prev,
      stores: prev.stores.filter(s => s.id !== id)
    }));
  };

  return (
    <div className="p-4 max-w-2xl mx-auto pb-32">
      <header className="mb-8">
        <h2 className="text-3xl font-black">Settings</h2>
        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Configuration & Preferences</p>
      </header>

      <div className="space-y-6">
        <section className="bg-zinc-900 p-6 rounded-3xl border border-white/5 shadow-xl">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-6">District Profile</h3>
           <div className="flex items-center gap-4">
              <label className="flex-1">
                 <span className="block text-xs font-bold text-zinc-500 mb-1">DISTRICT NUMBER</span>
                 <input 
                  type="text" 
                  className="w-full bg-zinc-800 rounded-xl p-4 border-none focus:ring-2 focus:ring-red-500 text-xl font-black"
                  value={state.district}
                  onChange={e => updateState(prev => ({ ...prev, district: e.target.value }))}
                 />
              </label>
           </div>
        </section>

        <section className="bg-zinc-900 p-6 rounded-3xl border border-white/5 shadow-xl">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-6">Appearance</h3>
           <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-2xl">
                 <span className="text-sm font-bold">Dark Mode (OLED)</span>
                 <button 
                  onClick={() => updateState(prev => ({ ...prev, darkMode: !prev.darkMode }))}
                  className={`w-14 h-8 rounded-full transition-all relative ${state.darkMode ? 'bg-red-600' : 'bg-zinc-700'}`}
                 >
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${state.darkMode ? 'left-7' : 'left-1'}`} />
                 </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-2xl">
                 <span className="text-sm font-bold">DT Label Format</span>
                 <button 
                  onClick={() => updateState(prev => ({ ...prev, driveTimeLabel: prev.driveTimeLabel === 'Drive Time' ? 'DT' : 'Drive Time' }))}
                  className="bg-zinc-700 px-4 py-2 rounded-xl text-xs font-black uppercase"
                 >
                    {state.driveTimeLabel}
                 </button>
              </div>
           </div>
        </section>

        <section className="bg-zinc-900 p-6 rounded-3xl border border-white/5 shadow-xl">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-6">Manage Stores</h3>
           <div className="space-y-3 mb-6">
              {state.stores.map(store => (
                 <div key={store.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                       <span className="text-red-500 font-black">#{store.number}</span>
                       <span className="text-[10px] font-bold text-zinc-500 truncate max-w-[150px]">{store.address}</span>
                    </div>
                    <button onClick={() => removeStore(store.id)} className="text-zinc-600 hover:text-red-500">✕</button>
                 </div>
              ))}
           </div>
           <div className="p-4 bg-black/40 rounded-2xl space-y-3">
              <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Add New Store</h4>
              <input 
                className="w-full bg-zinc-800 rounded-lg p-3 text-xs border-none" 
                placeholder="Store Number (e.g. 742)"
                value={newStore.number}
                onChange={e => setNewStore({ ...newStore, number: e.target.value })}
              />
              <input 
                className="w-full bg-zinc-800 rounded-lg p-3 text-xs border-none" 
                placeholder="Full Street Address"
                value={newStore.address}
                onChange={e => setNewStore({ ...newStore, address: e.target.value })}
              />
              <button 
                onClick={addStore}
                className="w-full bg-white/5 hover:bg-white/10 text-white font-black py-3 rounded-xl text-[10px]"
              >
                SAVE STORE TO DIRECTORY
              </button>
           </div>
        </section>

        <section className="pt-6">
           <button 
            onClick={handleReset}
            className="w-full bg-zinc-900 border border-red-500/20 text-red-500 font-black py-4 rounded-2xl text-xs tracking-widest active:bg-red-500 active:text-white transition-all"
           >
             RESET APPLICATION DATA
           </button>
           <p className="text-center text-[9px] font-bold text-zinc-600 mt-4 uppercase tracking-[4px]">Version 1.0.4-Stable</p>
        </section>
      </div>
    </div>
  );
};

export default Settings;
