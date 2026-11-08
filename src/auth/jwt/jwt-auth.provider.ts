import { Injectable } from '@nestjs/common';
import {
  AuthenticationRegistry,
  JwtBearerProvider,
  JwtClaims,
} from '@nestjs/authentication';
import { User } from '../../entities/user.js';
import { UsersService } from '../../users/users.service.js';

@Injectable()
export class JwtAuth extends JwtBearerProvider<User> {
  constructor(
    private readonly usersService: UsersService,
    registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerProvider(this);
  }

  async validate({ sub }: JwtClaims): Promise<User | null> {
    if (!sub) {
      return null;
    }

    return this.usersService.getById(sub);
  }
}
