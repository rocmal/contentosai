import React, { useEffect, useState } from 'react';
import {
  BarChart2,
  Bot,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FolderKanban,
  Loader2,
  Megaphone,
  Plus,
  Share2,
  Sparkles,
  Users,
  Video,
  Zap,
} from 'lucide-react';
import {
  Project,
  ViewType,
} from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import {
  getMyCreditWallet,
  listContent,
  listMyGallery,
  listScheduledPosts,
  listTeamMembers,
  MediaAsset,
  PublishingJob,
} from '../../lib/api';

interface DashboardViewProps {
  onNavigate: (view: ViewType) => void;
  projects: Project[];
}

interface QueueItem {
  job: PublishingJob;
  title: string;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatScheduledTime(iso: string | null): string {
  if (!iso) return 'Not yet scheduled';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  projects,
}) => {
  const { user } = useAuth();
  const [generations, setGenerations] = useState<MediaAsset[] | null>(null);
  const [jobs, setJobs] = useState<PublishingJob[] | null>(null);
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [teamSize, setTeamSize] = useState<number | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    // Fetched once at a higher limit and reused for both the "recent"
    // feed (first 5) and the real generation-count stat below, instead of
    // two separate calls for overlapping data.
    listMyGallery(undefined, 100)
      .then((items) => {
        if (!cancelled) setGenerations(items);
      })
      .catch(() => {
        if (!cancelled) setGenerations([]);
      });
    Promise.all([listScheduledPosts(), listContent()])
      .then(([allJobs, content]) => {
        if (cancelled) return;
        setJobs(allJobs);
        const contentById = new Map(content.map((c) => [c.id, c]));
        const items = allJobs
          .filter((job) => job.status === 'scheduled')
          .slice(0, 3)
          .map((job) => ({ job, title: (job.contentId && contentById.get(job.contentId)?.title) || 'Untitled' }));
        setQueue(items);
      })
      .catch(() => {
        if (!cancelled) {
          setJobs([]);
          setQueue([]);
        }
      });
    listTeamMembers().then((m) => {
      if (!cancelled) setTeamSize(m.length);
    }).catch(() => {
      if (!cancelled) setTeamSize(null);
    });
    getMyCreditWallet().then((w) => {
      if (!cancelled) setCreditsRemaining(w.balance);
    }).catch(() => {
      if (!cancelled) setCreditsRemaining(null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const publishedCount = (jobs ?? []).filter((j) => j.status === 'published').length;
  const scheduledCount = (jobs ?? []).filter((j) => j.status === 'scheduled').length;
  const recentGenerations = (generations ?? []).slice(0, 5);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Hero Greeting Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-6 md:p-8 text-white border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Lumora Content OS v3.2 Active
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {timeOfDayGreeting()}{user?.firstName ? `, ${user.firstName}` : ''} 👋
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              {generations === null || jobs === null ? (
                'Loading your workspace activity...'
              ) : (
                <>
                  You've created <span className="text-blue-400 font-semibold">{generations.length} piece{generations.length === 1 ? '' : 's'}</span> of content, with{' '}
                  <span className="text-blue-400 font-semibold">{scheduledCount} scheduled</span> to publish.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('ai-studio')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch 6-Step AI Wizard</span>
            </button>
            <button
              onClick={() => onNavigate('automation')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-all"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Automation Builder</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <button
          onClick={() => onNavigate('ai-studio')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500/50 hover:shadow-md transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">AI Content Wizard</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Zero-prompt generator</p>
        </button>

        <button
          onClick={() => onNavigate('video-studio')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500/50 hover:shadow-md transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <Video className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">Video Studio</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Scripts, AI Shots & B-roll</p>
        </button>

        <button
          onClick={() => onNavigate('brand-brain')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500/50 hover:shadow-md transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <Brain className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">Brand Brain</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Central brand memory</p>
        </button>

        <button
          onClick={() => onNavigate('analytics')}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500/50 hover:shadow-md transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
            <BarChart2 className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">Analytics</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Insights & Growth Trends</p>
        </button>
      </div>

      {/* Highlights Banner - same real metrics AnalyticsView computes
          (generation/publishing/credits/team), not audience-analytics
          numbers this app has no data source for. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Generations</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{generations === null ? '—' : generations.length}</p>
            <p className="text-[11px] text-slate-400 mt-1">across all Studios</p>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Published</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{jobs === null ? '—' : publishedCount}</p>
            <p className="text-[11px] text-slate-400 mt-1">{scheduledCount} scheduled</p>
          </div>
          <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
            <Share2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Credits Remaining</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {creditsRemaining === undefined ? '—' : creditsRemaining === null ? 'Unlimited' : creditsRemaining.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">this billing cycle</p>
          </div>
          <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Team Size</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{teamSize ?? '—'}</p>
            <p className="text-[11px] text-slate-400 mt-1">workspace members</p>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Projects & Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Active Projects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Projects</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage multi-channel content initiatives</p>
            </div>
            <button
              onClick={() => onNavigate('projects')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              View All <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => onNavigate('projects')}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500/50 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                      {proj.category}
                    </span>
                    <span className="text-[10px] text-slate-400">{proj.lastUpdated}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                    {proj.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Campaign: <span className="text-slate-700 dark:text-slate-300 font-medium">{proj.campaign}</span>
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{proj.itemCount} assets generated</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {proj.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scheduled Content & Today's Tasks */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Today's Content Queue</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Auto-publishing schedule</p>
            </div>
            <button
              onClick={() => onNavigate('calendar')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Calendar <Calendar className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
            {queue === null ? (
              <div className="flex items-center justify-center py-6 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : queue.length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center py-6">
                Nothing queued. Generate content in AI Studio and schedule it to see it here.
              </p>
            ) : (
              queue.map(({ job, title }) => (
                <div
                  key={job.id}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {job.platform}
                    </span>
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatScheduledTime(job.scheduledAt)}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                    {title}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI Agents & Recent Generations Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent AI Generations Feed */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent AI Generations</h3>
            </div>
            <button
              onClick={() => onNavigate('ai-studio')}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              Generate New
            </button>
          </div>

          <div className="space-y-3">
            {generations === null ? (
              <div className="flex items-center justify-center py-8 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : recentGenerations.length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center py-8">
                No generations yet. Run the AI Studio wizard or a Studio to create your first asset.
              </p>
            ) : (
              recentGenerations.map((gen) => (
                <div
                  key={gen.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded uppercase">
                      {gen.type}
                    </span>
                    <span className="text-[10px] text-slate-400">{timeAgo(gen.createdAt)}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                    {gen.fileName}
                  </h4>
                  {gen.prompt && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {gen.prompt}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Agent Fleet - execution isn't connected to anything real yet
            (see AIAgentsView), so this is an honest preview link rather
            than fabricated "Active" agent status, matching the disclosure
            pattern already used on the Automation Builder page. */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">AI Agents Fleet</h3>
            </div>
            <button
              onClick={() => onNavigate('ai-agents')}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              Preview Fleet →
            </button>
          </div>

          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Bot className="w-6 h-6 text-slate-300 dark:text-slate-600" />
            <p className="text-[11px] text-slate-400 max-w-[220px]">
              Agent execution isn't connected yet - the Fleet page is a preview of what's coming.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
