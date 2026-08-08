import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';

export enum AvatarCategory {
  BUSINESS = 'business',
  MARKETING = 'marketing',
  EDUCATION = 'education',
  CUSTOM = 'custom',
}

export enum AvatarGender {
  FEMALE = 'female',
  MALE = 'male',
  NON_BINARY = 'non_binary',
  UNKNOWN = 'unknown',
}

export enum AvatarAgeGroup {
  YOUNG_ADULT = 'young_adult',
  ADULT = 'adult',
  MIDDLE_AGED = 'middle_aged',
  SENIOR = 'senior',
  UNKNOWN = 'unknown',
}

export interface Avatar extends BaseTenantEntity {
  userId: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string;
  thumbnailUrl: string | null;
  category: AvatarCategory;
  gender: AvatarGender;
  language: string | null;
  tags: string[];
  voiceId: string | null;
  emotionDefault: string | null;
  ageGroup: AvatarAgeGroup;
  isFavorite: boolean;
  isPublic: boolean;
  isArchived: boolean;
  qualityScore: number | null;
  provider: string;
  providerAvatarId: string | null;
  metadata: Record<string, unknown>;
}

export interface AvatarUsage extends BaseTenantEntity {
  avatarId: string;
  projectId: string | null;
  campaignId: string | null;
  videoId: string | null;
  lastUsed: Date;
  usageCount: number;
}
