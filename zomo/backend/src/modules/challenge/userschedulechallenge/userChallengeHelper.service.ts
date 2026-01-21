import { ActivityService } from '@/modules/activity/activity/activity.service';
import { UrlManageService } from '@/modules/common';
import { NotificationsController } from '@/modules/notifications/notifications.controller';
import { appConstant, CommonArrayService, CommonDateService, CommonService, RecipeDto, tableConstant } from '@common-constants';
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request } from "express";
import { lastValueFrom } from "rxjs";
import { UpdateTeamMembersInput } from 'src/input';
import { CommunicationTemplateTextsService } from "src/modules/communication/templatetexts/communicationtemplatetexts.service";
import { WellBeingPostClickService } from "src/modules/emotionalwellbeing/wellbeingpostclick/wellbeingpostclick.service";
import { EventUserBookingListsService } from "src/modules/events/userbookinglists/userbookinglists.service";
import { AssessmentEmotionalAssessmentService } from "src/modules/healthassessment/assessmentemotionalassessment/assessmentemotionalassessment.service";
import { AssessmentsService } from "src/modules/healthassessment/assessments/assessments.service";
import { AuthorizationsService } from "src/modules/healthcheckup/authorizations/authorizations.service";
import { DentistsService } from "src/modules/healthcheckup/dentists/dentists.service";
import { OptometristsService } from "src/modules/healthcheckup/optometrists/optometrists.service";
import { TobaccoUsesService } from "src/modules/healthcheckup/tobaccouses/tobaccouses.service";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { FitnessVideoClickService } from "src/modules/mediafitness/videoclick/fitnessvideoclick.service";
import { MyPlanCompleteActivityService } from "src/modules/myplan/completeactivity/completeactivity.service";
import { MyPlanCompleteBlockService } from "src/modules/myplan/completeblock/completeblock.service";
import { MyPlanJoinUserPlanService } from "src/modules/myplan/joinuserplan/joinuserplan.service";
import { QuickLinkClicksService } from "src/modules/quicklink/quicklinkclicks/quicklinkclicks.service";
import { QuizUserDetailsService } from "src/modules/quiz/quizuserdetails/quizuserdetails.service";
import { SubmitFormsService } from "src/modules/reimbursement/submitforms/submitforms.service";
import { ActivityFeedService } from "src/modules/trackers/activityfeeds/activityfeeds.service";
import { FoodFeedService } from "src/modules/trackers/foodfeeds/foodfeeds.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { UserService } from "src/modules/user/user/user.service";
import { UserLoginService } from "src/modules/user/userlogin/userlogin.service";
import { In, Not } from "typeorm";
import { AcOlympicDataService } from "../acolympicdata/acolympicdata.service";
import { BioWeightService } from "../bioweight/bioweight.service";
import { ChallengeService } from "../challenge/challenge.service";
import { DaysUsersService } from "../daysusers/daysusers.service";
import { FitnessUsersActivityService } from '../fitnessusersactivity/fitnessusersactivity.service';
import { HealthUsersActivityService } from '../healthusersactivity/healthusersactivity.service';
import { InviteUserService } from "../inviteuser/inviteuser.service";
import { RecipeService } from "../recipe/recipe.service";
import { ScheduleChallengeService } from "../schedulechallenge/schedulechallenge.service";
import { ScheduleChallengeJoinUsersService } from "../schedulechallengejoinusers/schedulechallengejoinusers.service";
import { SquareUsersService } from '../squareusers/squareusers.service';
import { TeamMembersService } from "../teammembers/teammembers.service";
import { TeamsService } from "../teams/teams.service";
import { TeamScheduleService } from "../teamschedule/teamschedule.service";
import { TokensService } from '../tokens/tokens.service';
import { WeeksUsersService } from "../weeksusers/weeksusers.service";
import { UserScheduleChallengeService } from "./userScheduleChallenge.service";
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD
@Injectable()
export class UserChallengeHelperService {
    constructor(
        private readonly translatorService: TranslationService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly recipeService: RecipeService,
        private readonly weeksUsersService: WeeksUsersService,
        private readonly acOlympicDataService: AcOlympicDataService,
        private readonly teamsService: TeamsService,
        private readonly activityFeedsService: ActivityFeedService,
        private readonly foodFeedsService: FoodFeedService,
        private readonly dentistsService: DentistsService,
        private readonly optometristsService: OptometristsService,
        private readonly tobaccoUsesService: TobaccoUsesService,
        private readonly authorizationsService: AuthorizationsService,
        private readonly assessmentsService: AssessmentsService,
        private readonly assessmentEmotionalAssessmentService: AssessmentEmotionalAssessmentService,
        private readonly atSubmitFormsService: SubmitFormsService,
        private readonly myPlanJoinUserPlanService: MyPlanJoinUserPlanService,
        private readonly myPlanCompleteBlockService: MyPlanCompleteBlockService,
        private readonly myPlanCompleteActivityService: MyPlanCompleteActivityService,
        private readonly userLoginService: UserLoginService,
        private readonly fitnessVideoClickService: FitnessVideoClickService,
        private readonly wellbeingPostClickService: WellBeingPostClickService,
        private readonly quickLinkClicksService: QuickLinkClicksService,
        private readonly eventUserBookingListsService: EventUserBookingListsService,
        private readonly quizUserDetailsService: QuizUserDetailsService,
        private readonly inviteUserService: InviteUserService,
        private readonly activityLogService: ActivityLogService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly teamMembersService: TeamMembersService,
        private readonly bioWeightService: BioWeightService,
        private readonly daysUsersService: DaysUsersService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly communicationTemplateTextService: CommunicationTemplateTextsService,
        private readonly userService: UserService,
        private readonly challengeService: ChallengeService,
        private readonly teamScheduleService: TeamScheduleService,
        private readonly userScheduleChallengeService: UserScheduleChallengeService,
        private readonly urlManageService: UrlManageService,
        @Inject('COMMON_SERVICE')
            private commonMicroservice: ClientProxy,
        private readonly notificationsController: NotificationsController,
        private readonly commonService: CommonService,
        private readonly tokensService: TokensService,
        private readonly fitnessUsersActivityService: FitnessUsersActivityService,
        private readonly squareUsersService: SquareUsersService,
        private readonly healthUsersActivityService: HealthUsersActivityService,
        private readonly activityService: ActivityService
    ) {}

