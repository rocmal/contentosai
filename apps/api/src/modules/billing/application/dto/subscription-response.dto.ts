import { ApiProperty } from '@nestjs/swagger';
import { Subscription, SubscriptionStatus } from '../../domain/entities/subscription.entity';

export class SubscriptionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() plan: string;
  @ApiProperty({ enum: SubscriptionStatus }) status: SubscriptionStatus;
  @ApiProperty({ nullable: true }) stripeCustomerId: string | null;
  @ApiProperty({ nullable: true }) stripeSubscriptionId: string | null;
  @ApiProperty({ nullable: true }) currentPeriodEnd: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(subscription: Subscription) {
    this.id = subscription.id;
    this.organizationId = subscription.organizationId;
    this.plan = subscription.plan;
    this.status = subscription.status;
    this.stripeCustomerId = subscription.stripeCustomerId;
    this.stripeSubscriptionId = subscription.stripeSubscriptionId;
    this.currentPeriodEnd = subscription.currentPeriodEnd;
    this.createdAt = subscription.createdAt;
    this.updatedAt = subscription.updatedAt;
  }
}
