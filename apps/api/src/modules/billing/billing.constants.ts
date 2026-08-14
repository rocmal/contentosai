/** Self-serve checkout only covers the plans Razorpay can charge for -
 * Enterprise stays "contact sales" (custom/negotiated), matching
 * src/lib/pricingPlans.ts on the frontend. */
export type PurchasablePlan = 'starter' | 'pro';

/** India pricing in paise (INR smallest unit), monthly billing only - round
 * numbers chosen deliberately (2026-08-14) over the FX-derived ~Rs
 * 4,678/14,226. NOTE: a margin check against real per-credit AI provider
 * costs flagged that video generation likely costs far more per credit than
 * image/voice, and a flat per-credit price may not cover it at these
 * numbers - revisit CREDIT_COST.VIDEO_PER_10_SECONDS (credits.constants.ts)
 * once real usage data is in. Annual billing isn't wired up anywhere in the
 * backend yet (grantMonthlyRenewal only understands monthly cycles), so
 * it's intentionally left out here too. */
export const PLAN_PRICING_INR: Record<PurchasablePlan, number> = {
  starter: 400000, // Rs 4,000/mo
  pro: 1000000, // Rs 10,000/mo
};

export function isPurchasablePlan(plan: string): plan is PurchasablePlan {
  return plan in PLAN_PRICING_INR;
}
