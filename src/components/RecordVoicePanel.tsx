import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Mic, RotateCcw, Square } from 'lucide-react';
import * as api from '../lib/api';

interface RecordVoicePanelProps {
  /** Called with the saved voice so the screen can add it to its dropdown and select it. */
  onSaved: (voice: api.CustomVoice) => void;
}

const MIN_SECONDS = 30;
const MAX_SECONDS = 120;

// Something natural to read aloud, so the sample has varied sounds and steady pace.
const READ_ALOUD =
  'Hello, this is my voice. I am recording it so I can use it for my videos and voiceovers. ' +
  'I speak clearly, at a natural pace, and I pause between sentences. Today is a good day to share ' +
  'something useful with the people who trust me. Thank you for listening, and see you in the next one.';

type Phase = 'idle' | 'recording' | 'recorded' | 'saving';

/** Record your own voice, preview it, name it and save it as a selectable voice. */
export default function RecordVoicePanel({ onSaved }: RecordVoicePanelProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<number | null>(null);

  const supported =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

  const releaseMic = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(
    () => () => {
      releaseMic();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        releaseMic();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        blobRef.current = blob;
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(blob));
        setPhase('recorded');
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

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    blobRef.current = null;
    setSeconds(0);
    setPhase('idle');
    setError(null);
  };

  const canSave = phase === 'recorded' && seconds >= MIN_SECONDS && name.trim().length >= 2 && consent;

  const save = async () => {
    if (!blobRef.current || !canSave) return;
    setPhase('saving');
    setError(null);
    try {
      const voice = await api.createCustomVoice(name.trim(), blobRef.current, consent);
      onSaved(voice);
      setName('');
      setConsent(false);
      reset();
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not reach the Lumora API. Please try again.');
      setPhase('recorded');
    }
  };

  if (!supported) {
    return (
      <p className="text-[11px] text-slate-500">
        Recording needs a browser with microphone support (Chrome, Edge, Firefox or Safari) on a secure (https) page.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Read this aloud</p>
        <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">{READ_ALOUD}</p>
        <p className="text-[10px] text-slate-500 mt-2">
          Record {MIN_SECONDS}+ seconds in a quiet room, close to the microphone, at your normal pace.
        </p>
      </div>

      {phase === 'idle' && (
        <button
          type="button"
          onClick={start}
          className="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center justify-center gap-1.5"
        >
          <Mic className="w-3.5 h-3.5" /> Start recording
        </button>
      )}

      {phase === 'recording' && (
        <button
          type="button"
          onClick={stop}
          className="w-full py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 animate-pulse"
        >
          <Square className="w-3.5 h-3.5" /> Stop ({seconds}s{seconds < MIN_SECONDS ? `, keep going to ${MIN_SECONDS}s` : ''})
        </button>
      )}

      {(phase === 'recorded' || phase === 'saving') && (
        <div className="space-y-2">
          {previewUrl && <audio controls src={previewUrl} className="w-full h-9" />}
          <div className="flex items-center justify-between text-[11px]">
            <span className={seconds >= MIN_SECONDS ? 'text-emerald-600' : 'text-amber-600'}>
              {seconds}s recorded{seconds < MIN_SECONDS ? ` - need at least ${MIN_SECONDS}s` : ''}
            </span>
            <button
              type="button"
              onClick={reset}
              disabled={phase === 'saving'}
              className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" /> Record again
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">Name this voice</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="e.g. Rajni - narration"
              className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            />
          </div>

          <label className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            This is my own voice, or I have the speaker's permission to create a voice from it.
          </label>

          <button
            type="button"
            onClick={save}
            disabled={phase === 'saving' || !canSave}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5"
          >
            {phase === 'saving' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating your voice...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" /> Save as a voice
              </>
            )}
          </button>
        </div>
      )}

      {error && <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
