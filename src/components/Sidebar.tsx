import React, { useEffect, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  FolderOpen,
  HelpCircle,
  Image,
  Layers,
  LayoutDashboard,
  LogOut,
  Mic,
  Settings,
  Sparkles,
  Users,
  Video,
  Zap,
} from 'lucide-react';
import { ViewType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getMyCreditWallet, getMyOrganization, CreditWallet } from '../lib/api';
import { CHANNEL_ICON } from '../lib/channels';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  /** Desktop: folded down to an icon rail. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

type NavItem = { id: ViewType; label: string; icon: React.FC<{ className?: string }> };

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
  collapsed,
  onToggleCollapsed,
}) => {
  const { user, logout } = useAuth();
  const [wallet, setWallet] = useState<CreditWallet | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(window.localStorage.getItem('lumora.sidebarGroups') ?? '{}');
    } catch {
      return {};
    }
  });

  const toggleGroup = (key: string) =>
    setClosedGroups((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        window.localStorage.setItem('lumora.sidebarGroups', JSON.stringify(next));
      } catch {
        // Storage blocked: it just won't be remembered.
      }
      return next;
    });

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
    // Sidebar stays mounted for the whole session, so without currentView in
    // the deps this balance would go stale the moment anything changes it
    // elsewhere (e.g. a Billing checkout upgrade) - re-fetching on every
    // navigation keeps it in sync without needing a shared credits context.
  }, [currentView]);

  useEffect(() => {
    let cancelled = false;
    getMyOrganization()
      .then((org) => {
        if (!cancelled && org) setWorkspaceName(org.name);
      })
      .catch(() => {
        // No organization yet - the label just stays blank.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const mainNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
  ];

  const creationNav: NavItem[] = [
    { id: 'video-studio', label: 'Video Studio', icon: Video },
    { id: 'image-studio', label: 'Image Studio', icon: Image },
    { id: 'voice-studio', label: 'Voice Studio', icon: Mic },
    { id: 'media-library', label: 'Gallery', icon: FolderOpen },
  ];

  // Same channel icons as the Create menu, the Calendar and Ctrl+K (src/lib/channels.ts).
  const publishedNav: NavItem[] = [
    { id: 'linkedin-posts', label: 'LinkedIn Posts', icon: CHANNEL_ICON.linkedin! },
    { id: 'facebook-posts', label: 'Facebook Posts', icon: CHANNEL_ICON.facebook! },
    { id: 'youtube-posts', label: 'YouTube', icon: CHANNEL_ICON.youtube! },
  ];

  const managementNav: NavItem[] = [
    { id: 'team', label: 'Team', icon: Users },
    { id: 'integrations', label: 'Integrations', icon: Layers },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help & Tutorial', icon: HelpCircle },
  ];

  const handleNavClick = (view: ViewType) => {
    onNavigate(view);
    onCloseMobile();
  };

  const renderNavList = (items: NavItem[]) => (
    <div className="space-y-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            title={collapsed ? item.label : undefined}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              collapsed ? 'lg:justify-center lg:px-0' : ''
            } ${
              isActive
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
            <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  /** A titled group that folds up. On the icon rail there is no room for titles, so the group just stays open under a divider. */
  const renderNavGroup = (title: string, groupKey: string, items: NavItem[]) => {
    const closed = !collapsed && !!closedGroups[groupKey];
    return (
      <div key={groupKey} className={collapsed ? 'lg:border-t lg:border-slate-100 lg:dark:border-slate-800 lg:pt-3' : ''}>
        <button
          type="button"
          onClick={() => toggleGroup(groupKey)}
          aria-expanded={!closed}
          className={`w-full flex items-center justify-between px-3 mb-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300 ${
            collapsed ? 'lg:hidden' : ''
          }`}
        >
          {title}
          <ChevronDown className={`w-3 h-3 transition-transform ${closed ? '-rotate-90' : ''}`} />
        </button>
        {!closed && renderNavList(items)}
      </div>
    );
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
        className={`fixed top-0 left-0 z-50 h-screen w-64 ${collapsed ? 'lg:w-16' : ''} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header & Workspace Selector */}
        <div
          className={`p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between ${
            collapsed ? 'lg:flex-col lg:gap-3 lg:px-0' : ''
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className={collapsed ? 'lg:hidden' : ''}>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                  Lumora
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                  OS
                </span>
              </div>
              {/* No multi-workspace switching exists yet (see api.ts's
                  AuthUser comment - workspaceId is just the org's first
                  workspace) - a static label is honest, a fake dropdown
                  affordance was not. */}
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                {workspaceName ?? 'Workspace'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleCollapsed}
            title={collapsed ? 'Expand menu' : 'Collapse menu'}
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
            className="hidden lg:inline-flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Sections */}
        <div className={`flex-1 overflow-y-auto px-3 py-3 ${collapsed ? 'lg:px-2' : ''} space-y-4 custom-scroll`}>
          {renderNavList(mainNav)}
          {renderNavGroup('CREATION', 'creation', creationNav)}
          {renderNavGroup('PUBLISHED', 'published', publishedNav)}
          {renderNavGroup('MANAGEMENT', 'management', managementNav)}
        </div>

        {/* Credit Balance & User Profile Footer */}
        <div className={`p-3 border-t border-slate-100 dark:border-slate-800 space-y-3 ${collapsed ? 'lg:px-2' : ''}`}>
          {/* Credit balance card - real wallet data, only renders once loaded */}
          {wallet && (
            <button
              onClick={() => handleNavClick('profile')}
              title={collapsed ? 'Credits, usage & plan' : undefined}
              className={`w-full text-left p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 space-y-2 hover:border-blue-300 dark:hover:border-blue-800 transition-colors ${
                collapsed ? 'lg:px-0 lg:flex lg:justify-center' : ''
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-700 dark:text-blue-300">
                <Zap className="w-3.5 h-3.5 text-blue-600 fill-current" />
                <span className={collapsed ? 'lg:hidden' : ''}>{wallet.balance === null ? 'UNLIMITED PLAN' : 'CREDITS'}</span>
              </div>
              {wallet.balance !== null && (
                <div className={collapsed ? 'lg:hidden' : ''}>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {wallet.balance.toLocaleString()} remaining
                  </p>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    View usage &amp; plan details
                  </p>
                </div>
              )}
            </button>
          )}

          {/* User Profile */}
          <div className={`flex items-center gap-2.5 p-1 ${collapsed ? 'lg:flex-col' : ''}`}>
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
              <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
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
