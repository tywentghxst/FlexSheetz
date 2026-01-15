
import React, { useState } from 'react';
import { AppState, ChangeLog, DayStatus } from '../types';
import { format } from 'date-fns';
import { getWeekNumber } from '../utils';
import { COLORS } from '../constants';

interface HistoryProps {
  state: AppState;
  updateState: (updater: (prev: AppState) => AppState) => void;
}

type HistoryTab = 'Weeks' | 'Changes';

// Constant for Work color to match Schedule component
const MUSTARD_YELLOW = '#E1AD01';

const History: React.FC<HistoryProps> = ({ state, updateState }) => {
  const [activeSubTab, setActiveSubTab] = useState<HistoryTab>('Weeks');
  const currentWeekNum = getWeekNumber(new Date());
  const pastWeeks = Array.from({ length: 10 }, (_, i) => currentWeekNum - 1 - i).filter(w => w > 0);

  const getStatusColor = (statusText: string) => {
    const text = statusText.toUpperCase();
    if (text.includes('PTO')) return COLORS.purple;
    if (text.includes('CALL OFF')) return COLORS.sheetzRed;
    if (text.includes('UNPAID')) return COLORS.orange;
    if (text.includes('TRAINING')) return COLORS.blue;
    if (text.includes('BEREAVEMENT')) return '#4338CA';
    if (text.includes('LEAVE OF ABSENCE')) return '#6B7280';
    if (text.includes('OFF')) return COLORS.gray;
    if (text.includes('ASSIGNED') || text.includes('STORE #') || text.includes('WORK')) return MUSTARD_YELLOW;
    if (text.includes('UNSCHEDULED')) return COLORS.emerald;
    return COLORS.sheetzRed; // Default fallback
  };

  const renderWeeks = () => (
    <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {pastWeeks.map(num => (
        <button 
          key={num}
          className="bg-zinc-900 border border-white/5 p-6 rounded-3xl flex items-center justify-between group hover:border-red-500/50 transition-all text-left"
        >
          <div>
            <h3 className="text-lg font-black group-hover:text-red-500 transition-colors">Week {num}</h3>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">Archived Snapshot</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] font-black text-zinc-500 uppercase">Status</div>
              <div className="text-xs font-bold text-emerald-500">PUBLISHED</div>
            </div>
            <span className="text-xl opacity-20 group-hover:opacity-100 transition-opacity">→</span>
          </div>
        </button>
      ))}
      {pastWeeks.length === 0 && (
        <div className="text-center py-20 opacity-20">
          <div className="text-5xl mb-4">📂</div>
          <p className="text-sm font-bold uppercase tracking-widest">NO HISTORY YET</p>
        </div>
      )}
    </div>
  );

  const renderChanges = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {state.logs && state.logs.length > 0 ? (
        state.logs.slice().reverse().map(log => {
          const accentColor = getStatusColor(log.newValue || log.field);
          
          return (
            <div key={log.id} className="bg-zinc-900 border border-white/5 p-5 rounded-3xl relative overflow-hidden group shadow-lg">
               <div className="absolute top-0 left-0 w-1.5 h-full opacity-80" style={{ backgroundColor: accentColor }} />
               <div className="flex justify-between items-start mb-3">
                  <div>
                     <span className="text-[10px] font-black uppercase tracking-widest block mb-1 opacity-60" style={{ color: accentColor }}>
                       {format(log.timestamp, 'MMM dd, yyyy • h:mm a')}
                     </span>
                     <h4 className="text-sm font-black text-white">{log.userName}</h4>
                  </div>
                  <div className="bg-white/5 px-2 py-1 rounded text-[8px] font-black uppercase text-zinc-500 border border-white/10">
                    {log.action}
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-black/40 p-3 rounded-2xl border border-white/5">
                     <div className="text-[8px] font-black text-zinc-500 uppercase mb-1">Was</div>
                     <div className="text-xs font-bold text-zinc-400 line-through truncate">{log.oldValue || 'None'}</div>
                  </div>
                  <div className="p-3 rounded-2xl border" style={{ backgroundColor: `${accentColor}15`, borderColor: `${accentColor}30` }}>
                     <div className="text-[8px] font-black uppercase mb-1" style={{ color: accentColor }}>Now</div>
                     <div className="text-xs font-bold text-white truncate">{log.newValue}</div>
                  </div>
               </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-20 opacity-20">
          <div className="text-5xl mb-4">📝</div>
          <p className="text-sm font-bold uppercase tracking-widest">NO RECENT CHANGES</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 pb-32 max-w-2xl mx-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-black italic tracking-tighter uppercase">Activity <span style={{ color: COLORS.sheetzRed }}>Hub</span></h2>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">District Archives & Change Tracking</p>
      </header>

      {/* Sub-Tabs */}
      <div className="flex bg-zinc-900 p-1.5 rounded-2xl border border-white/5 mb-8 shadow-inner">
        {[
          { id: 'Weeks', label: 'Previous Weeks' },
          { id: 'Changes', label: 'Changes' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as HistoryTab)}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
              activeSubTab === tab.id 
                ? 'bg-red-600 text-white shadow-lg' 
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <main>
        {activeSubTab === 'Weeks' && renderWeeks()}
        {activeSubTab === 'Changes' && renderChanges()}
      </main>
    </div>
  );
};

export default History;
