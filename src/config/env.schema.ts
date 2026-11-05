import { z } from 'zod';

const portType = z.coerce.number().min(0).max(65535);

export const envSchema = z.object({
  API_PORT: portType,
  POSTGRES_USER: z.string(),
  POSTGRES_DB: z.string(),
  POSTGRES_PASSWORD_FILE: z.string(),
  POSTGRES_PORT: portType,
  POSTGRES_HOST: z.string(),
  RABBITMQ_HOST: z.string(),
  RABBITMQ_PORT: portType,
  RABBITMQ_USER: z.string(),
  RABBITMQ_PASSWORD: z.string(),
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
