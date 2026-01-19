import {
    appConstant, AssessmentHaQuestionsEntity, AssessmentsEntity,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonService,
    CompaniesEntity, dataType, HealthField, joinConditionInterface, OrderByOptions,
    tableConstant,
} from '@common-constants';
import { UserService } from '../../user/user.service';
import {CompanyService} from "../../company/company.service";
import {Injectable} from "@nestjs/common";
import * as path from 'path';
import {hraDetailReportInterface} from "../../../interface";
import {cronAppConstant, CronCommonService} from "../../../common";
import { HraQuestionsService } from "../../healthassessment";
import {AssessmentTabsService} from "../../healthassessment/assessment-tabs/assessment-tabs.service";
import {AssessmentQuestionsService} from "../../healthassessment/assessment-questions/assessment-questions.service";
import {In, Not, Raw} from "typeorm";
import {AssessmentService} from "../../healthassessment/assessments.service";
import {BiometricsService} from "../../healthcheckup";
import moment from "moment-timezone";

@Injectable()
export class HraDetailReportService {
    constructor(
        private readonly commonService: CommonService,
        private readonly userService: UserService,
        private readonly companyService: CompanyService,
        private readonly commonDateService: CommonDateService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly cronCommonService: CronCommonService,
        private readonly hraQuestionsService: HraQuestionsService,
        private readonly assessmentService: AssessmentService,
        private readonly biometricsService: BiometricsService,
    ) {}

