import { BaseTenantEntity } from '@shared/domain/base-tenant.entity';

export interface BrandProfile extends BaseTenantEntity {
  name: string;
  industry: string | null;
  toneOfVoice: string | null;
  brandColors: string[] | null;
  logoUrl: string | null;
  guidelines: string | null;
}
