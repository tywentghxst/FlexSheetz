import React, { useState } from 'react';
import { AppState, ShiftType, DayStatus, Employee, RotationDay } from '../types';
import { SHIFT_DEFAULTS, DAYS_OF_WEEK } from '../constants';
import { generateId, formatTo12h } from '../utils';

interface TeamProps {
  state: AppState;
  updateState: (updater: (prev: AppState) => AppState) => void;
}

const Team: React.FC<TeamProps> = ({ state, updateState }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeRotationWeek, setActiveRotationWeek] = useState<'week1' | 'week2'>('week1');

  const createUnscheduledRotation = (shift: ShiftType) => ({
    week1: Array.from({ length: 7 }).reduce((acc, _, i) => {
      acc[i] = { 
        status: DayStatus.UNSCHEDULED, 
        startTime: SHIFT_DEFAULTS[shift].start, 
        endTime: SHIFT_DEFAULTS[shift].end 
      };
      return acc;
    }, {} as Record<string, RotationDay>),
    week2: Array.from({ length: 7 }).reduce((acc, _, i) => {
      acc[i] = { 
        status: DayStatus.UNSCHEDULED, 
        startTime: SHIFT_DEFAULTS[shift].start, 
        endTime: SHIFT_DEFAULTS[shift].end 
      };
      return acc;
    }, {} as Record<string, RotationDay>)
  });

  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    shift: ShiftType.FIRST,
    homeStoreId: state.stores[0]?.id || '',
    allowedStores: state.stores.map(s => s.id),
    driveTimeStores: [],
    rotation: createUnscheduledRotation(ShiftType.FIRST)
  });

  const handleSave = () => {
    if (!formData.name) return alert('Name required');
    
    updateState(prev => {
      const newEmployee: Employee = {
        ...(formData as Employee),
        allowedStores: prev.stores.map(s => s.id), 
        id: editingId || generateId(),
      };
      
      const employees = editingId 
        ? prev.employees.map(e => e.id === editingId ? newEmployee : e)
        : [...prev.employees, newEmployee];

      return { ...prev, employees };
    });

    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (emp: Employee) => {
    setFormData(emp);
    setEditingId(emp.id);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this employee?')) {
      updateState(prev => ({
        ...prev,
        employees: prev.employees.filter(e => e.id !== id)
      }));
    }
  };

  if (isAdding) {
    return (
      <div className="p-4 max-w-2xl mx-auto pb-32 text-white">
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black uppercase tracking-tighter">{editingId ? 'Edit Profile' : 'New Supervisor'}</h2>
          <button onClick={() => setIsAdding(false)} className="text-xs font-black opacity-50 hover:opacity-100 uppercase tracking-widest">CANCEL</button>
        </header>

        <div className="space-y-6">
          <section className="bg-zinc-900 p-6 rounded-3xl border border-white/5 shadow-xl">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-4">Core Profile</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">Full Name</label>
                <input 
                  className="w-full bg-zinc-800 rounded-xl p-4 border-none focus:ring-2 focus:ring-red-500 text-white font-bold" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Employee Name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">Shift</label>
                  <select 
                    className="w-full bg-zinc-800 rounded-xl p-4 border-none focus:ring-2 focus:ring-red-500 text-white font-bold"
                    value={formData.shift}
                    onChange={e => {
                      const shift = e.target.value as ShiftType;
                      setFormData({ ...formData, shift, rotation: createUnscheduledRotation(shift) });
                    }}
                  >
                    {Object.values(ShiftType).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">Home Store</label>
                  <select 
                    className="w-full bg-zinc-800 rounded-xl p-4 border-none focus:ring-2 focus:ring-red-500 text-white font-bold"
                    value={formData.homeStoreId}
                    onChange={e => setFormData({ ...formData, homeStoreId: e.target.value })}
                  >
                    {state.stores.map(s => <option key={s.id} value={s.id}>#{s.number}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-zinc-900 p-6 rounded-3xl border border-white/5 shadow-xl">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-4">Drive Time Authorization</h3>
            <p className="text-[10px] text-zinc-500 mb-4 uppercase font-bold leading-tight">Toggle stores where this supervisor earns drive-time pay.</p>
            <div className="grid grid-cols-3 gap-2">
              {state.stores.map(s => {
                const isDT = formData.driveTimeStores?.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      const current = formData.driveTimeStores || [];
                      const next = current.includes(s.id) ? current.filter(id => id !== s.id) : [...current, s.id];
                      setFormData({ ...formData, driveTimeStores: next });
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      isDT ? 'border-red-500 bg-red-500/10' : 'border-white/5 bg-zinc-800 opacity-60'
                    }`}
                  >
                    <span className="text-xs font-black">#{s.number}</span>
                    <span className="text-[8px] font-bold mt-1 opacity-60">{isDT ? 'ELIGIBLE' : 'NONE'}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="bg-zinc-900 p-6 rounded-3xl border border-white/5 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-red-500">Default Rotation</h3>
              <div className="flex gap-2 bg-black p-1 rounded-lg">
                {(['week1', 'week2'] as const).map(w => (
                  <button
                    key={w}
                    onClick={() => setActiveRotationWeek(w)}
                    className={`px-3 py-1 text-[10px] font-black rounded ${activeRotationWeek === w ? 'bg-red-600 text-white' : 'text-zinc-500'}`}
                  >
                    {w.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {DAYS_OF_WEEK.map((day, idx) => {
                const rot = formData.rotation?.[activeRotationWeek][idx];
                const showTimes = rot?.status === DayStatus.WORK || rot?.status === DayStatus.UNSCHEDULED;
                return (
                  <div key={day} className="flex flex-col gap-3 bg-zinc-800/40 p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="w-12 font-black text-sm text-zinc-500 uppercase tracking-tighter">{day}</div>
                      <select 
                        className="bg-zinc-800 border-none rounded-lg text-xs p-2 font-bold focus:ring-red-500 text-white min-w-[160px]"
                        value={rot?.status}
                        onChange={e => {
                          const nextRot = { ...formData.rotation! };
                          nextRot[activeRotationWeek][idx].status = e.target.value as DayStatus;
                          setFormData({ ...formData, rotation: nextRot });
                        }}
                      >
                        {Object.values(DayStatus).map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                    </div>
                    
                    {showTimes && (
                      <div className="grid grid-cols-2 gap-3 mt-1">
                        <div>
                          <label className="block text-[8px] font-black text-zinc-500 uppercase mb-1 tracking-widest flex justify-between">
                            START <span>{formatTo12h(rot.startTime)}</span>
                          </label>
                          <input 
                            type="time" 
                            className="bg-black/40 border-none rounded-lg text-xs p-3 w-full font-bold text-white focus:ring-1 focus:ring-red-500"
                            value={rot.startTime}
                            onChange={e => {
                               const nextRot = { ...formData.rotation! };
                               nextRot[activeRotationWeek][idx].startTime = e.target.value;
                               const [h, m] = e.target.value.split(':').map(Number);
                               let totalMins = h * 60 + m + 630;
                               const eh = Math.floor(totalMins / 60) % 24;
                               const em = totalMins % 60;
                               nextRot[activeRotationWeek][idx].endTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
                               setFormData({ ...formData, rotation: nextRot });
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-black text-zinc-500 uppercase mb-1 tracking-widest flex justify-between">
                            END <span>{formatTo12h(rot.endTime)}</span>
                          </label>
                          <input 
                            type="time" 
                            disabled
                            className="bg-black/20 border-none rounded-lg text-xs p-3 w-full font-bold opacity-40 text-white cursor-not-allowed"
                            value={rot.endTime}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <button 
            onClick={handleSave}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-5 rounded-3xl shadow-xl transition-all active:scale-95 text-xs tracking-[4px] uppercase"
          >
            {editingId ? 'UPDATE PROFILE' : 'COMMIT TO ROSTER'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-32">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black">Roster</h2>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{state.employees.length} TOTAL STAFF</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({
              name: '',
              shift: ShiftType.FIRST,
              homeStoreId: state.stores[0]?.id || '',
              allowedStores: state.stores.map(s => s.id),
              driveTimeStores: [],
              rotation: createUnscheduledRotation(ShiftType.FIRST)
            });
            setIsAdding(true);
          }}
          className="bg-red-600 w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg transition-transform active:scale-90"
        >
          +
        </button>
      </header>

      <div className="grid gap-4">
        {state.employees
          .sort((a, b) => a.shift.localeCompare(b.shift))
          .map(emp => (
          <div key={emp.id} className="bg-zinc-900 border border-white/5 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600" />
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-black">{emp.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-black bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">{emp.shift}</span>
                  <span className="text-[10px] font-black text-red-500">HOME STORE #{state.stores.find(s => s.id === emp.homeStoreId)?.number}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(emp)} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-white transition-colors">✏️</button>
                <button onClick={() => handleDelete(emp.id)} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-white transition-colors">🗑️</button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4 border-t border-white/5 pt-4">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest w-full mb-1">Drive Time Authorized</span>
              {emp.driveTimeStores.map(storeId => (
                <span key={storeId} className="bg-red-950/30 text-red-500 border border-red-500/20 px-2 py-0.5 rounded text-[9px] font-black">
                  #{state.stores.find(s => s.id === storeId)?.number}
                </span>
              ))}
              {emp.driveTimeStores.length === 0 && <span className="text-[9px] font-bold text-zinc-600 italic">No drive time stores</span>}
            </div>
          </div>
        ))}
        {state.employees.length === 0 && (
          <div className="text-center py-20 opacity-30">
            <div className="text-5xl mb-4">👥</div>
            <p className="text-xs font-black uppercase tracking-widest">NO STAFF ON ROSTER</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Team;