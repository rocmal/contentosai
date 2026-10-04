/** Monthly credit allotment per plan slug (matches src/lib/pricingPlans.ts on
 * the frontend - the two must be kept in sync since pricingPlans.ts is the
 * public-facing statement of what each plan includes). null = unlimited. */
export const PLAN_CREDIT_ALLOTMENTS: Record<string, number | null> = {
  starter: 2500,
  pro: 10000,
  enterprise: null,
};

export const DEFAULT_PLAN = 'starter';

/** Credits a brand-new (unpaid) workspace gets once, at signup. Deliberately
 * far below the Starter allotment: generations cost real money per credit, and
 * signup is not email-verified, so a full paid-plan allotment here would be a
 * free giveaway to anyone with a throwaway address. Override with TRIAL_CREDITS. */
export const TRIAL_CREDITS = Number.isFinite(Number(process.env.TRIAL_CREDITS)) && process.env.TRIAL_CREDITS !== undefined
  ? Number(process.env.TRIAL_CREDITS)
  : 150;

/** Per the landing page FAQ: "1 credit ~= 1 image, ~1 minute of AI voice, or
 * ~10 seconds of video." Voice/video costs are computed from actual duration
 * at generation time; these are the per-unit rates that computation uses. */
export const CREDIT_COST = {
  TEXT_PER_GENERATION: 1,
  IMAGE_PER_GENERATION: 1,
  VOICE_PER_MINUTE: 1,
  VIDEO_PER_10_SECONDS: 1,
  CHARACTER_PER_10_SECONDS: 1,
} as const;

/** Credits per generated image, by vendor and quality tier. Set from vendor
 * prices (about 1.3 megapixels, converted at an assumed Rs 88 per USD) so each
 * tier earns roughly 50-60% gross margin at the Starter plan's Rs 1.56 net per
 * credit: OpenAI gpt-image-2 low/medium/high is about $0.008/$0.07/$0.27 per
 * image; Stability Core is $0.03 and Ultra $0.08. Re-check against current
 * vendor pricing before changing plan prices. A tier a vendor does not offer
 * is simply absent from its row. */
export const IMAGE_CREDIT_COST: Record<string, Partial<Record<'draft' | 'standard' | 'high', number>>> = {
  openai: { draft: 1, standard: 8, high: 30 },
  stability: { standard: 4, high: 10 },
  flux: { standard: 8 },
};

const DEFAULT_IMAGE_TIER_COST = 8;

export function imageCreditCost(provider: string, quality: 'draft' | 'standard' | 'high'): number {
  const row = IMAGE_CREDIT_COST[provider];
  return row?.[quality] ?? row?.standard ?? DEFAULT_IMAGE_TIER_COST;
}

export function creditsForDurationSeconds(durationSeconds: number, secondsPerCredit: number): number {
  return Math.max(1, Math.ceil(durationSeconds / secondsPerCredit));
}
