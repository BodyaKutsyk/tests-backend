import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Outbox } from '../entities/outbox.js';
import { Repository, IsNull, EntityManager } from 'typeorm';
import { RabbitMqService } from '../rabbit-mq/rabbit-mq.service.js';
import { GenerationJob } from '../entities/generation-job.js';
import { BRAKE_OUTBOX_RELAY_AGGREGATE_TYPE } from '../utils/demos.js';

const RELAY_WORKER_INTERVAL = 1500;
const JOBS_PER_CALL = 20;

@Injectable()
export class OutboxRelayWorkerService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Outbox)
    private readonly outboxRepository: Repository<Outbox>,
    private readonly rabbitMQService: RabbitMqService,
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  async onApplicationBootstrap() {
    const run = async () => {
      try {
        await this.processJobs(JOBS_PER_CALL);
      } catch (e) {
        this.logger.error('Error in outbox worker', e);
      } finally {
        setTimeout(run, RELAY_WORKER_INTERVAL);
      }
    };
    await run();
  }

  private async getPending(limit: number, manager: EntityManager) {
    return await manager
      .getRepository(Outbox)
      .createQueryBuilder('outbox')
      .where('outbox.published_at IS NULL')
      .orderBy('created_at', 'ASC')
      .limit(limit)
      .setLock('pessimistic_write')
      .setOnLocked('skip_locked')
      .orderBy('created_at', 'ASC')
      .getMany();
  }
  async processJobs(limit: number) {
    await this.outboxRepository.manager.transaction(async (manager) => {
      let enableRelay = true;
      const pendingJobs = await this.getPending(limit, manager);
      pendingJobs.forEach((job) => {
        job.attempts++;

        if (job.aggregateType === BRAKE_OUTBOX_RELAY_AGGREGATE_TYPE) {
          enableRelay = false;
        }
      });
      await manager.getRepository(Outbox).save(pendingJobs);

      if (!pendingJobs.length) {
        return;
      }

      const promises = pendingJobs.map((job) => this.publish(job));
      const results = await Promise.allSettled(promises);
      const successIds: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successIds.push(pendingJobs[index].aggregateId);
        } else {
          this.logger.error(
            `Failed to publish job ${pendingJobs[index].id}:`,
            result.reason,
          );
        }
      });
      const publishedAt = new Date();

      if (enableRelay) {
        await manager
          .createQueryBuilder()
          .update(Outbox)
          .set({ publishedAt })
          .where('aggregate_id in (:...ids)', { ids: successIds })
          .andWhere({})
          .execute();
      }

      this.logger.log(`Published successfully ${successIds.length} jobs`);
    });
  }

  private async publish({ type, exchange, payload }: Outbox) {
    return this.rabbitMQService.publish({
      routingKey: type,
      exchange,
      payload,
    });
  }
}
