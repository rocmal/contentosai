import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { Button, ErrorText, Input, Muted } from '@/ui/kit';
import { LogoMark } from '@/ui/LogoMark';
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + space.xl * 2, paddingHorizontal: space.xl }}
    >
      <View style={{ gap: space.sm, marginBottom: space.xl * 1.5 }}>
        <LogoMark />
        <Text style={{ fontSize: 30, fontWeight: '700', color: colors.text, marginTop: space.md }}>Welcome back</Text>
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
    </KeyboardAvoidingView>
  );
}
