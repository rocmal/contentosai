import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { StorageModule } from '@modules/storage/storage.module';
import { VoiceModule } from '@modules/voice/voice.module';
import { CustomVoiceModel } from './infrastructure/persistence/custom-voice.model';
import { CustomVoicesRepository } from './infrastructure/persistence/custom-voices.repository';
import { CUSTOM_VOICES_REPOSITORY } from './domain/repositories/custom-voice-repository.interface';
import { CustomVoicesService } from './application/services/custom-voices.service';
import { CustomVoicesController } from './presentation/custom-voices.controller';

@Module({
  imports: [SequelizeModule.forFeature([CustomVoiceModel]), StorageModule, VoiceModule],
  controllers: [CustomVoicesController],
  providers: [
    CustomVoicesService,
    { provide: CUSTOM_VOICES_REPOSITORY, useClass: CustomVoicesRepository },
  ],
  exports: [CustomVoicesService],
})
export class CustomVoicesModule {}
