
import React, { useState } from 'react';
import { AppState } from '../types';
import { COLORS } from '../constants';

interface LocationsProps {
  state: AppState;
  updateState: (updater: (prev: AppState) => AppState) => void;
}

const Locations: React.FC<LocationsProps> = ({ state }) => {
  const [activeMenuStore, setActiveMenuStore] = useState<{ id: string, address: string } | null>(null);

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    alert('Address copied to clipboard!');
  };

  const openMap = (address: string, provider: 'google' | 'apple') => {
    const encoded = encodeURIComponent(address);
    const url = provider === 'google' 
      ? `https://www.google.com/maps/search/?api=1&query=${encoded}`
      : `maps://?q=${encoded}`;
    
    window.open(url, '_blank');
    setActiveMenuStore(null);
  };

  return (
    <div className="p-4 pb-32 max-w-4xl mx-auto">
      <header className="mb-10">
        <h2 className="text-4xl font-black tracking-tighter uppercase italic text-white">
          Store <span style={{ color: COLORS.sheetzRed }}>Directory</span>
        </h2>
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1">
          District {state.district} • {state.stores.length} Locations
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2">
        {state.stores.map(store => (
          <div key={store.id} className="bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-[2.5rem] p-8 relative group overflow-hidden shadow-2xl transition-all hover:border-red-500/30">
             <div className="absolute -top-4 -right-4 opacity-[0.03] font-black text-9xl select-none group-hover:opacity-[0.07] transition-opacity italic text-white">
               {store.number}
             </div>
             
             <div className="relative z-10 h-full flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-red-600 font-black text-[10px] uppercase tracking-widest mb-1">Sheetz Store</div>
                    <div className="text-4xl font-black italic tracking-tighter text-white">#{store.number}</div>
                  </div>
                  <div className="bg-red-600/10 p-3 rounded-2xl text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                
                <div className="flex-1 mb-8">
                   <p className="text-lg text-zinc-300 font-bold leading-snug pr-4">{store.address}</p>
                </div>

                <div className="flex gap-3 pt-4">
                   <button 
                    onClick={() => handleCopy(store.address)}
                    className="flex-1 bg-zinc-800/80 hover:bg-zinc-700 text-white text-[10px] font-black py-4 rounded-2xl transition-all uppercase tracking-widest border border-white/5 active:scale-95"
                   >
                     Copy
                   </button>
                   
                   <button 
                    onClick={() => setActiveMenuStore({ id: store.id, address: store.address })}
                    className="flex-[1.5] bg-red-600 hover:bg-red-500 text-white text-[10px] font-black py-4 rounded-2xl transition-all shadow-lg shadow-red-900/20 uppercase tracking-widest active:scale-95"
                   >
                     Get Directions
                   </button>
                </div>
             </div>
          </div>
        ))}
      </div>

      {activeMenuStore && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setActiveMenuStore(null)}
          />
          
          <div className="relative w-full max-w-sm bg-zinc-900 rounded-[2.5rem] border border-white/10 shadow-4xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 pb-[env(safe-area-inset-bottom)]">
            <div className="p-8 pb-4">
              <h3 className="text-2xl font-black text-center mb-1 text-white">Open in Maps</h3>
              <p className="text-center text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-8 text-white/50">Select your preferred navigation app</p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => openMap(activeMenuStore.address, 'google')}
                  className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 rounded-3xl transition-all group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-inner">
                      🗺️
                    </div>
                    <div className="text-left">
                      <div className="font-black text-sm uppercase tracking-tight text-white">Google Maps</div>
                      <div className="text-[10px] text-zinc-500 font-bold uppercase">Industry Standard</div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                    →
                  </div>
                </button>

                <button 
                  onClick={() => openMap(activeMenuStore.address, 'apple')}
                  className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 rounded-3xl transition-all group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
                      🍎
                    </div>
                    <div className="text-left">
                      <div className="font-black text-sm uppercase tracking-tight text-white">Apple Maps</div>
                      <div className="text-[10px] text-zinc-500 font-bold uppercase">Native Experience</div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                    →
                  </div>
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => setActiveMenuStore(null)}
              className="w-full py-6 mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-white hover:bg-white/5 transition-all border-t border-white/5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Locations;
