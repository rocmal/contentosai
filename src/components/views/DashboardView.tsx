import React from 'react';
import {
  ArrowUpRight,
  BarChart2,
  Bot,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FolderKanban,
  Megaphone,
  Plus,
  Share2,
  Sparkles,
  TrendingUp,
  Users,
  Video,
  Zap,
} from 'lucide-react';
import {
  CalendarEvent,
  GenerationHistoryItem,
  Project,
  ViewType,
} from '../../types';

interface DashboardViewProps {
  onNavigate: (view: ViewType) => void;
  projects: Project[];
  calendarEvents: CalendarEvent[];
  generations: GenerationHistoryItem[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  projects,
  calendarEvents,
  generations,
}) => {
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
              Good morning, Alex 👋
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Your 10 AI Agents ran 18 background tasks today. Your scheduled posts are on track to reach an estimated <span className="text-blue-400 font-semibold">842K audience members</span> this week.
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

      {/* Analytics Highlights Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Views</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">2.4M</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5 mt-1">
              <TrendingUp className="w-3 h-3" /> +12.5% vs last month
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            <BarChart2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Reach</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">842K</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5 mt-1">
              <TrendingUp className="w-3 h-3" /> +8.2% engagement rate
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg. CTR</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">4.8%</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5 mt-1">
              <TrendingUp className="w-3 h-3" /> +1.4% higher than industry
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Conversions</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">12.4K</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5 mt-1">
              <TrendingUp className="w-3 h-3" /> +24.1% qualified leads
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            <Zap className="w-5 h-5" />
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
            {calendarEvents.slice(0, 3).map((event) => (
              <div
                key={event.id}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {event.platform} • {event.contentType}
                  </span>
                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {event.scheduledTime}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                  {event.title}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">By {event.author}</span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    {event.status}
                  </span>
                </div>
              </div>
            ))}
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
            {generations.map((gen) => (
              <div
                key={gen.id}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded">
                    {gen.type}
                  </span>
                  <span className="text-[10px] text-slate-400">{gen.createdAt}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{gen.title}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  {gen.preview}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Agent System Fleet Summary */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">10 Autonomous AI Agents</h3>
            </div>
            <button
              onClick={() => onNavigate('ai-agents')}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              View Fleet →
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Research & Trend Agent</p>
                <p className="text-[11px] text-slate-500">Scrapes Twitter & LinkedIn B2B trends</p>
              </div>
              <span className="px-2 py-1 text-[10px] font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-md">
                Active
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Content & Strategy Agent</p>
                <p className="text-[11px] text-slate-500">Drafting LinkedIn carousel & newsletter</p>
              </div>
              <span className="px-2 py-1 text-[10px] font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-md">
                Active
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Publishing & Repurposing Agent</p>
                <p className="text-[11px] text-slate-500">Multi-channel auto distribution</p>
              </div>
              <span className="px-2 py-1 text-[10px] font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-md">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
