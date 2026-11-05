import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const RequestHeader = createParamDecorator(
  (name: string, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest().headers[name.toLowerCase()],
);
