import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { Setting } from '../entities/setting.entity';

export interface CreateSettingData {
  organizationId: string;
  key: string;
  value?: unknown;
}

export type UpdateSettingData = Partial<Pick<CreateSettingData, 'value'>>;

export const SETTINGS_REPOSITORY = Symbol('SETTINGS_REPOSITORY');

export interface ISettingsRepository extends IBaseRepository<
  Setting,
  CreateSettingData,
  UpdateSettingData
> {
  findByKey(organizationId: string, key: string): Promise<Setting | null>;
  upsert(organizationId: string, key: string, value: unknown, actorId?: string): Promise<Setting>;
}
