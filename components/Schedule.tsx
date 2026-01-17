
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppState, DayStatus, Employee, ScheduleEntry, ChangeLog } from '../types';
import { getWeekRange, getWeekNumber, formatDateId, calculateEndTime, applyDriveTime, formatTo12h, generateId } from '../utils';
import { COLORS, DAYS_OF_WEEK } from '../constants';
import { format, isSameDay } from 'date-fns';

interface ScheduleProps {
  state: AppState;
  updateState: (updater: (prev: AppState) => AppState) => void;
  isAuthenticated: boolean;
}

type ViewMode = 'week' | 'day';

const MUSTARD_YELLOW = '#E1AD01';

const Schedule: React.FC<ScheduleProps> = ({ state, updateState, isAuthenticated }) => {
  const [currentWeekNum, setCurrentWeekNum] = useState(() => getWeekNumber(new Date()));
  const weekRange = useMemo(() => getWeekRange(currentWeekNum), [currentWeekNum]);
  const [viewMode, setViewMode] = useState<ViewMode>(state.defaultViewMode || 'day');
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  
  const [statusFilter, setStatusFilter] = useState<DayStatus | 'ALL'>('ALL');
  const [editingCell, setEditingCell] = useState<{ empId: string, date: Date } | null>(null);

  const weekScrollRef = useRef<HTMLDivElement>(null);

  const snapToToday = () => {
    const today = new Date();
    const targetWeek = getWeekNumber(today);
    setCurrentWeekNum(targetWeek);
    setSelectedDay(today);
    scrollToActiveWeek(targetWeek);
  };

  const scrollToActiveWeek = (week: number) => {
    setTimeout(() => {
      const activeBtn = weekScrollRef.current?.querySelector(`[data-week="${week}"]`);
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 100);
  };

  useEffect(() => {
    scrollToActiveWeek(currentWeekNum);
  }, []);

  const weekParityLabel = (currentWeekNum % 2 === 0) ? '2' : '1';

  const logChange = (action: string, field: string, oldVal: string, newVal: string, empName: string): ChangeLog => ({
    id: generateId(),
    timestamp: Date.now(),
    userName: empName,
    action,
    field,
    oldValue: oldVal,
    newValue: newVal
  });

  const getDaySchedule = (emp: Employee, date: Date): ScheduleEntry => {
    const dateId = formatDateId(date);
    const key = `${emp.id}_${dateId}`;
    const override = state.schedule[key];

    if (override) return override;

    const weekParity = (currentWeekNum % 2 === 0) ? 'week2' : 'week1';
    const dayIdx = (date.getDay() + 2) % 7; 
    const rotation = emp.rotation[weekParity][dayIdx];

    return {
      employeeId: emp.id,
      date: dateId,
      storeId: emp.homeStoreId,
      status: rotation?.status || DayStatus.UNASSIGNED,
      startTime: rotation?.startTime || '',
      endTime: rotation?.endTime || '',
      isManualOverride: false
    };
  };

  const handleEditCell = (emp: Employee, date: Date) => {
    if (!isAuthenticated) return;
    setEditingCell({ empId: emp.id, date });
  };

  const updateShiftOverride = (empId: string, date: Date, patch: Partial<ScheduleEntry>) => {
    const dateId = formatDateId(date);
    const emp = state.employees.find(e => e.id === empId)!;
    const current = getDaySchedule(emp, date);
    const next = { ...current, ...patch, isManualOverride: true };
    
    updateState(prev => ({
      ...prev,
      schedule: { ...prev.schedule, [`${empId}_${dateId}`]: next },
      logs: [...(prev.logs || []), logChange('OVERRIDE', `Shift Update`, current.status, next.status, emp.name)].slice(-50)
    }));
  };

  const getStatusColor = (status: DayStatus) => {
    switch (status) {
      case DayStatus.WORK: return MUSTARD_YELLOW;
      case DayStatus.UNASSIGNED: return COLORS.emerald;
      case DayStatus.TRAINING: return COLORS.blue;
      case DayStatus.OFF: return '#27272a';
      case DayStatus.PTO: return COLORS.purple;
      case DayStatus.UNPAID: return COLORS.orange;
      case DayStatus.CALL_OFF: return COLORS.sheetzRed;
      case DayStatus.LEAVE_OF_ABSENCE: return '#6B7280';
      case DayStatus.BEREAVEMENT: return '#4338CA';
      default: return '#18181b';
    }
  };

  const filteredEmployees = useMemo(() => {
    let emps = [...state.employees].sort((a, b) => a.shift.localeCompare(b.shift));
    if (viewMode === 'day' && statusFilter !== 'ALL') {
      emps = emps.filter(emp => {
        const sched = getDaySchedule(emp, selectedDay);
        return sched.status === statusFilter;
      });
    }
    return emps;
  }, [state.employees, viewMode, statusFilter, selectedDay, currentWeekNum, state.schedule]);

  const renderFilterBar = () => (
    <div className="flex gap-2 overflow-x-auto pb-4 pt-1 no-scrollbar px-1">
      {(['ALL', ...Object.values(DayStatus)] as const).map(status => {
        const isActive = statusFilter === status;
        let displayLabel = status === 'ALL' ? 'ALL' : status;
        if (status === DayStatus.WORK) displayLabel = 'ASSIGNED';

        return (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-full text-[8px] font-black tracking-widest whitespace-nowrap transition-all border shrink-0 ${
              isActive 
                ? 'bg-white border-white text-black' 
                : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {displayLabel}
          </button>
        );
      })}
    </div>
  );

  const renderDayView = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-zinc-950/40 p-1.5 rounded-[2rem] flex items-center justify-between gap-1 shadow-inner border border-white/5">
        {weekRange.map((date, i) => {
          const isSelected = isSameDay(date, selectedDay);
          return (
            <button
              key={i}
              onClick={() => setSelectedDay(date)}
              className={`flex-1 py-3 px-1 rounded-[1.4rem] flex flex-col items-center justify-center transition-all min-w-0 ${
                isSelected 
                  ? 'bg-red-600 text-white shadow-lg scale-105' 
                  : 'bg-transparent text-zinc-600'
              }`}
            >
              <span className={`text-[7px] font-black uppercase tracking-tighter mb-0.5 ${isSelected ? 'opacity-90' : 'opacity-40'}`}>
                {DAYS_OF_WEEK[i]}
              </span>
              <span className="text-sm font-black italic tracking-tighter leading-none">{format(date, 'd')}</span>
            </button>
          );
        })}
      </div>

      {renderFilterBar()}

      <div className="grid gap-3">
        {filteredEmployees.map(emp => {
          const sched = getDaySchedule(emp, selectedDay);
          const isDT = emp.driveTimeStores.includes(sched.storeId);
          const storeNum = state.stores.find(s => s.id === sched.storeId)?.number || '---';
          const bgColor = getStatusColor(sched.status);
          const displayEndTime = isDT ? applyDriveTime(sched.endTime) : sched.endTime;

          const useDarkText = sched.status === DayStatus.WORK || sched.status === DayStatus.UNASSIGNED || sched.status === DayStatus.UNPAID || sched.status === DayStatus.TRAINING;
          const textColorClass = useDarkText ? 'text-zinc-950' : 'text-white';
          const subTextColorClass = useDarkText ? 'text-zinc-900/60' : 'text-white/60';

          return (
            <div 
              key={emp.id}
              onClick={() => handleEditCell(emp, selectedDay)}
              className={`p-5 rounded-[2.2rem] flex items-center justify-between transition-all relative overflow-hidden shadow-xl border border-white/5 ${isAuthenticated ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default'}`}
              style={{ backgroundColor: bgColor }}
            >
              <div className="relative z-10 pl-1">
                 <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${useDarkText ? 'bg-black/10 text-black' : 'bg-white/10 text-white'}`}>
                      {emp.shift}
                    </span>
                 </div>
                 <h4 className={`text-xl font-black italic tracking-tighter ${textColorClass}`}>
                  {emp.name}
                 </h4>
                 {(sched.status === DayStatus.WORK || sched.status === DayStatus.UNASSIGNED || sched.status === DayStatus.TRAINING) && sched.startTime && (
                   <div className={`mt-1 text-[9px] font-black uppercase tracking-widest ${subTextColorClass}`}>
                     {formatTo12h(sched.startTime)} - {formatTo12h(displayEndTime)}
                   </div>
                 )}
              </div>
              <div className="text-right relative z-10">
                 <div className="flex items-center justify-end gap-1.5 mb-1">
                    {isDT && (sched.status === DayStatus.WORK || sched.status === DayStatus.UNASSIGNED) && (
                      <span className={`text-[6px] px-1 py-0.5 rounded font-black uppercase tracking-tighter border ${useDarkText ? 'bg-black/5 border-black/10 text-black' : 'bg-white/10 border-white/10 text-white'}`}>
                        {state.driveTimeLabel}
                      </span>
                    )}
                 </div>
                 {sched.status === DayStatus.WORK || sched.status === DayStatus.UNASSIGNED ? (
                   <div>
                      <div className={`text-3xl font-black italic tracking-tighter leading-none mb-0.5 ${textColorClass}`}>
                        {sched.status === DayStatus.WORK ? `#${storeNum}` : 'TBD'}
                      </div>
                   </div>
                 ) : (
                   <div className={`text-xl font-black italic tracking-tighter uppercase ${textColorClass}`}>
                      {sched.status}
                   </div>
                 )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderWeekView = () => (
    <div className="overflow-x-auto rounded-[2.5rem] border border-white/5 shadow-2xl animate-in fade-in duration-500 bg-zinc-950/30">
      <table className="w-full border-collapse min-w-[1000px]">
        <thead>
          <tr className="bg-zinc-900/50">
            <th className="p-4 text-left border-r border-white/5 text-[9px] uppercase tracking-widest text-zinc-500 font-black">SUPERVISOR</th>
            {weekRange.map((date, i) => (
              <th key={i} className={`p-3 text-center border-r border-white/5 ${isSameDay(date, new Date()) ? 'bg-red-900/10' : ''}`}>
                <div className="text-[7px] font-black text-zinc-600 mb-1">{DAYS_OF_WEEK[i]}</div>
                <div className={`text-sm font-black italic ${isSameDay(date, new Date()) ? 'text-red-500' : 'text-white'}`}>{format(date, 'd')}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {state.employees.map(emp => (
            <tr key={emp.id}>
              <td className="p-4 border-r border-white/5 bg-zinc-950/20">
                <div className="font-black text-sm italic tracking-tighter uppercase text-white leading-none">{emp.name}</div>
                <div className="text-[7px] font-black text-zinc-500 uppercase tracking-widest mt-1.5">{emp.shift}</div>
              </td>
              {weekRange.map((date, i) => {
                const sched = getDaySchedule(emp, date);
                const bgColor = getStatusColor(sched.status);
                const isDT = (sched.status === DayStatus.WORK || sched.status === DayStatus.UNASSIGNED) && emp.driveTimeStores.includes(sched.storeId);
                const displayEndTime = isDT ? applyDriveTime(sched.endTime) : sched.endTime;
                
                const isWorking = [DayStatus.WORK, DayStatus.UNASSIGNED, DayStatus.TRAINING].includes(sched.status);
                const useDarkText = sched.status === DayStatus.WORK || sched.status === DayStatus.UNASSIGNED || sched.status === DayStatus.UNPAID || sched.status === DayStatus.TRAINING;
                const storeNum = state.stores.find(s => s.id === sched.storeId)?.number || '---';

                return (
                  <td key={i} className="p-1" onClick={() => handleEditCell(emp, date)}>
                    <div 
                      className={`h-24 rounded-xl flex flex-col items-center justify-center border transition-all relative ${isAuthenticated ? 'cursor-pointer active:scale-95' : 'cursor-default'}`} 
                      style={{ 
                        backgroundColor: bgColor,
                        borderColor: `${bgColor}60`
                      }}
                    >
                      {/* Store Number / Status Code */}
                      <div className={`text-lg font-black italic tracking-tighter ${useDarkText ? 'text-black' : 'text-white'}`}>
                        {sched.status === DayStatus.WORK ? `#${storeNum}` : (sched.status === DayStatus.UNASSIGNED ? 'TBD' : sched.status.split(' ')[0])}
                      </div>
                      
                      {/* Times */}
                      {isWorking && sched.startTime && (
                        <div className={`text-[8px] font-black uppercase tracking-tighter mt-1 ${useDarkText ? 'text-black/60' : 'text-white/60'}`}>
                          {formatTo12h(sched.startTime)}
                          <br/>
                          {formatTo12h(displayEndTime)}
                        </div>
                      )}

                      {/* Drive Time Badge */}
                      {isDT && (
                        <div className="absolute top-1 right-1">
                          <span className={`text-[6px] font-black px-1 rounded border ${useDarkText ? 'bg-black/10 border-black/10 text-black' : 'bg-white/10 border-white/10 text-white'}`}>
                            {state.driveTimeLabel}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const currentEmp = editingCell ? state.employees.find(e => e.id === editingCell.empId) : null;
  const currentSched = editingCell && currentEmp ? getDaySchedule(currentEmp, editingCell.date) : null;
  const isWorkingStatus = currentSched ? [DayStatus.WORK, DayStatus.UNASSIGNED, DayStatus.TRAINING, DayStatus.OFF].includes(currentSched.status) : false;
  // Based on request: hours enabled for everything BUT: unpaid, PTO, call off, bereavement, leave of absence
  const isHoursEnabled = currentSched ? ![DayStatus.UNPAID, DayStatus.PTO, DayStatus.CALL_OFF, DayStatus.BEREAVEMENT, DayStatus.LEAVE_OF_ABSENCE].includes(currentSched.status) : false;

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto pb-32">
      <div className="bg-zinc-950 p-6 rounded-[2.5rem] border border-white/5 flex items-center justify-between shadow-2xl relative">
        <div className="flex flex-col">
          <span className="text-[8px] font-black text-red-600 uppercase tracking-[0.2em] mb-1 leading-none">ACTIVE RANGE</span>
          <div className="flex items-baseline gap-1.5">
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none italic">
              {format(weekRange[0], 'MMM d').toUpperCase()}
            </h2>
            <span className="text-zinc-700 text-xl font-black">—</span>
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none italic">
              {format(weekRange[6], 'd')}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-zinc-900 px-3 py-2 rounded-2xl border border-white/5 flex flex-col items-center justify-center min-w-[55px]">
            <span className="text-[6px] font-black text-red-600 uppercase tracking-widest leading-none mb-0.5">WEEK</span>
            <span className="text-lg font-black text-white italic leading-none">{weekParityLabel}</span>
          </div>

          <div className="flex bg-zinc-900 p-1 rounded-2xl border border-white/10">
            <button 
              onClick={() => setViewMode('day')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'day' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            </button>
            <button 
              onClick={() => setViewMode('week')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'week' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md pt-2 pb-3 -mx-4 px-4 flex gap-2 items-center overflow-hidden">
        <button 
          onClick={snapToToday} 
          className="shrink-0 bg-red-600 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-lg active:scale-95"
        >
          TODAY
        </button>
        <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth" ref={weekScrollRef}>
          {Array.from({ length: 52 }, (_, i) => i + 1).map(num => {
            const isCurrent = currentWeekNum === num;
            const isTodayWeek = getWeekNumber(new Date()) === num;
            return (
              <button 
                key={num} 
                data-week={num} 
                onClick={() => setCurrentWeekNum(num)} 
                className={`px-5 py-2.5 rounded-xl text-[9px] font-black tracking-widest transition-all shrink-0 border ${
                  isCurrent 
                    ? 'bg-white border-white text-black scale-105' 
                    : isTodayWeek 
                      ? 'bg-red-600/10 border-red-600/30 text-red-500' 
                      : 'bg-zinc-900/30 border-white/5 text-zinc-600'
                }`}
              >
                W{num}
              </button>
            );
          })}
        </div>
      </div>

      {viewMode === 'day' ? renderDayView() : renderWeekView()}

      {editingCell && currentSched && currentEmp && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-end sm:items-center justify-center backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-zinc-900 w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] p-10 border-t border-white/10 shadow-4xl animate-in slide-in-from-bottom-20 duration-500 overflow-y-auto max-h-[90vh] pb-32 no-scrollbar">
            <header className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-3xl font-black italic tracking-tighter text-white uppercase mb-1">Shift <span className="text-red-600">Edit</span></h3>
                <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">{currentEmp.name}</p>
              </div>
              <button onClick={() => setEditingCell(null)} className="text-zinc-500 hover:text-white transition-colors p-2">✕</button>
            </header>
            
            <div className="space-y-8">
              {/* Status Selector */}
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Status</label>
                <div className="grid grid-cols-2 gap-2">
                   {Object.values(DayStatus).map(s => {
                     const isSelected = currentSched.status === s;
                     return (
                       <button 
                        key={s}
                        onClick={() => updateShiftOverride(currentEmp.id, editingCell.date, { status: s })}
                        className={`py-3.5 rounded-2xl text-[9px] font-black uppercase border transition-all ${isSelected ? 'bg-red-600 border-red-500 text-white' : 'bg-zinc-800/50 border-white/5 text-zinc-500'}`}
                       >
                         {s === DayStatus.WORK ? 'ASSIGNED' : s}
                       </button>
                     );
                   })}
                </div>
              </div>

              {/* Conditional Fields: Store & Times */}
              {isHoursEnabled && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                  {/* Store Assignment - only if Assigned or Unassigned or Training */}
                  {[DayStatus.WORK, DayStatus.UNASSIGNED, DayStatus.TRAINING].includes(currentSched.status) && (
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Store Assignment</label>
                      <select 
                        className="w-full bg-zinc-800 border-white/5 rounded-2xl p-4 text-sm font-black text-white focus:ring-2 focus:ring-red-600 outline-none"
                        value={currentSched.storeId}
                        onChange={(e) => updateShiftOverride(currentEmp.id, editingCell.date, { 
                          storeId: e.target.value,
                          status: DayStatus.WORK // Automatically switch to Work if a store is picked
                        })}
                      >
                        <option value="">(TBD / Unassigned)</option>
                        {state.stores.map(s => (
                          <option key={s.id} value={s.id}>Store #{s.number} - {s.address}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Time Inputs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Start Time</label>
                      <input 
                        type="time"
                        className="w-full bg-zinc-800 border-white/5 rounded-2xl p-4 text-sm font-black text-white focus:ring-2 focus:ring-red-600 outline-none"
                        value={currentSched.startTime}
                        onChange={(e) => {
                          const start = e.target.value;
                          const end = calculateEndTime(start);
                          updateShiftOverride(currentEmp.id, editingCell.date, { startTime: start, endTime: end });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">End Time</label>
                      <input 
                        type="time"
                        className="w-full bg-zinc-800 border-white/5 rounded-2xl p-4 text-sm font-black text-white focus:ring-2 focus:ring-red-600 outline-none"
                        value={currentSched.endTime}
                        onChange={(e) => updateShiftOverride(currentEmp.id, editingCell.date, { endTime: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-white/5">
                <button onClick={() => {
                    const dateId = formatDateId(editingCell.date);
                    updateState(prev => {
                      const next = { ...prev.schedule };
                      delete next[`${currentEmp.id}_${dateId}`];
                      return { ...prev, schedule: next, logs: [...(prev.logs || []), logChange('REVERT', `Rotation`, 'Custom', 'Default', currentEmp.name)].slice(-50) };
                    });
                    setEditingCell(null);
                  }} className="flex-1 bg-zinc-800 text-white font-black py-5 rounded-2xl text-[10px] uppercase">Reset to Rotation</button>
                <button onClick={() => setEditingCell(null)} className="flex-[2] bg-red-600 text-white font-black py-5 rounded-2xl text-[10px] uppercase shadow-xl">Save & Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
