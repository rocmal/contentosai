import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Copy,
  Download,
  Film,
  GripVertical,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  Loader2,
  Megaphone,
  Mic,
  Plus,
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
import { compositeScenes, compositeTextOntoVideo, SceneInput } from '../../lib/videoCompositor';
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
    styleSuffix: 'cinematic style, dramatic lighting, shallow depth of field, film grain',
  },
  {
    id: 'social-reel',
    label: 'Social Reel',
    description: 'Vertical - Reels, TikTok, Snapchat Stories',
    icon: Smartphone,
    aspectRatio: '9:16',
    durationSeconds: 5,
    styleSuffix: 'vertical format, fast-paced energetic style, vibrant colors',
  },
  {
    id: 'square-post',
    label: 'Square Post',
    description: 'Instagram feed, Facebook post',
    icon: Square,
    aspectRatio: '1:1',
    durationSeconds: 5,
    styleSuffix: 'square format, clean centered composition',
  },
  {
    id: 'explainer',
    label: 'Explainer',
    description: 'Clean, corporate, widescreen',
    icon: Megaphone,
    aspectRatio: '16:9',
    durationSeconds: 6,
    styleSuffix: 'clean corporate style, bright even lighting, minimal background',
  },
  {
    id: 'product-ad',
    label: 'Product Ad',
    description: 'Commerce-focused, portrait',
    icon: ShoppingBag,
    aspectRatio: '4:5',
    durationSeconds: 5,
    styleSuffix: 'commercial product advertisement style, studio lighting',
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
  visualTab: 'templates' | 'upload' | 'ai' | 'gallery';
  visualUrl: string | null;
  visualType: 'video' | 'image' | null;
  aiPrompt: string;
  aiMode: 'video' | 'image';
  isGeneratingVisual: boolean;
  imageDurationSeconds: number;
  voiceoverText: string;
  voiceoverAudioUrl: string | null;
  isGeneratingVoiceover: boolean;
  error: string | null;
}

