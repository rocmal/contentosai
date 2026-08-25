import { ReferenceImage } from '../interfaces/conversational-video.port';

/**
 * Compiles a structured scene graph into a single Gemini Omni prompt string.
 *
 * This exists because Omni does not accept system instructions, temperature,
 * or negative prompts - every directive, including Brand Brain context and
 * anything we want suppressed, has to be expressed inside the prompt text.
 * Keeping that flattening in one pure function means the Scene Builder can be
 * tested without touching the network.
 *
 * Output layout:
 *   1. meta directives  (quality/style principles)
 *   2. brand directives (Brand Brain, flattened from what would be a system prompt)
 *   3. shots            (timecoded, or a single continuous-shot instruction)
 *   4. audio direction
 *   5. negatives        (expressed positively as "No X" lines)
 *   6. reference-image role bindings
 */

export interface SceneShot {
  /** Inclusive start second. */
  readonly startSecond: number;
  /** Exclusive end second. Must be greater than `startSecond`. */
  readonly endSecond: number;
  readonly description: string;
  /**
   * Indexes into `SceneGraph.referenceImages`. Each is rendered as
   * <IMAGE_REF_n> inline in the shot description.
   */
  readonly referenceImageIndexes: readonly number[];
}

export interface SceneGraph {
  readonly shots: readonly SceneShot[];
  /** True emits an explicit single-continuous-shot instruction. */
  readonly singleContinuousShot: boolean;
  readonly brandDirectives: readonly string[];
  readonly metaDirectives: readonly string[];
  readonly audioDirection: string | null;
  readonly negatives: readonly string[];
  readonly referenceImages: readonly ReferenceImage[];
}

export class InvalidSceneGraphError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSceneGraphError';
  }
}

const SINGLE_SHOT_DIRECTIVE = 'In a single continuous, unbroken shot. No scene cuts.';

export function compileOmniPrompt(graph: SceneGraph): string {
  assertValidSceneGraph(graph);

  const sections: string[] = [];

  if (graph.metaDirectives.length > 0) {
    sections.push(graph.metaDirectives.join(' '));
  }
  if (graph.brandDirectives.length > 0) {
    sections.push(graph.brandDirectives.join(' '));
  }
  if (graph.singleContinuousShot) {
    sections.push(SINGLE_SHOT_DIRECTIVE);
  }

  sections.push(compileShots(graph));

  if (graph.audioDirection !== null && graph.audioDirection.trim().length > 0) {
    sections.push(graph.audioDirection.trim());
  }
  if (graph.negatives.length > 0) {
    sections.push(graph.negatives.map((negative) => `No ${negative}.`).join(' '));
  }

  const bindings = compileRoleBindings(graph.referenceImages);
  if (bindings !== null) {
    sections.push(bindings);
  }

  return sections.join('\n');
}

function compileShots(graph: SceneGraph): string {
  // A lone shot in a continuous-shot scene reads better without a timecode.
  if (graph.shots.length === 1 && graph.singleContinuousShot) {
    return withReferenceTags(graph.shots[0]);
  }
  return graph.shots
    .map((shot) => `[${shot.startSecond}-${shot.endSecond}s] ${withReferenceTags(shot)}`)
    .join('\n');
}

function withReferenceTags(shot: SceneShot): string {
  const description = shot.description.trim();
  if (shot.referenceImageIndexes.length === 0) {
    return description;
  }
  const tags = shot.referenceImageIndexes.map((index) => `<IMAGE_REF_${index}>`).join(' ');
  return `${description} ${tags}`;
}

function compileRoleBindings(images: readonly ReferenceImage[]): string | null {
  if (images.length === 0) {
    return null;
  }

  const sources: string[] = [];
  const references: string[] = [];
  let referenceIndex = 0;

  images.forEach((image, position) => {
    const imageLabel = `Image${position + 1}`;
    if (image.isFirstFrame) {
      sources.push(`<FIRST_FRAME>@${imageLabel}`);
    } else {
      references.push(`<IMAGE_REF_${referenceIndex}>@${imageLabel}`);
      referenceIndex += 1;
    }
  });

  const declarations: string[] = [];
  if (sources.length > 0) {
    declarations.push(`[# Sources ${sources.join(' ')}]`);
  }
  if (references.length > 0) {
    declarations.push(`[# References ${references.join(' ')}]`);
  }

  const instructions: string[] = [];
  if (sources.length > 0) {
    instructions.push('Use the declared source image as the starting frame.');
  }
  if (references.length > 0) {
    instructions.push(
      'Use the declared reference images as references for video generation. They should not be used as literal initial frames.',
    );
  }

  return `${declarations.join(' ')} ${instructions.join(' ')}`;
}

function assertValidSceneGraph(graph: SceneGraph): void {
  if (graph.shots.length === 0) {
    throw new InvalidSceneGraphError('A scene graph needs at least one shot');
  }

  const firstFrames = graph.referenceImages.filter((image) => image.isFirstFrame);
  if (firstFrames.length > 1) {
    throw new InvalidSceneGraphError('At most one reference image can be the first frame');
  }

  const referenceCount = graph.referenceImages.length - firstFrames.length;

  let previousEnd: number | null = null;
  for (const shot of graph.shots) {
    if (shot.endSecond <= shot.startSecond) {
      throw new InvalidSceneGraphError(
        `Shot ending at ${shot.endSecond}s must end after it starts (${shot.startSecond}s)`,
      );
    }
    if (previousEnd !== null && shot.startSecond < previousEnd) {
      throw new InvalidSceneGraphError(
        `Shot starting at ${shot.startSecond}s overlaps the previous shot ending at ${previousEnd}s`,
      );
    }
    if (shot.description.trim().length === 0) {
      throw new InvalidSceneGraphError('Every shot needs a description');
    }
    for (const index of shot.referenceImageIndexes) {
      if (index < 0 || index >= referenceCount) {
        throw new InvalidSceneGraphError(
          `Shot references <IMAGE_REF_${index}> but only ${referenceCount} reference image(s) were supplied`,
        );
      }
    }
    previousEnd = shot.endSecond;
  }
}

export function sceneGraphDurationSeconds(graph: SceneGraph): number {
  return graph.shots.reduce((max, shot) => Math.max(max, shot.endSecond), 0);
}
