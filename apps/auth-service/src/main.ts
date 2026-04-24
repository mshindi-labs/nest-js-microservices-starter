import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConsoleLogger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: Number(process.env.AUTH_SERVICE_PORT ?? 9012),
      },
      logger: new ConsoleLogger({ prefix: 'AUTH-SVC' }),
    },
  );

  await app.listen();
  console.log(
    `Auth service is listening on TCP port ${process.env.AUTH_SERVICE_PORT ?? 9012}`,
  );
}

void bootstrap();
