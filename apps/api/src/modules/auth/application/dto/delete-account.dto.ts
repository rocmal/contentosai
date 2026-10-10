import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeleteAccountDto {
  @ApiPropertyOptional({ description: 'Current password. Required unless the account only signs in with Google/GitHub/Microsoft.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  password?: string;
}
