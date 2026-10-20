import React from 'react';
import {
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Film,
  Megaphone,
  RectangleVertical,
  ShoppingBag,
  Smartphone,
} from 'lucide-react';
import * as api from '../../../lib/api';
import { VIDEO_STYLE_SUFFIXES } from '../../../lib/reuse';
import { OutputAspectRatio, SceneFilterPreset, SceneMotion, SceneTransitionType } from '../../../lib/videoCompositor';

export interface AiStylePreset {
  id: string;
  label: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:5';
  durationSeconds: number;
  /** Appended to the user's prompt - the underlying providers take a single text
   * prompt, so a "style" is implemented as a hint + duration, not a separate
   * API parameter. Video formats only use 16:9 or 9:16, the two shapes Veo makes;
   * 1:1 and 4:5 remain for uploads, templates and the Scene Builder. */
  styleSuffix: string;
}

// Veo makes 4, 6 or 8-second clips (a 5 was rendered as 6 anyway), so every length here is one of those.
export const AI_STYLE_PRESETS: AiStylePreset[] = [
  {
    id: 'cinematic',
    label: 'Cinematic',
    description: 'Widescreen, dramatic, film-like',
    icon: Film,
    aspectRatio: '16:9',
    durationSeconds: 8,
    styleSuffix: VIDEO_STYLE_SUFFIXES.cinematic,
  },
  {
    id: 'social-reel',
    label: 'Social Reel',
    description: 'Vertical - Reels, TikTok, Snapchat Stories',
    icon: Smartphone,
    aspectRatio: '9:16',
    durationSeconds: 6,
    styleSuffix: VIDEO_STYLE_SUFFIXES.socialReel,
  },
  {
    id: 'square-post',
    label: 'Feed Post',
    description: 'Vertical - Instagram and Facebook feeds',
    icon: RectangleVertical,
    aspectRatio: '9:16',
    durationSeconds: 6,
    styleSuffix: VIDEO_STYLE_SUFFIXES.squarePost,
  },
  {
    id: 'explainer',
    label: 'Explainer',
    description: 'Clean, corporate, widescreen',
    icon: Megaphone,
    aspectRatio: '16:9',
    durationSeconds: 6,
    styleSuffix: VIDEO_STYLE_SUFFIXES.explainer,
  },
  {
    id: 'product-ad',
    label: 'Product Ad',
    description: 'Commerce-focused, vertical',
    icon: ShoppingBag,
    aspectRatio: '9:16',
    durationSeconds: 6,
    styleSuffix: VIDEO_STYLE_SUFFIXES.productAd,
  },
];

/** A small starter set - every URL here is verified to send a permissive
 * Access-Control-Allow-Origin header, which the text-overlay compositor
 * requires. Most "free sample video" links people paste around the web do
 * NOT send that header and would silently fail at export time, so this list
 * is deliberately short rather than padded with clips that would break. */
export interface StockTemplate {
  id: string;
  label: string;
  url: string;
  aspectRatio: AiStylePreset['aspectRatio'];
}

export const STOCK_TEMPLATES: StockTemplate[] = [
  {
    id: 'flower',
    label: 'Flower Close-up',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    aspectRatio: '16:9',
  },
  {
    id: 'ocean',
    label: 'Ocean Waves',
    url: 'https://vjs.zencdn.net/v/oceans.mp4',
    aspectRatio: '16:9',
  },
];

/** The no-cost "mock" provider is refused by the production backend, so it is
 * only offered (and used as the default) in local development builds. */
export const SELECTABLE_VIDEO_PROVIDERS: api.VideoProvider[] = import.meta.env.PROD ? ['veo'] : ['veo', 'mock'];

export const PROVIDER_LABELS: Record<api.VideoProvider, string> = {
  mock: 'Mock (local, no cost)',
  veo: 'Google Veo',
  runway: 'Runway',
  kling: 'Kling',
  pika: 'Pika',
  luma: 'Luma Dream Machine',
};

