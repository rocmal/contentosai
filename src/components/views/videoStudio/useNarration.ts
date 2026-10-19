import { useEffect, useRef, useState } from 'react';
import * as api from '../../../lib/api';
import { type NarrationAudio, takeNarrationAudio } from '../../../lib/reuse';
import { measureAudioSeconds } from '../../../lib/audioDuration';
import { sarvamVoiceSampleUrl } from '../../../lib/sarvamVoices';
import { MAX_SCENE_TOTAL_SECONDS, NARRATION_WORDS_PER_SECOND, NarrationGender, NarrationLanguage } from './constants';

type SetError = (message: string | null) => void;

/** Scene Builder narration: one of your own voice recordings, or a typed script read by a Sarvam voice. */
export function useNarration({ setError }: { setError: SetError }) {
  // A saved voice recording sent here from Voice Studio opens the Scene Builder, where it becomes the narration.
  const [recordedNarration, setRecordedNarration] = useState<NarrationAudio | null>(() => takeNarrationAudio());
  // Voices the person recorded in Voice Studio, offered as narration as they were recorded.
  const [myRecordings, setMyRecordings] = useState<api.CustomVoice[]>([]);
  useEffect(() => {
    api.listCustomVoices().then(setMyRecordings).catch(() => undefined);
  }, []);
  // A reopened draft's recording while its current address is looked up; autosave keeps the id meanwhile.
  const [pendingRecordingId, setPendingRecordingId] = useState<string | null>(null);
  const [draftRecordingNote, setDraftRecordingNote] = useState<string | null>(null);
  const resumeCountRef = useRef(0);
  // The recording's real length, keyed by its address so a result for an earlier recording is never shown.
  const [recordingLength, setRecordingLength] = useState<{ url: string; seconds: number | null } | null>(null);
  useEffect(() => {
    const url = recordedNarration?.url;
    if (!url) return;
    let cancelled = false;
    measureAudioSeconds(url).then((seconds) => {
      if (!cancelled) setRecordingLength({ url, seconds });
    });
    return () => {
      cancelled = true;
    };
  }, [recordedNarration?.url]);
  const recordedNarrationSeconds =
    recordedNarration && recordingLength?.url === recordedNarration.url ? recordingLength.seconds : null;
  // Which entry of "My recorded voices" is the narration ('sent' = one that is not in the list).
  const recordedNarrationOptionId = !recordedNarration
    ? ''
    : (myRecordings.find((v) => v.id === recordedNarration.voiceId || v.sampleUrl === recordedNarration.url)?.id ??
      'sent');
  /** Picks a recording (or none) as the narration, replacing whatever a reopened draft was still looking up. */
  const chooseRecordedNarration = (audio: NarrationAudio | null) => {
    setRecordedNarration(audio);
    setPendingRecordingId(null);
    setDraftRecordingNote(null);
  };
  const [narrationText, setNarrationText] = useState('');
  const [narrationLanguage, setNarrationLanguage] = useState<NarrationLanguage>('hi');
  const [narrationGender, setNarrationGender] = useState<NarrationGender>('female');
  const [narrationVoiceId, setNarrationVoiceId] = useState('');
  const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Estimated spoken length of the narration script, so a too-long script
  // can be caught before generating (rather than discovered as a trimmed
  // audio track afterward). Capped display-side at MAX_SCENE_TOTAL_SECONDS
  // since the video can never run longer than that regardless of scenes.
  const narrationWordCount = narrationText.trim() ? narrationText.trim().split(/\s+/).length : 0;
  const narrationEstimatedSeconds = Math.ceil(narrationWordCount / NARRATION_WORDS_PER_SECOND);
  // With a recording, its real length (once measured); otherwise the typed script's estimate.
  const narrationSeconds = recordedNarration ? Math.ceil(recordedNarrationSeconds ?? 0) : narrationEstimatedSeconds;
  const narrationFitsCap = narrationSeconds <= MAX_SCENE_TOTAL_SECONDS;

  // Plays a pre-generated local sample (see scripts/generate-sarvam-voice-
  // samples.mjs) - no API call, so auditioning voices is instant and free.
  const handlePreviewVoice = (id: string) => {
    previewAudioRef.current?.pause();
    if (previewingVoiceId === id) {
      setPreviewingVoiceId(null);
      previewAudioRef.current = null;
      return;
    }
    const audio = new Audio(sarvamVoiceSampleUrl(id, narrationLanguage));
    audio.addEventListener('ended', () => setPreviewingVoiceId(null));
    audio.play().catch(() => setPreviewingVoiceId(null));
    previewAudioRef.current = audio;
    setPreviewingVoiceId(id);
  };

  // Same generic text-generation endpoint/pattern as Character Studio's
  // "Improve with AI"/"Generate with AI" script button (see
  // CharacterStudioView.tsx's handleImproveScript) - reworded for a
  // narrated slideshow instead of a talking-avatar script, and capped
  // shorter to fit Scene Builder's 30s ceiling.
  const handleGenerateNarration = async () => {
    setIsGeneratingNarration(true);
    setError(null);
    try {
      const narrationLanguageName = narrationLanguage === 'hi' ? 'hindi' : 'english';
      const narrationLanguageNote =
        narrationLanguage === 'hi' ? ' Write the narration in Hindi (Devanagari script).' : '';
      const result = await api.generateText(
        narrationText.trim()
          ? {
              language: narrationLanguageName,
              prompt: narrationText.trim(),
              systemPrompt:
                'You are a scriptwriter for short narrated slideshow videos (images/clips ' +
                "shown in sequence with voiceover). Rewrite the user's draft so it sounds " +
                'natural when read aloud: fix grammar, tighten the flow, keep it engaging, ' +
                'and preserve the core message. It must fit in under 30 seconds spoken ' +
                '(roughly 60-75 words max). Reply with only the narration text - no ' +
                'quotes, no preamble, no explanation.' +
                narrationLanguageNote,
            }
          : {
              language: narrationLanguageName,
              prompt: 'Write a short narration for a slideshow video.',
              systemPrompt:
                'You are a scriptwriter for short narrated slideshow videos (images/clips ' +
                'shown in sequence with voiceover). Write a natural, engaging narration ' +
                'under 30 seconds spoken (roughly 40-70 words), suitable as a generic ' +
                'starting point the user will edit. Reply with only the narration text - ' +
                'no quotes, no preamble, no explanation.' +
                narrationLanguageNote,
            },
      );
      setNarrationText(result.text.trim());
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not reach the Lumora API. Please try again.');
    } finally {
      setIsGeneratingNarration(false);
    }
  };

  /** A reopened draft's script and voice settings; its recording is looked up fresh, since its address can change. */
  const restoreNarration = (project: api.VideoProject) => {
    setNarrationText(project.narrationText ?? '');
    if (project.narrationVoiceId) setNarrationVoiceId(project.narrationVoiceId);
    if (project.narrationGender === 'male' || project.narrationGender === 'female') {
      setNarrationGender(project.narrationGender);
    }
    if (project.narrationLanguage === 'en' || project.narrationLanguage === 'hi') {
      setNarrationLanguage(project.narrationLanguage);
    }
    const resume = ++resumeCountRef.current;
    setRecordedNarration(null);
    setDraftRecordingNote(null);
    setPendingRecordingId(project.narrationRecordingId);
    const wanted = project.narrationRecordingId;
    if (wanted) {
      api
        .listCustomVoices()
        .then((voices) => {
          if (resume !== resumeCountRef.current) return;
          setMyRecordings(voices);
          const found = voices.find((v) => v.id === wanted);
          if (found?.sampleUrl) {
            setRecordedNarration({ name: found.name, url: found.sampleUrl, voiceId: found.id });
          } else {
            setDraftRecordingNote('The voice recording this draft used has been deleted, so the typed script is used instead.');
          }
          setPendingRecordingId(null);
        })
        .catch(() => {
          if (resume !== resumeCountRef.current) return;
          setDraftRecordingNote('Could not load the voice recording this draft uses. Reload the page to try again.');
        });
    }
  };

  /** "Start over": no script and no recording, and any recording lookup still running for a draft is ignored. */
  const resetNarration = () => {
    setNarrationText('');
    setNarrationVoiceId('');
    resumeCountRef.current += 1;
    chooseRecordedNarration(null);
  };

  return {
    chooseRecordedNarration,
    draftRecordingNote,
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
    narrationWordCount,
    pendingRecordingId,
    previewingVoiceId,
    recordedNarration,
    recordedNarrationOptionId,
    recordedNarrationSeconds,
    resetNarration,
    restoreNarration,
    setNarrationGender,
    setNarrationLanguage,
    setNarrationText,
    setNarrationVoiceId,
  };
}

export type Narration = ReturnType<typeof useNarration>;
