import { ApiProperty } from '@nestjs/swagger';
import { CreditTransaction, CreditTransactionReason } from '../../domain/entities/credit-transaction.entity';

export class CreditTransactionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ nullable: true }) userId: string | null;
  @ApiProperty() amount: number;
  @ApiProperty({ enum: CreditTransactionReason }) reason: CreditTransactionReason;
  @ApiProperty({ nullable: true }) relatedEntityId: string | null;
  @ApiProperty({ nullable: true }) balanceAfter: number | null;
  @ApiProperty() createdAt: Date;

  constructor(tx: CreditTransaction) {
    this.id = tx.id;
    this.userId = tx.userId;
    this.amount = tx.amount;
    this.reason = tx.reason;
    this.relatedEntityId = tx.relatedEntityId;
    this.balanceAfter = tx.balanceAfter;
    this.createdAt = tx.createdAt;
  }
}
