import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import axios from 'axios';
import * as crypto from 'crypto';
import * as fs from "fs";
import * as handlebars from 'handlebars';
import * as moment from 'moment-timezone';
import * as path from 'path';
import * as requestIP from 'request-ip';
import { DataSource } from 'typeorm';
import { promisify } from 'util';
import { appConstant } from '../constant';
import { HealthField, MarkerColor, RiskLevel } from "../interface";
import { CommonDateService } from './commondate.service';
const Jimp = require('jimp');
import DeviceDetector = require('device-detector-js');
/* can use this package  'mobile-detect' */
const TRANSLATIONS_DIR = appConstant.TRANSLATIONS_DIR || './src/local';
const readFileAsync = promisify(fs.readFile);
const deviceDetector = new DeviceDetector();
const S3_URL =  process.env.S3_URL_PROD
const secretKey = process.env.SECRET_KEY_PROD.slice(0, 32);
const iv = process.env.SECRET_KEY_PROD.slice(0, 16);
const algorithm = 'aes-256-gcm';
const key = crypto.scryptSync(secretKey!, 'salt', 32);

@Injectable()
export class CommonService {
    constructor(
        // private readonly dataSource: DataSource
        @InjectDataSource(appConstant.READ_REPLICA.toLowerCase()) 
            private readonly dataSource: DataSource,
        private readonly commonDateService: CommonDateService,
    ) {}
    
