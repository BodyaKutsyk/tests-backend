import { Injectable } from '@nestjs/common';
import { Inbox } from '../entities/inbox.js';
import { EntityManager } from 'typeorm';

interface InboxProps {
  messageId: string;
  consumer: string;
}

@Injectable()
export class InboxService {
  async exists(data: InboxProps, manager: EntityManager): Promise<boolean> {
    return manager.getRepository(Inbox).existsBy(data);
  }

  async save(data: InboxProps, manager: EntityManager) {
    return manager.getRepository(Inbox).upsert(data, {
      conflictPaths: ['messageId', 'consumer'],
      skipUpdateIfNoValuesChanged: true,
    });
  }
}
