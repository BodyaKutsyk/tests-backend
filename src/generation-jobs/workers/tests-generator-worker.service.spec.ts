import { jest } from '@jest/globals';
import { TestsGeneratorWorkerService } from './tests-generator-worker.service.js';
import { QuestionType } from '../../types/temporary.js';

describe('TestsGeneratorWorkerService', () => {
  const question = (text: string) => ({
    text,
    explanation: 'A short answer',
    type: QuestionType.OpenEnded,
    options: [],
  });

  function setup(responses: Array<unknown | Error>) {
    const query: any = {};
    for (const method of ['innerJoin', 'select', 'where', 'orderBy', 'limit']) {
      query[method] = jest.fn().mockReturnValue(query);
    }
    query.getRawOne = jest
      .fn()
      .mockResolvedValue({ markdown: 'A document with enough text.' } as never);
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
    return { service, generateObject };
  }

  it('generates multiple questions per request and returns partial results on a later failure', async () => {
    const { service, generateObject } = setup([
      [question('First?'), question('Second?'), question('Third?')],
      new Error('timeout'),
    ]);
    const result = await service.generate('job', 5, QuestionType.OpenEnded);
    expect(result).toHaveLength(3);
    expect(generateObject).toHaveBeenCalledTimes(2);
  });

  it('stops after repeated empty batches', async () => {
    const { service, generateObject } = setup([[], [], []]);
    expect(await service.generate('job', 10, QuestionType.OpenEnded)).toEqual(
      [],
    );
    expect(generateObject).toHaveBeenCalledTimes(3);
  });

  it('propagates failures when no question has been generated', async () => {
    const { service } = setup([new Error('timeout')]);
    await expect(
      service.generate('job', 3, QuestionType.OpenEnded),
    ).rejects.toThrow('timeout');
  });
});
