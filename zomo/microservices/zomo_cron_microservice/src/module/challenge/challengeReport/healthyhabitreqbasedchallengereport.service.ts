import {
    appConstant,
    ChallengeEntity,
    CommonArrayService,
    CommonDateService,
    CommonHealthService,
    CompaniesEntity,
    CompanySettingsEntity,
    DepartmentsEntity,
    LocationsEntity,
    ScheduleChallengeEntity,
    UserEntity,
    UserSettingsEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthyhabitreqbasedChallengeReportService {
    constructor(
        private readonly commonDateService: CommonDateService,
        private readonly commonArrayService: CommonArrayService,
        @InjectDataSource(appConstant.READ_REPLICA.toLowerCase())
        private readonly dataSource: DataSource,
        private readonly commonHealthService: CommonHealthService,
    ) {}

    async healthyhabitreqbasedChallengeReport(
        schedule: Partial<ScheduleChallengeEntity>,
        condition: string = '',
        result_type: number = 1,
        paginateObj: any = null,
        teamCondition: string = '',
        groupCondition: string = '',
        clm_name_arr: string[] = [],
        challenge: Partial<ChallengeEntity>,
    ) {
        try {
            const numberofday = challenge?.numberofday ?? 0;
            const numberofweek = challenge?.numberofweek ?? 0;
            condition = condition.replace(
                "User.status != 2",
                "User.status = 1"
            );
            const query = this.dataSource
                .createQueryBuilder(UserEntity, 'User')
                .select([
                    'User.id',
                    'User.code',
                    'User.role_id',
                    'User.relationship_id',
                    'User.username',
                    'User.first_name',
                    'User.middle_name',
                    'User.last_name',
                    'User.securitycode',
                    'User.employeeid',
                    'User.gender',
                    'User.dob',
                    'User.date_of_hire',
                    'User.on_insurance_plan',
                    'User.insurance_plan_name',
                    'User.email',
                    'User.is_camp_eligible',
                    'User.status',
                ])
                .innerJoin(
                    (qb) =>
                        qb
                            .select('*')
                            .from('ch_schedule_challenge_join_users', 'ScheduleJoin')
                            .orderBy('ScheduleJoin.id', 'DESC'),
                    'ScheduleJoin',
                    'User.id = ScheduleJoin.user_id AND ScheduleJoin.status IN (0,1)',
                )
                .leftJoinAndMapOne(
                    'User.scj',
                    'ch_schedule_challenge_join_users',
                    'scj',
                    'User.id = scj.user_id AND scj.status IN (0,1)',
                )
                .leftJoinAndMapOne(
                    'User.department',
                    DepartmentsEntity,
                    'Department',
                    'User.department_id = Department.id',
                )
                .leftJoinAndMapOne(
                    'User.company',
                    CompaniesEntity,
                    'Company',
                    'User.org_id = Company.id',
                )
                .leftJoinAndMapOne(
                    'User.companySetting',
                    CompanySettingsEntity,
                    'CompanySettings',
                    'Company.id = CompanySettings.org_id',
                )
                .leftJoinAndMapOne(
                    'User.Location',
                    LocationsEntity,
                    'Location',
                    'User.location = Location.id',
                )
                .leftJoinAndMapOne(
                    'User.userSetting',
                    UserSettingsEntity,
                    'UserSetting',
                    'User.id = UserSetting.user_id',
                )
                .where(condition.replace('scj.', 'ScheduleJoin.'))
                .groupBy('User.id');
            const rawUsers = await query.getMany();
            const [challengeWeeksRaw, daysRaw, totalWeeksRaw] = await Promise.all([
                this.dataSource.query(
                    `SELECT id FROM ch_weeks WHERE challenge_id = ? AND status = 1 ORDER BY id`,
                    [schedule.challenge_id]
                ),
                this.dataSource.query(
                    `SELECT week_id, COUNT(id) AS cnt FROM ch_days 
                 WHERE challenge_id = ? AND status = 1 GROUP BY week_id`,
                    [schedule.challenge_id]
                ),
                this.dataSource.query(
                    `SELECT COALESCE(COUNT(id), 0) AS cnt FROM ch_weeks 
                 WHERE challenge_id = ? AND status = 1`,
                    [schedule.challenge_id]
                ),
            ]);
            const challengeWeeks = challengeWeeksRaw.map((w) => w.id);
            const totalWeeks = parseInt(totalWeeksRaw[0]?.cnt || 0, 10);

            const challengeDaysMap = {};
            let totalDays = 0;
            for (const d of daysRaw) {
                const count = parseInt(d.cnt, 10);
                challengeDaysMap[d.week_id] = count;
                totalDays += count;
            }
            const enrichedUsers = await this.computeUserCompletion(
                schedule.id,
                schedule.challenge_id,
                numberofday,
                numberofweek,
                rawUsers,
                result_type,
                challengeWeeks,
                clm_name_arr,
                totalDays,
                totalWeeks,
                challengeDaysMap,
            );

            if (result_type === 1) {
                const finalPaginateObj = {
                    page: paginateObj?.page || 1,
                    take: paginateObj?.limit || 10,
                };

                return this.commonArrayService.paginationResponseChallengeReport(
                    enrichedUsers,
                    enrichedUsers.length,
                    finalPaginateObj,
                );
            } else {
                return enrichedUsers;
            }
        } catch (error) {
            console.error('Error in healthyhabitChallengeReport:', error);
            throw new Error(`Report generation failed: ${error.message}`);
        }
    }

    async computeUserCompletion(
        schedule_id: number,
        challenge_id: number,
        numberofday: number,
        numberofweek: number,
        users: any[],
        result_type: number,
        challengeWeeks: number[],
        clm_name_arr: string[],
        totalDays: number,
        totalWeeks: number,
        challengeDaysMap: Record<number, number>,
    ): Promise<any[]> {
        const rows = await this.dataSource.query(
            `
                SELECT
                    su.user_id,
                    cwu.id AS week_user_id,
                    cwu.week_id AS week_id,
                    cdu.id AS day_user_id,
                    cdu.week_id AS day_week_id
                FROM ch_schedule_challenge_join_users su
                         LEFT JOIN ch_weeks_users cwu ON su.id = cwu.schedule_id AND cwu.status = 1
                         LEFT JOIN ch_days_users cdu ON su.id = cdu.schedule_id AND cdu.status = 1
                WHERE su.schedule_id = ?
            `,
            [schedule_id],
        );

        const scheduleMap = new Map();
        for (const r of rows) {
            const uid = r.user_id;
            if (!scheduleMap.has(uid)) {
                scheduleMap.set(uid, { weeks: [], days: [], weekIds: new Set(), dayIds: new Set() });
            }
            const rec = scheduleMap.get(uid);
            if (r.week_user_id != null && !rec.weekIds.has(r.week_user_id)) {
                rec.weeks.push({ id: r.week_user_id, week_id: r.week_id });
                rec.weekIds.add(r.week_user_id);
            }
            if (r.day_user_id != null && !rec.dayIds.has(r.day_user_id)) {
                rec.days.push({ id: r.day_user_id, week_id: r.day_week_id });
                rec.dayIds.add(r.day_user_id);
            }
        }

        const exportData = [];

        for (const user of users) {
            const uid = user.id;
            const rec = scheduleMap.get(uid) || { weeks: [], days: [] };

            let compweekcount = 0;
            let compdaycount = 0;

            if (rec.weeks.length > 0 || rec.days.length > 0) {
                const weekcomp = [];

                if (rec.weeks.length > 0) {
                    const explicitWeeksRaw = rec.weeks.map(w => w.week_id);
                    /*console.log('Explicit Weeks RAW =', JSON.stringify(explicitWeeksRaw));*/

                    for (const w of rec.weeks) {
                        if (!weekcomp.includes(w.week_id)) {
                            weekcomp.push(w.week_id);
                        }
                    }
                    /*console.log('Explicit Weeks DEDUPED =', JSON.stringify(weekcomp));*/

                    user.Weekwise = weekcomp;

                    const addedWeeks = rec.weeks.length * (numberofday === 0 ? 1 : numberofday);
                    compweekcount += addedWeeks;
                    /*console.log(`After Explicit Weeks | AddedWeeks=${addedWeeks} | compWeek=${compweekcount}`);*/

                    const compdaycounttemp = rec.weeks.map(w => challengeDaysMap[w.week_id] || 0);
                    /*console.log('Explicit Week Days RAW =', JSON.stringify(compdaycounttemp));*/

                    const addedDays = compdaycounttemp.reduce((sum, val) => sum + val, 0);
                    compdaycount += addedDays;
                    /*console.log(`After Explicit Days | AddedDays=${addedDays} | compDay=${compdaycount}`);*/

                    if (compdaycounttemp.length > 0 && compdaycounttemp[0] === 0) {
                        /*console.log('Zero challengeDays detected, forcing 1 day per week');*/
                        user.WeekwiseDays = {};
                        weekcomp.forEach(() => {
                            user.WeekwiseDays = weekcomp.length;
                        });
                        const filled = Array(weekcomp.length).fill(1);
                        user.WeekwiseDays = {};
                        weekcomp.forEach((wId, idx) => {
                            user.WeekwiseDays[wId] = filled[idx];
                        });
                    } else {
                        user.WeekwiseDays = {};
                        weekcomp.forEach((wId, idx) => {
                            user.WeekwiseDays[wId] = compdaycounttemp[idx];
                        });
                    }

                    /*console.log('WeekwiseDays after explicit =', JSON.stringify(user.WeekwiseDays));*/
                }

                if (rec.days.length > 0) {
                    const daycomp = {};
                    for (const d of rec.days) {
                        daycomp[d.week_id] = (daycomp[d.week_id] || 0) + 1;
                    }

                    /*console.log('Daily Tasks RAW =', JSON.stringify(daycomp));*/

                    if (user.WeekwiseDays) {
                        for (const wId in daycomp) {
                            const weekId = parseInt(wId, 10);
                            if (weekcomp.includes(weekId)) {

                            } else if (user.WeekwiseDays[weekId] !== undefined) {
                                user.WeekwiseDays[weekId] += daycomp[weekId];
                            } else {
                                user.WeekwiseDays[weekId] = daycomp[weekId];
                            }
                        }
                    } else {
                        user.WeekwiseDays = daycomp;
                    }

                    /*console.log('WeekwiseDays after adding daily =', JSON.stringify(user.WeekwiseDays));*/

                    const diffDaycomp = {};
                    for (const wId in daycomp) {
                        const weekId = parseInt(wId, 10);
                        if (!weekcomp.includes(weekId)) {
                            diffDaycomp[weekId] = daycomp[weekId];
                        }
                    }

                    const extraDays = Object.values(diffDaycomp).reduce((sum: number, val: any) => sum + val, 0) as number;
                    compdaycount += extraDays;
                    /*console.log(`Extra Days (non-explicit) = ${extraDays} | compDay=${compdaycount}`);*/

                    if (numberofday > 0) {
                        const filteredDaycomp = {};
                        for (const wId in diffDaycomp) {
                            if (diffDaycomp[wId] >= numberofday) {
                                filteredDaycomp[wId] = diffDaycomp[wId];
                            }
                        }

                        const addedWeeksFromDays = Object.keys(filteredDaycomp).length * numberofday;
                        compweekcount += addedWeeksFromDays;
                        /*console.log(`Weeks Completed via Days = ${addedWeeksFromDays} | compWeek=${compweekcount}`);*/
                    }
                }
            }

            if (numberofweek !== 0 && numberofday !== 0) {
                user.TotalWeeks = numberofweek * numberofday;
            } else {
                user.TotalWeeks = totalWeeks;
            }

            user.Completedweeks = compweekcount;
            user.Completeddays = compdaycount;
            user.Totaldays = totalDays;
            // console.log(`Total week = ${user.TotalWeeks} | totalDays=${totalDays}`);
            // console.log(`=== User: ${user.username} Calculation End ===`);
            /*console.log(`=== Final Summary for ${user.username} | CompletedWeeks=${compweekcount} | CompletedDays=${compdaycount} ===`);*/

            const total = user.TotalWeeks === 0 ? 1 : user.TotalWeeks;
            const completed = user.Completedweeks;
            let percentage = (completed / total) * 100;
            percentage = Math.min(Math.round(percentage * 100) / 100, 100);
            user.Percentage = percentage;

            if (result_type !== 1) {
                const row = [];

                const tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(
                    user,
                    clm_name_arr,
                );
                row.push(...Object.values(tempdatainfo));

                const clm_data_tmp = [];
                const weekcomp = user.Weekwise || [];

                for (let i = 0; i < challengeWeeks.length; i++) {
                    const weekId = challengeWeeks[i];

                    if (weekcomp.includes(weekId)) {
                        row.push('Yes');
                        if (user.WeekwiseDays && user.WeekwiseDays[weekId] === undefined) {
                            clm_data_tmp.push(numberofday);
                        } else {
                            clm_data_tmp.push(user.WeekwiseDays ? user.WeekwiseDays[weekId] : 0);
                        }
                    } else if (user.WeekwiseDays && user.WeekwiseDays[weekId] !== undefined) {
                        if (numberofday > 0 && user.WeekwiseDays[weekId] >= numberofday) {
                            row.push('Yes');
                        } else {
                            row.push('No');
                        }
                        clm_data_tmp.push(user.WeekwiseDays[weekId]);
                    } else {
                        row.push('No');
                        clm_data_tmp.push(0);
                    }
                }

                row.push(...clm_data_tmp);

                const numWeeksCompleted = numberofday !== 0
                    ? user.Completedweeks / numberofday
                    : 0;
                row.push(numWeeksCompleted);

                row.push(user.Completeddays);

                const totalForCheck = user.TotalWeeks === 0 ? 1 : user.TotalWeeks;
                const challengeMet = user.Completedweeks >= totalForCheck || numberofweek === 0
                    ? 'Yes'
                    : 'No';
                row.push(challengeMet);

                exportData.push(row);
            }
        }

        if (result_type !== 1) {
            const headerColumns = [];

            for (let i = 1; i <= challengeWeeks.length; i++) {
                headerColumns.push(`Week ${i} Completed`);
            }

            for (let i = 1; i <= challengeWeeks.length; i++) {
                headerColumns.push(`Week ${i} Number of Tasks Completed`);
            }

            headerColumns.push('Number of Weeks Completed');
            headerColumns.push('Number of Tasks Completed');
            headerColumns.push('Met Challenge Requirements');

            clm_name_arr.push(...headerColumns);

            return [clm_name_arr, ...exportData];
        }

        return users;
    }
}
