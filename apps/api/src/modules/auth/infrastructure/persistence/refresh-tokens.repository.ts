import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import {
  CreateRefreshTokenData,
  IRefreshTokensRepository,
} from '../../domain/repositories/refresh-token-repository.interface';
import { RefreshTokenModel } from './refresh-token.model';

@Injectable()
export class RefreshTokensRepository
  extends BaseRepository<
    RefreshTokenModel,
    RefreshToken,
    CreateRefreshTokenData,
    Partial<CreateRefreshTokenData>
  >
  implements IRefreshTokensRepository
{
  constructor(@InjectModel(RefreshTokenModel) model: typeof RefreshTokenModel) {
    super(model);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.findOne({ tokenHash });
  }

  async revoke(id: string): Promise<void> {
    const instance = await this.model.findByPk(id);
    if (instance) {
      instance.set({ revokedAt: new Date() });
      await instance.save();
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.model.update({ revokedAt: new Date() }, { where: { userId, revokedAt: null } });
  }

  protected toEntity(instance: RefreshTokenModel): RefreshToken {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      userId: plain.userId,
      tokenHash: plain.tokenHash,
      expiresAt: plain.expiresAt,
      revokedAt: plain.revokedAt,
      userAgent: plain.userAgent,
      ipAddress: plain.ipAddress,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
