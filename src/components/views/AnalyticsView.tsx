import React, { useEffect, useState } from 'react';
import { BarChart2, Loader2, Send, Sparkles, Users, Zap } from 'lucide-react';
import { ViewType } from '../../types';
import { getMyCreditWallet, listMyGallery, listScheduledPosts, listTeamMembers, MediaAsset, PublishingJob } from '../../lib/api';

interface AnalyticsViewProps {
  onNavigate: (view: ViewType) => void;
}

const DAYS_TO_CHART = 14;

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = () => {
  const [generations, setGenerations] = useState<MediaAsset[] | null>(null);
  const [jobs, setJobs] = useState<PublishingJob[] | null>(null);
  const [teamSize, setTeamSize] = useState<number | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    listMyGallery(undefined, 100).then(setGenerations).catch(() => setGenerations([]));
    listScheduledPosts().then(setJobs).catch(() => setJobs([]));
    listTeamMembers().then((m) => setTeamSize(m.length)).catch(() => setTeamSize(null));
    getMyCreditWallet().then((w) => setCreditsRemaining(w.balance)).catch(() => setCreditsRemaining(null));
  }, []);

  const loading = generations === null || jobs === null;

  const byType = (generations ?? []).reduce<Record<string, number>>((acc, g) => {
    acc[g.type] = (acc[g.type] ?? 0) + 1;
    return acc;
  }, {});

  const published = (jobs ?? []).filter((j) => j.status === 'published').length;
  const scheduled = (jobs ?? []).filter((j) => j.status === 'scheduled').length;
  const failed = (jobs ?? []).filter((j) => j.status === 'failed').length;

  // Last 14 days of generation activity, derived from real createdAt timestamps.
  const chartDays: { label: string; count: number }[] = [];
  {
    const counts = new Map<string, number>();
    for (const g of generations ?? []) {
      const key = dayKey(g.createdAt);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const today = new Date();
    for (let i = DAYS_TO_CHART - 1; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      chartDays.push({ label: String(d.getDate()), count: counts.get(key) ?? 0 });
    }
  }
  const maxChartCount = Math.max(1, ...chartDays.map((d) => d.count));

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <BarChart2 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Analytics & Usage
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real content generation and publishing activity for your workspace.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        <>
          {/* Metrics Row - all real, derived from actual generation/publishing/team/credit data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Total Generations
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{(generations ?? []).length}</p>
              <span className="text-[11px] text-slate-400">
                {Object.entries(byType).map(([t, c]) => `${c} ${t}`).join(' · ') || 'No generations yet'}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" /> Published
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{published}</p>
              <span className="text-[11px] text-slate-400">
                {scheduled} scheduled · {failed} failed
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Credits Remaining
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {creditsRemaining === undefined ? '—' : creditsRemaining === null ? 'Unlimited' : creditsRemaining.toLocaleString()}
              </p>
              <span className="text-[11px] text-slate-400">this billing cycle</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Team Size
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{teamSize ?? '—'}</p>
              <span className="text-[11px] text-slate-400">workspace members</span>
            </div>
          </div>

          {/* Generation activity chart - real daily counts, last 14 days */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Generation Activity (Last 14 Days)
            </h3>

            <div className="h-48 w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex items-end justify-between gap-1.5 border border-slate-100 dark:border-slate-700/50">
              {chartDays.map((d, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.count} generation${d.count === 1 ? '' : 's'}`}>
                  <div
                    className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-md transition-all group-hover:brightness-125 min-h-[2px]"
                    style={{ height: `${(d.count / maxChartCount) * 100}%` }}
                  />
                  <span className="text-[9px] text-slate-400 hidden sm:block">{d.label}</span>
                </div>
              ))}
            </div>
            {(generations ?? []).length === 0 && (
              <p className="text-[11px] text-slate-400 text-center">
                No generations yet - use AI Studio, Image, Voice, Video, or Character Studio to see activity here.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
