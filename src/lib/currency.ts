/**
 * Best-effort, zero-network guess at the visitor's display currency from the
 * browser's own locale/timezone - "based on the browser" per the product
 * ask. This is a display-only hint; the real number comes from the backend's
 * GET /pricing/fx-rate (see api.ts's fetchExchangeRate), and the actual
 * checkout charge is always INR via Razorpay regardless of what's displayed.
 */
const REGION_TO_CURRENCY: Record<string, string> = {
  IN: 'INR',
  US: 'USD',
  GB: 'GBP',
  AE: 'AED',
  AU: 'AUD',
  CA: 'CAD',
  SG: 'SGD',
  // Eurozone
  DE: 'EUR',
  FR: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  IE: 'EUR',
  PT: 'EUR',
  AT: 'EUR',
  BE: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
};

export function detectLikelyCurrency(): string {
  try {
    const locale = navigator.language || navigator.languages?.[0] || 'en-US';
    const region = locale.split('-')[1]?.toUpperCase();
    if (region && REGION_TO_CURRENCY[region]) {
      return REGION_TO_CURRENCY[region];
    }

    // navigator.language sometimes omits the region (e.g. plain "en") -
    // timezone is a reasonable secondary signal for the most common case.
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (timeZone === 'Asia/Kolkata' || timeZone === 'Asia/Calcutta') {
      return 'INR';
    }
  } catch {
    // Intl/navigator access failed for some reason - fall through to USD.
  }

  return 'USD';
}
