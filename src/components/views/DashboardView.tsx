import React, { useEffect, useState } from 'react';
import { Coins, Film, Image as ImageIcon, Loader2, Mic, Send, Sparkles, TrendingUp, Trophy } from 'lucide-react';
import { ViewType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import {
  CreditUsageSummary,
  getMyCreditUsage,
  getMyCreditWallet,
  getMyGalleryPage,
  listMyGallery,
  listScheduledPosts,
  MediaAsset,
  MediaAssetType,
} from '../../lib/api';

interface DashboardViewProps {
  onNavigate: (view: ViewType) => void;
  /** Kept so existing callers still compile; the studio dashboard doesn't use it. */
  brandBrain?: unknown;
}

type StudioId = 'image' | 'voice' | 'video';

const STUDIOS: {
  id: StudioId;
  label: string;
  view: ViewType;
  reason: string;
  galleryType: MediaAssetType;
  noun: string;
  icon: React.FC<{ className?: string }>;
  tint: string;
  bar: string;
}[] = [
  {
    id: 'image',
    label: 'Image Studio',
    view: 'image-studio',
    reason: 'generation.image',
    galleryType: 'image',
    noun: 'image',
    icon: ImageIcon,
    tint: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
    bar: 'bg-blue-500',
  },
  {
    id: 'voice',
    label: 'Voice Studio',
    view: 'voice-studio',
    reason: 'generation.voice',
    galleryType: 'audio',
    noun: 'voiceover',
    icon: Mic,
    tint: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
    bar: 'bg-emerald-500',
  },
  {
    id: 'video',
    label: 'Video Studio',
    view: 'video-studio',
    reason: 'generation.video',
    galleryType: 'video',
    noun: 'video',
    icon: Film,
    tint: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300',
    bar: 'bg-teal-500',
  },
];

const PERIODS = [7, 30, 90] as const;

const TYPE_LABELS: Record<string, string> = { image: 'Image', video: 'Video', audio: 'Voice', character: 'Avatar' };

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const plural = (count: number, noun: string) => `${count.toLocaleString()} ${noun}${count === 1 ? '' : 's'}`;

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [usage, setUsage] = useState<CreditUsageSummary | null>(null);
  const [credits, setCredits] = useState<number | null | undefined>(undefined);
  const [counts, setCounts] = useState<Record<StudioId, number> | null>(null);
  const [publishedCount, setPublishedCount] = useState<number | null>(null);
  const [recent, setRecent] = useState<MediaAsset[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyCreditWallet()
      .then((w) => !cancelled && setCredits(w.balance))
      .catch(() => !cancelled && setCredits(null));
    Promise.all(STUDIOS.map((s) => getMyGalleryPage({ type: s.galleryType, limit: 1 })))
      .then((pages) => {
        if (cancelled) return;
        const next = {} as Record<StudioId, number>;
        STUDIOS.forEach((s, i) => {
          next[s.id] = pages[i].meta.totalItems;
        });
        setCounts(next);
      })
      .catch(() => !cancelled && setCounts({ image: 0, voice: 0, video: 0 }));
    listScheduledPosts()
      .then((jobs) => !cancelled && setPublishedCount(jobs.filter((j) => j.status === 'published').length))
      .catch(() => !cancelled && setPublishedCount(0));
    listMyGallery(undefined, 6)
      .then((items) => !cancelled && setRecent(items))
      .catch(() => !cancelled && setRecent([]));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setUsage(null);
    getMyCreditUsage(days)
      .then((u) => !cancelled && setUsage(u))
      .catch(() => !cancelled && setUsage({ days, creditsUsed: 0, byReason: [] }));
    return () => {
      cancelled = true;
    };
  }, [days]);

  const spentOn = (reason: string) => usage?.byReason.find((r) => r.reason === reason);
  const studioUsage = STUDIOS.map((s) => ({ studio: s, credits: spentOn(s.reason)?.credits ?? 0, runs: spentOn(s.reason)?.count ?? 0 }));
  const totalStudioCredits = studioUsage.reduce((sum, row) => sum + row.credits, 0);
  const mostUsed = studioUsage.filter((row) => row.credits > 0).sort((a, b) => b.credits - a.credits)[0];
  const totalCreated = counts ? counts.image + counts.voice + counts.video : null;

  const stats = [
    {
      label: 'Credits remaining',
      value: credits === undefined ? '...' : credits === null ? 'Unlimited' : credits.toLocaleString(),
      icon: Coins,
      tint: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
      hint: 'Left in this plan cycle',
    },
    {
      label: `Credits used (${days} days)`,
      value: usage === null ? '...' : usage.creditsUsed.toLocaleString(),
      icon: TrendingUp,
      tint: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300',
      hint: 'After refunds for failed runs',
    },
    {
      label: 'Content created',
      value: totalCreated === null ? '...' : totalCreated.toLocaleString(),
      icon: Sparkles,
      tint: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
      hint: 'Images, voiceovers and videos',
    },
    {
      label: 'Published',
      value: publishedCount === null ? '...' : publishedCount.toLocaleString(),
      icon: Send,
      tint: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
      hint: 'Posts sent to your social accounts',
    },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {timeOfDayGreeting()}
            {user?.firstName ? `, ${user.firstName}` : ''}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">What you've made and what it cost.</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setDays(p)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                days === p
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {p} days
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
            >
              <span className={`inline-flex p-2 rounded-xl ${stat.tint}`}>
                <Icon className="w-4 h-4" />
              </span>
              <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{stat.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{stat.hint}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Your studios</h3>
            {mostUsed && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-300">
                <Trophy className="w-3.5 h-3.5" /> Most used: {mostUsed.studio.label}
              </span>
            )}
          </div>

          {usage === null || counts === null ? (
            <div className="flex justify-center py-8 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {studioUsage.map(({ studio, credits: spent, runs }) => {
                const Icon = studio.icon;
                const share = totalStudioCredits > 0 ? Math.round((spent / totalStudioCredits) * 100) : 0;
                return (
                  <div key={studio.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`p-1.5 rounded-lg ${studio.tint}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{studio.label}</p>
                          <p className="text-[10px] text-slate-400">
                            {plural(counts[studio.id], studio.noun)} saved · {plural(runs, 'run')} in {days} days
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {spent.toLocaleString()} credits
                        </p>
                        <p className="text-[10px] text-slate-400">{share}% of use</p>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className={`h-full ${studio.bar} transition-all`} style={{ width: `${share}%` }} />
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate(studio.view)}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Open {studio.label} →
                    </button>
                  </div>
                );
              })}
              {totalStudioCredits === 0 && (
                <p className="text-[11px] text-slate-400">
                  Nothing generated in the last {days} days. Open a studio to make your first piece.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent creations</h3>
            <button
              type="button"
              onClick={() => onNavigate('media-library')}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all →
            </button>
          </div>
          {recent === null ? (
            <div className="flex justify-center py-8 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : recent.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-8">Nothing yet - your creations will show up here.</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50"
                >
                  {item.type === 'image' ? (
                    <img src={item.url} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-200 dark:bg-slate-700" />
                  ) : (
                    <span className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-500">
                      {item.type === 'audio' ? <Mic className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.prompt || item.fileName}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {TYPE_LABELS[item.type] ?? item.type} · {timeAgo(item.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
