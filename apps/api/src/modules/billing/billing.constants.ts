/** Self-serve checkout only covers the plans Razorpay can charge for -
 * Enterprise stays "contact sales" (custom/negotiated), matching
 * src/lib/pricingPlans.ts on the frontend. */
export type PurchasablePlan = 'starter' | 'pro';

/** PLACEHOLDER pricing in paise (INR smallest unit), monthly billing only -
 * approximate INR equivalent of the USD prices in src/lib/pricingPlans.ts at
 * a rough ~83 INR/USD rate. Confirm real India pricing before going live;
 * this only exists so the checkout flow has a number to charge. Annual
 * billing isn't wired up anywhere in the backend yet (grantMonthlyRenewal
 * only understands monthly cycles), so it's intentionally left out here too. */
export const PLAN_PRICING_INR: Record<PurchasablePlan, number> = {
  starter: 399900, // ~Rs 3,999/mo
  pro: 1219900, // ~Rs 12,199/mo
};

export function isPurchasablePlan(plan: string): plan is PurchasablePlan {
  return plan in PLAN_PRICING_INR;
}
