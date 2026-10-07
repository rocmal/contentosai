import React, { useState } from 'react';
import {
  Bell,
  BellOff,
  ChevronDown,
  HelpCircle,
  Image as ImageIcon,
  Mic,
  Moon,
  Search,
  Sparkles,
  Sun,
  Video,
} from 'lucide-react';
import { ThemeMode, ViewType } from '../types';
import { AuthUser } from '../lib/api';

interface HeaderProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenCommandPalette: () => void;
  onStartTour?: () => void;
  user: AuthUser | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  theme,
  onToggleTheme,
  onOpenCommandPalette,
  onStartTour,
  user,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  // The shortcut is Cmd+K on a Mac and Ctrl+K everywhere else.
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform);

  const viewTitles: Record<ViewType, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Dashboard',
      subtitle: 'What you have made, what it cost, and where to start next.',
    },
    'ai-studio': {
      title: 'AI Studio Wizard',
      subtitle: '6-Step zero-prompt content generation engine.',
    },
    projects: {
      title: 'Projects',
      subtitle: 'Manage and organize your multi-channel content initiatives.',
    },
    campaigns: {
      title: 'Campaigns',
      subtitle: 'Track cross-platform campaigns, goals, and target reach.',
    },
    calendar: {
      title: 'Content Calendar',
      subtitle: 'See your scheduled and published posts across Facebook, Instagram, LinkedIn and YouTube.',
    },
    'video-studio': {
      title: 'Video Studio',
      subtitle: 'Make a short video from a prompt or template, add narration and text, then download or schedule it.',
    },
    'image-studio': {
      title: 'Image Studio',
      subtitle: 'Describe a picture and get the right size for each platform you post to.',
    },
    'voice-studio': {
      title: 'Voice Studio',
      subtitle: 'Turn a script into a voiceover in Hindi, Punjabi or English, or use your own recorded voice.',
    },
    'character-studio': {
      title: 'Character Studio',
      subtitle: 'Upload a photo, add a script and voice, get a talking-avatar video.',
    },
    'brand-brain': {
      title: 'Brand Brain Memory',
      subtitle: 'Your central brand knowledge base used across all AI generations.',
    },
    'media-library': {
      title: 'Gallery',
      subtitle: 'Your creations and your team - rename, download, or start again from any of them.',
    },
    automation: {
      title: 'Automation Builder',
      subtitle: 'n8n-inspired visual workflow orchestrator for 10x distribution.',
    },
    'ai-agents': {
      title: 'AI Agents Fleet',
      subtitle: '10 Specialized autonomous agents executing research, drafting & SEO.',
    },
    analytics: {
      title: 'Analytics Overview',
      subtitle: 'Executive insights, engagement scores, CTR & AI strategy recommendations.',
    },
    marketplace: {
      title: 'Marketplace Packs',
      subtitle: '1-Click industry content packs for B2B, E-commerce, Real Estate & Healthcare.',
    },
    team: {
      title: 'Team',
      subtitle: 'Invite teammates and manage who can do what in your workspace.',
    },
    integrations: {
      title: 'Integrations',
      subtitle: 'Connect the social accounts you publish to.',
    },
    billing: {
      title: 'Billing & Credits',
      subtitle: 'Your plan, your credits, and renewing or upgrading.',
    },
    settings: {
      title: 'Settings',
      subtitle: 'Theme and workspace details.',
    },
    profile: {
      title: 'Profile',
      subtitle: 'Your account details and plan usage.',
    },
    help: {
      title: 'Help Center',
      subtitle: 'Step-by-step guides and answers to common questions.',
    },
  };

  const currentInfo = viewTitles[currentView] || {
    title: 'Lumora OS',
    subtitle: 'AI-Powered Content Operating System',
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 md:px-8 flex items-center justify-between transition-colors">
      {/* Title & Subtitle */}
      <div className="flex items-center gap-3 min-w-0">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white truncate tracking-tight">
            {currentInfo.title}
          </h1>
          <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 truncate">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 transition-all"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span>Search or type command...</span>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 font-mono shadow-xs">
            {isMac ? '⌘K' : 'Ctrl K'}
          </kbd>
        </button>

        {/* Quick Search Button (Mobile) */}
        <button
          onClick={onOpenCommandPalette}
          className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Dark/Light Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* Help & Guided Tour Trigger Button */}
        <button
          onClick={() => {
            if (onStartTour) {
              onStartTour();
            } else {
              onNavigate('help');
            }
          }}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Help Center & Guided Tour"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  Notifications
                </span>
              </div>

              {/* No notifications backend exists yet - an honest empty state
                  beats fabricated activity that never reflects anything real. */}
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <BellOff className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                <p className="text-[11px] text-slate-400">You're all caught up.</p>
              </div>
            </div>
          )}
        </div>

        {/* Create menu: pick a studio */}
        <div className="relative">
          <button
            onClick={() => setShowCreateMenu((open) => !open)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition-all hover:shadow-md active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Create</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showCreateMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowCreateMenu(false)} />
              <div className="absolute right-0 mt-2 w-52 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                {[
                  { view: 'image-studio' as ViewType, label: 'Image', icon: ImageIcon },
                  { view: 'video-studio' as ViewType, label: 'Video', icon: Video },
                  { view: 'voice-studio' as ViewType, label: 'Voiceover', icon: Mic },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.view}
                      onClick={() => {
                        setShowCreateMenu(false);
                        onNavigate(item.view);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Icon className="w-4 h-4 text-blue-500" /> Create {item.label.toLowerCase()}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
