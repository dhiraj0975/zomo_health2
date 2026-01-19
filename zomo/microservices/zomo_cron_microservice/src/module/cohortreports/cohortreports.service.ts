import {
    appConstant,
    AssessmentCohortReportsEntity,
    BaseService,
    CensusCustomFieldsEntity,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    LocationsEntity,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as moment from 'moment-timezone';
import { lastValueFrom } from 'rxjs';
import { DataSource, Repository } from 'typeorm';
import { CampaignDashboardService, FrontCalculationService, FrontPointsForService } from "../campaign";
import { ActivePluginService } from "../company";
import { CompanyService } from "../company/company.service";
@Injectable()
export class CohortReportsService extends BaseService<AssessmentCohortReportsEntity> {
    private readonly RISK_LEVELS = {
        VERY_HIGH: 'Very High Risk',
        HIGH: 'High Risk',
        MODERATE: 'Moderate Risk',
        LOW: 'Low Risk',
    };

    private readonly BIOMETRIC_FIELDS = [
        'weight', 'bmi', 'systolic', 'diastolic', 'blood_glucose',
        'alc', 'hdl', 'ldl', 'total_cholesterol', 'triglycerides'
    ];

    private readonly SOURCE_MAP: Record<string, string> = {
        '1': 'User Entered',
        '3': 'Physician Entered',
        '11': 'Physician Entered',
        '12': 'Physician Entered',
        '13': 'User Entered',
        '14': 'User Entered',
        '15': 'User Entered',
    };

    private readonly BIOMETRIC_TABLES = [
        { table: 'hc_biometrics', dateField: 'created', heightField: 'height', enterByField: 'enter_by' },
        { table: 'ha_hrabiometrics', dateField: 'date', heightField: 'CONCAT(height_ft, ":", height_in)', enterByField: "'0'" },
        { table: 'ft_biomatrics', dateField: 'added_date', heightField: 'CONCAT(height_ft, ":", height_in)', enterByField: "'0'" }
    ];

    constructor(
        @InjectRepository(AssessmentCohortReportsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaReportsRepo: Repository<AssessmentCohortReportsEntity>,
        @InjectRepository(AssessmentCohortReportsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaReportsRepo: Repository<AssessmentCohortReportsEntity>,
        @InjectRepository(LocationsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaLocationsRepo: Repository<LocationsEntity>,
        @InjectRepository(LocationsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaLocationsRepo: Repository<LocationsEntity>,
        @InjectRepository(CensusCustomFieldsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly commonService: CommonService,
        commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
        @InjectDataSource(appConstant.READ_REPLICA.toLowerCase())
        private readonly dataSource: DataSource,
        @InjectDataSource(appConstant.MAIN.toLowerCase())
        private readonly dataSourceWrite: DataSource,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
        private readonly frontPointsForService: FrontPointsForService,
        private readonly campaignDashboardService: CampaignDashboardService,
        private readonly activePluginService: ActivePluginService,
        private readonly companyService: CompanyService,
        private readonly frontCalculationService: FrontCalculationService,
    ) {
        super(readReplicaReportsRepo, writeReplicaReportsRepo, 'AssessmentCohortReports', commonArrayService);
    }
    async cohortreportgenerate() {
        try {
            let report = await this.findPendingReport();
            if (!report) return { message: 'No pending reports' };
            report.condition = report?.condition.trimStart().replace(/\buser\./g, 'User.').replace(/\bLocation\./g, 'location.');
            const users = await this.getUsersWithDetails(report.condition || '', report.org_id);
            if (!users?.length) {
                await this.updateReportStatus(report.id, 2, 0);
                return { message: 'No users found' };
            }

            const [fromDate1, toDate1, fromDate2, toDate2] = this.parseDateRange(report.year);
            const userGenderMap = new Map(users.map(u => [u.id, u.gender.toUpperCase()]));
            let userIds = Array.from(userGenderMap.keys());

            const sourceConditions = this.buildSourceConditions(report.source_ids);

            if (report.campaign_id) {
                const filteredUsers = await this.filterUsersByCampaign(report, report.org_id, users, users.length);
                if (!filteredUsers || !Object.keys(filteredUsers).length) {
                    return { message: 'No eligible users' };
                }
                userIds = userIds.filter(id => id in filteredUsers);
            }

            if (!userIds.length) return { message: 'No users to process' };

            const userIdsStr = userIds.join(',');
            const rangeLabels = this.createRangeLabels(fromDate1, toDate1, fromDate2, toDate2);

            const [biometricsData, biometricCounts, assessmentDataObj] = await Promise.all([
                this.getBiometricData(fromDate1, toDate1, fromDate2, toDate2, userIdsStr, sourceConditions),
                this.getBiometricCounts(fromDate1, toDate1, fromDate2, toDate2, userIdsStr, sourceConditions),
                this.getAssessmentData(fromDate1, toDate1, fromDate2, toDate2, userIdsStr, report.org_id),
            ]);

            const reportData = await this.processReportData(
                users, biometricsData, assessmentDataObj.assessmentData,
                assessmentDataObj.questions, assessmentDataObj.questionAnswers,
                Object.fromEntries(userGenderMap), ['1', '2'], '1', '2',
                rangeLabels.range1, rangeLabels.range2,
                biometricCounts.biototalfirstyear, biometricCounts.biototalsecondyear
            );

            const filename = this.generateFilename(report.org_id, fromDate1, toDate1, fromDate2, toDate2);
            const fileData = {
                clm_name_arr: reportData.clm_name_arr,
                clm_data_arr: reportData.clm_data_arr,
                filename: filename,
                sheet_title: reportData.sheet_title,
                direct: 0,
            };
            await this.saveJsonAndGenerateExcel(filename.replace('.xlsx', '.json'), fileData);
            await this.updateReportStatus(report.id, 1, 1, filename.replace(/^reports\//, ''));

            return { success: true, message: 'Report generated successfully', filename };
        } catch (error) {
            console.error('Error in cohortreportgenerate:', error);
            throw error;
        }
    }
    private parseDateRange(year: string): [string, string, string, string] {
        const yearParts = year.split(':::');
        if (yearParts.length < 4) throw new Error('Invalid year format');
        return [yearParts[0], yearParts[1], yearParts[2], yearParts[3]];
    }
    private createRangeLabels(fd1: string, td1: string, fd2: string, td2: string) {
        return {
            range1: `${this.formatDate(fd1)} - ${this.formatDate(td1)}`,
            range2: `${this.formatDate(fd2)} - ${this.formatDate(td2)}`
        };
    }
    private generateFilename(orgId: number, fd1: string, td1: string, fd2: string, td2: string): string {
        const randomId = Math.floor(Math.random() * 1000000);
        return `reports/cohortreport/${orgId}/${orgId}-${randomId}-Cohort-Data-Report-R1_From_${fd1}_To_${td1}_R2_From_${fd2}_To_${td2}.xlsx`;
    }
    private async findPendingReport(): Promise<any> {
        const [result] = await this.dataSource.query(
            `SELECT * FROM ha_cohortreports WHERE status = 0 AND flage = 0 AND system_type = '1' ORDER BY request_date ASC LIMIT 1`
        );
        if (result) {
            await this.dataSourceWrite.query(`UPDATE ha_cohortreports SET flage = 1 WHERE id = ?`, [result.id]);
            return result;
        }
        return null;
    }
    private async getUsersWithDetails(condition: string, companyId: number): Promise<any[]> {
        const whereClause = condition?.trim()
            ? `u.org_id = ${companyId} AND ${condition.replace(/User\./g, 'u.')}`
            : `u.org_id = ${companyId}`;

        return this.dataSource.query(`
            SELECT u.id, u.role_id, u.is_camp_eligible, u.code, u.first_name, u.middle_name, u.last_name,
                   u.dob, UPPER(u.gender) as gender, d.dept_name, l.location_name, c.company_name
            FROM s_users u
            LEFT JOIN c_departments d ON u.department_id = d.id
            LEFT JOIN c_locations l ON u.location = l.id
            LEFT JOIN c_companies c ON u.org_id = c.id
            WHERE ${whereClause}
        `);
    }
    private buildSourceConditions(sourceIds: string): { srccond:  string; srccond_ha_hr: string } {
        if (!sourceIds) return { srccond: '', srccond_ha_hr: '' };

        const sources = sourceIds.split(',').filter(Boolean);
        if (!sources.length) return { srccond: '', srccond_ha_hr: '' };

        const sourceMap = {
            '1': { main: 'source IN (1,13,14,15)', hr: 'source IN (1,13,14,15)' },
            '3': { main: '(source IN (3,11,12) OR (source = 2 AND enter_by != 0))', hr: 'source IN (3,11,12)' },
            '2': { main: 'source = 2 AND enter_by = 0', hr: 'source = 2' }
        };

        if (sources.length === 1) {
            const mapping = sourceMap[sources[0]];
            return mapping
                ? { srccond: ` AND ${mapping.main}`, srccond_ha_hr: ` AND ${mapping.hr}` }
                : { srccond: ` AND source = ${sources[0]} AND enter_by = 0`, srccond_ha_hr: ` AND source = ${sources[0]}` };
        }

        const has = (src: string) => sources.includes(src);

        if (sources.length === 2) {
            if (has('1') && has('2')) {
                return {
                    srccond: ' AND (source IN (1,13,14,15) OR (source = 2 AND enter_by = 0))',
                    srccond_ha_hr: ' AND source IN (1,2,13,14,15)'
                };
            }
            if (has('2') && has('3')) {
                return {
                    srccond: ' AND (source IN (3,11,12) OR source = 2)',
                    srccond_ha_hr: ' AND source IN (2,3,11,12)'
                };
            }
            if (has('1') && has('3')) {
                return {
                    srccond: ' AND (source IN (1,3,11,12,13,14,15) OR (source = 2 AND enter_by != 0))',
                    srccond_ha_hr: ' AND source IN (1,3,11,12,13,14,15)'
                };
            }
        }

        return {
            srccond: ' AND (source IN (1,3,11,12,13,14,15) OR source = 2)',
            srccond_ha_hr: ' AND source IN (1,2,3,11,12,13,14,15)'
        };
    }
    private buildBiometricQuery(
        table: any,
        fd1: string,
        td1: string,
        fd2: string,
        td2: string,
        userIds: string,
        srcCond: string
    ): string {
        const dateRangeCase = `CASE WHEN ${table.dateField} BETWEEN '${fd1}' AND '${td1}' THEN '1' ELSE '2' END as Datarange`;
        const dateCondition = `((${table.dateField} BETWEEN '${fd1}' AND '${td1}') OR (${table.dateField} BETWEEN '${fd2}' AND '${td2}'))`;
        const whereClause = `WHERE ${dateCondition} AND user_id IN(${userIds}) ${srcCond} AND status != 2`;

        if (table.table === 'hc_biometrics') {
            return `
            SELECT ${dateRangeCase},
                   id, user_id, height, weight, bmi, systolic, diastolic, blood_glucose, alc,
                   total_cholesterol, hdl, ldl, triglycerides, waist, test_type, source, 
                   ${table.enterByField} as enter_by, ${table.dateField} as created
            FROM ${table.table}
            ${whereClause}
        `;
        }

        if (table.table === 'ha_hrabiometrics') {
            return `
            SELECT ${dateRangeCase},
                   id, user_id, CONCAT(height_ft, ':', height_in) as height, weight,
                   TRUNCATE((weight * 703)/(((height_ft*12)+height_in)*((height_ft*12)+height_in)), 4) as bmi,
                   bp_systolic as systolic, bp_diastolic as diastolic, blood_glucose, alc,
                   total_cholesterol, hdl, ldl, triglycerides, waist, test_type, source,
                   ${table.enterByField} as enter_by, ${table.dateField} as created
            FROM ${table.table}
            ${whereClause}
        `;
        }

        return `
        SELECT ${dateRangeCase},
               id, user_id, CONCAT(height_ft, ':', height_in) as height, weight,
               TRUNCATE((weight * 703)/(((height_ft*12)+height_in)*((height_ft*12)+height_in)), 4) as bmi,
               systolic, diastolic, glucose as blood_glucose, null as alc,
               chol_total as total_cholesterol, hdl, ldl, triglycerides, null as waist,
               glucose_type as test_type, source,
               ${table.enterByField} as enter_by, ${table.dateField} as created
        FROM ${table.table}
        ${whereClause}
    `;
    }
    private async getBiometricData(
        fd1: string,
        td1: string,
        fd2: string,
        td2: string,
        userIds: string,
        srcCond: { srccond: string; srccond_ha_hr: string }
    ): Promise<any> {
        const queries = [
            this.buildBiometricQuery(this.BIOMETRIC_TABLES[0], fd1, td1, fd2, td2, userIds, srcCond.srccond),
            this.buildBiometricQuery(this.BIOMETRIC_TABLES[1], fd1, td1, fd2, td2, userIds, srcCond.srccond_ha_hr),
            this.buildBiometricQuery(this.BIOMETRIC_TABLES[2], fd1, td1, fd2, td2, userIds, srcCond.srccond_ha_hr)
        ];

        const unionQuery = `
            SELECT * FROM (
                ${queries.join(' UNION ALL ')}
            ) as bio
            WHERE height != '' OR weight != '' OR waist != '' OR alc != '' OR bmi != '' 
            OR systolic != '' OR diastolic != '' OR total_cholesterol != '' OR hdl != '' 
            OR ldl != '' OR triglycerides != '' OR blood_glucose != ''
            ORDER BY created DESC, id DESC
        `;

        const results = await this.dataSource.query(unionQuery);
        return this.organizeBiometricData(results);
    }
    private organizeBiometricData(results: any[]): any {
        const bioByUser = new Map<string, any[]>();
        results.forEach(row => {
            if (!bioByUser.has(row.user_id)) {
                bioByUser.set(row.user_id, []);
            }
            bioByUser.get(row.user_id)!.push(row);
        });

        const bioTempData: any = { '1': {}, '2': {} };
        const importantFields = ['height', 'weight', 'bmi', 'systolic', 'diastolic', 'blood_glucose', 'alc', 'total_cholesterol', 'hdl', 'ldl', 'triglycerides'];

        for (const [userId, userBios] of bioByUser) {
            const byRange: any = { '1': [], '2': [] };

            userBios.forEach(bio => {
                if (bio.Datarange) byRange[bio.Datarange].push(bio);
            });

            ['1', '2'].forEach(range => {
                if (!byRange[range].length) return;

                bioTempData[range][userId] = { ...byRange[range][0] };

                for (const bio of byRange[range]) {
                    for (const field of importantFields) {
                        if (!bioTempData[range][userId][field] && bio[field]) {
                            bioTempData[range][userId][field] = bio[field];
                        }
                    }
                    if (importantFields.every(f => bioTempData[range][userId][f])) break;
                }
            });
        }

        return { ...bioTempData['1'], ...bioTempData['2'] };
    }
    private async getBiometricCounts(
        fd1: string,
        td1: string,
        fd2: string,
        td2: string,
        userIds: string,
        srcCond: { srccond: string; srccond_ha_hr: string }
    ): Promise<{ biototalfirstyear: any; biototalsecondyear: any }> {
        const buildCountQuery = (table: string, dateField: string, condition: string) => `
            SELECT CASE WHEN ${dateField} BETWEEN '${fd1}' AND '${td1}' THEN '1' ELSE '2' END as datarange, user_id
            FROM ${table}
            WHERE ((${dateField} BETWEEN '${fd1}' AND '${td1}') OR (${dateField} BETWEEN '${fd2}' AND '${td2}'))
              AND user_id IN(${userIds}) ${condition} AND status != 2
            GROUP BY user_id, datarange
        `;

        const queries = [
            buildCountQuery('hc_biometrics', 'created', srcCond.srccond),
            buildCountQuery('ha_hrabiometrics', 'date', srcCond.srccond_ha_hr),
            buildCountQuery('ft_biomatrics', 'added_date', srcCond.srccond_ha_hr)
        ];

        const results = await Promise.all(queries.map(q => this.dataSource.query(q)));

        const organize = (data: any[]) => {
            const org: any = { '1': {}, '2': {} };
            data.forEach(row => {
                const rng = row.datarange || '1';
                org[rng][row.user_id] = row;
            });
            return org;
        };

        const organized = results.map(organize);

        return {
            biototalfirstyear: { ...organized[0]['1'], ...organized[1]['1'], ...organized[2]['1'] },
            biototalsecondyear: { ...organized[0]['2'], ...organized[1]['2'], ...organized[2]['2'] }
        };
    }
    private async getAssessmentData(
        fd1: string,
        td1: string,
        fd2: string,
        td2: string,
        userIds: string,
        companyId: number
    ): Promise<{ assessmentData: any[]; questions: any[]; questionAnswers: any }> {
        const queries = [
            `SELECT *, CASE WHEN date BETWEEN '${fd1}' AND '${td1}' THEN '1' ELSE '2' END as datarange,
                    CONCAT_WS(',', \`1\`, \`2\`, \`3\`, \`4\`, \`5\`) AS opts
             FROM ha_assessments
             WHERE status != 2 AND user_id IN(${userIds})
             GROUP BY user_id, datarange
             ORDER BY date DESC, id DESC`,

            `SELECT question_title, id FROM ha_questions
             WHERE language_id = 1 AND id != 144
               AND CONCAT(',', company_id, ',') REGEXP ',(${companyId}),'
             ORDER BY questioncat_id`,

            `SELECT Opt.* FROM ha_options as Opt
             INNER JOIN ha_questions as Que ON Que.id = Opt.question_id
             WHERE CONCAT(',', Que.company_id, ',') REGEXP ',(${companyId}),'`
        ];

        const [assessmentData, questions, options] = await Promise.all(queries.map(q => this.dataSource.query(q)));
        const questionAnswers = Object.fromEntries(options.map((opt: any) => [opt.id, opt]));

        return { assessmentData, questions, questionAnswers };
    }
    private async filterUsersByCampaign(
        report: any,
        companyId: number,
        users: any[],
        totalUser: number
    ): Promise<any> {
        if (!report.campaign_id) return {};

        try {
            const activePlugins = await this.activePluginService.getActivePluginList(companyId);
            const campaign = await this.getCampaignDetails(companyId, report.campaign_id);
            if (!campaign) return {};

            const { rewardsIds, activitiesIds } = this.parseCampaignActivities(report.Campaignactivity);

            const conditions: any = { status: '1', campaign_id: report.campaign_id };
            if (activitiesIds.length > 0) conditions.id = activitiesIds;

            const activities = await this.campaignDashboardService.rewardItemGetDetails('campaign_activity', conditions);
            const membershipCode = await this.companyService.getCompanyCodeFromId(companyId);

            let campaignUserIds: number[] = [];

            if (rewardsIds.length > 0) {
                campaignUserIds = await this.processRewardUsers(
                    report, companyId, users, totalUser,
                    activePlugins, membershipCode, rewardsIds
                );
            }

            if (activities.length > 0) {
                const activityUserIds = await this.processActivityUsers(
                    activities, companyId, activePlugins, membershipCode
                );
                campaignUserIds = [...new Set([...campaignUserIds, ...activityUserIds])];
            }

            const filteredUsers: any = {};
            campaignUserIds.forEach(id => {
                if (users.find(u => u.id === id)) {
                    filteredUsers[id] = true;
                }
            });

            return filteredUsers;
        } catch (error) {
            console.error('Error filtering users by campaign:', error);
            return {};
        }
    }
    private parseCampaignActivities(campaignActivity: string): { rewardsIds: number[]; activitiesIds: number[] } {
        const rewardsIds: number[] = [];
        const activitiesIds: number[] = [];

        if (!campaignActivity) return { rewardsIds, activitiesIds };

        campaignActivity.split(',').forEach((value: string) => {
            const parts = value.split('-');
            if (parts[0] === 'rew') {
                rewardsIds.push(parseInt(parts[1]));
            } else if (parts[0] === 'act') {
                activitiesIds.push(parseInt(parts[1]));
            }
        });

        return { rewardsIds, activitiesIds };
    }
    private async processRewardUsers(
        report: any,
        companyId: number,
        users: any[],
        totalUser: number,
        activePlugins: any,
        membershipCode: string,
        rewardsIds: number[]
    ): Promise<number[]> {
        const allUsersInfo = Object.fromEntries(users.map(u => [u.id, { User: u }]));

        const rewards = await this.campaignDashboardService.getRewardsData(
            { campaign_id: report.campaign_id },
            { order_id: 'ASC' }
        );

        const userDataArray = [
            { 'activePlugins': activePlugins },
            { 'company_id': companyId },
            { 'membershipCode': membershipCode }
        ];

        const rewardsDatas = await this.campaignDashboardService.getMultiRewarddatas(11, rewards, userDataArray);

        const camOtherData = [
            { 'membershipCode': membershipCode },
            { 'totalUsers': totalUser },
            { 'company_id': companyId },
            { 'activePlugins': activePlugins }
        ];

        const rewardWiseUserDatas: any = await this.frontCalculationService.getCampaignUserCalculation(
            11,
            JSON.parse(JSON.stringify(rewardsDatas)),
            camOtherData
        );

        const eligibleUsers: number[] = [];
        const rewardWiseUsers = Array.isArray(rewardWiseUserDatas) ? rewardWiseUserDatas : Object.values(rewardWiseUserDatas);

        for (const userId in allUsersInfo) {
            if (this.isUserEligibleForReward(userId, allUsersInfo[userId], rewardWiseUsers)) {
                eligibleUsers.push(parseInt(userId));
            }
        }

        return eligibleUsers;
    }
    private isUserEligibleForReward(userId: string, userInfo: any, rewardWiseUsers: any[]): boolean {
        const actRoleId = userInfo.User.role_id;

        for (const rw of rewardWiseUsers) {
            for (const myid in rw.Rewards) {
                const r = rw.Rewards[myid];

                if (!r.complete) r.complete = 0;

                const uTotalAct = rw.userActivityTotal?.[userInfo.User.id]?.Total || 0;
                let totalP = rw.userPointsTotal?.[userInfo.User.id]?.Total || 0;
                totalP = Math.round(totalP);

                if (r.consider_require == 1) {
                    const remainPoints = rw.userActivityTotal?.[userInfo.User.id]?.remainPoints || 0;
                    if (remainPoints > 0 && totalP > (r.point - remainPoints)) {
                        totalP = r.point - remainPoints;
                    } else if (totalP > r.point) {
                        totalP = r.point;
                    }
                    totalP = Math.max(0, totalP);
                }

                const targetPoint = actRoleId == 2 ? r.point : r.pointS;
                const totalActivity = actRoleId == 2 ? rw.totalActivity : rw.totalActivityS;

                if ((targetPoint != '' && targetPoint != 0) || totalP != 0) {
                    const metCondition = (totalActivity == 0 || r.consider_require == 0) && totalP >= targetPoint ||
                        (totalActivity <= uTotalAct || r.consider_require == 0) && totalP >= targetPoint;

                    if (metCondition) {
                        if ((rw.reward?.user_eligible == 0) || userInfo.User.is_camp_eligible == 1) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
    private async processActivityUsers(
        activities: any[],
        companyId: number,
        activePlugins: any,
        membershipCode: string
    ): Promise<number[]> {
        const otherDatas = [
            { 'activePlugins': activePlugins },
            { 'company_id': companyId },
            { 'membershipCode': membershipCode }
        ];

        const activityDatas = await this.frontPointsForService.points_for_activities_report(11, activities, otherDatas);
        return Object.keys(activityDatas.userData || {}).map(Number);
    }
    private async getCampaignDetails(companyId: number, campaignId: number): Promise<any> {
        const campaign = await this.dataSource.query(
            `SELECT * FROM in_campaign 
             WHERE organization_id = ? AND id = ? AND status = '1' 
             ORDER BY end_date ASC LIMIT 1`,
            [companyId, campaignId]
        );
        return campaign[0] || null;
    }
    private async processReportData(
        users: any[], bioData: any, assessments: any[], questions: any[], qAnswers: any,
        userGenderMap: any, yearCounter: string[], yr1: string, yr2: string,
        lbl1: string, lbl2: string, bioTotal1: any, bioTotal2: any
    ): Promise<any> {
        const defaultData = {
            HDate: '', OverallScore: '', CurrentHealth: '', CurrentHealthLevel: '',
            PreventionSection: '', PreventionSectionLevel: '', NutritionSection: '',
            NutritionSectionLevel: '', ExerciseSection: '', ExerciseSectionLevel: '',
            EmotionalHealth: '', EmotionalHealthLevel: '', BDate: '', height: '',
            weight: '', bmi: '', bmiLevel: '', systolic: '', systolicLevel: '',
            diastolic: '', diastolicLevel: '', blood_glucose: '', blood_glucoseLevel: '',
            testtype: '', alc: '', alcLevel: '', hdl: '', hdlLevel: '', ldl: '',
            ldlLevel: '', total_cholesterol: '', total_cholesterolLevel: '',
            triglycerides: '', triglyceridesLevel: '', source: '',
        };

        const dataArr: any = {};
        const assessmentsLen = assessments.length;

        for (let i = 0; i < assessmentsLen; i++) {
            const ass = assessments[i];
            const uid = ass.user_id;
            const rng = ass.datarange;

            if (!dataArr[uid]) dataArr[uid] = {};
            if (!dataArr[uid][rng]) dataArr[uid][rng] = { ...defaultData };

            const scores = this.calculateHRAScores(ass);
            const userRng = dataArr[uid][rng];
            userRng.HDate = this.formatDate(ass.date);
            Object.assign(userRng, {
                OverallScore: scores.overall,
                CurrentHealth: scores.score1,
                CurrentHealthLevel: scores.risk1,
                PreventionSection: scores.score2,
                PreventionSectionLevel: scores.risk2,
                NutritionSection: scores.score3,
                NutritionSectionLevel: scores.risk3,
                ExerciseSection: scores.score4,
                ExerciseSectionLevel: scores.risk4,
                EmotionalHealth: scores.score5,
                EmotionalHealthLevel: scores.risk5
            });

            if (ass.opts) {
                const opts = ass.opts.toString().replace(/,+/g, ',').replace(/^,|,$/g, '').split(',');
                if (!userRng.quans) userRng.quans = {};

                const optsLen = opts.length;
                for (let j = 0; j < optsLen; j++) {
                    const optId = opts[j];
                    if (!optId) continue;

                    const opt = qAnswers[optId];
                    if (opt) {
                        const qId = opt.question_id;
                        userRng.quans[qId] = userRng.quans[qId]
                            ? `${userRng.quans[qId]},${opt.option_title}`
                            : opt.option_title;
                    }
                }
            }
        }

        const stats: any = {
            '1': this.initializeBiometricStats(),
            '2': this.initializeBiometricStats(),
            '1-2': {},
        };

        for (const uid in bioData) {
            const bio = bioData[uid];
            if (!bio?.Datarange) continue;

            const yr = bio.Datarange;
            if (!dataArr[uid]) dataArr[uid] = {};
            if (!dataArr[uid][yr]) dataArr[uid][yr] = { ...defaultData };

            const processedBio = this.processBiometricValues(bio, userGenderMap[uid] || 'MALE');
            Object.assign(dataArr[uid][yr], processedBio);
            this.updateBiometricStatistics(stats[yr], processedBio);
        }

        this.calculateAveragesAndVariances(stats, yr1, yr2, bioTotal1, bioTotal2);
        const columnNames = this.buildColumnNames(questions, yr1, yr2, lbl1, lbl2);
        const dataArrays = this.buildDataArrays(users, dataArr, questions, yearCounter, yr1, yr2, stats, bioTotal1, bioTotal2, lbl1, lbl2);

        const sheetTitles = [
            lbl1, lbl2, `Cohort Range ${yr1}-${yr2}`, 'Data Calculations',
            `Range ${yr1} Averages`, `Range ${yr2} Averages`, 'Variance', 'Average-Variance',
            `Sys BP (Range ${yr1} & Range ${yr2})`, `Dias BP (Range ${yr1} & Range ${yr2})`,
            `Glucose (Range ${yr1} & Range ${yr2})`, `TC (Range ${yr1} & Range ${yr2})`,
            `HDL (Range ${yr1} & Range ${yr2})`, `Tri (Range ${yr1} & Range ${yr2})`,
            `LDL (Range ${yr1} & Range ${yr2})`
        ];

        return { clm_name_arr: columnNames, clm_data_arr: dataArrays, sheet_title: sheetTitles };
    }
    private calculateHRAScores(ass: any): any {
        const scores: any = { overall: '', score1: '', risk1: '', score2: '', risk2: '', score3: '', risk3: '', score4: '', risk4: '', score5: '', risk5: '' };
        if (!ass.opts) return scores;

        let totalScore = 0, totalWorst = 0;
        const sectionKeys = ['1_qscore', '2_qscore', '3_qscore', '4_qscore', '5_qscore'];
        const worstKeys = ['1_WorstScore', '2_WorstScore', '3_WorstScore', '4_WorstScore', '5_WorstScore'];

        for (let i = 0; i < 5; i++) {
            totalScore += Math.abs(parseFloat(ass[sectionKeys[i]]) || 0);
            totalWorst += Math.abs(parseFloat(ass[worstKeys[i]] || ass[worstKeys[i].toLowerCase()]) || 0);
        }

        if (totalWorst !== 0) {
            scores.overall = ((1 - (totalScore / totalWorst)) * 100).toFixed(2);
        }

        for (let i = 1; i <= 5; i++) {
            if (!ass[i.toString()]) continue;

            const worstVal = ass[`${i}_WorstScore`] || ass[`${i}_worstscore`];
            if (!worstVal || parseFloat(worstVal) === 0) continue;

            const qscore = Math.abs(parseFloat(ass[`${i}_qscore`]) || 0);
            const worst = Math.abs(parseFloat(worstVal));
            const sec = Math.round((1 - (qscore / worst)) * 100);

            scores[`score${i}`] = sec.toFixed(2);
            scores[`risk${i}`] = sec <= 69 ? this.RISK_LEVELS.HIGH : sec <= 89 ? this.RISK_LEVELS.MODERATE : this.RISK_LEVELS.LOW;
        }

        return scores;
    }
    private initializeBiometricStats(): any {
        const stats: any = {};
        const len = this.BIOMETRIC_FIELDS.length;

        for (let i = 0; i < len; i++) {
            const f = this.BIOMETRIC_FIELDS[i];
            stats[f] = 0;
            stats[`${f}avg`] = 0;
            stats[`${f}count`] = 0;
            stats[`${f}countavg`] = 0;
            if (f !== 'weight') {
                stats[`${f}risk`] = { 'Very High Risk': 0, 'High Risk': 0, 'Moderate Risk': 0, 'Low Risk': 0 };
            }
        }
        return stats;
    }
    private processBiometricValues(bio: any, gender: string): any {
        const processed: any = {
            BDate: bio.created ? this.formatDate(bio.created) : '',
            height: (bio.height === ':0' || bio.height === ':') ? '' : bio.height,
            weight: bio.weight ?? '',
            bmi: bio.bmi ?? '',
            bmiLevel: '',
            systolic: bio.systolic ?? '',
            systolicLevel: '',
            diastolic: bio.diastolic ?? '',
            diastolicLevel: '',
            blood_glucose: bio.blood_glucose ?? '',
            blood_glucoseLevel: '',
            testtype: bio.test_type == 1 ? 'Random' : bio.test_type == 2 ? 'Fasting' : '',
            alc: bio.alc ?? '',
            alcLevel: '',
            hdl: bio.hdl ?? '',
            hdlLevel: '',
            ldl: bio.ldl ?? '',
            ldlLevel: '',
            total_cholesterol: bio.total_cholesterol ?? '',
            total_cholesterolLevel: '',
            triglycerides: bio.triglycerides ?? '',
            triglyceridesLevel: '',
            source: this.getSourceLabel(bio.source, bio.enter_by),
        };

        const riskCalc = [
            { field: 'bmi', thresholds: [35, 30, 25], levels: [this.RISK_LEVELS.VERY_HIGH, this.RISK_LEVELS.HIGH, this.RISK_LEVELS.MODERATE, this.RISK_LEVELS.LOW] },
            { field: 'systolic', thresholds: [160, 140, 120], levels: [this.RISK_LEVELS.VERY_HIGH, this.RISK_LEVELS.HIGH, this.RISK_LEVELS.MODERATE, this.RISK_LEVELS.LOW] },
            { field: 'diastolic', thresholds: [100, 90, 80], levels: [this.RISK_LEVELS.VERY_HIGH, this.RISK_LEVELS.HIGH, this.RISK_LEVELS.MODERATE, this.RISK_LEVELS.LOW] },
            { field: 'blood_glucose', thresholds: [126, 100], levels: [this.RISK_LEVELS.HIGH, this.RISK_LEVELS.MODERATE, this.RISK_LEVELS.LOW] },
            { field: 'alc', thresholds: [8, 7.5, 6], levels: [this.RISK_LEVELS.VERY_HIGH, this.RISK_LEVELS.HIGH, this.RISK_LEVELS.MODERATE, this.RISK_LEVELS.LOW] },
            { field: 'ldl', thresholds: [160, 130, 100], levels: [this.RISK_LEVELS.VERY_HIGH, this.RISK_LEVELS.HIGH, this.RISK_LEVELS.MODERATE, this.RISK_LEVELS.LOW] },
            { field: 'total_cholesterol', thresholds: [240, 200], levels: [this.RISK_LEVELS.HIGH, this.RISK_LEVELS.MODERATE, this.RISK_LEVELS.LOW] },
            { field: 'triglycerides', thresholds: [500, 200, 150], levels: [this.RISK_LEVELS.VERY_HIGH, this.RISK_LEVELS.HIGH, this.RISK_LEVELS.MODERATE, this.RISK_LEVELS.LOW] }
        ];

        const calcLen = riskCalc.length;
        for (let i = 0; i < calcLen; i++) {
            const { field, thresholds, levels } = riskCalc[i];
            if (bio[field]) {
                const v = parseFloat(bio[field]);
                let lvl = levels[levels.length - 1];
                const thLen = thresholds.length;
                for (let j = 0; j < thLen; j++) {
                    if (v >= thresholds[j]) {
                        lvl = levels[j];
                        break;
                    }
                }
                processed[`${field}Level`] = lvl;
            }
        }

        if (bio.hdl) {
            const v = parseFloat(bio.hdl);
            processed.hdlLevel = v < 50 ? this.RISK_LEVELS.HIGH : v <= 59 ? this.RISK_LEVELS.MODERATE : this.RISK_LEVELS.LOW;
        }

        return processed;
    }
    private getSourceLabel(source: number | string, enterBy: number | string): string {
        if (!source) return 'User Entered';
        const srcStr = source.toString();
        if (srcStr === '2') {
            return enterBy?.toString() === '0' ? 'Admin Entered' : 'Physician Entered';
        }
        return this.SOURCE_MAP[srcStr] || 'Physician Entered';
    }
    private updateBiometricStatistics(stats: any, bio: any): void {
        const fields = ['weight', 'bmi', 'systolic', 'diastolic', 'blood_glucose', 'alc', 'hdl', 'ldl', 'total_cholesterol', 'triglycerides'];
        const len = fields.length;

        for (let i = 0; i < len; i++) {
            const name = fields[i];
            const val = bio[name];

            if (val !== '' && val !== null && val !== undefined) {
                const value = parseFloat(val);
                if (!isNaN(value)) {
                    stats[name] += value;
                    if (name !== 'weight') {
                        stats[`${name}count`]++;
                        const level = bio[`${name}Level`];
                        if (level && stats[`${name}risk`][level] !== undefined) {
                            stats[`${name}risk`][level]++;
                        }
                    }
                }
            }
        }
    }
    private calculateAveragesAndVariances(stats: any, yr1: string, yr2: string, bioTotal1: any, bioTotal2: any): void {
        const len1 = Object.keys(bioTotal1).length;
        const len2 = Object.keys(bioTotal2).length;
        const fieldsLen = this.BIOMETRIC_FIELDS.length;

        for (let i = 0; i < fieldsLen; i++) {
            const field = this.BIOMETRIC_FIELDS[i];

            if (len1 > 0) {
                if (field === 'weight') {
                    stats[yr1][`${field}avg`] = stats[yr1][field];
                    stats[yr1][`${field}countavg`] = stats[yr1][field] / len1;
                } else {
                    const cnt = stats[yr1][`${field}count`];
                    if (cnt > 0) {
                        const avg = stats[yr1][field] / cnt;
                        stats[yr1][`${field}avg`] = avg;
                        stats[yr1][`${field}countavg`] = avg;
                    }
                }
            }

            if (len2 > 0) {
                if (field === 'weight') {
                    stats[yr2][`${field}avg`] = stats[yr2][field];
                    stats[yr2][`${field}countavg`] = stats[yr2][field] / len2;
                } else {
                    const cnt = stats[yr2][`${field}count`];
                    if (cnt > 0) {
                        const avg = stats[yr2][field] / cnt;
                        stats[yr2][`${field}avg`] = avg;
                        stats[yr2][`${field}countavg`] = avg;
                    }
                }
            }

            stats[`${yr1}-${yr2}`][`${field}avgvar`] = stats[yr2][`${field}avg`] - stats[yr1][`${field}avg`];

            if (field !== 'weight') {
                const riskLevels = ['Very High Risk', 'High Risk', 'Moderate Risk', 'Low Risk'];
                for (let j = 0; j < 4; j++) {
                    const level = riskLevels[j];
                    const first = stats[yr1][`${field}risk`]?.[level] || 0;
                    const second = stats[yr2][`${field}risk`]?.[level] || 0;
                    const levelKey = level.toLowerCase().replace(/ /g, '');
                    stats[`${yr1}-${yr2}`][`${field}${levelKey}var`] = second - first;
                }
            }
        }
    }
    private buildColumnNames(questions: any[], yr1: string, yr2: string, lbl1: string, lbl2: string): any[] {
        const baseHeaders = ['User ID', 'Organization', 'Department', 'Location', 'First Name', 'Middle Name', 'Last Name', 'Birth Date', 'Gender', 'Overall Score', 'Current Health Section Score', 'Current Health Risk Level', 'Prevention Section Score', 'Prevention Risk Level', 'Nutrition Section Score', 'Nutrition Risk Level', 'Exercise Section Score', 'Exercise Risk Level', 'Emotional Health Section Score', 'Emotional Health Risk Level'];
        const questionHeaders = questions.map(q => q.question_title);
        const biometricHeaders = ['HRA Taken Date', 'Height', 'Weight', 'BMI', 'BMI Risk Level', 'Blood Pressure - Systolic', 'Blood Pressure - Systolic Risk Level', 'Blood Pressure - Diastolic', 'Blood Pressure - Diastolic Risk Level', 'Blood Glucose', 'Blood Glucose Risk Level', 'Test Type', 'A1C', 'A1C Risk Level', 'HDL', 'HDL Risk Level', 'LDL', 'LDL Risk Level', 'Total Cholesterol', 'Total Cholesterol Risk Level', 'Triglycerides', 'Triglycerides Risk Level', 'Source - Entered By', 'Biometric Date', 'Entered Date'];

        const sheet1Headers = [...baseHeaders, ...questionHeaders, ...biometricHeaders];
        const sheet3Headers = ['User ID', `${yr1} Physician Form`, `${yr2} Physician Form`, `Start Range ${yr1}`, `${yr1} Weight`, `${yr1} BMI`, `${yr1} BMI Risk Level`, `${yr1} Blood Pressure - Systolic`, `${yr1} Blood Pressure - Systolic Risk Level`, `${yr1} Blood Pressure - Diastolic`, `${yr1} Blood Pressure - Diastolic Risk Level`, `${yr1} Blood Glucose`, `${yr1} Blood Glucose Risk Level`, `${yr1} Test Type`, `${yr1} A1C`, `${yr1} A1C Risk Level`, `${yr1} HDL`, `${yr1} HDL Risk Level`, `${yr1} LDL`, `${yr1} LDL Risk Level`, `${yr1} Total Cholesterol`, `${yr1} Total Cholesterol Risk Level`, `${yr1} Triglycerides`, `${yr1} Triglycerides Risk Level`, `Start Range ${yr2}`, `${yr2} Weight`, `${yr2} BMI`, `${yr2} BMI Risk Level`, `${yr2} Blood Pressure - Systolic`, `${yr2} Blood Pressure - Systolic Risk Level`, `${yr2} Blood Pressure - Diastolic`, `${yr2} Blood Pressure - Diastolic Risk Level`, `${yr2} Blood Glucose`, `${yr2} Blood Glucose Risk Level`, `${yr2} Test Type`, `${yr2} A1C`, `${yr2} A1C Risk Level`, `${yr2} HDL`, `${yr2} HDL Risk Level`, `${yr2} LDL`, `${yr2} LDL Risk Level`, `${yr2} Total Cholesterol`, `${yr2} Total Cholesterol Risk Level`, `${yr2} Triglycerides`, `${yr2} Triglycerides Risk Level`];

        return [sheet1Headers, sheet1Headers, sheet3Headers, [lbl1, lbl2, '', `Range ${yr1}`, '', '', `Range ${yr2}`, ''], []];
    }
    private buildAllIndividualBiometricSheets(dataArr: any, users: any[], yr1: string, yr2: string, lbl1: string, lbl2: string): any {
        const fields = ['systolic', 'diastolic', 'blood_glucose', 'total_cholesterol', 'hdl', 'triglycerides', 'ldl'];
        const fieldLabels: any = {
            systolic: 'Systolic Blood Pressure',
            diastolic: 'Diastolic Blood Pressure',
            blood_glucose: 'Glucose',
            total_cholesterol: 'Total Cholesterol',
            hdl: 'HDL',
            triglycerides: 'Triglycerides',
            ldl: 'LDL'
        };

        const sheets: any = {};
        const averages: any = {};
        const fieldsLen = fields.length;

        for (let i = 0; i < fieldsLen; i++) {
            const f = fields[i];
            sheets[f] = [[
                '', '', '', '', '', '',
                'S.No',
                `Number of Individuals Range ${yr1}`,
                `${fieldLabels[f]} Range ${yr1}`,
                'S.No',
                `Number of Individuals Range ${yr2}`,
                `${fieldLabels[f]} Range ${yr2}`
            ]];
            averages[f] = { first: [], second: [] };
        }

        const counters: any = {};
        for (let i = 0; i < fieldsLen; i++) {
            counters[fields[i]] = 1;
        }

        const usersLen = users.length;
        for (let i = 0; i < usersLen; i++) {
            const u = users[i];
            const uid = u.id;

            for (let j = 0; j < fieldsLen; j++) {
                const f = fields[j];
                const val1 = dataArr[uid]?.[yr1]?.[f];
                const val2 = dataArr[uid]?.[yr2]?.[f];
                const has1 = val1 !== undefined && val1 !== null && val1 !== '';
                const has2 = val2 !== undefined && val2 !== null && val2 !== '';

                if (has1 || has2) {
                    const cnt = counters[f];
                    sheets[f].push([
                        '', '', '', '', '', '',
                        cnt.toString(),
                        `Individual ${cnt}`,
                        val1 || '',
                        cnt.toString(),
                        `Individual ${cnt}`,
                        val2 || ''
                    ]);

                    if (has1 && !isNaN(parseFloat(val1))) averages[f].first.push(parseFloat(val1));
                    if (has2 && !isNaN(parseFloat(val2))) averages[f].second.push(parseFloat(val2));
                    counters[f]++;
                }
            }
        }

        for (let i = 0; i < fieldsLen; i++) {
            const f = fields[i];
            if (sheets[f].length > 1) {
                const sum1 = averages[f].first.reduce((a, b) => a + b, 0);
                const sum2 = averages[f].second.reduce((a, b) => a + b, 0);
                const avg1 = averages[f].first.length > 0 ? sum1 / averages[f].first.length : 0;
                const avg2 = averages[f].second.length > 0 ? sum2 / averages[f].second.length : 0;

                sheets[f][1][5] = lbl1;
                sheets[f][1][12] = lbl2;
                sheets[f][2] = sheets[f][2] || [];
                sheets[f][2][5] = 'Average';
                sheets[f][2][12] = 'Average';
                sheets[f][3] = sheets[f][3] || [];
                sheets[f][3][5] = avg1.toFixed(2);
                sheets[f][3][12] = avg2.toFixed(2);
            }
        }

        return {
            clm_data_sheet9: sheets.systolic,
            clm_data_sheet10: sheets.diastolic,
            clm_data_sheet11: sheets.blood_glucose,
            clm_data_sheet12: sheets.total_cholesterol,
            clm_data_sheet13: sheets.hdl,
            clm_data_sheet14: sheets.triglycerides,
            clm_data_sheet15: sheets.ldl
        };
    }
    private buildAveragesSheet(stats: any, yr: string, bioTotal: any): any[] {
        const totalParticipants = Object.keys(bioTotal).length;
        const sheet: any[] = [
            Array(5).fill(''),
            Array(5).fill(`Range ${yr} Averages`),
            Array(5).fill(''),
            Array(5).fill(''),
            ['Total Number of Participants', totalParticipants.toString(), 'Very High', 'High', 'Medium', 'Low'],
            ['Weight', (stats.weightavg || 0).toFixed(2)]
        ];

        const metrics = [
            { name: 'BMI', key: 'bmi', ranges: ['> 35', '30-35', '25 to 29.99', '< 25'] },
            { name: 'Blood Pressure Systolic', key: 'systolic', ranges: ['> 160', '140 - 160', '120 to 139', '< 120'] },
            { name: 'Blood Pressure Diastolic', key: 'diastolic', ranges: ['> 100', '90 - 100', '80 to 89', '< 80'] },
            { name: 'Blood Glucose', key: 'blood_glucose', ranges: ['', '>= 126', '100 - 125', '< 100'] },
            { name: 'A1c', key: 'alc', ranges: ['> 8.0%', '> 7.5 to 8.0%', '6.0 to 7.5 %', '<= 5.9 %'] },
            { name: 'Total Cholesterol', key: 'total_cholesterol', ranges: ['', '> 240', '200 to 240', '< 200'] },
            { name: 'HDL', key: 'hdl', ranges: ['', '<50', '50-59', '> 59'] },
            { name: 'LDL', key: 'ldl', ranges: ['>= 160', '130 to 159', '100 to 129', '< 100'] },
            { name: 'Triglycerides', key: 'triglycerides', ranges: ['> 500', '200 to 500', '150 to 199', '< 150'] }
        ];

        const metricsLen = metrics.length;
        for (let i = 0; i < metricsLen; i++) {
            const m = metrics[i];
            const risk = stats[`${m.key}risk`] || {};
            sheet.push(
                [m.name, 'AVG', ...m.ranges],
                ['', (stats[`${m.key}avg`] || 0).toFixed(2), risk['Very High Risk'] || (m.ranges[0] === '' ? '' : 0), risk['High Risk'] || 0, risk['Moderate Risk'] || 0, risk['Low Risk'] || 0]
            );
        }

        const tcRisk = (stats.total_cholesterolrisk?.['High Risk'] || 0) + (stats.total_cholesterolrisk?.['Moderate Risk'] || 0);
        const diabetesRisk = (stats.blood_glucoserisk?.['High Risk'] || 0) + (stats.blood_glucoserisk?.['Moderate Risk'] || 0);
        const sbpRisk = (stats.systolicrisk?.['Very High Risk'] || 0) + (stats.systolicrisk?.['High Risk'] || 0);
        const dbpRisk = (stats.diastolicrisk?.['Very High Risk'] || 0) + (stats.diastolicrisk?.['High Risk'] || 0);

        sheet.push(
            [],
            ['Risk factors', '', 'Number of high risk factors', 'Number of individuals'],
            ['TC ≥ 200 mg/dL', '', '0', tcRisk],
            ['Known diabetes', '', '1', diabetesRisk],
            ['SBP ≥ 140 mmHg', '', '2', sbpRisk],
            ['DBP ≥ 90 mmHg', '', '3', dbpRisk],
            ['Current smoker', '', '4 +', 0],
            ['BMI > 30', ''],
            ['Age ≥ 45', ''],
            [],
            [`*Please note that the above numbers are considering all individuals' data who turned in a Physician Form and have biometric data in at least one of the biometric categories in both 1 and 2.`]
        );
        return sheet;
    }
    private buildDataArrays(users: any[], dataArr: any, questions: any[], yearCounter: string[], yr1: string, yr2: string, stats: any, bioTotal1: any, bioTotal2: any, lbl1: string, lbl2: string): any[] {
        const sheet1: any[] = [];
        const sheet2: any[] = [];
        const sheet3: any[] = [];
        const sheet4: any[] = [];

        const quesNormalArray = Object.fromEntries(questions.map(q => [q.id, '']));
        const quesNormalValues = Object.values(quesNormalArray);
        const emptyArr11 = Array(11).fill('');
        const emptyArr25 = Array(25).fill('');
        const emptyArr20 = Array(20).fill('');

        const usersLen = users.length;
        for (let idx = 0; idx < usersLen; idx++) {
            const user = users[idx];
            const uid = user.id;
            const baseInfo = [user.code, user.company_name, user.dept_name, user.location_name, user.first_name, user.middle_name, user.last_name, this.formatDate(user.dob), user.gender.charAt(0).toUpperCase() + user.gender.slice(1).toLowerCase()];

            sheet1[idx] = [...baseInfo];
            sheet2[idx] = [...baseInfo];
            sheet3[idx] = [user.code];
            sheet4[idx] = [];

            const yearLen = yearCounter.length;
            for (let yrIdx = 0; yrIdx < yearLen; yrIdx++) {
                const yr = yearCounter[yrIdx];

                if (yrIdx === 0) {
                    sheet3[idx].push(dataArr[uid]?.[yr1]?.source || '', dataArr[uid]?.[yr2]?.source || '', '');
                } else {
                    sheet3[idx].push('');
                }

                const userData = dataArr[uid]?.[yr];
                if (userData) {
                    const data = userData;
                    const hraData = [data.OverallScore, data.CurrentHealth, data.CurrentHealthLevel, data.PreventionSection, data.PreventionSectionLevel, data.NutritionSection, data.NutritionSectionLevel, data.ExerciseSection, data.ExerciseSectionLevel, data.EmotionalHealth, data.EmotionalHealthLevel];
                    const quesValues = data.quans ? Object.values({ ...quesNormalArray, ...data.quans }) : quesNormalValues;
                    const bioData = [data.HDate, data.height, data.weight, data.bmi, data.bmiLevel, data.systolic, data.systolicLevel, data.diastolic, data.diastolicLevel, data.blood_glucose, data.blood_glucoseLevel, data.testtype, data.alc, data.alcLevel, data.hdl, data.hdlLevel, data.ldl, data.ldlLevel, data.total_cholesterol, data.total_cholesterolLevel, data.triglycerides, data.triglyceridesLevel, data.source, data.BDate, data.BDate];
                    const sheet3Bio = [data.weight, data.bmi, data.bmiLevel, data.systolic, data.systolicLevel, data.diastolic, data.diastolicLevel, data.blood_glucose, data.blood_glucoseLevel, data.testtype, data.alc, data.alcLevel, data.hdl, data.hdlLevel, data.ldl, data.ldlLevel, data.total_cholesterol, data.total_cholesterolLevel, data.triglycerides, data.triglyceridesLevel];

                    if (yrIdx === 0) {
                        sheet1[idx].push(...hraData, ...quesValues, ...bioData);
                    } else {
                        sheet2[idx].push(...hraData, ...quesValues, ...bioData);
                    }

                    sheet3[idx].push(...sheet3Bio);

                    const sheet3Slice = yrIdx === 0 ? sheet3[idx].slice(4, 24) : sheet3[idx].slice(24, 44);
                    let riskCnt = 0;
                    for (let i = 0; i < 20; i++) {
                        if (sheet3Slice[i] === this.RISK_LEVELS.VERY_HIGH || sheet3Slice[i] === this.RISK_LEVELS.HIGH) {
                            riskCnt++;
                        }
                    }

                    if (yrIdx === 0) {
                        sheet4[idx] = [riskCnt];
                    } else {
                        sheet4[idx].push(riskCnt);
                    }
                } else {
                    if (yrIdx === 0) {
                        sheet1[idx].push(...emptyArr11, ...quesNormalValues, ...emptyArr25);
                    } else {
                        sheet2[idx].push(...emptyArr11, ...quesNormalValues, ...emptyArr25);
                    }
                    sheet3[idx].push(...emptyArr20);
                    sheet4[idx].push(0);
                }
            }
        }

        const sheet4Data: any = {};
        for (let idx = 0; idx < usersLen; idx++) {
            const yearLen = yearCounter.length;
            for (let yrIdx = 0; yrIdx < yearLen; yrIdx++) {
                const yr = yearCounter[yrIdx];
                const riskCnt = sheet4[idx][yrIdx];
                if (riskCnt > 0) {
                    const riskKey = riskCnt > 4 ? 4 : riskCnt;
                    if (!sheet4Data[yr]) sheet4Data[yr] = {};
                    sheet4Data[yr][riskKey] = (sheet4Data[yr][riskKey] || 0) + 1;
                    sheet4Data[yr][0] = (sheet4Data[yr][0] || 0) + 1;
                }
            }
        }

        if (Object.keys(sheet4Data).length > 0) {
            const bioTotal1Len = Object.keys(bioTotal1).length;
            const bioTotal2Len = Object.keys(bioTotal2).length;

            for (let row = 0; row < 5; row++) {
                const yearLen = yearCounter.length;
                for (let yrIdx = 0; yrIdx < yearLen; yrIdx++) {
                    const yr = yearCounter[yrIdx];
                    if (sheet4Data[yr]?.[row] !== undefined) {
                        const riskLbl = row === 4 ? '4 +' : row.toString();
                        const riskCnt = row === 0 ? ((yrIdx === 0 ? bioTotal1Len : bioTotal2Len) - sheet4Data[yr][0]) : sheet4Data[yr][row];
                        if (!sheet4[row]) sheet4[row] = [];
                        sheet4[row][3 + (yrIdx * 3)] = riskLbl;
                        sheet4[row][4 + (yrIdx * 3)] = riskCnt;
                    }
                }
            }
        }

        const sheet5 = this.buildAveragesSheet(stats[yr1], yr1, bioTotal1);
        const sheet6 = this.buildAveragesSheet(stats[yr2], yr2, bioTotal2);
        const sheet7 = this.buildVarianceSheet(stats[`${yr1}-${yr2}`]);
        const sheet8 = this.buildAverageVarianceSheet(stats, yr1, yr2);
        const individualSheets = this.buildAllIndividualBiometricSheets(dataArr, users, yr1, yr2, lbl1, lbl2);

        return [sheet1, sheet2, sheet3, sheet4, sheet5, sheet6, sheet7, sheet8, individualSheets.clm_data_sheet9, individualSheets.clm_data_sheet10, individualSheets.clm_data_sheet11, individualSheets.clm_data_sheet12, individualSheets.clm_data_sheet13, individualSheets.clm_data_sheet14, individualSheets.clm_data_sheet15];
    }
    private buildVarianceSheet(stats: any): any[] {
        const sheet: any[] = [['', 'Average-Variance', 'Very High Risk-Variance', 'High Risk-Variance', 'Medium-Variance', 'Low-Variance']];
        const fields = [
            { name: 'Weight', key: 'weight', hasRisks: false },
            { name: 'BMI', key: 'bmi', hasRisks: true },
            { name: 'Blood Pressure Systolic', key: 'systolic', hasRisks: true },
            { name: 'Blood Pressure Diastolic', key: 'diastolic', hasRisks: true },
            { name: 'Blood Glucose', key: 'blood_glucose', hasRisks: true },
            { name: 'A1c', key: 'alc', hasRisks: true },
            { name: 'Total Cholesterol', key: 'total_cholesterol', hasRisks: true },
            { name: 'HDL', key: 'hdl', hasRisks: true },
            { name: 'LDL', key: 'ldl', hasRisks: true },
            { name: 'Triglycerides', key: 'triglycerides', hasRisks: true }
        ];

        const fieldsLen = fields.length;
        for (let i = 0; i < fieldsLen; i++) {
            const { name, key, hasRisks } = fields[i];
            if (hasRisks) {
                sheet.push([name, (stats[`${key}avgvar`] || 0).toFixed(2), (stats[`${key}veryhighriskvar`] || 0).toFixed(2), (stats[`${key}highriskvar`] || 0).toFixed(2), (stats[`${key}moderateriskvar`] || 0).toFixed(2), (stats[`${key}lowriskvar`] || 0).toFixed(2)]);
            } else {
                sheet.push([name, (stats[`${key}avgvar`] || 0).toFixed(2)]);
            }
        }

        sheet.push([], [`*Please note that the above numbers are considering all individuals' data who turned in a Physician Form and have biometric data in at least one of the biometric categories in both ranges.`]);
        return sheet;
    }
    private buildAverageVarianceSheet(stats: any, yr1: string, yr2: string): any[] {
        const sheet: any[] = [['', `Range ${yr1}-Averages`, `Range ${yr2} - Averages`, 'Average-Variance']];
        const fieldNames: any = {
            weight: 'Weight',
            bmi: 'BMI',
            systolic: 'Blood Pressure Systolic',
            diastolic: 'Blood Pressure Diastolic',
            blood_glucose: 'Blood Glucose',
            alc: 'A1c',
            total_cholesterol: 'Total Cholesterol',
            hdl: 'HDL',
            ldl: 'LDL',
            triglycerides: 'Triglycerides'
        };

        const fieldsLen = this.BIOMETRIC_FIELDS.length;
        for (let i = 0; i < fieldsLen; i++) {
            const f = this.BIOMETRIC_FIELDS[i];
            sheet.push([fieldNames[f], (stats[yr1][`${f}avg`] || 0).toFixed(2), (stats[yr2][`${f}avg`] || 0).toFixed(2), (stats[`${yr1}-${yr2}`][`${f}avgvar`] || 0).toFixed(2)]);
        }

        sheet.push([], [`*Please note that the above numbers are considering all individuals' data who turned in a Physician Form and have biometric data in at least one of the biometric categories in both ranges.`]);
        return sheet;
    }
    private formatDate(dateStr: string): string {
        try {
            return moment(dateStr).format('MM-DD-YYYY');
        } catch (error) {
            return dateStr;
        }
    }
    private async updateReportStatus(reportId: number, status: number, flag: number, filename?: string): Promise<void> {
        const query = filename
            ? `UPDATE ha_cohortreports SET status = ?, flage = ?, file = ? WHERE id = ?`
            : `UPDATE ha_cohortreports SET status = ?, flage = ? WHERE id = ?`;
        const params = filename ? [status, flag, filename, reportId] : [status, flag, reportId];
        await this.dataSourceWrite.query(query, params);
    }
    private async saveJsonAndGenerateExcel(jsonPath: string, data: any): Promise<void> {
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);
        const path = require('path');

        try {
            const base64Json = Buffer.from(JSON.stringify(data)).toString('base64');
            await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' }, { path: base64Json, filename: jsonPath, userBucket: 'private' }));

            const pythonScript = path.resolve(process.cwd(), 'src/python/generate_cohort_excel.py');
            const { stdout, stderr } = await execPromise(`python3 "${pythonScript}" "${jsonPath}"`, { env: process.env });

            if (stderr) console.error(stderr);
            console.log(stdout);
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
}