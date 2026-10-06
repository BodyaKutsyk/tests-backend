import {
  type ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  UnprocessableEntityException,
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

function extractValidationErrors(exception: UnprocessableEntityException): {
  detail: string;
  errors?: Record<string, string[]>;
} {
  const response = exception.getResponse();

  if (typeof response === 'string') {
    return {
      detail: response,
    };
  }

  const { detail = 'Validation failed', errors } = response as {
    detail?: string;
    errors?: Record<string, string[]>;
  };

  return {
    detail,
    errors,
  };
}

function transformHttpExceptionToProblem(exception: HttpException) {
  switch (exception.getStatus()) {
    case HttpStatus.UNPROCESSABLE_ENTITY:
      const validationError = exception as UnprocessableEntityException;
      const { detail, errors } = extractValidationErrors(validationError);

      return new UnprocessableProblem({
        detail,
        ...(!!Object.values(errors || {}).length && {
          extensions: {
            errors,
          },
        }),
      });
    case HttpStatus.NOT_FOUND:
      return new NotFoundProblem();
    case HttpStatus.UNAUTHORIZED:
      return new UnauthorizedProblem();
    case HttpStatus.CONFLICT:
      return new ConflictProblem();
    default:
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
    const request = ctx.getRequest<Request>();
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

    const { title, statusCode, detail, extensions } = problem;
    const problemResponse: ProblemResponse = {
      title,
      status: statusCode,
      instance: request.path,
      ...(!!Object.keys(extensions).length && { extensions }),
      ...(detail && { detail }),
    };

    response.type('application/problem+json');
    response.status(statusCode).json(problemResponse);
  }
}
