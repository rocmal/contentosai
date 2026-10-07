import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUuidParamPipe } from '@common/pipes/parse-uuid-param.pipe';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@common/interfaces/jwt-payload.interface';
import { CustomVoicesService } from '../application/services/custom-voices.service';
import { CreateCustomVoiceDto } from '../application/dto/create-custom-voice.dto';
import { CustomVoiceResponseDto } from '../application/dto/custom-voice-response.dto';

const MAX_RECORDING_BYTES = 10 * 1024 * 1024;

@ApiTags('custom-voices')
@ApiBearerAuth('access-token')
@Controller({ path: 'custom-voices', version: '1' })
export class CustomVoicesController {
  constructor(private readonly customVoicesService: CustomVoicesService) {}

  @Post()
  @RequirePermissions('voice.generate')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Turn a recording of your own voice into a named voice you can pick in Voice Studio',
  })
  async create(
    @UploadedFile(
      new ParseFilePipeBuilder().addMaxSizeValidator({ maxSize: MAX_RECORDING_BYTES }).build(),
    )
    file: Express.Multer.File,
    @Body() dto: CreateCustomVoiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CustomVoiceResponseDto> {
    const voice = await this.customVoicesService.create(user, dto.name, dto.consent, file);
    return new CustomVoiceResponseDto(voice);
  }

  @Get()
  @RequirePermissions('voice.generate')
  @ApiOperation({ summary: 'List the voices recorded in this workspace' })
  async list(@CurrentUser() user: AuthenticatedUser): Promise<{ items: CustomVoiceResponseDto[] }> {
    const voices = await this.customVoicesService.list(user.workspaceId);
    return { items: voices.map((voice) => new CustomVoiceResponseDto(voice)) };
  }

  @Delete(':id')
  @RequirePermissions('voice.generate')
  @ApiOperation({ summary: 'Delete a voice you recorded' })
  async remove(
    @Param('id', ParseUuidParamPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ deleted: boolean }> {
    await this.customVoicesService.remove(id, user);
    return { deleted: true };
  }
}
