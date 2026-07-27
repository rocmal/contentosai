import React from 'react';
import { Calendar, LayoutDashboard, Menu, Sparkles, Video, Zap } from 'lucide-react';
import { ViewType } from '../types';

interface MobileNavProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  onToggleSidebar: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentView,
  onNavigate,
  onToggleSidebar,
}) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2">
      <button
        onClick={() => onNavigate('dashboard')}
        className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-medium ${
          currentView === 'dashboard'
            ? 'text-blue-600 dark:text-blue-400 font-bold'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <LayoutDashboard className="w-4 h-4" />
        <span>Home</span>
      </button>

      <button
        onClick={() => onNavigate('ai-studio')}
        className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-medium ${
          currentView === 'ai-studio'
            ? 'text-blue-600 dark:text-blue-400 font-bold'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <Sparkles className="w-4 h-4" />
        <span>Wizard</span>
      </button>

      <button
        onClick={() => onNavigate('calendar')}
        className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-medium ${
          currentView === 'calendar'
            ? 'text-blue-600 dark:text-blue-400 font-bold'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <Calendar className="w-4 h-4" />
        <span>Calendar</span>
      </button>

      <button
        onClick={() => onNavigate('automation')}
        className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-medium ${
          currentView === 'automation'
            ? 'text-blue-600 dark:text-blue-400 font-bold'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        <Zap className="w-4 h-4" />
        <span>Automation</span>
      </button>

      <button
        onClick={onToggleSidebar}
        className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[10px] font-medium text-slate-500 dark:text-slate-400"
      >
        <Menu className="w-4 h-4" />
        <span>Menu</span>
      </button>
    </div>
  );
};
