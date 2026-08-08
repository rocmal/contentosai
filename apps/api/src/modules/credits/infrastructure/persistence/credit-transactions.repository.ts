import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseRepository } from '@database/repositories/base.repository';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { CreditTransaction } from '../../domain/entities/credit-transaction.entity';
import {
  CreateCreditTransactionData,
  ICreditTransactionsRepository,
} from '../../domain/repositories/credit-transaction-repository.interface';
import { CreditTransactionModel } from './credit-transaction.model';

@Injectable()
export class CreditTransactionsRepository
  extends BaseRepository<CreditTransactionModel, CreditTransaction, CreateCreditTransactionData, never>
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
