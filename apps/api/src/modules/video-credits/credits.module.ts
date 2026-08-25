import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { VideoCreditWalletModel } from './infrastructure/persistence/credit-wallet.model';
import { VideoCreditTransactionModel } from './infrastructure/persistence/credit-transaction.model';
import { ModelPriceModel } from './infrastructure/persistence/model-price.model';
import { CatalogModelModel } from './infrastructure/persistence/catalog-model.model';
import { TierPriceModel } from './infrastructure/persistence/tier-price.model';
import { VideoCreditWalletsRepository } from './infrastructure/persistence/credit-wallets.repository';
import { VideoCreditTransactionsRepository } from './infrastructure/persistence/credit-transactions.repository';
import { ModelPricesRepository } from './infrastructure/persistence/model-prices.repository';
import { CatalogModelsRepository } from './infrastructure/persistence/catalog-models.repository';
import { TierPricesRepository } from './infrastructure/persistence/tier-prices.repository';
import { VIDEO_CREDIT_WALLETS_REPOSITORY } from './domain/repositories/credit-wallet-repository.interface';
import { VIDEO_CREDIT_TRANSACTIONS_REPOSITORY } from './domain/repositories/credit-transaction-repository.interface';
import { MODEL_PRICES_REPOSITORY } from './domain/repositories/model-price-repository.interface';
import {
  CATALOG_MODELS_REPOSITORY,
  TIER_PRICES_REPOSITORY,
} from './domain/repositories/catalog-repository.interface';
import {
  CheapestEligibleTierRouter,
  TIER_ROUTER,
} from './domain/services/tier-routing.strategy';
import { VideoCreditsService } from './application/services/credits.service';
import { VideoCreditListener } from './application/services/video-credit.listener';
import { VideoCreditsController } from './presentation/credits.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([
      VideoCreditWalletModel,
      VideoCreditTransactionModel,
      ModelPriceModel,
      CatalogModelModel,
      TierPriceModel,
    ]),
  ],
  controllers: [VideoCreditsController],
  providers: [
    { provide: VIDEO_CREDIT_WALLETS_REPOSITORY, useClass: VideoCreditWalletsRepository },
    { provide: VIDEO_CREDIT_TRANSACTIONS_REPOSITORY, useClass: VideoCreditTransactionsRepository },
    { provide: MODEL_PRICES_REPOSITORY, useClass: ModelPricesRepository },
    { provide: CATALOG_MODELS_REPOSITORY, useClass: CatalogModelsRepository },
    { provide: TIER_PRICES_REPOSITORY, useClass: TierPricesRepository },
    // Swapping in a QualityFirst or LatencyFirst router is a one-line change
    // here; nothing outside this binding knows which strategy is in play.
    { provide: TIER_ROUTER, useClass: CheapestEligibleTierRouter },
    VideoCreditsService,
    VideoCreditListener,
  ],
  exports: [VideoCreditsService],
})
export class VideoCreditsModule {}
