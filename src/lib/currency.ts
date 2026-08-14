/**
 * Best-effort, zero-network guess at the visitor's display currency from the
 * browser's own locale/timezone - "based on the browser" per the product
 * ask. This is a display-only hint; the real number comes from the backend's
 * GET /pricing/fx-rate (see api.ts's fetchExchangeRate), and the actual
 * checkout charge is always INR via Razorpay regardless of what's displayed.
 *
 * Timezone is checked before language: navigator.language reflects the
 * browser/OS language *preference*, not location - plenty of people outside
 * the US/UK run their browser in "English (UK)"/"English (US)" regardless of
 * where they actually are (e.g. an India-based visitor whose Chrome is set
 * to en-GB), which made language-first detection wrong in exactly that case.
 * Timezone is tied to the OS clock, not a language choice, so it's the more
 * reliable of the two weak signals available without a server-side geo-IP call.
 */
const TIMEZONE_TO_CURRENCY: Record<string, string> = {
  'Asia/Kolkata': 'INR',
  'Asia/Calcutta': 'INR',
  'Europe/London': 'GBP',
  'Asia/Dubai': 'AED',
  'Asia/Singapore': 'SGD',
  // Australia
  'Australia/Sydney': 'AUD',
  'Australia/Melbourne': 'AUD',
  'Australia/Brisbane': 'AUD',
  'Australia/Perth': 'AUD',
  'Australia/Adelaide': 'AUD',
  'Australia/Darwin': 'AUD',
  'Australia/Hobart': 'AUD',
  // Canada
  'America/Toronto': 'CAD',
  'America/Vancouver': 'CAD',
  'America/Edmonton': 'CAD',
  'America/Winnipeg': 'CAD',
  'America/Halifax': 'CAD',
  'America/Regina': 'CAD',
  'America/St_Johns': 'CAD',
  // Eurozone (major cities)
  'Europe/Paris': 'EUR',
  'Europe/Berlin': 'EUR',
  'Europe/Madrid': 'EUR',
  'Europe/Rome': 'EUR',
  'Europe/Amsterdam': 'EUR',
  'Europe/Dublin': 'EUR',
  'Europe/Lisbon': 'EUR',
  'Europe/Vienna': 'EUR',
  'Europe/Brussels': 'EUR',
  'Europe/Helsinki': 'EUR',
  'Europe/Athens': 'EUR',
  // United States
  'America/New_York': 'USD',
  'America/Chicago': 'USD',
  'America/Denver': 'USD',
  'America/Los_Angeles': 'USD',
  'America/Anchorage': 'USD',
  'America/Phoenix': 'USD',
  'Pacific/Honolulu': 'USD',
};

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
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (TIMEZONE_TO_CURRENCY[timeZone]) {
      return TIMEZONE_TO_CURRENCY[timeZone];
    }

    // Timezone wasn't in the table above - language region is a weaker but
    // still useful fallback (better than defaulting straight to USD).
    const locale = navigator.language || navigator.languages?.[0] || 'en-US';
    const region = locale.split('-')[1]?.toUpperCase();
    if (region && REGION_TO_CURRENCY[region]) {
      return REGION_TO_CURRENCY[region];
    }
  } catch {
    // Intl/navigator access failed for some reason - fall through to USD.
  }

  return 'USD';
}
