/**
 * Burns a text overlay into a video entirely in the browser: redraws every
 * frame onto a <canvas> with the text painted on top, then re-encodes the
 * canvas (plus the source's original audio track) via MediaRecorder. No
 * backend/ffmpeg dependency - the text ends up as real pixels in the
 * exported file, not just a UI overlay that disappears on download.
 *
 * Constraint: the source video must be same-origin, a blob:/object URL
 * (uploads, already-fetched generated videos), or served with a permissive
 * `Access-Control-Allow-Origin` header - otherwise the canvas is "tainted"
 * and the browser blocks capturing it for security reasons.
 */

export interface TextOverlayOptions {
  text: string;
  /** Center of the text, as a 0-100 percentage of the video's width/height -
   * lets the text be dragged to any freeform spot, not just fixed presets. */
  xPct: number;
  yPct: number;
  /** Full CSS font stack, e.g. '"Segoe UI", Arial, sans-serif'. Defaults to
   * the same sans-serif stack used before this option existed. */
  fontFamily?: string;
  /** Canvas width is divided by this to get the pixel font size - smaller
   * values draw bigger text. Defaults to 16 (the original fixed size). */
  fontSizeScale?: number;
  /** Any valid CSS color for the text fill. Defaults to white. */
  color?: string;
}

export interface CompositeResult {
  blob: Blob;
  mimeType: string;
}

// HTMLVideoElement.captureStream is a real, widely-supported browser API
// (used to pull the source's audio track into the recording) but isn't part
// of TypeScript's lib.dom.d.ts, unlike HTMLCanvasElement.captureStream which
// already is.
interface CaptureCapableVideo extends HTMLVideoElement {
  captureStream?: () => MediaStream;
}

function pickSupportedMimeType(): string {
  const candidates = [
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  for (const candidate of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return 'video/webm';
}

function drawTextOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  overlay: TextOverlayOptions,
): void {
  const text = overlay.text.trim();
  if (!text) return;

  const fontSize = Math.max(18, Math.round(width / (overlay.fontSizeScale ?? 16)));
  const fontFamily = overlay.fontFamily ?? '"Segoe UI", Arial, sans-serif';
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const x = (overlay.xPct / 100) * width;
  const y = (overlay.yPct / 100) * height;

  const paddingX = fontSize * 0.7;
  const paddingY = fontSize * 0.45;
  const textWidth = ctx.measureText(text).width;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(
    x - textWidth / 2 - paddingX,
    y - fontSize / 2 - paddingY,
    textWidth + paddingX * 2,
    fontSize + paddingY * 2,
  );

  ctx.fillStyle = overlay.color ?? '#ffffff';
  ctx.fillText(text, x, y);
}

export async function compositeTextOntoVideo(
  sourceUrl: string,
  overlay: TextOverlayOptions,
  onProgress?: (fraction: number) => void,
): Promise<CompositeResult> {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('This browser does not support recording video (MediaRecorder is unavailable).');
  }

  const video: CaptureCapableVideo = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.muted = false;
  video.playsInline = true;
  video.style.position = 'fixed';
  video.style.left = '-9999px';
  video.style.top = '-9999px';
  video.src = sourceUrl;
  document.body.appendChild(video);

  const cleanup = () => video.remove();

  try {
    await new Promise<void>((resolve, reject) => {
      video.addEventListener('loadedmetadata', () => resolve(), { once: true });
      video.addEventListener(
        'error',
        () => reject(new Error('Could not load the source video (check it allows cross-origin access).')),
        { once: true },
      );
    });

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D rendering is not supported in this browser.');
    }
    if (typeof canvas.captureStream !== 'function') {
      throw new Error('This browser does not support exporting a canvas as video.');
    }

    const outputStream = canvas.captureStream(30);
    try {
      const audioTrack = video.captureStream?.().getAudioTracks()[0];
      if (audioTrack) outputStream.addTrack(audioTrack);
    } catch {
      // Proceed video-only rather than failing the whole export over audio.
    }

    const mimeType = pickSupportedMimeType();
    const recorder = new MediaRecorder(outputStream, { mimeType });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    let rafHandle = 0;
    const drawFrame = () => {
      if (video.paused || video.ended) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      drawTextOverlay(ctx, canvas.width, canvas.height, overlay);
      if (video.duration) {
        onProgress?.(Math.min(1, video.currentTime / video.duration));
      }
      rafHandle = requestAnimationFrame(drawFrame);
    };

    return await new Promise<CompositeResult>((resolve, reject) => {
      recorder.onerror = () => reject(new Error('Recording the composited video failed.'));
      recorder.onstop = () => {
        cancelAnimationFrame(rafHandle);
        onProgress?.(1);
        resolve({ blob: new Blob(chunks, { type: mimeType }), mimeType });
      };

      video.addEventListener(
        'ended',
        () => {
          if (recorder.state !== 'inactive') recorder.stop();
        },
        { once: true },
      );

      video.addEventListener(
        'play',
        () => {
          recorder.start();
          drawFrame();
        },
        { once: true },
      );

      video.play().catch((err) => reject(err instanceof Error ? err : new Error('Could not play the source video.')));
    });
  } finally {
    cleanup();
  }
}

