import React, { useRef, useState } from 'react';
import { ViewType } from '../../../types';
import * as api from '../../../lib/api';
import { VIDEO_PROMPT_CATEGORIES } from '../../../lib/videoPromptTemplates';
import { takeNarrationAudio, takeReuse } from '../../../lib/reuse';
import { useCreditRates } from '../../../lib/creditCost';
import { compositeScenes, compositeTextOntoVideo, SceneInput } from '../../../lib/videoCompositor';
import { SARVAM_VOICE_BY_GENDER, SARVAM_VOICE_CATALOG } from '../../../lib/sarvamVoices';
import { useAuth } from '../../../contexts/AuthContext';
import {
  AI_STYLE_PRESETS,
  AiStylePreset,
  ASPECT_RATIO_CLASSES,
  ASPECT_RATIO_NUMERIC,
  CreateSource,
  describeSkippedScenes,
  NARRATION_LANGUAGE_CODE,
  PROVIDER_LABELS,
  SELECTABLE_VIDEO_PROVIDERS,
  Step,
  StockTemplate,
} from './constants';
import { useNarration } from './useNarration';
import { useSceneBuilder } from './useSceneBuilder';
import { useShareActions } from './useShareActions';
import { useTextOverlay } from './useTextOverlay';
import { useVideoTemplates } from './useVideoTemplates';

/** All of Video Studio's state and actions. This hook holds the step flow (prompt, upload and template sources,
 * generating, the edit step and the finished video) and combines the area hooks: narration, Scene Builder, text
 * overlay, templates and sharing. VideoStudioView renders the steps; each step component reads what it needs from
 * the result (passed down as `studio`). */
