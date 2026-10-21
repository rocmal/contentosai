import { ApiProperty } from '@nestjs/swagger';
import { CreditWallet } from '../../domain/entities/credit-wallet.entity';

export class CreditWalletResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() workspaceId: string;
  @ApiProperty({ nullable: true, description: 'null = unlimited (Enterprise plan)' }) balance: number | null;
  @ApiProperty({ nullable: true }) cycleStartAt: Date | null;
  @ApiProperty({ nullable: true }) cycleEndAt: Date | null;
  @ApiProperty({
    nullable: true,
    description:
      'Set while the paid plan has lapsed: the balance is kept but cannot be spent until renewal',
  })
  pausedAt: Date | null;

  constructor(wallet: CreditWallet) {
    this.id = wallet.id;
    this.organizationId = wallet.organizationId;
    this.workspaceId = wallet.workspaceId;
    this.balance = wallet.balance;
    this.cycleStartAt = wallet.cycleStartAt;
    this.cycleEndAt = wallet.cycleEndAt;
    this.pausedAt = wallet.pausedAt;
  }
}
