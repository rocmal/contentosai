import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { Button, ErrorText, Input, Muted } from '@/ui/kit';
import { colors, space } from '@/ui/theme';

export default function SignUp() {
  const { signUp } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = firstName.trim() && lastName.trim() && email.trim() && password.length >= 8;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await signUp({ firstName: firstName.trim(), lastName: lastName.trim(), email, password });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create your account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + space.xl * 2, paddingHorizontal: space.xl, paddingBottom: insets.bottom + space.xl }}
      >
        <View style={{ gap: space.sm, marginBottom: space.xl }}>
          <Text style={{ fontSize: 30, fontWeight: '700', color: colors.text }}>Create your account</Text>
          <Muted>Start creating images, videos and voiceovers.</Muted>
        </View>
        <View style={{ gap: space.md }}>
          <Input placeholder="First name" value={firstName} onChangeText={setFirstName} autoComplete="given-name" textContentType="givenName" accessibilityLabel="First name" />
          <Input placeholder="Last name" value={lastName} onChangeText={setLastName} autoComplete="family-name" textContentType="familyName" accessibilityLabel="Last name" />
          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            accessibilityLabel="Email"
          />
          <Input
            placeholder="Password (8+ characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            accessibilityLabel="Password"
            onSubmitEditing={ready ? submit : undefined}
          />
          <ErrorText message={error} />
          <Button title="Create account" onPress={submit} loading={busy} disabled={!ready} />
          <Button title="I already have an account" variant="secondary" onPress={() => router.replace('/login')} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
