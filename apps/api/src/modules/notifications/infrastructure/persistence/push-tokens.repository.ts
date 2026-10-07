import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
  IPushTokensRepository,
  PushToken,
} from '../../domain/repositories/push-token-repository.interface';
import { PushTokenModel } from './push-token.model';

@Injectable()
export class PushTokensRepository implements IPushTokensRepository {
  constructor(@InjectModel(PushTokenModel) private readonly model: typeof PushTokenModel) {}

  async upsert(userId: string, token: string, platform: string): Promise<void> {
    // paranoid: false so a soft-deleted row for the same token is revived rather than hitting the unique index.
    const existing = await this.model.findOne({ where: { token }, paranoid: false });
    if (existing) {
      await existing.update({ userId, platform, deletedAt: null, updatedBy: userId });
      return;
    }
    await this.model.create({ userId, token, platform, createdBy: userId });
  }

  async listByUser(userId: string): Promise<PushToken[]> {
    const rows = await this.model.findAll({ where: { userId } });
    return rows.map((r) => ({ id: r.id, userId: r.userId, token: r.token, platform: r.platform }));
  }

  async removeByToken(token: string, userId?: string): Promise<void> {
    await this.model.destroy({ where: userId ? { token, userId } : { token } });
  }
}
