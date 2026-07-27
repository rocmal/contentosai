import React, { useState } from 'react';
import {
  Bell,
  Check,
  Command,
  HelpCircle,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { ThemeMode, ViewType } from '../types';

interface HeaderProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenCommandPalette: () => void;
  onQuickGenerate: () => void;
  onStartTour?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  theme,
  onToggleTheme,
  onOpenCommandPalette,
  onQuickGenerate,
  onStartTour,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  const viewTitles: Record<ViewType, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Welcome back, Alex. Here is your content performance overview.',
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
      subtitle: 'Plan, schedule, review, and auto-publish across all channels.',
    },
    'video-studio': {
      title: 'Video Studio',
      subtitle: 'Script, scene edit, add voiceovers, AI B-roll & generate thumbnails.',
    },
    'image-studio': {
      title: 'Image Studio',
      subtitle: 'AI image generation, upscaling, background removal & magic resize.',
    },
    'voice-studio': {
      title: 'Voice Studio',
      subtitle: 'Voice library, custom vocal cloning, and emotive voiceover generator.',
    },
    'brand-brain': {
      title: 'Brand Brain Memory',
      subtitle: 'Your central brand knowledge base used across all AI generations.',
    },
    'media-library': {
      title: 'Media Library',
      subtitle: 'Central repository for logos, images, audio, videos, and brand kits.',
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
      title: 'Team & Collaboration',
      subtitle: 'Manage team members, role permissions, and review approvals.',
    },
    integrations: {
      title: 'Integrations & API Keys',
      subtitle: 'Connect AI models, social channels, webhooks & storage providers.',
    },
    billing: {
      title: 'Billing & AI Credits',
      subtitle: 'Manage workspace plan, credit consumption, and invoices.',
    },
    settings: {
      title: 'Workspace Settings',
      subtitle: 'Configure workspace preferences, security, and defaults.',
    },
    help: {
      title: 'Help Center & Tutorials',
      subtitle: 'Video guides, platform walkthroughs, and FAQ support.',
    },
  };

  const currentInfo = viewTitles[currentView] || {
    title: 'Lumora OS',
    subtitle: 'AI-Powered Content Operating System',
  };

  const notifications = [
    {
      id: 'n1',
      title: 'Campaign Goals Reached',
      desc: 'Q3 Enterprise AI Launch hit 800K impressions!',
      time: '10m ago',
      unread: true,
    },
    {
      id: 'n2',
      title: 'New AI Insight Available',
      desc: 'LinkedIn engagement is +24% higher on video posts this week.',
      time: '1h ago',
      unread: true,
    },
    {
      id: 'n3',
      title: 'Automated Post Published',
      desc: 'LinkedIn post published successfully by Publishing Agent.',
      time: '3h ago',
      unread: true,
    },
  ];

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
            ⌘K
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
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => setUnreadCount(0)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-400">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {n.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Create AI Content Button */}
        <button
          onClick={onQuickGenerate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition-all hover:shadow-md active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Create Content</span>
        </button>
      </div>
    </header>
  );
};
