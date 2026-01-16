
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
  const dayScrollRef = useRef<HTMLDivElement>(null);

  const snapToToday = () => {
    const today = new Date();
    const targetWeek = getWeekNumber(today);
    setCurrentWeekNum(targetWeek);
    setSelectedDay(today);

    setTimeout(() => {
      const activeBtn = weekScrollRef.current?.querySelector(`[data-week="${targetWeek}"]`);
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
      if (viewMode === 'day') {
        const activeDayBtn = dayScrollRef.current?.querySelector(`[data-today="true"]`);
        if (activeDayBtn) {
          activeDayBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }, 50);
  };

  useEffect(() => {
    const activeBtn = weekScrollRef.current?.querySelector(`[data-week="${currentWeekNum}"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
    }
  }, []);

  const weekParityLabel = (currentWeekNum % 2 === 0) ? 'Week 2' : 'Week 1';

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
      status: rotation?.status || DayStatus.UNSCHEDULED,
      startTime: rotation?.startTime || '',
      endTime: rotation?.endTime || '',
      isManualOverride: false
    };
  };

  const handleEditCell = (emp: Employee, date: Date) => {
    if (!isAuthenticated) return;
    setEditingCell({ empId: emp.id, date });
  };

  const getStatusColor = (status: DayStatus) => {
    switch (status) {
      case DayStatus.WORK: return MUSTARD_YELLOW;
      case DayStatus.TRAINING: return COLORS.blue;
      case DayStatus.OFF: return '#27272a';
      case DayStatus.PTO: return COLORS.purple;
      case DayStatus.UNPAID: return COLORS.orange;
      case DayStatus.CALL_OFF: return COLORS.sheetzRed;
      case DayStatus.UNSCHEDULED: return COLORS.emerald;
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
    <div className="flex gap-2 overflow-x-auto pb-4 pt-2 no-scrollbar px-1">
      {(['ALL', ...Object.values(DayStatus)] as const).map(status => {
        const isActive = statusFilter === status;
        const color = getStatusColor(status as DayStatus);
        
        let displayLabel = status === 'ALL' ? 'ALL STAFF' : status;
        if (status === DayStatus.WORK) displayLabel = 'ASSIGNED';

        return (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-2xl text-[8px] font-black tracking-[0.15em] whitespace-nowrap transition-all border shrink-0 ${
              isActive 
                ? 'bg-white border-white text-black shadow-lg scale-105' 
                : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              {displayLabel}
            </div>
          </button>
        );
      })}
    </div>
  );

  const renderDayView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div 
        ref={dayScrollRef}
        className="flex bg-zinc-950/50 p-3 rounded-[2rem] border border-white/5 overflow-x-auto gap-3 scroll-smooth no-scrollbar"
      >
        {weekRange.map((date, i) => {
          const isToday = isSameDay(date, new Date());
          const isSelected = isSameDay(date, selectedDay);
          return (
            <button
              key={i}
              data-today={isToday}
              onClick={() => setSelectedDay(date)}
              className={`flex-1 min-w-[70px] py-4 rounded-[1.5rem] flex flex-col items-center transition-all ${
                isSelected 
                  ? 'bg-red-600 text-white shadow-xl scale-105 border border-red-400' 
                  : 'bg-zinc-900/40 text-zinc-500 border border-transparent'
              }`}
            >
              <span className={`text-[8px] font-black uppercase tracking-widest mb-1 ${isSelected ? 'text-red-100' : 'text-zinc-600'}`}>
                {DAYS_OF_WEEK[i]}
              </span>
              <span className="text-xl font-black italic tracking-tighter">{format(date, 'd')}</span>
              {isToday && !isSelected && <div className="w-1 h-1 rounded-full bg-red-600 mt-1" />}
            </button>
          );
        })}
      </div>

      {renderFilterBar()}

      <div className="grid gap-4">
        {filteredEmployees.length > 0 ? (
          filteredEmployees.map(emp => {
            const sched = getDaySchedule(emp, selectedDay);
            const isDT = emp.driveTimeStores.includes(sched.storeId);
            const storeNum = state.stores.find(s => s.id === sched.storeId)?.number || '---';
            const homeStoreNum = state.stores.find(s => s.id === emp.homeStoreId)?.number || '---';
            const bgColor = getStatusColor(sched.status);
            const displayEndTime = isDT ? applyDriveTime(sched.endTime) : sched.endTime;

            const isOOO = [DayStatus.OFF, DayStatus.PTO, DayStatus.CALL_OFF, DayStatus.UNPAID, DayStatus.LEAVE_OF_ABSENCE, DayStatus.BEREAVEMENT].includes(sched.status);
            const isUnscheduled = sched.status === DayStatus.UNSCHEDULED;

            const useDarkText = sched.status === DayStatus.WORK || isUnscheduled || sched.status === DayStatus.UNPAID || sched.status === DayStatus.TRAINING;
            const textColorClass = useDarkText ? 'text-zinc-950' : 'text-white';
            const subTextColorClass = useDarkText ? 'text-zinc-900/70' : 'text-white/60';

            return (
              <div 
                key={emp.id}
                onClick={() => handleEditCell(emp, selectedDay)}
                className={`p-6 rounded-[2.5rem] flex items-center justify-between group active:scale-[0.98] transition-all relative overflow-hidden shadow-2xl border border-white/5 ${isAuthenticated ? 'cursor-pointer hover:border-white/20' : 'cursor-default'}`}
                style={{ backgroundColor: bgColor }}
              >
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-gradient-to-br from-white to-transparent pointer-events-none" />
                <div className="flex-1 pl-2 relative z-10">
                   <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${useDarkText ? 'bg-black/10 text-black' : 'bg-white/10 text-white'}`}>
                        {emp.shift}
                      </span>
                      {sched.isManualOverride && <span className={`w-2 h-2 rounded-full ${useDarkText ? 'bg-black/30' : 'bg-white/40'} animate-pulse`} />}
                   </div>
                   <h4 className={`text-2xl font-black italic tracking-tighter transition-colors ${textColorClass}`}>
                    {emp.name}
                   </h4>
                   <p className={`text-[9px] font-bold uppercase mt-1 tracking-widest ${subTextColorClass}`}>
                    Base: Store #{homeStoreNum}
                   </p>
                </div>
                <div className="text-right relative z-10">
                   <div className="flex items-center justify-end gap-2 mb-2">
                      {isDT && !isOOO && (
                        <span className={`text-[7px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border ${useDarkText ? 'bg-black/10 border-black/10 text-black' : 'bg-white/20 border-white/10 text-white'}`}>
                          {state.driveTimeLabel}
                        </span>
                      )}
                      <span className={`text-[9px] font-black uppercase tracking-widest ${subTextColorClass}`}>
                        {sched.status === DayStatus.WORK ? 'ASSIGNED' : sched.status}
                      </span>
                   </div>
                   {sched.status === DayStatus.WORK || isUnscheduled ? (
                     <div>
                        <div className={`text-4xl font-black italic tracking-tighter leading-none mb-1 ${textColorClass}`}>
                          {isUnscheduled ? 'PENDING' : `#${storeNum}`}
                        </div>
                        {!isUnscheduled && (
                          <div className={`text-[10px] font-black uppercase tracking-tighter ${subTextColorClass}`}>
                            {formatTo12h(sched.startTime)} <span className="opacity-40">—</span> {formatTo12h(displayEndTime)}
                          </div>
                        )}
                     </div>
                   ) : (
                     <div className={`text-2xl font-black italic tracking-tighter uppercase ${textColorClass}`}>
                        {sched.status}
                     </div>
                   )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-24 flex flex-col items-center justify-center text-center opacity-10">
            <span className="text-7xl mb-4">🔍</span>
            <p className="text-sm font-black uppercase tracking-[0.3em]">No Personnel Matching Filters</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderWeekView = () => (
    <div className="overflow-x-auto rounded-[2rem] border border-white/10 shadow-3xl relative animate-in fade-in slide-in-from-left-6 duration-500 bg-zinc-950/30">
      <table className="w-full border-collapse min-w-[950px]">
        <thead>
          <tr className="bg-zinc-900/80 backdrop-blur-md">
            <th className="sticky-column bg-zinc-900 p-6 text-left border-r border-white/10 w-64 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-black shadow-[5px_0_15px_rgba(0,0,0,0.5)]">
              SUPERVISOR <span className="text-red-600">DISTRICT {state.district}</span>
            </th>
            {weekRange.map((date, i) => (
              <th key={i} className={`p-4 text-center border-r border-white/5 min-w-[120px] ${isSameDay(date, new Date()) ? 'bg-red-900/20' : ''}`}>
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">{DAYS_OF_WEEK[i]}</div>
                <div className={`text-xl font-black italic tracking-tighter ${isSameDay(date, new Date()) ? 'text-red-500 scale-110' : 'text-white'}`}>{format(date, 'd')}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y-[12px] divide-black/80">
          {state.employees.length === 0 ? (
            <tr><td colSpan={8} className="p-32 text-center opacity-20"><span className="text-6xl block mb-6">📂</span><p className="text-sm font-black uppercase tracking-widest">Roster Empty</p></td></tr>
          ) : (
            state.employees.sort((a, b) => a.shift.localeCompare(b.shift)).map(emp => (
              <tr key={emp.id} className="hover:bg-white/[0.02] transition-colors even:bg-white/[0.02] group">
                <td className="sticky-column bg-zinc-950 p-6 border-r border-white/10 text-white shadow-[8px_0_20px_rgba(0,0,0,0.7)]">
                  <div className="font-black text-lg italic tracking-tighter uppercase group-hover:text-red-500 transition-colors leading-none">{emp.name}</div>
                  <div className="flex items-center gap-2 mt-3">
                     <span className="text-[8px] font-black px-2 py-0.5 rounded-md bg-white/5 text-zinc-500 uppercase tracking-widest border border-white/5">{emp.shift}</span>
                     <span className="text-[8px] font-black text-red-600 bg-red-600/10 px-2 py-0.5 rounded-md uppercase tracking-widest">#{state.stores.find(s => s.id === emp.homeStoreId)?.number}</span>
                  </div>
                </td>
                {weekRange.map((date, i) => {
                  const sched = getDaySchedule(emp, date);
                  const isDT = emp.driveTimeStores.includes(sched.storeId);
                  const storeNum = state.stores.find(s => s.id === sched.storeId)?.number || '---';
                  const bgColor = getStatusColor(sched.status);
                  const isOOO = [DayStatus.OFF, DayStatus.PTO, DayStatus.CALL_OFF, DayStatus.UNPAID, DayStatus.LEAVE_OF_ABSENCE, DayStatus.BEREAVEMENT].includes(sched.status);
                  const isUnscheduled = sched.status === DayStatus.UNSCHEDULED;
                  const displayEndTime = isDT ? applyDriveTime(sched.endTime) : sched.endTime;
                  const mainTextColor = isOOO ? 'text-zinc-400' : 'text-zinc-950';
                  const subTextColor = isOOO ? 'text-zinc-500' : 'text-zinc-900';
                  return (
                    <td key={i} className="p-2" onClick={() => handleEditCell(emp, date)}>
                      <div 
                        className={`h-28 rounded-2xl p-4 flex flex-col justify-between border relative shadow-lg group active:scale-95 transition-all overflow-hidden ${isAuthenticated ? 'cursor-pointer hover:border-white/40' : 'cursor-default border-transparent'}`} 
                        style={{ 
                          backgroundColor: `${bgColor}${isOOO ? '15' : 'FF'}`, 
                          borderColor: (sched.status === DayStatus.WORK || isUnscheduled) ? `${MUSTARD_YELLOW}50` : 'transparent'
                        }}
                      >
                        {!isOOO && !isUnscheduled && (
                          <div className="absolute -right-2 -bottom-4 opacity-[0.08] text-7xl font-black italic text-black pointer-events-none">{storeNum}</div>
                        )}
                        <div className="flex justify-between items-start relative z-10">
                          <span className={`uppercase font-black text-[8px] tracking-[0.1em] ${isOOO ? 'text-zinc-500' : 'text-zinc-900/60'}`}>
                            {isUnscheduled ? 'UNSCHEDULED' : (sched.status === DayStatus.WORK ? 'ASSIGNED' : sched.status)}
                          </span>
                          {isDT && !isOOO && (
                            <span className="text-[7px] bg-zinc-950 text-amber-500 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter border border-amber-500/20">
                              {state.driveTimeLabel}
                            </span>
                          )}
                        </div>
                        <div className="relative z-10">
                          {isOOO ? (
                            <div className="text-[11px] font-black uppercase italic text-zinc-500 tracking-tight">
                              {sched.status}
                            </div>
                          ) : (
                            <>
                              <div className={`text-3xl leading-none font-black italic tracking-tighter mb-1 ${mainTextColor}`} style={{ color: isUnscheduled ? '#065f46' : '' }}>
                                {isUnscheduled ? 'PEND' : `#${storeNum}`}
                              </div>
                              <div className={`text-[10px] font-black whitespace-nowrap uppercase tracking-tighter ${subTextColor}`}>
                                {formatTo12h(sched.startTime)} <span className="opacity-40">-</span> {formatTo12h(displayEndTime)}
                              </div>
                            </>
                          )}
                        </div>
                        {sched.isManualOverride && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 border-2 border-zinc-950 shadow-xl" />}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const currentEditorSchedule = editingCell ? getDaySchedule(state.employees.find(e => e.id === editingCell.empId)!, editingCell.date) : null;
  const isOOOStatus = currentEditorSchedule ? [DayStatus.PTO, DayStatus.CALL_OFF, DayStatus.UNPAID, DayStatus.BEREAVEMENT, DayStatus.LEAVE_OF_ABSENCE, DayStatus.OFF].includes(currentEditorSchedule.status) : false;

  return (
    <div className="p-4 space-y-6 max-w-[1600px] mx-auto pb-32">
      <div className="flex items-center gap-3 overflow-x-auto pb-6 pt-2 no-scrollbar px-1" ref={weekScrollRef}>
        <button 
          onClick={snapToToday} 
          className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black tracking-widest border border-red-400/30 active:scale-95 transition-all shadow-xl shadow-red-900/20 shrink-0"
        >
          GO TO TODAY
        </button>
        <div className="h-6 w-[1px] bg-white/10 shrink-0 mx-2" />
        {Array.from({ length: 52 }, (_, i) => i + 1).map(num => (
          <button 
            key={num} 
            data-week={num}
            onClick={() => setCurrentWeekNum(num)} 
            className={`px-5 py-3 rounded-2xl text-[10px] font-black tracking-tight transition-all shrink-0 border ${currentWeekNum === num ? 'bg-white border-white text-black shadow-2xl scale-110 z-10' : 'bg-zinc-900/50 text-zinc-500 border-white/5 hover:bg-zinc-800'}`}
          >
            WEEK {num}
          </button>
        ))}
      </div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-8 border-y border-white/5 px-4 bg-zinc-950/20 rounded-[3rem] relative">
         <div className="flex items-center gap-6">
           <div className="flex flex-col">
             <span className="text-[9px] font-black text-red-600 uppercase tracking-[0.4em] mb-2 leading-none">ACTIVE RANGE</span>
             <div className="flex items-center gap-4">
               <h2 className="text-4xl italic font-black text-white tracking-tighter uppercase leading-none">
                {format(weekRange[0], 'MMMM dd')} <span className="text-zinc-800">—</span> {format(weekRange[6], 'dd')}
               </h2>
               <div className="bg-zinc-900 px-4 py-2 rounded-2xl border border-white/10 shadow-lg">
                 <span className="text-[10px] font-black uppercase text-red-600 tracking-widest">{weekParityLabel}</span>
               </div>
               <div className="h-8 w-[1px] bg-white/10 mx-2 hidden md:block" />
               <div className="flex bg-zinc-950 p-1 rounded-xl border border-white/10 shadow-inner">
                 <button 
                   onClick={() => setViewMode('day')}
                   className={`p-2 rounded-lg transition-all ${viewMode === 'day' ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600'}`}
                   title="List View"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                   </svg>
                 </button>
                 <button 
                   onClick={() => setViewMode('week')}
                   className={`p-2 rounded-lg transition-all ${viewMode === 'week' ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600'}`}
                   title="Grid View"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                   </svg>
                 </button>
               </div>
             </div>
           </div>
         </div>
      </div>
      {viewMode === 'day' ? renderDayView() : renderWeekView()}
      {editingCell && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-zinc-900 w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] p-10 border-t sm:border border-white/10 shadow-4xl animate-in slide-in-from-bottom-20 duration-500 max-h-[95vh] overflow-y-auto pb-48 no-scrollbar">
            <header className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-3xl font-black italic tracking-tighter text-white uppercase mb-2">Shift <span className="text-red-600">Override</span></h3>
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em]">{state.employees.find(e => e.id === editingCell.empId)?.name} • {format(editingCell.date, 'EEEE, MMM dd')}</p>
              </div>
              <button onClick={() => setEditingCell(null)} className="text-zinc-500 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </header>
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Roster Status</label>
                <div className="grid grid-cols-2 gap-2">
                   {Object.values(DayStatus).map(s => {
                     const isSelected = getDaySchedule(state.employees.find(e => e.id === editingCell.empId)!, editingCell.date).status === s;
                     return (
                       <button 
                        key={s}
                        onClick={() => {
                          const status = s;
                          const dateId = formatDateId(editingCell.date);
                          const emp = state.employees.find(e => e.id === editingCell.empId)!;
                          const current = getDaySchedule(emp, editingCell.date);
                          let storeId = current.storeId;
                          if (status === DayStatus.UNSCHEDULED) storeId = emp.homeStoreId;
                          updateState(prev => ({ 
                            ...prev, 
                            schedule: { 
                              ...prev.schedule, 
                              [`${editingCell.empId}_${dateId}`]: { ...current, status, storeId, isManualOverride: true } 
                            }, 
                            logs: [...(prev.logs || []), logChange('OVERRIDE', `Status Change`, current.status, status, emp.name)].slice(-100) 
                          }));
                        }}
                        className={`py-4 rounded-2xl text-[9px] font-black uppercase tracking-tight border transition-all ${isSelected ? 'bg-red-600 border-red-500 text-white shadow-xl' : 'bg-zinc-800/50 border-white/5 text-zinc-500'}`}
                       >
                         {s}
                       </button>
                     );
                   })}
                </div>
              </div>
              {!isOOOStatus && (
                <div className="animate-in slide-in-from-top-4 duration-300 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Store Assignment</label>
                      <select className="w-full bg-zinc-800 border-2 border-transparent rounded-[1.5rem] p-5 text-sm focus:border-red-600 outline-none text-white font-black transition-all" value={getDaySchedule(state.employees.find(e => e.id === editingCell.empId)!, editingCell.date).storeId} onChange={(e) => {
                          const storeId = e.target.value;
                          const dateId = formatDateId(editingCell.date);
                          const emp = state.employees.find(e => e.id === editingCell.empId)!;
                          const current = getDaySchedule(emp, editingCell.date);
                          let newStatus = current.status === DayStatus.UNSCHEDULED ? DayStatus.WORK : current.status;
                          const oldStoreNum = state.stores.find(s => s.id === current.storeId)?.number || '??';
                          const newStoreNum = state.stores.find(s => s.id === storeId)?.number || '??';
                          updateState(prev => ({ 
                            ...prev, 
                            schedule: { ...prev.schedule, [`${editingCell.empId}_${dateId}`]: { ...current, storeId, status: newStatus, isManualOverride: true } }, 
                            logs: [...(prev.logs || []), logChange('OVERRIDE', `Store`, `#${oldStoreNum}`, `#${newStoreNum}`, emp.name)].slice(-100) 
                          }));
                        }}>
                        {state.stores.map(s => <option key={s.id} value={s.id}>STORE #{s.number} {state.employees.find(e => e.id === editingCell.empId)?.driveTimeStores.includes(s.id) ? `(${state.driveTimeLabel})` : ''}</option>)}
                      </select>
                    </div>
                    <div className="space-y-4">
                       <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Start Time</label>
                       <input type="time" className="w-full bg-zinc-800 border-2 border-transparent rounded-[1.5rem] p-5 text-sm focus:border-red-600 outline-none text-white font-black transition-all" value={getDaySchedule(state.employees.find(e => e.id === editingCell.empId)!, editingCell.date).startTime} onChange={(e) => {
                          const startTime = e.target.value;
                          const endTime = calculateEndTime(startTime);
                          const dateId = formatDateId(editingCell.date);
                          const emp = state.employees.find(e => e.id === editingCell.empId)!;
                          const current = getDaySchedule(emp, editingCell.date);
                          updateState(prev => ({ ...prev, schedule: { ...prev.schedule, [`${editingCell.empId}_${dateId}`]: { ...current, startTime, endTime, isManualOverride: true } }, logs: [...(prev.logs || []), logChange('OVERRIDE', `Time`, current.startTime, startTime, emp.name)].slice(-100) }));
                        }} />
                    </div>
                  </div>
                  <div className="bg-zinc-800/40 p-6 rounded-[2rem] border border-white/5 flex justify-between items-center">
                    <div>
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Visual Shift End</span>
                      <span className="text-xl font-black text-white italic tracking-tighter">
                        {(() => { 
                          const sched = getDaySchedule(state.employees.find(e => e.id === editingCell.empId)!, editingCell.date); 
                          const emp = state.employees.find(e => e.id === editingCell.empId); 
                          const isDT = emp?.driveTimeStores.includes(sched.storeId); 
                          const end = isDT ? applyDriveTime(sched.endTime) : sched.endTime; 
                          return formatTo12h(end); 
                        })()}
                      </span>
                    </div>
                    {state.employees.find(e => e.id === editingCell.empId)?.driveTimeStores.includes(getDaySchedule(state.employees.find(e => e.id === editingCell.empId)!, editingCell.date).storeId) && (
                      <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl">
                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-[0.2em]">DT -1HR APPLIED</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-4 pt-10">
                <button onClick={() => {
                    const dateId = formatDateId(editingCell.date);
                    const emp = state.employees.find(e => e.id === editingCell.empId)!;
                    updateState(prev => {
                      const newSched = { ...prev.schedule };
                      delete newSched[`${editingCell.empId}_${dateId}`];
                      return { ...prev, schedule: newSched, logs: [...(prev.logs || []), logChange('REVERT', `Rotation Revert`, 'Custom', 'Default', emp.name)].slice(-100) };
                    });
                    setEditingCell(null);
                  }} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-black py-6 rounded-[1.5rem] text-[10px] tracking-widest uppercase transition-all">REVERT TO ROTATION</button>
                <button onClick={() => setEditingCell(null)} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-6 rounded-[1.5rem] text-[10px] tracking-widest uppercase transition-all shadow-2xl">SAVE CHANGES</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
