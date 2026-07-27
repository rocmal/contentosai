import React, { useState } from 'react';
import { Download, FolderOpen, Image, Mic, Plus, Search, Trash2, Video } from 'lucide-react';
import { ViewType } from '../../types';

interface MediaLibraryViewProps {
  onNavigate: (view: ViewType) => void;
}

export const MediaLibraryView: React.FC<MediaLibraryViewProps> = ({ onNavigate }) => {
  const [filter, setFilter] = useState<'all' | 'images' | 'videos' | 'audio'>('all');

  const assets = [
    {
      id: 'm1',
      title: 'Lumora 3D Dashboard Render.png',
      type: 'images',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      size: '2.4 MB',
      date: 'Jul 27, 2026',
    },
    {
      id: 'm2',
      title: 'Product Launch Hook B-Roll.mp4',
      type: 'videos',
      url: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&auto=format&fit=crop&q=80',
      size: '18.5 MB',
      date: 'Jul 26, 2026',
    },
    {
      id: 'm3',
      title: 'Tech Founder Voice Over Clone.wav',
      type: 'audio',
      url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&auto=format&fit=crop&q=80',
      size: '4.1 MB',
      date: 'Jul 25, 2026',
    },
  ];

  const filtered = filter === 'all' ? assets : assets.filter((a) => a.type === filter);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400">
              <FolderOpen className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Brand Media Library
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Central storage for generated images, video B-roll clips, vocal clones, and brand assets.
          </p>
        </div>

        <button
          onClick={() => alert('File upload dialog opened!')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm"
        >
          <Plus className="w-4 h-4" /> Upload Asset
        </button>
      </div>

      <div className="flex gap-2">
        {['all', 'images', 'videos', 'audio'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize border transition-all ${
              filter === f
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map((asset) => (
          <div
            key={asset.id}
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs group"
          >
            <div className="aspect-video rounded-xl bg-slate-950 overflow-hidden relative">
              <img src={asset.url} alt={asset.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                {asset.title}
              </p>
              <span className="text-[10px] text-slate-400">{asset.size}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
