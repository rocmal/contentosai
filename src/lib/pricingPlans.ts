// Single source of truth for Lumora OS pricing - used by both the public
// landing page and the in-app BillingView so the two never show different
// numbers for the same plan name.
export type BillingCycle = 'monthly' | 'annual';

export interface PricingPlan {
  key: 'starter' | 'pro' | 'enterprise';
  name: string;
  tagline: string;
  /** Per-month USD price. null means "custom / contact sales" (Enterprise). */
  priceMonthly: number | null;
  /** Per-month USD price when billed annually (~20% off). */
  priceAnnual: number | null;
  /** Exact monthly INR price actually charged via Razorpay - matches apps/api's
   * PLAN_PRICING_INR (billing.constants.ts) exactly, keep both in sync. Used
   * instead of an FX-converted approximation so an India-based visitor never
   * sees a different number here than what checkout actually charges. null
   * for Enterprise (custom) and doesn't apply to the annual cycle (no annual
   * charge flow exists yet - see billing.constants.ts). */
  priceMonthlyINR: number | null;
  /** Matches apps/api's PLAN_CREDIT_ALLOTMENTS - null means unlimited (Enterprise). */
  creditsPerMonth: number | null;
  credits: string;
  seats: string;
  /** Matches apps/api's PLAN_SEAT_LIMITS (organizations.constants.ts) - null
   * means unlimited (Enterprise). Enforced server-side in
   * OrganizationsService.addMember(); this is only for displaying "X of Y
   * seats used" client-side. */
  seatLimit: number | null;
  popular: boolean;
  features: string[];
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    key: 'starter',
    name: 'Starter',
    tagline: 'For individuals and small teams getting started.',
    priceMonthly: 49,
    priceAnnual: 39,
    priceMonthlyINR: 4000,
    creditsPerMonth: 2500,
    credits: '2,500 credits / month',
    seats: '1 seat',
    seatLimit: 1,
    popular: false,
    features: [
      'Image, Voice & Video Studio',
      '1 Brand Brain profile',
      'Standard voice library',
      'Community support',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    tagline: 'For growing marketing teams shipping weekly.',
    priceMonthly: 149,
    priceAnnual: 119,
    priceMonthlyINR: 10000,
    creditsPerMonth: 10000,
    credits: '10,000 credits / month',
    seats: 'Up to 5 seats',
    seatLimit: 5,
    popular: true,
    features: [
      'Everything in Starter',
      'Character Studio (lip-sync avatars)',
      'Custom voice cloning',
      '3 active AI Agents',
      'Priority support',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    tagline: 'For agencies and large organizations at scale.',
    priceMonthly: null,
    priceAnnual: null,
    priceMonthlyINR: null,
    creditsPerMonth: null,
    credits: 'Unlimited credits',
    seats: 'Unlimited seats',
    seatLimit: null,
    popular: false,
    features: [
      'Everything in Pro',
      'Unlimited AI Agents',
      'Dedicated success manager',
      'SSO & custom integrations',
      'Custom usage-based billing',
    ],
  },
];

export interface LocalizedRate {
  /** ISO 4217 code, e.g. "INR" - units of this currency per 1 USD. */
  currency: string;
  rate: number;
}

/** `localized` is optional and purely cosmetic - pass it once
 * lib/currency.ts's detectLikelyCurrency + api.ts's fetchExchangeRate have
 * resolved, to show an approximate price in the visitor's currency. Omit it
 * (or pass `{ currency: 'USD', rate: 1 }`) to keep the exact USD price -
 * every existing caller that doesn't pass it behaves exactly as before. */
export function formatPlanPrice(plan: PricingPlan, billingCycle: BillingCycle, localized?: LocalizedRate) {
  if (plan.priceMonthly == null || plan.priceAnnual == null) {
    return { priceDisplay: 'Custom', periodLabel: 'contact us', ctaLabel: 'Contact sales' };
  }
  const usdPrice = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;
  const periodLabel = billingCycle === 'annual' ? '/mo, billed annually' : '/month';
  const ctaLabel = 'Buy Now';

  if (!localized || localized.currency === 'USD' || !localized.rate) {
    return { priceDisplay: `$${usdPrice}`, periodLabel, ctaLabel };
  }

  // INR is the one currency actually charged (via Razorpay) - show the exact
  // amount checkout will charge instead of an FX-derived approximation, so
  // this number can never drift from what the visitor is actually billed.
  // Only applies to monthly - there's no annual charge flow yet.
  if (localized.currency === 'INR' && billingCycle === 'monthly' && plan.priceMonthlyINR != null) {
    return {
      priceDisplay: new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
        plan.priceMonthlyINR,
      ),
      periodLabel,
      ctaLabel,
    };
  }

  const converted = usdPrice * localized.rate;
  const priceDisplay = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: localized.currency,
    maximumFractionDigits: converted >= 100 ? 0 : 2,
  }).format(converted);

  return { priceDisplay, periodLabel, ctaLabel };
}
