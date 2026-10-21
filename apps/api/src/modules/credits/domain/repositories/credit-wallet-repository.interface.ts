import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { CreditWallet } from '../entities/credit-wallet.entity';

export interface CreateCreditWalletData {
  organizationId: string;
  workspaceId: string;
  balance: number | null;
  cycleStartAt?: Date | null;
  cycleEndAt?: Date | null;
  pausedAt?: Date | null;
}

export type UpdateCreditWalletData = Partial<Omit<CreateCreditWalletData, 'organizationId' | 'workspaceId'>>;

export const CREDIT_WALLETS_REPOSITORY = Symbol('CREDIT_WALLETS_REPOSITORY');

export interface ICreditWalletsRepository
  extends IBaseRepository<CreditWallet, CreateCreditWalletData, UpdateCreditWalletData> {
  findByWorkspace(workspaceId: string): Promise<CreditWallet | null>;
  /** Atomically decrements balance iff the wallet is not paused and balance >= amount (or balance is
   * null/unlimited). Returns the updated wallet, or null if the reservation was denied (insufficient or
   * paused - caller should treat that as "reservation denied", not an error). */
  tryDecrement(workspaceId: string, amount: number): Promise<CreditWallet | null>;
  increment(workspaceId: string, amount: number): Promise<CreditWallet>;
  setBalance(workspaceId: string, balance: number | null, cycleStartAt: Date, cycleEndAt: Date | null): Promise<CreditWallet>;
  /** Starts a new billing period: adds `amount` to what is left (carry forward), un-pauses the wallet and sets the
   * period. `amount` null = unlimited; an unlimited wallet moving to a limited plan starts from `amount`. Atomic. */
  addForNewCycle(
    workspaceId: string,
    amount: number | null,
    cycleStartAt: Date,
    cycleEndAt: Date | null,
  ): Promise<CreditWallet>;
  /** Keeps the balance but stops it being spent (the paid plan lapsed). Returns null when there is no wallet. */
  pause(workspaceId: string, pausedAt: Date): Promise<CreditWallet | null>;
}
