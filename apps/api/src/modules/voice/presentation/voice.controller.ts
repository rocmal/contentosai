import { Body, Controller, Get, Post, Query, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { RawResponse } from '@common/decorators/raw-response.decorator';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { VoiceService, VoiceProviderStatus } from '../application/services/voice.service';
import { GenerateSpeechDto } from '../application/dto/generate-speech.dto';
import { VoiceInfo } from '../domain/interfaces/voice-provider.interface';

@ApiTags('voice')
@ApiBearerAuth('access-token')
@Controller({ path: 'voice', version: '1' })
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('generate')
  @RequirePermissions('voice.generate')
  @RawResponse()
  @ApiProduces('audio/mpeg')
  @ApiOperation({ summary: 'Synthesize speech with the selected provider and return raw audio' })
  async generate(
    @Body() dto: GenerateSpeechDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StreamableFile> {
    const result = await this.voiceService.generateSpeech(dto, user);
    const buffer = Buffer.from(result.audioBase64, 'base64');
    // A raw Buffer return is NOT enough on its own: Nest's default response
    // handling treats any object (Buffers included - typeof buffer ===
    // 'object') as JSON and serializes it to {"type":"Buffer","data":[...]}.
    // StreamableFile is Nest's documented escape hatch for binary bodies -
    // it's detected before that generic JSON path and streamed/sent as-is.
    return new StreamableFile(buffer, { type: result.mimeType });
  }

  @Get('providers')
  @ApiOperation({ summary: 'List available voice providers' })
  listProviders(): { providers: string[] } {
    return { providers: this.voiceService.listProviders() };
  }

  @Get('providers/status')
  @RequirePermissions('voice.generate')
  @ApiOperation({ summary: 'Check configuration/reachability of every voice provider' })
  async getProviderStatuses(): Promise<{ statuses: VoiceProviderStatus[] }> {
    return { statuses: await this.voiceService.getProviderStatuses() };
  }

  @Get('voices')
  @RequirePermissions('voice.generate')
  @ApiOperation({
    summary: 'List voices available for a given provider (defaults to VOICE_PROVIDER)',
  })
  async listVoices(@Query('provider') provider?: string): Promise<{ voices: VoiceInfo[] }> {
    return { voices: await this.voiceService.listVoices(provider) };
  }
}
