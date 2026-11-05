import { GenerationJobStatus } from '../../entities/generation-job.js';
import { RabbitMQEvent } from '../../rabbit-mq/events.js';

export interface GenerationJobCreatedEvent extends RabbitMQEvent {
  status: GenerationJobStatus;
}
