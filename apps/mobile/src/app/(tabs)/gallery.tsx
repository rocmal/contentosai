import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listMyGallery, type MediaAsset, type MediaAssetType } from '@/lib/api';
import { useVideoAspect } from '@/lib/videoAspect';
import { Button, Chip, ChipRow, ErrorText, Muted } from '@/ui/kit';
import { MediaActions } from '@/ui/MediaActions';
import { useMediaBox } from '@/ui/mediaBox';
import { ShapeLabel } from '@/ui/VideoShape';
import { PostSheet } from '@/ui/PostSheet';
import { UploadBar } from '@/ui/UploadBar';
import { colors, space } from '@/ui/theme';

const FILTERS: { id: MediaAssetType | undefined; label: string }[] = [
  { id: undefined, label: 'All' },
  { id: 'image', label: 'Images' },
  { id: 'video', label: 'Videos' },
  { id: 'audio', label: 'Audio' },
];
const COLS = 3;
const GAP = 4;

/** Sheet padding on both sides of the preview. */
const DETAIL_INSET = space.lg * 2;

/** Videos keep their own shape (wide or tall); until it is known the box is wide, the more common case. */
function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  const actual = useVideoAspect(player, uri);
  const box = useMediaBox(actual ?? 16 / 9, DETAIL_INSET, 420);
  return (
    <View style={{ gap: space.sm }}>
      <VideoView player={player} style={{ ...box, alignSelf: 'center', backgroundColor: '#000', borderRadius: 12 }} nativeControls contentFit="contain" />
      {actual !== null && <ShapeLabel ratio={actual} />}
    </View>
  );
}

/** Pictures keep their own shape too: square until the file reports its size. */
function ImagePreview({ uri }: { uri: string }) {
  const [ratio, setRatio] = useState(1);
  const box = useMediaBox(ratio, DETAIL_INSET, 420);
  return (
    <Image
      source={{ uri }}
      style={{ ...box, alignSelf: 'center', borderRadius: 12 }}
      contentFit="contain"
      onLoad={({ source }) => {
        if (source.width > 0 && source.height > 0) setRatio(source.width / source.height);
      }}
    />
  );
}

function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Play/pause with progress for voiceovers and uploaded audio. */
function AudioPreview({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    // Play through the speaker even when the iPhone ring/silent switch is on.
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }, []);

  function toggle() {
    if (status.playing) player.pause();
    else {
      if (status.duration > 0 && status.currentTime >= status.duration - 0.2) player.seekTo(0);
      player.play();
    }
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause' : 'Play'}
        onPress={toggle}
        style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name={status.playing ? 'pause' : 'play'} size={26} color="#fff" />
      </Pressable>
      <View style={{ flex: 1, gap: 6 }}>
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
  );
}

function Detail({ asset, onClose }: { asset: MediaAsset; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [scheduling, setScheduling] = useState(false);
  // Videos go to any connected account; images to LinkedIn (see PLATFORM_MEDIA_SUPPORT).
  const canSchedule = asset.type === 'video' || asset.type === 'character' || asset.type === 'image';
  const ext = asset.type === 'video' ? 'mp4' : asset.type === 'audio' ? 'mp3' : 'png';
  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, padding: space.lg, paddingBottom: insets.bottom + space.lg, gap: space.lg, backgroundColor: colors.background }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 }} numberOfLines={1}>
            {asset.fileName}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color={colors.textMuted} />
          </Pressable>
        </View>
        {asset.type === 'image' && <ImagePreview uri={asset.url} />}
        {(asset.type === 'video' || asset.type === 'character') && <VideoPreview uri={asset.url} />}
        {asset.type === 'audio' && <AudioPreview uri={asset.url} />}
        {asset.prompt ? <Muted>{asset.prompt}</Muted> : null}
        <MediaActions source={asset.url} ext={ext} savable={asset.type !== 'audio'} />
        {canSchedule && <Button title="Post or schedule" onPress={() => setScheduling(true)} />}
        {scheduling && (
          <PostSheet
            asset={{ id: asset.id, type: asset.type === 'image' ? 'image' : 'video' }}
            onClose={() => setScheduling(false)}
          />
        )}
      </View>
    </Modal>
  );
}

export default function Gallery() {
  const { width } = useWindowDimensions();
  const size = (width - GAP * (COLS + 1)) / COLS;
  const [filter, setFilter] = useState<MediaAssetType | undefined>(undefined);
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<MediaAsset | null>(null);

  const load = useCallback(async (type: MediaAssetType | undefined, nextPage: number, replace: boolean) => {
    try {
      const res = await listMyGallery({ type, page: nextPage, limit: 24 });
      setItems((prev) => (replace ? res.items : [...prev, ...res.items]));
      setPage(res.meta.currentPage);
      setPages(res.meta.totalPages);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your gallery.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(filter, 1, true);
    }, [filter, load]),
  );

  function pick(next: MediaAssetType | undefined) {
    setFilter(next);
    setItems([]);
    setLoading(true);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: space.lg, paddingBottom: space.sm, gap: space.md }}>
        <UploadBar filter={filter} onUploaded={() => load(filter, 1, true)} />
        <ChipRow>
          {FILTERS.map((f) => (
            <Chip key={f.label} label={f.label} selected={filter === f.id} onPress={() => pick(f.id)} />
          ))}
        </ChipRow>
      </View>
      {error && (
        <View style={{ paddingHorizontal: space.lg, gap: space.sm }}>
          <ErrorText message={error} />
          <Button title="Try again" variant="secondary" onPress={() => load(filter, 1, true)} />
        </View>
      )}
      <FlatList
        data={items}
        key={COLS}
        numColumns={COLS}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: GAP / 2 }}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load(filter, 1, true);
        }}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (!loading && page < pages) load(filter, page + 1, false);
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: space.xl * 2 }} />
          ) : error ? null : (
            <Muted style={{ textAlign: 'center', marginTop: space.xl * 2 }}>Nothing here yet. Create something, or tap Upload from phone to add your own photos and videos.</Muted>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.fileName}`}
            onPress={() => setOpen(item)}
            style={{ width: size, height: size, margin: GAP / 2, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}
          >
            {item.type === 'image' ? (
              <Image source={{ uri: item.url }} style={{ width: size, height: size }} contentFit="cover" recyclingKey={item.id} />
            ) : item.type === 'audio' ? (
              // Audio has no picture, so the name tells the files apart.
              <View style={{ alignItems: 'center', gap: 6, paddingHorizontal: 8 }}>
                <Ionicons name="musical-notes" size={30} color={colors.primary} />
                <Text numberOfLines={2} style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center' }}>
                  {item.fileName}
                </Text>
              </View>
            ) : (
              <Ionicons name="play-circle" size={36} color={colors.primary} />
            )}
          </Pressable>
        )}
      />
      {open && <Detail asset={open} onClose={() => setOpen(null)} />}
    </View>
  );
}
