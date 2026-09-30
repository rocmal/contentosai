import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { AgentsService } from '../application/services/agents.service';
import { RunAgentDto } from '../application/dto/run-agent.dto';
import { AgentRunResponseDto } from '../application/dto/agent-run-response.dto';

@ApiTags('agents')
@ApiBearerAuth('access-token')
@Controller({ path: 'agents', version: '1' })
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  @RequirePermissions('ai.generate')
  @ApiOperation({ summary: 'List the available AI agents with their run counts' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return { items: await this.agentsService.listAgents(user) };
  }

  @Get('runs')
  @RequirePermissions('ai.generate')
  @ApiOperation({ summary: 'List past agent runs, newest first' })
  async listRuns(
    @Query() query: PaginationQueryDto,
    @Query('agentId') agentId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.agentsService.listRuns(user, {
      agentId,
      page: query.page,
      limit: query.limit,
    });
    return { items: result.items.map((run) => new AgentRunResponseDto(run)), meta: result.meta };
  }

  @Post(':agentId/run')
  @RequirePermissions('ai.generate')
  @ApiOperation({ summary: 'Run an agent on a brief or draft; the result is saved to run history' })
  async run(
    @Param('agentId') agentId: string,
    @Body() dto: RunAgentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AgentRunResponseDto> {
    const run = await this.agentsService.run(agentId, dto, user);
    return new AgentRunResponseDto(run);
  }
}