// ---------------------------------------------------------------------------
// Multi-scene composer: strings several scenes (each a video clip or a still
// image, optionally narrated by a generated voiceover) into one continuous
// video - real client-side compositing, same MediaRecorder/canvas approach
// as compositeTextOntoVideo above, just driven by a timeline of scenes
// instead of a single clip + text overlay.
// ---------------------------------------------------------------------------

export type SceneFilterPreset = 'none' | 'bw' | 'sepia' | 'vivid' | 'warm' | 'cool' | 'fade';
export type SceneMotion = 'none' | 'kenburns';
export type SceneTransitionType = 'none' | 'fade' | 'slide';
export type OutputAspectRatio = '16:9' | '9:16' | '1:1';

export interface SceneInput {
  visualUrl: string;
  visualType: 'video' | 'image';
  /** Only used for image scenes with no voiceover - how long to hold the
   * still frame. */
  imageDurationSeconds?: number;
  /** Object/blob URL of TTS audio for this scene (see Voice Studio's
   * generateSpeech) - when present, this replaces the clip's own audio and
   * the scene's duration is trimmed/extended to match the narration. */
  voiceoverAudioUrl?: string | null;
  /** Explicit duration for this scene, in seconds - takes priority over
   * imageDurationSeconds and the clip's natural/audio-driven length. Video
   * clips longer than this are trimmed (the draw loop advances to the next
   * scene once elapsed >= duration regardless of whether the clip itself
   * ended); clips shorter than this just hold their last frame, which
   * drawImage already does on a paused/ended video for free. Used by Scene
   * Builder's per-slide duration controls. */
  durationSeconds?: number;
  /** 0-100 focal point of the crop-to-fill frame; 50/50 (default) keeps the
   * source centered. Mirrors CSS object-position semantics so the same
   * numbers drive both the live UI preview (via object-position) and the
   * exported pixels here. */
  focalXPct?: number;
  focalYPct?: number;
  /** Baked into the recorded pixels via canvas `filter`, not just a UI
   * overlay that disappears on export. */
  filter?: SceneFilterPreset;
  /** Image scenes only - a slow pan/zoom instead of a static hold. */
  motion?: SceneMotion;
}

const DEFAULT_IMAGE_DURATION_SECONDS = 4;
const TRANSITION_SECONDS = 0.6;

const ASPECT_RATIO_DIMENSIONS: Record<OutputAspectRatio, { width: number; height: number }> = {
  '16:9': { width: 1280, height: 720 },
  '9:16': { width: 720, height: 1280 },
  '1:1': { width: 720, height: 720 },
};

