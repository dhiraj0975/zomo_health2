import {
    CommonArrayService,
    CommonDateService, joinConditionInterface,
    PaginateDto, tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { UserService } from 'src/module/user/user.service';
import {ChallengeReportInput} from "./input";
import {cronAppConstant, CronCommonService} from "../../../common";
import {ScheduleChallengeInterface, userData, userMap} from "../../../interface";
import {WeeksUsersService} from "../week";

@Injectable()
export class OlympicsChallengeReportService {
    constructor(
        private readonly commonDateService: CommonDateService,
        private readonly userService: UserService,
        private readonly cronCommonService: CronCommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly weeksUsersService: WeeksUsersService,
    ) {}

    async olympicsChallengeReport(schedule: Partial<ScheduleChallengeInterface>,condition: string = '',result_type: number = 1,paginateObj: PaginateDto = null,flag: number = 0) {
        try {
            let count = 0;
            let sheetData = [];
            condition = condition.replace(/User\./g, 'users.')
            condition = condition.replace(/scj\./g, 'scheduleChallengeJoinUsers.')
            let fields = ['users.id', 'users.first_name', 'users.last_name', 'users.employeeid', 'company.company_name', 'department.dept_name', 'acOlympicData.total_minutes', 'acOlympicData.user_id', 'weeksUsers.id, weeksUsers.schedule_id, weeksUsers.m_numeric, weeksUsers.status', 'challengeActivity.id, challengeActivity.activity_name, challengeActivity.activity_desc, challengeActivity.colorcode'];
            let JoinArray: joinConditionInterface[] = [
                {
                    join_table: 'weeksUsers.users',
                    alias: 'users',
                    table: tableConstant.TBL_USERS,
                    on_condition: `weeksUsers.user_id = users.id`,
                    join_type: 'left_one',
                },
                {
                    join_table: 'users.company',
                    alias: 'company',
                    table: tableConstant.COMPANIES.TBL_COMPANY,
                    on_condition: `company.id = users.org_id`,
                    join_type: 'left_one',
                },
                {
                    join_table: 'users.companySettings',
                    alias: 'companySettings',
                    table: tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
                    on_condition: `company.id = companySettings.org_id`,
                    join_type: 'left_one',
                },
                {
                    join_table: 'users.department',
                    alias: 'department',
                    table: tableConstant.COMPANIES.TBL_DEPARTMENT,
                    on_condition: `department.id = users.department_id`,
                    join_type: 'left_one',
                },
                {
                    join_table: 'weeksUsers.scheduleChallenge',
                    alias: 'scheduleChallenge',
                    table: tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,
                    on_condition: `scheduleChallenge.challenge_id = weeksUsers.challenge_id`,
                    join_type: 'left_one',
                },
                {
                    join_table: 'weeksUsers.scheduleChallengeJoinUsers',
                    alias: 'scheduleChallengeJoinUsers',
                    table: tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
                    on_condition: `scheduleChallengeJoinUsers.id = weeksUsers.schedule_id`,
                    join_type: 'left_one',
                },
                {
                    join_table: 'weeksUsers.challengeActivity',
                    alias: 'challengeActivity',
                    table: tableConstant.CHALLENGE.TBL_CH_CHALLENGE_ACTIVITY,
                    on_condition: `challengeActivity.id = weeksUsers.activity_id`,
                    join_type: 'left_one',
                },
                {
                    alias: 'acOlympicData',
                    table: `(SELECT SUM(minutes) AS total_minutes,COUNT(minutes) AS activitycount,user_id,schedule_id,status,activity_id FROM ${tableConstant.CHALLENGE.TBL_CH_AC_OLYMPIC_DATA} GROUP BY schedule_id, activity_id, user_id)`,
                    on_condition: `acOlympicData.schedule_id = scheduleChallengeJoinUsers.id AND challengeActivity.id = acOlympicData.activity_id AND weeksUsers.user_id = acOlympicData.user_id`,
                    join_type: 'left_join',
                },
            ];

            if (result_type !== 1) {
                fields = [...fields, 'users.code', 'users.email', 'users.username', 'users.middle_name', 'users.dob', 'users.date_of_hire', 'users.gender', 'users.role_id', 'users.insurance_plan_name', 'users.on_insurance_plan', 'userSetting.jobtitle', 'locations.lname', 'acOlympicData.activitycount', 'acOlympicData.schedule_id', 'scheduleChallengeJoinUsers.id'];
                JoinArray.push(
                    {
                        join_table: 'users.locations',
                        alias: 'locations',
                        table: tableConstant.COMPANIES.TBL_LOCATION,
                        on_condition: `locations.id = users.location`,
                        join_type: 'left_one',
                    },
                    {
                        join_table: 'users.userSetting',
                        alias: 'userSetting',
                        table: tableConstant.TBL_USERS_SETTINGS,
                        on_condition: `users.id = userSetting.user_id`,
                        join_type: 'inner_one',
                    }
                );
            }

            if (result_type === 1) {
                const distinctUserIds = await this.weeksUsersService.commonQueryBuilder(
                    ['DISTINCT users.id AS users_id'],
                    condition,
                    { 'users.id': 'DESC' },
                    JoinArray,
                    'getRawMany',
                    paginateObj,
                    'users.id'
                );
                const userIds = distinctUserIds.map(row => row.users_id);
                count = userIds.length;
                const { page, limit } = paginateObj || {page: 1, limit: 10};
                if (userIds.length === 0) {
                    const setPaginateObj = this.commonArrayService.getPaginationVar(page, limit);
                    return this.commonArrayService.paginationResponse([], 0, setPaginateObj);
                }
                const start = (page - 1) * limit;
                const paginateUser = userIds.slice(start, start + limit);
                condition += ` AND users.id IN(${paginateUser.join(',')})`;
            }
            let result = await this.weeksUsersService.commonQueryBuilder(
                fields,
                condition,
                {'users.id': 'DESC'},
                JoinArray,
                'getRawMany',
                {},
                'weeksUsers.id'
            )

            const processResults = async (results: userData[],result_type) => {
                const userMap: Record<number, userMap> = {};
                const formatDate = async (date) => date ? await this.commonDateService.DateTimeFormat(date, 'MM-DD-YYYY') : '';
                for (let i: number = 0; i < results.length; i++) {
                    const data = results[i];
                    const userId = data.users_id;
                    if (!userMap[userId]) {
                        userMap[userId] = {
                            totalWeeks: 0,
                            completedWeeks: 0,
                            total_minutes: 0,
                            activitycount: 0,
                            latestData: data
                        };
                    }
                    userMap[userId].totalWeeks++;
                    userMap[userId].activitycount += Number(data.activitycount);
                    userMap[userId].total_minutes += Number(data.total_minutes);
                    if (Number(data.total_minutes) >= Number(data.m_numeric)) {
                        userMap[userId].completedWeeks++;
                    }
                    userMap[userId].latestData = data;
                }

                const finalResult = [];
                const userIds = Object.keys(userMap);

                for (let i: number = 0; i < userIds.length; i++) {
                    const userId = userIds[i];
                    const user = userMap[userId];
                    const data = user.latestData;
                    const percentage = Math.round(((user.completedWeeks / user.totalWeeks) * 100) * 100) / 100;
                    if (result_type === 1) {
                        finalResult.push({
                            id: data.users_id,
                            first_name: data.users_first_name,
                            last_name: data.users_last_name,
                            employee_id: data.users_employeeid,
                            company_name: data.company_company_name || '',
                            dept_name: data.department_dept_name || '',
                            week: user.totalWeeks || '-',
                            score: user.completedWeeks,
                            percentage: `${percentage}%`,
                            rank: i + 1
                        });
                    } else {
                        const userGender = cronAppConstant.GENDER_MAP[data.users_gender?.toLowerCase()] || 0;
                        let userDataVal = [
                            data.users_code || '',
                            data.company_company_name || '',
                            data.department_dept_name || '',
                            data.users_role_id === 16 ? data.users_relationship_id : '',
                            data.users_username || '',
                            data.users_first_name || '',
                            data.users_middle_name || '',
                            data.users_last_name || '',
                            data.userSetting_jobtitle || '',
                            data.users_employeeid || '',
                            cronAppConstant.GENDER[userGender] || '',
                            await formatDate(data.users_dob),
                            await formatDate(data.users_date_of_hire),
                            cronAppConstant.INSURANCE_PLAN[data.users_on_insurance_plan?.toLowerCase()] || '',
                            data.users_insurance_plan_name || '',
                            data.users_email || '',
                            data.locations_lname || '',
                            data.users_role_id === 2 ? 'Employee' : 'Spouse',
                            user.totalWeeks || '0',
                            user.completedWeeks,
                            `${percentage}%`,
                        ]
                        if (flag !== 1) {
                            userDataVal.push(
                                user?.total_minutes || 0,
                                user?.activitycount || 0,
                                percentage === 100 ? 'YES' : 'NO'
                            );
                        }
                        finalResult.push(userDataVal);
                    }
                }

                return finalResult;
            };

            result = await processResults(result, result_type);

            if (flag !== 1) {
                if (result_type === 1) {
                    result.sort((a, b) => {
                        const aPerc = parseFloat(a?.percentage?.toString().replace('%', '')) || 0;
                        const bPerc = parseFloat(b?.percentage?.toString().replace('%', '')) || 0;
                        const percDiff = bPerc - aPerc;
                        if (percDiff !== 0) {
                            return percDiff;
                        }
                        return (b?.total_minutes || 0) - (a?.total_minutes || 0);
                    });
                } else {
                    result.sort((a, b) => {
                        const aPerc = parseFloat(a?.[20]?.toString().replace('%', '')) || 0;
                        const bPerc = parseFloat(b?.[20]?.toString().replace('%', '')) || 0;

                        const percDiff = bPerc - aPerc;
                        if (percDiff !== 0) {
                            return percDiff;
                        }
                        return (b?.[21] || 0) - (a?.[21] || 0);
                    });
                }
            }

            if (result_type === 1) {
                const { page, limit } = paginateObj || {};
                const setPaginateObj = this.commonArrayService.getPaginationVar(page, limit);
                let response =  this.commonArrayService.paginationResponse(
                    result,
                    count,
                    setPaginateObj,
                );
                return response;
            }
            if(result_type === 2){
                return result;
            }

        } catch (error) {
            console.log("error",error);
            this.cronCommonService.errorLog(0,'olympics-challenge-report', error?.message, error);
            return {
                success: 0,
                data: null,
                message: error.message,
                error: 1,
            };
        }
    }


}
