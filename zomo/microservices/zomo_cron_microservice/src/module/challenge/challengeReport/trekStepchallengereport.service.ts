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
import { CommitmentLevelsService } from '../commitmentlevels/commitmentlevels.service';
import { TeamsService } from '../team/teams.service';
import { TeamMembersService } from '../teammember/teammembers.service';
const moment = require('moment-timezone');

@Injectable()
export class TrekStepsChallengeReportService {
    constructor(
        private readonly commonDateService: CommonDateService,
        private readonly userService: UserService,
        private readonly commonArrayService: CommonArrayService,
        private readonly activityFeedsService: ActivityFeedService,
        private readonly commonHealthService: CommonHealthService,
        private readonly teamsService: TeamsService,
        private readonly teamMembersService: TeamMembersService,
        private readonly commitmentLevelsService: CommitmentLevelsService,
    ) {}

    async trekStepChallengeReport(schedule: Partial<ScheduleChallengeEntity>,condition: string = '',result_type: number = 1,paginateObj: any = null, activityList = []) {
        try {
            let result = await this.trekStepChallengeReportHelper(
                schedule,
                condition.replace(/User/gi, "user"),
                result_type,
                paginateObj,
                activityList,
            );
            return result;
        } catch (error) {
            throw new Error(error);
        }
    }

