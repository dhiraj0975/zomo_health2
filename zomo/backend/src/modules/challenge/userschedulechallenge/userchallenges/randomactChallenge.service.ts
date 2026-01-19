import { CommonDateService, CommonService } from '@common-constants';
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request } from "express";
import { lastValueFrom } from "rxjs";
import { CompanyService } from "src/modules/company/companies/company.service";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { TranslationService } from "src/modules/translation/translation.service";
import { ScheduleChallengeJoinUsersService } from "../../schedulechallengejoinusers/schedulechallengejoinusers.service";
import { TeamsService } from "../../teams/teams.service";
import { TokensService } from "../../tokens/tokens.service";
import { UserScheduleChallengeService } from '../userScheduleChallenge.service';
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD
@Injectable()
export class RandomActChallengeService {
    constructor(
        private readonly translatorService: TranslationService,
        private readonly commonService: CommonService,
        private readonly commonDateService: CommonDateService,
        private readonly companyService: CompanyService,
        private readonly teamsService: TeamsService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly tokensService: TokensService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly userScheduleChallengeService: UserScheduleChallengeService,
        private readonly activityLogService: ActivityLogService,
    ) {}

    async RandomActsOfKindnessChallenge(schedule: any, req: Request, show_type = 1) {
        try {
            let temp: any = Object.create(null);
            let result: any = Object.create(null);
            let orgId = schedule['sc']['org_id'];
            let schedule_id = schedule['sc']['id'];
            let scheduleid = schedule['id'];
            let userId = req.tokenUser?.id;
            let goal_base_on = schedule['sc']['goal_base_on'];
            let goal_base_on_frequency = '';
            if(goal_base_on != 0){
                goal_base_on_frequency = schedule['sc']['goalbasefrquency'];
            }
            let requirement_base_on = schedule['sc']['requirement_base_on'];
            let show_token_type_text =  await this.translatorService.frontendReadTranslation(req.lang,'received', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
            if(requirement_base_on == 0){ /* 0 is Tokens Given & 1 is Tokens Earned */
                show_token_type_text = await this.translatorService.frontendReadTranslation(req.lang,'sent', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
            }
            let sch_start_date = schedule['sc']['start_date'];
            let sch_end_date = schedule['sc']['end_date'];
            let challengeGoal = schedule['sc']['total_enter_token'];
            let timeZone = req.tokenUser?.timezone;
            let current_datetime = moment.tz(this.commonDateService.getTodayDate(), timeZone).format('YYYY-MM-DD HH:mm:ss');
            let schStartDate = moment(sch_start_date).format('YYYY-MM-DD') + ' 00:00:00';
            let schEndDate = moment(sch_end_date).format('YYYY-MM-DD') + ' 23:59:59';
            let totalDays = await this.commonDateService.numOfDays(schStartDate, schEndDate);
            let weekArray = await this.commonDateService.getWeeksInRange(schStartDate, schEndDate);
            let monthArray = await this.commonDateService.getMonthsInRange(schStartDate, schEndDate);
            let count_goal_divide = 1;
            let goal_based_start_date = schStartDate;
            let goal_based_end_date = schEndDate;
            if(goal_base_on_frequency == '0'){ /* Daily */
                count_goal_divide = totalDays;
                goal_based_start_date = moment(current_datetime).format('YYYY-MM-DD') + ' 00:00:00';
                goal_based_end_date = moment(current_datetime).format('YYYY-MM-DD') + ' 23:59:59';
            }else if(goal_base_on_frequency == '1'){ /* Weekly */
                let total_week_days = 7;
                count_goal_divide = Object.keys(weekArray.weeks)?.length;
                let getWeekDate = (weekArray['currentWeek'] != '') ? weekArray.weeks[weekArray['currentWeek']] : '';
                goal_based_start_date = getWeekDate['start_date'];
                goal_based_end_date = getWeekDate['end_date'];
            }else if(goal_base_on_frequency == '2'){ /* 2 monthly*/
                count_goal_divide = Object.keys(monthArray.months)?.length;
                let getMonthDate = (monthArray['currentMonths']) ? monthArray.months[monthArray['currentMonths']] : '';
                goal_based_start_date = (getMonthDate['start_date']) ? getMonthDate['start_date'] : '';
                goal_based_end_date = (getMonthDate['end_date']) ? getMonthDate['end_date'] : '';
            }
            let per_user_challenge_goal = challengeGoal * count_goal_divide;
            let token_type = 'earn';
            if(requirement_base_on == 0){ /* 0 is Tokens Given & 1 is Tokens Earned */
                token_type = 'given';
            }
            result = {
                TotalTokenGoal: 0,
                MyTotalGivenTokens: 0,
                MyTotalEarnTokens: 0,
                TotalLeftTokens: 0,
                MyTotalGivenTokensText: '',
                MyTotalEarnTokensText: '',
            };
            let is_mobile = req?.tokenUser?.mobile ? req?.tokenUser?.mobile : 0;
            let totalTokenNameTTS = await this.translatorService.frontendReadTranslation(req.lang, is_mobile ? 'Send' : `Total token send`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
            let totalTokenNameTTsS = await this.translatorService.frontendReadTranslation(req.lang, is_mobile ? 'Send' : `Total tokens send`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
            let totalTokenNameTTR = await this.translatorService.frontendReadTranslation(req.lang, is_mobile ? 'Received' :`Total token received`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
            let totalTokenNameTTsR = await this.translatorService.frontendReadTranslation(req.lang, is_mobile ? 'Received' :`Total tokens received`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
            let translateTLTSTCTG = await this.translatorService.frontendReadTranslation(req.lang, is_mobile ? 'Left to send' : `Token left to send to complete the goal`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
            let translateTsLTSTCTG = await this.translatorService.frontendReadTranslation(req.lang, is_mobile ? 'Left to send' : `Tokens left to send to complete the goal`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
            let translateTLTRTCTG = await this.translatorService.frontendReadTranslation(req.lang, is_mobile ? 'Left to receive' : `Token left to received to complete the goal`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
            let translateTsLTRTCTG = await this.translatorService.frontendReadTranslation(req.lang, is_mobile ? 'Left to receive' : `Tokens left to received to complete the goal`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
            let translateTT = await this.translatorService.frontendReadTranslation(req.lang,`total token`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
            let translateTTs = await this.translatorService.frontendReadTranslation(req.lang,`total tokens`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
            let translateT = await this.translatorService.frontendReadTranslation(req.lang,`token`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
            let translateTs = await this.translatorService.frontendReadTranslation(req.lang,`tokens`, `/LC_MESSAGES/Challenge/MyChallenges`,`static`);

            if (schedule['sc']['team'] == 1) {
                const allGetTeams:any = await this.teamsService.getAllTeams(`team.org_id = ${orgId} AND team.schedule_id = ${schedule_id}`, [], false);
                let allTeams = Object.create(null);
                let key = 1;
                for (let getTeam of allGetTeams) {
                    if(getTeam['teamMember'] && getTeam['teamMember']?.length > 0){
                        getTeam['teamMember'] = Object.values(getTeam['teamMember']).filter((item)=> item['user']);
                        getTeam['teamMember'] = Object.values(getTeam['teamMember']).filter((item)=> item['scheduleJoin']);
                    }
                    let groupId = getTeam['group_id'];
                    let teamId = getTeam['id'];
                    let teamData = Object.create(null);
                    if (!allTeams['Teams']) {
                        allTeams['Teams'] = Object.create(null);
                    }
                    if (!allTeams['Teams'][key]) {
                        allTeams['Teams'][key] = Object.create(null);
                    }
                    allTeams['Teams'][key]['TotalTeamGoal'] = allTeams['Teams'][key]['TotalGivenTokens'] = allTeams['Teams'][key]['TotalEarnTokens'] = allTeams['Teams'][key]['TotalLeftTeamGoal'] = 0;
                    let teamName = await this.translatorService.frontendReadTranslation(req.lang,`team_name_${schedule_id}_${teamId}`, `/LC_MESSAGES/Challenge/MyChallenges/${orgId}/${schedule_id}`,`dynamic`);
                    teamName = (teamName == '' || teamName == `team_name_${schedule_id}_${teamId}`) ? getTeam['tname'] : teamName;
                    getTeam['tname'] = teamName;
                    let icons = getTeam['logo'];
                    if (icons?.length > 2 && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: icons}))) {
                        let iconImages = icons;
                        getTeam['logo'] = S3_URL + iconImages;
                    } else {
                        getTeam['logo'] = this.commonService.getIconPath(icons,S3_URL);
                    }
                    let monthName = this.commonDateService.getTodayDate().format('MMMM');
                    if(getTeam['created_date'] && getTeam['created_date'] != null){
                        monthName = await this.translatorService.frontendReadTranslation(req.lang, moment(getTeam['created_date']).format('MMMM'), `/LC_MESSAGES/Common/Month`,`static`);
                    }
                    getTeam['created_date'] = monthName + ' ' + moment(getTeam['created_date']).format('D, YYYY');
                    allTeams['Teams'][key] = getTeam;
                    if (schedule['sc']['group_status'] == 1 && groupId != 0) {
                        teamData['Groups'][groupId]['Teams'][key] = getTeam;
                    }
                    
                    let allUsersIdArray = getTeam['teamMember'].map(member => member['user']?.id ? member['user']?.id : '');
                    const allUsersId = allUsersIdArray.filter(item => item !== '').join(',');
                    let getTeamGivenTokens = 0;
                    let getTeamEarnTokens = 0;
                    let getFrequencyTeamGivenTokens = 0;
                    let getFrequencyTeamEarnTokens = 0;
                    let myTeamID = '';
                    if(getTeam['teamMember'] && getTeam['teamMember']?.length > 0){
                        let keyMem = 0;
                        if(allUsersIdArray.includes(userId)){
                            myTeamID = teamId;
                        }
                        for(let teamMem of getTeam['teamMember']){
                            getTeam['teamMember'][keyMem]['user']['name'] = teamMem['user']['first_name'] + ' '+ teamMem['user']['last_name'];
                            if (teamMem['user'] && teamMem['user']['profile_image'] && teamMem['user']['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: teamMem['user']['profile_image']}))) {
                                getTeam['teamMember'][keyMem]['user']['profile_image'] = S3_URL + teamMem['user']['profile_image'];
                            }
                            else{
                                getTeam['teamMember'][keyMem]['user']['profile_image'] = S3_URL + 'comn/img/avatar_0001.png'; 
                            }
                            if(teamMem?.department && req?.lang != 'eng'){
                                let deptName = await this.translatorService.frontendReadTranslation(req.lang,`department_name_${teamMem?.department?.id}`, `/LC_MESSAGES/OrgAdmin/Department/${orgId}/${teamMem?.department?.id}`,`dynamic`);
                                teamMem.department['dept_name'] = (deptName == '' || deptName == `department_name_${teamMem?.department?.id}`) ? teamMem?.department?.dept_name : deptName;
                            }
                            if(teamMem?.locations && req?.lang != 'eng'){
                                if (teamMem?.locations.location_name) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_name_${teamMem?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgId}/${teamMem?.locations['id']}`, `dynamic`);
                                    teamMem.locations.location_name = (customName == '' || customName == `location_name_${teamMem?.locations['id']}`) ? teamMem?.locations['location_name'] : customName;
                                }
                                if (teamMem?.locations.address1) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_address1_${teamMem?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgId}/${teamMem?.locations['id']}`, `dynamic`);
                                    teamMem.locations.address1 = (customName == '' || customName == `location_address1_${teamMem?.locations['id']}`) ? teamMem?.locations['address1'] : customName;
                                }
                                if (teamMem?.locations.address2) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_address2_${teamMem?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgId}/${teamMem?.locations['id']}`, `dynamic`);
                                    teamMem.locations.address2 = (customName == '' || customName == `location_address2_${teamMem?.locations['id']}`) ? teamMem?.locations['address2'] : customName;
                                }
                                if (teamMem?.locations.lname) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_lname_${teamMem?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgId}/${teamMem?.locations['id']}`, `dynamic`);
                                    teamMem.locations.lname = (customName == '' || customName == `location_lname_${teamMem?.locations['id']}`) ? teamMem?.locations['lname'] : customName;
                                }
                                if (teamMem?.locations.city) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_city_${teamMem?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgId}/${teamMem?.locations['id']}`, `dynamic`);
                                    teamMem.locations.city = (customName == '' || customName == `location_city_${teamMem?.locations['id']}`) ? teamMem?.locations['city'] : customName;
                                }
                                if (teamMem?.locations.state) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_state_${teamMem?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgId}/${teamMem?.locations['id']}`, `dynamic`);
                                    teamMem.locations.state = (customName == '' || customName == `location_state_${teamMem?.locations['id']}`) ? teamMem?.locations['state'] : customName;
                                }
                                if (teamMem?.locations.country) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_country_${teamMem?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgId}/${teamMem?.locations['id']}`, `dynamic`);
                                    teamMem.locations.country = (customName == '' || customName == `location_country_${teamMem?.locations['id']}`) ? teamMem?.locations['country'] : customName;
                                }
                            }

                            let compUserId = teamMem['user'].id;
                            let getGivenTokensL = await this.tokensService.getMyGivenEarnToken(`t.schedule_id = ${schedule_id} AND t.org_id = ${orgId} AND t.user_id IN (${compUserId}) AND t.submission_date BETWEEN '${schStartDate}' AND '${schEndDate}'`);
                            getTeamGivenTokens += getGivenTokensL;
                            let getEarnTokensL = await this.tokensService.getMyGivenEarnToken(`t.schedule_id = ${schedule_id} AND t.org_id = ${orgId} AND t.to_user_id IN (${compUserId}) AND t.submission_date BETWEEN '${schStartDate}' AND '${schEndDate}'`);
                            getTeamEarnTokens += getEarnTokensL;
                            let getFrequencyGivenTokens = 0;
                            let getFrequencyEarnTokens = 0;
                            if(goal_base_on != '0'){
                                if(goal_based_start_date != '' && goal_based_end_date != ''){
                                    getFrequencyGivenTokens = await this.tokensService.getMyGivenEarnToken(`t.schedule_id = ${schedule_id} AND t.org_id = ${orgId} AND t.user_id IN (${compUserId}) AND t.submission_date BETWEEN '${goal_based_start_date}' AND '${goal_based_end_date}'`);
                                    getFrequencyTeamGivenTokens += getFrequencyGivenTokens;
                                    getFrequencyEarnTokens = await this.tokensService.getMyGivenEarnToken(`t.schedule_id = ${schedule_id} AND t.org_id = ${orgId} AND t.to_user_id IN (${compUserId}) AND t.submission_date BETWEEN '${goal_based_start_date}' AND '${goal_based_end_date}'`);
                                    getFrequencyTeamEarnTokens += getFrequencyEarnTokens;
                                }
                            }

                            teamMem['TotalTokenGoal'] =  per_user_challenge_goal;
                            teamMem['TotalGivenTokens'] = getGivenTokensL;
                            teamMem['TotalGivenTokensText'] = getGivenTokensL > 1 ? totalTokenNameTTsS : totalTokenNameTTS;
                            teamMem['TotalEarnTokens'] = getEarnTokensL;
                            teamMem['TotalEarnTokensText'] = getEarnTokensL > 1 ? totalTokenNameTTsR : totalTokenNameTTR;
                            let leftGoalTokensL =  (token_type == 'earn') ? (per_user_challenge_goal-getEarnTokensL) : (per_user_challenge_goal-getGivenTokensL) ;
                            teamMem['TotalLeftTokens'] =  (leftGoalTokensL > 0) ? leftGoalTokensL : 0 ;

                            let totalTokenNameL = leftGoalTokensL > 1 ? translateTsLTSTCTG : translateTLTSTCTG;
                            if(token_type == 'earn'){
                                totalTokenNameL = leftGoalTokensL > 1 ? translateTsLTRTCTG : translateTLTRTCTG;
                            }
                            teamMem['TotalLeftTokensText'] = totalTokenNameL;
                            if(goal_base_on == '0'){
                                teamMem['totalTokens'] = (token_type == 'earn') ? getEarnTokensL  : getGivenTokensL;
                                let totalTokenName = teamMem['totalTokens'] > 1 ? translateTTs : translateTT;
                                teamMem['showtextonleaderdbord'] = (token_type == 'earn') ? getEarnTokensL + ' ' + totalTokenName + ' ' + show_token_type_text : getGivenTokensL + ' ' + totalTokenName + ' ' + show_token_type_text;
                            }else{
                                let calAverageToken = (token_type == 'earn') ? (getFrequencyEarnTokens*100)/per_user_challenge_goal : (getFrequencyGivenTokens*100)/per_user_challenge_goal;
                                let TokenName = calAverageToken > 1 ? translateTs : translateT;
                                teamMem['totalTokens'] = (calAverageToken > 100) ? 100  : parseFloat(calAverageToken.toFixed(2));
                                teamMem['showtextonleaderdbord'] = (calAverageToken > 100) ? '100%  ' + TokenName + ' ' + show_token_type_text  : calAverageToken.toFixed(2) + '%  ' + TokenName + ' ' + show_token_type_text ;
                            }
                            if(userId == compUserId){
                                result['TotalLeftTokens'] = teamMem['TotalLeftTokens'];
                                result['MyTotalEarnTokens'] = teamMem['TotalEarnTokens'];
                                result['MyTotalGivenTokens'] = teamMem['TotalGivenTokens'];
                                result['TotalTokenGoal'] = teamMem['TotalTokenGoal'];
                                result['MyTotalEarnTokensText'] = result['MyTotalEarnTokens'] > 1 ? totalTokenNameTTsR : totalTokenNameTTR;
                                result['MyTotalGivenTokensText'] = result['MyTotalGivenTokens'] > 1 ? totalTokenNameTTsS : totalTokenNameTTS;
                                result['TotalLeftTokensText'] = teamMem['TotalLeftTokensText'];
                            }
                            if(teamMem['status'] == 0){
                                delete(getTeam['teamMember'][keyMem]);
                            }
                            keyMem++;
                        }

                        let TotalTeamGoal = per_user_challenge_goal * getTeam['teamMember']?.length;
                        allTeams['Teams'][key]['TotalTeamGoal'] = TotalTeamGoal;
                        allTeams['Teams'][key]['TotalGivenTokens'] = getTeamGivenTokens;
                        allTeams['Teams'][key]['TotalEarnTokens'] = getTeamEarnTokens;
                        if(goal_base_on == '0'){
                            allTeams['Teams'][key]['totalTokens'] = (token_type == 'earn') ? getTeamEarnTokens : getTeamGivenTokens;
                            let totalTokenName = allTeams['Teams'][key]['totalTokens'] > 1 ? translateTTs : translateTT;
                            allTeams['Teams'][key]['showtextonleaderdbord'] = (token_type == 'earn') ? getTeamEarnTokens + ' ' + totalTokenName + ' ' + show_token_type_text : getTeamGivenTokens + ' ' + totalTokenName + ' ' + show_token_type_text;
                        }else{
                            let calAverageToken = (token_type == 'earn') ? (getFrequencyTeamEarnTokens*100)/TotalTeamGoal : (getFrequencyTeamGivenTokens*100)/TotalTeamGoal;
                            let TokenName = calAverageToken > 1 ? translateTs : translateT;
                            allTeams['Teams'][key]['totalTokens'] = (calAverageToken > 100) ? 100  : parseFloat(calAverageToken.toFixed(2));
                            allTeams['Teams'][key]['showtextonleaderdbord'] = (calAverageToken > 100) ? '100%  ' + TokenName + ' ' + show_token_type_text  : calAverageToken.toFixed(2) + '%  ' + TokenName + ' ' + show_token_type_text ;
                        }
                        if(allUsersIdArray.includes(userId)){
                            myTeamID = teamId;
                            if (!result['myTeamDetails']) {
                                result['myTeamDetails'] = Object.create(null);
                            }
                            result['myTeamDetails']['id'] = teamId;
                            result['myTeamDetails']['tname'] = getTeam['tname'];
                            result['myTeamDetails']['created_by'] = getTeam['created_by'];
                            result['myTeamDetails']['created_date'] = getTeam['created_date'];
                            result['myTeamDetails']['is_team'] = '1';
                            result['myTeamDetails']['logo'] = getTeam['logo'];
                            result['myTeamDetails']['team_size'] = getTeam['team_size'];
                            result['myTeamDetails']['teamMember'] = getTeam['teamMember'];
                            result['myTeamDetails']['TotalTeamGoal'] = TotalTeamGoal;
                            result['myTeamDetails']['TotalGivenTokens'] = getTeamGivenTokens;
                            result['myTeamDetails']['TotalGivenTokensText'] = getTeamGivenTokens > 1 ? totalTokenNameTTsS : totalTokenNameTTS;
                            result['myTeamDetails']['TotalEarnTokens'] = getTeamEarnTokens;
                            result['myTeamDetails']['TotalEarnTokensText'] = getTeamEarnTokens > 1 ? totalTokenNameTTsR : totalTokenNameTTR;
                            let leftGoalTeamTokens = (token_type == 'earn') ? (TotalTeamGoal-getTeamEarnTokens) : (TotalTeamGoal-getTeamGivenTokens) ;
                            result['myTeamDetails']['TotalLeftTeamGoal'] = leftGoalTeamTokens ;
                            let totalTokenNameTL = leftGoalTeamTokens > 1 ? translateTsLTSTCTG : translateTLTSTCTG;
                            if(token_type == 'earn'){
                                totalTokenNameTL = leftGoalTeamTokens > 1 ? translateTsLTRTCTG : translateTLTRTCTG;
                            }
                            result['myTeamDetails']['TotalLeftTeamGoalText'] = totalTokenNameTL ;
                        }
                    }else{
                        if(goal_base_on == '0'){
                            allTeams['Teams'][key]['TotalTeamGoal'] = 0;
                            allTeams['Teams'][key]['totalTokens'] = 0;
                            allTeams['Teams'][key]['showtextonleaderdbord'] = (allTeams['Teams'][key]['teamMember'].length > 0) ? ('0 ' + translateTT + ' ' + show_token_type_text) : await this.translatorService.frontendReadTranslation(req.lang,'No member available', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                        }else{
                            allTeams['Teams'][key]['TotalTeamGoal'] = 0;
                            allTeams['Teams'][key]['totalTokens'] = 0;
                            allTeams['Teams'][key]['showtextonleaderdbord'] = (allTeams['Teams'][key]['teamMember'].length > 0) ? ('0.00%  ' + translateT + ' ' + show_token_type_text) : await this.translatorService.frontendReadTranslation(req.lang,'No member available', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                        }
                    }
                    let sortedTeamMember = [];
                    sortedTeamMember = await this.userScheduleChallengeService.sortUserByOnField2Level(allTeams['Teams'][key]['teamMember'],'totalTokens', 'scheduleJoin','id');
                    allTeams['Teams'][key]['teamMember'] = sortedTeamMember;
                    if(allUsersIdArray.includes(userId)){
                        result['myTeamDetails']['teamMember'] = sortedTeamMember;
                    }
                    key++;
                }
                let sortedTeams = [];
                sortedTeams = this.teamsService.sortTeamsByOnField(allTeams['Teams'],'totalTokens');
                result['allteams'] = sortedTeams;
            }else{
                const membershipCode = await this.companyService.getCompanyCodeFromId(schedule['sc']['org_id']);
                const challengeMembers = await this.scheduleChallengeJoinUsersService.listRecord(`scj.schedule_id = ${schedule_id} AND scj.status = 1 AND user.status=1 AND user.membership_code='${membershipCode}'`);
                if(challengeMembers && challengeMembers?.length > 0){
                    let getGivenTokens = await this.tokensService.getMyGivenEarnToken(`t.schedule_id = ${schedule_id} AND t.org_id = ${orgId} AND t.user_id IN (${userId}) AND t.submission_date BETWEEN '${schStartDate}' AND '${schEndDate}'`);
                    let getEarnTokens = await this.tokensService.getMyGivenEarnToken(`t.schedule_id = ${schedule_id} AND t.org_id = ${orgId} AND t.to_user_id IN (${userId}) AND t.submission_date BETWEEN '${schStartDate}' AND '${schEndDate}'`);
                    result['TotalTokenGoal'] =  per_user_challenge_goal;
                    result['MyTotalGivenTokens'] = getGivenTokens;
                    result['MyTotalGivenTokensText'] = getGivenTokens > 1 ? totalTokenNameTTsS : totalTokenNameTTS;
                    result['MyTotalEarnTokens'] = getEarnTokens;
                    result['MyTotalEarnTokensText'] = getEarnTokens > 1 ? totalTokenNameTTsR : totalTokenNameTTR;
                    let leftGoalTokens =  (token_type == 'earn') ? (per_user_challenge_goal-getEarnTokens) : (per_user_challenge_goal-getGivenTokens) ;
                    result['TotalLeftTokens'] =  (leftGoalTokens > 0) ? leftGoalTokens : 0 ;
                    let totalTokenNameSL = leftGoalTokens > 1 ? translateTsLTSTCTG : translateTLTSTCTG;
                    if(token_type == 'earn'){
                        totalTokenNameSL = leftGoalTokens > 1 ? translateTsLTRTCTG : translateTLTRTCTG;
                    }
                    result['TotalLeftTokensText'] = totalTokenNameSL;
                    let challengeMemberData:any = Object.create(null);
                    let i = 0;
                    for (const cUser of challengeMembers) {
                        let compUserId = cUser['user'].id;
                        if(cUser['user'] && cUser['user']['profile_image']){
                            cUser['user']['profile_image'] = S3_URL + cUser['user']['profile_image']
                        }
                        else{
                            cUser['user']['profile_image'] = S3_URL + 'comn/img/avatar_0001.png'; 
                        }
                        let getGivenTokensL = await this.tokensService.getMyGivenEarnToken(`t.schedule_id = ${schedule_id} AND t.org_id = ${orgId} AND t.user_id IN (${compUserId}) AND t.submission_date BETWEEN '${schStartDate}' AND '${schEndDate}'`);
                        let getEarnTokensL = await this.tokensService.getMyGivenEarnToken(`t.schedule_id = ${schedule_id} AND t.org_id = ${orgId} AND t.to_user_id IN (${compUserId}) AND t.submission_date BETWEEN '${schStartDate}' AND '${schEndDate}'`);
                        let getFrequencyGivenTokens = 0;
                        let getFrequencyEarnTokens = 0;
                        if(goal_base_on != '0'){
                            if(goal_based_start_date != '' && goal_based_end_date != ''){
                                getFrequencyGivenTokens = await this.tokensService.getMyGivenEarnToken(`t.schedule_id = ${schedule_id} AND t.org_id = ${orgId} AND t.user_id IN (${compUserId}) AND t.submission_date BETWEEN '${goal_based_start_date}' AND '${goal_based_end_date}'`);
                                getFrequencyEarnTokens = await this.tokensService.getMyGivenEarnToken(`t.schedule_id = ${schedule_id} AND t.org_id = ${orgId} AND t.to_user_id IN (${compUserId}) AND t.submission_date BETWEEN '${goal_based_start_date}' AND '${goal_based_end_date}'`);
                            }
                        }
                        challengeMemberData[i] = cUser;
                        challengeMemberData[i]['data'] = Object.create(null);
                        challengeMemberData[i]['data']['TotalTokenGoal'] =  per_user_challenge_goal;
                        challengeMemberData[i]['data']['TotalGivenTokens'] = getGivenTokensL;
                        challengeMemberData[i]['data']['TotalGivenTokensText'] = getGivenTokensL > 1 ? totalTokenNameTTsS : totalTokenNameTTS;
                        challengeMemberData[i]['data']['TotalEarnTokens'] = getEarnTokensL;
                        challengeMemberData[i]['data']['TotalEarnTokensText'] = getEarnTokensL > 1 ? totalTokenNameTTsR : totalTokenNameTTR;
                        let leftGoalTokensL =  (token_type == 'earn') ? (per_user_challenge_goal-getEarnTokensL) : (per_user_challenge_goal-getGivenTokensL) ;
                        challengeMemberData[i]['data']['TotalLeftTokens'] =  (leftGoalTokensL > 0) ? leftGoalTokensL : 0 ;
                        let totalTokenNameL = leftGoalTokensL > 1 ? translateTsLTSTCTG : translateTLTSTCTG;
                        if(token_type == 'earn'){
                            totalTokenNameL = leftGoalTokensL > 1 ? translateTsLTRTCTG : translateTLTRTCTG;
                        }
                        
                        challengeMemberData[i]['data']['TotalLeftTokensText'] = totalTokenNameL;
                        if(goal_base_on == '0'){
                            challengeMemberData[i]['data']['totalTokens'] = (token_type == 'earn') ? getEarnTokensL  : getGivenTokensL;
                            let totalTokenName = challengeMemberData[i]['data']['totalTokens'] > 1 ? translateTTs : translateTT;
                            challengeMemberData[i]['data']['showtextonleaderdbord'] = (token_type == 'earn') ? getEarnTokensL + ' ' + totalTokenName + ' ' + show_token_type_text : getGivenTokensL + ' ' + totalTokenName + ' ' + show_token_type_text;
                        }else{
                            let calAverageToken = (token_type == 'earn') ? (getFrequencyEarnTokens*100)/per_user_challenge_goal : (getFrequencyGivenTokens*100)/per_user_challenge_goal;
                            let TokenName = calAverageToken > 1 ? translateTs : translateT;
                            challengeMemberData[i]['data']['totalTokens'] = (calAverageToken > 100) ? 100  : parseFloat(calAverageToken.toFixed(2));
                            challengeMemberData[i]['data']['showtextonleaderdbord'] = (calAverageToken > 100) ? '100%  ' + TokenName + ' ' + show_token_type_text  : calAverageToken.toFixed(2) + '%  ' + TokenName + ' ' + show_token_type_text ;
                        }
                        i++;
                    }
                    let sortedChallengeMemberData = [];
                    sortedChallengeMemberData = await this.userScheduleChallengeService.sortUserByOnField(challengeMemberData,'totalTokens','data');
                    result['challengeMembers'] = sortedChallengeMemberData;
                }   
            }
            if(show_type == 2){
                if (schedule['sc']['team'] != 1) {
                    if(result['myTeamDetails']){
                        delete(result['myTeamDetails'])
                    }
                }
                if(result['allteams']){
                    delete(result['allteams'])
                }
                if(result['challengeMembers']){
                    delete(result['challengeMembers'])
                }
            }
            return result;
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
}