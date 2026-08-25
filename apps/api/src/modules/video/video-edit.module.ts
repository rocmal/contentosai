import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { MediaModule } from '@modules/media/media.module';
import { StorageModule } from '@modules/storage/storage.module';
import { VideoCreditsModule } from '@modules/video-credits/credits.module';
import { StorageProviderFactory } from '@modules/storage/infrastructure/storage-provider.factory';
import { GeminiOmniProvider } from './infrastructure/providers/gemini-omni.provider';
import { VideoEditSessionModel } from './infrastructure/persistence/video-edit-session.model';
import { VideoEditTurnModel } from './infrastructure/persistence/video-edit-turn.model';
import { VideoEditSessionsRepository } from './infrastructure/persistence/video-edit-sessions.repository';
import { VideoEditTurnsRepository } from './infrastructure/persistence/video-edit-turns.repository';
import {
  GENERATED_VIDEO_STORE_PROVIDER,
  StorageBackedVideoStore,
  VIDEO_STORAGE_PROVIDER,
} from './infrastructure/storage/storage-backed-video-store';
import { CONVERSATIONAL_VIDEO_PROVIDER } from './domain/interfaces/conversational-video.port';
import { VIDEO_EDIT_SESSIONS_REPOSITORY } from './domain/repositories/video-edit-session-repository.interface';
import { VIDEO_EDIT_TURNS_REPOSITORY } from './domain/repositories/video-edit-turn-repository.interface';
import { VideoEditSessionService } from './application/services/video-edit-session.service';
import { VideoTurnFinalizerService } from './application/services/video-turn-finalizer.service';
import { VideoSessionsController } from './presentation/video-sessions.controller';

/**
 * Kept separate from VideoModule: that module owns the job/poll providers
 * (fal, Runway, Kling) behind IVideoProvider. This one owns the turn-based
 * conversational path behind IConversationalVideoProvider. Two ports, two
 * modules, no shared abstraction forced across them.
 */
@Module({
  imports: [
    SequelizeModule.forFeature([VideoEditSessionModel, VideoEditTurnModel]),
    MediaModule,
    StorageModule,
    VideoCreditsModule,
  ],
  controllers: [VideoSessionsController],
  providers: [
    GeminiOmniProvider,
    { provide: CONVERSATIONAL_VIDEO_PROVIDER, useExisting: GeminiOmniProvider },
    { provide: VIDEO_EDIT_SESSIONS_REPOSITORY, useClass: VideoEditSessionsRepository },
    { provide: VIDEO_EDIT_TURNS_REPOSITORY, useClass: VideoEditTurnsRepository },
    // ---------------------------------------------------------------------
    // ONE LINE TO CONFIRM ON APPLY. StorageBackedVideoStore needs whichever
    // IStorageProvider the app has selected (local / MinIO / S3). Bind it to
    // however StorageModule exports that instance, e.g.:
    //   { provide: VIDEO_STORAGE_PROVIDER, useExisting: STORAGE_PROVIDER }
    //   { provide: VIDEO_STORAGE_PROVIDER,
    //     useFactory: (f: StorageProviderFactory) => f.getProvider(),
    //     inject: [StorageProviderFactory] }
    // ---------------------------------------------------------------------
    {
      provide: VIDEO_STORAGE_PROVIDER,
      useFactory: (factory: StorageProviderFactory) => factory.getProvider(),
      inject: [StorageProviderFactory],
    },
    StorageBackedVideoStore,
    GENERATED_VIDEO_STORE_PROVIDER,
    VideoTurnFinalizerService,
    VideoEditSessionService,
  ],
  exports: [VideoEditSessionService, VideoTurnFinalizerService],
})
export class VideoEditModule {}
