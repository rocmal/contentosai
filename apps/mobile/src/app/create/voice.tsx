import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { ApiError, generateSpeech, getCreditRates, type CreditRates } from '@/lib/api';
import type { DictationLanguage } from '@/lib/api-ai';
import { SITE_URL } from '@/lib/config';
import { saveToPhotos, uniqueName, writeCacheFile } from '@/lib/files';
import { SARVAM_VOICE_CATALOG, voiceSampleUrl, type SarvamVoiceGender } from '@/lib/sarvamVoices';
import { scriptWriter, type ScriptLanguage } from '@/lib/studioPrompts';
import { formatBalance, useWallet } from '@/lib/useWallet';
import { Button, Card, Chip, ChipRow, ErrorText, Field, Muted, PillButton, Screen } from '@/ui/kit';
import { PromptBox } from '@/ui/PromptBox';
import { colors, space } from '@/ui/theme';

/** Sarvam only, like the website: it is the one provider built for Indian voices and accents. */
const PROVIDER = 'sarvam';

const LANGUAGES: { id: ScriptLanguage; label: string; code: string; dictation: DictationLanguage; sample: 'en' | 'hi' }[] = [
  { id: 'hindi', label: 'हिंदी Hindi', code: 'hi-IN', dictation: 'hi-IN', sample: 'hi' },
  { id: 'punjabi', label: 'ਪੰਜਾਬੀ Punjabi', code: 'pa-IN', dictation: 'pa-IN', sample: 'hi' },
  { id: 'english', label: 'English', code: 'en-IN', dictation: 'en-IN', sample: 'en' },
];

const PLACEHOLDER: Record<ScriptLanguage, string> = {
  hindi: 'उदाहरण: नमस्ते! अपने परिवार के भविष्य को सुरक्षित करें…',
  punjabi: 'ਉਦਾਹਰਨ: ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਆਪਣੇ ਪਰਿਵਾਰ ਦੇ ਭਵਿੱਖ ਨੂੰ ਸੁਰੱਖਿਅਤ ਕਰੋ…',
  english: 'For example: Hello! Plan today for your family’s tomorrow…',
};

