import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  Download,
  Mic,
  Pause,
  Play,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import { ViewType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../lib/api';
import { OutOfCreditsNotice } from '../OutOfCreditsNotice';
import { SarvamVoiceSelect } from '../SarvamVoiceSelect';
import RecordVoicePanel from '../RecordVoicePanel';
import VoiceInputButton, { appendSpoken } from '../VoiceInputButton';
import { takeReuse } from '../../lib/reuse';
import { creditLabel, useCreditRates, voiceCreditCost } from '../../lib/creditCost';
import { requestGallerySearch, requestNarrationAudio } from '../../lib/reuse';
import { SARVAM_VOICE_BY_GENDER, SARVAM_VOICE_CATALOG, sarvamVoiceSampleUrl } from '../../lib/sarvamVoices';

interface VoiceStudioViewProps {
  onNavigate: (view: ViewType) => void;
}

const PROVIDER_INFO: Record<api.VoiceProvider, { name: string; description: string }> = {
  edge: { name: 'Microsoft Edge TTS', description: 'Free, local dev - no account or key needed' },
  elevenlabs: { name: 'ElevenLabs', description: 'Expressive, natural-sounding voices' },
  cartesia: { name: 'Cartesia', description: 'Low-latency, deep narration' },
  azure: { name: 'Azure Speech', description: 'Enterprise-grade neural TTS' },
  piper: { name: 'Piper (offline)', description: 'Fully offline fallback - no internet or account needed' },
  sarvam: { name: 'Sarvam AI', description: 'Natural Indian voices in Hindi, Punjabi and English' },
};

// TEMPORARY: keeping pure Indian-accent voices only for now - Sarvam is the
// only provider actually built for Indian accents, the rest are generic/
// Western TTS. Nothing removed from the backend or api.VOICE_PROVIDERS, so
// restoring the full list later is just switching this back to
// `api.VOICE_PROVIDERS`.
const VISIBLE_VOICE_PROVIDERS: readonly api.VoiceProvider[] = ['sarvam'];

type Language = 'hi' | 'pa' | 'en';

const LANGUAGE_LABELS: Record<Language, string> = { hi: 'हिंदी Hindi', pa: 'ਪੰਜਾਬੀ Punjabi', en: 'English' };

/** An example script in each language, shown in the empty script box (same wording as the phone app). */
const SCRIPT_PLACEHOLDER: Record<Language, string> = {
  hi: 'उदाहरण: नमस्ते! अपने परिवार के भविष्य को सुरक्षित करें…',
  pa: 'ਉਦਾਹਰਨ: ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਆਪਣੇ ਪਰਿਵਾਰ ਦੇ ਭਵਿੱਖ ਨੂੰ ਸੁਰੱਖਿਅਤ ਕਰੋ…',
  en: 'For example: Hello! Plan today for your family’s tomorrow…',
};

const DICTATION_LANGUAGE: Record<Language, api.TranscribeLanguage> = { hi: 'hi-IN', pa: 'pa-IN', en: 'en-IN' };

/** Voice samples exist in English and Hindi; Punjabi plays the Hindi one (as in the phone app). */
const sampleLanguage = (language: Language) => (language === 'en' ? 'en' : 'hi');

// Piper is the one provider with confirmed, installed voices per language -
// picking a language here swaps its voiceId directly. Other providers keep
// manual voiceId entry (see the input below) since we haven't verified a
// Hindi voice id for each of them; `language` is still saved with the
// template either way so it stays a meaningful filter later.
const PIPER_VOICE_BY_LANGUAGE: Partial<Record<Language, string>> = {
  en: 'en_US-lessac-medium',
  hi: 'hi_IN-priyamvada-medium',
};

// Sarvam takes a BCP-47 language_code rather than swapping voiceId per
// language - every bulbul:v3 speaker covers en-IN, hi-IN and pa-IN.
const SARVAM_LANGUAGE_CODE: Record<Language, string> = {
  hi: 'hi-IN',
  pa: 'pa-IN',
  en: 'en-IN',
};

type Gender = 'female' | 'male';

const GENDER_LABELS: Record<Gender, string> = { female: 'Female', male: 'Male' };

export const VoiceStudioView: React.FC<VoiceStudioViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [text, setText] = useState(() => takeReuse('voice')?.prompt ?? '');
  // Sarvam is the only provider actually built for Indian accents - the
  // rest (Edge/ElevenLabs/Cartesia/Azure/Piper) are generic/Western TTS.
  const [provider, setProvider] = useState<api.VoiceProvider>('sarvam');
  const [language, setLanguage] = useState<Language>('hi');
  const [gender, setGender] = useState<Gender>('female');
  const [voiceId, setVoiceId] = useState('');
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [speed, setSpeed] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const creditRates = useCreditRates();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [voiceTemplates, setVoiceTemplates] = useState<api.VoiceTemplate[]>([]);
  const [showSaveTemplatePanel, setShowSaveTemplatePanel] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateVisibility, setTemplateVisibility] = useState<api.VoiceTemplateVisibility>('private');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [saveTemplateStatus, setSaveTemplateStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Voices the user recorded themselves. Picking one switches to the provider
  // that holds the clone (they cannot be spoken by Sarvam).
  const [customVoices, setCustomVoices] = useState<api.CustomVoice[]>([]);
  const [selectedCustomId, setSelectedCustomId] = useState('');
  const [showRecordPanel, setShowRecordPanel] = useState(false);
  const [confirmDeleteCustom, setConfirmDeleteCustom] = useState(false);
  const [customVoiceError, setCustomVoiceError] = useState<string | null>(null);
  const [activatingCustom, setActivatingCustom] = useState(false);
  const selectedCustomVoice = customVoices.find((v) => v.id === selectedCustomId) ?? null;

  useEffect(() => {
    api.listVoiceTemplates().then(setVoiceTemplates).catch(() => undefined);
    api.listCustomVoices().then(setCustomVoices).catch(() => undefined);
  }, []);

  const pickCustomVoice = (id: string) => {
    setConfirmDeleteCustom(false);
    setCustomVoiceError(null);
    const voice = customVoices.find((v) => v.id === id);
    if (!voice) {
      // Back to the standard voices.
      setSelectedCustomId('');
      setProvider('sarvam');
      setVoiceId('');
      return;
    }
    setSelectedCustomId(voice.id);
    // A recording that has not been cloned cannot speak yet; keep the standard voice for generating.
    if (voice.cloned && voice.voiceId) {
      setProvider(voice.provider);
      setVoiceId(voice.voiceId);
    } else {
      setProvider('sarvam');
      setVoiceId('');
    }
  };

  const handleActivateCustomVoice = async () => {
    if (!selectedCustomVoice) return;
    setCustomVoiceError(null);
    setActivatingCustom(true);
    try {
      const updated = await api.activateCustomVoice(selectedCustomVoice.id);
      setCustomVoices((previous) => previous.map((v) => (v.id === updated.id ? updated : v)));
      if (updated.voiceId) {
        setProvider(updated.provider);
        setVoiceId(updated.voiceId);
      }
    } catch (err) {
      setCustomVoiceError(err instanceof api.ApiError ? err.message : 'Could not reach the Lumora API. Please try again.');
    } finally {
      setActivatingCustom(false);
    }
  };

  const handleCustomVoiceSaved = (voice: api.CustomVoice, galleryCopySaved: boolean) => {
    setCustomVoices((previous) => [voice, ...previous]);
    setShowRecordPanel(false);
    setSelectedCustomId(voice.id);
    setCustomVoiceError(
      galleryCopySaved
        ? null
        : `"${voice.name}" is saved and ready to use, but its copy in the Gallery could not be made, so it will not appear there.`,
    );
    if (voice.cloned && voice.voiceId) {
      setProvider(voice.provider);
      setVoiceId(voice.voiceId);
    }
  };

  const handleDeleteCustomVoice = async () => {
    if (!selectedCustomVoice) return;
    setCustomVoiceError(null);
    try {
      await api.deleteCustomVoice(selectedCustomVoice.id);
      setCustomVoices((previous) => previous.filter((v) => v.id !== selectedCustomVoice.id));
      pickCustomVoice('');
    } catch (err) {
      setCustomVoiceError(err instanceof api.ApiError ? err.message : 'Could not delete this voice. Please try again.');
    } finally {
      setConfirmDeleteCustom(false);
    }
  };

  const handleSelectLanguage = (lang: Language) => {
    setLanguage(lang);
    if (provider === 'piper') {
      setVoiceId(PIPER_VOICE_BY_LANGUAGE[lang] ?? '');
    }
  };

  // Plays a pre-generated local sample (see scripts/generate-sarvam-voice-
  // samples.mjs) - no API call, so auditioning voices is instant and free.
  const handlePreviewVoice = (id: string) => {
    previewAudioRef.current?.pause();
    if (previewingVoiceId === id) {
      setPreviewingVoiceId(null);
      previewAudioRef.current = null;
      return;
    }
    const audio = new Audio(sarvamVoiceSampleUrl(id, sampleLanguage(language)));
    audio.addEventListener('ended', () => setPreviewingVoiceId(null));
    audio.play().catch(() => setPreviewingVoiceId(null));
    previewAudioRef.current = audio;
    setPreviewingVoiceId(id);
  };

  const handleSelectProvider = (p: api.VoiceProvider) => {
    setSelectedCustomId('');
    setProvider(p);
    if (p === 'piper') {
      setVoiceId(PIPER_VOICE_BY_LANGUAGE[language] ?? '');
    } else if (p === 'sarvam') {
      // Reset rather than carry over another provider's voiceId (e.g.
      // "en-US-AriaNeural" typed for Azure) - Sarvam's dropdown defaults to
      // "Auto" (Gender-based) until the user explicitly picks a voice.
      setVoiceId('');
    }
  };

  const handleGenerateSpeech = async () => {
    setIsGenerating(true);
    setError(null);
    setOutOfCredits(false);
    try {
      // The Voice dropdown writes a specific catalog id into voiceId - look
      // up its model there. If nothing's picked (still on "Auto"), fall
      // back to the Gender toggle's confirmed bulbul:v2 default.
      let sarvamVoiceId: string | undefined;
      let sarvamModel: string | undefined;
      if (provider === 'sarvam') {
        const picked = voiceId.trim() ? SARVAM_VOICE_CATALOG.find((v) => v.id === voiceId.trim()) : undefined;
        const fallback = voiceId.trim() ? null : SARVAM_VOICE_BY_GENDER[gender];
        sarvamVoiceId = picked?.id ?? fallback?.voiceId ?? (voiceId.trim() || undefined);
        sarvamModel = picked?.model ?? fallback?.model;
      }
      const result = await api.generateSpeech({
        text,
        provider,
        voiceId: provider === 'sarvam' ? sarvamVoiceId : voiceId.trim() || undefined,
        model: sarvamModel,
        languageCode: provider === 'sarvam' ? SARVAM_LANGUAGE_CODE[language] : undefined,
      });
      setAudioUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return result.audioUrl;
      });
      setIsPlaying(false);
    } catch (err) {
      if (err instanceof api.ApiError && err.status === 402) {
        setOutOfCredits(true);
      } else {
        setError(
          err instanceof api.ApiError
            ? err.message
            : 'Could not reach Lumora. Check your internet connection and try again.',
        );
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTogglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.playbackRate = speed;
      void audio.play();
    } else {
      audio.pause();
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !user?.organizationId || !user?.workspaceId) return;
    setIsSavingTemplate(true);
    setSaveTemplateStatus('idle');
    try {
      const saved = await api.saveVoiceTemplate({
        organizationId: user.organizationId,
        workspaceId: user.workspaceId,
        name: templateName.trim(),
        provider,
        voiceId: voiceId.trim() || PIPER_VOICE_BY_LANGUAGE[language] || '',
        language,
        visibility: templateVisibility,
      });
      setVoiceTemplates((previous) => [saved, ...previous]);
      setSaveTemplateStatus('saved');
      setTemplateName('');
      window.setTimeout(() => setShowSaveTemplatePanel(false), 1200);
    } catch {
      setSaveTemplateStatus('error');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handlePickTemplate = (template: api.VoiceTemplate) => {
    if (api.VOICE_PROVIDERS.includes(template.provider as api.VoiceProvider)) {
      setProvider(template.provider as api.VoiceProvider);
    }
    if (template.language in LANGUAGE_LABELS) {
      setLanguage(template.language as Language);
    }
    setVoiceId(template.voiceId);
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Providers Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Voice Provider
          </h3>
          {VISIBLE_VOICE_PROVIDERS.map((p) => (
            <div
              key={p}
              onClick={() => handleSelectProvider(p)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                provider === p
                  ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/30'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {PROVIDER_INFO[p].name}
                </h4>
                <p className="text-[10px] text-slate-500">{PROVIDER_INFO[p].description}</p>
              </div>
              <Volume2 className={`w-4 h-4 ${provider === p ? 'text-blue-600' : 'text-slate-400'}`} />
            </div>
          ))}

          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
              Language
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(LANGUAGE_LABELS) as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleSelectLanguage(lang)}
                  className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                    language === lang
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {LANGUAGE_LABELS[lang]}
                </button>
              ))}
            </div>
            {provider !== 'piper' && provider !== 'sarvam' && !selectedCustomVoice && (
              <p className="text-[10px] text-slate-500 mt-1">
                Only Piper/Sarvam auto-select a voice per language right now - set the Voice ID below for other providers.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">My recorded voices</label>
            <select
              value={selectedCustomId}
              onChange={(e) => pickCustomVoice(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            >
              <option value="">
                {customVoices.length === 0 ? 'None yet - record one below' : 'Use a standard voice'}
              </option>
              {customVoices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.cloned ? voice.name : voice.name + ' (recording only)'}
                </option>
              ))}
            </select>

            {selectedCustomVoice && (
              <div className="mt-1.5 flex items-center justify-between gap-2">
                {selectedCustomVoice.cloned ? (
                  <p className="text-[10px] text-emerald-600">
                    Speaking in your voice "{selectedCustomVoice.name}" ({PROVIDER_INFO[selectedCustomVoice.provider].name}).
                  </p>
                ) : (
                  <p className="text-[10px] text-emerald-600">
                    "{selectedCustomVoice.name}" is saved. Use it in a video as it is, or find it in your Gallery.
                  </p>
                )}
                {confirmDeleteCustom ? (
                  <span className="flex items-center gap-2 text-[10px] shrink-0">
                    <button type="button" onClick={handleDeleteCustomVoice} className="font-bold text-red-600">
                      Delete
                    </button>
                    <button type="button" onClick={() => setConfirmDeleteCustom(false)} className="text-slate-500">
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteCustom(true)}
                    className="text-[10px] font-semibold text-slate-400 hover:text-red-600 shrink-0"
                  >
                    Delete this voice
                  </button>
                )}
              </div>
            )}
            {selectedCustomVoice && !selectedCustomVoice.cloned && (
              <div className="mt-2 space-y-1.5">
                {selectedCustomVoice.sampleUrl && (
                  <audio controls src={selectedCustomVoice.sampleUrl} className="w-full h-9" />
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedCustomVoice.sampleUrl) return;
                      requestNarrationAudio({
                        name: selectedCustomVoice.name,
                        url: selectedCustomVoice.sampleUrl,
                        voiceId: selectedCustomVoice.id,
                      });
                      onNavigate('video-studio');
                    }}
                    disabled={!selectedCustomVoice.sampleUrl}
                    className="py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold disabled:opacity-50"
                  >
                    Use in a video
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      requestGallerySearch(selectedCustomVoice.name);
                      onNavigate('media-library');
                    }}
                    className="py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-[11px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    View in Gallery
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleActivateCustomVoice}
                  disabled={activatingCustom}
                  className="w-full py-2 rounded-xl border border-blue-300 text-blue-700 dark:text-blue-300 text-[11px] font-bold hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50"
                >
                  {activatingCustom ? 'Making your voice...' : 'Also make it read new scripts (needs voice cloning)'}
                </button>
              </div>
            )}
            {customVoiceError && <p className="text-[10px] text-red-600 mt-1">{customVoiceError}</p>}

            <button
              type="button"
              onClick={() => setShowRecordPanel((open) => !open)}
              className="mt-2 w-full py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-blue-400 flex items-center justify-center gap-1.5"
            >
              <Mic className="w-3.5 h-3.5" /> {showRecordPanel ? 'Close recorder' : 'Record your own voice'}
            </button>
            {showRecordPanel && (
              <div className="mt-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <RecordVoicePanel onSaved={handleCustomVoiceSaved} />
              </div>
            )}
          </div>

          {provider === 'sarvam' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                  Voice Gender
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(GENDER_LABELS) as Gender[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                        gender === g
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {GENDER_LABELS[g]}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Used when Voice below is on "Auto".
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                  Voice
                </label>
                <div className="flex gap-1.5">
                  <div className="flex-1 min-w-0">
                    <SarvamVoiceSelect
                      value={voiceId}
                      onChange={setVoiceId}
                      previewingVoiceId={previewingVoiceId}
                      onPreview={handlePreviewVoice}
                      genderFilter={gender}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePreviewVoice(voiceId.trim() || SARVAM_VOICE_BY_GENDER[gender].voiceId)}
                    title="Listen to a short sample of this voice (free)"
                    className="shrink-0 w-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors"
                  >
                    {previewingVoiceId === (voiceId.trim() || SARVAM_VOICE_BY_GENDER[gender].voiceId) ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {SARVAM_VOICE_CATALOG.length} voices. Press play to hear a short sample for free.
                </p>
              </div>
            </>
          )}

          {provider !== 'sarvam' && !selectedCustomVoice && (
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                Voice ID (optional)
              </label>
              <input
                type="text"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                placeholder="e.g. en-US-AriaNeural - provider default used if empty"
                className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />
            </div>
          )}

          {voiceTemplates.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Your saved voice templates
              </h3>
              <div className="space-y-2">
                {voiceTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handlePickTemplate(template)}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {template.name}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {PROVIDER_INFO[template.provider as api.VoiceProvider]?.name ?? template.provider} · {LANGUAGE_LABELS[template.language as Language] ?? template.language}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        template.visibility === 'team'
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {template.visibility === 'team' ? 'Team' : 'Private'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Text Area & Audio Synthesizer */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="voice-script" className="block text-xs font-bold text-slate-900 dark:text-white">
                  What should the voice say?
                </label>
                <VoiceInputButton
                  language={DICTATION_LANGUAGE[language]}
                  onText={(spoken) => setText((previous) => appendSpoken(previous, spoken))}
                />
              </div>
              <textarea
                id="voice-script"
                rows={5}
                value={text}
                placeholder={SCRIPT_PLACEHOLDER[language]}
                onChange={(e) => setText(e.target.value)}
                className="w-full text-xs p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                  Playback Speed ({speed.toFixed(2)}x)
                </label>
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.05"
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleGenerateSpeech}
                disabled={isGenerating || !text.trim()}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-95 transition-all disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>
                  {isGenerating
                    ? 'Making your voiceover...'
                    : creditRates && text.trim()
                      ? `Create voiceover · ${creditLabel(voiceCreditCost(creditRates, provider, text))}`
                      : 'Create voiceover'}
                </span>
              </button>
              <button
                onClick={() => setShowSaveTemplatePanel(true)}
                title="Save this provider + voice as a reusable template"
                className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center"
              >
                <Bookmark className="w-4 h-4" />
              </button>
            </div>

            {showSaveTemplatePanel && (
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5" /> Save as voice template
                  </h4>
                  <button
                    onClick={() => setShowSaveTemplatePanel(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  maxLength={150}
                  placeholder="e.g. Hindi narrator - Priya"
                  className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  {(['private', 'team'] as const).map((visibility) => (
                    <button
                      key={visibility}
                      onClick={() => setTemplateVisibility(visibility)}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                        templateVisibility === visibility
                          ? 'border-blue-600 bg-blue-100/60 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {visibility === 'private' ? 'Just me' : 'My whole team'}
                    </button>
                  ))}
                </div>
                {saveTemplateStatus === 'error' && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <p className="text-[11px] leading-snug">Could not save the template. Try again.</p>
                  </div>
                )}
                <button
                  onClick={handleSaveTemplate}
                  disabled={isSavingTemplate || !templateName.trim()}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors disabled:opacity-50"
                >
                  {saveTemplateStatus === 'saved' ? 'Saved!' : isSavingTemplate ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            )}

            {outOfCredits && <OutOfCreditsNotice onNavigate={onNavigate} />}

            {error && !outOfCredits && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <p className="text-[11px] leading-snug">{error}</p>
              </div>
            )}

            {/* Audio player - shown once a voiceover exists */}
            {audioUrl && (
              <div className="p-4 rounded-xl bg-slate-950 text-white flex items-center justify-between gap-4">
                <button
                  onClick={handleTogglePlay}
                  title={isPlaying ? 'Pause' : 'Play'}
                  className="p-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-transform active:scale-95"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                <div className="flex-1 flex items-center gap-1 h-8">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full bg-blue-500/80 transition-all ${
                        isPlaying ? 'animate-pulse' : ''
                      }`}
                      style={{ height: `${Math.max(20, Math.sin(i) * 100)}%` }}
                    />
                  ))}
                </div>

                <a
                  href={audioUrl}
                  download="lumora-voiceover"
                  title="Download"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <Download className="w-4 h-4" />
                </a>

                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
