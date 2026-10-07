import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { listNotifications, markNotificationRead, type AppNotification } from '@/lib/api-account';
import { ErrorText, Muted } from '@/ui/kit';
import { colors, radius, space } from '@/ui/theme';

const DOT: Record<AppNotification['type'], string> = {
  info: colors.primary,
  success: colors.success,
  warning: '#d97706',
  error: colors.danger,
};

export default function Notifications() {
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems((await listNotifications()).items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load notifications.');
      setItems((prev) => prev ?? []);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function open(n: AppNotification) {
    if (n.readAt) return;
    setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)) ?? prev);
    markNotificationRead(n.id).catch(() => undefined);
  }

  if (items === null) return <ActivityIndicator color={colors.primary} style={{ marginTop: space.xl * 2 }} />;

  return (
    <FlatList
      data={items}
      keyExtractor={(n) => n.id}
      contentContainerStyle={{ padding: space.lg, gap: space.md }}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
      ListHeaderComponent={<ErrorText message={error} />}
      ListEmptyComponent={error ? null : <Muted style={{ textAlign: 'center', marginTop: space.xl }}>You are all caught up.</Muted>}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => open(item)}
          style={{ flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: radius.card, backgroundColor: item.readAt ? colors.background : colors.primarySoft, borderWidth: 1, borderColor: colors.border }}
        >
          <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 6, backgroundColor: item.readAt ? colors.border : DOT[item.type] }} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 15, fontWeight: item.readAt ? '500' : '700', color: colors.text }}>{item.title}</Text>
            <Muted>{item.message}</Muted>
            <Muted style={{ fontSize: 12, color: colors.textFaint }}>{new Date(item.createdAt).toLocaleString()}</Muted>
          </View>
        </Pressable>
      )}
    />
  );
}
