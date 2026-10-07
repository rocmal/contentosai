import React, { useEffect, useState } from 'react';
import {
  ArrowUpCircle,
  Coins,
  Film,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Mic,
  RefreshCw,
  Send,
  Sparkles,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import { ViewType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import {
  CreditUsageSummary,
  getMyCreditUsage,
  getMyCreditWallet,
  getMyGalleryPage,
  getMySubscription,
  LibraryItem,
  listLibrary,
  getPublishingSummary,
  listTeamMembers,
  MediaAssetType,
} from '../../lib/api';
import { PRICING_PLANS } from '../../lib/pricingPlans';
import { MANAGE_MEMBERS_PERMISSION, requestInviteForm, seatsLeft } from '../../lib/teamInvite';
import { cleanPrompt, requestReuse, STUDIO_VIEW, studioForType } from '../../lib/reuse';

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
  view: ViewType;
  reason: string;
  galleryType: MediaAssetType;
  noun: string;
  icon: React.FC<{ className?: string }>;
  tint: string;
  button: string;
  bar: string;
}[] = [
  {
    id: 'image',
    label: 'Image Studio',
    blurb: 'Posts and creatives sized for every platform',
    view: 'image-studio',
    reason: 'generation.image',
    galleryType: 'image',
    noun: 'image',
    icon: ImageIcon,
    tint: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
    button: 'bg-blue-600 hover:bg-blue-500',
    bar: 'bg-blue-500',
  },
  {
    id: 'video',
    label: 'Video Studio',
    blurb: 'Short videos from a prompt, with narration',
    view: 'video-studio',
    reason: 'generation.video',
    galleryType: 'video',
    noun: 'video',
    icon: Film,
    tint: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300',
    button: 'bg-teal-600 hover:bg-teal-500',
    bar: 'bg-teal-500',
  },
  {
    id: 'voice',
    label: 'Voice Studio',
    blurb: 'Voiceovers in Indian languages and your own voice',
    view: 'voice-studio',
    reason: 'generation.voice',
    galleryType: 'audio',
    noun: 'voiceover',
    icon: Mic,
    tint: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
    button: 'bg-emerald-600 hover:bg-emerald-500',
    bar: 'bg-emerald-500',
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

/** Seats on the plan: how many are used, then Invite when there is room or Upgrade when there is none.
 * Only shown to people who are allowed to add teammates. */
const TeamCard: React.FC<{ onNavigate: (view: ViewType) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [seats, setSeats] = useState<{ used: number; limit: number | null; planName: string } | null>(null);
  const canManage = Boolean(user?.permissions?.includes(MANAGE_MEMBERS_PERMISSION));

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    Promise.all([listTeamMembers(), getMySubscription()])
      .then(([members, subscription]) => {
        if (cancelled) return;
        // No subscription yet means the free starter allowance, which has one seat.
        const plan = PRICING_PLANS.find((p) => p.key === (subscription?.plan ?? 'starter')) ?? PRICING_PLANS[0];
        setSeats({ used: members.length, limit: plan.seatLimit, planName: plan.name });
      })
      .catch(() => !cancelled && setSeats(null));
    return () => {
      cancelled = true;
    };
  }, [canManage]);

  if (!canManage || seats === null) return null;

  const left = seatsLeft(seats.limit, seats.used);
  const full = left === 0;
  const share = seats.limit === null ? 0 : Math.min(100, Math.round((seats.used / seats.limit) * 100));

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Users className="w-4 h-4 text-blue-500" /> Your team
        </h3>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{seats.planName} plan</span>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300">
        <span className="font-extrabold text-slate-900 dark:text-white">{seats.used}</span> of{' '}
        {seats.limit === null ? 'unlimited' : seats.limit} seat{seats.limit === 1 ? '' : 's'} used
        {left !== null && left > 0 ? ` · ${left} left` : ''}
      </p>
      {seats.limit !== null && (
        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div className={`h-full transition-all ${full ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${share}%` }} />
        </div>
      )}
      {full ? (
        <>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Every seat on your plan is taken. Upgrade to add more teammates.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('billing')}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all active:scale-[0.98]"
          >
            <ArrowUpCircle className="w-4 h-4" /> Upgrade for more seats
          </button>
        </>
      ) : (
        <>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Add a teammate so they can create and share in the same gallery.
          </p>
          <button
            type="button"
            onClick={() => {
              requestInviteForm();
              onNavigate('team');
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all active:scale-[0.98]"
          >
            <UserPlus className="w-4 h-4" /> Invite a teammate
          </button>
        </>
      )}
    </div>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [usage, setUsage] = useState<CreditUsageSummary | null>(null);
  const [credits, setCredits] = useState<number | null | undefined>(undefined);
  const [counts, setCounts] = useState<Record<StudioId, number> | null>(null);
  const [publishedCount, setPublishedCount] = useState<number | null>(null);
  const [recent, setRecent] = useState<LibraryItem[] | null>(null);

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
    listLibrary({ scope: 'mine', generatedOnly: true, limit: 8 })
      .then((page) => !cancelled && setRecent(page.items))
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
  const studioUsage = STUDIOS.map((s) => ({
    studio: s,
    credits: spentOn(s.reason)?.credits ?? 0,
    runs: spentOn(s.reason)?.count ?? 0,
  }));
  const totalStudioCredits = studioUsage.reduce((sum, row) => sum + row.credits, 0);
  const mostUsed = studioUsage.filter((row) => row.credits > 0).sort((a, b) => b.credits - a.credits)[0];
  const totalCreated = counts ? counts.image + counts.voice + counts.video : null;

  const createAgain = (item: LibraryItem) => {
    const studio = studioForType(item.type);
    if (!studio || !item.prompt) return;
    requestReuse({ studio, prompt: cleanPrompt(studio, item.prompt) });
    onNavigate(STUDIO_VIEW[studio]);
  };

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
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Pick a studio to start, or pick up from something you made.</p>
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

      {/* Start creating: one card per studio, with what it has made and what it has cost */}
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
              <button
                type="button"
                onClick={() => onNavigate(studio.view)}
                className={`mt-auto w-full py-2.5 rounded-xl text-white text-xs font-bold transition-all active:scale-[0.98] ${studio.button}`}
              >
                Create in {studio.label}
              </button>
            </div>
          );
        })}
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
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pick up where you left off</h3>
            <button
              type="button"
              onClick={() => onNavigate('media-library')}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <FolderOpen className="w-3 h-3" /> Open Gallery &amp; history →
            </button>
          </div>
          {recent === null ? (
            <div className="flex justify-center py-10 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : recent.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-10">
              Nothing yet - what you create will show up here, and you can start again from any of it.
            </p>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {recent.map((item) => {
                const studio = studioForType(item.type);
                return (
                  <li
                    key={item.id}
                    className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/50 flex flex-col"
                  >
                    <button
                      type="button"
                      onClick={() => onNavigate('media-library')}
                      className="relative aspect-video bg-slate-950 flex items-center justify-center"
                      title="Open in Gallery"
                    >
                      {item.type === 'image' ? (
                        <img src={item.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : item.type === 'audio' ? (
                        <Mic className="w-6 h-6 text-slate-500" />
                      ) : (
                        <video src={item.url} muted preload="metadata" className="w-full h-full object-cover" />
                      )}
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-semibold">
                        {TYPE_LABELS[item.type] ?? item.type}
                      </span>
                    </button>
                    <div className="p-2 space-y-1 flex-1 flex flex-col">
                      <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 break-words">
                        {item.prompt ? cleanPrompt(studio ?? 'image', item.prompt) : item.fileName}
                      </p>
                      <p className="text-[10px] text-slate-400">{timeAgo(item.createdAt)}</p>
                      {studio && item.prompt && (
                        <button
                          type="button"
                          onClick={() => createAgain(item)}
                          className="mt-auto inline-flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-bold text-blue-600 dark:text-blue-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-800"
                        >
                          <RefreshCw className="w-3 h-3" /> Create again
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Where your credits went</h3>
          {usage === null ? (
            <div className="flex justify-center py-10 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : totalStudioCredits === 0 ? (
            <p className="text-[11px] text-slate-400">Nothing generated in the last {days} days.</p>
          ) : (
            <div className="space-y-3.5">
              {[...studioUsage]
                .sort((a, b) => b.credits - a.credits)
                .map(({ studio, credits: spent }) => {
                  const share = Math.round((spent / totalStudioCredits) * 100);
                  return (
                    <div key={studio.id} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800 dark:text-slate-100">{studio.label}</span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {spent.toLocaleString()} credits · {share}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className={`h-full ${studio.bar} transition-all`} style={{ width: `${share}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
        <TeamCard onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  );
};
