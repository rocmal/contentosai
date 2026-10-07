import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { getCreditWallet } from './api';

/** Credit balance, refreshed whenever the screen regains focus. undefined = loading, null = unlimited. */
export function useWallet(): { balance: number | null | undefined; reload: () => void } {
  const [balance, setBalance] = useState<number | null | undefined>(undefined);

  const reload = useCallback(() => {
    getCreditWallet()
      .then((w) => setBalance(w.balance))
      .catch(() => {
        // Leave the last known value; the studios surface real errors when a charge fails.
      });
  }, []);

  useFocusEffect(reload);
  return { balance, reload };
}

export function formatBalance(balance: number | null | undefined): string {
  if (balance === undefined) return '…';
  return balance === null ? 'Unlimited' : balance.toLocaleString();
}
