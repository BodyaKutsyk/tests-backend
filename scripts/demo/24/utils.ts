import { Helper } from '../../utils/helper.js';
import { randomUUID } from 'crypto';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class Helper24 extends Helper {
  async signUp() {
    const email = `user-${randomUUID().slice(0, 6)}@gmail.com`;
    const password = 'Test1234!';
    const data = { email, password };

    return this.post<AuthResponse>('/auth/sign-up', data);
  }

  async refresh(refreshToken: string) {
    return this.post<AuthResponse>('/auth/refresh', { refreshToken });
  }
}
