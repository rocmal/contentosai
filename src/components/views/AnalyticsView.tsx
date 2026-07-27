import React from 'react';
import {
  ArrowUpRight,
  BarChart2,
  Brain,
  Globe,
  Share2,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { ViewType } from '../../types';

interface AnalyticsViewProps {
  onNavigate: (view: ViewType) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onNavigate }) => {
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
              Executive Analytics & Growth Insights
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track multi-platform engagement, ROI, lead conversions, and AI strategic optimizations.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <p className="text-xs font-semibold text-slate-500">Impressions</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">2,410,950</p>
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +18.4% this month
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <p className="text-xs font-semibold text-slate-500">Engagement Rate</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">6.82%</p>
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +2.1% benchmark
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <p className="text-xs font-semibold text-slate-500">Inbound Leads</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">1,842</p>
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +32% high-intent trial signups
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <p className="text-xs font-semibold text-slate-500">Estimated Pipeline Revenue</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">$142,500</p>
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +28% attribution
          </span>
        </div>
      </div>

      {/* Interactive Growth Chart Simulation & AI Strategy Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Box */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              30-Day Content Performance & Audience Growth
            </h3>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              All Channels Combined
            </span>
          </div>

          <div className="h-56 w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex items-end justify-between gap-2 border border-slate-100 dark:border-slate-700/50">
            {[35, 45, 60, 50, 75, 80, 95, 88, 110, 130, 125, 150, 180, 210, 240].map((val, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                <div
                  className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-md transition-all group-hover:brightness-125"
                  style={{ height: `${(val / 240) * 100}%` }}
                />
                <span className="text-[9px] text-slate-400 hidden sm:block">{idx + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Strategic Recommendations Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-teal-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-300">
              Brand Brain AI Recommendations
            </h3>
          </div>

          <div className="space-y-3 text-xs leading-relaxed">
            <div className="p-3 rounded-xl bg-white/10 border border-white/10 space-y-1">
              <span className="font-bold text-blue-300 block">📹 Double down on YouTube Shorts</span>
              <p className="text-slate-300 text-[11px]">
                Your YouTube Shorts generated 3.2x higher click-through rate than text posts this week.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/10 border border-white/10 space-y-1">
              <span className="font-bold text-teal-300 block">💡 Post timing optimization</span>
              <p className="text-slate-300 text-[11px]">
                Target B2B Decision Makers between 8:30 AM and 10:00 AM EST for peak engagement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
