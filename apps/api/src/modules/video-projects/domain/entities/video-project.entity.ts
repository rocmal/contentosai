import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';

/** Matches the frontend's CreateSource union (VideoStudioView.tsx) exactly,
 * so no translation is needed at the API boundary. Only 'scenes' - the
 * multi-scene Scene Builder flow - is wired to persistence yet: it's the
 * one with genuine multi-step, resumable state worth saving. A single
 * prompt/upload/template generation produces one clip and goes straight to
 * editing, with no "continue later" need today. The other three values are
 * still part of the enum so a project row is never invalid if that changes,
 * without a further migration. */
export enum VideoProjectSource {
  PROMPT = 'prompt',
  UPLOAD = 'upload',
  TEMPLATES = 'templates',
  SCENES = 'scenes',
}

export enum VideoProjectStatus {
  DRAFT = 'draft',
  READY = 'ready',
}

/** Mirrors VideoStudioView.tsx's StudioScene shape field-for-field - this
 * is stored as-is (JSON column) and round-tripped to the editor with no
 * transformation, since scenes are always read/written as a whole array
 * together, never queried individually server-side. */
export interface VideoProjectScene {
  id: string;
  visualUrl: string;
  visualType: 'video' | 'image';
  durationSeconds: number;
  focalXPct: number;
  focalYPct: number;
  filter: string;
  motion: string;
}

export interface VideoProject extends BaseTenantEntity {
  title: string;
  source: VideoProjectSource;
  status: VideoProjectStatus;
  scenes: VideoProjectScene[];
  aspectRatio: string;
  transition: string;
  narrationText: string | null;
  narrationVoiceId: string | null;
  narrationGender: string | null;
  narrationLanguage: string | null;
  /** Set once the person exports and saves the composited result to the
   * gallery (see MediaAssetsController) - null while still a draft. */
  finalAssetId: string | null;
}
