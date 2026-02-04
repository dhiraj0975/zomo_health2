import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CompaniesDto,
    CronStatus,
    IncentiveReportsEntity,
    reportFieldsConstant,
    System_Type,
    tableConstant,
    UserDto
} from '@common-constants';
import { Controller, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { ClientProxy, MessagePattern } from '@nestjs/microservices';
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import { ActivityLogService, HealthReportService } from 'src/module';
import { FrontService } from 'src/module/campaign/front/front.service';
import { ActivePluginService } from 'src/module/company';
import { CronCommonService } from '../../../common';
import { CompanyService } from '../../company/company.service';
import { IncentiveReportsService } from '../../incentivereports/incentivereports.service';
import { UserService } from '../../user/user.service';
import { MyPlanReportService } from '../my-plan-report/my-plan-report.service';
import { CampaignDataHelperService } from './campaigndatahelper.service';
const _ = require('lodash');

@Controller('plan-report')
export class CampaignAnnualReportController {
    constructor(
        private readonly campaignAnnualReportService: CampaignDataHelperService,
        private readonly userService: UserService,
        private readonly commonArrayService: CommonArrayService,
        private readonly cronCommonService: CronCommonService,
        private readonly incentiveReportsService: IncentiveReportsService,
        private readonly commonFileService: CommonFileService,
        private readonly companyService: CompanyService,
        private readonly commonDateService: CommonDateService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
        private readonly campaignDataService: FrontService,
        private readonly activePluginService: ActivePluginService,
        private readonly activityLogService: ActivityLogService,
        private readonly myPlanReportService: MyPlanReportService,
        private readonly healthReportService: HealthReportService,
        
    ) {}
    @MessagePattern({ cmd: 'campaign-annual-report' })
    async campaignAnnualReport() {
        try {
            const reportWhereClause = {status: 0, report_type: 'CRA', system_type: System_Type.NEW, cron_status: CronStatus.COMPILATION}
            let reportData: IncentiveReportsEntity[] | [] = await this.incentiveReportsService.getAll(reportWhereClause,['id','user_id','condition','camp_id','org_id','membership_code','system_type','cron_status','user_role','start_date_range','end_date_range'],{id: "ASC"})
            if (reportData.length == 0) {
                return true;
            }
            for(let record of reportData){
                if(record?.start_date_range && record?.end_date_range){
                    const startYear = this.commonDateService.getTodayDate(record?.start_date_range).format('YYYY');
                    record['year'] = startYear;
                }
                await this.downloadPpt(record);
            }
            return true;
        } catch (error) {
            this.cronCommonService.errorLog(
                0,
                'campaign-annual-report',
                error?.message,
                error,
            );
            return true;
        }
    }
    @MessagePattern({ cmd: 'campaign-annual-report-manual' })
    async downloadPpt(data: any) {
        try{
            const company_id = Number(data?.org_id);
            const activePlugins = await this.activePluginService.getActivePluginList(company_id);
            let companyData = await this.companyService.findOne(`company.id = ${company_id} AND company.status != 2`,[tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_SETTINGS],['company','companySetting.id','companySetting.is_emo_health_asssessments','assessment_settings.id','assessment_settings.status']);
            let companyDetails = <any>(await this.commonArrayService.formatToDto(CompaniesDto, companyData, 'eng'));
            let campaignWhere =`campaign.organization_id = ${company_id} AND campaign.status = 1`;
            if(data?.camp_id){
                campaignWhere += ` AND campaign.id IN (${data?.camp_id})`;
            }
            if(data.year){
                campaignWhere += ` AND(campaign.start_date <= '${data?.year}-12-31' AND campaign.end_date >= '${data?.year}-01-01')`;
            }
            let campaignsData = await this.campaignDataService.getCampaignList(campaignWhere,{ end_date: 'DESC' },['campaign.id', 'campaign.campaign_name', 'campaign.tab_titled', 'campaign.tab_order','campaign.start_date','campaign.end_date'],0);
            let where = `user.org_id = ${company_id} AND user.role_id in(2,16)`;
            if(data?.condition?.includes('user.status')){
                where += ` AND user.status = 1`;
            }
            else{
                where += ` AND user.status != 2`;
            }
            let userList = await this.userService.listCRecord(where, ['user.id','user.role_id','user.gender']);
            userList = <any>(await this.commonArrayService.formatToDto(UserDto, userList, 'eng'));
            let showCombinedData = true;
            let totalSpouse = userList?.filter(user => user.role_id == 16)?.length;
            showCombinedData = totalSpouse == 0 ? false : true;
            let year = this.commonDateService.getTodayDate(data?.year ?? null).format('YYYY');
            let graphYear;
            let userListCombined = [];
            let userListEmployee = [];
            if (campaignsData?.length) {
                let campaignsDetails = {};
                campaignsData.sort((a, b) => {return this.commonDateService.getTodayDate(b.end_date).valueOf() - this.commonDateService.getTodayDate(a.end_date).valueOf();});
                for (const campData of campaignsData) {
                    const campaignId = campData['id'];
                    let startYear = this.commonDateService.getTodayDate(campData?.start_date).format('YYYY');
                    let endYear = this.commonDateService.getTodayDate(campData?.end_date).format('YYYY');
                    if(startYear != endYear){
                        if(Number(endYear) < Number(year)) {
                            if(campaignsDetails[startYear]){
                                campData['year'] = startYear;
                                campaignsDetails[startYear]['campaignids'].push(campaignId);
                                campaignsDetails[startYear]['campaigns'].push(campData);
                            }
                            else{
                                campData['year'] = startYear;
                                campaignsDetails[startYear] = {
                                    campaignids : [campaignId],
                                    campaigns : [campData]
                                }
                            }
                            if(campaignsDetails[endYear]){
                                campData['year'] = endYear;
                                campaignsDetails[endYear]['campaignids'].push(campaignId);
                                campaignsDetails[endYear]['campaigns'].push(campData);
                            }
                            else{
                                campData['year'] = endYear;
                                campaignsDetails[endYear] = {
                                    campaignids : [campaignId],
                                    campaigns : [campData]
                                }
                            }
                        }
                        else{
                            if(campaignsDetails[startYear]){
                                campData['year'] = startYear;
                                campaignsDetails[startYear]['campaignids'].push(campaignId);
                                campaignsDetails[startYear]['campaigns'].push(campData);
                            }
                            else{
                                campData['year'] = startYear;
                                campaignsDetails[startYear] = {
                                    campaignids : [campaignId],
                                    campaigns : [campData]
                                }
                            }
                        }
                    }
                    else{
                        let year = endYear;
                        campData['year'] = year;
                        if(campaignsDetails[year]){
                            if(!campaignsDetails[year]['campaignids'].find(item => item == campaignId)){
                                campaignsDetails[year]['campaignids'].push(campaignId);
                                campaignsDetails[year]['campaigns'].push(campData);
                            }
                        }
                        else{
                            campaignsDetails[year] = {
                                campaignids : [campaignId],
                                campaigns : [campData]
                            }
                        }
                    }
                }
                if(campaignsDetails[year] == undefined){
                    campaignsDetails[year] = {};
                    campaignsDetails[year]['campaigns'] = [];
                    campaignsDetails[year]['campaignids'] = [];
                    campaignsDetails[year]['activityMapCombine'] = [];
                    campaignsDetails[year]['rewardMapCombine'] = [];
                    campaignsDetails[year]['activityMapUser'] = [];
                    campaignsDetails[year]['rewardMapUser'] = [];
                }
                let activityList = [];
                let rewardList = [];
                let currentYearReward;
                for(const yearKey of Object.keys(campaignsDetails).reverse()){
                    let campaigns = campaignsDetails[yearKey];
                    let campaignIds = campaigns['campaignids'];
                    campaigns = campaigns['campaigns']?.map(ele => {return {id: ele.id, year: ele.year}});
                    const campaignData1 = campaigns.length ? await this.campaignAnnualReportService.campaignData({tokenUser: {id: data?.user_id, role_id: data?.user_role, membership_code: data?.membership_code }}, { company_id, campaign_id: campaignIds.join(','), campaigns, activity : yearKey >= year, activityList }, activePlugins) : {activityId:[]};
                    campaignsDetails[yearKey]['campaignSummary'] = structuredClone(campaignData1);
                    // changes for current year activity only
                    if(yearKey >= year){
                        activityList = [...new Set([...activityList,...campaignData1?.['activityId']])];
                    }
                    // changes for current year activity only
                }
                if (Object.keys(campaignsDetails)?.length) {
                    for (const yearKey of Object.keys(campaignsDetails).reverse()) {
                        let userList = await this.userService.listRecord(`${where} AND user.created < '${yearKey}-12-31 23:59:59'`,['user.id','user.role_id']);
                        let totalEmployee = userList?.length;
                        let totalCombinedUser = userList?.length;
                        let totalSpouse = userList?.filter(user => user.role_id == 16 || user.user_role_id == 16)?.length;
                        totalEmployee = totalEmployee - totalSpouse;
                        let totalLoggedIn = 0;
                        let totalLoggedInPer = 0;
                        let totalLoggedInUser = 0;
                        let totalLoggedInUserPer = 0;
                        let totalAppDownload = 0;
                        let totalAppDownloadPer = 0;
                        let totalAppDownloadUser = 0;
                        let totalAppDownloadUserPer = 0;
                        let totalCompletedActivity = 0;
                        let totalCompletedActivityPer = 0;
                        let totalCompletedActivityUser = 0;
                        let totalCompletedActivityUserPer = 0;
                        let activityMapCombine: any = {};
                        let rewardMapCombine: any = {};
                        let activityMapUser: any = {};
                        let rewardMapUser: any = {};

                        const campaignData = structuredClone(campaignsDetails[yearKey]);
                        campaignsDetails[yearKey]['campaignData'] = campaignData;
                        const defaultActivitiesCombined = campaignData?.['campaignSummary']?.['defaultActivitys']?.tabData?.['1'] || [];
                        userListCombined = [...new Set([...userListCombined, ...defaultActivitiesCombined?.userList ?? []])];
                        const defaultActivities = campaignData?.['campaignSummary']?.['defaultActivitys']?.tabData?.['2'] || [];
                        userListEmployee = [...new Set([...userListEmployee, ...defaultActivities?.userList ?? []])];
                        const uniqueByActivity = (arr, keepLast = false) =>
                            [...new Map((keepLast ? [...arr].reverse() : arr)
                                .map(i => [`${i.activity_name}`, i])
                            ).values()].reverse();
                        const defaultActivitiesCombinedList = uniqueByActivity(structuredClone(defaultActivitiesCombined?.['activityDetails'] || []), true);
                        const defaultActivitiesList = uniqueByActivity(structuredClone(defaultActivities?.['activityDetails'] || []), true);
                        for (const activity of defaultActivitiesCombinedList) {
                            switch (activity['activity_name']) {
                                case 'Web Login':
                                    totalLoggedIn += activity['complete'];
                                    totalLoggedInPer += activity['completePer'];
                                    break;
                                case 'App Login':
                                    totalAppDownload += activity['complete'];
                                    totalAppDownloadPer += activity['completePer'];
                                    break;
                                case 'Completed at least One Activity':
                                    totalCompletedActivity += activity['complete'];
                                    totalCompletedActivityPer += activity['completePer'];
                                    break;
                            }
                        }
                        for (const activity of defaultActivitiesList) {
                            switch (activity['activity_name']) {
                                case 'Web Login':
                                    totalLoggedInUser += activity['complete'];
                                    totalLoggedInUserPer += activity['completePer'];
                                    break;
                                case 'App Login':
                                    totalAppDownloadUser += activity['complete'];
                                    totalAppDownloadUserPer += activity['completePer'];
                                    break;
                                case 'Completed at least One Activity':
                                    totalCompletedActivityUser += activity['complete'];
                                    totalCompletedActivityUserPer += activity['completePer'];
                                    break;
                            }
                        }
                        const rewards = campaignData?.['campaignSummary']?.['rewards'] || {};
                        if(yearKey >= year){
                            currentYearReward = Object.values(rewards);
                            for(let rewardKey of Object.keys(rewards)){
                                const tabs = rewards?.[rewardKey]?.tabData;
                                if (tabs?.['1']?.tabName === 'Combined') {
                                    rewardList = [...new Set([...rewardList, ...tabs['1']?.allRewardDetails.map(ele => ele.order_id)])];
                                }
                            }
                        }
                        for(let rewardKey of Object.keys(rewards)){
                            const tabs = rewards?.[rewardKey]?.tabData;
                            if (tabs?.['1']?.tabName === 'Combined') {
                                this.aggregateActivityData(tabs['1']?.activityDetails, activityMapCombine);
                                this.aggregateActivityData(tabs['1']?.allRewardDetails, rewardMapCombine);
                            }
                            if (tabs?.['2']?.tabName === 'Employees') {
                                this.aggregateActivityData(tabs['2']?.activityDetails, activityMapUser);
                                this.aggregateActivityData(tabs['2']?.allRewardDetails, rewardMapUser);
                            }
                        }
                        activityMapCombine = Object.values(activityMapCombine);
                        rewardMapCombine = Object.values(rewardMapCombine);
                        activityMapUser = Object.values(activityMapUser);
                        rewardMapUser = Object.values(rewardMapUser);
                        campaignsDetails[yearKey] = {
                            campaignData,
                            totalCombinedUser,
                            totalEmployee,
                            totalSpouse,
                            totalLoggedIn,
                            totalLoggedInPer,
                            totalLoggedInUser,
                            totalLoggedInUserPer,
                            totalAppDownload,
                            totalAppDownloadPer,
                            totalAppDownloadUser,
                            totalAppDownloadUserPer,
                            totalCompletedActivity,
                            totalCompletedActivityPer,
                            totalCompletedActivityUser,
                            totalCompletedActivityUserPer,
                            activityMapCombine,
                            rewardMapCombine,
                            activityMapUser,
                            rewardMapUser
                        };
                    }
                }
                if(data?.camp_id){
                    year = Object.keys(campaignsDetails)[0];
                }
                const dynamicData = JSON.parse(JSON.stringify(reportFieldsConstant?.AnnualReportFieldForPPT));
                dynamicData.presentationTitle = dynamicData.presentationTitle + year;
                dynamicData.company_name = companyDetails?.company_name;
                dynamicData.reportYear = year;
                dynamicData.slides[0]['data']['clientName'] = companyDetails?.company_name;
                dynamicData.slides[0]['data']['reportTitle'] = year + dynamicData.slides[0]['data']['reportTitle'];
                dynamicData.slides[0]['data']['logoImagePath'] = companyDetails?.company_logo;

                dynamicData.slides[1]['data']['year'] = year;
                dynamicData.slides[1]['data']['title'] = dynamicData.slides[1]['data']['title'];
                let campaignsSummaryDetails = campaignsDetails[year];
                if(campaignsSummaryDetails?.activityMapCombine?.length && campaignsSummaryDetails?.rewardMapCombine?.length){
                    dynamicData.slides[2]['data']['table']['rows']?.push({values: ["Total Employees", campaignsSummaryDetails?.totalEmployee?.toString(), ((campaignsSummaryDetails?.totalEmployee/campaignsSummaryDetails?.totalCombinedUser)*100)?.toFixed(2)]});
                    dynamicData.slides[2]['data']['table']['rows']?.push({values: ["Total Spouses", campaignsSummaryDetails?.totalSpouse?.toString(), ((campaignsSummaryDetails?.totalSpouse/campaignsSummaryDetails?.totalCombinedUser)*100)?.toFixed(2)]});
                    dynamicData.slides[2]['data']['table']['rows']?.push({values: ["Logged into Zomo Health", campaignsSummaryDetails?.totalLoggedIn?.toString(), campaignsSummaryDetails?.totalLoggedInPer?.toFixed(2)]});
                    dynamicData.slides[2]['data']['table']['rows']?.push({values: ["Mobile App Downloaded", campaignsSummaryDetails?.totalAppDownload?.toString(), campaignsSummaryDetails?.totalAppDownloadPer?.toFixed(2)]});
                    dynamicData.slides[2]['data']['table']['rows']?.push({values: ["Completed at least One Activity ", campaignsSummaryDetails?.totalCompletedActivity?.toString(), campaignsSummaryDetails?.totalCompletedActivityPer?.toString()]});
                    for(let activity of campaignsSummaryDetails?.activityMapCombine){
                        dynamicData.slides[2]['data']['table']['rows']?.push({values: [activity?.activity_name,activity.complete,activity?.completePer]});
                    }
                    for(let reward of campaignsSummaryDetails?.rewardMapCombine){
                        dynamicData.slides[3]['data']['table']['rows']?.push({values: [reward?.activity_name,reward.complete,reward?.completePer]});
                    }
                }
                if(campaignsSummaryDetails?.activityMapUser?.length && campaignsSummaryDetails?.rewardMapUser?.length){
                    dynamicData.slides[4]['data']['table']['rows']?.push({values: ["Total Employees", campaignsSummaryDetails?.totalEmployee?.toString(), ((campaignsSummaryDetails?.totalEmployee/campaignsSummaryDetails?.totalCombinedUser)*100)?.toFixed(2)]});
                    dynamicData.slides[4]['data']['table']['rows']?.push({values: ["Logged into Zomo Health", campaignsSummaryDetails?.totalLoggedInUser?.toString(), campaignsSummaryDetails?.totalLoggedInUserPer?.toFixed(2)]});
                    dynamicData.slides[4]['data']['table']['rows']?.push({values: ["Mobile App Downloaded", campaignsSummaryDetails?.totalAppDownloadUser?.toString(), campaignsSummaryDetails?.totalAppDownloadUserPer?.toFixed(2)]});
                    dynamicData.slides[4]['data']['table']['rows']?.push({values: ["Completed at least One Activity", campaignsSummaryDetails?.totalCompletedActivityUser?.toString(), campaignsSummaryDetails?.totalCompletedActivityUserPer?.toString()]});
                    for(let activity of campaignsSummaryDetails?.activityMapUser){
                        dynamicData.slides[4]['data']['table']['rows']?.push({values: [activity?.activity_name,activity.complete,activity?.completePer]});
                    }
                    for(let reward of campaignsSummaryDetails?.rewardMapUser){
                        dynamicData.slides[5]['data']['table']['rows']?.push({values: [reward?.activity_name,reward.complete,reward?.completePer]});
                    }
                }
                if(Object.keys(campaignsDetails)?.length > 0){
                    const headers = [
                        "Wellness Activity",
                        ...Object.keys(campaignsDetails)
                            .map(Number)
                            .sort((a, b) => b - a)
                    ];
                    const activityNamesCombined = new Set();
                    const rewardNamesCombined = new Set();
                    /* // ZOMO-4004 show current year only comparison
                    Object.values(campaignsDetails).forEach(yearData => {
                        (yearData['activityMapCombine'] || []).forEach(act => {
                            if (act.activity_name) activityNamesCombined.add(act.activity_name);
                        });
                        (yearData['rewardMapCombine'] || []).forEach(act => {
                            if (act.activity_name) rewardNamesCombined.add(act.activity_name);
                        });
                    }); 
                    */
                   campaignsDetails[year]['activityMapCombine'].forEach(act => {
                            if (act.activity_name) activityNamesCombined.add(act.activity_name);
                        });
                   campaignsDetails[year]['rewardMapCombine'].forEach(act => {
                            if (act.activity_name) rewardNamesCombined.add({activity_name: act.activity_name, order_id: act.order_id});
                            if (act.activity_name) {
                                let reward = [...rewardNamesCombined].find(ele=> ele['activity_name'] == act.activity_name);
                                if (!reward) {
                                    rewardNamesCombined.add({activity_name: act.activity_name, order_id: act.order_id});
                                }
                            }
                        });
                    const activityNames = new Set();
                    const rewardNames = new Set();
                    /* // ZOMO-4004
                    Object.values(campaignsDetails).forEach(yearData => {
                        (yearData['activityMapUser'] || []).forEach(act => {
                            if (act.activity_name) activityNames.add(act.activity_name);
                        });
                        (yearData['rewardMapUser'] || []).forEach(act => {
                            if (act.activity_name) rewardNames.add(act.activity_name);
                        });
                    });
                    */
                    campaignsDetails[year]['activityMapUser'].forEach(act => {
                        if (act.activity_name) activityNames.add(act.activity_name);
                        });
                    campaignsDetails[year]['rewardMapUser'].forEach(act => {
                        if (act.activity_name) {
                            let reward = [...rewardNames].find(ele=> ele['activity_name'] == act.activity_name);
                            if (!reward) {
                                rewardNames.add({activity_name: act.activity_name, order_id: act.order_id});
                            }
                        }
                    });

                    const createDataRow = (activityName, combined: boolean, type) => {
                        const row = type == 'reward' ? [activityName?.activity_name] : [activityName];
                        headers.slice(1).forEach(year => {
                            const yearData = campaignsDetails[year];
                            const allYearActivitySources = [
                            ...(combined ? (yearData?.activityMapCombine || []) : (yearData?.activityMapUser || [])),
                            ];
                            const allYearRewardSources = [
                            ...(combined ? (yearData?.rewardMapCombine || []) : (yearData?.rewardMapUser || [])),
                            ];
                            let foundActivity 
                            if(type == 'activity'){
                                foundActivity = allYearActivitySources.find(act => act.activity_name === activityName);
                            }
                            if(type == 'reward'){
                                // comparison made by reward order
                                foundActivity = allYearRewardSources.find(act => act.order_id === activityName?.order_id);
                            }
                            row.push(foundActivity ? foundActivity.complete?.toString() : "");
                        });
                        return row;
                    };
                    const activityRowsCombined = Array.from(activityNamesCombined).map(ele => createDataRow(ele, true, 'activity'));
                    const rewardRowsCombined = Array.from(rewardNamesCombined).map(ele => createDataRow(ele, true, 'reward'));
                    const wellnessCreditRowCombined = ["Wellness Credit",...headers.slice(1).map(item => '')];
                    const summaryRowsCombined = await this.buildSummaryRows(campaignsDetails,null,headers);
                    const allTableRowsCombined = [
                        ...summaryRowsCombined,
                        ...activityRowsCombined,
                        wellnessCreditRowCombined,
                        ...rewardRowsCombined
                    ];
                    dynamicData.slides[6]['data']['table']['headers'] = headers.map(item => !item?.toString()?.includes('Wellness Activity') ? `${item} (#)`: `${item}`);
                    dynamicData.slides[6]['data']['table']['rows'] = allTableRowsCombined;

                    const activityRowsEmployee = Array.from(activityNames).map(ele => createDataRow(ele, false, 'activity'));
                    const rewardRowsEmployee = Array.from(rewardNames).map(ele => createDataRow(ele, false, 'reward'));
                    const wellnessCreditRowEmployee = ["Wellness Credit",...headers.slice(1).map(item => '')];
                    const summaryRowsEmployee = await this.buildSummaryRows(campaignsDetails,null,headers);
                    const allTableRowsEmployee = [
                        ...summaryRowsEmployee,
                        ...activityRowsEmployee,
                        wellnessCreditRowEmployee,
                        ...rewardRowsEmployee
                    ];
                    dynamicData.slides[7]['data']['table']['headers'] = headers.map(item => !item?.toString()?.includes('Wellness Activity') ? `${item} (#)`: `${item}`);
                    dynamicData.slides[7]['data']['table']['rows'] = allTableRowsEmployee;
                }

                if(Object.keys(campaignsDetails)?.length > 0){
                    let headers = ["Wellness Activity","Difference from Last Year to this Year (#)","Difference from year 1 to Current Year (#)","Difference from year 2 to Current Year (#)"];
                    const sortedYears = Object.keys(campaignsDetails)
                        .map(Number)
                        .sort((a, b) => b - a)
                        .slice(0,4)
                        .map(String);

                    const activityNames = new Set();
                    const rewardNames = new Set();
                    /*
                    Object.values(campaignsDetails).forEach(yearData => {
                        (yearData['activityMapCombine'] || []).forEach(act => activityNames.add(act.activity_name));
                        (yearData['rewardMapCombine'] || []).forEach(act => rewardNames.add(act.activity_name));
                    });
                    */
                    campaignsDetails[year]['activityMapCombine'].forEach(act => {
                        if (act.activity_name) activityNames.add(act.activity_name);
                        });
                    campaignsDetails[year]['rewardMapCombine'].forEach(act => {
                        if (act.activity_name) {
                            let reward = [...rewardNames].find(ele=> ele['activity_name'] == act.activity_name);
                            if (!reward) {
                                rewardNames.add({activity_name: act.activity_name, order_id: act.order_id});
                            }
                        }
                    });
                    const createDifferenceRow = async(activityName, type) => {
                        const getValueForYear = async(yearStr,type) => {
                            if (!yearStr) return 0;
                            const yearData = campaignsDetails[yearStr];
                            if (!yearData) return 0;
                            const allYearActivitySources = [...(yearData?.activityMapCombine || [])];
                            const allYearRewardSources = [...(yearData?.rewardMapCombine || [])];
                            let foundActivity 
                            if(type == 'activity'){
                                foundActivity = allYearActivitySources.find(act => act.activity_name === activityName);
                            }
                            if(type == 'reward'){
                                // comparison made by reward order
                                foundActivity = allYearRewardSources.find(act => act.order_id === activityName?.order_id);
                            }
                            return foundActivity?.complete || 0;
                        };
                        const current = await getValueForYear(sortedYears[0],type);
                        const past1 = await getValueForYear(sortedYears[1],type);
                        const past2 = await getValueForYear(sortedYears[2],type);
                        const past3 = await getValueForYear(sortedYears[3],type);
                        return [
                            type == 'reward' ? activityName?.activity_name : activityName,
                            (await this.formatDiff(current, past1, sortedYears[1])),
                            (await this.formatDiff(current, past2, sortedYears[2])),
                            (await this.formatDiff(current, past3, sortedYears[3]))
                        ];
                    }
                    const activityRows = await Promise.all(Array.from(activityNames).map(activityName => createDifferenceRow(activityName, 'activity')));
                    const rewardRows = await Promise.all(Array.from(rewardNames).map(rewardName => createDifferenceRow(rewardName, 'reward')));
                    const wellnessCreditRow = ["Wellness Credit","","",""];
                    const summaryRows = await this.buildSummaryRows(campaignsDetails,sortedYears);
                    const allTableRows = [
                        ...summaryRows,
                        ...activityRows,
                        wellnessCreditRow,
                        ...rewardRows
                    ];

                    dynamicData.slides[8]['data']['table']['headers'] = headers;
                    dynamicData.slides[8]['data']['table']['rows'] = _.cloneDeep(allTableRows);
                    dynamicData.slides[9]['data']['table']['headers'] = headers;
                    allTableRows.splice(1, 1);
                    dynamicData.slides[9]['data']['table']['rows'] = allTableRows;
                }
                dynamicData.slides[10]['data']['year'] = year;
                /* biometric Summary */
                let biometricSummary = userList.length ? await this.biometricSummary(userList, year, data?.camp_id) : [];
                /* biometric Summary */
                if(Object.keys(biometricSummary)?.length > 0){
                    graphYear = biometricSummary == 1 ? `${Object.keys(biometricSummary)[0]}` : `${Object.keys(biometricSummary)[0]}-${Object.keys(biometricSummary)[Object.keys(biometricSummary).length - 1]}`;
                    let riskDistribution = {};
                    dynamicData.slides[11]['data']['table']['headers'] = ["Biometric Category",...Object.keys(biometricSummary).reverse().map(item =>  `${item} Average`)];
                    let allTableRows =[
                        {"values": ['BMI']},
                        {"values": ['NF Blood Glucose']},
                        {"values": ['Fasting Blood Glucose']},
                        {"values": ['A1C']},
                        {"values": ['BP Systolic']},
                        {"values": ['BP Diastolic']},
                        {"values": ['Total Cholesterol']},
                        {"values": ['Triglycerides']},
                        {"values": ['HDL Female / Male']},
                        {"values": ['LDL']},
                        {"values": ["Total Participants"],"color": "#239884"},
                    ];
                    for(let key of Object.keys(biometricSummary).reverse()) {
                        allTableRows[0]['values'].push(biometricSummary[key]?.['avg_bmi']);
                        allTableRows[1]['values'].push(biometricSummary[key]?.['avg_random_blood_glucose']);
                        allTableRows[2]['values'].push(biometricSummary[key]?.['avg_fasting_blood_glucose']);
                        allTableRows[3]['values'].push(biometricSummary[key]?.['avg_alc']);
                        allTableRows[4]['values'].push(biometricSummary[key]?.['avg_systolic']);
                        allTableRows[5]['values'].push(biometricSummary[key]?.['avg_diastolic']);
                        allTableRows[6]['values'].push(biometricSummary[key]?.['avg_total_cholesterol']);
                        allTableRows[7]['values'].push(biometricSummary[key]?.['avg_triglycerides']);
                        allTableRows[8]['values'].push(biometricSummary[key]?.['avg_female_hdl'] && biometricSummary[key]?.['avg_male_hdl'] ? `${biometricSummary[key]?.['avg_female_hdl']} / ${biometricSummary[key]?.['avg_male_hdl']}` : biometricSummary[key]?.['avg_hdl']);
                        allTableRows[9]['values'].push(biometricSummary[key]?.['avg_ldl']);
                        allTableRows[10]['values'].push(biometricSummary[key]?.['total_participant']);
                        riskDistribution[key] = Object.values(biometricSummary[key]?.['screeningResult']);
                    }
                    dynamicData.slides[11]['data']['table']['rows'] = allTableRows;
                    dynamicData.slides[11]['data']['graphText'] = dynamicData.slides[11]['data']['graphText']?.replace('2020-2023',graphYear);

                    // "Biometric Risk Stratification",
                    let biometricSummaryRows = dynamicData.slides[12]['data']['categories'];
                    let biometricRiskSummary = biometricSummary?.[year] ?  JSON.parse(JSON.stringify(biometricSummary?.[year]?.['screeningBiometricResult'])) : JSON.parse(JSON.stringify(reportFieldsConstant?.ScreeningBiometricResult));
                    if(Object.keys(biometricRiskSummary).length){
                        dynamicData.slides[12]['data']['low'] = [];
                        dynamicData.slides[12]['data']['moderate'] = [];
                        dynamicData.slides[12]['data']['high'] = [];
                        dynamicData.slides[12]['data']['very high'] = [];
                    }
                    for (let i = 0; i < biometricSummaryRows.length; i++) {
                        const label = biometricSummaryRows[i];
                        const dataForKey = biometricRiskSummary?.[label] ?? {};
                        const percentages = await this.calculatePercentages(dataForKey);
                        dynamicData.slides[12]['data']['low'].push(percentages[0]);
                        dynamicData.slides[12]['data']['moderate'].push(percentages[1]);
                        dynamicData.slides[12]['data']['high'].push(percentages[2]);
                        dynamicData.slides[12]['data']['very high'].push(percentages[3] ?? 0);
                    }
                    dynamicData.slides[12]['data']['userCount'] = biometricSummary?.[year]?.['total_participant']?.toString();

                    dynamicData.slides[13]['data']['userCount'] = biometricSummary?.[year]?.['total_participant']?.toString();
                    dynamicData.slides[13]['data']['riskDistribution'] = riskDistribution;
                }
                
                //EHA DATA Processing HRA DATA Processing
                let ehaHraDataProcessing
                if(companyData?.companySetting?.is_emo_health_asssessments && companyData?.assessment_settings?.status){
                    ehaHraDataProcessing = await this.ehaDataProcessing({orgId: company_id, userList, year, condition: where});
                }
                else{
                    ehaHraDataProcessing = await this.hraDataProcessing({orgId: company_id, userList, year, condition: where});
                }
                const dataProcessingData = [];
                const categories = [];
                const lowPercents = [];
                const mediumPercents = [];
                const moderatePercents = [];
                const highPercents = [];
                const veryHighPercents = [];
                let total
                for (const { title, low, low_percentage, medium, medium_percentage, moderate, moderate_percentage, high, high_percentage, very_high, very_high_percentage, count } of ehaHraDataProcessing) {
                    total = count ?? (low + medium + high + moderate + very_high);
                    const lowPercent = low_percentage + '%';
                    const mediumPercent = medium_percentage + '%';
                    const moderatePercent = moderate_percentage + '%';
                    const highPercent = high_percentage + '%';
                    const veryHighPercent = very_high_percentage + '%';
                    let data = [title, lowPercent, mediumPercent];
                    if(moderate > 0){
                        data.push(moderatePercent);
                        moderatePercents.push(moderatePercent.replace('%', ''));
                    }
                    data.push(highPercent);
                    if(very_high > 0){
                        data.push(veryHighPercent);
                        veryHighPercents.push(veryHighPercent.replace('%', ''));
                    }
                    dataProcessingData.push(data);
                    categories.push(title);
                    lowPercents.push(lowPercent.replace('%', ''));
                    mediumPercents.push(mediumPercent.replace('%', ''));
                    highPercents.push(highPercent.replace('%', ''));
                }
                dynamicData.slides[14]['data']['year'] = year;
                //hra summary
                dynamicData.slides[15]['data']['userCount'] = total;// remove to show only submitted data:- biometricSummary?.[year]?.['total_participant']?.toString();
                if(moderatePercents.length){
                    dynamicData.slides[15]['data']['headers'].splice(3, 0, "We Can Help (Moderate) ");
                }
                if(veryHighPercents.length){
                    dynamicData.slides[15]['data']['headers'].push("We Can Help (Very High Risk) ");
                }
                dynamicData.slides[15]['data']['rows'] = dataProcessingData;
                //hra chart
                dynamicData.slides[16]['data']['userCount'] = total;// remove to show only submitted data:- biometricSummary?.[year]?.['total_participant']?.toString();
                dynamicData.slides[16]['data']['categories'] = categories.reverse();
                dynamicData.slides[16]['data']['low'] = lowPercents.reverse();
                dynamicData.slides[16]['data']['medium'] = mediumPercents.reverse();
                dynamicData.slides[16]['data']['high'] = highPercents.reverse();
                if(moderatePercents.length){
                    dynamicData.slides[16]['data']['moderate'] = moderatePercents.reverse();
                }
                if(veryHighPercents.length){
                    dynamicData.slides[16]['data']['very high'] = veryHighPercents.reverse();
                }
                if(!showCombinedData){
                    dynamicData.slides = dynamicData.slides.filter((_, index) => !dynamicData.slides[index]['data']['subtitle']?.includes('(Combined)'));
                }
                //slide processing
                let currentDatetime = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD-HHmmss');
                let fileName:string = `${companyDetails?.company_name.replace(/\s/g, "_")}_ZomoHealth_Annual_Report_${currentDatetime}.pptx`;
                let filePath:string = path.join(`${appConstant.ANNUAL_REPORT_FILE_PATH}`);
                let reportFilePath = `${filePath}/${fileName}`;
                await this.commonFileService.dirIsExist(`${appConstant.ANNUAL_REPORT_FILE_PATH}`);
                const buffer = await this.commonFileService.generatePptxWithPython(dynamicData,path.resolve(reportFilePath));

                if (await this.commonFileService.fileExist(reportFilePath)) {
                    let file_name = `reports/campaign/annual/${data?.org_id}/${data?.id}/${fileName}`;
                    await lastValueFrom(
                        this.commonMicroservice.send(
                            { cmd: 'upload_file' },
                            {
                                path: path.resolve(reportFilePath),
                                filename: file_name,
                                userBucket: 'private',
                            },
                        ),
                    );
                    let reportFileUpdate = {
                        file_name,
                        status: 1,
                        cron_status: CronStatus.REPORT
                    };
                    await this.incentiveReportsService.updateRecord({ id: data?.id },reportFileUpdate);
                } else {
                    throw new Error(`File does not exist`);
                }
                await this.commonFileService.removeFileFromLocal(`${reportFilePath}`);
                return true; 
            }
            else{
                throw new Error('No Campaign found');
            }
        } catch (error) {
            this.activityLogService.errorLog(data.id, 'campaign-annual-report', error?.message, error, null);
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
    
    aggregateActivityData(dataArray, map) {
        try{
            if (!Array.isArray(dataArray)) return;
            for (const item of dataArray) {
                const name = item.activity_name;
                if (!map[name]) {
                    map[name] = { ...item };
                } else {
                    map[name].complete += item.complete;
                    map[name].completePer += item.completePer;
                }
            }
        } 
        catch(error){
         throw new Error(error.message); 
        }
    }
    async formatDiff (current, past, yearExists): Promise<string>  {
        try{
            if (!yearExists) return "";
            let diff;
            if(!past || past == 0 || !current || current == 0){
                return diff = '';
            }
            else{
                diff = current - past;
            }
            return diff == 0 ? '0' : diff > 0 ? `+${diff}` : `${diff}`;
        } 
        catch(error){
         throw new Error(error.message); 
        }
    }
    async buildSummaryRows(campaignsSummaryDetails, sortedYears, headers = null) {
        try {
            const summaryRowsConfig = [
                { title: "Total Employees", key: "totalEmployee" },
                { title: "Total Spouses", key: "totalSpouse" },
                { title: "Logged into Zomo Health", key: "totalLoggedIn" },
                { title: "App Downloaded", key: "totalAppDownload" }
            ];

            const rows = await Promise.all(summaryRowsConfig.map(async (config) => {
                if (headers && headers.length) {
                    const row = [config.title];
                    headers.slice(1).forEach(year => {
                        const value = campaignsSummaryDetails[year]?.[config.key] ?? "";
                        row.push(value?.toString());
                    });
                    return row;
                } else {
                    const getSummaryValue = (yearStr) => campaignsSummaryDetails[yearStr]?.[config.key] ?? 0;
                    const current = getSummaryValue(sortedYears[0]);
                    let diffs = await Promise.all(sortedYears.slice(1).map(async (year) => await this.formatDiff(current, getSummaryValue(year), year)));
                    if(diffs.length == 0){
                        diffs = ['','','']
                    }
                    return [config.title, ...diffs];
                }
            }));
            return rows;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async biometricSummary(userList, currentYear, camp_id = null) {
        try{
            const mergedMap = new Map();
            const groupedByYear = {};
            const result = {};
            let userArray = userList?.map(user => user.id);
            let bioWhere = `user_id IN(${userArray.join(',')}) AND (height != "" OR weight != "" OR waist != "" OR alc != "" OR systolic != "" OR diastolic != "" OR total_cholesterol != "" OR hdl != "" OR ldl != "" OR triglycerides != "" OR blood_glucose != "") AND status = '1'`;
            let haWhere = `user_id IN(${userArray.join(',')}) AND (weight != '' OR (height_ft != "" AND height_in != "") OR waist != '' OR alc != '' OR bp_systolic != '' OR bp_diastolic != '' OR total_cholesterol != '' OR hdl != '' OR ldl != '' OR triglycerides != '' OR blood_glucose != '') AND status = '1'`;
            let ftWhere = `user_id IN(${userArray.join(',')}) AND (weight != '' OR (height_ft != '' AND height_in != '') OR alc != '' OR systolic != '' OR diastolic != '' OR chol_total != '' OR hdl != '' OR ldl != '' OR triglycerides != '' OR glucose != '') AND status = '1'`;
            let biometricData = await this.myPlanReportService.biometricsRecord(
                {
                    bio: bioWhere,
                    hra_bio: haWhere,
                    ft_bio: ftWhere,
                },
                [
                    tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS,
                    tableConstant.TRACKERS.TBL_FT_BIOMETRICS,
                ],
                { created: 'DESC', id: 'DESC' },
            );
            for (const entry of biometricData) {
                const key = `${entry.user_id}-${entry.years}`;
                if (!mergedMap.has(key)) {
                    mergedMap.set(key, { ...entry });
                } else {
                const existing = mergedMap.get(key);
                for (const field in entry) {
                    if (entry[field] !== null && (existing[field] === null || existing[field] === undefined)) {
                    existing[field] = entry[field];
                    }
                }
                }
            }
            for (const entry of mergedMap.values()) {
                if (!groupedByYear[entry.years]) {
                    groupedByYear[entry.years] = [];
                }
                groupedByYear[entry.years].push(entry);
            }
            for(let year of Object.keys(groupedByYear)){
                let resultData: any = await this.healthReportService.generateBiometricSummary(userArray,
                    {
                        role_id: 11,
                        source_option: [1,2,3],
                        start_date: year + '-01-01',
                        end_date: year + '-12-31',
                    },
                    currentYear == year && camp_id ? camp_id : null,
                );
                
                result[year] = {
                    avg_bmi: resultData?.['biometric_data']?.length ? resultData?.['biometric_data'][0]['average'] : null,
                    avg_systolic: resultData?.['biometric_data']?.length ? resultData?.['biometric_data'][1]['average'] : null,
                    avg_diastolic: resultData?.['biometric_data']?.length ? resultData?.['biometric_data'][2]['average'] : null,
                    avg_random_blood_glucose: resultData?.['biometric_data']?.length ? resultData?.['biometric_data'][3]['average'] : null,
                    avg_fasting_blood_glucose: resultData?.['biometric_data']?.length ? resultData?.['biometric_data'][4]['average'] : null,
                    avg_alc: resultData?.['biometric_data']?.length ? resultData?.['biometric_data'][5]['average'] : null,
                    avg_total_cholesterol: resultData?.['biometric_data']?.length ? resultData?.['biometric_data'][6]['average'] : null,
                    avg_male_hdl: resultData?.['biometric_data']?.length ? resultData?.['biometric_data'][7]['average'] : 0,
                    avg_female_hdl: resultData?.['biometric_data']?.length ? resultData?.['biometric_data'][8]['average'] : 0,
                    avg_ldl: resultData?.['biometric_data']?.length ? resultData?.['biometric_data'][9]['average'] : null,
                    avg_triglycerides: resultData?.['biometric_data']?.length ? resultData?.['biometric_data'][10]['average'] : null,
                    // avg_hdl: resultData?.['biometric_data']?.length ? resultData?.['biometric_data'][11]['average'] : null,
                    avg_hdl: resultData?.['biometric_data']?.length ? (resultData?.['biometric_data'][7]['average'] + resultData?.['biometric_data'][8]['average']) : null,
                    // avg_weight: resultData?.['biometric_data']?.length ? resultData?.['biometric_data'][12]['average'] : null,
                    // avg_total_hdl: resultData?.['biometric_data']?.length ? resultData?.['biometric_data'][11]['average'] : null,
                    // avg_blood_glucose: resultData?.['biometric_data']?.length ? resultData?.['biometric_data'][13]['average'] : null,
                    total_participant: resultData?.['totalParticipant'],
                    screeningResult: resultData?.['screeningResult'],
                };
                if(currentYear == year || camp_id){
                    result[year]['screeningBiometricResult'] = resultData?.['screeningBiometricResult'];
                }
            }
            return result;
        } 
        catch(error){
         throw new Error(error.message); 
        }
    }
    async calculatePercentages(data: any): Promise<string[]> {
        const values = Object.values(data);
        const total = values.reduce((sum: number, val) => sum + Number(val), 0);
        if (total === 0) {
            return Promise.resolve(Object.keys(data).map(() => "0"));
        }
        const percentages = [];
        for (const key in data) {
            percentages.push(`${((Number(data[key]) / Number(total)) * 100).toFixed(2)}`);
        }
        return percentages.length ? percentages : ["0", "0", "0", "0"];
    }
    async ehaDataProcessing(data: any) {
        try {
            let ehaResult = [];
            let result: any = await this.healthReportService.generateHealthAssessmentQuestionOption(data?.usersIds,[data.orgId],data?.condition?.replace(/user/gi, "users"))
            let healthSummary = result?.health_assessment_summary
            for(let item of healthSummary){
                let data ={};
                let low = 0;
                let medium = 0;
                let moderate = 0;
                let high = 0;
                let veryHigh = 0;
                let lowPercentage = 0;
                let mediumPercentage = 0;
                let moderatePercentage = 0;
                let highPercentage = 0;
                let veryHighPercentage = 0;

                data['title']  = item['Health Assesment Section'];
                if(item['Doing Great']){
                    let value = Number(item['Doing Great'].split('/')[0]);
                    let percentage = Number(item['Doing Great'].split('/')[1].replace('%',''));
                    low += value;
                    lowPercentage += percentage;
                }
                if(item['Almost There']){
                    let value = Number(item['Almost There'].split('/')[0]);
                    let percentage = Number(item['Almost There'].split('/')[1].replace('%',''));
                    medium += value;
                    mediumPercentage += percentage;
                }
                if(item['Almost There - Med']){
                    let value = Number(item['Almost There - Med'].split('/')[0]);
                    let percentage = Number(item['Almost There - Med'].split('/')[1].replace('%',''));
                    medium += value;
                    mediumPercentage += percentage;
                }
                if(item['Almost There - Mod']){
                    let value = Number(item['Almost There - Mod'].split('/')[0]);
                    let percentage = Number(item['Almost There - Mod'].split('/')[1].replace('%',''));
                    moderate += value;
                    moderatePercentage += percentage;
                }
                if(item['We Can Help']){
                    let value = Number(item['We Can Help'].split('/')[0]);
                    let percentage = Number(item['We Can Help'].split('/')[1].replace('%',''));
                    high += value;
                    highPercentage += percentage;
                }
                if(item['We Can Help - High']){
                    let value = Number(item['We Can Help - High'].split('/')[0]);
                    let percentage = Number(item['We Can Help - High'].split('/')[1].replace('%',''));
                    high += value;
                    highPercentage += percentage;
                }
                if(item['We Can Help - Very High']){
                    let value = Number(item['We Can Help - Very High'].split('/')[0]);
                    let percentage = Number(item['We Can Help - Very High'].split('/')[1].replace('%',''));
                    veryHigh += value;
                    veryHighPercentage += percentage;
                }
                data['low']  = low;
                data['low_percentage']  = lowPercentage;
                data['medium']  = medium;
                data['medium_percentage']  = mediumPercentage;
                data['moderate']  = moderate;
                data['moderate_percentage']  = moderatePercentage;
                data['high']  = high;
                data['high_percentage']  = highPercentage;
                data['very_high']  = veryHigh;
                data['very_high_percentage']  = veryHighPercentage;
                ehaResult.push(JSON.parse(JSON.stringify(data)));
            }
            return ehaResult;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async hraDataProcessing(data: any) {
        try {
            let hraResult: any = await this.healthReportService.hraHealthReport({org_id: [data.orgId], start_date: data?.year, end_date: data?.year}, data?.userList?.map(user => user.id))
            hraResult.shift();
            return hraResult;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}