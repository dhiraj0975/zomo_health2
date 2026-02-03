import { BioWeightDto, CommonArrayService, CommonDateService, CommonService } from '@common-constants';
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request } from "express";
import { lastValueFrom } from "rxjs";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { TranslationService } from "src/modules/translation/translation.service";
import { BioWeightService } from "../../bioweight/bioweight.service";
import { TeamsService } from "../../teams/teams.service";
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD
@Injectable()
export class WeightProgressChallengeService {
    constructor(
        private readonly translatorService: TranslationService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly teamsService: TeamsService,
        private readonly bioWeightService: BioWeightService,
        @Inject('COMMON_SERVICE')
            private commonMicroservice: ClientProxy,
        private readonly activityLogService: ActivityLogService,
    ) {}

    async weightProgressWithoutTeamChallenge(schedule: any, req: Request, show_type = 1) {
        try{
            let result = {};
            let schedule_id = schedule['sc']['id'];
            let challenge_id = schedule['sc']['challenge_id'];
            let scheduleid = schedule['id'];
            let user = Object.create(req.tokenUser);
            let userId = user.id;
            let timezone = user.timezone;
            let orgid = schedule['sc']['org_id'];
            result['touchdown'] = 0;
            result['totalweightlossinpound'] = 0;
            result['lastweight'] = 0;
            result['weightdiff'] = 0;
            result['secondlastweight'] = 0;
            result['totalweightloss'] = 0;
            result['userweight'] = [];
            let team_existVar = '';
            let display_ranking = schedule['sc']['display_ranking'] == 'Yes' ? 1 : 0;
            let topusers = Object.create(null);
            let myGroupID:any = '';
            let myTeamID:any = '';
            if(schedule['sc']['team'] == 1){
                const allgetteams: any = await this.teamsService.getAllTeams(`team.org_id = ${orgid} AND team.schedule_id = ${schedule_id}`);
                let myTeamMembers;
                let groupId = 0;
                let teamId = 0;
                let allteams = Object.create(null);
                let allgroups = Object.create(null);
                for (let getteam of allgetteams) {
                    if(getteam['teamMember'] && getteam['teamMember']?.length > 0){
                        getteam['teamMember'] = Object.values(getteam['teamMember']).filter((item)=> item['user']);
                        getteam['teamMember'] = Object.values(getteam['teamMember']).filter((item)=> item['scheduleJoin']);
                    }
                    groupId = getteam['group_id'];
                    teamId = getteam['id'];
                    let teamcreatedBy = getteam['created_by'];
                    getteam['weightloss'] = 0;
                    getteam['weightloosper'] = 0;
            
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
            
                    let groupTotalweightloss:any = 0;
                    let groupWeightloospertot:any = 0;

                    allteams['Teams'][teamId] = getteam;
                    if(getteam['teamMember'] && getteam['teamMember']?.length > 0){
                        const teamMembers = getteam['teamMember'];
                        let allUsersIdArray = teamMembers.map(member => member['user']?.id ? member['user']?.id : '');
                        const allUsersId:any = allUsersIdArray.filter(item => item !== '').join(',');
                        let user_in_ranking = schedule['in_ranking'];
                        if(allUsersIdArray.includes(user.id)){
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
                        let Allbioweightdatas = await this.bioWeightService.listRecord(`weight.schedule_id = ${schedule_id} AND weight.user_id IN (${allUsersId}) AND weight.status = 1`,{'weight.added_date': 'DESC', 'weight.id': 'DESC'});
                        if(schedule?.sc?.s_rangestartdate && schedule?.sc?.s_rangeenddate){
                            let range_startDate = await this.commonDateService.DateTimeFormat(schedule['sc']['rangestartdate'],'YYYY-MM-DD') + ' 00:00:00';
                            let range_endDate = await this.commonDateService.DateTimeFormat(schedule['sc']['rangeenddate'],'YYYY-MM-DD') + ' 23:59:59';
                            let s_range_startDate = await this.commonDateService.DateTimeFormat(schedule['sc']['s_rangestartdate'],'YYYY-MM-DD') + ' 00:00:00';
                            let s_range_endDate = await this.commonDateService.DateTimeFormat(schedule['sc']['s_rangeenddate'],'YYYY-MM-DD') + ' 23:59:59';
                                Allbioweightdatas = await this.bioWeightService.listRecord(`weight.status != 2 AND weight.schedule_id = ${schedule_id} AND ((weight.added_date BETWEEN '${range_startDate}' AND '${range_endDate}') OR (weight.added_date BETWEEN '${s_range_startDate}' AND '${s_range_endDate}') )`,{'weight.added_date': 'DESC', 'weight.id': 'DESC'},['weight.id','weight.user_id','weight.weight','weight.schedule_id','weight.schedule_join_id','weight.created_date','weight.modified_date','weight.added_date']
                            );
                        }
                        let bioweightuserss = new Map();
                        bioweightuserss = Allbioweightdatas.reduce((acc, item) => {
                            const userIds = Number(item.user_id);
                            if (!acc.has(userIds)) {
                                acc.set(userIds, []);
                            }
                            acc.get(userIds).push({...item, weight: (Math.round(parseFloat(item.weight) * 1000) / 1000)});
                            return acc;
                        }, new Map());
                        if(bioweightuserss.has(user.id)){
                            result['userweight'] = bioweightuserss.get(user.id);
                        }
                        let totalweightloss = 0;
                        let weightloospertot = 0;
                        let usersindividulweight = Object.create(null);
                        let k = 0;
                        let teammemberscore = Object.create(null);
                        for (let tuser of getteam['teamMember']) {
                            let teamuserid = tuser.user_id;
                            if (tuser['user'] && tuser['user']['profile_image'] && tuser['user']['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: tuser['user']['profile_image']}))) {
                                tuser['user']['profile_image'] = S3_URL + tuser['user']['profile_image'];
                            }else{
                                if(tuser['user']){
                                    tuser['user']['profile_image'] = S3_URL + 'comn/img/avatar_0001.png'; 
                                }
                            }
                            if(tuser['user']){
                                tuser['user']['name'] = '';
                            }
                            if (tuser['user'] && (tuser['user']['first_name'] && tuser['user']['last_name'])) {
                                tuser['user']['name'] = tuser['user']['first_name'] + ' '+ tuser['user']['last_name'];
                                delete(tuser['user']['first_name']);
                                delete(tuser['user']['last_name']);
                            }
                            if(tuser?.department && req?.lang != 'eng'){
                                let deptName = await this.translatorService.frontendReadTranslation(req.lang,`department_name_${tuser?.department?.id}`, `/LC_MESSAGES/OrgAdmin/Department/${orgid}/${tuser?.department?.id}`,`dynamic`);
                                tuser.department['dept_name'] = (deptName == '' || deptName == `department_name_${tuser?.department?.id}`) ? tuser?.department?.dept_name : deptName;
                            }
                            if(tuser?.locations && req?.lang != 'eng'){
                                if (tuser?.locations.location_name) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_name_${tuser?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${tuser?.locations['id']}`, `dynamic`);
                                    tuser.locations.location_name = (customName == '' || customName == `location_name_${tuser?.locations['id']}`) ? tuser?.locations['location_name'] : customName;
                                }
                                if (tuser?.locations.address1) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_address1_${tuser?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${tuser?.locations['id']}`, `dynamic`);
                                    tuser.locations.address1 = (customName == '' || customName == `location_address1_${tuser?.locations['id']}`) ? tuser?.locations['address1'] : customName;
                                }
                                if (tuser?.locations.address2) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_address2_${tuser?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${tuser?.locations['id']}`, `dynamic`);
                                    tuser.locations.address2 = (customName == '' || customName == `location_address2_${tuser?.locations['id']}`) ? tuser?.locations['address2'] : customName;
                                }
                                if (tuser?.locations.lname) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_lname_${tuser?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${tuser?.locations['id']}`, `dynamic`);
                                    tuser.locations.lname = (customName == '' || customName == `location_lname_${tuser?.locations['id']}`) ? tuser?.locations['lname'] : customName;
                                }
                                if (tuser?.locations.city) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_city_${tuser?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${tuser?.locations['id']}`, `dynamic`);
                                    tuser.locations.city = (customName == '' || customName == `location_city_${tuser?.locations['id']}`) ? tuser?.locations['city'] : customName;
                                }
                                if (tuser?.locations.state) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_state_${tuser?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${tuser?.locations['id']}`, `dynamic`);
                                    tuser.locations.state = (customName == '' || customName == `location_state_${tuser?.locations['id']}`) ? tuser?.locations['state'] : customName;
                                }
                                if (tuser?.locations.country) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_country_${tuser?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${tuser?.locations['id']}`, `dynamic`);
                                    tuser.locations.country = (customName == '' || customName == `location_country_${tuser?.locations['id']}`) ? tuser?.locations['country'] : customName;
                                }
                            }

                            if (user_in_ranking == 1) {
                                if (user.id == teamuserid) {
                                    tuser['userdetail'] = tuser['user'];
                                    tuser['in_ranking'] = tuser['scheduleJoin']['in_ranking'];
                                    tuser['is_captain'] = tuser?.iscaptain;
                                }
                            }else {
                                if (tuser['scheduleJoin']['in_ranking'] == 0) {
                                    tuser['userdetail'] = tuser['user'];
                                    tuser['in_ranking'] = tuser['scheduleJoin']['in_ranking'];
                                    tuser['is_captain'] = tuser?.iscaptain;
                                }
                            }
                            if (bioweightuserss.has(teamuserid)) {
                                let firstweightarr = bioweightuserss.get(teamuserid)[bioweightuserss.get(teamuserid).length -1];;
                                let firstWeight = parseFloat(firstweightarr['weight']);
                                let lastWeight = bioweightuserss.get(teamuserid)[0];
                                lastWeight = (lastWeight !== undefined) ? parseFloat(lastWeight['weight']) : 0;
                                let diffweight = firstWeight - lastWeight;
                                if (bioweightuserss.get(teamuserid).length < 1) {
                                    diffweight = 0;
                                }
                                if (diffweight <= 0) {
                                    diffweight = 0;
                                }
                                tuser['uweightloss'] = diffweight;
                                totalweightloss += diffweight;
                                totalweightloss = parseFloat(totalweightloss.toFixed(3));
                                let weightloosper = 0;
                                if(diffweight != 0){
                                    weightloosper = (firstWeight != 0) ? parseFloat(((diffweight*100)/firstWeight).toFixed(3)) : 0;
                                }
                                tuser['weightloosper'] = weightloosper;
                                weightloospertot += weightloosper;
                                
                                if(teamuserid == user.id){ 
                                    result['lastweight'] = lastWeight;
                                    result['weightdiff'] = parseFloat((diffweight).toFixed(3));
                                    if(diffweight!=0){    
                                        let weightDiff =  parseFloat((lastWeight - firstWeight) > 0 ? `+${(lastWeight - firstWeight)}` : `${(lastWeight - firstWeight)}`);
                                        result['weightdiff'] = parseFloat(weightDiff.toFixed(3));
                                    }
                                    result['secondlastweight'] = firstWeight;
                                    result['mypoundlost'] = diffweight;
                                    result['totalweightloss'] = diffweight;
                                }
                                
                                if(myTeamID == teamId){
                                    weightloosper = 0;
                                    if(diffweight != 0){
                                        weightloosper = (firstWeight != 0) ? parseFloat((((diffweight)*100)/firstWeight).toFixed(3)) : 0;
                                    }
                                    usersindividulweight[teamuserid] = weightloosper;
                                }
                                if(display_ranking){
                                    if (!topusers[teamuserid]) {
                                        topusers[teamuserid] = Object.create(null);
                                    }
                                    topusers[teamuserid]['id'] = (tuser?.['userdetail']) ? tuser['userdetail']['id'] : tuser['user']['id'];
                                    topusers[teamuserid]['name'] = (tuser?.['userdetail']) ? tuser['userdetail']['name'] : tuser['user']['name'];
                                    topusers[teamuserid]['profile_image'] = (tuser?.['userdetail']) ? tuser['userdetail']['profile_image'] : tuser['user']['profile_image'];
                                    topusers[teamuserid]['weightloosper'] = weightloosper;
                                    topusers[teamuserid]['uweightloss'] = diffweight;
                                    topusers[teamuserid]['lastweight'] = lastWeight;
                                    topusers[teamuserid]['secondlastweight'] = firstWeight;
                                }
                            }
                        }

                        if(usersindividulweight && Object.keys(usersindividulweight).length){
                            result['usersindividulweight'] = usersindividulweight;
                        }
                        if(myTeamID == teamId){
                            result['totalweightlossinpound'] = totalweightloss;
                            result['totalweightloss'] = totalweightloss;
                        }
                        if(myTeamID == teamId){
                            result['myTeamDetails']['weightloss'] = totalweightloss;
                            result['myTeamDetails']['weightloosper'] = weightloospertot;
                        }
                        allteams['Teams'][teamId]['weightloss'] = totalweightloss;
                        allteams['Teams'][teamId]['weightloosper'] = weightloospertot;

                        if (schedule['sc']['group_status'] == 1 && groupId != 0) {
                            const groupTeamCount = allgetteams.filter(team => team.group_id === groupId).length;
                            if (!allgroups['Groups']) {
                                allgroups['Groups'] = Object.create(null);
                            }
                            if (!allgroups['Groups'][groupId]) {
                                allgroups['Groups'][groupId] = Object.create(null);
                            }
                            if(allgroups['Groups'][groupId]['weightloss']){
                                groupTotalweightloss = allgroups['Groups'][groupId]['weightloss'] + totalweightloss;
                            }else{
                                groupTotalweightloss = totalweightloss;
                            }
                            if(allgroups['Groups'][groupId]['weightloosper']){
                                groupWeightloospertot = allgroups['Groups'][groupId]['weightloosper'] + weightloospertot;
                            }else{
                                groupWeightloospertot = weightloospertot;
                            }
                            
                            allgroups['Groups'][groupId]['weightloss'] = parseFloat(groupTotalweightloss.toFixed(3));
                            allgroups['Groups'][groupId]['weightloosper'] = parseFloat(groupWeightloospertot.toFixed(3));
                            allgroups['Groups'][groupId]['group_id'] = groupId;
                            allgroups['Groups'][groupId]['name'] = getteam['challengeGroups']['name'];
                            allgroups['Groups'][groupId]['logo'] = getteam['challengeGroups']['logo'];
                            delete(allteams['Teams'][teamId]['challengeGroups']);
                        }

                        if(allteams['Teams'][teamId]['teamMember']){
                            if(schedule['sc']['rank_type'] == 'weight_loss_per'){
                                allteams['Teams'][teamId]['teamMember'] = Object.values(allteams['Teams'][teamId]['teamMember']).sort((a, b) => {
                                    const rtmp = b['weightloosper'] > a['weightloosper'] ? 1 : (b['weightloosper'] === a['weightloosper'] ? 2 : -1);
                                    if (rtmp === 1) {
                                        return rtmp;
                                    } else if (rtmp === 2) {
                                        return b['uweightloss'] > a['uweightloss'] ? 1 : -1; 
                                    }
                                    return rtmp; 
                                });
                            }else{
                                allteams['Teams'][teamId]['teamMember'] = Object.values(allteams['Teams'][teamId]['teamMember']).sort((a, b) => {
                                    const rtmp = b['uweightloss'] > a['uweightloss'] ? 1 : (b['uweightloss'] === a['uweightloss'] ? 2 : -1);
                                    if (rtmp === 1) {
                                        return rtmp;
                                    } else if (rtmp === 2) {
                                        return b['weightloosper'] > a['weightloosper'] ? 1 : -1; 
                                    }
                                    return rtmp; 
                                });
                            }
                        }
                
                        if(allUsersIdArray.includes(userId)){
                            result['myTeamDetails']['teamMember'] = allteams['Teams'][teamId]['teamMember'];
                        }
                    }

                    if(schedule['sc']['group_status'] == 1 && groupId != 0){
                        if (!allgroups['Groups']) {
                            allgroups['Groups'] = Object.create(null);
                        }
                    }
                    if (schedule['sc']['group_status'] == 1 && groupId != 0 && getteam['teamMember'] && getteam['teamMember']?.length == 0 && !allgroups['Groups'][groupId]) {
                        const groupTeamCount = allgetteams.filter(team => team.group_id === groupId).length;
                        if (!allgroups['Groups']) {
                            allgroups['Groups'] = Object.create(null);
                        }
                        if (!allgroups['Groups'][groupId]) {
                            allgroups['Groups'][groupId] = Object.create(null);
                        }
                        if(allgroups['Groups'][groupId]['weightloss']){
                            groupTotalweightloss = 0;
                        }else{
                            groupTotalweightloss = 0;
                        }
                        if(allgroups['Groups'][groupId]['weightloosper']){
                            groupWeightloospertot = 0;
                        }else{
                            groupWeightloospertot = 0;
                        }
                        
                        allgroups['Groups'][groupId]['weightloss'] = 0;
                        allgroups['Groups'][groupId]['weightloosper'] = 0;
                        allgroups['Groups'][groupId]['group_id'] = groupId;
                        allgroups['Groups'][groupId]['name'] = getteam['challengeGroups']['name'];
                        allgroups['Groups'][groupId]['logo'] = getteam['challengeGroups']['logo'];
                        delete(allteams['Teams'][teamId]['challengeGroups']);
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
                    if(teamcreatedBy == user.id){
                        team_existVar = 'yes';
                    }
                }
                
                let sortedTeams = [];
                if(allteams['Teams']){
                    if(schedule['sc']['rank_type'] == 'weight_loss_per'){
                        sortedTeams = Object.values(allteams['Teams']).sort((a, b) => {
                            const rtmp = b['weightloosper'] > a['weightloosper'] ? 1 : (b['weightloosper'] === a['weightloosper'] ? 2 : -1);
                            if (rtmp === 1) {
                                return rtmp;
                            } else if (rtmp === 2) {
                                return b['weightloss'] > a['weightloss'] ? 1 : -1; 
                            }
                            return rtmp; 
                        });
                    }else{
                        sortedTeams = Object.values(allteams['Teams']).sort((a, b) => {
                            const rtmp = b['weightloss'] > a['weightloss'] ? 1 : (b['weightloss'] === a['weightloss'] ? 2 : -1);
                            if (rtmp === 1) {
                                return rtmp;
                            } else if (rtmp === 2) {
                                return b['weightloosper'] > a['weightloosper'] ? 1 : -1; 
                            }
                            return rtmp; 
                        });
                    }
                }
                let sortedGroups = [];
                if(allgroups['Groups']){
                    if(schedule['sc']['rank_type'] == 'weight_loss_per'){
                        sortedGroups = Object.values(allgroups['Groups']).sort((a, b) => {
                            const rtmp = b['weightloosper'] > a['weightloosper'] ? 1 : (b['weightloosper'] === a['weightloosper'] ? 2 : -1);
                            if (rtmp === 1) {
                                return rtmp;
                            } else if (rtmp === 2) {
                                return b['weightloss'] > a['weightloss'] ? 1 : -1; 
                            }
                            return rtmp; 
                        });
                    }else{
                        sortedGroups = Object.values(allgroups['Groups']).sort((a, b) => {
                            const rtmp = b['weightloss'] > a['weightloss'] ? 1 : (b['weightloss'] === a['weightloss'] ? 2 : -1);
                            if (rtmp === 1) {
                                return rtmp;
                            } else if (rtmp === 2) {
                                return b['weightloosper'] > a['weightloosper'] ? 1 : -1; 
                            }
                            return rtmp; 
                        });
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
                if(sortedTeams && sortedTeams.length > 0 && show_type == 1){
                    result['allteams'] = sortedTeams;
                }
                result['allgroups'] = sortedGroups;

                if(show_type == 2){
                    if(result['myTeamDetails']['teamMember'] && result['myTeamDetails']['teamMember'].length > 0){
                        const matchedMember = result['myTeamDetails']['teamMember'].find(
                            (member) => member.user_id === userId
                        );
                        if (matchedMember) {
                            const { user_id, user, uweightloss, weightloosper } = matchedMember;
                            result['userData'] = { user_id, user, uweightloss, weightloosper } ;
                        }
                    }
                    if(result['myTeamDetails']['teamMember']){
                        delete(result['myTeamDetails']['teamMember']);
                    }
                    if(result['userweight']){
                        delete(result['userweight']);
                    }
                    if(result['usersindividulweight']){
                        delete(result['usersindividulweight']);
                    }
                    if (schedule['sc']['group_status'] == 1 && myGroupID != 0) {
                        const myGroups = result['allgroups'].find(group => group.group_id === myGroupID);
                        result['myGroupDetails'] = myGroups ? myGroups : {};
                    }
                    if(result['allgroups']){
                        delete(result['allgroups'])
                    }
                }

            }else{
                let Allbioweightdatas = await this.bioWeightService.listRecord(`weight.schedule_id = ${schedule_id} AND weight.status = 1`,{'weight.added_date': 'DESC', 'weight.id': 'DESC'});
                Allbioweightdatas = <any>(await this.commonArrayService.formatToDto(BioWeightDto, Allbioweightdatas, req.lang));
                if(schedule?.sc?.s_rangestartdate && schedule?.sc?.s_rangeenddate){
                    let range_startDate = await this.commonDateService.DateTimeFormat(schedule['sc']['rangestartdate'],'YYYY-MM-DD') + ' 00:00:00';
                    let range_endDate = await this.commonDateService.DateTimeFormat(schedule['sc']['rangeenddate'],'YYYY-MM-DD') + ' 23:59:59';
                    let s_range_startDate = await this.commonDateService.DateTimeFormat(schedule['sc']['s_rangestartdate'],'YYYY-MM-DD') + ' 00:00:00';
                    let s_range_endDate = await this.commonDateService.DateTimeFormat(schedule['sc']['s_rangeenddate'],'YYYY-MM-DD') + ' 23:59:59';
                        Allbioweightdatas = await this.bioWeightService.listRecord(`weight.status != 2 AND weight.schedule_id = ${schedule_id} AND ((weight.added_date BETWEEN '${range_startDate}' AND '${range_endDate}') OR (weight.added_date BETWEEN '${s_range_startDate}' AND '${s_range_endDate}') )`,{'weight.added_date': 'DESC', 'weight.id': 'DESC'},['weight.id','weight.user_id','weight.weight','weight.schedule_id','weight.schedule_join_id','weight.created_date','weight.modified_date','weight.added_date']
                    );
                }
                
                let bioweightuserss = new Map();
                bioweightuserss = Allbioweightdatas.reduce((acc, item) => {
                    const userIds = Number(item.user_id);
                    if (!acc.has(userIds)) {
                        acc.set(userIds, []);
                    }
                    acc.get(userIds).push({...item, weight: (Math.round(parseFloat(item.weight) * 1000) / 1000)});
                    return acc;
                }, new Map());
                if(bioweightuserss.has(user.id)){
                    result['userweight'] = bioweightuserss.get(user.id);
                }
                let Allusers = await this.bioWeightService.listRecord(`weight.schedule_id = ${schedule_id} AND weight.status = 1`,{'weight.added_date': 'DESC', 'weight.id': 'DESC'},['weight.user_id','user.profile_image','user.first_name','user.last_name'],'weight.user_id', ['userinner']);
                let teammemberscore = [];
                let k = 0;
                for (let tuser of Allusers) {
                    let inner_users_id = tuser['user_id'];
                    if (tuser?.['user'] && tuser?.['user']?.['profile_image'] && tuser['user']['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: tuser['user']['profile_image']}))) {
                        tuser['user']['profile_image'] = S3_URL + tuser['user']['profile_image'];
                    }else{
                        if(tuser['user']){
                            tuser['user']['profile_image'] = S3_URL + 'comn/img/avatar_0001.png'; 
                        }
                    }
                    
                    if(tuser['user']){
                        tuser['user']['name'] = '';
                    }
                    if (tuser['user'] && (tuser['user']['first_name'] && tuser['user']['last_name'])) {
                        tuser['user']['name'] = tuser['user']['first_name'] + ' '+ tuser['user']['last_name'];
                        delete(tuser['user']['first_name']);
                        delete(tuser['user']['last_name']);
                    }
                    
                    if (bioweightuserss.has(inner_users_id)) {
                        let firstweightarr = bioweightuserss.get(inner_users_id)[bioweightuserss.get(inner_users_id).length -1];
                        let firstWeight = parseFloat(firstweightarr['weight']);
                        let lastWeight = bioweightuserss.get(inner_users_id)[0];
                        lastWeight = (lastWeight !== undefined) ? parseFloat(lastWeight['weight']) : 0;
                        let diffweight = firstWeight - lastWeight;
                        if (bioweightuserss.get(inner_users_id).length < 1) {
                            diffweight = 0;
                        }
                        if (diffweight <= 0) {
                            diffweight = 0;
                        }
                        tuser['uweightloss'] = diffweight;
                        let weightloosper = 0;
                        if(diffweight != 0){
                            weightloosper = (firstWeight != 0) ? parseFloat(((diffweight*100)/firstWeight).toFixed(3)) : 0;
                        }
                        tuser['weightloosper'] = weightloosper;
                        
                        if(inner_users_id == user.id){ 
                            result['lastweight'] = lastWeight;
                            result['weightdiff'] = parseFloat((diffweight).toFixed(3));
                            if(diffweight != 0){
                                let weightDiff =  parseFloat((lastWeight - firstWeight) > 0 ? `+${(lastWeight - firstWeight)}` : `${(lastWeight - firstWeight)}`);
                                result['weightdiff'] = parseFloat(weightDiff.toFixed(3));
                            }
                            result['secondlastweight'] = firstWeight;
                            result['mypoundlost'] = diffweight;
                            result['totalweightloss'] = diffweight;
                            if(result['userweight'].length){
                                const todayFormatted = moment().format('YYYY-MM-DD');
                                const todayData = result['userweight'].filter(obj => {
                                    const objectDate = moment(obj.added_date_copy).format('YYYY-MM-DD'); 
                                    return objectDate === todayFormatted;
                                });
                                result['todayWeight'] = todayData[0]?.weight || result['userweight'][0]?.weight || 0;
                            }
                        }
                        if(display_ranking){
                            if (!topusers[inner_users_id]) {
                                topusers[inner_users_id] = Object.create(null);
                            }
                            topusers[inner_users_id]['id'] = (tuser?.['userdetail']) ? tuser['userdetail']['id'] : tuser['user']['id'];
                            topusers[inner_users_id]['name'] = (tuser?.['userdetail']) ? tuser['userdetail']['name'] : tuser['user']['name'];
                            topusers[inner_users_id]['profile_image'] = (tuser?.['userdetail']) ? tuser['userdetail']['profile_image'] : tuser['user']['profile_image'];
                            topusers[inner_users_id]['weightloosper'] = weightloosper;
                            topusers[inner_users_id]['uweightloss'] = diffweight;
                            topusers[inner_users_id]['lastweight'] = lastWeight;
                            topusers[inner_users_id]['secondlastweight'] = firstWeight;
                        }
                    }
                }  
                if(Allusers){
                    if(schedule['sc']['rank_type'] == 'weight_loss_per'){
                        Allusers = Object.values(Allusers).sort((a, b) => {
                            const rtmp = b['weightloosper'] > a['weightloosper'] ? 1 : (b['weightloosper'] === a['weightloosper'] ? 2 : -1);
                            if (rtmp === 1) {
                                return rtmp;
                            } else if (rtmp === 2) {
                                return b['weightloss'] > a['weightloss'] ? 1 : -1; 
                            }
                            return rtmp; 
                        });
                    }else{
                        Allusers = Object.values(Allusers).sort((a, b) => {
                            const rtmp = b['weightloss'] > a['weightloss'] ? 1 : (b['weightloss'] === a['weightloss'] ? 2 : -1);
                            if (rtmp === 1) {
                                return rtmp;
                            } else if (rtmp === 2) {
                                return b['weightloosper'] > a['weightloosper'] ? 1 : -1; 
                            }
                            return rtmp; 
                        });
                    }
                }
                result['Alluserweight'] = Allusers;
                if(show_type == 2){
                    if(result['Alluserweight'] && result['Alluserweight'].length>0){
                        const matchedMember = result['Alluserweight'].find(
                            (member) => member.user_id === userId
                        );
                        if (matchedMember) {
                            result['userData'] = matchedMember;
                        }
                        delete(result['Alluserweight']);
                    }
                    if(result['userweight']){
                        delete(result['userweight']);
                    }
                }
            }
            result['team_exist'] = team_existVar;
            result['toptenusers'] = [];
            if(topusers && Object.keys(topusers).length > 0){
                if (schedule['sc']['rank_type'] == "weight_loss_per") {
                    topusers = Object.values(topusers).sort((a, b) => b['weightloosper'] - a['weightloosper']);
                } else {
                    topusers = Object.values(topusers).sort((a, b) => b['weightloss'] - a['weightloss']);
                }
            }
            
            if (topusers.length >= 10) {
                topusers = topusers.slice(0, 10);
            }
            if(topusers && topusers.length > 0){
                result['toptenusers'] = topusers.filter(ele=> ele.uweightloss !=0);
            }
            return result;
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang,error.message));
        }
    }
    async weightProgressChallenge(schedule: any, req: Request, show_type = 1) {
        try{
            let result = {};
            let schedule_id = schedule['sc']['id'];
            let challenge_id = schedule['sc']['challenge_id'];
            let scheduleid = schedule['id'];
            let yard = schedule['sc']['yard'];
            let user = Object.create(req.tokenUser);
            let userId = user.id;
            let timezone = user.timezone;
            let orgid = schedule['sc']['org_id'];
            result['touchdown'] = 0;
            result['totalweightlossinpound'] = 0;
            result['lastweight'] = 0;
            result['weightdiff'] = 0;
            result['secondlastweight'] = 0;
            result['totalweightloss'] = 0;
            result['userweight'] = [];
            let team_existVar = '';
            let user_in_ranking = schedule['in_ranking'];
            let display_ranking = schedule['sc']['display_ranking'] == 'Yes' ? 1 : 0;
            let topusers = Object.create(null);
            let myGroupID:any = '';
            let myTeamID:any = '';
            if(schedule['sc']['team'] == 1){
                const allgetteams: any = await this.teamsService.getAllTeams(`team.org_id = ${orgid} AND team.schedule_id = ${schedule_id}`);
                let groupId = 0;
                let teamId = 0;
                let allteams = Object.create(null);
                let allgroups = Object.create(null);
                for (let getteam of allgetteams) {
                    if(getteam['teamMember'] && getteam['teamMember']?.length > 0){
                        getteam['teamMember'] = Object.values(getteam['teamMember']).filter((item)=> item['user']);
                        getteam['teamMember'] = Object.values(getteam['teamMember']).filter((item)=> item['scheduleJoin']);
                    }
                    groupId = getteam['group_id'];
                    teamId = getteam['id'];
                    let teamcreatedBy = getteam['created_by'];
                    getteam['weightloss'] = 0;
                    getteam['weightloosper'] = 0;
                    getteam['weightloosperavg'] = 0;
            
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
            
                    let groupTotalweightloss:any = 0;
                    let groupWeightloospertot:any = 0;

                    allteams['Teams'][teamId] = getteam;
                    if(getteam['teamMember'] && getteam['teamMember']?.length > 0){
                        const teamMembers = getteam['teamMember'];
                        let allUsersIdArray = teamMembers.map(member => member['user']?.id ? member['user']?.id : '');
                        const allUsersId:any = allUsersIdArray.filter(item => item !== '').join(',');
                        if(allUsersIdArray.includes(user.id)){
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
                        let Allbioweightdatas = await this.bioWeightService.listRecord(`weight.schedule_id = ${schedule_id} AND weight.user_id IN (${allUsersId}) AND weight.status = 1`,{'weight.added_date': 'DESC', 'weight.id': 'DESC'});
                        if(schedule?.sc?.s_rangestartdate && schedule?.sc?.s_rangeenddate){
                            let range_startDate = await this.commonDateService.DateTimeFormat(schedule['sc']['rangestartdate'],'YYYY-MM-DD') + ' 00:00:00';
                            let range_endDate = await this.commonDateService.DateTimeFormat(schedule['sc']['rangeenddate'],'YYYY-MM-DD') + ' 23:59:59';
                            let s_range_startDate = await this.commonDateService.DateTimeFormat(schedule['sc']['s_rangestartdate'],'YYYY-MM-DD') + ' 00:00:00';
                            let s_range_endDate = await this.commonDateService.DateTimeFormat(schedule['sc']['s_rangeenddate'],'YYYY-MM-DD') + ' 23:59:59';
                                Allbioweightdatas = await this.bioWeightService.listRecord(`weight.status != 2 AND weight.schedule_id = ${schedule_id} AND ((weight.added_date BETWEEN '${range_startDate}' AND '${range_endDate}') OR (weight.added_date BETWEEN '${s_range_startDate}' AND '${s_range_endDate}') )`,{'weight.added_date': 'DESC', 'weight.id': 'DESC'},['weight.id','weight.user_id','weight.weight','weight.schedule_id','weight.schedule_join_id','weight.created_date','weight.modified_date','weight.added_date']
                            );
                        }
                        let bioweightuserss = new Map();
                        bioweightuserss = Allbioweightdatas.reduce((acc, item) => {
                            const userIds = Number(item.user_id);
                            if (!acc.has(userIds)) {
                                acc.set(userIds, []);
                            }
                            acc.get(userIds).push({...item, weight: (Math.round(parseFloat(item.weight) * 1000) / 1000)});
                            return acc;
                        }, new Map());
                        if(bioweightuserss.has(user.id)){
                            result['userweight'] = bioweightuserss.get(user.id);
                        }
                        let totalweightloss = 0;
                        let weightloospertot = 0;
                        let usersindividulweight = Object.create(null);
                        let k = 0;
                        let teammemberscore = Object.create(null);
                        for (let tuser of getteam['teamMember']) {
                            let teamuserid = tuser.user_id;
                            if (tuser['user'] && tuser['user']['profile_image'] && tuser['user']['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: tuser['user']['profile_image']}))) {
                                tuser['user']['profile_image'] = S3_URL + tuser['user']['profile_image'];
                            }
                            else{
                                if(tuser['user']){
                                    tuser['user']['profile_image'] = S3_URL + 'comn/img/avatar_0001.png'; 
                                }
                            }
                            if(tuser['user']){
                                tuser['user']['name'] = '';
                            }
                            if (tuser['user'] && (tuser['user']['first_name'] && tuser['user']['last_name'])) {
                                tuser['user']['name'] = tuser['user']['first_name'] + ' '+ tuser['user']['last_name'];
                                delete(tuser['user']['first_name']);
                                delete(tuser['user']['last_name']);
                            }
                            if(tuser?.department && req?.lang != 'eng'){
                                let deptName = await this.translatorService.frontendReadTranslation(req.lang,`department_name_${tuser?.department?.id}`, `/LC_MESSAGES/OrgAdmin/Department/${orgid}/${tuser?.department?.id}`,`dynamic`);
                                tuser.department['dept_name'] = (deptName == '' || deptName == `department_name_${tuser?.department?.id}`) ? tuser?.department?.dept_name : deptName;
                            }
                            if(tuser?.locations && req?.lang != 'eng'){
                                if (tuser?.locations.location_name) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_name_${tuser?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${tuser?.locations['id']}`, `dynamic`);
                                    tuser.locations.location_name = (customName == '' || customName == `location_name_${tuser?.locations['id']}`) ? tuser?.locations['location_name'] : customName;
                                }
                                if (tuser?.locations.address1) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_address1_${tuser?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${tuser?.locations['id']}`, `dynamic`);
                                    tuser.locations.address1 = (customName == '' || customName == `location_address1_${tuser?.locations['id']}`) ? tuser?.locations['address1'] : customName;
                                }
                                if (tuser?.locations.address2) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_address2_${tuser?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${tuser?.locations['id']}`, `dynamic`);
                                    tuser.locations.address2 = (customName == '' || customName == `location_address2_${tuser?.locations['id']}`) ? tuser?.locations['address2'] : customName;
                                }
                                if (tuser?.locations.lname) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_lname_${tuser?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${tuser?.locations['id']}`, `dynamic`);
                                    tuser.locations.lname = (customName == '' || customName == `location_lname_${tuser?.locations['id']}`) ? tuser?.locations['lname'] : customName;
                                }
                                if (tuser?.locations.city) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_city_${tuser?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${tuser?.locations['id']}`, `dynamic`);
                                    tuser.locations.city = (customName == '' || customName == `location_city_${tuser?.locations['id']}`) ? tuser?.locations['city'] : customName;
                                }
                                if (tuser?.locations.state) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_state_${tuser?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${tuser?.locations['id']}`, `dynamic`);
                                    tuser.locations.state = (customName == '' || customName == `location_state_${tuser?.locations['id']}`) ? tuser?.locations['state'] : customName;
                                }
                                if (tuser?.locations.country) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `location_country_${tuser?.locations['id']}`, `/LC_MESSAGES/OrgAdmin/Location/${orgid}/${tuser?.locations['id']}`, `dynamic`);
                                    tuser.locations.country = (customName == '' || customName == `location_country_${tuser?.locations['id']}`) ? tuser?.locations['country'] : customName;
                                }
                            }

                            if (user_in_ranking == 1) {
                                if (user.id == teamuserid) {
                                    tuser['userdetail'] = tuser['user'];
                                    tuser['in_ranking'] = tuser['scheduleJoin']['in_ranking'];
                                    tuser['is_captain'] = tuser?.iscaptain;
                                }
                            }else {
                                if (tuser?.['scheduleJoin']?.['in_ranking'] == 0) {
                                    tuser['userdetail'] = tuser['user'];
                                    tuser['in_ranking'] = tuser['scheduleJoin']['in_ranking'];
                                    tuser['is_captain'] = tuser?.iscaptain;
                                }
                            }
                            if (bioweightuserss.has(teamuserid)) {
                                let firstweightarr = bioweightuserss.get(teamuserid)[bioweightuserss.get(teamuserid).length -1];;
                                let firstWeight = parseFloat(firstweightarr['weight']);
                                let lastWeight = bioweightuserss.get(teamuserid)[0];
                                lastWeight = (lastWeight !== undefined) ? parseFloat(lastWeight['weight']) : 0;
                                let diffweight = firstWeight - lastWeight;
                                if (bioweightuserss.get(teamuserid).length < 1) {
                                    diffweight = 0;
                                }
                                if (diffweight <= 0) {
                                    diffweight = 0;
                                }
                                tuser['uweightloss'] = diffweight;
                                totalweightloss += diffweight;
                                totalweightloss = parseFloat(totalweightloss.toFixed(3));
                                let weightloosper = 0;
                                if(diffweight != 0){
                                    weightloosper = (firstWeight != 0) ? parseFloat(((diffweight*100)/firstWeight).toFixed(2)) : 0;
                                }
                                tuser['weightloosper'] = weightloosper;
                                weightloospertot += weightloosper;
                                
                                if(teamuserid == user.id){ 
                                    result['lastweight'] = lastWeight;
                                    result['weightdiff'] = parseFloat((diffweight).toFixed(3));
                                    if(diffweight!=0){    
                                        let weightDiff =  parseFloat((lastWeight - firstWeight) > 0 ? `+${(lastWeight - firstWeight)}` : `${(lastWeight - firstWeight)}`);
                                        result['weightdiff'] = parseFloat(weightDiff.toFixed(3));
                                    }
                                    result['secondlastweight'] = firstWeight;
                                    result['mypoundlost'] = diffweight;
                                    result['totalweightloss'] = diffweight;
                                }
                                
                                if(myTeamID == teamId){
                                    weightloosper = 0;
                                    if(diffweight != 0){
                                        weightloosper = (firstWeight != 0) ? parseFloat((((diffweight)*100)/firstWeight).toFixed(2)) : 0;
                                    }
                                    usersindividulweight[teamuserid] = weightloosper;
                                }
                                if(display_ranking){
                                    if (!topusers[teamuserid]) {
                                        topusers[teamuserid] = Object.create(null);
                                    }
                                    topusers[teamuserid]['id'] = (tuser?.['userdetail']) ? tuser['userdetail']['id'] : tuser['user']['id'];
                                    topusers[teamuserid]['name'] = (tuser?.['userdetail']) ? tuser['userdetail']['name'] : tuser['user']['name'];
                                    topusers[teamuserid]['profile_image'] = (tuser?.['userdetail']) ? tuser['userdetail']['profile_image'] : tuser['user']['profile_image'];
                                    topusers[teamuserid]['weightloosper'] = weightloosper;
                                    topusers[teamuserid]['uweightloss'] = diffweight;
                                    topusers[teamuserid]['lastweight'] = lastWeight;
                                    topusers[teamuserid]['secondlastweight'] = firstWeight;
                                }
                            }
                        }

                        if(usersindividulweight && Object.keys(usersindividulweight).length){
                            result['usersindividulweight'] = usersindividulweight;
                        }
                        if(myTeamID == teamId){
                            result['totalweightlossinpound'] = totalweightloss;
                            result['totalweightloss'] = totalweightloss;
                        }
                        if(myTeamID == teamId){
                            result['myTeamDetails']['weightloss'] = totalweightloss;
                            result['myTeamDetails']['weightloosper'] = weightloospertot;
                        }
                        allteams['Teams'][teamId]['weightloss'] = totalweightloss;
                        allteams['Teams'][teamId]['weightloosper'] = weightloospertot;
                        allteams['Teams'][teamId]['weightloosperavg'] = allteams['Teams'][teamId]['teamMember'] ? parseFloat((weightloospertot/ Object.values(allteams['Teams'][teamId]['teamMember'])?.length).toFixed(2)) : 0;
                        if (getteam['created_by']==user.id){
                            result['team_exist'] = 'yes';
                            allteams['Teams'][teamId]['team_exist'] = 'yes';
                       }
                        if (schedule['sc']['group_status'] == 1 && groupId != 0) {
                            const groupTeam = allgetteams.filter(team => team.group_id === groupId);
                            const memberCount = groupTeam.reduce((count, team) => count + (team.teamMember ? team.teamMember.length : 0), 0);
                            const groupTeamCount = groupTeam.length;
                            if (!allgroups['Groups']) {
                                allgroups['Groups'] = Object.create(null);
                            }
                            if (!allgroups['Groups'][groupId]) {
                                allgroups['Groups'][groupId] = Object.create(null);
                            }
                            if(allgroups['Groups'][groupId]['weightloss']){
                                groupTotalweightloss = allgroups['Groups'][groupId]['weightloss'] + totalweightloss;
                            }else{
                                groupTotalweightloss = totalweightloss;
                            }
                            if(allgroups['Groups'][groupId]['weightloosper']){
                                groupWeightloospertot = allgroups['Groups'][groupId]['weightloosper'] + weightloospertot;
                            }else{
                                groupWeightloospertot = weightloospertot;
                            }
                            
                            allgroups['Groups'][groupId]['weightloss'] = parseFloat(groupTotalweightloss.toFixed(3)); 
                            allgroups['Groups'][groupId]['memberCount'] = memberCount; 
                            allgroups['Groups'][groupId]['weightloosper'] = parseFloat(groupWeightloospertot.toFixed(3));
                            allgroups['Groups'][groupId]['weightloosperavg'] = groupTeamCount ? parseFloat((groupTeam.reduce((count, team) => count + (team.weightloosperavg ? team.weightloosperavg : 0), 0)/ groupTeamCount).toFixed(2)) : 0;
                            allgroups['Groups'][groupId]['group_id'] = groupId;
                            allgroups['Groups'][groupId]['name'] = getteam['challengeGroups']['name'];
                            allgroups['Groups'][groupId]['logo'] = getteam['challengeGroups']['logo'];
                            delete(allteams['Teams'][teamId]['challengeGroups']);
                        }

                        if(allteams['Teams'][teamId]['teamMember']){
                            if(schedule['sc']['rank_type'] == 'weight_loss_per'){
                                allteams['Teams'][teamId]['teamMember'] = Object.values(allteams['Teams'][teamId]['teamMember']).sort((a, b) => {
                                    const rtmp = b['weightloosper'] > a['weightloosper'] ? 1 : (b['weightloosper'] === a['weightloosper'] ? 2 : -1);
                                    if (rtmp === 1) {
                                        return rtmp;
                                    } else if (rtmp === 2) {
                                        return b['uweightloss'] > a['uweightloss'] ? 1 : -1; 
                                    }
                                    return rtmp; 
                                });
                            }else{
                                allteams['Teams'][teamId]['teamMember'] = Object.values(allteams['Teams'][teamId]['teamMember']).sort((a, b) => {
                                    const rtmp = b['uweightloss'] > a['uweightloss'] ? 1 : (b['uweightloss'] === a['uweightloss'] ? 2 : -1);
                                    if (rtmp === 1) {
                                        return rtmp;
                                    } else if (rtmp === 2) {
                                        return b['weightloosper'] > a['weightloosper'] ? 1 : -1; 
                                    }
                                    return rtmp; 
                                });
                            }
                        }
                
                        if(allUsersIdArray.includes(userId)){
                            result['myTeamDetails']['teamMember'] = allteams['Teams'][teamId]['teamMember'];
                        }
                    }
                    if(schedule['sc']['group_status'] == 1 && groupId != 0){
                        if (!allgroups['Groups']) {
                            allgroups['Groups'] = Object.create(null);
                        }
                    }
                    if (schedule['sc']['group_status'] == 1 && groupId != 0 && getteam['teamMember'] && getteam['teamMember']?.length == 0 && !allgroups['Groups'][groupId]) {
                        const groupTeamCount = allgetteams.filter(team => team.group_id === groupId).length;
                        if (!allgroups['Groups']) {
                            allgroups['Groups'] = Object.create(null);
                        }
                        if (!allgroups['Groups'][groupId]) {
                            allgroups['Groups'][groupId] = Object.create(null);
                        }
                        if(allgroups['Groups'][groupId]['weightloss']){
                            groupTotalweightloss = 0;
                        }else{
                            groupTotalweightloss = 0;
                        }
                        if(allgroups['Groups'][groupId]['weightloosper']){
                            groupWeightloospertot = 0;
                        }else{
                            groupWeightloospertot = 0;
                        }
                        
                        allgroups['Groups'][groupId]['weightloss'] = 0;
                        allgroups['Groups'][groupId]['weightloosper'] = 0;
                        allgroups['Groups'][groupId]['weightloosperavg'] =  0;
                        allgroups['Groups'][groupId]['group_id'] = groupId;
                        allgroups['Groups'][groupId]['name'] = getteam['challengeGroups']['name'];
                        allgroups['Groups'][groupId]['logo'] = getteam['challengeGroups']['logo'];
                        delete(allteams['Teams'][teamId]['challengeGroups']);
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
                    if(teamcreatedBy == user.id){
                        team_existVar = 'yes';
                    }
                }
                let sortedTeams = [];
                if(allteams['Teams']){
                    if(schedule['sc']['rank_type'] == 'weight_loss_per'){
                        sortedTeams = Object.values(allteams['Teams']).sort((a, b) => {
                            const rtmp = b['weightloosper'] > a['weightloosper'] ? 1 : (b['weightloosper'] === a['weightloosper'] ? 2 : -1);
                            if (rtmp === 1) {
                                return rtmp;
                            } else if (rtmp === 2) {
                                return b['weightloss'] > a['weightloss'] ? 1 : -1; 
                            }
                            return rtmp; 
                        });
                    }
                    else if(schedule['sc']['rank_type'] == 'weight_loss_per_avg'){
                        sortedTeams = Object.values(allteams['Teams']).sort((a, b) => {
                            const rtmp = b['weightloosperavg'] > a['weightloosperavg'] ? 1 : (b['weightloosperavg'] === a['weightloosperavg'] ? 2 : -1);
                            if (rtmp === 1) {
                                return rtmp;
                            } else if (rtmp === 2) {
                                return b['weightloosper'] > a['weightloosper'] ? 1 : -1; 
                            }
                            return rtmp; 
                        });
                    }
                    else{
                        sortedTeams = Object.values(allteams['Teams']).sort((a, b) => {
                            const rtmp = b['weightloss'] > a['weightloss'] ? 1 : (b['weightloss'] === a['weightloss'] ? 2 : -1);
                            if (rtmp === 1) {
                                return rtmp;
                            } else if (rtmp === 2) {
                                return b['weightloosper'] > a['weightloosper'] ? 1 : -1; 
                            }
                            return rtmp; 
                        });
                    }
                }
                let sortedGroups = [];
                if(allgroups['Groups']){
                    if(schedule['sc']['rank_type'] == 'weight_loss_per'){
                        sortedGroups = Object.values(allgroups['Groups']).sort((a, b) => {
                            const rtmp = b['weightloosper'] > a['weightloosper'] ? 1 : (b['weightloosper'] === a['weightloosper'] ? 2 : -1);
                            if (rtmp === 1) {
                                return rtmp;
                            } else if (rtmp === 2) {
                                return b['weightloss'] > a['weightloss'] ? 1 : -1; 
                            }
                            return rtmp; 
                        });
                    }else{
                        sortedGroups = Object.values(allgroups['Groups']).sort((a, b) => {
                            const rtmp = b['weightloss'] > a['weightloss'] ? 1 : (b['weightloss'] === a['weightloss'] ? 2 : -1);
                            if (rtmp === 1) {
                                return rtmp;
                            } else if (rtmp === 2) {
                                return b['weightloosper'] > a['weightloosper'] ? 1 : -1; 
                            }
                            return rtmp; 
                        });
                    }
                    if (schedule['sc']['group_order'] === 1) {
                        sortedGroups = Object.values(allgroups['Groups']).sort((a, b) => {
                            return b['memberCount'] - a['memberCount'];
                        });
                    }
                    else if(schedule['sc']['group_order'] === 0){
                        sortedGroups = Object.values(allgroups['Groups']).sort((a, b) => {
                            return b['weightloosperavg']  - a['weightloosperavg'];
                        });
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
                if(sortedTeams && sortedTeams.length > 0 && show_type == 1 ){
                    result['allteams'] = sortedTeams;
                }
                result['allgroups'] = sortedGroups;
                if(show_type == 2){
                    if(result['myTeamDetails']['teamMember'] && result['myTeamDetails']['teamMember'].length > 0){
                        const matchedMember = result['myTeamDetails']['teamMember'].find(
                            (member) => member.user_id === userId
                        );
                        if (matchedMember) {
                            const { user_id, user, uweightloss, weightloosper } = matchedMember;
                            result['userData'] = { user_id, user, uweightloss, weightloosper } ;
                        }
                    }
                    if(result['myTeamDetails']['teamMember']){
                        delete(result['myTeamDetails']['teamMember']);
                    }
                    if(result['userweight']){
                        delete(result['userweight']);
                    }
                    if(result['usersindividulweight']){
                        delete(result['usersindividulweight']);
                    }
                    
                    if (schedule['sc']['group_status'] == 1 && myGroupID != 0) {
                        const myGroups = result['allgroups'].find(group => group.group_id === myGroupID);
                        result['myGroupDetails'] = myGroups ? myGroups : {};
                    }
                    if(result['allgroups']){
                        delete(result['allgroups'])
                    }
                }
            }else{
                let Allbioweightdatas = await this.bioWeightService.listRecord(`weight.schedule_id = ${schedule_id} AND weight.status = 1`,{'weight.added_date': 'DESC', 'weight.id': 'DESC'});
                if(schedule?.sc?.s_rangestartdate && schedule?.sc?.s_rangeenddate){
                    let range_startDate = await this.commonDateService.DateTimeFormat(schedule['sc']['rangestartdate'],'YYYY-MM-DD') + ' 00:00:00';
                    let range_endDate = await this.commonDateService.DateTimeFormat(schedule['sc']['rangeenddate'],'YYYY-MM-DD') + ' 23:59:59';
                    let s_range_startDate = await this.commonDateService.DateTimeFormat(schedule['sc']['s_rangestartdate'],'YYYY-MM-DD') + ' 00:00:00';
                    let s_range_endDate = await this.commonDateService.DateTimeFormat(schedule['sc']['s_rangeenddate'],'YYYY-MM-DD') + ' 23:59:59';
                    Allbioweightdatas = await this.bioWeightService.listRecord(`weight.status = 1 AND weight.schedule_id = ${schedule_id} AND ((weight.added_date BETWEEN '${range_startDate}' AND '${range_endDate}') OR (weight.added_date BETWEEN '${s_range_startDate}' AND '${s_range_endDate}') )`,{'weight.added_date': 'DESC', 'weight.id': 'DESC'},['weight.id','weight.user_id','weight.weight','weight.schedule_id','weight.schedule_join_id','weight.created_date','weight.modified_date','weight.added_date']
                    );
                }
                
                let bioweightuserss = new Map();
                bioweightuserss = Allbioweightdatas.reduce((acc, item) => {
                    const userIds = Number(item.user_id);
                    if (!acc.has(userIds)) {
                        acc.set(userIds, []);
                    }
                    acc.get(userIds).push({...item, weight: (Math.round(parseFloat(item.weight) * 1000) / 1000)});
                    return acc;
                }, new Map());
                if(bioweightuserss.has(user.id)){
                    result['userweight'] = bioweightuserss.get(user.id);
                }
                let Allusers = await this.bioWeightService.listRecord(`weight.schedule_id = ${schedule_id} AND weight.status = 1 AND weight.status = 1`,{'weight.added_date': 'DESC', 'weight.id': 'DESC'},['weight.user_id','user.profile_image','user.first_name','user.last_name'],'weight.user_id', ['userinner']);
                let teammemberscore = [];
                let k = 0;
                for (let tuser of Allusers) {
                    let inner_users_id = tuser['user_id'];
                    if (tuser['user'] && tuser['user']['profile_image'] && tuser['user']['profile_image'] != '' && await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: tuser['user']['profile_image']}))) {
                        tuser['user']['profile_image'] = S3_URL + tuser['user']['profile_image'];
                    }
                    else{
                        if(tuser['user']){
                            tuser['user']['profile_image'] = S3_URL + 'comn/img/avatar_0001.png'; 
                        }
                    }
                    if(tuser['user']){
                        tuser['user']['name'] = '';
                    }
                    tuser['user']['id'] = tuser['user_id'];
                    if (tuser['user'] && (tuser['user']['first_name'] && tuser['user']['last_name'])) {
                        tuser['user']['name'] = tuser['user']['first_name'] + ' '+ tuser['user']['last_name'];
                        delete(tuser['user']['first_name']);
                        delete(tuser['user']['last_name']);
                    }
                    tuser['userdetail'] = tuser['user'];
                    delete tuser['user'];
                    
                    if (bioweightuserss.has(inner_users_id)) {
                        let firstweightarr = bioweightuserss.get(inner_users_id)[bioweightuserss.get(inner_users_id).length -1];
                        let firstWeight = parseFloat(firstweightarr['weight']);
                        let lastWeight = bioweightuserss.get(inner_users_id)[0];
                        lastWeight = (lastWeight !== undefined) ? parseFloat(lastWeight['weight']) : 0;
                        let diffweight = firstWeight - lastWeight;
                        if (bioweightuserss.get(inner_users_id).length < 1) {
                            diffweight = 0;
                        }
                        if (diffweight <= 0) {
                            diffweight = 0;
                        }
                        tuser['uweightloss'] = diffweight;
                        let weightloosper = 0;
                        if(diffweight != 0){
                            weightloosper = (firstWeight != 0) ? parseFloat(((diffweight*100)/firstWeight).toFixed(2)) : 0;
                        }
                        tuser['weightloosper'] = weightloosper;
                        
                        if(inner_users_id == user.id){ 
                            result['lastweight'] = lastWeight;
                            result['weightdiff'] = parseFloat((diffweight).toFixed(3));
                            if(diffweight != 0){
                                let weightDiff =  parseFloat((lastWeight - firstWeight) > 0 ? `+${(lastWeight - firstWeight)}` : `${(lastWeight - firstWeight)}`);
                                result['weightdiff'] = parseFloat(weightDiff.toFixed(3));
                            }
                            result['secondlastweight'] = firstWeight;
                            result['mypoundlost'] = diffweight;
                            result['totalweightloss'] = diffweight;
                        }
                        if(display_ranking){
                            if (!topusers[inner_users_id]) {
                                topusers[inner_users_id] = Object.create(null);
                            }
                            topusers[inner_users_id]['id'] = (tuser?.['userdetail']) ? tuser['userdetail']['id'] : tuser['user']['id'];
                            topusers[inner_users_id]['name'] = (tuser?.['userdetail']) ? tuser['userdetail']['name'] : tuser['user']['name'];
                            topusers[inner_users_id]['profile_image'] = (tuser?.['userdetail']) ? tuser['userdetail']['profile_image'] : tuser['user']['profile_image'];
                            topusers[inner_users_id]['weightloosper'] = weightloosper;
                            topusers[inner_users_id]['uweightloss'] = diffweight;
                            topusers[inner_users_id]['lastweight'] = lastWeight;
                            topusers[inner_users_id]['secondlastweight'] = firstWeight;
                        }
                    }
                }   
                if(Allusers){
                    if(schedule['sc']['rank_type'] == 'weight_loss_per'){
                        Allusers = Object.values(Allusers).sort((a, b) => {
                            const rtmp = b['weightloosper'] > a['weightloosper'] ? 1 : (b['weightloosper'] === a['weightloosper'] ? 2 : -1);
                            if (rtmp === 1) {
                                return rtmp;
                            } else if (rtmp === 2) {
                                return b['weightloss'] > a['weightloss'] ? 1 : -1; 
                            }
                            return rtmp; 
                        });
                    }else{
                        Allusers = Object.values(Allusers).sort((a, b) => {
                            const rtmp = b['weightloss'] > a['weightloss'] ? 1 : (b['weightloss'] === a['weightloss'] ? 2 : -1);
                            if (rtmp === 1) {
                                return rtmp;
                            } else if (rtmp === 2) {
                                return b['weightloosper'] > a['weightloosper'] ? 1 : -1; 
                            }
                            return rtmp; 
                        });
                    }
                }
                result['Alluserweight'] = Allusers;
                if(show_type == 2){
                    if(result['Alluserweight'] && result['Alluserweight'].length>0){
                        const matchedMember = result['Alluserweight'].find(
                            (member) => member.user_id === userId
                        );
                        if (matchedMember) {
                            result['userData'] = matchedMember;
                        }
                        delete(result['Alluserweight']);
                    }
                    if(result['userweight']){
                        delete(result['userweight']);
                    }
                }
            }
            result['team_exist'] = team_existVar;
            result['toptenusers'] = [];
            if(topusers && Object.keys(topusers).length > 0){
                if (schedule['sc']['rank_type'] == "weight_loss_per") {
                    topusers = Object.values(topusers).sort((a, b) => b['weightloosper'] - a['weightloosper']);
                } else {
                    topusers = Object.values(topusers).sort((a, b) => b['weightloss'] - a['weightloss']);
                }
            }
            
            if (topusers.length >= 10) {
                topusers = topusers.slice(0, 10);
            }
            if(topusers && topusers.length > 0){
                result['toptenusers'] = topusers.filter(ele=> ele.uweightloss !=0);
            }
            return result;
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang,error.message));
        }
    }
}