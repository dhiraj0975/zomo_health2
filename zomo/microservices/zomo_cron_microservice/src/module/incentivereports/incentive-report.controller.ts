import {
    CommonService,
    CompaniesEntity,
    IncentiveReportsEntity,
    UserEntity,
    CronStatus,
    System_Type,
    ActivePluginsEntity,
    tableConstant,
    CommonDateService,
    appConstant,
    CommonFileService,
} from '@common-constants';
import { Controller, Inject } from '@nestjs/common';
import { ClientProxy, MessagePattern } from '@nestjs/microservices';
import { CompanyService } from '../company/company.service';
import { IncentiveReportsService } from '../incentivereports/incentivereports.service';
import { UserService } from '../user/user.service';
import { cronAppConstant, CronCommonService } from '../../common';
import { In } from 'typeorm';
import { ActivePluginService, ReportMenuSettingsService } from '../company';
import { FrontService } from '../campaign/front/front.service';
import { SliderSettingsService } from '../campaign/slidersettings.service';
import { SpouseSettingsService } from '../campaign/spousesettings.service';
import { CampaignDashboardService } from '../campaign/campaigndashboard.service';
import { FrontCalculationService } from '../campaign/front/frontcalculation.service';
import { AutoReportSettingService } from '../autosetting/autoReportSettings.service';
import * as moment from 'moment-timezone';
import { IncentiveReportHelperService } from './incentiveReportHelper.service';
import { lastValueFrom } from 'rxjs/internal/lastValueFrom';
import { CommunicationTemplateTextsService } from 'src/module/communication/templatetexts/communicationtemplatetexts.service';
const path = require('path');

@Controller('incentive-report')
export class IncentiveReportController {
    constructor(
        private readonly commonService: CommonService,
        private readonly userService: UserService,
        private readonly incentiveReportsService: IncentiveReportsService,
        private readonly companyService: CompanyService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
        private readonly cronCommonService: CronCommonService,
        private readonly activePluginService: ActivePluginService,
        private readonly commonDateService: CommonDateService,
        private readonly frontService: FrontService,
        private readonly sliderSettingsService: SliderSettingsService,
        private readonly campaignDashboardService: CampaignDashboardService,
        private readonly frontCalculationService: FrontCalculationService,
        private readonly spouseSettingsService: SpouseSettingsService,
        private readonly autoReportSettingService: AutoReportSettingService,
        private readonly reportMenuSettingsService: ReportMenuSettingsService,
        private readonly incentiveReportHelperService: IncentiveReportHelperService,
        private readonly commonFileService: CommonFileService,
        private readonly templateTextService: CommunicationTemplateTextsService,
    ) {}

