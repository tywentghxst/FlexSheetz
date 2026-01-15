
import React, { useState } from 'react';
import { AppState, Announcement } from '../types';
import { generateId } from '../utils';
import { format } from 'date-fns';

interface AnnouncementsProps {
  state: AppState;
  updateState: (updater: (prev: AppState) => AppState) => void;
}

const Announcements: React.FC<AnnouncementsProps> = ({ state, updateState }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', body: '' });

  const handlePost = () => {
    if (!newPost.title || !newPost.body) return;
    updateState(prev => ({
      ...prev,
      announcements: [
        { id: generateId(), ...newPost, timestamp: Date.now() },
        ...prev.announcements
      ]
    }));
    setNewPost({ title: '', body: '' });
    setIsAdding(false);
  };

  const deletePost = (id: string) => {
    updateState(prev => ({
      ...prev,
      announcements: prev.announcements.filter(a => a.id !== id)
    }));
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black">Bulletin</h2>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">District News & Updates</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg transition-all ${isAdding ? 'bg-zinc-800 rotate-45' : 'bg-red-600'}`}
        >
          +
        </button>
      </header>

      {isAdding && (
        <div className="bg-zinc-900 p-6 rounded-3xl border border-red-500/30 mb-8 shadow-2xl animate-in slide-in-from-top duration-300">
           <input 
            className="w-full bg-transparent border-none text-xl font-black p-0 mb-4 focus:ring-0 placeholder:text-zinc-700" 
            placeholder="POST TITLE"
            value={newPost.title}
            onChange={e => setNewPost({...newPost, title: e.target.value})}
           />
           <textarea 
            className="w-full bg-transparent border-none text-sm p-0 h-32 focus:ring-0 placeholder:text-zinc-700 resize-none" 
            placeholder="Type your message here..."
            value={newPost.body}
            onChange={e => setNewPost({...newPost, body: e.target.value})}
           />
           <button 
            onClick={handlePost}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl mt-4 shadow-xl"
           >
             PUBLISH ANNOUNCEMENT
           </button>
        </div>
      )}

      <div className="space-y-6">
        {state.announcements.map(ann => (
          <div key={ann.id} className="bg-zinc-900 border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-transparent opacity-50" />
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">
                {format(ann.timestamp, 'MMM dd, yyyy • h:mm a')}
              </span>
              <button 
                onClick={() => deletePost(ann.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-red-500"
              >
                ✕
              </button>
            </div>
            <h3 className="text-xl font-black mb-2">{ann.title}</h3>
            <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">{ann.body}</p>
          </div>
        ))}

        {state.announcements.length === 0 && (
          <div className="text-center py-20 opacity-20">
            <div className="text-5xl mb-4">📌</div>
            <p className="text-sm font-bold uppercase tracking-widest">BOARD IS CLEAR</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Announcements;
