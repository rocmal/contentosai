import { HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { CreditWallet } from '../../domain/entities/credit-wallet.entity';
import {
  CreditTransaction,
  CreditTransactionReason,
} from '../../domain/entities/credit-transaction.entity';
import {
  CREDIT_WALLETS_REPOSITORY,
  ICreditWalletsRepository,
} from '../../domain/repositories/credit-wallet-repository.interface';
import {
  CREDIT_TRANSACTIONS_REPOSITORY,
  CreditUsageByReason,
  ICreditTransactionsRepository,
} from '../../domain/repositories/credit-transaction-repository.interface';
import {
  DEFAULT_PLAN,
  PLAN_CREDIT_ALLOTMENTS,
  VIDEO_CREDITS_PER_10_SECONDS,
  VOICE_CREDITS_PER_MINUTE,
  VOICE_WORDS_PER_MINUTE,
} from '../../credits.constants';

/** 402 Payment Required - the workspace's credit balance can't cover this
 * generation. Thrown before any paid provider is called, never after. */
export class InsufficientCreditsException extends HttpException {
  constructor(message = 'Not enough credits remaining this billing cycle.') {
    super(
      { statusCode: HttpStatus.PAYMENT_REQUIRED, message, error: 'Insufficient Credits' },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

function addOneMonth(date: Date): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next;
}

function planAllotment(plan: string): number | null {
  return plan in PLAN_CREDIT_ALLOTMENTS
    ? PLAN_CREDIT_ALLOTMENTS[plan]
    : PLAN_CREDIT_ALLOTMENTS[DEFAULT_PLAN];
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

  /** What things cost, so the app can show a price before the button is pressed. Same tables the charge uses. */
  getRates(): {
    voice: { perMinute: Record<string, number>; wordsPerMinute: number };
    video: { per10Seconds: Record<string, number> };
  } {
    return {
      voice: { perMinute: { ...VOICE_CREDITS_PER_MINUTE }, wordsPerMinute: VOICE_WORDS_PER_MINUTE },
      video: { per10Seconds: { ...VIDEO_CREDITS_PER_10_SECONDS } },
    };
  }

  /** What the workspace spent over the last days days, per kind of generation. */
  async getUsageSummary(
    workspaceId: string,
    days = 30,
  ): Promise<{ days: number; creditsUsed: number; byReason: CreditUsageByReason[] }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const { byReason, refunded } = await this.transactionsRepository.summarizeUsage(
      workspaceId,
      since,
    );
    const gross = byReason.reduce((sum, row) => sum + row.credits, 0);
    // Refunds hand back credits for failed runs, so they don't count as spent.
    return { days, creditsUsed: Math.max(0, gross - refunded), byReason };
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
    /** Grant this many credits instead of the plan's full allotment (used for the signup trial). */
    amountOverride?: number,
  ): Promise<CreditWallet> {
    const allotment = amountOverride ?? planAllotment(plan);
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

  /** A paid plan lapsed without a renewal payment: remove the remaining
   * credits so usage stops until the customer renews. No-op for unlimited
   * wallets and workspaces with nothing left. */
  async expire(organizationId: string, workspaceId: string): Promise<void> {
    const wallet = await this.walletsRepository.findByWorkspace(workspaceId);
    if (!wallet || wallet.balance === null || wallet.balance <= 0) return;

    const removed = wallet.balance;
    await this.walletsRepository.setBalance(
      workspaceId,
      0,
      wallet.cycleStartAt ?? new Date(),
      wallet.cycleEndAt,
    );
    await this.transactionsRepository.create({
      organizationId,
      workspaceId,
      userId: null,
      amount: -removed,
      reason: CreditTransactionReason.PLAN_EXPIRED,
      balanceAfter: 0,
    });
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
      : await this.walletsRepository.create({
          organizationId,
          workspaceId,
          balance: allotment,
          cycleStartAt,
          cycleEndAt,
        });

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
