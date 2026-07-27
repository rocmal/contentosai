import React from 'react';
import { Download, Sparkles, Store } from 'lucide-react';
import { ViewType } from '../../types';

interface MarketplaceViewProps {
  onNavigate: (view: ViewType) => void;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({ onNavigate }) => {
  const packs = [
    {
      id: 'p1',
      title: 'B2B SaaS Content Machine Pack',
      category: 'Software & Tech',
      desc: '12 pre-configured workflow nodes, LinkedIn carousel templates, and founder voice clone settings.',
      rating: '4.9 ★ (1,420 installs)',
    },
    {
      id: 'p2',
      title: 'Real Estate Viral Listing Pack',
      category: 'Real Estate',
      desc: 'Instagram Reel video scripts, property showcase prompts, and email open house sequences.',
      rating: '4.8 ★ (890 installs)',
    },
    {
      id: 'p3',
      title: 'Ecommerce UGC & Ad Creative Pack',
      category: 'E-Commerce',
      desc: 'High-converting Facebook & TikTok ad copy formulas, product photo backgrounds, and promo emails.',
      rating: '4.9 ★ (2,100 installs)',
    },
  ];

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <Store className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Lumora Industry Content Marketplace
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Install 1-click industry templates, agent personas, and automated workflow recipes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {packs.map((pack) => (
          <div
            key={pack.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                {pack.category}
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-2">{pack.title}</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{pack.desc}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-medium">{pack.rating}</span>
              <button
                onClick={() => alert('Industry Pack installed to your Brand Brain!')}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Install Pack
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
