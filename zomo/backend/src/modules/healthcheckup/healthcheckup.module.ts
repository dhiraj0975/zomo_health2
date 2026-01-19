import {
    AgeActivityEntity,
    AgeGroupEntity, appConstant, AuthorizationsEntity, BiometricHealthRequestEntity,
    BiometricsEntity,
    DataManagersEntity,
    DentistsEntity,
    DiseaseFormsEntity,
    DiseasesEntity,
    DownloadFormsEntity,
    FormInstructionsEntity,
    ForminstructionsTemplateTextsEntity,
    FormSendRequestUserEntity,
    ImportRequestDataEntity,
    MyPlanAssignPlanEntity,
    OptometristsEntity,
    QuestionnaireSettingsEntity,
    QuestionnaireUsersEntity,
    TobaccoUsesEntity,
    UserFormsAttachmentsEntity,
    UserFormsEntity,
    UsersTempsEntity,
    ZipDownloadsEntity
} from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from "@nestjs/config";
import { ClientProxyFactory, Transport } from "@nestjs/microservices";
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgeActivityController } from "./ageactivity/ageactivity.controller";
import { AgeActivityService } from "./ageactivity/ageactivity.service";
import { AgeGroupController } from "./agegroup/agegroup.controller";
import { AgeGroupService } from "./agegroup/agegroup.service";
import { AuthorizationsController } from "./authorizations/authorizations.controller";
import { AuthorizationsService } from "./authorizations/authorizations.service";
import { BiometricsController } from "./biometrics/biometrics.controller";
import { BiometricsService } from "./biometrics/biometrics.service";
import { DataManagersController } from "./datamanagers/datamanagers.controller";
import { DataManagersService } from "./datamanagers/datamanagers.service";
import { DentistsController } from "./dentists/dentists.controller";
import { DentistsService } from "./dentists/dentists.service";
import { DownloadFormsController } from "./downloadforms/downloadforms.controller";
import { DownloadFormsService } from "./downloadforms/downloadforms.service";
import { FormInstructionsController } from "./forminstructions/forminstructions.controller";
import { FormInstructionsService } from "./forminstructions/forminstructions.service";
import { UserFormInstructionsController } from './forminstructions/userforminstructions.controller';
import { FormSendRequestUserController } from './formsendrequestuser/formsendrequestuser.controller';
import { FormSendRequestUserService } from './formsendrequestuser/formsendrequestuser.service';
import { ImportRequestDataController } from './importrequestdata/importrequestdata.controller';
import { ImportRequestDataService } from './importrequestdata/importrequestdata.service';
import { OptometristsController } from "./optometrists/optometrists.controller";
import { OptometristsService } from "./optometrists/optometrists.service";
import { QuestionnaireSettingsController } from "./questionnairesettings/questionnairesettings.controller";
import { QuestionnaireSettingsService } from "./questionnairesettings/questionnairesettings.service";
import { QuestionnaireUsersController } from "./questionnaireusers/questionnaireusers.controller";
import { QuestionnaireUsersService } from "./questionnaireusers/questionnaireusers.service";
import { FormInstructionsTempleteTextsController } from "./templatetexts/forminstructionstemplatetexts.controller";
import { ForminstructionsTemplateTextsService } from "./templatetexts/forminstructionstemplatetexts.service";
import { TobaccoUsesController } from "./tobaccouses/tobaccouses.controller";
import { TobaccoUsesService } from "./tobaccouses/tobaccouses.service";
import { UserFormsController } from "./userforms/userforms.controller";
import { UserFormsService } from "./userforms/userforms.service";
import { UserFormsAttachmentsController } from "./userformsattachments/userformsattachments.controller";
import { UserFormsAttachmentsService } from "./userformsattachments/userformsattachments.service";
import { UsersTempsController } from "./userstemps/userstemps.controller";
import { UsersTempsService } from "./userstemps/userstemps.service";
import { ZipDownloadsController } from "./zipdownloads/zipdownloads.controller";
import { ZipDownloadsService } from "./zipdownloads/zipdownloads.service";
import {BiometricHealthRequestService} from "./health-request/biometric-health-request.service";
import {BiometricHealthRequestController} from "./health-request/biometric-health-request.controller";
@Module({
    imports: [
        TypeOrmModule.forFeature([AuthorizationsEntity, BiometricsEntity, DataManagersEntity, DentistsEntity, DownloadFormsEntity, FormInstructionsEntity, OptometristsEntity, QuestionnaireSettingsEntity, QuestionnaireUsersEntity, TobaccoUsesEntity, UserFormsAttachmentsEntity, UserFormsEntity, ZipDownloadsEntity, ForminstructionsTemplateTextsEntity, AgeActivityEntity, FormSendRequestUserEntity, UsersTempsEntity, ImportRequestDataEntity, MyPlanAssignPlanEntity, DiseasesEntity, DiseaseFormsEntity, AgeGroupEntity, BiometricHealthRequestEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([AuthorizationsEntity, BiometricsEntity, DataManagersEntity, DentistsEntity, DownloadFormsEntity, FormInstructionsEntity, OptometristsEntity, QuestionnaireSettingsEntity, QuestionnaireUsersEntity, TobaccoUsesEntity, UserFormsAttachmentsEntity, UserFormsEntity, ZipDownloadsEntity, ForminstructionsTemplateTextsEntity, AgeActivityEntity, FormSendRequestUserEntity, UsersTempsEntity, ImportRequestDataEntity, MyPlanAssignPlanEntity, DiseasesEntity, DiseaseFormsEntity, AgeGroupEntity, BiometricHealthRequestEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [
        AuthorizationsService, BiometricsService, DataManagersService, DentistsService, DownloadFormsService, FormInstructionsService, OptometristsService, QuestionnaireSettingsService, QuestionnaireUsersService, TobaccoUsesService, UserFormsService, UserFormsAttachmentsService, ZipDownloadsService, ForminstructionsTemplateTextsService, AgeActivityService, FormSendRequestUserService, UsersTempsService, ImportRequestDataService,AgeGroupService, BiometricHealthRequestService,
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
    controllers: [AuthorizationsController, BiometricsController, DataManagersController, DentistsController, DownloadFormsController, FormInstructionsController, OptometristsController, QuestionnaireSettingsController, QuestionnaireUsersController, TobaccoUsesController, UserFormsController, UserFormsAttachmentsController, ZipDownloadsController, FormInstructionsTempleteTextsController, AgeActivityController, FormSendRequestUserController, UsersTempsController, ImportRequestDataController, AgeGroupController, UserFormInstructionsController, BiometricHealthRequestController],
    exports: [AuthorizationsService, BiometricsService, DataManagersService, DentistsService, DownloadFormsService, FormInstructionsService, OptometristsService, QuestionnaireSettingsService, QuestionnaireUsersService, TobaccoUsesService, UserFormsService, UserFormsAttachmentsService, ZipDownloadsService, ForminstructionsTemplateTextsService, AgeActivityService, FormSendRequestUserService, UsersTempsService, ImportRequestDataService, AgeGroupService, BiometricHealthRequestService],
})
export class HealthCheckupModule { }
