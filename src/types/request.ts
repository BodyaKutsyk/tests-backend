import { User } from '../entities/user.js';
import { type Request } from 'express';

export type AuthenticatedRequest = Request & { user: User };
