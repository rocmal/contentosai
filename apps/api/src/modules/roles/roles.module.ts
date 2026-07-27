import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PermissionsModule } from '@modules/permissions/permissions.module';
import { RoleModel } from './infrastructure/persistence/role.model';
import { RolePermissionModel } from './infrastructure/persistence/role-permission.model';
import { RolesRepository } from './infrastructure/persistence/roles.repository';
import { ROLES_REPOSITORY } from './domain/repositories/role-repository.interface';
import { RolesService } from './application/services/roles.service';
import { RolesController } from './presentation/roles.controller';

@Module({
  imports: [SequelizeModule.forFeature([RoleModel, RolePermissionModel]), PermissionsModule],
  controllers: [RolesController],
  providers: [RolesService, { provide: ROLES_REPOSITORY, useClass: RolesRepository }],
  exports: [RolesService, ROLES_REPOSITORY],
})
export class RolesModule {}
