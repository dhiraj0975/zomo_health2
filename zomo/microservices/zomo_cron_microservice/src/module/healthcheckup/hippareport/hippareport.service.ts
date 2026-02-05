import { Injectable } from '@nestjs/common';
import { HippaReportInput } from './input/hippareport.input';
import { appConstant, CommonArrayService, CommonDateService, CommonFileService, CommonHealthService, CommonService } from '@common-constants';
import { CompanyService } from 'src/module/company/company.service';
import { UserService } from 'src/module/user/user.service';
import { In } from 'typeorm';
import { FormInstructionsService } from '../forminstructions.service';
import { ParticipationReportInput } from './input/participationreport.input';
import { IndividualReportInput } from './input/individualreport.input';
import { CronCommonService } from 'src/common';
import { BiometricsService } from '../biometrics/biometrics.service';
import { EngagementService } from '../engagement/engagement.service';
const moment = require('moment-timezone');
const path = require('path');
@Injectable()
export class HippaReportService {
    constructor(
        private readonly commonService: CommonService,
        private readonly companyService: CompanyService,
        private readonly commonDateService: CommonDateService,
        private readonly userService: UserService,
        private readonly commonHealthService: CommonHealthService,
        private readonly commonFileService: CommonFileService,
        private readonly commonArrayService: CommonArrayService,
        private readonly formInstructionsService: FormInstructionsService,
        private readonly cronCommonService: CronCommonService,
        private readonly biometricsService: BiometricsService,
        private readonly engagementService: EngagementService,
    ) { }
    // for generating hippa release report
    async hippaReport(postData: HippaReportInput) {
        try {
            if (!postData?.org_id || postData?.org_id == '' || postData?.org_id == undefined || postData?.org_id == null) {
                throw new Error('A required field is missing. Please check and try again.');
            }
            let requestfor = (postData?.result_type && this.commonService.isValidNumber(postData?.result_type)) ? Number(postData?.result_type) : 0;
            let autoRequest = 0;
            let user = Object.create(postData?.userDetails || {}) || {};
            let org_id: number[] | number | string | string[];
            let companyid: number | string | string[] | number[];
            let clmNameArr: string[] = [
                'USER CODE', 'ORGANIZATION', 'DEPARTMENT', 'RELATIONSHIP ID', 'USERNAME', 'FIRST NAME', 'MIDDLE NAME', 'LAST NAME', 'JOB TITLE', 'EMPLOYEE ID', 'GENDER',
                'BIRTH DATE', 'DATE OF HIRE', 'ON HEALTH PLAN', 'HEALTH PLAN NAME', 'EMAIL', 'LOCATION', 'USER TYPE',
                'Physician Form Complete', 'Physician Completion Date'
            ];
            if (autoRequest == 0) {
                org_id = postData?.org_id;
                companyid = postData?.org_id;
                if ([appConstant.ROLE.COACH, appConstant.ROLE.GLOBALCOACH, appConstant.ROLE.WCH, appConstant.ROLE.BROKER, appConstant.ROLE.BROKERADMIN,
                appConstant.ROLE.REGIONALADMIN].includes(user?.role_id)) {
                    org_id = postData?.org_id;
                    companyid = postData?.org_id;
                }
            }
            let condition = `User.role_id IN (2,16) `;
            if (org_id && org_id != '') {
                if (postData?.on_insurance_plan && postData?.on_insurance_plan.toLowerCase() !== 'both') {
                    if (postData?.on_insurance_plan.toLowerCase() === 'yes' || postData?.on_insurance_plan.toLowerCase() === 'y') {
                        condition += ` AND (User.on_insurance_plan = 'yes' OR User.on_insurance_plan = 'y')`;
                    }
                    else if (postData?.on_insurance_plan.toLowerCase() === 'no' || postData?.on_insurance_plan.toLowerCase() === 'n') {
                        condition += ` AND (User.on_insurance_plan = 'no' OR User.on_insurance_plan = 'n')`;
                    }
                }
                let membershipcodeArray = [];
                const orgIdArray = (Array.isArray(org_id) ? org_id : String(org_id).split(','))
                    .map(id => Number(String(id).trim()))
                    .filter(id => !isNaN(id) && id > 0);
                if (orgIdArray.length > 0) {
                    membershipcodeArray = await this.companyService.companyListRecord(
                        ['code'],
                        { id: In(orgIdArray) }
                    );
                }
                if (membershipcodeArray.length === 0) {
                    throw new Error('No organization found');
                }
                condition += ` AND User.membership_code IN ('${membershipcodeArray.map(item => item.code).join("','")}')`;
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
                if (postData?.country?.length) {
                    let countryCondition = this.commonArrayService.formatInClauseCondition(postData?.country, 'Location.country');
                    if (countryCondition) {
                        condition += ` AND ${countryCondition}`;
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
                            condition += ` AND ${stateCondition}`;
                        }
                    } else {
                        let stateCondition = this.commonArrayService.formatInClauseCondition(postData?.state, 'Location.state');
                        if (stateCondition) {
                            condition += ` AND ${stateCondition}`;
                        }
                    }
                }
                if (postData?.city?.length) {
                    let cityCondition = this.commonArrayService.formatInClauseCondition(postData?.city, 'Location.city');
                    if (cityCondition) {
                        condition += ` AND ${cityCondition}`;
                    }
                }
                if (postData?.show_terminated_users?.toString() === '2') {
                    condition += ' AND User.status = 1';
                }
                if (postData?.start_date && postData?.end_date) {
                    condition += ` AND DATE_FORMAT(Authorization.date_completed,"%Y-%m-%d") BETWEEN '${this.commonDateService.DateTimeFormat(postData.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}' AND '${this.commonDateService.DateTimeFormat(postData.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                } else if (postData?.start_date) {
                    condition += ` AND DATE_FORMAT(Authorization.date_completed,"%Y-%m-%d") >= '${this.commonDateService.DateTimeFormat(postData.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                } else if (postData?.end_date) {
                    condition += ` AND DATE_FORMAT(Authorization.date_completed,"%Y-%m-%d") <= '${this.commonDateService.DateTimeFormat(postData.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                }
                let paginate = {
                    page: postData?.page || 1,
                    limit: postData?.limit || appConstant.RECORD_PER_PAGE,
                }
                if (requestfor === 1) {
                    if (postData?.search_str && postData?.search_str != '') {
                        const search = postData?.search_str.toLowerCase();
                        if (moment(postData?.search_str, 'MM-DD-YYYY', true).isValid()) {
                            condition += ` AND DATE_FORMAT(Authorization.date_completed,"%Y-%m-%d") LIKE '%${moment(postData?.search_str, 'MM-DD-YYYY', true).format('YYYY-MM-DD')}%'`
                        } else {
                            condition += ` AND (LOWER(User.first_name) LIKE '%${search}%' OR LOWER(User.last_name) LIKE '%${search}%' OR (User.code) LIKE '%${search}%' OR (User.email) LIKE '%${search}%' OR LOWER(company.company_name) LIKE '%${search}%'  OR CONCAT(LOWER(User.first_name),' ',LOWER(User.last_name)) LIKE '%${search}%')`;
                        }
                    }
                }
                let resultDetails: any = await this.userService.generateTPTHReport('hippa', condition, '', requestfor == 1 ? paginate : null);
                if (!resultDetails) {
                    throw new Error('No record found');
                }
                if (resultDetails) {
                    let visibleSection = await this.formInstructionsService.visibleSectionAccordingToProgram(Number(companyid)) || [];
                    if (Array.isArray(visibleSection) && visibleSection.includes('1')) {
                        resultDetails = await this.mapHippaData(resultDetails, requestfor, clmNameArr);
                        if (requestfor == 2) {
                            resultDetails = await this.hippaReportXLSX(resultDetails, clmNameArr);
                        }
                    } else {
                        throw new Error('No record found');
                    }
                }
                return resultDetails;
            }
            throw new Error('No record found');
        } catch (error) {
            console.log('error:', error);
            return {
                success: 0,
                message: error.message,
                error: 1,
            };
        }
    }
    // for mapping hippa report data
    async mapHippaData(resultDetails, requestfor: number, clmNameArr: string[] = []) {
        let tempdatarows = [];
        if (requestfor === 1) {
            let healthDataList = resultDetails?.['list'] || [];
            if (Object.keys(healthDataList).length === 0) {
                return { list: [], total: resultDetails['total'], pages: resultDetails['pages'], limit: resultDetails['limit'], page: resultDetails['page'] }
            }
            for (const [index, healthData] of healthDataList.entries()) {
                let tempdatarow = Object.create(null);
                const fullName = `${healthData?.first_name} ${healthData?.last_name}`;
                tempdatarow['firstName'] = healthData?.first_name || '';
                tempdatarow['lastName'] = healthData?.last_name || '';
                tempdatarow['email'] = healthData?.email || '';
                tempdatarow['fullName'] = fullName;
                tempdatarow['code'] = healthData?.code || '';
                tempdatarow['organization'] = healthData?.company?.company_name || '';
                tempdatarow['pfc'] = 'Yes';
                tempdatarows.push(tempdatarow);
            }
            return { list: tempdatarows, total: resultDetails['total'], pages: resultDetails['pages'], limit: resultDetails['limit'], page: resultDetails['page'] }
        }
        if (requestfor === 2) {
            if (Object.keys(resultDetails).length > 0) {
                for (const [index, healthData] of resultDetails.entries()) {
                    let tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(healthData, clmNameArr);
                    tempdatainfo['Physician Form Complete'] = "Yes";
                    tempdatainfo['Physician Completion Date'] = healthData['Authorization']['date_completed'] ? this.commonDateService.DateTimeFormat(healthData['Authorization']['date_completed'], "MM-DD-YYYY", "YYYY-MM-DD") : '';
                    tempdatarows.push(tempdatainfo);
                }
                return tempdatarows
            }
            return [];
        }
        return tempdatarows;
    }
    //for generating hippa report, participation report and individual report in xlsx format
    async hippaReportXLSX(resultDetails, clmNameArr: string[], type: string = ''): Promise<{ file_data: string, file_name: string, extension: string }> {
        let directory = path.join(appConstant.COMPANY_HEALTH_HIPPA_REPORT);
        let fileName = `Hippa_Release_Report_${moment().format('MMDDYYYY_HHmmss')}.json`;
        if (type && type === 'individual') {
            directory = path.join(appConstant.COMPANY_HEALTH_INDIVIDUAL_REPORT);
            fileName = `Individual_Report_${moment().format('MMDDYYYY_HHmmss')}.json`;
            let resultFileName = `Individual_Report_Result_${moment().format('MMDDYYYY_HHmmss')}.json`;
            let filePath = path.join(directory, fileName);
            let filePathh = path.join(`${directory}`);
            let userDetailsData = resultDetails['firstSheet'] || [];
            let resultDetailsData = resultDetails['secondSheet'] || [];
            let clmNameArrResult = [
                'USER CODE', 'USERNAME', 'FIRST NAME', 'LAST NAME', 'EMAIL',
                'PHYSICIAN STATUS', 'PHYSICIAN FORM DATE', 'DENTAL STATUS', 'DENTAL FORM DATE',
                'OPTOMETRIST STATUS', 'OPTOMETRIST FORM DATE', 'TOBACCO STATUS', 'TOBACCO FORM DATE'
            ];
            const finalDataUser = userDetailsData.map((item) =>
                clmNameArr.reduce((acc, key) => {
                    if (item.hasOwnProperty(key)) {
                        acc[key] = item[key];
                    } else {
                        acc[key] = "";
                    }
                    return acc;
                }, {})
            );
            const finalDataResult = resultDetailsData.map((item) =>
                clmNameArrResult.reduce((acc, key) => {
                    if (item.hasOwnProperty(key)) {
                        acc[key] = item[key];
                    } else {
                        acc[key] = "";
                    }
                    return acc;
                }, {})
            );
            const jsonString = JSON.stringify(finalDataUser, null, 2);
            const jsonStringResult = JSON.stringify(finalDataResult, null, 2);
            let data;
            try {
                let writeFile = await this.commonFileService.writeFile(
                    filePathh,
                    jsonString,
                    fileName,
                );
                let writeFileResult = await this.commonFileService.writeFile(
                    filePathh,
                    jsonStringResult,
                    resultFileName,
                );
                if (writeFile?.status == 'success' && writeFileResult?.status == 'success') {
                    let jsonFilePaths = [filePath, path.join(directory, resultFileName)];
                    let jsonPathsString = jsonFilePaths.join(',');
                    let excelData: any =
                        await this.commonFileService.createJsonToFile(
                            1,
                            `${jsonPathsString}`,
                            'pythonjsontoxlsx.py',
                            '',
                            true,
                            'individual',
                        );
                    if (excelData?.status == 'success') {
                        filePath = `${filePath}`.replace('.json', '.xlsx');
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
                throw new Error(`An error occurred: ${err.message}`);
            }
            fileName = fileName.replace('.json', '');
            await this.commonFileService.removeFileFromLocal(`${filePath}`);
            await this.commonFileService.removeFileFromLocal(path.join(directory, resultFileName));
            filePath = `${filePath}`.replace('.xlsx', '.json');
            await this.commonFileService.removeFileFromLocal(`${filePath}`);
            return { file_data: data, file_name: fileName, extension: 'xlsx' };
        }
        if (type && type === 'participation') {
            directory = path.join(appConstant.COMPANY_HEALTH_PARTICIPATION_REPORT);
            fileName = `Participation_Report_${moment().format('MMDDYYYY_HHmmss')}.json`;
        }
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
    // function for participation report of health check up
    async participationReport(postData: ParticipationReportInput) {
        try {
            if (!postData?.org_id || postData?.org_id == '' || postData?.org_id == undefined || postData?.org_id == null) {
                throw new Error('A required field is missing. Please check and try again.');
            }
            let requestfor = (postData?.result_type && this.commonService.isValidNumber(postData?.result_type)) ? Number(postData?.result_type) : 0;
            let autoRequest = 0;
            let user = Object.create(postData?.userDetails || {}) || {};
            let org_id: number[] | number | string | string[];
            let clmNameArr: string[] = [
                'USER CODE', 'ORGANIZATION', 'DEPARTMENT', 'RELATIONSHIP ID', 'USERNAME', 'FIRST NAME', 'MIDDLE NAME', 'LAST NAME', 'JOB TITLE',
                'EMPLOYEE ID', 'GENDER', 'BIRTH DATE', 'DATE OF HIRE', 'ON HEALTH PLAN', 'HEALTH PLAN NAME', 'EMAIL', 'LOCATION', 'USER TYPE',
                'All Requirements Met?', 'Physician Form Completion Status', 'Physician Form Completion Date', 'Dental Visit Completion Status',
                'Dental Visit Completion Date', 'Optometrist Visit Completion Status', 'Optometrist Visit Completion Date', 'TobaccoAfidavit Visit Completion Status',
                'TobaccoAfidavit Visit Completion Date'
            ];
            if (autoRequest == 0) {
                org_id = postData?.org_id;
                if ([appConstant.ROLE.COACH, appConstant.ROLE.GLOBALCOACH, appConstant.ROLE.WCH, appConstant.ROLE.BROKER, appConstant.ROLE.BROKERADMIN,
                appConstant.ROLE.REGIONALADMIN].includes(user?.role_id)) {
                    org_id = postData?.org_id;
                }
            }
            let condition = `User.role_id IN (2,16) AND User.status = 1 `;
            if (org_id && org_id != '') {
                let membershipcodeArray = [];
                const orgIdArray = (Array.isArray(org_id) ? org_id : String(org_id).split(','))
                    .map(id => Number(String(id).trim()))
                    .filter(id => !isNaN(id) && id > 0);
                if (orgIdArray.length > 0) {
                    membershipcodeArray = await this.companyService.companyListRecord(
                        ['code'],
                        { id: In(orgIdArray) }
                    );
                }
                if (membershipcodeArray.length === 0) {
                    throw new Error('No organization found');
                }
                condition += ` AND User.membership_code IN ('${membershipcodeArray.map(item => item.code).join("','")}')`;
                if (postData?.department_id?.length) {
                    let deptCondition = this.commonArrayService.formatInClauseCondition(postData?.department_id, 'User.department_id');
                    if (deptCondition) {
                        condition += ` AND ${deptCondition}`;
                    }
                }
                let bioCondition = '', hraCondition = '', denCondition = '', optCondition = '', tobCondition = '';
                if (postData?.start_date && postData?.end_date) {
                    bioCondition += `DATE_FORMAT(b.created,"%Y-%m-%d") BETWEEN '${this.commonDateService.DateTimeFormat(postData.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}' AND '${this.commonDateService.DateTimeFormat(postData.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                    hraCondition += `DATE_FORMAT(h.date,"%Y-%m-%d") BETWEEN '${this.commonDateService.DateTimeFormat(postData.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}' AND '${this.commonDateService.DateTimeFormat(postData.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                    denCondition += `DATE_FORMAT(d.date_completed,"%Y-%m-%d") BETWEEN '${this.commonDateService.DateTimeFormat(postData.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}' AND '${this.commonDateService.DateTimeFormat(postData.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                    optCondition += `DATE_FORMAT(o.date_completed,"%Y-%m-%d") BETWEEN '${this.commonDateService.DateTimeFormat(postData.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}' AND '${this.commonDateService.DateTimeFormat(postData.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                    tobCondition += `DATE_FORMAT(t.date_completed,"%Y-%m-%d") BETWEEN '${this.commonDateService.DateTimeFormat(postData.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}' AND '${this.commonDateService.DateTimeFormat(postData.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                }
                else if (postData?.start_date) {
                    bioCondition += `DATE_FORMAT(b.created,"%Y-%m-%d") >= '${this.commonDateService.DateTimeFormat(postData.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                    hraCondition += `DATE_FORMAT(h.date,"%Y-%m-%d") >= '${this.commonDateService.DateTimeFormat(postData.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                    denCondition += `DATE_FORMAT(d.date_completed,"%Y-%m-%d") >= '${this.commonDateService.DateTimeFormat(postData.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                    optCondition += `DATE_FORMAT(o.date_completed,"%Y-%m-%d") >= '${this.commonDateService.DateTimeFormat(postData.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                    tobCondition += `DATE_FORMAT(t.date_completed,"%Y-%m-%d") >= '${this.commonDateService.DateTimeFormat(postData.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                }
                else if (postData?.end_date) {
                    bioCondition += `DATE_FORMAT(b.created,"%Y-%m-%d") <= '${this.commonDateService.DateTimeFormat(postData.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                    hraCondition += `DATE_FORMAT(h.date,"%Y-%m-%d") <= '${this.commonDateService.DateTimeFormat(postData.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                    denCondition += `DATE_FORMAT(d.date_completed,"%Y-%m-%d") <= '${this.commonDateService.DateTimeFormat(postData.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                    optCondition += `DATE_FORMAT(o.date_completed,"%Y-%m-%d") <= '${this.commonDateService.DateTimeFormat(postData.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                    tobCondition += `DATE_FORMAT(t.date_completed,"%Y-%m-%d") <= '${this.commonDateService.DateTimeFormat(postData.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                }
                let paginate = {
                    page: postData?.page || 1,
                    limit: postData?.limit || appConstant.RECORD_PER_PAGE,
                }
                let fields: string[] = [
                    'User.id', 'User.username',
                    'company.company_name',
                    'Biometric.id', 'Biometric.created', 'Biometric.user_id',
                    'Hrabiometric.id', 'Hrabiometric.date', 'Hrabiometric.user_id',
                    'Dentist.id', 'Dentist.date_completed', 'Dentist.userid',
                    'Optometrist.id', 'Optometrist.date_completed', 'Optometrist.userid',
                    'Tabaccouse.id', 'Tabaccouse.date_completed', 'Tabaccouse.user_id', 'Tabaccouse.type_of_form',
                ]
                if (requestfor === 1) {
                    if (postData?.search_str && postData?.search_str != '') {
                        const search = postData?.search_str.toLowerCase();
                        if (moment(postData?.search_str, 'MM-DD-YYYY', true).isValid()) {
                            condition += ` AND (Biometric.created LIKE '%${moment(postData?.search_str, 'MM-DD-YYYY', true).format('YYYY-MM-DD')}%' OR Hrabiometric.date LIKE '%${moment(postData?.search_str, 'MM-DD-YYYY', true).format('YYYY-MM-DD')}%'
                            OR Dentist.date_completed LIKE '%${moment(postData?.search_str, 'MM-DD-YYYY', true).format('YYYY-MM-DD')}%' OR Optometrist.date_completed LIKE '%${moment(postData?.search_str, 'MM-DD-YYYY', true).format('YYYY-MM-DD')}%'
                            OR Tabaccouse.date_completed LIKE '%${moment(postData?.search_str, 'MM-DD-YYYY', true).format('YYYY-MM-DD')}%')`;
                        } else {
                            condition += ` AND (LOWER(User.first_name) LIKE '%${search}%' OR LOWER(User.last_name) LIKE '%${search}%' OR (User.code) LIKE '%${search}%' OR (User.email) LIKE '%${search}%' OR LOWER(company.company_name) LIKE '%${search}%' OR (LOWER(User.username) LIKE '%${search}%'))`;
                        }
                    }
                }
                let resultDetails: any = await this.userService.participationReport(condition, requestfor == 1 ? paginate : null, fields, bioCondition, hraCondition, denCondition, optCondition, tobCondition);
                if (!resultDetails) {
                    throw new Error('No record found');
                }
                if (resultDetails) {
                    let userDetailsResult;
                    if (requestfor == 1) {
                        userDetailsResult = resultDetails?.['list'] || [];
                    } else {
                        userDetailsResult = resultDetails || [];
                    }
                    for (const [index, healthData] of userDetailsResult.entries()) {
                        let userId = healthData?.id || 0;
                        let userDetails = await this.userService.userCDLSList(`User.id = ${userId}`, [
                            'User.role_id', 'User.new_password', 'User.timezone',
                            'User.is_camp_eligible', 'User.department_id', 'User.location', 'User.org_id', 'User.id', 'User.email', 'User.on_insurance_plan', 'User.gender',
                            'User.relationship_id', 'User.code', 'User.username', 'User.middle_name', 'User.dob', 'User.date_of_hire', 'User.first_name', 'User.last_name',
                            'User.insurance_plan_name', 'User.created', 'User.employeeid AS user_employeeid',
                            'settings.jobtitle', 'settings.wphone', 'settings.hphone',
                            'company.company_name', 'department.dept_name',
                            'Location.lname', 'Location.address1', 'Location.city', 'Location.state', 'Location.zip', 'Location.country',
                        ]);
                        if (requestfor === 1) {
                            resultDetails['list'][index] = { ...healthData, ...userDetails };
                        } else {
                            resultDetails[index] = { ...healthData, ...userDetails };
                        }
                    }
                    resultDetails = await this.mapParticipationData(resultDetails, requestfor, clmNameArr);
                    if (requestfor == 2) {
                        resultDetails = await this.hippaReportXLSX(resultDetails, clmNameArr, 'participation');
                    }
                } else {
                    throw new Error('No record found');
                }
                return resultDetails;
            }
            throw new Error('No record found');
        } catch (error) {
            console.log('error:', error);
            return {
                success: 0,
                message: error.message,
                error: 1,
            };
        }
    }
    // for mapping participation report data
    async mapParticipationData(resultDetails, requestfor: number, clmNameArr: string[] = []) {
        let tempdatarows = [];
        if (requestfor === 1) {
            let healthDataList = resultDetails?.['list'] || [];
            if (Object.keys(healthDataList).length === 0) {
                return { list: [], total: resultDetails['total'], pages: resultDetails['pages'], limit: resultDetails['limit'], page: resultDetails['page'] }
            }
            for (const [index, healthData] of healthDataList.entries()) {
                let tempdatarow = Object.create(null);
                const fullName = `${healthData?.first_name} ${healthData?.last_name}`;
                tempdatarow['username'] = healthData?.username || '';
                tempdatarow['email'] = healthData?.email || '';
                tempdatarow['fullName'] = fullName;
                tempdatarow['code'] = healthData?.code || '';
                tempdatarow['userId'] = healthData?.id || '';
                tempdatarow['orgId'] = healthData?.org_id || '';
                tempdatarow['created'] = healthData?.created ? this.commonDateService.DateTimeFormat(healthData?.['created'], "MM-DD-YYYY", "YYYY-MM-DD HH:mm:ss") : '';
                tempdatarow['userComplateAllReqStatus'] = 'No';
                tempdatarow['physicianFormCompletionStatus'] = 'No';
                tempdatarow['physicianFormCompletionDate'] = '-';
                tempdatarow['dentalFormCompletionStatus'] = 'No';
                tempdatarow['dentalFormCompletionDate'] = '-';
                tempdatarow['optometristFormCompletionStatus'] = 'No';
                tempdatarow['optometristFormCompletionDate'] = '-';
                tempdatarow['tobaccoAfidavitFormCompletionStatus'] = 'No';
                tempdatarow['tobaccoAfidavitFormCompletionDate'] = '-';
                if (healthData?.Biometric || healthData?.Hrabiometric) {
                    tempdatarow['physicianFormCompletionStatus'] = 'Yes';
                    if (healthData?.Biometric && healthData?.Hrabiometric) {
                        const hrabiometricDate = this.commonDateService.DateTimeFormat(healthData.Hrabiometric.date || healthData.Hrabiometric?.date, 'timestamp', 'YYYY-MM-DD HH:mm:ss');
                        const biometricDate = this.commonDateService.DateTimeFormat(healthData.Biometric.created || healthData.Biometric?.created, 'timestamp', 'YYYY-MM-DD HH:mm:ss');
                        if (hrabiometricDate >= biometricDate) {
                            healthData.Biometric = null;
                        } else {
                            healthData.Hrabiometric = null;
                        }
                    }
                    if (!healthData?.Biometric && healthData?.Hrabiometric) {
                        tempdatarow['physicianFormCompletionDate'] = healthData?.Hrabiometric?.date
                            ? this.commonDateService.DateTimeFormat(healthData.Hrabiometric.date, "MM-DD-YYYY", "YYYY-MM-DD HH:mm:ss")
                            : '-';
                    } else if (healthData?.Biometric && !healthData?.Hrabiometric) {
                        tempdatarow['physicianFormCompletionDate'] = healthData?.Biometric?.created
                            ? this.commonDateService.DateTimeFormat(healthData.Biometric.created, "MM-DD-YYYY", "YYYY-MM-DD HH:mm:ss")
                            : '-';
                    }
                }
                if (healthData?.Dentist) {
                    tempdatarow['dentalFormCompletionDate'] = healthData?.Dentist?.date_completed ? this.commonDateService.DateTimeFormat(healthData?.['Dentist']?.['date_completed'], "MM-DD-YYYY", "YYYY-MM-DD HH:mm:ss") : '-';
                    tempdatarow['dentalFormCompletionStatus'] = 'Yes';
                }
                if (healthData?.Optometrist) {
                    tempdatarow['optometristFormCompletionDate'] = healthData?.Optometrist?.date_completed ? this.commonDateService.DateTimeFormat(healthData?.['Optometrist']?.['date_completed'], "MM-DD-YYYY", "YYYY-MM-DD HH:mm:ss") : '-';
                    tempdatarow['optometristFormCompletionStatus'] = 'Yes';
                }
                if (healthData?.Tabaccouse) {
                    tempdatarow['tobaccoAfidavitFormCompletionDate'] = healthData?.Tabaccouse?.date_completed ? this.commonDateService.DateTimeFormat(healthData?.['Tabaccouse']?.['date_completed'], "MM-DD-YYYY", "YYYY-MM-DD HH:mm:ss") : '-';
                    tempdatarow['tobaccoAfidavitFormCompletionStatus'] = 'Yes';
                }
                if (tempdatarow['physicianFormCompletionStatus'] == 'Yes' && tempdatarow['dentalFormCompletionStatus'] == 'Yes' && tempdatarow['optometristFormCompletionStatus'] == 'Yes' && tempdatarow['tobaccoAfidavitFormCompletionStatus'] == 'Yes') {
                    tempdatarow['userComplateAllReqStatus'] = 'Yes';
                }
                tempdatarows.push(tempdatarow);
            }
            return { list: tempdatarows, total: resultDetails['total'], pages: resultDetails['pages'], limit: resultDetails['limit'], page: resultDetails['page'] }
        }
        if (requestfor === 2) {
            if (Object.keys(resultDetails).length > 0) {
                for (const [index, healthData] of resultDetails.entries()) {
                    let tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(healthData, clmNameArr);
                    tempdatainfo['All Requirements Met?'] = 'No';
                    tempdatainfo['Physician Form Completion Status'] = 'No';
                    tempdatainfo['Physician Form Completion Date'] = '-';
                    tempdatainfo['Dental Visit Completion Status'] = 'No';
                    tempdatainfo['Dental Visit Completion Date'] = '-';
                    tempdatainfo['Optometrist Visit Completion Status'] = 'No';
                    tempdatainfo['Optometrist Visit Completion Date'] = '-';
                    tempdatainfo['TobaccoAfidavit Visit Completion Status'] = 'No';
                    tempdatainfo['TobaccoAfidavit Visit Completion Date'] = '-';
                    if (healthData?.Biometric || healthData?.Hrabiometric) {
                        tempdatainfo['Physician Form Completion Status'] = 'Yes';
                        if (healthData?.Biometric && healthData?.Hrabiometric) {
                            const hrabiometricDate = this.commonDateService.DateTimeFormat(healthData.Hrabiometric.date || healthData.Hrabiometric?.date, 'timestamp', 'YYYY-MM-DD HH:mm:ss');
                            const biometricDate = this.commonDateService.DateTimeFormat(healthData.Biometric.created || healthData.Biometric?.created, 'timestamp', 'YYYY-MM-DD HH:mm:ss');
                            if (hrabiometricDate >= biometricDate) {
                                healthData.Biometric = null;
                            } else {
                                healthData.Hrabiometric = null;
                            }
                        }
                        if (!healthData?.Biometric && healthData?.Hrabiometric) {
                            tempdatainfo['Physician Form Completion Date'] = healthData?.Hrabiometric?.date
                                ? this.commonDateService.DateTimeFormat(healthData.Hrabiometric.date, "MM-DD-YYYY", "YYYY-MM-DD HH:mm:ss")
                                : '-';
                        } else if (healthData?.Biometric && !healthData?.Hrabiometric) {
                            tempdatainfo['Physician Form Completion Date'] = healthData?.Biometric?.created
                                ? this.commonDateService.DateTimeFormat(healthData.Biometric.created, "MM-DD-YYYY", "YYYY-MM-DD HH:mm:ss")
                                : '-';
                        }
                    }
                    if (healthData?.Dentist) {
                        tempdatainfo['Dental Visit Completion Date'] = healthData?.Dentist?.date_completed ? this.commonDateService.DateTimeFormat(healthData?.['Dentist']?.['date_completed'], "MM-DD-YYYY", "YYYY-MM-DD") : '-';
                        tempdatainfo['Dental Visit Completion Status'] = 'Yes';
                    }
                    if (healthData?.Optometrist) {
                        tempdatainfo['Optometrist Visit Completion Date'] = healthData?.Optometrist?.date_completed ? this.commonDateService.DateTimeFormat(healthData?.['Optometrist']?.['date_completed'], "MM-DD-YYYY", "YYYY-MM-DD") : '-';
                        tempdatainfo['Optometrist Visit Completion Status'] = 'Yes';
                    }
                    if (healthData?.Tabaccouse) {
                        tempdatainfo['TobaccoAfidavit Visit Completion Date'] = healthData?.Tabaccouse?.date_completed ? this.commonDateService.DateTimeFormat(healthData?.['Tabaccouse']?.['date_completed'], "MM-DD-YYYY", "YYYY-MM-DD") : '-';
                        tempdatainfo['TobaccoAfidavit Visit Completion Status'] = 'Yes';
                    }
                    if (tempdatainfo['Physician Form Completion Status'] == 'Yes' && tempdatainfo['Dental Visit Completion Status'] == 'Yes' && tempdatainfo['Optometrist Visit Completion Status'] == 'Yes' && tempdatainfo['TobaccoAfidavit Visit Completion Status'] == 'Yes') {
                        tempdatainfo['All Requirements Met?'] = 'Yes';
                    }
                    tempdatarows.push(tempdatainfo);
                }
                return tempdatarows
            }
            return [];
        }
        return tempdatarows;
    }
    async individualReport(postData: IndividualReportInput) {
        try {
            if (postData?.search_str == undefined || postData?.search_str == null || postData?.search_str == '') {
                throw new Error('A required field is missing. Please check and try again.');
            }
            let requestfor = (postData?.result_type && this.commonService.isValidNumber(postData?.result_type)) ? Number(postData?.result_type) : 0;
            let clmNameArr: string[] = [
                'USER CODE', 'ORGANIZATION', 'DEPARTMENT', 'RELATIONSHIP ID', 'USERNAME', 'FIRST NAME', 'MIDDLE NAME', 'LAST NAME', 'JOB TITLE',
                'EMPLOYEE ID', 'GENDER', 'BIRTH DATE', 'DATE OF HIRE', 'ON HEALTH PLAN', 'HEALTH PLAN NAME', 'EMAIL', 'LOCATION', 'USER TYPE', 'ROLE TYPE',
                'WORK CITY', 'WORK STATE/PROVINCE', 'WORK ZIP/POSTAL CODE', 'WORK COUNTRY', 'LAST LOGIN DATE', 'NUMBER OF LOGINS','CREATED DATE','LAST UPDATE DATE'
            ];
            let condition = `User.role_id NOT IN (8,11,1) AND User.status = 1`;
            let paginate = {
                page: postData?.page || 1,
                limit: postData?.limit || appConstant.RECORD_PER_PAGE,
            }
            let fields: string[] = [
                'User.role_id', 'User.new_password', 'User.timezone', 'User.department_id', 'User.location', 'User.org_id',
                'User.is_camp_eligible', 'User.id', 'User.username', 'User.date_of_hire', 'User.first_name', 'User.last_name', 'User.insurance_plan_name',
                'User.email', 'User.on_insurance_plan', 'User.gender', 'User.relationship_id', 'User.code', 'User.middle_name', 'User.dob', 'User.created',
                'User.last_login', 'User.num_login', 'User.updated',
                'settings.jobtitle', 'settings.wphone', 'settings.hphone',
                'company.company_name', 'department.dept_name',
                'Location.lname', 'Location.address1', 'Location.city', 'Location.state', 'Location.zip', 'Location.country',
            ]
            if (postData?.search_str && postData?.search_str != '') {
                const search = postData?.search_str.toLowerCase();
                condition += ` AND (LOWER(User.first_name) LIKE '%${search}%' OR LOWER(User.last_name) LIKE '%${search}%' OR LOWER(User.username) LIKE '%${search}%' OR (User.code) LIKE '%${search}%' OR (User.email) LIKE '%${search}%' OR LOWER(company.company_name) LIKE '%${search}%' OR LOWER(department.dept_name) LIKE '%${search}%' OR LOWER(Location.lname) LIKE '%${search}%' OR LOWER(Location.city) LIKE '%${search}%' OR LOWER(Location.state) LIKE '%${search}%' OR LOWER(Location.zip) LIKE '%${search}%')`;
            }
            let resultDetails: any = await this.userService.userCDLSList(
                condition,
                fields,
                requestfor == 1 ? paginate : null,
                'list'
            );
            if (!resultDetails) {
                throw new Error('No record found');
            }
            if (resultDetails) {
                resultDetails = await this.mapIndividualData(resultDetails, requestfor, clmNameArr);
                if (requestfor == 2) {
                    resultDetails = await this.hippaReportXLSX(resultDetails, clmNameArr, 'individual');
                }
            } else {
                throw new Error('No record found');
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
    async mapIndividualData(resultDetails, requestfor: number, clmNameArr: string[] = []) {
        let tempdatarows = [];
        let secondSheetData = [];
        if (requestfor === 1) {
            let healthDataList = resultDetails?.['list'] || [];
            if (Object.keys(healthDataList).length === 0) {
                return { list: [], total: resultDetails['total'], pages: resultDetails['pages'], limit: resultDetails['limit'], page: resultDetails['page'] }
            }
            for (const [index, healthData] of healthDataList.entries()) {
                let tempdatarow = Object.create(null);
                const fullName = `${healthData?.first_name} ${healthData?.last_name}`;
                tempdatarow['username'] = healthData?.username || '';
                tempdatarow['email'] = healthData?.email || '';
                tempdatarow['userId'] = healthData?.id || '';
                tempdatarow['orgId'] = healthData?.org_id || '';
                tempdatarow['fullName'] = fullName;
                tempdatarow['code'] = healthData?.code || '';
                tempdatarow['Location'] = healthData?.location || '';
                tempdatarow['created'] = healthData?.created ? this.commonDateService.DateTimeFormat(healthData?.['created'], "MM-DD-YYYY", "YYYY-MM-DD HH:mm:ss") : '';
                tempdatarows.push(tempdatarow);
            }
            return { list: tempdatarows, total: resultDetails['total'], pages: resultDetails['pages'], limit: resultDetails['limit'], page: resultDetails['page'] }
        }
        if (requestfor === 2) {
            if (Object.keys(resultDetails).length > 0) {
                for (const [index, healthData] of resultDetails.entries()) {
                    //first sheet data
                    let tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(healthData, clmNameArr);

                    tempdatainfo['LAST LOGIN DATE'] =
                        healthData?.last_login ?
                            this.commonDateService.DateTimeFormat(healthData?.['last_login'], "MM-DD-YYYY", "YYYY-MM-DD HH:mm:ss")
                            : '-';
                    tempdatainfo['NUMBER OF LOGINS'] = healthData?.num_login || 0;
                    tempdatainfo['CREATED DATE'] = healthData?.created ? this.commonDateService.DateTimeFormat(healthData?.['created'], "MM-DD-YYYY", "YYYY-MM-DD HH:mm:ss") : '-';
                    tempdatainfo['LAST UPDATE DATE'] = healthData?.updated ? this.commonDateService.DateTimeFormat(healthData?.['updated'], "MM-DD-YYYY", "YYYY-MM-DD HH:mm:ss") : '-';
                    tempdatarows.push(tempdatainfo);
                    //second sheet data
                    let userId = healthData?.id || 0;
                    let participationData = await this.participation_report_view(userId);
                    let data = {};
                    data['USER CODE'] = healthData?.code || '';
                    data["USERNAME"] = healthData?.username || '';
                    data["FIRST NAME"] = healthData?.first_name || '';
                    data["LAST NAME"] = healthData?.last_name || '';
                    data['EMAIL'] = healthData?.email || '';
                    data['PHYSICIAN STATUS'] = participationData?.['physicianStatus'] || 'Incomplete';
                    data['PHYSICIAN FORM DATE'] = participationData?.['physicianFormDate'] || '-';
                    data['DENTAL STATUS'] = participationData?.['dentalStatus'] || 'Incomplete';
                    data['DENTAL FORM DATE'] = participationData?.['dentalFormDate'] || '-';
                    data['OPTOMETRIST STATUS'] = participationData?.['optometristStatus'] || 'Incomplete';
                    data['OPTOMETRIST FORM DATE'] = participationData?.['optometristFormDate'] || '-';
                    data['TOBACCO STATUS'] = participationData?.['tobaccoStatus'] || 'Incomplete';
                    data['TOBACCO FORM DATE'] = participationData?.['tobaccoFormDate'] || '-';
                    secondSheetData.push(data);
                }
                return { firstSheet: tempdatarows, secondSheet: secondSheetData }
            }
            return [];
        }
        return tempdatarows;
    }
    async participation_report_view(userId: number) {
        let resultDetails: { [key: string]: string | number | boolean | object } = {};
        let physicianDate = await this.biometricsService.getBiometricAdded(userId) || '';
        let dentistDate = await this.engagementService.getDentalAdded(userId) || '';
        let optometristDate = await this.engagementService.getOptometristsAdded(userId) || '';
        let tobaccoDate = await this.engagementService.getTabaccouseAdded(userId) || '';
        resultDetails['User ID'] = userId || 0;
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
        return resultDetails;
    }
}
