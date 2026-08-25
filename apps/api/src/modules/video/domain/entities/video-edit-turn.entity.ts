import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';
import { GenerationTier, StylePreset } from '@modules/video-credits/domain/enums/generation.enums';
import {
  VideoDelivery,
  VideoTask,
  VideoTurnStatus,
} from '../interfaces/conversational-video.port';

export interface VideoEditTurn extends BaseTenantEntity {
  sessionId: string;
  /** Null for the root turn of a session. */
  parentTurnId: string | null;
  /** Vendor interaction id, sent as `previous_interaction_id` when refining. */
  providerTurnId: string;
  prompt: string;
  task: VideoTask;
  status: VideoTurnStatus;
  delivery: VideoDelivery;
  /** Vendor-hosted URI. Expires, so it is never returned to clients. */
  sourceUri: string | null;
  /** Set once the video is persisted into our own media gallery. */
  mediaAssetId: string | null;
  /** False when created with store=false; such a turn cannot be refined. */
  editable: boolean;
  failureReason: string | null;
  /** Public tier this turn was priced at. The model that served it is an
   *  implementation detail and is not stored on the turn. */
  tier: GenerationTier;
  style: StylePreset;
  durationSeconds: number;
  /** Credit hold taken before the vendor call; settled on completion or failure. */
  creditReservationId: string | null;
}
