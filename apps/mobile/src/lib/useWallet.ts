import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { getCreditWallet } from './api';

/** Credit balance, refreshed whenever the screen regains focus. undefined = loading, null = unlimited.
 * paused = the plan ended: the credits are kept but cannot be spent until it is renewed. */
export function useWallet(): { balance: number | null | undefined; paused: boolean; reload: () => void } {
  const [balance, setBalance] = useState<number | null | undefined>(undefined);
  const [paused, setPaused] = useState(false);

  const reload = useCallback(() => {
    getCreditWallet()
      .then((w) => {
        setBalance(w.balance);
        setPaused(Boolean(w.pausedAt));
      })
      .catch(() => {
        // Leave the last known value; the studios surface real errors when a charge fails.
      });
  }, []);

  useFocusEffect(reload);
  return { balance, paused, reload };
}

/** The out-of-credits explanation for a studio: paused credits need a renewal, otherwise more credits. */
export function outOfCreditsDetail(paused: boolean, balance: number | null | undefined, cost?: number): string {
  if (paused) return 'Your plan has ended, so your credits are paused. Renew on the Lumora website to use them.';
  return `You have ${formatBalance(balance)} credits${cost !== undefined ? `; this needs ${cost}` : ''}. Add credits on the Lumora website.`;
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
