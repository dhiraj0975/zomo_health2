import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    ReimbursementSubmitedFormsEntity,
    tableConstant,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { lastValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { CensusCustomFieldsService } from '../census/censuscustomfields.service';
import { CensusCustomFieldsValuesService } from '../census/censuscustomfieldsvalues.service';
import { CompanyService } from '../company/company.service';
import { SettingsService } from '../company/settings.service';
import { ReimbursementReportService } from './reimbusementreport.service';
import { ReimbursementReportInput } from './input/reimbursementsreport.input';
import { UserService } from '../user/user.service';
const path = require('path');
const moment = require('moment-timezone');
const argon2 = require('argon2');
@Injectable()
export class ReimbursementService {
    constructor(
        @InjectRepository(
            ReimbursementSubmitedFormsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaSubmitedFormsRepository: Repository<ReimbursementSubmitedFormsEntity>,
        @InjectRepository(
            ReimbursementSubmitedFormsEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaSubmitedFormsRepository: Repository<ReimbursementSubmitedFormsEntity>,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
        private readonly userService: UserService,
        private readonly reimbursementReportService: ReimbursementReportService,
        private readonly companyService: CompanyService,
        private readonly companySettingsService: SettingsService,
        private readonly censusCustomFieldsService: CensusCustomFieldsService,
        private readonly censusCustomFieldsValuesService: CensusCustomFieldsValuesService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
    ) { }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSubmitedFormsRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
    async reimbursementReport(
        condition: any,
        paginationParam: any = null,
        field: any[] = [
            'User.id', 'User.role_id', 'User.new_password', 'User.timezone', 'User.is_camp_eligible', 'User.department_id', 'User.location', 'User.org_id',
            'User.email', 'User.on_insurance_plan', 'User.gender', 'User.relationship_id', 'User.code', 'User.username', 'User.middle_name',
            'User.dob', 'User.date_of_hire', 'User.first_name', 'User.last_name', 'User.insurance_plan_name','User.employeeid',
            'settings.id', 'settings.jobtitle', 'settings.wphone', 'settings.hphone',
            'company.id', 'company.company_name',
            'department.id', 'department.dept_name',
            'Location.id', 'Location.lname', 'Location.address1', 'Location.city', 'Location.state', 'Location.zip', 'Location.country',
            'resubmitedforms.user_id', 'resubmitedforms.id', 'resubmitedforms.org_id', 'resubmitedforms.form_id', 'resubmitedforms.activity_id',
            'resubmitedforms.activity_date', 'resubmitedforms.reim_amount', 'resubmitedforms.notes', 'resubmitedforms.decline_reason', 'resubmitedforms.popup_status',
            'resubmitedforms.approve_reim_amount', 'resubmitedforms.approval_type', 'resubmitedforms.status',
            'inactivity.id', 'inactivity.category_id', 'inactivity.activity_name', 'inactivity.status',
            'recreateforms.id', 'recreateforms.title', 'recreateforms.org_id', 'recreateforms.activity_id', 'recreateforms.activity_date', 'recreateforms.attachments',
            'recreateforms.multiple_selection', 'recreateforms.description', 'recreateforms.act_reim_amount', 'recreateforms.approval_type', 'recreateforms.status',
            'recreateforms.added_date',
        ],
    ) {
        try {
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
            let data = this.readReplicaSubmitedFormsRepository
                .createQueryBuilder('resubmitedforms')
                .leftJoinAndMapOne(
                    'resubmitedforms.User',
                    tableConstant.TBL_USERS,
                    'User',
                    `User.id = resubmitedforms.user_id`,
                )
                .leftJoinAndMapOne(
                    'resubmitedforms.inactivity',
                    tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                    'inactivity',
                    `inactivity.id = resubmitedforms.activity_id`,
                )
                .leftJoinAndMapOne(
                    'resubmitedforms.recreateforms',
                    tableConstant.REPORT.TBL_RE_CREATE_FORMS,
                    'recreateforms',
                    `recreateforms.id = resubmitedforms.form_id`,
                )
                .leftJoinAndMapOne(
                    'User.company',
                    tableConstant.COMPANIES.TBL_COMPANY,
                    'company',
                    `company.id = User.org_id AND company.status = 1`,
                )
                .leftJoinAndMapOne(
                    'User.department',
                    tableConstant.COMPANIES.TBL_DEPARTMENT,
                    'department',
                    `department.id = User.department_id`,
                )
                .leftJoinAndMapOne(
                    'User.Location',
                    tableConstant.COMPANIES.TBL_LOCATION,
                    'Location',
                    `Location.id = User.location`,
                )
                .leftJoinAndMapOne(
                    'User.settings',
                    tableConstant.TBL_USERS_SETTINGS,
                    'settings',
                    `settings.user_id = User.id`,
                )
                .where(condition)
                .orderBy('resubmitedforms.id', 'DESC')
                .select(field);
            let resultData;
            if (paginationParam === null) {
                resultData = await data.getMany();
            } else {
                data = data.take(paginateObj.take).skip(paginateObj.skip);
                let finalData = await data.getManyAndCount();
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
    /**
     * Function of micro service for creating Quicklink-report
     * For auto request
     */
    async reimbursementsReport(postData: ReimbursementReportInput) {
        try {
            let autoRequestId: number = 0;
            let requestfor = (postData?.result_type && this.commonService.isValidNumber(postData?.result_type)) ? Number(postData?.result_type) : 0;
            let autoRequest = (postData?.auto_request && this.commonService.isValidNumber(postData?.auto_request)) ? Number(postData?.auto_request) : 0;
            let user = Object.create(postData?.userDetails || {}) || {};
            if (autoRequest === 1) {
                autoRequestId = postData?.auto_request_id;
                requestfor = 2;
            }
            let clmNameArr = [
                'USER CODE', 'DEPARTMENT', 'RELATIONSHIP ID', 'USERNAME', 'FIRST NAME', 'MIDDLE NAME', 'LAST NAME', 'JOB TITLE', 'EMPLOYEE ID', 'GENDER', 'BIRTH DATE', 'DATE OF HIRE', 'ON HEALTH PLAN', 'HEALTH PLAN NAME', 'EMAIL', 'LOCATION', 'USER TYPE',
            ];
            let role_id: number;
            let reportRequest;
            let membershipcode: string = '';
            let org_id: number, report_id: number;
            let companyid: number;
            let report_setting_id: number, report_fields: string, user_id: number, zipPassword: string;
            if (autoRequest == 1) {
                await this.reimbursementReportService.updateReport();
                reportRequest =
                    await this.reimbursementReportService.findOneReport(
                        `reimbursementReport.status = 0 AND company.status = 1 AND company.deleted  = 0 ${(autoRequestId && autoRequestId !== 0 && autoRequestId !== undefined) ? ' AND reimbursementReport.id = ' + autoRequestId : ''}`,
                    );
                if (reportRequest) {
                    report_setting_id = reportRequest?.['report_setting_id'];
                    report_id = reportRequest?.['id'];
                    report_fields = reportRequest?.['report_fields'];
                    role_id = Number(reportRequest?.['user_role']);
                    org_id = companyid = reportRequest?.['org_id'];
                    user_id = reportRequest?.['user_id'];
                    zipPassword = await this.companyService.getCompanyZipPassword(org_id);
                    if (report_setting_id && report_setting_id !== null && report_setting_id !== 0) {
                        if (report_fields !== '' && report_fields !== null) {
                            clmNameArr = Object.values(JSON.parse(report_fields));
                        }
                    }
                } else {
                    throw new Error('NOT FOUND');
                }
            }
            if (autoRequest === 0) {
                org_id = user.org_id
                membershipcode = user.membership_code
                companyid = user.org_id
                role_id = user.role_id
                if (postData?.type == 'superadmin') {
                    org_id = postData?.org_id
                    membershipcode = postData?.membership_code
                    companyid = postData?.org_id
                    role_id = 1;
                }
                if ([appConstant.ROLE.COACH, appConstant.ROLE.GLOBALCOACH, appConstant.ROLE.WCH, appConstant.ROLE.BROKER, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(user?.role_id)) {
                    org_id = postData?.org_id;
                    membershipcode = postData?.membership_code;
                    companyid = postData?.org_id;
                }
            }
            let censusStatus = 0;
            const companySettingData = await this.companySettingsService.findOne({ org_id: org_id }, ['id', 'org_id', 'census_status']);
            if (companySettingData && autoRequest == 0) {
                censusStatus = companySettingData?.census_status;
            }
            let condition = 'User.role_id IN (2,16) AND User.status = 1';
            if (autoRequest == 1) {
                condition += (condition == '') ?  reportRequest?.condition : ` AND ` + reportRequest?.condition;
                condition += ` AND resubmitedforms.form_id = ${reportRequest?.camp_id}`;
                if (reportRequest?.report_type && reportRequest.report_type !== '') {
                    const activityId = reportRequest.report_type;
                    if (activityId) {
                        condition += ` AND resubmitedforms.activity_id IN (${activityId})`;
                    }
                }
                if (reportRequest?.start_date_range && reportRequest.start_date_range !== '' && reportRequest?.end_date_range && reportRequest.end_date_range !== '') {
                    const startDate = this.commonDateService.DateTimeFormat(reportRequest['start_date_range'], 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD');
                    const endDate = this.commonDateService.DateTimeFormat(reportRequest['end_date_range'], 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD');
                    condition += ` AND (DATE_FORMAT(resubmitedforms.activity_date, '%Y-%m-%d') BETWEEN '${startDate}' AND '${endDate}')`;
                } else if (reportRequest?.start_date_range && reportRequest.start_date_range !== '') {
                    const startDate = this.commonDateService.DateTimeFormat(reportRequest['start_date_range'], 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD');
                    condition += ` AND (DATE_FORMAT(resubmitedforms.activity_date, '%Y-%m-%d') >= '${startDate}')`;
                } else if (reportRequest?.end_date_range && reportRequest.end_date_range !== '') {
                    const endDate = this.commonDateService.DateTimeFormat(reportRequest['end_date_range'], 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD');
                    condition += ` AND (DATE_FORMAT(resubmitedforms.activity_date, '%Y-%m-%d') <= '${endDate}')`;
                }
            } else {
                condition += ` AND User.membership_code IN('${membershipcode}') AND resubmitedforms.form_id = ${postData?.form_id} AND resubmitedforms.activity_id = ${postData?.activity_id}`;
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
                    condition += ` AND (DATE_FORMAT(resubmitedforms.activity_date, '%Y-%m-%d') BETWEEN '${startDate}' AND '${endDate}')`;
                }
                else if (postData?.start_date) {
                    const startDate = this.commonDateService.DateTimeFormat(postData?.start_date, "YYYY-MM-DD", "DD-MM-YYYY");
                    condition += ` AND (DATE_FORMAT(resubmitedforms.activity_date, '%Y-%m-%d') >= '${startDate}')`;
                } else if (postData?.end_date) {
                    const endDate = this.commonDateService.DateTimeFormat(postData?.end_date, "YYYY-MM-DD", "DD-MM-YYYY");
                    condition += ` AND (DATE_FORMAT(resubmitedforms.activity_date, '%Y-%m-%d') <= '${endDate}')`;
                }
                if (censusStatus == 1) {
                    let conditionCensu = [];
                    if (postData?.custom_field && typeof postData?.custom_field === 'string') {
                        postData.custom_field = JSON.parse(postData?.custom_field);
                    }
                    if (postData?.custom_field && typeof postData?.custom_field === 'object') {
                        postData.custom_field = Object.fromEntries(
                            Object.entries(postData?.custom_field).filter(([key, value]) =>
                                typeof value === 'string' &&
                                value.match(/^[a-zA-Z0-9 @\-_&$%]+$/)
                            )
                        );
                    }
                    if (postData?.custom_field && Object.keys(postData?.custom_field).length > 0) {
                        for (const [key, value] of Object.entries(postData?.custom_field)) {
                            if (typeof value === 'string' && /^[a-zA-Z0-9 @\-_&$%]+$/.test(value)) {
                                conditionCensu.push(
                                    `user_id IN (SELECT user_id FROM c_census_custom_fields_values WHERE ((\`field_value\` LIKE '%${value}%') AND \`field_id\` = ${key}))`
                                );
                            }
                        }
                        if (conditionCensu.length > 0) {
                            let Censuscustom = await this.censusCustomFieldsValuesService.findDistinctUserIds(conditionCensu);
                            if (Censuscustom && Censuscustom.length > 0) {
                                const userIds = Censuscustom.join(',');
                                condition += ` AND User.id IN (${userIds})`;
                            } else {
                                condition += ` AND User.id = 0`;
                            }
                        }
                    }
                }
                if (appConstant.ROLE.WCH == role_id) {
                    let userDetails = await this.userService.findOneWithTable(`User.id = ${user.id}`, ['User.id', 'User.role_id', 'User.email', 'User.org_id', 'User.membership_code', 'settings', 'User.department_id', 'User.location']);
                    const userList = await this.userService.usersDataWellness(userDetails, `User.role_id != 1 AND User.id != ${user.id} AND User.membership_code = '${user?.['membership_code']}' AND User.status =1`);
                    if (!userList || userList.length == 0) {
                        condition += ` AND User.id IN (0)`;
                    } else {
                        condition += ` AND User.id IN (${userList.map((ele) => ele.id).join(',')})`;
                    }
                }
            }
            if (requestfor === 1) {
                if (postData?.search_str) {
                    const search = postData?.search_str.toLowerCase();
                    if (moment(postData?.search_str, 'll', true).isValid()) {
                        condition += ` AND resubmitedforms.activity_date LIKE '%${moment(postData?.search_str, 'll', true).isValid() ? moment(postData?.search_str, 'll').format('YYYY-MM-DD') : ''}%'`
                    } else if (['approved', 'denied', 'pending'].includes(search)) {
                        if (search === 'pending') {
                            condition += ` AND resubmitedforms.status NOT IN (1, 2) `;
                        } else {
                            const statusMap = { approved: 1, denied: 2 };
                            condition += ` AND resubmitedforms.status = ${statusMap[search]} `;
                        }
                    }
                    else {
                        condition += ` AND (LOWER(User.first_name) LIKE '%${search}%' OR LOWER(User.last_name) LIKE '%${search}%' OR LOWER(CONCAT(User.first_name, ' ', User.last_name)) LIKE '%${search}%' OR (User.code) LIKE '%${search}%' OR (resubmitedforms.reim_amount) LIKE '%${search}%' OR (department.dept_name) LIKE '%${search}%' OR (inactivity.activity_name) LIKE '%${search}%' OR (recreateforms.act_reim_amount) LIKE '%${search}%')`;
                    }
                }
            }
            let paginate = {
                page: postData?.page || 1,
                limit: postData?.limit || appConstant.RECORD_PER_PAGE
            }
            let resultDetails = await this.reimbursementReport(condition, requestfor === 1 ? paginate : null);
            if (requestfor == 1 && resultDetails && resultDetails?.list?.length > 0 && autoRequest == 0) {
                resultDetails = await this.mapReimbursementReportField(org_id, resultDetails, requestfor, autoRequest, [], censusStatus);
                return resultDetails;
            }
            if (requestfor === 2 && resultDetails && resultDetails?.length > 0) {
                resultDetails = await this.mapReimbursementReportField(org_id, resultDetails, requestfor, autoRequest, clmNameArr, censusStatus)
                if (autoRequest == 0) {
                    resultDetails = await this.processReimbursementReportXlsx(resultDetails?.data, resultDetails?.clmNameArr || clmNameArr, org_id);
                }
                if (autoRequest == 1) {
                    resultDetails = await this.processReimbursementReportZip(resultDetails?.data, resultDetails?.clmNameArr || clmNameArr, org_id, zipPassword, report_id);
                }
                return resultDetails;
            } else {
                if (autoRequest == 1) {
                    let r_dataForUpdate = Object.create(null);
                    r_dataForUpdate['id'] = report_id;
                    r_dataForUpdate['error_message'] = 'No records found.';
                    r_dataForUpdate['status'] = '1';
                    r_dataForUpdate['updated_date'] = moment().format(
                        'YYYY-MM-DD HH:mm:ss',
                    );
                    await this.reimbursementReportService.update(
                        r_dataForUpdate,
                    );
                    return 'Report Successfully created.';
                }
                if (autoRequest == 0) {
                    throw new Error('No result found.');
                }
            }
            throw new Error('Not found');
        } catch (error) {
            console.log('error:', error);
            return {
                success: 0,
                message: error.message,
                error: 1,
            };
        }
    }
    async mapReimbursementReportField(org_id: number, resultData: any, requestfor: number = 1, autoRequest: number, clmNameArr: string[], censusStatus: number,) {
        try {
            if (requestfor == 1) {
                let resultDataList = resultData?.['list'] || [];
                if (Object.keys(resultDataList).length === 0) {
                    return { list: [], total: resultData['total'], pages: resultData['pages'], limit: resultData['limit'], page: resultData['page'] }
                } else {
                    let tempdatarows = [];
                    for (const [index, reimbursementDatas] of resultDataList.entries()) {
                        let tempdatarow = Object.create(null);
                        tempdatarow['full_name'] = `${reimbursementDatas?.User?.first_name} ${reimbursementDatas?.User?.last_name}`;
                        tempdatarow['department'] = reimbursementDatas?.User?.department?.dept_name || '';
                        tempdatarow['reimbursement_type'] = reimbursementDatas?.inactivity?.activity_name || '';
                        tempdatarow['reim_amount'] = reimbursementDatas?.reim_amount || 0;
                        tempdatarow['act_reim_amount'] = reimbursementDatas?.recreateforms?.act_reim_amount || 0;
                        tempdatarow['date'] = reimbursementDatas?.activity_date
                            ? this.commonDateService.DateTimeFormat(reimbursementDatas.activity_date, 'll')
                            : '';
                        if (reimbursementDatas.status == 1) {
                            tempdatarow['status'] = "Approved"
                        } else if (reimbursementDatas.status == 2) {
                            tempdatarow['status'] = "Denied"
                        } else {
                            tempdatarow['status'] = "Pending"
                        }
                        tempdatarows.push(tempdatarow)
                    }
                    return { list: tempdatarows, total: resultData['total'], pages: resultData['pages'], limit: resultData['limit'], page: resultData['page'] };
                }
            }
            if (requestfor == 2) {
                let censusReportField: { [key: number]: string } = Object.create(null);
                let censusFieldValue = Object.create(null);
                if (censusStatus === 1 && autoRequest == 0) {
                    if (requestfor === 2) {
                        censusReportField =
                            await this.censusCustomFieldsService.listRecordReport(
                                ['title,id'],
                                {
                                    status: 1,
                                    include_in_report: 1,
                                    organization_id: org_id,
                                },
                            );
                    }
                } else {
                    censusStatus = 0;
                }
                clmNameArr.push('Reimbursement type', 'Dollar Amount Submitted For Reimbursement', 'Maximum Amount Allowed Per Reimbursement', 'Reimbursement Submission Date', 'Reimbursement Status', 'Actual Amount Reimbursed');
                if (autoRequest == 0) {
                    if (censusStatus === 1 && Object.keys(censusReportField).length > 0) {
                        clmNameArr = [...clmNameArr, ...Object.values(censusReportField)];
                    }
                }
                if (Object.keys(resultData).length === 0) {
                    throw new Error('No result found.');
                } else {
                    let tempdatainfos = [];
                    for (const [index, reimbursementDatas] of resultData.entries()) {
                        let tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(reimbursementDatas.User, clmNameArr);
                        tempdatainfo['Reimbursement type'] = reimbursementDatas?.inactivity?.activity_name || '';
                        tempdatainfo['Dollar Amount Submitted For Reimbursement'] = reimbursementDatas?.reim_amount || 0;
                        tempdatainfo['Maximum Amount Allowed Per Reimbursement'] = reimbursementDatas?.recreateforms?.act_reim_amount || 0;
                        tempdatainfo['Reimbursement Submission Date'] = reimbursementDatas?.activity_date ? (this.commonDateService.DateTimeFormat(reimbursementDatas?.activity_date, 'MM-DD-YYYY') || '') : '';
                        tempdatainfo['Actual Amount Reimbursed'] = reimbursementDatas?.approve_reim_amount || 0;
                        if (reimbursementDatas?.status == 1) {
                            tempdatainfo['Reimbursement Status'] = 'Approved';
                        } else if (reimbursementDatas?.status == 2) {
                            tempdatainfo['Reimbursement Status'] = 'Denied';
                        } else {
                            tempdatainfo['Reimbursement Status'] = 'Pending';
                        }
                        if (censusStatus === 1) {
                            const userId = reimbursementDatas?.id;
                            if (censusFieldValue[userId]) {
                                Object.keys(censusReportField).forEach(
                                    (fieldId) => {
                                        const fieldTitle = censusReportField[fieldId];
                                        if (censusFieldValue[userId][fieldId]) {
                                            tempdatainfo[fieldTitle] = censusFieldValue[userId][fieldId] || '';
                                        } else {
                                            tempdatainfo[fieldTitle] = '';
                                        }
                                    },
                                );
                            } else {
                                Object.keys(censusReportField).forEach(
                                    (fieldId) => {
                                        tempdatainfo[censusReportField[fieldId]] = '';
                                    },
                                );
                            }
                        }
                        tempdatainfos.push(tempdatainfo);
                    }
                    return { data: tempdatainfos, clmNameArr };
                }
            }
            throw new Error('Not Found');
        } catch (err) {
            throw new Error(err.message);
        }
    }
    async processReimbursementReportXlsx(resultDetails, clmNameArr, org_id): Promise<{ file_data: string, file_name: string, extension: string }> {
        let directory = path.join(appConstant.COMPANY_REIMBURSMENT_REPORT, this.commonFileService.sanitizeFileName(org_id));
        let companyData = await this.companyService.findOne(`company.id = ${org_id}`, ['c_company_settings'], ['company.company_name', 'companySetting.census_status']);
        let fileName = `${companyData?.company_name?.replace(/[^A-Za-z0-9\-]/g, '_')}_Reimbursement_Report_${moment().format("MMDDYYYY_HHmmss")}.json`;
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
        let data: string = '';
        try {
            let writeFile = await this.commonFileService.writeFile(filePathh, jsonString, fileName);
            if (writeFile?.status == 'success') {
                let excelData: any =
                    await this.commonFileService.createJsonToFile(1, `${filePath}`, 'pythonjsontoxlsx.py');
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
        filePath = `${filePath}`.replace('.xlsx', '.json');
        await this.commonFileService.removeFileFromLocal(`${filePath}`);
        return { file_data: data, file_name: fileName, extension: 'xlsx' };
    }
    async processReimbursementReportZip(resultDetails, clmNameArr: string[], org_id: number, zipPassword: string, report_id: number): Promise<string> {
        try {
            let directory = path.join(appConstant.COMPANY_REIMBURSMENT_REPORT, this.commonFileService.sanitizeFileName(org_id));
            let companyData = await this.companyService.findOne(`company.id = ${org_id}`, ['c_company_settings'], ['company.company_name', 'companySetting.census_status'],
            );
            let fileName = `${companyData?.company_name?.replace(/[^A-Za-z0-9\-]/g, '_')}_${report_id}_Reimbursement_Report_${moment().format('MMDDYYYY_HHmmss')}.json`;
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
                            let zipPath = `automatic_report/reimbursement_reports/${report_id}/Reimbursement_report.zip`;
                            let zipPathDir = path.join(directory, fileName);
                            try {
                                await lastValueFrom(
                                    this.commonMicroservice.send(
                                        { cmd: 'upload_file' },
                                        { path: path.resolve(`${zipPathDir}`), filename: `${zipPath}`, userBucket: 'private' },
                                    ),
                                );
                            } catch (err) {
                                throw new Error('Report Not Uploaded to Bucket');
                            }
                            let resultData = Object.create(null);
                            resultData['id'] = report_id;
                            resultData['file_name'] = zipPath;
                            resultData['auto_report_zip_password'] = Buffer.from(await argon2.hash(zipPassword),).toString('base64');
                            resultData['error_message'] = '';
                            resultData['status'] = 1;
                            resultData['updated_date'] = moment().format('YYYY-MM-DD HH:mm:ss');
                            await this.reimbursementReportService.update(resultData);
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
