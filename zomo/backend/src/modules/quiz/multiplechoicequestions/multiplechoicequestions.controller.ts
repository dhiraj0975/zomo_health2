import { CommonArrayService, QuizMultipleChoiceQuestionsDto, tableConstant } from '@common-constants';
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
    CreateMultipleChoiceQuestionsInput,
    DeleteMultipleChoiceQuestionsInput,
    GetOneMultipleChoiceQuestionsInput,
    UpdateMultipleChoiceQuestionsInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { QuizMultipleChoiceQuestionService } from './multiplechoicequestions.service';
@Controller('quiz/multiple-choice-question')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class QuizMultipleChoiceQuestionController {
    constructor(
        private readonly quizMultipleChoiceQuestionService: QuizMultipleChoiceQuestionService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateMultipleChoiceQuestionsInput) {
        try {
            if (!postData?.question_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let saveData = await this.quizMultipleChoiceQuestionService.save({...postData});
            let dynamicDatas = Object.create(null);
            if(postData?.opt_1){
                let tilte = `multiplechoice_option_${postData?.question_id}_opt1_${saveData['id']}`
                dynamicDatas[`${tilte}`]= postData?.opt_1;
            }            
            if(postData?.opt_2){
                let tilte = `multiplechoice_option_${postData?.question_id}_opt2_${saveData['id']}`
                dynamicDatas[`${tilte}`]= postData?.opt_2;
            }            
            if(postData?.opt_3){
                let tilte = `multiplechoice_option_${postData?.question_id}_opt3_${saveData['id']}`
                dynamicDatas[`${tilte}`]= postData?.opt_3;
            }            
            if(postData?.opt_4){
                let tilte = `multiplechoice_option_${postData?.question_id}_opt4_${saveData['id']}`
                dynamicDatas[`${tilte}`]= postData?.opt_4;
            }            
            if(postData?.opt_5){
                let tilte = `multiplechoice_option_${postData?.question_id}_opt5_${saveData['id']}`
                dynamicDatas[`${tilte}`]= postData?.opt_5;
            }            
            if(postData?.opt_6){
                let tilte = `multiplechoice_option_${postData?.question_id}_opt6_${saveData['id']}`
                dynamicDatas[`${tilte}`]= postData?.opt_6;
            }            
            await this.translatorService.DynamicEngJsonData('Quizzes','0',dynamicDatas,'Edit','Quizzes',saveData['question_id']);
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateMultipleChoiceQuestionsInput) {
        try {
            if (!postData?.id || !postData?.question_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.quizMultipleChoiceQuestionService.findOne({ id: postData?.id,question_id: postData?.question_id });
            await this.quizMultipleChoiceQuestionService.update({ id: postData?.id,question_id: postData?.question_id },{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.QUIZ.TBL_QZ_MULTIPLE_CHOICE_QUESTIONS, req.tokenUser?.id);
            let dynamicDatas = Object.create(null);
            if(postData?.opt_1){
                let tilte = `multiplechoice_option_${postData?.question_id}_opt1_${postData['id']}`
                dynamicDatas[`${tilte}`]= postData?.opt_1;
            }            
            if(postData?.opt_2){
                let tilte = `multiplechoice_option_${postData?.question_id}_opt2_${postData['id']}`
                dynamicDatas[`${tilte}`]= postData?.opt_2;
            }            
            if(postData?.opt_3){
                let tilte = `multiplechoice_option_${postData?.question_id}_opt3_${postData['id']}`
                dynamicDatas[`${tilte}`]= postData?.opt_3;
            }            
            if(postData?.opt_4){
                let tilte = `multiplechoice_option_${postData?.question_id}_opt4_${postData['id']}`
                dynamicDatas[`${tilte}`]= postData?.opt_4;
            }            
            if(postData?.opt_5){
                let tilte = `multiplechoice_option_${postData?.question_id}_opt5_${postData['id']}`
                dynamicDatas[`${tilte}`]= postData?.opt_5;
            }            
            if(postData?.opt_6){
                let tilte = `multiplechoice_option_${postData?.question_id}_opt6_${postData['id']}`
                dynamicDatas[`${tilte}`]= postData?.opt_6;
            }            
            await this.translatorService.DynamicEngJsonData('Quizzes','0',dynamicDatas,'Edit','Quizzes',recordDetails['question_id']);
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteMultipleChoiceQuestionsInput) {
        try {
            if (!postData?.id || !postData?.question_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.quizMultipleChoiceQuestionService.findOne({
                id: postData?.id,
                question_id: postData?.question_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.quizMultipleChoiceQuestionService.update({id: postData?.id, question_id: postData?.question_id},{status: 2});
            this.activityLogService.create(recordDetails, {opt_1: recordDetails}, tableConstant.QUIZ.TBL_QZ_MULTIPLE_CHOICE_QUESTIONS, req.tokenUser?.id, 'delete');
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneMultipleChoiceQuestionsInput) {
        try {
            if (!postData?.id || !postData?.question_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.quizMultipleChoiceQuestionService.findOne({id: postData?.id, question_id: postData?.question_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(QuizMultipleChoiceQuestionsDto, resultedData, req.lang)
            );
            if(resultedData.opt_1){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`multiplechoice_option_${resultedData.question_id}_opt1_${resultedData['id']}`, `/LC_MESSAGES/Quizzes/Quizzes/0/${resultedData['question_id']}`,`dynamic`);
                resultedData.opt_1 = (customName == '' || customName == `multiplechoice_option_${resultedData.question_id}_opt1_${resultedData['id']}`) ? resultedData['opt_1'] : customName;
            }
            if(resultedData.opt_2){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`multiplechoice_option_${resultedData.question_id}_opt2_${resultedData['id']}`, `/LC_MESSAGES/Quizzes/Quizzes/0/${resultedData['question_id']}`,`dynamic`);
                resultedData.opt_2 = (customName == '' || customName == `multiplechoice_option_${resultedData.question_id}_opt2_${resultedData['id']}`) ? resultedData['opt_2'] : customName;
            }
            if(resultedData.opt_3){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`multiplechoice_option_${resultedData.question_id}_opt3_${resultedData['id']}`, `/LC_MESSAGES/Quizzes/Quizzes/0/${resultedData['question_id']}`,`dynamic`);
                resultedData.opt_3 = (customName == '' || customName == `multiplechoice_option_${resultedData.question_id}_opt3_${resultedData['id']}`) ? resultedData['opt_3'] : customName;
            }
            if(resultedData.opt_4){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`multiplechoice_option_${resultedData.question_id}_opt4_${resultedData['id']}`, `/LC_MESSAGES/Quizzes/Quizzes/0/${resultedData['question_id']}`,`dynamic`);
                resultedData.opt_4 = (customName == '' || customName == `multiplechoice_option_${resultedData.question_id}_opt4_${resultedData['id']}`) ? resultedData['opt_4'] : customName;
            }
            if(resultedData.opt_5){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`multiplechoice_option_${resultedData.question_id}_opt5_${resultedData['id']}`, `/LC_MESSAGES/Quizzes/Quizzes/0/${resultedData['question_id']}`,`dynamic`);
                resultedData.opt_5 = (customName == '' || customName == `multiplechoice_option_${resultedData.question_id}_opt5_${resultedData['id']}`) ? resultedData['opt_5'] : customName;
            }
            if(resultedData.opt_6){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`multiplechoice_option_${resultedData.question_id}_opt6_${resultedData['id']}`, `/LC_MESSAGES/Quizzes/Quizzes/0/${resultedData['question_id']}`,`dynamic`);
                resultedData.opt_6 = (customName == '' || customName == `multiplechoice_option_${resultedData.question_id}_opt6_${resultedData['id']}`) ? resultedData['opt_6'] : customName;
            }
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