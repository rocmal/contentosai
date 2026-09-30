import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ExtractBrandDto {
  @ApiProperty({ example: 'https://licindia.in' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  websiteUrl!: string;
}
