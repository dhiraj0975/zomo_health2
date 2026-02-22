import { appConstant, CommonArrayService, CommonDateService, CommonHealthService, CommonService, ScheduleChallengeEntity, ScheduleChallengeJoinUsersEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { merge } from 'lodash';
import * as moment from 'moment-timezone';
import { ActivityService } from 'src/modules/activity/activity/activity.service';
import { CategoryService } from 'src/modules/activity/category/category.service';
import { ScheduleChallengeJoinUsersService } from 'src/modules/challenge/schedulechallengejoinusers/schedulechallengejoinusers.service';
import { UrlManageService } from 'src/modules/common';
import { InterlinksService } from 'src/modules/company/interlinks/interlinks.service';
import { AgeActivityService } from 'src/modules/healthcheckup/ageactivity/ageactivity.service';
import { TranslationService } from 'src/modules/translation/translation.service';
import { Repository } from 'typeorm';
import { FrontCalculationService } from './frontcalculation.service';
import { FrontHealthcheckupService } from './fronthealthcheckup.service';
import { FrontPointService } from './frontpoint.service';
import { FrontTrackerEventMediaService } from './fronttrackermediaevent.service';
@Injectable()
export class FrontPointsForService {
    constructor(
        @InjectRepository(ScheduleChallengeEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaScheduleChallengeRepository: Repository<ScheduleChallengeEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonHealthService: CommonHealthService,
        private readonly translatorService: TranslationService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly activityService: ActivityService,
        private readonly ageActivityService: AgeActivityService,
        private readonly frontHealthcheckupService: FrontHealthcheckupService,
        private readonly frontTrackerEventMediaService: FrontTrackerEventMediaService,
        private readonly interlinksService: InterlinksService,
        private readonly frontPointService: FrontPointService,
        private readonly frontCalculationService: FrontCalculationService,
        private readonly categoryService: CategoryService,
        private readonly commonService: CommonService,
        private readonly urlManageService: UrlManageService,
    ) {}

    async getSpecificCatActivityIds(catId:any = 0){
        try{
            let act_id_20 = await this.activityService.activityListRecord({category_id: catId, status: '1'},["id","activity_name"],{id: 'ASC'});
            let temp = Object.create(null);
            act_id_20.map(getAct => {
                temp[Number(getAct.id)] = Number(getAct.id);
            });
            if (Object.keys(temp)?.length > 0) {
                act_id_20 = temp;
                temp = Object.create(null);
            }
            let act_id_20_string = Object.keys(act_id_20).join('|');
            return act_id_20_string;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async generateLinkForActivitys(userADatas:any = [], formInstructionData:any = {}, hire_date:any = 0, req:any = null){
        try{
            let actId = userADatas?.['activity']?.['id'] || null;
            let orgId = req?.tokenUser?.org_id || null;
            let is_emo_health_asssessments = req?.tokenUser?.company?.setting?.is_emo_health_asssessments || null;
            let createdURL = '';
            let viewOn = '';
            const linkTitles = appConstant.INTERNALLINKS;
            let currentDate = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD');
            let currentDateTimeStemp = await this.commonDateService.DateTimeFormat(currentDate, 'timestamp');
            let actStartDateTS = await this.commonDateService.DateTimeFormat(userADatas['start_date'], 'timestamp');
            let actEndDateTS = await this.commonDateService.DateTimeFormat(userADatas['end_date'], 'timestamp');
            let isDefine = userADatas['isDefine'];
            let check_program_start_end_date = await this.translatorService.frontendReadTranslation(req.lang, 'please_complete_authorization_form_se_date', `/LC_MESSAGES/Activities/Activities`,`static`)+".";
            let please_complete_authorization_form = await this.translatorService.frontendReadTranslation(req.lang, 'please_complete_authorization_form', `/LC_MESSAGES/Activities/Activities`,`static`)+".";
            let activityLinkData = await this.activityService.getActivityLinks(`status = 1 AND (plugin != '' OR plugin != NULL)`, { 'id': 'ASC'}, ['id','activity_name','plugin','controller','action','newlink']);
            let categoryLinkData = await this.categoryService.getCategoryLinks(`status = 1 AND (plugin != '' OR plugin != NULL)`, { 'id': 'ASC'}, ['id','category_name','plugin','controller','action','newlink']);
            let formDownloadText = await this.translatorService.frontendReadTranslation(req.lang, 'Form Download', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
            let hipaaReleaseOnlineText = await this.translatorService.frontendReadTranslation(req.lang, 'HIPAA Release Online', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
            let OnlineText = await this.translatorService.frontendReadTranslation(req.lang, 'Online Form', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
            let DownloadText = await this.translatorService.frontendReadTranslation(req.lang, 'Download', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
            let AuthorizationFormText = await this.translatorService.frontendReadTranslation(req.lang, 'Authorization form', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
            let buttonnamefororg = await this.translatorService.frontendReadTranslation(req.lang,`Quick Link`, `/LC_MESSAGES/Campaign/Campaigns`,`static`);

            const physicianpopup = formInstructionData['forminstructions']?.['physicianpopup'] || {};
            const dentalpopup = formInstructionData['forminstructions']?.['dentalpopup'] || {};
            const optometristpopup = formInstructionData['forminstructions']?.['optometristpopup'] || {};
            const tabaccousespopup = formInstructionData['forminstructions']?.['tabaccousespopup'] || {};

            let activityButtonData: any = [];
            if(isDefine != 2){
                if(actId == 1 && orgId == 804){
                    createdURL = 'my-health/assessment';
                }else{
                    let internalLinkData: any = await this.interlinksService.listRecord({status: 1},{ 'id': 'ASC'}, ['id','linktitle','plugin','controller','action','newlink']);
                    if(userADatas['opentype'] == 0){
                        if (userADatas?.activity?.plugin != "" && userADatas?.activity?.plugin != null) {
                            let plugin = userADatas?.activity?.plugin.toLowerCase();
                            let controller = (userADatas?.activity?.controller != null) ? userADatas?.activity?.controller.toLowerCase() : '';
                            let action = (userADatas?.activity?.action != null) ? userADatas?.activity?.action.toLowerCase() : '';
                            let path = await this.commonDateService.manageAllURL('g_ac_plugin_link', {'pluginName' : plugin,'controllerName' : controller,'actionName' : action, 'itemId' : userADatas?.activity?.id },activityLinkData);
                            createdURL = path;
                        } else if (userADatas?.activity?.ext_link != "" && userADatas?.activity?.ext_link != null) {
                            createdURL = userADatas?.activity?.ext_link;
                        }else if (userADatas?.category?.plugin != "" && userADatas?.category?.plugin != null) {
                            let plugin = userADatas?.category?.plugin.toLowerCase();
                            let controller = (userADatas?.category?.controller != null) ? userADatas?.category?.controller.toLowerCase() : '';
                            let action = (userADatas?.category?.action != null) ? userADatas?.category?.action.toLowerCase() : '';
                            let path = await this.commonDateService.manageAllURL('g_ac_plugin_link', {'pluginName' : plugin,'controllerName' : controller,'actionName' : action , 'itemId' : userADatas?.category?.id},categoryLinkData);
                            createdURL = path;
                        } else {
                            createdURL = 'activities';
                        }
                    }else if(userADatas['opentype'] == 2){
                        let path = await this.commonDateService.manageAllURL('g_internal_link', {'inLinkId' : userADatas['openinternal']},internalLinkData);
                        createdURL = path;
                    }else if(userADatas['opentype'] == 3){
                        if (userADatas['openexternal'] == "https://sso.preventioncloud.com/ehealth" || userADatas['openexternal'] == "https://sso.preventioncloud.com/ehealth/view") {
                            let ssolinkdata = '';
                            if (userADatas['openexternal'] == "https://sso.preventioncloud.com/ehealth/view") {
                                ssolinkdata = await this.commonService.userDataToSamlRequest(req?.tokenUser, 'view', '1', '0');
                            } else {
                                ssolinkdata = await this.commonService.userDataToSamlRequest(req?.tokenUser, 'scheduler', '1', '0');
                            }
                            createdURL = `https://sso.preventioncloud.com/ehealth?SAMLRequest=${ssolinkdata}`;
                        } else {
                            let path = await this.urlManageService.onmapUrl(userADatas['openexternal']);
                            createdURL = path;
                        }
                    }else if(userADatas['opentype'] == 1 || userADatas['opentype'] == 4 || userADatas['opentype'] == 5){ 
                        viewOn = 'popup';
                        let Expirationdate_start = '';
                        let Expirationdate = '';
                        let Expirationdatepf_start = '';
                        let Expirationdatepf = '';
                        let Expirationdatedvf_start = '';
                        let Expirationdatedvf = '';
                        let Expirationdateovf_start = '';
                        let Expirationdateovf = '';
                        let Expirationdateta_start = '';
                        let Expirationdateta = '';
                        if(formInstructionData){
                            if(formInstructionData['forminstructions']['date_range'] == 1){
                                Expirationdatepf_start = formInstructionData['forminstructions']['pf_start_date'];
                                Expirationdatepf = formInstructionData['forminstructions']['pf_end_date'];
                                Expirationdatedvf_start = formInstructionData['forminstructions']['dvf_start_date'];
                                Expirationdatedvf = formInstructionData['forminstructions']['dvf_end_date'];
                                Expirationdateovf_start = formInstructionData['forminstructions']['ovf_start_date'];
                                Expirationdateovf = formInstructionData['forminstructions']['ovf_end_date'];
                                Expirationdateta_start = formInstructionData['forminstructions']['ta_start_date'];
                                Expirationdateta = formInstructionData['forminstructions']['ta_end_date'];
                            }else if(formInstructionData['forminstructions']['date_range'] == 2){
                                Expirationdate_start = formInstructionData['forminstructions']['start_date'];
                                Expirationdate = formInstructionData['forminstructions']['end_date'];
                            }
                        }
                        let optionalpage = formInstructionData?.['forminstructions']?.['optionalpage']?.split(',') || [];
                        let prevent_option = formInstructionData?.['forminstructions']?.['prevent_option'] || '';
                        const activityName = userADatas?.['activity']?.['activity_name'].toLowerCase();
                        let tobacco_form_option = formInstructionData?.['forminstructions']?.['tobacco_form_option'] || 0;
                        const privateKey = 'AAHHB54525JJDK5854KKLLK56252';
                        const secretKey = '5h56h5fvfd2';
                        const encryptMethod = 'aes-256-cbc';
                        const key = crypto.createHash('sha256').update(privateKey).digest();
                        const ivalue = crypto.createHash('sha256').update(secretKey).digest().subarray(0, 16);
                        const encrypt = (text: string | number): string => {
                            const cipher = crypto.createCipheriv(encryptMethod, key, ivalue);
                            let encrypted = cipher.update(text.toString(), 'utf8', 'base64');
                            encrypted += cipher.final('base64');
                            return encrypted;
                        };
                        const para = encrypt(7);
                        
                        let a = physicianpopup?.['user_id'] || '';
                        let b = physicianpopup?.['signature'] || '';
                        let c = tabaccousespopup?.['user_id'] || '';
                        let d = tabaccousespopup?.['signature'] || '';
                        
                        if(activityName.includes('physician form') || activityName.includes('physician visit')){
                            let physicianLinkPara = {};
                            let preventLinkPara = {};
                            let physiciandownload = formDownloadText;
                            let physiciandownloadLink = '#';
                            let physiciandownloadMessage = check_program_start_end_date;
                            let preventdownload = formDownloadText;
                            let preventdownloadLink = '#';
                            let preventdownloadMessage = check_program_start_end_date;
                            let physician_update = hipaaReleaseOnlineText;
                            let physician_updateLink = `/health-checkup/authorizations/sign-auth`;
                            
                            let pf_start_date = Expirationdatepf_start;
                            let pf_end_date = Expirationdatepf;
                            let start_common_date = Expirationdate_start;
                            let end_common_date = Expirationdate;
                            let pfStartDateTS = await this.commonDateService.DateTimeFormat(pf_start_date, 'timestamp');
                            let pfEndDateTS = await this.commonDateService.DateTimeFormat(pf_end_date, 'timestamp');
                            let StartDateTS = await this.commonDateService.DateTimeFormat(start_common_date, 'timestamp');
                            let EndDateTS = await this.commonDateService.DateTimeFormat(end_common_date, 'timestamp');

                            let Physician = 'Physician Visit Packet';
                            if (formInstructionData['statuspfpopup'] == "Not complete") {
                                physiciandownload = formDownloadText;
                                physiciandownloadLink = '#';
                                physiciandownloadMessage = please_complete_authorization_form;
                                preventdownload = formDownloadText;
                                preventdownloadLink = '#';
                                preventdownloadMessage = please_complete_authorization_form;
                            }else if(currentDateTimeStemp >= pfStartDateTS && currentDateTimeStemp <= pfEndDateTS){
                                if(hire_date == 1){
                                    physiciandownload = formDownloadText;
                                    preventdownload = formDownloadText;
                                    physiciandownloadLink = `/health-checkup/form-instructions/get-one`;
                                    physicianLinkPara = { 'type' : 'Physician', 'startdate': pf_start_date, 'enddate': pf_end_date };
                                    preventdownloadLink = `/health-checkup/form-instructions/get-one`;
                                    preventLinkPara = { 'type' : 'Physician', 'startdate': pf_start_date, 'enddate': pf_end_date, 'is_prevent': para };
                                }else{
                                    physiciandownload = formDownloadText;
                                    preventdownload = formDownloadText;
                                    physiciandownloadLink = `/health-checkup/form-instructions/get-one`;
                                    physicianLinkPara = { 'type': 'Physician' };
                                    preventdownloadLink = `/health-checkup/form-instructions/get-one`;
                                    preventLinkPara = { 'type': 'Physician', 'is_prevent': para };
                                }
                            }else if(currentDateTimeStemp >= StartDateTS && currentDateTimeStemp <= EndDateTS){
                                physiciandownload = formDownloadText;
                                preventdownload = formDownloadText;
                                physiciandownloadLink = `/health-checkup/form-instructions/get-one`;
                                physicianLinkPara = { 'type': 'Physician' };
                                preventdownloadLink = `/health-checkup/form-instructions/get-one`;
                                preventLinkPara = { 'type': 'Physician', 'is_prevent': para };
                            }else{
                                physiciandownload = formDownloadText;
                                physiciandownloadLink = '#';
                                physiciandownloadMessage = check_program_start_end_date;
                                preventdownload = formDownloadText;
                                preventdownloadLink = '#';
                                preventdownloadMessage = check_program_start_end_date;
                            }
                            physician_update = hipaaReleaseOnlineText;
                            physician_updateLink = `/health-checkup/authorizations/sign-auth`;
                            activityButtonData = [
                                { 
                                    'name': physician_update, 
                                    'link': physician_updateLink || '',
                                    'message' : '',
                                    'redirectType' : 1
                                },
                                {
                                    'name': physiciandownload, 
                                    'link': physiciandownloadLink || '',
                                    'linkParameter': physicianLinkPara,
                                    'message' : physiciandownloadMessage,
                                    'redirectType' : 0
                                }
                            ];
                            if(prevent_option == 1 || prevent_option == 2){
                                activityButtonData = [
                                    {
                                        'name': physician_update,
                                        'link': physician_updateLink || '',
                                        'message' : '',
                                        'redirectType' : 1
                                    },
                                    {
                                        'name': preventdownload,
                                        'link': preventdownloadLink || '',
                                        'linkParameter': preventLinkPara,
                                        'message' : preventdownloadMessage,
                                        'redirectType' : 0
                                    }
                                ];
                            }
                        }else if(activityName.includes('dental visit form') || activityName.includes('dental visit')){
                            let dentalLinkPara = {};
                            let dentaldownload = formDownloadText;
                            let dentaldownloadLink = '#';
                            let dentaldownloadMessage = check_program_start_end_date;
                            let dental_update = hipaaReleaseOnlineText;
                            let dental_updateLink = `/health-checkup/authorizations/dental-use`;

                            let dvf_start_date = Expirationdatedvf_start;
                            let dvf_end_date = Expirationdatedvf;
                            let start_common_date = Expirationdate_start;
                            let end_common_date = Expirationdate;
                            let dvfStartDateTS = (dvf_start_date != '') ? await this.commonDateService.DateTimeFormat(dvf_start_date, 'timestamp') : '';
                            let dvfEndDateTS = (dvf_end_date != '') ?  await this.commonDateService.DateTimeFormat(dvf_end_date, 'timestamp') : '';
                            let StartDateTS = await this.commonDateService.DateTimeFormat(start_common_date, 'timestamp');
                            let EndDateTS = await this.commonDateService.DateTimeFormat(end_common_date, 'timestamp');

                            let Dental = 'Dental Visit Packet';
                            if (formInstructionData['statusdvf'] == "Not complete") {
                                dentaldownload = formDownloadText;
                                dentaldownloadLink = '#';
                                dentaldownloadMessage = please_complete_authorization_form;
                            }else if(currentDateTimeStemp >= dvfStartDateTS && currentDateTimeStemp <= dvfEndDateTS){
                                if(hire_date == 1){
                                    dentaldownload = formDownloadText;
                                    dentaldownloadLink = `/health-checkup/form-instructions/get-one`;
                                    dentalLinkPara = { 'type' : 'Dentist', 'startdate': dvf_start_date, 'enddate': dvf_end_date };
                                }else{
                                    dentaldownload = formDownloadText;
                                    dentaldownloadLink = `/health-checkup/form-instructions/get-one`;
                                    dentalLinkPara = { 'type' : 'Dentist' };
                                }
                            } else if (currentDateTimeStemp >= StartDateTS && currentDateTimeStemp <= EndDateTS) {
                                dentaldownload = formDownloadText;
                                dentaldownloadLink = `/health-checkup/form-instructions/get-one`;
                                dentalLinkPara = { 'type' : 'Dentist' };
                            }else{
                                dentaldownload = formDownloadText;
                                dentaldownloadLink = '#';
                                dentaldownloadMessage = check_program_start_end_date;
                            }
                            dental_update = hipaaReleaseOnlineText;
                            dental_updateLink = `/health-checkup/authorizations/dental-use`;

                            activityButtonData = [
                                {
                                    'name': dental_update, 
                                    'link': dental_updateLink || '',
                                    'message' : '',
                                    'redirectType' : 1
                                },
                                {
                                    'name': dentaldownload, 
                                    'link': dentaldownloadLink  || '',
                                    'linkParameter': dentalLinkPara,
                                    'message' : dentaldownloadMessage,
                                    'redirectType' : 0
                                }
                            ];
                        }else if(activityName.includes('optometrist form') || activityName.includes('optometrist visit')){
                            let optometristdownload = '';
                            let optometristdownloadLink = '';
                            let optometristdownloadMessage = '';
                            let optometrist_update = '';
                            let optometrist_updateLink = '';
                            let optometristLinkPara = {};

                            optometristdownload = formDownloadText;
                            optometristdownloadLink = '#';
                            optometristdownloadMessage = please_complete_authorization_form;
                            optometrist_update = hipaaReleaseOnlineText;
                            optometrist_updateLink = `/health-checkup/authorizations/optometrist-use`;

                            let ovf_start_date = Expirationdateovf_start;
                            let ovf_end_date = Expirationdateovf;
                            let start_common_date = Expirationdate_start;
                            let end_common_date = Expirationdate;
                            let ovfStartDateTS = (ovf_start_date != '') ? await this.commonDateService.DateTimeFormat(ovf_start_date, 'timestamp') : '';
                            let ovfEndDateTS = (ovf_end_date != '') ?  await this.commonDateService.DateTimeFormat(ovf_end_date, 'timestamp') : '';
                            let StartDateTS = await this.commonDateService.DateTimeFormat(start_common_date, 'timestamp');
                            let EndDateTS = await this.commonDateService.DateTimeFormat(end_common_date, 'timestamp');

                            let Optometrist = 'Optometrist Visit Packet';
                            if (formInstructionData['statusovf'] == "Not complete") {
                                optometristdownload = formDownloadText;
                                optometristdownloadLink = '#';
                                optometristdownloadMessage = please_complete_authorization_form;
                            } else if (currentDateTimeStemp >= ovfStartDateTS && currentDateTimeStemp <= ovfEndDateTS) {
                                if (hire_date == 1) {
                                    optometristdownload = formDownloadText;
                                    optometristdownloadLink = `/health-checkup/form-instructions/get-one`;
                                    optometristLinkPara = { 'type' : 'Optometrist', 'startdate': ovf_start_date, 'enddate': ovf_end_date };
                                } else {
                                    optometristdownload = formDownloadText;
                                    optometristdownloadLink = `/health-checkup/form-instructions/get-one`;
                                    optometristLinkPara = { 'type' : 'Optometrist' };
                                }
                            } else if (currentDateTimeStemp >= StartDateTS && currentDateTimeStemp <= EndDateTS) {
                                optometristdownload = formDownloadText;
                                optometristdownloadLink = `/health-checkup/form-instructions/get-one`;
                                optometristLinkPara = { 'type' : 'Optometrist' };
                            } else {
                                optometristdownload = formDownloadText;
                                optometristdownloadLink = '#';
                                optometristdownloadMessage = check_program_start_end_date;
                            }
                            optometrist_update = hipaaReleaseOnlineText;
                            optometrist_updateLink = `/health-checkup/authorizations/optometrist-use`;

                            activityButtonData = [
                                {
                                    'name': optometrist_update,
                                    'link': optometrist_updateLink || '',
                                    'message': '',
                                    'redirectType': 1
                                },
                                {
                                    'name': optometristdownload,
                                    'link': optometristdownloadLink || '',
                                    'linkParameter': optometristLinkPara,
                                    'message': optometristdownloadMessage,
                                    'redirectType': 0
                                }
                            ];
                        } else if (activityName.includes('tobacco affidavit')) {
                            let tobaccoLinkPara = {};
                            let printLinkPara = {};
                            let tobaccodownload = DownloadText;
                            let tobaccodownloadLink = '#';
                            let tobaccodownloadMessage = check_program_start_end_date;
                            let tobacco_printauth = AuthorizationFormText;
                            let tobacco_printauthLink = `#`;
                            let tobacco_printauthMessage = check_program_start_end_date;
                            let tobacco_update = OnlineText;
                            let tobacco_updateLink = `/health-checkup/authorizations/tobacco-use`;
                            
                            let ta_start_date = Expirationdateta_start;
                            let ta_end_date = Expirationdateta;
                            let start_common_date = Expirationdate_start;
                            let end_common_date = Expirationdate;
                            let taStartDateTS = (ta_start_date != '') ? await this.commonDateService.DateTimeFormat(ta_start_date, 'timestamp') : '';
                            let taEndDateTS = (ta_end_date != '') ? await this.commonDateService.DateTimeFormat(ta_end_date, 'timestamp') : '';
                            let StartDateTS = await this.commonDateService.DateTimeFormat(start_common_date, 'timestamp');
                            let EndDateTS = await this.commonDateService.DateTimeFormat(end_common_date, 'timestamp');
                            
                            let Tobacco = 'Tobacco Visit Packet';
                            if (currentDateTimeStemp >= taStartDateTS && currentDateTimeStemp <= taEndDateTS) {
                                if (hire_date == 1) {
                                    tobaccodownload = formDownloadText;
                                    tobaccodownloadLink = `/health-checkup/form-instructions/get-one`;
                                    tobaccoLinkPara = { 'type' : 'Tobacco', 'startdate': ta_start_date, 'enddate': ta_end_date };
                                    tobacco_printauth = AuthorizationFormText;
                                    tobacco_printauthLink = `/health-checkup/form-instructions/get-one`;
                                    printLinkPara = { 'type' : 'Tobacco-auth', 'c': c, 'd': d, 'open': 'open' };
                                } else {
                                    tobaccodownload = formDownloadText;
                                    tobaccodownloadLink = `/health-checkup/form-instructions/get-one`;
                                    tobaccoLinkPara = { 'type' : 'Tobacco' };
                                    tobacco_printauth = AuthorizationFormText;
                                    tobacco_printauthLink = `/health-checkup/form-instructions/get-one`;
                                    printLinkPara = { 'type' : 'Tobacco-auth', 'c': c, 'd': d, 'open': 'open' };
                                }
                            } else if (currentDateTimeStemp >= StartDateTS && currentDateTimeStemp <= EndDateTS) {
                                tobaccodownload = formDownloadText;
                                tobaccodownloadLink = `/health-checkup/form-instructions/get-one`;
                                tobaccoLinkPara = { 'type' : 'Tobacco' };
                                tobacco_printauth = AuthorizationFormText;
                                tobacco_printauthLink = `/health-checkup/form-instructions/get-one`;
                                printLinkPara = { 'type' : 'Tobacco-auth', 'c': c, 'd': d, 'open': 'open' };
                            } else {
                                tobaccodownload = formDownloadText;
                                tobaccodownloadLink = '#';
                                tobaccodownloadMessage = check_program_start_end_date;
                                tobacco_printauth = AuthorizationFormText;
                                tobacco_printauthLink = `#`;
                                tobacco_printauthMessage = check_program_start_end_date;
                            }
                            tobacco_update = OnlineText;
                            tobacco_updateLink = `/health-checkup/authorizations/tobacco-use`;

                            if (tobacco_form_option == 1) {
                                activityButtonData = [
                                    { 
                                        'name': tobaccodownload, 
                                        'link': tobaccodownloadLink || '',
                                        'linkParameter': tobaccoLinkPara,
                                        'message' : tobaccodownloadMessage,
                                        'redirectType' : 0
                                    }
                                ];
                            } else if (tobacco_form_option == 2) {
                                activityButtonData = [
                                    { 
                                        'name': tobacco_update, 
                                        'link': tobacco_updateLink || '',
                                        'message' : '',
                                        'redirectType' : 1
                                    },
                                    {
                                        'name': tobaccodownload, 
                                        'link': tobaccodownloadLink || '',
                                        'linkParameter': tobaccoLinkPara,
                                        'message' : tobaccodownloadMessage,
                                        'redirectType' : 0
                                    }
                                ];
                            } else {
                                activityButtonData = [
                                    {
                                        'name': tobacco_update,
                                        'link': tobacco_updateLink || '',
                                        'message': '',
                                        'redirectType': 1
                                    }
                                ];
                            }
                        } else {
                            if (userADatas['opentype'] == 1 && userADatas['openinternal'] != 0) {
                                let path = await this.commonDateService.manageAllURL('g_internal_link', { 'inLinkId': userADatas['openinternal'] }, internalLinkData);
                                createdURL = '';
                                createdURL = path;
                            } else if (userADatas['opentype'] == 5) {
                                createdURL = '';
                                let path = await this.urlManageService.onmapUrl(userADatas['openexternal']);
                                createdURL = path;
                            } else {
                                 if (userADatas?.activity?.plugin != "" && userADatas?.activity?.plugin != null) {
                                    let plugin = userADatas?.activity?.plugin.toLowerCase();
                                    let controller = (userADatas?.activity?.controller != null) ? userADatas?.activity?.controller.toLowerCase() : '';
                                    let action = (userADatas?.activity?.action != null) ? userADatas?.activity?.action.toLowerCase() : '';
                                    let path = await this.commonDateService.manageAllURL('g_ac_plugin_link', {'pluginName' : plugin,'controllerName': controller, 'actionName': action, 'itemId': userADatas?.activity?.id }, activityLinkData);
                                    createdURL = path;
                                } else if (userADatas?.activity?.ext_link != "" && userADatas?.activity?.ext_link != null) {
                                    createdURL = userADatas?.activity?.ext_link;
                                }else if (userADatas?.category?.plugin != "" && userADatas?.category?.plugin != null) {
                                    let plugin = userADatas?.category?.plugin.toLowerCase();
                                    let controller = (userADatas?.category?.controller != null) ? userADatas?.category?.controller.toLowerCase() : '';
                                    let action = (userADatas?.category?.action != null) ? userADatas?.category?.action.toLowerCase() : '';
                                    let path = await this.commonDateService.manageAllURL('g_ac_plugin_link', {'pluginName' : plugin,'controllerName' : controller,'actionName' : action , 'itemId' : userADatas?.category?.id},categoryLinkData);
                                    createdURL = path;
                                } else {
                                    if(userADatas['opentype'] != 4){
                                        createdURL = 'activities';
                                    }
                                }
                            }
                            if (actId == 1 && orgId == 922) {
                                buttonnamefororg = 'Take HRA';
                            }
                            if(createdURL != '' && createdURL != null){
                                activityButtonData = [
                                    { 
                                        'name': buttonnamefororg, 
                                        'link': createdURL || '',
                                        'message' : '',
                                        'redirectType' : 1
                                    }
                                ];
                            }
                        }
                    }
                }
            }else{
                viewOn = 'popup';
            }
            return [{ 'path': (createdURL != '' && createdURL != null) ? createdURL : '', 'viewOn': viewOn, 'buttonData': activityButtonData }];
        }catch (error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang,error.message));
        }
    }
    async points_for_activities(call_from:any = null, activity:any = [], otherDatas:any = []){
        try{
            let {
	    	category = [],
	        user_id = null,
	        activePlugins = [],
	        hireDate = null,
	        hireDateSetting = null,
	        company_id = null,
	        timezone = null,
	        r_by_data = null,
	        rewardId = null,
	        campaignId = null,
	        dateCalType = 'activity',
	        HealthyHabittotalPoint = [],
	        hireDateCount = 0
	    } = Object.assign({}, ...otherDatas);
            let requiredActivities = 0;
            let upcomingDeadlines = 0;
            let tempDentists = 0;
            let remainPoint = 0;
            let totalPoint = 0;
            let actPoints = 0;
            let act_id_20_string = await this.getSpecificCatActivityIds(20);
            let defaultTimezone = 'UTC';
            let userTimezone = 'UTC';
            let TimeZonecc = 'UTC';
            if(timezone != '' && timezone != null){
                userTimezone = timezone;
                TimeZonecc = timezone;
            }
            let usrCurrentTime = await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD');
            usrCurrentTime = await this.commonDateService.DateTimeFormat(usrCurrentTime,'timestamp');
            let requiredUActivitys = [];
            let withoutTimezoneActivitys = appConstant.CAMPAIGN_CHECK_ACTIVITIES.CUSTOM_WITHOUT_TIMEZONE_CHECK_IDS;
            let getAgeActivitys = await this.ageActivityService.getAgeActivityIds({ status: 1 });
            let TrBiometricsactivityarray:any = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_HC_BIOMETRICS_IDS;
            if(getAgeActivitys.length > 0){
                TrBiometricsactivityarray = [...TrBiometricsactivityarray, ...getAgeActivitys];
            }
            let k = 0;
            for (let actData of activity) {
                let otherDatas = { 'activity': actData, 'category': category, 'activePlugins': activePlugins, 'hireDate': hireDate, 'hireDateSetting' : hireDateSetting,'hireDateCount' : hireDateCount, 'company_id': company_id, 'userTimezone': userTimezone, 'defaultTimezone': defaultTimezone};
                let isQuizTimeZone = false;
                let allDateCalculate = await this.frontCalculationService.timeZoneDateCalculate(actData, otherDatas);
                allDateCalculate = JSON.parse(JSON.stringify(allDateCalculate));
                actData = allDateCalculate[0];
                let points:number = 0;
                let allDateArray = allDateCalculate[1];
                let originalActStartDate = allDateArray['originalActStartDate'];
                let originalActPointDeallineDate = allDateArray['originalActPointDeallineDate'];
                let BioactFactStartDate = allDateArray['BioactFactStartDate'];
                let BioactPointEndDate = allDateArray['BioactPointEndDate'];
                let actEndDate = allDateArray['actEndDate'];
                let onlyDisplayStartDate = allDateArray['onlyDisplayStartDate'];
                let BPointEndDateCondition = '';
                let PointEndDateCondition = '';
                let PointactEndDateCondition = '';
                if (BioactPointEndDate != '') {
                    BPointEndDateCondition = ` AND DATE_FORMAT(\`inserted\`,'%Y-%m-%d %H:%i:%s') BETWEEN '${BioactFactStartDate}' AND '${BioactPointEndDate}'`;
                    PointEndDateCondition = ` AND DATE_FORMAT(\`inserted\`,'%Y-%m-%d %H:%i:%s') BETWEEN '${originalActStartDate}' AND '${originalActPointDeallineDate}'`;
                    PointactEndDateCondition = ` AND DATE_FORMAT(\`inserted\`,'%Y-%m-%d %H:%i:%s') BETWEEN '${originalActStartDate}' AND '${originalActPointDeallineDate}'`;
                }
                if(actEndDate > usrCurrentTime){
                    upcomingDeadlines++;
                }
                if(actData[`${r_by_data}`] == 'Y'){
                    requiredActivities++;
                }
                let cat_index = -1;
                for (let d = 0; d < category.length; d++) {
                    if (actData?.['category'] && category?.[d]?.['category'] && actData?.['category']['id'] == category[d]['category']['id']) {
                        if (cat_index == -1) {
                            cat_index = d;
                        }
                    }
                }
                if (actData['category_visibility'] == 0) {
                    cat_index = -1;
                }
                let camActId = actData['id'];
                let actId = actData?.['activity']?.['id'] || 0;
                let actCatId = actData?.['activity']?.['category_id'] || 0;
                let max_point = actData['max_point'];
                let activityCompAry:any = {};
                let rewardCompAry:any = {};
                let CustomactivityCompAry:any = {};
                let CustomrewardCompAry:any = {};
                let date = '';
                /* CUSTOM POINT CALCULATION */
                    let allCustomPointDatas = await this.frontPointService.getCustomPoints(`ent.activity_id = ${camActId} AND ent.user_id IN (${user_id}) AND ent.status = 1`, {id: 'ASC'}, ['ent.id as id', 'ent.user_id as uid', 'ent.point as total',`ent.date as time`, `ent.updated_date as time1`, `ent.created_date as time2`]);
                    let csdate = '';
                    if (actId != 49 || (company_id != 533 || allCustomPointDatas?.length >= 2)) {
                        let customOtherDatas = { 'points': points, 'csdate': csdate, 'max_point': max_point, 'call_from' : call_from };
                        const CustomPointCalculation = await this.frontPointService.CustomPointCalculation(allCustomPointDatas, 'single', customOtherDatas);
                        if(CustomPointCalculation[user_id]){
                            CustomactivityCompAry = CustomPointCalculation[user_id]['activityCompAry'];
                            CustomrewardCompAry = CustomPointCalculation[user_id]['rewardCompAry'];
                            points = CustomPointCalculation[user_id]['points'];
                            csdate = CustomPointCalculation[user_id]['csdate'];
                        }
                    }
                /* CUSTOM POINT CALCULATION */
                let CommonOtherData = [ { 'user_id': user_id, 'actDatas': actData, 'allDateArray': allDateArray, 'userTimezone': userTimezone, 'company_id': company_id} ];
                let finalsource = 0;
                /* Healthcheckup Code */
                    if(activePlugins.includes('Healthcheckup')){
                        /* hc_biometrics */
                            if (TrBiometricsactivityarray.includes(actId)) {
                                let HCBOtherData:any = [{ 'PointEndDateCondition' : PointEndDateCondition, 'BPointEndDateCondition' : BPointEndDateCondition, 'act_id_20_string' : act_id_20_string}];
                                HCBOtherData = CommonOtherData.map((item, index) => ({
                                    ...item,
                                    ...(HCBOtherData[index] || {})
                                }));
                                const hcBiomatricData = await this.frontHealthcheckupService.getHCBiomatric('main', actId, HCBOtherData);
                                let tmppoints = hcBiomatricData[0]['tmppoints'];
                                points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints ;
                                if (tmppoints > 0) {
                                    date = hcBiomatricData[1]['date'];
                                    finalsource = hcBiomatricData[4]['finalsource'];
                                    activityCompAry = hcBiomatricData[2]['activityCompAry'];
                                    rewardCompAry = hcBiomatricData[3]['rewardCompAry'];
                                }
                            }
                        /* hc_biometrics */
                        /* hc_dentists */
                            const HCdentistsactivityarray = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_HC_DENTISTS_IDS;
                            if (HCdentistsactivityarray.includes(actId)) {
                                let DecOtherData:any = [ { 'PointEndDateCondition': PointEndDateCondition, 'tempDentists' : tempDentists} ];
                                DecOtherData = CommonOtherData.map((item, index) => ({
                                    ...item,
                                    ...(DecOtherData[index] || {})
                                }));
                                const hcDentistData = await this.frontHealthcheckupService.getHCDentist('main', actId, DecOtherData);
                                let tmppoints = hcDentistData[0]['tmppoints'];
                                points += (typeof hcDentistData[4]['points'] == 'string') ? parseFloat(hcDentistData[4]['points']) : hcDentistData[4]['points'] ;
                                if (tmppoints > 0) {
                                    date = hcDentistData[1]['date'];
                                    activityCompAry = hcDentistData[2]['activityCompAry'];
                                    rewardCompAry = hcDentistData[3]['rewardCompAry'];
                                    tempDentists = hcDentistData[5]['tempDentists'];
                                }
                            }
                        /* hc_dentists */
                        /* hc_optometrists */
                            const HCoptometristsactivityarray = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_HC_OPTOMETRISTS_IDS;
                            if (HCoptometristsactivityarray.includes(actId)) {
                                let OptOtherData:any = [ { 'PointEndDateCondition': PointEndDateCondition} ];
                                OptOtherData = CommonOtherData.map((item, index) => ({
                                    ...item,
                                    ...(OptOtherData[index] || {})
                                }));
                                const hcOptometristData = await this.frontHealthcheckupService.getHCOptometrist('main', actId, OptOtherData);
                                let tmppoints = hcOptometristData[0]['tmppoints'];
                                points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                                if (tmppoints > 0) {
                                    date = hcOptometristData[1]['date'];
                                    activityCompAry = hcOptometristData[2]['activityCompAry'];
                                    rewardCompAry = hcOptometristData[3]['rewardCompAry'];
                                }
                            }
                        /* hc_optometrists */
                        /* hc_tabaccouses */
                            const HCtabaccousesactivityarray = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_HC_TOBACCO_USES_IDS;
                            if (HCtabaccousesactivityarray.includes(actId)) {
                                let actIdD = actId;
                                if (actData?.['activity'] && actData?.['activity']?.['id'] == '4') {
                                    actIdD = '12,13,14';
                                }
                                let TocOtherData:any = [ { 'PointEndDateCondition': PointEndDateCondition} ];
                                TocOtherData = CommonOtherData.map((item, index) => ({
                                    ...item,
                                    ...(TocOtherData[index] || {})
                                }));
                                const hcTabaccoUsesData = await this.frontHealthcheckupService.getHCTabaccoUses('main', actIdD, TocOtherData);
                                let tmppoints = hcTabaccoUsesData[0]['tmppoints'];
                                points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                                if (tmppoints > 0) {
                                    date = hcTabaccoUsesData[1]['date'];
                                    activityCompAry = hcTabaccoUsesData[2]['activityCompAry'];
                                    rewardCompAry = hcTabaccoUsesData[3]['rewardCompAry'];
                                }
                            }
                        /* hc_tabaccouses */
                    }
                /* Healthcheckup Code */
                /* HRA Code */
                    if(activePlugins.includes('Hra')){
                        /* ha_assessments */
                            const HAassessmentsactivityarray = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_HA_ASSESSMENTS_IDS;
                            if (HAassessmentsactivityarray.includes(actId)) {
                                const haAssessmentData = await this.frontHealthcheckupService.getHAAssessment('main', actId, CommonOtherData);
                                let tmppoints = haAssessmentData[0]['tmppoints'];
                                points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                                if (tmppoints > 0) {
                                    date = haAssessmentData[1]['date'];
                                    activityCompAry = haAssessmentData[2]['activityCompAry'];
                                    rewardCompAry = haAssessmentData[3]['rewardCompAry'];
                                }
                            }
                        /* ha_assessments */
                        /* ha_emotional_assessments */
                            const HaEAassessmentsactivityarray = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_HA_EMOTIONAL_ASSESSMENTS_IDS;
                            if (HaEAassessmentsactivityarray.includes(actId)) {
                                const haEAssessmentData = await this.frontHealthcheckupService.getHAEAssessment('main', actId, CommonOtherData );
                                let tmppoints = haEAssessmentData[0]['tmppoints'];
                                points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                                if (tmppoints > 0) {
                                    date = haEAssessmentData[1]['date'];
                                    activityCompAry = haEAssessmentData[2]['activityCompAry'];
                                    rewardCompAry = haEAssessmentData[3]['rewardCompAry'];
                                }
                            }
                        /* ha_emotional_assessments */
                        /* ha_hrabiometrics */
                            const HAHRABiometricactivityarray = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_HA_HRA_BIOMETRICS_IDS;
                            if (HAHRABiometricactivityarray.includes(actId)) {
                                const haHRABiometricData = await this.frontHealthcheckupService.getHAHRABiometric('main', actId, CommonOtherData);
                                let tmppoints = haHRABiometricData[0]['tmppoints'];
                                points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                                if (tmppoints > 0) {
                                    date = haHRABiometricData[1]['date'];
                                    activityCompAry = haHRABiometricData[2]['activityCompAry'];
                                    rewardCompAry = haHRABiometricData[3]['rewardCompAry'];
                                }
                            }   
                        /* ha_hrabiometrics */
                    }
                /* HRA Code */
                /* Activity tracker */
                    if(activePlugins.includes('Activitytracker')){
                        const activityTrackersData = await this.frontTrackerEventMediaService.getActivityTracter('main', actId, CommonOtherData);
                        let tmppoints = activityTrackersData[0]['tmppoints'];
                        points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                        if (tmppoints > 0) {
                            date = activityTrackersData[1]['date'];
                            activityCompAry = activityTrackersData[2]['activityCompAry'];
                            rewardCompAry = activityTrackersData[3]['rewardCompAry'];
                        }
                    }
                /* Activity tracker */
                /* Reimbursements */
                    if(activePlugins.includes('Reimbursements')){
                        const ReimbursementsData = await this.frontTrackerEventMediaService.getReimbursements('main', actId, CommonOtherData);
                        let tmppoints = ReimbursementsData[0]['tmppoints'];
                        points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                        if (tmppoints > 0) {
                            date = ReimbursementsData[1]['date'];
                            activityCompAry = ReimbursementsData[2]['activityCompAry'];
                            rewardCompAry = ReimbursementsData[3]['rewardCompAry'];
                        }
                    }
                /* Reimbursements */
                /* My Plans */
                    if(activePlugins.includes('Myplan')){
                        /* mp_join_user_plan */
                            const myPlanJoinUserActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_MP_JOIN_USER_PLAN_IDS;
                            if(myPlanJoinUserActivityIds.includes(actCatId)){
                                const myPlanJoinUserActivityData = await this.frontTrackerEventMediaService.getJoinUserPlans('main', actId, CommonOtherData);
                                let tmppoints = myPlanJoinUserActivityData[0]['tmppoints'];
                                points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                                if (tmppoints > 0) {
                                    date = myPlanJoinUserActivityData[1]['date'];
                                    activityCompAry = myPlanJoinUserActivityData[2]['activityCompAry'];
                                    rewardCompAry = myPlanJoinUserActivityData[3]['rewardCompAry'];
                                }
                            }
                        /* mp_join_user_plan */
                        /* mp_join_user_plan */
                            const myPlanCompleteBlockActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_MP_COMPLETE_BLOCK_IDS;
                            if(myPlanCompleteBlockActivityIds.includes(actCatId)){
                                const myPlanCompleteBlockActivityData = await this.frontTrackerEventMediaService.getMPComplateBlock('main', actId, CommonOtherData);
                                let tmppoints = myPlanCompleteBlockActivityData[0]['tmppoints'];
                                points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                                if (tmppoints > 0) {
                                    date = myPlanCompleteBlockActivityData[1]['date'];
                                    activityCompAry = myPlanCompleteBlockActivityData[2]['activityCompAry'];
                                    rewardCompAry = myPlanCompleteBlockActivityData[3]['rewardCompAry'];
                                }
                            }
                        /* mp_join_user_plan */
                        /* mp_join_user_plan */
                            const myPlanCompleteActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_MP_COMPLETE_ACTIVITY_IDS;
                            if(myPlanCompleteActivityIds.includes(actCatId)){
                                const myPlanCompleteActivityData = await this.frontTrackerEventMediaService.getMPComplateActivity('main', actId, CommonOtherData );
                                let tmppoints = myPlanCompleteActivityData[0]['tmppoints'];
                                points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                                if (tmppoints > 0) {
                                    date = myPlanCompleteActivityData[1]['date'];
                                    activityCompAry = myPlanCompleteActivityData[2]['activityCompAry'];
                                    rewardCompAry = myPlanCompleteActivityData[3]['rewardCompAry'];
                                }
                            }
                        /* mp_join_user_plan */
                    }
                /* My Plans */
                /* User Login */
                    const userLoginActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_S_USER_LOGIN_IDS;
                    if(userLoginActivityIds.includes(actId)){
                        const userLoginActivityData = await this.frontTrackerEventMediaService.getUserLogin('main', actId, CommonOtherData );
                        let tmppoints = userLoginActivityData[0]['tmppoints'];
                        points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                        if (tmppoints > 0) {
                            date = userLoginActivityData[1]['date'];
                            activityCompAry = userLoginActivityData[2]['activityCompAry'];
                            rewardCompAry = userLoginActivityData[3]['rewardCompAry'];
                        }
                    }
                /* User Login */
                /* App Download */
                    const appDownloadActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_S_USER_LOGIN_APP_DOWNLOAD_IDS;
                    if(appDownloadActivityIds.includes(actId)){
                        const appDownloadActivityData = await this.frontTrackerEventMediaService.getAppDownload('main', actId, CommonOtherData );
                        let tmppoints = appDownloadActivityData[0]['tmppoints'];
                        points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                        if (tmppoints > 0) {
                            date = appDownloadActivityData[1]['date'];
                            activityCompAry = appDownloadActivityData[2]['activityCompAry'];
                            rewardCompAry = appDownloadActivityData[3]['rewardCompAry'];
                        }
                    }
                /* App Download */
                /* Fitness Biometric */
                    const ftBiometricActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_FT_BIOMETRICS_IDS;
                    if(ftBiometricActivityIds.includes(actId)){
                        const ftBiometricActivityData = await this.frontHealthcheckupService.getFtBiomatrics('main', actId, CommonOtherData );
                        let tmppoints = ftBiometricActivityData[0]['tmppoints'];
                        points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                        if (tmppoints > 0) {
                            date = ftBiometricActivityData[1]['date'];
                            activityCompAry = ftBiometricActivityData[2]['activityCompAry'];
                            rewardCompAry = ftBiometricActivityData[3]['rewardCompAry'];
                        }
                    }
                /* Fitness Biometric */
                /* COVID */
                    const covidActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_COVID_USER_ANSWERS_IDS;
                    if(covidActivityIds.includes(actId)){
                        const covidActivityData = await this.frontTrackerEventMediaService.getCovidActivity('main', actId, CommonOtherData );
                        let tmppoints = covidActivityData[0]['tmppoints'];
                        points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                        if (tmppoints > 0) {
                            date = covidActivityData[1]['date'];
                            activityCompAry = covidActivityData[2]['activityCompAry'];
                            rewardCompAry = covidActivityData[3]['rewardCompAry'];
                        }
                    }
                /* COVID  */
                /* Fitnes Video */
                    const fitnessVideoActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_ME_FOD_VIDEO_CLICK_IDS;
                    if(activePlugins.includes('Media') && fitnessVideoActivityIds.includes(actCatId)){
                        const fitnessVideoActivityData = await this.frontTrackerEventMediaService.getFitnessVideo('main', actId, CommonOtherData );
                        let tmppoints = fitnessVideoActivityData[0]['tmppoints'];
                        points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                        if (tmppoints > 0) {
                            date = fitnessVideoActivityData[1]['date'];
                            activityCompAry = fitnessVideoActivityData[2]['activityCompAry'];
                            rewardCompAry = fitnessVideoActivityData[3]['rewardCompAry'];
                        }
                    }
                /* Fitnes Video */
                /* Emotional wellbeing */
                    const emotionalWellbeingActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_EM_POST_CLICK_IDS;
                    if(activePlugins.includes('Emotionalwellbeing') && emotionalWellbeingActivityIds.includes(actCatId)){
                        const emotionalWellbeingActivityData = await this.frontTrackerEventMediaService.getEmotionalwellbeing('main', actId, CommonOtherData );
                        let tmppoints = emotionalWellbeingActivityData[0]['tmppoints'];
                        points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                        if (tmppoints > 0) {
                            date = emotionalWellbeingActivityData[1]['date'];
                            activityCompAry = emotionalWellbeingActivityData[2]['activityCompAry'];
                            rewardCompAry = emotionalWellbeingActivityData[3]['rewardCompAry'];
                        }
                    }
                /* Emotional wellbeing */
                /* Quicklink */
                    const quicklinkActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_U_QUICK_LINK_CLICK_IDS;
                    if(activePlugins.includes('Quicklink') && quicklinkActivityIds.includes(actCatId)){
                        const quicklinkActivityData = await this.frontTrackerEventMediaService.getQuickLink('main', actId, CommonOtherData );
                        let tmppoints = quicklinkActivityData[0]['tmppoints'];
                        points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                        if (tmppoints > 0) {
                            date = quicklinkActivityData[1]['date'];
                            activityCompAry = quicklinkActivityData[2]['activityCompAry'];
                            rewardCompAry = quicklinkActivityData[3]['rewardCompAry'];
                        }
                    }
                /* Quicklink */
                /* Event Complete */
                    const eventsActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_EV_EVENT_COMPLETE_IDS;
                    if(activePlugins.includes('Events') && eventsActivityIds.includes(actCatId)){
                        const eventsActivityData = await this.frontTrackerEventMediaService.getEvent('main', actId, CommonOtherData );
                        let tmppoints = eventsActivityData[0]['tmppoints'];
                        points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                        if (tmppoints > 0) {
                            date = eventsActivityData[1]['date'];
                            activityCompAry = eventsActivityData[2]['activityCompAry'];
                            rewardCompAry = eventsActivityData[3]['rewardCompAry'];
                        }
                    }
                /* Event Complete */
                /* Quiz complete */
                    const quizActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_QZ_QUIZ_COMPLETE_IDS;
                    if(activePlugins.includes('Quiz') && quizActivityIds.includes(actCatId)){
                        const quizActivityData = await this.frontTrackerEventMediaService.getQuizUser('main', actId, CommonOtherData );
                        let tmppoints = quizActivityData[0]['tmppoints'];
                        points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                        if (tmppoints > 0) {
                            date = quizActivityData[1]['date'];
                            isQuizTimeZone = quizActivityData[4]['isQuizTimeZone'];
                            activityCompAry = quizActivityData[2]['activityCompAry'];
                            rewardCompAry = quizActivityData[3]['rewardCompAry'];
                        }
                    }
                /* Quiz complete */
                /* Trackers */
                    if(activePlugins.includes('Trackers')){
                        /* ft_activity_feeds */
                            const ftFeedsActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_FT_ACTIVITY_FEEDS_IDS;
                            if(ftFeedsActivityIds.includes(actId)){
                                const ftFeedsActivityData = await this.frontTrackerEventMediaService.getFTActivityFeeds('main', actId, CommonOtherData );
                                let tmppoints = ftFeedsActivityData[0]['tmppoints'];
                                points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                                if (tmppoints > 0) {
                                    date = ftFeedsActivityData[1]['date'];
                                    activityCompAry = ftFeedsActivityData[2]['activityCompAry'];
                                    rewardCompAry = ftFeedsActivityData[3]['rewardCompAry'];
                                }
                            }
                        /* ft_activity_feeds */
                        /* ft_foods_feeds */
                            const ftFoodsActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_FT_FOOD_FEEDS_IDS;
                            if(ftFoodsActivityIds.includes(actId)){
                                const ftFoodsActivityData = await this.frontTrackerEventMediaService.getFTFoodFeeds('main', actId, CommonOtherData );
                                let tmppoints = ftFoodsActivityData[0]['tmppoints'];
                                points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                                if (tmppoints > 0) {
                                    date = ftFoodsActivityData[1]['date'];
                                    activityCompAry = ftFoodsActivityData[2]['activityCompAry'];
                                    rewardCompAry = ftFoodsActivityData[3]['rewardCompAry'];
                                }
                            }
                        /* ft_foods_feeds */
                    }
                /* Trackers */
                if (call_from != 3) {
                    if (max_point < points) {
                        points = max_point;
                    }
                    actData['Point'] = (typeof points == 'string') ? parseFloat(points) : points;
                }
                let altActivity = Object.create(null);
                if (actData['alt_activity'] != '0' && actData['alt_activity'] != '') {
                    altActivity = await this.activityService.findOne({ id: actData['alt_activity'] }); 
                    if (altActivity) {
                        let points = 0;
                        let altActId = altActivity['id'];
                        let altCatId = altActivity['category_id'];
                        let altActPoint = actData['alt_act_point'];
                        let AltCommonOtherData:any = [{ 'altActPoint' : altActPoint}];
                        AltCommonOtherData = CommonOtherData.map((item, index) => ({
                            ...item,
                            ...(AltCommonOtherData[index] || {})
                        }));
                        /* Healthcheckup Code */
                            if(activePlugins.includes('Healthcheckup')){
                                /* hc_biometrics */
                                    if (TrBiometricsactivityarray.includes(altActId)) {
                                        let HCBOtherData:any = [{ 'PointEndDateCondition' : PointEndDateCondition, 'act_id_20_string' : act_id_20_string}];
                                        HCBOtherData = AltCommonOtherData.map((item, index) => ({
                                            ...item,
                                            ...(HCBOtherData[index] || {})
                                        }));
                                        const hcBiomatricData = await this.frontHealthcheckupService.getHCBiomatric('alt', altActId, HCBOtherData);
                                        let tmppoints = hcBiomatricData[0]['tmppoints'];
                                        points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                                    }
                                /* hc_biometrics */
                                /* hc_dentists */
                                    const HCdentistsactivityarray = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_HC_DENTISTS_IDS;
                                    if (HCdentistsactivityarray.includes(altActId)) {
                                        let DecOtherData:any = [{ 'PointEndDateCondition' : PointEndDateCondition, 'tempDentists' : tempDentists}];
                                        DecOtherData = AltCommonOtherData.map((item, index) => ({
                                            ...item,
                                            ...(DecOtherData[index] || {})
                                        }));
                                        const hcDentistData = await this.frontHealthcheckupService.getHCDentist('alt', altActId, DecOtherData);
                                        let tmppoints = hcDentistData[0]['tmppoints'];
                                        points += (typeof hcDentistData[4]['points'] == 'string') ? parseFloat(hcDentistData[4]['points']) : hcDentistData[4]['points'];
                                    }
                                /* hc_dentists */
                                /* hc_optometrists */
                                    const HCoptometristsactivityarray = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_HC_OPTOMETRISTS_IDS;
                                    if (HCoptometristsactivityarray.includes(altActId)) {
                                        let OptOtherData:any = [{ 'PointEndDateCondition' : PointEndDateCondition}];
                                        OptOtherData = AltCommonOtherData.map((item, index) => ({
                                            ...item,
                                            ...(OptOtherData[index] || {})
                                        }));
                                        const hcOptometristData = await this.frontHealthcheckupService.getHCOptometrist('alt', altActId, OptOtherData);
                                        let tmppoints = hcOptometristData[0]['tmppoints'];
                                        points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                                    }
                                /* hc_optometrists */
                                /* hc_tabaccouses */
                                    const HCtabaccousesactivityarray = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_HC_TOBACCO_USES_IDS;
                                    if (HCtabaccousesactivityarray.includes(altActId)) {
                                        let actIdD = actId;
                                        if (actData?.['activity'] && actData?.['activity']?.['id'] == '4') {
                                            actIdD = '12,13,14';
                                        }
                                        let TabOtherData:any = [{ 'PointEndDateCondition' : PointEndDateCondition}];
                                        TabOtherData = AltCommonOtherData.map((item, index) => ({
                                            ...item,
                                            ...(TabOtherData[index] || {})
                                        }));
                                        const hcTabaccoUsesData = await this.frontHealthcheckupService.getHCTabaccoUses('alt', altActId, TabOtherData );
                                        let tmppoints = hcTabaccoUsesData[0]['tmppoints'];
                                        points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                                    }
                                /* hc_tabaccouses */
                            }
                        /* Healthcheckup Code */
                        /* HRA Code */
                            if(activePlugins.includes('Hra')){
                                /* ha_assessments */
                                    const HAassessmentsactivityarray = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_HA_ASSESSMENTS_IDS;
                                    if (HAassessmentsactivityarray.includes(altActId)) {
                                        const haAssessmentData = await this.frontHealthcheckupService.getHAAssessment('alt', altActId, AltCommonOtherData );
                                        let tmppoints = haAssessmentData[0]['tmppoints'];
                                        points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                                    }
                                /* ha_assessments */
                                /* ha_emotional_assessments */
                                    const HaEAassessmentsactivityarray = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_HA_EMOTIONAL_ASSESSMENTS_IDS;
                                    if (HaEAassessmentsactivityarray.includes(altActId)) {
                                        const haEAssessmentData = await this.frontHealthcheckupService.getHAEAssessment('alt', altActId, AltCommonOtherData );
                                        let tmppoints = haEAssessmentData[0]['tmppoints'];
                                        points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                                    }
                                /* ha_emotional_assessments */
                                /* ha_hrabiometrics */
                                    const HAHRABiometricactivityarray = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_HA_HRA_BIOMETRICS_IDS;
                                    if (HAHRABiometricactivityarray.includes(altActId)) {
                                        const haHRABiometricData = await this.frontHealthcheckupService.getHAHRABiometric('alt', altActId, AltCommonOtherData );
                                        let tmppoints = haHRABiometricData[0]['tmppoints'];
                                        points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                                    }   
                                /* ha_hrabiometrics */
                            }
                        /* HRA Code */
                        /* Exercise */
                            const exerciseActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_EC_COMPLETE_PLANS_IDS;
                            if(activePlugins.includes('Exercise') && exerciseActivityIds.includes(altActId)){
                            }
                        /* Exercise */
                        /* Event Complete */
                            const eventsActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_EV_EVENT_COMPLETE_IDS;
                            if(activePlugins.includes('Events') && eventsActivityIds.includes(altCatId)){
                                const eventsActivityData = await this.frontTrackerEventMediaService.getEvent('alt', altActId, AltCommonOtherData );
                                let tmppoints = eventsActivityData[0]['tmppoints'];
                                points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                            }
                        /* Event Complete */
                        /* Quiz complete */
                            const quizActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_QZ_QUIZ_COMPLETE_IDS;
                            if(activePlugins.includes('Quiz') && quizActivityIds.includes(altCatId)){
                                const quizActivityData = await this.frontTrackerEventMediaService.getQuizUser('alt', altActId, AltCommonOtherData );
                                let tmppoints = quizActivityData[0]['tmppoints'];
                                points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                            }
                        /* Quiz complete */
                        /* Trackers */
                            if(activePlugins.includes('Trackers')){
                                /* ft_activity_feeds */
                                    const ftFeedsActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_FT_ACTIVITY_FEEDS_IDS;
                                    if(ftFeedsActivityIds.includes(altActId)){
                                        const ftFeedsActivityData = await this.frontTrackerEventMediaService.getFTActivityFeeds('alt', altActId, AltCommonOtherData );
                                        let tmppoints = ftFeedsActivityData[0]['tmppoints'];
                                        points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                                    }
                                /* ft_activity_feeds */
                                /* ft_foods_feeds */
                                    const ftFoodsActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_FT_FOOD_FEEDS_IDS;
                                    if(ftFoodsActivityIds.includes(altActId)){
                                        const ftFoodsActivityData = await this.frontTrackerEventMediaService.getFTFoodFeeds('alt', altActId, AltCommonOtherData );
                                        let tmppoints = ftFoodsActivityData[0]['tmppoints'];
                                        points += (typeof tmppoints == 'string') ? parseFloat(tmppoints) : tmppoints;
                                    }
                                /* ft_foods_feeds */
                            }
                        /* Trackers */
                        actData['altActivity'] = altActivity;
                        actData['altActivity']['Point'] = points;
                    }
                }
                if (call_from == 3) {
                    if (max_point < points) {
                        points = max_point;
                    }
                }
                if (call_from == 3) {
                    if (date != '' && points > 0) {
                        if (HealthyHabittotalPoint[moment(date).format('YYYY-MM-DD')]){
                            HealthyHabittotalPoint[moment(date).format('YYYY-MM-DD')] += points;
                        } else {
                            HealthyHabittotalPoint[moment(date).format('YYYY-MM-DD')] = points;
                        }
                    }
                } else {
                    if (date != '' && points > 0) {
                        if(!HealthyHabittotalPoint[campaignId]){
                            HealthyHabittotalPoint[campaignId] = []
                        }
                        if(!HealthyHabittotalPoint[campaignId][rewardId]){
                            HealthyHabittotalPoint[campaignId][rewardId] = {};
                        }
                        if (HealthyHabittotalPoint[campaignId][rewardId][moment(date).format('YYYY-MM-DD')]) {
                            HealthyHabittotalPoint[campaignId][rewardId][moment(date).format('YYYY-MM-DD')] += points;
                        } else {
                            HealthyHabittotalPoint[campaignId][rewardId][moment(date).format('YYYY-MM-DD')] = points;
                        }
                    }
                }
                totalPoint += (typeof points === 'string') ? parseFloat(points) : points;
                if (call_from == 3) {
                    actData['Point'] = (typeof points == 'string') ? parseFloat(points) : points;;
                }
                actData['date'] = date;
                if (call_from == 1 || call_from == 2 || call_from == 9) {
                    const activityTotal = Object.values(activityCompAry).reduce((sum:any, value:any) => sum + value, 0);
                    if (CustomactivityCompAry && Object.keys(CustomactivityCompAry)?.length > 0 && (activityTotal <= max_point || activityTotal !== max_point)) {
                        for (let [key, value] of Object.entries(CustomactivityCompAry)) {
                            value = (typeof value === 'string') ? parseFloat(value) : value;
                            const activityTotals = Object.values(activityCompAry).reduce((sum:any, value:any) => sum + value, 0);
                            if(activityTotals != max_point){
                                let newValue = (activityTotals as number) + (value as number);
                                if(newValue > max_point){
                                    if(activityCompAry[key]){
                                        activityCompAry[key] += (max_point - (activityTotals as number));
                                    }else{
                                        activityCompAry[key] = (max_point - (activityTotals as number));
                                    }
                                }else{
                                    if(activityCompAry[key]){
                                        activityCompAry[key] += value;
                                    }else{
                                        activityCompAry[key] = value;
                                    }
                                }
                            }
                        }
                    }
                }
                actData['activityCompAry'] = activityCompAry;
                if (call_from == 1 || call_from == 2 || call_from == 9) {
                    const rewardTotal = Object.values(rewardCompAry).reduce((sum:any, value:any) => sum + value, 0);
                    if (CustomrewardCompAry && Object.keys(CustomrewardCompAry)?.length > 0 && (rewardTotal <= max_point || rewardTotal !== max_point)) {
                        for (let [key, value] of Object.entries(CustomrewardCompAry)) {
                            value = (typeof value === 'string') ? parseFloat(value) : value;
                            const rewardTotals = Object.values(rewardCompAry).reduce((sum:any, value:any) => sum + value, 0);
                            if(rewardTotals != max_point){
                                let newValue = (rewardTotals as number) + (value as number);
                                if(newValue > max_point){
                                    if(rewardCompAry[key]){
                                        rewardCompAry[key] += (max_point - (rewardTotals as number));
                                    }else{
                                        rewardCompAry[key] = (max_point - (rewardTotals as number));
                                    }
                                }else{
                                    if(rewardCompAry[key]){
                                        rewardCompAry[key] += value;
                                    }else{
                                        rewardCompAry[key] = value;
                                    }
                                }
                            }
                        }
                    }
                }
                actData['rewardCompAry'] = rewardCompAry;
                if (isQuizTimeZone == false) {
                    if (![2, 3, 11, 12].includes(finalsource) && !withoutTimezoneActivitys.includes(actId) && timezone != '' && date != '') {
                        let tmpdata:any = await this.commonDateService.DateTimeFormat(date,'','',defaultTimezone);
                        tmpdata = await this.commonDateService.DateTimeFormat(tmpdata,'','', TimeZonecc);
                        date = await this.commonDateService.DateTimeFormat(tmpdata,'YYYY-MM-DD HH:mm:ss').toString();
                        actData['date'] = date;
                    }
                }
                if (csdate != '' && date == '') {
                    actData['date'] = date = csdate;
                }
                if (actData[r_by_data] == 'Y' && points <= 0) {
                    remainPoint += (typeof max_point === 'string') ? parseFloat(max_point) : max_point;
                }
                actPoints += (typeof points === 'string') ? parseFloat(points) : points;
                if(onlyDisplayStartDate != ''){
                    actData['start_date'] = onlyDisplayStartDate;
                    if (actData['date'] && actData['date'] != '') {
                        let originalDate = actData['date'];
                        let originalTimestamp = await this.commonDateService.DateTimeFormat(originalDate,'timestamp').toString();
                        let startDateTime = await this.commonDateService.DateTimeFormat(onlyDisplayStartDate,'YYYY-MM-DD') + ' 00:00:00';
                        let startDateTimestamp = await this.commonDateService.DateTimeFormat(startDateTime,'timestamp');
                        if (originalTimestamp < startDateTimestamp) {
                            let originalDateKey = await this.commonDateService.DateTimeFormat(originalTimestamp,'tstodate','DD-MM-YYYY').toString();
                            let startDateKey = await this.commonDateService.DateTimeFormat(onlyDisplayStartDate,'DD-MM-YYYY').toString();
                            ['activityCompAry'].forEach((arrayName) => {
                                if (actData[arrayName]?.[originalDateKey] !== undefined) {
                                    actData[arrayName][startDateKey] = actData[arrayName][originalDateKey];
                                    delete actData[arrayName][originalDateKey];
                                }
                            });

                            const newDate = await this.commonDateService.DateTimeFormat(onlyDisplayStartDate,'YYYY-MM-DD');
                            const newTime = await this.commonDateService.DateTimeFormat(originalTimestamp,'tstodate','HH:mm:ss');
                            actData['date'] = newDate+' '+newTime;
                        }
                    }
                }
                if (cat_index > -1) {
                    if (!category[cat_index].activity) {
                        category[cat_index].activity = []; // Ensure the 'activity' property is initialized as an array
                    }
                    category[cat_index].activity.push(actData); // Append the activity
                    activity[k] = {};
                }else{
                    activity[k] = actData;
                }
                k++;
            }
            activity = activity.filter(item => Object.keys(item).length > 0);
            let returnData = {
                activity : activity,
                category : category,
                totalPoint : totalPoint,
                actPoints : actPoints,
                remainPoint : remainPoint,
                HealthyHabittotalPoint : HealthyHabittotalPoint,
                requiredActivities : requiredActivities,
                upcomingDeadlines : upcomingDeadlines,
            }
            return returnData;
        }
        catch(error){
            throw new Error(error.message);
        }
    }
    async points_for_challenges(datas:any = [], user_id:any = null, hireDateSetting:any = 0, hireDate:any = null, orgId:any = null, hireDateCount:any = 0 ){
        try{
            for (let data of datas) {
                if(hireDateSetting && hireDateSetting == 1 && hireDateCount && hireDateCount > 0){
                    data['end_date'] = this.commonDateService.getTodayDate(data['start_date']).add(hireDateCount, 'days').format('YYYY-MM-DD');
                }
                if(hireDateSetting && hireDateSetting == 1){
                    let totaldays = 0;
                    const actStartDate:any = await this.commonDateService.DateTimeFormat(data['start_date'],'timestamp');
                    const actEndDate:any =  await this.commonDateService.DateTimeFormat(data['end_date'],'timestamp');
                    totaldays =  Math.floor((actEndDate - actStartDate) / (60 * 60 * 24)) + 1;
                    const hireDates:any =  await this.commonDateService.DateTimeFormat(hireDate,'timestamp');
                    if (hireDate != '' && actStartDate < hireDates) {
                        let newStartDate = await this.commonDateService.DateTimeFormat(hireDate,'YYYY-MM-DD');
                        data['start_date'] = newStartDate;
                        data['end_date'] = this.commonDateService.getTodayDate(newStartDate).add(totaldays, 'days').format('YYYY-MM-DD');
                    }
                }
                let onlyDisplayStartDate = '';
                if(hireDateSetting && hireDateSetting == 1 && hireDateCount && hireDateCount > 0){
                    onlyDisplayStartDate = data['start_date'];
                    data['start_date'] = this.commonDateService.getTodayDate(data['start_date']).subtract(hireDateCount, 'days').format('YYYY-MM-DD');
                }
                data['date'] = '';
                let date:any = '';
                if (data['reward_for'] == '2') {
                    let date = await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD HH:mm:ss');
                    let eDate = await this.commonDateService.DateTimeFormat(data['end_date'],'YYYY-MM-DD HH:mm:ss');
                    let dateTimeStamp = await this.commonDateService.DateTimeFormat(date,'timestamp');
                    let eDateTimeStamp = await this.commonDateService.DateTimeFormat(eDate,'timestamp');
                    data['complete'] = 0;
                    if (eDateTimeStamp < dateTimeStamp) {
                        data['complete'] = 1;
                        data['date'] = await this.commonDateService.DateTimeFormat(eDate,'YYYY-MM-DD');
                        date = await this.commonDateService.DateTimeFormat(eDate,'DD-MM-YYYY');
                    }
                } else {
                    let schedule_id = data['challenge_schedule_id'];
                    let checkChallengeJoin = await this.scheduleChallengeJoinUsersService.findOne({schedule_id : schedule_id, user_id : user_id});
                    data['complete'] = 0;
                    if (checkChallengeJoin) {
                        data['complete'] = 1;
                        data['date'] = await this.commonDateService.DateTimeFormat(checkChallengeJoin['added_date'],'YYYY-MM-DD');
                        date = await this.commonDateService.DateTimeFormat(checkChallengeJoin['added_date'],'DD-MM-YYYY');
                    }
                }
                data['activityCompAry'] = data['activityCompAry'] || {};
                data['rewardCompAry'] = data['rewardCompAry'] || {};
                if (date !== '') {
                    data['activityCompAry'][date] = Number(data['point']);
                    data['rewardCompAry'][date] = Number(data['point']);
                }

                if(onlyDisplayStartDate != ''){
                    data['start_date'] = onlyDisplayStartDate;
                    if (data?.['date'] && data['date'] != '') {
                        let originalDate = data['date'];
                        let originalTimestamp = await this.commonDateService.DateTimeFormat(originalDate,'timestamp').toString();
                        let startDateTime = await this.commonDateService.DateTimeFormat(onlyDisplayStartDate,'YYYY-MM-DD') + ' 00:00:00';
                        let startDateTimestamp = await this.commonDateService.DateTimeFormat(startDateTime,'timestamp');
                        if (originalTimestamp < startDateTimestamp) {
                            let originalDateKey = await this.commonDateService.DateTimeFormat(originalTimestamp,'tstodate','DD-MM-YYYY').toString();
                            let startDateKey = await this.commonDateService.DateTimeFormat(onlyDisplayStartDate,'DD-MM-YYYY').toString();
                            ['activityCompAry'].forEach((arrayName) => {
                                if (data[arrayName]?.[originalDateKey] !== undefined) {
                                    data[arrayName][startDateKey] = data[arrayName][originalDateKey];
                                    delete data[arrayName][originalDateKey];
                                }
                            });

                            const newDate = await this.commonDateService.DateTimeFormat(onlyDisplayStartDate,'YYYY-MM-DD');
                            const newTime = await this.commonDateService.DateTimeFormat(originalTimestamp,'tstodate','HH:mm:ss');
                            data['date'] = newDate+' '+newTime;
                        }
                    }
                }
            }
            return datas;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async point_for_category(call_from:any = null, category:any = [], otherDatas:any = []){
        try{
            let {
                user_id = null,
                activePlugins = [],
                hireDate = null,
                hireDateSetting = null,
                company_id = null,
                timezone = null,
                r_by_data = null,
                rewardId = null,
                campaignId = null,
                actPoints = 0,
                totalPoint = 0,
                dateCalType = 'category',
                hireDateCount = 0
            } = Object.assign({}, ...otherDatas);

            let defaultTimezone = 'UTC';
            let userTimezone = 'UTC';
            let TimeZonecc = 'UTC';
            if(timezone != '' && timezone != null){
                userTimezone = timezone;
                TimeZonecc = timezone;
            }
            let usrCurrentTime = await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD');
            usrCurrentTime = await this.commonDateService.DateTimeFormat(usrCurrentTime,'timestamp');
            let requiredActivities = 0;
            let upcomingDeadlines = 0;
            let k = 0;
            for (let catData of category) {
                let otherDatas = { 'dateCalType': dateCalType,  'category': catData,  'hireDate': hireDate, 'hireDateSetting' : hireDateSetting, 'hireDateCount' : hireDateCount,'company_id': company_id, 'userTimezone': userTimezone, 'defaultTimezone': defaultTimezone};
                let allDateCalculate = await this.frontCalculationService.timeZoneDateCalculate(catData, otherDatas);
                allDateCalculate = JSON.parse(JSON.stringify(allDateCalculate));
                catData = allDateCalculate[0];
                let allDateArray = allDateCalculate[1];
                let originalActStartDate = allDateArray['originalActStartDate'];
                let originalActPointDeallineDate = allDateArray['originalActPointDeallineDate'];
                let BioactFactStartDate = allDateArray['BioactFactStartDate'];
                let BioactPointEndDate = allDateArray['BioactPointEndDate'];
                let actEndDate = allDateArray['actEndDate'];
                let actStartDate = allDateArray['actStartDate'];
                let onlyDisplayStartDate = allDateArray['onlyDisplayStartDate'];
                if(actEndDate > usrCurrentTime){
                    upcomingDeadlines++;
                }
                if(catData[`${r_by_data}`] == 'Y'){
                    requiredActivities++;
                }
                let tempPoints = 0;
                const catId = catData?.['category']?.['id'] || 0;
                const maxPoint = (typeof catData['max_point'] === 'string') ? parseFloat(catData['max_point']) : catData['max_point'];
                if(catData?.['activity'] && catData?.['activity']?.length > 0){
                    let caPointE = 0;
                    for (let actData of catData?.['activity']) {
                        let catActPoint = (typeof actData['Point'] === 'string') ? parseFloat(actData['Point']) : actData['Point'];
                        let actMaxPoints = (typeof actData['max_point'] === 'string') ? parseFloat(actData['max_point']) : actData['max_point'];
                        if (actMaxPoints <= catActPoint) {
                            tempPoints += (typeof actData['max_point'] === 'string') ? parseFloat(actData['max_point']) : actData['max_point'];
                            totalPoint -= (typeof actData['max_point'] === 'string') ? parseFloat(actData['max_point']) : actData['max_point'];
                            actPoints -= (typeof actData['max_point'] === 'string') ? parseFloat(actData['max_point']) : actData['max_point'];
                        } else {
                            tempPoints += catActPoint;
                            totalPoint -= catActPoint;
                            actPoints -= catActPoint;
                        }
                    }
                    if (maxPoint <= tempPoints) {
                        tempPoints = maxPoint;
                    }
                }
                catData['Point'] = Number(tempPoints);
                totalPoint += Number(tempPoints);
                actPoints += Number(tempPoints);
                if(onlyDisplayStartDate && onlyDisplayStartDate != ''){
                    catData['start_date'] = onlyDisplayStartDate;
                }
                category[k] = catData;
                k++;
            }
            let returnData = {
                category : category,
                totalPoint : totalPoint,
                actPoints : actPoints,
                requiredActivities : requiredActivities,
                upcomingDeadlines : upcomingDeadlines,
            }
            return returnData;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async points_for_activities_report(call_from:any = 7, activity:any = [], otherDatas:any = []){
        try{
            let {
                category = [],
                activePlugins = [],
                hireDate = '',
                company_id = '',
                dateRange = 0,
                uType_condition = '',
                membershipCode = '',
                otherCondition = '',
                statusCondition = '',
                wellnesschampion = '',
                filterStartDate = '',
                filterEndDate = '',
                dateCalType = 'activity',
                myHireData = {}
            } = Object.assign({}, ...otherDatas);
            if(Object.keys(myHireData).length == 0){
                myHireData = { 'hireDateSetting': 0, 'hireDateCount': 0, 'allUsersDOHInfoData': {} };
            }
            let hireDateSetting = myHireData['hireDateSetting'] || 0;
            let hireDateCount = myHireData['hireDateCount'] || 0;
            let act_id_20_string = await this.getSpecificCatActivityIds(20);
            let withoutTimezoneActivitys = appConstant.CAMPAIGN_CHECK_ACTIVITIES.CUSTOM_WITHOUT_TIMEZONE_CHECK_IDS;
            let tempDentists = {};
            let reportUserActivitys = {};
            let activitySheetArray = {};
            let k = 0;
            let requiredCampActivityUser = 0;
            let requiredCampActivitySpouse = 0;
            let getAgeActivitys = await this.ageActivityService.getAgeActivityIds({ status: 1 });
            let TrBiometricsactivityarray:any = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_HC_BIOMETRICS_IDS;
            if(getAgeActivitys.length > 0){
                TrBiometricsactivityarray = [...TrBiometricsactivityarray, ...getAgeActivitys];
            }
            for (let actData of activity) {
                myHireData['totaldays'] = 0;
                myHireData['startDate'] = await this.commonDateService.DateTimeFormat(actData['start_date'],'YYYY-MM-DD');
                myHireData['endDate'] = await this.commonDateService.DateTimeFormat(actData['end_date'],'YYYY-MM-DD');
                myHireData['startDateTS'] = await this.commonDateService.DateTimeFormat(actData['start_date'],'timestamp');
                myHireData['endDateTS'] = await this.commonDateService.DateTimeFormat(actData['end_date'],'timestamp');
                let otherDatas = { 'dateCalType' : dateCalType, 'call_from': call_from, 'activity': actData, 'category': category, 'activePlugins': activePlugins, 'hireDate': hireDate, 'company_id': company_id, 'filterStartDate': filterStartDate, 'filterEndDate': filterEndDate, 'dateRange' : dateRange, 'myHireData': myHireData};
                let allDateCalculate = await this.frontCalculationService.timeZoneDateCalculateReport(actData, otherDatas);
                allDateCalculate = JSON.parse(JSON.stringify(allDateCalculate));
                actData = allDateCalculate[0];
                let allDateArray = allDateCalculate[1];
                myHireData = allDateArray['myHireData'];
                let actStartDate = allDateArray['actStartDate'];
                let actEndDate = allDateArray['actEndDate'];
                let actPointDeadlineDate = allDateArray['actPointDeadlineDate'];
                let actPointAfterDeallineDate = allDateArray['actPointAfterDeallineDate'];
                let actStartDateTS = allDateArray['actStartDateTS'];
                let actEndDateTS = allDateArray['actEndDateTS'];
                let actPointDeadlineDateTS = allDateArray['actPointDeadlineDateTS'];
                let actPointAfterDeallineDateTS = allDateArray['actPointAfterDeallineDateTS'];
                let onlyDisplayStartDate = allDateArray['onlyDisplayStartDate'];
                let filterStartDateTS = await this.commonDateService.DateTimeFormat(filterStartDate,'timestamp');
                let filterEndDateTS = await this.commonDateService.DateTimeFormat(filterEndDate,'timestamp');
                let PointTZEndDateCondition = '';
                let PointEndDateCondition = '';
                if (actPointDeadlineDate != '') {
                    PointTZEndDateCondition = ` AND DATE_FORMAT(CONVERT_TZ(\`ent\`.\`inserted\`,'UTC',CASE WHEN \`user\`.\`timezone\` != '' THEN \`user\`.\`timezone\` ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s') BETWEEN '${actStartDate}' AND '${actPointDeadlineDate}'`;
                    PointEndDateCondition = ` AND DATE_FORMAT(\`ent\`.\`inserted\`,'%Y-%m-%d %H:%i:%s') BETWEEN '${actStartDate}' AND '${actPointDeadlineDate}'`;
                }
                if (call_from == 8 && dateRange == 2) { /* 8 for engagement comparision report */
                    actPointDeadlineDate = PointEndDateCondition =  PointTZEndDateCondition = '';
                }
                let camActId = actData['id'];
                let actId = actData?.['activity']?.['id'] || 0;
                let actCatId = actData?.['activity']?.['category_id'] || 0;
                let max_point = actData['max_point'];
                let cat_index = -1;
                if (call_from != 7) { /* Admin report */
                    for (let d = 0; d < category.length; d++) {
                        if (actData?.['category'] && category?.[d]?.['category'] && actData['category']['id'] == category[d]['category']['id']) {
                            if (cat_index == -1) {
                                cat_index = d;
                            }
                        }
                    }
                    if (actData['category_visibility'] == 0) {
                        cat_index = -1;
                    }
                }
                if (actData['required_by_user'] == 'Y') {
                    requiredCampActivityUser += Number(actData['max_point']);
                }
                if (actData['required_by_spouse'] == 'Y') {
                    requiredCampActivitySpouse += Number(actData['max_point'])
                }
                let activityDone = {};
                let activityDoneTemp = [];
                /* CUSTOM POINT CALCULATION */
                    const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : `ent.user_id = user.id` }];
                    let allCustomPointDatas:any = await this.frontPointService.getCustomPoints(`${otherCondition} ent.activity_id = ${camActId} AND user.membership_code IN ('${membershipCode}') AND ent.status = 1 ${uType_condition} ${wellnesschampion} ${statusCondition}`, {id: 'ASC'}, ['ent.id as id', 'ent.point as total','DATE_FORMAT(ent.date,"%Y-%m-%d")as time','DATE_FORMAT(ent.updated_date,"%Y-%m-%d") as time1','DATE_FORMAT(ent.created_date,"%Y-%m-%d") as time2', `user.role_id as role_id`, `user.id as uid`, `user.is_camp_eligible as is_camp_eligible`, `user.on_insurance_plan as on_insurance_plan`, `user.location as location`, `user.department_id as department_id`, `user.gender as gender`,'TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age'], joinTableList);
                    if(actId != 49){
                        if(company_id == 533){
                            if(allCustomPointDatas.length > 0){
                            }
                        }else{
                            allCustomPointDatas = await this.frontPointService.getCustomPoints(`${otherCondition} ent.activity_id = ${camActId} AND user.membership_code IN ('${membershipCode}') AND ent.status = 1 ${uType_condition} ${wellnesschampion} ${statusCondition}`, { id: 'ASC'}, ['ent.id as id', 'ent.point as total','DATE_FORMAT(ent.date,"%Y-%m-%d")as time','DATE_FORMAT(ent.updated_date,"%Y-%m-%d") as time1','DATE_FORMAT(ent.created_date,"%Y-%m-%d") as time2', `user.role_id as role_id`, `user.id as uid`, `user.is_camp_eligible as is_camp_eligible`, `user.on_insurance_plan as on_insurance_plan`, `user.location as location`, `user.department_id as department_id`, `user.gender as gender`,'TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age'], joinTableList);
                        }
                    }
                    let activityCustomPointTemp = allCustomPointDatas;
                    let customOtherDatas = { 'max_point': max_point, 'call_from': call_from };
                    const CustomPointCalculation = await this.frontPointService.CustomPointCalculation(allCustomPointDatas, 'multiple', customOtherDatas);
                    allCustomPointDatas = CustomPointCalculation;
                /* CUSTOM POINT CALCULATION */
                let CommonOtherData = [ { 'membershipCode' : membershipCode, 'actDatas': actData, 'statusCondition' : statusCondition, 'allDateArray' : allDateArray, 'otherCondition' : otherCondition, 'company_id' : company_id, 'wellnesschampion' : wellnesschampion, 'uType_condition' : uType_condition, 'allCustomPointDatas' : allCustomPointDatas, 'getDataType' : 'multiple', 'call_from' : call_from, 'myHireData': myHireData } ];
                /* Healthcheckup Code */
                    if(activePlugins.includes('Healthcheckup')){
                        /* hc_biometrics */
                            if (TrBiometricsactivityarray.includes(actId)) {
                                let HCBOtherData:any = [{ 'PointEndDateCondition' : PointEndDateCondition, 'PointTZEndDateCondition' : PointTZEndDateCondition, 'act_id_20_string' : act_id_20_string}];
                                HCBOtherData = CommonOtherData.map((item, index) => ({
                                    ...item,
                                    ...(HCBOtherData[index] || {})
                                }));
                                const hcBiomatricData = await this.frontHealthcheckupService.getHCBiomatric('main', actId, HCBOtherData);
                                if (hcBiomatricData && hcBiomatricData.length > 0 && hcBiomatricData[0]['activityDoneF'] && Object.keys(hcBiomatricData[0]['activityDoneF']).length > 0) {
                                    activityDone = (Object.keys(activityDone).length > 0) ? merge({}, activityDone, hcBiomatricData[0]['activityDoneF']) : hcBiomatricData[0]['activityDoneF'];
                                    activityDoneTemp = (activityDoneTemp.length > 0 ) ? await this.commonArrayService.mergeArrays(activityDoneTemp, hcBiomatricData[0]['activityDone']) : hcBiomatricData[0]['activityDone'];
                                }
                            }
                        /* hc_biometrics */
                        /* hc_dentists */
                            const HCdentistsactivityarray = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_HC_DENTISTS_IDS;
                            if (HCdentistsactivityarray.includes(actId)) {
                                let DecOtherData:any = [ { 'PointEndDateCondition': PointEndDateCondition, 'tempDentists' : tempDentists} ];
                                DecOtherData = CommonOtherData.map((item, index) => ({
                                    ...item,
                                    ...(DecOtherData[index] || {})
                                }));
                                const hcDentistData = await this.frontHealthcheckupService.getHCDentist('main', actId, DecOtherData);
                                if (hcDentistData && hcDentistData.length > 0 && hcDentistData[0]['activityDoneF'] && Object.keys(hcDentistData[0]['activityDoneF']).length > 0) {
                                    activityDone = (Object.keys(activityDone).length > 0) ? merge({}, activityDone, hcDentistData[0]['activityDoneF']) : hcDentistData[0]['activityDoneF'];
                                    activityDoneTemp = (activityDoneTemp.length > 0 ) ? await this.commonArrayService.mergeArrays(activityDoneTemp, hcDentistData[0]['activityDone']) : hcDentistData[0]['activityDone'];
                                    tempDentists = hcDentistData[0]['tempDentists'];
                                }
                            }
                        /* hc_dentists */
                        /* hc_optometrists */
                            const HCoptometristsactivityarray = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_HC_OPTOMETRISTS_IDS;
                            if (HCoptometristsactivityarray.includes(actId)) {
                                let OptOtherData:any = [ { 'PointEndDateCondition': PointEndDateCondition} ];
                                OptOtherData = CommonOtherData.map((item, index) => ({
                                    ...item,
                                    ...(OptOtherData[index] || {})
                                }));
                                const hcOptometristData = await this.frontHealthcheckupService.getHCOptometrist('main', actId, OptOtherData);
                                if (hcOptometristData && hcOptometristData.length > 0 && hcOptometristData[0]['activityDoneF'] && Object.keys(hcOptometristData[0]['activityDoneF']).length > 0) {
                                    activityDone = (Object.keys(activityDone).length > 0) ? merge({}, activityDone, hcOptometristData[0]['activityDoneF']) : hcOptometristData[0]['activityDoneF'];
                                    activityDoneTemp = (activityDoneTemp.length > 0 ) ? await this.commonArrayService.mergeArrays(activityDoneTemp, hcOptometristData[0]['activityDone']) : hcOptometristData[0]['activityDone'];
                                }
                            }
                        /* hc_optometrists */
                        /* hc_tabaccouses */
                            const HCtabaccousesactivityarray = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_HC_TOBACCO_USES_IDS;
                            if (HCtabaccousesactivityarray.includes(actId)) {
                                let actIdD:any = actId;
                                if (actData?.['activity'] && actData['activity']['id'] == '4') {
                                    actIdD = '12,13,14';
                                }
                                let TocOtherData:any = [ { 'PointTZEndDateCondition': PointTZEndDateCondition} ];
                                TocOtherData = CommonOtherData.map((item, index) => ({
                                    ...item,
                                    ...(TocOtherData[index] || {})
                                }));
                                const hcTabaccoUsesData = await this.frontHealthcheckupService.getHCTabaccoUses('main', actIdD, TocOtherData);
                                if (hcTabaccoUsesData && hcTabaccoUsesData.length > 0 && hcTabaccoUsesData[0]['activityDoneF'] && Object.keys(hcTabaccoUsesData[0]['activityDoneF']).length > 0) {
                                    activityDone = (Object.keys(activityDone).length > 0) ? merge({}, activityDone, hcTabaccoUsesData[0]['activityDoneF']) : hcTabaccoUsesData[0]['activityDoneF'];
                                    activityDoneTemp = (activityDoneTemp.length > 0 ) ? await this.commonArrayService.mergeArrays(activityDoneTemp, hcTabaccoUsesData[0]['activityDone']) : hcTabaccoUsesData[0]['activityDone'];
                                }
                            }
                        /* hc_tabaccouses */
                    }
                /* Healthcheckup Code */
                /* HRA Code */
                    if(activePlugins.includes('Hra')){
                        /* ha_assessments */
                            const HAassessmentsactivityarray = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_HA_ASSESSMENTS_IDS;
                            if (HAassessmentsactivityarray.includes(actId)) {
                                const haAssessmentData = await this.frontHealthcheckupService.getHAAssessment('main', actId, CommonOtherData);
                                if (haAssessmentData && haAssessmentData.length > 0 && haAssessmentData[0]['activityDoneF'] && Object.keys(haAssessmentData[0]['activityDoneF']).length > 0) {
                                    activityDone = (Object.keys(activityDone).length > 0) ? merge({}, activityDone, haAssessmentData[0]['activityDoneF']) : haAssessmentData[0]['activityDoneF'];
                                    activityDoneTemp = (activityDoneTemp.length > 0 ) ? await this.commonArrayService.mergeArrays(activityDoneTemp, haAssessmentData[0]['activityDone']) : haAssessmentData[0]['activityDone'];
                                }
                            }
                        /* ha_assessments */
                        /* ha_emotional_assessments */
                            const HaEAassessmentsactivityarray = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_HA_EMOTIONAL_ASSESSMENTS_IDS;
                            if (HaEAassessmentsactivityarray.includes(actId)) {
                                const haEAssessmentData = await this.frontHealthcheckupService.getHAEAssessment('main', actId, CommonOtherData );
                                if (haEAssessmentData && haEAssessmentData.length > 0 && haEAssessmentData[0]['activityDoneF'] && Object.keys(haEAssessmentData[0]['activityDoneF']).length > 0) {
                                    activityDone = (Object.keys(activityDone).length > 0) ? merge({}, activityDone, haEAssessmentData[0]['activityDoneF']) : haEAssessmentData[0]['activityDoneF'];
                                    activityDoneTemp = (activityDoneTemp.length > 0 ) ? await this.commonArrayService.mergeArrays(activityDoneTemp, haEAssessmentData[0]['activityDone']) : haEAssessmentData[0]['activityDone'];
                                }
                            }
                        /* ha_emotional_assessments */
                        /* ha_hrabiometrics */
                            const HAHRABiometricactivityarray = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_HA_HRA_BIOMETRICS_IDS;
                            if (HAHRABiometricactivityarray.includes(actId)) {
                                const haHRABiometricData = await this.frontHealthcheckupService.getHAHRABiometric('main', actId, CommonOtherData);
                                if (haHRABiometricData && haHRABiometricData.length > 0 && haHRABiometricData[0]['activityDoneF'] && Object.keys(haHRABiometricData[0]['activityDoneF']).length > 0) {
                                    activityDone = (Object.keys(activityDone).length > 0) ? merge({}, activityDone, haHRABiometricData[0]['activityDoneF']) : haHRABiometricData[0]['activityDoneF'];
                                    activityDoneTemp = (activityDoneTemp.length > 0 ) ? await this.commonArrayService.mergeArrays(activityDoneTemp, haHRABiometricData[0]['activityDone']) : haHRABiometricData[0]['activityDone'];
                                }
                            }   
                        /* ha_hrabiometrics */
                    }
                /* HRA Code */
                /* Activity tracker */
                    if(activePlugins.includes('Activitytracker')){
                        const activityTrackersData = await this.frontTrackerEventMediaService.getActivityTracter('main', actId, CommonOtherData);
                        if (activityTrackersData && activityTrackersData.length > 0 && activityTrackersData[0]['activityDoneF'] && Object.keys(activityTrackersData[0]['activityDoneF']).length > 0) {
                            activityDone = (Object.keys(activityDone).length > 0) ? merge({}, activityDone, activityTrackersData[0]['activityDoneF']) : activityTrackersData[0]['activityDoneF'];
                            activityDoneTemp = (activityDoneTemp.length > 0 ) ? await this.commonArrayService.mergeArrays(activityDoneTemp, activityTrackersData[0]['activityDone']) : activityTrackersData[0]['activityDone'];
                        }
                    }
                /* Activity tracker */
                /* Reimbursements */
                    if(activePlugins.includes('Reimbursements')){
                        const ReimbursementsData = await this.frontTrackerEventMediaService.getReimbursements('main', actId, CommonOtherData);
                        if (ReimbursementsData && ReimbursementsData.length > 0 && ReimbursementsData[0]['activityDoneF'] && Object.keys(ReimbursementsData[0]['activityDoneF']).length > 0) {
                            activityDone = (Object.keys(activityDone).length > 0) ? merge({}, activityDone, ReimbursementsData[0]['activityDoneF']) : ReimbursementsData[0]['activityDoneF'];
                            activityDoneTemp = (activityDoneTemp.length > 0 ) ? await this.commonArrayService.mergeArrays(activityDoneTemp, ReimbursementsData[0]['activityDone']) : ReimbursementsData[0]['activityDone'];
                        }
                    }
                /* Reimbursements */
                /* My Plans */
                    if(activePlugins.includes('Myplan')){
                        /* mp_join_user_plan */
                            const myPlanJoinUserActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_MP_JOIN_USER_PLAN_IDS;
                            if(myPlanJoinUserActivityIds.includes(actCatId)){
                                const myPlanJoinUserActivityData = await this.frontTrackerEventMediaService.getJoinUserPlans('main', actId, CommonOtherData);
                                if (myPlanJoinUserActivityData && myPlanJoinUserActivityData.length > 0 && myPlanJoinUserActivityData[0]['activityDoneF'] && Object.keys(myPlanJoinUserActivityData[0]['activityDoneF']).length > 0) {
                                    activityDone = (Object.keys(activityDone).length > 0) ? merge({}, activityDone, myPlanJoinUserActivityData[0]['activityDoneF']) : myPlanJoinUserActivityData[0]['activityDoneF'];
                                    activityDoneTemp = (activityDoneTemp.length > 0 ) ? await this.commonArrayService.mergeArrays(activityDoneTemp, myPlanJoinUserActivityData[0]['activityDone']) : myPlanJoinUserActivityData[0]['activityDone'];
                                }
                            }
                        /* mp_join_user_plan */
                        /* mp_join_user_plan */
                            const myPlanCompleteBlockActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_MP_COMPLETE_BLOCK_IDS;
                            if(myPlanCompleteBlockActivityIds.includes(actCatId)){
                                const myPlanCompleteBlockActivityData = await this.frontTrackerEventMediaService.getMPComplateBlock('main', actId, CommonOtherData);
                                if (myPlanCompleteBlockActivityData && myPlanCompleteBlockActivityData.length > 0 && myPlanCompleteBlockActivityData[0]['activityDoneF'] && Object.keys(myPlanCompleteBlockActivityData[0]['activityDoneF']).length > 0) {
                                    activityDone = (Object.keys(activityDone).length > 0) ? merge({}, activityDone, myPlanCompleteBlockActivityData[0]['activityDoneF']) : myPlanCompleteBlockActivityData[0]['activityDoneF'];
                                    activityDoneTemp = (activityDoneTemp.length > 0 ) ? await this.commonArrayService.mergeArrays(activityDoneTemp, myPlanCompleteBlockActivityData[0]['activityDone']) : myPlanCompleteBlockActivityData[0]['activityDone'];
                                }
                            }
                        /* mp_join_user_plan */
                        /* mp_join_user_plan */
                            const myPlanCompleteActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_MP_COMPLETE_ACTIVITY_IDS;
                            if(myPlanCompleteActivityIds.includes(actCatId)){
                                const myPlanCompleteActivityData = await this.frontTrackerEventMediaService.getMPComplateActivity('main', actId, CommonOtherData );
                                if (myPlanCompleteActivityData && myPlanCompleteActivityData.length > 0 && myPlanCompleteActivityData[0]['activityDoneF'] && Object.keys(myPlanCompleteActivityData[0]['activityDoneF']).length > 0) {
                                    activityDone = (Object.keys(activityDone).length > 0) ? merge({}, activityDone, myPlanCompleteActivityData[0]['activityDoneF']) : myPlanCompleteActivityData[0]['activityDoneF'];
                                    activityDoneTemp = (activityDoneTemp.length > 0 ) ? await this.commonArrayService.mergeArrays(activityDoneTemp, myPlanCompleteActivityData[0]['activityDone']) : myPlanCompleteActivityData[0]['activityDone'];
                                }
                            }
                        /* mp_join_user_plan */
                    }
                /* My Plans */
                /* User Login */
                    const userLoginActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_S_USER_LOGIN_IDS;
                    if(userLoginActivityIds.includes(actId)){
                        const userLoginActivityData = await this.frontTrackerEventMediaService.getUserLogin('main', actId, CommonOtherData );
                        if (userLoginActivityData && userLoginActivityData.length > 0 && userLoginActivityData[0]['activityDoneF'] && Object.keys(userLoginActivityData[0]['activityDoneF']).length > 0) {
                            activityDone = (Object.keys(activityDone).length > 0) ? merge({}, activityDone, userLoginActivityData[0]['activityDoneF']) : userLoginActivityData[0]['activityDoneF'];
                            activityDoneTemp = (activityDoneTemp.length > 0 ) ? await this.commonArrayService.mergeArrays(activityDoneTemp, userLoginActivityData[0]['activityDone']) : userLoginActivityData[0]['activityDone'];
                        }
                    }
                /* User Login */
                /* App Download */
                    const appDownloadActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_S_USER_LOGIN_APP_DOWNLOAD_IDS;
                    if(appDownloadActivityIds.includes(actId)){
                        const appDownloadActivityData = await this.frontTrackerEventMediaService.getAppDownload('main', actId, CommonOtherData );
                        if (appDownloadActivityData && appDownloadActivityData.length > 0 && appDownloadActivityData[0]['activityDoneF'] && Object.keys(appDownloadActivityData[0]['activityDoneF']).length > 0) {
                            activityDone = (Object.keys(activityDone).length > 0) ? merge({}, activityDone, appDownloadActivityData[0]['activityDoneF']) : appDownloadActivityData[0]['activityDoneF'];
                            activityDoneTemp = (activityDoneTemp.length > 0 ) ? await this.commonArrayService.mergeArrays(activityDoneTemp, appDownloadActivityData[0]['activityDone']) : appDownloadActivityData[0]['activityDone'];
                        }
                    }
                /* App Download */
                /* Fitness Biometric */
                    const ftBiometricActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_FT_BIOMETRICS_IDS;
                    if(ftBiometricActivityIds.includes(actId)){
                        const ftBiometricActivityData = await this.frontHealthcheckupService.getFtBiomatrics('main', actId, CommonOtherData );
                        if (ftBiometricActivityData && ftBiometricActivityData.length > 0 && ftBiometricActivityData[0]['activityDoneF'] && Object.keys(ftBiometricActivityData[0]['activityDoneF']).length > 0) {
                            activityDone = (Object.keys(activityDone).length > 0) ? merge({}, activityDone, ftBiometricActivityData[0]['activityDoneF']) : ftBiometricActivityData[0]['activityDoneF'];
                            activityDoneTemp = (activityDoneTemp.length > 0 ) ? await this.commonArrayService.mergeArrays(activityDoneTemp, ftBiometricActivityData[0]['activityDone']) : ftBiometricActivityData[0]['activityDone'];
                        }
                    }
                /* Fitness Biometric */
                /* COVID */
                    const covidActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_COVID_USER_ANSWERS_IDS;
                    if(covidActivityIds.includes(actId)){
                        const covidActivityData = await this.frontTrackerEventMediaService.getCovidActivity('main', actId, CommonOtherData );
                        if (covidActivityData && covidActivityData.length > 0 && covidActivityData[0]['activityDoneF'] && Object.keys(covidActivityData[0]['activityDoneF']).length > 0) {
                            activityDone = (Object.keys(activityDone).length > 0) ? merge({}, activityDone, covidActivityData[0]['activityDoneF']) : covidActivityData[0]['activityDoneF'];
                            activityDoneTemp = (activityDoneTemp.length > 0 ) ? await this.commonArrayService.mergeArrays(activityDoneTemp, covidActivityData[0]['activityDone']) : covidActivityData[0]['activityDone'];
                        }
                    }
                /* COVID  */
                /* Fitnes Video */
                    const fitnessVideoActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_ME_FOD_VIDEO_CLICK_IDS;
                    if(activePlugins.includes('Media') && fitnessVideoActivityIds.includes(actCatId)){
                        const fitnessVideoActivityData = await this.frontTrackerEventMediaService.getFitnessVideo('main', actId, CommonOtherData );
                        if (fitnessVideoActivityData && fitnessVideoActivityData.length > 0 && fitnessVideoActivityData[0]['activityDoneF'] && Object.keys(fitnessVideoActivityData[0]['activityDoneF']).length > 0) {
                            activityDone = (Object.keys(activityDone).length > 0) ? merge({}, activityDone, fitnessVideoActivityData[0]['activityDoneF']) : fitnessVideoActivityData[0]['activityDoneF'];
                            activityDoneTemp = (activityDoneTemp.length > 0 ) ? await this.commonArrayService.mergeArrays(activityDoneTemp, fitnessVideoActivityData[0]['activityDone']) : fitnessVideoActivityData[0]['activityDone'];
                        }
                    }
                /* Fitnes Video */
                /* Emotional wellbeing */
                    const emotionalWellbeingActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_EM_POST_CLICK_IDS;
                    if(activePlugins.includes('Emotionalwellbeing') && emotionalWellbeingActivityIds.includes(actCatId)){
                        const emotionalWellbeingActivityData = await this.frontTrackerEventMediaService.getEmotionalwellbeing('main', actId, CommonOtherData );
                        if (emotionalWellbeingActivityData && emotionalWellbeingActivityData.length > 0 && emotionalWellbeingActivityData[0]['activityDoneF'] && Object.keys(emotionalWellbeingActivityData[0]['activityDoneF']).length > 0) {
                            activityDone = (Object.keys(activityDone).length > 0) ? merge({}, activityDone, emotionalWellbeingActivityData[0]['activityDoneF']) : emotionalWellbeingActivityData[0]['activityDoneF'];
                            activityDoneTemp = (activityDoneTemp.length > 0 ) ? await this.commonArrayService.mergeArrays(activityDoneTemp, emotionalWellbeingActivityData[0]['activityDone']) : emotionalWellbeingActivityData[0]['activityDone'];
                        }
                    }
                /* Emotional wellbeing */
                /* Quicklink */
                    const quicklinkActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_U_QUICK_LINK_CLICK_IDS;
                    if(activePlugins.includes('Quicklink') && quicklinkActivityIds.includes(actCatId)){
                        const quicklinkActivityData = await this.frontTrackerEventMediaService.getQuickLink('main', actId, CommonOtherData );
                        if (quicklinkActivityData && quicklinkActivityData.length > 0 && quicklinkActivityData[0]['activityDoneF'] && Object.keys(quicklinkActivityData[0]['activityDoneF']).length > 0) {
                            activityDone = (Object.keys(activityDone).length > 0) ? merge({}, activityDone, quicklinkActivityData[0]['activityDoneF']) : quicklinkActivityData[0]['activityDoneF'];
                            activityDoneTemp = (activityDoneTemp.length > 0 ) ? await this.commonArrayService.mergeArrays(activityDoneTemp, quicklinkActivityData[0]['activityDone']) : quicklinkActivityData[0]['activityDone'];
                        }
                    }
                /* Quicklink */
                /* Event Complete */
                    const eventsActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_EV_EVENT_COMPLETE_IDS;
                    if(activePlugins.includes('Events') && eventsActivityIds.includes(actCatId)){
                        const eventsActivityData = await this.frontTrackerEventMediaService.getEvent('main', actId, CommonOtherData );
                        if (eventsActivityData && eventsActivityData.length > 0 && eventsActivityData[0]['activityDoneF'] && Object.keys(eventsActivityData[0]['activityDoneF']).length > 0) {
                            activityDone = (Object.keys(activityDone).length > 0) ? merge({}, activityDone, eventsActivityData[0]['activityDoneF']) : eventsActivityData[0]['activityDoneF'];
                            activityDoneTemp = (activityDoneTemp.length > 0 ) ? await this.commonArrayService.mergeArrays(activityDoneTemp, eventsActivityData[0]['activityDone']) : eventsActivityData[0]['activityDone'];
                        }
                    }
                /* Event Complete */
                /* Quiz complete */
                    const quizActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_QZ_QUIZ_COMPLETE_IDS;
                    if(activePlugins.includes('Quiz') && quizActivityIds.includes(actCatId)){
                        const quizActivityData = await this.frontTrackerEventMediaService.getQuizUser('main', actId, CommonOtherData );
                        if (quizActivityData && quizActivityData.length > 0 && quizActivityData[0]['activityDoneF'] && Object.keys(quizActivityData[0]['activityDoneF']).length > 0) {
                            activityDone = (Object.keys(activityDone).length > 0) ? merge({}, activityDone, quizActivityData[0]['activityDoneF']) : quizActivityData[0]['activityDoneF'];
                            activityDoneTemp = (activityDoneTemp.length > 0 ) ? await this.commonArrayService.mergeArrays(activityDoneTemp, quizActivityData[0]['activityDone']) : quizActivityData[0]['activityDone'];
                        }
                    }
                /* Quiz complete */
                /* Trackers */
                    if(activePlugins.includes('Trackers')){
                        /* ft_activity_feeds */
                            const ftFeedsActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_FT_ACTIVITY_FEEDS_IDS;
                            if(ftFeedsActivityIds.includes(actId)){
                                const ftFeedsActivityData = await this.frontTrackerEventMediaService.getFTActivityFeeds('main', actId, CommonOtherData );
                                if (ftFeedsActivityData && ftFeedsActivityData.length > 0 && ftFeedsActivityData[0]['activityDoneF'] && Object.keys(ftFeedsActivityData[0]['activityDoneF']).length > 0) {
                                    activityDone = (Object.keys(activityDone).length > 0) ? merge({}, activityDone, ftFeedsActivityData[0]['activityDoneF']) : ftFeedsActivityData[0]['activityDoneF'];
                                    activityDoneTemp = (activityDoneTemp.length > 0 ) ? await this.commonArrayService.mergeArrays(activityDoneTemp, ftFeedsActivityData[0]['activityDone']) : ftFeedsActivityData[0]['activityDone'];
                                }
                            }
                        /* ft_activity_feeds */
                        /* ft_foods_feeds */
                            const ftFoodsActivityIds = appConstant.CAMPAIGN_CHECK_ACTIVITIES.TBL_FT_FOOD_FEEDS_IDS;
                            if(ftFoodsActivityIds.includes(actId)){
                                const ftFoodsActivityData = await this.frontTrackerEventMediaService.getFTFoodFeeds('main', actId, CommonOtherData );
                                if (ftFoodsActivityData && ftFoodsActivityData.length > 0 && ftFoodsActivityData[0]['activityDoneF'] && Object.keys(ftFoodsActivityData[0]['activityDoneF']).length > 0) {
                                    activityDone = (Object.keys(activityDone).length > 0) ? merge({}, activityDone, ftFoodsActivityData[0]['activityDoneF']) : ftFoodsActivityData[0]['activityDoneF'];
                                    activityDoneTemp = (activityDoneTemp.length > 0 ) ? await this.commonArrayService.mergeArrays(activityDoneTemp, ftFoodsActivityData[0]['activityDone']) : ftFoodsActivityData[0]['activityDone'];
                                }
                            }
                        /* ft_foods_feeds */
                    }
                /* Trackers */
                if (activityCustomPointTemp.length > 0) {
                    const activityCustomPointTemps = await this.frontPointService.groupByUserId(activityCustomPointTemp);
                    if (call_from == 11) { /* admin cohorot report */
                        reportUserActivitys = Object.keys(activityCustomPointTemps)
                            .reduce((acc, uid) => ({ ...acc, [uid]: null }), {});
                    } else {
                        for (const key in activityCustomPointTemps) {
                            if (activityCustomPointTemps.hasOwnProperty(key)) {
                                const value = activityCustomPointTemps[key];
                                const activityCustomPoint1 = value.map((item) => item.time);
                                if (call_from == 7) { /* admin report */
                                    const actMinDates:any = moment.min(activityCustomPoint1.map((date) => moment.utc(date))).unix();
                                    if (actMinDates >= filterStartDateTS && actMinDates <= filterEndDateTS) {
                                        if(!reportUserActivitys[key]){
                                            reportUserActivitys[key] = {};
                                        }
                                        let actuleMinDatw = await this.commonDateService.DateTimeFormat(actMinDates, 'tstodate', 'MM-DD-YYYY');
                                        reportUserActivitys[key][camActId] = actuleMinDatw;
                                    }
                                }
                            }
                        }
                    }
                }
                if (activityDoneTemp.length > 0) {
                    const activityDoneTemps = await this.frontPointService.groupByUserId(activityDoneTemp);
                    if (call_from == 11) { /* admin cohorot report */
                        reportUserActivitys = Object.keys(activityDoneTemps)
                            .reduce((acc, uid) => ({ ...acc, [uid]: null }), {});
                    } else {
                        for (const key in activityDoneTemps) {
                            if (activityDoneTemps.hasOwnProperty(key)) {
                                const value = activityDoneTemps[key];
                                const activityDoneTemp1 = value.map((item) => item.time);
                                if (call_from == 7) { /* admin report */
                                    const actMinDates:any = moment.min(activityDoneTemp1.map((date) => moment.utc(date))).unix();
                                    if (actMinDates >= filterStartDateTS && actMinDates <= filterEndDateTS) {
                                        if(!reportUserActivitys[key]){
                                            reportUserActivitys[key] = {};
                                        }
                                        let actuleMinDatw = await this.commonDateService.DateTimeFormat(actMinDates, 'tstodate', 'MM-DD-YYYY');
                                        if(reportUserActivitys[key][camActId] && moment.utc(reportUserActivitys[key][camActId], 'MM-DD-YYYY').unix() > actMinDates){
                                            reportUserActivitys[key][camActId] = actuleMinDatw;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                if (actData['cust_name'] != "") {
                    activitySheetArray[camActId] = actData['cust_name'];
                } else {
                    activitySheetArray[camActId] = actData?.['activity']?.['activity_name'] || '';
                }
                actData['users'] = activityDone;
                actData['custompoint'] = allCustomPointDatas;
                if (call_from != 7 && cat_index > -1) {
                    if (!category[cat_index].activity) {
                        category[cat_index].activity = []; // Ensure the 'activity' property is initialized as an array
                    }
                    category[cat_index].activity.push(actData); // Append the activity
                    activity[k] = {};
                }else{
                    activity[k] = actData;
                }
                k++;
            }
            activity = activity.filter(item => Object.keys(item).length > 0);
            let returnData = {
                activity : activity || [],
                category : category || [],
                userData : reportUserActivitys || {},
                activitySheetArray : activitySheetArray || {},
                requiredCampActivityUser : requiredCampActivityUser || 0,
                requiredCampActivitySpouse : requiredCampActivitySpouse || 0,
            }
            return returnData;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async point_for_category_report(call_from:any = 7, category:any = [], otherDatas:any = []){
        try{
            let {
                hireDate = '',
                company_id = '',
                dateRange = 0,
                uType_condition = ' AND user.role_id IN (\'2\',\'16\')',
                membershipCode = '',
                otherCondition = '',
                statusCondition = '',
                wellnesschampion = '',
                filterStartDate = '',
                filterEndDate = '',
                dateCalType = 'category',
                activePlugins = [],
		        myHireData = {}
            } = Object.assign({}, ...otherDatas);
            let c = 0;
            if(Object.keys(myHireData).length == 0){
                myHireData = { 'hireDateSetting': 0, 'hireDateCount': 0, 'allUsersDOHInfoData': {} };
            }
            let hireDateSetting = myHireData['hireDateSetting'] || 0;
            let hireDateCount = myHireData['hireDateCount'] || 0;
            for (let catData of category) {
                let otherDatasC = { 'dateCalType': dateCalType,  'call_from': call_from, 'category': catData,  'hireDate': hireDate, 'company_id': company_id, 'filterStartDate': filterStartDate, 'filterEndDate': filterEndDate, 'dateRange' : dateRange};
                let allDateCalculate = await this.frontCalculationService.timeZoneDateCalculateReport(catData, otherDatasC);
                allDateCalculate = JSON.parse(JSON.stringify(allDateCalculate));
                catData = allDateCalculate[0];
                let allDateArray = allDateCalculate[1];
                let originalActStartDate = allDateArray['originalActStartDate'];
                let originalActPointDeallineDate = allDateArray['originalActPointDeallineDate'];
                let BioactFactStartDate = allDateArray['BioactFactStartDate'];
                let BioactPointEndDate = allDateArray['BioactPointEndDate'];
                let actEndDate = allDateArray['actEndDate'];
                let actStartDate = allDateArray['actStartDate'];
                let onlyDisplayStartDate = allDateArray['onlyDisplayStartDate'];
                let catId = catData?.['category']?.['id'] || 0;
                let activityDone = {};
                if(catId == 8 && activePlugins.includes('Challenge')){
                    let challengeData = await this.readReplicaScheduleChallengeRepository.createQueryBuilder('sc')
                    .leftJoinAndMapOne(
                        'sc.challenge',
                        tableConstant.CHALLENGE.TBL_CH_CHALLENGE,
                        'challenge',
                        `challenge.id = sc.challenge_id AND challenge.status = 1`,
                    )
                    .where(`sc.status = 1 AND sc.org_id = '${company_id}'`).getMany();
                    let k = 0;
                    for (let chaData of challengeData) {
                        chaData['date'] = '';
                        let date:any = '';
                        if (catData['reward_for'] == '2') {
                            let date = await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD HH:mm:ss');
                            let eDate = await this.commonDateService.DateTimeFormat(catData['end_date'],'YYYY-MM-DD HH:mm:ss');
                            let dateTimeStamp = await this.commonDateService.DateTimeFormat(date,'timestamp');
                            let eDateTimeStamp = await this.commonDateService.DateTimeFormat(eDate,'timestamp');
                            chaData['complete'] = 0;
                            if (eDateTimeStamp < dateTimeStamp) {
                                chaData['complete'] = 1;
                                chaData['date'] = await this.commonDateService.DateTimeFormat(eDate,'YYYY-MM-DD');
                                date = await this.commonDateService.DateTimeFormat(eDate,'DD-MM-YYYY');
                            }
                        } else {
                            var tableName = tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS;
                            let schedule_id = chaData['id'];
                            let conditions = `${otherCondition} ent.schedule_id = ${schedule_id}  AND user.membership_code IN ('${membershipCode}') ${uType_condition} ${wellnesschampion} ${statusCondition} AND DATE_FORMAT(CONVERT_TZ(\`ent\`.\`added_date\`,'UTC',CASE WHEN \`user\`.\`timezone\` != '' THEN \`user\`.\`timezone\` ELSE 'UTC' END),'%Y-%m-%d') BETWEEN '${allDateArray['actStartDate']}' AND '${allDateArray['actEndDate']}' GROUP BY DATE_FORMAT(CONVERT_TZ(\`ent\`.\`added_date\`,'UTC',CASE WHEN \`user\`.\`timezone\` != '' THEN \`user\`.\`timezone\` ELSE 'UTC' END),'%Y-%m-%d'), user.id`;
                            let getFields = ['ent.id as id','DATE_FORMAT(CONVERT_TZ(`ent`.`added_date`,"UTC",CASE WHEN `user`.`timezone` != "" THEN `user`.`timezone` ELSE "UTC" END),"%Y-%m-%d") as time','user.id as uid','user.role_id as role_id','user.on_insurance_plan as on_insurance_plan','user.is_camp_eligible as is_camp_eligible','user.timezone as timezone','user.location as location','user.department_id as department_id', 'user.gender as gender','TIMESTAMPDIFF(YEAR, user.dob, CURDATE()) AS age'];
                            const joinTableList = [{'alias':'user', 'table' : tableConstant.TBL_USERS, 'on' : '`ent`.`user_id` = `user`.`id`' }];
                            let activityDone = await this.frontPointService.fetch_point_report(tableName, ScheduleChallengeJoinUsersEntity, getFields, { time : 'DESC'}, conditions, joinTableList);
                            chaData['users'] = activityDone;
                            challengeData[k] = chaData;
                        }
                        k++;
                    }
                    catData['challenges'] = challengeData;
                    category[c] = catData;
                }
                c++;
            }
            let returnData = {
                categorys : category,
            }
            return returnData;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
}
