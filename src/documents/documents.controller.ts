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
} from '@nestjs/common';
import { DocumentsService } from './documents.service.js';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from '../pipes/file-validation.pipe.js';
import { UploadFilesResponseDto } from './types/document.dto.js';

@Controller('files')
export class DocumentsController {
  constructor(private readonly filesService: DocumentsService) {}

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
    return this.filesService.upload(files, userId);
  }

  @Get()
  findAll() {
    return this.filesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.filesService.findOne(+id);
  }
  //
  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateFileDto: UpdateFileDto) {
  //   return this.filesService.update(+id, updateFileDto);
  // }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.filesService.remove(+id);
  }
}
