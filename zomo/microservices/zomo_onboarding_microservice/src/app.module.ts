import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppOnboardingConfigModule } from './config/app-onboarding-config.module';
import { ScheduleModule } from '@nestjs/schedule';
import {
    OnboardingEntity,
    UserEntity,
    UserSettingsEntity,
    CompaniesEntity,
    CompanyMetaEntity,
    ActivePluginsEntity,
    DepartmentsEntity,
    LocationsEntity,
    CompanySettingsEntity,
    OrgThemesEntity,
    CompanyDashboardEntity,
    InterlinksEntity,
    CampaignEntity,
    CampaignActivityEntity,
    CampaignRewardEntity,
    CashRewardEntity,
    ImportUserRequestEntity,
} from '@common-constants';
import {
    RegistrationController,
    CompanyController,
    WellnessController,
    UserController,
    AgreementsController,
    PaymentsController,
    InvitationsController,
} from './module';
import { AppOnboardingConfigProvider } from './config/app-onboarding-config-provider.service';
import { appConstant } from '@common-constants';
import { ActivityLogService } from './module/master/activitylog/activitylog.service';
import { UserService } from './module/user/user.service';
import { OnboardingService } from './module/registration/onboarding.service';
import { CompanyService } from './module/companies/company.service';
import { MetaService } from './module/companies/meta.service';
import { ActivePluginService } from './module/companies/activeplugin.service';
import { LocationService } from './module/companies/location.service';
import { DepartmentService } from './module/companies/department.service';
import { SettingsService } from './module/companies/settings.service';
import { OrgThemesService } from './module/companies/orgthemes.service';
import { DashboardService } from './module/companies/dashboard.service';
import { UserSettingsService } from './module/user/usersettings.service';
import { InterlinksService } from './module/registration/interlinks.service';
import { CampaignService } from './module/wellness/campaign.service';
import { CampaignActivityService } from './module/wellness/campaignactivity.service';
import { CampaignRewardService } from './module/wellness/campaignreward.service';
import { CashRewardService } from './module/wellness/cashreward.service';
import { AgreementsService } from './module/agreements/agreements.service';
import { ImportUserRequestService } from './module/user/importuserrequest.service';
import { InvitationsService } from './module/invitations/invitations.service';
import {
    CommonService,
    CommonArrayService,
    CommonFileService,
    CommonDateService,
    CacheService,
} from '@common-constants';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
            imports: [AppOnboardingConfigModule],
            name: appConstant.MAIN.toLowerCase(),
            useFactory: (configService: AppOnboardingConfigProvider) => {
                return {
                    ...configService.typeOrmConfig,
                    name: configService.typeOrmConfig.name,
                };
            },
            inject: [AppOnboardingConfigProvider],
        }),
        TypeOrmModule.forRootAsync({
            imports: [AppOnboardingConfigModule],
            name: appConstant.READ_REPLICA.toLowerCase(),
            useFactory: (configService: AppOnboardingConfigProvider) => {
                return {
                    ...configService.typeOrmConfig1,
                    name: configService.typeOrmConfig1.name,
                };
            },
            inject: [AppOnboardingConfigProvider],
        }),
        TypeOrmModule.forFeature(
            [
                UserEntity,
                UserSettingsEntity,
                CompaniesEntity,
                OnboardingEntity,
                CompanyMetaEntity,
                ActivePluginsEntity,
                DepartmentsEntity,
                LocationsEntity,
                CompanySettingsEntity,
                OrgThemesEntity,
                CompanyDashboardEntity,
                InterlinksEntity,
                CampaignEntity,
                CampaignActivityEntity,
                CampaignRewardEntity,
                CashRewardEntity,
                ImportUserRequestEntity,
            ],
            appConstant.READ_REPLICA.toLowerCase(),
        ),
        TypeOrmModule.forFeature(
            [
                UserEntity,
                UserSettingsEntity,
                CompaniesEntity,
                OnboardingEntity,
                CompanyMetaEntity,
                ActivePluginsEntity,
                DepartmentsEntity,
                LocationsEntity,
                CompanySettingsEntity,
                OrgThemesEntity,
                CompanyDashboardEntity,
                InterlinksEntity,
                CampaignEntity,
                CampaignActivityEntity,
                CampaignRewardEntity,
                CashRewardEntity,
                ImportUserRequestEntity,
            ],
            appConstant.MAIN.toLowerCase(),
        ),
    ],
    controllers: [
        AppController,
        RegistrationController,
        CompanyController,
        WellnessController,
        UserController,
        AgreementsController,
        PaymentsController,
        InvitationsController,
    ],
    exports: [],
    providers: [
        AppService,
        ActivityLogService,
        OnboardingService,
        UserService,
        CompanyService,
        MetaService,
        ActivePluginService,
        LocationService,
        DepartmentService,
        SettingsService,
        OrgThemesService,
        DashboardService,
        UserSettingsService,
        InterlinksService,
        CampaignService,
        CampaignActivityService,
        CampaignRewardService,
        CashRewardService,
        AgreementsService,
        ImportUserRequestService,
        InvitationsService,
        CommonArrayService,
        CommonFileService,
        CommonDateService,
        CacheService,
        CommonService,
        {
            provide: 'CENSUS_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.CENSUS_SERVICE_HOST_PROD,
                        port: Number(process.env.CENSUS_SERVICE_PORT_PROD),
                    },
                });
            },
        },
        {
            provide: 'COMMON_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.COMMON_SERVICE_HOST_PROD,
                        port: Number(process.env.COMMON_SERVICE_PORT_PROD),
                    },
                });
            },
        },
        {
            provide: 'POSTCODES_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.TIMEZONES_SERVICE_HOST_PROD,
                        port: Number(process.env.TIMEZONES_SERVICE_PORT_PROD),
                    },
                });
            },
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
                    },
                });
            },
        },
    ],
})
export class AppModule {}
