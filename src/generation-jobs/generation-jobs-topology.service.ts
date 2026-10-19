import { Injectable } from '@nestjs/common';
import { type Channel } from 'amqplib';
import {
  GENERATION_JOBS_DLQ_QUEUE,
  GENERATION_JOBS_DLX,
  GENERATION_JOBS_EXCHANGE,
  GENERATION_JOBS_ROUTING_KEYS,
} from '../contracts/generation/constants.js';

@Injectable()
export class GenerationJobsTopologyService {
  async setup(channel: Channel) {
    await channel.assertExchange(GENERATION_JOBS_DLX, 'direct', {
      durable: true,
    });
    await channel.assertQueue(GENERATION_JOBS_DLQ_QUEUE, { durable: true });
    await channel.bindQueue(
      GENERATION_JOBS_DLQ_QUEUE,
      GENERATION_JOBS_DLX,
      'to-dlq',
    );
    await channel.assertQueue(GENERATION_JOBS_ROUTING_KEYS.CREATED, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': GENERATION_JOBS_DLX,
        'x-dead-letter-routing-key': 'to-dlq',
      },
    });

    await channel.assertExchange(GENERATION_JOBS_EXCHANGE, 'topic');
    await channel.bindQueue(
      GENERATION_JOBS_ROUTING_KEYS.CREATED,
      GENERATION_JOBS_EXCHANGE,
      'generation_jobs.*',
    );
    await channel.prefetch(4);
  }
}
