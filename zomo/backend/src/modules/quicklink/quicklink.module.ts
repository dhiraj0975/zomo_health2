import { appConstant, QuickLinkClicksEntity, QuickLinkEntity, QuickLinkFolderOrgListsEntity, QuickLinkFoldersEntity, QuickLinkOrgListsEntity, QuickLinkReportEntity } from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FrontService } from "./front/front.service";
import { QuickLinkController } from "./quicklink/quicklink.controller";
import { QuickLinkService } from "./quicklink/quicklink.service";
import { QuickLinkClicksController } from "./quicklinkclicks/quicklinkclicks.controller";
import { QuickLinkClicksService } from "./quicklinkclicks/quicklinkclicks.service";
import { QuickLinkFolderOrgListsController } from "./quicklinkfolderorglists/quicklinkfolderorglists.controller";
import { QuickLinkFolderOrgListsService } from "./quicklinkfolderorglists/quicklinkfolderorglists.service";
import { QuickLinkFoldersController } from "./quicklinkfolders/quicklinkfolders.controller";
import { QuickLinkFoldersService } from "./quicklinkfolders/quicklinkfolders.service";
import { QuickLinkOrgListsController } from "./quicklinkorglists/quicklinkorglists.controller";
import { QuicklinkOrglistsService } from "./quicklinkorglists/quicklinkorglists.service";
import { QuickLinkReportController } from "./quicklinkreport/quicklinkreport.controller";
import { QuickLinkReportService } from "./quicklinkreport/quicklinkreport.service";
@Module({
    imports: [
        TypeOrmModule.forFeature([QuickLinkEntity,QuickLinkClicksEntity,QuickLinkFolderOrgListsEntity,QuickLinkFoldersEntity,QuickLinkOrgListsEntity,QuickLinkReportEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([QuickLinkEntity,QuickLinkClicksEntity,QuickLinkFolderOrgListsEntity,QuickLinkFoldersEntity,QuickLinkOrgListsEntity,QuickLinkReportEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [
        QuickLinkService,QuickLinkClicksService,QuickLinkFolderOrgListsService,QuickLinkFoldersService,QuicklinkOrglistsService,QuickLinkReportService,FrontService,
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
    ],
    controllers: [QuickLinkController,QuickLinkClicksController,QuickLinkFolderOrgListsController,QuickLinkFoldersController,QuickLinkOrgListsController,QuickLinkReportController],
    exports: [QuickLinkService, QuickLinkClicksService, QuickLinkFolderOrgListsService,QuickLinkFoldersService,QuicklinkOrglistsService,QuickLinkReportService,FrontService],
})
export class QuickLinkModule {}
