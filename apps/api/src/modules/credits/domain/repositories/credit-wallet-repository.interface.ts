import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { CreditWallet } from '../entities/credit-wallet.entity';

export interface CreateCreditWalletData {
  organizationId: string;
  workspaceId: string;
  balance: number | null;
  cycleStartAt?: Date | null;
  cycleEndAt?: Date | null;
}

export type UpdateCreditWalletData = Partial<Omit<CreateCreditWalletData, 'organizationId' | 'workspaceId'>>;

export const CREDIT_WALLETS_REPOSITORY = Symbol('CREDIT_WALLETS_REPOSITORY');

export interface ICreditWalletsRepository
  extends IBaseRepository<CreditWallet, CreateCreditWalletData, UpdateCreditWalletData> {
  findByWorkspace(workspaceId: string): Promise<CreditWallet | null>;
  /** Atomically decrements balance iff balance >= amount (or balance is
   * null/unlimited). Returns the updated wallet, or null if the balance was
   * insufficient (caller should treat that as "reservation denied", not an error). */
  tryDecrement(workspaceId: string, amount: number): Promise<CreditWallet | null>;
  increment(workspaceId: string, amount: number): Promise<CreditWallet>;
  setBalance(workspaceId: string, balance: number | null, cycleStartAt: Date, cycleEndAt: Date | null): Promise<CreditWallet>;
}
