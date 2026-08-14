import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'] as const;
export type CompanySize = (typeof COMPANY_SIZES)[number];

export class CreateSalesInquiryDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  fullName!: string;

  @ApiProperty({ example: 'jane@acme.com' })
  @IsEmail()
  workEmail!: string;

  @ApiProperty({ example: 'Acme Inc.' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  companyName!: string;

  @ApiProperty({ enum: COMPANY_SIZES })
  @IsIn(COMPANY_SIZES)
  companySize!: CompanySize;

  @ApiPropertyOptional({ example: '+1 555 0100' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({ example: 'We need SSO and usage-based billing for a 200-seat rollout.' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message!: string;
}
