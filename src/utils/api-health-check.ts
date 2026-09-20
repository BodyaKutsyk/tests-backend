import http from 'node:http';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env.schema.js';

const configService = new ConfigService<Env>()

const options = {
  host: 'localhost',
  port: configService.get('API_INTERNAL_PORT'),
  path: '/health',
  timeout: 3000,
};

const request = http.request(options, (res) => {
  console.log(res);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', () => {
  process.exit(1);
});

request.end();
