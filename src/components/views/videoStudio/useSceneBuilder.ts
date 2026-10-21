import React, { useEffect, useRef, useState } from 'react';
import * as api from '../../../lib/api';
import {
  compositeScenes,
  OutputAspectRatio,
  SceneFilterPreset,
  SceneInput,
  SceneMotion,
  SceneTransitionType,
} from '../../../lib/videoCompositor';
import { SARVAM_VOICE_BY_GENDER, SARVAM_VOICE_CATALOG, sarvamVoiceSampleUrl } from '../../../lib/sarvamVoices';
import {
  CreateSource,
  DEFAULT_SCENE_SECONDS,
  describeSkippedScenes,
  MAX_SCENE_TOTAL_SECONDS,
  RECENT_PROJECTS_TO_LOAD,
  SceneFit,
  StudioScene,
} from './constants';
import type { Narration } from './useNarration';

type SetError = (message: string | null) => void;

/** Scene Builder: the scenes and their settings, the Gallery picker, and the saved draft (created and auto-saved). */
export function useSceneBuilder({ user, source, setError, narration }: { user: api.AuthUser | null; source: CreateSource; setError: SetError; narration: Narration }) {
  const {
    narrationGender,
    narrationLanguage,
    narrationSeconds,
    narrationText,
    narrationVoiceId,
    narrationWordCount,
    pendingRecordingId,
    recordedNarration,
    restoreNarration,
  } = narration;
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
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Free "does this flow/pace well?" preview - uses the local voice sample
  // instead of real narration, so it never calls the paid Sarvam API (unlike
  // Generate Video, which reserves credits for the actual narration text).
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [isPreviewingVideo, setIsPreviewingVideo] = useState(false);

  // Each scene has its own duration (see StudioScene.durationSeconds) - the
  // video's total length is just their sum, scaled down proportionally if
  // it would exceed MAX_SCENE_TOTAL_SECONDS (see getScaledSceneDurations).
  // Narration (if any) still plays under the result regardless of how it
  // compares to this total - it may run short or get cut off.
  const sceneRawEstimatedSeconds = scenes.reduce((sum, s) => sum + s.durationSeconds, 0);
  const sceneCappedEstimatedSeconds = Math.max(1, Math.min(sceneRawEstimatedSeconds, MAX_SCENE_TOTAL_SECONDS));
  const sceneEstimateExceedsMax = sceneRawEstimatedSeconds > MAX_SCENE_TOTAL_SECONDS;
  const sceneDurationScale = sceneRawEstimatedSeconds > 0 ? sceneCappedEstimatedSeconds / sceneRawEstimatedSeconds : 1;
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
    restoreNarration(project);
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
        // Generate Video is charged; the free preview is marked so it cannot stand in for it.
        watermark: 'PREVIEW',
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

  useEffect(() => {
    api.getGalleryUsage().then(setGalleryUsage).catch(() => undefined);
    api.listMyVideoProjects(RECENT_PROJECTS_TO_LOAD).then(setPastProjects).catch(() => undefined);
  }, []);

  /** "Start over": an empty Scene Builder and a fresh drafts list. */
  const resetScenes = () => {
    setScenes([]);
    setPreviewSceneIndex(0);
    setSceneAspectRatio('16:9');
    setSceneTransition('none');
    setCropEditingSceneId(null);
    setIsGalleryPickerOpen(false);
    setSelectedGalleryIds(new Set());
    setBrokenGalleryAssetIds(new Set());
    setSceneWarning(null);
    setPreviewVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setDraggedSceneId(null);
    setDragOverSceneId(null);
    setVideoProjectId(null);
    setDraftTitle('');
    setSceneSaveAsTemplate(false);
    api.listMyVideoProjects(RECENT_PROJECTS_TO_LOAD).then(setPastProjects).catch(() => undefined);
  };

  return {
    brokenGalleryAssetIds,
    clampedPreviewSceneIndex,
    cropEditingSceneId,
    deletingGalleryAssetId,
    draftDeleteError,
    draftTitle,
    draftToDelete,
    dragOverSceneId,
    draggedSceneId,
    galleryPickerAssets,
    galleryUsage,
    getScaledSceneDurations,
    handleAddSelectedFromGallery,
    handleDeleteDraft,
    handleDeleteGalleryAsset,
    handleFitScenesToNarration,
    handleGalleryAssetLoadError,
    handleMoveScene,
    handleOpenGalleryPicker,
    handlePreviewSceneVideo,
    handleRemoveScene,
    handleResumeProject,
    handleSceneDragEnd,
    handleSceneDrop,
    handleSceneDurationChange,
    handleSceneFilterChange,
    handleSceneFitToggle,
    handleSceneFocalDrag,
    handleSceneMotionToggle,
    handleScenesFileUpload,
    handleToggleGallerySelect,
    isGalleryPickerOpen,
    isLoadingGalleryPicker,
    isPreviewingVideo,
    isUploadingScenes,
    narrationWillBeTrimmed,
    pastProjects,
    previewScene,
    previewVideoUrl,
    resetScenes,
    sceneAspectRatio,
    sceneCappedEstimatedSeconds,
    sceneEstimateExceedsMax,
    sceneRawEstimatedSeconds,
    sceneSaveAsTemplate,
    sceneTransition,
    sceneWarning,
    scenes,
    selectedGalleryIds,
    setCropEditingSceneId,
    setDraftTitle,
    setDraftToDelete,
    setDragOverSceneId,
    setDraggedSceneId,
    setIsGalleryPickerOpen,
    setPreviewSceneIndex,
    setPreviewVideoUrl,
    setSceneAspectRatio,
    setSceneSaveAsTemplate,
    setSceneTransition,
    setSceneWarning,
    setShowAllDrafts,
    showAllDrafts,
    videoProjectId,
  };
}

export type SceneBuilder = ReturnType<typeof useSceneBuilder>;
