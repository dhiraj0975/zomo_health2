import {
    appConstant, AssessmentEmotionalAssessmentAnswerEntity,
    AssessmentEmotionalAssessmentEntity,
    AssessmentHaOptionsEntity,
    AssessmentHaQuestionsEntity,
    AssessmentResultsEntity, AssessmentTabsEntity, BaseService,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    Enum, HealthReReportEntity,
    reportFieldsConstant,
    tableConstant,
    UserEntity
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import * as argon2 from "argon2";
import * as path from 'path';
import { lastValueFrom } from "rxjs";
import { CompanyService } from 'src/module/company/company.service';
import { UserService } from 'src/module/user/user.service';
import { In, Not, Raw, Repository } from 'typeorm';
import { CronCommonService } from "../../../common";
import {
    assessmentOptionsInterface, NoOfRisk, ReportRow, RiskCalculator,
    RiskCounter, RiskLevel, ShowResultType
} from "../../../interface";
import {
    AssessmentEmotionalAssessmentAnswerService,
    AssessmentEmotionalAssessmentService,
    AssessmentHraBiometricService,
    AssessmentOptionsService,
    AssessmentQuestionsService,
    AssessmentResultsService,
    AssessmentTabsService,
    HraOptionsService,
    HraQuestionsService
} from "../../healthassessment";
import { AssessmentService } from "../../healthassessment/assessments.service";
import { FtBiometricsService } from "../../tracker";
import { BiometricsService } from "../biometrics/biometrics.service";
import { healthReportInput } from "./inputs";
const S3_URL = process.env.S3_URL_PROD;
@Injectable()
export class HealthReportService extends BaseService<HealthReReportEntity> {
    constructor (
        @InjectRepository(HealthReReportEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaHealthReportRepository: Repository<HealthReReportEntity>,
        @InjectRepository(HealthReReportEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaHealthReportRepository: Repository<HealthReReportEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonService: CommonService,
        private readonly companyService: CompanyService,
        private readonly commonDateService: CommonDateService,
        private readonly userService: UserService,
        private readonly commonHealthService: CommonHealthService,
        private readonly commonFileService: CommonFileService,
        private readonly cronCommonService: CronCommonService,
        private readonly assessmentService: AssessmentService,
        private readonly biometricsService: BiometricsService,
        private readonly assessmentHraBiometricService: AssessmentHraBiometricService,
        private readonly ftBiometricsService: FtBiometricsService,
        private readonly assessmentEmotionalAssessmentService: AssessmentEmotionalAssessmentService,
        private readonly assessmentResultsService: AssessmentResultsService,
        private readonly hraQuestionsService: HraQuestionsService,
        private readonly hraOptionsService: HraOptionsService,
        private readonly assessmentTabsService: AssessmentTabsService,
        private readonly assessmentEmotionalAssessmentAnswerService: AssessmentEmotionalAssessmentAnswerService,
        private readonly assessmentOptionsService: AssessmentOptionsService,
        private readonly assessmentQuestionsService: AssessmentQuestionsService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) {
        super(readReplicaHealthReportRepository, writeReplicaHealthReportRepository,'healthReport',commonArrayService);
    }
    async updateReport() {
        const result = await this.readReplicaHealthReportRepository
            .createQueryBuilder('birBiometricReports')
            .select('id')
            .where('created_date < NOW() - INTERVAL 2 HOUR')
            .andWhere('status = 2')
            .andWhere('total_download < 4')
            .limit(1)
            .getRawOne();
        if (!result) {
            return;
        }
        const idToUpdate = result.id;
        const mainQuery = this.writeReplicaHealthReportRepository
            .createQueryBuilder()
            .update()
            .set({
                total_download: () => 'total_download + 1',
                status: 0,
            })
            .where('id = :id', { id: idToUpdate });
        await mainQuery.execute();
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        const queryBuilder = this.readReplicaHealthReportRepository
            .createQueryBuilder()
            .where(condition)
            .orderBy(orderBy);
        const result = await queryBuilder.getMany();
        return result;
    }

    async healthReport(postData: healthReportInput) {
        try {
            /* flag 1 = all, 2 = HRA, 3 = EHA */
            let autoRequestId: number = 0;
            let autoRequest = (postData?.auto_request && this.commonService.isValidNumber(postData?.auto_request)) ? Number(postData?.auto_request) : 0;
            if (autoRequest == 1) {
                autoRequestId = postData?.auto_request_id;
            }
            let reporRequestData;
            if (autoRequest == 1) {
                await this.updateReport();
                reporRequestData = await this.commonQueryBuilder([],
                    `healthReport.status = 0 AND company.status = 1 AND company.deleted  = 0 ${(autoRequestId && autoRequestId !== 0 && autoRequestId !== undefined) ? ' AND healthReport.id = ' + autoRequestId : ''}`,
                    {'healthReport.request_date': 'ASC'},
                    [{
                        join_table: 'healthReport.company',
                        alias: 'company',
                        table: tableConstant.COMPANIES.TBL_COMPANY,
                        on_condition: `company.id = healthReport.org_id`,
                        join_type: 'left_one',
                    }],'getOne'
                );

                if (reporRequestData) {
                    let otheroptions = JSON.parse(reporRequestData?.otheroptions)
                    postData.file_type = 'pdf';
                    postData.department_id = reporRequestData?.department_id? [reporRequestData?.department_id] : [];
                    postData.location_id = reporRequestData?.location ? [reporRequestData?.location]: reporRequestData?.location;
                    postData.org_id = [reporRequestData?.org_id];
                    postData.source_option = otheroptions?.data_source
                }
                postData.flag = postData?.flag || 1;
            }
            let response: any = {};
            let orgId: number[] = (postData.org_id as (string[] | number[])).map(Number)
            if (!orgId.length) {
                return {
                    success: 0,
                    data: null,
                    message: 'ERR_REQUIRED_PARAM_MISSING',
                    error: 1,
                };
            }
            let condition = `users.role_id IN(2,16) AND users.org_id IN(${orgId.join(',')}) AND users.status != '2'`;
            if (['Yes','No'].includes(postData.on_insurance_plan) ) {
                condition += ` AND users.on_insurance_plan = '${postData.on_insurance_plan}'`;
            }
            if (postData?.show_terminated_users === 2) {
                condition += ` AND users.status = '1'`
            }
            if (postData?.department_id?.length > 0) {
                const departmentIds = (postData.department_id as (string[] | number[])).join(',');
                condition += ` AND users.department_id IN(${departmentIds})`;
            }
            if (postData?.location_id?.length > 0) {
                const locationIds = (postData.location_id as (string[] | number[])).join(',');
                condition += ` AND users.location IN(${locationIds})`;
            }
            let joinLocation = false
            if (postData?.country?.length > 0) {
                const country = (postData.country as (string[] | number[])).join(',');
                condition += ` AND locations.country IN(${country})`;
                joinLocation = true
            }
            if (postData?.state?.length > 0) {
                const state = (postData.state as (string[] | number[])).join(',');
                condition += ` AND locations.state IN(${state})`;
                joinLocation = true
            }
            if (postData?.city?.length > 0) {
                const city = (postData.city as (string[] | number[])).join(',');
                condition += ` AND locations.city IN(${city})`;
                joinLocation = true
            }
            let assessmentWhere = '';
            let biometricsWhere = '';
            if (postData?.start_date && postData?.end_date) {
                postData.start_date = await this.commonDateService.DateTimeFormat(postData.start_date, 'YYYY-MM-DD','DD-MM-YYYY');
                postData.end_date = await this.commonDateService.DateTimeFormat(postData.end_date, 'YYYY-MM-DD','DD-MM-YYYY');
                let startDate = `${postData?.start_date} 00:00:00`;
                let endDate = `${postData?.end_date} 23:59:59`;
                assessmentWhere = `AND DATE_FORMAT(CONVERT_TZ(assessments.date,'UTC',CASE WHEN users.timezone != '' THEN users.timezone ELSE 'UTC' END),'%Y-%m-%d') BETWEEN '${startDate}' AND '${endDate}' `;
                biometricsWhere = ` AND biometrics.created BETWEEN '${startDate}' AND '${endDate}' `;
            }
            let joinCondition = [];
            if (joinLocation) {
                joinCondition = [
                    {
                        join_table: 'users.locations',
                        alias: 'locations',
                        table: tableConstant.COMPANIES.TBL_LOCATION,
                        on_condition: `locations.id = users.location`,
                        join_type: 'left_one',
                    }
                ]
            }
            let users = await this.userService.commonQueryBuilder([], condition, {}, [
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
            ], 'getMany', {}, 'users.id')
            response['organization_name'] = users?.[0]?.['company']?.['company_name'] || ''
            let companyid = users?.[0]?.['company']?.['id'] || ''
            let companyLogo = users?.[0]?.['company']?.['company_logo'] || ''
            response['organization_logo'] = S3_URL + 'companylogos/' + companyid + '/' + companyLogo;
            let usersIds = []
            const userArray = new Map<number, UserEntity>();
            for (let i: number = 0; i < users.length; i++) {
                let user = users[i];
                let userId = user.id
                userArray.set(userId, user)
                usersIds.push(userId)
            }

            let totalUsers: number = usersIds.length

            let assessmentData
            let usersBioCount: number = 0
            let bioUserIds = []
            let sourceOption: number[] = postData?.source_option
            let sourceOptionArray: number[] = [1, 2, 3]
            if ([appConstant.ROLE.ADMIN,appConstant.ROLE.ORGADMIN].includes(postData?.userDetails?.role_id) || autoRequest == 1) {
                let message = '';
                let count = await this.userService.commonQueryBuilder([], condition, {}, joinCondition, 'getCount')
                if (count < 25) {
                    let needs = 25 - count;
                    message = `The selected group needs ${needs} more individual entries to review aggregate health reports. Aggregate information currently displays for 25 members or more, per HIPAA regulations.`;
                    return {
                        success: 0,
                        data: null,
                        message: message,
                        error: 1,
                    };
                } else {
                    /* TODO: banne query ne sepret kari ne user_id IN usersIds no use karvo  */
                    /* TODO Biometric.created con add */
                    let usersBio = await this.userService.commonQueryBuilder(['users.id'], `users.id IN(${usersIds.join(',')}) AND (biometrics.height!='' or biometrics.weight!='' or  biometrics.alc!='' or  biometrics.bmi!='' or  biometrics.systolic!='' or  biometrics.diastolic!='' or  biometrics.total_cholesterol!='' or  biometrics.hdl!='' or  biometrics.ldl!='' or biometrics.triglycerides!='' or  biometrics.blood_glucose!='' OR hraBiometrics.height_ft!='' or hraBiometrics.height_in!='' or hraBiometrics.weight!='' or hraBiometrics.alc!='' or hraBiometrics.bp_systolic!='' or hraBiometrics.bp_diastolic!='' or hraBiometrics.total_cholesterol!='' or hraBiometrics.hdl!='' or hraBiometrics.ldl!='' or hraBiometrics.triglycerides!='' or hraBiometrics.blood_glucose!='') ${biometricsWhere}`, {}, [
                        {
                            join_table: 'users.biometrics',
                            alias: 'biometrics',
                            table: tableConstant.HEALTH_CHECKUP.TBL_HC_BIOMETRICS,
                            on_condition: `biometrics.user_id = users.id`,
                            join_type: 'left_one',
                        },
                        {
                            join_table: 'users.hraBiometrics',
                            alias: 'hraBiometrics',
                            table: tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS,
                            on_condition: `hraBiometrics.user_id = users.id`,
                            join_type: 'left_one',
                        }
                    ], 'getMany', {}, 'hraBiometrics.user_id,biometrics.user_id')
                    usersBioCount = usersBio.length
                    for (let i: number = 0; i < usersBioCount; i++) {
                        bioUserIds.push(usersBio[i].id)
                    }
                    assessmentData = await this.userService.commonQueryBuilder(
                        ["assessments.id AS id","assessments.user_id AS user_id","assessments.activity_id AS activity_id","assessments.`1` AS `1`","assessments.1_qscore AS 1_qscore","assessments.1_WorstScore AS 1_WorstScore","assessments.`2` AS `2`","assessments.2_qscore AS 2_qscore","assessments.2_WorstScore AS 2_WorstScore","assessments.`3` AS `3`","assessments.3_qscore AS 3_qscore","assessments.3_WorstScore AS 3_WorstScore","assessments.`4` AS `4`","assessments.4_qscore AS 4_qscore","assessments.4_WorstScore AS 4_WorstScore","assessments.`5` AS `5`","assessments.5_qscore AS 5_qscore","assessments.5_WorstScore AS 5_WorstScore","assessments.score AS score","assessments.hra_status AS hra_status","assessments.hra_reset AS hra_reset","assessments.language_set AS language_set","assessments.status AS status","DATE_FORMAT(CONVERT_TZ(assessments.date,'UTC',CASE WHEN users.timezone != '' THEN users.timezone ELSE 'UTC' END),'%Y-%m-%d') AS date"],
                        `users.id IN(${usersIds.join(',')}) ${assessmentWhere} AND assessments.status != '2'`,
                        {'assessments.id': 'DESC'},
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
                        'users.id'
                    )
                    if (((sourceOption?.length && sourceOptionArray.length === sourceOption?.length && sourceOptionArray.every(v => sourceOption.includes(v))) || !sourceOption?.length) && (usersBioCount < 25 && assessmentData.length < 25)) {
                        let needs = 25 - usersBioCount;
                        message = `The selected group needs ${needs} more individual entries to review aggregate health reports. Aggregate information currently displays for 25 members or more, per HIPAA regulations.`;
                    } else if ((sourceOption?.length && [2, 3].some(v => sourceOption.includes(v))) && usersBioCount < 25) {
                        let needs = 25 - usersBioCount;
                        message = `The selected group needs ${needs} more individual entries to review aggregate health reports. Aggregate information currently displays for 25 members or more, per HIPAA regulations.`;
                    } else if ((sourceOption?.length && sourceOption.includes(1)) && assessmentData.length < 25) {
                        let needs = 25 - assessmentData.length;
                        message = `The selected group needs ${needs} more individual entries to review aggregate health reports. Aggregate information currently displays for 25 members or more, per HIPAA regulations.`;
                    }
                    if (message) {
                        return {
                            success: 0,
                            data: null,
                            message: message,
                            error: 1,
                        };
                    }
                }
            }


            if ((((sourceOption?.length && sourceOption.includes(1))) || !sourceOption?.length) && [1,2].includes(postData?.flag)) {
                let overallScore: number = 0;
                let assessmentResultScore = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
                let assessmentResultRiskLevel = [{title: "Current Health", Low_Risk: 0, Moderate_Risk: 0, High_Risk: 0},{title: "Prevention", Low_Risk: 0, Moderate_Risk: 0, High_Risk: 0},{title: "Nutrition", Low_Risk: 0, Moderate_Risk: 0, High_Risk: 0},{title: "Exercise", Low_Risk: 0, Moderate_Risk: 0, High_Risk: 0},{title: "Emotional Health", Low_Risk: 0, Moderate_Risk: 0, High_Risk: 0}]
                let totalAssessmentResult = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
                let getPercentage = async (numerator: number, denominator: number) => {
                    if (!numerator || !denominator) {
                        return '0.00%';
                    }
                    const value = (numerator / denominator) * 100;
                    return `${value.toFixed(2)}%`;
                }
                let countValues = async (data,optionMap) => {
                    const result = new Map<string, number>();
                    const optionIdMap = new Map();
                    for (const [questionId, options] of optionMap.entries()) {
                        for (const opt of options) {
                            optionIdMap.set(opt.id, { questionId, title: opt.option_title });
                        }
                    }
                    const questionOptionCount = new Map();
                    const questionUserCount = new Map();

                    if (data) {
                        const getRiskLevel = async (score) => {
                            if (score <= 69) return "High Risk";
                            if (score <= 89) return "Moderate Risk";
                            if (score <= 100) return "Low Risk";
                        };
                        for (const obj of data) {
                            const userId = obj.user_id;

                            for (let i: number = 1; i <= 5; i++) {
                                const values = obj[i]?.split(',');

                                let scoreValue = { score_1: '', score_2: '', score_3: '', score_4: '', score_5: '' };
                                if (obj[`${i}_qscore`] !== null && scoreValue[`score_${i}`] === '') {
                                    if (obj[`${i}_WorstScore`] == '0') {
                                        scoreValue[`score_${i}`] = 100
                                    } else {
                                        scoreValue[`score_${i}`] = Math.round(((1 - (obj[`${i}_qscore`] / obj[`${i}_WorstScore`])) * 100) * 100) / 100;
                                    }
                                    assessmentResultScore[i] = (assessmentResultScore[i] || 0) + scoreValue[`score_${i}`];
                                    totalAssessmentResult[i] = (totalAssessmentResult[i] || 0) + 1;
                                    let riskLevel = await getRiskLevel(scoreValue[`score_${i}`]);
                                    await this.commonHealthService.incrementRiskCounter(assessmentResultRiskLevel[i - 1], riskLevel);
                                }

                                for (const val of values) {
                                    const optionId = parseInt(val.trim());
                                    if (!optionId) continue;

                                    const optionData = optionIdMap.get(optionId);
                                    if (optionData) {
                                        const { questionId } = optionData;

                                        if (!questionOptionCount.has(questionId)) {
                                            questionOptionCount.set(questionId, new Map());
                                        }
                                        const questionMap = questionOptionCount.get(questionId);
                                        questionMap.set(optionId, (questionMap.get(optionId) || 0) + 1);

                                        if (!questionUserCount.has(questionId)) {
                                            questionUserCount.set(questionId, new Set());
                                        }
                                        questionUserCount.get(questionId).add(userId);
                                    }
                                }
                            }

                            let totalHraQsCore = Math.abs(obj['1_qscore'] + obj['2_qscore'] + obj['3_qscore'] + obj['4_qscore'] + obj['5_qscore']);
                            let totalHraWorstScore = Math.abs(obj['1_WorstScore'] + obj['2_WorstScore'] + obj['3_WorstScore'] + obj['4_WorstScore'] + obj['5_WorstScore']);
                            if (totalHraWorstScore) {
                                let score = Math.round(((1 - (totalHraQsCore / totalHraWorstScore)) * 100) * 100) / 100
                                overallScore += score;
                            }
                        }
                    }

                    const finalResult = new Map();
                    for (const [questionId, optionCounts] of questionOptionCount.entries()) {
                        finalResult.set(questionId, {
                            options: Object.fromEntries(optionCounts),
                            total_users: questionUserCount.get(questionId)?.size || 0
                        });
                    }

                    return finalResult;
                }

                let totalUserCount = assessmentData?.length || 0
                let questionData: AssessmentHaQuestionsEntity[] = await this.hraQuestionsService.getAll({questioncat_id: In([1,2,3,4,5]),status: Not(Enum.Two),company_id: Raw(() => `(${orgId.map(id => `FIND_IN_SET('${id}', company_id) > 0`).join(' OR ')})`)},['id','questioncat_id','question_title'],{order: "ASC"})
                const questionIds = [...new Set(questionData.map(item => item.id))];
                let optionData: AssessmentHaOptionsEntity[] = await this.hraOptionsService.getAll({
                    status: Not(Enum.Two),
                    question_id: In(questionIds)
                }, ['id', 'question_id', 'option_title'], {order: "ASC"})

                const optionMap = new Map<number, any>();
                for (let j: number = 0; j < optionData.length; j++) {
                    let option: AssessmentHaOptionsEntity = optionData[j]
                    const existing: AssessmentHaOptionsEntity[] = optionMap.get(option.question_id) || [];
                    existing.push(option);
                    optionMap.set(option.question_id, existing);
                }
                const mapResult = await countValues(assessmentData,optionMap);
                const len: number = assessmentData.length || 1;
                const assessmentResult = {
                    "0": { title: "Average Score", percentage: await getPercentage(overallScore / 100, len), count: 0 },
                    "1": { title: "Current Health", percentage: await getPercentage(assessmentResultScore['1'] / 100, totalAssessmentResult['1']), count: 0 },
                    "2": { title: "Prevention", percentage: await getPercentage(assessmentResultScore['2'] / 100, totalAssessmentResult['2']), count: 0 },
                    "3": { title: "Nutrition", percentage: await getPercentage(assessmentResultScore['3'] / 100, totalAssessmentResult['3']), count: 0 },
                    "4": { title: "Exercise", percentage: await getPercentage(assessmentResultScore['4'] / 100, totalAssessmentResult['4']), count: 0 },
                    "5": { title: "Emotional Health", percentage: await getPercentage(assessmentResultScore['5'] / 100, totalAssessmentResult['5']), count: 0 }
                };
                /* TODO: Change the response to a common format and set the key names properly in lowercase. */
                if (postData?.flag != 1) {
                    for (let i: number = 0; i < assessmentResultRiskLevel.length; i++) {
                        let lowRisk = assessmentResultRiskLevel[i]['Low_Risk'];
                        let moderateRisk = assessmentResultRiskLevel[i]['Moderate_Risk'];
                        let highRisk= assessmentResultRiskLevel[i]['High_Risk'];
                        let total = lowRisk + moderateRisk + highRisk
                        let lowRiskPercentage = total ? ((lowRisk / total) * 100).toFixed(2) + '%' : `0.00%`;
                        let moderateRiskPercentage = total ? ((moderateRisk / total) * 100).toFixed(2) + '%' : `0.00%`;
                        let highRiskPercentage = total ? ((highRisk / total) * 100).toFixed(2) + '%' : `0.00%`;
                        assessmentResultRiskLevel[i]['total'] = total
                        assessmentResultRiskLevel[i]['low_risk'] = {total: lowRisk,percentage: lowRiskPercentage}
                        assessmentResultRiskLevel[i]['moderate_risk'] = {total: moderateRisk,percentage: moderateRiskPercentage}
                        assessmentResultRiskLevel[i]['high_risk'] = {total: highRisk,percentage: highRiskPercentage}
                        delete assessmentResultRiskLevel[i]['Low_Risk'];
                        delete assessmentResultRiskLevel[i]['Moderate_Risk'];
                        delete assessmentResultRiskLevel[i]['High_Risk'];
                    }
                    response['hra_summary_result'] = assessmentResultRiskLevel
                }
                let rowData = []
                for (let i: number = 0; i < questionData.length; i++) {
                    let question: AssessmentHaQuestionsEntity = questionData[i]
                    let datas: any = mapResult.get(question.id) || {}
                    let questionRowData = {
                        question: question?.question_title,
                        total_users: `${datas.total_users || 0} / ${totalUserCount}`,
                        total_percentage: await getPercentage(datas.total_users, totalUserCount)
                    }
                    /*TODO add type */
                    let optionRowData = []
                    let questionOption = optionMap.get(question.id) || []
                    for (let j: number = 0; j < questionOption.length; j++) {
                        let option: AssessmentHaOptionsEntity = questionOption[j]
                        let count: number = datas.options?.[option.id] || 0
                        let obj = {
                            option: option?.option_title,
                            count: count,
                            percentage: await getPercentage(count, datas.total_users)
                        }
                        optionRowData.push(obj)
                    }
                    questionRowData['options'] = optionRowData
                    rowData.push(questionRowData)
                }
                response['HRA_assessment'] = rowData
                response['HRA_result'] = assessmentResult
            }


                /*biometric start*/
            if (usersBioCount >= 25 && (((sourceOption?.length && [2, 3].some(v => sourceOption.includes(v)))) || !sourceOption?.length)) {
                let result: any = await this.generateBiometricSummary(usersIds,postData)
                response['biometric_data'] = result?.biometric_data
            }
                /*biometric end */

            if ((((sourceOption?.length && sourceOption.includes(1))) || !sourceOption?.length) && [1,3].includes(postData?.flag)) {
                let result: any = await this.generateHealthAssessmentQuestionOption(usersIds,orgId,condition)
                response['EHA_data'] = result?.EHAData
                response['EHA_result'] = result?.health_assessment_summary
            }
            if (postData?.result_type === 2) {
                let dataObj = {
                    organization_name: response?.organization_name,
                    organization_logo: response?.organization_logo,
                    biometric_data: response?.biometric_data,
                    EHA_result: response?.EHA_result,
                    EHA_data: response?.EHA_data,
                    HRA_assessment: response?.HRA_assessment,
                    HRA_result: response?.HRA_result,
                    hra_summary_result: response?.hra_summary_result,
                };

                let bufferData: any = await this.commonService.generateBiometricPdf(dataObj,'src/common/templates/biometric-summary.template.hbs')
                return {'buffer': bufferData };
            }
            if (autoRequest == 1) {
                let zipPassword = await this.companyService.getCompanyZipPassword(postData?.org_id[0]);
                let dataObj = {
                    biometric_data: response?.biometric_data,
                    EHA_result: response?.EHA_result,
                    EHA_data: response?.EHA_data,
                    HRA_assessment: response?.HRA_assessment,
                    HRA_result: response?.HRA_result,
                };
                let currnetDatetime = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD-HHmmss');
                let fileName:string = `Health_report_${reporRequestData?.id}_${currnetDatetime}.pdf`;
                let directory = path.join(
                    appConstant.HEALTH_CHECKUP_IMAGE_PATH,
                    this.commonFileService.sanitizeFileName(postData.org_id[0]),
                );
                let bufferData: any = await this.commonService.generateBiometricPdf(dataObj,'src/common/templates/biometric-summary.template.hbs')
                let filePath = await this.commonService.savePdf(bufferData, `${directory}/${fileName}`);

                let resultData = Object.create(null);
                let zipPath = ``;
                let zipPathDir = ``;
                if (await this.commonFileService.fileExist(filePath)) {
                    try {
                        let result: any =
                            await this.commonFileService.createPasswordProtectedZip(
                                filePath,
                                zipPassword.toString(),
                                'create_zip.py',
                            );
                        filePath = filePath.replace('.pdf', '.zip');
                        fileName = fileName.replace('.json', '.zip');
                        zipPath = `automatic_report/health_reports/${reporRequestData?.id}/Health_report.zip`;
                        zipPathDir = path.join(directory, fileName);
                        let uploadResult = await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' },
                                {
                                    path: path.resolve(`${zipPathDir}`),
                                    filename: `${zipPath}`,
                                    userBucket: 'private',
                                },
                            ),
                        );
                        if (!uploadResult) {
                            resultData['error_message'] = 'Report Not Uploaded to Bucket';
                        }
                    } catch (err) {
                        resultData['error_message'] = 'Report Not Uploaded to Bucket';
                    }
                } else {
                    resultData['error_message'] = 'File does not exist';
                }
                resultData['id'] = reporRequestData?.id;
                resultData['file_name'] = zipPath;
                resultData['auto_report_zip_password'] = Buffer.from(await argon2.hash(zipPassword)).toString('base64');
                resultData['error_message'] = '';
                resultData['status'] = 1;
                resultData['updated_date'] =this.commonDateService.DateTimeFormat('now','YYYY-MM-DD HH:mm:ss');
                await this.updateRecord({ id: reporRequestData?.id },resultData);
                await this.commonFileService.removeFileFromLocal(filePath);
            }
            return response
        }catch (error) {
            console.log("error",error);
            this.cronCommonService.errorLog(
                0,
                'health-report',
                error?.message,
                error,
            );
            return {
                success: 0,
                message: error.message,
                error: 1,
            };
        }
    }
    async hraHealthReport(postData: any, usersIds) {
        try{
            let orgId: number[] = (postData.org_id as (string[] | number[])).map(Number)
            if (!orgId.length) {
                return {
                    success: 0,
                    data: null,
                    message: 'ERR_REQUIRED_PARAM_MISSING',
                    error: 1,
                };
            }
            let assessmentWhere = '';
            if (postData?.start_date && postData?.end_date) {
                assessmentWhere = `AND DATE_FORMAT(CONVERT_TZ(assessments.date,'UTC',CASE WHEN users.timezone != '' THEN users.timezone ELSE 'UTC' END),'%Y-%m-%d') BETWEEN '${postData?.start_date}-01-01 00:00:00' AND '${postData?.end_date}-12-31 23:59:59' `;
            }

            let assessmentData = await this.userService.commonQueryBuilder(
                ["assessments.id AS id","assessments.user_id AS user_id","assessments.activity_id AS activity_id","assessments.`1` AS `1`","assessments.1_qscore AS 1_qscore","assessments.1_WorstScore AS 1_WorstScore","assessments.`2` AS `2`","assessments.2_qscore AS 2_qscore","assessments.2_WorstScore AS 2_WorstScore","assessments.`3` AS `3`","assessments.3_qscore AS 3_qscore","assessments.3_WorstScore AS 3_WorstScore","assessments.`4` AS `4`","assessments.4_qscore AS 4_qscore","assessments.4_WorstScore AS 4_WorstScore","assessments.`5` AS `5`","assessments.5_qscore AS 5_qscore","assessments.5_WorstScore AS 5_WorstScore","assessments.score AS score","assessments.hra_status AS hra_status","assessments.hra_reset AS hra_reset","assessments.language_set AS language_set","assessments.status AS status","DATE_FORMAT(CONVERT_TZ(assessments.date,'UTC',CASE WHEN users.timezone != '' THEN users.timezone ELSE 'UTC' END),'%Y-%m-%d') AS date"],
                `users.id IN(${usersIds.join(',')}) ${assessmentWhere} AND assessments.status != '2'`,
                {'assessments.id': 'DESC'},
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
                'users.id'
            )
            async function countValues(data) {
                let assessmentScore = {"1": {low: 0, medium: 0, high: 0}, "2": {low: 0, medium: 0, high: 0}, "3": {low: 0, medium: 0, high: 0}, "4": {low: 0, medium: 0, high: 0}, "5": {low: 0, medium: 0, high: 0}};
                if (data) {
                    for (const obj of data) {
                        for (let i: number = 1; i <= 5; i++) {
                            let scoreValue = { score_1: '', score_2: '', score_3: '', score_4: '', score_5: '' };
                            if (obj[`${i}_qscore`] !== null && scoreValue[`score_${i}`] === '') {
                                if (obj[`${i}_WorstScore`] == '0') {
                                    scoreValue[`score_${i}`] = 100
                                } else {
                                    scoreValue[`score_${i}`] = Math.round((1 - (obj[`${i}_qscore`] / obj[`${i}_WorstScore`])) * 100);
                                }
                                let score = scoreValue[`score_${i}`];
                                if (score <= 49) {
                                    assessmentScore[i]['high'] += 1;
                                } else if (score >= 50 && score <= 89) {
                                    assessmentScore[i]['medium'] += 1;
                                } else if (score >= 90 && score <= 100) {
                                    assessmentScore[i]['low'] += 1;
                                }
                            }
                        }
                    }
                }
                return assessmentScore;
            }
            const assessmentResultScore = await countValues(assessmentData);
            const len: number = assessmentData.length || 1;
            const calc = (score) => `${(((score || 0) / len) * 100).toFixed(2)}`;
            const assessmentResult = [
                { title: "Count", count: len },
                { title: "Current Health", count: len },
                { title: "Prevention", count: len },
                { title: "Nutrition", count: len },
                { title: "Exercise", count: len },
                { title: "Emotional Health", count: len },
            ];
            for (let i: number = 1; i <= 5; i++) {
                assessmentResult[i]['low'] = assessmentResultScore[i]['low'] ?? 0;
                assessmentResult[i]['low_percentage'] = calc(assessmentResultScore[i]['low']);
                assessmentResult[i]['medium'] = assessmentResultScore[i]['medium'] ?? 0;
                assessmentResult[i]['medium_percentage'] = calc(assessmentResultScore[i]['medium']);
                assessmentResult[i]['high'] = assessmentResultScore[i]['high'] ?? 0;
                assessmentResult[i]['high_percentage'] = calc(assessmentResultScore[i]['high']);
            }
            return assessmentResult;
        }
        catch (error) {
            this.cronCommonService.errorLog(0,'hra-health-report',error?.message,error,);
            return {
                success: 0,
                message: error.message,
                error: 1,
            };
        }
    }

    async generateBiometricSummary(
        usersIds: number[],
        postData: healthReportInput,
        camp_id = null
    ) {
        try {
            let hraBiometricDate: string = '',hcBiometricDate: string = '',ftBiometricDate: string = '';
            let bioData = new Map<number, any>();
            if (postData?.start_date && postData?.end_date) {
                let fromDate = await this.commonDateService.DateTimeFormat(postData?.start_date, 'YYYY-MM-DD');
                let toDate = await this.commonDateService.DateTimeFormat(postData?.end_date, 'YYYY-MM-DD');
                hraBiometricDate = `AND DATE_FORMAT(CONVERT_TZ(hraBiometric.date,'UTC',CASE WHEN users.timezone != '' THEN users.timezone ELSE 'UTC' END),'%Y-%m-%d') BETWEEN '${fromDate}' AND '${toDate}' `;
                hcBiometricDate = `AND DATE_FORMAT(CONVERT_TZ(biometrics.created,'UTC',CASE WHEN users.timezone != '' THEN users.timezone ELSE 'UTC' END),'%Y-%m-%d') BETWEEN '${fromDate}' AND '${toDate}' `;
                ftBiometricDate = `AND DATE_FORMAT(CONVERT_TZ(ftBiometrics.added_date,'UTC',CASE WHEN users.timezone != '' THEN users.timezone ELSE 'UTC' END),'%Y-%m-%d') BETWEEN '${fromDate}' AND '${toDate}' `;
            }

            let sourceHra: number[] = [];
            if (postData?.source_option.includes(1)) {
                sourceHra = [...sourceHra,...[1,13,14,15]]
            }
            if (postData?.source_option.includes(2)) {
                sourceHra = [...sourceHra,...[2]]
            }
            if (postData?.source_option.includes(3)) {
                sourceHra = [...sourceHra, ...[3,11,12]]
            }
            let sourceHraIds: string = sourceHra.join(',');
            let biometricsSourceCondition: string = '',hraBiometricSourceCondition: string = '',ftBiometricSourceCondition: string = '';
            if (sourceHraIds) {
                biometricsSourceCondition = `AND biometrics.source IN(${sourceHraIds})`;
                hraBiometricSourceCondition = `AND hraBiometric.source IN(${sourceHraIds})`;
                ftBiometricSourceCondition = `AND ftBiometrics.source IN(${sourceHraIds})`;
            }
            let maxIds = await this.biometricsService.commonQueryBuilder(["SUBSTRING_INDEX(MAX(CONCAT(created, '_', id)), '_', -1) AS id"],`user_id IN(${usersIds.join(',')}) ${biometricsSourceCondition}`,null,[],'getRawMany',{},'biometrics.user_id')
            let maxBioIds = []
            for (let i: number = 0; i < maxIds.length; i++) {
                maxBioIds.push(maxIds[i].id)
            }
            let maxBioIdCondition = ''
            if (maxBioIds.length) {
                maxBioIdCondition =  `AND biometrics.id IN(${maxBioIds.join(',')})`
            }
            let hcBiometricsData = await this.userService.commonQueryBuilder(
                ['users.id AS user_id','users.gender AS gender', 'biometrics.id AS id', 'biometrics.user_id AS user_id', 'biometrics.height AS height', 'biometrics.alc AS alc', 'biometrics.weight AS weight', 'biometrics.bmi AS bmi', 'biometrics.systolic AS systolic', 'biometrics.diastolic AS diastolic', 'IF(biometrics.test_type = 1, biometrics.blood_glucose, 0) AS random_blood_glucose', 'IF(biometrics.test_type = 2, biometrics.blood_glucose, 0) AS fasting_blood_glucose', 'biometrics.total_cholesterol AS total_cholesterol', 'biometrics.hdl AS hdl', 'biometrics.ldl AS ldl', 'biometrics.triglycerides AS triglycerides', 'biometrics.blood_glucose AS blood_glucose', 'biometrics.waist AS waist', 'biometrics.source AS source', 'biometrics.created AS created', 'biometrics.inserted AS inserted', "DATE_FORMAT(biometrics.created, '%Y-%m-%d %H:%i:%s') AS log_date_tmp", 'biometrics.enter_by AS enter_by', 'biometrics.test_type AS test_type', 'biometrics.is_tobacco_user AS is_tobacco_user','TIMESTAMPDIFF(YEAR, users.dob, CURDATE()) AS age'],
                `users.id IN(${usersIds.join(',')}) ${biometricsSourceCondition} ${hcBiometricDate} AND biometrics.status != '2'`,
                { 'users.first_name': 'ASC' },
                [
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
                ],
                'getRawMany',
                {},
                'users.id'
            )
            for (let i: number = 0; i < hcBiometricsData.length; i++) {
                let data = hcBiometricsData[i];
                let userId = data['user_id'];
                let checkExist = bioData.get(userId) || {};
                if (Object.keys(checkExist).length === 0) {
                    data = await this.commonService.biometricsrecordData([data]);
                    checkExist = {...checkExist,...data[0]}
                    bioData.set(userId,checkExist)
                }
            }
            let hraBiometricsData = await this.userService.commonQueryBuilder(
                ['users.id AS user_id','users.gender AS gender', 'hraBiometric.id AS id', 'hraBiometric.user_id AS user_id', 'hraBiometric.alc AS alc', 'hraBiometric.weight AS weight', 'hraBiometric.height_ft AS height_ft', 'hraBiometric.height_in AS height_in', "CONCAT(hraBiometric.height_ft, '.', hraBiometric.height_in) AS height", 'hraBiometric.bp_systolic AS systolic', 'IF(hraBiometric.test_type = 1, hraBiometric.blood_glucose, 0) AS random_blood_glucose', 'IF(hraBiometric.test_type = 2, hraBiometric.blood_glucose, 0) AS fasting_blood_glucose', 'hraBiometric.bp_diastolic AS diastolic', 'hraBiometric.total_cholesterol AS total_cholesterol', 'hraBiometric.hdl AS hdl', 'hraBiometric.ldl AS ldl', 'hraBiometric.triglycerides AS triglycerides', 'hraBiometric.blood_glucose AS blood_glucose', 'hraBiometric.waist AS waist', 'hraBiometric.source AS source', 'hraBiometric.date AS created', 'hraBiometric.date AS inserted', 'hraBiometric.test_type AS test_type', "DATE_FORMAT(hraBiometric.date, '%Y-%m-%d %H:%i:%s') AS log_date_tmp", '0 AS enter_by','TIMESTAMPDIFF(YEAR, users.dob, CURDATE()) AS age'],
                `users.id IN(${usersIds.join(',')}) ${hraBiometricSourceCondition} ${hraBiometricDate} AND hraBiometric.status != '2'`,
                {'hraBiometric.id': 'DESC'},
                [
                    {
                        join_table: 'users.hraBiometric',
                        alias: 'hraBiometric',
                        table: tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS,
                        on_condition: `hraBiometric.user_id = users.id AND hraBiometric.id != ''`,
                        join_type: 'inner_one',
                    }
                ],
                'getRawMany',
                {},
                'users.id'
            )
            for (let i: number = 0; i < hraBiometricsData.length; i++) {
                let data = hraBiometricsData[i];
                let userId = data['user_id'];
                let checkExist = bioData.get(userId) || {};
                if (Object.keys(checkExist).length === 0) {
                    data = await this.commonService.biometricsrecordData([data]);
                    checkExist = {...checkExist,...data[0]}
                    bioData.set(userId,checkExist)
                }
            }
            if (sourceHra.length == 0 || sourceHra.includes(14)) {
                let ftBiometricsData = await this.userService.commonQueryBuilder(
                    ['users.id AS user_id','users.gender AS gender', 'ftBiometrics.id AS id', 'ftBiometrics.user_id AS user_id', 'ftBiometrics.alc AS alc', "CONCAT(ftBiometrics.height_ft, '.', ftBiometrics.height_in) AS height", 'ftBiometrics.height_ft AS height_ft', 'ftBiometrics.height_in AS height_in', 'ftBiometrics.weight AS weight', 'ftBiometrics.systolic AS systolic ', 'ftBiometrics.diastolic AS diastolic', 'IF(ftBiometrics.glucose_type = 1, ftBiometrics.glucose, 0) AS random_blood_glucose', 'IF(ftBiometrics.glucose_type = 2, ftBiometrics.glucose, 0) as fasting_blood_glucose', 'ftBiometrics.glucose AS blood_glucose', 'ftBiometrics.chol_total AS total_cholesterol', 'ftBiometrics.hdl AS hdl', 'ftBiometrics.ldl AS ldl', 'ftBiometrics.triglycerides AS triglycerides', 'DATE_FORMAT(CONVERT_TZ(ftBiometrics.added_date,"UTC",CASE WHEN users.timezone != "" THEN users.timezone ELSE "UTC" END),"%Y-%m-%d") AS created', 'ftBiometrics.inserted AS inserted', "'' AS waist", 'ftBiometrics.source AS source', "DATE_FORMAT(ftBiometrics.added_date, '%Y-%m-%d %H:%i:%s') AS log_date_tmp", 'ftBiometrics.glucose_type AS test_type', '0 AS enter_by','TIMESTAMPDIFF(YEAR, users.dob, CURDATE()) AS age'],
                    `users.id IN(${usersIds.join(',')}) ${ftBiometricSourceCondition} ${ftBiometricDate} AND ftBiometrics.status != '2'`,
                    {'ftBiometrics.id': 'DESC'},
                    [
                        {
                            join_table: 'users.ftBiometrics',
                            alias: 'ftBiometrics',
                            table: tableConstant.TRACKERS.TBL_FT_BIOMETRICS,
                            on_condition: `ftBiometrics.user_id = users.id AND ftBiometrics.id != ''`,
                            join_type: 'inner_one',
                        }
                    ],
                    'getRawMany',
                    {},
                    'users.id'
                )
                for (let i: number = 0; i < ftBiometricsData.length; i++) {
                    let data = ftBiometricsData[i];
                    let userId = data['user_id'];
                    let checkExist = bioData.get(userId) || {};
                    if (Object.keys(checkExist).length === 0) {
                        data = await this.commonService.biometricsrecordData([data]);
                        checkExist = {...checkExist,...data[0]}
                        bioData.set(userId,checkExist)
                    }
                }
            }
            let screeningResults =  [...bioData.values()]
            let totalParticipant =  [...bioData.keys()]
            let screeningResult = JSON.parse(JSON.stringify(reportFieldsConstant?.ScreeningResult));
            let screeningBiometricResult = JSON.parse(JSON.stringify(reportFieldsConstant?.ScreeningBiometricResult));
            if(postData?.start_date && postData?.end_date && screeningResults.length){
                let currentYear = await this.commonDateService.DateTimeFormat('now', 'YYYY');
                let year = await this.commonDateService.DateTimeFormat(postData?.end_date, 'YYYY');
                for(let user of screeningResults){
                    ({screeningResult, screeningBiometricResult} = await this.screeningSummary(user,screeningResult, currentYear == year || camp_id ? screeningBiometricResult : null));
                }
            }
            let bioTable = await this.commonHealthService.calculateBiometricRisks(screeningResults);
            return {"biometric_data": bioTable, screeningResult, screeningBiometricResult, totalParticipant: totalParticipant?.length || 0};
        } catch (error) {
            console.log("error",error);
            this.cronCommonService.errorLog(
                0,
                'health-report-health-assessment-summary',
                error?.message,
                error,
            );
        }
    }
    async screeningSummary(user, screeningResult, screeningBiometricResult) {
        try {
            let count = 0;
            const riskConditions = [
                user?.bmi > 30,
                (user?.glucoseFasting || user?.fasting_blood_glucose) > 125 && (user?.glucoseRandom || user?.random_blood_glucose) > 199,
                user?.age > 45,
                user?.totalCholesterol || user?.total_cholesterol > 200,
                (user?.bpSystolic || user?.systolic) > 140,
                (user?.bpDystolic || user?.diastolic) > 90,
                (user?.is_tobacco_user === 2 || user?.is_tobacco_user) === 3,
            ];
            count = riskConditions.filter(Boolean).length;
            const riskKey = count >= 4 ? '4 +' : count.toString();
            if (screeningResult[riskKey] !== undefined) {
                screeningResult[riskKey] += 1;
            }

            if (screeningBiometricResult) {
                const metrics = [
                    {
                        key: 'BMI',
                        value: Number(user?.bmi),
                        thresholds: [
                            { level: 'very_high', condition: val => val > 35 },
                            { level: 'high', condition: val => val >= 30 && val <= 35 },
                            { level: 'medium', condition: val => val >= 25 && val < 30 },
                            { level: 'low', condition: val => val < 25 },
                        ],
                    },
                    {
                        key: 'NF BLOOD GLUCOSE',
                        value: Number(user?.glucoseRandom ?? user?.random_blood_glucose),
                        thresholds: [
                            { level: 'high', condition: val => val >= 126 },
                            { level: 'medium', condition: val => val >= 100 && val <= 125 },
                            { level: 'low', condition: val => val < 100 },
                        ],
                    },
                    {
                        key: 'FASTING BLOOD GLUCOSE',
                        value: Number(user?.glucoseFasting ?? user?.fasting_blood_glucose),
                        thresholds: [
                            { level: 'high', condition: val => val > 100 },
                            { level: 'medium', condition: val => val >= 70 && val <= 99 },
                            { level: 'low', condition: val => val < 70 },
                        ],
                    },
                    {
                        key: 'A1C',
                        value: Number(user?.ALC ?? user?.alc),
                        thresholds: [
                            { level: 'very_high', condition: val => val > 6.4 },
                            { level: 'high', condition: val => val >= 5.7 && val <= 6.4 },
                            { level: 'low', condition: val => val <= 5.7 },
                        ],
                    },
                    {
                        key: 'BP SYSTOLIC',
                        value: Number(user?.bpSystolic ?? user?.systolic),
                        thresholds: [
                            { level: 'very_high', condition: val => val > 160 },
                            { level: 'high', condition: val => val >= 140 && val <= 160 },
                            { level: 'medium', condition: val => val >= 120 && val <= 139 },
                            { level: 'low', condition: val => val < 120 },
                        ],
                    },
                    {
                        key: 'BP DIASTOLIC',
                        value: Number(user?.bpDystolic ?? user?.diastolic),
                        thresholds: [
                            { level: 'very_high', condition: val => val >= 100 },
                            { level: 'high', condition: val => val >= 90 && val <= 99 },
                            { level: 'medium', condition: val => val >= 80 && val <= 89 },
                            { level: 'low', condition: val => val < 80 },
                        ],
                    },
                    {
                        key: 'TOTAL CHOLESTEROL',
                        value: Number(user?.totalCholesterol ?? user?.total_cholesterol),
                        thresholds: [
                            { level: 'high', condition: val => val >= 240 },
                            { level: 'medium', condition: val => val >= 200 && val <= 239 },
                            { level: 'low', condition: val => val < 200 },
                        ],
                    },
                    {
                        key: 'TRIGLYCERIDES',
                        value: Number(user?.triGlycerides ?? user?.triglycerides),
                        thresholds: [
                            { level: 'very_high', condition: val => val >= 500 },
                            { level: 'high', condition: val => val >= 200 && val <= 499 },
                            { level: 'medium', condition: val => val >= 150 && val <= 199 },
                            { level: 'low', condition: val => val < 150 },
                        ],
                    },
                    {
                        key: 'HDL',
                        value: Number(user?.hdl),
                        thresholds: [
                            { level: 'high', condition: val => val < 40 },
                            { level: 'medium', condition: val => val >= 40 && val <= 59 },
                            { level: 'low', condition: val => val > 59 },
                        ],
                    },
                    {
                        key: 'LDL',
                        value: Number(user?.ldl),
                        thresholds: [
                            { level: 'very_high', condition: val => val > 159 },
                            { level: 'high', condition: val => val >= 130 && val <= 159 },
                            { level: 'medium', condition: val => val >= 100 && val <= 129 },
                            { level: 'low', condition: val => val < 100 },
                        ],
                    },
                ];

                for (const metric of metrics) {
                    if (metric.value !== undefined && metric.value !== null) {
                        const matched = metric.thresholds.find(t => t?.condition(metric.value));
                        if (matched) {
                            screeningBiometricResult = this.updateStatusLevel(metric.key, matched.level, screeningBiometricResult);
                        }
                    }
                }
            }
            return { screeningResult, screeningBiometricResult };
        } catch (error) {
            throw new Error(error.message);
        }
    }
    updateStatusLevel(key, level, statusObject) {
        if (statusObject[key] && statusObject[key][level] !== undefined) {
            statusObject[key][level] += 1;
        } 
        return statusObject;
    }

    async generateHealthAssessmentQuestionOption(
        usersIds: number[],
        orgId: number[],
        condition: string
    ) {
        try {
            /*EHA start*/
            /* TODO add condition EHA role wise validation 19,20,22,7,23 */
            let result = {}

            let emotionalAssessment = await this.assessmentEmotionalAssessmentService.commonQueryBuilder(['emotionalAssessment.user_id AS user_id','emotionalAssessment.id AS id',"DATE_FORMAT(CONVERT_TZ(DATE_FORMAT(emotionalAssessment.created,'%Y-%m-%d %H:%i:%s'),'UTC',CASE WHEN `users`.`timezone` != '' THEN `users`.`timezone` ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s') as created"],
             `${condition} AND emotionalAssessment.hra_status = '100'`,
                null,
                [
                    {
                        join_table: 'emotionalAssessment.users',
                        alias: 'users',
                        table: tableConstant.TBL_USERS,
                        on_condition: `users.id = emotionalAssessment.user_id`,
                        join_type: 'inner_one',
                    },
                ],
                'getRawMany',
                {},
                'emotionalAssessment.user_id'
            )
            let userId = [];
            let question;
            const emotionalAssessmentAnswerRecord = new Map<number, AssessmentEmotionalAssessmentAnswerEntity[]>();
            let questionOptionObj = new Map<number, assessmentOptionsInterface[]>();
            const emotionalAssessmentResultData = new Map<number, AssessmentEmotionalAssessmentEntity>();
            if (emotionalAssessment) {
                let ids = [];
                for (let i: number = 0; i < emotionalAssessment.length; i++) {
                    let data = emotionalAssessment[i];
                    ids.push(data.id)
                    userId.push(data.user_id)
                    emotionalAssessmentResultData.set(data?.user_id, data);
                }

                let EmotionalAssessmentAnswerData: AssessmentEmotionalAssessmentAnswerEntity[] = await this.assessmentEmotionalAssessmentAnswerService.getAll({ assessment_id: In(ids),status: Not(2) },['id','option_id','answer','assessment_id'],{id: 'DESC'});
                for (let i: number = 0; i < EmotionalAssessmentAnswerData.length; i++) {
                    let emotionalAssessmentAnswer: AssessmentEmotionalAssessmentAnswerEntity = EmotionalAssessmentAnswerData[i];
                    let checkExist: AssessmentEmotionalAssessmentAnswerEntity[] = emotionalAssessmentAnswerRecord.get(emotionalAssessmentAnswer.option_id) || []
                    checkExist.push(emotionalAssessmentAnswer)
                    emotionalAssessmentAnswerRecord.set(emotionalAssessmentAnswer.option_id,checkExist)

                }

                let tabsAll: AssessmentTabsEntity[] = await this.assessmentTabsService.getAll({organization_id: In(orgId),status: 1},['id','title'],{'sort_order': 'ASC','id': 'ASC'})
                if (tabsAll) {
                    const tabsIds = tabsAll.map(item => item.id).filter(Boolean);
                    question = await this.assessmentQuestionsService.commonQueryBuilder(['assessmentQuestions.id','assessmentQuestions.result_type','assessmentQuestionsDetails.question_id','assessmentQuestionsDetails.question_title'],
                        {tab_id: In(tabsIds),type: 1,status: 1},
                        {'tab_id': 'ASC','sort_order': 'ASC'},
                        [{
                            join_table: 'assessmentQuestions.assessmentQuestionsDetails',
                            alias: 'assessmentQuestionsDetails',
                            table: tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS_DETAILS,
                            on_condition: `assessmentQuestions.id = assessmentQuestionsDetails.question_id`,
                            join_type: 'left_one',
                        }],
                        'getMany'
                    )

                }
                let questionId: number[] = []
                let resultTypeMap = new Map<number, any>();
                for (let j: number = 0; j < question.length; j++) {
                    questionId.push(question[j]?.id)
                    resultTypeMap.set(question[j]?.id,question[j]?.result_type)
                }

                let assessmentOptions = await this.assessmentOptionsService.commonQueryBuilder(['assessmentOptions.id','assessmentOptions.risk_rating','assessmentOptions.question_id','assessmentOptionsDetails.option_title','assessmentOptionsDetails.option_id'],
                    {status: 1,question_id: In(questionId)},
                    {"assessmentOptions.sort_order": "ASC"},
                    [
                        {
                            join_table: 'assessmentOptions.assessmentOptionsDetails',
                            alias: 'assessmentOptionsDetails',
                            table: tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS,
                            on_condition: `assessmentOptions.id = assessmentOptionsDetails.option_id`,
                            join_type: 'inner_one',
                        },
                    ],
                    'getMany',
                )
                let optionQuestionMap = new Map<number, any>();
                for (let i: number = 0; i < assessmentOptions.length; i++) {
                    let data = assessmentOptions[i];
                    let result_type = resultTypeMap.get(data?.question_id);
                    let checkExist: assessmentOptionsInterface[] = questionOptionObj.get(data?.question_id) || []
                    checkExist.push(data);
                    questionOptionObj.set(data?.question_id,checkExist)
                    optionQuestionMap.set(data?.id, {
                        risk_rating: data?.risk_rating,
                        assessmentQuestions: {
                            question_id: data?.question_id,
                            result_type: result_type || null
                        }
                    });
                }

                let HealthAssessmentSummary = await this.generateHealthAssessmentSummary(EmotionalAssessmentAnswerData,emotionalAssessmentResultData,emotionalAssessmentAnswerRecord,optionQuestionMap,orgId)
                result['health_assessment_summary'] = HealthAssessmentSummary
            }

            let totalUserCount: number = userId.length;
            const emotionalMapResult = await this.countEmotionalValues(
                emotionalAssessmentResultData,
                emotionalAssessmentAnswerRecord,
                questionOptionObj,
                userId
            );

            let EHAData = [];
            for (let i = 0; i < question.length; i++) {
                let questionItem = question[i];
                let questionId = questionItem?.assessmentQuestionsDetails?.question_id;
                let datas = emotionalMapResult.get(questionId) || {};

                let questionRowData = {
                    id: questionItem.id,
                    question_id: questionId,
                    question: questionItem?.assessmentQuestionsDetails?.question_title,
                    count: `${datas.total_users || 0} / ${totalUserCount}`,
                    percentage: datas.total_users ? `${(datas.total_users / totalUserCount * 100).toFixed(2)}%` : "0.00%"
                };

                let optionRowData = [];
                let questionOptions = questionOptionObj.get(questionId) || [];
                for (let j: number = 0; j < questionOptions.length; j++) {
                    let option = questionOptions[j];
                    let optionCount = datas.options?.[option.id] || 0;
                    let optionPercentage = datas.total_users ? `${(optionCount / datas.total_users * 100).toFixed(2)}%` : "0.00%";
                    if (option.assessmentOptionsDetails?.option_title) {
                        let optionObj = {
                            id: option.id,
                            option_id: option.assessmentOptionsDetails?.option_id,
                            option: option.assessmentOptionsDetails?.option_title,
                            count: optionCount,
                            percentage: optionPercentage
                        };
                        optionRowData.push(optionObj);
                    } else {
                        const optionAns: any = emotionalAssessmentAnswerRecord.get(option.assessmentOptionsDetails?.option_id) || [];
                        const answerCountMap: Record<string, number> = {};
                        const totalAnswers = optionAns.length;
                        for (let k: number = 0; k < totalAnswers; k++) {
                            const answer = optionAns[k]?.answer;
                            if (!answer) continue;
                            answerCountMap[answer] = (answerCountMap[answer] || 0) + 1;
                        }
                        for (let answer in answerCountMap) {
                            const count = answerCountMap[answer];
                            const optionPercentage = totalAnswers
                                ? `${((count / totalAnswers) * 100).toFixed(2)}%`
                                : "0.00%";
                            optionRowData.push({
                                id: option.id,
                                option_id: option.assessmentOptionsDetails?.option_id,
                                option: answer,
                                count: count,
                                percentage: optionPercentage
                            });
                        }
                    }
                }
                questionRowData['options'] = optionRowData;
                EHAData.push(questionRowData);
            }
            /*EHA end*/
            result['EHAData'] = EHAData

            return result;
        } catch (error) {
            console.log("error",error);
            this.cronCommonService.errorLog(
                0,
                'health-report-health-assessment-summary',
                error?.message,
                error,
            );
        }
    }

    async countEmotionalValues(emotionalAssessmentResultData, emotionalAssessmentAnswerRecord, questionOptionObj, userIds) {
        try {
            const questionOptionCount = new Map();
            const questionUserCount = new Map();

            const optionIdMap = new Map();
            for (const [questionId, options] of questionOptionObj.entries()) {
                for (const opt of options) {
                    optionIdMap.set(opt.id, { questionId, title: opt.assessmentOptionsDetails?.option_title });
                }
            }

            for (const userId of userIds) {
                const emotionalAssessment = emotionalAssessmentResultData.get(userId);
                if (!emotionalAssessment) continue;

                for (const [questionId, options] of questionOptionObj.entries()) {
                    for (const option of options) {
                        const emotionalAssessmentAnswers = emotionalAssessmentAnswerRecord.get(option.id) || [];
                        const userAnswer = emotionalAssessmentAnswers.find(ans => ans.assessment_id === emotionalAssessment.id);

                        if (userAnswer) {
                            if (!questionOptionCount.has(questionId)) {
                                questionOptionCount.set(questionId, new Map());
                            }
                            if (!questionUserCount.has(questionId)) {
                                questionUserCount.set(questionId, new Set());
                            }

                            const questionMap = questionOptionCount.get(questionId);
                            questionMap.set(option.id, (questionMap.get(option.id) || 0) + 1);

                            questionUserCount.get(questionId).add(userId);
                            break;
                        }
                    }
                }
            }

            const finalResult = new Map();
            for (const [questionId, optionCounts] of questionOptionCount.entries()) {
                finalResult.set(questionId, {
                    options: Object.fromEntries(optionCounts),
                    total_users: questionUserCount.get(questionId)?.size || 0
                });
            }

            return finalResult;
        }  catch (error) {
            console.log("error",error);
            this.cronCommonService.errorLog(
                0,
                'health-report-count-emotional-values',
                error?.message,
                error,
            );
        }
    }


    async generateHealthAssessmentSummary(EmotionalAssessmentAnswerData: any, emotionalAssessmentResultData: any, emotionalAssessmentAnswerRecord: any, optionQuestionMap: any, orgId) {
        try {
            const ehaAssessmentResults: AssessmentResultsEntity[] = await this.assessmentResultsService.getAll({ organization_id: In(orgId), status: 1, type: In([0, 2]) }, ['id', 'title', 'no_of_risk', 'order_id', 'type'], { order_id: 'ASC' });

            let minNoOfRisk: number = Infinity;
            const assessmentResultMap = new Map<number, AssessmentResultsEntity>();
            const counters = new Map<number, RiskCounter>();

            for (const assessmentResult of ehaAssessmentResults) {
                if (assessmentResult.no_of_risk < minNoOfRisk) {
                    minNoOfRisk = assessmentResult.no_of_risk;
                }
                assessmentResultMap.set(assessmentResult.id, assessmentResult);
                counters.set(assessmentResult.id, {doingGreat: 0, almostThereMed: 0, weCanHelpHigh: 0, almostThereMod: 0, weCanHelpVeryHigh: 0, total: 0});
            }

            const showResult: ShowResultType = minNoOfRisk === 2 ? 2 : minNoOfRisk === 1 ? 3 : 5;

            const answersByAssessment = new Map<number, AssessmentEmotionalAssessmentAnswerEntity[]>();
            for (const answer of EmotionalAssessmentAnswerData) {
                if (!answersByAssessment.has(answer.assessment_id)) {
                    answersByAssessment.set(answer.assessment_id, []);
                }
                answersByAssessment.get(answer.assessment_id).push(answer);
            }

            const riskCalculators: Record<NoOfRisk, RiskCalculator> = {
                0: (maxRisk: RiskLevel, counter: RiskCounter) => {
                    const riskMap: Record<RiskLevel, keyof Omit<RiskCounter, 'total'>> = {0: 'doingGreat', 1: 'almostThereMed',2: 'weCanHelpHigh', 3: 'almostThereMod', 4: 'weCanHelpVeryHigh'};
                    counter[riskMap[maxRisk]] += 1;
                    counter.total += 1;
                },
                1: (maxRisk: RiskLevel, counter: RiskCounter) => {
                    if (maxRisk === 0) {
                        counter.doingGreat += 1;
                    } else if (maxRisk === 1 || maxRisk === 3) {
                        counter.almostThereMed += 1;
                    } else {
                        counter.weCanHelpHigh += 1;
                    }
                    counter.total += 1;
                },
                2: (maxRisk: RiskLevel, counter: RiskCounter) => {
                    if (maxRisk === 0) {
                        counter.doingGreat += 1;
                    } else {
                        counter.weCanHelpHigh += 1;
                    }
                    counter.total += 1;
                }
            };

            const MARKER_COLORS = {LOW: '#6ca540', MEDIUM: '#ffb848', HIGH: '#ff8b38', MODERATE: '#b76931', VERY_HIGH: '#734702', NEUTRAL: '#ccc'} as const;

            const markerColorMaps: Record<NoOfRisk, string[]> = {
                0: [MARKER_COLORS.LOW, MARKER_COLORS.MEDIUM, MARKER_COLORS.HIGH, MARKER_COLORS.MODERATE, MARKER_COLORS.VERY_HIGH],
                1: [MARKER_COLORS.LOW, MARKER_COLORS.MEDIUM, MARKER_COLORS.HIGH, MARKER_COLORS.MEDIUM, MARKER_COLORS.HIGH],
                2: [MARKER_COLORS.LOW, MARKER_COLORS.NEUTRAL, MARKER_COLORS.NEUTRAL, MARKER_COLORS.NEUTRAL, MARKER_COLORS.NEUTRAL]
            };

            const processedUserResults = new Set<string>();

            for (const [userId, assessment] of emotionalAssessmentResultData.entries()) {
                const userAnswers = answersByAssessment.get(assessment.id);
                if (!userAnswers) continue;

                const resultTypeRiskGroups = new Map<number, RiskLevel[]>();

                for (const answer of userAnswers) {
                    const option = optionQuestionMap.get(answer.option_id);
                    if (!option?.assessmentQuestions?.result_type || option.risk_rating == null) continue;

                    const resultType = option.assessmentQuestions.result_type;
                    const riskRating = option.risk_rating as RiskLevel;

                    if (!resultTypeRiskGroups.has(resultType)) {
                        resultTypeRiskGroups.set(resultType, []);
                    }
                    resultTypeRiskGroups.get(resultType).push(riskRating);
                }

                for (const [resultType, riskRatings] of resultTypeRiskGroups.entries()) {
                    const userResultKey = `${userId}_${resultType}`;
                    if (processedUserResults.has(userResultKey)) continue;
                    processedUserResults.add(userResultKey);

                    const counter = counters.get(resultType);
                    const assessmentResult = assessmentResultMap.get(resultType);
                    if (!counter || !assessmentResult) continue;

                    const maxRiskRating = Math.max(...riskRatings) as RiskLevel;
                    const noOfRisk = assessmentResult.no_of_risk as NoOfRisk;
                    const calculator = riskCalculators[noOfRisk];

                    if (calculator) {
                        calculator(maxRiskRating, counter);
                    }
                }
            }

            const formatPercentage = (count: number, total: number): string => {
                const percentageValue = total > 0 ? ((count / total) * 100).toFixed(2) : '0.00';
                return `${count} / ${percentageValue}%`;
            };

            const getMarkerColor = (counter: RiskCounter, noOfRisk: NoOfRisk, type: number): string => {
                if (type === 2) return MARKER_COLORS.NEUTRAL;

                const riskCounts: number[] = [counter.doingGreat, counter.almostThereMed, counter.weCanHelpHigh, counter.almostThereMod, counter.weCanHelpVeryHigh];

                const maxCount = Math.max(...riskCounts);
                const maxRiskIndex = riskCounts.indexOf(maxCount);

                return markerColorMaps[noOfRisk]?.[maxRiskIndex] || MARKER_COLORS.NEUTRAL;
            };

            const reportRows: ReportRow[] = ehaAssessmentResults.map((assessmentResult): ReportRow | null => {
                    const counter = counters.get(assessmentResult.id);
                    if (!counter) return null;

                    const markerColor = getMarkerColor(
                        counter,
                        assessmentResult.no_of_risk as NoOfRisk,
                        assessmentResult.type
                    );

                    const baseRow: Pick<ReportRow, 'marker_color' | 'Health Assesment Section'> = {
                        marker_color: markerColor,
                        "Health Assesment Section": assessmentResult.title
                    };

                    switch (showResult) {
                        case 5:
                            return {
                                ...baseRow,
                                "Doing Great": formatPercentage(counter.doingGreat, counter.total),
                                "Almost There - Med": formatPercentage(counter.almostThereMed, counter.total),
                                "Almost There - Mod": formatPercentage(counter.almostThereMod, counter.total),
                                "We Can Help - High": formatPercentage(counter.weCanHelpHigh, counter.total),
                                "We Can Help - Very High": formatPercentage(counter.weCanHelpVeryHigh, counter.total),
                                Total: `${counter.total} / 100%`
                            };
                            break;

                        case 3:
                            return {
                                ...baseRow,
                                "Doing Great": formatPercentage(counter.doingGreat, counter.total),
                                "Almost There": formatPercentage(counter.almostThereMed, counter.total),
                                "We Can Help": formatPercentage(counter.weCanHelpHigh, counter.total),
                                Total: `${counter.total} / 100%`
                            };
                            break;

                        case 2:
                            return {
                                ...baseRow,
                                "Doing Great": formatPercentage(counter.doingGreat, counter.total),
                                "We Can Help": formatPercentage(counter.weCanHelpHigh, counter.total),
                                Total: `${counter.total} / 100%`
                            };
                            break;

                        default:
                            return null;
                    }
                })
                .filter((row): row is ReportRow => row !== null);

            return reportRows;
        } catch (error) {
            console.log("error",error);
            this.cronCommonService.errorLog(
                0,
                'health-report-health-assessment-summary',
                error?.message,
                error,
            );
        }
    }

}
