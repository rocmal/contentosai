import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { ApiError, generateVideo, getCreditRates, pollVideoJob, type CreditRates, type VideoProvider } from '@/lib/api';
import { VIDEO_STYLES, VIDEO_WRITER, type VideoStyleId } from '@/lib/studioPrompts';
import { creditLabel, formatBalance, useWallet } from '@/lib/useWallet';
import { useVideoAspect } from '@/lib/videoAspect';
import { VIDEO_PROMPT_CATEGORIES, VIDEO_PROMPT_TEMPLATES } from '@/lib/videoTemplates';
import { Button, Card, Chip, ChipRow, ErrorText, Field, Muted, Screen, SwitchRow } from '@/ui/kit';
import { MediaActions } from '@/ui/MediaActions';
import { useMediaBox } from '@/ui/mediaBox';
import { ShapeLabel, ShapePreview } from '@/ui/VideoShape';
import { PromptBox } from '@/ui/PromptBox';
import { ScheduleSheet } from '@/ui/ScheduleSheet';
import { colors, radius, space } from '@/ui/theme';

type Aspect = '9:16' | '16:9';

/** Veo makes 4, 6 or 8 second clips and every length up to 10 s costs the same, so the app always asks for 8. */
const SECONDS = 8;

/** The website's format presets, mapped to this screen's shape + style. */
const PRESET: Record<string, { aspect: Aspect; style: VideoStyleId }> = {
  cinematic: { aspect: '16:9', style: 'cinematic' },
  'social-reel': { aspect: '9:16', style: 'energetic' },
  'square-post': { aspect: '9:16', style: 'natural' },
  explainer: { aspect: '16:9', style: 'clean' },
  'product-ad': { aspect: '9:16', style: 'product' },
};

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function Player({ uri, ratio }: { uri: string; ratio: number }) {
  // Plays once (no loop), like the website's result preview.
  const player = useVideoPlayer(uri);
  // The requested shape until the clip reports its own, then the clip's (they should match).
  const actual = useVideoAspect(player, uri);
  // Screen padding + card padding + card border on both sides.
  const box = useMediaBox(actual ?? ratio, space.lg * 2 + space.md * 2 + 2);
  return (
    <View style={{ gap: space.sm }}>
      <VideoView
        player={player}
        style={{ ...box, alignSelf: 'center', borderRadius: 12, backgroundColor: '#000' }}
        nativeControls
        contentFit="contain"
      />
      {actual !== null && <ShapeLabel ratio={actual} />}
    </View>
  );
}

function Ideas({ onPick }: { onPick: (prompt: string, presetId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>(VIDEO_PROMPT_CATEGORIES[0]);
  return (
    <Card style={{ gap: space.md }}>
      <Pressable accessibilityRole="button" onPress={() => setOpen(!open)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Ionicons name="bulb" size={20} color={colors.primary} />
        <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: colors.text }}>Need an idea? Start from a ready-made prompt</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textFaint} />
      </Pressable>
      {open && (
        <>
          <ChipRow>
            {VIDEO_PROMPT_CATEGORIES.map((c) => (
              <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
            ))}
          </ChipRow>
          {VIDEO_PROMPT_TEMPLATES.filter((t) => t.category === category).map((t) => (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              onPress={() => {
                onPick(t.prompt, t.presetId);
                setOpen(false);
              }}
              style={({ pressed }) => ({ padding: space.md, borderRadius: radius.control, backgroundColor: pressed ? colors.primaryTint : colors.surface, gap: 2 })}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{t.title}</Text>
              <Muted style={{ fontSize: 13 }}>{t.prompt.length > 110 ? `${t.prompt.slice(0, 110)}…` : t.prompt}</Muted>
            </Pressable>
          ))}
        </>
      )}
    </Card>
  );
}

