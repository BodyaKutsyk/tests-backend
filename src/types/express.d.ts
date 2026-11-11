import type { User } from '../entities/user.js';

declare global {
  namespace Express {
    interface Request {
      user?: User | null;
    }
  }
}

export {};
