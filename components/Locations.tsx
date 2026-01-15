
import React from 'react';
import { AppState } from '../types';
import { COLORS } from '../constants';

interface LocationsProps {
  state: AppState;
  updateState: (updater: (prev: AppState) => AppState) => void;
}

const Locations: React.FC<LocationsProps> = ({ state }) => {
  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    alert('Address copied to clipboard!');
  };

  const handleOpenMaps = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="p-4">
      <header className="mb-8">
        <h2 className="text-3xl font-black">Locations</h2>
        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">District {state.district} Portfolio</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {state.stores.map(store => (
          <div key={store.id} className="bg-zinc-900 border border-white/5 rounded-3xl p-6 relative group overflow-hidden shadow-xl">
             <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl">#{store.number}</div>
             
             <div className="relative z-10">
                <div className="text-red-600 font-black text-xs mb-1 uppercase tracking-widest">Store Number</div>
                <div className="text-2xl font-black mb-4">#{store.number}</div>
                
                <div className="flex items-start gap-3 mb-6">
                   <span className="text-xl">📍</span>
                   <p className="text-sm text-zinc-400 font-medium leading-relaxed">{store.address}</p>
                </div>

                <div className="flex gap-2">
                   <button 
                    onClick={() => handleCopy(store.address)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black py-3 rounded-xl transition-all"
                   >
                     COPY ADDRESS
                   </button>
                   <button 
                    onClick={() => handleOpenMaps(store.address)}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black py-3 rounded-xl transition-all shadow-lg"
                   >
                     OPEN IN MAPS
                   </button>
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Locations;
