import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    ScheduleChallengeEntity,
    tableConstant
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { ActivityService } from 'src/module/acitivity/activity.service';
import { CompanyService } from 'src/module/company/company.service';
import { ActivityFeedService } from 'src/module/tracker/activityfeeds.service';
import { UserService } from 'src/module/user/user.service';
import { In } from 'typeorm';
import { TeamsService } from '../team/teams.service';
import { UserChallengeHelperService } from '../userChallengeHelper.service';
import { WeekStepsService } from '../week/weeksteps.service';

@Injectable()
export class FootballStepChallengeReportService {
    constructor(
        private readonly commonDateService: CommonDateService,
        private readonly teamsService: TeamsService,
        private readonly usersService: UserService,
        private readonly commonArrayService: CommonArrayService,
        private readonly weekStepsService: WeekStepsService,
        private readonly activityService: ActivityService,
        private readonly companyService: CompanyService,
        private readonly userChallengeHelperService: UserChallengeHelperService,
        private readonly activityFeedsService: ActivityFeedService,
    ) { }

    async footballStepChallengeReport(
        schedule: Partial<ScheduleChallengeEntity>,
        condition: string = '',
        result_type: number = 1,
        paginateObj: any = null,
        teamCondition: string = '',
        groupCondition: string = '',
    ) {
        try {
            let result: any[] = [];
            let startdate: any = this.commonDateService.DateTimeFormat(
                schedule?.['start_date'],
                'timestamp',
            );
            let startdatedmy: any = this.commonDateService.DateTimeFormat(
                schedule?.['start_date'],
                'YYYY-MM-DD HH:mm:ss',
            );
            let enddate: any = this.commonDateService.DateTimeFormat(
                schedule?.['end_date'],
                'timestamp',
            );
            let enddatedmy: any = this.commonDateService.DateTimeFormat(
                schedule?.['end_date'],
                'YYYY-MM-DD HH:mm:ss',
            );
            let now: any = this.commonDateService.DateTimeFormat(
                'now',
                'timestamp',
            );
            if (now >= enddate) {
                now = enddate;
            }
            let totaldays =
                Math.floor((enddate - startdate) / (60 * 60 * 24)) + 1;
            let actTrackerId = '', stepId = '', walkingId = '', runningId = '', cyclingId = '', swimmingId = '';
            let activities = await this.activityService.activityListRecord(
                {
                    activity_name: In(['Activity Tracker- Walking', 'Activity Tracker- Running', 'Activity Tracker- Cycling', 'Activity Tracker- Swimming', 'Activity Tracker', 'Steps'])
                },
                ['id', 'activity_name'],
            )
            actTrackerId = activities?.[0] ? activities?.[0]?.id?.toString() : '';
            stepId = activities?.[1] ? activities?.[1]?.id?.toString() : '';
            walkingId = activities?.[2] ? activities?.[2]?.id?.toString() : '';
            runningId = activities?.[3] ? activities?.[3]?.id?.toString() : '';
            cyclingId = activities?.[4] ? activities?.[4]?.id?.toString() : '';
            swimmingId = activities?.[5] ? activities?.[5]?.id?.toString() : '';
            let stepWeeks = await this.weekStepsService.listRecord(
                `weeksSteps.schedule_id IN (${schedule.id})`,
                { 'id': 'ASC' },
                [],
                null,
            );
            if (schedule?.s_activity_tracker == 0) {
                actTrackerId = '';
            }
            if (schedule?.s_steps == 0) {
                stepId = '';
            }
            if (schedule?.s_walking == 0) {
                walkingId = '';
            }
            if (schedule?.s_running == 0) {
                runningId = '';
            }
            if (schedule?.s_cycling == 0) {
                cyclingId = '';
            }
            if (schedule?.s_swimming == 0) {
                swimmingId = '';
            }
            let findAll = `('${actTrackerId}','${stepId}','${walkingId}','${runningId}','${cyclingId}','${swimmingId}')`;
            let dailySteps = Number(schedule?.['ch']?.numberofsteps) || 0;
            if (schedule?.numberofsteps && schedule?.numberofsteps > 0) {
                dailySteps = Number(schedule?.numberofsteps);
            }
            let countUserWithZero = schedule?.countuserwithzero || '';
            let dailyMaxStepsCnt = schedule?.dailymaxstepscnt || 0;
            let countStepsWith = schedule?.countstepswith || '';
            let logType = " AND logType IN ('Tracker','Manual')";
            if (countStepsWith == 'realstep') {
                logType = " AND logType = 'Tracker'";
            }
            let yardFrequency = schedule?.yardfrequency || '';
            let individualMeetGoal = schedule?.individualmeetgoal || '';
            let countuserWithZero = schedule?.countuserwithzero || 0;
            let yard = schedule?.yard || 0;
            let rankType = schedule?.rank_type;
            let stepsWhere: string = `food.collectionDate BETWEEN '${startdatedmy}' AND '${enddatedmy}'`;
            let allgetteams = await this.teamsService.getTeamAllReport(
                `team.org_id = ${schedule?.org_id} AND scj.schedule_id = ${schedule?.id} ${teamCondition != '' ? ' AND ' + teamCondition : ''} ${groupCondition != '' ? ' AND ' + groupCondition : ''}`,
                [
                    'team.id',
                    'team.tname',
                    'team.group_id',
                    'team.team_size',
                    'teamSchedule.id',
                    'challengeGroups.id',
                    'challengeGroups.name',
                ],
            );
            let pagination = {
                limit: paginateObj?.limit ? paginateObj?.limit : appConstant.RECORD_PER_PAGE,
                page: paginateObj?.page ? paginateObj?.page : 1,
            }
            let membershipCode = await this.companyService.getCompanyCodeFromId(schedule?.org_id);
            let challengeUsers, allUserId
            if (schedule?.team && schedule?.team == 1 && allgetteams) {
                if (result_type === 1) {
                    challengeUsers = await this.usersService.challengeReportPaginate(
                        `${condition} AND User.org_id = ${schedule?.org_id} ${teamCondition != '' ? ' AND ' + teamCondition : ''} ${groupCondition != '' ? ' AND ' + groupCondition : ''}`,
                        pagination,
                        [
                            'User',
                            'Location',
                            'department.id',
                            'department.dept_name',
                            'company.id',
                            'company.company_name',
                            'companySetting.spouse_option',
                            'teamMember.id',
                            'teamMember.user_id',
                            'teamMember.team_id',
                            'scj.id',
                            'scj.schedule_id',
                            'scj.challenge_id',
                        ],
                        [tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS],
                    )
                    allUserId = challengeUsers?.list?.map(user => user.id);
                }
                else {
                    challengeUsers = await this.usersService.challengeReportPaginate(
                        `${condition} AND User.org_id = ${schedule?.org_id} ${teamCondition != '' ? ' AND ' + teamCondition : ''} ${groupCondition != '' ? ' AND ' + groupCondition : ''}`,
                        null,
                        [
                            'User',
                            'Location',
                            'department.id',
                            'department.dept_name',
                            'company.id',
                            'company.company_name',
                            'companySetting.spouse_option',
                            'teamMember.id',
                            'teamMember.user_id',
                            'teamMember.team_id',
                            'scj.id',
                            'scj.schedule_id',
                            'scj.challenge_id',
                        ],
                        [tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS],
                    )
                    allUserId = challengeUsers?.map(user => user.id);
                }
            } else {
                if (result_type === 1) {
                    challengeUsers = await this.usersService.challengeReportPaginate(
                        `${condition} AND User.org_id = ${schedule?.org_id}`,
                        pagination,
                        [
                            'User',
                            'Location',
                            'department.id',
                            'department.dept_name',
                            'company.id',
                            'company.company_name',
                            'companySetting.spouse_option',
                        ]
                    )
                    allUserId = challengeUsers?.list?.map(user => user.id);
                }
                else {
                    challengeUsers = await this.usersService.challengeReportPaginate(
                        `${condition} AND User.org_id = ${schedule?.org_id}`,
                        null,
                        [
                            'User',
                            'Location',
                            'department.id',
                            'department.dept_name',
                            'company.id',
                            'company.company_name',
                            'companySetting.spouse_option',
                        ]
                    )
                    allUserId = challengeUsers?.map(user => user.id);
                }

            }
            if (result_type === 1 && challengeUsers?.list) {
                for (const user of challengeUsers?.list) {
                    let userId = user.id;
                    let teamName = '';
                    let groupName = '';
                    let groupId;
                    let teamId;
                    if (
                        user?.teamMember &&
                        user.teamMember.team_id &&
                        user.teamMember.team_id !== ''
                    ) {
                        if (allgetteams && allgetteams.length > 0) {
                            let team = allgetteams.find(
                                (team: any) => team.id === user.teamMember.team_id,
                            );
                            if (team) {
                                teamName = team.tname;
                                teamId = team.id;
                                if (
                                    schedule?.group_status == 1 &&
                                    team?.group_id !== 0
                                ) {
                                    groupId = team?.group_id || 0;
                                    groupName = team?.['challengeGroups']?.name || '';
                                }
                            }
                        }
                    }
                    if (result_type == 1) {
                        let resultData = {
                            user_id: userId,
                            first_name: user.first_name || '',
                            last_name: user.last_name || '',
                            company_name: user.company?.company_name || '',
                            department_name: user.department?.dept_name || '',
                            employee_id: user?.employeeid || '',
                            team_name: teamName,
                            team_id: teamId,
                            group_id: groupId,
                            group_name: groupName,
                        };
                        result.push(resultData);
                    }
                }
                const finalPaginateObj =
                    this.commonArrayService.getPaginationVar(
                        paginateObj?.page || 1,
                        paginateObj?.limit || 10,
                    );
                let total = result?.length || 0;
                let resultDetails = this.commonArrayService.paginationResponseChallengeReport(
                    result,
                    total,
                    finalPaginateObj,
                );
                return resultDetails;
            }
            let allStepsDataUsers = {};
            let stepUsers = {};
            let userSteps = {};
            let tempStepYes = {};
            let allStepsDataTeam, allStepsDataUser;
            let allUserIdsStr = allUserId && allUserId.length > 0 ? `'${allUserId.join("','")}'` : null;
            if (allUserIdsStr && allUserIdsStr != '') {
                allStepsDataUser = await this.activityFeedsService.listRecord(
                    `food.user_id IN (${allUserIdsStr}) AND (food.activityTypeId IN ${findAll} OR food.appName='AppleHealthKit' OR food.appName='GoogleFit' OR food.appName='User Entry') AND ${stepsWhere}`,
                    { 'food.collectionDate': 'DESC' },
                    [`SUM(steps) as steps`, 'user_id', 'collectionDate'],
                    'food.user_id',
                );
                if (allStepsDataUser && allStepsDataUser.length > 0) {
                    allStepsDataUser.forEach(getSteps => {
                        allStepsDataUsers[getSteps.user_id] = getSteps.steps;
                    });
                }
                allStepsDataTeam = await this.activityFeedsService.listRecord(
                    `food.user_id IN (${allUserIdsStr}) AND (food.activityTypeId IN ${findAll} OR food.appName='AppleHealthKit' OR food.appName='GoogleFit' OR food.appName='User Entry') AND ${stepsWhere}`,
                    { 'food.collectionDate': 'DESC' },
                    [`SUM(steps) as steps`, 'user_id', 'collectionDate'],
                    'food.user_id, food.collectionDate',
                );
                if (allStepsDataTeam && allStepsDataTeam.length > 0) {
                    allStepsDataTeam.forEach(getSteps => {
                        const userArr = getSteps.user_id;
                        let collectionDate = getSteps.collectionDate;
                        collectionDate = this.commonDateService.DateTimeFormat(
                            collectionDate,
                            'MM-DD-YYYY',
                            'YYYY-MM-DD',
                        );
                        const steps = getSteps.steps;
                        if (!stepUsers[userArr]) stepUsers[userArr] = {};
                        if (!userSteps[userArr]) userSteps[userArr] = {};
                        if (!tempStepYes[collectionDate]) tempStepYes[collectionDate] = {};
                        stepUsers[userArr][collectionDate] = getSteps;
                        userSteps[userArr][collectionDate] = steps;
                        tempStepYes[collectionDate][userArr] = steps;
                    });
                }
            }
            if (allUserIdsStr && allUserIdsStr != '') {
                let weekStepsData = Object.create(null);
                let userssData = result_type == 1 ? challengeUsers.list : challengeUsers;
                for (const user of userssData) {
                    let userId = user.id;
                    let teamName = '';
                    let groupName = '';
                    let groupId;
                    let teamId;
                    if (
                        user?.teamMember &&
                        user.teamMember.team_id &&
                        user.teamMember.team_id !== ''
                    ) {
                        if (allgetteams && allgetteams.length > 0) {
                            let team = allgetteams.find(
                                (team: any) => team.id === user.teamMember.team_id,
                            );
                            if (team) {
                                teamName = team.tname;
                                teamId = team.id;
                                if (
                                    schedule?.group_status == 1 &&
                                    team?.group_id !== 0
                                ) {
                                    groupId = team?.group_id || 0;
                                    groupName = team?.['challengeGroups']?.name || '';
                                }
                            }
                        }
                    }
                    for (const weekStep of stepWeeks) {
                        let weekStartDate = this.commonDateService.DateTimeFormat(
                            weekStep?.start_date,
                            'MM-DD-YYYY',
                            'YYYY-MM-DD HH:mm:ss',
                        );
                        let weekEndDate = this.commonDateService.DateTimeFormat(
                            weekStep?.end_date,
                            'MM-DD-YYYY',
                            'YYYY-MM-DD HH:mm:ss',
                        );
                        const weekDates = this.commonDateService.getDatesInRange(weekStartDate, weekEndDate);
                        if (!weekStepsData[userId]) {
                            weekStepsData[userId] = {};
                        }
                        if (!weekStepsData[userId][weekStep.week_no]) {
                            weekStepsData[userId][weekStep.week_no] = {}
                        }
                        let totalWeekSteps = 0;
                        for (const dateKey of weekDates) {
                            if (userSteps && userSteps[userId] && userSteps[userId][dateKey]) {
                                totalWeekSteps += Number(userSteps[userId][dateKey]);
                            }
                        }
                        weekStepsData[userId][weekStep.week_no]['total'] = totalWeekSteps;
                        weekStepsData[userId][weekStep.week_no]['start_date'] = weekStartDate;
                        weekStepsData[userId][weekStep.week_no]['end_date'] = weekEndDate;
                        weekStepsData[userId][weekStep.week_no]['average'] = Math.round(totalWeekSteps / weekStep.days_week) || 0;
                        weekStepsData[userId][weekStep.week_no]['met_goal'] = totalWeekSteps >= (weekStep?.week_steps * weekStep?.days_week) ? 'Yes' : 'No';
                    }
                    const challengestartdate = this.commonDateService.DateTimeFormat(
                        schedule?.['start_date'],
                        'MM-DD-YYYY',
                        'YYYY-MM-DD HH:mm:ss',
                    );
                    const challengeenddate = this.commonDateService.DateTimeFormat(
                        schedule?.['end_date'],
                        'MM-DD-YYYY',
                        'YYYY-MM-DD HH:mm:ss',
                    );
                    const challengeDates = this.commonDateService.getDatesInRange(challengestartdate, challengeenddate);
                    let userAllDateSteps = {};
                    for (const dateKey of challengeDates) {
                        if (userSteps && userSteps[userId] && userSteps[userId][dateKey]) {
                            userAllDateSteps[dateKey] = userSteps[userId][dateKey] || 0;
                        } else {
                            userAllDateSteps[dateKey] = 0;
                        }

                    }
                    let userDetails = user || {};
                    delete userDetails?.password;
                    delete userDetails?.teamSchedule;
                    delete userDetails?.createdAt;
                    delete userDetails?.updatedAt;
                    delete userDetails?.new_password;
                    delete userDetails?.activation_key;
                    let resultData = {
                        user: userDetails,
                        user_id: userId,
                        first_name: user.first_name || '',
                        last_name: user.last_name || '',
                        company_name: user.company?.company_name || '',
                        department_name: user.department?.dept_name || '',
                        team_name: teamName,
                        team_id: teamId,
                        group_id: groupId,
                        group_name: groupName,
                        weekStepsData: weekStepsData[userId] || {},
                        allDateSteps: userAllDateSteps || {},
                        totalSteps: allStepsDataUsers[userId] || 0,
                    };
                    result.push(resultData);
                }
            }
            if (schedule?.team && schedule?.team == 1 && allgetteams) {
                let allUserIdsStr = allUserId && allUserId.length > 0 ? `'${allUserId.join("','")}'` : null;
                let allTeamData = Object.create(null);
                let stepWeekData = Object.create(null);
                if (allUserIdsStr && allUserIdsStr != '') {
                    for (const team of allgetteams) {
                        let totalMember = 0;
                        let tempMember = 0;
                        let totalRealSteps = 0;
                        let teamId = team.id || 0;
                        let teamUserId = [];
                        if (challengeUsers && challengeUsers.length > 0) {
                            for (const user of challengeUsers) {
                                if (user?.teamMember?.team_id == teamId) {
                                    teamUserId.push(user.id);
                                }
                            }
                        }
                        totalMember = teamUserId?.length || 0;
                        for (const userData of allStepsDataUser) {
                            if (teamUserId.includes(userData.user_id)) {
                                if (countUserWithZero.trim() == 'No') {
                                    tempMember = tempMember + 1;
                                    totalMember = tempMember;
                                }
                                totalRealSteps += Number(userData.steps);
                            }
                        }
                        if (individualMeetGoal.trim() == 'no') {
                            if (schedule?.is_nolimit == 1) {
                                if (yardFrequency?.trim() == 'weekly') {
                                    let totalYard = 0;

                                    let complatedStepsWithAllWeeks = 0;
                                    let avrageSteps = 0;
                                    for (const weekStep of stepWeeks) {
                                        let weekStartDate = this.commonDateService.DateTimeFormat(
                                            weekStep?.start_date,
                                            'MM-DD-YYYY',
                                            'YYYY-MM-DD HH:mm:ss',
                                        );
                                        let weekEndDate = this.commonDateService.DateTimeFormat(
                                            weekStep?.end_date,
                                            'MM-DD-YYYY',
                                            'YYYY-MM-DD HH:mm:ss',
                                        );
                                        for (const userId of teamUserId) {
                                            for (const [key, getsteps] of allStepsDataTeam) {
                                                if (getsteps.user_id == userId) {
                                                    const userArr = getsteps.user_id;
                                                    let collectionDate = getsteps.collectionDate;
                                                    collectionDate = this.commonDateService.DateTimeFormat(
                                                        collectionDate,
                                                        'MM-DD-YYYY',
                                                        'YYYY-MM-DD',
                                                    );
                                                    if (collectionDate >= weekStartDate && collectionDate <= weekEndDate) {
                                                        if (stepWeekData[teamId]) {
                                                            stepWeekData[teamId] += Number(getsteps.steps);
                                                        } else {
                                                            stepWeekData[teamId] = Number(getsteps.steps);
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        let completeYard = 0;
                                        if (Object.keys(stepWeekData).length > 0) {
                                            for (const teamId in stepWeekData) {
                                                const completedSteps = stepWeekData[teamId];
                                                complatedStepsWithAllWeeks += completedSteps;
                                                const targetSteps = weekStep.week_steps * weekStep.days_week;
                                                completeYard += Math.floor(completedSteps / targetSteps) * 50;
                                                avrageSteps = Math.round(completedSteps / weekStep.days_week / totalMember) || 0;
                                            }
                                        }
                                        if (completeYard !== 0) {
                                            totalYard += Math.floor(completeYard / 100) * 100;
                                        }
                                    }
                                    let currenttouchdown = 0;
                                    if (totalYard > 0) {
                                        currenttouchdown = Math.floor(totalYard / 100);
                                    }
                                    if (!allTeamData[teamId]) {
                                        allTeamData[teamId] = {
                                            total_yard: totalYard,
                                            total_touchdown: currenttouchdown,
                                            completed_steps: complatedStepsWithAllWeeks,
                                            avrage_steps: avrageSteps,
                                            team_size: team.team_size || 0,
                                            total_team_members: teamUserId.length || 0,
                                            team_name: team.tname || '',
                                            group_name: schedule?.group_status == 1 ? team?.['challengeGroups']?.name || '' : '',
                                            team_id: teamId,
                                            group_id: team?.group_id || 0,
                                        };
                                    }
                                } else {
                                    let totalYard = 0;
                                    let currenttouchdown = 0;
                                    let complatedStepsWithAllWeeks = 0;
                                    let avrageSteps = 0;
                                    for (const userId of teamUserId) {
                                        for (const weekStep of stepWeeks) {
                                            let weekStartDate = this.commonDateService.DateTimeFormat(
                                                weekStep?.start_date,
                                                'MM-DD-YYYY',
                                                'YYYY-MM-DD HH:mm:ss',
                                            );
                                            let weekEndDate = this.commonDateService.DateTimeFormat(
                                                weekStep?.end_date,
                                                'MM-DD-YYYY',
                                                'YYYY-MM-DD HH:mm:ss',
                                            );
                                            const weekDates = this.commonDateService.getDatesInRange(weekStartDate, weekEndDate);
                                            let totalWeekSteps = 0;
                                            for (const dateKey of weekDates) {
                                                if (userSteps?.[userId]?.[dateKey]) {
                                                    totalWeekSteps += Number(userSteps?.[userId]?.[dateKey] || 0);
                                                } else {
                                                    totalWeekSteps += 0;
                                                }
                                            }
                                            complatedStepsWithAllWeeks += totalWeekSteps;
                                            const targetSteps = weekStep.week_steps * teamUserId.length;
                                            totalYard += Math.floor(totalWeekSteps / targetSteps) * 50;
                                            avrageSteps += Math.round(totalWeekSteps / weekStep.days_week / teamUserId.length) || 0;
                                        }
                                    }
                                    if (totalYard > 0) {
                                        currenttouchdown = Math.floor(totalYard / 100);
                                    }
                                    if (!allTeamData[teamId]) {
                                        allTeamData[teamId] = {
                                            total_yard: totalYard,
                                            total_touchdown: currenttouchdown,
                                            completed_steps: complatedStepsWithAllWeeks,
                                            avrage_steps: Math.round(complatedStepsWithAllWeeks / totaldays / totalMember || 0),
                                            team_size: team.team_size || 0,
                                            total_team_members: teamUserId.length || 0,
                                            team_name: team.tname || '',
                                            group_name: schedule?.group_status == 1 ? team?.['challengeGroups']?.name || '' : '',
                                            team_id: teamId,
                                            group_id: team?.group_id || 0,
                                        };
                                    }
                                }
                            } else {
                                let totalYard = 0;
                                let currenttouchdown = 0;
                                let complatedStepsWithAllWeeks = 0;
                                let avrageSteps = 0;
                                for (const getStep of allStepsDataTeam) {
                                    let userId = getStep.user_id;
                                    if (teamUserId.includes(userId)) {
                                        let yardsCount = 0;
                                        let collectionDate = getStep.collectionDate;
                                        collectionDate = this.commonDateService.DateTimeFormat(
                                            collectionDate,
                                            'MM-DD-YYYY',
                                            'YYYY-MM-DD',
                                        );
                                        let dailyAvrageSteps = getStep.steps / totalMember || 0;
                                        avrageSteps += Math.round(dailyAvrageSteps) || 0;
                                        let dailyRealSteps = getStep.steps || 0;
                                        complatedStepsWithAllWeeks += Number(getStep.steps);
                                        if (yardFrequency?.trim() == 'daily') {
                                            if (rankType?.trim() == 'average_steps') {
                                                if (dailyAvrageSteps >= dailySteps) {
                                                    yardsCount = yardsCount + yard;
                                                }
                                            } else {
                                                if (dailyRealSteps >= dailySteps) {
                                                    yardsCount = yardsCount + yard;
                                                }
                                            }
                                        }
                                        totalYard += yardsCount;
                                    }
                                }
                                if (totalYard > 0) {
                                    currenttouchdown = Math.floor(totalYard / 100);
                                }
                                if (!allTeamData[teamId]) {
                                    allTeamData[teamId] = {
                                        total_yard: totalYard,
                                        total_touchdown: currenttouchdown,
                                        completed_steps: complatedStepsWithAllWeeks,
                                        avrage_steps: Math.round(complatedStepsWithAllWeeks / totaldays / totalMember || 0),
                                        team_size: team.team_size || 0,
                                        total_team_members: teamUserId.length || 0,
                                        team_name: team.tname || '',
                                        group_name: schedule?.group_status == 1 ? team?.['challengeGroups']?.name || '' : '',
                                        team_id: teamId,
                                        group_id: team?.group_id || 0,
                                    };
                                }
                            }
                        }
                        else {
                            let totalYards = 0;
                            let currenttouchdown = 0;
                            let totalRealSteps = 0;
                            if (totaldays == 0) {
                                totaldays = 1;
                            }
                            if (tempStepYes && Object.keys(tempStepYes).length > 0) {
                                let yardCheck = 0;
                                let yardsCount = 0;
                                let weekCount = 1;
                                for (let i = 0; i <= totaldays; i++) {
                                    let reached = 0, dailyAvrageSteps = 0;
                                    const datematch = startdate + i;
                                    let dateKey = this.commonDateService.DateTimeFormat(
                                        datematch,
                                        'MM-DD-YYYY',
                                        'timestamp',
                                    );
                                    if (i % 7 == 0) {
                                        if (yardFrequency?.trim() !== 'daily') {
                                            if (yardCheck != 0 && (yardCheck / totalMember) >= dailySteps * 7) {
                                                totalYards = totalYards + yard;
                                            }
                                            yardCheck = 0;
                                            dailySteps = stepWeeks.find(week => week.week_no == weekCount)?.week_steps || 0;
                                            weekCount++;
                                        }
                                    }
                                    if (tempStepYes[dateKey]) {
                                        yardsCount = 0;
                                        for (const userId of teamUserId) {
                                            if (tempStepYes[dateKey][userId]) {
                                                if (tempStepYes[dateKey][userId] >= dailySteps) {
                                                    reached = reached + 1;
                                                }
                                                totalRealSteps += Number(tempStepYes[dateKey][userId]);
                                                yardCheck += Number(tempStepYes[dateKey][userId]);
                                            }
                                        }
                                        if (reached == teamUserId.length) {
                                            if (yardFrequency?.trim() == 'daily') {
                                                yardsCount = yardsCount + yard;
                                            }
                                        }
                                        if (yardFrequency?.trim() == 'daily') {
                                            totalYards += yardsCount;
                                        }
                                    }
                                }
                            }
                            if (totalYards > 0) {
                                currenttouchdown = Math.floor(totalYards / 100);
                            }
                            if (!allTeamData[teamId]) {
                                allTeamData[teamId] = {
                                    total_yard: totalYards,
                                    total_touchdown: currenttouchdown,
                                    completed_steps: totalRealSteps,
                                    avrage_steps: Math.round(totalRealSteps / totaldays / totalMember || 0),
                                    team_size: team.team_size || 0,
                                    total_team_members: teamUserId.length || 0,
                                    team_name: team.tname || '',
                                    group_name: schedule?.group_status == 1 ? team?.['challengeGroups']?.name || '' : '',
                                    team_id: teamId,
                                    group_id: team?.group_id || 0,
                                };
                            }
                        }
                    }
                }
                if (result && result.length > 0) {
                    for (let resultData of result) {
                        let teamId = resultData.team_id;
                        if (allTeamData[teamId]) {
                            resultData['team_details'] = allTeamData[teamId];
                        }
                    }
                }
            }
            return result;
        } catch (error) {
            throw new Error(error);
        }
    }


}
