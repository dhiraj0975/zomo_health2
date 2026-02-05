import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    emotionalwellbeingReportsEntity,
    tableConstant,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { lastValueFrom } from 'rxjs';
import { CompanyService } from 'src/module/company/company.service';
import { Repository } from 'typeorm';
import { WellBeingPostClickService } from '../well-being-post-click/well-being-post-click.service';
import { EwdReportInput } from './input/ewdreport.input';
import { CronCommonService } from 'src/common';
const moment = require('moment-timezone');
const path = require('path');
const argon2 = require('argon2');
@Injectable()
export class WellbeingReportService extends BaseService<emotionalwellbeingReportsEntity> {
    constructor(
        @InjectRepository(emotionalwellbeingReportsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaWellbeingReportRepository: Repository<emotionalwellbeingReportsEntity>,
        @InjectRepository(emotionalwellbeingReportsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaWellbeingReportRepository: Repository<emotionalwellbeingReportsEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonHealthService: CommonHealthService,
        private readonly commonService: CommonService,
        private readonly companyService: CompanyService,
        private readonly commonFileService: CommonFileService,
        private readonly wellBeingPostClickService: WellBeingPostClickService,
        private readonly commonDateService: CommonDateService,
        private readonly cronCommonService: CronCommonService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
    ) {
        super(
            readReplicaWellbeingReportRepository,
            writeReplicaWellbeingReportRepository,
            'emotionalWellBeingReports',
            commonArrayService,
        );
    }
    async updateReport() {
        const result = await this.readReplicaWellbeingReportRepository
            .createQueryBuilder('wellbeingReport')
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
        const mainQuery = this.writeReplicaWellbeingReportRepository
            .createQueryBuilder()
            .update()
            .set({
                total_download: () => 'total_download + 1',
                status: 0,
            })
            .where('id = :id', { id: idToUpdate });
        await mainQuery.execute();
    }
    async findOne(condition: any) {
        return await this.readReplicaWellbeingReportRepository
            .createQueryBuilder('wellbeingReport')
            .leftJoinAndMapOne(
                'wellbeingReport.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = wellbeingReport.org_id`,
            )
            .where(condition)
            .limit(1)
            .orderBy('wellbeingReport.request_date', 'ASC')
            .getOne();
    }
    async update(data) {
        const savedResult =
            this.writeReplicaWellbeingReportRepository.create(data);
        return await this.writeReplicaWellbeingReportRepository.save(
            savedResult,
        );
    }
    async save(data: any) {
        const savedResult = this.writeReplicaWellbeingReportRepository.create(data);
        return await this.writeReplicaWellbeingReportRepository.save(savedResult);
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        const queryBuilder = this.readReplicaWellbeingReportRepository
            .createQueryBuilder()
            .where(condition)
            .orderBy(orderBy);
        const result = await queryBuilder.getMany();
        return result;
    }
    async findWithAutoSetting(condition: any, fields: any = null) {
        const queryBuilder = this.readReplicaWellbeingReportRepository
            .createQueryBuilder('wellbeingReport')
            .innerJoinAndMapOne(
                'wellbeingReport.automaticreportSetting',
                tableConstant.REPORT.TBL_AU_AUTO_REPORT_SETTINGS,
                'automaticreportSetting',
                `automaticreportSetting.id = wellbeingReport.report_setting_id`,
            )
            .where(condition);
        if (fields !== null) {
            queryBuilder.select(fields);
        }
        const result = await queryBuilder.getMany();
        return result;
    }
    /**
     * Function of micro service for creating EWB-report
     * For auto request
     */
    async ewbReport(postData: EwdReportInput) {
        try {
            let autoRequestId: number = 0;
            let requestfor = (postData?.result_type && this.commonService.isValidNumber(postData?.result_type)) ? Number(postData?.result_type) : 0
            let autoRequest = (postData?.auto_request && this.commonService.isValidNumber(postData?.auto_request)) ? Number(postData?.auto_request) : 0
            let user = Object.create(postData?.userDetails || {}) || {};
            if (autoRequest == 1) {
                autoRequestId = postData?.auto_request_id;
                requestfor = 2;
            }
            let clmNameArr = [
                'USER CODE', 'ORGANIZATION', 'DEPARTMENT', 'FIRST NAME', 'MIDDLE NAME', 'LAST NAME', 'ROLE TYPE', 'JOB TITLE', 'ON HEALTH PLAN', 'HEALTH PLAN NAME',
                'DATE OF HIRE', 'EMAIL', 'WORK PHONE NUMBER', 'HOME PHONE NUMBER', 'LOCATION', 'WORK ADDRESS1', 'WORK ADDRESS2', 'WORK CITY', 'WORK STATE/PROVINCE',
                'WORK ZIP/POSTAL CODE', 'WORK COUNTRY', 'TITLE', 'DATE', 'TIME',
            ];
            let membershipcode: string;
            let org_id: number, report_id: number;
            let reportRequest;
            let companyid: number;
            let report_setting_id: number, report_fields: string, user_id: number, zipPassword: string;
            if (autoRequest === 1) {
                await this.updateReport();
                reportRequest = await this.findOne(
                    `wellbeingReport.status = 0 AND company.status = 1 AND company.deleted  = 0 ${(autoRequestId && autoRequestId !== 0 && autoRequestId !== undefined) ? ' AND wellbeingReport.id = ' + autoRequestId : ''}`,
                );
                if (reportRequest) {
                    report_setting_id = reportRequest?.report_setting_id;
                    report_id = reportRequest?.id;
                    report_fields = reportRequest?.report_fields;
                    org_id = reportRequest?.org_id;
                    user_id = reportRequest?.user_id;
                    membershipcode = reportRequest?.membership_code;
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
            if (postData?.type == 'superadmin') {
                user.org_id = postData?.org_id
                org_id = postData?.org_id
                companyid = postData?.org_id
                user.membership_code = postData?.membership_code
                user.role_id = 1
                membershipcode = postData?.membership_code
            }
            let filterCondition = 'User.username IS NOT null';
            let filterConditionInner = 'emotionalwellbeingpostclick.user_id = User.id';
            if (autoRequest === 1) {
                const startDate = reportRequest['start_date_range'];
                const endDate = reportRequest['end_date_range'];
                if (
                    startDate &&
                    endDate &&
                    startDate !== '' &&
                    endDate !== ''
                ) {
                    const formattedStartDate = moment(
                        startDate,
                        'YYYY-MM-DD HH:mm:ss',
                    ).format('YYYY-MM-DD');
                    const formattedEndDate = moment(
                        endDate,
                        'YYYY-MM-DD HH:mm:ss',
                    ).format('YYYY-MM-DD');
                    filterConditionInner += ` AND (DATE_FORMAT(emotionalwellbeingpostclick.created_date, '%Y-%m-%d') BETWEEN '${formattedStartDate}' AND '${formattedEndDate}')`;
                } else if (startDate && startDate !== '') {
                    const formattedStartDate = moment(
                        startDate,
                        'YYYY-MM-DD HH:mm:ss',
                    ).format('YYYY-MM-DD');
                    filterConditionInner += ` AND DATE_FORMAT(emotionalwellbeingpostclick.created_date, '%Y-%m-%d') >= '${formattedStartDate}'`;
                } else if (endDate && endDate !== '') {
                    const formattedEndDate = moment(
                        endDate,
                        'YYYY-MM-DD HH:mm:ss',
                    ).format('YYYY-MM-DD');
                    filterConditionInner += ` AND DATE_FORMAT(emotionalwellbeingpostclick.created_date, '%Y-%m-%d') <= '${formattedEndDate}'`;
                }
                if (reportRequest['condition']) {
                    filterCondition += ` AND ${reportRequest['condition']}`;
                }
            } else {
                filterCondition += ` AND User.role_id IN (2,16) AND User.membership_code = '${membershipcode}'`
                if (postData?.show_terminated_users?.toString() === '2') {
                    filterCondition += ' AND User.status = 1';
                }
                if (postData?.start_date && postData?.end_date) {
                    filterConditionInner += ` AND DATE_FORMAT(CONVERT_TZ(emotionalwellbeingpostclick.created_date, "UTC", CASE WHEN User.timezone != "" THEN User.timezone ELSE "UTC" END), "%Y-%m-%d") >= '${this.commonDateService.DateTimeFormat(postData?.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                    filterConditionInner += ` AND DATE_FORMAT(CONVERT_TZ(emotionalwellbeingpostclick.created_date, "UTC", CASE WHEN User.timezone != "" THEN User.timezone ELSE "UTC" END), "%Y-%m-%d") <= '${this.commonDateService.DateTimeFormat(postData?.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                } else if (postData?.start_date) {
                    filterConditionInner += ` AND DATE_FORMAT(CONVERT_TZ(emotionalwellbeingpostclick.created_date, "UTC", CASE WHEN User.timezone != "" THEN User.timezone ELSE "UTC" END), "%Y-%m-%d") >= '${this.commonDateService.DateTimeFormat(postData?.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                } else if (postData?.end_date) {
                    filterConditionInner += ` AND DATE_FORMAT(CONVERT_TZ(emotionalwellbeingpostclick.created_date, "UTC", CASE WHEN User.timezone != "" THEN User.timezone ELSE "UTC" END), "%Y-%m-%d") <= '${this.commonDateService.DateTimeFormat(postData?.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                }
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
                if (requestfor === 1) {
                    if (postData?.search_str) {
                        const search = postData?.search_str.toLowerCase();
                        if (moment(postData?.search_str, 'll', true).isValid()) {
                            filterCondition += ` AND emotionalwellbeingpostclick.created_date LIKE '%${moment(postData?.search_str, 'll', true).isValid() ? moment(postData?.search_str, 'll').format('YYYY-MM-DD') : ''}%'`
                        } else {
                            filterCondition += ` AND (LOWER(User.first_name) LIKE '%${search}%' OR LOWER(User.last_name) LIKE '%${search}%' OR LOWER(CONCAT(User.first_name, ' ', User.last_name)) LIKE '%${search}%' OR (User.code) LIKE '%${search}%' OR (emotionalwellbeingpost.title) LIKE '%${search}%')`;
                        }
                    }
                }
            }
            let paginate = {
                page: postData?.page || 1,
                limit: postData?.limit || appConstant.RECORD_PER_PAGE,
            }
            let resultDetails = await this.wellBeingPostClickService.ewdReports(filterCondition, filterConditionInner, requestfor === 1 ? paginate : null);
            if (resultDetails) {
                clmNameArr.push('TITLE', 'DATE', 'TIME');
                resultDetails = await this.mapEwbData(resultDetails, requestfor, clmNameArr);
                if (requestfor === 2 && autoRequest == 0) {
                    resultDetails = await this.ewbReportXLSX(resultDetails, org_id, clmNameArr);
                }
                if (autoRequest == 1) {
                    resultDetails = await this.ewbReportZip(resultDetails, org_id, clmNameArr, report_id, zipPassword);
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
                    await this.update(
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
    async mapEwbData(resultDetails: any, requestfor: number, clmNameArr: string[] = []) {
        let tempdatarows = [];
        if (requestfor === 1) {
            let ewbDataList = resultDetails?.['list'] || [];
            if (Object.keys(ewbDataList).length === 0) {
                return { list: [], total: resultDetails['total'], pages: resultDetails['pages'], limit: resultDetails['limit'], page: resultDetails['page'] }
            }
            for (const [index, ewbData] of ewbDataList.entries()) {
                let tempdatarow = Object.create(null);
                tempdatarow['name'] = ewbData?.User?.first_name + ' ' + ewbData?.User?.last_name;
                tempdatarow['code'] = ewbData?.User?.code || '';
                tempdatarow['title'] = ewbData?.emotionalwellbeingpost?.title || '';
                const createdTimeUTC = ewbData?.created_date;
                const userTimezone = ewbData?.User?.timezone || 'UTC';
                const convertedTime = moment.utc(createdTimeUTC).tz(userTimezone);
                tempdatarow['date'] = (convertedTime.format('ll')) || '';
                tempdatarow['time'] = (convertedTime.format('hh:mm:ss A')) || '';
                tempdatarows.push(tempdatarow);
            }
            return { list: tempdatarows, total: resultDetails['total'], pages: resultDetails['pages'], limit: resultDetails['limit'], page: resultDetails['page'] }
        }
        if (requestfor === 2) {
            if (Object.keys(resultDetails).length > 0) {
                for (const [index, ewbData] of resultDetails.entries()) {
                    let tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(
                        ewbData.User,
                        clmNameArr,
                    );
                    tempdatainfo['TITLE'] = ewbData?.emotionalwellbeingpost?.title || '';
                    if (ewbData?.id && ewbData?.id !== '') {
                        const createdTimeUTC = ewbData?.created_date || '';
                        const userTimezone = ewbData?.User?.timezone || 'UTC';
                        const convertedTime = moment.utc(createdTimeUTC).tz(userTimezone);
                        tempdatainfo['DATE'] = (convertedTime.isValid() ? convertedTime.format('MM-DD-YYYY') : '') || '01-01-1970';
                        tempdatainfo['TIME'] = (convertedTime.isValid() ? convertedTime.format('hh:mm:ss A') : '') || '12:00:00 AM';
                    } else {
                        tempdatainfo['DATE'] = ''
                        tempdatainfo['TIME'] = ''
                    }
                    tempdatarows.push(tempdatainfo)
                }
            }
        }
        return tempdatarows;
    }
    async ewbReportXLSX(resultDetails: any, org_id: number, clmNameArr: any): Promise<{ file_data: string, file_name: string, extension: string }> {
        try {
            let directory = path.join(appConstant.COMPANY_EWB_REPORT, this.commonFileService.sanitizeFileName(org_id));
            let fileName = `${org_id}_EWB_Report_${moment().format("MMDDYYYY_HHmmss")}.json`
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
    async ewbReportZip(resultDetails: any, org_id: number, clmNameArr: any, reportId: number, zipPassword: string): Promise<string> {
        try {
            let directory = path.join(appConstant.COMPANY_EWB_REPORT, this.commonFileService.sanitizeFileName(org_id));
            let fileName = `${org_id}_${reportId}_EWB_Report_${moment().format("MMDDYYYY_HHmmss")}.json`
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
                            let zipPath = `automatic_report/emotional_well_being_reports/${reportId}/Emotional_Well_Being_report.zip`;
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
                            await this.update(resultData);
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
}
