import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ChargeSceneVideoDto {
  @ApiPropertyOptional({
    description: 'The Scene Builder draft the video was made from, kept with the charge',
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}
