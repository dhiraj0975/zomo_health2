import { BrokerService } from '@/modules/broker/broker.service';
import { CoachesService } from '@/modules/coach/coaches/coaches.service';
import { SortingService } from '@/modules/common';
import { MetaService } from '@/modules/company/meta/meta.service';
import { appConstant, CampaignDto, CommonArrayService, CommonDateService, CommonService, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { TranslationService } from "src/modules/translation/translation.service";
import { Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { ActivePluginService } from "../../company/activeplugins/activeplugin.service";
import { ActivityLogService } from "../../master/activitylog/activitylog.service";
import { UserService } from "../../user/user/user.service";
import { CampaignDashboardService } from "../campaigndashboard/campaigndashboard.service";
import { SliderSettingsService } from '../slidersettings/slidersettings.service';
import { SpouseSettingsService } from "../spousesettings/spousesettings.service";
import { FrontService } from "./front.service";
import { FrontCalculationService } from "./frontcalculation.service";
import { FrontCampaginSummaryService } from "./frontcampaignsummarydata.service";
import { FrontPointsForService } from "./frontpointfor.service";
import { FrontCampaignInput } from "./input";
const S3_URL =  process.env.S3_URL_PROD
@Controller('campaign/front')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class FrontController {
    constructor(
        private readonly campaignService: FrontService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly userService: UserService,
        private readonly spouseSettingsService: SpouseSettingsService,
        private readonly sliderSettingsService: SliderSettingsService,
        private readonly activityLogService: ActivityLogService,
        private readonly campaignDashboardService: CampaignDashboardService,
        private readonly frontPointsForService: FrontPointsForService,
        private readonly frontCampaginSummaryService: FrontCampaginSummaryService,
        private readonly frontCalculationService: FrontCalculationService,
        private readonly brokerService: BrokerService,
        private readonly coachesService: CoachesService,
        private readonly activePluginService: ActivePluginService,
        private readonly sortingService: SortingService,
        private readonly metaService: MetaService,
    ) {}
   
    @Post('current-campaigns')
    async getCurrentCampaigns(@Req() req: Request, @Res() res: Response, @Body() postData: FrontCampaignInput) {
        try {
            if (!postData?.company_id || !postData?.call_from) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const company_id = Number(postData?.company_id);
            const activePlugins = await this.activePluginService.getActivePluginList(company_id);
            if(activePlugins.includes('Incentive')){
                if(Number(postData?.call_from) === 3) {
                    if (!postData?.challenge_start_date || !postData?.challenge_end_date) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
                    }
                }
                let sliderSetting = null;
                let showDashboardTab = 1;
                if(postData?.call_from === '1'){
                    sliderSetting = await this.sliderSettingsService.findOne({ org_id: company_id });
                    if(sliderSetting && sliderSetting.dashboard_tab == 0){
                        showDashboardTab = 0;
                    }
                }
                postData.department_id = Number(postData?.department_id) || req?.tokenUser?.department_id;
                postData.location_id = Number(postData?.location_id) || req?.tokenUser?.location;
                const campaignsData = await this.campaignService.getCampaignData(postData, req);
                if(campaignsData && campaignsData.length){
                    for(let campData of campaignsData){
                        let campaignId = campData['id'];
                        let transName = await this.translatorService.frontendReadTranslation(req.lang,`campaign_name_${campaignId}`, `/LC_MESSAGES/Campaign/Campaigns/${postData?.company_id}/${campaignId}`,`dynamic`);
                        transName = (transName == '' || transName == `campaign_name_${campaignId}`) ? campData['campaign_name'] : transName;
                        campData['campaign_name'] = transName;
                        let transName1 = await this.translatorService.frontendReadTranslation(req.lang,`campaign_tab_titled_${campaignId}`, `/LC_MESSAGES/Campaign/Campaigns/${postData?.company_id}/${campaignId}`,`dynamic`);
                        transName1 = (transName1 == '' || transName1 == `campaign_tab_titled_${campaignId}`) ? campData['tab_titled'] : transName1;
                        campData['tab_titled'] = transName1;
                    }
                }
            
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: {'dashboardTabSetting' : showDashboardTab, 'data' : campaignsData},
                    message: 'success',
                });
            }else{
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: 0,
                    error: 1,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req?.lang, "ERR_ACCESS_DENIED")
                });
            }
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    
    @Post('campaign-rewards')
    async getRewardDataForCampaign(@Req() req: Request, @Res() res: Response, @Body() postData: FrontCampaignInput) {
        try {
            const roleId = req?.tokenUser?.role_id || 0;
            let loginUserId = req?.tokenUser?.id;
            let user_id = loginUserId;
            if (!postData?.company_id || !postData?.campaign_id || (![2,16].includes(roleId) && !postData?.user_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const company_id = Number(postData?.company_id);
            const campaign_id = Number(postData?.campaign_id);
            const appRewardId = (postData?.reward_id) ? Number(postData?.reward_id) : '';
            if(![2,16].includes(roleId)){
                user_id = postData?.user_id;
            }
            let call_from = Number(postData?.call_from);
            let call_for = postData?.call_for || '';
            const activePlugins = await this.activePluginService.getActivePluginList(company_id);
            let returnDatas = {};
            if(activePlugins.includes('Incentive')){
                if(roleId == appConstant.ROLE.WCH && user_id != loginUserId){
                    let userDatas = await this.campaignDashboardService.getChampionUsers(company_id, loginUserId, ['user.id']);
                    if(userDatas && userDatas.length > 0){
                        const userIds = userDatas.map(user => user.id);
                        if(!userIds.includes(user_id)){
                            return res.status(HttpStatus.BAD_REQUEST).json({
                                success: 0,
                                error: 1,
                                data: null,
                                message: await this.translatorService.frontendReadTranslation(req?.lang, "ERR_FORBIDDEN_ACCESS")
                            });
                        }
                    }
                }
                if(roleId == appConstant.ROLE.BROKER || roleId == appConstant.ROLE.BROKERADMIN || roleId == appConstant.ROLE.REGIONALADMIN){
                    let brokerDetails = await this.userService.findOne({ id: user_id });
                    if (roleId == appConstant.ROLE.BROKERADMIN && brokerDetails && brokerDetails?.role_id != 7 && brokerDetails?.role_id != 23) {
                        let checkBrockerAdmin = await this.brokerService.brockerAdminList(`broker.org_id = ${brokerDetails?.['company']?.id} AND broker.broker_admin_id = ${loginUserId}`);
                        if (!checkBrockerAdmin || checkBrockerAdmin.length === 0) {
                            return res.status(HttpStatus.BAD_REQUEST).json({
                                success: 0,
                                error: 1,
                                data: null,
                                message: await this.translatorService.frontendReadTranslation(req?.lang, "ERR_FORBIDDEN_ACCESS")
                            });
                        }
                    }
                    if (roleId == appConstant.ROLE.BROKER) {
                        let brockerCondition = `broker.user_id = ${loginUserId} AND broker.status = 1
                        AND(
                            (broker.org_id = ${brokerDetails?.['company']?.org_id} AND broker.is_global = 1) OR
                            (broker.org_id = ${brokerDetails?.['company']?.org_id} AND broker.location != ${brokerDetails?.['Location']?.id}) OR
                            (broker.org_id = "${brokerDetails?.['company']?.org_id}" AND broker.department != ${brokerDetails?.['Department']?.id}) OR
                            (broker.org_id = "${brokerDetails?.['company']?.org_id}" AND broker.state != ${brokerDetails?.['u_setting']?.state}) OR
                            (broker.org_id = "${brokerDetails?.['company']?.org_id}" AND broker.city != ${brokerDetails?.['u_setting']?.city}) OR
                        )`;
                        let checkBroker = await this.brokerService.checkBroker(brockerCondition);
                        if (!checkBroker) {
                            return res.status(HttpStatus.BAD_REQUEST).json({
                                success: 0,
                                error: 1,
                                data: null,
                                message: await this.translatorService.frontendReadTranslation(req?.lang, "ERR_FORBIDDEN_ACCESS")
                            });
                        }
                    }
                }else if(roleId == appConstant.ROLE.GLOBALCOACH || roleId == appConstant.ROLE.COACH){
                    let coachDetails = await this.userService.findOne({ id: user_id });
                    if (roleId == appConstant.ROLE.GLOBALCOACH) {
                        let checkGlobalCoach = await this.coachesService.globalCoachList(`coach.org_id = ${coachDetails?.['company']?.id} AND coach.coach_manager_id = ${loginUserId}`);
                        if (!checkGlobalCoach || checkGlobalCoach.length === 0) {
                            return res.status(HttpStatus.BAD_REQUEST).json({
                                success: 0,
                                error: 1,
                                data: null,
                                message: await this.translatorService.frontendReadTranslation(req?.lang, "ERR_FORBIDDEN_ACCESS")
                            });
                        }
                    }
                    if (roleId == appConstant.ROLE.COACH) {
                        let coachCondition = `coach.user_id = ${loginUserId} AND coach.status = 1
                        AND(
                            (coach.org_id = ${coachDetails?.org_id} AND coach.is_global = 1) OR
                            (coach.org_id = ${coachDetails?.org_id} AND coach.location != '${coachDetails?.['location']?.['id'] ?? ''}') OR
                            (coach.org_id = ${coachDetails?.org_id} AND coach.department != '${coachDetails?.['department']?.id ?? ''}') OR
                            (coach.org_id = ${coachDetails?.org_id} AND coach.state != '${coachDetails?.['settings']?.state ?? ''}') OR
                            (coach.org_id = ${coachDetails?.org_id} AND coach.city != '${coachDetails?.['settings']?.city ?? ''}')
                        )`;
                        let checkCoach = await this.coachesService.checkCoach(coachCondition);
                        if (!checkCoach) {
                            return res.status(HttpStatus.BAD_REQUEST).json({
                                success: 0, 
                                error: 1,
                                data: null,
                                message: await this.translatorService.frontendReadTranslation(req?.lang, "ERR_FORBIDDEN_ACCESS")
                            });
                        }
                    }
                }
                let emableWidgetList = req?.tokenUser?.company?.meta?.enable_widget || '';
                const enableWidgetListData = (emableWidgetList) ? JSON.parse(emableWidgetList) : {};
                let checkCampaignCondition: any = `campaign.id = ${campaign_id} AND campaign.organization_id = ${company_id}`;
                let checkCampaign = await this.campaignService.findOne(checkCampaignCondition);
                if (!checkCampaign) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
                }
                let getRewardCondition: any = `reward.campaign_id = ${campaign_id} AND reward.status = 1`;
                if(appRewardId != '' && call_from == 9){
                    getRewardCondition += ` AND reward.id = ${appRewardId}`;
                }
                let orderBy = { order_id: 'ASC' };
                let rewards: any = await this.campaignDashboardService.getRewardsData(getRewardCondition, orderBy);
                if(!rewards || rewards.length === 0) {
                    rewards = [];
                } else {
                    const getUserWhere = { id: user_id };
                    let userData = await this.userService.findOne(getUserWhere);
                    if(userData) {
                        const isCampaignEligible = userData?.is_camp_eligible || 0;
                        const roleID = userData?.role_id || 0;
                        const relationshipID = userData?.relationship_id || 0;
                        const userCode = userData?.code || '';
                        const timezone = userData?.timezone || 'UTC';
                        let spouseid = 0;
                        const userHireDate = userData?.date_of_hire || '';
                        let spouseHireDate = '';
                        let leaderboardCampId = req?.tokenUser?.company?.setting?.campaign_id || '';
                        let dashboardPointLeaboard = req?.tokenUser?.company?.setting?.dashboard_point_leaboard || '';
                        let hideShow = dashboardPointLeaboard == 0 ? 1 : 0;
                        let point_user = 'point_user';
                        let r_by_data = 'required_by_user';
                        let required_by_spouse = "required_by_spouse";
                        let required_by_user = "required_by_user";
                        if (roleID == 16) {
                            point_user = 'point_spouse';
                            r_by_data = 'required_by_spouse';
                            required_by_spouse = "required_by_user";
                            required_by_user = "required_by_spouse";
                        }
                        let spouseinfo = Object.create(null);
                        let isSpouseCampaignEligible = 0;
                        if (call_from == 1 || call_from == 2 || call_from == 9) {
                            if (roleID == 16) {
                                spouseinfo = await this.userService.findOne({ code : relationshipID },['user.id','user.code','user.date_of_hire']);
                            } else {
                                spouseinfo = await this.userService.findOne({ relationship_id : userCode },['user.id','user.code','user.date_of_hire']);
                            }
                            if (spouseinfo) {
                                spouseHireDate = spouseinfo['date_of_hire'];
                                spouseid = spouseinfo['id'];
                                isSpouseCampaignEligible = spouseinfo['is_camp_eligible'] || 0;
                            }
                        }
                        let HealthyHabittotalPoint = [];
                        let totalRewardCount = rewards?.length || 0;
                        let campaignRequiredActivities = 0;    
                        let campaignUpcomingDeadlines = 0;
                        for (let element of rewards) {
                            let rewardRequiredActivities = 0;    
                            let rewardUpcomingDeadlines = 0;
                            const hireDateCount = element['hire_date_count'] || 0;
                            const hireDateSetting = element['hire_date'] || 0;
                            const rewardId = element['id'];
                            element['remainpoint'] = 0;
                            let showRewards = false;
                            if ((isCampaignEligible == 1 && element['eligibility'] == 1) || (isCampaignEligible == 0 && element['eligibility'] == 2)) {
                                showRewards = true;
                            }
                            if ((roleID == 2 && element['eligibility'] == 7) || (roleID == 2 && isCampaignEligible == 1 && element['eligibility'] == 3) || (roleID == 2 && isCampaignEligible == 0 && element['eligibility'] == 4)) {
                                showRewards = true;
                            }
                            if ((roleID == 16 && element['eligibility'] == 8) || (roleID == 16 && isCampaignEligible == 1 && element['eligibility'] == 5) || (roleID == 16 && isCampaignEligible == 0 && element['eligibility'] == 6)) {
                                showRewards = true;
                            }
                            if (element['eligibility'] == 0 || showRewards) {
                                let actPoints = 0;
                                let totalPoint = 0;
                                let actPointsS = 0;
                                let totalPointS = 0;
                                let categorySpouse:any = [];
                                let activitySpouse = {};
                                let challengeSpouse = {};
                                let category:any = [];
                                element['CampaignId'] = campaign_id;
                                if (element['related_category'] != "") {
                                    category = await this.campaignDashboardService.rewardItemGetDetails('related_category', element);
                                    if (spouseid != 0) {
                                        categorySpouse = JSON.parse(JSON.stringify(category));
                                    }
                                }
                                if (element['related_activity'] != "") {
                                    let activity = await this.campaignDashboardService.rewardItemGetDetails('related_activity', element);
                                    if (spouseid != 0) {
                                        activitySpouse = JSON.parse(JSON.stringify(activity));
                                    }
                                    let actOtherData = [ { 'dateCalType' : 'activity' }, { 'category' : category }, { 'user_id' : user_id }, { 'activePlugins' : activePlugins }, { 'hireDate' : userHireDate }, { 'hire_date' : element['hire_date'] }, { 'company_id' : company_id }, { 'timezone' : timezone }, { 'r_by_data' : r_by_data }, { 'rewardId' : element['id'] }, { 'campaignId' : campaign_id }, { 'HealthyHabittotalPoint' : HealthyHabittotalPoint }, { 'hireDateCount' : hireDateCount }, { 'hireDateSetting' : hireDateSetting }];
                                    const returnArray = await this.frontPointsForService.points_for_activities(call_from, activity, actOtherData);
                                    activity = JSON.parse(JSON.stringify(returnArray['activity']));
                                    category = JSON.parse(JSON.stringify(returnArray['category']));
                                    element['Campaignactivity'] = JSON.parse(JSON.stringify(activity));
                                    element['remainpoint'] = returnArray['remainPoint'] || 0;
                                    rewardRequiredActivities += returnArray['requiredActivities'];
                                    rewardUpcomingDeadlines += returnArray['upcomingDeadlines'];
                                    campaignRequiredActivities += rewardRequiredActivities;    
                                    campaignUpcomingDeadlines += rewardUpcomingDeadlines;
                                    actPoints += returnArray['actPoints'] || 0;
                                    totalPoint += returnArray['totalPoint'] || 0;
                                    HealthyHabittotalPoint = [...HealthyHabittotalPoint, ...returnArray['HealthyHabittotalPoint']];
                                    if (spouseid != 0) {
                                        let spouseTimezone = spouseinfo['timezone'] || 'UTC';
                                        let spouseHireDate = spouseinfo['date_of_hire'] || '';
                                        let actSOtherData = [ { 'dateCalType' : 'activity' }, { 'category' : categorySpouse }, { 'user_id' : spouseid }, { 'activePlugins' : activePlugins }, { 'hireDate' : spouseHireDate }, { 'hire_date' : element['hire_date'] }, { 'company_id' : company_id }, { 'timezone' : spouseTimezone }, { 'r_by_data' : r_by_data }, { 'rewardId' : element['id'] }, { 'campaignId' : campaign_id }, { 'HealthyHabittotalPoint' : HealthyHabittotalPoint }, { 'hireDateCount' : hireDateCount }, { 'hireDateSetting' : hireDateSetting }];
                                        const returnArrayS = await this.frontPointsForService.points_for_activities(call_from, activitySpouse, actSOtherData);
                                        activitySpouse = JSON.parse(JSON.stringify(returnArrayS['activity']));
                                        categorySpouse = JSON.parse(JSON.stringify(returnArrayS['category']));
                                        actPointsS += returnArrayS['actPoints'] || 0;
                                        totalPointS += returnArrayS['totalPoint'] || 0;
                                        element['CampaignSpouseactivity'] = JSON.parse(JSON.stringify(activitySpouse));
                                    }else{
                                        element['CampaignSpouseactivity'] = [];
                                    }
                                }
                                if (element['related_challenge'] != "") {
                                    let challenges = await this.campaignDashboardService.rewardItemGetDetails('related_challenge', element);
                                    if (spouseid != 0) {
                                        challengeSpouse = JSON.parse(JSON.stringify(challenges));
                                    }
                                    if(!element['Campaignchallenges']){
                                        element['Campaignchallenges'] = [];
                                    }
                                    const returnArray = await this.frontPointsForService.points_for_challenges(challenges, user_id, hireDateSetting, userHireDate, company_id, hireDateCount);
                                    element['Campaignchallenges'] = JSON.parse(JSON.stringify(returnArray));
                                    if(!element['CampaignSpousechallenges']){
                                        element['CampaignSpousechallenges'] = [];
                                    }
                                    if (spouseid != 0) {
                                        const returnArrayS = await this.frontPointsForService.points_for_challenges(challengeSpouse, spouseid, hireDateSetting, spouseHireDate, company_id, hireDateCount );
                                        element['CampaignSpousechallenges'] = JSON.parse(JSON.stringify(returnArrayS));
                                    }
                                }
                                if(category){
                                    let actOtherData = [ { 'dateCalType' : 'category' }, { 'user_id' : user_id }, { 'activePlugins' : activePlugins }, { 'hireDate' : userHireDate }, { 'hire_date' : element['hire_date'] }, { 'company_id' : company_id }, { 'timezone' : timezone }, { 'r_by_data' : r_by_data }, { 'rewardId' : element['id'] }, { 'campaignId' : campaign_id }, { 'actPoints' : actPoints }, { 'totalPoint' : totalPoint }, { 'hireDateCount' : hireDateCount }, { 'hireDateSetting' : hireDateSetting }];
                                    const returnArrayC = await this.frontPointsForService.point_for_category(call_from, category, actOtherData);
                                    category = JSON.parse(JSON.stringify(returnArrayC['category']));
                                    element['Campaigncategory'] = JSON.parse(JSON.stringify(category));
                                    actPoints = JSON.parse(JSON.stringify(returnArrayC['actPoints'])) || 0;
                                    totalPoint = JSON.parse(JSON.stringify(returnArrayC['totalPoint'])) || 0;
                                    rewardRequiredActivities += returnArrayC['requiredActivities'];
                                    rewardUpcomingDeadlines += returnArrayC['upcomingDeadlines'];
                                    campaignRequiredActivities += rewardRequiredActivities;    
                                    campaignUpcomingDeadlines += rewardUpcomingDeadlines;
                                    if (spouseid != 0 && categorySpouse.length > 0) {
                                        let spouseTimezone = spouseinfo['timezone'] || 'UTC';
                                        let spouseHireDate = spouseinfo['date_of_hire'] || '';
                                        let actSOtherData = [ { 'dateCalType' : 'category' }, { 'user_id' : spouseid }, { 'activePlugins' : activePlugins }, { 'hireDate' : spouseHireDate }, { 'hire_date' : element['hire_date'] }, { 'company_id' : company_id }, { 'timezone' : spouseTimezone }, { 'r_by_data' : r_by_data }, { 'rewardId' : element['id'] }, { 'campaignId' : campaign_id }, { 'actPoints' : actPoints }, { 'totalPoint' : totalPoint }, { 'hireDateCount' : hireDateCount }, { 'hireDateSetting' : hireDateSetting }];
                                        const returnArraySC = await this.frontPointsForService.point_for_category(call_from, categorySpouse, actSOtherData);
                                        categorySpouse = JSON.parse(JSON.stringify(returnArraySC['category']));
                                        actPointsS = returnArraySC['actPoints'] || 0;
                                        totalPointS = returnArraySC['totalPoint'] || 0;
                                        element['CampaignSpousecategory'] = JSON.parse(JSON.stringify(categorySpouse));
                                    }else{
                                        element['CampaignSpousecategory'] = [];
                                    }
                                }
                                element['point'] = (totalPoint)? totalPoint : '';
                                element['actpoint'] = (actPoints) ? actPoints : '';
                                element['pointS'] = (totalPointS) ? totalPointS : '';
                                element['actpointS'] = (actPointsS) ? actPointsS : '';
                                element['RequiredActivities'] = rewardRequiredActivities ?? 0;
                                element['UpcomingDeadlines'] = rewardUpcomingDeadlines ?? 0;
                                if(element['ins_reward'] == 1){
                                    let insRewardData = await this.campaignDashboardService.rewardItemGetDetails('insurance_reward', element);
                                    if (call_from == 1 && dashboardPointLeaboard == 1 && hideShow == 0 &&  campaign_id == leaderboardCampId) {
                                        let radRemainPoint = element['remainpoint'];
                                        await Promise.all(
                                            insRewardData.map((value: any) => {
                                                if (value.Insurancereward[point_user] <= totalPoint && (radRemainPoint === 0 || value.Insurancereward.consider_require === 0) ) {
                                                    hideShow = 1;
                                                }
                                                return value;
                                            })
                                        );
                                    }
                                    let newInsRewardArray = {};
                                    for (let insData of insRewardData) {
                                        let insRewardId = insData['id'];
                                        let transName = await this.translatorService.frontendReadTranslation(req.lang,`ins_reward_name_${rewardId}_${insRewardId}`, `/LC_MESSAGES/Campaign/Campaigns/${company_id}/${campaign_id}`,`dynamic`);
                                        if(insData['cust_name'] && insData['cust_name'] != ''){
                                            transName = (transName == '' || transName == `ins_reward_name_${rewardId}_${insRewardId}`) ? insData['cust_name'] : transName;
                                        }else{
                                            transName = (transName == '' || transName == `ins_reward_name_${rewardId}_${insRewardId}`) ? insData['insuranceplan']['plan_name'] : transName;
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
                                    if (call_from == 1 && dashboardPointLeaboard == 1 && hideShow == 0 &&  campaign_id == leaderboardCampId) {
                                        let radRemainPoint = element['remainpoint'];
                                        await Promise.all(
                                            cashRewardData.map((value: any) => {
                                                if (value[point_user] <= totalPoint && (radRemainPoint === 0 || value.consider_require === 0) ) {
                                                    hideShow = 1;
                                                }
                                                return value;
                                            })
                                        );
                                    }
                                    let newCashRewardArray = {};
                                    for (let cashData of cashRewardData) {
                                        let cashRewardId = cashData['id'];
                                        let transName = '';
                                        if(cashData['cust_name'] && cashData['cust_name'] != ''){
                                            transName = await this.translatorService.frontendReadTranslation(req.lang,`cash_reward_name_${rewardId}_${cashRewardId}`, `/LC_MESSAGES/Campaign/Campaigns/${company_id}/${campaign_id}`,`dynamic`);
                                            transName = (transName == '' || transName == `cash_reward_name_${rewardId}_${cashRewardId}`) ? cashData['cust_name'] : transName;
                                        }else{
                                            transName = await this.translatorService.frontendReadTranslation(req.lang,`Cash`, `/LC_MESSAGES/Dashboard/CurrentPoints`,`static`);
                                            transName = (transName == '' || transName == `Cash`) ? 'Cash' : transName;
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
                                    if (call_from == 1 && dashboardPointLeaboard == 1 && hideShow == 0 &&  campaign_id == leaderboardCampId) {
                                        let radRemainPoint = element['remainpoint'];
                                        await Promise.all(
                                            otherRewardData.map((value: any) => {
                                                if (value.Insurancereward[point_user] <= totalPoint && (radRemainPoint === 0 || value.Insurancereward.consider_require === 0) ) {
                                                hideShow = 1;
                                                }
                                                return value;
                                            })
                                        );
                                    }
                                    let newOtherRewardArray = {};
                                    for (let otherData of otherRewardData) {
                                        let otherRewardId = otherData['id'];
                                        let transName = '';
                                        if(otherData['cust_name'] && otherData['cust_name'] != ''){
                                            transName = await this.translatorService.frontendReadTranslation(req.lang,`other_reward_name_${rewardId}_${otherRewardId}`, `/LC_MESSAGES/Campaign/Campaigns/${company_id}/${campaign_id}`,`dynamic`);
                                            transName = (transName == '' || transName == `other_reward_name_${rewardId}_${otherRewardId}`) ? otherData['cust_name'] : transName;
                                        }else{
                                            transName = await this.translatorService.frontendReadTranslation(req.lang,`Other`, `/LC_MESSAGES/Dashboard/CurrentPoints`,`static`);
                                            transName = (transName == '' || transName == `Other`) ? 'Other' : transName;
                                        }
                                        if(!newOtherRewardArray[otherRewardId]){
                                            newOtherRewardArray[otherRewardId] = {};
                                        }
                                        newOtherRewardArray[otherRewardId]['id'] = otherRewardId;
                                        newOtherRewardArray[otherRewardId]['name'] = transName;
                                        newOtherRewardArray[otherRewardId]['order_id'] = otherData['order_id'];
                                        newOtherRewardArray[otherRewardId]['reward_id'] = otherData['reward_id'];
                                        newOtherRewardArray[otherRewardId]['max_point_limit'] = (typeof otherData['max_point_limit'] === 'string') ? parseFloat(otherData['max_point_limit']) : otherData['max_point_limit'];
                                        newOtherRewardArray[otherRewardId]['consider_require'] = (typeof otherData['consider_require'] === 'string') ? parseFloat(otherData['consider_require']) : otherData['consider_require'];
                                        newOtherRewardArray[otherRewardId]['point'] = (typeof otherData['point'] === 'string') ? parseFloat(otherData['point']) : otherData['point'];
                                    }
                                    element['otherReward'] = Object.values(newOtherRewardArray);
                                }else{
                                    element['otherReward'] = [];
                                }
                            }
                        }
                        if(rewards.length > 0){
                            const forminstructions = await this.campaignService.getFormInstructionData({ company_id: postData?.company_id });
                            if(forminstructions){
                                if(forminstructions['date_range'] == 1){
                                    forminstructions['pf_start_date'] = await this.commonDateService.DateTimeFormat(forminstructions['pf_start_date'], 'YYYY-MM-DD').toString();
                                    forminstructions['pf_end_date'] = await this.commonDateService.DateTimeFormat(forminstructions['pf_end_date'], 'YYYY-MM-DD').toString();
                                    forminstructions['dvf_start_date'] = await this.commonDateService.DateTimeFormat(forminstructions['dvf_start_date'], 'YYYY-MM-DD').toString();
                                    forminstructions['dvf_end_date'] = await this.commonDateService.DateTimeFormat(forminstructions['dvf_end_date'], 'YYYY-MM-DD').toString();
                                    forminstructions['ovf_start_date'] = await this.commonDateService.DateTimeFormat(forminstructions['ovf_start_date'], 'YYYY-MM-DD').toString();
                                    forminstructions['ovf_end_date'] = await this.commonDateService.DateTimeFormat(forminstructions['ovf_end_date'], 'YYYY-MM-DD').toString();
                                    forminstructions['ta_start_date'] = await this.commonDateService.DateTimeFormat(forminstructions['ta_start_date'], 'YYYY-MM-DD').toString();
                                    forminstructions['ta_end_date'] = await this.commonDateService.DateTimeFormat(forminstructions['ta_end_date'], 'YYYY-MM-DD').toString();
                                }else if(forminstructions['date_range'] == 2){
                                    forminstructions['start_date'] = await this.commonDateService.DateTimeFormat(forminstructions['start_date'], 'YYYY-MM-DD').toString();
                                    forminstructions['end_date'] = await this.commonDateService.DateTimeFormat(forminstructions['end_date'], 'YYYY-MM-DD').toString();
                                }
                            }
                            const physicianpopup = await this.campaignService.getAuthorizationPopupData({ user_id: req?.tokenUser?.id, type_of_form: 'Physician' , status: Not(2)});
                            const dentalpopup = await this.campaignService.getAuthorizationPopupData({ user_id: req?.tokenUser?.id, type_of_form: 'Dental' , status: Not(2)});
                            const optometristpopup = await this.campaignService.getAuthorizationPopupData({ user_id: req?.tokenUser?.id, type_of_form: 'Optometrist', status: Not(2) });
                            const tabaccousespopup = await this.campaignService.getTobaccousesPopupData({ user_id: req?.tokenUser?.id, type_of_form: 'Tabacco' , status: Not(2)});
                            let statuspfpopup = 'Not complete';
                            if(physicianpopup){
                                statuspfpopup = 'Complete';
                            }
                            let statustapopup = 'Not complete';
                            let tabacco_c:any = '';
                            let tabacco_d:any = '';
                            if(tabaccousespopup){
                                statustapopup = 'Complete';
                                tabacco_c = tabaccousespopup['user_id'];
                                tabacco_d = tabaccousespopup['signature'];
                            }
                            let statusdenpopup = 'Not complete';
                            if(dentalpopup){
                                statusdenpopup = 'Complete';
                            }
                            let statusovfpopup = 'Not complete';
                            if(optometristpopup){
                                statusovfpopup = 'Complete';
                            }
                            const formInstructionData = {
                                'forminstructions' : forminstructions,
                                'statuspfpopup' : statuspfpopup,
                                'statusdenpopup' : statusdenpopup,
                                'statusovfpopup' : statusovfpopup,
                                'statustapopup' : statustapopup,
                                'tabacco_c' : tabacco_c,
                                'tabacco_d' : tabacco_d,
                                'physicianpopup' : physicianpopup,
                                'dentalpopup' : dentalpopup,
                                'optometristpopup' : optometristpopup,
                                'tabaccousespopup' : tabaccousespopup
                            };
                            if(call_from == 1 || call_from == 2 || call_from == 9){
                                returnDatas['userShow'] = userData ? 1 : 0;
                                const spouseSetting = await this.spouseSettingsService.findOne({org_id: company_id});
                                returnDatas['spouseShow'] = 0;
                                if(spouseSetting && spouseSetting.hide === 0){
                                    if (spouseid != 0) {
                                        returnDatas['spouseShow'] = 1;
                                    }
                                }
                                const dueDateTextData = await this.metaService.findOne({org_id: company_id});
                                let dueDateText = dueDateTextData?.due_date_text || 'Due Date';
                                returnDatas['spouseSetting'] = (spouseSetting && spouseSetting?.hide && spouseSetting.hide === 1) ? 0 : 1;
                                returnDatas['spouse_option'] = req?.tokenUser?.company?.setting?.spouse_option || 0;
                                returnDatas['userTabName'] = await this.translatorService.frontendReadTranslation(req.lang, 'My Summary', `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`);
                                let spouseTabName = await this.translatorService.frontendReadTranslation(req.lang, 'Spouse Summary', `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`);
                                if(returnDatas['spouse_option'] == 1){
                                    spouseTabName = await this.translatorService.frontendReadTranslation(req.lang, 'Spouse Domestic Partners Summary', `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`);
                                }
                                returnDatas['spouseTabName'] = spouseTabName;
                                returnDatas['tableTitles'] = {};
                                if(call_from == 1){
                                    returnDatas['tableTitles']['c1'] = await this.translatorService.frontendReadTranslation(req.lang, 'Tasks/ Activities', `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`);
                                    returnDatas['tableTitles']['c2'] = await this.translatorService.frontendReadTranslation(req.lang, 'Required/Optional', `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`);
                                    returnDatas['tableTitles']['c3'] = await this.translatorService.frontendReadTranslation(req.lang, dueDateText, `/LC_MESSAGES/Campaign/Default/${company_id}`, `dynamic`);
                                    returnDatas['tableTitles']['c4'] = await this.translatorService.frontendReadTranslation(req.lang, 'Status', `/LC_MESSAGES/Common/Common`, `static`);
                                    returnDatas['tableTitles']['c5'] = await this.translatorService.frontendReadTranslation(req.lang, 'Date', `/LC_MESSAGES/Common/Common`, `static`);
                                }else{
                                    returnDatas['tableTitles']['c1'] = await this.translatorService.frontendReadTranslation(req.lang, 'Activities', `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`);
                                    returnDatas['tableTitles']['c2'] = await this.translatorService.frontendReadTranslation(req.lang, 'Start Date', `/LC_MESSAGES/Common/Common`, `static`);
                                    returnDatas['tableTitles']['c3'] = await this.translatorService.frontendReadTranslation(req.lang, dueDateText, `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`);
                                    returnDatas['tableTitles']['c4'] = await this.translatorService.frontendReadTranslation(req.lang, 'Required/Optional', `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`);
                                    returnDatas['tableTitles']['c5'] = await this.translatorService.frontendReadTranslation(req.lang, 'Points For Each', `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`);
                                    returnDatas['tableTitles']['c6'] = await this.translatorService.frontendReadTranslation(req.lang, 'Max Points', `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`);
                                    returnDatas['tableTitles']['c7'] = await this.translatorService.frontendReadTranslation(req.lang, 'Earned Points', `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`);
                                    returnDatas['tableTitles']['c8'] = await this.translatorService.frontendReadTranslation(req.lang, 'Completion Date', `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`);
                                }
                            }
                            if(call_from == 2 || call_from == 1 || call_from == 5  || call_from == 9){
                                let commonDatas = [ { 'userId' : user_id }, { 'roleID' : roleID }, { 'orgId' : company_id }, { 'campaign_id' : campaign_id }, { 'call_from' : call_from }, { 'call_for' : call_for }, { 'isCampaignEligible' : isCampaignEligible }, { 'isSpouseCampaignEligible' : isSpouseCampaignEligible }, { 'leaderboardCampId' : leaderboardCampId }, { 'formInstructionData' : formInstructionData }, { 'spouseShow' : returnDatas['spouseShow'] } ];
                                let rewardsdatas = await this.frontCampaginSummaryService.getFinalCampaignSummaryData(rewards, commonDatas, req);
                                if(call_from == 2 || call_from == 9 || call_from == 1){
                                    if(!returnDatas['rewards']){
                                        returnDatas['rewards'] = [];
                                    }
                                    let finalRewardDatas = JSON.parse(JSON.stringify(rewardsdatas));
                                    finalRewardDatas = await this.sortingService.sortCampaignData('asc', Object.values(finalRewardDatas), 'order', 'id');
                                    returnDatas['rewards'] = finalRewardDatas;
                                    delete(returnDatas['rewards']['requiredActivityCompleted']);
                                    delete(returnDatas['rewards']['dsahboardPointSliderData']);
                                }else if(call_from == 5){
                                    if(!returnDatas['participationSummaryData']){
                                        returnDatas['participationSummaryData'] = Object.create(null);
                                    }
                                    if(enableWidgetListData?.participationsummary == 1){
                                        let requiredActivityCompleted = rewardsdatas['requiredActivityCompleted'] || 0;
                                        let totalActivityRequiredPoints = rewardsdatas['totalActivityRequiredPoints'] || 0;
                                        let totalActivityCompletedPoints = rewardsdatas['totalActivityCompletedPoints'] || 0;
                                        returnDatas['participationSummaryData']['RequiredActivities'] = campaignRequiredActivities;
                                        returnDatas['participationSummaryData']['completedActivity'] = requiredActivityCompleted;
                                        returnDatas['participationSummaryData']['UpcomingDeadlines'] = campaignUpcomingDeadlines;
                                        returnDatas['participationSummaryData']['RequiredPoints'] = totalActivityRequiredPoints;
                                        returnDatas['participationSummaryData']['CompletedPoints'] = totalActivityCompletedPoints;
                                    }
                                    let dashboardPointSliderData = rewardsdatas['dsahboardPointSliderData'] || [];
                                    if(!returnDatas['PointSliderData']){
                                        returnDatas['PointSliderData'] = Object.create(null);
                                    }
                                    returnDatas['PointSliderData'] = JSON.parse(JSON.stringify(dashboardPointSliderData));
                                }
                            }
                        }
                    }
                }
            }else{
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: 0,
                    error: 1,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req?.lang, "ERR_ACCESS_DENIED")
                });
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: returnDatas,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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

    @Post('campaign-current-points')
    async getCurrentPointsData(@Req() req: Request, @Res() res: Response, @Body() postData: FrontCampaignInput) {
        try {
            const roleId = req?.tokenUser?.role_id || 0;
            let loginUserId = req?.tokenUser?.id;
            let user_id = loginUserId;
            if (!postData?.company_id || !postData?.call_from) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const company_id = Number(postData?.company_id);
            if(![2,16].includes(roleId)){
                user_id = postData?.user_id;
            }
            let call_from = Number(postData?.call_from);
            let call_for = postData?.call_for || '';
            if(postData?.call_for === undefined || postData?.call_for === null){
                postData.call_for = 'current';
            }
            const activePlugins = await this.activePluginService.getActivePluginList(company_id);
            let returnDatas = {};
            if(activePlugins.includes('Incentive')){
                postData.department_id = req?.tokenUser?.department_id;
                postData.location_id = req?.tokenUser?.location;
                const campaignsData = await this.campaignService.getCampaignData(postData, req);
                if (!campaignsData) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
                }
                const getUserWhere = { id: user_id };
                let userData = await this.userService.findOne(getUserWhere);
                if(userData) {
                    const isCampaignEligible = userData?.is_camp_eligible || 0;
                    const roleID = userData?.role_id || 0;
                    const relationshipID = userData?.relationship_id || 0;
                    const userCode = userData?.code || '';
                    const timezone = userData?.timezone || 'UTC';
                    let spouseid = 0;
                    const userHireDate = userData?.date_of_hire || '';
                    let spouseHireDate = '';
                    let leaderboardCampId = req?.tokenUser?.company?.setting?.campaign_id || '';
                    let dashboardPointLeaboard = req?.tokenUser?.company?.setting?.dashboard_point_leaboard || '';
                    let hideShow = dashboardPointLeaboard == 0 ? 1 : 0;
                    let point_user = 'point_user';
                    let r_by_data = 'required_by_user';
                    let required_by_spouse = "required_by_spouse";
                    let required_by_user = "required_by_user";
                    if (roleID == 16) {
                        point_user = 'point_spouse';
                        r_by_data = 'required_by_spouse';
                        required_by_spouse = "required_by_user";
                        required_by_user = "required_by_spouse";
                    }
                    let spouseinfo = Object.create(null);
                    let isSpouseCampaignEligible = 0;
                    if (roleID == 16) {
                        spouseinfo = await this.userService.findOne({ code : relationshipID },['user.id','user.code','user.date_of_hire']);
                    } else {
                        spouseinfo = await this.userService.findOne({ relationship_id : userCode },['user.id','user.code','user.date_of_hire']);
                    }
                    if (spouseinfo) {
                        spouseHireDate = spouseinfo['date_of_hire'];
                        spouseid = spouseinfo['id'];
                        isSpouseCampaignEligible = spouseinfo['is_camp_eligible'] || 0;
                    }

                    returnDatas['userShow'] = userData ? 1 : 0;
                    returnDatas['spouseShow'] = spouseinfo ? 1 : 0;
                    const spouseSetting = await this.spouseSettingsService.findOne({org_id: company_id});
                    returnDatas['spouseSetting'] = (spouseSetting && spouseSetting?.hide) ? spouseSetting?.hide : 0;
                    returnDatas['spouse_option'] = req?.tokenUser?.company?.setting?.spouse_option || 0;
                    returnDatas['userTabName'] = await this.translatorService.frontendReadTranslation(req.lang, 'My Current Points', `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`);
                    let spouseTabName = await this.translatorService.frontendReadTranslation(req.lang, 'Spouse Current Points', `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`);
                    if(returnDatas['spouse_option'] == 1){
                        spouseTabName = await this.translatorService.frontendReadTranslation(req.lang, 'Spouse Domestic Partners Current Points', `/LC_MESSAGES/Dashboard/ParticipationSummary`, `static`);
                    }
                    returnDatas['spouseTabName'] = spouseTabName;
                    for (const campaign of campaignsData) {
                        let campaign_id = campaign['id'];
                        let getRewardCondition: any = `reward.campaign_id = ${campaign_id} AND reward.status = 1`;
                        let orderBy = { order_id: 'ASC' };
                        let rewards: any = await this.campaignDashboardService.getRewardsData(getRewardCondition, orderBy);
                        if(!rewards || rewards.length === 0) {
                            rewards = [];
                        } else {
                            let HealthyHabittotalPoint = [];
                            let campaignRequiredActivities = 0;    
                            let campaignUpcomingDeadlines = 0;
                            for (let element of rewards) {
                                let rewardRequiredActivities = 0;    
                                let rewardUpcomingDeadlines = 0;
                                const hireDateCount = element['hire_date_count'] || 0;
                                const hireDateSetting = element['hire_date'] || 0;
                                const rewardId = element['id'];
                                element['remainpoint'] = 0;
                                let showRewards = false;
                                if ((isCampaignEligible == 1 && element['eligibility'] == 1) || (isCampaignEligible == 0 && element['eligibility'] == 2)) {
                                    showRewards = true;
                                }
                                if ((roleID == 2 && element['eligibility'] == 7) || (roleID == 2 && isCampaignEligible == 1 && element['eligibility'] == 3) || (roleID == 2 && isCampaignEligible == 0 && element['eligibility'] == 4)) {
                                    showRewards = true;
                                }
                                if ((roleID == 16 && element['eligibility'] == 8) || (roleID == 16 && isCampaignEligible == 1 && element['eligibility'] == 5) || (roleID == 16 && isCampaignEligible == 0 && element['eligibility'] == 6)) {
                                    showRewards = true;
                                }
                                if (element['eligibility'] == 0 || showRewards) {
                                    let actPoints = 0;
                                    let totalPoint = 0;
                                    let actPointsS = 0;
                                    let totalPointS = 0;
                                    let categorySpouse:any = [];
                                    let activitySpouse = {};
                                    let challengeSpouse = {};
                                    let category:any = [];
                                    element['CampaignId'] = campaign_id;
                                    if (element['related_category'] != "") {
                                        category = await this.campaignDashboardService.rewardItemGetDetails('related_category', element);
                                        if (spouseid != 0) {
                                            categorySpouse = JSON.parse(JSON.stringify(category));
                                        }
                                    }
                                    if (element['related_activity'] != "") {
                                        let activity = await this.campaignDashboardService.rewardItemGetDetails('related_activity', element);
                                        if (spouseid != 0) {
                                            activitySpouse = JSON.parse(JSON.stringify(activity));
                                        }
                                        let actOtherData = [ { 'dateCalType' : 'activity' }, { 'category' : category }, { 'user_id' : user_id }, { 'activePlugins' : activePlugins }, { 'hireDate' : userHireDate }, { 'hire_date' : element['hire_date'] }, { 'company_id' : company_id }, { 'timezone' : timezone }, { 'r_by_data' : r_by_data }, { 'rewardId' : element['id'] }, { 'campaignId' : campaign_id }, { 'HealthyHabittotalPoint' : HealthyHabittotalPoint }, { 'hireDateCount' : hireDateCount }, { 'hireDateSetting' : hireDateSetting }];
                                        const returnArray = await this.frontPointsForService.points_for_activities(call_from, activity, actOtherData);
                                        activity = JSON.parse(JSON.stringify(returnArray['activity']));
                                        category = JSON.parse(JSON.stringify(returnArray['category']));
                                        element['Campaignactivity'] = JSON.parse(JSON.stringify(activity));
                                        element['remainpoint'] = returnArray['remainPoint'] || 0;
                                        rewardRequiredActivities += returnArray['requiredActivities'];
                                        rewardUpcomingDeadlines += returnArray['upcomingDeadlines'];
                                        campaignRequiredActivities += rewardRequiredActivities;    
                                        campaignUpcomingDeadlines += rewardUpcomingDeadlines;
                                        actPoints += returnArray['actPoints'] || 0;
                                        totalPoint += returnArray['totalPoint'] || 0;
                                        HealthyHabittotalPoint = [...HealthyHabittotalPoint, ...returnArray['HealthyHabittotalPoint']];
                                        if (spouseid != 0) {
                                            let spouseTimezone = spouseinfo['timezone'] || 'UTC';
                                            let spouseHireDate = spouseinfo['date_of_hire'] || '';
                                            let actSOtherData = [ { 'dateCalType' : 'activity' }, { 'category' : categorySpouse }, { 'user_id' : spouseid }, { 'activePlugins' : activePlugins }, { 'hireDate' : spouseHireDate }, { 'hire_date' : element['hire_date'] }, { 'company_id' : company_id }, { 'timezone' : spouseTimezone }, { 'r_by_data' : r_by_data }, { 'rewardId' : element['id'] }, { 'campaignId' : campaign_id }, { 'HealthyHabittotalPoint' : HealthyHabittotalPoint }, { 'hireDateCount' : hireDateCount }, { 'hireDateSetting' : hireDateSetting }];
                                            const returnArrayS = await this.frontPointsForService.points_for_activities(call_from, activitySpouse, actSOtherData);
                                            activitySpouse = JSON.parse(JSON.stringify(returnArrayS['activity']));
                                            categorySpouse = JSON.parse(JSON.stringify(returnArrayS['category']));
                                            actPointsS += returnArrayS['actPoints'] || 0;
                                            totalPointS += returnArrayS['totalPoint'] || 0;
                                            element['CampaignSpouseactivity'] = JSON.parse(JSON.stringify(activitySpouse));
                                        }else{
                                            element['CampaignSpouseactivity'] = [];
                                        }
                                    }
                                    if (element['related_challenge'] != "") {
                                        let challenges = await this.campaignDashboardService.rewardItemGetDetails('related_challenge', element);
                                        if (spouseid != 0) {
                                            challengeSpouse = JSON.parse(JSON.stringify(challenges));
                                        }
                                        if(!element['Campaignchallenges']){
                                            element['Campaignchallenges'] = [];
                                        }
                                        const returnArray = await this.frontPointsForService.points_for_challenges(challenges, user_id, hireDateSetting, userHireDate, company_id, hireDateCount);
                                        element['Campaignchallenges'] = JSON.parse(JSON.stringify(returnArray));
                                        if(!element['CampaignSpousechallenges']){
                                            element['CampaignSpousechallenges'] = [];
                                        }
                                        if (spouseid != 0) {
                                            const returnArrayS = await this.frontPointsForService.points_for_challenges(challengeSpouse, spouseid, hireDateSetting, spouseHireDate, company_id, hireDateCount );
                                            element['CampaignSpousechallenges'] = JSON.parse(JSON.stringify(returnArrayS));
                                        }
                                    }
                                    if(category){
                                        let actOtherData = [ { 'dateCalType' : 'category' }, { 'user_id' : user_id }, { 'activePlugins' : activePlugins }, { 'hireDate' : userHireDate }, { 'hire_date' : element['hire_date'] }, { 'company_id' : company_id }, { 'timezone' : timezone }, { 'r_by_data' : r_by_data }, { 'rewardId' : element['id'] }, { 'campaignId' : campaign_id }, { 'actPoints' : actPoints }, { 'totalPoint' : totalPoint }, { 'hireDateCount' : hireDateCount }, { 'hireDateSetting' : hireDateSetting }];
                                        const returnArrayC = await this.frontPointsForService.point_for_category(call_from, category, actOtherData);
                                        category = JSON.parse(JSON.stringify(returnArrayC['category']));
                                        element['Campaigncategory'] = JSON.parse(JSON.stringify(category));
                                        actPoints = JSON.parse(JSON.stringify(returnArrayC['actPoints'])) || 0;
                                        totalPoint = JSON.parse(JSON.stringify(returnArrayC['totalPoint'])) || 0;
                                        rewardRequiredActivities += returnArrayC['requiredActivities'];
                                        rewardUpcomingDeadlines += returnArrayC['upcomingDeadlines'];
                                        campaignRequiredActivities += rewardRequiredActivities;    
                                        campaignUpcomingDeadlines += rewardUpcomingDeadlines;
                                        if (spouseid != 0 && categorySpouse.length > 0) {
                                            let spouseTimezone = spouseinfo['timezone'] || 'UTC';
                                            let spouseHireDate = spouseinfo['date_of_hire'] || '';
                                            let actSOtherData = [ { 'dateCalType' : 'category' }, { 'user_id' : spouseid }, { 'activePlugins' : activePlugins }, { 'hireDate' : spouseHireDate }, { 'hire_date' : element['hire_date'] }, { 'company_id' : company_id }, { 'timezone' : spouseTimezone }, { 'r_by_data' : r_by_data }, { 'rewardId' : element['id'] }, { 'campaignId' : campaign_id }, { 'actPoints' : actPoints }, { 'totalPoint' : totalPoint }, { 'hireDateCount' : hireDateCount }, { 'hireDateSetting' : hireDateSetting }];
                                            const returnArraySC = await this.frontPointsForService.point_for_category(call_from, categorySpouse, actSOtherData);
                                            categorySpouse = JSON.parse(JSON.stringify(returnArraySC['category']));
                                            actPointsS = returnArraySC['actPoints'] || 0;
                                            totalPointS = returnArraySC['totalPoint'] || 0;
                                            element['CampaignSpousecategory'] = JSON.parse(JSON.stringify(categorySpouse));
                                        }else{
                                            element['CampaignSpousecategory'] = [];
                                        }
                                    }
                                    element['point'] = (totalPoint)? totalPoint : '';
                                    element['actpoint'] = (actPoints) ? actPoints : '';
                                    element['pointS'] = (totalPointS) ? totalPointS : '';
                                    element['actpointS'] = (actPointsS) ? actPointsS : '';
                                    element['RequiredActivities'] = rewardRequiredActivities ?? 0;
                                    element['UpcomingDeadlines'] = rewardUpcomingDeadlines ?? 0;
                                    if(element['ins_reward'] == 1){
                                        let insRewardData = await this.campaignDashboardService.rewardItemGetDetails('insurance_reward', element);
                                        if (call_from == 1 && dashboardPointLeaboard == 1 && hideShow == 0 &&  campaign_id == leaderboardCampId) {
                                            let radRemainPoint = element['remainpoint'];
                                            await Promise.all(
                                                insRewardData.map((value: any) => {
                                                    if (value.Insurancereward[point_user] <= totalPoint && (radRemainPoint === 0 || value.Insurancereward.consider_require === 0) ) {
                                                        hideShow = 1;
                                                    }
                                                    return value;
                                                })
                                            );
                                        }
                                        let newInsRewardArray = {};
                                        for (let insData of insRewardData) {
                                            let insRewardId = insData['id'];
                                            let transName = await this.translatorService.frontendReadTranslation(req.lang,`ins_reward_name_${rewardId}_${insRewardId}`, `/LC_MESSAGES/Campaign/Campaigns/${company_id}/${campaign_id}`,`dynamic`);
                                            if(insData['cust_name'] && insData['cust_name'] != ''){
                                                transName = (transName == '' || transName == `ins_reward_name_${rewardId}_${insRewardId}`) ? insData['cust_name'] : transName;
                                            }else{
                                                transName = (transName == '' || transName == `ins_reward_name_${rewardId}_${insRewardId}`) ? insData['insuranceplan']['plan_name'] : transName;
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
                                        if (call_from == 1 && dashboardPointLeaboard == 1 && hideShow == 0 &&  campaign_id == leaderboardCampId) {
                                            let radRemainPoint = element['remainpoint'];
                                            await Promise.all(
                                                cashRewardData.map((value: any) => {
                                                    if (value.Insurancereward[point_user] <= totalPoint && (radRemainPoint === 0 || value.Insurancereward.consider_require === 0) ) {
                                                    hideShow = 1;
                                                    }
                                                    return value;
                                                })
                                            );
                                        }
                                        let newCashRewardArray = {};
                                        for (let cashData of cashRewardData) {
                                            let cashRewardId = cashData['id'];
                                            let transName = '';
                                            if(cashData['cust_name'] && cashData['cust_name'] != ''){
                                                transName = await this.translatorService.frontendReadTranslation(req.lang,`cash_reward_name_${rewardId}_${cashRewardId}`, `/LC_MESSAGES/Campaign/Campaigns/${company_id}/${campaign_id}`,`dynamic`);
                                                transName = (transName == '' || transName == `cash_reward_name_${rewardId}_${cashRewardId}`) ? cashData['cust_name'] : transName;
                                            }else{
                                                transName = await this.translatorService.frontendReadTranslation(req.lang,`Cash`, `/LC_MESSAGES/Dashboard/CurrentPoints`,`static`);
                                                transName = (transName == '' || transName == `Cash`) ? 'Cash' : transName;
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
                                        if (call_from == 1 && dashboardPointLeaboard == 1 && hideShow == 0 &&  campaign_id == leaderboardCampId) {
                                            let radRemainPoint = element['remainpoint'];
                                            await Promise.all(
                                                otherRewardData.map((value: any) => {
                                                    if (value.Insurancereward[point_user] <= totalPoint && (radRemainPoint === 0 || value.Insurancereward.consider_require === 0) ) {
                                                    hideShow = 1;
                                                    }
                                                    return value;
                                                })
                                            );
                                        }
                                        let newOtherRewardArray = {};
                                        for (let otherData of otherRewardData) {
                                            let otherRewardId = otherData['id'];
                                            let transName = '';
                                            if(otherData['cust_name'] && otherData['cust_name'] != ''){
                                                transName = await this.translatorService.frontendReadTranslation(req.lang,`other_reward_name_${rewardId}_${otherRewardId}`, `/LC_MESSAGES/Campaign/Campaigns/${company_id}/${campaign_id}`,`dynamic`);
                                                transName = (transName == '' || transName == `other_reward_name_${rewardId}_${otherRewardId}`) ? otherData['cust_name'] : transName;
                                            }else{
                                                transName = await this.translatorService.frontendReadTranslation(req.lang,`Other`, `/LC_MESSAGES/Dashboard/CurrentPoints`,`static`);
                                                transName = (transName == '' || transName == `Other`) ? 'Other' : transName;
                                            }
                                            if(!newOtherRewardArray[otherRewardId]){
                                                newOtherRewardArray[otherRewardId] = {};
                                            }
                                            newOtherRewardArray[otherRewardId]['id'] = otherRewardId;
                                            newOtherRewardArray[otherRewardId]['name'] = transName;
                                            newOtherRewardArray[otherRewardId]['order_id'] = otherData['order_id'];
                                            newOtherRewardArray[otherRewardId]['reward_id'] = otherData['reward_id'];
                                            newOtherRewardArray[otherRewardId]['max_point_limit'] = (typeof otherData['max_point_limit'] === 'string') ? parseFloat(otherData['max_point_limit']) : otherData['max_point_limit'];
                                            newOtherRewardArray[otherRewardId]['consider_require'] = (typeof otherData['consider_require'] === 'string') ? parseFloat(otherData['consider_require']) : otherData['consider_require'];
                                            newOtherRewardArray[otherRewardId]['point'] = (typeof otherData['point'] === 'string') ? parseFloat(otherData['point']) : otherData['point'];
                                        }
                                        element['otherReward'] = Object.values(newOtherRewardArray);
                                    }else{
                                        element['otherReward'] = [];
                                    }
                                }
                            }
                            if(rewards.length > 0){
                                const spouseSetting = await this.spouseSettingsService.findOne({org_id: company_id});
                                let spouseShow = 0;
                                if(spouseSetting && spouseSetting.hide === 0){
                                    if (spouseid != 0) {
                                        spouseShow = 1;
                                    }
                                }
                                let commonDatas = [ { 'userId' : user_id }, { 'roleID' : roleID }, { 'orgId' : company_id }, { 'campaign_id' : campaign_id }, { 'call_from' : call_from }, { 'call_for' : call_for }, { 'isCampaignEligible' : isCampaignEligible }, { 'isSpouseCampaignEligible' : isSpouseCampaignEligible }, { 'leaderboardCampId' : leaderboardCampId }, { 'spouseShow' : spouseShow }];
                                let rewardsdatas = await this.frontCampaginSummaryService.getFinalCurrentPointData(rewards, commonDatas, req);
                                if(!returnDatas['rewards']){
                                    returnDatas['rewards'] = {};
                                }
                                let finalRewardDatas = JSON.parse(JSON.stringify(rewardsdatas));
                                finalRewardDatas = await this.sortingService.sortCampaignData('asc', Object.values(finalRewardDatas), 'order', 'id');
                                returnDatas['rewards'][campaign_id] = finalRewardDatas;
                                delete(returnDatas['rewards'][campaign_id]['requiredActivityCompleted']);
                            }
                        }
                    }
                }
            }else{
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: 0,
                    error: 1,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req?.lang, "ERR_ACCESS_DENIED")
                });
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: returnDatas,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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

    @Post('campaign-leaderboard')
    async getLeaderboardData(@Req() req: Request, @Res() res: Response, @Body() postData: FrontCampaignInput) {
        try {
            if (!postData?.company_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const company_id = Number(postData?.company_id);
            const userCode = req?.tokenUser?.code || '';
            const user_id = req?.tokenUser?.id;
            const deptId = req?.tokenUser?.department_id || 0;
            const locId = req?.tokenUser?.location || 0;
            const membershipCode = req?.tokenUser?.membership_code || '';
            postData['department_id'] = deptId;
            postData['location_id'] = locId;
            postData['call_from'] = '1';
            let showLeaderBoard = req.tokenUser?.company?.setting?.pointsleaderboard || 0;
            let showLeaderBoardMinPoint = req.tokenUser?.company?.setting?.pointsleaderboardmin || 0;
            const is_pointsleaderboardpopup = req?.tokenUser?.company?.setting?.pointsleaderboardpopup || 0;
            const activePlugins = await this.activePluginService.getActivePluginList(company_id);
            let returnDatas = {};
            if(activePlugins.includes('Incentive')){
                const sliderSetting = await this.sliderSettingsService.findOne({ org_id: company_id });
                let pointsleaderboardpopupcond = '';
                if(is_pointsleaderboardpopup == 1){
                    pointsleaderboardpopupcond = ' AND u_setting.is_pointsleaderboardpopup = 1';
                }
                let leaderboardCampId = req?.tokenUser?.company?.setting?.campaign_id || '';
                let checkCampaign:any = [];
                const currentDate = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD');
                if(leaderboardCampId != ''){
                    let checkCampaignCondition: any = `campaign.id = ${leaderboardCampId} AND campaign.organization_id = ${company_id}`;
                    checkCampaign = await this.campaignService.findOne(checkCampaignCondition);
                }else{
                    checkCampaign = await this.campaignService.getCampaignData(postData, req, ['campaign.id', 'campaign.location_ids', 'campaign.department_ids', 'campaign.campaign_name', 'campaign.tab_titled', 'campaign.tab_order', 'campaign.d_start_date', 'campaign.d_end_date', 'campaign.start_date', 'campaign.end_date']);
                }
                if (!checkCampaign || checkCampaign.length === 0) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_CAMPAIGN_RECORD_NOT_FOUND'));
                }
                if(leaderboardCampId == '' && checkCampaign.length > 0){
                    checkCampaign = checkCampaign[0];
                }
                let campaignId = checkCampaign['id'];
                let transName = await this.translatorService.frontendReadTranslation(req.lang,`campaign_name_${campaignId}`, `/LC_MESSAGES/Campaign/Campaigns/${postData?.company_id}/${campaignId}`,`dynamic`);
                transName = (transName == '' || transName == `campaign_name_${campaignId}`) ? checkCampaign['campaign_name'] : transName;
                checkCampaign['campaign_name'] = transName;
                let transName1 = await this.translatorService.frontendReadTranslation(req.lang,`campaign_tab_titled_${campaignId}`, `/LC_MESSAGES/Campaign/Campaigns/${postData?.company_id}/${campaignId}`,`dynamic`);
                transName1 = (transName1 == '' || transName1 == `campaign_tab_titled_${campaignId}`) ? checkCampaign['tab_titled'] : transName1;
                checkCampaign['tab_titled'] = transName1;
                returnDatas['campaignName'] = checkCampaign['campaign_name'];
                returnDatas['tabTitle'] = checkCampaign['tab_titled'];
                let getRewardCondition: any = `reward.campaign_id = ${campaignId} AND reward.status = 1`;
                let orderBy = { order_id: 'ASC' };
                let rewards: any = await this.campaignDashboardService.getRewardsData(getRewardCondition, orderBy);
                let campaignData = {};
                if(rewards || rewards.length > 0) {
                    let otherCondition = '';
                    if((checkCampaign['department_ids'] != 0 && checkCampaign['department_ids'] != '') || (checkCampaign['location_ids'] != 0 && checkCampaign['location_ids'] != '')){
                        if(checkCampaign['department_ids'] != 0 && checkCampaign['department_ids'] != ''){
                            if(checkCampaign['location_ids'] != 0 && checkCampaign['location_ids'] != ''){
                                otherCondition = `user.department_id in(${checkCampaign['department_ids']}) AND user.location in(${checkCampaign['location_ids']}) AND `;
                            }else{
                                otherCondition = `user.department_id in(${checkCampaign['department_ids']}) AND `;
                            }
                        }else{
                            otherCondition = `user.location in(${checkCampaign['location_ids']}) AND `;
                        }
                    }
                    const joinTableList = [{'alias':'u_setting', 'table' : tableConstant.TBL_USERS_SETTINGS, 'on' : `u_setting.user_id = user.id` , 'connect' : 'user', 'type' : 'LEFT' }];
                    let userCondition = `user.role_id IN (2,16) AND user.membership_code = '${membershipCode}' AND user.status = 1 ${pointsleaderboardpopupcond}`;
                    let userDatas = await this.campaignDashboardService.getAllUsers(userCondition, ['user.id', 'user.first_name', 'user.last_name', 'user.profile_image', 'user.code', 'user.date_of_hire'],joinTableList);
                    let totalUsers = userDatas.length;

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
                        
                    let rewOtherData = [ { 'membershipCode' : membershipCode }, { 'otherCondition' : otherCondition }, { 'company_id' : company_id }, { 'campaignId' : campaignId },{ 'activePlugins' : activePlugins }, { 'campaignId' : campaignId }, { 'allUsersDOHInfoData' : allUsersDOHInfoData }];
                    let rewardDatas = await this.campaignDashboardService.getMultiRewarddatas(6, rewards, rewOtherData, req);
                    campaignData = rewardDatas;
                   
                    let rewardWiseUsers = new Map();
                    let camOtherData = [ { 'membershipCode' : membershipCode }, { 'totalUsers' : totalUsers }, { 'userDatas' : userDatas }, { 'company_id' : company_id }, { 'campaignId' : campaignId },{ 'activePlugins' : activePlugins }, { 'campaignId' : campaignId }];
                    let rewardWiseUserDatas = await this.frontCalculationService.getCampaignUserCalculation(6, campaignData, camOtherData, req);
                    let skl = 0;
                    for (let r of rewards) {
                        let userPointsTotal = rewardWiseUserDatas[skl]['userPointsTotal'] || {};
                        rewardWiseUsers[skl] = userPointsTotal;
                        skl++;
                    }
                    let usersdatatmp = new Map();
                    for (let uData of userDatas) {
                        if(Object.keys(rewardWiseUsers).length > 0){
                            for (let [outerKey, innerMap] of Object.entries(rewardWiseUsers)) {
                                let aaa = Object.entries(innerMap);
                                const result = aaa.find(([key]) => key === uData['id'].toString());
                                if(result){
                                    if(uData['Point']){
                                        uData['Point'] += result[1]['Total'];
                                    }else{
                                        uData['Point'] = result[1]['Total'];
                                    }
                                }
                            }
                            if(uData?.['Point']){
                                if(uData['profile_image'] == '' || uData['profile_image'] == null){
                                    uData['profile_image'] = S3_URL + "comn/img/avatar_0001.png";
                                }else{
                                    uData['profile_image'] = S3_URL + uData['profile_image'];
                                }
                                usersdatatmp[uData['id']]= uData;
                            }
                        }
                    }
                    let loginUserPoint = 0;
                    if(Object.keys(usersdatatmp).length > 0){
                        if(usersdatatmp[user_id]){
                            loginUserPoint = usersdatatmp[user_id]['Point'];
                        }
                    }
                    if(loginUserPoint >= showLeaderBoardMinPoint && showLeaderBoard == 1 && Object.keys(usersdatatmp).length > 0){
                        let returnDatasSort = await this.sortingService.sortCampaignData('desc', Object.values(usersdatatmp), 'Point', 'full_name');
                        let top9Users = returnDatasSort.slice(0, 9);
                        const userIds = top9Users.map(user => user.id);
                        if(userIds.includes(user_id)){
                            top9Users = returnDatasSort.slice(0, 10);
                            for (let t9user of top9Users) {
                                t9user['rank'] = returnDatasSort.findIndex(user => user.id === t9user.id) + 1;
                            }
                        }else{
                            let specificUser = returnDatasSort.find(user => user.id === user_id);
                            const specificUserIndex = returnDatasSort.findIndex(user => user.id === user_id);
                            if(!specificUser['rank']){
                                specificUser['rank'] = 0;
                            }
                            specificUser['rank'] = specificUserIndex + 1;
                            for (let t9user of top9Users) {
                                t9user['rank'] = returnDatasSort.findIndex(user => user.id === t9user.id) + 1;
                            }
                            top9Users.splice(10, 0, specificUser);
                        }
                        if(!returnDatas['users']){
                            returnDatas['users'] = [];
                        }
                        returnDatas['users'] = top9Users;
                    }
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_CAMPAIGN_RECORD_NOT_FOUND"));
                }
            }else{
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
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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

    @Post('campaign-list')
    async campaignList(@Req() req: Request, @Res() res: Response, @Body() postData: FrontCampaignInput){
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!this.commonService.isValidNumber(postData?.org_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let result: any = await this.campaignService.campaignDetailsData(['ca.id','ca.campaign_name'],{organization_id: postData?.org_id, status: Not('2')},{ 'ca.id' : 'ASC' },[{'join_table': 'ca.co','alias':'co', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on_condition' : `co.id = ca.organization_id`, 'join_type': 'left_one' }],'getMany');
            result = <any>(
                await this.commonArrayService.formatToDto(CampaignDto, result, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
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
