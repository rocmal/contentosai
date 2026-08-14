import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { WorkspacesModule } from '@modules/workspaces/workspaces.module';
import { CreditsModule } from '@modules/credits/credits.module';
import { SubscriptionModel } from './infrastructure/persistence/subscription.model';
import { SubscriptionsRepository } from './infrastructure/persistence/subscriptions.repository';
import { SUBSCRIPTIONS_REPOSITORY } from './domain/repositories/subscription-repository.interface';
import { SubscriptionsService } from './application/services/subscriptions.service';
import { CheckoutService } from './application/services/checkout.service';
import { SubscriptionsController } from './presentation/subscriptions.controller';
import { CheckoutController } from './presentation/checkout.controller';
import { RazorpayWebhookController } from './presentation/razorpay-webhook.controller';
import { RazorpayProvider } from './infrastructure/providers/razorpay.provider';
import { PaymentProviderFactory } from './infrastructure/payment-provider.factory';

@Module({
  imports: [SequelizeModule.forFeature([SubscriptionModel]), WorkspacesModule, CreditsModule],
  controllers: [SubscriptionsController, CheckoutController, RazorpayWebhookController],
  providers: [
    SubscriptionsService,
    CheckoutService,
    { provide: SUBSCRIPTIONS_REPOSITORY, useClass: SubscriptionsRepository },
    RazorpayProvider,
    PaymentProviderFactory,
  ],
  exports: [SubscriptionsService, SUBSCRIPTIONS_REPOSITORY, PaymentProviderFactory],
})
export class BillingModule {}
