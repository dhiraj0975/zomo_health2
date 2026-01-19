import {
    appConstant, AssessmentCohortReportsEntity,
    AssessmentEmotionalAssessmentAnswerEntity,
    AssessmentEmotionalAssessmentEntity,
    AssessmentEmotionalAssessmentResultEntity,
    AssessmentHaOptionsEntity,
    AssessmentHaQuestionsEntity,
    AssessmentHraBiometricEntity,
    AssessmentOptionsDetailsEntity,
    AssessmentOptionsEntity,
    AssessmentQuestionsDetailsEntity,
    AssessmentQuestionsEntity, AssessmentReportDownloadsEntity,
    AssessmentResultsEntity,
    AssessmentsEntity,
    AssessmentSettingsEntity,
    AssessmentTabsEntity,
    AssessmentTextsEntity, BiometricsEntity, FtBiometricsEntity,
    lmspecificmetricsEntity, UserEntity
} from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssessmentCohortReportsController } from "./assessmentcohortreports/assessmentcohortreports.controller";
import { AssessmentCohortReportsService } from "./assessmentcohortreports/assessmentcohortreports.service";
import {
    AssessmentEmotionalAssessmentController
} from "./assessmentemotionalassessment/assessmentemotionalassessment.controller";
import {
    AssessmentEmotionalAssessmentService
} from "./assessmentemotionalassessment/assessmentemotionalassessment.service";
import {
    AssessmentemotionalassessmentanswerController
} from "./assessmentemotionalassessmentanswer/assessmentemotionalassessmentanswer.controller";
import {
    AssessmentEmotionalAssessmentAnswerService
} from "./assessmentemotionalassessmentanswer/assessmentemotionalassessmentanswer.service";
import {
    AssessmentEmotionalAssessmentResultController
} from "./assessmentemotionalassessmentresult/assessmentemotionalassessmentresult.controller";
import {
    AssessmentEmotionalAssessmentResultService
} from "./assessmentemotionalassessmentresult/assessmentemotionalassessmentresult.service";
import { AssessmentHaOptionsController } from "./assessmenthaoptions/assessmenthaoptions.controller";
import { AssessmentHaOptionsService } from "./assessmenthaoptions/assessmenthaoptions.service";
import { AssessmentHaQuestionsController } from "./assessmenthaquestions/assessmenthaquestions.controller";
import { AssessmentHaQuestionsService } from "./assessmenthaquestions/assessmenthaquestions.service";
import { AssessmentHraBiometricController } from "./assessmenthrabiometrics/assessmenthrabiometric.controller";
import { AssessmentHraBiometricService } from "./assessmenthrabiometrics/assessmenthrabiometric.service";
import { AssessmentOptionsController } from './assessmentoptions/assessmentoptions.controller';
import { AssessmentOptionsService } from './assessmentoptions/assessmentoptions.service';
import { AssessmentOptionsDetailsController } from './assessmentoptionsdetails/assessmentoptionsdetails.controller';
import { AssessmentOptionsDetailsService } from './assessmentoptionsdetails/assessmentoptionsdetails.service';
import { AssessmentQuestionsController } from './assessmentquestions/assessmentquestions.controller';
import { AssessmentQuestionsService } from './assessmentquestions/assessmentquestions.service';
import { AssessmentQuestionsDetailsController } from './assessmentquestionsdetails/assessmentquestionsdetails.controller';
import { AssessmentQuestionsDetailsService } from './assessmentquestionsdetails/assessmentquestionsdetails.service';
import { AssessmentReportDownloadsController } from "./assessmentreportdownloads/assessmentreportdownloads.controller";
import { AssessmentReportDownloadsService } from "./assessmentreportdownloads/assessmentreportdownloads.service";
import { AssessmentResultsController } from "./assessmentresults/assessmentresults.controller";
import { AssessmentResultsService } from "./assessmentresults/assessmentresults.service";
import { AssessmentsController } from "./assessments/assessments.controller";
import { AssessmentsService } from "./assessments/assessments.service";
import { AssessmentSettingsController } from "./assessmentsettings/assessmentsettings.controller";
import { AssessmentSettingsService } from "./assessmentsettings/assessmentsettings.service";
import { AssessmentTabsController } from "./assessmenttabs/assessmenttabs.controller";
import { AssessmentTabsService } from "./assessmenttabs/assessmenttabs.service";
import { AssessmentTextsController } from "./assessmenttexts/assessmenttexts.controller";
import { AssessmentTextsService } from "./assessmenttexts/assessmenttexts.service";
import { FrontService } from "./front/front.service";
import { LmspecificmetricsService } from './lmspecificmetrics/lmspecificmetrics.service';
@Module({
    imports: [
        TypeOrmModule.forFeature([
            AssessmentOptionsEntity,
            AssessmentOptionsDetailsEntity,
            AssessmentQuestionsEntity,
            AssessmentQuestionsDetailsEntity,
            AssessmentResultsEntity,
            AssessmentSettingsEntity,
            AssessmentTabsEntity,
            AssessmentTextsEntity,
            AssessmentsEntity,
            AssessmentCohortReportsEntity,
            AssessmentEmotionalAssessmentEntity,
            AssessmentEmotionalAssessmentAnswerEntity,
            AssessmentEmotionalAssessmentResultEntity,
            AssessmentHraBiometricEntity,
            AssessmentHaOptionsEntity,
            AssessmentHaQuestionsEntity,
            AssessmentReportDownloadsEntity,
            lmspecificmetricsEntity,
            BiometricsEntity,
            FtBiometricsEntity,
            UserEntity
        ], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([
            AssessmentOptionsEntity,
            AssessmentOptionsDetailsEntity,
            AssessmentQuestionsEntity,
            AssessmentQuestionsDetailsEntity,
            AssessmentResultsEntity,
            AssessmentSettingsEntity,
            AssessmentTabsEntity,
            AssessmentTextsEntity,
            AssessmentsEntity,
            AssessmentCohortReportsEntity,
            AssessmentEmotionalAssessmentEntity,
            AssessmentEmotionalAssessmentAnswerEntity,
            AssessmentEmotionalAssessmentResultEntity,
            AssessmentHraBiometricEntity,
            AssessmentHaOptionsEntity,
            AssessmentHaQuestionsEntity,
            AssessmentReportDownloadsEntity,
            lmspecificmetricsEntity,
            BiometricsEntity,
            FtBiometricsEntity,
            UserEntity
        ], appConstant.MAIN.toLowerCase()),
    ],
    providers: [
        AssessmentOptionsService,
        AssessmentOptionsDetailsService,
        AssessmentQuestionsService,
        AssessmentQuestionsDetailsService,
        AssessmentResultsService,
        AssessmentSettingsService,
        AssessmentTabsService,
        AssessmentTextsService,
        AssessmentsService,
        AssessmentCohortReportsService,
        AssessmentEmotionalAssessmentService,
        AssessmentEmotionalAssessmentAnswerService,
        AssessmentEmotionalAssessmentResultService,
        AssessmentHraBiometricService,
        AssessmentHaOptionsService,
        AssessmentHaQuestionsService,
        AssessmentReportDownloadsService,
        LmspecificmetricsService,
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
        AssessmentOptionsController,
        AssessmentOptionsDetailsController,
        AssessmentQuestionsController,
        AssessmentQuestionsDetailsController,
        AssessmentResultsController,
        AssessmentSettingsController,
        AssessmentTabsController,
        AssessmentTextsController,
        AssessmentsController,
        AssessmentCohortReportsController,
        AssessmentEmotionalAssessmentController,
        AssessmentemotionalassessmentanswerController,
        AssessmentEmotionalAssessmentResultController,
        AssessmentHraBiometricController,
        AssessmentHaOptionsController,
        AssessmentHaQuestionsController,
        AssessmentReportDownloadsController,
    ],
    exports: [
        AssessmentOptionsService,
        AssessmentOptionsDetailsService,
        AssessmentQuestionsService,
        AssessmentQuestionsDetailsService,
        AssessmentResultsService,
        AssessmentSettingsService,
        AssessmentTabsService,
        AssessmentTextsService,
        AssessmentsService,
        AssessmentCohortReportsService,
        AssessmentEmotionalAssessmentService,
        AssessmentEmotionalAssessmentAnswerService,
        AssessmentEmotionalAssessmentResultService,
        AssessmentHraBiometricService,
        AssessmentHaOptionsService,
        AssessmentHaQuestionsService,
        AssessmentReportDownloadsService,
        LmspecificmetricsService,
        FrontService,
    ],
})
export class HealthAssessmentModule {}
