import { Injectable } from '@nestjs/common';
import { GenerationJob } from '../entities/generation-job.js';
import {
  GENERATION_JOBS_EXCHANGE,
  GENERATION_JOBS_ROUTING_KEYS,
} from '../contracts/generation/constants.js';
import { OutboxSavePayload, OutboxService } from '../outbox/outbox.service.js';
import { randomUUID } from 'crypto';
import { EntityManager } from 'typeorm';

export interface TestsJobCreatedPayload {
  id: string;
  occurredAt: Date;
  eventId: string;
}

@Injectable()
export class TestsPublisher {
  constructor(private readonly outboxService: OutboxService) {}
  async testJobCreated(generationJob: GenerationJob, manager: EntityManager) {
    const occurredAt = new Date();
    // TODO: save in Redis
    const eventId = randomUUID();
    const outboxPayload: OutboxSavePayload<TestsJobCreatedPayload> = {
      exchange: GENERATION_JOBS_EXCHANGE,
      type: GENERATION_JOBS_ROUTING_KEYS.CREATED,
      aggregateType: this.constructor.name,
      aggregateId: generationJob.id,
      payload: {
        id: generationJob.id,
        eventId,
        occurredAt,
      },
    };
    await this.outboxService.save<TestsJobCreatedPayload>(
      outboxPayload,
      manager,
    );
  }
}
