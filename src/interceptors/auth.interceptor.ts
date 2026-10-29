import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { BadRequestProblem } from '../exceptions/problem-errors.js';

export class AuthInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const request: Request = http.getRequest();
    //
    // if (!request.headers['user-id']) {
    //   throw new BadRequestProblem({ detail: 'User id is required' });
    // }

    return next.handle();
  }
}
