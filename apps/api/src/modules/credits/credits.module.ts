import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CreditWalletModel } from './infrastructure/persistence/credit-wallet.model';
import { CreditTransactionModel } from './infrastructure/persistence/credit-transaction.model';
import { CreditWalletsRepository } from './infrastructure/persistence/credit-wallets.repository';
import { CreditTransactionsRepository } from './infrastructure/persistence/credit-transactions.repository';
import { CREDIT_WALLETS_REPOSITORY } from './domain/repositories/credit-wallet-repository.interface';
import { CREDIT_TRANSACTIONS_REPOSITORY } from './domain/repositories/credit-transaction-repository.interface';
import { CreditsService } from './application/services/credits.service';
import { CreditsController } from './presentation/credits.controller';

@Module({
  imports: [SequelizeModule.forFeature([CreditWalletModel, CreditTransactionModel])],
  controllers: [CreditsController],
  providers: [
    CreditsService,
    { provide: CREDIT_WALLETS_REPOSITORY, useClass: CreditWalletsRepository },
    { provide: CREDIT_TRANSACTIONS_REPOSITORY, useClass: CreditTransactionsRepository },
  ],
  exports: [CreditsService],
})
export class CreditsModule {}
