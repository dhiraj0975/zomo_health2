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
export class HydrateChallengeReportService {
    constructor(
        private readonly commonDateService: CommonDateService,
        private readonly userChallengeHelperService: UserChallengeHelperService,
        private readonly teamsService: TeamsService,
        private readonly userService: UserService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly commonArrayService: CommonArrayService,
    ) { }

    async hydrateChallengeReport(
        schedule: Partial<ScheduleChallengeEntity>,
        condition: string = '',
        result_type: number = 1,
        paginateObj: any = null,
        teamCondition: string = '',
        groupCondition: string = '',
    ) {
        try {
            let challengeactivityId = schedule?.['ch']?.activity_id || null;
            let totalUsersJoined = 0;
            let activityId: string = !challengeactivityId
                ? '(NULL)'
                : `('${challengeactivityId}')`;
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
            let ozTrans = 'Oz';
            let perDayWater = schedule?.['ch']?.oz_water_per_day || null;
            if (schedule?.oz_water_per_day) {
                perDayWater = schedule?.oz_water_per_day;
            }
            let ozMeetRequireDay: number = schedule?.oz_meet_require_day || 15;
            // in old system use requiredTotalWater = perDayWater * totaldays
            let requiredTotalWater = perDayWater * ozMeetRequireDay;
            if (schedule?.is_oz_meet_require_day != 1) {
                requiredTotalWater = perDayWater * totaldays;
            }
            let requiredTotalWaterText = `${requiredTotalWater}${' '}${ozTrans}`;
            let waterWhere: string = `food.collectionDate BETWEEN '${startdatedmy}' AND '${enddatedmy}'`;
            let result: object[] = [];
            let getUser: any;
            let allgetteams: any;
            if (schedule['team'] == 1) {
                if (result_type === 1) {
                    //Rank Wise user pagination
                    // calculation for pagination of user rank wise collecting user ids and then apply in where condition
                    const pagedUserIdsFind = await this.getRankedUserIdHydrate(
                        schedule?.id,
                        activityId,
                        waterWhere,
                        perDayWater,
                        paginateObj,
                        teamCondition,
                        groupCondition,
                        true,   // is team
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
                    const pagedUserIdsFind = await this.getRankedUserIdHydrate(
                        schedule?.id,
                        activityId,
                        waterWhere,
                        perDayWater,
                        paginateObj,
                        teamCondition,
                        groupCondition,
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
            let userWaterData = {};
            for (const user of getUser) {
                let userId = user.id;
                let waterdata =
                    await this.userChallengeHelperService.fetch_point_steps(
                        tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS,
                        ['SUM(water) as water', 'food.collectionDate'],
                        'user_id',
                        'activityTypeId',
                        activityId,
                        waterWhere,
                        userId,
                        'food.collectionDate',
                    );
                if (waterdata && waterdata?.length > 0) {
                    let updatedWaterData = await Promise.all(
                        waterdata.map(async (w) => {
                            let collectionDate =
                                this.commonDateService.DateTimeFormat(
                                    w.food_collectionDate,
                                    'YYYY-MM-DD',
                                );
                            let tmpWater = Number(w.water);
                            w.food_collectionDate = collectionDate;
                            w.water = tmpWater
                                ? parseFloat(tmpWater?.toFixed(2))
                                : '0 ';
                            delete w.amount;
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
                        updatedWaterData.map(
                            (item) => item.food_collectionDate,
                        ),
                    );
                    const AllLogdays = uniqueDates.size || 0;
                    userWaterData[userId] = {
                        waterdata: updatedWaterData,
                        AllLogdays,
                    };
                } else {
                    userWaterData[userId] = {
                        waterdata: [],
                        AllLogdays: 0,
                    };
                }
            }
            for (const user of getUser) {
                let userId = user.id;
                let percent = 0;
                let totalWater = 0;
                let dayLog = 0;
                let AllLogDay = 0;
                let totalWaterText = '';
                let completed = 'NO';
                if (userWaterData[String(userId)]) {
                    let waterData =
                        userWaterData?.[String(userId)]?.waterdata || [];
                    let tempCompletedDay = 0;
                    AllLogDay =
                        userWaterData?.[String(userId)]?.AllLogdays || 0;
                    for (const data of waterData) {
                        let waterData = Number(data?.water || 0);
                        if (waterData >= perDayWater) {
                            tempCompletedDay++;
                        }
                        totalWater += waterData;
                    }
                    dayLog = tempCompletedDay;
                }
                totalWater = Number(totalWater?.toFixed(2)) || 0;
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
                    if (totalWater != 0 && requiredTotalWater != 0) {
                        percent = Number(((totalWater / requiredTotalWater) * 100 || 0)?.toFixed(2));
                    }
                } else {
                    if (
                        perDayWater != 0 &&
                        requiredTotalWater != 0 &&
                        AllLogDay > 0 &&
                        totalWater > 0
                    ) {
                        // in old system they counting ((completed days / ozMeetRequireDay) * 100) its not right because its not count (< required water).
                        // Now Changed total water for calculation now as per boss requirement i changed as old system
                        // let temp = totalWater > perDayWater * AllLogDay? perDayWater * AllLogDay: totalWater;
                        // percent = Number(((temp / (perDayWater * ozMeetRequireDay)) *100 || 0)?.toFixed(2),);
                        percent = Number(((dayLog / ozMeetRequireDay) * 100 || 0)?.toFixed(2));
                    }
                }
                percent = this.commonArrayService.verifyPercentage(percent);
                if (percent >= 100) {
                    completed = 'YES';
                }
                let remainingWater = requiredTotalWater - totalWater;
                if (remainingWater < 0) {
                    remainingWater = 0;
                }
                let remainingWaterText = `${remainingWater}${' '}${ozTrans}`;
                totalWaterText = `${totalWater}${' '}${ozTrans}`;
                if (result_type == 1) {
                    let resultData = {
                        user_id: userId,
                        user_code: user?.code || '',
                        first_name: user.first_name || '',
                        last_name: user.last_name || '',
                        company_name: user.company?.company_name || '',
                        department_name: user.department?.dept_name || '',
                        employee_id: user?.employeeid || '',
                        total_water: totalWater,
                        total_water_text: totalWaterText,
                        required_water: requiredTotalWater,
                        required_water_text: requiredTotalWaterText,
                        percent: percent,
                        day_log: dayLog,
                        all_log_days: AllLogDay,
                        remaining_water: remainingWater,
                        remaining_water_text: remainingWaterText,
                        completed: completed,
                        team_name: teamName,
                        team_id: teamId,
                        group_id: groupId,
                        group_name: groupName,
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
                        user_code: user?.code || '',
                        user_id: userId,
                        first_name: user.first_name || '',
                        last_name: user.last_name || '',
                        company_name: user.company?.company_name || '',
                        department_name: user.department?.dept_name || '',
                        total_water: totalWater,
                        total_water_text: totalWaterText,
                        required_water: requiredTotalWater,
                        required_water_text: requiredTotalWaterText,
                        percent: percent,
                        day_log: dayLog,
                        all_log_days: AllLogDay,
                        remaining_water: remainingWater,
                        remaining_water_text: remainingWaterText,
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
                    const totalWaterDiff = (b?.['total_water'] ?? 0) - (a?.['total_water'] ?? 0);
                    if (totalWaterDiff !== 0) {
                        return totalWaterDiff;
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
                let total = totalUsersJoined || 0;
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
            throw new Error(error);
        }
    }
    async getRankedUserIdHydrate(
        scheduleId: number,
        activityId: string,
        hydratewhere: string,
        dailyRequiredTimes: number,
        paginateObj: { page: number; limit: number } = null,
        teamCondition: string = '',
        groupCondition: string = '',
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
        const tempUserWaterData: { [key: string]: any } = {};
        for (const userId of userIds) {
            const userWater = await this.userChallengeHelperService.fetch_point_steps(
                tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS,
                [
                    'SUM(water) as water',
                    'SUM(amount) as amount',
                    'food.collectionDate',
                ],
                'user_id',
                'activityTypeId',
                activityId,
                hydratewhere,
                userId,
                'food.collectionDate',
            );
            if (userWater && userWater.length > 0) {
                const updatedWaterData = await Promise.all(
                    userWater.map(async (w: any) => {
                        const collectionDate = this.commonDateService.DateTimeFormat(
                            w.food_collectionDate,
                            'YYYY-MM-DD',
                        );
                        const tmpWater = w.water;
                        w.food_collectionDate = collectionDate;
                        w.totalWater = tmpWater;
                        let monthName = this.commonDateService.getTodayDate().format('MMM');
                        if (collectionDate) {
                            monthName = moment(collectionDate).format('MMM');
                        }
                        w.collectionDate_Trans = `${monthName} ${moment(collectionDate).format('D, YYYY')}`;
                        return w;
                    }),
                );
                const uniqueDates = new Set(updatedWaterData.map((item: any) => item.food_collectionDate));
                const AllLogdays = uniqueDates.size || 0;
                tempUserWaterData[userId] = {
                    waterdata: updatedWaterData,
                    AllLogdays,
                };
            } else {
                tempUserWaterData[userId] = {
                    waterdata: [],
                    AllLogdays: 0,
                };
            }
        }
        const userRankMetrics: { userId: number; completedDays: number; totalWater: number }[] = [];
        for (const userId of userIds) {
            const userData = tempUserWaterData[String(userId)];
            let completedDays = 0;
            let totalWater = 0;
            if (userData) {
                const waterData = userData.waterdata || [];
                for (const data of waterData) {
                    if (data?.totalWater >= dailyRequiredTimes) {
                        completedDays++;
                    }
                    totalWater += data?.totalWater || 0;
                }
            }
            userRankMetrics.push({
                userId: Number(userId),
                completedDays,
                totalWater,
            });
        }
        const sortedUserIds = userRankMetrics
            .slice()
            .sort((a, b) => {
                if (b.completedDays !== a.completedDays) {
                    return b.completedDays - a.completedDays;
                }
                return (b.totalWater ?? 0) - (a.totalWater ?? 0);
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
