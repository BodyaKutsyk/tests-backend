import { GenerationJobStatus } from '../../entities/generation-job.js';

export class CreateTestResponseDto {
  id: string;
  status: GenerationJobStatus;
  createdAt: Date;
}
