import React from 'react';
import { Loader2 } from 'lucide-react';
import { ViewType } from '../../types';
import { PROVIDER_LABELS } from './videoStudio/constants';
import { CreateStep } from './videoStudio/CreateStep';
import { EditStep } from './videoStudio/EditStep';
import { ResultStep } from './videoStudio/ResultStep';
import { useVideoStudio } from './videoStudio/useVideoStudio';

interface VideoStudioViewProps {
  onNavigate: (view: ViewType) => void;
}

/** Video Studio: make a clip from a prompt, an upload, a template or the Scene Builder, add text, then share it.
 * The state and actions live in videoStudio/useVideoStudio.ts; each step is its own component in videoStudio/. */
export const VideoStudioView: React.FC<VideoStudioViewProps> = ({ onNavigate }) => {
  const studio = useVideoStudio(onNavigate);
  const { compositeProgress, finalVideoUrl, progressLabel, provider, sourceVideoUrl, step, stylePreset } = studio;

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {step === 'create' && <CreateStep studio={studio} />}

      {step === 'generating' && (
        <div className="max-w-lg mx-auto py-20 flex flex-col items-center text-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{progressLabel}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {stylePreset.label} · {PROVIDER_LABELS[provider]} · usually a few seconds to a couple
              of minutes
            </p>
          </div>
        </div>
      )}

      {step === 'edit' && sourceVideoUrl && <EditStep studio={studio} />}

      {step === 'compositing' && (
        <div className="max-w-lg mx-auto py-20 flex flex-col items-center text-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <div className="w-full max-w-xs">
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {progressLabel || 'Rendering your text overlay...'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
              You'll briefly hear the clip's audio while it renders - this is normal.
            </p>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all"
                style={{ width: `${Math.round(compositeProgress * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {step === 'result' && finalVideoUrl && <ResultStep studio={studio} />}
    </div>
  );
};
