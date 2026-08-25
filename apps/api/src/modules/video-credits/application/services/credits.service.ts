import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { VideoCreditWallet, availableCredits } from '../../domain/entities/credit-wallet.entity';
import { CreditTransactionType } from '../../domain/entities/credit-transaction.entity';
import { GenerationMode, GenerationTier, StylePreset } from '../../domain/enums/generation.enums';
import {
  VIDEO_CREDIT_WALLETS_REPOSITORY,
  IVideoCreditWalletsRepository,
} from '../../domain/repositories/credit-wallet-repository.interface';
import {
  VIDEO_CREDIT_TRANSACTIONS_REPOSITORY,
  IVideoCreditTransactionsRepository,
} from '../../domain/repositories/credit-transaction-repository.interface';
import {
  CATALOG_MODELS_REPOSITORY,
  ICatalogModelsRepository,
  ITierPricesRepository,
  TIER_PRICES_REPOSITORY,
} from '../../domain/repositories/catalog-repository.interface';
import {
  IModelPricesRepository,
  MODEL_PRICES_REPOSITORY,
} from '../../domain/repositories/model-price-repository.interface';
import {
  ITierRouter,
  RoutableCandidate,
  RoutingDecision,
  TIER_ROUTER,
} from '../../domain/services/tier-routing.strategy';

export interface GenerationIntent {
  readonly organizationId: string;
  readonly tier: GenerationTier;
  readonly mode: GenerationMode;
  readonly style: StylePreset;
  readonly quantity: number;
  readonly durationSeconds?: number | null;
  readonly requiresNativeAudio?: boolean;
  readonly requiresStatefulEditing?: boolean;
}

export interface VideoCreditReservation {
  readonly reservationId: string;
  readonly walletId: string;
  readonly credits: number;
  readonly modelId: string;
  readonly provider: string;
}

/**
 * Reserve -> commit / refund.
 *
 * Credits are held before the vendor call and settled after, rather than
 * debited on completion. Debiting at the end lets concurrent submits each pass
 * a balance check and overdraw the wallet; holding first makes the balance
 * check and the deduction the same atomic operation.
 */
@Injectable()
export class VideoCreditsService {
  private readonly logger = new Logger(VideoCreditsService.name);

