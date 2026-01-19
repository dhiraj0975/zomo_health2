import { AssessmentOptionsDetailsDto, CommonArrayService, CommonService, tableConstant } from '@common-constants';
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
import { CreateAssessmentOptionsDetailsInput, PaginateWithHealthAssessmentInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { AssessmentOptionsService } from "../assessmentoptions/assessmentoptions.service";
import { AssessmentOptionsDetailsService } from "./assessmentoptionsdetails.service";
@Controller('health-assessment/assessment-options-details')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class AssessmentOptionsDetailsController {
    constructor(
        private readonly assessmentOptionsDetailsService: AssessmentOptionsDetailsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly assessmentOptionsService: AssessmentOptionsService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithHealthAssessmentInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `healthassessment.status !=0 `;
            if(postData?.option_id){
                where +=`AND healthassessment.option_id = '${postData?.option_id}`;
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'healthassessment.option_title');
            }
            const resultedData = await this.assessmentOptionsDetailsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(AssessmentOptionsDetailsDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.option_title){
                        let optionData = await this.assessmentOptionsService.findOne(`ao.id = '${ele.option_id}' AND ao.status = 1`, ['ao']);
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_option_title_${optionData['question_id']}_${ele['option_id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${req.tokenUser?.org_id}`,`dynamic`);
                        ele.option_title = (customeName == '' || customeName == `assessment_option_title_${optionData['question_id']}_${ele['option_id']}`) ? ele['option_title'] : customeName;
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
            let optionDetails = await this.assessmentOptionsDetailsService.findOne(where);
            if (!optionDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            optionDetails = <any>(
                await this.commonArrayService.formatToDto(AssessmentOptionsDetailsDto, optionDetails, req.lang)
            );
            if(optionDetails.option_title){
                let optionData = await this.assessmentOptionsService.findOne(`ao.id = '${optionDetails.option_id}' AND ao.status = 1`, ['ao']);
                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_option_title_${optionData['question_id']}_${optionDetails['option_id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${req.tokenUser?.org_id}`,`dynamic`);
                optionDetails.option_title = (customeName == '' || customeName == `assessment_option_title_${optionData['question_id']}_${optionDetails['option_id']}`) ? optionDetails['option_title'] : customeName;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: optionDetails,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssessmentOptionsDetailsInput) {
        try {
            if (
                !postData?.option_id ||
                !postData?.language_id ||
                !postData?.option_title
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let optionData = await this.assessmentOptionsService.findOne(`ao.id = '${postData?.option_id}' AND ao.status = 1`, ['ao']);
            let resultData = await this.assessmentOptionsDetailsService.save(postData);
            let dynamicDatas = Object.create(null);
            if(postData?.option_title){
                let tilte = `assessment_option_title_${optionData['question_id']}_${resultData['option_id']}`
                dynamicDatas[`${tilte}`] = postData?.option_title;
            }                        
            await this.translatorService.DynamicEngJsonData('MyHealth','eha',dynamicDatas,'Edit','Assessment',req.tokenUser?.org_id);
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
            const recordDetails = await this.assessmentOptionsDetailsService.findOne(where);
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
            await this.assessmentOptionsDetailsService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS, req.tokenUser?.id, 'delete');
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssessmentOptionsDetailsInput) {
        try {
            if (
                !postData?.id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.assessmentOptionsDetailsService.findOne(where);
            if (!recordDetails) {
                await this.assessmentOptionsDetailsService.save(postData);
            }
            let optionData = await this.assessmentOptionsService.findOne(`ao.id = '${postData?.option_id}' AND ao.status = 1`, ['ao']);
            await this.assessmentOptionsDetailsService.update(where, postData);
            this.activityLogService.create(recordDetails, postData, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS, req.tokenUser?.id);
            let dynamicDatas = Object.create(null);
            if(postData?.option_title){
                let tilte = `assessment_option_title_${optionData['question_id']}_${recordDetails['option_id']}`
                dynamicDatas[`${tilte}`] = postData?.option_title;
            }                        
            await this.translatorService.DynamicEngJsonData('MyHealth','eha',dynamicDatas,'Edit','Assessment',req.tokenUser?.org_id);
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
            let resultedData = await this.assessmentOptionsDetailsService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(AssessmentOptionsDetailsDto, resultedData, req.lang)
            );
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.option_title){
                        let optionData = await this.assessmentOptionsService.findOne(`ao.id = '${ele.option_id}' AND ao.status = 1`, ['ao']);
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_option_title_${optionData['question_id']}_${ele['option_id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${req.tokenUser?.org_id}`,`dynamic`);
                        ele.option_title = (customeName == '' || customeName == `assessment_option_title_${optionData['question_id']}_${ele['option_id']}`) ? ele['option_title'] : customeName;
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