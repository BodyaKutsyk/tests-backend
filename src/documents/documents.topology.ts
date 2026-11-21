import { Injectable } from '@nestjs/common';
import { Channel } from 'amqplib';
import {
  DOCUMENTS_DLQ_QUEUE,
  DOCUMENTS_DLX,
  DOCUMENTS_EXCHANGE,
  DOCUMENTS_PREFETCH,
  DOCUMENTS_ROUTING_KEYS,
} from '../contracts/documents/constants.js';

@Injectable()
export class DocumentsTopology {
  async setup(channel: Channel) {
    await channel.assertExchange(DOCUMENTS_DLX, 'direct', {
      durable: true,
    });
    await channel.assertQueue(DOCUMENTS_DLQ_QUEUE, { durable: true });
    await channel.bindQueue(DOCUMENTS_DLQ_QUEUE, DOCUMENTS_DLX, 'to-dlq');
    await channel.assertQueue(DOCUMENTS_ROUTING_KEYS.uploaded, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': DOCUMENTS_DLX,
        'x-dead-letter-routing-key': 'to-dlq',
      },
    });
    await channel.assertExchange(DOCUMENTS_EXCHANGE, 'topic');
    await channel.bindQueue(
      DOCUMENTS_ROUTING_KEYS.uploaded,
      DOCUMENTS_EXCHANGE,
      'documents.*',
    );
    await channel.prefetch(DOCUMENTS_PREFETCH);
  }
}
