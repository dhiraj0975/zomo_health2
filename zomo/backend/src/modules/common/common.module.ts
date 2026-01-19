import { Module } from '@nestjs/common';
import { ConfigService } from "@nestjs/config";
import { ClientProxy, ClientProxyFactory, Transport } from "@nestjs/microservices";
import { DocumentService } from '../datamanagement/document/document.service';
import { CronTaskService } from './cron.service';
import { UrlManageService } from './urlmanage.service';
import { SortingService } from './sorting.service';
@Module({
    providers: [
        UrlManageService,
        {
            provide: UrlManageService,
            useFactory: (documentService: DocumentService, commonService: ClientProxy,) => {
                return new UrlManageService(documentService, commonService);
            },
            inject: [DocumentService,'COMMON_SERVICE']
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
        CronTaskService,
        SortingService
    ],
    exports: [UrlManageService,CronTaskService,SortingService],
})
export class CommonModule { }