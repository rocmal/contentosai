import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { BrandProfile } from '../entities/brand-profile.entity';

export interface CreateBrandProfileData {
  organizationId: string;
  workspaceId: string;
  name: string;
  industry?: string | null;
  toneOfVoice?: string | null;
  brandColors?: string[] | null;
  logoUrl?: string | null;
  guidelines?: string | null;
}

export type UpdateBrandProfileData = Partial<
  Omit<CreateBrandProfileData, 'organizationId' | 'workspaceId'>
>;

export const BRAND_PROFILES_REPOSITORY = Symbol('BRAND_PROFILES_REPOSITORY');

export interface IBrandProfilesRepository extends IBaseRepository<
  BrandProfile,
  CreateBrandProfileData,
  UpdateBrandProfileData
> {
  listByWorkspace(workspaceId: string): Promise<BrandProfile[]>;
}
