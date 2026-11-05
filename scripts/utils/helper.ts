import { DataSource } from 'typeorm';
import { QuestionType } from '../../src/types/temporary.js';
import { dataSourceOptions } from '../../src/data-source.js';
import { User } from '../../src/entities/user.js';
import { GenerationJob } from '../../src/entities/generation-job.js';

export interface CreateTest {
  questionCount: number;
  questionType: QuestionType;
  files: string[];
}

interface CreateTestResponse {
  id: string;
  status: string;
  createdAt: Date;
}

export class Helper {
  dataSource = new DataSource({ ...dataSourceOptions });

  async getUserWithDocuments() {
    const manager = this.dataSource.manager;
    const userRepo = manager.getRepository(User);
    return userRepo
      .createQueryBuilder('user')
      .innerJoinAndSelect('user.documents', 'document')
      .limit(1)
      .getOne();
  }

  async getJobs(id: string) {
    const manager = this.dataSource.manager;
    const generationJobRepo = manager.getRepository(GenerationJob);
    return generationJobRepo
      .createQueryBuilder('job')
      .where('job.id = :id', { id })
      .getMany();
  }

  async createTest(
    data: CreateTest,
    idempotencyKey: string,
    userId?: string,
  ): Promise<CreateTestResponse> {
    const response = await fetch(
      `http://localhost:${Number(process.env.API_PORT || 3000)}/tests`,
      {
        method: 'POST',
        body: JSON.stringify({ ...data, userId }),
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
          ...(userId ? { 'user-id': userId } : {}),
        },
      },
    );

    const body: unknown = await response.json();
    if (!response.ok) {
      throw new Error(
        `Create test failed (${response.status}): ${JSON.stringify(body)}`,
      );
    }
    if (
      !body ||
      typeof body !== 'object' ||
      !('id' in body) ||
      typeof body.id !== 'string'
    ) {
      throw new Error(
        `Create test returned no job id: ${JSON.stringify(body)}`,
      );
    }

    return body as CreateTestResponse;
  }
}
