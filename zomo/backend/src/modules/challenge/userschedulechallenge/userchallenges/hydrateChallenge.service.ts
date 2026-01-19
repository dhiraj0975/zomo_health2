import { CommonDateService, CommonService, tableConstant } from "@common-constants";
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request } from "express";
import { lastValueFrom } from "rxjs";
import { ChatService } from "src/modules/chat/chat/chat.service";
import { CompanyService } from "src/modules/company/companies/company.service";
import { SettingsService } from "src/modules/company/settings/settings.service";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { FoodFeedService } from "src/modules/trackers/foodfeeds/foodfeeds.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { Not } from "typeorm";
import { InviteUserService } from "../../inviteuser/inviteuser.service";
import { ScheduleChallengeJoinUsersService } from "../../schedulechallengejoinusers/schedulechallengejoinusers.service";
import { TeamsService } from "../../teams/teams.service";
import { UserChallengeHelperService } from "../userChallengeHelper.service";
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD
@Injectable()
export class HydrateChallengeService {
    constructor(
        private readonly translatorService: TranslationService,
        private readonly commonService: CommonService,
        private readonly commonDateService: CommonDateService,
        private readonly companyService: CompanyService,
        private readonly companySettingsService: SettingsService,
        private readonly chatService: ChatService,
        private readonly teamsService: TeamsService,
        private readonly foodFeedsService: FoodFeedService,
        private readonly inviteUserService: InviteUserService,
        private readonly activityLogService: ActivityLogService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly userChallengeHelperService: UserChallengeHelperService,
        @Inject('COMMON_SERVICE')
            private commonMicroservice: ClientProxy,
    ) {}


