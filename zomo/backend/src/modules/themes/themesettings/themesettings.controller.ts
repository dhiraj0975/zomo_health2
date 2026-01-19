import { appConstant, CommonArrayService, CommonService, tableConstant, ThemeSettingsDto } from '@common-constants';
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
} from "@nestjs/common";
import { Request, Response } from "express";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { In } from "typeorm";
import { TokenGuard } from '../../../guard';
import { CreateThemeSettingsInput, PaginateInput } from "../../../input";
import { ThemeSettingsService } from "./themesettings.service";
@Controller('themes/theme-settings')
@UseGuards(TokenGuard)
export class ThemeSettingsController {
    constructor(
        private readonly themeSettingsService: ThemeSettingsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `themes.status !=0 `;
            if(postData?.org_id){
                where += `AND themes.org_id = ${postData?.org_id}`
            }
            if (postData?.search_str) {
                where += `AND(themes.header_color LIKE '%${postData?.search_str}%' OR themes.link_color LIKE '%${postData?.search_str}%' OR themes.icons_color LIKE '%${postData?.search_str}%' OR themes.button_color LIKE '%${postData?.search_str}%' OR themes.progress_color LIKE '%${postData?.search_str}%' OR themes.progress_hra_low_color LIKE '%${postData?.search_str}%' OR themes.progress_hra_mod_color LIKE '%${postData?.search_str}%' OR themes.progress_hra_high_color LIKE '%${postData?.search_str}%' OR themes.progress_hra_very_high_color LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.themeSettingsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(ThemeSettingsDto, resultedData['list'], req.lang)
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
            if (!postData?.id && !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if( appConstant.ROLE.WCH == req.tokenUser?.role_id) {
                if (!postData?.reference_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let where = {};
            if( appConstant.ROLE.WCH == req.tokenUser?.role_id) {
                where = {
                    org_id: In([parseInt(postData?.org_id),0]),
                    reference_id: In([parseInt(postData?.reference_id),0]),
                    status: 1,
                };
            }else{
                where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: In([parseInt(postData?.org_id),0]) } : { id: postData?.id}: { org_id: In([parseInt(postData?.org_id),0])};
            }
             
            let biometricDetails: any = await this.themeSettingsService.findOne(where);
            if (biometricDetails && biometricDetails['org_id'] == 0) {
                biometricDetails['org_id'] = postData?.org_id;
                delete biometricDetails['id'];
                biometricDetails = await this.themeSettingsService.save(biometricDetails);
            }
            biometricDetails = <any>(
                await this.commonArrayService.formatToDto(ThemeSettingsDto, biometricDetails, req.lang)
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateThemeSettingsInput) {
        try {
            if (
                !postData?.org_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if( appConstant.ROLE.WCH == req.tokenUser?.role_id) {
                if (!postData?.reference_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            await this.themeSettingsService.save(postData);
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Enjoy! Your new theme has been applied.',
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
            if (appConstant.ROLE.WCH == req.tokenUser?.role_id) {
                if (!postData?.reference_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            } else {
                if (!postData?.id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let where = Object.create(null);
            if( appConstant.ROLE.WCH == req.tokenUser?.role_id) {
                where = {reference_id: postData?.reference_id}
            }else{
                where = {id: postData?.id}
            }
            const recordDetails = await this.themeSettingsService.findOne(where);
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
            await this.themeSettingsService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.THEMES.TBL_THEMES_SETTINGS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Enjoy! Your new theme has been removed.',
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateThemeSettingsInput) {
        try {
            if (
                !postData?.id && !postData?.org_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if (appConstant.ROLE.WCH == req.tokenUser?.role_id) {
                if (!postData?.reference_id || !postData?.org_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                const where = {
                    reference_id: postData?.reference_id,
                    org_id: postData?.org_id
                };
                const recordDetails = await this.themeSettingsService.findOne(where);
                if (!recordDetails) {
                    await this.themeSettingsService.save(postData);
                    return res.status(HttpStatus.CREATED).json({
                        statusCode: 201,
                        success: 1,
                        error: 0,
                        data: null,
                        message: 'Enjoy! Your new theme has been applied.',
                    });
                }
                else {
                    await this.themeSettingsService.update({ id: recordDetails.id }, postData);
                    this.activityLogService.create(recordDetails, postData, tableConstant.THEMES.TBL_THEMES_SETTINGS, req.tokenUser?.id);
                }
                let message = 'Enjoy! Your new theme has been applied.';
                if ((postData?.enable_theme_mode != undefined || postData?.enable_theme_mode != null) && postData?.enable_theme_mode == 0) {
                    message = 'Toggle button hidden successfully.';
                }
                if ((postData?.enable_theme_mode != undefined || postData?.enable_theme_mode != null) && postData?.enable_theme_mode == 1) {
                    message = 'Toggle button shown successfully.';
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: message,
                });
            }
            const where = postData?.id ? postData?.org_id ? {
                id: postData?.id,
                org_id: postData?.org_id
            } : {id: postData?.id , reference_id: 0} : {org_id: postData?.org_id , reference_id : 0};
            const recordDetails = await this.themeSettingsService.findOne(where);
            if (!recordDetails) {
                await this.themeSettingsService.save(postData);
            }
            else{
                await this.themeSettingsService.update({id: recordDetails.id}, postData);
                this.activityLogService.create(recordDetails, postData, tableConstant.THEMES.TBL_THEMES_SETTINGS, req.tokenUser?.id);
            }
            let message = 'Enjoy! Your new theme has been applied.';
            if((postData?.enable_theme_mode != undefined || postData?.enable_theme_mode != null) && postData?.enable_theme_mode == 0){
                message = 'Toggle button hidden successfully.';
            }
            if((postData?.enable_theme_mode != undefined || postData?.enable_theme_mode != null) && postData?.enable_theme_mode == 1){
                message = 'Toggle button shown successfully.';
            }
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
            const where = { };
            let resultedData = await this.themeSettingsService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(ThemeSettingsDto, resultedData, req.lang)
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
}
