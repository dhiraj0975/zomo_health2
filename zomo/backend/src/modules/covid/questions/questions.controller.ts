import { appConstant, CommonArrayService, CommonService, CovidQuestionsDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post, Put,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { In, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateCovidQuestionInput, PaginateCovidInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { AnswersService } from "../answers/answers.service";
import { QuestionsService } from "./questions.service";
@Controller('covid/questions')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class QuestionsController {
    constructor(
        private readonly questionsService: QuestionsService,
        private readonly answersService: AnswersService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateCovidInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id.toString();
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) {
                let where = `status !=2`;
                if (postData?.q_id) {
                    where += ` AND questions.q_id = '${postData?.q_id}`;
                }
                if (postData?.search_str) {
                    where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'questions.title');
                }
                if (postData?.org_id) {
                    where += ` AND questions.org_id = '${postData?.org_id}'`;
                }
                const resultedData = await this.questionsService.paginateList(
                    where,
                    postData,
                );
                resultedData['list'] = <any>(
                    await this.commonArrayService.formatToDto(CovidQuestionsDto, resultedData['list'], req.lang)
                );
                if(resultedData['list'] && resultedData['list'].length){
                    await Promise.all(resultedData['list'].map(async (ele)=>{
                        if(ele.title){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `covidquestion_title_${ele['id']}`, `/LC_MESSAGES/Common/CovidPopup/${req.tokenUser?.org_id}`,`dynamic`);
                            if (customName != `covidquestion_title_${ele['id']}`) {
                                ele.title = customName;
                            }
                        }
                    }));
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success',
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) {
                const where = { id: postData?.id };
                if(postData?.org_id){
                    where['org_id'] = postData?.org_id;
                }
                let questionDetails = await this.questionsService.findOne(where);
                if (!questionDetails) {
                    let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
                }
                questionDetails = <any>(
                    await this.commonArrayService.formatToDto(CovidQuestionsDto, questionDetails, req.lang)
                );
                if(questionDetails.title){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `covidquestion_title_${questionDetails['id']}`, `/LC_MESSAGES/Common/CovidPopup/${req.tokenUser?.org_id}`,`dynamic`);
                    if (customName != `covidquestion_title_${questionDetails['id']}`) {
                        questionDetails.title = customName;
                    }
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: questionDetails,
                    message: 'success',
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCovidQuestionInput) {
        try {
            if (!postData?.org_id || !postData?.title || (postData?.status == undefined || postData?.status == null)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) {
                let questionSaveData = await this.questionsService.save(postData);
                let answerSaveData = await this.answersService.save({ q_id: questionSaveData['id'], title: 'Yes', status: 1 });
                if(answerSaveData){
                    let title = `covidanswer_${questionSaveData['id']}_${answerSaveData['id']}`;
                    let dynamicData= { [`${title}`]: 'Yes'};
                    await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicData,'Edit','CovidPopup') 
                }
                answerSaveData = await this.answersService.save({ q_id: questionSaveData['id'], title: 'No', status: 1 });
                if(answerSaveData){
                    let title = `covidanswer_${questionSaveData['id']}_${answerSaveData['id']}`;
                    let dynamicData= { [`${title}`]: 'No'};
                    await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicData,'Edit','CovidPopup') 
                }
                if(postData?.title){
                    let title = `covidquestion_title_${questionSaveData['id']}`
                    let dynamicData= { [`${title}`]: postData?.title};
                    await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicData,'Edit','CovidPopup') 
                }
                return res.status(HttpStatus.CREATED).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, 'Question added successfully')
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) {
                const where = { id: postData?.id };
                const recordDetails = await this.questionsService.findOne(where);
                if (!recordDetails) {
                    let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
                }
                await this.questionsService.update(where, { status: 2 });
                this.activityLogService.create(recordDetails, { status: 2 }, tableConstant.COVID.COVID_QUESTIONS, req.tokenUser?.id, 'delete');
                await this.answersService.update({ q_id: postData?.id }, { status: 2 });
                let answersRecords = await this.answersService.listRecord({ q_id: postData?.id });
                answersRecords?.map(ele => this.activityLogService.create({ id: ele.id, status: 1 }, { status: 2 }, tableConstant.COVID.COVID_ANSWERS, req.tokenUser?.id, 'delete'));

                const { id, org_id } = recordDetails || {};

                if (id && org_id) {
                    const titleKey = `covidquestion_title_${id}`;
                    const answerKey = `covidanswer_${id}_`;

                    const dynamicData = {
                        [titleKey]: titleKey,
                        [answerKey]: answerKey
                    };

                    await this.translatorService.DynamicEngJsonData(
                        'Common',
                        org_id,
                        dynamicData,
                        'Delete',
                        'CovidPopup'
                    );
                }

                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, 'Question deleted successfully'),
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCovidQuestionInput) {
        try {
            if (!postData?.id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) {
                const where = { id: postData?.id, status: Not(2) };
                const recordDetails = await this.questionsService.findOne(where);
                if (!recordDetails) {
                    await this.questionsService.save({
                        ...postData,
                    });
                }
                await this.questionsService.update(where, postData);
                this.activityLogService.create(recordDetails, postData, tableConstant.COVID.COVID_QUESTIONS, req.tokenUser?.id);
                if ((postData?.status != undefined && postData?.status != null)) {
                    await this.answersService.update({ q_id: recordDetails.id, status: Not(2) }, { status: postData?.status });
                    let answersRecords = await this.answersService.listRecord({ q_id: recordDetails.id });
                    answersRecords?.map(ele => this.activityLogService.create({ id: ele.id, status: ele.status }, { status: postData?.status }, tableConstant.COVID.COVID_ANSWERS, req.tokenUser?.id));
                }
                if(postData?.title){
                    let title = `covidquestion_title_${recordDetails['id']}`
                    let dynamicData= { [`${title}`]: postData?.title};
                    await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicData,'Edit','CovidPopup') 
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, ((postData?.status != undefined || postData?.status != null) && postData?.status != recordDetails.status) ? 'Question status updated successfully' : 'Question updated successfully')
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) {
                const where = {
                    status: In([0, 1]),
                    org_id: postData?.org_id,
                };
                let resultedData:any  = await this.questionsService.listRecord(where);
                resultedData = <any>(
                    await this.commonArrayService.formatToDto(CovidQuestionsDto, resultedData, req.lang)
                );
                if(resultedData && resultedData.length){
                    await Promise.all(resultedData.map(async (ele)=>{
                        if(ele.title){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `covidquestion_title_${ele['id']}`, `/LC_MESSAGES/Common/CovidPopup/${req.tokenUser?.org_id}`,`dynamic`);
                            if (customName != `covidquestion_title_${ele['id']}`) {
                                ele.title = customName;
                            }
                        }
                    }));
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success',
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
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