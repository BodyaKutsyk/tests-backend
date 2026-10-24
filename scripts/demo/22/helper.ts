import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../../../src/data-source.js';
import { Channel, ChannelModel, connect } from 'amqplib';
import { User } from '../../../src/entities/user.js';
import { QuestionType } from '../../../src/types/temporary.js';
import { GenerationJob } from '../../../src/entities/generation-job.js';
import { Outbox } from '../../../src/entities/outbox.js';

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
  rabbitMQConnection?: ChannelModel;
  rabbitMQChannel?: Channel;

  async connectToRabbitMQ() {
    const connectionUrl = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`;

    this.rabbitMQConnection = await connect(connectionUrl);

    this.rabbitMQConnection.on('error', (error) => {
      console.log(error);
    });

    this.rabbitMQChannel = await this.rabbitMQConnection.createConfirmChannel();

    this.rabbitMQChannel.on('error', (error) => {
      console.log(error);
    });
  }

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

  async getOutboxByJobId(id: string) {
    const manager = this.dataSource.manager;
    const outboxRepo = manager.getRepository(Outbox);
    return outboxRepo
      .createQueryBuilder('outbox')
      .where('outbox.aggregate_id = :id', { id })
      .getMany();
  }

  async createTest(
    data: CreateTest,
    idempotencyKey: string,
  ): Promise<CreateTestResponse> {
    const response = await fetch(
      `http://localhost:${Number(process.env.API_PORT || 3000)}/tests`,
      {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
      },
    );

    if (!response.ok) {
      throw new Error('Request failed');
    }

    return (await response.json()) as Promise<CreateTestResponse>;
  }
}
