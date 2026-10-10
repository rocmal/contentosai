import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { listNotifications } from '@/lib/api-account';
import { useAuth } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';
import { formatBalance, useWallet } from '@/lib/useWallet';
import { Button, Card, Muted, Screen } from '@/ui/kit';
import { colors, space } from '@/ui/theme';

function Row({ icon, label, detail, href }: { icon: keyof typeof Ionicons.glyphMap; label: string; detail?: string; href: Href }) {
  const router = useRouter();
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(href)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md }}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>{label}</Text>
      {detail ? <Text style={{ color: colors.textMuted, fontSize: 14 }}>{detail}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const { balance } = useWallet();
  const [unread, setUnread] = useState(0);
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Your account';

  useFocusEffect(
    useCallback(() => {
      listNotifications()
        .then((r) => setUnread(r.items.filter((n) => !n.readAt).length))
        .catch(() => undefined);
    }, []),
  );

  return (
    <Screen>
      <View style={{ gap: space.lg, paddingTop: space.lg }}>
        <Card style={{ gap: 4 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{name}</Text>
          <Muted>{user?.email}</Muted>
        </Card>
        <Card style={{ paddingVertical: space.sm }}>
          <Row icon="sparkles" label="Co-pilot" href="/copilot" />
          <Row icon="notifications" label="Notifications" detail={unread ? `${unread} new` : undefined} href="/notifications" />
          <Row icon="people" label="Team" href="/team" />
          <Row icon="card" label="Plan and credits" detail={formatBalance(balance)} href="/billing" />
        </Card>
        <Button title="Sign out" variant="secondary" onPress={signOut} />
        <Card style={{ paddingVertical: space.sm }}>
          <Row icon="trash" label="Delete account" href="/delete-account" />
        </Card>
        {__DEV__ && <Muted style={{ fontSize: 12 }}>API: {API_BASE_URL}</Muted>}
      </View>
    </Screen>
  );
}
