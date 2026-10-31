import { DataSource, In, type DataSourceOptions } from 'typeorm';
import { QuestionType } from '../../src/types/temporary.js';
import { dataSourceOptions } from '../../src/data-source.js';
import { User } from '../../src/entities/user.js';
import { GenerationJob } from '../../src/entities/generation-job.js';
import { ChannelModel, ConfirmChannel, connect } from 'amqplib';
import { Logger } from '@nestjs/common';
import { existsSync } from 'node:fs';
import type { GetMessage } from 'amqplib';
import {
  GENERATION_JOBS_DLQ_QUEUE,
  GENERATION_JOBS_ROUTING_KEYS,
} from '../../src/contracts/generation/constants.js';

export interface CreateTest {
  questionCount: number;
  questionType: QuestionType;
  files: string[];
}

interface PublishProps<T> {
  exchange: string;
  routingKey: string;
  payload: T;
}

interface CreateTestResponse {
  id: string;
  status: string;
  createdAt: Date;
}

export class Helper {
  dataSource = new DataSource({
    ...dataSourceOptions,
    host:
      process.env.POSTGRES_HOST ??
      (existsSync('/.dockerenv') ? 'pg_bouncer' : '127.0.0.1'),
  } as DataSourceOptions);
  connection?: ChannelModel;
  channel?: ConfirmChannel;
  private readonly logger = new Logger(this.constructor.name);

  async connectRabbitMQ() {
    const port = process.env.RABBITMQ_PORT;
    const user = process.env.RABBITMQ_USER;
    const password = process.env.RABBITMQ_PASSWORD;
    const host = process.env.RABBITMQ_HOST;
    const connectionUrl = `amqp://${user}:${password}@${host}:${port}`;
    this.connection = await connect(connectionUrl);

    this.connection.on('error', (error) => {
      console.log(error);
      this.logger.log(error);
    });

    this.channel = await this.connection.createConfirmChannel();

    this.channel.on('error', (error) => {
      console.log(error);
      this.logger.log(error);
    });
  }

  async publishRabbitMQ<T>({ exchange, routingKey, payload }: PublishProps<T>) {
    if (!this.channel) {
      throw new Error('Channel is not available');
    }
    const content = Buffer.from(JSON.stringify(payload));
    const channel = this.channel;

    return new Promise<void>((res, rej) => {
      channel.publish(
        exchange,
        routingKey,
        content,
        { persistent: true, mandatory: true },
        (error) => {
          if (error) {
            rej(error);
          } else {
            this.logger.log(`Published: ${routingKey}`);
            res();
          }
        },
      );
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

  async getGenerationJobs(ids: string[]) {
    const manager = this.dataSource.manager;
    const generationJobRepo = manager.getRepository(GenerationJob);
    return generationJobRepo
      .createQueryBuilder('job')
      .where({ id: In(ids) })
      .getMany();
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
    skipPublish?: boolean,
  ): Promise<CreateTestResponse> {
    const response = await fetch(
      `http://localhost:${Number(process.env.API_PORT || 3000)}/tests`,
      {
        method: 'POST',
        body: JSON.stringify({ ...data, userId }),
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
          'Skip-Publish': String(skipPublish),
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

export interface DemoRuntime {
  helper: Helper;
}

export async function startDemo(): Promise<DemoRuntime> {
  const inContainer = existsSync('/.dockerenv');
  process.env.POSTGRES_HOST ??= inContainer ? 'pg_bouncer' : '127.0.0.1';
  process.env.RABBITMQ_HOST ??= inContainer ? 'rabbitmq' : '127.0.0.1';
  const helper = new Helper();

  try {
    await helper.dataSource.initialize();
    await helper.connectRabbitMQ();
    await helper.channel?.checkQueue(GENERATION_JOBS_ROUTING_KEYS.CREATED);
    await helper.channel?.checkQueue(GENERATION_JOBS_DLQ_QUEUE);
    return { helper };
  } catch (error) {
    await helper.channel?.close();
    await helper.connection?.close();
    if (helper.dataSource.isInitialized) await helper.dataSource.destroy();
    throw error;
  }
}

export async function stopDemo(runtime: DemoRuntime): Promise<void> {
  await runtime.helper.channel?.close();
  await runtime.helper.connection?.close();
  if (runtime.helper.dataSource.isInitialized) {
    await runtime.helper.dataSource.destroy();
  }
}

export async function queueLength(runtime: DemoRuntime, queue: string) {
  if (!runtime.helper.channel)
    throw new Error('RabbitMQ channel is not available');
  return (await runtime.helper.channel.checkQueue(queue)).messageCount;
}

interface RabbitQueueStats {
  messages: number;
  message_stats?: {
    deliver_get?: number;
    ack?: number;
  };
}

export async function queueStats(
  queue: string,
): Promise<{ messages: number; delivered: number; acked: number }> {
  const host = process.env.RABBITMQ_HOST;
  const user = process.env.RABBITMQ_USER;
  const password = process.env.RABBITMQ_PASSWORD;
  if (!host || !user || !password) {
    throw new Error('RabbitMQ management credentials are not available');
  }

  const url = `http://${host}:15672/api/queues/%2F/${encodeURIComponent(queue)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`,
    },
  });
  if (!response.ok) {
    throw new Error(`RabbitMQ management API failed (${response.status})`);
  }

  const stats = (await response.json()) as RabbitQueueStats;
  return {
    messages: stats.messages,
    delivered: stats.message_stats?.deliver_get ?? 0,
    acked: stats.message_stats?.ack ?? 0,
  };
}

export async function waitFor(
  condition: () => Promise<boolean>,
): Promise<void> {
  const deadline = Date.now() + 10 * 60 * 1000;
  while (!(await condition())) {
    if (Date.now() >= deadline) throw new Error('Demo timed out');
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

export async function getDlqReason(
  runtime: DemoRuntime,
  eventId: string,
): Promise<string | undefined> {
  const channel = runtime.helper.channel;
  if (!channel) throw new Error('RabbitMQ channel is not available');
  const held: GetMessage[] = [];
  let reason: string | undefined;
  const count = await queueLength(runtime, GENERATION_JOBS_DLQ_QUEUE);

  try {
    for (let i = 0; i < count; i++) {
      const message = await channel.get(GENERATION_JOBS_DLQ_QUEUE, {
        noAck: false,
      });
      if (!message) break;
      held.push(message);
      const payload = JSON.parse(message.content.toString()) as {
        eventId?: string;
      };
      if (payload.eventId !== eventId) continue;
      const headers = message.properties.headers as
        Record<string, unknown> | undefined;
      const deaths = headers?.['x-death'];
      if (Array.isArray(deaths) && typeof deaths[0]?.reason === 'string') {
        reason = deaths[0].reason;
      }
      if (!reason && typeof headers?.['x-first-death-reason'] === 'string') {
        reason = headers['x-first-death-reason'];
      }
      break;
    }
  } finally {
    held.forEach((message) => channel.nack(message, false, true));
  }
  return reason;
}
