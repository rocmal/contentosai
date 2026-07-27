import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { OrganizationMember } from '../entities/organization-member.entity';

export interface CreateOrganizationMemberData {
  organizationId: string;
  userId: string;
  roleId: string;
}

export type UpdateOrganizationMemberData = Partial<Pick<CreateOrganizationMemberData, 'roleId'>>;

export const ORGANIZATION_MEMBERS_REPOSITORY = Symbol('ORGANIZATION_MEMBERS_REPOSITORY');

export interface IOrganizationMembersRepository extends IBaseRepository<
  OrganizationMember,
  CreateOrganizationMemberData,
  UpdateOrganizationMemberData
> {
  findMembership(organizationId: string, userId: string): Promise<OrganizationMember | null>;
  listByOrganization(organizationId: string): Promise<OrganizationMember[]>;
  listByUser(userId: string): Promise<OrganizationMember[]>;
}
