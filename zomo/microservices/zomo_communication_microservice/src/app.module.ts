import {
    appConstant, EmailCampaignRequestsEntity,
    EmailCampaignTemplatesEntity,
    EmailConfigEntity,
    EmailGroupsEntity,
    MailSchedulersEntity
} from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppCommunicationConfigProvider } from './config/app-communication-config-provider.service';
import { AppCommunicationConfigModule } from './config/app-communication-config.module';
import {
    CampaignRequestsController,
    CampaignRequestsService,
    CampaignTemplatesController,
    CampaignTemplatesService,
    EmailConfigsController,
    EmailConfigsService,
    EmailGroupsController,
    EmailGroupsService,
    MailSchedulerController,
    MailSchedulerService,
} from './module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
            imports: [AppCommunicationConfigModule],
            name: appConstant.MAIN.toLowerCase(),
            useFactory: (configService: AppCommunicationConfigProvider) => {
                return {...configService.typeOrmConfig, name: configService.typeOrmConfig.name};
            },
            inject: [AppCommunicationConfigProvider],
        }),
        TypeOrmModule.forRootAsync({
            imports: [AppCommunicationConfigModule],
            name: appConstant.READ_REPLICA.toLowerCase(),
            useFactory: (configService: AppCommunicationConfigProvider) => {
                return {...configService.typeOrmConfig1, name: configService.typeOrmConfig1.name};
            },
            inject: [AppCommunicationConfigProvider],
        }),
        TypeOrmModule.forFeature([
            EmailCampaignRequestsEntity,
            EmailCampaignTemplatesEntity,
            EmailConfigEntity,
            EmailGroupsEntity,
            MailSchedulersEntity,
        ], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([
            EmailCampaignRequestsEntity,
            EmailCampaignTemplatesEntity,
            EmailConfigEntity,
            EmailGroupsEntity,
            MailSchedulersEntity,
        ], appConstant.MAIN.toLowerCase()),
    ],
    controllers: [
        AppController,
        CampaignRequestsController,
        CampaignTemplatesController,
        EmailConfigsController,
        EmailGroupsController,
        MailSchedulerController,
    ],
    providers: [
        AppService,
        CampaignRequestsService,
        CampaignTemplatesService,
        EmailConfigsService,
        EmailGroupsService,
        MailSchedulerService,
    ],
})
export class AppModule {}
