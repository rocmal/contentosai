import { ApiProperty } from '@nestjs/swagger';
import { PaymentOrder } from '../../domain/interfaces/payment-provider.interface';

/** What the frontend needs to open the Razorpay Checkout widget - see
 * https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/. */
export class CheckoutOrderResponseDto {
  @ApiProperty() orderId: string;
  @ApiProperty() amount: number;
  @ApiProperty() currency: string;
  @ApiProperty() keyId: string;

  constructor(order: PaymentOrder, keyId: string) {
    this.orderId = order.id;
    this.amount = order.amount;
    this.currency = order.currency;
    this.keyId = keyId;
  }
}
