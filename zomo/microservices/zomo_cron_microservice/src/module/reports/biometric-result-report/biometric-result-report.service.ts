import {
    appConstant,
    BiometricOrgSettingEntity,
    CommonArrayService, CommonDateService, CommonFileService,
    CommonService, CompaniesEntity, HealthField, tableConstant, UserEntity,
} from '@common-constants';
import {
    In,
} from 'typeorm';
import { cronAppConstant, CronCommonService } from '../../../common';
import { UserService } from '../../user/user.service';
import {
    BiometricOrgSettingService,
    BiometricReportsService,
    BiometricService,
    OrgBiometricService
} from "../../biometric";
import {CompanyService} from "../../company/company.service";
import {OrgBiometricInterface} from "../../../interface";
import {BiometricsService} from "../../healthcheckup";
import {FtBiometricsService} from "../../tracker";
import {AssessmentHraBiometricService} from "../../healthassessment";
import {Inject, Injectable} from "@nestjs/common";
import {ClientProxy} from "@nestjs/microservices";
import {lastValueFrom} from "rxjs";
import * as argon2 from "argon2";
import * as path from 'path';

@Injectable()
export class BiometricResultReportService {
    constructor(
        private readonly commonService: CommonService,
        private readonly userService: UserService,
        private readonly companyService: CompanyService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly cronCommonService: CronCommonService,
        private readonly biometricService: BiometricService,
        private readonly biometricOrgSettingService: BiometricOrgSettingService,
        private readonly orgBiometricService: OrgBiometricService,
        private readonly commonDateService: CommonDateService,
        private readonly biometricsService: BiometricsService,
        private readonly ftBiometricsService: FtBiometricsService,
        private readonly assessmentHraBiometricService: AssessmentHraBiometricService,
        private readonly biometricReportsService: BiometricReportsService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) {}

