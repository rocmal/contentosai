import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PermissionModel } from './infrastructure/persistence/permission.model';
import { PermissionsRepository } from './infrastructure/persistence/permissions.repository';
import { PERMISSIONS_REPOSITORY } from './domain/repositories/permission-repository.interface';
import { PermissionsService } from './application/services/permissions.service';
import { PermissionsController } from './presentation/permissions.controller';

@Module({
  imports: [SequelizeModule.forFeature([PermissionModel])],
  controllers: [PermissionsController],
  providers: [
    PermissionsService,
    { provide: PERMISSIONS_REPOSITORY, useClass: PermissionsRepository },
  ],
  exports: [PermissionsService, PERMISSIONS_REPOSITORY],
})
export class PermissionsModule {}
