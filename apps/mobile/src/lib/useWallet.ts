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

/** A price for a button: "free", "1 credit" or "180 credits" (same wording as the website). */
export function creditLabel(credits: number): string {
  if (credits === 0) return 'free';
  return credits === 1 ? '1 credit' : `${credits.toLocaleString()} credits`;
}

export function formatBalance(balance: number | null | undefined): string {
  if (balance === undefined) return '…';
  return balance === null ? 'Unlimited' : balance.toLocaleString();
}
