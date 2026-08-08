import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { VoiceTemplateModel } from './infrastructure/persistence/voice-template.model';
import { VoiceTemplatesRepository } from './infrastructure/persistence/voice-templates.repository';
import { VOICE_TEMPLATES_REPOSITORY } from './domain/repositories/voice-template-repository.interface';
import { VoiceTemplatesService } from './application/services/voice-templates.service';
import { VoiceTemplatesController } from './presentation/voice-templates.controller';

@Module({
  imports: [SequelizeModule.forFeature([VoiceTemplateModel])],
  controllers: [VoiceTemplatesController],
  providers: [
    VoiceTemplatesService,
    { provide: VOICE_TEMPLATES_REPOSITORY, useClass: VoiceTemplatesRepository },
  ],
  exports: [VoiceTemplatesService, VOICE_TEMPLATES_REPOSITORY],
})
export class VoiceTemplatesModule {}
