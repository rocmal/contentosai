import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { Button, Card, ErrorText, Field, Input, Muted, Screen } from '@/ui/kit';
import { space } from '@/ui/theme';

export default function DeleteAccount() {
  const { deleteAccount } = useAuth();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    Alert.alert('Delete your account?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete account',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          setError(null);
          try {
            await deleteAccount(password || undefined);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not delete your account.');
            setBusy(false);
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <View style={{ gap: space.lg, paddingTop: space.md }}>
        <Card style={{ gap: space.sm }}>
          <Muted>
            Deleting your account removes your sign-in, name and email, and you will be signed out everywhere. Content your team created in a
            shared workspace stays with that workspace. To cancel a paid plan first, use the Lumora website.
          </Muted>
        </Card>
        <Field label="Confirm with your password">
          <Input
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            placeholder="Password"
            accessibilityLabel="Password"
          />
          <Muted>Signed up with Google or another provider and never set a password? Leave this empty.</Muted>
        </Field>
        <ErrorText message={error} />
        <Button title="Delete my account" onPress={confirm} loading={busy} />
      </View>
    </Screen>
  );
}
