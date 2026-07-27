import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BrandProfileModel } from './infrastructure/persistence/brand-profile.model';
import { BrandProfilesRepository } from './infrastructure/persistence/brand-profiles.repository';
import { BRAND_PROFILES_REPOSITORY } from './domain/repositories/brand-profile-repository.interface';
import { BrandProfilesService } from './application/services/brand-profiles.service';
import { BrandProfilesController } from './presentation/brand-profiles.controller';

@Module({
  imports: [SequelizeModule.forFeature([BrandProfileModel])],
  controllers: [BrandProfilesController],
  providers: [
    BrandProfilesService,
    { provide: BRAND_PROFILES_REPOSITORY, useClass: BrandProfilesRepository },
  ],
  exports: [BrandProfilesService, BRAND_PROFILES_REPOSITORY],
})
export class BrandModule {}
