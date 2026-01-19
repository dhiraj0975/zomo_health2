import { CommonArrayService, DashboardWidgetsDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { TokenGuard } from '../../../guard';
import { CreateDashboardWidgetsInput } from "../../../input";
import { DashboardWidgetsService } from "./dashboardwidgets.service";
@Controller('themes/dashboard-widgets')
@UseGuards(TokenGuard)
export class DashboardWidgetsController {
    constructor(
        private readonly dashboardWidgetsService: DashboardWidgetsService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    /*
     * Function to get details of dashboard widgets
     * - org_id is mandatory params
     */
    @Post('get')
    async get(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { org_id: postData?.org_id, status: 1 };
            let dashboardWidgetsDetails = await this.dashboardWidgetsService.findOne(where);
            if (!dashboardWidgetsDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            dashboardWidgetsDetails = <any>(
                await this.commonArrayService.formatToDto(DashboardWidgetsDto, dashboardWidgetsDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: dashboardWidgetsDetails,
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
     * Use to set the details of dashboard widgets
     * - org_id is mandatory params
     */
    @Post('set')
    async set(@Req() req: Request, @Res() res: Response, @Body() postData: CreateDashboardWidgetsInput) {
        try {
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const dashboardWidgetsCheck = await this.dashboardWidgetsService.findOne({
                org_id: postData?.org_id, status: 1
            });
            if (dashboardWidgetsCheck) {
                for (const key in postData) {
                    if (postData[key] === '') {
                        delete postData[key];
                    }
                }
                await this.dashboardWidgetsService.update(
                    { id: dashboardWidgetsCheck.id },
                    {
                        ...postData,
                    },
                );
                this.activityLogService.create(dashboardWidgetsCheck, postData, tableConstant.THEMES.TBL_DASHBOARD_WIDGETS, req.tokenUser?.id);
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'success',
                });
            } else {
                await this.dashboardWidgetsService.save(postData);
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