    getClientIPAndDeviceDetails(req) {
        try{
            const device = deviceDetector.parse(req.headers['user-agent']);
            const clientIp = requestIP.getClientIp(req);
            return {
                client_ip: clientIp,
                client_type: device.client ? device.client['type'] : null,
                client_name: device.client ? device.client['name'] : null,
                client_version: device.client ? device.client['version'] : null,
                os_name: device['os'] ? device['os']['name'] : null,
                os_version: device['os'] ? device['os']['version'] : null,
                device: device.device ?? null,
            };
        }catch(err){
            throw new Error(err.message);
        }
    }
    async generatePassKey() {
        try {
            let length = 8;
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
        } catch(err){
            throw new Error(err.message);
        }
    }
    async checkISOFormat(dateString) {
        try{
            const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
            return isoRegex.test(dateString);
        }catch(err){
            throw new Error(err.message);
        }
    }
    generateCode(prefix: any = '', uniqueID: any, length: any = 8) {
        try{
            let idLength = uniqueID.toString().length;
            length = length - idLength;
            if(length < 1) {
                length = 1;
            }
            let randomNumber = Math.floor(Math.random() * Math.pow(10, length)).toString();
            let randomNumberLength = randomNumber.length;
            if(length > randomNumberLength) {
                let diff = length - randomNumberLength;
                for(let i = 0; i < diff; i++) {
                    randomNumber = "0" + randomNumber;
                }
            } else if(length < randomNumberLength) {
                randomNumber = randomNumber.substring(0, length);
            }
            let randomSplit = randomNumber.split("");
            let uniqueSplit = uniqueID.toString().split("");
            let finalCode = '';
            for(let i = 0; i < randomSplit.length || i < uniqueSplit.length; i++) {
                if(i < randomSplit.length) {
                    finalCode += randomSplit[i];
                }
                if(i < uniqueSplit.length) {
                    finalCode += uniqueSplit[i];
                }
            }
            return prefix + finalCode;
        }catch(err){
            throw new Error(err.message);
        }
    }
    isValidPlugin(plugin: string) {
        try{
            if (appConstant.PLUGINS.includes(plugin)) {
                return true;
            }
            return false;
        }catch(err){
            throw new Error(err.message);
        }
    }
    stripScripts(str: string): string {
        try {
            const regex = new RegExp('(<link[^>]+rel="[^"]*stylesheet"[^>]*>|<img[^>]*>|style="[^"]*")|<script[^>]*>.*?<\/script>|<style[^>]*>.*?<\/style>|<!--.*?-->', 'is');
            return str.replace(regex, '');
        } catch (err) {
            throw new Error(err.message);
        }
    }
    convertToHtmlEntity(text) {
        try{
            return `${text.replace(/([&<>'"!@$%()=+{}])/g, match => appConstant.HTML_ENTITIES[match])}`;
        }catch(err){
            throw new Error(err.message);
        }
    }
    columnConfig (count: number, width: number = 25): { wch: number }[]  {
        try{
            return new Array(count).fill({ wch: width });
        }catch(err){
            throw new Error(err.message);
        }
    }
    generateMD5 = (input: string) => {
        try{
            return crypto.createHash('md5').update(input).digest('hex');
        }catch(err){
            throw new Error(err.message);
        }
    }
    passwordEncrypt = (input: string) => {
        try{
            const cipher = crypto.createCipheriv('aes-256-cbc', secretKey, iv);
            let crypted = cipher.update(input, 'utf8', 'base64');
            crypted += cipher.final('base64');
            return crypted;
        }catch(err){
            throw new Error(err.message);
        }
    }
    decryptPassword = (encrypted: string) => {
        try {
            const decipher = crypto.createDecipheriv('aes-256-cbc', secretKey, iv);

            let decrypted = decipher.update(encrypted, 'base64', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (err) {
            throw new Error(err.message);
        }
    }

    /*Note common Encrypt Decrypt function optimize
     passwordEncrypt = (input: string,customSecretKey = secretKey,customIv = iv) => {
     */
     ssoPasswordEncrypt = async (input: string,secretKey: string,iv: string) => {
        try{
            const cipher = crypto.createCipheriv('aes-256-cbc', secretKey, iv);
            let encrypted = cipher.update(input, 'utf8', 'base64');
            encrypted += cipher.final('base64');
            return encrypted;
        }catch(err){
            throw new Error(err.message);
        }
    }
    ssoPasswordDecrypt = async (input: string,secretKey: string,iv: string) => {
        try{
            const cipher = crypto.createDecipheriv('aes-256-cbc', secretKey, iv);
            let decrypted = cipher.update(input, 'base64', 'utf8');
            decrypted += cipher.final('utf8');
            return decrypted;
        }catch(err){
            throw new Error(err.message);
        }
    }
    docPasswordEncrypt = (input: string) => {
        try{
            if (!input) return '';
            const cipher = crypto.createCipheriv('aes-256-cbc', secretKey, iv);
            let crypted = cipher.update(input, 'utf8', 'hex');
            crypted += cipher.final('hex');
            return crypted;
        }catch(err){
            throw new Error(err.message);
        }
    }
    docPasswordDecrypt = (input: string) => {
        try{
            if (!input) return '';
            const decipher = crypto.createDecipheriv('aes-256-cbc', secretKey, iv);
            let decrypted  = decipher.update(input, 'hex', 'utf8');
            decrypted  += decipher.final('utf8');
            return decrypted ;  
        }catch(err){
            throw new Error(err.message);
        }
    }
    userDepartmentValidDefaultCode = (count: number) => {
        try{
            if (count === 5) {
                return 'DDDDDD';
            } else {
                return 'D' + (Math.floor(Math.random() * (90000000) + 10000000));
            }
        }catch(err){
            throw new Error(err.message);
        }
    }
    userLocationValidDefaultCode = (count: number) => {
        try{
            if (count === 5) {
                return 'LLLLLL';
            } else {
                return 'D' + (Math.floor(Math.random() * (90000000) + 10000000));
            }
        }catch(err){
            throw new Error(err.message);
        }
    };
    userValidDefaultCode = (count: number) => {
        try{
            if (count === 5) {
                return 'UUUUUU';
            } else {
                return 'U' + (Math.floor(Math.random() * (90000000) + 10000000));
            }
        }catch(err){
            throw new Error(err.message);
        }
    };
    removeSpecialCharacter = (text: string) =>{
        try {
            return text.replace(/'/g, "''")
            .replace(/[%_]/g, '\\$&');
        } catch (err) {
            console.error(`Error writing to file: ${err.message}`);
        }
    }
    removeWhiteSpace = (text: string) =>{
        return text?.replace(/\s+/g, "");
    }
    createMenusAndOrder(MainMenusItems: any[], SubMenuItems: any[], savingData: any[]) {
        try{
            let MainMenus = {};
            MainMenusItems.forEach(M_row => {
                if (M_row in savingData) {
                    /* FOR SUBMENU START */
                    let SubMenuForMainMenus = [];
                    SubMenuItems.forEach(SM_row => {
                        if (SM_row in savingData) {
                            let removename = SM_row.indexOf(M_row + '_') + (M_row+'_').length;
                            if (SM_row.includes(M_row + '_')) {
                                SubMenuForMainMenus.push({
                                    'Submenuname': SM_row.slice(removename).replaceAll("_", " "),
                                    'Submenucustomname': savingData[SM_row] || '',
                                    'Submenuhideshow': savingData['Enable_'+SM_row] || '1',
                                    'SubmenuOrder': savingData['Order_'+SM_row] || '',
                                    'Iconmenus': ''
                                });
                            }
                        }
                    });
                    let final_sub_menu_order = [];
                    if (SubMenuForMainMenus.length !== 0) {
                        const SubMeusettingOrder = SubMenuForMainMenus.map(menuItem => menuItem.SubmenuOrder);
                        if (SubMeusettingOrder.some(order => order !== undefined && order !== '')) {
                            final_sub_menu_order = [...SubMenuForMainMenus].sort((a, b) => a.SubmenuOrder - b.SubmenuOrder);
                        } else {
                            final_sub_menu_order = SubMenuForMainMenus;
                        }
                    }
                    /* FOR SUBMENU END */
                    MainMenus[M_row] = {
                        'Mainmenuname': M_row.replace("_", " "),
                        'Mainmenucustomname': savingData[M_row] || '',
                        'MainmenuOrder': savingData['Order_'+M_row] || '',
                        'Mainmenuhideshow': savingData['Enable_'+M_row] || '1',
                        'Submenus': final_sub_menu_order,
                        'Iconmenus': savingData['Icon_'+M_row] || '',
                    };
                }
            });
            let mainMenuSettingOrder = Object.values(MainMenus).map(o => o['MainmenuOrder']);
            let sideMenuList;
            if (mainMenuSettingOrder.filter(order => order !== undefined && order !== '').length) {
                let sortableMenus = [];
                for (let key in MainMenus) {
                    sortableMenus.push([key, MainMenus[key]]);
                }
                sortableMenus.sort((a, b) => a[1].MainmenuOrder - b[1].MainmenuOrder);
                let sortedMainMenus = {};
                sortableMenus.forEach(item => {
                    sortedMainMenus[item[0]] = item[1];
                });
                sideMenuList = sortedMainMenus;
            } else {
                sideMenuList = MainMenus;
            }
            return sideMenuList;
        }catch(err){
            throw new Error(err.message);
        }
    }
    updateWeeksData(weeks: any[], data: any[]) {
        try{
            data.forEach(file => {
                const matches = file.fieldname.match(/week\[(\d+)\](?:\.days\[(\d+)\])?\.logofile/);
                if (matches && matches.length >= 2) {
                    const weekIndex = parseInt(matches[1]);
                    const dayIndex = matches[2] ? parseInt(matches[2]) : null;
                    if (weeks[weekIndex]) {
                        if (dayIndex !== null && weeks[weekIndex].days[dayIndex]) {
                            weeks[weekIndex].days[dayIndex].file = file;
                        } else if (dayIndex === null) {
                            weeks[weekIndex].file = file;
                        }
                    }
                }
            });
        }catch(err){
            throw new Error(err.message);
        }
    }
    makeCurlRequest(method: string, url: string, data?: any, headers?: any, fromFitbit: boolean = false) {
        try{
            let config = {
                method: method,
                url: url,
                headers: headers,
                data : data
            };
            return axios.request(config)
                .then((response) => {
                    return JSON.stringify(response.data);
                })
                .catch((error) => {
                    if(fromFitbit) {
                        return JSON.stringify(error.response.data);
                    } else {
                        throw new Error(error);
                    }
                });
        }catch(err){
            throw new Error(err.message);
        }
    }
    checkValueExists(arrayOfObjects, valueToCheck) {
        try{
            const keysSet = new Set(arrayOfObjects.map(obj => Object.keys(obj)[0]));
            if (valueToCheck && keysSet.has(valueToCheck?.toString())) {
                return "Yes";
            } else {
                return "";
            }
        }catch(err){
            throw new Error(err.message);
        }
    }
    writeEnterBy = (source, enterBy) => {
        try{
            if ([1, 13, 14, 15].includes(source)) return "User Entered";
            if ([3, 11, 12].includes(source)) return "Physician Entered";
            return source === 2 && enterBy === 0 ? "Admin Entered" : "Physician Entered";
        }catch(err){
            throw new Error(err.message);
        }
    }  
    getActivityData(name: string, unit: any, distance: number) {
        try{
            const activityType = appConstant.FOOD_ACTIVITY_DATA[name];
            switch (unit) {
                case "meters":
                    activityType['distance'] = distance * 0.000621371;
                    activityType['steps'] = activityType['distance'] * 2112;
                    return activityType;
                case "km":
                    activityType['distance'] = distance * 0.621371;
                    activityType['steps'] = activityType['distance'] * 2112;
                    return activityType;
                case "yards":
                    activityType['distance'] = distance * 0.000568182;
                    activityType['steps'] = activityType['distance'] * 2112;
                    return activityType;
                case "steps":
                    activityType['distance'] = distance * 0.0004734848484848485;
                    activityType['steps'] = activityType['distance'] * 2112;
                    return activityType;
                default:
                    activityType['distance'] = distance;
                    activityType['steps'] = distance * 2112;
                    return activityType;
            }
        }catch(err){
            throw new Error(err.message);
        }
    };
    dynamicSort(array: any, compareFunction: any) {
        try{
            return array.sort(compareFunction);
        }catch(err){
            throw new Error(err.message);
        }
    }
    async getAssessmentResult(field: number,avgVal: number, themeSettingsData: any, assessmentResults: any,lang:any = 'eng',assessmentName: any){
        try{
            let labelColor = '';
            let labelValue = '';
            let labelStatus = avgVal > 100 || avgVal === null ? '0' : (100 - avgVal).toString();
            let labelName = '';
            let learnMore = '';
            let low = await this.commonDateService.frontendReadTranslation(lang, `Low`, `/LC_MESSAGES/MyHealth/Results`, `static`);
            let mod = await this.commonDateService.frontendReadTranslation(lang, `Mod`, `/LC_MESSAGES/MyHealth/Results`, `static`);
            let high = await this.commonDateService.frontendReadTranslation(lang, `High`, `/LC_MESSAGES/MyHealth/Results`, `static`);
            let label: any = [
                { label: low, percent: 10, color: themeSettingsData.progress_hra_low_color, svg_status: 0 },
                { label: mod, percent: 40, color: themeSettingsData.progress_hra_mod_color, svg_status: 0 },
                { label: high, percent: 50, color: themeSettingsData.progress_hra_high_color, svg_status: 0 },
            ]
            if (avgVal === null) {
                labelColor = '#eee';
                label[0].color = '#F0F0F0';
                label[1].color = '#D9D9D9';
                label[2].color = '#BDBDBD';
                labelValue = await this.commonDateService.frontendReadTranslation(lang, `You have not entered your data.`, `/LC_MESSAGES/MyHealth/Results`, `static`);
                labelName = '';
            } else if (avgVal <= 49) {
                labelValue = await this.commonDateService.frontendReadTranslation(lang, `assementtext_high_risk_${field}_${field}`, `/LC_MESSAGES/MyHealth/Assessment/hra/assessment_text`, 'dynamic');
                labelValue = (labelValue == '' || labelValue == `assementtext_high_risk_${field}_${field}`) ? assessmentResults.high_risk : labelValue;
                learnMore = await this.commonDateService.frontendReadTranslation(lang, `assementtext_learn_more_${field}_${field}`, `/LC_MESSAGES/MyHealth/Assessment/hra/assessment_text`, 'dynamic');
                learnMore = (learnMore == '' || learnMore == `assementtext_learn_more_${field}_${field}`) ? assessmentResults['learn_more'] : learnMore;
                learnMore = `<p><strong>'${assessmentName}':</strong> ${learnMore}</p>`
                if (!assessmentResults['learn_more'] || assessmentResults['learn_more'] == '' || assessmentResults.high_risk == '') {
                    learnMore = ''
                }
                labelColor = themeSettingsData.progress_hra_high_color;
                labelName = await this.commonDateService.frontendReadTranslation(lang, `High Risk`, `/LC_MESSAGES/MyHealth/Results`, `static`);
                labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                label[2] = { ...label[2], svg_status: 3 };
            } else if (avgVal >= 50 && avgVal <= 89) {
                labelValue = await this.commonDateService.frontendReadTranslation(lang, `assementtext_mod_risk_${field}_${field}`, `/LC_MESSAGES/MyHealth/Assessment/hra/assessment_text`, 'dynamic');
                labelValue = (labelValue == '' || labelValue == `assementtext_mod_risk_${field}_${field}`) ? assessmentResults.mod_risk : labelValue;
                learnMore = await this.commonDateService.frontendReadTranslation(lang, `assementtext_learn_more_${field}_${field}`, `/LC_MESSAGES/MyHealth/Assessment/hra/assessment_text`, 'dynamic');
                learnMore = (learnMore == '' || learnMore == `assementtext_learn_more_${field}_${field}`) ? assessmentResults['learn_more'] : learnMore;
                learnMore = `<p><strong>'${assessmentName}':</strong> ${learnMore}</p>`
                if (!assessmentResults['learn_more'] || assessmentResults['learn_more'] == '' || assessmentResults.mod_risk == '') {
                    learnMore = ''
                }
                labelColor = themeSettingsData.progress_hra_mod_color;
                labelName = await this.commonDateService.frontendReadTranslation(lang, `Moderate Risk`, `/LC_MESSAGES/MyHealth/Results`, `static`);
                labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                label[1] = { ...label[1], svg_status: 2 };
            } else if (avgVal >= 90 && avgVal <= 100) {
                labelValue = await this.commonDateService.frontendReadTranslation(lang, `assementtext_low_risk_${field}_${field}`, `/LC_MESSAGES/MyHealth/Assessment/hra/assessment_text`, 'dynamic');
                labelValue = (labelValue == '' || labelValue == `assementtext_low_risk_${field}_${field}`) ? assessmentResults.low_risk : labelValue;
                learnMore = await this.commonDateService.frontendReadTranslation(lang, `assementtext_learn_more_${field}_${field}`, `/LC_MESSAGES/MyHealth/Assessment/hra/assessment_text`, 'dynamic');
                learnMore = (learnMore == '' || learnMore == `assementtext_learn_more_${field}_${field}`) ? assessmentResults['learn_more'] : learnMore;
                learnMore = `<p><strong>'${assessmentName}':</strong> ${learnMore}</p>`
                if (!assessmentResults['learn_more'] || assessmentResults['learn_more'] == '' || assessmentResults.low_risk == '') {
                    learnMore = ''
                }
                labelColor = themeSettingsData.progress_hra_low_color;
                labelName = await this.commonDateService.frontendReadTranslation(lang, `Low Risk`, `/LC_MESSAGES/MyHealth/Results`, `static`);
                labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                label[0] = { ...label[0], svg_status: 1 };
            }
            return { label_color: labelColor, label_status: labelStatus, label_name: labelName, label_value: labelValue, learn_more: learnMore, label: label };
        }catch(err){
            throw new Error(err.message);
        }
    }
    async getScreeningResultData(field: string,avgVal: number, themeSettingsData: any, assessmentResults: any,resultData:any,lang:any = 'eng',screeningName: any){
        try{
            /*6-1,7-2,8-11,10-4,11-5,12-7,13-8,14-9,15-10,9-3*/
            /*let fieldIndex = { 5: 3, 6: 1, 7: 2, 8: 11, 9: 3, 10: 4, 11: 5, 12: 7, 13: 8, 14: 9, 15: 10 };
            assessmentResults.id = fieldIndex[assessmentResults.id] ?? assessmentResults.id;*/
            avgVal = Math.floor(avgVal);
            let labelName = '', labelValue = await this.commonDateService.frontendReadTranslation(lang, `You have not entered your data.`, `/LC_MESSAGES/MyHealth/Results`), labelColor = '#eee', learnMore = '';
            let lmspecificmetric = resultData;
            let veryHigh = await this.commonDateService.frontendReadTranslation(lang, `Very High`, `/LC_MESSAGES/MyHealth/Results`, `static`);
            let high = await this.commonDateService.frontendReadTranslation(lang, `High`, `/LC_MESSAGES/MyHealth/Results`, `static`);
            let mod = await this.commonDateService.frontendReadTranslation(lang, `Mod`, `/LC_MESSAGES/MyHealth/Results`, `static`);
            let low = await this.commonDateService.frontendReadTranslation(lang, `Low`, `/LC_MESSAGES/MyHealth/Results`, `static`);
            let veryHighRisk = await this.commonDateService.frontendReadTranslation(lang, `Very High Risk`, `/LC_MESSAGES/MyHealth/Results`, `static`);
            let highRisk = await this.commonDateService.frontendReadTranslation(lang, `High Risk`, `/LC_MESSAGES/MyHealth/Results`, `static`);
            let moderateRisk = await this.commonDateService.frontendReadTranslation(lang, `Moderate Risk`, `/LC_MESSAGES/MyHealth/Results`, `static`);
            let lowRisk = await this.commonDateService.frontendReadTranslation(lang, `Low Risk`, `/LC_MESSAGES/MyHealth/Results`, `static`);
            /* Status for svg*/
            let label: any = [
                { label: low, color: themeSettingsData.progress_hra_low_color, svg_status: 0 },
                { label: mod, color: themeSettingsData.progress_hra_mod_color, svg_status: 0 },
                { label: high, color: themeSettingsData.progress_hra_high_color, svg_status: 0 },
                { label: veryHigh, color: themeSettingsData.progress_hra_very_high_color, svg_status: 0 },
            ]
            const fieldMapping = {
                'B M I': [25, 25, 25, 25],
                'Blood Pressure Systolic': [25, 25, 25, 25],
                'Blood Pressure Diastolic': [25, 25, 25, 25],
                'Blood Glucose Non-Fasting': [33.333333, 33.333333, 33.333333, 0],
                'Total Cholesterol': [33.333333, 33.333333, 33.333333, 0],
                'A1C levels': [75, 0, 0, 25],
                'H D L Cholesterol Men': [33.333333, 33.333333, 33.333333, 0],
                'H D L Cholesterol Women': [33.333333, 33.333333, 33.333333, 0],
                'L D L Cholesterol': [25, 25, 25, 25],
                'Triglycerides': [25, 25, 25, 25],
            };
            const updateLabel = (field, label) => {
                const percents = fieldMapping[field] || [0, 0, 0, 0];
                const updatedLabel = [];
                for (let i = 0; i < label.length; i++) {
                    if (percents[i] > 0) {
                        updatedLabel.push({
                            ...label[i],
                            percent: percents[i],
                        });
                    }
                }
                return updatedLabel;
            };
            label = updateLabel(field, label);
            if (avgVal === 0) {
                const baseColors = ['#F0F0F0', '#D9D9D9', '#BDBDBD', '#969696'];
                const updateLabel = (field, label) => {
                    const updatedLabel = [];
                    for (let i = 0; i < label.length; i++) {
                        updatedLabel.push({
                            ...label[i],
                            color: baseColors[i]
                        });
                    }
                    return updatedLabel;
                };
                label = updateLabel(field, label);
                return { label_name: labelName, label_value: labelValue, label_color: labelColor, learn_more: learnMore, label: label };
            }
            switch (field) {
                case 'B M I':
                    if (avgVal > 35) {
                        labelName = veryHighRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `BMI_BMIVeryHigh_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `BMI_BMIVeryHigh_${assessmentResults?.id}`) ? assessmentResults.very_high_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_very_high_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `BMI_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `BMI_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.very_high_risk == '') {
                            learnMore = ''
                        }
                        label[3] = { ...label[3], svg_status: 4};
                    } else if (avgVal >= 30 && avgVal <= 35) {
                        labelName = highRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `BMI_BMIHighRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `BMI_BMIHighRisk_${assessmentResults?.id}`) ? assessmentResults.high_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_high_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `BMI_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `BMI_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.high_risk == '') {
                            learnMore = ''
                        }
                        label[2] = { ...label[2], svg_status: 3};
                    } else if (avgVal >= 25 && avgVal < 30) {
                        labelName = moderateRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `BMI_BMIModerateRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `BMI_BMIModerateRisk_${assessmentResults?.id}`) ? assessmentResults.mod_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_mod_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `BMI_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `BMI_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.mod_risk == '') {
                            learnMore = ''
                        }
                        label[1] = { ...label[1], svg_status: 2};
                    } else if (avgVal < 25) {
                        labelName = lowRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `BMI_BMILowRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `BMI_BMILowRisk_${assessmentResults?.id}`) ? assessmentResults.low_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_low_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `BMI_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `BMI_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.low_risk == '') {
                            learnMore = ''
                        }
                        label[0] = { ...label[0], svg_status: 1};
                    }
                    break;
                case 'Blood Pressure Systolic':
                    if (avgVal > 160) {
                        labelName = veryHighRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `BloodPressure_BIIHypertension_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `BloodPressure_BIIHypertension_${assessmentResults?.id}`) ? assessmentResults.very_high_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_very_high_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `BloodPressure_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `BloodPressure_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.very_high_risk == '') {
                            learnMore = ''
                        }
                        label[3] = { ...label[3], svg_status: 4};
                    } else if (avgVal >= 140 && avgVal <= 160) {
                        labelName = highRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `BloodPressure_BIHypertension_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `BloodPressure_BIHypertension_${assessmentResults?.id}`) ? assessmentResults.high_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_high_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `BloodPressure_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `BloodPressure_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.high_risk == '') {
                            learnMore = ''
                        }
                        label[2] = { ...label[2], svg_status: 3};
                    } else if (avgVal >= 120 && avgVal <= 139) {
                        labelName = moderateRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `BloodPressure_BPrehypertension_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `BloodPressure_BPrehypertension_${assessmentResults?.id}`) ? assessmentResults.mod_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_mod_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `BloodPressure_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `BloodPressure_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.mod_risk == '') {
                            learnMore = ''
                        }
                        label[1] = { ...label[1], svg_status: 2};
                    } else if (avgVal < 120) {
                        labelName = lowRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `BloodPressure_BLowRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `BloodPressure_BLowRisk_${assessmentResults?.id}`) ? assessmentResults.low_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_low_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `BloodPressure_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `BloodPressure_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.low_risk == '') {
                            learnMore = ''
                        }
                        label[0] = { ...label[0], svg_status: 1};
                    }
                    break;
                case 'Blood Pressure Diastolic':
                    if (avgVal >= 100) {
                        labelName = veryHighRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `BloodPressureDiastolic_BIIHypertensiondiastolic_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `BloodPressureDiastolic_BIIHypertensiondiastolic_${assessmentResults?.id}`) ? assessmentResults.very_high_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_very_high_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `BloodPressureDiastolic_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `BloodPressureDiastolic_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.very_high_risk == '') {
                            learnMore = ''
                        }
                        label[3] = { ...label[3], svg_status: 4};
                    } else if (avgVal >= 90 && avgVal <= 99) {
                        labelName = highRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `BloodPressureDiastolic_BIHypertensiondiastolic_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `BloodPressureDiastolic_BIHypertensiondiastolic_${assessmentResults?.id}`) ? assessmentResults.high_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_high_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `BloodPressureDiastolic_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `BloodPressureDiastolic_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.high_risk == '') {
                            learnMore = ''
                        }
                        label[2] = { ...label[2], svg_status: 3};
                    } else if (avgVal >= 80 && avgVal <= 89) {
                        labelName = moderateRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `BloodPressureDiastolic_BPrehypertensiondiastolic_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `BloodPressureDiastolic_BPrehypertensiondiastolic_${assessmentResults?.id}`) ? assessmentResults.mod_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_mod_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `BloodPressureDiastolic_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `BloodPressureDiastolic_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.mod_risk == '') {
                            learnMore = ''
                        }
                        label[1] = { ...label[1], svg_status: 2};
                    } else if (avgVal < 80) {
                        labelName = lowRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `BloodPressureDiastolic_BLowRiskdiastolic_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `BloodPressureDiastolic_BLowRiskdiastolic_${assessmentResults?.id}`) ? assessmentResults.low_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_low_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `BloodPressureDiastolic_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `BloodPressureDiastolic_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.low_risk == '') {
                            learnMore = ''
                        }
                        label[0] = { ...label[0], svg_status: 1};
                    }
                    break;
                case 'Blood Glucose Non-Fasting':
                    if (avgVal >= 126) {
                        labelName = highRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `Glucose_GHighRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `Glucose_GHighRisk_${assessmentResults?.id}`) ? assessmentResults.high_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_high_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `Glucose_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `Glucose_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.high_risk == '') {
                            learnMore = ''
                        }
                        label[2] = { ...label[2], svg_status: 3};
                    } else if (avgVal >= 100 && avgVal <= 125) {
                        labelName = moderateRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `Glucose_GPrediabetes_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `Glucose_GPrediabetes_${assessmentResults?.id}`) ? assessmentResults.mod_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_mod_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `Glucose_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `Glucose_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.mod_risk == '') {
                            learnMore = ''
                        }
                        label[1] = { ...label[1], svg_status: 2};
                    } else if (avgVal < 100) {
                        labelName = lowRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `Glucose_GlowRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `Glucose_GlowRisk_${assessmentResults?.id}`) ? assessmentResults.low_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_low_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `Glucose_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `Glucose_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.low_risk == '') {
                            learnMore = ''
                        }
                        label[0] = { ...label[0], svg_status: 1 };
                    }
                    break;
                case 'A1C levels':
                    if (avgVal > 6.4) {
                        labelName = veryHighRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `TCHDL_cholHDLAboveAvgRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `TCHDL_cholHDLAboveAvgRisk_${assessmentResults?.id}`) ? assessmentResults.very_high_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_very_high_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `TCHDL_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `TCHDL_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.very_high_risk == '') {
                            learnMore = ''
                        }
                        label[1] = { ...label[1], svg_status: 4};
                    } else if (avgVal >= 5.7 && avgVal <= 6.4) {
                        labelName = highRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `TCHDL_cholHDLAboveAvgRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `TCHDL_cholHDLAboveAvgRisk_${assessmentResults?.id}`) ? assessmentResults.high_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_high_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `TCHDL_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `TCHDL_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.high_risk == '') {
                            learnMore = ''
                        }
                        label[0] = { ...label[0], svg_status: 1};
                    } else if (avgVal < 5.7) {
                        labelName = lowRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `TCHDL_cholHDLLowRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `TCHDL_cholHDLLowRisk_${assessmentResults?.id}`) ? assessmentResults.low_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_low_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `TCHDL_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `TCHDL_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.low_risk == '') {
                            learnMore = ''
                        }
                        label[0] = { ...label[0], svg_status: 1 };
                    }
                    break;
                case 'Total Cholesterol':
                    if (avgVal >= 240) {
                        labelName = highRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `TotalCholesterol_CHOLHighRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `TotalCholesterol_CHOLHighRisk_${assessmentResults?.id}`) ? assessmentResults.high_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_high_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `TotalCholesterol_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `TotalCholesterol_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.high_risk == '') {
                            learnMore = ''
                        }
                        label[2] = { ...label[2], svg_status: 3};
                    } else if (avgVal >= 200 && avgVal <= 239) {
                        labelName = moderateRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `TotalCholesterol_CHOLModerateRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `TotalCholesterol_CHOLModerateRisk_${assessmentResults?.id}`) ? assessmentResults.mod_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_mod_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `TotalCholesterol_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `TotalCholesterol_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.mod_risk == '') {
                            learnMore = ''
                        }
                        label[1] = { ...label[1], svg_status: 2};
                    } else if (avgVal < 200) {
                        labelName = lowRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `TotalCholesterol_CHOLLowRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `TotalCholesterol_CHOLLowRisk_${assessmentResults?.id}`) ? assessmentResults.low_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_low_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `TotalCholesterol_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `TotalCholesterol_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.low_risk == '') {
                            learnMore = ''
                        }
                        label[0] = { ...label[0], svg_status: 1 };
                    }
                    break;
                case 'H D L Cholesterol Men':
                    if (avgVal < 40) {
                        labelName = highRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `HDLCholesterolMen_MHDLHighRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `HDLCholesterolMen_MHDLHighRisk_${assessmentResults?.id}`) ? assessmentResults.high_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_high_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `HDLCholesterolMen_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `HDLCholesterolMen_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.high_risk == '') {
                            learnMore = ''
                        }
                        label[2] = { ...label[2], svg_status: 3};
                    } else if (avgVal >= 40 && avgVal <= 59) {
                        labelName = moderateRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `HDLCholesterolMen_MHDLMediumRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `HDLCholesterolMen_MHDLMediumRisk_${assessmentResults?.id}`) ? assessmentResults.mod_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_mod_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `HDLCholesterolMen_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `HDLCholesterolMen_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.mod_risk == '') {
                            learnMore = ''
                        }
                        label[1] = { ...label[1], svg_status: 2};
                    } else if (avgVal > 59) {
                        labelName = lowRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `HDLCholesterolMen_MHDLLowRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `HDLCholesterolMen_MHDLLowRisk_${assessmentResults?.id}`) ? assessmentResults.low_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_low_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `HDLCholesterolMen_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `HDLCholesterolMen_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.low_risk == '') {
                            learnMore = ''
                        }
                        label[0] = { ...label[0], svg_status: 1 };
                    }
                    break;
                case 'H D L Cholesterol Women':
                    if (avgVal < 50) {
                        labelName = highRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `HDLCholesterolWomen_WHDLHighRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `HDLCholesterolWomen_WHDLHighRisk_${assessmentResults?.id}`) ? assessmentResults.high_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_high_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `HDLCholesterolWomen_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `HDLCholesterolWomen_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.high_risk == '') {
                            learnMore = ''
                        }
                        label[2] = { ...label[2], svg_status: 3};
                    } else if (avgVal >= 50 && avgVal <= 59) {
                        labelName = moderateRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `HDLCholesterolWomen_WHDLMediumRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `HDLCholesterolWomen_WHDLMediumRisk_${assessmentResults?.id}`) ? assessmentResults.mod_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_mod_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `HDLCholesterolWomen_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `HDLCholesterolWomen_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.mod_risk == '') {
                            learnMore = ''
                        }
                        label[1] = { ...label[1], svg_status: 2};
                    } else if (avgVal > 59) {
                        labelName = lowRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `HDLCholesterolWomen_WHDLLowRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `HDLCholesterolWomen_WHDLLowRisk_${assessmentResults?.id}`) ? assessmentResults.low_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_low_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `HDLCholesterolWomen_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `HDLCholesterolWomen_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.low_risk == '') {
                            learnMore = ''
                        }
                        label[0] = { ...label[0], svg_status: 1 };
                    }
                    break;
                case 'L D L Cholesterol':
                    if (avgVal > 159) {
                        labelName = veryHighRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `LDLCholesterol_LDLVeryHigh_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `LDLCholesterol_LDLVeryHigh_${assessmentResults?.id}`) ? assessmentResults.very_high_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_very_high_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `LDLCholesterol_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `LDLCholesterol_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.very_high_risk == '') {
                            learnMore = ''
                        }
                        label[3] = { ...label[3], svg_status: 4};
                    } else if (avgVal >= 130 && avgVal <= 159) {
                        labelName = highRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `LDLCholesterol_LDLHighRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `LDLCholesterol_LDLHighRisk_${assessmentResults?.id}`) ? assessmentResults.high_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_high_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `LDLCholesterol_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `LDLCholesterol_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.high_risk == '') {
                            learnMore = ''
                        }
                        label[2] = { ...label[2], svg_status: 3};
                    } else if (avgVal >= 100 && avgVal <= 129) {
                        labelName = moderateRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `LDLCholesterol_LDLModerateRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `LDLCholesterol_LDLModerateRisk_${assessmentResults?.id}`) ? assessmentResults.mod_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_mod_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `LDLCholesterol_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `LDLCholesterol_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.mod_risk == '') {
                            learnMore = ''
                        }
                        label[1] = { ...label[1], svg_status: 2};
                    } else if (avgVal < 100) {
                        labelName = lowRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `LDLCholesterol_LDLLowRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `LDLCholesterol_LDLLowRisk_${assessmentResults?.id}`) ? assessmentResults.low_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_low_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `LDLCholesterol_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `LDLCholesterol_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.low_risk == '') {
                            learnMore = ''
                        }
                        label[0] = { ...label[0], svg_status: 1};
                    }
                    break;
                case 'Triglycerides':
                    if (avgVal >= 500) {
                        labelName = veryHighRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `Tryglicerides_TryVeryHighRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `Tryglicerides_TryVeryHighRisk_${assessmentResults?.id}`) ? assessmentResults.very_high_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_very_high_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `Tryglicerides_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `Tryglicerides_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.very_high_risk == '') {
                            learnMore = ''
                        }
                        label[3] = { ...label[3], svg_status: 4};
                    } else if (avgVal >= 200 && avgVal <= 499) {
                        labelName = highRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `Tryglicerides_TryHighRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `Tryglicerides_TryHighRisk_${assessmentResults?.id}`) ? assessmentResults.high_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_high_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `Tryglicerides_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `Tryglicerides_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.high_risk == '') {
                            learnMore = ''
                        }
                        label[2] = { ...label[2], svg_status: 3};
                    } else if (avgVal >= 150 && avgVal <= 199) {
                        labelName = moderateRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `Tryglicerides_TryMediumRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `Tryglicerides_TryMediumRisk_${assessmentResults?.id}`) ? assessmentResults.mod_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_mod_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `Tryglicerides_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `Tryglicerides_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.mod_risk == '') {
                            learnMore = ''
                        }
                        label[1] = { ...label[1], svg_status: 2};
                    } else if (avgVal < 150) {
                        labelName = lowRisk;
                        labelValue = await this.commonDateService.frontendReadTranslation(lang, `Tryglicerides_TryLowRisk_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        labelValue = (labelValue == '' || labelValue == `Tryglicerides_TryLowRisk_${assessmentResults?.id}`) ? assessmentResults.low_risk : labelValue;
                        labelValue = `<p><strong>${labelName}:</strong> ${labelValue}</p>`;
                        labelColor = themeSettingsData.progress_hra_low_color;
                        learnMore = await this.commonDateService.frontendReadTranslation(lang, `Tryglicerides_learnmore_${assessmentResults?.id}`, `/LC_MESSAGES/MyHealth/Assessment/hra/biometrocs_text`, 'dynamic');
                        learnMore = (learnMore == '' || learnMore == `Tryglicerides_learnmore_${assessmentResults?.id}`) ? lmspecificmetric[assessmentResults?.id]?.['learnmore'] : learnMore;
                        learnMore = `<p><strong>${screeningName}:</strong> ${learnMore}</p>`;
                        if (lmspecificmetric[assessmentResults?.id]?.['learnmore'] == '' || assessmentResults.low_risk == '') {
                            learnMore = ''
                        }
                        label[0] = { ...label[0], svg_status: 1};
                    }
                    break;
            }
            return { label_name: labelName, label_value: labelValue, label_color: labelColor, learn_more: learnMore, label: label };
        }catch(err){
            throw new Error(err.message);
        }
    }
    async getScreeningResultStatus(field: string,avgVal: number){
        try{
            avgVal = Math.floor(avgVal);
            let tip = 0;
            if (avgVal === 0) {
                return { label_status: tip };
            }
            switch (field) {
                case 'B M I':
                    if (avgVal < 25) {
                        tip = avgVal;
                        if (avgVal == 24) {
                            tip = 25;
                        }
                    } else if (avgVal >= 25 && avgVal <= 29.99) {
                        let obj = { 25: 26, 26: 35, 27: 40, 28: 45, 29: 50 };
                        tip = obj[avgVal];
                    } else if (avgVal >= 30 && avgVal <= 34) {
                        let obj = { 30: 52, 31: 60, 32: 65, 33: 70, 34: 75 };
                        tip = obj[avgVal];
                    } else if (avgVal > 34) {
                        let obj = { 34: 76, 35: 76, 36: 76, 37: 85, 38: 90, 39: 95 };
                        tip = avgVal >= 40 ? 100 : obj[avgVal];
                    }
                    break;
                case 'Blood Pressure Systolic':
                    if (avgVal < 120) {
                        if (avgVal == 0) {
                            tip = 0;
                        } else if (avgVal > 0 && avgVal <= 24) {
                            tip = 5;
                        } else if (avgVal >= 25 && avgVal <= 48) {
                            tip = 10;
                        } else if (avgVal >= 49 && avgVal <= 72) {
                            tip = 15;
                        } else if (avgVal >= 73 && avgVal <= 96) {
                            tip = 20;
                        } else if (avgVal >= 97 && avgVal < 120) {
                            tip = 25;
                        }
                    } else if (avgVal >= 120 && avgVal <= 139) {
                        let obj = { 120: 26, 121: 30, 122: 30, 123: 30, 124: 32, 125: 34, 126: 35, 127: 40, 128: 40, 129: 42, 130: 44, 131: 45, 132: 45, 133: 45, 134: 45, 135: 45, 136: 50, 137: 50, 138: 50, 139: 50 };
                        tip = obj[avgVal];
                    } else if (avgVal >= 140 && avgVal <= 160) {
                        let obj = { 140: 52, 141: 56, 142: 57, 143: 58, 144: 59, 145: 60, 146: 61, 147: 62, 148: 63, 149: 64, 150: 65, 151: 66, 152: 67, 153: 68, 154: 69, 155: 70, 156: 71, 157: 72, 158: 73, 159: 74, 160: 75 };
                        tip = obj[avgVal];
                    } else if (avgVal > 160) {
                        tip = 100;
                    }
                    break;
                case 'Blood Pressure Diastolic':
                    if (avgVal < 80) {
                        if (avgVal == 0) {
                            tip = 0;
                        } else if (avgVal > 0 && avgVal <= 20) {
                            tip = 5;
                        } else if (avgVal >= 21 && avgVal <= 30) {
                            tip = 10;
                        } else if (avgVal >= 31 && avgVal <= 50) {
                            tip = 15;
                        } else if (avgVal >= 51 && avgVal <= 60) {
                            tip = 20;
                        } else if (avgVal >= 61 && avgVal <= 79) {
                            tip = 25;
                        }
                    } else if (avgVal >= 80 && avgVal <= 89) {
                        let obj = { 80: 26, 81: 32, 82: 33, 83: 36, 84: 39, 85: 42, 86: 45, 87: 48, 88: 49, 89: 50 };
                        tip = obj[avgVal];
                    } else if (avgVal >= 90 && avgVal <= 99) {
                        let obj = { 90: 52, 91: 57, 92: 60, 93: 62, 94: 64, 95: 68, 96: 70, 97: 72, 98: 74, 99: 75 };
                        tip = obj[avgVal];
                    } else if (avgVal >= 100) {
                        tip = 100;
                    }
                    break;
                case 'Blood Glucose Non-Fasting':
                    if (avgVal < 100) {
                        if (avgVal == 0) {
                            tip = 0;
                        } else if (avgVal > 0 && avgVal <= 20) {
                            tip = 7;
                        } else if (avgVal >= 21 && avgVal <= 40) {
                            tip = 14;
                        } else if (avgVal >= 41 && avgVal <= 60) {
                            tip = 21;
                        } else if (avgVal >= 61 && avgVal <= 80) {
                            tip = 28;
                        } else if (avgVal >= 81 && avgVal <= 99) {
                            tip = 34;
                        }
                    } else if (avgVal >= 100 && avgVal <= 125) {
                        if (avgVal >= 100 && avgVal <= 105) {
                            tip = 35;
                        } else if (avgVal >= 106 && avgVal <= 110) {
                            tip = 41;
                        } else if (avgVal >= 111 && avgVal <= 115) {
                            tip = 47;
                        } else if (avgVal >= 116 && avgVal <= 120) {
                            tip = 53;
                        } else if (avgVal >= 121 && avgVal <= 125) {
                            tip = 67;
                        }
                    } else if (avgVal >= 126) {
                        tip = 100;
                    }
                    break;
                case 'A1C levels':
                    if (avgVal < 5.7) {
                        tip = 50;
                    } else if (avgVal >= 5.7 && avgVal <= 6.4) {
                        tip = 76;
                    } else if (avgVal > 6.4) {
                        tip = 87;
                    }
                    break;
                case 'Total Cholesterol':
                    if (avgVal < 200) {
                        if (avgVal == 0) {
                            tip = 0;
                        } else if (avgVal > 0 && avgVal <= 40) {
                            tip = 7;
                        } else if (avgVal >= 41 && avgVal <= 80) {
                            tip = 14;
                        } else if (avgVal >= 81 && avgVal <= 120) {
                            tip = 21;
                        } else if (avgVal >= 120 && avgVal <= 160) {
                            tip = 28;
                        } else if (avgVal >= 161 && avgVal <= 199) {
                            tip = 34;
                        }
                    } else if (avgVal >= 200 && avgVal <= 239) {
                        if (avgVal == 0) {
                            tip = 0;
                        } else if (avgVal == 200) {
                            tip = 35;
                        } else if (avgVal > 200 && avgVal <= 208) {
                            tip = 41;
                        } else if (avgVal >= 209 && avgVal <= 216) {
                            tip = 47;
                        } else if (avgVal >= 217 && avgVal <= 224) {
                            tip = 53;
                        } else if (avgVal >= 225 && avgVal <= 232) {
                            tip = 59;
                        } else if (avgVal >= 233 && avgVal <= 239) {
                            tip = 67;
                        }
                    } else if (avgVal >= 240) {
                        tip = 100;
                    }
                    break;
                case 'H D L Cholesterol Men':
                    if (avgVal > 59) {
                        tip = 17;
                    } else if (avgVal >= 40 && avgVal <= 59) {
                        tip = 50;
                    } else if (avgVal < 40) {
                        tip = 80;
                    }
                    break;
                case 'H D L Cholesterol Women':
                    if (avgVal > 59) {
                        tip = 17;
                    } else if (avgVal >= 50 && avgVal <= 59) {
                        tip = 50;
                    } else if (avgVal < 50) {
                        tip = 80;
                    }
                    break;
                case 'L D L Cholesterol':
                    if (avgVal < 100) {
                        if (avgVal == 0) {
                            tip = 0;
                        } else if (avgVal > 0 && avgVal <= 20) {
                            tip = 5;
                        } else if (avgVal >= 21 && avgVal <= 40) {
                            tip = 10;
                        } else if (avgVal >= 41 && avgVal <= 60) {
                            tip = 15;
                        } else if (avgVal >= 61 && avgVal <= 80) {
                            tip = 20;
                        } else if (avgVal >= 81 && avgVal <= 99) {
                            tip = 25;
                        }
                    } else if (avgVal >= 100 && avgVal <= 129) {
                        if (avgVal == 100) {
                            tip = 27;
                        } else if (avgVal > 100 && avgVal <= 106) {
                            tip = 35;
                        } else if (avgVal >= 107 && avgVal <= 113) {
                            tip = 40;
                        } else if (avgVal >= 114 && avgVal <= 126) {
                            tip = 45;
                        } else if (avgVal >= 127 && avgVal <= 129) {
                            tip = 50;
                        }
                    } else if (avgVal >= 130 && avgVal <= 159) {
                        if (avgVal == 130) {
                            tip = 52;
                        } else if (avgVal > 130 && avgVal <= 136) {
                            tip = 60;
                        } else if (avgVal >= 137 && avgVal <= 143) {
                            tip = 65;
                        } else if (avgVal >= 144 && avgVal <= 149) {
                            tip = 68;
                        } else if (avgVal >= 150 && avgVal <= 156) {
                            tip = 70;
                        } else if (avgVal >= 157 && avgVal <= 159) {
                            tip = 75;
                        }
                    } else if (avgVal >= 160) {
                        tip = 100;
                    }
                    break;
                case 'Triglycerides':
                    if (avgVal < 150) {
                        if (avgVal == 0) {
                            tip = 0;
                        } else if (avgVal > 0 && avgVal <= 30) {
                            tip = 5;
                        } else if (avgVal >= 31 && avgVal <= 60) {
                            tip = 10;
                        } else if (avgVal >= 61 && avgVal <= 90) {
                            tip = 15;
                        } else if (avgVal >= 91 && avgVal <= 120) {
                            tip = 20;
                        } else if (avgVal >= 121 && avgVal < 150) {
                            tip = 25;
                        }
                    } else if (avgVal >= 150 && avgVal <= 199) {
                        if (avgVal == 150) {
                            tip = 26;
                        } else if (avgVal > 150 && avgVal <= 160) {
                            tip = 35;
                        } else if (avgVal >= 161 && avgVal <= 170) {
                            tip = 40;
                        } else if (avgVal >= 171 && avgVal <= 190) {
                            tip = 45;
                        } else if (avgVal >= 191 && avgVal <= 199) {
                            tip = 50;
                        }
                    } else if (avgVal >= 200 && avgVal <= 499) {
                        if (avgVal == 200) {
                            tip = 52;
                        } else if (avgVal > 200 && avgVal <= 260) {
                            tip = 60;
                        } else if (avgVal >= 261 && avgVal <= 320) {
                            tip = 65;
                        } else if (avgVal >= 321 && avgVal <= 380) {
                            tip = 70;
                        } else if (avgVal >= 381 && avgVal <= 440) {
                            tip = 72;
                        } else if (avgVal >= 441 && avgVal <= 499) {
                            tip = 75;
                        }
                    } else if (avgVal >= 500) {
                        tip = 100;
                    }
                    break;
            }
            return { label_status: tip };
        }catch(err){
            throw new Error(err.message);
        }
    }
    getIconPath(icon, webroot) {
        try{
            let iconImage;
            let iconData = isNaN(icon);
            if(!iconData){
                icon = parseInt(icon);
            }
            switch (icon) {
                case 1:
                    iconImage = "Sleep-Challenge.png";
                    break;
                case 2:
                    iconImage = "step-challenge.png";
                    break;
                case 3:
                    iconImage = "Steps-Challenge.png";
                    break;
                case 4:
                    iconImage = "Stress_Less.png";
                    break;
                case 5:
                    iconImage = "team-step-challenge.png";
                    break;
                case 6:
                    iconImage = "Trek-Layout-Challenge.png";
                    break;
                case 7:
                    iconImage = "Trek-Layout-Commitment-Challenge.png";
                    break;
                case 8:
                    iconImage = "visit-the-world.png";
                    break;
                case 9:
                    iconImage = "Biked-Miles-Challenge.png";
                    break;
                case 10:
                    iconImage = "Bingo_Challenge.png";
                    break;
                case 11:
                    iconImage = "biometric-football.png";
                    break;
                case 12:
                    iconImage = "eternal-challenge.png";
                    break;
                case 13:
                    iconImage = "Fitness-Challenge.png";
                    break;
                case 14:
                    iconImage = "football-3step.png";
                    break;
                case 15:
                    iconImage = "Healthy_Eating_ABC.png";
                    break;
                case 16:
                    iconImage = "healthy-habit.png";
                    break;
                case 17:
                    iconImage = "Holiday_Maintain_Dont_Gain.png";
                    break;
                case 18:
                    iconImage = "Hydrate_Challenge.png";
                    break;
                case 19:
                    iconImage = "Hydrate-Team-Challenge.png";
                    break;
                case 20:
                    iconImage = "Move_More_Challenge.png";
                    break;
                case 21:
                    iconImage = "nourish-your-body.png";
                    break;
                case 22:
                    iconImage = "Olympics_Challenge.png";
                    break;
                case 23:
                    iconImage = "Pay-It-Forward.png";
                    break;
                case 24:
                    iconImage = "Random-Act-of-Kindness-Challenge.png";
                    break;
                case 25:
                    iconImage = "Recipe_Challenge.png";
                    break;
                case 26:
                    iconImage = "Relay-Race-Challenge.png";
                    break;
                case 27:
                    iconImage = "Weight_Progress_Team.png";
                    break;
                default:
                    iconImage = "Fitness-Challenge.png"; 
            }
            return `${webroot}challenge/img/big/${iconImage}`;
        }catch(err){
            throw new Error(err.message);
        }
    }
    naturalCompare(a, b) {
        try{
            return a.localeCompare(b, undefined, { sensitivity: 'base' });
        }catch(err){
            throw new Error(err.message);
        }
    }
    isValidNumber(value: any) {
        try{
            return value !== undefined && value !== null && !isNaN(value) && value !== '';
        }catch(err){
            throw new Error(err.message);
        }
    }
    async moduleList(resultedData)  {
        try{
            let moduleList;
            if (resultedData.module_id) {
                switch (resultedData.module_id) {
                    case 1:
                            moduleList = [];
                        if (resultedData.ee) {
                            for (let i = 0; i < resultedData.ee.length; i++) {
                                moduleList.push({id: resultedData.ee[i].id,title: resultedData.ee[i].event_name});
                            }
                        }
                        if (resultedData.eec) {
                            for (let i = 0; i < resultedData.eec.length; i++) {
                                moduleList.push({id: `EVC${resultedData.eec[i].id}`,title:resultedData.eec[i].category_name});
                            }
                        }
                        break;
                    case 2:
                        if (resultedData.har) {
                            moduleList = {title: resultedData.har.title};
                        }
                        break;
                    case 3:
                        if (resultedData.ac) {
                            moduleList = {title: resultedData.ac.activity_name};
                        }
                        break;
                    case 4:
                        if (resultedData.csc) {
                            moduleList = {title: resultedData.csc.custom_cname};
                        }
                        break;
                    case 5:
                        if (resultedData.ql) {
                            moduleList = {title: resultedData.ql.title};
                        }
                        break;
                    case 6:
                        if (resultedData.qz) {
                            moduleList = {title: resultedData.qz.quiz_name};
                        }
                        break;
                    case 7:
                        moduleList = {title: appConstant.HRA_DATA[resultedData.org_activity_id]};
                        break;
                    case 8:
                        moduleList = {title: appConstant.BIO_DATA[resultedData.org_activity_id]};
                        break;
                    case 9:
                        if (resultedData.ep) {
                            moduleList = {title: resultedData.ep.title};
                        } else {
                            moduleList = {title: 'All Emotional Well-Being'};
                        }
                        break;
                }
            } else {
                moduleList = {title: resultedData?.ac?.activity_name};
            }
            return moduleList;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async getNumericPart(key) {
        try{
            let result = key.match(/\d+/);
            return result ? parseInt(result[0]) : key;
        }catch(err){
            throw new Error(err.message);
        }
    }
    generateDynamicSearchQuery(search_str, searchBy, split = true, alias:any = null) {
        try{
            /* if below loop AND AND not work then USE quoteEscaper function and *replace code add in this function */
            if (search_str.includes('\\')) {
                search_str = String.raw`${search_str}`
                search_str = search_str.replace(/\\/g,"\\\\\\\\")
            }
            search_str = search_str
                    .replace(/(['"])/g, '\\$1')
                    .replace(/[@$%]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
            if (search_str.length == 0) {
                search_str = '-@&_$%';
            }
            if(!Array.isArray(searchBy)) {
                searchBy = [searchBy];
            }
            search_str = split ? search_str?.split(' ') : [search_str];
            const conditions: string[] = [];
            searchBy?.forEach((sfield) => {
                let testdata = []; 
                search_str?.forEach((field) => {
                    if (sfield === 'full_name' && split) {
                        if(alias != null){
                             testdata.push(`(${alias}.first_name LIKE '%${field}%' OR ${alias}.last_name LIKE '%${field}%')`);
                        }else{
                             testdata.push(`(user.first_name LIKE '%${field}%' OR user.last_name LIKE '%${field}%')`);
                        }
                    }else if(sfield === 'full_name' && !split){
                        if(alias != null){
                            testdata.push(`CONCAT(${alias}.first_name, ' ', ${alias}.last_name) LIKE '%${field}%'`);
                        }else{
                            testdata.push(`CONCAT(user.first_name, ' ', user.last_name) LIKE '%${field}%'`);
                        }
                    } else {
                        testdata.push(`${sfield} LIKE '%${field}%'`);
                    }
                });
                conditions.push(`(${testdata.join(' AND ')})`);
            });    
            let whereClause = conditions.length ? '' + conditions.join(' OR ') : '';
            whereClause = whereClause ? ` AND (${whereClause})` : '';
            return whereClause;
        }catch(err){
            throw new Error(err.message);
        }
    }
    sanitizeInputfield(inputStr: string): string {
        try {
            if (!inputStr || typeof inputStr !== 'string') {
                return '';
            }
            let sanitized = inputStr;
            sanitized = sanitized.replace(/(-{2,}|\/\*|\*\/)/g, ''); // Remove SQL comment sequences
            sanitized = sanitized.replace(/(['"`%;\\])/g, ''); // Remove dangerous characters
            const sqlKeywords = [
                /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/gi,
                /(\bEXEC\b|\bEXECUTE\b|\bCAST\b|\bCONVERT\b)/gi,
                /(\bDECLARE\b|\bCREATE\b|\bALTER\b|\bTRUNCATE\b)/gi,
                /(\bSCRIPT\b|\bJAVASCRIPT\b|\bONERROR\b|\bONLOAD\b)/gi
            ];
            sqlKeywords.forEach(pattern => {
                sanitized = sanitized.replace(pattern, '');
            });             // Remove SQL keywords patterns (case-insensitive)
            sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');     // Remove null bytes and control characters
            sanitized = sanitized.replace(/\s+/g, ' ').trim();     // Remove multiple spaces
            const maxLength = 255;
            if (sanitized.length > maxLength) {
                sanitized = sanitized.substring(0, maxLength); // Limit length (adjust as needed)
            }
            return sanitized;
        } catch (err) {
            console.error('Sanitization error:', err);
            throw new Error(err.message);
        }
    }
    containsUnwantedCharacters(input) {
        try{
            const unwantedCharsRegex = /['`%]/; 
            return unwantedCharsRegex.test(input);
        }catch(err){
            throw new Error(err.message);
        }
    }
    sanitizePayload(inputData) {
        try{
            if (inputData?.search_str) {
                inputData.search_str =  inputData?.search_str.replace(/(['"])/g, '\\$1'); /* quote issue manage */
                inputData?.search_str?.includes("%") ? inputData.search_str = inputData?.search_str.replace(/%/g, '-@&_$%') : inputData?.search_str;
            }
            return inputData;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async parseUserAgent(uAgent: string) {
        try{
            let platform = null;
            let browser = null;
            let version = null;
            const empty = { platform, browser, version };
            const platformRegex = /\((.*?)\)/im;
            const browserRegex = /(Camino|Kindle(\ Fire\ Build)?|Firefox|Iceweasel|Safari|MSIE|Trident|AppleWebKit|TizenBrowser|Chrome|Vivaldi|IEMobile|Opera|OPR|zomohealth|ZomoHealth|Silk|Midori|Edge|Edg|CriOS|Baiduspider|Googlebot|YandexBot|bingbot|Lynx|Version|Wget|curl|NintendoBrowser|PLAYSTATION\ (\d|Vita)+)\s*(?:\/?(\d+[\.0-9A-Z]*))/i;
            const platformMatch = uAgent.match(platformRegex);
            if (platformMatch) {
                const platformMatches = platformMatch[1];
                const platformResult = platformMatches.match(/(Android|CrOS|Tizen|iPhone|iPad|Linux|Macintosh|Windows(\ Phone)?|Silk|BlackBerry|PlayBook|(New\ )?Nintendo\ (WiiU?|3DS)|Xbox(\ One)?)/im);
                if (platformResult && platformResult.length) {
                    platform = platformResult[0];
                }
            }
            const browserMatch = uAgent.match(browserRegex);
            if (browserMatch) {
                browser = browserMatch[1];  
                version = browserMatch[4] || null;  
            }
            if (uAgent.includes('PostmanRuntime')) {
                browser = 'PostmanRuntime';
                const postmanVersionMatch = uAgent.match(/PostmanRuntime\/([0-9\.]+)/);
                version = postmanVersionMatch ? postmanVersionMatch[1] : version || 'Unknown';
                platform = platform || 'Unknown'; 
            }
            if (uAgent.includes('PreventionCloud')) {
                browser = 'PreventionCloud';
                const preventionCloudVersionMatch = uAgent.match(/PreventionCloud\/([0-9\.]+)/);
                version = preventionCloudVersionMatch ? preventionCloudVersionMatch[1] : 'Unknown';
            }
            if (uAgent.includes('zomohealth') || uAgent.includes('ZomoHealth')) {
                browser = 'zomohealth';
                const zomohealthVersionMatch = uAgent.match(/zomohealth\/([0-9\.]+)/);
                version = zomohealthVersionMatch ? zomohealthVersionMatch[1] : 'Unknown';
            }
            if (uAgent.includes('okhttp')) {
                browser = 'okhttp';
                const okhttpVersionMatch = uAgent.match(/okhttp\/([0-9\.]+)/);
                version = okhttpVersionMatch ? okhttpVersionMatch[1] : 'Unknown';
            }
            if (browser === 'Iceweasel') {
                browser = 'Firefox';
            } else if (uAgent.includes('Playstation Vita')) {
                platform = 'PlayStation Vita';
                browser = 'Browser';
            } else if (uAgent.includes('Kindle Fire Build') || uAgent.includes('Silk')) {
                browser = browser === 'Silk' ? 'Silk' : 'Kindle';
                platform = 'Kindle Fire';
                const versionMatch = uAgent.match(/Version\/(\d+\.\d+)/);
                version = versionMatch ? versionMatch[1] : version || 'Unknown';
            } else if (uAgent.includes('NintendoBrowser') || platform === 'Nintendo 3DS') {
                browser = 'NintendoBrowser';
                version = version || 'Unknown';
            } else if (uAgent.includes('Kindle')) {
                browser = browser || 'Kindle';
                platform = 'Kindle';
                version = version || 'Unknown';
            } else if (uAgent.includes('OPR')) {
                // browser = 'Opera Next';
                // version = version || 'Unknown';
                browser = 'Opera Next';
                const operaVersionMatch = uAgent.match(/OPR\/([0-9\.]+)/);
                version = operaVersionMatch ? operaVersionMatch[1] : 'Unknown';
            } else if (uAgent.includes('Opera')) {
                browser = 'Opera';
                version = version || 'Unknown';
            } else if (uAgent.includes('Midori')) {
                browser = 'Midori';
                version = version || 'Unknown';
            } else if (browser === 'MSIE' || uAgent.includes('Trident') || uAgent.includes('Edge') || uAgent.includes('Edg')) {
                browser = 'MSIE';
                if (uAgent.includes('IEMobile')) {
                    browser = 'IEMobile';
                }
                const versionMatch = uAgent.match(/Edg\/([0-9\.]+)/);
                version = versionMatch ? versionMatch[1] : version || 'Unknown';
            } else if (uAgent.includes('Vivaldi')) {
                browser = 'Vivaldi';
                version = version || 'Unknown';
            } else if (uAgent.includes('Chrome') || uAgent.includes('CriOS')) {
                browser = 'Chrome';
                const chromeVersionMatch = uAgent.match(/Chrome\/([0-9\.]+)/);
                version = chromeVersionMatch ? chromeVersionMatch[1] : version || 'Unknown';
            } else if (browser === 'AppleWebKit') {
                if (platform === 'Android' && !uAgent.includes('Chrome')) {
                    browser = 'Android Browser';
                } else if (platform && platform.startsWith('BB')) {
                    browser = 'BlackBerry Browser';
                    platform = 'BlackBerry';
                } else if (platform === 'BlackBerry' || platform === 'PlayBook') {
                    browser = 'BlackBerry Browser';
                } else if (uAgent.includes('Safari')) {
                    browser = 'Safari';
                } else if (uAgent.includes('TizenBrowser')) {
                    browser = 'TizenBrowser';
                }
                const versionMatch = uAgent.match(/Version\/([0-9\.]+)/);
                version = versionMatch ? versionMatch[1] : version || 'Unknown';
            } else if (uAgent.match(/playstation \d/i)) {
                const platformMatch = uAgent.match(/playstation (\d+)/i);
                platform = platformMatch ? `PlayStation ${platformMatch[1]}` : 'PlayStation';
                browser = 'NetFront';
                version = version || 'Unknown';
            }
            return { platform: platform || null, browser: browser || null, version: version || null };
        }catch(err){
            throw new Error(err.message);
        }
    }    
    admin_mail_data(first_login_by: number, prefix: string){
        try{
            let pass_text;
            if(first_login_by == 0){
                if(prefix != ''){
                    pass_text = `Please use '${prefix}' keyword follow by your date of birth as your first time login password Example: Test10021990`;
                }else{
                    pass_text = "Please use your date of birth as your first time login password Example: 10021990";
                }
            }else if(first_login_by == 1){
                if(prefix != ''){
                    pass_text = `Please use '${prefix}' keyword follow by your Date of Hire as your first time login password Example: Test10021990`;
                }else{
                    pass_text = "Please use your date of hire as your first time login password Example: 10021990";
                }
            }else if(first_login_by == 3){
                if(prefix != ''){
                    pass_text = `Please use '${prefix}' keyword follow by your Employee id as your first time login password Example: Test12345`;
                }else{
                    pass_text = "Please use your employee id as your first time login password Example: Emp123";
                }
            }else if(first_login_by == 4){
                if(prefix != ''){
                    pass_text = `Please use '${prefix}' keyword follow by your SSN as your first time login password Example: Test10021990`;
                }
                else{
                    pass_text = "Please use your SSN as your first time login password Example: 10021990";
                }
            }else if(first_login_by == 5){
                if(prefix != ''){
                    pass_text = `Please use '${prefix}' keyword follow by your firstname + lastname + year of birth as your first time login password Example: TestFirstnameLastname1990`;
                }
                else{
                    pass_text = "Please use your firstname + lastname + year of birth as your first time login password Example: FirstnameLastname1990";
                }
            }
            return pass_text;
        }catch(err){
            throw new Error(err.message);
        }
	}
    mergeCompanyTables(data) {
        try{
            if (data && data.companySetting) {
                const { id, org_id, created_by, updated_by, created, updated, ...companySetting } = data.companySetting;
                data = { ...data, ...companySetting };
                delete data.companySetting;
            }
            if (data && data.companyMeta) {
                const { id, org_id, created_by, updated_by, created, updated, ...companyMeta } = data.companyMeta;
                data = { ...data, ...companyMeta };
                delete data.companyMeta;
            }
            if (data && data.CompanyContract) {
                const { id, org_id, created_by, updated_by, created, updated, ...companyContract } = data.CompanyContract;
                data = { ...data, ...companyContract };
                delete data.CompanyContract;
            }
            return data;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async resizeImage(inputPath, outputPath, width =200, height = 200) {
        try {
          const outputDir = path.dirname(outputPath);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          const image = await Jimp.read(inputPath);
          image.resize(width, height);
          await image.writeAsync(outputPath);
          return outputPath;
        } catch (err) {
          console.error('Error processing image:', err);
          return
        }
    }
    userDataToSamlRequest(userData, bpassmain, screeningtype, appstate) {
        try{
            const data = {
                secretcallkey: 'aTof8f19e58f2654b214ff8lOgist',
                recordid: userData.role_id,
                employeeid: userData.employeeid,
                lname: userData.last_name,
                dob: userData.dob ? moment(userData.dob).format('YYYY-MM-DD').replace(/-/g, '/') : userData.dob,
                fname: userData.first_name,
                gender: userData.gender,
                phone: userData.wphone,
                email: userData.email,
                address: userData.address,
                address2: userData.address2,
                city: userData.city,
                state: userData.state,
                zip: userData.zip,
                mname: userData.middle_name,
                bpassmain: bpassmain,
                screeningtype: "0",
                appstate: appstate
            };
            if (bpassmain === 'view' && ['CI623451', 'CI592794'].includes(userData.membership_code)) {
                if (userData.membership_code === 'CI592794') {
                    const month = new Date().getMonth() + 1; // JavaScript months are 0-indexed
                    if (month === 6) {
                        data['skey'] = 'ZMH03';
                    } else if (month === 7) {
                        data['skey'] = 'ZMH04';
                    } else if (month === 8) {
                        data['skey'] = 'ZMH05';
                    } else if (month === 9) {
                        data['skey'] = 'ZMH06';
                    } else if (month === 10) {
                        data['skey'] = 'ZMH07';
                    } else if (month === 11) {
                        data['skey'] = 'ZMH08';
                    } else if (month === 12) {
                        data['skey'] = 'ZMH09';
                    } else {
                        data['skey'] = 'ZMH02';
                    }
                    data['corporateid'] = '559';
                }
                if (userData.membership_code === 'CI623451') {
                    data['skey'] = 'ASA40';
                }
                if (userData.membership_code === 'CI450721') {
                    data['skey'] = 'ZMH10';
                }
                data.bpassmain = 'scheduler';
            }
            if (['CI623451'].includes(userData.membership_code)) {
                data['skey'] = 'ASA40';
                data.bpassmain = 'main';
            }
            return btoa(JSON.stringify(data));
        }catch(err){
            throw new Error(err.message);
        }
    }

    async adminMailData(firstLoginBy: number, prefix: string){
        try{
            let passText = '';
            switch (firstLoginBy) {
                case 0:
                passText = prefix
                ? `Please use '${prefix}' keyword followed by your date of birth as your first-time login password Example: ${prefix}10021990`
                : `Please use your date of birth as your first-time login password Example: 10021990`;
                break;
                case 1:
                passText = prefix
                ? `Please use '${prefix}' keyword followed by your Date of Hire as your first-time login password Example: ${prefix}10021990`
                : `Please use your date of hire as your first-time login password Example: 10021990`;
                break;
                case 3:
                passText = prefix
                ? `Please use '${prefix}' keyword followed by your Employee ID as your first-time login password Example: ${prefix}12345`
                : `Please use your employee ID as your first-time login password Example: Emp123`;
                break;
                case 4:
                passText = prefix
                ? `Please use '${prefix}' keyword followed by your SSN as your first-time login password Example: ${prefix}10021990`
                : `Please use your SSN as your first-time login password Example: 10021990`;
                break;
                case 5:
                passText = prefix
                ? `Please use '${prefix}' keyword followed by your firstname + lastname + year of birth as your first-time login password Example: ${prefix}FirstnameLastname1990`
                : `Please use your firstname + lastname + year of birth as your first-time login password Example: FirstnameLastname1990`;
                break;
                default:
                    passText = 'Invalid login type.';
            }
            return passText;
        }catch(err){
            throw new Error(err.message);
        }
    }
    async encryptAndSave(jsonData: any, filePath: string) {
        try{
            let iv = crypto.randomBytes(16)
            const jsonString = JSON.stringify(jsonData);
            const cipher = crypto.createCipheriv(algorithm, key, iv);
            let encrypted = cipher.update(jsonString, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const authTag = cipher.getAuthTag();
            const payload = {
                iv: iv.toString('hex'),
                data: encrypted,
                tag: authTag.toString('hex')
            };
            fs.writeFileSync(filePath, JSON.stringify(payload));
        }
        catch(error){
            console.error('Error encrypting and saving data:', error);
        }
    }
    // for SNYK path traversal issue
    sanitizeFileName(input: string | number): string {
        try{
            return String(input).replace(/[<>:"\/\\|?*]+/g, '_'); // Replaces invalid characters with "_"
        }catch(err){
            throw new Error(err.message);
        }
    }
    sanitize(inputData = '', defaultValue = '') {
        try{
            if(inputData){
                inputData = inputData.toString().trim();
            }else if(defaultValue == 'start_zero_replace'){
                inputData = inputData.toString().trim().replace(/^0+/, '');
            }
            return inputData;
        }catch(err){
            throw new Error(err.message);
        }

    }
    threeTimeUserName(firstName, lastName, birthYear, timeCount = 0) {
        try{
            return '';
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async escapeHtml(str: string) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async createUsername(firstName: string, lastName: string): Promise<string> {
        const id = Date.now().toString(16) + Math.floor(Math.random() * 1000).toString(16);
        const randStart = Math.floor(Math.random() * (id.length - 3));
        const suffix = id.substr(randStart, 3);
        const username = firstName + lastName + suffix;
        return (await this.escapeHtml(username)).replace(/[ ,'.]/g, "");
    }

    async isNonEmptyArray(data) {
        try{
            return Array.isArray(data) && data.length > 0;
        }catch (error) {
            throw new Error(error.message);
        }
    }

    async isNonEmptyObject(data) {
        try{
            return data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0;
        }catch (error) {
            throw new Error(error.message);
        }
    }
    async checkImage(url: string) {
        try {
            const res = await axios.head(url);
            return res.status === 200;
        } catch (err) {
            return false;
        }
    }
    async calculatePercentage(numerator: number, denominator: number) {
        try {
            if (!denominator || denominator === 0) return 0;
            return Math.floor((numerator / denominator) * 100);
        } catch (err) {
            return 0;
        }
    }


    healthFieldConfig: Partial<Record<HealthField, (val: number) => number>> = {
        bmi: (val) => {
            if (val < 25) return 0;
            if (val < 30) return 1;
            if (val <= 34) return 2;
            return 3;
        },

        systolic: (val) => {
            if (val < 120) return 0;
            if (val <= 139) return 1;
            if (val <= 160) return 2;
            return 3;
        },

        alc: (val) => {
            if (val < 5.7) return 0;
            return 3;
        },

        diastolic: (val) => {
            if (val < 80) return 0;
            if (val <= 89) return 1;
            if (val <= 99) return 2;
            return 3;
        },

        ldl: (val) => {
            if (val < 100) return 0;
            if (val <= 129) return 1;
            if (val <= 159) return 2;
            return 3;
        },

        triglycerides: (val) => {
            if (val < 150) return 0;
            if (val <= 199) return 1;
            if (val <= 499) return 2;
            return 3;
        },

        blood_glucose: (val) => {
            if (val < 100) return 0;
            if (val <= 125) return 1;
            return 2;
        },

        total_cholesterol: (val) => {
            if (val < 200) return 0;
            if (val <= 239) return 1;
            return 2;
        },

        hdlm: (val) => {
            if (val > 59) return 0;
            if (val >= 40) return 1;
            return 2;
        },

        hdlw: (val) => {
            if (val > 59) return 0;
            if (val >= 50) return 1;
            return 2;
        },

        waistm: (val) => {
            if (val < 37) return 0;
            if (val <= 42) return 1;
            return 2;
        },

        waistw: (val) => {
            if (val < 37) return 0;
            if (val <= 42) return 1;
            return 2;
        }
    };

    getClassificationAchievementStatus = (field: HealthField, avgVal: number): number => {
        return this.healthFieldConfig[field]?.(avgVal) ?? -1;
    };

    healthRiskConfig: Record<HealthField, (val: number) => RiskLevel> = {
        bmi: (val) => {
            if (!val) return '';
            if (val >= 35) return 'Very High Risk';
            if (val >= 30) return 'High Risk';
            if (val >= 25) return 'Moderate Risk';
            return 'Low Risk';
        },

        systolic: (val) => {
            if (!val) return '';
            if (val > 160) return 'Very High Risk';
            if (val >= 140) return 'High Risk';
            if (val >= 120) return 'Moderate Risk';
            return 'Low Risk';
        },

        diastolic: (val) => {
            if (!val) return '';
            if (val >= 100) return 'Very High Risk';
            if (val >= 90) return 'High Risk';
            if (val >= 80) return 'Moderate Risk';
            return 'Low Risk';
        },

        blood_glucose: (val) => {
            if (!val) return '';
            if (val >= 126) return 'High Risk';
            if (val >= 100) return 'Moderate Risk';
            return 'Low Risk';
        },

        fasting_blood_glucose: (val) => {
            if (!val) return '';
            if (val >= 126) return 'High Risk';
            if (val >= 100) return 'Moderate Risk';
            return 'Low Risk';
        },

        random_blood_glucose: (val) => {
            if (!val) return '';
            if (val >= 126) return 'High Risk';
            if (val >= 100) return 'Moderate Risk';
            return 'Low Risk';
        },

        alc: (val) => {
            if (!val) return '';
            if (val > 6.4) return 'Very High Risk';
            if (val >= 5.7) return 'Very High Risk';
            return 'Low Risk';
        },

        hdlm: (val) => {
            if (!val) return '';
            if (val < 40) return 'High Risk';
            if (val <= 59) return 'Moderate Risk';
            return 'Low Risk';
        },

        hdlw: (val) => {
            if (!val) return '';
            if (val < 50) return 'High Risk';
            if (val <= 59) return 'Moderate Risk';
            return 'Low Risk';
        },

        ldl: (val) => {
            if (!val) return '';
            if (val > 159) return 'Very High Risk';
            if (val >= 130) return 'High Risk';
            if (val >= 100) return 'Moderate Risk';
            return 'Low Risk';
        },

        triglycerides: (val) => {
            if (!val) return '';
            if (val >= 500) return 'Very High Risk';
            if (val >= 200) return 'High Risk';
            if (val >= 150) return 'Moderate Risk';
            return 'Low Risk';
        },

        total_cholesterol: (val) => {
            if (!val) return '';
            if (val >= 240) return 'High Risk';
            if (val >= 200) return 'Moderate Risk';
            return 'Low Risk';
        },

        waistm: (val) => {
            if (!val) return '';
            if (val <= 0) return 'Low Risk';
            if (val >= 100) return 'Moderate Risk';
            return 'High Risk';
        },

        waistw: (val) => {
            if (!val) return '';
            if (val <= 0) return 'Low Risk';
            if (val >= 100) return 'Moderate Risk';
            return 'High Risk';
        }
    };

    getRiskLevel = (field: HealthField, value: number): RiskLevel => {
        return this.healthRiskConfig[field]?.(value) ?? '';
    };

    MARKER_COLORS = {LOW: '#6ca540', MEDIUM: '#ffb848', HIGH: '#ff8b38', MODERATE: '#b76931', VERY_HIGH: '#734702', NEUTRAL: '#ccc'} as const;

    healthMarkerColorConfig: Partial<Record<HealthField, (val: number) => Promise<MarkerColor>>> = {
        bmi: async (val) => {
            if (!val) return this.MARKER_COLORS.NEUTRAL;
            if (val >= 35) return this.MARKER_COLORS.HIGH;
            if (val >= 30) return this.MARKER_COLORS.HIGH;
            if (val >= 25) return this.MARKER_COLORS.MEDIUM;
            return this.MARKER_COLORS.LOW;
        },

        systolic: async (val) => {
            if (!val) return this.MARKER_COLORS.NEUTRAL;
            if (val > 160) return this.MARKER_COLORS.HIGH;
            if (val >= 140) return this.MARKER_COLORS.HIGH;
            if (val >= 120) return this.MARKER_COLORS.MEDIUM;
            return this.MARKER_COLORS.LOW;
        },

        diastolic: async (val) => {
            if (!val) return this.MARKER_COLORS.NEUTRAL;
            if (val >= 100) return this.MARKER_COLORS.HIGH;
            if (val >= 90) return this.MARKER_COLORS.HIGH;
            if (val >= 80) return this.MARKER_COLORS.MEDIUM;
            return this.MARKER_COLORS.LOW;
        },

        blood_glucose: async (val) => {
            if (!val) return this.MARKER_COLORS.NEUTRAL;
            if (val >= 126) return this.MARKER_COLORS.HIGH;
            if (val >= 100) return this.MARKER_COLORS.MEDIUM;
            return this.MARKER_COLORS.LOW;
        },

        alc: async (val) => {
            if (!val) return this.MARKER_COLORS.NEUTRAL;
            if (val > 6.4) return this.MARKER_COLORS.HIGH;
            if (val >= 5.7) return this.MARKER_COLORS.HIGH;
            return this.MARKER_COLORS.LOW;
        },

        hdlm: async (val) => {
            if (!val) return this.MARKER_COLORS.NEUTRAL;
            if (val < 40) return this.MARKER_COLORS.HIGH;
            if (val >= 40 && val <= 59) return this.MARKER_COLORS.MEDIUM;
            return this.MARKER_COLORS.LOW;
        },

        hdlw: async (val) => {
            if (!val) return this.MARKER_COLORS.NEUTRAL;
            if (val < 50) return this.MARKER_COLORS.HIGH;
            if (val >= 50 && val <= 59) return this.MARKER_COLORS.MEDIUM;
            return this.MARKER_COLORS.LOW;
        },

        ldl: async (val) => {
            if (!val) return this.MARKER_COLORS.NEUTRAL;
            if (val > 159) return this.MARKER_COLORS.HIGH;
            if (val >= 130) return this.MARKER_COLORS.HIGH;
            if (val >= 100) return this.MARKER_COLORS.MEDIUM;
            return this.MARKER_COLORS.LOW;
        },

        triglycerides: async (val) => {
            if (!val) return this.MARKER_COLORS.NEUTRAL;
            if (val >= 500) return this.MARKER_COLORS.HIGH;
            if (val >= 200) return this.MARKER_COLORS.HIGH;
            if (val >= 150) return this.MARKER_COLORS.MEDIUM;
            return this.MARKER_COLORS.LOW;
        },

        total_cholesterol: async (val) => {
            if (!val) return this.MARKER_COLORS.NEUTRAL;
            if (val >= 240) return this.MARKER_COLORS.HIGH;
            if (val >= 200) return this.MARKER_COLORS.MEDIUM;
            return this.MARKER_COLORS.LOW;
        },

        waistm: async (val) => {
            if (!val) return this.MARKER_COLORS.NEUTRAL;
            return this.MARKER_COLORS.LOW;
        },

        waistw: async (val) => {
            if (!val) return this.MARKER_COLORS.NEUTRAL;
            return this.MARKER_COLORS.LOW;
        }
    };


    getMarkerColor = async (field: HealthField, value: number): Promise<MarkerColor> => {
        return await this.healthMarkerColorConfig[field]?.(value) ?? this.MARKER_COLORS.NEUTRAL;
    };

    biometricsrecordData = async (data) => {
        let responseData = [];
        for (let i = 0; i < data.length; i++) {
            let bData = data[i];
            let bmi: number = 0;
            let weight: number = 0
            if (
                'weight' in bData &&
                'height_ft' in bData &&
                'height_in' in bData
            ) {
                weight = Number(bData.weight);
                let ft: number = Number(bData.height_ft);
                let inch: number = Number(bData.height_in);
                let inFT: number = ft * 12;
                let totalInches: number = inFT + inch;
                if (totalInches * totalInches != 0) {
                    bmi = parseFloat(
                        (
                            (weight / (totalInches * totalInches)) *
                            703
                        ).toFixed(2),
                    );
                }
            }
            let bioData = {
                acl: bData?.alc,
                bmi: bData?.bmi || bmi,
                id: bData?.id,
                user_id: bData?.user_id,
                frm: bData?.frm,
                systolic: bData?.systolic,
                diastolic: bData?.diastolic,
                total_cholesterol: bData?.total_cholesterol,
                hdl: bData?.hdl,
                ldl: bData?.ldl,
                triglycerides: bData?.triglycerides,
                blood_glucose: bData?.blood_glucose,
                source: bData?.source ? bData?.source : 14,
                created: await this.commonDateService.DateTimeFormat(
                    bData.created,
                    'YYYY-MM-DD HH:mm:ss',
                ),
                years: await this.commonDateService.DateTimeFormat(
                    bData.created,
                    'YYYY',
                ),
                enter_by: bData?.enter_by || 0,
                waist: bData?.waist,
                random_blood_glucose: bData?.random_blood_glucose,
                fasting_blood_glucose: bData?.fasting_blood_glucose,
                is_tobacco_user: bData?.is_tobacco_user ?? 0,
                weight: bData?.weight || weight,
            };
            responseData.push({ ...bData, ...bioData });
        }
        return responseData;
    };
    async downloadEncryptFile(filename: string, data: string[], type: string = 'csv') {
        try{
            let csvContent = data.join('\n');
            const buffer = Buffer.from(csvContent, 'utf-8');
            let base64Data = buffer.toString('base64');
            if (type.toLowerCase() === 'csv') {
                base64Data = this.passwordEncrypt(base64Data);
            }
            return {
                file_data: base64Data,
                file_name: filename.replace('.'+type, ''),
                extension: type,
            };
        }catch(err){
            throw new Error(err instanceof Error ? err.message : String(err));
        }
    }

    async splitWeekdaysAndRest(string) {
        try{
            const allWeekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const weekdayPattern = new RegExp(
                `(${allWeekdays.join('|')})(\\s*-\\s*(${allWeekdays.join('|')}))?`,
                'i'
            );

            const match = string.match(weekdayPattern);

            if (match) {
                const weekdayPart = match[0].trim();
                const restPart = string.replace(match[0], '').trim();

                return [weekdayPart, restPart];
            }

            return ['', string];
        }catch(err){
            throw new Error(err instanceof Error ? err.message : String(err));
        }

    }

    async generateBiometricPdf(dataObj,DirPath) {
        try {
            const templatePath = path.join(
                process.cwd(),
                DirPath,
            );

            if (!fs.existsSync(templatePath)) {
                throw new Error('Template file not found at ' + templatePath);
            }

            const htmlTemplate = fs.readFileSync(templatePath, 'utf8');

            handlebars.registerHelper('eq', function(a, b) {
                return a === b;
            });

            const template = handlebars.compile(htmlTemplate);

            const html = template(dataObj);

            const document = { content: html };

            const buffer: Buffer = await new Promise((resolve, reject) => {
                const pdf = require('html-pdf-node');
                pdf.generatePdf(
                    document,
                    { format: 'A4' },
                    (err: any, buffer: Buffer) => {
                        if (err) return reject(err);
                        if (!buffer || buffer.length === 0)
                            return reject(new Error('PDF buffer is empty'));
                        const actualBuffer = Buffer.from(buffer);
                        resolve(actualBuffer);
                    },
                );
            });
            return buffer;
        }catch(err){
            throw new Error(err instanceof Error ? err.message : String(err));
        }
    }


    async savePdf(buffer: Buffer, fullFilePath: string): Promise<string> {
        const fsPromises = fs.promises;

        const dirPath = path.dirname(fullFilePath);

        await fsPromises.mkdir(dirPath, { recursive: true });

        const finalPath = fullFilePath.endsWith('.pdf')
            ? fullFilePath
            : `${fullFilePath}.pdf`;

        await fsPromises.writeFile(finalPath, buffer);

        return finalPath;
    }
}
