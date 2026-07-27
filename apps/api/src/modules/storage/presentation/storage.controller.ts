import {
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
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { StorageService } from '../application/services/storage.service';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

@ApiTags('storage')
@ApiBearerAuth('access-token')
@Controller({ path: 'storage', version: '1' })
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @RequirePermissions('storage.upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file to the configured storage backend' })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile(
      new ParseFilePipeBuilder().addMaxSizeValidator({ maxSize: MAX_UPLOAD_BYTES }).build(),
    )
    file: Express.Multer.File,
  ) {
    return this.storageService.uploadFile(file);
  }

  @Get(':key(.*)/url')
  @RequirePermissions('storage.read')
  @ApiOperation({ summary: 'Get a fresh access URL for a stored file' })
  async getUrl(@Param('key') key: string): Promise<{ url: string }> {
    return { url: await this.storageService.getUrl(key) };
  }

  @Delete(':key(.*)')
  @RequirePermissions('storage.delete')
  @ApiOperation({ summary: 'Delete a stored file' })
  async remove(@Param('key') key: string): Promise<{ deleted: boolean }> {
    await this.storageService.delete(key);
    return { deleted: true };
  }
}
