import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Copy,
  Loader2,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Trash2,
  Upload,
  UserRound,
  Wand2,
} from 'lucide-react';
import { ViewType } from '../../types';
import * as api from '../../lib/api';
import { SchedulePostPanel } from '../SchedulePostPanel';
import { OutOfCreditsNotice } from '../OutOfCreditsNotice';

interface CharacterStudioViewProps {
  onNavigate: (view: ViewType) => void;
}

type Step = 'create' | 'generating' | 'result';
type LibraryTab = 'existing' | 'upload';

// A handful of well-known Microsoft neural voices - D-ID's "microsoft" TTS
// provider and the free "edge" voice provider SadTalker uses both draw from
// the same underlying catalog, so this one list covers either provider.
const VOICE_OPTIONS = [
  { id: 'en-US-JennyNeural', label: 'Jenny (US, female)' },
  { id: 'en-US-GuyNeural', label: 'Guy (US, male)' },
  { id: 'en-GB-SoniaNeural', label: 'Sonia (UK, female)' },
  { id: 'en-GB-RyanNeural', label: 'Ryan (UK, male)' },
  { id: 'en-IN-NeerjaNeural', label: 'Neerja (India, female)' },
  { id: 'en-IN-PrabhatNeural', label: 'Prabhat (India, male)' },
];

const PROVIDER_OPTIONS: { id: api.CharacterProvider; label: string; hint: string }[] = [
  { id: 'did', label: 'D-ID', hint: 'Paid API - usually 30s to a couple of minutes' },
  { id: 'sadtalker', label: 'SadTalker (local)', hint: 'Free, runs on this machine - can take tens of minutes on CPU' },
  {
    id: 'wav2lip',
    label: 'Wav2Lip (local)',
    hint: 'Free, runs on this machine - lip-sync only (no head movement), faster than SadTalker',
  },
];

const POLL_TIMEOUT_MS: Record<api.CharacterProvider, number> = {
  did: 300_000, // 5 min
  sadtalker: 90 * 60_000, // 90 min - CPU inference on this machine is slow
  wav2lip: 45 * 60_000, // 45 min - lighter model than SadTalker, but still CPU-bound here
};

