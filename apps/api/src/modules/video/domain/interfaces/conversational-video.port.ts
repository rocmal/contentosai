/**
 * Second video port (Interface Segregation Principle).
 *
 * `IVideoProvider` models fire-and-poll job vendors (fal, Runway, Kling):
 * submit a job, receive a job id, poll it. Conversational providers - today
 * Gemini Omni Flash via the Interactions API - are turn-based: each call
 * returns a video directly, and any turn may be refined by referencing the
 * previous turn's id. Forcing that shape into the job/poll port would mean
 * fabricating job identifiers and a fake polling loop, so it gets its own
 * contract instead.
 */

export enum VideoTurnStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum VideoTask {
  TEXT_TO_VIDEO = 'text_to_video',
  IMAGE_TO_VIDEO = 'image_to_video',
  REFERENCE_TO_VIDEO = 'reference_to_video',
  EDIT = 'edit',
}

export enum VideoAspectRatio {
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16',
}

/** Vendor caps the inline response payload; larger outputs need URI delivery. */
export enum VideoDelivery {
  INLINE = 'inline',
  URI = 'uri',
}

export type VideoPayload =
  | { readonly kind: VideoDelivery.INLINE; readonly base64: string; readonly mimeType: string }
  | { readonly kind: VideoDelivery.URI; readonly uri: string; readonly mimeType: string };

export interface ReferenceImage {
  /** Base64-encoded image bytes, with no data-URI prefix. */
  readonly data: string;
  readonly mimeType: string;
  /** True binds the image to <FIRST_FRAME>; false binds it to <IMAGE_REF_n>. */
  readonly isFirstFrame: boolean;
}

export interface ConversationalVideoRequest {
  readonly prompt: string;
  readonly task: VideoTask;
  readonly aspectRatio: VideoAspectRatio;
  readonly referenceImages: readonly ReferenceImage[];
  /**
   * Server-side retention. Must be true for this turn to be usable later as a
   * parent turn; false is cheaper but makes the turn a dead end.
   */
  readonly store: boolean;
  /** Background execution returns immediately; poll with `getTurn`. */
  readonly background: boolean;
  readonly delivery: VideoDelivery;
}

export type RefineOptions = Omit<
  ConversationalVideoRequest,
  'prompt' | 'referenceImages' | 'task'
>;

export interface VideoTurnResult {
  readonly providerTurnId: string;
  readonly parentProviderTurnId: string | null;
  readonly status: VideoTurnStatus;
  /** Null while in progress, and on failure. */
  readonly payload: VideoPayload | null;
  readonly editable: boolean;
  readonly failureReason: string | null;
}

export interface ConversationalVideoCapabilities {
  readonly providerName: string;
  readonly modelId: string;
  readonly maxDurationSeconds: number;
  readonly supportsStatefulEditing: boolean;
  readonly supportsVideoExtension: boolean;
  readonly supportsSystemInstructions: boolean;
  readonly supportsNegativePrompts: boolean;
  readonly supportsProvisionedThroughput: boolean;
  readonly maxInlinePayloadBytes: number;
  readonly aspectRatios: readonly VideoAspectRatio[];
  /** ISO-3166-1 alpha-2 codes where uploading/editing user media is blocked. */
  readonly uploadEditingBlockedRegions: readonly string[];
}

export interface IConversationalVideoProvider {
  readonly name: string;
  capabilities(): ConversationalVideoCapabilities;
  start(request: ConversationalVideoRequest): Promise<VideoTurnResult>;
  refine(
    previousProviderTurnId: string,
    instruction: string,
    options: RefineOptions,
  ): Promise<VideoTurnResult>;
  getTurn(providerTurnId: string): Promise<VideoTurnResult>;
}

export const CONVERSATIONAL_VIDEO_PROVIDER = Symbol('CONVERSATIONAL_VIDEO_PROVIDER');
