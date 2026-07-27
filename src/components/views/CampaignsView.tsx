import React from 'react';
import { Megaphone, Plus, Sparkles, TrendingUp } from 'lucide-react';
import { Campaign, ViewType } from '../../types';

interface CampaignsViewProps {
  campaigns: Campaign[];
  onNavigate: (view: ViewType) => void;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({ campaigns, onNavigate }) => {
  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <Megaphone className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Multi-Channel Marketing Campaigns
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Orchestrate cross-platform product launches and content initiatives.
          </p>
        </div>

        <button
          onClick={() => onNavigate('ai-studio')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm"
        >
          <Plus className="w-4 h-4" /> Launch Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campaigns.map((camp) => (
          <div
            key={camp.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                {camp.status}
              </span>
              <span className="text-xs font-semibold text-slate-500">Goal: {camp.reachGoal} Reach</span>
            </div>

            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{camp.name}</h3>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Progress ({camp.postsCount} posts created)</span>
                <span className="font-bold text-slate-900 dark:text-white">{camp.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all"
                  style={{ width: `${camp.progress}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-2">
              {camp.platforms.map((p, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
