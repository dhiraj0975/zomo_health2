import {
    appConstant, CommunicationEmailAttachmentEntity,
    CommunicationEmailAttachmentTypeEntity,
    CommunicationEmailEntity,
    CommunicationEmailToEntity,
    CommunicationTemplateTextsEntity
} from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunicationEmailController } from './email/communicationemail.controller';
import { CommunicationEmailService } from './email/communicationemail.service';
import { EmailAssetsController } from './emailassets/emailassets.controller';
import { EmailAttachmentsController } from './emailattachments/emailattachments.controller';
import { EmailAttachmentsService } from './emailattachments/emailattachments.service';
import { EmailAttachmentTypesController } from './emailattachmenttypes/emailattachmenttypes.controller';
import { EmailAttachmentTypesService } from './emailattachmenttypes/emailattachmenttypes.service';
import { EmailCampaignRequestsController } from './emailcampaignrequests/emailcampaignrequests.controller';
import { EmailCampaignTemplatesController } from "./emailcampaigntemplates/emailcampaigntemplates.controller";
import { EmailConfigController } from './emailconfig/emailconfig.controller';
import { EmailGroupsController } from "./emailgroups/emailgroups.controller";
import { EmailThemeColorController } from "./emailthemecolor/emailthemecolor.controller";
import { CommunicationEmailToController } from './emailto/communicationemailto.controller';
import { CommunicationEmailToService } from './emailto/communicationemailto.service';
import { MailSchedulersController } from "./mailschedulers/mailschedulers.controller";
import { CommunicationTemplateTextsController } from './templatetexts/communicationtemplatetexts.controller';
import { CommunicationTemplateTextsService } from './templatetexts/communicationtemplatetexts.service';
@Module({
    imports: [
        TypeOrmModule.forFeature([CommunicationEmailEntity, CommunicationEmailAttachmentEntity, CommunicationEmailAttachmentTypeEntity, CommunicationEmailToEntity, CommunicationTemplateTextsEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([CommunicationEmailEntity, CommunicationEmailAttachmentEntity, CommunicationEmailAttachmentTypeEntity, CommunicationEmailToEntity, CommunicationTemplateTextsEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [
        CommunicationEmailService,
        EmailAttachmentsService,
        EmailAttachmentTypesService,
        CommunicationEmailToService,
        CommunicationTemplateTextsService,
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
        }
    ],
    controllers: [
        CommunicationEmailController,
        EmailAttachmentsController,
        EmailAttachmentTypesController,
        CommunicationEmailToController,
        CommunicationTemplateTextsController,
        EmailCampaignRequestsController,
        EmailCampaignTemplatesController,
        EmailConfigController,
        EmailGroupsController,
        MailSchedulersController,
        EmailThemeColorController,
        EmailAssetsController,
    ],
    exports: [
        CommunicationEmailService,
        EmailAttachmentsService,
        EmailAttachmentTypesService,
        CommunicationEmailToService,
        CommunicationTemplateTextsService,
    ],
})
export class CommunicationModule {}
