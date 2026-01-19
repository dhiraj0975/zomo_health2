import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    MediaFitnessVideoClickEntity,
    tableConstant,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { lastValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { CompanyService } from '../company/company.service';
import { MediaFitnessVideoReportService } from './mediafitnessvideoreport.service';
import { FodReportInput } from './input/fodreport.input';
const moment = require('moment-timezone');
const path = require('path');
const argon2 = require('argon2');
@Injectable()
export class FitnessVideoClickService extends BaseService<MediaFitnessVideoClickEntity> {
    constructor(
        @InjectRepository(
            MediaFitnessVideoClickEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaFitnessVideoClickRepository: Repository<MediaFitnessVideoClickEntity>,
        @InjectRepository(
            MediaFitnessVideoClickEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaFitnessVideoClickRepository: Repository<MediaFitnessVideoClickEntity>,
        private readonly commonService: CommonService,
        commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
        private readonly companyServices: CompanyService,
        private readonly mediaFitnessVideoReportService: MediaFitnessVideoReportService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
    ) {
        super(
            readReplicaFitnessVideoClickRepository,
            writeReplicaFitnessVideoClickRepository,
            'videoClick',
            commonArrayService,
        );
    }
    async findOne(condition: any) {
        return await this.readReplicaFitnessVideoClickRepository.findOne({
            where: condition,
        });
    }
    async listRecord(
        condition: any,
        orderBy: any = null,
        fields: any = ['fitness.*'],
    ) {
        if (!orderBy) {
            orderBy = { 'fitness.id': 'DESC' };
        }
        return await this.readReplicaFitnessVideoClickRepository
            .createQueryBuilder('fitness')
            .where(condition)
            .select(fields)
            .orderBy(
                `${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .getRawMany();
    }
    async save(data: any) {
        const savedResult =
            this.writeReplicaFitnessVideoClickRepository.create(data);
        return await this.writeReplicaFitnessVideoClickRepository.insert(
            savedResult,
        );
    }
    async update(condition: any, data: any) {
        return await this.writeReplicaFitnessVideoClickRepository
            .createQueryBuilder('fitness')
            .update(MediaFitnessVideoClickEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaFitnessVideoClickRepository.delete(condition);
    }
    /**
     * Function of micro service for creating FOD-report
     * For auto request
     */
    async fitnessFodReport(postData: FodReportInput) {
        try {
            let autoRequestId: number = 0;
            let requestfor = (postData?.result_type && this.commonService.isValidNumber(postData?.result_type)) ? Number(postData?.result_type) : 0;
            let autoRequest = (postData?.auto_request && this.commonService.isValidNumber(postData?.auto_request)) ? Number(postData?.auto_request) : 0;
            let user = Object.create(postData?.userDetails || {}) || {};
            if (autoRequest === 1) {
                autoRequestId = postData?.auto_request_id;
                requestfor = 2;
            }
            let clmNameArr = ['USER CODE', 'EMPLOYEE ID', 'FIRST NAME', 'LAST NAME', 'EMAIL', 'TITLE', 'DATE'];
            let reportRequest;
            let membershipcode: string = '';
            let org_id: number, report_id: number;
            let companyid: number;
            let report_setting_id: number, report_fields: string, user_id: number, zipPassword: string;
            if (autoRequest === 0) {
                org_id = user.org_id
                membershipcode = user.membership_code
                companyid = user.org_id
                if (postData?.type == 'superadmin') {
                    org_id = postData?.org_id
                    membershipcode = postData?.membership_code
                    companyid = postData?.org_id
                }
                if ([appConstant.ROLE.COACH, appConstant.ROLE.GLOBALCOACH, appConstant.ROLE.WCH, appConstant.ROLE.BROKER, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(user?.role_id)) {
                    org_id = postData?.org_id
                    membershipcode = postData?.membership_code
                    companyid = postData?.org_id
                }
            }
            if (autoRequest === 1) {
                await this.mediaFitnessVideoReportService.updateReport();
                reportRequest =
                    await this.mediaFitnessVideoReportService.findOne(
                        `fodReport.status = 0 AND company.status = 1 AND company.deleted  = 0 ${(autoRequestId && autoRequestId !== 0 && autoRequestId !== undefined) ? ' AND fodReport.id = ' + autoRequestId : ''}`,
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
                        await this.companyServices.getCompanyZipPassword(
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
                    throw new Error('Not found');
                }
            }
            let condition = 'User.username IS NOT null ';
            if (autoRequest === 1) {
                condition += ` AND ${reportRequest['condition']}`;
                condition += ` AND mediafodVideo.org_id IN (${org_id},0)`;
                if (reportRequest['camp_id'] && reportRequest['camp_id'] !== '' && reportRequest?.['camp_id']?.toString() !== '0') {
                    if (reportRequest['camp_id'] !== '') {
                        let filter_doc_ids = reportRequest['camp_id'];
                        if (filter_doc_ids) {
                            condition += ` AND mediafodVideo.id IN (${filter_doc_ids})`;
                        }
                    }
                }
                if (reportRequest?.['start_date_range'] && reportRequest?.['end_date_range'] && reportRequest['start_date_range'] !== '' && reportRequest['end_date_range'] !== '') {
                    const startDate = this.commonDateService.DateTimeFormat(reportRequest['start_date_range'], 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD');
                    const endDate = this.commonDateService.DateTimeFormat(reportRequest['end_date_range'], 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD');
                    condition += ` AND (DATE_FORMAT(mediafodvideoClick.created, '%Y-%m-%d') BETWEEN '${startDate}' AND '${endDate}')`;
                } else if (reportRequest?.['start_date_range'] && reportRequest['start_date_range'] !== '') {
                    const startDate = this.commonDateService.DateTimeFormat(reportRequest['start_date_range'], 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD');
                    condition += ` AND (DATE_FORMAT(mediafodvideoClick.created, '%Y-%m-%d') >= '${startDate}')`;
                } else if (reportRequest?.['end_date_range'] && reportRequest['end_date_range'] !== '') {
                    const endDate = this.commonDateService.DateTimeFormat(reportRequest['end_date_range'], 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD');
                    condition += ` AND (DATE_FORMAT(mediafodvideoClick.created, '%Y-%m-%d') <= '${endDate}')`;
                }
            }
            if (autoRequest === 0) {
                condition += ` AND User.role_id IN (2,16) AND User.membership_code IN('${membershipcode}') AND mediafodVideo.org_id IN (${companyid},0)`;
                if (postData?.show_terminated_users?.toString() === '2') {
                    condition += ' AND User.status = 1';
                }
                if (postData?.v_id?.length) {
                    let vCondition = this.commonArrayService.formatInClauseCondition(postData?.v_id, 'mediafodVideo.id');
                    if (vCondition) {
                        condition += ` AND ${vCondition}`;
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
                if (postData?.start_date && postData?.end_date) {
                    const startDate = this.commonDateService.DateTimeFormat(postData?.start_date, "YYYY-MM-DD", "DD-MM-YYYY");
                    const endDate = this.commonDateService.DateTimeFormat(postData?.end_date, "YYYY-MM-DD", "DD-MM-YYYY");
                    condition += ` AND (DATE_FORMAT(mediafodvideoClick.created, '%Y-%m-%d') BETWEEN '${startDate}' AND '${endDate}')`;
                }
                else if (postData?.start_date) {
                    const startDate = this.commonDateService.DateTimeFormat(postData?.start_date, "YYYY-MM-DD", "DD-MM-YYYY");
                    condition += ` AND (DATE_FORMAT(mediafodvideoClick.created, '%Y-%m-%d') >= '${startDate}')`;
                } else if (postData?.end_date) {
                    const endDate = this.commonDateService.DateTimeFormat(postData?.end_date, "YYYY-MM-DD", "DD-MM-YYYY");
                    condition += ` AND (DATE_FORMAT(mediafodvideoClick.created, '%Y-%m-%d') <= '${endDate}')`;
                }
                if (requestfor === 1) {
                    if (postData?.search_str) {
                        const search = postData?.search_str.toLowerCase();
                        if (moment(postData?.search_str, 'll', true).isValid()) {
                            condition += ` AND mediafodvideoClick.created LIKE '%${moment(postData?.search_str, 'll', true).isValid() ? moment(postData?.search_str, 'll').format('YYYY-MM-DD') : ''}%'`
                        } else {
                            condition += ` AND (LOWER(User.first_name) LIKE '%${search}%' OR LOWER(User.last_name) LIKE '%${search}%' OR LOWER(CONCAT(User.first_name, ' ', User.last_name)) LIKE '%${search}%' OR (User.code) LIKE '%${search}%' OR (User.employeeid) LIKE '%${search}%' OR (User.email) LIKE '%${search}%' OR (mediafodVideo.name) LIKE '%${search}%')`;
                        }
                    }
                }
            }
            let paginate = {
                page: postData?.page || 1,
                limit: postData?.limit || appConstant.RECORD_PER_PAGE,
            }
            let resultDetails = await this.fodReportData(
                [
                    'User.email',
                    'User.last_name',
                    'User.first_name',
                    'User.employeeid',
                    'User.code',
                    'User.id',
                    'mediafodvideoClick.created',
                    'mediafodvideoClick.id',
                    'mediafodvideoClick.user_id',
                    'mediafodVideo.name',
                    'mediafodVideo.id',
                ],
                condition,
                requestfor === 1 ? paginate : null,
            );
            if (resultDetails) {
                resultDetails = await this.mapFodData(resultDetails, requestfor);
                if (requestfor === 2 && autoRequest == 0) {
                    resultDetails = await this.fodReportXLSX(resultDetails, org_id, clmNameArr);
                }
                if (autoRequest == 1) {
                    resultDetails = await this.fodReportZip(resultDetails, org_id, clmNameArr, report_id, zipPassword);
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
                    await this.mediaFitnessVideoReportService.update(
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
    async fodReportData(
        fields: any = ['mediafodvideoClick.*'],
        condition: any,
        paginationParam: any = null,
        orderBy: any = null,
    ) {
        try {
            if (!orderBy) {
                orderBy = { 'mediafodvideoClick.id': 'DESC' };
            }
            let paginateObj;
            if (paginationParam !== null) {
                paginateObj =
                    paginationParam !== null
                        ? this.commonArrayService.getPaginationVar(
                            paginationParam.page || 1,
                            paginationParam.limit,
                        )
                        : '';
            }
            let data = this.readReplicaFitnessVideoClickRepository
                .createQueryBuilder('mediafodvideoClick')
                .innerJoinAndMapOne(
                    'mediafodvideoClick.User',
                    tableConstant.TBL_USERS,
                    'User',
                    `User.id = mediafodvideoClick.user_id`,
                )
                .innerJoinAndMapOne(
                    'mediafodvideoClick.mediafodVideo',
                    tableConstant.REPORT.TBL_ME_FOD_VIDEOS,
                    'mediafodVideo',
                    `mediafodVideo.id = mediafodvideoClick.v_id`,
                )
                .where(condition)
                .select(fields);
            //.orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            let resultData;
            if (paginationParam === null) {
                resultData = await data.getMany();
            } else {
                let finalData = await data
                    .take(paginateObj.take)
                    .skip(paginateObj.skip)
                    .getManyAndCount();
                const [result, total] = finalData;
                resultData = this.commonArrayService.paginationResponse(
                    result,
                    total,
                    paginateObj,
                );
            }
            return resultData;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async mapFodData(resultDetails: any, requestfor: number) {
        let tempdatarows = [];
        if (requestfor === 1) {
            let fodDataList = resultDetails?.['list'] || [];
            if (Object.keys(fodDataList).length === 0) {
                return { list: [], total: resultDetails['total'], pages: resultDetails['pages'], limit: resultDetails['limit'], page: resultDetails['page'] }
            }
            for (const [index, fodData] of fodDataList.entries()) {
                let tempdatarow = Object.create(null);
                tempdatarow['code'] = fodData?.User?.code || '';
                tempdatarow['employeeid'] = fodData?.User?.employeeid || '';
                tempdatarow['first_name'] = fodData?.User?.first_name || '';
                tempdatarow['last_name'] = fodData?.User?.last_name || '';
                tempdatarow['email'] = fodData?.User?.email || '';
                tempdatarow['title'] = fodData?.mediafodVideo?.name || '';
                tempdatarow['created'] = fodData?.created ? this.commonDateService.DateTimeFormat(fodData.created, 'll') : '';
                tempdatarows.push(tempdatarow);
            }
            return { list: tempdatarows, total: resultDetails['total'], pages: resultDetails['pages'], limit: resultDetails['limit'], page: resultDetails['page'] }
        }
        if (requestfor === 2) {
            if (Object.keys(resultDetails).length > 0) {
                for (const [index, fodData] of resultDetails.entries()) {
                    let tempdatarow = Object.create(null);
                    tempdatarow['USER CODE'] = fodData?.User?.code || '';
                    tempdatarow['EMPLOYEE ID'] = fodData?.User?.employeeid || '';
                    tempdatarow['FIRST NAME'] = fodData?.User?.first_name || '';
                    tempdatarow['LAST NAME'] = fodData?.User?.last_name || '';
                    tempdatarow['EMAIL'] = fodData?.User?.email || '';
                    tempdatarow['TITLE'] = fodData?.mediafodVideo?.name || '';
                    tempdatarow['DATE'] = fodData?.created ? (this.commonDateService.DateTimeFormat(fodData?.created, 'MM-DD-YYYY') || '') : '';
                    tempdatarows.push(tempdatarow);
                }
            }
        }
        return tempdatarows;
    }
    async fodReportXLSX(resultDetails: any, org_id: number, clmNameArr: any): Promise<{ file_data: string, file_name: string, extension: string }> {
        try {
            let directory = path.join(appConstant.COMPANY_FOD_REPORT, this.commonFileService.sanitizeFileName(org_id));
            let fileName = `${org_id}_FOD_Report_${moment().format("MMDDYYYY_HHmmss")}.json`
            let filePath = path.join(directory, fileName);
            let filePathh = path.join(`${directory}`);
            const finalData = resultDetails.map((item) =>
                clmNameArr.reduce((acc, key) => {
                    if (Object.prototype.hasOwnProperty.call(item, key)) {
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
    async fodReportZip(resultDetails: any, org_id: number, clmNameArr: any, reportId: number, zipPassword: string): Promise<string> {
        try {
            clmNameArr.push('TITLE', 'DATE');
            let directory = path.join(appConstant.COMPANY_FOD_REPORT, this.commonFileService.sanitizeFileName(org_id));
            let fileName = `${org_id}_${reportId}_FOD_Report_${moment().format("MMDDYYYY_HHmmss")}.json`
            let filePath = path.join(directory, fileName);
            let filePathh = path.join(`${directory}`);
            const finalData = resultDetails.map((item) =>
                clmNameArr.reduce((acc, key) => {
                    if (Object.prototype.hasOwnProperty.call(item, key)) {
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
                            let zipPath = `automatic_report/fitnessvideo_reports/${reportId}/Fitness_video_report.zip`;
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
                            await this.mediaFitnessVideoReportService.update(resultData);
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
