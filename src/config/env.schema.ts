import { z } from 'zod';

export const envSchema = z.object({
  API_INTERNAL_PORT: z.coerce.number().min(0).max(65535),
  API_EXTERNAL_PORT: z.coerce.number().min(0).max(65535),
  POSTGRES_USER: z.string(),
  POSTGRES_DB: z.string(),
  POSTGRES_USER_PASSWORD: z.string(),
  POSTGRES_ADMIN: z.string(),
  POSTGRES_ADMIN_PASSWORD: z.string(),
});

export type Env = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);

  if (result.error) {
    const errors = z.flattenError(result.error);

    throw new Error(JSON.stringify(errors.fieldErrors));
  }

  return result;
}
