import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Channel } from 'amqplib';
import { Subject } from 'rxjs';
import { Repository } from 'typeorm';
import { GenerationJobCreatedEvent } from '../contracts/generation/events.js';
import {
  GENERATION_JOBS_ROUTING_KEYS,
  GENERATION_JOBS_RETRY_QUEUE,
  GENERATION_JOBS_MAX_DOCUMENT_RETRIES,
} from '../contracts/generation/constants.js';
import { DocumentNotReadyError } from './document-not-ready.error.js';
import { GenerationJob } from '../entities/generation-job.js';
import { InboxService } from '../inbox/inbox.service.js';
import { RabbitMqService } from '../rabbit-mq/rabbit-mq.service.js';
import { GENERATION_JOB_DELIVERIES_CHANNEL } from '../utils/demos.js';
import { GenerationJobsTopologyService } from './generation-jobs-topology.service.js';
import { GenerationJobsWorkflowService } from './generation-jobs-workflow.service.js';

@Injectable()
export class GenerationJobsConsumer implements OnApplicationBootstrap {
  private channel: Channel;
  private readonly deliveriesSubject = new Subject<GenerationJobCreatedEvent>();
  private readonly acknowledgementsSubject =
    new Subject<GenerationJobCreatedEvent>();
  private readonly rejectionsSubject = new Subject<GenerationJobCreatedEvent>();
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    @Inject(RabbitMqService)
    private readonly rabbitMQService: RabbitMqService,
    @Inject(GenerationJobsTopologyService)
    private readonly topology: GenerationJobsTopologyService,
    @Inject(GenerationJobsWorkflowService)
    private readonly workflow: GenerationJobsWorkflowService,
    private readonly inboxService: InboxService,
    @InjectRepository(GenerationJob)
    private readonly generationJobRepository: Repository<GenerationJob>,
  ) {}

  async onApplicationBootstrap() {
    await this.startConsuming();
  }

  async startConsuming(beforeConsume?: (channel: Channel) => Promise<void>) {
    this.channel = await this.rabbitMQService.createConsumerChannel();
    await this.topology.setup(this.channel);
    await beforeConsume?.(this.channel);

    await this.channel.consume(
      GENERATION_JOBS_ROUTING_KEYS.CREATED,
      async (data) => {
        if (!data) return;

        const event: GenerationJobCreatedEvent = JSON.parse(
          data.content.toString(),
        );
        this.deliveriesSubject.next(event);

        try {
          const manager = this.generationJobRepository.manager;
          try {
            await manager.query('SELECT pg_notify($1, $2)', [
              GENERATION_JOB_DELIVERIES_CHANNEL,
              data.content.toString(),
            ]);
          } catch (error) {
            this.logger.warn('Could not report generation job delivery', error);
          }

          const inboxEntry = {
            messageId: event.eventId,
            consumer: this.constructor.name,
          };
          if (!(await this.inboxService.exists(inboxEntry, manager))) {
            await this.workflow.process(event.id, inboxEntry);
          }
          this.channel.ack(data);
          this.acknowledgementsSubject.next(event);
        } catch (error) {
          if (error instanceof DocumentNotReadyError) {
            const retries = event.documentRetryCount ?? 0;
            if (retries < GENERATION_JOBS_MAX_DOCUMENT_RETRIES) {
              try {
                await this.rabbitMQService.publish({
                  exchange: '',
                  routingKey: GENERATION_JOBS_RETRY_QUEUE,
                  payload: { ...event, documentRetryCount: retries + 1 },
                });
                this.channel.ack(data);
              } catch (publishError) {
                this.logger.error(
                  `Could not schedule retry for job ${event.id}`,
                  publishError,
                );
                this.channel.nack(data, false, true);
              }
              return;
            }
            try {
              await this.workflow.failWaitingJob(event.id);
            } catch (updateError) {
              this.logger.error(
                `Could not mark job ${event.id} as failed`,
                updateError,
              );
              this.channel.nack(data, false, true);
              return;
            }
          }
          this.logger.error(
            `Failed to process generation job event ${event.id}`,
            error,
          );
          this.channel.nack(data, false, false);
          this.rejectionsSubject.next(event);
        }
      },
      { noAck: false },
    );
  }
}
