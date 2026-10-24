import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  Coins,
  Film,
  Image as ImageIcon,
  Mic,
  Send,
  Sparkles,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { ViewType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import {
  CreditUsageSummary,
  getMyCreditUsage,
  getMyCreditWallet,
  getMyGalleryPage,
  getPublishingSummary,
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
  blurb: string;
  reason: string;
  galleryType: MediaAssetType;
  noun: string;
  icon: React.FC<{ className?: string }>;
  tint: string;
}[] = [
  {
    id: 'image',
    label: 'Image Studio',
    blurb: 'Posts and creatives sized for every platform',
    reason: 'generation.image',
    galleryType: 'image',
    noun: 'image',
    icon: ImageIcon,
    tint: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
  },
  {
    id: 'video',
    label: 'Video Studio',
    blurb: 'Short videos from a prompt, with narration',
    reason: 'generation.video',
    galleryType: 'video',
    noun: 'video',
    icon: Film,
    tint: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300',
  },
  {
    id: 'voice',
    label: 'Voice Studio',
    blurb: 'Voiceovers in Indian languages and your own voice',
    reason: 'generation.voice',
    galleryType: 'audio',
    noun: 'voiceover',
    icon: Mic,
    tint: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
];

const PERIODS = [7, 30, 90] as const;

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const plural = (count: number, noun: string) => `${count.toLocaleString()} ${noun}${count === 1 ? '' : 's'}`;

export const DashboardView: React.FC<DashboardViewProps> = () => {
  const { user } = useAuth();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [usage, setUsage] = useState<CreditUsageSummary | null>(null);
  const [credits, setCredits] = useState<number | null | undefined>(undefined);
  const [counts, setCounts] = useState<Record<StudioId, number> | null>(null);
  const [publishedCount, setPublishedCount] = useState<number | null>(null);
  const [studiosOpen, setStudiosOpen] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('lumora.dashboardStudiosOpen') !== '0';
    } catch {
      return true;
    }
  });

  const toggleStudios = () =>
    setStudiosOpen((open) => {
      try {
        window.localStorage.setItem('lumora.dashboardStudiosOpen', open ? '0' : '1');
      } catch {
        // Storage blocked: it just won't be remembered.
      }
      return !open;
    });

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
    getPublishingSummary()
      .then((summary) => !cancelled && setPublishedCount(summary.published))
      .catch(() => !cancelled && setPublishedCount(0));
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
  const studioUsage = STUDIOS.map((s) => ({
    studio: s,
    credits: spentOn(s.reason)?.credits ?? 0,
    runs: spentOn(s.reason)?.count ?? 0,
  }));
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
      hint: 'Images, voiceovers and videos saved',
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
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Your numbers at a glance. Credit breakdown and team seats are under Profile &gt; Plan &amp; Usage.</p>
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

      {/* One card per studio: what it has made and what it has cost. Folds up; Create lives in the top menu and the sidebar. */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={toggleStudios}
          aria-expanded={studiosOpen}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${studiosOpen ? '' : '-rotate-90'}`} />
          Studios
          {!studiosOpen && totalCreated !== null && (
            <span className="font-medium text-slate-400">· {totalCreated.toLocaleString()} saved</span>
          )}
        </button>
        {studiosOpen && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {studioUsage.map(({ studio, credits: spent, runs }) => {
              const Icon = studio.icon;
              const isMostUsed = mostUsed?.studio.id === studio.id;
              return (
                <div
                  key={studio.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`p-2.5 rounded-xl ${studio.tint}`}>
                      <Icon className="w-5 h-5" />
                    </span>
                    {isMostUsed && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-[10px] font-bold text-amber-600 dark:text-amber-300">
                        <Trophy className="w-3 h-3" /> Most used
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{studio.label}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{studio.blurb}</p>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {counts === null ? '...' : plural(counts[studio.id], studio.noun)} saved ·{' '}
                    {usage === null ? '...' : `${spent.toLocaleString()} credits`} ({runs} run{runs === 1 ? '' : 's'}) in {days} days
                  </p>
                </div>
              );
            })}
          </div>
        )}
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
    </div>
  );
};
