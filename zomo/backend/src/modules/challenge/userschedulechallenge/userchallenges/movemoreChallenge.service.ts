import { CommonArrayService, CommonDateService, CommonService } from '@common-constants';
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request } from "express";
import { lastValueFrom } from "rxjs";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { ActivityFeedService } from "src/modules/trackers/activityfeeds/activityfeeds.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { MoveMoreParksService } from "../../movemoreparks/movemoreparks.service";
import { ScheduleChallengeJoinUsersService } from "../../schedulechallengejoinusers/schedulechallengejoinusers.service";
import { TeamsService } from "../../teams/teams.service";
import { WeeksStepsService } from "../../weekssteps/weekssteps.service";
import { UserChallengeHelperService } from "../userChallengeHelper.service";
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD
@Injectable()
export class MoveMoreChallengeService {
    constructor(
        private readonly translatorService: TranslationService,
        private readonly commonService: CommonService,
        private readonly commonDateService: CommonDateService,
        private readonly weeksStepsService: WeeksStepsService,
        private readonly teamsService: TeamsService,
        private readonly activityFeedsService: ActivityFeedService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly moveMoreParksService: MoveMoreParksService,
        private readonly userChallengeHelperService: UserChallengeHelperService,
        @Inject('COMMON_SERVICE')
            private commonMicroservice: ClientProxy,
        private readonly activityLogService: ActivityLogService,
        private readonly commonArrayService: CommonArrayService,
    ) {}


