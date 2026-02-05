import { AssessmentResultsDto, CommonArrayService, CommonService, tableConstant } from '@common-constants';
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
    CreateAssessmentResultsInput,
    PaginateWithHealthAssessmentInput, UpdateAssessmentResultsInput
} from "../../../input";
import { MyPlanActivityService } from "../../myplan/activity/activity.service";
import { TranslationService } from "../../translation/translation.service";
import { AssessmentResultsService } from "./assessmentresults.service";
@Controller('health-assessment/results')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class AssessmentResultsController {
    constructor(
        private readonly assessmentResultsService: AssessmentResultsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly myPlanActivityService: MyPlanActivityService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithHealthAssessmentInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            postData.organization_id = postData?.organization_id ?? req.tokenUser?.org_id;
            let where = `healthassessment.status != '2' `;
            if(postData?.organization_id){
                where +=`AND healthassessment.organization_id = '${postData?.organization_id}'`;
            }
            if (postData?.search_str) {
                where += `AND(healthassessment.marker-low LIKE '%${postData?.search_str}%' OR healthassessment.marker-mod LIKE '%${postData?.search_str}%' OR healthassessment.marker-high LIKE '%${postData?.search_str}%' OR healthassessment.marker-common LIKE '%${postData?.search_str}%' OR healthassessment.marker-common_last LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.assessmentResultsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(AssessmentResultsDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_title_${ele.organization_id}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${ele['organization_id']}`,`dynamic`);
                        ele.title = (customName == '' || customName == `assessment_title_${ele.organization_id}_${ele['id']}`) ? ele['title'] : customName;
                    }
                    if(ele['marker-low']){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_markerlow_${ele.organization_id}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${ele['organization_id']}`,`dynamic`);
                        ele['marker-low'] = (customName == '' || customName == `assessment_markerlow_${ele.organization_id}_${ele['id']}`) ? ele['marker-low'] : customName;
                    }
                    if(ele['marker-mod']){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_markermod_${ele.organization_id}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${ele['organization_id']}`,`dynamic`);
                        ele['marker-mod'] = (customName == '' || customName == `assessment_markermod_${ele.organization_id}_${ele['id']}`) ? ele['marker-mod'] : customName;
                    }
                    if(ele['marker-high']){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_markerhigh_${ele.organization_id}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${ele['organization_id']}`,`dynamic`);
                        ele['marker-high'] = (customName == '' || customName == `assessment_markerhigh_${ele.organization_id}_${ele['id']}`) ? ele['marker-high'] : customName;
                    }
                    if(ele['marker-common']){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_markercommon_${ele.organization_id}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${ele['organization_id']}`,`dynamic`);
                        ele['marker-common'] = (customName == '' || customName == `assessment_markercommon_${ele.organization_id}_${ele['id']}`) ? ele['marker-common'] : customName;
                    }
                    if(ele['marker-common_last']){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_markercommonlast_${ele.organization_id}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${ele['organization_id']}`,`dynamic`);
                        ele['marker-common_last'] = (customName == '' || customName == `assessment_markercommonlast_${ele.organization_id}_${ele['id']}`) ? ele['marker-common_last'] : customName;
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
            let assessmentResult = await this.assessmentResultsService.findOne(where);
            if (!assessmentResult) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            assessmentResult = <any>(
                await this.commonArrayService.formatToDto(AssessmentResultsDto, assessmentResult, req.lang)
            );
            if(assessmentResult.title){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_title_${assessmentResult.organization_id}_${assessmentResult['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${assessmentResult['organization_id']}`,`dynamic`);
                assessmentResult.title = (customName == '' || customName == `assessment_title_${assessmentResult.organization_id}_${assessmentResult['id']}`) ? assessmentResult['title'] : customName;
            }
            if(assessmentResult['marker-low']){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_markerlow_${assessmentResult.organization_id}_${assessmentResult['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${assessmentResult['organization_id']}`,`dynamic`);
                assessmentResult['marker-low'] = (customName == '' || customName == `assessment_markerlow_${assessmentResult.organization_id}_${assessmentResult['id']}`) ? assessmentResult['marker-low'] : customName;
            }
            if(assessmentResult['marker-mod']){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_markermod_${assessmentResult.organization_id}_${assessmentResult['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${assessmentResult['organization_id']}`,`dynamic`);
                assessmentResult['marker-mod'] = (customName == '' || customName == `assessment_markermod_${assessmentResult.organization_id}_${assessmentResult['id']}`) ? assessmentResult['marker-mod'] : customName;
            }
            if(assessmentResult['marker-high']){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_markerhigh_${assessmentResult.organization_id}_${assessmentResult['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${assessmentResult['organization_id']}`,`dynamic`);
                assessmentResult['marker-high'] = (customName == '' || customName == `assessment_markerhigh_${assessmentResult.organization_id}_${assessmentResult['id']}`) ? assessmentResult['marker-high'] : customName;
            }
            if(assessmentResult['marker-common']){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_markercommon_${assessmentResult.organization_id}_${assessmentResult['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${assessmentResult['organization_id']}`,`dynamic`);
                assessmentResult['marker-common'] = (customName == '' || customName == `assessment_markercommon_${assessmentResult.organization_id}_${assessmentResult['id']}`) ? assessmentResult['marker-common'] : customName;
            }
            if(assessmentResult['marker-common_last']){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_markercommonlast_${assessmentResult.organization_id}_${assessmentResult['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${assessmentResult['organization_id']}`,`dynamic`);
                assessmentResult['marker-common_last'] = (customName == '' || customName == `assessment_markercommonlast_${assessmentResult.organization_id}_${assessmentResult['id']}`) ? assessmentResult['marker-common_last'] : customName;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: assessmentResult,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssessmentResultsInput) {
        try {
            postData.organization_id = postData?.organization_id ?? req.tokenUser?.org_id;
            if (!postData?.organization_id || !postData?.title || !this.commonService.isValidNumber(postData?.type)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let resultData = await this.assessmentResultsService.findOne({organization_id: postData?.organization_id, status: Not(2)},["order_id"],{"order_id":"DESC"});
            postData['order_id'] = resultData && resultData['order_id'] ? resultData['order_id'] + 1 : 1;
            let recordDetails = await this.assessmentResultsService.save({...postData, created_by: req.tokenUser?.id, updated_by: req.tokenUser?.id});
            let dynamicData = Object.create(null);
            if(postData?.title){
                let title = `assessment_title_${postData?.organization_id}_${recordDetails['id']}`
                dynamicData[`${title}`]= postData?.title;
            }            
            if(postData['marker-low']){
                let title = `assessment_markerlow_${postData?.organization_id}_${recordDetails['id']}`
                dynamicData[`${title}`]= postData['marker-low'];
            }            
            if(postData['marker-mod']){
                let title = `assessment_markermod_${postData?.organization_id}_${recordDetails['id']}`
                dynamicData[`${title}`]= postData['marker-mod'];
            }            
            if(postData['marker-high']){
                let title = `assessment_markerhigh_${postData?.organization_id}_${recordDetails['id']}`
                dynamicData[`${title}`]= postData['marker-high'];
            }            
            if(postData['marker-common']){
                let title = `assessment_markercommon_${postData?.organization_id}_${recordDetails['id']}`
                dynamicData[`${title}`]= postData['marker-common'];
            }            
            if(postData['marker-common_last']){
                let title = `assessment_markercommonlast_${postData?.organization_id}_${recordDetails['id']}`
                dynamicData[`${title}`]= postData['marker-common_last'];
            }            
            await this.translatorService.DynamicEngJsonData('MyHealth','eha',dynamicData,'Edit','Assessment',postData?.organization_id);
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'MSG_RESULT_ADDED'),
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
            const recordDetails = await this.assessmentResultsService.findOne(where);
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
            await this.assessmentResultsService.update(where,{status:2});
            await this.activityLogService.create(recordDetails, {status:2}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS, req.tokenUser?.id, 'delete');
            await this.myPlanActivityService.update({ org_activity_id: postData?.id, module_id: 2 },{status: '0'});
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'MSG_RESULT_DELETED'),
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateAssessmentResultsInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let message;
            postData.organization_id = postData?.organization_id ?? req.tokenUser?.org_id;
            const where = {id: postData?.id};
            const recordDetails = await this.assessmentResultsService.findOne(where);
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
            await this.assessmentResultsService.update(where, {...postData, updated_by : req.tokenUser?.id});
            message = await this.translatorService.frontendReadTranslation(req.lang, 'MSG_RESULT_UPDATED');
            if ([0, 1].includes(postData?.status)) {
                let statusMessage = {'0': 'MSG_RESULT_DEACTIVATE','1': 'MSG_RESULT_ACTIVATE'}
                message = await this.translatorService.frontendReadTranslation(req.lang, statusMessage[postData?.status]);
            }
            await this.activityLogService.create(recordDetails, postData, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS, req.tokenUser?.id);
            let dynamicData = Object.create(null);
            if(postData?.title){
                let title = `assessment_title_${recordDetails.organization_id}_${recordDetails['id']}`
                dynamicData[`${title}`]= postData?.title;
            }            
            if(postData['marker-low']){
                let title = `assessment_markerlow_${recordDetails.organization_id}_${recordDetails['id']}`
                dynamicData[`${title}`]= postData['marker-low'];
            }            
            if(postData['marker-mod']){
                let title = `assessment_markermod_${recordDetails.organization_id}_${recordDetails['id']}`
                dynamicData[`${title}`]= postData['marker-mod'];
            }            
            if(postData['marker-high']){
                let title = `assessment_markerhigh_${recordDetails.organization_id}_${recordDetails['id']}`
                dynamicData[`${title}`]= postData['marker-high'];
            }            
            if(postData['marker-common']){
                let title = `assessment_markercommon_${recordDetails.organization_id}_${recordDetails['id']}`
                dynamicData[`${title}`]= postData['marker-common'];
            }            
            if(postData['marker-common_last']){
                let title = `assessment_markercommonlast_${recordDetails.organization_id}_${recordDetails['id']}`
                dynamicData[`${title}`]= postData['marker-common_last'];
            }            
            await this.translatorService.DynamicEngJsonData('MyHealth','eha',dynamicData,'Edit','Assessment',recordDetails.organization_id);
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
            let where = { }, order = {};
            if (postData?.org_id) {
                where = { organization_id: postData?.org_id, status: Not('2')};
                order = {order_id: 'ASC'};
            }
            let resultedData: any = await this.assessmentResultsService.listRecord(where,["id","title"],order);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(AssessmentResultsDto, resultedData, req.lang)
            );
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_title_${ele.organization_id}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${ele['organization_id']}`,`dynamic`);
                        ele.title = (customName == '' || customName == `assessment_title_${ele.organization_id}_${ele['id']}`) ? ele['title'] : customName;
                    }
                    if(ele['marker-low']){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_markerlow_${ele.organization_id}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${ele['organization_id']}`,`dynamic`);
                        ele['marker-low'] = (customName == '' || customName == `assessment_markerlow_${ele.organization_id}_${ele['id']}`) ? ele['marker-low'] : customName;
                    }
                    if(ele['marker-mod']){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_markermod_${ele.organization_id}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${ele['organization_id']}`,`dynamic`);
                        ele['marker-mod'] = (customName == '' || customName == `assessment_markermod_${ele.organization_id}_${ele['id']}`) ? ele['marker-mod'] : customName;
                    }
                    if(ele['marker-high']){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_markerhigh_${ele.organization_id}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${ele['organization_id']}`,`dynamic`);
                        ele['marker-high'] = (customName == '' || customName == `assessment_markerhigh_${ele.organization_id}_${ele['id']}`) ? ele['marker-high'] : customName;
                    }
                    if(ele['marker-common']){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_markercommon_${ele.organization_id}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${ele['organization_id']}`,`dynamic`);
                        ele['marker-common'] = (customName == '' || customName == `assessment_markercommon_${ele.organization_id}_${ele['id']}`) ? ele['marker-common'] : customName;
                    }
                    if(ele['marker-common_last']){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_markercommonlast_${ele.organization_id}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${ele['organization_id']}`,`dynamic`);
                        ele['marker-common_last'] = (customName == '' || customName == `assessment_markercommonlast_${ele.organization_id}_${ele['id']}`) ? ele['marker-common_last'] : customName;
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
            let resultedData = await this.assessmentResultsService.listRecord({ id: In(postData?.order)},["id","order_id"], { order_id: 'ASC' });
            const orderArray = postData?.order;
            let answers = resultedData.map(obj => obj.order_id);
            for (let i = 0; i < orderArray.length; i++) {
                await this.assessmentResultsService.update({id: orderArray[i]},{order_id:answers[i]});
            }
            this.activityLogService.create(resultedData, postData, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'SUCCESS_ORDER_CHANGE'),
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