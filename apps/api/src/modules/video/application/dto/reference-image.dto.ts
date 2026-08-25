import { ApiProperty } from '@nestjs/swagger';
import { IsBase64, IsBoolean, IsIn, IsString } from 'class-validator';

const SUPPORTED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export class ReferenceImageDto {
  @ApiProperty({ description: 'Base64-encoded image bytes without a data-URI prefix' })
  @IsString()
  @IsBase64()
  data!: string;

  @ApiProperty({ enum: SUPPORTED_IMAGE_MIME_TYPES })
  @IsIn(SUPPORTED_IMAGE_MIME_TYPES)
  mimeType!: (typeof SUPPORTED_IMAGE_MIME_TYPES)[number];

  @ApiProperty({
    default: false,
    description: 'Bind to <FIRST_FRAME> rather than <IMAGE_REF_n>. At most one per request.',
  })
  @IsBoolean()
  isFirstFrame = false;
}
