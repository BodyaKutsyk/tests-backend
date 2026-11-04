import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { SessionService } from '../auth/session/session.service.js';
import { UnauthorizedProblem } from '../exceptions/problem-errors.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    // @ts-ignore
    const [scheme, sid] = req.headers.authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !sid) {
      throw new UnauthorizedProblem();
    }

    const session = await this.sessions.validateAndTouch(sid);
    (req as Request & { user: { id: string } }).user = {
      id: session.userId,
    };

    return true;
  }
}
