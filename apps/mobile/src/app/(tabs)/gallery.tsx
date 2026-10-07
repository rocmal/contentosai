import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listMyGallery, type MediaAsset, type MediaAssetType } from '@/lib/api';
import { Button, Chip, ChipRow, ErrorText, Muted } from '@/ui/kit';
import { MediaActions } from '@/ui/MediaActions';
import { ScheduleSheet } from '@/ui/ScheduleSheet';
import { colors, space } from '@/ui/theme';

const FILTERS: { id: MediaAssetType | undefined; label: string }[] = [
  { id: undefined, label: 'All' },
  { id: 'image', label: 'Images' },
  { id: 'video', label: 'Videos' },
  { id: 'audio', label: 'Voice' },
];
const COLS = 3;
const GAP = 4;

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return <VideoView player={player} style={{ width: '100%', aspectRatio: 9 / 16, maxHeight: 420, backgroundColor: '#000', borderRadius: 12 }} nativeControls contentFit="contain" />;
}

function Detail({ asset, onClose }: { asset: MediaAsset; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [scheduling, setScheduling] = useState(false);
  const canSchedule = asset.type === 'video' || asset.type === 'character';
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
        {asset.type === 'image' && <Image source={{ uri: asset.url }} style={{ width: '100%', aspectRatio: 1 }} contentFit="contain" />}
        {(asset.type === 'video' || asset.type === 'character') && <VideoPreview uri={asset.url} />}
        {asset.type === 'audio' && <Muted>Voiceover. Use Share to send the audio file.</Muted>}
        {asset.prompt ? <Muted>{asset.prompt}</Muted> : null}
        <MediaActions source={asset.url} ext={ext} savable={asset.type !== 'audio'} />
        {canSchedule && <Button title="Schedule to social" onPress={() => setScheduling(true)} />}
        {scheduling && <ScheduleSheet videoUrl={asset.url} onClose={() => setScheduling(false)} />}
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
      <View style={{ padding: space.lg, paddingBottom: space.sm }}>
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
            <Muted style={{ textAlign: 'center', marginTop: space.xl * 2 }}>Nothing here yet. Create something and it will show up here.</Muted>
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
            ) : (
              <Ionicons name={item.type === 'audio' ? 'musical-notes' : 'play-circle'} size={36} color={colors.primary} />
            )}
          </Pressable>
        )}
      />
      {open && <Detail asset={open} onClose={() => setOpen(null)} />}
    </View>
  );
}
