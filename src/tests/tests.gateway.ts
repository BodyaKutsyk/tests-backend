import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { GenerationJobsEventService } from '../generation-jobs/generation-jobs-event.service.js';
import { Subscription } from 'rxjs';
import { OnModuleDestroy } from '@nestjs/common';
import { GenerationJobStatus } from '../entities/generation-job.js';
import { clearInterval } from 'node:timers';

@WebSocketGateway({ namespace: 'tests' })
export class TestsGateway
  implements OnGatewayConnection, OnGatewayInit, OnModuleDestroy
{
  private subscription?: Subscription;
  constructor(private readonly events: GenerationJobsEventService) {}

  handleConnection(client: Socket) {
    const testJobId = client.handshake.auth.testJobId;
    client.join(testJobId);

    let intervalId = setInterval(() => {
      this.events.publish({
        status: GenerationJobStatus.Parsing,
        id: testJobId,
      });
    }, 1000);

    setTimeout(() => {
      clearInterval(intervalId);
      this.events.publish({
        status: GenerationJobStatus.Done,
        id: testJobId,
      });
    }, 5000);
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
