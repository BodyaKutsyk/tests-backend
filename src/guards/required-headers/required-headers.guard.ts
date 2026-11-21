import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { REQUIRE_HEADERS_KEY } from './required-headers.decorator.js';
import { BadRequestProblem } from '../../exceptions/problem-errors.js';

@Injectable()
export class RequireHeaderGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredHeaders = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_HEADERS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredHeaders || requiredHeaders.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const missingHeaders: string[] = [];

    for (const header of requiredHeaders) {
      if (!request.headers[header.toLowerCase()]) {
        missingHeaders.push(header);
      }
    }

    if (missingHeaders.length > 0) {
      throw new BadRequestProblem({
        detail: `Missing required header(s): ${missingHeaders.join(', ')}`,
      });
    }

    return true;
  }
}
