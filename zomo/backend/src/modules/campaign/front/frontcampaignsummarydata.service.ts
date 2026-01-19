import { CommonDateService, CommonHealthService } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { Request } from "express";
import * as moment from 'moment-timezone';
import { TranslationService } from 'src/modules/translation/translation.service';
import { SliderSettingsService } from '../slidersettings/slidersettings.service';
import { FrontPointsForService } from './frontpointfor.service';
import { UrlManageService, SortingService } from 'src/modules/common';
@Injectable()
export class FrontCampaginSummaryService {
    constructor(
        private readonly commonDateService: CommonDateService,
        private readonly commonHealthService: CommonHealthService,
        private readonly translatorService: TranslationService,
        private readonly sliderSettingsService: SliderSettingsService,
        private readonly frontPointsForService: FrontPointsForService,
        private readonly urlManageService: UrlManageService,
        private readonly sortingService: SortingService,
    ) {}

    async getFinalCampaignSummaryData(rewardsData:any = [], commonDatas: any = [], req: Request){
        try{
            let {
                userId = null,
                roleID = null,
                orgId = null,
                campaign_id = null,
                call_from = null,
                call_for = null,
                isCampaignEligible = null,
                isSpouseCampaignEligible = null,
                leaderboardCampId = null,
                formInstructionData = {},
                spouseShow = 0,
            } = Object.assign({}, ...commonDatas);
            let campaignId = (typeof campaign_id === 'string') ? parseInt(campaign_id) : campaign_id;
            let required_by_spouse = "required_by_spouse";
            let required_by_user = "required_by_user";
            if (roleID == 16) {
                required_by_spouse = "required_by_user";
                required_by_user = "required_by_spouse";
            }
            let OptionalLabel = "Optional";
            if (orgId == '804') {
                OptionalLabel = "Elective";
            }
            const sliderSetting = await this.sliderSettingsService.findOne({ org_id: orgId });
            let emableWidgetList = req?.tokenUser?.company?.meta?.enable_widget || '';
            const emableWidgetListData = (emableWidgetList) ? JSON.parse(emableWidgetList) : {};
            let returnFinalData = {};
            let leaderBoardCampaignTotalPoints = 0;
            let dsahboardPointSliderData = [];
            let dsahboardSPointSliderData = [];
            let requiredActivitiesComplete = 0;

            let totalActivityRequiredPoints = 0;
            let totalActivityCompletedPoints = 0;
            for (let rewData of rewardsData){
                const rewardId = rewData['id'];
                const userFieldsToCheck = [
                    'Campaignactivity',
                    'Campaignchallenges',
                    'Campaigncategory',
                ];
                const mergedUserValidArrays = userFieldsToCheck.reduce((mergedArray, field) => {
                    const isValid = Array.isArray(rewData[field]) && rewData[field]?.length > 0;
                    if (isValid) {
                        const validArray = rewData[field].filter((item) => item && typeof item === 'object');
                        let isDefines = 1;
                        if(field == 'Campaignchallenges'){
                            isDefines = 2;
                        }else if(field == 'Campaigncategory'){
                            isDefines = 3;
                        }
                        return [...mergedArray, ...validArray.map((item) => ({ ...item, isDefine: isDefines }))];
                    }
                    return mergedArray;
                }, []);
                const sortedUserArray = await this.sortingService.sortCampaignData('asc', mergedUserValidArrays, 'order_id', 'id');
                const spouseFieldsToCheck = [
                    'CampaignSpouseactivity',
                    'CampaignSpousechallenges',
                    'CampaignSpousecategory',
                ];
                const mergedSpouseValidArrays = spouseFieldsToCheck.reduce((mergedArray, field) => {
                    const isValid = Array.isArray(rewData[field]) && rewData[field]?.length > 0;
                    if (isValid) {
                        const validArray = rewData[field].filter((item) => item && typeof item === 'object');
                        let isDefines = 1;
                        if(field == 'CampaignSpousechallenges'){
                            isDefines = 2;
                        }else if(field == 'CampaignSpousecategory'){
                            isDefines = 3;
                        }
                        return [...mergedArray, ...validArray.map((item) => ({ ...item, isDefine: isDefines }))];
                    }
                    return mergedArray;
                }, []);
                const sortedSpouseArray = await this.sortingService.sortCampaignData('asc', mergedSpouseValidArrays, 'order_id', 'id');
                delete(rewData['Campaignactivity']);
                delete(rewData['Campaignchallenges']);
                delete(rewData['Campaigncategory']);
                delete(rewData['CampaignSpouseactivity']);
                delete(rewData['CampaignSpousechallenges']);
                delete(rewData['CampaignSpousecategory']);
                rewData['userActivity'] = sortedUserArray;
                if(spouseShow == 1){
                    rewData['spouseActivity'] = sortedSpouseArray;
                }
                let rewardNme = await this.translatorService.frontendReadTranslation(req.lang,`reward_name_${campaignId}_${rewardId}`, `/LC_MESSAGES/Campaign/Campaigns/${orgId}/${campaignId}`,`dynamic`);
                rewardNme = (rewardNme == '' || rewardNme == `reward_name_${campaignId}_${rewardId}`) ? rewData['reward_name'] : rewardNme;
                rewData['reward_name'] = rewardNme;
                let rewardDesc = await this.translatorService.frontendReadTranslation(req.lang,`reward_desc_${campaignId}_${rewardId}`, `/LC_MESSAGES/Campaign/Campaigns/${orgId}/${campaignId}`,`dynamic`);
                rewardDesc = (rewardDesc == '' || rewardDesc == `reward_desc_${campaignId}_${rewardId}`) ? rewData['reward_desc'] : rewardDesc;
                rewData['reward_desc'] = rewardDesc;
                if(!returnFinalData[`${rewardId}`]){
                    returnFinalData[`${rewardId}`] = {};
                }
                returnFinalData[`${rewardId}`]['id'] = rewardId;
                returnFinalData[`${rewardId}`]['campaign_id'] = campaignId;
                returnFinalData[`${rewardId}`]['reward_name'] = rewardNme;
                returnFinalData[`${rewardId}`]['reward_desc'] = rewardDesc;
                returnFinalData[`${rewardId}`]['order'] = rewData['order_id'];
                returnFinalData[`${rewardId}`]['cat_activity_visibility'] = rewData['cat_activity_visibility'];

                let commonDatas = [ { 'orgId' : orgId }, { 'campaignId' : campaignId }, { 'rewardId' : rewardId }, { 'call_from' : call_from }, { 'call_for' : call_for }, { 'userId' : userId }, { 'required_by_user' : required_by_user }, { 'OptionalLabel' : OptionalLabel }, { 'isCampaignEligible' : isCampaignEligible }, { 'isSpouseCampaignEligible' : isSpouseCampaignEligible}, { 'req' : req }, { 'sliderSetting' : sliderSetting }, { 'formInstructionData' : formInstructionData }, { 'requiredActivitiesComplete' : requiredActivitiesComplete }, { 'leaderboardCampId' : leaderboardCampId }, { 'leaderBoardCampaignTotalPoints' : leaderBoardCampaignTotalPoints }, { 'emableWidgetListData' : emableWidgetListData }, { 'dsahboardPointSliderData' : dsahboardPointSliderData, 'dsahboardSPointSliderData': dsahboardSPointSliderData }];
                let userActivitys = await this.getSummaryDatas('user',JSON.parse(JSON.stringify(rewData)), returnFinalData, rewData['userActivity'], commonDatas);
                if(userActivitys && Object.keys(userActivitys)?.length > 0){
                    returnFinalData[`${rewardId}`] = userActivitys['returnFinalData'][`${rewardId}`];
                    leaderBoardCampaignTotalPoints += userActivitys['leaderBoardCampaignTotalPoints'] || 0;
                    requiredActivitiesComplete += userActivitys['requiredActivitiesComplete'] || 0;
                    dsahboardPointSliderData = userActivitys['dsahboardPointSliderData'] || [];
                    totalActivityRequiredPoints += userActivitys['totalActivityRequiredPoints'] || 0;
                    totalActivityCompletedPoints += userActivitys['totalActivityCompletedPoints'] || 0;
                }
                if((call_from == 1 || call_from == 2 || call_from == 9) && spouseShow == 1){
                    if(rewData['spouseActivity'] && rewData['spouseActivity']?.length > 0){
                        const index = commonDatas.findIndex(obj => 'required_by_user' in obj);
                        if (index !== -1) {
                            commonDatas[index].required_by_user = required_by_spouse;
                        }
                        let spouseActivitys = await this.getSummaryDatas('spouse',JSON.parse(JSON.stringify(rewData)), returnFinalData, rewData['spouseActivity'], commonDatas);
                        if(spouseActivitys && Object.keys(spouseActivitys)?.length > 0){
                            returnFinalData[`${rewardId}`] = spouseActivitys['returnFinalData'][`${rewardId}`];
                            dsahboardSPointSliderData = spouseActivitys['dsahboardSPointSliderData'] || [];
                        }
                    }
                }
            }
            if((sliderSetting && sliderSetting['hide'] && sliderSetting['hide'] == 1 && emableWidgetListData?.currentpoint == 1) && call_from == 5){ /* For App Reward List according campaign */
                returnFinalData['dsahboardPointSliderData'] = dsahboardPointSliderData;
                returnFinalData['dsahboardSPointSliderData'] = dsahboardSPointSliderData;
                returnFinalData['requiredActivityCompleted'] = requiredActivitiesComplete;
                returnFinalData['totalActivityRequiredPoints'] = totalActivityRequiredPoints;
                returnFinalData['totalActivityCompletedPoints'] = totalActivityCompletedPoints;
            }
            return returnFinalData;
        }catch (error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang,error.message));
        }
    }

    async getSummaryDatas(type, rewData, returnFinalData, activityData = [],commonDatas : any = {}){
        let {
            orgId = null,
            campaignId = null,
            rewardId = null,
            call_from = null,
            call_for = null,
            userId = null,
            required_by_user = null,
            OptionalLabel = null,
            isCampaignEligible = null,
            isSpouseCampaignEligible = null,
            req = {},
            sliderSetting = null,
            formInstructionData = {},
            requiredActivitiesComplete = 0,
            leaderboardCampId = null,
            leaderBoardCampaignTotalPoints = 0,
            emableWidgetListData = {},
            dsahboardPointSliderData = [],
            dsahboardSPointSliderData = []
        } = Object.assign({}, ...commonDatas);
        let rewardKey = 'userReward';
        let activityKey = 'userActivitys';
        let currentPointKey = 'currentPoints';
        if(type == 'spouse'){
            isCampaignEligible = isSpouseCampaignEligible;
            rewardKey = 'spouseReward';
            activityKey = 'spouseActivitys';
            currentPointKey = 'spousecurrentPoints';
        }
        let totalActivityRequiredPoints = 0;
        let totalActivityCompletedPoints = 0;
        if(activityData && activityData?.length > 0){
            let totalPointReq = 0;
            let totalPointEarnd = 0;
            let totalactvtyPoints = 0;
            let requiredUser = [];
            let OptionalUser = [];
            let ComprequiredUser = [];
            let CompOptionalUser = [];
            let requiredUserActivitiesComplete = 0;
            if(type == 'user'){
                requiredActivitiesComplete += requiredUserActivitiesComplete;
            }
            for(let userAData of activityData){
                let complete = true;
                let chComplete = false;
                const campActId = userAData['id'];
                const actId = userAData['axtivity_id'];
                const catId = userAData['category_id'];
                const maxPoints = (typeof userAData['max_point'] === 'string') ? parseFloat(userAData['max_point']) : userAData['max_point'];
                let actPoints = (typeof userAData['Point'] === 'string') ? parseFloat(userAData['Point']) : userAData['Point'];
                let quentity = (typeof userAData['quentity'] === 'string') ? parseFloat(userAData['quentity']) : userAData['quentity'];
                quentity = isNaN(quentity) ? 1 : quentity;
                if(quentity == 0 || quentity == ''){
                    quentity = 1;
                }
                let point_for_each = (typeof userAData['point_for_each'] === 'string') ? parseFloat(userAData['point_for_each']) : userAData['point_for_each'];
                point_for_each = isNaN(point_for_each) ? 0 : point_for_each;
                let alt_act_point = (typeof userAData['alt_act_point'] === 'string') ? parseFloat(userAData['alt_act_point']) : userAData['alt_act_point'];
                alt_act_point = isNaN(alt_act_point) ? 0 : alt_act_point;
                let pointE:any = 0;
                let typeLabel = '';
                let typeLabelOriginal = '';
                let earnPointText = '';
                let actName = '';
                let actDescription = '';
                if(userAData['isDefine'] == 1 || userAData['isDefine'] == 3){
                    totalPointReq += maxPoints;
                    totalActivityRequiredPoints += (quentity * point_for_each);
                    if (maxPoints < actPoints) {
                        userAData['Point'] = maxPoints;
                        actPoints = (typeof userAData['Point'] === 'string') ? parseFloat(userAData['Point']) : userAData['Point'];
                    }
                    pointE = actPoints;
                    if (userAData['altActivity']) {
                        totalPointReq += userAData['alt_act_point'];
                        totalActivityRequiredPoints += userAData['alt_act_point'];
                        if (userAData['alt_act_point'] < userAData['altActivity']['Point']) {
                            userAData['altActivity']['Point'] = userAData['alt_act_point'];
                        }
                        pointE += userAData['altActivity']['Point'];
                    }
                    if (pointE > maxPoints) {
                        pointE = maxPoints;
                    }
                    totalPointEarnd += (typeof pointE === 'string') ? parseFloat(pointE) : pointE;
                    if(userAData['isDefine'] == 1){
                        totalactvtyPoints += (typeof pointE === 'string') ? parseFloat(pointE) : pointE;
                    }
                    if (userAData['altActivity']) {
                        if (((quentity * point_for_each) > actPoints && userAData[required_by_user] == 'Y') && (alt_act_point > userAData['altActivity']['Point'])) {
                            complete = false;
                        }
                        if (((quentity * point_for_each) <= actPoints && userAData[required_by_user] == 'Y') && (alt_act_point <= userAData['altActivity']['Point'])) {
                            requiredUserActivitiesComplete += 1;
                        }
                        if (((quentity * point_for_each) <= actPoints) && (alt_act_point <= userAData['altActivity']['Point'])) {
                            totalActivityCompletedPoints += (quentity * point_for_each);
                        }
                    } else {
                        if ((quentity * point_for_each) > actPoints && userAData[required_by_user] == 'Y') {
                            complete = false;
                        }
                        if ((quentity * point_for_each) <= actPoints && userAData[required_by_user] == 'Y') {
                            requiredUserActivitiesComplete += 1;
                        }
                        if ((quentity * point_for_each) <= actPoints) {
                            totalActivityCompletedPoints += (quentity * point_for_each);
                        }
                    }
                    
                    if ((orgId == 468 || orgId == 652) && isCampaignEligible == 0 && rewData['user_eligible'] == 1) {
                        typeLabel = await this.translatorService.frontendReadTranslation(req.lang,`${OptionalLabel}`, `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                        typeLabelOriginal = OptionalLabel;
                    } else {
                        if (userAData[required_by_user] == 'Y') {
                            typeLabel = await this.translatorService.frontendReadTranslation(req.lang,'Required', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                            typeLabelOriginal = 'Required';
                        } else {
                            typeLabel = await this.translatorService.frontendReadTranslation(req.lang,`${OptionalLabel}`, `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                            typeLabelOriginal = OptionalLabel;
                        }
                    }
                    if(userAData['isDefine'] == 1){
                        if (pointE >= userAData['max_point'] && userAData['is_display_status'] == 1) {
                            if (pointE > 0) {
                                earnPointText =  await this.translatorService.frontendReadTranslation(req.lang,'Completed', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                            } else {
                                earnPointText = await this.translatorService.frontendReadTranslation(req.lang,'Incomplete', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                            }
                        } else {
                            if (pointE > 0 && userAData['is_display_status'] == 1) {
                                earnPointText =  await this.translatorService.frontendReadTranslation(req.lang,'On Track', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                            } else {
                                earnPointText =  pointE;
                            }
                        }
                        actName = await this.translatorService.frontendReadTranslation(req.lang,`activity_name_${campaignId}_${rewardId}_${campActId}`, `/LC_MESSAGES/Campaign/Campaigns/${orgId}/${campaignId}`,`dynamic`);
                        if(userAData['cust_name'] && userAData['cust_name'] != ''){
                            actName = (actName == '' || actName == `activity_name_${campaignId}_${rewardId}_${campActId}`) ? userAData['cust_name'] : actName;
                        }else{
                            actName = (actName == '' || actName == `activity_name_${campaignId}_${rewardId}_${campActId}`) ? userAData?.['activity']?.['activity_name'] : actName;
                        }
                        if(userAData['cust_description'] && userAData['cust_description'] != ''){
                            actDescription = await this.translatorService.frontendReadTranslation(req.lang,`activity_desc_${campaignId}_${rewardId}_${campActId}`, `/LC_MESSAGES/Campaign/Campaigns/${orgId}/${campaignId}`,`dynamic`);
                            actDescription = (actDescription == '' || actDescription == `activity_desc_${campaignId}_${rewardId}_${campActId}`) ? userAData['cust_description'] : actDescription;
                        }else{
                            //actDescription = userAData?.['activity']?.['description'];
                        }
                        actDescription = await this.urlManageService.onmapUrlContent(actDescription);
                        if (userAData[required_by_user] === "Y") {
                            if(userAData['activityCompAry'] && Object.keys(userAData['activityCompAry'])?.length > 0){
                                requiredUser.push(userAData['activityCompAry']);
                            }
                            if(userAData['rewardCompAry'] && Object.keys(userAData['rewardCompAry'])?.length > 0){
                                ComprequiredUser.push(userAData['rewardCompAry']);
                            }
                        } else {
                            if(userAData['activityCompAry'] && Object.keys(userAData['activityCompAry'])?.length > 0){
                                OptionalUser.push(userAData['activityCompAry']);
                            }
                            if(Object.keys(userAData['rewardCompAry'])?.length > 0){
                                CompOptionalUser.push(userAData['rewardCompAry']);
                            }
                        }
                    }else{
                        earnPointText =  pointE;
                        if(userAData['cust_name'] && userAData['cust_name'] != ''){
                            actName = await this.translatorService.frontendReadTranslation(req.lang,`category_name_${campaignId}_${rewardId}_${campActId}`, `/LC_MESSAGES/Campaign/Campaigns/${orgId}/${campaignId}`,`dynamic`);
                            actName = (actName == '' || actName == `category_name_${campaignId}_${rewardId}_${campActId}`) ? userAData['cust_name'] : actName;
                        }else{
                            actName = await this.translatorService.frontendReadTranslation(req.lang,`category_name_${catId}`, `/LC_MESSAGES/Campaign/Category/${catId}`,`dynamic`);
                            actName = (actName == '' || actName == `category_name_${catId}`) ? userAData?.['category']?.['category_name'] : actName;
                        }
                        if(userAData['cust_description'] && userAData['cust_description'] != ''){
                            actDescription = await this.translatorService.frontendReadTranslation(req.lang,`category_name_${campaignId}_${rewardId}_${campActId}`, `/LC_MESSAGES/Campaign/Campaigns/${orgId}/${campaignId}`,`dynamic`);
                            actDescription = (actDescription == '' || actDescription == `category_name_${campaignId}_${rewardId}_${campActId}`) ? userAData['cust_description'] : actDescription;
                        }else{
                            actDescription = await this.translatorService.frontendReadTranslation(req.lang,`category_name_${userAData?.['category']?.['id']}`, `/LC_MESSAGES/Campaign/Category/${userAData?.['category']?.['id']}`,`dynamic`);
                            actDescription = (actDescription == '' || actDescription == `category_name_${userAData?.['category']?.['id']}`) ? userAData?.['category']?.['description'] : actDescription;
                        }
                    }
                }else{
                    totalActivityRequiredPoints += 1;
                    if (userAData['complete'] == '1') {
                        chComplete = true;
                    } else {
                        chComplete = false;
                        complete = false;
                    }
                    if (userAData['reward_for'] != "") {
                        if (userAData['reward_for'] == '1') {
                            typeLabel = await this.translatorService.frontendReadTranslation(req.lang,'On Registration Of The Challenge', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                            typeLabelOriginal = 'On Registration Of The Challenge';
                        } else {
                            typeLabel = await this.translatorService.frontendReadTranslation(req.lang,'On Completion Of The Challenge', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                            typeLabelOriginal = 'On Completion Of The Challenge';
                        }
                    } else {
                        typeLabel = await this.translatorService.frontendReadTranslation(req.lang,'On Registration Of The Challenge', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                        typeLabelOriginal = 'On Registration Of The Challenge';
                    }
                    if (chComplete) {
                        requiredUserActivitiesComplete++;
                        totalActivityCompletedPoints += 1;
                        earnPointText = await this.translatorService.frontendReadTranslation(req.lang,'Completed', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                    } else {
                        earnPointText = await this.translatorService.frontendReadTranslation(req.lang,'Pending', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                    }
                    const scCId = userAData['challenge_schedule_id'];
                    const cId = userAData['challenge_id'];
                    if(userAData?.['sc']?.['custom_cname'] && userAData?.['sc']?.['custom_cname'] != ''){
                        actName = await this.translatorService.frontendReadTranslation(req.lang,`custom_cname_${scCId}`, `/LC_MESSAGES/Challenge/MyChallenges/${orgId}/${scCId}`,`dynamic`);
                        actName = (actName == '' || actName == `custom_cname_${scCId}`) ? userAData['sc']['custom_cname'] : actName;
                    }else{
                        actName = await this.translatorService.frontendReadTranslation(req.lang,`challenge_name_${cId}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${cId}`,`dynamic`);
                        actName = (actName == '' || actName == `challenge_name_${cId}`) ? userAData['ch']['challenge_name'] : actName;
                    }
                    if(userAData?.['sc']?.['custom_desc'] && userAData?.['sc']?.['custom_desc'] != ''){
                        actDescription = await this.translatorService.frontendReadTranslation(req.lang,`custom_desc_${scCId}`, `/LC_MESSAGES/Challenge/MyChallenges/${orgId}/${scCId}`,`dynamic`);
                        actDescription = (actDescription == '' || actDescription == `custom_desc_${scCId}`) ? userAData['sc']['custom_desc'] : actDescription;
                    }else{
                        actDescription = await this.translatorService.frontendReadTranslation(req.lang,`challenge_desc_${cId}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${cId}`,`dynamic`);
                        actDescription = (actDescription == '' || actDescription == `challenge_desc_${cId}`) ? userAData['ch']['challenge_desc'] : actDescription;
                    }
                    if(Object.keys(userAData['activityCompAry'])?.length > 0){
                        OptionalUser.push(userAData['activityCompAry']);
                    }
                    if(Object.keys(userAData['rewardCompAry'])?.length > 0){
                        CompOptionalUser.push(userAData['rewardCompAry']);
                    }
                }
                let oid = '';
                if (userAData['order_id'] != "" && userAData['order_id'] != 0) {
                    oid = userAData['order_id'];
                }
                let ReqBy = "N";
                if (userAData['required_by_user'] == "Y" || userAData['required_by_user'] == "Y") {
                    ReqBy = "Y";
                }
                let dateorder:any = "";
                if (userAData['end_date'] != "" && userAData['end_date'] != 0) {
                    dateorder = await this.commonDateService.DateTimeFormat(userAData['end_date'], 'timestamp');
                }
                if(!returnFinalData[`${rewardId}`][`${activityKey}`]){
                    returnFinalData[`${rewardId}`][`${activityKey}`] = {};
                }
                if(!returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]){
                    returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`] = {};
                }
                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['id'] = campActId;
                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['activity_name'] = actName;
                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['activity_description'] = (actDescription != '') ? actDescription : '';
                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['order'] = userAData['order_id'];
                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['isDefine'] = userAData['isDefine'];
                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['startDate'] = await this.commonDateService.DateTimeFormat(userAData['start_date'], 'MM/DD/YYYY');
                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['endDate'] = await this.commonDateService.DateTimeFormat(userAData['end_date'], 'MM/DD/YYYY');
                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['type'] = typeLabel;
                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['type_original'] = typeLabelOriginal;
                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['pointForEach'] = parseFloat(userAData['point_for_each']);
                if(userAData['isDefine'] == 1 || userAData['isDefine'] == 3){
                    returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['maxPoints'] = parseFloat(userAData['max_point']);
                }else{
                    returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['maxPoints'] = parseFloat(userAData['point']);
                }
                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['earnPoints'] = earnPointText;
                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['completionDate'] = (userAData['date'] != '' && userAData['date'] != undefined) ? await this.commonDateService.DateTimeFormat(userAData['date'], 'MM/DD/YYYY') : '';
                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['oid'] = oid;
                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['ReqBy'] = ReqBy;
                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['dateorder'] = dateorder;
                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['opentype'] = userAData['opentype'];
                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['openinternal'] = userAData['openinternal'];
                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['openexternal'] = userAData['openexternal'];
                let generateLinkForActivitys = await this.frontPointsForService.generateLinkForActivitys(userAData, formInstructionData, rewData['hire_date'], req);
                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['path'] = generateLinkForActivitys || '';
                let dashStatus = await this.translatorService.frontendReadTranslation(req.lang,'Incomplete', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                if(call_from == 1){
                    if(userAData['isDefine'] == 1){
                        if((quentity * point_for_each) <= actPoints){
                            if(sliderSetting && sliderSetting['hide'] && sliderSetting['hide'] == 1 && rewData['is_display_status'] != 1 && userAData['is_display_status'] != 1){
                                dashStatus = await this.translatorService.frontendReadTranslation(req.lang,'Point', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                                if(actPoints > 1){
                                    dashStatus = await this.translatorService.frontendReadTranslation(req.lang,'Points', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                                }
                                dashStatus = actPoints + ' '+ dashStatus;
                            } else {
                                dashStatus = await this.translatorService.frontendReadTranslation(req.lang,'Completed', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                            }
                        }else if(actPoints > 0){
                            if(sliderSetting && sliderSetting['hide'] && sliderSetting['hide'] == 1 && rewData['is_display_status'] != 1 && userAData['is_display_status'] != 1){
                                dashStatus = await this.translatorService.frontendReadTranslation(req.lang,'Point', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                                if(actPoints > 1){
                                    dashStatus = await this.translatorService.frontendReadTranslation(req.lang,'Points', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                                }
                                dashStatus = actPoints + ' '+ dashStatus;
                            } else {
                                dashStatus = await this.translatorService.frontendReadTranslation(req.lang,'On Track', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                            }
                        }
                        
                        if(leaderboardCampId == campaignId){
                            leaderBoardCampaignTotalPoints += actPoints; 
                        }
                    }else if(userAData['isDefine'] == 3){
                        if((quentity * point_for_each) <= actPoints){
                            if(sliderSetting && sliderSetting['hide'] && sliderSetting['hide'] == 1 && rewData['is_display_status'] != 1){
                                dashStatus = await this.translatorService.frontendReadTranslation(req.lang,'Point', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                                if(actPoints > 1){
                                    dashStatus = await this.translatorService.frontendReadTranslation(req.lang,'Points', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                                }
                                dashStatus = actPoints + ' '+ dashStatus;
                            } else {
                                dashStatus = await this.translatorService.frontendReadTranslation(req.lang,'Completed', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                            }
                        }else if(actPoints > 0){
                            if(sliderSetting && sliderSetting['hide'] && sliderSetting['hide'] == 1 && rewData['is_display_status'] != 1){
                                dashStatus = await this.translatorService.frontendReadTranslation(req.lang,'Point', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                                if(actPoints > 1){
                                    dashStatus = await this.translatorService.frontendReadTranslation(req.lang,'Points', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                                }
                                dashStatus = actPoints + ' '+ dashStatus;
                            } else {
                                dashStatus = await this.translatorService.frontendReadTranslation(req.lang,'On Track', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                            }
                        }
                        if(leaderboardCampId == campaignId){
                            leaderBoardCampaignTotalPoints += actPoints; 
                        }
                    }else{
                        if(userAData['complete'] == 1){
                            dashStatus = await this.translatorService.frontendReadTranslation(req.lang,'Completed', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                        }
                    }
                    returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['status'] = dashStatus;
                }
                /* Category Activity Set */
                    if(userAData['isDefine'] == 3){ 
                        let completeCategoryAct = 0;
                        if(userAData?.['activity'] && userAData['activity'].length > 0){
                            for(let userCAData of userAData['activity']){
                                const campCActId = userCAData['id'];
                                let complete = true;
                                
                                const caMaxPoints = (typeof userCAData['max_point'] === 'string') ? parseFloat(userCAData['max_point']) : userCAData['max_point'];
                                let cActPoints = (typeof userCAData['Point'] === 'string') ? parseFloat(userCAData['Point']) : userCAData['Point'];
                                const caQuentity = (typeof userCAData['quentity'] === 'string') ? parseFloat(userCAData['quentity']) : userCAData['quentity'];
                                const caPoint_for_each = (typeof userCAData['point_for_each'] === 'string') ? parseFloat(userCAData['point_for_each']) : userCAData['point_for_each'];
                                const caAlt_act_point = (typeof userCAData['alt_act_point'] === 'string') ? parseFloat(userCAData['alt_act_point']) : userCAData['alt_act_point'];
                                totalActivityRequiredPoints += (caQuentity * caPoint_for_each);
                                if (userCAData['Point'] && caMaxPoints <= cActPoints) {
                                    userCAData['Point'] = caMaxPoints;
                                } else {
                                    if (!userCAData['Point']) {
                                        userCAData['Point'] = 0;
                                    }
                                }
                                cActPoints = (typeof userCAData['Point'] === 'string') ? parseFloat(userCAData['Point']) : userCAData['Point'];
                                let caPointE = cActPoints;
                                if (userCAData['altActivity']) {
                                    totalPointReq += caAlt_act_point;
                                    totalActivityRequiredPoints += caAlt_act_point;
                                    if (caAlt_act_point < userCAData['altActivity']['Point']) {
                                        userCAData['altActivity']['Point'] = caAlt_act_point;
                                    }
                                    caPointE += userCAData['altActivity']['Point'];
                                }
                                if (caPointE > caMaxPoints) {
                                    caPointE = caMaxPoints;
                                }
                                totalactvtyPoints += (typeof caPointE === 'string') ? parseFloat(caPointE) : caPointE;
                                if (userCAData['altActivity']) {
                                    if (((caQuentity * caPoint_for_each) > cActPoints && userCAData[required_by_user] == 'Y') && (caAlt_act_point > userCAData['altActivity']['Point'])) {
                                        complete = false;
                                    }
                                    if (((caQuentity * caPoint_for_each) <= cActPoints && userCAData[required_by_user] == 'Y') && (caAlt_act_point <= userCAData['altActivity']['Point'])) {
                                        requiredUserActivitiesComplete += 1;
                                        completeCategoryAct += 1;
                                    }
                                    if (((caQuentity * caPoint_for_each) <= cActPoints) && (caAlt_act_point <= userCAData['altActivity']['Point'])) {
                                        totalActivityCompletedPoints += (caQuentity * caPoint_for_each);
                                    }
                                } else {
                                    if ((caQuentity * caPoint_for_each) > cActPoints && userCAData[required_by_user] == 'Y') {
                                        complete = false;
                                    }
                                    if ((caQuentity * caPoint_for_each) <= cActPoints && userCAData[required_by_user] == 'Y') {
                                        requiredUserActivitiesComplete += 1;
                                        completeCategoryAct += 1;
                                    }
                                    if ((caQuentity * caPoint_for_each) <= cActPoints) {
                                        totalActivityCompletedPoints += (caQuentity * caPoint_for_each);
                                    }
                                }
                                let actNameC = '';
                                actNameC = await this.translatorService.frontendReadTranslation(req.lang,`activity_name_${campaignId}_${rewardId}_${campCActId}`, `/LC_MESSAGES/Campaign/Campaigns/${orgId}/${campaignId}`,`dynamic`);
                                if(userCAData['cust_name'] && userCAData['cust_name'] != ''){
                                    actNameC = (actNameC == '' || actNameC == `activity_name_${campaignId}_${rewardId}_${campCActId}`) ? userCAData['cust_name'] : actNameC;
                                }else{
                                    actNameC = (actNameC == '' || actNameC == `activity_name_${campaignId}_${rewardId}_${campCActId}`) ? userCAData?.['activity']?.['activity_name'] : actNameC;
                                }
                                let actDescriptionC = '';
                                if(userCAData['cust_description'] && userCAData['cust_description'] != ''){
                                    actDescriptionC = await this.translatorService.frontendReadTranslation(req.lang,`activity_desc_${campaignId}_${rewardId}_${campCActId}`, `/LC_MESSAGES/Campaign/Campaigns/${orgId}/${campaignId}`,`dynamic`);
                                    actDescriptionC = (actDescriptionC == '' || actDescriptionC == `activity_desc_${campaignId}_${rewardId}_${campCActId}`) ? userCAData['cust_description'] : actDescriptionC;
                                }else{
                                    //actDescriptionC = userAData?.['activity']?.['description'];
                                }
                                actDescriptionC = await this.urlManageService.onmapUrlContent(actDescriptionC);
                                if (userCAData[required_by_user] === "Y") {
                                    if(Object.keys(userCAData['activityCompAry'])?.length > 0){
                                        requiredUser.push(userCAData['activityCompAry']);
                                    }
                                    if(Object.keys(userCAData['rewardCompAry'])?.length > 0){
                                        ComprequiredUser.push(userCAData['rewardCompAry']);
                                    }
                                } else {
                                    if(Object.keys(userCAData['activityCompAry'])?.length > 0){
                                        OptionalUser.push(userCAData['activityCompAry']);
                                    }
                                    if(Object.keys(userCAData['rewardCompAry'])?.length > 0){
                                        CompOptionalUser.push(userCAData['rewardCompAry']);
                                    }
                                }
                                if(!returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['activitys']){
                                    returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['activitys'] = {};
                                }
                                if(!returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['activitys'][`${campCActId}`]){
                                    returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['activitys'][`${campCActId}`] = {};
                                }
                                let typeLabelC = '';
                                let typeLabelOriginalC = '';
                                if ((orgId == 468 || orgId == 652) && isCampaignEligible == 0 && rewData['user_eligible'] == 1) {
                                    typeLabelC = await this.translatorService.frontendReadTranslation(req.lang,`${OptionalLabel}`, `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                                    typeLabelOriginalC = OptionalLabel;
                                } else {
                                    if (userCAData[required_by_user] == 'Y') {
                                        typeLabelC = await this.translatorService.frontendReadTranslation(req.lang,'Required', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                                        typeLabelOriginalC = 'Required';
                                    } else {
                                        typeLabelC = await this.translatorService.frontendReadTranslation(req.lang,`${OptionalLabel}`, `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                                        typeLabelOriginalC = OptionalLabel;
                                    }
                                }
                                let earnPointTextC = '';
                                if (caPointE >= userCAData['max_point'] && userCAData['is_display_status'] == 1) {
                                    if (caPointE > 0) {
                                        earnPointTextC =  await this.translatorService.frontendReadTranslation(req.lang,'Completed', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                                    } else {
                                        earnPointTextC = await this.translatorService.frontendReadTranslation(req.lang,'Incomplete', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                                    }
                                } else {
                                    if (caPointE > 0 && userCAData['is_display_status'] == 1) {
                                        earnPointTextC =  await this.translatorService.frontendReadTranslation(req.lang,'On Track', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                                    } else {
                                        earnPointTextC =  caPointE;
                                    }
                                }
                                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['activitys'][`${campCActId}`]['id'] = campCActId;
                                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['activitys'][`${campCActId}`]['activity_name'] = actNameC;
                                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['activitys'][`${campCActId}`]['activity_description'] = actDescriptionC;
                                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['activitys'][`${campCActId}`]['order'] = userCAData['order_id'];
                                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['activitys'][`${campCActId}`]['isDefine'] = userCAData['isDefine'];
                                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['activitys'][`${campCActId}`]['startDate'] = await this.commonDateService.DateTimeFormat(userCAData['start_date'], 'MM/DD/YYYY');
                                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['activitys'][`${campCActId}`]['endDate'] = await this.commonDateService.DateTimeFormat(userCAData['end_date'], 'MM/DD/YYYY');
                                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['activitys'][`${campCActId}`]['type'] = typeLabelC;
                                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['activitys'][`${campCActId}`]['type_original'] = typeLabelOriginalC;
                                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['activitys'][`${campCActId}`]['pointForEach'] = parseFloat(userCAData['point_for_each']);
                                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['activitys'][`${campCActId}`]['maxPoints'] = parseFloat(userCAData['max_point']);
                                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['activitys'][`${campCActId}`]['earnPoints'] = earnPointTextC;
                                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['activitys'][`${campCActId}`]['completionDate'] = (userCAData['date'] != '' && userCAData['date'] != undefined) ? await this.commonDateService.DateTimeFormat(userCAData['date'], 'MM/DD/YYYY') : '';
                                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['activitys'][`${campCActId}`]['opentype'] = userCAData['opentype'];
                                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['activitys'][`${campCActId}`]['openinternal'] = userCAData['openinternal'];
                                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['activitys'][`${campCActId}`]['openexternal'] = userCAData['openexternal'];
                                let generateLinkForActivitys = await this.frontPointsForService.generateLinkForActivitys(userCAData, formInstructionData, rewData['hire_date'], req);
                                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['activitys'][`${campCActId}`]['path'] = generateLinkForActivitys || '';
                            }
                        }
                        if(call_from == 1){
                            if(sliderSetting && sliderSetting['hide'] && sliderSetting['hide'] == 1 && rewData['is_display_status'] != 1){
                            }else{
                                dashStatus = completeCategoryAct +' '+ await this.translatorService.frontendReadTranslation(req.lang,'Completed', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                                returnFinalData[`${rewardId}`][`${activityKey}`][`${campActId}`]['status'] = dashStatus;
                            }
                        }
                    }
                /* Category Activity Set */
                /* User Activity Order Assending */
                    let userActivitys = Object.values(returnFinalData[`${rewardId}`][`${activityKey}`]);
                    returnFinalData[`${rewardId}`][`${activityKey}`] = await this.sortingService.sortCampaignData('asc', userActivitys, 'order', 'id');
                    returnFinalData[`${rewardId}`][`${activityKey}`] = await Promise.all(returnFinalData[`${rewardId}`][`${activityKey}`].map(async activity => {
                        if (activity?.activitys) {
                            const sortedActivitiesArray = await this.sortingService.sortCampaignData('asc', Object.values(activity.activitys), 'order', 'id');
                            return {
                            ...activity,
                            activitys: sortedActivitiesArray
                            };
                        }
                        return activity;
                    }));
                /* User Activity Order Assending */
            }
            if(call_from == 1 || call_from == 2 || call_from == 9){
                let requiredItemStatus = await this.translatorService.frontendReadTranslation(req.lang, 'Incomplete', `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`);
                if(requiredUserActivitiesComplete == rewData['RequiredActivities']){
                    requiredItemStatus = await this.translatorService.frontendReadTranslation(req.lang, 'Completed', `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`);
                }
                if(!returnFinalData[`${rewardId}`][`${rewardKey}`]){
                    returnFinalData[`${rewardId}`][`${rewardKey}`] = {};
                }
                returnFinalData[`${rewardId}`][`${rewardKey}`]['requiredItemStatus'] = requiredItemStatus;
                returnFinalData[`${rewardId}`][`${rewardKey}`]['totalPointEarned'] = totalPointEarnd;
                let requiredUserMaxDate: number | undefined;
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
                let ComprequiredUserMaxDate: number | undefined;
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
                if(rewData['InsReward'] && rewData['InsReward']?.length > 0){
                    for(let insData of rewData['InsReward']){
                        if(!insData['point']){
                            insData['point'] = 0;
                        }
                        if (required_by_user == 'required_by_user') {
                            insData['point'] = insData['point_user'];
                        } else {
                            insData['point'] = insData['point_spouse'];
                        }
                    }
                }
                if(rewData['cashReward'] && rewData['cashReward']?.length > 0){
                    for(let cashData of rewData['cashReward']){
                        if(!cashData['point']){
                            cashData['point'] = 0;
                        }
                        if (required_by_user == 'required_by_user') {
                            cashData['point'] = cashData['point_user'];
                        } else {
                            cashData['point'] = cashData['point_spouse'];
                        }
                    }
                }
                let finalSubRewardArray = [
                    ...rewData['InsReward'],
                    ...rewData['cashReward'],
                    ...rewData['otherReward'],
                ];
                finalSubRewardArray = await this.sortingService.sortCampaignData('asc', finalSubRewardArray, 'order_id', 'id');
                if(finalSubRewardArray && finalSubRewardArray?.length > 0){
                    for(let subRewData of finalSubRewardArray){
                        let subRewardsIds = subRewData['id'];
                        let reqPoint = subRewData['point'];
                        if (reqPoint == "" || isNaN(reqPoint)) {
                            reqPoint = 0;
                        }
                        let eligible = 'No';
                        if (reqPoint != 0 || ((subRewData['max_point_limit'] == 1 && totalactvtyPoints != 0) || (subRewData['max_point_limit'] == 0 && totalPointEarnd != 0))) {
                            if (subRewData['max_point_limit'] == 1) {
                                if (totalactvtyPoints >= reqPoint && (requiredUserActivitiesComplete == rewData['RequiredActivities'] || subRewData['consider_require'] == 0)) {
                                    eligible = 'Yes';
                                }
                            } else {
                                if (totalPointEarnd >= reqPoint && (requiredUserActivitiesComplete == rewData['RequiredActivities'] || subRewData['consider_require'] == 0)) {
                                    eligible = 'Yes';
                                }
                            }
                        }
                        let rewardComDate = '';
                        if (userPointArray && Object.keys(userPointArray).length > 0) {
                            let rewardWiseTotal = 0;
                            let countiounR = false;
                            for (const [key, value] of Object.entries(userPointArray)) {
                                rewardWiseTotal += value as number;
                                if (rewardWiseTotal >= reqPoint && !countiounR) {
                                    const keyDate:any = await this.commonDateService.DateTimeFormat(key,'timestamp','DD-MM-YYYY'); // Parse the date key using moment.js
                                    if ((requiredUserMaxDate != undefined && typeof requiredUserMaxDate === 'number' && typeof keyDate === 'number') && requiredUserMaxDate >= keyDate && subRewData['consider_require'] === 1) {
                                        rewardComDate = moment.unix(requiredUserMaxDate).utc().format('MM/DD/YYYY');
                                    } else {
                                        rewardComDate = moment.unix(keyDate).utc().format('MM/DD/YYYY');
                                    }
                                    countiounR = true; // Stop further iterations once the condition is met
                                }
                            }
                        }
                        let ComprewardComDate = '';
                        if (CompUserPointArray && Object.keys(CompUserPointArray).length > 0) {
                            let rewardCompWiseTotal = 0;
                            let countiounRComp = false;
                            for (const [key, value] of Object.entries(CompUserPointArray)) {
                                rewardCompWiseTotal += value as number;
                                if (rewardCompWiseTotal >= reqPoint && !countiounRComp) {
                                    const keyDate:any = await this.commonDateService.DateTimeFormat(key,'timestamp','DD-MM-YYYY'); // Parse the date key using moment.js
                                    if (ComprequiredUserMaxDate != undefined && typeof ComprequiredUserMaxDate === 'number' && typeof keyDate === 'number' && ComprequiredUserMaxDate >= keyDate && subRewData['consider_require'] === 1) {
                                        ComprewardComDate = moment.unix(ComprequiredUserMaxDate).utc().format('MM/DD/YYYY');
                                    } else {
                                        ComprewardComDate = moment.unix(keyDate).utc().format('MM/DD/YYYY');
                                    }
                                    countiounRComp = true; // Stop further iterations once the condition is met
                                }
                            }
                        }
                        if (ComprewardComDate == '') {
                            ComprewardComDate = rewardComDate;
                        }
                        if(!returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards']){
                            returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'] = {};
                        }
                        if(!returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'][`"${subRewardsIds}"`]){
                            returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'][`"${subRewardsIds}"`] = {};
                        }
                        let nameRightText = '';
                        if (subRewData['max_point_limit'] == 1) {
                            nameRightText = await this.translatorService.frontendReadTranslation(req.lang, 'Total Activity Points', `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`)+' - '+ totalactvtyPoints;
                        }
                        if(!returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'][`"${subRewardsIds}"`]['row1']){
                            returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'][`"${subRewardsIds}"`]['row1'] = {};
                        }
                        if(!returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'][`"${subRewardsIds}"`]['row2']){
                            returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'][`"${subRewardsIds}"`]['row2'] = {};
                        }
                        if(!returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'][`"${subRewardsIds}"`]['row3']){
                            returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'][`"${subRewardsIds}"`]['row3'] = {};
                        }
                        if(!returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'][`"${subRewardsIds}"`]['row4']){
                            returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'][`"${subRewardsIds}"`]['row4'] = {};
                        }
                        if(!returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'][`"${subRewardsIds}"`]['row5']){
                            returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'][`"${subRewardsIds}"`]['row5'] = {};
                        }
                        returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'][`"${subRewardsIds}"`]['row1']['leftText'] = subRewData['name'];
                        returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'][`"${subRewardsIds}"`]['row1']['rightText'] = nameRightText;
                        returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'][`"${subRewardsIds}"`]['row2']['leftText'] = await this.translatorService.frontendReadTranslation(req.lang, 'Total Points Required', `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`);
                        returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'][`"${subRewardsIds}"`]['row2']['rightText'] = (typeof reqPoint === 'string') ? parseFloat(reqPoint) : reqPoint;
                        returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'][`"${subRewardsIds}"`]['row3']['leftText'] = await this.translatorService.frontendReadTranslation(req.lang, 'Completed All Requirements', `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`);
                        returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'][`"${subRewardsIds}"`]['row3']['rightText'] = await this.translatorService.frontendReadTranslation(req.lang, `${eligible}`, `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`);
                        if(eligible == 'Yes'){
                            if(rewardComDate != ''){
                                returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'][`"${subRewardsIds}"`]['row4']['leftText'] = await this.translatorService.frontendReadTranslation(req.lang, 'Incentive Completion Date', `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`);
                                returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'][`"${subRewardsIds}"`]['row4']['rightText'] = (rewardComDate != '') ? rewardComDate : '';
                            }
                            if(ComprewardComDate != ''){
                                returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'][`"${subRewardsIds}"`]['row5']['leftText'] = await this.translatorService.frontendReadTranslation(req.lang, 'Incentive Completion Date Based on Submissions', `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`);
                                returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'][`"${subRewardsIds}"`]['row5']['rightText'] = (ComprewardComDate != '') ? ComprewardComDate : '';
                            }
                        }
                        returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'] = Object.values(returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards']);
                    }
                }else{
                    returnFinalData[`${rewardId}`][`${rewardKey}`]['rewards'] = await this.translatorService.frontendReadTranslation(req.lang, 'No Additional Rewards Defined Yet! Please Check Back Soon', `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`);
                }
            }
            /* Point Slider */
            if((call_from == 1 || call_from == 5) && (sliderSetting && sliderSetting['hide'] && sliderSetting['hide'] == 1 && (!emableWidgetListData.currentpoint || emableWidgetListData.currentpoint == 1))){
                if(rewData['InsReward'] && rewData['InsReward']?.length > 0){
                    for(let insData of rewData['InsReward']){
                        if(!insData['point']){
                            insData['point'] = 0;
                        }
                        insData['point'] = (type === 'user') ? insData['point_user'] : insData['point_spouse'];
                        insData['totalPoint'] = (type === 'user') ? rewData['point'] : rewData['pointS'];
                        insData['actpoint'] = (type === 'user') ? rewData['actpoint'] : rewData['actpointS'];
                        insData['remainpoint'] = rewData['remainpoint'];
                    }
                }
                if(rewData['cashReward'] && rewData['cashReward']?.length > 0){
                    for(let cashData of rewData['cashReward']){
                        if(!cashData['point']){
                            cashData['point'] = 0;
                        }
                        cashData['point'] = (type === 'user') ? cashData['point_user'] : cashData['point_spouse'];
                        cashData['totalPoint'] = (type === 'user') ? rewData['point'] : rewData['pointS'];
                        cashData['actpoint'] = (type === 'user') ? rewData['actpoint'] : rewData['actpointS'];
                        cashData['remainpoint'] = rewData['remainpoint'];
                    }
                }
                if(rewData['otherReward'] && rewData['otherReward']?.length > 0){
                    for(let otherData of rewData['otherReward']){
                        if(!otherData['point']){
                            otherData['point'] = 0;
                        }
                        otherData['totalPoint'] = (type === 'user') ? rewData['point'] : rewData['pointS'];
                        otherData['actpoint'] = (type === 'user') ? rewData['actpoint'] : rewData['actpointS'];
                        otherData['remainpoint'] = rewData['remainpoint'];
                    }
                }
                let sliderSubRewardArray = [
                    ...rewData['InsReward'],
                    ...rewData['cashReward'],
                    ...rewData['otherReward'],
                ];
                sliderSubRewardArray = await this.sortingService.sortCampaignData('asc', sliderSubRewardArray, 'order_id', 'id');
                let transPTS = await this.translatorService.frontendReadTranslation(req.lang, 'Pts', `/LC_MESSAGES/Dashboard/CurrentPoints`, `static`);
                let transPTRS = await this.translatorService.frontendReadTranslation(req.lang, 'Points Required', `/LC_MESSAGES/Dashboard/CurrentPoints`, `static`);
                let transPTCS = await this.translatorService.frontendReadTranslation(req.lang, 'Points Completed', `/LC_MESSAGES/Dashboard/CurrentPoints`, `static`);

                let transPT = await this.translatorService.frontendReadTranslation(req.lang, 'Pt', `/LC_MESSAGES/Dashboard/CurrentPoints`, `static`);
                let transPTR = await this.translatorService.frontendReadTranslation(req.lang, 'Point Required', `/LC_MESSAGES/Dashboard/CurrentPoints`, `static`);
                let transPTC = await this.translatorService.frontendReadTranslation(req.lang, 'Point Completed', `/LC_MESSAGES/Dashboard/CurrentPoints`, `static`);
                if(sliderSubRewardArray && sliderSubRewardArray?.length > 0){
                    for(let sSubRewData of sliderSubRewardArray){
                        let subRewardsIds = sSubRewData['id'];
                        let reqPoint = sSubRewData['point'];
                        let total_achive_points:any = 0;
                        let final_value = 0;
                        let avg_total_complete = 0;
                        if (sSubRewData['consider_require'] == 1) {
                            total_achive_points = (sSubRewData['max_point_limit'] == 1) ? sSubRewData['actpoint'] : sSubRewData['totalPoint'];
                            final_value = (sSubRewData['point'] != "") ? sSubRewData['point'] : 0;
                            total_achive_points = (sSubRewData['remainpoint'] > 0 && total_achive_points > (final_value - sSubRewData['remainpoint'])) ? (final_value - sSubRewData['remainpoint']) : total_achive_points;
                            total_achive_points = (total_achive_points < 0) ? 0 : total_achive_points;
                            avg_total_complete = (final_value == 0) ? 0 : (100 * total_achive_points) / final_value;
                        }else{
                            if (sSubRewData['max_point_limit'] == 1) {
                                total_achive_points = sSubRewData['actpoint'];
                            } else {
                                total_achive_points = sSubRewData['totalPoint'];
                            }
                            if (sSubRewData['point'] != "") {
                                final_value = sSubRewData['point'];
                            } else {
                                final_value = 0;
                            }
                            avg_total_complete = (final_value > 0) ? (100 * total_achive_points) / final_value : 0;
                        }
                        if (avg_total_complete >= 100) {
                            avg_total_complete = 100;
                        }
                        if(total_achive_points === undefined || total_achive_points === null || total_achive_points === ''){
                            total_achive_points = 0;
                        }
                        let pointCompleted = 0;
                        if(avg_total_complete < 100 && total_achive_points > 0){
                            pointCompleted = total_achive_points || 0;
                        }else{
                            if(total_achive_points > final_value){
                                pointCompleted = final_value || 0;
                            }else{
                                pointCompleted = total_achive_points || 0;
                            }
                        }
                        sSubRewData['total_archive_points'] =  (total_achive_points > 1) ? total_achive_points+' '+transPTS : total_achive_points+' '+transPT;
                        sSubRewData['startPoint'] = '0 '+transPT;
                        sSubRewData['required_point'] = (final_value > 1) ? final_value+' '+ transPTRS : final_value+' '+ transPTR;
                        sSubRewData['avg_total_complete_point'] = avg_total_complete;
                        sSubRewData['pointCompleted'] = (pointCompleted > 1) ? pointCompleted+' '+ transPTCS : pointCompleted+' '+ transPTC;
                    }
                    if(!returnFinalData[`${rewardId}`][`${currentPointKey}`]){
                        returnFinalData[`${rewardId}`][`${currentPointKey}`] = {};
                    }
                    returnFinalData[`${rewardId}`][`${currentPointKey}`] = sliderSubRewardArray;
                }else{
                    returnFinalData[`${rewardId}`][`${currentPointKey}`] = await this.translatorService.frontendReadTranslation(req.lang, 'No Incentive Found', `/LC_MESSAGES/Dashboard/CurrentPoints`, `static`);
                }
                if(call_from == 5){ /* For App Reward List according campaign */
                    if(type == 'user'){
                        dsahboardPointSliderData = [...dsahboardPointSliderData, ...returnFinalData[`${rewardId}`][`${currentPointKey}`]];
                    }else{
                        dsahboardSPointSliderData = [...dsahboardSPointSliderData, ...returnFinalData[`${rewardId}`][`${currentPointKey}`]];
                    }
                    delete(returnFinalData[`${rewardId}`][`${activityKey}`]);
                    delete(returnFinalData[`${rewardId}`][`${currentPointKey}`]);
                }
            }
            /* Point Slider */
        }
        if(type == 'spouse'){    
            return  {'returnFinalData' : returnFinalData, 'dsahboardPointSliderData': dsahboardPointSliderData};        
        }else{
            return  {'returnFinalData' : returnFinalData, 'requiredActivitiesComplete': requiredActivitiesComplete, 'dsahboardPointSliderData': dsahboardPointSliderData, 'leaderBoardCampaignTotalPoints': leaderBoardCampaignTotalPoints, 'totalActivityRequiredPoints': totalActivityRequiredPoints, 'totalActivityCompletedPoints' : totalActivityCompletedPoints};
        }
        
    }

    async getFinalCurrentPointData(rewardsData:any = [], commonDatas: any = [], req: Request){
        try{
            let {
                roleID = null,
                orgId = null,
                campaign_id = null,
                call_from = null,
                spouseShow = 0,
            } = Object.assign({}, ...commonDatas);
            let campaignId = (typeof campaign_id === 'string') ? parseInt(campaign_id) : campaign_id;
            let required_by_spouse = "required_by_spouse";
            let required_by_user = "required_by_user";
            if (roleID == 16) {
                required_by_spouse = "required_by_user";
                required_by_user = "required_by_spouse";
            }
            const sliderSetting = await this.sliderSettingsService.findOne({ org_id: orgId });
            let emableWidgetList = req?.tokenUser?.company?.meta?.enable_widget || '';
            const emableWidgetListData = (emableWidgetList) ? JSON.parse(emableWidgetList) : {};
            let returnFinalData = {};
            for (let rewData of rewardsData){
                const rewardId = rewData['id'];
                const userFieldsToCheck = [
                    'Campaignactivity',
                    'Campaignchallenges',
                    'Campaigncategory',
                ];
                const mergedUserValidArrays = userFieldsToCheck.reduce((mergedArray, field) => {
                    const isValid = Array.isArray(rewData[field]) && rewData[field]?.length > 0;
                    if (isValid) {
                        const validArray = rewData[field].filter((item) => item && typeof item === 'object');
                        let isDefines = 1;
                        if(field == 'Campaignchallenges'){
                            isDefines = 2;
                        }else if(field == 'Campaigncategory'){
                            isDefines = 3;
                        }
                        return [...mergedArray, ...validArray.map((item) => ({ ...item, isDefine: isDefines }))];
                    }
                    return mergedArray;
                }, []);
                const sortedUserArray = await this.sortingService.sortCampaignData('asc', mergedUserValidArrays, 'order_id', 'id');
                const spouseFieldsToCheck = [
                    'CampaignSpouseactivity',
                    'CampaignSpousechallenges',
                    'CampaignSpousecategory',
                ];
                const mergedSpouseValidArrays = spouseFieldsToCheck.reduce((mergedArray, field) => {
                    const isValid = Array.isArray(rewData[field]) && rewData[field]?.length > 0;
                    if (isValid) {
                        const validArray = rewData[field].filter((item) => item && typeof item === 'object');
                        let isDefines = 1;
                        if(field == 'CampaignSpousechallenges'){
                            isDefines = 2;
                        }else if(field == 'CampaignSpousecategory'){
                            isDefines = 3;
                        }
                        return [...mergedArray, ...validArray.map((item) => ({ ...item, isDefine: isDefines }))];
                    }
                    return mergedArray;
                }, []);
                const sortedSpouseArray = await this.sortingService.sortCampaignData('asc', mergedSpouseValidArrays, 'order_id', 'id');
                delete(rewData['Campaignactivity']);
                delete(rewData['Campaignchallenges']);
                delete(rewData['Campaigncategory']);
                delete(rewData['CampaignSpouseactivity']);
                delete(rewData['CampaignSpousechallenges']);
                delete(rewData['CampaignSpousecategory']);
                rewData['userActivity'] = sortedUserArray;
                if(spouseShow == 1){
                    rewData['spouseActivity'] = sortedSpouseArray;
                }
                let rewardNme = await this.translatorService.frontendReadTranslation(req.lang,`reward_name_${campaignId}_${rewardId}`, `/LC_MESSAGES/Campaign/Campaigns/${orgId}/${campaignId}`,`dynamic`);
                rewardNme = (rewardNme == '' || rewardNme == `reward_name_${campaignId}_${rewardId}`) ? rewData['reward_name'] : rewardNme;
                rewData['reward_name'] = rewardNme;
                let rewardDesc = await this.translatorService.frontendReadTranslation(req.lang,`reward_desc_${campaignId}_${rewardId}`, `/LC_MESSAGES/Campaign/Campaigns/${orgId}/${campaignId}`,`dynamic`);
                rewardDesc = (rewardDesc == '' || rewardDesc == `reward_desc_${campaignId}_${rewardId}`) ? rewData['reward_desc'] : rewardDesc;
                rewData['reward_desc'] = rewardDesc;
                if(!returnFinalData[`${rewardId}`]){
                    returnFinalData[`${rewardId}`] = {};
                }

                let transName = await this.translatorService.frontendReadTranslation(req.lang,`campaign_name_${campaignId}`, `/LC_MESSAGES/Campaign/Campaigns/${orgId}/${campaignId}`,`dynamic`);
                transName = (transName == '' || transName == `campaign_name_${campaignId}`) ? rewData['campaign']['campaign_name'] : transName;
                
                let transName1 = await this.translatorService.frontendReadTranslation(req.lang,`campaign_tab_titled_${campaignId}`, `/LC_MESSAGES/Campaign/Campaigns/${orgId}/${campaignId}`,`dynamic`);
                transName1 = (transName1 == '' || transName1 == `campaign_tab_titled_${campaignId}`) ? rewData['campaign']['tab_titled'] : transName1;
                
                returnFinalData[`${rewardId}`]['id'] = rewardId;
                returnFinalData[`${rewardId}`]['campaign_id'] = campaignId;
                returnFinalData[`${rewardId}`]['campaign_name'] = transName;
                returnFinalData[`${rewardId}`]['tab_titled'] = transName1;
                returnFinalData[`${rewardId}`]['reward_name'] = rewardNme;
                returnFinalData[`${rewardId}`]['reward_desc'] = rewardDesc;
                returnFinalData[`${rewardId}`]['order'] = rewData['order_id'];
                returnFinalData[`${rewardId}`]['cat_activity_visibility'] = rewData['cat_activity_visibility'];

                let commonDatas = [ { 'rewardId' : rewardId }, { 'req' : req }, { 'sliderSetting' : sliderSetting }, { 'emableWidgetListData' : emableWidgetListData }, { 'required_by_user' : required_by_user }];
                let userActivitys = await this.getCurrentPointDatas('user',JSON.parse(JSON.stringify(rewData)), returnFinalData, rewData['userActivity'], commonDatas);
                if(userActivitys && Object.keys(userActivitys)?.length > 0){
                    returnFinalData[`${rewardId}`] = userActivitys['returnFinalData'][`${rewardId}`];
                }
                if(spouseShow == 1){
                    if(rewData['spouseActivity'] && rewData['spouseActivity']?.length > 0){
                        const index = commonDatas.findIndex(obj => 'required_by_user' in obj);
                        if (index !== -1) {
                            commonDatas[index].required_by_user = required_by_spouse;
                        }
                        let spouseActivitys = await this.getCurrentPointDatas('spouse',JSON.parse(JSON.stringify(rewData)), returnFinalData, rewData['spouseActivity'], commonDatas);
                        if(spouseActivitys && Object.keys(spouseActivitys)?.length > 0){
                            returnFinalData[`${rewardId}`] = spouseActivitys['returnFinalData'][`${rewardId}`];
                        }
                    }
                }
            }
            return returnFinalData;
        }catch (error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang,error.message));
        }
    }

    async getCurrentPointDatas(type, rewData, returnFinalData, activityData = [],commonDatas : any = {}){
        let {
            rewardId = null,
            req = {},
            sliderSetting = null,
            emableWidgetListData = {},
        } = Object.assign({}, ...commonDatas);

        let rewardKey = 'userReward';
        let activityKey = 'userActivitys';
        let currentPointKey = 'currentPoints';
        if(type == 'spouse'){
            rewardKey = 'spouseReward';
            activityKey = 'spouseActivitys';
            currentPointKey = 'spousecurrentPoints';
        }
        if(activityData && activityData?.length > 0){
            if(sliderSetting && sliderSetting['hide'] && sliderSetting['hide'] == 1 && (!emableWidgetListData.currentpoint || emableWidgetListData.currentpoint == 1)){
                if(rewData['InsReward'] && rewData['InsReward']?.length > 0){
                    for(let insData of rewData['InsReward']){
                        if(!insData['point']){
                            insData['point'] = 0;
                        }
                        insData['point'] = (type === 'user') ? insData['point_user'] : insData['point_spouse'];
                        insData['totalPoint'] = (type === 'user') ? rewData['point'] : rewData['pointS'];
                        insData['actpoint'] = (type === 'user') ? rewData['actpoint'] : rewData['actpointS'];
                        insData['remainpoint'] = rewData['remainpoint'];
                    }
                }
                if(rewData['cashReward'] && rewData['cashReward']?.length > 0){
                    for(let cashData of rewData['cashReward']){
                        if(!cashData['point']){
                            cashData['point'] = 0;
                        }
                        cashData['point'] = (type === 'user') ? cashData['point_user'] : cashData['point_spouse'];
                        cashData['totalPoint'] = (type === 'user') ? rewData['point'] : rewData['pointS'];
                        cashData['actpoint'] = (type === 'user') ? rewData['actpoint'] : rewData['actpointS'];
                        cashData['remainpoint'] = rewData['remainpoint'];
                    }
                }
                if(rewData['otherReward'] && rewData['otherReward']?.length > 0){
                    for(let otherData of rewData['otherReward']){
                        if(!otherData['point']){
                            otherData['point'] = 0;
                        }
                        otherData['totalPoint'] = (type === 'user') ? rewData['point'] : rewData['pointS'];
                        otherData['actpoint'] = (type === 'user') ? rewData['actpoint'] : rewData['actpointS'];
                        otherData['remainpoint'] = rewData['remainpoint'];
                    }
                }
                let sliderSubRewardArray = [
                    ...rewData['InsReward'],
                    ...rewData['cashReward'],
                    ...rewData['otherReward'],
                ];
                sliderSubRewardArray = await this.sortingService.sortCampaignData('asc', sliderSubRewardArray, 'order_id', 'id');
                let transPTS = await this.translatorService.frontendReadTranslation(req.lang, 'Pts', `/LC_MESSAGES/Dashboard/CurrentPoints`, `static`);
                let transPTRS = await this.translatorService.frontendReadTranslation(req.lang, 'Points Required', `/LC_MESSAGES/Dashboard/CurrentPoints`, `static`);
                let transPTCS = await this.translatorService.frontendReadTranslation(req.lang, 'Points Completed', `/LC_MESSAGES/Dashboard/CurrentPoints`, `static`);

                let transPT = await this.translatorService.frontendReadTranslation(req.lang, 'Pt', `/LC_MESSAGES/Dashboard/CurrentPoints`, `static`);
                let transPTR = await this.translatorService.frontendReadTranslation(req.lang, 'Point Required', `/LC_MESSAGES/Dashboard/CurrentPoints`, `static`);
                let transPTC = await this.translatorService.frontendReadTranslation(req.lang, 'Point Completed', `/LC_MESSAGES/Dashboard/CurrentPoints`, `static`);
                if(sliderSubRewardArray && sliderSubRewardArray?.length > 0){
                    for(let sSubRewData of sliderSubRewardArray){
                        let total_achive_points:any = 0;
                        let final_value = 0;
                        let avg_total_complete = 0;
                        if (sSubRewData['consider_require'] == 1) {
                            total_achive_points = (sSubRewData['max_point_limit'] == 1) ? sSubRewData['actpoint'] : sSubRewData['totalPoint'];
                            final_value = (sSubRewData['point'] != "") ? sSubRewData['point'] : 0;
                            total_achive_points = (sSubRewData['remainpoint'] > 0 && total_achive_points > (final_value - sSubRewData['remainpoint'])) ? (final_value - sSubRewData['remainpoint']) : total_achive_points;
                            total_achive_points = (total_achive_points < 0) ? 0 : total_achive_points;
                            avg_total_complete = (final_value == 0) ? 0 : (100 * total_achive_points) / final_value;
                        }else{
                            if (sSubRewData['max_point_limit'] == 1) {
                                total_achive_points = sSubRewData['actpoint'];
                            } else {
                                total_achive_points = sSubRewData['totalPoint'];
                            }
                            if (sSubRewData['point'] != "") {
                                final_value = sSubRewData['point'];
                            } else {
                                final_value = 0;
                            }
                            avg_total_complete = (final_value > 0) ? (100 * total_achive_points) / final_value : 0;
                        }
                        if (avg_total_complete >= 100) {
                            avg_total_complete = 100;
                        }
                        if(total_achive_points === undefined || total_achive_points === null || total_achive_points === ''){
                            total_achive_points = 0;
                        }
                        let pointCompleted = 0;
                        if(avg_total_complete < 100 && total_achive_points > 0){
                            pointCompleted = total_achive_points || 0;
                        }else{
                            if(total_achive_points > final_value){
                                pointCompleted = final_value || 0;
                            }else{
                                pointCompleted = total_achive_points || 0;
                            }
                        }
                        sSubRewData['total_archive_points'] =  (total_achive_points > 1) ? total_achive_points+' '+transPTS : total_achive_points+' '+transPT;
                        sSubRewData['total_archive_points_num'] =  total_achive_points ?? 0;
                        sSubRewData['startPoint'] = '0 '+transPT;
                        sSubRewData['startPoint_num'] = 0;
                        sSubRewData['required_point'] = (final_value > 1) ? final_value+' '+ transPTRS : final_value+' '+ transPTR;
                        sSubRewData['required_point_num'] = final_value ?? 0;
                        sSubRewData['avg_total_complete_point'] = avg_total_complete;
                        sSubRewData['pointCompleted'] = (pointCompleted > 1) ? pointCompleted+' '+ transPTCS : pointCompleted+' '+ transPTC;
                        sSubRewData['pointCompleted_num'] = pointCompleted ?? 0;
                    }
                    if(!returnFinalData[`${rewardId}`][`${currentPointKey}`]){
                        returnFinalData[`${rewardId}`][`${currentPointKey}`] = {};
                    }
                    returnFinalData[`${rewardId}`][`${currentPointKey}`] = sliderSubRewardArray;
                }else{
                    returnFinalData[`${rewardId}`][`${currentPointKey}`] = await this.translatorService.frontendReadTranslation(req.lang, 'No Incentive Found', `/LC_MESSAGES/Dashboard/CurrentPoints`, `static`);
                }
                delete(returnFinalData[`${rewardId}`][`${activityKey}`]);
            }
        }
        return  {'returnFinalData' : returnFinalData};       
    }
}
