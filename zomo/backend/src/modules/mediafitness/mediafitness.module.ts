import {
    appConstant, CompanySideMenuSettingsEntity,
    MediaCategoryEntity,
    MediaFitnessCategoryEntity,
    MediaFitnessDifficultyEntity,
    MediaFitnessDurationRangeEntity,
    MediaFitnessEquipmentEntity,
    MediaFitnessFocusEntity,
    MediaFitnessInstructorEntity,
    MediaFitnessInstructorStatusEntity,
    MediaFitnessSeriesEntity,
    MediaFitnessVideoCategoryEntity,
    MediaFitnessVideoClickEntity,
    MediaFitnessVideoEquipmentEntity,
    MediaFitnessVideoFocusEntity,
    MediaFitnessVideoInstructorsEntity, MediaFitnessVideosEntity,
    MediaFitnessVideoSeriesEntity, MediaFitnessVideosReportEntity, MediaFitnessVideoStatusEntity, MediaPostEntity
} from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FitnessCategoryController } from './category/fitnesscategory.controller';
import { FitnessCategoryService } from './category/fitnesscategory.service';
import { FitnessDifficultyController } from './difficulty/fitnessdifficulty.controller';
import { FitnessDifficultyService } from './difficulty/fitnessdifficulty.service';
import { FitnessDurationRangeController } from './durationrange/fitnessdurationrange.controller';
import { FitnessDurationRangeService } from './durationrange/fitnessdurationrange.service';
import { FitnessEquipmentController } from './equipment/fitnessequipment.controller';
import { FitnessEquipmentService } from './equipment/fitnessequipment.service';
import { FitnessFocusController } from './focus/fitnessfocus.controller';
import { FitnessFocusService } from './focus/fitnessfocus.service';
import { FrontService } from "./front/front.service";
import { FitnessInstructorController } from './instructor/fitnessinstructor.controller';
import { FitnessInstructorService } from './instructor/fitnessinstructor.service';
import { FitnessInstructorStatusController } from './instructorstatus/fitnessinstructorstatus.controller';
import { FitnessInstructorStatusService } from './instructorstatus/fitnessinstructorstatus.service';
import { MediaCategoryController } from "./mediacategory/mediacategory.controller";
import { MediaCategoryService } from "./mediacategory/mediacategory.service";
import { MediaFitnessVideoReportService } from './mediafitnessvideoreport/mediafitnessvideoreport.service';
import { MediaPostController } from "./mediapost/mediapost.controller";
import { MediaPostService } from "./mediapost/mediapost.service";
import { FitnessSeriesController } from './series/fitnessseries.controller';
import { FitnessSeriesService } from './series/fitnessseries.service';
import { FitnessVideoCategoryController } from "./videocategory/fitnessvideocategory.controller";
import { FitnessVideoCategoryService } from "./videocategory/fitnessvideocategory.service";
import { FitnessVideoClickController } from "./videoclick/fitnessvideoclick.controller";
import { FitnessVideoClickService } from "./videoclick/fitnessvideoclick.service";
import { FitnessVideoEquipmentController } from "./videoequipment/fitnessvideoequipment.controller";
import { FitnessVideoEquipmentService } from "./videoequipment/fitnessvideoequipment.service";
import { FitnessVideoFocusController } from "./videofocus/fitnessvideofocus.controller";
import { FitnessVideoFocusService } from "./videofocus/fitnessvideofocus.service";
import { FitnessVideoInstructorsController } from "./videoinstructors/fitnessvideoinstructors.controller";
import { FitnessVideoInstructorsService } from "./videoinstructors/fitnessvideoinstructors.service";
import { FitnessVideosController } from "./videos/fitnessvideos.controller";
import { FitnessVideosService } from "./videos/fitnessvideos.service";
import { FitnessVideoSeriesController } from "./videoseries/fitnessvideoseries.controller";
import { FitnessVideoSeriesService } from "./videoseries/fitnessvideoseries.service";
import { FitnessVideoStatusController } from "./videostatus/fitnessvideostatus.controller";
import { FitnessVideoStatusService } from "./videostatus/fitnessvideostatus.service";
@Module({
    imports: [
        TypeOrmModule.forFeature([
            MediaFitnessCategoryEntity,
            MediaFitnessDifficultyEntity,
            MediaFitnessEquipmentEntity,
            MediaFitnessFocusEntity,
            MediaFitnessInstructorEntity,
            MediaFitnessInstructorStatusEntity,
            MediaFitnessSeriesEntity,
            MediaFitnessVideoCategoryEntity,
            MediaFitnessVideoClickEntity,
            MediaFitnessVideoEquipmentEntity,
            MediaFitnessVideoFocusEntity,
            MediaFitnessVideoInstructorsEntity,
            MediaFitnessVideoSeriesEntity,
            MediaFitnessVideoStatusEntity,
            MediaFitnessVideosEntity,
            MediaCategoryEntity,
            MediaPostEntity,
            MediaFitnessDurationRangeEntity,
            MediaFitnessVideosReportEntity,
            CompanySideMenuSettingsEntity,
        ], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([
            MediaFitnessCategoryEntity,
            MediaFitnessDifficultyEntity,
            MediaFitnessEquipmentEntity,
            MediaFitnessFocusEntity,
            MediaFitnessInstructorEntity,
            MediaFitnessInstructorStatusEntity,
            MediaFitnessSeriesEntity,
            MediaFitnessVideoCategoryEntity,
            MediaFitnessVideoClickEntity,
            MediaFitnessVideoEquipmentEntity,
            MediaFitnessVideoFocusEntity,
            MediaFitnessVideoInstructorsEntity,
            MediaFitnessVideoSeriesEntity,
            MediaFitnessVideoStatusEntity,
            MediaFitnessVideosEntity,
            MediaCategoryEntity,
            MediaPostEntity,
            MediaFitnessDurationRangeEntity,
            MediaFitnessVideosReportEntity,
            CompanySideMenuSettingsEntity,
        ], appConstant.MAIN.toLowerCase()),
    ],
    providers: [
        FitnessCategoryService,
        FitnessDifficultyService,
        FitnessEquipmentService,
        FitnessFocusService,
        FitnessInstructorService,
        FitnessInstructorStatusService,
        FitnessSeriesService,
        FitnessVideoCategoryService,
        FitnessVideoClickService,
        FitnessVideoEquipmentService,
        FitnessVideoFocusService,
        FitnessVideoInstructorsService,
        FitnessVideoSeriesService,
        FitnessVideoStatusService,
        FitnessVideosService,
        MediaCategoryService,
        MediaPostService,
        FitnessDurationRangeService,
        MediaFitnessVideoReportService,
        FrontService,
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
    controllers: [
        FitnessCategoryController,
        FitnessDifficultyController,
        FitnessEquipmentController,
        FitnessFocusController,
        FitnessInstructorController,
        FitnessInstructorStatusController,
        FitnessSeriesController,
        FitnessVideoCategoryController,
        FitnessVideoClickController,
        FitnessVideoEquipmentController,
        FitnessVideoFocusController,
        FitnessVideoInstructorsController,
        FitnessVideoSeriesController,
        FitnessVideoStatusController,
        FitnessVideosController,
        MediaCategoryController,
        MediaPostController,
        FitnessDurationRangeController,
    ],
    exports: [
        FitnessCategoryService,
        FitnessDifficultyService,
        FitnessEquipmentService,
        FitnessFocusService,
        FitnessInstructorService,
        FitnessInstructorStatusService,
        FitnessSeriesService,
        FitnessVideoCategoryService,
        FitnessVideoClickService,
        FitnessVideoEquipmentService,
        FitnessVideoFocusService,
        FitnessVideoInstructorsService,
        FitnessVideoSeriesService,
        FitnessVideoStatusService,
        FitnessVideosService,
        MediaCategoryService,
        MediaPostService,
        FitnessDurationRangeService,
        MediaFitnessVideoReportService,
        FrontService,
    ],
})
export class MediaFitnessModule {}
