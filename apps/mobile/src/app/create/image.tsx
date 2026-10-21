import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ApiError, generateImage, getImageOptions, type ImageAspectRatio, type ImageProviderOption, type ImageQuality } from '@/lib/api';
import { uploadToGallery } from '@/lib/upload';
import { IMAGE_COMPOSITION_NOTE, IMAGE_NO_TEXT_NOTE, IMAGE_WRITER, WANTS_TEXT } from '@/lib/studioPrompts';
import { creditLabel, formatBalance, useWallet, outOfCreditsDetail } from '@/lib/useWallet';
import { Button, Card, Chip, ChipRow, ErrorText, Field, Muted, Screen, SwitchRow } from '@/ui/kit';
import { MediaActions } from '@/ui/MediaActions';
import { useMediaBox } from '@/ui/mediaBox';
import { PromptBox } from '@/ui/PromptBox';
import { colors, space } from '@/ui/theme';

/** Where the picture will be posted decides its shape (same sizes as the website's Image Studio). */
const PLACES: { id: string; label: string; detail: string; ratio: ImageAspectRatio }[] = [
  { id: 'ig-post', label: 'Instagram post', detail: 'Portrait 4:5, 1080 × 1350', ratio: '4:5' },
  { id: 'square', label: 'Square post', detail: 'Instagram, Facebook or WhatsApp, 1080 × 1080', ratio: '1:1' },
  { id: 'story', label: 'Story / Status', detail: 'Instagram or Facebook Story, Reel cover, WhatsApp Status, 1080 × 1920', ratio: '9:16' },
  { id: 'wide', label: 'Facebook / LinkedIn / YouTube', detail: 'Wide 16:9: link posts and YouTube thumbnails, 1280 × 720', ratio: '16:9' },
];

function ratioValue(r: ImageAspectRatio): number {
  const [w, h] = r.split(':').map(Number);
  return w / h;
}

interface Result {
  uri: string;
  model: string;
  ratio: ImageAspectRatio;
  prompt: string;
}

