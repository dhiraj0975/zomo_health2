import {
    appConstant, CampaignEntity,
    CampaignRewardEntity,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonService, SliderSettingsEntity, tableConstant, UserEntity,
} from '@common-constants';

import { UserService } from '../user/user.service';
import {CompanyService} from "../company/company.service";
import {Inject, Injectable} from "@nestjs/common";
import {CronCommonService} from "../../common";
import {
    CampaignDashboardService,
    CampaignRewardService,
    CampaignService,
    EngagementComparisonService,
    SliderSettingsService
} from "../campaign";
import {Activity, Campaign, engagementComparisonReportInterface, FinalActivityData} from "../../interface";
import {ActivePluginService, WellnessAssignmentService} from "../company";
import {In, Not} from "typeorm";
import {UserChallengeHelperService} from "../challenge/userChallengeHelper.service";
import * as path from 'path';
import {lastValueFrom} from "rxjs";
import * as argon2 from "argon2";
import {ClientProxy} from "@nestjs/microservices";


@Injectable()
export class EngagementComparisonReportService {
    constructor(
        private readonly commonService: CommonService,
        private readonly userService: UserService,
        private readonly campaignRewardService: CampaignRewardService,
        private readonly campaignDashboardService: CampaignDashboardService,
        private readonly sliderSettingsService: SliderSettingsService,
        private readonly wellnessAssignmentService: WellnessAssignmentService,
        private readonly companyService: CompanyService,
        private readonly commonDateService: CommonDateService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly cronCommonService: CronCommonService,
        private readonly activePluginService: ActivePluginService,
        private readonly campaignService: CampaignService,
        private readonly userChallengeHelperService: UserChallengeHelperService,
        private readonly engagementComparisonService: EngagementComparisonService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) {}

