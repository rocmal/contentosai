import React from 'react';
import { Calendar, Home, Plus, UserRound, Video } from 'lucide-react';
import { MobileTab } from './types';

interface BottomTabBarProps {
  activeTab: MobileTab;
  onNavigate: (tab: MobileTab) => void;
  onCreate: () => void;
}

const TAB_META: { key: MobileTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'calendar', label: 'Calendar', icon: Calendar },
];
const TAB_META_RIGHT: { key: MobileTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'studio', label: 'Studio', icon: Video },
  { key: 'profile', label: 'Profile', icon: UserRound },
];

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onNavigate, onCreate }) => {
  const renderTab = (tab: MobileTab, label: string, Icon: React.FC<{ className?: string }>) => {
    const active = activeTab === tab;
    return (
      <button
        key={tab}
        onClick={() => onNavigate(tab)}
        className="flex flex-col items-center gap-[3px] py-1 px-2.5"
      >
        <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-slate-500'}`} />
        <span className={`text-[10px] font-bold ${active ? 'text-blue-600' : 'text-slate-500'}`}>{label}</span>
      </button>
    );
  };

  return (
    <div className="flex-none flex flex-col items-center bg-white border-t border-slate-900/10 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around w-full px-2 pt-2.5 pb-1">
        {TAB_META.map((t) => renderTab(t.key, t.label, t.icon))}
        <button
          onClick={onCreate}
          aria-label="Create"
          className="w-[52px] h-[52px] rounded-full bg-blue-600 flex items-center justify-center -mt-[22px] shadow-[0_3px_10px_rgba(15,23,42,0.2)]"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
        {TAB_META_RIGHT.map((t) => renderTab(t.key, t.label, t.icon))}
      </div>
    </div>
  );
};
