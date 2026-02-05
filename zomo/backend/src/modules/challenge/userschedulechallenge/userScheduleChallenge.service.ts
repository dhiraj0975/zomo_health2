import { UrlManageService } from '@/modules/common';
import { appConstant, CommonDateService, CommonFileService, CommonService, tableConstant } from '@common-constants';
import {
    Controller,
    Inject,
    UseGuards
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request } from "express";
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import { CommunicationTemplateTextsService } from 'src/modules/communication/templatetexts/communicationtemplatetexts.service';
import { DepartmentService } from 'src/modules/company/departments/department.service';
import { LocationService } from 'src/modules/company/locations/location.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { In, Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { TranslationService } from "../../translation/translation.service";
import { AcOlympicDataService } from '../acolympicdata/acolympicdata.service';
import { FitnessUsersActivityService } from '../fitnessusersactivity/fitnessusersactivity.service';
import { InviteUserService } from '../inviteuser/inviteuser.service';
import { ScheduleChallengeService } from '../schedulechallenge/schedulechallenge.service';
import { ScheduleChallengeJoinUsersService } from '../schedulechallengejoinusers/schedulechallengejoinusers.service';
import { TeamMembersService } from '../teammembers/teammembers.service';
import { TeamsService } from '../teams/teams.service';
import { TeamScheduleService } from '../teamschedule/teamschedule.service';
import { WeeksUsersService } from '../weeksusers/weeksusers.service';
const S3_URL =  process.env.S3_URL_PROD
const moment = require('moment-timezone');
const DEFAULT_IMAGE = 'comn/img/avatar_0001.png';
@Controller('challenge/schedule-challenge')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)

export class UserScheduleChallengeService {
    constructor(
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly commonService: CommonService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly teamsService: TeamsService,
        private readonly teamScheduleService: TeamScheduleService,
        private readonly activityLogService: ActivityLogService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly departmentService: DepartmentService,
        private readonly locationService: LocationService,
        private readonly inviteUserService: InviteUserService,
        private readonly communicationTemplateTextService: CommunicationTemplateTextsService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly weeksUsersService: WeeksUsersService,
        private readonly acOlympicDataService: AcOlympicDataService,
        private readonly teamMembersService: TeamMembersService,
        private readonly fitnessUsersActivityService: FitnessUsersActivityService,
        private readonly urlManageService: UrlManageService,
    ) {}
    
