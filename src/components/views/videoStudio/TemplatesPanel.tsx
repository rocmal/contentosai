import React from 'react';
import { STOCK_TEMPLATES } from './constants';
import type { VideoStudio } from './useVideoStudio';

/** Templates tab: the team's saved templates and the free stock clips. */
export const TemplatesPanel: React.FC<{ studio: VideoStudio }> = ({ studio }) => {
  const { handlePickStockTemplate, handlePickVideoTemplate, templatesError, videoTemplates } = studio;
  return (
    <div className="space-y-5">
      {(
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Your saved templates
          </h3>
          {templatesError && <p className="text-[11px] text-red-500 break-words">{templatesError}</p>}
          {videoTemplates.length === 0 && !templatesError && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Nothing saved yet. Finish a video in Scene Builder and tick "Also save as a template", or use
              "Save as template" on the finished video, and it will appear here.
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {videoTemplates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handlePickVideoTemplate(t)}
                className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 transition-all text-left group"
              >
                <div className="aspect-video bg-slate-950 overflow-hidden">
                  <video
                    src={t.videoUrl}
                    muted
                    preload="metadata"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="p-2.5 flex items-center justify-between gap-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{t.title}</p>
                  <span
                    className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      t.visibility === 'team'
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {t.visibility}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Start from a stock clip
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {STOCK_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handlePickStockTemplate(t)}
              className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 transition-all text-left group"
            >
              <div className="aspect-video bg-slate-950 overflow-hidden">
                <video
                  src={t.url}
                  muted
                  preload="metadata"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white p-2.5">{t.label}</p>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-400">
          A small starter set of free, reusable clips - pick one to add your own text on top of it.
        </p>
      </div>
    </div>
  );
};
