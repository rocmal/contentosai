import React from 'react';
import { Info, Loader2, Mic, Pause, Play, Wand2 } from 'lucide-react';
import VoiceInputButton, { appendSpoken } from '../../VoiceInputButton';
import { SARVAM_VOICE_BY_GENDER } from '../../../lib/sarvamVoices';
import { SarvamVoiceSelect } from '../../SarvamVoiceSelect';
import {
  MAX_SCENE_TOTAL_SECONDS,
  NARRATION_GENDER_LABELS,
  NARRATION_LANGUAGE_LABELS,
  NARRATION_WORDS_PER_SECOND,
  NarrationGender,
  NarrationLanguage,
} from './constants';
import type { VideoStudio } from './useVideoStudio';
import { useTextHistory } from '../../../lib/useTextHistory';

/** Scene Builder: a recorded voice or a typed script read by a Sarvam voice. */
export const NarrationPanel: React.FC<{ studio: VideoStudio }> = ({ studio }) => {
  const {
    chooseRecordedNarration,
    draftRecordingNote,
    handleFitScenesToNarration,
    handleGenerateNarration,
    handlePreviewVoice,
    isGeneratingNarration,
    myRecordings,
    narrationFitsCap,
    narrationGender,
    narrationLanguage,
    narrationSeconds,
    narrationText,
    narrationVoiceId,
    narrationWillBeTrimmed,
    narrationWordCount,
    previewingVoiceId,
    recordedNarration,
    recordedNarrationOptionId,
    recordedNarrationSeconds,
    sceneCappedEstimatedSeconds,
    sceneEstimateExceedsMax,
    sceneRawEstimatedSeconds,
    scenes,
    setNarrationGender,
    setNarrationLanguage,
    setNarrationText,
    setNarrationVoiceId,
  } = studio;
  // Ctrl+Z / Ctrl+Y over every change, including Speak and Improve with AI.
  const narrationHistory = useTextHistory(narrationText, setNarrationText);
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <Mic className="w-3 h-3" /> Narration (optional)
        </div>
        {!recordedNarration && (
          <button
            type="button"
            onClick={handleGenerateNarration}
            disabled={isGeneratingNarration}
            title={narrationText.trim() ? 'Improve this narration with AI' : 'Generate a narration with AI'}
            className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:no-underline"
          >
            {isGeneratingNarration ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Wand2 className="w-3 h-3" />
            )}
            <span>{narrationText.trim() ? 'Improve with AI' : 'Generate with AI'}</span>
          </button>
        )}
      </div>
      <select
        value={recordedNarrationOptionId}
        onChange={(e) => {
          const picked = myRecordings.find((v) => v.id === e.target.value);
          if (picked?.sampleUrl) chooseRecordedNarration({ name: picked.name, url: picked.sampleUrl, voiceId: picked.id });
          else if (!e.target.value) chooseRecordedNarration(null);
        }}
        className="w-full text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
      >
        <option value="">
          {myRecordings.length === 0
            ? 'My recorded voices: none yet (record one in Voice Studio)'
            : 'My recorded voices: use a typed script instead'}
        </option>
        {recordedNarrationOptionId === 'sent' && recordedNarration && (
          <option value="sent">{recordedNarration.name}</option>
        )}
        {myRecordings
          .filter((v) => v.sampleUrl)
          .map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
      </select>
      {draftRecordingNote && <p className="text-[10px] text-amber-600 dark:text-amber-400">{draftRecordingNote}</p>}
      {recordedNarration && (
        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
              Using your own recording: {recordedNarration.name}
            </span>
            <button
              type="button"
              onClick={() => chooseRecordedNarration(null)}
              className="font-semibold text-slate-500 hover:text-red-600 shrink-0"
            >
              Remove
            </button>
          </div>
          <audio controls src={recordedNarration.url} className="w-full h-9" />
          <p className="text-[10px] text-slate-500">
            It plays as the narration of this video, as recorded
            {recordedNarrationSeconds !== null ? ` (${Math.round(recordedNarrationSeconds)} seconds)` : ''}. No narration
            credits are used.
            {narrationText.trim() && ' Your typed script is kept and used again if you remove the recording.'}
          </p>
        </div>
      )}
      {!recordedNarration && (
        <>
          <textarea
            rows={3}
            value={narrationText}
            onChange={(e) => setNarrationText(e.target.value)}
            onKeyDown={narrationHistory.onKeyDown}
            placeholder="What should the narrator say across this whole video?"
            className="w-full text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
          />
          <div className="flex justify-end">
            <VoiceInputButton
              language={narrationLanguage === 'hi' ? 'hi-IN' : 'en-IN'}
              onText={(spoken) => setNarrationText((prev) => appendSpoken(prev, spoken))}
              currentText={narrationText}
              onReplace={(spoken) => setNarrationText(spoken)}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80">
              {(Object.keys(NARRATION_LANGUAGE_LABELS) as NarrationLanguage[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setNarrationLanguage(lang)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                    narrationLanguage === lang
                      ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {NARRATION_LANGUAGE_LABELS[lang]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80">
              {(Object.keys(NARRATION_GENDER_LABELS) as NarrationGender[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setNarrationGender(g)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                    narrationGender === g
                      ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {NARRATION_GENDER_LABELS[g]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-1.5">
            <div className="flex-1 min-w-0">
              <SarvamVoiceSelect
                value={narrationVoiceId}
                onChange={setNarrationVoiceId}
                previewingVoiceId={previewingVoiceId}
                onPreview={handlePreviewVoice}
                genderFilter={narrationGender}
              />
            </div>
            <button
              type="button"
              onClick={() =>
                handlePreviewVoice(narrationVoiceId || SARVAM_VOICE_BY_GENDER[narrationGender].voiceId)
              }
              title="Preview the current selection (plays a local sample, no API call)"
              className="shrink-0 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors"
            >
              {previewingVoiceId === (narrationVoiceId || SARVAM_VOICE_BY_GENDER[narrationGender].voiceId) ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </>
      )}

      {scenes.length > 0 && (
        <p className={`text-[10px] ${sceneEstimateExceedsMax ? 'text-red-500 dark:text-red-400' : 'text-slate-400'}`}>
          ~{sceneCappedEstimatedSeconds}s video total ({MAX_SCENE_TOTAL_SECONDS}s max
          {sceneEstimateExceedsMax ? ' - slides scaled down to fit' : ''})
          . Set each slide's length below.
        </p>
      )}

      {narrationWillBeTrimmed && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <div className="space-y-1.5">
            <p className="text-[11px] leading-snug">
              {recordedNarration
                ? `Your recording is ${narrationSeconds}s but your scenes only total ${sceneRawEstimatedSeconds}s - it will be cut off partway through.`
                : `Narration is ~${narrationSeconds}s (~${narrationWordCount} words) but your scenes only total ${sceneRawEstimatedSeconds}s - the audio will be cut off partway through.`}
              {!narrationFitsCap &&
                (recordedNarration
                  ? ` Even at the full ${MAX_SCENE_TOTAL_SECONDS}s video limit, the end of the recording will be cut - record a shorter one to keep all of it.`
                  : ` Even at the full ${MAX_SCENE_TOTAL_SECONDS}s video limit, this script won't fully fit - trim it to roughly ${MAX_SCENE_TOTAL_SECONDS * NARRATION_WORDS_PER_SECOND} words or fewer to avoid clipping.`)}
            </p>
            <button
              type="button"
              onClick={handleFitScenesToNarration}
              className="text-[11px] font-bold text-amber-700 dark:text-amber-400 underline underline-offset-2 hover:no-underline"
            >
              Extend scenes to {Math.min(narrationSeconds, MAX_SCENE_TOTAL_SECONDS)}s
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
