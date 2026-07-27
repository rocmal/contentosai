import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { PasswordResetToken } from '../../domain/entities/password-reset-token.entity';
import {
  CreatePasswordResetTokenData,
  IPasswordResetTokensRepository,
} from '../../domain/repositories/password-reset-token-repository.interface';
import { PasswordResetTokenModel } from './password-reset-token.model';

@Injectable()
export class PasswordResetTokensRepository
  extends BaseRepository<
    PasswordResetTokenModel,
    PasswordResetToken,
    CreatePasswordResetTokenData,
    Partial<CreatePasswordResetTokenData>
  >
  implements IPasswordResetTokensRepository
{
  constructor(@InjectModel(PasswordResetTokenModel) model: typeof PasswordResetTokenModel) {
    super(model);
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.findOne({ tokenHash });
  }

  async consume(id: string): Promise<void> {
    const instance = await this.model.findByPk(id);
    if (instance) {
      instance.set({ consumedAt: new Date() });
      await instance.save();
    }
  }

  protected toEntity(instance: PasswordResetTokenModel): PasswordResetToken {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      userId: plain.userId,
      tokenHash: plain.tokenHash,
      expiresAt: plain.expiresAt,
      consumedAt: plain.consumedAt,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
