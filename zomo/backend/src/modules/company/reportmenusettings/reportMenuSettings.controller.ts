import { CommonArrayService, CommonService, CompanyReportMenuSettingsDto, tableConstant } from '@common-constants';
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
import { CreateCompanyReportMenuSettingsInput, PaginateWithCompanyInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { ReportMenuSettingsService } from "./reportMenuSettings.service";
@Controller('company/report-menu-settings')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class ReportMenuSettingsController {
    constructor(
        private readonly reportMenuSettingsService: ReportMenuSettingsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = 'reportMenuSettings.status != 0';
            if(postData?.company_id) {
                where += ` AND reportMenuSettings.org_id = '${postData?.company_id}' `;
            }
            if (postData?.search_str) {
                where += `AND(reportMenuSettings.datasettingreporttype LIKE '%${postData?.search_str}%' OR reportMenuSettings.datasettingmenu LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.reportMenuSettingsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CompanyReportMenuSettingsDto, resultedData['list'], req.lang)
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { org_id: postData?.org_id, status: 1 };
            let reportmenuSettingData = await this.reportMenuSettingsService.findOne(where);
                if (postData?.type && postData?.type == 'champion') {
                    let reportList = {
                        1: 'Activity Report',
                        2: 'Challenge Report',
                        3: 'Incentive Report',
                        4: 'Event Report'
                    }
                    let defaultReportMenuSettingList = {
                        'Incentive': {
                            'User_CODE': 'USER CODE',
                            'ORGANIZATION': 'ORGANIZATION',
                            'DEPARTMENT': 'DEPARTMENT',
                            'RELATIONSHIP_ID': 'RELATIONSHIP ID',
                            'USERNAME': 'USERNAME',
                            'FIRST_NAME': 'FIRST NAME',
                            'MIDDLE_NAME': 'MIDDLE NAME',
                            'LAST_NAME': 'LAST NAME',
                            'JOB_TITLE': 'JOB TITLE',
                            'EMPLOYEE_ID': 'EMPLOYEE ID',
                            'GENDER': 'GENDER',
                            'BIRTH_DATE': 'BIRTH DATE',
                            'DATE_OF_HIRE': 'DATE OF HIRE',
                            'ON_HEALTH_PLAN': 'ON HEALTH PLAN',
                            'HEALTH_PLAN_NAME': 'HEALTH PLAN NAME',
                            'EMAIL': 'EMAIL',
                            'WORK_PHONE_NUMBER': 'WORK PHONE NUMBER',
                            'WORK_PHONE_EXTENSION': 'WORK PHONE EXTENSION',
                            'LOCATION': 'LOCATION',
                            'WORK_ADDRESS1': 'WORK ADDRESS1',
                            'WORK_ADDRESS2': 'WORK ADDRESS2',
                            'WORK_CITY': 'WORK CITY',
                            'WORK_STATE/PROVINCE': 'WORK STATE/PROVINCE',
                            'WORK_ZIP/POSTAL_CODE': 'WORK ZIP/POSTAL CODE',
                            'WORK_COUNTRY': 'WORK COUNTRY',
                            'HOME_PHONE_NUMBER': 'HOME PHONE NUMBER',
                            'MOBILE_PHONE_NUMBER': 'MOBILE PHONE NUMBER',
                            'HOME_ADDRESS1': 'HOME ADDRESS1',
                            'HOME_ADDRESS2': 'HOME ADDRESS2',
                            'HOME_CITY': 'HOME CITY',
                            'HOME_STATE/PROVINCE': 'HOME STATE/PROVINCE',
                            'HOME_ZIP/POSTAL_CODE': 'HOME ZIP/POSTAL CODE',
                            'HOME_COUNTRY': 'HOME COUNTRY',
                            'USER_TYPE': 'USER TYPE'
                        },
                        'Event': {
                            'User_CODE': 'USER CODE',
                            'ORGANIZATION': 'ORGANIZATION',
                            'DEPARTMENT': 'DEPARTMENT',
                            'RELATIONSHIP_ID': 'RELATIONSHIP ID',
                            'USERNAME': 'USERNAME',
                            'FIRST_NAME': 'FIRST NAME',
                            'MIDDLE_NAME': 'MIDDLE NAME',
                            'LAST_NAME': 'LAST NAME',
                            'JOB_TITLE': 'JOB TITLE',
                            'GENDER': 'GENDER',
                            'BIRTH_DATE': 'BIRTH DATE',
                            'DATE_OF_HIRE': 'DATE OF HIRE',
                            'ON_HEALTH_PLAN': 'ON HEALTH PLAN',
                            'HEALTH_PLAN_NAME': 'HEALTH PLAN NAME',
                            'EMAIL': 'EMAIL',
                            'LOCATION': 'LOCATION',
                            'USER_TYPE': 'USER TYPE'
                        },
                        'Challenge': {
                            'User_CODE': 'USER CODE',
                            'ORGANIZATION': 'ORGANIZATION',
                            'DEPARTMENT': 'DEPARTMENT',
                            'RELATIONSHIP_ID': 'RELATIONSHIP ID',
                            'USERNAME': 'USERNAME',
                            'FIRST_NAME': 'FIRST NAME',
                            'MIDDLE_NAME': 'MIDDLE NAME',
                            'LAST_NAME': 'LAST NAME',
                            'JOB_TITLE': 'JOB TITLE',
                            'GENDER': 'GENDER',
                            'BIRTH_DATE': 'BIRTH DATE',
                            'DATE_OF_HIRE': 'DATE OF HIRE',
                            'ON_HEALTH_PLAN': 'ON HEALTH PLAN',
                            'HEALTH_PLAN_NAME': 'HEALTH PLAN NAME',
                            'EMAIL': 'EMAIL',
                            'LOCATION': 'LOCATION',
                            'USER_TYPE': 'USER TYPE'
                        },
                        'Activity': {
                            'User_CODE': 'USER CODE',
                            'ORGANIZATION': 'ORGANIZATION',
                            'DEPARTMENT': 'DEPARTMENT',
                            'RELATIONSHIP_ID': 'RELATIONSHIP ID',
                            'USERNAME': 'USERNAME',
                            'FIRST_NAME': 'FIRST NAME',
                            'MIDDLE_NAME': 'MIDDLE NAME',
                            'LAST_NAME': 'LAST NAME',
                            'JOB_TITLE': 'JOB TITLE',
                            'GENDER': 'GENDER',
                            'BIRTH_DATE': 'BIRTH DATE',
                            'DATE_OF_HIRE': 'DATE OF HIRE',
                            'ON_HEALTH_PLAN': 'ON HEALTH PLAN',
                            'HEALTH_PLAN_NAME': 'HEALTH PLAN NAME',
                            'EMAIL': 'EMAIL',
                            'LOCATION': 'LOCATION',
                            'USER_TYPE': 'USER TYPE'
                        }
                    }
                    let inceniveReportType = {
                        'DR': 'Engagement Master',
                        'QR': 'Incentive Qualification',
                        'OR': 'Achievable Opportunity List',
                        'NR': 'Non-Participant'
                    };
                    let result = {
                        ...reportmenuSettingData,
                        defaultreportList: reportList,
                        defaultReportMenuSettingList: JSON.stringify(defaultReportMenuSettingList),
                        defaultinceniveReportType: JSON.stringify(inceniveReportType)
                    };
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: result,
                        message: 'success',
                    });
                }
                else {
                    if (!reportmenuSettingData) {
                        return res.status(HttpStatus.OK).json({
                            statusCode: 200,
                            success: 1,
                            error: 0,
                            data: null,
                            message: 'success',
                        });
                    }
                }
            reportmenuSettingData = <any>(
                await this.commonArrayService.formatToDto(CompanyReportMenuSettingsDto, reportmenuSettingData, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: reportmenuSettingData,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCompanyReportMenuSettingsInput) {
        try {
            if (
                !postData?.org_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.reportMenuSettingsService.save(postData);
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
            const recordDetails = await this.reportMenuSettingsService.findOne(where);
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
            await this.reportMenuSettingsService.update(where,{status: 2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.COMPANIES.TBL_COMPANY_REPORT_MENU_SETTINGS, req.tokenUser?.id, 'delete');
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCompanyReportMenuSettingsInput) {
        try {
            if (
                !postData?.id && !postData?.org_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id } : { id: postData?.id}: { org_id: postData?.org_id};
            const recordDetails = await this.reportMenuSettingsService.findOne(where);
            if (!recordDetails) {
                postData.status = 1;
                await this.reportMenuSettingsService.save(
                    postData
                );
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'The Organization Report menu setting has been added successfully.',
                });
            }
            else if (recordDetails) {
                if (postData?.datasettingmenu) {
                    const newDatasettingmenu = typeof postData.datasettingmenu === 'string'
                        ? JSON.parse(postData.datasettingmenu)
                        : postData.datasettingmenu;
                    const oldDatasettingmenu = typeof recordDetails.datasettingmenu === 'string'
                        ? JSON.parse(recordDetails.datasettingmenu)
                        : recordDetails.datasettingmenu;
                    if (newDatasettingmenu && Object.keys(newDatasettingmenu).length > 0) {
                        Object.keys(newDatasettingmenu).forEach((key) => {
                            oldDatasettingmenu[key] = newDatasettingmenu[key];
                        });
                        postData.datasettingmenu = JSON.stringify(oldDatasettingmenu);
                    }
                }
                if (postData?.datasettingreporttype) {
                    postData.datasettingreporttype = (postData?.datasettingreporttype && typeof postData?.datasettingreporttype == 'object') ? JSON.stringify(postData?.datasettingreporttype) : postData?.datasettingreporttype;
                }
                postData.status = 1;
            }
            await this.reportMenuSettingsService.update(where, postData);
            this.activityLogService.create(recordDetails, postData, tableConstant.COMPANIES.TBL_COMPANY_REPORT_MENU_SETTINGS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'The Organization Report menu setting has been updated successfully.',
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
            let resultedData = await this.reportMenuSettingsService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CompanyReportMenuSettingsDto, resultedData, req.lang)
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