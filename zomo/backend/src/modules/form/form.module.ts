import { AgeActivityEntity, AgeGenderCompleteEntity, appConstant, AssessmentHraBiometricEntity, BiometricsEntity, CommunicationTemplateTextsEntity, CompaniesEntity, CompanySettingsEntity, DentistsEntity, DepartmentsEntity, DiseaseFormsEntity, DiseaseManageFormsEntity, DiseasesEntity, FormInstructionsEntity, OptometristsEntity, TobaccoUsesEntity, UserEntity } from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from '../user/user/user.service';
import { FormController } from './form.controller';
import { FormService } from './form.service';
import { FormHelperService } from './formhelper.service';
@Module({
    imports: [
        TypeOrmModule.forFeature([
            UserEntity,
            FormInstructionsEntity,
            DiseaseManageFormsEntity,
            DiseaseFormsEntity,
            DiseasesEntity,
            AgeActivityEntity,
            BiometricsEntity,
            DentistsEntity,
            CompanySettingsEntity,
            CompaniesEntity,
            CommunicationTemplateTextsEntity,
            AgeGenderCompleteEntity,
            OptometristsEntity,
            DepartmentsEntity,
            TobaccoUsesEntity,
            AssessmentHraBiometricEntity,
        ], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([
            UserEntity,
            FormInstructionsEntity,
            DiseaseManageFormsEntity,
            DiseaseFormsEntity,
            DiseasesEntity,
            AgeActivityEntity,
            BiometricsEntity,
            DentistsEntity,
            CompanySettingsEntity,
            CompaniesEntity,
            CommunicationTemplateTextsEntity,
            AgeGenderCompleteEntity,
            OptometristsEntity,
            DepartmentsEntity,
            TobaccoUsesEntity,
            AssessmentHraBiometricEntity,
        ], appConstant.MAIN.toLowerCase()),
    ],
    controllers: [
        FormController,
    ],
    providers: [
        UserService,
        FormService,
        FormHelperService,
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
    ],
    exports: [
        UserService,
        FormService,
        FormHelperService
    ],
})
export class FormModule { }