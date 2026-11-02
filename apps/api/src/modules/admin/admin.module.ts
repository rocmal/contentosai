import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { CreditsModule } from '@modules/credits/credits.module';
import { BillingModule } from '@modules/billing/billing.module';
import { AuditModule } from '@modules/audit/audit.module';
import { OrganizationModel } from '@modules/organizations/infrastructure/persistence/organization.model';
import { OrganizationMemberModel } from '@modules/organizations/infrastructure/persistence/organization-member.model';
import { UserModel } from '@modules/users/infrastructure/persistence/user.model';
import { RoleModel } from '@modules/roles/infrastructure/persistence/role.model';
import { WorkspaceModel } from '@modules/workspaces/infrastructure/persistence/workspace.model';
import { SubscriptionModel } from '@modules/billing/infrastructure/persistence/subscription.model';
import { CreditWalletModel } from '@modules/credits/infrastructure/persistence/credit-wallet.model';
import { CUSTOMER_DIRECTORY_REPOSITORY } from './domain/repositories/customer-directory-repository.interface';
import { CustomerDirectoryRepository } from './infrastructure/persistence/customer-directory.repository';
import { AdminService } from './application/services/admin.service';
import { AdminController } from './presentation/admin.controller';

/** Lumora's platform admins helping customers (the website's Admin page). */
@Module({
  imports: [
    SequelizeModule.forFeature([
      OrganizationModel,
      OrganizationMemberModel,
      UserModel,
      RoleModel,
      WorkspaceModel,
      SubscriptionModel,
      CreditWalletModel,
    ]),
    AuthModule,
    UsersModule,
    CreditsModule,
    BillingModule,
    AuditModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    { provide: CUSTOMER_DIRECTORY_REPOSITORY, useClass: CustomerDirectoryRepository },
  ],
})
export class AdminModule {}
