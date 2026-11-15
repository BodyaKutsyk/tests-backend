import { jest } from '@jest/globals';
import { TestsGeneratorWorkerService } from './tests-generator-worker.service.js';
import { QuestionType } from '../../types/temporary.js';
import { DocumentNotReadyError } from '../document-not-ready.error.js';

describe('TestsGeneratorWorkerService', () => {
  const question = (text: string) => ({
    text,
    explanation: 'A short answer',
    type: QuestionType.OpenEnded,
    options: [],
  });

  function setup(responses: Array<unknown | Error>) {
    const query: any = {};
    for (const method of [
      'innerJoin',
      'leftJoin',
      'select',
      'where',
      'orderBy',
    ]) {
      query[method] = jest.fn().mockReturnValue(query);
    }
    query.getRawMany = jest
      .fn()
      .mockResolvedValue([
        { markdown: 'A document with enough text.' },
      ] as never);
    const generateObject = jest.fn<() => Promise<any>>();
    for (const response of responses) {
      if (response instanceof Error)
        generateObject.mockRejectedValueOnce(response);
      else
        generateObject.mockResolvedValueOnce({
          object: { questions: response },
        });
    }
    const service = new TestsGeneratorWorkerService(
      { createQueryBuilder: () => query } as any,
      { generateObject } as any,
    );
    return { service, generateObject, query };
  }

  it('generates multiple questions per request and returns partial results on a later failure', async () => {
    const { service, generateObject } = setup([
      [question('First?'), question('Second?'), question('Third?')],
      new Error('timeout'),
    ]);
    const result = await service.generate(
      { jobId: 'job', questionCount: 5, questionType: QuestionType.OpenEnded },
      { questions: [], attempts: 0, emptyBatches: 0 },
      async () => {},
    );
    expect(result).toHaveLength(3);
    expect(generateObject).toHaveBeenCalledTimes(2);
  });

  it('stops after repeated empty batches', async () => {
    const { service, generateObject } = setup([[], [], []]);
    expect(
      await service.generate(
        {
          jobId: 'job',
          questionCount: 10,
          questionType: QuestionType.OpenEnded,
        },
        { questions: [], attempts: 0, emptyBatches: 0 },
        async () => {},
      ),
    ).toEqual([]);
    expect(generateObject).toHaveBeenCalledTimes(3);
  });

  it('propagates failures when no question has been generated', async () => {
    const { service } = setup([new Error('timeout')]);
    await expect(
      service.generate(
        {
          jobId: 'job',
          questionCount: 3,
          questionType: QuestionType.OpenEnded,
        },
        { questions: [], attempts: 0, emptyBatches: 0 },
        async () => {},
      ),
    ).rejects.toThrow('timeout');
  });
  it('resumes from a saved batch and persists new progress', async () => {
    const { service, generateObject } = setup([[question('Second?')]]);
    const save = jest.fn<() => Promise<void>>().mockResolvedValue();
    const saved = question('First?');
    const result = await service.generate(
      { jobId: 'job', questionCount: 2, questionType: QuestionType.OpenEnded },
      { questions: [saved], attempts: 1, emptyBatches: 0 },
      save,
    );
    expect(result.map((item) => item.text)).toEqual(['First?', 'Second?']);
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ questions: result, attempts: 2 }),
    );
    expect(generateObject).toHaveBeenCalledTimes(1);
  });
  it('waits when any document has not been parsed', async () => {
    const { service, generateObject, query } = setup([]);
    query.getRawMany.mockResolvedValue([
      { markdown: 'Ready' },
      { markdown: null },
    ] as never);
    await expect(
      service.generate(
        {
          jobId: 'job',
          questionCount: 1,
          questionType: QuestionType.OpenEnded,
        },
        { questions: [], attempts: 0, emptyBatches: 0 },
        async () => {},
      ),
    ).rejects.toBeInstanceOf(DocumentNotReadyError);
    expect(generateObject).not.toHaveBeenCalled();
  });
});
