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
import { GENERATION_JOBS_ROUTING_KEYS } from '../contracts/generation/constants.js';
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
  readonly deliveries$ = this.deliveriesSubject.asObservable();
  readonly acknowledgements$ = this.acknowledgementsSubject.asObservable();
  readonly rejections$ = this.rejectionsSubject.asObservable();

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

          const isNew = await manager.transaction(async (entityManager) => {
            const inbox = await this.inboxService.save(
              { messageId: event.id, consumer: this.constructor.name },
              entityManager,
            );
            return inbox.raw.length > 0;
          });

          if (isNew) await this.workflow.process(event.id);
          this.channel.ack(data);
          this.acknowledgementsSubject.next(event);
        } catch {
          this.channel.nack(data, false, false);
          this.rejectionsSubject.next(event);
        }
      },
      { noAck: false },
    );
  }
}
