import { NestFactory } from '@nestjs/core';
import { RabbitMqTestingModule } from '../../test/utils/rabbit-mq-testing.module.js';
import { RabbitMqService } from '../../src/rabbit-mq/rabbit-mq.service.js';
import { TestsPublisher } from '../../src/tests/tests.publisher.js';
import { GENERATION_JOBS_ROUTING_KEYS } from '../../src/contracts/generation/constants.js';
import { GenerationJobsConsumer } from '../../src/generation-jobs/generation-jobs.consumer.js';
import { filter, firstValueFrom, timeout } from 'rxjs';

async function publish(
  publisher: TestsPublisher,
  consumer: GenerationJobsConsumer,
) {
  const jobId = '9b2907f7-8be9-4c87-9688-5622de36d15d';

  const eventPromise = firstValueFrom(
    consumer.deliveries$.pipe(
      filter((event) => event.id === jobId),
      timeout(10_000),
    ),
  );

  await publisher.testJobCreated(jobId);

  const event = await eventPromise;
  console.log('Delivery:', event);
}

async function main() {
  const app = await NestFactory.createApplicationContext(RabbitMqTestingModule);
  const publisher = app.get(TestsPublisher);
  const consumer = app.get(GenerationJobsConsumer);

  try {
    const rabbitMq = app.get(RabbitMqService);
    const channel = await rabbitMq.createConsumerChannel();
    await channel.purgeQueue(GENERATION_JOBS_ROUTING_KEYS.CREATED);
    await publish(publisher, consumer);

    console.log('Queue cleaned');

    await channel.close();
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