    async hraDetailReport(postData: hraDetailReportInterface) {
        try {
            let orgId: number[] = postData.org_id;
            let terminatedUsers: number = postData.terminated_users;
            if (!orgId || !terminatedUsers) {
                return {
                    success: 0,
                    data: null,
                    message: 'ERR_REQUIRED_PARAM_MISSING',
                    error: 1,
                };
            }
            let groupBy: string = '';
            let displayType: number = postData?.display_type;
            if (postData?.display_type === 0) {
                groupBy = 'users.id'
            }

            let sourceHra: number[] = [];
            if (postData?.physician_entered) {
                sourceHra = [...sourceHra, ...[3,11,12]]
            } else if (postData?.source_option_physician.length > 0) {
                sourceHra = [...sourceHra,...[3], ...postData?.source_option_physician]
            }
            if (postData?.user_entered) {
                sourceHra = [...sourceHra,...[1,13,14,15]]
            } else if (postData?.source_option_user.length > 0) {
                sourceHra = [...sourceHra,...[1], ...postData?.source_option_user]
            }
            if (postData?.admin_entered) {
                sourceHra = [...sourceHra,...[2]]
            }
            let sourceHraIds: string = sourceHra.join(',');
            let biometricsSourceCondition: string = '',hraBiometricSourceCondition: string = '',ftBiometricSourceCondition: string = '';
            if (sourceHraIds) {
                biometricsSourceCondition = `AND biometrics.source IN(${sourceHraIds})`;
                hraBiometricSourceCondition = `AND hraBiometric.source IN(${sourceHraIds})`;
                ftBiometricSourceCondition = `AND ftBiometrics.source IN(${sourceHraIds})`;
            }
            let membershipCodeArray= []
            let companyData: CompaniesEntity[] = await this.companyService.getAll({ id: In(orgId), status: 1, deleted: 0 },['id', 'code']);
            for (let i: number = 0; i < companyData.length; i++) {
                let data:CompaniesEntity = companyData[i]
                membershipCodeArray.push(data['code'])
            }
            let where: string = `users.role_id IN(2,16) AND users.status != '2'`;
            if (membershipCodeArray?.length > 0) {
                where += ` AND users.membership_code IN('${membershipCodeArray.join("','")}')`
            }
            if (postData?.terminated_users === 2) {
                where += ` AND users.status = '1'`
            }
            if (postData?.department_ids?.length > 0) {
                where += ` AND users.department_id IN(${postData.department_ids})`
            }
            if (postData?.location_ids?.length > 0) {
                where += ` AND users.location IN(${postData.location_ids})`
            }
            let assessmentsDate: string = '',hraBiometricDate: string = '',hcBiometricDate: string = '',hcBiometricDate1: string = '',ftBiometricDate: string = '';
            let assessmentsDateArray: number[] = [],hcBiometricDateArray: number[] = [],hraBiometricDateArray: number[] = [],ftBiometricsDataArray: number[] = [];
            let bioData = new Map<number, any>();
            if (postData?.from_date && postData?.to_date) {
                let fromDate = await this.commonDateService.DateTimeFormat(postData?.from_date, 'YYYY-MM-DD','DD-MM-YYYY');
                let toDate = await this.commonDateService.DateTimeFormat(postData?.to_date, 'YYYY-MM-DD','DD-MM-YYYY');
                assessmentsDate = `AND DATE_FORMAT(CONVERT_TZ(assessments.date,'UTC',CASE WHEN users.timezone != '' THEN users.timezone ELSE 'UTC' END),'%Y-%m-%d') BETWEEN '${fromDate} 00:00:00' AND '${toDate} 23:59:59' `;
                hraBiometricDate = `AND DATE_FORMAT(CONVERT_TZ(hraBiometric.date,'UTC',CASE WHEN users.timezone != '' THEN users.timezone ELSE 'UTC' END),'%Y-%m-%d') BETWEEN '${fromDate} 00:00:00' AND '${toDate} 23:59:59' `;
                hcBiometricDate = `AND DATE_FORMAT(CONVERT_TZ(biometrics.created,'UTC',CASE WHEN users.timezone != '' THEN users.timezone ELSE 'UTC' END),'%Y-%m-%d') BETWEEN '${fromDate} 00:00:00' AND '${toDate} 23:59:59' `;
                ftBiometricDate = `AND DATE_FORMAT(CONVERT_TZ(ftBiometrics.added_date,'UTC',CASE WHEN users.timezone != '' THEN users.timezone ELSE 'UTC' END),'%Y-%m-%d') BETWEEN '${fromDate} 00:00:00' AND '${toDate} 23:59:59' `;
            }

            let allAssesmentDataOrderBy: OrderByOptions = {'assessments.id': 'ASC'}
            let hcBiometricsDataOrderBy: OrderByOptions = { 'users.first_name': 'ASC' }
            let hraBiometricsDataOrderBy: OrderByOptions = { 'users.first_name': 'ASC' }
            let ftBiometricsDataOrderBy: OrderByOptions = { 'users.first_name': 'ASC' }
            let assessmentsDataDataType: dataType = 'getRawMany'
            let hcBiometricsDataDataType: dataType = 'getRawMany'
            let hraBiometricsDataDataType: dataType = 'getRawMany'
            let ftBiometricsDataDataType: dataType = 'getRawMany'
            let userResultDataType: dataType = 'getMany';
            let assessmentsDataField = ["assessments.id AS id","assessments.user_id AS user_id","assessments.activity_id AS activity_id","assessments.`1` AS `1`","assessments.1_qscore AS 1_qscore","assessments.1_WorstScore AS 1_WorstScore","assessments.`2` AS `2`","assessments.2_qscore AS 2_qscore","assessments.2_WorstScore AS 2_WorstScore","assessments.`3` AS `3`","assessments.3_qscore AS 3_qscore","assessments.3_WorstScore AS 3_WorstScore","assessments.`4` AS `4`","assessments.4_qscore AS 4_qscore","assessments.4_WorstScore AS 4_WorstScore","assessments.`5` AS `5`","assessments.5_qscore AS 5_qscore","assessments.5_WorstScore AS 5_WorstScore","assessments.score AS score","assessments.hra_status AS hra_status","assessments.hra_reset AS hra_reset","assessments.language_set AS language_set","assessments.status AS status","DATE_FORMAT(CONVERT_TZ(assessments.date,'UTC',CASE WHEN users.timezone != '' THEN users.timezone ELSE 'UTC' END),'%Y-%m-%d') AS date"];
            let hcBiometricsDataField = ['users.id AS user_id', 'biometrics.id AS id', 'biometrics.user_id AS user_id', 'biometrics.height AS height', 'biometrics.alc AS alc', 'biometrics.weight AS weight', 'biometrics.bmi AS bmi', 'biometrics.systolic AS systolic', 'biometrics.diastolic AS diastolic', 'IF(biometrics.test_type = 1, biometrics.blood_glucose, 0) AS random_blood_glucose', 'IF(biometrics.test_type = 2, biometrics.blood_glucose, 0) AS fasting_blood_glucose', 'biometrics.total_cholesterol AS total_cholesterol', 'biometrics.hdl AS hdl', 'biometrics.ldl AS ldl', 'biometrics.triglycerides AS triglycerides', 'biometrics.blood_glucose AS blood_glucose', 'biometrics.waist AS waist', 'biometrics.source AS source', 'DATE_FORMAT(CONVERT_TZ(biometrics.created,"UTC",CASE WHEN users.timezone != "" THEN users.timezone ELSE "UTC" END),"%Y-%m-%d") AS date','biometrics.created AS created', 'biometrics.inserted AS inserted', "DATE_FORMAT(biometrics.created, '%Y-%m-%d %H:%i:%s') AS log_date_tmp", 'biometrics.enter_by AS enter_by', 'biometrics.test_type AS test_type', 'biometrics.is_tobacco_user AS is_tobacco_user','TIMESTAMPDIFF(YEAR, users.dob, CURDATE()) AS age'];
            let hraBiometricsDataField = ['users.id AS user_id', 'hraBiometric.id AS id', 'hraBiometric.user_id AS user_id', 'hraBiometric.alc AS alc', 'hraBiometric.weight AS weight', 'hraBiometric.height_ft AS height_ft', 'hraBiometric.height_in AS height_in', "CONCAT(hraBiometric.height_ft, '.', hraBiometric.height_in) AS height", 'hraBiometric.bp_systolic AS systolic', 'IF(hraBiometric.test_type = 1, hraBiometric.blood_glucose, 0) AS random_blood_glucose', 'IF(hraBiometric.test_type = 2, hraBiometric.blood_glucose, 0) AS fasting_blood_glucose', 'hraBiometric.bp_diastolic AS diastolic', 'hraBiometric.total_cholesterol AS total_cholesterol', 'hraBiometric.hdl AS hdl', 'hraBiometric.ldl AS ldl', 'hraBiometric.triglycerides AS triglycerides', 'hraBiometric.blood_glucose AS blood_glucose', 'hraBiometric.waist AS waist', 'hraBiometric.source AS source', 'hraBiometric.date AS created', 'DATE_FORMAT(CONVERT_TZ(hraBiometric.date,"UTC",CASE WHEN users.timezone != "" THEN users.timezone ELSE "UTC" END),"%Y-%m-%d") AS inserted', 'hraBiometric.test_type AS test_type', "DATE_FORMAT(hraBiometric.date, '%Y-%m-%d %H:%i:%s') AS log_date_tmp", '0 AS enter_by'];
            let ftBiometricsDataField = ['users.id AS user_id', 'ftBiometrics.id AS id', 'ftBiometrics.user_id AS user_id', 'ftBiometrics.alc AS alc', "CONCAT(ftBiometrics.height_ft, '.', ftBiometrics.height_in) AS height", 'ftBiometrics.height_ft AS height_ft', 'ftBiometrics.height_in AS height_in', 'ftBiometrics.weight AS weight', 'ftBiometrics.systolic AS systolic ', 'ftBiometrics.diastolic AS diastolic', 'IF(ftBiometrics.glucose_type = 1, ftBiometrics.glucose, 0) AS random_blood_glucose', 'IF(ftBiometrics.glucose_type = 2, ftBiometrics.glucose, 0) as fasting_blood_glucose', 'ftBiometrics.glucose AS blood_glucose', 'ftBiometrics.chol_total AS total_cholesterol', 'ftBiometrics.hdl AS hdl', 'ftBiometrics.ldl AS ldl', 'ftBiometrics.triglycerides AS triglycerides', 'DATE_FORMAT(CONVERT_TZ(ftBiometrics.added_date,"UTC",CASE WHEN users.timezone != "" THEN users.timezone ELSE "UTC" END),"%Y-%m-%d") AS created', 'ftBiometrics.inserted AS inserted', "'' AS waist", 'ftBiometrics.source AS source', "DATE_FORMAT(ftBiometrics.added_date, '%Y-%m-%d %H:%i:%s') AS log_date_tmp", 'ftBiometrics.glucose_type AS test_type', '0 AS enter_by'];
            let userResultField = ['users.id', 'users.code','users.role_id','users.relationship_id','users.first_name','users.middle_name','users.last_name','users.timezone','userSetting.jobtitle', 'users.dob','users.date_of_hire','users.insurance_plan_name','users.gender','users.on_insurance_plan','users.email','users.username','users.employeeid', 'company.company_name', 'department.dept_name', 'locations.lname','locations.address1','locations.address2','locations.city','locations.state','locations.zip','locations.country'];
            let userResultJoinCondition: joinConditionInterface[] = [
                {
                    join_table: 'users.userSetting',
                    alias: 'userSetting',
                    table: tableConstant.TBL_USERS_SETTINGS,
                    on_condition: `users.id = userSetting.user_id`,
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
                    join_table: 'users.department',
                    alias: 'department',
                    table: tableConstant.COMPANIES.TBL_DEPARTMENT,
                    on_condition: `department.id = users.department_id`,
                    join_type: 'left_one',
                },
                {
                    join_table: 'users.locations',
                    alias: 'locations',
                    table: tableConstant.COMPANIES.TBL_LOCATION,
                    on_condition: `locations.id = users.location`,
                    join_type: 'left_one',
                }
            ];
            if (postData.result_type === 1) {
                allAssesmentDataOrderBy = hcBiometricsDataOrderBy = hraBiometricsDataOrderBy = ftBiometricsDataOrderBy = {};
                assessmentsDataDataType = hcBiometricsDataDataType = hraBiometricsDataDataType = ftBiometricsDataDataType = 'getMany';
                userResultDataType = 'getManyAndCount'
                hcBiometricsDataField = hraBiometricsDataField = ftBiometricsDataField = ['users.id']
                assessmentsDataField = ['users.id AS user_id']
                userResultField = ['users.id', 'users.code', 'users.first_name', 'users.middle_name', 'users.last_name', 'users.dob', 'users.gender', 'company.company_name', 'department.dept_name', 'locations.location_name'];
                userResultJoinCondition = [
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
                        join_table: 'users.locations',
                        alias: 'locations',
                        table: tableConstant.COMPANIES.TBL_LOCATION,
                        on_condition: `locations.id = users.location`,
                        join_type: 'left_one',
                    }
                ]

            }

            let allAssesmentData = await this.userService.commonQueryBuilder(
                assessmentsDataField,
                `${where} ${assessmentsDate} AND assessments.status != '2'`,
                allAssesmentDataOrderBy,
                [
                    {
                        join_table: 'users.assessments',
                        alias: 'assessments',
                        table: tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENTS,
                        on_condition: `assessments.user_id = users.id AND assessments.id != ''`,
                        join_type: 'inner_one',
                    }
                ],
                'getRawMany',
                {},
                groupBy
            )
            for (let i: number = 0; i < allAssesmentData.length; i++) {
                let data = allAssesmentData[i]
                assessmentsDateArray.push(data['user_id'])
            }
            let hcBiometricJoinCondition: any = [
                {
                    join_table: 'users.biometrics',
                    alias: 'biometrics',
                    table: tableConstant.HEALTH_CHECKUP.TBL_HC_BIOMETRICS,
                    on_condition: `biometrics.user_id = users.id AND biometrics.id != ''`,
                    join_type: 'inner_one',
                }
            ]
            if (displayType === 0) {
                hcBiometricJoinCondition = [
                    {
                        join_table: 'users.biometrics',
                        alias: 'biometrics',
                        table: tableConstant.HEALTH_CHECKUP.TBL_HC_BIOMETRICS,
                        on_condition: `biometrics.user_id = users.id AND biometrics.id != '' AND biometrics.id = (SELECT biometrics.id
                            FROM hc_biometrics biometrics
                            WHERE biometrics.user_id = users.id
                            AND biometrics.status != 2
                            AND biometrics.id != ''
                            ${hcBiometricDate}
                            ORDER BY biometrics.created DESC
                            LIMIT 1)`,
                        join_type: 'inner_one',
                    },
                ]
            }
            let hcBiometricsData = await this.userService.commonQueryBuilder(
                hcBiometricsDataField,
                `${where} ${hcBiometricDate} ${biometricsSourceCondition} AND biometrics.status != 2`,
                { 'users.first_name': 'ASC' },
                hcBiometricJoinCondition,
                hcBiometricsDataDataType,
                {},
                groupBy
            );
            for (let i: number = 0; i < hcBiometricsData.length; i++) {
                let data = hcBiometricsData[i];
                if (postData.result_type === 1) {
                    hcBiometricDateArray.push(data['id'])
                } else {
                    if (![2,3,11,12].includes(Number(data['source']))) {
                        data['created'] = data['date']
                    }
                    let userId = data['user_id'];
                    let checkExist = bioData.get(userId) || [];
                        data = await this.commonService.biometricsrecordData([data]);
                        checkExist.push({...data[0]})
                        bioData.set(userId,checkExist)
                    hcBiometricDateArray.push(userId)
                }
            }
            let tobaccoUserData = new Map<number, any>();
            if (postData.result_type === 2) {
                let tobaccoData = await this.biometricsService.commonQueryBuilder(["is_tobacco_user","user_id","source"],{user_id: In(hcBiometricDateArray),is_tobacco_user: Not(0)},{ id: 'DESC' },[],'getRawMany',{},'biometrics.user_id')
                for (let i: number = 0; i < tobaccoData.length; i++) {
                    let data = tobaccoData[i];
                    tobaccoUserData.set(data.user_id,data);
                }
            }
            let hraBiometricsData = await this.userService.commonQueryBuilder(
                hraBiometricsDataField,
                `${where} ${hraBiometricSourceCondition} ${hraBiometricDate} AND hraBiometric.status != '2'`,
                hraBiometricsDataOrderBy,
                [
                    {
                        join_table: 'users.hraBiometric',
                        alias: 'hraBiometric',
                        table: tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS,
                        on_condition: `hraBiometric.user_id = users.id AND hraBiometric.id != ''`,
                        join_type: 'inner_one',
                    }
                ],
                hraBiometricsDataDataType,
                {},
                groupBy
            )
            for (let i: number = 0; i < hraBiometricsData.length; i++) {
                let data = hraBiometricsData[i];
                if (postData.result_type === 1) {
                    hraBiometricDateArray.push(data['id'])
                } else {
                    let userId = data['user_id'];
                    let checkExist = bioData.get(userId) || [];
                    if (postData?.display_type === 1) {
                        data = await this.commonService.biometricsrecordData([data]);
                        checkExist.push({...data[0]})
                        bioData.set(userId,checkExist)
                    }
                    if (checkExist.length == 0 && postData?.display_type === 0) {
                        data = await this.commonService.biometricsrecordData([data]);
                        checkExist.push({...data[0]})
                        bioData.set(userId,checkExist)
                    }
                    hraBiometricDateArray.push(userId)
                }
            }
            if (sourceHra.length == 0 || sourceHra.includes(14)) {
                let ftBiometricsData = await this.userService.commonQueryBuilder(
                    ftBiometricsDataField,
                    `${where} ${ftBiometricSourceCondition} ${ftBiometricDate} AND ftBiometrics.status != '2'`,
                    ftBiometricsDataOrderBy,
                    [
                        {
                            join_table: 'users.ftBiometrics',
                            alias: 'ftBiometrics',
                            table: tableConstant.TRACKERS.TBL_FT_BIOMETRICS,
                            on_condition: `ftBiometrics.user_id = users.id AND ftBiometrics.id != ''`,
                            join_type: 'inner_one',
                        }
                    ],
                    ftBiometricsDataDataType,
                    {},
                    groupBy
                )
                for (let i: number = 0; i < ftBiometricsData.length; i++) {
                    let data = ftBiometricsData[i];
                    if (postData.result_type === 1) {
                        ftBiometricsDataArray.push(data['id'])
                    } else {
                        let userId = data['user_id'];
                        let checkExist = bioData.get(userId) || [];
                        if (postData?.display_type === 1) {
                            data = await this.commonService.biometricsrecordData([data]);
                            checkExist.push({...data[0]})
                            bioData.set(userId,checkExist)
                        }
                        if (checkExist.length == 0 && postData?.display_type === 0) {
                            data = await this.commonService.biometricsrecordData([data]);
                            checkExist.push({...data[0]})
                            bioData.set(userId,checkExist)
                        }
                        ftBiometricsDataArray.push(userId)
                    }
                }
            }
            if (postData?.search_str && postData.result_type === 1) {
                where += `AND (users.first_name LIKE '%${postData?.search_str}%' OR users.last_name LIKE '%${postData?.search_str}%' OR CONCAT(users.first_name, ' ', users.last_name) LIKE '%${postData?.search_str}%' OR department.dept_name LIKE '%${postData?.search_str}%' OR locations.location_name LIKE '%${postData?.search_str}%' OR company.company_name LIKE '%${postData?.search_str}%')`
            }
            let userIds: number[] = [...assessmentsDateArray,...hcBiometricDateArray,...hraBiometricDateArray,...ftBiometricsDataArray]
            if (userIds.length === 0 && postData.result_type === 1) {
                const { page, limit } = postData || {};
                const setPaginateObj = this.commonArrayService.getPaginationVar(page, limit);
                return {
                    success: 1,
                    data: this.commonArrayService.paginationResponse([], 0, setPaginateObj),
                    error: 0,
                    message: 'success'
                };
            }
            let userResult = await this.userService.commonQueryBuilder(userResultField,
                `${where} AND users.id IN(${userIds.join(',')})`,
                {'users.first_name': 'ASC'},
                userResultJoinCondition,
                userResultDataType,
                postData.result_type === 1 ? postData : {},
                groupBy
            )


            if (postData.result_type === 1) {
                return {
                    success: 1,
                    data: userResult,
                    error: 0,
                    message: 'success'
                };
            }
            const userArray = new Array(userResult.length);
            for (let i: number = 0; i < userResult.length; i++) {
                let user = userResult[i];
                userArray[i] = user?.id;
            }

            const findInSetCondition = orgId.map(id => `FIND_IN_SET('${id}', hraQuestions.company_id) > 0`).join(' OR ');
            let hraQuestionsOptionData = await this.hraQuestionsService.commonQueryBuilder(
                [],
                `${findInSetCondition}`,
                {'hraQuestions.order': 'ASC'},
                [
                    {
                        join_table: 'hraQuestions.hraOptions',
                        alias: 'hraOptions',
                        table: tableConstant.HEALTH_ASSESSMENT.TBL_HA_OPTIONS,
                        on_condition: `hraQuestions.id = hraOptions.question_id`,
                        join_type: 'left_many',
                    }
                ],
                'getMany'
            )

            const assessmentsResult = new Map<number, AssessmentsEntity[]>();
            const getRiskLevel = (score) => {
                if (score <= 49) return "High Risk";
                if (score <= 89) return "Moderate Risk";
                if (score <= 100) return "Low Risk";
            };
            let assessmentAnswer = []
            for (let i: number = 0; i < allAssesmentData.length; i++) {
                let assessment  = allAssesmentData[i];
                let checkExist: AssessmentsEntity[] = assessmentsResult.get(assessment?.user_id) || [];
                assessment['answer'] = [];
                let scoreValue = { score_1: '', score_2: '', score_3: '', score_4: '', score_5: '' };
                let riskLevel = { risk_level_1: '', risk_level_2: '', risk_level_3: '', risk_level_4: '', risk_level_5: ''};
                for (let j: number = 1; j <= 5; j++) {
                    let answer = assessment[`${j}`]
                    let answers = answer ? answer?.split(',').map(Number) : []
                    assessment['answer'] = [...assessment['answer'],...answers]

                        if (assessment[`${j}_qscore`] !== null && scoreValue[`score_${j}`] === '') {
                            if (assessment[`${j}_WorstScore`] == '0') {
                                scoreValue[`score_${j}`] = '100'
                            } else {
                                scoreValue[`score_${j}`] = String(Math.round(((1 - (assessment[`${j}_qscore`] / assessment[`${j}_WorstScore`])) * 100) * 100) / 100);
                            }
                            riskLevel[`risk_level_${j}`] = getRiskLevel(scoreValue[`score_${j}`]);
                        }
                }
                let totalHraQsCore: number = (assessment['1_qscore'] + assessment['2_qscore'] + assessment['3_qscore'] + assessment['4_qscore'] + assessment['5_qscore']);
                let totalHraWorstScore: number = (assessment['1_WorstScore'] + assessment['2_WorstScore'] + assessment['3_WorstScore'] + assessment['4_WorstScore'] + assessment['5_WorstScore']);
                if (totalHraWorstScore < 0) {
                    totalHraWorstScore = (totalHraWorstScore * -1);
                }
                if (totalHraQsCore < 0) {
                    totalHraQsCore = (totalHraQsCore * -1);
                }
                let overallScore = ''
                if (totalHraWorstScore) {
                    overallScore = String(Math.round(((1 - (totalHraQsCore / totalHraWorstScore)) * 100) * 100) / 100);
                }
                assessment['score_value'] = scoreValue;
                assessment['risk_level'] = riskLevel;
                assessment['overall_score'] = overallScore;
                checkExist.push(assessment)
                assessmentAnswer = [...assessmentAnswer,...assessment['answer']]
                assessmentsResult.set(assessment?.user_id, checkExist);
            }

            let headerData: string[] = appConstant.USER_HEADERS;
            let hraHeaderData: string[] = appConstant.HRA_DETAIL_HEADERS;
            let hraBiometricsHeaderData: string[] = appConstant.HRA_BIOMETRICS_HEADERS;
            let sheetData = [];


            /*TODO */
            const convertToFeetInches = (value) => {
                if (!value) return "";
                const val = String(value);
                if (val.includes(":")) {
                    const [feet, inches] = val.split(":").map(Number);
                    return `${feet}'${Math.floor(inches)}"`;
                }
                if (val.includes(".")) {
                    const [feet, decimal] = val.split(".").map(Number);
                    const inches = decimal;
                    return `${feet}'${Math.floor(inches)}"`;
                }
                return `${Number(value)}'0"`;
            };

            let allHeaders = [...headerData, ...hraHeaderData];
            const filteredHraQuestions = [];
            for (let j: number = 0; j < hraQuestionsOptionData.length; j++) {
                const question = hraQuestionsOptionData[j];
                const questionTitle = question?.question_title;
                const hasAnsweredOption = question.hraOptions?.some(opt =>
                    assessmentAnswer.includes(Number(opt.id))
                );
                if (!hasAnsweredOption && question.status != "1") {
                    continue;
                }
                if (questionTitle) {
                    allHeaders.push(`"${questionTitle}"`);
                }
                filteredHraQuestions.push(question);
            }
            hraQuestionsOptionData = filteredHraQuestions;

            allHeaders = [...allHeaders, ...hraBiometricsHeaderData,...["High Risk Factor Count"]];

            sheetData.push(allHeaders);

            const getAndRemoveOne = async (data, date) => {
                if (!data[date] || data[date].length === 0) {
                    return null;
                }
                const val = data[date].shift();
                if (data[date].length === 0) {
                    delete data[date];
                }
                return val;
            };

            for (let i: number = 0; i < userResult.length; i++) {
                let existingHRA = [];
                let currentUserAssessmentSheetData = {}
                let user = userResult[i];
                let userTimeZone = user?.timezone || 'UTC';
                let userGender = cronAppConstant.GENDER_MAP[user?.gender?.toLowerCase()] || 0;
                let source = "User Entered";
                let bioDate = "";
                let bioInsertedDate = "";
                let tobaccoStatus = "";
                let assessmentsData: AssessmentsEntity[] = assessmentsResult.get(user.id) || [];
                let location = user?.locations?.lname ?? "";
                let userDataRow = [
                    user?.code || "",
                    `"${user?.company?.company_name}"` || "",
                    `"${user?.department?.dept_name}"` || "",
                    user?.role_id == 16 ? user?.relationship_id : "",
                    `"${user?.username}"` || "",
                    `"${user?.first_name}"` || "",
                    `"${user?.middle_name}"` || "",
                    `"${user?.last_name}"` || "",
                    user?.userSetting?.jobtitle ? `"${user?.userSetting?.jobtitle}"` : "",
                    user?.employeeid || "",
                    cronAppConstant.GENDER[userGender] || "",
                    await this.commonDateService.DateTimeFormat(user?.dob, 'MM-DD-YYYY') || "",
                    await this.commonDateService.DateTimeFormat(user?.date_of_hire, 'MM-DD-YYYY') || "",
                    cronAppConstant.INSURANCE_PLAN[user?.on_insurance_plan?.toLowerCase()] || "",
                    user?.insurance_plan_name ?? "",
                    `"${user?.email}"` || "",
                    `"${location}"`,
                    user?.role_id == 2 ? "Employee" : "Spouse",
                ];

                let hraDataRow = ["", "", "", "", "", "", "", "", "", "", ""];
                let questionDataRow = [];
                let biometricDataRow = ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""];
                let tobaccoAndDateDataRow = [source, "", "", ""];
                let highRiskFactorCount = ["0"];
                let dateHraDataRow = {}
                let dateQuestionDataRow = {}
                if (assessmentsData?.length > 0) {
                    for (let j = 0; j < assessmentsData.length; j++) {
                        let assessments = assessmentsData[j];
                        assessments['answer'] = assessments['answer'] || [];
                        assessments['score_value'] = assessments['score_value'] || {};
                        assessments['risk_level'] = assessments['risk_level'] || {};

                        hraDataRow = [
                            `"${assessments['overall_score']}"` || "",
                            `"${assessments['score_value']?.score_1}"` || "",
                            `"${assessments['risk_level']?.risk_level_1}"` || "",
                            `"${assessments['score_value']?.score_2}"` || "",
                            `"${assessments['risk_level']?.risk_level_2}"` || "",
                            `"${assessments['score_value']?.score_3}"` || "",
                            `"${assessments['risk_level']?.risk_level_3}"` || "",
                            `"${assessments['score_value']?.score_4}"` || "",
                            `"${assessments['risk_level']?.risk_level_4}"` || "",
                            `"${assessments['score_value']?.score_5}"` || "",
                            `"${assessments['risk_level']?.risk_level_5}"` || "",
                        ];

                        questionDataRow = [];
                        for (let k = 0; k < hraQuestionsOptionData.length; k++) {
                            let hraQuestionsOption = hraQuestionsOptionData[k];
                            let optionName = "";

                            for (let l = 0; l < hraQuestionsOption['hraOptions'].length; l++) {
                                let hraOptions = hraQuestionsOption['hraOptions'][l];
                                if (assessments['answer'].includes(hraOptions.id)) {
                                    optionName += `${hraOptions['option_title']},`;
                                }
                            }
                            optionName = optionName.replace(/,$/, "");
                            if (/^\d{1,2}-[A-Za-z]{3}$/.test(optionName) || /\d{1,2}-\d{1,2}/.test(optionName)) {
                                questionDataRow.push(`="${optionName}"`);
                            } else {
                                questionDataRow.push(`"${optionName}"`);
                            }
                        }
                        let assessmentsDate = await this.commonDateService.DateTimeFormat(assessments['date'], 'MM-DD-YYYY', 'YYYY-MM-DD') || "";
                        questionDataRow.push(assessmentsDate);
                        existingHRA.push(assessmentsDate)
                        if (!dateHraDataRow[`${assessmentsDate}`]) {
                            dateHraDataRow[`${assessmentsDate}`] = [];
                        }
                        dateHraDataRow[`${assessmentsDate}`].push(hraDataRow)
                        if (!dateQuestionDataRow[`${assessmentsDate}`]) {
                            dateQuestionDataRow[`${assessmentsDate}`] = [];
                        }
                        dateQuestionDataRow[`${assessmentsDate}`].push(questionDataRow)
                        if (displayType === 1) {
                            if (!currentUserAssessmentSheetData[`${assessmentsDate}`]) {
                                currentUserAssessmentSheetData[`${assessmentsDate}`] = [];
                            }
                            currentUserAssessmentSheetData[`${assessmentsDate}`].push([...userDataRow, ...hraDataRow, ...questionDataRow, ...biometricDataRow, ...tobaccoAndDateDataRow, ...highRiskFactorCount]);
                        }
                    }
                } else {
                    questionDataRow = [];
                    for (let j = 0; j < hraQuestionsOptionData.length; j++) {
                        questionDataRow.push("");
                    }
                    questionDataRow.push("");
                }
                let biometricArray = bioData.get(user.id) || [];
                let tempBioArray = []
                let tempIncludeDateBioArray = []
                    for (let j: number = 0; j < biometricArray.length; j++) {
                        let gender = user?.gender;
                        if (gender === 'f') {
                            gender = 'w';
                        }
                        let latestBiometricData = biometricArray[j];
                        bioDate = await this.commonDateService.DateTimeFormat(latestBiometricData?.created, 'MM-DD-YYYY', 'YYYY-MM-DD') || "";
                        bioInsertedDate = await this.commonDateService.DateTimeFormat(latestBiometricData?.inserted, 'MM-DD-YYYY','YYYY-MM-DD') || "";
                        let testTypeObj = {1: 'Random', 2: 'Fasting'};
                        let testType = testTypeObj[latestBiometricData['test_type']] || "";

                        let tobaccoUserDataCheckExist = tobaccoUserData.get(user.id) || {};
                        if ([3, 11, 12].includes(tobaccoUserDataCheckExist['source'])) {
                            tobaccoStatus = appConstant.TOBACCO_PHYSICIAN_STATUS[tobaccoUserDataCheckExist['is_tobacco_user']] || "";
                        } else if ([1, 13, 14, 15].includes(tobaccoUserDataCheckExist['source'])) {
                            tobaccoStatus = appConstant.TOBACCO_STATUS[tobaccoUserDataCheckExist['is_tobacco_user']] || "";
                        }
                        biometricDataRow = [
                            convertToFeetInches(latestBiometricData['height']),
                            latestBiometricData['weight'] || "",
                            latestBiometricData['bmi'] || "",
                            this.commonService.getRiskLevel('bmi', latestBiometricData['bmi']) || "",
                            latestBiometricData['systolic'] || "",
                            this.commonService.getRiskLevel('systolic', latestBiometricData['systolic']) || "",
                            latestBiometricData['diastolic'] || "",
                            this.commonService.getRiskLevel('diastolic', latestBiometricData['diastolic']) || "",
                            latestBiometricData['blood_glucose'] || "",
                            this.commonService.getRiskLevel('blood_glucose', latestBiometricData['blood_glucose']) || "",
                            testType,
                            latestBiometricData['alc'] || "",
                            this.commonService.getRiskLevel('alc', latestBiometricData['alc']) || "",
                            latestBiometricData['hdl'] || "",
                            this.commonService.getRiskLevel(`hdl${gender}` as HealthField, latestBiometricData['hdl']) || "",
                            latestBiometricData['ldl'] || "",
                            this.commonService.getRiskLevel('ldl', latestBiometricData['ldl']) || "",
                            latestBiometricData['total_cholesterol'] || "",
                            this.commonService.getRiskLevel('total_cholesterol', latestBiometricData['total_cholesterol']) || "",
                            latestBiometricData['triglycerides'] || "",
                            this.commonService.getRiskLevel('triglycerides', latestBiometricData['triglycerides']) || "",
                            latestBiometricData['waist'] || "",
                            this.commonService.getRiskLevel(`waist${gender}` as HealthField, latestBiometricData['waist']) || "",
                        ];
                        source = await this.commonService.writeEnterBy(latestBiometricData['source'], latestBiometricData['enter_by']);
                        if (!latestBiometricData['source']) {
                            source = 'User Entered'
                        }
                        tobaccoAndDateDataRow = [source, bioDate, bioInsertedDate, tobaccoStatus];
                        let count = 0;
                        const riskConditions = [
                            latestBiometricData['bmi'] > 30,
                            latestBiometricData['fasting_blood_glucose'] > 125 && latestBiometricData['random_blood_glucose'] > 199,
                            latestBiometricData['age'] > 45,
                            latestBiometricData['total_cholesterol'] > 200,
                            latestBiometricData['systolic'] > 140,
                            latestBiometricData['diastolic'] > 90,
                            (latestBiometricData['is_tobacco_user'] === 2 || latestBiometricData['is_tobacco_user']) === 3,
                        ];
                        count = riskConditions.filter(Boolean).length;
                        highRiskFactorCount = [`${count}`]
                        if (displayType === 1) {
                            let tempQuestionDataRow = Array(questionDataRow.length).fill("");
                            if (existingHRA.includes(bioDate)) {
                                if (currentUserAssessmentSheetData[`${bioDate}`]?.length > 1) {
                                    let assessmentUserLength = currentUserAssessmentSheetData[`${bioDate}`].length;
                                    for (let k: number = 0; k < assessmentUserLength; k++) {
                                        let getDateHraDataRow = dateHraDataRow[`${bioDate}`][k] || ["", "", "", "", "", "", "", "", "", "", ""]
                                        let getDateQuestionDataRow = dateQuestionDataRow[`${bioDate}`][k] || tempQuestionDataRow;
                                        tempIncludeDateBioArray.push([...userDataRow, ...getDateHraDataRow, ...getDateQuestionDataRow, ...biometricDataRow, ...tobaccoAndDateDataRow, ...highRiskFactorCount])
                                        /*sheetData.push([...userDataRow, ...getDateHraDataRow, ...getDateQuestionDataRow, ...biometricDataRow, ...tobaccoAndDateDataRow, ...highRiskFactorCount]);*/
                                    }
                                    delete currentUserAssessmentSheetData[`${bioDate}`];
                                    delete dateHraDataRow[`${bioDate}`];
                                    delete dateQuestionDataRow[`${bioDate}`];
                                } else {
                                    await getAndRemoveOne(currentUserAssessmentSheetData,`${bioDate}`)
                                    let getDateHraDataRow = await getAndRemoveOne(dateHraDataRow,`${bioDate}`) || ["", "", "", "", "", "", "", "", "", "", ""]
                                    let getDateQuestionDataRow = await getAndRemoveOne(dateQuestionDataRow,`${bioDate}`) || tempQuestionDataRow;
                                    tempIncludeDateBioArray.push([...userDataRow, ...getDateHraDataRow, ...getDateQuestionDataRow, ...biometricDataRow, ...tobaccoAndDateDataRow, ...highRiskFactorCount])
                                    /*sheetData.push([...userDataRow, ...getDateHraDataRow, ...getDateQuestionDataRow, ...biometricDataRow, ...tobaccoAndDateDataRow, ...highRiskFactorCount]);*/
                                }
                            } else {
                                tempBioArray.push([...userDataRow, ...["", "", "", "", "", "", "", "", "", "", ""], ...tempQuestionDataRow, ...biometricDataRow, ...tobaccoAndDateDataRow, ...highRiskFactorCount])
                                /*sheetData.push([...userDataRow, ...["", "", "", "", "", "", "", "", "", "", ""], ...tempQuestionDataRow, ...biometricDataRow, ...tobaccoAndDateDataRow, ...highRiskFactorCount]);*/
                            }
                        }
                    }

                    if (displayType === 1) {
                        if (biometricArray.length == 0 || Object.keys(currentUserAssessmentSheetData).length != 0) {
                            sheetData.push(...Object.values(currentUserAssessmentSheetData).flat());
                        }
                        if (tempIncludeDateBioArray.length) {
                            sheetData.push(...tempIncludeDateBioArray);
                        }
                        if (tempBioArray.length) {
                            sheetData.push(...tempBioArray);
                        }
                    }
                if (displayType === 0) {
                    let completeRow = [...userDataRow, ...hraDataRow, ...questionDataRow, ...biometricDataRow, ...tobaccoAndDateDataRow, ...highRiskFactorCount];
                    sheetData.push(completeRow);
                }
            }
            let currnetDatetime = await this.commonDateService.DateTimeFormat('now', 'MM-DD-YYYY-HH-mm-ss');
            let fileName:string = `HRA-Report-${currnetDatetime}`;
            let data = await this.commonService.downloadEncryptFile(fileName, sheetData, 'csv');
            return {
                success: 1,
                data: data,
                error: 0,
                message: 'success'
            };

        } catch (error) {
            console.log("error",error);
            this.cronCommonService.errorLog(
                0,
                'hra-detail-report',
                error?.message,
                error,
            );
            return {
                success: 0,
                data: null,
                message: error.message,
                error: 1,
            };
        }
    }

}