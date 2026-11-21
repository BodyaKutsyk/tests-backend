import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipeBuilder,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { DocumentsService } from './documents.service.js';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from '../pipes/file-validation.pipe.js';
import {
  CommitBulkUploadDto,
  CreateBulkPresignedUploadDto,
  DeleteFilesPayloadDto,
  UploadFilesResponseDto,
} from './types/document.dto.js';
import { type AuthenticatedRequest } from '../types/request.js';
import { NotFoundProblem } from '../exceptions/problem-errors.js';
import { validateDocuments } from './utils/validate-documents.js';
import {
  DocumentCommitResponse,
  IntentBulkUploadResponse,
} from './types/response.js';

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
    @Req() request: AuthenticatedRequest,
  ): Promise<UploadFilesResponseDto> {
    const { id } = request.user;
    return this.documentsService.upload(files, id);
  }

  @Get()
  findAll() {
    return this.documentsService.findAll();
  }

  @Get(':id')
  async getInfoById(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const user = request.user;
    const document = await this.documentsService.getInfoById(id);

    if (!document) {
      throw new NotFoundProblem({ detail: 'Document doesnt exist' });
    }

    if (document.user.id !== user.id) {
      throw new ForbiddenException();
    }

    return document;
  }

  @HttpCode(HttpStatus.ACCEPTED)
  @Delete()
  remove(@Body() { documentIds }: DeleteFilesPayloadDto) {
    return this.documentsService.remove(documentIds);
  }

  @Post('intent')
  async intendUpload(
    @Body() dto: CreateBulkPresignedUploadDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<IntentBulkUploadResponse[]> {
    const { valid, failed } = await validateDocuments(dto.documents);

    const successful = valid.length
      ? await this.documentsService.intendBulkUpload(valid, request.user.id)
      : [];

    return [...successful, ...failed];
  }

  @Post('commit')
  async commitBulkUpload(
    @Body() dto: CommitBulkUploadDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<DocumentCommitResponse[]> {
    return this.documentsService.bulkUploadCommit(dto, request.user.id);
  }
}
