import { AssessmentQuestionsDetailsDto, CommonArrayService, CommonService, tableConstant } from '@common-constants';
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
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateAssessmentQuestionsDetailsInput, PaginateWithHealthAssessmentInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { AssessmentQuestionsService } from "../assessmentquestions/assessmentquestions.service";
import { AssessmentQuestionsDetailsService } from "./assessmentquestionsdetails.service";
@Controller('health-assessment/assessment-questions-details')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class AssessmentQuestionsDetailsController {
    constructor(
        private readonly assessmentQuestionsDetailsService: AssessmentQuestionsDetailsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly assessmentQuestionsService: AssessmentQuestionsService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithHealthAssessmentInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `healthassessment.status !=0 `;
            if(postData?.question_id){
                where +=`AND healthassessment.question_id = '${postData?.question_id}`;
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'healthassessment.question_title');
            }
            const resultedData = await this.assessmentQuestionsDetailsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(AssessmentQuestionsDetailsDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.question_title){
                        let questionData = await this.assessmentQuestionsService.findOne(`aq.id = '${postData?.question_id}' AND aq.status = 1`,null, ['aq','at'],[tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_TABS]);
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_question_title_${questionData['tab_id']}_${ele['question_id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${questionData['at']?.organization_id ?? req.tokenUser?.org_id}`,`dynamic`);
                        ele.question_title = (customeName == '' || customeName == `assessment_question_title_${questionData['tab_id']}_${ele['question_id']}`) ? ele['question_title'] : customeName;
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
            let resultedData = await this.assessmentQuestionsDetailsService.findOne(where);
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
            resultedData = <any>(
                await this.commonArrayService.formatToDto(AssessmentQuestionsDetailsDto, resultedData, req.lang)
            );
            if(resultedData.question_title){
                let questionData = await this.assessmentQuestionsService.findOne(`aq.id = '${postData?.question_id}' AND aq.status = 1`,null, ['aq','at'],[tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_TABS]);
                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_question_title_${questionData['tab_id']}_${resultedData['question_id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${questionData['at']?.organization_id ?? req.tokenUser?.org_id}`,`dynamic`);
                resultedData.question_title = (customeName == '' || customeName == `assessment_question_title_${questionData['tab_id']}_${resultedData['question_id']}`) ? resultedData['question_title'] : customeName;
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
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssessmentQuestionsDetailsInput) {
        try {
            if (
                !postData?.question_id ||
                !postData?.language_id ||
                !postData?.question_title
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let questionData = await this.assessmentQuestionsService.findOne(`aq.id = '${postData?.question_id}' AND aq.status = 1`,null, ['aq','at'],[tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_TABS]);
            let resultData = await this.assessmentQuestionsDetailsService.save(postData);
            let dynamicDatas = Object.create(null);
            if(postData?.question_title){
                let tilte = `assessment_question_title_${questionData['tab_id']}_${resultData['question_id']}`
                dynamicDatas[`${tilte}`] = postData?.question_title;
            }                        
            await this.translatorService.DynamicEngJsonData('MyHealth','eha',dynamicDatas,'Edit','Assessment',questionData['at']?.organization_id ?? req.tokenUser?.org_id);
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
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
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.assessmentQuestionsDetailsService.findOne(where);
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
            await this.assessmentQuestionsDetailsService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS_DETAILS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
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
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssessmentQuestionsDetailsInput) {
        try {
            if (
                !postData?.id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.assessmentQuestionsDetailsService.findOne(where);
            if (!recordDetails) {
                await this.assessmentQuestionsDetailsService.save({
                    ...postData,
                    created_by: req.tokenUser?.id
                });
            }
            await this.assessmentQuestionsDetailsService.update(where, {...postData, updated_by : req.tokenUser?.id});
            this.activityLogService.create(recordDetails, {...postData, updated_by : req.tokenUser?.id}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS_DETAILS, req.tokenUser?.id);
            let questionData = await this.assessmentQuestionsService.findOne(`aq.id = '${recordDetails.question_id}' AND aq.status = 1`,null, ['aq','at'],[tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_TABS]);
            let dynamicDatas = Object.create(null);
            if(postData?.question_title){
                let tilte = `assessment_question_title_${questionData['tab_id']}_${recordDetails['question_id']}`
                dynamicDatas[`${tilte}`]= postData?.question_title;
            }                        
            await this.translatorService.DynamicEngJsonData('MyHealth','eha',dynamicDatas,'Edit','Assessment',questionData['at']?.organization_id ?? req.tokenUser?.org_id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = { };
            let resultedData = await this.assessmentQuestionsDetailsService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(AssessmentQuestionsDetailsDto, resultedData, req.lang)
            );
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.question_title){
                        let questionData = await this.assessmentQuestionsService.findOne(`aq.id = '${postData?.question_id}' AND aq.status = 1`,null, ['aq','at'],[tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_TABS]);
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_question_title_${questionData['tab_id']}_${ele['question_id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${questionData['at']?.organization_id ?? req.tokenUser?.org_id}`,`dynamic`);
                        ele.question_title = (customeName == '' || customeName == `assessment_question_title_${questionData['tab_id']}_${ele['question_id']}`) ? ele['question_title'] : customeName;
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
}