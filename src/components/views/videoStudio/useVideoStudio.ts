import React, { useEffect, useRef, useState } from 'react';
import { ViewType } from '../../../types';
import * as api from '../../../lib/api';
import { VIDEO_PROMPT_CATEGORIES } from '../../../lib/videoPromptTemplates';
import { type NarrationAudio, takeNarrationAudio, takeReuse } from '../../../lib/reuse';
import { measureAudioSeconds } from '../../../lib/audioDuration';
import { useCreditRates } from '../../../lib/creditCost';
import {
  compositeScenes,
  compositeTextOntoVideo,
  OutputAspectRatio,
  SceneFilterPreset,
  SceneInput,
  SceneMotion,
  SceneTransitionType,
} from '../../../lib/videoCompositor';
import { SARVAM_VOICE_BY_GENDER, SARVAM_VOICE_CATALOG, sarvamVoiceSampleUrl } from '../../../lib/sarvamVoices';
import { useAuth } from '../../../contexts/AuthContext';
import {
  AI_STYLE_PRESETS,
  ASPECT_RATIO_CLASSES,
  ASPECT_RATIO_NUMERIC,
  AiStylePreset,
  CreateSource,
  DEFAULT_FONT_SCALE,
  DEFAULT_OVERLAY_POINT,
  DEFAULT_PREVIEW_WIDTH_PX,
  DEFAULT_SCENE_SECONDS,
  FONT_FAMILY_OPTIONS,
  MAX_SCENE_TOTAL_SECONDS,
  NARRATION_LANGUAGE_CODE,
  NARRATION_WORDS_PER_SECOND,
  NarrationGender,
  NarrationLanguage,
  OverlayPoint,
  PROVIDER_LABELS,
  RECENT_PROJECTS_TO_LOAD,
  SELECTABLE_VIDEO_PROVIDERS,
  SceneFit,
  ShareStatus,
  Step,
  StockTemplate,
  StudioScene,
  clampFontScale,
  clampOverlayPct,
  describeSkippedScenes,
} from './constants';

/** All of Video Studio's state and actions. VideoStudioView renders the steps; each step component reads what it
 * needs from this hook's result (passed down as `studio`). */
