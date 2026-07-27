import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { SettingModel } from './infrastructure/persistence/setting.model';
import { SettingsRepository } from './infrastructure/persistence/settings.repository';
import { SETTINGS_REPOSITORY } from './domain/repositories/setting-repository.interface';
import { SettingsService } from './application/services/settings.service';
import { SettingsController } from './presentation/settings.controller';

@Module({
  imports: [SequelizeModule.forFeature([SettingModel])],
  controllers: [SettingsController],
  providers: [SettingsService, { provide: SETTINGS_REPOSITORY, useClass: SettingsRepository }],
  exports: [SettingsService, SETTINGS_REPOSITORY],
})
export class SettingsModule {}
