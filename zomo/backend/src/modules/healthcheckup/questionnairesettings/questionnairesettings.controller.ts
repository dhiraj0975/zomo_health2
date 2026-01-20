import { appConstant, CommonArrayService, QuestionnaireSettingsDto, tableConstant } from '@common-constants';
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
    CreateQuestionnaireSettingsInput,
    DeleteHealthCheckupInput,
    GetOneHealthCheckupInput,
    UpdateQuestionnaireSettingsInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { QuestionnaireSettingsService } from './questionnairesettings.service';
@Controller('health-checkup/questionnaire-settings')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class QuestionnaireSettingsController {
    constructor(
        private readonly questionnaireSettingsService: QuestionnaireSettingsService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) { }
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateQuestionnaireSettingsInput) {
        try {
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ORGADMIN, appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) {
                let po = await this.questionnaireSettingsService.save({ ...postData });
                let dynamicData = Object.create(null);
                if(postData?.title){
                    let quizName = `title_${postData['org_id']}`
                    dynamicData[`${quizName}`]= postData?.title;
                }
                if(postData?.header_text){
                    let quizDescription = `header_text_${postData['org_id']}`
                    dynamicData[`${quizDescription}`]= postData?.header_text;
                }
                await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicData,'Add','QuestionnairePopup');
                return res.status(HttpStatus.OK).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, "MSG_SETTING_SAVE")
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateQuestionnaireSettingsInput) {
        try {
            if (!postData?.id && !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            if ([appConstant.ROLE.ORGADMIN, appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) {
                const where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id } : { id: postData?.id } : { org_id: postData?.org_id };
                const recordDetails = await this.questionnaireSettingsService.findOne(where);
                await this.questionnaireSettingsService.update(where, { ...postData });
                let dynamicData = Object.create(null);
                if(postData?.title){
                    let quizName = `title_${postData['org_id']}`
                    dynamicData[`${quizName}`]= postData?.title;
                }
                if(postData?.header_text){
                    let quizDescription = `header_text_${postData['org_id']}`
                    dynamicData[`${quizDescription}`]= postData?.header_text;
                }
                await this.translatorService.DynamicEngJsonData('Common',postData?.org_id,dynamicData,'Add','QuestionnairePopup');
                this.activityLogService.create(recordDetails, postData, tableConstant.HEALTH_CHECKUP.TBL_HC_QUESTIONNAIRE_SETTINGS, req.tokenUser?.id);
                return res.status(HttpStatus.OK).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, "MSG_SETTING_UPDATED")
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteHealthCheckupInput) {
        try {
            if (!postData?.id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.questionnaireSettingsService.findOne({
                id: postData?.id,
                org_id: postData?.org_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.questionnaireSettingsService.update({ id: postData?.id, org_id: postData?.org_id }, { status: 2 });
            this.activityLogService.create(recordDetails, { status: 2 }, tableConstant.HEALTH_CHECKUP.TBL_HC_QUESTIONNAIRE_SETTINGS, req.tokenUser?.id, 'delete');
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneHealthCheckupInput) {
        try {
            if (!postData?.id && !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            if ([appConstant.ROLE.ORGADMIN, appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) {
                const where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id } : { id: postData?.id } : { org_id: postData?.org_id };
                let resultedData = await this.questionnaireSettingsService.findOne(where);
                resultedData = resultedData ?? <any>(
                    await this.commonArrayService.formatToDto(QuestionnaireSettingsDto, resultedData, req.lang)
                );
                if(resultedData?.title){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`title_${resultedData.org_id}`, `/LC_MESSAGES/Common/QuestionnairePopup/${resultedData['org_id']}`,`dynamic`);
                    resultedData.title = (customName == '' || customName == `title_${resultedData.org_id}`) ? resultedData['title'] : customName;
                }
                if(resultedData?.header_text){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`header_text_${resultedData.org_id}`, `/LC_MESSAGES/Common/QuestionnairePopup/${resultedData['org_id']}`,`dynamic`);
                    resultedData.header_text = (customName == '' || customName == `header_text_${resultedData.org_id}`) ? resultedData['header_text'] : customName;
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