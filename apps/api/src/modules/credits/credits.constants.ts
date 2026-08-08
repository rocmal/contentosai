/** Monthly credit allotment per plan slug (matches src/lib/pricingPlans.ts on
 * the frontend - the two must be kept in sync since pricingPlans.ts is the
 * public-facing statement of what each plan includes). null = unlimited. */
export const PLAN_CREDIT_ALLOTMENTS: Record<string, number | null> = {
  starter: 2500,
  pro: 10000,
  enterprise: null,
};

export const DEFAULT_PLAN = 'starter';

/** Per the landing page FAQ: "1 credit ~= 1 image, ~1 minute of AI voice, or
 * ~10 seconds of video." Voice/video costs are computed from actual duration
 * at generation time; these are the per-unit rates that computation uses. */
export const CREDIT_COST = {
  IMAGE_PER_GENERATION: 1,
  VOICE_PER_MINUTE: 1,
  VIDEO_PER_10_SECONDS: 1,
  CHARACTER_PER_10_SECONDS: 1,
} as const;

export function creditsForDurationSeconds(durationSeconds: number, secondsPerCredit: number): number {
  return Math.max(1, Math.ceil(durationSeconds / secondsPerCredit));
}
