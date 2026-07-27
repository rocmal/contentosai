import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { EmailVerificationToken } from '../../domain/entities/email-verification-token.entity';
import {
  CreateEmailVerificationTokenData,
  IEmailVerificationTokensRepository,
} from '../../domain/repositories/email-verification-token-repository.interface';
import { EmailVerificationTokenModel } from './email-verification-token.model';

@Injectable()
export class EmailVerificationTokensRepository
  extends BaseRepository<
    EmailVerificationTokenModel,
    EmailVerificationToken,
    CreateEmailVerificationTokenData,
    Partial<CreateEmailVerificationTokenData>
  >
  implements IEmailVerificationTokensRepository
{
  constructor(@InjectModel(EmailVerificationTokenModel) model: typeof EmailVerificationTokenModel) {
    super(model);
  }

  async findByTokenHash(tokenHash: string): Promise<EmailVerificationToken | null> {
    return this.findOne({ tokenHash });
  }

  async consume(id: string): Promise<void> {
    const instance = await this.model.findByPk(id);
    if (instance) {
      instance.set({ consumedAt: new Date() });
      await instance.save();
    }
  }

  protected toEntity(instance: EmailVerificationTokenModel): EmailVerificationToken {
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
