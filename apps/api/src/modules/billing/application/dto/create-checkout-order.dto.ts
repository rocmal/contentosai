import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { PurchasablePlan } from '../../billing.constants';

export class CreateCheckoutOrderDto {
  @ApiProperty({ enum: ['starter', 'pro'] })
  @IsIn(['starter', 'pro'])
  plan!: PurchasablePlan;
}