    async moveMoreChallenge(schedule: any, req: Request, show_type = 1) {
        try {
            let result = Object.create(null);
            const findall = [];
            let findAllString;
            if (schedule.sc.s_activity_tracker === 1) { findall.push(7); }
            if (schedule.sc.s_steps === 1) { findall.push(11); }
            if (schedule.sc.s_walking === 1) { findall.push(15); }
            if (schedule.sc.s_running === 1) { findall.push(16); }
            if (schedule.sc.s_cycling === 1) { findall.push(17); }
            if (schedule.sc.s_swimming === 1) { findall.push(18); }
            if (findall?.length > 0) {
                findAllString = `(${findall.join(',')})`;
            } else {
                findAllString = '("")';
            }

            let user = Object.create(req.tokenUser);

            let orgid = schedule['sc']['org_id'];
            let schedule_id = schedule['sc']['id'];
            let scheduleid = schedule['id'];
            let totaldays = schedule['challengeDetails']['totaldays'];
            let uptodays = schedule['challengeDetails']['uptodays'];
            let ucurrentdate = schedule['challengeDetails']['ucurrentdate'];
            let userId = user.id;
            
            let timezone = user.timezone;

            let weeksfteps =  await this.weeksStepsService.listRecord({schedule_id: schedule['sc']['id'], status: 1, f_suggestion : 0}, { id: 'ASC' }, ['week_no', 'move_more_goal', 'move_more_goal_type']);

            let countstepswith = schedule['sc']['countstepswith'];
            let logType = " AND food.logType in('Tracker','Manual')";
            if (countstepswith == 'realstep') {
                logType = " AND food.logType = 'Tracker'";
            }
            let is_set_weekend = schedule['sc']['is_set_weekend'];
            if(is_set_weekend == 1){
                logType += " AND WEEKDAY(food.collectionDate) >= 0 AND WEEKDAY(food.collectionDate) < 5";
                const startDay:any = this.commonDateService.DateTimeFormat(schedule['sc']['start_date']);
                let dayOfWeek = startDay.day();
                if (dayOfWeek > 0 && dayOfWeek <= 5) {
                    schedule['sc']['start_date'] = startDay.format('YYYY-MM-DD');
                } else {
                    schedule['sc']['start_date'] = startDay.day(8).format('YYYY-MM-DD'); // 8 will always get us to the next Monday
                }
                const endDate:any = this.commonDateService.DateTimeFormat(schedule['sc']['end_date']);
                dayOfWeek = endDate.day();
                if (dayOfWeek > 0 && dayOfWeek <= 5) {
                    schedule['sc']['end_date'] = endDate.format('YYYY-MM-DD');
                } else {
                    const daysSinceLastFriday = (dayOfWeek + 2) % 7;
                    schedule['sc']['end_date'] = endDate.subtract(daysSinceLastFriday, 'days').startOf('day').format('YYYY-MM-DD');
                }
            }
            let membershipcode = user.membership_code;
            let team_existVar = 'no';
            if(schedule['sc']['team'] == 1){
                const allgetteams: any = await this.teamsService.getAllTeams(`team.org_id = ${orgid} AND team.schedule_id = ${schedule_id}`, [], false);
                let myGroupID:any = '';
                let myTeamID:any = '';
                let groupId = 0;
                let teamId = 0;
                let groupSteps = 0;
                let groupAverageStep = 0;
                let allteams = Object.create(null);
                let allgroups = Object.create(null);

                for (let getteam of allgetteams) {
                    if(getteam['teamMember'] && getteam['teamMember']?.length > 0){
                        getteam['teamMember'] = Object.values(getteam['teamMember']).filter((item)=> item['user']);
                        getteam['teamMember'] = Object.values(getteam['teamMember']).filter((item)=> item['scheduleJoin']);
                    }
                    let teamAvgSteps = 0;
                    let teamSteps = 0;
                    let teamcreatedBy = 0;

                    groupId = getteam['group_id'];
                    teamId = getteam['id'];
                    teamcreatedBy = getteam['created_by'];

                    if (!allteams['Teams']) {
                        allteams['Teams'] = Object.create(null);
                    }

                    if (!result['myTeamDetails']) {
                        result['myTeamDetails'] = Object.create(null);
                    }
                    
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
                    if (!allteams['Teams'][teamId]) {
                        allteams['Teams'][teamId] = Object.create(null);
                    }
                    allteams['Teams'][teamId] = getteam;
                    
                    if(getteam['teamMember'] && getteam['teamMember']?.length > 0){
                        let allUsersIdArray = getteam['teamMember'].map(member => member['user']?.id ? member['user']?.id : '');
                        const allUsersId:any = allUsersIdArray.filter(item => item !== '').join(',');
                        /* Get a team member week start date */
                            let teamMemberWeekStartDates = [];
                            let allStepsData = [];
                            let AllStepsdataDatewise = new Map();
                            if(allUsersId.trim() != ''){
                                teamMemberWeekStartDates = await this.weeksStepsService.getTeamMemberWeekStartDates(`ws.schedule_id = ${schedule_id} AND ws.status = 1`, allUsersId);
                                let currentDateUser = this.commonDateService.DateTimeFormat('now','YYYY-MM-DD');
                                let where = `food.user_id in (${allUsersId}) AND food.collectionDate BETWEEN '${schedule['sc']['start_date']}' AND '${schedule['sc']['end_date']}' ${logType} AND food.status = 1`;
                                where += " AND food.collectionDate BETWEEN '" + schedule['sc']['start_date'] + "' AND '" + currentDateUser + "'";
                                allStepsData = await this.activityFeedsService.getUserActivityData(where, ['SUM(food.steps) as steps', 'food.user_id as user_id','food.collectionDate as collectionDate'], 'food.user_id, food.collectionDate');

                                if(allStepsData){
                                    AllStepsdataDatewise = allStepsData.reduce((acc, item) => {
                                        const userIds = Number(item.user_id);
                                        const collectionDate = moment(item.collectionDate).format('YYYY-MM-DD');
                                        const steps = parseInt(item.steps, 10);
                                        if (!acc.has(userIds)) {
                                            acc.set(userIds, new Map());
                                        }
                                        acc.get(userIds).set(collectionDate, steps);
                                        return acc;
                                    }, new Map());
                                }
                            }
                            
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
                                if (getMember['user'] && getMember['user']['profile_image'] && getMember['user']['profile_image'] != '' && await await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: getMember['user']['profile_image']}))) {
                                    allteams['Teams'][teamId]['teamMember'][keyM]['user']['profile_image'] = S3_URL + getMember['user']['profile_image'];
                                }
                                else{
                                    allteams['Teams'][teamId]['teamMember'][keyM]['user']['profile_image'] = S3_URL + 'comn/img/avatar_0001.png'; 
                                }
                                allteams['Teams'][teamId]['teamMember'][keyM]['user']['name'] = '';
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
                                
                                if (getMember['user'] && (getMember['user']['first_name'] && getMember['user']['last_name'])) {
                                    allteams['Teams'][teamId]['teamMember'][keyM]['user']['name'] = getMember['user']['first_name'] + ' '+ getMember['user']['last_name'];
                                    delete(allteams['Teams'][teamId]['teamMember'][keyM]['user']['first_name']);
                                    delete(allteams['Teams'][teamId]['teamMember'][keyM]['user']['last_name']);
                                }

                                let getWeekStartDate = teamMemberWeekStartDates.find(item => item.user_id === getMember.user_id);
                                let wSSDate = '';
                                if (getWeekStartDate) {
                                    wSSDate = getWeekStartDate.start_date; // '2024-08-02T00:00:00.000Z'
                                }
                                if(AllStepsdataDatewise.has(getMember.user_id)){
                                    let tempdata = AllStepsdataDatewise.get(getMember.user_id);
                                    let RegrangeStart:any = '';
                                    if(wSSDate != '' && [0, 2].includes(schedule['sc']['move_more_display'])){
                                        RegrangeStart = await this.commonDateService.DateTimeFormat(wSSDate,'timestamp');
                                        tempdata = new Map(
                                            [...AllStepsdataDatewise.get(getMember.user_id)]
                                                .filter(([keyD, valueD]) => {
                                                    const varDate = this.commonDateService.DateTimeFormat(keyD, 'timestamp', 'YYYY-MM-DD');
                                                    return varDate >= RegrangeStart;
                                                })
                                        );
                                    }
                                    if(tempdata.size !== 0){
                                        AllStepsdataDatewise.set(Number(getMember.user_id), tempdata);
                                        const stepsData = tempdata;
                                        const totalSteps:any = Array.from(stepsData.values()).reduce((acc: any, value: any) => acc + value, 0);
                                        allteams['Teams'][teamId]['teamMember'][keyM]['steps'] = totalSteps;
                                        let divide_day = (is_set_weekend) ? 5 : 7;
                                        allteams['Teams'][teamId]['teamMember'][keyM]['averagestep'] = Math.round(allteams['Teams'][teamId]['teamMember'][keyM]['steps']/divide_day);
                                        teamAvgSteps += (allteams['Teams'][teamId]['teamMember'][keyM]['steps']/divide_day);
                                        teamSteps += parseInt(totalSteps);
                                    
                                    }else{
                                        AllStepsdataDatewise.delete(getMember.user_id);
                                        allteams['Teams'][teamId]['teamMember'][keyM]['steps'] = 0;
                                        allteams['Teams'][teamId]['teamMember'][keyM]['averagestep'] = 0;   
                                        teamAvgSteps += 0;
                                        teamSteps += 0;
                                    }
                                }else{
                                    allteams['Teams'][teamId]['teamMember'][keyM]['steps'] = 0;
                                    allteams['Teams'][teamId]['teamMember'][keyM]['averagestep'] = 0;
                                    teamAvgSteps += 0;
                                    teamSteps += 0;
                                }
                                if(schedule['sc']['move_more_display'] == 1){
                                    const userwise_all_steps_for_park = await this.moveMoreParksService.GetParkSteps(getMember.user_id, AllStepsdataDatewise, schedule['sc']['start_date'], schedule['sc']['end_date'], is_set_weekend, totaldays, schedule['added_date'], ucurrentdate);
                                    allteams['Teams'][teamId]['teamMember'][keyM]['all_steps_for_park'] = userwise_all_steps_for_park;
                                }
                                keyM++;
                            }

                            if(allteams['Teams'][teamId]['teamMember']){
                                if (schedule['sc']['rank_type'] == "average_steps") {
                                    allteams['Teams'][teamId]['teamMember'] = Object.values(allteams['Teams'][teamId]['teamMember']).sort((a, b) => b['averagestep'] - a['averagestep']);
                                } else {
                                    allteams['Teams'][teamId]['teamMember'] = Object.values(allteams['Teams'][teamId]['teamMember']).sort((a, b) => b['steps'] - a['steps']);
                                }
                            }
                            if(allUsersIdArray.includes(userId)){
                                result['myTeamDetails']['teamMember'] = allteams['Teams'][teamId]['teamMember'];
                            }

                            allteams['Teams'][teamId]['teamsteps'] = teamSteps;
                            allteams['Teams'][teamId]['teamaveragestep'] = teamAvgSteps;

                            if(myTeamID == teamId){
                                result['myTeamDetails']['teamsteps'] = teamSteps;
                                result['myTeamDetails']['teamaveragestep'] = teamAvgSteps;
                            }

                            if (schedule['sc']['group_status'] == 1 && groupId != 0) {
                                const groupTeamCount = allgetteams.filter(team => team.group_id === groupId).length;
                                let groupMemberCount = 0;
                                const groupMember = allgetteams.filter(team => team.group_id === groupId);
                                for (let group of groupMember) {
                                    if (group.teamMember) {
                                        groupMemberCount += group.teamMember.length;
                                    }
                                }
                                if (!allgroups['Groups']) {
                                    allgroups['Groups'] = Object.create(null);
                                }
                                if (!allgroups['Groups'][groupId]) {
                                    allgroups['Groups'][groupId] = Object.create(null);
                                }
                                if(allgroups['Groups'][groupId]['groupsteps']){
                                    groupSteps = allgroups['Groups'][groupId]['groupsteps'] + teamSteps;
                                }else{
                                    groupSteps = teamSteps;
                                }
                                if(allgroups['Groups'][groupId]['groupaveragestep']){
                                    groupAverageStep = Math.round(((allgroups['Groups'][groupId]['groupaveragestep'] + teamAvgSteps)));
                                }else{
                                    groupAverageStep = Math.round(teamAvgSteps);
                                }
                                allgroups['Groups'][groupId]['groupsteps'] = groupSteps;
                                allgroups['Groups'][groupId]['groupaveragestep'] = groupAverageStep;
                                allgroups['Groups'][groupId]['group_id'] = groupId;
                                allgroups['Groups'][groupId]['name'] = getteam['challengeGroups']['name'];
                                allgroups['Groups'][groupId]['logo'] = getteam['challengeGroups']['logo'];
                                allgroups['Groups'][groupId]['groupmember'] = groupMemberCount;
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
                            if(teamcreatedBy == userId){
                                team_existVar = 'yes';
                            }
                        /* Get a team member week start date */
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
                        allgroups['Groups'][groupId]['groupsteps'] = 0;
                        allgroups['Groups'][groupId]['groupaveragestep'] = 0;
                        allgroups['Groups'][groupId]['group_id'] = groupId;
                        allgroups['Groups'][groupId]['name'] = getteam['challengeGroups']['name'];
                        allgroups['Groups'][groupId]['logo'] = getteam['challengeGroups']['logo'];
                    }
                }

