import { randomUUID } from 'node:crypto';
import type { DeepPartial } from 'typeorm';
import { User } from '../../src/entities/user.js';

export class UserBuilder {
  private readonly user: DeepPartial<User> = {
    email: `user-${randomUUID()}@example.test`,
    firstName: 'Test',
    lastName: 'User',
    passwordHash: 'test-password-hash',
  };

  static aUser() {
    return new UserBuilder();
  }

  withEmail(email: string) {
    this.user.email = email;
    return this;
  }

  build(): DeepPartial<User> {
    return { ...this.user };
  }
}
