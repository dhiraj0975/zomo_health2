import { appConstant, CommonArrayService, CommonService, SurveyAnswersDto, tableConstant } from '@common-constants';
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
import { Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { CreateSurveyAnswersInput, PaginationSurveyInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { SurveyAnswersService } from './surveyanswers.service';
@Controller('survey/answers')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class SurveyAnswersController {
    constructor(
        private readonly surveyAnswersService: SurveyAnswersService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginationSurveyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = ((postData?.status != undefined || postData?.status != null) && postData?.status != '') ? `survey.status = ${postData?.status} `: ([appConstant.ROLE.ADMIN,appConstant.ROLE.ORGADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) ? `survey.status != '2' ` : `survey.status NOT IN(2,0) `;
            if (postData?.q_id) {
                where += `AND survey.q_id = ${postData?.q_id}`;
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'survey.title');
            }
            const resultedData = await this.surveyAnswersService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(SurveyAnswersDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `surveyoptions_${ele['question']['q_id']}_${ele['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${ele['question']['org_id']}/${ele['question']['popup_id']}`,`dynamic`);
                        if (customName != `surveyoptions_${ele['question']['q_id']}_${ele['id']}`) {
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateSurveyAnswersInput) {
        try {
            if (!postData?.q_id || !postData?.title) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let recordDetails = await this.surveyAnswersService.findOne({q_id: postData?.q_id, status: Not('2')});
            if(recordDetails && recordDetails?.['question']?.ans_option_type == 0){
                let recordExist = await this.surveyAnswersService.findOne({q_id: postData?.q_id, correct_ans: 1, status: Not('2')});
                if(!recordExist || postData?.correct_ans == 0){
                    let insertData = await this.surveyAnswersService.save({...postData, created_by: req.tokenUser?.id, updated_by: req.tokenUser?.id});
                    if(postData?.title){
                        let tilte = `surveyoptions_${postData?.q_id}_${insertData['id']}`
                        let dynamicDatas= { [`${tilte}`]: postData?.title};
                        await this.translatorService.DynamicEngJsonData('Common',recordDetails?.['question']?.org_id,dynamicDatas,'Edit','SurveyPopup',recordDetails?.['question']?.['popup_id']) 
                    }
                }
                else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'Sorry You have already one correct answer is selected for this question.'));                    
                }
            }
            else{
                let insertData = await this.surveyAnswersService.save({...postData, created_by: req.tokenUser?.id, updated_by: req.tokenUser?.id});
                recordDetails = await this.surveyAnswersService.findOne({id: insertData?.['id']});
                if(postData?.title){
                    let tilte = `surveyoptions_${postData?.q_id}_${insertData['id']}`
                    let dynamicDatas= { [`${tilte}`]: postData?.title};
                    await this.translatorService.DynamicEngJsonData('Common',recordDetails?.['question']?.org_id,dynamicDatas,'Edit','SurveyPopup',recordDetails?.['question']?.['popup_id']) 
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: postData,
                message: await this.translatorService.frontendReadTranslation(req.lang, "MSG_ANSWER_ADDED")
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateSurveyAnswersInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const where = { id : postData?.id}
            const recordDetails = await this.surveyAnswersService.findOne(where);
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
            if(postData?.correct_ans && recordDetails.correct_ans !== postData?.correct_ans){
                if(recordDetails && recordDetails?.['question']?.ans_option_type == 0){
                    let record = await this.surveyAnswersService.findOne({q_id: recordDetails.q_id, correct_ans: 1, status: Not('2')});
                    if(record){
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'Sorry You have already one correct answer is selected for this question.'));  
                    }
                }
            }
            await this.surveyAnswersService.update({ id: postData?.id },{...postData, updated_by: req.tokenUser?.id });
            this.activityLogService.create(recordDetails, {...postData, updated_by: req.tokenUser?.id }, tableConstant.SURVEY.TBL_C_SURVEY_ANSWERS, req.tokenUser?.id);
            if(postData?.title){
                let tilte = `surveyoptions_${recordDetails['q_id']}_${recordDetails['id']}`
                let dynamicDatas= { [`${tilte}`]: postData?.title};
                await this.translatorService.DynamicEngJsonData('Common',recordDetails['question'].org_id,dynamicDatas,'Edit','SurveyPopup',recordDetails['question']['popup_id']) 
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: postData,
                message: ((postData?.status != undefined || postData?.status != null) && postData?.status != recordDetails?.status) ? await this.translatorService.frontendReadTranslation(req.lang, "STATUS_UPDATED") : await this.translatorService.frontendReadTranslation(req.lang, "MSG_ANSWER_UPDATED")
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
            if (!postData?.id && !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = postData?.org_id ? {org_id: postData?.org_id, status: Not('2')} : {id: postData?.id, status: Not('2')}
            let resultedData: any = await this.surveyAnswersService.listRecord(["id","activity_name"],{...where});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(SurveyAnswersDto, resultedData, req.lang)
            );
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `surveyoptions_${ele['question']['q_id']}_${ele['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${ele['question']['org_id']}/${ele['question']['popup_id']?.toSting()}`,`dynamic`);
                        if (customName != `surveyoptions_${ele['question']['q_id']}_${ele['id']}`) {
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
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.surveyAnswersService.findOne({ id: postData?.id });
            const resultedData = await this.surveyAnswersService.update({ id: postData?.id },{status: '2'});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.SURVEY.TBL_C_SURVEY_ANSWERS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData.affected,
                message: await this.translatorService.frontendReadTranslation(req.lang, "MSG_ANSWER_DELETED"),
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
            let recordDetails = await this.surveyAnswersService.findOne(where);
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
                await this.commonArrayService.formatToDto(SurveyAnswersDto, recordDetails, req.lang)
            );
            if(recordDetails.title){
                let customName = await this.translatorService.frontendReadTranslation(req.lang, `surveyoptions_${recordDetails['question']['q_id']}_${recordDetails['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${recordDetails['question']['org_id']}/${recordDetails['question']['popup_id']}`,`dynamic`);
                if (customName != `surveyoptions_${recordDetails['question']['q_id']}_${recordDetails['id']}`) {
                    recordDetails.title = customName;
                }
            }
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
}