function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function VoiceStudio() {
  const router = useRouter();
  const { balance, reload } = useWallet();
  const { prompt: initialPrompt } = useLocalSearchParams<{ prompt?: string }>();
  const [text, setText] = useState(initialPrompt ?? '');
  const [languageId, setLanguageId] = useState<ScriptLanguage>('hindi');
  const [gender, setGender] = useState<SarvamVoiceGender>('female');
  const [voiceId, setVoiceId] = useState('anushka');
  const [moreVoices, setMoreVoices] = useState(false);
  const [rates, setRates] = useState<CreditRates | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  const player = useAudioPlayer(audioUri);
  const status = useAudioPlayerStatus(player);
  const sample = useAudioPlayer(null);
  const sampleStatus = useAudioPlayerStatus(sample);

  useEffect(() => {
    getCreditRates().then(setRates).catch(() => undefined);
    // Play through the speaker even when the iPhone ring/silent switch is on.
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }, []);

  // A fresh voiceover loads asynchronously; start playback once the new source is set.
  useEffect(() => {
    if (audioUri) player.play();
  }, [audioUri, player]);

  const language = LANGUAGES.find((l) => l.id === languageId) ?? LANGUAGES[0];
  const mainVoices = SARVAM_VOICE_CATALOG.filter((v) => v.gender === gender);
  const otherVoices = SARVAM_VOICE_CATALOG.filter((v) => !v.gender);
  const voice = SARVAM_VOICE_CATALOG.find((v) => v.id === voiceId) ?? mainVoices[0];

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const { minutes, cost } = useMemo(() => {
    // Charged per whole minute of speech (at least one), the same rule the server uses.
    const wpm = rates?.voice.wordsPerMinute ?? 150;
    const mins = Math.max(1, Math.ceil(words / wpm));
    const perMinute = rates ? (rates.voice.perMinute[PROVIDER] ?? rates.voice.perMinute.default) : undefined;
    return { minutes: mins, cost: perMinute !== undefined ? mins * perMinute : undefined };
  }, [rates, words]);
  const tooFewCredits = typeof balance === 'number' && cost !== undefined && cost > balance;

  function pickGender(next: SarvamVoiceGender) {
    setGender(next);
    const first = SARVAM_VOICE_CATALOG.find((v) => v.gender === next);
    if (first) setVoiceId(first.id);
  }

  function listen() {
    if (!voice) return;
    if (sampleStatus.playing) {
      sample.pause();
      return;
    }
    sample.replace({ uri: voiceSampleUrl(SITE_URL, voice.id, language.sample) });
    sample.play();
  }

  async function create() {
    if (!voice || !text.trim()) return;
    setBusy(true);
    setError(null);
    setOutOfCredits(false);
    sample.pause();
    try {
      const { bytes } = await generateSpeech({ text: text.trim(), provider: PROVIDER, voiceId: voice.id, model: voice.model, languageCode: language.code });
      setAudioUri(writeCacheFile(bytes, uniqueName('voiceover', 'mp3')).uri);
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) setOutOfCredits(true);
      else setError(e instanceof Error ? e.message : 'Could not create the voiceover.');
    } finally {
      setBusy(false);
      reload();
    }
  }

  async function share() {
    if (!audioUri) return;
    try {
      // The browser preview has no share sheet for local audio; it downloads the file instead.
      if (Platform.OS === 'web') await saveToPhotos(audioUri, 'mp3');
      else if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(audioUri, { mimeType: 'audio/mpeg', UTI: 'public.mp3' });
      else setError('Sharing is not available on this device.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not share the file.');
    }
  }

  function togglePlay() {
    if (status.playing) player.pause();
    else {
      if (status.duration > 0 && status.currentTime >= status.duration - 0.2) player.seekTo(0);
      player.play();
    }
  }

  return (
    <Screen>
      <View style={{ gap: space.xl, paddingTop: space.md }}>
        <Field label="Language">
          <ChipRow>
            {LANGUAGES.map((l) => (
              <Chip key={l.id} label={l.label} selected={languageId === l.id} disabled={busy} onPress={() => setLanguageId(l.id)} />
            ))}
          </ChipRow>
        </Field>

        <PromptBox
          label="What should the voice say?"
          value={text}
          onChangeText={setText}
          placeholder={PLACEHOLDER[languageId]}
          ai={scriptWriter(languageId)}
          dictationLanguage={language.dictation}
          maxLength={5000}
          minHeight={150}
          editable={!busy}
          footer={words ? `${words} words · about ${minutes} minute${minutes === 1 ? '' : 's'} of speech` : 'Tip: type a topic and tap Generate with AI to get a script.'}
        />

        <Field label="Voice">
          <ChipRow>
            <Chip label="Female" selected={gender === 'female'} disabled={busy} onPress={() => pickGender('female')} />
            <Chip label="Male" selected={gender === 'male'} disabled={busy} onPress={() => pickGender('male')} />
          </ChipRow>
          <ChipRow>
            {mainVoices.map((v) => (
              <Chip key={v.id} label={v.name} selected={voiceId === v.id} disabled={busy} onPress={() => setVoiceId(v.id)} />
            ))}
          </ChipRow>
          <Pressable accessibilityRole="button" onPress={() => setMoreVoices(!moreVoices)} hitSlop={8}>
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>
              {moreVoices ? 'Fewer voices' : `More voices (${otherVoices.length})`}
            </Text>
          </Pressable>
          {moreVoices && (
            <ChipRow>
              {otherVoices.map((v) => (
                <Chip key={v.id} label={v.name} selected={voiceId === v.id} disabled={busy} onPress={() => setVoiceId(v.id)} />
              ))}
            </ChipRow>
          )}
          {voice && (
            <View style={{ flexDirection: 'row' }}>
              <PillButton
                icon={sampleStatus.playing ? 'pause' : 'play'}
                label={sampleStatus.playing ? 'Pause sample' : `Listen to ${voice.name} (free)`}
                tone="primary"
                onPress={listen}
              />
            </View>
          )}
        </Field>

        <ErrorText message={error} />
        {outOfCredits && (
          <Card style={{ gap: space.sm }}>
            <Muted style={{ color: colors.text, fontWeight: '600' }}>Not enough credits for this voiceover.</Muted>
            <Muted>You have {formatBalance(balance)} credits; this needs {cost}. Add credits on the Lumora website.</Muted>
            <Button title="See plan and credits" variant="secondary" onPress={() => router.push('/billing')} />
          </Card>
        )}

        <Button
          title={busy ? 'Creating voiceover…' : cost !== undefined && words ? `Create voiceover · ${cost} credits` : 'Create voiceover'}
          onPress={create}
          loading={busy}
          disabled={!text.trim() || !voice || tooFewCredits}
        />
        {tooFewCredits && !outOfCredits && <Muted>You have {formatBalance(balance)} credits; this needs {cost}.</Muted>}

        {audioUri && (
          <Card style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={status.playing ? 'Pause' : 'Play'}
                onPress={togglePlay}
                style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name={status.playing ? 'pause' : 'play'} size={26} color="#fff" />
              </Pressable>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                  {voice?.name} · {language.label}
                </Text>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surface, overflow: 'hidden' }}>
                  <View
                    style={{
                      height: 6,
                      width: `${status.duration > 0 ? Math.min(100, (status.currentTime / status.duration) * 100) : 0}%`,
                      backgroundColor: colors.primary,
                    }}
                  />
                </View>
                <Muted style={{ fontSize: 12 }}>
                  {clock(status.currentTime)} / {clock(status.duration)}
                </Muted>
              </View>
            </View>
            <Button title="Share" variant="secondary" onPress={share} />
            <Muted style={{ fontSize: 12 }}>Saved in your Gallery. Listen to the whole clip before you post: AI voices can mispronounce names.</Muted>
          </Card>
        )}
      </View>
    </Screen>
  );
}
