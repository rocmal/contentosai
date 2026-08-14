import { Injectable, Logger } from '@nestjs/common';

export const SUPPORTED_DISPLAY_CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'AED', 'AUD', 'CAD', 'SGD'] as const;
export type SupportedDisplayCurrency = (typeof SUPPORTED_DISPLAY_CURRENCIES)[number];

interface RatesCache {
  fetchedAt: number;
  rates: Record<string, number>;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FX_API_URL = 'https://open.er-api.com/v6/latest/USD';

/**
 * USD-based exchange rates for display-only price localization (e.g. showing
 * a non-India visitor "~$49" as "~Rs 4,070" on the pricing page). This never
 * touches money movement - actual checkout always charges INR via Razorpay
 * (see CheckoutService) regardless of what currency was displayed. Cached
 * in-memory (no Redis plumbing needed for a number that's allowed to be a
 * few hours stale) and fails soft to `{ USD, 1 }` if the upstream rate API
 * is ever unreachable, so a flaky third party can never break pricing pages.
 */
@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private cache: RatesCache | null = null;
  private inFlight: Promise<RatesCache> | null = null;

  async getRate(requestedCurrency: string): Promise<{ currency: SupportedDisplayCurrency; rate: number }> {
    const currency = requestedCurrency.toUpperCase();
    if (currency === 'USD' || !this.isSupported(currency)) {
      return { currency: 'USD', rate: 1 };
    }

    const rates = await this.getRates();
    const rate = rates[currency];
    return rate ? { currency, rate } : { currency: 'USD', rate: 1 };
  }

  private isSupported(currency: string): currency is SupportedDisplayCurrency {
    return (SUPPORTED_DISPLAY_CURRENCIES as readonly string[]).includes(currency);
  }

  private async getRates(): Promise<Record<string, number>> {
    if (this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.cache.rates;
    }
    if (!this.inFlight) {
      this.inFlight = this.fetchRates().finally(() => {
        this.inFlight = null;
      });
    }
    this.cache = await this.inFlight;
    return this.cache.rates;
  }

  private async fetchRates(): Promise<RatesCache> {
    try {
      const response = await fetch(FX_API_URL);
      if (!response.ok) {
        throw new Error(`FX rate API returned ${response.status}`);
      }
      const body = (await response.json()) as { rates?: Record<string, number> };
      if (!body.rates) {
        throw new Error('FX rate API response was missing "rates"');
      }
      return { fetchedAt: Date.now(), rates: body.rates };
    } catch (error) {
      this.logger.warn(`Could not refresh FX rates, falling back to USD-only: ${(error as Error).message}`);
      return this.cache ?? { fetchedAt: Date.now(), rates: {} };
    }
  }
}
