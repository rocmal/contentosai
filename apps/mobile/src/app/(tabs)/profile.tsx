import { Text, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { formatBalance, useWallet } from '@/lib/useWallet';
import { API_BASE_URL } from '@/lib/config';
import { Button, Card, Muted, Screen } from '@/ui/kit';
import { colors, space } from '@/ui/theme';

export default function Profile() {
  const { user, signOut } = useAuth();
  const { balance } = useWallet();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Your account';

  return (
    <Screen>
      <View style={{ gap: space.lg, paddingTop: space.lg }}>
        <Card style={{ gap: 4 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{name}</Text>
          <Muted>{user?.email}</Muted>
        </Card>
        <Card style={{ gap: 4 }}>
          <Muted>Credits remaining</Muted>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>{formatBalance(balance)}</Text>
          <Muted style={{ fontSize: 12 }}>Buy more or manage your plan from the Lumora website.</Muted>
        </Card>
        <Button title="Sign out" variant="secondary" onPress={signOut} />
        {__DEV__ && <Muted style={{ fontSize: 12 }}>API: {API_BASE_URL}</Muted>}
      </View>
    </Screen>
  );
}
