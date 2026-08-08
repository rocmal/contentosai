import { HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { CreditWallet } from '../../domain/entities/credit-wallet.entity';
import { CreditTransaction, CreditTransactionReason } from '../../domain/entities/credit-transaction.entity';
import {
  CREDIT_WALLETS_REPOSITORY,
  ICreditWalletsRepository,
} from '../../domain/repositories/credit-wallet-repository.interface';
import {
  CREDIT_TRANSACTIONS_REPOSITORY,
  ICreditTransactionsRepository,
} from '../../domain/repositories/credit-transaction-repository.interface';
import { DEFAULT_PLAN, PLAN_CREDIT_ALLOTMENTS } from '../../credits.constants';

/** 402 Payment Required - the workspace's credit balance can't cover this
 * generation. Thrown before any paid provider is called, never after. */
export class InsufficientCreditsException extends HttpException {
  constructor(message = 'Not enough credits remaining this billing cycle.') {
    super({ statusCode: HttpStatus.PAYMENT_REQUIRED, message, error: 'Insufficient Credits' }, HttpStatus.PAYMENT_REQUIRED);
  }
}

function addOneMonth(date: Date): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next;
}

function planAllotment(plan: string): number | null {
  return plan in PLAN_CREDIT_ALLOTMENTS ? PLAN_CREDIT_ALLOTMENTS[plan] : PLAN_CREDIT_ALLOTMENTS[DEFAULT_PLAN];
}

@Injectable()
export class CreditsService {
  constructor(
    @Inject(CREDIT_WALLETS_REPOSITORY) private readonly walletsRepository: ICreditWalletsRepository,
    @Inject(CREDIT_TRANSACTIONS_REPOSITORY)
    private readonly transactionsRepository: ICreditTransactionsRepository,
  ) {}

  async getWallet(workspaceId: string): Promise<CreditWallet> {
    const wallet = await this.walletsRepository.findByWorkspace(workspaceId);
    if (!wallet) {
      throw new NotFoundException(`No credit wallet exists for workspace "${workspaceId}" yet`);
    }
    return wallet;
  }

  async listTransactions(
    workspaceId: string,
    options?: FindAllOptions,
  ): Promise<PaginatedResult<CreditTransaction>> {
    return this.transactionsRepository.listByWorkspace(workspaceId, options);
  }

  /** Creates the wallet for a brand-new workspace and grants its plan's
   * first allotment. Idempotent-ish: if a wallet already exists, tops it up
   * to the plan allotment instead of creating a duplicate. */
  async grantInitial(
    organizationId: string,
    workspaceId: string,
    plan: string,
    actorId?: string,
  ): Promise<CreditWallet> {
    const allotment = planAllotment(plan);
    const cycleStartAt = new Date();
    const cycleEndAt = addOneMonth(cycleStartAt);

    const existing = await this.walletsRepository.findByWorkspace(workspaceId);
    const wallet = existing
      ? await this.walletsRepository.setBalance(workspaceId, allotment, cycleStartAt, cycleEndAt)
      : await this.walletsRepository.create(
          { organizationId, workspaceId, balance: allotment, cycleStartAt, cycleEndAt },
          actorId,
        );

    await this.transactionsRepository.create(
      {
        organizationId,
        workspaceId,
        userId: actorId ?? null,
        amount: allotment ?? 0,
        reason: CreditTransactionReason.PLAN_INITIAL_GRANT,
        balanceAfter: allotment,
      },
      actorId,
    );

    return wallet;
  }

  /** Resets the wallet to the plan's monthly allotment (no rollover, per the
   * landing page FAQ) and advances the billing cycle. Called by the renewal
   * job when Subscription.currentPeriodEnd rolls over. */
  async grantMonthlyRenewal(
    organizationId: string,
    workspaceId: string,
    plan: string,
    cycleStartAt: Date,
    cycleEndAt: Date | null,
  ): Promise<CreditWallet> {
    const allotment = planAllotment(plan);
    const existing = await this.walletsRepository.findByWorkspace(workspaceId);
    const wallet = existing
      ? await this.walletsRepository.setBalance(workspaceId, allotment, cycleStartAt, cycleEndAt)
      : await this.walletsRepository.create(
          { organizationId, workspaceId, balance: allotment, cycleStartAt, cycleEndAt },
        );

    await this.transactionsRepository.create({
      organizationId,
      workspaceId,
      userId: null,
      amount: allotment ?? 0,
      reason: CreditTransactionReason.PLAN_MONTHLY_GRANT,
      balanceAfter: allotment,
    });

    return wallet;
  }

  /** Atomically checks-and-decrements before any paid provider call. Throws
   * InsufficientCreditsException (never a generic error) when the balance
   * can't cover it, so callers can show a clear "out of credits" message
   * instead of a confusing provider failure. */
  async reserve(params: {
    organizationId: string;
    workspaceId: string;
    amount: number;
    reason: CreditTransactionReason;
    userId?: string;
    relatedEntityId?: string;
  }): Promise<void> {
    const wallet = await this.walletsRepository.tryDecrement(params.workspaceId, params.amount);
    if (!wallet) {
      throw new InsufficientCreditsException();
    }

    await this.transactionsRepository.create(
      {
        organizationId: params.organizationId,
        workspaceId: params.workspaceId,
        userId: params.userId ?? null,
        amount: -params.amount,
        reason: params.reason,
        relatedEntityId: params.relatedEntityId,
        balanceAfter: wallet.balance,
      },
      params.userId,
    );
  }

  /** Returns credits to the wallet - used when a reserved generation's
   * provider call fails, so a failed attempt never permanently costs the user. */
  async refund(params: {
    organizationId: string;
    workspaceId: string;
    amount: number;
    userId?: string;
    relatedEntityId?: string;
  }): Promise<void> {
    const wallet = await this.walletsRepository.increment(params.workspaceId, params.amount);

    await this.transactionsRepository.create(
      {
        organizationId: params.organizationId,
        workspaceId: params.workspaceId,
        userId: params.userId ?? null,
        amount: params.amount,
        reason: CreditTransactionReason.REFUND,
        relatedEntityId: params.relatedEntityId,
        balanceAfter: wallet.balance,
      },
      params.userId,
    );
  }

  /** Manual support/admin correction - not guarded by balance-sufficiency
   * (a deliberate deduction can take a wallet negative to correct an error). */
  async adjust(params: {
    organizationId: string;
    workspaceId: string;
    amount: number;
    actorId: string;
    note?: string;
  }): Promise<CreditWallet> {
    const wallet = await this.walletsRepository.increment(params.workspaceId, params.amount);

    await this.transactionsRepository.create(
      {
        organizationId: params.organizationId,
        workspaceId: params.workspaceId,
        userId: params.actorId,
        amount: params.amount,
        reason: CreditTransactionReason.ADMIN_ADJUSTMENT,
        balanceAfter: wallet.balance,
      },
      params.actorId,
    );

    return wallet;
  }
}
