import {
    CommonArrayService,
    CommonDateService,
    CommonHealthService,
    ScheduleChallengeEntity
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { AssessmentHraBiometricService } from 'src/module/healthassessment';
import { BiometricsService } from 'src/module/healthcheckup';
import { FtBiometricsService } from 'src/module/tracker';
import { ActivityFeedService } from 'src/module/tracker/activityfeeds.service';
import { UserService } from 'src/module/user/user.service';
import { BioWeightService } from '../bioweight/bioweight.service';
import { HealthActivityService } from '../healthrequest/health-activity.service';
import { HealthUsersActivityService } from '../healthrequest/health-users-activity.service';
import { ScheduleChallengeJoinUsersService } from '../schedule-challenge-join-users/schedule-challenge-join-users.service';
import { TeamsService } from '../team/teams.service';
import { UserChallengeHelperService } from '../userChallengeHelper.service';

@Injectable()
export class HealthyhabitactivityChallengeReportService {
    constructor(
        private readonly commonDateService: CommonDateService,
        private readonly userChallengeHelperService: UserChallengeHelperService,
        private readonly teamsService: TeamsService,
        private readonly userService: UserService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly commonArrayService: CommonArrayService,
        private readonly bioWeightService: BioWeightService,
        private readonly biometricsService: BiometricsService,
        private readonly ftBiometricsService: FtBiometricsService,
        private readonly hraBiometricsService: AssessmentHraBiometricService,
        private readonly healthActivityService: HealthActivityService,
        private readonly healthUsersActivityService: HealthUsersActivityService,
        private readonly activityFeedsService: ActivityFeedService,
        private readonly commonHealthService: CommonHealthService,
    ) {}
    async healthyhabitactivityChallengeReport(
        schedule: Partial<ScheduleChallengeEntity>,
        condition: string = '',
        result_type: number = 1,
        paginateObj: any = null,
        teamCondition: string = '',
        groupCondition: string = '',
        clm_name_arr: string[],
    ) {
        try {
            const orgId = schedule?.org_id;
            const scheduleId = schedule?.id;
            const startDate = schedule?.start_date;
            const endDate = schedule?.end_date;
            const totalGoalValue = schedule?.tr_totalgoalvalue || 0;

            const companydetail =
                await this.userService.challengeReportPaginate(
                    `${condition} AND User.org_id = ${orgId}`,
                    null,
                    [
                        'User',
                        'Location',
                        'department.id',
                        'department.dept_name',
                        'company.id',
                        'company.company_name',
                        'companySetting.spouse_option',
                        'scj.id',
                        'scj.schedule_id',
                        'scj.challenge_id',
                    ],
                    [],
                );
            const allUserIds = companydetail
                .map((user: any) => user?.id)
                .filter(Boolean);
            const allUserIdsStr = allUserIds.join(',');

            if (!allUserIdsStr.trim()) return [];
            // 2. Get challenge activities
            const challengeHealthActivities =
                await this.healthActivityService.listRecord(
                    [
                        'id',
                        'avalue',
                        'atype',
                        'name',
                        'amax',
                        'frequency',
                        'is_track',
                    ],
                    {
                        status: 1,
                        org_id: orgId,
                        schedule_id: scheduleId,
                    },
                    { id: 'DESC' },
                );

            const findAll = '(7,11,15,16,17,18)';
            const where = `food.collectionDate BETWEEN '${this.commonDateService.DateTimeFormat(startDate, 'YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.DateTimeFormat(endDate, 'YYYY-MM-DD')} 23:59:59' AND food.status = 1`;
            const allStepMilesData = await this.activityFeedsService.listRecord(
                `food.user_id IN (${allUserIds.join(',')}) AND (food.activityTypeId IN ${findAll} OR food.appName='AppleHealthKit' OR food.appName='GoogleFit') AND ${where}`,
                { 'food.collectionDate': 'DESC' },
                ['SUM(steps) as steps', 'user_id', 'collectionDate'],
                'food.user_id, food.collectionDate',
            );

            const stepDataDateWise: Record<number, Record<string, number>> = {};
            for (const row of allStepMilesData) {
                const { user_id, collectionDate, steps } = row;
                if (!stepDataDateWise[user_id]) stepDataDateWise[user_id] = {};
                stepDataDateWise[user_id][collectionDate] = parseFloat(steps);
            }

            // 4. Get point-check habit types
            const pointCheck = challengeHealthActivities
                .filter((act) => act.atype === 1)
                .map((act) => act.id);

            const healthyHabitTotalPoint: Record<number, any> = {};
            if (pointCheck.length > 0) {
                /*healthyHabitTotalPoint = await this.getHealthyHabitTotalPoint(
                    startDate,
                    endDate,
                    orgId,
                );*/
            }
            const rawData =
                await this.healthUsersActivityService.getUserActivitySummary(
                    orgId,
                    scheduleId,
                    allUserIds,
                );
            const userActivitiesMap: Record<
                number,
                Record<number, Record<string, number>>
            > = {};

            for (const row of rawData) {
                const { user_id, act_id, act_date, total } = row;

                if (!userActivitiesMap[user_id])
                    userActivitiesMap[user_id] = {};
                if (!userActivitiesMap[user_id][act_id])
                    userActivitiesMap[user_id][act_id] = {};

                userActivitiesMap[user_id][act_id][act_date] = parseFloat(
                    total || '0',
                );
            }

            // 6. Calculate progress per user
            const clm_data: any[] = [];
            for (const user of companydetail) {
                const userId = user?.id;
                let earnedProgress = 0;
                let totalCompleted = 0;

                const userStepData = stepDataDateWise[userId] || {};
                const userHabitData = userActivitiesMap[userId] || {};
                const userPointData = healthyHabitTotalPoint[userId] || {};

                const row: any[] = [];
                if (result_type !== 1) {
                    const tempdatainfo =
                        await this.commonHealthService.CommonFieldDataCallingCovid(
                            user,
                            clm_name_arr,
                        );
                    row.push(...Object.values(tempdatainfo));
                }
                for (const activity of challengeHealthActivities) {
                    const {
                        id: actId,
                        avalue,
                        amax,
                        atype,
                        frequency,
                        is_track,
                    } = activity;

                    let activityData: Record<string, number> = {};
                    const activityMiles = userHabitData[actId] || {};

                    if (atype === 0) {
                        activityData = is_track
                            ? await this.mergeStepAndActivity(
                                  userStepData,
                                  activityMiles,
                              )
                            : activityMiles;
                    } else {
                        activityData = is_track
                            ? await this.mergeStepAndActivity(
                                  userPointData,
                                  activityMiles,
                              )
                            : activityMiles;
                    }

                    const sortedData = Object.entries(activityData).sort(
                        ([a], [b]) =>
                            new Date(a).getTime() - new Date(b).getTime(),
                    );

                    let totalProgress = 0;

                    if (frequency === 0) {
                        totalProgress = sortedData.reduce((sum, [, val]) => {
                            return sum + Math.min(avalue, val);
                        }, 0);
                    } else {
                        const bucketKey =
                            frequency === 1
                                ? 'oW'
                                : frequency === 2
                                  ? 'mY'
                                  : 'Y';
                        const bucketMap: Record<string, number> = {};

                        for (const [dateStr, value] of sortedData) {
                            const date = new Date(dateStr);
                            const bucket = await this.formatDateBucket(
                                date,
                                bucketKey,
                            );
                            bucketMap[bucket] =
                                (bucketMap[bucket] || 0) + value;
                            if (bucketMap[bucket] > avalue) {
                                bucketMap[bucket] = avalue;
                            }
                        }

                        totalProgress = Object.values(bucketMap).reduce(
                            (sum, val) => sum + val,
                            0,
                        );
                    }

                    totalProgress = Math.floor(totalProgress);
                    const isCompleted = totalProgress >= amax;
                    earnedProgress += Math.min(totalProgress, amax);

                    if (isCompleted) {
                        totalCompleted++;
                    }

                    if (result_type !== 1) {
                        row.push(amax);
                        row.push(Math.min(totalProgress, amax));
                        row.push(isCompleted ? 'Yes' : 'No');
                    }
                }

                if (result_type !== 1) {
                    row.push(totalCompleted);
                    row.push(earnedProgress >= totalGoalValue ? 'Yes' : 'No');
                    clm_data.push(row);
                } else {
                    user['Meet'] =
                        earnedProgress >= totalGoalValue ? 'Yes' : 'No';
                }
            }
            if (result_type !== 1) {
                for (const activity of challengeHealthActivities) {
                    clm_name_arr.push(`${activity.name} Required`);
                    clm_name_arr.push(`${activity.name} Total`);
                    clm_name_arr.push(`${activity.name} Status`);
                }
                clm_name_arr.push('Total Completed');
                clm_name_arr.push('Met Requirements');
                return [clm_name_arr, ...clm_data];
            } else {
                const finalPaginateObj = {
                    page: paginateObj?.page || 1,
                    take: paginateObj?.limit || 10,
                };
                const resultDetails =
                    this.commonArrayService.paginationResponseChallengeReport(
                        companydetail,
                        companydetail.length,
                        finalPaginateObj,
                    );
                return resultDetails;
            }
        } catch (error) {
            console.error(
                'Error in healthyhabitactivityChallengeReport:',
                error,
            );
            throw new Error(error);
        }
    }

    async mergeStepAndActivity(
        obj1 = {},
        obj2 = {},
    ): Promise<Record<string, number>> {
        const result = { ...obj1 };
        for (const key in obj2) {
            result[key] = (result[key] || 0) + obj2[key];
        }
        return result;
    }

    async formatDateBucket(date: Date, type: string): Promise<string> {
        if (type === 'oW') {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            return weekStart.toISOString().slice(0, 10);
        } else if (type === 'mY') {
            return `${date.getFullYear()}-${date.getMonth() + 1}`;
        } else if (type === 'Y') {
            return `${date.getFullYear()}`;
        }
        return '';
    }
}
