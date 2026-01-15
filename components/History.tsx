
import React from 'react';
import { AppState } from '../types';
import { format, subWeeks } from 'date-fns';
import { getWeekNumber } from '../utils';

interface HistoryProps {
  state: AppState;
  updateState: (updater: (prev: AppState) => AppState) => void;
}

const History: React.FC<HistoryProps> = ({ state }) => {
  const currentWeekNum = getWeekNumber(new Date());
  const pastWeeks = Array.from({ length: 10 }, (_, i) => currentWeekNum - 1 - i).filter(w => w > 0);

  return (
    <div className="p-4">
      <header className="mb-8">
        <h2 className="text-3xl font-black">Archive</h2>
        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Past Weekly Snapshots</p>
      </header>

      <div className="grid gap-4">
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
                <div className="text-xs font-bold text-green-500">PUBLISHED</div>
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
    </div>
  );
};

export default History;
