import { Helper, type HttpResult } from '../../utils/helper.js';
import { randomUUID } from 'crypto';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface GetUsersProps {
  accessToken: string;
}

export class Helper24 extends Helper {
  async signUp(): Promise<HttpResult<AuthResponse>> {
    const email = `user-${randomUUID().slice(0, 6)}@gmail.com`;
    const password = 'Test1234!';
    const data = { email, password };

    return this.post<AuthResponse>('/auth/sign-up', data);
  }

  async refresh(refreshToken: string): Promise<HttpResult<AuthResponse>> {
    return this.post<AuthResponse>('/auth/refresh', { refreshToken });
  }

  async logout(refreshToken: string): Promise<HttpResult<never>> {
    return this.post<never>('/auth/sign-out', { refreshToken });
  }

  async getUsers({ accessToken }: GetUsersProps) {
    return this.get('/users', { Authorization: `Bearer ${accessToken}` });
  }
}