export function useVideoStudio(onNavigate: (view: ViewType) => void) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('create');
  // A saved voice recording sent here from Voice Studio opens the Scene Builder, where it becomes the narration.
  const [recordedNarration, setRecordedNarration] = useState<NarrationAudio | null>(() => takeNarrationAudio());
  const [source, setSource] = useState<CreateSource>(() => (takeNarrationAudio() ? 'scenes' : 'prompt'));
  // Voices the person recorded in Voice Studio, offered as narration as they were recorded.
  const [myRecordings, setMyRecordings] = useState<api.CustomVoice[]>([]);
  useEffect(() => {
    api.listCustomVoices().then(setMyRecordings).catch(() => undefined);
  }, []);
  // A reopened draft's recording while its current address is looked up; autosave keeps the id meanwhile.
  const [pendingRecordingId, setPendingRecordingId] = useState<string | null>(null);
  const [draftRecordingNote, setDraftRecordingNote] = useState<string | null>(null);
  const resumeCountRef = useRef(0);
  // The recording's real length, keyed by its address so a result for an earlier recording is never shown.
  const [recordingLength, setRecordingLength] = useState<{ url: string; seconds: number | null } | null>(null);
  useEffect(() => {
    const url = recordedNarration?.url;
    if (!url) return;
    let cancelled = false;
    measureAudioSeconds(url).then((seconds) => {
      if (!cancelled) setRecordingLength({ url, seconds });
    });
    return () => {
      cancelled = true;
    };
  }, [recordedNarration?.url]);
  const recordedNarrationSeconds =
    recordedNarration && recordingLength?.url === recordedNarration.url ? recordingLength.seconds : null;
  // Which entry of "My recorded voices" is the narration ('sent' = one that is not in the list).
  const recordedNarrationOptionId = !recordedNarration
    ? ''
    : (myRecordings.find((v) => v.id === recordedNarration.voiceId || v.sampleUrl === recordedNarration.url)?.id ??
      'sent');
  /** Picks a recording (or none) as the narration, replacing whatever a reopened draft was still looking up. */
  const chooseRecordedNarration = (audio: NarrationAudio | null) => {
    setRecordedNarration(audio);
    setPendingRecordingId(null);
    setDraftRecordingNote(null);
  };
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
  const creditRates = useCreditRates();

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
  const [showAllDrafts, setShowAllDrafts] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<api.VideoProject | null>(null);
  const [draftDeleteError, setDraftDeleteError] = useState<string | null>(null);

  const handleDeleteDraft = async () => {
    if (!draftToDelete) return;
    const { id, title } = draftToDelete;
    setDraftToDelete(null);
    setDraftDeleteError(null);
    try {
      await api.deleteVideoProject(id);
      setPastProjects((previous) => previous.filter((project) => project.id !== id));
      if (videoProjectId === id) setVideoProjectId(null);
    } catch (err) {
      // Still listed, so the person can try again.
      setDraftDeleteError(
        err instanceof api.ApiError
          ? `Could not delete "${title}": ${err.message}`
          : `Could not delete "${title}". Check your connection and try again.`,
      );
    }
  };
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
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [saveTemplateError, setSaveTemplateError] = useState<string | null>(null);
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
  // With a recording, its real length (once measured); otherwise the typed script's estimate.
  const narrationSeconds = recordedNarration ? Math.ceil(recordedNarrationSeconds ?? 0) : narrationEstimatedSeconds;
  const narrationFitsCap = narrationSeconds <= MAX_SCENE_TOTAL_SECONDS;
  const narrationWillBeTrimmed =
    scenes.length > 0 &&
    (recordedNarration ? narrationSeconds > 0 : narrationWordCount > 0) &&
    narrationSeconds > sceneRawEstimatedSeconds;
  const clampedPreviewSceneIndex = Math.min(previewSceneIndex, Math.max(0, scenes.length - 1));
  const previewScene = scenes[clampedPreviewSceneIndex];

  /** Each scene's actual composited duration - equal to its own
   * durationSeconds unless the raw sum exceeds the 30s cap, in which case
   * every scene is scaled down by the same factor so relative pacing (e.g.
   * "this slide is 2x that one") is preserved rather than truncating the
   * tail scenes outright. */
  const getScaledSceneDurations = (): number[] => scenes.map((s) => s.durationSeconds * sceneDurationScale);

  const loadVideoTemplates = () => {
    api
      .listVideoTemplates()
      .then((items) => {
        setVideoTemplates(items);
        setTemplatesError(null);
      })
      .catch((err) =>
        setTemplatesError(err instanceof api.ApiError ? err.message : 'Could not load your saved templates.'),
      );
  };

  // Reload whenever the Templates tab is opened, so a template saved a moment ago shows up.
  useEffect(() => {
    if (source === 'templates') loadVideoTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  useEffect(() => {
    loadVideoTemplates();
    api.getGalleryUsage().then(setGalleryUsage).catch(() => undefined);
    api.listMyVideoProjects(RECENT_PROJECTS_TO_LOAD).then(setPastProjects).catch(() => undefined);
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
          narrationRecordingId: recordedNarration?.voiceId ?? pendingRecordingId ?? null,
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
    recordedNarration,
    pendingRecordingId,
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
    // The recording (if any) is looked up fresh, since its address can change.
    const resume = ++resumeCountRef.current;
    setRecordedNarration(null);
    setDraftRecordingNote(null);
    setPendingRecordingId(project.narrationRecordingId);
    const wanted = project.narrationRecordingId;
    if (wanted) {
      api
        .listCustomVoices()
        .then((voices) => {
          if (resume !== resumeCountRef.current) return;
          setMyRecordings(voices);
          const found = voices.find((v) => v.id === wanted);
          if (found?.sampleUrl) {
            setRecordedNarration({ name: found.name, url: found.sampleUrl, voiceId: found.id });
          } else {
            setDraftRecordingNote('The voice recording this draft used has been deleted, so the typed script is used instead.');
          }
          setPendingRecordingId(null);
        })
        .catch(() => {
          if (resume !== resumeCountRef.current) return;
          setDraftRecordingNote('Could not load the voice recording this draft uses. Reload the page to try again.');
        });
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
    resumeCountRef.current += 1;
    chooseRecordedNarration(null);
    api.listMyVideoProjects(RECENT_PROJECTS_TO_LOAD).then(setPastProjects).catch(() => undefined);
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
   * the narration length (capped at MAX_SCENE_TOTAL_SECONDS,
   * since the video can never exceed that) - fixes the "narration gets cut
   * off" case where the total scene length was left shorter than the
   * script. Never scales down; if scenes already cover the narration,
   * this is a no-op. */
  const handleFitScenesToNarration = () => {
    if (scenes.length === 0 || sceneRawEstimatedSeconds <= 0) return;
    const target = Math.min(narrationSeconds, MAX_SCENE_TOTAL_SECONDS);
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

      if (recordedNarration) {
        globalAudioUrl = recordedNarration.url;
      } else if (narrationText.trim()) {
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
        aspectRatio: stylePreset.aspectRatio === '9:16' ? '9:16' : '16:9', // the two shapes Veo makes
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
            : 'We lost connection while making your video. It may still be rendering - check your Gallery in a minute before trying again, so you are not charged twice.',
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
    if (!finalVideoUrl || !templateTitle.trim() || !user?.organizationId || !user?.workspaceId) {
      // Say why instead of doing nothing, so a save that never starts is not mistaken for one that worked.
      setSaveTemplateError(
        !templateTitle.trim()
          ? 'Give the template a name first.'
          : !user?.organizationId || !user?.workspaceId
            ? 'Your account has no active workspace yet. Please sign out and in again.'
            : 'There is no finished video to save yet.',
      );
      setSaveTemplateStatus('error');
      return;
    }

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
      setSaveTemplateError(null);
    } catch (err) {
      setSaveTemplateError(
        err instanceof api.ApiError && err.status === 413
          ? 'This video is too large to save as a template (the limit is 25 MB). Try a shorter video.'
          : err instanceof api.ApiError
            ? err.message
            : 'Could not reach the Lumora API.',
      );
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

  return {
    applyOverlayAndFinish,
    brokenGalleryAssetIds,
    chooseRecordedNarration,
    clampedPreviewSceneIndex,
    compositeProgress,
    creditRates,
    cropEditingSceneId,
    deletingGalleryAssetId,
    displayAspectRatio,
    draftDeleteError,
    draftRecordingNote,
    draftTitle,
    draftToDelete,
    dragOverSceneId,
    draggedSceneId,
    error,
    fileInputRef,
    finalMimeType,
    finalVideoUrl,
    finishWithoutOverlay,
    galleryPickerAssets,
    galleryUsage,
    handleAddSelectedFromGallery,
    handleBackToScenes,
    handleDeleteDraft,
    handleDeleteGalleryAsset,
    handleDownload,
    handleFileSelected,
    handleFitScenesToNarration,
    handleGalleryAssetLoadError,
    handleGenerateFromPrompt,
    handleGenerateNarration,
    handleGenerateSceneVideo,
    handleImprovePrompt,
    handleMoveScene,
    handleOpenGalleryPicker,
    handleOpenSaveTemplatePanel,
    handleOverlayPointerDown,
    handleOverlayPointerMove,
    handleOverlayPointerUp,
    handlePickStockTemplate,
    handlePickVideoTemplate,
    handlePreviewSceneVideo,
    handlePreviewVoice,
    handleRemoveScene,
    handleResizePointerDown,
    handleResizePointerMove,
    handleResizePointerUp,
    handleResumeProject,
    handleSaveTemplate,
    handleSaveToGallery,
    handleSceneDragEnd,
    handleSceneDrop,
    handleSceneDurationChange,
    handleSceneFilterChange,
    handleSceneFitToggle,
    handleSceneFocalDrag,
    handleSceneMotionToggle,
    handleScenesFileUpload,
    handleShare,
    handleShareToFacebook,
    handleToggleGallerySelect,
    hasOverlay,
    improveError,
    isDownloading,
    isDraggingOverlay,
    isEditingOverlayText,
    isGalleryPickerOpen,
    isGeneratingNarration,
    isImprovingPrompt,
    isLoadingGalleryPicker,
    isPreviewingVideo,
    isResizingOverlay,
    isSavingTemplate,
    isSavingToGallery,
    isUploadingScenes,
    myRecordings,
    narrationFitsCap,
    narrationGender,
    narrationLanguage,
    narrationSeconds,
    narrationText,
    narrationVoiceId,
    narrationWillBeTrimmed,
    narrationWordCount,
    onNavigate,
    outOfCredits,
    overlayColor,
    overlayFontFamilyId,
    overlayFontScale,
    overlayPoint,
    overlayPreviewFontSizePx,
    overlayPreviewRef,
    overlayText,
    pastProjects,
    previewAspectClass,
    previewScene,
    previewVideoUrl,
    previewingVoiceId,
    progressLabel,
    prompt,
    provider,
    recordedNarration,
    recordedNarrationOptionId,
    recordedNarrationSeconds,
    resetAll,
    reusedClip,
    saveTemplateError,
    saveTemplateStatus,
    savedToGallery,
    sceneAspectRatio,
    sceneCappedEstimatedSeconds,
    sceneEstimateExceedsMax,
    sceneRawEstimatedSeconds,
    sceneSaveAsTemplate,
    sceneTransition,
    sceneWarning,
    scenes,
    selectedFontFamily,
    selectedGalleryIds,
    setCropEditingSceneId,
    setDraftTitle,
    setDraftToDelete,
    setDragOverSceneId,
    setDraggedSceneId,
    setImproveError,
    setIsEditingOverlayText,
    setIsGalleryPickerOpen,
    setNarrationGender,
    setNarrationLanguage,
    setNarrationText,
    setNarrationVoiceId,
    setOverlayColor,
    setOverlayFontFamilyId,
    setOverlayFontScale,
    setOverlayPoint,
    setOverlayText,
    setPreviewSceneIndex,
    setPreviewVideoUrl,
    setPrompt,
    setProvider,
    setSceneAspectRatio,
    setSceneSaveAsTemplate,
    setSceneTransition,
    setShowAdvanced,
    setShowAllDrafts,
    setShowSaveTemplatePanel,
    setSource,
    setSourceVideoNaturalAspect,
    setStylePresetId,
    setTemplateCategory,
    setTemplateTitle,
    setTemplateVisibility,
    shareStatus,
    showAdvanced,
    showAllDrafts,
    showSaveTemplatePanel,
    source,
    sourceVideoNaturalAspect,
    sourceVideoUrl,
    step,
    stylePreset,
    stylePresetId,
    templateCategory,
    templateTitle,
    templateVisibility,
    templatesError,
    videoProjectId,
    videoTemplates,
  };
}

export type VideoStudio = ReturnType<typeof useVideoStudio>;