    @MessagePattern({ cmd: 'incentive-report' })
    async incentiveReport() {
        try {
            /* Last 2 hour in not complete request status update */
            let uploadStopRequest = await this.incentiveReportsService.update(`created_date < NOW() - INTERVAL 2 HOUR  AND total_download < 4 AND status = 2 AND report_type IN ("DR","QR","OR","NR") AND system_type = ${System_Type.NEW}`, { status: 0 , total_download: () => 'total_download + 1'});
            /* Last 2 hour in not complete request status update */
            const reportWhereClause = {status: 0,report_type: In(["DR","QR","OR","NR"]), system_type: System_Type.NEW };
            let reportData: IncentiveReportsEntity | null = await this.incentiveReportsService.getOne(reportWhereClause,['id','org_id','user_id','user_role','membership_code','condition','report_type','file_name','total_download','request_date','email','is_range','start_date_range','end_date_range','status','camp_id','created_date','updated_date','engagement_report','request_source','email_status','report_setting_id','auto_report_type','auto_report_zip_password','report_item_status','report_item_type','send_cc_emails','request_timezone','request_timezone_time','error_message','system_type','cron_status'], {request_date: "ASC"});
            if (!reportData) {
                return true;
            }
            let reportId = reportData?.id;
            let requestStatusUpdate = {
                status: 2,
            };
            await this.incentiveReportsService.updateRecord(
                { id: reportId },
                requestStatusUpdate,
            );

            let userId = reportData.user_id ?? 0;
            let roleId = reportData.user_role ?? 0;
            let dateRange = reportData.is_range ?? 0;
            let startDateRange = reportData.start_date_range ?? '';
            let endDateRange = reportData.end_date_range ?? '';
            let orgId = reportData.org_id ?? 0;
            let membershipCode = reportData?.membership_code ?? '';
            let reportType =  reportData?.report_type ?? 'DR';
            let condition = reportData?.condition.trimStart().replace(/\bUser\./g, 'users.').replace(/\bLocation\./g, 'location.');
            // condition += ` AND users.id IN (540963,577602) `;
            let reportSource = reportData?.request_source ?? 0;
            let reportSettingId = reportData?.report_setting_id ?? 0;
            let reportItemIds: string[] = reportData?.camp_id ? reportData.camp_id.split(',') : ['0'];

            let companyData = await this.companyService.findOne(`company.id = ${orgId} AND company.status = 1 AND company.deleted = 0`, ['c_company_meta','c_company_settings'], ['company.id','company.code', 'company.company_name', 'companyMeta.zip_report_password', 'companySetting.census_status', 'companySetting.spouse_option']);
            if (!companyData) {
                return true;
            }
            let companyName = companyData?.company_name;
            let zipFilePassword = `${companyData.code}_${companyData.id}`;
            let censusStatus = companyData?.companySetting?.census_status ?? 0;
            let spouseOption = companyData?.companySetting?.spouse_option ?? 0;
            if (companyData?.companyMeta?.zip_report_password && companyData.companyMeta.zip_report_password !== '') {
                zipFilePassword = companyData.companyMeta.zip_report_password;
            }
            let currentUser: UserEntity = await this.userService.getOne(
                { id: userId },
                ['id', 'first_name', 'username', 'email'],
            );
            let sendEmail = currentUser?.email;
            if (reportData?.email) {
                sendEmail = reportData?.email;
            }
            let activePluginData: ActivePluginsEntity | null =
                await this.activePluginService.getOne(
                    { company_id: orgId },
                    ['plugin_name'],
                    { id: 'DESC' },
                );
            let activePlugins: string[] = [];
            if (activePluginData) {
                activePlugins = Object.keys(
                    JSON.parse(activePluginData.plugin_name),
                );
            }
            let statusCondition = ` AND users.status = '1' `;
            // let statusCondition = ` AND users.status = '1' AND users.id IN (540963,577602) `;
            let wellnesschampion = '';
            let userData: UserEntity[] = [];
            let filedArray = ['users.id', 'users.code', 'users.role_id', 'users.is_camp_eligible', 'users.username', 'users.membership_code', 'users.last_name', 'users.first_name', 'users.middle_name', 'users.securitycode', 'users.employeeid', 'users.dob', 'users.on_insurance_plan', 'users.insurance_plan_name', 'users.gender', 'users.date_of_hire', 'users.email', 'users.location', 'users.department_id', 'users.relationship_id', 'userSetting.cphone', 'userSetting.wphone_ext', 'userSetting.jobtitle', 'userSetting.wphone', 'userSetting.hphone', 'userSetting.address', 'userSetting.address2', 'userSetting.state', 'userSetting.zip', 'userSetting.country', 'userSetting.city',  'department.dept_name', 'location.lname', 'location.address1', 'location.address2', 'location.city', 'location.state', 'location.zip', 'location.country' ];
            if(roleId == appConstant.ROLE.WCH){
                let user_condition_i = `wellnessassignment.org_id = ${orgId} AND wellnessassignment.user_id = ${userId} AND (
                    wellnessassignment.location = users.location AND users.location != '' OR
                    wellnessassignment.department = users.department_id AND users.department_id != '' OR
                    wellnessassignment.state = userSetting.state AND userSetting.state != '' OR
                    wellnessassignment.city = userSetting.city AND userSetting.city != '' OR
                    wellnessassignment.is_global = 1
                )`;

                userData = await this.userService.commonQueryBuilder(
                    filedArray,
                    condition,
                    { 'users.id': 'ASC' },
                    [
                        {
                            join_table: 'users.userSetting',
                            alias: 'userSetting',
                            table: tableConstant.TBL_USERS_SETTINGS,
                            on_condition: `userSetting.user_id=users.id`,
                            join_type: 'left_one',
                        },
                        {
                            join_table: 'users.department',
                            alias: 'department',
                            table: tableConstant.COMPANIES.TBL_DEPARTMENT,
                            on_condition: `department.id=users.department_id`,
                            join_type: 'left_one',
                        },
                        {
                            join_table: 'users.location',
                            alias: 'location',
                            table: tableConstant.COMPANIES.TBL_LOCATION,
                            on_condition: `location.id=users.location`,
                            join_type: 'left_one',
                        },
                        {
                            join_table: 'users.wellnessassignment',
                            alias: 'wellnessassignment',
                            table: tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS,
                            on_condition: user_condition_i,
                            join_type: 'inner_many',
                        },
                    ],
                    'getMany',
                );
                if(userData.length > 0){
                    const userIds = userData.map(users => users.id);
                    const userIdsString = userIds.join(',');
                    wellnesschampion =  ` AND user.id in (${userIdsString}) `;
                }else{
                    wellnesschampion = ' AND user.id = 0 ';
                }
            }else{
                userData = await this.userService.commonQueryBuilder(
                    filedArray,
                    condition,
                    { 'users.id': 'ASC' },
                    [
                        {
                            join_table: 'users.userSetting',
                            alias: 'userSetting',
                            table: tableConstant.TBL_USERS_SETTINGS,
                            on_condition: `userSetting.user_id=users.id`,
                            join_type: 'left_one',
                        },
                        {
                            join_table: 'users.department',
                            alias: 'department',
                            table: tableConstant.COMPANIES.TBL_DEPARTMENT,
                            on_condition: `department.id=users.department_id`,
                            join_type: 'left_one',
                        },
                        {
                            join_table: 'users.location',
                            alias: 'location',
                            table: tableConstant.COMPANIES.TBL_LOCATION,
                            on_condition: `location.id=users.location`,
                            join_type: 'left_one',
                        },
                    ],
                    'getMany',
                );
            }
            // wellnesschampion = ` AND user.id in (540963,577602) `;
            if (userData.length == 0) {
                return true;
            }
            let totalUsers = userData.length;
            let campaignUsers = userData;
            const userIds = userData.map(user => user.id);
            const userIdsString = userIds.join(',');
            const allUsersDOHInfoData: Record<number, number> = Object.fromEntries(
                await Promise.all(
                    userData
                    .filter(users => users?.date_of_hire)
                    .map(async users => [
                        users.id,
                        await this.commonDateService.DateTimeFormat(users.date_of_hire, 'timestamp')
                    ])
                )
            );
            let campaginDatas = [];
            if (reportItemIds && Array.isArray(reportItemIds) && reportItemIds.length > 0 && !reportItemIds.includes('0')) {
                campaginDatas = await this.frontService.getCampaignList(`campaign.organization_id = ${orgId} AND  campaign.id IN (${reportItemIds.join(',')}) AND campaign.status = 1`, { end_date : 'ASC' }, ['campaign']);
            } else {
                campaginDatas = await this.frontService.getCampaignList(`campaign.organization_id = ${orgId} AND campaign.status = 1`, { end_date : 'ASC' }, ['campaign']);
            }
            const sliderSetting = await this.sliderSettingsService.findOne({ org_id: orgId });
            const spouseSetting = await this.spouseSettingsService.findOne({ org_id: orgId });
            if(campaginDatas.length == 0){
                return true;
            }else{
                let campaignData = {};
                for (let campaignRaw of campaginDatas) {
                    let campaignId = campaignRaw.id;
                    let campaignIdStr = campaignRaw.id;
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
                                    campaignUsers = userData.filter((user) => {
                                        const userLocation = user.location ? user.location.toString() : '';
                                        const userDepartment = user.department_id ? user.department_id.toString() : '';
                                        return (
                                            locationIds.includes(userLocation) &&
                                            departmentIds.includes(userDepartment)
                                        );
                                    });
                                    otherCondition = `user.department_id in(${campaignRaw['department_ids']}) AND user.location in(${campaignRaw['location_ids']}) AND `;
                                }else{
                                    campaignUsers = userData.filter((user) => {
                                        const userDepartment = user.department_id ? user.department_id.toString() : '';
                                        return (
                                            departmentIds.includes(userDepartment)
                                        );
                                    });
                                    otherCondition = `user.department_id in(${campaignRaw['department_ids']}) AND `;
                                }
                            }else{
                                campaignUsers = userData.filter((user) => {
                                    const userLocation = user.location ? user.location.toString() : '';
                                    return (
                                        locationIds.includes(userLocation)
                                    );
                                });
                                otherCondition = `user.location in(${campaignRaw['location_ids']}) AND `;
                            }
                        }
                        let statusCondition = ` AND user.status = '1' `; // AND user.id = 599823 --- TO BE REMOVED AFTER DEMO ---
                        let rewOtherData = [ { 'membershipCode' : membershipCode }, { 'otherCondition' : otherCondition }, { 'company_id' : orgId }, { 'campaignId' : campaignId },{ 'activePlugins' : activePlugins }, { 'campaignId' : campaignId }, { 'slider' : sliderSetting }, { 'wellnesschampion' : wellnesschampion }, { 'statusCondition' : statusCondition }, { 'allUsersDOHInfoData' : allUsersDOHInfoData }];
                        let rewardDatas = await this.campaignDashboardService.getMultiRewarddatas(10, JSON.parse(JSON.stringify(rewards)), rewOtherData); /* 10 is Org report */
                        let rewardWiseUsers = new Map();
                        let camOtherData = [ { 'membershipCode' : membershipCode }, { 'totalUsers' : campaignUsers.length }, { 'userDatas' : userData }, { 'company_id' : orgId }, { 'campaignId' : campaignId },{ 'activePlugins' : activePlugins }, { 'campaignId' : campaignId }];
                        let rewardWiseUserDatas:any = await this.frontCalculationService.getCampaignUserCalculation(4, JSON.parse(JSON.stringify(rewardDatas)), camOtherData);
                        campaignData[campaignIdStr]['campaignRewards'] = rewardWiseUserDatas;
                    }
                }

                const allUsersInfo: Record<number, number> = Object.fromEntries(
                    await Promise.all(
                        userData
                        .map(async users => [
                            users.code,
                            users.id,
                        ])
                    )
                );
                const campaignRewardsArray = Object.values(campaignData).flatMap((campaign: any) => Object.values(campaign.campaignRewards || {}));

                let headerData = structuredClone(appConstant.INCENTIVE_REPORT_HEADER);
                if(reportSettingId != 0 && reportSettingId != null){
                    let reportSettingData = await this.autoReportSettingService.findOne({ id: reportSettingId, org_id: orgId, status: 1 });
                    if(reportSettingData && reportSettingData.report_fields && (reportSettingData.report_fields != '' && reportSettingData.report_fields != null)){
                        let selectedColumns = Object.values(JSON.parse(reportSettingData.report_fields))  as string[];
                        headerData = selectedColumns;
                    }
                    if(!headerData.includes('USER CODE')){
                        headerData.unshift('USER CODE');
                    }
                }

                let sheetHeaders = JSON.parse(JSON.stringify(headerData));;
                let headerDataManyActual = 0;
                let headerDataManyActualActivity = 0;
                let censusReportField = [];
                let censusReportFieldTemp = {};
                let censusFieldValue: any = {};
                if(roleId == appConstant.ROLE.WCH){
                    sheetHeaders = headerData = headerData.filter(item => item !== 'SOCIAL SECURITY NUMBER');
                    let reportSettingMenu = await this.reportMenuSettingsService.findOne({ org_id: orgId, status: 1 });
                    if (reportSettingMenu && Object.keys(reportSettingMenu).length > 0) {
                        const datasettingmenu = JSON.parse(reportSettingMenu.datasettingmenu || '{}');
                        if (datasettingmenu['Incentive']) {
                            headerData = datasettingmenu['Incentive'];
                        }
                        if (!headerData['User_CODE']) {
                            headerDataManyActual = 1;
                        }
                        if (headerData['allow_data']) {
                            headerDataManyActualActivity = 1;
                            delete headerData['allow_data'];
                        }
                        headerData = Object.values(headerData);
                        if(!headerData.includes('USER CODE')){
                            headerData.unshift('USER CODE');
                        }
                        sheetHeaders = headerData;
                    }
                }else{
                    if (censusStatus == 1) {
                        censusReportField = await this.incentiveReportsService.getCensusCustomFields( { organization_id: orgId, status: 1, include_in_report: 1 }, [ 'id', 'title'] ); 
                        const censusReportFieldIds = censusReportField.map(item => item.id);
                        censusReportFieldTemp = Object.fromEntries(
                            censusReportField.map(item => [item.id, ''])
                        );
                        if(Object.keys(censusReportFieldTemp).length > 0){
                            censusFieldValue = await this.incentiveReportsService.getUserCensusFieldValue( { user_id: In(userIds), field_id: In(censusReportFieldIds) }, [ 'field_id', 'field_value', 'user_id'] );
                            if(censusFieldValue && censusFieldValue.length > 0){
                                censusFieldValue = censusFieldValue.reduce((acc, item) => {
                                    if (!acc[item.user_id]) {
                                        acc[item.user_id] = {};
                                    }
                                    acc[item.user_id][item.field_id] = item.field_value;
                                return acc;
                                }, {} as Record<string, Record<number, string>>);
                            }
                        }
                    }
                }
                if (roleId == appConstant.ROLE.BROKER || roleId == appConstant.ROLE.GLOBALCOACH || roleId == appConstant.ROLE.BROKERADMIN || roleId == appConstant.ROLE.REGIONALADMIN) {
                    sheetHeaders = headerData = headerData.filter(item => item !== 'SOCIAL SECURITY NUMBER');
                }
                let columnsDataArrayTmp = [];
                let rewardsWiseTemp = JSON.parse(JSON.stringify(headerData));
                let rewardsWise = {};
                let rewardsWiseInner = {};
                let columnsDataArrayRwTmp: Record<string, any[]> = {};
                let columnsDataArrayRwTmpInner: Record<string, any[]> = {};
                /* SHEET HEADER CODE */
                    let rewardNameDuplicate = [];
                    let isRewardNameDuplicate = false;
                    if(campaignRewardsArray && campaignRewardsArray.length > 0){
                        for (let [key, campaignRaw] of Object.entries(campaignRewardsArray)) {
                            let rewardId = campaignRaw?.['id'];
                            let rewardIdStr = 'R'+campaignRaw?.['id'];
                            rewardsWise[rewardIdStr] = JSON.parse(JSON.stringify(rewardsWiseTemp));
                            if ((((campaignRaw?.['reward_name'] && campaignRaw['reward_name'].trim() !== '') || (campaignRaw?.['report_tab_name'] && campaignRaw['report_tab_name'].trim() !== ''))) && isRewardNameDuplicate === false) {
                                const rewardName = campaignRaw?.['reward_name']?.substring(0, 25) || '';
                                const reportTabName = campaignRaw?.['report_tab_name']?.substring(0, 25) || '';
                                if (rewardNameDuplicate.includes(rewardName) || rewardNameDuplicate.includes(reportTabName)) {
                                    isRewardNameDuplicate = true;
                                } else {
                                    const nameToAdd = (campaignRaw?.['report_tab_name'] && campaignRaw['report_tab_name'].trim() !== '')
                                    ? campaignRaw['report_tab_name'].substring(0, 25)
                                    : campaignRaw?.['reward_name']?.substring(0, 25) || '';
                                    rewardNameDuplicate.push(nameToAdd);
                                }
                            }
                            if (campaignRaw?.['Campaignactivity'] && campaignRaw?.['Campaignactivity']?.length > 0 && headerDataManyActualActivity === 0) {
                                for (const act of campaignRaw?.['Campaignactivity']) {
                                    const activityName = act?.cust_name?.trim() || act?.activity?.activity_name?.trim() || '';
                                    if (activityName.trim() !== '') {
                                        headerData.push(activityName);
                                        headerData.push(`${activityName} Completion Date`);
                                        rewardsWise[rewardIdStr].push(activityName);
                                        rewardsWise[rewardIdStr].push(`${activityName} Completion Date`);
                                    }
                                }
                            }
                            if (campaignRaw?.['Campaigncategory'] && campaignRaw?.['Campaigncategory']?.length > 0 && headerDataManyActualActivity === 0) {
                                for (const cat of campaignRaw?.['Campaigncategory']) {
                                    if (campaignRaw?.['cat_activity_visibility'] !== 0 && cat?.activity && cat?.activity?.length > 0) {
                                        for (const act of cat.activity) {
                                            const activityName = act?.cust_name?.trim() || act?.activity?.activity_name?.trim() || '';
                                            if (activityName.trim() !== '') {
                                                headerData.push(activityName);
                                                headerData.push(`${activityName} Completion Date`);
                                                rewardsWise[rewardIdStr].push(activityName);
                                                rewardsWise[rewardIdStr].push(`${activityName} Completion Date`);
                                            }
                                        }
                                    }
                                    const categoryName = cat?.cust_name?.trim() || cat?.category?.category_name?.trim() || '';
                                    if (categoryName.trim() !== '') {
                                        headerData.push(categoryName);
                                        rewardsWise[rewardIdStr].push(categoryName);
                                    }
                                }
                            }
                            let temprewardsWiseInner = JSON.parse(JSON.stringify(rewardsWise[rewardIdStr])) || [];
                            if (sliderSetting && sliderSetting?.hide === 1) {
                                rewardsWise[rewardIdStr].push("Total Overall Points");
                            }
                            if (campaignRaw?.['Rewards'] && campaignRaw?.['Rewards']?.length > 0) {
                                for (const rewd of campaignRaw?.['Rewards']) {
                                    let sRewardId = `cash_${rewd.id}`;
                                    if(rewd?.rType == 'insurance'){
                                        sRewardId = `insurance_${rewd.id}`;
                                    }else if(rewd?.rType == 'other'){
                                        sRewardId = `other_${rewd.id}`;
                                    }
                                    rewardsWiseInner[sRewardId] = temprewardsWiseInner;
                                    if (sliderSetting && sliderSetting?.hide === 1) {
                                        headerData.push(`Total Eligible Points For ${rewd.name}`); 
                                    }
                                    headerData.push(`Met All Individual Requirements For ${rewd.name}`);
                                    if (sliderSetting && sliderSetting?.hide === 1) {
                                        if (!rewardsWise[rewardIdStr]) rewardsWise[rewardIdStr] = [];
                                        if (!rewardsWiseInner[sRewardId]) rewardsWiseInner[sRewardId] = [];
                                        rewardsWise[rewardIdStr].push(`Total Eligible Points For ${rewd.name}`);
                                        rewardsWiseInner[sRewardId].push(`Total Eligible Points For ${rewd.name}`);
                                    }
                                    rewardsWiseInner[sRewardId] = rewardsWiseInner[sRewardId] || [];
                                    rewardsWise[rewardIdStr].push(`Met All Individual Requirements For ${rewd.name}`);
                                    rewardsWiseInner[sRewardId].push(`Met All Individual Requirements For ${rewd.name}`);
                                    rewardsWise[rewardIdStr].push(`Met All Individual Requirements For ${rewd.name} Completion Date`);
                                    rewardsWiseInner[sRewardId].push(`Met All Individual Requirements For ${rewd.name} Completion Date`);
                                    rewardsWise[rewardIdStr].push(`Met All Individual Requirements For ${rewd.name} Completion Based on Submission Date`);
                                    rewardsWiseInner[sRewardId].push(`Met All Individual Requirements For ${rewd.name} Completion Based on Submission Date`);
                                }
                                for (const rewds of campaignRaw?.['Rewards']) {
                                    let sRewardId = `cash_${rewds.id}`;
                                    if(rewds?.rType == 'insurance'){
                                        sRewardId = `insurance_${rewds.id}`;
                                    }else if(rewds?.rType == 'other'){
                                        sRewardId = `other_${rewds.id}`;
                                    }
                                    if (spouseSetting && spouseSetting?.hide === 0) {
                                        if (spouseOption && spouseOption === 1) {
                                            rewardsWise[rewardIdStr].push(`Spouse / Domestic Partners of Employee Met All Requirements For ${rewds.name}`);
                                            rewardsWiseInner[sRewardId].push(`Spouse / Domestic Partners of Employee Met All Requirements For ${rewds.name}`);
                                            rewardsWise[rewardIdStr].push(`Spouse / Domestic Partners of Employee Met All Requirements For ${rewds.name} Completion Date`);
                                            rewardsWiseInner[sRewardId].push(`Spouse / Domestic Partners of Employee Met All Requirements For ${rewds.name} Completion Date`);
                                            rewardsWise[rewardIdStr].push(`Spouse / Domestic Partners of Employee Met All Requirements For ${rewds.name} Completion Based on Submission Date`);
                                            rewardsWiseInner[sRewardId].push(`Spouse / Domestic Partners of Employee Met All Requirements For ${rewds.name} Completion Based on Submission Date`);
                                        } else {
                                            rewardsWise[rewardIdStr].push(`Spouse of Employee Met All Requirements For ${rewds.name}`);
                                            rewardsWiseInner[sRewardId].push(`Spouse of Employee Met All Requirements For ${rewds.name}`);
                                            rewardsWise[rewardIdStr].push(`Spouse of Employee Met All Requirements For ${rewds.name} Completion Date`);
                                            rewardsWiseInner[sRewardId].push(`Spouse of Employee Met All Requirements For ${rewds.name} Completion Date`);
                                            rewardsWise[rewardIdStr].push(`Spouse of Employee Met All Requirements For ${rewds.name} Completion Based on Submission Date`);
                                            rewardsWiseInner[sRewardId].push(`Spouse of Employee Met All Requirements For ${rewds.name} Completion Based on Submission Date`);
                                        }
                                        rewardsWise[rewardIdStr].push(`Combined Met All Requirements For ${rewds.name}`);
                                        rewardsWiseInner[sRewardId].push(`Combined Met All Requirements For ${rewds.name}`);
                                        rewardsWise[rewardIdStr].push(`Combined Met All Requirements For ${rewds.name} Completion Date`);
                                        rewardsWiseInner[sRewardId].push(`Combined Met All Requirements For ${rewds.name} Completion Date`);
                                    }
                                    if (spouseOption && spouseOption === 1) {
                                        rewardsWiseInner[sRewardId].push(`Spouse / Domestic Partners`);
                                    } else {
                                        rewardsWiseInner[sRewardId].push(`Spouse`);
                                    }
                                    if (censusReportField && censusReportField?.length > 0) {
                                        for (const censusField of censusReportField) {
                                            const fieldId = censusField.id;
                                            rewardsWiseInner[sRewardId].push(`${censusField.title}`);
                                        }
                                    }
                                }
                            }
                            if (spouseOption && spouseOption === 1) {
                                rewardsWise[rewardIdStr].push("Spouse / Domestic Partners");
                            } else {
                                rewardsWise[rewardIdStr].push("Spouse");
                            }
                            if (censusReportField && censusReportField?.length > 0) {
                                for (const censusField of censusReportField) {
                                    const fieldId = censusField.id;
                                    rewardsWise[rewardIdStr].push(`${censusField.title}`);
                                }
                            }
                        }
                        var tmpCol: string[] = [];
                        var tmpCol1: string[] = [];
                        var tmpColRewd: string[] = [];
                        if (spouseSetting && spouseSetting?.hide === 0) {
                            for (let [key, campaignRaw] of Object.entries(campaignRewardsArray)) {
                                if (campaignRaw?.['Rewards'] && campaignRaw?.['Rewards']?.length > 0) {
                                    for (const rewd of campaignRaw?.['Rewards']) {
                                        if (spouseOption && spouseOption === 1) {
                                            headerData.push(`Spouse / Domestic Partners of Employee Met All Requirements For ${rewd['name']}`);
                                        } else {
                                            headerData.push(`Spouse of Employee Met All Requirements For ${rewd['name']}`);
                                        }
                                        tmpCol.push('No');
                                        headerData.push(`Combined Met All Requirements For ${rewd['name']}`);
                                        tmpCol1.push('No');
                                        tmpColRewd.push(`Met All Individual Requirements For ${rewd['name']}`);
                                    }
                                }
                            }
                        }
                        headerData.push(`Met All Requirements for All Campaigns - Employee`);
                        if (spouseSetting && spouseSetting?.hide === 0) {
                            headerData.push(`Met All Requirements for All Campaigns - Spouse`);
                            headerData.push(`Met All Requirements for All Campaigns - Combined`);
                        }
                        if (sliderSetting && sliderSetting?.hide === 1) {
                            headerData.push(`Total Overall Points`);
                        }
                        if(spouseSetting){
                            if(spouseOption && spouseOption === 1){
                                headerData.push(`Spouse / Domestic Partners`);
                            }else{
                                headerData.push(`Spouse`);
                            }
                        }
                    }
                /* SHEET HEADER CODE */
                let spouses = {};
                let allOverTab = {};
                let userPointsTotalOVL = {};
                let spousesName = [];
                let customDataCodeToId = {};
                let actualMyCode = '';
                let allUsersInfoData = {};
                let allSpouseInfoData = {};
                if (campaignUsers  && campaignUsers?.length > 0) {
                    const { role2Users, otherRoleUsers } = campaignUsers.reduce(
                        (acc, user) => {
                            const key = user?.code || null;
                            const rKey = user?.relationship_id || null;
                            if (user.role_id === 2) acc.role2Users[key] = user;
                            else if(rKey != null) acc.otherRoleUsers[rKey] = user;
                            return acc;
                        },
                        { role2Users: {}, otherRoleUsers: {} } as {
                            role2Users: Record<string, any>;
                            otherRoleUsers: Record<string, any>;
                        },
                    );
                    allUsersInfoData = role2Users || {};
                    allSpouseInfoData = otherRoleUsers || {};
                }
                if (campaignUsers  && campaignUsers?.length > 0) {
                    let sheetUserData: any[] = [[...headerData]];
                    for (const [uid, uDetails] of Object.entries(campaignUsers)) {
                        const tempSheetUserData: Record<string, any> = {};
                        let myCode = uDetails?.code || '';
                        actualMyCode = uDetails?.code || '';
                        let userId = uDetails?.id || '';
                        let actUserId = userId;
                        let userDateOfHire = uDetails?.date_of_hire || '';
                        let userDateOfHireTS = await this.commonDateService.DateTimeFormat(userDateOfHire, 'timestamp', 'YYYY-MM-DD') || 0;
                        let userGender = cronAppConstant.GENDER_MAP[uDetails?.gender?.toLowerCase()] || 0;
                        let userHealthPlan = cronAppConstant.INSURANCE_PLAN[uDetails?.on_insurance_plan.toLowerCase()] || 0;
                        if(censusFieldValue && Object.keys(censusFieldValue)?.length > 0){
                            customDataCodeToId[actualMyCode] = uDetails.id;
                        }
                        let location:any = '';
                        if (uDetails?.['location']?.['lname']) {
                            location = uDetails['location']['lname'];
                        } else {
                            location = uDetails?.['location'] !== 0 ? uDetails?.['location'] : '';
                        }
                        tempSheetUserData['USER CODE'] = actualMyCode;
                        tempSheetUserData['ORGANIZATION'] = companyName;
                        tempSheetUserData['DEPARTMENT'] = uDetails?.['department']?.dept_name ?? '';
                        tempSheetUserData['RELATIONSHIP ID'] =
                        uDetails?.role_id === 16 ? uDetails?.relationship_id : '';
                        tempSheetUserData['USERNAME'] = uDetails?.username ?? '';
                        tempSheetUserData['FIRST NAME'] = uDetails?.first_name ?? '';
                        tempSheetUserData['MIDDLE NAME'] = uDetails?.middle_name ?? '';
                        tempSheetUserData['LAST NAME'] = uDetails?.last_name ?? '';
                        tempSheetUserData['JOB TITLE'] = uDetails?.['userSetting']?.jobtitle ?? '';
                        tempSheetUserData['SOCIAL SECURITY NUMBER'] = Buffer.from(uDetails?.securitycode || '','base64',).toString('utf8');
                        tempSheetUserData['EMPLOYEE ID'] = uDetails?.employeeid ?? '';
                        tempSheetUserData['GENDER'] = cronAppConstant.GENDER[userGender] || '';
                        const formatDate = async (dateStr: any) => {
                        if (!dateStr || dateStr === '0000-00-00') return '';
                            return await this.commonDateService.DateTimeFormat(dateStr, 'MM-DD-YYYY', 'YYYY-MM-DD');
                        };
                        tempSheetUserData['BIRTH DATE'] = await formatDate(uDetails?.dob);
                        tempSheetUserData['DATE OF HIRE'] = await formatDate(uDetails?.date_of_hire);
                        tempSheetUserData['ON HEALTH PLAN'] = userHealthPlan || '';
                        tempSheetUserData['HEALTH PLAN NAME'] = uDetails?.insurance_plan_name ?? '';
                        tempSheetUserData['EMAIL'] = uDetails?.email ?? '';
                        tempSheetUserData['WORK PHONE NUMBER'] = uDetails?.['userSetting']?.wphone ?? '';
                        tempSheetUserData['WORK PHONE EXTENSION'] = uDetails?.['userSetting']?.wphone_ext ?? '';
                        tempSheetUserData['LOCATION'] = location ?? '';
                        tempSheetUserData['WORK ADDRESS1'] = uDetails?.['location']?.['address1'] ?? uDetails?.['userSetting']?.['address'] ?? '';
                        tempSheetUserData['WORK ADDRESS2'] = uDetails?.['location']?.['address2'] ?? uDetails?.['userSetting']?.['address2'] ?? '';
                        tempSheetUserData['WORK CITY'] = uDetails?.['location']?.['city'] ?? uDetails?.['userSetting']?.['city'] ?? '';
                        tempSheetUserData['WORK STATE/PROVINCE'] = uDetails?.['location']?.['state'] ?? uDetails?.['userSetting']?.['state'] ?? '';
                        tempSheetUserData['WORK ZIP/POSTAL CODE'] = uDetails?.['location']?.['zip'] ?? uDetails?.['userSetting']?.['zip'] ?? '';
                        tempSheetUserData['WORK COUNTRY'] = uDetails?.['location']?.['country'] ?? uDetails?.['userSetting']?.['country'] ?? '';
                        tempSheetUserData['HOME PHONE NUMBER'] = uDetails?.['userSetting']?.['hphone'] ?? '';
                        tempSheetUserData['MOBILE PHONE NUMBER'] = uDetails?.['userSetting']?.['cphone'] ?? '';
                        tempSheetUserData['HOME ADDRESS1'] = uDetails?.['userSetting']?.['address'] ?? '';
                        tempSheetUserData['HOME ADDRESS2'] = uDetails?.['userSetting']?.['address2'] ?? '';
                        tempSheetUserData['HOME CITY'] = uDetails?.['userSetting']?.['city'] ?? '';
                        tempSheetUserData['HOME STATE/PROVINCE'] = uDetails?.['userSetting']?.['state'] ?? '';
                        tempSheetUserData['HOME ZIP/POSTAL CODE'] = uDetails?.['userSetting']?.['zip'] ?? '';
                        tempSheetUserData['HOME COUNTRY'] = uDetails?.['userSetting']?.['country'] ?? '';
                        tempSheetUserData['USER TYPE'] = uDetails?.['role_id'] === 2 ? 'Employee' : 'Spouse';
                        let tempSheetUserDataRaw:any = Object.fromEntries(
                            Object.entries(tempSheetUserData).filter(([key]) =>
                                sheetHeaders.includes(key),
                            ),
                        );
                        tempSheetUserDataRaw = Object.values(tempSheetUserDataRaw);
                        let originaltempSheetUserDataRaw = JSON.parse(JSON.stringify(tempSheetUserDataRaw));
                        sheetUserData.push(Object.values(tempSheetUserDataRaw));
                        let actRoleId = 2;
                        let tempRewardCdateR = 'required_by_user';
                        if (uDetails?.role_id === 16) {
                            actRoleId = 16;
                            tempRewardCdateR = 'required_by_spouse';
                        }
                        let allOverRewardSetting: any[] = [];
                        
                        let qualify1 = false;
                        let Aqualify1 = false;
                        let nonPart1 = false;
                        let tmpUserRewardTmp = {}; 
                        let tmpRewardAll = [];
                        for (let [rewardKey, rewardRaw] of Object.entries(campaignRewardsArray)) {
                            let TotalRequiredactivity = 0;
                            let userMeetRequirementDate = '';
                            let qualify = true;
                            let Aqualify = false;
                            let nonPart = false;
                            tmpUserRewardTmp[rewardKey] = [];
                            if(columnsDataArrayRwTmp[rewardKey] == undefined){
                                columnsDataArrayRwTmp[rewardKey] = [];
                            }
                            let afterDeadline = false;
                            let requiredUser = [];
                            let OptionalUser = [];
                            let ComprequiredUser = [];
                            let CompOptionalUser = [];

                            let actOtherData = [ {'rewardKey' : rewardKey}, {'tempRewardCdateR' : tempRewardCdateR}, {'requiredUser' : requiredUser}, { 'OptionalUser' : OptionalUser}, {'ComprequiredUser' : ComprequiredUser}, {'CompOptionalUser' : CompOptionalUser},  {'sliderSetting' : sliderSetting}, {'userDateOfHireTS' : userDateOfHireTS}, {'userDateOfHire' : userDateOfHire}, {'afterDeadline' : afterDeadline}, {'userMeetRequirementDate' : userMeetRequirementDate}, {'headerDataManyActualActivity' : headerDataManyActualActivity}, {'tmpUserRewardTmp' : tmpUserRewardTmp}, {'tmpRewardAll' : tmpRewardAll}, {'TotalRequiredactivity' : TotalRequiredactivity}, { 'rewardHireDateSetting' : Number(rewardRaw?.['hire_date']) ?? 0 } ];
                            if (rewardRaw?.['Campaignactivity'] && rewardRaw?.['Campaignactivity']?.length > 0) {
                                const activityCalDatas = await this.incentiveReportsService.campaignActivityCalculation('user', userId, rewardRaw?.['Campaignactivity'], actOtherData);
                                requiredUser = activityCalDatas.requiredUser;
                                ComprequiredUser = activityCalDatas.ComprequiredUser;
                                OptionalUser = activityCalDatas.OptionalUser;
                                CompOptionalUser = activityCalDatas.CompOptionalUser;
                                afterDeadline = activityCalDatas.afterDeadline;
                                userMeetRequirementDate = activityCalDatas.userMeetRequirementDate;
                                tmpUserRewardTmp = activityCalDatas.tmpUserRewardTmp;
                                tmpRewardAll = activityCalDatas.tmpRewardAll;
                                TotalRequiredactivity = activityCalDatas.TotalRequiredactivity;
                            }

                            if (rewardRaw?.['Campaigncategory'] && rewardRaw?.['Campaigncategory']?.length > 0) {
                                for (const cat of rewardRaw?.['Campaigncategory']) {
                                    const categoryID = cat?.['id'] || 0;
                                    if(rewardRaw?.['cat_activity_visibility'] != 0 && cat?.['activity'] && cat?.['activity']?.length > 0){
                                        let actOtherData = [ {'rewardKey' : rewardKey}, {'tempRewardCdateR' : tempRewardCdateR}, {'requiredUser' : requiredUser}, { 'OptionalUser' : OptionalUser}, {'ComprequiredUser' : ComprequiredUser}, {'CompOptionalUser' : CompOptionalUser},  {'sliderSetting' : sliderSetting}, {'userDateOfHireTS' : userDateOfHireTS}, {'userDateOfHire' : userDateOfHire}, {'afterDeadline' : afterDeadline}, {'userMeetRequirementDate' : userMeetRequirementDate}, {'headerDataManyActualActivity' : headerDataManyActualActivity}, {'tmpUserRewardTmp' : tmpUserRewardTmp}, {'tmpRewardAll' : tmpRewardAll}, {'TotalRequiredactivity' : TotalRequiredactivity}, { 'rewardHireDateSetting' : Number(rewardRaw?.['hire_date']) ?? 0 }];
                                        const activityCalDatas = await this.incentiveReportsService.campaignActivityCalculation('user', userId, cat?.['activity'], actOtherData);
                                        requiredUser = activityCalDatas.requiredUser;
                                        ComprequiredUser = activityCalDatas.ComprequiredUser;
                                        OptionalUser = activityCalDatas.OptionalUser;
                                        CompOptionalUser = activityCalDatas.CompOptionalUser;
                                        afterDeadline = activityCalDatas.afterDeadline;
                                        userMeetRequirementDate = activityCalDatas.userMeetRequirementDate;
                                        tmpUserRewardTmp = activityCalDatas.tmpUserRewardTmp;
                                        tmpRewardAll = activityCalDatas.tmpRewardAll;
                                        TotalRequiredactivity = activityCalDatas.TotalRequiredactivity;
                                    }

                                    let catPoint: string | number = 0;
                                    if (cat?.['id'] == "8") {
                                        for (const [au, siktmp] of Object.entries(cat['usersWise'])) {
                                            if (au == userId) {
                                                catPoint += siktmp['Total'];
                                            }
                                        }
                                    } else {
                                        if (cat?.['usersWise']?.[userId]) {
                                            catPoint += cat?.['usersWise'][userId]['Total'];
                                        }
                                    }

                                    if (sliderSetting && sliderSetting?.['hide'] === 0) {
                                        if (cat?.['max_point'] <= catPoint) {
                                            catPoint = "Yes";
                                        } else {
                                            catPoint = "No";
                                        }
                                    }

                                    if (headerDataManyActualActivity == 0) {
                                        tmpUserRewardTmp[rewardKey].push(catPoint);
                                        tmpRewardAll.push(catPoint);
                                    }
                                }
                            }

                            let totalP = 0;
                            if(rewardRaw?.['userPointsTotalOVL'] && rewardRaw?.['userPointsTotalOVL']?.[userId] && rewardRaw?.['userPointsTotalOVL']?.[userId]?.['Total']){
                                totalP = Math.round(rewardRaw['userPointsTotalOVL'][userId]['Total']);
                            }
                            if (sliderSetting && sliderSetting?.['hide'] === 1) {
                                tmpUserRewardTmp[rewardKey].push(totalP);
                            }
                            if (userPointsTotalOVL[myCode]) {
                                userPointsTotalOVL[myCode] += totalP;
                            } else {
                                userPointsTotalOVL[myCode] = totalP;
                            }

                            let requiredUserMaxDate: any = '';
                            if (requiredUser.length > 0 && requiredUser.some((entry) => Object.keys(entry).length > 0)) {
                                const mergedRequiredUser = requiredUser.reduce((acc, curr) => ({ ...acc, ...curr }), {});
                                const dateKeys = Object.keys(mergedRequiredUser);
                                requiredUserMaxDate = dateKeys
                                .map((key) => moment.utc(key, 'DD-MM-YYYY'))
                                .reduce((latest, current) => (current.isAfter(latest) ? current : latest))
                                .unix();
                            }
                            let userPointArray:any = [...requiredUser, ...OptionalUser];
                            userPointArray = userPointArray.reduce((acc, curr) => {
                                for (const [key, value] of Object.entries(curr)) {
                                if (!acc[key]) {
                                    acc[key] = 0;
                                }
                                acc[key] += value as number; // Sum values for the same date
                                }
                                return acc;
                            }, {} as Record<string, number>);
                            userPointArray = Object.fromEntries(
                                Object.entries(userPointArray).sort(
                                ([dateA], [dateB]) =>
                                    moment(dateA, 'DD-MM-YYYY').diff(moment(dateB, 'DD-MM-YYYY'))
                                )
                            );

                            let ComprequiredUserMaxDate: any = '';
                            if (ComprequiredUser?.length > 0 && ComprequiredUser.some((entry) => Object.keys(entry)?.length > 0)) {
                                const mergedComRequiredUser = ComprequiredUser.reduce((acc, curr) => ({ ...acc, ...curr }), {});
                                const dateKeys = Object.keys(mergedComRequiredUser);
                                ComprequiredUserMaxDate = dateKeys
                                .map((key) => moment.utc(key, 'DD-MM-YYYY'))
                                .reduce((latest, current) => (current.isAfter(latest) ? current : latest))
                                .unix();
                            }
                            let CompUserPointArray:any = [...ComprequiredUser, ...CompOptionalUser];
                            CompUserPointArray = CompUserPointArray.reduce((acc, curr) => {
                                for (const [key, value] of Object.entries(curr)) {
                                if (!acc[key]) {
                                    acc[key] = 0;
                                }
                                acc[key] += value as number; // Sum values for the same date
                                }
                                return acc;
                            }, {} as Record<string, number>);
                            CompUserPointArray = Object.fromEntries(
                                Object.entries(CompUserPointArray).sort(
                                ([dateA], [dateB]) =>
                                    moment(dateA, 'DD-MM-YYYY').diff(moment(dateB, 'DD-MM-YYYY'))
                                )
                            );
                            
                            let tmpRewardTmpInner = JSON.parse(JSON.stringify(tmpUserRewardTmp[rewardKey]));
                            if(rewardRaw?.['Rewards'] && rewardRaw?.['Rewards']?.length > 0){
                                for(const [rewdKey, rewds] of Object.entries(rewardRaw?.['Rewards'])){
                                    let tmpInnerQualify = true;
                                    let tmpInnerAqualify = false;
                                    let tmpInnerNonPart = false;
                                    let tmpInner = `cash_${rewds?.['id']}`;
                                    if(rewds?.['rType'] == 'insurance'){
                                        tmpInner = `insurance_${rewds?.['id']}`;
                                    }else if(rewds?.['rType'] == 'other'){
                                        tmpInner = `other_${rewds?.['id']}`;
                                    }

                                    let uTotalAct = 0;

                                    let reqPoint = rewds['point'];
                                    if (actRoleId == 16) {
                                        reqPoint = rewds['pointS'];
                                    }
                                    if (reqPoint === "") {
                                        reqPoint = 0;
                                    }

                                    if(!rewardRaw?.['Rewards']?.[rewdKey]?.['complete']){
                                        rewardRaw['Rewards'][rewdKey]['complete'] = 0;
                                    }
                                    if(rewardRaw?.['userActivityTotal']?.[userId]?.['Total']){
                                        uTotalAct = rewardRaw['userActivityTotal'][userId]['Total'] ?? 0;
                                    }

                                    let totalP = 0;
                                    if (rewardRaw?.['userPointsTotal']?.[userId]?.['Total']) {
                                        totalP = Math.round(rewardRaw?.['userPointsTotal']?.[userId]?.['Total']);
                                        if (rewds['consider_require'] == 1) {
                                            if(actRoleId == 2){
                                                if (rewardRaw?.['userActivityTotal']?.[userId]?.hasOwnProperty('remainPoints') && rewardRaw?.['userActivityTotal']?.[userId]?.['remainPoints'] > 0 && totalP > (rewds?.['point'] - rewardRaw?.['userActivityTotal']?.[userId]?.['remainPoints'])) {
                                                    totalP = rewds['point'] - rewardRaw?.['userActivityTotal']?.[userId]?.['remainPoints'];
                                                } else {
                                                    if (rewardRaw?.['userActivityTotal']?.[userId]?.hasOwnProperty('remainPoints') && totalP > rewds['point'] ) {
                                                        totalP = rewds['point'];
                                                    }
                                                }
                                            }else{
                                                if (rewardRaw?.['userActivityTotal']?.[userId]?.hasOwnProperty('remainPoints') && rewardRaw?.['userActivityTotal']?.[userId]?.['remainPoints'] > 0 && totalP > (rewds?.['pointS'] - rewardRaw?.['userActivityTotal']?.[userId]?.['remainPoints'])) {
                                                    totalP = rewds['pointS'] - rewardRaw?.['userActivityTotal']?.[userId]?.['remainPoints'];
                                                } else {
                                                    if (rewardRaw?.['userActivityTotal']?.[userId]?.hasOwnProperty('remainPoints') && totalP > rewds['pointS'] ) {
                                                        totalP = rewds['pointS'];
                                                    }
                                                }
                                            }
                                            totalP = (totalP < 0) ? 0 : totalP;
                                        }
                                    }

                                    let met = 'No';
                                    if(actRoleId == 2){
                                        if ((rewds['point'] != '' && rewds['point'] != 0) || totalP != 0) {
                                            if ((rewardRaw?.['totalActivity'] == 0 || rewds['consider_require'] == 0) && totalP >= rewds['point']) {
                                                if (afterDeadline) {
                                                    met = "Yes - After Deadline";
                                                } else {
                                                    met = "Yes";
                                                }
                                                rewds['complete']++;
                                            } else {
                                                if ((rewardRaw?.['totalActivity'] <= uTotalAct || rewds['consider_require'] == 0) && totalP >= rewds['point']) {
                                                    if (afterDeadline) {
                                                        met = "Yes - After Deadline";
                                                    } else {
                                                        met = "Yes";
                                                    }
                                                    rewds['complete']++;
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
                                        if ((rewds['pointS'] != '' && rewds['pointS'] != 0) || totalP != 0) {
                                            if ((rewardRaw?.['totalActivity'] == 0 || rewds['consider_require'] == 0) && totalP >= rewds['pointS']) {
                                                if (afterDeadline) {
                                                    met = "Yes - After Deadline";
                                                } else {
                                                    met = "Yes";
                                                }
                                                rewds['complete']++;
                                            } else {
                                                if ((rewardRaw?.['totalActivity'] <= uTotalAct || rewds['consider_require'] == 0) && totalP >= rewds['pointS']) {
                                                    if (afterDeadline) {
                                                        met = "Yes - After Deadline";
                                                    } else {
                                                        met = "Yes";
                                                    }
                                                    rewds['complete']++;
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
                                        Aqualify = tmpInnerAqualify = true;
                                    } else if (totalP == 0) {
                                        nonPart = tmpInnerNonPart = true;
                                    }
                                    if(!allOverTab[myCode]){
                                        allOverTab[myCode] = {};
                                    }
                                    if(!allOverTab[myCode]['U']){
                                        allOverTab[myCode]['U'] = [];
                                    }
                                    allOverTab[myCode]['U'].push(met);
                                    if(sliderSetting && sliderSetting?.['hide'] === 1){
                                        tmpUserRewardTmp[rewardKey].push(totalP);
                                        if(rewds['max_point_limit'] == 1){
                                            if (rewardRaw?.['userPointsTotalActivityOVL']?.[userId]?.['Total']) {
                                                if (totalP > rewardRaw['userPointsTotalActivityOVL'][userId]['Total']) {
                                                    rewardRaw['userPointsTotalActivityOVL'][userId]['Total'] = totalP;
                                                }
                                                if (rewardRaw?.['totalActivity'] <= uTotalAct && rewardRaw['userPointsTotalActivityOVL'][userId]['Total'] >= rewds['point']) {
                                                    if (afterDeadline) {
                                                        met = "Yes - After Deadline";
                                                    } else {
                                                        met = "Yes";
                                                    }
                                                } else {
                                                    met = "No";
                                                    qualify = tmpInnerQualify = false;
                                                }
                                                tmpRewardAll.push(rewardRaw['userPointsTotalActivityOVL'][userId]['Total']);
                                            } else {
                                                tmpRewardAll.push(totalP);
                                            }
                                        }else{
                                            if (rewds['point'] >= totalP) {
                                                tmpRewardAll.push(totalP);
                                            } else {
                                                tmpRewardAll.push(rewds['point']);
                                            }
                                        }
                                    }
                                    tmpUserRewardTmp[rewardKey].push(met);
                                    tmpRewardAll.push(met);

                                    let rewardComDate = '';
                                    if (userPointArray && Object.keys(userPointArray).length > 0) {
                                        let rewardWiseTotal = 0;
                                        let countiounR = false;
                                        for(const [key, value] of Object.entries(userPointArray)){
                                            rewardWiseTotal += Number(value);
                                            if (rewardWiseTotal >= reqPoint && countiounR == false) {
                                                if (requiredUserMaxDate >= await this.commonDateService.DateTimeFormat(key, 'timestamp', 'DD-MM-YYYY') && rewds['consider_require'] == 1) {
                                                    rewardComDate = await this.commonDateService.DateTimeFormat(requiredUserMaxDate, 'tstodate', 'MM-DD-YYYY');
                                                } else {
                                                    rewardComDate = await this.commonDateService.DateTimeFormat(key, 'MM-DD-YYYY', 'DD-MM-YYYY');
                                                }
                                                countiounR = true;
                                            }
                                        }
                                    }
                                    userMeetRequirementDate = rewardComDate;

                                    let ComprewardComDate = '';
                                    if (CompUserPointArray && Object.keys(CompUserPointArray).length > 0) {
                                        let ComprewardWiseTotal = 0;
                                        let CompcountiounR = false;
                                        for(const [key, value] of Object.entries(CompUserPointArray)){
                                            ComprewardWiseTotal += Number(value);
                                            if (ComprewardWiseTotal >= reqPoint && CompcountiounR == false) {
                                                if (ComprequiredUserMaxDate >= await this.commonDateService.DateTimeFormat(key, 'timestamp', 'DD-MM-YYYY') && rewds['consider_require'] == 1) {
                                                    ComprewardComDate = await this.commonDateService.DateTimeFormat(ComprequiredUserMaxDate, 'tstodate', 'MM-DD-YYYY');
                                                } else {
                                                    ComprewardComDate = await this.commonDateService.DateTimeFormat(key, 'MM-DD-YYYY', 'DD-MM-YYYY');
                                                }
                                                CompcountiounR = true;
                                            }
                                        }
                                    }
                                    if (ComprewardComDate && ComprewardComDate == '') {
                                        ComprewardComDate = rewardComDate;
                                    }
                                    if (met == 'Yes' || met == 'Yes - After Deadline') {
                                        tmpUserRewardTmp[rewardKey].push(userMeetRequirementDate);
                                        tmpUserRewardTmp[rewardKey].push(ComprewardComDate);
                                    } else {
                                        tmpUserRewardTmp[rewardKey].push('');
                                        tmpUserRewardTmp[rewardKey].push('');
                                    }
                                    if(!allOverRewardSetting[rewardKey]){
                                        allOverRewardSetting[rewardKey] = {};
                                    }
                                    if(!allOverRewardSetting[rewardKey][rewdKey]){
                                        allOverRewardSetting[rewardKey][rewdKey] = {};
                                    }
                                    if(!allOverRewardSetting[rewardKey][rewdKey][userId]){
                                        allOverRewardSetting[rewardKey][rewdKey][userId] = {};
                                    }
                                    allOverRewardSetting[rewardKey][rewdKey][userId]['status'] = met;
                                    allOverRewardSetting[rewardKey][rewdKey][userId]['date'] = userMeetRequirementDate;
                                    allOverRewardSetting[rewardKey][rewdKey][userId]['dateBOC'] = ComprewardComDate;
                                    if(!columnsDataArrayRwTmpInner[tmpInner]){
                                        columnsDataArrayRwTmpInner[tmpInner] = [];
                                    }
                                    if (reportType === 'DR' && tmpInnerQualify === true && rewardRaw?.['Rewards'] && rewardRaw?.['Rewards'].length >= 1) {
                                        const lastKey = columnsDataArrayRwTmpInner[tmpInner]?.length || 0;
                                        columnsDataArrayRwTmpInner[tmpInner][lastKey] = JSON.parse(JSON.stringify(tempSheetUserDataRaw));
                                        columnsDataArrayRwTmpInner[tmpInner][lastKey].push(...tmpRewardTmpInner);
                                        const sliceCount = sliderSetting?.['hide'] === 1 ? 4 : 3;
                                        const result = Object.fromEntries(
                                            Object.entries(tmpUserRewardTmp[rewardKey]).slice(-sliceCount)
                                        );
                                        columnsDataArrayRwTmpInner[tmpInner][lastKey] = [
                                            ...columnsDataArrayRwTmpInner[tmpInner][lastKey],
                                            ...Object.values(result),
                                        ];
                                        columnsDataArrayRwTmpInner[tmpInner][lastKey] = Object.assign({}, columnsDataArrayRwTmpInner[tmpInner][lastKey]);
                                    }
                                }
                            }
                            if(reportType === 'QR' || reportType === 'OR' || reportType === 'NR'){
                                let accessReport = reportType === 'QR' ? qualify : (reportType === 'OR' ? Aqualify : nonPart);
                                if (accessReport) {
                                    let lastKey = columnsDataArrayRwTmp[rewardKey]?.length || 0;
                                    columnsDataArrayRwTmp[rewardKey][lastKey] = JSON.parse(JSON.stringify(tempSheetUserDataRaw));
                                    for(const val of tmpUserRewardTmp[rewardKey]){
                                        columnsDataArrayRwTmp[rewardKey][lastKey].push(val);
                                    }
                                    if(reportType === 'QR'){
                                        qualify1 = true;
                                    }else if(reportType === 'OR'){
                                        Aqualify1 = true;
                                    }else if(reportType === 'NR'){
                                        nonPart1 = true;
                                    }
                                }
                            }else{
                                let lastKey = columnsDataArrayRwTmp[rewardKey]?.length || 0;
                                columnsDataArrayRwTmp[rewardKey][lastKey] = JSON.parse(JSON.stringify(tempSheetUserDataRaw));
                                for(const val of tmpUserRewardTmp[rewardKey]){
                                    columnsDataArrayRwTmp[rewardKey][lastKey].push(val);
                                }
                            }
                        }

                        if(reportType === 'QR' || reportType === 'OR' || reportType === 'NR'){
                            let accessReport = reportType === 'QR' ? qualify1 : (reportType === 'OR' ? Aqualify1 : nonPart1);
                            if (accessReport) {
                                let lastKey = columnsDataArrayTmp?.length || 0;
                                columnsDataArrayTmp[lastKey] = JSON.parse(JSON.stringify(tempSheetUserDataRaw));
                                for(const val of tmpRewardAll){
                                    columnsDataArrayTmp[lastKey].push(val);
                                }
                            }
                        }else{
                            let lastKey = columnsDataArrayTmp?.length || 0;
                            columnsDataArrayTmp[lastKey] = JSON.parse(JSON.stringify(tempSheetUserDataRaw));
                            for(const val of tmpRewardAll){
                                columnsDataArrayTmp[lastKey].push(val);
                            }
                        }

                        userDateOfHire = '';
                        userDateOfHireTS = '';
                        if(actRoleId == 16){
                            myCode = uDetails?.relationship_id || '';
                            if(uDetails?.relationship_id && uDetails?.relationship_id != '' && allUsersInfoData?.[uDetails?.relationship_id]){
                                const relUserDetails = allUsersInfoData[uDetails?.relationship_id];
                                userId = relUserDetails?.id || 0;
                                spousesName[uDetails?.relationship_id] = uDetails?.full_name || '';
                                userDateOfHire = relUserDetails?.date_of_hire || '';
                                userDateOfHireTS = await this.commonDateService.DateTimeFormat(userDateOfHire, 'timestamp', 'YYYY-MM-DD') || 0;
                            }
                        }else{
                            if(allSpouseInfoData?.[uDetails?.code]){
                                const relUserDetails = allSpouseInfoData[uDetails?.code];
                                userId = relUserDetails?.id || 0;
                                spousesName[relUserDetails?.code] = uDetails?.full_name || '';
                                userDateOfHire = relUserDetails?.date_of_hire || '';
                                userDateOfHireTS = await this.commonDateService.DateTimeFormat(userDateOfHire, 'timestamp', 'YYYY-MM-DD') || 0;
                                myCode = relUserDetails?.code || '';
                            }else{
                                myCode = '';
                            }
                        }

                        let tmpSpouseRewardTmp = {}; 
                        let tmpRewardAllS = [];
                        for (let [rewardKeyS, rewardRawS] of Object.entries(campaignRewardsArray)) {
                            let TotalRequiredactivityS = 0;
                            let spouseMeetRequirementDate = '';
                            let qualifyS = true;
                            let AqualifyS = false;
                            let nonPartS = false;
                            tmpSpouseRewardTmp[rewardKeyS] = [];
                            if(columnsDataArrayRwTmp[rewardKeyS] == undefined){
                                columnsDataArrayRwTmp[rewardKeyS] = [];
                            }

                            let afterDeadlineS = false;
                            let requiredSpouse = [];
                            let OptionalSpouse = [];
                            let ComprequiredSpouse = [];
                            let CompOptionalSpouse = [];

                            let actOtherData = [ {'rewardKey' : rewardKeyS}, {'tempRewardCdateR' : tempRewardCdateR}, {'requiredUser' : requiredSpouse}, { 'OptionalUser' : OptionalSpouse}, {'ComprequiredUser' : ComprequiredSpouse}, {'CompOptionalUser' : CompOptionalSpouse}, {'sliderSetting' : sliderSetting}, {'userDateOfHireTS' : userDateOfHireTS}, {'userDateOfHire' : userDateOfHire}, {'afterDeadline' : afterDeadlineS}, {'userMeetRequirementDate' : spouseMeetRequirementDate}, {'headerDataManyActualActivity' : headerDataManyActualActivity}, {'tmpUserRewardTmp' : tmpSpouseRewardTmp}, {'tmpRewardAll' : tmpRewardAllS}, {'TotalRequiredactivity' : TotalRequiredactivityS}, { 'rewardHireDateSetting' : Number(rewardRawS?.['hire_date']) ?? 0 } ];
                            if (rewardRawS?.['Campaignactivity'] && rewardRawS?.['Campaignactivity']?.length > 0) {
                                const activityCalDatas = await this.incentiveReportsService.campaignActivityCalculation('spouse', userId, rewardRawS?.['Campaignactivity'], actOtherData);
                                requiredSpouse = activityCalDatas.requiredUser;
                                ComprequiredSpouse = activityCalDatas.ComprequiredUser;
                                OptionalSpouse = activityCalDatas.OptionalUser;
                                CompOptionalSpouse = activityCalDatas.CompOptionalUser;
                                afterDeadlineS = activityCalDatas.afterDeadline;
                                spouseMeetRequirementDate = activityCalDatas.userMeetRequirementDate;
                                tmpSpouseRewardTmp = activityCalDatas.tmpUserRewardTmp;
                                tmpRewardAllS = activityCalDatas.tmpRewardAll;
                                TotalRequiredactivityS = activityCalDatas.TotalRequiredactivity;
                            }

                            if (rewardRawS?.['Campaigncategory'] && rewardRawS?.['Campaigncategory']?.length > 0) {
                                for (const cat of rewardRawS?.['Campaigncategory']) {
                                    const categoryID = cat?.['id'] || 0;
                                    if(rewardRawS?.['cat_activity_visibility'] != 0 && cat?.['activity'] && cat?.['activity']?.length > 0){
                                        let actOtherData = [ {'rewardKey' : rewardKeyS}, {'tempRewardCdateR' : tempRewardCdateR}, {'requiredUser' : requiredSpouse}, { 'OptionalUser' : OptionalSpouse}, {'ComprequiredUser' : ComprequiredSpouse}, {'CompOptionalUser' : CompOptionalSpouse},  {'sliderSetting' : sliderSetting}, {'userDateOfHireTS' : userDateOfHireTS}, {'userDateOfHire' : userDateOfHire}, {'afterDeadline' : afterDeadlineS}, {'userMeetRequirementDate' : spouseMeetRequirementDate}, {'headerDataManyActualActivity' : headerDataManyActualActivity}, {'tmpUserRewardTmp' : tmpSpouseRewardTmp}, {'tmpRewardAll' : tmpRewardAllS}, {'TotalRequiredactivity' : TotalRequiredactivityS}, { 'rewardHireDateSetting' : Number(rewardRawS?.['hire_date']) ?? 0 }];
                                        const activityCalDatas = await this.incentiveReportsService.campaignActivityCalculation('spouse',userId, cat?.['activity'], actOtherData);
                                        requiredSpouse = activityCalDatas.requiredUser;
                                        ComprequiredSpouse = activityCalDatas.ComprequiredUser;
                                        OptionalSpouse = activityCalDatas.OptionalUser;
                                        CompOptionalSpouse = activityCalDatas.CompOptionalUser;
                                        afterDeadlineS = activityCalDatas.afterDeadline;
                                        spouseMeetRequirementDate = activityCalDatas.userMeetRequirementDate;
                                        tmpSpouseRewardTmp = activityCalDatas.tmpUserRewardTmp;
                                        tmpRewardAllS = activityCalDatas.tmpRewardAll;
                                        TotalRequiredactivityS = activityCalDatas.TotalRequiredactivity;
                                    }
                                    let catPoint: string | number = 0;
                                    if (cat?.['usersWise']?.[userId]) {
                                        catPoint += cat?.['usersWise'][userId]['Total'];
                                    }

                                    if (sliderSetting && sliderSetting?.['hide'] === 0) {
                                        if (cat?.['max_point'] <= catPoint) {
                                            catPoint = "Yes";
                                        } else {
                                            catPoint = "No";
                                        }
                                    }
                                }
                            }

                            let requiredSpouseMaxDate: any = '';
                            if (requiredSpouse.length > 0 && requiredSpouse.some((entry) => Object.keys(entry).length > 0)) {
                                const mergedRequiredSpouse = requiredSpouse.reduce((acc, curr) => ({ ...acc, ...curr }), {});
                                const dateKeys = Object.keys(mergedRequiredSpouse);
                                requiredSpouseMaxDate = dateKeys
                                .map((key) => moment.utc(key, 'DD-MM-YYYY'))
                                .reduce((latest, current) => (current.isAfter(latest) ? current : latest))
                                .unix();
                            }
                            let spousePointArray:any = [...requiredSpouse, ...OptionalSpouse];
                            spousePointArray = spousePointArray.reduce((acc, curr) => {
                                for (const [key, value] of Object.entries(curr)) {
                                if (!acc[key]) {
                                    acc[key] = 0;
                                }
                                acc[key] += value as number; // Sum values for the same date
                                }
                                return acc;
                            }, {} as Record<string, number>);
                            spousePointArray = Object.fromEntries(
                                Object.entries(spousePointArray).sort(
                                ([dateA], [dateB]) =>
                                    moment(dateA, 'DD-MM-YYYY').diff(moment(dateB, 'DD-MM-YYYY'))
                                )
                            );

                            let ComprequiredSpouseMaxDate: any = '';
                            if (ComprequiredSpouse?.length > 0 && ComprequiredSpouse.some((entry) => Object.keys(entry)?.length > 0)) {
                                const mergedComRequiredSpouse = ComprequiredSpouse.reduce((acc, curr) => ({ ...acc, ...curr }), {});
                                const dateKeys = Object.keys(mergedComRequiredSpouse);
                                ComprequiredSpouseMaxDate = dateKeys
                                .map((key) => moment.utc(key, 'DD-MM-YYYY'))
                                .reduce((latest, current) => (current.isAfter(latest) ? current : latest))
                                .unix();
                            }
                            let CompSpousePointArray:any = [...ComprequiredSpouse, ...CompOptionalSpouse];
                            CompSpousePointArray = CompSpousePointArray.reduce((acc, curr) => {
                                for (const [key, value] of Object.entries(curr)) {
                                if (!acc[key]) {
                                    acc[key] = 0;
                                }
                                acc[key] += value as number; // Sum values for the same date
                                }
                                return acc;
                            }, {} as Record<string, number>);
                            CompSpousePointArray = Object.fromEntries(
                                Object.entries(CompSpousePointArray).sort(
                                ([dateA], [dateB]) =>
                                    moment(dateA, 'DD-MM-YYYY').diff(moment(dateB, 'DD-MM-YYYY'))
                                )
                            );

                            if(rewardRawS?.['Rewards'] && rewardRawS?.['Rewards']?.length > 0){
                                for(const [rewdKeyS, rewdsS] of Object.entries(rewardRawS?.['Rewards'])){
                                    let sRewardIdS = `cash_${rewdsS?.['id']}`;
                                    let tmpInnerS = `cash_${rewdsS?.['id']}`;
                                    if(rewdsS?.['rType'] == 'insurance'){
                                        tmpInnerS = `insurance_${rewdsS?.['id']}`;
                                    }else if(rewdsS?.['rType'] == 'other'){
                                        tmpInnerS = `other_${rewdsS?.['id']}`;
                                    }

                                    let uTotalActS = 0;
                                    let reqPointS = rewdsS['pointS'];
                                    if (actRoleId == 16) {
                                        reqPointS = rewdsS['point'];
                                    }
                                    if (reqPointS === "") {
                                        reqPointS = 0;
                                    }

                                    if(!rewardRawS?.['Rewards']?.[rewdKeyS]?.['completes']){
                                        rewardRawS['Rewards'][rewdKeyS]['completes'] = 0;
                                    }
                                    if(rewardRawS?.['userActivityTotal']?.[userId]?.['Total']){
                                        uTotalActS = rewardRawS['userActivityTotal'][userId]['Total'] ?? 0;
                                    }
                                    let totalPS = 0;
                                    if (rewardRawS?.['userPointsTotal']?.[userId]?.['Total']) {
                                        totalPS = Math.round(rewardRawS?.['userPointsTotal']?.[userId]?.['Total']);
                                        if (rewdsS['consider_require'] == 1) {
                                            if(actRoleId != 2){
                                                if (rewardRawS?.['userActivityTotal']?.[userId]?.hasOwnProperty('remainPoints') && rewardRawS?.['userActivityTotal']?.[userId]?.['remainPoints'] > 0 && totalPS > (rewdsS?.['point'] - rewardRawS?.['userActivityTotal']?.[userId]?.['remainPoints'])) {
                                                    totalPS = rewdsS['point'] - rewardRawS?.['userActivityTotal']?.[userId]?.['remainPoints'];
                                                } else {
                                                    if (rewardRawS?.['userActivityTotal']?.[userId]?.hasOwnProperty('remainPoints') && totalPS > rewdsS['point'] ) {
                                                        totalPS = rewdsS['point'];
                                                    }
                                                }
                                            }else{
                                                if (rewardRawS?.['userActivityTotal']?.[userId]?.hasOwnProperty('remainPoints') && rewardRawS?.['userActivityTotal']?.[userId]?.['remainPoints'] > 0 && totalPS > (rewdsS?.['pointS'] - rewardRawS?.['userActivityTotal']?.[userId]?.['remainPoints'])) {
                                                    totalPS = rewdsS['pointS'] - rewardRawS?.['userActivityTotal']?.[userId]?.['remainPoints'];
                                                } else {
                                                    if (rewardRawS?.['userActivityTotal']?.[userId]?.hasOwnProperty('remainPoints') && totalPS > rewdsS['pointS'] ) {
                                                        totalPS = rewdsS['pointS'];
                                                    }
                                                }
                                            }
                                            totalPS = (totalPS < 0) ? 0 : totalPS;
                                        }
                                    }
                                    let metS = 'No';
                                    if(actRoleId != 2){
                                        if ((rewdsS['point'] != '' && rewdsS['point'] != 0) || totalPS != 0) {
                                            if ((rewardRawS?.['totalActivity'] == 0) && totalPS >= rewdsS['point']) {
                                                if (afterDeadlineS) {
                                                    metS = "Yes - After Deadline";
                                                } else {
                                                    metS = "Yes";
                                                }
                                            } else {
                                                if ((rewardRawS?.['totalActivity'] <= uTotalActS) && totalPS >= rewdsS['point']) {
                                                    if (afterDeadlineS) {
                                                        metS = "Yes - After Deadline";
                                                    } else {
                                                        metS = "Yes";
                                                    }
                                                } else {
                                                    metS = "No";
                                                    qualifyS = false;
                                                }
                                            }
                                        } else {
                                            metS = "No";
                                            qualifyS = false;
                                        }
                                    }else{
                                        if ((rewdsS['pointS'] != '' && rewdsS['pointS'] != 0) || totalPS != 0) {
                                            if ((rewardRawS?.['totalActivityS'] == 0) && totalPS >= rewdsS['pointS']) {
                                                if (afterDeadlineS) {
                                                    metS = "Yes - After Deadline";
                                                } else {
                                                    metS = "Yes";
                                                }
                                            } else {
                                                if ((rewardRawS?.['totalActivityS'] <= uTotalActS) && totalPS >= rewdsS['pointS']) {
                                                    if (afterDeadlineS) {
                                                        metS = "Yes - After Deadline";
                                                    } else {
                                                        metS = "Yes";
                                                    }
                                                } else {
                                                    metS = "No";
                                                    qualifyS = false;
                                                }
                                            }
                                        } else {
                                            metS = "No";
                                            qualifyS = false;
                                        }
                                    }
                                    if (totalPS > 0) {
                                        AqualifyS = true;
                                    } else if (totalPS == 0) {
                                        nonPartS = true;
                                    }

                                    let rewardComDateS = '';
                                    if (spousePointArray && Object.keys(spousePointArray).length > 0) {
                                        let rewardWiseTotalS = 0;
                                        let countiounRS = false;
                                        for(const [key, value] of Object.entries(spousePointArray)){
                                            rewardWiseTotalS += Number(value);
                                            if (rewardWiseTotalS >= reqPointS && countiounRS == false) {
                                                if (requiredSpouseMaxDate >= await this.commonDateService.DateTimeFormat(key, 'timestamp', 'DD-MM-YYYY') && rewdsS['consider_require'] == 1) {
                                                    rewardComDateS = await this.commonDateService.DateTimeFormat(requiredSpouseMaxDate, 'tstodate', 'MM-DD-YYYY');
                                                } else {
                                                    rewardComDateS = await this.commonDateService.DateTimeFormat(key, 'MM-DD-YYYY', 'DD-MM-YYYY');
                                                }
                                                countiounRS = true;
                                            }
                                        }
                                    }
                                    spouseMeetRequirementDate = rewardComDateS;

                                    let ComprewardComDateS = '';
                                    if (CompSpousePointArray && Object.keys(CompSpousePointArray).length > 0) {
                                        let ComprewardWiseTotalS = 0;
                                        let CompcountiounRS = false;
                                        for(const [key, value] of Object.entries(CompSpousePointArray)){
                                            ComprewardWiseTotalS += Number(value);
                                            if (ComprewardWiseTotalS >= reqPointS && CompcountiounRS == false) {
                                                if (ComprequiredSpouseMaxDate >= await this.commonDateService.DateTimeFormat(key, 'timestamp', 'DD-MM-YYYY') && rewdsS['consider_require'] == 1) {
                                                    ComprewardComDateS = await this.commonDateService.DateTimeFormat(ComprequiredSpouseMaxDate, 'tstodate', 'MM-DD-YYYY');
                                                } else {
                                                    ComprewardComDateS = await this.commonDateService.DateTimeFormat(key, 'MM-DD-YYYY', 'DD-MM-YYYY');
                                                }
                                                CompcountiounRS = true;
                                            }
                                        }
                                    }
                                    if (ComprewardComDateS && ComprewardComDateS == '') {
                                        ComprewardComDateS = rewardComDateS;
                                    }

                                    if ([3, 4, 7].includes(rewardRawS?.['eligibility'])) {
                                        metS = 'Yes';
                                        spouseMeetRequirementDate = '';
                                        ComprewardComDateS = '';
                                    }``

                                    tmpSpouseRewardTmp[rewardKeyS].push(metS);
                                    tmpRewardAllS.push(metS);

                                    if (metS != 'Yes' && metS != 'Yes - After Deadline') {
                                        spouseMeetRequirementDate = '';
                                        ComprewardComDateS = '';
                                    }
                                    if (myCode == "") {
                                        spouseMeetRequirementDate = '';
                                        ComprewardComDateS = '';
                                    } else {
                                        if(!allOverTab[actualMyCode]){
                                            allOverTab[actualMyCode] = {};
                                        }
                                        if(!allOverTab[actualMyCode]['S']){
                                            allOverTab[actualMyCode]['S'] = [];
                                        }
                                        allOverTab[actualMyCode]['S'].push(metS);
                                    }
                                    let spouseMeetRequirementDateTS = (spouseMeetRequirementDate != '') ? await this.commonDateService.DateTimeFormat(spouseMeetRequirementDate, 'timestamp', 'MM-DD-YYYY') : 0;
                                    tmpSpouseRewardTmp[rewardKeyS].push(spouseMeetRequirementDate);
                                    tmpSpouseRewardTmp[rewardKeyS].push(ComprewardComDateS);

                                    if (spouseSetting && spouseSetting?.hide === 0) {
                                        if(columnsDataArrayRwTmp[rewardKeyS].length > 0){
                                            let lastKey = columnsDataArrayRwTmp[rewardKeyS]?.length || 0;
                                            if(columnsDataArrayRwTmp[rewardKeyS]?.[lastKey -1]?.[0] && columnsDataArrayRwTmp[rewardKeyS]?.[lastKey -1]?.[0] == actualMyCode){
                                                if(myCode != ''){
                                                    columnsDataArrayRwTmp[rewardKeyS][lastKey -1].push(metS);
                                                    if (spouseMeetRequirementDate != '') {
                                                        columnsDataArrayRwTmp[rewardKeyS][lastKey -1].push(spouseMeetRequirementDate);
                                                    } else {
                                                        columnsDataArrayRwTmp[rewardKeyS][lastKey -1].push('');
                                                    }
                                                    if (ComprewardComDateS != ' ') {
                                                        columnsDataArrayRwTmp[rewardKeyS][lastKey -1].push(ComprewardComDateS);
                                                    } else {
                                                        columnsDataArrayRwTmp[rewardKeyS][lastKey -1].push('');
                                                    }
                                                }else{
                                                    metS = 'N/A';
                                                    columnsDataArrayRwTmp[rewardKeyS][lastKey -1].push(metS);
                                                    columnsDataArrayRwTmp[rewardKeyS][lastKey -1].push(metS);
                                                    columnsDataArrayRwTmp[rewardKeyS][lastKey -1].push(metS);
                                                }
                                                if(allOverRewardSetting && allOverRewardSetting[rewardKeyS] && allOverRewardSetting[rewardKeyS][rewdKeyS] && allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId] && allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['status'] && allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['date']){
                                                    if(['Yes', 'Yes - After Deadline'].includes(allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['status']) && (['Yes', 'Yes - After Deadline'].includes(metS) || myCode == '')){
                                                        if((allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['status'] == 'Yes' || allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['status'] == 'Yes - After Deadline') || (metS == 'Yes' || metS == 'Yes - After Deadline')){
                                                            if (metS == 'Yes - After Deadline' || allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['status'] == 'Yes - After Deadline') {
                                                                columnsDataArrayRwTmp[rewardKeyS][lastKey -1].push('Yes - After Deadline');
                                                            } else {
                                                                columnsDataArrayRwTmp[rewardKeyS][lastKey -1].push('Yes');
                                                            }
                                                        }else{
                                                            columnsDataArrayRwTmp[rewardKeyS][lastKey -1].push('Yes');
                                                        }
                                                        if (allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['date'] == "" && spouseMeetRequirementDate != "") {
                                                            columnsDataArrayRwTmp[rewardKeyS][lastKey -1].push(spouseMeetRequirementDate);
                                                        } else if (allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['date'] != "" && spouseMeetRequirementDate == "") {
                                                            columnsDataArrayRwTmp[rewardKeyS][lastKey -1].push(allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['date']);
                                                        } else {
                                                            let dateTS = (allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['date'] != '') ? await this.commonDateService.DateTimeFormat(allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['date'], 'timestamp', 'MM-DD-YYYY') : 0;
                                                            if (spouseMeetRequirementDateTS >= dateTS) {
                                                                columnsDataArrayRwTmp[rewardKeyS][lastKey -1].push(spouseMeetRequirementDate);
                                                            } else {
                                                                columnsDataArrayRwTmp[rewardKeyS][lastKey -1].push(allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['date']);
                                                            }
                                                        }
                                                    }else{
                                                        columnsDataArrayRwTmp[rewardKeyS][lastKey -1].push('No');
                                                        columnsDataArrayRwTmp[rewardKeyS][lastKey -1].push('');
                                                    }
                                                }else{
                                                    columnsDataArrayRwTmp[rewardKeyS][lastKey -1].push('No');
                                                    columnsDataArrayRwTmp[rewardKeyS][lastKey -1].push('');
                                                }
                                            }                                            
                                        }

                                        if(reportType === 'QR' && rewardRawS?.['Rewards'] && rewardRawS?.['Rewards']?.length > 1){
                                            if(columnsDataArrayRwTmpInner[tmpInnerS].length > 0){
                                                let lastKey = columnsDataArrayRwTmpInner[tmpInnerS]?.length || 0;
                                                if(columnsDataArrayRwTmpInner[tmpInnerS]?.[lastKey -1]?.[0] && columnsDataArrayRwTmpInner[tmpInnerS]?.[lastKey -1]?.[0] == actualMyCode){
                                                    if(myCode != ''){
                                                        columnsDataArrayRwTmpInner[tmpInnerS][lastKey -1].push(metS);
                                                        if (spouseMeetRequirementDate != '') {
                                                            columnsDataArrayRwTmpInner[tmpInnerS][lastKey -1].push(spouseMeetRequirementDate);
                                                        } else {
                                                            columnsDataArrayRwTmpInner[tmpInnerS][lastKey -1].push('');
                                                        }
                                                    }else{
                                                        metS = 'N/A';
                                                        columnsDataArrayRwTmpInner[tmpInnerS][lastKey -1].push(metS);
                                                        columnsDataArrayRwTmpInner[tmpInnerS][lastKey -1].push(metS);
                                                    }

                                                    if(allOverRewardSetting && allOverRewardSetting[rewardKeyS] && allOverRewardSetting[rewardKeyS][rewdKeyS] && allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId] && allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['status'] && allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['date']){
                                                        if(['Yes', 'Yes - After Deadline'].includes(allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['status']) && (['Yes', 'Yes - After Deadline'].includes(metS) || myCode == '')){
                                                            if((allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['status'] == 'Yes' || allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['status'] == 'Yes - After Deadline') || (metS == 'Yes' || metS == 'Yes - After Deadline')){
                                                                if (metS == 'Yes - After Deadline' || allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['status'] == 'Yes - After Deadline') {
                                                                    columnsDataArrayRwTmpInner[tmpInnerS][lastKey -1].push('Yes - After Deadline');
                                                                } else {
                                                                    columnsDataArrayRwTmpInner[tmpInnerS][lastKey -1].push('Yes');
                                                                }
                                                            }else{
                                                                columnsDataArrayRwTmpInner[tmpInnerS][lastKey -1].push('Yes');
                                                            }
                                                            if (allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['date'] == "" && spouseMeetRequirementDate != "") {
                                                                columnsDataArrayRwTmpInner[tmpInnerS][lastKey -1].push(spouseMeetRequirementDate);
                                                            } else if (allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['date'] != "" && spouseMeetRequirementDate == "") {
                                                                columnsDataArrayRwTmpInner[tmpInnerS][lastKey -1].push(allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['date']);
                                                            } else {
                                                                let dateTS = (allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['date'] != '') ? await this.commonDateService.DateTimeFormat(allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['date'], 'timestamp', 'MM-DD-YYYY') : 0;
                                                                if (spouseMeetRequirementDateTS >= dateTS) {
                                                                    columnsDataArrayRwTmpInner[tmpInnerS][lastKey -1].push(spouseMeetRequirementDate);
                                                                } else {
                                                                    columnsDataArrayRwTmpInner[tmpInnerS][lastKey -1].push(allOverRewardSetting[rewardKeyS][rewdKeyS][actUserId]['date']);
                                                                }
                                                            }
                                                        }else{
                                                            columnsDataArrayRwTmpInner[tmpInnerS][lastKey -1].push('No');
                                                            columnsDataArrayRwTmpInner[tmpInnerS][lastKey -1].push('');
                                                        }
                                                    }else{
                                                        columnsDataArrayRwTmpInner[tmpInnerS][lastKey -1].push('No');
                                                        columnsDataArrayRwTmpInner[tmpInnerS][lastKey -1].push('');
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (myCode != "") {
                            spouses[actualMyCode] = tmpRewardAllS;
                        }
                    }
                }
                if(campaignRewardsArray && campaignRewardsArray.length > 0){
                    if(spouseSetting && spouseSetting?.hide === 0){
                        let index = 0;
                        for(const colRaw of columnsDataArrayTmp){
                            if(spouses[colRaw[0]]){
                                let i = 0;
                                for(const spouseRaw of spouses[colRaw[0]]){
                                    let arraykey = headerData.indexOf(tmpColRewd[i]);
                                    columnsDataArrayTmp[index].push(spouseRaw);
                                    if((columnsDataArrayTmp[index][arraykey] == 'Yes' || columnsDataArrayTmp[index][arraykey] == 'Yes - After Deadline') && (spouseRaw == 'Yes' || spouseRaw == 'Yes - After Deadline')){
                                        if (spouseRaw == 'Yes - After Deadline' || columnsDataArrayTmp[index][arraykey] == 'Yes - After Deadline') {
                                            columnsDataArrayTmp[index].push('Yes - After Deadline');
                                        } else {
                                            columnsDataArrayTmp[index].push('Yes');
                                        }
                                    }else{
                                        columnsDataArrayTmp[index].push('No');
                                    }
                                    i++;
                                }
                            }else{
                                if(tmpCol && tmpCol.length > 0){
                                    let i = 0; 
                                    for(const tmpRaw of tmpCol){
                                        let arraykey = headerData.indexOf(tmpColRewd[i]);
                                        columnsDataArrayTmp[index].push('N/A');
                                        if (columnsDataArrayTmp?.[index]?.[arraykey]) {
                                            columnsDataArrayTmp[index].push(columnsDataArrayTmp[index][arraykey]);
                                        } else {
                                            columnsDataArrayTmp[index].push('No');
                                        }
                                        i++;
                                    }
                                }
                            }

                            if(allOverTab?.[colRaw[0]]?.['U'] !== undefined && (allOverTab?.[colRaw[0]]?.['U'] ?? []).filter((val: string) => !['Yes', 'Yes - After Deadline'].includes(val)).length == 0){
                                if(allOverTab?.[colRaw[0]]?.['U'] !== undefined && (allOverTab?.[colRaw[0]]?.['U'] ?? []).filter((val: string) => !['Yes'].includes(val)).length == 0){
                                    columnsDataArrayTmp[index].push('Yes');
                                }else{
                                    columnsDataArrayTmp[index].push('Yes - After Deadline');
                                }
                            }else{
                                columnsDataArrayTmp[index].push('No');
                            }

                            if(allOverTab?.[colRaw[0]]?.['S'] !== undefined && (allOverTab?.[colRaw[0]]?.['S'] ?? []).filter((val: string) => !['Yes', 'N/A', 'Yes - After Deadline'].includes(val)).length == 0){
                                if(allOverTab?.[colRaw[0]]?.['S'] !== undefined && (allOverTab?.[colRaw[0]]?.['S'] ?? []).filter((val: string) => !['Yes', 'N/A'].includes(val)).length == 0){
                                    columnsDataArrayTmp[index].push('Yes');
                                }else{
                                    columnsDataArrayTmp[index].push('Yes - After Deadline');
                                }
                            }else{
                                if(allOverTab?.[colRaw[0]]?.['S'] !== undefined){
                                    columnsDataArrayTmp[index].push('No');
                                }else{
                                    columnsDataArrayTmp[index].push('N/A');
                                }
                            }
                            const recentValues = columnsDataArrayTmp[index].slice(-2);
                            if(recentValues.filter((val: string) => !['Yes', 'N/A', 'Yes - After Deadline'].includes(val)).length == 0){
                                if(recentValues.filter((val: string) => !['Yes', 'N/A'].includes(val)).length == 0){
                                    columnsDataArrayTmp[index].push('Yes');
                                }else{
                                    columnsDataArrayTmp[index].push('Yes - After Deadline');
                                }
                            }else{
                                columnsDataArrayTmp[index].push('No');
                            }
                            if(sliderSetting && sliderSetting?.hide === 1){
                                let totalP = 0;
                                if (userPointsTotalOVL[colRaw[0]] !== undefined) {
                                    totalP = Math.round(userPointsTotalOVL[colRaw[0]]);
                                }
                                columnsDataArrayTmp[index].push(totalP);
                            }
                            if (spousesName.hasOwnProperty(colRaw[0])) {
                                columnsDataArrayTmp[index].push(spousesName[colRaw[0]]);
                            } else {
                                columnsDataArrayTmp[index].push('');
                            }
                            index++;
                        }
                    }else{
                        let index = 0;
                        for(const colRaw of columnsDataArrayTmp){
                            if(allOverTab?.[colRaw[0]]?.['U'] !== undefined && (allOverTab?.[colRaw[0]]?.['U'] ?? []).filter((val: string) => !['Yes', 'Yes - After Deadline'].includes(val)).length == 0){
                                if(allOverTab?.[colRaw[0]]?.['U'] !== undefined && (allOverTab?.[colRaw[0]]?.['U'] ?? []).filter((val: string) => !['Yes'].includes(val)).length == 0){
                                    columnsDataArrayTmp[index].push('Yes');
                                }else{
                                    columnsDataArrayTmp[index].push('Yes - After Deadline');
                                }
                            }else{
                                columnsDataArrayTmp[index].push('No');
                            }
                            if(sliderSetting && sliderSetting?.hide === 1){
                                let totalP = 0;
                                if (userPointsTotalOVL[colRaw[0]] !== undefined) {
                                    totalP = Math.round(userPointsTotalOVL[colRaw[0]]);
                                }
                                columnsDataArrayTmp[index].push(totalP);
                            }
                            if (spousesName.hasOwnProperty(colRaw[0])) {
                                columnsDataArrayTmp[index].push(spousesName[colRaw[0]]);
                            } else {
                                columnsDataArrayTmp[index].push('');
                            }
                            index++;
                        }
                    }
                }

                if(columnsDataArrayRwTmp && Object.keys(columnsDataArrayRwTmp).length > 0){
                    for(const [cdartKey, cdartRaw] of Object.entries(columnsDataArrayRwTmp)){
                        let index = 0;
                        for(const valRaw of cdartRaw){
                            if(allUsersInfo[valRaw[0]] !== undefined){
                                if (spousesName.hasOwnProperty(valRaw[0])) {
                                    columnsDataArrayRwTmp[cdartKey][index].push(spousesName[valRaw[0]]);
                                } else {
                                    columnsDataArrayRwTmp[cdartKey][index].push('');
                                }
                                if(censusReportField.length > 0){
                                    if(Object.keys(censusFieldValue).length > 0 && customDataCodeToId[valRaw[0]] !== undefined && censusFieldValue.hasOwnProperty(customDataCodeToId[valRaw[0]])){
                                        let dataMerge = {
                                                ...censusReportFieldTemp,
                                                ...censusFieldValue[customDataCodeToId[valRaw[0]]],
                                            };
                                        columnsDataArrayRwTmp[cdartKey][index] = [
                                            ...columnsDataArrayRwTmp[cdartKey][index],
                                            ...Object.values(dataMerge),
                                        ];
                                    }else{
                                        columnsDataArrayRwTmp[cdartKey][index] = [...columnsDataArrayRwTmp[cdartKey][index], ...Object.values(censusReportFieldTemp) ];
                                    }
                                }
                            }else{
                                delete(columnsDataArrayRwTmp[cdartKey][index])
                            }
                            index++;
                        }
                    }
                }
                if(columnsDataArrayRwTmpInner && Object.keys(columnsDataArrayRwTmpInner).length > 0){
                    for(const [cdartKey, cdartRaw] of Object.entries(columnsDataArrayRwTmpInner)){
                        let index = 0;
                        for(const valRaw of cdartRaw){
                            if (spousesName.hasOwnProperty(valRaw[0])) {
                                const arr = Object.values(columnsDataArrayRwTmpInner[cdartKey][index]);
                                arr.push(spousesName[valRaw[0]]);
                                columnsDataArrayRwTmpInner[cdartKey][index] = Object.fromEntries(arr.map((v, i) => [i, v]));
                            } else {
                                const arr = Object.values(columnsDataArrayRwTmpInner[cdartKey][index]);
                                arr.push('');
                                columnsDataArrayRwTmpInner[cdartKey][index] = Object.fromEntries(arr.map((v, i) => [i, v]));
                            }
                            index++;
                        }
                    }
                }

                let sheetDatas = [];
                /* First Sheet Json Array Create Code Start*/
                    let firstSheetData = [];
                    let staticHeaderData = ["","","","",""];
                    let bgColorRaw = [];
                    
                    if(campaignRewardsArray && Object.keys(campaignRewardsArray).length > 0){
                        for (let [key, campaignRaw] of Object.entries(campaignRewardsArray)) {
                            let campID = campaignRaw['campaign_id'] ? campaignRaw['campaign_id'] : 0;
                            let campaignDatas = campaignData[campID] ?? {};
                            let campaignDetails = campaignDatas['campaign'] ? campaignDatas['campaign'] : {};
                            let campaignName = campaignDetails['campaign_name'] ? campaignDetails['campaign_name'] : '';
                            let campaignStartDate = campaignDetails['start_date'] ? await this.commonDateService.DateTimeFormat(campaignDetails['start_date'], 'MM-DD-YYYY', 'YYYY-MM-DD HH:mm:ss') : '';
                            let campaignEndDate = campaignDetails['end_date'] ? await this.commonDateService.DateTimeFormat(campaignDetails['end_date'], 'MM-DD-YYYY', 'YYYY-MM-DD HH:mm:ss') : '';
                            firstSheetData.push(['Campaign name:', campaignName,'','','', [1,2]]);
                            if (campaignRaw?.['Rewards']?.length > 0) {
                                for (const rewd of campaignRaw['Rewards']) {
                                    firstSheetData.push([
                                        'Reward:',
                                        rewd?.['name'] ?? '',
                                        '', '', '', [1, 2]
                                    ]);

                                    firstSheetData.push(['Campaign Start:', campaignStartDate, '', '', '', [1]]);
                                    firstSheetData.push(['Campaign End:', campaignEndDate, '', '', '', [1]]);

                                    firstSheetData.push([
                                        'Total Points Required:',
                                        String(rewd?.['point'] ?? 0),
                                        '', '', '', [1]
                                    ]);

                                    firstSheetData.push([
                                        'Number of Employees Who Have Achieved This Reward:',
                                        String(rewd?.['complete'] ?? 0),
                                        '', '', '', [1]
                                    ]);
                                }

                                firstSheetData.push([' ', '', '', '', '']);
                            }
                            firstSheetData.push(['Activities','Required for User','Required for Spouse','Points For Each','Max Points Per Campaign',[1,2,3,4,5]]);// Empty Row
                            if (campaignRaw?.['Campaignactivity'] && campaignRaw?.['Campaignactivity']?.length > 0) {
                                for (const act of campaignRaw?.['Campaignactivity']) {
                                    const activityName = act?.cust_name?.trim() || act?.activity?.activity_name?.trim() || '';
                                    let reqBu = act?.['required_by_user'] ?? 0;
                                    let reqBs = act?.['required_by_spouse'] ?? 0;
                                    let pforeach = '';
                                    let maxPt = '';
                                    if (sliderSetting && sliderSetting?.['hide'] === 1) {
                                        pforeach = act?.['point_for_each'] ?? 0;
                                        maxPt = act?.['max_point'] ?? 0;
                                    }
                                    firstSheetData.push([activityName, reqBu, reqBs, pforeach, maxPt]);
                                }
                            }
                            if (campaignRaw?.['Campaigncategory'] && campaignRaw?.['Campaigncategory']?.length > 0) {
                                for (const cat of campaignRaw?.['Campaigncategory']) {
                                    const categoryName = cat?.cust_name?.trim() || cat?.category?.category_name?.trim() || '';
                                    let reqBu = cat?.['required_by_user'] ?? 0;
                                    let reqBs = cat?.['required_by_spouse'] ?? 0;
                                    let pforeach = '';
                                    let maxPt = '';
                                    if (sliderSetting && sliderSetting?.['hide'] === 1) {
                                        pforeach = cat?.['point_for_each'] ?? 0;
                                        maxPt = cat?.['max_point'] ?? 0;
                                    }
                                    firstSheetData.push([categoryName, reqBu, reqBs, pforeach, maxPt]);
                                }
                            }
                            firstSheetData.push([' ','','','','']);
                            firstSheetData.push(['','','','','']);
                        }
                    }
                    firstSheetData.unshift(staticHeaderData as string[]);
                    const numericKeyIndices = await this.getNumericKeyIndices(firstSheetData);
                    sheetDatas.push({sheet_name: 'Program Summary', list: firstSheetData, numericKeyIndices: numericKeyIndices});
                    
                /* First Sheet Json Array Create Code End*/

                /* Second Sheet Json Array Create Code Start*/
                    let sheetSecondHeaderData = headerData as string[];
                    if(Object.keys(rewardsWise).length == 1){
                        sheetSecondHeaderData = Object.values(rewardsWise)[0] as string[];
                        columnsDataArrayTmp = (columnsDataArrayRwTmp[0] !== undefined) ? columnsDataArrayRwTmp[0] : [];
                        if (headerDataManyActual == 1 && columnsDataArrayTmp.length > 0) {
                            (sheetSecondHeaderData as string[]).shift();
                            sheetSecondHeaderData = sheetSecondHeaderData;
                            columnsDataArrayTmp = columnsDataArrayRwTmp[0].map((item: any) => {
                                if (item && typeof item === 'object') {
                                    const { 0: removed, ...rest } = item;
                                    return Object.values(rest);
                                }
                                return [];
                            });
                        }
                    }

                    columnsDataArrayTmp.unshift(sheetSecondHeaderData as string[]);
                    let secondSheetTitle = "User Reward Summary";
                    if (Object.keys(rewardsWise).length > 1) {
                        secondSheetTitle = "User Reward Summary";
                    } else {
                        const rewardName = campaignRewardsArray?.[0]?.['reward_name'] ? campaignRewardsArray[0]['reward_name'].substring(0, 25) : '';
                        secondSheetTitle = `${rewardName} Details`;
                    }
                    sheetDatas.push({sheet_name: secondSheetTitle, list: columnsDataArrayTmp});
                /* Second Sheet Json Array Create Code End */

                /* Dynamic Sheet Json Array Create Code Start */
                    if (Object.keys(rewardsWise).length > 1) {
                        let titleR = 0;
                        for(const [keyRw, valRw] of Object.entries(rewardsWise)){
                            let dynamicSheetTitle =
                                (campaignRewardsArray[titleR]?.['report_tab_name'] &&
                                campaignRewardsArray[titleR]?.['report_tab_name'].trim() !== ''
                                    ? campaignRewardsArray[titleR]?.['report_tab_name']
                                    : campaignRewardsArray[titleR]?.['reward_name']
                                ).trim() + ' Details';

                            if (isRewardNameDuplicate === true) {
                                dynamicSheetTitle = `R${titleR + 1}-${dynamicSheetTitle}`;
                            }

                            if (dynamicSheetTitle.length > 31) {
                                dynamicSheetTitle = dynamicSheetTitle.substring(0, 25) + "...";
                            }
                            dynamicSheetTitle = dynamicSheetTitle.replace(/[^A-Za-z0-9\-.]/g, '-');
                            if (!Array.isArray(columnsDataArrayRwTmp[titleR])) {
                                columnsDataArrayRwTmp[titleR] = [];
                            }
                            columnsDataArrayRwTmp[titleR].unshift(rewardsWise[keyRw] as string[]);

                            sheetDatas.push({sheet_name: dynamicSheetTitle, list: columnsDataArrayRwTmp[titleR]});
                            titleR++;
                        }
                    }else{
                        let titleR = 0;
                        if(reportType === 'QR' && campaignRewardsArray && campaignRewardsArray.length > 0 && campaignRewardsArray[0]['Rewards'] !== undefined && campaignRewardsArray[0]['Rewards'].length > 1){
                            for(const rewdRaw of campaignRewardsArray[0]['Rewards']){
                                let keyPrefix = `cash_`;
                                if(rewdRaw?.['rType'] == 'insurance'){
                                    keyPrefix = `insurance_`;
                                }else if(rewdRaw?.['rType'] == 'other'){
                                    keyPrefix = `other_`;
                                }
                                if(headerDataManyActual == 1){
                                    (rewardsWiseInner[keyPrefix + rewdRaw['id']] as string[]).shift();
                                    columnsDataArrayRwTmpInner[keyPrefix + rewdRaw['id']] = columnsDataArrayRwTmpInner[keyPrefix + rewdRaw['id']].map((item: any) => {
                                        if (item && typeof item === 'object') {
                                            const { 0: removed, ...rest } = item;
                                            return Object.values(rest);
                                        }
                                        return [];
                                    });
                                }
                                columnsDataArrayRwTmpInner[keyPrefix + rewdRaw['id']].unshift(rewardsWiseInner[keyPrefix + rewdRaw['id']] as string[]);
                                let dynamicSheetTitle = `Reward-${rewdRaw.name} Details ${titleR + 1}`;
                                if (dynamicSheetTitle.length > 31) {
                                    dynamicSheetTitle = dynamicSheetTitle.substring(0, 25) + "...";
                                }
                                dynamicSheetTitle = dynamicSheetTitle.replace(/[^A-Za-z0-9\-]/g, '-');
                                sheetDatas.push({sheet_name: dynamicSheetTitle, list: columnsDataArrayRwTmpInner[keyPrefix + rewdRaw['id']]});
                                titleR++;
                            }
                        }
                    }
                /* Dynamic Sheet Json Array Create Code End */

                const cName = companyName.replace(/[^A-Za-z0-9_\s-]/g, '_');
                const timeStamp = `${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '_')}_${Date.now()}`;
                let F_filename = '';
                let J_filename = '';
                if (reportType === 'QR') {
                    F_filename = `${cName}_${reportId}_Incentive_Qualification_${timeStamp}.xlsx`;
                    J_filename = `${cName}_${reportId}_Incentive_Qualification_${timeStamp}.json`;
                } else if (reportType === 'OR') {
                    F_filename = `${cName}_${reportId}_Achievable_Opportunity_List_${timeStamp}.xlsx`;
                    J_filename = `${cName}_${reportId}_Achievable_Opportunity_List_${timeStamp}.json`;
                } else if (reportType === 'NR') {
                    F_filename = `${cName}_${reportId}_Non_Participant_${timeStamp}.xlsx`;
                    J_filename = `${cName}_${reportId}_Non_Participant_${timeStamp}.json`;
                } else {
                    F_filename = `${cName}_${reportId}_Engagement_Master_${timeStamp}.xlsx`;
                    J_filename = `${cName}_${reportId}_Engagement_Master_${timeStamp}.json`;
                }
                const directory = path.join(appConstant.COMPANY_INCENTIVE_REPORT, this.commonFileService.sanitizeFileName(orgId));
                F_filename = F_filename.replace(/[\s-]/g, '_');
                J_filename = J_filename.replace(/[\s-]/g, '_');
                const manualReportResult = await this.incentiveReportHelperService.createMultisheetReportlsx(J_filename, directory, sheetDatas, true);
                if (manualReportResult) {
                    let filePath = manualReportResult.file_dir;
                    let MainfolderPrefix = 'reports/';
                    if(reportSource === 1 && reportSettingId !== 0){
                        MainfolderPrefix = 'automatic_report/';
                    }
                    if (await this.commonFileService.fileExist(filePath)) {
                        let bucketFilePath = '';
                        let storeFilePath = '';
                        let fileDirectory = '';
                        if(reportSource === 1 && reportSettingId !== 0){
                            let zipPassword = await this.companyService.getCompanyZipPassword(orgId);
                            let result: any =  await this.commonFileService.createPasswordProtectedZip(filePath, zipPassword.toString(), 'create_zip.py');
                            if (result?.status == 'success') {
                                bucketFilePath = `${MainfolderPrefix}incentive_reports/${reportId}/Incentive_report.zip`;
                                storeFilePath = `incentive_reports/${reportId}/Incentive_report.zip`;
                                fileDirectory = filePath.replace('.xlsx', '.zip');
                            } else {
                                throw new Error(`Report Not created`);
                            }
                        }else{
                            bucketFilePath = `${MainfolderPrefix}incentive/${orgId}/${reportId}/${F_filename}`;
                            storeFilePath = `incentive/${orgId}/${reportId}/${F_filename}`;
                            fileDirectory = filePath;
                        }
                        if(bucketFilePath != '' && storeFilePath != '' && fileDirectory != ''){
                            await lastValueFrom(
                                this.commonMicroservice.send(
                                    { cmd: 'upload_file' },
                                    {
                                        path: path.resolve(fileDirectory),
                                        filename: bucketFilePath,
                                        userBucket: 'private',
                                    },
                                ),
                            );
                            let reportFileUpdate = {
                                file_name: storeFilePath,
                                status: 1,
                            };
                            await this.incentiveReportsService.updateRecord(
                                { id: reportId },
                                reportFileUpdate,
                            );
                            const jsonFilePath = filePath.replace('.xlsx', '.json');
                            await this.commonFileService.removeFileFromLocal(filePath);
                            await this.commonFileService.removeFileFromLocal(jsonFilePath);

                            if(reportSource === 1 && reportSettingId !== 0){
                                const zipFilePath = filePath.replace('.xlsx', '.zip');
                                if (await this.commonFileService.fileExist(zipFilePath)) {
                                    await this.commonFileService.removeFileFromLocal(zipFilePath);
                                }
                            }
                            return true;
                        } else {
                            throw new Error(`File does not exist`);
                        }
                    } else {
                        throw new Error(`File does not exist`);
                    }
                }
            }
        } catch (error) {
            console.log('Error in generateIncentiveReportUserRewardsData:', error);
            this.cronCommonService.errorLog(
                0,
                'incentive-report',
                error?.message,
                error,
            );
            return true;
        }
    }

    async getNumericKeyIndices(dataArray: string[][]): Promise<number[]> {
        const indices: number[] = [];
        let emptyCount = 0;
        let lastAddedIndex = -1;
        
        for (let i = 0; i < dataArray.length; i++) {
            const row = dataArray[i];
            const firstValue = row[0];
            if (firstValue && firstValue !== '') {
                emptyCount = 0;
                indices.push(i);
            }
        }
        
        return indices;
    }
}