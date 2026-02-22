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
import { MoveMoreParksService } from '../movemoreparks';
import { WeekStepsService } from '../week';
const moment = require('moment-timezone');

@Injectable()
export class MoveChallengeReportService {
    constructor(
        private readonly commonDateService: CommonDateService,
        private readonly userService: UserService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonHealthService: CommonHealthService,
        private readonly activityFeedsService: ActivityFeedService,
        private readonly moveMoreParksService: MoveMoreParksService,
        private readonly weekStepsService: WeekStepsService,
    ) {}

    async moveMoreChallengeReport(schedule: Partial<ScheduleChallengeEntity>,condition: string = '',result_type: number = 1,paginateObj: any = null, activityList = [],teamCondition: string = '',groupCondition: string = '',) {
        try {
            if(teamCondition !== ''){
                condition += ' AND ' + teamCondition;
            }
            if(groupCondition !== ''){
                condition += ' AND ' + groupCondition;
            }
            let result = await this.moveMoreChallengeReportHelper(
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

    async moveMoreChallengeReportHelper(schedule: Partial<ScheduleChallengeEntity>, condition: string = '', result_type: number = 1, paginateObj: any = null, activityList = []) {
        try {
            let totalDays = 0, upToDays = 0;
            let joinTable;
            let fields;
            const startdate: any = this.commonDateService.DateTimeFormat(schedule?.['start_date']);
            let enddate: any = this.commonDateService.DateTimeFormat(schedule?.['end_date']);
            const today = this.commonDateService.DateTimeFormat('now'); 
            let is_set_weekend = schedule.is_set_weekend;
            let tr_goaltype = schedule.tr_goaltype;
            let rank_type = schedule.rank_type;
            let dailysteps = schedule['ch'].numberofsteps;
            if (schedule.numberofsteps !== 0) {
                dailysteps = schedule.numberofsteps;
            }
            let countuserwithzero = schedule.countuserwithzero;
            let dailymaxstepscnt = schedule.dailymaxstepscnt;
            let move_more_display = schedule.move_more_display;
            let countstepswith = schedule.countstepswith;
            let logType;
            let layout = 'steps';
            if(rank_type == "average_steps") {
                layout = 'averagestep';                              
            }
            if (countstepswith === 'realstep') {
                logType = " AND food.logType = 'Tracker'";
            } else {
                logType = "AND food.logType in('Tracker','Manual')";
            }
            let dateDiff = enddate.diff(startdate, 'days');
            totalDays = Number(dateDiff) + 1; //ZOMO-4288
            dateDiff = today.diff(startdate, 'days') + 1;
            upToDays = dateDiff;
            if(upToDays == 0){
                upToDays = 1;
            }
            let nDcstart = this.commonDateService.DateTimeFormat(schedule?.['start_date']);
            let nDcend = this.commonDateService.DateTimeFormat(schedule?.['end_date']);
            if (is_set_weekend === 1) {
                while (nDcstart <= nDcend) {
                    const startDay = this.commonDateService.DateTimeFormat(nDcstart);
                    let dayOfWeek = startDay.isoWeekday();
                    totalDays += (dayOfWeek != 0 && dayOfWeek < 6) ? 1 : 0;   
                    if(dayOfWeek != 0 && dayOfWeek < 6 && moment.utc(nDcstart, 'YYYY-MM-DD').unix() <= moment.utc().unix()){
                        upToDays++;
                    }
                    nDcstart = startDay.add(1, 'days').format('YYYY-MM-DD');
                }
            }
            let totalsteps = dailysteps * totalDays;
            if(schedule?.team){
                condition +=  ` AND team.status != 2`;
            }
            let userList;
            joinTable = [
                {'alias':'teamMember', 'table' : tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS, 'on' : `teamMember.user_id = user.id` , 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'teamSchedule', 'table' : tableConstant.CHALLENGE.TBL_CH_TEAM_SCHEDULE, 'on' : `teamMember.team_id = teamSchedule.team_id` , 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'scj', 'table' : tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, 'on' : `teamMember.user_id = scj.user_id  AND scj.schedule_id = teamSchedule.schedule_id` , 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'weekSteps', 'table' : tableConstant.CHALLENGE.TBL_CH_WEEKS_STEPS, 'on' : `scj.schedule_id = weekSteps.schedule_id AND weekSteps.start_date <= scj.added_date AND weekSteps.end_date >= scj.added_date AND weekSteps.status = 1` , 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'team', 'table' : tableConstant.CHALLENGE.TBL_CH_TEAMS, 'on' : `teamMember.team_id= team.id` , 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'group', 'table' : tableConstant.CHALLENGE.TBL_CH_GROUPS, 'on' : `team.group_id= group.id` , 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = user.org_id AND company.status = 1`, 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'companySetting', 'table' : tableConstant.COMPANIES.TBL_COMPANY_SETTINGS, 'on' : `companySetting.org_id = user.org_id`, 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'department', 'table' : tableConstant.COMPANIES.TBL_DEPARTMENT, 'on' : `department.id = user.department_id`, 'connect' : 'user', 'type' : 'LEFT' },
                {'alias':'Location', 'table' : tableConstant.COMPANIES.TBL_LOCATION, 'on' : `Location.id = user.location`, 'connect' : 'user', 'type' : 'LEFT' },
            ];
            fields = ['user','Location','department.id','department.dept_name','company.id','company.company_name','companySetting.spouse_option','teamMember.id','teamMember.team_id','teamMember.user_id','teamMember.iscaptain','teamSchedule.schedule_id', 'team.id','team.tname','team.team_size','team.dept_id','team.loc_id','team.loc_id','team.status', 'group.name', 'group.id','scj.added_date','weekSteps.start_date','scj.schedule_id','scj.in_ranking','scj.completed_lock_locations'];
            userList = await this.userService.list(condition,null,fields,null,joinTable);
            /// captain code need to be add here team wise
            if(userList.length == 0){
                joinTable = [
                    {'alias':'scj', 'table' : tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, 'on' : `user.id = scj.user_id` , 'connect' : 'user', 'type' : 'LEFT' },
                    {'alias':'weekSteps', 'table' : tableConstant.CHALLENGE.TBL_CH_WEEKS_STEPS, 'on' : `scj.schedule_id = weekSteps.schedule_id AND weekSteps.start_date <= scj.added_date AND weekSteps.end_date >= scj.added_date AND weekSteps.status = 1` , 'connect' : 'user', 'type' : 'LEFT' },
                    {'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = user.org_id AND company.status = 1`, 'connect' : 'user', 'type' : 'LEFT' },
                    {'alias':'companySetting', 'table' : tableConstant.COMPANIES.TBL_COMPANY_SETTINGS, 'on' : `companySetting.org_id = user.org_id`, 'connect' : 'user', 'type' : 'LEFT' },
                    {'alias':'department', 'table' : tableConstant.COMPANIES.TBL_DEPARTMENT, 'on' : `department.id = user.department_id`, 'connect' : 'user', 'type' : 'LEFT' },
                    {'alias':'Location', 'table' : tableConstant.COMPANIES.TBL_LOCATION, 'on' : `Location.id = user.location`, 'connect' : 'user', 'type' : 'LEFT' },
                ];
                if(schedule.team){
                    joinTable.push({'alias':'teamMember', 'table' : tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS, 'on' : `teamMember.user_id = user.id` , 'connect' : 'user', 'type' : 'LEFT' });
                    joinTable.push({'alias':'teamSchedule', 'table' : tableConstant.CHALLENGE.TBL_CH_TEAM_SCHEDULE, 'on' : `teamMember.team_id = teamSchedule.team_id` , 'connect' : 'user', 'type' : 'LEFT' });
                    joinTable.push({'alias':'team', 'table' : tableConstant.CHALLENGE.TBL_CH_TEAMS, 'on' : `teamMember.team_id= team.id` , 'connect' : 'user', 'type' : 'LEFT' });
                    if(schedule.group_status){
                        joinTable.push({'alias':'group', 'table' : tableConstant.CHALLENGE.TBL_CH_GROUPS, 'on' : `team.group_id= group.id` , 'connect' : 'user', 'type' : 'LEFT' });
                    }
                }
                fields = ['user','Location','department.id','department.dept_name','company.id','company.company_name','companySetting.spouse_option','scj.added_date','weekSteps.start_date','scj.schedule_id','scj.in_ranking','scj.completed_lock_locations'];
                userList = await this.userService.list(condition,null,fields,null,joinTable);
            }

            let allusersid = userList.map(item => item.id.toString());
            if(!(today > enddate)){
                enddate = today.format('YYYY-MM-DD');
            }
            if (is_set_weekend === 1) {
                logType += " AND WEEKDAY(food.collectionDate)>=0 AND WEEKDAY(food.collectionDate)<5";
                let start = this.commonDateService.DateTimeFormat(schedule?.['start_date']);
                if (start.isoWeekday() >= 1 && start.isoWeekday() <= 5) {
                    schedule.start_date = start.format("YYYY-MM-DD");
                } else {
                    schedule.start_date = start.isoWeekday(8).format("YYYY-MM-DD");
                }
                let end = this.commonDateService.DateTimeFormat(schedule?.['end_date']);
                if (end.isoWeekday() >= 1 && end.isoWeekday() <= 5) {
                    schedule.end_date = end.format("YYYY-MM-DD");
                } else {
                    schedule.end_date = end.isoWeekday(5).format("YYYY-MM-DD");
                }
            }
            let allStepsData;
            if(allusersid.length){
                let where = `(food.collectionDate BETWEEN '${this.commonDateService.DateTimeFormat(schedule?.['start_date'],'YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.DateTimeFormat(schedule?.['end_date'],'YYYY-MM-DD')} 23:59:59' OR food.collectionDate BETWEEN '${this.commonDateService.DateTimeFormat(schedule?.['start_date'],'YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.DateTimeFormat('now','YYYY-MM-DD')} 23:59:59') ${logType} AND food.status = 1`;
                allStepsData = await this.activityFeedsService.listRecord(
                    `food.user_id IN (${allusersid.join(',')}) AND ${where}`,
                    { 'food.collectionDate': 'DESC' },
                    ['SUM(steps) as steps', 'user_id', 'collectionDate'],
                    'food.user_id, food.collectionDate',
                );
                let onlystepdata1 = allStepsData.filter(nstep =>
                    this.commonDateService.DateTimeFormat(nstep.collectionDate).isSameOrAfter(this.commonDateService.DateTimeFormat(startdate), 'day')
                );
                let onlystepdata2 = onlystepdata1.filter(nstep =>
                    this.commonDateService.DateTimeFormat(nstep.collectionDate).isSameOrBefore(this.commonDateService.DateTimeFormat(enddate), 'day')
                );

                let AllOnlyStepdatas = {};
                onlystepdata2.forEach(nstep => {
                    const userId = nstep.user_id;
                    const date = nstep.collectionDate;
                    const steps = Number(nstep?.steps || 0);
                    if (!AllOnlyStepdatas[userId]) {
                        AllOnlyStepdatas[userId] = {};
                    }
                    AllOnlyStepdatas[userId][date] = steps;
                });

                let AllStepsdataDatewise = {};
                allStepsData.forEach(nstep => {
                    const userId = nstep.user_id;
                    const date = nstep.collectionDate;
                    const steps = Number(nstep?.steps || 0);
                    if (!AllStepsdataDatewise[userId]) {
                        AllStepsdataDatewise[userId] = {};
                    }
                    AllStepsdataDatewise[userId][date] = steps;
                });

                if(userList.length){
                    let reportTeamsData;
                    reportTeamsData = {};
                    let reportGroupsData;
                    reportGroupsData = {};
                    let parkDetail = [];
                    if(move_more_display == 1 || move_more_display == 2){
                        parkDetail = await this.moveMoreParksService.GetAllParks(schedule, `mmp.schedule_id = ${schedule.id} AND mmp.status = 1`);
                        for (let userDetailKey = 0; userDetailKey < userList.length; userDetailKey++) {
                            const userDetailValue = userList[userDetailKey];
                            if (schedule.team === 1) {
                                const teamId = userDetailValue.team.id;
                                if (!reportTeamsData[teamId]) {
                                    reportTeamsData[teamId] = {
                                        team: userDetailValue.team,
                                        TeamMembers: 1,
                                        teamsteps: 0,
                                        teamaveragestep: 0
                                    };
                                } else {
                                    reportTeamsData[teamId].TeamMembers += 1;
                                }
                                if(schedule.group_status === 1 && userDetailValue?.group) {
                                    const groupId = userDetailValue?.group?.id;
                                    if (!reportGroupsData[groupId]) {
                                        reportGroupsData[groupId] = {
                                            id: groupId,
                                            name: userDetailValue?.group?.name,
                                        };
                                    }
                                    reportTeamsData[teamId].group_id = groupId;
                                    reportTeamsData[teamId].group_name = userDetailValue?.group?.name;
                                }
                            }

                            const userId = userDetailValue?.userid ?? userDetailValue?.id;
                            const hasStepData = AllStepsdataDatewise[userId] !== undefined;
                            if (hasStepData) {
                                const AlluserStepsdata = await this.moveMoreParksService.GetParkSteps(userId,AllStepsdataDatewise,schedule.start_date,schedule.end_date,
                                    is_set_weekend,totalDays, userDetailValue.scj.added_date, today
                                );
                                const completed_lock_locations = userDetailValue.scj.completed_lock_locations ? JSON.parse(userDetailValue.scj.completed_lock_locations)  : [];
                                const lock_steplog_website_click = schedule.lock_steplog_website_click;
                                let temp_status = lock_steplog_website_click === 0;
                                let get_current = 0;
                                let location_progress = true;
                                let user_steps = 0;
                                for (let parkKey = 0; parkKey < parkDetail.length; parkKey++) {
                                    const parkInfo = parkDetail[parkKey];
                                    let currentstepsdata = 0;
                                    let completed_location = false;
                                    if (AlluserStepsdata) {
                                        if (AlluserStepsdata >= parkInfo['Rsteps']) {
                                            if (lock_steplog_website_click === 1) {
                                                if (completed_lock_locations.includes(parkInfo.id) && get_current === 0) {
                                                temp_status = true;
                                                } 
                                                else {
                                                    if (get_current === 0) {
                                                        get_current = parkInfo.id;
                                                        currentstepsdata = parkInfo.steps;
                                                    }
                                                    temp_status = false;
                                                }
                                            } else {
                                                get_current = parkInfo.id;
                                            }
                                            if (temp_status) {
                                                completed_location = true;
                                                currentstepsdata = parkInfo.steps;
                                            }
                                        } else {
                                            if (temp_status || get_current === 0) {
                                                if (parkKey === 0) {
                                                    currentstepsdata = AlluserStepsdata;
                                                } else {
                                                const prevSteps = parkDetail[parkKey - 1]?.['Rsteps'] || 0;
                                                currentstepsdata = AlluserStepsdata - prevSteps;
                                                }
                                            }
                                        }
                                    }
                                    if (location_progress) {
                                        user_steps += currentstepsdata;
                                    }
                                    if (AlluserStepsdata < parkInfo['Rsteps']) {
                                        location_progress = false;
                                    }
                                }
                                const userStepData = AllOnlyStepdatas[userId];
                                const main_user_step = Number(userStepData ? Object.values(userStepData).reduce((a, b) => Number(a) + Number(b)) : 0);
                                const allStepsSum = Number(Object.values(AllStepsdataDatewise[userId]).reduce((a, b) => Number(a) + Number(b)) || 0);
                                userList[userDetailKey].steps = main_user_step;
                                userList[userDetailKey].all_steps = AlluserStepsdata;
                                userList[userDetailKey].averagestep = Number(((main_user_step / totalDays)).toFixed(2));
                                userList[userDetailKey].alltotalsteps = allStepsSum;
                                if (schedule.team === 1) {
                                    const teamId = userDetailValue.team.id;
                                    reportTeamsData[teamId].teamsteps += main_user_step;
                                    reportTeamsData[teamId].teamaveragestep += Number(((main_user_step / totalDays)).toFixed(2));
                                }
                            } else {
                                userList[userDetailKey].steps = 0;
                                userList[userDetailKey].all_steps = 0;
                                userList[userDetailKey].averagestep = 0;
                                userList[userDetailKey].alltotalsteps = 0;
                                if (schedule.team === 1) {
                                    const teamId = userDetailValue.team.id;
                                    reportTeamsData[teamId].teamsteps += 0;
                                    reportTeamsData[teamId].teamaveragestep += 0;
                                }
                            }
                        }
                    }
                    if(move_more_display == 0 || move_more_display == 2) {
                        for (const [userDetailKey, userDetailValue] of userList.entries()) {
                            if (schedule.team === 1) {
                                const teamId = userDetailValue.team.id;
                                if (!reportTeamsData[teamId]) reportTeamsData[teamId] = {};
                                reportTeamsData[teamId].team = userDetailValue.team;
                                if (!reportTeamsData[teamId].TeamMembers) {
                                    reportTeamsData[teamId].TeamMembers = 1;
                                } else {
                                    reportTeamsData[teamId].TeamMembers += 1;
                                }
                                if (!reportTeamsData[teamId].teamsteps) {
                                    reportTeamsData[teamId].teamsteps = 0;
                                    reportTeamsData[teamId].teamaveragestep = 0;
                                }
                            }
                            const userId = userDetailValue.id;
                            if (AllStepsdataDatewise[userId]) {
                                let tempdata = AllStepsdataDatewise[userId];
                                const startDate = userDetailValue?.weekSteps?.start_date;
                                if (startDate && startDate !== '') {
                                    const rangeStart = this.commonDateService.DateTimeFormat(startDate).startOf('day');
                                    tempdata = Object.fromEntries(
                                        Object.entries(tempdata).filter(([dateStr, steps]) => {
                                            const date = this.commonDateService.DateTimeFormat(dateStr);
                                            return date.isSameOrAfter(rangeStart);
                                        })
                                    );
                                }
                                if (Object.keys(tempdata).length > 0) {
                                    AllStepsdataDatewise[userId] = tempdata;
                                    userList[userDetailKey].datewise = tempdata;
                                    const allStepsSum = Number(Object.values(tempdata).reduce((a, b) => Number(a) + Number(b)) || 0);
                                    const stepsSum = Number(Object.values(AllOnlyStepdatas[userId]).reduce((a, b) => Number(a) + Number(b)) || 0);
                                    userList[userDetailKey].steps = userList[userDetailKey]?.steps ?? stepsSum;
                                    userList[userDetailKey].averagestep = userList[userDetailKey] && userList[userDetailKey]?.averagestep ? userList[userDetailKey]?.averagestep :  Number(((stepsSum / totalDays)).toFixed(2));
                                    userList[userDetailKey].alltotalsteps = allStepsSum;
                                    if (schedule.team === 1) {
                                        reportTeamsData[userDetailValue.team.id].teamsteps += stepsSum;
                                        reportTeamsData[userDetailValue.team.id].teamaveragestep += Number(((stepsSum / totalDays)).toFixed(2));
                                    }
                                } 
                                else {
                                    userList[userDetailKey].steps = 0;
                                    userList[userDetailKey].averagestep = 0;
                                    userList[userDetailKey].alltotalsteps = 0;
                                    if (schedule.team === 1) {
                                        reportTeamsData[userDetailValue.team.id].teamsteps += 0;
                                        reportTeamsData[userDetailValue.team.id].teamaveragestep += 0;
                                    }
                                }
                            } 
                            else {
                                userList[userDetailKey].steps = 0;
                                userList[userDetailKey].averagestep = 0;
                                userList[userDetailKey].alltotalsteps = 0;
                                if (schedule.team === 1) {
                                    reportTeamsData[userDetailValue.team.id].teamsteps += 0;
                                    reportTeamsData[userDetailValue.team.id].teamaveragestep += 0;
                                }
                            }
                        }
                    }
                    if (userList && userList.length > 0) {
                        if (schedule.rank_type === "average_steps") {
                            userList.sort((a, b) => b.averagestep - a.averagestep);
                        } else {
                            userList.sort((a, b) => b.steps - a.steps);
                        }
                    }
                    reportTeamsData = Object.values(reportTeamsData) ?? [];
                    if (reportTeamsData && reportTeamsData.length > 0) {
                        if (schedule.rank_type === "average_steps") {
                            reportTeamsData.sort((a, b) => b.teamaveragestep - a.teamaveragestep);
                        } else {
                            reportTeamsData.sort((a, b) => b.teamsteps - a.teamsteps);
                        }
                    } 
                    reportGroupsData = Object.values(reportGroupsData) ?? [];
                    if (reportGroupsData && reportGroupsData.length > 0) {
                        for (let i = 0; i < reportGroupsData.length; i++) {
                            let group = reportGroupsData[i];
                            let groupDetails = reportTeamsData?.filter(team => team?.group_id === group.id) ?? [];
                            reportGroupsData[i]['teams'] = groupDetails.length;
                            reportGroupsData[i]['teamsteps'] = Number(groupDetails?.reduce((sum, team) => {
                                return sum + (team?.teamsteps || 0);
                            }, 0).toFixed(2));
                            reportGroupsData[i]['teamaveragestep'] = Number(groupDetails?.reduce((sum, team) => {
                                return sum + (team?.teamaveragestep || 0);
                            }, 0).toFixed(2));
                        }
                        if (schedule.rank_type === "average_steps") {
                            reportGroupsData.sort((a, b) => b.teamaveragestep - a.teamaveragestep);
                        } else {
                            reportGroupsData.sort((a, b) => b.teamsteps - a.teamsteps);
                        }
                    } 

                    let rank = 1;
                    for(let item of userList)  {
                        if (!item['rank']) {
                            item['rank'] = 0;
                        }
                        item['rank'] = rank++;
                    }
                    if (result_type == 1) {
                        const finalPaginateObj = this.commonArrayService.getPaginationVar(paginateObj?.page || 1, paginateObj?.limit || 10);
                        let total = userList?.length || 0;
                        let resultDetails = this.commonArrayService.paginationResponseChallengeReport(userList, total, finalPaginateObj);
                        return resultDetails;
                    }

                    if(result_type == 2){
                        let companyInfo = userList[0]?.company ?? {};
                        let clm_name_arr;
                        let resultData = {};
                        if(schedule.team === 1){
                            clm_name_arr = ['TEAM', 'TEAM SIZE', 'TEAM MEMBERS', 'TOTAL STEPS', 'AVERAGE STEPS', 'RANK'];
                            rank = 1;
                            const clm_data_team = await Promise.all(
                                reportTeamsData.map(async (item) => {
                                    const row: any[] = [];
                                    row.push(item?.team?.tname)
                                    row.push(item?.team?.team_size)
                                    row.push(item?.TeamMembers ?? 0)
                                    row.push(item?.teamsteps ?? 0)
                                    row.push(item?.teamaveragestep)
                                    row.push(rank++)
                                    return row;
                                }),
                            );
                            let teamSheetData = [clm_name_arr, ...clm_data_team];
                            resultData['team'] = teamSheetData;
                        }
                        /* group processing */
                        if(schedule?.group_status == 1){
                            clm_name_arr =  ['RANK',...cronAppConstant.GROUP_HEADER_DATA, 'TOTAL STEPS', 'AVERAGE STEPS'];
                            rank = 1;
                            const clm_data_group = await Promise.all(
                                reportGroupsData.map(async (item) => {
                                    const row: any[] = [];
                                    row.push(rank++)
                                    row.push(companyInfo?.company_name ?? '')
                                    row.push(item?.name)
                                    row.push(item?.teams)
                                    row.push(item?.teamsteps)
                                    row.push(item?.teamaveragestep)
                                    return row;
                                }),
                            );
                            let groupSheetData = [clm_name_arr, ...clm_data_group];
                            resultData['group'] = groupSheetData;
                        }

                        clm_name_arr = [...cronAppConstant.USER_HEADER_DATA];
                        if(schedule?.team == 1){
                            clm_name_arr.push('Team')
                        }
                        if(schedule?.group_status == 1){
                            clm_name_arr.push('GROUP NAME')
                        }
                        let week_col_count = 0;
                        let weeksfteps;
                        let totalnumberofweek = 0;
                        if ([0, 2].includes(move_more_display)) {
                            weeksfteps = await this.weekStepsService.listRecord(`weeksSteps.schedule_id = ${schedule.id} AND weeksSteps.status = 1 AND weeksSteps.f_suggestion = 0`, {week_no: 'ASC'}, ['week_no','move_more_goal','move_more_goal_type','start_date','end_date']);
                            for (let weeksftepsKey = 0; weeksftepsKey < weeksfteps.length; weeksftepsKey++) {
                                const weekLabel = `Week ${weeksftepsKey + 1}`;
                                clm_name_arr.push(`${weekLabel} Average Steps`);
                                clm_name_arr.push(`${weekLabel} Total Steps`);
                                week_col_count += 2;
                                if (weeksftepsKey !== 0) {
                                    clm_name_arr.push(`Met ${weekLabel} Goal`);
                                    week_col_count++;
                                }
                            }
                            totalnumberofweek = weeksfteps.length;
                            clm_name_arr.push('Met All Weekly Goals');
                            clm_name_arr.push('Total Goals Met');
                            week_col_count += 2;
                        }
                        let total_locations
                        if ([1, 2].includes(move_more_display)) {
                            for (const parkInfo of parkDetail) {
                                clm_name_arr.push(`${parkInfo.name} Total Steps`);
                                clm_name_arr.push(`${parkInfo.name} Total Miles`);
                                clm_name_arr.push(`Met ${parkInfo.name} Goal`);
                            }
                            clm_name_arr.push('Met All Locations Goals');
                            clm_name_arr.push('Total Locations Goals Met');
                            total_locations = parkDetail.length;
                        }
                        clm_name_arr.push('Total Steps');

                        if(userList.length){
                            const clm_data_user = await Promise.all(
                                userList.map(async (user) => {
                                    const row: any[] = [];
                                    const tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(user,clm_name_arr);
                                    row.push(...Object.values(tempdatainfo));
                                    if(schedule?.team == 1){
                                        row.push(user?.team?.tname)
                                    }
                                    if(schedule?.group_status == 1){
                                        row.push(user?.group?.name);
                                    }
                                    if ([0, 2].includes(move_more_display)) {
                                        let basegoal = 1;
                                        let IssetGoal = 0;
                                        if (user.datewise && Object.keys(user.datewise).length > 0) {
                                            let tempcomcount = 0;
                                            for (const weeksftepsVal of weeksfteps) {
                                                const startDate = this.commonDateService.DateTimeFormat(weeksftepsVal.start_date);
                                                if(this.commonDateService.DateTimeFormat(weeksftepsVal.end_date).isSameOrBefore(this.commonDateService.DateTimeFormat(enddate)) == false){
                                                    weeksftepsVal.end_date = this.commonDateService.DateTimeFormat(enddate).format('YYYY-MM-DD')
                                                }
                                                const endDate = this.commonDateService.DateTimeFormat(this.commonDateService.DateTimeFormat(weeksftepsVal.end_date).format('YYYY-MM-DD') + ' 23:59:59');
                                                const tempdata = Object.fromEntries(
                                                    Object.entries(user.datewise).filter(([dateStr, val]) => {
                                                    const date = this.commonDateService.DateTimeFormat(dateStr);
                                                    return date.isSameOrAfter(startDate) && date.isSameOrBefore(endDate);
                                                    })
                                                );
                                                if (Object.keys(tempdata).length > 0) {
                                                    const weekNo = weeksftepsVal.week_no;
                                                    if (!user.week) user.week = {};
                                                    if (!user.week[weekNo]) user.week[weekNo] = {};
                                                    user.week[weekNo].steps = '';
                                                    user.week[weekNo].averagestep = '';
                                                    if (user.scj.added_date && this.commonDateService.DateTimeFormat(user.scj.added_date).isSameOrBefore(endDate)) {
                                                        const sumSteps = Number(Object.values(tempdata).reduce((a, b) => Number(a) + Number(b), 0));
                                                        const avgSteps = Math.round(sumSteps / (is_set_weekend === 1 ? 5 : 7));
                                                        user.week[weekNo].steps = sumSteps;
                                                        user.week[weekNo].averagestep = avgSteps;
                                                        if (tr_goaltype === 1 || IssetGoal === 0) {
                                                            basegoal = weekNo;
                                                        }
                                                        IssetGoal++;
                                                    }
                                                    row.push(user.week[weekNo].averagestep);
                                                    row.push(user.week[weekNo].steps);

                                                    if (weekNo !== 1) {
                                                        let goal = 0;
                                                        if (IssetGoal > 1) {
                                                            const prevWeek = user.week[weekNo - 1];
                                                            const baseWeek = user.week[basegoal];
                                                            const goalType = weeksftepsVal.move_more_goal_type;
                                                            const goalValue = weeksftepsVal.move_more_goal;
                                                            if (tr_goaltype === 1) {
                                                                if (prevWeek && prevWeek[layout] !== undefined) {
                                                                    goal = goalType === 0
                                                                        ? (prevWeek[layout] * goalValue) / 100 + prevWeek[layout]
                                                                        : goalValue + prevWeek[layout];
                                                                }
                                                            } else {
                                                                if (baseWeek && baseWeek[layout] !== undefined) {
                                                                    goal = goalType === 0
                                                                        ? (baseWeek[layout] * goalValue) / 100 + baseWeek[layout]
                                                                        : goalValue + baseWeek[layout];
                                                                }
                                                            }
                                                        }

                                                        const currentValue = user.week[weekNo][layout];
                                                        if (goal != 0 && currentValue !== 0 && currentValue >= goal) {
                                                            row.push('Yes');
                                                            tempcomcount++;
                                                        } else {
                                                            if (today.isAfter(endDate)) {
                                                                row.push('No');
                                                            } else {
                                                                row.push('');
                                                            }
                                                            if (currentValue >= goal) {
                                                                tempcomcount++;
                                                            }
                                                        }
                                                    }
                                                } else {
                                                    row.push('');
                                                    row.push('');
                                                    if (weeksftepsVal.week_no !== 1) {
                                                        row.push('');
                                                    }
                                                }
                                            }

                                            if (totalnumberofweek === tempcomcount) {
                                                row.push('Yes');
                                            } else {
                                                row.push('No');
                                            }
                                            row.push(tempcomcount);
                                        } else {
                                            for (let j = 0; j < week_col_count; j++) {
                                                row.push('');
                                            }
                                        }
                                    }
                                    if ([1, 2].includes(move_more_display)) {
                                        let AlluserStepsdata;
                                        if (move_more_display === 1) {
                                            AlluserStepsdata = Number(user.steps || 0);
                                        } else {
                                            if (user.week) {
                                                AlluserStepsdata = Object.values(user['week']).reduce(
                                                    (sum, w) => Number(sum) + Number(w['steps']),
                                                    0
                                                ) ?? 0;
                                            }
                                            else{
                                               AlluserStepsdata = Number(user.all_steps || user.steps || 0); 
                                            }
                                        }

                                        let completed_lock_locations: number[] = user.scj.completed_lock_locations && user.scj.completed_lock_locations !== '' ? (JSON.parse(user.scj.completed_lock_locations) as number[]) : [];
                                        completed_lock_locations = completed_lock_locations.map(item => Number(item));
                                        const lock_steplog_website_click: number = Number(schedule.lock_steplog_website_click);
                                        let temp_status: boolean = lock_steplog_website_click === 0;
                                        let get_current: number = 0;
                                        let location_progress: boolean = true;
                                        let location_goal_met: number = 0;
                                        for (let parkkey = 0; parkkey < parkDetail.length; parkkey++) {
                                            const parkinfo = parkDetail[parkkey];
                                            let currentstepsdata: number = 0;
                                            let currentmilesdata: number = 0;
                                            let completed_location: boolean = false;
                                            const parkRsteps: number = Number(parkinfo.Rsteps || 0);
                                            const parkSteps: number = Number(parkinfo.steps || 0);
                                            const parkMiles: number = Number(parkinfo.miles || 0);
                                            if (AlluserStepsdata > 0) {
                                                if (AlluserStepsdata >= parkRsteps) {
                                                    if (lock_steplog_website_click === 1) {
                                                        if (completed_lock_locations.includes(Number(parkinfo.id)) && get_current === 0) {
                                                            temp_status = true;
                                                        }
                                                        else {
                                                            if (get_current === 0) {
                                                                get_current = Number(parkinfo.id);
                                                                currentstepsdata = parkSteps;
                                                                currentmilesdata = parkMiles;
                                                            }
                                                            temp_status = false;
                                                        }
                                                    } else {
                                                        get_current = Number(parkinfo.id);
                                                    }

                                                    if (temp_status) {
                                                        completed_location = true;
                                                        location_goal_met++;
                                                        currentstepsdata = parkSteps;
                                                        currentmilesdata = parkMiles;
                                                    }
                                                } else {
                                                    if (temp_status || get_current === 0) {
                                                        if (parkkey === 0) {
                                                            currentstepsdata = AlluserStepsdata;
                                                        } 
                                                        else {
                                                            const prevRsteps = Number(parkDetail[parkkey - 1].Rsteps || 0);
                                                            currentstepsdata = AlluserStepsdata - prevRsteps;
                                                        }
                                                        currentmilesdata = +(currentstepsdata / 2112).toFixed(1);
                                                    }
                                                }
                                            }

                                            row.push(location_progress ? currentstepsdata : 0);
                                            row.push(location_progress ? currentmilesdata : 0);
                                            row.push(completed_location ? 'Yes' : 'No');

                                            if (AlluserStepsdata < parkRsteps) {
                                                location_progress = false;
                                            }
                                        }
                                        row.push(total_locations === location_goal_met ? 'Yes' : 'No');
                                        row.push(location_goal_met);
                                    }
                                    // const alltotalsteps: number = Number(user.alltotalsteps || 0);
                                    const alltotalsteps: number = Number(user?.steps || 0); //ZOMO-4482
                                    row.push(alltotalsteps);
                                    return row;
                                }),
                            );
                            let userSheetData = [clm_name_arr, ...clm_data_user];
                            resultData['user'] = userSheetData;
                        }
                        return resultData;
                    }
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
        } catch (error) {
            throw new Error(error);
        }
    }
}
