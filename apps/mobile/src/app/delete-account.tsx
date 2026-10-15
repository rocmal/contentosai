import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { Button, Card, ErrorText, Field, Input, Muted, Screen } from '@/ui/kit';
import { colors, space } from '@/ui/theme';

/** Required by the App Store and Google Play for apps that let people sign up. */
export default function DeleteAccount() {
  const { user, deleteAccount } = useAuth();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    Alert.alert('Delete your account?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  }

  async function run() {
    setBusy(true);
    setError(null);
    try {
      // On success the session ends and the app returns to sign-in on its own.
      await deleteAccount(password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the account.');
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ gap: space.lg, paddingTop: space.lg }}>
        <Card style={{ gap: space.sm, borderColor: colors.danger }}>
          <Muted style={{ color: colors.text, fontWeight: '600' }}>This permanently deletes {user?.email}.</Muted>
          <Muted>
            You are signed out on every device and can no longer sign in. Your name and email are removed. Images, videos and
            posts you saved to a shared team workspace stay with that team. Unused credits are not refunded.
          </Muted>
          <Muted>
            If you own a workspace that still has other members, remove them first (Team) so nobody is left without an owner.
          </Muted>
        </Card>
        <Field label="Confirm with your password">
          <Input
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            accessibilityLabel="Password"
          />
        </Field>
        <ErrorText message={error} />
        <Button title="Delete my account" onPress={confirm} loading={busy} disabled={!password} />
      </View>
    </Screen>
  );
}
