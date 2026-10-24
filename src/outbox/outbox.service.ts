import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Outbox } from '../entities/outbox.js';

export interface OutboxSavePayload<T> {
  aggregateType: string;
  aggregateId: string;
  exchange: string;
  type: string;
  payload: T;
}

@Injectable()
export class OutboxService {
  constructor(
    @InjectRepository(Outbox)
    private readonly outboxRepository: Repository<Outbox>,
  ) {}
  async save<T extends object>(
    data: OutboxSavePayload<T>,
    manager: EntityManager,
  ) {
    await manager.insert(this.outboxRepository.target, data);
  }
}
