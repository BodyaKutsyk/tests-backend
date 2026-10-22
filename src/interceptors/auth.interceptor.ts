import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

export class AuthInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const request: Request = http.getRequest();

    request.headers['user-id'] = '2d86a24b-68f2-4554-a17a-3300e4047112';

    return next.handle();
  }
}
