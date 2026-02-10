import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonService,
    Enum,
    QuizDetailsDto, QuizSectionEntity,
    QuizSectionsDto,
    tableConstant
} from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Put,
    Req,
    Res, UploadedFiles,
    UseGuards, UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from "@nestjs/microservices";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { lastValueFrom } from "rxjs";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { Between, In, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateQuizDetailsInput,
    DeleteQuizDetailsInput,
    GetOneQuizDetailsInput, PaginateWithCompanyInput,
    UpdateQuizDetailsInput
} from "../../../input";
import { fileName, imgFilter } from "../../../utils/image-upload.utils";
import { TranslationService } from "../../translation/translation.service";
import { UserService } from '../../user/user/user.service';
import { QuizAssignQuizOrgService } from "../assignquizorgs/assignquizorgs.service";
import { QuizFillUpQuestionService } from "../fillupquestions/fillupquestions.service";
import { FrontService } from "../front/front.service";
import { QuizHotspotQuestionService } from "../hotspotquestions/hotspotquestions.service";
import { QuizMatchingDragDropQuestionService } from "../matchingdragdropquestions/matchingdragdropquestions.service";
import { QuizMatchingDropDownQuestionService } from "../matchingdropdownquestions/matchingdropdownquestions.service";
import { QuizMultipleChoiceQuestionService } from "../multiplechoicequestions/multiplechoicequestions.service";
import { QuizMultipleQuestionService } from "../multiplequestions/multiplequestions.service";
import { QuizMultipleResponseQuestionService } from "../multipleresponsequestions/multipleresponsequestions.service";
import { QuizSectionService } from "../quizsections/quizsections.service";
import { QuizQuizzesService } from "../quizzes/quizzes.service";
import { QuizTrueFalseQuestionsService } from "../truefalsequestions/truefalsequestions.service";
import { UserDetailsService } from "../userdetails/userdetails.service";
import { QuizDetailsService } from './quizdetails.service';
const path = require('path');
@Controller('quiz/details')
@UseGuards(TokenGuard, RoleGuard)
export class QuizDetailsController {
    constructor(
        @Inject('TIMEZONE_SERVICE')
        private client: ClientProxy,
        private readonly quizDetailsService: QuizDetailsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly quizQuizzesService: QuizQuizzesService,
        private readonly quizSectionService: QuizSectionService,
        private readonly quizTrueFalseQuestionsService: QuizTrueFalseQuestionsService,
        private readonly quizMultipleChoiceQuestionService: QuizMultipleChoiceQuestionService,
        private readonly quizMultipleResponseQuestionService: QuizMultipleResponseQuestionService,
        private readonly quizMatchingDropDownQuestionService: QuizMatchingDropDownQuestionService,
        private readonly quizHotspotQuestionService: QuizHotspotQuestionService,
        private readonly quizFillUpQuestionService: QuizFillUpQuestionService,
        private readonly quizMatchingDragDropQuestionService: QuizMatchingDragDropQuestionService,
        private readonly quizMultipleQuestionService: QuizMultipleQuestionService,
        private readonly userService: UserService,
        private readonly userDetailsService: UserDetailsService,
        private readonly quizAssignQuizOrgService: QuizAssignQuizOrgService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly frontService: FrontService,
    ) {}
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.quiz_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = `qd.quiz_id = ${postData?.quiz_id} AND qd.status != '2'`;
            if (postData?.search_str) {
                where += ` AND (qz.quiz_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR qd.quiz_question LIKE '%${this.commonService.convertToHtmlEntity(postData?.search_str)}%')`;
            }
            const resultedData = await this.quizDetailsService.paginateList(
                where,
                postData,
                [tableConstant.QUIZ.TBL_QZ_QUIZZES]
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(QuizDetailsDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele?.qz?.is_default && ele?.qz?.is_default == 1){
                        ele.is_default = 1;
                    }else{
                        ele.is_default = 0;
                    }
                }));
            }
            if (postData?.type && postData?.type == 'webinar') {
                let quizIsDefault = await this.quizQuizzesService.findOne(
                    {
                        id: postData?.quiz_id,
                        is_default: 1,
                        status: Not('2')
                    }
                );
                if (quizIsDefault && quizIsDefault?.id) {
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: { ...resultedData, show_add_button: 0 },
                        message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
                    });
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: { ...resultedData, show_add_button: 1},
                    message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
                });
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
    @UseGuards(AccessGuard)
    @Post('quiz-start')
    async quizStart(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            if (!postData?.quiz_id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let resultedData: any = await this.quizQuizzesService.findOne({id: postData?.quiz_id});
            if(resultedData.quiz_name){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`quiz_name_${resultedData.id}`, `/LC_MESSAGES/Quizzes/Quizzes/0/${resultedData['id']}`,`dynamic`);
                resultedData.quiz_name = (customName == '' || customName == `quiz_name_${resultedData.id}`) ? resultedData['quiz_name'] : customName;
            }
            if(resultedData.quiz_description){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`quiz_description_${resultedData.id}`, `/LC_MESSAGES/Quizzes/Quizzes/0/${resultedData['id']}`,`dynamic`);
                resultedData.quiz_description = (customName == '' || customName == `quiz_description_${resultedData.id}`) ? resultedData['quiz_description'] : customName;
            }
            if (!resultedData) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            let limit,tableData: string[] = [],sectionData: string[] = [];
            let quizRecord = await this.quizDetailsService.listRecord(
                ['qd.quiz_type AS quiz_type','qd.ques_section AS ques_section'],
                {quiz_id: postData?.quiz_id,status: '1'},
                {quest_order: 'ASC'},
                [tableConstant.QUIZ.TBL_QZ_QUIZ_SECTIONS]
            );
            if (!quizRecord) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            /* num of retake and quiz count check if not pass then return flag 1 */
            /*NOTE: both check and section case manage and add here condition !postData?.section_id */
            if(appConstant.ROLE.REGISTERED == req.tokenUser?.role_id && postData?.user_id && postData?.page == '1' && !postData?.section_id) {
                let email,userName,membershipCode;
                if (!req.tokenUser?.email || !req.tokenUser?.username || !req.tokenUser?.membership_code) {
                    let userData = await this.userService.findUserRecord({id: postData?.user_id},['id','email','username','membership_code']);
                    email = userData.email;
                    userName = userData.username;
                    membershipCode = userData.membership_code;
                } else {
                    email = req.tokenUser?.email;
                    userName = req.tokenUser?.username;
                    membershipCode = req.tokenUser?.membership_code;
                }
                const quizAssignOrgData = await this.quizAssignQuizOrgService.findOne({ quiz_id: postData?.quiz_id, organization_id: membershipCode});
                let timezoneDetails = await lastValueFrom(this.client.send({cmd: 'find_postcode'}, {id: quizAssignOrgData.timezone}));
                let startDate = await this.commonDateService.DateTimeFormat(new Date(quizAssignOrgData.start_date), 'YYYY-MM-DD', 'MM/DD/YYYY');
                let endDate = await this.commonDateService.DateTimeFormat(new Date(quizAssignOrgData.end_date), 'YYYY-MM-DD', 'MM/DD/YYYY');
                let userQuizCount: any = await this.frontService.userDetailsCountData({quiz_id: postData?.quiz_id,membership_code: membershipCode, created_date: Between(startDate, endDate), user_id: postData?.user_id});
                if (userQuizCount < quizAssignOrgData.retakes) {
                    let qzUserDetail = {};
                    qzUserDetail['user_email'] = email;
                    qzUserDetail['user_name'] = userName;
                    qzUserDetail['user_id'] = postData?.user_id;
                    qzUserDetail['membership_code'] = membershipCode;
                    qzUserDetail['quiz_id'] = postData?.quiz_id;
                    qzUserDetail['quiz_cat'] = resultedData.cat_id;
                    qzUserDetail['completed'] = 'no';
                    qzUserDetail['total_questions'] = quizRecord.length;
                    qzUserDetail['timezone_name'] = timezoneDetails['timezone_name'];
                    await this.userDetailsService.save({...qzUserDetail});
                } else {
                    let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_EXCEED_RETAKES");
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: null,
                        message: errorMessage,
                        flag: 1
                    });
                }
            }
            let quizTypeArray = {'TrueFalse': tableConstant.QUIZ.TBL_QZ_TF_QUESTIONS, 'MultipleChoice': tableConstant.QUIZ.TBL_QZ_MULTIPLE_CHOICE_QUESTIONS, 'MultipleResponse': tableConstant.QUIZ.TBL_QZ_MULTIPLE_RESPONSE_QUESTIONS, 'MatchingDropDown': tableConstant.QUIZ.TBL_QZ_MATCHING_DROPDOWN_QUESTIONS,'Hotspot': tableConstant.QUIZ.TBL_QZ_HOTSPOT_QUESTIONS,'FillInTheBlanks': tableConstant.QUIZ.TBL_QZ_FILLUP_QUESTIONS,'MatchingDragDrop': tableConstant.QUIZ.TBL_QZ_MATCHING_DRAGDROP_QUESTIONS,'MultipleQuestion': tableConstant.QUIZ.TBL_QZ_MULTIPLE_QUESTIONS};
            for (let i: number = 0; i < quizRecord.length; i++) {
                let tableName = quizTypeArray[quizRecord[i]['quiz_type']]
                if (!tableData.includes(tableName)) {
                    tableData.push(tableName);
                }
                if (quizRecord[i]['ques_section'] && !sectionData.includes(quizRecord[i]['ques_section'])) {
                    sectionData.push(quizRecord[i]['ques_section']);
                }
            }
            if (resultedData.question_per_page == 2 && sectionData.length == 0) {
                resultedData.question_per_page = 1;
            }
            let quizDetailsRecord;
            postData.order = 'ASC';
            postData.order_by = 'quest_order';
            if (resultedData.question_per_page == 0) {
                postData.page = postData?.page || 1;
                postData.limit = postData?.limit || 1;
                quizDetailsRecord = await this.quizDetailsService.paginateList(
                    {quiz_id: postData?.quiz_id,status: '1'},
                    postData,
                    tableData,
                );
                if (quizDetailsRecord['list'].length == 0) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_QUIZ_NOT_FOUND"));
                }
                for (let i = 0; i < quizDetailsRecord['list'].length; i++) {
                    quizDetailsRecord['list'][i].quiz_status = 'Quiz';
                }
                quizDetailsRecord['list'] = <any>(
                    await this.commonArrayService.formatToDto(QuizDetailsDto, quizDetailsRecord['list'], req.lang)
                );
                quizDetailsRecord['type'] = resultedData.question_per_page
                quizDetailsRecord['total'] = quizRecord.length
            } else if (resultedData.question_per_page == 1) {
                limit = resultedData.num_of_questions
                postData.page = postData?.page || 1;
                postData.limit = limit;
                quizDetailsRecord = await this.quizDetailsService.paginateList(
                    {quiz_id: postData?.quiz_id,status: '1'},
                    postData,
                    tableData,
                );
                if (quizDetailsRecord['list'].length == 0) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_QUIZ_NOT_FOUND"));
                }
                for (let i = 0; i < quizDetailsRecord['list'].length; i++) {
                    quizDetailsRecord['list'][i].quiz_status = 'Quiz';
                }
                quizDetailsRecord['list'] = <any>(
                    await this.commonArrayService.formatToDto(QuizDetailsDto, quizDetailsRecord['list'], req.lang)
                );
                quizDetailsRecord['type'] = resultedData.question_per_page
                quizDetailsRecord['total'] = quizRecord.length
            } else {
                sectionData.sort((a, b) => Number(a) - Number(b));
                let quizSectionData: any = await this.quizSectionService.listRecord({ id: In(sectionData),quiz_id: postData?.quiz_id, status: Not(Enum.Two) },{id: 'ASC'});
                let sectionId = sectionData[0];
                if (postData?.section_id) {
                    sectionId = postData?.section_id;
                }
                postData.section_id = sectionId
                let quizDetailsSectionRecord = await this.quizDetailsService.paginateList(
                    {quiz_id: postData?.quiz_id,status: '1',ques_section: sectionId},
                    postData,
                    tableData,
                );
                if (quizDetailsSectionRecord.length == 0) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_QUIZ_NOT_FOUND"));
                }
                const translationResults = await Promise.all(
                    quizSectionData.flatMap((section) => {
                        const quizPath = `/LC_MESSAGES/Quizzes/Quizzes/0/${section['quiz_id']}`;
                        const requests = [];

                        if (section.name) {
                            requests.push(
                                this.translatorService.frontendReadTranslation(
                                    req.lang,
                                    `section_name_${section['id']}`,
                                    quizPath,
                                    'dynamic'
                                ).then(translation => {
                                    if (translation && translation !== `section_name_${section['id']}` && translation !== '') {
                                        section.name = translation;
                                    }
                                })
                            );
                        }

                        if (section.description) {
                            requests.push(
                                this.translatorService.frontendReadTranslation(
                                    req.lang,
                                    `section_description_${section['id']}`,
                                    quizPath,
                                    'dynamic'
                                ).then(translation => {
                                    if (translation && translation !== `section_description_${section['id']}` && translation !== '') {
                                        section.description = translation;
                                    }
                                })
                            );
                        }

                        return requests;
                    })
                );
                await Promise.all(translationResults);
                quizSectionData = <any>(
                    await this.commonArrayService.formatToDto(QuizSectionsDto, quizSectionData, req.lang)
                );
                for (let i = 0; i < quizDetailsSectionRecord.length; i++) {
                    quizDetailsSectionRecord[i].quiz_status = 'Quiz';
                }
                quizDetailsSectionRecord = <any>(
                    await this.commonArrayService.formatToDto(QuizDetailsDto, quizDetailsSectionRecord, req.lang)
                );
                quizDetailsRecord = {list: quizDetailsSectionRecord, section: quizSectionData, type: resultedData.question_per_page, total: quizRecord.length}
            }
            if(quizDetailsRecord && quizDetailsRecord['list'].length){
                const translationRequests = [];
                const keyMapping = new Map();

                quizDetailsRecord['list'].forEach((ele) => {
                    const quizPath = `/LC_MESSAGES/Quizzes/Quizzes/0/${ele['quiz_id']}`;

                    if (ele.quiz_question) {
                        const questionKey = `question_name_${ele.id}`;
                        translationRequests.push({
                            lang: req.lang,
                            key: questionKey,
                            path: quizPath,
                            type: 'dynamic'
                        });
                        keyMapping.set(questionKey, { ele, type: 'question' });
                    }

                    if (ele.answer_desc) {
                        const answerKey = `question_answer_${ele.id}`;
                        translationRequests.push({
                            lang: req.lang,
                            key: answerKey,
                            path: quizPath,
                            type: 'dynamic'
                        });
                        keyMapping.set(answerKey, { ele, type: 'answer' });
                    }

                    switch (ele.quiz_type) {
                        case 'MultipleChoice':
                            if (ele.mc && ele.mc.length > 0) {
                                ele.mc.forEach((mcData) => {
                                    for (let i = 1; i <= 6; i++) {
                                        if (mcData?.[`opt_${i}`]) {
                                            const optKey = `multiplechoice_option_${mcData.question_id}_opt${i}_${mcData['id']}`;
                                            translationRequests.push({
                                                lang: req.lang,
                                                key: optKey,
                                                path: quizPath,
                                                type: 'dynamic'
                                            });
                                            keyMapping.set(optKey, { ele, type: 'mc_option', index: i, data: mcData });
                                        }
                                    }
                                });
                            }
                            break;

                        case 'MultipleResponse':
                            if (ele.mr && ele.mr.length > 0) {
                                ele.mr.forEach((mrData) => {
                                    for (let i = 1; i <= 6; i++) {
                                        if (mrData?.[`choice_${i}`]) {
                                            const optKey = `multipleresponse_option_${ele.id}_choice${i}_${mrData['id']}`;
                                            translationRequests.push({
                                                lang: req.lang,
                                                key: optKey,
                                                path: quizPath,
                                                type: 'dynamic'
                                            });
                                            keyMapping.set(optKey, { ele, type: 'mr_choice', index: i, data: mrData });
                                        }
                                    }
                                });
                            }
                            break;

                        case 'MatchingDropDown':
                            if (ele.mdd && ele.mdd.length > 0) {
                                ele.mdd.forEach((mddItem) => {
                                    const optKey = `matchingdropdown_option_${ele.id}_${mddItem['id']}`;
                                    translationRequests.push({
                                        lang: req.lang,
                                        key: optKey,
                                        path: quizPath,
                                        type: 'dynamic'
                                    });
                                    keyMapping.set(optKey, { ele, type: 'mdd_option', data: mddItem });
                                });
                            }
                            break;

                        case 'FillInTheBlanks':
                            if (ele.fib && ele.fib.length > 0) {
                                ele.fib.forEach((fibItem) => {
                                    const optKey = `fillup_option_${ele.id}_${fibItem['id']}`;
                                    translationRequests.push({
                                        lang: req.lang,
                                        key: optKey,
                                        path: quizPath,
                                        type: 'dynamic'
                                    });
                                    keyMapping.set(optKey, { ele, type: 'fib_option', data: fibItem });
                                });
                            }
                            break;

                        case 'MatchingDragDrop':
                            if (ele.qdd && ele.qdd.length > 0) {
                                ele.qdd.forEach((qddItem) => {
                                    const questionKey = `dragdrop_question_${ele.id}_${qddItem['id']}`;
                                    const answerKey = `dragdrop_answer_${ele.id}_${qddItem['id']}`;

                                    translationRequests.push({
                                        lang: req.lang,
                                        key: questionKey,
                                        path: quizPath,
                                        type: 'dynamic'
                                    });
                                    translationRequests.push({
                                        lang: req.lang,
                                        key: answerKey,
                                        path: quizPath,
                                        type: 'dynamic'
                                    });

                                    keyMapping.set(questionKey, { ele, type: 'qdd_question', data: qddItem });
                                    keyMapping.set(answerKey, { ele, type: 'qdd_answer', data: qddItem });
                                });
                            }
                            break;

                        case 'MultipleQuestion':
                            if (ele.mq && ele.mq.length > 0) {
                                ele.mq.forEach((mqItem) => {
                                    const optKey = `multiple_question_${ele.id}_${mqItem['id']}`;
                                    translationRequests.push({
                                        lang: req.lang,
                                        key: optKey,
                                        path: quizPath,
                                        type: 'dynamic'
                                    });
                                    keyMapping.set(optKey, { ele, type: 'mq_question', data: mqItem });
                                });
                            }
                            break;
                    }
                });

                const translationResults = await Promise.all(
                    translationRequests.map(request =>
                        this.translatorService.frontendReadTranslation(
                            request.lang,
                            request.key,
                            request.path,
                            request.type
                        )
                    )
                );

                translationRequests.forEach((request, index) => {
                    const translation = translationResults[index];
                    const mapping = keyMapping.get(request.key);

                    if (!mapping || !translation || translation === request.key || translation === '') {
                        return;
                    }

                    const { ele, type, index: optIndex, data } = mapping;

                    switch (type) {
                        case 'question':
                            ele.quiz_question = translation;
                            break;

                        case 'answer':
                            ele.answer_desc = translation;
                            break;

                        case 'mc_option':
                            data[`opt_${optIndex}`] = translation;
                            break;

                        case 'mr_choice':
                            data[`choice_${optIndex}`] = translation;
                            break;

                        case 'mdd_option':
                            data.option_text = translation;
                            break;

                        case 'fib_option':
                            data['blank_options'] = translation;
                            break;

                        case 'qdd_question':
                            data['question'] = translation;
                            break;

                        case 'qdd_answer':
                            const answerIndex: number = translationRequests.findIndex(item => item.key === `dragdrop_answer_${data?.question_id}_${data?.key}`);
                            data['answer'] = translationResults[answerIndex];
                            break;

                        case 'mq_question':
                            data.question_text = translation;
                            break;
                    }
                });
            }

            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: quizDetailsRecord,
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
    @UseGuards(AccessGuard)
    @Post('quiz-score')
    async quizScore(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            postData.membership_code = postData?.membership_code ?? req.tokenUser?.membership_code;
            if (appConstant.ROLE.REGISTERED == req.tokenUser?.role_id && (!postData?.user_id || !postData?.membership_code)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if (!postData?.quiz_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let tableData: string[] = [],userDetailId;
            let quizRecord = await this.quizDetailsService.listRecord(
                ['qd.quiz_type AS quiz_type','qd.id AS id','qd.ques_section AS ques_section'],
                {quiz_id: postData?.quiz_id,status: '1'},
                {quest_order: 'ASC'},
                [tableConstant.QUIZ.TBL_QZ_QUIZ_SECTIONS]
            );
            if (!quizRecord) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            let quizTypeArray = {'TrueFalse': tableConstant.QUIZ.TBL_QZ_TF_QUESTIONS, 'MultipleChoice': tableConstant.QUIZ.TBL_QZ_MULTIPLE_CHOICE_QUESTIONS, 'MultipleResponse': tableConstant.QUIZ.TBL_QZ_MULTIPLE_RESPONSE_QUESTIONS, 'MatchingDropDown': tableConstant.QUIZ.TBL_QZ_MATCHING_DROPDOWN_QUESTIONS,'Hotspot': tableConstant.QUIZ.TBL_QZ_HOTSPOT_QUESTIONS,'FillInTheBlanks': tableConstant.QUIZ.TBL_QZ_FILLUP_QUESTIONS,'MatchingDragDrop': tableConstant.QUIZ.TBL_QZ_MATCHING_DRAGDROP_QUESTIONS,'MultipleQuestion': tableConstant.QUIZ.TBL_QZ_MULTIPLE_QUESTIONS};
            let superAdminAnswer = [];
            let sectionarraytemp = [];
            for (let i = 0; i < quizRecord.length; i++) {
                let tableName = quizTypeArray[quizRecord[i]['quiz_type']]
                if (!tableData.includes(tableName)) {
                    tableData.push(tableName);
                }
                if (quizRecord[i]?.['ques_section']) {
                    sectionarraytemp.push(quizRecord[i]['ques_section']);
                }
                if (appConstant.ROLE.ADMIN == req.tokenUser?.role_id || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) {
                let questionId = quizRecord[i]['id'];
                    let adminAnswer = JSON.parse(postData?.answers)
                    let result = adminAnswer.find(item => item.question_id === questionId);
                    superAdminAnswer.push(result);
                }
            }
            if (appConstant.ROLE.REGISTERED == req.tokenUser?.role_id) {
                tableData = [...tableData,...[tableConstant.QUIZ.TBL_QZ_QUIZ_USER_DETAILS]]
            }
            let quizDetailsWhere = `qd.quiz_id = ${postData?.quiz_id} AND qd.status = '1'`;
            if (sectionarraytemp.length) {
                let quizSection: QuizSectionEntity[] = await this.quizSectionService.getAll({quiz_id: postData?.quiz_id,status: Not(Enum.Two)},['id']);
                const quizSectionIdArray = quizSection.map(item => item?.id);
                if (quizSectionIdArray?.length) {
                    quizDetailsWhere += `AND qd.ques_section IN(${quizSectionIdArray.join(',')})`
                }
            }
            let quizListRecord = await this.quizDetailsService.listRecord(
                [],
                quizDetailsWhere,
                {quest_order: 'ASC'},
                tableData,
                postData
            );
            for (let i: number = 0; i < quizListRecord.length; i++) {
                let answer = '',skip = '';
                quizListRecord[i].result = 'Wrong';
                if (appConstant.ROLE.ADMIN == req.tokenUser?.role_id || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) {
                    if (superAdminAnswer.length == quizListRecord.length) {
                        answer = superAdminAnswer[i].answer;
                        skip = '0';
                        if (superAdminAnswer[i]?.skip && superAdminAnswer[i]?.skip == '1') {
                            skip = '1';
                            quizListRecord[i].result = 'Skip';
                        }
                    }
                } else {
                    /* Optimize  point => qud.correct_answer and skip enum ('0','1','2') add*/
                    if (quizListRecord[i]?.qud) {
                        answer = quizListRecord[i]?.qud?.answer;
                        skip = quizListRecord[i]?.qud?.skip;
                        if (quizListRecord[i]?.qud?.correct_answer == null) {
                            quizListRecord[i].result = 'Unattempted';
                        } else if (skip == '1') {
                            quizListRecord[i].result = 'Skip';
                        }
                    } else {
                        quizListRecord[i].result = 'Unattempted';
                        answer = '';
                        skip = '';
                    }
                }
                switch (quizListRecord[i].quiz_type) {
                    case 'TrueFalse':
                        if (skip != '1' && (answer == quizListRecord[i]?.tf?.quest_answer)) {
                            quizListRecord[i].result = 'Correct';
                        }
                        if (!['Skip', 'Unattempted'].includes(quizListRecord[i].result)) {
                            quizListRecord[i]['tf'].submited_answer = Number(answer);
                        }
                        break;
                    case 'MultipleChoice':
                        if (quizListRecord[i].mc && (answer == quizListRecord[i].mc.quest_answer)) {
                            quizListRecord[i].result = 'Correct';
                        }
                        quizListRecord[i].submited_answer = answer;
                        break;
                    case 'MultipleResponse':
                        const toNumArray = (str: string = ""): number[] => str.split(",").map(Number).filter(n => !isNaN(n));
                        const submittedAnswer = toNumArray(answer);
                        const multipleResponseAnswer = toNumArray(quizListRecord[i].mr?.answers);
                        if (
                            submittedAnswer.length > 0 &&
                            submittedAnswer.every(val => multipleResponseAnswer.includes(val))
                        ) {
                            quizListRecord[i].result = "Correct";
                        }
                        quizListRecord[i].submited_answer = answer;
                        break;
                    case 'MatchingDropDown':
                        if (quizListRecord[i].mdd && (answer == quizListRecord[i].mdd[0].right_answer)) {
                            quizListRecord[i].result = 'Correct';
                        }
                        quizListRecord[i].submited_answer = Number(answer);
                        break;
                    case 'Hotspot':
                        if (quizListRecord[i].hp && (answer == quizListRecord[i].hp.correct_block)) {
                            quizListRecord[i].result = 'Correct';
                        }
                        quizListRecord[i].submited_answer = answer;
                        break;
                    case 'FillInTheBlanks':
                        if (skip != '1') {
                            let answerArray = answer?.split(",") || [];
                            quizListRecord[i].fib.sort((a, b) => a.id - b.id);
                            let isEqual = answerArray.length === quizListRecord[i].fib.length && answerArray.every((value, index) => value.trim().toLowerCase() === quizListRecord[i]?.fib[index]?.blank_options.trim().toLowerCase());
                            if (isEqual) {
                                quizListRecord[i].result = 'Correct';
                            }
                        }
                        quizListRecord[i].submited_answer = answer;
                        break;
                    case 'MatchingDragDrop':
                        if (skip != '1') {
                            let answers = answer.split(",").map(Number);
                            let correctCount = 0;
                            quizListRecord[i].qdd.sort((a, b) => a.id - b.id);
                            let answerMap = new Map(answers.map((id, index) => [id, quizListRecord[i].qdd[index]]));
                            for (let j = 0; j < quizListRecord[i].qdd.length; j++) {
                                let item = quizListRecord[i].qdd[j];
                                let submittedAnswer = answerMap.get(item.id);
                                let status = submittedAnswer && submittedAnswer.id === item.id ? 1 : 0;
                                if (status === 1) {
                                    correctCount++;
                                }
                                quizListRecord[i].qdd[j] = {
                                    ...item,
                                    submited_answer: submittedAnswer ? submittedAnswer.answer : '',
                                    submited_answer_status: status
                                };
                            }
                            if (correctCount === quizListRecord[i].qdd.length) {
                                quizListRecord[i].result = 'Correct';
                            }
                        }
                        break;
                    case 'MultipleQuestion':
                        if (typeof answer == 'string' && answer.trim() != '') {
                            answer = JSON.parse(answer)
                        }
                            if (skip != '1') {
                                let resultCount = 0
                                for (let j = 0; j < quizListRecord[i].mq.length; j++) {
                                    quizListRecord[i].mq[j] = {...quizListRecord[i].mq[j], submited_answer: Number(answer[`${quizListRecord[i].mq[j].id}`])}
                                    if (answer[`${quizListRecord[i].mq[j].id}`] == quizListRecord[i].mq[j].answer) {
                                        quizListRecord[i].mq[j] = {...quizListRecord[i].mq[j], submited_answer: Number(answer[`${quizListRecord[i].mq[j].id}`])}
                                        resultCount++
                                    }
                                }
                                if (resultCount == quizListRecord[i].mq.length) {
                                    quizListRecord[i].result = 'Correct';
                                }
                            }
                        break;
                }
            }
            if (quizListRecord && quizListRecord.length) {
                const translationRequests = [];
                const keyMapping = new Map();

                quizListRecord.forEach((ele) => {
                    const quizPath = `/LC_MESSAGES/Quizzes/Quizzes/0/${ele['quiz_id']}`;

                    if (ele.quiz_question) {
                        const questionKey = `question_name_${ele.id}`;
                        translationRequests.push({
                            lang: req.lang,
                            key: questionKey,
                            path: quizPath,
                            type: 'dynamic'
                        });
                        keyMapping.set(questionKey, { ele, type: 'question' });
                    }

                    if (ele.answer_desc) {
                        const answerKey = `question_answer_${ele.id}`;
                        translationRequests.push({
                            lang: req.lang,
                            key: answerKey,
                            path: quizPath,
                            type: 'dynamic'
                        });
                        keyMapping.set(answerKey, { ele, type: 'answer' });
                    }

                    switch (ele.quiz_type) {
                        case 'MultipleChoice':
                            if (ele.mc) {
                                const mcData = Array.isArray(ele.mc) ? ele.mc[0] : ele.mc;
                                for (let i = 1; i <= 6; i++) {
                                    if (mcData?.[`opt_${i}`]) {
                                        const optKey = `multiplechoice_option_${mcData.question_id}_opt${i}_${mcData['id']}`;
                                        translationRequests.push({
                                            lang: req.lang,
                                            key: optKey,
                                            path: quizPath,
                                            type: 'dynamic'
                                        });
                                        keyMapping.set(optKey, {
                                            ele,
                                            type: 'mc_option',
                                            index: i,
                                            data: mcData
                                        });
                                    }
                                }
                            }
                            break;

                        case 'MultipleResponse':
                            if (ele.mr && ele.mr.length > 0) {
                                ele.mr.forEach((mrData) => {
                                    for (let i = 1; i <= 6; i++) {
                                        if (mrData?.[`choice_${i}`]) {
                                            const optKey = `multipleresponse_option_${ele.id}_choice${i}_${mrData['id']}`;
                                            translationRequests.push({
                                                lang: req.lang,
                                                key: optKey,
                                                path: quizPath,
                                                type: 'dynamic'
                                            });
                                            keyMapping.set(optKey, {
                                                ele,
                                                type: 'mr_choice',
                                                index: i,
                                                data: mrData
                                            });
                                        }
                                    }
                                });
                            }
                            break;

                        case 'MatchingDropDown':
                            if (ele.mdd && ele.mdd.length > 0) {
                                ele.mdd.forEach((mddItem) => {
                                    if (mddItem?.drop_options) {
                                        const optKey = `matchingdropdown_option_${ele.id}_${mddItem['id']}`;
                                        translationRequests.push({
                                            lang: req.lang,
                                            key: optKey,
                                            path: quizPath,
                                            type: 'dynamic'
                                        });
                                        keyMapping.set(optKey, {
                                            ele,
                                            type: 'mdd_option',
                                            data: mddItem
                                        });
                                    }
                                });
                            }
                            break;

                        case 'FillInTheBlanks':
                            if (ele.fib && ele.fib.length > 0) {
                                ele.fib.forEach((fibItem) => {
                                    if (fibItem?.blank_options) {
                                        const optKey = `fillup_option_${ele.id}_${fibItem['id']}`;
                                        translationRequests.push({
                                            lang: req.lang,
                                            key: optKey,
                                            path: quizPath,
                                            type: 'dynamic'
                                        });
                                        keyMapping.set(optKey, {
                                            ele,
                                            type: 'fib_option',
                                            data: fibItem
                                        });
                                    }
                                });
                            }
                            break;

                        case 'MatchingDragDrop':
                            if (ele.qdd && ele.qdd.length > 0) {
                                ele.qdd.forEach((qddItem) => {
                                    if (qddItem?.question) {
                                        const questionKey = `dragdrop_question_${ele.id}_${qddItem['id']}`;
                                        translationRequests.push({
                                            lang: req.lang,
                                            key: questionKey,
                                            path: quizPath,
                                            type: 'dynamic'
                                        });
                                        keyMapping.set(questionKey, {
                                            ele,
                                            type: 'qdd_question',
                                            data: qddItem
                                        });
                                    }
                                    if (qddItem?.answer) {
                                        const answerKey = `dragdrop_answer_${ele.id}_${qddItem['id']}`;
                                        translationRequests.push({
                                            lang: req.lang,
                                            key: answerKey,
                                            path: quizPath,
                                            type: 'dynamic'
                                        });
                                        keyMapping.set(answerKey, {
                                            ele,
                                            type: 'qdd_answer',
                                            data: qddItem
                                        });
                                    }
                                });
                            }
                            break;

                        case 'MultipleQuestion':
                            if (ele.mq && ele.mq.length > 0) {
                                ele.mq.forEach((mqItem) => {
                                    if (mqItem?.question_text) {
                                        const optKey = `multiple_question_${ele.id}_${mqItem['id']}`;
                                        translationRequests.push({
                                            lang: req.lang,
                                            key: optKey,
                                            path: quizPath,
                                            type: 'dynamic'
                                        });
                                        keyMapping.set(optKey, {
                                            ele,
                                            type: 'mq_question',
                                            data: mqItem
                                        });
                                    }
                                });
                            }
                            break;
                    }
                });

                if (translationRequests.length > 0) {
                    const translationResults = await Promise.all(
                        translationRequests.map(request =>
                            this.translatorService.frontendReadTranslation(
                                request.lang,
                                request.key,
                                request.path,
                                request.type
                            )
                        )
                    );

                    translationRequests.forEach((request, index) => {
                        const translation = translationResults[index];
                        const mapping = keyMapping.get(request.key);

                        if (!mapping || !translation || translation === request.key || translation === '') {
                            return;
                        }

                        const { ele, type, index: optIndex, data } = mapping;

                        switch (type) {
                            case 'question':
                                ele.quiz_question = translation;
                                break;

                            case 'answer':
                                ele.answer_desc = translation;
                                break;

                            case 'mc_option':
                                data[`opt_${optIndex}`] = translation;
                                break;

                            case 'mr_choice':
                                data[`choice_${optIndex}`] = translation;
                                break;

                            case 'mdd_option':
                                data.drop_options = translation;
                                data.option_text = translation;
                                break;

                            case 'fib_option':
                                data['blank_options'] = translation;
                                break;

                            case 'qdd_question':
                                data['question'] = translation;
                                break;

                            case 'qdd_answer':
                                data['answer'] = translation;
                                break;

                            case 'mq_question':
                                data.question_text = translation;
                                break;
                        }
                    });
                }
            }
            if (appConstant.ROLE.REGISTERED == req.tokenUser?.role_id) {
                userDetailId = quizListRecord?.[0]?.qud?.user_detail_id
            }
            quizListRecord = <any>(
                await this.commonArrayService.formatToDto(QuizDetailsDto, quizListRecord, req.lang)
            );
            let results = {
                correct: [],
                in_correct: [],
            };
            let skipQuiz = 0,inCorrectQuiz = 0,correctQuiz = 0;
            for (let i = 0; i < quizListRecord.length; i++) {
                if (quizListRecord[i].result == 'Correct') {
                    results.correct.push(quizListRecord[i]);
                    correctQuiz++;
                } else if (quizListRecord[i].result == 'Wrong') {
                    results.in_correct.push(quizListRecord[i])
                    inCorrectQuiz++;
                } else if (quizListRecord[i].result == 'Skip' ||  quizListRecord[i].result == 'Unattempted' ) {
                    results.in_correct.push(quizListRecord[i])
                    skipQuiz++;
                }
            }
            results['correct_quiz'] = correctQuiz;
            results['in_correct_quiz'] = inCorrectQuiz;
            results['skip_quiz'] = skipQuiz;
            results['total'] = quizListRecord.length;
            results['score'] = Number(((results['correct_quiz'] / results['total']) * 100).toFixed(2));
            if (appConstant.ROLE.REGISTERED == req.tokenUser?.role_id) {
                let quizPassingScore: any = await this.frontService.quizAssignQuizOrgData(['aqo.passing_score','aqo.activity_id'],{quiz_id: postData?.quiz_id,organization_id: postData?.membership_code,status: '1'});
                results['quiz_result'] = 0;
                let userDetailsUpdateObj = {score: results['score'], completed: 'yes'};
                if (results['score'] >= quizPassingScore?.passing_score) {
                    results['quiz_result'] = 1;
                    userDetailsUpdateObj['activity_id'] = quizPassingScore?.activity_id;
                }
                results['passing_score'] = quizPassingScore?.passing_score;
                let recordDetails = await this.userDetailsService.findOne({id: quizListRecord[0]?.user_detail_id, status: Not(2)});
                await this.userDetailsService.update({id: userDetailId},userDetailsUpdateObj);
                this.activityLogService.create(recordDetails, postData, tableConstant.QUIZ.TBL_QZ_USER_DETAILS, req.tokenUser?.id);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: results,
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
    @Post('create')
    @UseInterceptors(
        AnyFilesInterceptor( {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.QUIZ_ICON_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: imgFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateQuizDetailsInput, @UploadedFiles() file: Record<string, any>) {
        try {
            if (!postData?.quiz_id || !postData?.quiz_type || !postData?.quiz_question || !postData?.answer_desc) {
                if (file && Object.keys(file).length > 0) {
                    for(let fileData of Object.keys(file)){
                        await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);
                    }
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let checkQuiz: any = await this.quizQuizzesService.findOne({ id: postData?.quiz_id, status: Not(2) }, { id: 'DESC' });
            if (checkQuiz?.is_default == 1) {
                if (file && Object.keys(file).length > 0) {
                    for (let fileData of Object.keys(file)) {
                        await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);
                    }
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            let recordDetails: any = await this.quizDetailsService.findOne({ quiz_id: postData?.quiz_id },{id: 'DESC'}) || {quest_order: 0};
            let TrueFalse = postData?.TrueFalse ? JSON.parse(postData?.TrueFalse) : [];
            let MultipleChoice = postData?.MultipleChoice ? JSON.parse(postData?.MultipleChoice) : [];
            let MultipleResponse = postData?.MultipleResponse ? JSON.parse(postData?.MultipleResponse) : [];
            let MatchingDropDown = postData?.MatchingDropDown ? JSON.parse(postData?.MatchingDropDown) : [];
            let Hotspot = postData?.Hotspot ? JSON.parse(postData?.Hotspot) : [];
            let FillInTheBlanks = postData?.FillInTheBlanks ? JSON.parse(postData?.FillInTheBlanks) : [];
            let MatchingDragDrop = postData?.MatchingDragDrop ? JSON.parse(postData?.MatchingDragDrop) : [];
            let MultipleQuestion = postData?.MultipleQuestion ? JSON.parse(postData?.MultipleQuestion) : [];
            if ([TrueFalse,MultipleChoice,MultipleResponse,MatchingDropDown,Hotspot,FillInTheBlanks,MatchingDragDrop,MultipleQuestion].every(arr => arr.length === 0)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            delete postData?.TrueFalse;
            delete postData?.MultipleChoice;
            delete postData?.MultipleResponse;
            delete postData?.MatchingDropDown;
            delete postData?.Hotspot;
            delete postData?.FillInTheBlanks;
            delete postData?.MatchingDragDrop;
            delete postData?.MultipleQuestion;
            postData.quest_order = recordDetails['quest_order'] + 1;
            let saveData = await this.quizDetailsService.save({...postData});
            let dynamicData = Object.create(null);
            if(postData?.quiz_question){
                let title = `question_name_${saveData['id']}`
                dynamicData[`${title}`]= postData?.quiz_question;
            }            
            if(postData?.answer_desc){
                let title = `question_answer_${saveData['id']}`
                dynamicData[`${title}`]= postData?.answer_desc;
            }            
            await this.translatorService.DynamicEngJsonData('Quizzes','0',dynamicData,'Add','Quizzes',saveData['id']);
            if (saveData && saveData['id']) {
                switch (postData?.quiz_type) {
                    case 'TrueFalse':
                        if (TrueFalse.length > 0) {
                            await this.quizTrueFalseQuestionsService.save({question_id: saveData['id'], ...TrueFalse[0]});
                        }
                        break;
                    case 'MultipleChoice':
                        if (MultipleChoice.length > 0) {
                            let choiceData = await this.quizMultipleChoiceQuestionService.save({question_id: saveData['id'], ...MultipleChoice[0]});
                            let dynamicData = Object.create(null);    
                            for (let i = 1; i <= 6; i++) {
                                if(MultipleChoice[0][`opt_${i}`]){
                                    let optVal = `multiplechoice_option_${MultipleChoice[0].question_id}opt${i}_${choiceData['id']}`
                                    dynamicData[`${optVal}`]= MultipleChoice[0][`opt_${i}`];
                                }
                            }       
                            await this.translatorService.DynamicEngJsonData('Quizzes','0',dynamicData,'Edit','Quizzes',recordDetails['quiz_id']);
                        }
                        break;
                    case 'MultipleResponse':
                        if (MultipleResponse.length > 0) {
                            let dynamicData = Object.create(null);
                            let multipleResponseData = await this.quizMultipleResponseQuestionService.save({question_id: saveData['id'], ...MultipleResponse[0]});
                            for (let i = 1; i <= 6; i++) {
                                if(multipleResponseData[`choice_${i}`]){
                                    let optVal = `multiplechoice_option_${recordDetails['id']}_choice${i}_${multipleResponseData['id']}`
                                    dynamicData[`${optVal}`]= multipleResponseData[`choice_${i}`];
                                }
                                if(multipleResponseData[`choice_${i}`]){
                                    let optVal = `multipleresponse_option_${recordDetails['id']}_choice${i}_${multipleResponseData['id']}`
                                    dynamicData[`${optVal}`]= multipleResponseData[`choice_${i}`];
                                }
                            }
                            await this.translatorService.DynamicEngJsonData('Quizzes','0',dynamicData,'Add','Quizzes',postData?.quiz_id);
                        }
                        break;
                    case 'MatchingDropDown':
                        if (MatchingDropDown.length > 0) {
                            let dynamicData = Object.create(null);
                            for (var i = 0; i < MatchingDropDown.length; i++) {
                                let questionId = await this.quizMatchingDropDownQuestionService.save({question_id: saveData['id'], ...MatchingDropDown[i]});
                                let optVal = `matchingdropdown_option_${recordDetails['id']}_${questionId['id']}`
                                dynamicData[`${optVal}`]= MatchingDropDown[i]['drop_options'];
                            }
                            await this.translatorService.DynamicEngJsonData('Quizzes','0',dynamicData,'Add','Quizzes',recordDetails.quiz_id);
                        }
                        break;
                    case 'Hotspot':
                        if (file && Object.keys(file).length > 0 && Hotspot.length > 0) {
                            for(let fileData of Object.keys(file)){
                                let key: string = file[fileData].fieldname;
                                file[fileData].originalname = this.commonFileService.formatFileName(file[fileData].originalname);
                                file[fileData].fieldname = `quiz/${postData?.quiz_id.toString()}/${saveData['id'].toString()}/${key}_${this.commonService.generateMD5(saveData['id'].toString())}.${file[fileData].originalname.split('.')[file[fileData].originalname.split('.').length - 1]}`;
                                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file[fileData].path),  filename: file[fileData].fieldname}));
                                Hotspot[0][key] = file[fileData].fieldname;
                            }
                            await this.quizHotspotQuestionService.save({question_id: saveData['id'], ...Hotspot[0]});
                        }
                        break;
                    case 'FillInTheBlanks':
                        if (FillInTheBlanks.length > 0) {
                            let dynamicData = Object.create(null);
                            for (var i = 0; i < FillInTheBlanks.length; i++) {
                                let questionId = await this.quizFillUpQuestionService.save({question_id: saveData['id'], ...FillInTheBlanks[i]});
                                dynamicData[`fillup_option_${recordDetails['id']}_${questionId['id']}`]= FillInTheBlanks[i]['blank_options'];
                            }
                            await this.translatorService.DynamicEngJsonData('Quizzes','0',dynamicData,'Add','Quizzes',recordDetails.quiz_id);
                        }
                        break;
                    case 'MatchingDragDrop':
                        if (MatchingDragDrop.length > 0) {
                            let dynamicData = Object.create(null);
                            for (var i = 0; i < MatchingDragDrop.length; i++) {
                                let questionId = await this.quizMatchingDragDropQuestionService.save({question_id: saveData['id'], ...MatchingDragDrop[i]});
                                dynamicData[`dragdrop_question_${recordDetails['id']}_${questionId['id']}`]= MatchingDragDrop[i]['question'];
                                dynamicData[`dragdrop_answer_${recordDetails['id']}_${questionId['id']}`]= MatchingDragDrop[i]['answer'][i];
                            }
                            await this.translatorService.DynamicEngJsonData('Quizzes','0',dynamicData,'Add','Quizzes',postData?.quiz_id);
                        }
                        break;
                    case 'MultipleQuestion':
                        if (MultipleQuestion.length > 0) {
                            let dynamicData = Object.create(null);
                            for (var i = 0; i < MultipleQuestion.length; i++) {
                                let questionId = await this.quizMultipleQuestionService.save({question_id: saveData['id'], ...MultipleQuestion[i]});
                                let optVal = `multiple_question_${recordDetails['id']}_${questionId['id']}`
                                dynamicData[`${optVal}`]= MultipleQuestion[i]['question'];
                            }
                            await this.translatorService.DynamicEngJsonData('Quizzes','0',dynamicData,'Add','Quizzes',recordDetails.quiz_id);
                        }
                        break;
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
            });
        } catch (error) {
            if (file && Object.keys(file).length > 0) {
                for(let fileData of Object.keys(file)){
                    await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);
                }
            }
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
    @UseInterceptors(
        AnyFilesInterceptor( {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.QUIZ_ICON_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: imgFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateQuizDetailsInput, @UploadedFiles() file: Record<string, any>) {
        try {
            if (!postData?.id && !postData?.quiz_id) {
                if (file && Object.keys(file).length > 0) {
                    for(let fileData of Object.keys(file)){
                        await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);
                    }
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.quizDetailsService.findOne({ id: postData?.id,quiz_id: postData?.quiz_id });
            if (!recordDetails) {
                if (file && Object.keys(file).length > 0) {
                    for(let fileData of Object.keys(file)){
                        await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);
                    }
                }
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            const checkQuiz = await this.quizQuizzesService.findOne({ id: postData?.quiz_id });
            if (checkQuiz?.is_default == 1) {
                if (file && Object.keys(file).length > 0) {
                    for (let fileData of Object.keys(file)) {
                        await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);
                    }
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            let TrueFalse = postData?.TrueFalse ? JSON.parse(postData?.TrueFalse) : [];
            let MultipleChoice = postData?.MultipleChoice ? JSON.parse(postData?.MultipleChoice) : [];
            let MultipleResponse = postData?.MultipleResponse ? JSON.parse(postData?.MultipleResponse) : [];
            let MatchingDropDown = postData?.MatchingDropDown ? JSON.parse(postData?.MatchingDropDown) : [];
            let Hotspot = postData?.Hotspot ? JSON.parse(postData?.Hotspot) : [];
            let FillInTheBlanks = postData?.FillInTheBlanks ? JSON.parse(postData?.FillInTheBlanks) : [];
            let MatchingDragDrop = postData?.MatchingDragDrop ? JSON.parse(postData?.MatchingDragDrop) : [];
            let MultipleQuestion = postData?.MultipleQuestion ? JSON.parse(postData?.MultipleQuestion) : [];
            if (postData?.status == undefined && [TrueFalse,MultipleChoice,MultipleResponse,MatchingDropDown,Hotspot,FillInTheBlanks,MatchingDragDrop,MultipleQuestion].every(arr => arr.length === 0)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            delete postData?.TrueFalse;
            delete postData?.MultipleChoice;
            delete postData?.MultipleResponse;
            delete postData?.MatchingDropDown;
            delete postData?.Hotspot;
            delete postData?.FillInTheBlanks;
            delete postData?.MatchingDragDrop;
            delete postData?.MultipleQuestion;
            await this.quizDetailsService.update({ id: postData?.id,quiz_id: postData?.quiz_id },{...postData});
            let dynamicData = Object.create(null);
            if(postData?.quiz_question){
                let quizQuestion = `question_name_${postData?.id}`
                dynamicData[`${quizQuestion}`]= postData?.quiz_question;
            }
            if(postData?.answer_desc){
                let answerDesc = `question_answer_${postData?.id}`
                dynamicData[`${answerDesc}`]= postData?.answer_desc;
            }
            await this.translatorService.DynamicEngJsonData('Quizzes','0',dynamicData,'Edit','Quizzes',postData?.quiz_id);
            if (recordDetails && recordDetails['id'] && (TrueFalse || MultipleChoice || MultipleResponse || MatchingDropDown || MatchingDragDrop || MultipleQuestion || Hotspot || FillInTheBlanks)) {
                let dynamicData = Object.create(null);
                switch (recordDetails['quiz_type']) {
                    case 'TrueFalse':
                        if (TrueFalse.length > 0) {
                            let trueFalseData = await this.quizTrueFalseQuestionsService.findOne({question_id: recordDetails['id']});
                            await this.quizTrueFalseQuestionsService.update({question_id: recordDetails['id']}, {...TrueFalse[0]});
                            await this.activityLogService.create(trueFalseData, TrueFalse, tableConstant.QUIZ.TBL_QZ_TF_QUESTIONS, req.tokenUser?.id);
                        }
                        break;
                    case 'MultipleChoice':
                        if (MultipleChoice.length > 0) {
                            let multipleChoiceQuestionData = await this.quizMultipleChoiceQuestionService.findOne({question_id: recordDetails['id']});
                            let multipleChoiceData = {};
                            for (let i = 1; i <= 6; i++) {
                                multipleChoiceData[`opt_${i}`] = MultipleChoice[0][`opt_${i}`] ? MultipleChoice[0][`opt_${i}`] : '';
                                if(multipleChoiceData[`opt_${i}`]){
                                    let optVal = `multiplechoice_option_${recordDetails['id']}_opt${i}_${multipleChoiceQuestionData?.id}`
                                    dynamicData[`${optVal}`]= multipleChoiceData[`opt_${i}`];
                                }
                            }
                            await this.quizMultipleChoiceQuestionService.update({question_id: recordDetails['id']}, {...MultipleChoice[0], ...multipleChoiceData});
                            await this.activityLogService.create(multipleChoiceQuestionData, MultipleChoice, tableConstant.QUIZ.TBL_QZ_MULTIPLE_CHOICE_QUESTIONS, req.tokenUser?.id);
                            await this.translatorService.DynamicEngJsonData('Quizzes','0',dynamicData,'Add','Quizzes',postData?.quiz_id);
                        }
                        break;
                    case 'MultipleResponse':
                        if (MultipleResponse.length > 0) {
                            let multipleResponseQuestionData = await this.quizMultipleResponseQuestionService.findOne({question_id: recordDetails['id']});
                            let multipleResponseData = {};
                            for (let i = 1; i <= 6; i++) {
                                multipleResponseData[`choice_${i}`] = MultipleResponse[0][`choice_${i}`] ? MultipleResponse[0][`choice_${i}`] : '';
                                if(multipleResponseData[`choice_${i}`]){
                                    let optVal = `multiplechoice_option_${recordDetails['id']}_choice${i}_${multipleResponseQuestionData?.id}`
                                    dynamicData[`${optVal}`]= multipleResponseData[`choice_${i}`];
                                }
                                if(multipleResponseData[`choice_${i}`]){
                                    let optVal = `multipleresponse_option_${recordDetails['id']}_choice${i}_${multipleResponseQuestionData?.id}`
                                    dynamicData[`${optVal}`]= multipleResponseData[`choice_${i}`];
                                }
                            }
                            await this.quizMultipleResponseQuestionService.update({question_id: recordDetails['id']}, {...MultipleResponse[0], ...multipleResponseData});
                            await this.activityLogService.create(multipleResponseQuestionData, MultipleResponse, tableConstant.QUIZ.TBL_QZ_MULTIPLE_RESPONSE_QUESTIONS, req.tokenUser?.id);
                            await this.translatorService.DynamicEngJsonData('Quizzes','0',dynamicData,'Add','Quizzes',postData?.quiz_id);
                        }
                        break;
                    case 'MatchingDropDown':
                        if (MatchingDropDown.length > 0) {
                            let dropDownQuestionData = await this.quizMatchingDropDownQuestionService.listRecord( {question_id: recordDetails['id'],status : Not('2')});
                            let dropDownArray = dropDownQuestionData.map(entity => entity.id);
                            for (var i = 0; i < MatchingDropDown.length; i++) {
                                let questionId = '';
                                if (MatchingDropDown[i]['id']) {
                                    dropDownArray = dropDownArray.filter(item => item !== Number(MatchingDropDown[i]['id']));
                                    await this.quizMatchingDropDownQuestionService.update({question_id: recordDetails['id'], id: MatchingDropDown[i]['id']}, {...MatchingDropDown[i]});
                                    questionId = MatchingDropDown[i]['id'];
                                } else {
                                    let saveData = await this.quizMatchingDropDownQuestionService.save( {...MatchingDropDown[i], ...{question_id: recordDetails['id']}});
                                    questionId = saveData['id'];
                                }
                                let optVal = `matchingdropdown_option_${recordDetails['id']}_${questionId}`
                                dynamicData[`${optVal}`]= MatchingDropDown[i]['drop_options'];
                            }
                            await this.quizMatchingDropDownQuestionService.update({question_id: recordDetails['id'], id: In(dropDownArray)}, {status: '2'});
                            await this.activityLogService.create(dropDownQuestionData, MatchingDropDown, tableConstant.QUIZ.TBL_QZ_MATCHING_DROPDOWN_QUESTIONS, req.tokenUser?.id);
                            await this.translatorService.DynamicEngJsonData('Quizzes','0',dynamicData,'Add','Quizzes',postData?.quiz_id);
                        }
                        break;
                    case 'Hotspot':
                        if (Hotspot.length > 0) {
                            let quizHotspotQuestionData = await this.quizHotspotQuestionService.findOne({question_id: recordDetails['id']});
                            if (file && Object.keys(file).length > 0) {
                                for(let fileData of Object.keys(file)){
                                    let key: string = file[fileData].fieldname;
                                    file[fileData].originalname = this.commonFileService.formatFileName(file[fileData].originalname);
                                    file[fileData].fieldname = `quiz/${postData?.quiz_id.toString()}/${recordDetails['id'].toString()}/${key}_${this.commonService.generateMD5(recordDetails['id'].toString())}.${file[fileData].originalname.split('.')[file[fileData].originalname.split('.').length - 1]}`;
                                    await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file[fileData].path),  filename: file[fileData].fieldname}));
                                    Hotspot[0][key] = file[fileData].fieldname;
                                }
                            }
                            await this.quizHotspotQuestionService.update({question_id: recordDetails['id']}, {...Hotspot[0]});
                            await this.activityLogService.create(quizHotspotQuestionData, {...Hotspot,...postData}, tableConstant.QUIZ.TBL_QZ_HOTSPOT_QUESTIONS, req.tokenUser?.id);
                        }
                        break;
                    case 'FillInTheBlanks':
                        if (FillInTheBlanks.length > 0) {
                            let fillInTheBlanksQuestionData = await this.quizFillUpQuestionService.listRecord( {question_id: recordDetails['id'],status : Not('2')});
                            let fillInTheBlanksDataArray = fillInTheBlanksQuestionData.map(entity => entity.id);
                            for (var i = 0; i < FillInTheBlanks.length; i++) {
                                let questionId = '';
                                if (FillInTheBlanks[i]['id']) {
                                    fillInTheBlanksDataArray = fillInTheBlanksDataArray.filter(item => item !== Number(FillInTheBlanks[i]['id']));
                                    await this.quizFillUpQuestionService.update({question_id: recordDetails['id'], id: FillInTheBlanks[i]['id']}, {...FillInTheBlanks[i]});
                                    questionId = FillInTheBlanks[i]['id'];
                                } else {
                                    let saveData = await this.quizFillUpQuestionService.save( {...FillInTheBlanks[i], ...{question_id: recordDetails['id']}});
                                    questionId = saveData['id'];
                                }
                                dynamicData[`fillup_option_${recordDetails['id']}_${questionId}`]= FillInTheBlanks[i]['blank_options'];
                            }
                            await this.quizFillUpQuestionService.update({question_id: recordDetails['id'], id: In(fillInTheBlanksDataArray)}, {status: '2'});
                            await this.activityLogService.create(fillInTheBlanksQuestionData, FillInTheBlanks, tableConstant.QUIZ.TBL_QZ_FILLUP_QUESTIONS, req.tokenUser?.id);
                            await this.translatorService.DynamicEngJsonData('Quizzes','0',dynamicData,'Add','Quizzes',postData?.quiz_id);
                        }
                        break;
                    case 'MatchingDragDrop':
                        if (MatchingDragDrop.length > 0) {
                            let MatchingDragDropQuestionData = await this.quizMatchingDragDropQuestionService.listRecord( {question_id: recordDetails['id'],status : Not('2')});
                            let matchingDragDropDataArray = MatchingDragDropQuestionData.map(entity => entity.id);
                            for (var i = 0; i < MatchingDragDrop.length; i++) {
                                let questionId = '';
                                if (MatchingDragDrop[i]['id']) {
                                    matchingDragDropDataArray = matchingDragDropDataArray.filter(item => item !== Number(MatchingDragDrop[i]['id']));
                                    await this.quizMatchingDragDropQuestionService.update({question_id: recordDetails['id'], id: MatchingDragDrop[i]['id']}, {...MatchingDragDrop[i]});
                                    questionId = MatchingDragDrop[i]['id'];
                                } else {
                                    let saveData = await this.quizMatchingDragDropQuestionService.save( {...MatchingDragDrop[i], ...{question_id: recordDetails['id']}});
                                    questionId = saveData['id'];
                                }
                                dynamicData[`dragdrop_question_${recordDetails['id']}_${questionId}`]= MatchingDragDrop[i]['question'];
                                dynamicData[`dragdrop_answer_${recordDetails['id']}_${questionId}`]= MatchingDragDrop[i]['answer'];
                            }
                            await this.quizMatchingDragDropQuestionService.update({question_id: recordDetails['id'], id: In(matchingDragDropDataArray)}, {status: '2'});
                            await this.activityLogService.create(MatchingDragDropQuestionData, MatchingDragDrop, tableConstant.QUIZ.TBL_QZ_MATCHING_DRAGDROP_QUESTIONS, req.tokenUser?.id);
                            await this.translatorService.DynamicEngJsonData('Quizzes','0',dynamicData,'Add','Quizzes',postData?.quiz_id);
                        }
                        break;
                    case 'MultipleQuestion':
                        if (MultipleQuestion.length > 0) {
                            let multipleQuestionData = await this.quizMultipleQuestionService.listRecord( {question_id: recordDetails['id'],status : Not('2')});
                            let multipleQuestionDataArray = multipleQuestionData.map(entity => entity.id);
                            for (var i = 0; i < MultipleQuestion.length; i++) {
                                let questionId = '';
                                if (MultipleQuestion[i]['id']) {
                                    multipleQuestionDataArray = multipleQuestionDataArray.filter(item => item !== Number(MultipleQuestion[i]['id']));
                                    await this.quizMultipleQuestionService.update({question_id: recordDetails['id'], id: MultipleQuestion[i]['id']}, {...MultipleQuestion[i]});
                                    questionId = MultipleQuestion[i]['id'];
                                } else {
                                    let saveData = await this.quizMultipleQuestionService.save( {...MultipleQuestion[i], ...{question_id: recordDetails['id']}});
                                    questionId = saveData['id'];
                                }
                                let optVal = `multiple_question_${recordDetails['id']}_${questionId}`
                                dynamicData[`${optVal}`]= MultipleQuestion[i]['question'];
                            }
                            await this.quizMultipleQuestionService.update({question_id: recordDetails['id'], id: In(multipleQuestionDataArray)}, {status: '2'});
                            await this.activityLogService.create(multipleQuestionData, MultipleQuestion, tableConstant.QUIZ.TBL_QZ_MULTIPLE_QUESTIONS, req.tokenUser?.id);
                            await this.translatorService.DynamicEngJsonData('Quizzes','0',dynamicData,'Add','Quizzes',postData?.quiz_id);
                        }
                        break;
                }
            }
            await this.activityLogService.create(recordDetails, postData, tableConstant.QUIZ.TBL_QZ_QUIZ_DETAILS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
            });
        } catch (error) {
            if (file && Object.keys(file).length > 0) {
                for(let fileData of Object.keys(file)){
                    await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);
                }
            }
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @UseGuards(AccessGuard)
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteQuizDetailsInput) {
        try {
            if (!postData?.id || !postData?.quiz_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const checkQuiz = await this.quizQuizzesService.findOne({ id: postData?.quiz_id });
            if (checkQuiz?.is_default == 1) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            const recordDetails = await this.quizDetailsService.findOne({
                id: postData?.id,
                quiz_id: postData?.quiz_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            let updatedResult;
            switch (recordDetails['quiz_type']) {
                case 'TrueFalse':
                    updatedResult = await this.quizTrueFalseQuestionsService.update({question_id: postData?.id}, {status:'2'});
                    break;
                case 'MultipleChoice':
                    updatedResult = await this.quizMultipleChoiceQuestionService.update({question_id: postData?.id}, {status:'2'});
                    break;
                case 'MultipleResponse':
                    updatedResult = await this.quizMultipleResponseQuestionService.update({question_id: postData?.id}, {status:'2'});
                    break;
                case 'MatchingDropDown':
                    updatedResult = await this.quizMatchingDropDownQuestionService.update({question_id: postData?.id}, {status:'2'});
                    break;
                case 'Hotspot':
                    updatedResult = await this.quizHotspotQuestionService.update({question_id: postData?.id}, {status:'2'});
                    break;
                case 'FillInTheBlanks':
                    updatedResult = await this.quizFillUpQuestionService.update({question_id: postData?.id}, {status:'2'});
                    break;
                case 'MatchingDragDrop':
                    updatedResult = await this.quizMatchingDragDropQuestionService.update({question_id: postData?.id}, {status:'2'});
                    break;
                case 'MultipleQuestion':
                    updatedResult = await this.quizMultipleQuestionService.update({question_id: postData?.id}, {status:'2'});
                    break;
            }
            await this.quizDetailsService.update({id: postData?.id, quiz_id: postData?.quiz_id},{status:2});
            let titleKey = `question_name_${postData['id']}`
            let descriptionKey = `question_answer_${postData['id']}`

            const dynamicData = {
                [titleKey]: titleKey,
                [descriptionKey]: descriptionKey
            };
            await this.translatorService.DynamicEngJsonData(
                'Quizzes',
                '0',
                dynamicData,
                'Delete',
                'Quizzes',
                postData?.quiz_id
            );
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.QUIZ.TBL_QZ_QUIZ_DETAILS, req.tokenUser?.id, 'delete');
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
    @UseGuards(AccessGuard)
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneQuizDetailsInput) {
        try {
            if (!postData?.id && !postData?.quiz_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.quizDetailsService.findOne({id: postData?.id, quiz_id: postData?.quiz_id});
            console.log("resultedData", resultedData);
            if (!resultedData) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            if (resultedData['ques_section']) {
                let quizSectionData = await this.quizSectionService.findOne({ id: resultedData['ques_section'],quiz_id: postData?.quiz_id,status: Not(Enum.Two) },{id: 'ASC'});
                if (quizSectionData) {
                    resultedData['section'] = {id: quizSectionData.id, name: quizSectionData.name};
                }
            }
            switch (resultedData.quiz_type) {
                case 'TrueFalse':
                    let trueFalseData = await this.quizTrueFalseQuestionsService.findOne({question_id: postData?.id, status : Not('2')},{ id: 'ASC' });
                    resultedData['tf'] = trueFalseData;
                    break;
                case 'MultipleChoice':
                    let multipleChoiceData = await this.quizMultipleChoiceQuestionService.findOne({question_id: postData?.id, status : Not('2')},{ id: 'ASC' });
                    for (let i = 1; i <= 6; i++) {
                        if(multipleChoiceData?.[`opt_${i}`]){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`multiplechoice_option_${multipleChoiceData.question_id}_opt${i}_${multipleChoiceData['id']}`, `/LC_MESSAGES/Quizzes/Quizzes/0/${multipleChoiceData['question_id']}`,`dynamic`);
                            multipleChoiceData[`opt_${i}`] = (customName == '' || customName == `multiplechoice_option_${multipleChoiceData.question_id}_opt${i}_${multipleChoiceData['id']}`) ? multipleChoiceData[`opt_${i}`] : customName;  
                        }
                    }
                    resultedData['mc'] = multipleChoiceData;
                    break;
                case 'MultipleResponse':
                    let multipleResponseData = await this.quizMultipleResponseQuestionService.findOne({question_id: postData?.id, status : Not('2')},{ id: 'ASC' });
                    for (let i = 1; i <= 6; i++) {
                        if(multipleResponseData?.[`choice_${i}`] ){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`multipleresponse_option_${resultedData['id']}_choice${i}_${multipleResponseData?.id}`, `/LC_MESSAGES/Quizzes/Quizzes/0/${multipleResponseData['question_id']}`,`dynamic`);
                            multipleResponseData[`choice_${i}`] = (customName == '' || customName == `multipleresponse_option_${resultedData['id']}_choice${i}_${multipleResponseData?.id}`) ? multipleResponseData[`choice_${i}`] : customName;
                        }
                    }
                    resultedData['mr'] = multipleResponseData;
                    break;
                case 'MatchingDropDown':
                    let matchingDropDownData = await this.quizMatchingDropDownQuestionService.listRecord({question_id: postData?.id, status : Not('2')},{ id: 'ASC' });
                    resultedData['mdd'] = matchingDropDownData;
                    break;
                case 'Hotspot':
                    let HotspotData = await this.quizHotspotQuestionService.findOne({question_id: postData?.id, status : Not('2')},{ id: 'ASC' });
                    resultedData['hp'] = HotspotData;
                    break;
                case 'FillInTheBlanks':
                    let fillInTheBlanksData = await this.quizFillUpQuestionService.listRecord({question_id: postData?.id, status : Not('2')},{ id: 'ASC' });
                    resultedData['fib'] = fillInTheBlanksData;
                    break;
                case 'MatchingDragDrop':
                   let matchingDragDropData = await this.quizMatchingDragDropQuestionService.listRecord({question_id: postData?.id, status : Not('2')},{ id: 'ASC' });
                    resultedData['qdd'] = matchingDragDropData;
                    break;
                case 'MultipleQuestion':
                    let multipleQuestionData = await this.quizMultipleQuestionService.listRecord({question_id: postData?.id, status : Not('2')},{ id: 'ASC' });
                    resultedData['mq'] = multipleQuestionData;
                    break;
            }
            resultedData = <any>(
                await this.commonArrayService.formatToDto(QuizDetailsDto, resultedData, req.lang)
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
    @UseGuards(AccessGuard)
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.quiz_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where: any = { quiz_id: postData?.quiz_id };
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let result = await this.quizDetailsService.listRecord(['qd.id AS id','qd.quiz_question AS quiz_question','qd.status AS status'],where, { [orderBy]: order });
            result = <any>(
                await this.commonArrayService.formatToDto(QuizDetailsDto, result, req.lang)
            );
            if(result && result.length){
                await Promise.all(result.map(async (ele)=>{
                    if(ele.quiz_question){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`question_name_${ele['id']}`, `/LC_MESSAGES/Quizzes/Quizzes/0/${ele['id']}`,`dynamic`);
                        ele.quiz_question = (customName == '' || customName == `question_name_${ele['id']}`) ? ele['quiz_question'] : customName;
                    }
                    if(ele.answer_desc){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`question_answer_${ele['id']}`, `/LC_MESSAGES/Quizzes/Quizzes/0/${ele['id']}`,`dynamic`);
                        ele.answer_desc = (customName == '' || customName == `question_answer_${ele['id']}`) ? ele['answer_desc'] : customName;
                    }
                }));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
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
}