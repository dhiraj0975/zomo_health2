import {
    appConstant,
    AssessmentEmotionalAssessmentAnswerEntity,
    AssessmentEmotionalAssessmentEntity,
    AssessmentOptionsDetailsEntity,
    AssessmentTabsEntity,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonService,
    CompaniesEntity,
    tableConstant,
} from '@common-constants';
import {
    In, Not,
} from 'typeorm';
import { UserService } from '../../user/user.service';
import {CompanyService} from "../../company/company.service";
import {Injectable} from "@nestjs/common";
import * as path from 'path';
import {assessmentOptionsInterface, ehaDetailReportInterface} from "../../../interface";
import {cronAppConstant, CronCommonService} from "../../../common";
import {
    AssessmentEmotionalAssessmentAnswerService,
    AssessmentEmotionalAssessmentService,
    AssessmentOptionsService
} from "../../healthassessment";
import {AssessmentTabsService} from "../../healthassessment/assessment-tabs/assessment-tabs.service";
import {AssessmentQuestionsService} from "../../healthassessment/assessment-questions/assessment-questions.service";

@Injectable()
export class EhaDetailReportService {
    constructor(
        private readonly commonService: CommonService,
        private readonly userService: UserService,
        private readonly companyService: CompanyService,
        private readonly commonDateService: CommonDateService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly cronCommonService: CronCommonService,
        private readonly assessmentEmotionalAssessmentService: AssessmentEmotionalAssessmentService,
        private readonly assessmentEmotionalAssessmentAnswerService: AssessmentEmotionalAssessmentAnswerService,
        private readonly assessmentOptionsService: AssessmentOptionsService,
        private readonly assessmentTabsService: AssessmentTabsService,
        private readonly assessmentQuestionsService: AssessmentQuestionsService,
    ) {}

