import { appConstant, CompaniesEntity, QuizAssignQuizOrgEntity, QuizCategoriesEntity, QuizClicksEntity, QuizDetailsEntity, QuizFillUpQuestionEntity, QuizHotspotQuestionEntity, QuizMatchingDragDropQuestionEntity, QuizMatchingDropDownQuestionEntity, QuizMultipleChoiceQuestionEntity, QuizMultipleQuestionEntity, QuizMultipleResponseQuestionEntity, QuizOrgEntity, QuizQuizzesEntity, QuizSectionEntity, QuizTrueFalseQuestionsEntity, QuizUserDetailsEntity, QuizWebinarEntity, UserDetailsEntity } from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from "@nestjs/config";
import { ClientProxyFactory, Transport } from "@nestjs/microservices";
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizAssignQuizOrgController } from "./assignquizorgs/assignquizorgs.controller";
import { QuizAssignQuizOrgService } from "./assignquizorgs/assignquizorgs.service";
import { QuizCategoriesController } from "./categories/categories.controller";
import { QuizCategoriesService } from "./categories/categories.service";
import { QuizFillUpQuestionController } from "./fillupquestions/fillupquestions.controller";
import { QuizFillUpQuestionService } from "./fillupquestions/fillupquestions.service";
import { FrontService } from "./front/front.service";
import { QuizHotspotQuestionController } from "./hotspotquestions/hotspotquestions.controller";
import { QuizHotspotQuestionService } from "./hotspotquestions/hotspotquestions.service";
import { QuizMatchingDragDropQuestionController } from "./matchingdragdropquestions/matchingdragdropquestions.controller";
import { QuizMatchingDragDropQuestionService } from "./matchingdragdropquestions/matchingdragdropquestions.service";
import { QuizMatchingDropDownQuestionController } from "./matchingdropdownquestions/matchingdropdownquestions.controller";
import { QuizMatchingDropDownQuestionService } from "./matchingdropdownquestions/matchingdropdownquestions.service";
import { QuizMultipleChoiceQuestionController } from "./multiplechoicequestions/multiplechoicequestions.controller";
import { QuizMultipleChoiceQuestionService } from "./multiplechoicequestions/multiplechoicequestions.service";
import { QuizMultipleQuestionController } from "./multiplequestions/multiplequestions.controller";
import { QuizMultipleQuestionService } from "./multiplequestions/multiplequestions.service";
import { QuizMultipleResponseQuestionController } from "./multipleresponsequestions/multipleresponsequestions.controller";
import { QuizMultipleResponseQuestionService } from "./multipleresponsequestions/multipleresponsequestions.service";
import { QuizClicksController } from "./quizclicks/quizclicks.controller";
import { QuizClicksService } from "./quizclicks/quizclicks.service";
import { QuizDetailsController } from "./quizdetails/quizdetails.controller";
import { QuizDetailsService } from "./quizdetails/quizdetails.service";
import { QuizOrgController } from "./quizorgs/quizorgs.controller";
import { QuizOrgService } from "./quizorgs/quizorgs.service";
import { QuizSectionController } from "./quizsections/quizsections.controller";
import { QuizSectionService } from "./quizsections/quizsections.service";
import { QuizUserDetailsController } from "./quizuserdetails/quizuserdetails.controller";
import { QuizUserDetailsService } from "./quizuserdetails/quizuserdetails.service";
import { QuizQuizzesController } from "./quizzes/quizzes.controller";
import { QuizQuizzesService } from "./quizzes/quizzes.service";
import { QuizTrueFalseQuestionsController } from "./truefalsequestions/truefalsequestions.controller";
import { QuizTrueFalseQuestionsService } from "./truefalsequestions/truefalsequestions.service";
import { UserDetailsController } from "./userdetails/userdetails.controller";
import { UserDetailsService } from "./userdetails/userdetails.service";
import { QuizWebinarController } from './webinar/quizwebinar.controller';
import { QuizWebinarService } from './webinar/quizwebinar.service';
@Module({
    imports: [
        TypeOrmModule.forFeature([QuizAssignQuizOrgEntity, QuizCategoriesEntity, QuizFillUpQuestionEntity, QuizHotspotQuestionEntity, QuizMatchingDragDropQuestionEntity, QuizMatchingDropDownQuestionEntity, QuizMultipleChoiceQuestionEntity, QuizMultipleQuestionEntity, QuizMultipleResponseQuestionEntity, QuizClicksEntity, QuizDetailsEntity, QuizOrgEntity, QuizSectionEntity, QuizUserDetailsEntity, QuizQuizzesEntity, QuizTrueFalseQuestionsEntity, UserDetailsEntity, CompaniesEntity, QuizWebinarEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([QuizAssignQuizOrgEntity, QuizCategoriesEntity, QuizFillUpQuestionEntity, QuizHotspotQuestionEntity, QuizMatchingDragDropQuestionEntity, QuizMatchingDropDownQuestionEntity, QuizMultipleChoiceQuestionEntity, QuizMultipleQuestionEntity, QuizMultipleResponseQuestionEntity, QuizClicksEntity, QuizDetailsEntity, QuizOrgEntity, QuizSectionEntity, QuizUserDetailsEntity, QuizQuizzesEntity, QuizTrueFalseQuestionsEntity, UserDetailsEntity, CompaniesEntity, QuizWebinarEntity], appConstant.MAIN.toLowerCase()),
        ],
    providers: [
        QuizAssignQuizOrgService, QuizCategoriesService, QuizFillUpQuestionService, QuizHotspotQuestionService, QuizMatchingDragDropQuestionService, QuizMatchingDropDownQuestionService, QuizMultipleChoiceQuestionService, QuizMultipleQuestionService, QuizMultipleResponseQuestionService, QuizClicksService, QuizDetailsService, QuizOrgService, QuizSectionService, QuizUserDetailsService, QuizQuizzesService, QuizTrueFalseQuestionsService, UserDetailsService, FrontService, QuizWebinarService,
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
    controllers: [QuizAssignQuizOrgController, QuizCategoriesController, QuizFillUpQuestionController, QuizHotspotQuestionController, QuizMatchingDragDropQuestionController, QuizMatchingDropDownQuestionController, QuizMultipleChoiceQuestionController, QuizMultipleQuestionController, QuizMultipleResponseQuestionController, QuizClicksController, QuizDetailsController, QuizOrgController, QuizSectionController, QuizUserDetailsController, QuizQuizzesController, QuizTrueFalseQuestionsController, UserDetailsController, QuizWebinarController,],
    exports: [QuizAssignQuizOrgService, QuizCategoriesService, QuizFillUpQuestionService, QuizHotspotQuestionService, QuizMatchingDragDropQuestionService, QuizMatchingDropDownQuestionService, QuizMultipleChoiceQuestionService, QuizMultipleQuestionService, QuizMultipleResponseQuestionService, QuizClicksService, QuizDetailsService, QuizOrgService, QuizSectionService, QuizUserDetailsService, QuizQuizzesService, QuizTrueFalseQuestionsService, UserDetailsService, FrontService, QuizWebinarService,],
})
export class QuizModule {}
