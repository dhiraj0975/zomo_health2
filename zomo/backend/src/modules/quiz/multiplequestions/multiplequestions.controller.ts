import { CommonArrayService, QuizMultipleQuestionsDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Request, Response } from "express";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateMultipleQuestionsInput,
    DeleteMultipleQuestionsInput,
    GetOneMultipleQuestionsInput,
    UpdateMultipleQuestionsInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { QuizMultipleQuestionService } from './multiplequestions.service';
@Controller('quiz/multiple-question')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class QuizMultipleQuestionController {
    constructor(
        private readonly quizMultipleQuestionService: QuizMultipleQuestionService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateMultipleQuestionsInput) {
        try {
            if (!postData?.question_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let saveData = await this.quizMultipleQuestionService.save({...postData});
            let dynamicData = Object.create(null);
            if(postData?.question){
                let title = `multiple_question_${postData?.question_id}_${saveData['id']}`
                dynamicData[`${title}`]= postData?.question;
            }                                    
            await this.translatorService.DynamicEngJsonData('Quizzes','0',dynamicData,'Edit','Quizzes',saveData['question_id']);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                  statusCode: 401,
                  success: 0,
                  error: 1,
                  message: error?.message,
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateMultipleQuestionsInput) {
        try {
            if (!postData?.id || !postData?.question_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.quizMultipleQuestionService.findOne({ id: postData?.id,question_id: postData?.question_id });
            await this.quizMultipleQuestionService.update({ id: postData?.id,question_id: postData?.question_id },{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.QUIZ.TBL_QZ_MULTIPLE_QUESTIONS, req.tokenUser?.id);
            let dynamicData = Object.create(null);
            if(postData?.question){
                let title = `multiple_question_${postData?.question_id}_${recordDetails['id']}`
                dynamicData[`${title}`]= postData?.question;
            }                                    
            await this.translatorService.DynamicEngJsonData('Quizzes','0',dynamicData,'Edit','Quizzes',recordDetails['question_id']);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                  statusCode: 401,
                  success: 0,
                  error: 1,
                  message: error?.message,
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteMultipleQuestionsInput) {
        try {
            if (!postData?.id || !postData?.question_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.quizMultipleQuestionService.findOne({
                id: postData?.id,
                question_id: postData?.question_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.quizMultipleQuestionService.update({id: postData?.id, question_id: postData?.question_id},{status: 2});
            this.activityLogService.create(recordDetails, {question: recordDetails}, tableConstant.QUIZ.TBL_QZ_MULTIPLE_QUESTIONS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                  statusCode: 401,
                  success: 0,
                  error: 1,
                  message: error?.message,
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneMultipleQuestionsInput) {
        try {
            if (!postData?.id || !postData?.question_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.quizMultipleQuestionService.findOne({id: postData?.id, question_id: postData?.question_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(QuizMultipleQuestionsDto, resultedData, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                  statusCode: 401,
                  success: 0,
                  error: 1,
                  message: error?.message,
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
}