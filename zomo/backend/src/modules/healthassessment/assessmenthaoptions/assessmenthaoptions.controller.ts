import {
    AssessmentHaOptionsDto,
    AssessmentHaOptionsEntity, AssessmentHaQuestionsEntity,
    CommonArrayService,
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
import { CreateAssessmentHaOptionsInput, PaginateWithHealthAssessmentInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { AssessmentHaQuestionsService } from "../assessmenthaquestions/assessmenthaquestions.service";
import { AssessmentHaOptionsService } from "./assessmenthaoptions.service";
@Controller('health-assessment/options')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class AssessmentHaOptionsController {
    constructor(
        private readonly assessmentOptionsService: AssessmentHaOptionsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly assessmentQuestionsService: AssessmentHaQuestionsService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithHealthAssessmentInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `healthassessment.status != '2'`;
            if(postData?.question_id){
                where +=`AND healthassessment.question_id = '${postData?.question_id}' `;
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'healthassessment.option_title');
            }
            const resultedData = await this.assessmentOptionsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(AssessmentHaOptionsDto, resultedData['list'], req.lang)
            );
            /*NOTE: not neet to add language translation in superadmin side*/
            /*if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.option_title){
                        let questionData = await this.assessmentQuestionsService.findOne(`healthassessment.id = '${ele.question_id}'`);
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`option_title_${ele['question_id']}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/hra/${questionData?.questioncat_id}`,`dynamic`);
                        ele.option_title = (customName == '' || customName == `option_title_${ele['question_id']}_${ele['id']}`) ? ele['option_title'] : customName;
                    }
                }));
            }*/
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
            const where = { id: postData?.id,status: Not('2') };
            let recordDetails = await this.assessmentOptionsService.findOne(where);
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
            recordDetails = <any>(
                await this.commonArrayService.formatToDto(AssessmentHaOptionsDto, recordDetails, req.lang)
            );
            /*NOTE: not neet to add language translation in superadmin side*/
            /*if(recordDetails.option_title){
                let questionData = await this.assessmentQuestionsService.findOne(`healthassessment.id = '${recordDetails.question_id}'`);
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`option_title_${recordDetails['question_id']}_${recordDetails['id']}`, `/LC_MESSAGES/MyHealth/Assessment/hra/${questionData?.questioncat_id}`,`dynamic`);
                recordDetails.option_title = (customName == '' || customName == `option_title_${recordDetails['question_id']}_${recordDetails['id']}`) ? recordDetails['option_title'] : customName;
            }*/
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: recordDetails,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssessmentHaOptionsInput) {
        try {
            postData['main_option_id'] = postData?.main_option_id ?? 0;
            if (
                !postData?.question_id ||
                !postData?.option_title ||
                !this.commonService.isValidNumber(postData?.algo_value) ||
                !this.commonService.isValidNumber(postData?.risk_rating)
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let resultData = await this.assessmentOptionsService.findOne({question_id: postData?.question_id, status: Not('2')},{"healthassessment.order":"DESC"},["healthassessment.id","healthassessment.order"]);
            postData['order'] = resultData && resultData['order'] ? resultData['order'] + 1 : 1;
            let optionData = await this.assessmentOptionsService.save({...postData});
            let questionData: AssessmentHaQuestionsEntity = await this.assessmentQuestionsService.getOne({id: postData?.question_id},['questioncat_id']);
            let dynamicData = Object.create(null);
            if(postData?.option_title){
                let title = `option_title_${postData?.question_id}_${optionData?.identifiers[0]?.id}`
                dynamicData[`${title}`] = postData?.option_title;
            }                        
            await this.translatorService.DynamicEngJsonData('MyHealth','hra',dynamicData,'Edit','Assessment',questionData?.questioncat_id);
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
            const recordDetails:AssessmentHaOptionsEntity = await this.assessmentOptionsService.findOne(where);
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
            await this.assessmentOptionsService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_OPTIONS, req.tokenUser?.id, 'delete');
            if (recordDetails.question_id) {
                let optionKey: string = `option_title_${recordDetails.question_id}_${recordDetails.id}`
                const dynamicData: Record<string, string> = {
                    [optionKey]: optionKey,
                };
                let questionData: AssessmentHaQuestionsEntity = await this.assessmentQuestionsService.getOne({id: recordDetails.question_id},['questioncat_id']);
                await this.translatorService.DynamicEngJsonData('MyHealth','hra',dynamicData,'Delete','Assessment',questionData?.questioncat_id);
            }
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssessmentHaOptionsInput) {
        try {
            if (
                !postData?.id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.assessmentOptionsService.findOne(where);
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
            await this.assessmentOptionsService.update(where, {...postData});
            await this.activityLogService.create(recordDetails, postData, tableConstant.HEALTH_ASSESSMENT.TBL_HA_OPTIONS, req.tokenUser?.id);
            let questionData: AssessmentHaQuestionsEntity = await this.assessmentQuestionsService.findOne(`healthassessment.id = '${recordDetails.question_id}'`);
            let dynamicData = Object.create(null);
            if(postData?.option_title){
                let title = `option_title_${recordDetails['question_id']}_${recordDetails['id']}`
                dynamicData[`${title}`] = postData?.option_title;
            }                        
            await this.translatorService.DynamicEngJsonData('MyHealth','hra',dynamicData,'Edit','Assessment',questionData?.questioncat_id);
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
            const where = {status: Not('2')};
            if(postData?.question_id){
                where['question_id'] = postData?.question_id;
            }
            if(postData?.parent_option){
                where['id'] = Not(postData?.parent_option);
            }
            if(postData?.parent){
                where['parent_id'] = 0;
            }
            let resultedData = await this.assessmentOptionsService.listRecord(where, {order: "ASC"}, ['id','option_title']);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(AssessmentHaOptionsDto, resultedData, req.lang)
            );
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.option_title){
                        let questionData = await this.assessmentQuestionsService.findOne(`healthassessment.id = '${ele.question_id}'`);
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`option_title_${ele['question_id']}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/hra/${questionData?.questioncat_id}`,`dynamic`);
                        ele.option_title = (customName == '' || customName == `option_title_${ele['question_id']}_${ele['id']}`) ? ele['option_title'] : customName;
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
            if (postData?.order.length == 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.assessmentOptionsService.listRecord({ id: In(postData?.order)}, { order: 'ASC' },["id","order"]);
            const orderArray = postData?.order;
            let answers = resultedData.map(obj => obj.order);
            for (let i = 0; i < orderArray.length; i++) {
                await this.assessmentOptionsService.update({id: orderArray[i]},{order:answers[i]});
            }
            this.activityLogService.create(resultedData, postData, tableConstant.HEALTH_ASSESSMENT.TBL_HA_OPTIONS, req.tokenUser?.id);
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