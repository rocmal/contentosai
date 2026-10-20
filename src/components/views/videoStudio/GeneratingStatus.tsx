import React, { useEffect, useState } from 'react';
import { Clock, FolderOpen, Sparkles } from 'lucide-react';
import { PROVIDER_LABELS } from './constants';
import type { VideoStudio } from './useVideoStudio';

/** What the waiting screen cycles through while the clip renders, so a 1-3 minute wait does not look stuck. */
const MESSAGES = [
  'Reading your prompt',
  'Setting up the scene',
  'Placing the people and props',
  'Finding the right light',
  'Planning the camera move',
  'Rolling the camera',
  'Rendering the frames',
  'Adding natural sounds',
  'Smoothing the motion',
  'Polishing the final cut',
];
const MESSAGE_MS = 4_000;
/** After this the screen says it is slower than usual and that it is fine to leave. */
const SLOW_AFTER_S = 180;

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** The "generating" step for a prompt video: a changing message, the time so far, and what to do if it is slow. */
export const GeneratingStatus: React.FC<{ studio: VideoStudio }> = ({ studio }) => {
  const { generationStartedAt, onNavigate, progressLabel, provider, stylePreset } = studio;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const seconds = generationStartedAt ? Math.max(0, Math.floor((now - generationStartedAt) / 1000)) : 0;
  // Once through the list, keep cycling the rendering stages rather than starting over at "Reading your prompt".
  const step = Math.floor((seconds * 1000) / MESSAGE_MS);
  const index = step < MESSAGES.length ? step : 4 + ((step - MESSAGES.length) % (MESSAGES.length - 4));
  const slow = seconds >= SLOW_AFTER_S;

  return (
    <div className="max-w-lg mx-auto py-16 flex flex-col items-center text-center gap-5" aria-live="polite">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-blue-100 dark:border-blue-950" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin" />
        <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-blue-600" />
      </div>

      <div className="space-y-1.5">
        <p key={index} className="text-base font-bold text-slate-900 dark:text-white animate-in fade-in duration-500">
          {MESSAGES[index]}…
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {progressLabel} · {stylePreset.label} · {PROVIDER_LABELS[provider]}
        </p>
      </div>

      <div className="w-full max-w-xs space-y-1.5">
        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 animate-[lumora-indeterminate_1.6s_ease-in-out_infinite]" />
        </div>
        <p className="flex items-center justify-center gap-1 text-[11px] text-slate-400 tabular-nums">
          <Clock className="w-3 h-3" /> {clock(seconds)} · usually 1-3 minutes
        </p>
      </div>

      {slow && (
        <div className="w-full p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-left space-y-2.5 animate-in fade-in duration-500">
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            Google is busy, so this is taking longer than usual. You can leave this page: the video keeps rendering,
            appears in your Gallery and you get a notification. Please don't create it again, or you'll be charged
            twice.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('media-library')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 text-[11px] font-bold text-amber-800 dark:text-amber-300"
          >
            <FolderOpen className="w-3.5 h-3.5" /> Go to Gallery
          </button>
        </div>
      )}
    </div>
  );
};
