import { appConstant, CommonArrayService, CommonDateService, CommonFileService, CommonHealthService, CommonService, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { CompanyService } from 'src/module/company/company.service';
import { UserService } from 'src/module/user/user.service';
import { AggregateReportInput } from './input/aggregatereport.input';
import { In } from 'typeorm';
const moment = require('moment-timezone');
const path = require('path');
@Injectable()
export class AggregateReportService {
    constructor(
        private readonly commonArrayService: CommonArrayService,
        private readonly commonService: CommonService,
        private readonly companyService: CompanyService,
        private readonly userService: UserService,
        private readonly commonHealthService: CommonHealthService,
        private readonly commonFileService: CommonFileService,
        private readonly commonDateService: CommonDateService,
    ) {
    }
    async aggregateReport(postData: AggregateReportInput) {
        try {
            if (!postData?.org_id || postData?.org_id == '' || postData?.org_id == undefined || postData?.org_id == null) {
                throw new Error('A required field is missing. Please check and try again.');
            }
            let requestfor = (postData?.result_type && this.commonService.isValidNumber(postData?.result_type)) ? Number(postData?.result_type) : 0;
            let org_id: number[] | number | string | string[];
            let clmNameArr: string[] = [
                'USER CODE', 'ORGANIZATION', 'DEPARTMENT', 'RELATIONSHIP ID', 'USERNAME', 'FIRST NAME', 'MIDDLE NAME', 'LAST NAME', 'JOB TITLE',
                'EMPLOYEE ID', 'GENDER', 'BIRTH DATE', 'DATE OF HIRE', 'ON HEALTH PLAN', 'HEALTH PLAN NAME', 'EMAIL', 'LOCATION', 'USER TYPE',
            ];
            org_id = postData?.org_id;
            let condition = `User.role_id IN (2,16) AND User.status = 1`;
            if (org_id) {
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
                if (membershipcodeArray.length > 0) {
                    condition += ` AND User.membership_code IN ('${membershipcodeArray.map(item => item.code).join("','")}')`;
                }
            }
            if (postData?.department_id?.length) {
                let deptCondition = this.commonArrayService.formatInClauseCondition(postData?.department_id, 'User.department_id');
                if (deptCondition) {
                    condition += ` AND ${deptCondition}`;
                }
            }
            let bioCondition = '';
            if (postData?.start_date && postData?.end_date) {
                bioCondition += `DATE_FORMAT(Biometric.created,"%Y-%m-%d") BETWEEN '${this.commonDateService.DateTimeFormat(postData.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}' AND '${this.commonDateService.DateTimeFormat(postData.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
            }
            else if (postData?.start_date) {
                bioCondition += `DATE_FORMAT(Biometric.created,"%Y-%m-%d") >= '${this.commonDateService.DateTimeFormat(postData.start_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
            }
            else if (postData?.end_date) {
                bioCondition += `DATE_FORMAT(Biometric.created,"%Y-%m-%d") <= '${this.commonDateService.DateTimeFormat(postData.end_date, "YYYY-MM-DD", "DD-MM-YYYY")}'`;
            }
            let fields: string[] = [
                'User.gender', 'User.id', 'User.dob', 'User.username', 'User.first_name', 'User.last_name', 'User.created',
                'Biometric.id', 'Biometric.user_id', 'Biometric.created', 'Biometric.weight', 'Biometric.bmi', 'Biometric.systolic', 'Biometric.diastolic', 'Biometric.blood_glucose',
                'Biometric.test_type', 'Biometric.alc', 'Biometric.hdl', 'Biometric.ldl', 'Biometric.total_cholesterol', 'Biometric.triglycerides',
                'Dentist.id', 'Optometrist.id', 'Tabaccouse.id',
            ]
            let resultDetails: any = await this.userService.aggregateReportData(
                condition,
                bioCondition,
                '',
                [
                    tableConstant.HEALTH_CHECKUP.TBL_HC_DENTISTS,
                    tableConstant.HEALTH_CHECKUP.TBL_HC_OPTOMETRISTS,
                    tableConstant.HEALTH_CHECKUP.TBL_HC_TOBACCO_USES,
                    tableConstant.HEALTH_CHECKUP.TBL_HC_BIOMETRICS,
                ],
                fields
            );
            if (!resultDetails) {
                throw new Error('No record found');
            }
            let screeningResult = [], participationOverview = [];
            let users = 0;
            let finalResult = Object.create(null);
            if (resultDetails?.length > 0) {
                resultDetails = await this.mapAggregateData(resultDetails);
                screeningResult = resultDetails?.screeningResult;
                participationOverview = resultDetails?.participationOverview;
                if (screeningResult.length > 0 || participationOverview.length > 0) {
                    users = resultDetails?.totalCount || 0;
                    finalResult = {
                        'screeningResult': screeningResult,
                        'participationOverview': participationOverview,
                        'biometricStatistics': resultDetails?.biometricStatistics,
                        'totalUsers': users
                    };
                }
                // if (requestfor == 2) {
                //     resultDetails = await this.aggregateReportXLSX(resultDetails, clmNameArr);
                // }
            } else {
                throw new Error('No record found');
            }
            return finalResult;
        }
        catch (error) {
            console.log('error:', error);
            return {
                success: 0,
                message: error.message,
                error: 1,
            };
        }
    }
    // for mapping Aggregate report data
    async mapAggregateData(resultDetails) {
        let result = {};
        let userCompAllReq = 0, usersCNt = 0, i = 0, noofDentuser = 0;
        let noofNonTAuser = 0, totalWeight = 0, age = 0;
        let syslow_user_cnt = 0, sysmed_user_cnt = 0, syshigh_user_cnt = 0, sysvhigh_user_cnt = 0;
        let dialow_user_cnt = 0, diamed_user_cnt = 0, diahigh_user_cnt = 0, diavhigh_user_cnt = 0;
        let bmilow_user_cnt = 0, bmimed_user_cnt = 0, bmihigh_user_cnt = 0, bmivhigh_user_cnt = 0;
        let tchllow_user_cnt = 0, tchlmed_user_cnt = 0, tchlhigh_user_cnt = 0;
        let trilow_user_cnt = 0, trimed_user_cnt = 0, trihigh_user_cnt = 0, trivhigh_user_cnt = 0;
        let ldllow_user_cnt = 0, ldlmed_user_cnt = 0, ldlhigh_user_cnt = 0, ldlvhigh_user_cnt = 0;
        let hdlwlow_user_cnt = 0, hdlwmed_user_cnt = 0, hdlwhigh_user_cnt = 0;
        let hdlmlow_user_cnt = 0, hdlmmed_user_cnt = 0, hdlmhigh_user_cnt = 0;
        let a1clow_user_cnt = 0, a1cvhigh_user_cnt = 0;
        let bg2low_user_cnt = 0, bg2med_user_cnt = 0, bg2high_user_cnt = 0;
        let bg1low_user_cnt = 0, bg1med_user_cnt = 0, bg1high_user_cnt = 0;
        let bglow_user_cnt = 0, bgmed_user_cnt = 0, bghigh_user_cnt = 0;
        let tchl_val = 0, tri_val = 0, ldl_val = 0, hdlw_val = 0, hdlm_val = 0, alc_val = 0,
            bg_val = 0, bg2_val = 0, bg1_val = 0, dia_val = 0, sys_val = 0, bmi_val = 0;
        let user_id_wise = Object.create(null);
        for (let uskey = 0; uskey < resultDetails.length; uskey++) {
            const user = resultDetails[uskey];
            const curdat = await this.commonDateService.getTodayDate().format('YYYY');
            resultDetails[uskey]['PhysicianFormCompletionStatus'] = 'No';
            resultDetails[uskey]['DentalFormCompletionStatus'] = 'No';
            resultDetails[uskey]['OptometristFormCompletionStatus'] = 'No';
            resultDetails[uskey]['TobaccoAfidavitFormCompletionStatus'] = 'No';
            resultDetails[uskey]['WeightStatus'] = 'No';
            if (user.Biometric && user.Biometric.length > 0) {
                let userBiometricDatewise: any = {};
                resultDetails[uskey]['PhysicianFormCompletionStatus'] = 'Yes';
                i = i + 1;
                for (const bio_weight of user.Biometric) {
                    const fields = [
                        'weight',
                        'bmi',
                        'systolic',
                        'diastolic',
                        'blood_glucose',
                        'test_type',
                        'alc',
                        'hdl',
                        'ldl',
                        'total_cholesterol',
                        'triglycerides'
                    ] as const;
                    for (const field of fields) {
                        const value = bio_weight[field];
                        bio_weight[field] = (value === '' || value == null) ? 0 : Number(value);
                    }
                    if (resultDetails[uskey].WeightStatus === 'No' && bio_weight.weight > 0) {
                        totalWeight += bio_weight.weight;
                        resultDetails[uskey].WeightStatus = 'Yes';
                    }
                    const logDate = this.commonDateService.DateTimeFormat(bio_weight.created, "MM-DD-YYYY", "YYYY-MM-DD HH:mm:ss");
                    const user_id = bio_weight.user_id;
                    if (!user_id_wise[user_id]?.bmi) {
                        const bmi = bio_weight.bmi;
                        if (bmi > 0) {
                            bmi_val += bmi;
                            if (bmi < 25) bmilow_user_cnt++;
                            else if (bmi < 30) bmimed_user_cnt++;
                            else if (bmi < 35) bmihigh_user_cnt++;
                            else bmivhigh_user_cnt++;
                            userBiometricDatewise[logDate] ??= {};
                            userBiometricDatewise[logDate].bmi = bmi;
                            userBiometricDatewise[logDate].bmi_id = bio_weight.id;
                            user_id_wise[user_id] ??= {};
                            user_id_wise[user_id].bmi = bmi;
                        }
                    }
                    if (!user_id_wise[user_id]?.systolic && bio_weight.systolic > 0) {
                        sys_val += bio_weight.systolic;
                        if (bio_weight.systolic < 120) syslow_user_cnt++;
                        else if (bio_weight.systolic <= 139) sysmed_user_cnt++;
                        else if (bio_weight.systolic < 160) syshigh_user_cnt++;
                        else sysvhigh_user_cnt++;
                        userBiometricDatewise[logDate] ??= {};
                        userBiometricDatewise[logDate].systolic = bio_weight.systolic;
                        userBiometricDatewise[logDate].systolic_id = bio_weight.id;
                        user_id_wise[user_id] ??= {};
                        user_id_wise[user_id].systolic = bio_weight.systolic;
                    }
                    if (!user_id_wise[user_id]?.diastolic && bio_weight.diastolic > 0) {
                        dia_val += bio_weight.diastolic;
                        if (bio_weight.diastolic < 80) dialow_user_cnt++;
                        else if (bio_weight.diastolic < 89) diamed_user_cnt++;
                        else if (bio_weight.diastolic < 100) diahigh_user_cnt++;
                        else diavhigh_user_cnt++;
                        userBiometricDatewise[logDate] ??= {};
                        userBiometricDatewise[logDate].diastolic = bio_weight.diastolic;
                        userBiometricDatewise[logDate].diastolic_id = bio_weight.id;
                        user_id_wise[user_id] ??= {};
                        user_id_wise[user_id].diastolic = bio_weight.diastolic;
                    }
                    if (!user_id_wise[user_id]?.blood_glucose && bio_weight.blood_glucose > 0) {
                        const bg = bio_weight.blood_glucose;
                        bg_val += bg;
                        if (bg < 100) bglow_user_cnt++;
                        else if (bg <= 125) bgmed_user_cnt++;
                        else bghigh_user_cnt++;
                        if (bio_weight.test_type === 1) {
                            bg1_val += bg;
                            if (bg < 100) bg1low_user_cnt++;
                            else if (bg <= 125) bg1med_user_cnt++;
                            else bg1high_user_cnt++;
                        }
                        if (bio_weight.test_type === 2) {
                            bg2_val += bg;
                            if (bg < 100) bg2low_user_cnt++;
                            else if (bg <= 125) bg2med_user_cnt++;
                            else bg2high_user_cnt++;
                        }
                        userBiometricDatewise[logDate] ??= {};
                        userBiometricDatewise[logDate].glucose = bg;
                        userBiometricDatewise[logDate].glucose_id = bio_weight.id;
                        user_id_wise[user_id] ??= {};
                        user_id_wise[user_id].glucose = bg;
                    }
                    if (!user_id_wise[user_id]?.alc && bio_weight.alc > 0) {
                        alc_val += bio_weight.alc;
                        if (bio_weight.alc < 5.7) a1clow_user_cnt++;
                        else a1cvhigh_user_cnt++;
                        userBiometricDatewise[logDate] ??= {};
                        userBiometricDatewise[logDate].alc = bio_weight.alc;
                        userBiometricDatewise[logDate].alc_id = bio_weight.id;
                        user_id_wise[user_id] ??= {};
                        user_id_wise[user_id].alc = bio_weight.alc;
                    }
                    if (!user_id_wise[user_id]?.hdl && bio_weight.hdl > 0) {
                        const hdl = bio_weight.hdl;
                        if (user.gender.toLowerCase() === 'm') {
                            hdlm_val += hdl;
                            if (hdl < 40) hdlmhigh_user_cnt++;
                            else if (hdl <= 59) hdlmmed_user_cnt++;
                            else hdlmlow_user_cnt++;
                        }
                        if (user.gender.toLowerCase() === 'f') {
                            hdlw_val += hdl;
                            if (hdl < 50) hdlwhigh_user_cnt++;
                            else if (hdl <= 59) hdlwmed_user_cnt++;
                            else hdlwlow_user_cnt++;
                        }
                        userBiometricDatewise[logDate] ??= {};
                        userBiometricDatewise[logDate].hdl = hdl;
                        userBiometricDatewise[logDate].hdl_id = bio_weight.id;
                        user_id_wise[user_id] ??= {};
                        user_id_wise[user_id].hdl = hdl;
                    }
                    if (!user_id_wise[user_id]?.ldl && bio_weight.ldl > 0) {
                        ldl_val += bio_weight.ldl;
                        if (bio_weight.ldl < 100) ldllow_user_cnt++;
                        else if (bio_weight.ldl <= 129) ldlmed_user_cnt++;
                        else if (bio_weight.ldl <= 159) ldlhigh_user_cnt++;
                        else ldlvhigh_user_cnt++;
                        userBiometricDatewise[logDate] ??= {};
                        userBiometricDatewise[logDate].ldl = bio_weight.ldl;
                        userBiometricDatewise[logDate].ldl_id = bio_weight.id;
                        user_id_wise[user_id] ??= {};
                        user_id_wise[user_id].ldl = bio_weight.ldl;
                    }
                    if (!user_id_wise[user_id]?.triglycerides && bio_weight.triglycerides > 0) {
                        tri_val += bio_weight.triglycerides;
                        if (bio_weight.triglycerides < 150) trilow_user_cnt++;
                        else if (bio_weight.triglycerides <= 199) trimed_user_cnt++;
                        else if (bio_weight.triglycerides < 500) trihigh_user_cnt++;
                        else trivhigh_user_cnt++;
                        userBiometricDatewise[logDate] ??= {};
                        userBiometricDatewise[logDate].triglycerides = bio_weight.triglycerides;
                        userBiometricDatewise[logDate].triglycerides_id = bio_weight.id;
                        user_id_wise[user_id] ??= {};
                        user_id_wise[user_id].triglycerides = bio_weight.triglycerides;
                    }
                    if (!user_id_wise[user_id]?.total_cholesterol && bio_weight.total_cholesterol > 0) {
                        tchl_val += bio_weight.total_cholesterol;
                        if (bio_weight.total_cholesterol < 200) tchllow_user_cnt++;
                        else if (bio_weight.total_cholesterol < 240) tchlmed_user_cnt++;
                        else tchlhigh_user_cnt++;
                        userBiometricDatewise[logDate] ??= {};
                        userBiometricDatewise[logDate].total_cholesterol = bio_weight.total_cholesterol;
                        userBiometricDatewise[logDate].total_cholesterol_id = bio_weight.id;
                        user_id_wise[user_id] ??= {};
                        user_id_wise[user_id].total_cholesterol = bio_weight.total_cholesterol;
                    }
                }
                const dobYear = this.commonDateService.DateTimeFormat(user.dob, "YYYY", "YYYY-MM-DD")
                const avgage = curdat - dobYear;
                age += avgage;
                usersCNt++;
            }
            if (user?.Dentist && Object.keys(user?.Dentist).length > 0) {
                resultDetails[uskey]['DentalFormCompletionStatus'] = 'Yes';
                noofDentuser = noofDentuser + 1;
            }
            if (user?.Optometrist && Object.keys(user?.Optometrist).length > 0) {
                resultDetails[uskey]['OptometristFormCompletionStatus'] = 'Yes';
            }
            if (user?.Tabaccouse && Object.keys(user?.Tabaccouse).length > 0) {
                resultDetails[uskey]['TobaccoAfidavitFormCompletionStatus'] = 'Yes';
                noofNonTAuser = noofNonTAuser + 1;
            }
            if (
                resultDetails[uskey]['PhysicianFormCompletionStatus'] === 'Yes' &&
                resultDetails[uskey]['DentalFormCompletionStatus'] === 'Yes' &&
                resultDetails[uskey]['OptometristFormCompletionStatus'] === 'Yes' &&
                resultDetails[uskey]['TobaccoAfidavitFormCompletionStatus'] === 'Yes'
            ) {
                userCompAllReq = userCompAllReq + 1;
            }
        }
        const totalCount = resultDetails.length;
        const averageage = usersCNt ? age / usersCNt : 0;
        const averageWeight = usersCNt ? totalWeight / usersCNt : 0;
        const percentofPopulationCompAllReq = totalCount ? ((userCompAllReq / totalCount) * 100).toFixed(2) + '%' : '0%';
        const percentofPopulation = totalCount ? ((i / totalCount) * 100).toFixed(2) + '%' : '0%';
        const percentofPopulationDental = totalCount ? ((noofDentuser / totalCount) * 100).toFixed(2) + '%' : '0%';
        const percentofPopulationNonTA = totalCount ? ((noofNonTAuser / totalCount) * 100).toFixed(2) + '%' : '0%';
        const categories = ['Completed all Requirements', 'Completed Physician Form', 'Completed Dental Visit', 'Completed Tobacco Affidavit'];
        const population = [percentofPopulationCompAllReq, percentofPopulation, percentofPopulationDental, percentofPopulationNonTA];
        const count = [userCompAllReq, i, noofDentuser, noofNonTAuser];
        let participationOverview: any[] = [];
        for (let d = 0; d < 4; d++) {
            participationOverview[d] = {
                category: categories[d],
                population: population[d],
                count: count[d]
            };
        }
        const tchltotal = tchllow_user_cnt + tchlmed_user_cnt + tchlhigh_user_cnt;
        const tritotal = trilow_user_cnt + trimed_user_cnt + trihigh_user_cnt + trivhigh_user_cnt;
        const ldltotal = ldllow_user_cnt + ldlmed_user_cnt + ldlhigh_user_cnt + ldlvhigh_user_cnt;
        const hdlwtotal = hdlwlow_user_cnt + hdlwmed_user_cnt + hdlwhigh_user_cnt;
        const hdlmtotal = hdlmlow_user_cnt + hdlmmed_user_cnt + hdlmhigh_user_cnt;
        const a1ctotal = a1clow_user_cnt + a1cvhigh_user_cnt;
        const bg2total = bg2low_user_cnt + bg2med_user_cnt + bg2high_user_cnt;
        const bg1total = bg1low_user_cnt + bg1med_user_cnt + bg1high_user_cnt;
        const bgtotal = bglow_user_cnt + bgmed_user_cnt + bghigh_user_cnt;
        const diatotal = dialow_user_cnt + diamed_user_cnt + diahigh_user_cnt + diavhigh_user_cnt;
        const systotal = syslow_user_cnt + sysmed_user_cnt + syshigh_user_cnt + sysvhigh_user_cnt;
        const bmitotal = bmilow_user_cnt + bmimed_user_cnt + bmihigh_user_cnt + bmivhigh_user_cnt;
        const tchlavg = tchltotal ? Math.round((tchl_val / tchltotal) * 100) / 100 : 0;
        const triavg = tritotal ? Math.round((tri_val / tritotal) * 100) / 100 : 0;
        const ldlavg = ldltotal ? Math.round((ldl_val / ldltotal) * 100) / 100 : 0;
        const hdlwavg = hdlwtotal ? Math.round((hdlw_val / hdlwtotal) * 100) / 100 : 0;
        const hdlmavg = hdlmtotal ? Math.round((hdlm_val / hdlmtotal) * 100) / 100 : 0;
        const a1cavg = a1ctotal ? Math.round((alc_val / a1ctotal) * 100) / 100 : 0;
        const bg2avg = bg2total ? Math.round((bg2_val / bg2total) * 100) / 100 : 0;
        const bg1avg = bg1total ? Math.round((bg1_val / bg1total) * 100) / 100 : 0;
        const bgavg = bgtotal ? Math.round((bg_val / bgtotal) * 100) / 100 : 0;
        const diaavg = diatotal ? Math.round((dia_val / diatotal) * 100) / 100 : 0;
        const sysavg = systotal ? Math.round((sys_val / systotal) * 100) / 100 : 0;
        const bmiavg = bmitotal ? Math.round((bmi_val / bmitotal) * 100) / 100 : 0;
        let ScreenColor_bmi = '',
            ScreenColor_systolic = '',
            ScreenColor_diastolic = '',
            ScreenColor_glucose_1 = '',
            ScreenColor_glucose_2 = '',
            ScreenColor_alc = '',
            ScreenColor_hdlm = '',
            ScreenColor_hdlw = '',
            ScreenColor_ldl = '',
            ScreenColor_triglycerides = '',
            ScreenColor_total_cholesterol = '';
        const tchl = {
            low: tchllow_user_cnt,
            moderate: tchlmed_user_cnt,
            high: tchlhigh_user_cnt,
            avg: tchlavg,
            color: ScreenColor_total_cholesterol,
            total: tchltotal
        };
        const tri = {
            low: trilow_user_cnt,
            moderate: trimed_user_cnt,
            high: trihigh_user_cnt,
            very_high: trivhigh_user_cnt,
            avg: triavg,
            color: ScreenColor_triglycerides,
            total: tritotal
        };
        const ldl = {
            low: ldllow_user_cnt,
            moderate: ldlmed_user_cnt,
            high: ldlhigh_user_cnt,
            very_high: ldlvhigh_user_cnt,
            avg: ldlavg,
            color: ScreenColor_ldl,
            total: ldltotal
        };
        const hdlw = {
            low: hdlwlow_user_cnt,
            moderate: hdlwmed_user_cnt,
            high: hdlwhigh_user_cnt,
            avg: hdlwavg,
            color: ScreenColor_hdlw,
            total: hdlwtotal
        };
        const hdlm = {
            low: hdlmlow_user_cnt,
            moderate: hdlmmed_user_cnt,
            high: hdlmhigh_user_cnt,
            avg: hdlmavg,
            color: ScreenColor_hdlm,
            total: hdlmtotal
        };
        const alc = {
            low: a1clow_user_cnt,
            high: a1cvhigh_user_cnt,
            avg: a1cavg,
            color: ScreenColor_alc,
            total: a1ctotal
        };
        const bg2 = {
            low: bg2low_user_cnt,
            moderate: bg2med_user_cnt,
            high: bg2high_user_cnt,
            avg: bg2avg,
            color: ScreenColor_glucose_2,
            total: bg2total
        };
        const bg1 = {
            low: bg1low_user_cnt,
            moderate: bg1med_user_cnt,
            high: bg1high_user_cnt,
            avg: bg1avg,
            color: ScreenColor_glucose_1,
            total: bg1total
        };
        const bg = {
            low: bglow_user_cnt,
            moderate: bgmed_user_cnt,
            high: bghigh_user_cnt,
            avg: bgavg,
            total: bgtotal
        };
        const dia = {
            low: dialow_user_cnt,
            moderate: diamed_user_cnt,
            high: diahigh_user_cnt,
            very_high: diavhigh_user_cnt,
            avg: diaavg,
            color: ScreenColor_diastolic,
            total: diatotal
        };
        const sys = {
            low: syslow_user_cnt,
            moderate: sysmed_user_cnt,
            high: syshigh_user_cnt,
            very_high: sysvhigh_user_cnt,
            avg: sysavg,
            color: ScreenColor_systolic,
            total: systotal
        };
        const bmi = {
            low: bmilow_user_cnt,
            moderate: bmimed_user_cnt,
            high: bmihigh_user_cnt,
            very_high: bmivhigh_user_cnt,
            avg: bmiavg,
            color: ScreenColor_bmi,
            total: bmitotal
        };
        const biometric_assessment_data = {
            bmi,
            systolic: sys,
            diastolic: dia,
            glucose: bg,
            glucose_1: bg1,
            glucose_2: bg2,
            alc,
            hdlm,
            hdlw,
            ldl,
            triglycerides: tri,
            total_cholesterol: tchl
        };
        const biometric_measurement = [
            'A1c', 'Age', 'Blood Glucose', 'Blood Pressure Diastolic',
            'Blood Pressure Systolic', 'BMI', 'HDL Men', 'HDL Women',
            'LDL', 'Total Cholesterol', 'Triglycerides', 'Weight'
        ];
        const averageA1c = biometric_assessment_data?.alc?.avg;
        const A1cnooflowrisk = biometric_assessment_data?.alc?.low;
        const A1cnoofhighrisk = biometric_assessment_data?.alc?.high;
        const averageGlucose = biometric_assessment_data?.glucose?.avg;
        const Glucosenooflowrisk = biometric_assessment_data?.glucose?.low;
        const Glucosenoofmedium = biometric_assessment_data?.glucose?.moderate;
        const Glucosenoofhighrisk = biometric_assessment_data?.glucose?.high;
        const averagebpDiastolic = biometric_assessment_data?.diastolic?.avg;
        const bpDiastolicnooflowrisk = biometric_assessment_data?.diastolic?.low;
        const bpDiastolicnoofmedium = biometric_assessment_data?.diastolic?.moderate;
        const bpDiastolicnoofhighrisk = biometric_assessment_data?.diastolic?.high;
        const bpDiastolicnoofveryhighrisk = biometric_assessment_data?.diastolic?.very_high;
        const averagebpSystolic = biometric_assessment_data?.systolic?.avg;
        const bpSystolicnooflowrisk = biometric_assessment_data?.systolic?.low;
        const bpSystolicnoofmedium = biometric_assessment_data?.systolic?.moderate;
        const bpSystolicnoofhighrisk = biometric_assessment_data?.systolic?.high;
        const bpSystolicnoofveryhighrisk = biometric_assessment_data?.systolic?.very_high;
        const averagebmi = biometric_assessment_data?.bmi?.avg;
        const bminooflowrisk = biometric_assessment_data?.bmi?.low;
        const bminoofmedium = biometric_assessment_data?.bmi?.moderate;
        const bminoofhighrisk = biometric_assessment_data?.bmi?.high;
        const bminoofveryhighrisk = biometric_assessment_data?.bmi?.very_high;
        const averageHDLMen = biometric_assessment_data?.hdlm?.avg;
        const HDLMennooflowrisk = biometric_assessment_data?.hdlm?.low;
        const HDLMennoofmedium = biometric_assessment_data?.hdlm?.moderate;
        const HDLMennoofhighrisk = biometric_assessment_data?.hdlm?.high;
        const averageHDLWomen = biometric_assessment_data?.hdlw?.avg;
        const HDLWomennooflowrisk = biometric_assessment_data?.hdlw?.low;
        const HDLWomennoofmedium = biometric_assessment_data?.hdlw?.moderate;
        const HDLWomennoofhighrisk = biometric_assessment_data?.hdlw?.high;
        const averageLDL = biometric_assessment_data?.ldl?.avg;
        const LDLnooflowrisk = biometric_assessment_data?.ldl?.low;
        const LDLnoofmedium = biometric_assessment_data?.ldl?.moderate;
        const LDLnoofhighrisk = biometric_assessment_data?.ldl?.high;
        const LDLnoofveryhighrisk = biometric_assessment_data?.ldl?.very_high;
        const averageTotalCholesterol = biometric_assessment_data?.total_cholesterol?.avg;
        const TotalCholesterolnooflowrisk = biometric_assessment_data?.total_cholesterol?.low;
        const TotalCholesterolnoofmedium = biometric_assessment_data?.total_cholesterol?.moderate;
        const TotalCholesterolnoofhighrisk = biometric_assessment_data?.total_cholesterol?.high;
        const averageTriglycerides = biometric_assessment_data?.triglycerides?.avg;
        const Triglyceridesnooflowrisk = biometric_assessment_data?.triglycerides?.low;
        const Triglyceridesnoofmedium = biometric_assessment_data?.triglycerides?.moderate;
        const Triglyceridesnoofhighrisk = biometric_assessment_data?.triglycerides?.high;
        const Triglyceridesnoofveryhighrisk = biometric_assessment_data?.triglycerides?.very_high;
        const avgValue = [
            averageA1c, averageage, averageGlucose, averagebpDiastolic,
            averagebpSystolic, averagebmi, averageHDLMen, averageHDLWomen,
            averageLDL, averageTotalCholesterol, averageTriglycerides, averageWeight
        ];
        const VeryHighRiskValue = [
            '', '', Glucosenoofhighrisk + '*', bpDiastolicnoofveryhighrisk + '*',
            bpSystolicnoofveryhighrisk + '*', bminoofveryhighrisk + '*', '', '',
            LDLnoofveryhighrisk + '*', '', Triglyceridesnoofveryhighrisk + '*', ''
        ];
        const HighRiskValue = [
            A1cnoofhighrisk + '*', '', Glucosenoofhighrisk + '*', bpDiastolicnoofhighrisk + '*',
            bpSystolicnoofhighrisk + '*', bminoofhighrisk + '*', HDLMennoofhighrisk + '*',
            HDLWomennoofhighrisk + '*', LDLnoofhighrisk + '*', TotalCholesterolnoofhighrisk + '*',
            Triglyceridesnoofhighrisk + '*', ''
        ];
        const MediumRiskValue = [
            '', '', Glucosenoofmedium + '*', bpDiastolicnoofmedium + '*',
            bpSystolicnoofmedium + '*', bminoofmedium + '*', HDLMennoofmedium + '*',
            HDLWomennoofmedium + '*', LDLnoofmedium + '*', TotalCholesterolnoofmedium + '*',
            Triglyceridesnoofmedium + '*', ''
        ];
        const LowRiskValue = [
            A1cnooflowrisk + '*', '', Glucosenooflowrisk + '*', bpDiastolicnooflowrisk + '*',
            bpSystolicnooflowrisk + '*', bminooflowrisk + '*', HDLMennooflowrisk + '*',
            HDLWomennooflowrisk + '*', LDLnooflowrisk + '*', TotalCholesterolnooflowrisk + '*',
            Triglyceridesnooflowrisk + '*', ''
        ];
        let screeningResult: any[] = [];
        for (let s = 0; s < 12; s++) {
            screeningResult[s] = {
                biometric_measurement: biometric_measurement[s],
                avgValue: avgValue[s],
                VeryHighRiskValue: VeryHighRiskValue[s],
                HighRiskValue: HighRiskValue[s],
                MediumRiskValue: MediumRiskValue[s],
                LowRiskValue: LowRiskValue[s]
            };
        }
        if (screeningResult.length > 0) {
            result['screeningResult'] = screeningResult.map(item => ({
                'Biometric Measurement': item.biometric_measurement,
                'AVG Value': Number(item?.avgValue) == 0 ? '0*' : Number(item?.avgValue)?.toFixed(2) + '*',
                'Number of Very High Risk': item.VeryHighRiskValue,
                'Number of High Risk': item.HighRiskValue,
                'Number of Medium Risk': item.MediumRiskValue,
                'Number of Low Risk': item.LowRiskValue
            }));
        } else {
            result['screeningResult'] = [];
        }
        const highRiskFactors = [
            { 'High Risk Factor Category': 'Age', 'High Risk Value Range/ Definition': 'Age > 45' },
            { 'High Risk Factor Category': 'BMI', 'High Risk Value Range/ Definition': '> 30' },
            { 'High Risk Factor Category': 'Diastolic BP', 'High Risk Value Range/ Definition': '> 90' },
            { 'High Risk Factor Category': 'Known diabetes', 'High Risk Value Range/ Definition': 'Yes' },
            { 'High Risk Factor Category': 'Systolic BP', 'High Risk Value Range/ Definition': '> 140' },
            { 'High Risk Factor Category': 'Total Cholesterol', 'High Risk Value Range/ Definition': '> 200' },
        ];
        result['biometricStatistics'] = highRiskFactors;
        if (participationOverview?.length > 0 || screeningResult?.length > 0) {
            result['participationOverview'] = participationOverview;
        }
        return result;
    }
}
