import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Square } from 'lucide-react';
import * as api from '../lib/api';

interface VoiceInputButtonProps {
  /** Called with the transcribed text; the caller decides how to merge it into its field. */
  onText: (text: string) => void;
  /** Pin the spoken language, or leave as 'auto' to detect Hindi / Punjabi / English. */
  language?: api.TranscribeLanguage;
  className?: string;
  /** Icon-only (for tight spaces such as the Co-pilot box). */
  compact?: boolean;
  /** What the box holds now. With onReplace, a box that already has text asks whether to add what was said or
   * replace it, instead of always adding to the end. */
  currentText?: string;
  onReplace?: (text: string) => void;
}

const MAX_SECONDS = 60;

/** Maps a content-language choice (english/hindi/punjabi/hinglish) to the spoken language to listen for. */
export function spokenLanguageFor(contentLanguage?: string): api.TranscribeLanguage {
  switch (contentLanguage) {
    case 'hindi':
      return 'hi-IN';
    case 'punjabi':
      return 'pa-IN';
    case 'english':
      return 'en-IN';
    default:
      return 'auto'; // hinglish mixes languages - let the engine detect
  }
}

/** Adds dictated text after whatever is already in the field. */
export function appendSpoken(existing: string, spoken: string): string {
  return existing.trim() ? `${existing.trim()} ${spoken}` : spoken;
}

type Phase = 'idle' | 'recording' | 'processing';

/**
 * Dictation button: tap to record, tap again to stop. The recording is sent to
 * the server (Sarvam speech-to-text) and the text is handed to `onText`.
 */
export default function VoiceInputButton({
  onText,
  language = 'auto',
  className = '',
  compact = false,
  currentText,
  onReplace,
}: VoiceInputButtonProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  /** What was said, waiting for "Add to the end" or "Replace" (the box already had text). */
  const [pending, setPending] = useState<string | null>(null);
  // The recorder's stop handler outlives the render that started it, so it reads the latest text from a ref.
  const currentTextRef = useRef(currentText);
  useEffect(() => {
    currentTextRef.current = currentText;
  }, [currentText]);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

  const releaseMic = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  // Never leave the microphone open if the screen is closed mid-recording.
  useEffect(() => releaseMic, []);

  const start = async () => {
    setError(null);
    setPending(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        releaseMic();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size === 0) {
          setPhase('idle');
          return;
        }
        setPhase('processing');
        try {
          const result = await api.transcribeAudio(blob, language);
          const spoken = result.text.trim();
          if (!spoken) return;
          if (onReplace && currentTextRef.current?.trim()) setPending(spoken);
          else onText(spoken);
        } catch (err) {
          setError(err instanceof api.ApiError ? err.message : 'Could not reach the server. Please try again.');
        } finally {
          setPhase('idle');
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setSeconds(0);
      setPhase('recording');
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) recorderRef.current?.stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      releaseMic();
      setError('Microphone access was blocked. Allow the microphone in your browser and try again.');
      setPhase('idle');
    }
  };

  const stop = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  if (!supported) return null;

  return (
    <span className={`relative inline-flex flex-col items-end gap-1 ${className}`}>
      <button
        type="button"
        onClick={phase === 'recording' ? stop : start}
        disabled={phase === 'processing'}
        aria-label={phase === 'recording' ? 'Stop recording' : 'Type with your voice'}
        title={phase === 'recording' ? 'Stop recording' : 'Type with your voice (Hindi, Punjabi, English)'}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-60 ${
          phase === 'recording'
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
        }`}
      >
        {phase === 'processing' ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : phase === 'recording' ? (
          <Square className="w-3.5 h-3.5" />
        ) : (
          <Mic className="w-3.5 h-3.5" />
        )}
        {compact ? (phase === 'recording' ? `${seconds}s` : null) : phase === 'recording' ? `Stop ${seconds}s` : phase === 'processing' ? 'Writing…' : 'Speak'}
      </button>
      {error && <span className="max-w-[220px] text-right text-[10px] text-red-600 dark:text-red-400">{error}</span>}
      {pending !== null && (
        <span
          role="dialog"
          aria-label="Add what you said"
          className="absolute right-0 top-full mt-1.5 z-30 w-72 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl text-left space-y-2"
        >
          <span className="block text-[11px] font-bold text-slate-900 dark:text-white">The box already has text. You said:</span>
          <span className="block text-[11px] text-slate-600 dark:text-slate-300 italic line-clamp-3 break-words">“{pending}”</span>
          <span className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                onText(pending);
                setPending(null);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold"
            >
              Add to the end
            </button>
            <button
              type="button"
              onClick={() => {
                onReplace?.(pending);
                setPending(null);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="px-2.5 py-1.5 rounded-lg text-slate-500 text-[11px] font-semibold hover:text-slate-800 dark:hover:text-slate-200"
            >
              Discard
            </button>
          </span>
        </span>
      )}
    </span>
  );
}
