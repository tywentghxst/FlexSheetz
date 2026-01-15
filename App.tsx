
import React, { useState, useEffect, useCallback } from 'react';
import { AppState, GitHubConfig } from './types';
import { INITIAL_STORES, COLORS } from './constants';
import Planner from './components/Planner';
import Locations from './components/Locations';
import Announcements from './components/Announcements';
import History from './components/History';
import Team from './components/Team';
import Settings from './components/Settings';

const LOCAL_STORAGE_KEY = 'flexsheetz_local_state';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {
      district: '42',
      darkMode: true,
      driveTimeLabel: 'Drive Time',
      stores: INITIAL_STORES,
      employees: [],
      schedule: {},
      announcements: [],
      github: { repo: '', branch: 'main', token: '', path: 'data.json' }
    };
  });

  const [activeTab, setActiveTab] = useState('Planner');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'local'>('local');
  const [lastSha, setLastSha] = useState<string | null>(null);

  // GitHub Sync: Pull
  const pullFromGitHub = useCallback(async (config: GitHubConfig) => {
    if (!config.token || !config.repo) return;
    setSyncStatus('syncing');
    try {
      const url = `https://api.github.com/repos/${config.repo}/contents/${config.path}?ref=${config.branch}`;
      const res = await fetch(url, {
        headers: { Authorization: `token ${config.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const content = JSON.parse(atob(data.content));
        setLastSha(data.sha);
        setState(prev => ({ ...content, github: prev.github })); // Keep current github config
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
      }
    } catch (e) {
      setSyncStatus('error');
    }
  }, []);

  // GitHub Sync: Push
  const pushToGitHub = useCallback(async (newState: AppState) => {
    const config = newState.github;
    if (!config?.token || !config?.repo) return;

    setSyncStatus('syncing');
    try {
      // We need the current SHA to update
      const getUrl = `https://api.github.com/repos/${config.repo}/contents/${config.path}?ref=${config.branch}`;
      const getRes = await fetch(getUrl, {
        headers: { Authorization: `token ${config.token}` }
      });
      let currentSha = lastSha;
      if (getRes.ok) {
        const getData = await getRes.json();
        currentSha = getData.sha;
      }

      const body = {
        message: `Update schedule: ${new Date().toISOString()}`,
        content: btoa(JSON.stringify(newState, null, 2)),
        branch: config.branch,
        sha: currentSha || undefined
      };

      const putRes = await fetch(`https://api.github.com/repos/${config.repo}/contents/${config.path}`, {
        method: 'PUT',
        headers: { 
          Authorization: `token ${config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (putRes.ok) {
        const putData = await putRes.ok ? await putRes.json() : null;
        if (putData) setLastSha(putData.content.sha);
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
      }
    } catch (e) {
      setSyncStatus('error');
    }
  }, [lastSha]);

  // Initial pull
  useEffect(() => {
    if (state.github?.token && state.github?.repo) {
      pullFromGitHub(state.github);
    }
  }, []);

  const updateState = (updater: (prev: AppState) => AppState) => {
    setState(prev => {
      const next = updater(prev);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      
      // Auto-push if github is configured
      if (next.github?.token && next.github?.repo) {
        pushToGitHub(next);
      }
      return next;
    });
  };

  const currentThemeClass = state.darkMode ? 'bg-black text-white' : 'bg-gray-50 text-gray-900';

  return (
    <div className={`min-h-screen flex flex-col ${currentThemeClass} transition-colors duration-300`}>
      <header className="sticky top-0 z-50 shadow-lg" style={{ backgroundColor: COLORS.sheetzRed }}>
        <div className="px-4 py-3 flex justify-between items-center">
          <h1 className="font-black text-xl tracking-tighter text-white uppercase italic">
            FLEX<span style={{ color: COLORS.sheetzGold }}>SHEETZ</span>
            <span className="ml-2 font-normal text-xs opacity-90 block sm:inline not-italic lowercase">District {state.district}</span>
          </h1>
          
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              syncStatus === 'synced' ? 'bg-emerald-400' : 
              syncStatus === 'syncing' ? 'bg-yellow-400 animate-pulse' : 
              syncStatus === 'error' ? 'bg-red-400' : 'bg-white/20'
            }`} />
            <span className="text-[9px] font-black text-white/60 uppercase tracking-widest hidden sm:block">
              {syncStatus === 'synced' ? 'Cloud Synced' : 
               syncStatus === 'syncing' ? 'Syncing...' : 
               syncStatus === 'error' ? 'Sync Error' : 'Local Only'}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 overflow-x-hidden">
        {activeTab === 'Planner' && <Planner state={state} updateState={updateState} />}
        {activeTab === 'Locations' && <Locations state={state} updateState={updateState} />}
        {activeTab === 'Announcements' && <Announcements state={state} updateState={updateState} />}
        {activeTab === 'History' && <History state={state} updateState={updateState} />}
        {activeTab === 'Team' && <Team state={state} updateState={updateState} />}
        {activeTab === 'Settings' && <Settings state={state} updateState={updateState} onRefresh={() => state.github && pullFromGitHub(state.github)} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-t border-white/10 px-2 py-2">
        <div className="flex justify-around items-center max-w-4xl mx-auto">
          {[
            { id: 'Planner', icon: '📅' },
            { id: 'Locations', icon: '📍' },
            { id: 'Announcements', icon: '📢' },
            { id: 'History', icon: '📂' },
            { id: 'Team', icon: '👥' },
            { id: 'Settings', icon: '⚙️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                activeTab === tab.id ? 'bg-white/10 text-white' : 'text-gray-500'
              }`}
            >
              <span className="text-xl mb-1">{tab.icon}</span>
              <span className="text-[10px] uppercase font-bold tracking-widest">{tab.id}</span>
              {activeTab === tab.id && (
                <div className="h-1 w-4 rounded-full mt-1" style={{ backgroundColor: COLORS.sheetzRed }} />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default App;
