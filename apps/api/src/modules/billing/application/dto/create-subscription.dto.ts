import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { SubscriptionStatus } from '../../domain/entities/subscription.entity';

export class CreateSubscriptionDto {
  @ApiProperty()
  @IsUUID('4')
  organizationId!: string;

  @ApiProperty({ example: 'pro' })
  @IsString()
  @MaxLength(100)
  plan!: string;

  @ApiPropertyOptional({ enum: SubscriptionStatus })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiPropertyOptional({ example: 'razorpay' })
  @IsOptional()
  @IsString()
  gatewayProvider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gatewayCustomerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gatewaySubscriptionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  currentPeriodEnd?: string;
}
