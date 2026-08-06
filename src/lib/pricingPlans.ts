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
  credits: string;
  seats: string;
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
    credits: '2,500 credits / month',
    seats: '1 seat',
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
    credits: '10,000 credits / month',
    seats: 'Up to 5 seats',
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
    credits: 'Unlimited credits',
    seats: 'Unlimited seats',
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

export function formatPlanPrice(plan: PricingPlan, billingCycle: BillingCycle) {
  if (plan.priceMonthly == null || plan.priceAnnual == null) {
    return { priceDisplay: 'Custom', periodLabel: 'contact us', ctaLabel: 'Contact sales' };
  }
  const price = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;
  return {
    priceDisplay: `$${price}`,
    periodLabel: billingCycle === 'annual' ? '/mo, billed annually' : '/month',
    ctaLabel: 'Start free trial',
  };
}
