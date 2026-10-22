import { Inject, Injectable } from '@nestjs/common';
import { RabbitMqService } from '../rabbit-mq/rabbit-mq.service.js';
import { GenerationJobCreatedEvent } from '../contracts/generation/events.js';
import { GenerationJobStatus } from '../entities/generation-job.js';
import {
  GENERATION_JOBS_EXCHANGE,
  GENERATION_JOBS_ROUTING_KEYS,
} from '../contracts/generation/constants.js';

export interface TestsJobCreatedPayload {
  id: string;
  occurredAt: Date;
  eventId: string;
}

@Injectable()
export class TestsPublisher {
  constructor(
    @Inject(RabbitMqService)
    private readonly rabbitMQService: RabbitMqService,
  ) {}
  async testJobCreated({ id, occurredAt, eventId }: TestsJobCreatedPayload) {
    await this.rabbitMQService.publish<GenerationJobCreatedEvent>({
      exchange: GENERATION_JOBS_EXCHANGE,
      routingKey: GENERATION_JOBS_ROUTING_KEYS.CREATED,
      payload: {
        id,
        occurredAt,
        eventId,
        status: GenerationJobStatus.Done,
      },
    });
  }
}
