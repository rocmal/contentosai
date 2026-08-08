import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { VoiceTemplatesService } from '../application/services/voice-templates.service';
import { CreateVoiceTemplateDto } from '../application/dto/create-voice-template.dto';
import { VoiceTemplateResponseDto } from '../application/dto/voice-template-response.dto';

@ApiTags('voice-templates')
@ApiBearerAuth('access-token')
@Controller({ path: 'voice-templates', version: '1' })
export class VoiceTemplatesController {
  constructor(private readonly voiceTemplatesService: VoiceTemplatesService) {}

  @Post()
  @RequirePermissions('voice-templates.create')
  @ApiOperation({
    summary: 'Save a provider + voice as a reusable template (private to you, or shared with your team)',
  })
  async create(
    @Body() dto: CreateVoiceTemplateDto,
    @CurrentUser('id') userId: string,
  ): Promise<VoiceTemplateResponseDto> {
    const voiceTemplate = await this.voiceTemplatesService.create(dto, userId);
    return new VoiceTemplateResponseDto(voiceTemplate);
  }

  @Get()
  @RequirePermissions('voice-templates.read')
  @ApiOperation({
    summary: 'List templates available to you - your own + everything shared with your team',
  })
  async findAvailable(@CurrentUser() user: AuthenticatedUser) {
    if (!user.workspaceId) {
      return { items: [] };
    }
    const templates = await this.voiceTemplatesService.findAvailableForUser(
      user.workspaceId,
      user.id,
    );
    return { items: templates.map((template) => new VoiceTemplateResponseDto(template)) };
  }

  @Delete(':id')
  @RequirePermissions('voice-templates.delete')
  @ApiOperation({ summary: 'Delete a template you created' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ deleted: boolean }> {
    await this.voiceTemplatesService.remove(id, userId);
    return { deleted: true };
  }
}
