import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { CurrentUser, LoginRequired } from '../auth/auth.decorators.js';
import type { AuthUser } from '../auth/auth.types.js';
import { ParseIdPipe } from '../common/parse-id.pipe.js';
import { MAX_IMAGE_BYTES } from './file-type.js';
import { UploadsService } from './uploads.service.js';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @LoginRequired()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    }),
  )
  save(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('kind') kind?: string,
  ) {
    const nextKind = kind === 'avatar' ? 'avatar' : 'post';
    return this.uploadsService.save(user, file, nextKind);
  }

  @Delete(':id')
  @LoginRequired()
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIdPipe) id: number,
  ) {
    await this.uploadsService.removeOwn(user, id);
  }
}

@Controller('files')
export class FilesController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get(':id')
  @Header('Cache-Control', 'public, max-age=86400')
  async get(@Param('id', ParseIdPipe) id: number, @Res() res: Response) {
    const { row, stream } = await this.uploadsService.open(id);
    res.setHeader('Content-Type', row.mime);
    res.setHeader('Content-Length', String(row.size));
    stream.pipe(res);
  }
}
