import { appConstant, CommonDateService, CommonService, tableConstant } from "@common-constants";
import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request } from "express";
import { lastValueFrom } from "rxjs";
import { In, Like } from "typeorm";
import { ActivityService } from "../activity/activity/activity.service";
import { UrlManageService } from "../common";
import { CommunicationTemplateTextsService } from "../communication/templatetexts/communicationtemplatetexts.service";
import { ActivePluginService } from "../company/activeplugins/activeplugin.service";
import { CompanyService } from "../company/companies/company.service";
import { AgeGroupService } from "../healthcheckup/agegroup/agegroup.service";
import { TobaccoUsesService } from "../healthcheckup/tobaccouses/tobaccouses.service";
import { UserFormsService } from "../healthcheckup/userforms/userforms.service";
import { ActivityLogService } from "../master/activitylog/activitylog.service";
import { NotificationsController } from "../notifications/notifications.controller";
import { TranslationService } from "../translation/translation.service";
import { UserService } from "../user/user/user.service";
import { UserSettingsService } from "../user/usersettings/usersettings.service";
import { FormService } from "./form.service";
// import moment from "moment";
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD

@Injectable()
export class FormHelperService {
    constructor(
        private readonly commonService: CommonService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly userService: UserService,
        private readonly activePluginService: ActivePluginService,
        private readonly communicationTemplateTextsService: CommunicationTemplateTextsService,
        private readonly activityService: ActivityService,
        private readonly tobaccoUsesService: TobaccoUsesService,
        private readonly userFormsService: UserFormsService,
        private readonly formService: FormService,
        private readonly userSettingsService: UserSettingsService,
        private readonly companyService: CompanyService,
        private readonly ageGroupService: AgeGroupService,
        private readonly urlManageService: UrlManageService,
        @Inject('COMMON_SERVICE') private readonly commonMicroservice: ClientProxy,
        private readonly notificationsController: NotificationsController,
        private readonly activityLogService: ActivityLogService,
    ) {}

