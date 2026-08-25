import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import {
  VideoCreditTransaction,
  CreditTransactionType,
} from '../entities/credit-transaction.entity';

export interface CreateVideoCreditTransactionData {
  walletId: string;
  organizationId: string;
  type: CreditTransactionType;
  credits: number;
  reservationId?: string | null;
  feature?: string | null;
  modelId?: string | null;
  vendorCostUsd?: string | null;
  reason?: string | null;
}

export interface IVideoCreditTransactionsRepository
  extends IBaseRepository<VideoCreditTransaction, CreateVideoCreditTransactionData, never> {
  findByReservation(reservationId: string): Promise<VideoCreditTransaction[]>;
  findReservation(reservationId: string): Promise<VideoCreditTransaction | null>;
  /** True once the reservation has been settled either way. */
  isSettled(reservationId: string): Promise<boolean>;
}

export const VIDEO_CREDIT_TRANSACTIONS_REPOSITORY = Symbol('VIDEO_CREDIT_TRANSACTIONS_REPOSITORY');
