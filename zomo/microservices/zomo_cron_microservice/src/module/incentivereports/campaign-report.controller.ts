import {
    ActivePluginsEntity,
    appConstant,
    CommonDateService,
    CommonFileService,
    CommonService,
    tableConstant,
    UserEntity
} from '@common-constants';
import { Controller, Inject } from '@nestjs/common';
import { ClientProxy, MessagePattern } from '@nestjs/microservices';
import { cronAppConstant, CronCommonService } from '../../common';
import { FrontPointsForService } from '../campaign';
import { CampaignDashboardService } from '../campaign/campaigndashboard.service';
import { FrontService } from '../campaign/front/front.service';
import { FrontCalculationService } from '../campaign/front/frontcalculation.service';
import { SliderSettingsService } from '../campaign/slidersettings.service';
import { SpouseSettingsService } from '../campaign/spousesettings.service';
import { ActivePluginService, ReportMenuSettingsService } from '../company';
import { CompanyService } from '../company/company.service';
import { UserService } from '../user/user.service';
import { IncentiveReportHelperService } from './incentiveReportHelper.service';
import { IncentiveReportsService } from './incentivereports.service';
const path = require('path');

@Controller('campaign-report')
export class CampaignReportController {
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
        private readonly reportMenuSettingsService: ReportMenuSettingsService,
        private readonly incentiveReportHelperService: IncentiveReportHelperService,
        private readonly commonFileService: CommonFileService,
        private readonly frontPointsForService: FrontPointsForService,
    ) {}

    @MessagePattern({ cmd: 'campaign-report' })
    async campaignReport(postData: any) {
        try {
            let orgId = postData.org_id ?? 0;
            let campId = postData.campaign_id ?? 0;
            let fromDate = postData.fromDate ?? '';
            let toDate = postData.toDate ?? '';
            let activitiesIds = postData.activitiesIds ?? '';
            let membershipCode = await this.companyService.getCompanyCodeFromId(orgId);
            const campaginDatas = await this.frontService.getCampaignList(`campaign.organization_id = ${orgId} AND campaign.id = ${campId} AND campaign.status = 1`, { end_date : 'ASC' }, ['campaign']);
            if(campaginDatas.length == 0){
                return {
                    status: false,
                    message: 'Sorry! selected campaign not found for this organization.',
                }
            }else{
                let companyData = await this.companyService.findOne(`company.id = ${orgId} AND company.status = 1 AND company.deleted = 0`, ['c_company_meta','c_company_settings'], ['company.id','company.code', 'company.company_name', 'companyMeta.zip_report_password', 'companySetting.census_status', 'companySetting.spouse_option']);
                if (!companyData) {
                    return true;
                }
                let companyName = companyData?.company_name;
                
                let condition = ` users.role_id IN ('2','16') AND users.status = 1 AND users.membership_code = '${membershipCode}'`;
                let statusCondition = ` AND user.status = '1'`;

                let userData: UserEntity[] = [];
                let filedArray = ['users.id', 'users.code', 'users.role_id', 'users.is_camp_eligible', 'users.username', 'users.membership_code', 'users.last_name', 'users.first_name', 'users.middle_name', 'users.securitycode', 'users.employeeid', 'users.dob', 'users.on_insurance_plan', 'users.insurance_plan_name', 'users.gender', 'users.date_of_hire', 'users.email', 'users.location', 'users.department_id', 'users.relationship_id', 'userSetting.cphone', 'userSetting.wphone_ext', 'userSetting.jobtitle', 'userSetting.wphone', 'userSetting.hphone', 'userSetting.address', 'userSetting.address2', 'userSetting.state', 'userSetting.zip', 'userSetting.country', 'userSetting.city',  'department.dept_name', 'location.lname', 'location.address1', 'location.address2', 'location.city', 'location.state', 'location.zip', 'location.country' ];
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
                if (userData.length == 0) {
                    return {
                        status: false,
                        message: 'Users not found for this organization.',
                    }
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
                
                let getActivityCondition = `campaignactivity.campaign_id = ${campId} AND campaignactivity.status = 1`;
                if(activitiesIds != ''){
                    getActivityCondition +=  ` AND campaignactivity.id IN (${activitiesIds})`;
                }

                let myHireData = {};
                myHireData = {
                    'hireDateSetting' : 0,
                    'hireDateCount' : 0,
                    'allUsersDOHInfoData' : allUsersDOHInfoData
                };
                let activity = await this.campaignDashboardService.rewardItemGetDetails('campaign_activity', getActivityCondition);
                let actOtherData = [ { 'dateCalType' : 'activity' }, { 'membershipCode' : membershipCode }, { 'company_id' : orgId }, { 'campaignId' : campId },{ 'myHireData' : myHireData }, { 'activePlugins' : activePlugins }, { 'uType_condition' : ' AND user.role_id IN (2,16)' }, { 'statusCondition' : statusCondition }, { 'filterStartDate' : fromDate }, { 'filterEndDate' : toDate }];
                const returnArray = await this.frontPointsForService.points_for_activities_report(7, activity, actOtherData); 
                activity = JSON.parse(JSON.stringify(returnArray['activity'])) ?? [];
                let userActivityData = JSON.parse(JSON.stringify(returnArray['userData'])) ?? {};
                let activitySheetArray = JSON.parse(JSON.stringify(returnArray['activitySheetArray'])) ?? {};

                let headerData = structuredClone(appConstant.CAMPAIGN_REPORT_HEADER);
                headerData = [...headerData, ...(Object.values(activitySheetArray)) as string[]];
                let sheetUserData: any[] = [];
                if (campaignUsers  && campaignUsers?.length > 0) {
                    for (const [uid, uDetails] of Object.entries(campaignUsers)) {
                        let myCode = uDetails?.code || '';
                        let userId = uDetails?.id || '';
                        let actUserId = userId;
                        if(userActivityData.hasOwnProperty(actUserId)){
                            const tempSheetUserData: Record<string, any> = {};
                            let userDateOfHire = uDetails?.date_of_hire || '';
                            let userDateOfHireTS = await this.commonDateService.DateTimeFormat(userDateOfHire, 'timestamp', 'YYYY-MM-DD') || 0;
                            let userGender = cronAppConstant.GENDER_MAP[uDetails?.gender?.toLowerCase()] || 0;
                            let userHealthPlan = cronAppConstant.INSURANCE_PLAN[uDetails?.on_insurance_plan.toLowerCase()] || 0;
                            let location:any = '';
                            if (uDetails?.['location']?.['lname']) {
                                location = uDetails['location']['lname'];
                            } else {
                                location = uDetails?.['location'] !== 0 ? uDetails?.['location'] : '';
                            }
                            tempSheetUserData['USER CODE'] = myCode;
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
                                    headerData.includes(key),
                                ),
                            );
                            tempSheetUserDataRaw = Object.values(tempSheetUserDataRaw);
                            if(userActivityData.hasOwnProperty(actUserId)){
                                let userActivitys = userActivityData[actUserId];
                                for(const [activityKey, activityValue] of Object.entries(activitySheetArray)){
                                    if(userActivitys.hasOwnProperty(activityKey)){
                                        tempSheetUserDataRaw.push(userActivitys[activityKey]);
                                    }else{
                                        tempSheetUserDataRaw.push('');
                                    }
                                }
                            }
                            sheetUserData.push(tempSheetUserDataRaw);
                        }
                    }
                    sheetUserData.unshift(headerData);
                }
                let sheetDatas: any[] = [];
                sheetDatas.push({sheet_name: 'User Data', list: sheetUserData});
                let timeSheetName = await this.commonDateService.DateTimeFormat('now', 'MM-DD-YYYYHHmmss');
                let F_filename = `${orgId}_Incentive_first_activity_${timeSheetName}.xlsx`;
                let J_filename = `${orgId}_Incentive_first_activity_${timeSheetName}.json`;
                const directory = path.join(appConstant.COMPANY_CAMPAIGN_REPORT, this.commonFileService.sanitizeFileName(orgId));
                F_filename = F_filename.replace(/[\s-]/g, '_');
                J_filename = J_filename.replace(/[\s-]/g, '_');
                const manualReportResult = await this.incentiveReportHelperService.createSheetReportlsx(J_filename, directory, sheetDatas);
                if (manualReportResult) {
                    return {
                        status: true,
                        message: 'Report created successfully.',  
                        data: manualReportResult
                    }
                } else {
                    return {
                        status: false,
                        message: 'Something went wrong while creating report.',
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
}