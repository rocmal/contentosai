import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, Text, View } from 'react-native';
import {
  PLATFORM_LABEL,
  cancelPublishingJob,
  listContent,
  listPublishingJobs,
  type ContentItem,
  type PublishingJob,
  type SocialPlatform,
} from '@/lib/api-social';
import { Chip, ChipRow, ErrorText, Muted } from '@/ui/kit';
import { colors, radius, space } from '@/ui/theme';

type Filter = 'scheduled' | 'published' | 'failed';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'scheduled', label: 'Upcoming' },
  { id: 'published', label: 'Published' },
  { id: 'failed', label: 'Failed' },
];
const STATUS_COLOR: Record<Filter, string> = { scheduled: colors.primary, published: colors.success, failed: colors.danger };

function when(job: PublishingJob): string {
  const iso = job.status === 'published' ? job.publishedAt ?? job.scheduledAt : job.scheduledAt;
  return iso ? new Date(iso).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
}

export default function Calendar() {
  const [jobs, setJobs] = useState<PublishingJob[] | null>(null);
  const [content, setContent] = useState<Map<string, ContentItem>>(new Map());
  const [filter, setFilter] = useState<Filter>('scheduled');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [j, c] = await Promise.all([listPublishingJobs(), listContent()]);
      setJobs(j);
      setContent(new Map(c.map((x) => [x.id, x])));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your calendar.');
      setJobs((prev) => prev ?? []);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const shown = useMemo(() => {
    const list = (jobs ?? []).filter((j) => j.status === filter);
    // Upcoming soonest first; history newest first.
    return list.sort((a, b) => {
      const ta = new Date((a.status === 'published' ? a.publishedAt : a.scheduledAt) ?? 0).getTime();
      const tb = new Date((b.status === 'published' ? b.publishedAt : b.scheduledAt) ?? 0).getTime();
      return filter === 'scheduled' ? ta - tb : tb - ta;
    });
  }, [jobs, filter]);

  function confirmCancel(job: PublishingJob) {
    Alert.alert('Cancel this post?', 'It will not be published.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel post',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelPublishingJob(job.id);
            setJobs((prev) => prev?.filter((j) => j.id !== job.id) ?? prev);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not cancel the post.');
          }
        },
      },
    ]);
  }

  if (jobs === null) return <ActivityIndicator color={colors.primary} style={{ marginTop: space.xl * 2 }} />;

  return (
    <FlatList
      data={shown}
      keyExtractor={(j) => j.id}
      contentContainerStyle={{ padding: space.lg, gap: space.md }}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
      ListHeaderComponent={
        <View style={{ gap: space.md, marginBottom: space.sm }}>
          <ChipRow>
            {FILTERS.map((f) => (
              <Chip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />
            ))}
          </ChipRow>
          <ErrorText message={error} />
        </View>
      }
      ListEmptyComponent={
        error ? null : (
          <Muted style={{ textAlign: 'center', marginTop: space.xl }}>
            {filter === 'scheduled' ? 'Nothing scheduled. Open a video in Gallery and tap Schedule.' : 'Nothing here yet.'}
          </Muted>
        )
      }
      renderItem={({ item }) => {
        const c = item.contentId ? content.get(item.contentId) : undefined;
        const title = c?.metadata?.caption || c?.title || 'Video post';
        return (
          <View style={{ padding: space.lg, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: STATUS_COLOR[item.status] }}>
                {PLATFORM_LABEL[item.platform as SocialPlatform] ?? item.platform}
              </Text>
              <Muted style={{ fontSize: 13 }}>{when(item)}</Muted>
            </View>
            <Text style={{ fontSize: 15, color: colors.text }} numberOfLines={3}>
              {title}
            </Text>
            {item.status === 'scheduled' && (
              <Pressable accessibilityRole="button" onPress={() => confirmCancel(item)} hitSlop={8}>
                <Text style={{ color: colors.danger, fontWeight: '600' }}>Cancel post</Text>
              </Pressable>
            )}
            {item.status === 'published' && item.permalink && (
              <Pressable accessibilityRole="link" onPress={() => Linking.openURL(item.permalink as string)} hitSlop={8}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>View live post</Text>
              </Pressable>
            )}
            {item.status === 'failed' && <Muted>This post could not be published. Check the account connection and schedule it again.</Muted>}
          </View>
        );
      }}
    />
  );
}