    async engagementComparisonReport(postData: engagementComparisonReportInterface) {
        try {
            let autoRequestId: number = 0;
            let autoRequest = (postData?.auto_request && this.commonService.isValidNumber(postData?.auto_request)) ? Number(postData?.auto_request) : 0;
            if (autoRequest == 1) {
                autoRequestId = postData?.auto_request_id;
            }
            let reporRequestData;
            if (autoRequest == 1) {
                await this.engagementComparisonService.updateReport();
                reporRequestData = await this.engagementComparisonService.commonQueryBuilder([],
                    `engagementComparison.status = 0 AND company.status = 1 AND company.deleted  = 0 ${(autoRequestId && autoRequestId !== 0 && autoRequestId !== undefined) ? ' AND engagementComparison.id = ' + autoRequestId : ''}`,
                    {'engagementComparison.request_date': 'ASC'},
                    [{
                        join_table: 'engagementComparison.company',
                        alias: 'company',
                        table: tableConstant.COMPANIES.TBL_COMPANY,
                        on_condition: `company.id = engagementComparison.org_id`,
                        join_type: 'left_one',
                    }],'getOne'
                );
                if (reporRequestData) {
                    postData.file_type = 'excel';
                    postData.department_ids = reporRequestData?.department_id ? [Number(reporRequestData.department_id)] : [];
                    postData.location_ids = reporRequestData?.location ? [Number(reporRequestData?.location)]: reporRequestData?.location;
                    postData.org_id = reporRequestData?.org_id;
                }
            }
            let campId: number = postData?.camp_id;
            let membershipCode = postData?.user?.membership_code;
            let departmentIds: number[] = postData.department_ids;
            let locationIds: number[] = postData.location_ids;
            let date: string = postData.date;
            let userType: number = postData.user_type;
            let onInsurancePlan: string = postData.on_insurance_plan;
            let terminatedUsers: number = postData.terminated_users;
            let orgId: number = postData.org_id
            let campaignRewardData: CampaignRewardEntity[] = await this.campaignRewardService.getAll({campaign_id: campId,status: Not(2)},[],{order_id: "ASC"});
            const activePlugins = await this.activePluginService.getActivePluginList(orgId);
            let sliderSettingsData: SliderSettingsEntity = await this.sliderSettingsService.findOne({org_id: orgId,status: Not(2)})

            let where = '';
            let userWhere = {}
            let statusCondition = ` AND user.status = '1'`;
            if (postData?.terminated_users === 2) {
                where += ` AND users.status = '1'`
                userWhere['status'] = '1';
            }
            if (['Yes','No'].includes(onInsurancePlan)) {
                where += ` AND users.on_insurance_plan = ${onInsurancePlan}`;
                userWhere['on_insurance_plan'] = onInsurancePlan;
            }
            if ([2,16].includes(userType)) {
                where += ` AND users.role_id = ${userType}`;
                userWhere['role_id'] = userType;
                userWhere['membership_code'] = membershipCode;
            } else {
                userWhere['role_id'] = In([2,16]);
                userWhere['membership_code'] = membershipCode;
            }
            if (departmentIds?.length > 0) {
                where += ` AND users.department_id IN(${departmentIds.join(',')})`
                statusCondition += ` AND user.department_id IN(${departmentIds.join(',')})`
                userWhere['department_id'] = In(departmentIds);
            }
            if (locationIds?.length > 0) {
                where += ` AND users.location IN(${locationIds})`
                statusCondition += ` AND user.location IN(${locationIds.join(',')})`
                userWhere['location'] = In(locationIds);
            }
            let wellnessChampion= '';
            let userCount: number;
            if (postData?.user?.role_id == appConstant.ROLE.WCH) {
                let data = await this.wellnessAssignmentService.commonQueryBuilder(['users.id AS id'],where,{},
                    [{
                        join_table: 'wellnessAssignment.users',
                        alias: 'users',
                        table: tableConstant.TBL_USERS,
                        on_condition: `wellnessAssignment.org_id = ${orgId} AND wellnessAssignment.user_id = ${postData.user.user_id} OR (wellnessAssignment.location = users.location AND wellnessAssignment.department = users.department_id AND wellnessAssignment.state = users.state AND wellnessAssignment.city = users.city AND wellnessAssignment.is_global = '1')`,
                        join_type: 'left_one',
                    }],
                    'getMany',
                    {},
                    'users.id'
                )
                userCount = data.length
                if (data && data.length > 0) {
                    const userIds = data.map(user => user.id);
                    const userIdsString = userIds.join(',');
                    wellnessChampion = ` AND user.id in (${userIdsString}) `;
                } else {
                    wellnessChampion = ' AND user.id = 0 ';
                }
                }else{
                    userCount = await this.userService.getCount(userWhere)
                }
            if (userCount) {
                let otherCondition = '';
                let campaignServiceData: CampaignEntity | null = await this.campaignService.getOne({organization_id: orgId,id: campId},['department_ids','location_ids'])
                if (campaignServiceData) {
                    if (campaignServiceData.department_ids?.length > 0 && campaignServiceData.department_ids != '0') {
                        otherCondition = `user.department_id IN(${campaignServiceData.department_ids}) AND `
                    }
                    if (campaignServiceData.location_ids?.length > 0 && campaignServiceData.location_ids != '0') {
                        otherCondition = `user.location IN(${campaignServiceData.location_ids}) AND `
                    }
                }
                let dateRange = 0,firstStartDate: string,firstEndDate: string,secondStartDate: string,secondEndDate: string,thirdStartDate: string,thirdEndDate: string;

                if (date) {
                    dateRange = 2;
                    firstEndDate = await this.commonDateService.DateTimeFormat(date, 'YYYY-MM-DD','DD-MM-YYYY');
                    firstStartDate = await this.commonDateService.DateTimeFormat(date, 'YYYY-MM-DD','DD-MM-YYYY');
                    const firstStart = new Date(firstStartDate);
                    const oneYearDec = new Date(firstStart);
                    oneYearDec.setFullYear(oneYearDec.getFullYear() - 1);
                    secondEndDate = await this.commonDateService.DateTimeFormat(oneYearDec, 'YYYY-MM-DD');
                    oneYearDec.setDate(oneYearDec.getDate() + 1);
                    firstStartDate = await this.commonDateService.DateTimeFormat(oneYearDec, 'YYYY-MM-DD');
                    const secOneYearDec = new Date(oneYearDec);
                    secOneYearDec.setFullYear(secOneYearDec.getFullYear() - 1);
                    secOneYearDec.setDate(secOneYearDec.getDate() + 1);
                    secondStartDate = await this.commonDateService.DateTimeFormat(secOneYearDec,'YYYY-MM-DD');
                    const firstEnd = new Date(firstEndDate);
                    const thirdStart = new Date(firstEnd);
                    thirdStart.setDate(thirdStart.getDate() + 1);
                    thirdStartDate = await this.commonDateService.DateTimeFormat(thirdStart, 'YYYY-MM-DD');
                    thirdEndDate = await this.commonDateService.DateTimeFormat(new Date(), 'YYYY-MM-DD');
                }

                let rowCampaignData = [{ 'membershipCode': membershipCode }, { 'otherCondition': otherCondition }, { 'company_id': postData?.user?.org_id }, { 'campaignId': campId }, { 'activePlugins': activePlugins }, { 'slider': sliderSettingsData }, { 'wellnesschampion': wellnessChampion }, { 'statusCondition': statusCondition }, { 'dateRange': dateRange }, { 'filterStartDate': firstStartDate }, { 'filterEndDate': firstEndDate }];
                let currentCampaign = await this.campaignDashboardService.getMultiRewarddatas(8, JSON.parse(JSON.stringify(campaignRewardData)), rowCampaignData);

                let row2CampaignData = [{ 'membershipCode': membershipCode }, { 'otherCondition': otherCondition }, { 'company_id': postData?.user?.org_id }, { 'campaignId': campId }, { 'activePlugins': activePlugins }, { 'slider': sliderSettingsData }, { 'wellnesschampion': wellnessChampion }, { 'statusCondition': statusCondition }, { 'dateRange': dateRange }, { 'filterStartDate': secondStartDate }, { 'filterEndDate': secondEndDate }];
                let current2Campaign = await this.campaignDashboardService.getMultiRewarddatas(8, JSON.parse(JSON.stringify(campaignRewardData)), row2CampaignData);

                let row3CampaignData = [{ 'membershipCode': membershipCode }, { 'otherCondition': otherCondition }, { 'company_id': postData?.user?.org_id }, { 'campaignId': campId }, { 'activePlugins': activePlugins }, { 'slider': sliderSettingsData }, { 'wellnesschampion': wellnessChampion }, { 'statusCondition': statusCondition }, { 'dateRange': dateRange }, { 'filterStartDate': thirdStartDate }, { 'filterEndDate': thirdEndDate }];
                let current3Campaign = await this.campaignDashboardService.getMultiRewarddatas(8, JSON.parse(JSON.stringify(campaignRewardData)), row3CampaignData);

                const extractActivities = (campaign): Activity[] => {
                    const campaignActivities = campaign
                        .flatMap(reward => reward.Campaignactivity || []);
                    const categoryActivities = campaign
                        .flatMap(reward => reward.Campaigncategory || [])
                        .flatMap(category => category.activity || []);

                    return [...campaignActivities, ...categoryActivities].filter(Boolean);
                };

                const calculateTotalCount = (activity: Activity): number => {
                    const users = activity.users || {};
                    const custompoint = activity.custompoint || {};
                    return Object.keys({...users, ...custompoint}).length;
                };

                const getActivityName = (activity: Activity): string => {
                    return activity.cust_name || activity.activity?.activity_name || '';
                };

                const calculatePercentage = (count: number, totalUsers: number): string => {
                    const percentage = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
                    return `${percentage}%`;
                };

                const processCampaignActivitiesPro = (
                    campaigns: [Campaign | null, Campaign | null, Campaign | null],
                    totalUsers: number
                ): FinalActivityData => {
                    const allCampaignActivities = campaigns.map(campaign => extractActivities(campaign));
                    const [firstActivities, secondActivities, thirdActivities] = allCampaignActivities;

                    return firstActivities.reduce<FinalActivityData>((result, activity) => {
                        if (!activity?.id) return result;

                        const id = activity.id;
                        const firstTotal = calculateTotalCount(activity);

                        const secondActivity = secondActivities.find(a => a?.id === id);
                        const thirdActivity = thirdActivities.find(a => a?.id === id);

                        const secondTotal = secondActivity ? calculateTotalCount(secondActivity) : 0;
                        const thirdTotal = thirdActivity ? calculateTotalCount(thirdActivity) : 0;

                        result[id] = [
                            getActivityName(activity),
                            firstTotal,
                            calculatePercentage(firstTotal, totalUsers),
                            firstTotal - secondTotal,
                            thirdTotal - firstTotal
                        ];

                        return result;
                    }, {});
                };

                const result = processCampaignActivitiesPro(
                    [currentCampaign, current2Campaign, current3Campaign],
                    userCount
                );

                let firstEndDateYear = await this.commonDateService.DateTimeFormat(firstEndDate, 'YYYY');
                let headerData = [`Wellness Activities (All Users)`, `${firstEndDateYear} (#)`, `${firstEndDateYear} (%)`, `Difference From ${await this.commonDateService.DateTimeFormat(secondEndDate, 'MM-DD-YYYY')} to ${await this.commonDateService.DateTimeFormat(firstEndDate, 'MM-DD-YYYY')}`, `Difference Since ${await this.commonDateService.DateTimeFormat(thirdEndDate, 'MM-DD-YYYY')}`]
                const sheetData = [{sheet_name: "Report", list: [[...headerData],...Object.values(result)]}];
                let currentDatetime = await this.commonDateService.DateTimeFormat('now', 'MM-DD-YYYY-HHmmss');
                let fileName:string = `${orgId}_Engagement_Comparison_Report_${currentDatetime}.json`;
                if (autoRequest) {
                    fileName = `${orgId}_Engagement_Comparison_Report_${reporRequestData?.id}_${currentDatetime}.json`;
                }
                const manualReportResult: any = await this.userChallengeHelperService.createChallengeReportlsxNew(
                    {org_id: orgId},
                    sheetData,
                    fileName,
                    autoRequest ? true : false
                );
                /*TODO : optimize this code and add common zip create function  */
                if (autoRequest) {
                    let jsonFile = `${orgId}_Engagement_Comparison_Report_${reporRequestData?.id}_${currentDatetime}.json`
                    const directory = path.join(appConstant.COMPANY_CHALLENGE_REPORT, this.commonFileService.sanitizeFileName(orgId));
                    let fileName = manualReportResult.file_dir
                    let zipPassword = await this.companyService.getCompanyZipPassword(postData?.org_id);
                        if (await this.commonFileService.fileExist(fileName)) {
                            let result: any = await this.commonFileService.createPasswordProtectedZip(fileName,zipPassword.toString(),'create_zip.py',);
                            if (result?.status == 'success') {
                                fileName = fileName.replace('.xlsx', '.zip');
                                let zipPath = `automatic_report/engagement_comparison_reports/${reporRequestData?.id}/Engagement_Comparison_report.zip`;
                                let zipPathDir = fileName;
                                if (await this.commonFileService.fileExist(zipPathDir)) {
                                    try {
                                        let uploadResult = await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' },
                                                {
                                                    path: path.resolve(`${zipPathDir}`),
                                                    filename: `${zipPath}`,
                                                    userBucket: 'private',
                                                },
                                            ),
                                        );
                                        if (!uploadResult) {
                                            throw new Error(`Report Not Uploaded to Bucket`);
                                        }
                                    } catch (err) {
                                        throw new Error(`Report Not Uploaded to Bucket`);
                                    }
                                } else {
                                    throw new Error(`File does not exist`);
                                }
                                let resultData = Object.create(null);
                                resultData['id'] = reporRequestData?.id;
                                resultData['file_name'] = zipPath;
                                resultData['auto_report_zip_password'] = Buffer.from(await argon2.hash(zipPassword)).toString('base64');
                                resultData['error_message'] = '';
                                resultData['status'] = 1;
                                resultData['updated_date'] =this.commonDateService.DateTimeFormat('now','YYYY-MM-DD HH:mm:ss',);
                                await this.engagementComparisonService.updateRecord({ id: reporRequestData?.id },resultData);
                                await this.commonFileService.removeFileFromLocal(`${path.join(`${directory}/`)}${jsonFile}`);
                                await this.commonFileService.removeFileFromLocal(`${path.join(`${directory}/`)}${jsonFile}`.replace('.json','.zip',));
                            } else {
                                throw new Error(`Report Not created`);
                            }
                        } else {
                            throw new Error(`File does not exist`);
                        }
                }
                return {
                    success: 1,
                    data: manualReportResult,
                    error: 0,
                    message: 'success'
                };
            }
            return {
                success: 0,
                data: null,
                error: 1,
                message: 'success'
            };
        } catch (error) {
            console.log("error",error);
            this.cronCommonService.errorLog(
                0,
                'engagement-comparison-report',
                error?.message,
                error,
            );
            return {
                success: 0,
                data: null,
                message: error.message,
                error: 1,
            };
        }
    }


}