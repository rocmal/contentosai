/** Seat (team member) limits per plan slug - matches the "seats" field in
 * src/lib/pricingPlans.ts on the frontend, keep both in sync. null = unlimited.
 * Counts every organization_members row, including the owner. */
export const PLAN_SEAT_LIMITS: Record<string, number | null> = {
  starter: 1,
  pro: 5,
  enterprise: null,
};

export const DEFAULT_SEAT_LIMIT = 1;

export function seatLimitForPlan(plan: string): number | null {
  return plan in PLAN_SEAT_LIMITS ? PLAN_SEAT_LIMITS[plan] : DEFAULT_SEAT_LIMIT;
}
