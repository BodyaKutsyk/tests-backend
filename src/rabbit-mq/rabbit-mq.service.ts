import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ChannelModel, ConfirmChannel, connect } from 'amqplib';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env.schema.js';
import fs from 'node:fs';

interface PublishProps<T> {
  exchange: string;
  routingKey: string;
  payload: T;
}

@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
  private connection?: ChannelModel;
  private channel?: ConfirmChannel;
  private readonly logger = new Logger(RabbitMqService.name);

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async onModuleInit() {
    const isDocker = fs.existsSync('/.dockerenv');
    const host = isDocker
      ? this.configService.get('RABBITMQ_HOST')
      : '127.0.0.1';
    const port = this.configService.get('RABBITMQ_PORT');
    const user = this.configService.get('RABBITMQ_USER');
    const password = this.configService.get('RABBITMQ_PASSWORD');
    const connectionUrl = `amqp://${user}:${password}@${host}:${port}`;

    await this.connect(connectionUrl);
  }

  private async connect(url: string) {
    this.connection = await connect(url);

    this.connection.on('error', (error) => {
      this.logger.log(error);
    });

    this.channel = await this.connection.createConfirmChannel();

    this.channel.on('error', (error) => {
      this.logger.log(error);
    });
  }

  async createConsumerChannel() {
    if (!this.connection) {
      throw new Error('Connection is not available');
    }
    return this.connection.createChannel();
  }

  async publish<T>({ exchange, routingKey, payload }: PublishProps<T>) {
    if (!this.channel) {
      throw new Error('Channel is not available');
    }
    const content = Buffer.from(JSON.stringify(payload));
    const channel = this.channel;

    await new Promise<void>((res, rej) => {
      channel.publish(
        exchange,
        routingKey,
        content,
        { persistent: true, mandatory: true },
        (error) => {
          if (error) {
            rej(error);
          } else {
            this.logger.log(`Published: ${routingKey}`);
            res();
          }
        },
      );
    });
  }

  async onModuleDestroy() {
    await this.channel?.close();
    await this.connection?.close();
  }
}
