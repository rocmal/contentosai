import { ApiProperty } from '@nestjs/swagger';
import { RoutingDecision } from '../../domain/services/tier-routing.strategy';
import { BillingUnit, GenerationTier } from '../../domain/enums/generation.enums';

export class QuoteResponseDto {
  @ApiProperty({ enum: GenerationTier }) tier: GenerationTier;
  @ApiProperty({ enum: BillingUnit }) unit: BillingUnit;
  @ApiProperty() billableUnits: number;
  @ApiProperty() credits: number;

  constructor(decision: RoutingDecision) {
    this.tier = decision.charge.tier;
    this.unit = decision.charge.unit;
    this.billableUnits = decision.charge.billableUnits;
    this.credits = decision.charge.credits;
    // The chosen model, vendor cost and margin are deliberately NOT exposed.
    // Publishing them would re-couple the client to the model roster and undo
    // the whole point of tiering.
  }
}