export const ASPECT_RATIO_CLASSES: Record<AiStylePreset['aspectRatio'], string> = {
  '16:9': 'aspect-video max-w-2xl',
  '9:16': 'aspect-[9/16] max-w-sm',
  '1:1': 'aspect-square max-w-md',
  '4:5': 'aspect-[4/5] max-w-md',
};

// Numeric equivalent, used once a source clip's real dimensions are known -
// see sourceVideoNaturalAspect below for why this matters.
export const ASPECT_RATIO_NUMERIC: Record<AiStylePreset['aspectRatio'], number> = {
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '1:1': 1,
  '4:5': 4 / 5,
};

// CSS width for a video box of this shape (width / height) that fits the column
// (up to maxRem) and 70% of the window height without bending the shape.
// A full width plus max-height plus aspect-ratio squashes the box instead: a
// 9:16 clip gets a near-square box, and object-cover then cuts its top and bottom.
export const previewBoxWidth = (ratio: number, maxRem: number): string =>
  `min(100%, ${maxRem}rem, calc(70vh * ${ratio}))`;

export interface OverlayPoint {
  xPct: number;
  yPct: number;
}

export const DEFAULT_OVERLAY_POINT: OverlayPoint = { xPct: 50, yPct: 88 };

// Quick one-click jumps to the classic spots - dragging the text directly on
// the preview still works for anything in between.
export const TEXT_POSITION_PRESETS: { id: string; label: string; icon: React.FC<{ className?: string }>; point: OverlayPoint }[] = [
  { id: 'top', label: 'Top', icon: AlignVerticalJustifyStart, point: { xPct: 50, yPct: 12 } },
  { id: 'center', label: 'Center', icon: AlignVerticalJustifyCenter, point: { xPct: 50, yPct: 50 } },
  { id: 'bottom', label: 'Bottom', icon: AlignVerticalJustifyEnd, point: { xPct: 50, yPct: 88 } },
];

export const OVERLAY_DRAG_MARGIN_PCT = 6;
export const clampOverlayPct = (value: number) =>
  Math.min(100 - OVERLAY_DRAG_MARGIN_PCT, Math.max(OVERLAY_DRAG_MARGIN_PCT, value));

// System-installed font stacks only - no network font loading, so what the
// canvas compositor draws is guaranteed to match instantly, with no risk of
// a web font not being ready in time when burning the overlay in.
export const FONT_FAMILY_OPTIONS = [
  { id: 'sans', label: 'Sans-serif', stack: '"Segoe UI", Arial, sans-serif', previewClass: 'font-sans' },
  { id: 'serif', label: 'Serif', stack: 'Georgia, "Times New Roman", serif', previewClass: 'font-serif' },
  { id: 'mono', label: 'Monospace', stack: 'Consolas, "Courier New", monospace', previewClass: 'font-mono' },
  { id: 'impact', label: 'Bold Impact', stack: 'Impact, "Arial Black", sans-serif', previewClass: 'font-sans' },
  { id: 'comic', label: 'Playful', stack: '"Comic Sans MS", cursive', previewClass: 'font-sans' },
] as const;

// "Scale" divides the container/canvas width to get the drawn font size (see
// drawTextOverlay in videoCompositor.ts) - smaller scale = bigger text. It's
// a continuous value (not a fixed preset) so the on-preview resize handle
// can adjust it freely; these are just quick-jump shortcuts for it.
export const FONT_SIZE_PRESETS = [
  { id: 'small', label: 'S', scale: 22 },
  { id: 'medium', label: 'M', scale: 16 },
  { id: 'large', label: 'L', scale: 12 },
  { id: 'xlarge', label: 'XL', scale: 9 },
] as const;

export const DEFAULT_FONT_SCALE = 16;
export const MIN_FONT_SCALE = 6;
export const MAX_FONT_SCALE = 30;
export const clampFontScale = (value: number) => Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, value));
export const DEFAULT_PREVIEW_WIDTH_PX = 640;

export const TEXT_COLOR_PRESETS = ['#ffffff', '#000000', '#facc15', '#ef4444', '#3b82f6', '#22c55e'];

export type CreateSource = 'prompt' | 'upload' | 'templates' | 'scenes';

