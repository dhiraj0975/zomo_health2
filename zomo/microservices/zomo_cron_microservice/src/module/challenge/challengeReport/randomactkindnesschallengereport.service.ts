import {
    CommonArrayService,
    CommonDateService, CommonHealthService,
    ScheduleChallengeEntity,
    tableConstant
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import * as moment from 'moment-timezone';
import { UserService } from 'src/module/user/user.service';
import { ScheduleChallengeJoinUsersService } from '../schedule-challenge-join-users/schedule-challenge-join-users.service';
import { TeamsService } from '../team/teams.service';
import { TokensService } from '../tokens/tokens.service';
import { UserChallengeHelperService } from '../userChallengeHelper.service';

interface ReportResult {
    columns: string[];
    data: any[];
    fileName: string;
}

interface TokenCalculation {
    tokenSum: number[];
    lastTokenDate: string;
}

interface MemberData {
    total_earn: any;
    total_given: any;
    rank_type: string;
    all: any;
    rank?: number;
}

@Injectable()
export class RandomactkindnessChallengeReportService {
    private readonly DEFAULT_COLUMNS = [
        'USER CODE', 'ORGANIZATION', 'DEPARTMENT', 'RELATIONSHIP ID',
        'FIRST NAME', 'MIDDLE NAME', 'LAST NAME', 'JOB TITLE',
        'GENDER', 'BIRTH DATE', 'DATE OF HIRE', 'ON HEALTH PLAN',
        'HEALTH PLAN NAME', 'EMAIL', 'LOCATION', 'USER TYPE'
    ];

    constructor(
        private readonly commonDateService: CommonDateService,
        private readonly userChallengeHelperService: UserChallengeHelperService,
        private readonly teamsService: TeamsService,
        private readonly userService: UserService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly commonArrayService: CommonArrayService,
        private readonly tokensService: TokensService,
        private readonly commonHealthService: CommonHealthService,
    ) {}

    async randomactkindnessChallengeReport(
        scheduleData: Partial<ScheduleChallengeEntity>,
        condition: string = '',
        result_type: number = 1,
        paginateObj: any = null,
        teamCondition: string = '',
        groupCondition: string = '',
        clmNameArr: string[] = [],
    ): Promise<any> {
        try {
            if (teamCondition) {
                condition += " AND " + teamCondition;
            }
            if (groupCondition) {
                condition += " AND " + groupCondition;
            }
            const scheduleId = scheduleData['id'];
            const schStartDate = moment(scheduleData['start_date']).format('YYYY-MM-DD');
            const schEndDate = moment(scheduleData['end_date']).format('YYYY-MM-DD');
            const schstartdate = `${schStartDate} 00:00:00`;
            const schenddate = `${schEndDate} 23:59:59`;

            const [totalDays, weekArray, monthArray] = await Promise.all([
                this.commonDateService.numOfDays(schstartdate, schenddate),
                this.commonDateService.getWeeksInRange(schstartdate, schenddate),
                this.commonDateService.getMonthsInRange(schstartdate, schenddate),
            ]);

            const { countGoalDivide, rankType } = this.calculateGoalMetrics(
                scheduleData['goal_base_on'],
                scheduleData['goalbasefrquency'],
                totalDays,
                weekArray,
                monthArray
            );

            const perUserChallengeGoal = Number(scheduleData['total_enter_token']) * countGoalDivide;
            const tokenType = scheduleData['requirement_base_on'] === 0 ? 'given' : 'earn';

            if (result_type === 1) {
                const result = await this.generateFilterReport(
                    scheduleId,
                    condition,
                    schstartdate,
                    schenddate,
                    rankType,
                    perUserChallengeGoal,
                    tokenType,
                )
                const finalPaginateObj =
                    this.commonArrayService.getPaginationVar(
                        paginateObj?.page || 1,
                        paginateObj?.limit || 10,
                    );
                const resultDetails = this.commonArrayService.paginationResponseChallengeReport(result, result.length, finalPaginateObj)
                return resultDetails;
            }

            return this.generateExportReport(
                scheduleData,
                scheduleId,
                condition,
                schstartdate,
                schenddate,
                schStartDate,
                totalDays,
                weekArray,
                monthArray,
                rankType,
                perUserChallengeGoal,
                tokenType,
                Object.keys(weekArray.weeks || {}).length,
                Object.keys(monthArray.months || {}).length,
                clmNameArr,
                result_type,
            );
        } catch (error) {
            console.log(error);
            throw new Error(`Report generation failed: ${error.message}`);
        }
    }

    private calculateGoalMetrics(
        goalBasedOn: number,
        goalbasefrquency: number,
        totalDays: number,
        weekArray: any,
        monthArray: any
    ): { countGoalDivide: number; rankType: string } {
        if (goalBasedOn === 0) {
            return { countGoalDivide: 1, rankType: 'total_token' };
        }

        switch (goalbasefrquency) {
            case 0:
                return { countGoalDivide: totalDays, rankType: 'Daily' };
            case 1:
                return { countGoalDivide: Object.keys(weekArray.weeks || {}).length, rankType: 'Weekly' };
            case 2:
                return { countGoalDivide: Object.keys(monthArray.months || {}).length, rankType: 'Monthly' };
            default:
                return { countGoalDivide: 1, rankType: 'total_token' };
        }
    }

    private async generateFilterReport(
        scheduleId: number,
        condition: string,
        schstartdate: string,
        schenddate: string,
        rankType: string,
        perUserChallengeGoal: number,
        tokenType: string,
    ): Promise<any[]> {
        const userDetails = await this.fetchUserDetails(scheduleId, condition);
        if (!userDetails.length) return [];

        const userIds = userDetails.map(u => u?.id).filter(Boolean).join(',');
        if (!userIds) return [];

        const allTokensData = await this.getAllTokens(scheduleId, userIds);
        const members = this.processUserTokenData(
            userDetails,
            allTokensData,
            rankType,
            perUserChallengeGoal
        );

        return this.sortMembers(Object.values(members), tokenType);
    }

    private async fetchUserDetails(scheduleId: number, condition: string): Promise<any[]> {
        let details = await this.getTeamDetailsWithJoins(scheduleId, condition);
        if (!details?.length) {
            details = await this.getUsersWithScheduleJoin(scheduleId, condition);
        }
        return details;
    }

    private processUserTokenData(
        userDetails: any[],
        allTokensData: any[],
        rankType: string,
        perUserChallengeGoal: number
    ): Record<string, MemberData> {
        const members: Record<string, MemberData> = {};
        const tokensByUser = this.groupTokensByUser(allTokensData);

        for (const user of userDetails) {
            const userId = user?.id;
            if (!userId) continue;

            const earnTokens = tokensByUser.earn[userId] || [];
            const givenTokens = tokensByUser.given[userId] || [];

            const earnSum = this.sumTokens(earnTokens);
            const givenSum = this.sumTokens(givenTokens);

            let earnPercentage = this.calculatePercentage(earnSum, perUserChallengeGoal);
            let givenPercentage = this.calculatePercentage(givenSum, perUserChallengeGoal);

            earnPercentage = earnPercentage > 100 ? 100 : earnPercentage;
            givenPercentage = givenPercentage > 100 ? 100 : givenPercentage;

            members[userId] = {
                total_earn: rankType === 'total_token'
                    ? earnSum
                    : `${earnPercentage.toFixed(2)}%`,
                total_given: rankType === 'total_token'
                    ? givenSum
                    : `${givenPercentage.toFixed(2)}%`,
                rank_type: rankType,
                all: user,
            };
        }
        return members;
    }

    private groupTokensByUser(tokens: any[]): { earn: Record<string, any[]>; given: Record<string, any[]> } {
        const earn: Record<string, any[]> = {};
        const given: Record<string, any[]> = {};

        for (const token of tokens) {
            const toUserId = token.to_user_id;
            const fromUserId = token.user_id;

            if (toUserId) {
                if (!earn[toUserId]) earn[toUserId] = [];
                earn[toUserId].push(token);
            }

            if (fromUserId) {
                if (!given[fromUserId]) given[fromUserId] = [];
                given[fromUserId].push(token);
            }
        }

        return { earn, given };
    }

    private sumTokens(tokens: any[]): number {
        return tokens.reduce((sum, t) => sum + (t.token_number || 0), 0);
    }

    private calculatePercentage(value: number, goal: number): number {
        return value ? parseFloat(((value * 100) / goal).toFixed(2)) : 0;
    }

    private sortMembers(members: MemberData[], tokenType: string): MemberData[] {
        const sorted = members.sort((a, b) =>
            tokenType === 'earn'
                ? b.total_earn - a.total_earn
                : b.total_given - a.total_given
        );
        sorted.forEach((member, index) => {
            member.rank = index + 1;
        });

        return sorted;
    }

    private async generateExportReport(
        schedule: any,
        scheduleId: number,
        condition: string,
        schstartdate: string,
        schenddate: string,
        rStartDate: string,
        totalDays: number,
        weekArray: any,
        monthArray: any,
        rankType: string,
        perUserChallengeGoal: number,
        tokenType: string,
        weeknumber: number,
        monthnumber: number,
        clmNameArr: string[],
        type: number,
    ): Promise<ReportResult | string | any[]> {
        const userDetails = await this.fetchUserDetails(scheduleId, condition);
        if (!userDetails?.length) {
            return { columns: [], data: [], fileName: '' };
        }

        const userIds = userDetails.map(u => u?.id).filter(Boolean).join(',');
        if (!userIds) {
            return { columns: [], data: [], fileName: '' };
        }

        const tokenDatas = await this.getAllTokens(scheduleId, userIds);
        const members = this.processUserTokenData(
            userDetails,
            tokenDatas,
            rankType,
            perUserChallengeGoal
        );
        const sortedMembers = this.sortMembers(Object.values(members), tokenType);
        const hasTeams = userDetails.some(u => u?.team);

        const commonArray = clmNameArr.length ? clmNameArr : [...this.DEFAULT_COLUMNS];
        if (hasTeams) commonArray.push('TEAM');
        const userIdField = tokenType === 'given' ? 'user_id' : 'to_user_id';
        const tokenDataArrays = this.prepareTokenDataArrays(
            tokenDatas,
            schstartdate,
            schenddate,
            rStartDate,
            totalDays,
            weekArray,
            monthArray,
            weeknumber,
            monthnumber,
            rankType,
            commonArray,
            userIdField,
        );
        const clmData = await this.buildExportData(
            sortedMembers,
            commonArray,
            hasTeams,
            tokenDataArrays,
            totalDays,
            rStartDate,
            weeknumber,
            monthnumber,
            monthArray,
            rankType,
            perUserChallengeGoal,
        );
        clmData.unshift(tokenDataArrays.columns);
        return clmData;
    }



    private async getTeamDetailsWithJoins(scheduleId: number, condition: string) {
        const joinTable = [
            { alias: 'company', table: tableConstant.COMPANIES.TBL_COMPANY, on: `company.id = user.org_id AND company.status = 1`, connect: 'user', type: 'LEFT' },
            { alias: 'department', table: tableConstant.COMPANIES.TBL_DEPARTMENT, on: `department.id = user.department_id`, connect: 'user', type: 'LEFT' },
            { alias: 'location', table: tableConstant.COMPANIES.TBL_LOCATION, on: `location.id = user.location`, connect: 'user', type: 'LEFT' },
            { alias: 'userSetting', table: tableConstant.TBL_USERS_SETTINGS, on: `userSetting.user_id = user.id`, connect: 'user', type: 'LEFT' },
            { alias: 'teamMember', table: tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS, on: `teamMember.user_id = user.id`, connect: 'user', type: 'LEFT' },
            { alias: 'teamSchedule', table: tableConstant.CHALLENGE.TBL_CH_TEAM_SCHEDULE, on: `teamSchedule.team_id = teamMember.team_id`, connect: 'user', type: 'LEFT' },
            { alias: 'scj', table: tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, on: `scj.user_id = teamMember.user_id AND scj.schedule_id = teamSchedule.schedule_id`, connect: 'user', type: 'LEFT' },
            { alias: 'team', table: tableConstant.CHALLENGE.TBL_CH_TEAMS, on: `team.id = teamMember.team_id`, connect: 'user', type: 'LEFT' },
            { alias: 'group', table: tableConstant.CHALLENGE.TBL_CH_GROUPS, on: `group.id = team.group_id`, connect: 'user', type: 'LEFT' },
        ];

        const fields = [
            'user.id','user.role_id', 'user.code', 'user.relationship_id', 'user.first_name', 'user.middle_name', 'user.last_name',
            'user.gender', 'user.dob', 'user.date_of_hire', 'user.on_insurance_plan', 'user.insurance_plan_name', 'user.email',
            'userSetting.jobtitle', 'department.dept_name', 'location.lname', 'company.company_name',
            'team.id', 'team.tname',
        ];
        condition = condition.replace(/User\./gi, 'user.');
        return this.userService.list(condition.replace('User', 'user'), null, fields, null, joinTable);
    }

    private async getUsersWithScheduleJoin(scheduleId: number, condition: string) {
        const joinTable = [
            { alias: 'scj', table: tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS, on: `scj.user_id = user.id`, connect: 'user', type: 'INNER' },
            { alias: 'userSetting', table: tableConstant.TBL_USERS_SETTINGS, on: `userSetting.user_id = user.id`, connect: 'user', type: 'LEFT' },
            { alias: 'department', table: tableConstant.COMPANIES.TBL_DEPARTMENT, on: `department.id = user.department_id`, connect: 'user', type: 'LEFT' },
            { alias: 'location', table: tableConstant.COMPANIES.TBL_LOCATION, on: `location.id = user.location`, connect: 'user', type: 'LEFT' },
            { alias: 'company', table: tableConstant.COMPANIES.TBL_COMPANY, on: `company.id = user.org_id AND company.status = 1`, connect: 'user', type: 'LEFT' },
        ];

        const fields = [
            'user.id','user.role_id', 'user.code', 'user.relationship_id', 'user.first_name', 'user.middle_name', 'user.last_name', 'user.employeeid',
            'user.gender', 'user.dob', 'user.date_of_hire', 'user.on_insurance_plan', 'user.insurance_plan_name', 'user.email',
            'userSetting.jobtitle', 'department.dept_name', 'location.lname', 'company.company_name',
        ];
        condition = condition.replace(/User\./gi, 'user.');
        return this.userService.list(condition.replace('User', 'user'), null, fields, null, joinTable);
    }

    private async getAllTokens(scheduleId: number, userIds: string) {
        const condition = `token.schedule_id = :scheduleId`;
        const parameters = { scheduleId };

        const joinTable = [
            { alias: 'fromUser', table: tableConstant.TBL_USERS, on: 'fromUser.id = token.user_id', connect: 'token', type: 'LEFT' },
            { alias: 'toUser', table: tableConstant.TBL_USERS, on: 'toUser.id = token.to_user_id', connect: 'token', type: 'LEFT' },
        ];

        const fields = [
            'token.id', 'token.schedule_id', 'token.user_id', 'token.to_user_id', 'token.submission_date', 'token.token_number',
            'fromUser.first_name as from_first_name', 'fromUser.last_name as from_last_name', 'fromUser.timezone as from_timezone',
            'toUser.first_name as to_first_name', 'toUser.last_name as to_last_name',
        ];

        const tokenList = await this.tokensService.list(
            condition,
            { 'token.id': 'DESC' },
            fields,
            null,
            joinTable,
            parameters,
        );

        return tokenList.map((t: any) => ({
            ...t,
            convert_submission_date: moment.utc(t.submission_date).tz(t.from_timezone || 'UTC').format('YYYY-MM-DD HH:mm:ss'),
            created: t.submission_date,
        }));
    }

    private prepareTokenDataArrays(
        tokenDatas: any[],
        schstartdate: string,
        schenddate: string,
        rStartDate: string,
        totalDays: number,
        weekArray: any,
        monthArray: any,
        weeknumber: number,
        monthnumber: number,
        rankType: string,
        columns: string[],
        userIdField: string,
    ): any {
        const result: any = { columns: [...columns] };
        const tokenLabel = userIdField === 'user_id' ? 'GIVEN' : 'EARNED';
        if (rankType === 'total_token') {
            result.totaldataarray = this.groupByUserId(
                tokenDatas.filter(t => t.convert_submission_date >= schstartdate && t.convert_submission_date <= schenddate),
                userIdField
            );
            result.columns.push(`TOTAL AVERAGE TOKENS ${tokenLabel}`, `TOTAL TOKENS ${tokenLabel}`, 'MET ALL CHALLENGE REQUIREMENTS', 'DATE');
        } else if (rankType === 'Daily') {
            result.dailydataarray = this.prepareDailyData(tokenDatas, rStartDate, totalDays, userIdField, result.columns, tokenLabel);
        } else if (rankType === 'Weekly') {
            result.weekdataarray = this.prepareWeeklyData(tokenDatas, weekArray, weeknumber, userIdField, result.columns, tokenLabel);
        } else if (rankType === 'Monthly') {
            result.monthdataarray = this.prepareMonthlyData(tokenDatas, monthArray, userIdField, result.columns, tokenLabel);
        }

        return result;
    }
    private groupByUserId(tokenData: any[], userIdField: string): Record<string, any[]> {
        return tokenData.reduce((acc, token) => {
            const userId = token[userIdField];
            if (userId) {
                if (!acc[userId]) acc[userId] = [];
                acc[userId].push(token);
            }
            return acc;
        }, {});
    }
    private async buildExportData(
        members: MemberData[],
        commonArray: string[],
        hasTeams: boolean,
        tokenDataArrays: any,
        totalDays: number,
        rStartDate: string,
        weeknumber: number,
        monthnumber: number,
        monthArray: any,
        rankType: string,
        perUserChallengeGoal: number,
    ) {
        const clmData: any[] = [];

        for (const member of members) {
            const userId = member.all?.id;
            if (!userId) continue;

            const row: any[] = [];
            const tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(
                member.all,
                commonArray,
            );
            row.push(...Object.values(tempdatainfo));

            if (hasTeams) {
                row.push(member.all?.team?.tname || '');
            }

            const tokenCalc = this.calculateUserTokens(
                userId,
                tokenDataArrays,
                totalDays,
                rStartDate,
                weeknumber,
                monthnumber,
                monthArray,
                rankType,
            );

            const totalTokens = tokenCalc.tokenSum.reduce((a, b) => a + b, 0);
            let tokenAverage = this.calculatePercentage(totalTokens, perUserChallengeGoal);
            tokenAverage = tokenAverage > 100 ? 100 : tokenAverage;

            row.push(
                tokenAverage > 100 ? '100.00 %' : `${tokenAverage.toFixed(2)} %`,
                totalTokens,
                totalTokens >= perUserChallengeGoal ? 'Yes' : 'No',
                tokenCalc.lastTokenDate ? moment(tokenCalc.lastTokenDate).format('MM-DD-YYYY') : '',
            );

            clmData.push(row);
        }

        return clmData;
    }

    private calculateUserTokens(
        userId: string,
        tokenDataArrays: any,
        totalDays: number,
        rStartDate: string,
        weeknumber: number,
        monthnumber: number,
        monthArray: any,
        rankType: string,
    ): TokenCalculation {
        const tokenSum: number[] = [];
        let lastTokenDate = '';
        const lastTokenDateArray: string[] = [];

        const processArray = (dataArray: any, key: string) => {
            const tokens = dataArray?.[key]?.[userId] || [];
            const sum = this.sumTokens(tokens);
            tokenSum.push(sum);

            if (tokens.length > 0 && tokens[0].submission_date) {
                lastTokenDateArray.push(tokens[0].submission_date);
            }
        };

        if (tokenDataArrays.totaldataarray) {
            const tokens = tokenDataArrays.totaldataarray?.[userId] || [];
            const sum = this.sumTokens(tokens);
            tokenSum.push(sum);

            if (tokens.length > 0 && tokens[0].submission_date) {
                lastTokenDate = tokens[0].submission_date;
            }
        }

        if (tokenDataArrays.dailydataarray) {
            for (let day = 0; day < totalDays; day++) {
                const dailyDate = moment(rStartDate).add(day, 'days').format('DD-MM-YYYY');
                processArray(tokenDataArrays.dailydataarray, dailyDate);
            }
            if (lastTokenDateArray.length > 0) {
                lastTokenDate = lastTokenDateArray[lastTokenDateArray.length - 1];
            }
        }

        if (tokenDataArrays.weekdataarray) {
            for (let w = 1; w <= weeknumber; w++) {
                processArray(tokenDataArrays.weekdataarray, `week${w}`);
            }
            if (lastTokenDateArray.length > 0) {
                lastTokenDate = lastTokenDateArray[lastTokenDateArray.length - 1];
            }
        }

        if (tokenDataArrays.monthdataarray) {
            const monthArrayList = monthArray.monthNumbers || monthArray.monthnumber || [];

            for (let i = 0; i < monthArrayList.length; i++) {
                processArray(tokenDataArrays.monthdataarray, `month${i + 1}`);
            }

            if (lastTokenDateArray.length > 0) {
                lastTokenDate = lastTokenDateArray[lastTokenDateArray.length - 1];
            }
        }

        return { tokenSum, lastTokenDate };
    }

    private prepareDailyData(tokenDatas: any[], rStartDate: string, totalDays: number, userIdField: string, columns: string[], tokenLabel: string): any {
        const dailydataarray = {};
        for (let day = 0; day < totalDays; day++) {
            const date = moment(rStartDate).add(day, 'days');
            const dailyDate = date.format('DD-MM-YYYY');

            const startDate = date.format('YYYY-MM-DD') + ' 00:00:00';
            const endDate = date.format('YYYY-MM-DD') + ' 23:59:59';

            dailydataarray[dailyDate] = this.groupByUserId(
                tokenDatas.filter(t => t.convert_submission_date >= startDate && t.convert_submission_date <= endDate),
                userIdField
            );
        }
        columns.push(`DAILY AVERAGE TOKENS ${tokenLabel}`, `TOTAL TOKENS ${tokenLabel}`, 'MET ALL CHALLENGE REQUIREMENTS', 'DATE');
        return dailydataarray;
    }

    private prepareWeeklyData(tokenDatas: any[], weekArray: any, weeknumber: number, userIdField: string, columns: string[], tokenLabel: string): any {
        const weekdataarray = {};
        for (let i = 1; i <= weeknumber; i++) {
            const week = weekArray.weeks?.[`week${i}`];
            if (week) {
                weekdataarray[`week${i}`] = this.groupByUserId(
                    tokenDatas.filter(t => t.convert_submission_date >= week.start_date && t.convert_submission_date <= week.end_date),
                    userIdField
                );
            }
        }
        columns.push(`WEEKLY AVERAGE TOKENS ${tokenLabel}`, `TOTAL TOKENS ${tokenLabel}`, 'MET ALL CHALLENGE REQUIREMENTS', 'DATE');
        return weekdataarray;
    }

    private prepareMonthlyData(tokenDatas: any[], monthArray: any, userIdField: string, columns: string[], tokenLabel: string): any {
        const monthdataarray = {};
        const monthArrayList = monthArray.monthNumbers || monthArray.monthnumber || [];

        for (let i = 0; i < monthArrayList.length; i++) {
            const monthCount = i + 1;
            const monthKey = `month${monthArrayList[i]}`;
            const month = monthArray.months?.[monthKey];

            if (month) {
                monthdataarray[`month${monthCount}`] = this.groupByUserId(
                    tokenDatas.filter(t => t.convert_submission_date >= month.start_date && t.convert_submission_date <= month.end_date),
                    userIdField
                );
            }
        }

        columns.push(`MONTHLY AVERAGE TOKENS ${tokenLabel}`, `TOTAL TOKENS ${tokenLabel}`, 'MET ALL CHALLENGE REQUIREMENTS', 'DATE');
        return monthdataarray;
    }
}