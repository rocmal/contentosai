import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { VoiceService } from '../application/services/voice.service';
import { GenerateSpeechDto } from '../application/dto/generate-speech.dto';

@ApiTags('voice')
@ApiBearerAuth('access-token')
@Controller({ path: 'voice', version: '1' })
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('generate')
  @RequirePermissions('voice.generate')
  @ApiOperation({ summary: 'Synthesize speech with the selected provider' })
  async generate(@Body() dto: GenerateSpeechDto, @CurrentUser('id') userId: string) {
    return this.voiceService.generateSpeech(dto, userId);
  }

  @Get('providers')
  @ApiOperation({ summary: 'List available voice providers' })
  listProviders(): { providers: string[] } {
    return { providers: this.voiceService.listProviders() };
  }
}