    async getChallengeAllTeams(type: any = 'join', scheduleData, postData, req){
        try{
            let scheduleId = scheduleData.id;
            let orgId = req.tokenUser?.org_id;
            let userId = req.tokenUser?.id;
            let formattedTeams = Object.create(null);

            let join_cond = true;
            let field_array = ['TeamSchedule.id', 'Teams.id','Teams.team_size','TeamMember.id','TeamMember.status','TeamMember.team_id'];
            let checkUserJoins = await this.teamScheduleService.listRecordJoinSchedule(`TeamSchedule.schedule_id = ${scheduleId} AND TeamMember.user_id = ${userId} AND Teams.status = 1 AND TeamMember.status IN (1,2,3)`, null , field_array, join_cond);
            if(scheduleData.lock_teams == 'Yes'){
                checkUserJoins = await this.teamScheduleService.listRecordJoinSchedule(`TeamSchedule.schedule_id = ${scheduleId} AND TeamMember.user_id = ${userId} AND Teams.status = 1 AND TeamMember.status IN (3)`, null , field_array, join_cond, { 'TeamMember.updated': 'DESC' });
            }
            if(checkUserJoins?.length > 0){
                const teamIds = checkUserJoins.map(schedule => schedule?.['Teams'].id);
                formattedTeams['status'] = 'allreadyJoin';
                if(scheduleData.lock_teams == 'No'){
                    formattedTeams['alredayJoinTeamId'] = teamIds;
                }else{
                    let getTeamDetails = await this.teamMembersService.countTeamMember({team_id: checkUserJoins[0]['TeamMember'].team_id, status: 1});
                    if(getTeamDetails < checkUserJoins[0]['Teams'].team_size){
                        if(checkUserJoins.length > 1){
                            const remainingData = checkUserJoins.slice(1);
                            if(remainingData.length > 0){
                                let OtherTeamInJoinData = remainingData.map(schedule => schedule?.['Teams'].id);
                                for (const exitTeamId of OtherTeamInJoinData) {
                                    await this.teamMembersService.update({user_id: userId, team_id: exitTeamId}, {status: 2});
                                }
                            }
                            await this.teamMembersService.update({user_id: userId, id: checkUserJoins[0]['TeamMember'].id}, {status: 1});
                        }else if(checkUserJoins.length == 1){
                            await this.teamMembersService.update({user_id: userId, id: checkUserJoins[0]['TeamMember'].id}, {status: 1});
                        }
                        return formattedTeams;
                    }else{
                        type = 'join';
                    }
                }
            }
            if(type == 'join' || type == 'create_team'){
                let filedsArray = ['teamSchedule.id', 'teamSchedule.team_id', 'teamSchedule.schedule_id', 'teams.id', 'teams.tname', 'teams.logo', 'teams.team_size', 'COUNT(scheduleUser.id) AS teammembers'];
                let groupBy = 'teams.id';
                let getAllTeams = await this.teamScheduleService.getTeamList(`teamSchedule.schedule_id = ${scheduleId} AND teams.status = 1`, { tname : 'ASC' } , groupBy, filedsArray);
                if(getAllTeams.length > 0){
                    formattedTeams['status'] = 'notjoined';
                    formattedTeams['teams'] = await Promise.all(
                        getAllTeams.map(async (team) => {
                            let teamName = await this.translatorService.frontendReadTranslation(req.lang,`team_name_${scheduleId}_${team.teams_id}`, `/LC_MESSAGES/Challenge/MyChallenges/${orgId}/${scheduleId}`,`dynamic`);
                            let getMemberDetails: any = await this.teamMembersService.joinListRecord(`teamMember.team_id = ${team.teams_id} and teamMember.status = 1`,null,['users.id', 'users.first_name','users.last_name','users.profile_image','teamMember.id','teamMember.status','teamMember.team_id','teamMember.iscaptain','users.department_id','users.location']);
                            let deletedUser = getMemberDetails.filter(ele=> !ele.users);
                            if(deletedUser.length){
                                deletedUser.map(async (member) => { 
                                    await this.teamMembersService.update({ id: member?.id},{status: 2});
                                    this.activityLogService.create({ id: member?.id, status: 1}, {status: 2}, tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS, req.tokenUser?.id);
                                });
                                getMemberDetails = getMemberDetails.filter(ele=> ele.users);
                            }
                            getMemberDetails = await Promise.all(
                            getMemberDetails.map(async (member) => {
                                member['users']['name'] = member['users']['first_name'] + ' ' + member['users']['last_name']
                                if(member['users'] && member['users']['profile_image'] && member['users']['profile_image'] !==''){
                                    member['users']['profile_image'] =  S3_URL + member?.['users']?.['profile_image'];
                                }
                                else{
                                    member['users']['profile_image'] =  S3_URL + "comn/img/avatar_0001.png";
                                }
                                if(member['users'] && member['users']['department_id']){
                                    let department = await  this.departmentService.findOne({id: member['users']['department_id']});
                                    if (department && department['dept_name']) {
                                        member['users']['dept_name'] = department['dept_name'];
                                    }
                                }
                                if(member['users'] && member['users']['location']){
                                    let location = await this.locationService.findOne({id: member['users']['location']});
                                    if (location && location['location_name']) {
                                        member['users']['location_name'] = location['location_name'];
                                    }
                                }
                                return member;
                            }));

                            if (team.teammembers >= team.teams_team_size) {
                                return null;
                            }
                            
                            teamName = (teamName == '' || teamName == `team_name_${scheduleId}_${team.teams_id}`) ? team.teams_tname : teamName;
                            team['teams_tname'] = teamName;
                            let icons = team.teams_logo;
                            if (icons?.length > 2 && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: icons}))) {
                                let iconimages = icons;
                                team['teams_logo'] = S3_URL + iconimages;
                            } else {
                                team['teams_logo'] = await this.commonService.getIconPath(icons,S3_URL);
                            }

                            let captain = team?.Captain;
                            if(!captain){
                                captain = getMemberDetails.filter((ele: any) => ele.iscaptain == 1)[0]?.users?.name ?? null;
                            }
                            return {
                                id: team.teams_id,
                                tname: team.teams_tname,
                                logo: team.teams_logo,
                                team_size: team.teams_team_size,
                                captain: captain,
                                teammembers: team.teammembers,
                                teammemberDetails: getMemberDetails ?? [],
                                schedule_id: scheduleId,
                            };
                        })
                    );
                    formattedTeams['teams'] = formattedTeams['teams'].filter(team => team !== null);
                    if(formattedTeams['teams'].length == 0){
                        formattedTeams['status'] = 'noTeams';
                    }
                    return formattedTeams;
                }else{
                    formattedTeams['status'] = 'noTeams';
                }
            }
            
            if(type == 'create'){
                formattedTeams['status'] = 'yes';
            }
            return formattedTeams;
        }catch(error){
            throw new Error(error.message);
        }
    }
    async createTeamUser(scheduleData, postData, req){
        try {
            let teamData = Object.create(null);
            if (!postData?.id || !postData?.team_name) {
                if (postData?.file && postData?.file?.filename && postData?.file?.fieldname === 'logo') {
                    await this.commonFileService.removeFileFromLocal(postData?.file?.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }

            if (postData?.file && postData?.file?.fieldname === 'logo' && postData?.file?.filename) {
                teamData['logo'] = '/challenge/' + postData?.file?.filename;
            } else {
                teamData['logo'] = postData?.logo;
            }
            const recordDetails = await this.teamsService.findOne({
                tname: postData?.team_name, schedule_id: postData?.schedule_id || scheduleData.id, status: Not(2)
            });
            if (recordDetails) {
                throw new Error((await this.translatorService.frontendReadTranslation(req.lang, 'ERR_FILES_ALREADY_EXIST')).replace('%s', 'Team Name'));
            }

            teamData['tname'] = postData?.team_name;
            teamData['schedule_id'] = postData?.id;
            teamData['org_id'] = req.tokenUser?.org_id;
            teamData['group_id'] = (postData?.group_id && postData?.group_id != '') ? postData?.group_id : 0;
            teamData['status'] = 1;
            teamData['team_size'] = scheduleData?.teamsize;
            teamData['created_by'] = req.tokenUser?.id;
            const insertedTeam = await this.teamsService.save({ ...teamData });
            let dynamicData = Object.create(null);
            if(teamData['tname']){
                let title = `team_name_${insertedTeam['schedule_id']}_${insertedTeam['id']}`
                dynamicData[`${title}`]= insertedTeam['tname'];
            }
            await this.translatorService.DynamicEngJsonData('Challenge',insertedTeam['org_id'],dynamicData,'Edit','MyChallenges',insertedTeam['schedule_id']);
            let lastInstertedTeamId = '';
            if (insertedTeam && Object.values(insertedTeam).length > 0) {
                lastInstertedTeamId = insertedTeam['id'];
            }
            if (lastInstertedTeamId != '') {
                if (postData?.file && postData?.file?.fieldname === 'logo' && postData?.file?.filename) {
                    postData.file.originalname = this.commonFileService.formatFileName(postData?.file?.originalname);
                    let filename = `challenge/schedulech/${insertedTeam['schedule_id']}/team/scchateaml_${this.commonService.generateMD5(insertedTeam['id'].toString())}.${postData?.file?.originalname.split('.')[postData?.file?.originalname.split('.').length - 1]}`;
                    await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' }, { path: path.resolve(postData?.file.path), filename: filename }));
                    await this.teamsService.update({ id: insertedTeam['id'] }, { logo: filename });
                }

                const teamSchedule = await this.teamScheduleService.findOne(`teamSchedule.team_id = ${lastInstertedTeamId} AND teams.org_id = ${req.tokenUser?.org_id} AND teamSchedule.schedule_id = ${postData?.id}`);
                if (teamSchedule == null) {
                    await this.teamScheduleService.save({
                        team_id: lastInstertedTeamId,
                        schedule_id: postData?.id,
                        status: 1
                    })
                }

                const bio_challenge_type = scheduleData?.['ch']?.['bio_challenge_type'];
                const challenge_start_date = this.commonDateService.getTodayDate(scheduleData?.['start_date']).unix();
                const challengestart_date = this.commonDateService.getTodayDate(scheduleData?.['start_date']).format('YYYY-MM-DD HH:mm:ss');
                const hide_start_baton = scheduleData?.['hide_history'];

                const date = this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss');
                let teamMember = {
                    team_id: lastInstertedTeamId,
                    org_id: req.tokenUser?.org_id,
                    user_id: req.tokenUser?.id,
                    created_date: date,
                    baton_start: '0000-00-00 00:00:00',
                    iscaptain: 1,
                };

                let lastMemberBatonStatus = 0;
                let getLastMemberDetails = null;
                if (bio_challenge_type == 'Relay_race') {
                    let last_order = 0;
                    let time_elapsed = scheduleData['time_elapsed'];
                    let lastMemberBatonStart = '';
                    last_order = await this.teamMembersService.getMaxOrder(`team_id = ${lastInstertedTeamId} AND scheduleJoin.schedule_id = ${postData?.id} AND teamMember.status !=2 `);
                    if (last_order !== null && last_order !== 0) {
                        const joinTableList = [{ 'alias': 'scheduleJoin', 'table': tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, 'on': `teamMember.user_id = scheduleJoin.user_id AND scheduleJoin.schedule_id = ${postData?.id}` }, { 'alias': 'user', 'table': tableConstant.TBL_USERS, 'on': `teamMember.user_id = user.id` }];
                        getLastMemberDetails = await this.teamMembersService.findOne(`teamMember.team_id = ${lastInstertedTeamId} AND scheduleJoin.schedule_id = ${postData?.id} AND teamMember.user_order = ${last_order}`, null, joinTableList);

                        lastMemberBatonStatus = getLastMemberDetails?.['baton_status'];
                        lastMemberBatonStart = getLastMemberDetails?.['baton_start'];
                    }
                    teamMember['user_order'] = last_order + 1;
                    teamMember['baton_start'] = '0000-00-00 00:00:00';
                    if ((last_order === 0 || last_order === null) && (lastMemberBatonStatus === 0 || lastMemberBatonStatus === null)) {
                        teamMember['baton_status'] = 1;
                        if (scheduleData.hide_history == 1) {
                            teamMember['baton_status'] = 2;
                            teamMember['baton_start'] = await this.commonDateService.DateTimeFormat(challengestart_date, 'YYYY-MM-DD').toString() + ' 00:00:00';
                        }
                    } else if ((last_order !== 0 || last_order !== null) && (lastMemberBatonStatus == 0 || lastMemberBatonStatus == 2)) {
                        teamMember['baton_status'] = 0;
                    } else if ((last_order !== 0 || last_order !== null) && lastMemberBatonStatus == 3) {
                        teamMember['baton_status'] = 1;
                        if (scheduleData.hide_history == 1) {
                            teamMember['baton_status'] = 2;
                            const addedMemberStartDate = moment.utc(lastMemberBatonStart).clone().add(time_elapsed, 'minutes');
                            teamMember['baton_start'] = addedMemberStartDate.format('YYYY-MM-DD HH:mm:ss');
                        }

                    }
                }

                const createMember = await this.teamMembersService.save(teamMember);
                if (createMember && Object.values(createMember).length > 0) {
                    if (bio_challenge_type == 'Relay_race' && lastMemberBatonStatus == 3 && getLastMemberDetails !== null) {
                        let turnComplete = Object.create(null);

                        if (!turnComplete[lastInstertedTeamId]) {
                            turnComplete[lastInstertedTeamId] = [];
                        }
                        if (!turnComplete[lastInstertedTeamId]['userData']) {
                            turnComplete[lastInstertedTeamId]['userData'] = [];
                        }

                        turnComplete[lastInstertedTeamId]['schedule_id'] = postData?.id;
                        turnComplete[lastInstertedTeamId]['userData'].push(getLastMemberDetails);

                        await this.portionCompleteEmail(turnComplete[lastInstertedTeamId], req);
                    }
                    return lastInstertedTeamId;
                } else {
                    return 'error';
                }
            } else {
                return 'error';
            }
        }
        catch(error){
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
        
    }

    async add_bio_activity(data: any, req: Request) {
        try{
            if(data?.action == 'add'){
                let recordDetails = await this.weeksUsersService.findOne({id : data['category_weekid']});
                await this.weeksUsersService.update({id : data['category_weekid']},{status: 1});
                this.activityLogService.create({id:recordDetails.id, status: recordDetails.status}, {status: 1}, tableConstant.CHALLENGE.TBL_CH_WEEKS_USERS, req.tokenUser?.id);
                await this.acOlympicDataService.save({
                    user_id: data['user_id'],
                    activity_id: data['activity_id'],
                    activity_cus_desc: data['activity_cus_desc'],
                    schedule_id: data['schedule_join_id'],
                    minutes: data['minutes'],
                    added_date: data['added_date'] ? this.commonDateService.getTodayDate(data['added_date']).format('YYYY-MM-DD HH:mm:ss') : this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss'),
                    created_date: this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss')
                });
            }
            else{
                const where = {id: data.id, schedule_id: data['schedule_join_id']};
                if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER != req.tokenUser?.role_id || appConstant.ROLE.WCH != req.tokenUser?.role_id){
                    where['user_id'] = req.tokenUser?.id;
                }
                await this.acOlympicDataService.update(where,{status: 2})
            }
             return true;
        } catch (error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }

    async add_fitness_activity(data: any, req: Request) {
        try{
            if(data?.action == 'add'){
                let checkData = await this.fitnessUsersActivityService.listRecord(`status != 2 AND user_id = ${data['user_id']} AND schedule_id = ${data['schedule_id']} AND ftns_activity_id = ${data['ftns_activity_id']} AND schedule_join_id = ${data['schedule_join_id']}`);  
                if(checkData && checkData.length == 0){
                    await this.fitnessUsersActivityService.save({
                        user_id: data['user_id'],
                        schedule_id: data['schedule_id'],
                        ftns_my_entry: data['ftns_my_entry'],
                        ftns_activity_id: data['ftns_activity_id'],
                        schedule_join_id: data['schedule_join_id'],
                        modified_date: this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss')
                    });
                }     
            }else{
                const where = {id: data.id, schedule_join_id: data['schedule_join_id']};
                if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER != req.tokenUser?.role_id || appConstant.ROLE.WCH != req.tokenUser?.role_id){
                    where['user_id'] = req.tokenUser?.id;
                }
                await this.fitnessUsersActivityService.update(where,{status: 2})
            }
             return true;
        } catch (error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }

    async join_team(scheduleData: any, postData: any, req: Request) {
        try{
            let user = req.tokenUser;
            let org_id = req.tokenUser?.org_id;
            let team_id = postData?.team_id;
            let schedule_id = postData?.id;
            let current_datetime = moment.tz(this.commonDateService.getTodayDate(), user['timezone']).format('YYYY-MM-DD HH:mm:ss');
            let teamMember = Object.create(null);
            teamMember['team_id'] = team_id;
            teamMember['org_id'] = org_id;
            teamMember['user_id'] = user.id;
            teamMember['created_date'] = current_datetime;
            let filedsArray = ['teams.id','teams.team_size', 'COUNT(scheduleUser.id) AS teammembers'];
            let groupBy = 'teams.id';
            let getAllTeams = await this.teamScheduleService.getTeamList(`teamSchedule.schedule_id = ${schedule_id} AND teams.id = ${team_id} AND teams.status = 1`, { tname : 'ASC' } , groupBy, filedsArray);
            let manageStatus = 0;
            if(getAllTeams?.length > 0){
                let formattedTeams = Object.create(null);
                if(getAllTeams.length > 0){
                    formattedTeams = getAllTeams.map((team) => {
                        return {
                            id: team.teams_id,
                            team_size: team.teams_team_size,
                            teammembers: Number(team.teammembers),
                        };
                    });
                }
                if(formattedTeams?.length > 0 && formattedTeams[0]['team_size'] && formattedTeams[0]['team_size'] != ''){
                    let totalJoinMember = formattedTeams[0]['teammembers'];
                    let teamSize = formattedTeams[0]['team_size'];
                    if (totalJoinMember < teamSize) {
                        let checkdata = await this.teamMembersService.teamDetails(`teamMember.user_id = ${user.id} AND schedule.schedule_id = ${schedule_id} AND scheduleJoin.id is not Null`);
                        if(checkdata.length == 0){
                            let bio_challenge_type = scheduleData?.ch?.bio_challenge_type;
                            let challengestart_date = scheduleData?.start_date;
                            let time_elapsed = scheduleData?.time_elapsed;
                            let lastMemberBatonStatus = 0;
                            let getLastMemberDetails = null;
                            if(bio_challenge_type == 'Relay_race'){
                                let last_order = 0;
                                let lastMemberBatonStart = '';
                                last_order = await this.teamMembersService.getMaxOrder(`team_id = ${team_id} AND scheduleJoin.schedule_id = ${schedule_id} AND teamMember.status !=2 `);
                                if(last_order !== null && last_order !== 0){
                                    const joinTableList = [{'alias':'scheduleJoin', 'table' : tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, 'on' : `teamMember.user_id = scheduleJoin.user_id AND scheduleJoin.schedule_id = ${schedule_id}` },{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : `teamMember.user_id = user.id` }];
                                    getLastMemberDetails = await this.teamMembersService.findOne(`teamMember.team_id = ${team_id} AND scheduleJoin.schedule_id = ${schedule_id} AND teamMember.user_order = ${last_order}`, null ,joinTableList);
                                    lastMemberBatonStatus = getLastMemberDetails?.['baton_status'];
                                    lastMemberBatonStart = getLastMemberDetails?.['baton_start'];
                                }
                                teamMember['user_order'] = last_order + 1;
                                teamMember['baton_start'] = '0000-00-00 00:00:00';  
                                if((last_order === 0 || last_order === null) && (lastMemberBatonStatus === 0 || lastMemberBatonStatus === null)){
                                    teamMember['baton_status'] = 1;    
                                    if(scheduleData.hide_history == 1){
                                        teamMember['baton_status'] = 2;    
                                        teamMember['baton_start'] = await this.commonDateService.DateTimeFormat(challengestart_date, 'YYYY-MM-DD').toString() + ' 00:00:00';    
                                    }
                                }else if((last_order !== 0 || last_order !== null) && (lastMemberBatonStatus == 0 || lastMemberBatonStatus == 2)){
                                    teamMember['baton_status'] = 0;    
                                }else if((last_order !== 0 || last_order !== null) && lastMemberBatonStatus == 3){
                                    teamMember['baton_status'] = 1;    
                                    if(scheduleData.hide_history == 1){
                                        teamMember['baton_status'] = 2;  
                                        const addedMemberStartDate = moment.utc(lastMemberBatonStart).clone().add(time_elapsed, 'minutes');
                                        teamMember['baton_start'] = addedMemberStartDate.format('YYYY-MM-DD HH:mm:ss');
                                    }  
                                }
                            }
                            let createMember = null;
                            if(postData?.exitTeamIds && postData?.exitTeamIds?.length > 0 && postData?.exitTeamIds.includes(Number(team_id))){
                                const filteredTeamIds = postData?.exitTeamIds.filter(id => id !== Number(team_id));
                                if(filteredTeamIds.length > 0){
                                   for (const exitTeamId of filteredTeamIds) {
                                        await this.teamMembersService.update({user_id: user.id, team_id: exitTeamId}, {status: 2});
                                    }
                                }
                                let getSameTeamInMultipleExit = await this.teamMembersService.listRecord({user_id: user.id, team_id: team_id, status: In([1, 2])}, null, { created_date: 'DESC' });
                                if(getSameTeamInMultipleExit?.length > 1){
                                    createMember = await this.teamMembersService.update({id:getSameTeamInMultipleExit[0]['id'],user_id: user.id, team_id: team_id},{status: 1})
                                }else{
                                    createMember = await this.teamMembersService.update({user_id: user.id, team_id: team_id},{status: 1})
                                }
                            }else{
                                createMember = await this.teamMembersService.save(teamMember);
                                if(postData?.exitTeamIds && postData?.exitTeamIds?.length > 0){
                                    const filteredTeamIds = postData?.exitTeamIds.filter(id => id !== Number(team_id));
                                    if(filteredTeamIds.length > 0){
                                    for (const exitTeamId of filteredTeamIds) {
                                            await this.teamMembersService.update({user_id: user.id, team_id: exitTeamId}, {status: 2});
                                        }
                                    }
                                }
                            }
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
                                await this.portionCompleteEmail(turnComplete[team_id], req);
                            }
                        }
                        await this.inviteUserService.update({user_id: user.id, schedule_id: schedule_id},{status: 0})
                        const inviteUser = await this.teamMembersService.listRecord({team_id: team_id, user_id: user.id});
                        inviteUser?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CHALLENGE.TBL_CH_INVITE_USER, req.tokenUser?.id, 'join team'));
                    }else{
                        manageStatus = 3;
                    }
                }else{
                    manageStatus = 2;
                }
            }else{
                manageStatus = 1;
            }
            return manageStatus;
        } catch (error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
    
    async portionCompleteEmail(memberDatas: any, req: Request){
        try{
            let user = Object.create(req.tokenUser);
            let schedule_id = memberDatas.schedule_id;
            let userData = memberDatas.userData;
            let org_id = user.org_id;
            let orgName = user.company.company_name;
            if (userData?.length > 0) {
                const getScheduleDetails = await this.scheduleChallengeService.scheduleChallegeData({ id: schedule_id });
                if (getScheduleDetails) {
                    let hide_start_baton = (getScheduleDetails?.['hide_history']) ? getScheduleDetails?.['hide_history'] : 0;
                    let auto_email_setting = (getScheduleDetails?.['auto_email']) ? getScheduleDetails?.['auto_email'] : 0;
                    for (let getMember of userData) {
                        let join_id = getMember.scheduleJoin.id;
                        let team_id = getMember?.team_id;
                        let baton_status = getMember?.baton_status;
                        let user_order = getMember?.user_order;
                        let next_user_order = getMember?.user_order + 1;
                        let user_id = getMember.user_id;
                        let popupDetails = (getMember?.scheduleJoin?.relay_race_detail) ? JSON.parse(getMember?.scheduleJoin?.relay_race_detail) : Object.create(null);
                        if (popupDetails && ((popupDetails === null || Object.keys(popupDetails).length == 0) || (Object.keys(popupDetails).length > 0 && popupDetails.hasOwnProperty('portionCompleteEmail') && popupDetails.portionCompleteEmail == '') || (Object.keys(popupDetails).length > 0 && !popupDetails.hasOwnProperty('portionCompleteEmail')))) {
                            if (auto_email_setting == 0) {
                                let racer1Name = (getMember?.user?.name) ? getMember?.user?.name : (getMember?.user?.first_name + ' ' + getMember?.user?.last_name);
                                const joinTableList = [{ 'alias': 'user', 'table': tableConstant.TBL_USERS, 'on': `teamMember.user_id = user.id` }];
                                let nextGetBatonUser = await this.teamMembersService.findOne({ team_id: team_id, org_id: org_id, user_order: next_user_order, status: 1 }, '', joinTableList);
                                if (nextGetBatonUser && nextGetBatonUser !== null && nextGetBatonUser['user'] !== undefined) {
                                    let racer2Name = nextGetBatonUser?.['user'].first_name + ' ' + nextGetBatonUser?.['user'].last_name;
                                    const myTeamMembsers = await this.teamMembersService.teamDetails(`teamMember.team_id = ${team_id} AND teamMember.status = 1 AND users.status = 1`);
                                    if (myTeamMembsers && myTeamMembsers.length > 0) {
                                        for (let teamMember of myTeamMembsers) {
                                            let toEmail = teamMember['users'].email;
                                            let emailDetails = Object.create(null);
                                            emailDetails['type'] = 33;
                                            emailDetails['name'] = teamMember['users'].first_name + ' ' + teamMember['users'].last_name;
                                            emailDetails['racer1'] = racer1Name;
                                            emailDetails['racer2'] = racer2Name;
                                            emailDetails['company_name'] = orgName;
                                            emailDetails['team_name'] = teamMember['team'].tname;
                                            const templateText = await this.communicationTemplateTextService.findOne({ org_id: In([org_id, 0]), type: 33 });
                                            if(templateText){
                                                templateText['new_text'] = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                                            }
                                            let emaildata = {
                                                sender: ``,
                                                receiver: toEmail,
                                                subject: 'Virtual Relay Race - The Baton Has Been Passed!',
                                                content: emailDetails,
                                                template: templateText?.['new_text'] || templateText?.['text']
                                            }
                                            await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
                                        }
                                    }
                                    if ('portionCompleteEmail' in popupDetails) {
                                        popupDetails.portionCompleteEmail = 1;
                                    } else {
                                        popupDetails['portionCompleteEmail'] = 1;
                                    }
                                }
                            }
                        }
                        if (Object.keys(popupDetails).length > 0) {
                            const updateJoinUser = await this.scheduleChallengeJoinUsersService.update({ id: join_id, schedule_id: schedule_id, user_id: user_id }, { relay_race_detail: JSON.stringify(popupDetails) });
                        }
                    }
                }
            }
            return true;
        }catch(error){
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
        }
    }

    async sortUserByOnField(userDatas: object[], fieldName: string, key: string = '') {
        let userArray = Object.values(userDatas);
        if(key && key != '' && key != null && key != undefined) {
            userArray.sort((a: any, b: any) => b[key][fieldName] - a[key][fieldName]);
        }else {
            userArray.sort((a: any, b: any) => b[fieldName] - a[fieldName]);
        }
        userArray = userArray.map((item, index) => ({
            ...item,
            ranking: index + 1
            }));
        return userArray;
    }

    async sortUserByOnField2Level(userDatas: object[], fieldName: string, key: string = '', secondaryField: string = '') {
        let userArray = Object.values(userDatas);
        userArray.sort((a: any, b: any) => {
            let aPrimary = a[fieldName];
            let bPrimary = b[fieldName];

            if (bPrimary === aPrimary) {
                if (secondaryField) {
                    const aSecondary = a[key][secondaryField];
                    const bSecondary = b[key][secondaryField];
                    if (aSecondary > bSecondary) return 1;
                    if (aSecondary < bSecondary) return -1;
                    return 0;
                }
                return 0;
            }

            return bPrimary - aPrimary;
        });

        userArray = userArray.map((item, index) => ({
            ...item,
            ranking: index + 1,
        }));

        return userArray;
    }
}