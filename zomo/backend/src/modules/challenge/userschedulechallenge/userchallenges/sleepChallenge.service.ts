import { CommonDateService, CommonService, tableConstant } from '@common-constants';
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request } from "express";
import { lastValueFrom } from "rxjs";
import { CompanyService } from "src/modules/company/companies/company.service";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { FoodFeedService } from "src/modules/trackers/foodfeeds/foodfeeds.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { ScheduleChallengeJoinUsersService } from "../../schedulechallengejoinusers/schedulechallengejoinusers.service";
import { TeamsService } from "../../teams/teams.service";
import { UserChallengeHelperService } from "../userChallengeHelper.service";
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD
@Injectable()
export class SleepChallengeService {
    constructor(
        private readonly translatorService: TranslationService,
        private readonly commonService: CommonService,
        private readonly commonDateService: CommonDateService,
        private readonly companyService: CompanyService,
        private readonly teamsService: TeamsService,
        private readonly foodFeedsService: FoodFeedService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly userChallengeHelperService: UserChallengeHelperService,
        @Inject('COMMON_SERVICE')
            private commonMicroservice: ClientProxy,
        private readonly activityLogService: ActivityLogService,
    ) {}

    async sleepChallenge(schedule: any, req: Request, show_type = 1) {
        try {
            let result = Object.create(null);
            let temp: any = Object.create(null);
            let findall: any = [];   
            let time;                               
            findall = `('19')`;     

            let user = Object.create(req.tokenUser);

            let orgid = schedule.sc.org_id;
            let schedule_id = schedule.sc.id;
            let ucurrentdate = schedule.challengeDetails.ucurrentdate;
            let totaldays = schedule.challengeDetails.totaldays;
            let uptodays = schedule.challengeDetails.uptodays;
            let dailymaxstepscnt = schedule.sc.dailymaxstepscnt;
            let numberofsteps = schedule.sc.numberofsteps;

            let dailyRequiredTimes = 0;
            if (schedule?.sc?.numberofsteps !== 0 && schedule?.sc?.numberofsteps !== "") {
                dailyRequiredTimes = (numberofsteps * 60) + dailymaxstepscnt;
            }
            if (schedule.sc.is_oz_meet_require_day === 1) {
                totaldays = schedule.sc.oz_meet_require_day;
            }

            let totalTimeRequired = dailyRequiredTimes * totaldays;
            let userId = user.id;
            let timezone = user.timezone;
            
            let sleepwhere = `food.collectionDate BETWEEN '${schedule.sc.start_date}' AND '${schedule.sc.end_date}'`;
            let sleepdata = await this.userChallengeHelperService.fetch_point_steps(tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS, ['SUM(water) as water','SUM(amount) as amount','food.collectionDate'], 'user_id', 'activityTypeId', findall, sleepwhere, userId, req, 'food.collectionDate');
            let todayDate = await this.commonDateService.DateTimeFormat(ucurrentdate, 'YYYY-MM-DD');
            let todaySleepHourLog = 0;
            let todaySleepMinuteLog = 0;

            let hourTrans = await this.translatorService.frontendReadTranslation(req.lang, 'Hr', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
            let minuteTrans = await this.translatorService.frontendReadTranslation(req.lang, 'Min', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
            if (sleepdata && sleepdata?.length > 0) {
                let updatedSleepData = await Promise.all(
                    sleepdata.map(async (w) => {
                        let collectionDate = await this.commonDateService.DateTimeFormat(w.food_collectionDate, 'YYYY-MM-DD');
                        let tmpSleepHour = w.water;
                        let tmpSleepMin = w.amount;
                        w.food_collectionDate = collectionDate;

                        let time = this.commonDateService.hour_minutes(tmpSleepHour, tmpSleepMin);

                        w.water = time.hour + ' ' + hourTrans + ' ' + time.min + ' ' + minuteTrans;
                        delete(w.amount);

                        let monthName = this.commonDateService.getTodayDate().format('MMM');
                        if(collectionDate && collectionDate != ''){
                            monthName = await this.translatorService.frontendReadTranslation(req.lang, moment(collectionDate).format('MMM'), `/LC_MESSAGES/Common/Month`,`static`);
                        }
                        w.collectionDate_Trans = collectionDate = monthName + ' ' + moment(collectionDate).format('D, YYYY');
                        return w;
                    })
                );
                sleepdata = updatedSleepData;
            }

            
            let totalMinutes = dailyRequiredTimes * totaldays;
            let totalTime = await this.commonDateService.convertMinutesToHoursAndMinutes(totalMinutes);

            result = {
                todaysleeplog: todaySleepHourLog + ' ' + hourTrans + ' ' + todaySleepMinuteLog + ' ' + minuteTrans,
                dailysleeprequired: '0 ' + hourTrans + ' 0 ' + minuteTrans,
                totalsleeprequired: totalTime.hour + ' ' + hourTrans + ' ' + totalTime.min + ' ' + minuteTrans,
                Allentries: sleepdata
            };
            if(show_type == 2){
                let totalMinutesDash = dailyRequiredTimes;
                let totalTimeDash = await this.commonDateService.convertMinutesToHoursAndMinutes(totalMinutesDash);
                if(sleepdata && sleepdata.length > 0){
                    let newSleepLog = sleepdata.sort((a, b) => moment(b.food_collectionDate).diff(moment(a.food_collectionDate))).slice(0, 7);
                
                    result = {
                        todaysleeplog: todaySleepHourLog + ' ' + hourTrans + ' ' + todaySleepMinuteLog + ' ' + minuteTrans,
                        dailysleeprequired: totalTimeDash.hour + ' ' + hourTrans + ' ' + totalTimeDash.min + ' ' + minuteTrans,
                        totalsleeprequired: totalTime.hour + ' ' + hourTrans + ' ' + totalTime.min + ' ' + minuteTrans,
                        Allentries: newSleepLog
                    };
                }
                return result
            }

            let where = `food.collectionDate BETWEEN '${schedule.sc.start_date}' AND '${this.commonDateService.DateTimeFormat(schedule.sc.end_date,'YYYY-MM-DD')} 23:59:59' AND food.status = 1`;
            let whereD = `food.collectionDate = '${this.commonDateService.DateTimeFormat(ucurrentdate,'YYYY-MM-DD')}' AND food.status = 1`;
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
                let allRealCompeletedSteps = 0;

                for (let getteam of allgetteams) {
                    if(getteam['teamMember'] && getteam['teamMember']?.length > 0){
                        getteam['teamMember'] = Object.values(getteam['teamMember']).filter((item)=> item['user']);
                        getteam['teamMember'] = Object.values(getteam['teamMember']).filter((item)=> item['scheduleJoin']);
                    }
                    let teamcreatedBy:any = 0;
                    let totalpercentage = 0;

                    groupId = getteam['group_id'];
                    teamId = getteam['id'];
                    teamcreatedBy = getteam['created_by'];

                    
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

                    

                    let sleepWalks: any = 0;
                    let realSleepsWalks = 0;
                    let beyondTotal = 0;
                    
                    let teamDailyTotalTimeRequired:any = dailyRequiredTimes * getteam['teamMember']?.length;
                    let teamTotalTimeRequired:any = (dailyRequiredTimes * getteam['teamMember']?.length) * totaldays;
                    let teamCompeletedTimes:any = 0;
                    let teamCompeletedRealTimes:any = 0;
                    let teamTotalRemainTimes:any = 0;
                    let teamTodayComplatedTimes:any = 0;
                    let teamTodayRemainsTimes:any = 0;

                    let teamTodayTotalTimes: any = 0;
                    let todayTotalDailyTimes: any = 0;

                    let teamTodayTotalAverageSteps = 0;
                    let teamTodayProcess = 0;
                    
                    let teamsmemtoday = 0;
                    let teamsMem = 0;

                    let groupComplatedTimes = 0;
                    let groupRealComplatedTimes = 0;
                    let groupDailyTimes = 0;
                    let groupDailyTotalTimes = 0;
                    let groupAverageTimes = 0;
                    let groupRemainTimes:any = 0;
                    let groupProgress:any = 0;
                    let groupTotalMembers:any = 0;
                    let allSleepsData: any = [];
                    let todaySleepsData: any = [];
                    let teamCount = 0;
                    if (!allteams['Teams']) { allteams['Teams'] = Object.create(null); }
                    if(getteam['teamMember'] && getteam['teamMember']?.length > 0){
                        if (!allteams['Teams'][teamId]) { allteams['Teams'][teamId] = Object.create(null); }
                        allteams['Teams'][teamId] = getteam;
                        allteams['Teams'][teamId]['averagestepsMin'] = 0;
                        allteams['Teams'][teamId]['competedstepsMin'] = 0;
                        let allUsersIdArray = getteam['teamMember'].map(member => member['user']?.id ? member['user']?.id : '');
                        const allUsersId:any = allUsersIdArray.filter(item => item !== '').join(',');
                        if(allUsersId.trim() != ''){
                            let whereCond =`user_id IN (${allUsersId}) AND (activityTypeId IN ${findall} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${where} `;
                            allSleepsData = await this.foodFeedsService.totalWater(whereCond,null,['SUM(water) AS water', 'SUM(amount) as amount', 'user_id'],'food.user_id');
                            
                            let temp = Object.create(null);
                            allSleepsData.map(getSleeps => {
                                time = this.commonDateService.hour_minutes(getSleeps['water'],getSleeps['amount']);
                                let hours = time['hour'];
                                let minutes = Math.round(time['min']);
                                if (!temp['completedSleepTimesStr']) {
                                    temp['completedSleepTimesStr'] = Object.create(null);
                                }
                                if (!temp['completedSleepTimesStr'][getSleeps['user_id']]) {
                                    temp['completedSleepTimesStr'][getSleeps['user_id']] = Object.create(null);
                                }
                                temp['completedSleepTimesStr'][getSleeps['user_id']] = `${hours} Hr ${minutes} Min`;
                                temp[getSleeps['user_id']] = (hours * 60) + minutes;
                            });

                            if (Object.keys(temp)?.length > 0) {
                                allSleepsData = temp;
                                temp = Object.create(null)
                            }
                            whereCond =`user_id IN (${allUsersId}) AND (activityTypeId IN ${findall} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${whereD} `;
                            todaySleepsData = await this.foodFeedsService.totalWater(whereCond,null,['SUM(water) AS water', 'SUM(amount) as amount', 'user_id'],'food.user_id');

                            temp = Object.create(null);
                            todaySleepsData.map(tSleeps => {
                                time = this.commonDateService.hour_minutes(tSleeps['water'],tSleeps['amount']);
                                let hours = time['hour'];
                                let minutes = Math.round(time['min']);
                                if (!temp['todayCompletedSleepTimesStr']) {
                                    temp['todayCompletedSleepTimesStr'] = Object.create(null);
                                }
                                if (!temp['todayCompletedSleepTimesStr'][tSleeps['user_id']]) {
                                    temp['todayCompletedSleepTimesStr'][tSleeps['user_id']] = Object.create(null);
                                }
                                temp['todayCompletedSleepTimesStr'][tSleeps['user_id']] = `${hours} Hr ${minutes} Min`;
                                temp[tSleeps['user_id']] = (hours * 60) + minutes;
                            });

                            if (Object.keys(temp)?.length > 0) {
                                todaySleepsData = temp;
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
                        let keyM = 0;
                        for (let getMember of getteam['teamMember']) {
                            let percentage = 0;
                            let averageTime = 0;

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
                            
                            if (Object.prototype.hasOwnProperty.call(allSleepsData,teamuserid)) {
                                sleepWalks = allSleepsData[teamuserid];
                                realSleepsWalks = allSleepsData[teamuserid];
                                if (dailyRequiredTimes && dailyRequiredTimes !== 0) {
                                    let updailymaxstepscnt = dailyRequiredTimes * uptodays;
                                    if (sleepWalks > updailymaxstepscnt) {
                                        sleepWalks = updailymaxstepscnt;
                                    }
                                    sleepWalks = parseInt(sleepWalks.toString().replace("-", ""));
                                }
                        
                                if (sleepWalks == "") {
                                    sleepWalks = 0;
                                    realSleepsWalks = 0;
                                }
                            } else {
                                sleepWalks = 0;
                                realSleepsWalks = 0;
                            }
                            teamCount += sleepWalks > 0 ? 1 :  1;

                            if (sleepWalks !== 0) {
                                teamCompeletedTimes += sleepWalks;
                                teamCompeletedRealTimes += realSleepsWalks;
                                
                                let remainsteps = totalTimeRequired - sleepWalks;
                                if (remainsteps < 0) {
                                    let rtemp = Math.abs(remainsteps);
                                    remainsteps = 0;
                                    beyondTotal += rtemp;
                                }
                                teamTotalRemainTimes += remainsteps;
                                teamsMem++;
                            }

                            let sleepsdaily: any = 0;
                            let sleepsrealdaily: any = 0;
                            if (Object.prototype.hasOwnProperty.call(todaySleepsData,teamuserid)) {
                                sleepsdaily = todaySleepsData[teamuserid];
                                sleepsrealdaily = todaySleepsData[teamuserid];
                                if (dailyRequiredTimes && dailyRequiredTimes !== 0) {
                                    if (sleepsdaily > dailyRequiredTimes) {
                                        sleepsdaily = dailyRequiredTimes;
                                    }
                                    sleepsdaily = parseInt(sleepsdaily.toString().replace("-", ""));
                                    sleepsrealdaily = parseInt(sleepsrealdaily.toString().replace("-", ""));
                                }
                        
                                if (sleepsdaily !== "") {
                                    teamsmemtoday++;
                                }
                            } else {
                                sleepsdaily = 0;
                                sleepsrealdaily = 0;
                            }
                            if (sleepsdaily !== 0) {
                                teamTodayComplatedTimes += sleepsdaily; 
                                let todayremain = dailyRequiredTimes - sleepsdaily;
                                if (todayremain < 0) {
                                    let rtemp = Math.abs(todayremain);
                                    todayremain = 0;
                                }
                                teamTodayRemainsTimes += todayremain;
                            }
                            
                            if (totalTimeRequired !== 0) {
                                percentage = parseFloat(((sleepWalks * 100) / totalTimeRequired).toFixed(2));
                            }
                            if (percentage >= 100) {
                                percentage = 100;
                            }
                            averageTime = (uptodays != 0) ? parseFloat((sleepWalks / uptodays).toFixed(2)) : 0;
                            totalpercentage += percentage;
                            
                            let todayPercentage = (dailyRequiredTimes !== 0) ? parseFloat(((sleepsdaily * 100) / dailyRequiredTimes).toFixed(2)) : 0;
                            if (todayPercentage >= 100) {
                                todayPercentage = 100;
                            }
                            
                            if (user_in_ranking === 1) {
                                if (userId === teamuserid) {
                                    getMember['progress'] = percentage;
                                    getMember['completedstepsMin'] = sleepWalks;
                                    getMember['averagestepMin'] = averageTime;
                                    getMember['realcompletedstepsMin'] = realSleepsWalks;
                                    getMember['completedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(sleepWalks,'string',hourTrans,minuteTrans);
                                    getMember['realcompletedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(realSleepsWalks,'string',hourTrans,minuteTrans);
                                    getMember['averagestep'] =  await this.commonDateService.convertMinutesToHoursAndMinutes(averageTime,'string',hourTrans,minuteTrans);
                                    getMember['in_ranking'] = getMember['scheduleJoin'].in_ranking;
                                    getMember['is_captain'] = getMember?.iscaptain;
                                    getMember['userdetail'] = getMember['user'];
                                    delete(getMember['user']);
                            
                                    getMember['today']['completedsteps'] = 0;
                                    getMember['today']['completedstepsMins'] = 0;
                                    getMember['today']['completedrealsteps'] = 0;
                                    getMember['today']['completedrealstepsMins'] = 0;
                                    getMember['today']['remainsteps'] = 0;
                                    getMember['today']['requiredsteps'] = 0;
                                    getMember['today']['progress'] = 0;
                                    getMember['today']['averagesteps'] = 0; 
                                    
                                    if (matchStartDate <= ucurrentdate) {
                                        getMember['today']['completedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(sleepsrealdaily,'string',hourTrans,minuteTrans);    // chnage need in FE for today total completed steps in this variable
                                        getMember['today']['completedrealsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(sleepsrealdaily,'string',hourTrans,minuteTrans);
                                        getMember['today']['completedstepsMins'] = sleepsdaily;
                                        getMember['today']['completedrealstepsMins'] = sleepsrealdaily;
                                        let todayremain = dailyRequiredTimes - sleepsdaily;
                                        getMember['today']['remainsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(todayremain,'string',hourTrans,minuteTrans);
                                        getMember['today']['requiredsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(dailyRequiredTimes,'string',hourTrans,minuteTrans);
                                        getMember['today']['progress'] = todayPercentage;
                                        let todayAverageTimes = (dailyRequiredTimes !== 0) ? Math.round((sleepsdaily * 100) / dailyRequiredTimes) : 0;
                                        getMember['today']['averagesteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(todayAverageTimes,'string',hourTrans,minuteTrans);
                                        if (userId === teamuserid) {
                                            result['todaysleeplog'] = await this.commonDateService.convertMinutesToHoursAndMinutes(sleepsdaily,'string',hourTrans,minuteTrans) != "0 Min" ?await this.commonDateService.convertMinutesToHoursAndMinutes(sleepsdaily,'string',hourTrans,minuteTrans) : '0 ' + hourTrans + ' 0 ' + minuteTrans;
                                            result['todaysleepreallog'] = await this.commonDateService.convertMinutesToHoursAndMinutes(sleepsrealdaily,'string',hourTrans,minuteTrans) != "0 Min" ?await this.commonDateService.convertMinutesToHoursAndMinutes(sleepsrealdaily,'string',hourTrans,minuteTrans) : '0 ' + hourTrans + ' 0 ' + minuteTrans;
                                            result['dailysleeprequired'] = await this.commonDateService.convertMinutesToHoursAndMinutes(dailyRequiredTimes,'string',hourTrans,minuteTrans);
                                            result['today'] = getMember['today'];
                                            result['totalstepscompleted'] =  await this.commonDateService.convertMinutesToHoursAndMinutes(sleepWalks,'string',hourTrans,minuteTrans);
                                            result['progress'] = percentage;
                                            result['averagesteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(averageTime,'string',hourTrans,minuteTrans);
                                        }
                                    }
                                }
                            } else {
                                if (getMember['scheduleJoin'] && getMember['scheduleJoin'].in_ranking === 0) {
                                    getMember['progress'] = percentage;
                                    getMember['completedstepsMin'] = sleepWalks;
                                    getMember['averagestepMin'] = averageTime;
                                    getMember['realcompletedstepsMin'] = realSleepsWalks;
                                    getMember['completedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(sleepWalks,'string',hourTrans,minuteTrans);
                                    getMember['realcompletedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(realSleepsWalks,'string',hourTrans,minuteTrans);
                                    getMember['averagestep'] = await this.commonDateService.convertMinutesToHoursAndMinutes(averageTime,'string',hourTrans,minuteTrans);
                                    getMember['in_ranking'] = getMember['scheduleJoin'].in_ranking;
                                    getMember['is_captain'] = getMember?.iscaptain; 
                                    getMember['userdetail'] = getMember['user'];
                                    delete(getMember['user']);
                                    if (!getMember['today']) {
                                        getMember['today'] = Object.create(null);
                                    }
                                    
                                    getMember['today']['completedsteps'] = 0;
                                    getMember['today']['remainsteps'] = 0;
                                    getMember['today']['completedstepsMins'] = 0;
                                    getMember['today']['completedrealsteps'] = 0;
                                    getMember['today']['completedrealstepsMins'] = 0;
                                    getMember['today']['requiredsteps'] = 0;
                                    getMember['today']['progress'] = 0;
                                    getMember['today']['averagesteps'] = 0; 
                            
                                    if (matchStartDate <= ucurrentdate) {
                                        getMember['today']['completedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(sleepsrealdaily,'string',hourTrans,minuteTrans);      // chnage need in FE for today total completed steps in this variable
                                        getMember['today']['completedrealsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(sleepsrealdaily,'string',hourTrans,minuteTrans);
                                        getMember['today']['completedstepsMins'] = sleepsdaily;
                                        getMember['today']['completedrealstepsMins'] = sleepsrealdaily;
                                        let todayremain = dailyRequiredTimes - sleepsdaily;
                                        getMember['today']['remainsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(todayremain,'string',hourTrans,minuteTrans);
                                        getMember['today']['requiredsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(dailyRequiredTimes,'string',hourTrans,minuteTrans);
                                        getMember['today']['progress'] = todayPercentage;
                                        let todayAverageTimes = (dailyRequiredTimes !== 0) ? Math.round((sleepsdaily * 100) / dailyRequiredTimes) : 0;
                                        getMember['today']['averagesteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(todayAverageTimes,'string',hourTrans,minuteTrans);
                                        if (userId === teamuserid) {
                                            result['todaysleeplog'] = await this.commonDateService.convertMinutesToHoursAndMinutes(sleepsdaily,'string',hourTrans,minuteTrans) != "0 Min" ?await this.commonDateService.convertMinutesToHoursAndMinutes(sleepsdaily,'string',hourTrans,minuteTrans) : '0 ' + hourTrans + ' 0 ' + minuteTrans;
                                            result['todaysleepreallog'] = await this.commonDateService.convertMinutesToHoursAndMinutes(sleepsrealdaily,'string',hourTrans,minuteTrans) != "0 Min" ?await this.commonDateService.convertMinutesToHoursAndMinutes(sleepsrealdaily,'string',hourTrans,minuteTrans) : '0 ' + hourTrans + ' 0 ' + minuteTrans;
                                            result['dailysleeprequired'] = await this.commonDateService.convertMinutesToHoursAndMinutes(dailyRequiredTimes,'string',hourTrans,minuteTrans);
                                            result['today'] = getMember['today'];
                                            result['totalstepscompleted'] =  await this.commonDateService.convertMinutesToHoursAndMinutes(sleepWalks,'string',hourTrans,minuteTrans);
                                            result['progress'] = percentage;
                                            result['averagesteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(averageTime,'string',hourTrans,minuteTrans);
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
                                topusers[teamuserid]['completedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(realSleepsWalks,'string',hourTrans,minuteTrans);
                                topusers[teamuserid]['realcompletedstepsMin'] = realSleepsWalks;
                                topusers[teamuserid]['realcompletedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(realSleepsWalks,'string',hourTrans,minuteTrans);
                                topusers[teamuserid]['averagestepMin'] = averageTime;
                                topusers[teamuserid]['averagestep'] = await this.commonDateService.convertMinutesToHoursAndMinutes(averageTime,'string',hourTrans,minuteTrans);
                            }

                        }
                        allteams['Teams'][teamId]['teamCount'] = teamCount;
                        allteams['Teams'][teamId]['competedstepsMin'] = teamCompeletedTimes;
                        allteams['Teams'][teamId]['completedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(teamCompeletedTimes,'string',hourTrans,minuteTrans);
                        allteams['Teams'][teamId]['realcompletedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(teamCompeletedRealTimes,'string',hourTrans,minuteTrans);
                        allteams['Teams'][teamId]['remainsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(teamTotalRemainTimes,'string',hourTrans,minuteTrans);
                        allteams['Teams'][teamId]['requiredsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(teamTotalTimeRequired,'string',hourTrans,minuteTrans);
                        allteams['Teams'][teamId]['dailysteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(teamDailyTotalTimeRequired,'string',hourTrans,minuteTrans);

                        if(allteams['Teams'][teamId]['teamMember']){
                            if (schedule['sc']['rank_type'] == "average_steps") {
                                allteams['Teams'][teamId]['teamMember'] = Object.values(allteams['Teams'][teamId]['teamMember']).sort((a, b) => b['averagestepMin'] - a['averagestepMin']);
                            } else {
                                allteams['Teams'][teamId]['teamMember'] = Object.values(allteams['Teams'][teamId]['teamMember']).sort((a, b) => b['realcompletedstepsMin'] - a['realcompletedstepsMin']);
                            }
                        }
    
                        if(allUsersIdArray.includes(userId)){
                            result['myTeamDetails']['completedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(teamCompeletedTimes,'string',hourTrans,minuteTrans);
                            result['myTeamDetails']['realcompletedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(teamCompeletedRealTimes,'string',hourTrans,minuteTrans);
                            result['myTeamDetails']['remainsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(teamTotalRemainTimes,'string',hourTrans,minuteTrans);
                            result['myTeamDetails']['requiredsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(teamTotalTimeRequired,'string',hourTrans,minuteTrans);
                            result['myTeamDetails']['dailysteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(teamDailyTotalTimeRequired,'string',hourTrans,minuteTrans);
                            if(!result['myTeamDetails']['today']){
                                result['myTeamDetails']['today'] = Object.create(null);
                            }
                            result['myTeamDetails']['today']['completedsteps'] = 0;
                            result['myTeamDetails']['today']['requiredsteps'] = 0;
                            result['myTeamDetails']['today']['remainsteps'] = 0;
                            result['myTeamDetails']['today']['averagesteps'] = 0;
                            result['myTeamDetails']['today']['progress'] = 0;
    
                            if (matchStartDate <= ucurrentdate) { 
                                result['myTeamDetails']['today']['completedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(teamTodayComplatedTimes,'string',hourTrans,minuteTrans);
                                if (teamTodayComplatedTimes > teamTodayRemainsTimes) {
                                    teamTodayComplatedTimes = teamTodayComplatedTimes - teamTodayRemainsTimes;
                                }
                                result['myTeamDetails']['today']['requiredsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(teamDailyTotalTimeRequired,'string',hourTrans,minuteTrans);
                                result['myTeamDetails']['today']['remainsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(teamTodayRemainsTimes,'string',hourTrans,minuteTrans);   

                                teamTodayTotalTimes = teamTodayComplatedTimes + teamTodayRemainsTimes;
                                if (teamTodayTotalTimes != 0) {
                                    teamTodayProcess = Math.round((teamTodayComplatedTimes * 100) / teamTodayTotalTimes);
                                    if (teamsmemtoday != 0) {
                                        teamTodayTotalAverageSteps = Math.round(((teamTodayComplatedTimes / teamsmemtoday)));
                                    }
                                }       
                                result['myTeamDetails']['today']['averagesteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(teamTodayTotalAverageSteps,'string',hourTrans,minuteTrans);
                                if (teamTodayProcess >= 100) {
                                    teamTodayProcess = 100;
                                }                  
                                result['myTeamDetails']['today']['progress'] = teamTodayProcess;
                            }
                            result['myTeamDetails']['teamMember'] = allteams['Teams'][teamId]['teamMember'];
                        }
                        if (teamCompeletedTimes < beyondTotal) {
                            teamCompeletedTimes = teamCompeletedTimes - beyondTotal;
                        }

                        let teamProgress = 0;
                        let totalstepsteam = teamCompeletedTimes + teamTotalRemainTimes;
                        let averagestepsteam = 0;
                        if (totalstepsteam !== 0) {
                            if (teamCompeletedTimes !== 0) {
                                teamProgress = (totalTimeRequired !== 0 && teamsMem !== 0) ? parseFloat(((teamCompeletedTimes * 100) / (totalTimeRequired * teamsMem)).toFixed(2)) : 0;
                                averagestepsteam = (teamsMem !== 0 && uptodays !== 0) ? (teamCompeletedTimes / teamsMem) / uptodays : 0;
                            } else {
                                teamProgress = parseFloat((totalTimeRequired * teamsMem).toFixed(2));
                                averagestepsteam = (uptodays !== 0) ? Math.round(teamsMem / uptodays) : 0;
                            }
                            allteams['Teams'][teamId]['averagestepsMin'] = averagestepsteam;
                            allteams['Teams'][teamId]['averagesteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(averagestepsteam,'string',hourTrans,minuteTrans);
                        }
                        if(teamProgress >= 100){
                            teamProgress = 100;
                        }
                        allteams['Teams'][teamId]['progress'] = teamProgress;
                        if(allUsersIdArray.includes(userId)){
                            result['myTeamDetails']['averagesteps'] = allteams['Teams'][teamId]['averagesteps'];
                            result['myTeamDetails']['progress'] = allteams['Teams'][teamId]['progress'];
                        }

                        if (schedule['sc']['group_status'] == 1 && groupId != 0) {
                            const groupTeamCount = allgetteams.filter(team => team.group_id === groupId).length;
                            let groupMemberCount = 0;
                            const groupMember = allgetteams.filter(team => team.group_id === groupId);
                            let groupTodayCompletedSteps = 0
                            let groupTodayReadCompletedSteps = 0
                            let groupTodayProgress = 0
                            let groupTodayMemberCount= 0
                            for(let group of groupMember){
                                if(group.teamMember){
                                    groupMemberCount += group.teamMember.length;
                                }
                                for(let member of group.teamMember){
                                    groupTodayMemberCount += member?.today?.completedstepsMins > 0 ? 1 :  1;
                                    groupTodayCompletedSteps += member?.today?.completedstepsMins || 0;
                                    groupTodayReadCompletedSteps += member?.today?.completedrealstepsMins || 0;
                                    groupTodayProgress += member?.today?.progress || 0;
                                }
                            }
                            if (!allgroups['Groups']) {
                                allgroups['Groups'] = Object.create(null);
                            }
                            if (!allgroups['Groups'][groupId]) {
                                allgroups['Groups'][groupId] = Object.create(null);
                            }
                            if(allgroups['Groups'][groupId]['competedstepsMin']){
                                groupComplatedTimes = allgroups['Groups'][groupId]['competedstepsMin'] + teamCompeletedTimes;
                            }else{
                                groupComplatedTimes = teamCompeletedTimes;
                            }
                            if(allgroups['Groups'][groupId]['realcompletedstepsMin']){
                                groupRealComplatedTimes = allgroups['Groups'][groupId]['realcompletedstepsMin'] + teamCompeletedRealTimes;
                            }else{
                                groupRealComplatedTimes = teamCompeletedRealTimes;
                            }
                            if(allgroups['Groups'][groupId]['dailystepsMin']){
                                groupDailyTimes = allgroups['Groups'][groupId]['dailystepsMin'] + teamDailyTotalTimeRequired;
                            }else{
                                groupDailyTimes = teamDailyTotalTimeRequired;
                            }
                            if(allgroups['Groups'][groupId]['totaldailystepsMin']){
                                groupDailyTotalTimes = allgroups['Groups'][groupId]['totaldailystepsMin'] + teamTotalTimeRequired;
                            }else{
                                groupDailyTotalTimes = teamTotalTimeRequired;
                            }
                            if(allgroups['Groups'][groupId]['averagestepMin']){
                                groupAverageTimes = parseFloat(((allgroups['Groups'][groupId]['averagestepMin'] + averagestepsteam) / groupTeamCount).toFixed(2));
                            }else{
                                groupAverageTimes = parseFloat(averagestepsteam.toFixed(2));
                            }
                            if(allgroups['Groups'][groupId]['remainstepsMin']){
                                groupRemainTimes = allgroups['Groups'][groupId]['remainstepsMin'] + teamTotalRemainTimes;
                            }else{
                                groupRemainTimes = teamTotalRemainTimes;
                            }
                            if(allgroups['Groups'][groupId]['totalMembers']){
                                groupTotalMembers = allgroups['Groups'][groupId]['totalMembers'] + getteam['teamMember']?.length;
                            }else{
                                groupTotalMembers = getteam['teamMember']?.length;
                            }
                            if(allgroups['Groups'][groupId]['progress']){
                                groupProgress = parseFloat(((allgroups['Groups'][groupId]['progress'] + teamProgress) / groupTeamCount).toFixed(2));
                            }else{
                                groupProgress = parseFloat(teamProgress.toFixed(2));;
                            }
                            if (!allgroups['Groups'][groupId]['today']) {
                                allgroups['Groups'][groupId]['today'] = Object.create(null);
                            }
                            allgroups['Groups'][groupId]['today']['completedstepsMins'] = groupTodayCompletedSteps;
                            allgroups['Groups'][groupId]['today']['completedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(groupTodayCompletedSteps,'string',hourTrans,minuteTrans);
                            allgroups['Groups'][groupId]['today']['completedrealstepsMins'] = groupTodayReadCompletedSteps;
                            allgroups['Groups'][groupId]['today']['completedrealsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(groupTodayReadCompletedSteps,'string',hourTrans,minuteTrans);

                            groupTodayProgress = groupTodayProgress / groupTodayMemberCount;
                            if(groupTodayProgress >= 100){
                                groupTodayProgress = 100;
                            }

                            allgroups['Groups'][groupId]['today']['progress'] = groupTodayProgress;

                            allgroups['Groups'][groupId]['competedstepsMin'] = groupComplatedTimes;
                            allgroups['Groups'][groupId]['realcompletedstepsMin'] = groupRealComplatedTimes;
                            allgroups['Groups'][groupId]['completedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(groupComplatedTimes,'string',hourTrans,minuteTrans);
                            allgroups['Groups'][groupId]['realcompletedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(groupRealComplatedTimes,'string',hourTrans,minuteTrans);
                            allgroups['Groups'][groupId]['averagestepMin'] = groupAverageTimes;
                            allgroups['Groups'][groupId]['averagestep'] = await this.commonDateService.convertMinutesToHoursAndMinutes(groupAverageTimes,'string',hourTrans,minuteTrans);
                            allgroups['Groups'][groupId]['dailystepsMin'] = groupDailyTimes;
                            allgroups['Groups'][groupId]['dailysteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(groupDailyTimes,'string',hourTrans,minuteTrans);
                            allgroups['Groups'][groupId]['totaldailystepsMin'] = groupDailyTotalTimes;
                            allgroups['Groups'][groupId]['totaldailysteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(groupDailyTotalTimes,'string',hourTrans,minuteTrans);
                            allgroups['Groups'][groupId]['remainstepsMin'] = groupRemainTimes;
                            allgroups['Groups'][groupId]['remainsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(groupRemainTimes,'string',hourTrans,minuteTrans);
                            allgroups['Groups'][groupId]['progress'] = groupProgress;
                            allgroups['Groups'][groupId]['group_id'] = groupId;
                            allgroups['Groups'][groupId]['totalMembers'] = groupTotalMembers;
                            allgroups['Groups'][groupId]['name'] = getteam['challengeGroups']['name'];
                            allgroups['Groups'][groupId]['logo'] = getteam['challengeGroups']['logo'];
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
                            if(allgroups['Groups'][groupId]['competedstepsMin']){
                                groupComplatedTimes = 0;
                            }else{
                                groupComplatedTimes = 0;
                            }
                            if(allgroups['Groups'][groupId]['realcompletedstepsMin']){
                                groupRealComplatedTimes = 0;
                            }else{
                                groupRealComplatedTimes = teamCompeletedRealTimes;
                            }
                            if(allgroups['Groups'][groupId]['dailystepsMin']){
                                groupDailyTimes = 0;
                            }else{
                                groupDailyTimes = 0;
                            }
                            if(allgroups['Groups'][groupId]['totaldailystepsMin']){
                                groupDailyTotalTimes = 0;
                            }else{
                                groupDailyTotalTimes = 0;
                            }
                            if(allgroups['Groups'][groupId]['averagestepMin']){
                                groupAverageTimes = 0;
                            }else{
                                groupAverageTimes = 0;
                            }
                            if(allgroups['Groups'][groupId]['remainstepsMin']){
                                groupRemainTimes = 0;
                            }else{
                                groupRemainTimes = 0;
                            }
                            if(allgroups['Groups'][groupId]['totalMembers']){
                                groupTotalMembers = 0;
                            }else{
                                groupTotalMembers = 0;
                            }
                            if(allgroups['Groups'][groupId]['progress']){
                                groupProgress = 0;
                            }else{
                                groupProgress = 0;
                            }
                            if (!allgroups['Groups'][groupId]['today']) {
                                allgroups['Groups'][groupId]['today'] = Object.create(null);
                            }
                            allgroups['Groups'][groupId]['today']['completedstepsMins'] = 0;
                            allgroups['Groups'][groupId]['today']['completedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(0,'string',hourTrans,minuteTrans);
                            allgroups['Groups'][groupId]['today']['completedrealstepsMins'] = 0;
                            allgroups['Groups'][groupId]['today']['completedrealsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(0,'string',hourTrans,minuteTrans);
                            allgroups['Groups'][groupId]['today']['progress'] = 0;
                            allgroups['Groups'][groupId]['competedstepsMin'] = 0;
                            allgroups['Groups'][groupId]['realcompletedstepsMin'] = 0;
                            allgroups['Groups'][groupId]['completedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(0,'string',hourTrans,minuteTrans);
                            allgroups['Groups'][groupId]['realcompletedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(0,'string',hourTrans,minuteTrans);
                            allgroups['Groups'][groupId]['averagestepMin'] = 0;
                            allgroups['Groups'][groupId]['averagestep'] = await this.commonDateService.convertMinutesToHoursAndMinutes(0,'string',hourTrans,minuteTrans);
                            allgroups['Groups'][groupId]['dailystepsMin'] = 0;
                            allgroups['Groups'][groupId]['dailysteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(0,'string',hourTrans,minuteTrans);
                            allgroups['Groups'][groupId]['totaldailystepsMin'] = 0;
                            allgroups['Groups'][groupId]['totaldailysteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(0,'string',hourTrans,minuteTrans);
                            allgroups['Groups'][groupId]['remainstepsMin'] = 0;
                            allgroups['Groups'][groupId]['remainsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(0,'string',hourTrans,minuteTrans);
                            allgroups['Groups'][groupId]['progress'] = 0;
                            allgroups['Groups'][groupId]['group_id'] = groupId;
                            allgroups['Groups'][groupId]['totalMembers'] = 0;
                            allgroups['Groups'][groupId]['name'] = getteam['challengeGroups']['name'];
                            allgroups['Groups'][groupId]['logo'] = getteam['challengeGroups']['logo'];
                        
                    }
                    
                    allCompeletedSteps += teamCompeletedTimes;
                    allDailySteps += teamDailyTotalTimeRequired;
                    allRemainSteps += teamTotalRemainTimes;
                    allBeyonds += beyondTotal;
                    allRealCompeletedSteps += teamCompeletedRealTimes;
                }
                if(!result['leaderboard']){
                    result['leaderboard'] = Object.create(null);
                }

                if(topusers && Object.keys(topusers).length > 0){
                    if (schedule['sc']['rank_type'] == "average_steps") {
                        topusers = Object.values(topusers).sort((a, b) => b['averagestepMin'] - a['averagestepMin']);
                    } else {
                        topusers = Object.values(topusers).sort((a, b) => b['realcompletedstepsMin'] - a['realcompletedstepsMin']);
                    }
                }

                if (topusers.length >= 10) {
                    topusers = topusers.slice(0, 10);
                }
                if(topusers && topusers.length > 0){
                    result['toptenusers'] = topusers.filter(ele=> ele.realcompletedstepsMin !=0);
                }
                result['leaderboard']['completedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(allCompeletedSteps,'string',hourTrans,minuteTrans);
                result['leaderboard']['realcompletedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(allRealCompeletedSteps,'string',hourTrans,minuteTrans);
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
                    result['leaderboard']['remainsteps'] =  await this.commonDateService.convertMinutesToHoursAndMinutes(allBeyonds,'string',hourTrans,minuteTrans); 
                    result['leaderboard']['remainbeyonds'] = "true";
                } else {               
                    result['leaderboard']['remainsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(allRemainSteps,'string',hourTrans,minuteTrans);
                }  
                result['leaderboard']['dailytotalsteps'] =  await this.commonDateService.convertMinutesToHoursAndMinutes(allDailySteps,'string',hourTrans,minuteTrans);

                let sortedTeams = [];
                if(allteams['Teams']){
                    if (schedule['sc']['rank_type'] == "average_steps") {
                        sortedTeams = this.teamsService.sortTeamsByOnField(allteams['Teams'],'averagestepsMin');
                    } else {
                        sortedTeams = this.teamsService.sortTeamsByOnField(allteams['Teams'],'competedstepsMin');
                    }
                }
                if(sortedTeams && sortedTeams.length > 0){
                    result['allteams'] = sortedTeams;
                }

                let sortedGroups = [];
                if(allgroups['Groups']){
                    if (schedule['sc']['group_order'] === 0) {
                        sortedGroups = this.teamsService.sortTeamsByOnField(allgroups['Groups'],'averagestepMin');
                    } else {
                        sortedGroups = this.teamsService.sortTeamsByOnField(allgroups['Groups'],'totalMembers');
                    }
                }

                if(sortedGroups){
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

                if(sortedGroups && sortedGroups.length > 0){
                    result['allgroups'] = sortedGroups;
                }
            }else{
                let topusers: any = Object.create(null);
                const membershipcode = await this.companyService.getCompanyCodeFromId(schedule['sc']['org_id']);
                const joinUsersList = await this.scheduleChallengeJoinUsersService.listRecord(`scj.schedule_id = ${schedule_id} AND user.status = 1 AND user.membership_code='${membershipcode}'`);

                let sleepWalks: any = 0;
                let realSleepsWalks = 0;
                let beyondTotal = 0;
                
                let allSleepsData: any = [];
                let todaySleepsData: any = [];
                let user_in_ranking = schedule?.in_ranking; 
                let companysmemtoday = 0;
                let companysmem = 0;

                let CompeletedTimes: any = 0;
                let CompeletedRealTimes: any = 0;
                let TotalRemainTimes = 0;
                let TodayComplatedTimes = 0;
                let TodayRemainsTimes = 0;
                let todayTotalRemain = 0;
                let todayBeyondTotal = 0;

                if(joinUsersList && joinUsersList?.length > 0){
                    let allUsersIdArray = joinUsersList.map(member => member?.user_id ? member?.user_id : '');
                    const allUsersId:any = allUsersIdArray.filter(item => item !== '').join(',');
                    if(allUsersId.trim() != ''){
                        let whereCond =`user_id IN (${allUsersId}) AND (activityTypeId IN ${findall} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${where} `;
                        allSleepsData = await this.foodFeedsService.totalWater(whereCond,null,['SUM(water) AS water', 'SUM(amount) as amount', 'user_id'],'food.user_id');
                        
                        let temp = Object.create(null);
                        allSleepsData.map(getSleeps => {
                            time = this.commonDateService.hour_minutes(getSleeps['water'],getSleeps['amount']);
                            let hours = time['hour'];
                            let minutes = Math.round(time['min']);
                            if (!temp['completedSleepTimesStr']) {
                                temp['completedSleepTimesStr'] = Object.create(null);
                            }
                            if (!temp['completedSleepTimesStr'][getSleeps['user_id']]) {
                                temp['completedSleepTimesStr'][getSleeps['user_id']] = Object.create(null);
                            }
                            temp['completedSleepTimesStr'][getSleeps['user_id']] = `${hours} Hr ${minutes} Min`;
                            temp[getSleeps['user_id']] = (hours * 60) + minutes;
                        });

                        if (Object.keys(temp)?.length > 0) {
                            allSleepsData = temp;
                            temp = Object.create(null)
                        }
                        whereCond =`user_id IN (${allUsersId}) AND (activityTypeId IN ${findall} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${whereD} `;
                        todaySleepsData = await this.foodFeedsService.totalWater(whereCond,null,['SUM(water) AS water', 'SUM(amount) as amount', 'user_id'],'food.user_id');

                        temp = Object.create(null);
                        todaySleepsData.map(tSleeps => {
                            time = this.commonDateService.hour_minutes(tSleeps['water'],tSleeps['amount']);
                            let hours = time['hour'];
                            let minutes = Math.round(time['min']);
                            if (!temp['todayCompletedSleepTimesStr']) {
                                temp['todayCompletedSleepTimesStr'] = Object.create(null);
                            }
                            if (!temp['todayCompletedSleepTimesStr'][tSleeps['user_id']]) {
                                temp['todayCompletedSleepTimesStr'][tSleeps['user_id']] = Object.create(null);
                            }
                            temp['todayCompletedSleepTimesStr'][tSleeps['user_id']] = `${hours} Hr ${minutes} Min`;
                            temp[tSleeps['user_id']] = (hours * 60) + minutes;
                        });

                        if (Object.keys(temp)?.length > 0) {
                            todaySleepsData = temp;
                        }
                    }

                    for (let getUser of joinUsersList) {
                        let percentage = 0;
                        let averageTime = 0;
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

                        if (Object.prototype.hasOwnProperty.call(allSleepsData,this_user_id)) {
                            sleepWalks = allSleepsData[this_user_id];
                            realSleepsWalks = allSleepsData[this_user_id];
                            if (dailyRequiredTimes && dailyRequiredTimes !== 0) {
                                let updailymaxstepscnt = dailyRequiredTimes * uptodays;
                                if (sleepWalks > updailymaxstepscnt) {
                                    sleepWalks = updailymaxstepscnt;
                                }
                                sleepWalks = parseInt(sleepWalks.toString().replace("-", ""));
                            }
                    
                            if (sleepWalks == "") {
                                sleepWalks = 0;
                                realSleepsWalks = 0;
                            }
                        } else {
                            sleepWalks = 0;
                            realSleepsWalks = 0;
                        }

                        if (sleepWalks !== 0) {
                            CompeletedTimes += sleepWalks;
                            CompeletedRealTimes += realSleepsWalks;

                            let remainsteps = totalTimeRequired - sleepWalks;
                            if (remainsteps < 0) {
                                let rtemp = Math.abs(remainsteps);
                                remainsteps = 0;
                                beyondTotal += rtemp;
                            }
                            TotalRemainTimes += remainsteps;
                            companysmem++;
                        }

                        let sleepsdaily: any = 0;
                        let sleepsrealdaily: any = 0;
                        if (Object.prototype.hasOwnProperty.call(todaySleepsData,this_user_id)) {
                            sleepsdaily = todaySleepsData[this_user_id];
                            sleepsrealdaily = todaySleepsData[this_user_id];
                            if (dailyRequiredTimes && dailyRequiredTimes !== 0) {
                                if (sleepsdaily > dailyRequiredTimes) {
                                    sleepsdaily = dailyRequiredTimes;
                                }
                                sleepsdaily = parseInt(sleepsdaily.toString().replace("-", ""));
                            }
                    
                            if (sleepsdaily !== "") {
                                companysmemtoday++;
                            }
                        } else {
                            sleepsdaily = 0;
                            sleepsrealdaily = 0;
                        }
                        if (sleepsdaily !== 0) {
                            TodayComplatedTimes += sleepsdaily; 
                            let todayremain = dailyRequiredTimes - sleepsdaily;
                            if (todayremain < 0) {
                                let rtemp = Math.abs(todayremain);
                                todayremain = 0;
                            }
                            TodayRemainsTimes += todayremain;
                        }
                        
                        if (totalTimeRequired !== 0) {
                            percentage = parseFloat(((sleepWalks * 100) / totalTimeRequired).toFixed(2));
                        }
                        if (percentage >= 100) {
                            percentage = 100;
                        }
                        averageTime = (uptodays != 0) ? parseFloat((sleepWalks / uptodays).toFixed(2)) : 0;
                        
                        todayPercentage = (dailyRequiredTimes !== 0) ? parseFloat(((sleepsdaily * 100) / dailyRequiredTimes).toFixed(2)) : 0;
                        if (todayPercentage >= 100) {
                            todayPercentage = 100;
                        }

                        if (user_in_ranking === 1) {
                            if (userId === this_user_id) {
                                getUser['progress'] = percentage;
                                getUser['completedstepsMin'] = sleepWalks;
                                getUser['averagestepMin'] = averageTime;
                                getUser['realcompletedstepsMin'] = realSleepsWalks;
                                getUser['completedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(sleepWalks,'string',hourTrans,minuteTrans);
                                getUser['realcompletedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(realSleepsWalks,'string',hourTrans,minuteTrans);
                                getUser['averagestep'] =  await this.commonDateService.convertMinutesToHoursAndMinutes(averageTime,'string',hourTrans,minuteTrans);
                                getUser['in_ranking'] = getUser?.in_ranking;
                                getUser['userdetail'] = getUser['user'];
                                delete(getUser['user']);

                                if (!getUser['today']) {
                                    getUser['today'] = Object.create(null);
                                }
                                
                                getUser['today']['completedsteps'] = 0;
                                getUser['today']['remainsteps'] = 0;
                                getUser['today']['requiredsteps'] = 0;
                                getUser['today']['progress'] = 0;
                                getUser['today']['averagesteps'] = 0; 
                        
                                if (matchStartDate <= ucurrentdate) {
                                    getUser['today']['completedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(sleepsdaily,'string',hourTrans,minuteTrans);
                                    let todayremain = dailyRequiredTimes - sleepsdaily;
                                    getUser['today']['remainsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(todayremain,'string',hourTrans,minuteTrans);
                                    getUser['today']['requiredsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(dailyRequiredTimes,'string',hourTrans,minuteTrans);
                                    getUser['today']['progress'] = todayPercentage;
                                    let todayAverageTimes = (dailyRequiredTimes !== 0) ? Math.round((sleepsdaily * 100) / dailyRequiredTimes) : 0;
                                    getUser['today']['averagesteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(todayAverageTimes,'string',hourTrans,minuteTrans);
                                    if (userId === this_user_id) {
                                        result['todaysleeplog'] = await this.commonDateService.convertMinutesToHoursAndMinutes(sleepsdaily,'string',hourTrans,minuteTrans) != "0 Min" ?await this.commonDateService.convertMinutesToHoursAndMinutes(sleepsdaily,'string',hourTrans,minuteTrans) : '0 ' + hourTrans + ' 0 ' + minuteTrans;
                                        result['todaysleepreallog'] = await this.commonDateService.convertMinutesToHoursAndMinutes(sleepsrealdaily,'string',hourTrans,minuteTrans) != "0 Min" ?await this.commonDateService.convertMinutesToHoursAndMinutes(sleepsrealdaily,'string',hourTrans,minuteTrans) : '0 ' + hourTrans + ' 0 ' + minuteTrans;
                                        result['dailysleeprequired'] = await this.commonDateService.convertMinutesToHoursAndMinutes(dailyRequiredTimes,'string',hourTrans,minuteTrans);
                                        result['today'] = getUser['today'];
                                        result['totalstepscompleted'] =  await this.commonDateService.convertMinutesToHoursAndMinutes(sleepWalks,'string',hourTrans,minuteTrans);
                                        result['progress'] = percentage;
                                        result['averagesteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(averageTime,'string',hourTrans,minuteTrans);
                                    }
                                }
                            }
                        } else {
                            if (getUser && getUser.in_ranking === 0) {
                                getUser['progress'] = percentage;
                                getUser['completedstepsMin'] = sleepWalks;
                                getUser['averagestepMin'] = averageTime;
                                getUser['realcompletedstepsMin'] = realSleepsWalks;
                                getUser['completedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(sleepWalks,'string',hourTrans,minuteTrans);
                                getUser['realcompletedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(realSleepsWalks,'string',hourTrans,minuteTrans);
                                getUser['averagestep'] =  await this.commonDateService.convertMinutesToHoursAndMinutes(averageTime,'string',hourTrans,minuteTrans);
                                getUser['in_ranking'] = getUser?.in_ranking;
                                getUser['userdetail'] = getUser['user'];
                                delete(getUser['user']);

                                if (!getUser['today']) {
                                    getUser['today'] = Object.create(null);
                                }
                                
                                getUser['today']['completedsteps'] = 0;
                                getUser['today']['remainsteps'] = 0;
                                getUser['today']['requiredsteps'] = 0;
                                getUser['today']['progress'] = 0;
                                getUser['today']['averagesteps'] = 0; 
                        
                                if (matchStartDate <= ucurrentdate) {
                                    getUser['today']['completedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(sleepsdaily,'string',hourTrans,minuteTrans);
                                    let todayremain = dailyRequiredTimes - sleepsdaily;
                                    getUser['today']['remainsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(todayremain,'string',hourTrans,minuteTrans);
                                    getUser['today']['requiredsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(dailyRequiredTimes,'string',hourTrans,minuteTrans);
                                    getUser['today']['progress'] = todayPercentage;
                                    let todayAverageTimes = (dailyRequiredTimes !== 0) ? Math.round((sleepsdaily * 100) / dailyRequiredTimes) : 0;
                                    getUser['today']['averagesteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(todayAverageTimes,'string',hourTrans,minuteTrans);
                                    if (userId === this_user_id) {
                                        result['todaysleeplog'] = await this.commonDateService.convertMinutesToHoursAndMinutes(sleepsdaily,'string',hourTrans,minuteTrans) != "0 Min" ?await this.commonDateService.convertMinutesToHoursAndMinutes(sleepsdaily,'string',hourTrans,minuteTrans) : '0 ' + hourTrans + ' 0 ' + minuteTrans;
                                        result['todaysleepreallog'] = await this.commonDateService.convertMinutesToHoursAndMinutes(sleepsrealdaily,'string',hourTrans,minuteTrans) != "0 Min" ?await this.commonDateService.convertMinutesToHoursAndMinutes(sleepsrealdaily,'string',hourTrans,minuteTrans) : '0 ' + hourTrans + ' 0 ' + minuteTrans;
                                        result['dailysleeprequired'] = await this.commonDateService.convertMinutesToHoursAndMinutes(dailyRequiredTimes,'string',hourTrans,minuteTrans);
                                        result['today'] = getUser['today'];
                                        result['totalstepscompleted'] =  await this.commonDateService.convertMinutesToHoursAndMinutes(sleepWalks,'string',hourTrans,minuteTrans);
                                        result['progress'] = percentage;
                                        result['averagesteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(averageTime,'string',hourTrans,minuteTrans);
                                    }
                                }
                            }
                        }

                        if (!topusers[this_user_id]) {
                            topusers[this_user_id] = Object.create(null);
                        }

                        topusers[this_user_id]['id'] = getUser['userdetail']['id'];
                        topusers[this_user_id]['name'] = getUser['userdetail']['name'];
                        topusers[this_user_id]['profile_image'] = getUser['userdetail']['profile_image'];
                        topusers[this_user_id]['progress'] = percentage;
                        topusers[this_user_id]['completedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(realSleepsWalks,'string',hourTrans,minuteTrans);
                        topusers[this_user_id]['realcompletedstepsMin'] = realSleepsWalks;
                        topusers[this_user_id]['realcompletedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(realSleepsWalks,'string',hourTrans,minuteTrans);
                        topusers[this_user_id]['averagestepMin'] = averageTime;
                        topusers[this_user_id]['averagestep'] = await this.commonDateService.convertMinutesToHoursAndMinutes(averageTime,'string',hourTrans,minuteTrans);
                    }

                    if(topusers && Object.keys(topusers).length > 0){
                        if (schedule['sc']['rank_type'] == "average_steps") {
                            topusers = Object.values(topusers).sort((a, b) => b['averagestepMin'] - a['averagestepMin']);
                        } else {
                            topusers = Object.values(topusers).sort((a, b) => b['realcompletedstepsMin'] - a['realcompletedstepsMin']);
                        }
                    }

                    if (topusers.length >= 10) {
                        topusers = topusers.slice(0, 10);
                    }
                    if(topusers && topusers.length > 0){
                        result['toptenusers'] = topusers.filter(ele=> ele.realcompletedstepsMin !=0);
                    }
                }
            }

            let type = schedule['sc']['rank_type'] === 'average_steps' ? 'Avg.' : '';
            if(result.allteams && result.allteams.length){
                let remainSteps = 0;
                let completedsteps = 0;
                let totalTeamMember = 0;
                for(let team of result?.allteams){
                    let leftText = '';
                    let rightText = '';
                    let teamCompleted = 0;
                    let teamRealCompleted = 0;
                    let teamProgressToday = 0;
                    totalTeamMember += team.teamMember.length || 0;
                    if (!team['today']) {
                        team['today'] = Object.create(null);
                    }
                    {
                        let translate = await this.translatorService.frontendReadTranslation(req.lang, `Completed`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                        let translate1 = await this.translatorService.frontendReadTranslation(req.lang, `Total Required`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                        let translate2 = `${await this.translatorService.frontendReadTranslation(req.lang, type.includes('Avg.') ? `Average` : '', `/LC_MESSAGES/Challenge/MyChallenges`, `static`)} ${await this.translatorService.frontendReadTranslation(req.lang,`Daily Required`, `/LC_MESSAGES/Challenge/MyChallenges`, `static`)}`
                        team['leftText']= await this.commonDateService.convertMinutesToHoursAndMinutes(0,'string',hourTrans,minuteTrans) + ` ${translate}`;
                        team['today']['leftText'] = await this.commonDateService.convertMinutesToHoursAndMinutes(0,'string',hourTrans,minuteTrans) + ` ${translate}`;
                        team['bottomLeftText']= await this.commonDateService.convertMinutesToHoursAndMinutes(0,'string',hourTrans,minuteTrans) + ` ${translate2}`;
                        team['today']['bottomLeftText'] = await this.commonDateService.convertMinutesToHoursAndMinutes(0,'string',hourTrans,minuteTrans) + ` ${translate2}`;
                        if(!team.progress ) {
                            team.progress = 0;
                        }
                    }
                    team.teamMember = team.teamMember.filter(ele => schedule.in_ranking == ele?.scheduleJoin?.in_ranking);
                    for (let member of team.teamMember) {
                        teamCompleted += member?.today?.completedstepsMins;
                        teamRealCompleted += member?.today?.completedrealstepsMins;
                        teamProgressToday += member?.today?.progress
                        if (member?.realcompletedstepsMin || member?.realcompletedstepsMin == 0) {
                            leftText = await this.commonDateService.convertMinutesToHoursAndMinutes(member.realcompletedstepsMin,'string',hourTrans,minuteTrans);
                            member['leftText']= leftText;
                        }
                        if (member?.progress || (member?.progress !== '' && member?.progress >= 0)) {
                            let translate = await this.translatorService.frontendReadTranslation(req.lang, `Completed`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            rightText = Math.abs(member?.progress || 0).toLocaleString() + `% ${translate}`;
                            member['rightText']= rightText;
                        }
                        if (member?.today?.completedrealstepsMins || member?.today?.completedrealstepsMins == 0) {
                            leftText = await this.commonDateService.convertMinutesToHoursAndMinutes(member.today.completedrealstepsMins,'string',hourTrans,minuteTrans);
                            member['today']['leftText']= leftText;
                        }
                        if (member?.today?.progress || (member?.today?.progress !== '' && member?.today?.progress >= 0)) {
                            let translate = await this.translatorService.frontendReadTranslation(req.lang, `Completed`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                            rightText = Math.abs(member?.today?.progress || 0).toLocaleString() + `% ${translate}`;
                            member['today']['rightText']= rightText;
                        }
                    }
                    if (teamCompleted || teamCompleted == 0) {
                        team['today']['completedstepsMins'] = teamCompleted;
                        team['today']['completedsteps'] = await this.commonDateService.convertMinutesToHoursAndMinutes(teamCompleted,'string',hourTrans,minuteTrans);
                    }
                    if (teamRealCompleted || teamRealCompleted == 0) {
                        let translate = await this.translatorService.frontendReadTranslation(req.lang, `Completed`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                        team['today']['leftText'] = await this.commonDateService.convertMinutesToHoursAndMinutes(teamRealCompleted,'string',hourTrans,minuteTrans) + ` ${translate}`;
                    }
                    team['today']['progress'] = (teamProgressToday / team.teamCount) || 0;
                    if(team['today']['progress'] >= 100) {
                        team['today']['progress'] = 100;
                    }
                    if (team?.realcompletedsteps || team?.realcompletedsteps == 0) {
                        let translate = await this.translatorService.frontendReadTranslation(req.lang, `Completed`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                        leftText = team.realcompletedsteps + ` ${translate}`;
                        team['leftText']= leftText;
                    }
                    let bottomRightText = '';
                    if (team?.dailysteps || team?.dailysteps == 0) {
                        let translate = `${await this.translatorService.frontendReadTranslation(req.lang, type.includes('Avg.') ? `Average` : '', `/LC_MESSAGES/Challenge/MyChallenges`, `static`)} ${await this.translatorService.frontendReadTranslation(req.lang,`Daily Required`, `/LC_MESSAGES/Challenge/MyChallenges`, `static`)}`
                        bottomRightText = team?.dailysteps + ` ${translate}`;
                        team['bottomLeftText']= bottomRightText;
                        team['today']['bottomLeftText'] = bottomRightText;
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
                if (result.leaderboard && result.leaderboard.realcompletedsteps) {
                    let translate = await this.translatorService.frontendReadTranslation(req.lang, `Completed`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                    result.leaderboard['leftText']= result.leaderboard.realcompletedsteps + ` ${translate}`;
                }
                if (result.leaderboard && result.leaderboard.dailytotalsteps) {
                    let translate = await this.translatorService.frontendReadTranslation(req.lang,`Daily Required`, `/LC_MESSAGES/Challenge/MyChallenges`, `static`);
                    result.leaderboard['rightText']= result.leaderboard.dailytotalsteps + ` ${translate}`;
                }
            }
            if(result.allgroups && result.allgroups.length){
                let remainSteps = 0;
                let completedsteps = 0;
                for(let group of result?.allgroups){
                    let leftText = '';
                    let rightText = '';
                    let bottomLeftText = '';
                    
                    if (!group['today']) {
                        group['today'] = Object.create(null);
                    }
                    if(!group.beyondtotal){
                        if(group.completedsteps > group.totaldailysteps){
                            group.beyondtotal = Math.abs(group.totaldailysteps - group.completedsteps);
                        }
                        else{
                            group.remainsteps = Math.abs(group.completedsteps - group.totaldailysteps);
                        }
                    }
                    if(schedule.in_ranking == 0){
                        group['show_group']= 1;
                    }
                    else if (schedule.in_ranking == 1 && myGroupID == group?.group_id){
                        group['show_group']= 1;
                    }
                    else{
                        group['show_group']= 0;
                    }
                        
                    group['today']['leftText'] = group['today']?.completedrealsteps + ` ${await this.translatorService.frontendReadTranslation(req.lang, `Completed`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`)}`;
                    
                    if (group?.realcompletedsteps) {
                        let translate = await this.translatorService.frontendReadTranslation(req.lang, `Completed`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                        leftText = group.realcompletedsteps + ` ${translate}`;
                        group['leftText']= leftText;
                    }

                    let bottomRightText = '';
                    if (group?.dailysteps ) {
                        let translate = `${await this.translatorService.frontendReadTranslation(req.lang, type.includes('Avg.') ? `Average` : '', `/LC_MESSAGES/Challenge/MyChallenges`, `static`)} ${await this.translatorService.frontendReadTranslation(req.lang,`Daily Required`, `/LC_MESSAGES/Challenge/MyChallenges`, `static`)}`
                        bottomRightText = group?.dailysteps + ` ${translate}`;
                        group['bottomLeftText']= bottomRightText;
                        group['today']['bottomLeftText'] = bottomRightText;
                    }
                    if (group?.totaldailysteps  || group?.totaldailysteps == 0) {
                        group['totalStepsText'] = (group?.totaldailysteps).toLocaleString() + ` ${result['totalOZRequiredText']}`;
                    }
                }
            }
            return result;
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
}