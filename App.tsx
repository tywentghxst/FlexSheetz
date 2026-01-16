
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, GitHubConfig, ChangeLog, DayStatus } from './types';
import { INITIAL_STORES, COLORS } from './constants';
import Schedule from './components/Schedule';
import Locations from './components/Locations';
import Announcements from './components/Announcements';
import History from './components/History';
import Settings from './components/Settings';
import Team from './components/Team';
import { format } from 'date-fns';

const LOCAL_STORAGE_KEY = 'flexsheetz_local_state';
const AUTH_KEY = 'flexsheetz_auth_session';
const SUBSCRIPTIONS_KEY = 'flexsheetz_notifications_subs';

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

  const [localNotifications, setLocalNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('Schedule');
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'local'>('local');
  const [lastSha, setLastSha] = useState<string | null>(null);

  const lastLogIdRef = useRef<string | null>(state.logs?.[state.logs.length - 1]?.id || null);

  useEffect(() => {
    if (!state.logs || state.logs.length === 0) return;
    
    const latestLog = state.logs[state.logs.length - 1];
    if (latestLog.id !== lastLogIdRef.current) {
      const subscribedEmp = state.employees.find(e => e.name === latestLog.userName && subscribedIds.includes(e.id));
      const isSignificantChange = latestLog.newValue !== DayStatus.UNSCHEDULED;

      if (subscribedEmp && (latestLog.action === 'OVERRIDE' || latestLog.action === 'REVERT') && isSignificantChange) {
        const title = `Schedule Update: ${subscribedEmp.name}`;
        const body = `${latestLog.field}: ${latestLog.newValue}`;
        
        if (Notification.permission === 'granted') {
          new Notification(title, { body, icon: '/favicon.ico' });
        }

        setLocalNotifications(prev => [{
          id: latestLog.id,
          title,
          body,
          timestamp: latestLog.timestamp,
          empId: subscribedEmp.id
        }, ...prev]);
      }
      lastLogIdRef.current = latestLog.id;
    }
  }, [state.logs, subscribedIds, state.employees]);

  const toggleSubscription = (id: string) => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setSubscribedIds(prev => {
      const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(next));
      return next;
    });
  };

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
                               (window.navigator as any).standalone === true ||
                               document.referrer.includes('android-app://');
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
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Fallback for iOS or browsers that don't support the prompt
      setShowInstallModal(true);
    }
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
        setState(prev => ({ 
          ...content, 
          github: prev.github,
          logs: content.logs || [] 
        }));
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
      }
    } catch (e) {
      setSyncStatus('error');
    }
  }, []);

  const pushToGitHub = useCallback(async (newState: AppState) => {
    const config = newState.github;
    if (!config?.token || !config?.repo) return;

    setSyncStatus('syncing');
    try {
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
        message: `Update: ${new Date().toISOString()}`,
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

  useEffect(() => {
    if (state.github?.token && state.github?.repo) {
      pullFromGitHub(state.github);
    }
  }, []);

  const updateState = (updater: (prev: AppState) => AppState) => {
    if (!isAuthenticated) return;
    setState(prev => {
      const next = updater(prev);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      if (next.github?.token && next.github?.repo) {
        pushToGitHub(next);
      }
      return next;
    });
  };

  const currentThemeClass = state.darkMode ? 'bg-black text-white' : 'bg-gray-50 text-gray-900';

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  return (
    <div className={`min-h-screen flex flex-col ${currentThemeClass} transition-colors duration-300`}>
      <header className="sticky top-0 z-[60] shadow-xl" style={{ backgroundColor: COLORS.sheetzRed }}>
        <div className="px-4 py-4 flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="font-black text-2xl tracking-tighter text-white uppercase italic leading-none">
              FLEX<span style={{ color: COLORS.sheetzGold }}>SHEETZ</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">District</span>
                <span className="text-lg font-black italic text-white leading-none tracking-tighter" style={{ color: COLORS.sheetzGold }}>{state.district}</span>
              </div>
              {isAuthenticated && (
                <span className="bg-white/20 text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-white/20 animate-pulse uppercase tracking-widest">
                  ADMIN
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full mr-1 ${
                syncStatus === 'synced' ? 'bg-emerald-400' : 
                syncStatus === 'syncing' ? 'bg-yellow-400 animate-pulse' : 
                syncStatus === 'error' ? 'bg-red-400' : 'bg-white/20'
            }`} />

            {!isStandalone && (
              <button 
                onClick={handleInstallClick}
                className="bg-white/10 text-white p-2.5 rounded-xl border border-white/20 flex items-center gap-2 hover:bg-white/20 transition-all active:scale-95 shadow-lg group relative"
              >
                <span className="text-xl">📲</span>
              </button>
            )}

            <button 
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowSettings(false);
              }}
              className={`p-2.5 rounded-xl transition-all relative ${showNotifications ? 'bg-white text-red-600 shadow-inner' : 'bg-white/10 text-white hover:bg-white/20'}`}
              aria-label="Notifications"
            >
              <span className="text-xl">🔔</span>
              {localNotifications.length > 0 && (
                <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full border-2 border-red-600 animate-pulse" />
              )}
            </button>

            <button 
              onClick={() => {
                setShowNotifications(false);
                if (isAuthenticated) {
                  setShowSettings(!showSettings);
                } else {
                  setShowAuthModal(true);
                }
              }}
              className={`p-2.5 rounded-xl transition-all ${showSettings ? 'bg-white text-red-600 shadow-inner' : 'bg-white/10 text-white hover:bg-white/20'}`}
              aria-label="Settings"
            >
              <span className="text-xl">{isAuthenticated ? '⚙️' : '🔒'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 overflow-x-hidden relative">
        {showNotifications && (
          <div className="absolute inset-0 z-[55] bg-black/95 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300 overflow-y-auto">
             <div className="p-8 max-w-lg mx-auto pb-32">
                <header className="flex justify-between items-center mb-10">
                   <div>
                     <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">Alert <span className="text-red-600">Inbox</span></h2>
                     <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Recent Schedule Changes</p>
                   </div>
                   <button onClick={() => setShowNotifications(false)} className="text-zinc-500 hover:text-white font-black text-[10px] uppercase tracking-widest">Close</button>
                </header>
                
                <div className="space-y-4">
                  {subscribedIds.length === 0 ? (
                    <div className="animate-in zoom-in-95 duration-500 bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-10 text-center">
                       <div className="w-20 h-20 bg-red-600/10 rounded-3xl mx-auto mb-6 flex items-center justify-center text-4xl">
                         🔔
                       </div>
                       <h3 className="text-xl font-black italic uppercase tracking-tighter text-white mb-2">Enable <span className="text-red-600">Alerts</span></h3>
                       <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.15em] mb-8 leading-relaxed">
                         Follow team members to receive real-time schedule updates.
                       </p>
                       
                       <div className="space-y-4 text-left mb-10">
                         <div className="flex items-start gap-4">
                           <div className="w-6 h-6 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                           <p className="text-[11px] font-bold text-zinc-400">Navigate to the <span className="text-white font-black">TEAM</span> tab below.</p>
                         </div>
                         <div className="flex items-start gap-4">
                           <div className="w-6 h-6 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                           <p className="text-[11px] font-bold text-zinc-400">Tap the <span className="text-red-500 font-black italic">"🔔 ALERTS"</span> button at the top.</p>
                         </div>
                         <div className="flex items-start gap-4">
                           <div className="w-6 h-6 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                           <p className="text-[11px] font-bold text-zinc-400">Select the supervisors you want to follow.</p>
                         </div>
                       </div>

                       <button 
                         onClick={() => { setActiveTab('Team'); setShowNotifications(false); }}
                         className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-red-900/20 text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                       >
                         Go to Team Roster
                       </button>
                    </div>
                  ) : localNotifications.length > 0 ? (
                    localNotifications.map(notif => (
                      <div key={notif.id} className="bg-zinc-900 border border-red-500/10 p-5 rounded-3xl flex items-start gap-4 shadow-xl animate-in slide-in-from-left-4 duration-300">
                         <div className="w-10 h-10 bg-red-600/10 rounded-2xl flex items-center justify-center text-xl shrink-0">
                           🔔
                         </div>
                         <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <h4 className="text-sm font-black text-white uppercase italic">{notif.title}</h4>
                              <span className="text-[8px] font-bold text-zinc-500 uppercase">{format(notif.timestamp, 'h:mm a')}</span>
                            </div>
                            <p className="text-xs text-zinc-400 font-medium">{notif.body}</p>
                         </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-32 flex flex-col items-center justify-center text-center opacity-30">
                       <span className="text-6xl mb-6">📭</span>
                       <p className="text-sm font-black uppercase tracking-widest">Watching {subscribedIds.length} Team Members</p>
                       <p className="text-[10px] font-bold uppercase tracking-widest mt-2">No new changes recorded</p>
                    </div>
                  )}
                </div>
             </div>
          </div>
        )}

        {showSettings ? (
          <div className="absolute inset-0 z-[55] bg-inherit animate-in fade-in slide-in-from-top-4 duration-300 overflow-y-auto">
             <Settings state={state} updateState={updateState} onRefresh={() => state.github && pullFromGitHub(state.github)} onLogout={handleLogout} />
             <div className="p-4 flex justify-center pb-20">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="bg-zinc-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest border border-white/5 active:scale-95 transition-all"
                >
                  Close Settings
                </button>
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
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-t border-white/10 px-2 py-2">
          <div className="flex justify-around items-center max-w-4xl mx-auto">
            {[
              { id: 'Schedule', icon: '📅' },
              { id: 'Locations', icon: '📍' },
              { id: 'Announcements', icon: '📢' },
              { id: 'Team', icon: '👥' },
              { id: 'History', icon: '📈', label: 'Activity' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center p-2 rounded-xl transition-all ${
                  activeTab === tab.id ? 'bg-white/10 text-white' : 'text-gray-500'
                }`}
              >
                <span className="text-xl mb-1">{tab.icon}</span>
                <span className="text-[9px] uppercase font-bold tracking-widest">{tab.label || tab.id}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-zinc-900 rounded-[2.5rem] border border-white/10 p-8 shadow-2xl text-center">
             <div className="w-16 h-16 bg-red-600 rounded-2xl mx-auto mb-6 flex items-center justify-center text-2xl text-white">
                🔒
             </div>
             <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white mb-2">Admin <span className="text-red-600">Login</span></h2>
             <form onSubmit={handleAuthSubmit} className="space-y-4">
                <input 
                  type="password"
                  autoFocus
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (authError) setAuthError(false);
                  }}
                  placeholder="Enter Password"
                  className={`w-full bg-zinc-800 border-2 rounded-2xl p-4 text-center text-xl font-black tracking-[0.5em] text-white focus:outline-none transition-all ${
                    authError ? 'border-red-600' : 'border-transparent focus:border-red-600/50'
                  }`}
                />
                <div className="flex gap-2 pt-4">
                  <button type="button" onClick={() => setShowAuthModal(false)} className="flex-1 bg-zinc-800 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest">Cancel</button>
                  <button type="submit" className="flex-[2] bg-red-600 text-white font-black py-4 rounded-2xl shadow-xl text-xs uppercase tracking-widest">Authenticate</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Install Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-zinc-900 rounded-t-[3rem] sm:rounded-[3rem] border border-white/10 p-10 shadow-2xl text-center animate-in slide-in-from-bottom-20 duration-500">
             <div className="w-24 h-24 bg-red-600 rounded-3xl mx-auto mb-8 flex items-center justify-center text-4xl text-white shadow-2xl shadow-red-900/40">
                📲
             </div>
             <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white mb-4">Add to <span className="text-red-600">Home Screen</span></h2>
             <p className="text-sm font-medium text-zinc-400 mb-10 leading-relaxed px-4">
                Install FlexSheetz on your device for the best experience. Access your schedule with a single tap, even when offline.
             </p>
             
             <div className="space-y-6 text-left mb-10">
                {isIOS ? (
                  <>
                    <div className="flex items-start gap-4 p-4 bg-zinc-800/50 rounded-2xl border border-white/5">
                      <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center font-black text-xs shrink-0">1</div>
                      <p className="text-xs font-bold text-zinc-200">Tap the <span className="text-blue-500 font-black">Share</span> icon in the bottom browser bar.</p>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-zinc-800/50 rounded-2xl border border-white/5">
                      <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center font-black text-xs shrink-0">2</div>
                      <p className="text-xs font-bold text-zinc-200">Scroll down and select <span className="text-white font-black">"Add to Home Screen"</span>.</p>
                    </div>
                  </>
                ) : (
                  <div className="p-6 bg-zinc-800/50 rounded-2xl border border-white/5 text-center">
                    <p className="text-xs font-bold text-zinc-400">Open your browser menu (usually three dots) and select <span className="text-white font-black">"Install App"</span> or <span className="text-white font-black">"Add to Home Screen"</span>.</p>
                  </div>
                )}
             </div>

             <button 
               onClick={() => setShowInstallModal(false)}
               className="w-full bg-red-600 text-white font-black py-5 rounded-3xl shadow-xl text-xs uppercase tracking-[0.2em] active:scale-95 transition-all"
             >
               Got it
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
