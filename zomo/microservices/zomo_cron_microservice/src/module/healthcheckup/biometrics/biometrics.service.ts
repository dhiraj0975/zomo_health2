import {
    appConstant,
    AssessmentHraBiometricEntity,
    BaseService,
    BiometricsEntity,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsOrder, FindOptionsWhere, In, Repository } from 'typeorm';
import { AgeGenderReportInput } from './input/agegenderreport.input';
import { UserService } from 'src/module/user/user.service';
import { PaginateWithUserInput } from 'src/module/user/input';
import { CompanyService } from 'src/module/company/company.service';
import { AgeActivityService } from '../ageactivity/ageactivity.service';
const moment = require('moment-timezone');
const path = require('path');
@Injectable()
export class BiometricsService extends BaseService<BiometricsEntity> {
    constructor(
        @InjectRepository(
            BiometricsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaBiometricsRepository: Repository<BiometricsEntity>,
        @InjectRepository(BiometricsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaBiometricsRepository: Repository<BiometricsEntity>,
        @InjectRepository(AssessmentHraBiometricEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaHraBiometricsRepository: Repository<AssessmentHraBiometricEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonService: CommonService,
        private readonly userService: UserService,
        private readonly commonHealthService: CommonHealthService,
        private readonly commonFileService: CommonFileService,
        private readonly companyService: CompanyService,
        private readonly ageActivityService: AgeActivityService,
    ) {
        super(
            readReplicaBiometricsRepository,
            writeReplicaBiometricsRepository,
            'biometrics',
            commonArrayService,
        );
    }
    async listRecord(
        condition: any,
        orderBy: any = null,
        select: any[] = ['biometrics'],
        paginationParam: any = null,
    ) {
        if (!orderBy) {
            orderBy = { 'biometrics.id': 'DESC' };
        }
        let paginateObj = null;
        if (paginationParam) {
            paginateObj = this.commonArrayService.getPaginationVar(
                paginationParam.page || 1,
                paginationParam.limit,
            );
        }
        let query = await this.readReplicaBiometricsRepository
            .createQueryBuilder('biometrics')
            .leftJoinAndMapOne(
                'biometrics.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = biometrics.user_id AND user.role_id IN(2,16)`,
            )
            .leftJoinAndMapOne(
                'user.settings',
                tableConstant.TBL_USERS_SETTINGS,
                'settings',
                `settings.user_id = user.id`,
            )
            .leftJoinAndMapOne(
                'user.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = user.org_id`,
            )
            .leftJoinAndMapOne(
                'user.department',
                tableConstant.COMPANIES.TBL_DEPARTMENT,
                'department',
                `department.id = user.department_id`,
            )
            .leftJoinAndMapOne(
                'user.location',
                tableConstant.COMPANIES.TBL_LOCATION,
                'location',
                `location.id = user.location`,
            )
            .where(condition);
        if (condition.includes('HA_biometrics')) {
            query = query.leftJoinAndMapOne(
                'user.HA_biometrics',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS,
                'HA_biometrics',
                `HA_biometrics.user_id = user.id`,
            );
        }
        if (paginateObj) {
            query = query
                .take(paginateObj.take)
                .skip(paginateObj.skip)
                .select(select)
                .orderBy(
                    `${Object.keys(orderBy)[0]}`,
                    orderBy[Object.keys(orderBy)[0]],
                );
        }
        return paginateObj
            ? await query.getManyAndCount()
            : await query.getMany();
    }
    // for generating age and gender report
    async agegenderReport(postData: AgeGenderReportInput) {
        try {
            if (!postData?.org_id || postData?.org_id == '' || postData?.org_id == undefined || postData?.org_id == null) {
                throw new Error('A required field is missing. Please check and try again.');
            }
            let requestfor = (postData?.result_type && this.commonService.isValidNumber(postData?.result_type)) ? Number(postData?.result_type) : 0;
            let clmNameArr: string[] = [
                'USER CODE', 'ORGANIZATION', 'DEPARTMENT', 'RELATIONSHIP ID', 'USERNAME', 'FIRST NAME', 'MIDDLE NAME', 'LAST NAME', 'JOB TITLE', 'EMPLOYEE ID', 'GENDER',
                'BIRTH DATE', 'DATE OF HIRE', 'ON HEALTH PLAN', 'HEALTH PLAN NAME', 'EMAIL', 'LOCATION', 'USER TYPE',
            ];
            let condition = `Biometric.aas_form_prog IS NOT NULL AND TRIM(Biometric.aas_form_prog) <> ''`;
            let paginate = {
                page: postData?.page || 1,
                limit: postData?.limit || appConstant.RECORD_PER_PAGE,
            }
            if (postData?.org_id) {
                let membershipcodeArray = [];
                const orgIdArray = (Array.isArray(postData.org_id) ? postData.org_id : String(postData.org_id).split(','))
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
            if (postData?.show_terminated_users?.toString() === '2') {
                condition += ' AND User.status = 1';
            }
            if (postData?.submission_date) {
                condition += ` AND DATE_FORMAT(Biometric.inserted,"%Y-%m-%d") = '${this.commonDateService.DateTimeFormat(postData.submission_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
            }
            if (requestfor === 1) {
                if (postData?.search_str && postData?.search_str != '') {
                    const search = postData?.search_str?.toLowerCase() || '';
                    if (postData?.filter_by?.toLowerCase() == 'name') {
                        condition += ` AND (LOWER(User.first_name) LIKE '%${search}%' OR LOWER(User.last_name) LIKE '%${search}%')`;
                    }
                    if (postData?.filter_by?.toLowerCase() == 'usercode') {
                        condition += ` AND (User.code LIKE '%${search}%')`;
                    }
                    if (postData?.filter_by?.toLowerCase() == 'fullname') {
                        condition += ` AND (CONCAT(LOWER(User.first_name),' ',LOWER(User.last_name)) LIKE '%${search}%')`;
                    }
                    if (!postData?.filter_by) {
                        if (moment(postData?.search_str, 'MM-DD-YYYY', true).isValid()) {
                            condition += ` AND DATE_FORMAT(Biometric.inserted,"%Y-%m-%d") = '${this.commonDateService.DateTimeFormat(postData.search_str, "YYYY-MM-DD", "MM-DD-YYYY")}'`;
                        } else {
                            condition += ` AND (LOWER(User.first_name) LIKE '%${search}%' OR LOWER(User.last_name) LIKE '%${search}%' OR User.code LIKE '%${search}%' OR CONCAT(LOWER(User.first_name),' ',LOWER(User.last_name)) LIKE '%${search}%')`;
                        }
                    }
                }
            }
            let fields: string[] = [
                'User.role_id', 'User.new_password',
                'User.timezone', 'User.is_camp_eligible', 'User.department_id', 'User.location',
                'User.org_id', 'User.id', 'User.email', 'User.on_insurance_plan', 'User.employeeid',
                'User.gender', 'User.relationship_id', 'User.code', 'User.username', 'User.middle_name', 'User.dob',
                'User.date_of_hire', 'User.first_name', 'User.last_name', 'User.insurance_plan_name', 'User.status',
                'settings.jobtitle', 'settings.wphone', 'settings.hphone',
                'company.company_name', 'department.dept_name',
                'Location.lname', 'Location.address1', 'Location.city', 'Location.state', 'Location.zip', 'Location.country',
                'Biometric.id', 'Biometric.inserted', 'Biometric.aas_form_prog', 'Biometric.created', 'Biometric.user_id',
            ];
            let resultDetails: any = await this.agegenderReportData(condition, fields, requestfor == 1 ? paginate : null);
            if (!resultDetails) {
                throw new Error('No record found');
            }
            if (resultDetails) {
                resultDetails = await this.mapAgegenderData(resultDetails, requestfor, clmNameArr);
                if (requestfor == 2) {
                    resultDetails = await this.agegenderReportXLSX(resultDetails.data, resultDetails.clmNameArr);
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
    // for mapping agegender report data
    async mapAgegenderData(resultDetails, requestfor: number, clmNameArr: string[] = []) {
        let tempdatarows = [];
        let getAgeActivitys = await this.ageActivityService.listRecord(
            `ageactivity.status = 1`, 
            ['ageactivity.id', 'ageactivity.age_activity_id', 'ageactivity.title']
        );
        let assDataFormOptionsTable = {};
        getAgeActivitys.forEach(ageActivity => {
            assDataFormOptionsTable[ageActivity?.age_activity_id] = ageActivity?.title;
        });
        if (requestfor === 1) {
            let healthDataList = resultDetails?.['list'] || [];
            if (Object.keys(healthDataList).length === 0) {
                return { list: [], total: resultDetails['total'], pages: resultDetails['pages'], limit: resultDetails['limit'], page: resultDetails['page'] }
            }
            for (const [index, healthData] of healthDataList.entries()) {
                let tempdatarow = Object.create(null);
                const fullName = `${healthData?.User?.first_name} ${healthData?.User?.last_name}`;
                let screeningCompleted = [];
                if (healthData?.aas_form_prog) {
                    let aasFormProg = healthData?.aas_form_prog.split(',');
                    screeningCompleted = aasFormProg.map(item => item.trim());
                }
                tempdatarow['firstName'] = healthData?.User?.first_name || '';
                tempdatarow['lastName'] = healthData?.User?.last_name || '';
                tempdatarow['email'] = healthData?.User?.email || '';
                tempdatarow['fullName'] = fullName;
                tempdatarow['code'] = healthData?.User?.code || '';
                tempdatarow['status'] = healthData?.User?.status || '';
                tempdatarow['submissionDate'] = healthData?.inserted ? this.commonDateService.DateTimeFormat(healthData?.['inserted'], "MM-DD-YYYY", "YYYY-MM-DD") : '';
                tempdatarow['screeningCompleted'] = screeningCompleted.length || 0;
                // tempdatarow['screeningCompletedValue'] = screeningCompleted.map(item => aasFormOptions[item]).join(' / ');
                tempdatarow['screeningCompletedValue'] = screeningCompleted.map(item => assDataFormOptionsTable[item]).join(' / ');
                tempdatarows.push(tempdatarow);
            }
            return { list: tempdatarows, total: resultDetails['total'], pages: resultDetails['pages'], limit: resultDetails['limit'], page: resultDetails['page'] }
        }
        if (requestfor === 2) {
            
            if (Object.keys(resultDetails).length > 0) {
                const screeningHeaders = Object.values(assDataFormOptionsTable);
                const updatedClmNameArr = [...clmNameArr, 'Date of Submission', 'Screening Completed', ...screeningHeaders];

                for (const [index, healthData] of resultDetails.entries()) {
                    let screeningCompleted = [];
                    if (healthData?.aas_form_prog) {
                        let aasFormProg = healthData?.aas_form_prog.split(',');
                        screeningCompleted = aasFormProg.map(item => item.trim());
                    }
                    let tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(healthData?.User, clmNameArr);
                    tempdatainfo['Date of Submission'] = healthData?.inserted ? this.commonDateService.DateTimeFormat(healthData?.['inserted'], "MM-DD-YYYY", "YYYY-MM-DD") : '';
                    tempdatainfo['Screening Completed'] = screeningCompleted?.length || 0;
                    Object.keys(assDataFormOptionsTable).forEach(key => {
                        if(tempdatainfo[assDataFormOptionsTable[key]] === undefined ){
                            tempdatainfo[assDataFormOptionsTable[key]] = screeningCompleted.includes(key) ? 'Yes' : 'N/A';
                        }else{
                            // console.log(`Warning: Duplicate key detected - ${assDataFormOptionsTable[key]}`);
                            if(tempdatainfo[assDataFormOptionsTable[key]] == 'N/A'){
                                tempdatainfo[assDataFormOptionsTable[key]] = screeningCompleted.includes(key) ? 'Yes' : 'N/A';
                            }
                        }
                    });
                    tempdatarows.push(tempdatainfo);
                }
                return { data: tempdatarows, clmNameArr: updatedClmNameArr };
            }
            return { data: [], clmNameArr: clmNameArr };
        }
        return tempdatarows;
    }
    //for generating age-gender report in xlsx format
    async agegenderReportXLSX(resultDetails, clmNameArr: string[]): Promise<{ file_data: string, file_name: string, extension: string }> {
        let directory = path.join(appConstant.COMPANY_HEALTH_AGE_GENDER_REPORT);
        let fileName = `Age_Gender_Report_${moment().format('MMDDYYYY_HHmmss')}.json`;
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
    async agegenderReportData(condition: string, fields: string[], paginationParam: Partial<PaginateWithUserInput> | null = null, orderBy: object = null) {
        if (!orderBy) {
            orderBy = { code: 'ASC' };
        }
        let paginateObj: { page: number; take: number; skip: number } | null =
            null;
        if (paginationParam !== null) {
            paginateObj =
                paginationParam !== null
                    ? this.commonArrayService.getPaginationVar(
                        paginationParam.page || 1,
                        paginationParam.limit,
                    )
                    : null;
        }
        let data = this.readReplicaBiometricsRepository.createQueryBuilder('Biometric')
            .innerJoinAndMapOne(
                'Biometric.User',
                tableConstant.TBL_USERS,
                'User',
                `User.id = Biometric.user_id`,
            )
            .leftJoinAndMapOne(
                'User.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.code = User.membership_code`,
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
            );
        data = data.where(condition)
            .orderBy('Biometric.id', 'DESC')
            .select(fields);
        let resultData: string[] | object[] | { [key: string]: string | number | boolean | object };
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
    }
    async biometricsUserList(
        condition: FindOptionsWhere<BiometricsEntity> | FindOptionsWhere<BiometricsEntity>[],
        fields: string[] = [],
        orderBy: FindOptionsOrder<BiometricsEntity> = null,
        limit?: number
    ): Promise<BiometricsEntity[]> {
        if (!orderBy) {
            orderBy = { id: "DESC" };
        }
        let query = this.readReplicaBiometricsRepository
            .createQueryBuilder('biometrics')
            .where(condition);
        if (fields.length > 0) {
            query.select(fields);
        }
        if (orderBy) {
            Object.entries(orderBy).forEach(([key, value]) => {
                const order = typeof value === 'string' ? value :
                    value === 1 ? 'ASC' :
                        value === -1 ? 'DESC' : 'ASC';
                query.addOrderBy(`biometrics.${key}`, order as 'ASC' | 'DESC');
            });
        }
        if (limit) {
            query.limit(limit);
        }
        return await query.getMany();
    }
    async findList(condition: string, fields: string[] = [], limit?: number) {
        let query = this.readReplicaBiometricsRepository
            .createQueryBuilder('biometrics')
            .where(condition);
        query = query.orderBy({ 'biometrics.created': 'DESC' });
        if (fields.length > 0) {
            query = query.select(fields);
        }
        if (limit) {
            query = query.limit(limit);
        }
        return await query.getMany();
    }
     async getBiometricAdded(userId: number) {
        const subQuery1 = this.readReplicaBiometricsRepository
            .createQueryBuilder('hc')
            .select([
                'hc.alc AS alc',
                'hc.bmi AS bmi',
                'hc.systolic AS systolic',
                'hc.diastolic AS diastolic',
                'hc.total_cholesterol AS total_cholesterol',
                'hc.hdl AS hdl',
                'hc.ldl AS ldl',
                'hc.triglycerides AS triglycerides',
                'hc.blood_glucose AS blood_glucose',
                'hc.source AS source',
                'hc.created AS created'
            ])
            .where('hc.user_id = ?', [userId]);
        const subQuery2 = this.readReplicaHraBiometricsRepository
            .createQueryBuilder('ha')
            .select([
                'ha.alc AS alc',
                'TRUNCATE((ha.weight * 703) / (((ha.height_ft * 12) + ha.height_in) * ((ha.height_ft * 12) + ha.height_in)), 2) AS bmi',
                'ha.bp_systolic AS systolic',
                'ha.bp_diastolic AS diastolic',
                'ha.total_cholesterol AS total_cholesterol',
                'ha.hdl AS hdl',
                'ha.ldl AS ldl',
                'ha.triglycerides AS triglycerides',
                'ha.blood_glucose AS blood_glucose',
                'ha.source AS source',
                'ha.date AS created'
            ])
            .where('ha.user_id = ?', [userId]);

        const result = await this.readReplicaBiometricsRepository.manager
            .query(`
            SELECT biometric.created
            FROM (
                ${subQuery1.getQuery()}
                UNION ALL
                ${subQuery2.getQuery()}
            ) as biometric
            WHERE 
                (biometric.alc IS NOT NULL AND biometric.alc != '') OR
                (biometric.bmi IS NOT NULL AND biometric.bmi != '') OR
                (biometric.systolic IS NOT NULL AND biometric.systolic != '') OR
                (biometric.diastolic IS NOT NULL AND biometric.diastolic != '') OR
                (biometric.total_cholesterol IS NOT NULL AND biometric.total_cholesterol != '') OR
                (biometric.hdl IS NOT NULL AND biometric.hdl != '') OR
                (biometric.ldl IS NOT NULL AND biometric.ldl != '') OR
                (biometric.triglycerides IS NOT NULL AND biometric.triglycerides != '') OR
                (biometric.blood_glucose IS NOT NULL AND biometric.blood_glucose != '')
            ORDER BY biometric.created DESC
            LIMIT 1
        `, [userId, userId]);

        if (result && result.length > 0 && result[0].created) {
            return `${await this.commonDateService.DateTimeFormat(result[0].created, 'MM-DD-YYYY', 'YYYY-MM-DD HH:mm:ss')}`;
        }
        return '';
    }

}
