import { appConstant, CommonArrayService, CommonDateService, CommonService, CompanyNumberOfLiveReportsDto, CompanySupportDto } from '@common-constants';
import { Body, Controller, HttpException, HttpStatus, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Request, Response } from "express";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { PaginateWithCompanyInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { SupportService } from '../support/support.service';
import { CompanyNumberOfLiveReportsService } from './numberOfLiveReport.service';
import { ListNumberOfLiveReportInput } from './input/listnumberoflivereport.input';
import { Like } from 'typeorm';
@Controller('company/number-of-live-report')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class CompanyNumberOfLiveReportController {
    constructor(
        private readonly supportService: SupportService,
        private readonly companyNumberOfLiveReportsService: CompanyNumberOfLiveReportsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly commonDateService: CommonDateService,
    ) {
    }
    /**
     * Paginate API for all number of live reports with pagination
     */
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            let user = Object.create(req?.tokenUser) || {};
            if (![appConstant.ROLE.ADMIN].includes(user?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            postData = this.commonService.sanitizePayload(postData);
            let where = "numberOfLiveReports.id != ''";
            if (postData?.request_date) {
                let date = this.commonDateService.DateTimeFormat(postData?.request_date, "YYYY-MM-DD", "DD-MM-YYYY")
                where += ` AND DATE_FORMAT(numberOfLiveReports.report_date,"%Y-%m-%d") = '${date}' `;
            }
            const resultedData = await this.companyNumberOfLiveReportsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CompanyNumberOfLiveReportsDto, resultedData['list'], req.lang)
            );
            // File url correction is remaining.
            await Promise.all(
                resultedData['list'].map(async (ele) => {
                    ele.date = ele.created_copy
                        ? this.commonDateService.DateTimeFormat(
                            ele.created_copy,
                            "MMM DD, YYYY hh:mm A",
                            "YYYY-MM-DD HH:mm:ss"
                        )
                        : '';
                })
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
    /**
     * List API for all number of live reports.
     */
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListNumberOfLiveReportInput) {
        try {
            let user = Object.create(req?.tokenUser) || {};
            if (![appConstant.ROLE.ADMIN].includes(user?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            let resultedData = Object.create(null);
            const where = { status: 2 };
            if (postData?.flage) {
                where['flage'] = postData?.flage;
            }
            if (postData?.report_date) {
                let date = this.commonDateService.DateTimeFormat(postData?.report_date, "YYYY-MM-DD", "DD-MM-YYYY");
                where['report_date'] = Like(`%${date}%`);
            }
            resultedData = await this.supportService.listRecord(where, { id: 'DESC' });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CompanySupportDto, resultedData, req.lang)
            );
             // File url correction is remaining.
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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