import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

/** What can be changed on a post that has not been published yet. */
export class EditScheduledPostDto {
  @ApiPropertyOptional({ description: 'Title shown in the calendar' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'The text posted with it, including any hashtags' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  caption?: string;

  @ApiPropertyOptional({ description: 'New date and time to publish (must be in the future)' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
