
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, GitHubConfig, ChangeLog, DayStatus } from './types.ts';
import { INITIAL_STORES, COLORS } from './constants.tsx';
import Schedule from './components/Schedule.tsx';
import Locations from './components/Locations.tsx';
import Announcements from './components/Announcements.tsx';
import History from './components/History.tsx';
import Settings from './components/Settings.tsx';
import Team from './components/Team.tsx';
import { format } from 'date-fns';

const LOCAL_STORAGE_KEY = 'flexsheetz_local_state';
const AUTH_KEY = 'flexsheetz_auth_session';
const SUBSCRIPTIONS_KEY = 'flexsheetz_notifications_subs';
const TUTORIAL_KEY = 'flexsheetz_tutorial_completed';
const POLLING_INTERVAL = 3000;

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {
      district: '67',
      darkMode: true,
      defaultViewMode: 'day',
      driveTimeLabel: 'Drive Time',
      stores: INITIAL_STORES,
      employees: [],
      schedule: {},
      announcements: [],
      logs: [],
      github: { repo: '', branch: 'main', token: '', path: 'data.json' }
    };
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(AUTH_KEY) === 'true';
  });

  const [subscribedIds, setSubscribedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(SUBSCRIPTIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [showTutorial, setShowTutorial] = useState(() => {
    return !localStorage.getItem(TUTORIAL_KEY);
  });
  const [tutorialStep, setTutorialStep] = useState(0);

  const [localNotifications, setLocalNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('Schedule');
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'local'>('local');
  const [lastSha, setLastSha] = useState<string | null>(null);

  const lastLogIdRef = useRef<string | null>(null);
  
  // Refs for sync logic to prevent stale closures and conflicts
  const lastShaRef = useRef<string | null>(null);
  const isPushingRef = useRef(false);

  // Keep lastShaRef in sync with state
  useEffect(() => {
    lastShaRef.current = lastSha;
  }, [lastSha]);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const checkIfStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               window.matchMedia('(display-mode: fullscreen)').matches ||
                               (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    checkIfStandalone();
    
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkIfStandalone);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      mediaQuery.removeEventListener('change', checkIfStandalone);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      setShowInstallModal(true);
    }
  };

  const finishTutorial = () => {
    localStorage.setItem(TUTORIAL_KEY, 'true');
    setShowTutorial(false);
  };

  useEffect(() => {
    if (!state.logs || state.logs.length === 0) return;
    
    const latestLog = state.logs[state.logs.length - 1];
    if (!latestLog || !latestLog.id) return;
    
    if (latestLog.id === lastLogIdRef.current) return;
    lastLogIdRef.current = latestLog.id;

    const targetEmployee = state.employees?.find(e => 
      e.name === latestLog.userName && subscribedIds.includes(e.id)
    );

    if (targetEmployee && (latestLog.action === 'OVERRIDE' || latestLog.action === 'REVERT')) {
      const title = `Staff Alert: ${targetEmployee.name}`;
      let detailedValue = latestLog.newValue || 'Default';
      const isStoreField = latestLog.field === 'Store' || latestLog.field === 'Home Store' || latestLog.field === 'Store Assignment';
      
      if (isStoreField && latestLog.newValue) {
        const store = state.stores.find(s => s.id === latestLog.newValue || s.number === latestLog.newValue);
        detailedValue = store ? `Store #${store.number}` : latestLog.newValue;
      }

      const body = latestLog.action === 'REVERT' 
        ? `Reset to standard rotation schedule.` 
        : `${latestLog.field} updated to ${detailedValue}`;

      if (window.Notification && Notification.permission === 'granted') {
        try {
          new Notification(title, { body });
        } catch (err) {
          console.error("System notification error:", err);
        }
      }

      setLocalNotifications(prev => [
        {
          id: latestLog.id,
          title,
          body,
          timestamp: latestLog.timestamp,
          userName: latestLog.userName
        },
        ...prev
      ].slice(0, 30));
    }
  }, [state.logs, subscribedIds, state.employees, state.stores]);

  const toggleSubscription = async (id: string) => {
    if (window.Notification && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    
    setSubscribedIds(prev => {
      const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleAuthSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (passwordInput === '1234') {
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_KEY, 'true');
      setShowAuthModal(false);
      setShowSettings(true);
      setAuthError(false);
      setPasswordInput('');
    } else {
      setAuthError(true);
      setPasswordInput('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(AUTH_KEY);
    setShowSettings(false);
  };

  // Robust pull with conditional fetching and push-guard
  const pullFromGitHub = useCallback(async (config: GitHubConfig) => {
    if (!config.token || !config.repo) return;
    if (isPushingRef.current) return; // Don't pull if we are in the middle of a push to avoid reverting optimistic updates

    // Only set loading indicator if we don't have data yet to avoid flickering on poll
    if (!lastShaRef.current) setSyncStatus('syncing');

    try {
      const url = `https://api.github.com/repos/${config.repo}/contents/${config.path}?ref=${config.branch}`;
      const headers: HeadersInit = { Authorization: `token ${config.token}` };
      
      // Use ETag/SHA for conditional request to save bandwidth and redundant processing
      if (lastShaRef.current) {
        headers['If-None-Match'] = `"${lastShaRef.current}"`;
      }

      const res = await fetch(url, { headers });

      if (res.status === 304) {
        setSyncStatus('synced');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        
        // Secondary check in case 304 wasn't returned but SHA matches
        if (data.sha === lastShaRef.current) {
            setSyncStatus('synced');
            return;
        }

        const content = JSON.parse(atob(data.content));
        setLastSha(data.sha);
        
        setState(prev => ({ 
            ...content, 
            github: prev.github, // Preserve local credentials
            logs: content.logs || [] 
        }));
        setSyncStatus('synced');
      } else {
        // Silent failure on background poll is better than error flashing
        if (!lastShaRef.current) setSyncStatus('error');
      }
    } catch (e) {
      if (!lastShaRef.current) setSyncStatus('error');
    }
  }, []);

  const pushToGitHub = useCallback(async (newState: AppState) => {
    const config = newState.github;
    if (!config?.token || !config?.repo) return;
    
    isPushingRef.current = true;
    setSyncStatus('syncing');

    try {
      // 1. Get latest SHA to minimize conflicts (Optimistic Concurrency)
      const getUrl = `https://api.github.com/repos/${config.repo}/contents/${config.path}?ref=${config.branch}`;
      const getRes = await fetch(getUrl, { headers: { Authorization: `token ${config.token}` } });
      
      let currentSha = lastShaRef.current;
      if (getRes.ok) {
        const getData = await getRes.json();
        currentSha = getData.sha;
      }

      const body = { 
        message: `Cloud Sync: ${new Date().toISOString()}`, 
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
        const putData = await putRes.json();
        if (putData) setLastSha(putData.content.sha);
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
      }
    } catch (e) {
      setSyncStatus('error');
    } finally {
      isPushingRef.current = false;
    }
  }, []);

  // Setup Polling
  useEffect(() => {
    if (state.github?.token && state.github?.repo) {
        // Initial fetch
        pullFromGitHub(state.github);

        // Start polling
        const intervalId = setInterval(() => {
            pullFromGitHub(state.github!);
        }, POLLING_INTERVAL);

        return () => clearInterval(intervalId);
    }
  }, [state.github?.token, state.github?.repo, state.github?.branch, state.github?.path, pullFromGitHub]);

  const updateState = (updater: (prev: AppState) => AppState) => {
    if (!isAuthenticated) return;
    setState(prev => {
      const next = updater(prev);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      if (next.github?.token && next.github?.repo) pushToGitHub(next);
      return next;
    });
  };

  const currentThemeClass = state.darkMode ? 'bg-black text-white' : 'bg-gray-50 text-gray-900';

  const tutorialSlides = [
    {
      icon: '👋',
      title: 'Welcome to FlexSheetz',
      desc: 'Your ultimate digital command center for district scheduling and roster management.'
    },
    {
      icon: '📅',
      title: 'Smart Schedule',
      desc: 'Tap any shift in the Day or Week view to make live adjustments, add drive time, or assign stores.'
    },
    {
      icon: '🔔',
      title: 'Real-Time Alerts',
      desc: 'Go to the Team tab and subscribe to specific supervisors to get instant notifications when their schedule changes.'
    },
    {
      icon: '⚡',
      title: 'Live Sync',
      desc: 'Data syncs automatically across all devices. Everyone stays on the same page, instantly.'
    }
  ];

  return (
    <div className={`flex flex-col h-full w-full overflow-hidden ${currentThemeClass} transition-colors duration-300`}>
      {/* Redesigned Header - Edge-to-Edge, Squared, Logo Swapped Colors, Modular Action Buttons */}
      <header className="shrink-0 z-[110] bg-zinc-950 border-b border-white/5 shadow-2xl">
        <div className="p-4 sm:px-6 flex justify-between items-center w-full">
          <div className="flex flex-col">
            <h1 className="font-black text-2xl sm:text-3xl tracking-tighter text-white uppercase italic leading-none">
              <span style={{ color: COLORS.sheetzRed }}>FLEX</span>SHEETZ
            </h1>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none">
                  DISTRICT {state.district}
                </span>
                <div className={`w-1 h-1 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-400' : syncStatus === 'syncing' ? 'bg-yellow-400 animate-pulse' : syncStatus === 'error' ? 'bg-red-400' : 'bg-white/10'}`} />
              </div>
              {isAuthenticated && (
                <span className="bg-red-600/10 text-red-500 text-[7px] font-black px-1.5 py-0.5 rounded border border-red-500/20 uppercase tracking-widest leading-none">
                  ADMIN
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Actions Grid - Individual boxes for each action */}
            {!isStandalone && (
              <div className="bg-zinc-900/50 p-0.5 rounded-xl border border-white/5 shadow-lg">
                <button 
                  onClick={handleInstallClick} 
                  className="p-2.5 text-white hover:bg-white/5 rounded-lg transition-all active:scale-90 flex items-center justify-center"
                  title="Install App"
                >
                  <span className="text-base sm:text-lg leading-none">📲</span>
                </button>
              </div>
            )}
            
            <div className={`p-0.5 rounded-xl border shadow-lg transition-all ${showNotifications ? 'bg-zinc-800 border-white/20' : 'bg-zinc-900/50 border-white/5'}`}>
              <button 
                onClick={() => { setShowNotifications(!showNotifications); setShowSettings(false); }} 
                className={`p-2.5 rounded-lg transition-all relative flex items-center justify-center ${showNotifications ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
                title="Notifications"
              >
                  <span className="text-base sm:text-lg leading-none">🔔</span>
                  {localNotifications.length > 0 && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-yellow-400 rounded-full border border-zinc-900 shadow-[0_0_8px_rgba(250,204,21,0.5)]" />}
              </button>
            </div>

            <div className={`p-0.5 rounded-xl border shadow-lg transition-all ${showSettings ? 'bg-zinc-800 border-white/20' : 'bg-zinc-900/50 border-white/5'}`}>
              <button 
                onClick={() => { setShowNotifications(false); if (isAuthenticated) setShowSettings(!showSettings); else setShowAuthModal(true); }} 
                className={`p-2.5 rounded-lg transition-all flex items-center justify-center ${showSettings ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
                title={isAuthenticated ? 'Settings' : 'Login'}
              >
                <span className="text-base sm:text-lg leading-none">{isAuthenticated ? '⚙️' : '🔒'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar relative z-10">
        {showNotifications && (
          <div className="fixed inset-0 z-[200] bg-black overflow-hidden flex flex-col pt-[var(--sat)]">
             <header className="shrink-0 bg-zinc-950 border-b border-white/10 px-6 py-8 flex justify-between items-center">
                <div>
                   <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white leading-none">Alert <span className="text-red-600">Inbox</span></h2>
                   <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Personnel Updates</p>
                </div>
                <button onClick={() => setShowNotifications(false)} className="bg-white/5 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 active:scale-95 transition-all">Close</button>
             </header>
             <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-48 no-scrollbar">
                {subscribedIds.length === 0 ? (
                  <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-10 text-center my-12">
                     <div className="w-20 h-20 bg-red-600/10 rounded-3xl mx-auto mb-6 flex items-center justify-center text-4xl">🔔</div>
                     <h3 className="text-xl font-black italic uppercase tracking-tighter text-white mb-2">Enable <span className="text-red-600">Alerts</span></h3>
                     <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.15em] mb-8 leading-relaxed">Follow team members in the Team tab to see live changes.</p>
                     <button onClick={() => { setActiveTab('Team'); setShowNotifications(false); }} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-xl text-[10px] uppercase tracking-widest active:scale-95 transition-all">Go to Team Roster</button>
                  </div>
                ) : localNotifications.length > 0 ? (
                  localNotifications.map(notif => (
                    <div key={notif.id} className="bg-zinc-900 border border-white/5 p-5 rounded-3xl flex items-start gap-4 shadow-xl hover:border-red-600/30 transition-all">
                      <div className="w-10 h-10 bg-red-600/10 rounded-2xl flex items-center justify-center text-xl shrink-0">📍</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-sm font-black text-white uppercase italic truncate">{notif.userName}</h4>
                          <span className="text-[8px] font-bold text-zinc-500 uppercase shrink-0 ml-2">{format(notif.timestamp, 'h:mm a')}</span>
                        </div>
                        <p className="text-xs text-zinc-400 font-medium leading-relaxed">{notif.body}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-32 flex flex-col items-center justify-center text-center opacity-30">
                    <span className="text-6xl mb-6">📭</span>
                    <p className="text-sm font-black uppercase tracking-widest">Watching {subscribedIds.length} Team Members</p>
                    <p className="text-[9px] font-bold mt-2 uppercase tracking-widest">No recent alerts found</p>
                  </div>
                )}
             </div>
          </div>
        )}
        {showSettings ? (
          <div className="fixed inset-0 z-[200] bg-black overflow-y-auto no-scrollbar pt-[var(--sat)]">
             <Settings state={state} updateState={updateState} onRefresh={() => state.github && pullFromGitHub(state.github)} onLogout={handleLogout} />
             <div className="p-8 flex justify-center pb-64">
                <button onClick={() => setShowSettings(false)} className="w-full max-sm bg-zinc-900 text-white px-8 py-5 rounded-[2rem] font-black uppercase tracking-widest border border-white/10 active:scale-95 transition-all shadow-2xl">Return to App</button>
             </div>
          </div>
        ) : (
          <>
            {activeTab === 'Schedule' && <Schedule state={state} updateState={updateState} isAuthenticated={isAuthenticated} />}
            {activeTab === 'Team' && <Team state={state} subscribedIds={subscribedIds} toggleSubscription={toggleSubscription} />}
            {activeTab === 'Locations' && <Locations state={state} updateState={updateState} />}
            {activeTab === 'Announcements' && <Announcements state={state} updateState={updateState} isAuthenticated={isAuthenticated} />}
            {activeTab === 'History' && <History state={state} updateState={updateState} />}
          </>
        )}
      </main>

      {!showSettings && !showNotifications && (
        <nav className="shrink-0 z-40 bg-black/95 backdrop-blur-xl border-t border-white/10 px-2 py-2 pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-around items-center max-w-4xl mx-auto py-1">
            {[
              { id: 'Schedule', icon: '📅' },
              { id: 'Locations', icon: '📍' },
              { id: 'Announcements', icon: '📢' },
              { id: 'Team', icon: '👥' },
              { id: 'History', icon: '📈', label: 'Activity' }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex flex-col items-center p-2 rounded-xl transition-all ${activeTab === tab.id ? 'bg-white/10 text-white shadow-lg scale-105' : 'text-gray-500'}`}><span className="text-xl mb-1">{tab.icon}</span><span className="text-[9px] uppercase font-bold tracking-widest">{tab.label || tab.id}</span></button>
            ))}
          </div>
        </nav>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-sm bg-zinc-900 rounded-[2.5rem] border border-white/10 p-10 shadow-4xl text-center">
             <div className="w-16 h-16 bg-red-600 rounded-2xl mx-auto mb-6 flex items-center justify-center text-2xl text-white">🔒</div>
             <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white mb-2">Admin <span className="text-red-600">Login</span></h2>
             <form onSubmit={handleAuthSubmit} className="space-y-4">
                <input type="password" autoFocus value={passwordInput} onChange={(e) => { setPasswordInput(e.target.value); if (authError) setAuthError(false); }} placeholder="••••" className={`w-full bg-zinc-800 border-2 rounded-2xl p-4 text-center text-2xl font-black tracking-[0.5em] text-white focus:outline-none transition-all ${authError ? 'border-red-600' : 'border-transparent focus:border-red-600/50'}`} />
                <div className="flex gap-2 pt-4">
                  <button type="button" onClick={() => setShowAuthModal(false)} className="flex-1 bg-zinc-800 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest">Cancel</button>
                  <button type="submit" className="flex-[2] bg-red-600 text-white font-black py-4 rounded-2xl shadow-xl text-[10px] uppercase tracking-widest">Login</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {showInstallModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
          <div className="w-full max-w-md bg-zinc-900 rounded-[3rem] border border-white/10 shadow-4xl overflow-hidden animate-in zoom-in-95 duration-300">
             <div className="p-10 text-center">
               <div className="w-20 h-20 bg-red-600 rounded-3xl mx-auto mb-8 flex items-center justify-center text-3xl text-white shadow-2xl shadow-red-900/40">📲</div>
               <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white mb-3">Install <span className="text-red-600">FlexSheetz</span></h2>
               <p className="text-xs font-medium text-zinc-400 mb-8 leading-relaxed">Install for a distraction-free full screen experience.</p>
               
               <div className="text-left bg-black/40 p-6 rounded-3xl border border-white/5 space-y-4 mb-10">
                  <div className="flex items-start gap-4">
                      <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 mt-0.5">1</div>
                      <p className="text-[11px] text-zinc-300 font-medium">Tap the <span className="text-white font-black uppercase tracking-tighter">Share</span> icon at the bottom of Safari.</p>
                  </div>
                  <div className="flex items-start gap-4">
                      <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 mt-0.5">2</div>
                      <p className="text-[11px] text-zinc-300 font-medium">Select <span className="text-red-500 font-black italic uppercase tracking-tighter">"Add to Home Screen"</span> from the list.</p>
                  </div>
                  <div className="flex items-start gap-4">
                      <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 mt-0.5">3</div>
                      <p className="text-[11px] text-zinc-300 font-medium">Launch <span className="text-white font-black italic uppercase tracking-tighter">FlexSheetz</span> from your home screen.</p>
                  </div>
               </div>

               <button 
                 onClick={() => setShowInstallModal(false)}
                 className="w-full bg-red-600 text-white font-black py-5 rounded-3xl shadow-xl shadow-red-900/30 text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all"
               >
                 Dismiss
               </button>
             </div>
          </div>
        </div>
      )}

      {showTutorial && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-zinc-900 rounded-[3rem] border border-white/10 shadow-4xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-500">
            <button 
              onClick={finishTutorial}
              className="absolute top-6 right-6 text-zinc-500 hover:text-white font-black text-xs uppercase tracking-widest z-20"
            >
              Skip
            </button>

            <div className="p-10 pb-6 flex-1 flex flex-col items-center text-center">
              <div key={tutorialStep} className="animate-in slide-in-from-right-8 fade-in duration-300 flex flex-col items-center">
                <div className="w-24 h-24 bg-red-600/10 rounded-full flex items-center justify-center text-5xl mb-8 shadow-[0_0_30px_rgba(220,38,38,0.2)] border border-red-500/20">
                  {tutorialSlides[tutorialStep].icon}
                </div>
                <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white mb-4">
                  {tutorialSlides[tutorialStep].title}
                </h2>
                <p className="text-sm font-medium text-zinc-400 leading-relaxed mb-4">
                  {tutorialSlides[tutorialStep].desc}
                </p>
              </div>
            </div>

            <div className="p-8 pt-0">
              <div className="flex justify-center gap-2 mb-8">
                {tutorialSlides.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === tutorialStep ? 'w-8 bg-red-600' : 'w-2 bg-zinc-800'}`}
                  />
                ))}
              </div>

              <button 
                onClick={() => {
                  if (tutorialStep < tutorialSlides.length - 1) {
                    setTutorialStep(prev => prev + 1);
                  } else {
                    finishTutorial();
                  }
                }}
                className="w-full bg-white text-black font-black py-5 rounded-3xl shadow-xl text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all hover:bg-zinc-200"
              >
                {tutorialStep < tutorialSlides.length - 1 ? 'Next' : 'Get Started'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
