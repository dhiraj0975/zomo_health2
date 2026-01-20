import { SortingService } from '@/modules/common';
import { DepartmentService } from '@/modules/company/departments/department.service';
import { LocationService } from '@/modules/company/locations/location.service';
import { appConstant, campaignConstant, CommonDateService, CommonHealthService, tableConstant, SortDirection } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Req,
    Res,
    UseGuards
} from "@nestjs/common";
import { Request, Response } from "express";
import { TranslationService } from "src/modules/translation/translation.service";
import { CampaignGuard, RoleGuard, TokenGuard } from '../../../guard';
import { ActivePluginService } from "../../company/activeplugins/activeplugin.service";
import { ActivityLogService } from "../../master/activitylog/activitylog.service";
import { FrontCalculationService } from "../front/frontcalculation.service";
import { SliderSettingsService } from '../slidersettings/slidersettings.service';
import { CampaignDashboardService } from "./campaigndashboard.service";
import { SpouseSettingsService } from '../spousesettings/spousesettings.service';
const S3_URL = process.env.S3_URL_PROD;
@Controller('campaign/front')
@UseGuards(TokenGuard, RoleGuard, CampaignGuard)
export class CampaignDashboardController {
    constructor(
        private readonly campaignService: CampaignDashboardService,
        private readonly commonDateService: CommonDateService,
        private readonly commonHealthService: CommonHealthService,
        private readonly translatorService: TranslationService,
        private readonly activePluginService: ActivePluginService,
        private readonly sliderSettingsService: SliderSettingsService,
        private readonly activityLogService: ActivityLogService,
        private readonly frontCalculationService: FrontCalculationService,
        private readonly locationService: LocationService,
        private readonly departmentService: DepartmentService,
        private readonly sortingService: SortingService,
        private readonly spouseSettingsService: SpouseSettingsService,
    ) {}
    /*
     * Function to get Org Dashboard Data
     * - can pass company_id
     * - can pass campaign_id
    */
    @Post('campaign-data')
    async getCampaignDatas(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.company_id || !postData?.campaign_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            if (postData?.searchType && (postData?.searchType != '' && postData?.searchType != 'undefined' && postData?.searchType != null)) {
                if (postData.searchType == 1 && (!postData?.firstStartDate || !postData?.firstEndDate || !postData?.secondStartDate || !postData?.secondEndDate)) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
            }
            if (postData?.onType && postData.onType == 'loadmore') {
                if (!postData?.tabType) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
            }
            const company_id = Number(postData?.company_id);
            const activePlugins = await this.activePluginService.getActivePluginList(company_id);
            let returnDatas = {};
            if (activePlugins.includes('Incentive')) {
                returnDatas = await this.campaignDatas(req, postData, activePlugins);
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: returnDatas,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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

    async campaignDatas(req: any = {}, postData: any = {}, activePlugins: any = []) {
        const company_id = Number(postData?.company_id);
        const campaignId = Number(postData?.campaign_id);
        const user_id = req?.tokenUser?.id;
        const roleId = req?.tokenUser?.role_id || 0;
        const membershipCode = req?.tokenUser?.membership_code || '';
        const onType = postData?.onType || '';
        const tabType = postData?.tabType || '';

        let regularDatas = {};
        let returnDatas = {};

        let checkCampaign: any = [];
        const currentDate = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD');
        let checkCampaignCondition: any = `campaign.id = ${campaignId} AND campaign.organization_id = ${company_id}`;
        checkCampaign = await this.campaignService.findOne(checkCampaignCondition);
        if (!checkCampaign || checkCampaign.length === 0) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_CAMPAIGN_RECORD_NOT_FOUND'));
        }
        let locationIds = checkCampaign['location_ids'] || '';
        let departmentIds = checkCampaign['department_ids'] || '';
        const sliderSetting = await this.sliderSettingsService.findOne({ org_id: company_id });
        const spouseSetting = await this.spouseSettingsService.findOne({ org_id: company_id });
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
            userDatas = await this.campaignService.getChampionUsers(company_id, user_id, ['user.id', 'user.first_name', 'user.last_name', 'user.profile_image', 'user.code', 'user.gender', 'user.dob', 'user.role_id', 'user.on_insurance_plan', 'user.date_of_hire', 'user.department_id', 'user.location', 'user.username'], specificUsers);
            if (userDatas && userDatas.length > 0) {
                const userIds = userDatas.map(user => user.id);
                const userIdsString = userIds.join(',');
                wellnesschampion = ` AND user.id in (${userIdsString}) `;
            } else {
                wellnesschampion = ' AND user.id = 0 ';
            }
        } else {
            const joinTableList = [{ 'alias': 'u_setting', 'table': tableConstant.TBL_USERS_SETTINGS, 'on': `u_setting.user_id = user.id`, 'connect': 'user', 'type': 'LEFT' }];
            let userCondition = `user.role_id IN (2,16) AND user.membership_code = '${membershipCode}' AND user.status = 1`;
            if (onType == 'loadmore' && tabType != '') {
                let specificUsers = (tabType == 10) ? alllocationUserIds : ((tabType == 11) ? alldepartmentUserIds : '');
                if(specificUsers != ''){
                    userCondition += ` AND user.id IN (${specificUsers})`;
                }
            } 
            userDatas = await this.campaignService.getAllUsers(userCondition, ['user.id', 'user.first_name', 'user.last_name', 'user.profile_image', 'user.code', 'user.gender', 'user.dob', 'user.role_id', 'user.on_insurance_plan', 'user.date_of_hire', 'user.department_id', 'user.location', 'user.username'], joinTableList);
        }
        let getRewardCondition: any = `reward.campaign_id = ${campaignId} AND reward.status = 1`;
        let orderBy = { order_id: 'ASC' };
        let rewards: any = await this.campaignService.getRewardsData(getRewardCondition, orderBy);
        let campaignData = {};
        let campaignUsers = userDatas;

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
        /* 
        * Default Web Login and App Login activity reward array 
        */
        if (onType != 'loadmore') {
            let defaultRewards = campaignConstant.DefaultRewards
            defaultRewards.campaign_id = campaignId;
            defaultRewards.activitys[0]['campaign_id'] = campaignId;
            defaultRewards.activitys[1]['campaign_id'] = campaignId;
            defaultRewards.activitys[0]['start_date'] = checkCampaign['start_date'];
            defaultRewards.activitys[0]['end_date'] = checkCampaign['end_date'];
            defaultRewards.activitys[1]['start_date'] = checkCampaign['start_date'];
            defaultRewards.activitys[1]['end_date'] = checkCampaign['end_date'];
            rewards.push(defaultRewards);
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
                        '1': await this.translatorService.frontendReadTranslation(req.lang, "Combined", `/LC_MESSAGES/Campaign/Campaigns`, `static`),
                        '2': await this.translatorService.frontendReadTranslation(req.lang, "Employees", `/LC_MESSAGES/Campaign/Campaigns`, `static`),
                        '3': await this.translatorService.frontendReadTranslation(req.lang, "Spouses", `/LC_MESSAGES/Campaign/Campaigns`, `static`),
                        '4': await this.translatorService.frontendReadTranslation(req.lang, "On_Health_Plan_Employees", `/LC_MESSAGES/Campaign/Campaigns`, `static`),
                        '5': await this.translatorService.frontendReadTranslation(req.lang, "Off_Health_Plan_Employess", `/LC_MESSAGES/Campaign/Campaigns`, `static`),
                        '6': await this.translatorService.frontendReadTranslation(req.lang, "On_Health_Plan_Spouses", `/LC_MESSAGES/Campaign/Campaigns`, `static`),
                        '7': await this.translatorService.frontendReadTranslation(req.lang, "Off_Health_Plan_Spouses", `/LC_MESSAGES/Campaign/Campaigns`, `static`),
                        '8': await this.translatorService.frontendReadTranslation(req.lang, "Combined_On_Health_Plan", `/LC_MESSAGES/Campaign/Campaigns`, `static`),
                        '9': await this.translatorService.frontendReadTranslation(req.lang, "Combined_Off_Health_Plan", `/LC_MESSAGES/Campaign/Campaigns`, `static`),
                        '10': await this.translatorService.frontendReadTranslation(req.lang, "Location", `/LC_MESSAGES/Campaign/Campaigns`, `static`),
                        '11': await this.translatorService.frontendReadTranslation(req.lang, "Department", `/LC_MESSAGES/Campaign/Campaigns`, `static`),
                        '12': await this.translatorService.frontendReadTranslation(req.lang, "Gender", `/LC_MESSAGES/Campaign/Campaigns`, `static`),
                        '13': await this.translatorService.frontendReadTranslation(req.lang, "Age_Group", `/LC_MESSAGES/Campaign/Campaigns`, `static`)
                    }
                ];
            }

            let commonDatas = [{ 'membershipCode': membershipCode }, { 'company_id': company_id }, { 'campaignId': campaignId }, { 'rewards': rewards }, { 'otherCondition': otherCondition }, { 'activePlugins': activePlugins }, { 'sliderSetting': sliderSetting }, { 'wellnesschampion': wellnesschampion }, { 'campaignUsers': campaignUsers }, { 'userDatas': userDatas }, { 'counterDataSetup': counterDataSetup }, { 'regularDatas': regularDatas }, { 'orgSettingOptions': orgSettingOptions }, { 'campaignEndDate': campaignEndDate }, { locationDatas: locationDatas }, { departmentDatas: departmentDatas }, { paginationLocDatas: paginationLocDatas }, { paginationDeptDatas: paginationDeptDatas }, { 'spouseSetting': spouseSetting }, { 'allUsersDOHInfoData': allUsersDOHInfoData }];

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

                    postData.firstStartDate = await this.commonDateService.DateTimeFormat(checkCampaign['start_date'], 'MM-DD-YYYY');
                    postData.firstEndDate = await this.commonDateService.DateTimeFormat(checkCampaign['end_date'], 'MM-DD-YYYY');
                    /* Old Start */
                    const newStartDate = await this.commonDateService.getTodayDate().subtract(addDays, 'days').format('MM-DD-YYYY');
                    const newEndDate = await this.commonDateService.getTodayDate().subtract(0, 'day').format('MM-DD-YYYY');
                    postData.secondStartDate = newStartDate;
                    postData.secondEndDate = newEndDate;
                    /* Old End */

                    /* New Start */
                    /*postData.secondStartDate = postData.firstStartDate;
                    postData.secondEndDate = await this.commonDateService.getTodayDate().subtract(addDays, 'days').format('MM-DD-YYYY');*/
                    /* New End */
                }
            }

            const getCampaignDatas = await this.campaignDataCalculation('normal', postData, req, commonDatas);
            regularDatas = getCampaignDatas;
            (regularDatas as any).range = [
                {
                    "start_date": postData.firstStartDate
                        ? postData.firstStartDate
                        : await this.commonDateService.DateTimeFormat(checkCampaign['start_date'], 'MM-DD-YYYY'),

                    "end_date": postData.firstEndDate
                        ? postData.firstEndDate
                        : await this.commonDateService.DateTimeFormat(checkCampaign['end_date'], 'MM-DD-YYYY')
                },
                {
                    "start_date": postData.secondStartDate ? postData.secondStartDate : "-",
                    "end_date": postData.secondEndDate ? postData.secondEndDate : "-"
                }
            ];
            if (postData.searchType) {
                let filterDatas = {};
                let ScommonDatas = [{ 'membershipCode': membershipCode }, { 'company_id': company_id }, { 'campaignId': campaignId }, { 'rewards': rewards }, { 'otherCondition': otherCondition }, { 'activePlugins': activePlugins }, { 'sliderSetting': sliderSetting }, { 'wellnesschampion': wellnesschampion }, { 'campaignUsers': campaignUsers }, { 'userDatas': userDatas }, { 'counterDataSetup': counterDataSetup }, { 'regularDatas': filterDatas }, { 'orgSettingOptions': orgSettingOptions }, { 'campaignEndDate': campaignEndDate }, { locationDatas: locationDatas }, { departmentDatas: departmentDatas }, { paginationLocDatas: paginationLocDatas }, { paginationDeptDatas: paginationDeptDatas }, { 'spouseSetting': spouseSetting }, { 'allUsersDOHInfoData': allUsersDOHInfoData }];

                const getFilterCampaignDatas = await this.campaignDataCalculation('filter', postData, req, ScommonDatas);
                filterDatas = getFilterCampaignDatas;
                if (Object.keys(regularDatas['rewards']).length > 0) {
                    for (let [key, value] of Object.entries(regularDatas['rewards'])) {
                        if (value['tabData'] && Object.keys(value['tabData']).length > 0) {
                            for (let [tKey, tData] of Object.entries(value['tabData'])) {
                                let atlatestOneLoginActivtyPer = 0;
                                if (![10, 11, 12, 13].includes(Number(tKey))) {
                                    if (Object.keys(regularDatas['defaultActivitys']).length > 0 && regularDatas['defaultActivitys']['tabData'] && Object.keys(regularDatas['defaultActivitys']['tabData']).length > 0) {
                                        atlatestOneLoginActivtyPer = regularDatas['defaultActivitys']['tabData'][tKey]['activityDetails'][0]['completePer'];
                                    }
                                    if (tData['activityDetails'] && tData['activityDetails'].length > 0) {
                                        for (const [aKey, aData] of tData['activityDetails'].entries()) {
                                            let regulareComplete = aData['complete'];
                                            let filterComplete = filterDatas['rewards'][key]['tabData'][tKey]['activityDetails'][aKey]['complete'];
                                            aData['filterComplete'] = filterComplete;
                                            aData['EngDifference'] = regulareComplete - filterComplete;
                                            aData['EngDifferencePer'] = (aData['EngDifference'] != 0) ? Number(((aData['EngDifference'] * 100) / regulareComplete).toString()) : 0;
                                            if (aData['activitys'] && aData['activitys'].length > 0) {
                                                for (const [acKey, acData] of aData['activitys'].entries()) {
                                                    let regulareComplete = acData['complete'];
                                                    let filterComplete = filterDatas['rewards'][key]['tabData'][tKey]['activityDetails'][aKey]['activitys'][acKey]['complete'];
                                                    acData['filterComplete'] = filterComplete;
                                                    acData['EngDifference'] = regulareComplete - filterComplete;
                                                    acData['EngDifferencePer'] = (acData['EngDifference'] != 0) ? Number(((acData['EngDifference'] * 100) / regulareComplete).toString()) : 0;
                                                }
                                            }
                                        }
                                    }
                                    if (tData['allRewardDetails'] && tData['allRewardDetails'].length > 0) {
                                        for (const [rKey, rData] of tData['allRewardDetails'].entries()) {
                                            let regulareComplete = rData['complete'];
                                            let filterComplete = filterDatas['rewards'][key]['tabData'][tKey]['allRewardDetails'][rKey]['complete'];
                                            rData['filterComplete'] = filterComplete;
                                            rData['EngDifference'] = regulareComplete - filterComplete;
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
                                                    lsData['filterComplete'] = filterComplete;
                                                    lsData['EngDifference'] = regulareComplete - filterComplete;
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
                if (regularDatas?.['defaultActivitys'] && Object.keys(regularDatas['defaultActivitys']).length > 0 && regularDatas['defaultActivitys']['tabData'] && Object.keys(regularDatas['defaultActivitys']['tabData']).length > 0) {
                    for (let [tKey, tData] of Object.entries(regularDatas['defaultActivitys']['tabData'])) {
                        if (tData['activityDetails'] && tData['activityDetails'].length > 0) {
                            for (const [aKey, aData] of tData['activityDetails'].entries()) {
                                let regulareComplete = aData['complete'];
                                let filterComplete = filterDatas['defaultActivitys']['tabData'][tKey]['activityDetails'][aKey]['complete'];
                                aData['filterComplete'] = filterComplete;
                                aData['EngDifference'] = regulareComplete - filterComplete;
                                aData['EngDifferencePer'] = (aData['EngDifference'] != 0) ? Number(((aData['EngDifference'] * 100) / regulareComplete).toString()) : 0;
                            }
                        }
                    }
                }
                if (onType == 'loadmore') {
                    delete(regularDatas['rewards']);
                    regularDatas['rewardData'] = regularDatas['data'];
                    delete(regularDatas['data']);
                    if ((tabType === '10' || tabType === '11') && regularDatas['rewardData'] && regularDatas['rewardData'].length > 0) {
                        for (const [key, value] of Object.entries(regularDatas['rewardData'] || {})) {
                            if (value['data'] && Object.keys(value['data']).length > 0) {
                                for (const [lKey, lData] of Object.entries(value['data'] || {})) {
                                    let regulareComplete = lData['complete'];
                                    let filterComplete = filterDatas['data'][key]['data'][lKey]['complete'];
                                    lData['filterComplete'] = filterComplete;
                                    lData['EngDifference'] = regulareComplete - filterComplete;
                                    lData['EngDifferencePer'] = (lData['EngDifference'] != 0) ? Number(((lData['EngDifference'] * 100) / regulareComplete).toString()) : 0;
                                }
                            }
                        }
                    }
                    regularDatas['paginationData'] = regularDatas['paginationData'];
                }
                returnDatas = regularDatas;
            } else {
                if (Object.keys(regularDatas['rewards']).length > 0) {
                    for (let [key, value] of Object.entries(regularDatas['rewards'])) {
                        if (value['tabData'] && Object.keys(value['tabData']).length > 0) {
                            for (let [tKey, tData] of Object.entries(value['tabData'])) {
                                let atlatestOneLoginActivtyPer = 0;
                                if (![10, 11, 12, 13].includes(Number(tKey))) {
                                    if (Object.keys(regularDatas['defaultActivitys']).length > 0 && regularDatas['defaultActivitys']['tabData'] && Object.keys(regularDatas['defaultActivitys']['tabData']).length > 0) {
                                        atlatestOneLoginActivtyPer = regularDatas['defaultActivitys']['tabData'][tKey]['activityDetails'][0]['completePer'];
                                    }
                                    tData['graphData'][0]['value'] = atlatestOneLoginActivtyPer;
                                }
                            }
                        }
                    }
                }
                if (onType == 'loadmore') {
                    delete(regularDatas['rewards']);
                    regularDatas['rewardData'] = regularDatas['data'];
                    delete(regularDatas['data']);
                    regularDatas['paginationData'] = regularDatas['paginationData'];
                }
                returnDatas = regularDatas;
            }
        }
        return returnDatas;
    }

    async campaignDataCalculation(type: any = 'normal', postData: any = {}, req: any = {}, commonDatas: any = []) {
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
            regularDatas = {},
            orgSettingOptions = [],
            campaignEndDate = null,
            locationDatas = {},
            departmentDatas = {},
            paginationLocDatas = {},
            paginationDeptDatas = {},
            spouseSetting = {},
            allUsersDOHInfoData = {},
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

        let LOGGED_INTO_THE_SITE_AT_LEAST_ONCE = await this.translatorService.frontendReadTranslation(req.lang, "LOGGED_INTO_THE_SITE_AT_LEAST_ONCE", `/LC_MESSAGES/Campaign/Campaigns`, `static`);
        let COMPLETED_ALL_THE_REQUIREMENTS = await this.translatorService.frontendReadTranslation(req.lang, "COMPLETED_ALL_THE_REQUIREMENTS", `/LC_MESSAGES/Campaign/Campaigns`, `static`);
        let ON_TRACK_AND_PARTICIPATING = await this.translatorService.frontendReadTranslation(req.lang, "ON_TRACK_&_PARTICIPATING", `/LC_MESSAGES/Campaign/Campaigns`, `static`);
        let CAMPAIGN_DEADLINE_COUNTDOWN = await this.translatorService.frontendReadTranslation(req.lang, "CAMPAIGN_DEADLINE_COUNTDOWN", `/LC_MESSAGES/Campaign/Campaigns`, `static`);
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

        let statusCondition = ` AND user.status = '1'`;
        let rewOtherData = [{ 'membershipCode': membershipCode }, { 'otherCondition': otherCondition }, { 'company_id': company_id }, { 'campaignId': campaignId }, { 'activePlugins': activePlugins }, { 'slider': sliderSetting }, { 'wellnesschampion': wellnesschampion }, { 'statusCondition': statusCondition }, { 'dateRange': dateRange }, { 'filterStartDate': filterStartDate }, { 'filterEndDate': filterEndDate }, { 'spouseSetting': spouseSetting }, { 'allUsersDOHInfoData': allUsersDOHInfoData }];
        let rewardDatas = await this.campaignService.getMultiRewarddatas(4, JSON.parse(JSON.stringify(rewards)), rewOtherData, req); /* 4 is Org and Champaign Dashboard */
        let rewardWiseUsers = new Map();
        let camOtherData = [{ 'membershipCode': membershipCode }, { 'totalUsers': campaignUsers.length }, { 'userDatas': userDatas }, { 'company_id': company_id }, { 'campaignId': campaignId }, { 'activePlugins': activePlugins }];
        let rewardWiseUserDatas: any = await this.frontCalculationService.getCampaignUserCalculation(4, JSON.parse(JSON.stringify(rewardDatas)), camOtherData, req);
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
        for (let [key, rwd] of Object.entries(rewardWiseUserDatas)) {
            const rewardId = rwd['id'];
            let rewardNme = await this.translatorService.frontendReadTranslation(req.lang, `reward_name_${campaignId}_${rewardId}`, `/LC_MESSAGES/Campaign/Campaigns/${company_id}/${campaignId}`, `dynamic`);
            rewardNme = (rewardNme == '' || rewardNme == `reward_name_${campaignId}_${rewardId}`) ? rwd['reward_name'] : rewardNme;
            rwd['reward_name'] = rewardNme;
            if (!regularDatas['rewards']) {
                regularDatas['rewards'] = {};
            }
            if (!regularDatas['rewards'][`${rewardId}`]) {
                regularDatas['rewards'][`${rewardId}`] = {};
            }
            regularDatas['rewards'][`${rewardId}`]['id'] = rewardId;
            regularDatas['rewards'][`${rewardId}`]['campaign_id'] = campaignId;
            regularDatas['rewards'][`${rewardId}`]['reward_name'] = rewardNme;
            regularDatas['rewards'][`${rewardId}`]['order'] = rwd['order_id'];
            let orgTabSetting = rwd['org_tab_setting'] && rwd['org_tab_setting'] != '' ? rwd['org_tab_setting'].split(',') : ['1', '2', '3','8','9','10','11','12','13'];

            const spouseIDs = ['1', '3', '6', '7', '8', '9','10','11','12','13'];
            if (spouseSetting && spouseSetting.hide === 1) {
                orgTabSetting = orgTabSetting.filter((id: string) => !spouseIDs.includes(id));
            }
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
                        let completeTotal = 0;
                        let completeS = actRaw['completeS'];
                        let completePerS = 0;
                        let completeSTotal = 0;
                        let completeU = 0;
                        let completePerU = 0;
                        let completeUTotal = 0;
                        let completeCONHP = 0;
                        let completePerCONHP = 0;
                        let completeCONHPTotal = 0;
                        let completeCOFFHP = actRaw['completeCOFFHP'];
                        let completePerCOFFHP = 0;
                        let completeCOFFHPTotal = 0;
                        let completeONHPU = 0;
                        let completePerONHPU = 0;
                        let completeONHPUTotal = 0;
                        let completeOFFHPU = actRaw['completeOFFHPU'];
                        let completePerOFFHPU = 0;
                        let completeOFFHPUTotal = 0;
                        let completeONHPS = 0;
                        let completePerONHPS = 0;
                        let completeONHPSTotal = 0;
                        let completeOFFHPS = actRaw['completeOFFHPS'];
                        let completePerOFFHPS = 0;
                        let completeOFFHPSTotal = 0;
                        if (actRaw['required_by_user'] == 'Y') {
                            totalActivity += 1;
                        }
                        if (actRaw['required_by_spouse'] == 'Y') {
                            totalActivityS += 1;
                        }
                        let actName = '';
                        if (actRaw['cust_name'] && actRaw['cust_name'] != '') {
                            actName = await this.translatorService.frontendReadTranslation(req.lang, `activity_name_${campaignId}_${rewardId}_${campActId}`, `/LC_MESSAGES/Campaign/Campaigns/${company_id}/${campaignId}`, `dynamic`);
                            actName = (actName == '' || actName == `activity_name_${campaignId}_${rewardId}_${campActId}`) ? actRaw['cust_name'] : actName;
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
                        completeTotal = totalUsereligible;
                        if (complete > 0) {
                            completePer = (complete * 100) / totalUsereligible;
                        }
                        completeSTotal = totalSpouse;
                        if (completeS > 0 && totalSpouse > 0) {
                            completePerS = (completeS * 100) / totalSpouse;
                        }
                        completeUTotal = (totalUsereligible - totalSpouse);
                        completeU = complete - completeS;
                        if (completeU > 0 && (totalUsereligible - totalSpouse) > 0) {
                            completePerU = (completeU * 100) / (totalUsereligible - totalSpouse);
                        }
                        completeCOFFHPTotal = userNoteligible;
                        if (completeCOFFHP > 0 && userNoteligible > 0) {
                            completePerCOFFHP = (completeCOFFHP * 100) / userNoteligible;
                        }
                        completeCONHPTotal = (totalUsereligible - userNoteligible);
                        completeCONHP = complete - completeCOFFHP;
                        if (completeCONHP > 0 && (totalUsereligible - userNoteligible) > 0) {
                            completePerCONHP = (completeCONHP * 100) / (totalUsereligible - userNoteligible);
                        }
                        completeOFFHPUTotal = useronlyNoteligible;
                        if (completeOFFHPU > 0 && useronlyNoteligible > 0) {
                            completePerOFFHPU = (completeOFFHPU * 100) / useronlyNoteligible;
                        }
                        completeONHPUTotal = (totalUserOnlyeligible - useronlyNoteligible);
                        completeONHPU = completeU - completeOFFHPU;
                        if (completeONHPU > 0 && (totalUserOnlyeligible - useronlyNoteligible) > 0) {
                            completePerONHPU = (completeONHPU * 100) / (totalUserOnlyeligible - useronlyNoteligible);
                        }
                        completeOFFHPSTotal = spouseonlyNoteligible;
                        if (completeOFFHPS > 0 && spouseonlyNoteligible > 0) {
                            completePerOFFHPS = (completeOFFHPS * 100) / spouseonlyNoteligible;
                        }
                        completeONHPSTotal = (totalSpouse - spouseonlyNoteligible);
                        completeONHPS = completeS - completeOFFHPS;
                        if (completeONHPS > 0 && (totalSpouse - spouseonlyNoteligible) > 0) {
                            completePerONHPS = (completeONHPS * 100) / (totalSpouse - spouseonlyNoteligible);
                        }
                        let NewEngSummaryCombined = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: complete, completePer: completePer, dateorder: dateorder, ReqBy: ReqBy, oid: oid, total: completeTotal }]);
                        EngSummaryCombined = [...EngSummaryCombined, ...NewEngSummaryCombined];
                        let NewEngSummaryEmployee = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeU, completePer: completePerU, dateorder: dateorder, ReqBy: ReqBy, oid: oid, total: completeUTotal }]);
                        EngSummaryEmployee = [...EngSummaryEmployee, ...NewEngSummaryEmployee];

                        let NewEngSummarySpouse = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeS, completePer: completePerS, dateorder: dateorder, ReqBy: ReqBy, oid: oid, total: completeSTotal }]);
                        EngSummarySpouse = [...EngSummarySpouse, ...NewEngSummarySpouse];
                        let NewEngSummaryCombinedOnHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeCONHP, completePer: completePerCONHP, dateorder: dateorder, ReqBy: ReqBy, oid: oid, total: completeCONHPTotal }]);
                        EngSummaryCombinedOnHealthPlan = [...EngSummaryCombinedOnHealthPlan, ...NewEngSummaryCombinedOnHealthPlan];
                        let NewEngSummaryCombinedOffHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeCOFFHP, completePer: completePerCOFFHP, dateorder: dateorder, ReqBy: ReqBy, oid: oid, total: completeCOFFHPTotal }]);
                        EngSummaryCombinedOffHealthPlan = [...EngSummaryCombinedOffHealthPlan, ...NewEngSummaryCombinedOffHealthPlan];
                        let NewEngSummaryEmpOnHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeONHPU, completePer: completePerONHPU, dateorder: dateorder, ReqBy: ReqBy, oid: oid, total: completeONHPUTotal }]);
                        EngSummaryEmpOnHealthPlan = [...EngSummaryEmpOnHealthPlan, ...NewEngSummaryEmpOnHealthPlan];
                        let NewEngSummaryEmpOffHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeOFFHPU, completePer: completePerOFFHPU, dateorder: dateorder, ReqBy: ReqBy, oid: oid, total: completeOFFHPUTotal }]);
                        EngSummaryEmpOffHealthPlan = [...EngSummaryEmpOffHealthPlan, ...NewEngSummaryEmpOffHealthPlan];
                        let NewEngSummarySpouseOnHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeONHPS, completePer: completePerONHPS, dateorder: dateorder, ReqBy: ReqBy, oid: oid, total: completeONHPSTotal }]);
                        EngSummarySpouseOnHealthPlan = [...EngSummarySpouseOnHealthPlan, ...NewEngSummarySpouseOnHealthPlan];
                        let NewEngSummarySpouseOffHealthPlan = this.commonHealthService.campaignObjectStructure('Summary', [{ actName: actName, complete: completeOFFHPS, completePer: completePerOFFHPS, dateorder: dateorder, ReqBy: ReqBy, oid: oid, total: completeOFFHPSTotal }]);
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
                        const campCatId = catRaw['id'];
                        const catId = catRaw['category_id'];
                        if (catRaw['required_by_user'] == 'Y') {
                            totalActivity += 1;
                        }
                        if (catRaw['required_by_spouse'] == 'Y') {
                            totalActivityS += 1;
                        }
                        let actName = '';
                        if (catRaw['cust_name'] && catRaw['cust_name'] != '') {
                            actName = await this.translatorService.frontendReadTranslation(req.lang, `category_name_${campaignId}_${rewardId}_${campCatId}`, `/LC_MESSAGES/Campaign/Campaigns/${company_id}/${campaignId}`, `dynamic`);
                            actName = (actName == '' || actName == `category_name_${campaignId}_${rewardId}_${campCatId}`) ? catRaw['cust_name'] : actName;
                        } else {
                            actName = await this.translatorService.frontendReadTranslation(req.lang, `category_name_${catId}`, `/LC_MESSAGES/Campaign/Category/${catId}`, `dynamic`);
                            actName = (actName == '' || actName == `category_name_${catId}`) ? catRaw['category']['category_name'] : actName;
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
                                const campCActId = actRaw['id'];
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
                                    actName = await this.translatorService.frontendReadTranslation(req.lang, `activity_name_${campaignId}_${rewardId}_${campCActId}`, `/LC_MESSAGES/Campaign/Campaigns/${company_id}/${campaignId}`, `dynamic`);
                                    actName = (actName == '' || actName == `activity_name_${campaignId}_${rewardId}_${campCActId}`) ? actRaw['cust_name'] : actName;
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

                        if (orgTabSetting.includes('10') && locationList.hasOwnProperty(valuesU['location'])) {
                            if ((totalActivity == 0 || valuesR['consider_require'] == 0) && valuesU['Total'] >= valuesR['point']) {
                                locationList[valuesU['location']].complete += 1;
                            } else {
                                if (valuesU['Total'] >= valuesR['point'] && (userActivityTotal[userId] && userActivityTotal[userId]['Total'] >= totalActivity || valuesR['consider_require'] == 0)) {
                                    locationList[valuesU['location']].complete += 1;
                                }
                            }
                        }
                        if (orgTabSetting.includes('11') && departmentList.hasOwnProperty(valuesU['department'])) {
                            if ((totalActivity == 0 || valuesR['consider_require'] == 0) && valuesU['Total'] >= valuesR['point']) {
                                departmentList[valuesU['department']].complete += 1;
                            } else {
                                if (valuesU['Total'] >= valuesR['point'] && (userActivityTotal[userId] && userActivityTotal[userId]['Total'] >= totalActivity || valuesR['consider_require'] == 0)) {
                                    departmentList[valuesU['department']].complete += 1;
                                }
                            }
                        }
                        if (orgTabSetting.includes('12') && genderList.hasOwnProperty(valuesU['gender'])) {
                            if ((totalActivity == 0 || valuesR['consider_require'] == 0) && valuesU['Total'] >= valuesR['point']) {
                                genderList[valuesU['gender']].complete += 1;
                            } else {
                                if (valuesU['Total'] >= valuesR['point'] && (userActivityTotal[userId] && userActivityTotal[userId]['Total'] >= totalActivity || valuesR['consider_require'] == 0)) {
                                    genderList[valuesU['gender']].complete += 1;
                                }
                            }
                        }
                        if (orgTabSetting.includes('13')) {
                            for (let key in ageGroupList) {
                                const minAge = ageGroupList[key].min_age;
                                const maxAge = ageGroupList[key].max_age;
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
                    }
                    totalUsereligible = campTotalUser;
                    rtotalUserOnlyeligible = totalUserOnly;
                    if (complete > 0) {
                        completePer = (complete * 100) / campTotalUser;
                    }

                    let NewrewardAllCombined = this.commonHealthService.campaignObjectStructure('Reward', [{ actName: valuesR['name'], complete: complete, completePer: completePer }]);
                    rewardAllCombined = [...rewardAllCombined, ...NewrewardAllCombined];
                    if (completeS > 0 && totalSpouse > 0) {
                        completePerS = (completeS * 100) / totalSpouse;
                    }
                    let NewrewardAllSpouse = this.commonHealthService.campaignObjectStructure('Reward', [{ actName: valuesR['name'], complete: completeS, completePer: completePerS }]);
                    rewardAllSpouse = [...rewardAllSpouse, ...NewrewardAllSpouse];
                    completeU = complete - completeS;
                    if (completeU > 0 && (campTotalUser - totalSpouse) > 0) {
                        completePerU = (completeU * 100) / (campTotalUser - totalSpouse);
                    }
                    let NewrewardAllEmployee = this.commonHealthService.campaignObjectStructure('Reward', [{ actName: valuesR['name'], complete: completeU, completePer: completePerU }]);
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

                    if(orgTabSetting.includes('10')){
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
                    }

                    if(orgTabSetting.includes('11')){
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
                    }

                    if(orgTabSetting.includes('12')){
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
                    }

                    if(orgTabSetting.includes('13')){
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
                if (!regularDatas['rewards'][`${rewardId}`]['tabData']) {
                    regularDatas['rewards'][`${rewardId}`]['tabData'] = {};
                }
                for (let tabRaw of orgSettingOptionsKeys) {
                    if (orgTabSetting.includes(tabRaw)) {
                        if (!regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]) {
                            regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw] = {};
                        }
                        regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['tabName'] = orgSettingOptions[0][`${tabRaw}`];
                        if (tabRaw === '1') {
                            EngSummaryCombined = await this.sortingService.sortCampaignData('asc', EngSummaryCombined, 'order_id');
                            regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['activityDetails'] = EngSummaryCombined;
                            if (rwd['isDefaultReward'] != 1) {
                                regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['allRewardDetails'] = rewardAllCombined;
                                regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['graphData'] = combinedGraphArray;
                            }
                        } else if (tabRaw === '2') {
                            EngSummaryEmployee = await this.sortingService.sortCampaignData('asc', EngSummaryEmployee, 'order_id');
                            regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['activityDetails'] = EngSummaryEmployee;
                            if (rwd['isDefaultReward'] != 1) {
                                regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['allRewardDetails'] = rewardAllEmployee;
                                regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['graphData'] = employeeGraphArray;
                            }
                        } else if (tabRaw === '3') {
                            EngSummarySpouse = await this.sortingService.sortCampaignData('asc', EngSummarySpouse, 'order_id');
                            regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['activityDetails'] = EngSummarySpouse;
                            if (rwd['isDefaultReward'] != 1) {
                                regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['allRewardDetails'] = rewardAllSpouse;
                                regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['graphData'] = spouseGraphArray;
                            }
                        } else if (tabRaw === '4') {
                            EngSummaryEmpOnHealthPlan = await this.sortingService.sortCampaignData('asc', EngSummaryEmpOnHealthPlan, 'order_id');
                            regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['activityDetails'] = EngSummaryEmpOnHealthPlan;
                            if (rwd['isDefaultReward'] != 1) {
                                regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['allRewardDetails'] = rewardAllEmployeeOnHealthPlan;
                                regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['graphData'] = employeeOnHealthPlanGraphArray;
                            }
                        } else if (tabRaw === '5') {
                            EngSummaryEmpOffHealthPlan = await this.sortingService.sortCampaignData('asc', EngSummaryEmpOffHealthPlan, 'order_id');
                            regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['activityDetails'] = EngSummaryEmpOffHealthPlan;
                            if (rwd['isDefaultReward'] != 1) {
                                regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['allRewardDetails'] = rewardAllEmployeeOffHealthPlan;
                                regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['graphData'] = employeeOffHealthPlanGraphArray;
                            }
                        } else if (tabRaw === '6') {
                            EngSummarySpouseOnHealthPlan = await this.sortingService.sortCampaignData('asc', EngSummarySpouseOnHealthPlan, 'order_id');
                            regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['activityDetails'] = EngSummarySpouseOnHealthPlan;
                            if (rwd['isDefaultReward'] != 1) {
                                regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['allRewardDetails'] = rewardAllSpouseOnHealthPlan;
                                regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['graphData'] = spouseOnHealthPlanGraphArray;
                            }
                        } else if (tabRaw === '7') {
                            EngSummarySpouseOffHealthPlan = await this.sortingService.sortCampaignData('asc', EngSummarySpouseOffHealthPlan, 'order_id');
                            regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['activityDetails'] = EngSummarySpouseOffHealthPlan;
                            if (rwd['isDefaultReward'] != 1) {
                                regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['allRewardDetails'] = rewardAllSpouseOffHealthPlan;
                                regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['graphData'] = spouseOffHealthPlanGraphArray;
                            }
                        } else if (tabRaw === '8') {
                            EngSummaryCombinedOnHealthPlan = await this.sortingService.sortCampaignData('asc', EngSummaryCombinedOnHealthPlan, 'order_id');
                            regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['activityDetails'] = EngSummaryCombinedOnHealthPlan;
                            if (rwd['isDefaultReward'] != 1) {
                                regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['allRewardDetails'] = rewardAllCombinedOnHealthPlan;
                                regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['graphData'] = combinedOnHealthPlanGraphArray;
                            }
                        } else if (tabRaw === '9') {
                            EngSummaryCombinedOffHealthPlan = await this.sortingService.sortCampaignData('asc', EngSummaryCombinedOffHealthPlan, 'order_id');
                            regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['activityDetails'] = EngSummaryCombinedOffHealthPlan;
                            if (rwd['isDefaultReward'] != 1) {
                                regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['allRewardDetails'] = rewardAllCombinedOffHealthPlan;
                                regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['graphData'] = combinedOffHealthPlanGraphArray;
                            }
                        } else if (tabRaw === '10') {
                            regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['rewardData'] = rewardAllLocation;
                            regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['paginationData'] = paginationLocDatas;
                        } else if (tabRaw === '11') {
                            regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['rewardData'] = rewardAllDepartment;
                            regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['paginationData'] = paginationDeptDatas;
                        } else if (tabRaw === '12') {
                            regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['rewardData'] = rewardAllGender;
                        } else if (tabRaw === '13') {
                            regularDatas['rewards'][`${rewardId}`]['tabData'][tabRaw]['rewardData'] = rewardAllAgeGroup;
                        }
                    }
                }
            }else{
                if (tabType == 10) {
                    regularDatas['data'] = rewardAllLocation;
                    regularDatas['paginationData'] = paginationLocDatas;
                } else if (tabType == 11) {
                    regularDatas['data'] = rewardAllDepartment;
                    regularDatas['paginationData'] = paginationDeptDatas;
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
                let defaultActivitys = regularDatas['rewards'][0];
                for (let [key, value] of Object.entries(defaultActivitys['tabData'])) {
                    let completeCLOnce = 0;
                    let completeCLOncePer = 0;
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

                regularDatas['defaultActivitys'] = defaultActivitys;
            /* Common Activity Calculation Section */
        }
        delete (regularDatas['rewards'][0]);
        return regularDatas;
    }

    async getpaginateDatas(postData: any = {}, commonDatas: any = []) {
        let {
            company_id = null,
            locationIds = '',
            departmentIds = ''
        } = Object.assign({}, ...commonDatas);

        let locationPaginationData = { page: postData.page || 1, limit: postData.limit || 10, order_by: 'location.id', order: 'ASC' as SortDirection, fields: ['location.id', 'location.company_id', 'location.location_name', 'location.lname'] };
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
            item['filterComplete'] = '- - -';
            item['EngDifference'] = '- - -';
            item['EngDifferencePer'] = '- - -';
            acc[item.id] = item;
            return acc;
        }, {} as Record<number, typeof locationData['list'][number]>);

        let departmentPaginationData = { page: postData.page || 1, limit: postData.limit || 10, order_by: 'department.id', order: 'ASC' as SortDirection, fields: ['department.id', 'department.company_id', 'department.dept_name'] };
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
            item['filterComplete'] = '- - -';
            item['EngDifference'] = '- - -';
            item['EngDifferencePer'] = '- - -';
            acc[item.id] = item;
            return acc;
        }, {} as Record<number, typeof departmentData['list'][number]>);
        return { locationDatas, departmentDatas, paginationLocDatas, paginationDeptDatas };
    }
}
