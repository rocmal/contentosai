import { Injectable } from '@nestjs/common';
import { fn, col, Op } from 'sequelize';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import {
  CreditTransaction,
  CreditTransactionReason,
} from '../../domain/entities/credit-transaction.entity';
import {
  CreateCreditTransactionData,
  CreditUsageSummary,
  ICreditTransactionsRepository,
} from '../../domain/repositories/credit-transaction-repository.interface';
import { CreditTransactionModel } from './credit-transaction.model';

@Injectable()
export class CreditTransactionsRepository
  extends BaseRepository<
    CreditTransactionModel,
    CreditTransaction,
    CreateCreditTransactionData,
    never
  >
  implements ICreditTransactionsRepository
{
  constructor(@InjectModel(CreditTransactionModel) model: typeof CreditTransactionModel) {
    super(model);
  }

  async listByWorkspace(
    workspaceId: string,
    options: FindAllOptions = {},
  ): Promise<PaginatedResult<CreditTransaction>> {
    return this.findAll({
      ...options,
      filters: { ...(options.filters ?? {}), workspaceId },
      sortBy: options.sortBy ?? 'createdAt',
      sortOrder: options.sortOrder ?? 'DESC',
    });
  }

  async summarizeUsage(workspaceId: string, since: Date): Promise<CreditUsageSummary> {
    const rows = (await this.model.findAll({
      attributes: [
        'reason',
        [fn('SUM', col('amount')), 'total'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: {
        workspaceId,
        createdAt: { [Op.gte]: since },
        reason: {
          [Op.in]: [
            CreditTransactionReason.GENERATION_TEXT,
            CreditTransactionReason.GENERATION_IMAGE,
            CreditTransactionReason.GENERATION_VOICE,
            CreditTransactionReason.GENERATION_VIDEO,
            CreditTransactionReason.GENERATION_CHARACTER,
            CreditTransactionReason.REFUND,
          ],
        },
      },
      group: ['reason'],
      raw: true,
    })) as unknown as {
      reason: CreditTransactionReason;
      total: string | number;
      count: string | number;
    }[];

    const summary: CreditUsageSummary = { byReason: [], refunded: 0 };
    for (const row of rows) {
      const total = Number(row.total);
      if (row.reason === CreditTransactionReason.REFUND) {
        summary.refunded = Math.max(0, total);
      } else {
        // Consumption is stored as a negative amount.
        summary.byReason.push({
          reason: row.reason,
          credits: Math.max(0, -total),
          count: Number(row.count),
        });
      }
    }
    return summary;
  }

  protected toEntity(instance: CreditTransactionModel): CreditTransaction {
    const plain = instance.get({ plain: true });
    return {
      id: plain.id,
      organizationId: plain.organizationId,
      workspaceId: plain.workspaceId,
      userId: plain.userId,
      amount: plain.amount,
      reason: plain.reason,
      relatedEntityId: plain.relatedEntityId,
      balanceAfter: plain.balanceAfter,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      deletedAt: plain.deletedAt,
      createdBy: plain.createdBy,
      updatedBy: plain.updatedBy,
      version: plain.version,
    };
  }
}
