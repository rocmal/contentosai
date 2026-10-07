import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Download,
  Eye,
  FolderCheck,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { ViewType } from '../../types';
import * as api from '../../lib/api';
import VoiceInputButton, { appendSpoken } from '../VoiceInputButton';
import {
  distinctRatios,
  IMAGE_PLATFORM_NAMES,
  IMAGE_TARGETS,
  ImageTarget,
  renderTargetBlob,
} from '../../lib/imagePlatforms';
import { OutOfCreditsNotice } from '../OutOfCreditsNotice';

interface ImageStudioViewProps {
  onNavigate: (view: ViewType) => void;
}

type RatioResult =
  | { state: 'loading' }
  | { state: 'done'; image: string; model: string }
  | { state: 'error'; message: string };

type SaveState = { state: 'saving' } | { state: 'saved' } | { state: 'error'; message: string };

const COMPOSITION_NOTE =
  'Keep the main subject centred with generous empty margin around it, so the picture still works when it is trimmed for different social platforms.';
const NO_TEXT_NOTE = 'Do not include any text, letters, numbers, logos or watermarks in the image.';

function describeError(err: unknown): string {
  return err instanceof api.ApiError ? err.message : 'Could not reach the Lumora API. Is the backend running?';
}

export const ImageStudioView: React.FC<ImageStudioViewProps> = ({ onNavigate }) => {
  const [prompt, setPrompt] = useState('');
  const [noText, setNoText] = useState(true);
  const [selected, setSelected] = useState<string[]>(['ig-post', 'fb-post']);

  const [options, setOptions] = useState<api.ImageProviderOption[] | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [provider, setProvider] = useState<api.ImageProvider | null>(null);
  const [quality, setQuality] = useState<api.ImageQuality>('standard');

  const [balance, setBalance] = useState<number | null | undefined>(undefined);
  const [results, setResults] = useState<Record<string, RatioResult>>({});
  const [saves, setSaves] = useState<Record<string, SaveState>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const [lastRunCredits, setLastRunCredits] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const refreshBalance = () => {
    api
      .getMyCreditWallet()
      .then((w) => setBalance(w.balance))
      .catch(() => setBalance(null));
  };

  useEffect(() => {
    refreshBalance();
    api
      .getImageOptions()
      .then(({ providers }) => {
        setOptions(providers);
        const first = providers.find((p) => p.configured) ?? providers.find((p) => p.recommended) ?? providers[0];
        if (first) setProvider(first.id);
      })
      .catch((err) => setOptionsError(describeError(err)));
  }, []);

  const providerOption = options?.find((p) => p.id === provider) ?? null;
  const tierCredits = providerOption?.qualities.find((q) => q.id === quality)?.credits ?? null;

  // Keep the quality valid for the chosen vendor (Stability has no Draft tier).
  useEffect(() => {
    if (providerOption && !providerOption.qualities.some((q) => q.id === quality)) {
      setQuality(providerOption.qualities.find((q) => q.id === 'standard')?.id ?? providerOption.qualities[0].id);
    }
  }, [providerOption, quality]);

  const targets = useMemo(() => IMAGE_TARGETS.filter((t) => selected.includes(t.id)), [selected]);
  const ratios = useMemo(() => distinctRatios(selected), [selected]);
  const missingRatios = ratios.filter((r) => results[r]?.state !== 'done' && results[r]?.state !== 'loading');
  const hasAnyResult = ratios.some((r) => results[r]?.state === 'done');

  const costFor = (count: number) => (tierCredits === null ? null : tierCredits * count);
  const insufficient = (cost: number | null) =>
    cost !== null && typeof balance === 'number' && cost > balance;

  const toggleTarget = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const fullPrompt = () => [prompt.trim(), COMPOSITION_NOTE, noText ? NO_TEXT_NOTE : ''].filter(Boolean).join(' ');

  const runRatio = async (ratio: api.ImageAspectRatio): Promise<number> => {
    setResults((prev) => ({ ...prev, [ratio]: { state: 'loading' } }));
    try {
      const result = await api.generateImage({
        prompt: fullPrompt(),
        provider: provider as api.ImageProvider,
        quality,
        aspectRatio: ratio,
        count: 1,
        saveToGallery: false,
      });
      const image = result.images[0];
      if (!image) throw new api.ApiError(502, 'The provider returned no image.');
      setResults((prev) => ({ ...prev, [ratio]: { state: 'done', image, model: result.model } }));
      return result.creditsUsed ?? 0;
    } catch (err) {
      if (err instanceof api.ApiError && err.status === 402) {
        setOutOfCredits(true);
        setResults((prev) => ({ ...prev, [ratio]: { state: 'error', message: 'Not enough credits.' } }));
      } else {
        setResults((prev) => ({ ...prev, [ratio]: { state: 'error', message: describeError(err) } }));
      }
      return 0;
    }
  };

  const generate = async (onlyMissing: boolean) => {
    if (!provider || !prompt.trim()) return;
    const toRun = onlyMissing ? missingRatios : ratios;
    if (toRun.length === 0) return;
    setIsGenerating(true);
    setOutOfCredits(false);
    setLastRunCredits(null);
    if (!onlyMissing) setSaves({});
    const used = await Promise.all(toRun.map((ratio) => runRatio(ratio)));
    setLastRunCredits(used.reduce((sum, n) => sum + n, 0));
    refreshBalance();
    setIsGenerating(false);
  };

  const imageFor = (target: ImageTarget): string | null => {
    const r = results[target.generateRatio];
    return r?.state === 'done' ? r.image : null;
  };

  const download = async (target: ImageTarget) => {
    const source = imageFor(target);
    if (!source) return;
    try {
      const blob = await renderTargetBlob(source, target.width, target.height);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lumora-${target.id}-${target.width}x${target.height}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setSaves((prev) => ({ ...prev, [target.id]: { state: 'error', message: describeError(err) } }));
    }
  };

  const saveToGallery = async (target: ImageTarget) => {
    const source = imageFor(target);
    if (!source) return;
    setSaves((prev) => ({ ...prev, [target.id]: { state: 'saving' } }));
    try {
      const blob = await renderTargetBlob(source, target.width, target.height);
      const file = new File([blob], `${target.id}-${target.width}x${target.height}-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });
      await api.uploadToGallery(file);
      setSaves((prev) => ({ ...prev, [target.id]: { state: 'saved' } }));
    } catch (err) {
      setSaves((prev) => ({ ...prev, [target.id]: { state: 'error', message: describeError(err) } }));
    }
  };

  const saveAll = async () => {
    for (const target of targets) {
      if (imageFor(target) && saves[target.id]?.state !== 'saved') {
        // Sequential on purpose: a handful of uploads, and it keeps the progress readable.
        // eslint-disable-next-line no-await-in-loop
        await saveToGallery(target);
      }
    }
  };

  const generateCount = hasAnyResult && missingRatios.length > 0 ? missingRatios.length : ratios.length;
  const generateCost = costFor(generateCount);
  const canGenerate =
    !isGenerating &&
    Boolean(provider && providerOption?.configured) &&
    prompt.trim().length > 0 &&
    ratios.length > 0 &&
    !insufficient(generateCost);
  const firstDone = ratios
    .map((r) => results[r])
    .find((r): r is Extract<RatioResult, { state: 'done' }> => r?.state === 'done');
  const previewTarget = previewId ? IMAGE_TARGETS.find((t) => t.id === previewId) ?? null : null;
  const previewImage = previewTarget ? imageFor(previewTarget) : null;
  const savedCount = targets.filter((t) => saves[t.id]?.state === 'saved').length;
  const readyCount = targets.filter((t) => imageFor(t)).length;

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400">
              <ImageIcon className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Image Studio</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Describe an image once, pick where it will be posted, and get a correctly sized version for each platform.
            Preview first, then save the ones you like to your gallery.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Credits</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {balance === undefined ? '...' : balance === null ? 'Unlimited' : balance.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-900 dark:text-white">What should the image show?</label>
                <VoiceInputButton onText={(spoken) => setPrompt((prev) => appendSpoken(prev, spoken))} />
              </div>
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={1500}
                placeholder="e.g. A happy Indian family planning their child's future at home, warm morning light, natural photo style"
                className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />
              <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                <input type="checkbox" checked={noText} onChange={(e) => setNoText(e.target.checked)} />
                No text in the image (recommended - add your wording in a design tool)
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Where will you post it?</label>
              <p className="text-[10px] text-slate-400 mb-2">Pick one or more. Each gets its own exact size.</p>
              <div className="space-y-2">
                {IMAGE_PLATFORM_NAMES.map((platform) => (
                  <div key={platform}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{platform}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {IMAGE_TARGETS.filter((t) => t.platform === platform).map((t) => {
                        const on = selected.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => toggleTarget(t.id)}
                            aria-pressed={on}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                              on
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {t.label}
                            <span className="ml-1 font-normal opacity-70">
                              {t.width}x{t.height}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={options && options.length <= 1 && options[0]?.configured ? 'hidden' : undefined}>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">AI provider</label>
              {optionsError && <p className="text-[11px] text-red-500">{optionsError}</p>}
              {options === null && !optionsError && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
              <div className="space-y-2">
                {options?.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!p.configured}
                    onClick={() => setProvider(p.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      provider === p.id
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700'
                    } ${p.configured ? '' : 'opacity-50 cursor-not-allowed'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{p.label}</span>
                      <span className="text-[10px] font-semibold">
                        {!p.configured ? (
                          <span className="text-amber-600">Not set up on this server</span>
                        ) : p.recommended ? (
                          <span className="text-emerald-600">Recommended</span>
                        ) : null}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{p.note}</p>
                  </button>
                ))}
              </div>
            </div>

            {providerOption && (
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Quality</label>
                <div className="space-y-1.5">
                  {providerOption.qualities.map((q) => (
                    <label
                      key={q.id}
                      className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border cursor-pointer text-[11px] ${
                        quality === q.id
                          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-900/20'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <input type="radio" name="quality" checked={quality === q.id} onChange={() => setQuality(q.id)} />
                        {q.label}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white whitespace-nowrap">{q.credits} cr / image</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
              <p>
                {targets.length} platform{targets.length === 1 ? '' : 's'} selected, {ratios.length} image
                {ratios.length === 1 ? '' : 's'} to generate
                {targets.length > ratios.length ? ' (platforms with the same shape share one)' : ''}.
              </p>
              <p className="font-bold text-slate-900 dark:text-white">
                {generateCost === null ? 'Choose a provider to see the cost' : `${generateCost} credits for this run`}
                {typeof balance === 'number' && generateCost !== null ? ` (you have ${balance.toLocaleString()})` : ''}
              </p>
              <p className="text-slate-400">Credits are used when an image is generated, and refunded if it fails.</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => generate(hasAnyResult && missingRatios.length > 0)}
                disabled={!canGenerate}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-95 transition-all disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>
                  {isGenerating
                    ? 'Generating...'
                    : hasAnyResult && missingRatios.length > 0
                      ? `Generate ${missingRatios.length} new image${missingRatios.length === 1 ? '' : 's'}`
                      : hasAnyResult
                        ? 'Generate again'
                        : `Generate ${ratios.length} image${ratios.length === 1 ? '' : 's'}`}
                </span>
              </button>
              {hasAnyResult && missingRatios.length > 0 && (
                <button
                  onClick={() => generate(false)}
                  disabled={isGenerating || insufficient(costFor(ratios.length))}
                  className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate all ({costFor(ratios.length)} credits)
                </button>
              )}
              {insufficient(generateCost) && (
                <p className="text-[11px] text-amber-600">
                  Not enough credits for this run. Pick fewer platforms, a lower quality, or{' '}
                  <button onClick={() => onNavigate('billing')} className="underline font-semibold">
                    add credits
                  </button>
                  .
                </p>
              )}
              {outOfCredits && <OutOfCreditsNotice onNavigate={onNavigate} />}
              {lastRunCredits !== null && (
                <p className="text-[11px] text-slate-500">
                  Last run used {lastRunCredits} credit{lastRunCredits === 1 ? '' : 's'}.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {readyCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {savedCount} of {readyCount} saved to your gallery. Images are only kept if you save them.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={saveAll}
                  disabled={savedCount === readyCount}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <FolderCheck className="w-3.5 h-3.5" /> Save all to gallery
                </button>
                {savedCount > 0 && (
                  <button
                    onClick={() => onNavigate('media-library')}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Open gallery
                  </button>
                )}
              </div>
            </div>
          )}

          {targets.length === 0 ? (
            <div className="p-10 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">
              Pick at least one platform on the left.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
              {targets.map((t) => {
                const result = results[t.generateRatio];
                const image = imageFor(t);
                const save = saves[t.id];
                return (
                  <div
                    key={t.id}
                    className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
                  >
                    <div
                      className="relative bg-slate-950 flex items-center justify-center"
                      style={{ aspectRatio: `${t.width} / ${t.height}` }}
                    >
                      {image ? (
                        <img src={image} alt={`${t.label} preview`} className="w-full h-full object-cover" />
                      ) : result?.state === 'loading' ? (
                        <div className="text-center space-y-2">
                          <Sparkles className="w-6 h-6 text-blue-400 animate-spin mx-auto" />
                          <p className="text-[11px] text-slate-400">Generating...</p>
                        </div>
                      ) : result?.state === 'error' ? (
                        <div className="flex items-start gap-2 p-3 text-red-300 max-w-full">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <p className="text-[11px] leading-snug break-words min-w-0">{result.message}</p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 px-4 text-center">Not generated yet</p>
                      )}
                    </div>
                    <div className="p-3 space-y-2">
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{t.label}</p>
                        <p className="text-[10px] text-slate-400">
                          {t.width} x {t.height} px
                        </p>
                      </div>
                      {image && (
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            onClick={() => setPreviewId(t.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> Preview
                          </button>
                          <button
                            onClick={() => download(t)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> Download
                          </button>
                          <button
                            onClick={() => saveToGallery(t)}
                            disabled={save?.state === 'saving' || save?.state === 'saved'}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 ${
                              save?.state === 'saved'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-60'
                            }`}
                          >
                            {save?.state === 'saving' ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : save?.state === 'saved' ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <FolderCheck className="w-3 h-3" />
                            )}
                            {save?.state === 'saved' ? 'Saved' : save?.state === 'saving' ? 'Saving...' : 'Save to gallery'}
                          </button>
                        </div>
                      )}
                      {save?.state === 'error' && <p className="text-[11px] text-red-500">{save.message}</p>}
                      {result?.state === 'error' && (
                        <button
                          onClick={() => runRatio(t.generateRatio).then(refreshBalance)}
                          disabled={isGenerating}
                          className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Try again (no credits were used for the failed attempt)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {readyCount > 0 && providerOption && (
            <p className="text-[10px] text-slate-400">
              Created with {providerOption.label}
              {firstDone ? ` (${firstDone.model})` : ''}. AI images can contain mistakes - check faces, hands and any
              text before posting.
            </p>
          )}
        </div>
      </div>

      {/* Full-size preview, shown exactly as it will be saved */}
      {previewTarget && previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewId(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${previewTarget.label} preview`}
        >
          <div className="max-w-3xl w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between text-white">
              <p className="text-sm font-bold">
                {previewTarget.label} <span className="font-normal opacity-70">{previewTarget.width} x {previewTarget.height} px</span>
              </p>
              <button onClick={() => setPreviewId(null)} aria-label="Close preview" className="p-1.5 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-center">
              <div
                className="bg-slate-950 rounded-xl overflow-hidden"
                style={{
                  aspectRatio: `${previewTarget.width} / ${previewTarget.height}`,
                  maxHeight: '75vh',
                  maxWidth: '100%',
                  width: previewTarget.height > previewTarget.width ? 'auto' : '100%',
                }}
              >
                <img src={previewImage} alt={`${previewTarget.label} full preview`} className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => download(previewTarget)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
              <button
                onClick={() => saveToGallery(previewTarget)}
                disabled={saves[previewTarget.id]?.state === 'saving' || saves[previewTarget.id]?.state === 'saved'}
                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <FolderCheck className="w-3.5 h-3.5" />
                {saves[previewTarget.id]?.state === 'saved' ? 'Saved to gallery' : 'Save to gallery'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
