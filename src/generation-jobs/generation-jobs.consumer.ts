import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { RabbitMqService } from '../rabbit-mq/rabbit-mq.service.js';
import { Channel } from 'amqplib';
import { GenerationJobCreatedEvent } from '../contracts/generation/events.js';
import { GENERATION_JOBS_ROUTING_KEYS } from '../contracts/generation/constants.js';
import { GenerationJobsTopologyService } from './generation-jobs-topology.service.js';
import { GenerationJobsWorkflowService } from './generation-jobs-workflow.service.js';
import { GenerationJobStatus } from '../entities/generation-job.js';
import { Subject } from 'rxjs';

@Injectable()
export class GenerationJobsConsumer implements OnApplicationBootstrap {
  private channel: Channel;
  private readonly deliveriesSubject = new Subject<GenerationJobCreatedEvent>();
  readonly deliveries$ = this.deliveriesSubject.asObservable();

  constructor(
    @Inject(RabbitMqService)
    private readonly rabbitMQService: RabbitMqService,
    @Inject(GenerationJobsTopologyService)
    private readonly topology: GenerationJobsTopologyService,
    @Inject(GenerationJobsWorkflowService)
    private readonly workflow: GenerationJobsWorkflowService,
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

        const response: GenerationJobCreatedEvent = JSON.parse(
          data.content.toString(),
        );
        this.deliveriesSubject.next(response);

        if (response.status === GenerationJobStatus.Done) {
          this.channel.ack(data);
        }
        await this.workflow.process(response.id);
      },
      { noAck: false },
    );
  }
}
