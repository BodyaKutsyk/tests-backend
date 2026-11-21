import { Module } from '@nestjs/common';
import { AiModule } from '@nestjs/ai';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Env } from '../config/env.schema.js';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

@Module({
  imports: [
    AiModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => {
        const ollamaPort = configService.get('OLLAMA_PORT');
        const ollamaHost = configService.get('OLLAMA_HOST');
        const ollamaModel = configService.get('OLLAMA_MODEL');
        const ollamaUrl = `http://${ollamaHost}:${ollamaPort}/v1`;
        const ollama = createOpenAICompatible({
          name: 'ollama',
          baseURL: ollamaUrl,
          supportsStructuredOutputs: true,
        });

        return {
          models: {
            default: ollama(ollamaModel),
          },
          defaults: {
            timeout: '180s',
          },
        };
      },
    }),
  ],
  exports: [AiModule],
})
export class LlmModule {}
