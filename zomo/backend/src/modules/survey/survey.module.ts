import { appConstant, SurveyAnswersEntity, SurveyPopupEntity, SurveyQuestionsEntity, SurveyUserAnswersEntity } from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FrontService } from "./front/front.service";
import { SurveyAnswersController } from "./surveyanswers/surveyanswers.controller";
import { SurveyAnswersService } from "./surveyanswers/surveyanswers.service";
import { SurveyPopupController } from "./surveypopup/surveypopup.controller";
import { SurveyPopupService } from "./surveypopup/surveypopup.service";
import { SurveyQuestionsController } from "./surveyquetions/surveyquestions.controller";
import { SurveyQuestionsService } from "./surveyquetions/surveyquestions.service";
import { SurveyUserAnswersController } from "./surveyuseranswers/surveyuseranswers.controller";
import { SurveyUserAnswersService } from "./surveyuseranswers/surveyuseranswers.service";
@Module({
    imports: [
        TypeOrmModule.forFeature([SurveyAnswersEntity,SurveyPopupEntity,SurveyQuestionsEntity,SurveyUserAnswersEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([SurveyAnswersEntity,SurveyPopupEntity,SurveyQuestionsEntity,SurveyUserAnswersEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [
        SurveyAnswersService,SurveyPopupService,SurveyQuestionsService,SurveyUserAnswersService,FrontService,
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
    controllers: [SurveyAnswersController,SurveyPopupController,SurveyQuestionsController,SurveyUserAnswersController],
    exports: [SurveyAnswersService,SurveyPopupService,SurveyQuestionsService,SurveyUserAnswersService,FrontService],
})
export class SurveyModule {}
