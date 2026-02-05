import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    SurveyQuestionsEntity,
    tableConstant,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { lastValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { CompanyService } from '../company/company.service';
import { UserService } from '../user/user.service';
import { SurveyReportService } from './surveyreport.service';
import { SurveyReportInput } from './input/surevyreport.input';
import { SurveyUserAnswersService } from './surveyuseranswers.service';
import { CronCommonService } from 'src/common';
const moment = require('moment-timezone');
const path = require('path');
const argon2 = require('argon2');
@Injectable()
export class SurveyQuestionsService {
    constructor(
        @InjectRepository(
            SurveyQuestionsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaSurveyRepository: Repository<SurveyQuestionsEntity>,
        @InjectRepository(SurveyQuestionsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaSurveyRepository: Repository<SurveyQuestionsEntity>,
        private readonly commonService: CommonService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly companyService: CompanyService,
        private readonly surveyReportService: SurveyReportService,
        private readonly userService: UserService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonHealthService: CommonHealthService,
        private readonly SurveyUserAnswersService: SurveyUserAnswersService,
        private readonly cronCommonService: CronCommonService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
    ) { }
    async save(data: any) {
        const savedResult = this.writeReplicaSurveyRepository.create(data);
        return await this.writeReplicaSurveyRepository.save(savedResult);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSurveyRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSurveyRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
    async delete(condition) {
        await this.writeReplicaSurveyRepository.delete(condition);
    }
    async questionData(condition, feild = [], orgId) {
        return await this.readReplicaSurveyRepository
            .createQueryBuilder('questions')
            .innerJoinAndMapOne(
                'questions.Surveypopup',
                tableConstant.REPORT.TBL_C_SURVEY_POPUP,
                'Surveypopup',
                `Surveypopup.id=questions.popup_id AND Surveypopup.status=1 AND Surveypopup.org_id = ${orgId}`,
            )
            .leftJoinAndMapMany(
                'questions.SurveyAnswer',
                tableConstant.REPORT.TBL_C_SURVEY_ANSWERS,
                'SurveyAnswer',
                `SurveyAnswer.q_id = questions.id AND SurveyAnswer.status != 2`,
            )
            .where(condition)
            .select(feild)
            .orderBy('questions.id', 'ASC')
            .getMany();
    }
    async surveyReport(postData: SurveyReportInput) {
        try {
            let autoRequestId: number = 0;
            let requestfor = (postData?.result_type && this.commonService.isValidNumber(postData?.result_type)) ? Number(postData?.result_type) : 0;
            let autoRequest = (postData?.auto_request && this.commonService.isValidNumber(postData?.auto_request)) ? Number(postData?.auto_request) : 0;
            let user = Object.create(postData?.userDetails || {}) || {};
            if (autoRequest == 1) {
                autoRequestId = postData?.auto_request_id;
                requestfor = 2;
            }
            let clmNameArr = ['USER CODE', 'DEPARTMENT', 'RELATIONSHIP ID', 'FIRST NAME', 'MIDDLE NAME', 'LAST NAME', 'JOB TITLE', 'GENDER', 'BIRTH DATE', 'DATE OF HIRE', 'ON HEALTH PLAN', 'HEALTH PLAN NAME', 'EMAIL', 'LOCATION', 'USER TYPE'];
            let role_id: number;
            let membershipcode: string;
            let org_id: number, report_id: number;
            let reportRequest;
            let companyid: number;
            let report_setting_id: number, report_fields: string, user_id: number, zipPassword: string;
            if (autoRequest === 1) {
                await this.surveyReportService.updateReport();
                reportRequest = await this.surveyReportService.findOne(
                    `surveyReport.status = 0 AND company.status = 1 AND company.deleted  = 0 ${(autoRequestId && autoRequestId !== 0 && autoRequestId !== undefined) ? ' AND surveyReport.id = ' + autoRequestId : ''}`,
                );
                if (reportRequest) {
                    report_setting_id = reportRequest?.report_setting_id;
                    report_id = reportRequest?.id;
                    report_fields = reportRequest?.report_fields;
                    role_id = reportRequest?.user_role;
                    org_id = reportRequest?.org_id;
                    user_id = reportRequest?.user_id;
                    membershipcode = reportRequest?.membership_code;
                    companyid = reportRequest?.['org_id'];
                    zipPassword = await this.companyService.getCompanyZipPassword(companyid);
                    if (report_setting_id && report_setting_id !== null && report_setting_id !== 0) {
                        if (report_fields !== '' && report_fields !== null) {
                            clmNameArr = Object.values(JSON.parse(report_fields));
                        }
                    }
                } else {
                    throw new Error('Not found');
                }
            }
            if (autoRequest == 0) {
                org_id = user?.org_id;
                membershipcode = user?.membership_code;
                companyid = user?.org_id;
                if ([appConstant.ROLE.COACH, appConstant.ROLE.GLOBALCOACH, appConstant.ROLE.WCH, appConstant.ROLE.BROKER, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(user?.role_id)) {
                    org_id = postData?.org_id;
                    companyid = postData?.org_id;
                    membershipcode = postData?.membership_code;
                }
            }
            if (postData?.type == 'superadmin') {
                user.org_id = postData?.org_id;
                org_id = postData?.org_id;
                user.membership_code = postData?.membership_code;
                companyid = postData?.org_id;
                membershipcode = postData?.membership_code;
            }
            let filterCondition = 'User.username IS NOT null';
            let filterConditionInner = '';
            if (autoRequest === 1) {
                filterConditionInner += `Surveyuseranswers.user_id = User.id and Surveyuseranswers.org_id =  ${companyid}`;
                const startDate = reportRequest['start_date_range'];
                const endDate = reportRequest['end_date_range'];
                if (startDate && endDate && startDate !== '' && endDate !== '') {
                    const formattedStartDate = this.commonDateService.DateTimeFormat(startDate, "YYYY-MM-DD", "YYYY-MM-DD HH:mm:ss");
                    const formattedEndDate = this.commonDateService.DateTimeFormat(endDate, "YYYY-MM-DD", "YYYY-MM-DD HH:mm:ss");
                    filterConditionInner += ` AND (DATE_FORMAT(Surveyuseranswers.created, '%Y-%m-%d') BETWEEN '${formattedStartDate}' AND '${formattedEndDate}')`;
                } else if (startDate && startDate !== '') {
                    const formattedStartDate = this.commonDateService.DateTimeFormat(startDate, "YYYY-MM-DD", "YYYY-MM-DD HH:mm:ss");
                    filterConditionInner += ` AND DATE_FORMAT(Surveyuseranswers.created, '%Y-%m-%d') >= '${formattedStartDate}'`;
                } else if (endDate && endDate !== '') {
                    const formattedEndDate = this.commonDateService.DateTimeFormat(endDate, "YYYY-MM-DD", "YYYY-MM-DD HH:mm:ss");
                    filterConditionInner += ` AND DATE_FORMAT(Surveyuseranswers.created, '%Y-%m-%d') <= '${formattedEndDate}'`;
                }
                if (reportRequest['condition']) {
                    filterCondition += ` AND ${reportRequest['condition']}`;
                }
            }
            if (autoRequest == 0) {
                filterConditionInner += `Surveyuseranswers.user_id = User.id AND Surveyuseranswers.org_id = ${org_id}`;
                filterCondition += ` AND User.role_id IN (2, 16) AND User.membership_code = '${membershipcode}'`;
                if (postData?.show_terminated_users == 2) {
                    filterCondition += ' AND User.status = 1';
                }
                if (postData?.rtype == 1) {
                    filterCondition += ' AND ((Surveyuseranswers.id is null AND Surveypopup.id is null) OR (Surveypopup.id = Surveyuseranswers.popup_id))';
                } else if (postData?.rtype == 2) {
                    filterCondition += ' AND Surveyuseranswers.id is not null AND Surveypopup.id = Surveyuseranswers.popup_id';
                } else if (postData?.rtype == 3) {
                    filterCondition += ' AND Surveyuseranswers.id is null';
                }
                if (postData?.start_date && postData?.end_date) {
                    filterConditionInner += ` AND DATE_FORMAT(CONVERT_TZ(Surveyuseranswers.Created, "UTC", CASE WHEN User.timezone != "" THEN User.timezone ELSE "UTC" END), "%Y-%m-%d") >= '${this.commonDateService.DateTimeFormat(postData?.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                    filterConditionInner += ` AND DATE_FORMAT(CONVERT_TZ(Surveyuseranswers.Created, "UTC", CASE WHEN User.timezone != "" THEN User.timezone ELSE "UTC" END), "%Y-%m-%d") <= '${this.commonDateService.DateTimeFormat(postData?.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                } else if (postData?.start_date) {
                    filterConditionInner += ` AND DATE_FORMAT(CONVERT_TZ(Surveyuseranswers.Created, "UTC", CASE WHEN User.timezone != "" THEN User.timezone ELSE "UTC" END), "%Y-%m-%d") >= '${this.commonDateService.DateTimeFormat(postData?.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                } else if (postData?.end_date) {
                    filterConditionInner += ` AND DATE_FORMAT(CONVERT_TZ(Surveyuseranswers.Created, "UTC", CASE WHEN User.timezone != "" THEN User.timezone ELSE "UTC" END), "%Y-%m-%d") <= '${this.commonDateService.DateTimeFormat(postData?.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                }
                if (role_id !== 12) {
                    if (postData?.department_id?.length) {
                        let deptCondition = this.commonArrayService.formatInClauseCondition(postData?.department_id, 'User.department_id');
                        if (deptCondition) {
                            filterCondition += ` AND ${deptCondition}`;
                        }
                    }
                    if (postData?.location_id?.length) {
                        let locCondition = this.commonArrayService.formatInClauseCondition(postData?.location_id, 'User.location');
                        if (locCondition) {
                            filterCondition += ` AND ${locCondition}`;
                        }
                    }
                    if (postData?.country?.length) {
                        let countryCondition = this.commonArrayService.formatInClauseCondition(postData?.country, 'Location.country');
                        if (countryCondition) {
                            filterCondition += ` AND ${countryCondition}`;
                        }
                    }
                    if (postData?.state?.length) {
                        let stateArray = this.commonArrayService.transformToArray(postData?.state, ',', 'string') as string[] || [];
                        let stateData = await this.cronCommonService.stateList(
                            '',
                            '',
                            stateArray
                        );
                        if (stateData) {
                            let stateCodes = stateData.map(item => item.statecode);
                            let stateValues = stateData.map(item => item.state);
                            let stateCondition = this.commonArrayService.formatInClauseCondition([...stateCodes, ...stateValues], 'Location.state');
                            if (stateCondition) {
                                filterCondition += ` AND ${stateCondition}`;
                            }
                        } else {
                            let stateCondition = this.commonArrayService.formatInClauseCondition(postData?.state, 'Location.state');
                            if (stateCondition) {
                                filterCondition += ` AND ${stateCondition}`;
                            }
                        }
                    }
                    if (postData?.city?.length) {
                        let cityCondition = this.commonArrayService.formatInClauseCondition(postData?.city, 'Location.city');
                        if (cityCondition) {
                            filterCondition += ` AND ${cityCondition}`;
                        }
                    }
                }
                if (user.role_id == 12) {
                    let userDetails = await this.userService.findOneWithTable(`User.id = ${user.id}`, ['User.id', 'User.role_id', 'User.email', 'User.org_id', 'User.membership_code', 'settings', 'User.department_id', 'User.location']);
                    const userList = await this.userService.usersDataWellness(userDetails, `User.role_id != 1 AND User.id != ${user.id} AND User.membership_code = '${user?.['membership_code']}' AND User.status =1`);
                    if (!userList || userList.length == 0) {
                        filterCondition += ` AND User.id IN (0)`;
                    } else {
                        filterCondition += ` AND User.id IN (${userList.map((ele) => ele.id).join(',')})`;
                    }
                }
                if (requestfor === 1) {
                    if (postData?.search_str) {
                        const search = postData?.search_str.toLowerCase();
                        if (moment(postData?.search_str, 'll', true).isValid()) {
                            filterCondition += ` AND Surveyuseranswers.created LIKE '%${moment(postData?.search_str, 'll', true).isValid() ? moment(postData?.search_str, 'll').format('YYYY-MM-DD') : ''}%'`
                        } else {
                            filterCondition += ` AND (LOWER(User.first_name) LIKE '%${search}%' OR LOWER(User.last_name) LIKE '%${search}%' OR LOWER(CONCAT(User.first_name, ' ', User.last_name)) LIKE '%${search}%' OR (User.code) LIKE '%${search}%')`;
                        }
                    }
                }
            }
            let paginate = {
                page: postData?.page || 1,
                limit: postData?.limit || appConstant.RECORD_PER_PAGE
            };
            let surveyPopupCondition = `Surveypopup.id = Surveyuseranswers.popup_id AND Surveypopup.org_id = ${org_id} AND Surveypopup.status = 1`
            let resultDetails: any = await this.userService.surveyReport(filterCondition, filterConditionInner, surveyPopupCondition, requestfor === 1 ? paginate : null);
            // let resultDetails: any = await this.SurveyUserAnswersService.surveyReport(filterCondition, filterConditionInner, requestfor === 1 ? paginate : null);
            if (resultDetails) {
                let Surveyquestions = await this.questionData(
                    `questions.status != 2 ANd questions.org_id = ${org_id}`,
                    ['questions.id', 'questions.title', 'SurveyAnswer.id', 'SurveyAnswer.title'],
                    org_id,
                );
                const Surveyanswer = Surveyquestions.reduce((acc, item) => {
                    item?.['SurveyAnswer'].forEach((answer) => {
                        acc[answer.id] = answer.title;
                    });
                    return acc;
                }, {});
                const clmNameArr1 = ['Date', 'Time'];
                clmNameArr = [...clmNameArr, ...clmNameArr1];
                if (Surveyquestions && Surveyquestions.length > 0) {
                    Surveyquestions.forEach((Surveyquestionsdata) => {
                        const que_show = Surveyquestionsdata?.['SurveyAnswer'].reduce((acc, answer) => {
                            acc[answer.id] = answer.title;
                            return acc;
                        }, {});
                        if (Object.keys(que_show).length > 0) {
                            clmNameArr.push(Surveyquestionsdata?.title);
                        }
                    });
                }
                resultDetails = await this.mapSurveyData(resultDetails, requestfor, clmNameArr, Surveyquestions);
                if (requestfor === 2 && autoRequest == 0) {
                    resultDetails = await this.surveyReportXLSX(resultDetails.data, resultDetails.clmNameArr, org_id);
                }
                if (autoRequest == 1) {
                    resultDetails = await this.surveyReportZip(resultDetails.data, resultDetails.clmNameArr, org_id, zipPassword, report_id);
                }
            } else {
                if (autoRequest == 1) {
                    let r_dataForUpdate = Object.create(null);
                    r_dataForUpdate['id'] = report_id;
                    r_dataForUpdate['error_message'] = 'No records found.';
                    r_dataForUpdate['status'] = '1';
                    r_dataForUpdate['updated_date'] = moment().format('YYYY-MM-DD HH:mm:ss');
                    await this.surveyReportService.update(r_dataForUpdate);
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
    async mapSurveyData(resultDetails, requestfor: number, clmNameArr: string[] = [], Surveyquestions: any[] = []) {
        let tempdatarows = [];
        if (requestfor === 1) {
            let surveyDataList = resultDetails?.['list'] || [];
            if (Object.keys(surveyDataList).length === 0) {
                return { list: [], total: resultDetails['total'], pages: resultDetails['pages'], limit: resultDetails['limit'], page: resultDetails['page'] }
            }
            for (const [index, surveyData] of surveyDataList.entries()) {
                let tempdatarow = Object.create(null);
                const fullName = `${surveyData?.first_name} ${surveyData?.last_name}`;
                tempdatarow['fullName'] = fullName;
                tempdatarow['code'] = surveyData?.code;
                if (surveyData?.['Surveyuseranswers']?.id) {
                    const createdTimeUTC = surveyData?.['Surveyuseranswers']?.created;
                    const userTimezone = surveyData?.timezone || 'UTC';
                    const convertedTime = moment.utc(createdTimeUTC).tz(userTimezone);
                    tempdatarow['date'] = (convertedTime.format('ll'));
                    tempdatarow['time'] = (convertedTime.format('hh:mm:ss A'));
                } else {
                    tempdatarow['date'] = ('-');
                    tempdatarow['time'] = ('-');
                }
                tempdatarows.push(tempdatarow);
            }
            return { list: tempdatarows, total: resultDetails['total'], pages: resultDetails['pages'], limit: resultDetails['limit'], page: resultDetails['page'] }
        }
        if (requestfor === 2) {
            if (Object.keys(resultDetails).length > 0) {
                for (const [index, surveyData] of resultDetails.entries()) {
                    let tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(surveyData, clmNameArr);
                    if (surveyData?.['Surveyuseranswers']?.id && surveyData?.['Surveyuseranswers']?.id !== '') {
                        const createdTimeUTC = surveyData?.['Surveyuseranswers']?.created;
                        const userTimezone = surveyData?.timezone || 'UTC';
                        const convertedTime = moment.utc(createdTimeUTC).tz(userTimezone);
                        tempdatainfo['Date'] = (convertedTime.format('MM-DD-YYYY'));
                        tempdatainfo['Time'] = (convertedTime.format('hh:mm:ss A'));
                    }
                    else {
                        tempdatainfo['Date'] = '';
                        tempdatainfo['Time'] = '';
                    }
                    let userAnswers = JSON.parse(surveyData?.['Surveyuseranswers']?.question_answers || '{}');
                    if (!userAnswers || typeof userAnswers !== 'object' || Array.isArray(userAnswers)) {
                        userAnswers = [];
                    } else {
                        userAnswers = Object.values(userAnswers).map((key) => String(key));
                    }
                    if (Surveyquestions && Surveyquestions.length > 0) {
                        Surveyquestions.forEach((SurveyQuestion) => {
                            const options = SurveyQuestion?.['SurveyAnswer'].reduce((acc, answer) => {
                                acc[answer.id] = answer.title;
                                return acc;
                            }, {});
                            if (Object.keys(options).length > 0) {
                                const matchedValues = Object.entries(options)
                                    .filter(([key]) => userAnswers.includes(String(key)))
                                    .map(([, value]) => value);
                                tempdatainfo[`${SurveyQuestion?.title}`] = matchedValues.length > 0 ? matchedValues.join(' ') : '';
                            }
                        });
                    }
                    tempdatarows.push(tempdatainfo);
                }
                return { data: tempdatarows, clmNameArr }
            }
            return { data: [], clmNameArr }
        }
        return tempdatarows;
    }
    async surveyReportXLSX(resultDetails, clmNameArr: string[], org_id: number): Promise<{ file_data: string, file_name: string, extension: string }> {
        let directory = path.join(appConstant.COMPANY_SURVEY_REPORT, this.commonFileService.sanitizeFileName(org_id));
        let companyData = await this.companyService.findOne(`company.id = ${org_id}`, ['c_company_settings'], ['company.company_name', 'companySetting.census_status']);
        let fileName = `${companyData?.company_name?.replace(/[^A-Za-z0-9\-]/g, '_')}_Survey_Users_Report_${moment().format('MMDDYYYY_HHmmss')}.json`;
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
        let data;
        try {
            let writeFile = await this.commonFileService.writeFile(
                filePathh,
                jsonString,
                fileName,
            );
            if (writeFile?.status == 'success') {
                let excelData: any =
                    await this.commonFileService.createJsonToFile(
                        1,
                        `${filePath}`,
                        'pythonjsontoxlsx.py',
                    );
                if (excelData?.status == 'success') {
                    filePath = `${filePath}`.replace('.json', '.xlsx');
                    if (await this.commonFileService.fileExist(filePath)) {
                        data =
                            await this.commonFileService.FileToBase64(filePath);
                    } else {
                        throw new Error(`File does not exist`);
                    }
                }
            } else {
                throw new Error(`File does not exist`);
            }
        } catch (err) {
            throw new Error(`An error occurred: ${err.message}`);
        }
        fileName = fileName.replace('.json', '');
        await this.commonFileService.removeFileFromLocal(`${filePath}`);
        filePath = `${filePath}`.replace('.xlsx', '.json');
        await this.commonFileService.removeFileFromLocal(`${filePath}`);
        return { file_data: data, file_name: fileName, extension: 'xlsx' };
    }
    async surveyReportZip(resultDetails, clmNameArr: string[], org_id: number, zipPassword: string, report_id: number): Promise<string> {
        try {
            let directory = path.join(
                appConstant.COMPANY_SURVEY_REPORT,
                this.commonFileService.sanitizeFileName(org_id),
            );
            let companyData = await this.companyService.findOne(
                `company.id = ${org_id}`,
                ['c_company_settings'],
                ['company.company_name', 'companySetting.census_status'],
            );
            let fileName = `${companyData?.company_name?.replace(/[^A-Za-z0-9\-]/g, '_')}_${report_id}_Survey_Users_Report_${moment().format('MMDDYYYY_HHmmss')}.json`;
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
                    await this.commonFileService.createJsonToFile(
                        1,
                        `${filePath}`,
                        'pythonjsontoxlsx.py',
                    );
                if (excelData?.status == 'success') {
                    filePath = `${filePath}`.replace('.json', '.xlsx');
                    if (await this.commonFileService.fileExist(filePath)) {
                        let result: any =
                            await this.commonFileService.createPasswordProtectedZip(
                                filePath,
                                zipPassword.toString(),
                                'create_zip.py',
                            );
                        if (result?.status == 'success') {
                            fileName = fileName.replace('.json', '.zip');
                            let zipPath = `automatic_report/survey_users_reports/${report_id}/Survey_report.zip`;
                            let zipPathDir = path.join(directory, fileName);
                            try {
                                await lastValueFrom(
                                    this.commonMicroservice.send(
                                        { cmd: 'upload_file' },
                                        {
                                            path: path.resolve(`${zipPathDir}`),
                                            filename: `${zipPath}`,
                                            userBucket: 'private',
                                        },
                                    ),
                                );
                            } catch (err) {
                                throw new Error(
                                    'Report Not Uploaded to Bucket',
                                );
                            }
                            let resultData = Object.create(null);
                            resultData['id'] = report_id;
                            resultData['file_name'] = zipPath;
                            resultData['auto_report_zip_password'] =
                                Buffer.from(
                                    await argon2.hash(zipPassword),
                                ).toString('base64');
                            resultData['error_message'] = '';
                            resultData['status'] = 1;
                            resultData['updated_date'] = moment().format(
                                'YYYY-MM-DD HH:mm:ss',
                            );
                            await this.surveyReportService.update(resultData);
                        } else {
                            throw new Error('Report Not created');
                        }
                    } else {
                        throw new Error('File does not exist');
                    }
                }
            } else {
                throw new Error('File does not exist');
            }
            fileName = fileName.replace('.json', '');
            await this.commonFileService.removeFileFromLocal(`${filePath}`);
            filePath = `${filePath}`.replace('.xlsx', '.json');
            await this.commonFileService.removeFileFromLocal(`${filePath}`);
            filePath = `${filePath}`.replace('.json', '.zip');
            await this.commonFileService.removeFileFromLocal(`${filePath}`);
            return 'Report Successfully created.';
        } catch (err) {
            throw new Error('File Not Created');
        }
    }
}
