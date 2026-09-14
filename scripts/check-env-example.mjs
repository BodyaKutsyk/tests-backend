import { parse } from 'dotenv';
import { readFileSync } from 'node:fs';
import { envSchema } from '../src/config/env.schema.ts';

const envExampleKeys = Object.keys(
  parse(readFileSync(new URL('../.env.example', import.meta.url))),
).sort();
const envSchemaKeys = Object.keys(envSchema.shape).sort();

const missing = envExampleKeys.filter((key) => !envSchemaKeys.includes(key));
const extra = envSchemaKeys.filter((key) => !envExampleKeys.includes(key));

if (missing.length || extra.length) {
  if (missing.length) {
    console.error(`Missing keys: ${missing.join(', ')}`);
  }
  if (extra.length) {
    console.error(`Extra keys: ${extra.join(', ')}`);
  }
  process.exit(1);
}
