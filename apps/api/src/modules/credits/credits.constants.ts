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
export const TRIAL_CREDITS =
  Number.isFinite(Number(process.env.TRIAL_CREDITS)) && process.env.TRIAL_CREDITS !== undefined
    ? Number(process.env.TRIAL_CREDITS)
    : 150;

export const CREDIT_COST = {
  TEXT_PER_GENERATION: 1,
} as const;

/* Pricing basis (target: 50% gross margin). The cheapest credit we sell is on
 * the Pro plan: Rs 10,000 for 10,000 credits, about Rs 0.976 net of the 2.36%
 * Razorpay fee. For 50% margin one credit may therefore carry at most about
 * Rs 0.49 of vendor cost, so credits = ceil(vendor cost in Rs / 0.488). Starter
 * (Rs 1.56 net per credit) earns more than that. Vendor prices are converted at
 * an assumed Rs 88 per USD - re-check both before changing plan prices. */

/** Credits per generated image, by vendor and quality tier. Vendor cost per
 * image (about 1.3 megapixels): OpenAI gpt-image-2 low/medium/high roughly
 * $0.008/$0.07/$0.27 (Rs 0.7/6/24); Stability Core $0.03 (Rs 2.6), Ultra $0.08
 * (Rs 7). A tier a vendor does not offer is simply absent from its row. */
export const IMAGE_CREDIT_COST: Record<
  string,
  Partial<Record<'draft' | 'standard' | 'high', number>>
> = {
  openai: { draft: 2, standard: 13, high: 50 },
  stability: { standard: 6, high: 15 },
  flux: { standard: 13 },
};

/** Credits per minute of generated speech (about 150 words), by voice provider.
 * Sarvam Bulbul v3 is Rs 30 per 10,000 characters, so about Rs 3 for a minute
 * of Hindi -> 7 credits. Edge and Piper have no per-use vendor fee. The
 * ElevenLabs/Cartesia/Azure rates are NOT verified against their price lists -
 * they are conservative placeholders; confirm before selling those voices. */
export const VOICE_CREDITS_PER_MINUTE: Record<string, number> = {
  edge: 1,
  piper: 1,
  sarvam: 7,
  default: 10,
};

/** Credits per 10 seconds of AI video, by provider. Veo 3.1 Fast (the app's
 * default model) is $0.10 per second on the Gemini API -> Rs 88 per 10 s ->
 * 180 credits. Runway/Kling/Pika/Luma are unverified and use the same
 * conservative rate. The mock provider has no vendor cost. */
export const VIDEO_CREDITS_PER_10_SECONDS: Record<string, number> = {
  mock: 1,
  default: 180,
};

/** Credits per 10 seconds of talking-avatar video, by provider. HeyGen Avatar IV
 * is $0.05-0.10 per second (Rs 44-88 per 10 s) -> 180 credits at the top of that
 * range. D-ID and Synthesia prices are unverified (same placeholder). The
 * self-hosted SadTalker/Wav2Lip providers have no per-use vendor fee. */
export const CHARACTER_CREDITS_PER_10_SECONDS: Record<string, number> = {
  sadtalker: 2,
  wav2lip: 2,
  default: 180,
};

function rateFor(table: Record<string, number>, provider?: string): number {
  return (provider && table[provider]) || table.default;
}

export const voiceCreditsPerMinute = (provider?: string) =>
  rateFor(VOICE_CREDITS_PER_MINUTE, provider);
export const videoCreditsPer10Seconds = (provider?: string) =>
  rateFor(VIDEO_CREDITS_PER_10_SECONDS, provider);
export const characterCreditsPer10Seconds = (provider?: string) =>
  rateFor(CHARACTER_CREDITS_PER_10_SECONDS, provider);

const DEFAULT_IMAGE_TIER_COST = 8;

export function imageCreditCost(provider: string, quality: 'draft' | 'standard' | 'high'): number {
  const row = IMAGE_CREDIT_COST[provider];
  return row?.[quality] ?? row?.standard ?? DEFAULT_IMAGE_TIER_COST;
}

export function creditsForDurationSeconds(
  durationSeconds: number,
  secondsPerCredit: number,
): number {
  return Math.max(1, Math.ceil(durationSeconds / secondsPerCredit));
}
