import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Bookmark,
  Copy,
  Crop,
  Download,
  Film,
  FolderOpen,
  GripVertical,
  Info,
  Layers,
  LayoutTemplate,
  Loader2,
  Megaphone,
  Mic,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Share2,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Square,
  Trash2,
  Type,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import { ViewType } from '../../types';
import * as api from '../../lib/api';
import VoiceInputButton, { appendSpoken } from '../VoiceInputButton';
import { VIDEO_PROMPT_CATEGORIES, VIDEO_PROMPT_TEMPLATES } from '../../lib/videoPromptTemplates';
import { takeReuse, VIDEO_STYLE_SUFFIXES } from '../../lib/reuse';
import {
  compositeScenes,
  compositeTextOntoVideo,
  SceneInput,
  SceneFilterPreset,
  SceneMotion,
  SceneTransitionType,
  OutputAspectRatio,
} from '../../lib/videoCompositor';
import { SARVAM_VOICE_BY_GENDER, SARVAM_VOICE_CATALOG, sarvamVoiceSampleUrl } from '../../lib/sarvamVoices';
import { SarvamVoiceSelect } from '../SarvamVoiceSelect';
import { SchedulePostPanel } from '../SchedulePostPanel';
import { OutOfCreditsNotice } from '../OutOfCreditsNotice';
import { useAuth } from '../../contexts/AuthContext';

interface VideoStudioViewProps {
  onNavigate: (view: ViewType) => void;
}

interface AiStylePreset {
  id: string;
  label: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:5';
  durationSeconds: number;
  /** Appended to the user's prompt - the underlying providers take a single text
   * prompt, so a "style" is implemented as a hint + duration, not a separate
   * API parameter. Aspect ratio here only affects the on-screen preview
   * shape, since none of the wired video providers accept one. */
  styleSuffix: string;
}

const AI_STYLE_PRESETS: AiStylePreset[] = [
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
    durationSeconds: 5,
    styleSuffix: VIDEO_STYLE_SUFFIXES.socialReel,
  },
  {
    id: 'square-post',
    label: 'Square Post',
    description: 'Instagram feed, Facebook post',
    icon: Square,
    aspectRatio: '1:1',
    durationSeconds: 5,
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
    description: 'Commerce-focused, portrait',
    icon: ShoppingBag,
    aspectRatio: '4:5',
    durationSeconds: 5,
    styleSuffix: VIDEO_STYLE_SUFFIXES.productAd,
  },
];

/** A small starter set - every URL here is verified to send a permissive
 * Access-Control-Allow-Origin header, which the text-overlay compositor
 * requires. Most "free sample video" links people paste around the web do
 * NOT send that header and would silently fail at export time, so this list
 * is deliberately short rather than padded with clips that would break. */
interface StockTemplate {
  id: string;
  label: string;
  url: string;
  aspectRatio: AiStylePreset['aspectRatio'];
}

