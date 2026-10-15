import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { Button, ErrorText, Input, Muted } from '@/ui/kit';
import { LogoMark } from '@/ui/LogoMark';
import { AuroraBackdrop, BrandSplash, GlassChip, Waveform } from '@/ui/LoginArt';
import { colors, space } from '@/ui/theme';

export default function Login() {
  const { signIn } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#0a0f24' }}>
      <StatusBar style="light" />
      <AuroraBackdrop />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
        <View style={{ paddingTop: insets.top + space.xl * 1.5, paddingBottom: space.xl * 2.5, paddingHorizontal: space.xl, alignItems: 'center' }}>
          <LogoMark size={64} />
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginTop: space.md }}>Lumora</Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: space.xs }}>Images, videos and voice in minutes</Text>
          <View style={{ marginTop: space.lg, opacity: 0.85 }}>
            <Waveform />
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.lg }}>
            <GlassChip label="Image" dot="#fbbf24" />
            <GlassChip label="Video" dot="#60a5fa" />
            <GlassChip label="Voice" dot="#c4b5fd" />
          </View>
        </View>

        <View
          style={{
            flex: 1,
            width: '100%',
            maxWidth: 560,
            alignSelf: 'center',
            marginTop: -28,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            backgroundColor: colors.background,
            paddingHorizontal: space.xl,
            paddingTop: space.xl * 1.25,
            paddingBottom: insets.bottom + space.xl,
          }}
        >
          <View style={{ gap: space.xs, marginBottom: space.xl }}>
            <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>Welcome back</Text>
            <Muted>Sign in to create images, videos and voiceovers.</Muted>
          </View>

          <View style={{ gap: space.md }}>
            <Input
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="username"
              accessibilityLabel="Email"
            />
            <Input
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              accessibilityLabel="Password"
              onSubmitEditing={submit}
            />
            <ErrorText message={error} />
            <Button title="Sign in" onPress={submit} loading={busy} disabled={!email.trim() || !password} />
            <Button title="Create an account" variant="secondary" onPress={() => router.replace('/signup')} />
            <Pressable accessibilityRole="button" onPress={() => router.push('/forgot-password')} hitSlop={8} style={{ alignSelf: 'center', padding: space.sm }}>
              <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '600' }}>Forgot password?</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <BrandSplash />
    </KeyboardAvoidingView>
  );
}
