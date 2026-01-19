import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppCensusConfigModule } from './config/app-census-config.module';
import { ScheduleModule } from '@nestjs/schedule';
import {
    ImportUserRequestEntity,
    DepartmentsEntity,
    LocationsEntity,
    UserEntity,
    UserSettingsEntity,
    CensusCustomFieldsEntity,
    CensusCustomFieldsValuesEntity,
    CompaniesEntity,
    CommunicationTemplateTextsEntity,
} from '@common-constants';
import {
    DepartmentController,
    LocationController,
    UserController,
    ImportUserRequestController,
    UserSettingsController,
    BackupController,
    SkipController,
    CensusCustomFieldsValuesController,
    CompanyController,
    CommunicationController,
} from './module';
import { AppCensusConfigProvider } from './config/app-census-config-provider.service';
import { appConstant } from '@common-constants';
import { DepartmentService } from './module/departments/department.service';
import { LocationService } from './module/locations/location.service';
import { UserService } from './module/user/user.service';
import { ImportUserRequestService } from './module/importuserrequest/importuserrequest.service';
import { UserSettingsService } from './module/usersettings/usersettings.service';
import { CensusCustomFieldsService } from './module/censuscustomfields/censuscustomfields.service';
import { CensusCustomFieldsValuesService } from './module/censuscustomfieldsvalues/censuscustomfieldsvalues.service';
import { SkipService } from './module/skips/skips.service';
import { CompanyService } from './module/companies/company.service';
import { CommunicationTemplateTextsService } from './module/communication/communicationtemplatetexts.service';
import { ActivityLogService } from './module/master/activitylog/activitylog.service';
import {
    CommonService,
    CommonArrayService,
    CommonFileService,
    CommonDateService,
    CacheService,
} from '@common-constants';
import { CensusCommonService } from './common';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
            imports: [AppCensusConfigModule],
            name: appConstant.MAIN.toLowerCase(),
            useFactory: (configService: AppCensusConfigProvider) => {
                return {
                    ...configService.typeOrmConfig,
                    name: configService.typeOrmConfig.name,
                };
            },
            inject: [AppCensusConfigProvider],
        }),
        TypeOrmModule.forRootAsync({
            imports: [AppCensusConfigModule],
            name: appConstant.READ_REPLICA.toLowerCase(),
            useFactory: (configService: AppCensusConfigProvider) => {
                return {
                    ...configService.typeOrmConfig1,
                    name: configService.typeOrmConfig1.name,
                };
            },
            inject: [AppCensusConfigProvider],
        }),
        TypeOrmModule.forFeature(
            [
                ImportUserRequestEntity,
                DepartmentsEntity,
                LocationsEntity,
                UserEntity,
                UserSettingsEntity,
                CensusCustomFieldsEntity,
                CensusCustomFieldsValuesEntity,
                CompaniesEntity,
                CommunicationTemplateTextsEntity,
            ],
            appConstant.READ_REPLICA.toLowerCase(),
        ),
        TypeOrmModule.forFeature(
            [
                ImportUserRequestEntity,
                DepartmentsEntity,
                LocationsEntity,
                UserEntity,
                UserSettingsEntity,
                CensusCustomFieldsEntity,
                CensusCustomFieldsValuesEntity,
                CompaniesEntity,
                CommunicationTemplateTextsEntity,
            ],
            appConstant.MAIN.toLowerCase(),
        ),
    ],
    controllers: [
        AppController,
        DepartmentController,
        LocationController,
        UserController,
        ImportUserRequestController,
        UserSettingsController,
        CensusCustomFieldsValuesController,
        CompanyController,
        BackupController,
        SkipController,
        CommunicationController,
    ],
    exports: [
        CensusCommonService,
    ],
    providers: [
        AppService,
        BackupController,
        SkipController,
        DepartmentController,
        LocationController,
        UserController,
        UserSettingsController,
        CensusCustomFieldsValuesController,
        ImportUserRequestController,
        CommunicationController,
        CensusCommonService,
        DepartmentService,
        LocationService,
        UserService,
        ImportUserRequestService,
        UserSettingsService,
        CensusCustomFieldsService,
        CensusCustomFieldsValuesService,
        CompanyService,
        SkipService,
        ActivityLogService,
        CommunicationTemplateTextsService,
        CommonArrayService,
        CommonFileService,
        CommonDateService,
        CacheService,
        CommonService,
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
                    }
                })
            }
        },
    ],
})
export class AppModule {}
