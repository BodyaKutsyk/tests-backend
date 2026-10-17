import { Injectable } from '@nestjs/common';
import { filter, map, ReplaySubject, takeWhile } from 'rxjs';
import { JobEvent } from './types/events.js';
import { GenerationJobStatus } from '../entities/generation-job.js';

export type GenerationJobEvent = {
  id: number;
  event: JobEvent;
};

@Injectable()
export class GenerationJobsEventService {
  private lastId = 0;

  private readonly events$ = new ReplaySubject<GenerationJobEvent>(100);
  readonly published$ = this.events$.asObservable();

  stream(jobId: string, lastEventId = '0') {
    return this.events$.pipe(
      filter(({ id, event }) => event.id === jobId && id > Number(lastEventId)),
      takeWhile(
        ({ event }) =>
          event.status !== GenerationJobStatus.Done &&
          event.status !== GenerationJobStatus.Failed,
        true,
      ),
      map(({ id, event }) => ({
        id: String(id),
        data: event,
      })),
    );
  }
  publish(event: JobEvent) {
    this.events$.next({
      id: ++this.lastId,
      event,
    });
  }
}
