import { TestsParserWorkerService } from './tests-parser-worker.service.js';
import { GenerationJobStatus } from '../../entities/generation-job.js';
import type { Repository } from 'typeorm';
import type { GenerationJob } from '../../entities/generation-job.js';
import type { DocumentContents } from '../../entities/document-contents.js';
import type { DoclingService } from '../../docling/docling.service.js';

describe('TestsParserWorkerService', () => {
  it('stores all uncached documents and reuses already parsed content', async () => {
    const update = jest.fn().mockReturnThis();
    const set = jest.fn().mockReturnThis();
    const where = jest.fn().mockReturnThis();
    const returning = jest.fn().mockReturnThis();
    const execute = jest
      .fn()
      .mockResolvedValue({ raw: [{ status: GenerationJobStatus.Parsing }] });
    const jobRepo = {
      findOne: jest.fn().mockResolvedValue({
        user: { id: 'user-1' },
        documents: [
          { id: 'cached', storageKey: 'old.pdf' },
          { id: 'new-1', storageKey: 'first.pdf' },
          { id: 'new-2', storageKey: 'second.pdf' },
        ],
      }),
      createQueryBuilder: jest
        .fn()
        .mockReturnValue({ update, set, where, returning, execute }),
    };
    const contentsRepo = {
      existsBy: jest
        .fn()
        .mockImplementation(({ id }: { id: string }) =>
          Promise.resolve(id === 'cached'),
        ),
      query: jest.fn().mockResolvedValue([]),
    };
    const docling = { parse: jest.fn().mockResolvedValue('# Parsed') };
    const service = new TestsParserWorkerService(
      jobRepo as unknown as Repository<GenerationJob>,
      contentsRepo as unknown as Repository<DocumentContents>,
      docling as unknown as DoclingService,
    );

    await service.parse('job-1');

    expect(docling.parse.mock.calls).toEqual([
      ['uploads/user-1/first.pdf'],
      ['uploads/user-1/second.pdf'],
    ]);
    expect(contentsRepo.query).toHaveBeenCalledTimes(2);
    expect(contentsRepo.query.mock.calls[0][1]).toEqual([
      'new-1',
      1,
      '# Parsed',
    ]);
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
