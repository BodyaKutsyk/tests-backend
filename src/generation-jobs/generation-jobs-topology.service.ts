import { Injectable } from '@nestjs/common';
import { type Channel } from 'amqplib';
import {
  GENERATION_JOBS_EXCHANGE,
  GENERATION_JOBS_ROUTING_KEYS,
} from '../contracts/generation/constants.js';

@Injectable()
export class GenerationJobsTopologyService {
  async setup(channel: Channel) {
    await channel.assertQueue(GENERATION_JOBS_ROUTING_KEYS.CREATED);
    await channel.assertExchange(GENERATION_JOBS_EXCHANGE, 'topic');
    await channel.bindQueue(
      GENERATION_JOBS_ROUTING_KEYS.CREATED,
      GENERATION_JOBS_EXCHANGE,
      'generation_jobs.*',
    );
    await channel.prefetch(4);
  }
}