  constructor(
    @Inject(VIDEO_CREDIT_WALLETS_REPOSITORY)
    private readonly wallets: IVideoCreditWalletsRepository,
    @Inject(VIDEO_CREDIT_TRANSACTIONS_REPOSITORY)
    private readonly transactions: IVideoCreditTransactionsRepository,
    @Inject(CATALOG_MODELS_REPOSITORY)
    private readonly catalog: ICatalogModelsRepository,
    @Inject(MODEL_PRICES_REPOSITORY)
    private readonly modelPrices: IModelPricesRepository,
    @Inject(TIER_PRICES_REPOSITORY)
    private readonly tierPrices: ITierPricesRepository,
    @Inject(TIER_ROUTER)
    private readonly router: ITierRouter,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Non-binding price check. Safe to call from the UI on every keystroke. */
  async quote(intent: GenerationIntent): Promise<RoutingDecision> {
    const at = new Date();

    const tierPrice = await this.tierPrices.findActive(intent.tier, intent.mode, at);
    if (!tierPrice) {
      throw new NotFoundException(
        `No published price for tier "${intent.tier}" mode "${intent.mode}"`,
      );
    }

    const models = await this.catalog.findEnabledByTier(intent.tier);
    const candidates: RoutableCandidate[] = [];
    for (const model of models) {
      const price = await this.modelPrices.findActive(model.modelId, at);
      if (price) {
        candidates.push({ model, price });
      }
    }

    const decision = this.router.resolve(
      {
        tier: intent.tier,
        mode: intent.mode,
        style: intent.style,
        quantity: intent.quantity,
        durationSeconds: intent.durationSeconds ?? null,
        requiresNativeAudio: intent.requiresNativeAudio ?? false,
        requiresStatefulEditing: intent.requiresStatefulEditing ?? false,
      },
      tierPrice,
      candidates,
    );

    if (decision.margin.belowFloor) {
      // Ops signal, not a user-facing failure. A pricing mistake of ours must
      // not surface as a rejected request.
      this.logger.warn(
        `Margin ${decision.margin.marginRatio} below floor for tier=${intent.tier} model=${decision.model.modelId}`,
      );
      this.eventEmitter.emit('credits.margin-below-floor', {
        tier: intent.tier,
        mode: intent.mode,
        modelId: decision.model.modelId,
        marginRatio: decision.margin.marginRatio,
      });
    }

    return decision;
  }

  async reserve(intent: GenerationIntent, feature: string, actorId: string): Promise<VideoCreditReservation> {
    const decision = await this.quote(intent);
    const wallet = await this.requireWallet(intent.organizationId);
    const reservationId = randomUUID();

    const held = await this.wallets.tryReserve(wallet.id, decision.charge.credits);
    if (!held) {
      throw new HttpException(
        `Insufficient credits: ${decision.charge.credits} required, ${availableCredits(wallet)} available`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    await this.transactions.create(
      {
        walletId: wallet.id,
        organizationId: wallet.organizationId,
        type: CreditTransactionType.RESERVE,
        credits: decision.charge.credits,
        reservationId,
        feature,
        modelId: decision.model.modelId,
        vendorCostUsd: decision.cost.riskAdjustedCostUsd.toFixed(6),
      },
      actorId,
    );

    return {
      reservationId,
      walletId: wallet.id,
      credits: decision.charge.credits,
      modelId: decision.model.modelId,
      provider: decision.model.provider,
    };
  }

  /** Settles a hold as spent. Idempotent: a second call is a no-op. */
  async commit(reservationId: string, actorId: string): Promise<void> {
    const reservation = await this.transactions.findReservation(reservationId);
    if (!reservation) {
      throw new NotFoundException(`Reservation "${reservationId}" not found`);
    }
    if (await this.transactions.isSettled(reservationId)) {
      return;
    }

    const moved = await this.wallets.commitReservation(
      reservation.walletId,
      reservation.credits,
      reservation.credits,
    );
    if (!moved) {
      this.logger.error(
        `Commit failed for reservation ${reservationId}: wallet ${reservation.walletId} held fewer credits than expected`,
      );
      return;
    }

    await this.transactions.create(
      {
        walletId: reservation.walletId,
        organizationId: reservation.organizationId,
        type: CreditTransactionType.COMMIT,
        credits: reservation.credits,
        reservationId,
        feature: reservation.feature,
        modelId: reservation.modelId,
        vendorCostUsd: reservation.vendorCostUsd,
      },
      actorId,
    );
  }

  /** Releases a hold without charging. Idempotent. */
  async refund(reservationId: string, reason: string, actorId: string): Promise<void> {
    const reservation = await this.transactions.findReservation(reservationId);
    if (!reservation) {
      throw new NotFoundException(`Reservation "${reservationId}" not found`);
    }
    if (await this.transactions.isSettled(reservationId)) {
      return;
    }

    const released = await this.wallets.releaseReservation(
      reservation.walletId,
      reservation.credits,
    );
    if (!released) {
      this.logger.error(`Refund failed for reservation ${reservationId}: nothing held`);
      return;
    }

    await this.transactions.create(
      {
        walletId: reservation.walletId,
        organizationId: reservation.organizationId,
        type: CreditTransactionType.REFUND,
        credits: reservation.credits,
        reservationId,
        feature: reservation.feature,
        modelId: reservation.modelId,
        reason,
      },
      actorId,
    );
  }

  async getWallet(organizationId: string): Promise<VideoCreditWallet> {
    return this.requireWallet(organizationId);
  }

  private async requireWallet(organizationId: string): Promise<VideoCreditWallet> {
    const wallet = await this.wallets.findCurrent(organizationId, new Date());
    if (!wallet) {
      // Wallets are provisioned by the billing period job, not lazily here -
      // creating one on demand would hand free credits to an unsubscribed org.
      throw new NotFoundException(
        `No active credit wallet for organization "${organizationId}"`,
      );
    }
    return wallet;
  }
}
