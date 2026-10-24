import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { RabbitMqService } from '../rabbit-mq/rabbit-mq.service.js';
import { Channel } from 'amqplib';
import { GenerationJobCreatedEvent } from '../contracts/generation/events.js';
import { GENERATION_JOBS_ROUTING_KEYS } from '../contracts/generation/constants.js';
import { GenerationJobsTopologyService } from './generation-jobs-topology.service.js';
import { GenerationJobsWorkflowService } from './generation-jobs-workflow.service.js';
import { Subject } from 'rxjs';
import { InboxService } from '../inbox/inbox.service.js';
import { InjectRepository } from '@nestjs/typeorm';
import { GenerationJob } from '../entities/generation-job.js';
import { Repository } from 'typeorm';
import { GENERATION_JOB_DELIVERIES_CHANNEL } from '../utils/demos.js';

@Injectable()
export class GenerationJobsConsumer implements OnApplicationBootstrap {
  private channel: Channel;
  private readonly deliveriesSubject = new Subject<GenerationJobCreatedEvent>();
  readonly deliveries$ = this.deliveriesSubject.asObservable();
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

  private async startConsuming() {
    this.channel = await this.rabbitMQService.createConsumerChannel();
    await this.topology.setup(this.channel);

    await this.channel.consume(
      GENERATION_JOBS_ROUTING_KEYS.CREATED,
      async (data) => {
        if (!data) {
          return;
        }

        try {
          const manager = this.generationJobRepository.manager;
          const event: GenerationJobCreatedEvent = JSON.parse(
            data.content.toString(),
          );
          try {
            await manager.query('SELECT pg_notify($1, $2)', [
              GENERATION_JOB_DELIVERIES_CHANNEL,
              data.content.toString(),
            ]);
          } catch (error) {
            this.logger.warn('Could not report generation job delivery', error);
          }
          await manager.transaction(async () => {
            const inbox = await this.inboxService.save(
              {
                messageId: event.id,
                consumer: this.constructor.name,
              },
              manager,
            );

            if (inbox.raw.length === 0) {
              this.logger.log(`Recieved duplicated task with id #${event.id}`);
              return;
            }
            await this.workflow.process(event.id, manager);
          });
          this.deliveriesSubject.next(event);
          this.channel.ack(data);
        } catch {
          this.channel.nack(data, false, false);
        }
      },
      { noAck: false },
    );
  }
}
