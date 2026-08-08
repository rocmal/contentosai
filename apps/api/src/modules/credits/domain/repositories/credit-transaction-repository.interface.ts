import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { CreditTransaction, CreditTransactionReason } from '../entities/credit-transaction.entity';

export interface CreateCreditTransactionData {
  organizationId: string;
  workspaceId: string;
  userId?: string | null;
  amount: number;
  reason: CreditTransactionReason;
  relatedEntityId?: string | null;
  balanceAfter: number | null;
}

export const CREDIT_TRANSACTIONS_REPOSITORY = Symbol('CREDIT_TRANSACTIONS_REPOSITORY');

export interface ICreditTransactionsRepository
  extends IBaseRepository<CreditTransaction, CreateCreditTransactionData, never> {
  listByWorkspace(workspaceId: string, options?: FindAllOptions): Promise<PaginatedResult<CreditTransaction>>;
}
