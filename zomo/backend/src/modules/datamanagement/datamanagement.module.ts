import {
    appConstant, DataManagementDocumentEntity,
    DataManagementFilesEntity,
    DataManagementFilesOrganizationsEntity,
    DataManagementImportHistoriesEntity,
    DataManagementImportHistoryColumnsEntity
} from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentController } from "./document/document.controller";
import { DocumentService } from "./document/document.service";
import { FileOrganizationController } from "./fileorganization/fileorganization.controller";
import { FileOrganizationService } from "./fileorganization/fileorganization.service";
import { FilesController } from "./files/files.controller";
import { FilesService } from "./files/files.service";
import { ImportHistoriesController } from "./importhistories/importhistories.controller";
import { ImportHistoriesService } from "./importhistories/importhistories.service";
import { ImportHistoryColumnsController } from "./importhistorycolumns/importhistorycolumns.controller";
import { ImportHistoryColumnsService } from "./importhistorycolumns/importhistorycolumns.service";
@Module({
    imports: [
        TypeOrmModule.forFeature([DataManagementFilesOrganizationsEntity, DataManagementFilesEntity, DataManagementDocumentEntity, DataManagementImportHistoriesEntity, DataManagementImportHistoryColumnsEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([DataManagementFilesOrganizationsEntity, DataManagementFilesEntity, DataManagementDocumentEntity, DataManagementImportHistoriesEntity, DataManagementImportHistoryColumnsEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [FileOrganizationService, FilesService, DocumentService, ImportHistoriesService, ImportHistoryColumnsService,
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
    controllers: [FileOrganizationController, FilesController, DocumentController, ImportHistoriesController, ImportHistoryColumnsController],
    exports: [FileOrganizationService, FilesService, DocumentService, ImportHistoriesService, ImportHistoryColumnsService],
})
export class DataManagementModule {}
