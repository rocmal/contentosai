import React, { useState } from 'react';
import { AlertCircle, Download, Loader2, ShieldCheck, Store } from 'lucide-react';
import { BrandBrain, ViewType } from '../../types';
import { ApiError, saveBrandProfile } from '../../lib/api';
import { applyBrandTemplate, BRAND_TEMPLATES, BrandTemplate } from '../../lib/brandTemplates';

interface MarketplaceViewProps {
  brandBrain: BrandBrain;
  onUpdateBrandBrain: (newBrain: BrandBrain) => void;
  onNavigate: (view: ViewType) => void;
}

function ruleCount(template: BrandTemplate): number {
  return (template.profile.guidelines ?? '').split('\n').filter((line) => /^\d+\.\s/.test(line.trim())).length;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({ brandBrain, onUpdateBrandBrain, onNavigate }) => {
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInstall = async (template: BrandTemplate) => {
    if (
      !window.confirm(
        `Install "${template.label}"?\n\nThis replaces your current Brand Brain identity, voice and rules (${brandBrain.businessName}). Your logo, social accounts and advisor details are kept.`,
      )
    ) {
      return;
    }
    setInstallingId(template.id);
    setError(null);
    try {
      const saved = await saveBrandProfile(applyBrandTemplate(brandBrain, template));
      onUpdateBrandBrain(saved);
      onNavigate('brand-brain');
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Could not install the pack.');
    } finally {
      setInstallingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
            <Store className="w-5 h-5" />
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Industry Packs</h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Start from a ready-made Brand Brain for your industry: voice, audience, product categories and the content rules
          that keep AI output safe to publish. Installing saves it to your Brand Brain; you can edit everything afterwards.
          Packs are starting points, so have your own compliance team review the rules.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {BRAND_TEMPLATES.map((template) => {
          const rules = ruleCount(template);
          const installing = installingId === template.id;
          return (
            <div
              key={template.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                  {template.category}
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-2">{template.label}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{template.description}</p>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {template.profile.toneOfVoice.slice(0, 4).map((tone) => (
                    <span
                      key={tone}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    >
                      {tone}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-3">
                  {template.profile.productsAndServices.length} product categories
                  {rules > 0 && (
                    <span className="inline-flex items-center gap-1 ml-2 text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-3 h-3" /> {rules} content rules
                    </span>
                  )}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => handleInstall(template)}
                  disabled={installingId !== null}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1"
                >
                  {installing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  {installing ? 'Installing...' : 'Install pack'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
