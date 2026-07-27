import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { ImageService } from '../application/services/image.service';
import { GenerateImageDto } from '../application/dto/generate-image.dto';

@ApiTags('image')
@ApiBearerAuth('access-token')
@Controller({ path: 'image', version: '1' })
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @Post('generate')
  @RequirePermissions('image.generate')
  @ApiOperation({ summary: 'Generate an image with the selected provider' })
  async generate(@Body() dto: GenerateImageDto, @CurrentUser('id') userId: string) {
    return this.imageService.generateImage(dto, userId);
  }

  @Get('providers')
  @ApiOperation({ summary: 'List available image providers' })
  listProviders(): { providers: string[] } {
    return { providers: this.imageService.listProviders() };
  }
}
