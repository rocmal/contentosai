import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import {
  generateImage,
  getImageOptions,
  type ImageAspectRatio,
  type ImageProvider,
  type ImageProviderOption,
  type ImageQuality,
} from '@/lib/api';
import { useWallet } from '@/lib/useWallet';
import { Button, Card, Chip, ChipRow, ErrorText, Field, Input, Muted, Screen } from '@/ui/kit';
import { MediaActions } from '@/ui/MediaActions';
import { space } from '@/ui/theme';

const RATIOS: { id: ImageAspectRatio; label: string }[] = [
  { id: '1:1', label: 'Square' },
  { id: '4:5', label: 'Portrait 4:5' },
  { id: '9:16', label: 'Story 9:16' },
  { id: '16:9', label: 'Wide 16:9' },
  { id: '2:3', label: 'Tall 2:3' },
];

function ratioValue(r: ImageAspectRatio): number {
  const [w, h] = r.split(':').map(Number);
  return w / h;
}

export default function ImageStudio() {
  const { width } = useWindowDimensions();
  const { reload } = useWallet();
  const [options, setOptions] = useState<ImageProviderOption[] | null>(null);
  const [provider, setProvider] = useState<ImageProvider | null>(null);
  const [quality, setQuality] = useState<ImageQuality>('standard');
  const [ratio, setRatio] = useState<ImageAspectRatio>('1:1');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [shownRatio, setShownRatio] = useState<ImageAspectRatio>('1:1');

  useEffect(() => {
    getImageOptions()
      .then(({ providers }) => {
        setOptions(providers);
        const first = providers.find((p) => p.configured && p.recommended) ?? providers.find((p) => p.configured);
        if (first) setProvider(first.id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load image options.'));
  }, []);

  const current = useMemo(() => options?.find((o) => o.id === provider) ?? null, [options, provider]);
  const cost = current?.qualities.find((q) => q.id === quality)?.credits;

  async function create() {
    if (!provider) return;
    setBusy(true);
    setError(null);
    try {
      const result = await generateImage({ prompt: prompt.trim(), provider, aspectRatio: ratio, quality });
      if (result.status === 'processing' || result.images.length === 0) {
        setError('The image is still rendering. It will appear in Gallery shortly.');
      } else {
        setImages(result.images);
        setShownRatio(ratio);
      }
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the image.');
    } finally {
      setBusy(false);
    }
  }

  const imageWidth = width - space.lg * 2;

  return (
    <Screen>
      <View style={{ gap: space.xl, paddingTop: space.md }}>
        <Field label="Describe your image">
          <Input
            multiline
            value={prompt}
            onChangeText={setPrompt}
            maxLength={4000}
            placeholder="A festive Diwali greeting poster, warm diyas, soft gold light…"
            accessibilityLabel="Image prompt"
          />
        </Field>

        <Field label="Shape">
          <ChipRow>
            {RATIOS.map((r) => (
              <Chip key={r.id} label={r.label} selected={ratio === r.id} onPress={() => setRatio(r.id)} />
            ))}
          </ChipRow>
        </Field>

        {options && (
          <Field label="Model">
            <ChipRow>
              {options.map((o) => (
                <Chip key={o.id} label={o.label} selected={provider === o.id} disabled={!o.configured} onPress={() => setProvider(o.id)} />
              ))}
            </ChipRow>
            {current && <Muted>{current.note}</Muted>}
            {!options.some((o) => o.configured) && <Muted>No image model is set up on the server yet.</Muted>}
          </Field>
        )}

        {current && (
          <Field label="Quality">
            <ChipRow>
              {current.qualities.map((q) => (
                <Chip key={q.id} label={`${q.label} · ${q.credits} cr`} selected={quality === q.id} onPress={() => setQuality(q.id)} />
              ))}
            </ChipRow>
          </Field>
        )}

        <ErrorText message={error} />
        <Button
          title={cost !== undefined ? `Create image · ${cost} credits` : 'Create image'}
          onPress={create}
          loading={busy}
          disabled={!prompt.trim() || !provider}
        />

        {images.map((src, i) => (
          <Card key={`${i}-${src.slice(-24)}`} style={{ gap: space.md, padding: space.md }}>
            <Image
              source={{ uri: src }}
              style={{ width: imageWidth - space.md * 2 - 2, aspectRatio: ratioValue(shownRatio), borderRadius: 12 }}
              contentFit="cover"
              accessibilityLabel="Generated image"
            />
            <MediaActions source={src} ext="png" />
          </Card>
        ))}
        {images.length > 0 && <Muted>AI images can contain mistakes. Check faces, hands and any text before you post.</Muted>}
      </View>
    </Screen>
  );
}
