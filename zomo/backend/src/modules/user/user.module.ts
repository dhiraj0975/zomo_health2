import { RateLimiterMiddleware } from "@/middleware/rate-limiter.middleware";
import {
    ActivePluginsEntity, appConstant, BioWeightEntity,
    CampaignEntity,
    CampaignRewardEntity,
    ChallengeEntity,
    CovidPassportUserEntity,
    CovidSettingsEntity,
    EventGlobalEventsEntity,
    EventSlotsEntity,
    FitnessActivityEntity,
    FitnessUsersActivityEntity,
    GroupsEntity,
    ImportUserRequestEntity,
    QuestionnaireSettingsEntity,
    QuestionnaireUsersEntity,
    ReimbursementSubmitedFormsEntity,
    ScheduleChallengeEntity,
    ScheduleChallengeJoinUsersEntity,
    SubmitedFormsEntity,
    SurveyAnswersEntity,
    SurveyPopupEntity,
    SurveyQuestionsEntity,
    SurveyUserAnswersEntity,
    TeamMembersEntity,
    TeamsEntity,
    UcaManualUpComingsEntity,
    UcaSettingEntity,
    UserDownloadLogEntity,
    UserEntity,
    UserFormsEntity,
    UserLoginAgreementEntity,
    UserLoginEntity,
    UserSettingsEntity,
    UserTabSettingsEntity,
    WeeksUsersEntity
} from '@common-constants';
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigService } from "@nestjs/config";
import { ClientProxyFactory, Transport } from "@nestjs/microservices";
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmitFormsService as acSubmitFormsService } from 'src/modules/activitytracker/submitforms/submitforms.service';
import { SettingsService as covidSettingsService } from 'src/modules/covid/settings/settings.service';
import { QuestionnaireSettingsService } from 'src/modules/healthcheckup/questionnairesettings/questionnairesettings.service';
import { SurveyPopupService } from 'src/modules/survey/surveypopup/surveypopup.service';
import { CampaignService } from '../campaign/campaign/campaign.service';
import { BioWeightService } from '../challenge/bioweight/bioweight.service';
import { ChallengeService } from '../challenge/challenge/challenge.service';
import { FitnessActivityService } from '../challenge/fitnessactivity/fitnessactivity.service';
import { FitnessUsersActivityService } from '../challenge/fitnessusersactivity/fitnessusersactivity.service';
import { GroupsService } from '../challenge/groups/groups.service';
import { ScheduleChallengeController } from '../challenge/schedulechallenge/schedulechallenge.controller';
import { ScheduleChallengeService } from '../challenge/schedulechallenge/schedulechallenge.service';
import { ScheduleChallengeJoinUsersService } from '../challenge/schedulechallengejoinusers/schedulechallengejoinusers.service';
import { TeamMembersService } from '../challenge/teammembers/teammembers.service';
import { TeamsService } from '../challenge/teams/teams.service';
import { WeeksUsersService } from '../challenge/weeksusers/weeksusers.service';
import { ActivePluginService } from '../company/activeplugins/activeplugin.service';
import { PassportUsersService } from '../covid/passportUsers/passportUsers.service';
import { EventGlobalEventsService } from '../events/globalevents/globalevents.service';
import { EventSlotsService } from '../events/slots/slots.service';
import { QuestionnaireUsersService } from '../healthcheckup/questionnaireusers/questionnaireusers.service';
import { UserFormsService } from '../healthcheckup/userforms/userforms.service';
import { SubmitFormsService } from '../reimbursement/submitforms/submitforms.service';
import { SurveyAnswersService } from '../survey/surveyanswers/surveyanswers.service';
import { SurveyQuestionsService } from '../survey/surveyquetions/surveyquestions.service';
import { SurveyUserAnswersService } from '../survey/surveyuseranswers/surveyuseranswers.service';
import { ManualUpcomingsService } from '../upcomingactivities/manualupcomings/manualupcomings.service';
import { SettingService } from '../upcomingactivities/setting/setting.service';
import { ImportUserRequestController } from "./importuserrequest/importuserrequest.controller";
import { ImportUserRequestService } from "./importuserrequest/importuserrequest.service";
import { AccessFileController } from './user/accessfile.controller';
import { ErrorReportingController } from './user/errorreporting.controller';
import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
import { UserPopupController } from './user/userpopup.controller';
import { UserDashboardController } from './userdashboard/userDashboard.controller';
import { UserDownloadLogService } from './userdownloadlog/userdownloadlog.service';
import { UserLoginController } from './userlogin/userlogin.controller';
import { UserLoginService } from './userlogin/userlogin.service';
import { UserLoginAgreementController } from "./userloginagreement/userloginagreement.controller";
import { UserLoginAgreementService } from "./userloginagreement/userloginagreement.service";
import { UserReportController } from './userreport/userreport.controller';
import { UserReportService } from './userreport/userreport.service';
import { UserSettingsController } from "./usersettings/usersettings.controller";
import { UserSettingsService } from "./usersettings/usersettings.service";
import { UserTabSettingsController } from "./usertabsettings/usertabsettings.controller";
import { UserTabSettingsService } from "./usertabsettings/usertabsettings.service";
@Module({
    imports: [
    TypeOrmModule.forFeature([UserEntity, UserSettingsEntity, ImportUserRequestEntity, UserLoginAgreementEntity, UserTabSettingsEntity, UserLoginEntity,SurveyQuestionsEntity,SurveyAnswersEntity,
        QuestionnaireUsersEntity,SurveyUserAnswersEntity,ReimbursementSubmitedFormsEntity,UserFormsEntity,SubmitedFormsEntity,CovidPassportUserEntity,TeamMembersEntity,QuestionnaireSettingsEntity,
        SurveyPopupEntity,CovidSettingsEntity,ActivePluginsEntity,ScheduleChallengeEntity,ScheduleChallengeJoinUsersEntity,ChallengeEntity,WeeksUsersEntity,FitnessUsersActivityEntity,
        FitnessActivityEntity,TeamsEntity,GroupsEntity,BioWeightEntity,UcaSettingEntity,EventSlotsEntity,EventGlobalEventsEntity,CampaignEntity,CampaignRewardEntity,UcaManualUpComingsEntity,UserDownloadLogEntity], appConstant.READ_REPLICA.toLowerCase()),
    TypeOrmModule.forFeature([UserEntity, UserSettingsEntity, ImportUserRequestEntity, UserLoginAgreementEntity, UserTabSettingsEntity, UserLoginEntity,SurveyQuestionsEntity,SurveyAnswersEntity,
        QuestionnaireUsersEntity,SurveyUserAnswersEntity,ReimbursementSubmitedFormsEntity,UserFormsEntity,SubmitedFormsEntity,CovidPassportUserEntity,TeamMembersEntity,QuestionnaireSettingsEntity,
        SurveyPopupEntity,CovidSettingsEntity,ActivePluginsEntity,ScheduleChallengeEntity,ScheduleChallengeJoinUsersEntity,ChallengeEntity,WeeksUsersEntity,FitnessUsersActivityEntity,
        FitnessActivityEntity,TeamsEntity,GroupsEntity,BioWeightEntity,UcaSettingEntity,EventSlotsEntity,EventGlobalEventsEntity,CampaignEntity,CampaignRewardEntity,UcaManualUpComingsEntity,UserDownloadLogEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [
        UserService,
        UserSettingsService,
        ImportUserRequestService,
        UserLoginAgreementService,
        UserTabSettingsService,
        UserLoginService,
        SurveyQuestionsService,
        SurveyAnswersService,
        QuestionnaireUsersService,
        SurveyUserAnswersService,
        SubmitFormsService,
        UserFormsService,
        acSubmitFormsService,
        PassportUsersService,
        TeamMembersService,
        QuestionnaireSettingsService,
        SurveyPopupService,
        covidSettingsService,
        ActivePluginService,
        ScheduleChallengeService,
        ScheduleChallengeJoinUsersService,
        ChallengeService,
        WeeksUsersService,
        FitnessUsersActivityService,
        FitnessActivityService,
        TeamsService,
        GroupsService,
        BioWeightService,
        SettingService,
        EventSlotsService,
        EventGlobalEventsService,
        CampaignService,
        ManualUpcomingsService,
        ScheduleChallengeController,
        UserReportService,
        UserDownloadLogService,
        {
            provide: 'POSTCODES_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.TIMEZONES_SERVICE_HOST_PROD,
                        port: Number(process.env.TIMEZONES_SERVICE_PORT_PROD),
                    }
                })
            }
        },
        {
            provide: 'ACTIVITYLOG_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.ACTIVITYLOG_SERVICE_HOST_PROD,
                        port: Number(process.env.ACTIVITYLOG_SERVICE_PORT_PROD),
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
        {
            provide: 'TIMEZONE_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.TIMEZONES_SERVICE_HOST_PROD,
                        port: Number(process.env.TIMEZONES_SERVICE_PORT_PROD),
                    }
                })
            }
        },
    ],
    controllers: [UserController, UserSettingsController, ImportUserRequestController, UserLoginAgreementController, UserTabSettingsController,UserLoginController,ScheduleChallengeController,UserReportController, UserPopupController, ErrorReportingController, UserDashboardController, AccessFileController],
    exports: [UserService, UserSettingsService, ImportUserRequestService, UserLoginAgreementService, UserTabSettingsService,UserLoginService,SurveyQuestionsService,SurveyAnswersService,QuestionnaireUsersService,SurveyUserAnswersService,SubmitFormsService,UserFormsService,acSubmitFormsService,PassportUsersService,TeamMembersService,QuestionnaireSettingsService,SurveyPopupService,covidSettingsService,
        ActivePluginService,
        ScheduleChallengeService,
        ScheduleChallengeJoinUsersService,
        ChallengeService,
        WeeksUsersService,
        FitnessUsersActivityService,
        FitnessActivityService,
        TeamsService,
        GroupsService,
        BioWeightService,
        SettingService,
        EventSlotsService,
        EventGlobalEventsService,
        CampaignService,
        ManualUpcomingsService,
        UserReportService,
        UserDownloadLogService,
    ],
})
export class UserModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(RateLimiterMiddleware)
            .forRoutes({
                path: 'import-user-request/create',
                method: RequestMethod.POST
            });
    }
}
