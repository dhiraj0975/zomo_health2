import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    ScheduleChallengeEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { UserService } from 'src/module/user/user.service';
import { ScheduleChallengeJoinUsersService } from '../schedule-challenge-join-users/schedule-challenge-join-users.service';
import { TeamsService } from '../team/teams.service';
import { UserChallengeHelperService } from '../userChallengeHelper.service';
const moment = require('moment-timezone');

@Injectable()
export class SleepChallengeReportService {
    constructor(
        private readonly commonDateService: CommonDateService,
        private readonly teamsService: TeamsService,
        private readonly userService: UserService,
        private readonly userChallengeHelperService: UserChallengeHelperService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly commonArrayService: CommonArrayService,
    ) { }

    async sleepChallengeReport(
        schedule: Partial<ScheduleChallengeEntity>,
        condition: string = '',
        result_type: number = 1,
        paginateObj: { page: number; limit: number } = null,
        teamCondition: string = '',
        groupCondition: string = '',
    ) {
        try {
            let activityId: string = "('19')";
            let totalUsersJoined = 0;
            let hourTrans = 'Hr';
            let minuteTrans = 'Min';
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
            let uptodays = Math.floor((now - startdate) / (60 * 60 * 24)) + 1;
            if (uptodays === 0) {
                uptodays = 1;
            }
            let perDaySleepMin: number = 0;
            let sleepwhere: string = `food.collectionDate BETWEEN '${startdatedmy}' AND '${enddatedmy}'`;
            let perDaySleep: number =
                Number(schedule?.['ch']?.numberofsteps) || 0;
            if (schedule?.numberofsteps && schedule?.numberofsteps > 0) {
                perDaySleep = schedule?.numberofsteps;
                perDaySleepMin = schedule?.dailymaxstepscnt;
            }
            let ozMeetRequireDay: number = schedule?.oz_meet_require_day || 15;
            // in old system use requireTotalSleep = perDaySleep * totaldays
            let requireTotalSleepHr: number = perDaySleep * ozMeetRequireDay;
            let requireTotalSleepMin: number =
                perDaySleepMin * ozMeetRequireDay;
            let requireTotalSleep: number =
                requireTotalSleepHr * 60 + requireTotalSleepMin;
            if (schedule?.is_oz_meet_require_day != 1) {
                requireTotalSleepHr = perDaySleep * totaldays;
                requireTotalSleepMin = perDaySleepMin * totaldays;
                requireTotalSleep = requireTotalSleepHr * 60 + requireTotalSleepMin;
            }
            let requireFullTime = this.commonDateService.hour_minutes(
                requireTotalSleepHr,
                requireTotalSleepMin,
            );
            let requireFullTimeText = `${requireFullTime?.hour} ${hourTrans} ${requireFullTime?.min} ${minuteTrans}`;
            let dailyRequiredTimes = 0;
            let result: object[] = [];
            if (perDaySleep !== 0) {
                dailyRequiredTimes = perDaySleep * 60 + perDaySleepMin;
            }
            let getUser: any;
            let allgetteams: any;
            if (schedule['team'] == 1) {
                if (result_type === 1) {
                    //Rank Wise user pagination
                    // calculation for pagination of user rank wise collecting user ids and then apply in where condition
                    const pagedUserIdsFind = await this.getRankedPagedUserIds(
                        schedule?.id,
                        activityId,
                        sleepwhere,
                        dailyRequiredTimes,
                        paginateObj,
                        teamCondition,
                        groupCondition,
                        schedule?.org_id,
                        true,
                        condition
                    );
                    totalUsersJoined = pagedUserIdsFind.totalUserCount || 0;
                    let pagedUserIds = pagedUserIdsFind.usersIds || [];
                    let where = ` AND User.id IN (${pagedUserIds.length > 0 ? pagedUserIds.join(',') : 0})`;
                    //Rank Wise user pagination
                    allgetteams = await this.teamsService.getTeamAllReport(
                        `team.org_id = ${schedule?.org_id} AND scj.schedule_id = ${schedule?.id} ${teamCondition != '' ? ' AND ' + teamCondition : ''} ${groupCondition != '' ? ' AND ' + groupCondition : ''}`,
                        [
                            'team.id',
                            'team.tname',
                            'team.group_id',
                            'teamSchedule.id',
                            'challengeGroups.id',
                            'challengeGroups.name',
                        ],
                    );
                    getUser = await this.userService.challengeReportPaginate(
                        `${condition}${where} AND User.org_id = ${schedule?.org_id} ${teamCondition != '' ? ' AND ' + teamCondition : ''} ${groupCondition != '' ? ' AND ' + groupCondition : ''}`,
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
                    );
                } else {
                    allgetteams = await this.teamsService.getTeamAllReport(
                        `team.org_id = ${schedule?.org_id} AND scj.schedule_id = ${schedule?.id} ${teamCondition != '' ? ' AND ' + teamCondition : ''} ${groupCondition != '' ? ' AND ' + groupCondition : ''}`,
                        [
                            'team.id',
                            'team.tname',
                            'team.group_id',
                            'teamSchedule.id',
                            'challengeGroups.id',
                            'challengeGroups.name',
                        ],
                    );
                    getUser = await this.userService.challengeReportPaginate(
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
                    );
                }
            } else {
                if (result_type === 1) {
                    const pagedUserIdsFind = await this.getRankedPagedUserIds(
                        schedule?.id,
                        activityId,
                        sleepwhere,
                        dailyRequiredTimes,
                        paginateObj,
                        teamCondition,
                        groupCondition,
                        schedule?.org_id,
                        false,
                        condition
                    );
                    totalUsersJoined = pagedUserIdsFind.totalUserCount || 0;
                    let pagedUserIds = pagedUserIdsFind.usersIds || [];
                    let where = ` AND User.id IN (${pagedUserIds.length > 0 ? pagedUserIds.join(',') : 0})`;
                    getUser = await this.userService.challengeReportPaginate(
                        `${condition}${where} AND User.org_id = ${schedule?.org_id}`,
                        null,
                        [
                            'User',
                            'Location',
                            'department.id',
                            'department.dept_name',
                            'company.id',
                            'company.company_name',
                            'companySetting.spouse_option',
                        ],
                    );
                } else {
                    getUser = await this.userService.challengeReportPaginate(
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
                        ],
                    );
                }
            }
            let userSleepData = {};
            for (const user of getUser) {
                let userId = user.id;
                let sleepdata =
                    await this.userChallengeHelperService.fetch_point_steps(
                        tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS,
                        [
                            'SUM(water) as water',
                            'SUM(amount) as amount',
                            'food.collectionDate',
                        ],
                        'user_id',
                        'activityTypeId',
                        activityId,
                        sleepwhere,
                        userId,
                        'food.collectionDate',
                    );
                if (sleepdata && sleepdata?.length > 0) {
                    let updatedSleepData = await Promise.all(
                        sleepdata.map(async (w) => {
                            let collectionDate =
                                this.commonDateService.DateTimeFormat(
                                    w.food_collectionDate,
                                    'YYYY-MM-DD',
                                );
                            let tmpSleepHour = w.water;
                            let tmpSleepMin = w.amount;
                            w.food_collectionDate = collectionDate;
                            let time = this.commonDateService.hour_minutes(
                                tmpSleepHour,
                                tmpSleepMin,
                            );
                            w.water =
                                time.hour +
                                ' ' +
                                hourTrans +
                                ' ' +
                                time.min +
                                ' ' +
                                minuteTrans;
                            delete w.amount;
                            w.totalSleepHr = time.hour;
                            w.totalSleepMin = time.min;
                            w.totalSleep = time.hour * 60 + time.min;
                            let monthName = this.commonDateService
                                .getTodayDate()
                                .format('MMM');
                            if (collectionDate && collectionDate != '') {
                                monthName =
                                    moment(collectionDate).format('MMM');
                            }
                            w.collectionDate_Trans = collectionDate =
                                monthName +
                                ' ' +
                                moment(collectionDate).format('D, YYYY');
                            return w;
                        }),
                    );
                    const uniqueDates = new Set(
                        updatedSleepData.map(
                            (item) => item.food_collectionDate,
                        ),
                    );
                    const AllLogdays = uniqueDates.size || 0;
                    userSleepData[userId] = {
                        sleepdata: updatedSleepData,
                        AllLogdays,
                    };
                } else {
                    userSleepData[userId] = {
                        sleepdata: [],
                        AllLogdays: 0,
                    };
                }
            }
            for (const user of getUser) {
                let userId = user.id;
                let percent = 0;
                let totalSleep = 0;
                let totalSleepHr = 0;
                let totalSleepMin = 0;
                let dayLog = 0;
                let AllLogDay = 0;
                let totalSleepText = '';
                let completed = 'NO';
                if (userSleepData[String(userId)]) {
                    let sleepData =
                        userSleepData?.[String(userId)]?.sleepdata || [];
                    let tempCompletedDay = 0;
                    AllLogDay =
                        userSleepData?.[String(userId)]?.AllLogdays || 0;
                    for (const data of sleepData) {
                        if (data?.totalSleep >= dailyRequiredTimes) {
                            tempCompletedDay++;
                        }
                        totalSleep += data?.totalSleep || 0;
                        totalSleepHr += data?.totalSleepHr || 0;
                        totalSleepMin += data?.totalSleepMin || 0;
                    }
                    dayLog = tempCompletedDay;
                }
                if (totalSleepMin >= 60) {
                    let addHour = Math.floor(totalSleepMin / 60);
                    totalSleepHr += addHour;
                    totalSleepMin = totalSleepMin - addHour * 60;
                }
                let teamName = '';
                let groupName = '';
                let groupId = '';
                let teamId = '';
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
                                groupName = team?.challengeGroups?.name || '';
                            }
                        }
                    }
                }
                if (schedule?.is_oz_meet_require_day != 1) {
                    if (totalSleep != 0 && requireTotalSleep != 0) {
                        percent = Number(((totalSleep / requireTotalSleep) * 100 || 0).toFixed(2));
                    }
                } else {
                    if (
                        dailyRequiredTimes != 0 &&
                        requireTotalSleep != 0 &&
                        AllLogDay > 0 &&
                        totalSleep > 0
                    ) {
                        // in old system they counting ((completed days / ozMeetRequireDay) * 100) its wrong because its not count (< required hours).
                        // Now Changed total water for calculation now as per boss requirement i changed as old system
                        // let temp = totalSleep > dailyRequiredTimes * AllLogDay ? dailyRequiredTimes * AllLogDay : totalSleep;
                        // percent = Number(((temp / (dailyRequiredTimes * ozMeetRequireDay)) * 100 || 0).toFixed(2));
                        percent = Number(((dayLog / ozMeetRequireDay) * 100 || 0)?.toFixed(2));
                    }
                }
                percent = this.commonArrayService.verifyPercentage(percent);
                if (percent >= 100) {
                    completed = 'YES';
                }
                let remaingsleep = requireTotalSleep - totalSleep;
                if (remaingsleep < 0) {
                    remaingsleep = 0;
                }
                let remaingsleepHr = Math.floor(remaingsleep / 60);
                let remaingsleepMin = remaingsleep % 60;
                let remaingsleepText = `${remaingsleepHr} ${hourTrans} ${remaingsleepMin} ${minuteTrans}`;
                totalSleepText = `${totalSleepHr} ${hourTrans} ${totalSleepMin} ${minuteTrans}`;
                if (result_type == 1) {
                    let resultData = {
                        user_id: userId,
                        user_code: user?.code || '',
                        first_name: user.first_name || '',
                        last_name: user.last_name || '',
                        company_name: user.company?.company_name || '',
                        department_name: user.department?.dept_name || '',
                        employee_id: user?.employeeid || '',
                        total_sleep: totalSleep,
                        total_sleep_text: totalSleepText,
                        total_sleep_hr: totalSleepHr,
                        total_sleep_min: totalSleepMin,
                        required_sleep: requireTotalSleep,
                        required_sleep_text: requireFullTimeText,
                        required_sleep_hr: requireFullTime?.hour,
                        required_sleep_min: requireFullTime?.min,
                        percent: percent,
                        day_log: dayLog,
                        all_log_days: AllLogDay,
                        remaing_sleep_text: remaingsleepText,
                        remaing_sleep_hr: remaingsleepHr,
                        remaing_sleep_min: remaingsleepMin,
                        completed: completed,
                        team_name: teamName,
                        group_id: groupId,
                        group_name: groupName,
                        team_id: teamId,
                    };
                    result.push(resultData);
                } else {
                    let userDetails = user || {};
                    delete userDetails?.password;
                    delete userDetails?.teamSchedule;
                    delete userDetails?.createdAt;
                    delete userDetails?.updatedAt;
                    let resultData = {
                        user: userDetails,
                        user_id: userId,
                        user_code: user?.code || '',
                        first_name: user.first_name || '',
                        last_name: user.last_name || '',
                        company_name: user.company?.company_name || '',
                        department_name: user.department?.dept_name || '',
                        total_sleep: totalSleep,
                        total_sleep_text: totalSleepText,
                        total_sleep_hr: totalSleepHr,
                        total_sleep_min: totalSleepMin,
                        required_sleep: requireTotalSleep,
                        required_sleep_text: requireFullTimeText,
                        required_sleep_hr: requireFullTime?.hour,
                        required_sleep_min: requireFullTime?.min,
                        percent: percent,
                        day_log: dayLog,
                        all_log_days: AllLogDay,
                        remaing_sleep_text: remaingsleepText,
                        remaing_sleep_hr: remaingsleepHr,
                        remaing_sleep_min: remaingsleepMin,
                        completed: completed,
                        team_name: teamName,
                        team_id: teamId,
                        group_id: groupId,
                        group_name: groupName,
                    };
                    result.push(resultData);
                }
            }
            if (result && result.length > 0) {
                result = result.sort((a, b) => {
                    const percentDiff = (b?.['percent'] ?? 0) - (a?.['percent'] ?? 0);
                    if (percentDiff !== 0) {
                        return percentDiff;
                    }
                    const daylogDiff = (b?.['day_log'] ?? 0) - (a?.['day_log'] ?? 0);
                    if (daylogDiff !== 0) {
                        return daylogDiff;
                    }
                    const totalSleepDiff = (b?.['total_sleep'] ?? 0) - (a?.['total_sleep'] ?? 0);
                    if (totalSleepDiff !== 0) {
                        return totalSleepDiff;
                    }
                    return (b?.['user_code'] ?? 0) - (a?.['user_code'] ?? 0);
                });
                let rank = 1;
                if (result_type == 1) {
                    rank =
                        ((paginateObj?.page || 1) - 1) *
                        (paginateObj?.limit || appConstant.RECORD_PER_PAGE) +
                        1;
                }
                result.forEach((item) => {
                    if (!item['rank']) {
                        item['rank'] = 0;
                    }
                    item['rank'] = rank;
                    rank++;
                });
            }
            if (result_type == 1) {
                const finalPaginateObj =
                    this.commonArrayService.getPaginationVar(
                        paginateObj?.page || 1,
                        paginateObj?.limit || 10,
                    );
                let total = result?.length || 0;
                let resultDetails = this.commonArrayService.paginationResponse(
                    result,
                    total,
                    finalPaginateObj,
                );
                return resultDetails;
            } else {
                return result;
            }
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async getRankedPagedUserIds(
        scheduleId: number,
        activityId: string,
        sleepwhere: string,
        dailyRequiredTimes: number,
        paginateObj: { page: number; limit: number } = null,
        teamCondition: string = '',
        groupCondition: string = '',
        orgId: number,
        isTeam: boolean = false,
        condition: string = '',
    ): Promise<{ totalUserCount: number; usersIds: number[] }> {
        const challengeJoinUsers = await this.scheduleChallengeJoinUsersService.joinUserListRecord(
            `${condition} ${teamCondition ? ' AND ' + teamCondition : ''} ${groupCondition ? ' AND ' + groupCondition : ''}`,
            null,
            ['scj.id', 'scj.user_id'],
            isTeam ? [tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS] : [],
        );
        const userIds = challengeJoinUsers.map((ele: any) => ele.user_id);
        const tempUsersleepData: { [key: string]: any } = {};
        for (const userId of userIds) {
            const userSleep = await this.userChallengeHelperService.fetch_point_steps(
                tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS,
                [
                    'SUM(water) as water',
                    'SUM(amount) as amount',
                    'food.collectionDate',
                ],
                'user_id',
                'activityTypeId',
                activityId,
                sleepwhere,
                userId,
                'food.collectionDate',
            );
            if (userSleep && userSleep.length > 0) {
                const updatedSleepData = await Promise.all(
                    userSleep.map(async (w: any) => {
                        const collectionDate = this.commonDateService.DateTimeFormat(
                            w.food_collectionDate,
                            'YYYY-MM-DD',
                        );
                        const tmpSleepHour = w.water;
                        const tmpSleepMin = w.amount;
                        w.food_collectionDate = collectionDate;
                        const time = this.commonDateService.hour_minutes(
                            tmpSleepHour,
                            tmpSleepMin,
                        );
                        w.totalSleep = time.hour * 60 + time.min;
                        let monthName = this.commonDateService.getTodayDate().format('MMM');
                        if (collectionDate) {
                            monthName = moment(collectionDate).format('MMM');
                        }
                        w.collectionDate_Trans = `${monthName} ${moment(collectionDate).format('D, YYYY')}`;
                        return w;
                    }),
                );
                const uniqueDates = new Set(updatedSleepData.map((item: any) => item.food_collectionDate));
                const AllLogdays = uniqueDates.size || 0;
                tempUsersleepData[userId] = {
                    sleepdata: updatedSleepData,
                    AllLogdays,
                };
            } else {
                tempUsersleepData[userId] = {
                    sleepdata: [],
                    AllLogdays: 0,
                };
            }
        }
        const userRankMetrics: { userId: number; completedDays: number; totalSleep: number }[] = [];
        for (const userId of userIds) {
            const userData = tempUsersleepData[String(userId)];
            let completedDays = 0;
            let totalSleep = 0;
            if (userData) {
                const sleepData = userData.sleepdata || [];
                for (const data of sleepData) {
                    if (data?.totalSleep >= dailyRequiredTimes) {
                        completedDays++;
                    }
                    totalSleep += data?.totalSleep || 0;
                }
            }
            userRankMetrics.push({
                userId: Number(userId),
                completedDays,
                totalSleep,
            });
        }
        const sortedUserIds = userRankMetrics
            .slice()
            .sort((a, b) => {
                if (b.completedDays !== a.completedDays) {
                    return b.completedDays - a.completedDays;
                }
                return (b.totalSleep ?? 0) - (a.totalSleep ?? 0);
            })
            .map(r => r.userId);
        const remainingUserIds = userIds.filter((id: number) => !sortedUserIds.includes(id));
        const combinedUserIds = [...sortedUserIds, ...remainingUserIds];
        const page = Number(paginateObj?.page) > 0 ? Number(paginateObj?.page) : 1;
        const take = Number(paginateObj?.limit) > 0 ? Number(paginateObj?.limit) : appConstant.RECORD_PER_PAGE;
        const skip = (page - 1) * take;
        const pagedUserIds = combinedUserIds.slice(skip, skip + take);
        return {
            totalUserCount: combinedUserIds.length,
            usersIds: pagedUserIds,
        };
    }
}
