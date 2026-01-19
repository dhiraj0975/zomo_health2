import {
    OnboardingEntity,
    appConstant,
    QuickLinkEntity,
    QuickLinkClicksEntity,
    QuickLinkFolderOrgListsEntity, QuickLinkFoldersEntity, QuickLinkOrgListsEntity, QuickLinkReportEntity
} from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterModule } from '../master/master.module';
import { UserController } from './user.controller';
import { CompanyController } from './company.controller';
import { OnboardingService } from './onboarding.service';
import {OnboardingController} from "@/modules/onboarding/onboarding.controller";

@Module({
    imports: [
        ConfigModule,
        MasterModule,
        TypeOrmModule.forFeature(
            [OnboardingEntity],
            appConstant.READ_REPLICA.toLowerCase(),
        ),
        TypeOrmModule.forFeature(
            [OnboardingEntity],
            appConstant.MAIN.toLowerCase(),
        ),
    ],
    controllers: [
        UserController,
        CompanyController,
        OnboardingController,
    ],
    providers: [
        OnboardingService,
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
    ],
    exports: [OnboardingService],
})
export class OnboardingModule {}