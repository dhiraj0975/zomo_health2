import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    ScheduleChallengeEntity,
    tableConstant,
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
const moment = require('moment-timezone');

@Injectable()
export class RelayRaceChallengeReportService {
    constructor(
        private readonly commonDateService: CommonDateService,
        private readonly teamsService: TeamsService,
        private readonly commonArrayService: CommonArrayService,
        private readonly weekStepsService: WeekStepsService,
        private readonly activityService: ActivityService,
        private readonly companyService: CompanyService,
        private readonly userChallengeHelperService: UserChallengeHelperService,
        private readonly activityFeedsService: ActivityFeedService,
        private readonly usersService: UserService,
    ) { }

    async relayRaceChallengeReport(
        schedule: Partial<ScheduleChallengeEntity>,
        condition: string = '',
        result_type: number = 1,
        paginateObj: any = null,
        teamCondition: string = '',
        groupCondition: string = '',
    ) {
        try {
            let result: any[] = [];
            let startdate: any = this.commonDateService.DateTimeFormat(schedule?.['start_date'], 'timestamp');
            let startdatedmy: any = this.commonDateService.DateTimeFormat(schedule?.['start_date'], 'YYYY-MM-DD HH:mm:ss');
            let enddate: any = this.commonDateService.DateTimeFormat(schedule?.['end_date'], 'timestamp');
            let enddatedmy: any = this.commonDateService.DateTimeFormat(schedule?.['end_date'], 'YYYY-MM-DD HH:mm:ss');
            let now: any = this.commonDateService.DateTimeFormat('now', 'timestamp');
            if (now >= enddate) {
                now = enddate;
            }
            let totaldays = Math.floor((enddate - startdate) / (60 * 60 * 24)) + 1;
            let actTrackerId = '', stepId = '', walkingId = '', runningId = '', cyclingId = '', swimmingId = '';
            let activities = await this.activityService.activityListRecord(
                {
                    activity_name: In(
                        [
                            'Activity Tracker- Walking', 'Activity Tracker- Running', 'Activity Tracker- Cycling',
                            'Activity Tracker- Swimming', 'Activity Tracker', 'Steps'
                        ]
                    )
                },
                ['id', 'activity_name'],
            )
            actTrackerId = activities?.[0] ? activities?.[0]?.id?.toString() : '';
            stepId = activities?.[1] ? activities?.[1]?.id?.toString() : '';
            walkingId = activities?.[2] ? activities?.[2]?.id?.toString() : '';
            runningId = activities?.[3] ? activities?.[3]?.id?.toString() : '';
            cyclingId = activities?.[4] ? activities?.[4]?.id?.toString() : '';
            swimmingId = activities?.[5] ? activities?.[5]?.id?.toString() : '';
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
            let dailyMaxStepsCnt = Number(schedule?.dailymaxstepscnt) || 0;
            let countStepsWith = schedule?.countstepswith || '';
            let logType = " AND food.logType IN ('Tracker','Manual')";
            if (countStepsWith == 'realstep') {
                logType = " AND food.logType = 'Tracker'";
            }
            let stepsWhere: string = `food.collectionDate BETWEEN '${startdatedmy}' AND '${enddatedmy}' ${logType}`;
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
            if (allgetteams) {
                if (result_type === 1) {
                    challengeUsers = await this.usersService.challengeReportPaginate(
                        `${condition} ${teamCondition != '' ? ' AND ' + teamCondition : ''} ${groupCondition != '' ? ' AND ' + groupCondition : ''}`,
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
                            'teamMember.baton_status',
                            'teamMember.baton_start',
                            'teamMember.user_order',
                            'teamMember.iscaptain',
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
                            'teamMember.baton_status',
                            'teamMember.baton_start',
                            'teamMember.user_order',
                            'teamMember.iscaptain',
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
            if ((result_type === 1 && challengeUsers?.list && challengeUsers.list.length > 0) || (result_type === 2 && challengeUsers && challengeUsers.length > 0)) {
                let allStepsDataUsers = {};
                let stepUsers = {};
                let userSteps = {};
                let tempStepYes = {};
                let allStepsDataTeam, allStepsDataUser;
                let teamTotalSteps = {};
                let teamMemberMetGoal = {};
                let teamRemainingSteps = {};
                let groupTotalSteps = {};
                let teamrealTotalSteps = {};
                let grouprealTotalSteps = {};
                let teamMemberCount = {};
                let groupTeamCount = {};
                let teamTimeElapsed = {};
                let teamCaptains = {};
                let totalPercent = 0;
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
                        let userTotalSteps = 0;
                        let userrealTotalSteps = 0;
                        let percent = 0;
                        if (schedule?.race_type == 3) {
                            let timeElapsed = schedule?.time_elapsed || 0;
                            if (timeElapsed == 0) {
                                timeElapsed = 1;
                            }
                            if (user && user.teamMember && (user.teamMember.baton_status == 2 || user.teamMember.baton_status == 3)) {
                                let endTime = moment(user?.teamMember?.baton_start, 'YYYY-MM-DD HH:mm:ss')
                                    .add(timeElapsed, 'minutes')
                                    .format('YYYY-MM-DD HH:mm:ss');
                                let where = ` DATE_FORMAT(CONCAT(DATE_FORMAT(food.collectionDate, '%Y-%m-%d' ),' ', DATE_FORMAT(food.timestamp, '%H:%i:%s')),'%Y-%m-%d %H:%i:%s') BETWEEN '${this.commonDateService.DateTimeFormat(user?.teamMember?.baton_start, 'YYYY-MM-DD HH:mm:ss')}'  AND '${endTime}' ${logType}`;
                                let newAllStepsDataUser = await this.activityFeedsService.listRecord(
                                    `food.user_id IN (${userId}) AND (food.activityTypeId IN ${findAll} OR food.appName='AppleHealthKit' OR food.appName='GoogleFit' OR food.appName='User Entry') AND ${where}`,
                                    { 'food.collectionDate': 'DESC' },
                                    [`SUM(steps) as steps`, 'user_id', 'collectionDate'],
                                    'food.user_id',
                                );
                                if (newAllStepsDataUser && newAllStepsDataUser.length > 0) {
                                    userTotalSteps = Number(newAllStepsDataUser?.[0]?.steps) || 0;
                                    userrealTotalSteps = Number(newAllStepsDataUser?.[0]?.steps) || 0;
                                }
                            } else {
                                userTotalSteps = 0;
                            }
                            if (dailyMaxStepsCnt && dailyMaxStepsCnt > 0) {
                                let upDailyMaxStepsCnt = dailyMaxStepsCnt * totaldays;
                                if (userTotalSteps > upDailyMaxStepsCnt) {
                                    userTotalSteps = upDailyMaxStepsCnt;
                                }
                                userTotalSteps = userTotalSteps;
                            }
                        }
                        else {
                            if (allStepsDataUsers[userId]) {
                                userTotalSteps = Number(allStepsDataUsers[userId]) || 0;
                                userrealTotalSteps = Number(allStepsDataUsers[userId]) || 0;
                            } else {
                                userTotalSteps = 0;
                                userrealTotalSteps = 0;
                            }
                        }
                        if (teamId) {
                            if (!teamTotalSteps[teamId]) {
                                teamTotalSteps[teamId] = 0;
                            }
                            if (!teamrealTotalSteps[teamId]) {
                                teamrealTotalSteps[teamId] = 0;
                            }
                            teamTotalSteps[teamId] = teamTotalSteps[teamId] ? teamTotalSteps[teamId] + userTotalSteps : userTotalSteps;
                            teamrealTotalSteps[teamId] = teamrealTotalSteps[teamId] ? teamrealTotalSteps[teamId] + userrealTotalSteps : userrealTotalSteps;
                            let remainingSteps = 0;
                            remainingSteps = dailySteps - userTotalSteps;
                            if (remainingSteps < 0) {
                                remainingSteps = 0;
                            }
                            teamRemainingSteps[teamId] = teamRemainingSteps[teamId] ? teamRemainingSteps[teamId] + remainingSteps : remainingSteps;
                            if (groupId) {
                                if (!groupTotalSteps[groupId]) {
                                    groupTotalSteps[groupId] = 0;
                                }
                                if (!grouprealTotalSteps[groupId]) {
                                    grouprealTotalSteps[groupId] = 0;
                                }
                            }
                            if(!teamCaptains[teamId]){
                                teamCaptains[teamId] = user.teamMember?.iscaptain == 1 ? (user.first_name + ' ' + user.last_name) : '';
                            }
                        }
                        let avrageSteps = 0;
                        let realAvrageSteps = 0;
                        if (userTotalSteps > 0) {
                            avrageSteps = Math.round(userTotalSteps / totaldays);
                        }
                        if (userrealTotalSteps > 0) {
                            realAvrageSteps = Math.round(userrealTotalSteps / totaldays);
                        }
                        let teamUserOrder = user?.teamMember?.user_order || 0;
                        if (teamId) {
                            if (!teamMemberCount[teamId]) {
                                teamMemberCount[teamId] = 0;
                            }
                            teamMemberCount[teamId]++;
                        }
                        if (groupId) {
                            if (!groupTeamCount[groupId]) {
                                groupTeamCount[groupId] = 0;
                            }
                            groupTeamCount[groupId]++;
                        }
                        let userCompleteTime = 0;
                        let minuteDiff = 0;
                        let currentTime = 0;
                        if (schedule?.race_type == 3) {
                            if (user.teamMember?.baton_status == 2) {
                                let time1 = moment(user?.teamMember?.baton_start, 'YYYY-MM-DD HH:mm:ss')
                                let time2 = moment();
                                let different = moment.duration(time2.diff(time1));
                                minuteDiff = different.asMinutes();
                                currentTime = minuteDiff
                                if (minuteDiff > schedule?.time_elapsed) {
                                    currentTime = schedule?.time_elapsed;
                                }
                            }
                            if (user.teamMember?.baton_status == 3) {
                                minuteDiff = schedule?.time_elapsed || 0;
                                currentTime = schedule?.time_elapsed || 0;
                            }
                            userCompleteTime = currentTime;
                        }
                        if (teamTimeElapsed[teamId] === undefined) {
                            teamTimeElapsed[teamId] = 0;
                        }
                        teamTimeElapsed[teamId] = teamTimeElapsed[teamId] + userCompleteTime;
                        if (user.teamMember?.baton_status == 3) {
                            if (teamMemberMetGoal[teamId] === undefined) {
                                teamMemberMetGoal[teamId] = 0;
                            }
                            teamMemberMetGoal[teamId] = (teamMemberMetGoal[teamId] || 0) + 1;
                        }
                        if (schedule?.race_type == 3) {
                            let timeElapsed = schedule?.time_elapsed || 0;
                            if (timeElapsed == 0) {
                                timeElapsed = 1;
                            }
                            percent = (minuteDiff * 100) / (timeElapsed || 1);
                        } else {
                            if (userTotalSteps > 0) {
                                percent = Number(Math.floor((userTotalSteps / (dailySteps || 1)) * 100).toFixed(2));
                            }
                        }
                        percent = this.commonArrayService.verifyPercentage(percent);
                        totalPercent += percent;
                        if (result_type == 1) {
                            let resultData = {
                                user_id: userId,
                                first_name: user.first_name || '',
                                last_name: user.last_name || '',
                                company_name: user.company?.company_name || '',
                                department_name: user.department?.dept_name || '',
                                employee_id: user?.employeeid || '',
                                percent: percent?.toFixed(2) + '%',
                                team_name: teamName,
                                team_id: teamId,
                                group_id: groupId,
                                group_name: groupName,
                                totalSteps: userTotalSteps || 0,
                                totalRealSteps: userrealTotalSteps || 0,
                                avrageSteps: avrageSteps || 0,
                                realAvrageSteps: realAvrageSteps || 0,
                                user_order: teamUserOrder,
                                user_complete_time: userCompleteTime || 0,
                            };
                            result.push(resultData);
                        } else {
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
                                totalSteps: userTotalSteps || 0,
                                totalRealSteps: userrealTotalSteps || 0,
                                avrageSteps: avrageSteps || 0,
                                realAvrageSteps: realAvrageSteps || 0,
                                percent: percent?.toFixed(2) + '%',
                                user_order: teamUserOrder,
                                user_complete_time: userCompleteTime || 0,
                            };
                            result.push(resultData);
                        }
                    }
                }
                if (result && result.length > 0) {
                    result = result.sort((a, b) => {
                        // if (a.team_id !== b.team_id) {
                        //     return a.team_id - b.team_id;
                        // }
                        if (a?.['totalSteps'] == b?.['totalSteps']) {
                            return a?.['user_order'] - b?.['user_order'];
                        }
                        return b?.['totalSteps'] - a?.['totalSteps'];
                    });
                    let rank = 1;
                    if (result_type == 1) {
                        rank =
                            ((paginateObj?.page || 1) - 1) *
                            appConstant.RECORD_PER_PAGE +
                            1;
                    }
                    result.forEach((item) => {
                        if(teamCaptains[item['team_id']] && teamCaptains[item['team_id']] != ''){
                            item['team_captain'] = teamCaptains[item['team_id']] || '';
                        }
                        if (!item['rank']) {
                            item['rank'] = 0;
                        }
                        item['rank'] = rank++;
                    });
                }
                if (result_type == 1) {
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

                let teamDetails = Object.create(null);
                let groupDetails = Object.create(null);
                for (const team of allgetteams) {
                    let teamId = team.id;
                    let totalCompletedStepsTeam = teamTotalSteps?.[teamId] || 0;
                    let teamSize = team.team_size || 0;
                    let teamMember = teamMemberCount?.[teamId] || 0;
                    let teamName = team.tname || '';
                    let companyName = result?.find(user => user.team_id == teamId)?.company_name || result[0]?.company_name || '';
                    let teamAvgSteps = 0;
                    let teamGoal = 0;
                    let teamTime = '';
                    let teamTotalRealSteps = teamTotalSteps?.[teamId] || 0;
                    let teamProgress = 0;
                    let teamPercent = 0;
                    let teamMemberMetGoalCount = teamMemberMetGoal?.[teamId] || 0;
                    let teamCaptainsName = teamCaptains?.[teamId] || '';
                    if (schedule?.race_type == 1) {
                        if (teamMemberCount?.[teamId] > 0) {
                            teamGoal = dailySteps * teamMemberCount?.[teamId];
                        } else {
                            teamGoal = dailySteps;
                        }
                    } else if (schedule?.race_type == 2) {
                        let totSteps = 0;
                        if (teamMemberCount?.[teamId] > 0) {
                            totSteps = Math.ceil(dailySteps / teamMemberCount?.[teamId]);
                        }
                        teamGoal = totSteps * teamMemberCount?.[teamId];
                    }
                    else if (schedule?.race_type == 3) {
                        teamGoal = 0;
                    }
                    let devider = teamGoal > 0 ? teamGoal : 1;
                    if (schedule?.race_type != 3) {
                        teamProgress = ((totalCompletedStepsTeam / devider) * 100) || 0;
                    } else {
                        let tempDevider = schedule?.time_elapsed / teamMemberCount?.[teamId];
                        tempDevider = tempDevider > 0 ? tempDevider : 1;
                        teamProgress = ((teamTimeElapsed?.[teamId] / (tempDevider || 1)) * 100) || 0;
                    }
                    teamProgress = this.commonArrayService.verifyPercentage(teamProgress);
                    teamPercent = result?.filter(user => user.team_id == teamId).reduce((acc, user) => {
                        let userPercent = parseFloat(user.percent) || 0;
                        return acc + userPercent;
                    }, 0);
                    teamPercent = teamPercent / (teamMemberCount?.[teamId] || 1);
                    teamPercent = this.commonArrayService.verifyPercentage(teamPercent);
                    if (schedule?.race_type == 3) {
                        teamTime = teamTimeElapsed?.[teamId] || 0;
                    }
                    let allTotalStepsTeam = 0;
                    if (schedule?.rank_type == 'average_steps') {
                        allTotalStepsTeam = teamTotalSteps?.[teamId] + teamRemainingSteps?.[teamId];
                    } else {
                        allTotalStepsTeam = dailySteps * teamMemberCount?.[teamId];
                    }
                    if (allTotalStepsTeam > 0 && teamMemberCount?.[teamId] > 0) {
                        // teamProgress = ((teamTotalSteps?.[teamId] || 0) / (teamMemberCount?.[teamId] * dailySteps) <= 0 ? 1 : (teamMemberCount?.[teamId] * dailySteps)) * 100;
                        teamAvgSteps = Math.round((totalCompletedStepsTeam / teamMemberCount?.[teamId]) / totaldays) || 0;
                    }
                    if (schedule?.race_type == 3) {
                        let teamComSteps = 0;
                        if (teamMemberCount?.[teamId] > 0) {
                            teamComSteps = (teamTotalSteps?.[teamId] || 0);
                        }
                        teamAvgSteps = Math.floor((teamComSteps / teamMemberCount?.[teamId]) / totaldays) || 0;
                    } else {
                        teamAvgSteps = Math.floor((totalCompletedStepsTeam / teamMemberCount?.[teamId]) / totaldays) || 0;
                    }
                    // teamProgress = this.commonArrayService.verifyPercentage(teamProgress);
                    teamDetails[teamId] = {
                        team_id: teamId,
                        team_name: teamName,
                        company_name: companyName,
                        team_avg_steps: teamAvgSteps,
                        team_goal: teamGoal,
                        team_time: teamTime,
                        team_total_real_steps: teamTotalRealSteps,
                        team_progress: teamPercent,
                        // team_progress: teamProgress,
                        team_member_met_goal_count: teamMemberMetGoalCount,
                        team_size: teamSize,
                        team_member_count: teamMember,
                        team_captain: teamCaptainsName,
                        group_id: team?.group_id || 0,
                        group_name: team?.['challengeGroups']?.name || '',
                    };
                }
                if ( schedule?.group_status == 1) {
                    for (const team of teamDetails) {
                        let groupId = teamDetails[team]?.group_id;
                        let groupName = teamDetails[team]?.group_name;
                        let groupTeamCounts = groupTeamCount?.[groupId] || 0;
                        let groupTotalStepsCount = groupTotalSteps?.[groupId] || 0;
                        let groupAvrageStepsCount = groupTotalStepsCount / (groupTeamCounts || 1);
                        if (!groupDetails[groupId]) {
                            groupDetails[groupId] = {
                                group_id: groupId,
                                group_name: groupName,
                                group_total_steps: 0,
                                group_avrage_steps: 0,
                                group_team_count: 0,
                                group_average_steps : groupAvrageStepsCount,
                                company_name: team?.company_name || '',
                            };
                        }
                    }
                }
                if (result && result.length > 0) {
                    let finalResult = Object.create(null);
                    for (let resultData of result) {
                        let teamId = resultData.team_id;
                        if (teamDetails[teamId]) {
                            resultData['team_details'] = teamDetails[teamId];
                        }
                    }
                    finalResult['userDetails'] = result;
                    let nonUserTeamId = [];
                    for (const team of allgetteams) {
                        let teamId = team.id;
                        if (!result.find(user => user.team_id == teamId)) {
                            nonUserTeamId.push(teamId);
                        }   
                    }
                    finalResult['nonUserteamDetails'] = Object.values(teamDetails)?.filter((teamIdKey) => nonUserTeamId.includes(teamIdKey?.['team_id']));
                    finalResult['allteamDetails'] = teamDetails;
                    finalResult['allGroupDetails'] = groupDetails;
                    result = finalResult;
                }
            }
            return result;
        } catch (error) {
            throw new Error(error);
        }
    }
}