const STOCK_TEMPLATES: StockTemplate[] = [
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
const SELECTABLE_VIDEO_PROVIDERS: api.VideoProvider[] = import.meta.env.PROD ? ['veo'] : ['veo', 'mock'];

const PROVIDER_LABELS: Record<api.VideoProvider, string> = {
  mock: 'Mock (local, no cost)',
  veo: 'Google Veo',
  runway: 'Runway',
  kling: 'Kling',
  pika: 'Pika',
  luma: 'Luma Dream Machine',
};

const ASPECT_RATIO_CLASSES: Record<AiStylePreset['aspectRatio'], string> = {
  '16:9': 'aspect-video max-w-2xl',
  '9:16': 'aspect-[9/16] max-w-sm',
  '1:1': 'aspect-square max-w-md',
  '4:5': 'aspect-[4/5] max-w-md',
};

// Numeric equivalent, used once a source clip's real dimensions are known -
// see sourceVideoNaturalAspect below for why this matters.
const ASPECT_RATIO_NUMERIC: Record<AiStylePreset['aspectRatio'], number> = {
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '1:1': 1,
  '4:5': 4 / 5,
};

interface OverlayPoint {
  xPct: number;
  yPct: number;
}

const DEFAULT_OVERLAY_POINT: OverlayPoint = { xPct: 50, yPct: 88 };

// Quick one-click jumps to the classic spots - dragging the text directly on
// the preview still works for anything in between.
const TEXT_POSITION_PRESETS: { id: string; label: string; icon: React.FC<{ className?: string }>; point: OverlayPoint }[] = [
  { id: 'top', label: 'Top', icon: AlignVerticalJustifyStart, point: { xPct: 50, yPct: 12 } },
  { id: 'center', label: 'Center', icon: AlignVerticalJustifyCenter, point: { xPct: 50, yPct: 50 } },
  { id: 'bottom', label: 'Bottom', icon: AlignVerticalJustifyEnd, point: { xPct: 50, yPct: 88 } },
];

const OVERLAY_DRAG_MARGIN_PCT = 6;
const clampOverlayPct = (value: number) =>
  Math.min(100 - OVERLAY_DRAG_MARGIN_PCT, Math.max(OVERLAY_DRAG_MARGIN_PCT, value));

// System-installed font stacks only - no network font loading, so what the
// canvas compositor draws is guaranteed to match instantly, with no risk of
// a web font not being ready in time when burning the overlay in.
const FONT_FAMILY_OPTIONS = [
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
const FONT_SIZE_PRESETS = [
  { id: 'small', label: 'S', scale: 22 },
  { id: 'medium', label: 'M', scale: 16 },
  { id: 'large', label: 'L', scale: 12 },
  { id: 'xlarge', label: 'XL', scale: 9 },
] as const;

const DEFAULT_FONT_SCALE = 16;
const MIN_FONT_SCALE = 6;
const MAX_FONT_SCALE = 30;
const clampFontScale = (value: number) => Math.min(MAX_FONT_SCALE, Math.max(MIN_FONT_SCALE, value));
const DEFAULT_PREVIEW_WIDTH_PX = 640;

const TEXT_COLOR_PRESETS = ['#ffffff', '#000000', '#facc15', '#ef4444', '#3b82f6', '#22c55e'];

type CreateSource = 'prompt' | 'upload' | 'templates' | 'scenes';

interface StudioScene {
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

type SceneFit = 'cover' | 'contain';

const MAX_SCENE_TOTAL_SECONDS = 30;
const DEFAULT_SCENE_SECONDS = 4;
/** Rough spoken-word rate used only to estimate narration length before any
 * audio is generated (same ballpark the "Generate with AI" narration prompts
 * already target - "30 seconds" / "40-75 words" - see handleGenerateNarration).
 * The composited video's audio track is hard-cut at the scene total, so a
 * narration script estimated longer than that will be audibly trimmed. */
const NARRATION_WORDS_PER_SECOND = 2;

/** Turns compositeScenes()'s skippedSceneNumbers into the sentence shown in
 * the amber banner below the Generate/Preview buttons. */
function describeSkippedScenes(skippedSceneNumbers: number[]): string | null {
  if (skippedSceneNumbers.length === 0) return null;
  const noun = skippedSceneNumbers.length === 1 ? 'scene' : 'scenes';
  const positions = skippedSceneNumbers.join(', ');
  return `Couldn't load ${noun} ${positions} (the file may be missing or its link expired) - it was left out. Delete it from "Choose from Gallery" to stop this happening again.`;
}

const SCENE_ASPECT_RATIO_OPTIONS: { id: OutputAspectRatio; label: string }[] = [
  { id: '16:9', label: '16:9 Landscape' },
  { id: '9:16', label: '9:16 Vertical' },
  { id: '1:1', label: '1:1 Square' },
];

const SCENE_TRANSITION_OPTIONS: { id: SceneTransitionType; label: string }[] = [
  { id: 'none', label: 'Cut' },
  { id: 'fade', label: 'Fade' },
  { id: 'slide', label: 'Slide' },
];

const SCENE_FILTER_OPTIONS: { id: SceneFilterPreset; label: string }[] = [
  { id: 'none', label: 'No filter' },
  { id: 'bw', label: 'B&W' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'vivid', label: 'Vivid' },
  { id: 'warm', label: 'Warm' },
  { id: 'cool', label: 'Cool' },
  { id: 'fade', label: 'Faded' },
];

type NarrationLanguage = 'en' | 'hi';
type NarrationGender = 'female' | 'male';

const NARRATION_LANGUAGE_LABELS: Record<NarrationLanguage, string> = { en: 'English', hi: 'हिंदी Hindi' };
const NARRATION_GENDER_LABELS: Record<NarrationGender, string> = { female: 'Female', male: 'Male' };
const NARRATION_LANGUAGE_CODE: Record<NarrationLanguage, string> = { en: 'en-IN', hi: 'hi-IN' };

type Step = 'create' | 'generating' | 'edit' | 'compositing' | 'result';
type ShareStatus = 'idle' | 'sharing' | 'shared' | 'copied' | 'unsupported';

export const VideoStudioView: React.FC<VideoStudioViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('create');
  const [source, setSource] = useState<CreateSource>('prompt');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // "Create from prompt" state
  // Opened from the Gallery's "Create again": start with that prompt.
  const [prompt, setPrompt] = useState(() => takeReuse('video')?.prompt ?? '');
  const [templateCategory, setTemplateCategory] = useState<string>(VIDEO_PROMPT_CATEGORIES[0]);
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);
  /** The clip came from this user's earlier identical prompt - nothing was charged. */
  const [reusedClip, setReusedClip] = useState(false);
  const [stylePresetId, setStylePresetId] = useState(AI_STYLE_PRESETS[0].id);
  const [provider, setProvider] = useState<api.VideoProvider>(SELECTABLE_VIDEO_PROVIDERS[0]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(false);

  // The base clip - from generation, upload, or a stock template - before any
  // text overlay is burned into it.
  const [sourceVideoUrl, setSourceVideoUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AiStylePreset['aspectRatio']>('16:9');
  // aspectRatio above is only a best-guess box shape picked before the clip
  // loads (from the style preset, or a hardcoded 16:9 for uploads/templates).
  // Once the actual <video> reports its real dimensions, this takes over -
  // otherwise the edit preview can crop/fit the clip differently than the
  // canvas compositor does (which always draws the clip's true, uncropped
  // native resolution), making dragged text land in the wrong spot on export.
  const [sourceVideoNaturalAspect, setSourceVideoNaturalAspect] = useState<number | null>(null);
  // Raw encoded pixel size of the composited clip, shown next to the edit-
  // step player as a debugging aid - lets a mismatch between the requested
  // Shape and what MediaRecorder actually produced be spotted directly from
  // a screenshot, without needing devtools. Purely diagnostic display; only
  // sourceVideoNaturalAspect (above) drives any actual layout/export math.
  const [sourceVideoNaturalDims, setSourceVideoNaturalDims] = useState<{ width: number; height: number } | null>(
    null,
  );

  // "Scene Builder" - multiple uploaded images/clips, narrated by a single
  // voice prompt for the whole video, combined via compositeScenes() in
  // whatever order they appear in this array.
  const [scenes, setScenes] = useState<StudioScene[]>([]);
  const [draggedSceneId, setDraggedSceneId] = useState<string | null>(null);
  const [dragOverSceneId, setDragOverSceneId] = useState<string | null>(null);
  // Which scene the sidebar PREVIEW panel is currently showing - clamped to
  // the current scene count on every read (rather than in a useEffect) so it
  // can never point past the end after a scene is removed/reordered.
  const [previewSceneIndex, setPreviewSceneIndex] = useState(0);
  // Advanced options that apply to the whole Scene Builder output.
  const [sceneAspectRatio, setSceneAspectRatio] = useState<OutputAspectRatio>('16:9');
  const [sceneTransition, setSceneTransition] = useState<SceneTransitionType>('none');
  // Which scene's inline crop/reposition editor is open, if any - only one
  // at a time to keep the scene list from growing unbounded.
  const [cropEditingSceneId, setCropEditingSceneId] = useState<string | null>(null);
  const [isUploadingScenes, setIsUploadingScenes] = useState(false);
  const [galleryUsage, setGalleryUsage] = useState<api.GalleryUsage | null>(null);
  const [isGalleryPickerOpen, setIsGalleryPickerOpen] = useState(false);
  const [isLoadingGalleryPicker, setIsLoadingGalleryPicker] = useState(false);
  const [galleryPickerAssets, setGalleryPickerAssets] = useState<api.MediaAsset[]>([]);
  const [selectedGalleryIds, setSelectedGalleryIds] = useState<Set<string>>(new Set());
  // Populated by each thumbnail's onError - the asset's own URL went stale
  // (e.g. it was uploaded through a since-expired dev tunnel) or its file is
  // gone. Broken assets can't be selected, only deleted.
  const [brokenGalleryAssetIds, setBrokenGalleryAssetIds] = useState<Set<string>>(new Set());
  const [deletingGalleryAssetId, setDeletingGalleryAssetId] = useState<string | null>(null);
  // Non-fatal: set when compositeScenes() had to drop one or more scenes
  // (broken asset) but still produced a video from the rest.
  const [sceneWarning, setSceneWarning] = useState<string | null>(null);
  const [narrationText, setNarrationText] = useState('');
  const [narrationLanguage, setNarrationLanguage] = useState<NarrationLanguage>('hi');
  const [narrationGender, setNarrationGender] = useState<NarrationGender>('female');
  const [narrationVoiceId, setNarrationVoiceId] = useState('');
  // Scene Builder persistence - see VideoProjectsModule (apps/api). Created
  // lazily the moment scenes actually has something in it (not on tab-open),
  // so switching to this tab without adding anything never leaves a phantom
  // empty draft in "past projects".
  const [videoProjectId, setVideoProjectId] = useState<string | null>(null);
  // Editable draft name, shown once videoProjectId exists - see the
  // "Rename draft" input and its debounced patch below.
  const [draftTitle, setDraftTitle] = useState('');
  // Checked in the Scene Builder panel itself (before Generate is even
  // clicked) - the actual save happens once the generated clip reaches the
  // result step, since a template needs a finished video to attach to.
  const [sceneSaveAsTemplate, setSceneSaveAsTemplate] = useState(false);
  const [pastProjects, setPastProjects] = useState<api.VideoProject[]>([]);
  const [isSavingToGallery, setIsSavingToGallery] = useState(false);
  const [savedToGallery, setSavedToGallery] = useState(false);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  // Free "does this flow/pace well?" preview - uses the local voice sample
  // instead of real narration, so it never calls the paid Sarvam API (unlike
  // Generate Video, which reserves credits for the actual narration text).
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [isPreviewingVideo, setIsPreviewingVideo] = useState(false);

  const [videoTemplates, setVideoTemplates] = useState<api.VideoTemplate[]>([]);

  // Save-as-template (from the result screen)
  const [showSaveTemplatePanel, setShowSaveTemplatePanel] = useState(false);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateVisibility, setTemplateVisibility] = useState<api.VideoTemplateVisibility>('private');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [saveTemplateStatus, setSaveTemplateStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Text overlay editor
  const [overlayText, setOverlayText] = useState('');
  const [overlayPoint, setOverlayPoint] = useState<OverlayPoint>(DEFAULT_OVERLAY_POINT);
  const [isDraggingOverlay, setIsDraggingOverlay] = useState(false);
  const [isEditingOverlayText, setIsEditingOverlayText] = useState(false);
  const overlayPreviewRef = useRef<HTMLDivElement>(null);
  const overlayDragRef = useRef<{ startX: number; startY: number; moved: boolean } | null>(null);
  const [isResizingOverlay, setIsResizingOverlay] = useState(false);
  const overlayResizeStartRef = useRef<{ pointerX: number; scale: number } | null>(null);
  const [overlayFontFamilyId, setOverlayFontFamilyId] = useState<(typeof FONT_FAMILY_OPTIONS)[number]['id']>('sans');
  const [overlayFontScale, setOverlayFontScale] = useState(DEFAULT_FONT_SCALE);
  const [overlayColor, setOverlayColor] = useState('#ffffff');
  const [compositeProgress, setCompositeProgress] = useState(0);

  // The final clip actually shown/downloaded/shared - identical to
  // sourceVideoUrl if no text was added, otherwise the composited result.
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [finalMimeType, setFinalMimeType] = useState('video/mp4');
  const [hasOverlay, setHasOverlay] = useState(false);

  const [isDownloading, setIsDownloading] = useState(false);
  const [shareStatus, setShareStatus] = useState<ShareStatus>('idle');

  const stylePreset = AI_STYLE_PRESETS.find((t) => t.id === stylePresetId) ?? AI_STYLE_PRESETS[0];

  // The "create" step's side preview only really knows a shape for the
  // prompt tab (from the chosen format) and the Scene Builder tab (from the
  // "Shape" buttons, sceneAspectRatio) - upload/templates just preview at
  // the default 16:9 frame until a real clip is picked.
  const previewAspectRatio: AiStylePreset['aspectRatio'] =
    source === 'prompt' ? stylePreset.aspectRatio : source === 'scenes' ? sceneAspectRatio : '16:9';
  const previewAspectClass = ASPECT_RATIO_CLASSES[previewAspectRatio].split(' ')[0];

  const selectedFontFamily = FONT_FAMILY_OPTIONS.find((f) => f.id === overlayFontFamilyId) ?? FONT_FAMILY_OPTIONS[0];
  // Font size in the live preview is derived from the actual rendered
  // preview width, so what's shown stays proportionally identical to what
  // videoCompositor.ts draws onto the (usually much larger) export canvas.
  const overlayPreviewWidthPx = overlayPreviewRef.current?.getBoundingClientRect().width ?? DEFAULT_PREVIEW_WIDTH_PX;
  const overlayPreviewFontSizePx = Math.max(12, Math.round(overlayPreviewWidthPx / overlayFontScale));

  // Before a clip exists, the preview box shape is just a best guess from
  // whatever was picked (sceneAspectRatio for Scene Builder, aspectRatio for
  // prompt/upload/template). Once a real <video> loads (edit/result steps),
  // its measured natural aspect takes over as authoritative - the canvas
  // compositor always exports at the clip's true resolution, so this keeps
  // dragged text landing in the right spot on export for both paths.
  const displayAspectRatio =
    sourceVideoNaturalAspect ??
    (source === 'scenes' ? ASPECT_RATIO_NUMERIC[sceneAspectRatio] : ASPECT_RATIO_NUMERIC[aspectRatio]);

  // Each scene has its own duration (see StudioScene.durationSeconds) - the
  // video's total length is just their sum, scaled down proportionally if
  // it would exceed MAX_SCENE_TOTAL_SECONDS (see getScaledSceneDurations).
  // Narration (if any) still plays under the result regardless of how it
  // compares to this total - it may run short or get cut off.
  const sceneRawEstimatedSeconds = scenes.reduce((sum, s) => sum + s.durationSeconds, 0);
  const sceneCappedEstimatedSeconds = Math.max(1, Math.min(sceneRawEstimatedSeconds, MAX_SCENE_TOTAL_SECONDS));
  const sceneEstimateExceedsMax = sceneRawEstimatedSeconds > MAX_SCENE_TOTAL_SECONDS;
  const sceneDurationScale = sceneRawEstimatedSeconds > 0 ? sceneCappedEstimatedSeconds / sceneRawEstimatedSeconds : 1;

  // Estimated spoken length of the narration script, so a too-long script
  // can be caught before generating (rather than discovered as a trimmed
  // audio track afterward). Capped display-side at MAX_SCENE_TOTAL_SECONDS
  // since the video can never run longer than that regardless of scenes.
  const narrationWordCount = narrationText.trim() ? narrationText.trim().split(/\s+/).length : 0;
  const narrationEstimatedSeconds = Math.ceil(narrationWordCount / NARRATION_WORDS_PER_SECOND);
  const narrationFitsCap = narrationEstimatedSeconds <= MAX_SCENE_TOTAL_SECONDS;
  const narrationWillBeTrimmed = narrationWordCount > 0 && narrationEstimatedSeconds > sceneRawEstimatedSeconds;
  const clampedPreviewSceneIndex = Math.min(previewSceneIndex, Math.max(0, scenes.length - 1));
  const previewScene = scenes[clampedPreviewSceneIndex];

  /** Each scene's actual composited duration - equal to its own
   * durationSeconds unless the raw sum exceeds the 30s cap, in which case
   * every scene is scaled down by the same factor so relative pacing (e.g.
   * "this slide is 2x that one") is preserved rather than truncating the
   * tail scenes outright. */
  const getScaledSceneDurations = (): number[] => scenes.map((s) => s.durationSeconds * sceneDurationScale);

  useEffect(() => {
    api.listVideoTemplates().then(setVideoTemplates).catch(() => undefined);
    api.getGalleryUsage().then(setGalleryUsage).catch(() => undefined);
    api.listMyVideoProjects(10).then(setPastProjects).catch(() => undefined);
  }, []);

  // Lazily creates the persisted draft the moment the Scene Builder
  // actually has something in it.
  useEffect(() => {
    if (source !== 'scenes' || scenes.length === 0 || videoProjectId) return;
    if (!user?.organizationId || !user?.workspaceId) return;
    api
      .createVideoProject({ organizationId: user.organizationId, workspaceId: user.workspaceId })
      .then((project) => {
        setVideoProjectId(project.id);
        setDraftTitle(project.title);
      })
      .catch(() => undefined);
  }, [source, scenes.length, videoProjectId, user?.organizationId, user?.workspaceId]);

  // Auto-saves the draft as the person edits - debounced so rapid changes
  // (dragging a crop handle, typing narration) don't fire a PATCH per
  // keystroke. Only scene *content* (not selection/UI state like
  // previewSceneIndex or cropEditingSceneId) is persisted.
  useEffect(() => {
    if (!videoProjectId) return;
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => {
      api
        .updateVideoProject(videoProjectId, {
          ...(draftTitle.trim() ? { title: draftTitle.trim() } : {}),
          scenes: scenes.map((s) => ({
            id: s.id,
            visualUrl: s.visualUrl,
            visualType: s.visualType,
            durationSeconds: s.durationSeconds,
            focalXPct: s.focalXPct,
            focalYPct: s.focalYPct,
            filter: s.filter,
            motion: s.motion,
            fit: s.fit,
          })),
          aspectRatio: sceneAspectRatio,
          transition: sceneTransition,
          narrationText,
          narrationVoiceId,
          narrationGender,
          narrationLanguage,
        })
        .catch(() => undefined);
    }, 1500);
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    videoProjectId,
    draftTitle,
    scenes,
    sceneAspectRatio,
    sceneTransition,
    narrationText,
    narrationVoiceId,
    narrationGender,
    narrationLanguage,
  ]);

  /** Loads a past draft's scenes/settings back into the editor, so
   * "Continue a draft" (below) can resume it. */
  const handleResumeProject = (project: api.VideoProject) => {
    setVideoProjectId(project.id);
    setDraftTitle(project.title);
    setScenes(
      project.scenes.map((s) => ({
        id: s.id,
        visualUrl: s.visualUrl,
        visualType: s.visualType,
        durationSeconds: s.durationSeconds,
        focalXPct: s.focalXPct,
        focalYPct: s.focalYPct,
        filter: s.filter as SceneFilterPreset,
        motion: s.motion as SceneMotion,
        // Older drafts saved before "Fit" existed have no field here.
        fit: (s.fit as SceneFit) ?? 'cover',
      })),
    );
    setSceneAspectRatio(project.aspectRatio as OutputAspectRatio);
    setSceneTransition(project.transition as SceneTransitionType);
    setNarrationText(project.narrationText ?? '');
    if (project.narrationVoiceId) setNarrationVoiceId(project.narrationVoiceId);
    if (project.narrationGender === 'male' || project.narrationGender === 'female') {
      setNarrationGender(project.narrationGender);
    }
    if (project.narrationLanguage === 'en' || project.narrationLanguage === 'hi') {
      setNarrationLanguage(project.narrationLanguage);
    }
  };

  const resetAll = () => {
    setStep('create');
    setError(null);
    setSourceVideoUrl(null);
    setSourceVideoNaturalAspect(null);
    setOverlayText('');
    setOverlayPoint(DEFAULT_OVERLAY_POINT);
    setIsEditingOverlayText(false);
    setOverlayFontFamilyId('sans');
    setOverlayFontScale(DEFAULT_FONT_SCALE);
    setOverlayColor('#ffffff');
    setFinalVideoUrl(null);
    setHasOverlay(false);
    setShareStatus('idle');
    setScenes([]);
    setPreviewSceneIndex(0);
    setSceneAspectRatio('16:9');
    setSceneTransition('none');
    setCropEditingSceneId(null);
    setIsGalleryPickerOpen(false);
    setSelectedGalleryIds(new Set());
    setBrokenGalleryAssetIds(new Set());
    setSceneWarning(null);
    setNarrationText('');
    setNarrationVoiceId('');
    setPreviewVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setDraggedSceneId(null);
    setDragOverSceneId(null);
    setShowSaveTemplatePanel(false);
    setTemplateTitle('');
    setTemplateVisibility('private');
    setSaveTemplateStatus('idle');
    setVideoProjectId(null);
    setDraftTitle('');
    setSceneSaveAsTemplate(false);
    setSavedToGallery(false);
    api.listMyVideoProjects(10).then(setPastProjects).catch(() => undefined);
  };

  /** Returns to Scene Builder from the text-overlay/edit step without
   * losing the draft - unlike resetAll/"Start over", this keeps scenes,
   * narration, Shape/Transition/Fit and the persisted draft (videoProjectId)
   * exactly as they were, so tweaking a scene setting and regenerating
   * doesn't mean rebuilding from scratch. Only the stale composited clip
   * (from the generation being abandoned) and its overlay are cleared. */
  const handleBackToScenes = () => {
    setStep('create');
    setError(null);
    setSourceVideoUrl(null);
    setSourceVideoNaturalAspect(null);
    setOverlayText('');
    setOverlayPoint(DEFAULT_OVERLAY_POINT);
    setIsEditingOverlayText(false);
    setHasOverlay(false);
  };

  // ---------------------------------------------------------------------
  // Scene Builder: upload multiple images/clips at once, narrate the whole
  // video with a single voice prompt, then generate one combined video.
  // ---------------------------------------------------------------------

  const handleRemoveScene = (id: string) => setScenes((prev) => prev.filter((s) => s.id !== id));

  /** Scales every scene's duration up proportionally so their sum reaches
   * the estimated narration length (capped at MAX_SCENE_TOTAL_SECONDS,
   * since the video can never exceed that) - fixes the "narration gets cut
   * off" case where the total scene length was left shorter than the
   * script. Never scales down; if scenes already cover the narration,
   * this is a no-op. */
  const handleFitScenesToNarration = () => {
    if (scenes.length === 0 || sceneRawEstimatedSeconds <= 0) return;
    const target = Math.min(narrationEstimatedSeconds, MAX_SCENE_TOTAL_SECONDS);
    if (target <= sceneRawEstimatedSeconds) return;
    const scale = target / sceneRawEstimatedSeconds;
    setScenes((prev) => prev.map((s) => ({ ...s, durationSeconds: Math.round(s.durationSeconds * scale * 10) / 10 })));
  };

  const handleMoveScene = (id: string, direction: 'up' | 'down') => {
    setScenes((prev) => {
      const index = prev.findIndex((s) => s.id === id);
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (index === -1 || targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const handleSceneDrop = (targetId: string) => {
    setScenes((prev) => {
      if (!draggedSceneId || draggedSceneId === targetId) return prev;
      const fromIndex = prev.findIndex((s) => s.id === draggedSceneId);
      const toIndex = prev.findIndex((s) => s.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDraggedSceneId(null);
    setDragOverSceneId(null);
  };

  const handleSceneDragEnd = () => {
    setDraggedSceneId(null);
    setDragOverSceneId(null);
  };

  const createScene = (visualUrl: string, visualType: 'video' | 'image'): StudioScene => ({
    id: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    visualUrl,
    visualType,
    durationSeconds: DEFAULT_SCENE_SECONDS,
    focalXPct: 50,
    focalYPct: 50,
    filter: 'none',
    // Opt-in only - a new scene should look exactly like the source image/
    // clip until the user explicitly turns an effect on.
    motion: 'none',
    fit: 'cover',
  });

  /** Actually persists each file to the gallery (via /media/upload) rather
   * than a local URL.createObjectURL blob - so it's reusable later through
   * "Choose from Gallery" and counts against the shared 100 image/video cap.
   * Uploads sequentially so a mid-batch quota rejection (409) stops cleanly
   * with whatever succeeded before it kept, rather than firing every
   * request in parallel and untangling partial failures after the fact. */
  const handleScenesFileUpload = async (files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (list.length === 0) return;
    setError(null);
    setIsUploadingScenes(true);
    try {
      for (const file of list) {
        const asset = await api.uploadToGallery(file);
        const newScene = createScene(asset.url, asset.type === 'video' ? 'video' : 'image');
        setScenes((prev) => [...prev, newScene]);
        setGalleryUsage((prev) => (prev ? { ...prev, count: prev.count + 1 } : prev));
      }
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : "Couldn't upload one of your files. Try again.");
    } finally {
      setIsUploadingScenes(false);
    }
  };

  const handleOpenGalleryPicker = async () => {
    setIsGalleryPickerOpen(true);
    setSelectedGalleryIds(new Set());
    setBrokenGalleryAssetIds(new Set());
    setIsLoadingGalleryPicker(true);
    try {
      const [images, videos, characters] = await Promise.all([
        api.listMyGallery('image', 100),
        api.listMyGallery('video', 100),
        api.listMyGallery('character', 100),
      ]);
      setGalleryPickerAssets([...images, ...videos, ...characters]);
    } catch {
      setGalleryPickerAssets([]);
    } finally {
      setIsLoadingGalleryPicker(false);
    }
  };

  const handleToggleGallerySelect = (id: string) => {
    if (brokenGalleryAssetIds.has(id)) return;
    setSelectedGalleryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleGalleryAssetLoadError = (id: string) => {
    setBrokenGalleryAssetIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    setSelectedGalleryIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  /** Removes a broken (or simply unwanted) asset from the gallery for good -
   * optimistic like MediaLibraryView's handleDelete, reverting the local
   * list only if the API call itself fails. */
  const handleDeleteGalleryAsset = async (id: string) => {
    setDeletingGalleryAssetId(id);
    try {
      await api.deleteMediaAsset(id);
      setGalleryPickerAssets((prev) => prev.filter((asset) => asset.id !== id));
      setSelectedGalleryIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setBrokenGalleryAssetIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setGalleryUsage((prev) => (prev ? { ...prev, count: Math.max(0, prev.count - 1) } : prev));
    } catch (err) {
      setError(err instanceof Error ? `Couldn't delete that asset: ${err.message}` : "Couldn't delete that asset.");
    } finally {
      setDeletingGalleryAssetId(null);
    }
  };

  const handleAddSelectedFromGallery = () => {
    const picked = galleryPickerAssets.filter((asset) => selectedGalleryIds.has(asset.id));
    const newScenes = picked.map((asset) =>
      createScene(asset.url, asset.type === 'video' || asset.type === 'character' ? 'video' : 'image'),
    );
    setScenes((prev) => [...prev, ...newScenes]);
    setIsGalleryPickerOpen(false);
  };

  const handleSceneDurationChange = (id: string, value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, durationSeconds: parsed } : s)));
  };

  const handleSceneFilterChange = (id: string, filter: SceneFilterPreset) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, filter } : s)));
  };

  const handleSceneMotionToggle = (id: string) => {
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, motion: s.motion === 'kenburns' ? 'none' : 'kenburns' } : s)),
    );
  };

  const handleSceneFitToggle = (id: string) => {
    const nextFit: SceneFit = scenes.find((s) => s.id === id)?.fit === 'contain' ? 'cover' : 'contain';
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, fit: nextFit } : s)));
    // Contain mode always centers the whole image - the crop/focal-point
    // editor has nothing to do there, so close it rather than leave a
    // now-inert control open.
    if (nextFit === 'contain') setCropEditingSceneId((prev) => (prev === id ? null : prev));
  };

  // Drives both the crop editor's crosshair and the exported crop (see
  // SceneInput.focalXPct/YPct) - held-drag reposition, using the same 0-100
  // "object-position" semantics the live preview renders with via CSS, so
  // what's shown while dragging matches what gets exported exactly.
  const handleSceneFocalDrag = (id: string) => (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, focalXPct: xPct, focalYPct: yPct } : s)));
  };

  // Plays a pre-generated local sample (see scripts/generate-sarvam-voice-
  // samples.mjs) - no API call, so auditioning voices is instant and free.
  const handlePreviewVoice = (id: string) => {
    previewAudioRef.current?.pause();
    if (previewingVoiceId === id) {
      setPreviewingVoiceId(null);
      previewAudioRef.current = null;
      return;
    }
    const audio = new Audio(sarvamVoiceSampleUrl(id, narrationLanguage));
    audio.addEventListener('ended', () => setPreviewingVoiceId(null));
    audio.play().catch(() => setPreviewingVoiceId(null));
    previewAudioRef.current = audio;
    setPreviewingVoiceId(id);
  };

  // Same generic text-generation endpoint/pattern as Character Studio's
  // "Improve with AI"/"Generate with AI" script button (see
  // CharacterStudioView.tsx's handleImproveScript) - reworded for a
  // narrated slideshow instead of a talking-avatar script, and capped
  // shorter to fit Scene Builder's 30s ceiling.
  const handleGenerateNarration = async () => {
    setIsGeneratingNarration(true);
    setError(null);
    try {
      const narrationLanguageName = narrationLanguage === 'hi' ? 'hindi' : 'english';
      const narrationLanguageNote =
        narrationLanguage === 'hi' ? ' Write the narration in Hindi (Devanagari script).' : '';
      const result = await api.generateText(
        narrationText.trim()
          ? {
              language: narrationLanguageName,
              prompt: narrationText.trim(),
              systemPrompt:
                'You are a scriptwriter for short narrated slideshow videos (images/clips ' +
                "shown in sequence with voiceover). Rewrite the user's draft so it sounds " +
                'natural when read aloud: fix grammar, tighten the flow, keep it engaging, ' +
                'and preserve the core message. It must fit in under 30 seconds spoken ' +
                '(roughly 60-75 words max). Reply with only the narration text - no ' +
                'quotes, no preamble, no explanation.' +
                narrationLanguageNote,
            }
          : {
              language: narrationLanguageName,
              prompt: 'Write a short narration for a slideshow video.',
              systemPrompt:
                'You are a scriptwriter for short narrated slideshow videos (images/clips ' +
                'shown in sequence with voiceover). Write a natural, engaging narration ' +
                'under 30 seconds spoken (roughly 40-70 words), suitable as a generic ' +
                'starting point the user will edit. Reply with only the narration text - ' +
                'no quotes, no preamble, no explanation.' +
                narrationLanguageNote,
            },
      );
      setNarrationText(result.text.trim());
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not reach the Lumora API. Please try again.');
    } finally {
      setIsGeneratingNarration(false);
    }
  };

  /** Zero-credit preview: composites the real scenes at the estimated pace,
   * but stands in the selected voice's local sample instead of generating
   * the actual narration - so it never calls the paid Sarvam API. Stays on
   * the create step (doesn't touch `step`/`compositeProgress`, which are
   * reserved for the real Generate flow) so you can keep adjusting scenes. */
  const handlePreviewSceneVideo = async () => {
    if (scenes.length === 0) {
      setError('Upload at least one image or clip first.');
      return;
    }

    setError(null);
    setSceneWarning(null);
    setIsPreviewingVideo(true);
    try {
      const pickedVoice = narrationVoiceId
        ? SARVAM_VOICE_CATALOG.find((v) => v.id === narrationVoiceId)
        : undefined;
      const previewVoiceId = pickedVoice?.id ?? SARVAM_VOICE_BY_GENDER[narrationGender].voiceId;

      const scaledDurations = getScaledSceneDurations();
      const sceneInputs: SceneInput[] = scenes.map((s, i) => ({
        visualUrl: s.visualUrl,
        visualType: s.visualType,
        durationSeconds: scaledDurations[i],
        focalXPct: s.focalXPct,
        focalYPct: s.focalYPct,
        filter: s.filter,
        motion: s.motion,
        fit: s.fit,
      }));
      const { blob, skippedSceneNumbers } = await compositeScenes(sceneInputs, undefined, {
        globalAudioUrl: narrationText.trim() ? sarvamVoiceSampleUrl(previewVoiceId, narrationLanguage) : null,
        aspectRatio: sceneAspectRatio,
        transition: sceneTransition,
      });
      setSceneWarning(describeSkippedScenes(skippedSceneNumbers ?? []));
      setPreviewVideoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch (err) {
      setError(err instanceof Error ? `Couldn't build preview: ${err.message}` : "Couldn't build preview.");
    } finally {
      setIsPreviewingVideo(false);
    }
  };

  const handleGenerateSceneVideo = async () => {
    if (scenes.length === 0) {
      setError('Upload at least one image or clip first.');
      return;
    }

    setError(null);
    setSceneWarning(null);
    setPreviewVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setStep('compositing');
    setCompositeProgress(0);
    try {
      let globalAudioUrl: string | null = null;

      if (narrationText.trim()) {
        setProgressLabel('Generating narration...');
        const pickedVoice = narrationVoiceId
          ? SARVAM_VOICE_CATALOG.find((v) => v.id === narrationVoiceId)
          : undefined;
        const fallbackVoice = pickedVoice ? null : SARVAM_VOICE_BY_GENDER[narrationGender];
        const { audioUrl } = await api.generateSpeech({
          text: narrationText.trim(),
          provider: 'sarvam',
          voiceId: pickedVoice?.id ?? fallbackVoice?.voiceId,
          model: pickedVoice?.model ?? fallbackVoice?.model,
          languageCode: NARRATION_LANGUAGE_CODE[narrationLanguage],
        });
        globalAudioUrl = audioUrl;
      }

      setProgressLabel('Combining your scenes...');
      const scaledDurations = getScaledSceneDurations();
      const sceneInputs: SceneInput[] = scenes.map((s, i) => ({
        visualUrl: s.visualUrl,
        visualType: s.visualType,
        durationSeconds: scaledDurations[i],
        focalXPct: s.focalXPct,
        focalYPct: s.focalYPct,
        filter: s.filter,
        motion: s.motion,
        fit: s.fit,
      }));
      const { blob, skippedSceneNumbers } = await compositeScenes(sceneInputs, setCompositeProgress, {
        globalAudioUrl,
        aspectRatio: sceneAspectRatio,
        transition: sceneTransition,
      });
      // Route into the same text-overlay editor the prompt/upload/template
      // flows use (compositeTextOntoVideo in videoCompositor.ts) instead of
      // finishing directly - it works on any source video, blob URLs are
      // always same-origin so the canvas export won't be CORS-blocked. The
      // 'edit' step's preview box picks up the real shape from
      // sourceVideoNaturalAspect (see displayAspectRatio) once the exported
      // video's own metadata loads, so no aspectRatio state needs setting.
      setSceneWarning(describeSkippedScenes(skippedSceneNumbers ?? []));
      setSourceVideoNaturalAspect(null);
      setSourceVideoUrl(URL.createObjectURL(blob));
      setStep('edit');
    } catch (err) {
      setError(
        err instanceof api.ApiError
          ? err.message
          : err instanceof Error
            ? `Couldn't generate your video: ${err.message}`
            : "Couldn't generate your video.",
      );
      setStep('create');
    }
  };

  // ---------------------------------------------------------------------
  // Step 1: acquiring a base video (prompt / upload / stock template)
  // ---------------------------------------------------------------------

  const handleImprovePrompt = async () => {
    setIsImprovingPrompt(true);
    setImproveError(null);
    try {
      const result = await api.generateText({
        prompt: prompt.trim() || 'A short, friendly promotional video for a small Indian business.',
        systemPrompt:
          'You write prompts for an AI video generator (Google Veo). Rewrite the idea as ONE English prompt of 50-90 words: ' +
          'the subject and action, the setting, the camera move (e.g. slow push-in, tracking shot), the lighting, the mood, ' +
          'and the natural sounds you would hear. Describe a single continuous shot of 4-8 seconds. Do not ask for any ' +
          'on-screen text, logos or captions. Do not invent claims, rates, returns or guarantees. ' +
          'Reply with only the prompt - no preamble, no explanation.',
      });
      setPrompt(result.text.trim());
    } catch (err) {
      setImproveError(err instanceof api.ApiError ? err.message : 'Could not reach the Lumora API. Please try again.');
    } finally {
      setIsImprovingPrompt(false);
    }
  };

  const handleGenerateFromPrompt = async (fresh = false) => {
    if (!prompt.trim()) return;
    setError(null);
    setOutOfCredits(false);
    setReusedClip(false);
    setStep('generating');
    setProgressLabel('Submitting your prompt...');

    try {
      const job = await api.generateVideo({
        prompt: `${prompt.trim()}, ${stylePreset.styleSuffix}`,
        provider,
        durationSeconds: stylePreset.durationSeconds,
        aspectRatio: stylePreset.aspectRatio === '9:16' ? '9:16' : '16:9',
        fresh,
      });

      setProgressLabel('Rendering your video...');
      // A repeat of an earlier prompt comes back already finished - nothing to wait for.
      const final =
        job.status === 'completed' && job.videoUrl
          ? job
          : await api.pollVideoJob(provider, job.jobId, {
              cacheKey: job.cacheKey,
              onUpdate: () => setProgressLabel('Rendering your video...'),
            });

      if (final.status === 'completed' && final.videoUrl) {
        setReusedClip(Boolean(job.cached));
        setAspectRatio(stylePreset.aspectRatio);
        setSourceVideoNaturalAspect(null);
        setSourceVideoUrl(final.videoUrl);
        setStep('edit');
      } else {
        setError(`${PROVIDER_LABELS[provider]} could not render this video. Try again or pick a different engine.`);
        setStep('create');
      }
    } catch (err) {
      if (err instanceof api.ApiError && err.status === 402) {
        setOutOfCredits(true);
      } else {
        setError(
          err instanceof api.ApiError
            ? err.message
            : 'Could not reach the Lumora API. Is the backend running?',
        );
      }
      setStep('create');
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    // blob: URLs are always same-origin as far as canvas/CORS is concerned,
    // so uploaded videos can always get a text overlay burned in.
    setAspectRatio('16:9');
    setSourceVideoNaturalAspect(null);
    setSourceVideoUrl(URL.createObjectURL(file));
    setStep('edit');
  };

  const handlePickStockTemplate = (t: StockTemplate) => {
    setError(null);
    setAspectRatio(t.aspectRatio);
    setSourceVideoNaturalAspect(null);
    setSourceVideoUrl(t.url);
    setStep('edit');
  };

  const handlePickVideoTemplate = (t: api.VideoTemplate) => {
    const knownRatio = (['16:9', '9:16', '1:1', '4:5'] as const).includes(
      t.aspectRatio as AiStylePreset['aspectRatio'],
    );
    setError(null);
    setAspectRatio(knownRatio ? (t.aspectRatio as AiStylePreset['aspectRatio']) : '16:9');
    setSourceVideoNaturalAspect(null);
    setSourceVideoUrl(t.videoUrl);
    setStep('edit');
  };

  // ---------------------------------------------------------------------
  // Step 2: optional text overlay -> composite -> result
  // ---------------------------------------------------------------------

  // Dragging the text directly on the preview - position is tracked as a
  // 0-100 percentage of the preview box, which maps 1:1 onto the canvas the
  // real export draws on (see compositeTextOntoVideo's xPct/yPct). A plain
  // click (pointerdown+up with no real movement) opens inline editing
  // instead of just re-dropping the text where it already was.
  const CLICK_MOVE_THRESHOLD_PX = 4;

  const updateOverlayPointFromPointer = (e: React.PointerEvent) => {
    const container = overlayPreviewRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setOverlayPoint({
      xPct: clampOverlayPct(((e.clientX - rect.left) / rect.width) * 100),
      yPct: clampOverlayPct(((e.clientY - rect.top) / rect.height) * 100),
    });
  };

  const handleOverlayPointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (isEditingOverlayText) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    overlayDragRef.current = { startX: e.clientX, startY: e.clientY, moved: false };
    setIsDraggingOverlay(true);
  };

  const handleOverlayPointerMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!isDraggingOverlay || !overlayDragRef.current) return;
    const { startX, startY, moved } = overlayDragRef.current;
    if (!moved && Math.hypot(e.clientX - startX, e.clientY - startY) > CLICK_MOVE_THRESHOLD_PX) {
      overlayDragRef.current.moved = true;
    }
    if (overlayDragRef.current.moved) {
      updateOverlayPointFromPointer(e);
    }
  };

  const handleOverlayPointerUp = (e: React.PointerEvent<HTMLSpanElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDraggingOverlay(false);
    if (overlayDragRef.current && !overlayDragRef.current.moved) {
      setIsEditingOverlayText(true);
    }
    overlayDragRef.current = null;
  };

  // Resizing - drag the handle at the text's corner; distance moved
  // horizontally maps proportionally onto the font "scale" divisor (see
  // FONT_SIZE_PRESETS comment) relative to the preview's own width, so it
  // feels consistent regardless of how big the preview is on screen.
  const handleResizePointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsResizingOverlay(true);
    overlayResizeStartRef.current = { pointerX: e.clientX, scale: overlayFontScale };
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!isResizingOverlay || !overlayResizeStartRef.current) return;
    const container = overlayPreviewRef.current;
    const containerWidth = container?.getBoundingClientRect().width ?? DEFAULT_PREVIEW_WIDTH_PX;
    const { pointerX, scale } = overlayResizeStartRef.current;
    const delta = e.clientX - pointerX;
    setOverlayFontScale(clampFontScale(scale - (delta / containerWidth) * 30));
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLSpanElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsResizingOverlay(false);
    overlayResizeStartRef.current = null;
  };

  const finishWithoutOverlay = () => {
    if (!sourceVideoUrl) return;
    setFinalVideoUrl(sourceVideoUrl);
    setFinalMimeType('video/mp4');
    setHasOverlay(false);
    setStep('result');
  };

  /** The composited/overlaid export at the 'result' step was previously
   * download/share-only - no path saved it into the gallery, so a finished
   * Video Studio output (with any text overlay applied, or any Scene
   * Builder multi-scene stitch) never showed up in Recent Generations or
   * Media Library. If this result came from a persisted Scene Builder
   * project, this also marks it ready and links the asset
   * (VideoProjectsService.finish); otherwise it's just an upload. */
  const handleSaveToGallery = async () => {
    if (!finalVideoUrl) return;
    setIsSavingToGallery(true);
    setError(null);
    try {
      const blob = await fetch(finalVideoUrl).then((r) => r.blob());
      if (videoProjectId) {
        await api.finishVideoProject(videoProjectId, blob);
      } else {
        const file = new File([blob], `lumora-video-${Date.now()}.mp4`, {
          type: finalMimeType || 'video/mp4',
        });
        await api.uploadToGallery(file);
      }
      setSavedToGallery(true);
    } catch (err) {
      setError(
        err instanceof Error ? `Couldn't save to your gallery: ${err.message}` : "Couldn't save to your gallery.",
      );
    } finally {
      setIsSavingToGallery(false);
    }
  };

  const applyOverlayAndFinish = async () => {
    if (!sourceVideoUrl) return;
    if (!overlayText.trim()) {
      finishWithoutOverlay();
      return;
    }

    setError(null);
    setProgressLabel('Rendering your text overlay...');
    setStep('compositing');
    setCompositeProgress(0);

    try {
      const { blob, mimeType } = await compositeTextOntoVideo(
        sourceVideoUrl,
        {
          text: overlayText,
          xPct: overlayPoint.xPct,
          yPct: overlayPoint.yPct,
          fontFamily: selectedFontFamily.stack,
          fontSizeScale: overlayFontScale,
          color: overlayColor,
        },
        setCompositeProgress,
      );
      setFinalVideoUrl(URL.createObjectURL(blob));
      setFinalMimeType(mimeType);
      setHasOverlay(true);
      setStep('result');
    } catch (err) {
      setError(
        err instanceof Error
          ? `Couldn't add the text overlay: ${err.message}`
          : "Couldn't add the text overlay in this browser.",
      );
      setStep('edit');
    }
  };

  // ---------------------------------------------------------------------
  // Step 3: download / share
  // ---------------------------------------------------------------------

  const handleDownload = async () => {
    if (!finalVideoUrl) return;
    setIsDownloading(true);
    try {
      const response = await fetch(finalVideoUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const extension = finalMimeType.includes('webm') ? 'webm' : 'mp4';
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `lumora-video-${Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(finalVideoUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!finalVideoUrl) return;
    setShareStatus('sharing');

    try {
      const response = await fetch(finalVideoUrl);
      const blob = await response.blob();
      const extension = finalMimeType.includes('webm') ? 'webm' : 'mp4';
      const file = new File([blob], `lumora-video.${extension}`, { type: finalMimeType });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'My Lumora video', text: prompt });
        setShareStatus('shared');
        return;
      }
    } catch {
      // Fall through to link-based sharing (also covers the user cancelling
      // the share sheet, which throws too).
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Lumora video', text: prompt, url: finalVideoUrl });
        setShareStatus('shared');
        return;
      } catch {
        // Cancelled/unsupported - fall through to copy-link below.
      }
    }

    try {
      await navigator.clipboard.writeText(finalVideoUrl);
      setShareStatus('copied');
    } catch {
      setShareStatus('unsupported');
    }
  };

  const handleShareToFacebook = () => {
    if (!finalVideoUrl) return;
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(finalVideoUrl)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenSaveTemplatePanel = () => {
    if (!templateTitle.trim()) {
      setTemplateTitle(prompt.trim() || overlayText.trim() || 'My video template');
    }
    setSaveTemplateStatus('idle');
    setShowSaveTemplatePanel((v) => !v);
  };

  const handleSaveTemplate = async () => {
    if (!finalVideoUrl || !templateTitle.trim() || !user?.organizationId || !user?.workspaceId) return;

    setIsSavingTemplate(true);
    setSaveTemplateStatus('idle');
    try {
      const videoBlob = await fetch(finalVideoUrl).then((r) => r.blob());
      const saved = await api.saveVideoTemplate({
        organizationId: user.organizationId,
        workspaceId: user.workspaceId,
        title: templateTitle.trim(),
        videoBlob,
        aspectRatio: source === 'scenes' ? sceneAspectRatio : aspectRatio,
        visibility: templateVisibility,
      });
      setVideoTemplates((prev) => [saved, ...prev]);
      setSaveTemplateStatus('saved');
    } catch {
      setSaveTemplateStatus('error');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // "Also save as a template" was checked back in the Scene Builder panel,
  // before Generate was even clicked - the actual save can only happen once
  // there's a finished clip to attach it to, so it fires here the moment the
  // scene-builder flow reaches the result step. Reuses the same
  // save-as-template panel/state as the manual "Save as template" button
  // (see handleOpenSaveTemplatePanel) so the confirmation/error UI matches.
  useEffect(() => {
    if (step !== 'result' || !finalVideoUrl) return;
    if (source !== 'scenes' || !sceneSaveAsTemplate) return;
    if (isSavingTemplate || saveTemplateStatus !== 'idle') return;
    setShowSaveTemplatePanel(true);
    void handleSaveTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, finalVideoUrl, source, sceneSaveAsTemplate]);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400">
            <Film className="w-5 h-5" />
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Video Studio</h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Start from a prompt, an upload, a template, or build multi-scene with clips/images and
          voiceover - then download or share.
        </p>
      </div>

      {step === 'create' && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 w-fit mx-auto lg:mx-0">
            {(
              [
                { id: 'prompt', label: 'Prompt', icon: Sparkles },
                { id: 'upload', label: 'Upload', icon: Upload },
                { id: 'templates', label: 'Templates', icon: LayoutTemplate },
                { id: 'scenes', label: 'Scene Builder', icon: Layers },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = source === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSource(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {source === 'prompt' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-900 dark:text-white">
                    What's the video about?
                  </label>
                  <div className="flex items-center gap-3">
                    <VoiceInputButton onText={(spoken) => setPrompt((prev) => appendSpoken(prev, spoken))} />
                    <button
                      type="button"
                      onClick={handleImprovePrompt}
                      disabled={isImprovingPrompt}
                      title={prompt.trim() ? 'Rewrite this as a detailed video prompt' : 'Suggest a video prompt'}
                      className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:no-underline"
                    >
                      {isImprovingPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                      <span>{prompt.trim() ? 'Improve with AI' : 'Generate with AI'}</span>
                    </button>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. A drone shot flying over a futuristic city at sunset, glowing blue skyscrapers"
                  className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
                {improveError && <p className="text-[11px] text-red-500">{improveError}</p>}
                <p className="text-[10px] text-slate-400">
                  Repeating the same prompt, length and format reuses your saved clip for free.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Start from a template</h3>
                <div className="flex flex-wrap gap-1.5">
                  {VIDEO_PROMPT_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setTemplateCategory(category)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        templateCategory === category
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {VIDEO_PROMPT_TEMPLATES.filter((t) => t.category === templateCategory).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setPrompt(t.prompt);
                        setStylePresetId(t.presetId);
                        setImproveError(null);
                      }}
                      className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 transition-all"
                    >
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{t.title}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-3">
                        {t.prompt}
                      </p>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">
                  Pick one, then edit the words to match your own business before generating.
                </p>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Choose a format
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {AI_STYLE_PRESETS.map((t) => {
                    const Icon = t.icon;
                    const isActive = t.id === stylePresetId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setStylePresetId(t.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          isActive
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/30 ring-1 ring-blue-500/30'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <Icon className={`w-4 h-4 mb-1.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{t.label}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          {t.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={SELECTABLE_VIDEO_PROVIDERS.length > 1 ? undefined : 'hidden'}>
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showAdvanced ? 'Hide' : 'Show'} advanced options
                </button>
                {showAdvanced && SELECTABLE_VIDEO_PROVIDERS.length > 1 && (
                  <div className="mt-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                      Generation engine
                    </label>
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value as api.VideoProvider)}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                    >
                      {SELECTABLE_VIDEO_PROVIDERS.map((p) => (
                        <option key={p} value={p}>
                          {PROVIDER_LABELS[p]}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      {import.meta.env.PROD
                        ? 'AI video uses more credits than images or voice.'
                        : 'Veo needs a paid Google key configured on the backend; Mock always works and is meant for trying the flow out.'}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleGenerateFromPrompt()}
                disabled={!prompt.trim()}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Video</span>
              </button>
            </div>
          )}

          {source === 'upload' && (
            <div className="p-10 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col items-center gap-3 text-center">
              <Upload className="w-8 h-8 text-slate-400" />
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Upload a video from your device</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  MP4, WebM, or MOV. You'll be able to add text on top of it next.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelected}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all"
              >
                Choose File
              </button>
            </div>
          )}

          {source === 'templates' && (
            <div className="space-y-5">
              {(videoTemplates?.length ?? 0) > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Your saved templates
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {videoTemplates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handlePickVideoTemplate(t)}
                        className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 transition-all text-left group"
                      >
                        <div className="aspect-video bg-slate-950 overflow-hidden">
                          <video
                            src={t.videoUrl}
                            muted
                            preload="metadata"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="p-2.5 flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{t.title}</p>
                          <span
                            className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              t.visibility === 'team'
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {t.visibility}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Start from a stock clip
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {STOCK_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handlePickStockTemplate(t)}
                      className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 transition-all text-left group"
                    >
                      <div className="aspect-video bg-slate-950 overflow-hidden">
                        <video
                          src={t.url}
                          muted
                          preload="metadata"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white p-2.5">{t.label}</p>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">
                  A small starter set of free, reusable clips - pick one to add your own text on top of it.
                </p>
              </div>
            </div>
          )}

          {source === 'scenes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Upload images/clips, narrate the whole video, generate
                </h3>
                <span className="text-[10px] text-slate-400">
                  {scenes.length} scene{scenes.length === 1 ? '' : 's'}
                </span>
              </div>

              {videoProjectId && (
                <div className="flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    onBlur={() => {
                      if (!draftTitle.trim()) setDraftTitle('Untitled video');
                    }}
                    placeholder="Untitled video"
                    maxLength={150}
                    title="Rename this draft"
                    className="flex-1 min-w-0 text-sm font-bold text-slate-800 dark:text-slate-100 bg-transparent outline-none border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 transition-colors py-0.5"
                  />
                </div>
              )}

              {scenes.length === 0 && pastProjects.some((p) => p.status === 'draft') && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Continue a draft
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {pastProjects
                      .filter((p) => p.status === 'draft')
                      .slice(0, 4)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleResumeProject(p)}
                          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-left hover:border-blue-400 transition-colors"
                        >
                          <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                            {p.title}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {p.scenes.length} scene{p.scenes.length === 1 ? '' : 's'}
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-0.5">
                    Shape
                  </span>
                  {SCENE_ASPECT_RATIO_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSceneAspectRatio(opt.id)}
                      title={opt.label}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                        sceneAspectRatio === opt.id
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-400'
                      }`}
                    >
                      {opt.id}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-0.5">
                    Transition
                  </span>
                  {SCENE_TRANSITION_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSceneTransition(opt.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                        sceneTransition === opt.id
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="video/*,image/*"
                    multiple
                    id="scenes-multi-upload"
                    className="hidden"
                    disabled={isUploadingScenes}
                    onChange={(e) => {
                      void handleScenesFileUpload(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <label
                    htmlFor="scenes-multi-upload"
                    className={`flex-1 py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      isUploadingScenes ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    {isUploadingScenes ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{isUploadingScenes ? 'Uploading...' : 'Upload images or clips'}</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenGalleryPicker}
                    disabled={isUploadingScenes}
                    className="flex-1 py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FolderOpen className="w-4 h-4" /> Choose from Gallery
                  </button>
                </div>
                {galleryUsage && (
                  <p
                    className={`text-[10px] text-right ${
                      galleryUsage.count >= galleryUsage.max
                        ? 'text-red-500 dark:text-red-400 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {galleryUsage.count}/{galleryUsage.max} images/clips used
                  </p>
                )}
              </div>

              {isGalleryPickerOpen && (
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Choose from Gallery
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsGalleryPickerOpen(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isLoadingGalleryPicker ? (
                    <div className="flex items-center justify-center py-10 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  ) : galleryPickerAssets.length === 0 ? (
                    <p className="py-8 text-center text-[11px] text-slate-400">
                      No images or clips yet - upload some first.
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                        {galleryPickerAssets.map((asset) => {
                          const isSelected = selectedGalleryIds.has(asset.id);
                          const isBroken = brokenGalleryAssetIds.has(asset.id);
                          const isDeleting = deletingGalleryAssetId === asset.id;
                          return (
                            <div
                              key={asset.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleToggleGallerySelect(asset.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') handleToggleGallerySelect(asset.id);
                              }}
                              title={isBroken ? `${asset.fileName} (unavailable)` : asset.fileName}
                              className={`group relative aspect-video rounded-lg overflow-hidden bg-slate-950 border-2 transition-all ${
                                isBroken
                                  ? 'border-transparent cursor-not-allowed'
                                  : isSelected
                                    ? 'border-blue-600 cursor-pointer'
                                    : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer'
                              }`}
                            >
                              {isBroken ? (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-500 bg-slate-900">
                                  <AlertTriangle className="w-4 h-4" />
                                  <span className="text-[9px] font-semibold">Unavailable</span>
                                </div>
                              ) : asset.type === 'video' || asset.type === 'character' ? (
                                <video
                                  src={asset.url}
                                  muted
                                  className="w-full h-full object-cover"
                                  onError={() => handleGalleryAssetLoadError(asset.id)}
                                />
                              ) : (
                                <img
                                  src={asset.url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onError={() => handleGalleryAssetLoadError(asset.id)}
                                />
                              )}
                              {isSelected && !isBroken && (
                                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5" />
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDeleteGalleryAsset(asset.id);
                                }}
                                disabled={isDeleting}
                                title="Delete from gallery"
                                className="absolute bottom-1 right-1 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all disabled:opacity-100"
                              >
                                {isDeleting ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={handleAddSelectedFromGallery}
                        disabled={selectedGalleryIds.size === 0}
                        className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add {selectedGalleryIds.size || ''} selected
                      </button>
                    </>
                  )}
                </div>
              )}

              {scenes.length > 0 && (
                <div className="space-y-2">
                  {scenes.map((scene, index) => (
                    <div
                      key={scene.id}
                      draggable
                      onClick={() => setPreviewSceneIndex(index)}
                      onDragStart={() => setDraggedSceneId(scene.id)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverSceneId !== scene.id) setDragOverSceneId(scene.id);
                      }}
                      onDrop={() => handleSceneDrop(scene.id)}
                      onDragEnd={handleSceneDragEnd}
                      title="Click to preview this scene"
                      className={`rounded-xl bg-white dark:bg-slate-900 border shadow-xs cursor-pointer transition-all ${
                        draggedSceneId === scene.id
                          ? 'opacity-40 border-blue-400 dark:border-blue-600'
                          : dragOverSceneId === scene.id && draggedSceneId && draggedSceneId !== scene.id
                            ? 'border-blue-500 ring-2 ring-blue-500/30'
                            : clampedPreviewSceneIndex === index
                              ? 'border-blue-400 dark:border-blue-600 ring-1 ring-blue-400/40'
                              : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="p-2.5 flex items-center gap-3">
                        <span
                          title="Drag to reorder"
                          className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 shrink-0"
                        >
                          <GripVertical className="w-4 h-4" />
                        </span>

                        <div className="w-16 h-11 rounded-lg overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-center">
                          {scene.visualType === 'video' ? (
                            <video
                              src={scene.visualUrl}
                              muted
                              className="w-full h-full"
                              style={{
                                objectFit: scene.fit === 'contain' ? 'contain' : 'cover',
                                objectPosition: `${scene.focalXPct}% ${scene.focalYPct}%`,
                              }}
                            />
                          ) : (
                            <img
                              src={scene.visualUrl}
                              alt=""
                              className="w-full h-full"
                              style={{
                                objectFit: scene.fit === 'contain' ? 'contain' : 'cover',
                                objectPosition: `${scene.focalXPct}% ${scene.focalYPct}%`,
                              }}
                            />
                          )}
                        </div>

                        <span className="flex-1 min-w-0 text-xs font-bold text-slate-900 dark:text-white">
                          Scene {index + 1}
                        </span>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="number"
                            min={0.5}
                            step={0.5}
                            value={scene.durationSeconds}
                            onChange={(e) => handleSceneDurationChange(scene.id, e.target.value)}
                            title="Seconds this slide shows"
                            className="w-14 text-[11px] px-1.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                          />
                          <span className="text-[10px] text-slate-400">s</span>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveScene(scene.id, 'up');
                            }}
                            disabled={index === 0}
                            title="Move up"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition-colors"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveScene(scene.id, 'down');
                            }}
                            disabled={index === scenes.length - 1}
                            title="Move down"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition-colors"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveScene(scene.id);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div
                        className="px-2.5 pb-2.5 pl-[3.75rem] flex items-center gap-1.5 flex-wrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={scene.filter}
                          onChange={(e) => handleSceneFilterChange(scene.id, e.target.value as SceneFilterPreset)}
                          title="Color filter"
                          className="text-[10px] px-1.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 outline-none focus:border-blue-500"
                        >
                          {SCENE_FILTER_OPTIONS.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label}
                            </option>
                          ))}
                        </select>

                        {scene.visualType === 'image' && (
                          <button
                            type="button"
                            onClick={() => handleSceneMotionToggle(scene.id)}
                            title="Slow pan/zoom instead of a static hold"
                            className={`text-[10px] px-2 py-1 rounded-lg border font-semibold transition-colors ${
                              scene.motion === 'kenburns'
                                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                            }`}
                          >
                            Ken Burns
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSceneFitToggle(scene.id)}
                          title={
                            scene.fit === 'contain'
                              ? 'Showing the whole image, letterboxed - click to crop-to-fill instead'
                              : 'Cropping to fill the frame - click to show the whole image, letterboxed instead'
                          }
                          className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border font-semibold transition-colors ${
                            scene.fit === 'contain'
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                          }`}
                        >
                          {scene.fit === 'contain' ? 'Fit' : 'Fill'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setCropEditingSceneId((prev) => (prev === scene.id ? null : scene.id))}
                          disabled={scene.fit === 'contain'}
                          title={
                            scene.fit === 'contain'
                              ? 'Not used in Fit mode - the whole image is always shown centered'
                              : 'Choose what stays in frame'
                          }
                          className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            cropEditingSceneId === scene.id
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                          }`}
                        >
                          <Crop className="w-3 h-3" /> Crop
                        </button>
                      </div>

                      {cropEditingSceneId === scene.id && (
                        <div className="px-2.5 pb-3" onClick={(e) => e.stopPropagation()}>
                          <div
                            className="relative w-full max-w-[220px] mx-auto rounded-lg overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-crosshair select-none touch-none"
                            style={{ aspectRatio: ASPECT_RATIO_NUMERIC[sceneAspectRatio] }}
                            onPointerDown={(e) => {
                              // Keeps pointermove firing on this element even
                              // once the cursor leaves its ~220px bounds mid-
                              // drag - without capture, a fast drag near the
                              // edge silently stops updating the focal point.
                              e.currentTarget.setPointerCapture(e.pointerId);
                              handleSceneFocalDrag(scene.id)(e);
                            }}
                            onPointerMove={(e) => {
                              if (e.buttons === 1) handleSceneFocalDrag(scene.id)(e);
                            }}
                          >
                            {scene.visualType === 'video' ? (
                              <video
                                src={scene.visualUrl}
                                muted
                                className="w-full h-full pointer-events-none"
                                style={{
                                  objectFit: 'cover',
                                  objectPosition: `${scene.focalXPct}% ${scene.focalYPct}%`,
                                }}
                              />
                            ) : (
                              <img
                                src={scene.visualUrl}
                                alt=""
                                className="w-full h-full pointer-events-none"
                                style={{
                                  objectFit: 'cover',
                                  objectPosition: `${scene.focalXPct}% ${scene.focalYPct}%`,
                                }}
                              />
                            )}
                            <div
                              className="absolute w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow pointer-events-none"
                              style={{
                                left: `${scene.focalXPct}%`,
                                top: `${scene.focalYPct}%`,
                                transform: 'translate(-50%, -50%)',
                              }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 text-center mt-1">
                            Drag to choose what stays in frame
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <Mic className="w-3 h-3" /> Narration (optional)
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateNarration}
                    disabled={isGeneratingNarration}
                    title={narrationText.trim() ? 'Improve this narration with AI' : 'Generate a narration with AI'}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    {isGeneratingNarration ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Wand2 className="w-3 h-3" />
                    )}
                    <span>{narrationText.trim() ? 'Improve with AI' : 'Generate with AI'}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={narrationText}
                  onChange={(e) => setNarrationText(e.target.value)}
                  placeholder="What should the narrator say across this whole video?"
                  className="w-full text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
                <div className="flex justify-end">
                  <VoiceInputButton
                    language={narrationLanguage === 'hi' ? 'hi-IN' : 'en-IN'}
                    onText={(spoken) => setNarrationText((prev) => appendSpoken(prev, spoken))}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80">
                    {(Object.keys(NARRATION_LANGUAGE_LABELS) as NarrationLanguage[]).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setNarrationLanguage(lang)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                          narrationLanguage === lang
                            ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {NARRATION_LANGUAGE_LABELS[lang]}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80">
                    {(Object.keys(NARRATION_GENDER_LABELS) as NarrationGender[]).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setNarrationGender(g)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                          narrationGender === g
                            ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {NARRATION_GENDER_LABELS[g]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <div className="flex-1 min-w-0">
                    <SarvamVoiceSelect
                      value={narrationVoiceId}
                      onChange={setNarrationVoiceId}
                      previewingVoiceId={previewingVoiceId}
                      onPreview={handlePreviewVoice}
                      genderFilter={narrationGender}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handlePreviewVoice(narrationVoiceId || SARVAM_VOICE_BY_GENDER[narrationGender].voiceId)
                    }
                    title="Preview the current selection (plays a local sample, no API call)"
                    className="shrink-0 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors"
                  >
                    {previewingVoiceId === (narrationVoiceId || SARVAM_VOICE_BY_GENDER[narrationGender].voiceId) ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {scenes.length > 0 && (
                  <p className={`text-[10px] ${sceneEstimateExceedsMax ? 'text-red-500 dark:text-red-400' : 'text-slate-400'}`}>
                    ~{sceneCappedEstimatedSeconds}s video total ({MAX_SCENE_TOTAL_SECONDS}s max
                    {sceneEstimateExceedsMax ? ' - slides scaled down to fit' : ''})
                    . Set each slide's length below.
                  </p>
                )}

                {narrationWillBeTrimmed && (
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <div className="space-y-1.5">
                      <p className="text-[11px] leading-snug">
                        Narration is ~{narrationEstimatedSeconds}s (~{narrationWordCount} words) but your scenes only
                        total {sceneRawEstimatedSeconds}s - the audio will be cut off partway through.
                        {!narrationFitsCap && (
                          <>
                            {' '}
                            Even at the full {MAX_SCENE_TOTAL_SECONDS}s video limit, this script won't fully fit -
                            trim it to roughly {MAX_SCENE_TOTAL_SECONDS * NARRATION_WORDS_PER_SECOND} words or fewer
                            to avoid clipping.
                          </>
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={handleFitScenesToNarration}
                        className="text-[11px] font-bold text-amber-700 dark:text-amber-400 underline underline-offset-2 hover:no-underline"
                      >
                        Extend scenes to {Math.min(narrationEstimatedSeconds, MAX_SCENE_TOTAL_SECONDS)}s
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {previewVideoUrl && (
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Preview (placeholder voice sample)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(previewVideoUrl);
                        setPreviewVideoUrl(null);
                      }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div
                    className="relative mx-auto w-full max-w-sm max-h-[70vh] rounded-xl overflow-hidden bg-slate-950"
                    style={{ aspectRatio: displayAspectRatio }}
                  >
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video
                      src={previewVideoUrl}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Free - uses a sample of the selected voice, not your actual narration text. Click Generate Video
                    for the real thing.
                  </p>
                </div>
              )}

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sceneSaveAsTemplate}
                    onChange={(e) => {
                      setSceneSaveAsTemplate(e.target.checked);
                      if (e.target.checked && !templateTitle.trim()) {
                        setTemplateTitle(draftTitle.trim() || 'My video template');
                      }
                    }}
                    className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  <Bookmark className="w-3.5 h-3.5 shrink-0" />
                  <span>Also save as a template</span>
                </label>
                {sceneSaveAsTemplate && (
                  <>
                    <input
                      type="text"
                      value={templateTitle}
                      onChange={(e) => setTemplateTitle(e.target.value)}
                      placeholder="Template name..."
                      maxLength={150}
                      className="w-full text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTemplateVisibility('private')}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold border transition-all ${
                          templateVisibility === 'private'
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        Just me
                      </button>
                      <button
                        type="button"
                        onClick={() => setTemplateVisibility('team')}
                        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold border transition-all ${
                          templateVisibility === 'team'
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        My whole team
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Saved automatically once Generate Video finishes.
                    </p>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePreviewSceneVideo}
                  disabled={scenes.length === 0 || isPreviewingVideo}
                  title="Free - previews pacing and voice using a local sample, no API call"
                  className="flex-1 py-3.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isPreviewingVideo ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  <span>Preview (free)</span>
                </button>
                <button
                  onClick={handleGenerateSceneVideo}
                  disabled={scenes.length === 0}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  <Layers className="w-4 h-4" />
                  <span>Generate Video</span>
                </button>
              </div>
            </div>
          )}

          {outOfCredits && <OutOfCreditsNotice onNavigate={onNavigate} />}

          {error && !outOfCredits && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <p className="text-[11px] leading-snug">{error}</p>
            </div>
          )}

          {sceneWarning && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <p className="text-[11px] leading-snug">{sceneWarning}</p>
            </div>
          )}
        </div>

        <div className="space-y-3 lg:sticky lg:top-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Preview</h3>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
            <div
              className={`relative w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center ${previewAspectClass}`}
            >
              {source === 'prompt' && (
                <div className="flex flex-col items-center gap-2 text-slate-600 p-4 text-center">
                  <stylePreset.icon className="w-7 h-7" />
                  <span className="text-[11px] font-semibold text-slate-400">{stylePreset.label}</span>
                </div>
              )}
              {source === 'upload' && (
                <div className="flex flex-col items-center gap-2 text-slate-600 p-4 text-center">
                  <Upload className="w-7 h-7" />
                  <span className="text-[11px] font-semibold text-slate-400">
                    Choose a file to preview it here
                  </span>
                </div>
              )}
              {source === 'templates' && (
                <div className="flex flex-col items-center gap-2 text-slate-600 p-4 text-center">
                  <LayoutTemplate className="w-7 h-7" />
                  <span className="text-[11px] font-semibold text-slate-400">
                    Pick a clip to preview it here
                  </span>
                </div>
              )}
              {source === 'scenes' &&
                (previewScene ? (
                  <>
                    {previewScene.visualType === 'video' ? (
                      <video
                        key={previewScene.id}
                        src={previewScene.visualUrl}
                        muted
                        loop
                        autoPlay
                        className={`w-full h-full ${previewScene.fit === 'contain' ? 'object-contain' : 'object-cover'}`}
                      />
                    ) : (
                      <img
                        src={previewScene.visualUrl}
                        alt=""
                        className={`w-full h-full ${previewScene.fit === 'contain' ? 'object-contain' : 'object-cover'}`}
                      />
                    )}
                    {scenes.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewSceneIndex((clampedPreviewSceneIndex - 1 + scenes.length) % scenes.length)
                          }
                          title="Previous scene"
                          className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewSceneIndex((clampedPreviewSceneIndex + 1) % scenes.length)}
                          title="Next scene"
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-600 p-4 text-center">
                    <Layers className="w-7 h-7" />
                    <span className="text-[11px] font-semibold text-slate-400">
                      Add a scene to preview it here
                    </span>
                  </div>
                ))}
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              {source === 'prompt' && `${stylePreset.aspectRatio} · ${stylePreset.durationSeconds}s`}
              {source === 'scenes' &&
                scenes.length > 0 &&
                `Scene ${clampedPreviewSceneIndex + 1} of ${scenes.length}`}
            </p>
          </div>
        </div>
        </div>
      )}

      {step === 'generating' && (
        <div className="max-w-lg mx-auto py-20 flex flex-col items-center text-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{progressLabel}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {stylePreset.label} · {PROVIDER_LABELS[provider]} · usually a few seconds to a couple
              of minutes
            </p>
          </div>
        </div>
      )}

      {step === 'edit' && sourceVideoUrl && (
        <div className="max-w-2xl mx-auto space-y-5">
          {reusedClip && source === 'prompt' && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                We reused the clip you made earlier for this prompt - no credits were used.
              </p>
              <button
                type="button"
                onClick={() => handleGenerateFromPrompt(true)}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Make a new version (uses credits)
              </button>
            </div>
          )}
          <div className="flex items-center justify-between">
            {source === 'scenes' ? (
              <button
                onClick={handleBackToScenes}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to editing scenes
              </button>
            ) : (
              <button
                onClick={resetAll}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Start over
              </button>
            )}
            {source === 'scenes' && (
              <button
                onClick={resetAll}
                title="Discards the whole draft - scenes, narration, everything"
                className="text-[11px] font-semibold text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400"
              >
                Start over instead
              </button>
            )}
          </div>

          {sourceVideoNaturalDims && (
            <p className="text-center text-[10px] text-slate-400">
              Encoded at {sourceVideoNaturalDims.width}×{sourceVideoNaturalDims.height}px
              {source === 'scenes' && ` (requested Shape: ${sceneAspectRatio})`}
            </p>
          )}

          <div className="relative mx-auto rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950">
            <div
              ref={overlayPreviewRef}
              className="relative mx-auto w-full max-w-2xl max-h-[70vh]"
              style={{ aspectRatio: displayAspectRatio }}
            >
              <video
                src={sourceVideoUrl}
                controls
                onLoadedMetadata={(e) => {
                  const el = e.currentTarget;
                  if (el.videoWidth && el.videoHeight) {
                    setSourceVideoNaturalAspect(el.videoWidth / el.videoHeight);
                    setSourceVideoNaturalDims({ width: el.videoWidth, height: el.videoHeight });
                  }
                }}
                className="w-full h-full object-cover"
              />
              {/* Live WYSIWYG preview - click to edit inline, drag to
                  reposition, drag the corner handle to resize. The real
                  overlay is burned into the exported file by
                  videoCompositor.ts at the exact same xPct/yPct/scale. */}
              {overlayText.trim() && !isEditingOverlayText && (
                <span
                  onPointerDown={handleOverlayPointerDown}
                  onPointerMove={handleOverlayPointerMove}
                  onPointerUp={handleOverlayPointerUp}
                  className={`absolute inline-block px-3 py-1.5 rounded-md bg-black/55 font-bold text-center whitespace-nowrap touch-none select-none ${selectedFontFamily.previewClass} ${
                    isDraggingOverlay ? 'cursor-grabbing ring-2 ring-blue-500' : 'cursor-grab'
                  }`}
                  style={{
                    left: `${overlayPoint.xPct}%`,
                    top: `${overlayPoint.yPct}%`,
                    transform: 'translate(-50%, -50%)',
                    color: overlayColor,
                    fontFamily: selectedFontFamily.stack,
                    fontSize: `${overlayPreviewFontSizePx}px`,
                  }}
                >
                  {overlayText}
                  <span
                    onPointerDown={handleResizePointerDown}
                    onPointerMove={handleResizePointerMove}
                    onPointerUp={handleResizePointerUp}
                    title="Drag to resize"
                    className={`absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md touch-none ${
                      isResizingOverlay ? 'cursor-nwse-resize scale-110' : 'cursor-nwse-resize'
                    }`}
                  />
                </span>
              )}
              {overlayText.trim() && isEditingOverlayText && (
                <input
                  type="text"
                  value={overlayText}
                  autoFocus
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => setOverlayText(e.target.value)}
                  onBlur={() => setIsEditingOverlayText(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      e.currentTarget.blur();
                    }
                  }}
                  maxLength={80}
                  className={`absolute px-3 py-1.5 rounded-md bg-black/55 font-bold text-center outline-none ring-2 ring-blue-500 ${selectedFontFamily.previewClass}`}
                  style={{
                    left: `${overlayPoint.xPct}%`,
                    top: `${overlayPoint.yPct}%`,
                    transform: 'translate(-50%, -50%)',
                    color: overlayColor,
                    fontFamily: selectedFontFamily.stack,
                    fontSize: `${overlayPreviewFontSizePx}px`,
                    width: `${Math.max(120, overlayText.length * overlayPreviewFontSizePx * 0.62)}px`,
                  }}
                />
              )}
            </div>
          </div>
          {overlayText.trim() && (
            <p className="text-center text-[10px] text-slate-400 -mt-2">
              Click the text to edit it, drag to move it, or drag the blue dot to resize it
            </p>
          )}

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Type className="w-3.5 h-3.5" /> Add text (optional)
            </div>
            <input
              type="text"
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value)}
              placeholder="e.g. Sale ends today!"
              maxLength={80}
              className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            />
            <div className="flex gap-2">
              {TEXT_POSITION_PRESETS.map((pos) => {
                const Icon = pos.icon;
                const isActive = overlayPoint.xPct === pos.point.xPct && overlayPoint.yPct === pos.point.yPct;
                return (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setOverlayPoint(pos.point)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold border transition-all ${
                      isActive
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {pos.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400">
              Or drag the text directly on the preview above for a custom position.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Font</label>
                <select
                  value={overlayFontFamilyId}
                  onChange={(e) => setOverlayFontFamilyId(e.target.value as (typeof FONT_FAMILY_OPTIONS)[number]['id'])}
                  className="w-full text-xs px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                >
                  {FONT_FAMILY_OPTIONS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Size</label>
                <div className="flex gap-1">
                  {FONT_SIZE_PRESETS.map((sizeOpt) => {
                    const isActive = overlayFontScale === sizeOpt.scale;
                    return (
                      <button
                        key={sizeOpt.id}
                        type="button"
                        onClick={() => setOverlayFontScale(sizeOpt.scale)}
                        className={`flex-1 py-2 rounded-lg text-[11px] font-bold border transition-all ${
                          isActive
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {sizeOpt.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[9px] text-slate-400">Or drag the blue dot on the preview.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={overlayColor}
                  onChange={(e) => setOverlayColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent p-0.5"
                  title="Custom color"
                />
                <div className="flex gap-1.5">
                  {TEXT_COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setOverlayColor(color)}
                      title={color}
                      style={{ backgroundColor: color }}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        overlayColor === color
                          ? 'border-blue-600 scale-110'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {outOfCredits && <OutOfCreditsNotice onNavigate={onNavigate} />}

          {error && !outOfCredits && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <p className="text-[11px] leading-snug">{error}</p>
            </div>
          )}

          {sceneWarning && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <p className="text-[11px] leading-snug">{sceneWarning}</p>
            </div>
          )}

          <div className="flex gap-2.5">
            {overlayText.trim() ? (
              <button
                onClick={applyOverlayAndFinish}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Sparkles className="w-4 h-4" /> Apply Text & Continue
              </button>
            ) : (
              <button
                onClick={finishWithoutOverlay}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
              >
                Continue without text
              </button>
            )}
          </div>
        </div>
      )}

      {step === 'compositing' && (
        <div className="max-w-lg mx-auto py-20 flex flex-col items-center text-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <div className="w-full max-w-xs">
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {progressLabel || 'Rendering your text overlay...'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
              You'll briefly hear the clip's audio while it renders - this is normal.
            </p>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all"
                style={{ width: `${Math.round(compositeProgress * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {step === 'result' && finalVideoUrl && (
        <div className="max-w-2xl mx-auto space-y-5">
          <div
            className="mx-auto w-full max-w-2xl max-h-[70vh] rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950"
            style={{ aspectRatio: displayAspectRatio }}
          >
            <video src={finalVideoUrl} controls autoPlay className="w-full h-full object-cover" />
          </div>

          {hasOverlay && (
            <p className="text-center text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
              <Check className="w-3.5 h-3.5" /> Text overlay applied - it's part of the exported file
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button
              onClick={handleSaveToGallery}
              disabled={isSavingToGallery || savedToGallery}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-60"
            >
              {isSavingToGallery ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{savedToGallery ? 'Saved to Gallery' : 'Save to Gallery'}</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download {finalMimeType.includes('webm') ? 'WebM' : 'MP4'}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              {shareStatus === 'sharing' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : shareStatus === 'shared' ? (
                <Check className="w-4 h-4" />
              ) : shareStatus === 'copied' ? (
                <Copy className="w-4 h-4" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              <span>
                {shareStatus === 'shared' ? 'Shared' : shareStatus === 'copied' ? 'Link copied' : 'Share'}
              </span>
            </button>

            <button
              onClick={handleShareToFacebook}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1877F2] hover:opacity-90 text-white font-bold text-xs shadow-sm transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Share to Facebook</span>
            </button>

            <button
              onClick={handleOpenSaveTemplatePanel}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all"
            >
              <Bookmark className="w-4 h-4" />
              <span>Save as Template</span>
            </button>

            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Create another</span>
            </button>
          </div>

          {shareStatus === 'unsupported' && (
            <p className="text-center text-[11px] text-slate-400">
              Sharing/copying isn't supported in this browser - use Download instead.
            </p>
          )}

          <SchedulePostPanel
            finalVideoUrl={finalVideoUrl}
            defaultCaption={source === 'scenes' ? narrationText.trim() : overlayText.trim() || prompt.trim()}
            onNavigate={onNavigate}
          />


          {showSaveTemplatePanel && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <Bookmark className="w-3.5 h-3.5" /> Save as template
                </div>
                <button
                  onClick={() => setShowSaveTemplatePanel(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {saveTemplateStatus === 'saved' ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                  <Check className="w-4 h-4 shrink-0" />
                  Saved - it'll show up under Templates next time.
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={templateTitle}
                    onChange={(e) => setTemplateTitle(e.target.value)}
                    placeholder="Template name..."
                    maxLength={150}
                    className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTemplateVisibility('private')}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold border transition-all ${
                        templateVisibility === 'private'
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Just me
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplateVisibility('team')}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold border transition-all ${
                        templateVisibility === 'team'
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      My whole team
                    </button>
                  </div>

                  {saveTemplateStatus === 'error' && (
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <p className="text-[11px] leading-snug">Could not save this template. Please try again.</p>
                    </div>
                  )}

                  <button
                    onClick={handleSaveTemplate}
                    disabled={isSavingTemplate || !templateTitle.trim()}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                  >
                    {isSavingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4" />}
                    <span>Save Template</span>
                  </button>
                </>
              )}
            </div>
          )}

          <p className="text-center text-[10px] text-slate-400 max-w-md mx-auto">
            Instagram and Snapchat don't offer a direct "share from the web" link the way Facebook
            does - on a phone, the <span className="font-semibold">Share</span> button above will
            list them automatically if the app is installed. On desktop, download the file and
            upload it from within the app (that's also where you'd add a location tag, e.g.
            Amritsar - Instagram's own composer has that built in). Use{' '}
            <span className="font-semibold">Schedule Post</span> above for fully automated
            Facebook/Instagram publishing at a chosen time, once connected in Integrations.
          </p>
        </div>
      )}

    </div>
  );
};