export function useVideoStudio(onNavigate: (view: ViewType) => void) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('create');
  const [source, setSource] = useState<CreateSource>(() => (takeNarrationAudio() ? 'scenes' : 'prompt'));
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
  const [isSavingToGallery, setIsSavingToGallery] = useState(false);
  const [savedToGallery, setSavedToGallery] = useState(false);
  /** The base clip is already in the Gallery (the server saves every generated clip), so finishing it without text
   * must not upload a second copy. */
  const [sourceInGallery, setSourceInGallery] = useState(false);
  const [compositeProgress, setCompositeProgress] = useState(0);

  // The final clip actually shown/downloaded/shared - identical to
  // sourceVideoUrl if no text was added, otherwise the composited result.
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [finalMimeType, setFinalMimeType] = useState('video/mp4');
  const [hasOverlay, setHasOverlay] = useState(false);

  const narration = useNarration({ setError });
  const sceneBuilder = useSceneBuilder({ user, source, setError, narration });
  const overlay = useTextOverlay();
  const templates = useVideoTemplates({
    user,
    source,
    step,
    finalVideoUrl,
    prompt,
    overlayText: overlay.overlayText,
    aspectRatio,
    sceneAspectRatio: sceneBuilder.sceneAspectRatio,
    sceneSaveAsTemplate: sceneBuilder.sceneSaveAsTemplate,
  });
  const share = useShareActions({ finalVideoUrl, finalMimeType, prompt });
  const { narrationGender, narrationLanguage, narrationText, narrationVoiceId, recordedNarration, resetNarration } = narration;
  const {
    getScaledSceneDurations,
    resetScenes,
    sceneAspectRatio,
    sceneTransition,
    scenes,
    setPreviewVideoUrl,
    setSceneWarning,
    videoProjectId,
  } = sceneBuilder;
  const {
    clearOverlayText,
    overlayColor,
    overlayFontScale,
    overlayPoint,
    overlayText,
    resetOverlay,
    selectedFontFamily,
  } = overlay;
  const { resetTemplatePanel } = templates;
  const { setShareStatus } = share;

  const stylePreset = AI_STYLE_PRESETS.find((t) => t.id === stylePresetId) ?? AI_STYLE_PRESETS[0];

  // The "create" step's side preview only really knows a shape for the
  // prompt tab (from the chosen format) and the Scene Builder tab (from the
  // "Shape" buttons, sceneAspectRatio) - upload/templates just preview at
  // the default 16:9 frame until a real clip is picked.
  const previewAspectRatio: AiStylePreset['aspectRatio'] =
    source === 'prompt' ? stylePreset.aspectRatio : source === 'scenes' ? sceneAspectRatio : '16:9';
  const previewAspectClass = ASPECT_RATIO_CLASSES[previewAspectRatio].split(' ')[0];

  // Before a clip exists, the preview box shape is just a best guess from
  // whatever was picked (sceneAspectRatio for Scene Builder, aspectRatio for
  // prompt/upload/template). Once a real <video> loads (edit/result steps),
  // its measured natural aspect takes over as authoritative - the canvas
  // compositor always exports at the clip's true resolution, so this keeps
  // dragged text landing in the right spot on export for both paths.
  const displayAspectRatio =
    sourceVideoNaturalAspect ??
    (source === 'scenes' ? ASPECT_RATIO_NUMERIC[sceneAspectRatio] : ASPECT_RATIO_NUMERIC[aspectRatio]);

  const resetAll = () => {
    setStep('create');
    setError(null);
    setSourceVideoUrl(null);
    setSourceInGallery(false);
    setSourceVideoNaturalAspect(null);
    resetOverlay();
    setFinalVideoUrl(null);
    setHasOverlay(false);
    setShareStatus('idle');
    resetScenes();
    resetNarration();
    resetTemplatePanel();
    setSavedToGallery(false);
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
    setSourceInGallery(false);
    setSourceVideoNaturalAspect(null);
    clearOverlayText();
    setHasOverlay(false);
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
      setSourceInGallery(false);
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
        setSourceInGallery(Boolean(final.savedToGallery));
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
    setSourceInGallery(false);
    setStep('edit');
  };

  const handlePickStockTemplate = (t: StockTemplate) => {
    setError(null);
    setAspectRatio(t.aspectRatio);
    setSourceVideoNaturalAspect(null);
    setSourceVideoUrl(t.url);
    setSourceInGallery(false);
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
    setSourceInGallery(false);
    setStep('edit');
  };

  const finishWithoutOverlay = () => {
    if (!sourceVideoUrl) return;
    setFinalVideoUrl(sourceVideoUrl);
    setFinalMimeType('video/mp4');
    setHasOverlay(false);
    setSavedToGallery(sourceInGallery);
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
      setSavedToGallery(false); // a new file with the text burned in
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

  return {
    ...narration,
    ...sceneBuilder,
    ...overlay,
    ...templates,
    ...share,
    applyOverlayAndFinish,
    compositeProgress,
    creditRates,
    displayAspectRatio,
    error,
    fileInputRef,
    finalMimeType,
    finalVideoUrl,
    finishWithoutOverlay,
    handleBackToScenes,
    handleFileSelected,
    handleGenerateFromPrompt,
    handleGenerateSceneVideo,
    handleImprovePrompt,
    handlePickStockTemplate,
    handlePickVideoTemplate,
    handleSaveToGallery,
    hasOverlay,
    improveError,
    isImprovingPrompt,
    isSavingToGallery,
    onNavigate,
    outOfCredits,
    previewAspectClass,
    progressLabel,
    prompt,
    provider,
    resetAll,
    reusedClip,
    savedToGallery,
    setImproveError,
    setPrompt,
    setProvider,
    setShowAdvanced,
    setSource,
    setSourceVideoNaturalAspect,
    setStylePresetId,
    setTemplateCategory,
    showAdvanced,
    source,
    sourceVideoNaturalAspect,
    sourceVideoUrl,
    step,
    stylePreset,
    stylePresetId,
    templateCategory,
  };
}

export type VideoStudio = ReturnType<typeof useVideoStudio>;
