import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { transcribe, type DictationLanguage } from './api-ai';

/** Speech only needs mono at a modest bitrate: 60 s stays well under the server's 5 MB limit. */
const OPTIONS = { ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 64_000 };
const MAX_SECONDS = 60;

export type DictationPhase = 'idle' | 'recording' | 'processing';

/**
 * Voice typing, same as the website's Speak button: tap to record, tap again to stop. The recording is turned
 * into text on the server (Sarvam understands Hindi, Punjabi, English and a mix) and handed to `onText`.
 */
export function useDictation(onText: (text: string) => void, language: DictationLanguage = 'auto') {
  const recorder = useAudioRecorder(OPTIONS);
  const [phase, setPhase] = useState<DictationPhase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef(0);
  const recording = useRef(false);
  const onTextRef = useRef(onText);
  const languageRef = useRef(language);

  useEffect(() => {
    onTextRef.current = onText;
    languageRef.current = language;
  });

  function clearTimer() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }

  // Leaving the screen mid-recording: stop the microphone and give playback back to the loudspeaker.
  useEffect(
    () => () => {
      clearTimer();
      if (recording.current) {
        recording.current = false;
        recorder.stop().catch(() => undefined);
        setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
      }
    },
    [recorder],
  );

  async function finish() {
    if (!recording.current) return;
    recording.current = false;
    clearTimer();
    setPhase('processing');
    try {
      await recorder.stop();
      // While recording is allowed, iPhones play sound through the earpiece; switch back to the speaker.
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
      if (!recorder.uri) throw new Error('Nothing was recorded. Please try again.');
      onTextRef.current(await transcribe(recorder.uri, languageRef.current));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not understand the recording. Please try again.');
    } finally {
      setPhase('idle');
    }
  }

  async function start() {
    setError(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Allow microphone access for Lumora in your phone Settings to speak instead of typing.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      recording.current = true;
      startedAt.current = Date.now();
      setSeconds(0);
      setPhase('recording');
      timer.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAt.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= MAX_SECONDS) void finish();
      }, 250);
    } catch {
      recording.current = false;
      clearTimer();
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
      setError('The microphone could not start. Close other apps using it and try again.');
      setPhase('idle');
    }
  }

  function toggle() {
    if (phase === 'recording') void finish();
    else if (phase === 'idle') void start();
  }

  return { phase, seconds, error, toggle, maxSeconds: MAX_SECONDS };
}
