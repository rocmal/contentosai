import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { generateSpeech, getCreditRates, listVoices, type CreditRates, type VoiceInfo, type VoiceProvider } from '@/lib/api';
import { writeCacheFile } from '@/lib/files';
import { useWallet } from '@/lib/useWallet';
import { Button, Card, Chip, ChipRow, ErrorText, Field, Input, Muted, Screen } from '@/ui/kit';
import { space } from '@/ui/theme';

const PROVIDERS: { id: VoiceProvider; label: string; note: string }[] = [
  { id: 'edge', label: 'Standard', note: 'Free, clear English and Hindi voices.' },
  { id: 'sarvam', label: 'Indian languages', note: 'Hindi, Punjabi and other Indian languages.' },
  { id: 'elevenlabs', label: 'Premium', note: 'Most natural sounding.' },
];

const SARVAM_LANGUAGES = [
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'pa-IN', label: 'Punjabi' },
  { code: 'en-IN', label: 'English' },
  { code: 'gu-IN', label: 'Gujarati' },
  { code: 'mr-IN', label: 'Marathi' },
  { code: 'ta-IN', label: 'Tamil' },
  { code: 'bn-IN', label: 'Bengali' },
];

export default function VoiceStudio() {
  const { reload } = useWallet();
  const [provider, setProvider] = useState<VoiceProvider>('edge');
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [voiceId, setVoiceId] = useState<string | undefined>();
  const [language, setLanguage] = useState('hi-IN');
  const [text, setText] = useState('');
  const [rates, setRates] = useState<CreditRates | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);

  const player = useAudioPlayer(audioUri);
  const playing = useAudioPlayerStatus(player).playing;

  useEffect(() => {
    getCreditRates().then(setRates).catch(() => undefined);
    // Play through the speaker even when the iPhone ring/silent switch is on.
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }, []);

  useEffect(() => {
    setVoices([]);
    setVoiceId(undefined);
    listVoices(provider)
      .then((v) => {
        setVoices(v);
        setVoiceId(v[0]?.id);
      })
      .catch(() => setVoices([]));
  }, [provider]);

  const cost = useMemo(() => {
    const perMinute = rates?.voice.perMinute[provider] ?? rates?.voice.perMinute.default;
    if (perMinute === undefined || !rates) return undefined;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil((words / rates.voice.wordsPerMinute) * perMinute));
  }, [rates, provider, text]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const { bytes } = await generateSpeech({
        text: text.trim(),
        provider,
        voiceId,
        languageCode: provider === 'sarvam' ? language : undefined,
      });
      setAudioUri(writeCacheFile(bytes, `voiceover-${Date.now()}.mp3`).uri);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the voiceover.');
    } finally {
      setBusy(false);
    }
  }

  // A fresh file loads asynchronously; start playback once the new source is set.
  useEffect(() => {
    if (audioUri) player.play();
  }, [audioUri, player]);

  async function share() {
    if (!audioUri) return;
    try {
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(audioUri, { mimeType: 'audio/mpeg' });
      else setError('Sharing is not available on this device.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not share the file.');
    }
  }

  const active = PROVIDERS.find((p) => p.id === provider);

  return (
    <Screen>
      <View style={{ gap: space.xl, paddingTop: space.md }}>
        <Field label="Script">
          <Input
            multiline
            value={text}
            onChangeText={setText}
            maxLength={5000}
            placeholder="Type or paste what the voice should say…"
            accessibilityLabel="Voiceover script"
            style={{ minHeight: 160 }}
          />
          <Muted>{text.length} / 5000 characters</Muted>
        </Field>

        <Field label="Voice type">
          <ChipRow>
            {PROVIDERS.map((p) => (
              <Chip key={p.id} label={p.label} selected={provider === p.id} onPress={() => setProvider(p.id)} />
            ))}
          </ChipRow>
          {active && <Muted>{active.note}</Muted>}
        </Field>

        {provider === 'sarvam' && (
          <Field label="Language">
            <ChipRow>
              {SARVAM_LANGUAGES.map((l) => (
                <Chip key={l.code} label={l.label} selected={language === l.code} onPress={() => setLanguage(l.code)} />
              ))}
            </ChipRow>
          </Field>
        )}

        {voices.length > 0 && (
          <Field label="Voice">
            <ChipRow>
              {voices.slice(0, 12).map((v) => (
                <Chip key={v.id} label={v.name} selected={voiceId === v.id} onPress={() => setVoiceId(v.id)} />
              ))}
            </ChipRow>
          </Field>
        )}

        <ErrorText message={error} />
        <Button
          title={cost !== undefined ? `Create voiceover · ~${cost} credits` : 'Create voiceover'}
          onPress={create}
          loading={busy}
          disabled={!text.trim()}
        />

        {audioUri && (
          <Card style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  title={playing ? 'Pause' : 'Play'}
                  variant="secondary"
                  onPress={() => {
                    if (playing) player.pause();
                    else {
                      player.seekTo(0);
                      player.play();
                    }
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Share" variant="secondary" onPress={share} />
              </View>
            </View>
            <Muted>Also saved in your Gallery.</Muted>
          </Card>
        )}
      </View>
    </Screen>
  );
}
