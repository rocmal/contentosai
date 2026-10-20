import React, { useState } from 'react';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import * as api from '../../../lib/api';
import VoiceInputButton, { appendSpoken } from '../../VoiceInputButton';
import { VIDEO_PROMPT_CATEGORIES, VIDEO_PROMPT_TEMPLATES, VideoPromptTemplate } from '../../../lib/videoPromptTemplates';
import { useTextHistory } from '../../../lib/useTextHistory';
import { creditLabel, videoCreditCost } from '../../../lib/creditCost';
import { AI_STYLE_PRESETS, PROVIDER_LABELS, SELECTABLE_VIDEO_PROVIDERS } from './constants';
import type { VideoStudio } from './useVideoStudio';

/** Prompt tab: describe the video, pick a format and engine, generate. */
export const PromptPanel: React.FC<{ studio: VideoStudio }> = ({ studio }) => {
  const {
    creditRates,
    handleGenerateFromPrompt,
    handleImprovePrompt,
    handleUndoImprove,
    improveError,
    isImprovingPrompt,
    prompt,
    promptBeforeImprove,
    provider,
    setImproveError,
    setPrompt,
    setProvider,
    setShowAdvanced,
    setStylePresetId,
    setTemplateCategory,
    showAdvanced,
    stylePreset,
    stylePresetId,
    templateCategory,
  } = studio;
  // Ctrl+Z / Ctrl+Y over every change, including templates, Speak and Improve with AI.
  const history = useTextHistory(prompt, setPrompt);
  /** A template picked while the box has the person's own words: asks before replacing them. */
  const [pendingTemplate, setPendingTemplate] = useState<VideoPromptTemplate | null>(null);

  const applyTemplate = (t: VideoPromptTemplate) => {
    setPrompt(t.prompt);
    setStylePresetId(t.presetId);
    setImproveError(null);
    setPendingTemplate(null);
  };

  const pickTemplate = (t: VideoPromptTemplate) => {
    const current = prompt.trim();
    if (current && current !== t.prompt.trim()) setPendingTemplate(t);
    else applyTemplate(t);
  };

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-900 dark:text-white">
            What's the video about?
          </label>
          <div className="flex items-center gap-3">
            <VoiceInputButton
              onText={(spoken) => setPrompt((prev) => appendSpoken(prev, spoken))}
              currentText={prompt}
              onReplace={(spoken) => setPrompt(spoken)}
            />
            <button
              type="button"
              onClick={handleImprovePrompt}
              disabled={isImprovingPrompt}
              title={
                prompt.trim()
                  ? 'Keeps your idea and adds the camera move, lighting, mood and sound'
                  : 'Suggest a video prompt'
              }
              className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:no-underline"
            >
              {isImprovingPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
              <span>{prompt.trim() ? 'Improve with AI' : 'Generate with AI'}</span>
            </button>
            {promptBeforeImprove !== null && !isImprovingPrompt && (
              <button
                type="button"
                onClick={handleUndoImprove}
                title="Put back what you wrote before Improve with AI"
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:underline"
              >
                Undo
              </button>
            )}
          </div>
        </div>
        <textarea
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={history.onKeyDown}
          placeholder="e.g. A drone shot flying over a futuristic city at sunset, glowing blue skyscrapers"
          className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
        />
        {improveError && <p className="text-[11px] text-red-500">{improveError}</p>}
        <p className="text-[10px] text-slate-400">
          Ctrl+Z undoes a change and Ctrl+Y brings it back. Repeating the same prompt, length and format reuses your
          saved clip for free.
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Start from a template</h3>
        <div className="flex flex-wrap gap-1.5">
          {VIDEO_PROMPT_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setTemplateCategory(category)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                templateCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        {pendingTemplate && (
          <div
            role="alertdialog"
            aria-label="Replace your prompt?"
            className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-2"
          >
            <p className="text-[11px] text-amber-900 dark:text-amber-200 leading-snug">
              Replace what you wrote with the <span className="font-bold">{pendingTemplate.title}</span> template? Your
              text will be replaced (Ctrl+Z brings it back).
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyTemplate(pendingTemplate)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold"
              >
                Replace my prompt
              </button>
              <button
                type="button"
                onClick={() => setPendingTemplate(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-[11px] font-bold"
              >
                Keep my prompt
              </button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {VIDEO_PROMPT_TEMPLATES.filter((t) => t.category === templateCategory).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pickTemplate(t)}
              className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-all"
            >
              <p className="text-xs font-bold text-slate-900 dark:text-white">{t.title}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-3">
                {t.prompt}
              </p>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-400">
          Pick one, then edit the words to match your own business before generating.
        </p>
      </div>

      <div className="space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Choose a format
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {AI_STYLE_PRESETS.map((t) => {
            const Icon = t.icon;
            const isActive = t.id === stylePresetId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setStylePresetId(t.id)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/30 ring-1 ring-blue-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <Icon className={`w-4 h-4 mb-1.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <p className="text-xs font-bold text-slate-900 dark:text-white">{t.label}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  {t.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className={SELECTABLE_VIDEO_PROVIDERS.length > 1 ? undefined : 'hidden'}>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          {showAdvanced ? 'Hide' : 'Show'} advanced options
        </button>
        {showAdvanced && SELECTABLE_VIDEO_PROVIDERS.length > 1 && (
          <div className="mt-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
              Generation engine
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as api.VideoProvider)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
            >
              {SELECTABLE_VIDEO_PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LABELS[p]}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1.5">
              {import.meta.env.PROD
                ? 'AI video uses more credits than images or voice.'
                : 'Veo needs a paid Google key configured on the backend; Mock always works and is meant for trying the flow out.'}
            </p>
          </div>
        )}
      </div>

      <button
        onClick={() => handleGenerateFromPrompt()}
        disabled={!prompt.trim()}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-[0.99] transition-all disabled:opacity-50"
      >
        <Sparkles className="w-4 h-4" />
        <span>
          {creditRates
            ? `Generate Video · ${creditLabel(videoCreditCost(creditRates, provider, stylePreset.durationSeconds))}`
            : 'Generate Video'}
        </span>
      </button>
      {creditRates && (
        <p className="text-[10px] text-slate-400 text-center -mt-3">
          A {stylePreset.durationSeconds}-second clip, charged when it starts. Asking for the same video again
          is free.
        </p>
      )}
    </div>
  );
};
