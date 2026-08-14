import { BadRequestException, Injectable } from '@nestjs/common';
import { IPaymentProvider } from '../domain/interfaces/payment-provider.interface';
import { RazorpayProvider } from './providers/razorpay.provider';

const DEFAULT_PROVIDER = 'razorpay';

/**
 * Single point of payment-provider selection. Application services ask the
 * factory for "the payment provider" and never instantiate or import a
 * concrete gateway class themselves - adding a second gateway (e.g. for
 * non-India charge currencies later) never touches business logic.
 */
@Injectable()
export class PaymentProviderFactory {
  private readonly providers: Map<string, IPaymentProvider>;

  constructor(razorpayProvider: RazorpayProvider) {
    this.providers = new Map<string, IPaymentProvider>([[razorpayProvider.name, razorpayProvider]]);
  }

  getProvider(name: string = DEFAULT_PROVIDER): IPaymentProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new BadRequestException(
        `Unknown payment provider "${name}". Available providers: ${Array.from(this.providers.keys()).join(', ')}`,
      );
    }
    return provider;
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
