import React, { useState } from 'react';
import { Calendar, FolderOpen, Image as ImageIcon, LayoutDashboard, Menu, Mic, Sparkles, Video } from 'lucide-react';
import { ViewType } from '../types';

interface MobileNavProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  onToggleSidebar: () => void;
}

/** The studios behind the Create tab, the same three as the header's Create menu. */
const STUDIOS: { view: ViewType; label: string; icon: React.FC<{ className?: string }> }[] = [
  { view: 'image-studio', label: 'Image Studio', icon: ImageIcon },
  { view: 'video-studio', label: 'Video Studio', icon: Video },
  { view: 'voice-studio', label: 'Voice Studio', icon: Mic },
];

const tabClass = (active: boolean) =>
  `flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-medium ${
    active ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500 dark:text-slate-400'
  }`;

/** Bottom tab bar below the lg breakpoint, mirroring the phone app: Home, Create, Calendar, Gallery, Menu. Keep it to
 * screens in the sidebar - hidden screens (AI Studio, Automation, ...) must not come back through here. */
export const MobileNav: React.FC<MobileNavProps> = ({ currentView, onNavigate, onToggleSidebar }) => {
  const [showCreate, setShowCreate] = useState(false);
  const inStudio = STUDIOS.some((s) => s.view === currentView);

  const go = (view: ViewType) => {
    setShowCreate(false);
    onNavigate(view);
  };

  return (
    <>
      {showCreate && (
        <>
          <div className="lg:hidden fixed inset-0 z-30" onClick={() => setShowCreate(false)} />
          <div className="lg:hidden fixed bottom-16 left-1/2 -translate-x-1/2 z-40 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
            {STUDIOS.map(({ view, label, icon: Icon }) => (
              <button
                key={view}
                onClick={() => go(view)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 ${
                  currentView === view ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 text-blue-500" /> {label}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2">
        <button onClick={() => go('dashboard')} className={tabClass(currentView === 'dashboard')}>
          <LayoutDashboard className="w-4 h-4" />
          <span>Home</span>
        </button>

        <button
          onClick={() => setShowCreate((open) => !open)}
          aria-expanded={showCreate}
          className={tabClass(inStudio || showCreate)}
        >
          <Sparkles className="w-4 h-4" />
          <span>Create</span>
        </button>

        <button onClick={() => go('calendar')} className={tabClass(currentView === 'calendar')}>
          <Calendar className="w-4 h-4" />
          <span>Calendar</span>
        </button>

        <button onClick={() => go('media-library')} className={tabClass(currentView === 'media-library')}>
          <FolderOpen className="w-4 h-4" />
          <span>Gallery</span>
        </button>

        <button
          onClick={() => {
            setShowCreate(false);
            onToggleSidebar();
          }}
          className={tabClass(false)}
        >
          <Menu className="w-4 h-4" />
          <span>Menu</span>
        </button>
      </div>
    </>
  );
};
