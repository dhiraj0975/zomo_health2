import { AssessmentEmotionalAssessmentService } from "@/modules/healthassessment/assessmentemotionalassessment/assessmentemotionalassessment.service";
import {
    AssessmentTabsDto,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonService,
    Gender,
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
    CreateAssessmentTabsInput,
    PaginateWithHealthAssessmentInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { FrontService } from "../front/front.service";
import { AssessmentTabsService } from "./assessmenttabs.service";
@Controller('health-assessment/tabs')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class AssessmentTabsController {
    constructor(
        private readonly assessmentTabsService: AssessmentTabsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly assessmentEmotionalAssessmentService: AssessmentEmotionalAssessmentService,
        private readonly frontService: FrontService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithHealthAssessmentInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            postData.organization_id = postData?.organization_id ?? req.tokenUser?.org_id;
            let where = ``;
            if(postData?.organization_id){
                where +=`healthassessment.organization_id = '${postData?.organization_id}' AND healthassessment.status IN('0','1')`;
            }
            if (postData?.search_str) {
                where += ` AND (healthassessment.title LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%')`;
            }
            const resultedData = await this.assessmentTabsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(AssessmentTabsDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_tabs_title_${ele['organization_id']}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${ele['organization_id']}`,`dynamic`);
                        ele.title = (customName == '' || customName == `assessment_tabs_title_${ele['organization_id']}_${ele['id']}`) ? ele['title'] : customName;
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
            if(postData?.organization_id){
                where['organization_id'] = postData?.organization_id;
            }
            let assessmenttabs = await this.assessmentTabsService.findOne(where);
            if (!assessmenttabs) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            assessmenttabs = <any>(
                await this.commonArrayService.formatToDto(AssessmentTabsDto, assessmenttabs, req.lang)
            );
            if(assessmenttabs.title){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_tabs_title_${assessmenttabs['organization_id']}_${assessmenttabs['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${assessmenttabs['organization_id']}`,`dynamic`);
                assessmenttabs.title = (customName == '' || customName == `assessment_tabs_title_${assessmenttabs['organization_id']}_${assessmenttabs['id']}`) ? assessmenttabs['title'] : customName;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: assessmenttabs,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssessmentTabsInput) {
        try {
            if (!postData?.organization_id || !postData?.title) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let resultData = await this.assessmentTabsService.findOne({organization_id: postData?.organization_id, status: Not('2')},{sort_order:"DESC"},["id","sort_order"]);
            postData['sort_order'] = resultData && resultData['sort_order'] ? resultData['sort_order'] + 1 : 1;
            let recordDetails = await this.assessmentTabsService.save({...postData, created_by: req.tokenUser?.id, updated_by: req.tokenUser?.id});
            let dynamicData = Object.create(null);
            if(postData?.title){
                let title = `assessment_tabs_title_${recordDetails['organization_id']}_${recordDetails['id']}`
                dynamicData[`${title}`]= postData?.title;
            }                        
            await this.translatorService.DynamicEngJsonData('MyHealth','eha',dynamicData,'Edit','Assessment',postData?.organization_id);
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'MSG_TAB_ADDED'),
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
            const recordDetails = await this.assessmentTabsService.findOne(where);
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
            await this.assessmentTabsService.update(where,{status:2});
            await this.activityLogService.create(recordDetails, {status:2}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_TABS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'MSG_TAB_DELETED'),
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssessmentTabsInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let message = 'success';
            const where = {id: postData?.id};
            const recordDetails = await this.assessmentTabsService.findOne(where);
            if (!recordDetails) {
                await this.assessmentTabsService.save({
                    ...postData,
                    created_by: req.tokenUser?.id,
                    updated_by: req.tokenUser?.id,
                });
            }
            await this.assessmentTabsService.update(where, {...postData, updated_by : req.tokenUser?.id});
            message = await this.translatorService.frontendReadTranslation(req.lang, 'MSG_TAB_UPDATED');
            if ([0, 1].includes(postData?.status)) {
                let statusMessage = {'0': 'MSG_TAB_DEACTIVATE','1': 'MSG_TAB_ACTIVATE'}
                message = await this.translatorService.frontendReadTranslation(req.lang, statusMessage[postData?.status]);
            }
            await this.activityLogService.create(recordDetails, {...postData, updated_by : req.tokenUser?.id}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_TABS, req.tokenUser?.id);
            let dynamicData = Object.create(null);
            if(postData?.title){
                let title = `assessment_tabs_title_${recordDetails['organization_id']}_${recordDetails['id']}`
                dynamicData[`${title}`]= postData?.title;
            }                        
            await this.translatorService.DynamicEngJsonData('MyHealth','eha',dynamicData,'Edit','Assessment',postData?.organization_id);
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
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {organization_id:  postData?.org_id, status: '1'};
            let resultedData = await this.frontService.assessmentTabsData(['at.id','at.title'],`at.organization_id = ${postData?.org_id} AND at.status = '1'`, { 'at.sort_order' : 'ASC' }, [{'join_table': 'at.aq','alias':'aq', 'table' : tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS, 'on_condition' : `at.id = aq.tab_id AND aq.status = '1'`, 'join_type': 'inner_many' },{'join_table': 'aq.aqd','alias':'aqd', 'table' : tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS_DETAILS, 'on_condition' : `aq.id = aqd.question_id AND aqd.status = '1'`, 'join_type': 'inner_one' },{'join_table': 'aqd.ao','alias':'ao', 'table' : tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS, 'on_condition' : `aqd.question_id = ao.question_id AND ao.status = '1'`, 'join_type': 'inner_many' },{'join_table': 'ao.aod','alias':'aod', 'table' : tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS, 'on_condition' : `ao.id = aod.option_id AND aod.status = '1'`, 'join_type': 'inner_one' }],'getMany');
            resultedData = <any>(
                await this.commonArrayService.formatToDto(AssessmentTabsDto, resultedData, req.lang)
            );
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_tabs_title_${postData?.org_id}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${postData?.org_id}`,`dynamic`);
                        ele.title = (customName == '' || customName == `assessment_tabs_title_${postData?.org_id}_${ele['id']}`) ? ele['title'] : customName;
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
    @Post('assessment-steps')
    async assessmentSteps(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            postData.gender = postData?.gender ?? req.tokenUser?.gender;
            postData.gender = Gender[`${postData.gender}`] || postData.gender
            postData.dob = postData?.dob ?? req.tokenUser?.dob;
            let dob = this.commonDateService.calculateUserAge(postData?.dob);
            if (!postData?.org_id || !postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = `at.id = ${postData?.id} AND at.organization_id = ${postData?.org_id} AND at.status = '1' AND aq.status = '1' AND aqd.status = '1' AND aqd.language_id = '1'`;
            if (postData?.gender == 'm') {
                where += ` AND aq.show_gender IN('0','1')`
            } else {
                where += ` AND aq.show_gender IN('0','2')`
            }
            let resultedData = await this.assessmentTabsService.listRecord(where,['at.id','at.title','aqd.id','aqd.question_id','aqd.language_id','aqd.question_title','aqd.main_question_id','aq.tab_id','aq.type','aq.question_type','aq.required','aq.show_gender','aq.parent_id','aq.id','aq.parent_option_id','aq.age_considered','aq.age_limit','aq.age_condition','aod.id','aod.option_id','aod.language_id','aod.option_title','aod.main_option_id','ao.id','ao.question_id','ao.parent_id','ao.sort_order','ao.range_type','ao.start_value','ao.end_value','ao.type','ao.risk_rating'],[tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS,tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS,tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS,tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS_DETAILS],{'sort_order, aq.sort_order, ao.sort_order':'ASC'},req);
            let emotionalAssessmentData = await this.assessmentEmotionalAssessmentService.commonQueryBuilder(['emotionalAssessment.id', 'emotionalAssessment.user_id', 'emotionalAssessment.eha_reset', 'ear.id', 'ear.tab_id', 'ear.assessment_id', 'eaa.id', 'eaa.assessment_id', 'eaa.result_id', 'eaa.option_id', 'eaa.answer'],`emotionalAssessment.user_id = ${postData.user_id} AND emotionalAssessment.eha_reset = 0 AND emotionalAssessment.status != 2 AND (ear.status != 2 OR ear.status IS NULL) AND (eaa.status != 2 OR eaa.status IS NULL)`,{ 'emotionalAssessment.id' : 'DESC' },[{'join_table': 'emotionalAssessment.ear','alias':'ear', 'table' : tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS_RESULT, 'on_condition' : `emotionalAssessment.id = ear.assessment_id AND ear.tab_id = '${postData?.id}' AND ear.status = '1'`, 'join_type': 'left_one' },{'join_table': 'ear.eaa','alias':'eaa', 'table' : tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS_ANSWER, 'on_condition' : `eaa.result_id = ear.id AND ear.assessment_id = emotionalAssessment.id`, 'join_type': 'left_many' }],'getOne')
            if (Array.isArray(resultedData)) {
                resultedData = resultedData.map(record => ({
                    ...record,
                    ...{dob:dob},
                    ...{ear: emotionalAssessmentData?.ear}
                }));
            }
            resultedData = <any>(
                await this.commonArrayService.formatToDto(AssessmentTabsDto, resultedData, req.lang)
            );
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.title){
                        console.log("`assessment_tabs_title_${postData?.org_id}_${ele['id']}`",`assessment_tabs_title_${postData?.org_id}_${ele['id']}`);
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_tabs_title_${postData?.org_id}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${postData?.org_id}`,`dynamic`);
                        console.log("customName",customName);
                        ele.title = (customName == '' || customName == `assessment_tabs_title_${postData?.org_id}_${ele['id']}`) ? ele['title'] : customName;
                    }
                    let id = ele['id'];
                    if (ele?.aq?.length) {
                        console.log("ele?.aq?.length",ele?.aq?.length);
                        await Promise.all(ele.aq.map(async (ele)=>{
                            let questionId = ele['question_id'];
                            console.log("ele.question_title",ele.question_title);
                            if(ele.question_title){
                                console.log("`assessment_question_title_${id}_${questionId}`",`assessment_question_title_${id}_${questionId}`);
                                let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_question_title_${id}_${questionId}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${postData?.org_id}`,`dynamic`);
                                console.log("customName",customName);
                                ele.question_title = (customName == '' || customName == `assessment_question_title_${id}_${questionId}`) ? ele['question_title'] : customName;
                            }
                            if (ele?.submenu?.length) {
                                await Promise.all(ele.submenu.map(async (ele)=>{
                                    if(ele.option_title){
                                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_option_title_${questionId}_${ele['option_id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${postData?.org_id}`,`dynamic`);
                                        ele.option_title = (customName == '' || customName == `assessment_option_title_${questionId}_${ele['option_id']}`) ? ele['option_title'] : customName;
                                    }
                                }));
                            }
                        }));
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
            let resultedData = await this.assessmentTabsService.listRecord({ id: In(postData?.order)}, ["at.id","at.sort_order"],[],{sort_order:'ASC'});
            const orderArray = postData?.order;
            let answers = resultedData.map(obj => obj.sort_order);
            for (let i = 0; i < orderArray.length; i++) {
                await this.assessmentTabsService.update({id: orderArray[i]},{sort_order:answers[i]});
            }
            await this.activityLogService.create(resultedData, postData, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS, req.tokenUser?.id);
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