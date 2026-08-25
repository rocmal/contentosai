import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import {
  VideoCreditTransaction,
  CreditTransactionType,
} from '../../domain/entities/credit-transaction.entity';
import {
  CreateVideoCreditTransactionData,
  IVideoCreditTransactionsRepository,
} from '../../domain/repositories/credit-transaction-repository.interface';
import { VideoCreditTransactionModel } from './credit-transaction.model';

@Injectable()
export class VideoCreditTransactionsRepository
  extends BaseRepository<
    VideoCreditTransactionModel,
    VideoCreditTransaction,
    CreateVideoCreditTransactionData,
    never
  >
  implements IVideoCreditTransactionsRepository
{
  constructor(@InjectModel(VideoCreditTransactionModel) model: typeof VideoCreditTransactionModel) {
    super(model);
  }

  async findByReservation(reservationId: string): Promise<VideoCreditTransaction[]> {
    const instances = await this.model.findAll({
      where: { reservationId },
      order: [['createdAt', 'ASC']],
    });
    return instances.map((instance) => this.toEntity(instance));
  }

  async findReservation(reservationId: string): Promise<VideoCreditTransaction | null> {
    const instance = await this.model.findOne({
      where: { reservationId, type: CreditTransactionType.RESERVE },
    });
    return instance ? this.toEntity(instance) : null;
  }

  async isSettled(reservationId: string): Promise<boolean> {
    const count = await this.model.count({
      where: {
        reservationId,
        type: { [Op.in]: [CreditTransactionType.COMMIT, CreditTransactionType.REFUND] },
      },
    });
    return count > 0;
  }

  protected toEntity(instance: VideoCreditTransactionModel): VideoCreditTransaction {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      walletId: plain.walletId,
      organizationId: plain.organizationId,
      type: plain.type,
      credits: plain.credits,
      reservationId: plain.reservationId,
      feature: plain.feature,
      modelId: plain.modelId,
      vendorCostUsd: plain.vendorCostUsd,
      reason: plain.reason,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
