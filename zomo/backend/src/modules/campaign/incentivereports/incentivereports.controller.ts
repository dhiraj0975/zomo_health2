import { appConstant, CommonArrayService, CommonDateService, CommonService, IncentiveReportsDto, PaginateDto, System_Type, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request, Response } from "express";
import { lastValueFrom } from 'rxjs';
import { ClientManagerAssignService } from "src/modules/company/clientmanagerassign/clientmanagerassign.service";
import { CompanyService } from "src/modules/company/companies/company.service";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { In, Not } from "typeorm";
import { AccessGuard, TokenGuard } from '../../../guard';
import { ActivePluginService } from "../../company/activeplugins/activeplugin.service";
import { CampaignDashboardService } from "../campaigndashboard/campaigndashboard.service";
import { CustomPointService } from "../custompoint/custompoint.service";
import { FrontService } from "../front/front.service";
import { FrontCalculationService } from "../front/frontcalculation.service";
import { PaginateWithCampaignInput } from '../input';
import { SliderSettingsService } from '../slidersettings/slidersettings.service';
import { IncentiveReportRequestPaginateDto } from "./dtos";
import { IncentiveReportsService } from "./incentivereports.service";
import { incentiveReportRequestPaginateInput } from './input';
@Controller('incentive/incentivereports')
@UseGuards(TokenGuard, AccessGuard)
export class IncentiveReportsController {
    constructor(
        @Inject('CRON_SERVICE')
        private client: ClientProxy,
        private readonly incentiveReportsService: IncentiveReportsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly clientManagerAssignService: ClientManagerAssignService,
        private readonly activePluginService: ActivePluginService,
        private readonly customPointService: CustomPointService,
        private readonly companyService : CompanyService,
        private readonly frontService : FrontService,
        private readonly sliderSettingsService : SliderSettingsService,
        private readonly campaignDashboardService: CampaignDashboardService,
        private readonly frontCalculationService: FrontCalculationService,
    ) { }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCampaignInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if ([appConstant.ROLE.ADMIN].includes(req.tokenUser?.role_id)) {
                let optionReport = {
                    "DR": "Engagement Master",
                    "QR": "Incentive Qualification",
                    "OR": "Achievable Opportunity List",
                    "NR": "Non-Participant"
                };
                let where = `incentivereports.status In (0,2) AND report_type IN ('DR', 'QR', 'OR', 'NR') AND incentivereports.total_download = 4 `;
                const resultedData = await this.incentiveReportsService.paginateList(
                    where,
                    postData,
                );
                for (let i: number = 0; i < resultedData['list'].length; i++) {
                    resultedData['list'][i]['report_type'] = optionReport[resultedData['list'][i]['report_type']] || '';
                }
                resultedData['list'] = <any>(
                    await this.commonArrayService.formatToDto(IncentiveReportsDto, resultedData['list'], req.lang)
                );
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

    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.company_id || postData?.type === undefined || postData?.type === null) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }

            let user = req.tokenUser;
            let org_id = Number(postData?.company_id) ?? 0;
            let roleId = user.role_id;
            let userId = user.id;

            let filteredCampaignId = 0;
            if (postData?.campaign_id) {
                if (Array.isArray(postData.campaign_id)) {
                    filteredCampaignId = postData.campaign_id.join(',');
                } else {
                    filteredCampaignId = postData.campaign_id;
                }
            }

            let commonArrFilter: string[] = [];
            if(roleId == 12){
                commonArrFilter = await this.getReportSettingMenu(org_id, req, 'Incentive');
            }

            let censusReportField = [];
            let censusReportFieldTemp = [];
            let censusFieldValue = [];
            let census = [];
            let censusStatus = 0;
            let censusFields = [];
            if (roleId == 11) {
                censusStatus = user?.company?.setting?.census_status;
                if (censusStatus == 1) {
                    censusFields = await this.incentiveReportsService.getCensusCustomFields(
                        { organization_id: org_id, status: 1, show_in_filter: 1 },
                        [ 'id', 'title']
                    );
                }
            }

            let currentDate = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD') + ' 00:00:00';
            let act_id_20_string = await this.incentiveReportsService.getSpecificCatActivityIds(20);
            let checkOrgId = [];
            checkOrgId.push(Number(org_id));

            if(roleId == appConstant.ROLE.GLOBALCOACH){
                checkOrgId = await this.customPointService.checkCoachUser(`coachs.coach_manager_id = ${user.id} AND coachs.status = 1`);
                checkOrgId = checkOrgId.map(item => item.org_id);
            }else if(roleId == appConstant.ROLE.BROKER){
                checkOrgId = await this.customPointService.checkBrokerUser(`broker.org_id = ${org_id} AND broker.user_id = ${user.id} AND broker.is_global = 1`);
                checkOrgId = checkOrgId.map(item => item.org_id);
            }else if(roleId == appConstant.ROLE.REGIONALADMIN){
                checkOrgId = await this.customPointService.checkBrokerUser(`broker.org_id = ${org_id} AND broker.user_id = ${user.id} AND broker.is_global = 2`);
                checkOrgId = checkOrgId.map(item => item.org_id);
            }else if(roleId == appConstant.ROLE.BROKERADMIN){
                checkOrgId = await this.customPointService.checkBrokerUser(`broker.org_id = ${org_id} AND broker.broker_admin_id = ${user.id}`);
                checkOrgId = checkOrgId.map(item => item.org_id);
            }

            let membershipCode = await this.companyService.getCompanyCodeFromId(org_id);

            if(!checkOrgId.includes(org_id)){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_ACCESS_DENIED'));
            }

            let activePlugins = await this.activePluginService.getActivePluginList(org_id);
            if(!activePlugins.includes('Incentive')){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_ACCESS_DENIED'));
            }

            let dateRange = 0;
            let startDateRange = "";
            let endDateRange = "";
            let startDateRangeTS = "";
            let endDateRangeTS = "";

            if (postData?.start_date && postData?.end_date && postData.start_date != '' && postData.end_date != '') {
                startDateRangeTS = await this.commonDateService.DateTimeFormat(postData?.start_date,'timestamp','MM-DD-YYYY').toString();
                endDateRangeTS = await this.commonDateService.DateTimeFormat(postData?.end_date,'timestamp','MM-DD-YYYY').toString();

                if(startDateRangeTS <= endDateRangeTS){
                    dateRange = 1;
                    startDateRange = await this.commonDateService.DateTimeFormat(postData?.start_date,'YYYY-MM-DD','MM-DD-YYYY').toString() + ' 00:00:00';
                    endDateRange = await this.commonDateService.DateTimeFormat(postData?.end_date,'YYYY-MM-DD','MM-DD-YYYY').toString() + ' 00:00:00';
                }else {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_INVALID_DATE_RANGE'));
                }
            }

            let condition = `user.role_id IN ('2','16') AND user.membership_code = '${membershipCode}'`;

            if (postData?.terminated_users && postData.terminated_users == 2) {
                condition += ` AND user.status = 1`;
            }

            if(roleId == 12){
                if (postData?.on_insurance_plan && postData.on_insurance_plan != 'both') {
                    condition += ` AND user.on_insurance_plan = '${postData?.on_insurance_plan}'`;
                }
            }else{
                if (postData?.on_insurance_plan && postData.on_insurance_plan != 'both') {
                    condition += ` AND user.on_insurance_plan = '${postData?.on_insurance_plan}'`;
                }

                if (postData?.departments) {
                    let departmentIds = [];
                    if (Array.isArray(postData.departments)) {
                        departmentIds = postData.departments;
                    } else {
                        departmentIds = postData.departments.toString().split(',');
                    }
                    const deptIdsString = departmentIds.map(id => String(id).trim()).filter(id => id !== '').join(',');
                    if (deptIdsString) {
                        condition += ` AND user.department_id IN (${deptIdsString})`;
                    }
                }

                if(postData?.locations){
                    let locationIds = [];
                    let locationsArray = [];

                    if (Array.isArray(postData.locations)) {
                        locationsArray = postData.locations;
                    } else {
                        locationsArray = postData.locations.toString().split(',');
                    }

                    for (let locRaw of locationsArray){
                        let getlocations = await this.incentiveReportsService.getLocations(
                            { id : locRaw, deleted : 0 },
                            ['lname']
                        );

                        if (getlocations && getlocations.length > 0) {
                            let locationName = getlocations[0].lname;
                            let getAlllocations = await this.incentiveReportsService.getLocations(
                                { lname : `${locationName}`, deleted : 0},
                                ['id']
                            );
                            for (let loc of getAlllocations){
                                locationIds.push(loc.id);
                            }
                        }
                    }

                    if (locationIds.length > 0) {
                        let allFilterLocation = locationIds.join(',');
                        condition += ` AND user.location IN (${allFilterLocation})`;
                    }
                }

                if (postData?.countrys) {
                    let countryIds = [];
                    if (Array.isArray(postData.countrys)) {
                        countryIds = postData.countrys;
                    } else {
                        countryIds = postData.countrys.toString().split(',');
                    }

                    if (countryIds.length > 0) {
                        const countrysString = countryIds
                            .filter(item => item !== null && item !== undefined && item !== '')
                            .map(item => `'${String(item).trim().replace(/'/g, "''")}'`)
                            .join(",");
                        if (countrysString) {
                            condition += ` AND location.country IN (${countrysString})`;
                        }
                    }
                }

                if (postData?.states) {
                    let stateIds = [];
                    if (Array.isArray(postData.states)) {
                        stateIds = postData.states;
                    } else {
                        stateIds = postData.states.toString().split(',');
                    }

                    if (stateIds.length > 0) {
                        const statesString = stateIds
                            .filter(item => item !== null && item !== undefined && item !== '')
                            .map(item => `'${String(item).trim().replace(/'/g, "''")}'`)
                            .join(",");
                        if (statesString) {
                            condition += ` AND location.state IN (${statesString})`;
                        }
                    }
                }

                if (postData?.citys) {
                    let cityIds = [];
                    if (Array.isArray(postData.citys)) {
                        cityIds = postData.citys;
                    } else {
                        cityIds = postData.citys.toString().split(',');
                    }

                    if (cityIds.length > 0) {
                        const citysString = cityIds
                            .filter(item => item !== null && item !== undefined && item !== '')
                            .map(item => `'${String(item).trim().replace(/'/g, "''")}'`)
                            .join(",");
                        if (citysString) {
                            condition += ` AND location.city IN (${citysString})`;
                        }
                    }
                }

                if(censusStatus == 1){
                    let conditionCensus: string[] = [];

                    if (postData?.custom_field) {
                        postData.custom_field = postData?.custom_field.filter((value: string) =>
                            /^[a-zA-Z0-9 \-@_&$%]+$/.test(value)
                        );
                    }

                    if (postData?.census_custom_field) {
                        let censusCustomFields = JSON.parse(postData?.census_custom_field);

                        if(Object.keys(censusCustomFields).length > 0){
                            for (let key in censusCustomFields) {
                                let value = censusCustomFields[key];
                                if (value && String(value).trim() !== '') {
                                    censusReportField.push(key);
                                    censusReportFieldTemp.push(value);
                                    censusFieldValue.push(value);
                                    const escapedValue = String(value).replace(/'/g, "''");
                                    conditionCensus.push(
                                        `user_id IN (SELECT user_id FROM c_census_custom_fields_values WHERE field_value LIKE '%${escapedValue}%' AND field_id = '${key}')`
                                    );
                                }
                            }
                        }

                        if (conditionCensus.length > 0) {
                            const query = `SELECT DISTINCT user_id FROM c_census_custom_fields_values WHERE ${conditionCensus.join(' AND ')}`;
                            const censusCustom = await this.incentiveReportsService.customQueryRun(query);

                            if (censusCustom.length > 0) {
                                const userIds = censusCustom.map(row => row.user_id).join(',');
                                condition += ` AND user.id IN (${userIds})`;
                            } else {
                                condition += ' AND user.id = 0';
                            }
                        }
                    }
                }
            }

            let reportType = '';
            if (postData?.report_type) {
                reportType = postData?.report_type;
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
            insertRequestData['camp_id'] = filteredCampaignId;
            insertRequestData['report_type'] = reportType;
            insertRequestData['condition'] = condition;
            insertRequestData['request_date'] = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss', '', 'UTC');
            insertRequestData['email'] = notifyEmail;
            insertRequestData['is_range'] = dateRange;
            insertRequestData['start_date_range'] = startDateRange;
            insertRequestData['end_date_range'] = endDateRange;
            insertRequestData['status'] = 0;
            insertRequestData['system_type'] = 1;

            let returnData = {};
            let message = '';

            if(postData.type == 'create'){
                let campIds = filteredCampaignId || 0;
                let campIdsArray = String(campIds).split(',').filter(id => id.trim() !== '');

                let checkExitRequest = await this.incentiveReportsService.findOne({
                    camp_id: In(campIdsArray),
                    org_id: org_id,
                    user_id: userId,
                    status: Not(1),
                    report_type: In(['DR', 'QR', 'OR', 'NR']),
                    system_type: System_Type.NEW
                });

                if(checkExitRequest){
                    message = await this.translatorService.frontendReadTranslation(req.lang, "ERR_REPORT_ALREADY_REQUESTED")+".";
                }else{
                    insertRequestData['condition'] = insertRequestData['condition']
                        .trimStart()
                        .replace(/\buser\./g, 'User.')
                        .replace(/\blocation\./g, 'Location.');

                    let insertRequest = await this.incentiveReportsService.save(insertRequestData);
                    message = await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_REPORT_REQUESTED")+".";
                }
            }else{
                let ScommonDatas = [
                    { 'membershipCode': membershipCode },
                    { 'org_id': org_id },
                    { 'roleId': roleId },
                    { 'startDateRange': startDateRange },
                    { 'endDateRange': endDateRange },
                    { 'commonArrFilter': commonArrFilter },
                    { 'reportType': reportType },
                    { 'activePlugins': activePlugins },
                    { 'RequestDatas': insertRequestData }
                ];

                const getFilterCampaignDatas = await this.incentiveReportCalculation('create', postData, req, ScommonDatas);

                let headerData = getFilterCampaignDatas?.['header'] ?? [];
                let rows = getFilterCampaignDatas?.['list'] ?? [];
                let totalRecords = getFilterCampaignDatas?.['total'] ?? 0;
                let totalpages = getFilterCampaignDatas?.['pages'] ?? 0;
                let currentpage = getFilterCampaignDatas?.['page'] ?? 0;
                message = getFilterCampaignDatas?.['message'] ?? '';
                let requestId = getFilterCampaignDatas['request_id'] ?? 0;

                returnData = {
                    "header" : headerData,
                    "list" : rows,
                    "total" : totalRecords,
                    "pages" : totalpages,
                    "limit" : 10,
                    "page" : currentpage
                };
            }

            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: returnData,
                message: message,
            });

        } catch (error) {
            console.log(error);
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

    async getReportSettingMenu(org_id: number, req: Request, reportType: string) {
        let optionReport = {
            "DR": "Engagement Master",
            "QR": "Incentive Qualification",
            "OR": "Achievable Opportunity List",
            "NR": "Non-Participant"
        };
        let commonArrFilter: string[] = [];
        if(reportType == 'Incentive'){
            let ReportMenuSettingsMenu = await this.incentiveReportsService.getReportSettingMenu({org_id: org_id});
            if (ReportMenuSettingsMenu) {
                const datasettingReportType = JSON.parse(ReportMenuSettingsMenu.datasettingreporttype || '{}');
                const datasettingMenu = JSON.parse(ReportMenuSettingsMenu.datasettingmenu || '{}');
                const filteredOptionReport = Object.keys(optionReport).reduce((acc, key) => {
                    if (datasettingReportType.hasOwnProperty(key)) {
                        acc[key] = optionReport[key];
                    }
                    return acc;
                }, {} as Record<string, string>);
                const headerData = datasettingMenu?.Incentive || [];
                commonArrFilter = Object.values(headerData);
            }
        }
        return commonArrFilter;
    }


    async incentiveReportCalculation(type: any = 'create', postData: any = {}, req: any = {}, commonDatas: any = []) {
        let {
            membershipCode = null,
            org_id = null,
            roleId = null,
            commonArrFilter = [],
            reportType = 'DR',
            activePlugins = {},
            RequestDatas = {},
        } = Object.assign({}, ...commonDatas);

        let filteredCampaignId = RequestDatas?.camp_id || 0;
        let user = req.tokenUser;
        let userId = user.id;
        let totalUsers = 0;
        let userDatasResult:any = {};
        let userDatas = [];
        let wellnesschampion = '';

        let totalRecords = 0;
        let totalpages = 0;
        let currentpage = 1;

        postData.page = postData?.page ?? 1;
        postData.limit = postData?.limit ?? 10;
        postData.search_str = postData?.search_str ?? '';
        let condition = RequestDatas?.condition || '';
        condition = condition.replace(/User\./gi, 'user.');

        if(postData?.search_str && postData?.search_str != ''){
            condition += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '',['full_name'] , false);
        }

        let result = Object.create(null);

        if(roleId == 12){
            let user_condition_i = `Wellnessassignment.org_id = ${org_id} AND Wellnessassignment.user_id = ${user?.id} AND (
            Wellnessassignment.location = user.location AND user.location != '' OR
            Wellnessassignment.department = user.department_id AND user.department_id != '' OR
            Wellnessassignment.state = u_setting.state AND u_setting.state != '' OR
            Wellnessassignment.city = u_setting.city AND u_setting.city != '' OR
            Wellnessassignment.is_global = 1
        )`;
            const joinTableList = [
                {'alias':'u_setting', 'table' : tableConstant.TBL_USERS_SETTINGS, 'on' : `u_setting.user_id = user.id`, 'connect' : 'user', 'type' : 'INNER' },
                {'alias':'Wellnessassignment', 'table' : tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS, 'on' : user_condition_i , 'connect' : 'user', 'type' : 'INNER' },
                {'alias':'location', 'table' : tableConstant.COMPANIES.TBL_LOCATION, 'on' : `location.id = user.location`, 'connect' : 'user', 'type' : 'LEFT' }
            ];

            userDatasResult = await this.campaignDashboardService.getPaginateUsers(condition, ['user.id', 'user.first_name', 'user.last_name', 'user.profile_image', 'user.code', 'user.gender', 'user.dob', 'user.role_id', 'user.on_insurance_plan', 'user.date_of_hire', 'user.department_id', 'user.location', 'user.username'],joinTableList, postData);
            userDatas = userDatasResult?.list ?? [];
            totalRecords = userDatasResult?.total ?? 0;
            totalpages = userDatasResult?.pages ?? 0;
            currentpage = userDatasResult?.page ?? 0;
            totalUsers = userDatas.length;

            if(userDatas && userDatas.length > 0){
                const userIds = userDatas.map(user => user.id);
                const userIdsString = userIds.join(',');
                wellnesschampion = ` AND user.id in (${userIdsString}) `;
            }else{
                wellnesschampion = ' AND user.id = 0 ';
            }
        }else{
            const joinTableList = [
                {'alias':'u_setting', 'table' : tableConstant.TBL_USERS_SETTINGS, 'on' : `u_setting.user_id = user.id`, 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'location', 'table' : tableConstant.COMPANIES.TBL_LOCATION, 'on' : `location.id = user.location`, 'connect' : 'user', 'type' : 'LEFT' }
            ];
            userDatasResult = await this.campaignDashboardService.getPaginateUsers(condition, ['user.id', 'user.first_name', 'user.last_name', 'user.profile_image', 'user.code', 'user.gender', 'user.dob', 'user.role_id', 'user.on_insurance_plan', 'user.date_of_hire', 'user.department_id', 'user.location', 'user.username'],joinTableList , postData);

            userDatas = userDatasResult?.list ?? [];
            totalRecords = userDatasResult?.total ?? 0;
            totalpages = userDatasResult?.pages ?? 0;
            currentpage = userDatasResult?.page ?? 0;
            totalUsers = userDatas.length;

            if(userDatas && userDatas.length > 0){
                const userIds = userDatas.map(user => user.id);
                const userIdsString = userIds.join(',');
                wellnesschampion = ` AND user.id in (${userIdsString}) `;
            }else{
                wellnesschampion = ' AND user.id = 0 ';
            }
        }

        if(totalUsers == 0){
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_NO_MORE_USER_FOUND'));
        }

        const allUsersDOHInfoData: Record<number, number> = Object.fromEntries(
            await Promise.all(
                userDatas
                    .filter(user => user?.date_of_hire)
                    .map(async user => [
                        user.id,
                        await this.commonDateService.DateTimeFormat(user.date_of_hire, 'timestamp')
                    ])
            )
        );

        let filterCampaignIds = (RequestDatas?.camp_id != '') ? RequestDatas?.camp_id : 0;
        let campaginDatas = [];

        if(filterCampaignIds != 0){
            campaginDatas = await this.frontService.getCampaignList(`campaign.organization_id = ${org_id} AND  campaign.id IN (${filterCampaignIds}) AND campaign.status = 1`, { end_date: 'ASC' }, ['campaign']);
        }else{
            campaginDatas = await this.frontService.getCampaignList(`campaign.organization_id = ${org_id} AND campaign.status = 1`, { end_date: 'ASC' }, ['campaign']);
        }

        const sliderSetting = await this.sliderSettingsService.findOne({ org_id: org_id });

        if(campaginDatas.length == 0){
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_CAMPAIGN_RECORD_NOT_FOUND'));
        }

        let campaignData = {};
        let campaignUsers = userDatas;

        for (let campaignRaw of campaginDatas) {
            let campaignId = campaignRaw.id;
            let campaignIdStr = 'C'+campaignRaw.id;

            if(!campaignData[campaignIdStr]){
                campaignData[campaignIdStr] = {};
            }
            if(!campaignData[campaignIdStr]['campaign']){
                campaignData[campaignIdStr]['campaign'] = {};
            }
            if(!campaignData[campaignIdStr]['campaignRewards']){
                campaignData[campaignIdStr]['campaignRewards'] = {};
            }

            campaignData[campaignIdStr]['campaign'] = campaignRaw;
            let getRewardCondition = `reward.campaign_id = ${campaignId} AND reward.status = 1`;
            let orderBy = { order_id: 'ASC' };
            let rewards = await this.campaignDashboardService.getRewardsData(getRewardCondition, orderBy);

            if(rewards && rewards.length > 0) {
                let otherCondition = '';
                let departmentIds = [];
                let locationIds = [];

                if((campaignRaw['department_ids'] != 0 && campaignRaw['department_ids'] != '' && campaignRaw['department_ids'] != null) || (campaignRaw['location_ids'] != 0 && campaignRaw['location_ids'] != '' && campaignRaw['location_ids'] != null)){
                    departmentIds = (campaignRaw?.['department_ids']) ? campaignRaw['department_ids'].split(',') : [];
                    locationIds = (campaignRaw?.['location_ids']) ? campaignRaw['location_ids'].split(',') : [];

                    if(campaignRaw['department_ids'] != 0 && campaignRaw['department_ids'] != '' && campaignRaw['department_ids'] != null){
                        if(campaignRaw['location_ids'] != 0 && campaignRaw['location_ids'] != '' && campaignRaw['location_ids'] != null){
                            campaignUsers = userDatas.filter((user) => {
                                const userLocation = user.location ? user.location.toString() : '';
                                const userDepartment = user.department_id ? user.department_id.toString() : '';
                                return (
                                    locationIds.includes(userLocation) &&
                                    departmentIds.includes(userDepartment)
                                );
                            });
                            otherCondition = `user.department_id in(${campaignRaw['department_ids']}) AND user.location in(${campaignRaw['location_ids']}) AND `;
                        }else{
                            campaignUsers = userDatas.filter((user) => {
                                const userDepartment = user.department_id ? user.department_id.toString() : '';
                                return departmentIds.includes(userDepartment);
                            });
                            otherCondition = `user.department_id in(${campaignRaw['department_ids']}) AND `;
                        }
                    }else{
                        campaignUsers = userDatas.filter((user) => {
                            const userLocation = user.location ? user.location.toString() : '';
                            return locationIds.includes(userLocation);
                        });
                        otherCondition = `user.location in(${campaignRaw['location_ids']}) AND `;
                    }
                }

                let statusCondition = ` AND user.status = '1' `;
                let rewOtherData = [
                    { 'membershipCode' : membershipCode },
                    { 'otherCondition' : otherCondition },
                    { 'company_id' : org_id },
                    { 'campaignId' : campaignId },
                    { 'activePlugins' : activePlugins },
                    { 'campaignId' : campaignId },
                    { 'slider' : sliderSetting },
                    { 'wellnesschampion' : wellnesschampion },
                    { 'statusCondition' : statusCondition },
                    { 'allUsersDOHInfoData' : allUsersDOHInfoData }
                ];
                let rewardDatas = await this.campaignDashboardService.getMultiRewarddatas(10, JSON.parse(JSON.stringify(rewards)), rewOtherData, req);
                let rewardWiseUsers = new Map();
                let camOtherData = [
                    { 'membershipCode' : membershipCode },
                    { 'totalUsers' : campaignUsers.length },
                    { 'userDatas' : userDatas },
                    { 'company_id' : org_id },
                    { 'campaignId' : campaignId },
                    { 'activePlugins' : activePlugins },
                    { 'campaignId' : campaignId }
                ];
                let rewardWiseUserDatas:any = await this.frontCalculationService.getCampaignUserCalculation(4, JSON.parse(JSON.stringify(rewardDatas)), camOtherData, req);
                campaignData[campaignIdStr]['campaignRewards'] = rewardWiseUserDatas;
            }
        }

        const campaignRewardsArray = Object.values(campaignData).flatMap((campaign: any) => Object.values(campaign.campaignRewards || {}));
        let i = 0;
        let rows = [];

        for (let camUser of campaignUsers) {
            let tempRow = [];
            let fullName = '';

            if (commonArrFilter?.length) {
                const firstNameIncluded = commonArrFilter.includes('FIRST NAME');
                const lastNameIncluded = commonArrFilter.includes('LAST NAME');
                if (firstNameIncluded || lastNameIncluded) {
                    fullName = (firstNameIncluded ? camUser.first_name : '') +
                        (lastNameIncluded ? ' ' + camUser.last_name : '');
                }
            } else {
                fullName = `${camUser.first_name} ${camUser.last_name}`;
            }

            tempRow.push(fullName);
            let qualify = false;
            let Aqualify = false;
            let nonPart = false;
            let actRoleId = camUser?.role_id;

            for (let [key, campaignRaw] of Object.entries(campaignRewardsArray)) {
                let campaignId = campaignRaw?.['id'];
                let rewardWiseUserDatas = campaignRaw['Rewards'];

                if(rewardWiseUserDatas.length > 0){
                    for (let reward of rewardWiseUserDatas) {
                        let uTotalAct = 0;
                        if (!reward['complete']) {
                            reward['complete'] = 0;
                        }
                        if (campaignRaw?.['userActivityTotal']?.[camUser?.id]?.['Total']) {
                            uTotalAct = campaignRaw?.['userActivityTotal'][camUser?.id]['Total'];
                        }

                        let totalP = 0;
                        if (campaignRaw?.['userPointsTotal']?.[camUser?.id]?.['Total']) {
                            totalP = Math.round(campaignRaw?.['userPointsTotal']?.[camUser?.id]?.['Total']);
                            if (reward['consider_require'] == 1) {
                                if (campaignRaw?.['userActivityTotal']?.[camUser?.id]?.hasOwnProperty('remainPoints') && campaignRaw?.['userActivityTotal']?.[camUser?.id]?.['remainPoints'] > 0 && totalP > (reward?.['point'] - campaignRaw?.['userActivityTotal']?.[camUser?.id]?.['remainPoints'])) {
                                    totalP = reward['point'] - campaignRaw?.['userActivityTotal']?.[camUser?.id]?.['remainPoints'];
                                } else {
                                    if (campaignRaw?.['userActivityTotal']?.[camUser?.id]?.hasOwnProperty('remainPoints') && totalP > reward['point'] ) {
                                        totalP = reward['point'];
                                    } else {
                                        totalP = totalP;
                                    }
                                }
                                totalP = (totalP < 0) ? 0 : totalP;
                            }
                        }

                        let met = 'No';
                        if(actRoleId == 2){
                            if ((reward['point'] != '' && reward['point'] != 0) || totalP != 0) {
                                if ((campaignRaw?.['totalActivity'] == 0 || reward['consider_require'] == 0) && totalP >= reward['point']) {
                                    met = "Yes";
                                    reward['complete']++;
                                } else {
                                    if ((campaignRaw?.['totalActivity'] <= uTotalAct || reward['consider_require'] == 0) && totalP >= reward['point']) {
                                        met = "Yes";
                                        reward['complete']++;
                                    } else {
                                        met = "No";
                                        qualify = false;
                                    }
                                }
                            } else {
                                met = "No";
                                qualify = false;
                            }
                        }else{
                            if ((reward['pointS'] != '' && reward['pointS'] != 0) || totalP != 0) {
                                if ((campaignRaw?.['totalActivity'] == 0 || reward['consider_require'] == 0) && totalP >= reward['pointS']) {
                                    met = "Yes";
                                    reward['complete']++;
                                } else {
                                    if ((campaignRaw?.['totalActivity'] <= uTotalAct || reward['consider_require'] == 0) && totalP >= reward['pointS']) {
                                        met = "Yes";
                                        reward['complete']++;
                                    } else {
                                        met = "No";
                                        qualify = false;
                                    }
                                }
                            } else {
                                met = "No";
                                qualify = false;
                            }
                        }

                        if (totalP > 0) {
                            Aqualify = true;
                        } else if (totalP == 0) {
                            nonPart = true;
                        }

                        if (campaignRaw?.['user_eligible'] == 0 || camUser?.is_camp_eligible == 1) {
                            if (sliderSetting && sliderSetting?.hide == 1) {
                                tempRow.push(totalP);
                            }
                            tempRow.push(met);
                        } else {
                            if (sliderSetting && sliderSetting?.hide == 1) {
                                tempRow.push('-');
                            }
                            tempRow.push('-');
                        }
                    }
                }
            }

            if (reportType == 'QR') {
                if (qualify) {
                    rows[i] = tempRow;
                    i += 1;
                }
            } else if (reportType == 'OR') {
                if (Aqualify) {
                    rows[i] = tempRow;
                    i += 1;
                }
            } else if (reportType == 'NR') {
                if (nonPart) {
                    rows[i] = tempRow;
                    i += 1;
                }
            } else {
                rows[i] = tempRow;
                i += 1;
            }
        }

        if(postData.page == 1){
            let headerData = [];
            if(commonArrFilter || commonArrFilter.includes('FIRST NAME') || commonArrFilter.includes('LAST NAME')){
                headerData.push('FULL NAME');
            }
            for (let [key, campaignRaw] of Object.entries(campaignRewardsArray)) {
                let rewardWiseUserDatas = campaignRaw['Rewards'];
                for (let reward of rewardWiseUserDatas) {
                    if(sliderSetting && sliderSetting?.hide == 1){
                        headerData.push(`TP for ${reward['name']}`);
                    }
                    headerData.push(`MR for ${reward['name']}`);
                }
            }
            result['header'] = headerData;
        }

        result['list'] = rows;
        result['total'] = totalRecords;
        result['pages'] = totalpages;
        result['limit'] = 10;
        result['page'] = currentpage;

        return result;
    }

    @Post('incentive-report-request-paginate')
    async incentiveReportRequestPaginate(@Req() req: Request, @Res() res: Response, @Body() postData: incentiveReportRequestPaginateInput) {
        try {
            let user =  req.tokenUser;
            let roleId = user.role_id;
            let userId = user.id;
            let orgId = user.org_id;
            const paginationParams: PaginateDto = {
                page: postData?.page || 1,
                limit: postData?.limit || 10,
                orderBy: postData?.orderBy || 'id',
                order: postData?.order || 'ASC'
            }
            let optionReport = {
                "DR": "Engagement Master",
                "QR": "Incentive Qualification",
                "OR": "Achievable Opportunity List",
                "NR": "Non-Participant"
            };
            let result;
            if(roleId == appConstant.ROLE.ADMIN){
                result = await this.incentiveReportsService.commonQueryBuilder(
                    ['incentiveReports.user_id', 'incentiveReports.camp_id', 'incentiveReports.org_id', 'incentiveReports.total_download', 'companies.company_name', 'incentiveReports.file_name', 'incentiveReports.report_type', 'incentiveReports.status', 'incentiveReports.request_date', 'incentiveReports.system_type', 'incentiveReports.id','campaign.id','campaign.campaign_name'],
                    {report_type: In(['DR', 'QR', 'OR', 'NR']), request_source: 0},
                    {'incentiveReports.id': 'DESC'},
                    [
                        {
                            join_table: 'incentiveReports.campaign',
                            alias: 'campaign',
                            table: tableConstant.CAMPAIGN.TBL_CAMPAIGN,
                            on_condition: `FIND_IN_SET(campaign.id, incentiveReports.camp_id) > 0 AND campaign.status = '1'`,
                            join_type: 'left_many',
                        },
                        {
                            join_table: 'incentiveReports.companies',
                            alias: 'companies',
                            table: tableConstant.COMPANIES.TBL_COMPANY,
                            on_condition: `companies.id = incentiveReports.org_id AND companies.status = '1'`,
                            join_type: 'left_one',
                        },
                    ],
                    'getManyAndCount',
                    paginationParams,
                );
            } else {
                let condition = {};
                if(roleId == appConstant.ROLE.BROKER || roleId == appConstant.ROLE.WCH){
                   condition = { user_id: userId, user_role: roleId, report_type: In(['DR', 'QR', 'OR', 'NR']), request_source: 0 }
                }else{
                    condition = { org_id: orgId, user_id: userId, user_role: roleId, report_type: In(['DR', 'QR', 'OR', 'NR']), request_source: 0 }
                }
                result = await this.incentiveReportsService.commonQueryBuilder(
                    ['incentiveReports.user_id', 'incentiveReports.camp_id', 'incentiveReports.org_id', 'incentiveReports.total_download', 'incentiveReports.file_name', 'incentiveReports.report_type', 'incentiveReports.status', 'incentiveReports.request_date', 'incentiveReports.system_type', 'incentiveReports.id','campaign.id','campaign.campaign_name'],
                    condition,
                    {'incentiveReports.id': 'DESC'},
                    [
                        {
                            join_table: 'incentiveReports.campaign',
                            alias: 'campaign',
                            table: tableConstant.CAMPAIGN.TBL_CAMPAIGN,
                            on_condition: `FIND_IN_SET(campaign.id, incentiveReports.camp_id) > 0 AND campaign.status = '1'`,
                            join_type: 'left_many',
                        }
                    ],
                    'getManyAndCount',
                    paginationParams,
                );
            }
            for (let i: number = 0; i < result['list'].length; i++) {
                result['list'][i]['campaignNameList'] = ''
                let labelStatus: string = ''
                if (result['list'][i]['status'] == 1) {
                    labelStatus = await this.translatorService.frontendReadTranslation(req.lang,'Completed', `/LC_MESSAGES/common/common`,`static`)
                }else if (result['list'][i]['status'] == 2) {
                    labelStatus = await this.translatorService.frontendReadTranslation(req.lang,'In Progress', `/LC_MESSAGES/common/common`,`static`)
                } else {
                    labelStatus = await this.translatorService.frontendReadTranslation(req.lang,'Pending', `/LC_MESSAGES/common/common`,`static`)
                }
                if (result['list'][i]?.camp_id == '0') {
                    result['list'][i]['campaignNameList'] = await this.translatorService.frontendReadTranslation(req.lang,'All', `/LC_MESSAGES/common/common`,`static`);
                } else {
                    let campaignArray = []
                    for (let j: number = 0; j < result['list'][i]['campaign'].length; j++) {
                        let campaign = result['list'][i]['campaign'][j]
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`campaign_name_${campaign['id']}`,`/LC_MESSAGES/Campaign/Campaigns/${orgId}/${campaign['id']}`,`dynamic`);
                        campaign['name'] = (customName == '' || customName == `campaign_name_${campaign['id']}`) ? campaign['campaign_name'] : customName;
                        campaignArray.push(campaign.name)
                    }
                    result['list'][i]['campaignNameList'] = campaignArray.join(',').replace(/,\s*/g, ',\n')
                }
                result['list'][i]['label_status'] = labelStatus
                result['list'][i]['companies'] = result['list'][i]['companies']?.['company_name'] || ''
                result['list'][i]['file_name'] = result['list'][i]['file_name'] ? `reports/${result['list'][i]['file_name']}` : ``
                result['list'][i]['report_type'] = optionReport[result['list'][i]['report_type']] || '';
            }
            result['list'] = <any>(
                await this.commonArrayService.formatToDto(IncentiveReportRequestPaginateDto, result['list'], req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
                message: 'success'
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

    @Post('annual-report-paginate')
    async annualReportPaginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCampaignInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if ([appConstant.ROLE.ADMIN, appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER, appConstant.ROLE.ORGADMIN, appConstant.ROLE.WCH].includes(req.tokenUser?.role_id)) {
                // if (!postData?.org_id) {
                //     throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
                // }
                let where = `incentivereports.report_type = 'CRA' `;
                if (postData?.user_id) {
                    where += `AND incentivereports.user_id = '${postData?.user_id}' `;
                }
                if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                    let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id,status: 1},null);
                    if (resultedData.length === 0 || !resultedData.some(item => item.org_id == postData?.org_id)) {
                        return res.status(HttpStatus.OK).json({
                            statusCode: 200,
                            success: 1,
                            error: 0,
                            data: [],
                            message: 'No matching organization data found',
                        });
                    }
                }
                if (postData?.org_id) {
                    where += `AND incentivereports.org_id = '${postData?.org_id}' `;
                }
                if (postData?.user_role) {
                    where += `AND incentivereports.user_role = '${postData?.user_role}' `;
                }
                if (postData?.search_str) {
                    where += `AND(incentivereports.membership_code LIKE '%${postData?.search_str}%' OR incentivereports.email LIKE '%${postData?.search_str}%' OR incentivereports.send_cc_emails LIKE '%${postData?.search_str}%')`;
                }
                const resultedData = await this.incentiveReportsService.paginateList(
                    where,
                    postData,
                );
                resultedData['list'] = <any>(
                    await this.commonArrayService.formatToDto(IncentiveReportsDto, resultedData['list'], req.lang)
                );
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
    
    @Post('update-download-count')
    async updateCount(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let reportRecord =  await this.incentiveReportsService.findOne({id: postData?.id});
            if (!reportRecord) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.incentiveReportsService.update({id: postData?.id},{ total_download: reportRecord['total_download'] + 1 }); 
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Successfully updated the download count")
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

    @Post('report-process-step')
    async reportProcessStep(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {

            const data = await lastValueFrom(this.client.send({ cmd: 'incentive-report' }, postData ?? {}));
            // const data = await lastValueFrom(this.client.send({ cmd: 'org-census-report' }, postData ?? {}));

            const errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_SOMETHING_WENT_WRONG");
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 0,
                error: 1,
                data: data,
                message: errorMessage,
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                    statusCode: 401,
                    success: 0,
                    error: 1,
                    message: error?.message || 'An unexpected error occurred',
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    @Post('campaign-report')
    async campaignReport(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.org_id || !postData?.campaign_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let user =  req.tokenUser;
            let org_id = Number(postData?.org_id) || 0;
            let roleId = user.role_id;
            if(roleId != appConstant.ROLE.ADMIN){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_ACCESS_DENIED'));
            }else{
                let activePlugins = await this.activePluginService.getActivePluginList(org_id);
                if(!activePlugins.includes('Incentive')){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_ACCESS_DENIED'));
                }else{
                    let data = await lastValueFrom(this.client.send({ cmd: 'campaign-report' }, postData));
                    let message = '';
                    let success = 0;
                    let error = 0;
                    if(data?.status == true){
                        data = data?.data || {};
                        message = data?.message || await this.translatorService.frontendReadTranslation(req.lang,'SUCCESS_DATA_FETCHED');
                        success = 1;
                    }else{
                        error = 1;
                        message = data?.message || await this.translatorService.frontendReadTranslation(req.lang,'ERR_SOMETHING_WENT_WRONG');
                        data = {};
                    }
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: success,
                        error: error,
                        data: data,
                        message: message,
                    });
                }
            }
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                    statusCode: 401,
                    success: 0,
                    error: 1,
                    message: error?.message || 'An unexpected error occurred',
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
}
