import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    QuizQuizzesEntity,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuizReportInput } from './input/quizreport.input';
import { QuizReportService } from '../quiz-report/quizreport.service';
import { CompanyService } from 'src/module/company/company.service';
import { UserService } from 'src/module/user/user.service';
import { lastValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { UserDetailsService } from '../user-details/user-details.service';
import { QuizReportHelperService } from '../quizreporthelper.service';
const moment = require('moment-timezone');
const path = require('path');
const argon2 = require('argon2');

@Injectable()
export class QuizQuizzesService extends BaseService<QuizQuizzesEntity> {
    constructor(
        @InjectRepository(
            QuizQuizzesEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaQuizQuizzesRepository: Repository<QuizQuizzesEntity>,
        @InjectRepository(QuizQuizzesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuizQuizzesRepository: Repository<QuizQuizzesEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonService: CommonService,
        private readonly quizReportService: QuizReportService,
        private readonly companyService: CompanyService,
        private readonly commonDateService: CommonDateService,
        private readonly userService: UserService,
        private readonly commonHealthService: CommonHealthService,
        private readonly commonFileService: CommonFileService,
        private readonly userDetailsService: UserDetailsService,
        private readonly quizReportHelperService: QuizReportHelperService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
    ) {
        super(
            readReplicaQuizQuizzesRepository,
            writeReplicaQuizQuizzesRepository,
            'quiz',
            commonArrayService,
        );
    }
    async quizReport(postData: QuizReportInput): Promise<any> {
        try {
            let autoRequestId: number = 0;
            let requestfor = (postData?.result_type && this.commonService.isValidNumber(postData?.result_type)) ? Number(postData?.result_type) : 0;
            let autoRequest = (postData?.auto_request && this.commonService.isValidNumber(postData?.auto_request)) ? Number(postData?.auto_request) : 0;
            let user = Object.create(postData?.userDetails || {}) || {};
            if (autoRequest == 1) {
                autoRequestId = postData?.auto_request_id;
                requestfor = 2;
            }
            let clmNameArr = [
                'USER CODE', 'DEPARTMENT', 'RELATIONSHIP ID', 'FIRST NAME', 'MIDDLE NAME', 'LAST NAME', 'JOB TITLE', 'GENDER', 'BIRTH DATE',
                'DATE OF HIRE', 'ON HEALTH PLAN', 'HEALTH PLAN NAME', 'EMAIL', 'LOCATION', 'USER TYPE'
            ];
            let membershipcode: string;
            let quizId: number[] | string[] | string;
            let org_id: number, report_id: number;
            let reportRequest;
            let companyid: number;
            let report_setting_id: number, report_fields: string, user_id: number, zipPassword: string;
            if (autoRequest == 1) {
                await this.quizReportService.updateReport();
                reportRequest = await this.quizReportService.findOneReport(
                    `quizReport.status = 0 AND company.status = 1 AND company.deleted  = 0 ${(autoRequestId && autoRequestId !== 0 && autoRequestId !== undefined) ? ' AND quizReport.id = ' + autoRequestId : ''}`,
                );
                if (reportRequest) {
                    report_setting_id = reportRequest?.report_setting_id;
                    report_id = reportRequest?.id;
                    report_fields = reportRequest?.report_fields;
                    org_id = reportRequest?.org_id;
                    user_id = reportRequest?.user_id;
                    membershipcode = reportRequest?.membership_code;
                    quizId =  this.commonArrayService.transformToArray(reportRequest?.camp_id, ',')?.[0];
                    companyid = reportRequest?.['org_id'];
                    zipPassword =
                        await this.companyService.getCompanyZipPassword(
                            companyid,
                        );
                    if (report_setting_id && report_setting_id !== null && report_setting_id !== 0) {
                        if (report_fields !== '' && report_fields !== null) {
                            clmNameArr = Object.values(
                                JSON.parse(report_fields),
                            );
                        }
                    }
                } else {
                    throw new Error('NOT FOUND');
                }
            }
            if (autoRequest === 0) {
                membershipcode = user?.membership_code;
                org_id = user?.org_id;
                companyid = user?.org_id;
                if ([appConstant.ROLE.COACH, appConstant.ROLE.GLOBALCOACH, appConstant.ROLE.WCH, appConstant.ROLE.BROKER, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(user?.role_id)) {
                    membershipcode = postData?.membership_code;
                    org_id = postData?.org_id;
                    companyid = postData?.org_id;
                }
            }
            if (postData?.type == 'superadmin' || postData?.type == 'superadminDetailed') {
                user.org_id = postData?.org_id
                org_id = postData?.org_id
                companyid = postData?.org_id
                user.membership_code = postData?.membership_code
                user.role_id = 1
                membershipcode = postData?.membership_code
            }
            let condition = `User.status = 1`;
            if (autoRequest == 0) {
                condition += ` AND User.role_id IN (2,16) AND User.membership_code = '${membershipcode}'`;
                if (postData?.quiz_id) {
                    condition += ` AND Qzuser.quiz_id = ${postData?.quiz_id}`;
                }
                if (postData?.department_id?.length) {
                    let deptCondition = this.commonArrayService.formatInClauseCondition(postData?.department_id, 'User.department_id');
                    if (deptCondition) {
                        condition += ` AND ${deptCondition}`;
                    }
                }
                if (postData?.location_id?.length) {
                    let locCondition = this.commonArrayService.formatInClauseCondition(postData?.location_id, 'User.location');
                    if (locCondition) {
                        condition += ` AND ${locCondition}`;
                    }
                }
                if (postData?.start_date && postData?.end_date) {
                    condition += ` AND DATE_FORMAT(CONVERT_TZ(Qzuser.created_date, "UTC", CASE WHEN User.timezone != "" THEN User.timezone ELSE "UTC" END), "%Y-%m-%d") >= '${this.commonDateService.DateTimeFormat(postData?.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                    condition += ` AND DATE_FORMAT(CONVERT_TZ(Qzuser.created_date, "UTC", CASE WHEN User.timezone != "" THEN User.timezone ELSE "UTC" END), "%Y-%m-%d") <= '${this.commonDateService.DateTimeFormat(postData?.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                } else if (postData?.start_date) {
                    condition += ` AND DATE_FORMAT(CONVERT_TZ(Qzuser.created_date, "UTC", CASE WHEN User.timezone != "" THEN User.timezone ELSE "UTC" END), "%Y-%m-%d") >= '${this.commonDateService.DateTimeFormat(postData?.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                } else if (postData?.end_date) {
                    condition += ` AND DATE_FORMAT(CONVERT_TZ(Qzuser.created_date, "UTC", CASE WHEN User.timezone != "" THEN User.timezone ELSE "UTC" END), "%Y-%m-%d") <= '${this.commonDateService.DateTimeFormat(postData?.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                }
            } else if (autoRequest == 1) {
                if (reportRequest['condition']) {
                    condition += ` AND ${reportRequest['condition']}`;
                }
                condition += ` AND User.status = 1`;
                condition += ` AND Qzuser.quiz_id = ${quizId}`;
                const startDate = reportRequest['start_date_range'];
                const endDate = reportRequest['end_date_range'];
                if (startDate && endDate && startDate !== '' && endDate !== '') {
                    const formattedStartDate = this.commonDateService.DateTimeFormat(startDate, "YYYY-MM-DD", "YYYY-MM-DD HH:mm:ss");
                    const formattedEndDate = this.commonDateService.DateTimeFormat(endDate, "YYYY-MM-DD", "YYYY-MM-DD HH:mm:ss");
                    condition += ` AND (DATE_FORMAT(Qzuser.created_date, '%Y-%m-%d') BETWEEN '${formattedStartDate}' AND '${formattedEndDate}')`;
                } else if (startDate && startDate !== '') {
                    const formattedStartDate = this.commonDateService.DateTimeFormat(startDate, "YYYY-MM-DD", "YYYY-MM-DD HH:mm:ss");
                    condition += ` AND DATE_FORMAT(Qzuser.created_date, '%Y-%m-%d') >= '${formattedStartDate}'`;
                } else if (endDate && endDate !== '') {
                    const formattedEndDate = this.commonDateService.DateTimeFormat(endDate, "YYYY-MM-DD", "YYYY-MM-DD HH:mm:ss");
                    condition += ` AND DATE_FORMAT(Qzuser.created_date, '%Y-%m-%d') <= '${formattedEndDate}'`;
                }
            }
            let paginate = {
                page: postData?.page || 1,
                limit: postData?.limit || appConstant.RECORD_PER_PAGE,
            }
            condition += ` AND QzAssignQuiz.organization_id = '${membershipcode}' AND Qzuser.status = 1`;
            if (requestfor == 2 && postData?.type == 'superadminDetailed' && autoRequest == 0) {
                let quizExtraDetails: any = await this.userDetailsService.findDetailsReportData(
                    condition,
                    [
                        'Qzuser.id', 'Qzuser.quiz_id', 'Qzuser.score', 'Qzuser.created_date', 'QzAssignQuiz.id', 'QzAssignQuiz.passing_score',
                        'Quizzes.quiz_name', 'QzQuizUserDetail', 'QzQuizDetail.quest_order', 'User.id'
                    ]
                )
                if (quizExtraDetails && quizExtraDetails.length > 0) {
                    let QzQuizDetail = await this.quizReportHelperService.getQzQuizList(
                        `QzQuizDetails.quiz_id = ${postData?.quiz_id}`,
                        ['QzQuizDetails.id', 'QzQuizDetails.quiz_question']
                    );
                    const questionIds = QzQuizDetail.map(detail => detail.id);
                    let questionIdsstr = questionIds.join(',');
                    if (questionIdsstr === '') {
                        questionIdsstr = null;
                    }
                    let MultipleChoice = await this.quizReportHelperService.getQzMultipleChoiceQuestionList(
                        `QzMultipleChoiceQuestionDetails.question_id IN (${questionIdsstr})`,
                        ['QzMultipleChoiceQuestionDetails']
                    );
                    const MultipleChoiceGrouped = MultipleChoice.reduce((acc, item) => {
                        if (!acc[item.question_id]) {
                            acc[item.question_id] = item;
                        }
                        return acc;
                    }, {} as Record<number, any>);
                    let QzFillupQuestion = await this.quizReportHelperService.getQzFillUpList(
                        `QzFillUpQuestionDetails.question_id IN (${questionIdsstr})`,
                        ['QzFillUpQuestionDetails']
                    );
                    const QzFillupQuestionGrouped = QzFillupQuestion.reduce((acc, item) => {
                        if (!acc[item.question_id]) {
                            acc[item.question_id] = {};
                        }
                        acc[item.question_id][item.id] = item.blank_options;
                        return acc;
                    }, {} as Record<number, Record<number, any>>);
                    let QzMatchingdragdropQuestion = await this.quizReportHelperService.getQzMatchingDragDropList(
                        `QzMatchingDragDropQuestionDetails.question_id IN (${questionIdsstr})`,
                        ['QzMatchingDragDropQuestionDetails']
                    );
                    const QzMatchingdragdropQuestionGrouped = QzMatchingdragdropQuestion.reduce((acc, item) => {
                        if (!acc[item.question_id]) {
                            acc[item.question_id] = {};
                        }
                        acc[item.question_id][item.id] = item.answer;
                        return acc;
                    }, {} as Record<number, Record<number, any>>);
                    let QzMultipleresponseQuestion = await this.quizReportHelperService.getQzMultipleResponseList(
                        `QzMultipleResponseQuestionDetails.question_id IN (${questionIdsstr})`,
                        ['QzMultipleResponseQuestionDetails']
                    );
                    const QzMultipleresponseQuestionGrouped = QzMultipleresponseQuestion.reduce((acc, item) => {
                        if (!acc[item.question_id]) {
                            acc[item.question_id] = item;
                        }
                        return acc;
                    }, {} as Record<number, any>);
                    let QzMatchingdropdownQuestion = await this.quizReportHelperService.getQzMatchingDropDownList(
                        `QzMatchingDropDownQuestionDetails.question_id IN (${questionIdsstr})`,
                        ['QzMatchingDropDownQuestionDetails']
                    );
                    let usersData: Record<number, any> = {};
                    for (const [index, healthData] of quizExtraDetails.entries()) {
                        let userId = healthData?.User?.id || 0;
                        let userDetails = await this.userService.userCDLSList(`User.id = ${userId}`, [
                            'User.role_id', 'User.new_password', 'User.timezone',
                            'User.is_camp_eligible', 'User.department_id', 'User.location', 'User.org_id', 'User.id', 'User.email', 'User.on_insurance_plan', 'User.gender',
                            'User.relationship_id', 'User.code', 'User.username', 'User.middle_name', 'User.dob', 'User.date_of_hire', 'User.first_name', 'User.last_name',
                            'User.insurance_plan_name', 'User.created', 'User.employeeid AS user_employeeid',
                            'settings.jobtitle', 'settings.wphone', 'settings.hphone',
                            'company.company_name', 'department.dept_name',
                            'Location.lname', 'Location.address1', 'Location.city', 'Location.state', 'Location.zip', 'Location.country',
                        ]);

                        quizExtraDetails[index].User = { ...userDetails };
                        let displayUserAns = '';
                        let displayCorrectAns = '';
                        if (healthData?.QzQuizUserDetail && Array.isArray(healthData?.QzQuizUserDetail)) {
                            for (const [index, healthDataQz] of healthData?.QzQuizUserDetail?.entries()) {
                                if (healthDataQz?.id && healthDataQz.id !== '') {
                                    if (healthDataQz.qtype === 'TrueFalse') {
                                        displayUserAns = 'False';
                                        displayCorrectAns = 'False';

                                        if (healthDataQz.answer == 1) {
                                            displayUserAns = 'True';
                                        }
                                        if (healthDataQz.correct_answer == 1) {
                                            displayCorrectAns = 'True';
                                        }
                                    }
                                    else if (healthDataQz.qtype === 'MultipleChoice') {
                                        if (MultipleChoiceGrouped[healthDataQz.question_id] &&
                                            MultipleChoiceGrouped[healthDataQz.question_id][`opt_${healthDataQz.answer}`]) {
                                            displayUserAns = MultipleChoiceGrouped[healthDataQz.question_id][`opt_${healthDataQz.answer}`];
                                        }
                                        if (healthDataQz.correct_answer !== '' &&
                                            MultipleChoiceGrouped[healthDataQz.question_id] &&
                                            MultipleChoiceGrouped[healthDataQz.question_id][`opt_${healthDataQz.correct_answer}`]) {
                                            displayCorrectAns = MultipleChoiceGrouped[healthDataQz.question_id][`opt_${healthDataQz.correct_answer}`];
                                        }
                                    }
                                    else if (healthDataQz.qtype === 'FillInTheBlanks') {
                                        displayUserAns = healthDataQz.answer;
                                        if (QzFillupQuestionGrouped[healthDataQz.question_id]) {
                                            displayCorrectAns = Object.values(QzFillupQuestionGrouped[healthDataQz.question_id]).join(',');
                                        }
                                    }
                                    else if (healthDataQz.qtype === 'MatchingDragDrop') {
                                        if (healthDataQz.answer !== healthDataQz.correct_answer) {
                                            const answerArray = healthDataQz?.answer?.split(',') || [];
                                            const QzMatchingdragdropQuestiontmp = QzMatchingdragdropQuestionGrouped[healthDataQz.question_id];
                                            const userquizresult = answerArray.map((value: string) => {
                                                return QzMatchingdragdropQuestiontmp && QzMatchingdragdropQuestiontmp[value]
                                                    ? QzMatchingdragdropQuestiontmp[value]
                                                    : '';
                                            });
                                            displayUserAns = userquizresult.join(',');
                                        } else {
                                            if (QzMatchingdragdropQuestionGrouped[healthDataQz.question_id]) {
                                                displayUserAns = Object.values(QzMatchingdragdropQuestionGrouped[healthDataQz.question_id]).join(',');
                                            }
                                        }
                                        if (QzMatchingdragdropQuestionGrouped[healthDataQz.question_id]) {
                                            displayCorrectAns = Object.values(QzMatchingdragdropQuestionGrouped[healthDataQz.question_id]).join(',');
                                        }
                                    }
                                    else if (healthDataQz.qtype === 'MultipleQuestion') {
                                        displayUserAns = healthDataQz.answer;
                                        if (displayUserAns !== '' && displayUserAns !== null) {
                                            displayUserAns = healthDataQz.answer.trim();
                                            const answerArray = JSON.parse(healthDataQz.answer);

                                            const mappedAnswers = answerArray.map((sub: number) => {
                                                return sub == 1 ? 'true' : 'false';
                                            });
                                            displayUserAns = mappedAnswers.join(',');
                                            const correctAnswerArray = JSON.parse(healthDataQz.correct_answer);
                                            if (correctAnswerArray && correctAnswerArray.length > 0) {
                                                const mappedCorrectAnswers = correctAnswerArray.map((sub: number) => {
                                                    return sub == 1 ? 'true' : 'false';
                                                });
                                                displayCorrectAns = mappedCorrectAnswers.join(',');
                                            }
                                        } else {
                                            displayUserAns = '';
                                        }
                                    }
                                    else if (healthDataQz.qtype === 'MultipleResponse') {
                                        const correctAnswerKeys = healthDataQz?.correct_answer?.split(',').map((val: string) => `choice_${val}`) || [];
                                        const correctAnswerFlipped: Record<string, boolean> = {};
                                        correctAnswerKeys.forEach((key: string) => {
                                            correctAnswerFlipped[key] = true;
                                        });
                                        const multipleResponseData = QzMultipleresponseQuestionGrouped[healthDataQz.question_id];
                                        const correctValues: string[] = [];
                                        for (const key in correctAnswerFlipped) {
                                            if (multipleResponseData && multipleResponseData[key]) {
                                                correctValues.push(multipleResponseData[key]);
                                            }
                                        }
                                        displayCorrectAns = correctValues.join(',');
                                        const userAnswerKeys = healthDataQz?.answer?.split(',').map((val: string) => `choice_${val}`) || [];
                                        const userAnswerFlipped: Record<string, boolean> = {};
                                        userAnswerKeys.forEach((key: string) => {
                                            userAnswerFlipped[key] = true;
                                        });
                                        const userValues: string[] = [];
                                        for (const key in userAnswerFlipped) {
                                            if (multipleResponseData && multipleResponseData[key]) {
                                                userValues.push(multipleResponseData[key]);
                                            }
                                        }
                                        displayUserAns = userValues.join(',');
                                    }
                                    else if (healthDataQz.qtype === 'Hotspot') {
                                        displayUserAns = 'Block ' + healthDataQz.answer;
                                        displayCorrectAns = 'Block ' + healthDataQz.correct_answer;
                                    }
                                    else if (healthDataQz.qtype === 'MatchingDropDown') {
                                        displayUserAns = QzMatchingdropdownQuestion[healthDataQz.answer - 1]?.['QzMatchingdropdownQuestion']?.drop_options || '';
                                        displayCorrectAns = '';
                                        if (healthDataQz.correct_answer !== '') {
                                            displayCorrectAns = QzMatchingdropdownQuestion[healthDataQz.correct_answer - 1]?.['QzMatchingdropdownQuestion']?.drop_options || '';
                                        }
                                    } else {
                                        console.error('Something went wrong - unknown question type');
                                        continue;
                                    }
                                    const qzUserId = healthData?.id;
                                    if (usersData[qzUserId]) {
                                        if (!usersData?.[qzUserId]?.UserDetail) {
                                            usersData[qzUserId].UserDetail = {};
                                        }
                                        usersData[qzUserId].UserDetail[healthDataQz.question_id] = {
                                            user: displayUserAns,
                                            system: displayCorrectAns
                                        };
                                    } else {
                                        usersData[qzUserId] = { ...healthData };
                                        usersData[qzUserId].UserDetail = {};
                                        usersData[qzUserId].UserDetail[healthDataQz.question_id] = {
                                            user: displayUserAns,
                                            system: displayCorrectAns
                                        };
                                    }
                                }
                            }
                        } else {
                            const qzUserId = healthData?.id;
                            const userquizCopy = { ...healthData };
                            delete userquizCopy.QzQuizUserDetail;
                            usersData[qzUserId] = userquizCopy;
                        }
                    }
                    if (quizExtraDetails) {
                        clmNameArr.push('SCORE', 'DATE', 'MET REQUIREMENTS');
                        quizExtraDetails = await this.mapQuizDetailsReportData(quizExtraDetails, requestfor, clmNameArr, usersData, QzQuizDetail);
                        if (requestfor === 2 && autoRequest == 0) {
                            quizExtraDetails = await this.quizReportXLSX(quizExtraDetails.data, org_id, quizExtraDetails.clmNameArr);
                        }
                    } else {
                        if (autoRequest == 0) {
                            if (requestfor === 2) {
                                throw new Error('No result found.');
                            }
                            quizExtraDetails = { list: [], total: 0, pages: 0, limit: paginate.limit, page: paginate.page };
                        }

                    }
                    return quizExtraDetails;
                }
            }
            if (requestfor === 1) {
                if (postData?.search_str && postData?.search_str != '') {
                    const search = postData?.search_str.toLowerCase();
                    if (moment(postData?.search_str, 'll', true).isValid()) {
                        // condition += ` AND DATE_FORMAT(CONVERT_TZ(Qzuser.created_date, "UTC", CASE WHEN User.timezone != "" THEN User.timezone ELSE "UTC" END), "%Y-%m-%d") LIKE '%${moment(postData?.search_str, 'll', true).format('YYYY-MM-DD')}%' `;
                        condition += ` AND DATE_FORMAT(Qzuser.created_date, '%Y-%m-%d') LIKE '%${moment(postData?.search_str, 'll', true).format('YYYY-MM-DD')}%' `;
                    } else {
                        condition += ` AND (LOWER(User.first_name) LIKE '%${search}%' OR LOWER(User.last_name) LIKE '%${search}%' OR LOWER(CONCAT(User.first_name, ' ', User.last_name)) LIKE '%${search}%' OR department.dept_name LIKE '%${search}%' OR Qzuser.score LIKE '%${search}%')`;
                    }
                }
            }
            let resultDetails = await this.userDetailsService.quizReport(condition, requestfor == 1 ? paginate : null);
            if (resultDetails && ((requestfor === 1 && resultDetails?.['list'] && resultDetails?.['list'].length > 0) || (requestfor === 2 && resultDetails.length > 0))) {
                clmNameArr.push('SCORE', 'DATE', 'MET REQUIREMENTS');
                resultDetails = await this.mapQuizData(resultDetails, requestfor, clmNameArr);
                if (requestfor === 2 && autoRequest == 0) {
                    resultDetails = await this.quizReportXLSX(resultDetails, org_id, clmNameArr);
                }
                if (autoRequest == 1) {
                    resultDetails = await this.quizReportZip(resultDetails, org_id, clmNameArr, report_id, zipPassword);
                }
            } else {
                if (autoRequest == 1) {
                    let r_dataForUpdate = Object.create(null);
                    r_dataForUpdate['id'] = report_id;
                    r_dataForUpdate['error_message'] = 'No records found.';
                    r_dataForUpdate['status'] = '1';
                    r_dataForUpdate['updated_date'] = moment().format(
                        'YYYY-MM-DD HH:mm:ss',
                    );
                    await this.quizReportService.update(
                        r_dataForUpdate,
                    );
                    return 'Report Successfully created.';
                }
                if (autoRequest == 0) {
                    if (requestfor === 2) {
                        throw new Error('No result found.');
                    }
                    resultDetails = { list: [], total: 0, pages: 0, limit: paginate.limit, page: paginate.page };
                }
            }
            return resultDetails;
        } catch (error) {
            console.log('error:', error);
            return {
                success: 0,
                message: error.message,
                error: 1,
            };
        }
    }
    async mapQuizData(resultDetails: any, requestfor: number, clmNameArr: string[]) {
        let tempdatarows = [];
        if (requestfor === 1) {
            let quizDataList = resultDetails?.['list'] || [];
            if (Object.keys(quizDataList).length === 0) {
                return { list: [], total: resultDetails['total'], pages: resultDetails['pages'], limit: resultDetails['limit'], page: resultDetails['page'] }
            }
            for (const [index, quizData] of quizDataList.entries()) {
                let tempdatarow = Object.create(null);
                tempdatarow['name'] = quizData?.User?.first_name + ' ' + quizData?.User?.last_name;
                tempdatarow['code'] = quizData?.User?.code || '';
                tempdatarow['department'] = quizData?.User?.department?.dept_name || '';
                tempdatarow['score'] = (quizData?.score && quizData?.score !== undefined && quizData?.score !== null && quizData?.score !== '') ? quizData?.score : 0;
                const createdTimeUTC = quizData?.created_date;
                const userTimezone = quizData?.User?.timezone || 'UTC';
                const convertedTime = moment.utc(createdTimeUTC).tz(userTimezone);
                tempdatarow['date'] = (convertedTime.format('ll')) || '';
                if (quizData?.score && quizData?.QzAssignQuiz?.passing_score) {
                    if (quizData?.score >= quizData?.QzAssignQuiz?.passing_score) {
                        tempdatarow['met_req'] = 'Yes';
                    } else {
                        tempdatarow['met_req'] = 'No';
                    }
                } else {
                    tempdatarow['met_req'] = 'No';
                }
                tempdatarows.push(tempdatarow);
            }
            return { list: tempdatarows, total: resultDetails['total'], pages: resultDetails['pages'], limit: resultDetails['limit'], page: resultDetails['page'] }
        }
        if (requestfor === 2) {
            if (Object.keys(resultDetails).length > 0) {
                for (const [index, quizData] of resultDetails.entries()) {
                    let tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(
                        quizData?.User || {},
                        clmNameArr,
                    );
                    tempdatainfo['SCORE'] = (quizData?.score && quizData?.score !== undefined && quizData?.score !== null && quizData?.score !== '') ? quizData?.score : 0;
                    if (quizData?.id && quizData?.id !== '') {
                        const createdTimeUTC = quizData?.created_date || '';
                        const userTimezone = quizData?.User?.timezone || 'UTC';
                        const convertedTime = moment.utc(createdTimeUTC).tz(userTimezone);
                        tempdatainfo['DATE'] = (convertedTime.isValid() ? convertedTime.format('MM-DD-YYYY') : '') || '01-01-1970';
                        if (quizData?.score && quizData?.QzAssignQuiz?.passing_score) {
                            if (quizData?.score >= quizData?.QzAssignQuiz?.passing_score) {
                                tempdatainfo['MET REQUIREMENTS'] = 'Yes';
                            } else {
                                tempdatainfo['MET REQUIREMENTS'] = 'No';
                            }
                        }
                        else {
                            tempdatainfo['MET REQUIREMENTS'] = 'No';
                        }
                    } else {
                        tempdatainfo['DATE'] = '';
                        tempdatainfo['MET REQUIREMENTS'] = 'NO';
                    }
                    tempdatarows.push(tempdatainfo)
                }
            }
        }
        return tempdatarows;
    }
    async quizReportXLSX(resultDetails: any, org_id: number, clmNameArr: any): Promise<{ file_data: string, file_name: string, extension: string }> {
        try {
            let directory = path.join(appConstant.COMPANY_QUIZ_REPORT, this.commonFileService.sanitizeFileName(org_id));
            let fileName = `${org_id}_Quiz_Report_${moment().format("MMDDYYYY_HHmmss")}.json`
            let filePath = path.join(directory, fileName);
            let filePathh = path.join(`${directory}`);
            const finalData = resultDetails.map((item) =>
                clmNameArr.reduce((acc, key) => {
                    if (item.hasOwnProperty(key)) {
                        acc[key] = item[key];
                    } else {
                        acc[key] = "";
                    }
                    return acc;
                }, {})
            );
            const jsonString = JSON.stringify(finalData, null, 2);
            let data: string;
            let writeFile = await this.commonFileService.writeFile(filePathh, jsonString, fileName);
            if (writeFile?.status == 'success') {
                let excelData: any = await this.commonFileService.createJsonToFile(1, `${filePath}`, 'pythonjsontoxlsx.py');
                if (excelData?.status == 'success') {
                    filePath = `${filePath}`.replace(".json", ".xlsx");
                    if (await this.commonFileService.fileExist(filePath)) {
                        data = await this.commonFileService.FileToBase64(filePath);
                    } else {
                        throw new Error(`File does not exist`);
                    }
                }
            } else {
                throw new Error(`File does not exist`);
            }
            fileName = fileName.replace(".json", "");
            await this.commonFileService.removeFileFromLocal(`${filePath}`);
            filePath = `${filePath}`.replace(".xlsx", ".json");
            await this.commonFileService.removeFileFromLocal(`${filePath}`);
            return { file_data: data, file_name: fileName, extension: 'xlsx' };
        } catch (err) {
            throw new Error(`File Not Created`);
        }
    }
    async quizReportZip(resultDetails: any, org_id: number, clmNameArr: any, reportId: number, zipPassword: string): Promise<string> {
        try {
            let directory = path.join(appConstant.COMPANY_QUIZ_REPORT, this.commonFileService.sanitizeFileName(org_id));
            let fileName = `${org_id}_${reportId}_Quiz_Report_${moment().format("MMDDYYYY_HHmmss")}.json`
            let filePath = path.join(directory, fileName);
            let filePathh = path.join(`${directory}`);
            const finalData = resultDetails.map((item) =>
                clmNameArr.reduce((acc, key) => {
                    if (item.hasOwnProperty(key)) {
                        acc[key] = item[key];
                    } else {
                        acc[key] = "";
                    }
                    return acc;
                }, {})
            );
            const jsonString = JSON.stringify(finalData, null, 2);
            let writeFile = await this.commonFileService.writeFile(
                filePathh,
                jsonString,
                fileName,
            );
            if (writeFile?.status == 'success') {
                let excelData: any =
                    await this.commonFileService.createJsonToFile(1, `${filePath}`, 'pythonjsontoxlsx.py');
                if (excelData?.status == 'success') {
                    filePath = `${filePath}`.replace('.json', '.xlsx');
                    if (await this.commonFileService.fileExist(filePath)) {
                        let result: any =
                            await this.commonFileService.createPasswordProtectedZip(filePath, zipPassword.toString(), 'create_zip.py');
                        if (result?.status == 'success') {
                            fileName = fileName.replace('.json', '.zip');
                            let zipPath = `automatic_report/quiz_reports/${reportId}/Quiz_report.zip`;
                            let zipPathDir = path.join(directory, fileName);
                            try {
                                await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' },
                                    {
                                        path: path.resolve(`${zipPathDir}`),
                                        filename: `${zipPath}`,
                                        userBucket: 'private',
                                    },
                                ),
                                );
                            } catch (err) {
                                throw new Error(`Report Not Uploaded to Bucket`);
                            }
                            let resultData = Object.create(null);
                            resultData['id'] = reportId;
                            resultData['file_name'] = zipPath;
                            resultData['auto_report_zip_password'] = Buffer.from(await argon2.hash(zipPassword)).toString('base64');
                            resultData['error_message'] = '';
                            resultData['status'] = 1;
                            resultData['updated_date'] = moment().format('YYYY-MM-DD HH:mm:ss');
                            await this.quizReportService.update(resultData);
                        } else {
                            throw new Error(`Report Not created`);
                        }
                    } else {
                        throw new Error(`File does not exist`);
                    }
                }
            } else {
                throw new Error(`File does not exist`);
            }
            fileName = fileName.replace('.json', '');
            await this.commonFileService.removeFileFromLocal(`${filePath}`);
            filePath = `${filePath}`.replace('.xlsx', '.json');
            await this.commonFileService.removeFileFromLocal(`${filePath}`);
            filePath = `${filePath}`.replace('.json', '.zip');
            await this.commonFileService.removeFileFromLocal(`${filePath}`);
            return 'Report Successfully created.';
        } catch (err) {
            throw new Error(`File Not Created`);
        }
    }
    async mapQuizDetailsReportData(resultDetails: any, requestfor: number, clmNameArr: string[], usersData: Record<number, any>, QzQuizDetail) {
        let tempdatarows = [];
        let QzQuizDetailcount = 1;
        for (const QzQuizDetailtmp of QzQuizDetail) {
            const questionText = this.commonHealthService.clearHTMLTags(QzQuizDetailtmp.quiz_question || '');
            clmNameArr.push(`${QzQuizDetailcount}) ${questionText.trim()}`);
            clmNameArr.push(`${QzQuizDetailcount}) correct answer`);
            QzQuizDetailcount++;
        }
        if (requestfor === 2) {
            if (Object.keys(resultDetails).length > 0) {
                for (const [index, quizData] of resultDetails.entries()) {
                    let tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(
                        quizData?.User || {},
                        clmNameArr,
                    );
                    tempdatainfo['SCORE'] = (quizData?.score && quizData?.score !== undefined && quizData?.score !== null && quizData?.score !== '') ? quizData?.score : 0;
                    if (quizData?.id && quizData?.id !== '') {
                        const createdTimeUTC = quizData?.created_date || '';
                        const userTimezone = quizData?.User?.timezone || 'UTC';
                        const convertedTime = moment.utc(createdTimeUTC).tz(userTimezone);
                        tempdatainfo['DATE'] = (convertedTime.isValid() ? convertedTime.format('MM-DD-YYYY') : '') || '01-01-1970';
                        if (quizData?.score && quizData?.QzAssignQuiz?.passing_score) {
                            if (quizData?.score >= quizData?.QzAssignQuiz?.passing_score) {
                                tempdatainfo['MET REQUIREMENTS'] = 'Yes';
                            } else {
                                tempdatainfo['MET REQUIREMENTS'] = 'No';
                            }
                        }
                        else {
                            tempdatainfo['MET REQUIREMENTS'] = 'No';
                        }
                    } else {
                        tempdatainfo['DATE'] = '';
                        tempdatainfo['MET REQUIREMENTS'] = 'NO';
                    }
                    const qzUserId = quizData?.id;
                    let QzQuizDetailcount = 1;
                    for (const QzQuizDetailItem of QzQuizDetail) {
                        const questionText = this.commonHealthService.clearHTMLTags(
                            QzQuizDetailItem.quiz_question || ''
                        ).trim();
                        const questionKey = `${QzQuizDetailcount}) ${questionText.trim()}`;
                        const correctKey = `${QzQuizDetailcount}) correct answer`;
                        if (usersData?.[qzUserId]?.UserDetail[QzQuizDetailItem.id]) {
                            if (quizData?.QzQuizUserDetail && quizData?.QzQuizUserDetail.length > 0) {
                                const attemptedQuestionIds = quizData?.QzQuizUserDetail.map((item) => item.question_id);
                                if (attemptedQuestionIds.includes(QzQuizDetailItem.id)) {
                                    const userDetail = usersData?.[qzUserId]?.UserDetail?.[QzQuizDetailItem?.id];
                                    tempdatainfo[questionKey] = userDetail?.user;
                                    tempdatainfo[correctKey] = userDetail?.system;
                                } else {
                                    tempdatainfo[questionKey] = ' - ';
                                    tempdatainfo[correctKey] = ' - ';
                                }
                            }
                            else{
                                tempdatainfo[questionKey] = ' - ';
                                tempdatainfo[correctKey] = ' - ';
                            }
                        } else {
                            tempdatainfo[questionKey] = ' - ';
                            tempdatainfo[correctKey] = ' - ';
                        }
                        QzQuizDetailcount++;
                    }
                    tempdatarows.push(tempdatainfo)
                }
            }
        }
        return { data: tempdatarows || [], clmNameArr: clmNameArr };
    }
    async quizListRecord(
        fields: any,
        condition: any,
        orderBy: any = null,
    ) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        return await this.readReplicaQuizQuizzesRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
}
