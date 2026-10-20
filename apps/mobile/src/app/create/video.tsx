import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, View } from 'react-native';
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
import { PostSheet } from '@/ui/PostSheet';
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

const STILL_RENDERING =
  "Your video is still rendering. It will appear in your Gallery when it is ready, and you'll get a notification. Please don't create it again, or you'll be charged twice.";

/** What the waiting card cycles through, so a 1-3 minute wait does not look stuck. */
const WAITING_MESSAGES = [
  'Reading your prompt',
  'Setting up the scene',
  'Placing the people and props',
  'Finding the right light',
  'Planning the camera move',
  'Rolling the camera',
  'Rendering the frames',
  'Adding natural sounds',
  'Smoothing the motion',
  'Polishing the final cut',
];

/** A new message every 4 seconds; after the list, keep cycling the rendering stages. */
function waitingMessage(seconds: number): string {
  const step = Math.floor(seconds / 4);
  const n = WAITING_MESSAGES.length;
  return WAITING_MESSAGES[step < n ? step : 4 + ((step - n) % (n - 4))];
}

/** "Replace your prompt?" before a template overwrites it (Alert does nothing in the browser build). */
function confirmReplace(apply: () => void) {
  const message = 'The template replaces what you wrote. Use it anyway?';
  if (Platform.OS === 'web') {
    if (window.confirm(message)) apply();
    return;
  }
  Alert.alert('Replace your prompt?', message, [
    { text: 'Keep mine', style: 'cancel' },
    { text: 'Replace', onPress: apply },
  ]);
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
  /** Stopped waiting while the clip is still rendering: not an error, it lands in the Gallery. */
  const [notice, setNotice] = useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const [result, setResult] = useState<{ url: string; aspect: Aspect; cached: boolean; assetId?: string } | null>(null);
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
    setNotice(null);
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
      setResult({ url: done.videoUrl, aspect, cached: Boolean(job.cached), assetId: done.mediaAssetId ?? job.mediaAssetId });
    } catch (e) {
      if (controller.signal.aborted) return;
      if (e instanceof ApiError && e.status === 402) setOutOfCredits(true);
      else if (e instanceof ApiError && e.status === 408) setNotice(STILL_RENDERING);
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
    setNotice(STILL_RENDERING);
  }

  return (
    <Screen>
      <View style={{ gap: space.xl, paddingTop: space.md }}>
        <Ideas
          onPick={(text, presetId) => {
            const apply = () => {
              setPrompt(text);
              const preset = PRESET[presetId];
              if (preset) {
                setAspect(preset.aspect);
                setStyle(preset.style);
              }
            };
            // Ask before a template replaces words the person wrote.
            if (prompt.trim() && prompt.trim() !== text.trim()) confirmReplace(apply);
            else apply();
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
        {notice && (
          <Card style={{ gap: space.sm }}>
            <Muted style={{ color: colors.text }}>{notice}</Muted>
            <Button title="Open Gallery" variant="secondary" onPress={() => router.push('/gallery')} />
          </Card>
        )}
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
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{waitingMessage(elapsed)}…</Text>
            <Muted style={{ fontVariant: ['tabular-nums'] }}>{clock(elapsed)} · usually 1-3 minutes</Muted>
            <Muted style={{ textAlign: 'center' }}>
              {elapsed >= 180
                ? "Google is busy, so this is taking longer than usual. You can leave this screen: the video keeps rendering, appears in your Gallery and you get a notification. Please don't create it again, or you'll be charged twice."
                : 'You can leave this screen: the video is saved to your Gallery and you get a notification when it is ready.'}
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
            <Button title="Post or schedule" variant="secondary" onPress={() => setScheduling(true)} />
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
      {scheduling && result && (
        <PostSheet asset={result.assetId ? { id: result.assetId, type: 'video' } : null} onClose={() => setScheduling(false)} />
      )}
    </Screen>
  );
}
