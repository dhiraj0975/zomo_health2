import {
    appConstant,
    CommonArrayService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    CovidReportEntity,
    tableConstant,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { lastValueFrom } from 'rxjs';
import { In, Repository } from 'typeorm';
import { CensusCustomFieldsService } from '../census/censuscustomfields.service';
import { CensusCustomFieldsValuesService } from '../census/censuscustomfieldsvalues.service';
import { CompanyService } from '../company/company.service';
import { SettingsService } from '../company/settings.service';
import { CovidReportInput } from './input/covidreport.input';
import { QuestionsService } from './questions.service';
import { UserService } from '../user/user.service';
import { CronCommonService } from 'src/common';
const moment = require('moment-timezone');
const path = require('path');
const argon2 = require('argon2');
const S3_URL = process.env.S3_URL_PROD;
@Injectable()
export class CovidReportService {
    constructor(
        @InjectRepository(
            CovidReportEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCovidReportRepository: Repository<CovidReportEntity>,
        @InjectRepository(CovidReportEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCovidReportRepository: Repository<CovidReportEntity>,
        private readonly commonService: CommonService,
        private readonly companyService: CompanyService,
        private readonly companySettingsService: SettingsService,
        private readonly censusCustomFieldsService: CensusCustomFieldsService,
        private readonly censusCustomFieldsValuesService: CensusCustomFieldsValuesService,
        private readonly questionsService: QuestionsService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
        private readonly userService: UserService,
        private readonly commonArrayService: CommonArrayService,
        private readonly cronCommonService: CronCommonService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
    ) {}
    async updateReport() {
        const result = await this.readReplicaCovidReportRepository
            .createQueryBuilder('covidReport')
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
        const mainQuery = this.writeReplicaCovidReportRepository
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
        return await this.readReplicaCovidReportRepository
            .createQueryBuilder('covidReport')
            .leftJoinAndMapOne(
                'covidReport.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = covidReport.org_id`,
            )
            .where(condition)
            .limit(1)
            .orderBy('covidReport.request_date', 'ASC')
            .getOne();
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        const queryBuilder = this.readReplicaCovidReportRepository
            .createQueryBuilder()
            .where(condition)
            .orderBy(orderBy);
        const result = await queryBuilder.getMany();
        return result;
    }
    async update(data) {
        const savedResult = this.writeReplicaCovidReportRepository.create(data);
        return await this.writeReplicaCovidReportRepository.save(savedResult);
    }
    async save(data) {
        const savedResult = this.writeReplicaCovidReportRepository.create(data);
        return await this.writeReplicaCovidReportRepository.save(savedResult);
    }
    async findWithAutoSetting(condition: any, fields: any = null) {
        const queryBuilder = this.readReplicaCovidReportRepository
            .createQueryBuilder('covidReport')
            .innerJoinAndMapOne(
                'covidReport.automaticreportSetting',
                tableConstant.REPORT.TBL_AU_AUTO_REPORT_SETTINGS,
                'automaticreportSetting',
                `automaticreportSetting.id = covidReport.report_setting_id`,
            )
            .where(condition);
        if (fields !== null) {
            queryBuilder.select(fields);
        }
        const result = await queryBuilder.getMany();
        return result;
    }
    /**
     * Function of micro service for creating Covid19-report
     * For table form data, xlsx file, auto request
     */
    async covid19Report(postData: CovidReportInput) {
        try {
            let autoRequestId: number =  0;
            let requestfor: number =
                postData?.result_type &&
                this.commonService.isValidNumber(postData?.result_type)
                    ? Number(postData?.result_type)
                    : 0;
            let autoRequest: number =
                postData?.auto_request &&
                this.commonService.isValidNumber(postData?.auto_request)
                    ? Number(postData?.auto_request)
                    : 0;
            if (autoRequest == 1) {
                autoRequestId = postData?.auto_request_id;
                requestfor = 2;
            }
            let clmNameArr: string[] = [
                'USER CODE',
                'ORGANIZATION',
                'DEPARTMENT',
                'FIRST NAME',
                'MIDDLE NAME',
                'LAST NAME',
                'ROLE TYPE',
                'JOB TITLE',
                'ON HEALTH PLAN',
                'HEALTH PLAN NAME',
                'DATE OF HIRE',
                'EMAIL',
                'WORK PHONE NUMBER',
                'HOME PHONE NUMBER',
                'LOCATION',
                'WORK ADDRESS1',
                'WORK ADDRESS2',
                'WORK CITY',
                'WORK STATE/PROVINCE',
                'WORK ZIP/POSTAL CODE',
                'WORK COUNTRY',
            ];
            let org_id: number,
                role_id: number,
                report_id: number,
                report_fields: string,
                report_setting_id: number,
                companyid: number,
                zipPassword: string;
            let reportRequest, filterCondition, filterConditionInner;
            let user = Object.create(postData?.userDetails || {}) || {};
            if (autoRequest == 0) {
                org_id = user?.org_id
                if ([appConstant.ROLE.COACH, appConstant.ROLE.GLOBALCOACH, appConstant.ROLE.WCH, appConstant.ROLE.BROKER, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(user?.role_id)) {
                    org_id = postData?.org_id
                    companyid = postData?.org_id
                }
            }
            if (postData?.type == 'superadmin') {
                user.org_id = postData?.org_id;
                org_id = postData?.org_id;
                user.membership_code = postData?.membership_code;
                companyid = postData?.org_id;
            }
            filterCondition = 'User.username IS NOT null';
            filterConditionInner = 'Coviduseranswers.user_id = User.id ';
            let paginate = null;
            if (autoRequest == 1) {
                await this.updateReport();
                reportRequest = await this.findOne(
                    `covidReport.status = 0 AND company.status = 1 AND company.deleted = 0 ${(autoRequestId && autoRequestId !== 0 && autoRequestId !== undefined) ? ' AND covidReport.id = ' + autoRequestId : ''}`,
                );
                if (reportRequest) {
                    report_setting_id = Number(
                        reportRequest?.['report_setting_id'],
                    );
                    report_id = Number(reportRequest?.['id']);
                    report_fields = reportRequest?.['report_fields'];
                    role_id = reportRequest?.['user_role'];
                    org_id = reportRequest?.['org_id'];
                    companyid = reportRequest?.['org_id'];
                    zipPassword = await this.getCompanyZipPassword(companyid);
                    if (report_setting_id !== null && report_setting_id !== 0) {
                        if (report_fields !== null) {
                            clmNameArr = Object.values(
                                JSON.parse(report_fields),
                            );
                        }
                    }
                    if (reportRequest?.report_type == 2) {
                        filterCondition += " AND Coviduseranswers.id is not null";
                        let otheroptions = JSON.parse(reportRequest?.otheroptions);
                        if (otheroptions?.are_you_caccinated && otheroptions.are_you_caccinated.toString() !== '0') {
                            if (otheroptions.are_you_caccinated.toString() === '1') {
                                filterCondition += ` AND Coviduseranswers.are_you_vaccinated = ${otheroptions.are_you_caccinated}`;
                            } else {
                                filterCondition += ` AND Coviduseranswers.are_you_vaccinated IN (2, 3)`;
                            }
                        }
                        if (otheroptions?.eligible_to_come_to_word !== undefined) {
                            if (otheroptions?.eligible_to_come_to_word?.toString() === '1') {
                                filterCondition +=
                                    " AND (Coviduseranswers.are_you_vaccinated = 1 OR (Coviduseranswers.are_you_vaccinated = 2 AND Coviduseranswers.tested_positive_covid = 2))"
                            } else {
                                filterCondition +=
                                    " AND (Coviduseranswers.are_you_vaccinated IS NULL OR Coviduseranswers.are_you_vaccinated = 0 OR Coviduseranswers.are_you_vaccinated = 3 OR (Coviduseranswers.are_you_vaccinated = 2 AND Coviduseranswers.tested_positive_covid = 1))"
                            }
                        }
                    } else {
                        filterCondition += " AND Coviduseranswers.id is null";
                    }
                    const startDateRange = reportRequest?.start_date_range;
                    const endDateRange = reportRequest?.end_date_range;
                    if (startDateRange && endDateRange) {
                        filterConditionInner += ` AND DATE_FORMAT(CONVERT_TZ(Coviduseranswers.Created, "UTC", CASE WHEN User.timezone != "" THEN User.timezone ELSE "UTC" END), "%Y-%m-%d") >= '${moment(startDateRange, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD')}'`;
                        filterConditionInner += ` AND DATE_FORMAT(CONVERT_TZ(Coviduseranswers.Created, "UTC", CASE WHEN User.timezone != "" THEN User.timezone ELSE "UTC" END), "%Y-%m-%d") <= '${moment(endDateRange, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD')}'`;
                    } else if (startDateRange) {
                        filterConditionInner += ` AND DATE_FORMAT(CONVERT_TZ(Coviduseranswers.Created, "UTC", CASE WHEN User.timezone != "" THEN User.timezone ELSE "UTC" END), "%Y-%m-%d") >= '${moment(startDateRange, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD')}'`;
                    } else if (endDateRange) {
                        filterConditionInner += ` AND DATE_FORMAT(CONVERT_TZ(Coviduseranswers.Created, "UTC", CASE WHEN User.timezone != "" THEN User.timezone ELSE "UTC" END), "%Y-%m-%d") <= '${moment(endDateRange, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD')}'`;
                    }
                    if (reportRequest?.condition) {
                        filterCondition += ` AND ${reportRequest?.condition}`;
                    }
                } else {
                    throw new Error('NOT FOUND');
                }
            }
            let censusStatus = 0;
            const companySettingData = await this.companySettingsService.findOne({ org_id: org_id }, ['id', 'org_id', 'census_status']);
            if ( companySettingData && autoRequest == 0) {
                censusStatus = companySettingData?.census_status;
            }
            if( autoRequest == 0) {
                if (postData?.show_terminated_users?.toString() === '2') {
                    filterCondition+=' AND User.status = 1';
                }
                if (postData?.rtype?.toString() === '2') {
                    filterCondition+=' AND Coviduseranswers.id is not null';
                    if (postData?.vaccinated?.toString() !== '0') {
                        if (postData?.vaccinated?.toString() === '1') {
                            filterCondition+=` AND Coviduseranswers.are_you_vaccinated = ${postData?.vaccinated}`;
                        } else {
                            filterCondition+=` AND Coviduseranswers.are_you_vaccinated IN (2, 3)`; 
                        }
                    }
                    if (postData?.eligibletowork !== undefined) {
                        if (postData?.eligibletowork?.toString() === '1') {
                            filterCondition+=
                                " AND (Coviduseranswers.are_you_vaccinated = 1 OR (Coviduseranswers.are_you_vaccinated = 2 AND Coviduseranswers.tested_positive_covid = 2))"
                        } else {
                            filterCondition+=
                                " AND (Coviduseranswers.are_you_vaccinated IS NULL OR Coviduseranswers.are_you_vaccinated = 0 OR Coviduseranswers.are_you_vaccinated = 3 OR (Coviduseranswers.are_you_vaccinated = 2 AND Coviduseranswers.tested_positive_covid = 1))"
                        }
                    }
                } else {
                    filterCondition+=' AND Coviduseranswers.id is null';
                }
                filterCondition += ` AND User.role_id IN (2, 16)`;
                filterCondition += ` AND User.membership_code = '${user?.membership_code}'`;
                if (postData?.start_date && postData?.end_date) {
                    filterConditionInner += ` AND DATE_FORMAT(CONVERT_TZ(Coviduseranswers.Created, "UTC", CASE WHEN User.timezone != "" THEN User.timezone ELSE "UTC" END), "%Y-%m-%d") >= '${moment(postData?.start_date, 'DD-MM-YYYY').format('YYYY-MM-DD')}'`;
                    filterConditionInner += ` AND DATE_FORMAT(CONVERT_TZ(Coviduseranswers.Created, "UTC", CASE WHEN User.timezone != "" THEN User.timezone ELSE "UTC" END), "%Y-%m-%d") <= '${moment(postData?.end_date, 'DD-MM-YYYY').format('YYYY-MM-DD')}'`;
                } else if (postData?.start_date) {
                    filterConditionInner += ` AND DATE_FORMAT(CONVERT_TZ(Coviduseranswers.Created, "UTC", CASE WHEN User.timezone != "" THEN User.timezone ELSE "UTC" END), "%Y-%m-%d") >= '${moment(postData?.start_date, 'DD-MM-YYYY').format('YYYY-MM-DD')}'`;
                } else if (postData?.end_date) {
                    filterConditionInner += ` AND DATE_FORMAT(CONVERT_TZ(Coviduseranswers.Created, "UTC", CASE WHEN User.timezone != "" THEN User.timezone ELSE "UTC" END), "%Y-%m-%d") <= '${moment(postData?.end_date, 'DD-MM-YYYY').format('YYYY-MM-DD')}'`;
                }
                if (role_id !== appConstant.ROLE.WCH) {
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
                if (censusStatus == 1) {
                    let conditionCensu = [];
                    if (
                        postData.custom_field &&
                        typeof postData?.custom_field === 'string'
                    ) {
                        postData.custom_field = JSON.parse(
                            postData?.custom_field,
                        );
                    }
                    if (
                        postData.custom_field &&
                        typeof postData?.custom_field === 'object'
                    ) {
                        postData.custom_field = Object.fromEntries(
                            Object.entries(postData?.custom_field).filter(
                                ([key, value]) =>
                                    typeof value === 'string' &&
                                    value.match(/^[a-zA-Z0-9 @\-_&$%]+$/),
                            ),
                        );
                    }
                    if (
                        postData?.custom_field &&
                        Object.keys(postData?.custom_field).length > 0
                    ) {
                        for (const [key, value] of Object.entries(
                            postData?.custom_field,
                        )) {
                            if (
                                typeof value === 'string' &&
                                /^[a-zA-Z0-9 @\-_&$%]+$/.test(value)
                            ) {
                                conditionCensu.push(
                                    `user_id IN (SELECT user_id FROM c_census_custom_fields_values WHERE ((\`field_value\` LIKE '%${value}%') AND \`field_id\` = ${key}))`,
                                );
                            }
                        }
                        if (conditionCensu.length > 0) {
                            let Censuscustom =
                                await this.censusCustomFieldsValuesService.findDistinctUserIds(
                                    conditionCensu,
                                );
                            if (Censuscustom && Censuscustom.length > 0) {
                                const userIds = Censuscustom.join(',');
                                filterCondition += ` AND User.id IN (${userIds})`;
                            } else {
                                filterCondition += ` AND User.id = 0`;
                            }
                        }
                    }
                }
                if (user.role_id == appConstant.ROLE.WCH) {
                    let userDetails = await this.userService.findOneWithTable(`User.id = ${user.id}`, ['User.id', 'User.role_id','User.email','User.org_id', 'User.membership_code','settings','User.department_id','User.location']);
                    const userList = await this.userService.usersDataWellness(userDetails, `User.role_id != 1 AND User.id != ${user.id} AND User.membership_code = '${user?.['membership_code']}' AND User.status =1`);
                    if (!userList || userList.length == 0) {
                        filterCondition += ` AND User.id IN (0)`;
                    } else {
                        filterCondition += ` AND User.id IN (${userList.map((ele) => ele.id).join(',')})`;
                    }
                }
                if (postData?.search_str && requestfor == 1) {
                    const search = postData?.search_str.toLowerCase();
                    if (moment(postData?.search_str, 'll', true).isValid()) {
                        filterCondition += ` AND Coviduseranswers.created LIKE '%${moment(postData?.search_str, 'll', true).isValid() ? moment(postData?.search_str, 'll').format('YYYY-MM-DD') : ''}%'`;
                    } else {
                        filterCondition += ` AND (LOWER(User.first_name) LIKE '%${search}%' OR LOWER(User.last_name) LIKE '%${search}%' OR LOWER(CONCAT(User.first_name, ' ', User.last_name)) LIKE '%${search}%' OR (User.code) LIKE '%${search}%')`;
                    }
                }
                paginate = {
                    page: postData?.page || 1,
                    limit: postData?.limit || appConstant.RECORD_PER_PAGE
                }
            }
            let Coviduseranswers = await this.userService.covidReportData(filterCondition, filterConditionInner, requestfor == 1 ? paginate : null)
            let resultDetails;
            if (requestfor == 1 && Coviduseranswers && Coviduseranswers?.list?.length > 0 && autoRequest == 0) {
                resultDetails = await this.mapcovidReportField(org_id, Coviduseranswers, requestfor, autoRequest, role_id, [], censusStatus);
                return resultDetails;
            }
            if (requestfor === 2 && Coviduseranswers && Coviduseranswers?.length > 0) {
                resultDetails = await this.mapcovidReportField(org_id, Coviduseranswers, requestfor, autoRequest, role_id, clmNameArr, censusStatus)
                if (autoRequest == 0) {
                    resultDetails = await this.processCovidReportXlsx(resultDetails?.data, resultDetails?.clmNameArr || clmNameArr, org_id);
                }
                if (autoRequest == 1) {
                    resultDetails = await this.processCovidReportZip(resultDetails?.data, resultDetails?.clmNameArr || clmNameArr, org_id, zipPassword, report_id);
                }
                return resultDetails;
            }
            throw new Error('Not found');
        } catch (err) {
            console.log('error:', err);
            return {
                success: 0,
                message: err.message,
                error: 1,
            };
        }
    }
    async getCompanyZipPassword(cId) {
        try {
            let result = await this.companyService.findOne(
                `company.id = ${cId}`,
                ['c_company_meta'],
                [
                    'company.id',
                    'company.code',
                    'companyMeta.zip_report_password',
                ],
            );
            result = this.commonService.mergeCompanyTables(result);
            if (
                result &&
                result.zip_report_password &&
                result.zip_report_password !== ''
            ) {
                return result.zip_report_password;
            } else {
                return `${result.code}_${result.id}`;
            }
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async mapcovidReportField(
        org_id,
        Coviduseranswers,
        requestfor = 1,
        autoRequest,
        role_id,
        clmNameArr,
        censusStatus,
    ) {
        try {
            if (requestfor == 1) {
                let CoviduseranswersList = Coviduseranswers?.['list'] || [];
                if (Object.keys(CoviduseranswersList).length === 0) {
                    throw new Error('No result found.');
                } else {
                    let Covidquestions =
                        await this.questionsService.questionData(
                            `questions.status = 1 ANd questions.org_id = ${org_id}`,
                            [
                                'questions.id',
                                'questions.title',
                                'CovidAnswer.id',
                                'CovidAnswer.title',
                            ],
                        );
                    const Covidanswer = Covidquestions.reduce((acc, item) => {
                        item?.['CovidAnswer'].forEach((answer) => {
                            acc[answer.id] = answer.title;
                        });
                        return acc;
                    }, {});
                    let tempdatarows = [];
                    for (const [
                        index,
                        Coviduseranswersdata,
                    ] of CoviduseranswersList.entries()) {
                        let tempdatarow = Object.create(null);
                        const fullName = `${Coviduseranswersdata?.first_name} ${Coviduseranswersdata?.last_name}`;
                        tempdatarow['fullName'] = fullName;
                        tempdatarow['code'] = Coviduseranswersdata?.code;
                        if (Coviduseranswersdata?.['Coviduseranswers']?.id) {
                            let useranswer = JSON.parse(
                                Coviduseranswersdata?.['Coviduseranswers']
                                    ?.question_answers,
                            );
                            if (
                                !useranswer ||
                                typeof useranswer !== 'object' ||
                                Array.isArray(useranswer)
                            ) {
                                useranswer = [];
                            }
                            let tempdata = {};
                            Covidquestions.forEach((item) => {
                                const questionId = item.id;
                                const answerId = useranswer[questionId];
                                tempdata[questionId] =
                                    answerId && Covidanswer[answerId]
                                        ? Covidanswer[answerId]
                                        : '-';
                            });
                            if (Object.values(tempdata).includes('Yes')) {
                                tempdatarow['result'] = 'Fail';
                            } else {
                                tempdatarow['result'] = 'Pass';
                            }
                            const createdTimeUTC =
                                Coviduseranswersdata?.['Coviduseranswers']
                                    .created;
                            const userTimezone =
                                Coviduseranswersdata?.timezone || 'UTC';
                            const convertedTime = moment
                                .utc(createdTimeUTC)
                                .tz(userTimezone);
                            tempdatarow['date'] = convertedTime.format('ll');
                            tempdatarow['time'] =
                                convertedTime.format('hh:mm:ss A');
                        } else {
                            tempdatarow['result'] = '-';
                            tempdatarow['date'] = '-';
                            tempdatarow['time'] = '-';
                        }
                        tempdatarows.push(tempdatarow);
                    }
                    let result = {
                        list: tempdatarows,
                        total: Coviduseranswers['total'],
                        pages: Coviduseranswers['pages'],
                        limit: Coviduseranswers['limit'],
                        page: Coviduseranswers['page'],
                    };
                    return result;
                }
            }
            if (requestfor == 2) {
                let censusReportField = Object.create(null);
                let censusReportFieldTemp = Object.create(null);
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
                        censusReportFieldTemp = Object.fromEntries(
                            Object.keys(censusReportField).map((key) => [Number(key), ''])
                        );
                    }
                } else {
                    censusStatus = 0;
                }
                if(autoRequest == 0){
                    if (censusStatus === 1 && Object.keys(censusReportField).length > 0) {
                        clmNameArr = [...clmNameArr, ...Object.values(censusReportField)];
                    }
                }
                if (Object.keys(Coviduseranswers).length === 0) {
                    throw new Error('No result found.');
                } else {

                    let Covidquestions = await this.questionsService.questionData(`questions.status = 1 ANd questions.org_id = ${org_id}`, ['questions.id', 'questions.title', 'CovidAnswer.id', 'CovidAnswer.title'])
                    const Covidanswer = Covidquestions.reduce((acc, item) => {
                        item?.['CovidAnswer'].forEach((answer) => {
                            acc[answer.id] = answer.title;
                        });
                        return acc;
                    }, {});
                    const clmNameArr1 = [
                        'Result',
                        'Date',
                        'Time',
                        'Are you Vaccinated',
                        'Vaccination Type',
                        'Vaccination record',
                        'Last Vaccination Date',
                        'Covid test Positive',
                        'Covid Test Report',
                        'Last Report Date',
                    ];
                    if (
                        role_id === 11 &&
                        censusStatus === 1 &&
                        Object.keys(censusReportField).length > 0
                    ) {
                        let censusReportFieldKeys =
                            Object.keys(censusReportField);
                        let censusReportFieldIds = Coviduseranswers.map(
                            (answer) => answer?.id,
                        ).filter((id) => id !== undefined);
                        censusFieldValue =
                            await this.censusCustomFieldsValuesService.listRecordReport(
                                ['user_id', 'field_value', 'field_id'],
                                {
                                    field_id: In(censusReportFieldKeys),
                                    user_id: In(censusReportFieldIds),
                                },
                            );
                    }
                    clmNameArr = [...clmNameArr, ...clmNameArr1];
                    if (Covidquestions && Covidquestions.length > 0) {
                        Covidquestions.forEach((Covidquestionsdata) => {
                            const que_show = Covidquestionsdata?.[
                                'CovidAnswer'
                            ].reduce((acc, answer) => {
                                acc[answer.id] = answer.title;
                                return acc;
                            }, {});
                            if (Object.keys(que_show).length > 0) {
                                clmNameArr.push(Covidquestionsdata?.title);
                            }
                        });
                    }
                    let tempdatainfos = [];
                    for (const [
                        Coviduseranswerskey,
                        Coviduseranswersdata,
                    ] of Coviduseranswers.entries()) {
                        let tempdatainfo =
                            await this.commonHealthService.CommonFieldDataCallingCovid(
                                Coviduseranswersdata,
                                clmNameArr,
                            );
                        if (
                            Coviduseranswersdata?.['Coviduseranswers']?.id &&
                            Coviduseranswersdata?.['Coviduseranswers']?.id !==
                                ''
                        ) {
                            let useranswer = JSON.parse(
                                Coviduseranswersdata?.['Coviduseranswers']
                                    ?.question_answers,
                            );
                            if (
                                !useranswer ||
                                typeof useranswer !== 'object' ||
                                Array.isArray(useranswer)
                            ) {
                                useranswer = [];
                            }
                            let tempdata = Object.create(null);
                            Covidquestions.forEach((item) => {
                                const questionId = item.id;
                                tempdata[questionId] =
                                    useranswer[questionId] &&
                                    Covidanswer[useranswer[questionId]]
                                        ? Covidanswer[useranswer[questionId]]
                                        : '-';
                            });
                            if (Object.values(tempdata).includes('Yes')) {
                                tempdatainfo['Result'] = 'Fail';
                            } else {
                                tempdatainfo['Result'] = 'Pass';
                            }
                            const createdTimeUTC =
                                Coviduseranswersdata?.['Coviduseranswers']
                                    .created;
                            const userTimezone =
                                Coviduseranswersdata?.timezone || 'UTC';
                            const convertedTime = moment
                                .utc(createdTimeUTC)
                                .tz(userTimezone);
                            tempdatainfo['Date'] =
                                convertedTime.format('MM-DD-YYYY');
                            tempdatainfo['Time'] =
                                convertedTime.format('hh:mm:ss A');
                            let view_certificate_button = '';
                            let vaccinated_are_you = '';
                            if (
                                Coviduseranswersdata?.['Coviduseranswers']
                                    ?.are_you_vaccinated
                            ) {
                                if (
                                    Coviduseranswersdata?.['Coviduseranswers']
                                        ?.are_you_vaccinated == 1
                                ) {
                                    vaccinated_are_you = 'Yes';
                                    if (
                                        Coviduseranswersdata?.[
                                            'Coviduseranswers'
                                        ]?.vecctionationrecord
                                    ) {
                                        view_certificate_button =
                                            S3_URL +
                                            'Covid/img/covidrecord/' +
                                            Coviduseranswersdata?.[
                                                'Coviduseranswers'
                                            ]?.vecctionationrecord;
                                    }
                                } else if (
                                    Coviduseranswersdata?.['Coviduseranswers']
                                        ?.are_you_vaccinated == 2
                                ) {
                                    vaccinated_are_you = 'No';
                                } else {
                                    vaccinated_are_you = 'Decline to answer';
                                }
                            }
                            let tested_positive = '';
                            let view_test_certificate_button = '';
                            if (
                                Coviduseranswersdata?.['Coviduseranswers']
                                    ?.tested_positive_covid
                            ) {
                                tested_positive =
                                    Coviduseranswersdata?.['Coviduseranswers']
                                        ?.tested_positive_covid == 1
                                        ? 'Yes'
                                        : 'No';
                                if (
                                    Coviduseranswersdata?.['Coviduseranswers']
                                        ?.testpositivecertificate
                                ) {
                                    view_test_certificate_button =
                                        S3_URL +
                                        'Covid/img/covidcertificate/' +
                                        Coviduseranswersdata?.[
                                            'Coviduseranswers'
                                        ]?.testpositivecertificate;
                                }
                            }
                            tempdatainfo['Are you Vaccinated'] =
                                vaccinated_are_you || '';
                            tempdatainfo['Vaccination Type'] =
                                Coviduseranswersdata?.['Covidvaccinationtyp']
                                    ?.title || '';
                            tempdatainfo['Vaccination record'] =
                                view_certificate_button || '';
                            tempdatainfo['Last Vaccination Date'] =
                                tempdatainfo['Last Vaccination Date'] = moment(
                                    Coviduseranswersdata?.['Coviduseranswers']
                                        ?.lastvaccinationdate,
                                ).isValid()
                                    ? moment(
                                          Coviduseranswersdata[
                                              'Coviduseranswers'
                                          ].lastvaccinationdate,
                                      ).format('MM-DD-YYYY')
                                    : '';
                            tempdatainfo['Covid test Positive'] =
                                tested_positive || '';
                            tempdatainfo['Covid Test Report'] =
                                view_test_certificate_button || '';
                            tempdatainfo['Last Report Date'] = moment(
                                Coviduseranswersdata?.['Coviduseranswers']
                                    ?.lastreportdate,
                            ).isValid()
                                ? moment(
                                      Coviduseranswersdata?.['Coviduseranswers']
                                          ?.lastreportdate,
                                  ).format('MM-DD-YYYY')
                                : '';
                        } else {
                            tempdatainfo['Result'] = '';
                            tempdatainfo['Date'] = '';
                            tempdatainfo['Time'] = '';
                            tempdatainfo['Are you Vaccinated'] = '';
                            tempdatainfo['Vaccination Type'] = '';
                            tempdatainfo['Vaccination record'] = '';
                            tempdatainfo['Last Vaccination Date'] = '';
                            tempdatainfo['Covid test Positive'] = '';
                            tempdatainfo['Covid Test Report'] = '';
                            tempdatainfo['Last Report Date'] = '';
                        }
                        let userAnswers = JSON.parse(
                            Coviduseranswersdata?.['Coviduseranswers']
                                ?.question_answers || '{}',
                        );
                        if (
                            !userAnswers ||
                            typeof userAnswers !== 'object' ||
                            Array.isArray(userAnswers)
                        ) {
                            userAnswers = [];
                        } else {
                            userAnswers = Object.values(userAnswers).map(
                                (key) => key,
                            );
                        }
                        if (Covidquestions && Covidquestions.length > 0) {
                            Covidquestions.forEach((CovidQuestion) => {
                                const options = CovidQuestion?.[
                                    'CovidAnswer'
                                ].reduce((acc, answer) => {
                                    acc[answer.id] = answer.title;
                                    return acc;
                                }, {});
                                if (Object.keys(options).length > 0) {
                                    const matchedValues = Object.entries(
                                        options,
                                    )
                                        .filter(([key]) =>
                                            userAnswers.includes(key),
                                        )
                                        .map(([, value]) => value);
                                    tempdatainfo[`${CovidQuestion?.title}`] =
                                        matchedValues.length > 0
                                            ? matchedValues.join(' ')
                                            : '';
                                }
                            });
                        }
                        if (censusStatus === 1) {
                            const userId = Coviduseranswersdata?.id;
                            if (censusFieldValue[userId]) {
                                Object.keys(censusReportField).forEach((fieldId) => {
                                    const fieldTitle = censusReportField[fieldId];
                                    if (censusFieldValue[userId][fieldId]) {
                                        tempdatainfo[fieldTitle] = censusFieldValue[userId][fieldId] || '';
                                    }
                                    else {
                                        tempdatainfo[fieldTitle] = ''
                                    }
                                });
                            } else {
                                Object.keys(censusReportField).forEach(
                                    (fieldId) => {
                                        tempdatainfo[
                                            censusReportField[fieldId]
                                        ] = '';
                                    },
                                );
                            }
                        }
                        tempdatainfos.push(tempdatainfo);
                    }
                    return {data:tempdatainfos, clmNameArr};
                }
            }
            throw new Error('Not Found');
        } catch (err) {
            throw new Error(err.message);
        }
    }
    async processCovidReportXlsx(resultDetails, clmNameArr, org_id) :Promise<{ file_data: string, file_name: string, extension: string }>{
        let directory = path.join(
            appConstant.COMPANY_COVID19_REPORT,
            this.commonFileService.sanitizeFileName(org_id),
        );
        let companyData = await this.companyService.findOne(
            `company.id = ${org_id}`,
            ['c_company_settings'],
            ['company.company_name', 'companySetting.census_status'],
        );
        let fileName = `${companyData?.company_name?.replace(/[^A-Za-z0-9\-]/g, '_')}_COVID19_Report_${moment().format('MMDDYYYY_HHmmss')}.json`;
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
    async processCovidReportZip(
        resultDetails,
        clmNameArr: string[],
        org_id : number,
        zipPassword: string,
        report_id: number,
    ): Promise<string> {
        try {
            let directory = path.join(
                appConstant.COMPANY_COVID19_REPORT,
                this.commonFileService.sanitizeFileName(org_id),
            );
            let companyData = await this.companyService.findOne(
                `company.id = ${org_id}`,
                ['c_company_settings'],
                ['company.company_name', 'companySetting.census_status'],
            );
            let fileName = `${companyData?.company_name?.replace(/[^A-Za-z0-9\-]/g, '_')}__${report_id}COVID19_Report_${moment().format('MMDDYYYY_HHmmss')}.json`;
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
                            let zipPath = `automatic_report/covid19_reports/${report_id}/Covid19_report.zip`;
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
                            await this.update(resultData);
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
