import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { formatBalance, useWallet } from '@/lib/useWallet';
import { Card, H1, Muted, Screen } from '@/ui/kit';
import { colors, radius, space } from '@/ui/theme';

const STUDIOS: { href: Href; title: string; blurb: string; icon: keyof typeof Ionicons.glyphMap; tint: string }[] = [
  { href: '/create/image', title: 'Image', blurb: 'Posters, product shots and post graphics from a prompt.', icon: 'image', tint: colors.primary },
  { href: '/create/video', title: 'Video', blurb: 'Short vertical or wide clips for Reels and Shorts.', icon: 'videocam', tint: '#7c3aed' },
  { href: '/create/voice', title: 'Voiceover', blurb: 'Natural narration in English and Indian languages.', icon: 'mic', tint: colors.success },
];

export default function CreateHome() {
  const { user } = useAuth();
  const router = useRouter();
  const { balance } = useWallet();

  return (
    <Screen>
      <View style={{ gap: space.lg, paddingTop: space.lg }}>
        <View style={{ gap: 4 }}>
          <H1>Hi{user?.firstName ? `, ${user.firstName}` : ''}</H1>
          <Muted>What would you like to create today?</Muted>
        </View>

        <View style={{ backgroundColor: colors.navy, borderRadius: radius.card, padding: space.lg, gap: 4 }}>
          <Text style={{ color: '#bfdbfe', fontSize: 13 }}>Credits remaining</Text>
          <Text style={{ color: '#fff', fontSize: 32, fontWeight: '700' }} accessibilityLabel={`Credits remaining: ${formatBalance(balance)}`}>
            {formatBalance(balance)}
          </Text>
        </View>

        {STUDIOS.map((s) => (
          <Pressable key={s.title} accessibilityRole="button" accessibilityLabel={`Create ${s.title}`} onPress={() => router.push(s.href)}>
            {({ pressed }) => (
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg, opacity: pressed ? 0.7 : 1 }}>
                <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: s.tint, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={s.icon} size={26} color="#fff" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{s.title}</Text>
                  <Muted>{s.blurb}</Muted>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
              </Card>
            )}
          </Pressable>
        ))}

        <Muted style={{ fontSize: 12 }}>
          AI output is a draft. Check facts, faces and any regulated wording (for example insurance) before you publish.
        </Muted>
      </View>
    </Screen>
  );
}
