import { Role } from '../entities/user.js';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = Symbol.for('roles');
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
