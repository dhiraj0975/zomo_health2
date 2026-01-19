import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    QuickLinkEntity,
    tableConstant,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { lastValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { CompanyService } from '../company/company.service';
import { QuickLinkReportInput } from './input/quicklinkreport.input';
import { QuickLinkClicksService } from './quicklinkclicks.service';
import { QuickLinkReportService } from './quicklinkreport.service';
const path = require('path');
const moment = require('moment-timezone');
const argon2 = require('argon2');
@Injectable()
export class QuickLinkService extends BaseService<QuickLinkEntity> {
    constructor(
        @InjectRepository(
            QuickLinkEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaQuickLinkRepository: Repository<QuickLinkEntity>,
        @InjectRepository(QuickLinkEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuickLinkRepository: Repository<QuickLinkEntity>,
        private readonly commonService: CommonService,
        commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
        private readonly companyService: CompanyService,
        private readonly quickLinkReportService: QuickLinkReportService,
        private readonly quickLinkClicksService: QuickLinkClicksService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
    ) {
        super(
            readReplicaQuickLinkRepository,
            writeReplicaQuickLinkRepository,
            'quiz',
            commonArrayService,
        );
    }
    async save(data: any) {
        if (!data.sort_order) {
            const order = await this.readReplicaQuickLinkRepository
                .createQueryBuilder('ql')
                .where(`ql.c_companies_id = ${data.c_companies_id}`)
                .orderBy('ql.created', 'DESC')
                .select('ql.sort_order')
                .getOne();
            data['sort_order'] = (order?.sort_order ?? 0) + 1;
        }
        const savedResult = this.writeReplicaQuickLinkRepository.create(data);
        return await this.writeReplicaQuickLinkRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        return await this.writeReplicaQuickLinkRepository
            .createQueryBuilder('ql')
            .update(QuickLinkEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaQuickLinkRepository.delete(condition);
    }
    async findOne(condition: any) {
        return await this.readReplicaQuickLinkRepository
            .createQueryBuilder('ql')
            .leftJoinAndMapOne(
                'ql.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = ql.c_companies_id AND company.status = 1`,
            )
            .leftJoinAndMapMany(
                'ql.orglist',
                tableConstant.REPORT.TBL_QUICK_LINK_ORGLISTS,
                'orglist',
                `orglist.quicklink_id = ql.id AND orglist.status = 1`,
            )
            .leftJoinAndMapOne(
                'ql.folder',
                tableConstant.REPORT.TBL_QUICK_LINK_FOLDERS,
                'folder',
                `folder.id = ql.folder_id`,
            )
            .leftJoinAndMapOne(
                'orglist.org',
                tableConstant.COMPANIES.TBL_COMPANY,
                'org',
                `org.id = orglist.c_companies_id AND company.status = 1`,
            )
            .where(condition)
            .getOne();
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuickLinkRepository
            .createQueryBuilder('ql')
            .leftJoinAndMapOne(
                'ql.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = ql.c_companies_id AND company.status = 1`,
            )
            .leftJoinAndMapMany(
                'ql.orglist',
                tableConstant.REPORT.TBL_QUICK_LINK_ORGLISTS,
                'orglist',
                `orglist.quicklink_id = ql.id AND orglist.status = 1`,
            )
            .leftJoinAndMapOne(
                'ql.folder',
                tableConstant.REPORT.TBL_QUICK_LINK_FOLDERS,
                'folder',
                `folder.id = ql.folder_id`,
            )
            .where(condition)
            .select(fields)
            .orderBy(
                `ql.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .getMany();
    }
    async quickLinkListRecord(
        fields: any,
        condition: any,
        orderBy: any = null,
    ) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        return await this.readReplicaQuickLinkRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
    async quickLinkFindOne(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuickLinkRepository.findOne({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
    /**
     * Function of micro service for creating Quicklink-report
     * For table form data, xlsx form, auto request zip file
     */
    async quicklinkReport(postData: QuickLinkReportInput) {
        try {
            let autoRequestId: number = 0;
            let requestfor = (postData?.result_type && this.commonService.isValidNumber(postData?.result_type)) ? Number(postData?.result_type) : 0;
            let autoRequest = (postData?.auto_request && this.commonService.isValidNumber(postData?.auto_request)) ? Number(postData?.auto_request) : 0;
            let user = Object.create(postData?.userDetails || {}) || {};
            if (autoRequest == 1) {
                autoRequestId = postData?.auto_request_id;
                requestfor = 2;
            }
            let clmNameArr = ['USER CODE', 'EMPLOYEE ID', 'FIRST NAME', 'LAST NAME', 'EMAIL', 'TITLE', 'IS VIDEO', 'DATE'];
            let org_id: number, report_id: number;
            let reportRequest;
            let companyid: number;
            let report_setting_id: number, report_fields: string, user_id: number, zipPassword: string;
            if (autoRequest == 1) {
                await this.quickLinkReportService.updateReport();
                reportRequest = await this.quickLinkReportService.findOneReport(
                    `quicklinkReport.status = 0 AND company.status = 1 AND company.deleted  = 0 ${(autoRequestId && autoRequestId !== 0 && autoRequestId !== undefined) ? ' AND quicklinkReport.id = ' + autoRequestId : ''}`,
                );
                if (reportRequest) {
                    report_setting_id = reportRequest['report_setting_id'];
                    report_id = reportRequest['id'];
                    report_fields = reportRequest['report_fields'];
                    org_id = companyid = reportRequest['org_id'];
                    user_id = reportRequest['user_id'];
                    zipPassword =
                        await this.companyService.getCompanyZipPassword(org_id);
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
            let condition = '';
            if (autoRequest == 0) {
                org_id = user?.org_id;
                companyid = user?.org_id;
                if ([appConstant.ROLE.COACH, appConstant.ROLE.GLOBALCOACH, appConstant.ROLE.WCH, appConstant.ROLE.BROKER, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(user?.role_id)) {
                    org_id = postData?.org_id
                    companyid = postData?.org_id
                }
            }
            if (postData?.type == 'superadmin') {
                org_id = postData?.org_id
                companyid = postData?.org_id
            }
            if (autoRequest == 1) {
                condition +=
                    reportRequest?.condition || 'User.username IS NOT null';
                condition += ` AND quicklink.c_companies_id = ${org_id}`;
                if (reportRequest?.camp_id && reportRequest.camp_id !== '' && reportRequest.camp_id.toString() !== '0') {
                    const filterDocIds = reportRequest.camp_id;
                    if (filterDocIds) {
                        condition += ` AND quicklink.id IN (${filterDocIds})`;
                    }
                }
                if (reportRequest?.start_date_range && reportRequest.start_date_range !== '' && reportRequest?.end_date_range && reportRequest.end_date_range !== '') {
                    const startDate = moment(reportRequest.start_date_range, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD');
                    const endDate = moment(reportRequest.end_date_range, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD');
                    condition += ` AND (DATE_FORMAT(quicklinkClick.created_date, '%Y-%m-%d') BETWEEN '${startDate}' AND '${endDate}')`;
                } else if (reportRequest?.start_date_range && reportRequest.start_date_range !== '') {
                    const startDate = moment(reportRequest.start_date_range, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD');
                    condition += ` AND (DATE_FORMAT(quicklinkClick.created_date, '%Y-%m-%d') >= '${startDate}'')`;
                } else if (reportRequest?.end_date_range && reportRequest.end_date_range !== '') {
                    const endDate = moment(
                        reportRequest.end_date_range,
                        'YYYY-MM-DD HH:mm:ss',
                    ).format('YYYY-MM-DD');
                    condition += ` AND (DATE_FORMAT(quicklinkClick.created_date, '%Y-%m-%d') <= '${endDate}')`;
                }
            }
            if (autoRequest === 0) {
                condition += `User.role_id IN (2,16) AND quicklink.c_companies_id = ${companyid}`;
                if (postData?.show_terminated_users?.toString() === '2') {
                    condition += ' AND User.status = 1';
                }
                if (postData?.qld_id?.length) {
                    let qCondition = this.commonArrayService.formatInClauseCondition(postData?.qld_id, 'quicklink.id');
                    if (qCondition) {
                        condition += ` AND ${qCondition}`;
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
                if (
                    postData?.start_date &&
                    postData?.end_date
                ) {
                    const startDate = this.commonDateService.DateTimeFormat(postData?.start_date, "YYYY-MM-DD", "DD-MM-YYYY")
                    const endDate = this.commonDateService.DateTimeFormat(postData?.end_date, "YYYY-MM-DD", "DD-MM-YYYY");
                    condition += ` AND (DATE_FORMAT(quicklinkClick.created_date, '%Y-%m-%d') BETWEEN '${startDate}' AND '${endDate}')`;
                }
                else if (postData?.start_date) {
                    condition += ` AND (DATE_FORMAT(quicklinkClick.created_date, '%Y-%m-%d') >= '${this.commonDateService.DateTimeFormat(postData?.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}')`;
                } else if (postData?.end_date) {
                    condition += ` AND (DATE_FORMAT(quicklinkClick.created_date, '%Y-%m-%d') <= '${this.commonDateService.DateTimeFormat(postData?.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}')`;
                }
                if (requestfor == 1) {
                    if (postData?.search_str) {
                        const search = postData?.search_str.toLowerCase();
                        if (moment(postData?.search_str, 'll', true).isValid()) {
                            condition += ` AND quicklinkClick.created_date LIKE '%${moment(postData?.search_str, 'll', true).isValid() ? moment(postData?.search_str, 'll').format('YYYY-MM-DD') : ''}%'`
                        } else if (search === 'yes' || search === 'no') {
                            condition += ` AND (LOWER(User.first_name) LIKE '%${search}%' OR LOWER(User.last_name) LIKE '%${search}%' OR LOWER(CONCAT(User.first_name, ' ', User.last_name)) LIKE '%${search}%' OR (User.code) LIKE '%${search}%' OR (User.employeeid) LIKE '%${search}%' OR (User.email) LIKE '%${search}%' OR (quicklink.title) LIKE '%${search}%' OR (quicklink.is_video) LIKE '%${search === 'yes' ? 1 : 0}%')`;
                            // condition +=   this.commonService.generateDynamicSearchQuery(postData?.search_str, ['User.first_name','User.last_name','full_name','User.code','User.employeeid','User.email','quicklink.title','quicklink.is_video']);
                            // condition += ` OR ((quicklink.is_video) LIKE '%${search === 'yes'?1:0}%')`
                        }
                        else {
                            condition += ` AND (LOWER(User.first_name) LIKE '%${search}%' OR LOWER(User.last_name) LIKE '%${search}%' OR LOWER(CONCAT(User.first_name, ' ', User.last_name)) LIKE '%${search}%' OR (User.code) LIKE '%${search}%' OR (User.employeeid) LIKE '%${search}%' OR (User.email) LIKE '%${search}%' OR (quicklink.title) LIKE '%${search}%')`;
                            // condition +=   this.commonService.generateDynamicSearchQuery(postData?.search_str, ['User.first_name','User.last_name','full_name','User.code','User.employeeid','User.email','quicklink.title']);
                        }
                    }
                }
            }
            let resultDetails;
            let paginate = {
                page: postData?.page || 1,
                limit: postData?.limit || appConstant.RECORD_PER_PAGE,
            }
            if (requestfor === 1) {
                resultDetails = await this.quickLinkClicksService.quicklinkReport(
                    [
                        'User.id', 'User.code', 'User.employeeid', 'User.first_name', 'User.last_name', 'User.email',
                        'quicklink.id', 'quicklink.title', 'quicklink.is_video', 'quicklinkClick.id', 'quicklinkClick.created_date',
                    ],
                    condition, paginate
                )
            }
            if (requestfor === 2) {
                resultDetails = await this.quickLinkClicksService.quicklinkReport(
                    [
                        'User.id', 'User.code', 'User.employeeid', 'User.first_name', 'User.last_name', 'User.email',
                        'quicklink.id', 'quicklink.title', 'quicklink.is_video', 'quicklinkClick.id', 'quicklinkClick.created_date',
                    ],
                    condition, null
                );
            }
            if (resultDetails) {
                resultDetails = await this.mapQuicklinkData(resultDetails, requestfor);
                if (requestfor === 2 && autoRequest == 0) {
                    resultDetails = await this.quicklinkReportXLSX(resultDetails, org_id, clmNameArr);
                }
                if (autoRequest == 1) {
                    resultDetails = await this.quicklinkReportZip(resultDetails, org_id, clmNameArr, report_id, zipPassword);
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
                    await this.quickLinkReportService.update(
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
    async mapQuicklinkData(quicklinkData: any, requestfor: number = 1) {
        let tempdatarows = [];
        if (requestfor === 1) {
            let quicklinkDataList = quicklinkData?.['list'] || [];
            if (Object.keys(quicklinkDataList).length === 0) {
                return { list: [], total: quicklinkData['total'], pages: quicklinkData['pages'], limit: quicklinkData['limit'], page: quicklinkData['page'] }
            }
            for (const [index, quicklinkDatas] of quicklinkDataList.entries()) {
                let tempdatarow = Object.create(null);
                tempdatarow['code'] = quicklinkDatas?.User?.code || '';
                tempdatarow['employeeid'] = quicklinkDatas?.User?.employeeid || '';
                tempdatarow['first_name'] = quicklinkDatas?.User?.first_name || '';
                tempdatarow['last_name'] = quicklinkDatas?.User?.last_name || '';
                tempdatarow['email'] = quicklinkDatas?.User?.email || '';
                tempdatarow['title'] = quicklinkDatas?.quicklink?.title || '';
                tempdatarow['is_video'] = quicklinkDatas?.quicklink?.is_video ? (quicklinkDatas?.quicklink?.is_video === 1 ? 'YES' : 'NO') : 'NO'
                tempdatarow['created_date'] = quicklinkDatas?.created_date
                    ? this.commonDateService.DateTimeFormat(quicklinkDatas.created_date, 'll')
                    : '';
                tempdatarows.push(tempdatarow);
            }
            return { list: tempdatarows, total: quicklinkData['total'], pages: quicklinkData['pages'], limit: quicklinkData['limit'], page: quicklinkData['page'] }
        }
        if (requestfor === 2) {
            if (Object.keys(quicklinkData).length > 0) {
                for (const [index, quicklinkDatas] of quicklinkData.entries()) {
                    let tempdatarow = Object.create(null);
                    tempdatarow['USER CODE'] = quicklinkDatas?.User?.code || '';
                    tempdatarow['EMPLOYEE ID'] = quicklinkDatas?.User?.employeeid || '';
                    tempdatarow['FIRST NAME'] = quicklinkDatas?.User?.first_name || '';
                    tempdatarow['LAST NAME'] = quicklinkDatas?.User?.last_name || '';
                    tempdatarow['EMAIL'] = quicklinkDatas?.User?.email || '';
                    tempdatarow['TITLE'] = quicklinkDatas?.quicklink?.title || '';
                    tempdatarow['IS VIDEO'] = (quicklinkDatas?.quicklink?.is_video) ?
                        (quicklinkDatas?.quicklink?.is_video === 1 ? 'YES' : 'NO')
                        : 'NO';
                    tempdatarow['DATE'] = quicklinkDatas?.created_date
                        ? (this.commonDateService.DateTimeFormat(quicklinkDatas?.created_date, 'MM-DD-YYYY') || '') : '';
                    tempdatarows.push(tempdatarow);
                }
            }
        }
        return tempdatarows;
    }
    async quicklinkReportXLSX(resultDetails, org_id: number, clmNameArr: string[]): Promise<{ file_data: string, file_name: string, extension: string }> {
        try {
            let directory = path.join(appConstant.COMPANY_QUICKLINK_REPORT, this.commonFileService.sanitizeFileName(org_id));
            let fileName = `${org_id}_Quicklink_Report_${moment().format("MMDDYYYY_HHmmss")}.json`
            let filePath = path.join(directory, fileName);
            let filePathh = path.join(`${directory}`);
            const finalData = resultDetails.map((item) =>
                clmNameArr.reduce((acc, key) => {
                    if (Object?.prototype?.hasOwnProperty?.call(item, key) || Object.keys(item)?.includes(key)) {
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
    async quicklinkReportZip(resultDetails, org_id: number, clmNameArr: string[], reportId: number, zipPassword: string): Promise<string> {
        try {
            let directory = path.join(appConstant.COMPANY_QUICKLINK_REPORT, this.commonFileService.sanitizeFileName(org_id));
            let fileName = `${org_id}_${reportId}_Quicklink_Report_${moment().format("MMDDYYYY_HHmmss")}.json`
            let filePath = path.join(directory, fileName);
            let filePathh = path.join(`${directory}`);
            const finalData = resultDetails.map((item) =>
                clmNameArr.reduce((acc, key) => {
                    if (Object?.prototype?.hasOwnProperty?.call(item, key) || Object.keys(item)?.includes(key)) {
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
                            let zipPath = `automatic_report/quicklink_reports/${reportId}/Quicklink_report.zip`;
                            let zipPathDir = path.join(
                                directory,
                                fileName,
                            );
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
                                throw new Error(`Report Not Uploaded to Bucket`);
                            }
                            let resultData = Object.create(null);
                            resultData['id'] = reportId;
                            resultData['file_name'] = zipPath;
                            resultData['auto_report_zip_password'] =
                                Buffer.from(
                                    await argon2.hash(zipPassword),
                                ).toString('base64');
                            resultData['error_message'] = '';
                            resultData['status'] = 1;
                            resultData['updated_date'] = moment().format('YYYY-MM-DD HH:mm:ss');
                            await this.quickLinkReportService.update(resultData);
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
