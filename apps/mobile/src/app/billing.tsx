import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { getMySubscription, type Subscription } from '@/lib/api-account';
import { useAuth } from '@/lib/auth';
import { formatBalance, useWallet } from '@/lib/useWallet';
import { Card, ErrorText, Muted, Screen } from '@/ui/kit';
import { colors, space } from '@/ui/theme';

const STATUS: Record<Subscription['status'], string> = {
  trialing: 'Free trial',
  active: 'Active',
  past_due: 'Payment overdue',
  canceled: 'Cancelled',
};

export default function Billing() {
  const { user } = useAuth();
  const { balance } = useWallet();
  const [sub, setSub] = useState<Subscription | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getMySubscription(user)
      .then(setSub)
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Could not load your plan.');
        setSub(null);
      });
  }, [user]);

  return (
    <Screen>
      <View style={{ gap: space.lg, paddingTop: space.md }}>
        <Card style={{ gap: 4 }}>
          <Muted>Credits remaining</Muted>
          <Text style={{ fontSize: 32, fontWeight: '700', color: colors.text }}>{formatBalance(balance)}</Text>
        </Card>

        <Card style={{ gap: 4 }}>
          <Muted>Plan</Muted>
          {sub === undefined ? (
            <ActivityIndicator color={colors.primary} />
          ) : sub ? (
            <>
              <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, textTransform: 'capitalize' }}>{sub.plan}</Text>
              <Muted>{STATUS[sub.status]}</Muted>
              {sub.currentPeriodEnd && <Muted>Renews or ends {new Date(sub.currentPeriodEnd).toLocaleDateString()}</Muted>}
            </>
          ) : (
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>No paid plan</Text>
          )}
        </Card>
        <ErrorText message={error} />
        <Muted>To change your plan or add credits, sign in to your account on the Lumora website.</Muted>
      </View>
    </Screen>
  );
}