const FILTER_CSS: Record<SceneFilterPreset, string> = {
  none: 'none',
  bw: 'grayscale(1) contrast(1.05)',
  sepia: 'sepia(0.75) contrast(1.05)',
  vivid: 'saturate(1.5) contrast(1.1)',
  warm: 'sepia(0.25) saturate(1.25) brightness(1.03)',
  cool: 'saturate(1.15) hue-rotate(-8deg) brightness(1.02)',
  fade: 'contrast(0.85) brightness(1.08) saturate(0.85)',
};

/** Loads just enough of an audio URL to read its duration - used to turn a
 * freshly-generated narration clip's length into the video's total length. */
export function loadAudioDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => resolve(audio.duration), { once: true });
    audio.addEventListener(
      'error',
      () => reject(new Error('Could not read narration audio duration.')),
      { once: true },
    );
    audio.src = url;
  });
}

async function loadSceneVideo(url: string): Promise<HTMLVideoElement> {
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.playsInline = true;
  video.style.position = 'fixed';
  video.style.left = '-9999px';
  video.style.top = '-9999px';
  video.src = url;
  document.body.appendChild(video);

  await new Promise<void>((resolve, reject) => {
    video.addEventListener('loadedmetadata', () => resolve(), { once: true });
    video.addEventListener('error', () => reject(new Error('Could not load a scene video clip.')), { once: true });
  });
  return video;
}

async function loadSceneImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  const loaded = new Promise<void>((resolve, reject) => {
    img.addEventListener('load', () => resolve(), { once: true });
    img.addEventListener('error', () => reject(new Error('Could not load a scene image.')), { once: true });
  });
  img.src = url;
  await loaded;
  return img;
}

/** Best-effort: decodes a URL's audio track into a buffer for precise
 * scheduling. Returns null (silence) rather than throwing when the source
 * has no audio track (common for silent stock clips) or can't be fetched. */
async function decodeSceneAudio(url: string, audioContext: AudioContext): Promise<AudioBuffer | null> {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
  } catch {
    return null;
  }
}

interface DrawSceneFrameOptions {
  focalXPct?: number;
  focalYPct?: number;
  /** >1 zooms in past a plain cover-fit - used by the Ken Burns effect. */
  extraScale?: number;
  filter?: string;
  alpha?: number;
}

/** Computes the cover-fit (crop-to-fill) rect for drawImage, honoring an
 * optional focal point (0-100, 50=centered, same semantics as CSS
 * object-position) and extra zoom scale - scenes can mix differently-shaped
 * clips/images without letterboxing, while still letting the crop be
 * re-aimed instead of always symmetric. */
function computeCoverRect(
  canvasWidth: number,
  canvasHeight: number,
  sourceWidth: number,
  sourceHeight: number,
  focalXPct: number,
  focalYPct: number,
  extraScale: number,
): { dx: number; dy: number; dw: number; dh: number } {
  const canvasRatio = canvasWidth / canvasHeight;
  const sourceRatio = sourceWidth / sourceHeight || canvasRatio;

  let drawWidth = canvasWidth;
  let drawHeight = canvasHeight;
  if (sourceRatio > canvasRatio) {
    drawHeight = canvasHeight;
    drawWidth = canvasHeight * sourceRatio;
  } else {
    drawWidth = canvasWidth;
    drawHeight = canvasWidth / sourceRatio;
  }
  drawWidth *= extraScale;
  drawHeight *= extraScale;

  const maxOffsetX = Math.max(0, drawWidth - canvasWidth);
  const maxOffsetY = Math.max(0, drawHeight - canvasHeight);

  return {
    dx: -((focalXPct / 100) * maxOffsetX),
    dy: -((focalYPct / 100) * maxOffsetY),
    dw: drawWidth,
    dh: drawHeight,
  };
}

/** Draws a frame "cover"-fit (crop-to-fill) into the output canvas - scenes
 * can mix differently-shaped clips/images without letterboxing. */
