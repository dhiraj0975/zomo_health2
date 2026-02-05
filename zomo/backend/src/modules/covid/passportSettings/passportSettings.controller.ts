import { appConstant, CommonArrayService, CommonService, CovidPassportSettingsDto, tableConstant } from '@common-constants';
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
import { Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateCovidPassportSettingsInput, PaginateCovidPassportInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { PassportSettingsService } from "./passportSettings.service";
@Controller('covid/passport-settings')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class PassportSettingsController {
    constructor(
        private readonly passportSettingsService: PassportSettingsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateCovidPassportInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `passportSettings.status != 2`;
            if (postData?.approval_status) {
                where += `AND passportSettings.approval_status = '${postData?.approval_status}`;
            }
            if (postData?.org_id) {
                where += `AND passportSettings.org_id = '${postData?.org_id}`;
            }
            if (postData?.created_by) {
                where += `AND passportSettings.created_by = '${postData?.created_by}`;
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'passportSettings.description');
            }
            const resultedData = await this.passportSettingsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CovidPassportSettingsDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.description){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `settings_description_${ele['org_id']}`, `/LC_MESSAGES/Trackers/CovidPassport/${req.tokenUser?.org_id}`,`dynamic`);
                        if (customName != `settings_description_${ele['org_id']}`) {
                            ele.description = customName;
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.id && !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) {
                const where = postData?.id ? { id: postData?.id, status: Not(2) } : { org_id: postData?.org_id, status: Not(2) };
                let settingDetails = await this.passportSettingsService.findOne(where);
                if (!settingDetails) {
                    let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
                }
                settingDetails = <any>(
                    await this.commonArrayService.formatToDto(CovidPassportSettingsDto, settingDetails, req.lang)
                );
                if(settingDetails.description){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `settings_description_${settingDetails['org_id']}`, `/LC_MESSAGES/Trackers/CovidPassport/${req.tokenUser?.org_id}`,`dynamic`);
                        if (customName != `settings_description_${settingDetails['org_id']}`) {
                            settingDetails.description = customName;
                        }
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: settingDetails,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCovidPassportSettingsInput) {
        try {
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) {
                let recordDetails: any = await this.passportSettingsService.findOne({ org_id: postData?.org_id, status: Not(2) });
                if (!recordDetails) {
                    recordDetails = await this.passportSettingsService.save(postData);
                }
                if(postData?.description){
                    let title = `settings_description_${postData?.org_id}`
                    let dynamicData= { [`${title}`]: postData?.description};
                    await this.translatorService.DynamicEngJsonData('Trackers',postData?.org_id,dynamicData,'Edit','CovidPassport') 
                }
                return res.status(HttpStatus.CREATED).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, 'Covid passport setting added successfully')
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
            const where = { id: postData?.id, status: Not(2) };
            const recordDetails = await this.passportSettingsService.findOne(where);
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
            await this.passportSettingsService.update(where,{status:2});
            this.activityLogService.create(recordDetails, { description: recordDetails }, tableConstant.COVID.COVID_PASSPORT_SETTINGS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Covid passport setting deleted successfully'),
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCovidPassportSettingsInput) {
        try {
            if (!postData?.id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) {
                const where = { id: postData?.id, status: Not(2) };
                const recordDetails = await this.passportSettingsService.findOne(where);
                if (!recordDetails) {
                    await this.passportSettingsService.save({
                        ...postData,
                    });
                }
                await this.passportSettingsService.update(where, postData);
                this.activityLogService.create(recordDetails, postData, tableConstant.COVID.COVID_PASSPORT_SETTINGS, req.tokenUser?.id);
                if(postData?.description){
                    let title = `settings_description_${postData?.org_id}`
                    let dynamicData= { [`${title}`]: postData?.description};
                    await this.translatorService.DynamicEngJsonData('Trackers',postData?.org_id,dynamicData,'Edit','CovidPassport') 
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, 'Covid password setting updated successfully'),
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
            const where = { status: Not(2)};
            let resultedData: any = await this.passportSettingsService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CovidPassportSettingsDto, resultedData, req.lang)
            );
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.description){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `settings_description_${ele['org_id']}`, `/LC_MESSAGES/Trackers/CovidPassport/${req.tokenUser?.org_id}`,`dynamic`);
                        if (customName != `settings_description_${ele['org_id']}`) {
                            ele.description = customName;
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
}