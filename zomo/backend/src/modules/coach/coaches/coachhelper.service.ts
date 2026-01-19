import { UserService } from '@/modules/user/user/user.service';
import { appConstant, CommonDateService, CommonService, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { Request } from "express";
import { TranslationService } from "src/modules/translation/translation.service";
import { CoachNotesService } from '../coachnotes/coachnotes.service';
import { CoachesService } from './coaches.service';
@Injectable()
export class CoachHelperService {
    constructor(
        private readonly translatorService: TranslationService,
        private readonly commonService: CommonService,
        private readonly userService: UserService,
        private readonly coachesService: CoachesService,
        private readonly coachNotesService: CoachNotesService,
        private readonly commonDateService: CommonDateService,
    ) {}

    async globalCoachDataProcessing(data: any, req: Request){
        try{
            let result;
            if(data.user == 1){
                const biometricUsers = await this.coachOrgDetails(data.id, 'coachbioavg', req);
                const bmiPercentage = biometricUsers?.['TotalCntBMI'] !== 0 
                    ? Math.floor((biometricUsers?.['bminoofhighrisk'] || 0) / biometricUsers['TotalCntBMI'] * 100)
                    : 0;
                result = {
                    user_count: await this.coachOrgDetails(data.id, 'usercounter', req),
                    event_complete: `${await this.coachOrgDetails(data.id, 'eventcomp', req)}%`,
                    total_assign: await this.coachOrgDetails(data.id, 'totalassign', req),
                    health_score: `${biometricUsers?.['total_overall_health_score'] || 0}%`,
                    biometric_score: `${biometricUsers?.['averagebmi'] || 0}%`,
                    high_risk_coach: `${biometricUsers?.['bminoofhighrisk'] || 0} / ${bmiPercentage}%`,
                    task_complete: `${await this.coachOrgDetails(data.id, 'taskcompleted', req)}%`,
                    status: data?.status ? 'Active' : 'Inactive',
                    total_note: await this.coachOrgDetails(data.id, 'totalnote', req),
                }
            }
            if(data.company == 1){
                const biometricUsers = await this.coachOrgDetails(data.id, 'orgbioavg', req);
                result = {
                    user_count: await this.userService.countUsers(`user.role_id IN(2,16) AND user.status = 1 AND user.membership_code = '${data.id}'`),
                    health_score: `${biometricUsers?.['total_overall_health_score'] || 0}%`,
                    biometric_score: `${biometricUsers?.['averagebmi'] || 0}%`,
                    low_risk: `${biometricUsers?.['bminooflowrisk'] || 0} / ${await this.commonService.calculatePercentage(biometricUsers?.['bminooflowrisk'] || 0, biometricUsers?.['TotalCntBMI'])}%`,
                    modarate_risk: `${biometricUsers?.['bminoofmedium'] || 0} / ${await this.commonService.calculatePercentage(biometricUsers?.['bminoofmedium'] || 0, biometricUsers?.['TotalCntBMI'])}%`,
                    high_risk: `${biometricUsers?.['bminoofhighrisk'] || 0} / ${await this.commonService.calculatePercentage(biometricUsers?.['bminoofhighrisk'] || 0, biometricUsers?.['TotalCntBMI'])}%`,
                    very_high_risk: `${biometricUsers?.['bminoofveryhighrisk'] || 0} / ${await this.commonService.calculatePercentage(biometricUsers?.['bminoofveryhighrisk'] || 0, biometricUsers?.['TotalCntBMI'])}%`,
                    total: `${biometricUsers?.['TotalCntBMI']} / 100%`,
                }
            }
            return result;
        } catch(error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }

    async coachOrgDetails(membershipcode: string, type: string, req: Request){
        try{
            let biometricUsers;
            let condition = "";
            if (type === "orgbioavg" || type === "userbioavg" || type === "coachbioavg") {
                if (type === "orgbioavg") {
                    condition = `user.role_id IN (2,16) AND user.status = 1 AND user.membership_code = '${membershipcode}' AND biometric.user_id IS NOT NULL AND biometric.status !=2`;
                    let innerJoin = [
                        {
                            'alias':'biometric',
                            'table' : tableConstant.HEALTH_CHECKUP.TBL_HC_BIOMETRICS, 
                            'on' : `user.id = biometric.user_id`, 
                            'connect' : 'user', 
                            'type' : 'LEFT' 
                        },
                    ];
                    biometricUsers = await this.userService.listRecord(condition,{'biometric.id': 'DESC'},['user.id','user.gender','biometric'],'biometric.user_id',innerJoin);
                } else if (type === "userbioavg") {
                    condition = `user.role_id IN (2,16) AND user.status = 1 AND user.id = '${membershipcode}' AND biometric.user_id IS NOT NULL AND biometric.status !=2`;
                    let innerJoin = [
                        {
                            'alias':'biometric',
                            'table' : tableConstant.HEALTH_CHECKUP.TBL_HC_BIOMETRICS, 
                            'on' : `user.id = biometric.user_id`, 
                            'connect' : 'user', 
                            'type' : 'LEFT' 
                        },
                    ];
                    biometricUsers = await this.userService.listRecord(condition,null,['user.id','user.gender','biometric'],'biometric.user_id',innerJoin);
                } else if (type === "coachbioavg") {
                    let joinTableList = [{'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = coach.org_id` , 'connect' : 'coach', 'type' : 'LEFT' }];
                    let Company = await this.coachesService.getAssignOrgList(`coach.user_id = '${membershipcode}' AND coach.status !=2`,['company.code','coach.org_id','coach.is_global','coach.location','coach.department','coach.state','coach.city'],joinTableList);
                    const assignment = {
                        org_code: {},
                        global_code: {},
                        location: {},
                        department: {},
                        state: {},
                        city: {}
                    };
                    for(let item of Company){
                        assignment.global_code[item.org_id] = item['company'].code;
                        if (item.is_global == 1) {
                            assignment.org_code[item.org_id] = item['company'].code;
                        } else if (item.location != 0) {
                            assignment.location[item.org_id] = item['company'].code;
                        } else if (item.department != 0) {
                            assignment.department[item.org_id] = item['company'].code;
                        } else if (item.state != '') {
                            assignment.state[item.org_id] = item['company'].code;
                        } else if (item.city != '') {
                            assignment.city[item.org_id] = item['company'].code;
                        }
                    }
                    const globalCodes = Object.values(assignment.global_code).map(code => `'${code}'`).join(',');
                    const locationCodes = Object.values(assignment.location).map(code => `'${code}'`).join(',');
                    const departmentCodes = Object.values(assignment.department).map(code => `'${code}'`).join(',');
                    const orgCodes = Object.values(assignment.org_code).map(code => `'${code}'`).join(',');
                    const stateCodes = Object.values(assignment.state).map(code => `'${code}'`).join(',');
                    const cityCodes = Object.values(assignment.city).map(code => `'${code}'`).join(',');
                    const flippedGlobalCodes = Object.keys(assignment.global_code).join(',')
                    const outer_inner_condition = "(coach.created_date >= (DATE(NOW()) - INTERVAL 30 DAY))";
                    let orCond= [];
                    if(locationCodes && locationCodes != ''){
                        orCond.push(`(user.membership_code IN (${locationCodes}) AND coach.location = user.location AND user.location != '')`);
                    }
                    if(departmentCodes && departmentCodes != ''){
                        orCond.push(`(user.membership_code IN (${departmentCodes}) AND coach.department = user.department_id AND user.department_id != 0)`);
                    }
                    if(orgCodes && orgCodes != ''){
                        orCond.push(`(user.membership_code IN (${orgCodes}) AND user.membership_code != '')`);
                    }
                    let inner_condition = `
                        user.membership_code IN (${globalCodes}) 
                        AND user.status = 1 
                        AND user.role_id IN (2, 16)
                    `;
                    if(orCond.length){
                        inner_condition += `AND (${orCond.join('OR')})`;
                    }
                    orCond= [];
                    if(stateCodes && stateCodes != ''){
                        orCond.push(`(user.membership_code IN (${stateCodes}) AND coach.state = userSetting.state AND userSetting.city != '')`);
                    }
                    if(cityCodes && cityCodes != ''){
                        orCond.push(`(user.membership_code IN (${cityCodes}) AND coach.city = userSetting.city AND userSetting.state != '')`);
                    }
                    let inner_condition_statecity = `userSetting.user_id = user.id `;
                    if(orCond.length){
                        inner_condition_statecity += `AND (${orCond.join('OR')})`;
                    }
                    const outer_condition = `
                        coach.org_id IN (${flippedGlobalCodes})
                        AND ${outer_inner_condition}
                        AND (
                            coach.location != 0 
                            OR coach.department != 0 
                            OR coach.city != '' 
                            OR coach.state != '' 
                            OR coach.is_global = 1
                        )
                    `;
                    joinTableList = [
                        {'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : inner_condition , 'connect' : 'coach', 'type' : 'INNER' },
                        {'alias':'userSetting', 'table' : tableConstant.TBL_USERS_SETTINGS, 'on' : inner_condition_statecity , 'connect' : 'coach', 'type' : 'INNER' },
                    ];
                    let users = Company.length ? await this.coachesService.getAssignOrgList(outer_condition,['coach.id','user.id'],joinTableList,'user.id') : [];
                    condition = `user.role_id IN (2,16) AND user.status = 1 AND user.id In(${users.map(coach => coach?.['user']?.id?.toString()).join(',')})  AND biometric.user_id IS NOT NULL AND biometric.status !=2`;
                    let innerJoin = [
                        {
                            'alias':'biometric',
                            'table' : tableConstant.HEALTH_CHECKUP.TBL_HC_BIOMETRICS, 
                            'on' : `user.id = biometric.user_id`, 
                            'connect' : 'user', 
                            'type' : 'LEFTMANY' 
                        },
                    ];
                    biometricUsers = Company.length && users.length ? await this.userService.listRecord(condition,null,['user.id','user.gender','biometric'],'biometric.user_id',innerJoin) : [];
                }
                
                const averagebmi = await this.getNumberOfUsersForBFactor(biometricUsers, "bmi", 'avg',req);
                const bminooflowrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "bmi", 'low',req);
                const bminoofmedium = await this.getNumberOfUsersForBFactor(biometricUsers, "bmi", 'moderate',req);
                const bminoofhighrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "bmi", 'high',req);
                const bminoofveryhighrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "bmi", 'very_high',req);
                /*
                const averagebpSystolic = await this.getNumberOfUsersForBFactor(biometricUsers, "systolic", 'avg',req);
                */
                const bpSystolicnooflowrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "systolic", 'low',req);
                const bpSystolicnoofmedium = await this.getNumberOfUsersForBFactor(biometricUsers, "systolic", 'moderate',req);
                const bpSystolicnoofhighrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "systolic", 'high',req);
                const bpSystolicnoofveryhighrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "systolic", 'very_high',req);
                /*
                const averagebpDiastolic = await this.getNumberOfUsersForBFactor(biometricUsers, "diastolic", 'avg',req);
                */
                const bpDiastolicnooflowrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "diastolic", 'low',req);
                const bpDiastolicnoofmedium = await this.getNumberOfUsersForBFactor(biometricUsers, "diastolic", 'moderate',req);
                const bpDiastolicnoofhighrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "diastolic", 'high',req);
                const bpDiastolicnoofveryhighrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "diastolic", 'very_high',req);
                /*
                const averageGlucose = await this.getNumberOfUsersForBFactor(biometricUsers, "blood_glucose", 'avg',req);
                */
                const Glucosenooflowrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "blood_glucose", 'low',req);
                const Glucosenoofmedium = await this.getNumberOfUsersForBFactor(biometricUsers, "blood_glucose", 'moderate',req);
                const Glucosenoofhighrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "blood_glucose", 'high',req);
                /*
                const averageA1c = await this.getNumberOfUsersForBFactor(biometricUsers, "alc", 'avg',req);
                */
                const A1cnooflowrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "alc", 'low',req);
                const A1cnoofhighrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "alc", 'high',req);
                /*
                const averageHDLMen = await this.getNumberOfUsersForBFactor(biometricUsers, "hdlm", 'avg',req);
                */
                const HDLMennooflowrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "hdlm", 'low',req);
                const HDLMennoofmedium = await this.getNumberOfUsersForBFactor(biometricUsers, "hdlm", 'moderate',req);
                const HDLMennoofhighrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "hdlm", 'high',req);
                /*
                const averageHDLWomen = await this.getNumberOfUsersForBFactor(biometricUsers, "hdlw", 'avg',req);
                */
                const HDLWomennooflowrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "hdlw", 'low',req);
                const HDLWomennoofmedium = await this.getNumberOfUsersForBFactor(biometricUsers, "hdlw", 'moderate',req);
                const HDLWomennoofhighrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "hdlw", 'high',req);
                /*
                const averageLDL = await this.getNumberOfUsersForBFactor(biometricUsers, "ldl", 'avg',req);
                */
                const LDLnooflowrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "ldl", 'low',req);
                const LDLnoofmedium = await this.getNumberOfUsersForBFactor(biometricUsers, "ldl", 'moderate',req);
                const LDLnoofhighrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "ldl", 'high',req);
                const LDLnoofveryhighrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "ldl", 'very_high',req);
                /*
                const averageTriglycerides = await this.getNumberOfUsersForBFactor(biometricUsers, "triglycerides", 'avg',req);
                */
                const Triglyceridesnooflowrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "triglycerides", 'low',req);
                const Triglyceridesnoofmedium = await this.getNumberOfUsersForBFactor(biometricUsers, "triglycerides", 'moderate',req);
                const Triglyceridesnoofhighrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "triglycerides", 'high',req);
                const Triglyceridesnoofveryhighrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "triglycerides", 'very_high',req);
                /*
                const averageTotalCholesterol = await this.getNumberOfUsersForBFactor(biometricUsers, "total_cholesterol", 'avg',req);
                */
                const TotalCholesterolnooflowrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "total_cholesterol", 'low',req);
                const TotalCholesterolnoofmedium = await this.getNumberOfUsersForBFactor(biometricUsers, "total_cholesterol", 'moderate',req);
                const TotalCholesterolnoofhighrisk = await this.getNumberOfUsersForBFactor(biometricUsers, "total_cholesterol", 'high',req);

                // Calculate totals
                const TotalCntBMI = bminoofveryhighrisk + bminoofhighrisk + bminoofmedium + bminooflowrisk;
                /*
                const TotalCntBpSystolic = bpSystolicnooflowrisk + bpSystolicnoofmedium + bpSystolicnoofhighrisk + bpSystolicnoofveryhighrisk;
                const TotalCntBpDiastolic = bpDiastolicnooflowrisk + bpDiastolicnoofmedium + bpDiastolicnoofhighrisk + bpDiastolicnoofveryhighrisk;
                const TotalCntGlucose = Glucosenooflowrisk + Glucosenoofmedium + Glucosenoofhighrisk;
                const TotalCntA1c = A1cnooflowrisk + A1cnoofhighrisk;
                const TotalCntLDL = LDLnooflowrisk + LDLnoofmedium + LDLnoofhighrisk + LDLnoofveryhighrisk;
                const TotalCntTriglycerides = Triglyceridesnooflowrisk + Triglyceridesnoofmedium + Triglyceridesnoofhighrisk + Triglyceridesnoofveryhighrisk;
                const TotalCntTotalCholesterol = TotalCholesterolnooflowrisk + TotalCholesterolnoofmedium + TotalCholesterolnoofhighrisk;
                const TotalCntHDLMen = HDLMennooflowrisk + HDLMennoofmedium + HDLMennoofhighrisk;
                const TotalCntHDLWomen = HDLWomennooflowrisk + HDLWomennoofmedium + HDLWomennoofhighrisk;
                */

                // For Total Risk
                /*
                const tr_very_high_risk = bpSystolicnoofveryhighrisk + bpDiastolicnoofveryhighrisk + LDLnoofveryhighrisk + Triglyceridesnoofveryhighrisk;
                */
                const tr_high_risk = bminoofhighrisk + bpSystolicnoofhighrisk + bpDiastolicnoofhighrisk + Glucosenoofhighrisk + A1cnoofhighrisk + LDLnoofhighrisk + Triglyceridesnoofhighrisk + TotalCholesterolnoofhighrisk + HDLMennoofhighrisk + HDLWomennoofhighrisk;
                const tr_modarate_risk = bminoofmedium + bpSystolicnoofmedium + bpDiastolicnoofmedium + Glucosenoofmedium + LDLnoofmedium + Triglyceridesnoofmedium + TotalCholesterolnoofmedium + HDLMennoofmedium + HDLWomennoofmedium;
                const tr_low_risk = bminooflowrisk + bpSystolicnooflowrisk + bpDiastolicnooflowrisk + Glucosenooflowrisk + A1cnooflowrisk + LDLnooflowrisk + Triglyceridesnooflowrisk + TotalCholesterolnooflowrisk + HDLMennooflowrisk + HDLWomennooflowrisk;

                // For Overall / Biometric Score
                const tot_no_of_very_high_risk_factor = bminoofveryhighrisk + bpSystolicnoofveryhighrisk + bpDiastolicnoofveryhighrisk + LDLnoofveryhighrisk + Triglyceridesnoofveryhighrisk;
                const tot_no_of_high_risk_factor = tr_high_risk;
                const tot_no_of_medium_risk_factor = tr_modarate_risk;
                const tot_no_of_low_risk_factor = tr_low_risk;
                const tot_risk_factors_points = tot_no_of_very_high_risk_factor + tot_no_of_high_risk_factor + tot_no_of_medium_risk_factor + tot_no_of_low_risk_factor;

                let total_overall_health_score = 0;
                if (biometricUsers && biometricUsers.length > 0) {
                    total_overall_health_score = Math.round((100 * (1 - ((tot_no_of_very_high_risk_factor + tot_no_of_high_risk_factor + tot_no_of_medium_risk_factor) / tot_risk_factors_points))) * 100) / 100
                }

                const result = {
                    total_overall_health_score: total_overall_health_score,
                    averagebmi: averagebmi,
                    bminooflowrisk: bminooflowrisk,
                    bminoofmedium: bminoofmedium,
                    bminoofhighrisk: bminoofhighrisk,
                    bminoofveryhighrisk: bminoofveryhighrisk,
                    TotalCntBMI: TotalCntBMI
                };
                return result;
            }
            if(type == 'totalassign'){
                let Company = await this.coachesService.getAssignOrgList(`coach.user_id in(${membershipcode}) AND coach.status !=2`,['coach.id']);
                return Company?.length || 0;
            }
            if(type == 'totalnote' || type == 'taskcompleted'){
                condition = `coachnote.coach_id = '${membershipcode}' AND coachnote.contant_type = 1 AND(coachnote.created_date >= (DATE(NOW()) - INTERVAL 7 DAY))`;
                const recordDetails = await this.coachNotesService.listRecord(condition);
                const totalnote = recordDetails?.length || 0;
                if(type == 'totalnote'){
                    return totalnote;
                }
                if(type == 'taskcompleted'){
                    condition = `coachnote.coach_id = '${membershipcode}' AND coachnote.contant_type = 1 AND coachnote.user_status = 1 AND(coachnote.created_date >= (DATE(NOW()) - INTERVAL 7 DAY))`;
                    const recordDetails = await this.coachNotesService.listRecord(condition);
                    const totaltask = recordDetails?.length || 0;
                    if (totaltask == 0) {
                        return 0;
                    } else {
                        return Math.floor(totalnote !== 0 ? (totaltask / totalnote) * 100 : 0);
                    }
                }
            }
            if(type == 'usercounter' || type == 'eventcomp'){
                let joinTableList = [{'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = coach.org_id` , 'connect' : 'coach', 'type' : 'LEFT' }];
                let Company = await this.coachesService.getAssignOrgList(`coach.user_id in(${membershipcode}) AND coach.status !=2`,['company.code','coach.org_id','coach.is_global','coach.location','coach.department','coach.state','coach.city'],joinTableList);
                const assignment = {
                    org_code: {},
                    global_code: {},
                    location: {},
                    department: {},
                    state: {},
                    city: {}
                };
                for(let item of Company){
                    assignment.global_code[item.org_id] = item['company'].code;
                    if (item.is_global == 1) {
                        assignment.org_code[item.org_id] = item['company'].code;
                    } else if (item.location != 0) {
                        assignment.location[item.org_id] = item['company'].code;
                    } else if (item.department != 0) {
                        assignment.department[item.org_id] = item['company'].code;
                    } else if (item.state != '') {
                        assignment.state[item.org_id] = item['company'].code;
                    } else if (item.city != '') {
                        assignment.city[item.org_id] = item['company'].code;
                    }
                }
                const globalCodes = Object.values(assignment.global_code).map(code => `'${code}'`).join(',');
                const locationCodes = Object.values(assignment.location).map(code => `'${code}'`).join(',');
                const departmentCodes = Object.values(assignment.department).map(code => `'${code}'`).join(',');
                const orgCodes = Object.values(assignment.org_code).map(code => `'${code}'`).join(',');
                const stateCodes = Object.values(assignment.state).map(code => `'${code}'`).join(',');
                const cityCodes = Object.values(assignment.city).map(code => `'${code}'`).join(',');
                const flippedGlobalCodes = Object.keys(assignment.global_code).join(',')
                const outer_inner_condition = "(coach.created_date >= (DATE(NOW()) - INTERVAL 30 DAY))";
                let orCond= [];
                if(locationCodes && locationCodes != ''){
                    orCond.push(`(user.membership_code IN (${locationCodes}) AND coach.location = user.location AND user.location != '')`);
                }
                if(departmentCodes && departmentCodes != ''){
                    orCond.push(`(user.membership_code IN (${departmentCodes}) AND coach.department = user.department_id AND user.department_id != 0)`);
                }
                if(orgCodes && orgCodes != ''){
                    orCond.push(`(user.membership_code IN (${orgCodes}) AND user.membership_code != '')`);
                }
                let inner_condition = `user.membership_code IN (${globalCodes}) 
                    AND user.status = 1 
                    AND user.role_id IN(2,16)
                `;
                if(orCond.length){
                    inner_condition += `AND (${orCond.join('OR')})`;
                }
                orCond= [];
                if(stateCodes && stateCodes != ''){
                    orCond.push(`(user.membership_code IN(${stateCodes}) AND coach.state = userSetting.state AND userSetting.city != '')`);
                }
                if(cityCodes && cityCodes != ''){
                    orCond.push(`(user.membership_code IN(${cityCodes}) AND coach.city = userSetting.city AND userSetting.state != '')`);
                }
                let inner_condition_statecity = `userSetting.user_id = user.id `;
                if(orCond.length){
                    inner_condition_statecity += `AND(${orCond.join('OR')})`;
                }
                const outer_condition = `
                    coach.org_id IN(${flippedGlobalCodes})
                    AND ${outer_inner_condition}
                    AND (
                        coach.location != 0 
                        OR coach.department != 0 
                        OR coach.city != '' 
                        OR coach.state != '' 
                        OR coach.is_global = 1
                    )
                `;
                if (type == 'usercounter') {
                    joinTableList = [
                        {'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : inner_condition , 'connect' : 'coach', 'type' : 'INNER' },
                        {'alias':'userSetting', 'table' : tableConstant.TBL_USERS_SETTINGS, 'on' : inner_condition_statecity , 'connect' : 'coach', 'type' : 'INNER' },
                    ];
                    let no_of_users = Company.length ? await this.coachesService.getAssignOrgList(outer_condition,['coach.id','user.id'],joinTableList,'user.id') : [];
                    return no_of_users?.length || 0;
                }
                if (type == 'eventcomp') {
                    joinTableList = [
                        {'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : inner_condition , 'connect' : 'coach', 'type' : 'INNER' },
                        {'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : 'company.code = user.membership_code AND user.status !=2' , 'connect' : 'coach', 'type' : 'INNER' },
                        {'alias':'slots', 'table' : tableConstant.EVENTS.TBL_EV_SLOTS, 'on' : 'company.id = slots.organization_id' , 'connect' : 'coach', 'type' : 'INNER' },
                    ];
                    let total_ev: any = Company.length ? await this.coachesService.getAssignOrgList(outer_condition,['coach.id','user.id'],joinTableList,'user.id') : [];
                    total_ev = total_ev?.length || 0;
                    joinTableList = [
                        {'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : inner_condition , 'connect' : 'coach', 'type' : 'INNER' },
                        {'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : 'company.code = user.membership_code AND user.status !=2' , 'connect' : 'coach', 'type' : 'INNER' },
                        {'alias':'slots', 'table' : tableConstant.EVENTS.TBL_EV_SLOTS, 'on' : `company.id = slots.organization_id AND slots.end_date <='${this.commonDateService.getTodayDate().format("YYYY-MM-DD")}'` , 'connect' : 'coach', 'type' : 'INNER' },
                    ];
                    let complete_ev: any = Company.length ? await this.coachesService.getAssignOrgList(outer_condition,['coach.id','user.id'],joinTableList,'user.id') : [];
                    complete_ev = complete_ev?.length || 0;
                    return complete_ev == 0 ? 0 : Math.floor(total_ev !== 0 ? (complete_ev / total_ev) * 100 : 0)
                }
            }
        } catch(error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }

    async getNumberOfUsersForBFactor(users_bio_data, field: string, risk: string, req: Request) {
        try{
            let user_cnt = 0;
            let total_val = 0;
            let total_bio_user = 0;
            if (!users_bio_data || users_bio_data.length === 0) {
                return user_cnt;
            }
            for (const bio_data of users_bio_data) {
                if (field === 'hdlm' || field === 'hdlw' || field === 'weightm' || field === 'weightw') {
                } else {
                    if (!['blood_glucose_1', 'blood_glucose_2'].includes(field)) {
                        if (!bio_data.biometric || bio_data.biometric[field] === undefined) {
                            continue;
                        }
                    }
                }
                const gender = bio_data?.gender;
                if (risk === 'avg') {
                    if ((field === 'weightm' || field === 'hdlm') && gender === 'm') {
                        if (field === 'hdlm') {
                            total_bio_user++;
                            total_val += bio_data.biometric?.hdl || 0;
                        }
                        if (field === 'weightm') {
                            total_bio_user++;
                            total_val += bio_data.biometric?.weight || 0;
                        }
                    } else if ((field === 'weightw' || field === 'hdlw') && gender === 'f') {
                        if (field === 'hdlw') {
                            total_bio_user++;
                            total_val += bio_data.biometric?.hdl || 0;
                        }
                        if (field === 'weightw') {
                            total_bio_user++;
                            total_val += bio_data.biometric?.weight || 0;
                        }
                    } else {
                        if (!['hdlm', 'hdlw', 'weightm', 'weightw', 'blood_glucose_1', 'blood_glucose_2'].includes(field)) {
                            total_bio_user++;
                            total_val += bio_data.biometric?.[field] || 0;
                        }
                    }
                    if (field === 'blood_glucose_1' && bio_data.biometric?.test_type === 1) {
                        total_bio_user++;
                        total_val += bio_data.biometric?.blood_glucose || 0;
                    }
                    if (field === 'blood_glucose_2' && bio_data.biometric?.test_type === 2) {
                        total_bio_user++;
                        total_val += bio_data.biometric?.blood_glucose || 0;
                    }
                    continue;
                }

                switch (field) {
                    case 'bmi':
                        const bmiValue = bio_data.biometric?.bmi || 0;
                        if (bmiValue === undefined) break;
                        switch (risk) {
                            case 'low':
                                if (bmiValue < 25) user_cnt++;
                                break;
                            case 'moderate':
                                if (bmiValue >= 25 && bmiValue < 30) user_cnt++;
                                break;
                            case 'high':
                                if (bmiValue >= 30 && bmiValue < 35) user_cnt++;
                                break;
                            case 'very_high':
                                if (bmiValue >= 35) user_cnt++;
                                break;
                        }
                        break;
                    case 'systolic':
                        const systolicValue = bio_data.biometric?.systolic || 0;
                        if (systolicValue === undefined) break;
                        switch (risk) {
                            case 'low':
                                if (systolicValue < 120) user_cnt++;
                                break;
                            case 'moderate':
                                if (systolicValue >= 120 && systolicValue <= 139) user_cnt++;
                                break;
                            case 'high':
                                if (systolicValue >= 140 && systolicValue <= 160) user_cnt++;
                                break;
                            case 'very_high':
                                if (systolicValue > 160) user_cnt++;
                                break;
                        }
                        break;
                    case 'diastolic':
                        const diastolicValue = bio_data.biometric?.diastolic || 0;
                        if (diastolicValue === undefined) break;
                        switch (risk) {
                            case 'low':
                                if (diastolicValue < 80) user_cnt++;
                                break;
                            case 'moderate':
                                if (diastolicValue >= 80 && diastolicValue <= 89) user_cnt++;
                                break;
                            case 'high':
                                if (diastolicValue >= 90 && diastolicValue <= 99) user_cnt++;
                                break;
                            case 'very_high':
                                if (diastolicValue >= 100) user_cnt++;
                                break;
                        }
                        break;
                    case 'blood_glucose':
                        const glucoseValue = bio_data.biometric?.blood_glucose || 0;
                        if (glucoseValue === undefined) break;
                        switch (risk) {
                            case 'low':
                                if (glucoseValue < 100) user_cnt++;
                                break;
                            case 'moderate':
                                if (glucoseValue >= 100 && glucoseValue <= 125) user_cnt++;
                                break;
                            case 'high':
                                if (glucoseValue >= 126) user_cnt++;
                                break;
                        }
                        break;
                    case 'blood_glucose_1':
                        if (bio_data.biometric?.test_type === 1) {
                            const glucoseValue1 = bio_data.biometric?.blood_glucose || 0;
                            if (glucoseValue1 === undefined) break;
                            switch (risk) {
                                case 'low':
                                    if (glucoseValue1 < 100) user_cnt++;
                                    break;
                                case 'moderate':
                                    if (glucoseValue1 >= 100 && glucoseValue1 <= 125) user_cnt++;
                                    break;
                                case 'high':
                                    if (glucoseValue1 >= 126) user_cnt++;
                                    break;
                            }
                        }
                        break;
                    case 'blood_glucose_2':
                        if (bio_data.biometric?.test_type === 2) {
                            const glucoseValue2 = bio_data.biometric?.blood_glucose || 0;
                            if (glucoseValue2 === undefined) break;
                            switch (risk) {
                                case 'low':
                                    if (glucoseValue2 < 100) user_cnt++;
                                    break;
                                case 'moderate':
                                    if (glucoseValue2 >= 100 && glucoseValue2 <= 125) user_cnt++;
                                    break;
                                case 'high':
                                    if (glucoseValue2 >= 126) user_cnt++;
                                    break;
                            }
                        }
                        break;
                    case 'alc':
                        const alcValue = bio_data.biometric?.alc || 0;
                        if (alcValue === undefined) break;
                        switch (risk) {
                            case 'low':
                                if (alcValue < 5.7) user_cnt++;
                                break;
                            case 'high':
                                if (alcValue >= 5.7) user_cnt++;
                                break;
                        }
                        break;
                    case 'hdlm':
                        if (gender === 'm') {
                            const hdlValue = bio_data.biometric?.hdl || 0;
                            if (hdlValue === undefined) break;
                            switch (risk) {
                                case 'low':
                                    if (hdlValue > 59) user_cnt++;
                                    break;
                                case 'moderate':
                                    if (hdlValue >= 40 && hdlValue <= 59) user_cnt++;
                                    break;
                                case 'high':
                                    if (hdlValue < 40) user_cnt++;
                                    break;
                            }
                        }
                        break;
                    case 'hdlw':
                        if (gender === 'f') {
                            const hdlValue = bio_data.biometric?.hdl || 0;
                            if (hdlValue === undefined) break;
                            switch (risk) {
                                case 'low':
                                    if (hdlValue > 59) user_cnt++;
                                    break;
                                case 'moderate':
                                    if (hdlValue >= 50 && hdlValue <= 59) user_cnt++;
                                    break;
                                case 'high':
                                    if (hdlValue < 50) user_cnt++;
                                    break;
                            }
                        }
                        break;
                    case 'ldl':
                        const ldlValue = bio_data.biometric?.ldl || 0;
                        if (ldlValue === undefined) break;
                        switch (risk) {
                            case 'low':
                                if (ldlValue < 100) user_cnt++;
                                break;
                            case 'moderate':
                                if (ldlValue >= 100 && ldlValue <= 129) user_cnt++;
                                break;
                            case 'high':
                                if (ldlValue >= 130 && ldlValue <= 159) user_cnt++;
                                break;
                            case 'very_high':
                                if (ldlValue > 159) user_cnt++;
                                break;
                        }
                        break;
                    case 'triglycerides':
                        const triglyceridesValue = bio_data.biometric?.triglycerides || 0;
                        if (triglyceridesValue === undefined) break;
                        switch (risk) {
                            case 'low':
                                if (triglyceridesValue < 150) user_cnt++;
                                break;
                            case 'moderate':
                                if (triglyceridesValue >= 150 && triglyceridesValue <= 199) user_cnt++;
                                break;
                            case 'high':
                                if (triglyceridesValue >= 200 && triglyceridesValue <= 499) user_cnt++;
                                break;
                            case 'very_high':
                                if (triglyceridesValue >= 500) user_cnt++;
                                break;
                        }
                        break;
                    case 'total_cholesterol':
                        const cholesterolValue = bio_data.biometric?.total_cholesterol || 0;
                        if (cholesterolValue === undefined) break;
                        switch (risk) {
                            case 'low':
                                if (cholesterolValue < 200) user_cnt++;
                                break;
                            case 'moderate':
                                if (cholesterolValue >= 200 && cholesterolValue <= 239) user_cnt++;
                                break;
                            case 'high':
                                if (cholesterolValue >= 240) user_cnt++;
                                break;
                        }
                        break;
                }
            }
            if (risk === 'avg' && total_bio_user > 0) {
                return total_bio_user == 0 ? 0 : total_val / total_bio_user;
            }
            return user_cnt;
        } catch(error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }

    async dashboardSummary(user: any, req: Request) {
        try {
            let result;
            if(user.role_id == appConstant.ROLE.COACH){
                const biometricUsers = await this.coachOrgDetails(user.id, 'coachbioavg', req);
                const bmiPercentage = biometricUsers?.['TotalCntBMI'] !== 0 
                    ? Math.floor((biometricUsers?.['bminoofhighrisk'] || 0) / biometricUsers['TotalCntBMI'] * 100)
                    : 0;
                result = {
                    user_count: await this.coachOrgDetails(user.id, 'usercounter', req),
                    event_complete: `${await this.coachOrgDetails(user.id, 'eventcomp', req)}%`,
                    high_risk_coach: `${bmiPercentage}%`,
                    task_complete: `${await this.coachOrgDetails(user.id, 'taskcompleted', req)}%`,
                }
            }
            if(user.role_id == appConstant.ROLE.GLOBALCOACH){
                let coachData = await this.userService.listRecord(`user.role_id = 20 AND user.status = 1`,null,['user'])
                let coachCount = coachData?.length;
                let totalAssign = 0;
                let totalEvent = 0;
                let totalRiskUsers = 0;
                if(coachData && coachData?.length){
                    const promises = coachData.map(async (user) => {
                        const [biometricUsers]: any = await Promise.all([
                            this.coachOrgDetails(user.id?.toString(), 'coachbioavg', req),
                            // this.coachOrgDetails(user.id?.toString(), 'eventcomp', req),
                        ]);
                        return {
                            // event: parseInt(eventData) || 0,
                            riskUsers: biometricUsers?.['bminoofhighrisk'] || 0,
                        };
                    });
                    const results = await Promise.all(promises);
                    let assignData: any = await this.coachOrgDetails(coachData.map(user => `'${user.id}'`).join(','), 'totalassign', req);
                    totalAssign = parseInt(assignData);
                    let eventData: any = await this.coachOrgDetails(coachData.map(user => `'${user.id}'`).join(','), 'eventcomp', req);
                    totalEvent = parseInt(eventData);
                    // totalEvent = results.reduce((sum, r) => sum + r.event, 0);
                    totalRiskUsers = results.reduce((sum, r) => sum + r.riskUsers, 0);                    
                }
                result = {
                    coach_count: coachCount,
                    total_assign: coachCount == 0 ? 0 : Math.round((totalAssign / coachCount) * 100) / 100,
                    event_complete: coachCount == 0 ? 0 : Math.round((totalEvent / coachCount) * 100) / 100,
                    risk_user_count: totalRiskUsers,
                }
            }           
            return result;
        } catch(error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
}