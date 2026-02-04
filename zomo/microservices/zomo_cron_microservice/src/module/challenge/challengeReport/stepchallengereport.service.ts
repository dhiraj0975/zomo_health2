import {
    CommonArrayService,
    CommonDateService,
    CommonHealthService,
    ScheduleChallengeEntity,
    tableConstant
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { cronAppConstant } from 'src/common';
import { ActivityFeedService } from 'src/module/tracker/activityfeeds.service';
import { UserService } from 'src/module/user/user.service';
import { StepCheckpointsService } from '../stepcheckpoints/stepcheckpoints.service';
import { TeamsService } from '../team/teams.service';
import { TeamMembersService } from '../teammember/teammembers.service';
const moment = require('moment-timezone');

@Injectable()
export class StepsChallengeReportService {
    constructor(
        private readonly commonDateService: CommonDateService,
        private readonly userService: UserService,
        private readonly commonArrayService: CommonArrayService,
        private readonly activityFeedsService: ActivityFeedService,
        private readonly commonHealthService: CommonHealthService,
        private readonly teamsService: TeamsService,
        private readonly teamMembersService: TeamMembersService,
        private readonly stepCheckpointsService: StepCheckpointsService,
    ) {}

    async stepChallengeReport(schedule: Partial<ScheduleChallengeEntity>,condition: string = '',result_type: number = 1,paginateObj: any = null,teamCondition: string = '',groupCondition: string = '') {
        try {
            let result = await this.stepChallengeReportHelper(
                schedule,
                condition.replace(/User/gi, "user"),
                result_type,
                paginateObj,
                teamCondition,
                groupCondition
            );
            return result;
        } catch (error) {
            throw new Error(error);
        }
    }

    async stepChallengeReportHelper(schedule: Partial<ScheduleChallengeEntity>, condition: string = '', result_type: number = 1, paginateObj: any = null,teamCondition: string = '',groupCondition: string = '') {
        try {
            let actTrackId, stepId, wakingId, runningId, cyclingId, swimmingId;
            let totalDays = 0, uptoDays = 0;
            const startDate: any = this.commonDateService.DateTimeFormat(schedule?.['start_date']);
            const endDate: any = this.commonDateService.DateTimeFormat(schedule?.['end_date']);
            const today = this.commonDateService.DateTimeFormat('now'); 
            let joinTable;
            let fields;
            actTrackId = 7;
            stepId = 11;
            wakingId = 15;
            runningId = 16;
            cyclingId = 17;
            swimmingId = 18;
            if (schedule.s_activity_tracker === 0) {
                actTrackId = "";
            }
            if (schedule.s_steps === 0) {
                stepId = "";
            }
            if (schedule.s_walking === 0) {
                wakingId = "";
            }
            if (schedule.s_running === 0) {
                runningId = "";
            }
            if (schedule.s_cycling === 0) {
                cyclingId = "";
            }
            if (schedule.s_swimming === 0) {
                swimmingId = "";
            }
            let is_set_weekend = schedule.is_set_weekend;
            let dailySteps = schedule['ch'].numberofsteps;
            if (schedule.numberofsteps !== 0) {
                dailySteps = schedule.numberofsteps;
            }
            let countUserWithZero = schedule.countuserwithzero;
            let dailyMaxStepsCnt = schedule.dailymaxstepscnt;
            let countStepsWith = schedule.countstepswith;
            let logType;
            if (countStepsWith === 'realstep') {
                logType = " and food.logType = 'Tracker'";
            } else {
                logType = "and food.logType in('Tracker','Manual')";
            }
            if (is_set_weekend === 1) {
                logType += " AND  WEEKDAY(food.collectionDate)>=0 AND WEEKDAY(food.collectionDate)<5";
            }
            let dateDiff = endDate.diff(startDate, 'days') + 1;
            totalDays = dateDiff;
            dateDiff = today.diff(startDate, 'days') + 1;
            uptoDays = dateDiff;
            if(uptoDays == 0){
                uptoDays = 1;
            }
            let nDcStart = this.commonDateService.DateTimeFormat(schedule?.['start_date']);
            let nDcEnd = this.commonDateService.DateTimeFormat(schedule?.['end_date']);
            if (is_set_weekend === 1) {
                while (nDcStart <= nDcEnd) {
                    const startDay = this.commonDateService.DateTimeFormat(nDcStart);
                    let dayOfWeek = startDay.isoWeekday();
                    totalDays += (dayOfWeek != 0 && dayOfWeek < 6) ? 1 : 0;   
                    if(dayOfWeek != 0 && dayOfWeek < 6 && moment.utc(nDcStart, 'YYYY-MM-DD').unix() <= moment.utc().unix()){
                        uptoDays++;
                    }
                    nDcStart = startDay.add(1, 'days').format('YYYY-MM-DD');
                }
            }
            let totalSteps = dailySteps * totalDays;
            joinTable = [
                {'alias':'teamSchedule', 'table' : tableConstant.CHALLENGE.TBL_CH_TEAM_SCHEDULE, 'on' : `team.id = teamSchedule.team_id` , 'connect' : 'team', 'type' : 'LEFT' },
                {'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = team.org_id AND company.status = 1`, 'connect' : 'team', 'type' : 'LEFT' },
                {'alias':'group', 'table' : tableConstant.CHALLENGE.TBL_CH_GROUPS, 'on' : `group.id = team.group_id` , 'connect' : 'team', 'type' : 'LEFT' },
            ];
            fields = ['team.id','team.tname','team.logo','team.team_size','team.group_id','group.id','group.name','company.id','company.company_name'];
            let teamWhere = `team.org_id = ${schedule?.org_id} AND teamSchedule.schedule_id = ${schedule?.id} AND team.status != 2`;
            if(teamCondition !== ''){
                teamWhere += teamCondition;
            }
            if(groupCondition !== ''){
                teamWhere += groupCondition;
            }
            let teamList: any = await this.teamsService.list(teamWhere, null,fields,null,joinTable);
            let result;
            if(teamList.length){
                const allTeams = [];
                const topUsers = {};
                let allGroups;
                allGroups = {};
                let allDailyStepsForAll = 0;
                let allTeamProgress = 0;
                let teamCompleted = 0;
                let teamRemain = 0;
                let teamBeyonds = 0;
                let captain = '';
                for (let key = 0; key < teamList.length; key++) {
                    const getTeam = teamList[key];
                    const groupKey = getTeam?.group_id;
                    const teamId = getTeam?.id;
                    joinTable = [
                        {'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : `teamMember.user_id = user.id`, 'connect' : 'teamMember', 'type' : 'LEFT' },
                        {'alias':'department', 'table' : tableConstant.COMPANIES.TBL_DEPARTMENT, 'on' : `department.id = user.department_id`, 'connect' : 'user', 'type' : 'LEFT' },
                        {'alias':'Location', 'table' : tableConstant.COMPANIES.TBL_LOCATION, 'on' : `Location.id = user.location`, 'connect' : 'user', 'type' : 'LEFT' },
                        {'alias':'team', 'table' : tableConstant.CHALLENGE.TBL_CH_TEAMS, 'on' : `teamMember.team_id = team.id` , 'connect' : 'user', 'type' : 'LEFT' },
                        {'alias':'scj', 'table' : tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, 'on' : `team.schedule_id = scj.schedule_id And teamMember.user_id = scj.user_id` , 'connect' : 'user', 'type' : 'LEFT' },
                        {'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = user.org_id AND company.status = 1`, 'connect' : 'user', 'type' : 'LEFT' },
                    ];
                    fields = ['teamMember.id','teamMember.user_id','teamMember.iscaptain','teamMember.baton_status','department.dept_name','Location.location_name','Location.city','Location.state','Location.lname',
                    'user.id','user.status','user.employeeid','user.first_name','user.middle_name','user.last_name','user.email','user.profile_image','user.code','user.on_insurance_plan','user.insurance_plan_name','user.gender','user.role_id','user.date_of_hire','user.dob'];
                    const teamMembers = await this.teamMembersService.list(`teamMember.org_id = ${schedule?.org_id} AND teamMember.team_id = ${teamId} AND teamMember.status != 2 AND team.status != 2 AND user.status != 2 AND ${condition}`, null,fields,null,joinTable);
                    let teamData = [];
                    let totalPercentage = 0;
                    let teamsMem = 0;
                    let realStepsWalks = 0;
                    let stepsWalks = 0;
                    let allTotalStepsTeam = 0;
                    let allTotalRemainStepsUnCount = 0;
                    let allCompetedSteps = 0;
                    let tempAllCompetedSteps = 0;
                    let allTotalRemainSteps = 0;
                    let beyonds = 0;
                    let beyondsTotal = 0;
                    let totalStepsTeamAll = 0;
                    let allAverageStepsTeam = 0;
                    let totalTeamMember = 0;
                    let averageStep = 0;
                    let tempTotalTeamMember = 0;
                    let allUsersId = teamMembers.map(tm => tm['user'] && tm['user'].id);
                    let allStepsData;
                    let todayStepsData;
                    let findAll = `(${[actTrackId, stepId, wakingId, runningId, cyclingId, swimmingId].map(id => `'${id}'`).join(',')})`;
                    let dynamicSum = 'SUM(steps)';
                    if (schedule?.['ch']?.bio_challenge_type?.trim() === 'Mile_layout') {
                        dynamicSum = 'SUM(distance)';
                        findAll = '(17)';
                    }
                    if (allUsersId.length) {
                        let where = `food.collectionDate BETWEEN '${this.commonDateService.DateTimeFormat(schedule.start_date,'YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.DateTimeFormat(schedule.end_date,'YYYY-MM-DD')} 23:59:59' ${logType} AND food.status != 2`;
                        allStepsData = await this.activityFeedsService.listRecord(
                            `food.user_id IN (${allUsersId.join(',')}) AND (food.activityTypeId IN ${findAll}  OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${where}`,
                            { 'food.collectionDate': 'DESC' },
                            [`${dynamicSum} as steps`, 'user_id', 'collectionDate'],
                            'food.user_id, food.collectionDate',
                        );
                        let temp = allStepsData.reduce((acc, item) => {
                            const userId = item?.user_id;
                            const steps = Number(item?.steps ?? 0);
                            if (!acc[userId]) {
                                acc[userId] = steps;
                            }
                            else{
                                acc[userId] += steps
                            }
                            return acc;
                        }, {});
                        if (Object.keys(temp).length > 0) {
                            allStepsData = temp;
                        }

                        where = `food.collectionDate BETWEEN '${this.commonDateService.DateTimeFormat('now','YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.DateTimeFormat('now','YYYY-MM-DD')} 23:59:59'  ${logType} AND food.status != 2`;
                        todayStepsData = await this.activityFeedsService.listRecord(
                            `food.user_id IN (${allUsersId}) AND (food.activityTypeId IN ${findAll} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${where}`,
                            { 'food.collectionDate': 'DESC' },
                            [`${dynamicSum} as steps`, 'user_id', 'collectionDate'],
                            'food.user_id, food.collectionDate',
                        );
                        temp = todayStepsData.reduce((acc, item) => {
                            const userId = item?.user_id;
                            const steps = Number(item?.steps ?? 0);
                            if (!acc[userId]) { 
                                acc[userId] = steps;
                            }
                            else{
                                acc[userId] += steps
                            }
                            return acc;
                        }, {});

                        if (Object.keys(temp).length > 0) {
                            todayStepsData = temp;
                        }
                    }
                    for (const tUser of teamMembers) {
                        const userid = tUser['user'].id;
                        tUser['Location'] = tUser['user']['Location'];
                        delete tUser['user']['Location'];
                        tUser['department'] = tUser['user']['department'];
                        delete tUser['user']['department'];
                        if(tUser?.iscaptain){
                            captain = tUser['user']['first_name'] + ' ' + tUser['user']['last_name'];
                        }
                        if (allStepsData.hasOwnProperty(userid)) {
                            stepsWalks = allStepsData[userid];
                            realStepsWalks = allStepsData[userid];
                            if (dailyMaxStepsCnt && dailyMaxStepsCnt !== 0) {
                                const upDailyMaxStepsCnt = dailyMaxStepsCnt * uptoDays;
                                if (stepsWalks > upDailyMaxStepsCnt) {
                                    stepsWalks = upDailyMaxStepsCnt;
                                }
                            }
                            if (!stepsWalks) {
                                stepsWalks = 0;
                                realStepsWalks = 0;
                            }
                        } else {
                            stepsWalks = 0;
                            realStepsWalks = 0;
                        }
                        allCompetedSteps += stepsWalks;
                        tempAllCompetedSteps += stepsWalks;
                        let stepsDaily = 0;
                        if (todayStepsData.hasOwnProperty(userid)) {
                            stepsDaily = todayStepsData[userid];
                            if (dailyMaxStepsCnt && dailyMaxStepsCnt !== 0) {
                                if (stepsDaily > dailyMaxStepsCnt) {
                                    stepsDaily = dailyMaxStepsCnt;
                                }
                            }
                            if (stepsDaily) {
                                teamsMem++;
                            }
                        }
                        allDailyStepsForAll += stepsDaily;
                        let remainSteps = schedule?.numberofsteps ? schedule?.numberofsteps * totalDays : 0; //ZOMO-4437
                        if (stepsWalks) {
                            remainSteps = totalSteps - stepsWalks;
                            if (remainSteps < 0) {
                                let temps = remainSteps;
                                remainSteps = 0;
                                beyonds += temps;
                                beyondsTotal += beyonds;
                            }
                            allTotalRemainSteps += remainSteps;
                            totalStepsTeamAll = allCompetedSteps + allTotalRemainSteps;
                            totalTeamMember++;
                        }
                        tempTotalTeamMember++;
                        let percentage = 0;
                        if (totalSteps !== 0) {
                            percentage = parseFloat(((stepsWalks * 100) / totalSteps).toFixed(2));
                        }
                        if (percentage >= 100) {
                            percentage = 100;
                        }
                        if (schedule?.['ch']?.bio_challenge_type?.trim() === 'Mile_layout') {
                            averageStep = uptoDays != 0 ? Number((stepsWalks / uptoDays).toFixed(2)) : 0;
                        } else {
                            // averageStep = uptoDays != 0 ? Math.round(stepsWalks / uptoDays) : 0;
                            averageStep = totalDays != 0 ? Math.round(stepsWalks / totalDays) : 0;
                        }
                        teamData.push({
                            userId: userid,
                            percentage,
                            userdetail: tUser['user'],
                            completedsteps: stepsWalks,
                            totalstepscompleted: stepsWalks,
                            company: getTeam['company'],
                            Department: tUser['department'],
                            department: tUser['department'],
                            location: tUser['Location'],
                            Locations: tUser['Location'],
                            teamMember: tUser['teamMember'],
                            averagestep: averageStep,
                            averagesteps: averageStep,
                            realcompletedsteps: realStepsWalks,
                            realtotalstepscompleted: realStepsWalks
                        });
                        totalPercentage += percentage;
                        topUsers[userid] = {
                            ...tUser['user'],
                            company: getTeam['company'],
                            team: getTeam,
                            group: getTeam?.group,
                            Department: tUser['department'],
                            department: tUser['department'],
                            location: tUser['Location'],
                            Locations: tUser['Location'],
                            percentage,
                            completedsteps: stepsWalks,
                            totalstepscompleted: stepsWalks,
                            realcompletedsteps: realStepsWalks,
                            realtotalstepscompleted: realStepsWalks,
                            averagestep: averageStep,
                            averagesteps: averageStep,
                            remainsteps: remainSteps,
                            captain
                        };
                    }

                    if (schedule.rank_type === "average_steps") {
                        teamData.sort((a, b) => b.averagestep - a.averagestep);
                    } else {
                        teamData.sort((a, b) => b.realcompletedsteps - a.realcompletedsteps);
                    }

                    if (schedule.rank_type === "average_steps") {
                        allTotalStepsTeam = allCompetedSteps + allTotalRemainSteps;
                    } else {
                        allTotalStepsTeam = totalSteps * tempTotalTeamMember;
                    }

                    let teamProgress = 0;
                    if (allTotalStepsTeam !== 0 && totalTeamMember !== 0) {
                        teamProgress = parseFloat(((allCompetedSteps * 100) / (totalTeamMember * totalSteps)).toFixed(2));
                    }
                    if (teamProgress >= 100) {
                        teamProgress = 100;
                    }
                    allTeamProgress += teamProgress;
                    const newTeamObj = {
                        ...getTeam,
                        progress: teamProgress,
                        totalstepscompleted: tempAllCompetedSteps
                    };
                    if (allTotalStepsTeam !== 0 && totalTeamMember !== 0) {
                        // allAverageStepsTeam = Math.round((allCompetedSteps / totalTeamMember) / uptoDays);
                        allAverageStepsTeam = Math.round((allCompetedSteps / totalTeamMember) / totalDays);
                    }
                    newTeamObj.averagestepsteam = allAverageStepsTeam;
                    if (teamData.length > 0) {
                        newTeamObj.teammember = teamData;
                        // allAverageStepsTeam = Math.round((allCompetedSteps / teamData.length) / uptoDays);
                        allAverageStepsTeam = Math.round((allCompetedSteps / teamData.length) / totalDays);
                    }
                    teamCompleted += tempAllCompetedSteps;
                    allTotalRemainStepsUnCount = (totalSteps * totalTeamMember) - tempAllCompetedSteps;
                    if (allTotalRemainStepsUnCount < 0) {
                        let temps = allTotalRemainStepsUnCount;
                        teamBeyonds = temps;
                        allTotalRemainStepsUnCount = 0;
                    }
                    teamRemain = allTotalRemainStepsUnCount;
                    newTeamObj.remainsteps = teamRemain;
                    newTeamObj.teamsmembers = tempTotalTeamMember;
                    if (schedule.group_status === 1) {
                        if (!allGroups[groupKey]) {
                            allGroups[groupKey] = {
                            groupname: getTeam.group.name,
                            companyname: getTeam.company.company_name,
                            totalstepscompleted: 0,
                            remainsteps: 0,
                            progress: 0,
                            averagestepsteam: 0,
                            Teams: {}
                            };
                        }
                        allGroups[groupKey].Teams[key] = {
                            groupname: getTeam.group.name,
                            companyname: getTeam.company.company_name,
                            totalstepscompleted: tempAllCompetedSteps,
                            remainsteps: teamRemain,
                            progress: teamProgress,
                            averagestepsteam: allAverageStepsTeam
                        };
                        allGroups[groupKey].totalstepscompleted += tempAllCompetedSteps;
                        allGroups[groupKey].remainsteps += teamRemain;
                        allGroups[groupKey].progress += teamProgress;
                        allGroups[groupKey].averagestepsteam += allAverageStepsTeam;
                    }
                    allTeams.push(newTeamObj);
                }
                
                if (allTeams.length > 0) {
                    if (schedule.rank_type === "average_steps") {
                        allTeams.sort((a, b) => b.averagestepsteam - a.averagestepsteam);
                    } else {
                        allTeams.sort((a, b) => b.totalstepscompleted - a.totalstepscompleted);
                    }
                }
                if(Object.keys(allGroups).length){
                    allGroups = Object.values(allGroups);
                }
                else{
                    allGroups = [];
                }
                if(schedule?.group_status == 1){
                    if (allGroups.length > 0) {
                        if (schedule.rank_type === "average_steps") {
                            allGroups.sort((a, b) => b.averagestepsteam - a.averagestepsteam);
                        } else {
                            allGroups.sort((a, b) => b.totalstepscompleted - a.totalstepscompleted);
                        }
                    }
                }
                result = Object.values(topUsers);
                if (result.length > 0) {
                    if (schedule.rank_type === "average_steps") {
                        result.sort((a, b) => b.averagestep - a.averagestep);
                    } else {
                        result.sort((a, b) => b.completedsteps - a.completedsteps);
                    }
                }
                let rank = 1;
                for(let item of result)  {
                    if (!item['rank']) {
                        item['rank'] = 0;
                    }
                    item['rank'] = rank++;
                }
                if (result_type == 2) {
                    let clm_name_arr = ['RANK',...cronAppConstant.USER_HEADER_DATA];
                    if(schedule?.group_status == 1){
                        clm_name_arr.push('GROUP NAME')
                    }
                    if(schedule['ch']['bio_challenge_type'] == "Mile_layout"){
                        clm_name_arr = [...clm_name_arr,...['TEAM', 'CAPTAIN NAME','TOTAL MILES - NO MAX', 'TOTAL MILES - MAX', 'TOTAL % COMPLETION - MAX', 'AVERAGE MILES - MAX', 'MILES TO GOAL - MAX']];
                    }
                    else {
                        clm_name_arr = [...clm_name_arr,...['TEAM', 'CAPTAIN NAME','TOTAL STEPS - NO MAX', 'TOTAL STEPS - MAX', 'TOTAL % COMPLETION - MAX', 'AVERAGE STEPS - MAX', 'STEPS TO GOAL - MAX']];
                    }
                    let resultData = {};
                    const clm_data_user = await Promise.all(
                        result.map(async (user) => {
                            const row: any[] = [];
                            const tempDataInfo = await this.commonHealthService.CommonFieldDataCallingCovid(user,clm_name_arr);
                            row.push(user.rank)
                            row.push(...Object.values(tempDataInfo));
                            if(schedule?.group_status == 1){
                                row.push(user?.group?.name)
                            }
                            row.push(user?.team?.tname)
                            row.push(user?.captain)

                            row.push(this.commonArrayService.formatUSStyle(user.realcompletedsteps))
                            row.push(this.commonArrayService.formatUSStyle(user.completedsteps))
                            row.push(user.percentage+ '%')
                            row.push(this.commonArrayService.formatUSStyle(user.averagestep))
                            row.push(this.commonArrayService.formatUSStyle(user.remainsteps))
                            
                            return row;
                        }),
                    );
                    let userSheetData = [clm_name_arr, ...clm_data_user];
                    resultData['user'] = userSheetData;
                    /* team processing */
                    clm_name_arr =  ['RANK',...cronAppConstant.TEAM_HEADER_DATA];
                    if(schedule['ch']['bio_challenge_type'] == "Mile_layout"){
                        clm_name_arr = [...clm_name_arr,...['TEAM TOTAL MILES - MAX', 'TEAM MILES TO GOAL - MAX', 'TOTAL % COMPLETION - MAX', 'AVERAGE MILES - MAX']];
                    }
                    else {
                        clm_name_arr = [...clm_name_arr,...['TEAM TOTAL STEPS - MAX', 'TEAM STEPS TO GOAL - MAX', 'TOTAL % COMPLETION - MAX', 'AVERAGE STEPS - MAX']];
                    }
                    rank = 1;
                    const clm_data_team = await Promise.all(
                        allTeams.map(async (item) => {
                            const row: any[] = [];
                            row.push(rank++)
                            row.push(item?.company?.company_name)
                            row.push(item?.tname)
                            row.push(item?.team_size)
                            row.push(item?.teamsmembers ?? 0)

                            row.push(item?.totalstepscompleted)
                            row.push(item?.remainsteps ?? 0)
                            row.push(item?.progress+ '%')
                            row.push(item?.averagestepsteam)
                            return row;
                        }),
                    );
                    let teamSheetData = [clm_name_arr, ...clm_data_team];
                    resultData['team'] = teamSheetData;
                    /* group processing */
                    if(schedule?.group_status == 1){
                       clm_name_arr =  ['RANK',...cronAppConstant.GROUP_HEADER_DATA];
                        if(schedule['ch']['bio_challenge_type'] == "Mile_layout"){
                            clm_name_arr = [...clm_name_arr,...['GROUP TOTAL MILES - MAX', 'GROUP MILES TO GOAL - MAX', 'TOTAL % COMPLETION - MAX', 'AVERAGE MILES - MAX']];
                        }
                        else {
                            clm_name_arr = [...clm_name_arr,...['GROUP TOTAL STEPS - MAX', 'GROUP STEPS TO GOAL - MAX', 'TOTAL % COMPLETION - MAX', 'AVERAGE STEPS - MAX']];
                        }
                        rank = 1;
                        const clm_data_group = await Promise.all(
                            allGroups.map(async (item) => {
                                const row: any[] = [];
                                row.push(rank++)
                                row.push(item?.companyname)
                                row.push(item?.groupname)
                                let teams = [];
                                if(item?.Teams){
                                    teams = Object.values(item?.Teams);
                                }
                                row.push(teams?.length)
                                row.push(item?.totalstepscompleted)
                                row.push(item?.remainsteps ?? 0)
                                row.push(teams?.length ? Number(item?.progress / teams?.length) : item?.progress + '%')
                                if(item?.averagestepsteam > 0){
                                    row.push(Number(item?.averagestepsteam / teams?.length) )
                                }
                                else{
                                    row.push(item?.averagestepsteam)
                                }
                                return row;
                            }),
                        );
                        let groupSheetData = [clm_name_arr, ...clm_data_group];
                        resultData['group'] = groupSheetData;
                    }
                    return resultData;
                }
                if (result_type == 1) {
                    const finalPaginateObj = this.commonArrayService.getPaginationVar(paginateObj?.page || 1, paginateObj?.limit || 10);
                    let total = result?.length || 0;
                    let resultDetails = this.commonArrayService.paginationResponseChallengeReport(result, total, finalPaginateObj);
                    return resultDetails;
                }
            }
            else{
                let userList;
                let joinTable = [
                    {'alias':'scj', 'table' : tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, 'on' : `user.id = scj.user_id` , 'connect' : 'user', 'type' : 'INNER' },
                    {'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = user.org_id AND company.status = 1`, 'connect' : 'user', 'type' : 'LEFT' },
                    {'alias':'companySetting', 'table' : tableConstant.COMPANIES.TBL_COMPANY_SETTINGS, 'on' : `companySetting.org_id = user.org_id`, 'connect' : 'user', 'type' : 'LEFT' },
                    {'alias':'department', 'table' : tableConstant.COMPANIES.TBL_DEPARTMENT, 'on' : `department.id = user.department_id`, 'connect' : 'user', 'type' : 'LEFT' },
                    {'alias':'Location', 'table' : tableConstant.COMPANIES.TBL_LOCATION, 'on' : `Location.id = user.location`, 'connect' : 'user', 'type' : 'LEFT' },
                ];
                let fields = ['user','Location','department.id','department.dept_name','company.id','company.company_name','companySetting.spouse_option'];
                userList = await this.userService.list(condition,null,fields,null,joinTable);
                
                let allUsersId = userList.map(item => `${item.id}`);
                let allStepsData;
                let todayStepsData;
                let findAll = `(${[actTrackId, stepId, wakingId, runningId, cyclingId, swimmingId].map(id => `'${id}'`).join(',')})`;
                
                if (schedule?.['ch']?.bio_challenge_type?.trim() === 'Mile_layout') {
                    findAll = '(17)';
                }
                let where = `food.collectionDate BETWEEN '${this.commonDateService.DateTimeFormat(schedule.start_date,'YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.DateTimeFormat(schedule.end_date,'YYYY-MM-DD')} 23:59:59'  ${logType} AND food.status != 2`;
                if(allUsersId.length){
                    allStepsData = await this.activityFeedsService.listRecord(
                        `food.user_id IN (${allUsersId.join(',')}) AND (food.activityTypeId IN ${findAll}  OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${where}`,
                        { 'food.collectionDate': 'DESC' },
                        ['SUM(steps) as steps', 'user_id', 'collectionDate'],
                        'food.user_id, food.collectionDate',
                    );
                    let temp = allStepsData.reduce((acc, item) => {
                        const userId = item?.user_id;
                        const steps = Number(item?.steps ?? 0);
                        if (!acc[userId]) {
                            acc[userId] = steps;
                        }
                        else{
                            acc[userId] += steps
                        }
                        return acc;
                    }, {});
                    if (Object.keys(temp).length > 0) {
                        allStepsData = temp;
                    }
                    let whereToday = `food.collectionDate BETWEEN '${this.commonDateService.DateTimeFormat('now','YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.DateTimeFormat('now','YYYY-MM-DD')} 23:59:59'  ${logType} AND food.status != 2`;
                    todayStepsData = await this.activityFeedsService.listRecord(
                        `food.user_id IN (${allUsersId}) AND (food.activityTypeId IN ${findAll} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${whereToday}`,
                        { 'food.collectionDate': 'DESC' },
                        ['SUM(steps) as steps', 'user_id', 'collectionDate'],
                        'food.user_id, food.collectionDate',
                    );
                    temp = todayStepsData.reduce((acc, item) => {
                        const userId = item?.user_id;
                        const steps = Number(item?.steps ?? 0);
                        if (!acc[userId]) { 
                            acc[userId] = steps;
                        }
                        else{
                            acc[userId] += steps
                        }
                        return acc;
                    }, {});

                    if (Object.keys(temp).length > 0) {
                        todayStepsData = temp;
                    }
                }
                else{
                    const finalPaginateObj = this.commonArrayService.getPaginationVar(paginateObj?.page || 1, paginateObj?.limit || 10);
                    let total = userList?.length || 0;
                    let resultDetails = this.commonArrayService.paginationResponseChallengeReport(userList, total, finalPaginateObj);
                    return resultDetails;
                }
                const checkPointColumn = [];
                let checkPointDetail
                let checkPoint =[];
                let finalCheckPoint = {};
                let checkPointInfo = {};
                if(schedule['ft_average_per_week']==2){
                    let disqualified, require = 0;
                    checkPointDetail = await this.stepCheckpointsService.getTotalTargetStepFromScheduleId(schedule.id);
                    let allCheckPointData = await this.activityFeedsService.listRecord(
                        `food.user_id IN (${allUsersId.join(',')}) AND (food.activityTypeId IN ${findAll}  OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${where}`,
                        { 'food.collectionDate': 'DESC' },
                        ['SUM(steps) as steps', 'user_id', 'collectionDate'],
                        'food.user_id, food.collectionDate',
                    );
                    let tempDate = startDate.format('YYYY-MM-DD');
                    for (let i = 0; i < checkPointDetail.length; i++) {
                        const checkPointDetails = checkPointDetail[i];
                        const cp = checkPointDetails;
                        const cpId = cp.id;
                        if (!checkPointInfo[cpId]) checkPointInfo[cpId] = {};
                        checkPointInfo[cpId]['name'] = `${cp.checkpointvalue} ${cp.checkpointtype} in ${cp.checkpointdays} days`;
                        const day = cp.checkpointdays - 1;
                        checkPointInfo[cpId]['start_date'] = tempDate;
                        const end_date = startDate.add(day, 'days').format('YYYY-MM-DD');
                        checkPointInfo[cpId]['end_date'] = end_date;
                        // Step calculation
                        let steps;
                        if (cp.checkpointtype === 'miles') {
                            steps = cp.checkpointvalue * 2112;
                            if (schedule.checkpointstep_type === 0) {
                                if (require === 0) {
                                    require = steps;
                                } else {
                                    steps = steps - require;
                                    require += steps;
                                }
                            }
                        } else {
                            steps = cp.checkpointvalue;

                            if (schedule.checkpointstep_type === 0) {
                                if (require === 0) {
                                    require = steps;
                                } else {
                                    steps = steps - require;
                                    require += steps;
                                }
                            }
                        }
                        checkPointInfo[cpId]['require_step'] = steps;
                        const startTimestamp = today.valueOf();
                        const endTimestamp = endDate.valueOf();
                        for (let j = 0; j < allCheckPointData.length; j++) {
                            const allCheckPointsData = allCheckPointData[j];
                            const feed = allCheckPointsData;
                            const userId = feed.user_id;
                            const collectionDate = moment(feed.collectionDate).valueOf();
                            if (collectionDate >= startTimestamp && collectionDate <= endTimestamp) {
                                if (!checkPointInfo[cpId]['users']) checkPointInfo[cpId]['users'] = {};
                                if (!checkPointInfo[cpId]['users'][userId]) {
                                    checkPointInfo[cpId]['users'][userId] = {
                                        steps: Number(allCheckPointsData.steps),
                                        require_steps: steps
                                    };
                                } else {
                                    checkPointInfo[cpId]['users'][userId]['steps'] += Number(allCheckPointsData.steps);
                                }
                            }
                        }
                        // Update tempDate using moment if needed
                        if (schedule.checkpointstep_type === 0) {
                            tempDate = moment(end_date).add(1, 'days').format('YYYY-MM-DD');
                        }
                        checkPointInfo[cpId]['status'] = 1;
                        checkPointInfo[cpId]['checkpointstatus'] = 0;
                        const currentDate = today.valueOf();
                        const cpEndDate = moment(checkPointInfo[cpId]['end_date']).valueOf();
                        if (currentDate > cpEndDate) {
                            checkPointInfo[cpId]['checkpointstatus'] = 1;
                        }
                        // Handle final checkpoint result
                        if (checkPointInfo[cpId]['checkpointstatus'] === 1) {
                            if (checkPointInfo[cpId]['users']) {
                                const users = checkPointInfo[cpId]['users'];
                                for (const userId in users) {
                                    const checkPoint = users[userId];
                                    if (!finalCheckPoint[userId]) finalCheckPoint[userId] = {};
                                    finalCheckPoint[userId][cpId] = (checkPoint.steps < checkPoint.require_steps) ? "No" : "Yes";
                                }
                            }
                        } else {
                            const cpStartDate = moment(checkPointInfo[cpId]['start_date']).valueOf();
                            if (checkPointInfo[cpId]['users'] && currentDate > cpStartDate) {
                                const users = checkPointInfo[cpId]['users'];
                                for (const userId in users) {
                                    const checkPoint = users[userId];
                                    if (checkPoint.steps >= checkPoint.require_steps) {
                                        if (!finalCheckPoint[userId]) finalCheckPoint[userId] = {};
                                        finalCheckPoint[userId][cpId] = "Yes";
                                    }
                                }
                            }
                        }
                    }
                    for (const key in checkPointInfo) {
                        checkPointColumn.push(checkPointInfo[key].name.toUpperCase());
                    }
                }
                let members;
                members = {};
                if(userList.length){
                    let teamsMemToday = 0;
                    let disqualified = [];
                    for (let i = 0; i < userList.length; i++) {
                        const getData = userList[i];
                        const userid = getData.id;
                        let teamData = {};
                        let totalPercentage = 0;
                        let dailyStepsForAll = 0;
                        let competedSteps = 0;
                        let totalRemainSteps = 0;
                        let averageSteps = 0;
                        let beyonds = 0;
                        let beyondsTotal = 0;
                        let stepsWalks = 0;
                        let realStepsWalks = 0;
                        if (allStepsData.hasOwnProperty(userid)) {
                            stepsWalks = allStepsData[userid];
                            realStepsWalks = allStepsData[userid];
                            if (dailyMaxStepsCnt && dailyMaxStepsCnt !== 0) {
                                const upDailyMaxStepsCnt = dailyMaxStepsCnt * uptoDays;
                                if (stepsWalks > upDailyMaxStepsCnt) {
                                    stepsWalks = upDailyMaxStepsCnt;
                                }
                                stepsWalks = Math.abs(stepsWalks);
                            }
                            if (!stepsWalks || !realStepsWalks) {
                                stepsWalks = 0;
                                realStepsWalks = 0;
                            }
                        }
                        competedSteps += stepsWalks;
                        let stepsDaily = 0;
                        if (todayStepsData.hasOwnProperty(userid)) {
                            stepsDaily = todayStepsData[userid];
                            if (dailyMaxStepsCnt && dailyMaxStepsCnt !== 0) {
                                if (stepsDaily > dailyMaxStepsCnt) {
                                    stepsDaily = dailyMaxStepsCnt;
                                }
                                stepsDaily = Math.abs(stepsDaily);
                            }
                            if (stepsDaily) {
                                teamsMemToday++;
                            }
                        }
                        dailyStepsForAll += dailySteps;
                        let remainSteps = totalSteps - stepsWalks;
                        if (stepsWalks) {
                            if (remainSteps < 0) {
                                let temps = Math.abs(remainSteps);
                                remainSteps = 0;
                                beyonds += temps;
                                beyondsTotal += beyonds;
                            }
                            totalRemainSteps += remainSteps;
                        }
                        let percentage = 0;
                        if (totalSteps !== 0) {
                            percentage = Math.round((stepsWalks * 100 / totalSteps) * 100) / 100;
                        }
                        if (percentage > 100) {
                            percentage = 100;
                        }
                        if (competedSteps > 0 && uptoDays > 0) {
                            if (schedule['ch'].bio_challenge_type === "Mile_layout") {
                                averageSteps = Math.round((competedSteps / uptoDays) * 100) / 100;
                            } else {
                                averageSteps = Math.round(competedSteps / totalDays); // #ZOMO-4247
                            }
                        }
                        if (!members[userid]) members[userid] = getData;

                        // members[userid] = getData;
                        members[userid]['averagesteps'] = averageSteps;
                        members[userid]['percentage'] = percentage;
                        members[userid]['totalstepscompleted'] = stepsWalks;
                        members[userid]['realtotalstepscompleted'] = realStepsWalks;
                        members[userid]['remainsteps'] = remainSteps;
                        totalPercentage += percentage;

                        // Checkpoint processing
                        if (typeof checkPointDetail !== "undefined") {
                            for (let j = 0; j < checkPointDetail.length; j++) {
                                const checkpointdata = checkPointDetail[j];
                                const checkpointId = checkpointdata.id;
                                if (!disqualified.includes(userid)) {
                                    if (allStepsData.hasOwnProperty(userid)) {
                                        if (finalCheckPoint.hasOwnProperty(userid) && finalCheckPoint[userid].hasOwnProperty(checkpointId)) {
                                            members[userid]['checkpoint'] = members[userid]['checkpoint'] || {};
                                            members[userid]['checkpoint'][checkpointId] = finalCheckPoint[userid][checkpointId];
                                            if (finalCheckPoint[userid][checkpointId] === "No") {
                                                disqualified.push(userid);
                                            }
                                        } else {
                                            const checkpointStatus = checkPointInfo[checkpointId].checkpointstatus;
                                            members[userid]['checkpoint'] = members[userid]['checkpoint'] || {};
                                            if (checkpointStatus === 1) {
                                                members[userid]['checkpoint'][checkpointId] = "No";
                                                disqualified.push(userid);
                                            } else {
                                                members[userid]['checkpoint'][checkpointId] = "On Track";
                                            }
                                        }
                                    } else {
                                        members[userid]['checkpoint'] = members[userid]['checkpoint'] || {};
                                        members[userid]['checkpoint'][checkpointId] = "On Track";
                                    }
                                } else {
                                    members[userid]['checkpoint'] = members[userid]['checkpoint'] || {};
                                    members[userid]['checkpoint'][checkpointId] = "No";
                                }
                            }
                        }
                    }
                    members = Object.values(members);
                    if (members.length > 0) {
                        if (schedule.rank_type === "average_steps") {
                            members.sort((a, b) => b.averagesteps - a.averagesteps);
                        } else {
                            members.sort((a, b) => b.realtotalstepscompleted - a.realtotalstepscompleted);
                        }
                    }
                    let rank = 1;
                    for(let item of members)  {
                        if (!item['rank']) {
                            item['rank'] = 0;
                        }
                        item['rank'] = rank++;
                        if(item.checkpoint && Object.keys(item.checkpoint).length){
                            item.checkpoint = Object.values(item.checkpoint);
                        }
                        else{
                            item.checkpoint = [];
                        }
                    }
                    if (result_type == 1) {
                        const finalPaginateObj = this.commonArrayService.getPaginationVar(paginateObj?.page || 1, paginateObj?.limit || 10);
                        let total = members?.length || 0;
                        let resultDetails = this.commonArrayService.paginationResponseChallengeReport(members, total, finalPaginateObj);
                        return resultDetails;
                    }
                    if(result_type == 2){
                        let clm_name_arr = ['RANK',...cronAppConstant.USER_HEADER_DATA];
                        if(schedule['ch']['bio_challenge_type'] == "Mile_layout"){
                            clm_name_arr = [...clm_name_arr,...['TOTAL MILES - NO MAX', 'TOTAL MILES - MAX', 'TOTAL % COMPLETION - MAX', 'AVERAGE MILES - MAX', 'MILES TO GOAL - MAX']];
                        }
                        else {
                            clm_name_arr = [...clm_name_arr,...['TOTAL STEPS - NO MAX', 'TOTAL STEPS - MAX', 'TOTAL % COMPLETION - MAX', 'AVERAGE STEPS - MAX', 'STEPS TO GOAL - MAX']];
                        }
                        if(schedule['ft_average_per_week']==2){
                            clm_name_arr.push('TOTAL MILES COMPLETED');
                            clm_name_arr = [...clm_name_arr,...checkPointColumn];
                        }
                        let resultData = {};
                        const clm_data_user = await Promise.all(
                            members.map(async (user) => {
                                const row: any[] = [];
                                const tempDataInfo = await this.commonHealthService.CommonFieldDataCallingCovid(user,clm_name_arr);
                                row.push(user.rank)
                                row.push(...Object.values(tempDataInfo));

                                row.push(this.commonArrayService.formatUSStyle(user.realtotalstepscompleted))
                                row.push(this.commonArrayService.formatUSStyle(user.totalstepscompleted))
                                row.push(user.percentage+ '%')
                                row.push(this.commonArrayService.formatUSStyle(user.averagesteps))
                                row.push(this.commonArrayService.formatUSStyle(user.remainsteps))
                                if(schedule['ft_average_per_week']==2){
                                    row.push(this.commonArrayService.formatUSStyle(Math.round(user.realtotalstepscompleted/2112)));
                                }
                                if(user['checkpoint']?.length){
                                    for(let checkPoint of user['checkpoint']){
                                        row.push(this.commonArrayService.formatUSStyle(checkPoint));
                                    }
                                }
                                return row;
                            }),
                        );
                        let userSheetData = [clm_name_arr, ...clm_data_user];
                        resultData['user'] = userSheetData;
                        return resultData;
                    }
                }
            }
        } catch (error) {
            throw new Error(error);
        }
    }
}
