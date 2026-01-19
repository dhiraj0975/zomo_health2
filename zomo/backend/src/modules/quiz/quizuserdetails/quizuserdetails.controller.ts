import { CommonArrayService, QuizUserDetailsDto, QzUserDetailsDto, tableConstant } from '@common-constants';
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
import { In, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    DeleteQuizUserDetailsInput,
    GetOneQuizUserDetailsInput,
    UpdateQuizUserDetailsInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { QuizFillUpQuestionService } from "../fillupquestions/fillupquestions.service";
import { QuizHotspotQuestionService } from "../hotspotquestions/hotspotquestions.service";
import { QuizMatchingDragDropQuestionService } from "../matchingdragdropquestions/matchingdragdropquestions.service";
import { QuizMatchingDropDownQuestionService } from "../matchingdropdownquestions/matchingdropdownquestions.service";
import { QuizMultipleChoiceQuestionService } from "../multiplechoicequestions/multiplechoicequestions.service";
import { QuizMultipleQuestionService } from "../multiplequestions/multiplequestions.service";
import { QuizMultipleResponseQuestionService } from "../multipleresponsequestions/multipleresponsequestions.service";
import { QuizDetailsService } from "../quizdetails/quizdetails.service";
import { QuizTrueFalseQuestionsService } from "../truefalsequestions/truefalsequestions.service";
import { UserDetailsService } from "../userdetails/userdetails.service";
import { QuizUserDetailsService } from './quizuserdetails.service';
@Controller('quiz/quiz-user-details')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class QuizUserDetailsController {
    constructor(
        private readonly quizUserDetailsService: QuizUserDetailsService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly quizDetailsService: QuizDetailsService,
        private readonly quizTrueFalseQuestionsService: QuizTrueFalseQuestionsService,
        private readonly quizMultipleChoiceQuestionService: QuizMultipleChoiceQuestionService,
        private readonly quizMultipleResponseQuestionService: QuizMultipleResponseQuestionService,
        private readonly quizMatchingDropDownQuestionService: QuizMatchingDropDownQuestionService,
        private readonly quizHotspotQuestionService: QuizHotspotQuestionService,
        private readonly quizFillUpQuestionService: QuizFillUpQuestionService,
        private readonly quizMatchingDragDropQuestionService: QuizMatchingDragDropQuestionService,
        private readonly quizMultipleQuestionService: QuizMultipleQuestionService,
        private readonly userDetailsService: UserDetailsService,
    ) {}
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (postData?.length === 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let resultedData = await this.userDetailsService.findOne({user_id: postData[0].user_id,quiz_id: postData[0].quiz_id, status: Not(2)},{ id: 'DESC' });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(QzUserDetailsDto, resultedData, req.lang)
            );
            let userDetailId = 0;
            if (resultedData) {
                userDetailId = resultedData.id
            }
            let questionArray = [];
            for (const data of postData) {
                if (data['timeout'] == 1 && data['quiz_id']) {
                    let quizRecord = await this.quizDetailsService.listRecord(
                        ['qd.quiz_type AS quiz_type','qd.id AS id'],
                        {quiz_id: data['quiz_id'],status: '1',id: Not(In(questionArray))},
                        {quest_order: 'ASC'}
                    );
                    for (let j = 0; j < quizRecord.length; j++) {
                        let unattemptedObj = {};
                        unattemptedObj['quiz_id'] = data.quiz_id;
                        unattemptedObj['question_id'] = quizRecord[j].id;
                        unattemptedObj['user_id'] = data.user_id;
                        unattemptedObj['skip'] = 1;
                        unattemptedObj['answer'] = '';
                        unattemptedObj['date'] = new Date();
                        unattemptedObj['qtype'] = quizRecord[j].quiz_type;
                        unattemptedObj['user_detail_id'] = userDetailId;
                        await this.quizUserDetailsService.save({...unattemptedObj});
                    }
                    break;
                }
                let answerObj = {},correctAnswerObj = {};
                answerObj['quiz_id'] = data.quiz_id;
                answerObj['question_id'] = data.question_id;
                answerObj['user_id'] = data.user_id;
                answerObj['skip'] = data.skip ?? 0;
                answerObj['answer'] = data.answer;
                answerObj['date'] = new Date();
                answerObj['qtype'] = data.qtype;
                answerObj['user_detail_id'] = userDetailId;
                questionArray.push(data.question_id);
                switch (data.qtype) {
                    case 'TrueFalse':
                            let trueFalseData = await this.quizTrueFalseQuestionsService.findOne({question_id: data.question_id});
                            answerObj['correct_answer'] = trueFalseData.quest_answer;
                        break;
                    case 'MultipleChoice':
                            let multipleChoiceQuestionData = await this.quizMultipleChoiceQuestionService.findOne({question_id: data.question_id});
                            answerObj['correct_answer'] = multipleChoiceQuestionData.quest_answer;
                        break;
                    case 'MultipleResponse':
                            let multipleResponseQuestionData = await this.quizMultipleResponseQuestionService.findOne({question_id: data.question_id});
                            answerObj['correct_answer'] = multipleResponseQuestionData.answers;
                        break;
                    case 'MatchingDropDown':
                            let dropDownQuestionData = await this.quizMatchingDropDownQuestionService.findOne( {question_id: data.question_id});
                            answerObj['correct_answer'] = dropDownQuestionData.right_answer;
                        break;
                    case 'Hotspot':
                            let quizHotspotQuestionData = await this.quizHotspotQuestionService.findOne({question_id: data.question_id});
                            answerObj['correct_answer'] = quizHotspotQuestionData.correct_block;
                        break;
                    case 'FillInTheBlanks':
                            let fillInTheBlanksQuestionData = await this.quizFillUpQuestionService.listRecord( {question_id: data.question_id,status : Not('2')},{id: 'ASC'});
                            for (let i = 0; i < fillInTheBlanksQuestionData.length; i++) {
                                correctAnswerObj[i] = fillInTheBlanksQuestionData[i].correct_blank;
                            }
                            answerObj['correct_answer'] = Object.values(correctAnswerObj).join(",");
                        break;
                    case 'MatchingDragDrop':
                            let MatchingDragDropQuestionData = await this.quizMatchingDragDropQuestionService.listRecord( {question_id: data.question_id,status : Not('2')},{id: 'ASC'});
                            for (let i = 0; i < MatchingDragDropQuestionData.length; i++) {
                                correctAnswerObj[i] = MatchingDragDropQuestionData[i].id;
                            }
                            answerObj['correct_answer'] = Object.values(correctAnswerObj).join(",");
                        break;
                    case 'MultipleQuestion':
                            let multipleQuestionData = await this.quizMultipleQuestionService.listRecord( {question_id: data.question_id,status : Not('2')},{id: 'ASC'});
                            for (let i = 0; i < multipleQuestionData.length; i++) {
                                correctAnswerObj[multipleQuestionData[i].id] = multipleQuestionData[i].answer;
                            }
                            answerObj['correct_answer'] = JSON.stringify(correctAnswerObj);
                            if (data.answer) {
                                answerObj['answer'] = JSON.stringify(data.answer);
                            }
                        break;
                }
                await this.quizUserDetailsService.save({...answerObj});
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,'MSG_QUIZ_SAVE_SUCCESSFULLY')
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateQuizUserDetailsInput) {
        try {
            if (!postData?.id || !postData?.quiz_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.quizUserDetailsService.findOne({ id: postData?.id,quiz_id: postData?.quiz_id, status: Not(2) });
            await this.quizUserDetailsService.update({ id: postData?.id,quiz_id: postData?.quiz_id },{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.QUIZ.TBL_QZ_QUIZ_USER_DETAILS, req.tokenUser?.id);
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteQuizUserDetailsInput) {
        try {
            if (!postData?.id || !postData?.quiz_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.quizUserDetailsService.findOne({
                id: postData?.id,
                quiz_id: postData?.quiz_id, status: Not(2)
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.quizUserDetailsService.update({id: postData?.id, quiz_id: postData?.quiz_id},{status: 2});
            this.activityLogService.create(recordDetails, {answer: recordDetails}, tableConstant.QUIZ.TBL_QZ_QUIZ_USER_DETAILS, req.tokenUser?.id, 'delete');
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneQuizUserDetailsInput) {
        try {
            if (!postData?.id || !postData?.quiz_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.quizUserDetailsService.findOne({id: postData?.id, quiz_id: postData?.quiz_id, status: Not(2)});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(QuizUserDetailsDto, resultedData, req.lang)
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