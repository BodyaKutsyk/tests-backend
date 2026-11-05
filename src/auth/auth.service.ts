import { Injectable } from '@nestjs/common';
import { SessionService } from './session/session.service.js';
import { User } from '../entities/user.js';
import { randomUUID } from 'crypto';
import { hash } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundProblem } from '../exceptions/problem-errors.js';
import { LoginRequestDto } from './types/request.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly sessionService: SessionService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}
  async login(dto: LoginRequestDto) {
    const user = await this.userRepository.findOneBy({ email: dto.email });

    if (!user) {
      throw new NotFoundProblem({
        detail: `User with email: ${dto.email} doesn't exist`,
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
