import { BrandProfile } from '@modules/brand/domain/entities/brand-profile.entity';

/** Brand section(s) of a system prompt: identity, voice, and the mandatory
 * guidelines/compliance rules. Shared by content studio and the agents. */
export function buildBrandPromptParts(brand: BrandProfile | null): string[] {
  if (!brand) return [];

  const brandLines = [
    `Brand: ${brand.name}`,
    brand.tagline && `Tagline: ${brand.tagline}`,
    brand.industry && `Industry: ${brand.industry}`,
    brand.toneOfVoice?.length && `Tone of voice: ${brand.toneOfVoice.join(', ')}`,
    brand.productsAndServices?.length && `Product categories: ${brand.productsAndServices.join(', ')}`,
    brand.mission && `Mission: ${brand.mission}`,
    brand.targetAudience && `Target audience: ${brand.targetAudience}`,
    brand.primaryCTA && `Preferred call-to-action style: ${brand.primaryCTA}`,
    brand.keywords?.length && `Keywords: ${brand.keywords.join(', ')}`,
  ].filter(Boolean);

  const parts = [`BRAND\n${brandLines.join('\n')}`];
  if (brand.guidelines) {
    parts.push(`BRAND GUIDELINES AND COMPLIANCE RULES (mandatory)\n${brand.guidelines}`);
  }
  return parts;
}

/** True for brands whose content must pass the compliance scan (insurance, or
 * any brand whose guidelines declare compliance rules). */
export function isRegulatedBrand(brand: BrandProfile | null): boolean {
  if (!brand) return false;
  return /insur/i.test(brand.industry ?? '') || /compliance rules/i.test(brand.guidelines ?? '');
}