export interface StudioScene {
  id: string;
  visualUrl: string;
  visualType: 'video' | 'image';
  /** How long this specific slide shows, in seconds - always a real,
   * user-editable number (not "auto"), so every scene has independent
   * control. Video clips are trimmed if longer; the total across all
   * scenes is scaled down proportionally if it would exceed
   * MAX_SCENE_TOTAL_SECONDS (see getScaledSceneDurations). */
  durationSeconds: number;
  /** 0-100 focal point of the crop-to-fill frame; 50/50 (default) keeps the
   * source centered. Drives both the live preview (via CSS object-position,
   * which uses identical semantics) and the exported pixels. */
  focalXPct: number;
  focalYPct: number;
  filter: SceneFilterPreset;
  /** Only meaningful for image scenes - video scenes ignore it. */
  motion: SceneMotion;
  /** 'cover' (default) crops to fill the frame - see focalXPct/focalYPct.
   * 'contain' shows the whole image/clip letterboxed instead, for source
   * material whose shape doesn't match the output aspect ratio and
   * shouldn't lose content (e.g. a tall poster in a 16:9 video). */
  fit: SceneFit;
}

export type SceneFit = 'cover' | 'contain';

export const MAX_SCENE_TOTAL_SECONDS = 30;

// How many recent videos (drafts and finished) are loaded for "Continue a draft".
export const RECENT_PROJECTS_TO_LOAD = 30;
export const DEFAULT_SCENE_SECONDS = 4;
/** Rough spoken-word rate used only to estimate narration length before any
 * audio is generated (same ballpark the "Generate with AI" narration prompts
 * already target - "30 seconds" / "40-75 words" - see handleGenerateNarration).
 * The composited video's audio track is hard-cut at the scene total, so a
 * narration script estimated longer than that will be audibly trimmed. */
export const NARRATION_WORDS_PER_SECOND = 2;

/** Turns compositeScenes()'s skippedSceneNumbers into the sentence shown in
 * the amber banner below the Generate/Preview buttons. */
export function describeSkippedScenes(skippedSceneNumbers: number[]): string | null {
  if (skippedSceneNumbers.length === 0) return null;
  const noun = skippedSceneNumbers.length === 1 ? 'scene' : 'scenes';
  const positions = skippedSceneNumbers.join(', ');
  return `Couldn't load ${noun} ${positions} (the file may be missing or its link expired) - it was left out. Delete it from "Choose from Gallery" to stop this happening again.`;
}

export const SCENE_ASPECT_RATIO_OPTIONS: { id: OutputAspectRatio; label: string }[] = [
  { id: '16:9', label: '16:9 Landscape' },
  { id: '9:16', label: '9:16 Vertical' },
  { id: '1:1', label: '1:1 Square' },
];

export const SCENE_TRANSITION_OPTIONS: { id: SceneTransitionType; label: string }[] = [
  { id: 'none', label: 'Cut' },
  { id: 'fade', label: 'Fade' },
  { id: 'slide', label: 'Slide' },
];

export const SCENE_FILTER_OPTIONS: { id: SceneFilterPreset; label: string }[] = [
  { id: 'none', label: 'No filter' },
  { id: 'bw', label: 'B&W' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'vivid', label: 'Vivid' },
  { id: 'warm', label: 'Warm' },
  { id: 'cool', label: 'Cool' },
  { id: 'fade', label: 'Faded' },
];

export type NarrationLanguage = 'en' | 'hi';
export type NarrationGender = 'female' | 'male';

export const NARRATION_LANGUAGE_LABELS: Record<NarrationLanguage, string> = { en: 'English', hi: 'हिंदी Hindi' };
export const NARRATION_GENDER_LABELS: Record<NarrationGender, string> = { female: 'Female', male: 'Male' };
export const NARRATION_LANGUAGE_CODE: Record<NarrationLanguage, string> = { en: 'en-IN', hi: 'hi-IN' };

export type Step = 'create' | 'generating' | 'edit' | 'compositing' | 'result';
export type ShareStatus = 'idle' | 'sharing' | 'shared' | 'copied' | 'unsupported';