    async biometricResultReport(postData: any) {
        try {
            let autoRequestId: number = 0;
            let autoRequest = (postData?.auto_request && this.commonService.isValidNumber(postData?.auto_request)) ? Number(postData?.auto_request) : 0;
            if (autoRequest == 1) {
                autoRequestId = postData?.auto_request_id;
            }
            let reporRequestData;
            if (autoRequest == 1) {
                await this.biometricReportsService.updateReport();
                reporRequestData = await this.biometricReportsService.commonQueryBuilder([],
                    `birBiometricReports.status = 0 AND company.status = 1 AND company.deleted  = 0 ${(autoRequestId && autoRequestId !== 0 && autoRequestId !== undefined) ? ' AND birBiometricReports.id = ' + autoRequestId : ''}`,
                    {'birBiometricReports.request_date': 'ASC'},
                    [{
                        join_table: 'birBiometricReports.company',
                        alias: 'company',
                        table: tableConstant.COMPANIES.TBL_COMPANY,
                        on_condition: `company.id = birBiometricReports.org_id`,
                        join_type: 'left_one',
                    }],'getOne'
                );
                if (reporRequestData) {
                    postData.file_type = 'csv';
                    postData.department_id = reporRequestData?.department_id? [reporRequestData?.department_id] : [];
                    postData.location_id = reporRequestData?.location ? [reporRequestData?.location]: reporRequestData?.location;
                    postData.org_id = reporRequestData?.org_id?.toString();
                }
            }
            let orgId = postData.org_id;
            let currentYear: number = postData.year;
            let previousYear: number = postData.year - 1;
            if (!orgId || !currentYear) {
                return {
                    success: 0,
                    data: null,
                    message: 'ERR_REQUIRED_PARAM_MISSING',
                    error: 1,
                };
            }
            let companyData: CompaniesEntity = await this.companyService.getOne({ id: orgId, status: 1, deleted: 0 },['id', 'code','status','deleted']);
            let membershipCode = companyData?.code;
            let userData: UserEntity[] = await this.userService.getAll({role_id: In([2,16]),status: 1,membership_code: membershipCode},['id','date_of_hire','employeeid','role_id','dob','gender'])
            let widgetBio = await this.orgBiometricService.commonQueryBuilder(['orgBiometric.id','orgBiometric.is_optional_type','orgBiometric.is_optional','orgBiometric.test1_start_date','orgBiometric.test1_end_date','orgBiometric.test2_start_date','orgBiometric.test2_end_date','orgBiometric.start_range_female','orgBiometric.end_range_female','orgBiometric.start_range_male','orgBiometric.end_range_male','birBiometric.id','birBiometric.start_range','birBiometric.end_range','birBiometric.biometric'],{company_id: orgId},{'orgBiometric.is_optional': 'ASC'},[{
                join_table: 'orgBiometric.birBiometric',
                alias: 'birBiometric',
                table: tableConstant.BIOMETRIC.BIR_BIOMETRIC,
                on_condition: `birBiometric.id = orgBiometric.biometric`,
                join_type: 'left_one',
            }],'getMany')
            let biometricOrgSetting: BiometricOrgSettingEntity | null = await this.biometricOrgSettingService.getOne({org_id: orgId}, ['is_required','is_hire','is_hire_date','qualifie_type','is_based','option'])
            let isRequiredTotal: number = 0;
            if (biometricOrgSetting) {
                isRequiredTotal = biometricOrgSetting?.is_required;
            }
            let headerData: string[] = cronAppConstant.BIOMETRIC_RESULT_REPORT_HEADER_DATA;
            const [PROP_0, PROP_1, PROP_2, PROP_3, PROP_4, PROP_5, PROP_6, PROP_7, PROP_8, PROP_9, PROP_10, PROP_11, PROP_12, PROP_13, PROP_14, PROP_15, PROP_16, PROP_17, PROP_18, PROP_19, PROP_20, PROP_21, PROP_22, PROP_23, PROP_24, PROP_25, PROP_26, PROP_27, PROP_28]: string[] = headerData;
            let tempDate = {}
            tempDate['1'] = [`${previousYear}-01-01`,`${previousYear}-12-31`]
            tempDate['2'] = [`${currentYear}-01-01`,`${currentYear}-12-31`]
            if (widgetBio) {
                for (let i: number = 0; i < widgetBio.length; i++) {
                    let data: OrgBiometricInterface = widgetBio[i];
                    headerData = [...headerData,...[`${data?.birBiometric?.biometric} - Pass/Fail`]]
                    widgetBio[i]['data'] = widgetBio[i]['data'] || {}
                    widgetBio[i]['data']['m'] = widgetBio[i]['data']['m'] || {}
                    widgetBio[i]['data']['f'] = widgetBio[i]['data']['f'] || {}
                    if(data['start_range_male'] == 0 && data['end_range_male'] == 0){
                        widgetBio[i]['data']['m']['start_range_male'] = data?.['birBiometric']['start_range'];
                        widgetBio[i]['data']['m']['end_range_male'] = data?.['birBiometric']['end_range'];
                    }else {
                        widgetBio[i]['data']['m']['start_range_male'] = data['start_range_male'];
                        widgetBio[i]['data']['m']['end_range_male'] = data['end_range_male'];
                    }
                    if(data['start_range_female'] != 0 && data['end_range_female'] != 0){
                        widgetBio[i]['data']['f']['start_range_male'] = data['start_range_female'];
                        widgetBio[i]['data']['f']['end_range_male'] = data['end_range_female'];
                    }
                }
                tempDate['1'] = [`${previousYear}-${await this.commonDateService.DateTimeFormat(widgetBio[0]?.['test2_start_date'], 'MM-DD')}`,`${previousYear}-${await this.commonDateService.DateTimeFormat(widgetBio[0]?.['test2_end_date'], 'MM-DD')}`]
                tempDate['2'] = [`${previousYear}-${await this.commonDateService.DateTimeFormat(widgetBio[0]?.['test1_start_date'], 'MM-DD')}`,`${previousYear}-${await this.commonDateService.DateTimeFormat(widgetBio[0]?.['test1_end_date'], 'MM-DD')}`]
                tempDate['3'] = [`${currentYear}-${await this.commonDateService.DateTimeFormat(widgetBio[0]?.['test2_start_date'], 'MM-DD')}`,`${currentYear}-${await this.commonDateService.DateTimeFormat(widgetBio[0]?.['test2_end_date'], 'MM-DD')}`]
            }

            headerData = [...headerData,...['Total Metrics Met','Pass/Fail']];
            let testResult = {}
            let medicalBenefitsEffectiveDate = '';
            if (tempDate) {
                let starts = Object.values(tempDate).map(d => d[0]);
                let ends   = Object.values(tempDate).map(d => d[1]);
                if (starts.length && ends.length) {
                    let minStart = Math.min(...starts.map(s => this.commonDateService.DateTimeFormat(new Date(s), 'timestamp')));
                    let maxEnd   = Math.max(...ends.map(e => this.commonDateService.DateTimeFormat(new Date(e), 'timestamp')));
                    let startDate = await this.commonDateService.DateTimeFormat(minStart, 'tstodate', 'YYYY-MM-DD');
                    let endDate = await this.commonDateService.DateTimeFormat(maxEnd, 'tstodate', 'YYYY-MM-DD');
                    let hcBio = await this.biometricsService.commonQueryBuilder(['biometrics.user_id','biometrics.height','biometrics.weight','biometrics.test_type','biometrics.hdl','biometrics.triglycerides','biometrics.blood_glucose','biometrics.bmi','biometrics.waist','biometrics.systolic','biometrics.diastolic','biometrics.total_cholesterol','biometrics.ldl','biometrics.alc','biometrics.created','biometrics.test_type','users.gender'],
                        `users.role_id in(2,16) AND users.membership_code = '${membershipCode}' AND DATE_FORMAT(biometrics.created,"%Y-%m-%d") >= '${startDate}' AND DATE_FORMAT(biometrics.created,"%Y-%m-%d") <= '${endDate}'`,
                        {},
                        [{
                            join_table: 'biometrics.users',
                            alias: 'users',
                            table: tableConstant.TBL_USERS,
                            on_condition: `users.id = biometrics.user_id`,
                            join_type: 'inner_one',
                        }],
                'getMany')

                    let ftBio = await this.ftBiometricsService.commonQueryBuilder(['ftBiometrics.user_id','ftBiometrics.height_ft','ftBiometrics.height_in','ftBiometrics.weight','ftBiometrics.hdl','ftBiometrics.triglycerides','ftBiometrics.weight','ftBiometrics.glucose','ftBiometrics.systolic','ftBiometrics.diastolic','ftBiometrics.chol_total','ftBiometrics.ldl','ftBiometrics.alc','ftBiometrics.added_date','ftBiometrics.glucose_type','users.gender'],
                        `users.role_id in(2,16) AND users.membership_code = '${membershipCode}' AND ftBiometrics.type = 1 AND DATE_FORMAT(ftBiometrics.added_date,"%Y-%m-%d") >= '${startDate}' AND DATE_FORMAT(ftBiometrics.added_date,"%Y-%m-%d") <= '${endDate}'`,
                        {"ftBiometrics.added_date": "DESC"},
                        [{
                            join_table: 'ftBiometrics.users',
                            alias: 'users',
                            table: tableConstant.TBL_USERS,
                            on_condition: `users.id = ftBiometrics.user_id`,
                            join_type: 'inner_one',
                        }],
                        'getMany')
                    let hraBio = await this.assessmentHraBiometricService.commonQueryBuilder(['hraBiometric.user_id','hraBiometric.height_ft','hraBiometric.height_in','hraBiometric.weight','hraBiometric.test_type','hraBiometric.hdl','hraBiometric.triglycerides','hraBiometric.weight','hraBiometric.blood_glucose','hraBiometric.waist','hraBiometric.bp_systolic','hraBiometric.bp_diastolic','hraBiometric.total_cholesterol','hraBiometric.ldl','hraBiometric.alc','hraBiometric.date','hraBiometric.test_type','users.gender'],
                        `users.role_id in(2,16) AND users.membership_code = '${membershipCode}' AND DATE_FORMAT(hraBiometric.date,"%Y-%m-%d") >= '${startDate}' AND DATE_FORMAT(hraBiometric.date,"%Y-%m-%d") <= '${endDate}'`,
                        {},
                        [{
                            join_table: 'hraBiometric.users',
                            alias: 'users',
                            table: tableConstant.TBL_USERS,
                            on_condition: `users.id = hraBiometric.user_id`,
                            join_type: 'inner_one',
                        }],
                        'getMany')

                    const addToResult = async(i, widgetBio, bioData) => {
                        let date = await this.commonDateService.DateTimeFormat(bioData.added_date,'timestamp');
                        testResult[`${i}`] = testResult[`${i}`] || {}
                        if (widgetBio) {
                            for (let k: number = 0; k < widgetBio.length; k++) {
                                let widgetBioData = widgetBio[k];
                                let biometricName = widgetBioData?.birBiometric?.biometric;
                                if (bioData?.[`${biometricName}`] && bioData?.[`${biometricName}`] != '' && bioData?.[`${biometricName}`] != 0) {
                                    if (!testResult[`${i}`]?.[bioData['user_id']]) {
                                        testResult[`${i}`][bioData['user_id']] = bioData
                                    } else {
                                        if (testResult[`${i}`]?.[bioData['user_id']][`${biometricName}`] == '' || testResult[`${i}`]?.[bioData['user_id']][`${biometricName}`] == 0) {
                                            testResult[`${i}`][bioData['user_id']][`${biometricName}`] = bioData[`${biometricName}`]
                                        } else {
                                            let addedDate = await this.commonDateService.DateTimeFormat(testResult[`${i}`][bioData['user_id']]['added_date'],'timestamp')
                                            if(addedDate <= date){
                                                testResult[`${i}`][bioData['user_id']] = {...testResult[`${i}`][bioData['user_id']], ...bioData};
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            if (!testResult[`${i}`][bioData['user_id']]) {
                                testResult[`${i}`][bioData['user_id']] = bioData
                            } else {
                                let addedDate = await this.commonDateService.DateTimeFormat(testResult[`${i}`][bioData['user_id']]['added_date'],'timestamp')
                                if(testResult[`${i}`][bioData['user_id']] && addedDate <= date){
                                    testResult[`${i}`][bioData['user_id']] = {...testResult[`${i}`][bioData['user_id']], ...bioData};
                                }
                            }
                        }
                    };

                    for (let i: number = 1; i < Object.keys(tempDate).length; i++) {

                        let startDate = await this.commonDateService.DateTimeFormat(tempDate[i][0],'timestamp')
                        let endDate = await this.commonDateService.DateTimeFormat(tempDate[i][1],'timestamp')
                        medicalBenefitsEffectiveDate = await this.commonDateService.DateTimeFormat(tempDate[i][1],'MM-DD-YYYY')
                        for (let j: number = 0; j < hcBio.length; j++) {
                            let data = hcBio[j]
                            let date = await this.commonDateService.DateTimeFormat(data.created,'timestamp')
                            if (date >= startDate &&  date <= endDate) {
                                let bioData = {
                                    'user_id' : data['user_id'],
                                    'height' : data['height'].replace(/:/g, "."),
                                    'weight' : data['weight'],
                                    'Fasting' : data['test_type'],
                                    'HDL Cholesterol' : data['hdl'],
                                    'Triglycerides' : data['triglycerides'],
                                    'Blood Glucose' : data['blood_glucose'],
                                    'Body Mass Index' : data['bmi'],
                                    'Waist Circumference' : data['waist'],
                                    'Blood Pressure - Systolic' : data['systolic'],
                                    'Blood Pressure - Diastolic' : data['diastolic'],
                                    'Total Cholesterol' : data['total_cholesterol'],
                                    'LDL Cholesterol' : data['ldl'],
                                    'A1C' : data['alc'] ? data['alc'] : 0,
                                    'added_date' : data['created'],
                                    'test_type' : data['test_type'],
                                };
                                addToResult(i, widgetBio, bioData);
                            }
                        }

                        for (let j: number = 0; j < ftBio.length; j++) {
                            let data = ftBio[j]
                            let date = await this.commonDateService.DateTimeFormat(data.added_date,'timestamp')
                            if (date >= startDate &&  date <= endDate) {
                                let bmi: number = 0;
                                if ('weight' in data && 'height_ft' in data && 'height_in' in data) {
                                    let weight: number = Number(data.weight);
                                    let ft: number = Number(data.height_ft);
                                    let inch: number = Number(data.height_in);
                                    let inFT: number = ft * 12;
                                    let totalInches: number = inFT + inch;
                                    if (totalInches * totalInches != 0) {
                                        bmi = parseFloat(((weight / (totalInches * totalInches)) * 703).toFixed(2));
                                    }
                                }

                                let bioData = {
                                    'user_id' : data['user_id'],
                                    'height' : `${data['height_ft']}.${data['height_in']}`,
                                    'weight' : data['weight'],
                                    'HDL Cholesterol' : data['hdl'],
                                    'Triglycerides' : data['triglycerides'],
                                    'Body Mass Index' : bmi,
                                    'Blood Glucose' : data['glucose'],
                                    'Blood Pressure - Systolic' : data['systolic'],
                                    'Blood Pressure - Diastolic' : data['diastolic'],
                                    'Total Cholesterol' : data['chol_total'],
                                    'Waist Circumference' : data['waist'],
                                    'LDL Cholesterol' : data['ldl'],
                                    'A1C' : data['alc'] ? data['alc'] : 0,
                                    'added_date' : data['added_date'],
                                    'test_type' : data['glucose_type'],
                                };
                                addToResult(i, widgetBio, bioData);
                            }
                        }

                        for (let j: number = 0; j < hraBio.length; j++) {
                            let data = hraBio[j]
                            let date = await this.commonDateService.DateTimeFormat(data.date,'timestamp')
                            if (date >= startDate &&  date <= endDate) {
                                let bmi: number = 0;
                                if ('weight' in data && 'height_ft' in data && 'height_in' in data) {
                                    let weight: number = Number(data.weight);
                                    let ft: number = Number(data.height_ft);
                                    let inch: number = Number(data.height_in);
                                    let inFT: number = ft * 12;
                                    let totalInches: number = inFT + inch;
                                    if (totalInches * totalInches != 0) {
                                        bmi = parseFloat(((weight / (totalInches * totalInches)) * 703).toFixed(2));
                                    }
                                }
                                let bioData = {
                                    'user_id' : data['user_id'],
                                    'height' : `${data['height_ft']}.${data['height_in']}`,
                                    'weight' : data['weight'],
                                    'Fasting' : data['test_type'],
                                    'HDL Cholesterol' : data['hdl'],
                                    'Triglycerides' : data['triglycerides'],
                                    'Body Mass Index' : bmi,
                                    'Blood Glucose' : data['blood_glucose'],
                                    'Waist Circumference' : data['waist'],
                                    'Blood Pressure - Systolic' : data['bp_systolic'],
                                    'Blood Pressure - Diastolic' : data['bp_diastolic'],
                                    'Total Cholesterol' : data['total_cholesterol'],
                                    'LDL Cholesterol' : data['ldl'],
                                    'A1C' : data['alc'] ? data['alc'] : 0,
                                    'added_date' : data['date'],
                                    'test_type' : data['test_type'],
                                };
                                addToResult(i, widgetBio, bioData);
                            }
                        }


                    }


                }
            }
            let sheetData = []

            let biometricNameObj = {'Body Mass Index':'bmi','Blood Pressure - Systolic':'systolic','Blood Pressure - Diastolic':'diastolic','LDL Cholesterol':'ldl','Triglycerides':'triglycerides','Total Cholesterol':'total_cholesterol','A1C':'alc','HDL Cholesterolf':'hdlw','HDL Cholesterolm':'hdlm','Blood Glucose':'blood_glucose','Waist Circumference':'waistm'};
            for (let i: number = 1; i < userData.length; i++) {
                let user: UserEntity = userData[i]
                let hireDate = user['date_of_hire'];
                let dateOfHireTs = this.commonDateService.DateTimeFormat(hireDate, 'timestamp')
                let isHireDateTs = this.commonDateService.DateTimeFormat(biometricOrgSetting?.is_hire_date, 'timestamp')
                if (biometricOrgSetting || biometricOrgSetting?.is_hire == 0 || isNaN(hireDate.getTime()) || dateOfHireTs <= isHireDateTs) {
                    let sheetObj = {}
                    let userId: number = user.id;
                    sheetObj[`${PROP_0}`] = user.employeeid
                    sheetObj[`${PROP_1}`] = user.role_id == 2 ? 'Employee' : 'Spouse';
                    sheetObj[`${PROP_2}`] = user.dob != '' ? await this.commonDateService.DateTimeFormat(user.dob,'MM-DD-YYYY') : '';
                    let testResult3Data = testResult?.[`${3}`]?.[userId]
                    let testResult2Data = testResult?.[`${2}`]?.[userId]
                    if(testResult3Data) {
                        sheetObj[`${PROP_3}`] = testResult[`${3}`][userId]['height'];
                        sheetObj[`${PROP_4}`] = testResult3Data['weight'];
                    }else{
                        if(testResult2Data){
                            sheetObj[`${PROP_3}`] = testResult2Data['height'];
                            sheetObj[`${PROP_4}`] = testResult2Data['weight'];
                        }else{
                            sheetObj[`${PROP_3}`] = '';
                            sheetObj[`${PROP_4}`] = '';
                        }
                    }

                    let gender: string =  user?.gender?.toUpperCase()
                    sheetObj[`${PROP_5}`] = gender;
                    sheetObj[`${PROP_6}`] = this.commonDateService.DateTimeFormat(hireDate, 'MM-DD-YYYY');
                    sheetObj[`${PROP_7}`] = medicalBenefitsEffectiveDate;
                    for (let j: number = 1; j <= 2; j++) {

                        let increase: number = 10;
                        if(j === 1){
                            increase = 0;
                            sheetObj[headerData[8 + increase]] = previousYear;
                        }else{
                            sheetObj[headerData[8 + increase]] = currentYear;
                        }
                        if(j === 2) { j = 3 }
                        let testResultData = testResult?.[`${j}`]?.[userId]
                        if (testResultData) {

                            sheetObj[headerData[9 + increase]] = this.commonDateService.DateTimeFormat(testResultData['added_date'], 'MM-DD-YYYY');
                            if(testResultData['Fasting']){
                                sheetObj[headerData[10 + increase]] = (testResultData['Fasting'] == 2) ? 'Yes' : ' ';
                            }else{
                                sheetObj[headerData[10 + increase]] = '';
                            }
                            sheetObj[headerData[11 + increase]] = testResultData['HDL Cholesterol'];
                            sheetObj[headerData[12 + increase]] = testResultData['Triglycerides'];
                            sheetObj[headerData[13 + increase]] = testResultData['Blood Glucose'];
                            sheetObj[headerData[14 + increase]] = testResultData['Body Mass Index'] ?? '';
                            sheetObj[headerData[15 + increase]] = testResultData['Waist Circumference'] ?? '';
                            sheetObj[headerData[16 + increase]] = testResultData['Blood Pressure - Systolic'];
                            sheetObj[headerData[17 + increase]] = testResultData['Blood Pressure - Diastolic'];
                        } else {
                            sheetObj[headerData[9 + increase]] = '';
                            sheetObj[headerData[10 + increase]] = '';
                            sheetObj[headerData[11 + increase]] = '';
                            sheetObj[headerData[12 + increase]] = '';
                            sheetObj[headerData[13 + increase]] = '';
                            sheetObj[headerData[14 + increase]] = '';
                            sheetObj[headerData[15 + increase]] = '';
                            sheetObj[headerData[16 + increase]] = '';
                            sheetObj[headerData[17 + increase]] = '';
                        }
                    }
                    let [secondLast, last] = headerData.slice(-2);
                    if (widgetBio.length > 0) {
                        let finalResult: string = 'Fail';
                        let RDate1CompTo:number = 0;
                        let isCompleted:number = 0;

                        for (let j: number = 0; j < widgetBio.length; j++) {
                            let widgetBioData = widgetBio[j]
                            let upGender: string = 'm';
                            let biometricName = widgetBioData?.birBiometric?.biometric
                            let testResult2 = testResult2Data?.[`${biometricName}`];
                            let testResult3 = testResult3Data?.[`${biometricName}`];
                                if(upGender && upGender != '' && (upGender == 'f' || upGender == 'F') && widgetBio['data']['f']) {
                                    upGender = 'f';
                                }
                                if(testResult2 && testResult2 != ''){
                                    RDate1CompTo++;
                                }
                                let bloodGlucoseSpecial: number = 0;
                                if(`${biometricName}` == 'Blood Glucose' && testResult3 && testResult3 !='' && testResult3 !=0 && testResult3 < 100 && testResult3Data['test_type'] != 2){
                                    bloodGlucoseSpecial = 1;
                                }

                                if(!biometricOrgSetting || biometricOrgSetting['qualifie_type']==0){
                                    if(bloodGlucoseSpecial==1 || (testResult3) && testResult3 >= widgetBioData['data'][upGender]['start_range_male'] && testResult3 <= widgetBioData['data'][upGender]['end_range_male']) {
                                        if(widgetBioData['is_optional']==0){
                                            isCompleted++;
                                        }
                                        await this.commonArrayService.addWithDuplicateKeys(sheetObj,`${biometricName} - Pass/Fail`,'Pass');
                                    }else{
                                        if(widgetBioData['is_optional']!=0 && widgetBioData['is_optional_type']==1){
                                            isCompleted--;
                                        }
                                        await this.commonArrayService.addWithDuplicateKeys(sheetObj,`${biometricName} - Pass/Fail`,'Fail');
                                    }
                                }else{
                                    if(biometricOrgSetting['qualifie_type']==1){
                                        if(testResult2 && testResult2!='' && testResult2!=0 && testResult3 && testResult3!='' && testResult3!=0 && biometricOrgSetting['option']){
                                            let goalActualstatus= 0
                                            if(`${biometricName}`=='HDL Cholesterol'){
                                                goalActualstatus = testResult2 + ((testResult2*biometricOrgSetting['option'])/100);
                                            }else{
                                                goalActualstatus = testResult2 - ((testResult2*biometricOrgSetting['option'])/100);
                                            }
                                            if(bloodGlucoseSpecial == 1 || ((`${biometricName}` == 'HDL Cholesterol' && testResult2 && testResult3 && testResult3 >= testResult2 && biometricOrgSetting['option'] && goalActualstatus &&  testResult3 >= goalActualstatus && ((testResult2 == testResult3) ? testResult3>=widgetBioData['data'][upGender]['start_range_male'] : '1')) || (`${biometricName}` != 'HDL Cholesterol' && testResult2 && testResult3 && testResult2 >= testResult3 && biometricOrgSetting['option']  && goalActualstatus &&  testResult3 <= goalActualstatus && ((testResult2 == testResult3) ? testResult3 <= widgetBioData['data'][upGender]['end_range_male'] : '1'))) ){
                                                if(widgetBioData['is_optional']==0){
                                                    isCompleted++;
                                                }
                                                await this.commonArrayService.addWithDuplicateKeys(sheetObj,`${biometricName} - Pass/Fail`,'Pass');
                                            }else{
                                                if(widgetBioData['is_optional']!=0 && widgetBioData['is_optional_type']==1){
                                                    isCompleted--;
                                                }
                                                await this.commonArrayService.addWithDuplicateKeys(sheetObj,`${biometricName} - Pass/Fail`,'Fail');
                                            }
                                        }else{
                                            if(widgetBioData['is_optional']!=0 && widgetBioData['is_optional_type']==1){
                                                isCompleted--;
                                            }
                                            await this.commonArrayService.addWithDuplicateKeys(sheetObj,`${biometricName} - Pass/Fail`,'Fail');
                                        }
                                    }else{

                                        if(biometricOrgSetting['qualifie_type']==2 || biometricOrgSetting['qualifie_type']==3){
                                            let tempH: number;
                                            let HRAstatus: number = -1;
                                            let HRAstatusT1: number = -1;

                                            if(testResult3 && testResult3!=0 && testResult3!=''){
                                                HRAstatus = this.commonService.getClassificationAchievementStatus(biometricNameObj[`${biometricName}` + ((`${biometricName}`=='HDL Cholesterol') ? upGender : '')],testResult2);
                                            }
                                            if(testResult2 && testResult2!=0 && testResult2!=''){
                                                if(biometricOrgSetting['qualifie_type']==3){
                                                    HRAstatusT1 = this.commonService.getClassificationAchievementStatus(biometricNameObj[`${biometricName}` + `${biometricName}`=='HDL Cholesterol' ? upGender : ''],testResult?.[`${1}`][userId][`${biometricName}`]);
                                                    if(`${biometricName}`=='HDL Cholesterol'){
                                                        tempH = (HRAstatusT1 >= 2) ? 2 : HRAstatusT1 + biometricOrgSetting['category_option'];
                                                        if(tempH > 2 ){ tempH = 2 }
                                                    }else{
                                                        tempH = ((HRAstatusT1 <= 0) ? 0 : ((`${biometricName}`=='A1C') ? (HRAstatusT1-2)-biometricOrgSetting['category_option'] : HRAstatusT1-biometricOrgSetting['category_option']));
                                                        if(tempH < 0 ){ tempH = 0 }
                                                    }
                                                }
                                            }
                                            let isDone: number = 0;
                                            if(HRAstatus >= 0 && biometricOrgSetting['qualifie_type']==2){
                                                if(biometricOrgSetting['is_based']==1 && testResult3 && testResult3!=0 && testResult3!=''){
                                                    if((`${biometricName}`=='HDL Cholesterol' && HRAstatus >= biometricOrgSetting['option']) || (`${biometricName}`!='HDL Cholesterol' && HRAstatus <= biometricOrgSetting['option'])){
                                                        isDone=1;
                                                    }
                                                }
                                                if(biometricOrgSetting['is_based']==0 && testResult2 && testResult3){
                                                    if(`${biometricName}`=='HDL Cholesterol' && ((HRAstatus == biometricOrgSetting['option']) ? (testResult3 <= testResult2) : (HRAstatus > biometricOrgSetting['option']))){
                                                        isDone=1;
                                                    }
                                                    if(`${biometricName}`!='HDL Cholesterol' && ((HRAstatus == biometricOrgSetting['option']) ? (testResult3 <= testResult2) : (HRAstatus < biometricOrgSetting['option']))){
                                                        isDone=1;
                                                    }
                                                }
                                            }
                                            if(HRAstatus >= 0 && biometricOrgSetting['qualifie_type']==3 && testResult2 && testResult2!=0 && testResult2!='' && testResult3 && testResult3!=0 && testResult3!=''){
                                                if(`${biometricName}`=='HDL Cholesterol' && ((HRAstatus == tempH) ? (testResult3 < testResult2) : (HRAstatus > tempH))){
                                                    isDone=1;
                                                }
                                                if(`${biometricName}`!='HDL Cholesterol' && ((HRAstatus == tempH) ? (testResult3 < testResult2) : (HRAstatus < tempH))){
                                                    isDone=1;
                                                }
                                            }
                                            if(isDone==1 || bloodGlucoseSpecial==1){
                                                if(widgetBioData['is_optional']==0){
                                                    isCompleted++;
                                                }
                                                await this.commonArrayService.addWithDuplicateKeys(sheetObj,`${biometricName} - Pass/Fail`,'Pass');
                                            }else{
                                                if(widgetBioData['is_optional']!=0 && widgetBioData['is_optional_type']==1){
                                                    isCompleted--;
                                                }
                                                await this.commonArrayService.addWithDuplicateKeys(sheetObj,`${biometricName} - Pass/Fail`,'Fail');
                                            }
                                        }
                                        if(biometricOrgSetting['qualifie_type']==4){
                                            let acceptRangecheck: number = 0;
                                            if(testResult2 && testResult2!='' && testResult2!=0 && testResult3 && testResult3!='' && testResult3!=0 && biometricOrgSetting['option']){
                                                let goalActualstatus = 0
                                                if(`${biometricName}`=='HDL Cholesterol'){
                                                    goalActualstatus = testResult2 + biometricOrgSetting['option'];
                                                }else{
                                                    goalActualstatus = testResult2 - biometricOrgSetting['option'];
                                                }
                                                if(bloodGlucoseSpecial==1 || ((`${biometricName}`=='HDL Cholesterol' && testResult2 && testResult3 && testResult3 >= testResult2 && biometricOrgSetting['option'] && goalActualstatus && ((testResult2==testResult3) ? testResult3>=widgetBioData['data'][upGender]['start_range_male'] : '1')) || (`${biometricName}`!='HDL Cholesterol' && testResult2 && testResult3 && testResult2 >= testResult3 && biometricOrgSetting['option'] && goalActualstatus &&  testResult3 <= goalActualstatus && ((testResult2==testResult3) ? testResult2<=widgetBioData['data'][upGender]['end_range_male'] : '1'))) ){
                                                    if(widgetBioData['is_optional']==0){
                                                        isCompleted++;
                                                    }
                                                    await this.commonArrayService.addWithDuplicateKeys(sheetObj,`${biometricName} - Pass/Fail`,'Pass');
                                                    acceptRangecheck = 1;
                                                }else{
                                                    if(widgetBioData['is_optional']!=0 && widgetBioData['is_optional_type']==1){
                                                        isCompleted--;
                                                    }
                                                    await this.commonArrayService.addWithDuplicateKeys(sheetObj,`${biometricName} - Pass/Fail`,'Fail');
                                                }
                                            }else{
                                                if(widgetBioData['is_optional']!=0 && widgetBioData['is_optional_type']==1){
                                                    isCompleted--;
                                                }
                                            }

                                            if(acceptRangecheck == 0){
                                                if(bloodGlucoseSpecial==1 || (testResult3 && testResult3!='' && testResult3!=0 && testResult3 >= widgetBioData['data'][upGender]['start_range_male'] && testResult3 <= widgetBioData['data'][upGender]['end_range_male'])){
                                                    if(widgetBioData['is_optional']==0){
                                                        isCompleted++;
                                                    }
                                                    await this.commonArrayService.addWithDuplicateKeys(sheetObj,`${biometricName} - Pass/Fail`,'Pass');
                                                }else{
                                                    if(widgetBioData['is_optional']!=0 && widgetBioData['is_optional_type']==1){
                                                        isCompleted--;
                                                    }
                                                    await this.commonArrayService.addWithDuplicateKeys(sheetObj,`${biometricName} - Pass/Fail`,'Fail');
                                                }
                                            }
                                        }
                                    }
                                }

                        }

                        if(biometricOrgSetting['qualifie_type']==4 && (!testResult2Data?.['Blood Pressure - Systolic']) || testResult2Data?.['Blood Pressure - Systolic']=='' && !testResult2Data?.['Blood Pressure - Diastolic'] || testResult2Data?.['Blood Pressure - Diastolic']==''){
                            isCompleted--;
                        }
                        if(biometricOrgSetting['qualifie_type']==4 && testResult2Data?.['Blood Pressure - Systolic'] && testResult2Data?.['Blood Pressure - Systolic']!='' && testResult2Data?.['Blood Pressure - Diastolic'] && testResult2Data?.['Blood Pressure - Diastolic']!='' && testResult2Data?.['Blood Pressure - Systolic'] && testResult2Data?.['Blood Pressure - Systolic']!='' && testResult2Data?.['Blood Pressure - Diastolic'] && testResult2Data?.['Blood Pressure - Diastolic']!='' && testResult2Data?.['Blood Pressure - Systolic'] < testResult2Data?.['Blood Pressure - Systolic'] && testResult2Data?.['Blood Pressure - Diastolic'] < testResult2Data?.['Blood Pressure - Diastolic']){
                            isCompleted--;
                        }
                        if(((isRequiredTotal == 0 && RDate1CompTo !=0) || (RDate1CompTo != 0 && RDate1CompTo >= isRequiredTotal)) && ((isRequiredTotal == 0 && isCompleted !=0) || (isCompleted != 0 && isCompleted >= isRequiredTotal))){
                            finalResult = 'Pass';
                        }
                        if((biometricOrgSetting['is_based']==1 || biometricOrgSetting['qualifie_type']==4) && (biometricOrgSetting['qualifie_type']==0 || biometricOrgSetting['qualifie_type']==2 || biometricOrgSetting['qualifie_type']==4) && ((isRequiredTotal == 0 && isCompleted !=0) || ( isCompleted !=0 && (isCompleted >= isRequiredTotal)))){
                            finalResult = 'Pass';
                        }

                        sheetObj[secondLast] = isCompleted;
                        sheetObj[last] = finalResult;

                    } else {
                        sheetObj[secondLast] = 0;
                        sheetObj[last] = 'Fail';
                    }

                    sheetData.push(sheetObj)
                }
            }

            const jsonString = JSON.stringify(sheetData, null, 2);
            let currnetDatetime = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD-HHmmss');
            let fileName:string = `Biometrics_Result_Report_${currnetDatetime}.json`;
            if(autoRequest){
                fileName = `Biometrics_Result_Report_${reporRequestData?.id}_${currnetDatetime}.json`;
            }
            let directory = path.join(
                appConstant.HEALTH_CHECKUP_IMAGE_PATH,
                this.commonFileService.sanitizeFileName(postData.org_id),
            );
            await this.commonFileService.dirIsExist(`${appConstant.HEALTH_CHECKUP_IMAGE_PATH}`);
            let data;
            let filePath;
            try {
                let writeFile = await this.commonFileService.writeFile(directory, jsonString, fileName);
                if (writeFile?.status == 'success') {
                    let excelData: any = await this.commonFileService.createJsonToFile(1, `${directory}/${fileName}`, 'pythonjsontocsv.py');
                    if (excelData?.status == 'success') {
                        filePath = `${directory}/${fileName}`.replace(".json",".csv");
                        if (await this.commonFileService.fileExist(filePath)) {
                            data = await this.commonFileService.FileToBase64(filePath);
                        } else {
                            throw new Error(`File does not exist`);
                        }
                    }
                } else {
                    throw new Error(`File does not exist`);
                }
            } catch(err) {
                throw new Error(`An error occurred: ${err}`);
            }
            if (autoRequest) {
                let zipPassword = await this.companyService.getCompanyZipPassword(postData?.org_id);
                if (await this.commonFileService.fileExist(filePath)) {
                    let result: any = await this.commonFileService.createPasswordProtectedZip(filePath,zipPassword.toString(),'create_zip.py',);
                    if (result?.status == 'success') {
                        filePath = filePath.replace('.csv', '.zip');
                        let zipPath = `automatic_report/biometrics_reports/${reporRequestData?.id}/Biometrics_report.zip`;
                        let zipPathDir = filePath;
                        let resultData = Object.create(null);
                        if (await this.commonFileService.fileExist(zipPathDir)) {
                            try {
                                let uploadResult = await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' },
                                        {
                                            path: path.resolve(`${zipPathDir}`),
                                            filename: `${zipPath}`,
                                            userBucket: 'private',
                                        },
                                    ),
                                );
                                if (!uploadResult) {
                                    resultData['error_message'] = 'Report Not Uploaded to Bucket';
                                }
                            } catch (err) {
                                resultData['error_message'] = 'Report Not Uploaded to Bucket';
                            }
                        } else {
                            resultData['error_message'] = 'File does not exist';
                        }
                        resultData['id'] = reporRequestData?.id;
                        resultData['file_name'] = zipPath;
                        resultData['auto_report_zip_password'] = Buffer.from(await argon2.hash(zipPassword)).toString('base64');
                        resultData['error_message'] = '';
                        resultData['status'] = 1;
                        resultData['updated_date'] =this.commonDateService.DateTimeFormat('now','YYYY-MM-DD HH:mm:ss',);
                        await this.biometricReportsService.updateRecord({ id: reporRequestData?.id },resultData);
                    } else {
                        throw new Error(`Report Not created`);
                    }
                } else {
                    throw new Error(`File does not exist`);
                }
            }
            await this.commonFileService.removeFileFromLocal(filePath);
            let encrptedData = this.commonService.passwordEncrypt(data);
            return {
                success: 1,
                data: {file_data: encrptedData,file_name: fileName, extension: 'csv'},
                error: 0,
                message: 'success'
            };
        } catch (error) {
            this.cronCommonService.errorLog(
                0,
                'biometric-result-report',
                error?.message,
                error,
            );
            return {
                success: 0,
                data: null,
                message: error.message,
                error: 1,
            };
        }
    }
}
