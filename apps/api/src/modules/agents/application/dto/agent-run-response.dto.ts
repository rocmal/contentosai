import { ApiProperty } from '@nestjs/swagger';
import { AgentRun, AgentRunFlag } from '../../domain/entities/agent-run.entity';

export class AgentRunResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() agentId: string;
  @ApiProperty() input: string;
  @ApiProperty() output: string;
  @ApiProperty() provider: string;
  @ApiProperty() model: string;
  @ApiProperty({ nullable: true }) complianceFlags: AgentRunFlag[] | null;
  @ApiProperty() createdAt: Date;

  constructor(run: AgentRun) {
    this.id = run.id;
    this.agentId = run.agentId;
    this.input = run.input;
    this.output = run.output;
    this.provider = run.provider;
    this.model = run.model;
    this.complianceFlags = run.complianceFlags;
    this.createdAt = run.createdAt;
  }
}
