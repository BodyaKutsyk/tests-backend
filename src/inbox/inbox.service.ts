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
    return manager
      .getRepository(Inbox)
      .createQueryBuilder()
      .insert()
      .values(data)
      .orIgnore()
      .returning('*')
      .execute();
  }
}
