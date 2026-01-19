import {
    ActivityFeedsEntity,
    appConstant,
    BaseService,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    tableConstant,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { lastValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { CompanyService } from '../company/company.service';
import { UserService } from '../user/user.service';
import { ActivityReportService } from './activityreport.service';
import { FoodFeedService } from './foodfeeds.service';
import { ActivityReportInput } from './input/actitvityreport.input';
const moment = require('moment-timezone');
const path = require('path');
const argon2 = require('argon2');
@Injectable()
export class ActivityFeedService extends BaseService<ActivityFeedsEntity> {
    constructor(
        @InjectRepository(
            ActivityFeedsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaActivityFeedsRepository: Repository<ActivityFeedsEntity>,
        @InjectRepository(ActivityFeedsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaActivityFeedsRepository: Repository<ActivityFeedsEntity>,
        private readonly commonService: CommonService,
        commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
        private readonly companyService: CompanyService,
        private readonly activityReportService: ActivityReportService,
        private readonly userService: UserService,
        private readonly foodFeedService: FoodFeedService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
    ) {
        super(
            readReplicaActivityFeedsRepository,
            writeReplicaActivityFeedsRepository,
            'activityFeeds',
            commonArrayService,
        );
    }
    async findOne(condition: any) {
        return await this.readReplicaActivityFeedsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(
        condition: any,
        orderBy: any = null,
        fields: any = ['food'],
        groupBy: any = null,
        joinTable: any = [],
        schedule_id = null
    ) {
        try {
            if (!orderBy) {
                orderBy = { 'food.acId': 'DESC' };
            }
            let query = await this.readReplicaActivityFeedsRepository.createQueryBuilder('food');
            if (joinTable && joinTable.includes(tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS)) {
                query = query.leftJoinAndMapOne(
                    'food.schedulejoin',
                    tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
                    'schedulejoin',
                    `food.user_id = schedulejoin.user_id AND schedulejoin.schedule_id = '${schedule_id}'`,
                );
            }
            if (joinTable && joinTable.includes(tableConstant.CHALLENGE.TBL_CH_COMMITMENT_LEVELS)) {
                query = query.leftJoinAndMapOne(
                    'food.commitment',
                    tableConstant.CHALLENGE.TBL_CH_COMMITMENT_LEVELS,
                    'commitment',
                    `schedulejoin.trek_level_id = commitment.id`,
                );
            }
            query = query.where(condition).select(fields);
            if (groupBy) {
                groupBy =
                    groupBy == true
                        ? 'food.collectionDate, food.activityName'
                        : groupBy;
                query = query
                    .groupBy(groupBy)
                    .orderBy(
                        `${Object.keys(orderBy)[0]}`,
                        orderBy[Object.keys(orderBy)[0]],
                    );
                if (groupBy == 'food.collectionDate, food.activityName') {
                    query = query.take(10);
                }
                return await query.getRawMany();
            }
            const regex = /SUM/;
            const hasSumKey = fields.some((item) => regex.test(item));
            if (hasSumKey) {
                return await query
                    .orderBy(
                        `${Object.keys(orderBy)[0]}`,
                        orderBy[Object.keys(orderBy)[0]],
                    )
                    .getRawMany();
            }
            return await this.readReplicaActivityFeedsRepository
                .createQueryBuilder('food')
                .where(condition)
                .select(fields)
                .orderBy(
                    `${Object.keys(orderBy)[0]}`,
                    orderBy[Object.keys(orderBy)[0]],
                )
                .getMany();
        } catch (error) {
            throw new Error(error.message);
        }
    }
    async save(data: any) {
        const savedResult =
            this.writeReplicaActivityFeedsRepository.create(data);
        return await this.writeReplicaActivityFeedsRepository.insert(
            savedResult,
        );
    }
    async delete(condition: any) {
        await this.writeReplicaActivityFeedsRepository.delete(condition);
    }
    async getUserActivityData(
        condition: any,
        fields: any,
        groupBy: any = null,
        orderBy: any = null,
    ) {
        let query = await this.readReplicaActivityFeedsRepository
            .createQueryBuilder('food')
            .where(condition)
            .select(fields)
            .groupBy(groupBy);
        if (orderBy) {
            query = query.orderBy(`${orderBy}`, 'ASC');
        }
        return await query.getRawMany();
    }
    async findAllSteps(condition: any) {
        const result = await this.readReplicaActivityFeedsRepository
            .createQueryBuilder('activityFeed')
            .select('SUM(activityFeed.steps) AS steps')
            .addSelect('activityFeed.user_id')
            .addSelect('activityFeed.collectionDate')
            .where(condition)
            .groupBy('activityFeed.user_id')
            .addGroupBy('activityFeed.collectionDate')
            .orderBy('activityFeed.collectionDate')
            .getRawMany();
        return result;
    }
    async findStepsReportStream(condition: any) {
        const streamSteps = await this.readReplicaActivityFeedsRepository
            .createQueryBuilder('activityFeed')
            .select('SUM(activityFeed.steps) AS total_steps')
            .addSelect('activityFeed.user_id AS user_id')
            .addSelect('activityFeed.collectionDate AS collectionDate')
            .addSelect('activityFeed.logType AS logType')
            .addSelect('count(activityFeed.acId) as total')
            .where(condition)
            .groupBy('activityFeed.collectionDate')
            .addGroupBy('activityFeed.logType')
            .addGroupBy('activityFeed.user_id')
            .orderBy('activityFeed.collectionDate')
            .addOrderBy('activityFeed.user_id')
            .addOrderBy('activityFeed.logType')
            .stream();
        return streamSteps;
    }
    /**
     * Function of micro service for creating Activity-report
     * For auto request
     */
    async activityReport(postData: ActivityReportInput) {
        try {
            let autoRequestId: number = 0;
            let autoRequest = (postData?.auto_request && this.commonService.isValidNumber(postData?.auto_request)) ? Number(postData?.auto_request) : 0;
            if (autoRequest == 1) {
                autoRequestId = postData?.auto_request_id;
            }
            let user = Object.create(postData?.userDetails || {}) || {};
            let clmNameArr = [
                'USER CODE', 'DEPARTMENT', 'RELATIONSHIP ID', 'USERNAME', 'FIRST NAME', 'MIDDLE NAME', 'LAST NAME', 'JOB TITLE', 'GENDER', 'BIRTH DATE', 'DATE OF HIRE', 'ON HEALTH PLAN', 'HEALTH PLAN NAME', 'EMAIL', 'LOCATION', 'USER TYPE',
            ];
            let resultDetails: any
            let membershipcode: string;
            let org_id: number, report_id: number;
            let reportRequest;
            let companyid: number;
            let report_setting_id: number, report_fields: string, user_id: number, zipPassword: string;
            let formattedStartDate: string, formattedEndDate: string;
            if (autoRequest === 1) {
                await this.activityReportService.updateReport();
                reportRequest = await this.activityReportService.findOne(
                    `activityReport.status = 0 AND company.status = 1 AND company.deleted  = 0 ${(autoRequestId && autoRequestId !== 0 && autoRequestId !== undefined) ? ' AND activityReport.id = ' + autoRequestId : ''}`,
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
                            clmNameArr = Object.values(JSON.parse(report_fields));
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
                    if (appConstant.ROLE.WCH == user?.role_id) {
                        membershipcode = user?.membership_code;
                    }
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
            let condition = '';
            if (autoRequest === 1) {
                condition += `User.username IS NOT null `;
                if (reportRequest['condition']) {
                    condition += ` AND ${reportRequest['condition']}`;
                }
                const startDate = reportRequest?.['start_date_range']
                    || this.commonDateService.getTodayDate(null).format("YYYY-MM-DD 00:00:00");
                const endDate = reportRequest?.['end_date_range']
                    || this.commonDateService.getTodayDate(null).format("YYYY-MM-DD 23:59:59");
                formattedStartDate = this.commonDateService.DateTimeFormat(startDate, "YYYY-MM-DD 00:00:00", "YYYY-MM-DD HH:mm:ss");
                formattedEndDate = this.commonDateService.DateTimeFormat(endDate, "YYYY-MM-DD 23:59:59", "YYYY-MM-DD HH:mm:ss");
                if (reportRequest?.camp_id && reportRequest.camp_id !== '' && reportRequest.camp_id != 0) {
                    const usersIds = reportRequest.camp_id.split(',');
                    condition += ` AND User.id IN ("${usersIds.join('","')}")`;
                }
            }
            if (autoRequest === 0) {
                condition += `User.role_id IN (2,16) AND User.membership_code = '${membershipcode}'`;
                if (postData?.show_terminated_users?.toString() === '2') {
                    condition += ' AND User.status = 1';
                }
                if (user.role_id == appConstant.ROLE.WCH) {
                    const userList = await this.userService.usersDataWellness(user, `User.role_id != 1 AND User.id != ${user.id} AND User.membership_code = '${membershipcode}' ${postData?.show_terminated_users?.toString() === '2' ? ' AND User.status = 1' : ''}`);
                    let filteredUserList = userList && userList.length != 0 ? userList : [];
                    if (postData?.users && postData?.users.length != 0) {
                        let incomingUserList = this.commonArrayService.transformToArray(postData?.users, ',');
                        if (userList && userList.length != 0) {
                            filteredUserList = userList?.filter((ele: any) => incomingUserList.includes(String(ele.id)));
                        }
                    }
                    if (filteredUserList && filteredUserList.length != 0) {
                        condition += ` AND User.id IN (${filteredUserList.map(ele => ele.id).join(',')})`
                    }
                } else {
                    if (postData?.users && postData?.users.length != 0) {
                        let userCondition = this.commonArrayService.formatInClauseCondition(postData?.users, 'User.id');
                        if (userCondition) {
                            condition += ` AND ${userCondition}`;
                        }
                    }
                }
                formattedStartDate = this.commonDateService.DateTimeFormat(postData?.start_date || this.commonDateService.getTodayDate("YYYY-MM-DD HH:mm:ss"), "YYYY-MM-DD 00:00:00", "DD-MM-YYYY");
                formattedEndDate = this.commonDateService.DateTimeFormat(postData?.end_date || this.commonDateService.getTodayDate("YYYY-MM-DD HH:mm:ss"), "YYYY-MM-DD 23:59:59", "DD-MM-YYYY");
            }
            let usersData = await this.userService.listUDLCSRecords(
                condition,
                null,
                [
                    'User.id', 'User.code', 'User.role_id', 'User.relationship_id', 'User.username', 'User.first_name', 'User.middle_name', 'User.last_name',
                    'User.gender', 'User.dob', 'User.date_of_hire', 'User.on_insurance_plan', 'User.insurance_plan_name', 'User.email',
                    'Location.lname', 'settings.jobtitle',
                    'department.dept_name',
                    'company.company_name', 'companySetting.spouse_option',
                ],
            );
            if (usersData && usersData.length != 0) {
                const CHUNK_SIZE = 800;
                const userIds: number[] = usersData.map(user => user.id);
                const allSteps: any[] = [];
                const allFood: any[] = [];
                const allWater: any[] = [];
                for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
                    const chunk = userIds.slice(i, i + CHUNK_SIZE);
                    const placeholders = chunk.join(',');
                    let conditionFeed = `activityFeed.collectionDate BETWEEN '${formattedStartDate}' AND '${formattedEndDate}' AND activityFeed.user_id IN (${placeholders})`;
                    const stepsStream = await this.findStepsReportStream(conditionFeed)
                    for await (const row of stepsStream) {
                        allSteps.push(row);
                    }
                    let conditionFood = `food.activityTypeId = 6 AND food.collectionDate BETWEEN '${formattedStartDate}' AND '${formattedEndDate}' AND food.user_id IN (${placeholders})`;
                    const foodStream = await this.foodFeedService.findfoodReportStream(conditionFood);
                    for await (const row of foodStream) {
                        allFood.push(row);
                    }
                    let conditionWater = `food.activityTypeId = 10 AND food.collectionDate BETWEEN '${formattedStartDate}' AND '${formattedEndDate}' AND food.user_id IN (${placeholders})`;
                    const waterStream = await this.foodFeedService.findfoodReportStream(conditionWater);
                    for await (const row of waterStream) {
                        allWater.push(row);
                    }
                }
                let userInfos = await this.userDataProcess(allSteps, allFood, allWater);
                let clmNameArr1 = ['LOG DATE', 'MANUAL STEPS', 'FITBIT STEPS', 'TOTAL NUTRITION TRACKER FOOD ENTRIES', 'TOTAL NUTRITION TRACKER WATER ENTRIES', 'TOTAL EXERCISE TRACKER ENTRIES'];
                clmNameArr = [...clmNameArr, ...clmNameArr1];
                resultDetails = await this.mapActivityData(userInfos, clmNameArr, usersData);
                if (resultDetails && resultDetails.length != 0) {
                    if (autoRequest == 0) {
                        resultDetails = await this.activityReportXLSX(resultDetails, org_id, clmNameArr);
                    }
                    if (autoRequest == 1) {
                        resultDetails = await this.activityReportZip(resultDetails, org_id, clmNameArr, report_id, zipPassword);
                    }
                } else {
                    if (autoRequest == 0) {
                        throw new Error('No Records Found For Users Between Selected Date Range.');
                    }
                    if (autoRequest == 1) {
                        let r_dataForUpdate = Object.create(null);
                        r_dataForUpdate['id'] = report_id;
                        r_dataForUpdate['error_message'] = 'No records found.';
                        r_dataForUpdate['status'] = '1';
                        r_dataForUpdate['updated_date'] = moment().format('YYYY-MM-DD HH:mm:ss');
                        await this.activityReportService.update(r_dataForUpdate);
                        return 'Report Successfully created.';
                    }
                }
            } else {
                if (autoRequest == 1) {
                    let r_dataForUpdate = Object.create(null);
                    r_dataForUpdate['id'] = report_id;
                    r_dataForUpdate['error_message'] = 'No records found.';
                    r_dataForUpdate['status'] = '1';
                    r_dataForUpdate['updated_date'] = moment().format('YYYY-MM-DD HH:mm:ss');
                    await this.activityReportService.update(r_dataForUpdate);
                    return 'Report Successfully created.';
                }
                if (autoRequest == 0) {
                    throw new Error('No Records Found For Users Between Selected Date Range.');
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
    async mapActivityData(resultDetails: any, clmNameArr: string[] = [], usersData: any = []) {
        let formattedUsersData = usersData.reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
        }, {});
        let tempdatarows = [];
        if (Object.keys(resultDetails).length > 0) {
            for (const [key, usersData] of Object.entries(resultDetails)) {
                let tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(formattedUsersData[usersData?.['user_id']], clmNameArr);
                tempdatainfo['LOG DATE'] = this.commonDateService.DateTimeFormat(usersData?.['date'], 'MM-DD-YYYY');
                tempdatainfo['MANUAL STEPS'] = usersData?.['total_steps_manual'] || 0;
                tempdatainfo['FITBIT STEPS'] = usersData?.['total_steps_tracker'] || 0;
                tempdatainfo['TOTAL NUTRITION TRACKER FOOD ENTRIES'] = usersData?.['total_nut'] || 0;
                tempdatainfo['TOTAL NUTRITION TRACKER WATER ENTRIES'] = usersData?.['total_water'] || 0;
                tempdatainfo['TOTAL EXERCISE TRACKER ENTRIES'] = usersData?.['total_exe'] || 0;
                tempdatarows.push(tempdatainfo)
            }
        }
        return tempdatarows;
    }
    async activityReportXLSX(resultDetails: any, org_id: number, clmNameArr: any): Promise<{ file_data: string, file_name: string, extension: string }> {
        try {
            let directory = path.join(appConstant.COMPANY_ACTIVITY_REPORT, this.commonFileService.sanitizeFileName(org_id));
            let fileName = `${org_id}_Activity_Report_${moment().format("MMDDYYYY_HHmmss")}.json`
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
    async activityReportZip(resultDetails: any, org_id: number, clmNameArr: any, reportId: number, zipPassword: string): Promise<string> {
        try {
            let directory = path.join(appConstant.COMPANY_ACTIVITY_REPORT, this.commonFileService.sanitizeFileName(org_id));
            let fileName = `${org_id}_${reportId}_Activity_Report_${moment().format("MMDDYYYY_HHmmss")}.json`
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
                let excelData: any = await this.commonFileService.createJsonToFile(1, `${filePath}`, 'pythonjsontoxlsx.py');
                if (excelData?.status == 'success') {
                    filePath = `${filePath}`.replace('.json', '.xlsx');
                    if (await this.commonFileService.fileExist(filePath)) {
                        let result: any = await this.commonFileService.createPasswordProtectedZip(filePath, zipPassword.toString(), 'create_zip.py');
                        if (result?.status == 'success') {
                            fileName = fileName.replace('.json', '.zip');
                            let zipPath = `automatic_report/activity_reports/${reportId}/Activity_report.zip`;
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
                            await this.activityReportService.update(resultData);
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
    async userDataProcess(usersSteps: any, usersNutrationFood: any, usersNutrationWater: any) {
        const usersInfo = Object.create(null);
        usersSteps.forEach((value) => {
            let collectionDate =
                this.commonDateService.DateTimeFormat(
                    value?.collectionDate,
                    'YYYY_MM_DD',
                );
            const key = `${value?.user_id}_${collectionDate}`;
            if (!usersInfo[key]) {
                usersInfo[key] = {
                    user_id: value?.user_id,
                    date: this.commonDateService.DateTimeFormat(
                        value?.collectionDate,
                        'll',
                    ),
                    total_exe: 0,
                    total_steps_tracker: 0,
                    total_steps_manual: 0,
                };
            }
            usersInfo[key].total_exe += Number(value?.total);
            if (value?.logType === 'Tracker') {
                usersInfo[key].total_steps_tracker =
                    value.total_steps;
            }
            if (value?.logType === 'Manual') {
                usersInfo[key].total_steps_manual =
                    value?.total_steps;
            }
        });
        usersNutrationFood.forEach((value) => {
            let collectionDate =
                this.commonDateService.DateTimeFormat(
                    value?.collectionDate,
                    'YYYY_MM_DD',
                );
            const key = `${value?.user_id}_${collectionDate}`;
            if (!usersInfo[key]) {
                usersInfo[key] = {
                    user_id: value?.user_id,
                    date: this.commonDateService.DateTimeFormat(
                        value?.collectionDate,
                        'll',
                    ),
                };
            }
            usersInfo[key].total_nut = value?.total;
        });
        usersNutrationWater.forEach((value) => {
            let collectionDate =
                this.commonDateService.DateTimeFormat(
                    value?.collectionDate,
                    'YYYY_MM_DD',
                );
            const key = `${value?.user_id}_${collectionDate}`;
            if (!usersInfo[key]) {
                usersInfo[key] = {
                    user_id: value?.user_id,
                    date: this.commonDateService.DateTimeFormat(
                        value?.collectionDate,
                        'll',
                    ),
                };
            }
            usersInfo[key].total_water = value?.total;
        });
        return usersInfo;
    }
}
