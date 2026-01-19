import { CommonArrayService, OrgThemesDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Req,
    Res,
    UseGuards
} from "@nestjs/common";
import { Request, Response } from "express";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { TokenGuard } from '../../../guard';
import { CreateOrgThemeInput } from "../../../input";
import { OrgThemesService } from "./orgthemes.service";
@Controller('themes/org-theme')
@UseGuards(TokenGuard)
export class OrgThemesController {
    constructor(
        private readonly orgThemesService: OrgThemesService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    /*
     * Function to get details of org theme
     * - org_id is mandatory params
     */
    @Post('get')
    async get(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { org_id: postData?.org_id, status: 1 };
            let orgThemeDetails = await this.orgThemesService.findOne(where);
            if (!orgThemeDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            orgThemeDetails = <any>(
                await this.commonArrayService.formatToDto(OrgThemesDto, orgThemeDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: orgThemeDetails,
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
    /*
     * Use to set the details of org theme
     * - org_id is mandatory params
     */
    @Post('set')
    async set(@Req() req: Request, @Res() res: Response, @Body() postData: CreateOrgThemeInput) {
        try {
            if (
                !postData?.org_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const coreThemeCheck = await this.orgThemesService.findOne({
                org_id: postData?.org_id, status: 1
            });
            if (coreThemeCheck) {
                for (const key in postData) {
                    if (postData[key] === '') {
                        delete postData[key];
                    }
                }
                await this.orgThemesService.update(
                    { id: coreThemeCheck.id },
                    {
                        ...postData,
                    },
                );
                this.activityLogService.create(coreThemeCheck, postData, tableConstant.THEMES.TBL_SETTINGS, req.tokenUser?.id);
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'success',
                });
            } else {
                await this.orgThemesService.save(postData);
                return res.status(HttpStatus.CREATED).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'success',
                });
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
