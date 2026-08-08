import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CharacterModule } from '@modules/character/character.module';
import { AvatarUsageModel } from './infrastructure/persistence/avatar-usage.model';
import { AvatarModel } from './infrastructure/persistence/avatar.model';
import { AvatarUsageRepository } from './infrastructure/persistence/avatar-usage.repository';
import { AvatarsRepository } from './infrastructure/persistence/avatars.repository';
import { AVATAR_USAGE_REPOSITORY, AVATARS_REPOSITORY } from './domain/repositories/avatar-repository.interface';
import { AvatarsService } from './application/services/avatars.service';
import { AvatarsController } from './presentation/avatars.controller';
import { AvatarProviderFactory } from './infrastructure/avatar-provider.factory';
import {
  DidAvatarProvider,
  HeyGenAvatarProvider,
  LivePortraitAvatarProvider,
  SadTalkerAvatarProvider,
  SynthesiaAvatarProvider,
} from './infrastructure/providers/character-avatar.provider';
import { MockAvatarProvider } from './infrastructure/providers/mock-avatar.provider';

@Module({
  imports: [SequelizeModule.forFeature([AvatarModel, AvatarUsageModel]), CharacterModule],
  controllers: [AvatarsController],
  providers: [
    AvatarsService,
    AvatarProviderFactory,
    MockAvatarProvider,
    HeyGenAvatarProvider,
    DidAvatarProvider,
    SynthesiaAvatarProvider,
    LivePortraitAvatarProvider,
    SadTalkerAvatarProvider,
    { provide: AVATARS_REPOSITORY, useClass: AvatarsRepository },
    { provide: AVATAR_USAGE_REPOSITORY, useClass: AvatarUsageRepository },
  ],
  exports: [AvatarsService, AVATARS_REPOSITORY],
})
export class AvatarsModule {}
