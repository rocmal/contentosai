import { Controller, Headers, HttpCode, Logger, Post, RawBodyRequest, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { PaymentProviderFactory } from '../infrastructure/payment-provider.factory';
import { CheckoutService } from '../application/services/checkout.service';

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string;
        notes?: Record<string, string>;
      };
    };
  };
}

/** Razorpay's server-to-server callback - not a frontend-facing endpoint, so
 * it's excluded from the authenticated Swagger surface and exempt from the
 * global JwtAuthGuard (Razorpay has no JWT). Trust is instead established by
 * verifying the payload's HMAC signature before acting on anything in it. */
@ApiExcludeController()
@Controller({ path: 'billing/webhooks/razorpay', version: '1' })
export class RazorpayWebhookController {
  private readonly logger = new Logger(RazorpayWebhookController.name);

  constructor(
    private readonly paymentProviderFactory: PaymentProviderFactory,
    private readonly checkoutService: CheckoutService,
  ) {}

  @Post()
  @Public()
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string | undefined,
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody?.toString('utf8') ?? '';
    const provider = this.paymentProviderFactory.getProvider('razorpay');

    if (!signature || !provider.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid Razorpay webhook signature');
    }

    const payload = JSON.parse(rawBody) as RazorpayWebhookPayload;

    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const organizationId = payment.notes?.organizationId;
      const plan = payment.notes?.plan;
      if (organizationId && plan) {
        await this.checkoutService.activateFromPayment({
          organizationId,
          plan,
          gatewayPaymentId: payment.id,
        });
      } else {
        this.logger.warn(`payment.captured webhook missing organizationId/plan notes (payment ${payment.id})`);
      }
    } else {
      // Razorpay sends a separate webhook call per event (payment.authorized,
      // order.paid, payment.captured, ...) - logging every type we receive
      // but don't act on makes it obvious when e.g. auto-capture isn't
      // configured and captured never arrives, instead of a silent no-op.
      this.logger.log(`Received unhandled Razorpay event: ${payload.event}`);
    }

    return { received: true };
  }
}
