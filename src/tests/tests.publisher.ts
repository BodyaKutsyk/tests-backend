import { Inject, Injectable } from '@nestjs/common';
import { RabbitMqService } from '../rabbit-mq/rabbit-mq.service.js';
import { GenerationJobCreatedEvent } from '../contracts/generation/events.js';
import { randomUUID } from 'crypto';
import { GenerationJobStatus } from '../entities/generation-job.js';
import {
  GENERATION_JOBS_EXCHANGE,
  GENERATION_JOBS_ROUTING_KEYS,
} from '../contracts/generation/constants.js';

@Injectable()
export class TestsPublisher {
  constructor(
    @Inject(RabbitMqService)
    private readonly rabbitMQService: RabbitMqService,
  ) {}
  async testJobCreated(id: string) {
    const occurredAt = new Date();
    // TODO: save in Redis
    const eventId = randomUUID();

    await this.rabbitMQService.publish<GenerationJobCreatedEvent>({
      exchange: GENERATION_JOBS_EXCHANGE,
      routingKey: GENERATION_JOBS_ROUTING_KEYS.CREATED,
      payload: {
        id,
        occurredAt,
        eventId,
        status: GenerationJobStatus.Queued,
      },
    });
  }
}
