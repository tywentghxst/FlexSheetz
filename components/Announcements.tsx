
import React, { useState, useMemo } from 'react';
import { AppState, Announcement } from '../types';
import { generateId } from '../utils';
import { format } from 'date-fns';
import { COLORS } from '../constants';

interface AnnouncementsProps {
  state: AppState;
  updateState: (updater: (prev: AppState) => AppState) => void;
  isAuthenticated: boolean;
}

type AnnouncementCategory = 'URGENT' | 'SAFETY' | 'UPDATE' | 'GENERAL';

interface ExtendedAnnouncement extends Announcement {
  category?: AnnouncementCategory;
}

const Announcements: React.FC<AnnouncementsProps> = ({ state, updateState, isAuthenticated }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState<AnnouncementCategory | 'ALL'>('ALL');
  const [newPost, setNewPost] = useState<{ title: string; body: string; category: AnnouncementCategory }>({
    title: '',
    body: '',
    category: 'GENERAL'
  });

  const handlePost = () => {
    if (!isAuthenticated) return;
    if (!newPost.title || !newPost.body) return;
    updateState(prev => ({
      ...prev,
      announcements: [
        { 
          id: generateId(), 
          ...newPost, 
          timestamp: Date.now() 
        } as ExtendedAnnouncement,
        ...prev.announcements
      ]
    }));
    setNewPost({ title: '', body: '', category: 'GENERAL' });
    setIsAdding(false);
  };

  const deletePost = (id: string) => {
    if (!isAuthenticated) return;
    if (confirm('Permanently remove this announcement?')) {
      updateState(prev => ({
        ...prev,
        announcements: prev.announcements.filter(a => a.id !== id)
      }));
    }
  };

  const getCategoryStyles = (cat: AnnouncementCategory = 'GENERAL') => {
    switch (cat) {
      case 'URGENT': return { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' };
      case 'SAFETY': return { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' };
      case 'UPDATE': return { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' };
      default: return { bg: 'bg-zinc-500/10', text: 'text-zinc-500', border: 'border-zinc-500/30' };
    }
  };

  const filteredAnnouncements = useMemo(() => {
    if (filter === 'ALL') return state.announcements;
    return state.announcements.filter((ann: ExtendedAnnouncement) => (ann.category || 'GENERAL') === filter);
  }, [state.announcements, filter]);

  return (
    <div className="p-4 max-w-2xl mx-auto pb-32">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white">
            District <span style={{ color: COLORS.sheetzRed }}>Bulletin</span>
          </h2>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1">
            Communication & Strategy Hub
          </p>
        </div>
        {isAuthenticated && (
          <button 
            onClick={() => setIsAdding(true)}
            className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-2xl shadow-xl shadow-red-900/30 active:scale-95 transition-all"
          >
            <span className="text-white">+</span>
          </button>
        )}
      </header>

      {/* Filter Bar */}
      <div className="flex gap-2 overflow-x-auto pb-6 mb-2 custom-scrollbar no-scrollbar">
        {(['ALL', 'URGENT', 'SAFETY', 'UPDATE', 'GENERAL'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
              filter === cat 
                ? 'bg-white text-black border-white shadow-lg' 
                : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {filteredAnnouncements.length > 0 ? (
          filteredAnnouncements.map((ann: ExtendedAnnouncement) => {
            const styles = getCategoryStyles(ann.category);
            return (
              <div 
                key={ann.id} 
                className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group hover:bg-zinc-900/60 transition-all"
              >
                {/* Visual Accent */}
                <div className={`absolute top-0 left-0 w-2 h-full ${styles.bg}`} />
                
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter ${styles.bg} ${styles.text} border ${styles.border}`}>
                      {ann.category || 'GENERAL'}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">
                      {format(ann.timestamp, 'MMM d • h:mm a')}
                    </span>
                  </div>
                  {isAuthenticated && (
                    <button 
                      onClick={() => deletePost(ann.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/10 rounded-xl text-zinc-600 hover:text-red-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                <h3 className="text-2xl font-black italic tracking-tighter text-white mb-3 uppercase">
                  {ann.title}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                  {ann.body}
                </p>
              </div>
            );
          })
        ) : (
          <div className="py-24 flex flex-col items-center justify-center opacity-10">
            <span className="text-8xl mb-6">📭</span>
            <p className="text-sm font-black uppercase tracking-[0.3em]">No Announcements found</p>
          </div>
        )}
      </div>

      {/* Creation Modal Overlay */}
      {isAdding && isAuthenticated && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="w-full max-w-lg bg-zinc-900 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-20 duration-500">
              <div className="p-8">
                <header className="flex justify-between items-center mb-8">
                   <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">Draft <span className="text-red-600">Post</span></h2>
                   <button onClick={() => setIsAdding(false)} className="text-zinc-500 hover:text-white font-black text-[10px] uppercase tracking-widest">Cancel</button>
                </header>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Category</label>
                    <div className="flex gap-2">
                      {(['GENERAL', 'UPDATE', 'SAFETY', 'URGENT'] as const).map(cat => (
                        <button
                          key={cat}
                          onClick={() => setNewPost({...newPost, category: cat})}
                          className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all border ${
                            newPost.category === cat 
                              ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/30' 
                              : 'bg-zinc-800 border-white/5 text-zinc-500'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Subject</label>
                    <input 
                      autoFocus
                      className="w-full bg-zinc-800 border-none rounded-2xl p-4 text-sm font-bold text-white focus:ring-2 focus:ring-red-600" 
                      placeholder="E.g. District Meeting Agenda"
                      value={newPost.title}
                      onChange={e => setNewPost({...newPost, title: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Message Body</label>
                    <textarea 
                      className="w-full bg-zinc-800 border-none rounded-2xl p-4 text-sm font-medium text-white h-48 focus:ring-2 focus:ring-red-600 resize-none" 
                      placeholder="Compose your message..."
                      value={newPost.body}
                      onChange={e => setNewPost({...newPost, body: e.target.value})}
                    />
                  </div>

                  <button 
                    onClick={handlePost}
                    disabled={!newPost.title || !newPost.body}
                    className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-red-900/20 active:scale-95 transition-all text-xs tracking-[0.2em] uppercase"
                  >
                    Publish to District
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
