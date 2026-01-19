import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    TobaccoUsesEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TobaccoReportInput } from './input/tobaccoreport.input';
import { CompanyService } from 'src/module/company/company.service';
import { UserService } from 'src/module/user/user.service';
const moment = require('moment-timezone');
const path = require('path');
@Injectable()
export class TobaccoUsesService extends BaseService<TobaccoUsesEntity> {
    constructor(
        @InjectRepository(
            TobaccoUsesEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaTobaccoUsesRepository: Repository<TobaccoUsesEntity>,
        @InjectRepository(TobaccoUsesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaTobaccoUsesRepository: Repository<TobaccoUsesEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonService: CommonService,
        private readonly companyService: CompanyService,
        private readonly commonDateService: CommonDateService,
        private readonly userService: UserService,
        private readonly commonHealthService: CommonHealthService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(
            readReplicaTobaccoUsesRepository,
            writeReplicaTobaccoUsesRepository,
            'tobaccoUses',
            commonArrayService,
        );
    }
    // Get Tobacco Report function
    async tobaccoReport(postData: TobaccoReportInput) {
        try {
            let requestfor = (postData?.result_type && this.commonService.isValidNumber(postData?.result_type)) ? Number(postData?.result_type) : 0;
            let autoRequest = 0;
            let user = Object.create(postData?.userDetails || {}) || {};
            let org_id: number[] | number | string | string[];
            let clmNameArr: string[] = [
                'USER CODE', 'ORGANIZATION', 'DEPARTMENT', 'RELATIONSHIP ID', 'USERNAME', 'FIRST NAME', 'MIDDLE NAME', 'LAST NAME', 'JOB TITLE', 'EMPLOYEE ID', 'GENDER',
                'BIRTH DATE', 'DATE OF HIRE', 'ON HEALTH PLAN', 'HEALTH PLAN NAME', 'EMAIL', 'LOCATION', 'USER TYPE', 'Tobacco Affidavit Answer', 'Tobacco Affidavit Answer date'
            ];
            if (autoRequest == 0) {
                org_id = postData?.org_id;
                if ([appConstant.ROLE.COACH, appConstant.ROLE.GLOBALCOACH, appConstant.ROLE.WCH, appConstant.ROLE.BROKER, appConstant.ROLE.BROKERADMIN, appConstant.ROLE.REGIONALADMIN].includes(user?.role_id)) {
                    org_id = postData?.org_id;
                }
            }
            let condition = `User.role_id IN (2,16) AND User.status = 1 `;
            if (!postData?.org_id || postData?.org_id == '' || postData?.org_id == undefined || postData?.org_id == null) {
                let orgData = await this.companyService.getAll({}, ['id']);
                org_id = orgData.map(item => item.id);
            }
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
                let conditionInner = '';
                if (postData?.type && postData?.type == 'phy_tobacco') {
                    conditionInner += `b.source IN (3,11,12) AND b.user_id <> ''`
                    if (postData?.start_date && postData?.end_date) {
                        conditionInner += ` AND DATE_FORMAT(b.created,"%Y-%m-%d") BETWEEN '${this.commonDateService.DateTimeFormat(postData.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}' AND '${this.commonDateService.DateTimeFormat(postData.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                    } else if (postData?.start_date) {
                        conditionInner += ` AND DATE_FORMAT(b.created,"%Y-%m-%d") >= '${this.commonDateService.DateTimeFormat(postData.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                    } else if (postData?.end_date) {
                        conditionInner += ` AND DATE_FORMAT(b.created,"%Y-%m-%d") <= '${this.commonDateService.DateTimeFormat(postData.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                    }
                } else {

                    if (postData?.start_date && postData?.end_date) {
                        conditionInner += `DATE_FORMAT(t.date_completed,"%Y-%m-%d") BETWEEN '${this.commonDateService.DateTimeFormat(postData.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}' AND '${this.commonDateService.DateTimeFormat(postData.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                    } else if (postData?.start_date) {
                        conditionInner += `DATE_FORMAT(t.date_completed,"%Y-%m-%d") >= '${this.commonDateService.DateTimeFormat(postData.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                    } else if (postData?.end_date) {
                        conditionInner += `DATE_FORMAT(t.date_completed,"%Y-%m-%d") <= '${this.commonDateService.DateTimeFormat(postData.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
                    }
                }
                let paginate = {
                    page: postData?.page || 1,
                    limit: postData?.limit || appConstant.RECORD_PER_PAGE,
                }
                if (postData?.type && postData?.type == 'phy_tobacco') {
                    let field: string[] = [
                        'User.role_id AS user_role_id', 'User.new_password AS user_new_password',
                        'User.timezone AS user_timezone', 'User.is_camp_eligible AS user_is_camp_eligible', 'User.department_id AS user_department_id', 'User.location AS user_location',
                        'User.org_id AS user_org_id', 'User.id AS user_id', 'User.email AS user_email', 'User.on_insurance_plan AS user_on_insurance_plan','User.employeeid AS user_employeeid',
                        'User.gender AS user_gender', 'User.relationship_id AS user_relationship_id', 'User.code AS user_code', 'User.username AS user_username', 'User.middle_name AS user_middle_name', 'User.dob AS user_dob',
                        'User.date_of_hire AS user_date_of_hire', 'User.first_name AS user_first_name', 'User.last_name AS user_last_name', 'User.insurance_plan_name AS user_insurance_plan_name',
                        'settings.jobtitle AS settings_jobtitle', 'settings.wphone AS settings_wphone', 'settings.hphone AS settings_hphone',
                        'company.company_name AS company_name', 'department.dept_name AS department_name',
                        'Location.lname AS location_name', 'Location.address1 AS location_address1', 'Location.city AS location_city', 'Location.state AS location_state', 'Location.zip AS location_zip', 'Location.country AS location_country',
                    ]
                    if (requestfor === 1) {
                        if (postData?.search_str && postData?.search_str != '') {
                            const search = postData?.search_str.toLowerCase();
                            if (moment(postData?.search_str, 'MM-DD-YYYY', true).isValid()) {
                                condition += ` AND Biometric.created LIKE '%${moment(postData?.search_str, 'MM-DD-YYYY', true).format('YYYY-MM-DD')}%'`
                            }
                            else if (postData?.search_str.toLowerCase() == 'non-tobacco user') {
                                condition += ` AND Biometric.is_tobacco_user = 1`
                            }
                            else if (postData?.search_str.toLowerCase() == 'tobacco user') {
                                condition += ` AND Biometric.is_tobacco_user = 2`
                            }
                            else if (postData?.search_str.toLowerCase() == 'tuptcp') {
                                condition += ` AND Biometric.is_tobacco_user = 3`
                            }
                            else {
                                condition += ` AND (LOWER(User.first_name) LIKE '%${search}%' OR LOWER(User.last_name) LIKE '%${search}%' OR (User.code) LIKE '%${search}%' OR (User.email) LIKE '%${search}%' OR LOWER(company.company_name) LIKE '%${search}%')`;
                            }
                        }
                    }
                    let resultDetails: any = await this.userService.generateTPTHReport('phy_tobacco', condition, conditionInner, requestfor == 1 ? paginate : null, field);
                    if (!resultDetails) {
                        throw new Error('No record found');
                    }
                    if (resultDetails) {
                        resultDetails = await this.mapTobaccoData(resultDetails, requestfor, clmNameArr, 'phy_tobacco');
                        if (requestfor == 2) {
                            resultDetails = await this.tobaccoReportXLSX(resultDetails, clmNameArr);
                        }
                    }
                    return resultDetails;
                }
                if (requestfor === 1) {
                    if (postData?.search_str && postData?.search_str != '') {
                        const search = postData?.search_str.toLowerCase();
                        if (moment(postData?.search_str, 'MM-DD-YYYY', true).isValid()) {
                            condition += ` AND Tobaccouses.date_completed LIKE '%${moment(postData?.search_str, 'MM-DD-YYYY', true).format('YYYY-MM-DD')}%'`
                        } 
                        else if (postData?.search_str.toLowerCase() == 'non-tobacco user') {
                            condition += ` AND Tobaccouses.is_tobacco_user = 1`
                        }
                        else if (postData?.search_str.toLowerCase() == 'tobacco user') {
                            condition += ` AND Tobaccouses.is_tobacco_user = 2`
                        }
                        else if (postData?.search_str.toLowerCase() == 'tuptcp') {
                            condition += ` AND Tobaccouses.is_tobacco_user = 3`
                        }
                        else {
                            condition += ` AND (LOWER(User.first_name) LIKE '%${search}%' OR LOWER(User.last_name) LIKE '%${search}%' OR (User.code) LIKE '%${search}%' OR (User.email) LIKE '%${search}%' OR LOWER(company.company_name) LIKE '%${search}%')`;
                        }
                    }
                }
                let resultDetails: any = await this.userService.generateTPTHReport('tobacco', condition, conditionInner, requestfor == 1 ? paginate : null);
                if (!resultDetails) {
                    throw new Error('No record found');
                }
                if (resultDetails) {
                    resultDetails = await this.mapTobaccoData(resultDetails, requestfor, clmNameArr);
                    if (requestfor == 2) {
                        resultDetails = await this.tobaccoReportXLSX(resultDetails, clmNameArr);
                    }
                }
                return resultDetails;
            }
            throw new Error('No organization found');
        } catch (error) {
            console.log('error:', error);
            return {
                success: 0,
                message: error.message,
                error: 1,
            };
        }
    }
    async mapTobaccoData(resultDetails, requestfor: number, clmNameArr: string[] = [], type: string = '') {
        let tempdatarows = [];
        if (requestfor === 1) {
            let healthDataList = resultDetails?.['list'] || [];
            if (Object.keys(healthDataList).length === 0) {
                // return { list: [], total: resultDetails['total'], pages: resultDetails['pages'], limit: resultDetails['limit'], page: resultDetails['page'] }
                throw new Error('No record found.');
            }
            for (const [index, healthData] of healthDataList.entries()) {
                let tempdatarow = Object.create(null);
                const fullName = `${healthData?.first_name} ${healthData?.last_name}`;
                tempdatarow['firstName'] = healthData?.first_name || '';
                tempdatarow['lastName'] = healthData?.last_name || '';
                tempdatarow['email'] = healthData?.email || '';
                tempdatarow['organization'] = healthData?.company?.company_name || '';
                tempdatarow['fullName'] = fullName;
                tempdatarow['code'] = healthData?.code || '';
                tempdatarow['tobaccoStatus'] = '';
                if (type && type == 'phy_tobacco') {
                    if (healthData?.['Biometric']?.['is_tobacco_user'] == '1' || healthData?.['Biometric']?.['is_tobacco_user'] ==  0) {
                        tempdatarow['tobaccoStatus'] = "Non-tobacco user";
                    } else if (healthData?.['Biometric']?.['is_tobacco_user'] == '2') {
                        tempdatarow['tobaccoStatus'] = "Tobacco user";
                    } else if (healthData?.['Biometric']?.['is_tobacco_user'] == '3') {
                        tempdatarow['tobaccoStatus'] = "TUPTCP";
                    }
                    tempdatarow['tobaccoDate'] = healthData?.['Biometric']?.['created'] ? this.commonDateService.DateTimeFormat(healthData?.['Biometric']?.['created'], "MM-DD-YYYY", "YYYY-MM-DD") : '';
                } else {
                    if (healthData?.['Tobaccouses']?.['is_tobacco_user'] == '1' || healthData?.['Tobaccouses']?.['is_tobacco_user'] ==  0) {
                        tempdatarow['tobaccoStatus'] = "Non-tobacco user";
                    } else if (healthData?.['Tobaccouses']?.['is_tobacco_user'] == '2') {
                        tempdatarow['tobaccoStatus'] = "Tobacco user";
                    } else if (healthData?.['Tobaccouses']?.['is_tobacco_user'] == '3') {
                        tempdatarow['tobaccoStatus'] = "TUPTCP";
                    }
                    tempdatarow['tobaccoDate'] = healthData?.['Tobaccouses']?.['date_completed'] ? this.commonDateService.DateTimeFormat(healthData?.['Tobaccouses']?.['date_completed'], "MM-DD-YYYY", "YYYY-MM-DD") : '';
                }
                tempdatarows.push(tempdatarow);
            }
            return { list: tempdatarows, total: resultDetails['total'], pages: resultDetails['pages'], limit: resultDetails['limit'], page: resultDetails['page'] }
        }
        if (requestfor === 2) {
            if (Object.keys(resultDetails).length > 0) {
                for (const [index, healthData] of resultDetails.entries()) {
                    let tempdatainfo = await this.commonHealthService.CommonFieldDataCallingCovid(healthData, clmNameArr);
                    if (type && type == 'phy_tobacco') {
                        if (healthData?.['Biometric']?.['is_tobacco_user'] == '1' || healthData?.['Biometric']?.['is_tobacco_user'] == 0) {
                            tempdatainfo['Tobacco Affidavit Answer'] = "Non-tobacco user";
                        } else if (healthData?.['Biometric']?.['is_tobacco_user'] == '2') {
                            tempdatainfo['Tobacco Affidavit Answer'] = "Tobacco user";
                        } else if (healthData?.['Biometric']?.['is_tobacco_user'] == '3') {
                            tempdatainfo['Tobacco Affidavit Answer'] = "TUPTCP";
                        }
                        tempdatainfo['Tobacco Affidavit Answer date'] = healthData['Biometric']['created'] ? this.commonDateService.DateTimeFormat(healthData['Biometric']['created'], "MM-DD-YYYY", "YYYY-MM-DD") : '';
                    } else {
                        if (healthData?.['Tobaccouses']?.['is_tobacco_user'] == '1' || healthData?.['Tobaccouses']?.['is_tobacco_user'] == 0) {
                            tempdatainfo['Tobacco Affidavit Answer'] = "Non-tobacco user";
                        } else if (healthData?.['Tobaccouses']?.['is_tobacco_user'] == '2') {
                            tempdatainfo['Tobacco Affidavit Answer'] = "Tobacco user";
                        } else if (healthData?.['Tobaccouses']?.['is_tobacco_user'] == '3') {
                            tempdatainfo['Tobacco Affidavit Answer'] = "TUPTCP";
                        }
                        tempdatainfo['Tobacco Affidavit Answer date'] = healthData['Tobaccouses']['date_completed'] ? this.commonDateService.DateTimeFormat(healthData['Tobaccouses']['date_completed'], "MM-DD-YYYY", "YYYY-MM-DD") : '';
                    }
                    tempdatarows.push(tempdatainfo);
                }
                return tempdatarows
            }
            return [];
        }
        return tempdatarows;
    }
    async tobaccoReportXLSX(resultDetails, clmNameArr: string[]): Promise<{ file_data: string, file_name: string, extension: string }> {
        let directory = path.join(appConstant.COMPANY_HEALTH_TOBACCO_REPORT);
        let fileName = `Tobacco_Affidavit_Detail_Report_${moment().format('MMDDYYYY_HHmmss')}.json`;
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
}