    async trekStepChallengeReportHelper(schedule: Partial<ScheduleChallengeEntity>, condition: string = '', result_type: number = 1, paginateObj: any = null, activityList = []) {
        try {
            let acttrackid, stepid, wakingid, runningid, cyclingid, swimmingid;
            let totaldays = 0, uptodays = 0;
            const startdate: any = this.commonDateService.DateTimeFormat(schedule?.['start_date']);
            const enddate: any = this.commonDateService.DateTimeFormat(schedule?.['end_date']);
            const today = this.commonDateService.DateTimeFormat('now'); 
            let joinTable;
            let fields;
            acttrackid = activityList[0]['id'];
            stepid = activityList[1]['id'];
            wakingid = activityList[2]['id'];
            runningid = activityList[3]['id'];
            cyclingid = activityList[4]['id'];
            swimmingid = activityList[5]['id'];
            if (schedule.s_activity_tracker === 0) {
                acttrackid = "";
            }
            if (schedule.s_steps === 0) {
                stepid = "";
            }
            if (schedule.s_walking === 0) {
                wakingid = "";
            }
            if (schedule.s_running === 0) {
                runningid = "";
            }
            if (schedule.s_cycling === 0) {
                cyclingid = "";
            }
            if (schedule.s_swimming === 0) {
                swimmingid = "";
            }
            let is_set_weekend = schedule.is_set_weekend;
            let dailysteps = schedule['ch'].numberofsteps;
            if (schedule.numberofsteps !== 0) {
                dailysteps = schedule.numberofsteps;
            }
            let countuserwithzero = schedule.countuserwithzero;
            let dailymaxstepscnt = schedule.dailymaxstepscnt;
            let countstepswith = schedule.countstepswith;
            let logType;
            if (countstepswith === 'realstep') {
                logType = " AND food.logType = 'Tracker'";
            } else {
                logType = "AND food.logType in('Tracker','Manual')";
            }
            if (is_set_weekend === 1) {
                logType += " AND WEEKDAY(food.collectionDate)>=0 AND WEEKDAY(food.collectionDate)<5";
            }
            let datediff = enddate.diff(startdate, 'days') + 1;
            totaldays = datediff;
            datediff = today.diff(startdate, 'days') + 1;
            uptodays = datediff;
            if(uptodays == 0){
                uptodays = 1;
            }
            let nDcstart = this.commonDateService.DateTimeFormat(schedule?.['start_date']);
            let nDcend = this.commonDateService.DateTimeFormat(schedule?.['end_date']);
            if (is_set_weekend === 1) {
                while (nDcstart <= nDcend) {
                    const startDay = this.commonDateService.DateTimeFormat(nDcstart);
                    let dayOfWeek = startDay.isoWeekday();
                    totaldays += (dayOfWeek != 0 && dayOfWeek < 6) ? 1 : 0;   
                    if(dayOfWeek != 0 && dayOfWeek < 6 && moment.utc(nDcstart, 'YYYY-MM-DD').unix() <= moment.utc().unix()){
                        uptodays++;
                    }
                    nDcstart = startDay.add(1, 'days').format('YYYY-MM-DD');
                }
            }
            let totalsteps = dailysteps * totaldays;
            joinTable = [
                {'alias':'teamSchedule', 'table' : tableConstant.CHALLENGE.TBL_CH_TEAM_SCHEDULE, 'on' : `team.id = teamSchedule.team_id` , 'connect' : 'team', 'type' : 'LEFT' },
                {'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = team.org_id AND company.status = 1`, 'connect' : 'team', 'type' : 'LEFT' },
                {'alias':'group', 'table' : tableConstant.CHALLENGE.TBL_CH_GROUPS, 'on' : `group.id = team.group_id` , 'connect' : 'team', 'type' : 'LEFT' },
            ];
            fields = ['team.id','team.tname','team.logo','team.team_size','team.group_id','group.id','group.name','company.id','company.company_name'];
            let teamList: any = await this.teamsService.list(`team.org_id = ${schedule?.org_id} AND teamSchedule.schedule_id = ${schedule?.id} AND team.status != 2`, null,fields,null,joinTable);
            let result;
            let findAll = `(${[acttrackid, stepid, wakingid, runningid, cyclingid, swimmingid].map(id => `'${id}'`).join(',')})`;
            const topusers = {};
            if(teamList.length){
                const allteams = [];
                let allgroups;
                allgroups = {};
                let alldailystepsforall = 0;
                let allteamprogress = 0;
                let teamcompleted = 0;
                let teamremain = 0;
                let teambeyonds = 0;
                let captain = '';
                const levelsInfo = {};
                for (let key = 0; key < teamList.length; key++) {
                    const getteam = teamList[key];
                    const groupkey = getteam?.group_id;
                    const teamid = getteam?.id;
                    joinTable = [
                        {'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : `teamMember.user_id = user.id`, 'connect' : 'teamMember', 'type' : 'LEFT' },
                        {'alias':'department', 'table' : tableConstant.COMPANIES.TBL_DEPARTMENT, 'on' : `department.id = user.department_id`, 'connect' : 'user', 'type' : 'LEFT' },
                        {'alias':'Location', 'table' : tableConstant.COMPANIES.TBL_LOCATION, 'on' : `Location.id = user.location`, 'connect' : 'user', 'type' : 'LEFT' },
                        {'alias':'team', 'table' : tableConstant.CHALLENGE.TBL_CH_TEAMS, 'on' : `teamMember.team_id = team.id` , 'connect' : 'user', 'type' : 'LEFT' },
                        {'alias':'scj', 'table' : tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, 'on' : `team.schedule_id = scj.schedule_id And teamMember.user_id = scj.user_id` , 'connect' : 'user', 'type' : 'LEFT' },
                    ];
                    fields = ['teamMember.id','teamMember.user_id','teamMember.iscaptain','teamMember.baton_status','department.dept_name','Location.location_name','Location.city','Location.state','Location.lname',
                    'user.id','user.status','user.employeeid','user.first_name','user.last_name','user.email','user.profile_image','user.code','user.on_insurance_plan','user.insurance_plan_name','scj.id','scj.trek_level_id','scj.added_date'];
                    const teammemberss = await this.teamMembersService.list(`teamMember.org_id = ${schedule?.org_id} AND teamMember.team_id = ${teamid} AND teamMember.status != 2 AND team.status != 2 AND user.status != 2`, null,fields,null,joinTable);
                    let teamdata = [];
                    let totalpercentage = 0;
                    let teamsmem = 0;
                    let realstepswalks = 0;
                    let stepswalks = 0;
                    let alltotalstepsteam = 0;
                    let alltotalremainstepsuncount = 0;
                    let allcompetedsteps = 0;
                    let tempallcompetedsteps = 0;
                    let alltotalremainsteps = 0;
                    let beyonds = 0;
                    let beyondstotal = 0;
                    let totalstepsteamall = 0;
                    let allaveragestepsteam = 0;
                    let alldailystepsforallm = 0;
                    let totalteammember = 0;
                    let averagestept = 0;
                    let temptotalteammember = 0;
                    let allusersid = teammemberss.map(tm => tm['user'] && tm['user'].id);
                    let allStepsData;
                    let todayStepsData;
                    if (allusersid.length) {
                        let where = `food.collectionDate BETWEEN '${this.commonDateService.DateTimeFormat(schedule.start_date,'YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.DateTimeFormat(schedule.end_date,'YYYY-MM-DD')} 23:59:59' ${logType} AND food.status = 1`;
                        allStepsData = await this.activityFeedsService.listRecord(
                            `food.user_id IN (${allusersid.join(',')}) AND (food.activityTypeId IN ${findAll} OR food.appName='AppleHealthKit' OR food.appName='GoogleFit') AND ${where}`,
                            { 'food.collectionDate': 'DESC' },
                            [`SUM(steps) as steps`, 'user_id', 'collectionDate'],
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

                        where = `food.collectionDate BETWEEN '${this.commonDateService.DateTimeFormat('now','YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.DateTimeFormat('now','YYYY-MM-DD')} 23:59:59' ${logType} AND food.status = 1`;
                        todayStepsData = await this.activityFeedsService.listRecord(
                            `food.user_id IN (${allusersid}) AND (food.activityTypeId IN ${findAll} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${where}`,
                            { 'food.collectionDate': 'DESC' },
                            [`SUM(steps) as steps`, 'user_id', 'collectionDate'],
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
                    let levels = await this.commitmentLevelsService.getLevelsFromScheduleId(schedule.id);
                    for (let i = 0; i < levels.length; i++) {
                        const level = levels[i];
                        const id = level.id;
                        levelsInfo[id] = level;
                    }
                    for (const tuser of teammemberss) {
                        const userid = tuser['user'].id;
                        tuser['Location'] = tuser['user']['Location'];
                        delete tuser['user']['Location'];
                        tuser['department'] = tuser['user']['department'];
                        delete tuser['user']['department'];
                        if(tuser?.iscaptain){
                            captain = tuser['user']['first_name'] + ' ' + tuser['user']['last_name'];
                        }
                        if (allStepsData.hasOwnProperty(userid)) {
                            stepswalks = allStepsData[userid];
                            realstepswalks = allStepsData[userid];
                            if (dailymaxstepscnt && dailymaxstepscnt !== 0) {
                                const updailymaxstepscnt = dailymaxstepscnt * uptodays;
                                if (stepswalks > updailymaxstepscnt) {
                                    stepswalks = updailymaxstepscnt;
                                }
                            }
                            if (!stepswalks) {
                                stepswalks = 0;
                                realstepswalks = 0;
                            }
                        } else {
                            stepswalks = 0;
                            realstepswalks = 0;
                        }
                        allcompetedsteps += stepswalks;
                        tempallcompetedsteps += stepswalks;
                        let stepsdaily = 0;
                        if (todayStepsData.hasOwnProperty(userid)) {
                            stepsdaily = todayStepsData[userid];
                            if (dailymaxstepscnt && dailymaxstepscnt !== 0) {
                                if (stepsdaily > dailymaxstepscnt) {
                                    stepsdaily = dailymaxstepscnt;
                                }
                            }
                            if (stepsdaily) {
                                teamsmem++;
                            }
                        }
                        alldailystepsforall += stepsdaily;
                        const trekLevelId = tuser?.['user']?.['scj']?.trek_level_id;
                        if (trekLevelId && levelsInfo.hasOwnProperty(trekLevelId)) {
                            const levelData = levelsInfo[trekLevelId];
                            if (levelData.level_type === 'steps') {
                                dailysteps = levelData.level_value;
                            } else {
                                dailysteps = levelData.level_value * 2112;
                            }
                            totalsteps = dailysteps * totaldays;
                        }
                        let remainsteps = 0
                        if (stepswalks) {
                            remainsteps = totalsteps - stepswalks;
                            if (remainsteps < 0) {
                                let temps = remainsteps;
                                remainsteps = 0;
                                beyonds += temps;
                                beyondstotal += beyonds;
                            }
                            alltotalremainsteps += remainsteps;
                            totalstepsteamall = allcompetedsteps + alltotalremainsteps;
                            totalteammember++;
                        }
                        temptotalteammember++;
                        let percentage = 0;
                        if (totalsteps !== 0) {
                            percentage = parseFloat(((stepswalks * 100) / totalsteps).toFixed(2));
                        }
                        if (percentage >= 100) {
                            percentage = 100;
                        }
                        averagestept = uptodays != 0 ? Math.round(stepswalks / uptodays): 0;

                        teamdata.push({
                            userId: userid,
                            percentage,
                            userdetail: tuser['user'],
                            completedsteps: stepswalks,
                            company: getteam['company'],
                            Department: tuser['department'],
                            Locations: tuser['Location'],
                            teamMember: tuser['teamMember'],
                            averagestep: averagestept,
                            realcompletedsteps: realstepswalks
                        });
                        totalpercentage += percentage;
                        topusers[userid] = {
                            ...tuser['user'],
                            company: getteam['company'],
                            team: getteam,
                            group: getteam?.group,
                            Department: tuser['department'],
                            Locations: tuser['Location'],
                            percentage,
                            completedsteps: stepswalks,
                            realcompletedsteps: realstepswalks,
                            averagestep: averagestept,
                            remainsteps,
                            captain
                        };
                    }
                    if (schedule.rank_type === "average_steps") {
                        teamdata.sort((a, b) => b.averagestep - a.averagestep);
                    } else {
                        teamdata.sort((a, b) => b.realcompletedsteps - a.realcompletedsteps);
                    }
                    if (schedule.rank_type === "average_steps") {
                        alltotalstepsteam = allcompetedsteps + alltotalremainsteps;
                    } else {
                        alltotalstepsteam = totalsteps * temptotalteammember;
                    }
                    let teamprogress = 0;
                    if (alltotalstepsteam !== 0 && totalteammember !== 0) {
                        teamprogress = parseFloat(((allcompetedsteps * 100) / (totalteammember * totalsteps)).toFixed(2));
                    }
                    if (teamprogress >= 100) {
                        teamprogress = 100;
                    }
                    allteamprogress += teamprogress;
                    const newTeamObj = {
                        ...getteam,
                        progress: teamprogress,
                        totalstepscompleted: tempallcompetedsteps
                    };
                    if (alltotalstepsteam !== 0 && totalteammember !== 0) {
                        allaveragestepsteam = Math.round((allcompetedsteps / totalteammember) / uptodays);
                    }
                    newTeamObj.averagestepsteam = allaveragestepsteam;
                    if (teamdata.length > 0) {
                        newTeamObj.teammember = teamdata;
                        allaveragestepsteam = Math.round((allcompetedsteps / teamdata.length) / uptodays);
                    }
                    teamcompleted += tempallcompetedsteps;
                    alltotalremainstepsuncount = (totalsteps * totalteammember) - tempallcompetedsteps;
                    if (alltotalremainstepsuncount < 0) {
                        let temps = alltotalremainstepsuncount;
                        teambeyonds = temps;
                        alltotalremainstepsuncount = 0;
                    }
                    teamremain = alltotalremainstepsuncount;
                    newTeamObj.remainsteps = teamremain;
                    newTeamObj.teamsmembers = temptotalteammember;
                    if (schedule.group_status === 1) {
                        if (!allgroups[groupkey]) {
                            allgroups[groupkey] = {
                            groupname: getteam.group.name,
                            companyname: getteam.company.company_name,
                            totalstepscompleted: 0,
                            remainsteps: 0,
                            progress: 0,
                            averagestepsteam: 0,
                            Teams: {}
                            };
                        }
                        allgroups[groupkey].Teams[key] = {
                            groupname: getteam.group.name,
                            companyname: getteam.company.company_name,
                            totalstepscompleted: tempallcompetedsteps,
                            remainsteps: teamremain,
                            progress: teamprogress,
                            averagestepsteam: allaveragestepsteam
                        };
                        allgroups[groupkey].totalstepscompleted += tempallcompetedsteps;
                        allgroups[groupkey].remainsteps += teamremain;
                        allgroups[groupkey].progress += teamprogress;
                        allgroups[groupkey].averagestepsteam += allaveragestepsteam;
                    }
                    allteams.push(newTeamObj);
                }
                
                if (allteams.length > 0) {
                    if (schedule.rank_type === "average_steps") {
                        allteams.sort((a, b) => b.averagestepsteam - a.averagestepsteam);
                    } else {
                        allteams.sort((a, b) => b.totalstepscompleted - a.totalstepscompleted);
                    }
                }
                let allusersid = Object.keys(topusers).map(item => item?.toString());
                if(allusersid.length == 0){
                    if (result_type == 1) {
                        const finalPaginateObj = this.commonArrayService.getPaginationVar(paginateObj?.page || 1, paginateObj?.limit || 10);
                        let total = allusersid?.length || 0;
                        let resultDetails = this.commonArrayService.paginationResponseChallengeReport(allusersid, total, finalPaginateObj);
                        return resultDetails;
                    }
                }
                let where = `food.collectionDate BETWEEN '${this.commonDateService.DateTimeFormat(schedule.start_date,'YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.DateTimeFormat(schedule.end_date,'YYYY-MM-DD')} 23:59:59' ${logType} AND food.status = 1`;
                const joinTableList = [tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,tableConstant.CHALLENGE.TBL_CH_COMMITMENT_LEVELS];
                let Allcheckpointdata = await this.activityFeedsService.listRecord(
                    `food.user_id IN (${allusersid.join(',')}) AND (food.activityTypeId IN ${findAll} OR food.appName='AppleHealthKit' OR food.appName='GoogleFit') AND ${where}`,
                    { 'food.collectionDate': 'DESC' },
                    ['SUM(food.steps) as steps', 'food.user_id as user_id', 'food.collectionDate as collectionDate', 'commitment.level_value as level_value','commitment.level_type as level_type','schedulejoin.added_date as added_date'],
                    'food.user_id, food.collectionDate',
                    joinTableList,
                    schedule.id
                );
                const users = [];
                const temp = {};
                const tempstepyes = {};
                const usersdailydetail = {};
                for (let i = 0; i < Allcheckpointdata.length; i++) {
                    const getsteps = Allcheckpointdata[i];
                    const userId = getsteps.user_id;
                    const collectionDate = getsteps.collectionDate;
                    const steps = Number(getsteps.steps);
                    const addedDate = getsteps.added_date;
                    const levelType = getsteps?.level_type;
                    const levelValue = getsteps?.level_value;
                    if (users.includes(userId)) {
                        temp[userId] = (temp[userId] || 0) + steps;
                    } else {
                        users.push(userId);
                        temp[userId] = steps;
                    }
                    if (!tempstepyes[collectionDate]) tempstepyes[collectionDate] = {};
                    tempstepyes[collectionDate][userId] = steps;
                    if (!usersdailydetail[userId]) usersdailydetail[userId] = {};
                    usersdailydetail[userId][collectionDate] = steps;
                    usersdailydetail[userId]['join_date'] = this.commonDateService.DateTimeFormat(addedDate, 'YYYY-MM-DD');
                    if (schedule.tr_goaltype === 2) {
                        if (levelType === "miles") {
                            usersdailydetail[userId]['commitment_value'] = levelValue * 2112;
                        } else {
                            usersdailydetail[userId]['commitment_value'] = levelValue;
                            usersdailydetail[userId]['commitment_type'] = levelType;
                        }
                    }
                }
                const allusersdailydetail = usersdailydetail;
                if(Object.keys(allgroups).length){
                    allgroups = Object.values(allgroups);
                }
                else{
                    allgroups = [];
                }
                if(schedule?.group_status == 1){
                    if (allgroups.length > 0) {
                        if (schedule.rank_type === "average_steps") {
                            allgroups.sort((a, b) => b.averagestepsteam - a.averagestepsteam);
                        } else {
                            allgroups.sort((a, b) => b.totalstepscompleted - a.totalstepscompleted);
                        }
                    }
                }
                result = Object.values(topusers);
                let rank = 1;
                for(let item of result)  {
                    if (!item['rank']) {
                        item['rank'] = 0;
                    }
                    item['rank'] = rank++;
                }
                if (result_type == 2) {
                    let clm_name_arr = ['RANK',...cronAppConstant.USER_HEADER_DATA,'DATE OF REGISTERED'];
                    if(schedule?.group_status == 1){
                        clm_name_arr.push('GROUP NAME')
                    }
                    clm_name_arr = [...clm_name_arr,...['TEAM', 'CAPTAIN NAME','COMMITTED GOAL','STEPS TO GOAL ', 'TOTAL STEPS','AVERAGE STEPS']];
                    let total_days = enddate.diff(startdate, 'days') + 1;
                    if (today.isSameOrBefore(enddate)) {
                        total_days = today.diff(startdate, 'days') + 1;
                    }
                    for (let day = 0; day < total_days; day++) {
                        clm_name_arr.push(startdate.clone().add(day, 'days').format('MM-DD-YYYY'));
                    }
                    
                    let resultData = {};
                    const clm_data_user = await Promise.all(
                        result.map(async (user) => {
                            const row: any[] = [];
                            const tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(user,clm_name_arr);
                            row.push(user.rank)
                            row.push(...Object.values(tempdatainfo));
                            row.push(this.commonDateService.DateTimeFormat(user?.scj?.added_date,'YYYY-MM-DD'));
                            if(schedule?.group_status == 1){
                                row.push(user?.group?.name);
                            }
                            row.push(user?.team?.tname)
                            row.push(user?.captain);
                            let trekLevelId = user?.scj?.trek_level_id;
                            if (trekLevelId && levelsInfo.hasOwnProperty(trekLevelId)) {
                                const levelData = levelsInfo[trekLevelId];
                                row.push(`${levelData.level_value} ${levelData.level_type}`);
                            }
                            else{
                                row.push(``);
                            }
                            row.push(user.remainsteps);
                            row.push(user.realcompletedsteps);
                            row.push(user.averagestep);
                            for (let day = 0; day < total_days; day++) {
                                const dateStr = this.commonDateService.DateTimeFormat(startdate).add(day, 'days').format('YYYY-MM-DD');
                                if (allusersdailydetail.hasOwnProperty(user.id) && allusersdailydetail[user.id].hasOwnProperty(dateStr.trim())) {
                                    row.push(allusersdailydetail[user.id][dateStr.trim()]);
                                } else {
                                    row.push(0);
                                }
                            }
                            return row;
                        }),
                    );
                    let userSheetData = [clm_name_arr, ...clm_data_user];
                    resultData['user'] = userSheetData;
                    /* team processing */
                    clm_name_arr =  ['RANK',...cronAppConstant.TEAM_HEADER_DATA];
                    clm_name_arr = [...clm_name_arr,...['TEAM TOTAL STEPS - MAX', 'TEAM STEPS TO GOAL - MAX', 'TOTAL % COMPLETION - MAX', 'AVERAGE STEPS - MAX']];
                    rank = 1;
                    const clm_data_team = await Promise.all(
                        allteams.map(async (item) => {
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
                       clm_name_arr = [...clm_name_arr,...['GROUP TOTAL STEPS - MAX', 'GROUP STEPS TO GOAL - MAX', 'TOTAL % COMPLETION - MAX', 'AVERAGE STEPS - MAX']];
                        rank = 1;
                        const clm_data_group = await Promise.all(
                            allgroups.map(async (item) => {
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
                    {'alias':'treklevels', 'table' : tableConstant.CHALLENGE.TBL_CH_COMMITMENT_LEVELS, 'on' : `scj.trek_level_id = treklevels.id` , 'connect' : 'user', 'type' : 'LEFT' },
                    {'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = user.org_id AND company.status = 1`, 'connect' : 'user', 'type' : 'LEFT' },
                    {'alias':'companySetting', 'table' : tableConstant.COMPANIES.TBL_COMPANY_SETTINGS, 'on' : `companySetting.org_id = user.org_id`, 'connect' : 'user', 'type' : 'LEFT' },
                    {'alias':'department', 'table' : tableConstant.COMPANIES.TBL_DEPARTMENT, 'on' : `department.id = user.department_id`, 'connect' : 'user', 'type' : 'LEFT' },
                    {'alias':'Location', 'table' : tableConstant.COMPANIES.TBL_LOCATION, 'on' : `Location.id = user.location`, 'connect' : 'user', 'type' : 'LEFT' },
                ];
                let fields = ['user','Location','department.id','department.dept_name','company.id','company.company_name','companySetting.spouse_option','scj.id','scj.schedule_id','scj.added_date','scj.trek_level_id','treklevels.level_value','treklevels.level_type'];
                userList = await this.userService.list(condition,null,fields,null,joinTable);
                
                let allusersid = userList.map(item => `${item.id}`);
                let allStepsData;
                let todayStepsData;
                let usersdailydetail = {};
                let allusersdailydetail = {};
                let temp = {};
                let users = [];
                let tempstepyes = {};
                let where = `food.collectionDate BETWEEN '${this.commonDateService.DateTimeFormat(schedule.start_date,'YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.DateTimeFormat(schedule.end_date,'YYYY-MM-DD')} 23:59:59' ${logType} AND food.status = 1`;
                if(allusersid.length){
                    const joinTableList = [tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,tableConstant.CHALLENGE.TBL_CH_COMMITMENT_LEVELS];
                    allStepsData = await this.activityFeedsService.listRecord(
                        `food.user_id IN (${allusersid.join(',')}) AND (food.activityTypeId IN ${findAll} OR food.appName='AppleHealthKit' OR food.appName='GoogleFit') AND ${where}`,
                        { 'food.collectionDate': 'DESC' },
                        ['SUM(food.steps) as steps', 'food.user_id as user_id', 'food.collectionDate as collectionDate', 'commitment.level_value as level_value','commitment.level_type as level_type','schedulejoin.added_date as added_date'],
                        'food.user_id, food.collectionDate',
                        joinTableList,
                        schedule.id
                    );
                    for (const getsteps of allStepsData) {
                        const userId = getsteps.user_id;
                        const steps = Number(getsteps?.steps ?? 0);
                        const collectionDate = getsteps.collectionDate;
                        if (users.includes(userId)) {
                            temp[userId] = (temp[userId] || 0) + steps;
                        } else {
                            users.push(userId);
                            temp[userId] = steps;
                        }
                        if (!tempstepyes[collectionDate]) tempstepyes[collectionDate] = {};
                        tempstepyes[collectionDate][userId] = steps;
                        if (!usersdailydetail[userId]) usersdailydetail[userId] = {};
                        usersdailydetail[userId][collectionDate] = steps;
                        const addedDate = this.commonDateService.DateTimeFormat(getsteps.added_date,'YYYY-MM-DD');
                        const joinDate = addedDate;
                        usersdailydetail[userId].join_date = joinDate;
                        if (schedule.tr_goaltype === 2) {
                            if (getsteps.level_type === "miles") {
                                usersdailydetail[userId].commitment_value = getsteps.level_value * 2112;
                            } else {
                                usersdailydetail[userId].commitment_value = getsteps.level_value;
                                usersdailydetail[userId].commitment_type = getsteps.level_type;
                            }
                        }
                    }
                    allusersdailydetail = usersdailydetail;
                    if (Object.keys(temp).length > 0) {
                        allStepsData = temp;
                    }
                    where = `food.collectionDate BETWEEN '${this.commonDateService.DateTimeFormat('now','YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.DateTimeFormat('now','YYYY-MM-DD')} 23:59:59' ${logType} AND food.status = 1`;
                    todayStepsData = await this.activityFeedsService.listRecord(
                        `food.user_id IN (${allusersid.join(',')}) AND (food.activityTypeId IN ${findAll} OR appName='AppleHealthKit' OR appName='GoogleFit') AND ${where}`,
                        { 'food.collectionDate': 'DESC' },
                        [`SUM(steps) as steps`, 'user_id', 'collectionDate'],
                        'food.user_id, food.collectionDate',
                    );
                    for (const tsteps of todayStepsData) {
                        const userId = tsteps.user_id;
                        const steps = Number(tsteps?.steps ?? 0);
                        temp[userId] = steps;
                    }
                    if (Object.keys(temp).length > 0) {
                        todayStepsData = temp;
                        temp = null; 
                    }
                }
                else{
                    if (result_type == 1) {
                        const finalPaginateObj = this.commonArrayService.getPaginationVar(paginateObj?.page || 1, paginateObj?.limit || 10);
                        let total = userList?.length || 0;
                        let resultDetails = this.commonArrayService.paginationResponseChallengeReport(userList, total, finalPaginateObj);
                        return resultDetails;
                    }
                }
                let totalcompetedsteps  = 0; 
                let companyprogress = 0; 
                if (userList && userList.length > 0) {
                    let companysmemtoday = 0;
                    for (const getdata of userList) {
                        let competedsteps = 0;
                        let averagesteps = 0;
                        const userid = getdata.id;
                        let stepswalks = 0;
                        let realstepswalks = 0;
                        if (allStepsData.hasOwnProperty(userid)) {
                            stepswalks = allStepsData[userid];
                            realstepswalks = allStepsData[userid];
                            if (dailymaxstepscnt && dailymaxstepscnt !== 0) {
                                const updailymaxstepscnt = dailymaxstepscnt * uptodays;
                                if (stepswalks > updailymaxstepscnt) {
                                    stepswalks = updailymaxstepscnt;
                                }
                                stepswalks = stepswalks;
                            }
                            if (!stepswalks || !realstepswalks) {
                                stepswalks = 0;
                                realstepswalks = 0;
                            }
                        } else {
                            stepswalks = 0;
                            realstepswalks = 0;
                        }
                        totalcompetedsteps += stepswalks;
                        competedsteps += stepswalks;
                        let stepsdaily = 0;
                        if (todayStepsData.hasOwnProperty(userid)) {
                            stepsdaily = todayStepsData[userid];
                            if (dailymaxstepscnt && dailymaxstepscnt !== 0) {
                                if (stepsdaily > dailymaxstepscnt) {
                                    stepsdaily = dailymaxstepscnt;
                                }
                                stepsdaily = stepsdaily;
                            }
                            if (stepsdaily) {
                                companysmemtoday++;
                            }
                        } else {
                            stepsdaily = 0;
                        }
                        averagesteps = Math.round(competedsteps / uptodays);
                        topusers[userid] = {
                            ...getdata,
                            averagesteps: averagesteps,
                            totalstepscompleted: stepswalks,
                            realtotalstepscompleted: realstepswalks,
                        };
                    }
                }
                result = Object.values(topusers);
                if (schedule.rank_type === "average_steps") {
                    result.sort((a, b) => b.averagesteps - a.averagesteps);
                } else {
                    result.sort((a, b) => b.realtotalstepscompleted - a.realtotalstepscompleted);
                }
                let companytargetstep = 0;
                if (schedule.tr_totalgoalvalue && schedule.tr_totalgoaltype === "miles") {
                    companytargetstep = schedule.tr_totalgoalvalue * 2112;
                } else {
                    companytargetstep = schedule.tr_totalgoalvalue;
                }
                if (companytargetstep !== 0) {
                    companyprogress = Number(((totalcompetedsteps * 100) / companytargetstep).toFixed(2));
                }
                if (companyprogress >= 100) {
                    companyprogress = 100;
                }
                let rank = 1;
                for(let item of result)  {
                    if (!item['rank']) {
                        item['rank'] = 0;
                    }
                    item['rank'] = rank++;
                }
                if (result_type == 1) {
                    const finalPaginateObj = this.commonArrayService.getPaginationVar(paginateObj?.page || 1, paginateObj?.limit || 10);
                    let total = result?.length || 0;
                    let resultDetails = this.commonArrayService.paginationResponseChallengeReport(result, total, finalPaginateObj);
                    return resultDetails;
                }

                if (result_type == 2) {
                    /* summury processing */
                    let clm_name_arr1 = ['Challenge Start Date', 'Challenge End Date', '% of Time Completed', 'Total Goal', '% Completion', 'Average Steps Per Week','Total Cumulative Steps', 'Goal type'];
                    let clm_data1 = [];
                    let clm_datalabel = {};
                    clm_data1.push(this.commonDateService.DateTimeFormat(schedule.start_date,'MM-DD-YYYY'));
                    clm_data1.push(this.commonDateService.DateTimeFormat(schedule.end_date,'MM-DD-YYYY'));
                    clm_data1.push(((uptodays * 100) / totaldays).toFixed(2) + '%');
                    clm_data1.push(companytargetstep.toLocaleString() + ' Steps');
                    clm_data1.push(companyprogress + '%');
                    clm_data1.push(Math.round(companytargetstep / Math.ceil(totaldays / 7)).toLocaleString() + ' Steps');
                    const totalcompetedstepsstype = totalcompetedsteps > 1 ? 'Steps' : 'Step';
                    clm_data1.push(totalcompetedsteps.toLocaleString() + ' ' + totalcompetedstepsstype);
                    clm_data1.push(schedule.tr_goaltype);
            
                    if (schedule.tr_goaltype == 1) {
                        clm_name_arr1.push('Users');
                        clm_data1.push(result?.length ?? 0);
                        const requirestep = schedule.numberofsteps;
                        const filteredUsers = { ...usersdailydetail };
                        for (const [key, value] of Object.entries(usersdailydetail)) {
                            const joinDate = this.commonDateService.DateTimeFormat(value['join_date']);
                            const now = this.commonDateService.DateTimeFormat('now');
                            const uptodays = moment(now).diff(joinDate, 'days') + 1;
                            let metAllDays = true;
                            for (let i = 0; i < uptodays; i++) {
                                const scheduleDate = joinDate.clone().add(i, 'days').format('YYYY-MM-DD');
                                if (value[scheduleDate] !== undefined) {
                                    if (value[scheduleDate] < requirestep) {
                                        metAllDays = false;
                                        break;
                                    }
                                } else {
                                    metAllDays = false;
                                    break;
                                }
                            }
                            if (!metAllDays) {
                                delete filteredUsers[key];
                            }
                        }
                        clm_name_arr1.push('Number Met Daily Goal');
                        clm_data1.push(Object.keys(filteredUsers).length);
                    }
                    if (schedule.tr_goaltype == 2) {
                        let levels = await this.commitmentLevelsService.getLevelsFromScheduleId(schedule.id);
                        let totalUsersCount = {};
                        for(let item of result){
                            let level = levels?.find(ele => ele.id == item?.scj?.trek_level_id);
                            if(level){
                                if(totalUsersCount?.hasOwnProperty(level?.id) == false){
                                    totalUsersCount[level?.id] = {
                                            count: 0,
                                            on_track: 0
                                        };
                                }
                                totalUsersCount[level?.id]['count'] += 1;
                                if(item?.realtotalstepscompleted > level?.level_value){
                                    totalUsersCount[level?.id]['on_track'] += 1;
                                }
                            }
                        }
                        levels.sort((a, b) => a.level_value - b.level_value);
                        levels.forEach(level => {
                            const id = level.id;
                            const label = `Commitment Level-${level.level_value}-${level.level_type}`;
                            clm_name_arr1.push(label);
                            clm_datalabel[label] = {
                                User: totalUsersCount[id]?.['count'] || 0,
                                'Users On-Track': totalUsersCount[id]?.['on_track'] || 0
                            };
                            clm_data1.push({
                                User: totalUsersCount[id]?.['count'] || 0,
                                'Users On-Track': totalUsersCount[id]?.['on_track'] || 0
                            }); 
                            
                        });

                        const now = moment();
                        Object.values(usersdailydetail).forEach((user, key) => {
                            const joinDate = moment(user['join_date'], 'YYYY-MM-DD');
                            const upToDays = now.diff(joinDate, 'days') + 1;
                            let isOnTrack = true;
                            for (let j = 0; j < upToDays; j++) {
                                const scheduleDate = joinDate.clone().add(j, 'days').format('YYYY-MM-DD');
                                if (user.hasOwnProperty(scheduleDate)) {
                                    let requireStep = user['commitment_value'];
                                    if (user['commitment_type'] == 'miles') {
                                        requireStep = user['commitment_value'] * 2112;
                                    }
                                    if (user[scheduleDate] < requireStep) {
                                        isOnTrack = false;
                                        break;
                                    }
                                } else {
                                    isOnTrack = false;
                                    break;
                                }
                            }
                            if (isOnTrack) {
                                const label = `Commitment Level-${user['commitment_value']}-${user['commitment_type']}`;
                                if (clm_datalabel[label]) {
                                    let index = clm_name_arr1.indexOf(label);
                                    clm_datalabel[label]['Users On-Track'] = clm_datalabel[label]['Users On-Track'] + 1;
                                    clm_data1[index] = clm_datalabel[label];
                                }
                            }
                        });
                    }

                    /* user processing */
                    let clm_name_arr = ['RANK',...cronAppConstant.USER_HEADER_DATA,'COMMITTED GOAL' , 'TOTAL STEPS', 'AVERAGE STEPS'];
                    let total_days = enddate.diff(startdate, 'days') + 1;
                    if (today.isSameOrBefore(enddate)) {
                        total_days = today.diff(startdate, 'days') + 1;
                    }
                    for (let day = 0; day < total_days; day++) {
                        clm_name_arr.push(startdate.clone().add(day, 'days').format('MM-DD-YYYY'));
                    }
                    let resultData = {};
                    const clm_data_user = await Promise.all(
                        result.map(async (user) => {
                            const row: any[] = [];
                            const tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(user,clm_name_arr);
                            row.push(user.rank)
                            row.push(...Object.values(tempdatainfo));
                            row.push(user?.treklevels ? user?.treklevels?.level_value + ' ' + user?.treklevels?.level_type : 0);
                            row.push(user?.realtotalstepscompleted);
                            row.push(user.averagesteps);
                            for (let day = 0; day < total_days; day++) {
                                const dateStr = moment(startdate).add(day, 'days').format('YYYY-MM-DD');
                                if (allusersdailydetail.hasOwnProperty(user.id) && allusersdailydetail[user.id].hasOwnProperty(dateStr.trim())) {
                                    row.push(allusersdailydetail[user.id][dateStr.trim()]);
                                } else {
                                    row.push(0);
                                }
                            }
                            return row;
                        }),
                    );
                    let userSheetData = [clm_name_arr, ...clm_data_user];
                    resultData['user'] = userSheetData;
                    clm_data1 = clm_data1.map(item => {
                        if (typeof item === "object" && item !== null) {
                            return Object.entries(item)
                            .map(([key, value]) => `${key} : ${value}`)
                            .join(", ");
                        }
                        return item;
                    });
                    let teamSheetData = [clm_name_arr1, clm_data1];
                    resultData['summary'] = teamSheetData;
                    return resultData;
                }

            }
        } catch (error) {
            throw new Error(error);
        }
    }
}
