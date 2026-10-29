import { Injectable } from '@nestjs/common';
import { Inbox } from '../entities/inbox.js';
import { EntityManager } from 'typeorm';

interface InboxProps {
  messageId: string;
  consumer: string;
}

@Injectable()
export class InboxService {
  async save(data: InboxProps, manager: EntityManager) {
    return manager.getRepository(Inbox).upsert(data, {
      conflictPaths: ['messageId', 'consumer'],
      skipUpdateIfNoValuesChanged: true,
    });
  }
}
