import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';

export interface BrandSocialAccount {
  platform: string;
  handle: string;
  connected: boolean;
}

/** The individual advisor/agent a brand's content is published on behalf of -
 * regulated industries (e.g. insurance) require these details on advertising. */
export interface BrandAdvisorProfile {
  name: string;
  phone: string;
  city: string;
  licenceNumber: string;
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
  advisorProfile: BrandAdvisorProfile | null;
}
