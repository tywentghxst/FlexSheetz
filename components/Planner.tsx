
import React, { useState, useMemo, useRef } from 'react';
import { AppState, DayStatus, Employee, ScheduleEntry } from '../types';
import { getWeekRange, getWeekNumber, formatDateId, calculateEndTime, applyDriveTime, formatTo12h } from '../utils';
import { COLORS, DAYS_OF_WEEK } from '../constants';
import { format, isSameDay } from 'date-fns';

interface PlannerProps {
  state: AppState;
  updateState: (updater: (prev: AppState) => AppState) => void;
}

const Planner: React.FC<PlannerProps> = ({ state, updateState }) => {
  const [currentWeekNum, setCurrentWeekNum] = useState(() => getWeekNumber(new Date()));
  const weekRange = useMemo(() => getWeekRange(currentWeekNum), [currentWeekNum]);
  const [editingCell, setEditingCell] = useState<{ empId: string, date: Date } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const snapToToday = () => {
    setCurrentWeekNum(getWeekNumber(new Date()));
  };

  // Determine if the current week is Week 1 or Week 2 in the rotation
  const weekParityLabel = (currentWeekNum % 2 === 0) ? 'Week 2' : 'Week 1';

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
    setEditingCell({ empId: emp.id, date });
  };

  const getStatusColor = (status: DayStatus) => {
    switch (status) {
      case DayStatus.TRAINING: return COLORS.blue;
      case DayStatus.OFF: return COLORS.gray;
      case DayStatus.PTO: return COLORS.purple;
      case DayStatus.UNPAID: return COLORS.orange;
      case DayStatus.CALL_OFF: return COLORS.sheetzRed;
      case DayStatus.UNSCHEDULED: return COLORS.emerald;
      default: return state.darkMode ? '#262626' : '#ffffff';
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar scroll-smooth" ref={scrollRef}>
        <button 
          onClick={snapToToday}
          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap"
        >
          TODAY
        </button>
        {Array.from({ length: 52 }, (_, i) => i + 1).map(num => (
          <button
            key={num}
            onClick={() => setCurrentWeekNum(num)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              currentWeekNum === num 
                ? 'bg-red-600 text-white shadow-lg scale-110' 
                : 'bg-white/5 text-gray-400'
            }`}
          >
            WK {num}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
        <div className="flex items-center gap-3">
          <div className="text-xs uppercase tracking-tighter opacity-60 font-black">
            {format(weekRange[0], 'MMM dd')} - {format(weekRange[6], 'MMM dd, yyyy')}
          </div>
          <div className="bg-zinc-800 px-2 py-0.5 rounded border border-white/10">
            <span className="text-[10px] font-black uppercase text-red-500 tracking-widest">{weekParityLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Live View</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 shadow-2xl relative">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-zinc-900">
              <th className="sticky-column bg-zinc-900 p-4 text-left border-r border-white/10 w-48 text-[10px] uppercase tracking-widest text-zinc-500 font-black">
                Team Member
              </th>
              {weekRange.map((date, i) => (
                <th key={i} className={`p-3 text-center border-r border-white/10 ${isSameDay(date, new Date()) ? 'bg-red-900/20' : ''}`}>
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{DAYS_OF_WEEK[i]}</div>
                  <div className={`text-lg font-black ${isSameDay(date, new Date()) ? 'text-red-500' : ''}`}>{format(date, 'd')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.employees.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-20 text-center opacity-30 text-sm">
                  No team members added yet. Head to the Team tab.
                </td>
              </tr>
            ) : (
              state.employees
                .sort((a, b) => a.shift.localeCompare(b.shift))
                .map(emp => (
                <tr key={emp.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                  <td className="sticky-column bg-zinc-900 p-4 border-r border-white/10">
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

                    const onlyTextStatuses = [DayStatus.OFF, DayStatus.PTO, DayStatus.CALL_OFF, DayStatus.UNPAID];
                    const showOnlyText = onlyTextStatuses.includes(sched.status);
                    const isUnscheduled = sched.status === DayStatus.UNSCHEDULED;

                    const displayEndTime = isDT ? applyDriveTime(sched.endTime) : sched.endTime;

                    return (
                      <td 
                        key={i} 
                        className="p-1 min-w-[120px]"
                        onClick={() => handleEditCell(emp, date)}
                      >
                        <div 
                          className="h-20 rounded-lg p-2 flex flex-col justify-between cursor-pointer border-l-4 overflow-hidden relative shadow-sm"
                          style={{ 
                            backgroundColor: bgColor, 
                            borderColor: (sched.status === DayStatus.WORK || isUnscheduled) ? COLORS.sheetzRed : 'transparent',
                            color: 'white'
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <span className={`uppercase opacity-70 font-black text-[8px] tracking-tight`}>
                              {isUnscheduled ? 'UNS' : (sched.status === DayStatus.WORK ? 'WORK' : sched.status)}
                            </span>
                            {!showOnlyText && isDT && (
                              <span className="text-[7px] bg-red-600 text-white px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">
                                {state.driveTimeLabel}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-black">
                            {showOnlyText ? (
                              <div className="text-lg leading-none mb-1 font-black">{sched.status}</div>
                            ) : isUnscheduled ? (
                              <>
                                <div className="text-[9px] opacity-70 leading-none mb-1">STORE #{storeNum}</div>
                                <div className="text-lg leading-none font-black uppercase tracking-tight">UNS</div>
                              </>
                            ) : (
                              <>
                                <div className="text-lg leading-none mb-1">#{storeNum}</div>
                                <div className="text-[9px] opacity-90 whitespace-nowrap font-bold">
                                  {formatTo12h(sched.startTime)} - {formatTo12h(displayEndTime)}
                                </div>
                              </>
                            )}
                          </div>
                          {sched.isManualOverride && (
                            <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-yellow-400" />
                          )}
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

      {editingCell && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 w-full max-w-md rounded-2xl p-6 border border-white/10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-black mb-1">Edit Schedule</h3>
            <p className="text-xs text-zinc-500 mb-6 uppercase font-bold">
              {state.employees.find(e => e.id === editingCell.empId)?.name} • {format(editingCell.date, 'EEEE, MMM dd')}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Status</label>
                <select 
                  className="w-full bg-zinc-800 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-red-500 text-white font-bold"
                  value={getDaySchedule(state.employees.find(e => e.id === editingCell.empId)!, editingCell.date).status}
                  onChange={(e) => {
                    const status = e.target.value as DayStatus;
                    const dateId = formatDateId(editingCell.date);
                    const current = getDaySchedule(state.employees.find(e => e.id === editingCell.empId)!, editingCell.date);
                    updateState(prev => ({
                      ...prev,
                      schedule: {
                        ...prev.schedule,
                        [`${editingCell.empId}_${dateId}`]: { ...current, status, isManualOverride: true }
                      }
                    }));
                  }}
                >
                  {Object.values(DayStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Assigned Store</label>
                  <select 
                    className="w-full bg-zinc-800 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-red-500 text-white font-bold"
                    value={getDaySchedule(state.employees.find(e => e.id === editingCell.empId)!, editingCell.date).storeId}
                    onChange={(e) => {
                      const storeId = e.target.value;
                      const dateId = formatDateId(editingCell.date);
                      const current = getDaySchedule(state.employees.find(e => e.id === editingCell.empId)!, editingCell.date);
                      updateState(prev => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          [`${editingCell.empId}_${dateId}`]: { ...current, storeId, isManualOverride: true }
                        }
                      }));
                    }}
                  >
                    {state.stores.map(s => (
                      <option key={s.id} value={s.id}>#{s.number} {state.employees.find(e => e.id === editingCell.empId)?.driveTimeStores.includes(s.id) ? `(${state.driveTimeLabel})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Base Shift</label>
                  <div className="bg-zinc-800 border-none rounded-xl p-4 text-sm text-zinc-500 font-bold">
                    {state.employees.find(e => e.id === editingCell.empId)?.shift}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Start Time</label>
                  <input 
                    type="time" 
                    className="w-full bg-zinc-800 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-red-500 text-white font-bold"
                    value={getDaySchedule(state.employees.find(e => e.id === editingCell.empId)!, editingCell.date).startTime}
                    onChange={(e) => {
                      const startTime = e.target.value;
                      const endTime = calculateEndTime(startTime);
                      const dateId = formatDateId(editingCell.date);
                      const current = getDaySchedule(state.employees.find(e => e.id === editingCell.empId)!, editingCell.date);
                      updateState(prev => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          [`${editingCell.empId}_${dateId}`]: { ...current, startTime, endTime, isManualOverride: true }
                        }
                      }));
                    }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Visual End Time</label>
                  <div className="w-full bg-zinc-800 rounded-xl p-4 text-sm text-white/50 font-bold opacity-60">
                    {(() => {
                        const sched = getDaySchedule(state.employees.find(e => e.id === editingCell.empId)!, editingCell.date);
                        const emp = state.employees.find(e => e.id === editingCell.empId);
                        const isDT = emp?.driveTimeStores.includes(sched.storeId);
                        const end = isDT ? applyDriveTime(sched.endTime) : sched.endTime;
                        return formatTo12h(end);
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button 
                  onClick={() => {
                    const dateId = formatDateId(editingCell.date);
                    updateState(prev => {
                      const newSched = { ...prev.schedule };
                      delete newSched[`${editingCell.empId}_${dateId}`];
                      return { ...prev, schedule: newSched };
                    });
                    setEditingCell(null);
                  }}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-black py-4 rounded-2xl text-[10px] tracking-widest uppercase transition-all"
                >
                  REVERT
                </button>
                <button 
                  onClick={() => setEditingCell(null)}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl text-[10px] tracking-widest uppercase transition-all shadow-lg"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Planner;