    async olympicsChallenge(schedule: any, req: Request, show_type = 1) {
        try {
            let result = Object.create(null);
            let weekUserData: any = await this.weeksUsersService.listRecord(`cwu.challenge_id = ${schedule['ch']['id']} AND cwu.schedule_id = ${schedule['id']} AND cwu.user_id = ${req.tokenUser?.id} AND cwu.status != 2 AND challengeactivity.id IS NOT NULL`, schedule['id']);
            let weeksDatacheck = Object.create(null);
            if (weekUserData?.length > 0) {
                await Promise.all(
                    weekUserData.map(async (week) => {
                        let transDesc = '';
                        let transName = '';
                        if (week?.challengeactivity?.activity_name) {
                            transName = await this.translatorService.frontendReadTranslation(req.lang,`activity_name_${week?.challengeactivity?.id}`, `/LC_MESSAGES/Challenge/Activity/${week?.challengeactivity?.id}`,`dynamic`);
                            if (transName == '' || transName === `activity_name_${week?.challengeactivity?.id}`) {
                                transName = week?.challengeactivity?.activity_name;
                            }
                            transName = transName && transName != '' ? transName : week?.challengeactivity?.activity_name;
                        }
                        if (week?.challengeactivity?.activity_desc) {
                            transDesc = await this.translatorService.frontendReadTranslation(req.lang,`activity_desc_${week?.challengeactivity?.id}`, `/LC_MESSAGES/Challenge/Activity/${week?.challengeactivity?.id}`,`dynamic`);
                            if (transDesc == '' || transDesc === `activity_desc_${week?.challengeactivity?.id}`) {
                                transDesc = week?.challengeactivity?.activity_desc;
                            }
                            transDesc = transDesc && transDesc != '' ? transDesc : week?.challengeactivity?.activity_desc;
                        }
                        week['challengeactivity']['activity_name'] = transName;
                        week['challengeactivity']['activity_desc'] = transDesc;
                        weeksDatacheck[week.activity_id] = week;
                    })
                );
            }
            result['acweeks'] = weekUserData;
            let activityData: any = await this.acOlympicDataService.listRecord(`aod.schedule_id = ${schedule['id']} AND aod.user_id = ${req.tokenUser?.id} AND aod.status= 1 AND challengeactivity.id IS NOT NULL`);

            let allactivitiestemp = [];
            let minutes = "";
            if (activityData?.length > 0) {
                await Promise.all(
                    activityData.map((a, i) => {
                        let mvalue = 0;
                        let totals = 0;
                        
                        if (Object.prototype.hasOwnProperty.call(weeksDatacheck,a.activity_id)) {
                            mvalue = weeksDatacheck[a.activity_id].m_numeric;
                            totals = weeksDatacheck[a.activity_id].totalminutes;
                        }
                        
                        let remains = (totals >= mvalue) ? 0 : (mvalue - totals);

                        let activityCopy = Object.assign({}, a);
                        activityCopy.challengeactivity['activity_name'] = weeksDatacheck[a.activity_id]?.challengeactivity?.activity_name;
                        activityCopy.challengeactivity['activity_desc'] = weeksDatacheck[a.activity_id]?.challengeactivity?.activity_desc;
                        activityCopy.remain = remains;
                        activityCopy.mvalue = mvalue;
                        activityCopy.total = totals;
                        activityCopy.added_date = activityCopy.added_date;
                        activityCopy.created_date = activityCopy.created_date;
                        allactivitiestemp.push(activityCopy);

                        let tmpminutea = a.minutes;
                        let mindatey = new Date(a.added_date).getFullYear();
                        let mindatem = new Date(a.added_date).getMonth() + 1;
                        let mindated = new Date(a.added_date).getDate();

                        minutes += `${mindatey}__${mindatem}__${mindated}__${tmpminutea}|||`;
                    })
                );
            }
            result['minutes'] = minutes;
            result['acactivity'] = allactivitiestemp;
            if(show_type == 2){
                if(result['acweeks'] && result['acweeks'].length > 0){
                    result['acweeks']=result['acweeks'].map((item)=>{
                        let progress = ((item.totalminutes * 100 )/item.m_numeric || 0).toFixed(2);
                        let data= {
                            'id':item.id,
                            'activity_name':item.challengeactivity.activity_name,
                            'progress':(parseFloat(progress) > 100) ? '100' : progress,
                        }
                        return data
                    })
                }
                if(result['minutes']){
                    delete(result['minutes'])
                }
                if(result['acactivity']){
                    delete(result['acactivity'])
                }
                
                const completed = result['acweeks'].filter(item => parseFloat(item.progress) === 100);
                const notStarted = result['acweeks'].filter(item => parseFloat(item.progress) === 0);
                let inProgress = result['acweeks'].filter(item => {
                const progress = parseFloat(item.progress);
                    return progress > 0 && progress < 100;
                });
                if(inProgress.length === 0){
                    inProgress = result['acweeks'].filter(item => {
                    const progress = parseFloat(item.progress);
                        return progress >= 0 && progress < 100;
                    });
                }
                let results: any[] = [];
                if (inProgress.length >= 3) {
                    results = [...inProgress.slice(0, 3)];
                }else if (inProgress.length === 2) {
                    let lastCompleted = completed.slice(-1); // last 1
                    if (lastCompleted.length === 0) {
                        const lastNotStarted = notStarted.slice(0, 1);
                        lastCompleted = [...lastCompleted, ...lastNotStarted];
                    }
                    results = [...inProgress, ...lastCompleted];
                } else if (inProgress.length === 1) {
                    let lastTwoCompleted = completed.slice(-2);
                    if (lastTwoCompleted.length === 0) {
                        lastTwoCompleted = notStarted.slice(0, 2);
                    }else if (lastTwoCompleted.length === 1) {
                        const lastNotStarted = notStarted.slice(0, 1);
                        lastTwoCompleted = [...lastTwoCompleted, ...lastNotStarted];
                    }
                    results = [...inProgress, ...lastTwoCompleted];
                } else {
                    results = [...completed.slice(-3)];
                }
                results.sort((a, b) => a.id - b.id);
                result['acweeks'] = results;
            }
            return result;
        } catch (error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
    /* RECIPE CHALLENGE */
        async recipeChallenge(postdata: any, req: Request, show_type = 1) {
                    try {         
                        let where = (req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id || appConstant.ROLE.WCH == req.tokenUser?.role_id) ? `recipe.status != 2` : `recipe.status = 1`;
                        if (postdata.schedule_id) {
                            where += ` AND recipe.schedule_id = ${postdata.schedule_id}`;
                        }
                        if (postdata.org_id) {
                            where += ` AND recipe.org_id = ${postdata.org_id}`;
                        }
                        if (postdata.user_id) {
                            where += ` AND recipe.user_id = ${postdata.user_id}`;
                        }
                        const resultedData = await this.recipeService.paginateList(
                            where,
                            postdata,
                        );
                        resultedData['list'] = <any>(
                            await this.commonArrayService.formatToDto(RecipeDto, resultedData['list'], req.lang)
                        );
                        if(show_type == 2){
                            if (resultedData['list'] && resultedData['list'].length > 0) {
                                resultedData['list'].sort((a, b) => b.id - a.id);
                                resultedData['list'] = resultedData['list']
                                    .slice(0, 3)
                                    .map(({ 
                                        user, created_copy, updated_copy, created_by, 
                                        recipe_ingredients, recipe_direction, 
                                        recipe_additional_notes, recipe_healthy,status,id,user_id,org_id,schedule_id,
                                        added_source, updated, ...rest 
                                    }) => rest);
                            }                    
                        }
                        return resultedData;
                    } catch (error) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
                    }
        }
    /* RECIPE CHALLENGE */

    async count_point_act(activityDone, table, field, actStartDate, actEndDate) {
            try {
                const tmppoints = {};
                const start = moment.unix(actStartDate).startOf('day');
                const end = moment.unix(actEndDate).endOf('day');
    
                activityDone.forEach(activity => {
                    const logDate = moment(activity[table][field]);
                    if (logDate.isBetween(start, end, null, '[]')) {
                        const date = logDate.format('DD-MM-YYYY');
    
                        if (tmppoints[date]) {
                            tmppoints[date] += 1;
                        } else {
                            tmppoints[date] = 1;
                        }
                    }
                });
    
                return tmppoints;
            }
            catch (error) {
                throw new Error(error.message);
            }
            
    }
    async count_point_act_steps(activityDone, table, field, actStartDate, actEndDate, steps) {
        try {
            const tmppoints = {};
            const tmppoints1 = {};
            const start = moment.unix(actStartDate).startOf('day');
            const end = moment.unix(actEndDate).endOf('day');
            activityDone.forEach(activity => {
                const logDate = moment(activity[table][field]);
                if (logDate.isBetween(start, end, null, '[]')) {
                    const date = logDate.format('DD-MM-YYYY');

                    if (tmppoints[date]) {
                        tmppoints[date] += activity[table][field]['steps'];
                    } else {
                        tmppoints[date] = activity[table][field]['steps'];
                    }
                }
            });
            if (steps == "" || steps == 0) {
                steps = 10000;
            }
            for (let val of Object.keys(tmppoints)) {
                if (tmppoints[val] != "" && tmppoints[val] != 0) {
                    let tmpPP = tmppoints[val] / steps;
                    tmppoints1[val] = Math.floor(tmpPP);
                }
            }
            return tmppoints;
        }catch (error) {
            throw new Error(error.message);
        }
        
    }
    async calculate_frequency(tmppoints: any, frequincy, frequincy_max_point, point_for_each) {
        try{
            if (frequincy === "D") {
                for (const date in tmppoints) {
                    if (tmppoints.hasOwnProperty(date)) {
                        let pointTMP = point_for_each * tmppoints[date];
                        if (pointTMP > frequincy_max_point) {
                            pointTMP = frequincy_max_point;
                        }
                        pointTMP = pointTMP / point_for_each;
                        tmppoints[date] = pointTMP;
                    }
                }
            }
            const weeklyArray = {};
            if (frequincy === "W" || frequincy === "M" || frequincy === "Y") {
                for (const date in tmppoints) {
                    if (tmppoints.hasOwnProperty(date)) {
                        let weekNo;
                        if (frequincy === "W") {
                            weekNo = moment(date).format('oW'); 
                        } else if (frequincy === "M") {
                            weekNo = moment(date).format('MYYYY'); 
                        } else if (frequincy === "Y") {
                            weekNo = moment(date).format('YYYY');
                        }
        
                        if (weeklyArray[weekNo]) {
                            weeklyArray[weekNo] += tmppoints[date];
                        } else {
                            weeklyArray[weekNo] = tmppoints[date];
                        }
                    }
                }
        
                for (const date in weeklyArray) {
                    if (weeklyArray.hasOwnProperty(date)) {
                        let pointTMP = point_for_each * weeklyArray[date];
                        if (pointTMP > frequincy_max_point) {
                            pointTMP = frequincy_max_point;
                        }
                        pointTMP = pointTMP / point_for_each;
                        weeklyArray[date] = pointTMP;
                    }
                }
        
                tmppoints = weeklyArray;
            }
            let tmpPointTMP = 0;
            for (const date in tmppoints) {
                if (tmppoints.hasOwnProperty(date)) {
                    tmpPointTMP += tmppoints[date];
                }
            }
            return tmpPointTMP;
        }catch (error) {
            throw new Error(error.message);
        }
    }
    async multiplay_point(tmppoints, activity_point_each, max_point) {
        try {
            if (tmppoints !== 0 && activity_point_each !== 0) {
                tmppoints = tmppoints * activity_point_each;
            }
            if (tmppoints > max_point) {
                tmppoints = max_point;
            }
            return tmppoints;
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    async Ifetch_point(table, field, userColumn, activityColumn, activityId, where = "", req) {
            try {
                let activityDone = [];
                if (table && field && userColumn && activityColumn && activityId) {
                    let query = `${userColumn} = ${req.tokenUser?.id} AND ${activityColumn} = ${activityId}`;
                    if(where != ""){
                        query += ` AND ${where}`
                    }
                    if (table == 'hc_dentists') {
                        activityDone = await this.dentistsService.listRecord(query,field);
                    }
                    if (table == 'hc_optometrists') {
                        activityDone = await this.optometristsService.listRecord(query,field);
                    }
                    if (table == 'hc_tabaccouses') {
                        activityDone = await this.tobaccoUsesService.listRecord(query,field);
                    }
                    if (table == 'hc_authorizations') {
                        activityDone = await this.authorizationsService.listRecord(query,field);
                    }
                    if (table == 'ha_assessments') {
                        activityDone = await this.assessmentsService.listRecord(query,null,field);
                    }
                    if (table == 'ha_emotional_assessments') {
                        activityDone = await this.assessmentEmotionalAssessmentService.listRecord(query,null,field,[tableConstant.ACTIVITIES.TBL_ACTIVITIES,tableConstant.TBL_USERS]);
                    }
                    if (table == 'at_submited_forms') {
                        activityDone = await this.atSubmitFormsService.listRecord(query,null,field);
                    }
                    if (table == 'mp_join_user_plan') {
                        activityDone = await this.myPlanJoinUserPlanService.listRecord(query,null,field);
                    }
                    if (table == 'mp_complete_block') {
                        activityDone = await this.myPlanCompleteBlockService.listRecord(query,null,field);
                    }
                    if (table == 'mp_complete_activity') {
                        activityDone = await this.myPlanCompleteActivityService.listRecord(query,null,field);
                    }
                    if (table == 's_user_login') {
                        activityDone = await this.userLoginService.listRecord(query,null,field);
                    }
                    if (table == 'me_fod_video_click') {
                        activityDone = await this.fitnessVideoClickService.listRecord(query,null,field);
                    }
                    if (table == 'em_post_click') {
                        activityDone = await this.wellbeingPostClickService.listRecord(query,null,['wellbeing.created_date']);
                    }
                    if (table == 'u_quicklink_clicks') {
                        activityDone = await this.quickLinkClicksService.listRecord(['clicks.created_date'],query);
                    }
                    if (table == 'ev_userbookinglists') {
                        activityDone = await this.eventUserBookingListsService.listRecord(query,null,['eubl.modified']);
                    }
                    if (table == 'qz_user_details') {
                        activityDone = await this.quizUserDetailsService.listRecord(query,null,['ud.modified']);
                    }
                    if (table == 'ft_activity_feeds') {
                        activityDone = await this.activityFeedsService.listRecord(query,null,['food.modified']);
                    }
        
                } 
                return activityDone;
            } catch(error) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
            }
    }
    async fetch_point_steps(table: any, field: any, user_column: any, activity_column: any, activity_id: string, where: any = "", user_id: string, req: Request, groupBy: any = null) {
        try {
            let user = Object.create(req.tokenUser);
            if (user_id == "") {
                user_id = user.id;
            } 
            let result: any = [];
            let condition = `food.${user_column} = ${user_id} AND food.status = 1`;
            if(activity_id != ""){
                condition += ` AND(food.${activity_column} IN${activity_id} OR food.appName='AppleHealthKit' OR food.appName='GoogleFit')`
            }
            else{
                condition += ` AND(food.appName='AppleHealthKit' OR food.appName='GoogleFit')`
            }
            if(where !=""){
                condition += ` AND ${where}`
            }
            if(table == tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS){
                let groupBys = false;
                if(groupBy != null){
                    groupBys = true;
                }
                result = await this.foodFeedsService.listRecord(condition, null, field, true, groupBy);
            }
            if(table == tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS){
                result = await this.activityFeedsService.listRecord(condition, null, field);
            }
            return result;
        } catch (error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
    async getWeekRange(currentWeek: number, totalWeeks: number = 1, range: number = 10){
        const weeks: number[] = [];
        if (currentWeek <= 1) {
            const end = Math.min(totalWeeks, currentWeek + range - 1);
            for (let i = currentWeek; i <= end; i++) {
                weeks.push(i);
            }
        } else if (currentWeek >= totalWeeks) {
            const start = Math.max(1, currentWeek - range + 1);
            for (let i = start; i <= currentWeek; i++) {
                weeks.push(i);
            }
        } else {
            const currentIndex = 7; // 8th position (0-based)
            let start = currentWeek - currentIndex;
            let end = start + range - 1;
            if (start < 1) {
                start = 1;
                end = Math.min(totalWeeks, start + range - 1);
            }
            if (end > totalWeeks) {
                end = totalWeeks;
                start = Math.max(1, end - range + 1);
            }
            for (let i = start; i <= end; i++) {
                weeks.push(i);
            }
        }
        return weeks;
    }
    async add_team_member(data: UpdateTeamMembersInput, req: Request) {
        try{
            const role_id = req.tokenUser?.role_id;
            let org_id;
            if(role_id == 22 || role_id == 7 || role_id == 23){
                org_id = data.org_id;
            }else{
                org_id = req.tokenUser?.org_id;
            }
            const date = this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss');
            if(data.action && data.action == 'invitation'){
                const checkdata = await this.inviteUserService.findOne({user_id: data.user_id, schedule_id: data.schedule_id, status: Not(2)});
                if(!checkdata){
                    await this.inviteUserService.save({user_id: data.user_id, schedule_id: data.schedule_id, inviter_id: data?.inviter_id ?? req.tokenUser?.id, team_id: data.team_id, status: 1});
                    //email code here
                        let user  = await this.userService.findOne({id: data.user_id});
                        let invitor  = await this.userService.findOne({id: data?.inviter_id ?? req.tokenUser?.id});
                        let teamData = await this.teamsService.findOne({id: data.team_id});
                        let scheduleInfo = await this.scheduleChallengeService.findOne({id: data.schedule_id, org_id: org_id});
                        if(teamData.tname){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`team_name_${teamData['schedule_id']}_${teamData['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${teamData['org_id']}/${teamData.schedule_id}`,`dynamic`);
                            teamData.tname = (customName == '' || customName == `team_name_${teamData['schedule_id']}_${teamData['id']}`) ? teamData['tname'] : customName;
                        }
                        if(user && user['email']!=''){ 
                            let toEmail = user['email'];
                            let emailDetails = Object.create(null);
                            emailDetails['type'] = 4;
                            emailDetails['name'] = user.first_name + ' ' + user.last_name;
                            emailDetails['team_name'] = teamData.tname;
                            emailDetails['challenge_name'] = scheduleInfo?.['custom_cname'] ?? scheduleInfo?.['challenge']?.['challenge_name'];
                            emailDetails['challenge_start_date'] = this.commonDateService.getTodayDate(scheduleInfo?.['start_date']).format('MM-DD-YYYY');
                            emailDetails['challenge_end_date'] = this.commonDateService.getTodayDate(scheduleInfo?.['end_date']).format('MM-DD-YYYY');
                            emailDetails['registration_start_date'] = this.commonDateService.getTodayDate(scheduleInfo?.['reg_start_date']).format('MM-DD-YYYY');
                            emailDetails['registration_end_date'] = this.commonDateService.getTodayDate(scheduleInfo?.['reg_end_date']).format('MM-DD-YYYY');
                            emailDetails['invitor_user'] = invitor.first_name + ' ' + invitor.last_name;
                            emailDetails['company_name'] = scheduleInfo?.['company']?.['company_name'];
                            const templateText = await this.communicationTemplateTextService.findOne({org_id: In([org_id,0]), type: 4});
                            if(templateText){
                                templateText['new_text'] = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                            }
                            let emaildata = {
                                sender: '',
                                receiver: toEmail,
                                subject: 'Team Member Has Been Invited.',
                                content: emailDetails,
                                template: templateText?.['new_text'] || templateText?.['text'],
                            }
                            await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata)); 
                        }  
                        this.addNotification({
                            org_id: scheduleInfo?.org_id, 
                            user_id: user.id, 
                            custom_cname: scheduleInfo?.custom_cname, 
                            schedule_id: scheduleInfo['id'], 
                            challenge_id: scheduleInfo['challenge_id'], 
                            logo: scheduleInfo['custom_logo'] && scheduleInfo['custom_logo'] != '' ? S3_URL + scheduleInfo['custom_logo'] : this.commonService.getIconPath(scheduleInfo['challenge']['logo'],S3_URL), 
                            type: 'addMember',
                            title: `You have been Invited to Challenge`,
                            url: `https://${process.env.DOMAIN}/my-challenges/${scheduleInfo['id']}`,
                            message: `${user.first_name + ' ' + user.last_name} you have been Invited to Challenge '${scheduleInfo?.custom_cname}' invited by ${invitor.first_name + ' ' + invitor.last_name}`,

                        }, req);                      
                        let successMsgTrans = await this.translatorService.frontendReadTranslation(req.lang,`The Team Member Has Been Invited Successfully`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                        return {error: 0, messege: successMsgTrans};
                }else{
                    let errorMsgTrans = await this.translatorService.frontendReadTranslation(req.lang,`This Team Member Is Already Invited to Team`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    return {error: 1, messege: errorMsgTrans};
                }
            }
            if(data.action && data.action == 'delete'){
                const checkdata = await this.teamMembersService.findOne(`teamMember.id = ${data.member_id}`);
                let uid = checkdata.user_id;
                let scheduleInfo = await this.scheduleChallengeService.findOne({id: data.schedule_id, org_id: org_id});
                if(scheduleInfo['challenge']['bio_challenge_type'] && scheduleInfo['challenge']['bio_challenge_type'] == 'Relay_race' && checkdata['user_order'] != 0){
                    await this.updateMemberReOrder('delete',{team_member_id: data.member_id, schedule_id: data.schedule_id, team_id: data?.team_id}, req)
                }
                let joinUser = await this.scheduleChallengeJoinUsersService.findOne({user_id: uid, schedule_id: scheduleInfo.id});
                await this.scheduleChallengeJoinUsersService.update({user_id: uid, schedule_id: scheduleInfo.id},{status: 2});
                this.activityLogService.create(joinUser, {status: 2}, tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, req.tokenUser?.id, 'remove team member');
                await this.teamMembersService.update({id: data.member_id},{status: 2});
                this.activityLogService.create(checkdata, {status: 2}, tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS, req.tokenUser?.id, 'remove team member');
                let successMsgTrans = await this.translatorService.frontendReadTranslation(req.lang,`Member deleted successfully`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                return {error: 0, messege: successMsgTrans};
            }else{
                let user  = await this.userService.findOne({id: data.user_id});
                const scheduleChallenge = await this.scheduleChallengeService.findOne(`sc.id = ${data.schedule_id}`, data.user_id.toString());
                const bio_challenge_type = scheduleChallenge?.['challenge']?.['bio_challenge_type'];
                const challenge_start_date = this.commonDateService.getTodayDate(scheduleChallenge?.['start_date']).unix();
                const challengestart_date = this.commonDateService.getTodayDate(scheduleChallenge?.['start_date']).format('YYYY-MM-DD HH:mm:ss');
                const hide_start_baton = scheduleChallenge?.['hide_history'];
                const user_live_date = this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss');
                const checkdata = await this.teamMembersService.findOne(`teamMember.status NOT IN (2,3) AND teamMember.user_id = ${data.user_id} AND teamSchedule.schedule_id = ${data.schedule_id}`);
                if(scheduleChallenge?.['joinUser'] && scheduleChallenge?.['joinUser']?.['id'] !='' || checkdata){
                    let errorMsgTrans = await this.translatorService.frontendReadTranslation(req.lang,`Team_Member_Added_Already`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    return {error: 1, messege: errorMsgTrans};
                }else{
                    let teamMembers: any = await this.teamMembersService.listRecord(`teamMember.team_id = ${data.team_id} AND teamMember.status NOT IN (2,3)`,'inner');
                    teamMembers = teamMembers?.length;
                    let team_size = scheduleChallenge?.teamsize;
                    let teamdata = await this.teamsService.findOne({id: data.team_id});
                    if(teamdata && teamdata['team_size' ]>= 0){
                        team_size = teamdata['team_size'];
                    }
                    const schedule_id = data.schedule_id;
                    if(teamMembers < team_size || checkdata){
                        if(!scheduleChallenge?.['joinUser'] || scheduleChallenge?.['joinUser']?.['id'] == ''){
                            let savedData = {
                                schedule_id: scheduleChallenge['id'],
                                challenge_id: scheduleChallenge['challenge_id'],
                                user_id: data.user_id,
                                added_date: this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss'),
                                status: 1
                            };
                            if(bio_challenge_type == "Move_more"){
                                savedData['in_ranking'] = 2;
                            }
                            if(data['trek_level_id'] && data['trek_level_id'] !=''){
                                savedData['trek_level_id'] = data['trek_level_id']; 
                            }
                            await this.scheduleChallengeJoinUsersService.save(savedData);
                        }
                        let alreadyJoinTeamMemberId = 0;
                        if(scheduleChallenge['lock_teams'] == 'Yes'){
                            let checkUserJoins = await this.teamMembersService.getLockTeamCancelle(`teamMember.team_id = ${data.team_id} AND teamMember.user_id = ${data.user_id} AND teamMember.status IN (3)`);
                            if(checkUserJoins.length > 1){
                                const remainingData = checkUserJoins.slice(1);
                                if(remainingData.length > 0){
                                    for (const rData of remainingData) {
                                        await this.teamMembersService.update({user_id: data.user_id, team_id: rData?.team_id, id : rData?.id}, {status: 2});
                                    }
                                }
                                alreadyJoinTeamMemberId = checkUserJoins[0].id;
                            }else if(checkUserJoins.length == 1){
                                alreadyJoinTeamMemberId = checkUserJoins[0].id;
                            }
                        }

                        let teamMember = {
                            team_id: data.team_id,
                            org_id: org_id,
                            user_id: data.user_id,
                            created_date: date,
                            baton_start: '0000-00-00 00:00:00'
                        };
                        if(checkdata){
                            teamMember['id'] = checkdata['id'];
                        }   
                        if(alreadyJoinTeamMemberId != 0 && !teamMember['id']){
                            teamMember['id'] = alreadyJoinTeamMemberId;
                            teamMember['status'] = 1;
                        }
                                         
                        let lastMemberBatonStatus = 0;
                        let getLastMemberDetails = null;
                        if(bio_challenge_type == 'Relay_race'){
                            let last_order = 0;
                            let time_elapsed = scheduleChallenge['time_elapsed'];
                            let lastMemberBatonStart = '';
                            last_order = await this.teamMembersService.getMaxOrder(`team_id = ${data.team_id} AND scheduleJoin.schedule_id = ${data.schedule_id} AND teamMember.status !=2 `);
                            if(last_order !== null && last_order !== 0){
                                const joinTableList = [{'alias':'scheduleJoin', 'table' : tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, 'on' : `teamMember.user_id = scheduleJoin.user_id AND scheduleJoin.schedule_id = ${data.schedule_id}` },{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : `teamMember.user_id = user.id` }];
                                getLastMemberDetails = await this.teamMembersService.findOne(`teamMember.team_id = ${data.team_id} AND scheduleJoin.schedule_id = ${data.schedule_id} AND teamMember.user_order = ${last_order}`, null ,joinTableList);
                                lastMemberBatonStatus = getLastMemberDetails?.['baton_status'];
                                lastMemberBatonStart = getLastMemberDetails?.['baton_start'];
                            }
                            teamMember['user_order'] = last_order + 1;
                            teamMember['baton_start'] = '0000-00-00 00:00:00';  
                            if((last_order === 0 || last_order === null) && (lastMemberBatonStatus === 0 || lastMemberBatonStatus === null)){
                                teamMember['baton_status'] = 1;    
                                if(scheduleChallenge.hide_history == 1){
                                    teamMember['baton_status'] = 2;    
                                    teamMember['baton_start'] = await this.commonDateService.DateTimeFormat(challengestart_date, 'YYYY-MM-DD').toString() + ' 00:00:00';    
                                }
                            }else if((last_order !== 0 || last_order !== null) && (lastMemberBatonStatus == 0 || lastMemberBatonStatus == 2)){
                                teamMember['baton_status'] = 0;    
                            }else if((last_order !== 0 || last_order !== null) && lastMemberBatonStatus == 3){
                                teamMember['baton_status'] = 1;    
                                if(scheduleChallenge.hide_history == 1){
                                    teamMember['baton_status'] = 2;  
                                    const addedMemberStartDate = moment.utc(lastMemberBatonStart).clone().add(time_elapsed, 'minutes');
                                    teamMember['baton_start'] = addedMemberStartDate.format('YYYY-MM-DD HH:mm:ss');
                                }  
                            }
                        }
                        const createMember = await this.teamMembersService.save(teamMember);
                        if(createMember && bio_challenge_type == 'Relay_race' && lastMemberBatonStatus == 3 && getLastMemberDetails !== null){
                            let turnComplete = Object.create(null);
                            if(!turnComplete[data.team_id]){    
                                turnComplete[data.team_id] = [];
                            }
                            if(!turnComplete[data.team_id]['userData']){    
                                turnComplete[data.team_id]['userData'] = [];
                            }
                            turnComplete[data.team_id]['schedule_id'] = schedule_id;
                            turnComplete[data.team_id]['userData'].push(getLastMemberDetails);
                            await this.userScheduleChallengeService.portionCompleteEmail(turnComplete[data.team_id], req);
                        }
                        this.addNotification({
                            org_id: scheduleChallenge?.org_id, 
                            user_id: user.id, 
                            custom_cname: scheduleChallenge?.custom_cname, 
                            schedule_id: scheduleChallenge['id'], 
                            challenge_id: scheduleChallenge['challenge_id'], 
                            logo: scheduleChallenge['custom_logo'] && scheduleChallenge['custom_logo'] != '' ? S3_URL + scheduleChallenge['custom_logo'] : this.commonService.getIconPath(scheduleChallenge['challenge']['logo'],S3_URL), 
                            type: 'addMember',
                            title: `You have been Added to Challenge`,
                            url: `https://${process.env.DOMAIN}/my-challenges/${scheduleChallenge['id']}`,
                            message: `${user.first_name + ' ' + user.last_name} you have been added to Challenge '${scheduleChallenge?.custom_cname}' added by ${req?.tokenUser?.first_name + ' ' + req?.tokenUser?.last_name}`,

                        }, req);
                        if(createMember && bio_challenge_type == 'Relay_race'){ 
                            let getTeamDetails = await this.teamMembersService.findOne(`teamMember.team_id = ${data.team_id} AND teamMember.org_id = ${org_id} AND teamMember.status != 2 AND teamMember.baton_status = 1`);
                            if(getTeamDetails){
                                let notificationData = {
                                    id: getTeamDetails?.id, 
                                    org_id: scheduleChallenge?.org_id, 
                                    user_id: user.id, 
                                    custom_cname: scheduleChallenge?.custom_cname, 
                                    schedule_id: scheduleChallenge['id'], 
                                    challenge_id: scheduleChallenge['challenge_id'], 
                                    logo: scheduleChallenge['custom_logo'] && scheduleChallenge['custom_logo'] != '' ? S3_URL + scheduleChallenge['custom_logo'] : this.commonService.getIconPath(scheduleChallenge['challenge']['logo'],S3_URL),  
                                    type: 'update',
                                    url: `https://${process.env.DOMAIN}/my-challenges/${scheduleChallenge['id']}`,
                                    title: `${scheduleChallenge?.custom_cname} Challenge`,
                                    message: `You have the baton. Please click on “I am ready” to start your turn.`,
                                    send_type: 1
                                };
                                this.addNotification(notificationData, req);
                            }
                        }
                        let successMsgTrans = await this.translatorService.frontendReadTranslation(req.lang,`The Team Member Has Been Added Successfully`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                        return {error: 0, messege: successMsgTrans};
                    }else{
                        let errorMsgTrans;
                        if(teamMembers >= team_size){
                            errorMsgTrans = await this.translatorService.frontendReadTranslation(req.lang,`Maximum team member size exceed`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                        }
                        else{
                            errorMsgTrans = await this.translatorService.frontendReadTranslation(req.lang,`Team_Member_Added_Already`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                        }
                        return {error: 1, messege: errorMsgTrans};
                    }
                }
            }

        } catch (error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
    async captain_activity(postData: any, req: Request) {
        try{
            let schedule_id = postData['schedule_id'];
            let user_id = postData['user_id'];
            let team_id = postData['team_id'];
            let org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if(postData?.action == 'assign'){
                await this.teamMembersService.update({id : postData?.member_id, status: 1},{iscaptain: 1});
                this.activityLogService.create({id : postData?.member_id, iscaptain: 0}, {iscaptain: 1}, tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS, req.tokenUser?.id, 'assign captain');
                return true;
            }
            if(postData?.action == 'un-assign'){
                await this.teamMembersService.update({id : postData?.member_id, status: 1},{iscaptain: 0});
                this.activityLogService.create({id : postData?.member_id, iscaptain: 1}, {iscaptain: 0}, tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS, req.tokenUser?.id, 'un-assign captain');
                return true;
            }
            if(postData?.action == 'add'){
                let date = this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss');
                let scheduleChallenge = await this.scheduleChallengeService.findOne(`sc.id = ${schedule_id}`, user_id);
                let bio_challenge_type = scheduleChallenge['challenge']['bio_challenge_type'];
                const challenge_start_date = this.commonDateService.getTodayDate(scheduleChallenge['start_date']).unix();
                const challengestart_date = this.commonDateService.getTodayDate(scheduleChallenge['start_date']).format('YYYY-MM-DD HH:mm:ss');
                let user_live_date = this.commonDateService.getTodayDate().unix();
                let checkdata = await this.teamMembersService.findOne(`teamMember.user_id = ${user_id} AND teamSchedule.schedule_id = ${schedule_id}`)
                if(scheduleChallenge?.['joinUser']?.['id'] !='' && checkdata){
                    let errorMsgTrans = await this.translatorService.frontendReadTranslation(req.lang,`Team_Member_Added_Already`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    throw new Error(errorMsgTrans);
                }else{
                    let teamMember = Object.create(null);
                    let teamMembers: any = await this.teamMembersService.listRecord({team_id : team_id},'inner');
                    let team_size = scheduleChallenge?.teamsize;
                    if(teamMembers?.length < team_size || checkdata){
                        if(scheduleChallenge?.['joinUser']?.['id'] ==''){
                            let savedData = {
                                schedule_id: schedule_id,
                                challenge_id: scheduleChallenge['challenge_id'],
                                user_id: user_id,
                                added_date: this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss'),
                                status: 1
                            };
                            if(bio_challenge_type == "Move_more"){
                                savedData['in_ranking'] = 2;
                            }
                            
                            if(postData['trek_level_id'] && postData['trek_level_id'] !=''){
                                savedData['trek_level_id'] = postData['trek_level_id']; 
                            }
                            await this.scheduleChallengeJoinUsersService.save(savedData);
                        }
                        if(checkdata){
                        teamMember['id'] = checkdata['teamMember']['id'];
                        }else{
                            teamMember['iscaptain'] = 1;
                        }

                        let lastMemberBatonStatus = 0;
                        let getLastMemberDetails = null;
                        if(bio_challenge_type == 'Relay_race'){
                            let last_order = 0;
                            let time_elapsed = scheduleChallenge['time_elapsed'];
                            let lastMemberBatonStart = '';
                            last_order = await this.teamMembersService.getMaxOrder(`team_id = ${team_id} AND scheduleJoin.schedule_id = ${schedule_id} AND teamMember.status !=2 `);
                            if(last_order !== null && last_order !== 0){
                                const joinTableList = [{'alias':'scheduleJoin', 'table' : tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, 'on' : `teamMember.user_id = scheduleJoin.user_id AND scheduleJoin.schedule_id = ${schedule_id}` },{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : `teamMember.user_id = user.id` }];
                                getLastMemberDetails = await this.teamMembersService.findOne(`teamMember.team_id = ${team_id} AND scheduleJoin.schedule_id = ${schedule_id} AND teamMember.user_order = ${last_order}`, null ,joinTableList);

                                lastMemberBatonStatus = getLastMemberDetails?.['baton_status'];
                                lastMemberBatonStart = getLastMemberDetails?.['baton_start'];

                                teamMember['user_order'] = last_order + 1;
                                teamMember['baton_start'] = '0000-00-00 00:00:00';  
                                if((last_order === 0 || last_order === null) && (lastMemberBatonStatus === 0 || lastMemberBatonStatus === null)){
                                    teamMember['baton_status'] = 1;    
                                    if(scheduleChallenge.hide_history == 1){
                                        teamMember['baton_status'] = 2;    
                                        teamMember['baton_start'] = await this.commonDateService.DateTimeFormat(challengestart_date, 'YYYY-MM-DD').toString() + ' 00:00:00';    
                                    }
                                }else if((last_order !== 0 || last_order !== null) && (lastMemberBatonStatus == 0 || lastMemberBatonStatus == 2)){
                                    teamMember['baton_status'] = 0;    
                                }else if((last_order !== 0 || last_order !== null) && lastMemberBatonStatus == 3){
                                    teamMember['baton_status'] = 1;    
                                    if(scheduleChallenge.hide_history == 1){
                                        teamMember['baton_status'] = 2;  
                                        const addedMemberStartDate = moment.utc(lastMemberBatonStart).clone().add(time_elapsed, 'minutes');
                                        teamMember['baton_start'] = addedMemberStartDate.format('YYYY-MM-DD HH:mm:ss');
                                    }  
                                    
                                }
                            }
                        }
                        teamMember['team_id'] = postData['team_id'];
                        teamMember['org_id'] = org_id;
                        teamMember['user_id'] = postData['user_id'];
                        teamMember['created_date'] = date;
                        const createMember = await this.teamMembersService.save(teamMember);
                        if(createMember && bio_challenge_type == 'Relay_race' && lastMemberBatonStatus == 3 && getLastMemberDetails !== null){
                            let turnComplete = Object.create(null);

                            if(!turnComplete[team_id]){    
                                turnComplete[team_id] = [];
                            }
                            if(!turnComplete[team_id]['userData']){    
                                turnComplete[team_id]['userData'] = [];
                            }

                            turnComplete[team_id]['schedule_id'] = schedule_id;
                            turnComplete[team_id]['userData'].push(getLastMemberDetails);

                            await this.userScheduleChallengeService.portionCompleteEmail(turnComplete[team_id], req);
                        }
                    }                    
                }
                return true;
            }else{
                const tmember = await this.teamScheduleService.listRecord(`scheduleUser.schedule_id = ${schedule_id} AND teamMember.user_id = ${user_id}`, null, 'teamMember.user_id')
                let check = await this.teamsService.findOne({id: team_id, schedule_id: schedule_id, created_by: user_id });
                if(check){
                    await this.teamsService.update({id: check.id},{created_by: ''});
                    this.activityLogService.create({id: check.id, created_by: check.created_by}, {created_by: ''}, tableConstant.CHALLENGE.TBL_CH_TEAMS, req.tokenUser?.id);
                }
                let scheduleInfo = await this.scheduleChallengeService.findOne({id: schedule_id, org_id: org_id});
                let challengeInfo = await this.challengeService.findOne({id: scheduleInfo['challenge_id']});
                if(challengeInfo['bio_challenge_type'] && challengeInfo['bio_challenge_type'] == 'Relay_race' && tmember[0]['teamMember']['user_order'] != 0){
                    postData['team_member_id'] = tmember[0]['teamMember']['id'];
                    await this.updateMemberReOrder('delete', postData, req);
                }
                await this.scheduleChallengeJoinUsersService.update({schedule_id: schedule_id, user_id: user_id},{status: 2});
                const joinUser = await this.scheduleChallengeJoinUsersService.listRecord({schedule_id: schedule_id, user_id: user_id})
                joinUser?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, req.tokenUser?.id, 'remove captain'));

                await this.weeksUsersService.update({schedule_id: schedule_id, user_id: user_id},{ status: 2 });
                const weekUser = await this.weeksUsersService.listRecord({schedule_id: schedule_id, user_id: user_id},schedule_id);
                weekUser?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_WEEKS_USERS, req.tokenUser?.id, 'remove captain'));

                await this.daysUsersService.update({schedule_id: schedule_id, user_id: user_id},{ status: 2 });
                const dayUser = await this.daysUsersService.listRecord({schedule_id: schedule_id, user_id: user_id});
                dayUser?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_DAYS, req.tokenUser?.id, 'remove captain'));
        
                await this.teamMembersService.update({team_id: team_id, user_id: user_id},{status:2});
                const teamMember = await this.teamMembersService.listRecord({team_id: team_id, user_id: user_id})
                teamMember?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS, req.tokenUser?.id, 'remove captain'));
            }
            return true;
        } catch (error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
    async add_bio_weight(data: any, req: Request) {
        try{
            let weightdata;
            if(data?.action == 'add'){
                weightdata['user_id'] = data['user_id'];
                weightdata['weight'] = data['weight'];
                weightdata['schedule_id'] = data['schedule_id'];
                let currtime = this.commonDateService.getTodayDate().format('hh:mm:ss');
                weightdata['added_date'] = `${data.added_date ? this.commonDateService.getTodayDate(data.added_date).format('YYYY-MM-DD') : this.commonDateService.getTodayDate()} ${currtime}`;
                weightdata['created_date'] = this.commonDateService.getTodayDate().format('YYYY-MM-DD hh:mm:ss');
                weightdata['schedule_join_id'] = data['schedule_join_id'];
                let compareDate = this.commonDateService.getTodayDate(data.added_date).format('YYYY-MM-DD');
                let check = await this.scheduleChallengeService.findOne({id:weightdata['schedule_id']});
                let checkrange = data['check'] && data['check']==true ? true : false;
                if(checkrange == true){
                    let rangestartdate = this.commonDateService.getTodayDate(check['rangestartdate']).format('YYYY-MM-DD');
                    let rangeenddate = this.commonDateService.getTodayDate(check['rangeenddate']).format('YYYY-MM-DD');
                    let s_rangestartdate = this.commonDateService.getTodayDate(check['s_rangestartdate']).format('YYYY-MM-DD');
                    let s_rangeenddate = this.commonDateService.getTodayDate(check['s_rangeenddate']).format('YYYY-MM-DD');
                    if(check['rangestartdate'] == null || check['rangeenddate'] == null){
                        await this.bioWeightService.save(weightdata)
                    }else{
                        let startMonthName = await this.commonDateService.DateTimeFormat(s_rangestartdate, 'MMMM');
                        if(s_rangestartdate){
                            startMonthName = await this.translatorService.frontendReadTranslation(req.lang, this.commonDateService.DateTimeFormat(s_rangestartdate, 'MMM')?.toString(), `/LC_MESSAGES/Common/Month`,`static`);
                        }
                        let endMonthName = await this.commonDateService.DateTimeFormat(s_rangeenddate, 'MMMM');
                        if(s_rangeenddate){
                            endMonthName = await this.translatorService.frontendReadTranslation(req.lang, this.commonDateService.DateTimeFormat(s_rangeenddate, 'MMM')?.toString(), `/LC_MESSAGES/Common/Month`,`static`);
                        }
                        if(check['s_rangestartdate'] == null || check['s_rangeenddate'] == null){
                            if(moment(compareDate).isSameOrAfter(rangestartdate) && moment(compareDate).isSameOrBefore(rangeenddate)){
                                await this.bioWeightService.save(weightdata)
                            }else {
                                const andTrans = await this.translatorService.frontendReadTranslation(
                                    req.lang,
                                    'and',
                                    '/LC_MESSAGES/Challenge/MyChallenges',
                                    'static'
                                );
                                let errorMsgTrans = await this.translatorService.frontendReadTranslation(req.lang,`The next date range for the data log is between`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                errorMsgTrans += ` ${startMonthName} ${this.commonDateService.DateTimeFormat(s_rangestartdate, 'D')}, ${this.commonDateService.DateTimeFormat(s_rangestartdate, 'YYYY')}, ${andTrans} ${endMonthName} ${this.commonDateService.DateTimeFormat(s_rangeenddate, 'D')}, ${this.commonDateService.DateTimeFormat(s_rangeenddate, 'YYYY')}`;
                                throw new Error(errorMsgTrans);
                            }
                            }else{
                            if(moment(compareDate).isSameOrAfter(rangestartdate) && moment(compareDate).isSameOrBefore(rangeenddate) || moment(compareDate).isSameOrAfter(s_rangestartdate) && moment(compareDate).isSameOrBefore(s_rangeenddate)){
                                await this.bioWeightService.save(weightdata)
                            }else{
                                const andTrans = await this.translatorService.frontendReadTranslation(
                                    req.lang,
                                    'and',
                                    '/LC_MESSAGES/Challenge/MyChallenges',
                                    'static'
                                );
                                let errorMsgTrans = await this.translatorService.frontendReadTranslation(req.lang,`The next date range for the data log is between`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                errorMsgTrans += ` ${startMonthName} ${this.commonDateService.DateTimeFormat(s_rangestartdate, 'D')}, ${this.commonDateService.DateTimeFormat(s_rangestartdate, 'YYYY')}, ${andTrans} ${endMonthName} ${this.commonDateService.DateTimeFormat(s_rangeenddate, 'D')}, ${this.commonDateService.DateTimeFormat(s_rangeenddate, 'YYYY')}`;
                                throw new Error(errorMsgTrans);
                            }
                            }
                        }
                }else{
                    let cStartDate = this.commonDateService.getTodayDate(check['start_date']).format('YYYY-MM-DD');
                    if(moment(cStartDate).isSameOrBefore(moment(compareDate))){
                        await this.bioWeightService.save(weightdata)
                    }
                    else{
                        let errorMsgTrans = await this.translatorService.frontendReadTranslation(req.lang,`Your weight has been successfully logged`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                        throw new Error(errorMsgTrans);
                    }
                }
            }
            else{
                const where = {id: data.id, schedule_id: data['schedule_join_id']};
                if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER != req.tokenUser?.role_id || appConstant.ROLE.WCH != req.tokenUser?.role_id){
                    where['user_id'] = req.tokenUser?.id;
                }
                await this.bioWeightService.update(where,{status: 2})
            }
            return true;
        } catch (error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
    async fetch_point_steps_multiple(table: any, field: any, user_column: any, activity_column: any, activity_id: string, where: any = "", user_id: string, req: Request, groupBy: any = null , orderBy: any = null, addOrderBy: any = null) {
        try {
            let user = Object.create(req.tokenUser);
            if (user_id == "") {
                user_id = user.id;
            } 
            let result: any = [];
            let condition = `food.${user_column} IN (${user_id}) AND food.status = 1`;
            if(activity_id != ""){
                condition += ` AND(food.${activity_column} IN${activity_id} OR food.appName='AppleHealthKit' OR food.appName='GoogleFit')`
            }
            else{
                condition += ` AND(food.appName='AppleHealthKit' OR food.appName='GoogleFit')`
            }
            if(where !=""){
                condition += ` AND ${where}`
            }
            if(table == tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS){
                let groupBys = false;
                if(groupBy != null){
                    groupBys = true;
                }
                result = await this.foodFeedsService.listRecord(condition, orderBy != null ? orderBy : null, field, true, groupBy , addOrderBy != null ? addOrderBy : null);
            }
            if(table == tableConstant.TRACKERS.TBL_FT_ACTIVITY_FEEDS){
                result = await this.activityFeedsService.listRecord(condition, null, field);
            }
            return result;
        } catch (error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
    async updateMemberReOrder(type: string = 'change', postData: UpdateTeamMembersInput, req: Request){
        try{
            let team_id = postData?.team_id;
            let schedule_id = postData?.schedule_id;
            let statusCode = 200;
            const getScheduleDetails = await this.scheduleChallengeService.scheduleChallegeData({ id: schedule_id });
            if(type == 'change'){
                let userDatas = Object.create(req.tokenUser);
                let org_id = userDatas.org_id;
                let reorder_ids = (postData?.reorder_ids) ? (postData?.reorder_ids).split(',') : [];
                let last_order = 1; 
                last_order = await this.teamMembersService.getMaxOrder(`teamMember.team_id = ${team_id} AND scheduleJoin.schedule_id = ${schedule_id} AND teamMember.baton_status Not In (0,1) AND teamMember.status = 1`);
                if(last_order !== null && last_order !== 0){
                    last_order = last_order + 1;
                }
                let getTeamMembers: any = await this.teamMembersService.teamMemberList(`teamMember.team_id = ${team_id} AND teamMember.org_id = ${org_id} AND teamMember.baton_status In (0,1) AND teamMember.status = 1`);
                let temp:any = [];
                getTeamMembers.map(getSteps => {
                    temp.push(`${Number(getSteps.id)}`);
                });
                if (Object.keys(temp)?.length > 0) {
                    getTeamMembers = temp;
                    temp = Object.create(null);
                }
                const intersectedIds = reorder_ids.filter(id => getTeamMembers.includes(id));
                if(intersectedIds && intersectedIds?.length > 0){
                    let updateData:any = [];
                    if(!last_order){
                        last_order = 1;
                    }
                    for (let getMember of intersectedIds) {
                        let updateData1:any = {'id' : Number(getMember), 'user_order' : last_order};
                        if(last_order == 1){
                            updateData1['baton_status'] = 1;
                            updateData1['baton_start'] = '0000-00-00 00:00:00';
                        }
                        updateData.push(updateData1);
                        last_order++;
                    }
                    if(updateData.length > 0){
                        const ids = updateData.map(update => update.id);
                        const userOrderCase = updateData
                        .map(update => `WHEN id = ${update.id} THEN '${update.user_order}'`)
                        .join(' ');
                        const batonStatusCase = updateData
                        .map(update => `WHEN id = ${update.id} THEN '0'`)
                        .join(' ');
                        const batonStartCase = updateData
                        .map(update => `WHEN id = ${update.id} THEN '0000:00:00 00:00:00'`)
                        .join(' ');
                        const updateSet = {
                            user_order: () => `CASE ${userOrderCase} END`,
                            baton_status: () => `CASE ${batonStatusCase} END`,
                            baton_start: () => `CASE ${batonStartCase} END`,
                        };
                        const updatedData = await this.teamMembersService.updateMultiple({'id': ids}, updateSet);
                        if(updatedData.affected > 0){
                            const getCurrentUser = await this.teamMembersService.findOne(`teamMember.team_id = ${team_id} AND teamMember.org_id = ${org_id} AND teamMember.baton_status = 2 AND teamMember.status = 1`, { 'user_order' : 'ASC' });
                            if(getCurrentUser == null){
                                const getFirstUser = await this.teamMembersService.findOne(`teamMember.team_id = ${team_id} AND teamMember.org_id = ${org_id} AND teamMember.baton_status = 0 AND teamMember.status = 1`, { 'user_order' : 'ASC' });
                                if(getFirstUser !== null){
                                    const updateFirstUser = await this.teamMembersService.update({id: getFirstUser.id, org_id: org_id, team_id: team_id, baton_status: 0, status: 1}, {baton_status: 1, baton_start: '0000:00:00 00:00:00'});
                                }
                            }
                        }else{
                            statusCode = 401;
                        }
                    }
                }
            }else if(type == 'delete'){
                let teamMemberId = postData?.team_member_id;
                const getMemberDetails = await this.teamMembersService.findOne({team_id: team_id, id: teamMemberId}); 
                if(getMemberDetails && getMemberDetails !== null){
                    let last_order = getMemberDetails.user_order; 
                    let org_id = getMemberDetails.org_id;
                    let user_id = getMemberDetails.user_id;
                    let updateOrder = await this.teamMembersService.update(`team_id = ${team_id} AND org_id = ${org_id} AND user_id != ${user_id} AND user_order > ${last_order} AND status = 1`, {user_order: () => '`user_order` - 1'});
                    const updateRemoveMember = await this.teamMembersService.update({team_id: team_id, org_id: org_id, id: teamMemberId}, {user_order: 0, baton_status: 0, baton_start: '0000-00-00 00:00:00',iscaptain: 0});
                    const getCurrentUser = await this.teamMembersService.findOne(`teamMember.team_id = ${team_id} AND teamMember.org_id = ${org_id} AND teamMember.baton_status = 2 AND teamMember.status = 1`, { 'user_order' : 'ASC' });
                    if(getCurrentUser == null){
                        const getFirstUser = await this.teamMembersService.findOne(`teamMember.team_id = ${team_id} AND teamMember.org_id = ${org_id} AND teamMember.baton_status = 0 AND teamMember.status = 1`, { 'user_order' : 'ASC' });
                        if(getFirstUser !== null){
                            const updateFirstUser = await this.teamMembersService.update({id: getFirstUser.id, org_id: org_id, team_id: team_id, baton_status: 0, status:1}, {baton_status: 1, baton_start: '0000:00:00 00:00:00'});
                        }
                    }
                    await this.teamMembersService.update(`team_id = ${team_id} AND org_id = ${org_id} AND user_id != ${user_id} AND user_order = 1 AND status = 1`, { 'baton_status' : 1 });
                }
            }
            let getTeamDetails = await this.teamMembersService.findOne(`teamMember.team_id = ${team_id} AND teamMember.org_id = ${getScheduleDetails?.org_id} AND teamMember.status != 2 AND teamMember.baton_status = 1`);
            if(getTeamDetails){
                let notificationData = {
                    id: getTeamDetails?.id, 
                    org_id: getScheduleDetails?.org_id, 
                    user_id: getTeamDetails.user_id, 
                    custom_cname: getScheduleDetails?.custom_cname, 
                    schedule_id: getScheduleDetails['id'], 
                    challenge_id: getScheduleDetails['challenge_id'], 
                    logo: getScheduleDetails['custom_logo'] && getScheduleDetails['custom_logo'] != '' ? S3_URL + getScheduleDetails['custom_logo'] : this.commonService.getIconPath(getScheduleDetails['challenge']['logo'],S3_URL),  
                    type: 'add',
                    url: `https://${process.env.DOMAIN}/my-challenges/${getScheduleDetails['id']}`,
                    title: `${getScheduleDetails?.custom_cname} Challenge Reordered`,
                    message: `You have the baton. Please click on “I am ready” to start your turn.`,
                    send_type: 1
                };
                this.addNotification(notificationData, req);
            }
            return statusCode;
        }catch(error){
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
        }
    }
    async addNotification(challengeData: any, req: Request) {
        try {
            if(challengeData?.type == 'add' || challengeData?.type == 'update'){
                if(challengeData?.type == 'update'){
                    let where = {org_id: challengeData?.org_id, schedule_id: challengeData?.schedule_id};
                    if(challengeData?.user_id){
                        where['user_id'] = challengeData?.user_id;
                    }
                    await this.notificationsController.removeNotification(where,req);
                }
                let message = `${challengeData?.custom_cname} Challenge`;
                let notificationData = {
                    org_id: challengeData.org_id,
                    user_id: challengeData.user_id ?? 0,
                    title: challengeData?.title ?? "Upcoming Challenge",
                    message: `${challengeData?.custom_cname} Challenge`,
                    type: 1,
                    module_name: 'Challenges',
                    submodule_name: 'ScheduleChallenge',
                    metadata: {
                        id: challengeData?.id,
                        challenge_id: challengeData?.challenge_id,
                        schedule_id: challengeData?.schedule_id,
                        logo: challengeData?.logo,
                        url: challengeData?.url,
                        notification_date: null,
                        notification_sent: 0,
                        notification_sent_count: 0,
                    },
                }; 
                if(challengeData?.square_data){
                    console.log("square verification before add:", challengeData?.square_data);
                    notificationData['metadata']['square_data'] = challengeData?.square_data;
                }
                if(challengeData?.reg_start_date || challengeData?.reg_start_date || challengeData?.start_date || challengeData?.end_date){
                    if(challengeData?.reg_start_date || challengeData?.reg_start_date){
                        let startDate
                        let endDate
                        if(challengeData?.reg_start_date){
                            startDate = this.commonDateService.getTodayDate(challengeData?.reg_start_date).format('YYYY-MM-DD');
                            endDate = this.commonDateService.getTodayDate(challengeData?.reg_start_date).add(1, 'days').format('YYYY-MM-DD');
                            notificationData['metadata']['notification_date'] = startDate;
                            notificationData['metadata']['notification_sent'] = 0;
                            notificationData['metadata']['reg_start_date'] = startDate;
                            notificationData['message'] = message + ' Registration starts Today';
                            await this.notificationsController.sendNotification(0, notificationData, req);

                            notificationData['metadata']['notification_date'] = endDate;
                            notificationData['metadata']['reg_start_date_before'] = endDate;
                            notificationData['message'] = message + ' Registration starts Yesterday';
                            await this.notificationsController.sendNotification(0, notificationData, req);
                        }
                        if(challengeData?.reg_end_date){
                            endDate = this.commonDateService.getTodayDate(challengeData?.reg_start_date).subtract(1, 'days').format('YYYY-MM-DD');
                            notificationData['metadata']['notification_date'] = endDate;
                            notificationData['metadata']['notification_sent'] = 1;
                            notificationData['metadata']['reg_end_date'] = endDate;
                            notificationData['message'] = message + ' Registration ends Today';
                            await this.notificationsController.sendNotification(0,notificationData, req);
                        }
                    }
                    if(challengeData?.start_date || challengeData?.end_date){ 
                        let startDate = this.commonDateService.getTodayDate(challengeData?.start_date).format('YYYY-MM-DD');
                        notificationData['metadata']['notification_date'] = startDate;
                        notificationData['metadata']['start_date'] = startDate;
                        notificationData['metadata']['notification_sent'] = 0;
                        notificationData['message'] = message + ' starts Today';
                        await this.notificationsController.sendNotification(0, notificationData, req);
                        
                        if(challengeData?.end_date){
                            notificationData['title'] = 'Challenge Expiration';
                            let endDate = this.commonDateService.getTodayDate(challengeData?.end_date).format('YYYY-MM-DD');
                            notificationData['metadata']['notification_date'] = endDate;
                            notificationData['metadata']['notification_sent'] = endDate;
                            notificationData['metadata']['notification_sent'] = 1;
                            notificationData['metadata']['end_date'] = endDate;
                            notificationData['message'] = message + ' ends Today';
                            await this.notificationsController.sendNotification(0, notificationData, req);

                            endDate = this.commonDateService.getTodayDate(challengeData?.end_date).subtract(1, 'days').format('YYYY-MM-DD');
                            notificationData['metadata']['notification_date'] = endDate;
                            notificationData['metadata']['end_date_tomm'] = endDate;
                            notificationData['message'] = message + ' ends Tomorrow';
                            await this.notificationsController.sendNotification(0, notificationData, req);
                        }
                    }
                }
                else{
                    if(!notificationData['metadata']['notification_date']){
                        notificationData['metadata']['notification_date'] = this.commonDateService.getTodayDate().format('YYYY-MM-DD');
                    }
                    await this.notificationsController.sendNotification(challengeData?.send_type ?? 0, notificationData, req);
                } 
            }
            if(challengeData?.type == 'addMember' || challengeData?.type == 'inviteMember'){
                let notificationData = {
                    org_id: challengeData.org_id,
                    user_id: challengeData?.user_id,
                    title: challengeData?.title ?? `You have been added to Challenge`,
                    message: challengeData?.message ?? `${challengeData?.custom_cname} Challenge added by ${req?.tokenUser?.full_name}`,
                    type: 2,
                    module_name: 'Challenges',
                    submodule_name: 'ScheduleChallenge',
                    metadata: {
                        id: challengeData?.id,
                        challenge_id: challengeData?.challenge_id,
                        schedule_id: challengeData?.schedule_id,
                        logo: S3_URL + challengeData?.logo,
                        url: challengeData?.url,
                        notification_date: this.commonDateService.getTodayDate().format('YYYY-MM-DD'),
                        notification_sent: 1,
                        notification_sent_count: 0,
                    },
                };
                await this.notificationsController.sendNotification(1, notificationData, req);
            }
            return;
        }
        catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            return
        }
    }
    async streakIndicator(challengeData: any, req: Request) {
        try{
            const user_id = req.tokenUser['id'];
            const org_id = req.tokenUser?.org_id;
            const schedule_id = challengeData?.id;
            let timezone = req.tokenUser['timezone']; 
            let countStepsWith = challengeData?.countstepswith;
            let is_set_weekend = challengeData?.is_set_weekend;
            let resultCount = 0; 
            if(challengeData?.challenge_id){
                if(!challengeData['ac'] && challengeData['ch']['activity_id']){
                    challengeData['ac'] = await this.activityService.activityFindOne({id: challengeData['ch']['activity_id']});
                }
                if (challengeData['ch']['challenge_type']?.trim() === "A") {
                    let findall: any = [];
                    if(challengeData['ch']['bio_challenge_type'] == "Mile_layout"){
                        challengeData['s_walking'] = 0
                        challengeData['s_running'] = 0
                        challengeData['s_cycling'] = challengeData['s_cycling'] == 1 ? 1 : 0;
                        challengeData['s_swimming'] = 0
                    }
                    if (challengeData.s_activity_tracker === 1) { findall.push(7); }
                    if (challengeData.s_steps === 1) { findall.push(11); }
                    if (challengeData.s_walking === 1) { findall.push(15); }
                    if (challengeData.s_running === 1) { findall.push(16); }
                    if (challengeData.s_cycling === 1) { findall.push(17); }
                    if (challengeData.s_swimming === 1) { findall.push(18); }
                    if (findall?.length > 0) {
                        findall = `(${findall.join(',')})`;
                    } else {
                        findall = '("")';
                    }
                    let logType = " AND logType in ('Tracker','Manual')";
                    if (countStepsWith == 'realstep') {
                        logType = " AND logType = 'Tracker'";
                    }
                    let where;
                    if(challengeData['ch']['bio_challenge_type'] == "Olympics"){
                        let activityData: any = await this.acOlympicDataService.listRecord(`aod.schedule_id = ${schedule_id} AND aod.user_id = ${user_id} AND aod.status= 1 AND challengeactivity.id IS NOT NULL`);
                        resultCount = await this.streakCalculator({records: activityData}, req);
                    }
                    else if(challengeData['ch']['bio_challenge_type'] == "Hydrate" || challengeData['ch']['bio_challenge_type'] == "Sleep_Tracking"){
                        let fields = ['SUM(water) as water','food.collectionDate'];
                        if(challengeData['ch']['bio_challenge_type'] == "Hydrate"){
                            if(challengeData?.ch?.activity_id){
                                findall = challengeData?.ch?.activity_id; 
                                findall = (!findall) ? '("")' : `('${findall}')`;
                            }
                            where = `food.collectionDate BETWEEN '${challengeData.start_date}' AND '${challengeData.end_date}'`;
                        }
                        if(challengeData['ch']['bio_challenge_type'] == "Sleep_Tracking"){
                            findall = `('19')`; 
                            where = `food.collectionDate BETWEEN '${challengeData.start_date}' AND '${challengeData.end_date}'`;
                            fields.push('SUM(amount) as amount');
                        }
                        let recordData = await this.fetch_point_steps(tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS, fields, 'user_id', 'activityTypeId', findall, where, user_id?.toString(), req, 'food.collectionDate');
                        resultCount = await this.streakCalculator({records: recordData}, req);
                    }
                    else if(challengeData['ch']['bio_challenge_type'] == "Fitness"){
                        let userActivity = await this.fitnessUsersActivityService.listRecord({schedule_id: schedule_id, user_id: req.tokenUser?.id});
                        resultCount = await this.streakCalculator({records: userActivity}, req);
                    }
                    else if(challengeData['ch']['bio_challenge_type'] == "Random_Acts_of_Kindness"){
                        let stepsData = await this.tokensService.listRecord(
                            `t.user_id IN (${user_id}) AND t.token_type = 'given'`,
                            { 't.submission_date': 'DESC' },
                            ['t.id', 't.user_id', 't.submission_date'],
                        );
                        resultCount = await this.streakCalculator({records: stepsData}, req);
                    }
                    else{ 
                        let currentDateUser = this.commonDateService.DateTimeFormat('now','YYYY-MM-DD');
                        where = `food.collectionDate BETWEEN '${this.commonDateService.DateTimeFormat(challengeData.start_date,'YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.DateTimeFormat(challengeData.end_date,'YYYY-MM-DD')} 23:59:59' ${logType} AND food.status = 1`;
                        if(challengeData['ch']['bio_challenge_type'] == "Football_step"){
                        }
                        if(challengeData['ch']['bio_challenge_type'] == "Trek_step"){
                            if(is_set_weekend === 1){
                                logType += " AND WEEKDAY(collectionDate) >= 0 AND WEEKDAY(collectionDate) < 5";
                                where = ` WEEKDAY(food.collectionDate) >= 0 AND WEEKDAY(food.collectionDate) < 5 AND food.collectionDate BETWEEN '${challengeData.start_date}' AND '${this.commonDateService.DateTimeFormat(challengeData.end_date,'YYYY-MM-DD')} 23:59:59' ${logType}`; 
                            }
                        }
                        if(challengeData['ch']['bio_challenge_type'] == "Move_more"){
                            if(is_set_weekend == 1){
                                logType += " AND WEEKDAY(food.collectionDate) >= 0 AND WEEKDAY(food.collectionDate) < 5";
                                const startDay:any = this.commonDateService.DateTimeFormat(challengeData['start_date']);
                                let dayOfWeek = startDay.day();
                                if (dayOfWeek > 0 && dayOfWeek <= 5) {
                                    challengeData['start_date'] = startDay.format('YYYY-MM-DD');
                                } else {
                                    challengeData['start_date'] = startDay.day(8).format('YYYY-MM-DD');
                                }
                                const endDate:any = this.commonDateService.DateTimeFormat(challengeData['end_date']);
                                dayOfWeek = endDate.day();
                                if (dayOfWeek > 0 && dayOfWeek <= 5) {
                                    challengeData['end_date'] = endDate.format('YYYY-MM-DD');
                                } else {
                                    const daysSinceLastFriday = (dayOfWeek + 2) % 7;
                                    challengeData['end_date'] = endDate.subtract(daysSinceLastFriday, 'days').startOf('day').format('YYYY-MM-DD');
                                }
                            }
                            where = `food.collectionDate BETWEEN '${this.commonDateService.DateTimeFormat(challengeData.start_date,'YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.DateTimeFormat(challengeData.end_date,'YYYY-MM-DD')} 23:59:59' ${logType} AND food.status = 1`;
                            where += " AND food.collectionDate BETWEEN '" + challengeData['start_date'] + "' AND '" + currentDateUser + "'";
                        }
                        if(challengeData['ch']['bio_challenge_type'] == "Mile_layout"){
                            findall = [];
                            findall.push(17);
                            if(is_set_weekend == 1){
                                where = ` WEEKDAY(food.collectionDate) >= 0 AND WEEKDAY(food.collectionDate) < 5 AND food.collectionDate BETWEEN '${challengeData.start_date}' AND '${this.commonDateService.DateTimeFormat(challengeData.end_date,'YYYY-MM-DD')} 23:59:59' ${logType} AND food.status = 1`; 
                            }
                        }
                        if(challengeData['ch']['bio_challenge_type'] == "Relay_race"){// activityfeed
                            /*
                            // resultedData[index]['data'] = await this.relayRaceChallengeHelperService.RelayraceChallenge(schedule, req, show_type);
                            // not adding current dont know how to apply streak logic here
                            */
                        }
                        else if (challengeData['ac']['activity_name'] === "Steps") {
                            if(is_set_weekend == 1){
                                where = ` WEEKDAY(food.collectionDate) >= 0 AND WEEKDAY(food.collectionDate) < 5 AND food.collectionDate BETWEEN '${this.commonDateService.DateTimeFormat(challengeData.start_date,'YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.DateTimeFormat(challengeData.end_date,'YYYY-MM-DD')} 23:59:59' ${logType} AND food.status = 1`; 
                                logType += " AND  WEEKDAY(collectionDate) >= 0 AND WEEKDAY(collectionDate) < 5";
                            }
                        }
                        let AllStepsdata = await this.activityFeedsService.listRecord(
                            `food.user_id IN (${user_id}) AND (food.activityTypeId IN ${findall} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${where}`,
                            { 'food.collectionDate': 'DESC' },
                            ['SUM(steps) as steps', 'user_id', 'collectionDate'],
                            'food.user_id, food.collectionDate',
                        );
                        resultCount = await this.streakCalculator({records: AllStepsdata}, req);
                    }
                }                        
                if (challengeData['ch']['challenge_type']?.trim() == "B") {
                    if (challengeData['ch']['bio_challenge_type'] == "Football" || challengeData['ch']['bio_challenge_type'] == "Weight_progress" || challengeData['ch']['bio_challenge_type'] == "Weight_progress_withoutTeam") { 
                        let bioWeightDatas = await this.bioWeightService.listRecord(
                            `weight.user_id IN (${user_id}) AND weight.schedule_id = ${schedule_id} AND weight.status =1`, 
                            { 'weight.added_date': 'DESC', 'weight.id': 'DESC' }
                        );
                        if (challengeData.s_rangestartdate && challengeData.s_rangeenddate) {
                            let range_startDate = await this.commonDateService.DateTimeFormat(challengeData['rangestartdate'],'YYYY-MM-DD') + ' 00:00:00';
                            let range_endDate = await this.commonDateService.DateTimeFormat(challengeData['rangeenddate'],'YYYY-MM-DD') + ' 23:59:59';
                            let s_range_startDate = await this.commonDateService.DateTimeFormat(challengeData['s_rangestartdate'],'YYYY-MM-DD') + ' 00:00:00';
                            let s_range_endDate = await this.commonDateService.DateTimeFormat(challengeData['s_rangeenddate'],'YYYY-MM-DD') + ' 23:59:59';
                            bioWeightDatas = await this.bioWeightService.listRecord(`weight.schedule_id = ${schedule_id} AND weight.status = 1 AND ((weight.added_date BETWEEN '${range_startDate}' AND '${range_endDate}') OR (weight.added_date BETWEEN '${s_range_startDate}' AND '${s_range_endDate}') )`,
                                {'weight.added_date': 'DESC', 'weight.id': 'DESC'},
                                ['weight.id','weight.user_id','weight.weight','weight.schedule_id','weight.schedule_join_id','weight.created_date','weight.modified_date','weight.added_date']
                            );
                        }    
                        resultCount = await this.streakCalculator({records: bioWeightDatas}, req);   
                    } 
                }
                if (challengeData['ch']['challenge_type']?.trim() == "H") {
                    if (challengeData['ch']['bio_challenge_type'] == "Bingo_layout") {
                        let cardData: any = await this.squareUsersService.listRecord({user_id: user_id, schedule_id: schedule_id, status: 1});
                        resultCount = await this.streakCalculator({records: cardData}, req);
                    }
                    else if (challengeData['ch']['bio_challenge_type'] == "Healthy_habit_activity_layout") { // need to apply proper conditions 
                        let healthUserActivitiesTemp = await this.healthUsersActivityService.listRecord(`hua.org_id =${org_id} AND hua.user_id =${user_id} AND hua.status = 1 AND health_activity.status = 1`,
                            null,
                            ['health_activity.avalue,hua.act_id,sum(miles) as Total','DATE_FORMAT(hua.act_date,"%Y-%m-%d") as act_date','DATE_FORMAT(hua.act_date,"%Y-%m-%d %H:%i:%s") as act_date1'],
                            'hua.act_id, DATE_FORMAT(hua.act_date,"%Y-%m-%d")'
                        );   
                        if(healthUserActivitiesTemp.length == 0) {
                            let findall = '(7,11,15,16,17,18)';
                            let where = `food.collectionDate BETWEEN '${challengeData['start_date']}' AND '${challengeData['end_date']}' AND food.status = 1`;
                            healthUserActivitiesTemp = await this.activityFeedsService.listRecord(`food.user_id in (${user_id}) AND (food.activityTypeId in ${findall} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${where}`,{collectionDate: 'ASC'}, ['SUM(distance) as steps', 'collectionDate', 'DATE_FORMAT(CONCAT(DATE_FORMAT(food.collectionDate,"%Y-%m-%d "),DATE_FORMAT(food.timestamp,"%H:%i:%s")),"%Y-%m-%d %H:%i:%s") as collectionDate1, food.status'], 'food.user_id, food.collectionDate');
                        }
                        resultCount = await this.streakCalculator({records: healthUserActivitiesTemp}, req);     
                    }
                    else if (challengeData['is_all_activities'] == 1) { // need to apply proper conditions 
                        let daysData = await this.daysUsersService.listRecord(`du.challenge_id = ${challengeData['ch']['id']} AND du.schedule_id = ${schedule_id} AND du.user_id = ${user_id} AND du.status != 2`,
                            {day_id : 'ASC'},
                            ['du','ac.activity_name','days.site_activity_desc','days.manual_activity','days.manual_desc','days.logofile','days.manuallink','days.m_long','days.m_yesno','days.m_short','days.m_numeric']
                        );  
                        resultCount = await this.streakCalculator({records: daysData}, req);         
                    }
                    else {  // need to apply proper conditions 
                        let daysData = await this.daysUsersService.listRecord(`du.challenge_id = ${challengeData['ch']['id']} AND du.schedule_id = ${schedule_id} AND du.user_id = ${user_id} AND du.status != 2`,
                            {day_id : 'ASC'},
                            ['du','ac.activity_name','days.site_activity_desc','days.manual_activity','days.manual_desc','days.logofile','days.manuallink','days.m_long','days.m_yesno','days.m_short','days.m_numeric']
                        );  
                        resultCount = await this.streakCalculator({records: daysData}, req);    
                    } 
                }                    
                if(challengeData['ch']['challenge_type']?.trim() == "R"){                       
                    let where = (req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id || appConstant.ROLE.WCH == req.tokenUser?.role_id) ? `recipe.status != 2` : `recipe.status = 1`;
                    where += ` AND recipe.schedule_id = ${schedule_id} AND recipe.org_id = ${org_id} AND recipe.user_id = ${user_id}`;
                    where += ` AND recipe.created BETWEEN '${this.commonDateService.DateTimeFormat(challengeData.start_date,'YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.DateTimeFormat(challengeData.end_date,'YYYY-MM-DD')} 23:59:59'`   
                    const resultedData = await this.recipeService.paginateList(where,{ limit: 1000 } as any);
                    resultCount = await this.streakCalculator({records: resultedData['list']}, req);
                }
            } 
            return resultCount;
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
        }
    }

    async streakCalculator(postData: any, req: Request) {
        try{
            let streak = 0;
            let expectedDate = this.commonDateService.getTodayDate().format('YYYY-MM-DD');
            for (const row of postData?.records) {
                if(row?.food_collectionDate) {
                    row.collectionDate = row?.food_collectionDate;
                }
                if (row?.submission_date) {
                    row.day = this.commonDateService.getTodayDate(row.submission_date).format('YYYY-MM-DD');
                }
                else if (row?.added_date) {
                    row.day = this.commonDateService.getTodayDate(row.added_date).format('YYYY-MM-DD');
                }
                else if (row?.created_date) {
                    row.day = this.commonDateService.getTodayDate(row.created_date).format('YYYY-MM-DD');
                }
                else if (row?.created) {
                    row.day = this.commonDateService.getTodayDate(row.created).format('YYYY-MM-DD');
                }
                else if (row?.collectionDate) {
                    row.day = this.commonDateService.getTodayDate(row.collectionDate).format('YYYY-MM-DD');
                }
                if (row.day === expectedDate) {
                    streak++;
                    expectedDate = this.commonDateService.getTodayDate(expectedDate).subtract(1, 'days').format('YYYY-MM-DD');
                } else {
                    break;
                }
            }
            return streak;
        }
        catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
        }
    }
}