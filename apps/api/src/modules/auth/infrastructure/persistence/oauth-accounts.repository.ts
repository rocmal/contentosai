import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { OAuthAccount, OAuthProvider } from '../../domain/entities/oauth-account.entity';
import {
  CreateOAuthAccountData,
  IOAuthAccountsRepository,
} from '../../domain/repositories/oauth-account-repository.interface';
import { OAuthAccountModel } from './oauth-account.model';

@Injectable()
export class OAuthAccountsRepository
  extends BaseRepository<
    OAuthAccountModel,
    OAuthAccount,
    CreateOAuthAccountData,
    Partial<CreateOAuthAccountData>
  >
  implements IOAuthAccountsRepository
{
  constructor(@InjectModel(OAuthAccountModel) model: typeof OAuthAccountModel) {
    super(model);
  }

  async findByProviderAccount(
    provider: OAuthProvider,
    providerAccountId: string,
  ): Promise<OAuthAccount | null> {
    return this.findOne({ provider, providerAccountId });
  }

  protected toEntity(instance: OAuthAccountModel): OAuthAccount {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      userId: plain.userId,
      provider: plain.provider,
      providerAccountId: plain.providerAccountId,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
