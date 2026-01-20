import { CommonDateService, CommonService } from '@common-constants';
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request } from "express";
import { lastValueFrom } from "rxjs";
import { ChatService } from "src/modules/chat/chat/chat.service";
import { CompanyService } from "src/modules/company/companies/company.service";
import { SettingsService } from "src/modules/company/settings/settings.service";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { ActivityFeedService } from "src/modules/trackers/activityfeeds/activityfeeds.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { Not } from "typeorm";
import { InviteUserService } from "../../inviteuser/inviteuser.service";
import { ScheduleChallengeJoinUsersService } from "../../schedulechallengejoinusers/schedulechallengejoinusers.service";
import { TeamsService } from "../../teams/teams.service";
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD
@Injectable()
export class MileLayoutChallengeService {
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
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        @Inject('COMMON_SERVICE')
            private commonMicroservice: ClientProxy,
        private readonly activityLogService: ActivityLogService,
    ) {}

    /* Mile Layout Challenge Code */
    async MileLayoutChallenge(schedule: any, req: Request, show_type = 1){
        try {
            let result = Object.create(null);
            let findall: any = '(17)';
            let user = Object.create(req.tokenUser);
            let orgid = schedule.sc.org_id;
            let schedule_id = schedule.sc.id;
            let ucurrentdate = schedule.challengeDetails.ucurrentdate;
            let totaldays = schedule.challengeDetails.totaldays;
            let uptodays = schedule.challengeDetails.uptodays;
            let userId = user.id;
            let timezone = user.timezone;
            let countuserwithzero = schedule.sc.countuserwithzero;
            let dailymaxstepscnt = schedule.sc.dailymaxstepscnt;
            let countstepswith = schedule.sc.countstepswith;
            let logType = " AND logType in ('Tracker','Manual')";
            if (countstepswith == 'realstep') {
                logType = " AND logType = 'Tracker'";
            }
            let is_set_weekend = schedule.sc.is_set_weekend;
            if(is_set_weekend === 1){
                logType += " AND  WEEKDAY(collectionDate) >= 0 AND WEEKDAY(collectionDate) < 5";
            }
            if (is_set_weekend === 1) {
                totaldays = 0;
                uptodays = 0;
                let nDcstart = await this.commonDateService.DateTimeFormat(schedule.sc.start_date, 'YYYY-MM-DD');
                let nDcend = await this.commonDateService.DateTimeFormat(schedule.sc.end_date, 'YYYY-MM-DD');
                while (nDcstart <= nDcend) {
                    const startDay:any = this.commonDateService.DateTimeFormat(nDcstart);
                    let dayOfWeek = startDay.isoWeekday(); //startDay.day();
                    totaldays += (dayOfWeek != 0 && dayOfWeek < 6) ? 1 : 0;   
                    if(dayOfWeek != 0 && dayOfWeek < 6 && moment.utc(nDcstart, 'YYYY-MM-DD').unix() <= moment.utc().unix()){
                        uptodays++;
                    }
                    nDcstart = startDay.add(1, 'days').format('YYYY-MM-DD');
                }
            }
            let dailySteps = 0;
            if (schedule.sc.numberofsteps != 0 && schedule.sc.numberofsteps != "") {
                dailySteps = schedule.sc.numberofsteps;
            }
            let totalSteps = (dailySteps * totaldays);   
            let upstotalSteps = (dailySteps * totaldays);
            result = {
                dailysteps: dailySteps,
                totalsteps: totalSteps,
            };
            let where = `food.collectionDate BETWEEN '${schedule.sc.start_date}' AND '${this.commonDateService.DateTimeFormat(schedule.sc.end_date,'YYYY-MM-DD')} 23:59:59' ${logType} AND food.status = 1`;
            if(is_set_weekend == 1){
                where = ` WEEKDAY(food.collectionDate) >= 0 AND WEEKDAY(food.collectionDate) < 5 AND food.collectionDate BETWEEN '${schedule.sc.start_date}' AND '${this.commonDateService.DateTimeFormat(schedule.sc.end_date,'YYYY-MM-DD')} 23:59:59' ${logType} AND food.status = 1`; 
            }
            let whereD = `DATE(food.collectionDate) = DATE('${ucurrentdate}') AND food.status = 1`;
            if(is_set_weekend == 1){
                whereD = `DATE(food.collectionDate) = DATE('${ucurrentdate}') AND  WEEKDAY(food.collectionDate) >= 0 AND WEEKDAY(food.collectionDate) < 5 AND food.status = 1`;
            }
            result['today'] = {
                completedsteps: 0,
                beyond: 0,
                remainsteps: 0,
                progress: 0,
                averagesteps: 0
            };
            let matchStartDate: any = schedule.sc.start_date;
            let myGroupID:any = '';
            let myTeamID:any = '';

            let translateMBTG = await this.translatorService.frontendReadTranslation(req.lang, `Mile Beyond The Goal`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
            let translateMsBTG = await this.translatorService.frontendReadTranslation(req.lang, `Miles Beyond The Goal`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
            let translateADM = await this.translatorService.frontendReadTranslation(req.lang, `Avg. Daily Mile`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
            let translateADMs = await this.translatorService.frontendReadTranslation(req.lang, `Avg. Daily Miles`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
            let translateTMR = await this.translatorService.frontendReadTranslation(req.lang, `Total Mile Required`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
            let translateTMsR = await this.translatorService.frontendReadTranslation(req.lang, `Total Miles Required`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
            let translateMMTG = await this.translatorService.frontendReadTranslation(req.lang, `More Mile To Goal`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
            let translateMMsTG = await this.translatorService.frontendReadTranslation(req.lang, `More Miles To Goal`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
            let translateMC = await this.translatorService.frontendReadTranslation(req.lang, `Mile Completed`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
            let translateMsC = await this.translatorService.frontendReadTranslation(req.lang, `Miles Completed`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
            let translateC = await this.translatorService.frontendReadTranslation(req.lang, `Completed`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
            let translateReq = await this.translatorService.frontendReadTranslation(req.lang, `Required`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
            let translateDMsR = await this.translatorService.frontendReadTranslation(req.lang, `Daily Miles Required`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
            let translateDMR = await this.translatorService.frontendReadTranslation(req.lang, `Daily Mile Required`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
            if(schedule['sc']['team'] == 1){
                const allgetteams:any = await this.teamsService.getAllTeams(`team.org_id = ${orgid} AND team.schedule_id = ${schedule_id}`);
                let groupId = 0;
                let teamId = 0;
                let allteams = Object.create(null);
                let allgroups = Object.create(null);
                let topusers = Object.create(null);
                let allCompeletedSteps = 0;
                let allDailySteps = 0;
                let allBeyonds = 0;
                let allRemainSteps = 0;
                let totalTeamMember = 0;
                for (let getteam of allgetteams) {
                    if(getteam['teamMember'] && getteam['teamMember']?.length > 0){
                        getteam['teamMember'] = Object.values(getteam['teamMember']).filter((item)=> item['user']);
                        getteam['teamMember'] = Object.values(getteam['teamMember']).filter((item)=> item['scheduleJoin']);
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
                            allStepsData = await this.activityFeedsService.getUserActivityData(whereFinal, ['SUM(food.distance) as steps', 'food.user_id as user_id'], 'food.user_id');
                            if(allStepsData){
                                let temp = Object.create(null);
                                allStepsData.map(getSteps => {
                                    temp[getSteps.user_id] = getSteps.steps;
                                });
                                if (Object.keys(temp)?.length > 0) {
                                    allStepsData = temp;
                                    temp = Object.create(null);
                                }
                            }
                            let whereDFinal = `food.user_id in (${allUsersId}) AND (activityTypeId in ${findall} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${whereD}`;
                            todayStepsData = await this.activityFeedsService.getUserActivityData(whereDFinal, ['SUM(food.distance) as steps', 'food.user_id as user_id'], 'food.user_id');
                            if(todayStepsData){
                                let temp = Object.create(null);
                                todayStepsData.map(getSteps => {
                                    temp[getSteps.user_id] = getSteps.steps;
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
                            getMember['user']['name'] = '';
                            if (getMember['user'] && (getMember['user']['first_name'] && getMember['user']['last_name'])) {
                                getMember['user']['name'] = getMember['user']['first_name'] + ' '+ getMember['user']['last_name'];
                                delete(getMember['user']['first_name']);
                                delete(getMember['user']['last_name']);
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
                            if(stepsWalks !== 0){                              
                                DailyStepsForTeam += dailySteps; 
                                DailyStepsForAll += dailySteps;
                            }
                            let memremain = 0
                            if (stepsWalks !== "" && stepsWalks !== 0) {
                                let remainsteps = totalSteps - stepsWalks;
                                if (remainsteps < 0) {
                                    let rtemp = Math.abs(remainsteps);
                                    if(teamuserid === userId){
                                        result['beyond'] = rtemp;
                                    }
                                    remainsteps = 0;
                                    beyondTotal += rtemp;
                                }
                                if(teamuserid === userId){
                                    result['remainsteps'] = remainsteps;
                                }
                                totalRemainSteps += remainsteps;
                                teamsMem++;
                                totalTeamMember++;
                            }
                            if (totalSteps !== 0) {
                                percentage = parseFloat(((stepsWalks * 100) / totalSteps).toFixed(2));
                                if (percentage >= 100) {
                                    percentage = 100;
                                }
                                averageSteps = (uptodays !== 0) ? parseFloat((stepsWalks / uptodays).toFixed(2)) : 0;
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
                                    if (getMember['progress'] || getMember['progress'] == 0) {
                                        let rightText = Math.abs(getMember['progress'] || 0).toLocaleString() + `% ${translateC}`;
                                        getMember['rightText'] = rightText;
                                    }
                                    getMember['completedsteps'] = parseFloat(stepsWalks.toFixed(2));
                                    let leftText = Math.abs(getMember['completedsteps'] || 0).toLocaleString() + ` ${translateMC}`;
                                    if(getMember['completedsteps'] > 1){
                                        leftText = Math.abs(getMember['completedsteps'] || 0).toLocaleString() + ` ${translateMsC}`;
                                    }
                                    getMember['leftText'] = leftText;
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
                                    getMember['today']['leftText'] = '0 '+ translateMC;
                                    getMember['today']['beyond'] = 0;
                                    getMember['today']['remainsteps'] = 0;
                                    getMember['today']['progress'] = 0;
                                    getMember['today']['rightText'] = '0 '+ translateMC;
                                    getMember['today']['averagesteps'] = 0;
                                    if (matchStartDate <= ucurrentdate) {
                                        getMember['today']['completedsteps'] = stepsdaily;
                                        let leftText = Math.abs(getMember['today']['completedsteps'] || 0).toLocaleString() + ` ${translateMC}`;
                                        if(getMember['today']['completedsteps'] > 1){
                                            let leftText = Math.abs(getMember['today']['completedsteps'] || 0).toLocaleString() + ` ${translateMsC}`;
                                        }
                                        getMember['today']['leftText'] = leftText;
                                        let todayremain = dailySteps - stepsdaily;
                                        if (todayremain < 0) {
                                            getMember['today']['beyond'] = parseFloat((todayremain).toFixed(2));
                                            todayremain = 0;
                                        } else {
                                            getMember['today']['remainsteps'] = parseFloat((todayremain).toFixed(2));
                                        }
                                        getMember['today']['progress'] = todayPercentage;
                                        if (getMember['today']['progress'] || getMember['today']['progress'] == 0) {
                                            let rightText = Math.abs(getMember['today']['progress'] || 0).toLocaleString() + `% ${translateC}`;
                                            getMember['today']['rightText'] = rightText;
                                        }
                                        let todayAverageSteps = (dailySteps !== 0) ? parseFloat(((stepsdaily / dailySteps) * todayTotalDaily).toFixed(2)) : 0;
                                        getMember['today']['averagesteps'] = todayAverageSteps;
                                        if (userId === teamuserid) {
                                            result['today'] = getMember['today'];
                                            result['totalstepscompleted'] =  parseFloat(stepsWalks.toFixed(2));
                                            result['progress'] = percentage;
                                            result['averagesteps'] = averageSteps;
                                        }
                                    }
                                }
                            } else {
                                if (getMember['scheduleJoin'] && getMember['scheduleJoin'].in_ranking === 0) {
                                    getMember['progress'] = percentage;
                                    if (getMember['progress'] || getMember['progress'] == 0) {
                                        let rightText = Math.abs(getMember['progress'] || 0).toLocaleString() + `% ${translateC}`;
                                        getMember['rightText'] = rightText;
                                    }
                                    getMember['completedsteps'] = parseFloat(stepsWalks.toFixed(2));
                                    let leftText = Math.abs(getMember['completedsteps'] || 0).toLocaleString() + ` ${translateMC}`;
                                    if(getMember['completedsteps'] > 1){
                                        leftText = Math.abs(getMember['completedsteps'] || 0).toLocaleString() + ` ${translateMsC}`;
                                    }
                                    getMember['leftText'] = leftText;
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
                                    getMember['today']['leftText'] = '0 '+ translateMC;
                                    getMember['today']['beyond'] = 0;
                                    getMember['today']['remainsteps'] = 0;
                                    getMember['today']['progress'] = 0;
                                    getMember['today']['rightText'] = '0 '+ translateMC;
                                    getMember['today']['averagesteps'] = 0; 
                                    if (matchStartDate <= ucurrentdate) {
                                        getMember['today']['completedsteps'] = stepsdaily;
                                        let leftText = Math.abs(getMember['today']['completedsteps'] || 0).toLocaleString() + ` ${translateMC}`;
                                        if(getMember['today']['completedsteps'] > 1){
                                            let leftText = Math.abs(getMember['today']['completedsteps'] || 0).toLocaleString() + ` ${translateMsC}`;
                                        }
                                        getMember['today']['leftText'] = leftText;
                                        let todayremain = dailySteps - stepsdaily;
                                        if (todayremain < 0) {
                                            getMember['today']['beyond'] = parseFloat((todayremain).toFixed(2));
                                            todayremain = 0;
                                        } else {
                                            getMember['today']['remainsteps'] = parseFloat((todayremain).toFixed(2));
                                        }
                                        getMember['today']['progress'] = todayPercentage;
                                        if (getMember['today']['progress'] || getMember['today']['progress'] == 0) {
                                            let rightText = Math.abs(getMember['today']['progress'] || 0).toLocaleString() + `% ${translateC}`;
                                            getMember['today']['rightText'] = rightText;
                                        }
                                        
                                        let todayAverageSteps = (dailySteps !== 0) ? parseFloat(((stepsdaily / dailySteps) * todayTotalDaily).toFixed(2)) : 0;
                                        getMember['today']['averagesteps'] = todayAverageSteps;
                                        if (userId === teamuserid) {
                                            result['today'] = getMember['today'];
                                            result['totalstepscompleted'] =  parseFloat(stepsWalks.toFixed(2));
                                            result['progress'] = percentage;
                                            result['averagesteps'] = averageSteps;
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
                        totalRemainSteps = (upstotalSteps * teamsMem) - teamCompeletedSteps;
                        if (totalRemainSteps < 0) {
                            let temps = totalRemainSteps;
                            temps = Math.abs(temps);
                            beyondTotal = temps;
                            temps = 0;
                            totalRemainSteps = 0;
                        }
                        allteams['Teams'][teamId]['teamCount'] = teamCount;
                        allteams['Teams'][teamId]['completedsteps'] = parseFloat(teamCompeletedSteps.toFixed(2));
                        allteams['Teams'][teamId]['leftText'] = allteams['Teams'][teamId]['completedsteps'] + ' ' + (allteams['Teams'][teamId]['completedsteps'] > 1 ? translateMsC : translateMC);
                        allteams['Teams'][teamId]['realcompetedsteps'] = parseFloat(teamRealSteps.toFixed(2));
                        allteams['Teams'][teamId]['dailysteps'] = DailyStepsForAll;
                        
                        let translate1 = schedule['sc']['rank_type'] === 'average_steps' ? (allteams['Teams'][teamId]['dailysteps'] > 1 ? translateADMs : translateADM) : (allteams['Teams'][teamId]['dailysteps'] > 1 ? translateDMsR : translateDMR);
                        let translateRequired1 = schedule['sc']['rank_type'] === 'average_steps' ? ' '+translateReq : ``;
                        let bottomRightText1 = Math.abs(allteams['Teams'][teamId]['dailysteps'] || 0).toLocaleString() + ` ${translate1}${translateRequired1}`;
                        allteams['Teams'][teamId]['bottomRightText']= bottomRightText1;
                        

                        allteams['Teams'][teamId]['totaldailysteps'] = DailyStepsForTeam * totaldays;
                        if (allteams['Teams'][teamId]['totaldailysteps']  || allteams['Teams'][teamId]['totaldailysteps'] == 0) {
                            allteams['Teams'][teamId]['totalStepsText'] = (allteams['Teams'][teamId]['totaldailysteps']).toLocaleString() + ` ${translateTMR}`;
                            if(allteams['Teams'][teamId]['totaldailysteps'] > 1){
                                allteams['Teams'][teamId]['totalStepsText'] = (allteams['Teams'][teamId]['totaldailysteps']).toLocaleString() + ` ${translateTMsR}`;
                            }   
                        }
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

                        if(!allteams['Teams'][teamId]['today']){
                            allteams['Teams'][teamId]['today'] = Object.create(null);
                        }
                        allteams['Teams'][teamId]['today']['completedsteps'] = 0;
                        allteams['Teams'][teamId]['today']['leftText'] = '0 '+ translateMC;
                        allteams['Teams'][teamId]['today']['beyond'] = 0;
                        allteams['Teams'][teamId]['today']['remainsteps'] = 0;
                        allteams['Teams'][teamId]['today']['averagesteps'] = 0;
                        allteams['Teams'][teamId]['today']['bottomLeftText'] = '0 '+ translateADM;
                        allteams['Teams'][teamId]['today']['progress'] = 0;
                        allteams['Teams'][teamId]['today']['bottomRightText']= bottomRightText1;

                        if(!result['myTeamDetails']['today']){
                            result['myTeamDetails']['today'] = Object.create(null);
                        }
                        result['myTeamDetails']['today']['completedsteps'] = 0;
                        result['myTeamDetails']['today']['leftText'] = '0 '+ translateMC;
                        result['myTeamDetails']['today']['beyond'] = 0;
                        result['myTeamDetails']['today']['remainsteps'] = 0;
                        result['myTeamDetails']['today']['averagesteps'] = 0;
                        result['myTeamDetails']['today']['bottomLeftText'] = '0 '+ translateADM;
                        result['myTeamDetails']['today']['progress'] = 0;
                        result['myTeamDetails']['today']['rightText'] = '0 '+ translateC;

                        let translate = schedule['sc']['rank_type'] === 'average_steps' ? (DailyStepsForAll > 1 ? translateADMs : translateADM) : (DailyStepsForAll > 1 ? translateDMsR : translateDMR);
                        let translateRequired = schedule['sc']['rank_type'] === 'average_steps' ? ' '+translateReq : ``;
                        let bottomRightText = Math.abs(DailyStepsForAll || 0).toLocaleString() + ` ${translate}${translateRequired}`;
                        if(allUsersIdArray.includes(userId)){
                            result['myTeamDetails']['completedsteps'] = parseFloat(teamCompeletedSteps.toFixed(2));
                            result['myTeamDetails']['leftText'] = result['myTeamDetails']['completedsteps'] + ' ' + (result['myTeamDetails']['completedsteps'] > 0 ? translateMsC : translateMC);
                            result['myTeamDetails']['realcompetedsteps'] = parseFloat(teamRealSteps.toFixed(2));
                            result['myTeamDetails']['dailysteps'] = DailyStepsForAll;
                            result['myTeamDetails']['bottomRightText'] = bottomRightText;
                            result['myTeamDetails']['totaldailysteps'] = DailyStepsForTeam * totaldays;
                            result['myTeamDetails']['totalStepsText'] = (DailyStepsForTeam * totaldays).toLocaleString('en-US') + ` ` + (DailyStepsForTeam * totaldays > 1 ? translateTMsR : translateTMR);

                            result['myTeamDetails']['today']['completedsteps'] = parseFloat(todayTotal.toFixed(2));
                            result['myTeamDetails']['today']['leftText'] = result['myTeamDetails']['today']['completedsteps']+ ' ' + (result['myTeamDetails']['today']['completedsteps'] > 1 ? translateMsC : translateMC);
                            result['myTeamDetails']['today']['bottomRightText'] = bottomRightText;
                        }
                        if (matchStartDate <= ucurrentdate) { 
                            allteams['Teams'][teamId]['today']['completedsteps'] = parseFloat(todayTotal.toFixed(2));
                            allteams['Teams'][teamId]['today']['leftText'] = allteams['Teams'][teamId]['today']['completedsteps'] + ' ' + (allteams['Teams'][teamId]['today']['completedsteps'] > 1 ? translateMsC : translateMC);
                            allteams['Teams'][teamId]['today']['bottomRightText'] = bottomRightText;
                            if (todayBeyondTotal != 0) {                        
                                allteams['Teams'][teamId]['today']['beyond'] = parseFloat(todayBeyondTotal.toFixed(2));
                                let rightText = Math.abs(allteams['Teams'][teamId]['today']['beyond'] || 0).toLocaleString() + ` ${translateMBTG}`;
                                if(allteams['Teams'][teamId]['today']['beyond'] > 1){
                                    rightText = Math.abs(allteams['Teams'][teamId]['today']['beyond'] || 0).toLocaleString() + ` ${translateMsBTG}`;
                                }
                                allteams['Teams'][teamId]['today']['rightText']= rightText;
                            } else {                         
                                allteams['Teams'][teamId]['today']['remainsteps'] = parseFloat(todayTotalRemain.toFixed(2));   
                                let rightText = Math.abs(allteams['Teams'][teamId]['today']['remainsteps'] || 0).toLocaleString() + ` ${translateMMTG}`;
                                if(allteams['Teams'][teamId]['today']['remainsteps'] > 1){
                                    rightText = Math.abs(allteams['Teams'][teamId]['today']['remainsteps'] || 0).toLocaleString() + ` ${translateMMsTG}`;
                                }
                                allteams['Teams'][teamId]['today']['rightText']= rightText;  
                            }

                            if (todayTotal > todayBeyondTotal) {
                                todayTotal = todayTotal - todayBeyondTotal;
                            }
                            teamTodayTotalSteps = todayTotal + todayTotalRemain;
                            if (teamTodayTotalSteps != 0) {
                                teamTodayProcess = parseFloat(((todayTotal * 100) / teamTodayTotalSteps).toFixed(2));
                                if (teamsmemtoday != 0) {
                                    teamTodayTotalAverageSteps = parseFloat((todayTotal / teamsmemtoday).toFixed(2));
                                }
                            } 
                            if (teamTodayProcess >= 100) {
                                teamTodayProcess = 100;
                            } 
                            
                            allteams['Teams'][teamId]['today']['averagesteps'] = teamTodayTotalAverageSteps;
                            if (teamTodayTotalAverageSteps  || teamTodayTotalAverageSteps == 0) {
                                let bottomLeftText = Math.abs(teamTodayTotalAverageSteps || 0).toLocaleString() + ` ${translateADM}`;
                                if(teamTodayTotalAverageSteps > 1){
                                    bottomLeftText = Math.abs(teamTodayTotalAverageSteps || 0).toLocaleString() + ` ${translateADMs}`;
                                }
                                allteams['Teams'][teamId]['today']['bottomLeftText'] = bottomLeftText;
                            }
                            allteams['Teams'][teamId]['today']['progress'] = teamTodayProcess;
                            if(allUsersIdArray.includes(userId)){
                                if (todayBeyondTotal != 0) {                        
                                    result['myTeamDetails']['today']['beyond'] = parseFloat(todayBeyondTotal.toFixed(2));
                                } else {                         
                                    result['myTeamDetails']['today']['remainsteps'] = parseFloat(todayTotalRemain.toFixed(2));     
                                }
                                      
                                result['myTeamDetails']['today']['averagesteps'] = teamTodayTotalAverageSteps;
                                result['myTeamDetails']['today']['bottomLeftText'] = teamTodayTotalAverageSteps+' '+(teamTodayTotalAverageSteps > 1 ? translateADMs : translateADM);
                                                 
                                result['myTeamDetails']['today']['progress'] = teamTodayProcess;
                                result['myTeamDetails']['today']['rightText'] = Math.abs(teamTodayProcess || 0).toLocaleString() + `% ${translateC}`;
                                result['myTeamDetails']['teamMember'] = allteams['Teams'][teamId]['teamMember'];
                            }
                        }
                        
                        if (schedule.in_ranking == 0) {
                            if(allteams['Teams'][teamId]['teamMember'].length == 0){
                                allteams['Teams'][teamId]['show_team'] = 0;
                            }else{
                                allteams['Teams'][teamId]['show_team'] = 1;
                            }
                        }else{
                            if(myTeamID == teamId){
                                allteams['Teams'][teamId]['show_team'] = 1;
                            }else{
                                allteams['Teams'][teamId]['show_team'] = 0;
                            }
                        }
                        
                        allteams['Teams'][teamId]['beyondtotal'] = 0;
                        if (beyondTotal !== 0) {
                            allteams['Teams'][teamId]['beyondtotal'] = parseFloat((beyondTotal).toFixed(2));
                            let rightText = Math.abs(allteams['Teams'][teamId]['beyondtotal'] || 0).toLocaleString() + ` ${translateMBTG}`;
                            if(allteams['Teams'][teamId]['beyondtotal'] > 1){
                                rightText = Math.abs(allteams['Teams'][teamId]['beyondtotal'] || 0).toLocaleString() + ` ${translateMsBTG}`;
                            }
                            allteams['Teams'][teamId]['rightText']= rightText;
                        } else {
                            result['totalremainsteps'] = totalRemainSteps;
                            allteams['Teams'][teamId]['remainsteps'] = totalRemainSteps;
                            let rightText = Math.abs(allteams['Teams'][teamId]['remainsteps'] || 0).toLocaleString() + ` ${translateMBTG}`;
                            if(allteams['Teams'][teamId]['remainsteps'] > 1){
                                rightText = Math.abs(allteams['Teams'][teamId]['remainsteps'] || 0).toLocaleString() + ` ${translateMsBTG}`;
                            }
                            allteams['Teams'][teamId]['rightText']= rightText;
                        }   
                        let teamProgress = 0;
                        let totalstepsteam = teamCompeletedSteps + totalRemainSteps;
                        allteams['Teams'][teamId]['averagesteps'] = 0;
                        allteams['Teams'][teamId]['bottomLeftText'] = '0 '+ translateADM;
                        let averagestepsteam = 0;
                        if (totalstepsteam !== 0) {
                            if (teamCompeletedSteps !== 0) {
                                teamProgress = (upstotalSteps !== 0 && teamsMem !== 0) ? parseFloat(((teamCompeletedSteps * 100) / (upstotalSteps * teamsMem)).toFixed(2)) : 0;
                                averagestepsteam = (teamsMem !== 0 && uptodays !== 0) ? parseFloat(((teamCompeletedSteps / teamsMem) / uptodays).toFixed(2)) : 0;
                            } else {
                                teamProgress = parseFloat((upstotalSteps * teamsMem).toFixed(2));
                                averagestepsteam = (uptodays !== 0) ? parseFloat((teamsMem / uptodays).toFixed(2)) : 0;
                            }
                            allteams['Teams'][teamId]['averagesteps'] = averagestepsteam;
                            if (averagestepsteam || averagestepsteam == 0) {
                                let bottomLeftText = Math.abs(averagestepsteam || 0).toLocaleString() + ` ${translateADM}`;
                                if(averagestepsteam > 1){
                                    bottomLeftText = Math.abs(averagestepsteam || 0).toLocaleString() + ` ${translateADMs}`;
                                }
                                allteams['Teams'][teamId]['bottomLeftText'] = bottomLeftText;
                            }
                        }
                        if(teamProgress >= 100){
                            teamProgress = 100;
                        }
                        allteams['Teams'][teamId]['progress'] = teamProgress;
                        if(allUsersIdArray.includes(userId)){
                            result['myTeamDetails']['averagesteps'] = allteams['Teams'][teamId]['averagesteps'];
                            result['myTeamDetails']['bottomLeftText'] = allteams['Teams'][teamId]['averagesteps'] +' '+ (allteams['Teams'][teamId]['averagesteps'] > 1 ? translateADMs : translateADM);
                            result['myTeamDetails']['beyondtotal'] = allteams['Teams'][teamId]['beyondtotal'] ? parseFloat(allteams['Teams'][teamId]['beyondtotal'].toFixed(2)) : 0;
                            result['myTeamDetails']['progress'] = allteams['Teams'][teamId]['progress'];
                            result['myTeamDetails']['rightText'] = allteams['Teams'][teamId]['progress'] + `% ${translateC}`;
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

                            if(schedule.in_ranking == 0){
                                allgroups['Groups'][groupId]['show_group']= 1;
                            }else if (schedule.in_ranking == 1 && myGroupID == groupId){
                                allgroups['Groups'][groupId]['show_group']= 1;
                            }else{
                                allgroups['Groups'][groupId]['show_group']= 0;
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
                                groupProgress = parseFloat(teamProgress.toFixed(2));
                            }
                            if (!allgroups['Groups'][groupId]['today']) {
                                allgroups['Groups'][groupId]['today'] = Object.create(null);
                            }
                            allgroups['Groups'][groupId]['today']['completedsteps'] = groupTodayCompletedSteps;
                            if (allgroups['Groups'][groupId]['today']['completedsteps'] || allgroups['Groups'][groupId]['today']['completedsteps'] == 0) {
                                let leftText = parseFloat((allgroups['Groups'][groupId]['today']['completedsteps'] || 0).toFixed(2)).toLocaleString() + ` ${translateMC}`;
                                if(allgroups['Groups'][groupId]['today']['completedsteps'] > 1){
                                    leftText = parseFloat((allgroups['Groups'][groupId]['today']['completedsteps'] || 0).toFixed(2)).toLocaleString() + ` ${translateMsC}`;
                                }
                                allgroups['Groups'][groupId]['today']['leftText']= leftText;
                            }
                            
                            allgroups['Groups'][groupId]['today']['beyond'] = groupTodayBeyond;
                            allgroups['Groups'][groupId]['today']['remainsteps'] = groupTodayRemainSteps;

                            if (allgroups['Groups'][groupId]['today']['beyond'] !== '' && allgroups['Groups'][groupId]['today']['beyond'] <= 0) {
                                let rightText = parseFloat((allgroups['Groups'][groupId]['today']['beyond'] || 0).toFixed(2)).toLocaleString() + ` ${translateMBTG}`;
                                if(allgroups['Groups'][groupId]['today']['beyond'] > 1){
                                    rightText = parseFloat((allgroups['Groups'][groupId]['today']['beyond'] || 0).toFixed(2)).toLocaleString() + ` ${translateMsBTG}`;
                                }
                                allgroups['Groups'][groupId]['today']['rightText']= rightText;
                            } else {
                                let rightText = parseFloat((allgroups['Groups'][groupId]['today']['remainsteps'] || 0).toFixed(2)).toLocaleString() + ` ${translateMMTG}`;
                                if(allgroups['Groups'][groupId]['today']['remainsteps'] > 1){
                                    rightText = parseFloat((allgroups['Groups'][groupId]['today']['remainsteps'] || 0).toFixed(2)).toLocaleString() + ` ${translateMMsTG}`;
                                }
                                allgroups['Groups'][groupId]['today']['rightText']= rightText;
                            }
                            
                            allgroups['Groups'][groupId]['today']['averagesteps'] = groupTodayAvarageSteps;
                            if (allgroups['Groups'][groupId]['today']['averagesteps']  || allgroups['Groups'][groupId]['today']['averagesteps'] == 0) {
                                let bottomLeftText = parseFloat((allgroups['Groups'][groupId]['today']['averagesteps'] || 0).toFixed(2)).toLocaleString() + ` ${translateADM}`;
                                if(allgroups['Groups'][groupId]['today']['averagesteps'] > 1){
                                    bottomLeftText = parseFloat((allgroups['Groups'][groupId]['today']['averagesteps'] || 0).toFixed(2)).toLocaleString() + ` ${translateADMs}`;
                                }
                                allgroups['Groups'][groupId]['today']['bottomLeftText']= bottomLeftText;
                            }
                            
                            groupTodayProgress = groupTodayProgress / groupTodayMemberCount;
                            if(groupTodayProgress >= 100){
                                groupTodayProgress = 100;
                            }
                            allgroups['Groups'][groupId]['today']['progress'] = groupTodayProgress;
                            allgroups['Groups'][groupId]['completedsteps'] = parseFloat(groupComplatedSteps.toFixed(2));
                            if (allgroups['Groups'][groupId]['completedsteps'] || allgroups['Groups'][groupId]['completedsteps'] == 0) {
                                let leftText = parseFloat((allgroups['Groups'][groupId]['completedsteps'] || 0).toFixed(2)).toLocaleString() + ` ${translateMC}`;
                                if(allgroups['Groups'][groupId]['completedsteps'] > 1){
                                    leftText = parseFloat((allgroups['Groups'][groupId]['completedsteps'] || 0).toFixed(2)).toLocaleString() + ` ${translateMsC}`;
                                }
                                allgroups['Groups'][groupId]['leftText']= leftText;
                            }
                            allgroups['Groups'][groupId]['averagestep'] = groupAverageSteps;

                            if (allgroups['Groups'][groupId]['averagestep']  || allgroups['Groups'][groupId]['averagestep'] == 0) {
                                let bottomLeftText = parseFloat((allgroups['Groups'][groupId]['averagestep'] || 0).toFixed(2)).toLocaleString() + ` ${translateADM}`;
                                if(allgroups['Groups'][groupId]['averagestep'] > 1){
                                    bottomLeftText = parseFloat((allgroups['Groups'][groupId]['averagestep'] || 0).toFixed(2)).toLocaleString() + ` ${translateADMs}`;
                                }
                                allgroups['Groups'][groupId]['bottomLeftText']= bottomLeftText;
                            }
                            
                            allgroups['Groups'][groupId]['dailysteps'] = groupDailySteps;
                            if (allgroups['Groups'][groupId]['dailysteps']  || allgroups['Groups'][groupId]['dailysteps'] == 0) {
                                let translate = schedule['sc']['rank_type'] === 'average_steps' ? (allgroups['Groups'][groupId]['dailysteps'] > 1 ? translateADMs : translateADM) : (allgroups['Groups'][groupId]['dailysteps'] > 1 ? translateDMsR : translateDMR);
                                let translateRequired = schedule['sc']['rank_type'] === 'average_steps' ? ' '+translateReq : ``;
                                bottomRightText = parseFloat((allgroups['Groups'][groupId]['dailysteps'] || 0).toFixed(2)).toLocaleString() + ` ${translate}${translateRequired}`;
                                allgroups['Groups'][groupId]['bottomRightText']= bottomRightText;
                                allgroups['Groups'][groupId]['today']['bottomRightText']= bottomRightText;
                            }
                            allgroups['Groups'][groupId]['totaldailysteps'] = groupDailyTotalSteps;
                            if (allgroups['Groups'][groupId]['totaldailysteps']  || allgroups['Groups'][groupId]['totaldailysteps'] == 0) {
                                allgroups['Groups'][groupId]['totalStepsText'] = (allgroups['Groups'][groupId]['totaldailysteps']).toLocaleString() + ` ${translateTMR}`;
                                if(allgroups['Groups'][groupId]['totaldailysteps'] > 1){
                                    allgroups['Groups'][groupId]['totalStepsText'] = (allgroups['Groups'][groupId]['totaldailysteps']).toLocaleString() + ` ${translateTMsR}`;
                                }
                            }
                            allgroups['Groups'][groupId]['remainsteps'] = groupRemainStaps;
                            allgroups['Groups'][groupId]['progress'] = groupProgress;
                            allgroups['Groups'][groupId]['group_id'] = groupId;
                            allgroups['Groups'][groupId]['groupmember'] = groupMemberCount;
                            allgroups['Groups'][groupId]['name'] = getteam['challengeGroups']['name'];
                            allgroups['Groups'][groupId]['logo'] = getteam['challengeGroups']['logo'];
                            if(groupMemberCount !=0 && uptodays){
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
                        let groupTodayCompletedSteps = 0
                        let groupTodayBeyond = 0
                        let groupTodayRemainSteps = 0
                        let groupTodayAvarageSteps = 0
                        let groupTodayProgress = 0
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
                        allgroups['Groups'][groupId]['today']['completedsteps'] = groupTodayCompletedSteps;
                        allgroups['Groups'][groupId]['today']['beyond'] = groupTodayBeyond;
                        allgroups['Groups'][groupId]['today']['remainsteps'] = groupTodayRemainSteps;
                        allgroups['Groups'][groupId]['today']['averagesteps'] = groupTodayAvarageSteps;
                        groupTodayProgress = 0
                        allgroups['Groups'][groupId]['today']['progress'] = groupTodayProgress;
                        allgroups['Groups'][groupId]['completedsteps'] = 0;
                        allgroups['Groups'][groupId]['averagestep'] = 0;
                        allgroups['Groups'][groupId]['dailysteps'] = 0;
                        allgroups['Groups'][groupId]['totaldailysteps'] = 0;
                        allgroups['Groups'][groupId]['remainsteps'] = 0;
                        allgroups['Groups'][groupId]['progress'] = 0;
                        allgroups['Groups'][groupId]['group_id'] = groupId;
                        allgroups['Groups'][groupId]['groupmember'] = 0;
                        allgroups['Groups'][groupId]['name'] = getteam['challengeGroups']['name'];
                        allgroups['Groups'][groupId]['logo'] = getteam['challengeGroups']['logo'];
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
                result['leaderboard']['completedsteps'] = parseFloat(allCompeletedSteps.toFixed(2));
                if (result['leaderboard']['completedsteps'] || result['leaderboard']['completedsteps'] == 0) {
                    result['leaderboard']['rightText']= Math.abs(result['leaderboard']['completedsteps'] || 0).toLocaleString() + ` ${translateMC}`;
                    if(result['leaderboard']['completedsteps'] > 1){
                        result['leaderboard']['rightText']= Math.abs(result['leaderboard']['completedsteps'] || 0).toLocaleString() + ` ${translateMsC}`;
                    }
                }
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
                    result['leaderboard']['remainsteps'] = parseFloat(allBeyonds.toFixed(2));               
                    result['leaderboard']['remainbeyonds'] = "true";
                } else {               
                    result['leaderboard']['remainsteps'] = parseFloat(allRemainSteps.toFixed(2));
                }  

                if (result?.beyond && result?.beyond !== 0 && result?.beyond !== '' && result?.beyond >= 0 && allRemainSteps <=0) {
                    result['leaderboard']['bottomLeftText'] = Math.abs(result?.beyond || 0).toLocaleString() + ` ${translateMBTG}`;
                    if(result?.beyond > 1){
                        result['leaderboard']['bottomLeftText'] = Math.abs(result?.beyond || 0).toLocaleString() + ` ${translateMsBTG}`;
                    }
                }else if ((result?.leaderboard?.remainsteps || result?.leaderboard?.remainsteps == 0) || (result.totalremainsteps || result.totalremainsteps == 0) || (allRemainSteps || allRemainSteps == 0)) {
                    let translate = await this.translatorService.frontendReadTranslation(req.lang, `More Miles To Goal`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                    result['leaderboard']['bottomLeftText'] = Math.abs(allRemainSteps || result?.totalremainsteps || result?.leaderboard?.remainsteps || 0).toLocaleString() + ` ${translate}`;
                }

                result['leaderboard']['dailytotalsteps'] = allDailySteps;

                if (result.totalsteps) {
                    result['leaderboard']['totalStepsText'] = (result.totalsteps).toLocaleString() + ` ${translateTMR}`;
                    if(result.totalsteps > 1){
                        result['leaderboard']['totalStepsText'] = (result.totalsteps).toLocaleString() + ` ${translateTMsR}`;
                    }
                }

                if (totalTeamMember  || totalTeamMember == 0) {
                    let translate = schedule['sc']['rank_type'] === 'average_steps' ? (totalTeamMember * (schedule?.sc?.numberofsteps || dailymaxstepscnt) > 1 ? translateADMs : translateADM) : (totalTeamMember * (schedule?.sc?.numberofsteps || dailymaxstepscnt) > 1 ? translateDMsR : translateDMR);
                    let translateRequired = schedule['sc']['rank_type'] === 'average_steps' ? ' '+translateReq : ``;
                    result['leaderboard']['bottomRightText'] = (totalTeamMember * (schedule?.sc?.numberofsteps || dailymaxstepscnt)).toLocaleString() + ` ${translate}${translateRequired}`;
                }

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
                                //this.activityLogService.create(recordDetails, {read_by: read_by}, tableConstant.CHALLENGE.TBL_CH_CHAT, userId);
                            }
                        })
                    )
                    team_array['total'] = team_chat.total;
                    team_array['pages'] = team_chat.pages;
                    team_array['limit'] = team_chat.limit;
                    team_array['page'] = team_chat.page;
                }
                result['chat'] = team_array;

                if (result.today &&  Object.prototype.hasOwnProperty.call(result.today, 'completedsteps')) {
                    result.today['rightText']= Math.abs(result.today.completedsteps || 0).toLocaleString() + ` ${translateMC}`;
                    if(result.today.completedsteps > 1){
                        result.today['rightText']= Math.abs(result.today.completedsteps || 0).toLocaleString() + ` ${translateMsC}`;
                    }
                }
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
                if(joinUsersList && joinUsersList?.length > 0){
                    let allUsersIdArray = joinUsersList.map(member => member?.user_id ? member?.user_id : '');
                    const allUsersId:any = allUsersIdArray.filter(item => item !== '').join(',');
                    if(allUsersId.trim() != ''){
                        let whereFinal = `food.user_id in (${allUsersId}) AND (activityTypeId in ${findall} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${where}`;
                        allStepsData = await this.activityFeedsService.getUserActivityData(whereFinal, ['SUM(food.distance) as steps', 'food.user_id as user_id'], 'food.user_id');
                        if(allStepsData){
                            let temp = Object.create(null);
                            allStepsData.map(getSteps => {
                                temp[getSteps.user_id] = getSteps.steps;
                            });
                            if (Object.keys(temp)?.length > 0) {
                                allStepsData = temp;
                                temp = Object.create(null);
                            }
                        }
                        let whereDFinal = `food.user_id in (${allUsersId}) AND (activityTypeId in ${findall} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${whereD}`;
                        todayStepsData = await this.activityFeedsService.getUserActivityData(whereDFinal, ['SUM(food.distance) as steps', 'food.user_id as user_id'], 'food.user_id');
                        if(todayStepsData){
                            let temp = Object.create(null);
                            todayStepsData.map(getSteps => {
                                temp[getSteps.user_id] = getSteps.steps;
                            });
                            if (Object.keys(temp)?.length > 0) {
                                todayStepsData = temp;
                                temp = Object.create(null);
                            }
                        }
                        for (let getUser of joinUsersList) {
                            let percentage = 0;
                            let averageSteps = 0;
                            let todayPercentage = 0;
                            let this_user_id = getUser.user_id;
                            if (getUser['user'] && getUser['user']['profile_image'] && getUser['user']['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: getUser['user']['profile_image']}))) {
                                getUser['user']['profile_image'] = S3_URL + getUser['user']['profile_image'];
                            }else{
                                getUser['user']['profile_image'] = S3_URL + 'comn/img/avatar_0001.png'; 
                            }
                            getUser['user']['name'] = '';
                            if (getUser['user'] && (getUser['user']['first_name'] && getUser['user']['last_name'])) {
                                getUser['user']['name'] = getUser['user']['first_name'] + ' '+ getUser['user']['last_name'];
                                delete(getUser['user']['first_name']);
                                delete(getUser['user']['last_name']);
                            }
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
                                if (dailymaxstepscnt && dailymaxstepscnt !== "" && parseInt(dailymaxstepscnt) !== 0) {
                                    if (stepsDaily > dailymaxstepscnt) {
                                        stepsDaily = dailymaxstepscnt;
                                    }
                                    stepsDaily = parseFloat((stepsDaily).toFixed(2)?.toString()?.replace("-", "") ?? 0);
                                    if (stepsDaily && stepsDaily !== "") {
                                        companysmemtoday++;
                                    }
                                }
                            } else {
                                stepsDaily = 0;
                            }
                            let memremain = 0
                            if (stepsWalks !== "" && stepsWalks !== 0) {
                                let remainsteps = totalSteps - stepsWalks;
                                if (remainsteps < 0) {
                                    let rtemp = Math.abs(remainsteps);
                                    remainsteps = 0;
                                    result['beyond'] = rtemp;
                                    beyondTotal += rtemp;
                                }
                                result['remainsteps'] = parseFloat(remainsteps.toFixed(2));
                                totalRemainSteps += remainsteps;
                                companysmem++;
                            }
                            if (totalSteps !== 0) {
                                percentage = parseFloat(((stepsWalks * 100) / totalSteps).toFixed(2));
                                if (percentage >= 100) {
                                    percentage = 100;
                                }
                                averageSteps = (uptodays !== 0) ? parseFloat((stepsWalks / uptodays).toFixed(2)) : 0;
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
                                    getUser['completedsteps'] = parseFloat((stepsWalks).toFixed(2));
                                    getUser['realcompletedsteps'] = parseFloat((realStepsWalks).toFixed(2));
                                    getUser['averagestep'] = averageSteps;
                                    getUser['in_ranking'] = getUser.in_ranking;
                                    getUser['userdetail'] = getUser['user'];
                                    delete(getUser['user']);
                                    if (!getUser['today']) {
                                        getUser['today'] = Object.create(null);
                                    }
                                    getUser['today']['completedsteps'] = 0;
                                    getUser['today']['beyond'] = 0;
                                    getUser['today']['remainsteps'] = 0;
                                    getUser['today']['progress'] = 0;
                                    getUser['today']['averagesteps'] = 0;
                                    if (matchStartDate <= ucurrentdate) {
                                        getUser['today']['completedsteps'] = stepsDaily;
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
                                            result['totalstepscompleted'] =  parseFloat((stepsWalks).toFixed(2));
                                            result['progress'] = percentage;
                                            result['averagesteps'] = averageSteps;
                                            result['remainsteps'] = averageSteps;
                                        }
                                    }
                                }
                            } else {
                                if (getUser && getUser.in_ranking === 0) {
                                    getUser['progress'] = percentage;
                                    getUser['completedsteps'] = parseFloat((stepsWalks).toFixed(2));
                                    getUser['realcompletedsteps'] = parseFloat((realStepsWalks).toFixed(2));
                                    getUser['averagestep'] = averageSteps;
                                    getUser['in_ranking'] = getUser.in_ranking;
                                    getUser['userdetail'] = getUser['user'];
                                    delete(getUser['user']);
                                    if (!getUser['today']) {
                                        getUser['today'] = Object.create(null);
                                    }
                                    getUser['today']['completedsteps'] = 0;
                                    getUser['today']['beyond'] = 0;
                                    getUser['today']['remainsteps'] = 0;
                                    getUser['today']['progress'] = 0;
                                    getUser['today']['averagesteps'] = 0; 
                                    if (matchStartDate <= ucurrentdate) {
                                        getUser['today']['completedsteps'] = stepsDaily;
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
                                            result['totalstepscompleted'] =  parseFloat((stepsWalks).toFixed(2));
                                            result['progress'] = percentage;
                                            result['averagesteps'] = averageSteps;
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
                            topusers[this_user_id]['completedsteps'] = parseFloat((stepsWalks).toFixed(2));;
                            topusers[this_user_id]['realcompletedsteps'] = parseFloat((realStepsWalks).toFixed(2));
                            topusers[this_user_id]['averagestep'] = averageSteps;
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

            if (show_type == 2) {
                if(schedule['sc']['team'] != 1){
                     if(result['myTeamDetails']){
                        delete(result['myTeamDetails'])
                    }
                }
                if (schedule['sc']['group_status'] == 1 && myGroupID != 0) {
                    const myGroups = result['allgroups'].find(group => group.group_id === myGroupID);
                    result['myGroupDetails'] = myGroups ? myGroups : {};
                }
                if (result['toptenusers']) {
                    delete (result['toptenusers'])
                }
                if (result['today']) {
                    delete (result['today'])
                }
                if (result['averagesteps']) {
                    delete (result['averagesteps'])
                }
                if (result['remainsteps']) {
                    delete (result['remainsteps'])
                }
                if (result['beyond']) {
                    delete (result['beyond'])
                }
                if (result['leaderboard']) {
                    delete (result['leaderboard'])
                }
                if (result['allteams']) {
                    delete (result['allteams'])
                }
                if (result['allgroups']) {
                    delete (result['allgroups'])
                }
                if (result['Invitedusers']) {
                    delete (result['Invitedusers'])
                }
                if (result['showChatOption']) {
                    delete (result['showChatOption'])
                }
                if (result['chat']) {
                    delete (result['chat'])
                }
                result['dailyMilesRequired_trans'] = await this.translatorService.frontendReadTranslation(req.lang, 'Daily Miles Required', '/LC_MESSAGES/Challenge/MyChallennges');
                result['moreMileToGoal_trans'] = await this.translatorService.frontendReadTranslation(req.lang, 'More Mile To Goal', '/LC_MESSAGES/Challenge/MyChallennges');
                result['stepsCompleted_trans'] = await this.translatorService.frontendReadTranslation(req.lang, 'Steps Completed', '/LC_MESSAGES/Challenge/MyChallennges');
            }
            return result;
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error));
        }
    }
    /* Mile Layout Challenge Code */

}