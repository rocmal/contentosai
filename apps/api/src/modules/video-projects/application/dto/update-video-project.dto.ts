import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateVideoProjectDto } from './create-video-project.dto';

/** Everything but organizationId/workspaceId/source is editable - this is
 * the auto-save target as someone works in the Scene Builder, so it needs
 * to accept a partial patch of whatever changed (title, scenes, narration
 * settings, ...) without requiring the whole object every time. `source`
 * is excluded because a project's creation flow (Scene Builder vs a future
 * prompt/upload/template flow) isn't something that changes after the
 * fact. */
export class UpdateVideoProjectDto extends PartialType(
  OmitType(CreateVideoProjectDto, ['organizationId', 'workspaceId', 'source'] as const),
) {}
