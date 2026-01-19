import {
    ActivityFeedsEntity, appConstant, AssessmentEmotionalAssessmentEntity, AssessmentHraBiometricEntity,
    AssessmentsEntity,
    AuthorizationsEntity,
    BiometricsEntity,
    BrokerEntity,
    CampaignActivityEntity,
    CampaignCategoryEntity,
    CampaignChallengeEntity,
    CampaignEntity,
    CampaignRewardEntity,
    CashRewardEntity,
    CensusCustomFieldsEntity,
    CoachesEntity,
    CompaniesEntity,
    CompanyReportMenuSettingsEntity,
    CustomPointEntity,
    CustomPointRequestEntity,
    DentistsEntity,
    EmotionalWellBeingPostClickEntity,
    EventUserBookingListsEntity,
    FoodFeedsEntity,
    FormInstructionsEntity,
    FtBiometricsEntity,
    HealthUsersActivityEntity,
    IncentiveReportsEntity,
    InsurancePlanEntity,
    InsuranceRewardEntity,
    LocationsEntity,
    MediaFitnessVideoClickEntity,
    MyPlanCompleteActivityEntity,
    MyPlanCompleteBlockEntity,
    MyPlanJoinUserPlanEntity,
    OptometristsEntity,
    OtherRewardEntity,
    QuickLinkClicksEntity,
    QuizUserDetailsEntity,
    ReimbursementSubmitedFormsEntity,
    ScheduleChallengeEntity,
    ScheduleChallengeJoinUsersEntity,
    SliderSettingsEntity, SpouseSettingsEntity,
    SubmitedFormsEntity,
    TobaccoUsesEntity,
    UserDetailsEntity,
    UserEntity,
    UserLoginEntity
} from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from "@nestjs/config";
import { ClientProxyFactory, Transport } from "@nestjs/microservices";
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignController } from './campaign/campaign.controller';
import { CampaignService } from './campaign/campaign.service';
import { CampaignActivityController } from './campaignactivity/campaignactivity.controller';
import { CampaignActivityService } from './campaignactivity/campaignactivity.service';
import { CampaignDashboardController } from './campaigndashboard/campaigndashboard.controller';
import { CampaignDashboardService } from './campaigndashboard/campaigndashboard.service';
import { CashRewardController } from './cashreward/cashreward.controller';
import { CashRewardService } from './cashreward/cashreward.service';
import { CampaignCategoryController } from './category/campaigncategory.controller';
import { CampaignCategoryService } from './category/campaigncategory.service';
import { CampaignChallengeController } from './challenge/campaignchallenge.controller';
import { CampaignChallengeService } from './challenge/campaignchallenge.service';
import { CustomPointController } from './custompoint/custompoint.controller';
import { CustomPointService } from './custompoint/custompoint.service';
import { FrontController } from "./front/front.controller";
import { FrontService } from "./front/front.service";
import { FrontCalculationService } from './front/frontcalculation.service';
import { FrontCampaginSummaryService } from './front/frontcampaignsummarydata.service';
import { FrontHealthcheckupService } from './front/fronthealthcheckup.service';
import { FrontPointService } from './front/frontpoint.service';
import { FrontPointsForService } from './front/frontpointfor.service';
import { FrontTrackerEventMediaService } from './front/fronttrackermediaevent.service';
import { IncentiveReportsController } from './incentivereports/incentivereports.controller';
import { IncentiveReportsService } from './incentivereports/incentivereports.service';
import { InsurancePlanController } from './insuranceplan/insuranceplan.controller';
import { InsurancePlanService } from './insuranceplan/insuranceplan.service';
import { InsuranceRewardController } from './insurancereward/insurancereward.controller';
import { InsuranceRewardService } from './insurancereward/insurancereward.service';
import { OtherRewardController } from './otherreward/otherreward.controller';
import { OtherRewardService } from './otherreward/otherreward.service';
import { CampaignRewardController } from './reward/campaignreward.controller';
import { CampaignRewardService } from './reward/campaignreward.service';
import { SliderSettingsController } from "./slidersettings/slidersettings.controller";
import { SliderSettingsService } from "./slidersettings/slidersettings.service";
import { SpouseSettingsController } from "./spousesettings/spousesettings.controller";
import { SpouseSettingsService } from "./spousesettings/spousesettings.service";
@Module({
    imports: [
        TypeOrmModule.forFeature([InsurancePlanEntity, CampaignEntity, CampaignActivityEntity, IncentiveReportsEntity, InsuranceRewardEntity, CampaignCategoryEntity, CampaignChallengeEntity, CampaignRewardEntity, CashRewardEntity, CustomPointEntity, OtherRewardEntity,
            SliderSettingsEntity,SpouseSettingsEntity, BiometricsEntity, DentistsEntity, OptometristsEntity, TobaccoUsesEntity, AuthorizationsEntity, AssessmentsEntity, AssessmentEmotionalAssessmentEntity, AssessmentHraBiometricEntity, SubmitedFormsEntity,
            MyPlanJoinUserPlanEntity, MyPlanCompleteBlockEntity, MyPlanCompleteActivityEntity, UserLoginEntity, MediaFitnessVideoClickEntity, EmotionalWellBeingPostClickEntity, QuickLinkClicksEntity, EventUserBookingListsEntity, QuizUserDetailsEntity,
            HealthUsersActivityEntity, ActivityFeedsEntity, ReimbursementSubmitedFormsEntity, FtBiometricsEntity, UserDetailsEntity, FoodFeedsEntity, UserEntity, ScheduleChallengeJoinUsersEntity, ScheduleChallengeEntity, FormInstructionsEntity, BrokerEntity, 
            CustomPointRequestEntity, CoachesEntity, CompanyReportMenuSettingsEntity, LocationsEntity, CensusCustomFieldsEntity, CompaniesEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([InsurancePlanEntity, CampaignEntity, CampaignActivityEntity, IncentiveReportsEntity, InsuranceRewardEntity, CampaignCategoryEntity, CampaignChallengeEntity, CampaignRewardEntity, CashRewardEntity, CustomPointEntity, OtherRewardEntity,
            SliderSettingsEntity,SpouseSettingsEntity, BiometricsEntity, DentistsEntity, OptometristsEntity, TobaccoUsesEntity, AuthorizationsEntity, AssessmentsEntity, AssessmentEmotionalAssessmentEntity, AssessmentHraBiometricEntity, SubmitedFormsEntity,
            MyPlanJoinUserPlanEntity, MyPlanCompleteBlockEntity, MyPlanCompleteActivityEntity, UserLoginEntity, MediaFitnessVideoClickEntity, EmotionalWellBeingPostClickEntity, QuickLinkClicksEntity, EventUserBookingListsEntity, QuizUserDetailsEntity,
            HealthUsersActivityEntity, ActivityFeedsEntity, ReimbursementSubmitedFormsEntity, FtBiometricsEntity, UserDetailsEntity, FoodFeedsEntity, UserEntity, ScheduleChallengeJoinUsersEntity, ScheduleChallengeEntity, FormInstructionsEntity, BrokerEntity, 
            CustomPointRequestEntity, CoachesEntity, CompanyReportMenuSettingsEntity, LocationsEntity, CensusCustomFieldsEntity, CompaniesEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [
        InsurancePlanService,
        CampaignService,
        CampaignActivityService,
        IncentiveReportsService,
        InsuranceRewardService,
        CampaignCategoryService,
        CampaignChallengeService,
        CampaignRewardService,
        CashRewardService,
        CustomPointService,
        OtherRewardService,
        SliderSettingsService,
        SpouseSettingsService,
        FrontService,
        CampaignDashboardService,
        FrontCampaginSummaryService,
        FrontHealthcheckupService,
        FrontTrackerEventMediaService,
        FrontPointsForService,
        FrontPointService,
        FrontCalculationService,
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
        }
    ],
    controllers: [
        InsurancePlanController,
        CampaignController,
        CampaignActivityController,
        IncentiveReportsController,
        InsuranceRewardController,
        CampaignCategoryController,
        CampaignChallengeController,
        CampaignRewardController,
        CashRewardController,
        CustomPointController,
        OtherRewardController,
        SliderSettingsController,
        SpouseSettingsController,
        FrontController,
        CampaignDashboardController
    ],
    exports: [
        InsurancePlanService,
        CampaignService,
        CampaignActivityService,
        IncentiveReportsService,
        InsuranceRewardService,
        CampaignCategoryService,
        CampaignChallengeService,
        CampaignRewardService,
        CashRewardService,
        CustomPointService,
        OtherRewardService,
        SliderSettingsService,
        SpouseSettingsService,
        FrontService,
        FrontCampaginSummaryService,
        CampaignDashboardService,
        FrontHealthcheckupService,
        FrontTrackerEventMediaService,
        FrontPointsForService,
        FrontPointService,
        FrontCalculationService,
    ],
})
export class CampaignModule { }
