import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Outbox } from '../entities/outbox.js';

export interface OutboxSavePayload<T> {
  aggregateType: string;
  aggregateId: string;
  type: string;
  payload: T;
}

@Injectable()
export class OutboxService {
  constructor(
    @InjectRepository(Outbox)
    private readonly outboxRepository: Repository<Outbox>,
  ) {}
  async save<T>(
    { aggregateType, aggregateId, type, payload }: OutboxSavePayload<T>,
    manager: EntityManager,
  ) {
    const json = JSON.stringify(payload);
    await manager.save(
      this.outboxRepository.create({
        aggregateType,
        aggregateId,
        type,
        payload: json,
      }),
    );
  }
}