    async ehaDetailReport(postData: ehaDetailReportInterface) {
        try {

            let orgId = postData.org_id;
            let terminatedUsers: number = postData.terminated_users;
            if (!orgId || !terminatedUsers) {
                return {
                    success: 0,
                    data: null,
                    message: 'ERR_REQUIRED_PARAM_MISSING',
                    error: 1,
                };
            }
            let companyData: CompaniesEntity = await this.companyService.getOne({ id: orgId, status: 1, deleted: 0 },['id', 'code','status','deleted']);
            let membershipCode = companyData?.code;
            let where: string = `users.role_id IN(2,16) AND users.membership_code = '${membershipCode}' AND emotionalAssessment.hra_status = '100'`
            if (postData?.terminated_users === 2) {
                where += ` AND users.status = '1'`
            }
            if (postData?.department_ids?.length > 0) {
                where += ` AND users.department_id IN(${postData.department_ids})`
            }
            if (postData?.location_ids?.length > 0) {
                where += ` AND users.location IN(${postData.location_ids})`
            }
            if (postData?.from_date && postData?.to_date) {
                let fromDate = await this.commonDateService.DateTimeFormat(postData.from_date, 'YYYY-MM-DD','DD-MM-YYYY')
                let toDate = await this.commonDateService.DateTimeFormat(postData.to_date, 'YYYY-MM-DD','DD-MM-YYYY')
                where += ` AND DATE_FORMAT(CONVERT_TZ(emotionalAssessment.created,'UTC',CASE WHEN users.timezone != '' THEN users.timezone ELSE 'UTC' END),'%Y-%m-%d') BETWEEN '${fromDate}' AND '${toDate}'`
            }
            if (postData.result_type === 1 && postData?.search_str) {
                where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['users.first_name', 'users.last_name', 'full_name','company.company_name', 'department.dept_name','locations.location_name'],true,'users');
            }

            if (postData.result_type === 1) {
                if (postData?.search_str) {
                    where += `AND (users.first_name LIKE '%${postData?.search_str}%' OR users.last_name LIKE '%${postData?.search_str}%' OR CONCAT(users.first_name, ' ', users.last_name) LIKE '%${postData?.search_str}%' OR department.dept_name LIKE '%${postData?.search_str}%' OR locations.location_name LIKE '%${postData?.search_str}%' OR company.company_name LIKE '%${postData?.search_str}%')`
                }
                let result = await this.userService.commonQueryBuilder(['users.id', 'users.code', 'users.first_name', 'users.middle_name', 'users.last_name', 'users.dob', 'users.gender', 'company.company_name', 'department.dept_name', 'locations.location_name'],
                    where,
                    {'users.first_name': 'ASC','users.last_name': 'ASC'},
                    [
                        {
                            join_table: 'users.emotionalAssessment',
                            alias: 'emotionalAssessment',
                            table: tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS,
                            on_condition: `emotionalAssessment.user_id = users.id`,
                            join_type: 'inner_one',
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
                    ],
                    'getManyAndCount',
                    postData,
                    'users.id'
                )

                return {
                    success: 1,
                    data: result,
                    error: 0,
                    message: 'success'
                };
            }
            let emotionalAssessment = await this.assessmentEmotionalAssessmentService.commonQueryBuilder(['emotionalAssessment.user_id AS user_id','emotionalAssessment.id AS id',"emotionalAssessment.created AS created"],
                where,
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

                let optionId = []
                let EmotionalAssessmentAnswerData: AssessmentEmotionalAssessmentAnswerEntity[] = await this.assessmentEmotionalAssessmentAnswerService.getAll({ assessment_id: In(ids),status: Not(2) },['id','option_id','answer','assessment_id'],{id: 'DESC'});
                for (let i: number = 0; i < EmotionalAssessmentAnswerData.length; i++) {
                    let emotionalAssessmentAnswer: AssessmentEmotionalAssessmentAnswerEntity = EmotionalAssessmentAnswerData[i];
                    optionId.push(emotionalAssessmentAnswer.option_id)
                        let checkExist: AssessmentEmotionalAssessmentAnswerEntity[] = emotionalAssessmentAnswerRecord.get(emotionalAssessmentAnswer.option_id) || []
                    checkExist.push(emotionalAssessmentAnswer)
                    emotionalAssessmentAnswerRecord.set(emotionalAssessmentAnswer.option_id,checkExist)

                }

                let assessmentOptions = await this.assessmentOptionsService.commonQueryBuilder(['assessmentOptions.id','assessmentOptions.risk_rating','assessmentOptions.question_id','assessmentOptionsDetails.option_title','assessmentOptionsDetails.option_id'],
                    {id: In(optionId),status: 1},
                    null,
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
                for (let i: number = 0; i < assessmentOptions.length; i++) {
                    let data = assessmentOptions[i];
                    let checkExist: assessmentOptionsInterface[] = questionOptionObj.get(data?.question_id) || []
                    checkExist.push(data);
                    questionOptionObj.set(data?.question_id,checkExist)
                }
            }

            let userResult = await this.userService.commonQueryBuilder(['users.id', 'users.code','users.role_id','users.relationship_id','users.first_name','users.middle_name','users.last_name','userSetting.jobtitle',
                    'users.dob','users.date_of_hire','users.insurance_plan_name','users.gender','users.on_insurance_plan','users.email','users.username','users.employeeid',
                    'company.company_name', 'department.dept_name', 'locations.lname','locations.address1','locations.address2','locations.city','locations.state','locations.zip','locations.country'],
                {id : In(userId)},
                {'users.first_name': 'ASC','users.last_name' : 'ASC'},
                [
                    {
                        join_table: 'users.userSetting',
                        alias: 'userSetting',
                        table: tableConstant.TBL_USERS_SETTINGS,
                        on_condition: `users.id = userSetting.user_id`,
                        join_type: 'inner_one',
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
                ],
                'getMany',
            )


            let headerData: string[] = appConstant.USER_HEADERS;


            let tabsAll: AssessmentTabsEntity[] = await this.assessmentTabsService.getAll({organization_id: orgId,status: 1},['id','title'],{'sort_order': 'ASC','id': 'ASC'})
            let question;
            if (tabsAll) {
                const tabsIds = tabsAll.map(item => item.id).filter(Boolean);
                question = await this.assessmentQuestionsService.commonQueryBuilder(['assessmentQuestions.id','assessmentQuestionsDetails.question_id','assessmentQuestionsDetails.question_title'],
                    `assessmentQuestions.tab_id IN(${tabsIds.join(',')}) AND assessmentQuestions.type = '1' AND assessmentQuestions.status = '1' AND assessmentQuestionsDetails.status = '1'`,
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


            let sheetData = [];
            let allHeaders = [...headerData];
            for (let j: number = 0; j < question.length; j++) {
                let questionTitle: string = question[j]?.assessmentQuestionsDetails?.['question_title'];
                if (questionTitle) {
                    allHeaders.push(`"${questionTitle}"`);
                    allHeaders.push(`"RISK LEVEL"`);
                }
            }
            allHeaders.push(`"Taken Date"`);

            sheetData.push(allHeaders);
            for (let i: number = 0; i < userResult.length; i++) {
                let user = userResult[i];
                let userGender = cronAppConstant.GENDER_MAP[user?.gender?.toLowerCase()] || 0;
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
                    `"${user?.userSetting?.jobtitle || ""}"` || "",
                    user?.employeeid || "",
                    cronAppConstant.GENDER[userGender] || "",
                    await this.commonDateService.DateTimeFormat(user?.dob, 'MM-DD-YYYY') || "",
                    await this.commonDateService.DateTimeFormat(user?.date_of_hire, 'MM-DD-YYYY') || "",
                    cronAppConstant.INSURANCE_PLAN[user?.on_insurance_plan.toLowerCase()] || "",
                    user?.insurance_plan_name ?? "",
                    `"${user?.email}"` || "",
                    `${location}`,
                    user?.role_id == 2 ? "Employee" : "Spouse",
                ];
                let emotionalAssessment: AssessmentEmotionalAssessmentEntity = emotionalAssessmentResultData.get(user?.id)
                if (emotionalAssessment) {
                    for (let j: number = 0; j < question.length; j++) {
                        let data = question[j];
                        let questionTitle: string= data?.assessmentQuestionsDetails?.['question_title']
                        if(questionTitle){
                            let getOption: assessmentOptionsInterface[] = questionOptionObj.get(data?.assessmentQuestionsDetails?.['question_id'])
                            let optionTitle: string = "",optionLevel: string = "";
                            if (getOption?.length > 0) {
                                for (let k: number = 0; k < getOption.length; k++) {
                                    let optionData: assessmentOptionsInterface = getOption[k];
                                    let optionDetails: AssessmentOptionsDetailsEntity = optionData?.assessmentOptionsDetails;
                                    let emotionalAssessmentAnswer: AssessmentEmotionalAssessmentAnswerEntity[] = emotionalAssessmentAnswerRecord.get(optionDetails?.option_id)
                                    let emotionalAssessmentAnswerObj: AssessmentEmotionalAssessmentAnswerEntity = emotionalAssessmentAnswer?.find(obj => obj.assessment_id === emotionalAssessment?.id);
                                    if (emotionalAssessmentAnswerObj && emotionalAssessment?.id == emotionalAssessmentAnswerObj?.assessment_id) {
                                        if (emotionalAssessmentAnswerObj?.answer) {
                                            optionTitle = emotionalAssessmentAnswerObj.answer;
                                        } else {
                                            optionTitle = optionDetails?.option_title;
                                        }
                                        let level = {0: 'Low',1: 'Medium',2: 'High',3: 'Moderate',4: 'Very High'}
                                        optionLevel = level[optionData['risk_rating']];
                                        break;
                                    }
                                }
                            }
                            optionTitle = optionTitle.replace(/,$/, "");
                            if (/^\d{1,2}-[A-Za-z]{3}$/.test(optionTitle) || /\d{1,2}-\d{1,2}/.test(optionTitle)) {
                                userDataRow.push(`="${optionTitle}"`);
                            } else {
                                userDataRow.push(`"${optionTitle}"`);
                            }
                            userDataRow.push(`"${optionLevel}"`);
                        }
                    }
                }
                userDataRow.push(await this.commonDateService.DateTimeFormat(emotionalAssessment?.created, 'MM-DD-YYYY') || "");
                sheetData.push(userDataRow);
            }
            let currnetDatetime = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD-HHmmss');
            let fileName:string = `Emotional_Health_Assessment_Report_${currnetDatetime}`;
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
                'biometric-result-report',
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