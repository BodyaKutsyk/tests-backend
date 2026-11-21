import { SetMetadata } from '@nestjs/common';

export const REQUIRE_HEADERS_KEY = 'requiredHeaders';
export const RequireHeaders = (...headers: string[]) =>
  SetMetadata(REQUIRE_HEADERS_KEY, headers);