    async formSteps(req: Request, postData: any) {
        try{
            if (!postData?.stepType) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let UserId = 0;
            let userFormData;
            if(postData?.signatureStep){
                userFormData = JSON.parse(JSON.parse(postData.signatureStep));
            }
            if(postData?.stepType == 'signature'){
                if (!postData?.user_code) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                let getUserId = await this.formService.getUserDetails({ code: postData?.user_code, role_id: In([2, 16]), status: '1' }, ['user.id', 'user.org_id', 'user.membership_code']);
                if(getUserId){
                    UserId = getUserId?.id;
                }
            }else{
                if (!postData?.user_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                UserId = postData?.user_id;
            }
            let filledData = Object.create(null);
            if(postData?.stepType == 'signature'){
                filledData = await this.stepOne(req, postData);
            }else if(postData?.stepType == 'biometric'){
                filledData = await this.biometricStep(req, postData);
            }else if(postData?.stepType == 'disease'){
                filledData = await this.diseaseStep(req, postData);
            }else if(postData?.stepType == 'age'){
                filledData = await this.ageStep(req, postData);
            }else if(postData?.stepType == 'tobacco'){
                filledData = await this.tobaccoStep(req, postData);
            }else if(postData?.stepType == 'confirm'){
                filledData = await this.confirmStep(req, postData);
            }else if(postData?.stepType == 'thanks'){
                filledData = await this.thanksStep(req, postData);
            }else if (postData?.stepType == 'dental') {
                filledData = await this.dentalStep(req,  postData);
            }else if (postData?.stepType == 'optometrists') {
                filledData = await this.optometristsStep(req,postData);
            }else if (postData?.stepType == 'dental-confirm') {
                filledData = await this.dentalConfirmStep(req, postData);
            }else if (postData?.stepType == 'optometrists-confirm') {
                filledData = await this.optometristsConfirmStep(req, postData);
            }else if (postData?.stepType == 'tobacco-affidavit') {
                filledData = await this.tobaccoAffidavit(req, postData);
            }else if (postData?.stepType == 'physician-register') {
                let signatureSteps = postData?.signatureStep ? JSON.parse(JSON.parse(postData?.signatureStep)) : Object.create(null);
                let physiciantype_id =  signatureSteps?.physiciantype_id || 0;
                let filledDataR = await this.physicianRegister(req, postData);
                if(filledDataR?.phyId && !filledDataR?.error){
                    postData.phyId = filledDataR.phyId;
                    if(physiciantype_id == 1){
                        filledData = await this.confirmStep(req, postData);
                    }else if (physiciantype_id == 4) {
                        filledData = await this.dentalConfirmStep(req, postData);
                    }else if (physiciantype_id == 24) {
                        filledData = await this.optometristsConfirmStep(req, postData);
                    }
                }else{
                    return {
                        error: 1,
                        message: 'Something went wrong...'
                    }
                }
            }
            let nextStepsDatas = Object.create(null);
            let nestSteps = filledData?.nextSteps || '';
            delete(filledData?.nextSteps);
            if(nestSteps == 'biometric'){
                postData.getType = 1;
                postData.user_id = UserId;
                nextStepsDatas = await this.biometricStep(req, postData);
            }else if(nestSteps == 'disease'){
                postData.getType = 1;
                postData.user_id = UserId;
                nextStepsDatas = await this.diseaseStep(req, postData);
            }else if(nestSteps == 'age'){
                postData.getType = 1;
                postData.user_id = UserId;
                nextStepsDatas = await this.ageStep(req, postData);
            }else if(nestSteps == 'tobacco'){
                postData.getType = 1;
                postData.user_id = UserId;
                nextStepsDatas = await this.tobaccoStep(req, postData);
            }else if(nestSteps == 'confirm'){
                postData.getType = 1;
                postData.user_id = UserId;
                nextStepsDatas = await this.confirmStep(req,postData);
            }else if(nestSteps == 'thanks'){
                postData.getType = 1;
                postData.user_id = UserId;
                nextStepsDatas = await this.thanksStep(req, postData);
            }else if(nestSteps == 'dental'){
                postData.getType = 1;
                postData.user_id = UserId;
                nextStepsDatas = await this.dentalStep(req,  postData);
            }else if(nestSteps == 'optometrists'){
                postData.getType = 1;
                postData.user_id = UserId;
                nextStepsDatas = await this.optometristsStep(req, postData);
            }else if(nestSteps == 'dental-confirm'){
                postData.getType = 1;
                postData.user_id = UserId;
                nextStepsDatas = await this.dentalConfirmStep(req, postData);
            }else if(nestSteps == 'optometrists-confirm'){
                postData.getType = 1;
                postData.user_id = UserId;
                nextStepsDatas = await this.optometristsConfirmStep(req, postData);
            }
            let returnDatas = Object.create(null);
            returnDatas.nestSteps = nestSteps;
            returnDatas.filledData = filledData;
            returnDatas.nextStepsDatas = nextStepsDatas;
            if ((nextStepsDatas?.error && nextStepsDatas.error == 1) || (filledData?.error && filledData.error == 1)) {
                return {
                    error: 1,
                    message: nextStepsDatas?.message || filledData?.message
                }
            }else if ((nextStepsDatas?.error && nextStepsDatas.error == 2) || (filledData?.error && filledData.error == 2)){
                throw new Error(nextStepsDatas?.message || filledData?.message);
            }
            if(returnDatas?.nestSteps == 'thanks'){
                let message = 'Form has been approved';
                let logo =  `${S3_URL}comn/assets/img/success.png`;
                if (!(userFormData?.fillType && (userFormData.fillType == 1 || userFormData.fillType == 3))) {
                    userFormData = await this.userFormsService.findOne({
                        id: userFormData?.formId
                    });
                }
                let formKey;
                if (userFormData?.fillType && (userFormData.fillType == 1 || userFormData.fillType == 3)) {
                    formKey = userFormData?.physiciantype_id;
                } else {
                    formKey = userFormData?.form_id;
                }
                let formData = JSON.parse(
                    JSON.stringify(appConstant.HEALTH_FORM_DEFAULT_DATA[formKey])
                );
                this.addNotification({
                    id: userFormData?.id, 
                    org_id: userFormData?.org_id || userFormData?.company_id,
                    user_id: userFormData['user_id'], 
                    custom_cname: formData.replace(' Forms',''), 
                    form_id: userFormData?.form_id, 
                    title: 'Health ' + message,
                    message: `Your ${formData.replace(' Forms','')} ` + message,
                    logo, 
                    url: `https://${process.env.DOMAIN}/health-forms?tab=1?formId=${userFormData?.id}`,
                    type: 'update',
                }, req);
            }
            return returnDatas
        }catch(error){
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
    async stepOne(req: Request,postData: any) {
        try{
            if(postData?.fillType && postData?.fillType == 2){
                if (!postData?.form_type || !postData?.user_code || !postData?.first_name || !postData?.last_name || !postData?.physician_date || !postData?.email || !postData?.formId) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }else if(postData?.fillType && postData?.fillType == 5){ // physician role
                if (!postData?.user_code ) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }else{
                if(postData?.fillType && postData?.fillType == 3){
                    if (!postData?.form_type || !postData?.user_code || !postData?.physician_date || !postData?.signature) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                    }
                }else{
                    if (!postData?.form_type || !postData?.user_code || !postData?.first_name || !postData?.last_name || !postData?.physician_date || !postData?.email || !postData?.signature) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                    }
                }
            }
            let storeData = Object.create(null);
            let getUserId = await this.formService.getUserDetails({ code: postData?.user_code, role_id: In([2, 16]), status: '1' }, ['user.id', 'user.org_id', 'user.membership_code']);
            let nextSteps = '';
            if(getUserId){
                let orgId = getUserId?.org_id || '';
                let UserId = getUserId?.id || '';
                let orgCode = getUserId?.membership_code || '';
                let fillTypes = 2
                if(postData?.fillType && postData?.fillType == 5){
                    fillTypes = 5
                }
                storeData.step = 'signatureStep';
                storeData.user_id = UserId;
                storeData.userCode = postData?.user_code;
                storeData.company_id = orgId;
                storeData.org_code = orgCode;
                storeData.physiciantype_id = postData?.form_type || '';
                storeData.signature = postData?.signature || '';
                storeData.first_name = postData?.first_name || '';
                storeData.last_name = postData?.last_name || '';
                storeData.email = postData?.email || '';
                storeData.office_phone = postData?.office_phone || '';
                storeData.physician_date = postData?.physician_date || '';
                storeData.formId = postData?.formId || '';
                storeData.confirm_healthcare_provider = postData?.confirm_healthcare_provider || 0;
                storeData.hippa_relese_confirm = postData?.hippa_relese_confirm || 0;
                storeData.fillType = postData?.fillType || '';
                if(fillTypes == 5){
                    storeData.step = 'signatureStep';
                    storeData.user_id = UserId;
                    storeData.userCode = postData?.user_code;
                    storeData.company_id = orgId;
                    storeData.org_code = orgCode;
                    storeData.physiciantype_id = 1;
                    storeData.signature = postData?.signature || '';
                    storeData.fillType = 5;
                    storeData.is_signed = postData?.is_signed || 0;
                    delete(storeData.first_name)
                    delete(storeData.last_name)
                    delete(storeData.email)
                    delete(storeData.office_phone)
                    delete(storeData.physician_date)
                    delete(storeData.formId)
                    delete(storeData.hippa_relese_confirm)
                    delete(storeData.confirm_healthcare_provider)
                }
                let currentDate = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD');
                let currentDateTimeStemp = await this.commonDateService.DateTimeFormat(currentDate, 'timestamp');
                let phyDate = await this.commonDateService.DateTimeFormat(postData?.physician_date, 'timestamp', 'YYYY-MM-DD');
                if(phyDate > currentDateTimeStemp && fillTypes != 2){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_PHYSICIAN_DATE"));
                }
                if(postData?.fillType && postData?.fillType == 2){
                    if(postData?.form_type == 2){
                        nextSteps = 'dental';
                    }else if(postData?.form_type == 3){
                        nextSteps = 'optometrists';
                    }else if(postData?.form_type == 6){
                        nextSteps = 'age';
                    }else{
                        nextSteps = 'biometric';
                    }
                }else if(postData?.fillType && postData?.fillType == 5){
                    nextSteps = 'biometric';
                }else{
                    let activeplugin = await this.activePluginService.getActivePluginList(Number(orgId));
                    if (activeplugin && activeplugin.length > 0) {
                        if(!postData?.formId && postData?.form_type != 5){
                            if (activeplugin.includes('Healthcheckup')) {
                                let getPrograms = await this.formService.getFormInstructions({ company_id: orgId },['forminstructions']);
                                getPrograms.program_selection = getPrograms.program_selection
                                    .split(',')
                                    .map(item => item.trim().replace(/s$/i, ''))
                                    .filter((value, index, self) => self.indexOf(value) === index)
                                    .join(',');
                                let selectedProgram = getPrograms?.program_selection?.split(',') || [];
                                let optional = getPrograms?.optionalpage?.split(',') || [];
                                if(postData?.form_type == 4){
                                    nextSteps = 'dental';
                                }else if(postData?.form_type == 24){
                                    nextSteps = 'optometrists';
                                }else{
                                    nextSteps = 'biometric';
                                }
                            }else{
                                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_FORBIDDEN_ACCESS"));
                            }
                        }else{
                            if (activeplugin.includes('Diseasemanagement')) {
                                let manageForms = await this.formService.getManageForms({ company_id: orgId },['mform']);
                                let optional = manageForms?.disease_form_ids?.split(',') || [];
                                if(postData?.form_type == 5){
                                    let checkValidForm = await this.formService.checkValidForm({ code: postData?.formId, status: 1, disease_id: In(optional) });
                                    if(checkValidForm){
                                        nextSteps = 'disease';
                                    }else{
                                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_FORM_ID"));
                                    }
                                }
                            }
                        }
                    }
                }
            }else{
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_MEMBERID_NOT_FOUND"));
            }
            let returnDatas = Object.create(null);
            returnDatas.nextSteps = nextSteps;
            returnDatas.signatureStep = JSON.stringify(storeData);
            return returnDatas
        }catch(error){
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
    async biometricStep( req: Request,postData: any) {
        try{
            if(!postData?.getType){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }else{
                if(postData?.getType == 2){
                    if (!postData?.user_id) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                    }
                }
            }
            let checkUser = await this.formService.getUserDetails({ id: postData?.user_id, role_id: In([2, 16]), status: '1' }, ['user.id', 'user.org_id','user.membership_code', 'user.dob']);
            let returnDatas = Object.create(null);
            if(checkUser){
                let getType = postData?.getType;
                let nextSteps = '';
                let orgId = checkUser?.org_id || '';
                let dob = checkUser?.dob || '';
                let form_type = postData?.form_type || '';
                let getPrograms = await this.formService.getFormInstructions({ company_id: orgId },['forminstructions']);
                if(!getPrograms){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_PROGRAM_NOT_SETUP"));
                }
                let selectedProgram = getPrograms?.program_selection?.split(',') || [];
                let bio_data_field = getPrograms?.bio_data_field?.split(',') || [];
                let optionalpage = getPrograms?.optionalpage?.split(',') || [];
                let bio_option = getPrograms?.bio_option ?? 1;
                if(!optionalpage.includes('2')){
                    optionalpage.push('2');
                    bio_data_field = ['1','2','3','4','5','6','7','8','9','10'];
                    bio_option = 1;
                }
                if(postData?.fillType && postData?.fillType == 5){
                    if(!optionalpage.includes('3')){
                        optionalpage.push('3');
                    }
                    if(!optionalpage.includes('4')){
                        optionalpage.push('4');
                    }
                }
                if(getType == 2){
                    let storeData = Object.assign(postData);
                    storeData.step = 'biometricStep';
                    storeData.fillType = postData?.fillType || '';
                    delete(storeData.getType);
                    storeData.bio_data_field = bio_data_field.join(',');
                    let signatureSteps = postData?.signatureStep ? JSON.parse(JSON.parse(postData?.signatureStep)) : Object.create(null);
                    delete(postData?.signatureStep);
                    if (signatureSteps?.physician_date && signatureSteps?.physician_date != '') {
                        storeData.date_obtain = signatureSteps?.physician_date;
                    } else {
                        storeData.date_obtain = '0000-00-00';
                    }
                    if(optionalpage.includes('2') && (bio_option == 0 && (!postData?.age_gender_setting || postData?.age_gender_setting == 0)) && postData?.ch_height && postData?.ch_height == 0 && postData?.height_ft == ''){
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_HEIGHT_REQUIRED"));
                    }
                    if(bio_option == 0 && (postData?.weight != '' && (postData?.height_ft == '' || postData?.height_in == ''))){
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_HEIGHT_WEIGHT_REQUIRED"));
                    }
                    if((postData?.systolic != '' && postData?.diastolic == '') || (postData?.systolic == '' && postData?.diastolic != '')){
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_DIASTOLIC_SYSTOLIC_REQUIRED"));
                    }
                    if(bio_data_field.includes('1') && bio_data_field.includes('2')){
                        if(postData?.height_ft && postData?.height_in && postData.height_ft != '' && postData.height_in != ''){
                            storeData.height = postData?.height_ft +':'+ postData?.height_in;
                            if(postData?.weight != '' && postData?.height_ft != ''){
                                let heightInc = (Number(postData?.height_ft) * 12) + Number(postData?.height_in);
                                let bmi = (Number(postData?.weight) * 703) / (heightInc * heightInc) ;
                                storeData.bmi = Number(bmi.toFixed(2));
                            }else{
                                storeData.bmi = '';
                            }
                        }else{
                            storeData.height = '';
                            storeData.bmi = '';
                        }
                    }
                    let activitysIds = [];
                    if (postData?.weight && postData?.height_ft) {
                        activitysIds.push(42); //42 is Physician Form - BMI activity id
                    }
                    if (postData?.total_cholesterol) {
                        activitysIds.push(43); //43 is Physician Form - Total Cholesterol activity id
                    }
                    if (postData?.hdl) {
                        activitysIds.push(44); //44 is Physician Form - HDL activity id
                    }
                    if (postData?.ldl) {
                        activitysIds.push(45); //45 is Physician Form - LDL activity id
                    }
                    if (postData?.triglycerides) {
                        activitysIds.push(46); //46 is Physician Form - Triglycerides activity id
                    }
                    if (postData?.systolic && postData?.diastolic) {
                        activitysIds.push(48); //48 is Physician Form - Blood Pressure activity id
                    }
                    if (postData?.blood_glucose || postData?.alc) {
                        activitysIds.push(47); //47 is Physician Form - Glucose or A1C activity id
                    }
                    if (activitysIds?.length > 0 || bio_option == 0) {
                        activitysIds.push(2); //2 is Physician common
                    }
                                if (postData?.waist) {
                        activitysIds.push(3811); //3811 is Physician Form - Waist activity id
                    }
                    if (postData?.age_gender_setting == 1 && postData?.tobacco_setting == 1) {
                        activitysIds.push(8784); //8784 is Age gender common
                        activitysIds.push(4); //4 is Age gender common
                    } else if (postData?.age_gender_setting == 1) {
                        activitysIds.push(8784); //8784 is Age gender common
                    } else if (postData?.tobacco_setting == 1) {
                        activitysIds.push(4); //4 is Age gender common
                    } else if (!activitysIds.includes(2)) {
                        activitysIds.push(2); //2 is Physician common
                    }
                    if(postData?.blood_glucose == ''){
                        storeData.test_type = 0;
                    }
                    storeData.activity_id = activitysIds.join(',');
                    const birthDate = moment(dob, 'YYYY-MM-DD');
                    const currentTime = moment();
                    const age19 = birthDate.add(19, 'years').isBefore(currentTime);
                    if (optionalpage.includes('5') && (!postData?.fillType || postData?.fillType != 5 )) {
                        nextSteps = `disease`;
                    } else if (optionalpage.includes('3') && age19) {
                        nextSteps = `age` ;
                    } else if (optionalpage.includes('3') && age19) {
                        nextSteps = `age`;
                    } else if (optionalpage.includes('4')) {
                        nextSteps = `tobacco`;
                    } else {
                        nextSteps = `confirm`;
                    }
                    if(postData?.fillType && postData?.fillType == 2 ){
                        if (form_type == 5) {
                            nextSteps = `confirm`;
                        } else {
                            nextSteps = `age` ;
                        } 
                    }
                    if(!storeData?.age_gender_setting){
                        storeData.age_gender_setting = postData?.age_gender_setting || 0;
                    }
                    returnDatas.nextSteps = nextSteps;
                    returnDatas.biometricStep = JSON.stringify(storeData);
                }else{
                    returnDatas.fieldRequired = bio_option;
                    if (optionalpage.includes('3') || optionalpage.includes('4') || (postData?.fillType && postData?.fillType == 2)) {
                        returnDatas.checkBoxTitle = "Check all boxes that apply";
                    }
                    if (optionalpage.includes('3') || (postData?.fillType && postData?.fillType == 2)) {
                        returnDatas.ageGenderCheckBox = "Check the box if you are only submitting completion for the Age/Gender Appropriate Preventive Care Form. This Means that the user did not complete a physician visit nor complete their biometric screening.";
                    }
                    if (optionalpage.includes('4') || (postData?.fillType && postData?.fillType == 2)) {
                        returnDatas.tobaccoCheckbox = "Check the box if you are only submitting completion for the Physician Tobacco Use Verification Form. This Means that the user did not complete a physician visit nor complete their biometric screening.";
                    }
                    returnDatas.formText = "Your patient is participating in a wellness program which promotes preventative primary care visits. Please enter your patients biometric data below : ";
                    if(postData?.fillType == 3){
                        returnDatas.formText = "Please enter the biometric data provided by your physician below. It is important that all information against your physician provided information before submitting.";
                    }
                    const bioDataField = bio_data_field.map(item => {
                        let value;
                        let otherField = [];
                        if (item === "1") {
                            value = "Height";
                        } else if (item === "2") {
                            value = "Weight";
                        } else if (item === "3") {
                            value = "Blood Pressure";
                        } else if(item === '4'){
                            value = "Total Cholesterol";
                        } else if(item === '5'){
                            value = "H D L Cholesterol";
                        }else if(item === '6'){
                            value = "Blood Glucose";
                            otherField = [
                                {
                                    id: 1,
                                    value: "Test Type",
                                },
                                {
                                    id: 2,
                                    value: "A1C",
                                },
                            ];
                        }else if(item === '7'){
                            value = "LDL Cholesterol";
                        }else if(item === '8'){
                            value = "Triglycerides";
                        }else if(item === '9'){
                            value = "Cotinine Testing";
                        }else if(item === '10'){
                            value = "Waist Circumference";
                        }
                        if(otherField.length > 0){
                            return { id: item, value, otherField };
                        }else{
                            return { id: item, value };
                        }
                    });
                    returnDatas.bio_data_field = bioDataField;
                }
            }else{
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_MEMBERID_NOT_FOUND"));
            }
            return returnDatas;
        }catch(error){
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
    async diseaseStep( req: Request,postData: any) {
        try{
            if(!postData?.getType){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }else{
                if(postData?.getType == 2){
                    if (!postData?.user_id) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                    }
                }
            }
            let checkUser = await this.formService.getUserDetails({ id: postData?.user_id, role_id: In([2, 16]), status: '1' }, ['user.id', 'user.org_id','user.membership_code', 'user.dob']);
            let returnDatas = Object.create(null);
            if(checkUser){
                let getType = postData?.getType;
                let nextSteps = '';
                let orgId = checkUser?.org_id || '';
                let dob = checkUser?.dob || '';
                let getPrograms = await this.formService.getFormInstructions({ company_id: orgId },['forminstructions']);
                let optionalpage = getPrograms?.optionalpage?.split(',') || [];
                let disease_ids = [];
                let diseases = [];
                if(getPrograms?.disease_ids){
                    disease_ids = getPrograms?.disease_ids?.split(',') || [];
                    diseases = await this.formService.getDiseaseList({ id: In(disease_ids), status: 1 });
                }
                if(disease_ids.length <= 0 && !postData?.fillType){
                    return {
                        error: 1,
                        redirect:1,
                        data: `/form`,
                        message: await this.translatorService.frontendReadTranslation(req.lang, "ERR_DISEASE_NOT_FOUND")
                    }
                }
                if(getType == 2){
                    let storeData = Object.assign(postData);
                    storeData.step = 'diseaseStep';
                    storeData.fillType = postData?.fillType || '';
                    delete(storeData.getType);
                    const birthDate = moment(dob, 'YYYY-MM-DD');
                    const currentTime = moment();
                    const age19 = birthDate.add(19, 'years').isBefore(currentTime);
                    if (optionalpage.includes('3') && age19) {
                        nextSteps = `age` ;
                    } else if (optionalpage.includes('4')) {
                        nextSteps = `tobacco`;
                    } else {
                        nextSteps = `confirm`;
                    }
                    returnDatas.nextSteps = nextSteps;
                    returnDatas.diseaseStep = JSON.stringify(storeData);
                }else{
                    returnDatas.title = "Disease Diagnosis";
                    returnDatas.formText = "Please check the box for any applicable diseases which have been diagnosed by the physician.";
                    returnDatas.diseases = diseases;
                }
            }else{
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_MEMBERID_NOT_FOUND"));
            }
            return returnDatas;
        }catch(error){
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        }
    }
    async ageStep( req: Request, postData: any) {
            try{
                if(postData?.fillType && postData?.fillType == 2){
                    if(!postData?.getType){
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                    }else{
                        if(postData?.getType == 2){
                            if (postData?.user_id === undefined || postData?.signatureStep === undefined) {
                                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                            }
                        }
                    }
                }else{
                    if(!postData?.getType){
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                    }else{
                        if(postData?.getType == 2){
                            if (!postData?.user_id) {
                                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                            }
                        }
                    }
                }
                let checkUser = await this.formService.getUserDetails({ id: postData?.user_id, role_id: In([2, 16]), status: '1' }, ['user.id', 'user.org_id','user.membership_code', 'user.dob','user.gender']);
                let returnDatas = Object.create(null);
                if(checkUser){
                    let getType = postData?.getType;
                    let nextSteps = '';
                    let orgId = checkUser?.org_id || '';
                    let UserId = checkUser?.id || '';
                    let orgCode = checkUser?.membership_code || '';
                    let dob = checkUser?.dob || '';
                    let userGender = checkUser?.gender || '';
                    let signatureSteps = postData?.signatureStep ? JSON.parse(JSON.parse(postData?.signatureStep)) : Object.create(null);
                    let getPrograms = await this.formService.getFormInstructions({ company_id: orgId },['forminstructions']);
                    let optionalpage = getPrograms?.optionalpage?.split(',') || [];
                    let aas_form_prog = getPrograms?.aas_form_prog?.split(',') || [];
                    if(!optionalpage.includes('3') && !postData?.fillType){
                        return {
                                error: 1,
                                redirect:1,
                                data: `/form`,
                                message: await this.translatorService.frontendReadTranslation(req.lang, "ERR_PREVENTATIVE_CARE_NOT_FOUND")
                            }
                    }
                    if(postData?.fillType && postData?.fillType == 5){
                        if(!optionalpage.includes('3')){
                            optionalpage.push('3');
                        }
                        if(!optionalpage.includes('4')){
                            optionalpage.push('4');
                        }
                    }
                    const dobs = moment(dob, "YYYY-MM-DD");
                    const age = moment().diff(dobs, 'years');
                    let whereAG = ` (agegroup.gender IN ('${userGender}','o') OR agegroup.gender IS NULL) AND agegroup.status = 1 AND (agegroup.group_min_age <= ${age} AND (agegroup.group_max_age >= ${age} OR agegroup.group_max_age = 0) AND (agegroup.group_min_age != 0 OR agegroup.group_max_age != 0))`;
                    let ageGroups = await this.ageGroupService.getAgeGroup(whereAG);
                    let ageGroupIds:any = ageGroups.map(item => item.id);
                    ageGroupIds = (ageGroupIds && ageGroupIds.length > 0) ? ageGroupIds.join(',') : null;
                    let currentTimeStamp:any = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD') + ' 00:00:00';
                    currentTimeStamp = await this.commonDateService.DateTimeFormat(currentTimeStamp, 'timestamp', 'YYYY-MM-DD HH:mm:ss');
                    if(getType == 2){
                        let storeData = Object.assign(postData);
                        storeData.step = 'ageStep';
                        storeData.fillType = postData?.fillType || '';
                        delete(storeData.getType);
                        if (optionalpage.includes('4')) {
                            nextSteps = `tobacco`;
                        } else {
                            nextSteps = `confirm`;
                        }
                        if(postData?.fillType && postData?.fillType == 2){
                            if(!signatureSteps.physiciantype_id || signatureSteps.physiciantype_id != 6){
                                nextSteps = `tobacco`;
                            }else{
                                nextSteps = `confirm`;
                            }
                        }
                        let selectedAgeOption = (postData?.selected_age_option) ? JSON.parse(postData?.selected_age_option) : [];
                        let ageActivitysIds = selectedAgeOption.map(item => item.id);
                        if(ageActivitysIds.length > 0){
                            let where = ` ageactivity.age_activity_id in (${ageActivitysIds.join(',')}) AND ageactivity.status = 1`;
                            let getAgeActivitys:any = await this.formService.getAgeActivitys(where,['ageactivity.age_activity_id','ageactivity.ref_activity_id','ageactivity.common_activity_id']);
                            const ageActivitys: string[] = Array.from(
                                new Set(
                                    getAgeActivitys.flatMap(item => [item?.ref_activity_id?.toString(), item?.common_activity_id?.toString()])
                                )
                            );
                            storeData.age_activity_id = ageActivitys.join(',');
                            storeData.ageActivitys = ageActivitysIds.join(',');
                        }else{
                            storeData.age_activity_id = '';
                            storeData.ageActivitys = '';
                        }
                        returnDatas.nextSteps = nextSteps;
                        returnDatas.ageStep = JSON.stringify(storeData);
                    }else{
                        returnDatas.title = "Age/Gender Appropriate Preventative Care";
                        returnDatas.formText = "Please mark any of the following age/gender appropriate preventative care items as complete if done within physician recommended guidelines.";
                        let where = ` ageactivity.group_type in (${ageGroupIds}) AND (ageactivity.gender IN ('${userGender}','o') OR ageactivity.gender IS NULL) AND ageactivity.status = 1 AND (ageactivity.org_id = ${orgId} OR ageactivity.org_id = 0)`;
                        let getAgeActivitys:any = await this.formService.getAgeActivitys(where,['ageactivity.age_activity_id','ageactivity.title','ageactivity.gender','ageactivity.min_age','ageactivity.max_age','ageactivity.org_id']);
                        let ageActs = Object.create(null);
                        if(getAgeActivitys){
                            for (let rowAge of getAgeActivitys) {
                                let minAge = 0;
                                let maxAge = 0;
                                if(aas_form_prog.includes(`${rowAge.age_activity_id}`)){
                                    if(rowAge.min_age && rowAge.min_age != 0){
                                        minAge = moment(dob).add(rowAge.min_age, 'years').unix();
                                    }
                                    if(rowAge.max_age && rowAge.max_age != 0){
                                        maxAge = moment(dob).add(rowAge.max_age, 'years').unix();
                                    }
                                    if((minAge == 0 || currentTimeStamp >= minAge) && (maxAge == 0 || currentTimeStamp < maxAge)){
                                        ageActs[rowAge.age_activity_id] = {'id' : rowAge.age_activity_id, 'title' : rowAge.title};
                                    }
                                }
                            }
                        }
                        returnDatas.ageActivitys = ageActs;
                    }
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_MEMBERID_NOT_FOUND"));
                }
                return returnDatas;
            }catch(error){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
            }
    }
    async tobaccoStep( req: Request, postData: any) {
            try{
                if(!postData?.getType){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }else{
                    if(postData?.getType == 2){
                        if (!postData?.user_id) {
                            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                        }
                    }
                }
                let checkUser = await this.formService.getUserDetails({ id: postData?.user_id, role_id: In([2, 16]), status: '1' }, ['user.id', 'user.org_id','user.membership_code', 'user.dob','user.gender']);
                let returnDatas = Object.create(null);
                if(checkUser){
                    let getType = postData?.getType;
                    delete(postData?.getType);
                    let nextSteps = '';
                    let orgId = checkUser?.org_id || '';
                    let UserId = checkUser?.id || '';
                    let orgCode = checkUser?.membership_code || '';
                    let dob = checkUser?.dob || '';
                    let userGender = checkUser?.gender || '';
                    let getPrograms = await this.formService.getFormInstructions({ company_id: orgId },['forminstructions']);
                    let optionalpage = getPrograms?.optionalpage?.split(',') || [];
                    if(!optionalpage.includes('4') && !postData?.fillType){
                        return {
                            error: 1,
                            redirect:1,
                            data: `/form`,
                            message: await this.translatorService.frontendReadTranslation(req.lang, "ERR_NO_TOBACCO_NOT_FOUND")
                        }
                    }
                    const birthDate = moment(dob, 'YYYY-MM-DD');
                    const userAge = moment().diff(moment(birthDate, 'YYYY-MM-DD'), 'years');
                    if(getType == 2){
                        let storeData = Object.assign(postData);
                        storeData.step = 'tobaccoStep';
                        storeData.fillType = postData?.fillType || '';
                        let is_tobacco_user = postData?.tobacco_option || '';
                        let tobaccoActivitys = [];
                        if(is_tobacco_user != ''){
                            if (is_tobacco_user == 1) {
                                tobaccoActivitys.push(12462);
                            } else if (is_tobacco_user == 2) {
                                tobaccoActivitys.push(12461);
                            } else if (is_tobacco_user == 3) {
                                tobaccoActivitys.push(12463);
                            }
                            tobaccoActivitys.push(128);
                            tobaccoActivitys.push(4);
                        }
                        storeData.to_activity_id = tobaccoActivitys.join(',');
                        nextSteps = `confirm`;
                        returnDatas.nextSteps = nextSteps;
                        returnDatas.tobaccoStep = JSON.stringify(storeData);
                    }else{
                        returnDatas.title = "Physician Tobacco Use Verification";
                        let formText = `<p>On May 2, 2014, the federal government released an FAQ that clarified how health plans should cover tobacco cessation as part of the preventive care guidelines under the Affordable Care Act (ACA). Non-grandfathered plans (or plans that have elected to conform and be ACA compliant with preventive services) must cover recommended preventive services with no member cost share and no deductible.</p>`;
                        formText += `<h4>Requirement</h4>`;
                        formText += `<p>The FAQ emphasizes that plans must cover at least two tobacco cessation attempts per year, including coverage for : </p></br>`;
                        formText += `<p><p>Forms have to be submitted online through <a href="https://${process.env.DOMAIN}/forms">https://${process.env.DOMAIN}/forms</a> or faxed to 1-877-899-8996 by 12-31-2015.</p></p>`;
                        formText += `<ul> <li>Four tobacco cessation counseling sessions of at least 10 minutes each (including telephone counseling, group counseling and individual counseling) without prior authorization, and<br></li> <li>All approved tobacco cessation medication by the FDA (Food and Drug Administration), including both prescription and over-the-counter, for a 90-day regimen when prescribed by a health care provider and filled at a pharmacy, without prior authorization.</li> </ul>`;
                        formText += `<p>Four visits and/or one 90-day supply of medications will equal one cessation attempt.</p><br/>`;
                        formText += '<p><b>I Hereby Certify That:</b></p>';
                        returnDatas.formText = formText;
                        returnDatas.formText2 = `<p>Tobacco use is defined as the use of cigarettes, cigars, chewing or pipe tobacco, or any other tobacco or nicotine product – including electronic cigarettes, in the prior 6 months regardless of frequency or method of use.</p>`;
                        returnDatas.tobaccoOption = [ { id: 1, value: "My patient is tobacco-free" }, { id: 2, value: "My patient is a tobacco user" }, { id: 3, value: "My patient is a tobacco user and is currently under my care for tobacco cessation" } ];
                        if(postData?.fillType == 3){
                            returnDatas.formText2 = `<p>Tobacco use is defined as the use of cigarettes, cigars, chewing or pipe tobacco, or any other tobacco or nicotine product – including electronic cigarettes, in the prior 6 months regardless of frequency or method of use.</p>`;
                            returnDatas.tobaccoOption = [ { id: 1, value: "I am tobacco-free" }, { id: 2, value: "I am a tobacco user" }, { id: 3, value: "I am a tobacco user and is currently under my care for tobacco cessation" } ];
                        }
                    }
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_MEMBERID_NOT_FOUND"));
                }
                return returnDatas;
            }catch(error){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
            }
    }
    async confirmStep(req: Request, postData: any) {
            try{
                if(!postData?.getType){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }else{
                    if(postData?.getType == 2){
                        if (!postData?.user_id) {
                            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                        }
                    }
                }
                let checkUser = await this.formService.getUserDetails({ id: postData?.user_id, role_id: In([2, 16]), status: '1' }, ['user.id', 'user.org_id','user.membership_code', 'user.dob','user.gender','user.email','user.first_name','user.last_name']);
                let returnDatas = Object.create(null);
                if(checkUser){
                    let getType = postData?.getType;
                    delete(postData?.getType);
                    let nextSteps = '';
                    let userId = checkUser?.id || '';
                    let orgId = checkUser?.org_id || '';
                    let dob = checkUser?.dob || '';
                    let userGender = checkUser?.gender || '';
                    if(getType == 2){
                        let signatureSteps = postData?.signatureStep ? JSON.parse(JSON.parse(postData?.signatureStep)) : Object.create(null);
                        let biometricSteps = postData?.biometricStep ? JSON.parse(JSON.parse(postData?.biometricStep)) : Object.create(null);
                        let diseaseSteps = postData?.diseaseStep ? JSON.parse(JSON.parse(postData?.diseaseStep)) : Object.create(null);
                        let ageSteps = postData?.ageStep ? JSON.parse(JSON.parse(postData?.ageStep)) : Object.create(null);
                        let tobaccoSteps = postData?.tobaccoStep ? JSON.parse(JSON.parse(postData?.tobaccoStep)) : Object.create(null);
                        delete(postData?.signatureStep);
                        delete(postData?.biometricStep);
                        delete(postData?.diseaseStep);
                        delete(postData?.ageStep);
                        delete(postData?.tobaccoStep);
                        nextSteps = `thanks`;
                        returnDatas.nextSteps = nextSteps;
                        let inserteData = Object.create(null);
                        inserteData['user_id'] = postData?.user_id;
                        let bioActivitysIds = biometricSteps?.activity_id?.split(',') || [];
                        let ageActivitysIds = ageSteps?.age_activity_id?.split(',') || [];
                        let tobaccoActivitysIds = tobaccoSteps?.to_activity_id?.split(',') || [];
                        let allActivitysIds = [];
                        bioActivitysIds = bioActivitysIds.filter(item => item !== '');
                        ageActivitysIds = ageActivitysIds.filter(item => item !== '');
                        tobaccoActivitysIds = tobaccoActivitysIds.filter(item => item !== '');
                        if(ageActivitysIds.length > 0){
                            allActivitysIds = [...bioActivitysIds, ...ageActivitysIds, ...tobaccoActivitysIds];
                        }else{
                            allActivitysIds = [...bioActivitysIds, ...tobaccoActivitysIds];
                        }
                        inserteData['status'] = 1;
                        inserteData['is_tobacco_user'] = tobaccoSteps?.tobacco_option || 0;
                        inserteData['is_tobacco_user_sign'] = tobaccoSteps?.is_tobacco_user_sign || '';
                        inserteData['aas_form_prog'] = ageSteps?.ageActivitys;
                        if(postData?.phyId){
                            inserteData['source'] = 12;
                        }else{
                            inserteData['source'] = 11;
                        }
                        if( signatureSteps['fillType'] == 2 ){
                            inserteData['source'] = 2;
                        }
                        if(signatureSteps['fillType'] == 3){
                            inserteData['source'] = 15;
                        }
                        if(signatureSteps['fillType'] == 5){
                            inserteData['physician_id'] = postData?.userIdM;
                            inserteData['source'] = 12;
                        }else{
                            if(postData?.phyId){
                                inserteData['physician_id'] = postData?.phyId;
                            }else{
                                inserteData['physician_id'] = 0;
                            }
                        }
                        inserteData['is_signed'] = signatureSteps?.hippa_relese_confirm || 0;
                        if(signatureSteps['fillType'] == 5){
                            inserteData['is_signed'] = signatureSteps?.is_signed || 0;
                        }
                        if(signatureSteps['fillType'] == 2){
                            inserteData['is_signed'] = signatureSteps?.is_signed || 1;
                        }
                        inserteData['signature'] = signatureSteps?.signature || '';
                        inserteData['preventative_visit'] = 1;
                        if(tobaccoSteps?.tobacco_option === undefined || tobaccoSteps?.tobacco_option == 0){
                            allActivitysIds = allActivitysIds.filter(item => !['4'].includes(item));
                        }
                        if(biometricSteps?.age_gender_setting === undefined || biometricSteps?.age_gender_setting == 0){
                            allActivitysIds.push('126');
                        }
                        if(signatureSteps?.physiciantype_id && signatureSteps?.physiciantype_id == 6){
                            allActivitysIds.push('9360');
                        }
                        if(signatureSteps?.physiciantype_id && signatureSteps?.physiciantype_id == 5){
                            allActivitysIds.push('8784');
                        }
                        inserteData['gender'] = userGender || '';
                        inserteData['activity_id'] = allActivitysIds.join(',');
                        inserteData['height'] = biometricSteps?.height || '';
                        inserteData['heightdate'] = inserteData['height'] !== '' ? await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD') : '';
                        inserteData['weight'] = biometricSteps?.weight || '';
                        inserteData['weightdate'] = inserteData['weight'] !== '' ? await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD') : '';
                        inserteData['bmi'] = biometricSteps?.bmi || '';
                        inserteData['systolic'] = biometricSteps?.systolic || '';
                        inserteData['diastolic'] = biometricSteps?.diastolic || '';
                        inserteData['diastolicdate'] = inserteData['systolic'] !== '' ? await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD') : '';
                        inserteData['blood_glucose'] = biometricSteps?.blood_glucose || '';
                        inserteData['bloodglucosedate'] = inserteData['blood_glucose'] !== '' ? await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD') : '';
                        inserteData['test_type'] = biometricSteps?.test_type || 0;
                        inserteData['alc'] = biometricSteps?.alc || '';
                        inserteData['a1cdate'] = inserteData['alc'] !== '' ? await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD') : '';
                        inserteData['hdl'] = biometricSteps?.hdl || '';
                        inserteData['hdldate'] = inserteData['hdl'] !== '' ? await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD') : '';
                        inserteData['ldl'] = biometricSteps?.ldl || '';
                        inserteData['total_cholesterol'] = biometricSteps?.total_cholesterol || '';
                        inserteData['total_cholesteroldate'] = inserteData['total_cholesterol'] !== '' ? await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD') : '';
                        inserteData['ldldate'] = inserteData['ldl'] !== '' ? await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD') : '';
                        inserteData['triglycerides'] = biometricSteps?.triglycerides || '';
                        inserteData['triglyceridedate'] = inserteData['triglycerides'] !== '' ? await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD') : '';
                        inserteData['waist'] = biometricSteps?.waist || '';
                        inserteData['waistdate'] = inserteData['waist'] !== '' ? await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD') : '';
                        inserteData['disease_id'] = diseaseSteps?.selected_disease || '';
                        inserteData['inserted'] = await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD HH:mm:ss');
                        inserteData['date_obtain'] = await this.commonDateService.DateTimeFormat(biometricSteps?.date_obtain,'YYYY-MM-DD','MM-DD-YYYY');
                        if(signatureSteps['physician_date']){
                            inserteData['created'] = await this.commonDateService.DateTimeFormat(signatureSteps['physician_date'],'YYYY-MM-DD HH:mm:ss','MM-DD-YYYY');
                        }
                        if(postData?.fillType && postData?.fillType == 2){
                            inserteData['enter_by'] = postData?.userIdM;
                        }
                        if(!inserteData['heightdate']){
                            inserteData['heightdate'] = '0000-00-00';
                        }
                        if(!inserteData['weightdate']){
                            inserteData['weightdate'] = '0000-00-00';
                        }
                        if(!inserteData['diastolicdate']){
                            inserteData['diastolicdate'] = '0000-00-00';
                        }
                        if(!inserteData['bloodglucosedate']){
                            inserteData['bloodglucosedate'] = '0000-00-00';
                        }
                        if(!inserteData['a1cdate']){
                            inserteData['a1cdate'] = '0000-00-00';
                        }
                        if(!inserteData['hdldate']){
                            inserteData['hdldate'] = '0000-00-00';
                        }
                        if(!inserteData['ldldate']){
                            inserteData['ldldate'] = '0000-00-00';
                        }
                        if(!inserteData['total_cholesteroldate']){
                            inserteData['total_cholesteroldate'] = '0000-00-00';
                        }
                        if(!inserteData['triglyceridedate']){
                            inserteData['triglyceridedate'] = '0000-00-00';
                        }
                        if(!inserteData['waistdate']){
                            inserteData['waistdate'] = '0000-00-00';
                        }
                        let insertedData = await this.formService.biometricSave(inserteData);
                        if(insertedData){
                            let ageGenderData = (ageSteps?.selected_age_option) ? JSON.parse(ageSteps?.selected_age_option) : [];
                            let insertageGenderData = Object.create(null);
                            let i = 0;
                            for (let ageActivity of ageGenderData) {
                                insertageGenderData[i] = {};
                                insertageGenderData[i]['reference_id'] = insertedData?.['id'];
                                insertageGenderData[i]['user_id'] = userId;
                                insertageGenderData[i]['date'] = await this.commonDateService.DateTimeFormat(ageActivity?.date,'YYYY-MM-DD','MM-DD-YYYY');
                                insertageGenderData[i]['age_activity_id'] = ageActivity.id;
                                insertageGenderData[i]['physician_name'] = ageActivity?.physician_name || '';
                                insertageGenderData[i]['physician_signature'] = ageActivity?.physician_signature || '';
                                insertageGenderData[i]['status'] = 1;
                                insertageGenderData[i]['inserted'] = await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD HH:mm:ss');
                                i++;
                            }
                            if(Object.keys(insertageGenderData).length > 0){
                                await this.formService.saveAgeGenderComplete(insertageGenderData);
                            }
                            if(signatureSteps?.formId && signatureSteps.formId !== '' && postData?.fillType && postData?.fillType == 2){
                                await this.userFormsService.update({id:signatureSteps.formId},{status:2})
                            }
                            let toEmail = checkUser?.email || '';
                            if(toEmail != ''){
                                let emailDetails = Object.create(null);
                                emailDetails['type'] = 6;
                                emailDetails['First_Name'] = checkUser.first_name;
                                let getCompanyName = await this.formService.getCompanyDetails({ id: orgId },['company.company_name']);
                                emailDetails['Company_Name'] = getCompanyName?.company_name;
                                if((biometricSteps?.age_gender_setting == 1 && allActivitysIds.includes('2')) || (biometricSteps?.age_gender_setting == 0)){
                                    const templateText = await this.formService.getEmailTemplate({org_id: In([orgId,0]), type: 6});
                                    let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                                    let emaildata = {
                                        sender: '',
                                        receiver: toEmail,
                                        subject: 'Physician Visit Packet Receipt Confirmation',
                                        content: emailDetails,
                                        template: templateNewText,
                                        type: 6
                                    }
                                    await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
                                }
                                if(ageSteps?.ageActivitys && ageSteps?.ageActivitys !== ''){
                                    let emailDetails = Object.create(null);
                                    emailDetails['type'] = 42;
                                    emailDetails['First_Name'] = checkUser.first_name;
                                    let getCompanyName = await this.formService.getCompanyDetails({ id: orgId },['company.company_name']);
                                    emailDetails['Company_Name'] = getCompanyName?.company_name;
                                    const templateText = await this.formService.getEmailTemplate({org_id: In([orgId,0]), type: 42});
                                    let templateTextNew = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text']; 
                                    let emaildata = {
                                        sender: '',
                                        receiver: toEmail,
                                        subject: 'Age and Gender screening Confirmation',
                                        content: emailDetails,
                                        template: templateTextNew,
                                        type: 42
                                    }
                                    await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata)); 
                                }
                                if (allActivitysIds.includes('4')) {
                                    const templateText = await this.formService.getEmailTemplate({ org_id: In([orgId, 0]), type: 43 });
                                    let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'], 'mailTemplate') || templateText?.['text'];
                                    let emaildata = {
                                        sender: '',
                                        receiver: toEmail,
                                        subject: 'Tobacco Affidavit Confirmation',
                                        content: emailDetails,
                                        template: templateNewText,
                                        type: 43
                                    }
                                    await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
                                }
                            }
                        }
                    }else{
                        let getPrograms = await this.formService.getFormInstructions({ company_id: orgId },['forminstructions']);
                        let optionalpage = getPrograms?.optionalpage?.split(',') || [];
                        let aas_form_prog = getPrograms?.aas_form_prog?.split(',') || [];
                        if(!optionalpage.includes('2')){
                            optionalpage.push('2');
                        }
                        let diseases = [];
                        if(getPrograms?.disease_ids){
                            let disease_ids = getPrograms?.disease_ids?.split(',') || [];
                            diseases = await this.formService.getDiseaseList({ id: In(disease_ids), status: 1 }, ['diseases.id', 'diseases.title']);
                        }
                        let formText = `<h4>Thank You For Your Submission</h4><br/><p>Your Patient Will Be Notified That This Form Has Been Completed With A Notification That They Can Login To View Their Information.</p><br/>`;
                        if(postData?.fillType == 3){
                            formText = `<h4>Thank You For Your Submission</h4>`;
                        }
                        if(postData?.fillType == 3){
                            formText += `<p>Press Submit To Complete this Form.</p>`;
                        }else{
                            formText += `<p>Please Continue If You Want To Register OR Press Submit To Complete this Form.</p>`;
                        }
                        returnDatas.formText = formText;
                        returnDatas.diseaseList = diseases;
                        returnDatas.tobaccoOption = [ { id: 1, value: "My patient is tobacco-free" }, { id: 2, value: "My patient is a tobacco user" }, { id: 3, value: "My patient is a tobacco user and is currently under my care for tobacco cessation" } ];
                        if(postData?.fillType == 3){
                            returnDatas.tobaccoOption = [ { id: 1, value: "I am is tobacco-free" }, { id: 2, value: "I am is a tobacco user" }, { id: 3, value: "I am is a tobacco user and is currently under my care for tobacco cessation" } ];
                        }
                        const birthDate = moment(dob, 'YYYY-MM-DD');
                        const userAge = moment().diff(moment(birthDate, 'YYYY-MM-DD'), 'years');
                        let where = ` ageactivity.min_age <= ${userAge} AND ageactivity.max_age >= ${userAge} AND (ageactivity.gender IN ('${userGender}','o') OR ageactivity.gender IS NULL) AND ageactivity.status = 1 AND (ageactivity.org_id = ${orgId} OR ageactivity.org_id = 0)`;
                        if(userAge >= 65){
                            let where = ` ageactivity.min_age <= ${userAge} AND (ageactivity.gender IN ('${userGender}','o') OR ageactivity.gender IS NULL) AND ageactivity.status = 1 AND (ageactivity.org_id = ${orgId} OR ageactivity.org_id = 0)`;
                        }
                        let getAgeActivitys:any = await this.formService.getAgeActivitys(where,['ageactivity.age_activity_id','ageactivity.title']);
                        if(getAgeActivitys){
                            getAgeActivitys = getAgeActivitys
                            .filter(item => aas_form_prog.includes(`${item.age_activity_id}`)) // Filter valid items
                            .map(item => ({
                                id: item.age_activity_id,
                                title: item.title
                            }));
                            let getAgeMActivitys = getAgeActivitys
                            .filter(item => aas_form_prog.includes(`${item.age_activity_id}`)) // Filter valid items
                            .map(item => ({
                                id: item.age_activity_id,
                                title: item.title
                            }));
                        }
                        returnDatas.ageActivitys = getAgeActivitys;
                    }
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_MEMBERID_NOT_FOUND"));
                }
                return returnDatas;
            }catch(error){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
            } 
    }
    async physicianRegister( req: Request, postData: any) {
            try{
                if(!postData?.getType){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }else{
                    if(postData?.getType == 2){
                        if (postData?.user_id === undefined || (!postData?.pname || !postData?.wphone || !postData?.address || !postData?.country || !postData?.state || !postData?.city || !postData?.zip || !postData?.username || !postData?.password || !postData?.confpassword)) {
                            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                        }
                        if(postData?.password != postData?.confpassword){
                            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "Password and Confirm Password does not match."));
                        }
                    }
                }
                let signatureSteps = postData?.signatureStep ? JSON.parse(JSON.parse(postData?.signatureStep)) : Object.create(null);
                let userCode = await this.formService.validPhyCode();
                let physiciantype_id =  signatureSteps?.physiciantype_id || 0;
                let registerPhyData = {
                    role_id: 8,
                    code: userCode,
                    activation_key: this.commonService.generateMD5(Date.now() + Math.random().toString()),
                    status: 1,
                    username: postData?.username.replace(/[^0-9a-zA-Z]/g, ''),
                    first_name: signatureSteps?.first_name.replace(/[^0-9a-zA-Z]/g, ''),
                    last_name: signatureSteps?.last_name.replace(/[^0-9a-zA-Z]/g, ''),
                    physiciantype_id: signatureSteps?.physiciantype_id || 0,
                    pname: postData?.pname.replace(/[^0-9a-zA-Z]/g, ''),
                    email: signatureSteps?.email,
                    middle_name: '',
                    num_login: 0,
                    last_login: new Date(),
                    password: postData?.password,
                    docpassword: await this.commonService.docPasswordEncrypt(postData?.confpassword),
                    entered_code: 'HC297334'
                }
                if(postData?.zip && postData?.country){
                    let usrTimeZone = await this.commonDateService.getTimezoneFromZipcode(postData?.zip, postData?.country);
                    registerPhyData['timezone'] = usrTimeZone;
                }
                let getMemDeptIds = await this.formService.getMemCodeOnDeptId('HC297334');
                if(getMemDeptIds){
                    registerPhyData['department_id'] = getMemDeptIds?.['department_id']?.[0]?.['id'] || 0;
                    registerPhyData['membership_code'] = getMemDeptIds?.['code'] || '';
                    registerPhyData['org_id'] = getMemDeptIds?.['id'] || 0;
                    registerPhyData['companytype_id'] = getMemDeptIds?.['company_type_id'] || 0;
                }
                let registerPhySettingData = {
                    wphone: postData?.wphone || '',
                    fax: postData?.fax || '',
                    address: postData?.address || '',
                    address2: postData?.address2 || '',
                    country: postData?.country || '',
                    state: postData?.state || '',
                    city: postData?.city || '',
                    zip: postData?.zip || '',
                };
                const createdPhy = await this.userService.save(registerPhyData, req);
                let returnDatas = Object.create(null);
                if(createdPhy){
                    let newPhyId = createdPhy['id'];
                    returnDatas['phyId'] = newPhyId;
                    registerPhySettingData['user_id'] = newPhyId;
                    const where = { user_id: newPhyId };
                    const recordDetails = await this.userSettingsService.findOne(where);
                    if (recordDetails) {
                        await this.userSettingsService.update({id: recordDetails['id']},registerPhySettingData);
                    }
                    else{
                        await this.userSettingsService.save(registerPhySettingData);
                    }
                    let encoded = createdPhy['activation_key'];
                    let passwordEncrypt = this.commonService.passwordEncrypt(`${createdPhy['code']}:::::${createdPhy['id']}:::::${postData?.password}`);
                    await this.commonService.makeCurlRequest('POST',process.env.PASSWORDENCRYPTION, {encrypted_assertion: passwordEncrypt},{'Authorization': `Bearer ${encoded}`,'Content-Type': 'application/x-www-form-urlencoded'});
                    let toEmail = signatureSteps?.email;
                    if(toEmail){
                        let companyDetails = await this.companyService.findOne(`company.code = '${createdPhy['membership_code']}' AND company.status = 1`,[tableConstant.COMPANIES.TBL_COMPANY_SETTINGS],['company','companySetting'])
                        const templateText = await this.communicationTemplateTextsService.findOne({ org_id: In([companyDetails['id'], 0]), type: 9 });
                        let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                        let subject = `Welcome to United Wellness`;
                        let emailDetails = Object.create(null);
                        emailDetails['type'] = 9;
                        emailDetails['firstName'] = createdPhy['first_name'];
                        emailDetails['Username'] = createdPhy['username'];
                        emailDetails['Password'] = postData?.password;
                        emailDetails['CompanyName'] = companyDetails?.company_name;
                        let emaildata = {
                            sender: ``,
                            receiver: toEmail,
                            subject: subject,
                            content: emailDetails,
                            template: templateNewText,
                            type: 9
                        }
                        await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
                    }
                }else{
                    returnDatas['error'] = 1;
                }
                return returnDatas;
            }catch(error){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
            } 
    }
    async thanksStep( req: Request,postData: any) {
        try{
            return `<h4>Thank you for entering your patient's information. The patient has been notified to login and view their results.</h4>`;
        }catch(error){
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
        } 
    }
    async dentalStep( req: Request, postData: any) {
            try{
                if(!postData?.getType){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }else{
                    if(postData?.getType == 2){
                        if (postData?.user_id === undefined || postData?.visit_date === undefined) {
                            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                        }
                    }
                }
                let checkUser = await this.formService.getUserDetails({ id: postData?.user_id, role_id: In([2, 16]), status: '1' }, ['user.id', 'user.org_id','user.membership_code', 'user.dob']);
                let returnDatas = Object.create(null);
                if(checkUser){
                    let storeData = Object.assign(postData);
                    storeData.step = 'dentalStep';
                    storeData.fillType = postData?.fillType || '';
                    let getType = postData?.getType;
                    delete(storeData.getType);
                    let nextSteps = '';
                    let orgId = checkUser?.org_id || '';
                    let UserId = checkUser?.id || '';
                    let getCompanyFormLimit = await this.formService.getCompanyFormLimit({ org_id: orgId },['companysettings.id', 'companysettings.org_id', 'companysettings.form_limit']);
                    if(getType == 2){
                        let getDentalFormsUsers = await this.formService.getDentalForms({ userid: UserId },['dental']);
                        let EntryExist = 0;
                        for (let denVar of getDentalFormsUsers) {
                            let dateCompleted = await this.commonDateService.DateTimeFormat(denVar?.date_completed,'MM-DD-YYYY');
                            if (denVar?.date_completed && dateCompleted == postData?.visit_date) {
                                EntryExist = 1;
                            }else if(denVar?.date_completed && dateCompleted == postData?.second_visit_date){
                                EntryExist = 1;
                            }
                        }
                        if(getCompanyFormLimit && getCompanyFormLimit?.form_limit == 1){
                            EntryExist = 0;
                        }
                        if(EntryExist == 0){
                            nextSteps = `dental-confirm`;
                            storeData.activity_id = '49';
                            returnDatas.dental = postData?.storeData;
                        }else{
                            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "Error: User has already completed a visit on this date. Please input a different visit date for the second visit."));
                        }
                        returnDatas.nextSteps = nextSteps;
                        returnDatas.dentalStep = JSON.stringify(storeData);
                    }else{
                        let currnetYear = await this.commonDateService.DateTimeFormat('now','YYYY');
                        let getUserDental = await this.formService.getDentalForms(`userid = ${UserId} AND YEAR(date_completed) = ${currnetYear}`,['dental']);
                        let getFormInstructions = await this.formService.getFormInstructions({ company_id: orgId },['forminstructions.id', 'forminstructions.company_id', 'forminstructions.yearly_opts']);
                        let buttonDisabled = 0;
                        let buttonDisabledMessage = '';
                        if(getCompanyFormLimit && getCompanyFormLimit?.form_limit == 1){
                            buttonDisabled = 0;
                        }else{
                            if(getFormInstructions && getFormInstructions?.yearly_opts == 2){
                                if(getUserDental && getUserDental.length > 0 && (getUserDental?.[0]['date_completed'] !== null || getUserDental?.[0]['date_completed']?.toString() !== '0000-00-00 00:00:00' || getUserDental?.[0]['date_completed']?.toString() !== 'Invalid date')){
                                    buttonDisabled = 1;
                                    buttonDisabledMessage = "Error: User already has credit.";
                                }
                            }else if(getFormInstructions && getFormInstructions?.yearly_opts == 1){
                                if(getUserDental.length == 2){
                                    buttonDisabled = 1;
                                    buttonDisabledMessage = "Error: User already has credit.";
                                }
                            }
                        }
                        returnDatas.buttonDisabled = buttonDisabled;
                        returnDatas.buttonDisabledMessage = buttonDisabledMessage;
                        let filedName1 = '';
                        let fieldDisabled1 = 0;
                        let exitDate1:any = '';
                        let paramName1 = '';
                        let filedName2 = '';
                        let fieldDisabled2 = 0;
                        let exitDate2:any = '';
                        let paramName2 = '';
                        let showNumberOfFields = 1;
                        if(getCompanyFormLimit && getCompanyFormLimit?.form_limit == 1){
                            filedName1 = 'Patient was seen on';
                            paramName1 = 'visit_date';
                        }else {
                            if(getFormInstructions && getFormInstructions?.yearly_opts == 2){
                                if(getUserDental && getUserDental.length > 0 && (getUserDental?.[0]['date_completed'] !== null || getUserDental?.[0]['date_completed']?.toString() !== '0000-00-00 00:00:00' || getUserDental?.[0]['date_completed']?.toString() !== 'Invalid date')){
                                    fieldDisabled1 = 1;
                                    exitDate1 = await this.commonDateService.DateTimeFormat(getUserDental?.[0]['date_completed'],'MM-DD-YYYY');
                                }
                                if(getUserDental.length == 0){
                                    paramName1 = 'visit_date';
                                }else{
                                    paramName1 = 'first_visit_date';
                                }
                                filedName1 = 'Patient was seen on';
                            }else if(getFormInstructions && getFormInstructions?.yearly_opts == 1){
                                showNumberOfFields = 2;
                                if(getUserDental && getUserDental.length > 0 && (getUserDental?.[0]['date_completed'] !== null || getUserDental?.[0]['date_completed']?.toString() !== '0000-00-00 00:00:00' || getUserDental?.[0]['date_completed']?.toString() !== 'Invalid date')){
                                    fieldDisabled1 = 1;
                                    exitDate1 = await this.commonDateService.DateTimeFormat(getUserDental?.[0]['date_completed'],'MM-DD-YYYY');
                                }
                                if(getUserDental.length == 0){
                                    paramName1 = 'visit_date';
                                }else{
                                    paramName1 = 'first_visit_date';
                                }
                                filedName1 = 'Patient was first seen on';
                                if(getUserDental && getUserDental.length > 0 && getUserDental?.[1] && (getUserDental?.[1]['date_completed'] !== null || getUserDental?.[1]['date_completed']?.toString() !== '0000-00-00 00:00:00' || getUserDental?.[1]['date_completed']?.toString() !== 'Invalid date')){
                                    fieldDisabled2 = 1;
                                    exitDate2 = await this.commonDateService.DateTimeFormat(getUserDental?.[1]['date_completed'],'MM-DD-YYYY');
                                }
                                if(getUserDental.length <= 1){
                                    if(getUserDental.length == 1){
                                        paramName2 = 'visit_date';
                                    }else{
                                        paramName2 = 'second_visit_date';
                                    }
                                }else{
                                    paramName2 = 'first_visit_date';
                                }
                                filedName2 = 'Patient was Second seen on';
                            }
                        }
                        if(postData?.fillType && postData?.fillType == 2){
                            filedName1 = 'Patient was first seen on';
                            paramName1 = 'visit_date';
                            fieldDisabled1 = 0;
                            paramName2 = '';
                            filedName2 = '';
                            fieldDisabled2 = 1;
                            if (getCompanyFormLimit && getCompanyFormLimit?.form_limit == 1) {
                                filedName1 = 'Patient was first seen on';
                                paramName1 = 'visit_date';
                                fieldDisabled1 = 0;
                                fieldDisabled2 = 1;
                            } else {
                                if (getFormInstructions && getFormInstructions?.yearly_opts == 1) {
                                    paramName2 = 'second_visit_date';
                                    filedName2 = 'Patient was Second seen on';
                                    fieldDisabled2 = 0;
                                }
                            }
                            returnDatas.fieldOne = [{ 'fieldName' : filedName1, 'disabled' : fieldDisabled1, 'paramName' : paramName1}];
                            returnDatas.fieldTwo = [{ 'fieldName' : filedName2, 'disabled' : fieldDisabled2, 'paramName' : paramName2}];
                        }else{
                            returnDatas.fieldOne = [{ 'fieldName' : filedName1, 'disabled' : fieldDisabled1, 'date' : exitDate1, 'paramName' : paramName1}];
                            returnDatas.fieldTwo = [{ 'fieldName' : filedName2, 'disabled' : fieldDisabled2, 'date' : exitDate2, 'paramName' : paramName2}];
                        }
                        returnDatas.showNumberOfFields = showNumberOfFields;
                        returnDatas.formText = "Your patient is participating in a wellness program which promotes preventative dental visits. By submitting the visit date indicates your patient has completed the visit.";
                        returnDatas.formBottomText = "Please note that this is a HIPAA compliant data collection secure website. All information entered will remain confidential.";
                    }
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_MEMBERID_NOT_FOUND"));
                }
                return returnDatas;
            }catch(error){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
            }
    }
    async dentalConfirmStep(req: Request,  postData: any) {
            try{
                if(!postData?.getType){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }else{
                    if(postData?.getType == 2){
                        if (postData?.user_id === undefined || postData?.signatureStep === undefined || postData?.dentalStep === undefined) {
                            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                        }
                    }
                }
                let checkUser = await this.formService.getUserDetails({ id: postData?.user_id, role_id: In([2, 16]), status: '1' }, ['user.id', 'user.org_id','user.membership_code', 'user.dob','user.gender','user.email','user.first_name']);
                let returnDatas = Object.create(null);
                if(checkUser){
                    let getType = postData?.getType;
                    delete(postData?.getType);
                    let storeData = Object.assign(postData);
                    let nextSteps = '';
                    let orgId = checkUser?.org_id || '';
                    if(getType == 2){
                        nextSteps = `thanks`;
                        let signatureSteps = postData?.signatureStep ? JSON.parse(JSON.parse(postData?.signatureStep)) : Object.create(null);
                        let dentalSteps = postData?.dentalStep ? JSON.parse(JSON.parse(postData?.dentalStep)) : Object.create(null);
                        delete(postData?.signatureStep);
                        delete(postData?.dentalStep);
                        returnDatas.nextSteps = nextSteps;
                        let inserteData = Object.create(null);
                        inserteData['userid'] = postData?.user_id;
                        if(postData?.phyId){
                            inserteData['physician_id'] = postData?.phyId;
                        }else{
                            inserteData['physician_id'] = 0;
                        }
                        inserteData['activity_id'] = dentalSteps?.activity_id || '';
                        inserteData['status'] = 1;
                        inserteData['is_signed'] = signatureSteps?.hippa_relese_confirm || 0;
                        if(signatureSteps['fillType'] == 2){
                            inserteData['is_signed'] = signatureSteps?.is_signed || 1;
                        }
                        inserteData['signature'] = signatureSteps?.signature || '';
                        inserteData['date_completed'] = await this.commonDateService.DateTimeFormat(dentalSteps?.visit_date,'YYYY-MM-DD','MM-DD-YYYY') + ' 00:00:00';
                        inserteData['inserted'] = await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD HH:mm:ss');
                        if(postData?.fillType && postData?.fillType == 2){
                            inserteData['enter_by'] = postData?.userIdM;
                        }
                        let insertedData = await this.formService.dentalSave(inserteData);
                        if(insertedData){
                            let getFormInstructions = await this.formService.getFormInstructions({ company_id: orgId },['forminstructions.id', 'forminstructions.company_id', 'forminstructions.yearly_opts']);
                            if(getFormInstructions && getFormInstructions?.yearly_opts == 1 && dentalSteps?.second_visit_date){
                                inserteData['date_completed'] = await this.commonDateService.DateTimeFormat(dentalSteps?.second_visit_date,'YYYY-MM-DD','MM-DD-YYYY') + ' 00:00:00';
                                await this.formService.dentalSave(inserteData);
                            }
                            if(signatureSteps?.formId && signatureSteps.formId !== '' && postData?.fillType && postData?.fillType == 2){
                                await this.userFormsService.update({id:signatureSteps.formId},{status:2})
                            }
                            let toEmail = checkUser?.email || '';
                            if(toEmail != ''){
                                let emailDetails = Object.create(null);
                                emailDetails['type'] = 13;
                                emailDetails['First_Name'] = checkUser.first_name;
                                let getCompanyName = await this.formService.getCompanyDetails({ id: orgId },['company.company_name']);
                                emailDetails['Company_Name'] = getCompanyName?.company_name;
                                const templateText = await this.formService.getEmailTemplate({org_id: In([orgId,0]), type: 13});
                                let templateTextNew = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                                let emaildata = {
                                    sender: '',
                                    receiver: toEmail,
                                    subject: 'Dental Visit Packet Receipt Confirmation',
                                    content: emailDetails,
                                    template: templateTextNew,
                                    type: 13
                                }
                                await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata)); 
                            }
                        }
                    }else{
                        let formText = `<h4>Thank You For your Submission</h4><br/>`;
                        formText += `<p>Your patient will be notified of their results.</p>`;
                        if(postData?.fillType && postData?.fillType == 3){
                            formText += `<p>Press Submit to just enter Biometric details without registration.</p>`;
                        }else{
                            formText += `<p>Please Continue if you want to register OR press Submit to just enter Biometric details without registration.</p>`;
                        }
                        returnDatas.formText = formText;
                    }
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_MEMBERID_NOT_FOUND"));
                }
                return returnDatas;
            }catch(error){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
            } 
    }
    async optometristsStep( req: Request, postData: any) {
            try{
                if(!postData?.getType){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }else{
                    if(postData?.getType == 2){
                        if (postData?.user_id === undefined || postData?.visit_date === undefined) {
                            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                        }
                    }
                }
                let checkUser = await this.formService.getUserDetails({ id: postData?.user_id, role_id: In([2, 16]), status: '1' }, ['user.id', 'user.org_id','user.membership_code', 'user.dob']);
                let returnDatas = Object.create(null);
                if(checkUser){
                    let storeData = Object.assign(postData);
                    storeData.step = 'optometristsStep';
                    storeData.fillType = postData?.fillType || '';
                    let getType = postData?.getType;
                    delete(storeData.getType);
                    let nextSteps = '';
                    let orgId = checkUser?.org_id || '';
                    let UserId = checkUser?.id || '';
                    if(getType == 2){
                        storeData.activity_id = '50';
                        returnDatas.dental = postData?.storeData;
                        nextSteps = `optometrists-confirm`;
                        returnDatas.nextSteps = nextSteps;
                        returnDatas.optometristsStep = JSON.stringify(storeData);
                    }else{
                        returnDatas.formText = "Your patient is participating in a wellness program which promotes preventative optometry visits. By submitting the visit date indicates your patient has completed the visit.";
                        returnDatas.formBottomText = "Please note that this is a HIPAA compliant data collection secure website. All information entered will remain confidential.";
                    }
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_MEMBERID_NOT_FOUND"));
                }
                return returnDatas;
            }catch(error){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
            }
    }
    async optometristsConfirmStep( req: Request, postData: any) {
            try{
                if(postData?.fillType && postData?.fillType == 2){
                    if(!postData?.getType){
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                    }else{
                        if(postData?.getType == 2){
                            if (postData?.user_id === undefined || postData?.signatureStep === undefined || postData?.optometristsStep === undefined) {
                                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                            }
                        }
                    }
                }else{
                    if(!postData?.getType){
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                    }else{
                        if(postData?.getType == 2){
                            if (postData?.user_id === undefined) {
                                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                            }
                        }
                    }
                }
                let checkUser = await this.formService.getUserDetails({ id: postData?.user_id, role_id: In([2, 16]), status: '1' }, ['user.id', 'user.org_id','user.membership_code', 'user.dob','user.gender','user.email','user.first_name']);
                let returnDatas = Object.create(null);
                if(checkUser){
                    let getType = postData?.getType;
                    delete(postData?.getType);
                    let storeData = Object.assign(postData);
                    let nextSteps = '';
                    let orgId = checkUser?.org_id || '';
                    if(getType == 2){
                        nextSteps = `thanks`;
                    }
                    if(getType == 2){
                        let signatureSteps = postData?.signatureStep ? JSON.parse(JSON.parse(postData?.signatureStep)) : Object.create(null);
                        let optometristsSteps = postData?.optometristsStep ? JSON.parse(JSON.parse(postData?.optometristsStep)) : Object.create(null);
                        delete(postData?.signatureStep);
                        delete(postData?.optometristsStep);
                        returnDatas.nextSteps = nextSteps;
                        let inserteData = Object.create(null);
                        inserteData['userid'] = postData?.user_id;
                        if(postData?.phyId){
                            inserteData['physician_id'] = postData?.phyId;
                        }else{
                            inserteData['physician_id'] = 0;
                        }
                        inserteData['activity_id'] = optometristsSteps?.activity_id || '';
                        inserteData['status'] = 1;
                        inserteData['is_signed'] = signatureSteps?.hippa_relese_confirm || 0;
                        if(signatureSteps['fillType'] == 2){
                            inserteData['is_signed'] = signatureSteps?.is_signed || 1;
                        }
                        inserteData['signature'] = signatureSteps?.signature || '';
                        inserteData['date_completed'] = await this.commonDateService.DateTimeFormat(optometristsSteps?.visit_date,'YYYY-MM-DD','MM-DD-YYYY') + ' 00:00:00';
                        inserteData['inserted'] = await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD HH:mm:ss');
                        if(postData?.fillType && postData?.fillType ==2){
                            inserteData['enter_by'] = postData?.userIdM;
                        }
                        let insertedData = await this.formService.optometristsSave(inserteData);
                        if(insertedData){
                            if(signatureSteps?.formId && signatureSteps.formId !== '' && postData?.fillType && postData?.fillType == 2){
                                await this.userFormsService.update({id:signatureSteps.formId},{status:2})
                            }
                            let toEmail = checkUser?.email || '';
                            if(toEmail != ''){
                                let emailDetails = Object.create(null);
                                emailDetails['type'] = 18;
                                emailDetails['First_Name'] = checkUser.first_name;
                                let getCompanyName = await this.formService.getCompanyDetails({ id: orgId },['company.company_name']);
                                emailDetails['Company_Name'] = getCompanyName?.company_name;
                                const templateText = await this.formService.getEmailTemplate({org_id: In([orgId,0]), type: 18});
                                let templateTextNew = await this.urlManageService.onmapUrlContent(templateText?.['new_text'],'mailTemplate') || templateText?.['text'];
                                let emaildata = {
                                    sender: '',
                                    receiver: toEmail,
                                    subject: 'Optometrist Visit Packet Receipt Confirmation',
                                    content: emailDetails,
                                    template: templateTextNew,
                                    type: 18
                                }
                                await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata)); 
                            }
                        }
                    }else{
                        let formText = `<h4>Thank You For your Submission</h4><br/>`;
                        formText += `<p>Your patient will be notified of their results.</p>`;
                        if(postData?.fillType && postData?.fillType == 3){
                            formText += `<p>Press Submit to just enter Biometric details without registration.</p>`;
                        }else{
                            formText += `<p>Please Continue if you want to register OR press Submit to just enter Biometric details without registration.</p>`;
                        }
                        returnDatas.formText = formText;
                    }
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_MEMBERID_NOT_FOUND"));
                }
                return returnDatas;
            }catch(error){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
            } 
        }
        async tobaccoAffidavit(req: Request, postData: any) {
            try{
                if(!postData?.getType){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }else{
                    if(postData?.getType == 2){
                        if (postData?.user_id === undefined || postData?.signature  === '' || postData?.is_tobacco_user === '' || postData?.formId === '') {
                            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                        }
                    }
                }
                let checkUser = await this.formService.getUserDetails({ id: postData?.user_id, role_id: In([2, 16]), status: '1' }, ['user.id', 'user.org_id','user.membership_code', 'user.dob','user.gender','user.email','user.first_name','user.last_name']);
                let returnDatas = Object.create(null);
                if(checkUser){
                    let getType = postData?.getType;
                    delete(postData?.getType);
                    let nextSteps = '';
                    let UserId = checkUser?.id || '';
                    if(getType == 2){
                        nextSteps = `thanks`;
                    }
                    if(getType == 2){
                        let inserteData = Object.create(null);
                        inserteData['user_id'] = UserId;
                        inserteData['type_of_form'] = 'Tabacco';
                        inserteData['is_tobacco_user'] = postData?.is_tobacco_user;
                        inserteData['signature'] = postData?.signature;
                        inserteData['date_completed'] = this.commonDateService.DateTimeFormat('now','YYYY-MM-DD HH:mm:ss');
                        inserteData['generated_by'] = req?.tokenUser?.id;
                        if(postData?.fillType && postData?.fillType ==2){
                            inserteData['enter_by'] = postData?.userIdM;
                        }
                        if(postData?.is_tobacco_user == 1){
                            let act_id = await this.activityService.activityFindOne({'activity_name':Like('Tobacco Affidavit- Non-tobacco user')},['id'],{id: 'ASC'})
                            if(act_id){
                                inserteData['activity_id'] = act_id.id
                            }
                        }
                        else if(postData?.is_tobacco_user == 2){
                            let act_id = await this.activityService.activityFindOne({'activity_name':Like('Tobacco Affidavit- Tobacco user')},['id'],{id: 'ASC'})
                            if(act_id){
                                inserteData['activity_id'] = act_id.id
                            }
                        }else if(postData?.is_tobacco_user == 3){
                            let act_id = await this.activityService.activityFindOne({'activity_name':Like('Tobacco Affidavit- Tobacco user participating in a tobacco cessation program')},['id'],{id: 'ASC'})
                            if(act_id){
                                inserteData['activity_id'] = act_id.id
                            }
                        }
                        let insertedData = await this.tobaccoUsesService.save(inserteData); 
                        if(insertedData){
                            if(postData?.formId !== '' && postData?.fillType && postData?.fillType == 2){
                                await this.userFormsService.update({id:postData?.formId},{status:2})
                            }
                        }
                        // add tobacco email
                        let toEmail = checkUser?.email || '';
                        if (toEmail != '') {
                            let emailDetails: { [key: string]: string | number } = Object.create(null);
                            emailDetails['type'] = 43;
                            emailDetails['First_Name'] = checkUser.first_name;
                            let getCompanyName = await this.formService.getCompanyDetails(
                                {
                                    id: checkUser?.org_id
                                },
                                ['company.company_name']
                            );
                            emailDetails['Company_Name'] = getCompanyName?.company_name;
                            const templateText = await this.formService.getEmailTemplate(
                                {
                                    org_id: In([checkUser?.org_id, 0]),
                                    type: 43
                                }
                            );
                            let templateNewText = await this.urlManageService.onmapUrlContent(templateText?.['new_text'], 'mailTemplate') || templateText?.['text'];
                            let emaildata = {
                                sender: '',
                                receiver: toEmail,
                                subject: 'Tobacco Affidavit Confirmation',
                                content: emailDetails,
                                template: templateNewText,
                                type: 43
                            };
                            await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
                        }
                    }
                    returnDatas.nextSteps = nextSteps;
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_MEMBERID_NOT_FOUND"));
                }
                return returnDatas;
            }catch (error) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, error.message));
            }        
        }

    async addNotification(formData: any, req: Request) {
        try {
            if(formData?.type == 'add' || formData?.type == 'update'){
                if(formData?.type == 'update'){
                    let whereCondition = { org_id: formData?.org_id};
                    if(formData?.id){ 
                        whereCondition['id'] = formData?.id;
                    }
                    if(formData?.form_id){ 
                        whereCondition['form_id'] = formData?.form_id;
                    }
                    await this.notificationsController.removeNotification(whereCondition,req);
                }
                let notificationData = {
                    org_id: formData.org_id,
                    user_id: formData?.user_id,
                    title: formData?.title,
                    message: formData?.message,
                    type: 2,
                    module_name: 'Health form',
                    submodule_name: 'Health form',
                    metadata: {
                        id: formData?.id,
                        form_id: formData?.form_id,
                        logo: formData?.logo ?? null,
                        url: formData?.url ?? null,
                        notification_date: this.commonDateService.getTodayDate().format('YYYY-MM-DD'),
                        notification_sent: 1,
                        notification_sent_count: 0,
                    },
                };
                await this.notificationsController.sendNotification(1, notificationData, req);  
            }
            return;
        }
        catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            return
        }
    }
}