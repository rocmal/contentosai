import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { Button, ErrorText, Input, Muted } from '@/ui/kit';
import { colors, space } from '@/ui/theme';

export default function Login() {
  const { signIn } = useAuth();
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
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>L</Text>
        </View>
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
      </View>
    </KeyboardAvoidingView>
  );
}
