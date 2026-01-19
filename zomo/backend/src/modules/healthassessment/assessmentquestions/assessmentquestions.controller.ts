import {
    AssessmentHaOptionsEntity, AssessmentOptionsEntity,
    AssessmentQuestionsDetailsDto,
    AssessmentQuestionsDto,
    CommonArrayService,
    CommonFileService,
    CommonService,
    tableConstant
} from '@common-constants';
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
import {
    CreateAssessmentQuestionsInput,
    PaginateWithHealthAssessmentInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { AssessmentOptionsService } from "../assessmentoptions/assessmentoptions.service";
import { AssessmentOptionsDetailsService } from "../assessmentoptionsdetails/assessmentoptionsdetails.service";
import { AssessmentQuestionsDetailsService } from "../assessmentquestionsdetails/assessmentquestionsdetails.service";
import { AssessmentQuestionsService } from "./assessmentquestions.service";
@Controller('health-assessment/assessment-questions')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class AssessmentQuestionsController {
    constructor(
        private readonly assessmentQuestionsService: AssessmentQuestionsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly assessmentQuestionsDetailsService: AssessmentQuestionsDetailsService,
        private readonly assessmentOptionsService: AssessmentOptionsService,
        private readonly assessmentOptionsDetailsService: AssessmentOptionsDetailsService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithHealthAssessmentInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `aq.status != '2'`;
            if(postData?.tab_id){
                where +=` AND aq.tab_id = '${postData?.tab_id}'`;
            }
            if (postData?.search_str) {
                where += ` AND(aqd.question_title LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR aq.sort_order LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%')`;
            }
            const resultedData = await this.assessmentQuestionsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(AssessmentQuestionsDto, resultedData['list'], req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            let biometricDetails = await this.assessmentQuestionsService.findOne(where,{id: "DESC"},["aq.id","aq.tab_id","aq.type","aq.question_type","aq.show_gender","aq.parent_id","aq.parent_option_id","aq.sort_order","aq.required","aq.not_applicable","aq.general_info","aq.m_section_weight","aq.f_section_weight","aq.age_considered","aq.age_limit","aq.age_condition","aq.result_type","aq.status","at.id","at.title","aqd.id","aqd.question_id","aqd.question_title","aod.id","aod.option_id","aod.option_title","ar.id","ar.title","ar.type"],[tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_TABS,tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS_DETAILS,tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS,tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS]);
            if (!biometricDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            biometricDetails = {
                ...biometricDetails,
                question_detail: biometricDetails.aqd.find(item => item.question_id === biometricDetails.id),
                aqd: biometricDetails.aqd.find(item => item.question_id === biometricDetails.parent_id) || null,
            };
            biometricDetails = <any>(
                await this.commonArrayService.formatToDto(AssessmentQuestionsDto, biometricDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: biometricDetails,
                message: 'success',
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssessmentQuestionsInput) {
        try {
            if (!postData?.tab_id || !postData?.type || !this.commonService.isValidNumber(postData?.question_type)  || !this.commonService.isValidNumber(postData?.show_gender) || !postData?.question_title) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let questionTitle = postData?.question_title;
            delete postData?.question_title;
            let mainQuestionId = postData?.main_question_id || 0;
            delete postData?.main_question_id;
            let languageId = postData?.language_id || 1;
            delete postData?.language_id;
            let resultData = await this.assessmentQuestionsService.findOne({tab_id: postData?.tab_id, status: Not('2')},{sort_order:"DESC"},["aq.id","aq.sort_order"]);
            postData['sort_order'] = resultData && resultData['sort_order'] ? resultData['sort_order'] + 1 : 1;
            let lastId = await this.assessmentQuestionsService.save({...postData, created_by: req.tokenUser?.id, updated_by: req.tokenUser?.id});
            if (!lastId) {
                return true;
            }
            if (questionTitle) {
                let dynamicDatas = Object.create(null);
                let title = `assessment_question_title_${postData?.tab_id}_${lastId['id']}`
                dynamicDatas[`${title}`] = postData?.question_title;
                await this.translatorService.DynamicEngJsonData('MyHealth','eha',dynamicDatas,'Edit','Assessment',req.tokenUser?.org_id);
                delete postData?.question_title;
            }
            await this.assessmentQuestionsDetailsService.save({question_id: lastId['id'],question_title: questionTitle, main_question_id: mainQuestionId, language_id: languageId});
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'MSG_QUESTION_ADDED'),
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.assessmentQuestionsService.findOne(where,null,['aq.id','aq.status']);
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
            await this.assessmentQuestionsService.update(where,{status:2});
            let questionDetailData = await this.assessmentQuestionsDetailsService.findOne({question_id: postData?.id});
            await this.assessmentQuestionsDetailsService.update({question_id: postData?.id}, {status:2});
            await this.activityLogService.create(questionDetailData, {status:2}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS_DETAILS, req.tokenUser?.id, 'delete');
            let optionData = await this.assessmentOptionsService.listRecord({question_id: postData?.id});
            await this.assessmentOptionsService.update({question_id: postData?.id},{status:2});
            await this.activityLogService.create(optionData, {status:2}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS, req.tokenUser?.id, 'delete');
            if (optionData) {
                let optionId = optionData.map(obj => obj.id);
                let optionDetailData = await this.assessmentOptionsDetailsService.listRecord({option_id: In(optionId)});
                await this.assessmentOptionsDetailsService.update({option_id: In(optionId)}, {status:2});
                await this.activityLogService.create(optionDetailData, {status:2}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS, req.tokenUser?.id,'delete');
            }
            if (postData?.id) {
                const questionKey: string = `assessment_question_title_${recordDetails.tab_id}_${postData?.id}`;
                const dynamicData: Record<string, string> = {
                    [questionKey]: questionKey,
                };
                for (let i: number = 0; i < optionData.length; i++) {
                    const o:AssessmentOptionsEntity = optionData[i];
                    let optionKey: string = `assessment_option_title_${o.question_id}_${o.id}`;
                    dynamicData[optionKey] = optionKey;
                }
                await this.translatorService.DynamicEngJsonData('MyHealth','hra',dynamicData,'Delete','Assessment',recordDetails.questioncat_id);
            }
            await this.activityLogService.create(recordDetails, {status:2}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'MSG_QUESTION_DELETED'),
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssessmentQuestionsInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let message;
            const where = {id: postData?.id};
            const recordDetails = await this.assessmentQuestionsService.findOne(where,null,['aq.id','aq.tab_id','aq.type','aq.question_type','aq.show_gender','aq.parent_id','aq.parent_option_id','aq.sort_order','aq.required','aq.general_info','aq.not_applicable','aq.m_section_weight','aq.f_section_weight','aq.age_considered','aq.age_limit', 'aq.age_condition','aq.result_type','aq.status','aq.created_by','aq.updated_by']);
            if (!recordDetails) {
                await this.assessmentQuestionsService.save({
                    ...postData,
                    created_by: req.tokenUser?.id,
                    updated_by: req.tokenUser?.id,
                });
            }
            if (postData?.question_title) {
                let questionDetailData = await this.assessmentQuestionsDetailsService.findOne({question_id: postData?.id});
                await this.assessmentQuestionsDetailsService.update({question_id: postData?.id}, {question_title: postData?.question_title});
                await this.activityLogService.create(questionDetailData, postData, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS_DETAILS, req.tokenUser?.id);
                let dynamicDatas = Object.create(null);
                let title = `assessment_question_title_${postData?.tab_id}_${postData?.id}`
                dynamicDatas[`${title}`] = postData?.question_title;
                await this.translatorService.DynamicEngJsonData('MyHealth','eha',dynamicDatas,'Edit','Assessment',req.tokenUser?.org_id);
                delete postData?.question_title;
            }
            await this.assessmentQuestionsService.update(where, {...postData, updated_by : req.tokenUser?.id});
            message = await this.translatorService.frontendReadTranslation(req.lang, 'MSG_QUESTION_UPDATED');
            if ([0, 1].includes(postData?.status)) {
                let statusMessage = {'0': 'MSG_QUESTION_DEACTIVATE','1': 'MSG_QUESTION_ACTIVATE'}
                message = await this.translatorService.frontendReadTranslation(req.lang, statusMessage[postData?.status]);
            }
            if ([0,1].includes(postData?.status)) {
                let questionDetailData = await this.assessmentQuestionsDetailsService.findOne({question_id: postData?.id});
                await this.assessmentQuestionsDetailsService.update({question_id: postData?.id}, {status: postData?.status});
                await this.activityLogService.create(questionDetailData, postData, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS_DETAILS, req.tokenUser?.id);
                let optionData = await this.assessmentOptionsService.listRecord({question_id: postData?.id});
                await this.assessmentOptionsService.update({question_id: postData?.id},{status: postData?.status});
                await this.activityLogService.create(optionData, postData, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS, req.tokenUser?.id);
                if (optionData) {
                    let optionId = optionData.map(obj => obj.id);
                    let optionDetailData = await this.assessmentOptionsDetailsService.listRecord({option_id: In(optionId)});
                    await this.assessmentOptionsDetailsService.update({option_id: In(optionId)}, {status: postData?.status});
                    await this.activityLogService.create(optionDetailData, postData, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS, req.tokenUser?.id);
                }
            }
            await this.activityLogService.create(recordDetails, postData, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: message,
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let where = `aqd.status != '2' AND  aqd.main_question_id = '0'`;
            if (postData?.tab_id) {
                where +=` AND aq.tab_id = '${postData?.tab_id}' AND aq.type = '1' AND aq.status != '2' AND aq.question_type != '4' AND (aq.parent_id IS NULL OR aq.parent_id = '0')`;
            }
            if (postData?.id) {
                where +=` AND aq.id != '${postData?.id}'`;
            }
            let orderBy = postData?.order_by || 'id';
            let order = postData?.order || 'DESC';
            let resultedData = await this.assessmentQuestionsService.listRecord(where,{ [orderBy]: order },["aqd.id AS id","aqd.question_id AS question_id","aqd.question_title AS question_title"],[tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS_DETAILS]);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(AssessmentQuestionsDetailsDto, resultedData, req.lang)
            );
           return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
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
    @Post('change-order')
    async changeOrder(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            /* TODO sort_order to order_id key change in db when db structure change */
            if (postData?.order.length == 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.assessmentQuestionsService.listRecord({ id: In(postData?.order)}, { sort_order: 'ASC' },["id","sort_order"]);
            const orderArray = postData?.order;
            let answers = resultedData.map(obj => obj.sort_order);
            for (let i = 0; i < orderArray.length; i++) {
                await this.assessmentQuestionsService.update({id: orderArray[i]},{sort_order:answers[i]});
            }
            this.activityLogService.create(resultedData, postData, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_ORDER_CHANGE"),
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