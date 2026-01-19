import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
        AppModule,
        {
            transport: Transport.TCP,
            options: {
                port: Number(process.env.PORT_PROD),
            },
        },
    );
    await app.listen();
    Logger.log(
        `Micro service - zomo_onboarding_microservice - running on http://localhost:${process.env.PORT_PROD}`,
        'Bootstrap',
    );
}

bootstrap().then();
