import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { Setting } from '../../domain/entities/setting.entity';
import {
  ISettingsRepository,
  SETTINGS_REPOSITORY,
} from '../../domain/repositories/setting-repository.interface';
import { SettingCreatedEvent } from '../events/setting-created.event';

@Injectable()
export class SettingsService {
  constructor(
    @Inject(SETTINGS_REPOSITORY) private readonly settingsRepository: ISettingsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(options?: FindAllOptions): Promise<PaginatedResult<Setting>> {
    return this.settingsRepository.findAll(options);
  }

  async findById(id: string): Promise<Setting> {
    const setting = await this.settingsRepository.findById(id);
    if (!setting) {
      throw new NotFoundException(`Setting with id "${id}" not found`);
    }
    return setting;
  }

  async get(organizationId: string, key: string): Promise<Setting | null> {
    return this.settingsRepository.findByKey(organizationId, key);
  }

  /** Creates the setting on first write, updates its value thereafter - the only mutation path this module has. */
  async set(
    organizationId: string,
    key: string,
    value: unknown,
    actorId?: string,
  ): Promise<Setting> {
    const existing = await this.settingsRepository.findByKey(organizationId, key);
    const setting = await this.settingsRepository.upsert(organizationId, key, value, actorId);

    if (!existing) {
      this.eventEmitter.emit(
        'settings.created',
        new SettingCreatedEvent(setting.id, setting.organizationId),
      );
    }

    return setting;
  }

  async remove(id: string, actorId?: string): Promise<void> {
    await this.findById(id);
    await this.settingsRepository.delete(id, actorId);
  }
}
