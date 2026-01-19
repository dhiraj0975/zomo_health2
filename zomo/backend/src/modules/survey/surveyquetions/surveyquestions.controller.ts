import { appConstant, CommonArrayService, CommonService, SurveyQuestionsDto, tableConstant } from '@common-constants';
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
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateSurveyQuestionsInput, PaginationSurveyInput,
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { SurveyQuestionsService } from './surveyquestions.service';
@Controller('survey/questions')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class SurveyQuestionsController {
    constructor(
        private readonly surveyService: SurveyQuestionsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) { }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginationSurveyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = ((postData?.status != undefined || postData?.status != null) && postData?.status != '') ? `survey.status = ${postData?.status} ` : ([appConstant.ROLE.ADMIN, appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER, appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) ? `survey.status != '2' ` : `survey.status NOT IN(2,0) `;
            if (postData?.org_id) {
                where += `AND survey.org_id = ${postData?.org_id} `;
            }
            if (postData?.popup_id) {
                where += `AND survey.popup_id = ${postData?.popup_id} `;
            }
            if (postData?.search_str) {
                where += this.commonService.generateDynamicSearchQuery(postData?.search_str, 'survey.title');
            }
            const resultedData = await this.surveyService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(SurveyQuestionsDto, resultedData['list'], req.lang)
            );
            if (resultedData['list'] && resultedData['list'].length) {
                await Promise.all(resultedData['list'].map(async (ele) => {
                    if (ele.title) {
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang, `question_title_${ele['org_id']}_${ele['popup_id']}_${ele['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${ele.org_id}/${ele.popup_id}`, `dynamic`);
                        if (customeName != `question_title_${ele['org_id']}_${ele['popup_id']}_${ele['id']}`) {
                            ele.title = customeName;
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
            await this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error);
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateSurveyQuestionsInput) {
        try {
            if (!postData?.org_id || !postData?.popup_id || !postData?.title) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let questionSaveData = await this.surveyService.save({ ...postData, created_by: req.tokenUser?.id, updated_by: req.tokenUser?.id });
            if (postData?.title) {
                let tilte = `question_title_${questionSaveData['org_id']}_${questionSaveData['popup_id']}_${questionSaveData['id']}`
                let dynamicDatas = { [`${tilte}`]: postData?.title };
                await this.translatorService.DynamicEngJsonData('Common', postData?.org_id, dynamicDatas, 'Edit', 'SurveyPopup', questionSaveData['popup_id'])
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "MSG_QUESTION_ADDED")
            });
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error);
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateSurveyQuestionsInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const surveyCheck = await this.surveyService.findOne({ id: postData?.id });
            if (!surveyCheck) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            const resultedData = await this.surveyService.update({ id: postData?.id }, { ...postData, updated_by: req.tokenUser?.id });
            this.activityLogService.create(surveyCheck, postData, tableConstant.SURVEY.TBL_C_SURVEY_QUESTIONS, req.tokenUser?.id);
            if (postData?.title) {
                let tilte = `question_title_${postData?.org_id}_${postData?.popup_id}_${postData?.id}`
                let dynamicDatas = { [`${tilte}`]: postData?.title };
                await this.translatorService.DynamicEngJsonData('Common', postData?.org_id, dynamicDatas, 'Edit', 'SurveyPopup', postData?.popup_id)
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: resultedData.affected,
                message: (postData?.status != undefined || postData?.status != null) ? await this.translatorService.frontendReadTranslation(req.lang, "STATUS_UPDATED") : await this.translatorService.frontendReadTranslation(req.lang, "MSG_QUESTION_UPDATED")
            });
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error);
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
            const where = { id: postData?.id };
            const recordDetails = await this.surveyService.findOne(where);
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
            await this.surveyService.update(where, { status: 2 });
            this.activityLogService.create(recordDetails, { status: 2 }, tableConstant.SURVEY.TBL_C_SURVEY_QUESTIONS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "MSG_QUESTION_DELETED")
            });
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error);
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
            if (postData?.status == undefined || postData?.status == null) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let resultedData: any = await this.surveyService.listRecord(['id', 'category_name', 'qty_req', 'reqby_usr', 'reqby_spouse', 'max_freto_earn_point', 'point_for_each', 'max_point_per_cham', 'orgenization_code', 'description', 'plugin', 'controller', 'action', 'ext_link', 'status'], { ...postData });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(SurveyQuestionsDto, resultedData, req.lang)
            );
            if (resultedData && resultedData.length) {
                await Promise.all(resultedData.map(async (ele) => {
                    if (ele.title) {
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang, `question_title_${ele['org_id']}_${ele['popup_id']}_${ele['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${ele.org_id}/${ele.popup_id}`, `dynamic`);
                        if (customeName != `question_title_${ele['org_id']}_${ele['popup_id']}_${ele['id']}`) {
                            ele.title = customeName;
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
            await this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error);
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
            if (postData?.org_id) {
                where['org_id'] = postData?.org_id;
            }
            let recordDetails = await this.surveyService.findOne(where);
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
                await this.commonArrayService.formatToDto(SurveyQuestionsDto, recordDetails, req.lang)
            );
            if (recordDetails.title) {
                let customeName = await this.translatorService.frontendReadTranslation(req.lang, `question_title_${recordDetails['org_id']}_${recordDetails['popup_id']}_${recordDetails['id']}`, `/LC_MESSAGES/Common/SurveyPopup/${recordDetails.org_id}/${recordDetails.popup_id}`, `dynamic`);
                if (customeName != `question_title_${recordDetails['org_id']}_${recordDetails['popup_id']}_${recordDetails['id']}`) {
                    recordDetails.title = customeName;
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
            await this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error);
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
