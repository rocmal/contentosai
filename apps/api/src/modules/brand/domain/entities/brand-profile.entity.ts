import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';

export interface BrandSocialAccount {
  platform: string;
  handle: string;
  connected: boolean;
}

export interface BrandProfile extends BaseTenantEntity {
  name: string;
  industry: string | null;
  tagline: string | null;
  toneOfVoice: string[] | null;
  brandColors: string[] | null;
  logoUrl: string | null;
  guidelines: string | null;
  websiteUrl: string | null;
  primaryFont: string | null;
  productsAndServices: string[] | null;
  mission: string | null;
  vision: string | null;
  primaryCTA: string | null;
  targetAudience: string | null;
  competitors: string[] | null;
  keywords: string[] | null;
  socialAccounts: BrandSocialAccount[] | null;
}
