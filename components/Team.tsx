
import React, { useState, useMemo } from 'react';
import { AppState, ShiftType } from '../types';
import { COLORS } from '../constants';
import { formatTo12h } from '../utils';

interface TeamProps {
  state: AppState;
  subscribedIds: string[];
  toggleSubscription: (id: string) => void;
}

type SortOption = 'shift' | 'name' | 'store';
type ShiftFilter = 'ALL' | ShiftType;

const Team: React.FC<TeamProps> = ({ state, subscribedIds, toggleSubscription }) => {
  const [sortBy, setSortBy] = useState<SortOption>('shift');
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('ALL');
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  const filteredAndSortedEmployees = useMemo(() => {
    let filtered = [...state.employees];
    
    if (shiftFilter !== 'ALL') {
      filtered = filtered.filter(emp => emp.shift === shiftFilter);
    }

    return filtered.sort((a, b) => {
      if (sortBy === 'shift') {
        return a.shift.localeCompare(b.shift);
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'store') {
        const storeA = state.stores.find(s => s.id === a.homeStoreId)?.number || '';
        const storeB = state.stores.find(s => s.id === b.homeStoreId)?.number || '';
        return storeA.localeCompare(storeB, undefined, { numeric: true });
      }
      return 0;
    });
  }, [state.employees, state.stores, sortBy, shiftFilter]);

  const getShiftTheme = (shift: ShiftType) => {
    switch (shift) {
      case ShiftType.FIRST: return { color: 'emerald', hex: COLORS.emerald };
      case ShiftType.SECOND: return { color: 'blue', hex: COLORS.blue };
      case ShiftType.THIRD: return { color: 'purple', hex: COLORS.purple };
      default: return { color: 'zinc', hex: '#71717a' };
    }
  };

  return (
    <div className="p-4 pb-32 max-w-5xl mx-auto">
      <header className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic text-white leading-none">
              DISTRICT <span style={{ color: COLORS.sheetzRed }}>ROSTER</span>
            </h2>
            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-2 bg-white/5 inline-block px-2 py-0.5 rounded-full border border-white/5">
              District {state.district} • {filteredAndSortedEmployees.length} Supervisors
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification Control */}
            <button 
              onClick={() => setShowNotificationMenu(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                subscribedIds.length > 0 
                  ? 'bg-red-600/10 border-red-600/50 text-red-500 shadow-[0_0_15px_rgba(218,41,28,0.2)]' 
                  : 'bg-zinc-900 border-white/10 text-zinc-500 hover:text-white'
              }`}
            >
              <span className={subscribedIds.length > 0 ? 'animate-bounce' : ''}>🔔</span>
              ALERTS {subscribedIds.length > 0 && `(${subscribedIds.length})`}
            </button>

            {/* Sort Controls */}
            <div className="flex bg-zinc-900/80 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-2xl">
              {(['shift', 'name', 'store'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setSortBy(option)}
                  className={`px-3 md:px-5 py-2 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all ${
                    sortBy === option
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Shift Filter Bar */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
          {(['ALL', ShiftType.FIRST, ShiftType.SECOND, ShiftType.THIRD] as ShiftFilter[]).map(filter => {
            const isActive = shiftFilter === filter;
            
            return (
              <button
                key={filter}
                onClick={() => setShiftFilter(filter)}
                className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${
                  isActive 
                    ? `bg-zinc-800 border-white/20 text-white` 
                    : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-white/10'
                }`}
              >
                {filter === 'ALL' ? 'All' : filter.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {filteredAndSortedEmployees.length === 0 ? (
          <div className="col-span-full py-24 bg-zinc-900/20 rounded-[2rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center">
            <span className="text-6xl mb-4 opacity-20">👥</span>
            <h3 className="text-lg font-black text-white/40 uppercase tracking-widest">No Matches</h3>
            <p className="text-[10px] text-zinc-600 font-bold mt-1 uppercase tracking-widest italic">Check filters</p>
          </div>
        ) : (
          filteredAndSortedEmployees.map((emp) => {
            const homeStore = state.stores.find(s => s.id === emp.homeStoreId);
            const week1Rot = emp.rotation.week1;
            const theme = getShiftTheme(emp.shift);
            const isSubscribed = subscribedIds.includes(emp.id);
            
            return (
              <div key={emp.id} className="relative bg-zinc-950 border border-white/10 rounded-[2rem] p-5 md:p-6 overflow-hidden group hover:border-red-600/40 transition-all shadow-2xl">
                {/* Visual Accent Sidebar */}
                <div className="absolute top-0 left-0 w-1.5 h-full opacity-80" style={{ backgroundColor: theme.hex }} />

                <div className="relative z-10 pl-3">
                  <header className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-white/10 bg-black/40" style={{ color: theme.hex }}>
                          {emp.shift}
                        </span>
                        {isSubscribed && <span className="text-[7px] font-black uppercase text-red-500 flex items-center gap-1">🔔 Subscribed</span>}
                      </div>
                      <h3 className="text-xl md:text-2xl font-black italic tracking-tighter text-white uppercase group-hover:text-red-500 transition-colors truncate">
                        {emp.name}
                      </h3>
                    </div>
                    <div className="bg-black/60 px-3 py-2 rounded-xl border border-white/5 text-center shrink-0 min-w-[60px]">
                      <div className="text-[7px] font-black text-red-600 uppercase tracking-widest mb-0.5">Base</div>
                      <div className="text-lg font-black text-white italic leading-none">#{homeStore?.number || '---'}</div>
                    </div>
                  </header>

                  {/* Grouping Title for Times */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em] whitespace-nowrap">Routine Hours</span>
                    <div className="h-[1px] w-full bg-white/5" />
                  </div>

                  {/* Core Details Row */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-black/40 px-3 py-2.5 rounded-2xl border border-white/5">
                      <div className="text-[7px] font-black text-zinc-500 uppercase mb-0.5 tracking-widest">START TIME</div>
                      <div className="text-xs font-black text-white italic">
                        {formatTo12h(week1Rot[0]?.startTime) || '---'}
                      </div>
                    </div>
                    <div className="bg-black/40 px-3 py-2.5 rounded-2xl border border-white/5">
                      <div className="text-[7px] font-black text-zinc-500 uppercase mb-0.5 tracking-widest">END TIME</div>
                      <div className="text-xs font-black text-white italic">
                        {formatTo12h(week1Rot[0]?.endTime) || '---'}
                      </div>
                    </div>
                  </div>

                  {/* Drive Time Section */}
                  <div className="bg-white/[0.03] px-3 py-2.5 rounded-2xl border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Drive Time Stores</span>
                      <span className="text-[7px] font-bold text-zinc-400 uppercase bg-zinc-800 px-1.5 py-0.5 rounded border border-white/5">
                        {emp.driveTimeStores.length} Stores
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {emp.driveTimeStores.length > 0 ? (
                        emp.driveTimeStores.map(id => (
                          <div key={id} className="bg-zinc-900 px-2 py-1 rounded-lg border border-white/5 text-[9px] font-black text-white group-hover:border-red-600/20 transition-colors">
                            #{state.stores.find(s => s.id === id)?.number}
                          </div>
                        ))
                      ) : (
                        <div className="text-[8px] font-bold text-zinc-600 italic uppercase tracking-widest py-0.5">
                          No stores eligible
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Notification Menu Overlay */}
      {showNotificationMenu && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="w-full max-w-lg bg-zinc-900 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-20 duration-500 max-h-[85vh] flex flex-col">
              <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                <header className="flex justify-between items-center mb-8">
                   <div>
                     <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">Alert <span className="text-red-600">Setup</span></h2>
                     <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Get notified when schedules change</p>
                   </div>
                   <button onClick={() => setShowNotificationMenu(false)} className="text-zinc-500 hover:text-white font-black text-[10px] uppercase tracking-widest">Close</button>
                </header>

                <div className="space-y-3">
                  {state.employees.map(emp => {
                    const isSubscribed = subscribedIds.includes(emp.id);
                    return (
                      <button 
                        key={emp.id}
                        onClick={() => toggleSubscription(emp.id)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          isSubscribed 
                            ? 'bg-red-600/10 border-red-600/30 text-white' 
                            : 'bg-zinc-800/50 border-white/5 text-zinc-500'
                        }`}
                      >
                        <div className="flex flex-col items-start">
                           <span className="text-sm font-black uppercase tracking-tight">{emp.name}</span>
                           <span className="text-[8px] font-bold uppercase opacity-60">{emp.shift}</span>
                        </div>
                        <div className={`w-10 h-6 rounded-full relative transition-all ${isSubscribed ? 'bg-red-600' : 'bg-zinc-700'}`}>
                           <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isSubscribed ? 'left-5' : 'left-1'}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="p-6 border-t border-white/5 bg-zinc-950/50">
                <p className="text-[8px] text-center font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">
                  Notifications are stored locally in this browser.<br/>Ensure browser notification permissions are enabled.
                </p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Team;