function drawSceneFrame(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  options?: DrawSceneFrameOptions,
): void {
  const { dx, dy, dw, dh } = computeCoverRect(
    canvasWidth,
    canvasHeight,
    sourceWidth,
    sourceHeight,
    options?.focalXPct ?? 50,
    options?.focalYPct ?? 50,
    options?.extraScale ?? 1,
  );

  ctx.save();
  ctx.globalAlpha = options?.alpha ?? 1;
  ctx.filter = options?.filter ?? 'none';
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.drawImage(source, dx, dy, dw, dh);
  ctx.restore();
}

interface TransitionFrameSource {
  source: CanvasImageSource;
  width: number;
  height: number;
  options?: DrawSceneFrameOptions;
}

/** Draws the tail-end blend between the current scene and the next one -
 * `fade` crossfades both frames in place, `slide` pushes the current frame
 * out while the next slides in from the right. Both purely overlay the
 * existing per-scene duration window (see transitionDurations in
 * compositeScenes) rather than extending it, so audio scheduling is
 * unaffected. */
function drawSceneTransition(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  current: TransitionFrameSource,
  next: TransitionFrameSource,
  t: number,
  type: 'fade' | 'slide',
): void {
  if (type === 'fade') {
    drawSceneFrame(ctx, current.source, current.width, current.height, canvasWidth, canvasHeight, current.options);
    drawSceneFrame(ctx, next.source, next.width, next.height, canvasWidth, canvasHeight, {
      ...next.options,
      alpha: t,
    });
    return;
  }

  ctx.save();
  ctx.translate(-t * canvasWidth, 0);
  drawSceneFrame(ctx, current.source, current.width, current.height, canvasWidth, canvasHeight, current.options);
  ctx.restore();

  ctx.save();
  ctx.translate((1 - t) * canvasWidth, 0);
  drawSceneFrame(ctx, next.source, next.width, next.height, canvasWidth, canvasHeight, next.options);
  ctx.restore();
}

export interface CompositeScenesOptions {
  /** Single narration track for the whole output, decoded and scheduled
   * once at t=0 instead of per-scene audio. Scene clips' own audio is never
   * decoded in this mode (loadSceneVideo already creates them muted, so
   * nothing further is needed to exclude it from the recording). */
  globalAudioUrl?: string | null;
  /** Output frame shape - defaults to 16:9 landscape (1280x720, the
   * original fixed size). 9:16/1:1 exist for Reels/Shorts/TikTok and square
   * feeds. */
  aspectRatio?: OutputAspectRatio;
  /** Blend between consecutive scenes instead of a hard cut. Defaults to
   * 'none'. Duration is fixed (TRANSITION_SECONDS) and auto-capped to half
   * of whichever neighboring scene is shorter, so a transition can never eat
   * a whole short scene. */
  transition?: SceneTransitionType;
}

