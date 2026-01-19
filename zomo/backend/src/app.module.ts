import {
    Global, MiddlewareConsumer,
    Module, NestModule,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, DiscoveryModule } from "@nestjs/core";
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/app-config.module';
import { AppConfigProvider } from './config/app-config.provider';
import { AllExceptionsFilter } from './filter/all-exceptions.filter';
import { ActivityModule } from "./modules/activity/activity.module";
import { ActivityTrackerModule } from "./modules/activitytracker/activitytracker.module";
import { AuthModule } from './modules/auth/auth.module';
import { CompanyModule } from "./modules/company/company.module";
import { HealthCheckupModule } from "./modules/healthcheckup/healthcheckup.module";
import { MasterModule } from './modules/master/master.module';
import { PermissionModule } from './modules/permission/permission.module';
import { ReimbursementModule } from "./modules/reimbursement/reimbursement.module";
import { UserModule } from './modules/user/user.module';
// import { RateLimitInterceptor } from "./interceptor/ratelimit.interceptor";
import { appConstant, CacheService, CommonArrayService, CommonDateService, CommonFileService, CommonHealthService, CommonService, CsvService, FirebaseService, HtmlTagService, LocaleService, TimezoneService } from '@common-constants';
import { JwtService } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { AppGateway } from './app.gateway';
import { AutoReportSettingsModule } from './modules/autoreport/autoReportSettings.module';
import { BiometricModule } from "./modules/biometric/biometric.module";
import { BrokerModule } from "./modules/broker/broker.module";
import { CampaignModule } from "./modules/campaign/campaign.module";
import { ChallengeModule } from "./modules/challenge/challenge.module";
import { ChatModule } from "./modules/chat/chat.module";
import { ClaimModule } from "./modules/claim/claim.module";
import { CoachModule } from "./modules/coach/coach.module";
import { CommonModule } from './modules/common/common.module';
import { CommunicationModule } from "./modules/communication/communication.module";
import { CovidModule } from "./modules/covid/covid.module";
import { DataManagementModule } from "./modules/datamanagement/datamanagement.module";
import { DeviceConfigurationModule } from "./modules/deviceconfiguration/deviceconfiguration.module";
import { DiseaseManagementModule } from "./modules/diseasemanagement/diseasemanagement.module";
import { EmotionalWellBeingModule } from "./modules/emotionalwellbeing/emotionalwellbeing.module";
import { EventsModule } from "./modules/events/events.module";
import { FormModule } from './modules/form/form.module';
import { HealthAssessmentModule } from "./modules/healthassessment/healthassessment.module";
import { InternalModule } from './modules/internal/internal.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { MediaFitnessModule } from "./modules/mediafitness/mediafitness.module";
import { MyPlanModule } from "./modules/myplan/myplan.module";
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { QuickLinkModule } from "./modules/quicklink/quicklink.module";
import { QuizModule } from "./modules/quiz/quiz.module";
import { RegionModule } from "./modules/region/region.module";
import { ReportModule } from './modules/report/report.module';
import { SpouseModule } from "./modules/spouse/spouse.module";
import { SurveyModule } from "./modules/survey/survey.module";
import { ThemesModule } from "./modules/themes/themes.module";
import { TrackerModule } from './modules/trackers/trackers.module';
import { TranslationModule } from "./modules/translation/translation.module";
import { UpcomingActivitiesModule } from "./modules/upcomingactivities/upcomingactivities.module";
import { SocketModule } from './socket-io/socket.module';
import { CpuMonitorService } from './cpumonitor/cpu-monitor.service';
import { CpuMonitorMiddleware } from './cpumonitor/cpu-monitor.middleware';
import {SsoModule} from "./modules/sso/sso.module";
@Global()
@Module({
    imports: [
        
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
            imports: [AppConfigModule],
            name: appConstant.MAIN.toLowerCase(),
            useFactory: (configService: AppConfigProvider) => {
                return {...configService.typeOrmConfig, name: configService.typeOrmConfig.name};
            },
            inject: [AppConfigProvider],
        }),
        TypeOrmModule.forRootAsync({
            imports: [AppConfigModule],
            name: appConstant.READ_REPLICA.toLowerCase(),
            useFactory: (configService: AppConfigProvider) => {
                return {...configService.typeOrmConfig1, name: configService.typeOrmConfig1.name};
            },
            inject: [AppConfigProvider],
        }),
        TypeOrmModule.forRootAsync({
            imports: [AppConfigModule],
            name: appConstant.READ_LOGIN.toLowerCase(),
            useFactory: (configService: AppConfigProvider) => {
                return {...configService.typeOrmConfig1, name: configService.typeOrmConfig2.name};
            },
            inject: [AppConfigProvider],
        }),
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', 'public'),
        }),
        MasterModule,
        UserModule,
        CompanyModule,
        ActivityTrackerModule,
        ReimbursementModule,
        PermissionModule,
        AuthModule,
        DiscoveryModule,
        ActivityModule,
        HealthCheckupModule,
        TranslationModule,
        BiometricModule,
        BrokerModule,
        RegionModule,
        ThemesModule,
        QuickLinkModule,
        CovidModule,
        EventsModule,
        UpcomingActivitiesModule,
        SpouseModule,
        QuizModule,
        ClaimModule,
        DataManagementModule,
        DiseaseManagementModule,
        EmotionalWellBeingModule,
        MyPlanModule,
        MediaFitnessModule,
        CampaignModule,
        CommonModule,
        HealthAssessmentModule,
        CoachModule,
        DeviceConfigurationModule,
        CommunicationModule,
        ChallengeModule,
        ChatModule,
        SurveyModule,
        TrackerModule,
        SocketModule,
        FormModule,
        OnboardingModule,
        MarketingModule,
        AutoReportSettingsModule,
        InternalModule,
        ReportModule,
        NotificationsModule,
        SsoModule,
        ScheduleModule.forRoot(),
    ],
    controllers: [AppController],
    providers: [
        CpuMonitorService,
        {
            provide: APP_FILTER,
            useClass: AllExceptionsFilter,
        },
        // rate limit interceptor remove for testing
        // {
        //     provide: APP_INTERCEPTOR,
        //     useClass: RateLimitInterceptor,
        // },
        AppService,
        CommonService,
        CommonArrayService,
        CommonDateService,
        CommonFileService,
        CommonHealthService,
        CsvService,
        TimezoneService,
        HtmlTagService,
        LocaleService,
        AppGateway,
        FirebaseService,
        CacheService,
        CacheService,
        TimezoneService,
        JwtService,
    ],
    exports: [
        LocaleService,
        CommonService,
        CommonArrayService,
        CommonDateService,
        CommonFileService,
        CommonHealthService,
        CsvService,
        TimezoneService,
        HtmlTagService,
        MasterModule,
        UserModule,
        CompanyModule,
        ActivityTrackerModule,
        ReimbursementModule,
        AuthModule,
        ActivityModule,
        HealthCheckupModule,
        TranslationModule,
        BiometricModule,
        BrokerModule,
        RegionModule,
        ThemesModule,
        QuickLinkModule,
        CovidModule,
        EventsModule,
        UpcomingActivitiesModule,
        SpouseModule,
        QuizModule,
        ClaimModule,
        DataManagementModule,
        DiseaseManagementModule,
        EmotionalWellBeingModule,
        MyPlanModule,
        MediaFitnessModule,
        CampaignModule,
        CommonModule,
        HealthAssessmentModule,
        TrackerModule,
        ChallengeModule,
        ChatModule,
        CommunicationModule,
        CoachModule,
        FirebaseService,
        FormModule,
        OnboardingModule,
        MarketingModule,
        AutoReportSettingsModule,
        CacheService,
        CacheService,
        JwtService,
        ReportModule,
        NotificationsModule,
        SsoModule,
    ],
})
export class AppModule implements NestModule {
    constructor(private readonly cpuMonitorService: CpuMonitorService) {}
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(CpuMonitorMiddleware).forRoutes('*');
    }
}
