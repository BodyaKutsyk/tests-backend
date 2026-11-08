import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { SignInRequestDto, SignUpRequestDto } from './types/request.dto.js';
import { type Response } from 'express';
import { Public, TokenService } from '@nestjs/authentication';
import { CredentialsService } from './credentials/credentials.service.js';
import { UnauthorizedProblem } from '../exceptions/problem-errors.js';

@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly credentialsService: CredentialsService,
    private readonly authService: AuthService,
    private readonly tokenManager: TokenService,
  ) {}

  @Post('sign-up')
  async signUp(@Body() { email, password }: SignUpRequestDto) {
    try {
      const user = await this.credentialsService.register(email, password);
      return this.tokenManager.issue(user.id, { method: 'password' });
    } catch (e) {
      console.log(e);
    }
  }

  @HttpCode(200)
  @Post('sign-in')
  async signIn(@Body() { email, password }: SignInRequestDto) {
    const user = await this.credentialsService.verify(email, password);

    if (!user) {
      throw new UnauthorizedProblem({ detail: 'Invalid email or password ' });
    }

    return this.tokenManager.issue(user.id, { method: 'password' });
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.tokenManager.refresh(refreshToken);
  }

  @HttpCode(200)
  @Post('login')
  async login(
    @Body() dto: SignInRequestDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.login(dto);

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      sessionId: tokens.sessionId,
    };
  }
}
