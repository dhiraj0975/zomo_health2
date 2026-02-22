import { AccessGuard, RoleGuard, TokenGuard } from '@/guard';
import { BillboardReportInput } from "@/modules/report/input/billboard-report.input";
import { appConstant, CommonDateService, CommonService, CronStatus, System_Type, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Req,
    Res,
    UseGuards
} from "@nestjs/common";
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from "express";
import { lastValueFrom } from 'rxjs';
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { In, Not } from 'typeorm';
import { IncentiveReportsService } from '../campaign/incentivereports/incentivereports.service';
import { ActivePluginService } from '../company/activeplugins/activeplugin.service';
import { CompanyService } from '../company/companies/company.service';
import {
    BiometricResultReportInput,
    EhaDetailReportInput,
    engagementComparisonReportInput,
    HraDetailReportInput
} from "./input";
import { ActivityReportInput } from './input/actitvityreport.input';
import { ChallengeReportInput } from './input/chellengereport.input';
import { CovidReportInput } from './input/covidreport.input';
import { EventReportInput } from './input/eventreport.input';
import { EwbReportInput } from './input/ewbreport.input';
import { FodReportInput } from './input/fodreport.input';
import { HealthCheckupReportInput } from './input/healthcheckupreport.input';
import { QuickLinkReportInput } from './input/quicklinkreport.input';
import { QuizReportInput } from './input/quizreport.input';
import { ReimbursementReportInput } from './input/reimbursementreport.input';
import { SurveyReportInput } from './input/surveyreport.input';
@Controller('report')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class ReportController {
    constructor(
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly commonService: CommonService,
        @Inject('CRON_SERVICE') private cronMicroservice: ClientProxy,
        private readonly incentiveReportsService: IncentiveReportsService,
        private readonly companyService : CompanyService,
        private readonly activePluginService: ActivePluginService,
        private readonly commonDateService: CommonDateService,
    ) { }

    @Post('event-report')
    async eventReport(@Req() req: Request, @Res() res: Response, @Body() postData: EventReportInput) {
        try {
            let user = JSON.parse(JSON.stringify(req.tokenUser));
            if (![appConstant.ROLE.ADMIN,appConstant.ROLE.ORGADMIN,appConstant.ROLE.COACH,appConstant.ROLE.GLOBALCOACH,appConstant.ROLE.WCH,appConstant.ROLE.BROKER,appConstant.ROLE.BROKERADMIN,appConstant.ROLE.REGIONALADMIN].includes(user?.role_id)) { 
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            postData['user'] = user;
            let data = await lastValueFrom(this.cronMicroservice.send({ cmd: 'report' }, { data: postData, table_name: tableConstant.EVENTS.TBL_RE_EVENT_REPORTS }));
            if (typeof data === 'object' && data?.success === 0 && data?.error === 1 && data?.message) {
                throw new Error(data?.message);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data,
                message: await this.translatorService.frontendReadTranslation(req.lang, postData?.result_type == 2 ? 'Report Generated' : 'success'),
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

    /**
     * API for Challenge Report
    */
    @Post('Challenge-report')
    async challengeReport(@Req() req: Request, @Res() res: Response, @Body() postData: ChallengeReportInput) {
        try {
            let user = Object.create(req?.tokenUser) || {};
            if (![appConstant.ROLE.ADMIN, appConstant.ROLE.ORGADMIN, appConstant.ROLE.COACH, appConstant.ROLE.GLOBALCOACH, appConstant.ROLE.WCH, appConstant.ROLE.BROKER, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(user?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!this.commonService.isValidNumber(postData?.auto_request)) {
                if (!postData?.org_id || !postData?.schedule_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
            } else {
                if (!this.commonService.isValidNumber(postData?.auto_request)) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            postData.flag = user?.role_id == appConstant.ROLE.ADMIN ? 1 : 0
            postData.type = 'challenge';
            let sendData = {
                ...postData, userDetails: {id: user?.id, role_id: user?.role_id}
            }
            if( postData?.auto_request == 1){
                delete sendData?.userDetails;
            }
            let data = await lastValueFrom(this.cronMicroservice.send({ cmd: 'report' }, { data: sendData, table_name: tableConstant.CAMPAIGN.TBL_IN_INCENTIVE_REPORTS }));
            if ((typeof data === 'string') && data === 'Report Successfully created.') {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: 'Report Successfully created.',
                    message: 'success',
                });
            } else if (typeof data === 'object' && data?.success === 0 && data?.error === 1 && data?.message) {
                throw new Error(data?.message);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data || [],
                message: await this.translatorService.frontendReadTranslation(req.lang, postData?.result_type == 2 ? 'Report Generated' : 'success'),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
    /**
     * API for Covid 19 Report
    */
    @Post('covid-report')
    async covidReport(@Req() req: Request, @Res() res: Response, @Body() postData: CovidReportInput) {
        try {
            let user = Object.create(req?.tokenUser) || {};
            if (![appConstant.ROLE.ADMIN, appConstant.ROLE.ORGADMIN, appConstant.ROLE.COACH, appConstant.ROLE.GLOBALCOACH, appConstant.ROLE.WCH, appConstant.ROLE.BROKER, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(user?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!this.commonService.isValidNumber(postData?.auto_request)) {
                if (!this.commonService.isValidNumber(postData?.result_type) || !this.commonService.isValidNumber(postData?.rtype)
                    || !this.commonService.isValidNumber(postData?.vaccinated) || !this.commonService.isValidNumber(postData?.eligibletowork)
                    || !this.commonService.isValidNumber(postData?.show_terminated_users) || !postData?.org_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            } else {
                if (!this.commonService.isValidNumber(postData?.auto_request)) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let sendData = {
                ...postData, userDetails: {id: user?.id, org_id: user?.org_id, role_id: user?.role_id, membership_code: user?.membership_code}
            }
            if( postData?.auto_request == 1){
                delete sendData?.userDetails;
            }
            let data = await lastValueFrom(this.cronMicroservice.send({ cmd: 'report' }, { data: sendData, table_name: tableConstant.COVID.RE_COVID_REPORT }));
            if ((typeof data === 'string') && data === 'Report Successfully created.') {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: 'Report Successfully created.',
                    message: 'success',
                });
            } else if (typeof data === 'object' && data?.success === 0 && data?.error === 1 && data?.message) {
                throw new Error(data?.message);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data || [],
                message: await this.translatorService.frontendReadTranslation(req.lang, postData?.result_type == 2 ? 'Report Generated' : 'success'),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
    /**
     * API for Quick link Report
    */
    @Post('quicklink-report')
    async quickReport(@Req() req: Request, @Res() res: Response, @Body() postData: QuickLinkReportInput) {
        try {
            let user = Object.create(req?.tokenUser) || {};
            if (![appConstant.ROLE.ADMIN, appConstant.ROLE.ORGADMIN, appConstant.ROLE.COACH, appConstant.ROLE.GLOBALCOACH, appConstant.ROLE.WCH, appConstant.ROLE.BROKER, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(user?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if(!this.commonService.isValidNumber(postData?.auto_request)){
                if( !this.commonService.isValidNumber(postData?.result_type) || !this.commonService.isValidNumber(postData?.show_terminated_users) || !postData?.org_id){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }else{
                if(!this.commonService.isValidNumber(postData?.auto_request)){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let sendData = {
                ...postData, userDetails: { id: user?.id, org_id: user?.org_id, role_id: user?.role_id, membership_code: user?.membership_code }
            }
            if (postData?.auto_request == 1) {
                delete sendData?.userDetails;
            }
            let data = await lastValueFrom(this.cronMicroservice.send({ cmd: 'report' }, { data: sendData, table_name: tableConstant.QUICK_LINK.TBL_RE_QUICK_LINK_REPORT }));
            if ((typeof data === 'string') && data === 'Report Successfully created.') {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: 'Report Successfully created.',
                    message: 'success',
                });
            } else if (typeof data === 'object' && data?.success === 0 && data?.error === 1 && data?.message) {
                throw new Error(data?.message);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data || [],
                message: await this.translatorService.frontendReadTranslation(req.lang, postData?.result_type == 2 ? 'Report Generated' : 'success'),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
    /**
     * API for fod Report.(Fitness video report)
    */
    @Post('fod-report')
    async fodReport(@Req() req: Request, @Res() res: Response, @Body() postData: FodReportInput) {
        try {
            let user = Object.create(req?.tokenUser) || {};
            if (![appConstant.ROLE.ADMIN, appConstant.ROLE.ORGADMIN, appConstant.ROLE.COACH, appConstant.ROLE.GLOBALCOACH, appConstant.ROLE.WCH, appConstant.ROLE.BROKER, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(user?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if(!this.commonService.isValidNumber(postData?.auto_request)){
                if( !this.commonService.isValidNumber(postData?.result_type) || !this.commonService.isValidNumber(postData?.show_terminated_users) || !postData?.org_id){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }else{
                if( !this.commonService.isValidNumber(postData?.auto_request)){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let sendData = {
                ...postData, userDetails: { id: user?.id, org_id: user?.org_id, role_id: user?.role_id, membership_code: user?.membership_code }
            }
            if (postData?.auto_request == 1) {
                delete sendData?.userDetails;
            }
            let data = await lastValueFrom(this.cronMicroservice.send({ cmd: 'report' }, { data: sendData, table_name: tableConstant.MEDIA_FITNESS.TBL_RE_FITNESS_VIDEO_POST }));
            if ((typeof data === 'string') && data === 'Report Successfully created.') {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: 'Report Successfully created.',
                    message: 'success',
                });
            } else if (typeof data === 'object' && data?.success === 0 && data?.error === 1 && data?.message) {
                throw new Error(data?.message);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data || [],
                message: await this.translatorService.frontendReadTranslation(req.lang, postData?.result_type == 2 ? 'Report Generated' : 'success'),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
    /**
     * API for ewb Report.(Emotional wellbeing report)
    */
    @Post('ewb-report')
    async ewbReport(@Req() req: Request, @Res() res: Response, @Body() postData: EwbReportInput) {
        try {
            let user = Object.create(req?.tokenUser) || {};
            if (![appConstant.ROLE.ADMIN, appConstant.ROLE.ORGADMIN, appConstant.ROLE.COACH, appConstant.ROLE.GLOBALCOACH, appConstant.ROLE.WCH, appConstant.ROLE.BROKER, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(user?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
             if(!this.commonService.isValidNumber(postData?.auto_request)){
                if( !this.commonService.isValidNumber(postData?.result_type) || !this.commonService.isValidNumber(postData?.show_terminated_users) || !postData?.org_id){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }else{
                if( !this.commonService.isValidNumber(postData?.auto_request)){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let sendData = {
                ...postData, userDetails: { id: user?.id, org_id: user?.org_id, role_id: user?.role_id, membership_code: user?.membership_code }
            }
            if (postData?.auto_request == 1) {
                delete sendData?.userDetails;
            }
            let data = await lastValueFrom(this.cronMicroservice.send({ cmd: 'report' }, { data: sendData, table_name: tableConstant.EMOTIONAL_WELLBEING.TBL_RE_EMOTIONALWELLBEING_REPORT }));
            if ((typeof data === 'string') && data === 'Report Successfully created.') {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: 'Report Successfully created.',
                    message: 'success',
                });
            } else if (typeof data === 'object' && data?.success === 0 && data?.error === 1 && data?.message) {
                throw new Error(data?.message);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data || [],
                message: await this.translatorService.frontendReadTranslation(req.lang, postData?.result_type == 2 ? 'Report Generated' : 'success'),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
    /**
     * API for Reimbursement Report.(Reimbursement Report report)
    */
    @Post('reimbursement-report')
    async reimbursementReport(@Req() req: Request, @Res() res: Response, @Body() postData: ReimbursementReportInput) {
        try {
            let user = Object.create(req?.tokenUser) || {};
            if (![appConstant.ROLE.ADMIN, appConstant.ROLE.ORGADMIN, appConstant.ROLE.COACH, appConstant.ROLE.GLOBALCOACH, appConstant.ROLE.WCH, appConstant.ROLE.BROKER, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(user?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!this.commonService.isValidNumber(postData?.auto_request)) {
                if (!this.commonService.isValidNumber(postData?.result_type) || !this.commonService.isValidNumber(postData?.form_id) || !this.commonService.isValidNumber(postData?.activity_id) || !postData?.org_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            } else {
                if (!this.commonService.isValidNumber(postData?.auto_request)) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let sendData = {
                ...postData, userDetails: { id: user?.id, org_id: user?.org_id, role_id: user?.role_id, membership_code: user?.membership_code }
            }
            if (postData?.auto_request == 1) {
                delete sendData?.userDetails;
            }
            let data = await lastValueFrom(this.cronMicroservice.send({ cmd: 'report' }, { data: sendData, table_name: tableConstant.REIMBURSEMENT.TBL_RE_REIMBURSEMENT_REPORT }));
            if ((typeof data === 'string') && data === 'Report Successfully created.') {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: 'Report Successfully created.',
                    message: 'success',
                });
            } else if (typeof data === 'object' && data?.success === 0 && data?.error === 1 && data?.message) {
                throw new Error(data?.message);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data || [],
                message: await this.translatorService.frontendReadTranslation(req.lang, postData?.result_type == 2 ? 'Report Generated' : 'success'),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
    /**
     * API for Activity Report.(Activity Report report)
    */
    @Post('activity-report')
    async activityReport(@Req() req: Request, @Res() res: Response, @Body() postData: ActivityReportInput) {
        try {
            let user = Object.create(req?.tokenUser) || {};
            if (![appConstant.ROLE.ADMIN, appConstant.ROLE.ORGADMIN, appConstant.ROLE.COACH, appConstant.ROLE.GLOBALCOACH, appConstant.ROLE.WCH, appConstant.ROLE.BROKER, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(user?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!this.commonService.isValidNumber(postData?.auto_request)) {
                if (!this.commonService.isValidNumber(postData?.show_terminated_users) || !postData?.start_date || !postData?.end_date || !postData?.org_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            } else {
                if (!this.commonService.isValidNumber(postData?.auto_request)) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            if (postData?.type && postData?.type == 'superadmin') {
                if (!postData?.org_id || !postData?.membership_code) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let sendData = {
                ...postData, userDetails: { id: user?.id, org_id: user?.org_id, role_id: user?.role_id, membership_code: user?.membership_code }
            }
            if (postData?.auto_request == 1) {
                delete sendData?.userDetails;
            }
            let data = await lastValueFrom(this.cronMicroservice.send({ cmd: 'report' }, { data: sendData, table_name: tableConstant.TRACKERS.TBL_RE_ACTIVITY_REPORT }));
            if ((typeof data === 'string') && data === 'Report Successfully created.') {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: 'Report Successfully created.',
                    message: 'success',
                });
            } else if (typeof data === 'object' && data?.success === 0 && data?.error === 1 && data?.message) {
                throw new Error(data?.message);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data || [],
                message: await this.translatorService.frontendReadTranslation(req.lang, postData?.result_type == 2 ? 'Report Generated' : 'success'),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
    /**
     * API for Survey Report.(Survey Report report)
    */
    @Post('survey-report')
    async surveyReport(@Req() req: Request, @Res() res: Response, @Body() postData: SurveyReportInput) {
        try {
            let user = Object.create(req?.tokenUser) || {};
            if (![appConstant.ROLE.ADMIN, appConstant.ROLE.ORGADMIN, appConstant.ROLE.COACH, appConstant.ROLE.GLOBALCOACH, appConstant.ROLE.WCH, appConstant.ROLE.BROKER, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(user?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!this.commonService.isValidNumber(postData?.auto_request)) {
                if (!this.commonService.isValidNumber(postData?.result_type) || !this.commonService.isValidNumber(postData?.rtype)
                    || !this.commonService.isValidNumber(postData?.show_terminated_users) || !postData?.org_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            } else {
                if ( !this.commonService.isValidNumber(postData?.auto_request)) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            if(postData?.type && postData?.type == 'superadmin'){
                if(!postData?.org_id || !postData?.membership_code){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let sendData = {
                ...postData, userDetails: { id: user?.id, org_id: user?.org_id, role_id: user?.role_id, membership_code: user?.membership_code }
            }
            if (postData?.auto_request == 1) {
                delete sendData?.userDetails;
            }
            let data = await lastValueFrom(this.cronMicroservice.send({ cmd: 'report' }, { data: sendData, table_name: tableConstant.SURVEY.TBL_RE_SURVEY }));
            if ((typeof data === 'string') && data === 'Report Successfully created.') {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: 'Report Successfully created.',
                    message: 'success',
                });
            } else if (typeof data === 'object' && data?.success === 0 && data?.error === 1 && data?.message) {
                throw new Error(data?.message);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data || [],
                message: await this.translatorService.frontendReadTranslation(req.lang, postData?.result_type == 2 ? 'Report Generated' : 'success'),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
    /**
     * API for Organization Census Details Report.(Organization Census Details Report)
    */
    @Post('organization-census-report')
    async organizationCensusReport(@Req() req: Request, @Res() res: Response) {
        try {
            let user = Object.create(req?.tokenUser) || {};
            if (![appConstant.ROLE.ADMIN].includes(user?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            let data = await lastValueFrom(this.cronMicroservice.send({ cmd: 'report' }, { data: {}, table_name: tableConstant.COMPANIES.TBL_COMPANY_NUMBER_OF_LIVE_REPORTS }));
            if ((typeof data === 'string') && data === 'Report Successfully created.') {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: 'Report Successfully created.',
                    message: 'success',
                });
            } else if (typeof data === 'object' && data?.success === 0 && data?.error === 1 && data?.message) {
                throw new Error(data?.message);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data || [],
                message: 'Report Generated',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
    /**
     * API for Quiz Report.(Quiz Report report)
    */
    @Post('quiz-report')
    async quizReport(@Req() req: Request, @Res() res: Response, @Body() postData: QuizReportInput) {
        try {
            let user = Object.create(req?.tokenUser) || {};
            if (![appConstant.ROLE.ADMIN, appConstant.ROLE.ORGADMIN, appConstant.ROLE.COACH, appConstant.ROLE.GLOBALCOACH, appConstant.ROLE.WCH, appConstant.ROLE.BROKER, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(user?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!this.commonService.isValidNumber(postData?.auto_request)) {
                if (!this.commonService.isValidNumber(postData?.result_type) || !postData?.org_id || !postData?.quiz_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            } else {
                if (!this.commonService.isValidNumber(postData?.auto_request)) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            if(postData?.type && postData?.type == 'superadmin'){
                if(!postData?.org_id || !postData?.membership_code){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let sendData = {
                ...postData, userDetails: { id: user?.id, org_id: user?.org_id, role_id: user?.role_id, membership_code: user?.membership_code }
            }
            if (postData?.auto_request == 1) {
                delete sendData?.userDetails;
            }
            let data = await lastValueFrom(this.cronMicroservice.send({ cmd: 'report' }, { data: sendData, table_name: tableConstant.QUIZ.TBL_RE_QUIZ_REPORTS }));
            if ((typeof data === 'string') && data === 'Report Successfully created.') {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: 'Report Successfully created.',
                    message: 'success',
                });
            } else if (typeof data === 'object' && data?.success === 0 && data?.error === 1 && data?.message) {
                throw new Error(data?.message);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data || [],
                message: await this.translatorService.frontendReadTranslation(req.lang, postData?.result_type == 2 ? 'Report Generated' : 'success'),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
    /** 
     * API for Health Report.(Health checkup Report report)
    */
    @Post('health-checkup-report')
    async healthReport(@Req() req: Request, @Res() res: Response, @Body() postData: HealthCheckupReportInput) {
        try {
            let user = Object.create(req?.tokenUser) || {};
            if (![appConstant.ROLE.ADMIN, appConstant.ROLE.ORGADMIN, appConstant.ROLE.COACH, appConstant.ROLE.GLOBALCOACH, appConstant.ROLE.WCH, appConstant.ROLE.BROKER, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(user?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (user?.role_id === appConstant.ROLE.ORGADMIN && (!postData?.start_date || !postData?.end_date)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if (!this.commonService.isValidNumber(postData?.auto_request)) {
                if (!this.commonService.isValidNumber(postData?.result_type)) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            } else {
                if (!this.commonService.isValidNumber(postData?.auto_request)) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            if(postData?.type && postData?.type == 'superadmin'){
                if(!postData?.org_id || !postData?.membership_code){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            if (postData?.type && postData?.type != 'individual') {
                if (
                    postData?.org_id == null ||
                    postData?.org_id == undefined ||
                    (Array.isArray(postData?.org_id) && postData?.org_id.length == 0) ||
                    (String(postData?.org_id).trim() == '')
                ) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let sendData = {
                ...postData, userDetails: { id: user?.id, org_id: user?.org_id, role_id: user?.role_id, membership_code: user?.membership_code }
            }
            if (postData?.auto_request == 1) {
                delete sendData?.userDetails;
            }

            let data = await lastValueFrom(this.cronMicroservice.send({ cmd: 'report' }, { data: sendData, table_name: tableConstant.HEALTH_CHECKUP.TBL_RE_HEALTH_REPORTS }));
            if (data?.buffer && postData?.result_type === 2) {
                let bufferData = Buffer.from(data?.buffer).toString("base64");
                let currentDatetime = await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD-HHmmss');
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: { file_data: bufferData, file_name: `Health_Report_${currentDatetime}`, extension: 'pdf' },
                    message: 'success',
                });
            }
            if ((typeof data === 'string') && data === 'Report Successfully created.') {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: 'Report Successfully created.',
                    message: 'success',
                });
            } else if (typeof data === 'object' && data?.success === 0 && data?.error === 1 && data?.message) {
                throw new Error(data?.message);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data || [],
                message: await this.translatorService.frontendReadTranslation(req.lang, postData?.result_type == 2 ? 'Report Generated' : 'success'),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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

    @Post('biometric-result-report')
    async biometricResultReport(@Req() req: Request, @Res() res: Response, @Body() postData: BiometricResultReportInput) {
        try {
            let user = JSON.parse(JSON.stringify(req.tokenUser));
            if (![appConstant.ROLE.ADMIN].includes(user?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!postData?.org_id || !postData.year) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            postData['user'] = user;
            let data = await lastValueFrom(this.cronMicroservice.send({ cmd: 'report' }, { data: postData, table_name: 'biometric_result_report' }));
            if (typeof data === 'object' && data?.success === 0 && data?.error === 1 && data?.message) {
                let message = await this.translatorService.frontendReadTranslation(req.lang,data?.message)
                throw new Error(message);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data.data,
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

    @Post('eha-detail-report')
    async ehaDetailReport(@Req() req: Request, @Res() res: Response, @Body() postData: EhaDetailReportInput) {
        try {
            let user = JSON.parse(JSON.stringify(req.tokenUser));
            if (![appConstant.ROLE.ADMIN].includes(user?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!postData?.org_id || !postData.terminated_users) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            postData['user'] = user;
            let data = await lastValueFrom(this.cronMicroservice.send({ cmd: 'report' }, { data: postData, table_name: 'eha_detail_report' }));
            if (typeof data === 'object' && data?.success === 0 && data?.error === 1 && data?.message) {
                let message = await this.translatorService.frontendReadTranslation(req.lang,data?.message)
                throw new Error(message);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data.data,
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

    @Post('engagement-comparison-report')
    async engagementComparisonReport(@Req() req: Request, @Res() res: Response, @Body() postData: engagementComparisonReportInput) {
        try {
            let user = JSON.parse(JSON.stringify(req.tokenUser));
            if (!postData?.org_id || !postData?.date || !postData?.camp_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            if (![appConstant.ROLE.ADMIN,appConstant.ROLE.ORGADMIN,appConstant.ROLE.WCH].includes(user?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            postData['user'] = user;
            let data = await lastValueFrom(this.cronMicroservice.send({ cmd: 'report' }, { data: postData, table_name: 'engagement_comparison_report' }));
            if (typeof data === 'object' && data?.success === 0 && data?.error === 1 && data?.message) {
                let message = await this.translatorService.frontendReadTranslation(req.lang,data?.message)
                throw new Error(message);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data.data,
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

    @Post('hra-detail-report')
    async hraDetailReport(@Req() req: Request, @Res() res: Response, @Body() postData: HraDetailReportInput) {
        try {
            let user = JSON.parse(JSON.stringify(req.tokenUser));
            if (![appConstant.ROLE.ADMIN].includes(user?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!postData?.org_id || !postData.terminated_users) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            postData['user'] = user;
            let data = await lastValueFrom(this.cronMicroservice.send({ cmd: 'report' }, { data: postData, table_name: 'hra_detail_report' }));
            if (typeof data === 'object' && data?.success === 0 && data?.error === 1 && data?.message) {
                let message = await this.translatorService.frontendReadTranslation(req.lang,data?.message)
                throw new Error(message);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data.data,
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

    @Post('campaign-annual-report')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let user =  req.tokenUser;
            let org_id = Number(postData?.org_id) || 0;
            let roleId = user.role_id;
            let userId = user.id;
            let checkOrgId = [];
            checkOrgId.push(Number(org_id));
            let membershipCode = await this.companyService.getCompanyCodeFromId(org_id);
            if(!checkOrgId.includes(org_id)){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_ACCESS_DENIED'));
            }else{
                let activePlugins = await this.activePluginService.getActivePluginList(org_id);
                if(!activePlugins.includes('Incentive')){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_ACCESS_DENIED'));
                }else{
                    let condition = `user.role_id IN ('2','16') AND user.membership_code = '${membershipCode}'`;
                    if (postData?.terminated_users == 2) {
                        condition += ` AND user.status = 1`;
                    }
                    let notifyEmail = "";
                    if (postData?.notification_email && postData?.notification_email != "") {
                        notifyEmail = postData?.notification_email;
                    }
                    let insertRequestData = {};
                    insertRequestData['org_id'] = org_id;
                    insertRequestData['user_id'] = userId;
                    insertRequestData['user_role'] = roleId;
                    insertRequestData['membership_code'] = membershipCode;
                    insertRequestData['camp_id'] = postData?.camp_id ?? 0;
                    insertRequestData['report_type'] = 'CRA';
                    insertRequestData['condition'] = condition;
                    insertRequestData['request_date'] = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss', '', 'UTC');
                    insertRequestData['email'] = notifyEmail;
                    insertRequestData['is_range'] = 0;
                    insertRequestData['start_date_range'] = postData?.year ? `${postData?.year}-01-01 00:00:00` : null;
                    insertRequestData['end_date_range'] = postData?.year ? `${postData?.year}-12-31 23:59:59` : null;
                    insertRequestData['status'] = 0;
                    insertRequestData['system_type'] = System_Type.NEW;
                    insertRequestData['cron_status'] = CronStatus.COMPILATION;
                    let checkExitRequest = await this.incentiveReportsService.findOne({  org_id: org_id, user_id: userId, status: Not(1), report_type: In(['CRA']) });
                    if(checkExitRequest){
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REPORT_ALREADY_REQUESTED'));
                    }else{
                        await this.incentiveReportsService.save(insertRequestData);  
                        return res.status(HttpStatus.OK).json({
                            statusCode: 200,
                            success: 1,
                            error: 0,
                            data: {},
                            message: await this.translatorService.frontendReadTranslation(req.lang, "Your report request is in progress, we will notify you once the report is available to download.")
                        });
                    }
                }
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
    /**
     * API for Challenge Report
     */
    @Post('billboard-report')
    async billboardReport(@Req() req: Request, @Res() res: Response, @Body() postData: BillboardReportInput) {
        try {

            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let user = Object.create(req?.tokenUser) || {};
            /*if (![appConstant.ROLE.ADMIN, appConstant.ROLE.ORGADMIN, appConstant.ROLE.COACH, appConstant.ROLE.GLOBALCOACH, appConstant.ROLE.WCH, appConstant.ROLE.BROKER, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(user?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }*/
            if (!this.commonService.isValidNumber(postData?.auto_request)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }

            let sendData = {
                ...postData, userDetails: {id: user?.id, org_id: user?.org_id, role_id: user?.role_id, company_name: user?.company?.company_name}
            }
            if( postData?.auto_request == 1){
                delete sendData?.userDetails;
            }
            let data = await lastValueFrom(this.cronMicroservice.send({ cmd: 'report' }, { data: sendData, table_name: tableConstant.COMPANIES.TBL_COMPANY_DASHBOARD }));
            if ((typeof data === 'string') && data === 'Report Successfully created.') {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: 'Report Successfully created.',
                    message: 'success',
                });
            } else if (typeof data === 'object' && data?.success === 0 && data?.error === 1 && data?.message) {
                throw new Error(data?.message);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data || [],
                message: await this.translatorService.frontendReadTranslation(req.lang, postData?.result_type == 2 ? 'Report Generated' : 'success'),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
    /**
     * API for All Auto Report Cron. testing purpose only
    */
    @Post('all-auto-report-cron')
    async allAutoReportCron(@Req() req: Request, @Res() res: Response, @Body() postData: QuizReportInput) {
        try {
            let data = await lastValueFrom(this.cronMicroservice.send({ cmd: 'all-report-cron' }, {}));
            if ((typeof data === 'string') && data === 'Report Successfully created.') {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: 'Report Successfully created.',
                    message: 'success',
                });
            } else if (typeof data === 'object' && data?.success === 0 && data?.error === 1 && data?.message) {
                throw new Error(data?.message);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data || [],
                message: await this.translatorService.frontendReadTranslation(req.lang, postData?.result_type == 2 ? 'Report Generated' : 'success'),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
        /**
     * API for Challenge Report
    */
    @Post('company-sales-report')
    async salesReport(@Req() req: Request, @Res() res: Response, @Body() postData: ChallengeReportInput) {
        try {
            let user = Object.create(req?.tokenUser) || {};
            if (![appConstant.ROLE.ADMIN].includes(user?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            let data = await lastValueFrom(this.cronMicroservice.send({ cmd: 'org-sales-report' }, postData?.org_id ? {org_id: postData?.org_id} : {}));
            if ((typeof data === 'string') && data === 'Report Successfully created.') {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: 'Report Successfully created.',
                    message: 'success',
                });
            } else if (typeof data === 'object' && data?.success === 0 && data?.error === 1 && data?.message) {
                throw new Error(data?.message);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data || [],
                message: await this.translatorService.frontendReadTranslation(req.lang, postData?.result_type == 2 ? 'Report Generated' : 'success'),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
