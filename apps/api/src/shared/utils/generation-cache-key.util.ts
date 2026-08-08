import { createHash } from 'crypto';

/**
 * Builds a stable hash identifying a generation request (type + provider +
 * model + prompt/text + any other distinguishing params like size/voiceId).
 * An identical request from the same user hashes identically, so
 * MediaAssetsService.findCached can serve the prior result instead of the
 * caller re-invoking the AI provider.
 */
export function buildGenerationCacheKey(parts: Array<string | number | undefined | null>): string {
  const normalized = parts.map((part) => (part ?? '').toString().trim().toLowerCase()).join('|');
  return createHash('sha256').update(normalized).digest('hex');
}
