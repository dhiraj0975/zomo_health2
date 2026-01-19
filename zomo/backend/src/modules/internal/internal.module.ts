import { appConstant, UserEntity, UserLoginEntity, UserSettingsEntity, UserTokenEntity } from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from '../auth/auth.service';
import { InternalController } from './internal.controller';
@Module({
    imports: [
        TypeOrmModule.forFeature([UserEntity, UserLoginEntity, UserTokenEntity, UserSettingsEntity], appConstant.READ_LOGIN.toLowerCase()),
        TypeOrmModule.forFeature([UserEntity, UserLoginEntity, UserTokenEntity, UserSettingsEntity], appConstant.MAIN.toLowerCase()),
    ],
    controllers: [InternalController],
    providers: [
        AuthService,
        {
            provide: 'POSTCODES_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.TIMEZONES_SERVICE_HOST_PROD,
                        port: Number(process.env.TIMEZONES_SERVICE_PORT_PROD),
                    }
                })
            }
        },
        {
            provide: 'COMMON_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.COMMON_SERVICE_HOST_PROD ,
                        port: Number(process.env.COMMON_SERVICE_PORT_PROD),
                    }
                })
            }
        },
        {
            provide: 'COMMUNICATION_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.COMMUNICATION_SERVICE_HOST_PROD,
                        port: Number(process.env.COMMUNICATION_SERVICE_PORT_PROD),
                    }
                })
            }
        },
        {
            provide: 'FOOD_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.FOOD_SERVICE_HOST_PROD,
                        port: Number(process.env.FOOD_SERVICE_PORT_PROD),
                    }
                })
            }
        },
        {
            provide: 'CRON_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.CRON_SERVICE_HOST_PROD,
                        port: Number(process.env.CRON_SERVICE_PORT_PROD),
                    }
                })
            }
        },
        {
            provide: 'ACTIVITYLOG_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.ACTIVITYLOG_SERVICE_HOST_PROD,
                        port: Number(process.env.ACTIVITYLOG_SERVICE_PORT_PROD),
                    }
                })
            }
        },
        {
            provide: 'FITBIT_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.FITBIT_SERVICE_HOST_PROD,
                        port: Number(process.env.FITBIT_SERVICE_PORT_PROD),
                    }
                })
            }
        },
        {
            provide: 'CENSUS_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.CENSUS_SERVICE_HOST_PROD,
                        port: Number(process.env.CENSUS_SERVICE_PORT_PROD),
                    }
                })
            }
        },
        {
            provide: 'ONBOARDING_MICROSERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.ONBOARDING_SERVICE_HOST_PROD,
                        port: Number(process.env.ONBOARDING_SERVICE_PORT_PROD),
                    },
                });
            },
        },
        {
            provide: 'TRANSLATION_MICROSERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.TRANSLATION_SERVICE_HOST_PROD,
                        port: Number(process.env.TRANSLATION_SERVICE_PORT_PROD),
                    },
                });
            },
        },
    ],
    exports: [AuthService],
})
export class InternalModule {}