    async hydrateChallenge(schedule: any, req: Request ,show_type = 1) {
        try {
            let result = Object.create(null);
            let findall: any = [];
            findall = schedule.ac.id; 
            findall = (!findall) ? '("")' : `('${findall}')`;
            let user = Object.create(req.tokenUser);

            let orgid = schedule.sc.org_id;
            let schedule_id = schedule.sc.id;
            let ucurrentdate = schedule.challengeDetails.ucurrentdate;
            let totaldays = schedule.challengeDetails.totaldays;
            let uptodays = schedule.challengeDetails.uptodays;
            let dailymaxstepscnt = schedule.sc.dailymaxstepscnt;
            let stepsdaily
            
            let userId = user.id;
            let timezone = user.timezone;

            if (schedule.sc.is_oz_meet_require_day === 1) {
                totaldays = schedule.sc.oz_meet_require_day;
            }
            let waterwhere = `food.collectionDate BETWEEN '${schedule.sc.start_date}' AND '${schedule.sc.end_date}'`;
            let waterdata = await this.userChallengeHelperService.fetch_point_steps(tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS, ['SUM(water) as water','food.collectionDate'], 'user_id', 'activityTypeId', findall, waterwhere, userId, req, 'food.collectionDate');
            let perdaywaterlog = schedule.ch.oz_water_per_day;

            if (schedule.sc.oz_water_per_day !== "") {
                perdaywaterlog = schedule.sc.oz_water_per_day;
            }
            let todayDate = await this.commonDateService.DateTimeFormat(ucurrentdate, 'YYYY-MM-DD');
            let todayWaterLog = 0;
            if (waterdata && waterdata?.length > 0) {
                let updatedWaterData = await Promise.all(
                    waterdata.map(async (w) => {
                        let collectionDate = await this.commonDateService.DateTimeFormat(w.food_collectionDate, 'YYYY-MM-DD');
                        let tmpWater = w.water;
                        if (todayDate === collectionDate) {
                            todayWaterLog = parseFloat(parseFloat(tmpWater).toFixed(2));
                        }
                        w.food_collectionDate = collectionDate;

                        let monthName = this.commonDateService.getTodayDate().format('MMM');
                        if(collectionDate && collectionDate != ''){
                            monthName = await this.translatorService.frontendReadTranslation(req.lang, moment(collectionDate).format('MMM'), `/LC_MESSAGES/Common/Month`,`static`);
                        }
                        w.collectionDate_Trans = collectionDate = monthName + ' ' + moment(collectionDate).format('D, YYYY');
                        return w;
                    })
                );
                waterdata = updatedWaterData;
            }
            let dailySteps = 0;
            if (schedule.sc.oz_water_per_day !== 0 && schedule.sc.oz_water_per_day !== "") {
                dailySteps = schedule.sc.oz_water_per_day;
            } else {
                dailySteps = perdaywaterlog; 
            }
            
            let totalSteps = dailySteps * totaldays; 
            let upstotalSteps = dailySteps * totaldays; 

            result = {
                todaywaterlog: todayWaterLog,
                perdaylogrequired: perdaywaterlog,
                dailysteps: dailySteps,
                totalsteps: totalSteps,
                Allentries: waterdata
            };
            result['today'] = {
                completedsteps: 0,
                beyond: 0,
                remainsteps: 0,
                progress: 0,
                averagesteps: 0
            };
            let Data = await this.userChallengeHelperService.fetch_point_steps(tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS, ['SUM(water) as water'], 'user_id', 'activityTypeId', findall, waterwhere, userId, req);
            let stepswalks = Data?.[0]?.['water'];
            if (dailymaxstepscnt && dailymaxstepscnt.trim() !== "" && dailymaxstepscnt !== 0) {
                let updailymaxstepscnt = dailymaxstepscnt * uptodays;
                if (stepswalks > updailymaxstepscnt) {
                    stepswalks = updailymaxstepscnt;
                }
                stepswalks = stepswalks.toString().replace("-", "");
            }
            
            if (!stepswalks) {
                stepswalks = 0;
            }
            if (moment(ucurrentdate).isoWeekday() !== 6 && moment(ucurrentdate).isoWeekday() !== 7) {
                let datatoday = await this.userChallengeHelperService.fetch_point_steps(tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS, ['SUM(water) as water'], 'user_id', 'activityTypeId', findall, waterwhere, userId, req);
                stepsdaily = datatoday?.[0]?.water || 0;
            
                if (dailymaxstepscnt !== "" && dailymaxstepscnt !== 0) {
                    if (stepsdaily > dailymaxstepscnt) {
                        stepsdaily = dailymaxstepscnt;
                    }
                    stepsdaily = Math.abs(stepsdaily);
                }
            
                if (stepsdaily === "") {
                    stepsdaily = 0;
                }
            
                let todayremain = 0;
                let result = {
                    today: {
                        todaysteps: 0,
                        beyond: 0,
                        remainsteps: 0,
                        todaypercentage: 0,
                        todayaveragesteps: 0
                    }
                };
            
                const matchstartdate = moment(schedule.sc.start_date);
            
                if (matchstartdate.isSameOrBefore(moment(ucurrentdate))) {
                    result.today.todaysteps = stepsdaily;
                    todayremain = dailySteps - stepsdaily;
            
                    if (todayremain < 0) {
                        result.today.beyond = todayremain;
                        todayremain = 0;
                    } else {
                        result.today.remainsteps = todayremain;
                    }
            
                    const todaypercentage = (dailySteps !== 0) ? Math.round(((stepsdaily * 100) / dailySteps) * 100) / 100 : 0;
                    result.today.todaypercentage = todaypercentage;
            
                    const todayaveragesteps = (dailySteps !== 0) ? Math.round(((stepsdaily / dailySteps) * dailySteps)) : 0;
                    result.today.todayaveragesteps = todayaveragesteps;
                }
            
            } else {
                result['Activity'] = {
                    today: {
                        todaysteps: 0,
                        beyond: 0,
                        remainsteps: 0,
                        todaypercentage: 0,
                        todayaveragesteps: 0
                    }
                }
            }
            if(show_type == 2){
                if(waterdata && waterdata.length > 0){
                    let newWaterLog = waterdata.sort((a, b) => moment(b.food_collectionDate).diff(moment(a.food_collectionDate))).slice(0,7);
                    let translation_params = await this.translatorService.frontendReadTranslation(req.lang,'OZ','/LC_MESSAGES/MyPlan/MyPlan')
                    const updatedEntries = newWaterLog.map(entry => {
                        const remainingWater = Math.max(perdaywaterlog - entry.water, 0); 

                        return {
                            ...entry,
                            remaining_water: remainingWater,
                            parametere_text : translation_params,
                        };
                    });
                    result = {
                        Allentries: updatedEntries
                    }
                }
                return result
            }
            result['oz_trans'] = await this.translatorService.frontendReadTranslation(req.lang,'OZ','/LC_MESSAGES/MyPlan/MyPlan')
            

            let where = `food.collectionDate BETWEEN '${schedule.sc.start_date}' AND '${this.commonDateService.DateTimeFormat(schedule.sc.end_date,'YYYY-MM-DD')} 23:59:59' AND food.status = 1`;
            let whereD = `food.collectionDate = '${this.commonDateService.DateTimeFormat(ucurrentdate,'YYYY-MM-DD')}' AND food.status = 1`;
            
            result.totalstepscompleted = stepswalks;
            result.todaysteps = stepsdaily;
            let percentage = (totalSteps !== 0) ? Math.round((stepswalks * 100) / totalSteps * 100) / 100 : 0;
            result.percentage = percentage;
            let remainsteps = totalSteps - stepswalks;
            if (remainsteps < 0) {
                result.beyond = remainsteps;
                remainsteps = 0;
            } else {
                result.remainsteps = remainsteps;
            }
            let averagesteps = 0;
            if (totalSteps !== 0) {
                averagesteps = (uptodays !== 0) ? Math.round(stepswalks / uptodays) : 0;
            }

            result.averagesteps = averagesteps;
            let myGroupID:any = '';
            let myTeamID:any = '';
            let matchStartDate: any = schedule.sc.start_date;
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
                result['ozCompletedText'] = await this.translatorService.frontendReadTranslation(req.lang,'OZ Completed', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)
                result['averageDailyOZRequiredText'] = `${await this.translatorService.frontendReadTranslation(req.lang,'Average', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)} ${await this.translatorService.frontendReadTranslation(req.lang,'Daily OZ Required', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)}`
                result['totalOZRequiredText'] =await this.translatorService.frontendReadTranslation(req.lang,'Total OZ Required', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)
                result['moreOzToGoalText'] = await this.translatorService.frontendReadTranslation(req.lang,'More Oz To Goal', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)
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
                    allteams['Teams'][teamId] =getteam
                    
                    let realStepsWalks = 0;
                    let teamRealSteps = 0;
                    let teamCompeletedSteps = 0;
                    let stepsWalks: any = 0;
                    let totalRemainSteps = 0;
                    let teamsmemtoday = 0;
                    let beyondTotal = 0;
                    let teamsMem = 0;
                    let DailyStepsForAll = 0;
                    let DailyStepsForTeam = 0;
                    
                    let todayTotal = 0;
                    let todayTotalDaily = 0;
                    let todayTotalRemain = 0;
                    let todayBeyondTotal = 0;

                    let teamTodayTotalSteps = 0;
                    let teamTodayTotalAverageSteps = 0;
                    let teamTodayProcess = 0;

                    let groupComplatedSteps = 0;
                    let groupDailySteps = 0;
                    let groupDailyTotalSteps = 0;
                    let groupAverageSteps = 0;
                    let groupRemainStaps:any = 0;
                    let groupProgress:any = 0;
                    let teamCount = 0;

                    let allStepsData: any = [];
                    let todayStepsData: any = [];
                    if(getteam['teamMember'] && getteam['teamMember']?.length > 0){
                        let allUsersIdArray = getteam['teamMember'].map(member => member['user']?.id ? member['user']?.id : '');
                        const allUsersId:any = allUsersIdArray.filter(item => item !== '').join(',');
                        if(allUsersId.trim() != ''){
                            let whereCond =`user_id IN (${allUsersId}) AND (activityTypeId IN ${findall} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${where} `;
                            allStepsData = await this.foodFeedsService.totalWater(whereCond,null,['SUM(water) AS water', 'user_id'],'food.user_id');

                            let temp = Object.create(null);
                            allStepsData.map(getSteps => {
                                temp[getSteps.user_id] = getSteps.water;
                            });

                            if (Object.keys(temp)?.length > 0) {
                                allStepsData = temp;
                            }

                            whereCond =`user_id IN (${allUsersId}) AND (activityTypeId IN ${findall} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${whereD} `;
                            todayStepsData = await this.foodFeedsService.totalWater(whereCond,null,['SUM(water) AS water', 'user_id'],'food.user_id');

                            temp = Object.create(null);
                            todayStepsData.map(tSteps => {
                                temp[tSteps.user_id] = tSteps.water;
                            });

                            if (Object.keys(temp)?.length > 0) {
                                todayStepsData = temp;
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
                            if(getMember?.department && req?.lang != 'eng'){
                                let deptName = await this.translatorService.frontendReadTranslation(req.lang,`department_name_${getMember?.department?.id}`, `/LC_MESSAGES/OrgAdmin/Department/${orgid}/${getMember?.department?.id}`,`dynamic`);
                                getMember.department['dept_name'] = (deptName == '' || deptName == `department_name_${getMember?.department?.id}`) ? getMember?.department?.dept_name : deptName;
                            }
                            if(getMember?.locations && req?.lang != 'eng'){
                                if (getMember?.locations.location_name) {
                                    let customeName = await this.translatorService.frontendReadTranslation(req.lang, `location_name_${getMember?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${getMember?.locations['id']}`, `dynamic`);
                                    getMember.locations.location_name = (customeName == '' || customeName == `location_name_${getMember?.locations['id']}`) ? getMember?.locations['location_name'] : customeName;
                                }
                                if (getMember?.locations.address1) {
                                    let customeName = await this.translatorService.frontendReadTranslation(req.lang, `location_address1_${getMember?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${getMember?.locations['id']}`, `dynamic`);
                                    getMember.locations.address1 = (customeName == '' || customeName == `location_address1_${getMember?.locations['id']}`) ? getMember?.locations['address1'] : customeName;
                                }
                                if (getMember?.locations.address2) {
                                    let customeName = await this.translatorService.frontendReadTranslation(req.lang, `location_address2_${getMember?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${getMember?.locations['id']}`, `dynamic`);
                                    getMember.locations.address2 = (customeName == '' || customeName == `location_address2_${getMember?.locations['id']}`) ? getMember?.locations['address2'] : customeName;
                                }
                                if (getMember?.locations.lname) {
                                    let customeName = await this.translatorService.frontendReadTranslation(req.lang, `location_lname_${getMember?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${getMember?.locations['id']}`, `dynamic`);
                                    getMember.locations.lname = (customeName == '' || customeName == `location_lname_${getMember?.locations['id']}`) ? getMember?.locations['lname'] : customeName;
                                }
                                if (getMember?.locations.city) {
                                    let customeName = await this.translatorService.frontendReadTranslation(req.lang, `location_city_${getMember?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${getMember?.locations['id']}`, `dynamic`);
                                    getMember.locations.city = (customeName == '' || customeName == `location_city_${getMember?.locations['id']}`) ? getMember?.locations['city'] : customeName;
                                }
                                if (getMember?.locations.state) {
                                    let customeName = await this.translatorService.frontendReadTranslation(req.lang, `location_state_${getMember?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${getMember?.locations['id']}`, `dynamic`);
                                    getMember.locations.state = (customeName == '' || customeName == `location_state_${getMember?.locations['id']}`) ? getMember?.locations['state'] : customeName;
                                }
                                if (getMember?.locations.country) {
                                    let customeName = await this.translatorService.frontendReadTranslation(req.lang, `location_country_${getMember?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${getMember?.locations['id']}`, `dynamic`);
                                    getMember.locations.country = (customeName == '' || customeName == `location_country_${getMember?.locations['id']}`) ? getMember?.locations['country'] : customeName;
                                }
                            }
                            if (getMember['user'] && (getMember['user']['first_name'] && getMember['user']['last_name'])) {
                                getMember['user']['name'] = getMember['user']['first_name'] + ' '+ getMember['user']['last_name'];
                                delete(getMember['user']['first_name']);
                                delete(getMember['user']['last_name']);
                            }

                            if (Object.prototype.hasOwnProperty.call(allStepsData, teamuserid)) {
                                stepsWalks = parseInt(allStepsData[teamuserid]);
                                realStepsWalks = parseInt(allStepsData[teamuserid]);
                        
                                if (dailymaxstepscnt && dailymaxstepscnt !== "" && parseInt(dailymaxstepscnt) !== 0) {
                                    let updailymaxstepscnt = dailymaxstepscnt * uptodays;
                                    if (stepsWalks > updailymaxstepscnt) {
                                        stepsWalks = updailymaxstepscnt;
                                    }
                                    stepsWalks = parseInt(stepsWalks?.toString()?.replace("-", "") ?? 0);
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

                            if(!schedule['sc']['oz_water_per_day']){
                                DailyStepsForAll = schedule['sc']['oz_water_per_day'] *  getteam['teamMember']?.length;
                                DailyStepsForTeam += schedule['sc']['oz_water_per_day'];
                            }else{
                                DailyStepsForAll = dailySteps * getteam['teamMember']?.length;
                                DailyStepsForTeam += dailySteps;
                            }
                            
                            if (userId === teamuserid) {
                                result['realstepswalks'] = Math.round(realStepsWalks);
                            }
                            
                            let stepsdaily: any = 0;
                            if (Object.prototype.hasOwnProperty.call(todayStepsData,teamuserid)) {
                                stepsdaily = todayStepsData[teamuserid];
                        
                                if (dailymaxstepscnt && dailymaxstepscnt !== "" && parseInt(dailymaxstepscnt) !== 0) {
                                    if (stepsdaily > dailymaxstepscnt) {
                                        stepsdaily = dailymaxstepscnt;
                                    }
                                    stepsdaily = parseInt(stepsdaily?.toString()?.replace("-", "") ?? 0);
                                }
                        
                                if (stepsdaily && stepsdaily !== "") {
                                    teamsmemtoday++;
                                }
                            } else {
                                stepsdaily = 0;
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
                            getMember['ozCompletedText'] = await this.translatorService.frontendReadTranslation(req.lang,'OZ Completed', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)
                            getMember['completedText'] = await this.translatorService.frontendReadTranslation(req.lang,'Completed', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)
                            getMember['averageDailyOZRequiredText'] = `${await this.translatorService.frontendReadTranslation(req.lang,'Average', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)} ${await this.translatorService.frontendReadTranslation(req.lang,'Daily OZ Required', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)}`
                            
                            if (getMember['scheduleJoin'] && getMember['scheduleJoin']?.in_ranking === 0) {
                                getMember['progress'] = percentage;
                                getMember['completedsteps'] = Math.round(stepsWalks);
                                getMember['realcompletedsteps'] = Math.round(realStepsWalks);
                                getMember['averagestep'] = averageSteps;
                                getMember['in_ranking'] = getMember['scheduleJoin']?.in_ranking;
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
                                getMember['today']['ozCompletedText'] = await this.translatorService.frontendReadTranslation(req.lang,'OZ Completed', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)
                                getMember['today']['averageDailyOZRequiredText'] = `${await this.translatorService.frontendReadTranslation(req.lang,'Average', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)} ${await this.translatorService.frontendReadTranslation(req.lang,'Daily OZ Required', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)}`
                                getMember['today']['moreOzToGoalText'] = await this.translatorService.frontendReadTranslation(req.lang,'More Oz To Goal', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)
                        
                                if (matchStartDate <= ucurrentdate) {
                                    getMember['today']['completedsteps'] = stepsdaily;
                                    let todayremain = dailySteps - stepsdaily;
                                    if (todayremain < 0) {
                                        getMember['today']['beyond'] = todayremain;
                                        todayremain = 0;
                                    } else {
                                        getMember['today']['remainsteps'] = todayremain;
                                    }
                                    getMember['today']['progress'] = todayPercentage;
                                    let todayAverageSteps = (dailySteps !== 0) ? Math.round((stepsdaily / dailySteps) * todayTotalDaily) : 0;
                                    getMember['today']['averagesteps'] = todayAverageSteps;
                                    if (userId === teamuserid) {
                                        result['today'] = getMember['today'];
                                        result['totalstepscompleted'] =  Math.round(stepsWalks);
                                        result['progress'] = percentage;
                                        result['averagesteps'] = averageSteps;
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
                                topusers[teamuserid]['completedsteps'] = Math.round(stepsWalks);;
                                topusers[teamuserid]['realcompletedsteps'] = Math.round(realStepsWalks);
                                topusers[teamuserid]['averagestep'] = averageSteps;
                            }
                        }
                       
                        allteams['Teams'][teamId]['completedsteps'] =Math.round(teamCompeletedSteps)
                        allteams['Teams'][teamId]['teamCount'] = Number(teamCount);
                        allteams['Teams'][teamId]['realcompetedsteps'] = Math.round(teamRealSteps)
                        allteams['Teams'][teamId]['dailysteps'] = DailyStepsForAll
                        allteams['Teams'][teamId]['totaldailysteps'] =DailyStepsForTeam * totaldays

                        allteams['Teams'][teamId]['ozCompletedText'] = await this.translatorService.frontendReadTranslation(req.lang,'OZ Completed', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)
                        allteams['Teams'][teamId]['averageDailyOZRequiredText'] = `${await this.translatorService.frontendReadTranslation(req.lang,'Average', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)} ${await this.translatorService.frontendReadTranslation(req.lang,'Daily OZ Required', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)}`
                        allteams['Teams'][teamId]['totalOZRequiredText'] =await this.translatorService.frontendReadTranslation(req.lang,'Total OZ Required', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)
                        allteams['Teams'][teamId]['moreOzToGoalText'] = await this.translatorService.frontendReadTranslation(req.lang,'More Oz To Goal', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)
                        if(allteams['Teams'][teamId]['teamMember']){
                            if (schedule['sc']['rank_type'] == "average_steps") {
                                allteams['Teams'][teamId]['teamMember'] = Object.values(allteams['Teams'][teamId]['teamMember']).sort((a, b) => b['averagestep'] - a['averagestep']);
                            } else {
                                allteams['Teams'][teamId]['teamMember'] = Object.values(allteams['Teams'][teamId]['teamMember']).sort((a, b) => b['realcompletedsteps'] - a['realcompletedsteps']);
                            }
                        }

                        if(allUsersIdArray.includes(userId)){
                            result['myTeamDetails']['completedsteps'] = Math.round(teamCompeletedSteps);
                            result['myTeamDetails']['realcompetedsteps'] = Math.round(teamRealSteps)
                            result['myTeamDetails']['dailysteps'] = DailyStepsForAll
                            result['myTeamDetails']['totaldailysteps'] = DailyStepsForTeam * totaldays
                            result['myTeamDetails']['ozCompletedText'] = await this.translatorService.frontendReadTranslation(req.lang,'OZ Completed', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)
                            result['myTeamDetails']['averageDailyOZRequiredText'] = `${await this.translatorService.frontendReadTranslation(req.lang,'Average', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)} ${await this.translatorService.frontendReadTranslation(req.lang,'Daily OZ Required', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)}`
                            result['myTeamDetails']['totalOZRequiredText'] =await this.translatorService.frontendReadTranslation(req.lang,'Total OZ Required', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)
                            result['myTeamDetails']['moreOzToGoalText'] = await this.translatorService.frontendReadTranslation(req.lang,'More Oz To Goal', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)
                            if(!result['myTeamDetails']['today']){
                                result['myTeamDetails']['today'] = Object.create(null);
                            }
                            result['myTeamDetails']['today']['completedsteps'] = 0;
                            result['myTeamDetails']['today']['beyond'] = 0;
                            result['myTeamDetails']['today']['remainsteps'] = 0;
                            result['myTeamDetails']['today']['averagesteps'] = 0;
                            result['myTeamDetails']['today']['progress'] = 0;
                            result['myTeamDetails']['today']['ozCompletedText'] = await this.translatorService.frontendReadTranslation(req.lang,'OZ Completed', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)
                            result['myTeamDetails']['today']['averageDailyOZRequiredText'] = `${await this.translatorService.frontendReadTranslation(req.lang,'Average', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)} ${await this.translatorService.frontendReadTranslation(req.lang,'Daily OZ Required', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)}`
                            result['myTeamDetails']['today']['moreOzToGoalText'] = await this.translatorService.frontendReadTranslation(req.lang,'More Oz To Goal', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)

                            if (matchStartDate <= ucurrentdate) { 
                                result['myTeamDetails']['today']['completedsteps'] = todayTotal;
                                if (todayTotal > todayBeyondTotal) {
                                    todayTotal = todayTotal - todayBeyondTotal;
                                }
                                if (todayBeyondTotal != 0) {                        
                                    result['myTeamDetails']['today']['beyond'] = todayBeyondTotal;
                                } else {                         
                                    result['myTeamDetails']['today']['remainsteps'] = todayTotalRemain;     
                                }
                                teamTodayTotalSteps = todayTotal + todayTotalRemain;
                                if (teamTodayTotalSteps != 0) {
                                    teamTodayProcess = Math.round((todayTotal * 100) / teamTodayTotalSteps);
                                    if (teamsmemtoday != 0) {
                                        teamTodayTotalAverageSteps = Math.round(((todayTotal / teamsmemtoday)));
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
                        
                        if (beyondTotal !== 0) {
                            allteams['Teams'][teamId]['beyondtotal'] = Math.round(beyondTotal);
                            beyondTotal = teamCompeletedSteps - (upstotalSteps * teamsMem);
                        } else {
                            result['totalremainsteps'] = totalRemainSteps;
                            allteams['Teams'][teamId]['remainsteps'] = totalRemainSteps
                        }
                        
                        let teamProgress = 0;
                        let totalstepsteam = teamCompeletedSteps + totalRemainSteps;
                        allteams['Teams'][teamId]['averagesteps'] = 0;
                        let averagestepsteam = 0;
                        if (totalstepsteam !== 0) {
                            if (teamCompeletedSteps !== 0) {
                                teamProgress = (upstotalSteps !== 0 && teamsMem !== 0) ? parseFloat(((teamCompeletedSteps * 100) / (upstotalSteps * teamsMem)).toFixed(2)) : 0;
                                averagestepsteam = (teamsMem !== 0 && uptodays !== 0) ? Math.round((teamCompeletedSteps / teamsMem) / uptodays) : 0;
                                allteams['Teams'][teamId]['averagesteps'] = averagestepsteam
                            } else {
                                teamProgress = parseFloat((upstotalSteps * teamsMem).toFixed(2));
                                averagestepsteam = (uptodays !== 0) ? Math.round(teamsMem / uptodays) : 0;
                                allteams['Teams'][teamId]['averagesteps'] = averagestepsteam
                            }
                        }
                        if(teamProgress >= 100){
                            teamProgress = 100;
                        }
                        allteams['Teams'][teamId]['progress'] = teamProgress;
                        if(allUsersIdArray.includes(userId)){
                            result['myTeamDetails']['averagesteps'] = allteams['Teams'][teamId]['averagesteps']
                            result['myTeamDetails']['beyondtotal'] = Math.round(allteams['Teams'][teamId]['beyondtotal']);
                            result['myTeamDetails']['progress'] = allteams['Teams'][teamId]['progress'];
                            result['myTeamDetails']['remainsteps'] =allteams['Teams'][teamId]['remainsteps']
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
                            let groupTodayMemberCount= 0
                            for(let group of groupMember){
                                if(group.teamMember){
                                    groupMemberCount += group.teamMember.length;
                                }
                                for(let member of group.teamMember){
                                    groupTodayMemberCount += member?.today?.completedsteps > 0 ? 1 :  0;
                                    groupTodayCompletedSteps += member?.today?.completedsteps || 0;
                                    groupTodayBeyond += member?.today?.beyond || 0;
                                    groupTodayRemainSteps += member?.today?.remainsteps || 0;
                                    groupTodayAvarageSteps += member?.today?.averagesteps || 0;
                                    groupTodayProgress += member?.today?.progress || 0;
                                }
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
                            if(allgroups['Groups'][groupId]['remainsteps']){
                                groupRemainStaps = allgroups['Groups'][groupId]['remainsteps'] + totalRemainSteps;
                            }else{
                                groupRemainStaps = totalRemainSteps;
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
                            allgroups['Groups'][groupId]['groupmember'] = groupMemberCount;

                            groupTodayProgress = groupTodayProgress / groupTodayMemberCount;
                            if(groupTodayProgress >= 100){
                                groupTodayProgress = 100;
                            }

                            allgroups['Groups'][groupId]['today']['progress'] = groupTodayProgress;

                            allgroups['Groups'][groupId]['completedsteps'] = parseFloat(groupComplatedSteps.toFixed(2));
                            allgroups['Groups'][groupId]['averagestep'] = groupAverageSteps;
                            allgroups['Groups'][groupId]['dailysteps'] = groupDailySteps;
                            allgroups['Groups'][groupId]['totaldailysteps'] = groupDailyTotalSteps;
                            allgroups['Groups'][groupId]['remainsteps'] = groupRemainStaps;
                            allgroups['Groups'][groupId]['progress'] = groupProgress;
                            allgroups['Groups'][groupId]['group_id'] = groupId;
                            allgroups['Groups'][groupId]['name'] = getteam['challengeGroups']?.['name'];
                            allgroups['Groups'][groupId]['logo'] = getteam['challengeGroups']?.['logo'];
                            if(groupMemberCount !=0 && uptodays){
                                allgroups['Groups'][groupId]['groupavg']=Math.round(allgroups['Groups'][groupId]['completedsteps'] / groupMemberCount / uptodays);
                            }
                            else{
                                allgroups['Groups'][groupId]['groupavg']=0;
                            }
                              
                            
                            result['myTeamDetails']['ozCompletedText'] = await this.translatorService.frontendReadTranslation(req.lang,'OZ Completed', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)
                            result['myTeamDetails']['averageDailyOZRequiredText'] = `${await this.translatorService.frontendReadTranslation(req.lang,'Average', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)} ${await this.translatorService.frontendReadTranslation(req.lang,'Daily OZ Required', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)}`
                            result['myTeamDetails']['totalOZRequiredText'] =await this.translatorService.frontendReadTranslation(req.lang,'Total OZ Required', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)
                            result['myTeamDetails']['moreOzToGoalText'] = await this.translatorService.frontendReadTranslation(req.lang,'More Oz To Goal', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)
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
                            groupAverageSteps = 0
                        }else{
                            groupAverageSteps = 0
                        }
                        if(allgroups['Groups'][groupId]['remainsteps']){
                            groupRemainStaps = 0;
                        }else{
                            groupRemainStaps = 0;
                        }
                        if(allgroups['Groups'][groupId]['progress']){
                            groupProgress = 0
                        }else{
                            groupProgress = 0
                        }
                        allgroups['Groups'][groupId]['completedsteps'] = parseFloat(groupComplatedSteps.toFixed(2));
                        allgroups['Groups'][groupId]['averagestep'] = groupAverageSteps;
                        allgroups['Groups'][groupId]['dailysteps'] = groupDailySteps;
                        allgroups['Groups'][groupId]['totaldailysteps'] = groupDailyTotalSteps;
                        allgroups['Groups'][groupId]['remainsteps'] = groupRemainStaps;
                        allgroups['Groups'][groupId]['progress'] = 0;
                        allgroups['Groups'][groupId]['group_id'] = groupId;
                        allgroups['Groups'][groupId]['name'] = getteam['challengeGroups']?.['name'];
                        allgroups['Groups'][groupId]['logo'] = getteam['challengeGroups']?.['logo'];
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
                        topusers = Object.values(topusers).filter((item:any) => item?.averagestep != 0).sort((a, b) => b['averagestep'] - a['averagestep']);
                    } else {
                        topusers = Object.values(topusers).filter((item:any) => item?.realcompletedsteps != 0).sort((a, b) => b['realcompletedsteps'] - a['realcompletedsteps']);
                    }
                }
                
                if (topusers.length >= 10) {
                    topusers = topusers.slice(0, 10);
                }
                if(topusers && topusers.length > 0){
                    result['toptenusers'] = topusers;
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
                {
                    let type = schedule['sc']['rank_type'] === 'average_steps' ? 'Avg. Oz' : 'Oz';
                    let translate = await this.translatorService.frontendReadTranslation(req.lang, type.includes('Avg.') ? `Avg. Daily Oz Required` : `Daily Oz Required`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                    result.leaderboard['rightText'] = (allDailySteps.toLocaleString()) + ` ${translate}`;
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
                        sortedGroups = sortedGroups.sort((a, b) => b.groupavg - a.groupavg)
                    } else {
                        sortedGroups = sortedGroups.sort((a, b) => b.groupmember - a.groupmember);
                    }
                    sortedGroups = sortedGroups.map((item, index) => ({
                        ...item,
                        ranking: index + 1
                    }));
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
                                this.activityLogService.create(recordDetails, {read_by: read_by}, tableConstant.CHALLENGE.TBL_CH_CHAT, userId);
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
                
                if(joinUsersList && joinUsersList?.length > 0){
                    let allUsersIdArray = joinUsersList.map(member => member?.user_id ? member?.user_id : '');
                    const allUsersId:any = allUsersIdArray.filter(item => item !== '').join(',');

                    if(allUsersId.trim() != ''){
                        let whereCond =`user_id IN (${allUsersId}) AND (activityTypeId IN ${findall} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${where} `;
                        allStepsData = await this.foodFeedsService.totalWater(whereCond,null,['SUM(water) AS water', 'user_id'],'food.user_id');

                        let temp = Object.create(null);
                        allStepsData.map(getSteps => {
                            temp[getSteps.user_id] = getSteps.water;
                        });

                        if (Object.keys(temp)?.length > 0) {
                            allStepsData = temp;
                        }

                        whereCond =`user_id IN (${allUsersId}) AND (activityTypeId IN ${findall} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${whereD} `;
                        todayStepsData = await this.foodFeedsService.totalWater(whereCond,null,['SUM(water) AS water', 'user_id'],'food.user_id');

                        temp = Object.create(null);
                        todayStepsData.map(tSteps => {
                            temp[tSteps.user_id] = tSteps.water;
                        });

                        if (Object.keys(temp)?.length > 0) {
                            todayStepsData = temp;
                        }
                        
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

                            if (Object.prototype.hasOwnProperty.call(allStepsData, this_user_id)) {
                                stepsWalks = allStepsData[this_user_id];
                                realStepsWalks = allStepsData[this_user_id];
                        
                                if (dailymaxstepscnt && dailymaxstepscnt !== "" && parseInt(dailymaxstepscnt) !== 0) {
                                    let updailymaxstepscnt = dailymaxstepscnt * uptodays;
                                    if (stepsWalks > updailymaxstepscnt) {
                                        stepsWalks = updailymaxstepscnt;
                                    }
                                    stepsWalks = parseInt(stepsWalks?.toString()?.replace("-", "") ?? 0);
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
                                    stepsDaily = parseInt(stepsDaily?.toString()?.replace("-", "") ?? 0);
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
                                    if(this_user_id === userId){
                                        result['beyond'] = rtemp;
                                    }
                                    remainsteps = 0;
                                    beyondTotal += rtemp;
                                }
                                if(this_user_id === userId){
                                    result['remainsteps'] = parseFloat(remainsteps.toFixed(2));
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
                                    getUser['completedsteps'] = Math.round(stepsWalks);
                                    getUser['realcompletedsteps'] = Math.round(realStepsWalks);
                                    getUser['averagestep'] = averageSteps;
                                    getUser['in_ranking'] = getUser.in_ranking;
                                    getUser['userdetail'] = getUser['user'];
                                    delete(getUser['user']);
                            
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
                                            result['totalstepscompleted'] =  Math.round(stepsWalks);
                                            result['progress'] = percentage;
                                            result['averagesteps'] = averageSteps;
                                        }
                                    }
                                }
                            } else {
                                if (getUser && getUser.in_ranking === 0) {
                                    getUser['progress'] = percentage;
                                    getUser['completedsteps'] = Math.round(stepsWalks);
                                    getUser['realcompletedsteps'] = Math.round(realStepsWalks);
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
                                            result['totalstepscompleted'] =  Math.round(stepsWalks);
                                            result['progress'] = percentage;
                                            result['averagesteps'] = averageSteps;
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
                            topusers[this_user_id]['completedsteps'] = Math.round(stepsWalks);;
                            topusers[this_user_id]['realcompletedsteps'] = Math.round(realStepsWalks);
                            topusers[this_user_id]['averagestep'] = averageSteps;
                        }

                        if(topusers && Object.keys(topusers).length > 0){
                            if (schedule['sc']['rank_type'] == "average_steps") {
                                topusers = Object.values(topusers).filter((item:any) => item?.averagestep != 0).sort((a, b) => b['averagestep'] - a['averagestep']);
                            } else {
                                topusers = Object.values(topusers).filter((item:any) => item?.realcompletedsteps != 0).sort((a, b) => b['realcompletedsteps'] - a['realcompletedsteps']);
                            }
                        }

                        if (topusers.length >= 10) {
                            topusers = topusers.slice(0, 10);
                        }
                        if(topusers && topusers.length > 0){
                            result['toptenusers'] = topusers;
                        }
                    }
                }
            }
            let type = schedule['sc']['rank_type'] === 'average_steps' ? 'Avg. Oz' : 'Oz';
            if (result && result?.today && result?.today?.completedsteps) {
                result.today['completedsteps'] = Math.round(result?.today?.['completedsteps'] * 100) / 100 || 0;
            }
            if(result.allteams && result.allteams.length){
                let remainSteps = 0;
                let completedsteps = 0;
                let totalTeamMember = 0;
                for(let team of result?.allteams){
                    let leftText = '';
                    let rightText = '';
                    let teamCompleted = 0;
                    let teamBeyond = 0;
                    let teamRemaining = 0;
                    let teamTodayRemaining = 0;
                    let teamAverage = 0;
                    let teamProgress = 0;
                    let teamProgressToday = 0;
                    totalTeamMember += team.teamMember.length || 0;
                    if (!team['today']) {
                        team['today'] = Object.create(null);
                    }
                    team.teamMember = JSON.parse(JSON.stringify(team.teamMember));
                    team.teamMember = team.teamMember.filter(ele => schedule.in_ranking == ele?.scheduleJoin?.in_ranking);
                    for (let member of team.teamMember) {
                        teamCompleted += member?.today?.completedsteps;
                        teamBeyond += Math.abs(member?.today?.beyond);
                        teamRemaining += member?.completedsteps > 0 ? member?.today?.remainsteps : 0;
                        teamTodayRemaining += member?.today?.completedsteps > 0 ? member?.today?.remainsteps : 0;
                        teamAverage += member?.today?.averagesteps;
                        totalTeamMember += member?.completedsteps > 0 ? 1 : 0;
                        teamProgress += member.progress
                        teamProgressToday += member?.today?.progress
                        if (member?.completedsteps || member?.completedsteps == 0) {
                            leftText = Math.abs(member?.completedsteps || 0).toLocaleString() + ` ${result['ozCompletedText']}`;
                            completedsteps += Math.abs(member?.completedsteps || 0);
                            member['leftText']= leftText;
                        }
                        if (member?.progress || (member?.progress !== '' && member?.progress >= 0)) {
                            rightText = Math.abs(member?.progress || 0).toLocaleString() + `% ${member['completedText']}`;
                            member['rightText']= rightText;
                        }
                        if (member?.today?.completedsteps || member?.today?.completedsteps == 0) {
                            member['today']['leftText']= Math.abs(member?.today?.completedsteps || 0).toLocaleString() + ` ${result['ozCompletedText']}`;
                        }
                        if (member?.today?.progress || member?.today?.progress == 0) {
                            member['today']['rightText']= Math.abs(member?.today?.progress || 0).toLocaleString() + `% ${member['completedText']}`;;
                        }
                    }
                    {
                        let translate = await this.translatorService.frontendReadTranslation(req.lang, type.includes('Avg.') ? `Avg. Daily Oz Required` : `Daily Oz Required`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                        let bottomLeftText = '0' + ` ${translate}`;
                        team['bottomLeftText']= bottomLeftText;
                        team['today']['bottomLeftText'] = bottomLeftText;
                        team['today']['leftText'] =`0 / 0 ${result['ozCompletedText']}`;
                        team['leftText']= `0 / 0 ${result['ozCompletedText']}`;
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
                    team['today']['progress'] = (teamProgressToday / team.teamCount) || 0;
                    if(team['today']['progress'] >= 100) {
                        team['today']['progress'] = 100;
                    }
                    
                    if(!team.progress ) {
                        team.progress = 0;
                    }
                    if (team?.totaldailysteps || (team?.totaldailysteps !== '' && team?.totaldailysteps >= 0 ||team?.completedsteps || team?.completedsteps == 0)) {
                        leftText = Math.abs(team?.completedsteps || 0).toLocaleString() + ` ${result['ozCompletedText']}`;
                        completedsteps += Math.abs(team?.completedsteps || 0);
                        team['leftText']= leftText;
                        team['today']['leftText'] = (teamCompleted).toLocaleString() + ` ${result['ozCompletedText']}`;
                    }
                    // if (team?.averagesteps  || team?.averagesteps == 0) {
                    //     let translate = await this.translatorService.frontendReadTranslation(req.lang, `Avg. Daily Oz`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                    //     let bottomLeftText = Math.abs(team?.averagesteps || 0).toLocaleString() + ` ${translate}`;
                    //     // result.today['bottomLeftText']= bottomLeftText;
                    // }
                    if (team?.dailysteps  || team?.dailysteps == 0) {
                        let translate = await this.translatorService.frontendReadTranslation(req.lang, type.includes('Avg.') ? `Avg. Daily Oz Required` : `Daily Oz Required`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                        let bottomRightText = Math.abs(team?.dailysteps || 0).toLocaleString() + ` ${translate}`;
                        team['bottomLeftText']= bottomRightText;
                        team['today']['bottomLeftText'] = bottomRightText;
                    }
                    if (team?.totaldailysteps  || team?.totaldailysteps == 0) {
                        team['totalStepsText'] = (team?.totaldailysteps).toLocaleString() + ` ${result['totalOZRequiredText']}`;
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
                    result.leaderboard['leftText']= Math.abs(result?.leaderboard?.completedsteps || completedsteps || 0).toLocaleString() + ` ${result['ozCompletedText']}`;
                }
                if (result.today &&  Object.prototype.hasOwnProperty.call(result.today, 'completedsteps')) {
                    result.today['rightText']= Math.abs(result?.today?.completedsteps || completedsteps || 0).toLocaleString() + ` ${result['ozCompletedText']}`;
                }
                else if(result?.today?.remainsteps){
                    result.leaderboard['bottomLeftText'] = Math.abs(remainSteps || 0).toLocaleString() + ` ${result['moreOzToGoalText']}`;
                    result.today['bottomLeftText']= Math.abs(remainSteps || 0).toLocaleString() + ` ${result['moreOzToGoalText']}`;
                }
                if (result.totalsteps) {
                    result.leaderboard['totalStepsText'] = (result.totalsteps).toLocaleString() + ` ${result['totalOZRequiredText']}`;
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
                        
                    group['today']['leftText'] = (group['today']?.completedsteps || 0).toLocaleString() + ` ${result['ozCompletedText']}`;
                    if(schedule.in_ranking == 0){
                        group['show_group']= 1;
                    }
                    else if (schedule.in_ranking == 1 && myGroupID == group?.group_id){
                        group['show_group']= 1;
                    }
                    else{
                        group['show_group']= 0;
                    }
                    if (group?.completedsteps || group?.completedsteps == 0) {
                        leftText = Math.abs(group?.completedsteps || 0).toLocaleString() + ` ${result['ozCompletedText']}`;
                        completedsteps += Math.abs(group?.completedsteps || 0);
                        group['leftText'] = leftText;

                    }
                    if (group?.averagestep  || group?.averagestep == 0) {
                        let translate = await this.translatorService.frontendReadTranslation(req.lang, `Avg. Daily Oz`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                        bottomLeftText = Math.abs(group?.averagestep || 0).toLocaleString() + ` ${translate}`;
                        result.today['bottomLeftText']= bottomLeftText;
                    }
                    let bottomRightText = '';
                    if (group?.dailysteps  || group?.dailysteps == 0) {
                        let translate = await this.translatorService.frontendReadTranslation(req.lang, type.includes('Avg.') ? `Avg. Daily Oz Required` : `Daily Oz Required`, `/LC_MESSAGES/Dashboard/ChallengeProgress`, `static`);
                        bottomRightText = Math.abs(group?.dailysteps || 0).toLocaleString() + ` ${translate}`;
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