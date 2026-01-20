import { appConstant, CommonArrayService, CommonDateService, CommonFileService, CommonHealthService, CommonService } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Request, Response } from "express";
import { BrokerService } from 'src/modules/broker/broker.service';
import { ClientManagerAssignService } from 'src/modules/company/clientmanagerassign/clientmanagerassign.service';
import { CompanyService } from 'src/modules/company/companies/company.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { EmployeeExportInput } from '../../../input';
import { RateLimiterMiddleware } from '../../../middleware/rate-limiter.middleware';
import { TranslationService } from '../../translation/translation.service';
import { UserService } from '../user/user.service';
import { UserDownloadLogService } from '../userdownloadlog/userdownloadlog.service';
import { UserLoginService } from '../userlogin/userlogin.service';
import { ReportInput } from './input';
import { UserReportService } from './userreport.service';
import { ParticipationReportViewInput } from './input/participationreportview.input';
import { FormService } from '@/modules/form/form.service';
import { DepartmentService } from '@/modules/company/departments/department.service';
import { UserSettingsService } from '../usersettings/usersettings.service';
import { LocationService } from '@/modules/company/locations/location.service';
const moment = require('moment-timezone');
const path = require('path');
@Controller('user')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class UserReportController {
    constructor(
        private readonly userService: UserService,
        private readonly commonService: CommonService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
        private readonly translatorService: TranslationService,
        private readonly companyService: CompanyService,
        private readonly activityLogService: ActivityLogService,
        private readonly brokerService: BrokerService,
        private readonly commonArrayService: CommonArrayService,
        private readonly clientManagerAssignService: ClientManagerAssignService,
        private readonly userreportservice: UserReportService,
        private readonly userDownloadLogService: UserDownloadLogService,
        private readonly formService: FormService,
    ) { }
    @Post('admin-login-report')
    async adminLoginReport(@Req() req: Request, @Res() res: Response, @Body() postData: ReportInput) {
        try {
            if (!postData?.membership_code) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if (!this.commonService.isValidNumber(postData?.access) || !this.commonService.isValidNumber(postData?.terminated_users) ||
                !this.commonService.isValidNumber(postData?.is_detail) || !this.commonService.isValidNumber(postData?.access_type) || !this.commonService.isValidNumber(postData?.logintype)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if (postData?.access_type?.toString() === '2') {
                if (!postData?.start_date) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            if (postData?.access_type?.toString() === '3') {
                if (!postData?.start_date && !postData?.end_date) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let condition = postData?.membership_code;
            this.orgLoginReport(req, res, postData, condition)
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                statusCode: 500,
                success: 0,
                error: 1,
                message: error?.message,
                data: null,
            });
        }
    }
    @Post('org-app-login-report')
    async orgAppLoginReport(@Req() req: Request, @Res() res: Response, @Body() postData: ReportInput) {
        try {
            if (postData?.type == 'superadmin') {
                if (!postData?.membership_code) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                let condition = postData?.membership_code;
                let appCall = 'app_login'
                this.orgLoginReport(req, res, postData, condition, appCall)
            } else {
                if (!this.commonService.isValidNumber(postData?.access) || !this.commonService.isValidNumber(postData?.terminated_users) ||
                    !this.commonService.isValidNumber(postData?.platform) || !this.commonService.isValidNumber(postData?.access_type)) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                if (postData?.access_type?.toString() === '2') {
                    if (!postData?.start_date) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                    }
                }
                if (postData?.access_type?.toString() === '3') {
                    if (!postData?.start_date && !postData?.end_date) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                    }
                }
                let appCall = 'app_login'
                this.orgLoginReport(req, res, postData, null, appCall)
            }
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                statusCode: 500,
                success: 0,
                error: 1,
                message: error?.message,
                data: null,
            });
        }
    }
    //csv logic
    @Post('org-login-report')
    async orgLoginReport(@Req() req: Request, @Res() res: Response, @Body() postData: ReportInput, conditionn = null, appCall = null) {
        try {
            let user = Object.create(req.tokenUser);
            let condition = '';
            if (user.role_id == appConstant.ROLE.ADMIN) {
                user.org_id = await this.companyService.getCompnayIdFromCode(postData?.membership_code);
            }
            if (appConstant.ROLE.WCH == req.tokenUser?.role_id) {
                const userList = await this.userService.usersDataWellness(user, `user.role_id != 1 AND user.id != ${user.id} AND user.membership_code = '${user['membership_code']}' AND user.status =1`);
                if (!userList || userList.length == 0) {
                    condition = `user.role_id IN (2,16) AND user.membership_code = '${user.membership_code}' AND user.id IN (1)`;
                } else {
                    condition = `user.role_id IN (2,16) AND user.membership_code = '${user.membership_code}' AND user.id IN (${userList.map(ele => ele.id).join(',')})`;
                }
            } else {
                condition = `user.role_id IN (2,16) AND user.membership_code = '${user.membership_code}'`;
            }
            if (conditionn !== null) {
                condition = `user.role_id IN (2,16) AND user.membership_code = '${conditionn}'`;
            }
            if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) {
                let resultedData = await this.clientManagerAssignService.listRecord({ user_id: req.tokenUser?.id, status: 1 }, null);
                if (resultedData.length > 0) {
                    condition += ` AND user.org_id IN (${resultedData.map(ele => ele.org_id).join(',')})`;
                } else {
                    throw Error(this.translatorService.translate(req.lang, 'ERR_FORBIDDEN_ACCESS'));
                }
            }
            if (postData?.department_id && postData?.department_id !== '') {
                let deptCondition = this.commonArrayService.formatInClauseCondition(postData?.department_id, 'user.department_id');
                if (deptCondition) condition += ` AND ${deptCondition}`;
            }
            if (postData?.location_id && postData?.location_id !== '') {
                let locCondition = this.commonArrayService.formatInClauseCondition(postData?.location_id, 'user.location');
                if (locCondition) condition += ` AND ${locCondition}`;
            }
            if (appCall !== null && appCall === 'app_login' && (postData?.['platform'] || postData?.['platform'] == 0) && postData['access'] !== 2) {
                condition += " AND userLogin.source NOT IN (0,3)";
                if (postData['platform'] == 1) {
                    condition += " AND userLogin.source = 1";
                } else if (postData['platform'] == 2) {
                    condition += " AND userLogin.source = 2";
                }
            }
            if (postData['terminated_users'] && postData['terminated_users'] == 2) {
                condition += " AND user.status = 1";
            }
            let from = postData?.start_date || "";
            let to = postData?.end_date || "";
            if (postData?.access_type?.toString() == '1') {
                condition += postData?.access?.toString() === '1'
                    ? " AND ((userLogin.id IS NOT NULL) OR (user.num_login != ''))"
                    : " AND ((userLogin.id IS NULL) AND (user.num_login = ''))";
            }
            if (postData?.access_type?.toString() === '2') {
                if (postData?.access?.toString() === '1') {
                    condition += ` AND (DATE_FORMAT(userLogin.login_time, '%Y-%m-%d') >= '${this.commonDateService.DateTimeFormat(postData.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}')`;
                } else {
                    condition += ` AND (((userLogin.id IS NULL) OR (DATE_FORMAT(userLogin.login_time, '%Y-%m-%d') >= '${this.commonDateService.DateTimeFormat(from, "YYYY-MM-DD", "DD-MM-YYYY")}')) AND ((user.last_login = '0000-00-00 00:00:00') OR (user.last_login IS NULL) OR (DATE_FORMAT(user.last_login, '%Y-%m-%d') < '${this.commonDateService.DateTimeFormat(from, "YYYY-MM-DD", "DD-MM-YYYY")}')))`;
                    // condition += ` AND ((DATE_FORMAT(userLogin.login_time, '%Y-%m-%d') >= '${this.commonDateService.DateTimeFormat(from, "YYYY-MM-DD", "DD-MM-YYYY")}') AND ((userLogin.id IS NULL) OR (user.last_login = '0000-00-00 00:00:00' OR user.last_login IS NULL OR (DATE_FORMAT(user.last_login, '%Y-%m-%d') < '${this.commonDateService.DateTimeFormat(from, "YYYY-MM-DD", "DD-MM-YYYY")}'))))`;
                }
            }
            if (postData?.access_type?.toString() === '3' && from && to) {
                if (postData?.access?.toString() === '1') {
                    condition += ` AND (DATE_FORMAT(userLogin.login_time, '%Y-%m-%d') BETWEEN '${this.commonDateService.DateTimeFormat(from, "YYYY-MM-DD", "DD-MM-YYYY")}' AND '${this.commonDateService.DateTimeFormat(to, "YYYY-MM-DD", "DD-MM-YYYY")}')`;
                } else {
                    // condition += ` AND ((userLogin.id IS NULL OR (DATE_FORMAT(userLogin.login_time, '%Y-%m-%d') NOT BETWEEN '${this.commonDateService.DateTimeFormat(from, "YYYY-MM-DD", "DD-MM-YYYY")}' AND '${this.commonDateService.DateTimeFormat(to, "YYYY-MM-DD", "DD-MM-YYYY")}')) AND (DATE_FORMAT(user.last_login, '%Y-%m-%d') NOT BETWEEN '${this.commonDateService.DateTimeFormat(from, "YYYY-MM-DD", "DD-MM-YYYY")}' AND '${this.commonDateService.DateTimeFormat(to, "YYYY-MM-DD", "DD-MM-YYYY")}'))`;
                    condition += ` AND ( userLogin.id IS NULL OR DATE_FORMAT(userLogin.login_time, '%Y-%m-%d') < '${this.commonDateService.DateTimeFormat(from, "YYYY-MM-DD", "DD-MM-YYYY")}' OR DATE_FORMAT(userLogin.login_time, '%Y-%m-%d') > '${this.commonDateService.DateTimeFormat(to, "YYYY-MM-DD", "DD-MM-YYYY")}' )`;
                    condition += ` AND ( user.last_login IS NULL OR user.last_login = '0000-00-00 00:00:00' OR DATE_FORMAT(user.last_login, '%Y-%m-%d') < '${this.commonDateService.DateTimeFormat(from, "YYYY-MM-DD", "DD-MM-YYYY")}' OR DATE_FORMAT(user.last_login, '%Y-%m-%d') > '${this.commonDateService.DateTimeFormat(to, "YYYY-MM-DD", "DD-MM-YYYY")}' )`;
                }
            }
            const companyData = await this.companyService.findOne(
                `company.id = ${user.org_id}`,
                ['c_company_settings'],
                ['company.company_name', 'company.id']
            );
            const companyName = (companyData?.company_name || 'Company').replace(/\s+/g, '_');
            const timestamp = moment().format('YYYYMMDD_HHmmss');
            const fileName = `${companyName}_Login_Report_${timestamp}.json`;
            const directory = path.join(appConstant.COMPANY_LOGIN_REPORT, this.commonFileService.sanitizeFileName(companyData.id));
            const commonFieldArray = [
                "USER CODE", "DEPARTMENT", "RELATIONSHIP ID", "FIRST NAME", "MIDDLE NAME",
                "LAST NAME", "JOB TITLE", "GENDER", "BIRTH DATE", "DATE OF HIRE",
                "ON HEALTH PLAN", "HEALTH PLAN NAME", "EMAIL", "LOCATION", "USER TYPE"
            ];

            if (postData?.is_detail === 1) {
                if (postData?.logintype === 2) commonFieldArray.push('First Time Logged In');
                commonFieldArray.push('Last Login', 'Timezone', 'IP', 'User Browser', 'Login Source');
            } else {
                if (postData?.logintype === 2) commonFieldArray.push('First Time Logged In');
                commonFieldArray.push('Last Login', 'Timezone', 'IP', 'User Browser', 'Total Logins');
                if (appCall === 'app_login' && postData?.access?.toString() !== '2') {
                    commonFieldArray.push('Platform');
                } else {
                    commonFieldArray.push('Android Login', 'IOS Login');
                }
            }
            const jsonFilePath = path.join(directory, fileName);
            const csvFilePath = jsonFilePath.replace('.json', '.csv');
            const dbStream = await this.userService.reportListRecordsStream(condition, { id: 'ASC' }, [
                'user.role_id', 'user.membership_code', 'user.department_id', 'user.location',
                'user.status', 'user.num_login', 'user.last_login', 'user.id', 'user.code',
                'user.on_insurance_plan', 'user.gender', 'user.username', 'user.first_name',
                'user.middle_name', 'user.last_name', 'user.relationship_id', 'user.dob',
                'user.date_of_hire', 'user.insurance_plan_name', 'user.email', 'user.timezone',
                'company.company_name', 'company.id', 'department.dept_name', 'department.id',
                'settings.jobtitle', 'settings.id', 'Location.lname', 'Location.id',
                'userLogin.id', 'userLogin.user_id', 'userLogin.ip', 'userLogin.source',
                'userLogin.timezone', 'userLogin.login_time', 'userLogin.useragent',
            ]);
            const userAgentCache = new Map<string, string>();
            const sourceMap = { "": "Web", "0": "Web", "1": "Android", "2": "IOS", "3": "Web + SSO" };
            const isDetail = postData?.is_detail === 1;
            const isAccessTwo = postData?.access?.toString() === '2';
            const isAppLogin = appCall === 'app_login';
            const formatDate = (date: any) => {
                if (!date || date === "0000-00-00 00:00:00") return "";
                const d = this.commonDateService.DateTimeFormat(date, 'MM-DD-YYYY');
                return d === 'Invalid date' ? '' : d;
            };
            const rows: any[] = [];
            const seenAgents = new Set<string>();
            let rowCount = 0;
            for await (const user of dbStream) {
                if (!isAccessTwo) {
                    for (const login of user.userLogin || []) {
                        if (login.useragent) seenAgents.add(login.useragent);
                    }
                }
                const processedRows = await this.processUserToRows(user, {
                    commonFieldArray,
                    isDetail,
                    isAccessTwo,
                    isAppLogin,
                    postData,
                    sourceMap,
                    formatDate
                });
                rows.push(...processedRows);
                rowCount += processedRows.length;
            }
            if (!isAccessTwo && seenAgents.size > 0) {
                await Promise.all(
                    Array.from(seenAgents).map(async (ua) => {
                        const parsed = await this.commonService.parseUserAgent(ua);
                        userAgentCache.set(ua, `${parsed.browser} ${parsed.version}`);
                    })
                );
            }
            if (rowCount === 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND"));
            }
            const finalCsvData = [
                commonFieldArray,
                ...rows.map(row => commonFieldArray.map(key => {
                    if (key === 'User Browser') {
                        return row.__raw_ua ? (userAgentCache.get(row.__raw_ua) || '') : '';
                    }
                    return row[key] ?? '';
                }))
            ];
            const writeResult = await this.commonFileService.writeFile(
                directory,
                JSON.stringify(finalCsvData),
                fileName
            );
            if (writeResult?.status !== 'success') {
                throw new Error('Failed to write JSON file');
            }
            const csvResult: any = await this.commonFileService.createJsonToFile(1, jsonFilePath, 'pythoncreatecsv.py');
            if (csvResult?.status !== 'success') {
                throw new Error('CSV conversion failed');
            }
            let fileData = await this.commonFileService.FileToBase64(csvFilePath);
            await Promise.all([
                this.commonFileService.removeFileFromLocal(jsonFilePath),
                this.commonFileService.removeFileFromLocal(csvFilePath)
            ].map(p => p.catch(() => { })));
            let fileDataEnc = this.commonService.passwordEncrypt(fileData);
            // let fileDataDec = this.commonService.decryptPassword(fileDataEnc);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: {
                    file_data: fileDataEnc,
                    // file_data: fileData,
                    file_name: fileName.replace('.json', ''),
                    extension: 'csv'
                },
                message: 'success'
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                statusCode: 500,
                success: 0,
                error: 1,
                message: error?.message,
                data: null,
            });
        }
    }

    @Post('org-agreement-report')
    async orgAgreementReport(@Req() req: Request, @Res() res: Response, @Body() postData: ReportInput) {
        try {
            if (!this.commonService.isValidNumber(postData?.terminated_users) || !this.commonService.isValidNumber(postData?.access_type) || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if (postData?.type && postData?.type == 'superadmin') {
                if (!postData?.membership_code) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            if (postData?.access_type?.toString() === '2') {
                if (!postData?.start_date) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            if (postData?.access_type?.toString() === '3') {
                if (!postData?.start_date && !postData?.end_date) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let user = Object.create(req.tokenUser)
            let condition: string = '';
            let memberShipCode = user.membership_code
            if (postData?.type && postData?.type == 'superadmin') {
                memberShipCode = postData?.membership_code
            }
            let directory = path.join(appConstant.COMPANY_LOGIN_AGREEMENT_REPORT, this.commonFileService.sanitizeFileName(user.org_id));
            let field = [
                'company.company_name', 'department.dept_name',
                'Location.location_name', 'Location.lname', 'settings.jobtitle',
                'user.gender', 'user.dob', 'user.date_of_hire', 'user.on_insurance_plan', 'user.insurance_plan_name', 'user.email', 'user.id', 'user.code', 'user.username',
                'user.first_name', 'user.last_name', 'user.email', 'user.last_login', 'user.num_login', 'user.relationship_id', 'user.role_id', 'user.middle_name',
                'UserLoginAgreement.user_sign', 'UserLoginAgreement.created'
            ]
            if (req.tokenUser?.role_id == appConstant.ROLE.WCH) {
                let userList = await this.userService.usersDataWellness(user, `user.role_id != 1 AND user.id != ${user.id} AND user.membership_code = '${user['membership_code']}' AND user.status =1`);
                if (!userList || userList.length == 0) {
                    condition = `user.role_id IN (2,16) AND user.membership_code = '${user.membership_code}' AND user.id IN (1)`;
                } else {
                    condition = `user.role_id IN (2,16) AND user.membership_code = '${user.membership_code}' AND user.id IN (${userList.map(ele => ele.id).join(',')})`
                }
            } else {
                condition = `user.role_id IN (2, 16) AND user.membership_code IN ('${memberShipCode}')`;
            }
            if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) {
                let resultedData = await this.clientManagerAssignService.listRecord({ user_id: req.tokenUser?.id, status: 1 }, null);
                if (resultedData.length > 0) {
                    condition += `AND user.org_id IN (${resultedData.map(ele => ele.org_id).join(',')})`;
                }
                else {
                    throw Error(this.translatorService.translate(req.lang, 'ERR_FORBIDDEN_ACCESS',),);
                }
            }
            if (postData?.department_id && postData?.department_id !== '') {
                let deptCondition = this.commonArrayService.formatInClauseCondition(postData?.department_id, 'user.department_id');
                if (deptCondition) {
                    condition += ` AND ${deptCondition}`;
                }
            }
            if (postData?.location_id && postData?.location_id !== '') {
                let locCondition = this.commonArrayService.formatInClauseCondition(postData?.location_id, 'user.location');
                if (locCondition) {
                    condition += ` AND ${locCondition}`;
                }
            }
            if (postData['terminated_users']) {
                if (postData['terminated_users'] == 2) {
                    condition += " AND user.status = 1";
                }
            }
            let from = "";
            let to = "";
            if (postData?.start_date) {
                from = postData?.start_date;
            }
            if (postData?.end_date) {
                to = postData?.end_date;
            }
            if (postData?.access_type == 2) {
                from = this.commonDateService.DateTimeFormat(from, "YYYY-MM-DD", "DD-MM-YYYY");
                condition += ` AND (DATE_FORMAT(UserLoginAgreement.created, '%Y-%m-%d') >= '${from}')`;
            }
            if (postData?.access_type == 3) {
                if (from && to) {
                    from = this.commonDateService.DateTimeFormat(from, "YYYY-MM-DD", "DD-MM-YYYY");
                    to = this.commonDateService.DateTimeFormat(to, "YYYY-MM-DD", "DD-MM-YYYY");
                    condition += ` AND (DATE_FORMAT(UserLoginAgreement.created, '%Y-%m-%d') BETWEEN '${from}' AND '${to}')`
                }
            }
            let userData = await this.userService.agreementReport(condition, field)
            let commonFieldArray = [
                'USER CODE', 'DEPARTMENT', 'RELATIONSHIP ID', 'FIRST NAME', 'MIDDLE NAME', 'LAST NAME', 'JOB TITLE', 'GENDER', 'BIRTH DATE', 'DATE OF HIRE',
                'ON HEALTH PLAN', 'HEALTH PLAN NAME', 'EMAIL', 'LOCATION', 'USER TYPE', 'Agreement Added', 'Signature', 'Date'
            ];
            let allUserLogindata = [];
            for (const [index, user] of userData.entries()) {
                let key = index
                let commonFields = await this.commonHealthService.CommonFieldDataCallingCovid(user, commonFieldArray);
                //allUserLogindata[key] = Array.isArray(commonFields) ? commonFields : [];
                commonFields['Agreement Added'] = (user?.['UserLoginAgreement']?.user_sign ? "Yes" : "No");
                commonFields['Signature'] = (user?.['UserLoginAgreement']?.user_sign || "");
                commonFields['Date'] = (
                    user?.['UserLoginAgreement']?.created ? this.commonDateService.DateTimeFormat(user?.['UserLoginAgreement']?.created, 'DD-MM-YYYY') : '')
                allUserLogindata.push(commonFields)
            }
            let companyName = userData.length > 0 ? userData?.[0]?.['company']?.['company_name']?.replace(/\s+/g, '_') || 'Default' : 'Default'
            const finalData = allUserLogindata.map((item) =>
                commonFieldArray.reduce((acc, key) => {
                    if (item.hasOwnProperty(key)) {
                        acc[key] = item[key];
                    } else {
                        acc[key] = "";
                    }
                    return acc;
                }, {})
            );
            const jsonString = JSON.stringify(finalData, null, 2);
            let fileName = `${companyName}_Login_Agreement_Report_${moment().format("YYYYMMDD_HHmmss")}.json`
            let filePath = path.join(directory, fileName);
            let filePathh = path.join(`${directory}`);
            let data;
            try {
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
            } catch (err) {
                throw new Error(`An error occurred: ${err}`);
            }
            fileName = fileName.replace(".json", "");
            await this.commonFileService.removeFileFromLocal(`${filePath}`);
            filePath = `${filePath}`.replace(".xlsx", ".json");
            await this.commonFileService.removeFileFromLocal(`${filePath}`);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: { file_data: data, file_name: fileName, extension: 'xlsx' },
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                statusCode: 500,
                success: 0,
                error: 1,
                message: error?.message,
                data: null,
            });
        }
    }

    private async checkExportAuthorization(req: Request, postData: any) {
        const { role_id, id, org_id } = req.tokenUser;
        const orgId = postData?.org_id ?? org_id;
        const userId = postData?.user_id ?? id;

        let query: any = { org_id: orgId };

        if (role_id === appConstant.ROLE.BROKERADMIN) {
            query.broker_admin_id = userId;
        } else if (role_id === appConstant.ROLE.BROKER) {
            query.user_id = userId;
            query.is_global = 1;
        } else if (role_id === appConstant.ROLE.REGIONALADMIN) {
            query.user_id = userId;
            query.is_global = 2;
        }

        if ([appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER, appConstant.ROLE.REGIONALADMIN].includes(role_id)) {
            const brokerListData = await this.brokerService.brokerListRecord(query);
            if (!brokerListData.length) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION")
                );
            }
        }
    }

    @Post('employee-export')
    // employee_export
    // userreport.controller.ts

    async employee_export(@Req() req: Request, @Res() res: Response, @Body() postData: EmployeeExportInput) {
        const rateLimiter = new RateLimiterMiddleware();
        await rateLimiter.use(req, res, async () => {
            try {
                // defaults
                postData.membership_code ??= req.tokenUser?.membership_code;
                postData.user_id ??= req.tokenUser?.id;
                postData.org_id ??= req.tokenUser?.org_id;

                if (!postData?.membership_code) {
                    throw new Error(
                        await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING")
                    );
                }

                // 🔒 authorization
                await this.checkExportAuthorization(req, postData);

                // export build (service call)
                const result = await this.userreportservice.buildUserExport(postData.org_id);

                // log export
                await this.userDownloadLogService.save({
                    user_id: req.tokenUser?.id,
                    email: req.tokenUser?.email ?? "",
                    metadata: JSON.stringify({
                        user_name: req.tokenUser?.username,
                        timezone: req.tokenUser?.timezone,
                        creation_date: req.tokenUser?.created,
                        ip_address: req.ip || req.connection?.remoteAddress || "",
                        location: `${req.tokenUser?.settings?.city ?? ""}, ${req.tokenUser?.settings?.state ?? ""}, ${req.tokenUser?.settings?.country ?? ""} ${req.tokenUser?.settings?.zip ?? ""}`.trim(),
                        user_agent: req.headers["user-agent"] || ""
                    })
                });

                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: result,
                    message: "success"
                });
            } catch (error) {
                this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
                throw new HttpException(
                    { statusCode: 401, success: 0, error: 1, message: error?.message, data: null },
                    HttpStatus.BAD_REQUEST
                );
            }
        });
    }
    // API for participation report view of user participation summery
    @Post('participation-report-view')
    async participation_report_view(@Req() req: Request, @Res() res: Response, @Body() postData: ParticipationReportViewInput) {
        try {
            if (!this.commonService.isValidNumber(postData?.id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if (!postData?.org_id) {
                let userDetails = await this.userService.findUserRecord({ id: postData?.id }, ['id', 'org_id', 'role_id']);
                if (userDetails) {
                    if (![
                        appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER,
                        appConstant.ROLE.SUPPORT_LEVEL_1,
                        appConstant.ROLE.CLIENTENGAGEMENTMANAGER,
                        appConstant.ROLE.REGIONALADMIN,
                        appConstant.ROLE.BROKERADMIN,
                        appConstant.ROLE.NEWSLETTERDESIGNER,
                        appConstant.ROLE.MARKETINGMANAGER,
                        appConstant.ROLE.CENSUSADMIN,
                        appConstant.ROLE.CENSUSGLOBALADMIN,
                        appConstant.ROLE.DATAMANAGER,
                        appConstant.ROLE.GLOBALMARKETINGMANAGER,
                        appConstant.ROLE.ENGAGEMENTDATAMANAGER,
                        appConstant.ROLE.GLOBALDATAMANAGER,
                        appConstant.ROLE.GLOBALCOACH,
                        appConstant.ROLE.COACH
                    ].includes(userDetails?.role_id)) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                    }
                }
            }
            let resultDetails: { [key: string]: string | number | boolean | object } = {};
            let physicianDate = await this.formService.getBiometricAdded(postData?.id) || '';
            let dentistDate = await this.formService.getDentalAdded(postData?.id) || '';
            let optometristDate = await this.formService.getOptometristsAdded(postData?.id) || '';
            let tobaccoDate = await this.formService.getTabaccouseAdded(postData?.id) || '';
            resultDetails['User ID'] = postData.id || 0;
            resultDetails['biometricDateWithStatus'] = physicianDate == '' ? 'Incomplete' : `Complete on ${physicianDate}`;
            resultDetails['biometricStatus'] = physicianDate == '' ? 'Incomplete' : `Complete`;
            resultDetails['biometricFormDate'] = physicianDate || '-';
            resultDetails['physicianDateWithStatus'] = physicianDate == '' ? 'Incomplete' : `Complete on ${physicianDate}`;
            resultDetails['physicianStatus'] = physicianDate == '' ? 'Incomplete' : `Complete`;
            resultDetails['physicianFormDate'] = physicianDate || '-';
            resultDetails['dentalDateWithStatus'] = dentistDate == '' ? 'Incomplete' : `Complete on ${dentistDate}`;
            resultDetails['dentalStatus'] = dentistDate == '' ? 'Incomplete' : `Complete`;
            resultDetails['dentalFormDate'] = dentistDate || '-';
            resultDetails['optometristDateWithStatus'] = optometristDate == '' ? 'Incomplete' : `Complete on ${optometristDate}`;
            resultDetails['optometristStatus'] = optometristDate == '' ? 'Incomplete' : `Complete`;
            resultDetails['optometristFormDate'] = optometristDate || '-';
            resultDetails['tobaccoDateWithStatus'] = tobaccoDate == '' ? 'Incomplete' : `Complete on ${tobaccoDate}`;
            resultDetails['tobaccoStatus'] = tobaccoDate == '' ? 'Incomplete' : `Complete`;
            resultDetails['tobaccoFormDate'] = tobaccoDate || '-';
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultDetails,
                message: "success"
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                { statusCode: 401, success: 0, error: 1, message: error?.message, data: null },
                HttpStatus.BAD_REQUEST
            );
        }
    }
    async streamToEntityStructure(stream) {
        return new Promise((resolve, reject) => {
            const map = new Map();

            stream.on('data', (row) => {
                const id = row.user_id;
                if (!map.has(id)) {
                    map.set(id, {
                        id: row.user_id,
                        role_id: row.user_role_id,
                        membership_code: row.user_membership_code,
                        department_id: row.user_department_id,
                        location: row.user_location,
                        status: row.user_status,
                        num_login: row.user_num_login,
                        last_login: row.user_last_login,
                        code: row.user_code,
                        on_insurance_plan: row.user_on_insurance_plan,
                        gender: row.user_gender,
                        username: row.user_username,
                        first_name: row.user_first_name,
                        middle_name: row.user_middle_name,
                        last_name: row.user_last_name,
                        relationship_id: row.user_relationship_id,
                        dob: row.user_dob,
                        date_of_hire: row.user_date_of_hire,
                        insurance_plan_name: row.user_insurance_plan_name,
                        email: row.user_email,
                        timezone: row.user_timezone,
                        company: row.company_id ? {
                            id: row.company_id,
                            company_name: row.company_company_name,
                        } : null,
                        department: row.department_id ? {
                            id: row.department_id,
                            dept_name: row.department_dept_name,
                        } : null,
                        settings: row.settings_id ? {
                            id: row.settings_id,
                            jobtitle: row.settings_jobtitle,
                        } : null,
                        Location: row.Location_id ? {
                            id: row.Location_id,
                            lname: row.Location_lname,
                        } : null,
                        userLogin: []
                    });
                }
                if (row.userLogin_id) {
                    map.get(id).userLogin.push({
                        id: row.userLogin_id,
                        user_id: row.userLogin_user_id,
                        ip: row.userLogin_ip,
                        source: row.userLogin_source,
                        timezone: row.userLogin_timezone,
                        login_time: row.userLogin_login_time,
                        useragent: row.userLogin_useragent,
                    });
                }
            });
            stream.on('end', () => resolve([...map.values()]));
            stream.on('error', reject);
        });
    }
    async processUserToRows(user: any, opts: any): Promise<any[]> {
        const {
            commonFieldArray,
            isDetail,
            isAccessTwo,
            isAppLogin,
            postData,
            sourceMap,
            formatDate
        } = opts;
        const base = await this.commonHealthService.CommonFieldDataCallingCovid(user, commonFieldArray);
        let logins = user.userLogin || [];
        if(isAccessTwo){
            logins = []
        }
        const rows: any[] = [];
        const hasLogin = logins.length > 0;
        const showFirstLogin = postData?.logintype === 2;
        let lastAndroid = null;
        let lastIOS = null;
        let androidCount = 0;
        let iosCount = 0;
        if (hasLogin && !isDetail) {
            for (let i = logins.length - 1; i >= 0; i--) {
                const login = logins[i];
                if (login.source == 1 && !lastAndroid) lastAndroid = login;
                if (login.source == 2 && !lastIOS) lastIOS = login;
                if (login.source == 1) androidCount++;
                if (login.source == 2) iosCount++;
            }
        }
        if (isDetail && hasLogin) {
            for (const login of logins) {
                const row = { ...base };
                if (!isAccessTwo) {
                    row['Last Login'] = formatDate(login.login_time);
                    row['Timezone'] = login.timezone || '';
                    row['IP'] = login.ip || '';
                    row['Login Source'] = sourceMap[login.source] || '';
                    row['__raw_ua'] = login.useragent || '';
                    if (showFirstLogin) {
                        row['First Time Logged In'] = formatDate(logins[logins.length - 1]?.login_time || user.last_login);
                    }
                }
                rows.push(row);
            }
        }
        else if (isAppLogin && !isDetail && (lastAndroid || lastIOS)) {
            const createPlatformRow = (platform: 'Android' | 'IOS', lastLogin: any, count: number) => {
                const row = { ...base };
                row['Platform'] = platform;
                row['Total Logins'] = count;
                if (!isAccessTwo && lastLogin) {
                    row['Last Login'] = formatDate(lastLogin.login_time);
                    row['Timezone'] = lastLogin.timezone || '';
                    row['IP'] = lastLogin.ip || '';
                    row['__raw_ua'] = lastLogin.useragent || '';

                    if (showFirstLogin) {
                        row['First Time Logged In'] = formatDate(logins[logins.length - 1]?.login_time || user.last_login);
                    }
                }
                return row;
            };
            if (lastAndroid) {
                rows.push(createPlatformRow('Android', lastAndroid, androidCount));
            }
            if (lastIOS) {
                rows.push(createPlatformRow('IOS', lastIOS, iosCount));
            }
        }
        else {
            const row = { ...base };
            const lastLogin = logins[0];
            if (!isAccessTwo && lastLogin) {
                row['Last Login'] = formatDate(lastLogin.login_time || user.last_login);
                row['Timezone'] = lastLogin.timezone || '';
                row['IP'] = lastLogin.ip || '';
                row['__raw_ua'] = lastLogin.useragent || '';
                if (showFirstLogin) {
                    row['First Time Logged In'] = formatDate(logins[logins.length - 1]?.login_time || user.last_login);
                }
            }
            if (isAccessTwo && !isDetail) {
                row['Total Logins'] = 0;
                row['Android Login'] = androidCount;
                row['IOS Login'] = iosCount;
            }
            if (!isDetail && !isAccessTwo) {
                row['Total Logins'] = Number(user.num_login) || 0;
                row['Android Login'] = androidCount;
                row['IOS Login'] = iosCount;
            }
            rows.push(row);
        }
        return rows;
    }

}
