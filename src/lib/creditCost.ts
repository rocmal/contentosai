import { useEffect, useState } from 'react';
import { CreditRates, getCreditRates } from './api';

let cached: CreditRates | null = null;
let inFlight: Promise<CreditRates> | null = null;

/** The credit price list, fetched once and shared by every screen that shows a cost. */
export function useCreditRates(): CreditRates | null {
  const [rates, setRates] = useState<CreditRates | null>(cached);

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    inFlight ??= getCreditRates();
    inFlight
      .then((value) => {
        cached = value;
        if (!cancelled) setRates(value);
      })
      .catch(() => {
        // No price shown rather than a wrong one; try again next time a screen asks.
        inFlight = null;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return rates;
}

const rateFor = (table: Record<string, number>, provider: string): number => table[provider] ?? table.default;

/** Credits for a voiceover: whole minutes of speech at the provider's rate, at least one minute. */
export function voiceCreditCost(rates: CreditRates, provider: string, text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / rates.voice.wordsPerMinute));
  return minutes * rateFor(rates.voice.perMinute, provider);
}

/** Credits for an AI video: charged per 10 seconds, rounded up. */
export function videoCreditCost(rates: CreditRates, provider: string, seconds: number): number {
  const blocks = Math.max(1, Math.ceil(seconds / 10));
  return blocks * rateFor(rates.video.per10Seconds, provider);
}
