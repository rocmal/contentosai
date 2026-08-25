import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VideoEditTurn } from '../../domain/entities/video-edit-turn.entity';
import { VideoTask, VideoTurnStatus } from '../../domain/interfaces/conversational-video.port';

export class VideoEditTurnResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() sessionId: string;
  @ApiPropertyOptional({ nullable: true }) parentTurnId: string | null;
  @ApiProperty() prompt: string;
  @ApiProperty({ enum: VideoTask }) task: VideoTask;
  @ApiProperty({ enum: VideoTurnStatus }) status: VideoTurnStatus;
  @ApiPropertyOptional({ nullable: true }) mediaAssetId: string | null;
  @ApiProperty() editable: boolean;
  @ApiPropertyOptional({ nullable: true }) failureReason: string | null;
  @ApiProperty() createdAt: Date;

  constructor(turn: VideoEditTurn) {
    this.id = turn.id;
    this.sessionId = turn.sessionId;
    this.parentTurnId = turn.parentTurnId;
    this.prompt = turn.prompt;
    this.task = turn.task;
    this.status = turn.status;
    this.mediaAssetId = turn.mediaAssetId;
    this.editable = turn.editable;
    this.failureReason = turn.failureReason;
    this.createdAt = turn.createdAt;
    // sourceUri and providerTurnId are deliberately not exposed: the former
    // expires, the latter is a vendor identifier clients have no use for.
  }
}
