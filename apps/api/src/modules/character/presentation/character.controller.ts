import { Controller, Get, Param, Post, Body, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { CharacterService } from '../application/services/character.service';
import { GenerateCharacterDto } from '../application/dto/generate-character.dto';
import { JobStatusQueryDto } from '../application/dto/job-status-query.dto';

@ApiTags('character')
@ApiBearerAuth('access-token')
@Controller({ path: 'character', version: '1' })
export class CharacterController {
  constructor(private readonly characterService: CharacterService) {}

  @Post('generate')
  @RequirePermissions('character.generate')
  @ApiOperation({ summary: 'Submit a talking-avatar video generation job' })
  async generate(
    @Body() dto: GenerateCharacterDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') organizationId: string | null,
    @CurrentUser('workspaceId') workspaceId: string | null,
  ) {
    return this.characterService.submitJob(dto, { userId, organizationId, workspaceId });
  }

  @Get('jobs/:jobId')
  @RequirePermissions('character.generate')
  @ApiOperation({ summary: 'Check the status of a character video generation job' })
  async getJobStatus(@Param('jobId') jobId: string, @Query() query: JobStatusQueryDto) {
    return this.characterService.getJobStatus(query.provider, jobId);
  }

  @Get('providers')
  @ApiOperation({ summary: 'List available character video providers' })
  listProviders(): { providers: string[] } {
    return { providers: this.characterService.listProviders() };
  }
}