function createEmptyScene(): StudioScene {
  return {
    id: `scene-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    visualTab: 'templates',
    visualUrl: null,
    visualType: null,
    aiPrompt: '',
    aiMode: 'video',
    isGeneratingVisual: false,
    imageDurationSeconds: 4,
    voiceoverText: '',
    voiceoverAudioUrl: null,
    isGeneratingVoiceover: false,
    error: null,
  };
}
type Step = 'create' | 'generating' | 'edit' | 'compositing' | 'result';
type ShareStatus = 'idle' | 'sharing' | 'shared' | 'copied' | 'unsupported';

export const VideoStudioView: React.FC<VideoStudioViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('create');
  const [source, setSource] = useState<CreateSource>('prompt');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // "Create from prompt" state
  const [prompt, setPrompt] = useState('');
  const [stylePresetId, setStylePresetId] = useState(AI_STYLE_PRESETS[0].id);
  const [provider, setProvider] = useState<api.VideoProvider>('mock');
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

  // "Scene Builder" - multiple scenes (clip or image + optional voiceover),
  // combined into one continuous video via compositeScenes(), in whatever
  // order they appear in this array.
  const [scenes, setScenes] = useState<StudioScene[]>(() => [createEmptyScene()]);
  const [draggedSceneId, setDraggedSceneId] = useState<string | null>(null);
  const [dragOverSceneId, setDragOverSceneId] = useState<string | null>(null);

  // Reusable gallery - every image/voice generation is auto-saved server
  // side, so past ones can be picked here instead of regenerating (and
  // regenerating the exact same prompt again is itself cached server-side).
  const [galleryImages, setGalleryImages] = useState<api.MediaAsset[]>([]);
  const [galleryVoiceClips, setGalleryVoiceClips] = useState<api.MediaAsset[]>([]);
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
  // prompt tab (from the chosen format) - every other tab just previews at
  // the default 16:9 frame.
  const previewAspectRatio: AiStylePreset['aspectRatio'] = source === 'prompt' ? stylePreset.aspectRatio : '16:9';
  const previewAspectClass = ASPECT_RATIO_CLASSES[previewAspectRatio].split(' ')[0];

  const selectedFontFamily = FONT_FAMILY_OPTIONS.find((f) => f.id === overlayFontFamilyId) ?? FONT_FAMILY_OPTIONS[0];
  // Font size in the live preview is derived from the actual rendered
  // preview width, so what's shown stays proportionally identical to what
  // videoCompositor.ts draws onto the (usually much larger) export canvas.
  const overlayPreviewWidthPx = overlayPreviewRef.current?.getBoundingClientRect().width ?? DEFAULT_PREVIEW_WIDTH_PX;
  const overlayPreviewFontSizePx = Math.max(12, Math.round(overlayPreviewWidthPx / overlayFontScale));

  // The Scene Builder's canvas is always a fixed 1280x720 (16:9) regardless
  // of what the individual scene clips look like, so it never uses the
  // measured natural aspect - only the single-clip prompt/upload/template
  // path (which composites onto a canvas sized to the source clip's own
  // resolution) benefits from it.
  const displayAspectRatio =
    source === 'scenes' ? ASPECT_RATIO_NUMERIC['16:9'] : sourceVideoNaturalAspect ?? ASPECT_RATIO_NUMERIC[aspectRatio];

  useEffect(() => {
    api.listMyGallery('image').then(setGalleryImages).catch(() => undefined);
    api.listMyGallery('audio').then(setGalleryVoiceClips).catch(() => undefined);
    api.listVideoTemplates().then(setVideoTemplates).catch(() => undefined);
  }, []);

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
    setScenes([createEmptyScene()]);
    setDraggedSceneId(null);
    setDragOverSceneId(null);
    setShowSaveTemplatePanel(false);
    setTemplateTitle('');
    setTemplateVisibility('private');
    setSaveTemplateStatus('idle');
  };

  // ---------------------------------------------------------------------
  // Scene Builder: per-scene visual (template/upload/AI) + voiceover, then
  // combine everything into one video.
  // ---------------------------------------------------------------------

  const updateScene = (id: string, patch: Partial<StudioScene>) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleAddScene = () => setScenes((prev) => [...prev, createEmptyScene()]);

  const handleRemoveScene = (id: string) =>
    setScenes((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));

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

  const handleScenePickTemplate = (id: string, template: StockTemplate) => {
    updateScene(id, { visualUrl: template.url, visualType: 'video', error: null });
  };

  const handleScenePickGalleryImage = (id: string, asset: api.MediaAsset) => {
    updateScene(id, { visualUrl: asset.url, visualType: 'image', error: null });
  };

  const handleScenePickVoiceClip = (id: string, asset: api.MediaAsset) => {
    updateScene(id, { voiceoverText: asset.prompt ?? '', voiceoverAudioUrl: asset.url, error: null });
  };

  const handleSceneFileUpload = (id: string, file: File) => {
    const isImage = file.type.startsWith('image/');
    updateScene(id, { visualUrl: URL.createObjectURL(file), visualType: isImage ? 'image' : 'video', error: null });
  };

  const handleSceneGenerateAIVisual = async (id: string) => {
    const scene = scenes.find((s) => s.id === id);
    if (!scene || !scene.aiPrompt.trim()) return;

    updateScene(id, { isGeneratingVisual: true, error: null });
    try {
      if (scene.aiMode === 'video') {
        const job = await api.generateVideo({ prompt: scene.aiPrompt, provider: 'mock', durationSeconds: 5 });
        const final = await api.pollVideoJob('mock', job.jobId);
        if (final.status === 'completed' && final.videoUrl) {
          updateScene(id, { visualUrl: final.videoUrl, visualType: 'video' });
        } else {
          updateScene(id, { error: 'Could not generate this clip. Try again.' });
        }
      } else {
        const result = await api.generateImage({ prompt: scene.aiPrompt, provider: 'stability' });
        if (result.images[0]) {
          updateScene(id, { visualUrl: result.images[0], visualType: 'image' });
        } else {
          updateScene(id, { error: 'Could not generate this image. Try again.' });
        }
      }
    } catch (err) {
      updateScene(id, { error: err instanceof api.ApiError ? err.message : 'Generation failed. Try again.' });
    } finally {
      updateScene(id, { isGeneratingVisual: false });
    }
  };

  const handleSceneGenerateVoiceover = async (id: string) => {
    const scene = scenes.find((s) => s.id === id);
    if (!scene || !scene.voiceoverText.trim()) return;

    updateScene(id, { isGeneratingVoiceover: true, error: null });
    try {
      const { audioUrl } = await api.generateSpeech({ text: scene.voiceoverText });
      updateScene(id, { voiceoverAudioUrl: audioUrl });
    } catch (err) {
      updateScene(id, {
        error: err instanceof api.ApiError ? err.message : 'Voiceover generation failed. Try again.',
      });
    } finally {
      updateScene(id, { isGeneratingVoiceover: false });
    }
  };

  const handleCombineScenes = async () => {
    if (scenes.some((s) => !s.visualUrl || !s.visualType)) {
      setError('Every scene needs a clip or image before you can combine them.');
      return;
    }

    setError(null);
    setStep('compositing');
    setCompositeProgress(0);
    try {
      const sceneInputs: SceneInput[] = scenes.map((s) => ({
        visualUrl: s.visualUrl!,
        visualType: s.visualType!,
        imageDurationSeconds: s.imageDurationSeconds,
        voiceoverAudioUrl: s.voiceoverAudioUrl,
      }));
      const { blob, mimeType } = await compositeScenes(sceneInputs, setCompositeProgress);
      setAspectRatio('16:9');
      setFinalVideoUrl(URL.createObjectURL(blob));
      setFinalMimeType(mimeType);
      setHasOverlay(false);
      setStep('result');
    } catch (err) {
      setError(
        err instanceof Error ? `Couldn't combine your scenes: ${err.message}` : "Couldn't combine your scenes.",
      );
      setStep('create');
    }
  };

  // ---------------------------------------------------------------------
  // Step 1: acquiring a base video (prompt / upload / stock template)
  // ---------------------------------------------------------------------

  const handleGenerateFromPrompt = async () => {
    if (!prompt.trim()) return;
    setError(null);
    setOutOfCredits(false);
    setStep('generating');
    setProgressLabel('Submitting your prompt...');

    try {
      const job = await api.generateVideo({
        prompt: `${prompt.trim()}, ${stylePreset.styleSuffix}`,
        provider,
        durationSeconds: stylePreset.durationSeconds,
      });

      setProgressLabel('Rendering your video...');
      const final = await api.pollVideoJob(provider, job.jobId, {
        onUpdate: () => setProgressLabel('Rendering your video...'),
      });

      if (final.status === 'completed' && final.videoUrl) {
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

  const applyOverlayAndFinish = async () => {
    if (!sourceVideoUrl) return;
    if (!overlayText.trim()) {
      finishWithoutOverlay();
      return;
    }

    setError(null);
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
        aspectRatio,
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
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
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
                <label className="block text-xs font-bold text-slate-900 dark:text-white">
                  What's the video about?
                </label>
                <textarea
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. A drone shot flying over a futuristic city at sunset, glowing blue skyscrapers"
                  className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
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

              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showAdvanced ? 'Hide' : 'Show'} advanced options
                </button>
                {showAdvanced && (
                  <div className="mt-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
                      Generation engine
                    </label>
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value as api.VideoProvider)}
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                    >
                      {api.VIDEO_PROVIDERS.map((p) => (
                        <option key={p} value={p}>
                          {PROVIDER_LABELS[p]}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      Veo/Runway/Kling/Pika need a paid API key configured on the backend; Mock
                      always works and is meant for trying the flow out.
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleGenerateFromPrompt}
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
                  Build your video scene by scene
                </h3>
                <span className="text-[10px] text-slate-400">
                  {scenes.length} scene{scenes.length > 1 ? 's' : ''}
                </span>
              </div>

              {scenes.map((scene, index) => (
                <div
                  key={scene.id}
                  draggable
                  onDragStart={() => setDraggedSceneId(scene.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverSceneId !== scene.id) setDragOverSceneId(scene.id);
                  }}
                  onDrop={() => handleSceneDrop(scene.id)}
                  onDragEnd={handleSceneDragEnd}
                  className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm space-y-3.5 transition-all ${
                    draggedSceneId === scene.id
                      ? 'opacity-40 border-blue-400 dark:border-blue-600'
                      : dragOverSceneId === scene.id && draggedSceneId && draggedSceneId !== scene.id
                        ? 'border-blue-500 ring-2 ring-blue-500/30'
                        : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        title="Drag to reorder"
                        className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400"
                      >
                        <GripVertical className="w-4 h-4" />
                      </span>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        Scene {index + 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleMoveScene(scene.id, 'up')}
                        disabled={index === 0}
                        title="Move up"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition-colors"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveScene(scene.id, 'down')}
                        disabled={index === scenes.length - 1}
                        title="Move down"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent transition-colors"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      {scenes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveScene(scene.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-24 h-16 rounded-lg overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-center">
                      {scene.visualUrl ? (
                        scene.visualType === 'video' ? (
                          <video src={scene.visualUrl} muted className="w-full h-full object-cover" />
                        ) : (
                          <img src={scene.visualUrl} alt="" className="w-full h-full object-cover" />
                        )
                      ) : (
                        <Film className="w-5 h-5 text-slate-700" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2.5">
                      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 w-fit">
                        {(
                          [
                            { id: 'templates', label: 'Templates' },
                            { id: 'upload', label: 'Upload' },
                            { id: 'ai', label: 'AI Generate' },
                            { id: 'gallery', label: 'My Gallery' },
                          ] as const
                        ).map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => updateScene(scene.id, { visualTab: tab.id })}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                              scene.visualTab === tab.id
                                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {scene.visualTab === 'templates' && (
                        <div className="grid grid-cols-2 gap-1.5">
                          {STOCK_TEMPLATES.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleScenePickTemplate(scene.id, t)}
                              className={`text-[10px] font-semibold px-2 py-1.5 rounded-lg border transition-all ${
                                scene.visualUrl === t.url
                                  ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/30'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {scene.visualTab === 'upload' && (
                        <div>
                          <input
                            type="file"
                            accept="video/*,image/*"
                            id={`scene-upload-${scene.id}`}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleSceneFileUpload(scene.id, file);
                            }}
                          />
                          <label
                            htmlFor={`scene-upload-${scene.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            <Upload className="w-3 h-3" /> Choose clip or image
                          </label>
                        </div>
                      )}

                      {scene.visualTab === 'ai' && (
                        <div className="space-y-1.5">
                          <div className="flex gap-1">
                            {(
                              [
                                { id: 'video', label: 'Video clip', icon: Film },
                                { id: 'image', label: 'Image', icon: ImageIcon },
                              ] as const
                            ).map((mode) => (
                              <button
                                key={mode.id}
                                type="button"
                                onClick={() => updateScene(scene.id, { aiMode: mode.id })}
                                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border transition-all ${
                                  scene.aiMode === mode.id
                                    ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/30'
                                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                <mode.icon className="w-3 h-3" /> {mode.label}
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={scene.aiPrompt}
                              onChange={(e) => updateScene(scene.id, { aiPrompt: e.target.value })}
                              placeholder="Describe this scene..."
                              className="flex-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleSceneGenerateAIVisual(scene.id)}
                              disabled={scene.isGeneratingVisual || !scene.aiPrompt.trim()}
                              className="px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 flex items-center justify-center transition-all"
                            >
                              {scene.isGeneratingVisual ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Wand2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {scene.visualTab === 'gallery' && (
                        <div className="space-y-1">
                          {(galleryImages?.length ?? 0) === 0 ? (
                            <p className="text-[10px] text-slate-400">
                              No saved images yet - generate one with AI or Image Studio first.
                            </p>
                          ) : (
                            <div className="grid grid-cols-4 gap-1.5 max-h-24 overflow-y-auto">
                              {galleryImages.map((asset) => (
                                <button
                                  key={asset.id}
                                  type="button"
                                  title={asset.prompt ?? asset.fileName}
                                  onClick={() => handleScenePickGalleryImage(scene.id, asset)}
                                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                    scene.visualUrl === asset.url ? 'border-blue-600' : 'border-transparent'
                                  }`}
                                >
                                  <img src={asset.url} alt="" className="w-full h-full object-cover" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {scene.visualType === 'image' && (
                        <div className="flex items-center gap-1.5">
                          <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            Hold for
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={scene.imageDurationSeconds}
                            onChange={(e) =>
                              updateScene(scene.id, { imageDurationSeconds: Number(e.target.value) || 4 })
                            }
                            className="w-14 text-[11px] px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                          />
                          <span className="text-[10px] text-slate-400">seconds</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <Mic className="w-3 h-3" /> Voiceover (optional)
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={scene.voiceoverText}
                        onChange={(e) =>
                          updateScene(scene.id, { voiceoverText: e.target.value, voiceoverAudioUrl: null })
                        }
                        placeholder="What should the narrator say for this scene?"
                        className="flex-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleSceneGenerateVoiceover(scene.id)}
                        disabled={scene.isGeneratingVoiceover || !scene.voiceoverText.trim()}
                        className="px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold disabled:opacity-50 flex items-center gap-1 transition-all"
                      >
                        {scene.isGeneratingVoiceover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Generate'}
                      </button>
                    </div>
                    {scene.voiceoverAudioUrl && (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <audio src={scene.voiceoverAudioUrl} controls className="w-full h-8" />
                    )}
                    {(galleryVoiceClips?.length ?? 0) > 0 && (
                      <div className="space-y-1">
                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                          Or reuse a past clip
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {galleryVoiceClips.slice(0, 6).map((asset) => (
                            <button
                              key={asset.id}
                              type="button"
                              onClick={() => handleScenePickVoiceClip(scene.id, asset)}
                              title={asset.prompt ?? ''}
                              className="max-w-[7rem] truncate px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                              {asset.prompt || asset.fileName}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {scene.error && <p className="text-[10px] text-red-500 dark:text-red-400">{scene.error}</p>}
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddScene}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" /> Add Scene
              </button>

              <button
                onClick={handleCombineScenes}
                disabled={scenes.some((s) => !s.visualUrl)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                <Layers className="w-4 h-4" />
                <span>
                  Combine {scenes.length} Scene{scenes.length > 1 ? 's' : ''} & Create Video
                </span>
              </button>
            </div>
          )}

          {outOfCredits && <OutOfCreditsNotice onNavigate={onNavigate} />}

          {error && !outOfCredits && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <p className="text-[11px] leading-snug">{error}</p>
            </div>
          )}
        </div>

        <div className="space-y-3 lg:sticky lg:top-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Preview</h3>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
            <div
              className={`w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center ${previewAspectClass}`}
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
                (scenes[0]?.visualUrl ? (
                  scenes[0].visualType === 'video' ? (
                    <video src={scenes[0].visualUrl} muted loop autoPlay className="w-full h-full object-cover" />
                  ) : (
                    <img src={scenes[0].visualUrl} alt="" className="w-full h-full object-cover" />
                  )
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
              {source === 'scenes' && scenes.length > 0 && `Scene 1 of ${scenes.length}`}
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
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Start over
          </button>

          <div className="relative mx-auto rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950">
            <div
              ref={overlayPreviewRef}
              className="relative mx-auto w-full max-w-2xl max-h-[70vh]"
              style={{ aspectRatio: displayAspectRatio }}
            >
              <video
                src={sourceVideoUrl}
                controls
                loop
                onLoadedMetadata={(e) => {
                  const el = e.currentTarget;
                  if (el.videoWidth && el.videoHeight) {
                    setSourceVideoNaturalAspect(el.videoWidth / el.videoHeight);
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
              {source === 'scenes' ? 'Combining your scenes...' : 'Rendering your text overlay...'}
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
            <video src={finalVideoUrl} controls autoPlay loop className="w-full h-full object-cover" />
          </div>

          {hasOverlay && (
            <p className="text-center text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
              <Check className="w-3.5 h-3.5" /> Text overlay applied - it's part of the exported file
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2.5">
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
            defaultCaption={overlayText.trim() || prompt.trim()}
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
