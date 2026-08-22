import React, { useEffect, useState } from 'react';
import { Bookmark, Calendar, Loader2, Sparkles, Video, Zap } from 'lucide-react';
import * as api from '../lib/api';
import { MobilePost, MobileTab } from './types';
import { platformLabel, platformTagClasses, statusClasses, statusLabel } from './postDisplay';
import { generationTypeLabel, relativeTimeShort } from './mediaDisplay';
import { NOTIFICATION_BELL_ICON } from './notificationDisplay';

interface HomeTabProps {
  firstName: string;
  workspaceName: string;
  wallet: api.CreditWallet | null;
  posts: MobilePost[];
  postsLoading: boolean;
  todayKey: string;
  unreadNotifications: number;
  onOpenNotifications: () => void;
  onOpenCreate: () => void;
  onNavigateTab: (tab: MobileTab) => void;
  onOpenPost: (post: MobilePost) => void;
}

function greetingWord(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function generationTitle(asset: api.MediaAsset): string {
  const raw = asset.prompt?.trim() || asset.fileName;
  return raw.length > 42 ? `${raw.slice(0, 42)}…` : raw;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  firstName,
  workspaceName,
  wallet,
  posts,
  postsLoading,
  todayKey,
  unreadNotifications,
  onOpenNotifications,
  onOpenCreate,
  onNavigateTab,
  onOpenPost,
}) => {
  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const scheduledCount = posts.filter((p) => p.status === 'scheduled').length;
  const todaysQueue = posts.filter((p) => p.dateKey === todayKey).slice(0, 3);

  // Home-tab-local (not needed by any other screen), so fetched here rather
  // than lifted into MobileApp - same reasoning as CalendarTab's local
  // `selected` day state. One request covers both the recent-generations
  // strip and the "Generations" stat's total count.
  const [recentGenerations, setRecentGenerations] = useState<api.MediaAsset[]>([]);
  const [generationsTotal, setGenerationsTotal] = useState<number | null>(null);
  const [generationsLoading, setGenerationsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getMyGalleryPage({ limit: 6 })
      .then((result) => {
        if (cancelled) return;
        setRecentGenerations(result.items);
        setGenerationsTotal(result.meta.totalItems);
      })
      .catch(() => {
        // Gallery couldn't load - the stat card falls back to "-" and the
        // strip below just shows its own empty state.
      })
      .finally(() => {
        if (!cancelled) setGenerationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const quickActions = [
    { label: 'AI Wizard', sub: 'Zero-prompt generator', icon: Sparkles, bg: 'bg-blue-50', color: 'text-blue-700', onSelect: onOpenCreate },
    { label: 'Video Studio', sub: 'Scripts & B-roll', icon: Video, bg: 'bg-emerald-50', color: 'text-emerald-600', onSelect: () => onNavigateTab('studio') },
    { label: 'Calendar', sub: 'Queue & schedule', icon: Calendar, bg: 'bg-blue-100', color: 'text-blue-700', onSelect: () => onNavigateTab('calendar') },
    { label: 'Brand Brain', sub: 'Brand memory', icon: Bookmark, bg: 'bg-slate-50', color: 'text-slate-600', onSelect: () => onNavigateTab('profile') },
  ];

  const statCards = [
    {
      label: 'Generations',
      value: generationsTotal === null ? '—' : generationsTotal.toLocaleString(),
      sub: 'all time',
      icon: Sparkles,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
    },
    { label: 'Published', value: String(publishedCount), sub: `${scheduledCount} scheduled`, icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    {
      label: 'Credits',
      value: wallet ? (wallet.balance === null ? 'Unlimited' : wallet.balance.toLocaleString()) : '—',
      sub: wallet?.balance === null ? 'plan' : 'remaining',
      icon: Zap,
      color: 'text-blue-700',
      bg: 'bg-blue-100',
    },
  ];

  return (
    <div className="px-5 pt-3.5 pb-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs text-slate-500 m-0">{workspaceName}</p>
          <h1 className="font-display text-[21px] text-slate-900 mt-0.5">
            {greetingWord()}, {firstName}
          </h1>
        </div>
        <button
          onClick={onOpenNotifications}
          aria-label="Notifications"
          className="relative w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-none"
        >
          {NOTIFICATION_BELL_ICON}
          {unreadNotifications > 0 && (
            <div className="absolute top-[7px] right-2 w-2 h-2 rounded-full bg-blue-600 border-[1.5px] border-white" />
          )}
        </button>
      </div>

      <div className="bg-blue-950 rounded-3xl p-5 mb-5 relative overflow-hidden">
        <div className="absolute -top-[30px] -right-[30px] w-[120px] h-[120px] rounded-full bg-white/[0.08]" />
        <div className="relative flex flex-col gap-2.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide uppercase text-blue-300">
            <Sparkles className="w-3.5 h-3.5" /> AI Wizard
          </span>
          <h2 className="font-display text-[19px] leading-tight text-white">Create your next post in minutes</h2>
          <button
            onClick={onOpenCreate}
            className="self-start mt-0.5 px-4.5 py-2.5 rounded-full bg-white text-blue-950 font-display text-[13px]"
          >
            Start creating
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {quickActions.map((qa) => (
          <button
            key={qa.label}
            onClick={qa.onSelect}
            className="flex flex-col items-start gap-2 p-3.5 rounded-[18px] bg-slate-100 text-left"
          >
            <div className={`w-[34px] h-[34px] rounded-xl flex items-center justify-center ${qa.bg}`}>
              <qa.icon className={`w-[17px] h-[17px] ${qa.color}`} />
            </div>
            <span className="text-[12.5px] font-bold text-slate-900">{qa.label}</span>
            <span className="text-[10.5px] text-slate-500 -mt-1.5">{qa.sub}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1 mb-[22px]">
        {statCards.map((c) => (
          <div key={c.label} className="flex-none min-w-[118px] p-3.5 rounded-2xl bg-slate-100">
            <div className={`w-7 h-7 rounded-[10px] flex items-center justify-center mb-2 ${c.bg}`}>
              <c.icon className={`w-[15px] h-[15px] ${c.color}`} />
            </div>
            <div className="font-display text-[19px] text-slate-900">{c.value}</div>
            <div className="text-[10.5px] text-slate-600 font-semibold">{c.label}</div>
            <div className="text-[10px] text-slate-500">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-sm font-bold text-slate-900 m-0">Today's Queue</h3>
        <button onClick={() => onNavigateTab('calendar')} className="text-[11.5px] font-bold text-blue-700">
          Calendar
        </button>
      </div>
      <div className="flex flex-col gap-2 mb-[22px]">
        {postsLoading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin mx-auto my-3" />}
        {!postsLoading && todaysQueue.length === 0 && (
          <p className="text-[12.5px] text-slate-500">Nothing queued for today.</p>
        )}
        {todaysQueue.map((item) => (
          <button
            key={item.id}
            onClick={() => onOpenPost(item)}
            className="flex flex-col gap-1.5 p-3.5 rounded-2xl bg-slate-100 text-left"
          >
            <div className="flex items-center justify-between">
              <span className={platformTagClasses}>{platformLabel(item.platform)}</span>
              <span className={statusClasses(item.status)}>{statusLabel(item.status)}</span>
            </div>
            <span className="text-[12.5px] font-bold text-slate-900">{item.title}</span>
            <span className="text-[11px] text-slate-500">{item.time}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-sm font-bold text-slate-900 m-0">Recent Generations</h3>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {generationsLoading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin my-3" />}
        {!generationsLoading && recentGenerations.length === 0 && (
          <p className="text-[12.5px] text-slate-500">Nothing generated yet — try the AI Wizard.</p>
        )}
        {recentGenerations.map((g) => (
          <div key={g.id} className="flex-none w-[132px]">
            <div className="w-[132px] h-[88px] rounded-2xl bg-[repeating-linear-gradient(135deg,#cbd5e1,#cbd5e1_8px,#94a3b8_8px,#94a3b8_16px)] flex items-end p-1.5 mb-1.5 overflow-hidden relative">
              {g.type === 'image' && (
                <img src={g.url} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              )}
              <span className="relative font-mono text-[9px] text-slate-700 bg-white/85 px-1.5 py-0.5 rounded">
                {generationTypeLabel(g.type)}
              </span>
            </div>
            <div className="text-[11.5px] font-bold text-slate-900 leading-tight">{generationTitle(g)}</div>
            <div className="text-[10px] text-slate-500">{relativeTimeShort(g.createdAt)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
