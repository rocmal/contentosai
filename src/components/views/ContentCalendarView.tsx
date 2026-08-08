import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Facebook,
  Instagram,
  Kanban,
  Linkedin,
  Loader2,
  RefreshCw,
  Video,
  XCircle,
  Youtube,
} from 'lucide-react';
import * as api from '../../lib/api';
import { ViewType } from '../../types';

interface ContentCalendarViewProps {
  onNavigate: (view: ViewType) => void;
}

interface CalendarPost {
  job: api.PublishingJob;
  content: api.ContentItem | null;
}

const PLATFORM_ICON: Record<string, React.FC<{ className?: string }>> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
};

const PLATFORM_LABEL: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
};

const PLATFORM_SHORT_LABEL: Record<string, string> = {
  facebook: 'FB',
  instagram: 'IG',
  linkedin: 'LI',
  youtube: 'YT',
};

const STATUS_META: Record<
  api.PublishingJob['status'],
  { label: string; icon: React.FC<{ className?: string }>; badge: string; column: string }
> = {
  scheduled: {
    label: 'Scheduled',
    icon: Clock,
    badge: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400',
    column: 'text-blue-600 dark:text-blue-400',
  },
  published: {
    label: 'Published',
    icon: CheckCircle2,
    badge: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400',
    column: 'text-emerald-600 dark:text-emerald-400',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    badge: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400',
    column: 'text-red-600 dark:text-red-400',
  },
};

const STATUS_COLUMNS: api.PublishingJob['status'][] = ['scheduled', 'published', 'failed'];

function postDate(job: api.PublishingJob): Date | null {
  const raw = job.status === 'published' ? job.publishedAt ?? job.scheduledAt : job.scheduledAt;
  return raw ? new Date(raw) : null;
}

function formatDateTime(date: Date | null): string {
  if (!date) return 'No date';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const ContentCalendarView: React.FC<ContentCalendarViewProps> = ({ onNavigate }) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'month'>('kanban');
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const [jobs, content] = await Promise.all([api.listScheduledPosts(), api.listContent()]);
      const contentById = new Map(content.map((c) => [c.id, c]));
      const joined = jobs
        .map((job) => ({ job, content: job.contentId ? contentById.get(job.contentId) ?? null : null }))
        .sort((a, b) => {
          const da = postDate(a.job)?.getTime() ?? 0;
          const db = postDate(b.job)?.getTime() ?? 0;
          return db - da;
        });
      setPosts(joined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load scheduled content.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthGrid = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthLabel = now.toLocaleString(undefined, { month: 'long', year: 'numeric' });

    const byDay = new Map<number, CalendarPost[]>();
    posts.forEach((p) => {
      const d = postDate(p.job);
      if (d && d.getFullYear() === year && d.getMonth() === month) {
        const list = byDay.get(d.getDate()) ?? [];
        list.push(p);
        byDay.set(d.getDate(), list);
      }
    });

    return { year, month, firstWeekday, daysInMonth, monthLabel, byDay, today: now.getDate() };
  }, [posts]);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'kanban'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" /> Status Board
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'month'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" /> Month
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => load(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={() => onNavigate('video-studio')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all"
          >
            <Video className="w-4 h-4" /> Schedule from Video Studio
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-24 text-slate-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading scheduled content...
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{error}</p>
          <button
            onClick={() => load()}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
          <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-700" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Nothing scheduled yet
          </p>
          <p className="text-xs text-slate-400 max-w-xs">
            Posts you schedule to Facebook, Instagram, LinkedIn, or YouTube from Video Studio will
            show up here.
          </p>
          <button
            onClick={() => onNavigate('video-studio')}
            className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all"
          >
            <Video className="w-4 h-4" /> Go to Video Studio
          </button>
        </div>
      )}

      {/* STATUS BOARD (KANBAN) VIEW */}
      {!loading && !error && posts.length > 0 && viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATUS_COLUMNS.map((status) => {
            const meta = STATUS_META[status];
            const columnPosts = posts.filter((p) => p.job.status === status);
            return (
              <div
                key={status}
                className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col min-w-[240px]"
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className={`text-xs font-bold uppercase tracking-wider ${meta.column}`}>
                    {meta.label}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {columnPosts.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[650px] custom-scroll">
                  {columnPosts.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      No posts {meta.label.toLowerCase()}
                    </div>
                  ) : (
                    columnPosts.map(({ job, content }) => {
                      const PlatformIcon = PLATFORM_ICON[job.platform] ?? CalendarIcon;
                      return (
                        <div
                          key={job.id}
                          className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs hover:border-blue-500/50 transition-all space-y-2"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                              <PlatformIcon className="w-3 h-3" />
                              {PLATFORM_LABEL[job.platform] ?? job.platform}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full font-semibold ${meta.badge}`}>
                              {meta.label}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                            {content?.title || 'Untitled post'}
                          </h4>

                          {content?.body && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                              {content.body}
                            </p>
                          )}

                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {formatDateTime(postDate(job))}
                            </span>
                            {job.externalPostId && (
                              <span className="font-mono truncate max-w-[90px]" title={job.externalPostId}>
                                #{job.externalPostId}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MONTH VIEW */}
      {!loading && !error && posts.length > 0 && viewMode === 'month' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{monthGrid.monthLabel}</h3>
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: monthGrid.firstWeekday }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {Array.from({ length: monthGrid.daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dayPosts = monthGrid.byDay.get(dayNum) ?? [];
              const isToday = dayNum === monthGrid.today;
              return (
                <div
                  key={dayNum}
                  className={`min-h-[100px] p-2 rounded-xl border flex flex-col justify-between ${
                    isToday
                      ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800'
                      : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/80'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-400">{dayNum}</span>
                  <div className="space-y-1 my-1">
                    {dayPosts.map(({ job, content }) => {
                      const meta = STATUS_META[job.status];
                      return (
                        <div
                          key={job.id}
                          className={`p-1 rounded text-white text-[10px] font-semibold truncate ${
                            job.status === 'published'
                              ? 'bg-emerald-600'
                              : job.status === 'failed'
                                ? 'bg-red-600'
                                : 'bg-blue-600'
                          }`}
                          title={content?.title || 'Untitled post'}
                        >
                          {PLATFORM_SHORT_LABEL[job.platform] ?? job.platform}:{' '}
                          {content?.title || 'Untitled'}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
