import { IBaseRepository } from '@shared/interfaces/base-repository.interface';
import { VideoCreditWallet } from '../entities/credit-wallet.entity';

export interface CreateVideoCreditWalletData {
  organizationId: string;
  plan: string;
  periodStart: Date;
  periodEnd: Date;
  grantedCredits: number;
  reservedCredits: number;
  consumedCredits: number;
}

export type UpdateVideoCreditWalletData = Partial<Omit<CreateVideoCreditWalletData, 'organizationId'>>;

export interface IVideoCreditWalletsRepository
  extends IBaseRepository<VideoCreditWallet, CreateVideoCreditWalletData, UpdateVideoCreditWalletData> {
  findCurrent(organizationId: string, at: Date): Promise<VideoCreditWallet | null>;

  /**
   * Atomically holds credits. Implemented as a single conditional UPDATE:
   *
   *   UPDATE ... SET reservedCredits = reservedCredits + :credits
   *   WHERE id = :id AND granted - reserved - consumed >= :credits
   *
   * A read-then-write would let two concurrent submits each see enough balance
   * and both succeed, overdrawing the wallet. Returns false when the guard
   * clause matched no rows, i.e. insufficient funds.
   */
  tryReserve(walletId: string, credits: number): Promise<boolean>;

  /** Moves credits from reserved to consumed. */
  commitReservation(walletId: string, reserved: number, actual: number): Promise<boolean>;

  /** Releases a hold without charging. */
  releaseReservation(walletId: string, credits: number): Promise<boolean>;
}

export const VIDEO_CREDIT_WALLETS_REPOSITORY = Symbol('VIDEO_CREDIT_WALLETS_REPOSITORY');
