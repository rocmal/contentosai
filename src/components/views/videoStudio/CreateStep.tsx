import React from 'react';
import { AlertTriangle, Clock, Info, Layers, LayoutTemplate, Sparkles, Upload, X } from 'lucide-react';
import { OutOfCreditsNotice } from '../../OutOfCreditsNotice';
import { CreatePreview } from './CreatePreview';
import { PromptPanel } from './PromptPanel';
import { SceneBuilder } from './SceneBuilder';
import { TemplatesPanel } from './TemplatesPanel';
import { UploadPanel } from './UploadPanel';
import type { VideoStudio } from './useVideoStudio';

/** Step 1: the source tabs, the chosen source's panel and the preview column. */
export const CreateStep: React.FC<{ studio: VideoStudio }> = ({ studio }) => {
  const { error, onNavigate, outOfCredits, sceneWarning, setSource, setStillRendering, source, stillRendering } = studio;
  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
      <div className="space-y-6 min-w-0">
        {/* On a phone the four tabs share the width, icon above label, so the row never runs off the screen. */}
        <div className="grid grid-cols-4 gap-1 sm:flex sm:items-center sm:gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 sm:w-fit mx-auto lg:mx-0">
          {(
            [
              { id: 'prompt', label: 'Prompt', icon: Sparkles },
              { id: 'upload', label: 'Upload', icon: Upload },
              { id: 'templates', label: 'Templates', icon: LayoutTemplate },
              { id: 'scenes', label: 'Scene Builder', icon: Layers },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = source === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSource(tab.id)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-4 py-2 rounded-lg text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {source === 'prompt' && <PromptPanel studio={studio} />}

        {source === 'upload' && <UploadPanel studio={studio} />}

        {source === 'templates' && <TemplatesPanel studio={studio} />}

        {source === 'scenes' && <SceneBuilder studio={studio} />}

        {outOfCredits && <OutOfCreditsNotice onNavigate={onNavigate} />}

        {/* The browser stopped waiting after 10 minutes; the server keeps collecting the clip for 20. */}
        {stillRendering && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300">
            <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p className="text-[11px] leading-snug flex-1">
              Your video is still rendering. It will appear in your{' '}
              <button type="button" onClick={() => onNavigate('media-library')} className="font-bold underline">
                Gallery
              </button>{' '}
              when it is ready, and you will get a notification. Please don't create it again, or you'll be charged twice.
            </p>
            <button type="button" onClick={() => setStillRendering(false)} aria-label="Close" className="shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {error && !outOfCredits && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p className="text-[11px] leading-snug">{error}</p>
          </div>
        )}

        {sceneWarning && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p className="text-[11px] leading-snug">{sceneWarning}</p>
          </div>
        )}
      </div>

      <CreatePreview studio={studio} />
    </div>
  );
};
