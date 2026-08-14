import { ApiProperty } from '@nestjs/swagger';
import { Subscription, SubscriptionStatus } from '../../domain/entities/subscription.entity';

export class SubscriptionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() plan: string;
  @ApiProperty({ enum: SubscriptionStatus }) status: SubscriptionStatus;
  @ApiProperty({ nullable: true }) gatewayProvider: string | null;
  @ApiProperty({ nullable: true }) gatewayCustomerId: string | null;
  @ApiProperty({ nullable: true }) gatewaySubscriptionId: string | null;
  @ApiProperty({ nullable: true }) currentPeriodEnd: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(subscription: Subscription) {
    this.id = subscription.id;
    this.organizationId = subscription.organizationId;
    this.plan = subscription.plan;
    this.status = subscription.status;
    this.gatewayProvider = subscription.gatewayProvider;
    this.gatewayCustomerId = subscription.gatewayCustomerId;
    this.gatewaySubscriptionId = subscription.gatewaySubscriptionId;
    this.currentPeriodEnd = subscription.currentPeriodEnd;
    this.createdAt = subscription.createdAt;
    this.updatedAt = subscription.updatedAt;
  }
}
