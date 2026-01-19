import { CampaignService } from "@/modules/campaign/campaign/campaign.service";
import { CampaignActivityService } from "@/modules/campaign/campaignactivity/campaignactivity.service";
import { ActivePluginService } from "@/modules/company/activeplugins/activeplugin.service";
import { CompanyService } from "@/modules/company/companies/company.service";
import {
    appConstant,
    AssessmentCohortReportsDto,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonService, System_Type,
    tableConstant
} from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post, Put,
    Req,
    Res, UploadedFile,
    UseGuards, UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import * as moment from 'moment-timezone';
import { diskStorage } from "multer";
import { ClientManagerAssignService } from "src/modules/company/clientmanagerassign/clientmanagerassign.service";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateAssessmentCohortReportsInput, PaginateWithHealthAssessmentInput } from "../../../input";
import { fileName, imgFilter } from "../../../utils/image-upload.utils";
import { TranslationService } from "../../translation/translation.service";
import { AssessmentCohortReportsService } from "./assessmentcohortreports.service";
import {In, Not} from "typeorm";
import { CampaignDashboardService } from 'src/modules/campaign/campaigndashboard/campaigndashboard.service';
import { FrontPointsForService } from '../../campaign/front/frontpointfor.service';
import { FrontCalculationService } from '../../campaign/front/frontcalculation.service';
@Controller('health-assessment/cohort-reports')
@UseGuards(TokenGuard, RoleGuard)
export class AssessmentCohortReportsController {
    constructor(
        private readonly assessmentCohortReportsService: AssessmentCohortReportsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly activePluginService: ActivePluginService,
        private readonly companyService : CompanyService,
        private readonly commonDateService: CommonDateService,
        private readonly campaignService: CampaignService,
        private readonly campaignActivityService: CampaignActivityService,
        private readonly clientManagerAssignService: ClientManagerAssignService,
        private readonly campaignDashboardService: CampaignDashboardService,
        private readonly frontPointsForService: FrontPointsForService,
        private readonly frontCalculationService: FrontCalculationService,
    ) {
    }
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithHealthAssessmentInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `healthassessment.id !=0 `;
            if(postData?.org_id){
                where +=`AND healthassessment.org_id = '${postData?.org_id}'`;
            }
            if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id,status: 1},null);
                if(resultedData.length > 0){
                    where += `AND healthassessment.org_id IN (${resultedData.map(ele=>ele.org_id).join(',')})`;
                }
                else{
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
            if(postData?.status != undefined || postData?.status != null){
                where +=`AND healthassessment.status = '${postData?.status}'`;
            }
            if(postData?.user_id){
                where +=`AND healthassessment.user_id = '${postData?.user_id}'`;
            }
            if(postData?.request_date){
                let start_date = moment(postData?.request_date).format('YYYY-MM-DD');
                let end_date = moment(postData?.request_date).format('YYYY-MM-DD');
                where +=`AND healthassessment.request_date BETWEEN '${start_date} 00:00:00' AND '${end_date} 23:59:59' `;
            }
            if (postData?.search_str) {
                where += `AND(company.company_name LIKE '%${postData?.search_str}%' OR healthassessment.year LIKE '%${postData?.search_str}%' OR healthassessment.condition LIKE '%${postData?.search_str}%' OR healthassessment.Campaignactivity LIKE '%${postData?.search_str}%' OR healthassessment.source_ids LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.assessmentCohortReportsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(AssessmentCohortReportsDto, resultedData['list'], req.lang)
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
    @UseGuards(AccessGuard)
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            let biometricDetails = await this.assessmentCohortReportsService.findOne(where);
            if (!biometricDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            biometricDetails = <any>(
                await this.commonArrayService.formatToDto(AssessmentCohortReportsDto, biometricDetails, req.lang)
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
    async createCohortReport(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData || Object.keys(postData).length === 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }

            let user = req.tokenUser;
            let companyid = Number(postData?.organization || postData?.company_id) ?? 0;
            let userId = user.id;

            let activePlugins = await this.activePluginService.getActivePluginList(companyid);
            if (!activePlugins.includes('Hra')) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_ACCESS_DENIED'));
            }

            let condition = `user.status != 2 AND user.role_id IN ('2','16') AND user.org_id = ${companyid}`;

            if (postData?.terminated_users && postData.terminated_users == 2) {
                condition += ` AND user.status = 1`;
            }
            if (postData?.show_terminated_users && postData.show_terminated_users == 2) {
                condition += ` AND user.status = 1`;
            }

            if (postData?.department_id && postData.department_id != '') {
                let departments = typeof postData.department_id === 'string'
                    ? postData.department_id.split(',').filter(d => d !== '')
                    : postData.department_id.filter(d => d !== '');
                if (departments.length > 0) {
                    condition += ` AND user.department_id IN ('${departments.join("','")}')`;
                }
            }

            if (postData?.location_id && postData.location_id != '') {
                let locations = typeof postData.location_id === 'string'
                    ? postData.location_id.split(',').filter(l => l !== '')
                    : postData.location_id.filter(l => l !== '');
                if (locations.length > 0) {
                    condition += ` AND user.location IN ('${locations.join("','")}')`;
                }
            }

            if (postData?.on_insurance_plan && postData.on_insurance_plan != '') {
                condition += ` AND user.on_insurance_plan = '${postData.on_insurance_plan}'`;
            }

            if (postData?.gender && postData.gender != '') {
                condition += ` AND user.gender = '${postData.gender}'`;
            }

            if (postData?.age && postData.age != '' && postData?.range && postData.range != '' && Number(postData.range) > 0) {
                let symboldata = '=';
                if (postData.age == 1) {
                    symboldata = '>';
                } else if (postData.age == 2) {
                    symboldata = '>=';
                } else if (postData.age == 3) {
                    symboldata = '<';
                } else if (postData.age == 4) {
                    symboldata = '<=';
                }
                condition += ` AND (YEAR(CURDATE()) - RIGHT(user.dob, 4)) ${symboldata} ${postData.range}`;
            }

            let srccond = '';
            let srccond_ha_hr = '';
            let source_ids = '';

            if (postData?.source && Array.isArray(postData.source) && postData.source.length > 0) {
                let sourceopts = postData.source.filter(s => s);
                source_ids = sourceopts.join(',');

                if (sourceopts.length == 1) {
                    if (sourceopts[0] == 1) {
                        srccond = ` AND source IN (${sourceopts[0]},13,14,15)`;
                        srccond_ha_hr = ` AND source IN (${sourceopts[0]},13,14,15)`;
                    } else if (sourceopts[0] == 3) {
                        srccond = ` AND (source IN (${sourceopts[0]},11,12) OR (source = 2 AND enter_by != 0))`;
                        srccond_ha_hr = ` AND source IN (${sourceopts[0]},11,12)`;
                    } else {
                        srccond = ` AND source = ${sourceopts[0]} AND enter_by = 0`;
                        srccond_ha_hr = ` AND source = ${sourceopts[0]}`;
                    }
                }
                if (sourceopts.length == 2) {
                    if ((sourceopts[0] == 1 && sourceopts[1] == 2) || (sourceopts[0] == 2 && sourceopts[1] == 1)) {
                        srccond = ` AND (source IN (1,13,14,15) OR (source = 2 AND enter_by = 0))`;
                        srccond_ha_hr = ` AND source IN (1,2,13,14,15)`;
                    } else if ((sourceopts[0] == 2 && sourceopts[1] == 3) || (sourceopts[0] == 3 && sourceopts[1] == 2)) {
                        srccond = ` AND (source IN (3,11,12) OR (source = 2 AND enter_by = 0) OR (source = 2 AND enter_by != 0))`;
                        srccond_ha_hr = ` AND source IN (2,3,11,12)`;
                    } else if ((sourceopts[0] == 3 && sourceopts[1] == 1) || (sourceopts[0] == 1 && sourceopts[1] == 3)) {
                        srccond = ` AND (source IN (1,3,11,12,13,14,15) OR (source = 2 AND enter_by != 0))`;
                        srccond_ha_hr = ` AND source IN (1,3,11,12,13,14,15)`;
                    }
                }
                if (sourceopts.length == 3) {
                    srccond = ` AND (source IN (1,3,11,12,13,14,15) OR (source = 2 AND enter_by = 0) OR (source = 2 AND enter_by != 0))`;
                    srccond_ha_hr = ` AND source IN (1,2,3,11,12,13,14,15)`;
                }
            }

            let allusers = await this.assessmentCohortReportsService.getAllUsers(condition);

            if (!allusers || allusers.length < 25) {
                let needs = 25 - (allusers?.length || 0);
                throw new Error(`The selected group needs ${needs} more user to review cohort data reports. Aggregate information currently displays for 25 members or more, per HIPAA regulations.`);
            }

            let totalUser = allusers.length;
            let allusersIDS = {};
            allusers.forEach(u => {
                allusersIDS[u.id] = u.gender;
            });
            let allusersImpload = Object.keys(allusersIDS).join(',');

            let first_year = '1';
            let second_year = '2';
            let from_date_0 = '';
            let to_date_0 = '';
            let from_date_1 = '';
            let to_date_1 = '';
            let hasDateRange = false;

            if (postData?.from_date0 && postData?.to_date0 && postData?.from_date1 && postData?.to_date1) {
                from_date_0 = await this.commonDateService.DateTimeFormat(postData.from_date0, 'YYYY-MM-DD', 'MM-DD-YYYY');
                to_date_0 = await this.commonDateService.DateTimeFormat(postData.to_date0, 'YYYY-MM-DD', 'MM-DD-YYYY');
                from_date_1 = await this.commonDateService.DateTimeFormat(postData.from_date1, 'YYYY-MM-DD', 'MM-DD-YYYY');
                to_date_1 = await this.commonDateService.DateTimeFormat(postData.to_date1, 'YYYY-MM-DD', 'MM-DD-YYYY');
                hasDateRange = true;
            }
            /*hasDateRange = true;
            from_date_0 = '2020-01-01';
            to_date_0 = '2022-01-01 ';
            from_date_1 = '2023-01-01';
            to_date_1 = '2025-01-01';*/
            let campaign_id = '';
            let activity_ids = '';

            if (postData?.campaign_id && postData.campaign_id != '') {
                campaign_id = postData.campaign_id;

                const filteredUsers = await this.filterUsersByCampaign(
                    {
                        campaign_id: postData.campaign_id,
                        Campaignactivity: postData?.activity_id || []
                    },
                    companyid,
                    allusers,
                    totalUser,req
                );

                if (!filteredUsers || Object.keys(filteredUsers).length === 0) {
                    throw new Error('No eligible users found for selected campaign');
                }

                let filteredUserIds = Object.keys(allusersIDS).filter(id => id in filteredUsers);
                allusersImpload = filteredUserIds.join(',');

                if (postData?.activity_id && Array.isArray(postData.activity_id) && postData.activity_id.length > 0) {
                    let activities_ids = [];
                    postData.activity_id.forEach(value => {
                        let exp_act = value.split('-');
                        if (exp_act[0] == 'act') {
                            activities_ids.push(exp_act[1]);
                        }
                    });
                    activity_ids = activities_ids.join(',');
                }
            }

            if (!allusersImpload || allusersImpload == '') {
                throw new Error('No User Found');
            }

            let hc_biometrics = [];
            let hra_biometrics = [];
            let f_biometrics = [];

            if (hasDateRange) {
                let biometric = `((created BETWEEN '${from_date_0}' AND '${to_date_0}') OR (created BETWEEN '${from_date_1}' AND '${to_date_1}')) AND `;
                let Fbiometric = `((added_date BETWEEN '${from_date_0}' AND '${to_date_0}') OR (added_date BETWEEN '${from_date_1}' AND '${to_date_1}')) AND `;
                let HRAbiometric = `((date BETWEEN '${from_date_0}' AND '${to_date_0}') OR (date BETWEEN '${from_date_1}' AND '${to_date_1}')) AND `;

                let hc_biometrics_query = `SELECT CASE WHEN created BETWEEN '${from_date_0}' AND '${to_date_0}' THEN '1' ELSE '2' END as Datarange, user_id FROM (SELECT * FROM hc_biometrics WHERE ${biometric} user_id IN(${allusersImpload}) ${srccond} AND status != 2 ORDER BY created DESC, id DESC) AS Biometric WHERE ${biometric} Biometric.user_id IN(${allusersImpload}) GROUP BY Biometric.user_id, Datarange`;

                let hra_biometrics_query = `SELECT CASE WHEN date BETWEEN '${from_date_0}' AND '${to_date_0}' THEN '1' ELSE '2' END as Datarange, user_id FROM (SELECT * FROM ha_hrabiometrics WHERE ${HRAbiometric} user_id IN(${allusersImpload}) ${srccond_ha_hr} AND status != 2 ORDER BY date DESC, id DESC) AS Hrabiometrics WHERE ${HRAbiometric} Hrabiometrics.user_id IN(${allusersImpload}) GROUP BY Hrabiometrics.user_id, Datarange`;

                let f_biometrics_query = `SELECT CASE WHEN added_date BETWEEN '${from_date_0}' AND '${to_date_0}' THEN '1' ELSE '2' END as Datarange, user_id FROM (SELECT * FROM ft_biomatrics WHERE ${Fbiometric} user_id IN(${allusersImpload}) ${srccond_ha_hr} AND status != 2 ORDER BY added_date DESC, id DESC) AS Fbiomatrics WHERE ${Fbiometric} Fbiomatrics.user_id IN(${allusersImpload}) GROUP BY Fbiomatrics.user_id, Datarange`;

                hc_biometrics = await this.assessmentCohortReportsService.customQueryRun(hc_biometrics_query);
                hra_biometrics = await this.assessmentCohortReportsService.customQueryRun(hra_biometrics_query);
                f_biometrics = await this.assessmentCohortReportsService.customQueryRun(f_biometrics_query);
            }
            let biototalfirstyear = {};
            let biototalsecondyear = {};

            let hc_biometrics_tmp = {};
            if (hc_biometrics && hc_biometrics.length > 0) {
                hc_biometrics.forEach(bio => {
                    if (!hc_biometrics_tmp[bio.Datarange]) {
                        hc_biometrics_tmp[bio.Datarange] = {};
                    }
                    hc_biometrics_tmp[bio.Datarange][bio.user_id] = bio;
                });
            }

            let hra_biometrics_tmp = {};
            if (hra_biometrics && hra_biometrics.length > 0) {
                hra_biometrics.forEach(bio => {
                    if (!hra_biometrics_tmp[bio.Datarange]) {
                        hra_biometrics_tmp[bio.Datarange] = {};
                    }
                    hra_biometrics_tmp[bio.Datarange][bio.user_id] = bio;
                });
            }

            let f_biometrics_tmp = {};
            if (f_biometrics && f_biometrics.length > 0) {
                f_biometrics.forEach(bio => {
                    if (!f_biometrics_tmp[bio.Datarange]) {
                        f_biometrics_tmp[bio.Datarange] = {};
                    }
                    f_biometrics_tmp[bio.Datarange][bio.user_id] = bio;
                });
            }

            biototalfirstyear = {
                ...(hc_biometrics_tmp[first_year] || {}),
                ...(hra_biometrics_tmp[first_year] || {}),
                ...(f_biometrics_tmp[first_year] || {})
            };

            biototalsecondyear = {
                ...(hc_biometrics_tmp[second_year] || {}),
                ...(hra_biometrics_tmp[second_year] || {}),
                ...(f_biometrics_tmp[second_year] || {})
            };

            let companynameadding = (await this.companyService.getCompanyName(companyid)).replace(/[^A-Za-z0-9._]/gu, '-');
            if (hasDateRange && (Object.keys(biototalfirstyear).length >= 25 && Object.keys(biototalsecondyear).length >= 25)) {
                let Cohortreport: any = {
                    year: `${from_date_0}:::${to_date_0}:::${from_date_1}:::${to_date_1}`,
                    condition: condition,
                    org_id: companyid,
                    user_id: userId,
                    campaign_id: campaign_id,
                    source_ids: source_ids,
                    activity_ids: activity_ids,
                    file: companynameadding,
                    request_date: await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss'),
                    status: 0,
                    system_type: System_Type.NEW
                };
                let savedReport = await this.assessmentCohortReportsService.save(Cohortreport);
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'Your report request is in progress, we will notify you once the report is available to download.',
                });
            } else if (hasDateRange) {
                let needs = (Object.keys(biototalfirstyear).length < 25) ? (25 - Object.keys(biototalfirstyear).length) : 0;
                let needs1 = (Object.keys(biototalsecondyear).length < 25) ? (25 - Object.keys(biototalsecondyear).length) : 0;
                throw new Error(`The selected group needs ${needs} more individual entries for range ${first_year} and ${needs1} more individual entries for range ${second_year} to review cohort data reports. Aggregate information currently displays for 25 members or more, per HIPAA regulations.`);
            } else {
                throw new Error(`The selected group needs 25 more individual entries for range 1 and 25 more individual entries for range 2 to review cohort data reports. Aggregate information currently displays for 25 members or more, per HIPAA regulations.`);
            }
        } catch (error) {
            console.log('error',error);
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
    private async filterUsersByCampaign(
        report: any,
        companyId: number,
        users: any[],
        totalUser: number,
        req: any
    ): Promise<any> {
        if (!report.campaign_id) return {};

        try {
            const activePlugins = await this.activePluginService.getActivePluginList(companyId);
            const campaign = await this.campaignService.findOne({
                organization_id: companyId,
                id: report.campaign_id,
                status: 1
            },{ end_date: 'ASC' });

            if (!campaign) return {};
            const { rewardsIds, activitiesIds } = this.parseCampaignActivities(report.Campaignactivity);

            const conditions: any = { status: '1', campaign_id: report.campaign_id };
            if (activitiesIds.length > 0) {
                conditions.id = activitiesIds;
            }

            const activities = await this.campaignDashboardService.rewardItemGetDetails('campaign_activity', conditions);
            const membershipCode = await this.companyService.getCompanyCodeFromId(companyId);
            let campaignUserIds: number[] = [];
            if (rewardsIds.length > 0) {
                campaignUserIds = await this.processRewardUsers(
                    report,
                    companyId,
                    users,
                    totalUser,
                    activePlugins,
                    rewardsIds,
                    membershipCode,
                    campaign,
                    req
                );
            }

            if (activities && activities.length > 0) {
                const activityUserIds = await this.processActivityUsers(
                    activities,
                    companyId,
                    activePlugins
                );
                campaignUserIds = [...new Set([...campaignUserIds, ...activityUserIds])];
            }

            const filteredUsers: any = {};
            campaignUserIds.forEach(id => {
                if (users.find(u => u.id === id)) {
                    filteredUsers[id] = true;
                }
            });

            return filteredUsers;
        } catch (error) {
            console.error('Error filtering users by campaign:', error);
            return {};
        }
    }

    private parseCampaignActivities(activityIds: any): { rewardsIds: string[], activitiesIds: string[] } {
        const rewardsIds: string[] = [];
        const activitiesIds: string[] = [];

        if (activityIds == null) {
            return { rewardsIds, activitiesIds };
        }

        let items: any[];
        if (typeof activityIds === 'string') {
            items = activityIds.split(',');
        } else if (Array.isArray(activityIds)) {
            items = activityIds;
        } else {
            return { rewardsIds, activitiesIds };
        }

        for (const value of items) {
            if (value == null) continue;

            const str = String(value).trim();
            if (str === '') continue;

            if (!isNaN(Number(str)) && !str.includes('-')) {
                activitiesIds.push(str);
                continue;
            }

            const [type, id] = str.split('-');

            if (type === 'rew' && id) {
                rewardsIds.push(id);
            } else if (type === 'act' && id) {
                activitiesIds.push(id);
            }
        }

        return { rewardsIds, activitiesIds };
    }

    private async processRewardUsers(
        report: any,
        companyId: number,
        users: any[],
        totalUser: number,
        activePlugins: string[],
        rewardsIds: string[],
        membershipCode: string,
        campaign: any,
        req: any
    ): Promise<number[]> {
        const allUsersInfo = Object.fromEntries(users.map(u => [u.id, { User: u }]));
        /*const allUsersInfo: any = {};
        users.forEach(u => {
            allUsersInfo[u.id] = { User: u };
        });*/
        const rewards = await this.campaignDashboardService.getRewardsData(
            {
                campaign_id: report.campaign_id,
                id: In(rewardsIds),
                status: Not(2)
            },
            { order_id: 'ASC' }
        );
        const userDataArray = [
            { 'activePlugins': activePlugins },
            { 'company_id': companyId },
            { 'membershipCode': membershipCode }
        ];
        const rewardsDatas = await this.campaignDashboardService.getMultiRewarddatas(11, rewards, userDataArray, req);

        const camOtherData = [
            { 'membershipCode': membershipCode },
            { 'totalUsers': totalUser },
            { 'company_id': companyId },
            { 'activePlugins': activePlugins }
        ];

        const rewardWiseUserDatas: any = await this.frontCalculationService.getCampaignUserCalculation(
            11,
            JSON.parse(JSON.stringify(rewardsDatas)),
            camOtherData,
            req
        );
        const eligibleUsers: number[] = [];
        const rewardWiseUsers = Array.isArray(rewardWiseUserDatas) ? rewardWiseUserDatas : Object.values(rewardWiseUserDatas);
        for (const userId in allUsersInfo) {
            if (this.isUserEligibleForReward(userId, allUsersInfo[userId], rewardWiseUsers)) {
                console.log('eligibleUsers',userId);
                eligibleUsers.push(parseInt(userId));
            }
            return;
        }
        return eligibleUsers;
    }
    private isUserEligibleForReward(userId: string, userInfo: any, rewardWiseUsers: any[]): boolean {
        const actRoleId = userInfo.User.role_id;
        for (const rw of rewardWiseUsers) {
            for (const myid in rw.Rewards) {
                const r = rw.Rewards[myid];

                if (!r.complete) r.complete = 0;
                console.log('rw',rw);
                const uTotalAct = rw.userActivityTotal?.[userInfo.User.id]?.Total || 0;
                let totalP = rw.userPointsTotal?.[userInfo.User.id]?.Total || 0;
                totalP = Math.round(totalP);

                if (r.consider_require == 1) {
                    const remainPoints = rw.userActivityTotal?.[userInfo.User.id]?.remainPoints || 0;
                    if (remainPoints > 0 && totalP > (r.point - remainPoints)) {
                        totalP = r.point - remainPoints;
                    } else if (totalP > r.point) {
                        totalP = r.point;
                    }
                    totalP = Math.max(0, totalP);
                }

                const targetPoint = actRoleId == 2 ? r.point : r.pointS;
                const totalActivity = actRoleId == 2 ? rw.totalActivity : rw.totalActivityS;

                if ((targetPoint != '' && targetPoint != 0) || totalP != 0) {
                    //console.log('targetPoint',targetPoint);
                    console.log('totalP',totalP);
                    //console.log('r.consider_require',r.consider_require);
                    const metCondition = (totalActivity == 0 || r.consider_require == 0) && totalP >= targetPoint ||
                        (totalActivity <= uTotalAct || r.consider_require == 0) && totalP >= targetPoint;

                    if (metCondition) {
                        if ((rw.reward?.user_eligible == 0) || userInfo.User.is_camp_eligible == 1) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
    private async processActivityUsers(
        activities: any[],
        companyId: number,
        activePlugins: string[]
    ): Promise<number[]> {
        const otherDatas = [
            { 'activePlugins': activePlugins },
            { 'company_id': companyId },
        ];
        const activityDatas = await this.frontPointsForService.points_for_activities_report(11, activities, otherDatas);
        return Object.keys(activityDatas.userData || {}).map(Number);
    }
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.assessmentCohortReportsService.findOne(where);
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
            await this.assessmentCohortReportsService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS, req.tokenUser?.id, 'delete');
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
    @UseInterceptors(
        FileInterceptor("file", {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.WELLBEING_PATH}`,
                filename: fileName
            }),
            fileFilter: imgFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssessmentCohortReportsInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (
                !postData?.id
            ) {
                if (file && file.fieldname === 'file' && file.filename) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            if (file && file.fieldname === 'file' && file.filename) {
                postData['file'] = '/cohortreport/' + file.filename;
            }
            const recordDetails = await this.assessmentCohortReportsService.findOne(where);
            if (!recordDetails) {
                await this.assessmentCohortReportsService.save(postData);
            }
            await this.assessmentCohortReportsService.update(where, postData);
            this.activityLogService.create(recordDetails, postData, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'success',
            });
        } catch (error) {
            if (file && file.fieldname === 'file' && file.filename) {
                await this.commonFileService.removeFileFromLocal(file.path);
            }
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @UseGuards(AccessGuard)
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = { };
            let resultedData = await this.assessmentCohortReportsService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(AssessmentCohortReportsDto, resultedData, req.lang)
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