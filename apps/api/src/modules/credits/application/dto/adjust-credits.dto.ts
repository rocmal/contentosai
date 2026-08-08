import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AdjustCreditsDto {
  @ApiProperty({ description: 'Positive to grant, negative to deduct.', example: 500 })
  @IsInt()
  amount!: number;

  @ApiPropertyOptional({ example: 'Support ticket #482 - generation failed without refunding' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class WorkspaceScopedQueryDto {
  @ApiProperty()
  @IsUUID('4')
  workspaceId!: string;
}
