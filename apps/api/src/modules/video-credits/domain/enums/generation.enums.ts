/**
 * Three orthogonal axes. Keeping them separate avoids the collision in the
 * original tiering sketch, where "Cinematic" was both a quality tier and a
 * visual style, and "Character" was both a tier and a pipeline.
 *
 *   MODE  - what is being made      (different pipeline, different provider call)
 *   TIER  - how good / how cheap    (public contract; models swap underneath)
 *   STYLE - what it looks like      (prompt-level directive, occasionally a routing constraint)
 */

export enum GenerationMode {
  TEXT_TO_VIDEO = 'text_to_video',
  IMAGE_TO_VIDEO = 'image_to_video',
  VIDEO_TO_VIDEO = 'video_to_video',
  CHARACTER = 'character',
  VOICE = 'voice',
  MUSIC = 'music',
  IMAGE = 'image',
  TEXT = 'text',
}

/**
 * The public quality contract. Users pick a tier; the router picks the model.
 * Only these three exist so that the underlying catalog can churn without any
 * user-visible change.
 */
export enum GenerationTier {
  ECONOMY = 'economy',
  FAST = 'fast',
  STUDIO = 'studio',
}

export enum StylePreset {
  REALISTIC = 'realistic',
  CINEMATIC = 'cinematic',
  ANIME = 'anime',
  CARTOON = 'cartoon',
  THREE_D = 'three_d',
  CUSTOM = 'custom',
}

export enum BillingUnit {
  PER_SECOND = 'per_second',
  PER_MINUTE = 'per_minute',
  PER_IMAGE = 'per_image',
  PER_1K_TOKENS = 'per_1k_tokens',
  PER_GENERATION = 'per_generation',
}
