import { CommonArrayService, CommonDateService, CommonService, tableConstant } from '@common-constants';
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request } from "express";
import { lastValueFrom } from "rxjs";
import { ChatService } from "src/modules/chat/chat/chat.service";
import { CompanyService } from "src/modules/company/companies/company.service";
import { SettingsService } from "src/modules/company/settings/settings.service";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { ActivityFeedService } from "src/modules/trackers/activityfeeds/activityfeeds.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { Not } from "typeorm";
import { CommitmentLevelsService } from "../../commitmentlevels/commitmentlevels.service";
import { InviteUserService } from "../../inviteuser/inviteuser.service";
import { ScheduleChallengeJoinUsersService } from "../../schedulechallengejoinusers/schedulechallengejoinusers.service";
import { TeamsService } from "../../teams/teams.service";
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD
@Injectable()
export class TrekStepChallengeService {
    constructor(
        private readonly translatorService: TranslationService,
        private readonly commonService: CommonService,
        private readonly commonDateService: CommonDateService,
        private readonly companyService: CompanyService,
        private readonly companySettingsService: SettingsService,
        private readonly chatService: ChatService,
        private readonly teamsService: TeamsService,
        private readonly activityFeedsService: ActivityFeedService,
        private readonly inviteUserService: InviteUserService,
        private readonly activityLogService: ActivityLogService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly commitmentLevelsService: CommitmentLevelsService,
        private readonly commonArrayService: CommonArrayService,
        
        @Inject('COMMON_SERVICE')
            private commonMicroservice: ClientProxy,
    ) {}

