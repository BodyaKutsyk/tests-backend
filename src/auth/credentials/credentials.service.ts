import { Injectable } from '@nestjs/common';
import { User } from '../../entities/user.js';
import { PasswordHasher } from '@nestjs/authentication';
import { ConflictProblem } from '../../exceptions/problem-errors.js';
import { UsersService } from '../../users/users.service.js';

@Injectable()
export class CredentialsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async register(email: string, password: string): Promise<User> {
    const user = await this.usersService.getByEmail(email);

    if (user) {
      throw new ConflictProblem({
        detail: 'User with this email already exists',
      });
    }

    const passwordHash = await this.passwordHasher.hash(password);

    return this.usersService.create({ email, passwordHash });
  }

  async verify(email: string, password: string): Promise<User | null> {
    const found = await this.usersService.getCredentials(email);
    const valid = await this.passwordHasher.verify(
      password,
      found?.passwordHash,
    );

    if (!valid || !found?.passwordHash) {
      return null;
    }

    if (this.passwordHasher.needsRehash(found.passwordHash)) {
      await this.usersService.updatePasswordHash(
        found.user.id,
        found.passwordHash,
      );
    }

    return found.user;
  }
}
