import {
  type ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ConflictProblem,
  NotFoundProblem,
  Problem,
  ProblemData,
  UnauthorizedProblem,
  UnprocessableProblem,
} from './problem-errors.js';
import { type Request, type Response } from 'express';

interface ProblemResponse extends Exclude<ProblemData, 'statusCode'> {
  status: number;
}

function transformHttpExceptionToProblem(exception: HttpException) {
  switch (exception.getStatus()) {
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return new UnprocessableProblem();
    case HttpStatus.NOT_FOUND:
      return new NotFoundProblem();
    case HttpStatus.UNAUTHORIZED:
      return new UnauthorizedProblem();
    case HttpStatus.CONFLICT:
      return new ConflictProblem();
    default:
      console.log(exception);
      return new Problem({
        status: exception.getStatus(),
        title: exception.name,
        detail: exception.message,
      });
  }
}

@Catch()
export class ProblemExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    let problem: Problem;
    const isProblem = exception instanceof Problem;

    if (isProblem) {
      problem = exception;
    } else if (exception instanceof HttpException) {
      problem = transformHttpExceptionToProblem(exception);
    } else {
      problem = new Problem();
    }

    console.log(
      isProblem,
      exception instanceof HttpException,
      // @ts-ignore
      exception.getStatus(),
    );

    const { title, statusCode, instance, detail, extensions } = problem;
    const problemResponse: ProblemResponse = {
      title,
      status: statusCode,
      instance,
      ...(!!Object.keys(extensions).length && { extensions }),
      ...(detail && { detail }),
    };

    response.status(statusCode).json(problemResponse);
  }
}
