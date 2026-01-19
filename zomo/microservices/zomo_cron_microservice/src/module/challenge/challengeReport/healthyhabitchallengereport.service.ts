import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    CommonHealthService,
    CompaniesEntity,
    CompanySettingsEntity,
    DepartmentsEntity,
    LocationsEntity,
    ScheduleChallengeEntity,
    UserEntity,
    UserSettingsEntity
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { AssessmentHraBiometricService } from 'src/module/healthassessment';
import { BiometricsService } from 'src/module/healthcheckup';
import { FtBiometricsService } from 'src/module/tracker';
import { UserService } from 'src/module/user/user.service';
import { DataSource } from 'typeorm';
import { BioWeightService } from '../bioweight/bioweight.service';
import { ScheduleChallengeJoinUsersService } from '../schedule-challenge-join-users/schedule-challenge-join-users.service';
import { TeamsService } from '../team/teams.service';
import { UserChallengeHelperService } from '../userChallengeHelper.service';

@Injectable()
export class HealthyhabitChallengeReportService {
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
        private readonly commonHealthService: CommonHealthService,
        @InjectDataSource(appConstant.READ_REPLICA.toLowerCase())
        private readonly dataSource: DataSource,
    ) {}

    async healthyhabitChallengeReport(
        schedule: Partial<ScheduleChallengeEntity>,
        condition: string = '',
        result_type: number = 1,
        paginateObj: any = null,
        teamCondition: string = '',
        groupCondition: string = '',
        clm_name_arr: string[] = [],
    ) {
        try {
            const isDetailedReport = result_type !== 1;

            const baseSelectFields = [
                'Company.company_name AS Organization_Name',
                'Department.dept_name AS Department',
                'User.employeeid AS Employee_id',
                'User.first_name AS First_Name',
                'User.last_name AS Last_Name',
                'COALESCE(TotalWeek.Totalweeks, 0) AS TotalWeeks',
                'COALESCE(Weekuser.Completedweeks, 0) AS Completedweeks',
                'COALESCE(TotalDay.Totaldays, 0) AS TotalDay',
                'COALESCE(Dayuser.Completeddays, 0) AS Completeddays',
                `CASE WHEN (COALESCE(TotalWeek.Totalweeks, 0) + COALESCE(TotalDay.Totaldays, 0)) > 0
                 THEN ROUND(100 * 
                    (COALESCE(Weekuser.Completedweeks, 0) + COALESCE(Dayuser.Completeddays, 0)) /
                    (COALESCE(TotalWeek.Totalweeks, 0) + COALESCE(TotalDay.Totaldays, 0)), 2)
                 ELSE 0 END AS Percentage`,
            ];

            const detailedSelectFields = [
                'CompanySettings.spouse_option',
                'Location.lname AS location_name',
                'Location.address1',
                'Location.address2',
                'Location.city',
                'Location.state',
                'Location.zip',
                'Location.country',
                'User.id AS user_id',
                'User.code AS user_code',
                'User.username AS user_username',
                'User.middle_name AS user_middle_name',
                'User.email AS Email',
                'User.gender AS user_gender',
                'User.dob AS user_dob',
                'User.date_of_hire AS user_date_of_hire',
                'User.on_insurance_plan AS user_on_insurance_plan',
                'User.insurance_plan_name AS user_insurance_plan_name',
                'User.role_id AS user_role_id',
                'User.relationship_id AS user_relationship_id',
                'UserSettings.jobtitle AS user_jobtitle',
                'UserSettings.wphone AS user_wphone',
                'UserSettings.hphone AS user_hphone',
                'UserSettings.cphone AS user_cphone',
            ];

            const selectFields = isDetailedReport
                ? [...baseSelectFields, ...detailedSelectFields]
                : baseSelectFields;

            const query = this.dataSource
                .createQueryBuilder()
                .select(selectFields)
                .from(UserEntity, 'User')
                .innerJoin(
                    (qb) => qb
                        .select('*')
                        .from('ch_schedule_challenge_join_users', 'ScheduleJoin')
                        .orderBy('ScheduleJoin.id', 'DESC'),
                    'ScheduleJoin',
                    'User.id = ScheduleJoin.user_id',
                )
                .leftJoin(
                    (qb) => qb
                        .select([
                            'schedule_id AS weekscheduleid',
                            'user_id AS weekuserid',
                            'COUNT(id) AS Completedweeks',
                        ])
                        .from('ch_weeks_users', 'wu')
                        .where('wu.status = 1')
                        .groupBy('schedule_id, user_id'),
                    'Weekuser',
                    'ScheduleJoin.id = Weekuser.weekscheduleid AND User.id = Weekuser.weekuserid',
                )
                .leftJoin(
                    (qb) => qb
                        .select([
                            'schedule_id AS dayscheduleid',
                            'user_id AS dayuserid',
                            'COUNT(id) AS Completeddays',
                        ])
                        .from('ch_days_users', 'du')
                        .where('du.status = 1')
                        .groupBy('schedule_id, user_id'),
                    'Dayuser',
                    'ScheduleJoin.id = Dayuser.dayscheduleid AND User.id = Dayuser.dayuserid',
                )
                .leftJoin(
                    (qb) => qb
                        .select([
                            'challenge_id AS tweekchallengeid',
                            'COUNT(id) AS Totalweeks',
                        ])
                        .from('ch_weeks', 'cw')
                        .where('cw.status = 1')
                        .groupBy('challenge_id'),
                    'TotalWeek',
                    'ScheduleJoin.challenge_id = TotalWeek.tweekchallengeid',
                )
                .leftJoin(
                    (qb) => qb
                        .select([
                            'challenge_id AS tdaychallengeid',
                            'COUNT(id) AS Totaldays',
                        ])
                        .from('ch_days', 'cd')
                        .where('cd.status = 1')
                        .groupBy('challenge_id'),
                    'TotalDay',
                    'ScheduleJoin.challenge_id = TotalDay.tdaychallengeid',
                )
                .leftJoin(DepartmentsEntity, 'Department', 'User.department_id = Department.id')
                .leftJoin(CompaniesEntity, 'Company', 'User.org_id = Company.id');

            if (isDetailedReport) {
                query
                    .leftJoin(CompanySettingsEntity, 'CompanySettings', 'Company.id = CompanySettings.org_id')
                    .leftJoin(LocationsEntity, 'Location', 'User.location = Location.id')
                    .leftJoin(UserSettingsEntity, 'UserSettings', 'User.id = UserSettings.user_id');
            }

            const sanitizedCondition = condition.replace(/scj\./g, 'ScheduleJoin.');
            if (sanitizedCondition) {
                query.where(sanitizedCondition);
            }

            const baseGroupBy = 'User.employeeid, User.first_name, User.last_name, Company.company_name, Department.dept_name';
            const detailedGroupBy =
                'User.id, User.code, User.username, User.employeeid, User.first_name, User.middle_name, User.last_name, ' +
                'User.email, User.gender, User.dob, User.date_of_hire, User.on_insurance_plan, User.insurance_plan_name, ' +
                'User.role_id, User.relationship_id, Company.company_name, CompanySettings.spouse_option, Department.dept_name, ' +
                'Location.lname, Location.address1, Location.address2, Location.city, Location.state, Location.zip, Location.country, ' +
                'UserSettings.jobtitle, UserSettings.wphone, UserSettings.hphone, UserSettings.cphone';

            query.groupBy(isDetailedReport ? detailedGroupBy : baseGroupBy);

            const result = await query.getRawMany();

            if (!isDetailedReport) {
                return this.formatSimpleReport(result, paginateObj);
            } else {
                return await this.formatDetailedReport(result, clm_name_arr);
            }
        } catch (error) {
            console.error('Error in healthyhabitChallengeReport:', error);
            throw new Error(`Report generation failed: ${error.message}`);
        }
    }

    private formatSimpleReport(result: any[], paginateObj: any) {
        const finalPaginateObj = {
            page: paginateObj?.page || 1,
            take: paginateObj?.limit || 10,
        };
        const resultDetails = this.commonArrayService.paginationResponseChallengeReport(
            result,
            result.length,
            finalPaginateObj,
        );
        resultDetails.list = resultDetails.list.map((user) => ({
            company: {
                company_name: user.Organization_Name || '',
            },
            department: {
                dept_name: user.Department || '',
            },
            employeeid: user.Employee_id || '',
            first_name: user.First_Name || '',
            last_name: user.Last_Name || '',
            TotalWeeks: user.TotalWeeks || 0,
            Completedweeks: user.Completedweeks || 0,
            Totaldays: user.TotalDay || 0,
            Completeddays: user.Completeddays || 0,
            Percentage: user.Percentage || 0,
        }));

        return resultDetails;
    }

    private async formatDetailedReport(result: any[], clm_name_arr: string[]) {
        const clm_data = await Promise.all(
            result.map(async (user) => {
                const transformedUser = this.transformUserData(user);
                const row: any[] = [];

                const commonFields = await this.commonHealthService.CommonFieldDataCallingCovid(
                    transformedUser,
                    clm_name_arr,
                );

                row.push(...Object.values(commonFields));

                const { totalWeeks, completedWeeks, totalDays, completedDays, percentage } =
                    this.calculateChallengeMetrics(user);

                row.push(totalWeeks, completedWeeks, totalDays, completedDays, `${percentage}%`);

                return row;
            }),
        );

        const finalColumns = [
            ...clm_name_arr,
            'WEEKLY TASKS',
            'WEEKLY TASKS COMPLETED',
            'DAILY TASKS',
            'DAILY TASKS COMPLETED',
            'TOTAL % COMPLETION',
        ];

        return [finalColumns, ...clm_data];
    }

    private transformUserData(user: any) {
        return {
            code: user.user_code || '',
            username: user.user_username || '',
            first_name: user.First_Name || '',
            middle_name: user.user_middle_name || '',
            last_name: user.Last_Name || '',
            email: user.Email || '',
            gender: user.user_gender || '',
            dob: user.user_dob || null,
            date_of_hire: user.user_date_of_hire || null,
            on_insurance_plan: user.user_on_insurance_plan || '',
            insurance_plan_name: user.user_insurance_plan_name || '',
            role_id: user.user_role_id || null,
            relationship_id: user.user_relationship_id || '',
            employeeid: user.Employee_id || '',
            company: {
                company_name: user.Organization_Name || '',
            },
            department: {
                dept_name: user.Department || '',
            },
            location: {
                lname: user.location_name || '',
            },
            Location: {
                lname: user.location_name || '',
                address1: user.address1 || '',
                address2: user.address2 || '',
                city: user.city || '',
                state: user.state || '',
                zip: user.zip || '',
                country: user.country || '',
            },
            locations: {
                address1: user.address1 || '',
                address2: user.address2 || '',
                city: user.city || '',
                state: user.state || '',
                zip: user.zip || '',
                country: user.country || '',
            },
            settings: {
                jobtitle: user.user_jobtitle || '',
                wphone: user.user_wphone || '',
                hphone: user.user_hphone || '',
                mphone: user.user_cphone || '',
            },
        };
    }

    private calculateChallengeMetrics(user: any) {
        const totalWeeks = user.TotalWeeks || 0;
        const completedWeeks = user.Completedweeks || 0;
        const totalDays = user.TotalDay || 0;
        const completedDays = user.Completeddays || 0;

        const total = totalWeeks + totalDays;
        const completed = completedWeeks + completedDays;
        const percentage = total > 0
            ? Math.round((completed / total) * 100 * 100) / 100
            : 0;

        return { totalWeeks, completedWeeks, totalDays, completedDays, percentage };
    }
}