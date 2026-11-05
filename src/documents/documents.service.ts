import { Inject, Injectable } from '@nestjs/common';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Document } from '../entities/document.js';
import { Repository } from 'typeorm';
import { determineMimeType } from './utils/determine-mime-type.js';
import { QuotasService } from '../quotas/quotas.service.js';
import { QuotaType } from '../entities/quota.js';
import {
  FileUploadResponse,
  UploadFilesResponseDto,
} from './types/document.dto.js';

// will be replaced with JWT
@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @Inject(QuotasService)
    private readonly quotaService: QuotasService,
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
        const mimeType = await determineMimeType(
          file.buffer,
          file.originalname,
        );
        const document = this.documentRepo.create({
          storageKey: fileName,
          name: file.originalname,
          mimeType,
          size: file.size,
          user: { id: userId },
        });

        await writeFile(path, file.buffer);
        await this.documentRepo.save(document);

        return { fileName, path };
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

  findOne(id: number) {
    return `This action returns a #${id} file`;
  }

  remove(id: number) {
    return `This action removes a #${id} file`;
  }
}