export const CharacterStudioView: React.FC<CharacterStudioViewProps> = ({ onNavigate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('create');
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [sourceImagePreview, setSourceImagePreview] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<api.Avatar | null>(null);
  const [script, setScript] = useState('');
  const [voiceId, setVoiceId] = useState(VOICE_OPTIONS[0].id);
  const [provider, setProvider] = useState<api.CharacterProvider>('did');
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [isImprovingScript, setIsImprovingScript] = useState(false);
  const [activeTab, setActiveTab] = useState<LibraryTab>('existing');
  const [avatars, setAvatars] = useState<api.Avatar[]>([]);
  const [avatarSearch, setAvatarSearch] = useState('');
  const [avatarFilter, setAvatarFilter] = useState<'all' | 'favorites' | 'recently_used' | 'recently_created'>('all');
  const [avatarCategory, setAvatarCategory] = useState<api.AvatarCategory | 'all'>('all');
  const [avatarSort, setAvatarSort] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(false);
  const [avatarName, setAvatarName] = useState('');
  const [avatarDescription, setAvatarDescription] = useState('');
  const [avatarTags, setAvatarTags] = useState('');
  const [avatarSaveMessage, setAvatarSaveMessage] = useState<string | null>(null);
  const [voiceTemplates, setVoiceTemplates] = useState<api.VoiceTemplate[]>([]);

  const loadAvatars = async () => {
    setIsLoadingAvatars(true);
    try {
      const result = await api.listAvatars({
        search: avatarSearch.trim() || undefined,
        category: avatarCategory,
        filter: avatarFilter,
        sortBy: avatarSort,
      });
      setAvatars(result.items);
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not load avatars.');
    } finally {
      setIsLoadingAvatars(false);
    }
  };

  useEffect(() => {
    void loadAvatars();
  }, [avatarSearch, avatarFilter, avatarCategory, avatarSort]);

  useEffect(() => {
    api.listVoiceTemplates().then(setVoiceTemplates).catch(() => undefined);
  }, []);

  const handleImproveScript = async () => {
    setIsImprovingScript(true);
    setError(null);
    try {
      const result = await api.generateText(
        script.trim()
          ? {
              prompt: script.trim(),
              systemPrompt:
                'You are a scriptwriter for short talking-avatar videos. Rewrite the ' +
                "user's draft so it sounds natural when read aloud by an AI avatar: fix " +
                'grammar, tighten the flow, keep it engaging, and preserve the core ' +
                'message, names, and facts. Keep it roughly the same length (aim for ' +
                '10-25 seconds spoken, about 25-70 words). Reply with only the script ' +
                'text - no quotes, no preamble, no explanation.',
            }
          : {
              prompt: 'Write a short, friendly spoken introduction for a talking-avatar video.',
              systemPrompt:
                'You are a scriptwriter for short talking-avatar videos. Write a natural, ' +
                'engaging 10-20 second spoken script (about 25-50 words) introducing ' +
                'someone or something, suitable as a generic starting point the user will ' +
                'edit. Reply with only the script text - no quotes, no preamble, no explanation.',
            },
      );
      setScript(result.text.trim());
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not reach the Lumora API. Please try again.');
    } finally {
      setIsImprovingScript(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSourceImage(file);
    setSourceImagePreview(URL.createObjectURL(file));
    setSelectedAvatar(null);
    if (!avatarName.trim()) setAvatarName(file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
    setError(null);
  };

  const handleUseAvatar = async (avatar: api.Avatar) => {
    setSelectedAvatar(avatar);
    setSourceImage(null);
    setSourceImagePreview(avatar.thumbnailUrl || avatar.imageUrl);
    if (avatar.voiceId) setVoiceId(avatar.voiceId);
    await api.recordAvatarUsage(avatar.id).catch(() => undefined);
  };

  const handleSaveAvatar = async () => {
    if (!sourceImage || !avatarName.trim()) return;
    setAvatarSaveMessage(null);
    setError(null);
    try {
      const avatar = await api.createAvatarFromFile(sourceImage, {
        name: avatarName.trim(),
        description: avatarDescription.trim() || undefined,
        category: avatarCategory === 'all' ? 'custom' : avatarCategory,
        tags: avatarTags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        voiceId,
        provider: 'mock',
      });
      setAvatarSaveMessage('Avatar saved to library.');
      setSelectedAvatar(avatar);
      setActiveTab('existing');
      await loadAvatars();
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not save avatar.');
    }
  };

  const handleGenerate = async () => {
    if ((!sourceImage && !selectedAvatar) || !script.trim()) return;
    setStep('generating');
    setError(null);
    setOutOfCredits(false);
    setProgressLabel('Uploading your photo...');
    try {
      const job = selectedAvatar
        ? await api.generateCharacterVideoFromUrl({
            sourceImageUrl: selectedAvatar.imageUrl,
            script: script.trim(),
            provider,
            voiceId: selectedAvatar.voiceId ?? voiceId,
          })
        : await api.generateCharacterVideo({
            sourceImage: sourceImage as File,
            script: script.trim(),
            provider,
            voiceId,
          });
      setProgressLabel(
        provider !== 'did' ? 'Animating your character (this can take a while on CPU)...' : 'Animating your character...',
      );
      const final = await api.pollCharacterJob(provider, job.jobId, {
        timeoutMs: POLL_TIMEOUT_MS[provider],
        onUpdate: () =>
          setProgressLabel(
            provider !== 'did'
              ? 'Animating your character (this can take a while on CPU)...'
              : 'Animating your character...',
          ),
      });
      if (final.status === 'completed' && final.videoUrl) {
        const videoBlob = await fetch(final.videoUrl).then((r) => r.blob());
        setFinalVideoUrl(URL.createObjectURL(videoBlob));
        setStep('result');
      } else {
        const label = PROVIDER_OPTIONS.find((p) => p.id === provider)?.label ?? provider;
        setError(
          final.errorMessage
            ? `${label} could not render this character video: ${final.errorMessage}`
            : `${label} could not render this character video. Please try a different photo or script.`,
        );
        setStep('create');
      }
    } catch (err) {
      if (err instanceof api.ApiError && err.status === 402) {
        setOutOfCredits(true);
      } else {
        setError(err instanceof api.ApiError ? err.message : 'Could not reach the Lumora API. Please try again.');
      }
      setStep('create');
    }
  };

  const resetAll = () => {
    setStep('create');
    setSourceImage(null);
    setSourceImagePreview(null);
    setSelectedAvatar(null);
    setScript('');
    setError(null);
    setFinalVideoUrl(null);
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {step === 'create' && (
        <div className="max-w-5xl mx-auto space-y-5">
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1">
            {[
              ['existing', 'Existing Avatars'],
              ['upload', 'Upload New'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id as LibraryTab)}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                  activeTab === id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'existing' && (
            <div className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_150px_150px_150px]">
                <label className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={avatarSearch}
                    onChange={(e) => setAvatarSearch(e.target.value)}
                    placeholder="Search avatars..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-3 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>
                <select value={avatarFilter} onChange={(e) => setAvatarFilter(e.target.value as typeof avatarFilter)} className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                  <option value="all">All</option>
                  <option value="favorites">Favorites</option>
                  <option value="recently_used">Recently Used</option>
                  <option value="recently_created">Recently Created</option>
                </select>
                <select value={avatarCategory} onChange={(e) => setAvatarCategory(e.target.value as typeof avatarCategory)} className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                  <option value="all">All Categories</option>
                  <option value="business">Business</option>
                  <option value="marketing">Marketing</option>
                  <option value="education">Education</option>
                  <option value="custom">Custom</option>
                </select>
                <select value={avatarSort} onChange={(e) => setAvatarSort(e.target.value as typeof avatarSort)} className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="name">Name</option>
                </select>
              </div>

              {isLoadingAvatars ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                  ))}
                </div>
              ) : avatars.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-700">
                  <UserRound className="mx-auto h-9 w-9 text-slate-400" />
                  <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">No avatars found.</p>
                  <button onClick={() => setActiveTab('upload')} className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                    Create your first AI avatar.
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {avatars.map((avatar) => (
                    <div key={avatar.id} className={`rounded-xl border bg-white p-3 shadow-sm dark:bg-slate-900 ${selectedAvatar?.id === avatar.id ? 'border-blue-600' : 'border-slate-200 dark:border-slate-700'}`}>
                      <button type="button" onClick={() => void handleUseAvatar(avatar)} className="block aspect-square w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                        <img src={avatar.thumbnailUrl || avatar.imageUrl} alt={avatar.name} className="h-full w-full object-cover" />
                      </button>
                      <div className="mt-3 min-h-[76px]">
                        <p className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{avatar.name}</p>
                        <p className="mt-0.5 text-[11px] font-bold capitalize text-slate-500 dark:text-slate-400">{avatar.category}</p>
                        <p className="mt-1 text-[10px] text-slate-400">Created: {new Date(avatar.createdAt).toLocaleDateString()}</p>
                        <div className="mt-1 flex text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round((avatar.qualityScore ?? 80) / 20) ? 'fill-current' : ''}`} />)}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-1">
                        <button title="Use Avatar" onClick={() => void handleUseAvatar(avatar)} className="col-span-4 rounded-lg bg-blue-600 px-2 py-2 text-xs font-bold text-white hover:bg-blue-500">Use Avatar</button>
                        <button title="Favorite" onClick={() => api.favoriteAvatar(avatar.id, !avatar.isFavorite).then(loadAvatars)} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700"><Star className={`mx-auto h-4 w-4 ${avatar.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-500'}`} /></button>
                        <button title="Duplicate" onClick={() => api.duplicateAvatar(avatar.id).then(loadAvatars)} className="rounded-lg border border-slate-200 p-2 text-slate-500 dark:border-slate-700"><Copy className="mx-auto h-4 w-4" /></button>
                        <button title="Rename" onClick={() => {
                          const next = window.prompt('Avatar name', avatar.name);
                          if (next?.trim()) void api.updateAvatar(avatar.id, { name: next.trim() }).then(loadAvatars);
                        }} className="rounded-lg border border-slate-200 p-2 text-slate-500 dark:border-slate-700"><Wand2 className="mx-auto h-4 w-4" /></button>
                        <button title="Delete" onClick={() => api.deleteAvatar(avatar.id).then(loadAvatars)} className="rounded-lg border border-slate-200 p-2 text-red-500 dark:border-slate-700"><Trash2 className="mx-auto h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'upload' && (
          <div className="max-w-xl mx-auto space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-white mb-2">
              Character photo
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelected}
              className="hidden"
            />
            {sourceImagePreview ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative block w-full aspect-square max-w-xs mx-auto rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 group"
              >
                <img src={sourceImagePreview} alt="Selected character" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
                  <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-bold">
                    Change photo
                  </span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-square max-w-xs mx-auto flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all"
              >
                <UserRound className="w-10 h-10" />
                <span className="flex items-center gap-1.5 text-xs font-bold">
                  <Upload className="w-3.5 h-3.5" /> Upload a portrait photo
                </span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={avatarName}
              onChange={(e) => setAvatarName(e.target.value)}
              placeholder="Avatar Name"
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <select value={avatarCategory} onChange={(e) => setAvatarCategory(e.target.value as typeof avatarCategory)} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              <option value="custom">Custom</option>
              <option value="business">Business</option>
              <option value="marketing">Marketing</option>
              <option value="education">Education</option>
            </select>
            <input
              value={avatarTags}
              onChange={(e) => setAvatarTags(e.target.value)}
              placeholder="Tags, comma separated"
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <input
              value={avatarDescription}
              onChange={(e) => setAvatarDescription(e.target.value)}
              placeholder="Description"
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-900 dark:text-white">
                What should they say?
              </label>
              <button
                type="button"
                onClick={handleImproveScript}
                disabled={isImprovingScript}
                title={script.trim() ? 'Improve this script with AI' : 'Generate a script with AI'}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {isImprovingScript ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Wand2 className="w-3 h-3" />
                )}
                <span>{script.trim() ? 'Improve with AI' : 'Generate with AI'}</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Hi, welcome to Lumora! I'm excited to show you..."
              maxLength={2000}
              className="w-full text-sm p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            />
          </div>

          {voiceTemplates.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-2">
                From your saved voice templates
              </label>
              <select
                value=""
                onChange={(e) => {
                  const template = voiceTemplates.find((t) => t.id === e.target.value);
                  if (template) setVoiceId(template.voiceId);
                }}
                className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              >
                <option value="" disabled>
                  Load a saved template...
                </option>
                {voiceTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.provider}, {t.language})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                D-ID/SadTalker only recognize Microsoft/edge-style voice ids - templates saved from
                other providers (e.g. Piper) may not be understood here.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-white mb-2">Voice</label>
            <select
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            >
              {!VOICE_OPTIONS.some((v) => v.id === voiceId) && (
                <option value={voiceId}>{voiceId} (from template)</option>
              )}
              {VOICE_OPTIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-white mb-2">
              Generation engine
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDER_OPTIONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    provider === p.id
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/30'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{p.label}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{p.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {outOfCredits && <OutOfCreditsNotice onNavigate={onNavigate} />}

          {error && !outOfCredits && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-xs leading-snug">{error}</p>
            </div>
          )}

          {avatarSaveMessage && <p className="text-center text-xs font-bold text-emerald-600">{avatarSaveMessage}</p>}

          <button
            type="button"
            onClick={handleSaveAvatar}
            disabled={!sourceImage || !avatarName.trim()}
            className="w-full rounded-xl border border-blue-200 bg-blue-50 py-3 text-sm font-bold text-blue-700 transition-all hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
          >
            Save Avatar to Library
          </button>

          <button
            onClick={handleGenerate}
            disabled={(!sourceImage && !selectedAvatar) || !script.trim()}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Character Video</span>
          </button>

          <p className="text-center text-[10px] text-slate-400">
            {provider === 'did'
              ? 'D-ID needs a paid API key configured on the backend (DID_API_KEY).'
              : provider === 'sadtalker'
                ? 'SadTalker runs locally on this machine (see SADTALKER_PYTHON_PATH/SADTALKER_DIR) - CPU-only rendering here is slow.'
                : 'Wav2Lip runs locally on this machine (see WAV2LIP_PYTHON_PATH/WAV2LIP_DIR/WAV2LIP_CHECKPOINT_PATH) - lip-sync only, faster than SadTalker but no head movement.'}
          </p>
          </div>
          )}

          {activeTab === 'existing' && selectedAvatar && (
            <div className="mx-auto max-w-xl space-y-5 rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/20">
              <div className="flex items-center gap-3">
                <img src={selectedAvatar.thumbnailUrl || selectedAvatar.imageUrl} alt={selectedAvatar.name} className="h-14 w-14 rounded-lg object-cover" />
                <div>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white">{selectedAvatar.name}</p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Selected avatar</p>
                </div>
              </div>

              <textarea
                rows={4}
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Hi, welcome to Lumora! I'm excited to show you..."
                maxLength={2000}
                className="w-full text-sm p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />

              <button
                onClick={handleGenerate}
                disabled={!script.trim()}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Character Video</span>
              </button>
            </div>
          )}
        </div>
      )}

      {step === 'generating' && (
        <div className="max-w-lg mx-auto py-20 flex flex-col items-center text-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{progressLabel}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {PROVIDER_OPTIONS.find((p) => p.id === provider)?.label} ·{' '}
              {PROVIDER_OPTIONS.find((p) => p.id === provider)?.hint}
            </p>
          </div>
        </div>
      )}

      {step === 'result' && finalVideoUrl && (
        <div className="max-w-xl mx-auto space-y-5">
          <video
            src={finalVideoUrl}
            controls
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-black"
          />

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={finalVideoUrl}
              download="lumora-character.mp4"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition-all"
            >
              <Upload className="w-4 h-4 rotate-180" />
              <span>Download MP4</span>
            </a>
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Create another</span>
            </button>
          </div>

          <SchedulePostPanel finalVideoUrl={finalVideoUrl} defaultCaption={script} onNavigate={onNavigate} />
        </div>
      )}
    </div>
  );
};
