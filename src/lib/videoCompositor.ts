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
}

const DEFAULT_IMAGE_DURATION_SECONDS = 4;
const OUTPUT_WIDTH = 1280;
const OUTPUT_HEIGHT = 720;

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

/** Draws a frame "cover"-fit (crop-to-fill) into the fixed output canvas -
 * scenes can mix differently-shaped clips/images without letterboxing. */
function drawSceneFrame(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
): void {
  const canvasRatio = OUTPUT_WIDTH / OUTPUT_HEIGHT;
  const sourceRatio = sourceWidth / sourceHeight || canvasRatio;

  let drawWidth = OUTPUT_WIDTH;
  let drawHeight = OUTPUT_HEIGHT;
  if (sourceRatio > canvasRatio) {
    drawHeight = OUTPUT_HEIGHT;
    drawWidth = OUTPUT_HEIGHT * sourceRatio;
  } else {
    drawWidth = OUTPUT_WIDTH;
    drawHeight = OUTPUT_WIDTH / sourceRatio;
  }

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  ctx.drawImage(source, (OUTPUT_WIDTH - drawWidth) / 2, (OUTPUT_HEIGHT - drawHeight) / 2, drawWidth, drawHeight);
}

export async function compositeScenes(
  scenes: SceneInput[],
  onProgress?: (fraction: number) => void,
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
    for (const scene of scenes) {
      const visual =
        scene.visualType === 'video' ? await loadSceneVideo(scene.visualUrl) : await loadSceneImage(scene.visualUrl);
      loadedVisuals.push(visual);

      const audioBuffer = scene.voiceoverAudioUrl
        ? await decodeSceneAudio(scene.voiceoverAudioUrl, audioContext)
        : scene.visualType === 'video'
          ? await decodeSceneAudio(scene.visualUrl, audioContext)
          : null;
      audioBuffers.push(audioBuffer);

      const naturalDuration =
        visual instanceof HTMLVideoElement ? visual.duration : scene.imageDurationSeconds ?? DEFAULT_IMAGE_DURATION_SECONDS;
      durations.push(Math.max(audioBuffer?.duration ?? naturalDuration, 0.5));
    }

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

    return await new Promise<CompositeResult>((resolve, reject) => {
      recorder.onerror = () => reject(new Error('Recording the composited video failed.'));
      recorder.onstop = () => {
        onProgress?.(1);
        resolve({ blob: new Blob(chunks, { type: mimeType }), mimeType });
      };

      recorder.start();
      const recordingStartTime = audioContext.currentTime;

      // Schedule every scene's audio up front at its absolute offset -
      // decoupled entirely from the visual draw loop below, which just has
      // to stay paced with real elapsed time to remain in sync.
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

      let sceneIndex = 0;
      let sceneStartedAt = performance.now();
      const firstVisual = loadedVisuals[0];
      if (firstVisual instanceof HTMLVideoElement) {
        firstVisual.currentTime = 0;
        firstVisual.play().catch(() => undefined);
      }

      const drawFrame = () => {
        const elapsedInScene = (performance.now() - sceneStartedAt) / 1000;

        if (elapsedInScene >= durations[sceneIndex]) {
          const finishedVisual = loadedVisuals[sceneIndex];
          if (finishedVisual instanceof HTMLVideoElement) finishedVisual.pause();
          sceneIndex += 1;

          if (sceneIndex >= scenes.length) {
            recorder.stop();
            return;
          }

          sceneStartedAt = performance.now();
          const nextVisual = loadedVisuals[sceneIndex];
          if (nextVisual instanceof HTMLVideoElement) {
            nextVisual.currentTime = 0;
            nextVisual.play().catch(() => undefined);
          }
        }

        const visual = loadedVisuals[sceneIndex];
        if (visual instanceof HTMLVideoElement) {
          drawSceneFrame(ctx, visual, visual.videoWidth, visual.videoHeight);
        } else {
          drawSceneFrame(ctx, visual, visual.naturalWidth, visual.naturalHeight);
        }

        const elapsedBeforeScene = durations.slice(0, sceneIndex).reduce((sum, d) => sum + d, 0);
        const elapsedTotal =
          elapsedBeforeScene + Math.min((performance.now() - sceneStartedAt) / 1000, durations[sceneIndex]);
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
