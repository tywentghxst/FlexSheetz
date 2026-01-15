
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

// Specific mustard yellow for work status
const MUSTARD_YELLOW = '#E1AD01';

const Schedule: React.FC<ScheduleProps> = ({ state, updateState, isAuthenticated }) => {
  const [currentWeekNum, setCurrentWeekNum] = useState(() => getWeekNumber(new Date()));
  const weekRange = useMemo(() => getWeekRange(currentWeekNum), [currentWeekNum]);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
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
      case DayStatus.OFF: return COLORS.gray;
      case DayStatus.PTO: return COLORS.purple;
      case DayStatus.UNPAID: return COLORS.orange;
      case DayStatus.CALL_OFF: return COLORS.sheetzRed;
      case DayStatus.UNSCHEDULED: return COLORS.emerald;
      case DayStatus.LEAVE_OF_ABSENCE: return '#6B7280';
      case DayStatus.BEREAVEMENT: return '#4338CA';
      default: return state.darkMode ? '#262626' : '#ffffff';
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
    <div className="flex gap-2 overflow-x-auto pb-2 mb-4 custom-scrollbar">
      {(['ALL', ...Object.values(DayStatus)] as const).map(status => {
        const isActive = statusFilter === status;
        const color = getStatusColor(status as DayStatus);
        
        // Use "ASSIGNED" for work status instead of "WORKING"
        let displayLabel = status === 'ALL' ? 'All Staff' : status;
        if (status === DayStatus.WORK) {
          displayLabel = 'ASSIGNED';
        }

        return (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
              isActive 
                ? 'bg-red-600 border-red-600 text-white shadow-lg' 
                : 'bg-zinc-900 border-white/10 text-zinc-500 hover:border-white/20'
            }`}
            style={isActive ? {} : { borderLeft: `3px solid ${color}` }}
          >
            {displayLabel}
          </button>
        );
      })}
    </div>
  );

  const renderDayView = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div 
        ref={dayScrollRef}
        className="flex bg-zinc-900/50 p-2 rounded-2xl border border-white/5 overflow-x-auto gap-2 scroll-smooth"
      >
        {weekRange.map((date, i) => {
          const isToday = isSameDay(date, new Date());
          const isSelected = isSameDay(date, selectedDay);
          return (
            <button
              key={i}
              data-today={isToday}
              onClick={() => setSelectedDay(date)}
              className={`flex-1 min-w-[80px] py-4 rounded-xl flex flex-col items-center transition-all ${
                isSelected 
                  ? 'bg-red-600 text-white shadow-xl scale-105 z-10' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-widest mb-1">{DAYS_OF_WEEK[i]}</span>
              <span className="text-2xl font-black">{format(date, 'd')}</span>
              {isToday && !isSelected && <div className="w-1.5 h-1.5 rounded-full bg-red-600 mt-0.5" />}
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

            return (
              <div 
                key={emp.id}
                onClick={() => handleEditCell(emp, selectedDay)}
                className={`bg-zinc-900 border border-white/5 p-5 rounded-[2rem] flex items-center justify-between group active:scale-[0.98] transition-all relative overflow-hidden ${isAuthenticated ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: bgColor }} />
                <div className="flex-1">
                   <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">{emp.shift}</span>
                      {sched.isManualOverride && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
                   </div>
                   <h4 className="text-xl font-black italic tracking-tighter text-white">{emp.name}</h4>
                   <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1">Home: #{homeStoreNum}</p>
                </div>

                <div className="text-right">
                   <div className="flex items-center justify-end gap-2 mb-2">
                      {isDT && <span className="text-[7px] bg-red-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">{state.driveTimeLabel}</span>}
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                        {sched.status === DayStatus.WORK ? 'ASSIGNED TO' : (sched.status === DayStatus.UNSCHEDULED ? 'UNSCHEDULED' : sched.status)}
                      </span>
                   </div>
                   {sched.status === DayStatus.WORK || sched.status === DayStatus.UNSCHEDULED ? (
                     <div>
                        <div className="text-2xl font-black italic tracking-tighter text-white">
                          {sched.status === DayStatus.UNSCHEDULED ? 'UNSCHEDULED' : `#${storeNum}`}
                        </div>
                        {sched.status !== DayStatus.UNSCHEDULED && (
                          <div className="text-[10px] font-black text-zinc-400 mt-0.5">
                            {formatTo12h(sched.startTime)} - {formatTo12h(displayEndTime)}
                          </div>
                        )}
                     </div>
                   ) : (
                     <div className="text-2xl font-black italic tracking-tighter text-zinc-400 truncate max-w-[140px]">
                        {sched.status === DayStatus.OFF ? 'OFF' : sched.status}
                     </div>
                   )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center opacity-20 italic">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-sm font-black uppercase tracking-widest">No results for this filter</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderWeekView = () => (
    <div className="overflow-x-auto rounded-xl border border-white/10 shadow-2xl relative animate-in fade-in slide-in-from-left-4 duration-300">
      <table className="w-full border-collapse min-w-[800px]">
        <thead>
          <tr className="bg-zinc-900">
            <th className="sticky-column bg-zinc-900 p-4 text-left border-r border-white/10 w-48 text-[10px] uppercase tracking-widest text-zinc-500 font-black text-white">Team Member</th>
            {weekRange.map((date, i) => (
              <th key={i} className={`p-3 text-center border-r border-white/10 ${isSameDay(date, new Date()) ? 'bg-red-900/20' : ''}`}>
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{DAYS_OF_WEEK[i]}</div>
                <div className={`text-lg font-black ${isSameDay(date, new Date()) ? 'text-red-500' : 'text-white'}`}>{format(date, 'd')}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.employees.length === 0 ? (
            <tr><td colSpan={8} className="p-20 text-center opacity-30 text-sm">No team members added yet. Head to Settings to manage your roster.</td></tr>
          ) : (
            state.employees.sort((a, b) => a.shift.localeCompare(b.shift)).map(emp => (
              <tr key={emp.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                <td className="sticky-column bg-zinc-900 p-4 border-r border-white/10 text-white">
                  <div className="font-black text-sm">{emp.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-zinc-400">{emp.shift}</span>
                     <span className="text-[9px] font-bold text-red-500">#{state.stores.find(s => s.id === emp.homeStoreId)?.number}</span>
                  </div>
                </td>
                {weekRange.map((date, i) => {
                  const sched = getDaySchedule(emp, date);
                  const isDT = emp.driveTimeStores.includes(sched.storeId);
                  const storeNum = state.stores.find(s => s.id === sched.storeId)?.number || '---';
                  const bgColor = getStatusColor(sched.status);
                  const showOnlyText = [DayStatus.OFF, DayStatus.PTO, DayStatus.CALL_OFF, DayStatus.UNPAID, DayStatus.LEAVE_OF_ABSENCE, DayStatus.BEREAVEMENT].includes(sched.status);
                  const isUnscheduled = sched.status === DayStatus.UNSCHEDULED;
                  const displayEndTime = isDT ? applyDriveTime(sched.endTime) : sched.endTime;
                  return (
                    <td key={i} className="p-1 min-w-[120px]" onClick={() => handleEditCell(emp, date)}>
                      <div className={`h-20 rounded-lg p-2 flex flex-col justify-between border-l-4 overflow-hidden relative shadow-sm ${isAuthenticated ? 'cursor-pointer' : 'cursor-default'}`} style={{ backgroundColor: bgColor, borderColor: (sched.status === DayStatus.WORK || isUnscheduled) ? MUSTARD_YELLOW : 'transparent', color: 'white' }}>
                        <div className="flex justify-between items-start">
                          <span className={`uppercase opacity-70 font-black text-[8px] tracking-tight`}>
                            {isUnscheduled ? 'UNSCHEDULED' : (sched.status === DayStatus.WORK ? 'ASSIGNED TO' : sched.status)}
                          </span>
                          {!showOnlyText && isDT && (<span className="text-[7px] bg-red-600 text-white px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">{state.driveTimeLabel}</span>)}
                        </div>
                        <div className="text-xs font-black">
                          {showOnlyText ? (
                            <div className={`leading-tight mb-1 font-black uppercase italic ${sched.status === DayStatus.OFF ? 'text-lg' : 'text-[10px]'}`}>
                              {sched.status}
                            </div>
                          ) : isUnscheduled ? (
                            <>
                              <div className="text-[9px] opacity-70 leading-none mb-1">STORE #{storeNum}</div>
                              <div className="text-xs leading-none font-black uppercase tracking-tight">UNSCHEDULED</div>
                            </>
                          ) : (
                            <>
                              <div className="text-lg leading-none mb-1">#{storeNum}</div>
                              <div className="text-[9px] opacity-90 whitespace-nowrap font-bold">{formatTo12h(sched.startTime)} - {formatTo12h(displayEndTime)}</div>
                            </>
                          )}
                        </div>
                        {sched.isManualOverride && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-yellow-400" />}
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
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
         <div className="flex items-center gap-2 overflow-x-auto pb-4 pt-2 custom-scrollbar scroll-smooth" ref={weekScrollRef}>
            <button 
              onClick={snapToToday} 
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-[10px] font-black whitespace-nowrap border border-white/5 active:scale-95 transition-all"
            >
              TODAY
            </button>
            {Array.from({ length: 52 }, (_, i) => i + 1).map(num => (
              <button 
                key={num} 
                data-week={num}
                onClick={() => setCurrentWeekNum(num)} 
                className={`px-4 py-2 rounded-full text-[10px] font-black transition-all ${currentWeekNum === num ? 'bg-red-600 text-white shadow-xl scale-105 z-10 border-red-500' : 'bg-white/5 text-gray-400 border border-white/5'}`}
              >
                WK {num}
              </button>
            ))}
         </div>
      </div>

      <div className="flex items-center justify-between gap-4 py-3 border-b border-white/5">
         <div className="flex items-center gap-4">
           <div className="text-xl italic font-black text-white tracking-tighter uppercase leading-none">
            {format(weekRange[0], 'MMM dd')} <span className="text-red-600 opacity-50">—</span> {format(weekRange[6], 'MMM dd')}
           </div>
           <div className="bg-zinc-900 px-3 py-1.5 rounded-2xl border border-white/10 shadow-xl">
             <span className="text-[10px] font-black uppercase text-red-600 tracking-[0.25em]">{weekParityLabel}</span>
           </div>
         </div>
         <div className="flex bg-zinc-900 p-1.5 rounded-2xl border border-white/5 shrink-0 shadow-inner">
            <button 
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewMode === 'week' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500'}`}
            >
              Week
            </button>
            <button 
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewMode === 'day' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500'}`}
            >
              Day
            </button>
         </div>
      </div>

      {!isAuthenticated && (
        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Viewing Only • Login to make changes</p>
        </div>
      )}

      {viewMode === 'day' ? renderDayView() : renderWeekView()}

      {editingCell && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 w-full max-w-md rounded-2xl p-6 border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-black mb-1 text-white">Edit Shift</h3>
            <p className="text-xs text-zinc-500 mb-6 uppercase font-bold">{state.employees.find(e => e.id === editingCell.empId)?.name} • {format(editingCell.date, 'EEEE, MMM dd')}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Status</label>
                <select className="w-full bg-zinc-800 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-red-500 text-white font-bold" value={getDaySchedule(state.employees.find(e => e.id === editingCell.empId)!, editingCell.date).status} onChange={(e) => {
                    const status = e.target.value as DayStatus;
                    const dateId = formatDateId(editingCell.date);
                    const emp = state.employees.find(e => e.id === editingCell.empId)!;
                    const current = getDaySchedule(emp, editingCell.date);
                    updateState(prev => ({ ...prev, schedule: { ...prev.schedule, [`${editingCell.empId}_${dateId}`]: { ...current, status, isManualOverride: true } }, logs: [...(prev.logs || []), logChange('OVERRIDE', `Shift Status (${format(editingCell.date, 'MM/dd')})`, current.status, status, emp.name)].slice(-100) }));
                  }}>
                  {Object.values(DayStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {!isOOOStatus && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Assigned Store</label>
                      <select className="w-full bg-zinc-800 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-red-500 text-white font-bold" value={getDaySchedule(state.employees.find(e => e.id === editingCell.empId)!, editingCell.date).storeId} onChange={(e) => {
                          const storeId = e.target.value;
                          const dateId = formatDateId(editingCell.date);
                          const emp = state.employees.find(e => e.id === editingCell.empId)!;
                          const current = getDaySchedule(emp, editingCell.date);
                          
                          // SMART LOGIC: If currently unscheduled, flipping store autoswitches to WORK status
                          let newStatus = current.status;
                          if (current.status === DayStatus.UNSCHEDULED) {
                            newStatus = DayStatus.WORK;
                          }

                          const oldStoreNum = state.stores.find(s => s.id === current.storeId)?.number || '??';
                          const newStoreNum = state.stores.find(s => s.id === storeId)?.number || '??';
                          updateState(prev => ({ 
                            ...prev, 
                            schedule: { 
                              ...prev.schedule, 
                              [`${editingCell.empId}_${dateId}`]: { 
                                ...current, 
                                storeId, 
                                status: newStatus,
                                isManualOverride: true 
                              } 
                            }, 
                            logs: [...(prev.logs || []), logChange('OVERRIDE', `Store Assignment (${format(editingCell.date, 'MM/dd')})`, `#${oldStoreNum}`, `#${newStoreNum}`, emp.name)].slice(-100) 
                          }));
                        }}>
                        {state.stores.map(s => <option key={s.id} value={s.id}>#{s.number} {state.employees.find(e => e.id === editingCell.empId)?.driveTimeStores.includes(s.id) ? `(${state.driveTimeLabel})` : ''}</option>)}
                      </select>
                    </div>
                    <div><label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Base Shift</label><div className="bg-zinc-800 border-none rounded-xl p-4 text-sm text-zinc-500 font-bold">{state.employees.find(e => e.id === editingCell.empId)?.shift}</div></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Start Time</label>
                      <input type="time" className="w-full bg-zinc-800 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-red-500 text-white font-bold" value={getDaySchedule(state.employees.find(e => e.id === editingCell.empId)!, editingCell.date).startTime} onChange={(e) => {
                          const startTime = e.target.value;
                          const endTime = calculateEndTime(startTime);
                          const dateId = formatDateId(editingCell.date);
                          const emp = state.employees.find(e => e.id === editingCell.empId)!;
                          const current = getDaySchedule(emp, editingCell.date);
                          updateState(prev => ({ ...prev, schedule: { ...prev.schedule, [`${editingCell.empId}_${dateId}`]: { ...current, startTime, endTime, isManualOverride: true } }, logs: [...(prev.logs || []), logChange('OVERRIDE', `Start Time (${format(editingCell.date, 'MM/dd')})`, current.startTime, startTime, emp.name)].slice(-100) }));
                        }} />
                    </div>
                    <div><label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Visual End Time</label><div className="w-full bg-zinc-800 rounded-xl p-4 text-sm text-white/50 font-bold opacity-60"> {(() => { const sched = getDaySchedule(state.employees.find(e => e.id === editingCell.empId)!, editingCell.date); const emp = state.employees.find(e => e.id === editingCell.empId); const isDT = emp?.driveTimeStores.includes(sched.storeId); const end = isDT ? applyDriveTime(sched.endTime) : sched.endTime; return formatTo12h(end); })()}</div></div>
                  </div>
                </>
              )}

              {isOOOStatus && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Store & Time Selection Disabled for {currentEditorSchedule?.status}</p>
                </div>
              )}

              <div className="flex gap-3 pt-6">
                <button onClick={() => {
                    const dateId = formatDateId(editingCell.date);
                    const emp = state.employees.find(e => e.id === editingCell.empId)!;
                    updateState(prev => {
                      const newSched = { ...prev.schedule };
                      delete newSched[`${editingCell.empId}_${dateId}`];
                      return { ...prev, schedule: newSched, logs: [...(prev.logs || []), logChange('REVERT', `Manual Override (${format(editingCell.date, 'MM/dd')})`, 'Manual', 'Rotation Default', emp.name)].slice(-100) };
                    });
                    setEditingCell(null);
                  }} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-black py-4 rounded-2xl text-[10px] tracking-widest uppercase transition-all">REVERT</button>
                <button onClick={() => setEditingCell(null)} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl text-[10px] tracking-widest uppercase transition-all shadow-lg">CLOSE</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
