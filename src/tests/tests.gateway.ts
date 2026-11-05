import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { GenerationJobsEventService } from '../generation-jobs/generation-jobs-event.service.js';
import { Subscription } from 'rxjs';
import { OnModuleDestroy } from '@nestjs/common';
import { GenerationJobsService } from '../generation-jobs/generation-jobs.service.js';

@WebSocketGateway({ namespace: 'tests' })
export class TestsGateway
  implements OnGatewayConnection, OnGatewayInit, OnModuleDestroy
{
  private subscription?: Subscription;
  constructor(
    private readonly events: GenerationJobsEventService,
    private readonly generationJobService: GenerationJobsService,
  ) {}

  async handleConnection(client: Socket) {
    const { testJobId, userId } = client.handshake.auth;

    if (!testJobId || !userId) {
      client.disconnect(true);
      return;
    }

    const hasAccess = await this.generationJobService.checkUserAccess(
      testJobId,
      userId,
    );

    if (!hasAccess) {
      client.disconnect(true);
      return;
    }

    client.join(testJobId);
  }
  afterInit(client: Socket) {
    this.subscription = this.events.published$.subscribe(({ id, event }) => {
      client.to(event.id).emit('test.status', { id, data: event });
    });
  }
  onModuleDestroy() {
    this.subscription?.unsubscribe();
  }
}
