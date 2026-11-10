import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { SignInRequestDto, SignUpRequestDto } from './types/request.dto.js';
import { Public } from '@nestjs/authentication';
import { CredentialsService } from './credentials/credentials.service.js';
import { UnauthorizedProblem } from '../exceptions/problem-errors.js';

@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly credentialsService: CredentialsService,
    private readonly authService: AuthService,
  ) {}

  @Post('sign-up')
  async signUp(@Body() { email, password }: SignUpRequestDto) {
    const user = await this.credentialsService.register(email, password);

    if (!user) {
      throw new UnauthorizedProblem({ detail: 'Invalid email or password ' });
    }

    return this.authService.signUp(user.id);
  }

  @HttpCode(200)
  @Post('sign-in')
  async signIn(@Body() { email, password }: SignInRequestDto) {
    const user = await this.credentialsService.verify(email, password);

    if (!user) {
      throw new UnauthorizedProblem({ detail: 'Invalid email or password ' });
    }

    return this.authService.signIn(user.id);
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }
}
