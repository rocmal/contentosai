import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Marks a project ready and points it at the MediaAsset the person just
 * saved to the gallery (POST /media/upload of the composited export) - a
 * separate, narrower endpoint from the general PATCH so "finishing" a
 * project is one explicit action, not something that can happen as a side
 * effect of an ordinary auto-save PATCH racing with the export flow. */
export class FinishVideoProjectDto {
  @ApiProperty({ description: 'The MediaAsset id the composited export was saved as' })
  @IsUUID('4')
  finalAssetId!: string;
}
