import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from "fs";
import { DataSource } from 'typeorm';
import { appConstant } from '../constant';
import DeviceDetector = require('device-detector-js');
// import * as csvGenerate from 'csv-generate';
import { InjectDataSource } from '@nestjs/typeorm';
import { promisify } from 'util';
import { HealthField } from "../interface";
import { CommonService } from './common.service';
import { CommonDateService } from './commondate.service';
const TRANSLATIONS_DIR = appConstant.TRANSLATIONS_DIR || './src/local';
const readFileAsync = promisify(fs.readFile);
const deviceDetector = new DeviceDetector();
const S3_URL =  process.env.S3_URL_PROD
const secretKey = process.env.SECRET_KEY_PROD.slice(0, 32);
const iv = process.env.SECRET_KEY_PROD.slice(0, 16);
const algorithm = 'aes-256-gcm';
const key = crypto.scryptSync(secretKey!, 'salt', 32);
@Injectable()
export class CommonHealthService {
    constructor(
        // private readonly dataSource: DataSource
        @InjectDataSource(appConstant.READ_REPLICA.toLowerCase()) 
            private readonly dataSource: DataSource,
        private readonly commonDateService: CommonDateService,
        private readonly commonService: CommonService,
    ) {}

    bmiCalculator(weight: number, feet: number, inches: number) {
        try{
            /*let weightKg = weight * 0.453592;
            let heightInMeters = (feet * 12 + inches) * 0.0254;
            let bmi = weightKg / (heightInMeters * heightInMeters);*/          
            let inFT = feet * 12;            
            let cm = Number(inFT) + Number(inches);           
            cm = cm * cm;            
            let bmi = (cm != 0) ? (weight / cm) * 703 : 0;                        
            return bmi ? bmi.toFixed(2) : 0;
        }catch(err){
            throw new Error(err.message);
        }
    }
    calculateBodyFat(data: any) {
        try{
            let method= data.method;
            let gender= data.gender;
            let age= data.age;
            let weight= data.weight;
            let chest = data['chest'] ? parseFloat(data['chest']) : 0;
            let abdominal = data['abdominal'] ? parseFloat(data['abdominal']) : 0;
            let thigh = data['thigh'] ? parseFloat(data['thigh']) : 0;
            let tricep = data['tricep'] ? parseFloat(data['tricep']) : 0;
            let subscapular = data['subscapular'] ? parseFloat(data['subscapular']) : 0;
            let suprailiac = data['suprailiac'] ? parseFloat(data['suprailiac']) : 0;
            let midaxillary = data['midaxillary'] ? parseFloat(data['midaxillary']) : 0;
            let sum, square, val1, val2, val3, val4;
            if (method === '3') {
                if (gender === 'm') {
                    data['chest'] = chest;
                    data['abdominal'] = abdominal;
                    data['thigh'] = thigh;
                } else {
                    data['tricep'] = chest;
                    data['suprailiac'] = abdominal;
                    data['thigh'] = thigh;
                }
                sum = chest + abdominal + thigh;
            } else {
                data['chest'] = chest;
                data['abdominal'] = abdominal;
                data['thigh'] = thigh;
                data['tricep'] = tricep;
                data['subscapular'] = subscapular;
                data['suprailiac'] = suprailiac;
                data['midaxillary'] = midaxillary;
                sum = chest + abdominal + thigh + tricep + subscapular + suprailiac + midaxillary;
            }
            square = sum * sum;
            if (gender === 'm') {
                val1 = method === '3' ? 1.10938 : 1.112;
                val2 = method === '3' ? 0.0008267 : 0.00043499;
                val3 = method === '3' ? 0.0000016 : 0.00000055;
                val4 = method === '3' ? 0.0002574 : 0.00028826;
            } else {
                val1 = method === '3' ? 1.0994921 : 1.097;
                val2 = method === '3' ? 0.0009929 : 0.00046971;
                val3 = method === '3' ? 0.0000023 : 0.00000056;
                val4 = method === '3' ? 0.0001392 : 0.00012828;
            }
            val2 *= sum;
            val3 *= square;
            val4 *= age;
            let fatPer = val1 - val2 + val3 - val4;
            fatPer = (495 / fatPer) - 450;
            fatPer = parseFloat(fatPer.toFixed(2));
            let bFat = (fatPer * weight) / 100;
            bFat = parseFloat(bFat.toFixed(2));
            let leanBody = weight - bFat;
            leanBody = parseFloat(leanBody.toFixed(2));
            return {
                date: data.date,
                fatPercentage: fatPer,
                bodyFat: bFat,
                leanBodyMass: leanBody,
                age: age,
            };
        }catch(err){
            throw new Error(err.message);
        }
    }
    async checkPointNumber(data: string) {
        try{
            if (/[^0-9.]/.test(data)) {
            return true;
            }
            const trimmedData = data.toString().replace(/^\.+|\.+$/g, "");
            const charArray = trimmedData.split("");
            if (charArray.every(char => char === "0" || char === ".")) {
            return true;
            }
            return false;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async arrayMatch(array1: string[], array2: string[]) {
        try{
            if (array1.length !== array2.length) {
                return false;
            }
            const activitySet = new Set(array1);
            return array2.every(key => activitySet.has(key));
        }catch(err){
            throw new Error(err.message);
        }
    }
    async commonDataCallingSetIcon(myPlans, fromAPIUserId: any = null) {
        try{
            myPlans.icon = `${S3_URL}${myPlans.icon}`;
            for (let i = 0; i < myPlans.mb.length; i++) {
                myPlans.mb[i]['icon'] = `${S3_URL}${myPlans.mb[i]['icon']}`;
                if (myPlans.mb[i].ma) {
                    for (let j = 0; j < myPlans.mb[i].ma.length; j++) {
                        myPlans.mb[i]['ma'][j]['icon'] = `${S3_URL}${myPlans.mb[i]['ma'][j]['icon']}`;
                    }
                }
            }
            return myPlans;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async commonDataCalling(myPlans, activityData, activePlugin, defaultDesc, userId, orgId, linkSSOArray: any = {}) {
        try{
            linkSSOArray['datassoforview'] = linkSSOArray['datassoforview'] || '';
            linkSSOArray['datassoforscheduler'] = linkSSOArray['datassoforscheduler'] || '';
            let removeBlock = [];
            let planStartDate: any = await this.commonDateService.DateTimeFormat(myPlans['start_date'],'timestamp','MMMM D, YYYY');
            let dateNow: any = await this.commonDateService.DateTimeFormat(new Date(),'timestamp','YYYY-MM-DD HH:mm:ss');
            let timeDiff = Math.abs(planStartDate - dateNow);
            let remainDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;
            myPlans['remaindays'] = remainDays;
            if (myPlans['remaindays'] == '1') {
                myPlans['remaindays'] = 0;
            }
            myPlans['icon'] = `${S3_URL}${myPlans['icon']}`;
            myPlans['name'] = myPlans['map']['name'] || myPlans['name'];
            for (let i = 0; i < myPlans.mb.length; i++) {
                if (myPlans.mb[i]['mab'] && myPlans.mb[i]['ma'].length > 0 && this.commonService.isValidNumber(userId)) {
                    myPlans.mb[i]['icon'] = `${S3_URL}${myPlans.mb[i]['icon']}`;
                        for (let j = 0; j < myPlans.mb[i]['ma'].length; j++) {
                            if (myPlans.mb[i]['ma'][j]['link_type'] == 0 && myPlans.mb[i]['ma'][j]['link']) {
                                    /* /events/events/index/209#event_details2734 link issue fix
                                    Note: in front end mobile and app both side same url wise popup open (same as a challenge and trackers)
                                if (myPlans.mb[i]['ma'][j]['link'].includes('https://preventioncloud.com/challenge/') || myPlans.mb[i]['ma'][j]['link'].includes('https://preventioncloud.com/trackers/')) {
                                    myPlans.mb[i]['ma'][j]['link_type'] = '1';
                                    myPlans.mb[i]['ma'][j]['link'] = '';
                                    myPlans.mb[i]['ma'][j]['link_id'] = '2';
                                    if (myPlans.mb[i]['ma'][j]['link'].includes('https://preventioncloud.com/challenge/')) {
                                        myPlans.mb[i]['ma'][j]['link_id'] = '3';
                                    } else if (myPlans.mb[i]['ma'][j]['link'].includes('https://preventioncloud.com/trackers/')) {
                                        myPlans.mb[i]['ma'][j]['link_id'] = '8';
                                    }
                                } */
                                if (myPlans.mb[i]['ma'][j]['link'] == 'https://sso.preventioncloud.com/ehealth' || myPlans.mb[i]['ma'][j]['link'] == 'https://sso.preventioncloud.com/ehealth/view') {
                                    if (myPlans.mb[i]['ma'][j]['link'] == 'https://sso.preventioncloud.com/ehealth/view' && linkSSOArray['datassoforview'] != '') {
                                        myPlans.mb[i]['ma'][j]['link'] = `https://sso.preventioncloud.com/ehealth?SAMLRequest=${linkSSOArray['datassoforview']}`;
                                    } else {
                                        myPlans.mb[i]['ma'][j]['link'] = `https://sso.preventioncloud.com/ehealth?SAMLRequest=${linkSSOArray['datassoforscheduler']}`;
                                    }
                                }
                            }
                            if (myPlans.mb[i]['ma'][j]['description'] && myPlans.mb[i]['ma'][j]['description'].includes('https://sso.preventioncloud.com/ehealth/view')) {
                                myPlans.mb[i]['ma'][j]['description'] = myPlans.mb[i]['ma'][j]['description'].replace('https://sso.preventioncloud.com/ehealth/view', `https://sso.preventioncloud.com/ehealth?SAMLRequest=${linkSSOArray['datassoforview']}`);
                            } else if (myPlans.mb[i]['ma'][j]['description'] && myPlans.mb[i]['ma'][j]['description'].includes('https://sso.preventioncloud.com/ehealth')) {
                                myPlans.mb[i]['ma'][j]['description'] = myPlans.mb[i]['ma'][j]['description'].replace('https://sso.preventioncloud.com/ehealth', `https://sso.preventioncloud.com/ehealth?SAMLRequest=${linkSSOArray['datassoforscheduler']}`);
                            }
                            myPlans.mb[i]['ma'][j]['icon'] = `${S3_URL}${myPlans.mb[i]['ma'][j]['icon']}`;
                        }
                } else {
                    removeBlock[i] = i;
                }
            }
            myPlans['mb'] = myPlans['mb'].filter((_, index) => !removeBlock.includes(index));
            return myPlans;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async businessRuleCheck(otherDataPass, assignRule, userId,userGender,bDay) {
        try{
            let andCon = [],orCon = [];
            for (let i: number = 0; i < assignRule.length; i++) {
                assignRule[i].bstart_date = await this.commonDateService.DateTimeFormat(assignRule[i].bstart_date,'YYYY-MM-DD HH:mm:ss')
                assignRule[i].bend_date = await this.commonDateService.DateTimeFormat(assignRule[i].bend_date,'YYYY-MM-DD','YYYY-MM-DD HH:mm:ss')
                assignRule[i].bend_date = assignRule[i].bend_date ? `${assignRule[i].bend_date} 23:59:59` : '';
                if (assignRule[i].br && assignRule[i]['optional'] == 0) {
                    if (assignRule[i]?.br?.age == 0 || ((assignRule[i]?.br?.ageoption == 0 && assignRule[i]?.br?.age_s_range == bDay) ||
                        (assignRule[i]?.br?.ageoption == 1 && bDay > assignRule[i]?.br?.age_s_range) ||
                        (assignRule[i]?.br?.ageoption == 2 && bDay >= assignRule[i]?.br?.age_s_range) ||
                        (assignRule[i]?.br?.ageoption == 3 && bDay < assignRule[i]?.br?.age_s_range) ||
                        (assignRule[i]?.br?.ageoption == 4 && bDay <= assignRule[i]?.br?.age_s_range) ||
                        (assignRule[i]?.br?.ageoption == 5 && bDay >= assignRule[i]?.br?.age_s_range && bDay <= assignRule[i]?.br?.age_e_range))) {
                        if (assignRule[i]?.br?.gender == 0 || assignRule[i]?.br?.gender == userGender) {
                            if ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 26].includes(assignRule[i]?.br?.biometric_id) && otherDataPass['biometrics']) {
                                assignRule[i] = await this.gettingBiometricData(assignRule[i], otherDataPass['biometrics'],otherDataPass['bio_data'])
                            }
                            andCon.push(assignRule[i])
                        } else {
                            andCon = [],orCon = [];
                            break;
                        }
                    } else {
                        andCon = [],orCon = [];
                        break;
                    }
                }
                if (assignRule[i]['br'] && assignRule[i]['optional'] == 1) {
                    if ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 26].includes(assignRule[i]['br']['biometric_id']) && otherDataPass['biometrics']) {
                        assignRule[i] = await this.gettingBiometricData(assignRule[i], otherDataPass['biometrics'],otherDataPass['bio_data'])
                    }
                    orCon.push(assignRule[i])
                }
            }
            if (andCon.length !== 0 && orCon.length !== 0) {
                return false;
            } else {
                let andConditionStatus = true;
                if (andCon.length !== 0) {
                    for (let i = 0; i < andCon.length; i++) {
                        if ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 26].includes(andCon[i]['br']['biometric_id'])) {
                            if (!otherDataPass['biometrics']) {
                                andConditionStatus = false;
                            } else {
                                let tmpConditionVal: any = andCon[i]['tmp_condition_val'];
                                let tmpConditionVal1: any = andCon[i]['tmp_condition_val_1'];
                                if (andCon[i]['br']['progress'] == 0) {
                                    if (!tmpConditionVal || ((andCon[i]['br']['type'] === 1 && (tmpConditionVal > andCon[i]['br']['s_range'])) || (andCon[i]['br']['type'] === 2 && (tmpConditionVal < andCon[i]['br']['s_range'])) || (andCon[i]['br']['type'] === 0 && (tmpConditionVal < andCon[i]['br']['s_range'] || tmpConditionVal > andCon[i]['br']['e_range'])))) {
                                        andConditionStatus = false;
                                    }
                                } else if ([1, 2].includes(andCon[i]['br']['progress'])) {
                                    if (!tmpConditionVal || !tmpConditionVal1 || ((andCon[i]['br']['progress'] == 1 && (tmpConditionVal1 - andCon[i]['br']['s_range']) < tmpConditionVal) || (andCon[i]['br']['progress'] == 2 && (tmpConditionVal1 + andCon[i]['br']['s_range']) > tmpConditionVal))) {
                                        andConditionStatus = false;
                                        break;
                                    }
                                }
                            }
                        } else if ([13, 14, 15, 16, 17].includes(andCon[i]['br']['biometric_id'])){
                            if (!otherDataPass['hra']) {
                                andConditionStatus = false;
                            } else {
                                let hraData = await this.gettingHraData(andCon[i], otherDataPass['hra']);
                                if (Object.keys(hraData).length == 0) {
                                    andConditionStatus = false;
                                } else {
                                    if (!hraData.hasOwnProperty(andCon[i]['br']['biometric_id']) || (hraData[andCon[i]['br']['biometric_id']] != andCon[i]['br']['type'])) {
                                        andConditionStatus = false;
                                    }
                                }
                            }
                        } else if (andCon[i]['br']['biometric_id'] == 19) {
                            if (!otherDataPass['tobacco'] && otherDataPass['tobacco'] != 0) {
                                andConditionStatus = false;
                            } else {
                                let tobaccoData = await this.getTobaccoData(andCon[i], otherDataPass['tobacco']);
                                if (tobaccoData === '') {
                                    andConditionStatus = false;
                                } else {
                                    if (tobaccoData != andCon[i]['br']['type']) {
                                        andConditionStatus = false;
                                    }
                                }
                            }
                        } else if (andCon[i]['br']['biometric_id'] == 20) {
                            let physicianData = await this.getPhysicianData(andCon[i], otherDataPass['physician']);
                            if (physicianData[andCon[i]['br']['type']] != 1) {
                                andConditionStatus = false;
                            }
                        } else if (andCon[i]['br']['biometric_id'] == 21) {
                            let dentalData = await this.getDentalData(andCon[i], otherDataPass['dental']);
                            if (!dentalData) {
                                andConditionStatus = false;
                            }
                        } else if (andCon[i]['br']['biometric_id'] == 22) {
                            let optometryData = await this.getOptometryData(andCon[i], otherDataPass['optimetric']);
                            if (!optometryData) {
                                andConditionStatus = false;
                            }
                        } else if (andCon[i]['br']['biometric_id'] == 30) {
                            let ohAssessmentData = await this.getOhAssessmentData(andCon[i], otherDataPass['ohassessment']);
                            if (!ohAssessmentData) {
                                andConditionStatus = false;
                            }
                        } else if (andCon[i]['br']['biometric_id'] == 25) {
                            let moduleId = andCon[i]['br']['module_id']
                            switch(moduleId) {
                                case 1:
                                    let eventModuleData = await this.getEventModuleData(andCon[i], otherDataPass['event']);
                                    if ((andCon[i]['br']['type'] == 0 && !eventModuleData?.['Join']?.hasOwnProperty(andCon[i]['br']['activity_id'])) || (andCon[i]['br']['type'] == 1 && !eventModuleData?.['Attend']?.hasOwnProperty(andCon[i]['br']['activity_id']))) {
                                        andConditionStatus = false;
                                    }
                                    break;
                                case 2:
                                    if(!otherDataPass['eha']['qData']){
                                        andConditionStatus = false;
                                    }else{
                                        let ehaData = await this.emotionalResultDataEha(andCon[i], otherDataPass['eha']);
                                        if (!ehaData.hasOwnProperty(andCon[i]['br']['activity_id']) || (ehaData[andCon[i]['br']['activity_id']] != andCon[i]['br']['type'])) {
                                            andConditionStatus = false;
                                        }
                                    }
                                    break;
                                case 3:
                                    let ageGenderModuleData = await this.getAgeGenderModuleData(andCon[i], otherDataPass['agegender']);
                                    if (!ageGenderModuleData.includes(andCon[i]['br']['activity_id'])) {
                                        andConditionStatus = false;
                                    }
                                    break;
                                case 4:
                                    let challengeModuleData = await this.getChallengeModuleData(andCon[i], otherDataPass['challenge']);
                                    if (!challengeModuleData?.hasOwnProperty(andCon[i]['br']['activity_id'])) {
                                        andConditionStatus = false;
                                    }
                                    break;
                                case 5:
                                    let quickLinkModuleData = await this.getQuickLinkModuleData(andCon[i], otherDataPass['quicklink']);
                                    if (!quickLinkModuleData?.hasOwnProperty(andCon[i]['br']['activity_id'])) {
                                        andConditionStatus = false;
                                    }
                                    break;
                                case 6:
                                    let quizModuleData = await this.getQuizModuleData(andCon[i], otherDataPass['quiz']);
                                    if (!(quizModuleData?.[andCon[i]?.['br']?.['type']]?.[andCon[i]?.['br']?.['activity_id']] ?? false) || (andCon[i]['br']['type'] == 0 && (quizModuleData[andCon[i]['br']['type']][andCon[i]['br']['activity_id']] < andCon[i]['br']['s_range'] || quizModuleData[andCon[i]['br']['type']][andCon[i]['br']['activity_id']] > andCon[i]['br']['e_range']))) {
                                        andConditionStatus = false;
                                    }
                                    break;
                            }
                            /*TODO 7,8,9 module add*/
                        } else {
                            andConditionStatus = false;
                        }
                    }
                }
                let orConditionStatus = false;
                if (orCon.length !== 0 && (!andCon || andConditionStatus == true)) {
                    for (let i = 0; i < orCon.length; i++) {
                        if (
                            orCon[i]['br']?.age == 0 ||
                                (orCon[i]['br'].ageoption == 0 && orCon[i]['br'].age_s_range == bDay) ||
                                (orCon[i]['br'].ageoption == 1 && bDay > orCon[i]['br'].age_s_range) ||
                                (orCon[i]['br'].ageoption == 2 && bDay >= orCon[i]['br'].age_s_range) ||
                                (orCon[i]['br'].ageoption == 3 && bDay < orCon[i]['br'].age_s_range) ||
                                (orCon[i]['br'].ageoption == 4 && bDay <= orCon[i]['br'].age_s_range) ||
                                (orCon[i]['br'].ageoption == 5 && bDay >= orCon[i]['br'].age_s_range && bDay <= orCon[i]['br'].age_e_range)

                        ) {
                            if (orCon[i]['br']['gender'] == 0 || (orCon[i]['br']['gender'] == userGender)) {
                                let hraData:any,tobaccoData: any,physicianData:any,dentalData:any,optometryData:any,ohAssessmentData:any;
                                if ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 26].includes(orCon[i]['br']['biometric_id']) && otherDataPass['biometrics']) {
                                    let tmpConditionVal: any = orCon[i]['tmp_condition_val'];
                                    let tmpConditionVal1: any = orCon[i]['tmp_condition_val_1'];
                                    orConditionStatus = false;
                                    if (orCon[i]['br'].progress == 0) {
                                        if (tmpConditionVal != '' && ( (orCon[i]['br'].type == 1 && tmpConditionVal <= orCon[i]['br'].s_range) || (orCon[i]['br'].type == 2 && tmpConditionVal >= orCon[i]['br'].s_range) || (orCon[i]['br'].type == 0 && tmpConditionVal >= orCon[i]['br'].s_range && tmpConditionVal <= orCon[i]['br'].e_range))) {
                                            orConditionStatus = true;
                                            break;
                                        }
                                    } else if (andCon[i]['br'].progress == 1 || andCon[i]['br'].progress == 2) {
                                        if (tmpConditionVal != '' && tmpConditionVal1 != '' && ((orCon[i]['br'].progress == 1 && (tmpConditionVal1 - orCon[i]['br'].s_range) > tmpConditionVal) || (orCon[i]['br'].progress == 2 && (tmpConditionVal1 + orCon[i]['br'].s_range) < tmpConditionVal))) {
                                            orConditionStatus = true;
                                            break;
                                        }
                                    }
                                } else if ([13, 14, 15, 16, 17].includes(orCon[i]['br']['biometric_id']) && otherDataPass['hra']){
                                    hraData = await this.gettingHraData(orCon[i], otherDataPass['hra']);
                                    if (hraData && hraData[orCon[i]['br']['biometric_id']] == orCon[i]['br']['type']) {
                                        orConditionStatus = true;
                                        break;
                                    }
                                } else if (orCon[i]['br']['biometric_id'] == 19 && otherDataPass['tobacco']) {
                                    tobaccoData = await this.getTobaccoData(orCon[i], otherDataPass['tobacco']);
                                    if (tobaccoData !== '' && tobaccoData == orCon[i]['br']['type']) {
                                        orConditionStatus = true;
                                        break;
                                    }
                                } else if (orCon[i]['br']['biometric_id'] == 20 && otherDataPass['physician']) {
                                    physicianData = await this.getPhysicianData(orCon[i], otherDataPass['physician']);
                                    if (physicianData[orCon[i]['br']['type']] == 1) {
                                        orConditionStatus = true;
                                        break;
                                    }
                                } else if (orCon[i]['br']['biometric_id'] == 21 && otherDataPass['dental']) {
                                    dentalData = await this.getDentalData(orCon[i], otherDataPass['dental']);
                                    if (dentalData != '') {
                                        orConditionStatus = true;
                                        break;
                                    }
                                } else if (orCon[i]['br']['biometric_id'] == 22 && otherDataPass['optimetric']) {
                                    optometryData = await this.getOptometryData(orCon[i], otherDataPass['optimetric']);
                                    if (optometryData != '') {
                                        orConditionStatus = true;
                                        break;
                                    }
                                } else if (orCon[i]['br']['biometric_id'] == 30 && otherDataPass['ohassessment']) {
                                    ohAssessmentData = await this.getOhAssessmentData(orCon[i], otherDataPass['ohassessment']);
                                    if (ohAssessmentData != '') {
                                        orConditionStatus = true;
                                        break;
                                    }
                                } else if (orCon[i]['br']['biometric_id'] == 25) {
                                    let moduleId = orCon[i]['br']['module_id']
                                    switch(moduleId) {
                                        case 1:
                                            let eventModuleData = await this.getEventModuleData(orCon[i], otherDataPass['event']);
                                            if ((orCon[i]['br']['type'] == 0 && eventModuleData?.['Join']?.hasOwnProperty(orCon[i]['br']['activity_id'])) || (orCon[i]['br']['type'] == 1 && eventModuleData?.['Attend']?.hasOwnProperty(orCon[i]['br']['activity_id']))) {
                                                orConditionStatus = true;
                                                break;
                                            }
                                            break;
                                        case 2:
                                            let ehaData = await this.emotionalResultDataEha(orCon[i], otherDataPass['eha']);
                                            if ((ehaData.hasOwnProperty(orCon[i]['br']['activity_id'])) || (ehaData[orCon[i]['br']['activity_id']] == orCon[i]['br']['type'])) {
                                                orConditionStatus = true;
                                                break;
                                            }
                                            break;
                                        case 3:
                                            let ageGenderModuleData = await this.getAgeGenderModuleData(orCon[i], otherDataPass['agegender']);
                                            if (ageGenderModuleData.includes(orCon[i]['br']['activity_id'])) {
                                                orConditionStatus = true;
                                                break;
                                            }
                                            break;
                                        case 4:
                                            let challengeModuleData = await this.getChallengeModuleData(orCon[i], otherDataPass['challenge']);
                                            if (challengeModuleData?.[orCon[i]['br']['activity_id']]) {
                                                orConditionStatus = true;
                                                break;
                                            }
                                            break;
                                        case 5:
                                            let quickLinkModuleData = await this.getQuickLinkModuleData(orCon[i], otherDataPass['quicklink']);
                                            if (quickLinkModuleData?.[orCon[i]['br']['activity_id']]) {
                                                orConditionStatus = true;
                                                break;
                                            }
                                            break;
                                        case 6:
                                            let quizModuleData = await this.getQuizModuleData(orCon[i], otherDataPass['quiz']);
                                            if (quizModuleData[orCon[i]['br']['type']][orCon[i]['br']['activity_id']] || ([1,2].includes(orCon[i]['br']['type']) || (orCon[i]['br']['type'] == 0 && quizModuleData[orCon[i]['br']['type']][orCon[i]['br']['activity_id']] >= orCon[i]['br']['s_range'] && quizModuleData[orCon[i]['br']['type']][orCon[i]['br']['activity_id']] <= orCon[i]['br']['e_range']))) {
                                                orConditionStatus = true;
                                                break;
                                            }
                                            break;
                                    }
                                    /*TODO 7,8,9 module add*/
                                }
                            }
                        }
                    }
                }
                if (andCon.length !== 0 || orCon.length !== 0) {
                    if ((orCon.length === 0 && andConditionStatus == true) || (andCon.length === 0 && orConditionStatus == true) || (orConditionStatus == true && andConditionStatus == true)) {
                        return true;
                    }
                }
            }
        }catch(err){
            throw new Error(err.message);
        }
    }
    async gettingBiometricData(assignRule, biometrics, bioData) {
        try{
            let tmpConditionVal: any = 0,tmpConditionVal1: any = 0,biometricsRevFirst: any;
            let biometricId = assignRule['br']['biometric_id'];
            let bioDataKey = bioData[biometricId];
            if (assignRule['br']['progress'] == 0 || ([0, 1].includes(assignRule['br']['progress_setting']))) {
                biometricsRevFirst = biometrics
                    .map(item => {
                        const v = item[bioDataKey as keyof typeof item]; // assert key exists
                        if (typeof v === 'string' && v.includes(':')) {
                            const [f, i] = v.split(':').map(Number);
                            return !isNaN(f) && !isNaN(i) ? f + i / 12 : NaN;
                        }
                        const num = Number(v);
                        return isNaN(num) ? NaN : num;
                    })
                    .filter(v => v);
                tmpConditionVal = Math.round(parseFloat(biometricsRevFirst[0]) * 100) / 100;
            }
            let firstValue = 0;
            if ([1, 2].includes(assignRule['br']['progress'])) {
                let biometricsRev = JSON.parse(JSON.stringify(biometrics)).reverse();
                switch(assignRule['br']['progress_setting']) {
                    case 0:
                        biometricsRevFirst = biometricsRev.map(item => Number(item[bioDataKey])).filter(value => value);
                        firstValue = biometricsRevFirst.length > 0 ? biometricsRevFirst[0].toString().split('.').slice(0, 2).join('.') : 0;
                        /*tmpConditionVal1 = parseFloat(Number(firstValue).toFixed(2));*/
                        tmpConditionVal1 = Math.round(parseFloat(String(firstValue)) * 100) / 100;
                        break;
                    case 1:
                        const oneYearAgoDate = new Date();
                        oneYearAgoDate.setFullYear(oneYearAgoDate.getFullYear() - 1);
                        let oneYearAgo: any = await this.commonDateService.DateTimeFormat(oneYearAgoDate,'timestamp','YYYY-MM-DD HH:mm:ss');
                        biometricsRevFirst = [];
                        for (let i = 0; i < biometricsRev.length; i++) {
                            const item = biometricsRev[i];
                            if (!item[bioDataKey]) continue;
                            const createdTime = await this.commonDateService.DateTimeFormat(item.created,'timestamp','YYYY-MM-DD HH:mm:ss');
                            if (createdTime >= oneYearAgo) {
                                const value = Number(item[bioDataKey]);
                                if (value) {
                                    biometricsRevFirst.push(value);
                                }
                            }
                        }
                        tmpConditionVal1 = biometricsRevFirst.length > 0 ? Math.round(parseFloat(biometricsRevFirst[0]) * 100) / 100 : 0;
                        break;
                    case 2:
                        const cStartDate = await this.commonDateService.DateTimeFormat(assignRule.br.c_start_date,'timestamp','YYYY-MM-DD');
                        const cEndDate = await this.commonDateService.DateTimeFormat(assignRule.br.c_end_date,'timestamp','YYYY-MM-DD');
                        biometricsRevFirst = biometricsRev.filter(item => {
                            return this.commonDateService.DateTimeFormat(item.created,'timestamp','YYYY-MM-DD') >= cStartDate;
                        });
                        if (biometricsRevFirst.length > 0) {
                            const tmpDataFirst = biometricsRevFirst.map(item => Number(item[bioDataKey])).filter(Boolean);
                            if (tmpDataFirst.length > 0) {
                                tmpConditionVal1 = Math.round(parseFloat(tmpDataFirst[0]) * 100) / 100;
                            }
                            biometricsRevFirst = biometricsRevFirst.reverse();
                            let biometricsRevSecond: any = [];
                            for (let i = 0; i < biometricsRevFirst.length; i++) {
                                const item = biometricsRevFirst[i];
                                if (!item[bioDataKey]) continue;
                                const createdTime = await this.commonDateService.DateTimeFormat(item.created,'timestamp','YYYY-MM-DD');
                                if (createdTime <= cEndDate) {
                                    const value = Number(item[bioDataKey]);
                                    if (value) {
                                        biometricsRevSecond.push(value);
                                    }
                                }
                            }
                            if (biometricsRevSecond.length > 0) {
                                tmpConditionVal = Math.round(parseFloat(biometricsRevSecond[0]) * 100) / 100;
                            }
                        }
                        break;
                }
            }
            if (assignRule['br']['progress'] === 0) {
                let biometricsRev = JSON.parse(JSON.stringify(biometrics)).reverse();
                let bStartDate: any = await this.commonDateService.DateTimeFormat(assignRule['bstart_date'],'timestamp','YYYY-MM-DD HH:mm:ss');
                let bEndDate: any = await this.commonDateService.DateTimeFormat(assignRule['bend_date'],'timestamp','YYYY-MM-DD HH:mm:ss');
                switch(assignRule['recommended_base']) {
                    case 0:
                        biometricsRevFirst = biometricsRev.map(item => Number(item[bioDataKey])).filter(value => value);
                        break;
                    case 1:
                        let currentYear = new Date().getFullYear();
                        biometricsRevFirst = biometricsRev.filter(item => item['years'] == currentYear).map(item => Number(item[bioDataKey])).filter(value => value);
                        break;
                    case 2:
                        biometricsRevFirst = biometricsRev.filter(item => this.commonDateService.DateTimeFormat(item.created,'timestamp','YYYY-MM-DD HH:mm:ss') >= bStartDate && this.commonDateService.DateTimeFormat(item.created,'timestamp','YYYY-MM-DD HH:mm:ss') <= bEndDate).map(item => Number(item[bioDataKey])).filter(value => value);
                        break;
                    case 3:
                        biometricsRevFirst = biometricsRev.filter(item => this.commonDateService.DateTimeFormat(item.created,'timestamp','YYYY-MM-DD HH:mm:ss') <= bStartDate).map(item => Number(item[bioDataKey])).filter(value => value);
                        break;
                    case 4:
                        biometricsRevFirst = biometricsRev.filter(item => this.commonDateService.DateTimeFormat(item.created,'timestamp','YYYY-MM-DD HH:mm:ss') >= bEndDate).map(item => Number(item[bioDataKey])).filter(value => value);
                        break;
                    default:
                        tmpConditionVal = tmpConditionVal1;
                        break
                }
                firstValue = biometricsRevFirst.length > 0 ? biometricsRevFirst[0].toString().split('.').slice(0, 2).join('.') : 0;
                tmpConditionVal1 = Number(firstValue) ? parseFloat(Number(firstValue).toFixed(2)) : 0.00;
                if (assignRule['recommended_base'] != 0) {
                    tmpConditionVal = tmpConditionVal1;
                }
            }
            assignRule['tmp_condition_val'] = tmpConditionVal;
            assignRule['tmp_condition_val_1'] = tmpConditionVal1;
            return assignRule;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async gettingHraData(assignRule, hraData) {
        try{
            let assessment:any;
            let recommendedBase = assignRule['recommended_base'];
            let bStartDate: any = await this.commonDateService.DateTimeFormat(assignRule['bstart_date'],'timestamp','YYYY-MM-DD HH:mm:ss');
            let bEndDate: any = await this.commonDateService.DateTimeFormat(assignRule['bend_date'],'timestamp','YYYY-MM-DD HH:mm:ss');
            switch(recommendedBase) {
                case 0:
                    assessment = { 'Assessment': hraData[0] };
                    break;
                case 1:
                    assessment = { 'Assessment': hraData.find(nstep => nstep['years'] == new Date().getFullYear())};
                    break;
                case 2:
                    let hraRevFirst = hraData.find(item => this.commonDateService.DateTimeFormat(item.date,'timestamp','YYYY-MM-DD HH:mm:ss') >= bStartDate && this.commonDateService.DateTimeFormat(item.date,'timestamp','YYYY-MM-DD HH:mm:ss') <= bEndDate);
                    assessment = { 'Assessment': hraRevFirst };
                    break;
                case 3:
                    let firstFilteredAssessment = hraData.find(item => this.commonDateService.DateTimeFormat(item.date,'timestamp','YYYY-MM-DD HH:mm:ss') <= bStartDate);
                    assessment = {'Assessment': firstFilteredAssessment};
                    break;
                case 4:
                    let firstAssessmentOnOrAfterEndDate = hraData.find(item => this.commonDateService.DateTimeFormat(item.date,'timestamp','YYYY-MM-DD HH:mm:ss') >= bEndDate);
                    assessment = { 'Assessment': firstAssessmentOnOrAfterEndDate };
                    break;
            }
            const resultArray = {};
            if(assessment) {
                for(let i:number = 1; i < 6; i++) {
                    let score: number = Math.round((1 - (assessment?.['Assessment']?.[i+'_qscore'] / assessment?.['Assessment']?.[i+'_WorstScore'])) * 100);
                    if(score <= 49) {
                        resultArray[12 + i] = 2;
                    } else if(score >= 50 && score <= 89) {
                        resultArray[12 + i] = 1;
                    } else if(score >= 90 && score <= 100) {
                        resultArray[12 + i] = 0;
                    }
                }
            }
            return resultArray;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async getTobaccoData(assignRule, tobaccoData) {
        try{
            let returnData: any = '', TabaccoRevFirst:any;
            let recommendedBase = assignRule['recommended_base'];
            let bStartDate: any = await this.commonDateService.DateTimeFormat(assignRule['bstart_date'],'timestamp','YYYY-MM-DD HH:mm:ss');
            let bEndDate: any = await this.commonDateService.DateTimeFormat(assignRule['bend_date'],'timestamp','YYYY-MM-DD HH:mm:ss');
            switch(recommendedBase) {
                case 0:
                    tobaccoData = { 'tobacco_user': tobaccoData?.[0] || {} };
                    break;
                case 1:
                    tobaccoData = { 'tobacco_user': tobaccoData.find(nstep => nstep['years'] == new Date().getFullYear()) || {} };
                    break;
                case 2:
                    TabaccoRevFirst = tobaccoData.filter(item => this.commonDateService.DateTimeFormat(item.created,'timestamp','YYYY-MM-DD HH:mm:ss') >= bStartDate && this.commonDateService.DateTimeFormat(item.created,'timestamp','YYYY-MM-DD HH:mm:ss') <= bEndDate);
                    tobaccoData = { 'tobacco_user': TabaccoRevFirst?.[0] || {} };
                    break;
                case 3:
                    TabaccoRevFirst = tobaccoData.filter(item => this.commonDateService.DateTimeFormat(item.date_completed,'timestamp','YYYY-MM-DD HH:mm:ss') <= bStartDate);
                    tobaccoData = { 'tobacco_user': TabaccoRevFirst?.[0] || {} };
                    break;
                case 4:
                    TabaccoRevFirst = tobaccoData.filter(item => this.commonDateService.DateTimeFormat(item.date_completed,'timestamp','YYYY-MM-DD HH:mm:ss') >= bEndDate);
                    tobaccoData = { 'tobacco_user': TabaccoRevFirst?.[0] || {} };
                    break;
            }
            if(Object.keys(tobaccoData['tobacco_user']).length > 0) {
                const resultObj = {2: 0, 3: 2};
                returnData = resultObj[tobaccoData['tobacco_user']['is_tobacco_user']] ?? tobaccoData['tobacco_user']['is_tobacco_user'];
            }
            return returnData;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async getPhysicianData(assignRule, physicianData) {
        try{
            let resultArray = [0, 0, 0, 0, 0],activityDone: any, AuthorizationRevFirst:any, activityRevFirst:any;
            let recommendedBase = assignRule['recommended_base'];
            let bStartDate: any = await this.commonDateService.DateTimeFormat(assignRule['bstart_date'],'timestamp','YYYY-MM-DD HH:mm:ss');
            let bEndDate: any = await this.commonDateService.DateTimeFormat(assignRule['bend_date'],'timestamp','YYYY-MM-DD HH:mm:ss');
            switch(recommendedBase) {
                case 0:
                    if (physicianData['Authorization']) {
                        resultArray[0] = resultArray[1] = 1;
                    }
                    if (physicianData['activity']) {
                        activityDone = physicianData['activity'];
                    }
                    break;
                case 1:
                    let currentYear = new Date().getFullYear();
                    let activity = physicianData.activity.find(nstep => nstep.years == currentYear);
                    let Authorization = physicianData.Authorization.find(nstep => nstep.years == currentYear);
                    if(Authorization) {
                        resultArray[0] = resultArray[1] = 1;
                    }
                    if(activity) {
                        activityDone = [activity];
                    }
                    break;
                case 2:
                    AuthorizationRevFirst = physicianData.Authorization.filter(item => this.commonDateService.DateTimeFormat(item.date_completed,'timestamp','YYYY-MM-DD HH:mm:ss') >= bStartDate && this.commonDateService.DateTimeFormat(item.date_completed,'timestamp','YYYY-MM-DD HH:mm:ss') <= bEndDate);
                    if (AuthorizationRevFirst.length > 0) {
                        resultArray[0] = resultArray[1] = 1;
                    }
                    activityRevFirst = physicianData.activity.filter(item => this.commonDateService.DateTimeFormat(item.created,'timestamp','YYYY-MM-DD HH:mm:ss') >= bStartDate && this.commonDateService.DateTimeFormat(item.created,'timestamp','YYYY-MM-DD HH:mm:ss') <= bEndDate);
                    if (activityRevFirst.length > 0) {
                        activityDone = activityRevFirst;
                    }
                    break;
                case 3:
                    AuthorizationRevFirst = physicianData.Authorization.filter(item => this.commonDateService.DateTimeFormat(item.date_completed,'timestamp','YYYY-MM-DD HH:mm:ss') <= bStartDate);
                    if (AuthorizationRevFirst.length > 0) {
                        resultArray[0] = resultArray[1] = 1;
                    }
                    activityRevFirst = physicianData.activity.filter(item => this.commonDateService.DateTimeFormat(item.created,'timestamp','YYYY-MM-DD HH:mm:ss') <= bStartDate);
                    if (activityRevFirst.length > 0) {
                        activityDone = activityRevFirst;
                    }
                    break;
                case 4:
                    AuthorizationRevFirst = physicianData.Authorization.filter(item => this.commonDateService.DateTimeFormat(item.date_completed,'timestamp','YYYY-MM-DD HH:mm:ss') >= bEndDate);
                    if (AuthorizationRevFirst.length > 0) {
                        resultArray[0] = resultArray[1] = 1;
                    }
                    activityRevFirst = physicianData.activity.filter(item => this.commonDateService.DateTimeFormat(item.created,'timestamp','YYYY-MM-DD HH:mm:ss') >= bEndDate);
                    if (activityRevFirst.length > 0) {
                        activityDone = activityRevFirst;
                    }
                    break;
            }
            const isNonEmptyArray = await this.commonService.isNonEmptyArray(activityDone);
            const isNonEmptyObject = await this.commonService.isNonEmptyObject(activityDone);
            if (isNonEmptyArray || isNonEmptyObject) {
                resultArray[0] = 1;
                let source = activityDone.map(item => item?.source);
                if ([0, 1, 13, 14, 15].some(v => source.includes(v))) { resultArray[4] = 1; }
                if ([3, 11, 12].some(v => source.includes(v))) { resultArray[2] = 1; }
                if (source.includes(2)) { resultArray[3] = 1; }
            }
            return resultArray;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async getDentalData(assignRule, dentalData) {
        try{
            let result: number = 0,authorization: any,dentalRevFirst: any;
            let recommendedBase = assignRule['recommended_base'];
            let bStartDate: any = await this.commonDateService.DateTimeFormat(assignRule.bstart_date,'timestamp','YYYY-MM-DD HH:mm:ss');
            let bEndDate: any = await this.commonDateService.DateTimeFormat(assignRule.bend_date,'timestamp','YYYY-MM-DD HH:mm:ss');
            switch(recommendedBase) {
                case 0:
                    authorization = dentalData;
                    break;
                case 1:
                    let currentYear = new Date().getFullYear();
                    authorization = dentalData.find(nstep => nstep.years == currentYear);
                    break;
                case 2:
                    dentalRevFirst = dentalData.filter(item => this.commonDateService.DateTimeFormat(item.date_completed,'timestamp','YYYY-MM-DD HH:mm:ss') >= bStartDate);
                    if (dentalRevFirst.length > 0) {
                        dentalRevFirst = dentalRevFirst.filter(item => this.commonDateService.DateTimeFormat(item.date_completed,'timestamp','YYYY-MM-DD HH:mm:ss') <= bEndDate);
                        if (dentalRevFirst.length > 0) {
                            authorization = { hc_authorizations: dentalRevFirst[0] };
                        }
                    }
                    break;
                case 3:
                    dentalRevFirst = dentalData.filter(item => this.commonDateService.DateTimeFormat(item.date_completed,'timestamp','YYYY-MM-DD HH:mm:ss') <= bStartDate);
                    if (dentalRevFirst.length > 0) {
                        authorization = { hc_authorizations: dentalRevFirst[0] };
                    }
                    break;
                case 4:
                    dentalRevFirst = dentalData.filter(item => this.commonDateService.DateTimeFormat(item.date_completed,'timestamp','YYYY-MM-DD HH:mm:ss') >= bEndDate);
                    if (dentalRevFirst.length > 0) {
                        authorization = { hc_authorizations: dentalRevFirst[0]};
                    }
                    break;
            }
            const isNonEmptyArray = await this.commonService.isNonEmptyArray(authorization);
            const isNonEmptyObject = await this.commonService.isNonEmptyObject(authorization);
            if (isNonEmptyArray || isNonEmptyObject) {
                result = 1;
            }
            return result;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async getOptometryData(assignRule, optometryData) {
        try{
            let result:number = 0,authorization: any,optometryRevFirst: any;
            let recommendedBase = assignRule['recommended_base'];
            let bStartDate: any = await this.commonDateService.DateTimeFormat(assignRule.bstart_date,'timestamp','YYYY-MM-DD HH:mm:ss');
            let bEndDate: any = await this.commonDateService.DateTimeFormat(assignRule.bend_date,'timestamp','YYYY-MM-DD HH:mm:ss');
            switch(recommendedBase) {
                case 0:
                    authorization = optometryData;
                    break;
                case 1:
                    let currentYear = new Date().getFullYear();
                    authorization = optometryData.find(nstep => nstep.years == currentYear);
                    break;
                case 2:
                    optometryRevFirst = optometryData.filter(item => this.commonDateService.DateTimeFormat(item.date_completed,'timestamp','YYYY-MM-DD HH:mm:ss') >= bStartDate);
                    if (optometryRevFirst.length > 0) {
                        let optometryRevSecond = optometryRevFirst.filter(item => this.commonDateService.DateTimeFormat(item.date_completed,'timestamp','YYYY-MM-DD HH:mm:ss') <= bEndDate);
                        if (optometryRevSecond.length > 0) {
                            authorization = { hc_authorizations: optometryRevSecond[0] };
                        }
                    }
                    break;
                case 3:
                    optometryRevFirst = optometryData.filter(item => this.commonDateService.DateTimeFormat(item.date_completed,'timestamp','YYYY-MM-DD HH:mm:ss') <= bStartDate);
                    if (optometryRevFirst.length > 0) {
                        authorization = { hc_authorizations: optometryRevFirst[0] };
                    }
                    break;
                case 4:
                    optometryRevFirst = optometryData.filter(item => this.commonDateService.DateTimeFormat(item.date_completed,'timestamp','YYYY-MM-DD HH:mm:ss') >= bEndDate);
                    if (optometryRevFirst.length > 0) {
                        authorization = { hc_authorizations: optometryRevFirst[0] };
                    }
                    break;
            }
            const isNonEmptyArray = await this.commonService.isNonEmptyArray(authorization);
            const isNonEmptyObject = await this.commonService.isNonEmptyObject(authorization);
            if (isNonEmptyArray || isNonEmptyObject) {
                result = 1;
            }
            return result;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async getOhAssessmentData(assignRule, ohaData) {
        try{
            let result:number = 0,assessment: any,ohaRevSecond:any,ohaRevFirst:any ;
            let recommendedBase = assignRule['recommended_base'];
            let bStartDate: any = await this.commonDateService.DateTimeFormat(assignRule.bstart_date,'timestamp','YYYY-MM-DD HH:mm:ss');
            let bEndDate: any = await this.commonDateService.DateTimeFormat(assignRule.bend_date,'timestamp','YYYY-MM-DD HH:mm:ss');
            switch(recommendedBase) {
                case 0:
                    assessment = ohaData[0];
                    break;
                case 1:
                    let currentYear = new Date().getFullYear();
                    assessment = ohaData.find(nstep => {let nStepYear = new Date(nstep['years']).getFullYear();return nStepYear == currentYear;});
                    break;
                case 2:
                    ohaRevFirst = ohaData.filter(obj => this.commonDateService.DateTimeFormat(obj.date,'timestamp','YYYY-MM-DD HH:mm:ss') >= bStartDate);
                    if (ohaRevFirst.length > 0) {
                        ohaRevSecond = ohaRevFirst.filter(obj => this.commonDateService.DateTimeFormat(obj.date,'timestamp','YYYY-MM-DD HH:mm:ss') <= bEndDate);
                        if (ohaRevSecond.length > 0) {
                            assessment = { 'Assessment': ohaRevSecond[0] };
                        }
                    }
                    break;
                case 3:
                    ohaRevFirst = ohaData.filter(obj => this.commonDateService.DateTimeFormat(obj.date,'timestamp','YYYY-MM-DD HH:mm:ss') <= bStartDate);
                    if (ohaRevFirst.length > 0) {
                        assessment = { 'Assessment': ohaRevFirst[0] };
                    }
                    break;
                case 4:
                    ohaRevFirst = ohaData.filter(obj => this.commonDateService.DateTimeFormat(obj.date,'timestamp','YYYY-MM-DD HH:mm:ss') >= bEndDate);
                    if (ohaRevFirst.length > 0) {
                        assessment = { 'Assessment': ohaRevFirst[0] };
                    }
                    break;
            }
            const isNonEmptyArray = await this.commonService.isNonEmptyArray(assessment);
            const isNonEmptyObject = await this.commonService.isNonEmptyObject(assessment);
            if (isNonEmptyArray || isNonEmptyObject) {
                result = 1;
            }
            return result;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async getEventModuleData(assignRule, eventData) {
        try{
            let response: any = {},userBookingList: any= {},eventsData:any[] = [];
            let recommendedBase = assignRule['recommended_base'];
            let bStartDate: any = await this.commonDateService.DateTimeFormat(assignRule.bstart_date,'timestamp','YYYY-MM-DD HH:mm:ss');
            let bEndDate: any = await this.commonDateService.DateTimeFormat(assignRule.bend_date,'timestamp','YYYY-MM-DD HH:mm:ss');
            switch(recommendedBase) {
                case 0:
                    for (let i: number = 0; i < eventData?.length; i++) {
                        const value = eventData[i];
                        if (value) {
                            userBookingList[value?.['ev_events_id']] = value?.['ev_attend_status'];
                        }
                    }
                    break;
                case 1:
                    let currentYear = new Date().getFullYear();
                    let events = eventData.filter(nstep => new Date(nstep['years']).getFullYear() == currentYear);
                    if(events.length > 0) {
                        for (let i: number = 0; i < events.length; i++) {
                            const value = events[i];
                            if (value) {
                                userBookingList[value?.['ev_events_id']] = value?.['ev_attend_status'];
                            }
                        }
                    }
                    break;
                case 2:
                    let eventRevFirst = eventData.filter(obj => this.commonDateService.DateTimeFormat(obj.modified,'timestamp','YYYY-MM-DD HH:mm:ss') >= bStartDate);
                    if (eventRevFirst.length > 0) {
                        let eventRevSecond: any = eventRevFirst.filter(obj => this.commonDateService.DateTimeFormat(obj.modified,'timestamp','YYYY-MM-DD HH:mm:ss') <= bEndDate);
                        if (eventRevSecond.length > 0) {
                            eventsData.push(eventRevSecond[0]);
                        }
                    }
                    if (eventsData.length > 0) {
                        for (let i: number = 0; i < eventsData.length; i++) {
                            const value = eventsData[i];
                            if (value) {
                                userBookingList[value?.['ev_events_id']] = value?.['ev_attend_status'];
                            }
                        }
                    }
                    break;
                case 3:
                    eventRevFirst = eventData.filter((obj) => this.commonDateService.DateTimeFormat(obj.modified,'timestamp','YYYY-MM-DD HH:mm:ss') <= bStartDate);
                    if (eventRevFirst.length > 0) {
                        eventsData.push(eventRevFirst[0]);
                    }
                    if (eventsData.length > 0) {
                        for (let i: number = 0; i < eventsData.length; i++) {
                            const value = eventsData[i];
                            if (value) {
                                userBookingList[value?.['ev_events_id']] = value?.['ev_attend_status'];
                            }
                        }
                    }
                    break;
                case 4:
                    eventRevFirst = eventData.filter(userBookingList => this.commonDateService.DateTimeFormat(userBookingList.modified,'timestamp','YYYY-MM-DD HH:mm:ss') >= bEndDate);
                    if (eventRevFirst.length > 0) {
                        eventsData.push(eventRevFirst[0]);
                    }
                    if(eventsData.length > 0){
                        for (let i: number = 0; i < eventsData.length; i++) {
                            const value = eventsData[i];
                            if (value) {
                                userBookingList[value?.['ev_events_id']] = value?.['ev_attend_status'];
                            }
                        }
                    }
                    break;
            }
            if(Object.keys(userBookingList).length > 0){
                response['Join'] = userBookingList;
                response['Attend'] = Object.fromEntries(Object.entries(userBookingList).filter(([key, value]) => value));
            }
            return response;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async emotionalResultDataEha(assignRule, emotionalData) {
        try{
            let questionScore = {},tabsAllExtraData = {},resultArray = {},tabsAll = '',qData: any,ehaRevFirst: any = [],ehaRevSecond:any = [],quData = [];
            if(emotionalData['Tabsall'] && emotionalData['Tabsall'].length > 0){
                tabsAll = emotionalData['Tabsall'];
            }
            let extraData = emotionalData['extradata'];
            let recommendedBase = assignRule['recommended_base'];
            let bStartDate: any = await this.commonDateService.DateTimeFormat(assignRule.bstart_date,'timestamp','YYYY-MM-DD HH:mm:ss');
            let bEndDate: any = await this.commonDateService.DateTimeFormat(assignRule.bend_date,'timestamp','YYYY-MM-DD HH:mm:ss');
            switch(recommendedBase) {
                case 0:
                    if (Object.keys(emotionalData['qData'])?.length > 0){
                        if (extraData != '') {
                            qData = emotionalData['qData'];
                        } else {
                            qData = Object.values(emotionalData['qData'])[0];
                        }
                    }
                    break;
                case 1:
                    if (Object.keys(emotionalData['qData']).length > 0){
                        let currentYear = new Date().getFullYear();
                        let quData = [];
                        if (extraData != ''){
                            quData.push(emotionalData['qData']);
                        } else {
                            quData = emotionalData['qData'];
                        }
                        let values = Object.values(quData);
                        for (let i = 0; i < values.length; i++) {
                            const nstep = values[i];
                            if ((nstep['0']?.years == currentYear) || (nstep?.years == currentYear)) {
                                qData = nstep;
                                break;
                            }
                        }
                    }
                    break;
                case 2:
                    if (Object.keys(emotionalData['qData']).length > 0) {
                        if (extraData != '') {
                            quData.push(emotionalData['qData']);
                        } else {
                            quData = emotionalData['qData'];
                        }
                        let values = Object.values(quData);
                        for (let i = 0; i < values.length; i++) {
                            let nstep = values[i];
                            if (await this.commonDateService.DateTimeFormat(nstep['EmotionalAssessments']['created'],'timestamp','YYYY-MM-DD HH:mm:ss') >= bStartDate) {
                                ehaRevFirst.push(nstep);
                            }
                        }
                        if (ehaRevFirst.length > 0) {
                            for (let i = 0; i < ehaRevFirst.length; i++) {
                                let nstep = ehaRevFirst[i];
                                if (await this.commonDateService.DateTimeFormat(nstep['EmotionalAssessments']['created'],'timestamp','YYYY-MM-DD HH:mm:ss') <= bEndDate) {
                                    ehaRevSecond.push(nstep);
                                }
                            }
                            if (ehaRevSecond.length > 0) {
                                qData = ehaRevSecond[0];
                            }
                        }
                    }
                    break;
                case 3:
                    if (Object.keys(emotionalData['qData']).length > 0) {
                        if (extraData != '') {
                            quData.push(emotionalData['qData']);
                        } else {
                            quData = emotionalData['qData'];
                        }
                        let values = Object.values(quData);
                        for (let i = 0; i < values.length; i++) {
                            let nstep = values[i];
                            if (await this.commonDateService.DateTimeFormat(nstep['EmotionalAssessments']['created'],'timestamp','YYYY-MM-DD HH:mm:ss') <= bStartDate) {
                                ehaRevFirst.push(nstep);
                            }
                        }
                        if (ehaRevFirst.length > 0) {
                            qData = ehaRevFirst[0];
                        }
                    }
                    break;
                case 4:
                    if (Object.keys(emotionalData['qData']).length > 0) {
                        if (extraData != '') {
                            quData.push(emotionalData['qData']);
                        } else {
                            quData = emotionalData['qData'];
                        }
                        let values = Object.values(quData);
                        for (let i = 0; i < values.length; i++) {
                            let nstep = values[i];
                            if (await this.commonDateService.DateTimeFormat(nstep['EmotionalAssessments']['created'],'timestamp','YYYY-MM-DD HH:mm:ss') >= bEndDate) {
                                ehaRevFirst.push(nstep);
                            }
                        }
                        if (ehaRevFirst.length > 0) {
                            qData = ehaRevFirst[0];
                        }
                    }
                    break;
            }
            if (tabsAll?.length && Object.keys(qData || {})?.length) {
                if (qData?.['EmotionalAssessmentsResults'] && Object.keys(qData['EmotionalAssessmentsResults'])?.length) {
                    const emotionalAssessmentsResults: any = Object.values(qData['EmotionalAssessmentsResults'] || {});
                    for (let i = 0; i < emotionalAssessmentsResults.length; i++) {
                        const answers = Object.values(emotionalAssessmentsResults[i]['EmotionalAssessmentsAnswers'] || {});
                        for (let j = 0; j < answers.length; j++) {
                            const option: any = answers[j]['AssessmentOptions'];
                            if (option && option.AssessmentQuestions && Object.keys(option).length !== 0) {
                                const resultType = option.AssessmentQuestions.result_type;
                                const riskRating = option.risk_rating;
                                questionScore[resultType] = questionScore[resultType] || {}
                                if (questionScore[resultType] && questionScore[resultType][riskRating]) {
                                    questionScore[resultType][riskRating] = questionScore[resultType][riskRating] || 0
                                    questionScore[resultType][riskRating] += 1;
                                } else {
                                    questionScore[resultType] = { [riskRating] : 1 };
                                }
                            }
                        }
                    }
                    let keys = Object.keys(questionScore);
                    for(let i = 0; i < keys.length; i++) {
                        let questionScoreKey = keys[i];
                        let questionScoreData = questionScore[questionScoreKey];
                        if (questionScoreData[2]) {
                            questionScore[questionScoreKey] = 2;
                        } else if (questionScoreData[1]) {
                            questionScore[questionScoreKey] = 1;
                        } else {
                            questionScore[questionScoreKey] = 0;
                        }
                    }
                }
                for (let i = 0; i < tabsAll.length; i++) {
                    let tabsAllData = tabsAll[i];
                    let tabsAllKey = tabsAllData['id'];
                    tabsAllExtraData[tabsAllKey] = tabsAllData['title'];
                    if (this.commonService.isValidNumber(questionScore[tabsAllKey])) {
                        resultArray[tabsAllKey] = questionScore[tabsAllKey];
                    }
                }
            }
            if(extraData == 'Yes'){
                resultArray['resultdetail'] = tabsAllExtraData;
            }
            return resultArray;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async getAgeGenderModuleData(assignRule, ageGenderData) {
        try{
            let resultArray = [],activityDone = [],activityRevFirst: any,activityRevSecond:any;
            let recommendedBase = assignRule['recommended_base'];
            let bStartDate: any = await this.commonDateService.DateTimeFormat(assignRule.bstart_date,'timestamp','YYYY-MM-DD HH:mm:ss');
            let bEndDate: any = await this.commonDateService.DateTimeFormat(assignRule.bend_date,'timestamp','YYYY-MM-DD HH:mm:ss');
            switch(recommendedBase) {
                case 0:
                    activityDone = ageGenderData;
                    break;
                case 1:
                    const currentYear = new Date().getFullYear();
                    let activity = ageGenderData.find(nstep => nstep.years == currentYear);
                    activityDone = [activity];
                    break;
                case 2:
                    activityRevFirst = ageGenderData.filter(item => this.commonDateService.DateTimeFormat(item.created,'timestamp','YYYY-MM-DD HH:mm:ss') >= bStartDate && this.commonDateService.DateTimeFormat(item.created,'timestamp','YYYY-MM-DD HH:mm:ss') <= bEndDate);
                    if (activityRevFirst.length > 0) {
                        activityDone = [activityRevFirst?.[0]];
                    }
                    break;
                case 3:
                    activityRevFirst = ageGenderData.filter(item => this.commonDateService.DateTimeFormat(item.created,'timestamp','YYYY-MM-DD HH:mm:ss') <= bStartDate);
                    if (activityRevFirst.length > 0) {
                        activityDone = [activityRevFirst?.[0]];
                    }
                    break;
                case 4:
                    activityRevFirst = ageGenderData.filter(item => this.commonDateService.DateTimeFormat(item.created,'timestamp','YYYY-MM-DD HH:mm:ss') >= bEndDate);
                    if (activityRevFirst.length > 0) {
                        activityDone = [activityRevFirst?.[0]];
                    }
                    break;
            }
            if (activityDone && activityDone.length > 0) {
                let trAgeActivityDone = [];
                for (let i = 0; i < activityDone.length; i++) {
                    const value = activityDone[i];
                    trAgeActivityDone = trAgeActivityDone.concat(
                        value.activity_id.split(',').map(Number)
                    );
                }
                resultArray = Array.from(new Set(trAgeActivityDone));
            }
            return resultArray;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async getChallengeModuleData(assignRule, challengeData) {
        try{
            let resultArray: any= {},newArray: any= {},challenges: any[]= [],scheduleUser: any = {},challengeRevFirst: any,challengeRevSecond:any;
            let recommendedBase = assignRule['recommended_base'];
            let bStartDate: any = await this.commonDateService.DateTimeFormat(assignRule.bstart_date,'timestamp','YYYY-MM-DD HH:mm:ss');
            let bEndDate: any = await this.commonDateService.DateTimeFormat(assignRule.bend_date,'timestamp','YYYY-MM-DD HH:mm:ss');
            switch(recommendedBase) {
                case 0:
                    if (challengeData.length > 0) {
                        challengeData.forEach((value, key) => {
                            if (value) {
                                newArray[value.schedule_id] = value.schedule_id;
                            }
                        });
                    }
                    scheduleUser = newArray;
                    break;
                case 1:
                    let currentYear = new Date().getFullYear();
                    challenges.push(challengeData.filter(nstep => +nstep['years'] == currentYear)[0]);
                    if(challenges.length > 0) {
                        challenges.forEach((value) => {
                            if(value !== undefined) {
                                newArray[value.schedule_id] = value.schedule_id;
                            }
                        });
                    }
                    scheduleUser = newArray;
                    break;
                case 2:
                    challengeRevFirst = challengeData.filter(item =>
                        this.commonDateService.DateTimeFormat(item.added_date,'timestamp','YYYY-MM-DD HH:mm:ss') >= bStartDate
                    );
                    if(challengeRevFirst.length > 0) {
                        challengeRevSecond = challengeRevFirst.filter(item =>
                            this.commonDateService.DateTimeFormat(item.added_date,'timestamp','YYYY-MM-DD HH:mm:ss') <= bEndDate
                        );
                        if(challengeRevSecond.length > 0) {
                            challenges.push(challengeRevSecond[0]);
                        }
                    }
                    if(challenges.length > 0) {
                        challenges.forEach((value, key) => {
                            if (value) {
                                newArray[value.schedule_id] = value.schedule_id;
                            }
                        });
                    }
                    scheduleUser = newArray;
                    break;
                case 3:
                    challengeRevFirst = challengeData.filter(item =>
                        this.commonDateService.DateTimeFormat(item.added_date,'timestamp','YYYY-MM-DD HH:mm:ss') <= bStartDate
                    );
                    if(challengeRevFirst.length > 0) {
                        challenges.push(challengeRevFirst[0]);
                    }
                    if(challenges.length > 0) {
                        challenges.forEach((value, key) => {
                            if (value) {
                                newArray[value.schedule_id] = value.schedule_id;
                            }
                        });
                    }
                    scheduleUser = newArray;
                    break;
                case 4:
                    challengeRevFirst = challengeData.filter(item =>
                        this.commonDateService.DateTimeFormat(item.added_date,'timestamp','YYYY-MM-DD HH:mm:ss') >= bEndDate
                    );
                    if(challengeRevFirst.length > 0) {
                        challenges.push(challengeRevFirst[0]);
                    }
                    if(challenges.length > 0) {
                        challenges.forEach((value, key) => {
                            if (value) {
                                newArray[value.schedule_id] = value.schedule_id;
                            }
                        });
                    }
                    scheduleUser = newArray;
                    break;
            }
            if (Object.keys(scheduleUser)) {
                resultArray = scheduleUser;
            }
            return resultArray;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async getQuickLinkModuleData(assignRule, quickLinkData) {
        try{
            let resultArray: any= {},newArray: any= {},quickLinks = [],quickLinkClick: any= {},quickLinkRevFirst: any,quickLinkRevSecond:any;
            let recommendedBase = assignRule['recommended_base'];
            let bStartDate: any = await this.commonDateService.DateTimeFormat(assignRule.bstart_date,'timestamp','YYYY-MM-DD HH:mm:ss');
            let bEndDate: any = await this.commonDateService.DateTimeFormat(assignRule.bend_date,'timestamp','YYYY-MM-DD HH:mm:ss');
            switch(recommendedBase) {
                case 0:
                    if (quickLinkData.length > 0) {
                        quickLinkData.forEach((value) => {
                            if(value !== undefined) {
                                newArray[value.quicklink_id] = value.quicklink_id;
                            }
                        });
                    }
                    quickLinkClick = newArray;
                    break;
                case 1:
                    let currentYear = new Date().getFullYear();
                    quickLinks.push(quickLinkData.filter(nstep => +nstep['years'] == currentYear)[0]);
                    if(quickLinks.length > 0) {
                        quickLinks.forEach((value) => {
                            if(value !== undefined) {
                                newArray[value.quicklink_id] = value.quicklink_id;
                            }
                        });
                    }
                    quickLinkClick = newArray;
                    break;
                case 2:
                    quickLinkRevFirst = quickLinkData.filter(item => {
                        let createdDate = this.commonDateService.DateTimeFormat(item['created_date'],'timestamp','YYYY-MM-DD HH:mm:ss');
                        return createdDate >= bStartDate;
                    });
                    if (quickLinkRevFirst.length > 0) {
                        quickLinkRevSecond = quickLinkRevFirst.filter(item => {
                            let createdDate = this.commonDateService.DateTimeFormat(item['created_date'],'timestamp','YYYY-MM-DD HH:mm:ss');
                            return createdDate <= bEndDate;
                        });
                        if (quickLinkRevSecond.length > 0) {
                            quickLinks = quickLinkRevSecond.slice(0, 1);
                            if (quickLinks.length > 0) {
                                quickLinks.forEach((value) => {
                                    if (value !== undefined) {
                                        newArray[value.quicklink_id] = value.quicklink_id;
                                    }
                                });
                            }
                        }
                    }
                    quickLinkClick = newArray;
                    break;
                case 3:
                    quickLinkRevFirst = quickLinkData.filter(item => {
                        let createdDate = this.commonDateService.DateTimeFormat(item.created_date,'timestamp','YYYY-MM-DD HH:mm:ss');
                        return createdDate <= bStartDate;
                    });
                    if (quickLinkRevFirst.length > 0) {
                        quickLinks = quickLinkRevFirst.slice(0, 1);
                        if (quickLinks.length > 0) {
                            quickLinks.forEach((value) => {
                                if (value !== undefined) {
                                    newArray[value.quicklink_id] = value.quicklink_id;
                                }
                            });
                        }
                    }
                    quickLinkClick = newArray;
                    break;
                case 4:
                    quickLinkRevFirst = quickLinkData.filter(item => {
                        let createdDate = this.commonDateService.DateTimeFormat(item['created_date'],'timestamp','YYYY-MM-DD HH:mm:ss');
                        return createdDate >= bEndDate;
                    });
                    if (quickLinkRevFirst.length > 0) {
                        quickLinks = quickLinkRevFirst.slice(0, 1);
                        if (quickLinks.length > 0) {
                            quickLinks.forEach((value) => {
                                if (value !== undefined) {
                                    newArray[value.quicklink_id] = value.quicklink_id;
                                }
                            });
                        }
                    }
                    quickLinkClick = newArray;
                    break;
            }
            if (Object.keys(quickLinkClick)) {
                resultArray = quickLinkClick;
            }
            return resultArray;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async getQuizModuleData(assignRule, quizData) {
        try{
            let resultArray: any= {'0': {}, '1': {}, '2': {}},qzUserDetail: any[],quizRevFirst: any,quizRevSecond:any;
            let recommendedBase = assignRule['recommended_base'];
            let bStartDate: any = await this.commonDateService.DateTimeFormat(assignRule.bstart_date,'timestamp','YYYY-MM-DD HH:mm:ss');
            let bEndDate: any = await this.commonDateService.DateTimeFormat(assignRule.bend_date,'timestamp','YYYY-MM-DD HH:mm:ss');
            switch(recommendedBase) {
                case 0:
                    qzUserDetail = quizData;
                    break;
                case 1:
                    let currentYear = new Date().getFullYear();
                    qzUserDetail.push(quizData.filter(nstep => nstep['years'] == currentYear)[0]);
                    break;
                case 2:
                    let quizRevFirst = quizData.filter(item => {
                        let createdDate = this.commonDateService.DateTimeFormat(item.created_date,'timestamp','YYYY-MM-DD HH:mm:ss');
                        return createdDate >= bStartDate;
                    });
                    if (quizRevFirst.length > 0) {
                        let quizRevSecond = quizRevFirst.filter(item => {
                            let createdDate = this.commonDateService.DateTimeFormat(item.created_date,'timestamp','YYYY-MM-DD HH:mm:ss');
                            return createdDate <= bEndDate;
                        });
                        if (quizRevSecond.length > 0) {
                            qzUserDetail.push(quizRevSecond[0]);
                        }
                    }
                    break;
                case 3:
                    quizRevFirst = quizData.filter(item => {
                        let createdDate = this.commonDateService.DateTimeFormat(item.created_date,'timestamp','YYYY-MM-DD HH:mm:ss');
                        return createdDate <= bStartDate;
                    });
                    if (quizRevFirst.length > 0) {
                        qzUserDetail.push(quizRevFirst[0]);
                    }
                    break;
                case 4:
                    quizRevFirst = quizData.filter(item => {
                        let createdDate = this.commonDateService.DateTimeFormat(item.created_date,'timestamp','YYYY-MM-DD HH:mm:ss');
                        return createdDate >= bEndDate;
                    });
                    if (quizRevFirst.length > 0) {
                        qzUserDetail.push(quizRevFirst[0]);
                    }
                    break;
            }
            if (qzUserDetail?.length > 0) {
                for (let i: number = 0; i < qzUserDetail.length; i++) {
                    const value = qzUserDetail[i];
                    const quizId = value.quiz_id;
                    const completed = value.completed;
                    const score = value.score;
                    if (!resultArray['2'][quizId] && !resultArray['1'][quizId]) {
                        if (completed === 'no') {
                            resultArray['2'][quizId] = quizId;
                        } else if (completed === 'yes') {
                            resultArray['1'][quizId] = quizId;
                            resultArray['0'][quizId] = score;
                        }
                    }
                }
            }
            return resultArray;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async countActData(activityDone, actStartDate, actEndDate, assignActivity = {}) {
        try{
            let date: any;
            let totalStep = 0;
            let dateCountingTime = [];
            activityDone = Array.isArray(activityDone) || activityDone === null ? activityDone : [activityDone];
            for (const value of activityDone) {
                let logDateTimestamp: any = await this.commonDateService.DateTimeFormat(value['log_date_tmp'],'timestamp','YYYY-MM-DD');
                if (actStartDate <= logDateTimestamp && logDateTimestamp <= actEndDate) {
                    if ((assignActivity['activity_id'] === 10 || assignActivity['activity_id'] === 6) && assignActivity['wtype'] === 2) {
                        if (!dateCountingTime.includes(value['log_date_tmp'])) {
                            totalStep += 1;
                            dateCountingTime.push(value['log_date_tmp']);
                        }
                    } else {
                        totalStep += 1;
                    }
                    if (!date) {
                        date = await this.commonDateService.DateTimeFormat(value['log_date_tmp'], "MM-DD-YYYY","YYYY-MM-DD");
                    }
                }
            }
            let result = {
                total_account: totalStep,
                date: date
            };
            return result;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async countActDataQuiz(activityDone, actStartDate, actEndDate, assignActivity = {}) {
        try{
            let date: any = '',totalStep = 0;
            for (let i = 0; i < activityDone.length; i++) {
                const value = activityDone[i];
                let logDateTmp = await this.commonDateService.DateTimeFormat(value.log_date_tmp,'timestamp','YYYY-MM-DD')
                if (date === "" && actStartDate <= logDateTmp && logDateTmp <= actEndDate) {
                    if ((assignActivity["type"] === 0 && value.score >= assignActivity["s_range"] && value.score <= assignActivity["e_range"]) ||
                        (assignActivity["type"] === 1 && value.completed.toLowerCase() === "yes") ||
                        (assignActivity["type"] === 2 && value.completed.toLowerCase() === "no")) {
                        totalStep += 1;
                        date = await this.commonDateService.DateTimeFormat(value.log_date_tmp, "MM-DD-YYYY","YYYY-MM-DD");
                    }
                }
            }
            let result = {
                total_account: totalStep,
                date: date
            };
            return result;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async getPlanActivityData(activityDone, actStartDate, actEndDate, field = null, table = null,assignActivity = {}) {
        try{
            let result: { date: any, total_account: number } = { 'date': '', 'total_account': 0 };
            let tempWeight = 0;
            if (field && activityDone.length > 0) {
                for (let i: number = 0; i < activityDone.length; i++) {
                    let activity = activityDone[i];
                    let logDateTmp = await this.commonDateService.DateTimeFormat(activity['log_date_tmp'],'timestamp','YYYY-MM-DD HH:mm:ss');
                    if (actStartDate <= logDateTmp && logDateTmp <= actEndDate && (activity[field] && activity[field] != '')) {
                        result['total_account'] = activity[field];
                        if (field === 'weight' && !tempWeight) {
                            tempWeight = activity[field];
                        }
                        let isValidType0: boolean = assignActivity['type'] === 0 && result['total_account'] >= assignActivity['s_range'] && result['total_account'] <= assignActivity['e_range'];
                        let isValidType1: boolean = assignActivity['type'] === 1 && result['total_account'] < assignActivity['s_range'];
                        let isValidType2: boolean = assignActivity['type'] === 2 && result['total_account'] > assignActivity['s_range'];
                        if (isValidType0 || isValidType1 || isValidType2) {
                            result['date'] = await this.commonDateService.DateTimeFormat(new Date(activity['log_date_tmp']), "MM-DD-YYYY","YYYY-MM-DD");
                            break;
                        }
                    }
                }
            }
            if (field === 'weight' && !result['date']) {
                result['total_account'] = tempWeight;
            }
            return result;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async countActDataHra(activityDone, actStartDate, actEndDate,assignActivity = {}) {
        try{
            let date: any = '', totalStep = 0,resultData = 0;
            for (let i: number = 0; i < activityDone.length; i++) {
                const value = activityDone[i];
                let valueDate = await this.commonDateService.DateTimeFormat(value.date,'timestamp','YYYY-MM-DD HH:mm:ss');
                if (!date && actStartDate <= valueDate && valueDate <= actEndDate) {
                    let scoreKey = `${assignActivity['org_activity_id']}_qscore`;
                    let worstScoreKey = `${assignActivity['org_activity_id']}_WorstScore`;
                    if (value[scoreKey] === undefined) {
                        resultData = 2;
                    } else {
                        let score = Math.round((1 - (value[scoreKey] / value[worstScoreKey])) * 100);
                        if (score <= 69) {
                            resultData = 2;
                        } else if (score > 69 && score <= 89) {
                            resultData = 1;
                        } else if (score > 89 && score <= 100) {
                            resultData = 0;
                        }
                    }
                    if (assignActivity['type'] === resultData) {
                        totalStep++;
                        date = await this.commonDateService.DateTimeFormat(value.date, "MM-DD-YYYY","YYYY-MM-DD");
                    }
                }
            }
            let result = {
                total_account: totalStep,
                date: date
            };
            return result;
        }catch(err){
            throw new Error(err.message);
        }
    }
    
    campaignObjectStructure(type:any = null, otherDatas:any = []) {
        let {
            actId = null,
            actName = null,
            complete = null,
            completePer = null,
            dateorder = null,
            ReqBy = null,
            oid = null,
            total = null,
            filterComplete = null,
            start_date = null,
            end_date = null,
            activitys = null,
            location = {},
            department = {},
            gender = {},
            agegroup = {},
            order_id = null
        } = Object.assign({}, ...otherDatas);
        try{
            let object: any = {
                'activity_name': actName, 
                'dateorder': dateorder, 
                'ReqBy': ReqBy, 
                'order_id': oid
            };
            if(type == 'location' || type == 'department' || type == 'gender' || type == 'agegroup'){
                object['reward_name'] = actName;
                object['reward_id'] = actId;
                delete(object['activity_name']);
                delete(object['dateorder']);
                delete(object['ReqBy']);
                delete(object['order_id']);
            }
            if(type == 'Summary' || type == 'Reward'){
                object = {
                    ...object,
                    'total': total,
                    'complete': complete, 
                    'completePer': Number(completePer.toFixed(2)), 
                    'EngDifference': '- - -',
                    'EngDifferencePer': '- - -',
                    'filterComplete': '- - -',
                };
                if(type == 'Reward'){
                    object['order_id'] = order_id;
                    delete object.dateorder;
                    delete object.ReqBy;
                    // delete object.order_id;
                }
            }
            if(type == 'Activity'){
                object = {
                    ...object,
                    'start_date': start_date, 
                    'end_date': end_date, 
                };
            }
            if(type == 'location'){
                object = {
                    ...object,
                    'data': location,
                };
            }
            if(type == 'department'){
                object = {
                    ...object,
                    'data': department,
                };
            }
            if(type == 'gender'){
                object = {
                    ...object,
                    'data': gender,
                };
            }
            if(type == 'agegroup'){
                object = {
                    ...object,
                    'data': agegroup,
                };
            }
            if(activitys){
                object['activitys'] = activitys
            }
            return [object]
        }catch(err){
            throw new Error(err.message);
        }
    }

    campaignGraphStructure(name1, value1 = null, name2 = null, completePer = null, name3 = null, ontrackcompletePer = null, name4 = null, campaignEndDate = null) {
        try{
            return [
                { 
                    'name': name1,
                    'value': value1, 
                },
                { 
                    'name': name2,
                    'value': Number(completePer.toFixed(2)), 
                },
                { 
                    'name': name3,
                    'value': Number(ontrackcompletePer.toFixed(2)), 
                },
                { 
                    'name': name4,
                    'value': campaignEndDate, 
                }
            ];
        }catch(err){
            throw new Error(err.message);
        }
    }
    async check_max_point(tmppoints:any = 0, max_point:any = 0)
    {
        try{
            if (tmppoints > max_point) {
                tmppoints = max_point;
            }
            return tmppoints;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async dynamic_company_global_data_merge(global_text, company_text, forminstructions) {
            try{
                let main_option = { 1: 'header_text', 2: 'patient_information', 3: 'billing_coding', 4: 'privacy_information', 5: 'footer_text', 6: 'patient_health_information', 7: 'fax_text_date', 8: 'datatransmission', 9: 'optionalsections', 10: 'patient_data_form', 11: 'phq_text', 12: 'gad_text', 13: 'identification_cover', 14: 'dentist_one_text', 15: 'dentist_two_text' };
                for (let ele of global_text) {
                    const result = company_text.some(data => data.main_option == ele.main_option && data.type == ele.type);
                    if (!result) {
                        company_text.push(ele);
                    }
                }
                const company_data = company_text.sort((a, b) => a.order - b.order);
                const show_data = company_data.reduce((acc, item) => {
                    const optionKey = main_option[item.main_option];
                    if (!acc[optionKey]) {
                        acc[optionKey] = [];
                    }
                    if (optionKey == 'datatransmission' || optionKey == 'optionalsections') {
                        item.selected = 0;
                        if (optionKey == 'datatransmission') {
                            if ((forminstructions?.submition_option?.split(',') || []).includes(item.type.toString())) {
                                item.selected = 1;
                            }
                        }
                        if (optionKey == 'optionalsections') {
                            if ((forminstructions?.optionalpage?.split(',') || []).includes(item.type.toString())) {
                                item.selected = 1;
                            }
                        }
                        acc[optionKey].push(item);
                    } else {
                        acc[optionKey] = item.text;
                    }
                    return acc;
                }, {});
                return show_data;
            }catch(error){
                throw new Error(error.message); 
            }
    }
    async CommonFieldDataCallingCovid(userDetail, clmNameArrCompare, team = null) {
        try{
            const gender = userDetail?.gender?.toLowerCase();
            let userGender = 0;
            if (gender === "m" || gender === "male") {
                userGender = 1;
            } else if (gender === "f" || gender === "female") {
                userGender = 2;
            } else if (gender === "o" || gender === "other") {
                userGender = 3;
            }
            let onInsurancePlan = userDetail?.on_insurance_plan?.toLowerCase();
            if (onInsurancePlan === "yes" || onInsurancePlan === "y") {
                onInsurancePlan = "Yes";
            } else if (onInsurancePlan === "no" || onInsurancePlan === "n") {
                onInsurancePlan = "No";
            } else if (onInsurancePlan === "o" || onInsurancePlan === "other") {
                onInsurancePlan = "";
            }
            const clmData: any = {
                "USER CODE": userDetail?.code || '',
                "ORGANIZATION": userDetail['company']?.company_name || '',
                "DEPARTMENT": userDetail?.department?.dept_name || '',
                "RELATIONSHIP ID": userDetail.role_id === 16 ? userDetail.relationship_id : "",
                "USERNAME": userDetail?.username || '',
                "FIRST NAME": userDetail?.first_name || '',
                "MIDDLE NAME": userDetail?.middle_name || '',
                "LAST NAME": userDetail?.last_name || '',
                "JOB TITLE": userDetail?.settings?.jobtitle || '',
                "EMPLOYEE ID": userDetail?.employeeid || '',
                "GENDER":
                    userGender === 1
                        ? "Male"
                        : userGender === 2
                        ? "Female"
                        : userGender === 3
                        ? "Other"
                        : "",
                "BIRTH DATE":   this.commonDateService.DateTimeFormat(userDetail?.dob, 'MM-DD-YYYY') || '01-01-1970',
                "DATE OF HIRE": (!userDetail?.date_of_hire || userDetail?.date_of_hire === '0000-00-00' ) ? '' : this.commonDateService.DateTimeFormat(userDetail?.date_of_hire, 'MM-DD-YYYY') || '',
                "ON HEALTH PLAN": onInsurancePlan,
                "HEALTH PLAN NAME": (
                    onInsurancePlan === "No" ?
                        '' :
                        userDetail?.insurance_plan_name
                ) || '',
                "EMAIL": userDetail?.email || '',
                "LOCATION": userDetail?.location?.lname || userDetail?.Location?.lname || '',
                "USER TYPE": userDetail?.role_id === 2 ? "Employee" : userDetail?.role_id === 12 ? "Champion" : "Spouse",
                "ROLE TYPE": (userDetail['role_id'] == 2) ? 'Register' : 'Spouse',
                "WORK PHONE NUMBER": userDetail?.settings?.wphone || '',
                "HOME PHONE NUMBER": userDetail?.settings?.hphone || '',
                "MOBILE PHONE NUMBER": userDetail?.settings?.mphone || '',
                "WORK ADDRESS1": userDetail?.locations?.address1 || userDetail?.Location?.address1 || '',
                "WORK ADDRESS2": userDetail?.locations?.address2 || userDetail?.Location?.address2 || '',
                "WORK CITY": userDetail?.locations?.city || userDetail?.Location?.city || '',
                "WORK STATE/PROVINCE": userDetail?.locations?.state || userDetail?.Location?.state || '',
                "WORK ZIP/POSTAL CODE": userDetail?.locations?.zip || userDetail?.Location?.zip || '',
                "WORK COUNTRY": userDetail?.locations?.country || userDetail?.Location?.country || '',
            };
            if (team === true) {
                clmData['ORGANIZATION'] = userDetail?.teammembers[0]?.['company']?.company_name || '';
                clmData['TEAM'] = userDetail?.tname || '';
                clmData['TEAM SIZE'] = userDetail?.team_size || '';
                clmData['TEAM MEMBERS'] = userDetail?.teammembercount || '';
            }
            // if (iscovid === true) {
            //     clmData["USER TYPE"] =userDetail?.role_id === 2 ? "Employee" : userDetail?.role_id === 12 ? "Champion" : "Spouse";
            // }
            // // Conditional fields based on iscovid
            // if (iscovid === null) {
            //     clmData.LOCATION = userDetail?.location?.lname || userDetail?.Location?.lname || '';
            //     clmData["USER TYPE"] =
            //         userDetail?.role_id === 2
            //             ? "Employee"
            //             : userDetail?.role_id === 12
            //                 ? "Champion"
            //                 : "Spouse";
            // } else if (iscovid === 'covidReport') {
            //     clmData['ROLE TYPE'] = (userDetail['role_id'] == 2) ? 'Register' : 'Spouse'; 
            //     clmData["WORK PHONE NUMBER"] = userDetail?.settings?.wphone || '';
            //     clmData["HOME PHONE NUMBER"] = userDetail?.settings?.hphone || '';
            //     clmData.LOCATION = userDetail?.locations?.lname || userDetail?.Location?.lname || '';
            //     clmData["WORK ADDRESS1"] = userDetail?.locations?.address1 || userDetail?.Location?.address1 || '';
            //     clmData["WORK ADDRESS2"] = userDetail?.locations?.address2 || userDetail?.Location?.address2 || '';
            //     clmData["WORK CITY"] = userDetail?.locations?.city || userDetail?.Location?.city || '';
            //     clmData["WORK STATE/PROVINCE"] = userDetail?.locations?.state || userDetail?.Location?.state || '';
            //     clmData["WORK ZIP/POSTAL CODE"] = userDetail?.locations?.zip || userDetail?.Location?.zip || '';
            //     clmData["WORK COUNTRY"] = userDetail?.locations?.country || userDetail?.Location?.country || '';
            // }

            return clmNameArrCompare.reduce((acc, key) => {
                if (clmData.hasOwnProperty(key)) {
                    acc[key] = clmData[key];
                }
                return acc;
            }, {});
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async covidOtherQuestion(Covidsettings){
        return {
            "question": "Are you vaccinated?",
            "answer": [
                {
                "id": "1",
                "label": "Yes",
                "stepflag": 1,
                "sub_question": [
                    {
                    "title": "Vaccination Type?",
                    "filetype": "radio",
                    "showfield": 1,
                    "option": Covidsettings['Covidvaccinationtyp']?.map(obj => {
                        return {
                            name: obj.title,  // Assuming this holds the question text
                            value: obj.id
                        };
                    }).sort((a, b) => a.value - b.value)
                    },
                    {
                    "title": "Upload Your Vaccination Records",
                    "filetype": "file",
                    "showfield": 1,
                    "option": []
                    },
                    {
                    "title": "Last Vaccination Date",
                    "filetype": "date",
                    "showfield": 1,
                    "option": []
                    }
                ]
                },
                {
                "id": "2",
                "label": "No",
                "stepflag": 1,
                "sub_question": [
                    {
                    "title": "Have you tested positive for COVID?",
                    "filetype": "radio",
                    "showfield": 1,
                    "option": [
                        {"id": "1", "label": "Yes"},
                        {"id": "2", "label": "No"}
                    ]
                    },
                    {
                    "title": "Upload Your Test Results",
                    "filetype": "file",
                    "showfield": 1,
                    "option": []
                    },
                    {
                    "title": "Last Report Date",
                    "filetype": "date",
                    "showfield": 1,
                    "option": []
                    }
                ]
                },
                {
                "id": "3",
                "label": "Decline to answer",
                "stepflag": 0,
                "sub_question": []
                }
            ]
        }
    }

    getExcelColumnName = (index: number): string => {
        let name = '';
        while (index >= 0) {
            name = String.fromCharCode((index % 26) + 65) + name;
            index = Math.floor(index / 26) - 1;
        }
        return name;
    }

    clearHTMLTags(input: string): string {
        if (!input || typeof input !== 'string') {
            return '';
        }

        return input
            .replace(/<[^>]*>/g, '')
            .replace(/&[#\w]+;/g, (entity) => {
                const entityMap: { [key: string]: string } = {
                    '&nbsp;': ' ',
                    '&amp;': '&',
                    '&lt;': '<',
                    '&gt;': '>',
                    '&quot;': '"',
                    '&apos;': "'",
                    '&#39;': "'",
                };
                return entityMap[entity] || '';
            })
            .replace(/\s+/g, ' ')
            .trim();
    }

    async calculateBiometricRisks(screeningResults: any[]) {
        const biometricCounters: Record<string, any> = {
            bmi: { Low_Risk: 0, Moderate_Risk: 0, High_Risk: 0, Very_High_Risk: 0 },
            systolic: { Low_Risk: 0, Moderate_Risk: 0, High_Risk: 0, Very_High_Risk: 0 },
            diastolic: { Low_Risk: 0, Moderate_Risk: 0, High_Risk: 0, Very_High_Risk: 0 },
            random_blood_glucose: { Low_Risk: 0, Moderate_Risk: 0, High_Risk: 0, Very_High_Risk: 0 },
            fasting_blood_glucose: { Low_Risk: 0, Moderate_Risk: 0, High_Risk: 0, Very_High_Risk: 0 },
            alc: { Low_Risk: 0, Moderate_Risk: 0, High_Risk: 0, Very_High_Risk: 0 },
            total_cholesterol: { Low_Risk: 0, Moderate_Risk: 0, High_Risk: 0, Very_High_Risk: 0 },
            hdlm: { Low_Risk: 0, Moderate_Risk: 0, High_Risk: 0, Very_High_Risk: 0 },
            hdlw: { Low_Risk: 0, Moderate_Risk: 0, High_Risk: 0, Very_High_Risk: 0 },
            ldl: { Low_Risk: 0, Moderate_Risk: 0, High_Risk: 0, Very_High_Risk: 0 },
            triglycerides: { Low_Risk: 0, Moderate_Risk: 0, High_Risk: 0, Very_High_Risk: 0 },
        };

        const biometricSums: Record<string, number> = {};
        const biometricCounts: Record<string, number> = {};

        const biometricFields = [
            'bmi',
            'systolic',
            'diastolic',
            'random_blood_glucose',
            'fasting_blood_glucose',
            'alc',
            'total_cholesterol',
            'hdl',
            'ldl',
            'triglycerides',
        ];

        for (let i: number = 0; i < screeningResults.length; i++) {
            const data = screeningResults[i];

            for (let j: number = 0; j < biometricFields.length; j++) {
                const field = biometricFields[j];
                if (!data[field] || data[field] === '' || data[field] === null) {
                    continue;
                }

                const value = parseFloat(data[field]);
                if (!this.commonService.isValidNumber(value) || value === 0) continue;
                

                biometricSums[field] = (biometricSums[field] || 0) + value;
                biometricCounts[field] = (biometricCounts[field] || 0) + 1;

                let riskLevel: string;
                if (['hdl'].includes(field)) {
                    let gender = data.gender;
                    if (gender === 'f') {
                        gender = 'w';
                    }
                    biometricSums[`hdl${gender}`] = (biometricSums[`hdl${gender}`] || 0) + value;
                    biometricCounts[`hdl${gender}`] = (biometricCounts[`hdl${gender}`] || 0) + 1;
                    riskLevel = this.commonService.getRiskLevel(`hdl${gender}` as HealthField, value) || '';
                    await this.incrementRiskCounter(biometricCounters[`hdl${gender}`], riskLevel);
                } else {
                    riskLevel = this.commonService.getRiskLevel(field as HealthField, value) || '';
                    await this.incrementRiskCounter(biometricCounters[field], riskLevel);
                }
            }
        }

        const tableData = await this.generateTableData(biometricCounters, biometricSums, biometricCounts);

        return tableData;
    }

    async incrementRiskCounter(counter: any, riskLevel: string) {
        const normalizedRisk = riskLevel ? riskLevel.replace(/\s+/g, '_') : '';

        if (normalizedRisk === 'Low_Risk') {
            counter.Low_Risk++;
        } else if (normalizedRisk === 'Moderate_Risk') {
            counter.Moderate_Risk++;
        } else if (normalizedRisk === 'High_Risk') {
            counter.High_Risk++;
        } else if (normalizedRisk === 'Very_High_Risk') {
            counter.Very_High_Risk++;
        }
    }

    private async generateTableData(
        counters: Record<string, any>,
        sums: Record<string, number>,
        counts: Record<string, number>
    ): Promise<any[]> {
        const biometricLabels: Record<string, { label: string; unit?: string }> = {
            bmi: { label: 'B M I' },
            systolic: { label: 'Blood Pressure Systolic' },
            diastolic: { label: 'Blood Pressure Diastolic' },
            random_blood_glucose: { label: 'Blood Glucose Random', unit: 'Mg/dl' },
            fasting_blood_glucose: { label: 'Blood Glucose Fasting', unit: 'Mg/dl' },
            alc: { label: 'A1C levels', unit: '%' },
            total_cholesterol: { label: 'Total Cholesterol', unit: 'Mg/dl' },
            hdlm: { label: 'H D L Men', unit: 'Mg/dl' },
            hdlw: { label: 'H D L Women', unit: 'Mg/dl' },
            ldl: { label: 'L D L Cholesterol', unit: 'Mg/dl' },
            triglycerides: { label: 'Triglycerides', unit: 'Mg/dl' },
        };

        let keyAlias = {
            bmi: 'bmi',
            systolic: 'systolic',
            diastolic: 'diastolic',
            random_blood_glucose: 'blood_glucose',
            fasting_blood_glucose: 'blood_glucose',
            alc: 'alc',
            total_cholesterol: 'total_cholesterol',
            hdlm: 'hdlm',
            hdlw: 'hdlw',
            ldl: 'ldl',
            triglycerides: 'triglycerides',
        }


        const results: any[] = [];
        for (const [key, counter] of Object.entries(counters)) {
            const total = counter.Low_Risk + counter.Moderate_Risk + counter.High_Risk + counter.Very_High_Risk;

            // if (total === 0) continue;

            const average = counts[key] ? (sums[key] / counts[key]).toFixed(2) : '0.00';
            const label = biometricLabels[key];

            results.push({
                color: await this.commonService.getMarkerColor(keyAlias[key],parseFloat(average)),
                measurement: label.label,
                average: parseFloat(average),
                unit: label.unit,
                lowRisk: {
                    count: counter.Low_Risk,
                    percentage: total ? ((counter.Low_Risk / total) * 100).toFixed(2) + '%' : `0.00%`
                },
                moderateRisk: {
                    count: counter.Moderate_Risk,
                    percentage: total ? ((counter.Moderate_Risk / total) * 100).toFixed(2) + '%' : `0.00%`
                },
                highRisk: {
                    count: counter.High_Risk,
                    percentage: total ? ((counter.High_Risk / total) * 100).toFixed(2) + '%' : `0.00%`
                },
                veryHighRisk: {
                    count: counter.Very_High_Risk,
                    percentage: total ? ((counter.Very_High_Risk / total) * 100).toFixed(2) + '%' : `0.00%`
                },
                total: {
                    count: total,
                    percentage: '100%'
                }
            });
        }

        return results;
    }
    async getClassificationAchivement(field: string, avgval: string){
        if(field=='bmi'){
            if(avgval=='Low risk'){
                return ' < 25';
            }
            if(avgval=='Moderate risk'){
                return ' <= 30';
            }
            if(avgval=='High risk'){
                return ' <= 34';
            }
        }
        if(field=='alc'){
            if(avgval=='Low risk'){
                return  ' < 5.7';
            }
            if(avgval=='Moderate risk'){
                return ' <= 6.4';
            }
            if(avgval=='High risk'){
                return ' > 6.4';
            }
        }
        if(field=='systolic'){
            if(avgval=='Low risk'){
                return ' < 120';
            }
            if(avgval=='Moderate risk'){
                return ' <= 139';
            }
            if(avgval=='High risk'){
                return ' <= 160';
            }
        }
        if(field=='diastolic'){
            if(avgval=='Low risk'){
                return ' < 80';
            }
            if(avgval=='Moderate risk'){
                return ' <= 89';
            }
            if(avgval=='High risk'){
                return ' <= 99';
            }
        }
        if(field=='ldl'){
            if(avgval=='Low risk'){
                return ' < 100';
            }
            if(avgval=='Moderate risk'){
                return ' <= 129';
            }
            if(avgval=='High risk'){
                return ' <= 159';
            }
        }
        if(field=='triglycerides'){
            if(avgval=='Low risk'){
                return ' < 150';
            }
            if(avgval=='Moderate risk'){
                return ' <= 199';
            }
            if(avgval=='High risk'){
                return ' <= 499';
            }
        }
        if(field=='blood_glucose'){
            if(avgval=='Low risk'){
                return ' < 100';
            }
            if(avgval=='Moderate risk'){
                return ' <= 125';
            }
            if(avgval=='High risk'){
                return ' >= 126';
            }
        }
        if(field=='total_cholesterol'){
            if(avgval=='Low risk'){
                return ' < 200';
            }
            if(avgval=='Moderate risk'){
                return ' <= 239';
            }
            if(avgval=='High risk'){
                return ' >= 239';
            }
        }
        if(field=='hdlm'){
            if(avgval=='Low risk'){
                return ' >= 59';
            }
            if(avgval=='Moderate risk'){
                return ' >= 40';
            }
            if(avgval=='High risk'){
                return ' < 40';
            }
        }
        if(field=='hdlw'){
            if(avgval=='Low risk'){
                return ' >= 59';
            }
            if(avgval=='Moderate risk'){
                return ' >= 50';
            }
            if(avgval=='High risk'){
                return ' < 50';
            }
        }
        if(field=='waistm' || field=='waistw'){
            if(avgval=='Low risk'){
                return ' < 25';
            }
            if(avgval=='Moderate risk'){
                return ' <= 50';
            }
            if(avgval=='High risk'){
                return ' <= 75';
            }
        }      
    }
    async getClassificationAchivementStatus(field: string, avgval: string | number) {
        avgval = Number(avgval);

        if (field === 'bmi') {
            if (avgval < 25) return 0;
            if (avgval >= 25 && avgval < 30) return 1;
            if (avgval >= 30 && avgval <= 34) return 2;
            if (avgval > 34) return 3;
        }

        if (field === 'systolic') {
            if (avgval < 120) return 0;
            if (avgval >= 120 && avgval <= 139) return 1;
            if (avgval > 139 && avgval <= 160) return 2;
            if (avgval > 160) return 3;
        }

        if (field === 'alc') {
            if (avgval < 5.7) return 0;
            if (avgval >= 5.7 && avgval <= 6.4) return 3;
            if (avgval > 6.4) return 3;
        }

        if (field === 'diastolic') {
            if (avgval < 80) return 0;
            if (avgval >= 80 && avgval <= 89) return 1;
            if (avgval > 89 && avgval <= 99) return 2;
            if (avgval > 99) return 3;
        }

        if (field === 'ldl') {
            if (avgval < 100) return 0;
            if (avgval >= 100 && avgval <= 129) return 1;
            if (avgval > 129 && avgval <= 159) return 2;
            if (avgval > 159) return 3;
        }

        if (field === 'triglycerides') {
            if (avgval < 150) return 0;
            if (avgval >= 150 && avgval <= 199) return 1;
            if (avgval > 199 && avgval <= 499) return 2;
            if (avgval > 499) return 3;
        }

        if (field === 'blood_glucose') {
            if (avgval < 100) return 0;
            if (avgval >= 100 && avgval <= 125) return 1;
            if (avgval > 125) return 2;
        }

        if (field === 'total_cholesterol') {
            if (avgval < 200) return 0;
            if (avgval >= 200 && avgval <= 239) return 1;
            if (avgval > 239) return 2;
        }

        if (field === 'hdlm') {
            if (avgval > 59) return 0;
            if (avgval >= 40 && avgval <= 59) return 1;
            if (avgval < 40) return 2;
        }

        if (field === 'hdlw') {
            if (avgval > 59) return 0;
            if (avgval >= 50 && avgval <= 59) return 1;
            if (avgval < 50) return 2;
        }

        if (field === 'waistm' || field === 'waistw') {
            if (avgval < 37) return 0;
            if (avgval >= 37 && avgval <= 42) return 1;
            if (avgval > 42) return 2;
        }
    }

}
