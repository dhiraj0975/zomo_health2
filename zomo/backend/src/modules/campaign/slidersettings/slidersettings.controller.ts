import { appConstant, CommonArrayService, CompaniesDto, SliderSettingsDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Put, Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ClientManagerAssignService } from "src/modules/company/clientmanagerassign/clientmanagerassign.service";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { Not } from "typeorm";
import { AccessGuard, TokenGuard } from '../../../guard';
import { PaginateWithCampaignInput } from '../input';
import { CreateSliderSettingsInput } from './input';
import { SliderSettingsService } from "./slidersettings.service";
@Controller('campaign/slider-settings')
@UseGuards(TokenGuard, AccessGuard)
export class SliderSettingsController {
    constructor(
        private readonly sliderSettingsService: SliderSettingsService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly clientManagerAssignService: ClientManagerAssignService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCampaignInput) {
        try {
            let where = (req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER) ? `slidersettings.status != 2 ` : `slidersettings.status = 1 `;
            if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id,status: 1},null);
                if(resultedData.length > 0){
                    let orgIds = resultedData.map((e)=>e.org_id).join(',');
                    if (orgIds) {
                        where += `AND company.id IN(${orgIds.split(',')})`;
                    }
                }else{
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: {
                            list: [],
                            limit: postData?.limit,
                            page: postData?.page,
                            pages: 0,
                            total: 0
                        },
                        message: 'success',
                    });
                }
            }
            where += ` AND company.deleted = 0 AND company.status = 1`;
            if (postData?.search_str) {
                where += ` AND company.company_name LIKE '%${postData?.search_str}%'`;
            }
            const resultedData = await this.sliderSettingsService.paginateList(     
                where,
                postData,
                ['company.id', 'company.company_name', 'slidersettings.id', 'slidersettings.org_id', 'slidersettings.hide', 'slidersettings.activity_page_tab', 'slidersettings.dashboard_tab', 'slidersettings.status']
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CompaniesDto, resultedData['list'], req.lang)
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
            let user = req?.tokenUser;
            let roleId = user?.role_id;
            if(roleId == appConstant.ROLE.ORGADMIN){
                if (!postData?.org_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }else{
                if (!postData?.id && !postData?.org_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            const where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id, status: Not(2) } : { id: postData?.id, status: Not(2)}: { org_id: postData?.org_id, status: Not(2)};
            let sliderSettingsDetails = await this.sliderSettingsService.findOne(where);
            if (!sliderSettingsDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            sliderSettingsDetails = <any>(
                await this.commonArrayService.formatToDto(SliderSettingsDto, sliderSettingsDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: sliderSettingsDetails,
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
    async list(@Req() req:any, @Res() res: Response, @Body() postData: any){
        try {
            let where: any = { status: 1 };
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let result = await this.sliderSettingsService.listRecord(where, { [orderBy]: order });
            result = <any>(
                await this.commonArrayService.formatToDto(SliderSettingsDto, result, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateSliderSettingsInput) {
        try {
            let user = req?.tokenUser;
            let roleId = user?.role_id;
            if(roleId == appConstant.ROLE.ORGADMIN){
                if (!postData?.org_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }else{
                if (
                    !postData?.org_id || !postData?.activity_page_tab || !postData?.dashboard_tab
                ) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            const campaignPlanCheck = await this.sliderSettingsService.findOne({
                org_id: postData?.org_id,
                status: 1
            });
            if (campaignPlanCheck) {
                throw Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_CAMPAIGN_SLIDER_SETTINGS_EXIST"));
            }
            await this.sliderSettingsService.save(postData);
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Point_slider_settings_saved_successfully', `/LC_MESSAGES/Campaign/Campaigns`,`static`)+'.',
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateSliderSettingsInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id, status: Not(2) };
            const recordDetails = await this.sliderSettingsService.findOne(where);
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
            await this.sliderSettingsService.update(
                { id: postData?.id },
                {
                    ...postData,
                },
            );
            this.activityLogService.create(recordDetails, postData, tableConstant.CAMPAIGN.TBL_IN_SLIDER_SETTINGS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Point_slider_settings_saved_successfully', `/LC_MESSAGES/Campaign/Campaigns`,`static`)+'.',
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
            const where = { id: postData?.id, status: Not(2) };
            let sliderSettingsDetails = await this.sliderSettingsService.findOne(where);
            if (!sliderSettingsDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            await this.sliderSettingsService.update(
                { id: postData?.id },
                {
                    status: 2
                },
            );
            this.activityLogService.create(sliderSettingsDetails, {status: 2}, tableConstant.CAMPAIGN.TBL_IN_SLIDER_SETTINGS, req.tokenUser?.id, 'delete');
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
}
