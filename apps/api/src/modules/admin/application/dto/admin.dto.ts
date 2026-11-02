import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotIn,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PurchasablePlan } from '@modules/billing/billing.constants';

/** Most 30-day periods one admin action can give (a year). */
export const MAX_GIVEN_PERIODS = 12;

/** Most credits one adjustment can add or remove: a slip of the keyboard should not hand out a year of video. */
export const MAX_CREDIT_ADJUSTMENT = 100_000;

export class SearchCustomersQueryDto {
  @ApiPropertyOptional({
    description: "Part of the organization's name, a person's email or name, or an exact id",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit = 25;
}

export class RecentActivityQueryDto {
  @ApiPropertyOptional({ default: 30, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 30;
}

/** Every admin change says why: the reason is kept in the audit log, never shown to the customer. */
export class AdminReasonDto {
  @ApiProperty({ example: 'Support ticket #482: video failed but was charged' })
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}

export class AdminAdjustCreditsDto extends AdminReasonDto {
  @ApiProperty({ description: 'Positive to add, negative to remove.', example: 500 })
  @IsInt()
  @IsNotIn([0], { message: 'amount must not be 0' })
  @Min(-MAX_CREDIT_ADJUSTMENT)
  @Max(MAX_CREDIT_ADJUSTMENT)
  amount!: number;
}

export class AdminGivePlanDto extends AdminReasonDto {
  @ApiProperty({
    enum: ['starter', 'pro'],
    description:
      'Given without a payment: fresh plan credits every 30 days, lapses after the last period.',
  })
  @IsIn(['starter', 'pro'])
  plan!: PurchasablePlan;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: MAX_GIVEN_PERIODS })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_GIVEN_PERIODS)
  months = 1;
}

export type AdminAccountPlan = 'trial' | PurchasablePlan;

/** Opening an account for someone, until the payment gateway is live. */
export class AdminCreateCustomerDto extends AdminReasonDto {
  @ApiProperty({ example: 'advisor@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Gurpreet' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiPropertyOptional({ example: 'Singh' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName = '';

  @ApiPropertyOptional({
    example: 'Singh Insurance Advisors',
    description: 'Default: "<first name>\'s Workspace"',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  organizationName?: string;

  @ApiProperty({ enum: ['trial', 'starter', 'pro'] })
  @IsIn(['trial', 'starter', 'pro'])
  plan!: AdminAccountPlan;

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: MAX_GIVEN_PERIODS })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_GIVEN_PERIODS)
  months = 1;

  @ApiPropertyOptional({
    default: true,
    description: 'Email them the link to choose a password (the link is also returned to copy)',
  })
  @IsOptional()
  @IsBoolean()
  sendEmail = true;
}