export default function VideoStudio() {
  const router = useRouter();
  const { balance, reload } = useWallet();
  const { prompt: initialPrompt } = useLocalSearchParams<{ prompt?: string }>();
  const [prompt, setPrompt] = useState(initialPrompt ?? '');
  const [aspect, setAspect] = useState<Aspect>('9:16');
  const [style, setStyle] = useState<VideoStyleId>('natural');
  const [testMode, setTestMode] = useState(false);
  const [rates, setRates] = useState<CreditRates | null>(null);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const [result, setResult] = useState<{ url: string; aspect: Aspect; cached: boolean } | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getCreditRates().then(setRates).catch(() => undefined);
    return () => {
      abort.current?.abort();
      if (ticker.current) clearInterval(ticker.current);
    };
  }, []);

  // The free "mock" engine only exists on a development server.
  const provider: VideoProvider = __DEV__ && testMode ? 'mock' : 'veo';
  const per10 = rates ? (rates.video.per10Seconds[provider] ?? rates.video.per10Seconds.default) : undefined;
  // Charged per started 10 seconds, the same rule the server uses.
  const cost = per10 !== undefined ? Math.max(1, Math.ceil(SECONDS / 10)) * per10 : undefined;
  const tooFewCredits = typeof balance === 'number' && cost !== undefined && cost > balance;

  function stopTicker() {
    if (ticker.current) clearInterval(ticker.current);
    ticker.current = null;
  }

  async function create(fresh: boolean) {
    if (!prompt.trim()) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError(null);
    setOutOfCredits(false);
    setResult(null);
    setElapsed(0);
    const started = Date.now();
    stopTicker();
    ticker.current = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    const suffix = VIDEO_STYLES.find((s) => s.id === style)?.suffix;
    try {
      const job = await generateVideo({
        prompt: suffix ? `${prompt.trim()}, ${suffix}` : prompt.trim(),
        provider,
        durationSeconds: SECONDS,
        aspectRatio: aspect,
        fresh,
      });
      reload();
      // The same prompt made before comes back finished and free.
      const done = job.status === 'completed' && job.videoUrl ? job : await pollVideoJob(job, { signal: controller.signal });
      if (done.status === 'failed' || !done.videoUrl) {
        throw new ApiError(502, 'The video service could not make this clip. Try again, or change the prompt a little.');
      }
      setResult({ url: done.videoUrl, aspect, cached: Boolean(job.cached) });
    } catch (e) {
      if (controller.signal.aborted) return;
      if (e instanceof ApiError && e.status === 402) setOutOfCredits(true);
      else setError(e instanceof Error ? e.message : 'Could not create the video.');
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        stopTicker();
        reload();
      }
    }
  }

  function stopWaiting() {
    abort.current?.abort();
    stopTicker();
    setBusy(false);
    setError('Stopped waiting. The video is still being made: it will appear in your Gallery, and you will get a notification.');
  }

  return (
    <Screen>
      <View style={{ gap: space.xl, paddingTop: space.md }}>
        <Ideas
          onPick={(text, presetId) => {
            setPrompt(text);
            const preset = PRESET[presetId];
            if (preset) {
              setAspect(preset.aspect);
              setStyle(preset.style);
            }
          }}
        />

        <PromptBox
          label="Describe your video"
          value={prompt}
          onChangeText={setPrompt}
          placeholder="A slow drone shot over a golden temple at sunrise, calm and cinematic…"
          ai={VIDEO_WRITER}
          editable={!busy}
        />

        <Field label="Format">
          <ChipRow>
            <Chip label="Vertical · Reels, Shorts, Status" selected={aspect === '9:16'} disabled={busy} onPress={() => setAspect('9:16')} />
            <Chip label="Wide · YouTube, Facebook" selected={aspect === '16:9'} disabled={busy} onPress={() => setAspect('16:9')} />
          </ChipRow>
          <ShapePreview ratio={aspect === '9:16' ? 9 / 16 : 16 / 9} />
        </Field>

        <Field label="Style">
          <ChipRow>
            {VIDEO_STYLES.map((s) => (
              <Chip key={s.id} label={s.label} selected={style === s.id} disabled={busy} onPress={() => setStyle(s.id)} />
            ))}
          </ChipRow>
          <Muted>An {SECONDS}-second clip with natural sound, made by Google Veo. Avoid asking for on-screen text.</Muted>
        </Field>

        {__DEV__ && (
          <SwitchRow
            label="Test mode (development only)"
            detail="Returns a free sample clip instead of calling Veo."
            value={testMode}
            onValueChange={setTestMode}
          />
        )}

        <ErrorText message={error} />
        {outOfCredits && (
          <Card style={{ gap: space.sm }}>
            <Muted style={{ color: colors.text, fontWeight: '600' }}>Not enough credits for a video.</Muted>
            <Muted>You have {formatBalance(balance)} credits; a video needs {cost}. Add credits on the Lumora website.</Muted>
            <Button title="See plan and credits" variant="secondary" onPress={() => router.push('/billing')} />
          </Card>
        )}

        {busy ? (
          <Card style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xl }}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>Making your video… {clock(elapsed)}</Text>
            <Muted style={{ textAlign: 'center' }}>
              This usually takes 1 to 2 minutes. You can leave this screen: the video is saved to your Gallery and you get a
              notification when it is ready.
            </Muted>
            <Button title="Stop waiting" variant="secondary" onPress={stopWaiting} />
          </Card>
        ) : (
          !result && (
            <Button
              title={cost !== undefined ? `Create video · ${creditLabel(cost)}` : 'Create video'}
              onPress={() => create(false)}
              disabled={!prompt.trim() || tooFewCredits}
            />
          )
        )}
        {tooFewCredits && !outOfCredits && <Muted>You have {formatBalance(balance)} credits; a video needs {cost}.</Muted>}

        {result && !busy && (
          <Card style={{ gap: space.md, padding: space.md }}>
            <Player uri={result.url} ratio={result.aspect === '9:16' ? 9 / 16 : 16 / 9} />
            {result.cached && (
              <Muted>You made this exact video before, so here it is again at no cost. Tap Make another version for a new one.</Muted>
            )}
            <MediaActions source={result.url} ext="mp4" />
            <Button title="Schedule a post" variant="secondary" onPress={() => setScheduling(true)} />
            <Button
              title={cost !== undefined ? `Make another version · ${creditLabel(cost)}` : 'Make another version'}
              variant="secondary"
              onPress={() => create(true)}
              disabled={tooFewCredits}
            />
            <Muted style={{ fontSize: 12 }}>Saved in your Gallery. AI video can contain mistakes; watch it fully before you post.</Muted>
          </Card>
        )}
      </View>
      {scheduling && result && <ScheduleSheet videoUrl={result.url} onClose={() => setScheduling(false)} />}
    </Screen>
  );
}
