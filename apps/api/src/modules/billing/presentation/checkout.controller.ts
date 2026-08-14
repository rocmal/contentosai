import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { CheckoutService } from '../application/services/checkout.service';
import { CreateCheckoutOrderDto } from '../application/dto/create-checkout-order.dto';
import { CheckoutOrderResponseDto } from '../application/dto/checkout-order-response.dto';

@ApiTags('billing')
@ApiBearerAuth('access-token')
@Controller({ path: 'billing/checkout', version: '1' })
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('order')
  @RequirePermissions('billing.create')
  @ApiOperation({ summary: "Create a Razorpay order to upgrade the caller's organization to a plan" })
  async createOrder(
    @Body() dto: CreateCheckoutOrderDto,
    @CurrentUser('organizationId') organizationId: string | null,
  ): Promise<CheckoutOrderResponseDto> {
    if (!organizationId) {
      throw new BadRequestException('Your account is not attached to an organization yet.');
    }
    const { order, keyId } = await this.checkoutService.createOrder(organizationId, dto.plan);
    return new CheckoutOrderResponseDto(order, keyId);
  }
}
