import {
    appConstant,
    BillboardReportEntity,
    CommonArrayService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    tableConstant,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { lastValueFrom } from 'rxjs';
import { In, Repository } from 'typeorm';
import { CompanyService } from '../../company/company.service';
import { SettingsService } from '../../company/settings.service';
import { UserService } from '../../user/user.service';
import { DepartmentService } from '../department.service';
import { LocationServices } from '../location.service';
import { DashboardClickService } from './dashboard-click.service';
import { DashboardService } from './dashboard.service';
import { BillboardReportInput } from './input/billboard-report.input';

const moment = require('moment-timezone');
const path = require('path');
const argon2 = require('argon2');

@Injectable()
export class BillboardReportService {
    private readonly companyZipPasswordCache = new Map<
        number,
        { password: string; timestamp: number }
    >();
    private readonly CACHE_TTL = 3600000;

    constructor(
        @InjectRepository(
            BillboardReportEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaBillboardReportRepository: Repository<BillboardReportEntity>,
        @InjectRepository(BillboardReportEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaBillboardReportRepository: Repository<BillboardReportEntity>,
        private readonly commonService: CommonService,
        private readonly companyService: CompanyService,
        private readonly companySettingsService: SettingsService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
        private readonly userService: UserService,
        private readonly departmentService: DepartmentService,
        private readonly locationService: LocationServices,
        private readonly dashboardService: DashboardService,
        private readonly dashboardClickService: DashboardClickService,
        private readonly commonArrayService: CommonArrayService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
    ) {}

    async updateReport() {
        const result = await this.readReplicaBillboardReportRepository
            .createQueryBuilder('billboardReport')
            .select('billboardReport.id')
            .where('billboardReport.created_date < NOW() - INTERVAL 2 HOUR')
            .andWhere('billboardReport.status = :status', { status: 2 })
            .andWhere('billboardReport.total_download < :maxDownload', {
                maxDownload: 4,
            })
            .orderBy('billboardReport.created_date', 'ASC')
            .limit(1)
            .getRawOne();

        if (!result) return;

        await this.writeReplicaBillboardReportRepository
            .createQueryBuilder()
            .update()
            .set({ total_download: () => 'total_download + 1', status: 0 })
            .where('id = :id', { id: result.id })
            .andWhere('status = :status', { status: 2 })
            .execute();
    }

    async findOne(condition: any) {
        return await this.readReplicaBillboardReportRepository
            .createQueryBuilder('billboardReport')
            .select([
                'billboardReport.id',
                'billboardReport.report_setting_id',
                'billboardReport.report_fields',
                'billboardReport.user_role',
                'billboardReport.org_id',
                'billboardReport.membership_code',
                'billboardReport.condition',
                'billboardReport.start_date_range',
                'billboardReport.end_date_range',
                'billboardReport.otheroptions',
                'company.id',
                'company.company_name',
                'company.status',
            ])
            .leftJoin(
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = billboardReport.org_id`,
            )
            .where(condition)
            .orderBy('billboardReport.request_date', 'ASC')
            .limit(1)
            .getOne();
    }

    async billboardReport(postData: BillboardReportInput) {
        try {
            let autoRequestId: number = 0;
            const autoRequest =
                postData?.auto_request &&
                this.commonService.isValidNumber(postData?.auto_request)
                    ? Number(postData?.auto_request)
                    : 0;
            if (autoRequest == 1) {
                autoRequestId = postData?.auto_request_id;
            }
            let clmNameArr = [
                'USER CODE',
                'EMPLOYEE ID',
                'FIRST NAME',
                'LAST NAME',
                'EMAIL',
            ];
            let org_id: number,
                report_id: number,
                report_fields: string,
                report_setting_id: number,
                companyid: number,
                zipPassword: string,
                company_name: string,
                reportRequest,
                filterCondition;

            const user = Object.create(postData?.userDetails || {}) || {};

            if (autoRequest == 0) {
                company_name = user?.company_name;
                companyid = user?.org_id;
                org_id = user?.org_id;
            }

            if (postData?.userDetails?.role_id == 1) {
                const companyData = await this.companyService.findOne(
                    `company.id = ${postData?.org_id}`,
                    ['c_company_settings'],
                    ['company.company_name', 'companySetting.census_status'],
                );
                company_name = companyData?.company_name?.replace(
                    /[^A-Za-z0-9\-]/g,
                    '-',
                );
                user.org_id = postData?.org_id;
                org_id = postData?.org_id;
                user.membership_code = postData?.membership_code;
                companyid = postData?.org_id;
            }

            if (autoRequest == 1) {
                await this.updateReport();
                reportRequest = await this.findOne(
                    `billboardReport.status = 0 AND company.status = 1 AND company.deleted = 0 ${(autoRequestId && autoRequestId !== 0 && autoRequestId !== undefined) ? ' AND billboardReport.id = ' + autoRequestId : ''}`,
                );

                if (!reportRequest || Object.keys(reportRequest).length === 0) {
                    console.log('Request Over wait for new report request');
                    return null;
                    //throw new Error('Request Over wait for new report request');
                }

                report_setting_id = Number(
                    reportRequest?.['report_setting_id'],
                );
                report_id = Number(reportRequest?.['id']);
                report_fields = reportRequest?.['report_fields'];
                org_id = reportRequest?.['org_id'];
                companyid = reportRequest?.['org_id'];

                const [companyData, zipPasswordValue] = await Promise.all([
                    this.companyService.findOne(
                        `company.id = ${companyid}`,
                        ['c_company_settings'],
                        [
                            'company.company_name',
                            'companySetting.census_status',
                        ],
                    ),
                    this.getCompanyZipPassword(companyid),
                ]);

                company_name = companyData?.company_name?.replace(
                    /[^A-Za-z0-9\-]/g,
                    '-',
                );
                zipPassword = zipPasswordValue;

                if (report_setting_id && report_fields) {
                    clmNameArr = Object.values(JSON.parse(report_fields));
                }
                filterCondition = reportRequest.condition.replace(/User/g, 'users')
            } else {
                filterCondition = { role_id: In([2, 16]), org_id: companyid };

                if (postData?.terminated_users?.toString() === '2') {
                    filterCondition.status = 1;
                }
                if (postData?.department_id?.length) {
                    filterCondition.department_id = In(
                        Array.isArray(postData.department_id)
                            ? postData.department_id.map((v) => v.toString())
                            : postData.department_id
                                  .toString()
                                  .split(',')
                                  .map((v) => v.trim()),
                    );
                }

                if (postData?.location_id?.length) {
                    filterCondition.location = In(
                        Array.isArray(postData.location_id)
                            ? postData.location_id.map((v) => v.toString())
                            : postData.location_id
                                  .toString()
                                  .split(',')
                                  .map((v) => v.trim()),
                    );
                }
            }
            const usersData = await this.userService.commonQueryBuilder(['users.id', 'users.code', 'users.employeeid', 'users.first_name', 'users.last_name', 'users.email'],filterCondition,{},[],'getMany');
            if (!usersData?.length) {
                const errorMsg =
                    'No Records Found For Users Billboard Between Selected Filter.';
                if (autoRequest == 0) throw new Error(errorMsg);
                await this.updateReportWithError(report_id, errorMsg);
                return 'Report Successfully created.';
            }

            const allUsersId = usersData.map((u) => u.id);
            const usersDataMap = new Map(usersData.map((u) => [u.id, u]));

            const clickConditionParts = [
                `dashboardClick.user_id IN (${allUsersId.join(',')})`,
            ];

            const dateRange =
                autoRequest == 0
                    ? { start: postData?.start_date, end: postData?.end_date }
                    : {
                          start: reportRequest?.start_date_range,
                          end: reportRequest?.end_date_range,
                      };

            if (dateRange.start && dateRange.end) {
                const fromdate = moment(
                    dateRange.start,
                    autoRequest == 0 ? 'DD-MM-YYYY' : undefined,
                ).format('YYYY-MM-DD');
                const todate = moment(
                    dateRange.end,
                    autoRequest == 0 ? 'DD-MM-YYYY' : undefined,
                ).format('YYYY-MM-DD');
                clickConditionParts.push(
                    `DATE_FORMAT(dashboardClick.created_date,'%Y-%m-%d') BETWEEN '${fromdate}' AND '${todate}'`,
                );
            } else if (dateRange.start) {
                const fromdate = moment(
                    dateRange.start,
                    autoRequest == 0 ? 'DD-MM-YYYY' : undefined,
                ).format('YYYY-MM-DD');
                clickConditionParts.push(
                    `DATE_FORMAT(dashboardClick.created_date,'%Y-%m-%d') >= '${fromdate}'`,
                );
            } else if (dateRange.end) {
                const todate = moment(
                    dateRange.end,
                    autoRequest == 0 ? 'DD-MM-YYYY' : undefined,
                ).format('YYYY-MM-DD');
                clickConditionParts.push(
                    `DATE_FORMAT(dashboardClick.created_date,'%Y-%m-%d') <= '${todate}'`,
                );
            }

            if (autoRequest == 0) {
                if (
                    postData?.device_type !== undefined &&
                    postData?.device_type?.toString() !== '2'
                ) {
                    clickConditionParts.push(
                        `dashboardClick.source = ${postData.device_type}`,
                    );
                }
            } else if (reportRequest?.otheroptions) {
                const deviceType = JSON.parse(reportRequest.otheroptions);
                const deviceTypeValue = Number(deviceType?.deviced_type);
                if (deviceTypeValue !== 2) {
                    clickConditionParts.push(
                        `dashboardClick.source = ${deviceTypeValue}`
                    );
                }
            }

            const [usersSteps, imgOrderList] = await Promise.all([
                this.dashboardClickService.getAggregatedClickData(
                    clickConditionParts.join(' AND '),
                ),
                this.dashboardService.getImageOrderList(companyid),
            ]);

            if (!usersSteps?.length) {
                const errorMsg =
                    'No Records Found For Users Billboard Between Selected Filter.';
                if (autoRequest == 0) throw new Error(errorMsg);
                await this.updateReportWithError(report_id, errorMsg);
                return 'Report Successfully created.';
            }

            const imgOrderMap = new Map(
                imgOrderList.map((item, index) => [item.id, index]),
            );
            clmNameArr = [
                ...clmNameArr,
                'BILLBOARD TYPE',
                'COUNT',
                'TIMESTAMP',
            ];

            const clickdata = new Array(usersSteps.length);
            for (let i = 0; i < usersSteps.length; i++) {
                const value = usersSteps[i];
                const rowData = this.commonFieldDataCalling(
                    usersDataMap.get(value.user_id),
                    clmNameArr,
                );
                rowData.push(
                    value.type == 0
                        ? `Main ${(imgOrderMap.get(value.ref_id) ?? imgOrderMap.size) + 1}`
                        : `Square ${value.type}`,
                );
                rowData.push(value.total);
                rowData.push(value.created_date);
                clickdata[i] = rowData;
            }

            let cleanFilename =
                `${company_name}_Billboard_Report_${moment().format('MM_DD_YYYYHHmmss')}`
                    .replace(/[^A-Za-z0-9_\s-]/g, '_')
                    .replace(/[\s-]/g, '_');
            if(autoRequest == 1){
                cleanFilename = `${company_name}_${report_id}_Billboard_Report${moment().format('MM_DD_YYYYHHmmss')}.csv`
            }
            return autoRequest == 0
                ? await this.processBillboardReportCsv(
                      clickdata,
                      clmNameArr,
                      cleanFilename,
                  )
                : await this.processBillboardReportZip(
                      clickdata,
                      clmNameArr,
                      cleanFilename,
                      org_id,
                      zipPassword,
                      report_id,
                  );
        } catch (err) {
            console.error('Billboard report error:', err);
            return { success: 0, message: err.message, error: 1 };
        }
    }

    async getCompanyZipPassword(cId: number): Promise<string> {
        const cached = this.companyZipPasswordCache.get(cId);
        const now = Date.now();

        if (cached && now - cached.timestamp < this.CACHE_TTL)
            return cached.password;

        let result = await this.companyService.findOne(
            `company.id = ${cId}`,
            ['c_company_meta'],
            ['company.id', 'company.code', 'companyMeta.zip_report_password'],
        );
        result = this.commonService.mergeCompanyTables(result);

        const password =
            result?.zip_report_password || `${result.code}_${result.id}`;
        this.companyZipPasswordCache.set(cId, { password, timestamp: now });
        return password;
    }

    commonFieldDataCalling(userData: any, columns: string[]): any[] {
        const mapping = {
            'USER CODE': userData?.code || '',
            'EMPLOYEE ID': userData?.employeeid || '',
            'FIRST NAME': userData?.first_name || '',
            'LAST NAME': userData?.last_name || '',
            EMAIL: userData?.email || '',
        };
        return columns
            .filter((col) => mapping.hasOwnProperty(col))
            .map((col) => mapping[col]);
    }

    async processBillboardReportCsv(
        resultDetails: any[],
        clmNameArr: string[],
        filename: string,
    ) {
        const rows = [
            clmNameArr.join(','),
            ...resultDetails.map((row) =>
                row.map((field) => `"${field}"`).join(','),
            ),
        ];
        return await this.commonService.downloadEncryptFile(
            filename,
            rows,
            'csv',
        );
    }

    async processBillboardReportZip(
        resultDetails: any[],
        clmNameArr: string[],
        filename: string,
        org_id: number,
        zipPassword: string,
        report_id: number,
    ): Promise<string> {
        try {
            const directory = path.join(
                appConstant.COMPANY_BILLBOARD_REPORT ||
                    'automatic_report/billboard_reports',
                this.commonFileService.sanitizeFileName(org_id.toString()),
                report_id.toString(),
            );
            const csvContent = [
                clmNameArr.join(','),
                ...resultDetails.map((row) =>
                    row.map((field) => `"${field}"`).join(','),
                ),
            ].join('\n');

            const writeFile = await this.commonFileService.writeFile(
                directory,
                csvContent,
                filename,
            );
            if (writeFile?.status !== 'success')
                throw new Error('File does not exist');

            const filePath = path.join(directory, filename).replace(/\\/g, '/');
            const result: any =
                await this.commonFileService.createPasswordProtectedZip(
                    filePath,
                    zipPassword.toString(),
                    'create_zip.py',
                );
            if (result?.status !== 'success')
                throw new Error('Report Not created');

            const zipFilename = filename.replace(/\.csv$/i, '.zip');
            const zipPath = `automatic_report/billboard_reports/${report_id}/Billboard_report.zip`;
            const zipPathDir = path.join(directory, zipFilename).replace(/\\/g, '/');
            await lastValueFrom(
                this.commonMicroservice.send(
                    { cmd: 'upload_file' },
                    {
                        path: path.resolve(zipPathDir),
                        filename: zipPath,
                        userBucket: 'private',
                        isRemove: false,
                    },
                ),
            );

            const [hashedPassword] = await Promise.all([
                argon2.hash(zipPassword),
                Promise.all([
                    this.commonFileService.removeFileFromLocal(filePath),
                    this.commonFileService.removeFileFromLocal(zipPathDir),
                ]),
            ]);

            await this.update({
                id: report_id,
                file_name: zipPath,
                auto_report_zip_password:
                    Buffer.from(hashedPassword).toString('base64'),
                error_message: '',
                status: 1,
                updated_date: moment().format('YYYY-MM-DD HH:mm:ss'),
            });

            return 'Report Successfully created.';
        } catch (err) {
            console.error('Error in processBillboardReportZip:', err);
            throw new Error('File Not Created');
        }
    }

    async updateReportWithError(reportId: number, errorMessage: string) {
        await this.update({
            id: reportId,
            error_message: errorMessage,
            status: 1,
            updated_date: moment().format('YYYY-MM-DD HH:mm:ss'),
        });
    }

    async update(data: any) {
        return await this.writeReplicaBillboardReportRepository.save(
            this.writeReplicaBillboardReportRepository.create(data),
        );
    }
    async save(data: any) {
        const savedResult = this.writeReplicaBillboardReportRepository.create(data);
        return await this.writeReplicaBillboardReportRepository.save(savedResult);
    }

    clearCache() {
        this.companyZipPasswordCache.clear();
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        const queryBuilder = this.readReplicaBillboardReportRepository
            .createQueryBuilder('billboard')
            .where(condition)
            .orderBy(orderBy);
        const result = await queryBuilder.getMany();
        return result;
    }
    async findWithAutoSetting(condition: any, fields: any = null) {
        const queryBuilder = this.readReplicaBillboardReportRepository
            .createQueryBuilder('billboard')
            .innerJoinAndMapOne(
                'billboard.automaticreportSetting',
                tableConstant.REPORT.TBL_AU_AUTO_REPORT_SETTINGS,
                'automaticreportSetting',
                `automaticreportSetting.id = billboard.report_setting_id`,
            )
            .where(condition);
        if (fields !== null) {
            queryBuilder.select(fields);
        }
        const result = await queryBuilder.getMany();
        return result;
    }
}
