import { ApiProperty } from '@nestjs/swagger';
import { VideoCreditWallet, availableCredits } from '../../domain/entities/credit-wallet.entity';

export class WalletResponseDto {
  @ApiProperty() organizationId: string;
  @ApiProperty() plan: string;
  @ApiProperty() grantedCredits: number;
  @ApiProperty() reservedCredits: number;
  @ApiProperty() consumedCredits: number;
  @ApiProperty() availableCredits: number;
  @ApiProperty() periodStart: Date;
  @ApiProperty() periodEnd: Date;

  constructor(wallet: VideoCreditWallet) {
    this.organizationId = wallet.organizationId;
    this.plan = wallet.plan;
    this.grantedCredits = wallet.grantedCredits;
    this.reservedCredits = wallet.reservedCredits;
    this.consumedCredits = wallet.consumedCredits;
    this.availableCredits = availableCredits(wallet);
    this.periodStart = wallet.periodStart;
    this.periodEnd = wallet.periodEnd;
  }
}
