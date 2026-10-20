import { Module } from '@nestjs/common';
import { FilesController, UploadsController } from './uploads.controller.js';
import { UploadsService } from './uploads.service.js';

@Module({
  controllers: [UploadsController, FilesController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
