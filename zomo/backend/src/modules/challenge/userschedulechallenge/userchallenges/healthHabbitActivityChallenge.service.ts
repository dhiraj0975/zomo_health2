import { CommonDateService, CommonHealthService, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { Request } from "express";
import { ActivityService } from "src/modules/activity/activity/activity.service";
import { CampaignService } from "src/modules/campaign/campaign/campaign.service";
import { CampaignActivityService } from "src/modules/campaign/campaignactivity/campaignactivity.service";
import { CampaignCategoryService } from "src/modules/campaign/category/campaigncategory.service";
import { CustomPointService } from "src/modules/campaign/custompoint/custompoint.service";
import { CampaignRewardService } from "src/modules/campaign/reward/campaignreward.service";
import { ActivePluginService } from "src/modules/company/activeplugins/activeplugin.service";
import { AssessmentHraBiometricService } from "src/modules/healthassessment/assessmenthrabiometrics/assessmenthrabiometric.service";
import { AssessmentsService } from "src/modules/healthassessment/assessments/assessments.service";
import { AuthorizationsService } from "src/modules/healthcheckup/authorizations/authorizations.service";
import { BiometricsService } from "src/modules/healthcheckup/biometrics/biometrics.service";
import { DentistsService } from "src/modules/healthcheckup/dentists/dentists.service";
import { OptometristsService } from "src/modules/healthcheckup/optometrists/optometrists.service";
import { TobaccoUsesService } from "src/modules/healthcheckup/tobaccouses/tobaccouses.service";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { ActivityFeedService } from "src/modules/trackers/activityfeeds/activityfeeds.service";
import { FoodFeedService } from "src/modules/trackers/foodfeeds/foodfeeds.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { Not } from "typeorm";
import { DaysUsersService } from "../../daysusers/daysusers.service";
import { HealthActivityService } from "../../healthactivity/healthactivity.service";
import { HealthUsersActivityService } from "../../healthusersactivity/healthusersactivity.service";
import { ScheduleChallengeJoinUsersService } from "../../schedulechallengejoinusers/schedulechallengejoinusers.service";
import { UserChallengeHelperService } from "../userChallengeHelper.service";
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD
@Injectable()
export class HealthHabbitActivityChallengeService {
    constructor(
        private readonly translatorService: TranslationService,
        private readonly commonDateService: CommonDateService,
        private readonly commonHealthService: CommonHealthService,
        private readonly biometricsService: BiometricsService,
        private readonly healthActivityService: HealthActivityService,
        private readonly activityFeedsService: ActivityFeedService,
        private readonly foodFeedsService: FoodFeedService,
        private readonly tobaccoUsesService: TobaccoUsesService,
        private readonly authorizationsService: AuthorizationsService,
        private readonly assessmentsService: AssessmentsService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly healthUsersActivityService: HealthUsersActivityService,
        private readonly daysUsersService: DaysUsersService,
        private readonly userChallengeHelperService: UserChallengeHelperService,
        private readonly activePluginService: ActivePluginService,
        private readonly campaignService: CampaignService,
        private readonly campaignRewardService: CampaignRewardService,
        private readonly campaignCategoryService: CampaignCategoryService,
        private readonly campaignActivityService: CampaignActivityService,
        private readonly customPointService: CustomPointService,
        private readonly assessmentHraBiometricsService: AssessmentHraBiometricService,
        private readonly dentistsService: DentistsService,
        private readonly optometristsService: OptometristsService,
        private readonly activityService: ActivityService,
        private readonly activityLogService: ActivityLogService,
    ) {}

    async healthyHabitTotalPoint(startdate, enddate, req: Request){
        try{
            let HealthyHabittotalPoint = [];
            let campaign = [];
            let allcampaign = [];
            let authUser = Object.create(req.tokenUser);
            let orgaid = authUser.org_id;
            let usrid = authUser.id;
            let locid = authUser.location;
            let deptid = authUser.department_id;
            let defaulttimezone
            let TimeZonecc
            let timeZone = authUser.timezone;
            if(timeZone !=''){
                defaulttimezone = 'UTC';
                defaulttimezone = moment.tz(defaulttimezone).format('YYYY-MM-DD HH:mm:ss');
                TimeZonecc = moment.tz(timeZone).format('YYYY-MM-DD HH:mm:ss');
            }

            let activeplugin = await this.activePluginService.getActivePluginList(orgaid);
            let current_datetime = moment.tz(this.commonDateService.getTodayDate(), authUser['timeZone']).format('YYYY-MM-DD HH:mm:ss');
            if (activeplugin.includes('Incentive')) {
                let date = `${this.commonDateService.getTodayDate(current_datetime).format('YYYY-MM-DD')} 00:00:00`;
                let campaign = await this.campaignService.listRecord(`campaign.organization_id = ${orgaid} 
                    AND '${date}' BETWEEN campaign.d_start_date
                    AND campaign.d_end_date 
                    AND campaign.start_date >= '${startdate} 00:00:00'
                    AND campaign.end_date <= '${enddate} 23:59:59'
                    AND campaign.status = 1
                    AND(
                    campaign.department_ids REGEXP '^${deptid},' OR
                    campaign.department_ids REGEXP ',${deptid}$' OR
                    campaign.department_ids REGEXP ',${deptid},' OR
                    campaign.department_ids = ${deptid} OR
                    campaign.department_ids = '0'
                    )
                    AND(
                    campaign.location_ids REGEXP '^${locid},' OR
                    campaign.location_ids REGEXP ',${locid}$' OR
                    campaign.location_ids REGEXP ',${locid},' OR
                    campaign.location_ids = ${locid} OR
                    campaign.location_ids IS null OR
                    campaign.location_ids = '0'
                    )
                    `,null,['campaign']);
                    if(campaign && campaign.length == 0){
                        campaign = await this.campaignService.listRecord(`campaign.organization_id = ${orgaid} 
                            AND campaign.start_date >= '${startdate} 00:00:00'
                            AND campaign.end_date <= '${enddate} 23:59:59'
                            AND campaign.status = 1
                            AND(
                            campaign.department_ids REGEXP '^${deptid},' OR
                            campaign.department_ids REGEXP ',${deptid}$' OR
                            campaign.department_ids REGEXP ',${deptid},' OR
                            campaign.department_ids = ${deptid} OR
                            campaign.department_ids = 0
                            )
                            AND(
                            campaign.location_ids REGEXP '^${locid},' OR
                            campaign.location_ids REGEXP ',${locid}$' OR
                            campaign.location_ids REGEXP ',${locid},' OR
                            campaign.location_ids = ${locid} OR
                            campaign.location_ids is null OR
                            campaign.location_ids = 0
                            )
                            `,{end_date: 'DESC'},['campaign']);
                            if(campaign.length !== 0){
                                campaign[0] = campaign[0];
                            }
                    }
                    if(campaign && campaign.length){
                        await Promise.all(campaign.map(async (ele)=>{
                            if(ele.campaign_name){
                                let customName = await this.translatorService.frontendReadTranslation(req.lang,`campaign_name_${ele['id']}`, `/LC_MESSAGES/Campaign/Campaigns/${ele['organization_id']}`,`dynamic`);
                                ele.campaign_name = (customName == '' || customName == `campaign_name_${ele['id']}`) ? ele['campaign_name'] : customName;
                            }
                            if(ele.tab_titled){
                                let customName = await this.translatorService.frontendReadTranslation(req.lang,`campaign_tab_titled_${ele['id']}`, `/LC_MESSAGES/Campaign/Campaigns/${ele['organization_id']}`,`dynamic`);
                                ele.tab_titled = (customName == '' || customName == `campaign_tab_titled_${ele['id']}`) ? ele['tab_titled'] : customName;
                            }
                        }));
                    }
                    if(campaign[0]){
                        let count = 0;
                        let Gender = authUser.gender;
                        let index = 0;
                        for(let camp of campaign){
                            let campId = camp['id'];
                            let rewards = await this.campaignRewardService.listRecord({campaign_id: campId},{order_id: 'ASC'})
                            for (let i = 0; i < rewards?.length; i++) {
                                let showRewards = false;
                                if ((authUser?.is_camp_eligible == 1 && rewards[i]['eligibility']) == 1 || (authUser.is_camp_eligible == 0 && rewards[i]['eligibility'] == 2)) {
                                    showRewards = true;
                                }
                                if ((authUser.role_id== 2 && rewards[i]['eligibility'] == 7) || (authUser.role_id == 2 && authUser.is_camp_eligible == 1 && rewards[i]['eligibility'] == 3) || (authUser.role_id == 2 && authUser.is_camp_eligible == 0 && rewards[i]['eligibility'] == 4)) {
                                    showRewards = true;
                                }
                                if ((authUser.role_id == 16 && rewards[i]['eligibility'] == 8) || (authUser.role_id == 16 && authUser.is_camp_eligible == 1 && rewards[i]['eligibility'] == 5) || (authUser.role_id == 16 && authUser.is_camp_eligible == 0 && rewards[i]['eligibility'] == 6)) {
                                    showRewards = true;
                                }
                                if (rewards[i]['eligibility'] == 0 || showRewards) {
                                    let rew_act_ids = [];
                                    let rew_act_cust_name = [];
                                    let actPoints = 0;
                                    let category = [];
                                    rewards[i]['CampaignId'] = campId;
                                    if (rewards[i]['related_category'] != "") {
                                        let categoryId: any = rewards[i]['related_category'];
                                        categoryId = categoryId?.split(',');
                                        category = await this.campaignCategoryService.listRecord(`campaigncategory.status = 1 AND campaigncategory.id IN(${categoryId})`, null, ['campaigncategory','category'])
                                    }
            
                                    if (rewards[i]['related_activity'] != "") {
                                        let activityId: any = rewards[i]['related_activity'];
                                        activityId = activityId?.split(',');
                                        let activity: any = await this.campaignActivityService.listRecord(`campaignactivity.status = 1 AND campaignactivity.id IN(${activityId})`,"null",['campaignactivity','activity','category'])
                                        let totalPoint = 0;
                                        let tempdentists = 0;
                                        for (let k = 0; k < activity?.length; k++) {
                                            let points = 0;
                                            if (rewards[i]['hire_date'] && rewards[i]['hire_date'] == 1) {
                                                let totaldays = 0;
                                                const actStartDate = this.commonDateService.getTodayDate(activity[k].start_date);
                                                const actEndDate = this.commonDateService.getTodayDate(activity[k].end_date);
            
                                                const pointEndDate = activity[k].point_end_date 
                                                    ? moment(activity[k].point_end_date)
                                                    : null;
            
                                                const hireDateMoment = moment(req.tokenUser?.date_of_hire);
                                                const startDate = moment(actStartDate.format('YYYY-MM-DD'));
                                                const endDate = moment(actEndDate.format('YYYY-MM-DD'));
                                                const dateDiff = endDate.diff(startDate, 'days');
                                                totaldays = dateDiff + 1;
                                                if (hireDateMoment.isValid() && startDate.isBefore(hireDateMoment)) {
                                                    const newStartDate = hireDateMoment.format('YYYY-MM-DD');
                                                    const newEndDate = moment(newStartDate).add(totaldays, 'days').format('YYYY-MM-DD');
                                            
                                                    activity[k].start_date = newStartDate;
                                                    activity[k].end_date = newEndDate;
                                                }
                                            }
                                            if (authUser.timezone != '') {
                                                activity[k]['start_date865'] = moment.tz(activity[k]['start_date'] + ' 00:00:00', TimeZonecc)
                                                .tz(defaulttimezone)
                                                .format('YYYY-MM-DD HH:mm:ss');
            
                                                activity[k]['end_date865'] = moment.tz(activity[k]['end_date'] + ' 23:59:59', TimeZonecc)
                                                .tz(defaulttimezone)
                                                .format('YYYY-MM-DD HH:mm:ss');
            
                                                activity[k]['point_end_date865'] = '';
                                                if ((activity[k]['point_end_date'] && (activity[k]['point_end_date'].toString() != '' && activity[k]['point_end_date'].toString() != '0000-00-00 00:00:00'))) {
                                                    activity[k]['point_end_date865'] = moment.tz(activity[k]['point_end_date'] + ' 23:59:59', TimeZonecc)
                                                    .tz(defaulttimezone)
                                                    .format('YYYY-MM-DD HH:mm:ss');;
                                                }
            
                                            } else {
                                                activity[k]['end_date'] = this.commonDateService.getTodayDate(activity[k]['end_date']).endOf('day').format('YYYY-MM-DD HH:mm:ss');
                                            }
                                            date = "";
                                            let actStartDate = this.commonDateService.getTodayDate(activity[k].start_date);
                                            let actEndDate = this.commonDateService.getTodayDate(activity[k].end_date);
                                            let FactStartDate = this.commonDateService.getTodayDate(activity[k].start_date).format('YYYY-MM-DD HH:mm:ss');
                                            let FactEndDate = this.commonDateService.getTodayDate(activity[k].end_date).format('YYYY-MM-DD HH:mm:ss');
            
                                            let PointactEndDate = (activity[k]['point_end_date'] && activity[k]['point_end_date'].toString() != '0000-00-00 00:00:00') ? moment(activity[k]['point_end_date']).valueOf() : '';
            
                                            let PointFactEndDate = (activity[k]['point_end_date']  && activity[k]['point_end_date'].toString() != '0000-00-00 00:00:00') ? moment(activity[k]['point_end_date']).format('YYYY-MM-DD HH:mm:ss') : '';
            
                                            if (authUser.timezone != '') {
                                                    actStartDate = moment(activity[k]['start_date865']).valueOf();
                                                    actEndDate =  moment(activity[k]['end_date865']).valueOf() ;
                                                    PointactEndDate =  moment(activity[k]['point_end_date865']).valueOf();
                                                    FactStartDate = moment(activity[k]['start_date865']).format('YYYY-MM-DD HH:mm:ss');
                                                    FactEndDate =  moment(activity[k]['end_date865']).format('YYYY-MM-DD HH:mm:ss') ;
                                                    PointFactEndDate =  moment(activity[k]['point_end_date865']).format('YYYY-MM-DD HH:mm:ss') ;
                                            }
                                            let cat_index = -1;
                                            for (let d = 0; d < category.length; d++) {
                                                if (activity[k]['Category']['id'] == category[d]['Category']['id']) {
                                                    if (cat_index == -1) {
                                                        cat_index = d;
                                                    }
                                                }
                                            }
                                            if (activity[k]['Campaignactivity']['category_visibility'] == 0) {
                                                cat_index = -1;
                                            }
                                            let frequincy = activity[k]['Campaignactivity']['frequincy'];
                                            let frequincy_max_point = activity[k]['Campaignactivity']['frequincy_max_point'];
                                            let point_for_each = activity[k]['Campaignactivity']['point_for_each'];
                                            let max_point = activity[k]['Campaignactivity']['max_point'];
            
                                            let actId = activity[k]['Activity']['id'];
                                            rew_act_ids.push(actId);
                                            if (activity[k]['Campaignactivity']['cust_name'] != "") {
                                                rew_act_cust_name[actId] = activity[k]['Campaignactivity']['cust_name'];
                                            } else {
                                                rew_act_cust_name[actId] = activity[k]['Activity']['activity_name'];
                                            }
                                            let steps = activity[k]['Campaignactivity']['steps'];
            
                                            let CustompointData = await this.customPointService.listRecord({user_id: usrid, status: 1, activity_id: activity[k]['Campaignactivity']['id']})
                                            if (actId != 49 || (orgaid != 533 || CustompointData?.length >= 2)) {
                                                CustompointData.forEach(pointCustom => {
                                                    points += parseInt(pointCustom['point']) ?? 0;
                                                    if (pointCustom['date'].toString() == "") {
                                                        date = pointCustom['updated_date'].toString();
                                                    } else {
                                                        date = pointCustom['date'].toString();
                                                    }
                                                });
                                            }
            
                                            let PointFactEndDateCondition = '';
                                            let PointactEndDateCondition = '';
                                            if (PointactEndDate != '') {
                                                PointFactEndDateCondition = ` AND DATE_FORMAT(\`inserted\`,'%Y-%m-%d %H:%i:%s') BETWEEN '${FactStartDate}' AND '${PointFactEndDate}'`;
                                                PointactEndDateCondition = ` AND DATE_FORMAT(\`inserted\`,'%Y-%m-%d %H:%i:%s') BETWEEN '${moment.unix(actStartDate.unix() / 1000).format('YYYY-MM-DD HH:mm:ss')}' AND '${moment.unix(PointactEndDate / 1000).format('YYYY-MM-DD HH:mm:ss')}'`;
                                            }
                                            let activityDone;
                                            let mptData;
                                            let tmppoints;
                                            if(activeplugin.includes('Healthcheckup')){
                                                activityDone = await this.biometricsService.biometricsListRecord(
                                                        `hb.user_id = ${usrid} AND hb.status !=2
                                                        AND(
                                                            hb.activity_id REGEXP '^${actId},' OR
                                                            hb.activity_id REGEXP ',${actId}$' OR
                                                            hb.activity_id REGEXP ',${actId},' OR
                                                            hb.activity_id = ${actId} 
                                                            )
                                                        `
                                                        ,['hb.created'])?.[0];
                                                mptData = JSON.parse(JSON.stringify(activityDone));
                                                tmppoints = await this.userChallengeHelperService.count_point_act(activityDone, 'hc_biometrics', 'created', actStartDate, actEndDate);
                                                tmppoints = await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                tmppoints = await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                points += tmppoints;
                                                if (tmppoints > 0) {
                                                    date = mptData['created'];
                                                }
                                                activityDone = await this.userChallengeHelperService.Ifetch_point(tableConstant.HEALTH_CHECKUP.TBL_HC_DENTISTS, ['d.date_completed'], 'd.userid', 'd.activity_id', actId, `DATE_FORMAT(d.date_completed,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} ${PointFactEndDateCondition} Group by d.date_completed`,req);
                                                mptData = activityDone;
                                                tmppoints = await this.userChallengeHelperService.count_point_act(activityDone, 'hc_dentists', 'date_completed', actStartDate, actEndDate);
                                                tmppoints = await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                tmppoints = await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                if (mptData.length >= 2 || orgaid != 533) {
                                                    if (tempdentists == 0) {
                                                        points += tmppoints;
                                                    } else {
                                                        if (mptData.length >= 2) {
                                                            points += tmppoints;
                                                        }
                                                    }
            
                                                    if (tmppoints > 0) {
                                                        if (orgaid != 533) {
                                                            if (mptData.length >= 2) {
                                                                mptData = mptData.slice(-2);
                                                            }
                                                            if (tempdentists == 0) {
                                                                if (mptData.length == 2) {
                                                                    mptData = mptData.slice(-2, 1);
                                                                }
                                                                tempdentists = 1;
                                                            }
                                                        }
                                                        date = mptData['date_completed'];
                                                        
                                                    }
                                                }
                                                activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.HEALTH_CHECKUP.TBL_HC_OPTOMETRISTS, ['o.date_completed'], 'o.userid', 'o.activity_id', actId, `DATE_FORMAT(o.date_completed,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} ${PointFactEndDateCondition}`,req);
                                                mptData = activityDone;
                                                tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, 'hc_optometrists', 'date_completed', actStartDate, actEndDate);
                                                tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                points += tmppoints;
                                                if (tmppoints > 0) {
                                                    date = mptData['date_completed'];
                                                    
                                                }
                                                if (activity[k]['Activity']['id'] == '4') {
                                                    activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.HEALTH_CHECKUP.TBL_HC_TOBACCO_USES, ['tu.date_completed'], 'tu.userid', 'tu.activity_id', '12', `DATE_FORMAT(tu.date_completed,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} ${PointFactEndDateCondition.replace(/inserted/g, 'updated')} `,req);
                                                    mptData = activityDone;
                                                    tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, 'hc_tabaccouses', 'date_completed', actStartDate, actEndDate);
                                                    tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                    tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                    points += tmppoints;
                                                    if (tmppoints > 0) {
                                                        date = mptData['date_completed'];
                                                    }

                                                    activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.HEALTH_CHECKUP.TBL_HC_TOBACCO_USES, ['tu.date_completed'], 'tu.userid', 'tu.activity_id', '13', `DATE_FORMAT(tu.date_completed,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} ${PointFactEndDateCondition.replace(/inserted/g, 'updated')} `,req);
                                                    mptData = activityDone;
                                                    tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, 'hc_tabaccouses', 'date_completed', actStartDate, actEndDate);
                                                    tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                    tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                    points += tmppoints;
                                                    if (tmppoints > 0) {
                                                        date = mptData['date_completed'];
                                                    }
                                                    activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.HEALTH_CHECKUP.TBL_HC_TOBACCO_USES, ['tu.date_completed'], 'tu.userid', 'tu.activity_id', '14', `DATE_FORMAT(tu.date_completed,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} ${PointFactEndDateCondition.replace(/inserted/g, 'updated')} `,req);
                                                    mptData = activityDone;
                                                    tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, 'hc_tabaccouses', 'date_completed', actStartDate, actEndDate);
                                                    tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                    tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                    points += tmppoints;
                                                    if (tmppoints > 0) {
                                                        date = mptData['date_completed'];
                                                    }
                                                } 
                                                else {
                                                    activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.HEALTH_CHECKUP.TBL_HC_TOBACCO_USES, 'tu.date_completed', 'userid', 'activity_id', actId, `DATE_FORMAT(tu.date_completed,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} ${PointFactEndDateCondition.replace(/inserted/g, 'updated')}`,req);
                                                    mptData = activityDone;
                                                    tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, 'hc_optometrists', 'date_completed', actStartDate, actEndDate);
                                                    tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                    tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                    points += tmppoints;
                                                    if (tmppoints > 0) {
                                                        date = mptData['date_completed'];
                                                        
                                                    }
                                                }

                                                activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.HEALTH_CHECKUP.TBL_HC_AUTHORIZATIONS, ['a.date_completed'], 'a.userid', 'a.activity_id', actId, `DATE_FORMAT(a.date_completed,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} ${PointFactEndDateCondition.replace(/inserted/g, 'updated')}`,req);
                                                mptData = activityDone;
                                                tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, 'hc_authorizations', 'date_completed', actStartDate, actEndDate);
                                                tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                points += tmppoints;
                                                if (tmppoints > 0) {
                                                    date = mptData['date_completed'];
                                                    if (activity[k]['Activity']['id'] == '2') {
                                                        let dateDone = await this.biometricsService.biometricsListRecord(
                                                            `hb.user_id = ${usrid} AND hb.status !=2
                                                            AND DATE_FORMAT(hb.created,'%Y-%m-%d %H:%i:%s') BETWEEN ${actStartDate.format('YYYY-MM-DD HH:mm:ss')} AND ${actEndDate.format('YYYY-MM-DD HH:mm:ss')}
                                                            ${PointactEndDateCondition}`
                                                            ,['hb.created'])?.[0];
                                                        mptData = activityDone;
                                
                                                        if (dateDone) {
                                                            date = dateDone['created'];
                                                        } else {
                                                            tmppoints = 0;
                                                            if (date == "" && points == 0) {
                                                                date = "";
                                                            }
                                                        }
                                                    } 
                                                    if (activity[k]['Activity']['id'] == '3') {
                                                        let dateDone = await this.dentistsService.listRecord( `d.user_id = ${usrid} AND d.status !=2
                                                            AND DATE_FORMAT(d.date_completed,'%Y-%m-%d %H:%i:%s') BETWEEN ${actStartDate.format('YYYY-MM-DD HH:mm:ss')} AND ${actEndDate.format('YYYY-MM-DD HH:mm:ss')}
                                                            ${PointactEndDateCondition}`
                                                            ,['d.date_completed'])?.[0];
                                                        mptData = activityDone;
                                                        if (dateDone) {
                                                            date = dateDone['date_completed'];
                                                        } else {
                                                            tmppoints = 0;
                                                            if (date == "" && points == 0) {
                                                                date = "";
                                                            }
                                                        }
                                                    }
                                                    if (activity[k]['Activity']['id'] == '5') {
                                                        let dateDone = await this.optometristsService.listRecord( `o.user_id = ${usrid} AND o.status !=2
                                                            AND DATE_FORMAT(o.date_completed,'%Y-%m-%d %H:%i:%s') BETWEEN ${actStartDate.format('YYYY-MM-DD HH:mm:ss')} AND ${actEndDate.format('YYYY-MM-DD HH:mm:ss')}
                                                            ${PointactEndDateCondition}`
                                                            ,['o.date_completed'])?.[0];
                                                        mptData = activityDone;
                                                        if (dateDone) {
                                                            date = dateDone['date_completed'];
                                                        } else {
                                                            tmppoints = 0;
                                                            if (date == "" && points == 0) {
                                                                date = "";
                                                            }
                                                        }
                                                    }
                                                }

                                            }
                                            if(activeplugin.includes('Hra')){
                                                let healthcource = `DATE_FORMAT(healthassessment.${date},"%Y-%m-%d %H:%i:%s") BETWEEN '${FactStartDate}' AND '${FactEndDate}'`;
                                                let healthcourceEHA = `DATE_FORMAT(healthassessment.created,"%Y-%m-%d %H:%i:%s") BETWEEN '${FactStartDate}' AND '${FactEndDate}'`;
                                                
                                                if (activity[k]['Campaignactivity']['source_type'] == 1) {
                                                    healthcourceEHA += ' AND hra_status=100';
                                                    healthcource += ' AND hra_status=100';
                                                }
                                                activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENTS, ['healthassessment.date'], 'healthassessment.user_id', 'healthassessment.activity_id', actId, healthcource,req);
                                                mptData = activityDone;
                                                tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, 'ha_assessments', 'date', actStartDate, actEndDate);
                                                tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                points += tmppoints;
                                                if (tmppoints > 0) {
                                                    for(let mp of mptData){
                                                        if (mp['ha_assessments']['date']) {
                                                            date = mp['ha_assessments']['date'];
                                                        }
                                                    }                                           
                                                }
                                                if (actId == 1) {
                                                    activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS, ['healthassessment.created'], 'user_id', 'activity_id', actId, healthcourceEHA,req);
                                                    mptData = activityDone;
                                                    tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, 'ha_emotional_assessments', 'created', actStartDate, actEndDate);
                                                    tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                    tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                    points += tmppoints;
                                                    if (tmppoints > 0) {
                                                        for(let mp of mptData){
                                                            if (mp['ha_emotional_assessments']['date']) {
                                                                date = mp['ha_emotional_assessments']['date'];
                                                            }
                                                        }
                                                    }
                                                }
                                                activityDone = await this.assessmentHraBiometricsService.listRecord(
                                                    `healthassessment.user_id = ${usrid} AND healthassessment.status != 2
                                                    AND(
                                                        healthassessment.activity_id REGEXP '^${actId},' OR
                                                        healthassessment.activity_id REGEXP ',${actId}$' OR
                                                        healthassessment.activity_id REGEXP ',${actId},' OR
                                                        healthassessment.activity_id = ${actId} 
                                                    )`, 
                                                    null,
                                                    ['healthassessment.date']
                                                );
                                                mptData = activityDone;
                                                tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, 'ha_hrabiometrics', 'date', actStartDate, actEndDate);
                                                tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                points += tmppoints;
                                                if (tmppoints > 0) {
                                                    for(let mp of mptData){
                                                        if (mp['ha_hrabiometrics']['date']) {
                                                            date = mp['ha_hrabiometrics']['date'];
                                                        }
                                                    }
                                                }

                                            }
                                            if(activeplugin.includes('Exercise')){
                                            }
                                            if(activeplugin.includes('Activitytracker')){
                                                activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.ACTIVITY_TRACKER.TBL_SUBMITTED_FORMS, ['sf.activity_date'], 'sf.user_id', 'sf.activity_id', actId, `DATE_FORMAT(sf.date_completed,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                mptData = activityDone;
                                                tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, 'at_submited_forms', 'activity_date', actStartDate, actEndDate);
                                                tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                points += tmppoints;
                                                if (tmppoints > 0) {
                                                    for(let mp of mptData){
                                                        if (mp['at_submited_forms']['date']) {
                                                            date = mp['at_submited_forms']['date'];
                                                        }
                                                    }                                           
                                                }
                                            }
                                            if(activeplugin.includes('Myplan')){
                                                if (activity[k]['Activity']['category_id'] == 66) {
                                                    if (actId == 7780) {
                                                        activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.MY_PLAN.TBL_MP_JOIN_USER_PLAN, ['joinplan.complete_date'], 'joinplan.user_id', 'joinplan.user_id', usrid, `joinplan.is_complete = 1 AND DATE_FORMAT(joinplan.date_completed,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                    } else {
                                                        activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.MY_PLAN.TBL_MP_JOIN_USER_PLAN, ['joinplan.complete_date'], 'joinplan.user_id', 'joinplan.activity_id', actId, `joinplan.is_complete = 1 AND DATE_FORMAT(joinplan.date_completed,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                    }
                                                    mptData = activityDone;
                                                    tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, 'mp_join_user_plan', 'complete_date', actStartDate, actEndDate);
                                                    tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                    tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                    points += tmppoints;
                                                    if (tmppoints > 0) {
                                                        for(let mp of mptData){
                                                            if (mp['mp_join_user_plan']['complete_date']) {
                                                                date = mp['mp_join_user_plan']['complete_date'];
                                                            }
                                                        }                                           
                                                    }
                                                }
                                                if (activity[k]['Activity']['category_id'] == 67) {
                                                    activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.MY_PLAN.TBL_MP_COMPLETE_BLOCK, ['completeblock.complete_date'], 'completeblock.user_id', 'completeblock.activity_id', actId, `completeblock.status = 1 AND DATE_FORMAT(completeblock.date_completed,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                    mptData = activityDone;
                                                    tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, 'mp_complete_block', 'complete_date', actStartDate, actEndDate);
                                                    tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                    tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                    points += tmppoints;
                                                    if (tmppoints > 0) {
                                                        for(let mp of mptData){
                                                            if (mp['mp_complete_block']['complete_date']) {
                                                                date = mp['mp_complete_block']['complete_date'];
                                                            }
                                                        }                                           
                                                    }
                                                }
                                                if (activity[k]['Activity']['category_id'] == 68) {
                                                    activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.MY_PLAN.TBL_MP_COMPLETE_ACTIVITY, ['ca.created'], 'ca.user_id', 'ca.activity_id', actId, `DATE_FORMAT(ca.created,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                    mptData = activityDone;
                                                    tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, 'mp_complete_activity', 'created', actStartDate, actEndDate);
                                                    tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                    tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                    points += tmppoints;
                                                    if (tmppoints > 0) {
                                                        for(let mp of mptData){
                                                            if (mp['mp_complete_activity']['complete_date']) {
                                                                date = mp['mp_complete_activity']['complete_date'];
                                                            }
                                                        }                                           
                                                    }
                                                }
                                            }
                                            /* Login Activtiy */
                                            let tempdate = '';
                                            if (actId == 890) {
                                                activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.TBL_USERS_LOGIN, ['userLogin.login_time'], 'userLogin.user_id', 'userLogin.user_id', usrid, `DATE_FORMAT(userLogin.login_time,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);      
                                                mptData = activityDone;
                                                tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, tableConstant.TBL_USERS_LOGIN, 'login_time', actStartDate, actEndDate);
                                                tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                points += tmppoints;
                                                tempdate = '';
                                                if (tmppoints > 0) {
                                                    if (tmppoints > 0) {
                                                        for(let mp of mptData){
                                                            if (mp['s_user_login']['login_time']) {
                                                                date = mp['s_user_login']['login_time'];
                                                            }
                                                        }                                           
                                                    } 
                                                    if (tempdate != '') {
                                                        date = tempdate;
                                                    }
                                                }
                                            }

                                            if (actId == 12748) {
                                                activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.TBL_USERS_LOGIN, ['userLogin.login_time'], 'userLogin.user_id', 'userLogin.user_id', usrid, `userLogin.source in (1,2) AND DATE_FORMAT(userLogin.login_time,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);      
                                                mptData = activityDone;
                                                tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, tableConstant.TBL_USERS_LOGIN, 'login_time', actStartDate, actEndDate);
                                                tmppoints = (tmppoints) ? 1 : 0;
                                                tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                points += tmppoints;
                                                tempdate = '';
                                                if (tmppoints > 0) {
                                                    if (tmppoints > 0) {
                                                        for(let mp of mptData){
                                                            if (mp['s_user_login']['login_time']) {
                                                                date = mp['s_user_login']['login_time'];
                                                            }
                                                        }                                           
                                                    } 
                                                    if (tempdate != '') {
                                                        date = tempdate;
                                                    }
                                                }
                                            }
            
                                            /* Fitnes Video */
                                            if (activity[k]['Activity']['category_id'] == 71 && activeplugin.includes('Media')) {
                                                if (actId == 4887 && activity[k]['Campaignactivity']['video'] != 0) {
                                                    let VideoId = activity[k]['Campaignactivity']['video'];
                                                    activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_CLICK, ['fitness.created AS created'], 'fitness.user_id', 'fitness.activity_id', actId, `fitness.v_id = ${VideoId} AND DATE_FORMAT(fitness.created,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                } else {
                                                    activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_CLICK, ['fitness.created AS created'], 'fitness.user_id', 'fitness.activity_id', actId, `DATE_FORMAT(fitness.created,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                }
                                                mptData = activityDone;
                                                tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_CLICK, 'created', actStartDate, actEndDate);
                                                tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                points += tmppoints;
                                                if (tmppoints > 0) {
                                                    tempdate = '';
                                                    for(let mp of mptData){
                                                        if (mp['me_fod_video_click']['created']) {
                                                            date = mp['me_fod_video_click']['created'];
                                                        }
                                                    } 
                                                    if (tempdate != '') {
                                                        date = tempdate;
                                                    }
                                                }
                                            }
            
                                            /* Emotionalwellbeing post */
                                            if (activity[k]['Activity']['category_id'] == 75 && activeplugin.includes('Emotionalwellbeing')) {
                                                if (actId == 5905 && activity[k]['Campaignactivity']['video'] != 0) {
                                                    let VideoId = activity[k]['Campaignactivity']['video'];
                                                    activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST_CLICK, ['wellbeing.created_date'], 'wellbeing.user_id', 'wellbeing.activity_id', actId, `wellbeing.post_id = ${VideoId} AND DATE_FORMAT(wellbeing.created,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);

                                                } else {
                                                    activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST_CLICK, ['wellbeing.created_date'], 'wellbeing.user_id', 'wellbeing.activity_id', actId, `DATE_FORMAT(wellbeing.created,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                }
                                                mptData = activityDone;
                                                tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST_CLICK, 'created_date', actStartDate, actEndDate);
                                                tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                points += tmppoints;
                                                if (tmppoints > 0) {
                                                    tempdate = '';
                                                    for(let mp of mptData){
                                                        if (mp['em_post_click']['created_date']) {
                                                            date = mp['em_post_click']['created_date'];
                                                        }
                                                    } 
                                                    if (tempdate != '') {
                                                        date = tempdate;
                                                    }
                                                }
                                            }
            
                                            if (activity[k]['Activity']['category_id'] == 43 && activeplugin.includes('Quicklink')) {
                                                activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.QUICK_LINK.TBL_QUICK_LINK_CLICKS, ['clicks.created_date'], 'clicks.user_id', 'clicks.activity_id', actId, `DATE_FORMAT(clicks.created_date,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                mptData = activityDone;
                                                tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, tableConstant.QUICK_LINK.TBL_QUICK_LINK_CLICKS, 'created_date', actStartDate, actEndDate);
                                                tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                points += tmppoints;
                                                if (tmppoints > 0) {
                                                    tempdate = '';
                                                    for(let mp of mptData){
                                                        if (mp['u_quicklink_clicks']['created_date']) {
                                                            date = mp['u_quicklink_clicks']['created_date'];
                                                        }
                                                    } 
                                                    if (tempdate != '') {
                                                        date = tempdate;
                                                    }
                                                }
                                            }
            
                                            if (activeplugin.includes('Events')) {
                                                /* Event Points */
                                                activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS, ['eubl.modified'], 'eubl.user_id', 'eubl.activity_id', actId, `eubl.ev_attend_status='1' AND DATE_FORMAT(eubl.modified,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                mptData = activityDone;
                                                tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS, 'modified', actStartDate, actEndDate);
                                                tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                points += tmppoints;
                                                if (tmppoints > 0) {
                                                    for(let mp of mptData){
                                                        if (mp['ev_userbookinglists']['modified']) {
                                                            date = mp['ev_userbookinglists']['modified'];
                                                        }
                                                    } 
                                                }
                                            }
            
                                            if (activeplugin.includes('Quiz')) {
                                                /* Quiz Points */
                                                let uTimezoneName = 'UTC';
                                                if (timeZone != '') {
                                                    uTimezoneName = timeZone;
                                                }
                                                
                                                let QuizFactStartDate = `${this.commonDateService.getTodayDate(activity[k]['Campaignactivity']['start_date'])} 00:00:00`;
                                                let QuizFactEndDate = `${this.commonDateService.getTodayDate(activity[k]['Campaignactivity']['start_date'])} 23:59:59`;
                                                let QuizactStartDate = this.commonDateService.getTodayDate(QuizFactStartDate).unix();
                                                let QuizactEndDate = this.commonDateService.getTodayDate(QuizFactEndDate).unix();
                                                activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.QUIZ.TBL_QZ_USER_DETAILS, [`CONVERT_TZ(ud.created_date, 'UTC', CASE WHEN ud.timezone_name != "" THEN ud.timezone_name ELSE '${uTimezoneName}' END) as ud.created_date`], 'ud.user_id', 'ud.activity_id', actId, `ud.completed='yes' AND DATE_FORMAT(CONVERT_TZ('ud.created_date', 'UTC', CASE WHEN ud.timezone_name != "" THEN ud.timezone_name ELSE '${uTimezoneName}' END),"%Y-%m-%d %H:%i:%s") BETWEEN ${QuizFactStartDate} AND ${QuizFactEndDate} `,req);

                                                mptData = activityDone;
                                                tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, '0', 'created_date', QuizactStartDate, QuizactEndDate);
                                                tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                points += tmppoints;
                                                if (tmppoints > 0) {
                                                    for(let mp of mptData){
                                                        if (mp['0']['created_date']) {
                                                            date = mp['0']['created_date'];
                                                        }
                                                    } 
                                                }
                                            }
            
                                            if (activeplugin.includes('Trackers')) {
                                                /* ft_activity_feeds */
                                                tmppoints = 0;
                                                if (actId == 11) {
                                                    if (activity[k]['Campaignactivity']['source_type'] == 0) {
                                                        activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS, ['food.acId','food.logType','food.steps','food.collectionDate'], 'food.user_id', 'food.activityTypeId', actId, `DATE_FORMAT(food.collectionDate,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                        let activityDone1 = await await this.userChallengeHelperService.Ifetch_point(tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS, ['food.acId','food.logType','food.steps','food.collectionDate'], 'food.user_id', 'food.activityTypeId', '15', `DATE_FORMAT(food.collectionDate,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                        activityDone = activityDone.CONCAT(activityDone1);
                                                    }
                                                    else if(activity[k]['Campaignactivity']['source_type'] == 1) {
                                                        activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS, ['food.acId','food.logType','food.steps','food.collectionDate'], 'food.user_id', 'food.logType', 'Manual', `DATE_FORMAT(food.collectionDate,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                    }
                                                    else if(activity[k]['Campaignactivity']['source_type'] == 2) {
                                                        activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS, ['food.acId','food.logType','food.steps','food.collectionDate'], 'food.user_id', 'food.logType', 'Tracker', `DATE_FORMAT(food.collectionDate,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                    }
                                                    else if(activity[k]['Campaignactivity']['source_type'] == 3) {
                                                        activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS, ['food.acId','food.logType','food.steps','food.collectionDate'], 'food.user_id', 'food.user_id', usrid, `DATE_FORMAT(food.collectionDate,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                    }
                                                    mptData = activityDone;
                                                    let datediffstep;
                                                    if (activity[k]['Campaignactivity']['count_type'] == 1 && activityDone) {
                                                        if (frequincy == 'D') {
                                                            if (this.commonDateService.getTodayDate(current_datetime).unix() < this.commonDateService.getTodayDate(actEndDate).unix()) {
                                                                datediffstep = this.commonDateService.getTodayDate(current_datetime).diff(actStartDate, 'seconds');
                                                            } else {
                                                                datediffstep = this.commonDateService.getTodayDate(actEndDate).diff(actStartDate, 'seconds'); 
                                                            }
                                                            let totaldaysstep = Math.floor(datediffstep / (60 * 60 * 24));
                                                            totaldaysstep = totaldaysstep + 1;
                                                            let totaldaysstepwalk = activityDone.map(item => item.steps).reduce((sum, steps) => sum + steps, 0);
                                                            
                                                            if ((totaldaysstepwalk / totaldaysstep) >= steps) {
                                                                tmppoints = totaldaysstep;
                                                            }
                                                        } else {
                                                            let totaldaysstep = {};
                                                            let frequincy = 'W';
                                                            let frequincydataget = (frequincy === 'W') ? 'oW' : (frequincy === 'M') ? 'M' : 'Y';
                                                            activityDone.forEach(advalue => {
                                                                const collectionDate = this.commonDateService.getTodayDate(advalue.collectionDate);
                                                                
                                                                if (actStartDate.isSameOrBefore(collectionDate) && collectionDate.isSameOrBefore(actEndDate)) {
                                                                    const formattedDate = collectionDate.format(frequincydataget);
                                                            
                                                                    if (totaldaysstep[formattedDate]) {
                                                                        totaldaysstep[formattedDate] += advalue.ft_activity_feeds.steps;
                                                                    } else {
                                                                        totaldaysstep[formattedDate] = advalue.ft_activity_feeds.steps;
                                                                    }
                                                                }
                                                            });
                                                            if (frequincy == 'W' || frequincy == 'Y') {
                                                                let totaldaysstepwalk = (frequincy == 'W') ? (7 * steps) : (365 * steps);
                                                                if (frequincy == 'W') {
                                                                    //echo 'required step to complete per week - '.$totaldaysstepwalk.'<br>';
                                                                }
                                                                if (frequincy == 'Y') {
                                                                    //echo 'required step to complete per year - '.$totaldaysstepwalk.'<br>';
                                                                }
                                                                let filteredDaysStep = {};
                                                                    Object.keys(totaldaysstep).forEach(key => {
                                                                    const value = totaldaysstep[key];
                                                                    
                                                                    if (typeof value === 'number' && value >= totaldaysstepwalk) {
                                                                        filteredDaysStep[key] = value;
                                                                    }
                                                                });
                                                                totaldaysstep = filteredDaysStep;
                                                            }
                                                            if (frequincy == 'M') {
                                                                totaldaysstep = Object.fromEntries(
                                                                    Object.entries(totaldaysstep).filter(([nkey, nstep]) => {
                                                                        const stepValue = Number(nstep);
                                                                
                                                                        const year = moment(nkey, 'YYYY-MM').year();
                                                                        const month = moment(nkey, 'YYYY-MM').month() + 1; 
                                                                        const daysInMonth = moment(`${year}-${month}`, 'YYYY-MM').daysInMonth();
                                                                        return stepValue >= (daysInMonth * steps);
                                                                    })
                                                                );
                                                                tmppoints = Object.keys(totaldaysstep).length;
                                                            }
                                                        }
                                                    } else {
                                                        if (frequincy == 'U') {
                                                            let temdatastepcount = 0;
                                                            let totaldaysstep = [];
                                                            for(let advalue of activityDone){
                                                                const collectionDate = moment(advalue['ft_activity_feeds']['collectionDate']);
                                                                if (actStartDate.isSameOrBefore(collectionDate) && collectionDate.isSameOrBefore(actEndDate)) {
                                                                    temdatastepcount += advalue['ft_activity_feeds'].steps;
                                                                    if (temdatastepcount > steps) {
                                                                        advalue.ft_activity_feeds.steps = steps;
                                                                        totaldaysstep.push(advalue); 
                                                                        temdatastepcount -= steps; 
                                                                    }
                                                                }
                                                            }
                                                            mptData = activityDone = totaldaysstep;
                                                        }
                                                        tmppoints = await await this.userChallengeHelperService.count_point_act_steps(activityDone, tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS, 'collectionDate', actStartDate, actEndDate, steps);
                                                        tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                        if (activity[k]['Campaignactivity']['count_type'] == 2 && activityDone) {
                                                            if (frequincy == 'M') {
                                                                const frequincydataget = (frequincy === 'W') ? 'YYYY-WW' : (frequincy === 'M') ? 'YYYY-MM' : 'YYYY';
                                                                const totaldaysstep = {};
                                                                activityDone.forEach(advalue => {
                                                                    const collectionDate = moment(advalue.ft_activity_feeds.collectionDate);
                                                                    if (actStartDate.isSameOrBefore(collectionDate) && collectionDate.isSameOrBefore(actEndDate)) {
                                                                        const formattedDate = collectionDate.format(frequincydataget);
                                                                        if (totaldaysstep[formattedDate]) {
                                                                            totaldaysstep[formattedDate] += advalue.ft_activity_feeds.steps;
                                                                        } else {
                                                                            totaldaysstep[formattedDate] = advalue.ft_activity_feeds.steps;
                                                                        }
                                                                    }
                                                                });
                                                                const filteredTotalDaysStep = Object.fromEntries(
                                                                    Object.entries(totaldaysstep).filter(([key, nstep]) => nstep >= steps)
                                                                );
                                                                const tmppoints = Object.keys(filteredTotalDaysStep).length;
                                                            }
                                                        }
                                                    }
                                                    tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                    points += tmppoints;
                                                    if (tmppoints > 0) {
                                                        let tempdate = '';
                                                        for(let mp of mptData){
                                                            if (tempdate == '') {
                                                                tempdate = mp['ft_activity_feeds']['collectionDate'];
                                                            } else {
                                                                if (this.commonDateService.getTodayDate(mp['ft_activity_feeds']['collectionDate']).unix() > this.commonDateService.getTodayDate(tempdate).unix()) {
                                                                    tempdate = mp['ft_activity_feeds']['collectionDate'];
                                                                }
                                                            }
                                                        } 
                                                        if (tempdate != '') {
                                                            date = tempdate;
                                                        }
                                                    }
                                                } else if (actId == 15) {
                                                        activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS, ['food.acId','food.logType','food.steps','food.collectionDate'], 'food.user_id', 'food.activityTypeId', actId, `DATE_FORMAT(food.collectionDate,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                        let activityDone1 = await await this.userChallengeHelperService.Ifetch_point(tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS, ['food.acId','food.logType','food.steps','food.collectionDate'], 'food.user_id', 'food.activityTypeId', '11', `DATE_FORMAT(food.collectionDate,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                        activityDone = activityDone.CONCAT(activityDone1);
                                                    
                                                    mptData = activityDone;
                                                    tmppoints = await await this.userChallengeHelperService.count_point_act_steps(activityDone, tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS, 'collectionDate', actStartDate, actEndDate,steps);
                                                    tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                    tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                    points += tmppoints;
                                                    if (tmppoints > 0) {
                                                        let tempdate = '';
                                                        for(let mp of mptData){
                                                            if (tempdate == '') {
                                                                tempdate = mp['ft_activity_feeds']['collectionDate'];
                                                            } else {
                                                                if (this.commonDateService.getTodayDate(mp['ft_activity_feeds']['collectionDate']).unix() > this.commonDateService.getTodayDate(tempdate).unix()) {
                                                                    tempdate = mp['ft_activity_feeds']['collectionDate'];
                                                                }
                                                            }
                                                        } 
                                                        if (tempdate != '') {
                                                            date = tempdate;
                                                        }
                                                    }
                                                } else {
                                                    activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS, ['food.acId','food.logType','food.steps','food.collectionDate'], 'food.user_id', 'food.activityTypeId', actId, `DATE_FORMAT(food.collectionDate,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                    mptData = activityDone;
                                                    tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS, 'collectionDate', actStartDate, actEndDate);
                                                    tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                    tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                    points += tmppoints;
                                                    if (tmppoints > 0) {
                                                        let tempdate = '';
                                                        for(let mp of mptData){
                                                            if (tempdate == '') {
                                                                tempdate = mp['ft_activity_feeds']['collectionDate'];
                                                            } else {
                                                                if (this.commonDateService.getTodayDate(mp['ft_activity_feeds']['collectionDate']).unix() > this.commonDateService.getTodayDate(tempdate).unix()) {
                                                                    tempdate = mp['ft_activity_feeds']['collectionDate'];
                                                                }
                                                            }
                                                        } 
                                                        if (tempdate != '') {
                                                            date = tempdate;
                                                        }
                                                    }
                                                }
            
                                                /* ft_sleep_feeds */
                                                activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS, ['food.collectionDate'], 'food.user_id', 'food.activityTypeId', actId, `DATE_FORMAT(food.collectionDate,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                mptData = activityDone;
                                                tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS, 'collectionDate', actStartDate, actEndDate);
                                                tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                points += tmppoints;
                                                if (tmppoints > 0) {
                                                    for(let mp of mptData){
                                                        if (mp['ft_activity_feeds']['collectionDate']){
                                                            tempdate = mp['ft_activity_feeds']['collectionDate']; 
                                                        }
                                                    } 
                                                }
            
                                                /* ft_foods_feeds */
                                                activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS, ['food.collectionDate'], 'food.user_id', 'food.activityTypeId', actId, `DATE_FORMAT(food.collectionDate,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                mptData = activityDone
                                                tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS, 'collectionDate', actStartDate, actEndDate);
                                                tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                points += tmppoints;
                                                if (tmppoints > 0) {
                                                    for(let mp of mptData){
                                                        if (mp['ft_activity_feeds']['collectionDate']){
                                                            tempdate = mp['ft_activity_feeds']['collectionDate']; 
                                                        }
                                                    } 
                                                }
            
                                                if (actId == 151) {
                                                    tmppoints = 0;
                                                    activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS, ['food.collectionDate'], 'food.user_id', 'food.activityTypeId', '6', `DATE_FORMAT(food.collectionDate,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                    mptData = activityDone;
                                                    tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS, 'collectionDate', actStartDate, actEndDate);
                                                    if (tmppoints > 0) {
                                                        for(let mp of mptData){
                                                            if (mp['ft_activity_feeds']['collectionDate']){
                                                                date = mp['ft_activity_feeds']['collectionDate']; 
                                                            }
                                                        } 
                                                    }
            
                                                    activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS, ['food.collectionDate'], 'food.user_id', 'food.activityTypeId', '10', `DATE_FORMAT(food.collectionDate,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                    mptData = activityDone;
                                                    tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS, 'collectionDate', actStartDate, actEndDate);
                                                    tmppoints = await await this.userChallengeHelperService.calculate_frequency(tmppoints, frequincy, frequincy_max_point, point_for_each);
                                                    tmppoints = await await this.userChallengeHelperService.multiplay_point(tmppoints, point_for_each, max_point);
                                                    points += tmppoints;
                                                    if (tmppoints > 0) {
                                                        for(let mp of mptData){
                                                            if (mp['ft_activity_feeds']['collectionDate']){
                                                                date = mp['ft_activity_feeds']['collectionDate']; 
                                                            }
                                                        }
                                                    }
                                                }
                                            }
            
                                            let altActivity = "";
                                            if (activity[k]['Campaignactivity']['alt_activity'] != '0' && activity[k]['Campaignactivity']['alt_activity'] != '') {
                                                let altActivity = await this.activityService.findOne({id: activity[k]['Campaignactivity']['alt_activity']});
                                                if (altActivity) {
                                                    let altActId = altActivity['id'];
                                                    let altActPoint = activity[k]['Campaignactivity']['alt_act_point'];
                                                    if (activeplugin.includes('Healthcheckup')) {
                                                        /* hc_biometrics */
                                                        tmppoints = 0;
                                                        activityDone = await this.biometricsService.biometricsListRecord(
                                                            `hb.user_id = ${usrid} AND hb.status !=2
                                                            AND(
                                                                hb.activity_id REGEXP '^${altActId},' OR
                                                                hb.activity_id REGEXP ',${altActId}$' OR
                                                                hb.activity_id REGEXP ',${altActId},' OR
                                                                hb.activity_id = ${altActId} 
                                                                )
                                                            `
                                                            ,['hb.created'])?.[0];
                                                    mptData = JSON.parse(JSON.stringify(activityDone));
                                                    tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, 'hc_biometrics', 'created', actStartDate, actEndDate);
                                                    tmppoints = await this.commonHealthService.check_max_point(tmppoints, max_point);
                                                    points += tmppoints;

            
                                                        /* hc_dentists */
                                                        activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.HEALTH_CHECKUP.TBL_HC_DENTISTS, ['d.date_completed'], 'd.userid', 'd.activity_id', altActId, `DATE_FORMAT(d.date_completed,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} ${PointFactEndDateCondition}`,req);
                                                        mptData = activityDone;
                                                        tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, tableConstant.HEALTH_CHECKUP.TBL_HC_DENTISTS, 'date_completed', actStartDate, actEndDate);
                                                        if (tmppoints.length >= 2) {
                                                            tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                                                            points += tmppoints;
                                                        }
                                                        /* hc_optometrists */
                                                        activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.HEALTH_CHECKUP.TBL_HC_OPTOMETRISTS, ['o.date_completed'], 'o.userid', 'o.activity_id', altActId, `DATE_FORMAT(o.date_completed,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate}`,req);
                                                        tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, tableConstant.HEALTH_CHECKUP.TBL_HC_OPTOMETRISTS, 'date_completed', actStartDate, actEndDate);
                                                        tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                                                        points += tmppoints;
            
                                                        /* hc_tabaccouses */
                                                        activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.HEALTH_CHECKUP.TBL_HC_TOBACCO_USES, ['tu.date_completed'], 'tu.userid', 'tu.activity_id', altActId, `DATE_FORMAT(tu.date_completed,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                        tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, tableConstant.HEALTH_CHECKUP.TBL_HC_TOBACCO_USES, 'date_completed', actStartDate, actEndDate);
                                                        tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                                                        points += tmppoints;
            
                                                        /* hc_authorizations */
                                                        activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.HEALTH_CHECKUP.TBL_HC_AUTHORIZATIONS, ['a.date_completed'], 'a.userid', 'a.activity_id', altActId, `DATE_FORMAT(a.date_completed,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate}`,req);
                                                        tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, tableConstant.HEALTH_CHECKUP.TBL_HC_AUTHORIZATIONS, 'date_completed', actStartDate, actEndDate);
                                                        tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                                                        if (tmppoints > 0) {
                                                            date = mptData['date_completed'];
                                                            let dateDone;
                                                            if (activity[k]['Activity']['id'] == '2') {
                                                                dateDone = await this.biometricsService.biometricsListRecord(
                                                                    `hb.user_id = ${usrid} AND hb.status !=2`,['hb.created'])?.[0];
                                                                mptData = activityDone;
                                        
                                                                if (dateDone) {
                                                                } else {
                                                                    tmppoints = 0;
                                                                }
                                                            } 
                                                            if (activity[k]['Activity']['id'] == '3') {
                                                                dateDone = await this.dentistsService.listRecord( `d.user_id = ${usrid} AND d.status !=2`,['d.date_completed'])?.[0];
                                                                if (dateDone) {
                                                                } else {
                                                                    tmppoints = 0;
                                                                }
                                                            }
                                                            if (activity[k]['Activity']['id'] == '5') {
                                                                let dateDone = await this.optometristsService.listRecord( `o.user_id = ${usrid} AND o.status !=2`,['o.date_completed'])?.[0];
                                                                if (dateDone) {
                                                                } else {
                                                                    tmppoints = 0;
                                                                }
                                                            }
                                                        }
                                                    }
            
                                                    if (activeplugin.includes('Hra')) {
                                                        let healthcource = `DATE_FORMAT(healthassessment.${date},"%Y-%m-%d %H:%i:%s") BETWEEN '${FactStartDate}' AND '${FactEndDate}'`;
                                                        let healthcourceEHA = `DATE_FORMAT(healthassessment.created,"%Y-%m-%d %H:%i:%s") BETWEEN '${FactStartDate}' AND '${FactEndDate}'`;
                                                        
                                                        if (activity[k]['Campaignactivity']['source_type'] == 1) {
                                                            healthcourceEHA += ' AND hra_status=100';
                                                            healthcource += ' AND hra_status=100';
                                                        }
                                                        
                                                        /* ha_assessments */
                                                        activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENTS, ['healthassessment.date'], 'healthassessment.user_id', 'healthassessment.activity_id', altActId, healthcource,req);
                                                        tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS, 'collectionDate', actStartDate, actEndDate);
                                                        tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                                                        points += tmppoints;
                                                        if (altActId == 1) {
                                                            /* ha_emotional_assessments */
                                                            activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS, ['healthassessment.created'], 'user_id', 'user_id', usrid, healthcourceEHA,req);
                                                            tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, 'ha_emotional_assessments', 'created', actStartDate, actEndDate);
                                                            tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                                                            points += tmppoints;
                                                        }
                                                        /* ha_hrabiometrics */
                                                        tmppoints = 0;
                                                        activityDone = await this.assessmentHraBiometricsService.listRecord(
                                                            `healthassessment.user_id = ${usrid} AND healthassessment.status != 2
                                                            AND(
                                                                healthassessment.activity_id REGEXP '^${altActId},' OR
                                                                healthassessment.activity_id REGEXP ',${altActId}$' OR
                                                                healthassessment.activity_id REGEXP ',${altActId},' OR
                                                                healthassessment.activity_id = ${altActId} 
                                                            )`, 
                                                            null,
                                                            ['healthassessment.date']
                                                        );
                                                        tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, 'ha_hrabiometrics', 'date', actStartDate, actEndDate);
                                                        tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                                                        points += tmppoints;
                                                    }
            
                                                    if (activeplugin.includes('Events')) {
                                                        /* Event_complete_plans */
                                                        activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS, ['eubl.modified'], 'eubl.ev_user_id', 'eubl.activity_id', altActId, `eubl.ev_attend_status='1' AND DATE_FORMAT(eubl.modified,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                        tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS, 'modified', actStartDate, actEndDate);
                                                        tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                                                        points += tmppoints;
                                                    }
            
                                                    if (activeplugin.includes('Quiz')) {
                                                        /* Quiz_complete_plans */
                                                        let uTimezoneName = 'UTC';
                                                        if (timeZone != '') {
                                                            uTimezoneName = timeZone;
                                                        }
                                                    
                                                        let QuizFactStartDate = this.commonDateService.getTodayDate(activity[k]['Campaignactivity']['start_date']);
                                                        let QuizFactEndDate = this.commonDateService.getTodayDate(activity[k]['Campaignactivity']['start_date']);
                                                        let QuizactStartDate = this.commonDateService.getTodayDate(QuizFactStartDate).format('YYYY-MM-DD HH:mm:ss');
                                                        let QuizactEndDate = this.commonDateService.getTodayDate(QuizFactEndDate).format('YYYY-MM-DD HH:mm:ss');
                                                        activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.QUIZ.TBL_QZ_USER_DETAILS, [`CONVERT_TZ(ud.created_date, 'UTC', CASE WHEN ud.timezone_name != "" THEN ud.timezone_name ELSE '${uTimezoneName}' END) as ud.created_date`], 'ud.user_id', 'ud.activity_id', altActId, `ud.completed='yes' AND DATE_FORMAT(CONVERT_TZ('ud.created_date', 'UTC', CASE WHEN ud.timezone_name != "" THEN ud.timezone_name ELSE '${uTimezoneName}' END),"%Y-%m-%d %H:%i:%s") BETWEEN ${QuizFactStartDate} AND ${QuizFactEndDate} `,req);

                                                        mptData = activityDone;
                                                        tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, '0', 'created_date', QuizactStartDate, QuizactEndDate);
                                                        tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                                                        points += tmppoints;
                                                    }
            
                                                    if (activeplugin.includes('Trackers')) {
                                                        /* ft_activity_feeds */
                                                        if (actId == 11) {
                                                            activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS, ['food.acId','food.logType','food.steps','food.collectionDate'], 'food.user_id', 'food.activityTypeId', altActId, `DATE_FORMAT(food.collectionDate,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                            let activityDone1 = await await this.userChallengeHelperService.Ifetch_point(tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS, ['food.acId','food.logType','food.steps','food.collectionDate'], 'food.user_id', 'food.activityTypeId', '15', `DATE_FORMAT(food.collectionDate,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                            activityDone = activityDone.CONCAT(activityDone1);
                                                            tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, 'ft_activity_feeds', 'collectionDate', actStartDate, actEndDate);
                                                            tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                                                            points += tmppoints;
                                                            
                                                        } else if (actId == 15) {
                                                            activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS, ['food.acId','food.logType','food.steps','food.collectionDate'], 'food.user_id', 'food.activityTypeId', altActId, `DATE_FORMAT(food.collectionDate,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                            let activityDone1 = await await this.userChallengeHelperService.Ifetch_point(tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS, ['food.acId','food.logType','food.steps','food.collectionDate'], 'food.user_id', 'food.activityTypeId', '11', `DATE_FORMAT(food.collectionDate,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                            activityDone = activityDone.CONCAT(activityDone1);
                                                            tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS, 'collectionDate', actStartDate, actEndDate);
                                                            tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                                                            points += tmppoints;
                                                        } else {
                                                            activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS, ['food.acId','food.logType','food.steps','food.collectionDate'], 'food.user_id', 'food.activityTypeId', altActId, `DATE_FORMAT(food.collectionDate,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                            tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS, 'collectionDate', actStartDate, actEndDate);
                                                            tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                                                            points += tmppoints;
                                                        }
            
                                                        /* ft_foods_feeds */
                                                        activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS, [`food.collectionDate`], 'food.user_id', 'food.activityTypeId', altActId, `DATE_FORMAT(food.collectionDate,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                        tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, 'ft_sleep_feeds', 'collectionDate', actStartDate, actEndDate);
                                                        tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                                                        points += tmppoints;
                                                        if (altActId == 151) {
                                                            tmppoints = 0;
                                                            activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS, [`food.collectionDate`], 'food.user_id', 'food.activityTypeId', '6', `DATE_FORMAT(food.collectionDate,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                            tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, 'ft_foods_feeds', 'collectionDate', actStartDate, actEndDate);
                                                            activityDone = await await this.userChallengeHelperService.Ifetch_point(tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS, [`food.collectionDate`], 'food.user_id', 'food.activityTypeId', '10', `DATE_FORMAT(food.collectionDate,"%Y-%m-%d %H:%i:%s") BETWEEN ${FactStartDate} AND ${FactEndDate} `,req);
                                                            tmppoints = await await this.userChallengeHelperService.count_point_act(activityDone, 'ft_foods_feeds', 'collectionDate', actStartDate, actEndDate);
                                                            tmppoints = await this.commonHealthService.check_max_point(tmppoints, altActPoint);
                                                            points += tmppoints;
                                                        }
                                                    }
                                                    activity[k]['altActivity'] = altActivity;
                                                }
                                            }
                                            if (activity[k]['Campaignactivity']['max_point'] < points) {
                                                points = activity[k]['Campaignactivity']['max_point'];
                                            }
                                            if (date != '' && points > 0) {
                                                if (HealthyHabittotalPoint[this.commonDateService.getTodayDate(date).format('YYYY/MM/DD')]) {
                                                    HealthyHabittotalPoint[this.commonDateService.getTodayDate(date).format('YYYY/MM/DD')] += points;
                                                } else {
                                                    HealthyHabittotalPoint[this.commonDateService.getTodayDate(date).format('YYYY/MM/DD')] = points;
                                                }
                                            }
                                            totalPoint += points;
                                            activity[k]['point'] = points;
                                            activity[k]['date'] = date;
                                            actPoints += points;
                                            if (cat_index > -1) {
                                                category[cat_index]['Activity'] = activity[k];
                                                activity[k] = "";
                                            }
                                        }
                                    }
                                }
                            }

                        }
                    }
            }
            return HealthyHabittotalPoint; 
        } catch(error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
    async healthyHabitActivityChallenge(schedule: any, req: Request, show_type = 1) {
        try {         
            let result = {};
            let user = Object.create(req.tokenUser);
            result['total_complete'] = 0;
            let Challengehealthactivities = await this.healthActivityService.listRecord({status: 1, org_id: schedule['sc']['org_id'], schedule_id: schedule['sc']['id']},{id:'ASC'});
            let findall = '(7,11,15,16,17,18)';

            let where = `food.collectionDate BETWEEN '${schedule['sc']['start_date']}' AND '${schedule['sc']['end_date']}' AND food.status = 1`;
            let AllStepmilesdata = await this.activityFeedsService.listRecord(`food.user_id in (${req.tokenUser?.id}) AND (food.activityTypeId in ${findall} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${where}`,{collectionDate: 'ASC'}, ['SUM(distance) as steps', 'collectionDate', 'DATE_FORMAT(CONCAT(DATE_FORMAT(food.collectionDate,"%Y-%m-%d "),DATE_FORMAT(food.timestamp,"%H:%i:%s")),"%Y-%m-%d %H:%i:%s") as collectionDate1, food.status'], 'food.user_id, food.collectionDate');
            const AllStepsdataDatewisetemp = AllStepmilesdata.reduce((acc, item) => {
                if (!acc[this.commonDateService.DateTimeFormat(item.collectionDate, 'YYYY-MM-DD').toString()]) {
                    acc[this.commonDateService.DateTimeFormat(item.collectionDate, 'YYYY-MM-DD').toString()] = 0;
                }
                acc[this.commonDateService.DateTimeFormat(item.collectionDate, 'YYYY-MM-DD').toString()] += item.steps;
                return acc;
            }, {});
            let HealthyHabittotalPoint = await this.healthyHabitTotalPoint(this.commonDateService.getTodayDate(schedule['sc']['start_date']).format('YYYY-MM-DD'),this.commonDateService.getTodayDate(schedule['sc']['end_date']).format('YYYY-MM-DD'), req);
            let ChallengehealthuseractivitiesTemp = await this.healthUsersActivityService.listRecord(`hua.org_id =${schedule['sc']['org_id']} AND hua.user_id =${user.id} AND hua.status = 1 AND health_activity.status = 1`,
                null,
                ['health_activity.avalue,hua.act_id,sum(miles) as Total','DATE_FORMAT(hua.act_date,"%Y-%m-%d") as act_date','DATE_FORMAT(hua.act_date,"%Y-%m-%d %H:%i:%s") as act_date1'],
                'hua.act_id, DATE_FORMAT(hua.act_date,"%Y-%m-%d")'
            );
            const ChallengehealthuseractivitiesTempData = ChallengehealthuseractivitiesTemp.reduce((acc, item) => {
                if (!acc[item.act_id]) {
                    acc[item.act_id] = [];
                }
                acc[item.act_id].push({[this.commonDateService.DateTimeFormat(item.act_date1,'YYYY-MM-DD HH:mm:ss').toString()] : Number(item?.Total)});
                return acc;
            }, {});

            let perActivity = 0;
            let EarnProgress = 0;
            let EarnProgressData = 0;
            let EarnTotalProgress = 0;
            let totalactivitycompletedata = 0;
            if(Challengehealthactivities && Challengehealthactivities.length){
                perActivity = (100/Challengehealthactivities.length);
                for(let ChallengehealthactivitiesData of Challengehealthactivities){
                    if(ChallengehealthactivitiesData.name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`healactivity_name_${ChallengehealthactivitiesData.schedule_id}_${ChallengehealthactivitiesData['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ChallengehealthactivitiesData.org_id}/${ChallengehealthactivitiesData.schedule_id}`,`dynamic`);
                        ChallengehealthactivitiesData.name = (customName == '' || customName == `healactivity_name_${ChallengehealthactivitiesData.schedule_id}_${ChallengehealthactivitiesData['id']}`) ? ChallengehealthactivitiesData['name'] : customName;
                    }
                    let tempdata = {};
                    let tempdata1 = [];
                    if(ChallengehealthactivitiesData['atype'] == 0){
                        if(ChallengehealthactivitiesData['is_track'] == 1){
                            if(ChallengehealthuseractivitiesTempData[ChallengehealthactivitiesData['id']] && AllStepsdataDatewisetemp){
                                tempdata1.push(AllStepsdataDatewisetemp);
                                tempdata1.push(ChallengehealthuseractivitiesTempData[ChallengehealthactivitiesData['id']]?.reduce((acc, obj) => {
                                    const key = Object.keys(obj)[0]; 
                                    acc[key] = obj[key]; 
                                    return acc; 
                                    }, {}));
                                tempdata1.forEach(item => {
                                    Object.entries(item).forEach(([key, value]) => {
                                        tempdata[key] = (tempdata[key] !== undefined) ? tempdata[key] + value : value;
                                    });
                                });
                            }else if(AllStepsdataDatewisetemp){
                                tempdata = AllStepsdataDatewisetemp;
                            }else{
                                if(ChallengehealthuseractivitiesTempData[ChallengehealthactivitiesData['id']]){
                                 tempdata = ChallengehealthuseractivitiesTempData[ChallengehealthactivitiesData['id']]?.reduce((acc, obj) => {
                                    const key = Object.keys(obj)[0]; 
                                    acc[key] = obj[key]; 
                                    return acc; 
                                    }, {}); 
                                }
                            }
                        }else{
                             if(ChallengehealthuseractivitiesTempData[ChallengehealthactivitiesData['id']]){
                               tempdata = ChallengehealthuseractivitiesTempData[ChallengehealthactivitiesData['id']]?.reduce((acc, obj) => {
                                const key = Object.keys(obj)[0]; 
                                acc[key] = obj[key]; 
                                return acc; 
                                }, {}); 
                              }
                        }
                    }else{
                        if(ChallengehealthactivitiesData['is_track']==1){
                            if(ChallengehealthuseractivitiesTempData[ChallengehealthactivitiesData['id']] && HealthyHabittotalPoint){
                                tempdata1.push(HealthyHabittotalPoint);
                                tempdata1.push(ChallengehealthuseractivitiesTempData[ChallengehealthactivitiesData['id']]?.reduce((acc, obj) => {
                                    const key = Object.keys(obj)[0]; 
                                    acc[key] = obj[key]; 
                                    return acc; 
                                    }, {}));
                                tempdata1.forEach(item => {
                                    Object.entries(item).forEach(([key, value]) => {
                                        tempdata[key] = (tempdata[key] !== undefined) ? tempdata[key] + value : value;
                                    });
                                });
                            }else if(HealthyHabittotalPoint){
                                tempdata = HealthyHabittotalPoint;
                            }else{
                                if(ChallengehealthuseractivitiesTempData[ChallengehealthactivitiesData['id']]){
                                    tempdata = Object.assign(
                                        tempdata,
                                        ...ChallengehealthuseractivitiesTempData[ChallengehealthactivitiesData['id']].map(item => {
                                            const key = Object.keys(item)[0];
                                            return { [key]: item[key] }; 
                                        })
                                    );
                                }
                            }
                        }else{
                             if(ChallengehealthuseractivitiesTempData[ChallengehealthactivitiesData['id']]){
                                tempdata = Object.assign(
                                    tempdata,
                                    ...ChallengehealthuseractivitiesTempData[ChallengehealthactivitiesData['id']].map(item => {
                                        const key = Object.keys(item)[0];
                                        return { [key]: item[key] }; 
                                    })
                                );
                             }
                        }
                    }
                    ChallengehealthactivitiesData['today_remain'] = ChallengehealthactivitiesData['avalue'];
                    ChallengehealthactivitiesData['acprogress'] = 0; 
                    ChallengehealthactivitiesData['complete'] = 0; 
                    ChallengehealthactivitiesData['Miles'] = 0; 
                    ChallengehealthactivitiesData['today_completed'] = 0;           
                    if (Object.keys(tempdata).length > 0) {
                        tempdata = Object.fromEntries(Object.entries(tempdata).sort(([keyA], [keyB]) =>moment(keyA).valueOf() - moment(keyB).valueOf()));
                        ChallengehealthactivitiesData['today_remain'] = 0;    
                        let frequincy = ChallengehealthactivitiesData['frequency'];
                        let frequincy_max_point = ChallengehealthactivitiesData['avalue'];
                        let tempdataTotal = 0;
                        if(frequincy==0){
                            let totalSum = 0;
                            for (const key in tempdata) {
                                if (tempdata.hasOwnProperty(key)) {
                                    tempdata[key] = (parseInt(tempdata[key]) >= frequincy_max_point) ? frequincy_max_point : parseInt(tempdata[key]);
                                    totalSum += tempdata[key];
                                }
                            }
                            tempdataTotal = Math.floor(totalSum);
                        }
                        const passingType = (frequincy === 1) ? 'W' : (frequincy === 2) ? 'MM/YYYY' : 'YYYY';
                        const totalDaysStep = {};
                        if([1, 2, 3].includes(frequincy)){
                            for (const adkey in tempdata) {
                                if (tempdata.hasOwnProperty(adkey)) {
                                    const advalue = tempdata[adkey]; 
                                    const dateKey = this.commonDateService.DateTimeFormat(adkey, passingType).toString(); 
                                    if (totalDaysStep[dateKey]) {
                                        totalDaysStep[dateKey] += advalue; 
                                    } else {
                                        totalDaysStep[dateKey] = advalue; 
                                    }
                                    if (totalDaysStep[dateKey] >= frequincy_max_point) {
                                        totalDaysStep[dateKey] = frequincy_max_point; 
                                    }
                                }
                            }
                            let totalSum = 0;
                            for (const key in totalDaysStep) {
                                if (totalDaysStep.hasOwnProperty(key)) {
                                    totalSum += totalDaysStep[key];
                                }
                            }
                            tempdataTotal = Math.floor(totalSum);
                        }
                        if(tempdataTotal >= ChallengehealthactivitiesData['amax']){
                            ChallengehealthactivitiesData['complete'] = 1;
                            ChallengehealthactivitiesData['Miles'] = tempdataTotal;
                            ChallengehealthactivitiesData['acprogress'] = ((tempdataTotal*100)/ChallengehealthactivitiesData['amax']);
                            if(ChallengehealthactivitiesData['acprogress'] > 100){
                                ChallengehealthactivitiesData['acprogress'] = 100;
                            }
                            totalactivitycompletedata++; 
                            let counttemp = 0;
                            for (const tempdataKey in tempdata) {
                                if (tempdata.hasOwnProperty(tempdataKey)) {
                                    const tempdataData = tempdata[tempdataKey];
                                    counttemp += tempdataData;
                                    if (counttemp >= ChallengehealthactivitiesData.amax) {
                                        let startMonthName = await this.translatorService.frontendReadTranslation(req.lang, this.commonDateService.DateTimeFormat(tempdataKey, 'MMMM')?.toString(), `/LC_MESSAGES/Common/Month`,`static`);
                                        ChallengehealthactivitiesData['complete_date']= startMonthName.toString().substring(0, 3) + ' ' + this.commonDateService.DateTimeFormat(tempdataKey, 'D, YYYY');
                                        ChallengehealthactivitiesData['complete_date_TS']= this.commonDateService.DateTimeFormat(tempdataKey, 'timestamp');
                                        break;
                                    }
                                }
                            }
                            EarnProgressData += ChallengehealthactivitiesData['amax'];
                        }else{
                            tempdata = Object.fromEntries(
                                Object.entries(tempdata).map(([k, v]) => [k.slice(0, 10), v])
                            );
                            ChallengehealthactivitiesData['complete'] = 0;
                            ChallengehealthactivitiesData['Miles'] = tempdataTotal;
                            EarnProgressData += tempdataTotal; 
                            ChallengehealthactivitiesData['acprogress'] = ((tempdataTotal*100)/ChallengehealthactivitiesData['amax']);
                            if (frequincy === 0) {
                                const todayKey = this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD').toString();
                                if (tempdata[todayKey] !== undefined) {
                                    ChallengehealthactivitiesData['today_completed'] = tempdata[todayKey];
                                    ChallengehealthactivitiesData['today_remain'] = Math.ceil(ChallengehealthactivitiesData.avalue - tempdata[todayKey]);
                                } else {
                                    ChallengehealthactivitiesData['today_remain'] = Math.ceil(ChallengehealthactivitiesData.avalue);
                                }
                            }
                            
                            if ([1, 2, 3].includes(frequincy)) {
                                const formattedDate = this.commonDateService.DateTimeFormat('now', passingType).toString(); 
                                if (totalDaysStep[formattedDate] !== undefined) {
                                    ChallengehealthactivitiesData['today_completed'] = totalDaysStep[formattedDate];
                                    ChallengehealthactivitiesData['today_remain'] = Math.ceil(ChallengehealthactivitiesData.avalue - totalDaysStep[formattedDate]);
                                } else {
                                    ChallengehealthactivitiesData['today_remain'] = Math.ceil(ChallengehealthactivitiesData.avalue);
                                }
                            }
                        }
                    }
                
                }
             
            }
           
            EarnProgressData = Math.floor(EarnProgressData);
            result['Challengehealthactivities'] = Challengehealthactivities;
            EarnTotalProgress = schedule['sc']['tr_totalgoalvalue'];
            if(EarnProgressData >= EarnTotalProgress){
                result['total_complete'] = 1;
            }
            if(show_type == 2){
                if(result['total_complete']){
                    delete(result['total_complete'])
                }
                if(result['Challengehealthactivities']){
                    result['Challengehealthactivities'] = result['Challengehealthactivities'].map(({created,updated,avalue,atype,amax,frequency,is_track,today_remain,complete_date,created_by,updated_by,org_id,schedule_id,status,...rest})=>rest);
                    
                    const completed = result['Challengehealthactivities'].filter(item => parseFloat(item.acprogress) === 100);
                    const notStarted = result['Challengehealthactivities'].filter(item => parseFloat(item.acprogress) === 0);
                    const sortedCompleted = completed.sort((a, b) => a.complete_date_TS - b.complete_date_TS);

                    let inProgress = result['Challengehealthactivities'].filter(item => {
                    const progress = parseFloat(item.acprogress);
                        return progress > 0 && progress < 100;
                    });
                    if (inProgress.length < 5 && notStarted.length > 0) {
                        let remainInProgress = 5 - inProgress.length;
                        inProgress = [...inProgress, ...notStarted.slice(0, remainInProgress)];
                    }

                    let results: any[] = [];
                    if (inProgress.length >= 5) {
                        results = [...inProgress.slice(0, 5)];
                    }else if (inProgress.length === 4) {
                        const lastCompleted = sortedCompleted.slice(-1); // last 1
                        results = [...inProgress, ...lastCompleted];
                    }else if (inProgress.length === 3) {
                        const lastCompleted = sortedCompleted.slice(-2); // last 1
                        results = [...inProgress, ...lastCompleted];
                    }else if (inProgress.length === 2) {
                        const lastCompleted = sortedCompleted.slice(-3); // last 1
                        results = [...inProgress, ...lastCompleted];
                    } else if (inProgress.length === 1) {
                        const lastTwoCompleted = sortedCompleted.slice(-4);
                        results = [...inProgress, ...lastTwoCompleted];
                    } else {
                        results = [...sortedCompleted.slice(-5)];
                    }
                    
                    const sortedById = results.sort((a, b) => a.id - b.id);
                    result['Challengehealthactivities'] = sortedById;
                }
                return result;
            }
            result['progress'] = (EarnTotalProgress!=0) ? parseFloat(((EarnProgressData * 100) / EarnTotalProgress).toFixed(2)) : 0;
            if (result['progress'] > 100) {
                result['progress'] =  100;
            }
            result['progressData'] = EarnProgressData;
            result['EarnTotalProgress'] = EarnTotalProgress;
                
          return result;
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
    async healthyHabitAllActivityChallenge(schedule: any, req: Request, show_type = 1) {
        try {         
            let result = {};
            let user = Object.create(req.tokenUser);
            let schedule_id = schedule['sc']['id'];
            let id = schedule['sc']['challenge_id'];
            let scheduleEndDate = schedule['sc']['end_date'];
            let scheduleid = schedule['id'];
            let totalweekactivities = schedule['sc']['enteratotalactivity'] ?? 0;
            let current_datetime = this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss','',user['timeZone'])
            let weeks = await this.scheduleChallengeJoinUsersService.healthyHabbitAllActivity(
                `scj.challenge_id=${id} AND scj.schedule_id=${schedule_id} AND scj.user_id=${user.id} AND scj.status != 2`
            );  
            if(weeks.length){
                let weekTrans = await this.translatorService.frontendReadTranslation( req.lang, 'Week', `/LC_MESSAGES/Challenge/MyChallenges`, `static`);
                let week = 1;
                await Promise.all(weeks.map(async (ele)=>{
                    let translationMessage = await this.translatorService.readTranslation(req.lang || 'eng', `/LC_MESSAGES/Challenge/MyChallenges/0/${ele['challenge_id']}/dynamic.json`);
                    if(!translationMessage){
                        translationMessage = await this.translatorService.readTranslation('eng', `/LC_MESSAGES/Challenge/MyChallenges/0/${ele['challenge_id']}/dynamic.json`);
                    }
                    if(ele.weeks_manual_activity){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `week_activity_name_${ele['challenge_id']}_${ele['week_id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${ele['challenge_id']}`,`dynamic`);
                        if (customName != `week_activity_name_${ele['challenge_id']}_${ele['week_id']}`) {
                            ele.weeks_manual_activity = customName;
                        }
                    }
                    if(ele.weeks_site_activity_desc){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `week_activity_description_${ele['challenge_id']}_${ele['week_id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${ele['challenge_id']}`,`dynamic`);
                        if (customName != `week_activity_description_${ele['challenge_id']}_${ele['week_id']}`) {
                            ele.weeks_site_activity_desc = customName;
                        }
                    }
                    if(ele.weeks_manual_desc){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `week_description_${ele['challenge_id']}_${ele['week_id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${ele['challenge_id']}`,`dynamic`);
                        if (customName != `week_description_${ele['challenge_id']}_${ele['week_id']}`) {
                            ele.weeks_manual_desc = customName;
                        }
                    }
                    if(ele.weeks_tabmanual){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `week_tabmanual_${ele['challenge_id']}_${ele['week_id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${ele['challenge_id']}`,`dynamic`);
                        if (customName != `week_tabmanual_${ele['challenge_id']}_${ele['week_id']}`) {
                            ele.weeks_tabmanual = customName;
                        }
                    }
                    else{
                        if(!ele?.weeks_tabmanual || ele?.weeks_tabmanual == ''){
                            ele.weeks_tabmanual = `${weekTrans}${week}`;
                        }
                    }
                    ele['ac']={id: ele.ac_id, activity_name: ele.ac_activity_name};
                    ele['weeks']={
                        logofile: ele?.weeks_logofile ? S3_URL + ele.weeks_logofile : schedule['challengeDetails']['custom_logo'],  
                        manual_activity : ele.weeks_manual_activity, 
                        manual_desc  : ele.weeks_manual_desc , 
                        site_activity_desc  : ele.weeks_site_activity_desc , 
                        tabmanual  : ele.weeks_tabmanual , 
                    };
                }));
            }
            result['all'] = weeks;
            let completedweeks = 0;
            result['totaladdedweekcomp'] = 0;
            let totalweeks = weeks?.length; 
            result['totaladdedweek'] = weeks?.length;   
            let completeddays = 0;
            let CustomtotalWeekpercantage = (100/totalweeks);
            let dataentryarray = [];
            if(schedule['ch']['requirementbased']==1 && schedule['ch']['numberofweek'] != 0){
                totalweeks = schedule['ch']['numberofweek'];
                result['totaladdedweek'] = schedule['ch']['numberofweek'];
                CustomtotalWeekpercantage = (100/totalweeks);
            }
            let numberofweek = schedule['ch']['numberofweek'];
            let numberofday = (schedule['ch']['numberofday']=='' || schedule['ch']['numberofday']==0) ? 1 : schedule['ch']['numberofday'];
            result['numberofweek'] = numberofweek;
            result['numberofday'] = numberofday;
            let totalactivityinchallenge = 0;
            let totaldaysactivitys = [];
            for (let i = 0; i < weeks.length; i++) {
                let wid = weeks[i]['week_id'];
                weeks[i]['status_act'] = 0;
                weeks[i]['notcompleted'] = 0;
                if (weeks[i]?.['ac']?.['activity_name'] && weeks[i]['ac']['activity_name'].trim() != "") {
                    let weekstart_date = weeks[i]['start_date'];
                    let weekend_date = weeks[i]['end_date'];
                    let actname = weeks[i]['ac']['activity_name'].replace(/ /g, '_').replace(/\(/g, '').replace(/\)/g, '').toLowerCase();
                    let datewherecondition = "";
                    let activity_id = weeks[i]['activity_id'];

                    if (actname == "health_risk_assessment") {
                        let healthdata = await this.assessmentsService.listRecord({user_id: user.id, activity_id: activity_id, status: Not(2)},{'healthassessment.date': 'DESC'});

                        if (healthdata.length >= 1) {
                            weeks[i]['status_act'] = 1;
                            weeks[i]['activitydetail'] = healthdata;
                        } else {
                            weeks[i]['notcompleted'] = 1;
                        }
                    }
                    if (actname == "activity_tracker-_walking" || actname == "activity_tracker-_running" || actname == "activity_tracker-_cycling" || actname == "activity_tracker-_swimming") {
                        let data = await this.activityFeedsService.listRecord(`food.user_id in (${user.id}) AND (food.activityTypeId = ${activity_id} OR appName='AppleHealthKit' OR appName='GoogleFit') ${datewherecondition} AND food.status = 1`,{'food.timestamp': 'DESC'});
                        if (data.length >= 1) {
                            let mstep = weeks[i]['steps'];
                            let mduration = weeks[i]['duration'];
                            let mdistance = weeks[i]['distance'];
                            let mcalories = weeks[i]['calories'];

                            let calories = data[0]['calories'];
                            let distance = data[0]['distance'];
                            let steps = data[0]['steps'];
                            let duration = data[0]['duration'];
                            if (actname == "activity_tracker-_walking") {
                                if (mstep <= steps && mduration <= duration && mdistance <= distance && mcalories <= calories) {
                                        weeks[i]['status_act'] = 1;
                                } else {
                                        weeks[i]['notcompleted'] = 1;
                                }
                            }
                            if (actname == "activity_tracker-_running" || actname == "activity_tracker-_cycling" || actname == "activity_tracker-_swimming") {
                                if (mduration <= duration && mdistance <= distance && mcalories <= calories) {
                                        weeks[i]['notcompleted'] = 1;
                                } else {
                                        weeks[i]['notcompleted'] = 1;
                                }
                            }
                            weeks[i]['activitydetail'] = data[0];
                        }
                    }

                    if (actname == "water_tracker") {
                        let waterdata = await this.foodFeedsService.listRecord(`food.user_id = ${user.id} AND food.activityTypeId = ${activity_id}  ${datewherecondition} AND food.status = 1`,{'food.timestamp': 'DESC'});
                        let mwaterlogunit = weeks[i]['waterlogunit'];
                        let mamount = weeks[i]['amount'];

                        if (waterdata.length >= 1) {
                            let waterlogunit = waterdata[0]['foodUnit'];
                            let amount = waterdata[0]['amount'];
                            weeks[i]['activitydetail'] = waterdata[0];
                            if (mwaterlogunit <= waterlogunit && mamount <= amount) {
                                weeks[i]['status_act'] = 1;
                            } else {
                                weeks[i]['notcompleted'] = 1;
                            }
                        } else {
                            weeks[i]['notcompleted'] = 1;
                        }
                    }
                    if (actname == "food_tracker") {
                        let mmeal;
                        let meal = weeks[i]['meal'];
                        if (meal == "Breakfast") {
                            mmeal = 1;
                        } else if (meal == "Lunch") {
                            mmeal = 3;
                        } else if (meal == "Snack") {
                            mmeal = 4;
                        } else if (meal == "Dinner") {
                            mmeal = 5;
                        } else {
                            mmeal = 6;
                        }
                        let mquantity = weeks[i]['quantity'];
                        let fooddata = await this.foodFeedsService.listRecord(`food.user_id = ${user.id} AND food.activityTypeId = ${activity_id} ${datewherecondition} AND food.status = 1`,{'food.timestamp': 'DESC'});

                        if (fooddata.length >= 1) {
                            let meal = fooddata[0]['mealTypeId'];
                            let quantity = fooddata[0]['amount'];
                            weeks[i]['activitydetail'] = fooddata[0];
                            if (mmeal == meal && mquantity <= quantity) {
                                weeks[i]['status_act'] = 1;
                            } else {
                                weeks[i]['notcompleted'] = 1;
                            }
                        } else {
                            weeks[i]['notcompleted'] = 1;
                        }
                    }
                    if (actname == "blood_pressure" || actname == "bmi" || actname == "total_cholesterol" || actname == "hdl" || actname == "triglycerides" || actname == "blood_pressure" || actname == "ldl" || actname == "glucose_or_ac1") {
                        let biodata = await this.biometricsService.biometricsListRecord(
                        `hb.user_id = ${user.id} AND hb.status !=2
                        AND(
                            activity_id REGEXP '^${activity_id},' OR
                            activity_id REGEXP ',${activity_id}$' OR
                            activity_id REGEXP ',${activity_id},' OR
                            activity_id = ${activity_id} 
                            )
                        ${datewherecondition}
                        `
                        ,['hb.created'])?.[0];
                        if (biodata) {
                            weeks[i]['activitydetail'] = biodata[0];
                            weeks[i]['status_act'] = 1;
                        } else {
                            weeks[i]['notcompleted'] = 1;
                        }
                    }

                    if (actname == "physician_form" || actname == "dental_visit_form" || actname == "optometrist_form") {
                        let formdata = await this.authorizationsService.listRecord(`a.user_id = ${user.id} AND a.status != 2 AND a.activity_id = ${activity_id} ${datewherecondition}`,null,{'a.updated': 'DESC'})
                        if (formdata.length >= 1) {
                            weeks[i]['activitydetail'] = formdata[0];
                            weeks[i]['status_act'] = 1;
                        } else {
                            weeks[i]['notcompleted'] = 1;
                        }
                    }
                    if (actname == "tobacco_affidavit") {
                        let tformdata = await this.tobaccoUsesService.listRecord(`tu.user_id = ${user.id} AND tu.activity_id = ${activity_id} ${datewherecondition} AND tu.status !=2`,null,{'tu.updated': 'DESC'})
                        if (tformdata.length >= 1) {
                            weeks[i]['activitydetail'] = tformdata[0];
                            weeks[i]['status_act'] = 1;
                        } else {
                            weeks[i]['notcompleted'] = 1;
                        }
                    }
                }
            
                if (weeks[i]['status'] == 1 || weeks[i]['status_act'] == 1) {
                    completedweeks++;
                    if(schedule['ch']['requirementbased']==1){
                        dataentryarray[weeks[i]['week_id']] = weeks[i]['week_id'];
                    }
                    result['totaladdedweekcomp']++;
                }
                let days = await this.daysUsersService.listRecord(`du.week_id = ${wid} AND du.challenge_id = ${id} AND du.schedule_id = ${scheduleid} AND du.user_id = ${user.id} AND du.status != 2`,
                    {day_id : 'ASC'},
                    ['du','ac.activity_name','days.site_activity_desc','days.manual_activity','days.manual_desc','days.logofile','days.manuallink']);
                result['all'][i] = weeks[i];
                let totaldays = days?.length;
                let d = days;
                totaldaysactivitys.push(totaldays)
                if(days){
                    for(let ele of days){
                        let translationMessage = await this.translatorService.readTranslation(req.lang || 'eng', `/LC_MESSAGES/Challenge/MyChallenges/0/${ele['challenge_id']}/dynamic.json`);
                        if(!translationMessage){
                            translationMessage = await this.translatorService.readTranslation('eng', `/LC_MESSAGES/Challenge/MyChallenges/0/${ele['challenge_id']}/dynamic.json`);
                        }
                        if(ele.manual_activity){
                            ele.manual_activity = translationMessage.find((ele)=> ele.type == `week_days_activity_name_${ele['challenge_id']}_${ele['week_id']}_${ele['day_id']}`)?.['translate'] ?? ele.manual_activity;
                        }
                        if(ele.site_activity_desc){
                            ele.site_activity_desc = translationMessage.find((ele)=> ele.type == `week_days_activity_description_${ele['challenge_id']}_${ele['week_id']}_${ele['day_id']}`)?.['translate'] ?? ele.site_activity_desc;
                        }
                        if(ele.manual_desc){
                            ele.manual_desc = translationMessage.find((ele)=> ele.type == `week_days_description_${ele['challenge_id']}_${ele['week_id']}_${ele['day_id']}`)?.['translate'] ?? ele.manual_desc;
                        }
                        if(ele['days'].manual_activity){
                            ele['days'].manual_activity = translationMessage.find((ele)=> ele.type == `week_days_activity_name_${ele['challenge_id']}_${ele['week_id']}_${ele['day_id']}`)?.['translate'] ?? ele['days'].manual_activity;
                        }
                        if(ele['days'].site_activity_desc){
                            ele['days'].site_activity_desc = translationMessage.find((ele)=> ele.type == `week_days_activity_description_${ele['challenge_id']}_${ele['week_id']}_${ele['day_id']}`)?.['translate'] ?? ele['days'].site_activity_desc;
                        }
                        if(ele['days'].manual_desc){
                            ele['days'].manual_desc = translationMessage.find((ele)=> ele.type == `week_days_description_${ele['challenge_id']}_${ele['week_id']}_${ele['day_id']}`)?.['translate'] ?? ele['days'].manual_desc;
                        }
                    }
                    result['all'][i]['weekdaystotal'] = totaldays;
                    result['all'][i]['weekdaystotalcomp'] = 0;
                }
                result['all'][i]['Total'] = numberofday;
                result['all'][i]['Progress'] = CustomtotalWeekpercantage;
                let disableactivitytempweek = '';
                let timezone = user['timeZone'] ? user['timeZone'].trim() : 'UTC';                
                weeks[i]['start_date_comp'] = weeks[i]['start_date'];
                if(timezone.trim() != ""){
                    if(timezone.trim() == "Pacific Standard Time (PST)"){
                        timezone = "America/Los_Angeles";
                    }
                    if(timezone.trim() == "Mountain Standard Time (MST)"){
                        timezone = "America/Denver";
                    }
                    if(timezone.trim() == "Central Standard Time (CST)"){
                        timezone = "America/Chicago";
                    }
                    if(timezone.trim() == "Eastern Standard Time (EST)"){
                        timezone = "America/New_York";
                    } 
                    let startDate = moment.tz(weeks[i]['start_date'], 'YYYY-MM-DD HH:mm:ss', timezone);  
                    startDate = startDate.tz('UTC').format('YYYY-MM-DD HH:mm:ss'); 
                    weeks[i]['start_date_comp'] = startDate;                                                
                }
                let showButtonStatus = '';
                if(this.commonDateService.getTodayDate(current_datetime).unix() <= this.commonDateService.getTodayDate(weeks[i]['start_date_comp']).unix()){
                     showButtonStatus = await this.translatorService.frontendReadTranslation(req.lang,'Week Not Started', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                }
                if(schedule['sc']['enable_week_log']==1 && this.commonDateService.getTodayDate(current_datetime).unix() < this.commonDateService.getTodayDate(weeks[i]['start_date_comp']).unix() ){ disableactivitytempweek = 'disabled="disabled"'; }
                if(schedule['ch']['requirementbased']==1 && this.commonDateService.getTodayDate(current_datetime).unix() < this.commonDateService.getTodayDate(weeks[i]['start_date_comp']).unix() ){ disableactivitytempweek = 'disabled="disabled"'; }
                for (let j = 0; j < d.length; j++) {
                    if(d[j]['days'] && d[j]['days']['logofile'] && (d[j]['days']['logofile'].includes('chday') || d[j]['days']['logofile'].includes('challenge'))){
                        d[j]['days']['logofile'] = S3_URL + d[j]['days']['logofile']
                    }
                    let did = d[j]['day_id'];                    
                    //buttom condition start
                    let showButton = 'yes';
                    let complete = false;
                    let challengeEndDate = scheduleEndDate;
                    if(schedule['sc']['enable_week_log']==1){
                        challengeEndDate = moment(moment(scheduleEndDate).format('YYYY-MM-DD') + ' 23:59:59').add(7, 'days').format('YYYY-MM-DD HH:mm:ss')
                    }
                    
                    if(this.commonDateService.getTodayDate(current_datetime).unix() >= this.commonDateService.getTodayDate(challengeEndDate).unix()){
                        showButton = 'no'; 
                        showButtonStatus = await this.translatorService.frontendReadTranslation(req.lang,'Challenge has ended', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    }

                    let disableactivitytemp = '';
                    let timezoneUser = user['timeZone'] ? user['timeZone'].trim() : '';                    
                    if(timezoneUser.trim() != ""){                       
                        if(timezone.trim() == "Pacific Standard Time (PST)"){
                            timezone = "America/Los_Angeles";
                        }
                        if(timezone.trim() == "Mountain Standard Time (MST)"){
                            timezone = "America/Denver";
                        }
                        if(timezone.trim() == "Central Standard Time (CST)"){
                            timezone = "America/Chicago";
                        }
                        if(timezone.trim() == "Eastern Standard Time (EST)"){
                            timezone = "America/New_York";
                        } 
                        let startDate = moment.tz(d[j]['start_date'], 'YYYY-MM-DD HH:mm:ss', timezoneUser);  
                        startDate = startDate.tz('UTC').format('YYYY-MM-DD HH:mm:ss'); 
                        d[j]['start_date'] = startDate;                                                
                    }                   
                    if(schedule['sc']['enable_week_log'] == 1 && this.commonDateService.getTodayDate(current_datetime).unix() < this.commonDateService.getTodayDate(d[j]['start_date']).unix() ){ disableactivitytemp = 'disabled="disabled"'; }
                    if(schedule['ch']['requirementbased']==1){ 
                        disableactivitytemp = disableactivitytempweek; 
                    }
                    d[j]['buttonText'] = null; 
                    if(d[j]['status'] == 0){
                        if (schedule['ch']['requirementbased'] != 1 || weeks[i]['status'] != 1) {
                            if (showButton == 'yes') {
                                complete = false;
                                showButtonStatus = await this.translatorService.frontendReadTranslation(req.lang,'Incomplete', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            }
                        }
                        const lockIs = (schedule['sc']['is_set_weekend'] === 1 && d[j]['linkstatus'] === 0) ? 1 : 0;
                        d[j]['buttonText'] = await this.translatorService.frontendReadTranslation(req.lang,'Mark As Complete', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    }else{
                        complete = true;
                        d[j]['buttonText'] = await this.translatorService.frontendReadTranslation(req.lang,'Completed', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                        showButtonStatus = await this.translatorService.frontendReadTranslation(req.lang,'Completed', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                        showButton = 'no';
                    }
                    d[j]['showButton'] = showButton;
                    d[j]['showButtonStatus'] = showButtonStatus;
                    d[j]['complete'] = complete;
                    d[j]['disableactivitytemp'] = disableactivitytemp;
                    d[j]['disableactivitytempweek'] = disableactivitytempweek;
                    //buttom condition end

                    d[j]['status_act'] = 0;
                    d[j]['notcompleted'] = 0;
                    if (d[j]?.['ac']?.['activity_name'] && d[j]['ac']['activity_name'] != "") {
                        let daystart_date = d[j]['start_date'];
                        let dayend_date = d[j]['end_date'];
                        let actname = d[j]['ac']['activity_name']
                        .replace(/ /g, '_')
                        .replace(/\(|\)/g, '')
                        .toLowerCase();
                        let datewherecondition = "";
                        let activity_id = d[j]['activity_id'];

                        if (actname == "health_risk_assessment") {
                            let healthdata = await this.assessmentsService.listRecord({user_id: user.id, activity_id: activity_id, status: Not(2)},{'healthassessment.date': 'DESC'});
                            if (healthdata.length >= 1) {
                                d[j]['status_act'] = 1;
                                d[j]['activitydetail'] = healthdata;
                            } else {
                                d[j]['notcompleted'] = 1;
                            }
                        }
                        if (actname == "activity_tracker-_walking" || actname == "activity_tracker-_running" || actname == "activity_tracker-_cycling" || actname == "activity_tracker-_swimming") {
                            let data = await this.activityFeedsService.listRecord(`food.user_id in (${user.id}) AND (food.activityTypeId = ${activity_id} OR appName='AppleHealthKit' OR appName='GoogleFit') ${datewherecondition} AND food.status = 1`,{'food.timestamp': 'DESC'});
                            
                            if (data.length >= 1) {
                                let mstep = d[j]['steps'];
                                let mduration = d[j]['duration'];
                                let mdistance = d[j]['distance'];
                                let mcalories = d[j]['calories'];

                                let calories = data[0]['calories'];
                                let distance = data[0]['distance'];
                                let steps = data[0]['steps'];
                                let duration = data[0]['duration'];
                                if (actname == "activity_tracker-_walking") {
                                    if (mstep <= steps && mduration <= duration && mdistance <= distance && mcalories <= calories) {
                                        d[j]['status_act'] = 1;
                                    } else {
                                        d[j]['notcompleted'] = 1;
                                    }
                                }
                                if (actname == "activity_tracker-_running" || actname == "activity_tracker-_cycling" || actname == "activity_tracker-_swimming") {
                                        if (mduration <= duration && mdistance <= distance && mcalories <= calories) {
                                            d[j]['notcompleted'] = 1;
                                        } else {
                                            d[j]['notcompleted'] = 1;
                                        }
                                }
                                d[j]['activitydetail'] = data[0];
                            }
                        }
                        if (actname == "water_tracker") {
                            let waterdata = await this.foodFeedsService.listRecord(`food.user_id = ${user.id} AND food.activityTypeId = ${activity_id}  ${datewherecondition} AND food.status = 1`,{'food.timestamp': 'DESC'});

                            let mwaterlogunit = d[j]['waterlogunit'];
                            let mamount = d[j]['amount'];

                            if (waterdata.length >= 1) {
                                let waterlogunit = waterdata[0]['foodUnit'];
                                let amount = waterdata[0]['amount'];
                                weeks[i]['activitydetail'] = waterdata[0];
                                if (mwaterlogunit <= waterlogunit && mamount <= amount) {
                                        d[j]['status_act'] = 1;
                                } else {
                                        d[j]['notcompleted'] = 1;
                                }
                            } else {
                                d[j]['notcompleted'] = 1;
                            }
                        }
                        if (actname == "food_tracker") {
                            let mmeal;
                            let meal = weeks[i]['meal'];
                            if (meal == "Breakfast") {
                                mmeal = 1;
                            } else if (meal == "Lunch") {
                                mmeal = 3;
                            } else if (meal == "Snack") {
                                mmeal = 4;
                            } else if (meal == "Dinner") {
                                mmeal = 5;
                            } else {
                                mmeal = 6;
                            }
                            let mquantity = d[j]['quantity'];
                            let fooddata = await this.foodFeedsService.listRecord(`food.user_id = ${user.id} AND food.activityTypeId = ${activity_id} ${datewherecondition} AND food.status = 1`,{'food.timestamp': 'DESC'});

                            if (fooddata.length >= 1) {
                                let meal = fooddata[0]['ft_foods_feeds']['mealTypeId'];
                                let quantity = fooddata[0]['ft_foods_feeds']['amount'];
                                d[j]['activitydetail'] = fooddata[0]['ft_foods_feeds'];

                                if (mmeal == meal && mquantity <= quantity) {
                                    d[j]['status_act'] = 1;
                                } else {
                                    d[j]['notcompleted'] = 1;
                                }
                            } else {
                                d[j]['notcompleted'] = 1;
                            }
                        }
                        if (actname == "blood_pressure" || actname == "bmi" || actname == "total_cholesterol" || actname == "hdl" || actname == "triglycerides" || actname == "blood_pressure" || actname == "ldl" || actname == "glucose_or_ac1") {
                            let biodata = await this.biometricsService.biometricsListRecord(
                                        `hb.user_id = ${user.id} AND hb.status !=2
                                        AND(
                                            activity_id REGEXP '^${activity_id},' OR
                                            activity_id REGEXP ',${activity_id}$' OR
                                            activity_id REGEXP ',${activity_id},' OR
                                            activity_id = ${activity_id} 
                                            )
                                        ${datewherecondition}
                                        `
                                        ,['hb.created'])?.[0];

                            if (biodata.length >= 1) {
                                    d[j]['activitydetail'] = biodata[0]['hc_biometrics'];
                                    d[j]['status_act'] = 1;
                            } else {
                                    d[j]['notcompleted'] = 1;
                            }
                        }
                        if (actname == "physician_form" || actname == "dental_visit_form" || actname == "optometrist_form") {
                            let formdata = await this.authorizationsService.listRecord(`a.user_id = ${user.id} AND a.status != 2 AND a.activity_id = ${activity_id} ${datewherecondition}`,null,{'a.updated': 'DESC'})
                            if (formdata.length >= 1) {
                                    d[j]['activitydetail'] = formdata[0]['hc_authorizations'];
                                    d[j]['status_act'] = 1;
                            } else {
                                    d[j]['notcompleted'] = 1;
                            }
                        }
                        if (actname == "tobacco_affidavit") {
                            let tformdata = await this.tobaccoUsesService.listRecord(`tu.user_id = ${user.id} AND tu.activity_id = ${activity_id} AND tu.status != 2 ${datewherecondition}`,null,{'tu.updated': 'DESC'})
                            if (tformdata.length >= 1) {
                                    d[j]['activitydetail'] = tformdata[0]['hc_tabaccouses'];
                                    d[j]['status_act'] = 1;
                            } else {
                                    d[j]['notcompleted'] = 1;
                            }
                        }
                    }
                    if(schedule['ch']['requirementbased']==1){
                        if (result['all'][i]['status'] != 1 && (d[j]['status'] == 1 || d[j]['status_act'] == 1)) {
                            completeddays++;
                            result['all'][i]['weekdaystotalcomp'] +=1;
                        }
                    }
                    result['all'][i]['days'] = d;
                }
                if (weeks[i]['status'] == 1 || weeks[i]['status_act'] == 1) {
                    result['all'][i]['weekdaystotalcomp'] = totaldays;
                }
            }
        
            let total = 0;
            if (result['totaladdedweekcomp'] > result['totaladdedweek']) {
                result['totaladdedweekcomp'] = result['totaladdedweek'];
            }
            result['totalweekactivities'] = (totalweekactivities !== 0 && totalweekactivities !== '') ? totalweekactivities : totaldaysactivitys.reduce((acc, val) => acc + val, 0);
            result['progress'] = (completeddays * 100) / result['totalweekactivities'];
            if (result['progress'] > 100) {
                result['progress'] = 100;
            }
            result['singleactivityper'] = result['totalweekactivities'] != 0 ? (100 / result['totalweekactivities']) : 0;
            result['totalcompactivities'] = (result['totalweekactivities'] < completeddays) ? result['totalweekactivities'] : completeddays;
            if(result['all'].length){
                await Promise.all(result['all'].map((ele)=>{
                    if(ele['days'] && ele['days'].length){
                        ele['days'] = ele['days'].sort((a, b) => a.id - b.id);
                    }
                }));
            }
            return result;
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
}