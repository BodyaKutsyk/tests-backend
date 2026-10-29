import { GenerationJobStatus } from '../../entities/generation-job.js';

export interface JobEvent {
  id: string;
  status: GenerationJobStatus;
  type: string;
}
