import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RenameMediaAssetDto {
  @ApiProperty({ example: 'Diwali greeting - family' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fileName!: string;
}
