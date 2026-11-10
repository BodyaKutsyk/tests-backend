import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TokenService } from '@nestjs/authentication';

@Injectable()
export class AuthService {
  constructor(private readonly tokenService: TokenService) {}

  async signIn(userId: string) {
    const sid = randomUUID();

    return this.tokenService.issue(userId, {
      method: 'password',
      claims: { sid },
    });
  }

  async signUp(userId: string) {
    const sid = randomUUID();

    return this.tokenService.issue(userId, {
      method: 'password',
      claims: { sid },
    });
  }

  async refresh(refreshToken: string) {
    return this.tokenService.refresh(refreshToken);
  }
}
