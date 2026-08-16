import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UsersModule } from '@modules/users/users.module';
import { RolesModule } from '@modules/roles/roles.module';
import { BillingModule } from '@modules/billing/billing.module';
import { OrganizationModel } from './infrastructure/persistence/organization.model';
import { OrganizationMemberModel } from './infrastructure/persistence/organization-member.model';
import { OrganizationsRepository } from './infrastructure/persistence/organizations.repository';
import { OrganizationMembersRepository } from './infrastructure/persistence/organization-members.repository';
import { ORGANIZATIONS_REPOSITORY } from './domain/repositories/organization-repository.interface';
import { ORGANIZATION_MEMBERS_REPOSITORY } from './domain/repositories/organization-member-repository.interface';
import { OrganizationsService } from './application/services/organizations.service';
import { OrganizationsController } from './presentation/organizations.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([OrganizationModel, OrganizationMemberModel]),
    UsersModule,
    RolesModule,
    BillingModule,
  ],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    { provide: ORGANIZATIONS_REPOSITORY, useClass: OrganizationsRepository },
    { provide: ORGANIZATION_MEMBERS_REPOSITORY, useClass: OrganizationMembersRepository },
  ],
  exports: [OrganizationsService, ORGANIZATIONS_REPOSITORY, ORGANIZATION_MEMBERS_REPOSITORY],
})
export class OrganizationsModule {}
