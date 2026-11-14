import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  GenerationJob,
  GenerationJobStatus,
} from '../../entities/generation-job.js';
import { Repository } from 'typeorm';
import { DoclingService } from '../../docling/docling.service.js';
import { NotFoundProblem } from '../../exceptions/problem-errors.js';
import { DocumentContents } from '../../entities/document-contents.js';

@Injectable()
export class TestsParserWorkerService {
  constructor(
    @InjectRepository(GenerationJob)
    private readonly generationJobRepo: Repository<GenerationJob>,
    @InjectRepository(DocumentContents)
    private readonly documentContentsRepo: Repository<DocumentContents>,
    private readonly doclingService: DoclingService,
  ) {}
  async parse(id: string) {
    const job = await this.generationJobRepo.findOne({
      where: { id },
      relations: { documents: true, user: true },
    });
    if (!job?.documents.length) throw new NotFoundProblem();

    for (const document of job.documents) {
      const cached = await this.documentContentsRepo.existsBy({
        id: document.id,
      });
      if (cached) continue;

      const filePath = `uploads/${job.user.id}/${document.storageKey}`;
      const markdown = await this.doclingService.parse(filePath);
      await this.documentContentsRepo.query(
        `INSERT INTO document_contents (id, version, markdown)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [document.id, 1, markdown],
      );
    }

    const update = await this.generationJobRepo
      .createQueryBuilder()
      .update(GenerationJob)
      .set({ status: GenerationJobStatus.Parsing })
      .where({ id })
      .returning('*')
      .execute();

    return update.raw[0];
  }
}
