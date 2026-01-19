import { appConstant, CovidAnswerEntity, CovidPassportSettingsEntity, CovidPassportUserEntity, CovidQuestionsEntity, CovidReportEntity, CovidSettingsEntity, CovidUserAnswersEntity, CovidVaccinationTypeEntity, UserEntity } from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from '../user/user/user.service';
import { AnswersController } from "./answers/answers.controller";
import { AnswersService } from "./answers/answers.service";
import { CovidReport } from './covidReport/covidReport.service';
import { PassportSettingsController } from './passportSettings/passportSettings.controller';
import { PassportSettingsService } from './passportSettings/passportSettings.service';
import { passportUsersController } from './passportUsers/passportUsers.controller';
import { PassportUsersService } from './passportUsers/passportUsers.service';
import { QuestionsController } from "./questions/questions.controller";
import { QuestionsService } from "./questions/questions.service";
import { SettingsController } from "./settings/settings.controller";
import { SettingsService } from "./settings/settings.service";
import { UserAnswersController } from "./userAnswers/userAnswers.controller";
import { UserAnswersService } from "./userAnswers/userAnswers.service";
import { VaccinationTypeController } from './vaccinationType/vaccinationType.controller';
import { VaccinationTypeService } from './vaccinationType/vaccinationType.service';
@Module({
    imports: [
        TypeOrmModule.forFeature([CovidAnswerEntity, CovidQuestionsEntity, CovidSettingsEntity, CovidUserAnswersEntity, CovidVaccinationTypeEntity, CovidPassportUserEntity, CovidPassportSettingsEntity,UserEntity,CovidReportEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([CovidAnswerEntity, CovidQuestionsEntity, CovidSettingsEntity, CovidUserAnswersEntity, CovidVaccinationTypeEntity, CovidPassportUserEntity, CovidPassportSettingsEntity,UserEntity,CovidReportEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [
        AnswersService,
        QuestionsService,
        SettingsService,
        UserAnswersService,
        VaccinationTypeService,
        PassportUsersService,
        PassportSettingsService, 
        UserService,
        CovidReport,
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
    controllers: [AnswersController, QuestionsController, SettingsController, UserAnswersController, VaccinationTypeController, passportUsersController, PassportSettingsController],
    exports: [AnswersService, QuestionsService, SettingsService, UserAnswersService, VaccinationTypeService, PassportUsersService, PassportSettingsService,UserService,CovidReport],
})
export class CovidModule {}
