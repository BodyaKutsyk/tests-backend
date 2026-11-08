import { Injectable } from '@nestjs/common';
import { SessionService } from './session/session.service.js';
import { randomUUID } from 'crypto';
import { hash } from 'node:crypto';
import { NotFoundProblem } from '../exceptions/problem-errors.js';
import { SignInRequestDto } from './types/request.dto.js';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly sessionService: SessionService,
    private readonly usersService: UsersService,
  ) {}
  async login({ email }: SignInRequestDto) {
    const user = await this.usersService.getByEmail(email);

    if (!user) {
      throw new NotFoundProblem({
        detail: `User with email: ${email} doesn't exist`,
      });
    }

    const sessionId = randomUUID();
    const refreshToken = randomUUID();
    const accessToken = randomUUID();
    await this.sessionService.create(
      user.id,
      sessionId,
      hash('sha256', refreshToken),
    );

    return { accessToken, refreshToken, sessionId };
  }
}
