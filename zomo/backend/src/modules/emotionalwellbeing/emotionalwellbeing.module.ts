import {
    appConstant, EmotionalWellBeingCategoryEntity,
    EmotionalWellBeingPostClickEntity,
    EmotionalWellBeingPostEntity,
    emotionalwellbeingReportsEntity,
    EmotionalWellBeingTagAssignEntity, EmotionalWellBeingTagEntity
} from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WellBeingController } from './emotionalwellbeing/emotionalwellbeing.controller';
import { WellbeingReportService } from './emotionalwellbeingreport/wellbeingreport.service';
import { FrontService } from "./front/front.service";
import { WellBeingCategoryController } from "./wellbeingcategory/wellbeingcategory.controller";
import { WellBeingCategoryService } from "./wellbeingcategory/wellbeingcategory.service";
import { WellBeingPostController } from "./wellbeingpost/wellbeingpost.controller";
import { WellBeingPostService } from "./wellbeingpost/wellbeingpost.service";
import { WellBeingPostClickController } from "./wellbeingpostclick/wellbeingpostclick.controller";
import { WellBeingPostClickService } from "./wellbeingpostclick/wellbeingpostclick.service";
import { WellBeingTagController } from "./wellbeingtag/wellbeingtag.controller";
import { WellBeingTagService } from "./wellbeingtag/wellbeingtag.service";
import { WellBeingTagAssignController } from "./wellbeingtagassign/wellbeingtagassign.controller";
import { WellBeingTagAssignService } from "./wellbeingtagassign/wellbeingtagassign.service";
@Module({
    imports: [
        TypeOrmModule.forFeature([EmotionalWellBeingCategoryEntity, EmotionalWellBeingPostEntity, EmotionalWellBeingPostClickEntity, EmotionalWellBeingTagEntity, EmotionalWellBeingTagAssignEntity,emotionalwellbeingReportsEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([EmotionalWellBeingCategoryEntity, EmotionalWellBeingPostEntity, EmotionalWellBeingPostClickEntity, EmotionalWellBeingTagEntity, EmotionalWellBeingTagAssignEntity,emotionalwellbeingReportsEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [WellBeingCategoryService, WellBeingPostService, WellBeingPostClickService, WellBeingTagService, WellBeingTagAssignService,WellbeingReportService, FrontService,
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
    controllers: [WellBeingCategoryController, WellBeingPostController, WellBeingPostClickController, WellBeingController, WellBeingTagController, WellBeingTagAssignController],
    exports: [WellBeingCategoryService, WellBeingPostService, WellBeingPostClickService, WellBeingTagService, WellBeingTagAssignService,WellbeingReportService, FrontService],
})
export class EmotionalWellBeingModule {}
