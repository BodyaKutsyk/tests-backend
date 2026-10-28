import { z } from 'zod';

export const envSchema = z.object({
  API_PORT: z.coerce.number().min(0).max(65535),
  POSTGRES_USER: z.string(),
  POSTGRES_DB: z.string(),
  POSTGRES_PASSWORD_FILE: z.string(),
  POSTGRES_PORT: z.coerce.number().min(0).max(65535),
  POSTGRES_HOST: z.string(),
});

export type Env = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);

  if (result.error) {
    const errors = z.flattenError(result.error);

    throw new Error(JSON.stringify(errors.fieldErrors));
  }

  return result.data;
}
