import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { requestPasswordReset } from '@/lib/api';
import { Button, ErrorText, Input, Muted } from '@/ui/kit';
import { colors, space } from '@/ui/theme';

export default function ForgotPassword() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the email. Try again in a minute.');
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
        <Text style={{ fontSize: 30, fontWeight: '700', color: colors.text }}>Reset your password</Text>
        <Muted>
          {sent
            ? `If ${email.trim()} has a Lumora account, a reset link is on its way. Open it, choose a new password, then sign in here. Check spam if it has not arrived in a few minutes.`
            : 'Enter the email you sign in with and we will send you a link to choose a new password.'}
        </Muted>
      </View>

      <View style={{ gap: space.md }}>
        {!sent && (
          <>
            <Input
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="username"
              accessibilityLabel="Email"
              onSubmitEditing={submit}
            />
            <ErrorText message={error} />
            <Button title="Send reset link" onPress={submit} loading={busy} disabled={!email.includes('@')} />
          </>
        )}
        <Button title="Back to sign in" variant="secondary" onPress={() => router.replace('/login')} />
      </View>
    </KeyboardAvoidingView>
  );
}
