import { StylePreset } from '../enums/generation.enums';

/**
 * Style lives in the prompt, not in the model catalog. These directives are
 * prepended by the prompt compiler, which is why they are plain strings and
 * not database rows: they change with product taste, not with operations.
 *
 * CUSTOM carries no directive of its own - the caller supplies one.
 */
const STYLE_DIRECTIVES: Readonly<Record<StylePreset, string>> = {
  [StylePreset.REALISTIC]:
    'Photorealistic. Natural lighting, real-world physics, accurate materials and depth of field.',
  [StylePreset.CINEMATIC]:
    'Cinematic film look. Widescreen framing, shallow depth of field, film grain, teal-and-orange grading, deliberate camera movement.',
  [StylePreset.ANIME]:
    'Detailed anime aesthetic. Soft cel shading, stable facial structure, clean line work, expressive anime lighting.',
  [StylePreset.CARTOON]:
    'Western cartoon style. Bold outlines, flat saturated colour blocks, exaggerated proportions and squash-and-stretch motion.',
  [StylePreset.THREE_D]:
    'Stylised 3D animation. Subsurface-scattered materials, soft global illumination, rounded forms, animated-feature rendering.',
  [StylePreset.CUSTOM]: '',
};

export class MissingCustomStyleError extends Error {
  constructor() {
    super('StylePreset.CUSTOM requires a customDirective');
    this.name = 'MissingCustomStyleError';
  }
}

export function styleDirective(preset: StylePreset, customDirective?: string): string {
  if (preset === StylePreset.CUSTOM) {
    const trimmed = customDirective?.trim() ?? '';
    if (trimmed.length === 0) {
      throw new MissingCustomStyleError();
    }
    return trimmed;
  }
  return STYLE_DIRECTIVES[preset];
}

/**
 * Restyling real footage mangles text and logos. Rather than surface that as a
 * user problem, the video-to-video pipeline masks branded regions before the
 * restyle pass and composites the originals back on top afterwards; this flag
 * tells the pipeline when that pass is required.
 */
export function requiresBrandCompositePass(mode: string, preset: StylePreset): boolean {
  return mode === 'video_to_video' && preset !== StylePreset.REALISTIC;
}
