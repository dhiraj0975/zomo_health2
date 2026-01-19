import { CommonDateService, CommonHealthService, appConstant, campaignConstant, tableConstant } from "@common-constants";
import { Injectable } from "@nestjs/common";
import { ActivityService } from "src/module/acitivity/activity.service";
import { CampaignDashboardService, FrontCalculationService, FrontPointsForService, SliderSettingsService } from "src/module/campaign";
import { SortingService } from "src/module/common";
import { DepartmentService } from "src/module/company/department.service";
import { LocationServices } from "src/module/company/location.service";


@Injectable()
export class CampaignDataHelperService {
    constructor(
        private readonly campaignDashboardService: CampaignDashboardService,
        private readonly commonDateService: CommonDateService,
        private readonly commonHealthService: CommonHealthService,
        private readonly sliderSettingsService: SliderSettingsService,
        private readonly frontCalculationService: FrontCalculationService,
        private readonly locationService: LocationServices,
        private readonly departmentService: DepartmentService,
        private readonly sortingService: SortingService,
        private readonly frontPointsForService: FrontPointsForService,
        private readonly activityService: ActivityService,
    ) {}
    async campaignData(req: any = {}, postData: any = {}, activePlugins: any = []) {
        try {
            const company_id = Number(postData?.company_id);
            const campaignId = postData?.campaign_id;
            const user_id = req?.tokenUser?.id;
            const roleId = req?.tokenUser?.role_id || 0;
            const membershipCode = req?.tokenUser?.membership_code || '';
            const onType = postData?.onType || '';
            const tabType = postData?.tabType || '';
            const campaigns = postData?.campaigns;
            let regularData = {};
            let returnData = {};
            let checkCampaign: any = [];
            let checkCampaignCondition: any = `campaign.id in(${campaignId}) AND campaign.organization_id = ${company_id}`;
            checkCampaign = await this.campaignDashboardService.findOne(checkCampaignCondition);
            if (!checkCampaign || checkCampaign.length === 0) {
                throw new Error(await this.commonDateService.frontendReadTranslation(req?.lang ?? 'eng', 'ERR_CAMPAIGN_RECORD_NOT_FOUND'));
            }
            let locationIds = checkCampaign['location_ids'] || '';
            let departmentIds = checkCampaign['department_ids'] || '';
            const sliderSetting = await this.sliderSettingsService.findOne({ org_id: company_id });
            let userDatas = [];
            let wellnesschampion = '';
            let paginateCommonDatas = [{ 'company_id': company_id }, { 'locationIds': locationIds }, { 'departmentIds': departmentIds }];
            let getPaginationDatas = await this.getpaginateDatas(postData, paginateCommonDatas);
            let locationDatas = getPaginationDatas['locationDatas'] || {};
            let departmentDatas = getPaginationDatas['departmentDatas'] || {};
            let paginationLocDatas = getPaginationDatas['paginationLocDatas'] || {};
            let paginationDeptDatas = getPaginationDatas['paginationDeptDatas'] || {};
            let alllocationUserIds = '';
            let alldepartmentUserIds = '';
            if (onType == 'loadmore' && tabType != '') {
                if (tabType == 10) {
                    alllocationUserIds = Object.values(locationDatas)
                        .map((loc: any) => loc.userIds)
                        .filter(ids => ids)
                        .join(',');
                }
                if (tabType == 11) {
                    alldepartmentUserIds = Object.values(departmentDatas)
                        .map((loc: any) => loc.userIds)
                        .filter(ids => ids)
                        .join(',');
                }
            }
            if (roleId == appConstant.ROLE.WCH) {
                let specificUsers = '';
                if (onType == 'loadmore' && tabType != '') {
                    specificUsers = (tabType == 10) ? alllocationUserIds : ((tabType == 11) ? alldepartmentUserIds : '');
                }
                userDatas = await this.campaignDashboardService.getChampionUsers(company_id, user_id, ['user.id', 'user.first_name', 'user.last_name', 'user.profile_image', 'user.code', 'user.gender', 'user.dob', 'user.role_id', 'user.on_insurance_plan', 'user.date_of_hire', 'user.department_id', 'user.location', 'user.username'], specificUsers);
                if (userDatas && userDatas.length > 0) {
                    const userIds = userDatas.map(user => user.id);
                    const userIdsString = userIds.join(',');
                    wellnesschampion = ` AND user.id in (${userIdsString}) `;
                } else {
                    wellnesschampion = ' AND user.id = 0 ';
                }
            } else {
                const joinTableList = [{ 'alias': 'u_setting', 'table': tableConstant.TBL_USERS_SETTINGS, 'on': `u_setting.user_id = user.id`, 'connect': 'user', 'type': 'LEFT' }];
                let userCondition = `user.role_id IN (2,16) AND user.membership_code = '${membershipCode}' AND user.status != 2`;
                if (onType == 'loadmore' && tabType != '') {
                    let specificUsers = (tabType == 10) ? alllocationUserIds : ((tabType == 11) ? alldepartmentUserIds : '');
                    if(specificUsers != ''){
                        userCondition += ` AND user.id IN (${specificUsers})`;
                    }
                }
                userDatas = await this.campaignDashboardService.getAllUsers(userCondition, ['user.id', 'user.first_name', 'user.last_name', 'user.profile_image', 'user.code', 'user.gender', 'user.dob', 'user.role_id', 'user.on_insurance_plan', 'user.date_of_hire', 'user.department_id', 'user.location', 'user.username'], joinTableList);
            }
            let getRewardCondition: any = `reward.campaign_id in(${campaignId}) AND reward.status = 1`;
            let orderBy = { order_id: 'ASC' };
            let rewards: any = await this.campaignDashboardService.getRewardsData(getRewardCondition, orderBy);
            let campaignData = {};
            let campaignUsers = userDatas;
            // changes for current year activity only
            if(postData?.activity == false && postData?.activityList?.length){
                // for(let reward of rewards){
                //     if(reward?.related_activity){
                //         const activity = new Set(reward?.related_activity?.split(','));
                //         const matching = postData?.activityList.filter(id => activity.has(id));
                //         reward.related_activity = matching.join(',');
                //     }
                // }
            }
            // changes for current year activity only
            /* 
            * Default Web Login and App Login activity reward array 
            */
            if (onType != 'loadmore') {
                let campaignList = campaignId.toString().split(',');
                for(let campaign of campaignList){
                    let defaultRewards = structuredClone(campaignConstant.DefaultRewards);
                    defaultRewards.campaign_id = campaign;
                    defaultRewards.activitys[0]['campaign_id'] = campaign;
                    defaultRewards.activitys[1]['campaign_id'] = campaign;
                    rewards.push(defaultRewards);
                }
            }
            /* 
            * Default Web Login and App Login activity reward array 
            */
            if (rewards || rewards.length > 0) {
                const campaignEndDate = (checkCampaign?.['end_date']) ? await this.commonDateService.DateTimeFormat(checkCampaign['end_date'], 'YYYY-MM-DD') + ' 23:59:59' : '';
                let otherCondition = '';
                let departmentIds = [];
                let locationIds = [];
                if ((checkCampaign['department_ids'] != 0 && checkCampaign['department_ids'] != '' && checkCampaign['department_ids'] != null) || (checkCampaign['location_ids'] != 0 && checkCampaign['location_ids'] != '' && checkCampaign['location_ids'] != null)) {
                    departmentIds = (checkCampaign?.['department_ids']) ? checkCampaign['department_ids'].split(',') : [];
                    locationIds = (checkCampaign?.['location_ids']) ? checkCampaign['location_ids'].split(',') : [];
                    if (checkCampaign['department_ids'] != 0 && checkCampaign['department_ids'] != '' && checkCampaign['department_ids'] != null) {
                        if (checkCampaign['location_ids'] != 0 && checkCampaign['location_ids'] != '' && checkCampaign['location_ids'] != null) {
                            campaignUsers = userDatas.filter((user) => {
                                return (
                                    locationIds.includes(user?.location?.toString()) &&
                                    departmentIds.includes(user?.department_id?.toString())
                                );
                            });
                            otherCondition = `user.department_id in(${checkCampaign['department_ids']}) AND user.location in(${checkCampaign['location_ids']}) AND `;
                        } else {
                            campaignUsers = userDatas.filter((user) => {
                                return (
                                    departmentIds.includes(user?.department_id?.toString())
                                );
                            });
                            otherCondition = `user.department_id in(${checkCampaign['department_ids']}) AND `;
                        }
                    } else {
                        campaignUsers = userDatas.filter((user) => {
                            return (
                                departmentIds.includes(user?.location?.toString())
                            );
                        });
                        otherCondition = `user.location in(${checkCampaign['location_ids']}) AND `;
                    }
                }

                let counterDataSetup = {
                    usersIds: {},
                    campTotalUser: campaignUsers.length,
                    totalUserOnly: 0,
                    totalSpouse: 0,
                    userNoteligible: 0,
                    totalUsereligible: 0,
                    useronlyNoteligible: 0,
                    spouseonlyNoteligible: 0,
                    maleTotalUsers: 0,
                    femaleTotalUsers: 0,
                    otherTotalUsers: 0,
                    age18to25TotalUsers: 0,
                    age26to35TotalUsers: 0,
                    age36to45TotalUsers: 0,
                    age46to55TotalUsers: 0,
                    age56to65TotalUsers: 0,
                    age66PlusTotalUsers: 0,
                    age45PlusTotalUsers: 0,
                };
                for (let camUser of campaignUsers) {
                    if (camUser.role_id == 16) {
                        counterDataSetup.totalSpouse++;
                    } else {
                        counterDataSetup.totalUserOnly++;
                    }
                    if (camUser.on_insurance_plan != 'Yes') {
                        counterDataSetup.userNoteligible++;
                    }
                    if (camUser.role_id == 2 && camUser.on_insurance_plan != 'Yes') {
                        counterDataSetup.useronlyNoteligible++;
                    }
                    if (camUser.role_id == 16 && camUser.on_insurance_plan != 'Yes') {
                        counterDataSetup.spouseonlyNoteligible++;
                    }
                    if (camUser.gender == 'm') {
                        counterDataSetup.maleTotalUsers++;
                    } else if (camUser.gender == 'f') {
                        counterDataSetup.femaleTotalUsers++;
                    } else {
                        counterDataSetup.otherTotalUsers++;
                    }
                    if (camUser.age >= 18 && camUser.age <= 25) {
                        counterDataSetup.age18to25TotalUsers++;
                    } 
                    if (camUser.age >= 26 && camUser.age <= 35) {
                        counterDataSetup.age26to35TotalUsers++;
                    } 
                    if (camUser.age >= 36 && camUser.age <= 45) {
                        counterDataSetup.age36to45TotalUsers++;
                    } 
                    if (camUser.age >= 46 && camUser.age <= 55) {
                        counterDataSetup.age46to55TotalUsers++;
                    } 
                    if (camUser.age >= 56 && camUser.age <= 65) {
                        counterDataSetup.age56to65TotalUsers++;
                    } 
                    if (camUser.age >= 66) {
                        counterDataSetup.age66PlusTotalUsers++;
                    } 
                        if(camUser.age >= 45){
                        counterDataSetup.age45PlusTotalUsers++;
                    }  
                    counterDataSetup.usersIds[camUser.id] =
                    camUser.on_insurance_plan == 'Yes' ? 1 : 0;
                }
                let orgSettingOptions = [];
                if (onType != 'loadmore') {
                    orgSettingOptions = [
                        {
                            '1':  "Combined",
                            '2':  "Employees",
                            '3':  "Spouses",
                            '4':  "On_Health_Plan_Employees",
                            '5':  "Off_Health_Plan_Employess",
                            '6':  "On_Health_Plan_Spouses",
                            '7':  "Off_Health_Plan_Spouses",
                            '8':  "Combined_On_Health_Plan",
                            '9':  "Combined_Off_Health_Plan",
                            '10':  "Location",
                            '11':  "Department",
                            '12':  "Gender",
                            '13':  "Age_Group"
                        }
                    ];
                }

                let commonDatas = [{ 'membershipCode': membershipCode }, { 'company_id': company_id }, { 'campaignId': campaignId }, { 'rewards': rewards }, { 'otherCondition': otherCondition }, { 'activePlugins': activePlugins }, { 'sliderSetting': sliderSetting }, { 'wellnesschampion': wellnesschampion }, { 'campaignUsers': campaignUsers }, { 'userDatas': userDatas }, { 'counterDataSetup': counterDataSetup }, { 'regularData': regularData }, { 'orgSettingOptions': orgSettingOptions }, { 'campaignEndDate': campaignEndDate }, { locationDatas: locationDatas }, { departmentDatas: departmentDatas }, { paginationLocDatas: paginationLocDatas }, { paginationDeptDatas: paginationDeptDatas }, {campaigns: campaigns}];

                if (postData.searchType) {
                    if (postData.searchType != 1) {
                        let addDays = 30;
                        if (postData.searchType == 3) {
                            addDays = 90;
                        } else if (postData.searchType == 4) {
                            addDays = 180;
                        } else if (postData.searchType == 5) {
                            addDays = 365;
                        }
                        const newStartDate = await this.commonDateService.getTodayDate().subtract(addDays, 'days').format('MM-DD-YYYY');
                        const newEndDate = await this.commonDateService.getTodayDate().subtract(1, 'day').format('MM-DD-YYYY');
                        postData.firstStartDate = await this.commonDateService.DateTimeFormat(checkCampaign['start_date'], 'MM-DD-YYYY');
                        postData.firstEndDate = await this.commonDateService.DateTimeFormat(checkCampaign['end_date'], 'MM-DD-YYYY');
                        postData.secondStartDate = newStartDate;
                        postData.secondEndDate = newEndDate;
                    }
                }
                const getCampaignDatas = await this.campaignDataCalculation('normal', postData, req, commonDatas);
                regularData = getCampaignDatas;
                if (postData.searchType) {
                    let filterDatas = {};
                    let ScommonDatas = [{ 'membershipCode': membershipCode }, { 'company_id': company_id }, { 'campaignId': campaignId }, { 'rewards': rewards }, { 'otherCondition': otherCondition }, { 'activePlugins': activePlugins }, { 'sliderSetting': sliderSetting }, { 'wellnesschampion': wellnesschampion }, { 'campaignUsers': campaignUsers }, { 'userDatas': userDatas }, { 'counterDataSetup': counterDataSetup }, { 'regularData': filterDatas }, { 'orgSettingOptions': orgSettingOptions }, { 'campaignEndDate': campaignEndDate }, { locationDatas: locationDatas }, { departmentDatas: departmentDatas }, { paginationLocDatas: paginationLocDatas }, { paginationDeptDatas: paginationDeptDatas }, {campaigns: campaigns}];

                    const getFilterCampaignDatas = await this.campaignDataCalculation('filter', postData, req, ScommonDatas);
                    filterDatas = getFilterCampaignDatas;
                    if (Object.keys(regularData['rewards']).length > 0) {
                        for (let [key, value] of Object.entries(regularData['rewards'])) {
                            if (value['tabData'] && Object.keys(value['tabData']).length > 0) {
                                for (let [tKey, tData] of Object.entries(value['tabData'])) {
                                    let atlatestOneLoginActivtyPer = 0;
                                    if (![10, 11, 12, 13].includes(Number(tKey))) {
                                        if (Object.keys(regularData['defaultActivitys']).length > 0 && regularData['defaultActivitys']['tabData'] && Object.keys(regularData['defaultActivitys']['tabData']).length > 0) {
                                            atlatestOneLoginActivtyPer = regularData['defaultActivitys']['tabData'][tKey]['activityDetails'][0]['completePer'];
                                        }
                                        if (tData['activityDetails'] && tData['activityDetails'].length > 0) {
                                            for (const [aKey, aData] of tData['activityDetails'].entries()) {
                                                let regulareComplete = aData['complete'];
                                                let filterComplete = filterDatas['rewards'][key]['tabData'][tKey]['activityDetails'][aKey]['complete'];
                                                aData['EngDifference'] = filterComplete - regulareComplete;
                                                aData['EngDifferencePer'] = (aData['EngDifference'] != 0) ? Number(((aData['EngDifference'] * 100) / regulareComplete).toString()) : 0;
                                            }
                                        }
                                        if (tData['allRewardDetails'] && tData['allRewardDetails'].length > 0) {
                                            for (const [rKey, rData] of tData['allRewardDetails'].entries()) {
                                                let regulareComplete = rData['complete'];
                                                let filterComplete = filterDatas['rewards'][key]['tabData'][tKey]['allRewardDetails'][rKey]['complete'];
                                                rData['EngDifference'] = filterComplete - regulareComplete;
                                                rData['EngDifferencePer'] = (rData['EngDifference'] != 0) ? Number(((rData['EngDifference'] * 100) / regulareComplete).toString()) : 0;
                                            }
                                        }
                                        tData['graphData'][0]['value'] = atlatestOneLoginActivtyPer;
                                    } else {
                                        if ((tKey === '10' || tKey === '11' || tKey === '12' || tKey === '13') && tData['rewardData'] && tData['rewardData'].length > 0) {
                                            for (const [lKey, lData] of tData['rewardData'].entries()) {
                                                if (lData['data'] && Object.keys(lData['data']).length > 0) {
                                                    for (const [lsKey, lsData] of Object.entries(lData['data'])) {
                                                        let regulareComplete = lsData['complete'];
                                                        let filterComplete = filterDatas['rewards'][key]['tabData'][tKey]['rewardData'][lKey]['data'][lsKey]['complete'];
                                                        lsData['EngDifference'] = filterComplete - regulareComplete;
                                                        lsData['EngDifferencePer'] = (lsData['EngDifference'] != 0) ? Number(((lsData['EngDifference'] * 100) / regulareComplete).toString()) : 0;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (regularData?.['defaultActivitys'] && Object.keys(regularData['defaultActivitys']).length > 0 && regularData['defaultActivitys']['tabData'] && Object.keys(regularData['defaultActivitys']['tabData']).length > 0) {
                        for (let [tKey, tData] of Object.entries(regularData['defaultActivitys']['tabData'])) {
                            if (tData['activityDetails'] && tData['activityDetails'].length > 0) {
                                for (const [aKey, aData] of tData['activityDetails'].entries()) {
                                    let regulareComplete = aData['complete'];
                                    let filterComplete = filterDatas['defaultActivitys']['tabData'][tKey]['activityDetails'][aKey]['complete'];
                                    aData['EngDifference'] = filterComplete - regulareComplete;
                                    aData['EngDifferencePer'] = (aData['EngDifference'] != 0) ? Number(((aData['EngDifference'] * 100) / regulareComplete).toString()) : 0;
                                }
                            }
                        }
                    }
                    if (onType == 'loadmore') {
                        delete(regularData['rewards']);
                        regularData['rewardData'] = regularData['data'];
                        delete(regularData['data']);
                        if ((tabType === '10' || tabType === '11') && regularData['rewardData'] && regularData['rewardData'].length > 0) {
                            for (const [key, value] of Object.entries(regularData['rewardData'] || {})) {
                                if (value['data'] && Object.keys(value['data']).length > 0) {
                                    for (const [lKey, lData] of Object.entries(value['data'] || {})) {
                                        let regulareComplete = lData['complete'];
                                        let filterComplete = filterDatas['data'][key]['data'][lKey]['complete'];
                                        lData['EngDifference'] = filterComplete - regulareComplete;
                                        lData['EngDifferencePer'] = (lData['EngDifference'] != 0) ? Number(((lData['EngDifference'] * 100) / regulareComplete).toString()) : 0;
                                    }
                                }
                            }
                        }
                        regularData['paginationData'] = regularData['paginationData'];
                    }
                    returnData = regularData;
                } else {
                    if (Object.keys(regularData['rewards']).length > 0) {
                        for (let [key, value] of Object.entries(regularData['rewards'])) {
                            if (value['tabData'] && Object.keys(value['tabData']).length > 0) {
                                for (let [tKey, tData] of Object.entries(value['tabData'])) {
                                    let atlatestOneLoginActivtyPer = 0;
                                    if (![10, 11, 12, 13].includes(Number(tKey))) {
                                        if (Object.keys(regularData['defaultActivitys']).length > 0 && regularData['defaultActivitys']['tabData'] && Object.keys(regularData['defaultActivitys']['tabData']).length > 0) {
                                            atlatestOneLoginActivtyPer = regularData['defaultActivitys']['tabData'][tKey]['activityDetails'][0]['completePer'];
                                        }
                                        tData['graphData'][0]['value'] = atlatestOneLoginActivtyPer;
                                    }
                                }
                            }
                        }
                    }
                    if (onType == 'loadmore') {
                        delete(regularData['rewards']);
                        regularData['rewardData'] = regularData['data'];
                        delete(regularData['data']);
                        regularData['paginationData'] = regularData['paginationData'];
                    }
                    returnData = regularData;
                }
            }
            return returnData;
        } 
        catch(error){
            throw new Error(error.message); 
        }
    }

    async campaignDataCalculation(type: any = 'normal', postData: any = {}, req: any = {}, commonDatas: any = []) {
        try {
            let {
                membershipCode = null,
                company_id = null,
                campaignId = null,
                rewards = {},
                otherCondition = '',
                activePlugins = {},
                sliderSetting = {},
                wellnesschampion = '',
                campaignUsers = [],
                userDatas = [],
                counterDataSetup = {},
                regularData = {},
                orgSettingOptions = [],
                campaignEndDate = null,
                locationDatas = {},
                departmentDatas = {},
                paginationLocDatas = {},
                paginationDeptDatas = {},
                campaigns,
            } = Object.assign({}, ...commonDatas);
            let usersIds = counterDataSetup['usersIds'];
            let campTotalUser = counterDataSetup['campTotalUser'];
            let totalUserOnly = counterDataSetup['totalUserOnly'];
            let totalSpouse = counterDataSetup['totalSpouse'];
            let userNoteligible = counterDataSetup['userNoteligible'];
            let totalUsereligible = counterDataSetup['totalUsereligible'];
            let useronlyNoteligible = counterDataSetup['useronlyNoteligible'];
            let spouseonlyNoteligible = counterDataSetup['spouseonlyNoteligible'];
            let maleTotalUsers = counterDataSetup['maleTotalUsers'];
            let femaleTotalUsers = counterDataSetup['femaleTotalUsers'];
            let otherTotalUsers = counterDataSetup['otherTotalUsers'];
            let age18to25TotalUsers = counterDataSetup['age18to25TotalUsers'];
            let age26to35TotalUsers = counterDataSetup['age26to35TotalUsers'];
            let age36to45TotalUsers = counterDataSetup['age36to45TotalUsers'];
            let age46to55TotalUsers = counterDataSetup['age46to55TotalUsers'];
            let age56to65TotalUsers = counterDataSetup['age56to65TotalUsers'];
            let age66PlusTotalUsers = counterDataSetup['age66PlusTotalUsers'];
            let age45PlusTotalUsers = counterDataSetup['age45PlusTotalUsers'];
            const orgSettingOptionsKeys = (orgSettingOptions.length > 0) ? Object.keys(orgSettingOptions[0]) : [];
            const onType = postData?.onType || '';
            const tabType = postData?.tabType || '';
            let LOGGED_INTO_THE_SITE_AT_LEAST_ONCE = await this.commonDateService.frontendReadTranslation(req?.lang ?? 'eng', "LOGGED_INTO_THE_SITE_AT_LEAST_ONCE", `/LC_MESSAGES/Campaign/Campaigns`, `static`);
            let COMPLETED_ALL_THE_REQUIREMENTS = await this.commonDateService.frontendReadTranslation(req?.lang ?? 'eng', "COMPLETED_ALL_THE_REQUIREMENTS", `/LC_MESSAGES/Campaign/Campaigns`, `static`);
            let ON_TRACK_AND_PARTICIPATING = await this.commonDateService.frontendReadTranslation(req?.lang ?? 'eng', "ON_TRACK_&_PARTICIPATING", `/LC_MESSAGES/Campaign/Campaigns`, `static`);
            let CAMPAIGN_DEADLINE_COUNTDOWN = await this.commonDateService.frontendReadTranslation(req?.lang ?? 'eng', "CAMPAIGN_DEADLINE_COUNTDOWN", `/LC_MESSAGES/Campaign/Campaigns`, `static`);
            let dateRange = 0;
            let filterStartDate = '';
            let filterEndDate = '';
            if (postData.searchType) {
                if (type == 'filter') {
                    filterStartDate = await this.commonDateService.DateTimeFormat(postData?.secondStartDate, 'YYYY-MM-DD', 'MM-DD-YYYY') + ' 00:00:00';
                    filterEndDate = await this.commonDateService.DateTimeFormat(postData?.secondEndDate, 'YYYY-MM-DD', 'MM-DD-YYYY') + ' 23:59:59';
                } else {
                    filterStartDate = await this.commonDateService.DateTimeFormat(postData?.firstStartDate, 'YYYY-MM-DD', 'MM-DD-YYYY') + ' 00:00:00';
                    filterEndDate = await this.commonDateService.DateTimeFormat(postData?.firstEndDate, 'YYYY-MM-DD', 'MM-DD-YYYY') + ' 23:59:59';
                }
                dateRange = 1;
            }
            let activityList = [];
            let statusCondition = ` AND user.status != 2`;
            let rewOtherData = [{ 'membershipCode': membershipCode }, { 'otherCondition': otherCondition }, { 'company_id': company_id }, { 'campaignId': campaignId }, { 'activePlugins': activePlugins }, { 'slider': sliderSetting }, { 'wellnesschampion': wellnesschampion }, { 'statusCondition': statusCondition }, { 'dateRange': dateRange }, { 'filterStartDate': filterStartDate }, { 'filterEndDate': filterEndDate }, {campaigns: campaigns}];
            let rewardDatas = await this.getMultiRewarddatas(4, JSON.parse(JSON.stringify(rewards)), rewOtherData); /* 4 is Org and Champaign Dashboard */
            if(postData?.activity){
                for(let activityId of rewardDatas){
                    if(activityId['activityList']){
                        activityList = [...activityList, ...activityId['activityList']];
                    }
                    if(activityId['activitys']){
                        activityList = [...activityList, ...activityId['activitys'].filter(ele => ele.activity_id).map(ele => ele['activity_id'])];
                    }
                }
                regularData['activityId'] = [...new Set(activityList)];
            }
            let rewardWiseUsers = new Map();
            let camOtherData = [{ 'membershipCode': membershipCode }, { 'totalUsers': campaignUsers.length }, { 'userDatas': userDatas }, { 'company_id': company_id }, { 'campaignId': campaignId }, { 'activePlugins': activePlugins }, {campaigns: campaigns}];
            let rewardWiseUserDatas: any = await this.frontCalculationService.getCampaignUserCalculation(4, JSON.parse(JSON.stringify(rewardDatas)), camOtherData);
            let atLeastOneCompletedAll = {};
            let atLeastOneCompletedUser = {};
            let atLeastOneCompletedSpouse = {};
            let atLeastOneCompletedCOFFHP = {};
            let atLeastOneCompletedOFFHPU = {};
            let atLeastOneCompletedOFFHPS = {};
            let completeCAll = 0;
            let completeCUser = 0;
            let completeCSpouse = 0;
            let completeCCOFFHP = 0;
            let completeCOFFHPU = 0;
            let completeCOFFHPS = 0;
            let defaultRewardList = Object.values(rewardWiseUserDatas).filter(ele => ele['id'] == 0);
            let defaultReward = defaultRewardList[0] || {};
            const keysToMerge = ['Campaignactivity','Campaigncategory','Campaignchallenges','CampaignSpousechallenges','cashReward','InsReward','otherReward','userList'];
            for (let drwd of defaultRewardList) {
                for (let key of keysToMerge) {
                    if (Array.isArray(drwd[key])) {
                        if (!defaultReward[key]) defaultReward[key] = [];
                        defaultReward[key] = [...new Set([...defaultReward[key], ...drwd[key]])];
                    } else if (drwd[key] !== undefined) {
                        defaultReward[key] = drwd[key];
                    }
                }
            }
            rewardWiseUserDatas = Object.values(rewardWiseUserDatas).filter(ele => ele['id'] != 0);
            if(Object.keys(defaultReward).length > 0){
                rewardWiseUserDatas.push(defaultReward);
            }
            for (let rwd of rewardWiseUserDatas) {
                const rewardId = rwd['id'];
                let rewardNme =  rwd['reward_name'];
                if (!regularData['rewards']) {
                    regularData['rewards'] = {};
                }
                if (!regularData['rewards'][`${rewardId}`]) {
                    regularData['rewards'][`${rewardId}`] = {};
                }
                regularData['rewards'][`${rewardId}`]['id'] = rewardId;
                regularData['rewards'][`${rewardId}`]['campaign_id'] = campaignId.includes(',') ? rwd['campaign_id'] : campaignId;
                regularData['rewards'][`${rewardId}`]['reward_name'] = rewardNme;
                regularData['rewards'][`${rewardId}`]['order'] = rwd['order_id'];
                let orgTabSetting = rwd['org_tab_setting'] && rwd['org_tab_setting'] != '' ? rwd['org_tab_setting'].split(',') : ['1', '2', '3','8','9','10','11','12','13'];
                let totaluneligibale = [];
                let maxPoint = 0;
                let userPointsTotal = rwd['userPointsTotal'];
                let userActivityTotal = rwd['userActivityTotal'];
                let totalActivity = 0;
                let totalActivityS = 0;
                maxPoint = rwd['RewardsmaxPoint'];
                let tempR = rwd['Rewards'];
                if (maxPoint < 100) {
                    maxPoint = 100;
                }
                let activityArray = [];
                let EngSummaryCombined = [];
                let EngSummaryEmployee = [];
                let EngSummarySpouse = [];
                let EngSummaryCombinedOnHealthPlan = [];
                let EngSummaryCombinedOffHealthPlan = [];
                let EngSummaryEmpOnHealthPlan = [];
                let EngSummaryEmpOffHealthPlan = [];
                let EngSummarySpouseOnHealthPlan = [];
                let EngSummarySpouseOffHealthPlan = [];
                let tempdentists = 0;
                let dentistresult = [];
                atLeastOneCompletedAll = { ...atLeastOneCompletedAll, ...rwd['completeLOneAll'] };
                atLeastOneCompletedUser = { ...atLeastOneCompletedUser, ...rwd['completeLOneUser'] };
                atLeastOneCompletedSpouse = { ...atLeastOneCompletedSpouse, ...rwd['completeLOneSpouse'] };
                atLeastOneCompletedCOFFHP = { ...atLeastOneCompletedCOFFHP, ...rwd['completeLOneCOFFHP'] };
                atLeastOneCompletedOFFHPU = { ...atLeastOneCompletedOFFHPU, ...rwd['completeLOneOFFHPU'] };
                atLeastOneCompletedOFFHPS = { ...atLeastOneCompletedOFFHPS, ...rwd['completeLOneOFFHPS'] };
                completeCAll = Object.keys(atLeastOneCompletedAll).length;
                completeCUser = Object.keys(atLeastOneCompletedUser).length;
                completeCSpouse = Object.keys(atLeastOneCompletedSpouse).length;
                completeCCOFFHP = Object.keys(atLeastOneCompletedCOFFHP).length;
                completeCOFFHPU = Object.keys(atLeastOneCompletedOFFHPU).length;
                completeCOFFHPS = Object.keys(atLeastOneCompletedOFFHPS).length;
                if(onType != 'loadmore'){
                    if (rwd['Campaignactivity'] && rwd['Campaignactivity'].length > 0) {
                        let acSK = 1;
                        for (let actRaw of rwd['Campaignactivity']) {
                            let totalUserOnlyeligible = 0;
                            const campActId = actRaw['id'];
                            const actId = actRaw['activity_id'];
                            const catId = actRaw['category_id'];
                            let complete = actRaw['complete'];
                            let completePer = 0;
                            let completeS = actRaw['completeS'];
                            let completePerS = 0;
                            let completeU = 0;
                            let completePerU = 0;
                            let completeCONHP = 0;
                            let completePerCONHP = 0;
                            let completeCOFFHP = actRaw['completeCOFFHP'];
                            let completePerCOFFHP = 0;
                            let completeONHPU = 0;
                            let completePerONHPU = 0;
                            let completeOFFHPU = actRaw['completeOFFHPU'];
                            let completePerOFFHPU = 0;
                            let completeONHPS = 0;
                            let completePerONHPS = 0;
                            let completeOFFHPS = actRaw['completeOFFHPS'];
                            let completePerOFFHPS = 0;
                            if (actRaw['required_by_user'] == 'Y') {
                                totalActivity += 1;
                            }
                            if (actRaw['required_by_spouse'] == 'Y') {
                                totalActivityS += 1;
                            }
                            let actName = '';
                            if (actRaw['cust_name'] && actRaw['cust_name'] != '') {
                                actName =  actRaw['cust_name'];
                            } else {
                                actName = actRaw?.['activity']?.['activity_name'] || '';
                            }
                            let oid = 0;
                            if (actRaw['order_id'] != "" && actRaw['order_id'] != 0) {
                                oid = actRaw['order_id'];
                            }
                            let ReqBy = "N";
                            if (actRaw['required_by_user'] == "Y" || actRaw['required_by_user'] == "Y") {
                                ReqBy = "Y";
                            }
                            let dateorder: any = "";
                            if (actRaw['end_date'] != "" && actRaw['end_date'] != 0) {
                                dateorder = await this.commonDateService.DateTimeFormat(actRaw['end_date'], 'timestamp');
                            }
                            let NewActivityArray = [
                                {
                                    'activity_name': actName,
                                    'start_date': await this.commonDateService.DateTimeFormat(actRaw['start_date'], 'MM-DD-YYYY'),
                                    'end_date': await this.commonDateService.DateTimeFormat(actRaw['end_date'], 'MM-DD-YYYY'),
                                    'dateorder': dateorder,
                                    'ReqBy': ReqBy,
                                    'order_id': oid
                                }
                            ];
                            activityArray = [...activityArray, ...NewActivityArray];
                            totalUsereligible = campTotalUser;
                            totalUserOnlyeligible = totalUserOnly;
                            if (complete > 0) {
                                completePer = (complete * 100) / totalUsereligible;
                            }
                            if (completeS > 0 && totalSpouse > 0) {
                                completePerS = (completeS * 100) / totalSpouse;
                            }
                            completeU = complete - completeS;
                            if (completeU > 0 && (totalUsereligible - totalSpouse) > 0) {
                                completePerU = (completeU * 100) / (totalUsereligible - totalSpouse);
                            }
                            if (completeCOFFHP > 0 && userNoteligible > 0) {
                                completePerCOFFHP = (completeCOFFHP * 100) / userNoteligible;
                            }
                            completeCONHP = complete - completeCOFFHP;
                            if (completeCONHP > 0 && (totalUsereligible - userNoteligible) > 0) {
                                completePerCONHP = (completeCONHP * 100) / (totalUsereligible - userNoteligible);
                            }
                            if (completeOFFHPU > 0 && useronlyNoteligible > 0) {
                                completePerOFFHPU = (completeOFFHPU * 100) / useronlyNoteligible;
                            }
                            completeONHPU = completeU - completeOFFHPU;
                            if (completeONHPU > 0 && (totalUserOnlyeligible - useronlyNoteligible) > 0) {
                                completePerONHPU = (completeONHPU * 100) / (totalUserOnlyeligible - useronlyNoteligible);
                            }
                            if (completeOFFHPS > 0 && spouseonlyNoteligible > 0) {
                                completePerOFFHPS = (completeOFFHPS * 100) / spouseonlyNoteligible;
                            }
                            completeONHPS = completeS - completeOFFHPS;
                            if (completeONHPS > 0 && (totalSpouse - spouseonlyNoteligible) > 0) {
                                completePerONHPS = (completeONHPS * 100) / (totalSpouse - spouseonlyNoteligible);
                            }
                            let NewEngSummaryCombined = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: complete, completePer: completePer, dateorder: dateorder, ReqBy: ReqBy, oid: oid }]);
                            EngSummaryCombined = [...EngSummaryCombined, ...NewEngSummaryCombined];
                            let NewEngSummaryEmployee = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeU, completePer: completePerU, dateorder: dateorder, ReqBy: ReqBy, oid: oid }]);
                            EngSummaryEmployee = [...EngSummaryEmployee, ...NewEngSummaryEmployee];

                            let NewEngSummarySpouse = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeS, completePer: completePerS, dateorder: dateorder, ReqBy: ReqBy, oid: oid }]);
                            EngSummarySpouse = [...EngSummarySpouse, ...NewEngSummarySpouse];
                            let NewEngSummaryCombinedOnHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeCONHP, completePer: completePerCONHP, dateorder: dateorder, ReqBy: ReqBy, oid: oid }]);
                            EngSummaryCombinedOnHealthPlan = [...EngSummaryCombinedOnHealthPlan, ...NewEngSummaryCombinedOnHealthPlan];
                            let NewEngSummaryCombinedOffHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeCOFFHP, completePer: completePerCOFFHP, dateorder: dateorder, ReqBy: ReqBy, oid: oid }]);
                            EngSummaryCombinedOffHealthPlan = [...EngSummaryCombinedOffHealthPlan, ...NewEngSummaryCombinedOffHealthPlan];
                            let NewEngSummaryEmpOnHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeONHPU, completePer: completePerONHPU, dateorder: dateorder, ReqBy: ReqBy, oid: oid }]);
                            EngSummaryEmpOnHealthPlan = [...EngSummaryEmpOnHealthPlan, ...NewEngSummaryEmpOnHealthPlan];
                            let NewEngSummaryEmpOffHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeOFFHPU, completePer: completePerOFFHPU, dateorder: dateorder, ReqBy: ReqBy, oid: oid }]);
                            EngSummaryEmpOffHealthPlan = [...EngSummaryEmpOffHealthPlan, ...NewEngSummaryEmpOffHealthPlan];
                            let NewEngSummarySpouseOnHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeONHPS, completePer: completePerONHPS, dateorder: dateorder, ReqBy: ReqBy, oid: oid }]);
                            EngSummarySpouseOnHealthPlan = [...EngSummarySpouseOnHealthPlan, ...NewEngSummarySpouseOnHealthPlan];
                            let NewEngSummarySpouseOffHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeOFFHPS, completePer: completePerOFFHPS, dateorder: dateorder, ReqBy: ReqBy, oid: oid }]);
                            EngSummarySpouseOffHealthPlan = [...EngSummarySpouseOffHealthPlan, ...NewEngSummarySpouseOffHealthPlan];
                            acSK++;
                            if (actRaw?.['activity'] && actRaw['activity']['id'] == 49 && actRaw['users'][0]) {
                                tempdentists = 1;
                            }
                        }
                    }
                    if (rwd['Campaigncategory'] && rwd['Campaigncategory'].length > 0) {
                        for (let catRaw of rwd['Campaigncategory']) {
                            let ctotalUserOnlyeligible = 0;
                            if (catRaw['required_by_user'] == 'Y') {
                                totalActivity += 1;
                            }
                            if (catRaw['required_by_spouse'] == 'Y') {
                                totalActivityS += 1;
                            }
                            let actName = '';
                            if (catRaw['cust_name'] && catRaw['cust_name'] != '') {
                               actName = catRaw['cust_name'];
                            } else {
                                actName = catRaw?.['category']?.['category_name'] || '';
                            }
                            let oid = '';
                            if (catRaw['order_id'] != "" && catRaw['order_id'] != 0) {
                                oid = catRaw['order_id'];
                            }
                            let ReqBy = "N";
                            if (catRaw['required_by_user'] == "Y" || catRaw['required_by_user'] == "Y") {
                                ReqBy = "Y";
                            }
                            let dateorder: any = "";
                            if (catRaw['end_date'] != "" && catRaw['end_date'] != 0) {
                                dateorder = await this.commonDateService.DateTimeFormat(catRaw['end_date'], 'timestamp');
                            }
                            let NewActivityArray = this.commonHealthService.campaignObjectStructure('Activity', [{ actName: actName, start_date: await this.commonDateService.DateTimeFormat(catRaw['start_date'], 'MM-DD-YYYY'), end_date: await this.commonDateService.DateTimeFormat(catRaw['end_date'], 'MM-DD-YYYY'), dateorder: dateorder, ReqBy: ReqBy, oid: oid, activitys: [] }]);
                            delete (catRaw['challenges']);
                            let subEngSummaryCombined = [];
                            let subEngSummaryEmployee = [];
                            let subEngSummarySpouse = [];
                            let subEngSummaryCombinedOnHealthPlan = [];
                            let subEngSummaryCombinedOffHealthPlan = [];
                            let subEngSummaryEmpOnHealthPlan = [];
                            let subEngSummaryEmpOffHealthPlan = [];
                            let subEngSummarySpouseOnHealthPlan = [];
                            let subEngSummarySpouseOffHealthPlan = [];
                            if (rwd['cat_activity_visibility'] && rwd['cat_activity_visibility'] != 0 && catRaw['activity'] && catRaw['activity'].length > 0) {
                                for (let actRaw of catRaw['activity']) {
                                    let catotalUserOnlyeligible = 0;
                                    let complete = actRaw['complete'];
                                    let completePer = 0;
                                    let completeS = actRaw['completeS'];
                                    let completePerS = 0;
                                    let completeU = 0;
                                    let completePerU = 0;
                                    let completeCONHP = 0;
                                    let completePerCONHP = 0;
                                    let completeCOFFHP = actRaw['completeCOFFHP'];
                                    let completePerCOFFHP = 0;
                                    let completeONHPU = 0;
                                    let completePerONHPU = 0;
                                    let completeOFFHPU = actRaw['completeOFFHPU'];
                                    let completePerOFFHPU = 0;
                                    let completeONHPS = 0;
                                    let completePerONHPS = 0;
                                    let completeOFFHPS = actRaw['completeOFFHPS'];
                                    let completePerOFFHPS = 0;
                                    if (actRaw['required_by_user'] == 'Y') {
                                        totalActivity += 1;
                                    }
                                    if (actRaw['required_by_spouse'] == 'Y') {
                                        totalActivityS += 1;
                                    }
                                    let actName = '';
                                    if (actRaw['cust_name'] && actRaw['cust_name'] != '') {
                                        actName =  actRaw['cust_name'];
                                    } else {
                                        actName = actRaw?.['activity']?.['activity_name'] || '';
                                    }
                                    let oid = 0;
                                    if (actRaw['order_id'] != "" && actRaw['order_id'] != 0) {
                                        oid = actRaw['order_id'];
                                    }
                                    let ReqBy = "N";
                                    if (actRaw['required_by_user'] == "Y" || actRaw['required_by_user'] == "Y") {
                                        ReqBy = "Y";
                                    }
                                    let dateorder: any = "";
                                    if (actRaw['end_date'] != "" && actRaw['end_date'] != 0) {
                                        dateorder = await this.commonDateService.DateTimeFormat(actRaw['end_date'], 'timestamp');
                                    }
                                    let NewsubActivityArray = this.commonHealthService.campaignObjectStructure('Activity', [{ actName: actName, start_date: await this.commonDateService.DateTimeFormat(actRaw['start_date'], 'MM-DD-YYYY'), end_date: await this.commonDateService.DateTimeFormat(actRaw['end_date'], 'MM-DD-YYYY'), dateorder: dateorder, ReqBy: ReqBy, oid: oid }]);
                                    NewActivityArray[0]['activitys'] = [...NewActivityArray[0]['activitys'], ...NewsubActivityArray];
                                    totalUsereligible = campTotalUser;
                                    catotalUserOnlyeligible = totalUserOnly;
                                    if (complete > 0) {
                                        completePer = (complete * 100) / totalUsereligible;
                                    }
                                    if (completeS > 0 && totalSpouse > 0) {
                                        completePerS = (completeS * 100) / totalSpouse;
                                    }
                                    completeU = complete - completeS;
                                    if (completeU > 0 && (totalUsereligible - totalSpouse) > 0) {
                                        completePerU = (completeU * 100) / (totalUsereligible - totalSpouse);
                                    }
                                    if (completeCOFFHP > 0 && userNoteligible > 0) {
                                        completePerCOFFHP = (completeCOFFHP * 100) / userNoteligible;
                                    }
                                    completeCONHP = complete - completeCOFFHP;
                                    if (completeCONHP > 0 && (totalUsereligible - userNoteligible) > 0) {
                                        completePerCONHP = (completeCONHP * 100) / (totalUsereligible - userNoteligible);
                                    }
                                    if (completeOFFHPU > 0 && useronlyNoteligible > 0) {
                                        completePerOFFHPU = (completeOFFHPU * 100) / useronlyNoteligible;
                                    }
                                    completeONHPU = completeU - completeOFFHPU;
                                    if (completeONHPU > 0 && (catotalUserOnlyeligible - useronlyNoteligible) > 0) {
                                        completePerONHPU = (completeONHPU * 100) / (catotalUserOnlyeligible - useronlyNoteligible);
                                    }
                                    if (completeOFFHPS > 0 && spouseonlyNoteligible > 0) {
                                        completePerOFFHPS = (completeOFFHPS * 100) / spouseonlyNoteligible;
                                    }
                                    completeONHPS = completeS - completeOFFHPS;
                                    if (completeONHPS > 0 && (totalSpouse - spouseonlyNoteligible) > 0) {
                                        completePerONHPS = (completeONHPS * 100) / (totalSpouse - spouseonlyNoteligible);
                                    }
                                    let NewSubEngSummaryCombined = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: complete, completePer: completePer, dateorder: dateorder, ReqBy: ReqBy, oid: oid }]);
                                    subEngSummaryCombined = [...subEngSummaryCombined, ...NewSubEngSummaryCombined];
                                    let NewSubEngSummaryEmployee = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeU, completePer: completePerU, dateorder: dateorder, ReqBy: ReqBy, oid: oid }]);
                                    subEngSummaryEmployee = [...subEngSummaryEmployee, ...NewSubEngSummaryEmployee];
                                    let NewSubEngSummarySpouse = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeS, completePer: completePerS, dateorder: dateorder, ReqBy: ReqBy, oid: oid }]);
                                    subEngSummarySpouse = [...subEngSummarySpouse, ...NewSubEngSummarySpouse];
                                    let NewSubEngSummaryCombinedOnHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeCONHP, completePer: completePerCONHP, dateorder: dateorder, ReqBy: ReqBy, oid: oid }]);
                                    subEngSummaryCombinedOnHealthPlan = [...subEngSummaryCombinedOnHealthPlan, ...NewSubEngSummaryCombinedOnHealthPlan];
                                    let NewSubEngSummaryCombinedOffHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeCOFFHP, completePer: completePerCOFFHP, dateorder: dateorder, ReqBy: ReqBy, oid: oid }]);
                                    subEngSummaryCombinedOffHealthPlan = [...subEngSummaryCombinedOffHealthPlan, ...NewSubEngSummaryCombinedOffHealthPlan];
                                    let NewSubEngSummaryEmpOnHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeONHPU, completePer: completePerONHPU, dateorder: dateorder, ReqBy: ReqBy, oid: oid }]);
                                    subEngSummaryEmpOnHealthPlan = [...subEngSummaryEmpOnHealthPlan, ...NewSubEngSummaryEmpOnHealthPlan];
                                    let NewSubEngSummaryEmpOffHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeOFFHPU, completePer: completePerOFFHPU, dateorder: dateorder, ReqBy: ReqBy, oid: oid }]);
                                    subEngSummaryEmpOffHealthPlan = [...subEngSummaryEmpOffHealthPlan, ...NewSubEngSummaryEmpOffHealthPlan];
                                    let NewSubEngSummarySpouseOnHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeONHPS, completePer: completePerONHPS, dateorder: dateorder, ReqBy: ReqBy, oid: oid }]);
                                    subEngSummarySpouseOnHealthPlan = [...subEngSummarySpouseOnHealthPlan, ...NewSubEngSummarySpouseOnHealthPlan];
                                    let NewSubEngSummarySpouseOffHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeOFFHPS, completePer: completePerOFFHPS, dateorder: dateorder, ReqBy: ReqBy, oid: oid }]);
                                    subEngSummarySpouseOffHealthPlan = [...subEngSummarySpouseOffHealthPlan, ...NewSubEngSummarySpouseOffHealthPlan];
                                }
                            }
                            activityArray = [...activityArray, ...NewActivityArray];
                            let complete = catRaw['complete'];
                            let completePer = 0;
                            let completeS = catRaw['completeS'];
                            let completePerS = 0;
                            let completeU = 0;
                            let completePerU = 0;
                            let completeCONHP = 0;
                            let completePerCONHP = 0;
                            let completeCOFFHP = catRaw['completeCOFFHP'];
                            let completePerCOFFHP = 0;
                            let completeONHPU = 0;
                            let completePerONHPU = 0;
                            let completeOFFHPU = catRaw['completeOFFHPU'];
                            let completePerOFFHPU = 0;
                            let completeONHPS = 0;
                            let completePerONHPS = 0;
                            let completeOFFHPS = catRaw['completeOFFHPS'];
                            let completePerOFFHPS = 0;
                            totalUsereligible = campTotalUser;
                            ctotalUserOnlyeligible = totalUserOnly;
                            if (complete > 0) {
                                completePer = (complete * 100) / totalUsereligible;
                            }
                            if (completeS > 0 && totalSpouse > 0) {
                                completePerS = (completeS * 100) / totalSpouse;
                            }
                            completeU = complete - completeS;
                            if (completeU > 0 && (totalUsereligible - totalSpouse) > 0) {
                                completePerU = (completeU * 100) / (totalUsereligible - totalSpouse);
                            }
                            if (completeCOFFHP > 0 && userNoteligible > 0) {
                                completePerCOFFHP = (completeCOFFHP * 100) / userNoteligible;
                            }
                            completeCONHP = complete - completeCOFFHP;
                            if (completeCONHP > 0 && (totalUsereligible - userNoteligible) > 0) {
                                completePerCONHP = (completeCONHP * 100) / (totalUsereligible - userNoteligible);
                            }
                            if (completeOFFHPU > 0 && useronlyNoteligible > 0) {
                                completePerOFFHPU = (completeOFFHPU * 100) / useronlyNoteligible;
                            }
                            completeONHPU = completeU - completeOFFHPU;
                            if (completeONHPU > 0 && (ctotalUserOnlyeligible - useronlyNoteligible) > 0) {
                                completePerONHPU = (completeONHPU * 100) / (ctotalUserOnlyeligible - useronlyNoteligible);
                            }
                            if (completeOFFHPS > 0 && spouseonlyNoteligible > 0) {
                                completePerOFFHPS = (completeOFFHPS * 100) / spouseonlyNoteligible;
                            }
                            completeONHPS = completeS - completeOFFHPS;
                            if (completeONHPS > 0 && (totalSpouse - spouseonlyNoteligible) > 0) {
                                completePerONHPS = (completeONHPS * 100) / (totalSpouse - spouseonlyNoteligible);
                            }
                            if (catRaw['order_id'] != "" && catRaw['order_id'] != 0) {
                                oid = catRaw['order_id'];
                            } else {
                                oid = "";
                            }
                            if (catRaw['required_by_user'] == "Y" || catRaw['required_by_user'] == "Y") {
                                ReqBy = "Y";
                            } else {
                                ReqBy = "N";
                            }
                            if (catRaw['end_date'] != "" && catRaw['end_date'] != 0) {
                                dateorder = await this.commonDateService.DateTimeFormat(catRaw['end_date'], 'timestamp');
                            } else {
                                dateorder = "";
                            }
                            if (subEngSummaryCombined.length > 0) {
                                let NewEngSummaryCombined = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: complete, completePer: completePer, dateorder: dateorder, ReqBy: ReqBy, oid: oid, activitys: subEngSummaryCombined }]);
                                EngSummaryCombined = [...EngSummaryCombined, ...NewEngSummaryCombined];
                            }
                            if (subEngSummaryEmployee.length > 0) {
                                let NewEngSummaryEmployee = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeU, completePer: completePerU, dateorder: dateorder, ReqBy: ReqBy, oid: oid, activitys: subEngSummaryEmployee }]);
                                EngSummaryEmployee = [...EngSummaryEmployee, ...NewEngSummaryEmployee];
                            }
                            if (subEngSummarySpouse.length > 0) {
                                let NewEngSummarySpouse = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeS, completePer: completePerS, dateorder: dateorder, ReqBy: ReqBy, oid: oid, activitys: subEngSummarySpouse }]);
                                EngSummarySpouse = [...EngSummarySpouse, ...NewEngSummarySpouse];
                            }
                            if (subEngSummaryCombinedOnHealthPlan.length > 0) {
                                let NewEngSummaryCombinedOnHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeCONHP, completePer: completePerCONHP, dateorder: dateorder, ReqBy: ReqBy, oid: oid, activitys: subEngSummaryCombinedOnHealthPlan }]);
                                EngSummaryCombinedOnHealthPlan = [...EngSummaryCombinedOnHealthPlan, ...NewEngSummaryCombinedOnHealthPlan];
                            }
                            if (subEngSummaryCombinedOffHealthPlan.length > 0) {
                                let NewEngSummaryCombinedOffHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeCOFFHP, completePer: completePerCOFFHP, dateorder: dateorder, ReqBy: ReqBy, oid: oid, activitys: subEngSummaryCombinedOffHealthPlan }]);
                                EngSummaryCombinedOffHealthPlan = [...EngSummaryCombinedOffHealthPlan, ...NewEngSummaryCombinedOffHealthPlan];
                            }
                            if (subEngSummaryEmpOnHealthPlan.length > 0) {
                                let NewEngSummaryEmpOnHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeONHPU, completePer: completePerONHPU, dateorder: dateorder, ReqBy: ReqBy, oid: oid, activitys: subEngSummaryEmpOnHealthPlan }]);
                                EngSummaryEmpOnHealthPlan = [...EngSummaryEmpOnHealthPlan, ...NewEngSummaryEmpOnHealthPlan];
                            }
                            if (subEngSummaryEmpOffHealthPlan.length > 0) {
                                let NewEngSummaryEmpOffHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeOFFHPU, completePer: completePerOFFHPU, dateorder: dateorder, ReqBy: ReqBy, oid: oid, activitys: subEngSummaryEmpOffHealthPlan }]);
                                EngSummaryEmpOffHealthPlan = [...EngSummaryEmpOffHealthPlan, ...NewEngSummaryEmpOffHealthPlan];
                            }
                            if (subEngSummarySpouseOnHealthPlan.length > 0) {
                                let NewEngSummarySpouseOnHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeONHPS, completePer: completePerONHPS, dateorder: dateorder, ReqBy: ReqBy, oid: oid, activitys: subEngSummarySpouseOnHealthPlan }]);
                                EngSummarySpouseOnHealthPlan = [...EngSummarySpouseOnHealthPlan, ...NewEngSummarySpouseOnHealthPlan];
                            }
                            if (subEngSummarySpouseOffHealthPlan.length > 0) {
                                let NewEngSummarySpouseOffHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeOFFHPS, completePer: completePerOFFHPS, dateorder: dateorder, ReqBy: ReqBy, oid: oid, activitys: subEngSummarySpouseOffHealthPlan }]);
                                EngSummarySpouseOffHealthPlan = [...EngSummarySpouseOffHealthPlan, ...NewEngSummarySpouseOffHealthPlan];
                            }
                        }
                    }
                }
                /* All Reward Details Section */
                    let rewardAllCombined = [];
                    let rewardAllEmployee = [];
                    let rewardAllSpouse = [];
                    let rewardAllCombinedOnHealthPlan = [];
                    let rewardAllCombinedOffHealthPlan = [];
                    let rewardAllEmployeeOnHealthPlan = [];
                    let rewardAllEmployeeOffHealthPlan = [];
                    let rewardAllSpouseOnHealthPlan = [];
                    let rewardAllSpouseOffHealthPlan = [];
                    let rewardAllLocation = [];
                    let rewardAllDepartment = [];
                    let rewardAllGender = [];
                    let rewardAllAgeGroup = [];
                    let totalEli = [], totalOt = [], totalEliS = [], totalOtS = [];
                    let totalEliCOFFHP = [], totalOtCOFFHP = [], totalEliOFFHPU = [], totalOtOFFHPU = [];
                    let totalEliOFFHPS = [], totalOtOFFHPS = [];
                    let totalOtF = [];
                    let totalOtFS = [];
                    let totalOtFCOFFHP = [];
                    let totalOtFOFFHPU = [];
                    let totalOtFOFFHPS = [];
                    for (let [keysR, valuesR] of Object.entries(tempR)) {
                        let rtotalUserOnlyeligible = 0;
                        let complete = 0, completePer = 0;
                        let completeS = 0, completePerS = 0;
                        let completeU = 0, completePerU = 0;
                        let completeCONHP = 0, completePerCONHP = 0;
                        let completeCOFFHP = 0, completePerCOFFHP = 0;
                        let completeONHPU = 0, completePerONHPU = 0;
                        let completeOFFHPU = 0, completePerOFFHPU = 0;
                        let completeONHPS = 0, completePerONHPS = 0;
                        let completeOFFHPS = 0, completePerOFFHPS = 0;
                        let locationList = JSON.parse(JSON.stringify(locationDatas));
                        let departmentList = JSON.parse(JSON.stringify(departmentDatas));
                        let genderList = JSON.parse(JSON.stringify(campaignConstant.GenderData));
                        let ageGroupList = JSON.parse(JSON.stringify(campaignConstant.AgeGroupData));
                        for (let [keysU, valuesU] of Object.entries(userPointsTotal)) {
                            let userId = Number(keysU);
                            if (valuesU['Role'] == 16) {
                                if ((totalActivityS == 0 || valuesR['consider_require'] == 0) && valuesU['Total'] >= valuesR['pointS']) {
                                    complete += 1;
                                    completeS += 1;
                                    if (!totalEliS.includes(userId)) {
                                        totalEliS.push(userId);
                                    }
                                    if (!totalEli.includes(userId)) {
                                        totalEli.push(userId);
                                    }
                                    if (valuesU['on_insurance_plan'] == 0) {
                                        completeOFFHPS += 1;
                                        completeCOFFHP += 1;
                                        if (!totalEliCOFFHP.includes(userId)) {
                                            totalEliCOFFHP.push(userId);
                                        }
                                        if (!totalEliOFFHPS.includes(userId)) {
                                            totalEliOFFHPS.push(userId);
                                        }
                                    }
                                } else {
                                    if (valuesU['Total'] >= valuesR['pointS'] && (userActivityTotal[userId] && userActivityTotal[userId]['Total'] >= totalActivityS || valuesR['consider_require'] == 0)) {
                                        complete += 1;
                                        completeS += 1;
                                        if (!totalEliS.includes(userId)) {
                                            totalEliS.push(userId);
                                        }
                                        if (!totalEli.includes(userId)) {
                                            totalEli.push(userId);
                                        }
                                        if (valuesU['on_insurance_plan'] == 0) {
                                            completeOFFHPS += 1;
                                            completeCOFFHP += 1;
                                            if (!totalEliOFFHPS.includes(userId)) {
                                                totalEliOFFHPS.push(userId);
                                            }
                                            if (!totalEliCOFFHP.includes(userId)) {
                                                totalEliCOFFHP.push(userId);
                                            }
                                        }
                                    } else {
                                        if (!totalOt.includes(userId)) {
                                            totalOt.push(userId);
                                        }
                                        if (!totalOtS.includes(userId)) {
                                            totalOtS.push(userId);
                                        }
                                        if (valuesU['on_insurance_plan'] == 0) {
                                            if (!totalOtCOFFHP.includes(userId)) {
                                                totalOtCOFFHP.push(userId);
                                            }
                                            if (!totalOtOFFHPS.includes(userId)) {
                                                totalOtOFFHPS.push(userId);
                                            }
                                        }
                                    }
                                }
                            } else {
                                if ((totalActivity == 0 || valuesR['consider_require'] == 0) && valuesU['Total'] >= valuesR['point']) {
                                    complete += 1;
                                    if (valuesU['on_insurance_plan'] == 0) {
                                        completeCOFFHP += 1;
                                        completeOFFHPU += 1;
                                        if (!totalEliCOFFHP.includes(userId)) {
                                            totalEliCOFFHP.push(userId);
                                        }
                                        if (!totalEliOFFHPU.includes(userId)) {
                                            totalEliOFFHPU.push(userId);
                                        }
                                    }
                                    if (!totalEli.includes(userId)) {
                                        totalEli.push(userId);
                                    }
                                } else {
                                    if (valuesU['Total'] >= valuesR['point'] && (userActivityTotal[userId] && userActivityTotal[userId]['Total'] >= totalActivity || valuesR['consider_require'] == 0)) {
                                        complete += 1;
                                        if (valuesU['on_insurance_plan'] == 0) {
                                            completeCOFFHP += 1;
                                            completeOFFHPU += 1;
                                            if (!totalEliCOFFHP.includes(userId)) {
                                                totalEliCOFFHP.push(userId);
                                            }
                                            if (!totalEliOFFHPU.includes(userId)) {
                                                totalEliOFFHPU.push(userId);
                                            }
                                        }
                                        if (!totalEli.includes(userId)) {
                                            totalEli.push(userId);
                                        }
                                    } else {
                                        if (!totalOt.includes(userId)) {
                                            totalOt.push(userId);
                                        }
                                        if (valuesU['on_insurance_plan'] == 0) {
                                            if (!totalOtCOFFHP.includes(userId)) {
                                                totalOtCOFFHP.push(userId);
                                            }
                                            if (!totalOtOFFHPU.includes(userId)) {
                                                totalOtOFFHPU.push(userId);
                                            }
                                        }
                                    }
                                }
                            }

                            if (locationList.hasOwnProperty(valuesU['location'])) {
                                if ((totalActivity == 0 || valuesR['consider_require'] == 0) && valuesU['Total'] >= valuesR['point']) {
                                    locationList[valuesU['location']].complete += 1;
                                } else {
                                    if (valuesU['Total'] >= valuesR['point'] && (userActivityTotal[userId] && userActivityTotal[userId]['Total'] >= totalActivity || valuesR['consider_require'] == 0)) {
                                        locationList[valuesU['location']].complete += 1;
                                    }
                                }
                            }

                            if (departmentList.hasOwnProperty(valuesU['department'])) {
                                if ((totalActivity == 0 || valuesR['consider_require'] == 0) && valuesU['Total'] >= valuesR['point']) {
                                    departmentList[valuesU['department']].complete += 1;
                                } else {
                                    if (valuesU['Total'] >= valuesR['point'] && (userActivityTotal[userId] && userActivityTotal[userId]['Total'] >= totalActivity || valuesR['consider_require'] == 0)) {
                                        departmentList[valuesU['department']].complete += 1;
                                    }
                                }
                            }
                            if (genderList.hasOwnProperty(valuesU['gender'])) {
                                if ((totalActivity == 0 || valuesR['consider_require'] == 0) && valuesU['Total'] >= valuesR['point']) {
                                    genderList[valuesU['gender']].complete += 1;
                                } else {
                                    if (valuesU['Total'] >= valuesR['point'] && (userActivityTotal[userId] && userActivityTotal[userId]['Total'] >= totalActivity || valuesR['consider_require'] == 0)) {
                                        genderList[valuesU['gender']].complete += 1;
                                    }
                                }
                            }

                            for (let key in ageGroupList) {
                                const minAge = ageGroupList[key].min_age;
                                const maxAge = ageGroupList[key].max_age;
                                // console.log(valuesU['age'], minAge, maxAge, typeof key, key);
                                if ((totalActivity == 0 || valuesR['consider_require'] == 0) && valuesU['Total'] >= valuesR['point']) {
                                    if (maxAge !== null && valuesU['age'] >= minAge && valuesU['age'] <= maxAge) {
                                        ageGroupList[key.toString()].complete += 1;
                                    }
                                    if (maxAge === null && valuesU['age'] >= minAge) {
                                        ageGroupList[key.toString()].complete += 1;
                                    }
                                } else {
                                    if (valuesU['Total'] >= valuesR['point'] && (userActivityTotal[userId] && userActivityTotal[userId]['Total'] >= totalActivity || valuesR['consider_require'] == 0)) {
                                        if (maxAge !== null && valuesU['age'] >= minAge && valuesU['age'] <= maxAge) {
                                            ageGroupList[key.toString()].complete += 1;
                                        }
                                        if (maxAge === null && valuesU['age'] >= minAge) {
                                            ageGroupList[key.toString()].complete += 1;
                                        }
                                    }
                                }
                            }
                        }
                        totalUsereligible = campTotalUser;
                        rtotalUserOnlyeligible = totalUserOnly;
                        if (complete > 0) {
                            completePer = (complete * 100) / campTotalUser;
                        }

                        let NewrewardAllCombined = this.commonHealthService.campaignObjectStructure('Reward', [{ actName: valuesR['name'], order_id: valuesR['order_id'], complete: complete, completePer: completePer }]);
                        rewardAllCombined = [...rewardAllCombined, ...NewrewardAllCombined];
                        if (completeS > 0 && totalSpouse > 0) {
                            completePerS = (completeS * 100) / totalSpouse;
                        }
                        let NewrewardAllSpouse = this.commonHealthService.campaignObjectStructure('Reward', [{ actName: valuesR['name'], order_id: valuesR['order_id'], complete: completeS, completePer: completePerS }]);
                        rewardAllSpouse = [...rewardAllSpouse, ...NewrewardAllSpouse];
                        completeU = complete - completeS;
                        if (completeU > 0 && (campTotalUser - totalSpouse) > 0) {
                            completePerU = (completeU * 100) / (campTotalUser - totalSpouse);
                        }
                        let NewrewardAllEmployee = this.commonHealthService.campaignObjectStructure('Reward', [{ actName: valuesR['name'], order_id: valuesR['order_id'], complete: completeU, completePer: completePerU }]);
                        rewardAllEmployee = [...rewardAllEmployee, ...NewrewardAllEmployee];
                        if (completeCOFFHP > 0 && userNoteligible > 0) {
                            completePerCOFFHP = (completeCOFFHP * 100) / userNoteligible;
                        }
                        let NewrewardAllCombinedOffHealthPlan = this.commonHealthService.campaignObjectStructure('Reward', [{ actName: valuesR['name'], complete: completeCOFFHP, completePer: completePerCOFFHP }]);
                        rewardAllCombinedOffHealthPlan = [...rewardAllCombinedOffHealthPlan, ...NewrewardAllCombinedOffHealthPlan];
                        completeCONHP = complete - completeCOFFHP;
                        if (completeCONHP > 0 && (totalUsereligible - userNoteligible) > 0) {
                            completePerCONHP = (completeCONHP * 100) / (totalUsereligible - userNoteligible);
                        }
                        let NewrewardAllCombinedOnHealthPlan = this.commonHealthService.campaignObjectStructure('Reward', [{ actName: valuesR['name'], complete: completeCONHP, completePer: completePerCONHP }]);
                        rewardAllCombinedOnHealthPlan = [...rewardAllCombinedOnHealthPlan, ...NewrewardAllCombinedOnHealthPlan];
                        if (completeOFFHPU > 0 && useronlyNoteligible > 0) {
                            completePerOFFHPU = (completeOFFHPU * 100) / useronlyNoteligible;
                        }
                        let NewrewardAllEmployeeOffHealthPlan = this.commonHealthService.campaignObjectStructure('Reward', [{ actName: valuesR['name'], complete: completeOFFHPU, completePer: completePerOFFHPU }]);
                        rewardAllEmployeeOffHealthPlan = [...rewardAllEmployeeOffHealthPlan, ...NewrewardAllEmployeeOffHealthPlan];
                        completeONHPU = completeU - completeOFFHPU;
                        if (completeONHPU > 0 && (rtotalUserOnlyeligible - useronlyNoteligible) > 0) {
                            completePerONHPU = (completeONHPU * 100) / (rtotalUserOnlyeligible - useronlyNoteligible);
                        }
                        let NewrewardAllEmployeeOnHealthPlan = this.commonHealthService.campaignObjectStructure('Reward', [{ actName: valuesR['name'], complete: completeONHPU, completePer: completePerONHPU }]);
                        rewardAllEmployeeOnHealthPlan = [...rewardAllEmployeeOnHealthPlan, ...NewrewardAllEmployeeOnHealthPlan];
                        if (completeOFFHPS > 0 && spouseonlyNoteligible > 0) {
                            completePerOFFHPS = (completeOFFHPS * 100) / spouseonlyNoteligible;
                        }
                        let NewrewardAllSpouseOffHealthPlan = this.commonHealthService.campaignObjectStructure('Reward', [{ actName: valuesR['name'], complete: completeOFFHPS, completePer: completePerOFFHPS }]);
                        rewardAllSpouseOffHealthPlan = [...rewardAllSpouseOffHealthPlan, ...NewrewardAllSpouseOffHealthPlan];
                        completeONHPS = completeS - completeOFFHPS;
                        if (completeONHPS > 0 && (totalSpouse - spouseonlyNoteligible) > 0) {
                            completePerONHPS = (completeONHPS * 100) / (totalSpouse - spouseonlyNoteligible);
                        }
                        let NewrewardAllSpouseOnHealthPlan = this.commonHealthService.campaignObjectStructure('Reward', [{ actName: valuesR['name'], complete: completeONHPS, completePer: completePerONHPS }]);
                        rewardAllSpouseOnHealthPlan = [...rewardAllSpouseOnHealthPlan, ...NewrewardAllSpouseOnHealthPlan];
                        if (totalOtF.length == 0) {
                            totalOtF = JSON.parse(JSON.stringify(totalOt));
                            totalOtFS = JSON.parse(JSON.stringify(totalOtS));
                            totalOtFCOFFHP = JSON.parse(JSON.stringify(totalOtCOFFHP));
                            totalOtFOFFHPU = JSON.parse(JSON.stringify(totalOtOFFHPU));
                            totalOtFOFFHPS = JSON.parse(JSON.stringify(totalOtOFFHPS));
                        }

                        for (let [key, location] of Object.entries(locationList)) {
                            let lComplete = location['complete'];
                            let lTotalUser = location['userCount'];
                            let lCompletePer = 0;
                            if (lComplete > 0) {
                                lCompletePer = (lComplete * 100) / lTotalUser;
                            }
                            location['completePer'] = Number(lCompletePer.toFixed(2));
                        }
                        let NewlocationList = this.commonHealthService.campaignObjectStructure('location', [{ actId: valuesR['id'], actName: valuesR['name'], location: locationList }]);
                        rewardAllLocation = [...rewardAllLocation, ...NewlocationList];

                        for (let [key, department] of Object.entries(departmentList)) {
                            let lComplete = department['complete'];
                            let lTotalUser = department['userCount'];
                            let lCompletePer = 0;
                            if (lComplete > 0) {
                                lCompletePer = (lComplete * 100) / lTotalUser;
                            }
                            department['completePer'] = Number(lCompletePer.toFixed(2));
                        }
                        let NewdepartmentList = this.commonHealthService.campaignObjectStructure('department', [{ actId: valuesR['id'], actName: valuesR['name'], department: departmentList }]);
                        rewardAllDepartment = [...rewardAllDepartment, ...NewdepartmentList];

                        for (let [key, gender] of Object.entries(genderList)) {
                            let lComplete = gender['complete'];
                            let lTotalUser = (key == 'm') ? maleTotalUsers : (key == 'f') ? femaleTotalUsers : otherTotalUsers;
                            let lCompletePer = 0;
                            if (lComplete > 0) {
                                lCompletePer = (lComplete * 100) / lTotalUser;
                            }
                            gender['completePer'] = Number(lCompletePer.toFixed(2));
                        }
                        let NewGenderList = this.commonHealthService.campaignObjectStructure('gender', [{ actId: valuesR['id'], actName: valuesR['name'], gender: genderList }]);
                        rewardAllGender = [...rewardAllGender, ...NewGenderList];
                        for (let [key, ageGroup] of Object.entries(ageGroupList)) {
                            let lComplete = ageGroup['complete'];
                            let lTotalUser = 0;
                            if(key == '1'){
                                lTotalUser = age18to25TotalUsers;
                            }else if(key == '2'){
                                lTotalUser = age26to35TotalUsers;
                            }else if(key == '3'){
                                lTotalUser = age36to45TotalUsers;
                            }else if(key == '4'){
                                lTotalUser = age46to55TotalUsers;
                            }else if(key == '5'){
                                lTotalUser = age56to65TotalUsers;
                            }else if(key == '6'){
                                lTotalUser = age66PlusTotalUsers;
                            }else if(key == '7'){
                                lTotalUser = age45PlusTotalUsers;
                            }
                            let lCompletePer = 0;
                            if (lComplete > 0) {
                                lCompletePer = (lComplete * 100) / lTotalUser;
                            }
                            ageGroup['completePer'] = Number(lCompletePer.toFixed(2));
                            ageGroup['noOfUser'] = lTotalUser;
                        }
                        let NewAgeGroupList = this.commonHealthService.campaignObjectStructure('agegroup', [{ actId: valuesR['id'], actName: valuesR['name'], agegroup: ageGroupList }]);
                        rewardAllAgeGroup = [...rewardAllAgeGroup, ...NewAgeGroupList];
                    }

                    let combinedGraphArray = [];
                    let employeeGraphArray = [];
                    let spouseGraphArray = [];
                    let employeeOnHealthPlanGraphArray = [];
                    let employeeOffHealthPlanGraphArray = [];
                    let spouseOnHealthPlanGraphArray = [];
                    let spouseOffHealthPlanGraphArray = [];
                    let combinedOnHealthPlanGraphArray = [];
                    let combinedOffHealthPlanGraphArray = [];
                    if(onType != 'loadmore'){
                        totalOt = totalOtF;
                        totalOtS = totalOtFS;
                        totalOtCOFFHP = totalOtFCOFFHP;
                        totalOtOFFHPU = totalOtFOFFHPU;
                        totalOtOFFHPS = totalOtFOFFHPS;
                        let complete = totalEli.length;
                        let completePer = 0;
                        let ontrackcomplete = totalOt.length;
                        let ontrackcompletePer = 0;
                        let completeS = totalEliS.length;
                        let completePerS = 0;
                        let ontrackcompleteS = totalOtS.length;
                        let ontrackcompletePerS = 0;
                        let completeU = complete - completeS;
                        let completePerU = 0;
                        let ontrackcompleteU = ontrackcomplete - ontrackcompleteS;
                        let ontrackcompletePerU = 0;
                        let completeCOFFHP = totalEliCOFFHP.length;
                        let completePerCOFFHP = 0;
                        let ontrackcompleteCOFFHP = totalOtCOFFHP.length;
                        let ontrackcompletePerCOFFHP = 0;
                        let completeCONHP = complete - completeCOFFHP;
                        let completePerCONHP = 0;
                        let ontrackcompleteCONHP = ontrackcomplete - ontrackcompleteCOFFHP;
                        let ontrackcompletePerCONHP = 0;
                        let completeOFFHPU = totalEliOFFHPU.length;
                        let completePerOFFHPU = 0;
                        let ontrackcompleteOFFHPU = totalOtOFFHPU.length;
                        let ontrackcompletePerOFFHPU = 0;
                        let completeONHPU = completeU - completeOFFHPU;
                        let completePerONHPU = 0;
                        let ontrackcompleteONHPU = ontrackcompleteU - ontrackcompleteOFFHPU;
                        let ontrackcompletePerONHPU = 0;
                        let completeOFFHPS = totalEliOFFHPS.length;
                        let completePerOFFHPS = 0;
                        let ontrackcompleteOFFHPS = totalOtOFFHPS.length;
                        let ontrackcompletePerOFFHPS = 0;
                        let completeONHPS = completeS - completeOFFHPS;
                        let completePerONHPS = 0;
                        let ontrackcompleteONHPS = ontrackcompleteS - ontrackcompleteOFFHPS;
                        let ontrackcompletePerONHPS = 0;
                        if (complete > 0) {
                            completePer = (complete * 100) / campTotalUser;
                        }
                        if (ontrackcomplete > 0) {
                            ontrackcompletePer = (ontrackcomplete * 100) / campTotalUser;
                        }
                        if (completeS > 0 && totalSpouse > 0) {
                            completePerS = (completeS * 100) / totalSpouse;
                        }
                        if (ontrackcompleteS > 0 && totalSpouse > 0) {
                            ontrackcompletePerS = (ontrackcompleteS * 100) / totalSpouse;
                        }
                        if (completeU > 0 && (campTotalUser - totalSpouse) > 0) {
                            completePerU = (completeU * 100) / (campTotalUser - totalSpouse);
                        }
                        if (ontrackcompleteU > 0 && (campTotalUser - totalSpouse) > 0) {
                            ontrackcompletePerU = (ontrackcompleteU * 100) / (campTotalUser - totalSpouse);
                        }
                        if (completeCOFFHP > 0 && userNoteligible > 0) {
                            completePerCOFFHP = (completeCOFFHP * 100) / userNoteligible;
                        }
                        if (ontrackcompleteCOFFHP > 0 && userNoteligible > 0) {
                            ontrackcompletePerCOFFHP = (ontrackcompleteCOFFHP * 100) / userNoteligible;
                        }
                        if (completeCONHP > 0 && (campTotalUser - userNoteligible) > 0) {
                            completePerCONHP = (completeCONHP * 100) / (campTotalUser - userNoteligible);
                        }
                        if (ontrackcompleteCONHP > 0 && (campTotalUser - userNoteligible) > 0) {
                            ontrackcompletePerCONHP = (ontrackcompleteCONHP * 100) / (campTotalUser - userNoteligible);
                        }
                        if (completeOFFHPU > 0 && useronlyNoteligible > 0) {
                            completePerOFFHPU = (completeOFFHPU * 100) / useronlyNoteligible;
                        }
                        if (ontrackcompleteOFFHPU > 0 && useronlyNoteligible > 0) {
                            ontrackcompletePerOFFHPU = (ontrackcompleteOFFHPU * 100) / useronlyNoteligible;
                        }
                        if (completeONHPU > 0 && (totalUserOnly - useronlyNoteligible) > 0) {
                            completePerONHPU = (completeONHPU * 100) / (totalUserOnly - useronlyNoteligible);
                        }
                        if (ontrackcompleteONHPU > 0 && (totalUserOnly - useronlyNoteligible) > 0) {
                            ontrackcompletePerONHPU = (ontrackcompleteONHPU * 100) / (totalUserOnly - useronlyNoteligible);
                        }
                        if (completeOFFHPS > 0 && spouseonlyNoteligible > 0) {
                            completePerOFFHPS = (completeOFFHPS * 100) / spouseonlyNoteligible;
                        }
                        if (ontrackcompleteOFFHPS > 0 && spouseonlyNoteligible > 0) {
                            ontrackcompletePerOFFHPS = (ontrackcompleteOFFHPS * 100) / spouseonlyNoteligible;
                        }
                        if (completeONHPS > 0 && (totalSpouse - spouseonlyNoteligible) > 0) {
                            completePerONHPS = (completeONHPS * 100) / (totalSpouse - spouseonlyNoteligible);
                        }
                        if (ontrackcompleteONHPS > 0 && (totalSpouse - spouseonlyNoteligible) > 0) {
                            ontrackcompletePerONHPS = (ontrackcompleteONHPS * 100) / (totalSpouse - spouseonlyNoteligible);
                        }

                        /*  ALL Tab in Graph Section  */
                            if (orgTabSetting.includes('1')) {
                                combinedGraphArray = this.commonHealthService.campaignGraphStructure(
                                    LOGGED_INTO_THE_SITE_AT_LEAST_ONCE, 0,
                                    COMPLETED_ALL_THE_REQUIREMENTS, completePer,
                                    ON_TRACK_AND_PARTICIPATING, ontrackcompletePer,
                                    CAMPAIGN_DEADLINE_COUNTDOWN, campaignEndDate);
                            }
                            if (orgTabSetting.includes('2')) {
                                employeeGraphArray = this.commonHealthService.campaignGraphStructure(
                                    LOGGED_INTO_THE_SITE_AT_LEAST_ONCE, 0,
                                    COMPLETED_ALL_THE_REQUIREMENTS, completePerU,
                                    ON_TRACK_AND_PARTICIPATING, ontrackcompletePerU,
                                    CAMPAIGN_DEADLINE_COUNTDOWN, campaignEndDate);
                            }
                            if (orgTabSetting.includes('3')) {
                                spouseGraphArray = this.commonHealthService.campaignGraphStructure(
                                    LOGGED_INTO_THE_SITE_AT_LEAST_ONCE, 0,
                                    COMPLETED_ALL_THE_REQUIREMENTS, completePerS,
                                    ON_TRACK_AND_PARTICIPATING, ontrackcompletePerS,
                                    CAMPAIGN_DEADLINE_COUNTDOWN, campaignEndDate);
                            }
                            if (orgTabSetting.includes('4')) {
                                employeeOnHealthPlanGraphArray = this.commonHealthService.campaignGraphStructure(
                                    LOGGED_INTO_THE_SITE_AT_LEAST_ONCE, 0,
                                    COMPLETED_ALL_THE_REQUIREMENTS, completePerONHPU,
                                    ON_TRACK_AND_PARTICIPATING, ontrackcompletePerONHPU,
                                    CAMPAIGN_DEADLINE_COUNTDOWN, campaignEndDate);
                            }
                            if (orgTabSetting.includes('5')) {
                                employeeOffHealthPlanGraphArray = this.commonHealthService.campaignGraphStructure(
                                    LOGGED_INTO_THE_SITE_AT_LEAST_ONCE, 0,
                                    COMPLETED_ALL_THE_REQUIREMENTS, completePerOFFHPU,
                                    ON_TRACK_AND_PARTICIPATING, ontrackcompletePerOFFHPU,
                                    CAMPAIGN_DEADLINE_COUNTDOWN, campaignEndDate);
                            }
                            if (orgTabSetting.includes('6')) {
                                spouseOnHealthPlanGraphArray = this.commonHealthService.campaignGraphStructure(
                                    LOGGED_INTO_THE_SITE_AT_LEAST_ONCE, 0,
                                    COMPLETED_ALL_THE_REQUIREMENTS, completePerONHPS,
                                    ON_TRACK_AND_PARTICIPATING, ontrackcompletePerONHPS,
                                    CAMPAIGN_DEADLINE_COUNTDOWN, campaignEndDate);
                            }
                            if (orgTabSetting.includes('7')) {
                                spouseOffHealthPlanGraphArray = this.commonHealthService.campaignGraphStructure(
                                    LOGGED_INTO_THE_SITE_AT_LEAST_ONCE, 0,
                                    COMPLETED_ALL_THE_REQUIREMENTS, completePerOFFHPS,
                                    ON_TRACK_AND_PARTICIPATING, ontrackcompletePerOFFHPS,
                                    CAMPAIGN_DEADLINE_COUNTDOWN, campaignEndDate);
                            }
                            if (orgTabSetting.includes('8')) {
                                combinedOnHealthPlanGraphArray = this.commonHealthService.campaignGraphStructure(
                                    LOGGED_INTO_THE_SITE_AT_LEAST_ONCE, 0,
                                    COMPLETED_ALL_THE_REQUIREMENTS, completePerCONHP,
                                    ON_TRACK_AND_PARTICIPATING, ontrackcompletePerCONHP,
                                    CAMPAIGN_DEADLINE_COUNTDOWN, campaignEndDate);
                            }
                            if (orgTabSetting.includes('9')) {
                                combinedOffHealthPlanGraphArray = this.commonHealthService.campaignGraphStructure(
                                    LOGGED_INTO_THE_SITE_AT_LEAST_ONCE, 0,
                                    COMPLETED_ALL_THE_REQUIREMENTS, completePerCOFFHP,
                                    ON_TRACK_AND_PARTICIPATING, ontrackcompletePerCOFFHP,
                                    CAMPAIGN_DEADLINE_COUNTDOWN, campaignEndDate);
                            }
                        /*  ALL Tab in Graph Section */
                    }
                /*  All Reward Details Section */
                
                
                if(onType != 'loadmore'){
                    if (!regularData['rewards'][`${rewardId}`]['tabData']) {
                        regularData['rewards'][`${rewardId}`]['tabData'] = {};
                    }
                    for (let tabRaw of orgTabSetting) {
                        if (orgSettingOptionsKeys.includes(tabRaw)) {
                            if (!regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]) {
                                regularData['rewards'][`${rewardId}`]['tabData'][tabRaw] = {};
                            }
                            regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['tabName'] = orgSettingOptions[0][`${tabRaw}`];
                            if (tabRaw == 1) {
                                EngSummaryCombined = await this.sortingService.sortCampaignData('asc', EngSummaryCombined, 'order_id');
                                regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['activityDetails'] = EngSummaryCombined;
                                if (rwd['isDefaultReward'] != 1) {
                                    regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['allRewardDetails'] = rewardAllCombined;
                                    regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['graphData'] = combinedGraphArray;
                                }
                                else{
                                    regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['userList'] = rwd['userList'];
                                }
                            } else if (tabRaw == 2) {
                                EngSummaryEmployee = await this.sortingService.sortCampaignData('asc', EngSummaryEmployee, 'order_id');
                                regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['activityDetails'] = EngSummaryEmployee;
                                if (rwd['isDefaultReward'] != 1) {
                                    regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['allRewardDetails'] = rewardAllEmployee;
                                    regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['graphData'] = employeeGraphArray;
                                }
                                else{
                                    regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['userList'] = rwd['userList'];
                                }
                            } else if (tabRaw == 3) {
                                EngSummarySpouse = await this.sortingService.sortCampaignData('asc', EngSummarySpouse, 'order_id');
                                regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['activityDetails'] = EngSummarySpouse;
                                if (rwd['isDefaultReward'] != 1) {
                                    regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['allRewardDetails'] = rewardAllSpouse;
                                    regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['graphData'] = spouseGraphArray;
                                }
                            } else if (tabRaw == 4) {
                                EngSummaryEmpOnHealthPlan = await this.sortingService.sortCampaignData('asc', EngSummaryEmpOnHealthPlan, 'order_id');
                                regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['activityDetails'] = EngSummaryEmpOnHealthPlan;
                                if (rwd['isDefaultReward'] != 1) {
                                    regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['allRewardDetails'] = rewardAllEmployeeOnHealthPlan;
                                    regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['graphData'] = employeeOnHealthPlanGraphArray;
                                }
                            } else if (tabRaw == 5) {
                                EngSummaryEmpOffHealthPlan = await this.sortingService.sortCampaignData('asc', EngSummaryEmpOffHealthPlan, 'order_id');
                                regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['activityDetails'] = EngSummaryEmpOffHealthPlan;
                                if (rwd['isDefaultReward'] != 1) {
                                    regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['allRewardDetails'] = rewardAllEmployeeOffHealthPlan;
                                    regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['graphData'] = employeeOffHealthPlanGraphArray;
                                }
                            } else if (tabRaw == 6) {
                                EngSummarySpouseOnHealthPlan = await this.sortingService.sortCampaignData('asc', EngSummarySpouseOnHealthPlan, 'order_id');
                                regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['activityDetails'] = EngSummarySpouseOnHealthPlan;
                                if (rwd['isDefaultReward'] != 1) {
                                    regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['allRewardDetails'] = rewardAllSpouseOnHealthPlan;
                                    regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['graphData'] = spouseOnHealthPlanGraphArray;
                                }
                            } else if (tabRaw == 7) {
                                EngSummarySpouseOffHealthPlan = await this.sortingService.sortCampaignData('asc', EngSummarySpouseOffHealthPlan, 'order_id');
                                regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['activityDetails'] = EngSummarySpouseOffHealthPlan;
                                if (rwd['isDefaultReward'] != 1) {
                                    regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['allRewardDetails'] = rewardAllSpouseOffHealthPlan;
                                    regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['graphData'] = spouseOffHealthPlanGraphArray;
                                }
                            } else if (tabRaw == 8) {
                                EngSummaryCombinedOnHealthPlan = await this.sortingService.sortCampaignData('asc', EngSummaryCombinedOnHealthPlan, 'order_id');
                                regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['activityDetails'] = EngSummaryCombinedOnHealthPlan;
                                if (rwd['isDefaultReward'] != 1) {
                                    regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['allRewardDetails'] = rewardAllCombinedOnHealthPlan;
                                    regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['graphData'] = combinedOnHealthPlanGraphArray;
                                }
                            } else if (tabRaw == 9) {
                                EngSummaryCombinedOffHealthPlan = await this.sortingService.sortCampaignData('asc', EngSummaryCombinedOffHealthPlan, 'order_id');
                                regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['activityDetails'] = EngSummaryCombinedOffHealthPlan;
                                if (rwd['isDefaultReward'] != 1) {
                                    regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['allRewardDetails'] = rewardAllCombinedOffHealthPlan;
                                    regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['graphData'] = combinedOffHealthPlanGraphArray;
                                }
                            } else if (tabRaw == 10) {
                                regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['rewardData'] = rewardAllLocation;
                                regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['paginationData'] = paginationLocDatas;
                            } else if (tabRaw == 11) {
                                regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['rewardData'] = rewardAllDepartment;
                                regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['paginationData'] = paginationDeptDatas;
                            } else if (tabRaw == 12) {
                                regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['rewardData'] = rewardAllGender;
                            } else if (tabRaw == 13) {
                                regularData['rewards'][`${rewardId}`]['tabData'][tabRaw]['rewardData'] = rewardAllAgeGroup;
                            }
                        }
                    }
                }else{
                    if (tabType == 10) {
                        regularData['data'] = rewardAllLocation;
                        regularData['paginationData'] = paginationLocDatas;
                    } else if (tabType == 11) {
                        regularData['data'] = rewardAllDepartment;
                        regularData['paginationData'] = paginationDeptDatas;
                    }
                }
            }

            if(onType != 'loadmore'){
                /* Common Activity Calculation Section */
                    let completeAllPer = 0;
                    if (completeCAll > 0) {
                        completeAllPer = (completeCAll * 100) / campTotalUser;
                    }
                    let completePerUser = 0;
                    if (completeCUser > 0 && (campTotalUser - totalSpouse) > 0) {
                        completePerUser = (completeCUser * 100) / (campTotalUser - totalSpouse);
                    }
                    let completePerSpouse = 0;
                    if (completeCSpouse > 0 && totalSpouse > 0) {
                        completePerSpouse = (completeCSpouse * 100) / totalSpouse;
                    }
                    let completePerCCOFFHP = 0;
                    if (completeCCOFFHP > 0 && userNoteligible > 0) {
                        completePerCCOFFHP = (completeCCOFFHP * 100) / userNoteligible;
                    }
                    let completePerCCONHP = 0;
                    let completeCCONHP = completeCAll - completeCCOFFHP;
                    if (completeCCONHP > 0 && (campTotalUser - userNoteligible) > 0) {
                        completePerCCONHP = (completeCCONHP * 100) / (campTotalUser - userNoteligible);
                    }
                    let completePerCOFFHPU = 0;
                    if (completeCOFFHPU > 0 && useronlyNoteligible > 0) {
                        completePerCOFFHPU = (completeCOFFHPU * 100) / useronlyNoteligible;
                    }
                    let completePerCONHPU = 0;
                    let completeCONHPU = completeCAll - completeCOFFHPU;
                    if (completeCONHPU > 0 && (totalUserOnly - useronlyNoteligible) > 0) {
                        completePerCONHPU = (completeCONHPU * 100) / (totalUserOnly - useronlyNoteligible);
                    }
                    let completePerCOFFHPS = 0;
                    if (completeCOFFHPS > 0 && spouseonlyNoteligible > 0) {
                        completePerCOFFHPS = (completeCOFFHPS * 100) / spouseonlyNoteligible;
                    }
                    let completePerCONHPS = 0;
                    let completeCONHPS = completeCSpouse - completeCOFFHPS;
                    if (completeCONHPS > 0 && (totalSpouse - spouseonlyNoteligible) > 0) {
                        completePerCONHPS = (completeCONHPS * 100) / (totalSpouse - spouseonlyNoteligible);
                    }
                    let defaultActivitys = regularData['rewards'][0];
                    for (let [key, value] of Object.entries(defaultActivitys['tabData'])) {
                        let completeCLOnce = 0;
                        let completeCLOncePer = 0;
                        const completeMap = {
                            '1': [completeCAll, completeAllPer],
                            '2': [completeCUser, completePerUser],
                            '3': [completeCSpouse, completePerSpouse],
                            '4': [completeCONHPU, completePerCONHPU],
                            '5': [completeCOFFHPU, completePerCOFFHPU],
                            '6': [completeCONHPS, completePerCONHPS],
                            '7': [completeCOFFHPS, completePerCOFFHPS],
                            '8': [completeCCONHP, completePerCCONHP],
                            '9': [completeCCOFFHP, completePerCCOFFHP]
                        };
                        if (completeMap[key]) {
                            const [value, percentage] = completeMap[key];
                            completeCLOnce = value;
                            completeCLOncePer = Number(percentage.toFixed(2));
                        }
                        let loginintothesiteatonce = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: 'Completed at least One Activity', complete: completeCLOnce, completePer: completeCLOncePer, dateorder: 1798675200, ReqBy: 'N', oid: 3 }])[0];
                        if (defaultActivitys?.['tabData']?.[key]?.['activityDetails']) {
                            defaultActivitys['tabData'][key]['activityDetails'].push(loginintothesiteatonce);
                        }
                    }

                    regularData['defaultActivitys'] = defaultActivitys;
                /* Common Activity Calculation Section */
            }
            delete (regularData['rewards'][0]);
            return regularData;
        } 
        catch(error){
         throw new Error(error.message); 
        }
    }

    async getpaginateDatas(postData: any = {}, commonDatas: any = []) {
        try{
            let {
                company_id = null,
                locationIds = '',
                departmentIds = ''
            } = Object.assign({}, ...commonDatas);

            let locationPaginationData = { page: postData.page || 1, limit: postData.limit || 10, order_by: 'location.id', order: 'ASC', fields: ['location.id', 'location.company_id', 'location.location_name', 'location.lname'] };
            let locationWhere = `location.deleted = 0 AND location.company_id = '${company_id}'`;
            if (locationIds != 0 && locationIds != '' && locationIds != null) {
                locationWhere += ` AND location.id IN (${locationIds})`;
            }
            let locationData = await this.locationService.campaignPaginate(
                locationWhere,
                locationPaginationData,
            );
            let paginationLocDatas = {
                total: locationData['total'],
                pages: locationData['pages'],
                limit: locationData['limit'],
                page: locationData['page'],
            };
            let locationDatas = locationData['list'].reduce((acc, item) => {
                item['complete'] = 0;
                item['completePer'] = 0;
                item['EngDifference'] = '- - -';
                item['EngDifferencePer'] = '- - -';
                acc[item.id] = item;
                return acc;
            }, {} as Record<number, typeof locationData['list'][number]>);

            let departmentPaginationData = { page: postData.page || 1, limit: postData.limit || 10, order_by: 'department.id', order: 'ASC', fields: ['department.id', 'department.company_id', 'department.dept_name'] };
            let departmentWhere = `department.deleted = 0 AND department.company_id = '${company_id}'`;
            if (departmentIds != 0 && departmentIds != '' && departmentIds != null) {
                departmentWhere += ` AND department.id IN (${departmentIds})`;
            }
            let departmentData = await this.departmentService.campaignPaginate(
                departmentWhere,
                departmentPaginationData,
            );
            let paginationDeptDatas = {
                total: departmentData['total'],
                pages: departmentData['pages'],
                limit: departmentData['limit'],
                page: departmentData['page'],
            };
            let departmentDatas = departmentData['list'].reduce((acc, item) => {
                item['complete'] = 0;
                item['completePer'] = 0;
                item['EngDifference'] = '- - -';
                item['EngDifferencePer'] = '- - -';
                acc[item.id] = item;
                return acc;
            }, {} as Record<number, typeof departmentData['list'][number]>);
            return { locationDatas, departmentDatas, paginationLocDatas, paginationDeptDatas };
        } 
        catch(error){
         throw new Error(error.message); 
        }
    }

    async getMultiRewarddatas(call_from:any = '', rewards:any = [], otherDatas:any = []) {
        try{
            let {
                activePlugins = [],
                company_id = '',
                dateRange = 0,
                membershipCode = '',
                otherCondition = '',
                statusCondition = '',
                filterStartDate = '',
                filterEndDate = '',
                campaignId = '',
                wellnesschampion = '',
                slider = {},
                allUsersDOHInfoData = {},
                campaigns
            } = Object.assign({}, ...otherDatas);
            let myHireData = {};
            let activityList = [];
            for (let element of rewards) {
                const rewardId = element['id'];
                const isDefaultReward = element?.['isDefaultReward'] || 0;
                const hireDateCount = element?.['hire_date_count'] || 0;
                myHireData = {
                    'hireDateSetting' : element['hire_date'],
                    'hireDateCount' : hireDateCount,
                    'allUsersDOHInfoData' : allUsersDOHInfoData
                };
                let category:any = [];
                element['CampaignId'] = element?.campaign_id ?? campaignId;
                if (element['related_category'] != "") {
                    category = await this.campaignDashboardService.rewardItemGetDetails('related_category', element);
                }
                let hireDate:any = '';
                if (element['hire_date'] == 1) {
                    let totaldays = 0;
                    hireDate = await this.campaignDashboardService.getMaxHireDate(membershipCode);
                }
                let uType_condition = ` AND user.role_id IN (2,16)`;
                if(campaigns.length){
                    element['year'] = campaigns.find(camp => camp.id == element['campaign_id'])?.year || null;
                }
                if(isDefaultReward == 1){
                    let activity = element?.['activitys'] || [];
                    let actOtherData = [ {  'dateCalType' : 'activity' }, { 'membershipCode' : membershipCode }, { 'category' : category }, { 'otherCondition' : otherCondition }, { 'company_id' : company_id }, { 'campaignId' : campaignId }, { 'rewardId' : rewardId }, { 'hireDate' : hireDate },{ 'myHireData' : myHireData }, { 'activePlugins' : activePlugins }, { 'uType_condition' : uType_condition }, { 'statusCondition' : statusCondition }, { 'wellnesschampion' : wellnesschampion }, { 'dateRange' : dateRange }, { 'filterStartDate' : filterStartDate }, { 'filterEndDate' : filterEndDate }, {year: element['year']}];
                    const returnArray = await this.frontPointsForService.points_for_activities_report(call_from, activity, actOtherData); 
                    activity = JSON.parse(JSON.stringify(returnArray['activity']));
                    element['Campaignactivity'] = JSON.parse(JSON.stringify(activity));
                }else{
                    if (element['related_activity'] != "") {
                        let activity = await this.campaignDashboardService.rewardItemGetDetails('related_activity', element);
                        for(let ele of activity){
                            if(ele?.['activity_id'] && !ele?.['activity']){
                                let activityDetails = await this.activityService.activityFindOne({id: ele['activity_id']});
                                if(activityDetails){
                                    ele['activity'] = activityDetails;
                                }
                            }
                        }
                        let actOtherData = [ {  'dateCalType' : 'activity' }, { 'membershipCode' : membershipCode }, { 'category' : category }, { 'otherCondition' : otherCondition }, { 'company_id' : company_id }, { 'campaignId' : campaignId }, { 'rewardId' : rewardId }, { 'hireDate' : hireDate },{ 'myHireData' : myHireData }, { 'activePlugins' : activePlugins }, { 'uType_condition' : uType_condition }, { 'statusCondition' : statusCondition }, { 'wellnesschampion' : wellnesschampion }, { 'dateRange' : dateRange }, { 'filterStartDate' : filterStartDate }, { 'filterEndDate' : filterEndDate }, {year: element['year']}];
                        const returnArray = await this.frontPointsForService.points_for_activities_report(call_from, activity.filter(item => !activityList.includes(item?.['activity_id'])), actOtherData); 
                        activity = JSON.parse(JSON.stringify(returnArray['activity']));
                        activityList = [...activityList, ...activity.map(act => act.activity_id)];
                        category = JSON.parse(JSON.stringify(returnArray['category']));
                        element['Campaignactivity'] = JSON.parse(JSON.stringify(activity));
                        element['RequiredCampaignactivityUser'] = returnArray['requiredCampActivityUser'] || 0;
                        element['RequiredCampaignactivitySpouse'] = returnArray['requiredCampActivitySpouse'] || 0;
                        element['activityList'] = activityList;
                    }
                }
                if(isDefaultReward != 1){
                    if (element['related_challenge'] != "") {
                        let challenges = await this.campaignDashboardService.rewardItemGetDetails('related_challenge', element);
                        if(!element['Campaignchallenges']){
                            element['Campaignchallenges'] = [];
                        }
                        if(!element['CampaignSpousechallenges']){
                            element['CampaignSpousechallenges'] = [];
                        }
                        let Spousechallenges = [];    
                        element['Campaignchallenges'] = JSON.parse(JSON.stringify(challenges));
                        element['CampaignSpousechallenges'] = Spousechallenges;
                    }
                    if(category){
                        let catOtherData = [ { 'dateCalType' : 'category' }, { 'membershipCode' : membershipCode }, { 'otherCondition' : otherCondition }, { 'statusCondition' : statusCondition }, { 'company_id' : company_id }, { 'campaignId' : campaignId }, { 'rewardId' : rewardId }, { 'hireDate' : hireDate }, { 'myHireData' : myHireData },{ 'activePlugins' : activePlugins }, { 'uType_condition' : uType_condition }, { 'challenges' : element['Campaignchallenges'] }];
                        const returnArrayC = await this.frontPointsForService.point_for_category_report(call_from, category, catOtherData);
                        category = JSON.parse(JSON.stringify(returnArrayC['categorys']));
                        element['Campaigncategory'] = JSON.parse(JSON.stringify(category));
                    }
                    if(element['ins_reward'] == 1){
                        let insRewardData = await this.campaignDashboardService.rewardItemGetDetails('insurance_reward', element);
                        let newInsRewardArray = {};
                        for (let insData of insRewardData) {
                            let insRewardId = insData['id'];
                            let transName = '';
                            if(insData['cust_name'] && insData['cust_name'] != ''){
                                transName = insData['cust_name'];
                            }else{
                                transName = insData['insuranceplan']['plan_name'];
                            }
                            if(!newInsRewardArray[insRewardId]){
                                newInsRewardArray[insRewardId] = {};
                            }
                            newInsRewardArray[insRewardId]['id'] = insRewardId;
                            newInsRewardArray[insRewardId]['name'] = transName;
                            newInsRewardArray[insRewardId]['order_id'] = (typeof insData['order_id'] === 'string') ? parseInt(insData['order_id']) : insData['order_id'];
                            newInsRewardArray[insRewardId]['reward_id'] = (typeof insData['reward_id'] === 'string') ? parseInt(insData['reward_id']) : insData['reward_id'];
                            newInsRewardArray[insRewardId]['max_point_limit'] = (typeof insData['max_point_limit'] === 'string') ? parseFloat(insData['max_point_limit']) : insData['max_point_limit'];
                            newInsRewardArray[insRewardId]['consider_require'] = (typeof insData['consider_require'] === 'string') ? parseInt(insData['consider_require']) : insData['consider_require'];
                            newInsRewardArray[insRewardId]['point_user'] = (isNaN(insData['point_user']) || insData['point_user'] == '') ? 0 : ((typeof insData['point_user'] === 'string') ? parseFloat(insData['point_user']) : insData['point_user']);
                            newInsRewardArray[insRewardId]['point_spouse'] =  (isNaN(insData['point_spouse']) || insData['point_spouse'] == '') ? 0 : ((typeof insData['point_spouse'] === 'string') ? parseFloat(insData['point_spouse']) : insData['point_spouse']);
                            if (newInsRewardArray[insRewardId]['point_spouse'] == 0) {
                                newInsRewardArray[insRewardId]['point_spouse'] = (isNaN(insData['point_user']) || insData['point_user'] == '') ? 0 : ((typeof insData['point_user'] === 'string') ? parseFloat(insData['point_user']) : insData['point_user']);
                            }
                            newInsRewardArray[insRewardId]['amt_user'] = (isNaN(insData['amt_user']) || insData['amt_user'] == '') ? 0 : ((typeof insData['amt_user'] === 'string') ? parseFloat(insData['amt_user']) : insData['amt_user']);
                            newInsRewardArray[insRewardId]['amt_spouse'] = (isNaN(insData['amt_spouse']) || insData['amt_spouse'] == '') ? 0 : ((typeof insData['amt_spouse'] === 'string') ? parseFloat(insData['amt_spouse']) : insData['amt_spouse']);
                        }
                        element['InsReward'] = Object.values(newInsRewardArray);
                    }else{
                        element['InsReward'] = [];
                    }
                    if(element['cash_reward'] == 1){
                        let cashRewardData = await this.campaignDashboardService.rewardItemGetDetails('cash_reward', element);
                        let newCashRewardArray = {};
                        for (let cashData of cashRewardData) {
                            let cashRewardId = cashData['id'];
                            let transName = '';
                            if(cashData['cust_name'] && cashData['cust_name'] != ''){
                                transName = cashData['cust_name'];
                            }else{
                                transName = 'Cash';
                            }
                            if(!newCashRewardArray[cashRewardId]){
                                newCashRewardArray[cashRewardId] = {};
                            }
                            newCashRewardArray[cashRewardId]['id'] = cashRewardId;
                            newCashRewardArray[cashRewardId]['name'] = transName;
                            newCashRewardArray[cashRewardId]['order_id'] = cashData['order_id'];
                            newCashRewardArray[cashRewardId]['reward_id'] = cashData['reward_id'];
                            newCashRewardArray[cashRewardId]['max_point_limit'] = (typeof cashData['max_point_limit'] === 'string') ? parseFloat(cashData['max_point_limit']) : cashData['max_point_limit'];
                            newCashRewardArray[cashRewardId]['consider_require'] = (typeof cashData['consider_require'] === 'string') ? parseInt(cashData['consider_require']) : cashData['consider_require'];
                            newCashRewardArray[cashRewardId]['point_user'] = (isNaN(cashData['point_user']) || cashData['point_user'] == '') ? 0 : ((typeof cashData['point_user'] === 'string') ? parseFloat(cashData['point_user']) : cashData['point_user']);
                            newCashRewardArray[cashRewardId]['point_spouse'] = (isNaN(cashData['point_spouse']) || cashData['point_spouse'] == '') ? 0 : ((typeof cashData['point_spouse'] === 'string') ? parseFloat(cashData['point_spouse']) : cashData['point_spouse']);
                            if (newCashRewardArray[cashRewardId]['point_spouse'] == 0) {
                                newCashRewardArray[cashRewardId]['point_spouse'] = (isNaN(cashData['point_user']) || cashData['point_user'] == '') ? 0 : ((typeof cashData['point_user'] === 'string') ? parseFloat(cashData['point_user']) : cashData['point_user']);
                            }
                            newCashRewardArray[cashRewardId]['amt_user'] = (isNaN(cashData['amt_user']) || cashData['amt_user'] == '') ? 0 : ((typeof cashData['amt_user'] === 'string') ? parseFloat(cashData['amt_user']) : cashData['amt_user']);
                            newCashRewardArray[cashRewardId]['amt_spouse'] = (isNaN(cashData['amt_spouse']) || cashData['amt_spouse'] == '') ? 0 : ((typeof cashData['amt_spouse'] === 'string') ? parseFloat(cashData['amt_spouse']) : cashData['amt_spouse']);
                        }
                        element['cashReward'] = Object.values(newCashRewardArray);
                    }else{
                        element['cashReward'] = [];
                    }
                    if(element['other_reward'] == 1){
                        let otherRewardData = await this.campaignDashboardService.rewardItemGetDetails('other_reward', element);
                        let newOtherRewardArray = {};
                        for (let otherData of otherRewardData) {
                            let otherRewardId = otherData['id'];
                            let transName = '';
                            if(otherData['cust_name'] && otherData['cust_name'] != ''){
                                transName =  otherData['cust_name'];
                            }else{
                                transName = 'Other';
                            }
                            if(!newOtherRewardArray[otherRewardId]){
                                newOtherRewardArray[otherRewardId] = {};
                            }
                            newOtherRewardArray[otherRewardId]['id'] = otherRewardId;
                            newOtherRewardArray[otherRewardId]['name'] = transName;
                            newOtherRewardArray[otherRewardId]['order_id'] = otherData['order_id'];
                            newOtherRewardArray[otherRewardId]['reward_id'] = otherData['reward_id'];
                            newOtherRewardArray[otherRewardId]['max_point_limit'] = (typeof otherData['max_point_limit'] === 'string') ? parseFloat(otherData['max_point_limit']) : otherData['max_point_limit'];
                            newOtherRewardArray[otherRewardId]['consider_require'] = (typeof otherData['consider_require'] === 'string') ? parseInt(otherData['consider_require']) : otherData['consider_require'];
                            newOtherRewardArray[otherRewardId]['point'] = (typeof otherData['point'] === 'string') ? parseFloat(otherData['point']) : otherData['point'];
                        }
                        element['otherReward'] = Object.values(newOtherRewardArray);
                    }else{
                        element['otherReward'] = [];
                    }
                }else{
                    element['Campaignchallenges'] = [];
                    element['CampaignSpousechallenges'] = [];
                    element['Campaigncategory'] = [];
                    element['InsReward'] = [];
                    element['cashReward'] = [];
                    element['otherReward'] = [];
                }
            }
            return rewards;
        }catch (error) {
            throw new Error(error.message);
        }
    }
}
