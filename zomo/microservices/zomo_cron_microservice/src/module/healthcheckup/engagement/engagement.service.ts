import { appConstant, AssessmentsEntity, BiometricsEntity, CommonArrayService, CommonDateService, CommonFileService, CommonHealthService, CommonService, DentistsEntity, OptometristsEntity, TobaccoUsesEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { CompanyService } from 'src/module/company/company.service';
import { UserService } from 'src/module/user/user.service';
import { EngagementReportInput } from './input/engagementreport.input';
import { ActivePluginService } from 'src/module/company';
import { In, Repository } from 'typeorm';
import { FormInstructionsService } from '../forminstructions.service';
import { InjectRepository } from '@nestjs/typeorm';
import { CronCommonService } from 'src/common';
const moment = require('moment-timezone');
const path = require('path');
@Injectable()
export class EngagementService {
    constructor(
        @InjectRepository(
            DentistsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaDentistsRepository: Repository<DentistsEntity>,
        @InjectRepository(
            OptometristsEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly readReplicaOptometristsRepository: Repository<OptometristsEntity>,
        @InjectRepository(
            TobaccoUsesEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaTobaccoUsesRepository: Repository<TobaccoUsesEntity>,
        @InjectRepository(
            AssessmentsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaAssessmentsRepository: Repository<AssessmentsEntity>,
        @InjectRepository(
            BiometricsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaBiometricsRepository: Repository<BiometricsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonService: CommonService,
        private readonly companyService: CompanyService,
        private readonly userService: UserService,
        private readonly commonHealthService: CommonHealthService,
        private readonly commonFileService: CommonFileService,
        private readonly activePluginService: ActivePluginService,
        private readonly formInstructionsService: FormInstructionsService,
        private readonly cronCommonService: CronCommonService,
        private readonly commonDateService: CommonDateService,
    ) {
    }
    // for mapping Engagement report data
    async mapEngagementData(resultDetails, requestfor: number, clmNameArr: string[] = []) {
        let tempdatarows = [];
        if (requestfor === 1) {
            let userDataList = resultDetails?.['list'] || [];
            if (Object.keys(userDataList).length === 0) {
                return { list: [], total: resultDetails['total'], pages: resultDetails['pages'], limit: resultDetails['limit'], page: resultDetails['page'] }
            }
            for (const [index, userData] of userDataList.entries()) {
                let tempdatarow = Object.create(null);
                const fullName = `${userData?.first_name} ${userData?.last_name}`;
                tempdatarow['username'] = userData?.username || '';
                tempdatarow['fullName'] = fullName;
                tempdatarow['company'] = userData?.company?.company_name || '';
                tempdatarow['PFC'] = userData?.biometrics_form_complete || 'NA';
                tempdatarow['DVFC'] = userData?.dental_form_complete || 'NA';
                tempdatarow['OFC'] = userData?.optometrist_form_complete || 'NA';
                tempdatarow['TAC'] = userData?.tobacco_form_complete || 'NA';
                tempdatarow['HRAC'] = userData?.hra_complete || 'NA';
                tempdatarow['MAR'] = userData?.met_all_requirements || 'NA';
                tempdatarows.push(tempdatarow);
            }
            return { list: tempdatarows, total: resultDetails['total'], pages: resultDetails['pages'], limit: resultDetails['limit'], page: resultDetails['page'] }
        }
        if (requestfor === 2) {
            if (Object.keys(resultDetails).length > 0) {
                for (const [index, userData] of resultDetails.entries()) {
                    let tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(userData, clmNameArr);
                    tempdatainfo['Physician Form Complete'] = userData?.biometrics_form_complete || 'NA';
                    tempdatainfo['Physician Completion Date'] = userData?.biometrics_complete_date || 'NA';
                    tempdatainfo['Dental Visit Form Complete'] = userData?.dental_form_complete || 'NA';
                    tempdatainfo['Dental Completion Date'] = userData?.dental_complete_date || 'NA';
                    tempdatainfo['Optometrist Form Complete'] = userData?.optometrist_form_complete || 'NA';
                    tempdatainfo['Optometrist Completion Date'] = userData?.optometrist_complete_date || 'NA';
                    tempdatainfo['Tobacco Affidavit Complete'] = userData?.tobacco_form_complete || 'NA';
                    tempdatainfo['Tobacco Completion Date'] = userData?.tobacco_complete_date || 'NA';
                    tempdatainfo['HRA Complete'] = userData?.hra_complete || 'NA';
                    tempdatainfo['HRA Completion Date'] = userData?.hra_complete_date || 'NA';
                    tempdatainfo['Met All Requirements'] = userData?.met_all_requirements || 'NA';
                    tempdatarows.push(tempdatainfo);
                }
                return tempdatarows
            }
            return [];
        }
        return tempdatarows;
    }
    async engagementReport(postData: EngagementReportInput) {
        try {
            let requestfor = (postData?.result_type && this.commonService.isValidNumber(postData?.result_type)) ? Number(postData?.result_type) : 0;
            requestfor = 2;
            let autoRequest = 0;
            let user = Object.create(postData?.userDetails || {}) || {};
            let org_id: number[] | number | string | string[];
            let clmNameArr: string[] = [
                'USER CODE', 'ORGANIZATION', 'DEPARTMENT', 'RELATIONSHIP ID', 'USERNAME', 'FIRST NAME', 'MIDDLE NAME', 'LAST NAME', 'JOB TITLE',
                'EMPLOYEE ID', 'GENDER', 'BIRTH DATE', 'DATE OF HIRE', 'ON HEALTH PLAN', 'HEALTH PLAN NAME', 'EMAIL', 'LOCATION', 'USER TYPE',
                'Physician Form Complete', 'Physician Completion Date', 'Dental Visit Form Complete', 'Dental Completion Date', 'Optometrist Form Complete', 'Optometrist Completion Date',
                'Tobacco Affidavit Complete', 'Tobacco Completion Date', 'HRA Complete', 'HRA Completion Date', 'Met All Requirements'
            ];

            if (autoRequest == 0) {
                org_id = postData?.org_id;
                if ([appConstant.ROLE.COACH, appConstant.ROLE.GLOBALCOACH, appConstant.ROLE.WCH, appConstant.ROLE.BROKER, appConstant.ROLE.BROKERADMIN,
                appConstant.ROLE.REGIONALADMIN].includes(user?.role_id)) {
                    org_id = postData?.org_id;
                }
            }
            let condition = `User.role_id IN (2,16) AND User.companytype_id = 3`;
            if (org_id) {
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
                if (membershipcodeArray.length > 0) {
                    condition += ` AND User.membership_code IN ('${membershipcodeArray.map(item => item.code).join("','")}')`;
                }
            }
            if (postData?.on_insurance_plan && postData?.on_insurance_plan.toLowerCase() !== 'both') {
                if (postData?.on_insurance_plan.toLowerCase() === 'yes' || postData?.on_insurance_plan.toLowerCase() === 'y') {
                    condition += ` AND (User.on_insurance_plan = 'yes' OR User.on_insurance_plan = 'y')`;
                }
                else if (postData?.on_insurance_plan.toLowerCase() === 'no' || postData?.on_insurance_plan.toLowerCase() === 'n') {
                    condition += ` AND (User.on_insurance_plan = 'no' OR User.on_insurance_plan = 'n')`;
                }
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
            if (postData?.country?.length) {
                let countryCondition = this.commonArrayService.formatInClauseCondition(postData?.country, 'Location.country');
                if (countryCondition) {
                    condition += ` AND ${countryCondition}`;
                }
            }
            if (postData?.state?.length) {
                let stateArray = this.commonArrayService.transformToArray(postData?.state, ',');
                let stateData = await this.cronCommonService.stateList('', '', stateArray);
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
            let paginate = {
                page: postData?.page || 1,
                limit: postData?.limit || appConstant.RECORD_PER_PAGE,
            }
            let fields: string[] = [
                'User.role_id', 'User.new_password', 'User.timezone', 'User.department_id', 'User.location', 'User.org_id', 'User.employeeid',
                'User.is_camp_eligible', 'User.id', 'User.username', 'User.date_of_hire', 'User.first_name', 'User.last_name', 'User.insurance_plan_name',
                'User.email', 'User.on_insurance_plan', 'User.gender', 'User.relationship_id', 'User.code', 'User.middle_name', 'User.dob', 'User.created',
                'settings.jobtitle', 'settings.wphone', 'settings.hphone',
                'company.company_name', 'department.dept_name',
                'Location.lname', 'Location.address1', 'Location.city', 'Location.state', 'Location.zip', 'Location.country',
            ]
            console.time('[Engagement report]: resultDetails user time');
            let resultDetails: any = await this.userService.userCDLSList(
                condition,
                fields,
                requestfor == 1 ? paginate : null,
                'list',
                { 'User.last_name': 'DESC' }
            );
            console.timeEnd('[Engagement report]: resultDetails user time');
            if (!resultDetails) {
                throw new Error('No record found');
            }
            const orgIdArray = (Array.isArray(org_id) ? org_id : String(org_id).split(','))
                .map(id => Number(String(id).trim()))
                .filter(id => !isNaN(id) && id > 0);
            let companyWiseVisibleSection = await this.formInstructionsService.visibleSectionAccordingToProgramCompany(orgIdArray);
            let companyActivePlugin = await this.activePluginService.list({ company_id: In(orgIdArray) }, null, ['company_id', 'plugin_name', 'id']);
            let companyWiseActivePlugin = {}
            if (companyActivePlugin && companyActivePlugin.length > 0) {
                for (const compPlugin of companyActivePlugin) {
                    let pluginName = [];
                    if (compPlugin && compPlugin.plugin_name && compPlugin.plugin_name !== null) {
                        pluginName = JSON.parse(compPlugin?.plugin_name);
                    }
                    companyWiseActivePlugin[compPlugin.company_id] = pluginName;
                }
            }
            let resultUserList = (requestfor == 1 && resultDetails?.['list']) ? resultDetails?.['list'] : resultDetails;
            const userIds = resultUserList.map(user => user.id);
            console.time('[Engagement report]: Bulk data fetch');
            const [biometricsMap, dentalMap, optometristMap, tobaccoMap, hraMap] = await Promise.all([
                this.getBulkBiometrics(userIds),
                this.getBulkDental(userIds),
                this.getBulkOptometrists(userIds),
                this.getBulkTobacco(userIds),
                this.getBulkHra(userIds)
            ]);
            console.timeEnd('[Engagement report]: Bulk data fetch');
            console.time('[Engagement report]: user loop time');
            const filteredUsers = [];
            for (const userData of resultUserList) {
                let progCount = 0;
                let pluginName = [];
                let stBio = 0, stDen = 0, stOpt = 0, stTob = 0, stHra = 0;
                let visibleSection = companyWiseVisibleSection[userData?.org_id] || [];
                if (postData?.org_id) {
                    progCount = visibleSection?.length || 0;
                    pluginName = companyWiseActivePlugin[userData?.org_id] || null;
                }
                if (progCount > 0) {
                    if (Array.isArray(visibleSection) && visibleSection.includes('1')) {
                        const bioData = biometricsMap.get(userData.id);
                        userData['biometrics_form_complete'] = bioData ? 'Yes' : 'No';
                        userData['biometrics_complete_date'] = bioData || 'NA';
                        userData['biometrics_status'] = bioData ? 1 : 0;
                        stBio = bioData ? 1 : 0;
                    } else {
                        userData['biometrics_form_complete'] = 'NA';
                        userData['biometrics_complete_date'] = 'NA';
                        userData['biometrics_status'] = 0;
                    }
                    if (Array.isArray(visibleSection) && visibleSection.includes('2')) {
                        const denData = dentalMap.get(userData.id);
                        userData['dental_form_complete'] = denData ? 'Yes' : 'No';
                        userData['dental_complete_date'] = denData || 'NA';
                        userData['dental_status'] = denData ? 1 : 0;
                        stDen = denData ? 1 : 0;
                    } else {
                        userData['dental_form_complete'] = 'NA';
                        userData['dental_complete_date'] = 'NA';
                        userData['dental_status'] = 0;
                    }
                    if (Array.isArray(visibleSection) && visibleSection.includes('3')) {
                        const optData = optometristMap.get(userData.id);
                        userData['optometrist_form_complete'] = optData ? 'Yes' : 'No';
                        userData['optometrist_complete_date'] = optData || 'NA';
                        userData['optometrist_status'] = optData ? 1 : 0;
                        stOpt = optData ? 1 : 0;
                    } else {
                        userData['optometrist_form_complete'] = 'NA';
                        userData['optometrist_complete_date'] = 'NA';
                        userData['optometrist_status'] = 0;
                    }
                    if (Array.isArray(visibleSection) && visibleSection.includes('4')) {
                        const tobData = tobaccoMap.get(userData.id);
                        userData['tobacco_form_complete'] = tobData ? 'Yes' : 'No';
                        userData['tobacco_complete_date'] = tobData || 'NA';
                        userData['tobacco_status'] = tobData ? 1 : 0;
                        stTob = tobData ? 1 : 0;
                    } else {
                        userData['tobacco_form_complete'] = 'NA';
                        userData['tobacco_complete_date'] = 'NA';
                        userData['tobacco_status'] = 0;
                    }
                } else {
                    userData['physician_form_complete'] = 'NA';
                    userData['physician_complete_date'] = 'NA';
                    userData['dental_form_complete'] = 'NA';
                    userData['dental_complete_date'] = 'NA';
                    userData['optometrist_form_complete'] = 'NA';
                    userData['optometrist_complete_date'] = 'NA';
                    userData['tobacco_form_complete'] = 'NA';
                    userData['tobacco_complete_date'] = 'NA';
                    userData['biometrics_form_complete'] = 'NA';
                    userData['biometrics_complete_date'] = 'NA';
                }
                let progHra = 0;
                if (pluginName?.['Hra']) {
                    const hraData = hraMap.get(userData.id);
                    userData['hra_complete'] = hraData ? 'Yes' : 'No';
                    userData['hra_complete_date'] = hraData || 'NA';
                    stHra = hraData ? 1 : 0;
                    progHra = 1;
                } else {
                    userData['hra_complete'] = 'NA';
                    userData['hra_complete_date'] = 'NA';
                    progHra = 0;
                    stHra = 0;
                }
                let countProg = stBio + stDen + stOpt + stTob + stHra;
                let countTotalProg = progCount + progHra;
                if (countTotalProg > 0) {
                    userData['met_all_requirements'] = (countProg == countTotalProg) ? 'Yes' : 'No';
                } else {
                    userData['met_all_requirements'] = 'NA';
                }
                if (postData?.report_type) {
                    let P = 0, D = 0, O = 0, T = 0, H = 0;
                    if (progCount > 0) {
                        if (visibleSection.includes('1')) P = userData['biometrics_form_complete'] === 'Yes' ? 1 : 0;
                        if (visibleSection.includes('2')) D = userData['dental_form_complete'] === 'Yes' ? 1 : 0;
                        if (visibleSection.includes('3')) O = userData['optometrist_form_complete'] === 'Yes' ? 1 : 0;
                        if (visibleSection.includes('4')) T = userData['tobacco_form_complete'] === 'Yes' ? 1 : 0;
                    }
                    if (pluginName?.['Hra']) {
                        H = userData['hra_complete'] === 'Yes' ? 1 : 0;
                    }
                    const All = P + D + O + H + T;
                    const Rname = postData.report_type;
                    let shouldInclude = false;
                    switch (Rname) {
                        case 'DR':
                            shouldInclude = true;
                            break;
                        case 'QR':
                            shouldInclude = userData['met_all_requirements'] === 'Yes';
                            break;
                        case 'NR':
                            shouldInclude = (All === 0) && (userData['met_all_requirements'] === 'No');
                            break;
                        case 'OR':
                            shouldInclude = (All >= 1) && (userData['met_all_requirements'] === 'No');
                            break;
                        default:
                            shouldInclude = false;
                            break;
                    }
                    if (shouldInclude) {
                        filteredUsers.push(userData);
                    }
                } else {
                    filteredUsers.push(userData);
                }
            }
            console.timeEnd('[Engagement report]: user loop time');
            console.time('[Engagement report]: result process time');
            const finalResults = postData?.report_type ? filteredUsers : resultUserList;
            if (finalResults.length === 0) {
                throw new Error('No record found');
            }
            resultDetails = await this.mapEngagementData(finalResults, requestfor, clmNameArr);
            if (requestfor == 2) {
                resultDetails = await this.engagementReportXLSXs(resultDetails, clmNameArr, postData?.report_type);
            }
            console.timeEnd('[Engagement report]: result process time');
            return resultDetails;
        }
        catch (error) {
            console.log('error:', error);
            return {
                success: 0,
                message: error.message,
                error: 1,
            };
        }
    }
    async engagementReportXLSXs(resultDetails, clmNameArr: string[], reportType: string): Promise<{ file_data: string, file_name: string, extension: string }> {
        let directory = path.join(appConstant.COMPANY_HEALTH_ENGAGEMENT_REPORT);
        let fileName = `EngagementDetailReport_${moment().format('MMDDYYYY_HHmmss')}.json`;
        if (reportType && reportType != '') {
            if (reportType === 'DR') {
                fileName = `EngagementDetailReport_${moment().format('MMDDYYYY_HHmmss')}.json`;
            } else if (reportType === 'QR') {
                fileName = `IncentiveQualificationReport_${moment().format('MMDDYYYY_HHmmss')}.json`;
            } else if (reportType === 'NR') {
                fileName = `NonParticipentReport_${moment().format('MMDDYYYY_HHmmss')}.json`;
            } else if (reportType === 'OR') {
                fileName = `OpportunityReport_${moment().format('MMDDYYYY_HHmmss')}.json`;
            }
        }
        let filePath = path.join(directory, fileName);
        const finalCsvData = [
            clmNameArr,
            ...resultDetails.map(row => clmNameArr.map(key => {
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
        const csvResult: any = await this.commonFileService.createJsonToFile(1, filePath, 'pythoncreatecsv.py');
        if (csvResult?.status !== 'success') {
            throw new Error('CSV conversion failed');
        }
        const fileData = await this.commonFileService.FileToBase64(`${filePath}`.replace('.json', '.csv'));
        fileName = fileName.replace('.json', '');
        await this.commonFileService.removeFileFromLocal(`${filePath}`);
        filePath = `${filePath}`.replace('.json', '.csv');
        await this.commonFileService.removeFileFromLocal(`${filePath}`);
        return { file_data: this.commonService.passwordEncrypt(fileData), file_name: fileName, extension: 'csv' };
    }
    // get bulk biometrics completion date user wise
    async getBulkBiometrics(userIds: number[]): Promise<Map<number, string>> {
        if (!userIds.length) return new Map();
        const nonEmptyCondition = `(
            biometrics.alc != '' OR biometrics.bmi != '' OR 
            biometrics.systolic != '' OR biometrics.diastolic != '' OR 
            biometrics.total_cholesterol != '' OR biometrics.hdl != '' OR 
            biometrics.ldl != '' OR biometrics.triglycerides != '' OR 
            biometrics.blood_glucose != ''
        )`;
        const results = await this.readReplicaBiometricsRepository
            .createQueryBuilder('biometrics')
            .select(['biometrics.user_id', 'biometrics.created'])
            .where(`biometrics.user_id IN (${userIds.join(',')})`)
            .andWhere('biometrics.status != 2')
            .andWhere(nonEmptyCondition)
            .orderBy('biometrics.created', 'DESC')
            .getMany();
        const map = new Map<number, string>();
        for (const result of results) {
            if (!map.has(result.user_id) && result.created) {
                const formatted = await this.commonDateService.DateTimeFormat(result.created, 'MM-DD-YYYY', 'YYYY-MM-DD HH:mm:ss');
                map.set(result.user_id, formatted);
            }
        }
        return map;
    }
    // get bulk dental completion date user wise
    async getBulkDental(userIds: number[]): Promise<Map<number, string>> {
        if (!userIds.length) return new Map();
        const results = await this.readReplicaDentistsRepository
            .createQueryBuilder('dental')
            .select(['dental.userid', 'dental.date_completed'])
            .where(`dental.userid IN (${userIds.join(',')})`)
            .orderBy('dental.date_completed', 'DESC')
            .getMany();
        const map = new Map<number, string>();
        for (const result of results) {
            if (!map.has(result.userid) && result.date_completed) {
                const formatted = await this.commonDateService.DateTimeFormat(result.date_completed, 'MM-DD-YYYY', 'YYYY-MM-DD HH:mm:ss')
                map.set(result.userid, formatted);
            }
        }
        return map;
    }
    // get bulk optometrist completion date user wise
    async getBulkOptometrists(userIds: number[]): Promise<Map<number, string>> {
        if (!userIds.length) return new Map();
        const results = await this.readReplicaOptometristsRepository
            .createQueryBuilder('optometrist')
            .select(['optometrist.userid', 'optometrist.date_completed'])
            .where(`optometrist.userid IN (${userIds.join(',')})`)
            .orderBy('optometrist.date_completed', 'DESC')
            .getMany();
        const map = new Map<number, string>();
        for (const result of results) {
            if (!map.has(result.userid) && result.date_completed) {
                const formatted = await this.commonDateService.DateTimeFormat(result.date_completed, 'MM-DD-YYYY', 'YYYY-MM-DD HH:mm:ss')
                map.set(result.userid, formatted);
            }
        }
        return map;
    }
    // get bulk tobacco completion date user wise
    async getBulkTobacco(userIds: number[]): Promise<Map<number, string>> {
        if (!userIds.length) return new Map();
        const results = await this.readReplicaTobaccoUsesRepository
            .createQueryBuilder('tobacco')
            .select(['tobacco.user_id', 'tobacco.date_completed'])
            .where(`tobacco.user_id IN (${userIds.join(',')})`)
            .andWhere("tobacco.type_of_form = 'Tabacco'")
            .orderBy('tobacco.date_completed', 'DESC')
            .getMany();
        const map = new Map<number, string>();
        for (const result of results) {
            if (!map.has(result.user_id) && result.date_completed) {
                const formatted = await this.commonDateService.DateTimeFormat(result.date_completed, 'MM-DD-YYYY', 'YYYY-MM-DD HH:mm:ss')
                map.set(result.user_id, formatted);
            }
        }
        return map;
    }
    // get bulk hra completion date user wise
    async getBulkHra(userIds: number[]): Promise<Map<number, string>> {
        if (!userIds.length) return new Map();
        const results = await this.readReplicaAssessmentsRepository
            .createQueryBuilder('hra')
            .select(['hra.user_id', 'hra.date'])
            .where(`hra.user_id IN (${userIds.join(',')})`)
            .andWhere('hra.status != 2')
            .andWhere('hra.hra_status = 100')
            .orderBy('hra.date', 'DESC')
            .getMany();
        const map = new Map<number, string>();
        for (const result of results) {
            if (!map.has(result.user_id) && result.date) {
                const formatted = await this.commonDateService.DateTimeFormat(result.date, 'MM-DD-YYYY', 'YYYY-MM-DD HH:mm:ss')
                map.set(result.user_id, formatted);
            }
        }
        return map;
    }
    // get dental completion date for a user (hippa report)
    async getDentalAdded(userId: number, fields: any = [
        'dental.id AS dental_id', 'dental.userid AS dental_userid', 'dental.date_completed AS dental_date_completed',
    ]) {
        const result = await this.readReplicaDentistsRepository.createQueryBuilder('dental')
            .where(`dental.userid = ${userId}`)
            .orderBy('dental.date_completed', 'DESC')
            .limit(1)
            .select(fields)
            .getRawOne();
        if (result && result.dental_date_completed) {
            return `${await this.commonDateService.DateTimeFormat(result.dental_date_completed, 'MM-DD-YYYY', 'YYYY-MM-DD HH:mm:ss')}`;
        }
        return '';
    }
    // get optometrist completion date for a user (hippa report)
    async getOptometristsAdded(userId: number, fields: any = [
        'optometrist.id AS optometrist_id', 'optometrist.userid AS optometrist_userid', 'optometrist.date_completed AS optometrist_date_completed',
    ]) {
        const result = await this.readReplicaOptometristsRepository.createQueryBuilder('optometrist')
            .where(`optometrist.userid = ${userId}`)
            .orderBy('optometrist.date_completed', 'DESC')
            .select(fields)
            .limit(1)
            .getRawOne();
        if (result && result.optometrist_date_completed) {
            return `${await this.commonDateService.DateTimeFormat(result.optometrist_date_completed, 'MM-DD-YYYY', 'YYYY-MM-DD HH:mm:ss')}`;
        }
        return '';
    }
    // get tobacco completion date for a user (hippa report)
    async getTabaccouseAdded(userId: number, fields: any = [
        'tobacco.id AS tobacco_id', 'tobacco.user_id AS tobacco_user_id', 'tobacco.date_completed AS tobacco_date_completed'
    ]) {
        const result = await this.readReplicaTobaccoUsesRepository.createQueryBuilder('tobacco')
            .where(`tobacco.user_id = ${userId} AND tobacco.type_of_form = 'Tabacco' `)
            .orderBy('tobacco.date_completed', 'DESC')
            .select(fields)
            .limit(1)
            .getRawOne();
        if (result && result.tobacco_date_completed) {
            return `${await this.commonDateService.DateTimeFormat(result.tobacco_date_completed, 'MM-DD-YYYY', 'YYYY-MM-DD HH:mm:ss')}`;
        }
        return '';
    }
}
