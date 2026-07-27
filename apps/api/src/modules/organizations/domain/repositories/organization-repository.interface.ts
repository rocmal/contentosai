import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { Organization, OrganizationStatus } from '../entities/organization.entity';

export interface CreateOrganizationData {
  name: string;
  slug: string;
  ownerId: string;
  description?: string | null;
  status?: OrganizationStatus;
}

export type UpdateOrganizationData = Partial<Omit<CreateOrganizationData, 'ownerId'>>;

export const ORGANIZATIONS_REPOSITORY = Symbol('ORGANIZATIONS_REPOSITORY');

export interface IOrganizationsRepository extends IBaseRepository<
  Organization,
  CreateOrganizationData,
  UpdateOrganizationData
> {
  findBySlug(slug: string): Promise<Organization | null>;
}