export async function compositeScenes(
  scenes: SceneInput[],
  onProgress?: (fraction: number) => void,
  options?: CompositeScenesOptions,
): Promise<CompositeResult> {
  if (scenes.length === 0) {
    throw new Error('Add at least one scene first.');
  }
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('This browser does not support recording video (MediaRecorder is unavailable).');
  }

  const audioContext = new AudioContext();
  await audioContext.resume();
  const destination = audioContext.createMediaStreamDestination();

  const loadedVisuals: (HTMLVideoElement | HTMLImageElement)[] = [];
  const audioBuffers: (AudioBuffer | null)[] = [];
  const durations: number[] = [];

  try {
    // Preload every scene up front - scene counts here are small (a
    // handful), so this keeps the record loop below simple and glitch-free
    // rather than loading media mid-recording.
    const useGlobalAudio = options?.globalAudioUrl != null;

    for (const scene of scenes) {
      const visual =
        scene.visualType === 'video' ? await loadSceneVideo(scene.visualUrl) : await loadSceneImage(scene.visualUrl);
      loadedVisuals.push(visual);

      const audioBuffer = useGlobalAudio
        ? null
        : scene.voiceoverAudioUrl
          ? await decodeSceneAudio(scene.voiceoverAudioUrl, audioContext)
          : scene.visualType === 'video'
            ? await decodeSceneAudio(scene.visualUrl, audioContext)
            : null;
      audioBuffers.push(audioBuffer);

      const naturalDuration =
        visual instanceof HTMLVideoElement ? visual.duration : scene.imageDurationSeconds ?? DEFAULT_IMAGE_DURATION_SECONDS;
      durations.push(
        scene.durationSeconds ?? Math.max(audioBuffer?.duration ?? naturalDuration, 0.5),
      );
    }

    // Decoded up front (not after recorder.start()) so it can be scheduled
    // synchronously at the exact recording-start instant - decoding after
    // starting would push the narration's actual start time later by
    // however long the fetch/decode takes, permanently desyncing it from
    // the visuals (AudioBufferSourceNode.start() with a past `when` plays
    // immediately, it does not retroactively catch up).
    const globalAudioBuffer = options?.globalAudioUrl
      ? await decodeSceneAudio(options.globalAudioUrl, audioContext)
      : null;

    const { width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT } = ASPECT_RATIO_DIMENSIONS[options?.aspectRatio ?? '16:9'];
    const transitionType = options?.transition ?? 'none';

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D rendering is not supported in this browser.');
    }
    if (typeof canvas.captureStream !== 'function') {
      throw new Error('This browser does not support exporting a canvas as video.');
    }

    const combinedStream = new MediaStream([
      ...canvas.captureStream(30).getVideoTracks(),
      ...destination.stream.getAudioTracks(),
    ]);
    const mimeType = pickSupportedMimeType();
    const recorder = new MediaRecorder(combinedStream, { mimeType });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    const totalDuration = durations.reduce((sum, d) => sum + d, 0);

    // Capped to half of whichever neighboring scene is shorter, so a
    // transition can never eat a whole short scene.
    const transitionDurations = scenes.map((_, index) =>
      transitionType === 'none' || index >= scenes.length - 1
        ? 0
        : Math.min(TRANSITION_SECONDS, durations[index] / 2, durations[index + 1] / 2),
    );

    const getVisualDims = (index: number): { width: number; height: number } => {
      const visual = loadedVisuals[index];
      return visual instanceof HTMLVideoElement
        ? { width: visual.videoWidth, height: visual.videoHeight }
        : { width: visual.naturalWidth, height: visual.naturalHeight };
    };

    // Ken Burns direction alternates by scene index purely for visual
    // variety across a slideshow, not user-configurable.
    const getSceneDrawOptions = (index: number, progressInScene: number): DrawSceneFrameOptions => {
      const scene = scenes[index];
      let extraScale = 1;
      if (scene.visualType === 'image' && scene.motion === 'kenburns') {
        const zoomIn = index % 2 === 0;
        const startScale = zoomIn ? 1.0 : 1.15;
        const endScale = zoomIn ? 1.15 : 1.0;
        extraScale = startScale + (endScale - startScale) * Math.min(1, progressInScene);
      }
      return {
        focalXPct: scene.focalXPct ?? 50,
        focalYPct: scene.focalYPct ?? 50,
        filter: FILTER_CSS[scene.filter ?? 'none'],
        extraScale,
      };
    };

    return await new Promise<CompositeResult>((resolve, reject) => {
      recorder.onerror = () => reject(new Error('Recording the composited video failed.'));
      recorder.onstop = () => {
        onProgress?.(1);
        resolve({ blob: new Blob(chunks, { type: mimeType }), mimeType });
      };

      recorder.start();
      const recordingStartTime = audioContext.currentTime;

      // Schedule audio decoupled entirely from the visual draw loop below,
      // which just has to stay paced with real elapsed time to remain in
      // sync. Two modes: one narration track spanning the whole output
      // (globalAudioBuffer), or each scene's own audio at its absolute
      // offset. Both buffers were decoded during preload, above, so
      // scheduling here is synchronous - no await between recorder.start()
      // and start(recordingStartTime).
      if (globalAudioBuffer) {
        const bufferSource = audioContext.createBufferSource();
        bufferSource.buffer = globalAudioBuffer;
        bufferSource.connect(destination);
        bufferSource.start(recordingStartTime);
      } else {
        let audioCursor = 0;
        audioBuffers.forEach((buffer, index) => {
          if (buffer) {
            const bufferSource = audioContext.createBufferSource();
            bufferSource.buffer = buffer;
            bufferSource.connect(destination);
            bufferSource.start(recordingStartTime + audioCursor);
          }
          audioCursor += durations[index];
        });
      }

      let sceneIndex = 0;
      let sceneStartedAt = performance.now();
      // Tracks which scene index has had currentTime reset + play() called
      // - lets a scene's video be "primed" early (during the previous
      // scene's transition window) without being reset again when the hard
      // boundary is crossed a moment later.
      let primedIndex = -1;
      const primeVisual = (index: number) => {
        if (index === primedIndex) return;
        const visual = loadedVisuals[index];
        if (visual instanceof HTMLVideoElement) {
          visual.currentTime = 0;
          visual.play().catch(() => undefined);
        }
        primedIndex = index;
      };
      primeVisual(0);

      const drawFrame = () => {
        let elapsedInScene = (performance.now() - sceneStartedAt) / 1000;
        let duration = durations[sceneIndex];
        let hasNext = sceneIndex + 1 < scenes.length;
        let transitionDur = hasNext ? transitionDurations[sceneIndex] : 0;

        if (hasNext && transitionDur > 0 && elapsedInScene >= duration - transitionDur) {
          primeVisual(sceneIndex + 1);
        }

        if (elapsedInScene >= duration) {
          const finishedVisual = loadedVisuals[sceneIndex];
          if (finishedVisual instanceof HTMLVideoElement) finishedVisual.pause();
          sceneIndex += 1;

          if (sceneIndex >= scenes.length) {
            recorder.stop();
            return;
          }

          sceneStartedAt = performance.now();
          primeVisual(sceneIndex);

          elapsedInScene = (performance.now() - sceneStartedAt) / 1000;
          duration = durations[sceneIndex];
          hasNext = sceneIndex + 1 < scenes.length;
          transitionDur = hasNext ? transitionDurations[sceneIndex] : 0;
        }

        const currentDims = getVisualDims(sceneIndex);
        const currentProgress = duration > 0 ? elapsedInScene / duration : 1;
        const currentOptions = getSceneDrawOptions(sceneIndex, currentProgress);

        if (hasNext && transitionDur > 0 && elapsedInScene >= duration - transitionDur) {
          const t = Math.min(1, Math.max(0, (elapsedInScene - (duration - transitionDur)) / transitionDur));
          const nextDims = getVisualDims(sceneIndex + 1);
          const nextOptions = getSceneDrawOptions(sceneIndex + 1, 0);
          drawSceneTransition(
            ctx,
            OUTPUT_WIDTH,
            OUTPUT_HEIGHT,
            { source: loadedVisuals[sceneIndex], width: currentDims.width, height: currentDims.height, options: currentOptions },
            { source: loadedVisuals[sceneIndex + 1], width: nextDims.width, height: nextDims.height, options: nextOptions },
            t,
            transitionType === 'slide' ? 'slide' : 'fade',
          );
        } else {
          drawSceneFrame(
            ctx,
            loadedVisuals[sceneIndex],
            currentDims.width,
            currentDims.height,
            OUTPUT_WIDTH,
            OUTPUT_HEIGHT,
            currentOptions,
          );
        }

        const elapsedBeforeScene = durations.slice(0, sceneIndex).reduce((sum, d) => sum + d, 0);
        const elapsedTotal = elapsedBeforeScene + Math.min(elapsedInScene, duration);
        onProgress?.(Math.min(0.99, elapsedTotal / totalDuration));

        requestAnimationFrame(drawFrame);
      };

      requestAnimationFrame(drawFrame);
    });
  } finally {
    loadedVisuals.forEach((visual) => {
      if (visual instanceof HTMLVideoElement) visual.remove();
    });
  }
}
