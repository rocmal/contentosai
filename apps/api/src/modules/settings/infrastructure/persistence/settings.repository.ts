import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { Setting } from '../../domain/entities/setting.entity';
import {
  CreateSettingData,
  ISettingsRepository,
  UpdateSettingData,
} from '../../domain/repositories/setting-repository.interface';
import { SettingModel } from './setting.model';

@Injectable()
export class SettingsRepository
  extends BaseRepository<SettingModel, Setting, CreateSettingData, UpdateSettingData>
  implements ISettingsRepository
{
  constructor(@InjectModel(SettingModel) model: typeof SettingModel) {
    super(model);
  }

  async findByKey(organizationId: string, key: string): Promise<Setting | null> {
    return this.findOne({ organizationId, key });
  }

  async upsert(
    organizationId: string,
    key: string,
    value: unknown,
    actorId?: string,
  ): Promise<Setting> {
    const existing = await this.findByKey(organizationId, key);
    if (existing) {
      return this.update(existing.id, { value }, actorId);
    }
    return this.create({ organizationId, key, value }, actorId);
  }

  protected toEntity(instance: SettingModel): Setting {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      key: plain.key,
      value: plain.value,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
