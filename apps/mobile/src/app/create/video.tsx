import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import {
  ApiError,
  generateVideo,
  getCreditRates,
  pollVideoJob,
  type CreditRates,
  type VideoProvider,
} from '@/lib/api';
import { useWallet } from '@/lib/useWallet';
import { Button, Card, Chip, ChipRow, ErrorText, Field, Input, Muted, Screen } from '@/ui/kit';
import { MediaActions } from '@/ui/MediaActions';
import { colors, space } from '@/ui/theme';

// "mock" only works outside production on the server, so it is a dev-only choice here.
const PROVIDERS: { id: VideoProvider; label: string }[] = [
  { id: 'veo', label: 'Veo' },
  { id: 'runway', label: 'Runway' },
  { id: 'kling', label: 'Kling' },
  { id: 'pika', label: 'Pika' },
  { id: 'luma', label: 'Luma' },
  ...(__DEV__ ? [{ id: 'mock' as const, label: 'Mock (dev)' }] : []),
];
const DURATIONS = [5, 10];

function Player({ uri, ratio }: { uri: string; ratio: number }) {
  const { width } = useWindowDimensions();
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
  });
  const w = width - space.lg * 2 - space.md * 2 - 2;
  return <VideoView player={player} style={{ width: w, aspectRatio: ratio, borderRadius: 12, backgroundColor: '#000' }} nativeControls contentFit="contain" />;
}

export default function VideoStudio() {
  const { reload } = useWallet();
  const [provider, setProvider] = useState<VideoProvider>(PROVIDERS[0].id);
  const [seconds, setSeconds] = useState(5);
  const [aspect, setAspect] = useState<'9:16' | '16:9'>('9:16');
  const [prompt, setPrompt] = useState('');
  const [rates, setRates] = useState<CreditRates | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [shownAspect, setShownAspect] = useState<'9:16' | '16:9'>('9:16');
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    getCreditRates().then(setRates).catch(() => undefined);
    return () => abort.current?.abort();
  }, []);

  const per10 = rates?.video.per10Seconds[provider] ?? rates?.video.per10Seconds.default;
  const cost = per10 !== undefined ? Math.ceil((per10 * seconds) / 10) : undefined;

  async function create() {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError(null);
    setVideoUrl(null);
    setStatus('Sending your prompt…');
    try {
      const job = await generateVideo({ prompt: prompt.trim(), provider, durationSeconds: seconds, aspectRatio: aspect });
      reload();
      setStatus('Rendering. This usually takes a minute or two. You can leave this screen and find it in Gallery.');
      const done = await pollVideoJob(job, { signal: controller.signal });
      if (done.status === 'failed' || !done.videoUrl) throw new ApiError(502, 'The video could not be created. Your credits for a failed run are refunded.');
      setVideoUrl(done.videoUrl);
      setShownAspect(aspect);
      reload();
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Could not create the video.');
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        setStatus(null);
      }
    }
  }

  return (
    <Screen>
      <View style={{ gap: space.xl, paddingTop: space.md }}>
        <Field label="Describe your video">
          <Input
            multiline
            value={prompt}
            onChangeText={setPrompt}
            maxLength={4000}
            editable={!busy}
            placeholder="A slow drone shot over a golden temple at sunrise, calm and cinematic…"
            accessibilityLabel="Video prompt"
          />
        </Field>

        <Field label="Format">
          <ChipRow>
            <Chip label="Vertical 9:16" selected={aspect === '9:16'} disabled={busy} onPress={() => setAspect('9:16')} />
            <Chip label="Wide 16:9" selected={aspect === '16:9'} disabled={busy} onPress={() => setAspect('16:9')} />
          </ChipRow>
        </Field>

        <Field label="Length">
          <ChipRow>
            {DURATIONS.map((d) => (
              <Chip key={d} label={`${d} sec`} selected={seconds === d} disabled={busy} onPress={() => setSeconds(d)} />
            ))}
          </ChipRow>
        </Field>

        <Field label="Model">
          <ChipRow>
            {PROVIDERS.map((p) => (
              <Chip key={p.id} label={p.label} selected={provider === p.id} disabled={busy} onPress={() => setProvider(p.id)} />
            ))}
          </ChipRow>
        </Field>

        {status && <Muted>{status}</Muted>}
        <ErrorText message={error} />
        <Button
          title={cost !== undefined ? `Create video · ~${cost} credits` : 'Create video'}
          onPress={create}
          loading={busy}
          disabled={!prompt.trim()}
        />

        {videoUrl && (
          <Card style={{ gap: space.md, padding: space.md }}>
            <Player uri={videoUrl} ratio={shownAspect === '9:16' ? 9 / 16 : 16 / 9} />
            <MediaActions source={videoUrl} ext="mp4" />
            <Text style={{ color: colors.textFaint, fontSize: 12 }}>Also saved in your Gallery.</Text>
          </Card>
        )}
      </View>
    </Screen>
  );
}
