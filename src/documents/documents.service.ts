import { Inject, Injectable } from '@nestjs/common';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Document, DocumentStatus } from '../entities/document.js';
import { Repository } from 'typeorm';
import { determineMimeType } from './utils/determine-mime-type.js';
import { QuotasService } from '../quotas/quotas.service.js';
import { QuotaType } from '../entities/quota.js';
import {
  CommitBulkUploadDto,
  DocumentUploadIntentDto,
  FileUploadResponse,
  UploadFilesResponseDto,
} from './types/document.dto.js';
import { NotFoundProblem } from '../exceptions/problem-errors.js';
import { DocumentsPublisher } from './documents.publisher.js';
import { StorageService } from '../storage/storage.service.js';
import {
  DocumentCommitResponse,
  IntentBulkUploadResponse,
} from './types/response.js';

interface CommitUploadProps {
  userId: string;
  documentId: string;
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @Inject(QuotasService)
    private readonly quotaService: QuotasService,
    private readonly documentsPublisher: DocumentsPublisher,
    private readonly storageService: StorageService,
  ) {}

  async upload(
    files: Express.Multer.File[],
    userId: string,
  ): Promise<UploadFilesResponseDto> {
    const directory = join('uploads', userId);
    const totalFilesSize = files.reduce((prev, curr) => prev + curr.size, 0);
    await this.quotaService.reserveStorage(
      userId,
      QuotaType.Storage,
      totalFilesSize,
    );

    await mkdir(directory, { recursive: true });

    const promises = files.map(async (file) => {
      const fileName = `${randomUUID()}${extname(file.originalname)}`;
      const path = join(directory, fileName);

      try {
        return this.documentRepo.manager.transaction(async (manager) => {
          const mimeType = await determineMimeType(
            file.buffer,
            file.originalname,
          );

          await writeFile(path, file.buffer);
          const document = await manager.save(
            this.documentRepo.create({
              storageKey: fileName,
              name: file.originalname,
              mimeType,
              size: file.size,
              user: { id: userId },
            }),
          );

          await this.documentsPublisher.uploaded(document, manager);

          return { id: document.id, fileName, path };
        });
      } catch (e) {
        await rm(path, { force: true });
        throw e;
      }
    });

    const results = await Promise.allSettled(promises);
    const failedUploads = results.filter(
      (result) => result.status === 'rejected',
    );
    if (failedUploads.length) {
      const releaseSize = results.reduce(
        (total, result, index) =>
          result.status === 'rejected' ? total + files[index].size : total,
        0,
      );
      if (releaseSize > 0) {
        await this.quotaService.releaseStorage(
          userId,
          QuotaType.Storage,
          releaseSize,
        );
      }
    }
    const uploadedFiles: FileUploadResponse[] = results.map((result, i) => {
      if (result.status === 'rejected') {
        return {
          filename: files[i].originalname,
          status: 'failed',
          reason: result.reason,
        };
      }

      return {
        id: result.value.id,
        filename: result.value.fileName,
        status: 'success',
      };
    });

    return {
      items: uploadedFiles,
    };
  }

  findAll() {
    return `This action returns all files`;
  }

  getInfoById(id: string) {
    return this.documentRepo.findOne({
      where: { id },
      relations: { user: true },
    });
  }

  async remove(documentIds: string[]) {
    const uniqIds = [...new Set(documentIds)];
    const exists = await this.documentRepo
      .createQueryBuilder('document')
      .where('document.id IN (:...uniqIds)', { uniqIds })
      .getCount();

    if (exists === 0) {
      throw new NotFoundProblem({
        detail: 'No documents found with these ids',
      });
    }

    await this.documentRepo.softDelete(documentIds);
  }

  async createOrGetDocument(document: Document) {
    const result = await this.documentRepo
      .createQueryBuilder()
      .insert()
      .into(Document)
      .values(document)
      .orIgnore()
      .returning('*')
      .execute();

    if (result.raw.length > 0) {
      return this.documentRepo.findOneByOrFail({ id: result.raw[0].id });
    }

    return this.documentRepo.findOneByOrFail({
      contentMd5: document.contentMd5,
      user: { id: document.user.id },
    });
  }

  async initUploadIntent(
    documentDto: DocumentUploadIntentDto,
    userId: string,
  ): Promise<IntentBulkUploadResponse> {
    try {
      const storageKey = this.storageService.generateUploadUrlKey(
        userId,
        extname(documentDto.name),
      );
      const documentPayload = this.documentRepo.create({
        storageKey,
        name: documentDto.name,
        size: documentDto.size,
        mimeType: documentDto.contentType,
        contentMd5: documentDto.contentMd5,
        user: { id: userId },
      });

      const document = await this.createOrGetDocument(documentPayload);

      switch (document.status) {
        case DocumentStatus.Failed:
          return {
            clientId: documentDto.clientId,
            errors: ['Failed to create presigned url for this document'],
            status: DocumentStatus.Failed,
          };
        case DocumentStatus.Completed:
          return {
            id: document.id,
            clientId: documentDto.clientId,
            status: DocumentStatus.Completed,
          };
        case DocumentStatus.Pending:
          const uploadUrl = await this.storageService.createUploadUrl({
            key: document.storageKey,
            md5: document.contentMd5,
            contentType: document.mimeType,
          });

          return {
            id: document.id,
            clientId: documentDto.clientId,
            uploadUrl,
            status: DocumentStatus.Pending,
          };
      }
    } catch (error) {
      console.log(error);
      return {
        clientId: documentDto.clientId,
        errors: ['Failed to create presigned url for this document'],
        status: DocumentStatus.Failed,
      };
    }
  }

  async intendBulkUpload(
    documents: DocumentUploadIntentDto[],
    userId: string,
  ): Promise<IntentBulkUploadResponse[]> {
    const requests = documents.map(async (documentDto) =>
      this.initUploadIntent(documentDto, userId),
    );

    return Promise.all(requests);
  }

  async commitUpload({
    userId,
    documentId,
  }: CommitUploadProps): Promise<DocumentCommitResponse> {
    const document = await this.documentRepo.findOneBy({
      id: documentId,
      user: { id: userId },
    });

    if (!document) {
      return {
        id: documentId,
        status: DocumentStatus.Failed,
        errors: ['Document does not exist'],
      };
    }

    if (document.status === DocumentStatus.Completed) {
      return {
        id: documentId,
        status: DocumentStatus.Completed,
      };
    }

    try {
      const object = await this.storageService.headObject(document.storageKey);
      const errors = this.storageService.validateUploadedObject(
        object,
        document,
      );

      if (errors.length) {
        return {
          id: document.id,
          status: DocumentStatus.Failed,
          errors,
        };
      }

      await this.documentRepo.update(
        {
          id: document.id,
          user: { id: userId },
          status: DocumentStatus.Pending,
        },
        { status: DocumentStatus.Completed },
      );

      return {
        id: document.id,
        status: DocumentStatus.Completed,
      };
    } catch {
      return {
        id: document.id,
        status: DocumentStatus.Failed,
        errors: ['Failed to verify document'],
      };
    }
  }

  async bulkUploadCommit(
    documents: CommitBulkUploadDto,
    userId: string,
  ): Promise<DocumentCommitResponse[]> {
    return Promise.all(
      documents.documentIds.map((documentId) =>
        this.commitUpload({ documentId, userId }),
      ),
    );
  }
}
