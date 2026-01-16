
import React, { useState } from 'react';
import { AppState, Store, Employee, ShiftType, DayStatus, RotationDay, ChangeLog } from '../types';
import { INITIAL_STORES, COLORS, SHIFT_DEFAULTS, DAYS_OF_WEEK } from '../constants';
import { generateId, formatTo12h } from '../utils';

interface SettingsProps {
  state: AppState;
  updateState: (updater: (prev: AppState) => AppState) => void;
  onRefresh?: () => void;
  onLogout: () => void;
}

type SettingsSubTab = 'Team' | 'Stores' | 'General';

const Settings: React.FC<SettingsProps> = ({ state, updateState, onRefresh, onLogout }) => {
  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>('Team');
  const [newStore, setNewStore] = useState({ number: '', address: '' });
  const [showToken, setShowToken] = useState(false);
  
  const [isEditingEmployee, setIsEditingEmployee] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [activeRotationWeek, setActiveRotationWeek] = useState<'week1' | 'week2'>('week1');

  const createUnscheduledRotation = (shift: ShiftType): { week1: Record<string, RotationDay>, week2: Record<string, RotationDay> } => ({
    week1: Array.from({ length: 7 }).reduce<Record<string, RotationDay>>((acc, _, i) => {
      acc[i.toString()] = { 
        status: DayStatus.UNSCHEDULED, 
        startTime: SHIFT_DEFAULTS[shift].start, 
        endTime: SHIFT_DEFAULTS[shift].end 
      };
      return acc;
    }, {}),
    week2: Array.from({ length: 7 }).reduce<Record<string, RotationDay>>((acc, _, i) => {
      acc[i.toString()] = { 
        status: DayStatus.UNSCHEDULED, 
        startTime: SHIFT_DEFAULTS[shift].start, 
        endTime: SHIFT_DEFAULTS[shift].end 
      };
      return acc;
    }, {})
  });

  const [employeeFormData, setEmployeeFormData] = useState<Partial<Employee>>({
    name: '',
    shift: ShiftType.FIRST,
    homeStoreId: state.stores[0]?.id || '',
    allowedStores: state.stores.map(s => s.id),
    driveTimeStores: [],
    rotation: createUnscheduledRotation(ShiftType.FIRST)
  });

  const logChange = (action: string, field: string, oldVal: string, newVal: string, empName: string): ChangeLog => ({
    id: generateId(),
    timestamp: Date.now(),
    userName: empName,
    action,
    field,
    oldValue: oldVal,
    newValue: newVal
  });

  const handleReset = () => {
    if (confirm('WIPE ALL DATA? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const addStore = () => {
    if (!newStore.number || !newStore.address) return;
    updateState(prev => ({
      ...prev,
      stores: [...prev.stores, { id: generateId(), ...newStore }],
      logs: [...(prev.logs || []), logChange('CREATE', 'Store', 'N/A', `Added Store #${newStore.number}`, 'System Admin')].slice(-50)
    }));
    setNewStore({ number: '', address: '' });
  };

  const removeStore = (id: string) => {
    const store = state.stores.find(s => s.id === id);
    if (state.stores.length <= 1) return alert("Must have at least one store.");
    updateState(prev => ({
      ...prev,
      stores: prev.stores.filter(s => s.id !== id),
      logs: [...(prev.logs || []), logChange('DELETE', 'Store', `#${store?.number}`, 'Removed', 'System Admin')].slice(-50)
    }));
  };

  const sortStoresByNumber = () => {
    updateState(prev => {
      const sorted = [...prev.stores].sort((a, b) => 
        parseInt(a.number, 10) - parseInt(b.number, 10)
      );
      return { ...prev, stores: sorted };
    });
  };

  const moveStore = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= state.stores.length) return;
    updateState(prev => {
      const newStores = [...prev.stores];
      const temp = newStores[index];
      newStores[index] = newStores[nextIndex];
      newStores[nextIndex] = temp;
      return { ...prev, stores: newStores };
    });
  };

  const openAddEmployee = () => {
    setEmployeeFormData({
      name: '',
      shift: ShiftType.FIRST,
      homeStoreId: state.stores[0]?.id || '',
      allowedStores: state.stores.map(s => s.id),
      driveTimeStores: [],
      rotation: createUnscheduledRotation(ShiftType.FIRST)
    });
    setEditingEmployeeId(null);
    setIsEditingEmployee(true);
  };

  const openEditEmployee = (emp: Employee) => {
    setEmployeeFormData(emp);
    setEditingEmployeeId(emp.id);
    setIsEditingEmployee(true);
  };

  const handleSaveEmployee = () => {
    if (!employeeFormData.name) return alert('Name required');
    updateState(prev => {
      const existing = prev.employees.find(e => e.id === editingEmployeeId);
      const newEmployee: Employee = {
        ...(employeeFormData as Employee),
        allowedStores: prev.stores.map(s => s.id), 
        id: editingEmployeeId || generateId(),
      };

      const newLogs = [...(prev.logs || [])];
      if (existing) {
        if (existing.name !== newEmployee.name) 
          newLogs.push(logChange('UPDATE', 'Name', existing.name, newEmployee.name, newEmployee.name));
        if (existing.shift !== newEmployee.shift) 
          newLogs.push(logChange('UPDATE', 'Shift', existing.shift, newEmployee.shift, newEmployee.name));
        if (existing.homeStoreId !== newEmployee.homeStoreId) {
          const oldStoreNum = prev.stores.find(s => s.id === existing.homeStoreId)?.number || '??';
          const newStoreNum = prev.stores.find(s => s.id === newEmployee.homeStoreId)?.number || '??';
          newLogs.push(logChange('UPDATE', 'Home Store', oldStoreNum, newStoreNum, newEmployee.name));
        }
      } else {
        newLogs.push(logChange('CREATE', 'Profile', 'N/A', 'New Staff Added', newEmployee.name));
      }

      const employees = editingEmployeeId 
        ? prev.employees.map(e => e.id === editingEmployeeId ? newEmployee : e)
        : [...prev.employees, newEmployee];
      
      return { ...prev, employees, logs: newLogs.slice(-100) };
    });
    setIsEditingEmployee(false);
  };

  const deleteEmployee = (id: string) => {
    const emp = state.employees.find(e => e.id === id);
    if (confirm(`Delete profile for ${emp?.name}?`)) {
      updateState(prev => ({
        ...prev,
        employees: prev.employees.filter(e => e.id !== id),
        logs: [...(prev.logs || []), logChange('DELETE', 'Profile', emp?.name || 'Unknown', 'Removed', 'System Admin')].slice(-100)
      }));
    }
  };

  const updateGithub = (key: string, value: string) => {
    updateState(prev => ({
      ...prev,
      github: {
        ...(prev.github || { repo: '', branch: 'main', token: '', path: 'data.json' }),
        [key]: value
      }
    }));
  };

  const renderTeamSection = () => (
    <section className="bg-zinc-900 p-6 rounded-3xl border border-white/5 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-red-600">Supervisor Roster</h3>
        <button onClick={openAddEmployee} className="bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-lg active:scale-95 transition-transform">+ Add Staff</button>
      </div>
      <div className="space-y-3">
        {state.employees.length === 0 ? (
          <div className="text-center py-8 opacity-20 border-2 border-dashed border-white/5 rounded-2xl"><p className="text-[10px] font-black uppercase tracking-widest">Roster is Empty</p></div>
        ) : (
          state.employees.sort((a, b) => a.shift.localeCompare(b.shift)).map(emp => (
            <div key={emp.id} className="flex items-center justify-between p-4 bg-zinc-800/40 rounded-2xl border border-white/5 group">
               <div>
                  <div className="font-black text-sm text-white">{emp.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                     <span className="text-[9px] font-black text-zinc-500 uppercase">{emp.shift}</span>
                     <span className="text-[9px] font-black text-red-500/80">STORE #{state.stores.find(s => s.id === emp.homeStoreId)?.number}</span>
                  </div>
               </div>
               <div className="flex gap-1">
                  <button onClick={() => openEditEmployee(emp)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-xs">✏️</button>
                  <button onClick={() => deleteEmployee(emp.id)} className="p-2 bg-white/5 hover:bg-red-500/20 rounded-lg transition-colors text-xs">🗑️</button>
               </div>
            </div>
          ))
        )}
      </div>
    </section>
  );

  const renderStoresSection = () => (
    <section className="bg-zinc-900 p-6 rounded-3xl border border-white/5 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-red-600">District Stores</h3>
        <button onClick={sortStoresByNumber} className="text-[9px] font-black uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-white">Sort by #</button>
      </div>
      <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-2 mb-6">
        {state.stores.map((store, index) => (
          <div key={store.id} className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-xl group border border-white/5">
             <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex flex-col gap-0.5">
                   <button disabled={index === 0} onClick={() => moveStore(index, 'up')} className="text-[8px] opacity-20 hover:opacity-100 disabled:opacity-0 text-white">▲</button>
                   <button disabled={index === state.stores.length - 1} onClick={() => moveStore(index, 'down')} className="text-[8px] opacity-20 hover:opacity-100 disabled:opacity-0 text-white">▼</button>
                </div>
                <span className="text-red-500 font-black text-xs shrink-0">#{store.number}</span>
                <span className="text-[9px] font-bold text-zinc-500 truncate max-w-[150px]">{store.address}</span>
             </div>
             <button onClick={() => removeStore(store.id)} className="text-zinc-700 hover:text-red-500 ml-2 text-xs">✕</button>
          </div>
        ))}
      </div>
      <div className="p-4 bg-black/40 rounded-2xl space-y-3">
        <h4 className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Register Store</h4>
        <div className="grid grid-cols-3 gap-2">
          <input className="bg-zinc-800 rounded-lg p-3 text-[10px] border-none font-bold text-white" placeholder="ID#" value={newStore.number} onChange={e => setNewStore({ ...newStore, number: e.target.value })} />
          <input className="col-span-2 bg-zinc-800 rounded-lg p-3 text-[10px] border-none font-bold text-white" placeholder="Address" value={newStore.address} onChange={e => setNewStore({ ...newStore, address: e.target.value })} />
        </div>
        <button onClick={addStore} className="w-full bg-white/5 hover:bg-white/10 text-white font-black py-3 rounded-xl text-[9px] uppercase tracking-widest">Save Store</button>
      </div>
    </section>
  );

  const renderGeneralSection = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-zinc-900 p-6 rounded-3xl border border-white/5 shadow-xl">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-6">District Info</h3>
          <label className="block">
            <span className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase">DISTRICT NUMBER</span>
            <input type="text" className="w-full bg-zinc-800 rounded-xl p-4 border-none text-xl font-black text-white" value={state.district} onChange={e => updateState(prev => ({ ...prev, district: e.target.value }))} />
          </label>
        </section>
        <section className="bg-zinc-900 p-6 rounded-3xl border border-white/5 shadow-xl">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-6">Appearance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-2xl">
              <span className="text-xs font-bold text-white">Dark Mode</span>
              <button onClick={() => updateState(prev => ({ ...prev, darkMode: !prev.darkMode }))} className={`w-12 h-6 rounded-full transition-all relative ${state.darkMode ? 'bg-red-600' : 'bg-zinc-700'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${state.darkMode ? 'left-7' : 'left-1'}`} /></button>
            </div>
            
            <div className="space-y-2">
              <span className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Default View Mode</span>
              <div className="flex bg-zinc-950 p-1 rounded-xl border border-white/5">
                <button 
                  onClick={() => updateState(prev => ({ ...prev, defaultViewMode: 'day' }))}
                  className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${state.defaultViewMode === 'day' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-600'}`}
                >
                  List
                </button>
                <button 
                  onClick={() => updateState(prev => ({ ...prev, defaultViewMode: 'week' }))}
                  className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${state.defaultViewMode === 'week' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-600'}`}
                >
                  Grid
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-2xl">
              <span className="text-xs font-bold text-white">DT Label</span>
              <button onClick={() => updateState(prev => ({ ...prev, driveTimeLabel: prev.driveTimeLabel === 'Drive Time' ? 'DT' : 'Drive Time' }))} className="bg-zinc-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase text-white">{state.driveTimeLabel}</button>
            </div>
          </div>
        </section>
      </div>

      <section className="bg-zinc-900 p-6 rounded-3xl border border-emerald-500/20 shadow-xl">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-6">Cloud Sync (GitHub)</h3>
        <div className="space-y-4">
          <div><label className="block text-[9px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">Repository Path</label><input type="text" placeholder="owner/repo" className="w-full bg-zinc-800 rounded-xl p-3 border-none text-xs font-bold text-white" value={state.github?.repo || ''} onChange={e => updateGithub('repo', e.target.value)} /></div>
          <div><label className="block text-[9px] font-bold text-zinc-500 mb-1 uppercase tracking-widest flex justify-between">Access Token<button onClick={() => setShowToken(!showToken)} className="text-emerald-500 lowercase font-normal">{showToken ? 'hide' : 'show'}</button></label><input type={showToken ? "text" : "password"} placeholder="github_pat_..." className="w-full bg-zinc-800 rounded-xl p-3 border-none text-xs font-mono text-white" value={state.github?.token || ''} onChange={e => updateGithub('token', e.target.value)} /></div>
        </div>
      </section>

      <section className="pt-6 space-y-3">
        <button onClick={onLogout} className="w-full bg-white/5 border border-white/10 text-white font-black py-4 rounded-2xl text-[10px] tracking-widest active:bg-zinc-800 transition-all uppercase">Logout of Admin Session</button>
        <button onClick={handleReset} className="w-full bg-zinc-900 border border-red-500/20 text-red-500 font-black py-4 rounded-2xl text-[10px] tracking-widest active:bg-red-500 active:text-white transition-all uppercase">Factory Reset All Data</button>
        <p className="text-center text-[8px] font-bold text-zinc-700 mt-4 uppercase tracking-[4px]">FlexSheetz v2.3.0-Admin</p>
      </section>
    </div>
  );

  return (
    <div className="p-4 max-w-2xl mx-auto pb-32">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">Command <span style={{ color: COLORS.sheetzRed }}>Center</span></h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">District Administrative Settings</p>
        </div>
        {state.github?.token && (
          <button onClick={onRefresh} className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-3 py-2 rounded-lg">Refresh Cloud</button>
        )}
      </header>

      <div className="flex bg-zinc-900 p-1.5 rounded-2xl border border-white/5 mb-8 shadow-inner">
        {(['Team', 'Stores', 'General'] as SettingsSubTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
              activeSubTab === tab 
                ? 'bg-red-600 text-white shadow-lg' 
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <main>
        {activeSubTab === 'Team' && renderTeamSection()}
        {activeSubTab === 'Stores' && renderStoresSection()}
        {activeSubTab === 'General' && renderGeneralSection()}
      </main>

      {isEditingEmployee && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
           <div className="w-full max-w-xl bg-zinc-900 rounded-[2.5rem] border border-white/10 shadow-4xl overflow-y-auto max-h-[90vh] custom-scrollbar no-scrollbar pb-64">
              <div className="p-8">
                <header className="flex justify-between items-center mb-8">
                   <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">{editingEmployeeId ? 'Edit' : 'New'} <span style={{ color: COLORS.sheetzRed }}>Supervisor</span></h2>
                   <button onClick={() => setIsEditingEmployee(false)} className="text-zinc-500 hover:text-white text-xs font-black uppercase tracking-widest">Close</button>
                </header>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">Full Name</label><input className="w-full bg-zinc-800 rounded-xl p-4 border-none text-white font-bold" value={employeeFormData.name} onChange={e => setEmployeeFormData({...employeeFormData, name: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">Home Store</label><select className="w-full bg-zinc-800 rounded-xl p-4 border-none text-white font-bold" value={employeeFormData.homeStoreId} onChange={e => setEmployeeFormData({...employeeFormData, homeStoreId: e.target.value})}>{state.stores.map(s => <option key={s.id} value={s.id}>#{s.number}</option>)}</select></div>
                  </div>
                  <div><label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">Standard Shift</label><select className="w-full bg-zinc-800 rounded-xl p-4 border-none text-white font-bold" value={employeeFormData.shift} onChange={e => { const shift = e.target.value as ShiftType; setEmployeeFormData({ ...employeeFormData, shift, rotation: createUnscheduledRotation(shift) }); }}>{Object.values(ShiftType).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-3 uppercase tracking-widest">Drive Time Authorization</label>
                    <div className="grid grid-cols-3 gap-2">
                      {state.stores.map(s => {
                        const isDT = employeeFormData.driveTimeStores?.includes(s.id);
                        return (
                          <button key={s.id} onClick={() => { const current = employeeFormData.driveTimeStores || []; const next = current.includes(s.id) ? current.filter(id => id !== s.id) : [...current, s.id]; setEmployeeFormData({ ...employeeFormData, driveTimeStores: next }); }} className={`p-3 rounded-xl border text-[10px] font-black transition-all ${isDT ? 'border-red-500 bg-red-500/10 text-red-500' : 'border-white/5 bg-zinc-800 text-zinc-500'}`}>#{s.number}</button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="bg-black/40 p-6 rounded-3xl border border-white/5">
                    <div className="flex justify-between items-center mb-6">
                       <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Default Rotation</h3>
                       <div className="flex gap-1 bg-zinc-800 p-1 rounded-lg">{['week1', 'week2'].map(w => ( <button key={w} onClick={() => setActiveRotationWeek(w as any)} className={`px-4 py-1.5 text-[9px] font-black rounded-md ${activeRotationWeek === w ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500'}`}>{w.toUpperCase()}</button> )) }</div>
                    </div>
                    <div className="space-y-3">
                       {DAYS_OF_WEEK.map((day, idx) => {
                         const rot = employeeFormData.rotation?.[activeRotationWeek][idx.toString()];
                         if (!rot) return null;
                         const isWork = rot.status === DayStatus.WORK || rot.status === DayStatus.UNSCHEDULED;
                         return (
                           <div key={day} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-2xl border border-white/5">
                              <span className="w-10 text-[10px] font-black text-zinc-500">{day}</span>
                              <select className="flex-1 bg-zinc-900 border-none rounded-lg text-[10px] p-2 font-bold text-white" value={rot.status} onChange={e => { const nextRot = { ...employeeFormData.rotation! }; nextRot[activeRotationWeek][idx.toString()].status = e.target.value as DayStatus; setEmployeeFormData({ ...employeeFormData, rotation: nextRot }); }}>{Object.values(DayStatus).map(st => <option key={st} value={st}>{st}</option>)}</select>
                              {isWork && ( <input type="time" className="bg-zinc-900 border-none rounded-lg text-[10px] p-2 font-bold w-24 text-white" value={rot.startTime} onChange={e => { const nextRot = { ...employeeFormData.rotation! }; nextRot[activeRotationWeek][idx.toString()].startTime = e.target.value; const [h, m] = e.target.value.split(':').map(Number); let totalMins = h * 60 + m + 630; nextRot[activeRotationWeek][idx.toString()].endTime = `${String(Math.floor(totalMins / 60) % 24).padStart(2, '0')}:${String(totalMins % 60).padStart(2, '0')}`; setEmployeeFormData({ ...employeeFormData, rotation: nextRot }); }} /> )}
                           </div>
                         );
                       })}
                    </div>
                  </div>
                  <button onClick={handleSaveEmployee} className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-5 rounded-3xl shadow-xl transition-all active:scale-95 text-xs tracking-[4px] uppercase">Save Profile</button>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