    /* Trek Step Challenge Code */
        async trekstepChallenge(schedule: any, req: Request, show_type = 1) {
            try {
                let result = Object.create(null);
                let user = Object.create(req.tokenUser);
                let findall: any = [];
                if (schedule.sc.s_activity_tracker === 1) { findall.push(7); }
                if (schedule.sc.s_steps === 1) { findall.push(11); }
                if (schedule.sc.s_walking === 1) { findall.push(15); }
                if (schedule.sc.s_running === 1) { findall.push(16); }
                if (schedule.sc.s_cycling === 1) { findall.push(17); }
                if (schedule.sc.s_swimming === 1) { findall.push(18); }
                if (findall?.length > 0) {
                    findall = `(${findall.join(',')})`;
                } else {
                    findall = '("")';
                }
                let orgid = schedule.sc.org_id;
                let schedule_id = schedule.sc.id;
                let ucurrentdate = schedule.challengeDetails.ucurrentdate;
                let totaldays = schedule.challengeDetails.totaldays;
                let uptodays = schedule.challengeDetails.uptodays;
                let dailymaxstepscnt = schedule.sc.dailymaxstepscnt;
                let countstepswith = schedule.sc.countstepswith;
                let userId = user.id;
                let timezone = user.timezone;
                let logType = " AND logType in ('Tracker','Manual')";
                if (countstepswith == 'realstep') {
                    logType = " AND logType = 'Tracker'";
                }
                let is_set_weekend = schedule.sc.is_set_weekend;
                if(is_set_weekend === 1){
                    logType += " AND  WEEKDAY(collectionDate) >= 0 AND WEEKDAY(collectionDate) < 5";
                }
                let dailySteps = 0;
                if (schedule.sc.tr_goaltype == 2) {
                    let dailyStepsData = await this.commitmentLevelsService.findOne({ id: schedule['trek_level_id'] });
                    if(dailyStepsData){
                        if (dailyStepsData?.['level_type'] && dailyStepsData['level_type'] == "miles") {
                            dailyStepsData['level_value'] = dailyStepsData['level_value'] * 2112;
                        }
                        dailySteps = dailyStepsData['level_value'];
                    }
                } else {
                    dailySteps = schedule['ch']['numberofsteps'];
                    if (schedule.sc.numberofsteps != 0 && schedule.sc.numberofsteps != "") {
                        dailySteps = schedule.sc.numberofsteps;
                    }
                }
                let totalSteps = (dailySteps * totaldays);   
                let upstotalSteps = (dailySteps * totaldays);
                result = {
                    dailysteps: dailySteps,
                    totalsteps: totalSteps,
                    totalsteps_str: this.commonArrayService.formatUSStyle(totalSteps),
                };
                let where = `food.collectionDate BETWEEN '${schedule.sc.start_date}' AND '${this.commonDateService.DateTimeFormat(schedule.sc.end_date,'YYYY-MM-DD')} 23:59:59' ${logType} AND food.status = 1`;
                if(is_set_weekend == 1){
                    where = ` WEEKDAY(food.collectionDate) >= 0 AND WEEKDAY(food.collectionDate) < 5 AND food.collectionDate BETWEEN '${schedule.sc.start_date}' AND '${this.commonDateService.DateTimeFormat(schedule.sc.end_date,'YYYY-MM-DD')} 23:59:59' ${logType}`; 
                }
                let whereD = `DATE(food.collectionDate) = DATE('${ucurrentdate}') AND food.status = 1`;
                if(is_set_weekend == 1){
                    whereD = `DATE(food.collectionDate) = DATE('${ucurrentdate}') AND  WEEKDAY(food.collectionDate) >= 0 AND WEEKDAY(food.collectionDate) < 5`;
                }
                result['today'] = {
                    completedsteps: 0,
                    beyond: 0,
                    remainsteps: 0,
                    progress: 0,
                    averagesteps: 0
                };
                let matchStartDate: any = schedule.sc.start_date;
                if(schedule['sc']['team'] == 1){
                    const allgetteams:any = await this.teamsService.getAllTeams(`team.org_id = ${orgid} AND team.schedule_id = ${schedule_id}`);
                    let myGroupID:any = '';
                    let myTeamID:any = '';
                    let groupId = 0;
                    let teamId = 0;
                    let allteams = Object.create(null);
                    let allgroups = Object.create(null);
                    let topusers = Object.create(null);
                    let allCompeletedSteps = 0;
                    let allDailySteps = 0;
                    let allBeyonds = 0;
                    let allRemainSteps = 0;
                    let groupMemberCount = Object.create(null);
                    for (let getteam of allgetteams) {
                        if(getteam['teamMember'] && getteam['teamMember']?.length > 0){
                            getteam['teamMember'] = Object.values(getteam['teamMember']).filter((item)=> item['user']);
                            getteam['teamMember'] = Object.values(getteam['teamMember']).filter((item)=> item['scheduleJoin']);
                        }
                        let dailyStepsTeam = 0;
                        if(getteam.teamMember && getteam.teamMember.length > 0){
                            for(let getMember of getteam.teamMember){
                                if (schedule.sc.tr_goaltype == 2) {
                                    let dailyStepsData = await this.commitmentLevelsService.findOne({ id: getMember.scheduleJoin['trek_level_id'] });
                                    if(dailyStepsData){
                                        if (dailyStepsData?.['level_type'] && dailyStepsData['level_type'] == "miles") {
                                            dailyStepsData['level_value'] = dailyStepsData['level_value'] * 2112;
                                            getMember['level_value'] = dailyStepsData['level_value'] * 2112;
                                        }
                                        dailyStepsTeam += dailyStepsData['level_value'];
                                    }
                                } else {
                                    if (schedule.sc.numberofsteps != 0 && schedule.sc.numberofsteps != "") {
                                        dailyStepsTeam += schedule.sc.numberofsteps;
                                    }else{
                                        dailyStepsTeam += schedule['ch']['numberofsteps'];
                                        getMember['level_value'] = schedule['ch']['numberofsteps'];
                                    }
                                }
                            }
                        }
                        if(getteam['teamMember'] && getteam['teamMember']?.length > 0){
                            getteam['teamMember'] = Object.values(getteam['teamMember']).filter((item)=> item['user']);
                        }
                        let teamcreatedBy = 0;
                        groupId = getteam['group_id'];
                        teamId = getteam['id'];
                        teamcreatedBy = getteam['created_by'];
                        if (!allteams['Teams']) { allteams['Teams'] = Object.create(null); }
                        if (!allteams['Teams'][teamId]) { allteams['Teams'][teamId] = Object.create(null); }
                        if (!result['myTeamDetails']) { result['myTeamDetails'] = Object.create(null); }
                        let teamName = await this.translatorService.frontendReadTranslation(req.lang,`team_name_${schedule_id}_${teamId}`, `/LC_MESSAGES/Challenge/MyChallenges/${orgid}/${schedule_id}`,`dynamic`);
                        teamName = (teamName == '' || teamName == `team_name_${schedule_id}_${teamId}`) ? getteam['tname'] : teamName;
                        getteam['tname'] = teamName;
                        let icons = getteam['logo'];
                        if (icons?.length > 2 && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: icons}))) {
                            let iconimages = icons;
                            getteam['logo'] = S3_URL + iconimages;
                        } else {
                            getteam['logo'] = this.commonService.getIconPath(icons,S3_URL);
                        }
                        let monthName = this.commonDateService.getTodayDate().format('MMMM');
                        if(getteam['created_date'] && getteam['created_date'] != null){
                            monthName = await this.translatorService.frontendReadTranslation(req.lang, moment(getteam['created_date']).format('MMMM'), `/LC_MESSAGES/Common/Month`,`static`);
                        }
                        getteam['created_date'] = monthName + ' ' + moment(getteam['created_date']).format('D, YYYY');
                        allteams['Teams'][teamId] = getteam;
                        let realStepsWalks:any = 0;
                        let teamRealSteps:any = 0;
                        let teamCompeletedSteps:any = 0;
                        let stepsWalks: any = 0;
                        let totalRemainSteps:any = 0;
                        let teamsmemtoday:any = 0;
                        let beyondTotal:any = 0;
                        let teamsMem:any = 0;
                        let DailyStepsForAll:any = 0;
                        let DailyStepsForTeam:any = 0;
                        let todayTotal:any = 0;
                        let todayTotalDaily:any = 0;
                        let todayTotalRemain:any = 0;
                        let todayBeyondTotal:any = 0;
                        let teamTodayTotalSteps:any = 0;
                        let teamTodayTotalAverageSteps:any = 0;
                        let teamTodayProcess:any = 0;
                        let groupComplatedSteps:any = 0;
                        let groupDailySteps:any = 0;
                        let groupDailyTotalSteps:any = 0;
                        let groupAverageSteps:any = 0;
                        let groupRemainStaps:any = 0;
                        let groupProgress:any = 0;
                        let teamCount = 0;
                        let allStepsData: any = [];
                        let todayStepsData: any = [];
                        if(getteam['teamMember'] && getteam['teamMember']?.length > 0){
                            let allUsersIdArray = getteam['teamMember'].map(member => member['user']?.id ? member['user']?.id : '');
                            const allUsersId:any = allUsersIdArray.filter(item => item !== '').join(',');
                            if(allUsersId.trim() != ''){
                                let whereFinal = `food.user_id in (${allUsersId}) AND (activityTypeId in ${findall} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${where}`;
                                allStepsData = await this.activityFeedsService.getUserActivityData(whereFinal, ['SUM(food.steps) as steps', 'food.user_id as user_id'], 'food.user_id');
                                if(allStepsData){
                                    let temp:any = Object.create(null);
                                    allStepsData.map(getSteps => {
                                        temp[Number(getSteps.user_id)] = Number(getSteps.steps);
                                    });
                                    if (Object.keys(temp)?.length > 0) {
                                        allStepsData = temp;
                                        temp = Object.create(null);
                                    }
                                }
                                let whereDFinal = `food.user_id in (${allUsersId}) AND (activityTypeId in ${findall} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${whereD}`;
                                todayStepsData = await this.activityFeedsService.getUserActivityData(whereDFinal, ['SUM(food.steps) as steps', 'food.user_id as user_id'], 'food.user_id');
                                if(todayStepsData){
                                    let temp = Object.create(null);
                                    todayStepsData.map(getSteps => {
                                        temp[Number(getSteps.user_id)] = Number(getSteps.steps);
                                    });
                                    if (Object.keys(temp)?.length > 0) {
                                        todayStepsData = temp;
                                        temp = Object.create(null);
                                    }
                                }
                            }
                            let user_in_ranking = schedule.in_ranking; 
                            if(allUsersIdArray.includes(userId)){
                                myTeamID = teamId;
                                myGroupID = groupId;
                                result['myTeamDetails']['id'] = teamId;
                                result['myTeamDetails']['group_id'] = myGroupID;
                                result['myTeamDetails']['tname'] = getteam['tname'];
                                result['myTeamDetails']['created_by'] = getteam['created_by'];
                                result['myTeamDetails']['created_date'] = getteam['created_date'];
                                result['myTeamDetails']['is_team'] = '1';
                                result['myTeamDetails']['logo'] = getteam['logo'];
                                result['myTeamDetails']['team_size'] = getteam['team_size'];
                            }
                            let levels = await this.commitmentLevelsService.listRecord({ schedule_id: schedule_id, status: 1 });
                            let temp = Object.create(null);
                            let levelsInfo = Object.create(null);
                            levels.map(getLevels => {
                                temp[Number(getLevels.id)] = getLevels;
                            });
                            if (Object.keys(temp)?.length > 0) {
                                levelsInfo = temp;
                                temp = Object.create(null);
                            }
                            for (let getMember of getteam['teamMember']) {
                                let percentage = 0;
                                let averageSteps = 0;
                                let todayPercentage = 0;
                                let teamuserid = getMember.user_id;
                                if (getMember['user'] && getMember['user']['profile_image'] && getMember['user']['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: getMember['user']['profile_image']}))) {
                                    getMember['user']['profile_image'] = S3_URL + getMember['user']['profile_image'];
                                }
                                else{
                                    getMember['user']['profile_image'] = S3_URL + 'comn/img/avatar_0001.png'; 
                                }
                                getMember['user']['name'] = '';
                                if (getMember['user'] && (getMember['user']['first_name'] && getMember['user']['last_name'])) {
                                    getMember['user']['name'] = getMember['user']['first_name'] + ' '+ getMember['user']['last_name'];
                                    delete(getMember['user']['first_name']);
                                    delete(getMember['user']['last_name']);
                                }
                                if(getMember?.department && req?.lang != 'eng'){
                                    let deptName = await this.translatorService.frontendReadTranslation(req.lang,`department_name_${getMember?.department?.id}`, `/LC_MESSAGES/OrgAdmin/Department/${orgid}/${getMember?.department?.id}`,`dynamic`);
                                    getMember.department['dept_name'] = (deptName == '' || deptName == `department_name_${getMember?.department?.id}`) ? getMember?.department?.dept_name : deptName;
                                }
                                if(getMember?.locations && req?.lang != 'eng'){
                                    if (getMember?.locations.location_name) {
                                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_name_${getMember?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${getMember?.locations['id']}`, `dynamic`);
                                        getMember.locations.location_name = (customName == '' || customName == `location_name_${getMember?.locations['id']}`) ? getMember?.locations['location_name'] : customName;
                                    }
                                    if (getMember?.locations.address1) {
                                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_address1_${getMember?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${getMember?.locations['id']}`, `dynamic`);
                                        getMember.locations.address1 = (customName == '' || customName == `location_address1_${getMember?.locations['id']}`) ? getMember?.locations['address1'] : customName;
                                    }
                                    if (getMember?.locations.address2) {
                                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_address2_${getMember?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${getMember?.locations['id']}`, `dynamic`);
                                        getMember.locations.address2 = (customName == '' || customName == `location_address2_${getMember?.locations['id']}`) ? getMember?.locations['address2'] : customName;
                                    }
                                    if (getMember?.locations.lname) {
                                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_lname_${getMember?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${getMember?.locations['id']}`, `dynamic`);
                                        getMember.locations.lname = (customName == '' || customName == `location_lname_${getMember?.locations['id']}`) ? getMember?.locations['lname'] : customName;
                                    }
                                    if (getMember?.locations.city) {
                                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_city_${getMember?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${getMember?.locations['id']}`, `dynamic`);
                                        getMember.locations.city = (customName == '' || customName == `location_city_${getMember?.locations['id']}`) ? getMember?.locations['city'] : customName;
                                    }
                                    if (getMember?.locations.state) {
                                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_state_${getMember?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${getMember?.locations['id']}`, `dynamic`);
                                        getMember.locations.state = (customName == '' || customName == `location_state_${getMember?.locations['id']}`) ? getMember?.locations['state'] : customName;
                                    }
                                    if (getMember?.locations.country) {
                                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_country_${getMember?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${getMember?.locations['id']}`, `dynamic`);
                                        getMember.locations.country = (customName == '' || customName == `location_country_${getMember?.locations['id']}`) ? getMember?.locations['country'] : customName;
                                    }
                                }
                                if (Object.prototype.hasOwnProperty.call(allStepsData, teamuserid)) {
                                    stepsWalks = allStepsData[teamuserid];
                                    realStepsWalks = allStepsData[teamuserid];
                                    if (dailymaxstepscnt && dailymaxstepscnt !== "" && parseInt(dailymaxstepscnt) !== 0) {
                                        let updailymaxstepscnt = dailymaxstepscnt * uptodays;
                                        if (stepsWalks > updailymaxstepscnt) {
                                            stepsWalks = updailymaxstepscnt;
                                        }
                                        stepsWalks = parseFloat((stepsWalks).toFixed(2)?.toString()?.replace("-", "") ?? 0);
                                    }
                                    if (stepsWalks == "") {
                                        stepsWalks = 0;
                                        realStepsWalks = 0;
                                    }
                                } else {
                                    stepsWalks = 0;
                                    realStepsWalks = 0;
                                }
                                teamCount += stepsWalks > 0 ? 1 :  0;
                                teamRealSteps += realStepsWalks;
                                teamCompeletedSteps += stepsWalks;
                                let stepsdaily: any = 0;
                                if (Object.prototype.hasOwnProperty.call(todayStepsData,teamuserid)) {
                                    stepsdaily = todayStepsData[teamuserid];
                                    if (dailymaxstepscnt && dailymaxstepscnt !== "" && parseInt(dailymaxstepscnt) !== 0) {
                                        if (stepsdaily > dailymaxstepscnt) {
                                            stepsdaily = dailymaxstepscnt;
                                        }
                                        stepsdaily = parseFloat((stepsdaily).toFixed(2)?.toString()?.replace("-", "") ?? 0);
                                    }
                                    if (stepsdaily && stepsdaily !== "") {
                                        teamsmemtoday++;
                                    }
                                } else {
                                    stepsdaily = 0;
                                }
                                if(schedule.sc.tr_goaltype == 2 && levelsInfo[getMember.scheduleJoin.trek_level_id]){
                                    let levelInfos = levelsInfo[getMember.scheduleJoin.trek_level_id];
                                    if(levelInfos?.level_type && levelInfos.level_type == 'steps'){
                                        dailySteps  = levelInfos.level_value;  
                                    }else{
                                        dailySteps  = (levelInfos.level_value * 2112); 
                                    }
                                    totalSteps = (dailySteps * totaldays);
                                }   
                                let memremain = 0
                                if (stepsWalks !== "" && stepsWalks !== 0) {
                                    if (Object.prototype.hasOwnProperty.call(allStepsData,teamuserid)) {
                                        DailyStepsForAll += dailySteps;
                                        DailyStepsForTeam += dailySteps; 
                                    }
                                    let remainsteps = totalSteps - stepsWalks;
                                    if (remainsteps < 0) {
                                        let rtemp = Math.abs(remainsteps);
                                        if(teamuserid == userId){
                                            result['beyond'] = rtemp;
                                        }
                                        remainsteps = 0;
                                        beyondTotal += rtemp;
                                    }
                                    if(teamuserid == userId){
                                        result['remainsteps'] = remainsteps;
                                    }
                                    totalRemainSteps += remainsteps;
                                    teamsMem++;
                                }
                                if (totalSteps !== 0) {
                                    percentage = parseFloat(((stepsWalks * 100) / totalSteps).toFixed(2));
                                    if (percentage >= 100) {
                                        percentage = 100;
                                    }
                                    averageSteps = (uptodays !== 0) ? Math.round(stepsWalks / uptodays) : 0;
                                }
                                let todayremain = 0;
                                todayTotal += stepsdaily;
                                todayTotalDaily += dailySteps;
                                todayremain = dailySteps - stepsdaily;
                                if (todayremain < 0) {
                                    let rtemp = Math.abs(todayremain);
                                    todayremain = 0;
                                    todayBeyondTotal += rtemp;
                                }
                                if (Object.prototype.hasOwnProperty.call(allStepsData,teamuserid)) {
                                    todayTotalRemain += todayremain;
                                }
                                todayPercentage = (dailySteps !== 0) ? parseFloat(((stepsdaily * 100) / dailySteps).toFixed(2)) : 0;
                                if (todayPercentage >= 100) {
                                    todayPercentage = 100;
                                }
                                if (user_in_ranking === 1) {
                                    if (userId === teamuserid) {
                                        getMember['progress'] = percentage;
                                        getMember['completedsteps'] = parseFloat(stepsWalks.toFixed(2));
                                        getMember['realcompletedsteps'] = parseFloat(realStepsWalks.toFixed(2));
                                        getMember['averagestep'] = averageSteps;
                                        getMember['in_ranking'] = getMember['scheduleJoin'].in_ranking;
                                        getMember['is_captain'] = getMember?.iscaptain;
                                        getMember['userdetail'] = getMember['user'];
                                        delete(getMember['user']);
                                        getMember['today']['completedsteps'] = 0;
                                        getMember['today']['beyond'] = 0;
                                        getMember['today']['remainsteps'] = 0;
                                        getMember['today']['progress'] = 0;
                                        getMember['today']['averagesteps'] = 0;
                                        if (matchStartDate <= ucurrentdate) {
                                            getMember['today']['completedsteps'] = stepsdaily;
                                            let todayremain = dailySteps - stepsdaily;
                                            if (todayremain < 0) {
                                                getMember['today']['beyond'] = Math.abs(parseFloat((todayremain).toFixed(2)));
                                                todayremain = 0;
                                            } else {
                                                getMember['today']['remainsteps'] = parseFloat((todayremain).toFixed(2));;
                                            }
                                            getMember['today']['progress'] = todayPercentage;
                                            let todayAverageSteps = (dailySteps !== 0) ? Math.round((stepsdaily / dailySteps) * todayTotalDaily) : 0;
                                            getMember['today']['averagesteps'] = todayAverageSteps;
                                            if (userId === teamuserid) {
                                                result['today'] = getMember['today'];
                                                result['completedsteps'] =  parseFloat(stepsWalks.toFixed(2));
                                                result['completedsteps_str'] =  this.commonArrayService.formatUSStyle(parseFloat(stepsWalks.toFixed(2)));
                                                result['progress'] = percentage;
                                                result['averagesteps'] = averageSteps;
                                                result['averagesteps_str'] = this.commonArrayService.formatUSStyle(averageSteps);
                                            }
                                        }
                                    }
                                } else {
                                    if (getMember['scheduleJoin'] && getMember['scheduleJoin'].in_ranking === 0) {
                                        getMember['progress'] = percentage;
                                        getMember['completedsteps'] = parseFloat(stepsWalks.toFixed(2));
                                        getMember['realcompletedsteps'] = parseFloat(realStepsWalks.toFixed(2));
                                        getMember['averagestep'] = averageSteps;
                                        getMember['in_ranking'] = getMember['scheduleJoin'].in_ranking;
                                        getMember['is_captain'] = getMember?.iscaptain; 
                                        getMember['userdetail'] = getMember['user'];
                                        delete(getMember['user']);
                                        if (!getMember['today']) {
                                            getMember['today'] = Object.create(null);
                                        }
                                        getMember['today']['completedsteps'] = 0;
                                        getMember['today']['beyond'] = 0;
                                        getMember['today']['remainsteps'] = 0;
                                        getMember['today']['progress'] = 0;
                                        getMember['today']['averagesteps'] = 0; 
                                        if (matchStartDate <= ucurrentdate) {
                                            getMember['today']['completedsteps'] = stepsdaily;
                                            let todayremain = dailySteps - stepsdaily;
                                            if (todayremain < 0) {
                                                getMember['today']['beyond'] = Math.abs(parseFloat((todayremain).toFixed(2)));
                                                todayremain = 0;
                                            } else {
                                                getMember['today']['remainsteps'] = parseFloat((todayremain).toFixed(2));
                                            }
                                            getMember['today']['progress'] = todayPercentage;
                                            let todayAverageSteps = (dailySteps !== 0) ? Math.round((stepsdaily / dailySteps) * todayTotalDaily) : 0;
                                            getMember['today']['averagesteps'] = todayAverageSteps;
                                            if (userId === teamuserid) {
                                                result['today'] = getMember['today'];
                                                result['completedsteps'] =  parseFloat(stepsWalks.toFixed(2));
                                                result['completedsteps_str'] =  this.commonArrayService.formatUSStyle(parseFloat(stepsWalks.toFixed(2)));
                                                result['progress'] = percentage;
                                                result['averagesteps'] = averageSteps;
                                                result['averagesteps_str'] = this.commonArrayService.formatUSStyle(averageSteps);
                                            }
                                        }
                                    }
                                }
                                if ((getMember['scheduleJoin'] && getMember['scheduleJoin'].in_ranking === 0) || ((teamuserid === userId) && getMember['scheduleJoin'].in_ranking === 1)) {
                                    if (!topusers[teamuserid]) {
                                        topusers[teamuserid] = Object.create(null);
                                    }
                                    topusers[teamuserid]['id'] = (getMember?.['userdetail']) ? getMember['userdetail']['id'] : getMember['user']['id'];
                                    topusers[teamuserid]['name'] = (getMember?.['userdetail']) ? getMember['userdetail']['name'] : getMember['user']['name'];
                                    topusers[teamuserid]['profile_image'] = (getMember?.['userdetail']) ? getMember['userdetail']['profile_image'] : getMember['user']['profile_image'];
                                    topusers[teamuserid]['progress'] = percentage;
                                    topusers[teamuserid]['completedsteps'] = parseFloat(stepsWalks.toFixed(2));
                                    topusers[teamuserid]['realcompletedsteps'] = parseFloat(realStepsWalks.toFixed(2));
                                    topusers[teamuserid]['averagestep'] = averageSteps;
                                }
                            }
                            allteams['Teams'][teamId]['teamCount'] = teamCount;
                            allteams['Teams'][teamId]['completedsteps'] = parseFloat(teamCompeletedSteps.toFixed(2));
                            allteams['Teams'][teamId]['realcompetedsteps'] = parseFloat(teamRealSteps.toFixed(2));
                            allteams['Teams'][teamId]['dailysteps'] = DailyStepsForAll;
                            allteams['Teams'][teamId]['totalStepsTeam'] = DailyStepsForTeam * totaldays;
                            allteams['Teams'][teamId]['totaldailysteps'] = DailyStepsForTeam * totaldays;
                            
                            if(allteams['Teams'][teamId]['teamMember']){
                                if(schedule.in_ranking == 1 && myTeamID == teamId){
                                    allteams['Teams'][teamId]['teamMember'] = allteams['Teams'][teamId]['teamMember'].filter(ele => ele?.scheduleJoin?.id == schedule.id);
                                }else{
                                    allteams['Teams'][teamId]['teamMember'] = allteams['Teams'][teamId]['teamMember'].filter(ele => ele?.scheduleJoin?.in_ranking == 0);
                                }
                                if (schedule['sc']['rank_type'] == "average_steps") {
                                    allteams['Teams'][teamId]['teamMember'] = Object.values(allteams['Teams'][teamId]['teamMember']).sort((a, b) => b['averagestep'] - a['averagestep']);
                                } else {
                                    allteams['Teams'][teamId]['teamMember'] = Object.values(allteams['Teams'][teamId]['teamMember']).sort((a, b) => b['realcompletedsteps'] - a['realcompletedsteps']);
                                }
                            }
                            if(allUsersIdArray.includes(userId)){
                                result['myTeamDetails']['completedsteps'] = parseFloat(teamCompeletedSteps.toFixed(2));
                                result['myTeamDetails']['realcompetedsteps'] = parseFloat(teamRealSteps.toFixed(2));
                                result['myTeamDetails']['dailysteps'] = DailyStepsForAll;
                                result['myTeamDetails']['totalStepsTeam'] = DailyStepsForTeam * totaldays;
                                result['myTeamDetails']['totaldailysteps'] = DailyStepsForTeam * totaldays;
                                if(!result['myTeamDetails']['today']){
                                    result['myTeamDetails']['today'] = Object.create(null);
                                }
                                result['myTeamDetails']['today']['completedsteps'] = 0;
                                result['myTeamDetails']['today']['beyond'] = 0;
                                result['myTeamDetails']['today']['remainsteps'] = 0;
                                result['myTeamDetails']['today']['averagesteps'] = 0;
                                result['myTeamDetails']['today']['progress'] = 0;
                                if (matchStartDate <= ucurrentdate) { 
                                    result['myTeamDetails']['today']['completedsteps'] = todayTotal;
                                    if (todayTotal > todayBeyondTotal) {
                                        todayTotal = todayTotal - todayBeyondTotal;
                                    }
                                    if (todayBeyondTotal != 0) {                        
                                        result['myTeamDetails']['today']['beyond'] = parseFloat(todayBeyondTotal.toFixed(2));
                                    } else {                         
                                        result['myTeamDetails']['today']['remainsteps'] = parseFloat(todayTotalRemain.toFixed(2));     
                                    }
                                    teamTodayTotalSteps = todayTotal + todayTotalRemain;
                                    if (teamTodayTotalSteps != 0) {
                                        teamTodayProcess = parseFloat(((todayTotal * 100) / teamTodayTotalSteps).toFixed(2));
                                        if (teamsmemtoday != 0) {
                                            teamTodayTotalAverageSteps = parseFloat((todayTotal / teamsmemtoday).toFixed(2));
                                        }
                                    }       
                                    result['myTeamDetails']['today']['averagesteps'] = teamTodayTotalAverageSteps;
                                    if (teamTodayProcess >= 100) {
                                        teamTodayProcess = 100;
                                    }                  
                                    result['myTeamDetails']['today']['progress'] = teamTodayProcess;
                                }
                                result['myTeamDetails']['teamMember'] = allteams['Teams'][teamId]['teamMember'];
                            }
                            if (teamCompeletedSteps < beyondTotal) {
                                teamCompeletedSteps -= beyondTotal;
                            }
                            allteams['Teams'][teamId]['beyondtotal'] = 0;
                            if (beyondTotal !== 0) {
                                allteams['Teams'][teamId]['beyondtotal'] = parseFloat((beyondTotal).toFixed(2));
                                beyondTotal = teamCompeletedSteps - (upstotalSteps * teamsMem);
                            } else {
                                result['totalremainsteps'] = totalRemainSteps;
                                allteams['Teams'][teamId]['remainsteps'] = totalRemainSteps;
                            }
                            let teamProgress = 0;
                            let totalstepsteam = teamCompeletedSteps + totalRemainSteps;
                            allteams['Teams'][teamId]['averagesteps'] = 0;
                            let averagestepsteam = 0;
                            if (totalstepsteam !== 0) {
                                if (teamCompeletedSteps !== 0) {
                                    teamProgress = (upstotalSteps !== 0 && teamsMem !== 0) ? parseFloat(((teamCompeletedSteps * 100) / (upstotalSteps * teamsMem)).toFixed(2)) : 0;
                                    averagestepsteam = (teamsMem !== 0 && uptodays !== 0) ? Math.round((teamCompeletedSteps / teamsMem) / uptodays) : 0;
                                } else {
                                    teamProgress = parseFloat((upstotalSteps * teamsMem).toFixed(2));
                                    averagestepsteam = (uptodays !== 0) ? Math.round(teamsMem / uptodays) : 0;
                                }
                                allteams['Teams'][teamId]['averagesteps'] = averagestepsteam;
                            }
                            if(teamProgress >= 100){
                                teamProgress = 100;
                            }
                            allteams['Teams'][teamId]['progress'] = teamProgress;
                            if(allUsersIdArray.includes(userId)){
                                result['myTeamDetails']['averagesteps'] = allteams['Teams'][teamId]['averagesteps'];
                                result['myTeamDetails']['beyondtotal'] = parseFloat(allteams['Teams'][teamId]['beyondtotal'].toFixed(2));
                                result['myTeamDetails']['progress'] = allteams['Teams'][teamId]['progress'];
                                result['myTeamDetails']['remainsteps'] = allteams['Teams'][teamId]['remainsteps'];
                            }
                            if (schedule['sc']['group_status'] == 1 && groupId != 0) {
                                const groupTeamCount = allgetteams.filter(team => team.group_id === groupId).length;
                                let groupMemberCount = 0;
                                const groupMember = allgetteams.filter(team => team.group_id === groupId);
                                let groupTodayCompletedSteps = 0
                                let groupTodayBeyond = 0
                                let groupTodayRemainSteps = 0
                                let groupTodayAvarageSteps = 0
                                let groupTodayProgress = 0
                                let groupTodayMemberCount = 0
                                for (let group of groupMember) {
                                    if (group.teamMember) {
                                        groupMemberCount += group.teamMember.length;
                                    }
                                    for (let member of group.teamMember) {
                                        groupTodayMemberCount += member?.today?.completedsteps > 0 ? 1 : 0;
                                    }
                                    groupTodayCompletedSteps += group?.today?.completedsteps || 0;
                                    groupTodayBeyond += group?.today?.beyond || 0;
                                    groupTodayRemainSteps += group?.today?.remainsteps || 0;
                                    groupTodayAvarageSteps += group?.today?.averagesteps || 0;
                                    groupTodayProgress += group?.today?.progress || 0;
                                }
                                if (!allgroups['Groups']) {
                                    allgroups['Groups'] = Object.create(null);
                                }
                                if (!allgroups['Groups'][groupId]) {
                                    allgroups['Groups'][groupId] = Object.create(null);
                                }
                                if(allgroups['Groups'][groupId]['completedsteps']){
                                    groupComplatedSteps = allgroups['Groups'][groupId]['completedsteps'] + teamCompeletedSteps;
                                }else{
                                    groupComplatedSteps = teamCompeletedSteps;
                                }
                                if(allgroups['Groups'][groupId]['dailysteps']){
                                    groupDailySteps = allgroups['Groups'][groupId]['dailysteps'] + DailyStepsForTeam;
                                }else{
                                    groupDailySteps = DailyStepsForTeam;
                                }
                                if(allgroups['Groups'][groupId]['totaldailysteps']){
                                    groupDailyTotalSteps = allgroups['Groups'][groupId]['totaldailysteps'] + (DailyStepsForTeam * totaldays);
                                }else{
                                    groupDailyTotalSteps = DailyStepsForTeam * totaldays;
                                }
                                if(allgroups['Groups'][groupId]['averagestep']){
                                    groupAverageSteps = parseFloat(((allgroups['Groups'][groupId]['averagestep'] + averagestepsteam) / groupTeamCount).toFixed(2));
                                }else{
                                    groupAverageSteps = parseFloat(averagestepsteam.toFixed(2));
                                }
                                if(totalRemainSteps <= 0){
                                    if(allgroups['Groups'][groupId]['remainsteps']){
                                        groupRemainStaps = allgroups['Groups'][groupId]['remainsteps'] + beyondTotal;
                                    }else{
                                        groupRemainStaps = beyondTotal;
                                    }
                                }else{
                                    if(allgroups['Groups'][groupId]['remainsteps']){
                                        groupRemainStaps = allgroups['Groups'][groupId]['remainsteps'] + totalRemainSteps;
                                    }else{
                                        groupRemainStaps = totalRemainSteps;
                                    }
                                }
                                if(allgroups['Groups'][groupId]['progress']){
                                    groupProgress = parseFloat(((allgroups['Groups'][groupId]['progress'] + teamProgress) / groupTeamCount).toFixed(2));
                                }else{
                                    groupProgress = parseFloat(teamProgress.toFixed(2));;
                                }
                                if (!allgroups['Groups'][groupId]['today']) {
                                    allgroups['Groups'][groupId]['today'] = Object.create(null);
                                }
                                allgroups['Groups'][groupId]['today']['completedsteps'] = groupTodayCompletedSteps;
                                allgroups['Groups'][groupId]['today']['beyond'] = groupTodayBeyond;
                                allgroups['Groups'][groupId]['today']['remainsteps'] = groupTodayRemainSteps;
                                allgroups['Groups'][groupId]['today']['averagesteps'] = groupTodayAvarageSteps;
                                groupTodayProgress = groupTodayProgress / groupTodayMemberCount;
                                if (groupTodayProgress >= 100) {
                                    groupTodayProgress = 100;
                                }
                                allgroups['Groups'][groupId]['today']['progress'] = groupTodayProgress;
                                allgroups['Groups'][groupId]['completedsteps'] = parseFloat(groupComplatedSteps.toFixed(2));
                                allgroups['Groups'][groupId]['averagestep'] = groupAverageSteps;
                                allgroups['Groups'][groupId]['groupmember'] = groupMemberCount;
                                allgroups['Groups'][groupId]['dailysteps'] = groupDailySteps;
                                allgroups['Groups'][groupId]['totaldailysteps'] = groupDailyTotalSteps;
                                allgroups['Groups'][groupId]['beyond'] = groupRemainStaps;
                                allgroups['Groups'][groupId]['progress'] = groupProgress;
                                allgroups['Groups'][groupId]['group_id'] = groupId;
                                allgroups['Groups'][groupId]['name'] = getteam['challengeGroups']['name'];
                                allgroups['Groups'][groupId]['logo'] = getteam['challengeGroups']['logo'];
                                if(groupMemberCount != 0 && uptodays){
                                    allgroups['Groups'][groupId]['groupavg'] = Math.round(allgroups['Groups'][groupId]['completedsteps'] / groupMemberCount / uptodays);
                                }else{
                                    allgroups['Groups'][groupId]['groupavg']=0;
                                }
                            }
                        }
                        if(schedule['sc']['group_status'] == 1 && groupId != 0){
                            if (!allgroups['Groups']) {
                                allgroups['Groups'] = Object.create(null);
                            }
                        }
                        if (schedule['sc']['group_status'] == 1 && groupId != 0 && getteam['teamMember'] && getteam['teamMember']?.length == 0 && !allgroups['Groups'][groupId]) {
                            if (!allgroups['Groups']) {
                                allgroups['Groups'] = Object.create(null);
                            }
                            if (!allgroups['Groups'][groupId]) {
                                allgroups['Groups'][groupId] = Object.create(null);
                            }
                            if(allgroups['Groups'][groupId]['completedsteps']){
                                groupComplatedSteps = 0;
                            }else{
                                groupComplatedSteps = 0;
                            }
                            if(allgroups['Groups'][groupId]['dailysteps']){
                                groupDailySteps = 0;
                            }else{
                                groupDailySteps = 0;
                            }
                            if(allgroups['Groups'][groupId]['totaldailysteps']){
                                groupDailyTotalSteps = 0;
                            }else{
                                groupDailyTotalSteps = 0;
                            }
                            if(allgroups['Groups'][groupId]['averagestep']){
                                groupAverageSteps = 0;
                            }else{
                                groupAverageSteps = 0;
                            }
                            if(totalRemainSteps <= 0){
                                if(allgroups['Groups'][groupId]['remainsteps']){
                                    groupRemainStaps = 0;
                                }else{
                                    groupRemainStaps = 0;
                                }
                            }else{
                                if(allgroups['Groups'][groupId]['remainsteps']){
                                    groupRemainStaps = 0;
                                }else{
                                    groupRemainStaps = 0;
                                }
                            }
                            if(allgroups['Groups'][groupId]['progress']){
                                groupProgress = 0;
                            }else{
                                groupProgress = 0;
                            }
                            if (!allgroups['Groups'][groupId]['today']) {
                                allgroups['Groups'][groupId]['today'] = Object.create(null);
                            }
                            allgroups['Groups'][groupId]['today']['completedsteps'] = 0;
                            allgroups['Groups'][groupId]['today']['beyond'] = 0;
                            allgroups['Groups'][groupId]['today']['remainsteps'] = 0;
                            allgroups['Groups'][groupId]['today']['averagesteps'] = 0;
                            allgroups['Groups'][groupId]['today']['progress'] = 0;
                            allgroups['Groups'][groupId]['completedsteps'] = 0;
                            allgroups['Groups'][groupId]['averagestep'] = 0;
                            allgroups['Groups'][groupId]['dailysteps'] = 0;
                            allgroups['Groups'][groupId]['totaldailysteps'] = 0;
                            allgroups['Groups'][groupId]['beyond'] = 0;
                            allgroups['Groups'][groupId]['progress'] = 0;
                            allgroups['Groups'][groupId]['group_id'] = groupId;
                            allgroups['Groups'][groupId]['name'] = getteam['challengeGroups']['name'];
                            allgroups['Groups'][groupId]['logo'] = getteam['challengeGroups']['logo'];
                        }
                        if (schedule['sc']['group_status'] == 1 && groupId != 0) {
                            if(schedule.in_ranking == 0){
                                allgroups['Groups'][groupId]['show_group']= 1;
                            }
                            else if (schedule.in_ranking == 1 && myGroupID && myGroupID == groupId){
                                allgroups['Groups'][groupId]['show_group']= 1;
                            }
                            else{
                                allgroups['Groups'][groupId]['show_group']= 0;
                            }
                        }
                        allCompeletedSteps += teamCompeletedSteps;
                        allDailySteps += DailyStepsForAll;
                        allRemainSteps += totalRemainSteps;
                        allBeyonds += beyondTotal;
                    }
                    if(!result['leaderboard']){
                        result['leaderboard'] = Object.create(null);
                    }
                    if(topusers && Object.keys(topusers).length > 0){
                        if (schedule['sc']['rank_type'] == "average_steps") {
                            topusers = Object.values(topusers).sort((a, b) => b['averagestep'] - a['averagestep']);
                        } else {
                            topusers = Object.values(topusers).sort((a, b) => b['realcompletedsteps'] - a['realcompletedsteps']);
                        }
                    }
                    if (topusers.length >= 10) {
                        topusers = topusers.slice(0, 10);
                    }
                    if(topusers && topusers.length > 0){
                        result['toptenusers'] = topusers.filter(ele=> ele.completedsteps !=0);
                    }
                    result['leaderboard']['completedsteps'] = Math.round(allCompeletedSteps);
                    if (allCompeletedSteps > allBeyonds) {
                        allCompeletedSteps = allCompeletedSteps - allBeyonds;
                    }
                    let allTotalStepsForTeam = allCompeletedSteps + allRemainSteps;
                    let allTeamProgress = 0;
                    if (allTotalStepsForTeam != 0) {
                        allTeamProgress = parseFloat(((allCompeletedSteps * 100) / allTotalStepsForTeam).toFixed(2));
                    }
                    if (allTeamProgress >= 100) {
                        allTeamProgress = 100;
                    }    
                    result['leaderboard']['progress'] = allTeamProgress; 
                    if (allBeyonds > allRemainSteps) {               
                        result['leaderboard']['remainsteps'] = Math.round(allBeyonds);               
                        result['leaderboard']['remainbeyonds'] = "true";
                    } else {               
                        result['leaderboard']['remainsteps'] = Math.round(allRemainSteps);
                    }  
                    result['leaderboard']['dailytotalsteps'] = allDailySteps;
                    let sortedTeams = [];
                    if(allteams['Teams']){
                        if (schedule['sc']['rank_type'] == "average_steps") {
                            sortedTeams = this.teamsService.sortTeamsByOnField(allteams['Teams'],'averagesteps');
                        } else {
                            sortedTeams = this.teamsService.sortTeamsByOnField(allteams['Teams'],'completedsteps');
                        }
                    }
                    let sortedGroups = [];
                    if(allgroups['Groups']){
                        if (schedule['sc']['rank_type'] == "average_steps") {
                            sortedGroups = this.teamsService.sortTeamsByOnField(allgroups['Groups'],'averagestep');
                        } else {
                            sortedGroups = this.teamsService.sortTeamsByOnField(allgroups['Groups'],'completedsteps');
                        }
                    }
                    if(sortedGroups){
                        if (schedule['sc']['group_order'] == 0) {
                            sortedGroups = this.teamsService.sortTeamsByOnField(sortedGroups,'groupavg');
                        } else {
                            sortedGroups = this.teamsService.sortTeamsByOnField(sortedGroups,'groupmember');
                        }
                        for (let groupKey in sortedGroups) {
                            let gID = sortedGroups[groupKey]['group_id'];
                            let groupName = await this.translatorService.frontendReadTranslation(req.lang,`group_name_${schedule_id}_${gID}`, `/LC_MESSAGES/Challenge/MyChallenges/${orgid}/${schedule_id}`,`dynamic`);
                            groupName = (groupName == '' || groupName == `group_name_${schedule_id}_${gID}`) ? sortedGroups[groupKey]['name'] : groupName;
                            sortedGroups[groupKey]['name'] = groupName;
                            let icons = sortedGroups[groupKey]['logo'];
                            if (icons?.length > 2 && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: icons}))) {
                                let iconimages = icons;
                                sortedGroups[groupKey]['logo'] = S3_URL + iconimages;
                            } else {
                                sortedGroups[groupKey]['logo'] = this.commonService.getIconPath(icons,S3_URL);
                            }
                        }
                    }
                    if(sortedTeams && sortedTeams.length > 0){
                        result['allteams'] = sortedTeams;
                    }
                    if(sortedGroups && sortedGroups.length > 0){
                        result['allgroups'] = sortedGroups;
                    }
                    const invitedUser = myTeamID != '' ? await this.inviteUserService.listRecord(`invitedUser.team_id= ${myTeamID} AND invitedUser.status = 1`) : [];
                    result['Invitedusers'] = invitedUser;
                    let team_chat;
                    let companySettings = await this.companySettingsService.findOne({org_id: req.tokenUser?.org_id});
                    result['showChatOption'] = 'no';
                    if(companySettings?.chat_setting == 0){
                        team_chat = myTeamID != '' ? await this.chatService.paginateList(`chat.is_private = 0 AND chat.team_id='${myTeamID}' `,['user.profile_image','user.first_name','user.last_name','chat.read_by','chat.added_date','chat.text','chat.id','chat.user_id','user.id'], { page:1, limit:20 }) : [];
                        result['showChatOption'] = 'yes';
                    }
                    let team_array = {list:[]};
                    if (team_chat && team_chat?.list && team_chat?.list?.length > 0) {
                        const team_chats = team_chat.list;
                        await Promise.all(
                            team_chats.map(async (chatuser) => {
                                let image = '';
                                let msg_date = '';
                                if (chatuser?.user?.profile_image && chatuser?.user?.profile_image?.trim() !== '') {
                                    image = S3_URL +  `${chatuser.user.profile_image}`;
                                } else {
                                    image = S3_URL + `comn/img/avatar_0001.png`;
                                }
                                if (timezone && timezone?.trim() !== '' && timezone !== 'UTC') {
                                    let chatDate = await this.commonDateService.DateTimeFormat(chatuser?.added_date, 'YYYY-MM-DD HH:mm:ss', '', timezone);
                                    let month = moment(chatDate).format('MMM'); 
                                    let timePeriod = moment(chatDate).format('a');
                                    let dateData = moment.utc(chatDate).format('D, YYYY h:mm');
                                    month = await this.translatorService.frontendReadTranslation(req.lang,month, `/LC_MESSAGES/Common/Month`,`static`);
                                    timePeriod = await this.translatorService.frontendReadTranslation(req.lang,timePeriod, `/LC_MESSAGES/Common/Common`,`static`);
                                    msg_date = `${month} ${dateData} ${timePeriod}`;
                                } else {
                                    let chatDate = await this.commonDateService.DateTimeFormat(chatuser?.added_date, 'YYYY-MM-DD HH:mm:ss');
                                    let month = moment(chatDate).format('MMM'); 
                                    let timePeriod = moment(chatDate).format('a');
                                    let dateData = moment.utc(chatDate).format('D, YYYY h:mm');
                                    month = await this.translatorService.frontendReadTranslation(req.lang,month, `/LC_MESSAGES/Common/Month`,`static`);
                                    timePeriod = await this.translatorService.frontendReadTranslation(req.lang,timePeriod, `/LC_MESSAGES/Common/Common`,`static`);
                                    msg_date = `${month} ${dateData} ${timePeriod}`;
                                }
                                team_chat['msg_date'] = msg_date;
                                let sender = chatuser.user.id;
                                let send_to = '';
                                let chat_html = '';
                                let read_by = chatuser.read_by;
                                let read_by_array = read_by.split(',');
                                team_array['list'].push({
                                    chat_id: chatuser['id'],
                                    image: image, 
                                    name: chatuser['user']['first_name'] + ' ' + chatuser['user']['last_name'],
                                    msg_date: msg_date,
                                    text: chatuser['text'],
                                    align: (sender === userId) ? 'right' : 'left'
                                });
                                if (!read_by_array.includes(userId)) {
                                    read_by += (read_by ? ',' : '') + userId;
                                    let id = chatuser['id'];
                                    let recordDetails = await this.chatService.findOne({ id: id, status: Not(2) });
                                    await this.chatService.update({ id: id }, { read_by: read_by });
                                    this.activityLogService.create(recordDetails, {read_by: read_by}, tableConstant.CHALLENGE.TBL_CH_CHAT, user.id);
                                }
                            })
                        )
                        team_array['total'] = team_chat.total;
                        team_array['pages'] = team_chat.pages;
                        team_array['limit'] = team_chat.limit;
                        team_array['page'] = team_chat.page;
                    }
                    result['chat'] = team_array;
                }else {
                    let topusers: any = Object.create(null);
                    const membershipcode = await this.companyService.getCompanyCodeFromId(schedule['sc']['org_id']);
                    const joinUsersList = await this.scheduleChallengeJoinUsersService.listRecord(`scj.schedule_id =${schedule_id} AND user.status=1 AND user.membership_code='${membershipcode}'`);
                    let user_in_ranking = schedule.in_ranking; 
                    let companysmemtoday = 0;
                    let companysmem = 0;
                    let allStepsData: any = [];
                    let todayStepsData: any = [];
                    let stepsWalks: any = 0;
                    let realStepsWalks: any = 0;
                    let completedSteps: any = 0;
                    let realCompletedSteps: any = 0;
                    let beyondTotal = 0;
                    let totalRemainSteps = 0;
                    let todayTotal = 0;
                    let todayTotalDaily = 0;
                    let todayTotalRemain = 0;
                    let todayBeyondTotal = 0;
                    let dailyStepsForAll = 0;
                    let CompanyDailySteps = 0;
                    let tempStepYes =  Object.create(null);
                    if(joinUsersList && joinUsersList?.length > 0){
                        let allUsersIdArray = joinUsersList.map(member => member?.user_id ? member?.user_id : '');
                        const allUsersId:any = allUsersIdArray.filter(item => item !== '').join(',');
                        if(allUsersId.trim() != ''){
                            let whereFinal = `food.user_id in (${allUsersId}) AND (activityTypeId in ${findall} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${where}`;
                            allStepsData = await this.activityFeedsService.getUserActivityData(whereFinal, ['SUM(food.steps) as steps', 'food.user_id as user_id', 'food.collectionDate as collectionDate'], 'food.user_id,food.collectionDate', 'food.collectionDate');
                            if(allStepsData){
                                let temp = Object.create(null);
                                allStepsData.map(getSteps => {
                                    if(!temp[Number(getSteps.user_id)]){
                                        temp[Number(getSteps.user_id)] = 0;
                                    }
                                    temp[Number(getSteps.user_id)] += Number(getSteps.steps);
                                    const collectionDate = moment.utc(getSteps.collectionDate).format('YYYY-MM-DD');
                                    if (!tempStepYes[collectionDate]) {
                                        tempStepYes[collectionDate] = Object.create(null);
                                    }
                                    tempStepYes[collectionDate][Number(getSteps.user_id)] = Number(getSteps.steps);
                                });
                                if (Object.keys(temp)?.length > 0) {
                                    allStepsData = temp;
                                    temp = Object.create(null);
                                }
                            }
                            let whereDFinal = `food.user_id in (${allUsersId}) AND (activityTypeId in ${findall} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${whereD}`;
                            todayStepsData = await this.activityFeedsService.getUserActivityData(whereDFinal, ['SUM(food.steps) as steps', 'food.user_id as user_id'], 'food.user_id,food.collectionDate', 'food.collectionDate');
                            if(todayStepsData){
                                let temp = Object.create(null);
                                todayStepsData.map(getSteps => {
                                    temp[Number(getSteps.user_id)] = Number(getSteps.steps);
                                });
                                if (Object.keys(temp)?.length > 0) {
                                    todayStepsData = temp;
                                    temp = Object.create(null);
                                }
                            }
                            let weeks = 0; 
                            let currentweek;
                            let weeksarray = Object.create(null);
                            const scheduleDate = this.commonDateService.getTodayDate(schedule.sc.start_date).subtract(1, 'days').format('YYYY-MM-DD');
                            const compcurrentdate = this.commonDateService.getTodayDate(ucurrentdate).format('YYYY-MM-DD');
                            for (let i = 1; i < totaldays; i++) {
                                if (i === 1 || i % 7 === 0) {
                                    weeks++;
                                    weeksarray[`Week ${weeks}`] = 0;
                                }
                                let datematch = moment(scheduleDate).add(i, 'days').format('YYYY-MM-DD');
                                if (compcurrentdate === datematch) {
                                    currentweek = `Week ${weeks}`;
                                }
                                if (Object.prototype.hasOwnProperty.call(tempStepYes,datematch)) {
                                    weeksarray[`Week ${weeks}`] += Object.values(tempStepYes[datematch]).reduce((acc, value) => (acc as number) + (value as number), 0);
                                }
                            }
                            result['currentweek']= currentweek;
                            result['weekinfo'] = weeksarray;  
                            for (let getUser of joinUsersList) {
                                let percentage = 0;
                                let averageSteps = 0;
                                let todayPercentage = 0;
                                let this_user_id = getUser.user_id;
                                if (getUser['user'] && getUser['user']['profile_image'] && getUser['user']['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: getUser['user']['profile_image']}))) {
                                    getUser['user']['profile_image'] = S3_URL + getUser['user']['profile_image'];
                                }
                                else{
                                    getUser['user']['profile_image'] = S3_URL + 'comn/img/avatar_0001.png'; 
                                }
                                getUser['user']['name'] = '';
                                if (getUser['user'] && (getUser['user']['first_name'] && getUser['user']['last_name'])) {
                                    getUser['user']['name'] = getUser['user']['first_name'] + ' '+ getUser['user']['last_name'];
                                    delete(getUser['user']['first_name']);
                                    delete(getUser['user']['last_name']);
                                }

                                let dailyStepsU = 0;
                                if (schedule.sc.tr_goaltype == 2) {
                                    let dailyStepsData = await this.commitmentLevelsService.findOne({ id: getUser['trek_level_id'] });
                                    if (dailyStepsData?.['level_type'] && dailyStepsData['level_type'] == "miles") {
                                        dailyStepsData['level_value'] = dailyStepsData['level_value'] * 2112;
                                    }
                                    dailyStepsU = dailyStepsData['level_value'];
                                } else {
                                    dailyStepsU = schedule['ch']['numberofsteps'];
                                    if (schedule.sc.numberofsteps != 0 && schedule.sc.numberofsteps != "") {
                                        dailyStepsU = schedule.sc.numberofsteps;
                                    }
                                }
                                CompanyDailySteps += dailyStepsU;
                                if (Object.prototype.hasOwnProperty.call(allStepsData, this_user_id)) {
                                    stepsWalks = allStepsData[this_user_id];
                                    realStepsWalks = allStepsData[this_user_id];
                                    if (dailymaxstepscnt && dailymaxstepscnt !== "" && parseInt(dailymaxstepscnt) !== 0) {
                                        let updailymaxstepscnt = dailymaxstepscnt * uptodays;
                                        if (stepsWalks > updailymaxstepscnt) {
                                            stepsWalks = updailymaxstepscnt;
                                        }
                                        stepsWalks = parseFloat((stepsWalks).toFixed(2)?.toString()?.replace("-", "") ?? 0);
                                    }
                                    if (stepsWalks == "") {
                                        stepsWalks = 0;
                                        realStepsWalks = 0;
                                    }
                                } else {
                                    stepsWalks = 0;
                                    realStepsWalks = 0;
                                }
                                completedSteps += stepsWalks;
                                realCompletedSteps += realStepsWalks;
                                let stepsDaily: any = 0;
                                if (Object.prototype.hasOwnProperty.call(todayStepsData,this_user_id)) {
                                    stepsDaily = todayStepsData[this_user_id];
                                    if (stepsDaily && stepsDaily !== "") {
                                        companysmemtoday++;
                                    }
                                } else {
                                    stepsDaily = 0;
                                }
                                dailyStepsForAll += dailySteps;
                                let memremain = 0
                                if (stepsWalks !== "" && stepsWalks !== 0) {
                                    let remainsteps = totalSteps - stepsWalks;
                                    if (remainsteps < 0) {
                                        let rtemp = Math.abs(remainsteps);
                                        remainsteps = 0;
                                        if(userId == this_user_id){
                                            result['beyond'] = rtemp;
                                        }
                                        beyondTotal += rtemp;
                                    }
                                    if(userId == this_user_id){
                                        result['remainsteps'] = parseFloat((remainsteps).toFixed(2));
                                    }
                                    totalRemainSteps += remainsteps;
                                    companysmem++;
                                }
                                if (totalSteps !== 0) {
                                    percentage = parseFloat(((stepsWalks * 100) / totalSteps).toFixed(2));
                                    if (percentage >= 100) {
                                        percentage = 100;
                                    }
                                    averageSteps = (uptodays !== 0) ? Math.round(stepsWalks / uptodays) : 0;
                                }
                                let todayremain = 0;
                                todayTotal += stepsDaily;
                                todayTotalDaily += dailySteps;
                                todayremain = dailySteps - stepsDaily;
                                if (todayremain < 0) {
                                    let rtemp = Math.abs(todayremain);
                                    todayremain = 0;
                                    todayBeyondTotal += rtemp;
                                }
                                if (Object.prototype.hasOwnProperty.call(allStepsData,this_user_id)) {
                                    todayTotalRemain += todayremain;
                                }
                                todayPercentage = (dailySteps !== 0) ? parseFloat(((stepsDaily * 100) / dailySteps).toFixed(2)) : 0;
                                if (todayPercentage >= 100) {
                                    todayPercentage = 100;
                                }
                                if (user_in_ranking === 1) {
                                    if (userId === this_user_id) {
                                        getUser['progress'] = percentage;
                                        getUser['completedsteps'] = parseFloat(parseFloat(stepsWalks).toFixed(2));
                                        getUser['realcompletedsteps'] = parseFloat(parseFloat(realStepsWalks).toFixed(2));
                                        getUser['averagestep'] = averageSteps;
                                        getUser['in_ranking'] = getUser.in_ranking;
                                        getUser['userdetail'] = getUser['user'];
                                        delete(getUser['user']);
                                        if (!getUser['today']) {
                                            getUser['today'] = Object.create(null);
                                        }
                                        getUser['today']['totalsteps'] = 0;
                                        getUser['today']['completedsteps'] = 0;
                                        getUser['today']['beyond'] = 0;
                                        getUser['today']['remainsteps'] = 0;
                                        getUser['today']['progress'] = 0;
                                        getUser['today']['averagesteps'] = 0;
                                        if (matchStartDate <= ucurrentdate) {
                                            getUser['today']['completedsteps'] = stepsDaily;
                                            getUser['today']['totalsteps'] = todayTotalDaily;
                                            let todayremain = dailySteps - stepsDaily;
                                            if (todayremain < 0) {
                                                getUser['today']['beyond'] = todayremain;
                                                todayremain = 0;
                                            } else {
                                                getUser['today']['remainsteps'] = todayremain;
                                            }
                                            getUser['today']['progress'] = todayPercentage;
                                            let todayAverageSteps = (dailySteps !== 0) ? Math.round((stepsDaily / dailySteps) * todayTotalDaily) : 0;
                                            getUser['today']['averagesteps'] = todayAverageSteps;
                                            if (userId === this_user_id) {
                                                result['today'] = getUser['today'];
                                                result['completedsteps'] =  parseFloat(parseFloat(stepsWalks).toFixed(2));
                                                result['completedsteps_str'] =  this.commonArrayService.formatUSStyle(parseFloat(stepsWalks.toFixed(2)));
                                                result['progress'] = percentage;
                                                result['averagesteps'] = averageSteps;
                                                result['averagesteps_str'] = this.commonArrayService.formatUSStyle(averageSteps);
                                                result['remainsteps'] = averageSteps;
                                            }
                                        }
                                    }
                                } else {
                                    if (getUser && getUser.in_ranking === 0) {
                                        getUser['progress'] = percentage;
                                        getUser['completedsteps'] = parseFloat(parseFloat(stepsWalks).toFixed(2));
                                        getUser['realcompletedsteps'] = parseFloat(parseFloat(realStepsWalks).toFixed(2));
                                        getUser['averagestep'] = averageSteps;
                                        getUser['in_ranking'] = getUser.in_ranking;
                                        getUser['userdetail'] = getUser['user'];
                                        delete(getUser['user']);
                                        if (!getUser['today']) {
                                            getUser['today'] = Object.create(null);
                                        }
                                        getUser['today']['completedsteps'] = 0;
                                        getUser['today']['totalsteps'] = 0;
                                        getUser['today']['beyond'] = 0;
                                        getUser['today']['remainsteps'] = 0;
                                        getUser['today']['progress'] = 0;
                                        getUser['today']['averagesteps'] = 0; 
                                        if (matchStartDate <= ucurrentdate) {
                                            getUser['today']['completedsteps'] = stepsDaily;
                                            getUser['today']['totalsteps'] = todayTotalDaily;
                                            let todayremain = dailySteps - stepsDaily;
                                            if (todayremain < 0) {
                                                getUser['today']['beyond'] = todayremain;
                                                todayremain = 0;
                                            } else {
                                                getUser['today']['remainsteps'] = todayremain;
                                            }
                                            getUser['today']['progress'] = todayPercentage;
                                            let todayAverageSteps = (dailySteps !== 0) ? Math.round((stepsDaily / dailySteps) * todayTotalDaily) : 0;
                                            getUser['today']['averagesteps'] = todayAverageSteps;
                                            if (userId === this_user_id) {
                                                result['today'] = getUser['today'];
                                                result['completedsteps'] =  parseFloat(parseFloat(stepsWalks).toFixed(2));
                                                result['completedsteps_str'] =  this.commonArrayService.formatUSStyle(parseFloat(stepsWalks.toFixed(2)));
                                                result['progress'] = percentage;
                                                result['averagesteps'] = averageSteps;
                                                result['averagesteps_str'] = this.commonArrayService.formatUSStyle(averageSteps);
                                            }
                                        }
                                    }
                                }
                                if (!topusers[this_user_id]) {
                                    topusers[this_user_id] = Object.create(null);
                                }
                                if(getUser && !getUser['userdetail']){
                                    getUser['userdetail'] = getUser['user'];
                                    delete(getUser['user']);
                                }
                                topusers[this_user_id]['id'] = getUser['userdetail']['id'];
                                topusers[this_user_id]['name'] = getUser['userdetail']['name'];
                                topusers[this_user_id]['profile_image'] = getUser['userdetail']['profile_image'];
                                topusers[this_user_id]['progress'] = percentage;
                                topusers[this_user_id]['completedsteps'] = parseFloat(parseFloat(stepsWalks).toFixed(2));;
                                topusers[this_user_id]['realcompletedsteps'] = parseFloat(parseFloat(realStepsWalks).toFixed(2));
                                topusers[this_user_id]['averagestep'] = averageSteps;
                            }
                            if(!result['companyDetails']){
                                result['companyDetails'] = Object.create(null);
                            }
                            result['companyDetails']['completedsteps'] = completedSteps;
                            result['companyDetails']['completedsteps_str'] = this.commonArrayService.formatUSStyle(completedSteps);
                            result['companyDetails']['realsteps'] = realCompletedSteps;
                            if (completedSteps < beyondTotal) {
                                completedSteps = completedSteps - beyondTotal;
                            }
                            if (beyondTotal != 0) {
                                beyondTotal = completedSteps - (upstotalSteps * companysmem);
                                result['companyDetails']['beyondtotal'] = beyondTotal;
                            } else {
                                result['companyDetails']['remainsteps'] = totalRemainSteps;
                            }
                            result['companyDetails']['dailysteps'] = CompanyDailySteps;
                            let allProgress = 0;
                            let totalStepsCompany = completedSteps + totalRemainSteps;
                            result['companyDetails']['averagesteps'] = 0;
                            let companytarget = 0;
                            if(schedule.sc.tr_totalgoalvalue && (schedule.sc.tr_totalgoalvalue !== '' || schedule.sc.tr_totalgoalvalue !== null)){
                                if(schedule.sc.tr_totalgoaltype == "miles"){
                                    companytarget = schedule.sc.tr_totalgoalvalue  * 2112;
                                }else{
                                    companytarget = schedule.sc.tr_totalgoalvalue ;
                                }
                            }else{
                                companytarget = upstotalSteps * companysmem;
                            }
                            if (totalStepsCompany != 0) {
                                allProgress = (companytarget != 0 ) ? parseFloat(((completedSteps * 100) / companytarget).toFixed(2)) : 0;
                                let averagestepscompany = (companysmem != 0 && uptodays != 0) ? Math.round(((completedSteps / companysmem) / uptodays)) : 0;
                                result['companyDetails']['averagesteps'] = averagestepscompany;
                            }
                            if (allProgress >= 100) {
                                allProgress = 100;
                            }
                            result['companyDetails']['progress'] = allProgress;
                            if(!result['companyDetails']['today']){
                                result['companyDetails']['today'] = Object.create(null);
                            }
                            result['companyDetails']['today']['completedsteps'] = 0;
                            result['companyDetails']['today']['completedsteps_str'] = '0';
                            result['companyDetails']['today']['totalsteps'] = 0;
                            result['companyDetails']['today']['totalsteps_str'] = '0';
                            result['companyDetails']['today']['beyond'] = 0;
                            result['companyDetails']['today']['remainsteps'] = 0;
                            result['companyDetails']['today']['averagesteps'] = 0;
                            result['companyDetails']['today']['progress'] = 0;
                            let todayAllProgress = 0;
                            let todayTotalStepsAll = 0;
                            let todayAverageStepsAll = 0;
                            if (matchStartDate <= ucurrentdate) {
                                result['companyDetails']['today']['completedsteps'] = todayTotal;
                                result['companyDetails']['today']['totalsteps'] = CompanyDailySteps;
                                result['companyDetails']['today']['totalsteps_str'] = this.commonArrayService.formatUSStyle(CompanyDailySteps);
                                result['companyDetails']['today']['completedsteps_str'] = this.commonArrayService.formatUSStyle(todayTotal);
                                if (todayBeyondTotal != 0) {
                                    result['companyDetails']['today']['beyond'] = todayBeyondTotal;
                                } else {
                                    result['companyDetails']['today']['remainsteps'] = todayTotalRemain;
                                }
                                if(schedule.sc.tr_totalgoalvalue && (schedule.sc.tr_totalgoalvalue !== '' || schedule.sc.tr_totalgoalvalue !== null)){
                                    if(schedule.sc.tr_totalgoaltype == "miles"){
                                        todayTotalStepsAll = (totaldays != 0) ? (schedule.sc.tr_totalgoalvalue * 2112)/totaldays : 0;
                                    }else{
                                        todayTotalStepsAll = (totaldays != 0) ? schedule.sc.tr_totalgoalvalue/totaldays : 0;
                                    }
                                }else{
                                    todayTotalStepsAll = todayTotal + todayTotalRemain;
                                }
                                if (todayTotalStepsAll != 0) {
                                    todayAllProgress = parseFloat(((todayTotal * 100) / todayTotalStepsAll).toFixed(2));
                                    if (companysmemtoday != 0) {
                                        todayAverageStepsAll = Math.round(((todayTotal / companysmemtoday)));
                                    }
                                }
                                result['companyDetails']['today']['averagesteps'] = todayAverageStepsAll;
                                if (todayAllProgress >= 100) {
                                    todayAllProgress = 100;
                                }
                                result['companyDetails']['today']['progress'] = todayAllProgress;
                            }
                            if(topusers && Object.keys(topusers).length > 0){
                                if (schedule['sc']['rank_type'] == "average_steps") {
                                    topusers = Object.values(topusers).sort((a, b) => b['averagestep'] - a['averagestep']);
                                } else {
                                    topusers = Object.values(topusers).sort((a, b) => b['realcompletedsteps'] - a['realcompletedsteps']);
                                }
                            }
                            if (topusers.length >= 10) {
                                topusers = topusers.slice(0, 10);
                            }
                            if(topusers && topusers.length > 0){
                                result['toptenusers'] = topusers.filter(ele=> ele.completedsteps !=0);
                            }
                        }
                    }
                }
                if(show_type == 2){
                    if(result['weekinfo']){
                        delete(result['weekinfo'])
                    }
                    if(result['today']){
                        delete(result['today'])
                    }
                    if(result['toptenusers']){
                        delete(result['toptenusers'])
                    }
                    if(result['companyDetails']){
                        result['progress']=result['companyDetails']?.['progress']
                        delete(result['companyDetails'])
                    }
                    if(result['beyond']){
                        delete(result['beyond'])
                    }
                    if(result['currentweek']){
                        delete(result['currentweek'])
                    }if(result['chat']){
                        delete(result['chat'])
                    }
                    if(result['showChatOption']){
                        delete(result['showChatOption'])
                    }
                    if(result['Invitedusers']){
                        delete(result['Invitedusers'])
                    }
                    if(result['allteams']){
                        delete(result['allteams'])
                    }
                    if(result['allgroups']){
                        delete(result['allgroups'])
                    }
                    if(result['leaderboard']){
                        delete(result['leaderboard'])
                    }
                    if(result['myTeamDetails']){
                        delete(result['myTeamDetails'])
                    }
                }
                let type = schedule['sc']['rank_type'] === 'average_steps' ? 'Avg. Steps' : 'Steps';
                let groupDailySteps = {};
                if (result.allteams && result.allteams.length) {
                    let remainSteps = 0;
                    let completedsteps = 0;
                    let totalTeamMember = 0;
                    for (let team of result?.allteams) {
                        let leftText = '';
                        let rightText = '';
                        let bottomLeftText = '';
                        let teamCompleted = 0;
                        let teamBeyond = 0;
                        let teamRemaining = 0;
                        let teamTodayRemaining = 0;
                        let teamAverage = 0;
                        let teamProgress = 0;
                        let teamProgressToday = 0;
                        let teamCompletedTotal = 0;
                        if (!team['today']) {
                            team['today'] = Object.create(null);
                        }
                        if (!groupDailySteps[team.group_id]) {
                            groupDailySteps[team.group_id] = 0;
                        }
                        groupDailySteps[team.group_id] += team.totalStepsTeam;
                        team.teamMember = JSON.parse(JSON.stringify(team.teamMember));
                        team.teamMember = team.teamMember.filter(ele => schedule.in_ranking == ele?.scheduleJoin?.in_ranking);
                        for (let member of team.teamMember) {
                            if(member['today'] && member['today']['bottomLeftText']){
                                delete member['today']['bottomLeftText'];
                            }
                            teamCompletedTotal += member?.completedsteps;
                            teamCompleted += member?.today?.completedsteps;
                            teamBeyond += Math.abs(member?.today?.beyond);
                            teamRemaining += member?.completedsteps > 0 ? member?.today?.remainsteps : 0;
                            teamTodayRemaining += member?.today?.completedsteps > 0 ? member?.today?.remainsteps : 0;
                            teamAverage += member?.today?.averagesteps;
                            totalTeamMember += member?.completedsteps > 0 ? 1 : 0;
                            teamProgress += member.progress
                            teamProgressToday += member?.today?.progress;
                            if (member?.completedsteps || member?.completedsteps == 0) {
                                let translate = await this.translatorService.frontendReadTranslation(req.lang, `Steps Completed`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                                let leftText = Math.abs(member?.completedsteps || 0).toLocaleString() + ` ${translate}`;
                                member['leftText']= leftText;
                            }
                            if (member?.progress || member?.progress == 0) {
                                let translate = await this.translatorService.frontendReadTranslation(req.lang, `Completed`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                                let rightText = Math.abs(member?.progress || 0).toLocaleString() + `% ${translate}`;
                                member['rightText']= rightText;
                            }
                            if (member?.today?.completedsteps || member?.today?.completedsteps == 0) {
                                let translate = await this.translatorService.frontendReadTranslation(req.lang, `Steps Completed`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                                let leftText = Math.abs(member?.today?.completedsteps || 0).toLocaleString() + ` ${translate}`;
                                member['today']['leftText']= leftText;
                            }
                            if (member?.today?.progress || member?.today?.progress == 0) {
                                let translate = await this.translatorService.frontendReadTranslation(req.lang, `Completed`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                                let rightText = Math.abs(member?.today?.progress || 0).toLocaleString() + `% ${translate}`;
                                member['today']['rightText']= rightText;
                            }
                        }
                        if (teamCompleted) {
                            team['today']['completedsteps'] = teamCompleted;
                        }
                        if (teamBeyond) {
                            team['today']['beyond'] = teamBeyond;
                        }
                        if (teamRemaining) {
                            team['today']['remainsteps'] = teamTodayRemaining;
                        }
                        if (teamAverage) {
                            team['today']['averagesteps'] = teamAverage;
                        }
                        {
                            let translate = await this.translatorService.frontendReadTranslation(req.lang, `Steps Completed`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            let translate1 = await this.translatorService.frontendReadTranslation(req.lang, `Steps Beyond The Goal`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            let translate2 = await this.translatorService.frontendReadTranslation(req.lang, type.includes('Avg.') ? `Avg. Daily Steps Required` : `Daily Steps Required`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            let translate4 = await this.translatorService.frontendReadTranslation(req.lang, `Avg. Daily Steps`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            let leftText = Math.abs(0).toLocaleString() + ' / ' + Math.abs(0).toLocaleString() + ` ${translate}`;
                            team['leftText']= leftText;
                            let rightText = Math.abs(0).toLocaleString() + ` ${translate1}`;
                            team['rightText']= rightText;
                            team['today']['leftText'] = (0).toLocaleString() + ` ${translate}`;
                            bottomLeftText = Math.abs(0).toLocaleString() + ` ${translate4}`;
                            team['bottomLeftText']= bottomLeftText;
                            let bottomRightText = Math.abs(0).toLocaleString() + ` ${translate2}`;
                            team['bottomRightText'] = bottomRightText;
                            team['today']['bottomRightText'] = bottomRightText;
                            team['today']['rightText']= Math.abs(0).toLocaleString() + ` ${translate}`;
                            if(!team.progress ) {
                                team.progress = 0;
                            }
                        }
                        if (team?.completedsteps || team?.completedsteps == 0) {
                            let translate = await this.translatorService.frontendReadTranslation(req.lang, `Steps Completed`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            leftText = Math.abs(team?.completedsteps || 0).toLocaleString() + ' / ' + Math.abs(team.totalStepsTeam).toLocaleString() + ` ${translate}`;
                            completedsteps += Math.abs(team?.completedsteps || 0);
                            team['leftText'] = leftText;
                        }
                        if (team?.beyondtotal && team?.beyondtotal !== '' && team?.beyondtotal >= 0) {
                            let translate = await this.translatorService.frontendReadTranslation(req.lang, `Steps Beyond The Goal`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            rightText = Math.abs(team?.beyondtotal || 0).toLocaleString() + ` ${translate}`;
                            team['rightText'] = rightText;
                        } else {
                            let translate = await this.translatorService.frontendReadTranslation(req.lang, `More ${type} To Goal`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            rightText = Math.abs((team.totalStepsTeam - team.teamMember.reduce((acc, item) => acc + item.completedsteps, 0)) ? (team.totalStepsTeam - team.teamMember.reduce((acc, item) => acc + item.completedsteps, 0)) : team?.remainsteps || 0).toLocaleString() + ` ${translate}`;
                            remainSteps += Math.abs(team?.remainsteps || 0);
                            team['rightText'] = rightText;
                        }
                        if (team?.averagesteps || team?.averagesteps == 0) {
                            let translate = await this.translatorService.frontendReadTranslation(req.lang, `Avg. Daily Steps`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            bottomLeftText = Math.abs(team?.averagesteps || 0).toLocaleString() + ` ${translate}`;
                            team['bottomLeftText'] = bottomLeftText;
                            result.today['bottomLeftText'] = bottomLeftText;
                        }
                        let bottomRightText = '';
                        if (team?.dailysteps || team?.dailysteps == 0) {
                            let translate = await this.translatorService.frontendReadTranslation(req.lang, type.includes('Avg.') ? `Avg. Daily Steps Required` : `Daily Steps Required`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            bottomRightText = Math.abs(team?.dailysteps || 0).toLocaleString() + ` ${translate}`;
                            team['bottomRightText'] = bottomRightText;
                            team['today']['bottomRightText'] = bottomRightText;
                        }
                        if (team?.totaldailysteps || team?.totaldailysteps == 0) {
                            let translate = await this.translatorService.frontendReadTranslation(req.lang, `Total Steps Required`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            team['totalStepsText'] = (team?.totaldailysteps).toLocaleString() + ` ${translate}`;
                        }
                        if (teamCompleted || teamCompleted == 0) {
                            let translate = await this.translatorService.frontendReadTranslation(req.lang, `Steps Completed`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            team['today']['leftText'] = (teamCompleted).toLocaleString() + ` ${translate}`;
                        }
                        if (teamBeyond && teamBeyond >= 0) {
                            let translate = await this.translatorService.frontendReadTranslation(req.lang, `Steps Beyond The Goal`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            rightText = Math.abs(teamBeyond || 0).toLocaleString() + ` ${translate}`;
                            team['today']['rightText'] = rightText;
                        } else {
                            let translate = await this.translatorService.frontendReadTranslation(req.lang, `More ${type} To Goal`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            rightText = Math.abs(teamRemaining || 0).toLocaleString() + ` ${translate}`;
                            remainSteps += Math.abs(teamRemaining || 0);
                            team['today']['rightText'] = rightText;
                        }
                        team['today']['progress'] = ((teamCompleted * 100) / team?.dailysteps) || 0;
                        team['progress'] = schedule['sc']['rank_type'] === 'average_steps' ? (teamProgress / team.teamCount) : team.progress;
                        if (team['progress'] >= 100) {
                            team['progress'] = 100;
                        }
                        team['today']['progress'] = (teamProgressToday / team.teamCount) || 0;
                        if (team['today']['progress'] >= 100) {
                            team['today']['progress'] = 100;
                        }
                        if (!(schedule.in_ranking == 0 && team.teamMember.length == 0) || team.group_id == 0 || team.group_id != 0) {
                            if(!(schedule.in_ranking == 0 && team.teamMember.length == 0)){
                                team['show_team']= 1;
                            }
                            else{
                                team['show_team']= 0;
                            }
                        }
                    }
                    if (completedsteps || completedsteps == 0) {
                        let translate = await this.translatorService.frontendReadTranslation(req.lang, `Steps Completed`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                        result.leaderboard['rightText'] = Math.abs(completedsteps || 0).toLocaleString() + ` ${translate}`;
                    }
                    if (result.today && Object.prototype.hasOwnProperty.call(result.today, 'completedsteps')) {
                        let translate = await this.translatorService.frontendReadTranslation(req.lang, `Steps Completed`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                        result.today['rightText'] = Math.abs(completedsteps || 0).toLocaleString() + ` ${translate}`;
                    }
                    if (result?.today?.beyond && result?.today?.beyond !== 0 && result?.today?.beyond !== '' && result?.today?.beyond <= 0) {
                        let translate = await this.translatorService.frontendReadTranslation(req.lang, `Steps Beyond The Goal`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                        result.today['bottomLeftText'] = Math.abs(result?.today?.beyond || 0).toLocaleString() + ` ${translate}`;
                    }
                    else if (result?.today?.remainsteps) {
                        let translate = await this.translatorService.frontendReadTranslation(req.lang, `More ${type} To Goal`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                        result.today['bottomLeftText'] = Math.abs(result?.today?.remainsteps || 0).toLocaleString() + ` ${translate}`;
                    }
                    if (result?.beyond && result?.beyond !== 0 && result?.beyond !== '' && result?.beyond >= 0) {
                        let translate = await this.translatorService.frontendReadTranslation(req.lang, `Steps Beyond The Goal`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                        result.leaderboard['bottomLeftText'] = Math.abs(result?.beyond || 0).toLocaleString() + ` ${translate}`;
                    }
                    else if ((result?.leaderboard?.remainsteps || result?.leaderboard?.remainsteps == 0) || (result.totalremainsteps || result.totalremainsteps == 0) || (remainSteps || remainSteps == 0)) {
                        let translate = await this.translatorService.frontendReadTranslation(req.lang, `More ${type} To Goal`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                        result.leaderboard['bottomLeftText'] = Math.abs(result?.leaderboard?.remainsteps || result?.totalremainsteps || remainSteps || 0).toLocaleString() + ` ${translate}`;
                    }
                    if (totalTeamMember || totalTeamMember == 0) {
                        let translate = await this.translatorService.frontendReadTranslation(req.lang, type.includes('Avg.') ? `Avg. Daily Steps Required` : `Daily Steps Required`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                        result.leaderboard['bottomRightText'] = (totalTeamMember * (schedule?.sc?.numberofsteps || dailymaxstepscnt)).toLocaleString() + ` ${translate}`;
                    }
                    if (result.totalsteps) {
                        let translate = await this.translatorService.frontendReadTranslation(req.lang, `Total Steps Required`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                        result.leaderboard['totalStepsText'] = (result.totalsteps).toLocaleString() + ` ${translate}`;
                    }
                }
                if (result.allgroups && result.allgroups.length) {
                    let remainSteps = 0;
                    let completedsteps = 0;
                    for (let group of result?.allgroups) {
                        let leftText = '';
                        let rightText = '';
                        let bottomLeftText = '';
                        group.totaldailysteps = groupDailySteps[group.group_id];
                        if (!group.beyondtotal) {
                            if (group.completedsteps > group.totaldailysteps) {
                                group.beyondtotal = Math.abs(group.totaldailysteps - group.completedsteps);
                            }
                            else {
                                group.remainsteps = Math.abs(group.completedsteps - group.totaldailysteps);
                            }
                        }
                        if (!group['today']) {
                            group['today'] = Object.create(null);
                        }
                        if (group?.completedsteps || group?.completedsteps == 0) {
                            let translate = await this.translatorService.frontendReadTranslation(req.lang, `Steps Completed`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            leftText = Math.abs(group?.completedsteps || 0).toLocaleString() + ' / ' + Math.abs(group?.totaldailysteps).toLocaleString() + ` ${translate}`;
                            completedsteps += Math.abs(group?.completedsteps || 0);
                            group['leftText'] = leftText;
                        }
                        if (group?.today?.completedsteps || group?.today?.completedsteps == 0) {
                            let translate = await this.translatorService.frontendReadTranslation(req.lang, `Steps Completed`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            leftText = Math.abs(group?.today?.completedsteps || 0).toLocaleString() + ` ${translate}`;
                            group['today']['leftText'] = leftText;
                        }
                        if (group?.beyondtotal && group?.beyondtotal !== '' && group?.beyondtotal >= 0) {
                            let translate = await this.translatorService.frontendReadTranslation(req.lang, `Steps Beyond The Goal`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            rightText = Math.abs(group?.beyondtotal || 0).toLocaleString() + ` ${translate}`;
                            group['rightText'] = rightText;
                        } else {
                            let translate = await this.translatorService.frontendReadTranslation(req.lang, `More ${type} To Goal`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            rightText = Math.abs(group?.remainsteps || 0).toLocaleString() + ` ${translate}`;
                            remainSteps += Math.abs(group?.remainsteps || 0);
                            group['rightText'] = rightText;
                        }
                        if (group?.today?.beyond !== '' && group?.today?.beyond <= 0) {
                            let translate = await this.translatorService.frontendReadTranslation(req.lang, `Steps Beyond The Goal`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            rightText = Math.abs(group?.today?.beyond || 0).toLocaleString() + ` ${translate}`;
                            group['today']['rightText'] = rightText;
                        } else {
                            let translate = await this.translatorService.frontendReadTranslation(req.lang, `More ${type} To Goal`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            rightText = Math.abs(group?.today?.remainsteps || 0).toLocaleString() + ` ${translate}`;
                            remainSteps += Math.abs(group?.today?.remainsteps || 0);
                            group['today']['rightText'] = rightText;
                        }
                        if (group?.averagestep || group?.averagestep == 0) {
                            let translate = await this.translatorService.frontendReadTranslation(req.lang, `Avg. Daily Steps`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            bottomLeftText = Math.abs(group?.averagestep || 0).toLocaleString() + ` ${translate}`;
                            group['bottomLeftText'] = bottomLeftText;
                            result.today['bottomLeftText'] = bottomLeftText;
                        }
                        if (group?.today?.averagesteps || group?.today?.averagesteps == 0) {
                            let translate = await this.translatorService.frontendReadTranslation(req.lang, `Avg. Daily Steps`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            bottomLeftText = Math.abs(group?.today?.averagesteps || 0).toLocaleString() + ` ${translate}`;
                            group['today']['bottomLeftText'] = bottomLeftText;
                        }
                        let bottomRightText = '';
                        if (group?.dailysteps || group?.dailysteps == 0) {
                            let translate = await this.translatorService.frontendReadTranslation(req.lang, type.includes('Avg.') ? `Avg. Daily Steps Required` : `Daily Steps Required`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            bottomRightText = Math.abs(group?.dailysteps || 0).toLocaleString() + ` ${translate}`;
                            group['bottomRightText'] = bottomRightText;
                            group['today']['bottomRightText'] = bottomRightText;
                        }
                        if (group?.totaldailysteps || group?.totaldailysteps == 0) {
                            let translate = await this.translatorService.frontendReadTranslation(req.lang, `Total Steps Required`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            group['totalStepsText'] = (group?.totaldailysteps).toLocaleString() + ` ${translate}`;
                        }
                    }
                }
                return result;
            } catch (error) {
                await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
            }
        }
    /* Trek Step Challenge Code */

}