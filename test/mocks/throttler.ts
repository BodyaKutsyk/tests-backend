import { Module } from '@nestjs/common';

@Module({})
export class ThrottlerModule {
  static forRootAsync() {
    return { module: ThrottlerModule };
  }
}

export class ThrottlerGuard {
  canActivate() {
    return true;
  }
}

export function SkipThrottle(): MethodDecorator & ClassDecorator {
  return () => undefined;
}
