import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsInt, IsString, MaxLength, Min } from 'class-validator';

export class SceneShotDto {
  @ApiProperty({ example: 0, description: 'Inclusive start second of the shot' })
  @IsInt()
  @Min(0)
  startSecond!: number;

  @ApiProperty({ example: 3, description: 'Exclusive end second of the shot' })
  @IsInt()
  @Min(1)
  endSecond!: number;

  @ApiProperty({ example: 'A barista pours milk into a flat white, slow dolly in.' })
  @IsString()
  @MaxLength(2000)
  description!: string;

  @ApiPropertyOptional({
    type: [Number],
    example: [0, 1],
    description: 'Indexes into referenceImages, rendered as <IMAGE_REF_n> tags',
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @ArrayMaxSize(8)
  referenceImageIndexes: number[] = [];
}
