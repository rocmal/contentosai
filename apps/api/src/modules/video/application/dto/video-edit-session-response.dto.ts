import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VideoEditSession, VideoEditSessionStatus } from '../../domain/entities/video-edit-session.entity';
import { VideoEditTurn } from '../../domain/entities/video-edit-turn.entity';
import { VideoAspectRatio } from '../../domain/interfaces/conversational-video.port';
import { VideoEditTurnResponseDto } from './video-edit-turn-response.dto';

export class VideoEditSessionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() workspaceId: string;
  @ApiProperty() title: string;
  @ApiProperty() provider: string;
  @ApiProperty() modelId: string;
  @ApiProperty({ enum: VideoAspectRatio }) aspectRatio: VideoAspectRatio;
  @ApiProperty({ enum: VideoEditSessionStatus }) status: VideoEditSessionStatus;
  @ApiPropertyOptional({ type: [VideoEditTurnResponseDto] }) turns?: VideoEditTurnResponseDto[];
  @ApiProperty() createdAt: Date;

  constructor(session: VideoEditSession, turns?: VideoEditTurn[]) {
    this.id = session.id;
    this.organizationId = session.organizationId;
    this.workspaceId = session.workspaceId;
    this.title = session.title;
    this.provider = session.provider;
    this.modelId = session.modelId;
    this.aspectRatio = session.aspectRatio;
    this.status = session.status;
    this.createdAt = session.createdAt;
    if (turns) {
      this.turns = turns.map((turn) => new VideoEditTurnResponseDto(turn));
    }
  }
}
