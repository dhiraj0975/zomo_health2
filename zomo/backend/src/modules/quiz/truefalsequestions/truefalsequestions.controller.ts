import { CommonArrayService, QuizTrueFalseQuestionsDto, tableConstant } from '@common-constants';
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
    CreateTrueFalseQuestionsInput,
    DeleteTrueFalseQuestionsInput,
    GetOneTrueFalseQuestionsInput,
    UpdateTrueFalseQuestionsInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { QuizTrueFalseQuestionsService } from './truefalsequestions.service';
@Controller('quiz/true-false-questions')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class QuizTrueFalseQuestionsController {
    constructor(
        private readonly quizTrueFalseQuestionsService: QuizTrueFalseQuestionsService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateTrueFalseQuestionsInput) {
        try {
            if (!postData?.question_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.quizTrueFalseQuestionsService.save({...postData});
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateTrueFalseQuestionsInput) {
        try {
            if (!postData?.id || !postData?.question_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.quizTrueFalseQuestionsService.findOne({ id: postData?.id,question_id: postData?.question_id });
            await this.quizTrueFalseQuestionsService.update({ id: postData?.id,question_id: postData?.question_id },{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.QUIZ.TBL_QZ_TF_QUESTIONS, req.tokenUser?.id);
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteTrueFalseQuestionsInput) {
        try {
            if (!postData?.id || !postData?.question_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.quizTrueFalseQuestionsService.findOne({
                id: postData?.id,
                question_id: postData?.question_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.quizTrueFalseQuestionsService.update({id: postData?.id, question_id: postData?.question_id},{status: 2});
            this.activityLogService.create(recordDetails, {quest_answer: -1}, tableConstant.QUIZ.TBL_QZ_TF_QUESTIONS, req.tokenUser?.id, 'delete');
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneTrueFalseQuestionsInput) {
        try {
            if (!postData?.id || !postData?.question_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.quizTrueFalseQuestionsService.findOne({id: postData?.id, question_id: postData?.question_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(QuizTrueFalseQuestionsDto, resultedData, req.lang)
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