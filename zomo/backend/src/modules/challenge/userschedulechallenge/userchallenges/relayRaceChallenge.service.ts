import { CommonDateService, CommonService } from '@common-constants';
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request } from "express";
import { lastValueFrom } from "rxjs";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { ActivityFeedService } from "src/modules/trackers/activityfeeds/activityfeeds.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { TeamMembersService } from "../../teammembers/teammembers.service";
import { TeamsService } from "../../teams/teams.service";
import { UserScheduleChallengeService } from "../userScheduleChallenge.service";
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD
@Injectable()
export class RelayRaceChallengeHelperService {
    constructor(
        private readonly translatorService: TranslationService,
        private readonly commonService: CommonService,
        private readonly commonDateService: CommonDateService,
        private readonly teamsService: TeamsService,
        private readonly activityFeedsService: ActivityFeedService,
        private readonly teamMembersService: TeamMembersService,
        private readonly userScheduleChallengeService: UserScheduleChallengeService,
        @Inject('COMMON_SERVICE')
            private commonMicroservice: ClientProxy,
        private readonly activityLogService: ActivityLogService,
    ) {}

    async RelayraceChallenge(schedule: any, req: Request, show_type = 1) {
            try {
                let result = Object.create(null);
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
                let user = Object.create(req.tokenUser);
                let orgid = schedule['sc']['org_id'];
                let schedule_id = schedule['sc']['id'];
                let scheduleid = schedule['id'];
                let totaldays = schedule['challengeDetails']['totaldays'];
                let uptodays = schedule['challengeDetails']['uptodays'];
                let ucurrentdate = schedule['challengeDetails']['ucurrentdate'];
                let userId = user.id;
                let timezone = user.timezone;
                let time_elapsed = schedule['sc']['time_elapsed'];
                let hide_comment = schedule?.sc['hide_comment'];
                let hide_history = schedule?.sc['hide_history'];
                if(time_elapsed == 0){
                    time_elapsed = 1;
                }
                let countstepswith = schedule['sc']['countstepswith'];
                let logType = " AND food.logType in('Tracker','Manual')";
                if (countstepswith == 'realstep') {
                    logType = " AND food.logType = 'Tracker'";
                }
                let membershipcode = user.membership_code;
                let matchStartDate: any = schedule.sc.start_date;
                let challengeStartDate = await this.commonDateService.DateTimeFormat(schedule.sc.start_date,'YYYY-MM-DD') + ' 00:00:00';
                let challengeEndDate = await this.commonDateService.DateTimeFormat(schedule.sc.end_date,'YYYY-MM-DD') + ' 23:59:59';
                let challengeStartDateTimeStamp = await this.commonDateService.DateTimeFormat(challengeStartDate,'timestamp', 'YYYY-MM-DD HH:mm:ss');
                let challengeEndDateTimeStamp = await this.commonDateService.DateTimeFormat(challengeEndDate,'timestamp', 'YYYY-MM-DD HH:mm:ss');
                let userCurrentDate = await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD HH:mm:ss');
                let currentDateTimeStamp = moment(userCurrentDate,'YYYY-MM-DD HH:mm:ss').tz('UTC').unix();
                
                let not_reqiured_skip_turn = schedule.sc.hide_comment;
                let not_reqiured_start_turn = schedule.sc.hide_history;
                let maxStepCounted = schedule.sc.dailymaxstepscnt;
                let myGroupID:any = '';
                let myTeamID:any = '';
                if(schedule['sc']['team'] == 1){
                    const allgetteams: any = await this.teamsService.getAllTeams(`team.org_id = ${orgid} AND team.schedule_id = ${schedule_id}`);
                    
                    let groupId = 0;
                    let teamId = 0;
                    let allteams = Object.create(null);
                    let allgroups = Object.create(null);
                    let team_size = 0;

                    let groupTeamRemainingTimeArray = Object.create(null);
                    let groupTeamComplatedTimeArray = Object.create(null);
                    let groupTeamTotalTimeArray = Object.create(null);
                    for (let getteam of allgetteams) {
                        if(getteam['teamMember'] && getteam['teamMember']?.length > 0){
                            getteam['teamMember'] = Object.values(getteam['teamMember']).filter((item)=> item['user']);
                            getteam['teamMember'] = Object.values(getteam['teamMember']).filter((item)=> item['scheduleJoin']);
                        }
                        let teamTimeRequired:any = '00:00:00';
                        let teamTimeRemaining:any = '00:00:00';
                        let teamTimeCompleted:any = '00:00:00';

                        let groupTimeRequired:any = '00:00:00';
                        let groupTimeRemaining:any = '00:00:00';
                        let groupCompletedSteps = 0;
                        let groupAvarageSteps = 0;
                        let groupMetGoalMember = 0;
                        
                        let teamCompletedSteps = 0;
                        let teamAvarageSteps = 0;
                        let teamcreatedBy = 0;
                        team_size = getteam['team_size'];

                        groupId = getteam['group_id'];
                        teamId = getteam['id'];
                        teamcreatedBy = getteam['created_by'];

                        if (!allteams['Teams']) {
                            allteams['Teams'] = Object.create(null);
                        }
                        
                        if (!allteams['Teams'][teamId]) {
                            allteams['Teams'][teamId] = Object.create(null);
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

                        allteams['Teams'][teamId] = getteam;
                        getteam['timeRequired'] = '00:00:00';
                        getteam['timeRemaining'] = '00:00:00';
                        getteam['timeCompleted'] = '00:00:00';
                        getteam['avarageSteps'] = 0;
                        getteam['completedSteps'] = 0;
                        getteam['memberCount'] = 0;
                        getteam['metGoalMemberCount'] = 0;
                        
                        if(getteam['teamMember'] && getteam['teamMember']?.length > 0){
                            if(getteam['teamMember']){
                                getteam['teamMember'] = Object.values(getteam['teamMember']).sort((a, b) => a['user_order'] - b['user_order']);
                            }

                            let allUsersIdArray = getteam['teamMember'].map(member => member['user']?.id ? member['user']?.id : '');
                            const allUsersId:any = allUsersIdArray.filter(item => item !== '').join(',');
                           
                            let remain_team_member = team_size - getteam['teamMember']?.length;
                            for (let getMember of getteam['teamMember']) {
                                if (getMember['user'] && getMember['user']['profile_image'] && getMember['user']['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: getMember['user']['profile_image']}))) {
                                    getMember['user']['profile_image'] = S3_URL + getMember['user']['profile_image'];
                                }
                                else{
                                    getMember['user']['profile_image'] = S3_URL + 'comn/img/avatar_0001.png'; 
                                }
                                if(!getMember['user']['name']){
                                    getMember['user']['name'] = '';
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
                                if (getMember['user'] && (getMember['user']['first_name'] && getMember['user']['last_name'])) {
                                    getMember['user']['name'] = getMember['user']['first_name'] + ' '+ getMember['user']['last_name'];
                                    delete(getMember['user']['first_name']);
                                    delete(getMember['user']['last_name']);
                                }
                                getMember['completedSteps'] = 0;
                            }

                            /* ADD DUPLICATE USER */
                                if (remain_team_member > 0) {
                                    let maxUserOrder = getteam['teamMember'].reduce((max, member) => {
                                        return member.user_order > max ? member.user_order : max;
                                    }, 0);
                                    for (let di = 0; di <= (remain_team_member-1); di++) {
                                        maxUserOrder += 1;
                                        getteam['teamMember'].push({
                                            ...getteam['teamMember'][di],
                                            duplicate: 'yes',
                                            baton_status: 0,
                                            baton_start: '0000-00-00 00:00:00',
                                            user_order: maxUserOrder,
                                            id: 0
                                        });
                                    }
                                }
                            /* END ADD DUPLICATE USER */

                            /* Team time required calculation */
                                let teamTotalTimeinMinutes = getteam['teamMember']?.length * time_elapsed;
                                const duration = moment.duration(teamTotalTimeinMinutes, 'minutes');
                                const hours = Math.floor(duration.asHours());
                                const minutesPart = duration.minutes();
                                const secondsPart = duration.seconds();
                                teamTimeRequired = hours.toString().padStart(2, '0')+':'+minutesPart.toString().padStart(2, '0')+':'+secondsPart.toString().padStart(2, '0');
                                getteam['timeRequired'] = teamTimeRequired;
                                getteam['memberCount'] = getteam['teamMember']?.length;
                            /* Team time required calculation */

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
                                result['myTeamDetails']['memberCount'] = getteam['memberCount'];
                                result['myTeamDetails']['timeRequired'] = teamTimeRequired;
                                result['myTeamDetails']['completedSteps'] = 0;
                                result['myTeamDetails']['avarageSteps'] = 0;
                                result['myTeamDetails']['timeRemaining'] = '00:00:00';
                            }

                            const currentTime = moment.utc(); 
                            let updateData = [];
                            let teamMemberRemainingTimeArray = [];
                            let teamMemberComplatedTimeArray = [];
                            let metGoalTeamMember = 0;
                            let lastEndTime = '';
                            let lastUserButtonStatus = 0;
                            let i = 0;
                            let where = '';
                            let userWhere: any = '';
                            let dateRangeGroup: any = '';
                            let lastMemberBatonEndTime = '';
                            let turnComplete:any = Object.create(null);
                            for (let getMember of getteam['teamMember']) {
                                let teamuserid = getMember.user_id;
                                let oldBatonStatus = getMember.baton_status;
                                getMember['baton_start'] = moment(getMember['baton_start']).format('YYYY-MM-DD HH:mm:ss');
                                if (schedule?.sc?.race_type == 3) {
                                    if(not_reqiured_start_turn == 1){
                                        if(challengeStartDateTimeStamp <= currentDateTimeStamp){
                                            const startDate = i === 0 ? moment.utc(challengeStartDate).clone() : moment(challengeStartDate).clone().add((getMember?.user_order - 1) * time_elapsed, 'minutes');
                                            const endDate = moment.utc(challengeStartDate).clone().add(((getMember?.user_order - 1) + 1) * time_elapsed, 'minutes');
                                            getMember['baton_start'] = startDate.format('YYYY-MM-DD HH:mm:ss');
                                            getMember['baton_end'] = endDate.format('YYYY-MM-DD HH:mm:ss');

                                            /* Total time and remain time calculation */
                                                const startTime = moment.utc(getMember['baton_start']);
                                                const endTime = moment.utc(getMember['baton_end']);
                                                const totalTime = endTime.diff(startTime);
                                                let remainingTime = 0;
                                                if (currentTime.isAfter(startTime) && currentTime.isBefore(endTime)) {
                                                    remainingTime = endTime.diff(currentTime);
                                                } else if (currentTime.isBefore(startTime)) {
                                                    remainingTime = totalTime;
                                                }
                                                const totalTimes = moment.utc(totalTime).format('HH:mm:ss');
                                                const remainingTimes = remainingTime > 0 ? moment.utc(remainingTime).format('HH:mm:ss') : '00:00:00';
                                                getMember['timeRequired'] = totalTimes;
                                                getMember['timeRemaining'] = remainingTimes;

                                                const requiredDuration = moment.duration(getMember['timeRequired']);
                                                const remainingDuration = moment.duration(getMember['timeRemaining']);
                                                const completedDuration = requiredDuration.subtract(remainingDuration);
                                                const completedHours = Math.floor(completedDuration.asHours());
                                                const completedMinutes = completedDuration.minutes();
                                                const completedSeconds = completedDuration.seconds();
                                                const completedTimes = completedHours.toString().padStart(2, '0')+':'+completedMinutes.toString().padStart(2, '0')+':'+completedSeconds.toString().padStart(2, '0');
                                                getMember['timeCompleted'] = completedTimes;

                                                teamMemberRemainingTimeArray.push(remainingTimes);
                                                teamMemberComplatedTimeArray.push(completedTimes);
                                            /* Total time and remain time calculation */
                                            /* Baton status calculation */
                                                let buttonEndTimeStamp = await this.commonDateService.DateTimeFormat(getMember['baton_end'],'timestamp', 'YYYY-MM-DD HH:mm:ss');
                                                if(getMember?.baton_status == 1){
                                                    getMember['baton_status'] = 2;
                                                    if(buttonEndTimeStamp <= currentDateTimeStamp){
                                                        getMember['baton_status'] = 3;
                                                    }
                                                    lastUserButtonStatus = getMember['baton_status'];
                                                }else if([2,3].includes(getMember?.baton_status)){
                                                    lastUserButtonStatus = getMember?.baton_status;
                                                    if(buttonEndTimeStamp <= currentDateTimeStamp && getMember?.baton_status == 2){
                                                        getMember['baton_status'] = 3;
                                                        lastUserButtonStatus = getMember?.baton_status;
                                                    }
                                                }else if(getMember?.baton_status == 0 && lastUserButtonStatus == 3){
                                                    getMember['baton_status'] = 2;
                                                    if(buttonEndTimeStamp <= currentDateTimeStamp){
                                                        getMember['baton_status'] = 3;
                                                    }
                                                    lastUserButtonStatus = getMember['baton_status'];
                                                }
                                                if(getMember['baton_status'] == 3){
                                                    metGoalTeamMember += 1;
                                                }
                                            /* Baton status calculation */
                                        }
                                    }else{
                                        if(getMember?.baton_status == 2 || getMember?.baton_status == 3){
                                            const startDate = getMember?.baton_start;
                                            const endDate = moment.utc(startDate).clone().add(time_elapsed, 'minutes');
                                            getMember['baton_end'] = endDate.format('YYYY-MM-DD HH:mm:ss');
                                            lastMemberBatonEndTime = getMember['baton_end'];
                                        }
                                        if(getMember?.baton_status == 2){
                                            let buttonEndTimeStamp = await this.commonDateService.DateTimeFormat(getMember['baton_end'],'timestamp', 'YYYY-MM-DD HH:mm:ss');
                                            if(buttonEndTimeStamp <= currentDateTimeStamp){
                                                getMember['baton_status'] = 3;
                                            }
                                            lastUserButtonStatus = getMember?.baton_status;
                                        }else if(getMember?.baton_status == 3){
                                            lastUserButtonStatus = getMember?.baton_status;
                                        }else if(getMember?.baton_status == 1){
                                            lastUserButtonStatus = getMember?.baton_status;
                                        }
                                        
                                        if(lastUserButtonStatus == 3 && getMember?.baton_status == 0){
                                            getMember['baton_status'] = 1;
                                            /* Manual Start turn challenge in duplicat member auto start code */
                                                if(getMember?.duplicate !== undefined || getMember?.duplicate === 'yes'){
                                                    getMember['baton_status'] = 2;
                                                    const endDateD = moment.utc(lastMemberBatonEndTime).clone().add(time_elapsed, 'minutes');
                                                    getMember['baton_start'] = lastMemberBatonEndTime;
                                                    getMember['baton_end'] = endDateD.format('YYYY-MM-DD HH:mm:ss');
                                                    let buttonEndTimeStamp = await this.commonDateService.DateTimeFormat(getMember['baton_end'],'timestamp', 'YYYY-MM-DD HH:mm:ss');
                                                    if(buttonEndTimeStamp <= currentDateTimeStamp){
                                                        getMember['baton_status'] = 3;
                                                    }
                                                    lastMemberBatonEndTime = getMember['baton_end'];
                                                }
                                            /* Manual Start turn challenge in duplicat member auto start code */
                                            lastUserButtonStatus = getMember?.baton_status;
                                        }

                                        if(getMember['baton_status'] == 3){
                                            metGoalTeamMember += 1;
                                        }

                                        /* Total time and remain time calculation */
                                            let TotalTimeinMinutes = time_elapsed;
                                            const memberDuration = moment.duration(TotalTimeinMinutes, 'minutes');
                                            const memberHours = Math.floor(memberDuration.asHours());
                                            const memberMinutes = memberDuration.minutes();
                                            const memberSecond = memberDuration.seconds();
                                            getMember['timeRequired'] = memberHours.toString().padStart(2, '0')+':'+memberMinutes.toString().padStart(2, '0')+':'+memberSecond.toString().padStart(2, '0');
                                            getMember['timeRemaining'] = getMember['timeRequired'];
                                            getMember['timeCompleted'] = '00:00:00';
                                            if(getMember?.baton_status == 2 || getMember?.baton_status == 3){
                                                const startTime = moment.utc(getMember['baton_start']);
                                                const endTime = moment.utc(getMember['baton_end']);
                                                let remainingTime = 0;
                                                if (currentTime.isAfter(startTime) && currentTime.isBefore(endTime)) {
                                                    remainingTime = endTime.diff(currentTime);
                                                } else if (currentTime.isBefore(startTime)) {
                                                    remainingTime = getMember['timeRequired'];
                                                }
                                                const remainingTimes = remainingTime > 0 ? moment.utc(remainingTime).format('HH:mm:ss') : '00:00:00';
                                                getMember['timeRemaining'] = remainingTimes;

                                                const requiredDuration = moment.duration(getMember['timeRequired']);
                                                const remainingDuration = moment.duration(getMember['timeRemaining']);
                                                const completedDuration = requiredDuration.subtract(remainingDuration);
                                                const completedHours = Math.floor(completedDuration.asHours());
                                                const completedMinutes = completedDuration.minutes();
                                                const completedSeconds = completedDuration.seconds();
                                                const completedTimes = completedHours.toString().padStart(2, '0')+':'+completedMinutes.toString().padStart(2, '0')+':'+completedSeconds.toString().padStart(2, '0');
                                                getMember['timeCompleted'] = completedTimes;

                                                teamMemberRemainingTimeArray.push(remainingTimes);
                                                teamMemberComplatedTimeArray.push(completedTimes);
                                            }
                                            if(getMember?.baton_status == 0 || getMember?.baton_status == 1){
                                                teamMemberRemainingTimeArray.push(getMember['timeRemaining']);
                                                teamMemberComplatedTimeArray.push(getMember['timeCompleted']);
                                            }
                                        /* Total time and remain time calculation */
                                    }

                                    /* User baton status and time update array */
                                        if(oldBatonStatus != getMember['baton_status'] && (getMember?.duplicate == undefined || getMember?.duplicate != 'yes')){
                                            if(getMember['baton_status'] == 3 && teamId == myTeamID){
                                                if(!turnComplete[teamId]){    
                                                    turnComplete[teamId] = [];
                                                }
                                                if(!turnComplete[teamId]['userData']){    
                                                    turnComplete[teamId]['userData'] = [];
                                                }

                                                turnComplete[teamId]['schedule_id'] = schedule_id;
                                                turnComplete[teamId]['userData'].push(getMember);
                                            }
                                            if(getMember['baton_start'] == 'Invalid Date'){
                                                getMember['baton_start'] = '0000-00-00 00:00:00';
                                            }
                                            let updateData1:any = {'id' : getMember['id'],'baton_status' : getMember['baton_status'],'baton_start' : getMember['baton_start']};
                                            updateData.push(updateData1);
                                        }
                                    /* User baton status and time update array */
                                    /* User baton status according get step query conditons */
                                        if([2,3].includes(getMember?.baton_status)){
                                            getMember['baton_start'] = moment(getMember['baton_start']).format('YYYY-MM-DD HH:mm:ss');
                                            getMember['baton_end'] = moment(getMember['baton_end']).format('YYYY-MM-DD HH:mm:ss');
                                            where = `food.status != 2 AND (food.activityTypeId in ${findall} OR food.appName='AppleHealthKit' OR food.appName='GoogleFit') ${logType} AND `;
                                            if(dateRangeGroup != ''){
                                                dateRangeGroup = `${dateRangeGroup} WHEN DATE_FORMAT(CONCAT(DATE_FORMAT(food.collectionDate, '%Y-%m-%d' ),' ', DATE_FORMAT(food.timestamp, '%H:%i:%s')),'%Y-%m-%d %H:%i:%s') BETWEEN '${getMember['baton_start']}'  AND '${getMember['baton_end']}' THEN '${getMember['baton_start']} - ${getMember['baton_end']}'`;
                                            }else{
                                                dateRangeGroup = `CASE WHEN DATE_FORMAT(CONCAT(DATE_FORMAT(food.collectionDate, '%Y-%m-%d' ),' ', DATE_FORMAT(food.timestamp, '%H:%i:%s')),'%Y-%m-%d %H:%i:%s') BETWEEN '${getMember['baton_start']}'  AND '${getMember['baton_end']}' THEN '${getMember['baton_start']} - ${getMember['baton_end']}'`;
                                            }

                                            if(userWhere != ''){
                                                userWhere = `${userWhere} OR (food.user_id in (${getMember['user_id']}) AND  DATE_FORMAT(CONCAT(DATE_FORMAT(food.collectionDate, '%Y-%m-%d' ),' ', DATE_FORMAT(food.timestamp, '%H:%i:%s')),'%Y-%m-%d %H:%i:%s') BETWEEN '${getMember['baton_start']}'  AND '${getMember['baton_end']}')`;
                                            }else{
                                                userWhere = `(food.user_id in (${getMember['user_id']}) AND  DATE_FORMAT(CONCAT(DATE_FORMAT(food.collectionDate, '%Y-%m-%d' ),' ', DATE_FORMAT(food.timestamp, '%H:%i:%s')),'%Y-%m-%d %H:%i:%s') BETWEEN '${getMember['baton_start']}'  AND '${getMember['baton_end']}')`;
                                            }
                                        }
                                    /* User baton status according get step query conditons */
                                }
                                i++;
                            }
                            
                            /* Send Email for portion is complete */
                                if(turnComplete[myTeamID] && turnComplete[myTeamID]['userData'].length > 0){
                                    await this.userScheduleChallengeService.portionCompleteEmail(turnComplete[myTeamID], req);
                                }
                            /* Send Email for portion is complete */
                            
                            /* User baton status and time update query */
                                if(updateData.length > 0){
                                    const ids = updateData.map(update => update.id);
                                    const batonStatusCase = updateData
                                    .map(update => `WHEN id = ${update.id} THEN '${update.baton_status}'`)
                                    .join(' ');
                                    const batonStartCase = updateData
                                    .map(update => `WHEN id = ${update.id} THEN '${(update.baton_start == '0000-00-00 00:00:00' || update.baton_start == 'Invalid Date'  || update.baton_start == 'Invalid date') ? '0000-00-00 00:00:00' : moment(update.baton_start).format('YYYY-MM-DD HH:mm:ss')}'`)
                                    .join(' ');
                                    const updateSet = {
                                        baton_status: () => `CASE ${batonStatusCase} END`,
                                        baton_start: () => `CASE ${batonStartCase} END`,
                                    };
                                    
                                    await this.teamMembersService.updateMultiple({'id': ids}, updateSet);
                                }
                            /* User baton status and time update query */

                            /* Get user step and user & team step caclulation */
                                if(where != '' || userWhere != ''){  
                                    where = where + `(${userWhere})`;
                                }

                                let dateRangeGroupFinal = '';
                                if(dateRangeGroup != ''){  
                                    dateRangeGroupFinal = dateRangeGroup + ' END as dateRangeGroup';
                                }

                                let allStepsData:any = '';
                                if(dateRangeGroupFinal != '' && where != ''){
                                    allStepsData = await this.activityFeedsService.getUserActivityData(where, ['SUM(food.steps) as steps', 'food.user_id as user_id', dateRangeGroupFinal], 'food.user_id,  dateRangeGroup');
                                }
                                if(allStepsData && allStepsData.length > 0){
                                    for (let getMember of getteam['teamMember']) {
                                        
                                        let dateRangeGroups = getMember['baton_start'] +' - '+ getMember['baton_end'];
                                        const memberStepData = allStepsData.find(
                                            (item) => item.dateRangeGroup === dateRangeGroups && item.user_id === getMember['user_id'],
                                        );
                                        if(memberStepData !== undefined){
                                            let memberComplatedSteps = memberStepData?.steps;
                                            if(memberStepData?.steps >= maxStepCounted && maxStepCounted != 0){
                                                memberComplatedSteps = maxStepCounted;
                                            }
                                            getMember['completedSteps'] = Number(memberComplatedSteps);
                                        }
                                        teamCompletedSteps += getMember['completedSteps'];
                                    }
                                    getteam['completedSteps'] = teamCompletedSteps;
                                    teamAvarageSteps = parseFloat((teamCompletedSteps / getteam['teamMember']?.length).toFixed(2));
                                    getteam['avarageSteps'] = teamAvarageSteps;
                                    if(allUsersIdArray.includes(userId)){
                                        result['myTeamDetails']['completedSteps'] = teamCompletedSteps;
                                        result['myTeamDetails']['avarageSteps'] = teamAvarageSteps;
                                    }
                                }
                            /* Get user step and user & team step caclulation */
                            /* Team Remaining time caclulation */
                                let totalRemainingDuration = moment.duration();
                                if(teamMemberRemainingTimeArray?.length > 0){
                                    teamTimeRemaining = await this.commonDateService.calculateTotalTimeinArray(teamMemberRemainingTimeArray);
                                    getteam['timeRemaining'] =  teamTimeRemaining;
                                    if(allUsersIdArray.includes(userId)){
                                        result['myTeamDetails']['timeRemaining'] = teamTimeRemaining;
                                    }
                                }
                            /* Team Remaining time caclulation */
                            /* Team Completed time caclulation */
                                let totalCompletedDuration = moment.duration();
                                if(teamMemberComplatedTimeArray?.length > 0){
                                    teamTimeCompleted = await this.commonDateService.calculateTotalTimeinArray(teamMemberComplatedTimeArray);
                                    getteam['timeCompleted'] = teamTimeCompleted;
                                    if(allUsersIdArray.includes(userId)){
                                        result['myTeamDetails']['timeCompleted'] = teamTimeCompleted;
                                    }
                                }
                            /* Team Completed time caclulation */
                            getteam['metGoalMemberCount'] = metGoalTeamMember;
                            allteams['Teams'][teamId]['teamMember'] = getteam['teamMember'];
                            if(allUsersIdArray.includes(userId)){
                                result['myTeamDetails']['teamMember'] = getteam['teamMember'];
                                result['myTeamDetails']['metGoalMemberCount'] = metGoalTeamMember;
                            }
                            if (schedule['sc']['group_status'] == 1 && groupId != 0) {
                                const groupTeamCount = allgetteams.filter(team => team.group_id === groupId).length;
                                if (!allgroups['Groups']) {
                                    allgroups['Groups'] = Object.create(null);
                                }
                                if (!allgroups['Groups'][groupId]) {
                                    allgroups['Groups'][groupId] = Object.create(null);
                                }
                                if(allgroups['Groups'][groupId]['completedSteps']){
                                    groupCompletedSteps = allgroups['Groups'][groupId]['completedSteps'] + teamCompletedSteps;
                                }else{
                                    groupCompletedSteps = teamCompletedSteps;
                                }

                                if(allgroups['Groups'][groupId]['avarageSteps']){
                                    groupAvarageSteps = allgroups['Groups'][groupId]['avarageSteps'] + teamAvarageSteps;
                                }else{
                                    groupAvarageSteps = teamAvarageSteps;
                                }

                                if(allgroups['Groups'][groupId]['metGoalMemberCount']){
                                    groupMetGoalMember = allgroups['Groups'][groupId]['metGoalMemberCount'] + metGoalTeamMember;
                                }else{
                                    groupMetGoalMember = metGoalTeamMember;
                                }

                                if (!groupTeamTotalTimeArray[groupId]) {
                                    groupTeamTotalTimeArray[groupId] = [];
                                }
                                groupTeamTotalTimeArray[groupId].push(teamTimeRequired);

                                if (!groupTeamRemainingTimeArray[groupId]) {
                                    groupTeamRemainingTimeArray[groupId] = [];
                                }
                                groupTeamRemainingTimeArray[groupId].push(teamTimeRemaining);

                                if (!groupTeamComplatedTimeArray[groupId]) {
                                    groupTeamComplatedTimeArray[groupId] = [];
                                }
                                groupTeamComplatedTimeArray[groupId].push(teamTimeCompleted);

                                allgroups['Groups'][groupId]['completedSteps'] = parseFloat(groupCompletedSteps.toFixed(2));
                                allgroups['Groups'][groupId]['avarageSteps'] = parseFloat(groupAvarageSteps.toFixed(2));
                                allgroups['Groups'][groupId]['metGoalMemberCount'] = groupMetGoalMember;
                                allgroups['Groups'][groupId]['timeRequired'] = '00:00:00';
                                allgroups['Groups'][groupId]['timeRemaining'] = '00:00:00';;
                                allgroups['Groups'][groupId]['timeCompleted'] = '00:00:00';;
                                allgroups['Groups'][groupId]['group_id'] = groupId;
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
                            if(allgroups['Groups'][groupId]['completedSteps']){
                                groupCompletedSteps = 0;
                            }else{
                                groupCompletedSteps = 0;
                            }

                            if(allgroups['Groups'][groupId]['avarageSteps']){
                                groupAvarageSteps = 0;
                            }else{
                                groupAvarageSteps = 0;
                            }

                            if(allgroups['Groups'][groupId]['metGoalMemberCount']){
                                groupMetGoalMember = 0;
                            }else{
                                groupMetGoalMember = 0;
                            }

                            if (!groupTeamTotalTimeArray[groupId]) {
                                groupTeamTotalTimeArray[groupId] = [];
                            }
                            groupTeamTotalTimeArray[groupId].push(0);

                            if (!groupTeamRemainingTimeArray[groupId]) {
                                groupTeamRemainingTimeArray[groupId] = [];
                            }
                            groupTeamRemainingTimeArray[groupId].push(0);

                            if (!groupTeamComplatedTimeArray[groupId]) {
                                groupTeamComplatedTimeArray[groupId] = [];
                            }
                            groupTeamComplatedTimeArray[groupId].push(0);

                            allgroups['Groups'][groupId]['completedSteps'] = 0;
                            allgroups['Groups'][groupId]['avarageSteps'] = 0;
                            allgroups['Groups'][groupId]['metGoalMemberCount'] = 0;
                            allgroups['Groups'][groupId]['timeRequired'] = '00:00:00';
                            allgroups['Groups'][groupId]['timeRemaining'] = '00:00:00';;
                            allgroups['Groups'][groupId]['timeCompleted'] = '00:00:00';;
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
                    }
                    const rankingrequirement = (schedule?.sc?.requirement_base_on) ? schedule.sc.requirement_base_on : 0;
                    let sortedTeams = [];
                    if(allteams['Teams']){
                        if(schedule?.sc?.race_type == 3){
                            if (rankingrequirement == 0) {
                                sortedTeams = this.teamsService.sortTeamsByOnField(allteams['Teams'],'completedSteps');
                            } else {
                                sortedTeams = this.teamsService.sortTeamsByOnField(allteams['Teams'],'metGoalMemberCount');
                            }
                        }
                    }
                    
                    let sortedGroups = [];
                    if(allgroups['Groups']){
                        if(schedule?.sc?.race_type == 3){
                            if (rankingrequirement == 0) {
                                sortedGroups = this.teamsService.sortTeamsByOnField(allgroups['Groups'],'completedSteps');
                            } else {
                                sortedGroups = this.teamsService.sortTeamsByOnField(allgroups['Groups'],'metGoalMemberCount');
                            }
                        }
                    }
        
                    if(sortedGroups){
                        for (let groupKey in sortedGroups) {
                            let groupTimeRequired:any = '00:00:00';
                            let groupTimeRemaining:any = '00:00:00';
                            let groupTimeCompleted:any = '00:00:00';
                            
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

                            /* Group Total time caclulation */
                                let groupTotalTimeDuration = moment.duration();
                                let groupTotalTimeArray = [];
                                if(groupTeamTotalTimeArray[gID]){
                                    groupTotalTimeArray = groupTeamTotalTimeArray[gID];
                                }
                                if(groupTotalTimeArray?.length > 0){
                                    groupTimeRequired = await this.commonDateService.calculateTotalTimeinArray(groupTotalTimeArray); 
                                    sortedGroups[groupKey]['timeRequired'] =  groupTimeRequired;
                                }
                            /* Group Total time caclulation */
                            /* Group Remaining time caclulation */
                                let groupTotalRemainingDuration = moment.duration();
                                let groupRemainTimeArray = [];
                                if(groupTeamRemainingTimeArray[gID]){
                                    groupRemainTimeArray = groupTeamRemainingTimeArray[gID];
                                }
                                if(groupRemainTimeArray?.length > 0){
                                    groupTimeRemaining = await this.commonDateService.calculateTotalTimeinArray(groupRemainTimeArray); 
                                    sortedGroups[groupKey]['timeRemaining'] =  groupTimeRemaining;
                                }
                            /* Group Remaining time caclulation */
                            /* Group Completed time caclulation */
                                let groupTotalCompletedDuration = moment.duration();
                                let groupCompleteTimeArray = [];
                                if(groupTeamComplatedTimeArray[gID]){
                                    groupCompleteTimeArray = groupTeamComplatedTimeArray[gID];
                                }
                                if(groupCompleteTimeArray?.length > 0){
                                    groupTimeCompleted = await this.commonDateService.calculateTotalTimeinArray(groupCompleteTimeArray); 
                                    sortedGroups[groupKey]['timeCompleted'] =  groupTimeCompleted;
                                }
                            /* Group Completed time caclulation */
                        }
                    }
                    if(sortedTeams && sortedTeams.length > 0){
                        result['allteams'] = sortedTeams;
                    }
                    if(sortedGroups && sortedGroups.length > 0){
                        result['allgroups'] = sortedGroups;
                    }
                    /* Popup and button caclulation */
                    let customname = '';
                    if (schedule['sc']['custom_cname'] !== undefined) {
                        customname = await this.translatorService.frontendReadTranslation(req.lang,`custom_cname_${schedule['sc']['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${schedule['sc']['org_id']}/${schedule['sc']['id']}`,`dynamic`);
                        if (customname == '' || customname === `custom_cname_${schedule['sc']['id']}`) {
                            customname = schedule['sc']['custom_cname'];
                        }
                        customname = customname && customname != '' ? customname : schedule['sc']['custom_cname'];
                    }
                    
                    if (schedule['sc']['custom_cname']?.trim() === "") {
                        customname = await this.translatorService.frontendReadTranslation(req.lang,`challenge_name_${schedule['ch']['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${schedule['ch']['id']}`,`dynamic`);
                        if (customname == '' || customname === `challenge_name_${schedule['ch']['id']}`) {
                            customname = schedule['ch']['challenge_name'];
                        }
                        customname = customname && customname != '' ? customname : schedule['sc']['custom_cname'];
                    }
                    let congratulationsText = await this.translatorService.frontendReadTranslation(req.lang,`Congratulations`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    let yourTeamText = await this.translatorService.frontendReadTranslation(req.lang,`Your team`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    let youHaveBatonText = await this.translatorService.frontendReadTranslation(req.lang,`You have the baton. Please click on`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    let startYourTurnText = await this.translatorService.frontendReadTranslation(req.lang,`to start your turn`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    let readyText = await this.translatorService.frontendReadTranslation(req.lang,'I Am Ready', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    let skipText = await this.translatorService.frontendReadTranslation(req.lang,'Skip My Turn', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    let clickText = await this.translatorService.frontendReadTranslation(req.lang,'or click', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    let clickOnText = await this.translatorService.frontendReadTranslation(req.lang,'Click on', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    let notReadyText = await this.translatorService.frontendReadTranslation(req.lang,'If you close this popup challenge will start', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    let joinedText = await this.translatorService.frontendReadTranslation(req.lang,'You have joined the', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    let teamGoalCompleteText = await this.translatorService.frontendReadTranslation(req.lang,'Your team goal is to complete', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    if(result['myTeamDetails'] && result['myTeamDetails']['teamMember'] && result['myTeamDetails']['teamMember'].length > 0){
                        let popup = {};
                        let showPopup = 0;
                        let title;
                        let subTitle;
                        let titleText;
                        let buttonText1;
                        let buttonText2;
                        let teamName = result['myTeamDetails']['tname'] || '';
                        let current_button = result['myTeamDetails']['teamMember']
                            .filter(member => member.baton_status === 1 && member.status === 1)
                            .reduce((result, member) => {
                                result[member.user_id] = member;
                                return result;
                            }, {});
                        if (current_button.length === 0) {
                            current_button = result['myTeamDetails']['teamMember']
                            .filter(member => member.baton_status === 2 && member.status === 1)
                            .reduce((result, member) => {
                                result[member.user_id] = member;
                                return result;
                            }, {});
                        }
                        let current_join = result['myTeamDetails']['teamMember']
                            .filter(member => member.baton_status !== 3 && member.status === 1 && (member?.duplicate === undefined || member.duplicate === 'no'))
                            .reduce((result, member) => {
                                result[member.user_id] = member; 
                                return result;
                            }, {});
                        let complete_race_user = result['myTeamDetails']['teamMember']
                            .filter(member => member.baton_status === 3 && member.status === 1)
                            .reduce((result, member) => {
                                result[member.user_id] = member;
                                return result;
                            }, {});
                            let complete_race_user_only = result['myTeamDetails']['teamMember'].filter(
                            member => member.baton_status === 3 && member.status === 1 && (member?.duplicate === undefined || member.duplicate === 'no')
                            );
                        let original_team_member = result['myTeamDetails']['teamMember'].filter(member => (member?.duplicate === undefined || member.duplicate === 'no'));
                        let complete_race = complete_race_user_only.length;
                        let teammember = original_team_member.length;
                        let totalmember = Array.isArray(current_button) ? current_button.length : Object.keys(current_button).length + complete_race;
                        let array_complete_race_user_only = result['myTeamDetails']['teamMember'].filter(
                            member => member.baton_status === 3 && member.status === 1
                            );
                        let array_original_team_member = result['myTeamDetails']['teamMember'];
                        let array_complete_race = array_complete_race_user_only.length;
                        let array_teammember = array_original_team_member.length;
                        let current = result['myTeamDetails']['teamMember'].filter(
                                member => 
                                    (member.baton_status === 1 && member.status === 1) || 
                                    (member.baton_status === 2 && member.status === 1)
                            );
                        let user_name = current?.[0]?.user?.name || '';
                        let relay_race_img = `${S3_URL}challenge/img/big/Relay-Race-Challenge.png`;
                        let goal = 0;
                        let goal_type ='';
                        if (schedule['sc'].race_type === 3) {
                            goal = time_elapsed;
                            goal_type = 'Minutes';
                        } else {
                            goal = schedule['sc'].numberofsteps ?? 0;
                            goal_type = 'Steps';
                        }
                        let relay_race_detail = result['myTeamDetails']['teamMember']?.filter(
                            member => member.user_id === userId
                            );
                        relay_race_detail = relay_race_detail.length > 0 ? JSON.parse(relay_race_detail[0]['scheduleJoin']?.relay_race_detail) : null;
                        for(let ele of result['myTeamDetails']['teamMember']?.filter(
                            member => member.user_id === userId
                            )){
                            const isDuplicate = ele?.duplicate === undefined ? 'no' : ele?.duplicate;
                            // new buttons
                            if (
                                    (complete_race_user[userId] && (relay_race_detail?.passbaton == '' && relay_race_detail?.completeteam == '')) ||
                                    (current_join[userId] && relay_race_detail?.join == '') ||
                                    (current_button[userId] && current_button[userId]?.baton_status === 1 && (relay_race_detail?.accept =='' || relay_race_detail?.join =='')) ||
                                    (complete_race_user[userId] && array_complete_race !== array_teammember && relay_race_detail?.passbaton =='') ||
                                    (array_complete_race === array_teammember && relay_race_detail?.completeteam == '') ||
                                    (current_button.length > 0 && current_join[userId] && current.length > 0 && current[0].user_order + 1 === current_join[userId]?.user_order && current_join[userId]?.baton_status === 0 && relay_race_detail?.next =='') ||
                                    (!relay_race_detail)
                                ) 
                            {
                                if (Object.keys(current_join).length > 0 && current_join[userId] && ele.user_id == userId && !relay_race_detail?.join) {
                                    showPopup = 1;
                                    let yourTeamMemberText = await this.translatorService.frontendReadTranslation(req.lang,`Your team member`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                    let firstMemberBatonText = await this.translatorService.frontendReadTranslation(req.lang,`is the first member to have the baton`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                    titleText = congratulationsText + ' ' + joinedText + ` ${customname} ` + teamGoalCompleteText + ` ${goal} ${goal_type}. ${yourTeamMemberText} ${user_name} ${firstMemberBatonText} !`
                                }
                                if(Object.keys(current_button).length > 0 && current_button[userId] && current_button[userId].baton_status === 1 && (!relay_race_detail?.accept || !relay_race_detail?.join) && moment(userCurrentDate).format() >= moment(challengeStartDate).format())
                                {
                                    showPopup = 1;
                                    if(schedule.sc['race_type'] == 3 && hide_comment == 0 && hide_history == 0){
                                        title= youHaveBatonText + ` <b>"`+ readyText + `"</b> ` + startYourTurnText;
                                        if(teammember >1 && totalmember !== teammember){
                                            subTitle = clickText + ` <b>"`+ skipText +`"</b> ` + notReadyText;
                                        }
                                    }
                                    else if(schedule.sc['race_type'] == 3 && (hide_comment == 0 && hide_history == 1)){
                                        title = youHaveBatonText
                                        if(teammember >1 && totalmember !== teammember){
                                            subTitle = clickOnText + ` <b>"` + skipText+ `"</b> ` + notReadyText;
                                        }
                                        if(schedule.sc['race_type'] == 3 && hide_comment == 0 && hide_history == 1){
                                            titleText = await this.translatorService.frontendReadTranslation(req.lang,`If you close this popup challenge will start`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                        }
                                    }
                                    else if(schedule.sc['race_type'] == 3 && (hide_comment == 1 && hide_history == 0)){
                                        title = youHaveBatonText +` <b> "` + readyText + `" </b> ` + startYourTurnText;
                                    }
                                    if(schedule.sc['race_type'] == 3 && current_button[userId] && current_button[userId]?.['baton_status'] == 1 && userCurrentDate >= challengeStartDate){
                                        if(hide_comment == 0 && hide_history == 0){
                                            buttonText1 = readyText;
                                            if(teammember > 1 && totalmember !== teammember){
                                                buttonText2 = skipText;
                                            }
                                        }
                                        else if(hide_comment == 0 && hide_history == 1){
                                            if(teammember > 1 && totalmember !== teammember){
                                                buttonText2 = skipText;
                                            }
                                        }
                                        else if(hide_comment == 1 && hide_history == 0){
                                            buttonText1 = readyText;
                                        }
                                    }
                                    else{
                                        buttonText1 = await this.translatorService.frontendReadTranslation(req.lang,'Back To Challenge', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                    }
                                }
                                else if (complete_race_user[userId] && array_complete_race !== array_teammember && !relay_race_detail?.passbaton) 
                                {
                                    showPopup = 1;
                                    let translation = await this.translatorService.frontendReadTranslation(req.lang,`The baton has been passed to`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                    titleText = translation + ` (${user_name})`;
                                }
                                else if (complete_race_user[userId] && array_complete_race === array_teammember && !relay_race_detail?.completeteam && ele?.timeRemaining == '00:00:00') 
                                {
                                    showPopup = 1;
                                    let translation = await this.translatorService.frontendReadTranslation(req.lang,`has completed the entire challenge`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                    titleText = congratulationsText + ` ` + yourTeamText + ` ${teamName} ` + translation +  ` ${customname}!`
                                }
                                else if (Object.keys(current_button).length > 0 && current_join[userId] && current.length > 0 && current[0].user_order + 1 === current_join[userId].user_order && current_join[userId].baton_status === 0 && !relay_race_detail?.next)
                                {
                                    showPopup = 1;
                                    titleText = await this.translatorService.frontendReadTranslation(req.lang,`You are next in line to receive the Baton. Get ready`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                }
                            }
                            else{
                                if(array_complete_race === array_teammember && !relay_race_detail?.completeteam){
                                    showPopup = 1;
                                    let translation = await this.translatorService.frontendReadTranslation(req.lang,`has completed the entire challenge`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                    titleText = congratulationsText + ` ` + yourTeamText + ` ${teamName} ` + translation +  ` ${customname}!`
                                }
                                if (Object.keys(current_button).length > 0 && !complete_race_user[userId] && !current_button[userId] &&  current.length > 0 && current[0].user_order + 1 === ele.user_order)
                                {
                                    showPopup = 1;
                                    titleText = await this.translatorService.frontendReadTranslation(req.lang,`You are next in line to receive the Baton. Get ready`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                }
                                if (complete_race_user[userId] && array_complete_race !== array_teammember && !relay_race_detail?.passbaton){
                                    showPopup = 1;
                                    titleText = congratulationsText + `! ` + await this.translatorService.frontendReadTranslation(req.lang,`You have completed your required challenge goal and have passed the baton to the next team member`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                                }
                            }

                            // new buttons 2

                        }
                        if(showPopup){
                            popup['title'] = title;
                            popup['subTitle'] = subTitle;
                            popup['titleText'] = titleText;
                            popup['buttonText1'] = buttonText1;
                            popup['buttonText2'] = buttonText2;
                            popup['image'] = relay_race_img;
                            result['popup'] = popup;
                        }
                    }
                    /* Popup and button caclulation */
                }   
                if(result['myTeamDetails']){
                    const completedSeconds = this.timeToSeconds(result['myTeamDetails']?.timeCompleted);
                    const requiredSeconds = this.timeToSeconds(result['myTeamDetails']?.timeRequired);
                    const progress = requiredSeconds == 0 ? 0 : (completedSeconds / requiredSeconds) * 100;
                    let translate = await this.translatorService.frontendReadTranslation(req.lang, 'Steps', `/LC_MESSAGES/Trackers/Exercise`, `static`) + ' ' + await this.translatorService.frontendReadTranslation(req.lang,'Completed', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    result['myTeamDetails']['progress'] = progress;
                    result['myTeamDetails']['bottomLeftText'] = `${result['myTeamDetails']?.completedSteps} ${translate}`;
                }
                if(show_type == 2){
                    if(result['allteams']){
                        delete(result['allteams'])
                    }
                    if(result['allgroups']){
                        delete(result['allgroups'])
                    }
                    if(result['team_exist']){
                        delete(result['team_exist'])
                    }
                    if (result['myTeamDetails']) {
                        let translationParams = await this.translatorService.frontendReadTranslation(req.lang, 'Steps', `/LC_MESSAGES/Trackers/Exercise`, `static`);
                        result['TeamMemberDetails'] = await Promise.all(
                            result['myTeamDetails']?.teamMember.map(async (item) => {
                                let monthName = '';
                                if (item['baton_start'] && item['baton_start'] !== null) {
                                    monthName = await this.translatorService.frontendReadTranslation(
                                        req.lang,
                                        moment(item['baton_start']).format('MMM'),
                                        `/LC_MESSAGES/Common/Month`,
                                        `static`
                                    );
                                    if(!item['baton_start_trans']){
                                        item['baton_start_trans']=Object.create(null)
                                    }
                                    item['baton_start_trans'] = monthName + ' ' + moment(item['baton_start']).format('D, YYYY');
                                }
                                if (item['baton_end'] && item['baton_end'] !== null) {
                                    monthName = await this.translatorService.frontendReadTranslation(
                                        req.lang,
                                        moment(item['baton_end']).format('MMM'),
                                        `/LC_MESSAGES/Common/Month`,
                                        `static`
                                    );
                                    if(!item['baton_end_trans']){
                                        item['baton_end_trans']=Object.create(null)
                                    }
                                    item['baton_end_trans'] = monthName + ' ' + moment(item['baton_end']).format('D, YYYY');
                                }
                    
                                return {
                                    'completedSteps': item.completedSteps,
                                    'user_order':item.user_order,
                                    'user': item.user, 
                                    'baton_status': item.baton_status,
                                    'baton_start': item['baton_start'],
                                    'baton_end': item['baton_end'],
                                    'baton_start_trans': item['baton_start_trans'],
                                    'baton_end_trans': item['baton_end_trans'],
                                    'timeRequired':item?.timeRequired,
                                    'timeRemaining':item?.timeRemaining,
                                    'timeCompleted':item?.timeCompleted,
                                    'steps_trans':translationParams,
                                };
                            })
                        );
                    }
                    
                    if(result['myTeamDetails']){
                        result['myTeamDetails']= {
                            'timeRequired':result['myTeamDetails']?.timeRequired,
                            'timeRemaining':result['myTeamDetails']?.timeRemaining,
                            'timeCompleted':result['myTeamDetails']?.timeCompleted,
                            'tname':result['myTeamDetails']?.tname,
                            'logo':result['myTeamDetails']?.logo,
                            'avarageSteps':result['myTeamDetails']?.avarageSteps,
                            'completedSteps':result['myTeamDetails']?.completedSteps,
                            'metGoalMemberCount':result['myTeamDetails']?.metGoalMemberCount,
                            'progress': result['myTeamDetails']['progress'],
                            'bottomLeftText': result['myTeamDetails']['bottomLeftText'],
                        }
                    }
                }
                return result;
            } catch (error) {
                await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
            }
    }
    timeToSeconds(timeStr) {
        const [hours, minutes, seconds] = timeStr.split(":").map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    }
}