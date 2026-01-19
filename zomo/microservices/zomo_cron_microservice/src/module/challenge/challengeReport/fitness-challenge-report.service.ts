import {
    CommonArrayService,
    CommonDateService,
    joinConditionInterface,
    PaginateDto,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { UserService } from 'src/module/user/user.service';
import {ChallengeReportInput} from "./input";
import {cronAppConstant, CronCommonService} from "../../../common";
import {FitnessActivityService} from "../fitness-activity/fitness-activity.service";
import {ScheduleChallengeInterface} from "../../../interface";

@Injectable()
export class FitnessChallengeReportService {
    constructor(
        private readonly commonDateService: CommonDateService,
        private readonly userService: UserService,
        private readonly cronCommonService: CronCommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly fitnessActivityService: FitnessActivityService,
    ) {}

    async fitnessChallengeReport(schedule: Partial<ScheduleChallengeInterface>,condition: string = '',result_type: number = 1,paginateObj: PaginateDto = null) {
        try {
            let count = 0;
            let sheetData = [];
            let totalActivity:number = await this.fitnessActivityService.getCount({challenge_id: schedule?.ch?.id});
            condition = condition.replace(/User\./g, 'users.')
            condition = condition.replace(/scj\./g, 'scheduleChallengeJoinUsers.')
            let JoinArray: joinConditionInterface[] = [
                {
                    join_table: 'users.company',
                    alias: 'company',
                    table: tableConstant.COMPANIES.TBL_COMPANY,
                    on_condition: `company.id = users.org_id`,
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
                    join_table: 'users.scheduleChallengeJoinUsers',
                    alias: 'scheduleChallengeJoinUsers',
                    table: tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
                    on_condition: `scheduleChallengeJoinUsers.user_id = users.id`,
                    join_type: 'left_one',
                },
                {
                    join_table: 'fa.scheduleChallengeJoinUsers',
                    alias: 'fa',
                    table: tableConstant.CHALLENGE.TBL_CH_FITNESS_ACTIVITY,
                    on_condition: `scheduleChallengeJoinUsers.challenge_id = fa.challenge_id`,
                    join_type: 'left_one',
                },
                {
                    join_table: 'fua.scheduleChallengeJoinUsers',
                    alias: 'fua',
                    table: tableConstant.CHALLENGE.TBL_CH_FITNESS_USERS_ACTIVITY,
                    on_condition: `scheduleChallengeJoinUsers.id = fua.schedule_join_id AND fua.user_id = users.id AND fua.ftns_activity_id = fa.id`,
                    join_type: 'inner_one',
                },
            ];
            let fields = ['users.id', 'users.code', 'users.first_name', 'users.username', 'users.middle_name', 'users.last_name', 'users.dob', 'users.date_of_hire', 'users.employeeid', 'users.gender', 'users.email', 'users.role_id', 'users.relationship_id', 'users.insurance_plan_name','users.on_insurance_plan', 'company.company_name', 'department.dept_name', 'scheduleChallengeJoinUsers.id', 'COUNT(DISTINCT fua.ftns_activity_id) AS total', `COUNT(DISTINCT fua.ftns_activity_id) * 100 / ${totalActivity} AS completed`, 'fua.user_id', 'fua.schedule_join_id'];

            if (result_type !== 1) {
                fields = [...fields, 'userSetting.jobtitle', 'locations.location_name', 'locations.lname'];
                JoinArray.push(
                    {
                        join_table: 'users.userSetting',
                        alias: 'userSetting',
                        table: tableConstant.TBL_USERS_SETTINGS,
                        on_condition: `users.id = userSetting.user_id`,
                        join_type: 'inner_one',
                    },
                    {
                        join_table: 'users.locations',
                        alias: 'locations',
                        table: tableConstant.COMPANIES.TBL_LOCATION,
                        on_condition: `locations.id = users.location`,
                        join_type: 'left_one',
                    }
                );
            }
            if (result_type === 1) {
                let distinctUserIds = await this.userService.commonQueryBuilder(
                    ['DISTINCT users.id AS users_id',`COUNT(DISTINCT fua.ftns_activity_id) * 100 / ${totalActivity} AS completed`],
                    condition,
                    {'completed': 'DESC'},
                    JoinArray,
                    'getRawMany',
                    {},
                    'fua.schedule_join_id'
                )
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
            let result = await this.userService.commonQueryBuilder(
                fields,
                condition,
                {'completed': 'DESC'},
                JoinArray,
                'getRawMany',
                {},
                'fua.schedule_join_id'
            )

            const processResults = async (results: any[], result_type) => {
                const calculatePercentage = (completed: number) => Math.round((completed) * 100) / 100;
                const formatDate = async (date: any) => date ? await this.commonDateService.DateTimeFormat(date, 'MM-DD-YYYY') : '';
                const processRow = async (data: any,index) => {
                    const userGender = cronAppConstant.GENDER_MAP[data?.users_gender?.toLowerCase()] || 0;
                    const completed: number = calculatePercentage(data?.['completed']);
                    if (result_type === 1) {
                        return {
                            "id": data.users_id,
                            "first_name": data.users_first_name,
                            "last_name": data.users_last_name,
                            "employee_id": data.users_employeeid,
                            "company_name": data.company_company_name || '',
                            "dept_name": data.department_dept_name || '',
                            "total_activity": totalActivity,
                            "total": data?.['total'],
                            "completed": completed || '0.00',
                            "rank": index + 1
                        }
                    } else {
                        return [
                            data?.users_code || '',
                            data?.company_company_name || '',
                            data?.department_dept_name || '',
                            data?.users_role_id == 16 ? data?.users_relationship_id : '',
                            data?.users_username || '',
                            data?.users_first_name || '',
                            data?.users_middle_name || '',
                            data?.users_last_name || '',
                            data?.userSetting_jobtitle || '',
                            data?.users_employeeid || '',
                            cronAppConstant.GENDER[userGender] || '',
                            await formatDate(data.users_dob),
                            await formatDate(data.users_date_of_hire),
                            cronAppConstant.INSURANCE_PLAN[data.users_on_insurance_plan?.toLowerCase()] || '',
                            data?.users_insurance_plan_name || '',
                            data?.users_email || '',
                            data?.locations_lname || '',
                            data?.users_role_id == 2 ? 'Employee' : 'Spouse',
                            totalActivity,
                            data?.['total'] || '0',
                            `${completed}%` || '0.00%',
                            index + 1,
                        ]
                    }
                };

                const result = await Promise.all(results.map((row, index) => processRow(row, index)));
                return result;
            };
            result = await processResults(result, result_type);
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
            this.cronCommonService.errorLog(0,'fitness-challenge-report', error?.message, error);
            return {
                success: 0,
                data: null,
                message: error.message,
                error: 1,
            };
        }
    }
}
