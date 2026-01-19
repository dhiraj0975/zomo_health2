import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

const port = process.env.PORT_PROD;

async function bootstrap() {
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
        AppModule,
        {
            transport: Transport.TCP,
            options: {
                port: Number(port),
            },
        },
    );
    await app.listen();
    Logger.log(
        `Micro service - zomo_communication_microservice - running on http://localhost:${port}`,
        'Bootstrap',
    );
}

bootstrap().then();
