import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Bot,
  Brain,
  Calendar,
  ChevronDown,
  CreditCard,
  FolderKanban,
  FolderOpen,
  HelpCircle,
  Image,
  Layers,
  LayoutDashboard,
  LogOut,
  Mic,
  Megaphone,
  Settings,
  Sparkles,
  Store,
  Users,
  UserRound,
  Video,
  Zap,
} from 'lucide-react';
import { ViewType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getMyCreditWallet, CreditWallet } from '../lib/api';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { user, logout } = useAuth();
  const [wallet, setWallet] = useState<CreditWallet | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyCreditWallet()
      .then((w) => {
        if (!cancelled) setWallet(w);
      })
      .catch(() => {
        // No wallet yet (or a transient error) - the card just doesn't render, no broken placeholder shown.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const mainNav: { id: ViewType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ai-studio', label: 'AI Studio', icon: Sparkles },
    { id: 'brand-brain', label: 'Brand Brain', icon: Brain },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
  ];

  const creationNav: { id: ViewType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'video-studio', label: 'Video Studio', icon: Video },
    { id: 'image-studio', label: 'Image Studio', icon: Image },
    { id: 'voice-studio', label: 'Voice Studio', icon: Mic },
    { id: 'character-studio', label: 'Character Studio', icon: UserRound },
  ];

  const managementNav: { id: ViewType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'team', label: 'Team', icon: Users },
    { id: 'integrations', label: 'Integrations', icon: Layers },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help & Tutorial', icon: HelpCircle },
  ];

  const handleNavClick = (view: ViewType) => {
    onNavigate(view);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header & Workspace Selector */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                  Lumora
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                  OS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200">
                Acme Workspace <ChevronDown className="w-3 h-3" />
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 custom-scroll">
          {/* Main Core Navigation */}
          <div className="space-y-0.5">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* CREATION Section */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              CREATION
            </div>
            <div className="space-y-0.5">
              {creationNav.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MANAGEMENT Section */}
          <div>
            <div className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              MANAGEMENT
            </div>
            <div className="space-y-0.5">
              {managementNav.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Credit Balance & User Profile Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
          {/* Credit balance card - real wallet data, only renders once loaded */}
          {wallet && (
            <button
              onClick={() => handleNavClick('profile')}
              className="w-full text-left p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 space-y-2 hover:border-blue-300 dark:hover:border-blue-800 transition-colors"
            >
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-700 dark:text-blue-300">
                <Zap className="w-3.5 h-3.5 text-blue-600 fill-current" />
                <span>{wallet.balance === null ? 'UNLIMITED PLAN' : 'CREDITS'}</span>
              </div>
              {wallet.balance !== null && (
                <>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {wallet.balance.toLocaleString()} remaining
                  </p>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    View usage &amp; plan details
                  </p>
                </>
              )}
            </button>
          )}

          {/* User Profile */}
          <div className="flex items-center gap-2.5 p-1">
            <button
              onClick={() => handleNavClick('profile')}
              className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
              title="View profile"
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.email}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold border border-slate-200 dark:border-slate-700 shrink-0">
                  {(user?.firstName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {user ? `${user.firstName} ${user.lastName}`.trim() || user.email : 'Guest'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email ?? 'Not signed in'}</p>
              </div>
            </button>
            <button
              onClick={() => logout()}
              title="Sign out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