export default function ImageStudio() {
  const router = useRouter();
  const { balance, paused, reload } = useWallet();
  const { prompt: initialPrompt } = useLocalSearchParams<{ prompt?: string }>();
  const [prompt, setPrompt] = useState(initialPrompt ?? '');
  const [noText, setNoText] = useState(true);
  const [placeId, setPlaceId] = useState(PLACES[0].id);
  const [quality, setQuality] = useState<ImageQuality>('standard');
  const [options, setOptions] = useState<ImageProviderOption[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    getImageOptions()
      .then(({ providers }) => setOptions(providers))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load image options.'));
  }, []);

  // One image model, like the website: the recommended one this server has a key for.
  const provider = useMemo(
    () => options?.find((p) => p.configured && p.recommended) ?? options?.find((p) => p.configured) ?? null,
    [options],
  );
  const qualities = provider?.qualities ?? [];
  const cost = qualities.find((q) => q.id === quality)?.credits;
  const place = PLACES.find((p) => p.id === placeId) ?? PLACES[0];
  const tooFewCredits = typeof balance === 'number' && cost !== undefined && cost > balance;

  async function create() {
    if (!provider || !prompt.trim()) return;
    setBusy(true);
    setError(null);
    setOutOfCredits(false);
    setResult(null);
    setSaveState('idle');
    setSaveError(null);
    try {
      const full = [prompt.trim(), IMAGE_COMPOSITION_NOTE, noText ? IMAGE_NO_TEXT_NOTE : ''].filter(Boolean).join(' ');
      // A preview: nothing is stored until "Save to gallery", so "Try again" really makes a new picture.
      const made = await generateImage({ prompt: full, provider: provider.id, aspectRatio: place.ratio, quality, count: 1, saveToGallery: false });
      const uri = made.images[0];
      if (!uri) throw new ApiError(502, 'The image service returned no picture. Please try again.');
      setResult({ uri, model: made.model, ratio: place.ratio, prompt: prompt.trim() });
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) setOutOfCredits(true);
      else setError(e instanceof Error ? e.message : 'Could not create the image.');
    } finally {
      setBusy(false);
      reload();
    }
  }

  async function saveToGallery() {
    if (!result) return;
    setSaveState('saving');
    setSaveError(null);
    try {
      await uploadToGallery(result.uri, { prompt: result.prompt, provider: provider?.id, model: result.model, ext: 'png', fallbackMime: 'image/png' });
      setSaveState('saved');
    } catch (e) {
      setSaveState('idle');
      setSaveError(e instanceof Error ? e.message : 'Could not save to your gallery.');
    }
  }

  // Screen padding + card padding + card border on both sides.
  const inset = space.lg * 2 + space.md * 2 + 2;
  const placeholderBox = useMediaBox(ratioValue(place.ratio), inset, 420);
  const resultBox = useMediaBox(ratioValue(result?.ratio ?? place.ratio), inset);
  const notSetUp = options !== null && !provider;

  return (
    <Screen>
      <View style={{ gap: space.xl, paddingTop: space.md }}>
        <PromptBox
          label="Describe your image"
          value={prompt}
          onChangeText={setPrompt}
          placeholder="A festive Diwali greeting poster, warm diyas, soft gold light…"
          ai={IMAGE_WRITER}
          editable={!busy}
        />

        <Card style={{ gap: space.sm }}>
          <SwitchRow
            label="No text in the image"
            detail="Recommended. AI often misspells words; add your wording later in a design app."
            value={noText}
            onValueChange={setNoText}
          />
          {noText && WANTS_TEXT.test(prompt) && (
            <Muted style={{ color: '#b45309' }}>
              Your idea mentions text (a card, poster or number). With this switched on the image will have none. Switch it off
              to let the AI try lettering, and check the spelling.
            </Muted>
          )}
        </Card>

        <Field label="Where will you post it?">
          <ChipRow>
            {PLACES.map((p) => (
              <Chip key={p.id} label={p.label} selected={placeId === p.id} disabled={busy} onPress={() => setPlaceId(p.id)} />
            ))}
          </ChipRow>
          <Muted>{place.detail}</Muted>
        </Field>

        {qualities.length > 0 && (
          <Field label="Quality">
            <ChipRow>
              {qualities.map((q) => (
                <Chip key={q.id} label={`${q.label} · ${q.credits} cr`} selected={quality === q.id} disabled={busy} onPress={() => setQuality(q.id)} />
              ))}
            </ChipRow>
          </Field>
        )}

        {notSetUp && (
          <Card style={{ gap: space.sm }}>
            <Muted style={{ color: colors.text, fontWeight: '600' }}>Image creation is not switched on yet.</Muted>
            <Muted>
              {__DEV__
                ? 'Local copy: add OPENAI_API_KEY to apps/api/.env.development and restart the API (deploy/local/dev.ps1).'
                : 'Please try again later or contact support.'}
            </Muted>
          </Card>
        )}

        <ErrorText message={error} />
        {outOfCredits && (
          <Card style={{ gap: space.sm }}>
            <Muted style={{ color: colors.text, fontWeight: '600' }}>Not enough credits for this image.</Muted>
            <Muted>{outOfCreditsDetail(paused, balance)}</Muted>
            <Button title="See plan and credits" variant="secondary" onPress={() => router.push('/billing')} />
          </Card>
        )}

        {!result && (
          <Button
            title={cost !== undefined ? `Create image · ${creditLabel(cost)}` : 'Create image'}
            onPress={create}
            loading={busy}
            disabled={!prompt.trim() || !provider || tooFewCredits}
          />
        )}
        {tooFewCredits && !outOfCredits && <Muted>You have {formatBalance(balance)} credits; this needs {cost}.</Muted>}

        {busy && (
          <Card style={{ alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.md }}>
            <View
              style={{
                ...placeholderBox,
                borderRadius: 12,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                gap: space.sm,
              }}
            >
              <ActivityIndicator color={colors.primary} />
              <Muted>Creating your image… about 20 to 40 seconds</Muted>
            </View>
          </Card>
        )}

        {result && (
          <Card style={{ gap: space.md, padding: space.md }}>
            <Image
              source={{ uri: result.uri }}
              style={{ ...resultBox, alignSelf: 'center', borderRadius: 12 }}
              contentFit="cover"
              accessibilityLabel="Your new image"
            />
            <Button
              title={saveState === 'saved' ? 'Saved to your gallery ✓' : 'Save to gallery'}
              onPress={saveToGallery}
              loading={saveState === 'saving'}
              disabled={saveState === 'saved'}
            />
            <ErrorText message={saveError} />
            <MediaActions source={result.uri} ext="png" />
            <Button
              title={cost !== undefined ? `Try again · ${creditLabel(cost)}` : 'Try again'}
              variant="secondary"
              onPress={create}
              loading={busy}
              disabled={!prompt.trim() || tooFewCredits}
            />
            {saveState !== 'saved' && <Muted style={{ fontSize: 12 }}>This is a preview. Save it to your gallery to keep it.</Muted>}
            <Muted style={{ fontSize: 12 }}>AI images can contain mistakes. Check faces, hands and any text before you post.</Muted>
          </Card>
        )}
      </View>
    </Screen>
  );
}