                let sortedTeams = [];
                if(allteams['Teams']){
                    if (schedule['sc']['rank_type'] == "average_steps") {
                        sortedTeams = this.teamsService.sortTeamsByOnField(allteams['Teams'],'teamaveragestep');
                    } else {
                        sortedTeams = this.teamsService.sortTeamsByOnField(allteams['Teams'],'teamsteps');
                    }
                }

                let sortedGroups = [];
                if(allgroups['Groups']){
                    if (schedule['sc']['group_order'] == 0) {
                        sortedGroups = this.teamsService.sortTeamsByOnField(allgroups['Groups'],'groupaveragestep');
                    } else {
                        sortedGroups = this.teamsService.sortTeamsByOnField(allgroups['Groups'],'groupmember');
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

                if(sortedTeams && sortedTeams.length > 0){
                    result['allteams'] = sortedTeams;
                }
                if(sortedGroups && sortedGroups.length > 0){
                    result['allgroups'] = sortedGroups;
                }
            }   

            let joinAllUserWeekStartDate:any = await this.scheduleChallengeJoinUsersService.getWeekStartDateJoinUsers(`scj.schedule_id = ${schedule_id} AND scj.status = 1 AND user.status = 1 AND user.membership_code = '${membershipcode}'`);
            if(joinAllUserWeekStartDate){
                joinAllUserWeekStartDate = joinAllUserWeekStartDate.filter((item, index, self) => index === self.findIndex(obj => obj.id === item.id));
            }
            let allOrgUsersIdArray = joinAllUserWeekStartDate.map(member => member?.id ? member?.id : '');
            const allOrgUsersId:any = allOrgUsersIdArray.filter(item => item !== '').join(',');
            
            let allUserStepsData = [];
            let AllUserStepsdataDatewise = new Map();
            if(allOrgUsersId.trim() != ''){
                let currentDateUsers = this.commonDateService.DateTimeFormat('now','YYYY-MM-DD');
                let whereAll = `food.user_id in (${allOrgUsersId}) AND food.collectionDate BETWEEN '${schedule['sc']['start_date']}' AND '${schedule['sc']['end_date']}' ${logType} AND food.status = 1`;
                whereAll += " AND food.collectionDate BETWEEN '" + schedule['sc']['start_date'] + "' AND '" + currentDateUsers + "'";
                allUserStepsData = await this.activityFeedsService.getUserActivityData(whereAll, ['SUM(food.steps) as steps', 'food.user_id as user_id','food.collectionDate as collectionDate'], 'food.user_id, food.collectionDate');
                if(allUserStepsData){
                    AllUserStepsdataDatewise = allUserStepsData.reduce((acc, item) => {
                        const userIds = Number(item.user_id);
                        const collectionDate = moment(item.collectionDate).format('YYYY-MM-DD');
                        const steps = parseInt(item.steps, 10);
                        if (!acc.has(userIds)) {
                            acc.set(userIds, new Map());
                        }
                        acc.get(userIds).set(collectionDate, steps);
                        return acc;
                    }, new Map());
                }
            }
            if(schedule['sc']['move_more_display'] == 1){
                const userwise_all_steps_for_park = await this.moveMoreParksService.GetParkSteps(userId, AllUserStepsdataDatewise, schedule['sc']['start_date'], schedule['sc']['end_date'], is_set_weekend, totaldays, schedule['added_date'], ucurrentdate);
                result['all_steps_for_park'] = userwise_all_steps_for_park;
            }

            let leaderboard_ranking = Object.create(null);
            if(uptodays == 0){
                uptodays = 1;
            }
            for (let getUsers of joinAllUserWeekStartDate) {
                let weekSSDate = '';
                if (getUsers?.start_date) {
                    weekSSDate = getUsers.start_date;
                }
                if(AllUserStepsdataDatewise.has(getUsers.id)){
                    let Usid = getUsers.id;
                    let tempdatall = AllUserStepsdataDatewise.get(getUsers.id);
                    let RegrangeStart:any = '';
                    if(weekSSDate != '' && [0, 2].includes(schedule['sc']['move_more_display'])){
                        RegrangeStart = await this.commonDateService.DateTimeFormat(weekSSDate,'timestamp');
                        tempdatall = new Map(
                            [...AllUserStepsdataDatewise.get(getUsers.id)]
                                .filter(([keyD, valueD]) => {
                                    const varDate = this.commonDateService.DateTimeFormat(keyD, 'timestamp', 'YYYY-MM-DD');
                                    return varDate >= RegrangeStart;
                                })
                        );

                    }
                    if(tempdatall.size !== 0){
                        AllUserStepsdataDatewise.set(Number(getUsers.id), tempdatall);
                        const stepsAllData = tempdatall;
                        const totalAllSteps:any = Array.from(stepsAllData.values()).reduce((acc:any, value:any) => acc + value, 0);
                        getUsers['steps'] = totalAllSteps;
                        let divide_day = (is_set_weekend) ? 5 : 7;
                        let averagestep = (getUsers['steps']/divide_day);
                        getUsers['averagestep'] = Math.round(averagestep);
                    }else{
                        AllUserStepsdataDatewise.delete(getUsers.id);
                        getUsers['steps'] = 0;
                        getUsers['averagestep'] = 0;   
                    }
                }else{
                    getUsers['steps'] = 0;
                    getUsers['averagestep'] = 0;
                }
            }

            if(joinAllUserWeekStartDate && joinAllUserWeekStartDate.length > 0){
                if (schedule['sc']['rank_type'] == "average_steps") {
                    joinAllUserWeekStartDate = Object.values(joinAllUserWeekStartDate).sort((a, b) => b['averagestep'] - a['averagestep']);
                } else {
                    joinAllUserWeekStartDate = Object.values(joinAllUserWeekStartDate).sort((a, b) => b['steps'] - a['steps']);
                }
                
                result['participationrankingtotal'] = joinAllUserWeekStartDate.length;
                let participationrankingyour = joinAllUserWeekStartDate.findIndex(user => user.id === userId);
                result['participationrankingyour'] = participationrankingyour+1;

                joinAllUserWeekStartDate = Object.fromEntries(
                    Object.entries(joinAllUserWeekStartDate).filter(([keyU, valueU]) => {
                        if (valueU['profile_image'] && valueU?.['profile_image']) {
                            valueU['profile_image'] = S3_URL + valueU['profile_image'];
                        }
                        return (valueU['in_ranking'] == '0' && valueU['steps'] != 0);
                    })
                );

                joinAllUserWeekStartDate = Object.values(joinAllUserWeekStartDate);
                if(req.tokenUser?.org_id == 818 || req.tokenUser?.org_id == 614){
                    joinAllUserWeekStartDate = joinAllUserWeekStartDate.slice(0, 20);
                }else{
                    joinAllUserWeekStartDate = joinAllUserWeekStartDate.slice(0, 15);
                }
                
                result['ranking'] = joinAllUserWeekStartDate;
            }

            result['team_exist'] = team_existVar;
            let numberofsteps = schedule['sc']['numberofsteps'];
            const weekparkDetail = await this.scheduleChallengeJoinUsersService.getWeekDetail(req, userId, weeksfteps, AllUserStepsdataDatewise, schedule['sc']['start_date'], schedule['sc']['end_date'], schedule['sc']['tr_goaltype'], schedule['sc']['rank_type'], is_set_weekend, totaldays, numberofsteps, schedule['added_date'], timezone);
            result['currentweek'] = weekparkDetail['currentweek'];
            result['currentweeknumber'] = weekparkDetail['currentweeknumber'];
            let currentweeknumber = weekparkDetail['currentweeknumber'];
            let lastweeknumber = weekparkDetail['lastweeknumber'];
            let MyStepsdata = 0;
            let meetfirstweek = 0;
            let weekdatadisable = "no";
            const weekArrayDatas = weekparkDetail['weeksarray'];
            if(weekArrayDatas && Object.keys(weekArrayDatas).length > 0){
                for (const weekKey in weekArrayDatas) {
                    if (Object.prototype.hasOwnProperty.call(weekArrayDatas, weekKey)) {
                        const weekData = weekArrayDatas[weekKey];
                        if(!('week_goal' in weekData)){
                            weekData['week_goal'] = 0;
                        }

                        weekData['weekdatadisable'] = (weekdatadisable == 'yes') ? '0' : '1';
                        MyStepsdata += weekData?.['weeksteps'] || 0;
                        weekData['week_number_background_color'] = (weekdatadisable == 'yes') ? '#E9E9EA' : ((weekKey == weekparkDetail['currentweek']) ? '#f69522' : '#522e87'); 
                        weekData['week_title_color'] = (weekdatadisable == 'yes') ? '#B1BDC4' : ((weekKey == weekparkDetail['currentweek']) ? '#28505C' : '#28505D');
                        weekData['week_goal_color'] = (weekdatadisable == 'yes') ? '#B1BDC4' : ((weekKey == weekparkDetail['currentweek']) ? '#f69522' : '#28505C');

                        let weekGoleTitle = '';
                        if(weekData['week_goal_color'] == '#f69522'){
                            weekGoleTitle = await this.translatorService.frontendReadTranslation(req.lang,`Goal`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                        }else{
                            weekGoleTitle = await this.translatorService.frontendReadTranslation(req.lang,`of goal`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                        }

                        weekData['week_goal_title'] = weekGoleTitle;
                        weekData['start_date'] = weekData['start_date'];
                        weekData['end_date'] = weekData['end_date'];

                        let startMonthName = await this.commonDateService.DateTimeFormat('now', 'MMMM');
                        if(weekData['start_date'] != ''){
                            startMonthName = await this.translatorService.frontendReadTranslation(req.lang, this.commonDateService.DateTimeFormat(weekData['start_date'], 'MMM')?.toString(), `/LC_MESSAGES/Common/Month`,`static`);
                        }

                        let endMonthName = await this.commonDateService.DateTimeFormat('now', 'MMMM');
                        if(weekData['end_date'] != ''){
                            endMonthName = await this.translatorService.frontendReadTranslation(req.lang, this.commonDateService.DateTimeFormat(weekData['end_date'], 'MMM')?.toString(), `/LC_MESSAGES/Common/Month`,`static`);
                        }


                        weekData['start_date_Trans'] = this.commonDateService.DateTimeFormat(weekData['start_date'], 'D')+ ' '+startMonthName + ' '+this.commonDateService.DateTimeFormat(weekData['start_date'], 'YYYY');
                        weekData['end_date_Trans'] = this.commonDateService.DateTimeFormat(weekData['end_date'], 'D')+ ' '+endMonthName + ' '+ this.commonDateService.DateTimeFormat(weekData['end_date'], 'YYYY');
                        let useradded_date = this.commonDateService.DateTimeFormat(schedule['added_date'],'YYYY-MM-DD');
                        let useradded_dateTime = this.commonDateService.DateTimeFormat(useradded_date,'timestamp');

                        if(useradded_dateTime <= this.commonDateService.DateTimeFormat(weekData['end_date'],'timestamp')){
                            if(weekKey == 'week 1' || meetfirstweek == 0) { 
                                weekData['meetfirstweek'] = meetfirstweek = 1; 
                            }else{
                                if(schedule['sc']['rank_type'] == "average_steps"){ 
                                    weekData['progress'] = (weekData['week_goal'] == 0 || weekdatadisable == 'yes') ? '0' : ((((weekData['weeksavg'] * 100) / weekData['week_goal']) > 100) ? 100 : ((weekData['weeksavg'] * 100) / weekData['week_goal']));
                                }else{
                                    weekData['progress'] = (weekData['week_goal'] == 0 || weekdatadisable == 'yes') ? '0' : ((((weekData['weeksteps'] * 100) / weekData['week_goal']) > 100) ? 100 : ((weekData['weeksteps'] * 100) / weekData['week_goal']));
                                }
                            }
                        }else{
                            weekData['data'] = '-';
                        }
                        if(weekData?.['progress'] && weekData['progress'] == 100){
                            weekData['weekStatus'] = 'complete';
                        }else{
                            if((weekData?.['data'] && weekData['data'] == '-') || (weekData?.['meetfirstweek'] && weekData['meetfirstweek'] == 1)){
                                weekData['weekStatus'] = '';
                            }else{
                                if(currentweeknumber > weekKey.replace('week ', '')){
                                    weekData['weekStatus'] = '';
                                }else{
                                        weekData['weekStatus'] = 'pending';
                                }
                            }
                        }
                        if(weekparkDetail['currentweek'] == weekKey){
                            weekdatadisable = 'yes';
                            weekData['weekStatus'] = 'current';
                        }
                        weekparkDetail['weeksarray'][weekKey] = weekData;
                    }
                }
            }
            result['weekinfo'] = Object.values(weekparkDetail['weeksarray']);
            /* Get All Park Details and Calculation */
                if([1,2].includes(schedule['sc']['move_more_display'])){
                    const allParkDetails = await this.moveMoreParksService.GetAllParks(req, schedule['sc'], `mmp.schedule_id = ${schedule_id} AND mmp.status = 1`);
                    const teamAllParkDetails = JSON.parse(JSON.stringify(allParkDetails));

                    if(allParkDetails && allParkDetails.length > 0){
                        let parkprogress = 'yes';
                        if(schedule['sc']['move_more_display'] == 1){
                            MyStepsdata = result?.all_steps_for_park || 0;
                        }
                        let temp_status = false;
                        if(schedule['sc']['lock_steplog_website_click'] == 0){
                            temp_status = true;
                        }
                        let get_current = 0;
                        let completed_lock_locations = (schedule['completed_lock_locations'] !== '' && schedule['completed_lock_locations'] !== null) ? JSON.parse(schedule['completed_lock_locations']) : [];
                        if(completed_lock_locations && completed_lock_locations.length){
                            completed_lock_locations = completed_lock_locations.map(ele=>ele.toString());
                        }
                        for (let park of allParkDetails) {
                            let indexId = allParkDetails.indexOf(park);
                            let currentstepsdata = 0;
                            let currentmilesdata = 0;
                            let currentstepsper = 0;
                            let tempcompletepark = '';
                            let is_clickable = 0;
                            park['is_complete'] = 0;
                            if (MyStepsdata >= park['Rsteps']) {
                                if (schedule['sc']['lock_steplog_website_click'] == 1) {
                                    if (completed_lock_locations.includes(`${park['id']}`) && get_current == 0) {
                                        temp_status = true;
                                    } else {
                                        if (get_current == 0) {
                                            get_current = park['id'];
                                            currentstepsdata = park['steps'];
                                            currentstepsper = 100;
                                            currentmilesdata = park['miles'];
                                            is_clickable = 1;
                                        }
                                        temp_status = false;
                                    }
                                } else {
                                    get_current = park['id'];
                                }
                                if (temp_status == true) {
                                    park['is_complete'] = 1;
                                    tempcompletepark = 'opacity: 0.5;';
                                }
                            } else {
                                if (temp_status == true || get_current == 0) {
                                    if (indexId == 0) {
                                        currentstepsdata = MyStepsdata;
                                    } else {
                                        currentstepsdata = (allParkDetails[indexId - 1]['Rsteps']) ? (MyStepsdata - allParkDetails[indexId - 1]['Rsteps']) : 0;
                                    }
                                    currentmilesdata = parseFloat((currentstepsdata / 2112).toFixed(1));
                                    currentstepsper = ((currentstepsdata * 100) / park['Rsteps']);
                                }
                            }
                            
                            park['is_progress'] = (tempcompletepark != '' ||  parkprogress == 'no') ? 0 : currentstepsper || 0;
                            park['in_miles'] = (parkprogress == 'no') ? 0 : ((tempcompletepark != '') ? park['miles'] : currentmilesdata || 0) ;
                            park['in_steps'] = (parkprogress == 'no') ? 0 : ((tempcompletepark != '') ? park['steps'] : currentstepsdata || 0) ;
                            park['is_clickable'] = is_clickable;
                            if(MyStepsdata < park['Rsteps']){
                                parkprogress = 'no';
                            } 
                        }
                        result['myParkDetails'] = allParkDetails;
                    }
                
                    if(teamAllParkDetails && teamAllParkDetails.length > 0 && schedule['sc']['team'] == 1){
                        let temp_statusTeam = false;
                        let get_currentTeam = 0;
                        let AllTeamuserStepsdata = result['myTeamDetails']['teamsteps'];
                        let parkprogressTeam = 'yes';
                        for (let parkT of teamAllParkDetails) {
                            let indexId = teamAllParkDetails.indexOf(parkT);
                            
                            let currentstepsdataTeam = 0;
                            let currentmilesdataTeam = 0;
                            let currentstepsperTeam = 0;
                            parkT['miles'] = parseFloat((parkT['miles'] * result['myTeamDetails']['teamMember'].length).toFixed(1));
                            parkT['steps'] = (parkT['steps'] * result['myTeamDetails']['teamMember'].length);
                            let tempcompleteparkTeam = '';

                            parkT['is_complete'] = 0;
                            if (AllTeamuserStepsdata >= (parkT['Rsteps'] * result['myTeamDetails']['teamMember'].length)) {
                                get_currentTeam = parkT['id'];
                                temp_statusTeam = true;
                                tempcompleteparkTeam = 'opacity: 0.5;';
                                parkT['is_complete'] = 1;
                            } else {
                                if (temp_statusTeam == true || get_currentTeam == 0) {
                                    if (indexId == 0) {
                                        currentstepsdataTeam = AllTeamuserStepsdata;
                                    } else {
                                        currentstepsdataTeam = (teamAllParkDetails[indexId - 1]['Rsteps']) ? (AllTeamuserStepsdata - (teamAllParkDetails[indexId - 1]['Rsteps'] * result['myTeamDetails']['teamMember'].length)) : 0;
                                    }
                                    currentmilesdataTeam = parseFloat((currentstepsdataTeam / (2112 * result['myTeamDetails']['teamMember'].length)).toFixed(1));
                                    currentstepsperTeam = ((currentstepsdataTeam * 100) / (parkT['Rsteps'] * result['myTeamDetails']['teamMember'].length));
                                }
                            }
                            parkT['is_progress'] = (tempcompleteparkTeam != '' || parkprogressTeam == 'no') ? 0 : currentstepsperTeam;
                            parkT['in_miles'] = (parkprogressTeam == 'no') ? 0 : ((tempcompleteparkTeam != '') ? parkT['miles'] : currentmilesdataTeam) ;
                            parkT['in_steps'] = (parkprogressTeam=='no') ? 0 : ((tempcompleteparkTeam != '') ? parkT['steps'] : currentstepsdataTeam) ;
                            if (AllTeamuserStepsdata < (parkT['Rsteps'] * result['myTeamDetails']['teamMember'].length)) {
                                parkprogressTeam = 'no';
                        }
                        }
                        result['myTeamParkDetails'] = teamAllParkDetails;
                    }
                }
            /* Get All Park Details and Calculation */
            if(show_type == 2){
                if(result.myTeamDetails){
                    delete(result.myTeamDetails)
                }
                if(result.ranking){
                    delete(result.ranking)
                }
                if(result.allteams){
                    delete(result.allteams)
                }
                if(result.participationrankingtotal){
                    delete(result.participationrankingtotal)
                }
                if(result.participationrankingyour){
                    delete(result.participationrankingyour)
                }
                if(result.team_exist){
                    delete(result.team_exist)
                }
                if(result.myTeamParkDetails){
                    delete(result.myTeamParkDetails)
                }
                if(schedule['sc']['move_more_display'] && (schedule['sc']['move_more_display'] == 1 || schedule['sc']['move_more_display'] == 2) ){
                    if(result.myParkDetails && result.myParkDetails.length>0){
                        if(schedule['sc']['move_more_display'] == 1){
                            if(result.weekinfo){
                                delete(result.weekinfo)
                            }
                        }
                        let locationComplete = result?.myParkDetails?.filter(
                            (item) => item.is_complete == 1
                        );
                        const incompleteParks = result?.myParkDetails.filter(park => park.is_complete !== 1);
                        let parkData = incompleteParks.length > 0 ? incompleteParks[0] : null;

                        if(parkData == null){
                            parkData = result?.myParkDetails[result?.myParkDetails.length - 1];
                        }
                        const overalltotalParkSteps = result?.myParkDetails.reduce((sum, park) => sum + park.steps, 0);
                        let overalltotalParkCompletedSteps = result?.all_steps_for_park  || 0;
                        let overalltotalParkACompletedSteps = (overalltotalParkCompletedSteps > 0) ? Math.round(overalltotalParkCompletedSteps / result.myParkDetails.length) : 0;
                        const overalltotalParkASteps = (overalltotalParkSteps > 0) ? Math.round(overalltotalParkSteps / result.myParkDetails.length) : 0;

                        const overallprogress = (overalltotalParkSteps <= 0) ? 0 : ((overalltotalParkCompletedSteps > 0) ? (overalltotalParkCompletedSteps / overalltotalParkSteps) * 100 : 0);
                        const filanoverallprogress = (overallprogress > 100) ? '100' : overallprogress; 


                        result['total_locations'] = result.myParkDetails.length || 0;
                        result['completed_locations'] = locationComplete.length || 0;
                        result['total_locations_str'] = Math.round(locationComplete.length) +'/'+ Math.round(result.myParkDetails.length) + ' '+ await this.translatorService.frontendReadTranslation(req.lang,'Number of Locations Completed', `/LC_MESSAGES/Dashboard/ChallengeProgress`,`static`);
                        result['overall_total_steps'] = overalltotalParkSteps || 0;
                        if(Math.round(overalltotalParkCompletedSteps) > Math.round(overalltotalParkSteps)){
                            overalltotalParkCompletedSteps = overalltotalParkSteps;
                        }
                        result['overall_total_completed_steps'] = overalltotalParkCompletedSteps || 0;
                        result['overall_total_steps_str'] = this.commonArrayService.formatUSStyle(Math.round(overalltotalParkCompletedSteps)) +'/'+ this.commonArrayService.formatUSStyle(Math.round(overalltotalParkSteps)) + ' '+ await this.translatorService.frontendReadTranslation(req.lang,'Overall Total Steps Completed', `/LC_MESSAGES/Dashboard/ChallengeProgress`,`static`);
                        result['overall_average_steps'] = overalltotalParkASteps || 0;
                        if(Math.round(overalltotalParkACompletedSteps) > Math.round(overalltotalParkASteps)){
                            overalltotalParkACompletedSteps = overalltotalParkASteps;
                        }
                        result['overall_average_completed_steps'] = overalltotalParkACompletedSteps || 0;
                        result['overall_average_steps_str'] = this.commonArrayService.formatUSStyle(Math.round(overalltotalParkACompletedSteps)) +'/'+ this.commonArrayService.formatUSStyle(Math.round(overalltotalParkASteps)) + ' '+ await this.translatorService.frontendReadTranslation(req.lang,'Overall Average Steps Completed', `/LC_MESSAGES/Dashboard/ChallengeProgress`,`static`);
                        result['overall_progress'] = filanoverallprogress || 0;
                        if(parkData != null){
                            parkData['in_steps_str'] = (parkData?.in_steps > 0) ? this.commonArrayService.formatUSStyle(parkData.in_steps) + ' '+ await this.translatorService.frontendReadTranslation(req.lang,'Steps/Movement', `/LC_MESSAGES/Dashboard/ChallengeProgress`,`static`) : '0 '+ await this.translatorService.frontendReadTranslation(req.lang,'Steps/Movement', `/LC_MESSAGES/Dashboard/ChallengeProgress`,`static`);
                            parkData['steps_str'] = (parkData?.steps > 0) ? this.commonArrayService.formatUSStyle(parkData.steps) + ' '+ await this.translatorService.frontendReadTranslation(req.lang,'Of Goal', `/LC_MESSAGES/Dashboard/ChallengeProgress`,`static`) : '0 ' + await this.translatorService.frontendReadTranslation(req.lang,'Of Goal', `/LC_MESSAGES/Dashboard/ChallengeProgress`,`static`);
                        }
                        result['MoveMoreParkData'] = parkData || {}
                    }
                }
                if(result.myParkDetails){
                    delete(result.myParkDetails)
                }
                if(result?.weekinfo && result?.weekinfo?.length > 0){
                    let getWeekRange = await this.userChallengeHelperService.getWeekRange(result.currentweeknumber, result.weekinfo.length, 10);
                    const startIndex = getWeekRange[0];
                    const endIndex = getWeekRange[getWeekRange.length - 1];
                    const finalWeekInfo = result.weekinfo.slice(startIndex - 1, endIndex);
                    result['weekinfo']= finalWeekInfo
                }
                let weekTitle = await this.translatorService.frontendReadTranslation(req.lang,`week`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                result['week_trans']=weekTitle
            }
            return result;
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
}