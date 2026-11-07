import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipeBuilder,
  Headers,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DocumentsService } from './documents.service.js';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from '../pipes/file-validation.pipe.js';
import {
  DeleteFilesPayloadDto,
  UploadFilesResponseDto,
} from './types/document.dto.js';

@Controller('files')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      limits: { fileSize: 30 * 1024 * 1024, files: 20 },
    }),
  )
  upload(
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({
          maxSize: 30 * 10 * 1024,
        })
        .addValidator(new FileValidationPipe())
        .build(),
    )
    files: Express.Multer.File[],
    @Headers('user-id') userId: string,
  ): Promise<UploadFilesResponseDto> {
    return this.documentsService.upload(files, userId);
  }

  @Get()
  findAll() {
    return this.documentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(+id);
  }

  @HttpCode(HttpStatus.ACCEPTED)
  @Delete()
  remove(@Body() { documentIds }: DeleteFilesPayloadDto) {
    return this.documentsService.remove(documentIds);
  }
}
