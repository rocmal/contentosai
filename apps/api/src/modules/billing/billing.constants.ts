/** Self-serve checkout only covers the plans Razorpay can charge for -
 * Enterprise stays "contact sales" (custom/negotiated), matching
 * src/lib/pricingPlans.ts on the frontend. */
export type PurchasablePlan = 'starter' | 'pro';

/** India pricing in paise (INR smallest unit), monthly billing only - round
 * numbers chosen deliberately (2026-08-14) over the FX-derived ~Rs
 * 4,678/14,226. Credit costs per image/voice/video/avatar are set per vendor
 * for a 50% margin on the cheapest credit (see credits.constants.ts) - re-check
 * them whenever these prices or vendor prices change. Annual billing isn't wired up anywhere in the
 * backend yet (grantMonthlyRenewal only understands monthly cycles), so
 * it's intentionally left out here too. */
export const PLAN_PRICING_INR: Record<PurchasablePlan, number> = {
  starter: 400000, // Rs 4,000/mo
  pro: 1000000, // Rs 10,000/mo
};

export function isPurchasablePlan(plan: string): plan is PurchasablePlan {
  return plan in PLAN_PRICING_INR;
}
