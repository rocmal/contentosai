import { FindAllOptions, IBaseRepository, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { Avatar, AvatarUsage } from '../entities/avatar.entity';

export const AVATARS_REPOSITORY = Symbol('AVATARS_REPOSITORY');
export const AVATAR_USAGE_REPOSITORY = Symbol('AVATAR_USAGE_REPOSITORY');

export type CreateAvatarData = Omit<
  Avatar,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'createdBy' | 'updatedBy' | 'version'
>;

export type UpdateAvatarData = Partial<CreateAvatarData>;

export type CreateAvatarUsageData = Omit<
  AvatarUsage,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'createdBy' | 'updatedBy' | 'version'
>;

export type UpdateAvatarUsageData = Partial<CreateAvatarUsageData>;

export interface AvatarFindOptions extends FindAllOptions {
  search?: string;
  category?: string;
  favorite?: boolean;
  archived?: boolean;
  recentlyUsed?: boolean;
}

export interface IAvatarsRepository extends IBaseRepository<Avatar, CreateAvatarData, UpdateAvatarData> {
  findLibrary(options: AvatarFindOptions): Promise<PaginatedResult<Avatar>>;
  findCategories(workspaceId: string): Promise<string[]>;
}

export interface IAvatarUsageRepository
  extends IBaseRepository<AvatarUsage, CreateAvatarUsageData, UpdateAvatarUsageData> {
  findByAvatarId(avatarId: string): Promise<AvatarUsage | null>;
}
