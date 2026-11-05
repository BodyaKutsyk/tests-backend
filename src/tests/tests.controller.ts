import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  Sse,
  Headers,
} from '@nestjs/common';
import { TestsService } from './tests.service.js';
import { CreateTestDto } from './types/tests-request.dto.js';
import { CreateTestResponseDto } from './types/tests-response.dto.js';
import { type Response } from 'express';
import { Observable } from 'rxjs';
import { GenerationJobsEventService } from '../generation-jobs/generation-jobs-event.service.js';

@Controller('tests')
export class TestsController {
  constructor(
    private readonly testsService: TestsService,
    private readonly generationJobEventService: GenerationJobsEventService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async create(
    @Body() { userId, ...createTestDto }: CreateTestDto,
    @Res({ passthrough: true }) res: Response,
    @Headers('skip-publish') skipPublish: boolean,
  ): Promise<CreateTestResponseDto> {
    const job = await this.testsService.create(
      createTestDto,
      userId,
      skipPublish,
    );

    res.setHeader('Location', `/generation-jobs/${job.id}`);

    return job;
  }

  @Sse(':id/events')
  async sse(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    id: string,
    @Headers('last-event-id') lastEventId?: string,
  ): Promise<Observable<MessageEvent>> {
    return this.generationJobEventService.stream(id, lastEventId);
  }
}
