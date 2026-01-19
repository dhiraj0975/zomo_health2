import { CommonDateService, CommonHealthService, CommonService } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Req,
    Res,
    UseGuards
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Request, Response } from "express";
import * as moment from 'moment-timezone';
import { ActivityService } from 'src/modules/activity/activity/activity.service';
import { CategoryService } from 'src/modules/activity/category/category.service';
import { CampaignDashboardService } from 'src/modules/campaign/campaigndashboard/campaigndashboard.service';
import { UrlManageService } from 'src/modules/common';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { FrontService } from '../../campaign/front/front.service';
import { SliderSettingsService } from '../../campaign/slidersettings/slidersettings.service';
import { ActivePluginService } from "../../company/activeplugins/activeplugin.service";
import { InterlinksService } from "../../company/interlinks/interlinks.service";
import { TranslationService } from "../../translation/translation.service";
import { FormInstructionsService } from './forminstructions.service';
import { GetActivitiesInput } from './input';
const S3_URL =  process.env.S3_URL_PROD
@Controller('health-checkup/form-instructions')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class UserFormInstructionsController {
    constructor(
        private readonly formInstructionsService: FormInstructionsService,
        private readonly commonService: CommonService,
        private readonly commonDateService: CommonDateService,
        private readonly commonHealthService: CommonHealthService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly frontService: FrontService,
        private readonly activePluginService: ActivePluginService,
        private readonly sliderSettingsService: SliderSettingsService,
        private readonly interlinksService: InterlinksService,
        private readonly activityService: ActivityService,
        private readonly categoryService: CategoryService,
        private readonly campaignDashboardService: CampaignDashboardService,
        private readonly urlManageService: UrlManageService,

    ) { }
    
    @Post('activities')
    async getActivities(@Req() req: Request, @Res() res: Response, @Body() postData: GetActivitiesInput) {
        try{
            const companyId = req?.tokenUser?.org_id;
            const departmentId = req?.tokenUser?.department_id;
            const userRole = req?.tokenUser?.role_id;
            const user = req?.tokenUser;
            const userId = user?.id;
            const is_camp_eligible = req?.tokenUser?.is_camp_eligible;
            const userHireDate = req?.tokenUser?.date_of_hire || '';
            let returnDatas = {};
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
            if([2,16].includes(userRole)){
                let slectedArr:any = await this.formInstructionsService.getDiseaseIDS({ user_id: req?.tokenUser?.id, status: Not(2) });
                const forminstructions = await this.formInstructionsService.getFormInstructionData({ company_id: companyId, status: Not(2) });
                if(forminstructions){
                    if(forminstructions['date_range'] == 1){
                        Expirationdatepf_start = moment(forminstructions['pf_start_date']).format('YYYY-MM-DD');
                        Expirationdatepf = moment(forminstructions['pf_end_date']).format('YYYY-MM-DD');
                        Expirationdatedvf_start = moment(forminstructions['dvf_start_date']).format('YYYY-MM-DD');
                        Expirationdatedvf = moment(forminstructions['dvf_end_date']).format('YYYY-MM-DD');
                        Expirationdateovf_start = moment(forminstructions['ovf_start_date']).format('YYYY-MM-DD');
                        Expirationdateovf = moment(forminstructions['ovf_end_date']).format('YYYY-MM-DD');
                        Expirationdateta_start = moment(forminstructions['ta_start_date']).format('YYYY-MM-DD');
                        Expirationdateta = moment(forminstructions['ta_end_date']).format('YYYY-MM-DD');
                    }else if(forminstructions['date_range'] == 2){
                        Expirationdate_start = moment(forminstructions['start_date']).format('YYYY-MM-DD');
                        Expirationdate = moment(forminstructions['end_date']).format('YYYY-MM-DD');
                    }
                }
                const physicianpopup = await this.formInstructionsService.getAuthorizationPopupData({ user_id: req?.tokenUser?.id, type_of_form: 'Physician', status: Not(2) });
                const dentalpopup = await this.formInstructionsService.getAuthorizationPopupData({ user_id: req?.tokenUser?.id, type_of_form: 'Dental', status: Not(2) });
                const optometristpopup = await this.formInstructionsService.getAuthorizationPopupData({ user_id: req?.tokenUser?.id, type_of_form: 'Optometrist', status: Not(2) });
                const tabaccousespopup = await this.formInstructionsService.getTobaccousesPopupData({ user_id: req?.tokenUser?.id, type_of_form: 'Tabacco', status: Not(2) });
                let activityLinkData = await this.activityService.getActivityLinks(`status = 1 AND (plugin != '' OR plugin != NULL)`, { 'id': 'ASC'}, ['id','activity_name','plugin','controller','action','newlink']);
                let categoryLinkData = await this.categoryService.getCategoryLinks(`status = 1 AND (plugin != '' OR plugin != NULL)`, { 'id': 'ASC'}, ['id','category_name','plugin','controller','action','newlink']);
                let statuspf = 'Not complete';
                if(physicianpopup){
                    statuspf = 'Complete';
                }
                let statusta = 'Not complete';
                let tabacco_c:any = '';
                let tabacco_d:any = '';
                if(tabaccousespopup){
                    statusta = 'Complete';
                    tabacco_c = tabaccousespopup['user_id'];
                    tabacco_d = tabaccousespopup['signature'];
                }
                let statusden = 'Not complete';
                if(dentalpopup){
                    statusden = 'Complete';
                }
                let statusovf = 'Not complete';
                if(optometristpopup){
                    statusovf = 'Complete';
                }
                
                let activePlugins = await this.activePluginService.getActivePluginList(companyId);
                const formInstructionData = {
                    'forminstructions' : forminstructions,
                    'statuspf' : statuspf,
                    'statusta' : statusta,
                    'statusden' : statusden,
                    'statusovf' : statusovf,
                    'tabacco_c' : tabacco_c,
                    'tabacco_d' : tabacco_d
                };
                const sliderSetting = await this.sliderSettingsService.findOne({ org_id: companyId });
                let campaignsData = [];
                let activitiesData = {};
                if(activePlugins.includes('Incentive')){
                    let labeladdedcommomn = await this.translatorService.frontendReadTranslation(req.lang, 'check_program_start_end_date', `/LC_MESSAGES/Activities/Activities`,`static`);
                    let labeladdedcommomnno = await this.translatorService.frontendReadTranslation(req.lang, 'please_complete_authorization_form', `/LC_MESSAGES/Activities/Activities`,`static`);
                    let m = 0;
                    postData['call_from'] = 10;
                    campaignsData = await this.frontService.getCampaignData(postData, req, ['campaign.id', 'campaign.location_ids', 'campaign.department_ids', 'campaign.campaign_name', 'campaign.tab_titled', 'campaign.tab_order', 'campaign.d_start_date', 'campaign.d_end_date', 'campaign.start_date', 'campaign.end_date']);
                    let allRewardDatas = [];
                    if(campaignsData && campaignsData.length > 0){
                        let skl = 0;
                        for(let campaign of campaignsData){
                            let tmprewardremove = [];
                            let dept_confirm = 1;
                            let location_confirm = 1;
                            if(dept_confirm == 1 && location_confirm == 1){
                                const campaignId = campaign.id;
                                let getRewardCondition: any = `reward.campaign_id = ${campaignId} AND reward.status = 1`;
                                let orderBy = { order_id: 'ASC' };
                                let rewards: any = await this.campaignDashboardService.getRewardsData(getRewardCondition, orderBy);
                                let rewardDatas = [];
                                if(rewards && rewards.length > 0){
                                    let i  = 0;
                                    for(let reward of rewards){
                                        let showRewards = false;
                                        if ((is_camp_eligible == 1 && reward['eligibility'] == 1) || (is_camp_eligible == 0 && reward['eligibility'] == 2)) {
                                            showRewards = true;
                                        }
                                        if ((userRole == 2 && reward['eligibility'] == 7) || (userRole == 2 && is_camp_eligible == 1 && reward['eligibility'] == 3) || (userRole == 2 && is_camp_eligible == 0 && reward['eligibility'] == 4)) {
                                            showRewards = true;
                                        }
                                        if ((userRole == 16 && reward['eligibility'] == 8) || (userRole == 16 && is_camp_eligible == 1 && reward['eligibility'] == 5) || (userRole == 16 && is_camp_eligible == 0 && reward['eligibility'] == 6)) {
                                            showRewards = true;
                                        }
                                        if(reward['eligibility'] == 0 || showRewards){
                                            let category = [];
                                            let activity = [];
                                            if (reward['related_category'] != "") {
                                                category = await this.campaignDashboardService.rewardItemGetDetails('related_category', reward);
                                            }
                                            if (reward['related_activity'] != "") {
                                                activity = await this.campaignDashboardService.rewardItemGetDetails('related_activity', reward);
                                                let k = 0;
                                                if(activity && activity.length > 0){
                                                    for(let act of activity){
                                                        if(reward['hire_date'] && reward['hire_date'] == 1 && reward['hire_date_count'] && reward['hire_date_count'] > 0){
                                                            act['end_date'] = this.commonDateService.getTodayDate(act['start_date']).add(reward['hire_date_count'], 'days').format('YYYY-MM-DD');
                                                        }
                                                        if (reward['hire_date'] && reward['hire_date'] == 1) {
                                                            let actStartDate:any = await this.commonDateService.DateTimeFormat(act['start_date'],'timestamp');
                                                            let actEndDate:any = await this.commonDateService.DateTimeFormat(act['end_date'],'timestamp');
                                                            let totaldays = 0;
                                                            totaldays =  Math.floor((actEndDate - actStartDate) / (60 * 60 * 24)) + 1;
                                                            const hireDates:any =  await this.commonDateService.DateTimeFormat(userHireDate,'timestamp');
                                                            if (userHireDate != '' && actStartDate < hireDates) {
                                                                let newStartDate = await this.commonDateService.DateTimeFormat(userHireDate,'YYYY-MM-DD');
                                                                act['start_date'] = newStartDate;
                                                                act['end_date'] = this.commonDateService.getTodayDate(newStartDate).add(totaldays, 'days').format('YYYY-MM-DD');
                                                            }
                                                        }
                                                        let cat_index = -1;
                                                        for (let d = 0; d < category.length; d++) {
                                                            if (act?.['category'] && category?.[d]?.['category'] && act['category']['id'] == category[d]['category']['id']) {
                                                                if (cat_index == -1) {
                                                                    cat_index = d;
                                                                }
                                                            }
                                                        }
                                                        if (cat_index > -1) {
                                                            if (!category[cat_index].activity) {
                                                                category[cat_index].activity = []; // Ensure the 'activity' property is initialized as an array
                                                            }
                                                            category[cat_index].activity.push(act); // Append the activity
                                                            activity[k] = {};
                                                        }
                                                        k++;
                                                    }
                                                }
                                            }
                                            reward['Campaignactivity'] = activity;
                                            reward['Campaigncategory'] = category;
                                            rewardDatas.push(reward);
                                        }
                                        i++;
                                    }
                                }
                                campaign['rewards'] = rewardDatas;
                                if(rewardDatas && rewardDatas.length > 0){
                                    allRewardDatas = [...allRewardDatas, ...rewardDatas];
                                }
                            }
                            skl++;
                        }
                    }

                    let getActivitysId: any = [];
                    if (allRewardDatas.length > 0) {
                        if (allRewardDatas.length > 1) {
                            getActivitysId = allRewardDatas
                            .map(reward => reward.Campaignactivity?.map((activity: any) => activity?.activity?.id) || [])
                            .flat();
                        } else {
                            if (allRewardDatas[0]?.Campaignactivity) {
                                getActivitysId = allRewardDatas[0].Campaignactivity.map((activity: any) => activity?.activity?.id);
                            }
                        }
                    }
                    getActivitysId = getActivitysId.filter(item => item !== undefined && item !== null && item !== '');
                    const sanMateoActivityIds: number[] = [2, 3, 4, 5, 12, 13, 14, 126];
                    const result = [...new Set(getActivitysId.filter(id => sanMateoActivityIds.includes(id)))];
                    let planActivities = await this.formInstructionsService.getMyPlanActivities(`mpassignplan.org_id = ${companyId} AND mpaactivity.activity_id in (${sanMateoActivityIds.join(',')}) AND mpaactivity.status = 1`, ['mpaactivity.activity_id as activity_id', 'inactivity.description as description']);
                    const filteredActivities = Object.fromEntries(
                        Object.entries(planActivities).filter(([key]) => !getActivitysId.includes(Number(key)))
                    );
                    let showTab = 1;
                    let campaignList = [];

                    if(sliderSetting && sliderSetting?.['activity_page_tab'] == 0){
                        showTab = 0;
                        if (campaignsData.length >= 1) {
                            campaignList[0] = campaignsData[0];
                        }
                    }
                    if(showTab == 1){
                        campaignList = campaignsData;
                    }
                    if(!returnDatas['tabSetting']){
                        returnDatas['tabSetting'] = 0;
                    }
                    returnDatas['tabSetting'] = showTab;
                    let dateTitle = await this.translatorService.frontendReadTranslation(req.lang, 'Completion Deadline', `/LC_MESSAGES/Campaign/Campaigns`,`static`);
                    if(!returnDatas['dateTitle']){
                        returnDatas['dateTitle'] = '';
                    }
                    returnDatas['dateTitle'] = dateTitle;
                    if (companyId == 804) { /* Static condition for county of san mateo */
                        returnDatas['showCompletionDate'] = 0;
                        let finalDataArray = [];
                        let ssolinkdata804 = await this.commonService.userDataToSamlRequest(req?.tokenUser, 'view', '1', '0');
                        let ssoLink804 = 'https://sso.preventioncloud.com/ehealth?SAMLRequest='+ssolinkdata804;
                        const activityIds = [2, 3, 4, 5, 12, 13, 14, 126];
                        let hireDate = 0;
                        const startEndDt:any = new Map();
                        for (let rewRaw of allRewardDatas){
                            hireDate = rewRaw['hire_date'];
                            if(rewRaw['Campaignactivity']){
                                for (let act of rewRaw['Campaignactivity']){
                                    if(act?.activity_id && act?.activity_id != '' && activityIds.includes(act.activity_id)){
                                        if (!startEndDt[act.activity_id]) {
                                            startEndDt[act.activity_id] = [];
                                        }
                                        startEndDt[act.activity_id].push(act.start_date, act.end_date);
                                    }
                                }
                            }
                        }
                        let currentDate = await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD');
                        let currentDateTimeStemp = await this.commonDateService.DateTimeFormat(currentDate,'timestamp');
                        let start_common_date = '';
                        let end_common_date = '';
                        let pf_start_date = '';
                        let pf_end_date = '';
                        if(hireDate == 1){
                            if(startEndDt[2]){
                                let pfstdt = startEndDt[2][0].split(' ');
                                let pfendt = startEndDt[2][1].split(' ');
                                pf_start_date = pfstdt[0];
                                pf_end_date = pfendt[0];
                            }
                        }else{
                            start_common_date = Expirationdate_start;
                            end_common_date = Expirationdate;
                            pf_start_date = Expirationdatepf_start;
                            pf_end_date = Expirationdatepf;
                        }
                        let start_common_dateTS = (start_common_date != '') ? await this.commonDateService.DateTimeFormat(start_common_date, 'timestamp') : '';
                        let end_common_dateTS = (end_common_date != '') ?  await this.commonDateService.DateTimeFormat(end_common_date, 'timestamp') : '';
                        let pfStartDateTS = (pf_start_date != '') ? await this.commonDateService.DateTimeFormat(pf_start_date, 'timestamp') : '';
                        let pfEndDateTS = (pf_end_date != '') ?  await this.commonDateService.DateTimeFormat(pf_end_date, 'timestamp') : '';
                        let program_selections = forminstructions?.['program_selection']?.split(',') || [];
                        let tobacco_form_option = forminstructions?.['tobacco_form_option'] || 0;
                        let formfaxno = '713-714-2273';
                        if (forminstructions) {
                            if (forminstructions?.fax_number) {
                                formfaxno = forminstructions['fax_number'];
                            }
                        }
                        let formDownloadText = await this.translatorService.frontendReadTranslation(req.lang, 'Form Download', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                        let hipaaReleaseOnlineText = await this.translatorService.frontendReadTranslation(req.lang, 'HIPAA Release Online', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                        let physiciandownload = '';
                        let physiciandownloadLink = '';
                        let physician_update = '';
                        let physician_updateLink = '';
                        let physician_content = '';
                        let physician_content_1 = '';
                        let physicianLinkPara = {};
                        let physiciandownloadMessage = '';
                        if(program_selections.includes('1') || startEndDt[2]){
                            let Physician = 'Physician Visit Packet';
                            if (statuspf == "Not complete") {
                                physiciandownload = formDownloadText;
                                physiciandownloadLink = '#';
                                physiciandownloadMessage = labeladdedcommomnno;
                            }else if(currentDateTimeStemp >= pfStartDateTS && currentDateTimeStemp <= pfEndDateTS){
                                if(hireDate == 1){
                                    physiciandownload = formDownloadText;
                                    physiciandownloadLink = `/health-checkup/form-instructions/get-one`;
                                    physicianLinkPara = { 'type' : 'Physician', 'startdate': pf_start_date, 'enddate': pf_end_date };
                                }else{
                                    physiciandownload = formDownloadText;
                                    physiciandownloadLink = `/health-checkup/form-instructions/get-one`;
                                    physicianLinkPara = { 'type' : 'Physician'};
                                }
                            }else if(currentDateTimeStemp >= start_common_dateTS && currentDateTimeStemp <= end_common_dateTS){
                                physiciandownload = formDownloadText;
                                physiciandownloadLink = `/health-checkup/form-instructions/get-one`;
                                physicianLinkPara = { 'type' : 'Physician'};
                            }else{
                                physiciandownload = formDownloadText;
                                physiciandownloadLink = '#';
                                physiciandownloadMessage = labeladdedcommomn;
                            }
                            physician_update = hipaaReleaseOnlineText;
                            physician_updateLink = `/health-checkup/authorizations/sign-auth`;
                            physician_content = `Form which provides your physician instructions on how to enter confirmation of your biometric data on this website.`;
                            physician_content_1 = `<span class="timeline-content">To Complete The Physician Visit Packet Follow The Instructions Below:</span>
                                <ol class="timeline-content timeline-content_1">
									<li>Complete the HIPAA Release Online by clicking "HIPAA Release Online" below (you have to complete this in order to download the Physician Visit Packet).</li>
									<li>Click on "Form Download" below to Download the form.  Print a copy to take to your physician visit.</li>
									<li>Take all pages to your physician and have them submit the forms which are contained within the packet. The physician can submit the forms by entering the data on https://www.preventioncloud.com/forms or by sending a fax to ${formfaxno}.</li>
								</ol><br>`;
                            physician_content_1 = await this.urlManageService.onmapUrlContent(physician_content_1);
                        }
                        if(allRewardDatas.length > 0){
                            for (let rewRwos of allRewardDatas){
                                const rewardId = rewRwos['id'];
                                const campaignId = rewRwos['campaign_id'];
                                let inCamId = '';
                                if (showTab == 0) {
                                    inCamId = rewRwos['campaign_id'];
                                }
                                if (rewRwos['campaign_id'] == inCamId) {
                                    if(rewRwos['Campaignactivity'] && rewRwos['Campaignactivity'].length > 0){
                                        for (let act of rewRwos['Campaignactivity']){
                                            let actName = '';
                                            let actDescription = '';
                                            const rewActId = act['id'];
                                            if(Object.keys(act).length > 0){
                                                if (act?.['activity'] && (act['activity']['id'] == 2 || act['activity']['id'] == 126)) {
                                                    actName = await this.translatorService.frontendReadTranslation(req.lang,`activity_name_${campaignId}_${rewardId}_${rewActId}`, `/LC_MESSAGES/Campaign/Campaigns/${companyId}/${campaignId}`,`dynamic`);
                                                    if(act['cust_name'] && act['cust_name'] != ''){
                                                        actName = (actName == '' || actName == `activity_name_${campaignId}_${rewardId}_${rewActId}`) ? act['cust_name'] : actName;
                                                    }else{
                                                        actName = (actName == '' || actName == `activity_name_${campaignId}_${rewardId}_${rewActId}`) ? act?.['activity']?.['activity_name'] : actName;
                                                    }   
                                                    actDescription = await this.translatorService.frontendReadTranslation(req.lang,`activity_desc_${campaignId}_${rewardId}_${rewActId}`, `/LC_MESSAGES/Campaign/Campaigns/${companyId}/${campaignId}`,`dynamic`);
                                                    if(act['cust_description'] && act['cust_description'] != ''){
                                                        actDescription = (actDescription == '' || actDescription == `activity_desc_${campaignId}_${rewardId}_${rewActId}`) ? act['cust_description'] : actDescription;
                                                    }else{
                                                        actDescription = (actDescription == '' || actDescription == `activity_desc_${campaignId}_${rewardId}_${rewActId}`) ? act?.['activity']?.['description'] : actDescription;
                                                    }
                                                    actDescription = await this.urlManageService.onmapUrlContent(actDescription);
                                                    if([818,1021].includes(companyId)){
                                                        actDescription = actDescription.replace(' or by sending a fax to 713-714-2273', '');
                                                    }
                                                    let oid = '';
                                                    if (act['order_id'] != "" && act['order_id'] != 0) {
                                                        oid = act['order_id'];
                                                    }
                                                    let ReqBy = "N";
                                                    if (act['required_by_user'] == "Y" || act['required_by_user'] == "Y") {
                                                        ReqBy = "Y";
                                                    }
                                                    let dateorder:any = "";
                                                    if (act['end_date'] != "" && act['end_date'] != 0) {
                                                        dateorder = await this.commonDateService.DateTimeFormat(act['end_date'], 'timestamp');
                                                    }
                                                    const activityName = (act?.['activity']?.['activity_name'] != null) ? act?.['activity']?.['activity_name'].toLowerCase() : '';
                                                    let activityButtonData = [];
                                                    let diseaseFormsData = [];
                                                    if(activityName.includes('physician form') || activityName.includes('physician visit')){
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
                                                                'linkParameter' : physicianLinkPara,
                                                                'message' : physiciandownloadMessage,
                                                                'redirectType' : 0
                                                            }
                                                        ];
                                                    }
                                                    let NewActivityArray = [
                                                        { 
                                                            'id': rewActId, 
                                                            'campaign_id': campaignId,
                                                            'reward_id': rewardId,
                                                            'name': actName, 
                                                            'dateorder': dateorder, 
                                                            'ReqBy': ReqBy, 
                                                            'order_id': oid,
                                                            'description': actDescription, 
                                                            'start_date': await this.commonDateService.DateTimeFormat(act['start_date'], 'MM-DD-YYYY'), 
                                                            'end_date': await this.commonDateService.DateTimeFormat(act['end_date'], 'MM-DD-YYYY'), 
                                                            'buttonData' : activityButtonData
                                                        }
                                                    ];
                                                    finalDataArray = [...finalDataArray, ...NewActivityArray];
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        let show_static_data = 0;
                        if (activePlugins.includes('Incentive') && allRewardDatas.length == 0) {
                            show_static_data = 1;
                        } else if (activePlugins.includes('Incentive') && allRewardDatas.length > 0) {
                            if (!activityIds.some(id => getActivitysId.includes(id))) {
                                show_static_data = 1;
                            }
                        }
                        if(show_static_data == 1 && filteredActivities && Object.keys(filteredActivities).length > 0){
                            if(!returnDatas['pageTitle']){
                                returnDatas['pageTitle'] = '';
                            }
                            returnDatas['pageTitle'] = 'Physician Visit Form, Onsite Wellness Screening, Offsite Lab Screening, or Home Test Screening';
                            let NewActivityArray = [
                                {
                                    'name' : 'Option 1 Physician Visit Form',
                                    'description' : `<ol> <li><span>Complete the HIPAA Release Online Form (required).</span></li> <li><span>Click "Form Download" below and print a copy to take to your physician visit.</span></li> <li><span>Depending on your healthcare provider, review the instructions on the form to determine how to get your form completed.</span></li> </ol>` ,
                                    'buttonData' : [
                                        { 
                                            'name': physician_update, 
                                            'link': physician_updateLink || '',
                                        },
                                        {
                                            'name': physiciandownload, 
                                            'link': physiciandownloadLink || '',
                                        }
                                    ]
                                },
                                {
                                    'name' : 'Option 2 Onsite Wellness Screening',
                                    'description' : `<ol> <li> Click the following link to register for your onsite screening appointment - <a href="${ssoLink804}" target="_blank">Click here</a> </li> </ol>`, 
                                },
                                {
                                    'name' : 'Option 3 Offsite Lab Screening',
                                    'description' : `<ol> <li> Click the following link and follow the full instructions to reserve your LabCorp appointment time - <a href="${ssoLink804}" target="_blank">Click here</a> </li> <li> Bring to your appointment: 1. Your Lab Order Form (this form will be emailed to you from <a href="mailto:service@ehealthscreenings.com">service@ehealthscreenings.com</a> within 1 hour of scheduling your appointment) 2. Your Photo ID. 3. Your Insurance Card. </li> <li>LabCorp will submit your form and information to Zomo Health 3 weeks after the visit.</li> </ol>`, 
                                },
                                {
                                    'name' : 'Option 4 Home Test Screening',
                                    'description' : `<ol> <li> Click the following link to download your register for your home test screening - <a href="${ssoLink804}" target="_blank">Click here</a> </li> </ol>`, 
                                }
                            ];
                            finalDataArray = [...finalDataArray, ...NewActivityArray];
                        }
                        const sortedUserArray = finalDataArray.sort((a, b) => {
                            if (a.order_id === 0 || a.order_id === undefined) return 1;
                            if (b.order_id === 0 || b.order_id === undefined) return -1;
                            return a.order_id - b.order_id;
                        });
                        if(!returnDatas['datas']){
                            returnDatas['datas'] = [];
                        }
                        returnDatas['datas'] = finalDataArray;
                    }else{
                        returnDatas['showCompletionDate'] = 1;
                        let pageTitle = '';
                        if(sliderSetting){
                            pageTitle = 'My Activities';
                        } 
                        if(showTab == 0){
                            returnDatas['pageTitle'] = pageTitle;
                        }
                        let tabListData = [];
                        if(showTab == 1 && campaignList.length > 1){
                            for(let campaign of campaignList){
                                const campaignId = campaign.id;
                                let camName = await this.translatorService.frontendReadTranslation(req.lang,`campaign_name_${campaignId}`, `/LC_MESSAGES/Campaign/Campaigns/${companyId}/${campaignId}`,`dynamic`);
                                camName = (camName == '' || camName == `campaign_name_${campaignId}`) ? campaign['campaign_name'] : camName;
                                campaign['campaign_name'] = camName;
                                tabListData.push({ id: campaignId, title: campaign['campaign_name'] });
                            }
                        }else{
                            tabListData.push({ id: 0, title: 'General' });
                        }
                        if(campaignList.length == 0){
                            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_CAMPAIGN_RECORD_NOT_FOUND'));
                        }
                        let finalDataArray = [];
                        if(campaignList.length > 0){
                            let internalLinkData: any = await this.interlinksService.listRecord({status: 1},{ 'id': 'ASC'}, ['id','linktitle','plugin','controller','action','newlink']);
                            for(let campaignRaw of campaignList){
                                if(showTab == 1){
                                    if(!activitiesData[`${campaignRaw.id}`]){
                                        activitiesData[`${campaignRaw.id}`] = {};
                                    }
                                    let camName = await this.translatorService.frontendReadTranslation(req.lang,`campaign_name_${campaignRaw.id}`, `/LC_MESSAGES/Campaign/Campaigns/${companyId}/${campaignRaw.id}`,`dynamic`);
                                    if(camName == '' || camName == `campaign_name_${campaignRaw.id}`){
                                        camName = campaignRaw['campaign_name'];
                                    }
                                    let tabTitle = await this.translatorService.frontendReadTranslation(req.lang,`campaign_tab_titled_${campaignRaw.id}`, `/LC_MESSAGES/Campaign/Campaigns/${companyId}/${campaignRaw.id}`,`dynamic`);
                                    if(tabTitle == '' || tabTitle == `campaign_tab_titled_${campaignRaw.id}`){
                                        tabTitle = campaignRaw['tab_titled'];
                                    }
                                    activitiesData[`${campaignRaw.id}`]['id'] = campaignRaw.id;
                                    activitiesData[`${campaignRaw.id}`]['campaign_name'] = camName;
                                    activitiesData[`${campaignRaw.id}`]['tab_title'] = tabTitle;
                                    activitiesData[`${campaignRaw.id}`]['tab_order'] = campaignRaw?.tab_order || 0;
                                    if(!activitiesData[`${campaignRaw.id}`]['activitys']){
                                        activitiesData[`${campaignRaw.id}`]['activitys'] = [];
                                    }
                                }
                                const activityIds = [2, 3, 4, 5, 12, 13, 14];
                                let hireDate = 0;
                                const startEndDt:any = new Map();
                                for (let rewRaw of allRewardDatas){
                                    hireDate = rewRaw['hire_date'];
                                    if(rewRaw['Campaignactivity']){
                                        for (let act of rewRaw['Campaignactivity']){
                                            if(act?.activity_id && act?.activity_id != '' && activityIds.includes(act.activity_id)){
                                                if (!startEndDt[act.activity_id]) {
                                                    startEndDt[act.activity_id] = [];
                                                }
                                                startEndDt[act.activity_id].push(act.start_date, act.end_date);
                                            }
                                        }
                                    }
                                }
                                let currentDate = await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD');
                                let currentDateTimeStemp = await this.commonDateService.DateTimeFormat(currentDate,'timestamp');
                                let start_common_date = '';
                                let end_common_date = '';
                                let start_date = '';
                                let end_date = '';
                                let pf_start_date = '';
                                let pf_end_date = '';
                                let dvf_start_date = '';
                                let dvf_end_date = '';
                                let ovf_start_date = '';
                                let ovf_end_date = '';
                                let ta_start_date = '';
                                let ta_end_date = '';
                                if(hireDate == 1){
                                    start_date = Expirationdate_start;
                                    end_date = Expirationdate;
                                    if(startEndDt[2]){
                                        let pfstdt = startEndDt[2][0].split(' ');
                                        let pfendt = startEndDt[2][1].split(' ');
                                        pf_start_date = pfstdt[0];
                                        start_common_date = pfstdt[0];
                                        pf_end_date = pfendt[0];
                                        end_common_date = pfendt[0];
                                    }
                                    if(startEndDt[3]){
                                        let dvstdt = startEndDt[3][0].split(' ');
                                        let dvendt = startEndDt[3][1].split(' ');
                                        dvf_start_date = dvendt[0];
                                        start_common_date = dvendt[0];
                                        dvf_end_date = dvendt[0];
                                        end_common_date = dvendt[0];
                                    }
                                    if(startEndDt[5]){
                                        let ovstdt = startEndDt[5][0].split(' ');
                                        let ovendt = startEndDt[5][1].split(' ');
                                        ovf_start_date = ovstdt[0];
                                        start_common_date = ovstdt[0];
                                        ovf_end_date = ovendt[0];
                                        end_common_date = ovendt[0];
                                    }
                                    if(startEndDt[4]){
                                        let tastdt4 = startEndDt[4][0].split(' ');
                                        let taendt4 = startEndDt[4][1].split(' ');
                                        ta_start_date = tastdt4[0];
                                        start_common_date = tastdt4[0];
                                        ta_end_date = taendt4[0];
                                        end_common_date = taendt4[0];
                                    }
                                    if(startEndDt[12]){
                                        let tastdt12 = startEndDt[12][0].split(' ');
                                        let taendt12 = startEndDt[12][1].split(' ');
                                        ta_start_date = tastdt12[0];
                                        start_common_date = tastdt12[0];
                                        ta_end_date = taendt12[0];
                                        end_common_date = taendt12[0];
                                    }
                                    if(startEndDt[13]){
                                        let tastdt13 = startEndDt[13][0].split(' ');
                                        let taendt13 = startEndDt[13][1].split(' ');
                                        ta_start_date = tastdt13[0];
                                        start_common_date = tastdt13[0];
                                        ta_end_date = taendt13[0];
                                        end_common_date = taendt13[0];
                                    }
                                    if(startEndDt[14]){
                                        let tastdt14 = startEndDt[14][0].split(' ');
                                        let taendt14 = startEndDt[14][1].split(' ');
                                        ta_start_date = tastdt14[0];
                                        start_common_date = tastdt14[0];
                                        ta_end_date = taendt14[0];
                                        end_common_date = taendt14[0];
                                    }
                                }else{
                                    start_common_date = Expirationdate_start;
                                    end_common_date = Expirationdate;
                                    pf_start_date = Expirationdatepf_start;
                                    pf_end_date = Expirationdatepf;
                                    dvf_start_date = Expirationdatedvf_start;
                                    dvf_end_date = Expirationdatedvf;
                                    ovf_start_date = Expirationdateovf_start;
                                    ovf_end_date = Expirationdateovf;
                                    ta_start_date = Expirationdateta_start;
                                    ta_end_date = Expirationdateta;
                                }
                                let start_common_dateTS = (start_common_date != '') ? await this.commonDateService.DateTimeFormat(start_common_date, 'timestamp') : '';
                                let end_common_dateTS = (end_common_date != '') ?  await this.commonDateService.DateTimeFormat(end_common_date, 'timestamp') : '';
                                let pfStartDateTS = (pf_start_date != '') ? await this.commonDateService.DateTimeFormat(pf_start_date, 'timestamp') : '';
                                let pfEndDateTS = (pf_end_date != '') ?  await this.commonDateService.DateTimeFormat(pf_end_date, 'timestamp') : '';
                                let a = physicianpopup?.['user_id'] || '';
                                let b = physicianpopup?.['signature'] || '';
                                let c = tabaccousespopup?.['user_id'] || '';
                                let d = tabaccousespopup?.['signature'] || '';
                                let tobaccoCOmpleted:any = "";
                                if (tabaccousespopup?.date_completed) {
                                    tobaccoCOmpleted = tabaccousespopup?.date_completed;
                                    tobaccoCOmpleted = await this.commonDateService.DateTimeFormat(tobaccoCOmpleted,'YYYY-MM-DD');
                                }
                                let e = dentalpopup?.['user_id'] || '';
                                let f = dentalpopup?.['signature'] || '';
                                let g = optometristpopup?.['user_id'] || '';
                                let h = optometristpopup?.['signature'] || '';
                                let program_selections = forminstructions?.['program_selection']?.split(',') || [];
                                let optionalpage = forminstructions?.['optionalpage']?.split(',') || [];
                                let prevent_option = forminstructions?.['prevent_option'] || '';
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
                                let tobacco_form_option = forminstructions?.['tobacco_form_option'] || 0;
                                let formfaxno = '713-714-2273';
                                if (forminstructions) {
                                    if (forminstructions?.fax_number) {
                                        formfaxno = forminstructions['fax_number'];
                                    }
                                }
                                let formDownloadText = await this.translatorService.frontendReadTranslation(req.lang, 'Form Download', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                                let hipaaReleaseOnlineText = await this.translatorService.frontendReadTranslation(req.lang, 'HIPAA Release Online', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                                let OnlineText = await this.translatorService.frontendReadTranslation(req.lang, 'Online Form', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                                let DownloadText = await this.translatorService.frontendReadTranslation(req.lang, 'Download', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                                let AuthorizationFormText = await this.translatorService.frontendReadTranslation(req.lang, 'Authorization form', `/LC_MESSAGES/Dashboard/ParticipationSummary`,`static`);
                                let physiciandownload = '';
                                let preventdownload = '';
                                let physiciandownloadLink = '';
                                let preventdownloadLink = '';
                                let physician_update = '';
                                let physician_updateLink = '';
                                let physiciandownloadMessage = '';
                                let preventdownloadMessage = '';
                                let physicianLinkPara = {};
                                let preventLinkPara = {};
                                if(program_selections.includes('1') || startEndDt[2]){
                                    let Physician = 'Physician Visit Packet';
                                    if (statuspf == "Not complete") {
                                        physiciandownload = formDownloadText;
                                        physiciandownloadLink = '#';
                                        physiciandownloadMessage = labeladdedcommomnno;
                                        preventdownload = formDownloadText;
                                        preventdownloadLink = '#';
                                        preventdownloadMessage = labeladdedcommomnno;
                                    }else if(currentDateTimeStemp >= pfStartDateTS && currentDateTimeStemp <= pfEndDateTS){
                                        if(hireDate == 1){
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
                                            physicianLinkPara = { 'type' : 'Physician' };
                                            preventdownloadLink = `/health-checkup/form-instructions/get-one`;
                                            preventLinkPara = { 'type' : 'Physician', 'is_prevent': para };
                                        }
                                    }else if(currentDateTimeStemp >= start_common_dateTS && currentDateTimeStemp <= end_common_dateTS){
                                        physiciandownload = formDownloadText;
                                        preventdownload = formDownloadText;
                                        physiciandownloadLink = `/health-checkup/form-instructions/get-one`;
                                        physicianLinkPara = { 'type' : 'Physician' };
                                        preventdownloadLink = `/health-checkup/form-instructions/get-one`;
                                        preventLinkPara = { 'type' : 'Physician', 'is_prevent': para };
                                    }else{
                                        physiciandownload = formDownloadText;
                                        physiciandownloadLink = '#';
                                        physiciandownloadMessage = labeladdedcommomn;
                                        preventdownload = formDownloadText;
                                        preventdownloadLink = '#';
                                        preventdownloadMessage = labeladdedcommomn;
                                    }
                                    physician_update = hipaaReleaseOnlineText;
                                    physician_updateLink = `/health-checkup/authorizations/sign-auth`;
                                }else{
                                    physiciandownload = formDownloadText;
                                    physiciandownloadLink = '#';
                                    physiciandownloadMessage = labeladdedcommomn;
                                    preventdownload = formDownloadText;
                                    preventdownloadLink = '#';
                                    preventdownloadMessage = labeladdedcommomn;
                                    physician_update = hipaaReleaseOnlineText;
                                    physician_updateLink = `/health-checkup/authorizations/sign-auth`;
                                }
                                let dentaldownload = '';
                                let dentaldownloadLink = '';
                                let dentaldownloadMessage = '';
                                let dental_update = '';
                                let dental_updateLink = '';
                                let dental_printauth = '';
                                let dental_printauthLink = '';
                                let dental_printauthMessage = '';
                                let dentalLinkPara = {};
                                if(program_selections.includes('2') || startEndDt[3]){
                                    let Dental = 'Dental Visit Packet';
                                    let dvfStartDateTS = (dvf_start_date != '') ? await this.commonDateService.DateTimeFormat(dvf_start_date, 'timestamp') : '';
                                    let dvfEndDateTS = (dvf_end_date != '') ?  await this.commonDateService.DateTimeFormat(dvf_end_date, 'timestamp') : '';
                                    if (statusden == "Not complete") {
                                        dentaldownload = formDownloadText;
                                        dentaldownloadLink = '#';
                                        dentaldownloadMessage = labeladdedcommomnno;
                                    }else if(currentDateTimeStemp >= dvfStartDateTS && currentDateTimeStemp <= dvfEndDateTS){
                                        if(hireDate == 1){
                                            dentaldownload = formDownloadText;
                                            dentaldownloadLink = `/health-checkup/form-instructions/get-one`;
                                            dentalLinkPara = { 'type' : 'Dentist', 'startdate': dvf_start_date, 'enddate': dvf_end_date };
                                        }else{
                                            dentaldownload = formDownloadText;
                                            dentaldownloadLink = `/health-checkup/form-instructions/get-one`;
                                            dentalLinkPara = { 'type' : 'Dentist' };
                                        }
                                    }else if(currentDateTimeStemp >= start_common_dateTS && currentDateTimeStemp <= end_common_dateTS){
                                        dentaldownload = formDownloadText;
                                        dentaldownloadLink = `/health-checkup/form-instructions/get-one`;
                                        dentalLinkPara = { 'type' : 'Dentist' };
                                    }else{
                                        dentaldownload = formDownloadText;
                                        dentaldownloadLink = '#';
                                        dentaldownloadMessage = labeladdedcommomn;
                                    }
                                    dental_update = hipaaReleaseOnlineText;
                                    dental_updateLink = `/health-checkup/authorizations/dental-use`;
                                }else{
                                    dentaldownload = formDownloadText;
                                    dentaldownloadLink = '#';
                                    dentaldownloadMessage = labeladdedcommomn;
                                    dental_printauth = hipaaReleaseOnlineText;
                                    dental_printauthLink = `#`;
                                    dental_printauthMessage = labeladdedcommomn;
                                    dental_update = hipaaReleaseOnlineText;
                                    dental_updateLink = `/health-checkup/authorizations/dental-use`;
                                }
                                let optometristdownload = '';
                                let optometristdownloadLink = '';
                                let optometristdownloadMessage = '';
                                let optometrist_update = '';
                                let optometrist_updateLink = '';
                                let optometristLinkPara = {};
                                if(program_selections.includes('3') || startEndDt[5]){
                                    let Optometrist = 'Optometrist Visit Packet';
                                    let ovfStartDateTS = (ovf_start_date != '') ? await this.commonDateService.DateTimeFormat(ovf_start_date, 'timestamp') : '';
                                    let ovfEndDateTS = (ovf_end_date != '') ?  await this.commonDateService.DateTimeFormat(ovf_end_date, 'timestamp') : '';
                                    if (statusovf == "Not complete") {
                                        optometristdownload = formDownloadText;
                                        optometristdownloadLink = '#';
                                        optometristdownloadMessage = labeladdedcommomnno;
                                    }else if(currentDateTimeStemp >= ovfStartDateTS && currentDateTimeStemp <= ovfEndDateTS){
                                        if(hireDate == 1){
                                            optometristdownload = formDownloadText;
                                            optometristdownloadLink = `/health-checkup/form-instructions/get-one`;
                                            optometristLinkPara = { 'type' : 'Optometrist', 'startdate': ovf_start_date, 'enddate': ovf_end_date };
                                        }else{
                                            optometristdownload = formDownloadText;
                                            optometristdownloadLink = `/health-checkup/form-instructions/get-one`;
                                            optometristLinkPara = { 'type' : 'Optometrist' };
                                        }
                                    }else if(currentDateTimeStemp >= start_common_dateTS && currentDateTimeStemp <= end_common_dateTS){
                                        optometristdownload = formDownloadText;
                                        optometristdownloadLink = `/health-checkup/form-instructions/get-one`;
                                        optometristLinkPara = { 'type' : 'Optometrist' };
                                    }else{
                                        optometristdownload = formDownloadText;
                                        optometristdownloadLink = '#';
                                        optometristdownloadMessage = labeladdedcommomn;
                                    }
                                    optometrist_update = hipaaReleaseOnlineText;
                                    optometrist_updateLink = `/health-checkup/authorizations/optometrist-use`;
                                }else{
                                    optometristdownload = formDownloadText;
                                    optometristdownloadLink = '#';
                                    optometristdownloadMessage = labeladdedcommomn;
                                    optometrist_update = hipaaReleaseOnlineText;
                                    optometrist_updateLink = `/health-checkup/authorizations/optometrist-use`;
                                }
                                let tobaccodownload = '';
                                let tobaccodownloadLink = '';
                                let tobaccodownloadMessage = '';
                                let tobacco_update = '';
                                let tobacco_updateLink = '';
                                let tobacco_printauth = '';
                                let tobacco_printauthLink = '';
                                let tobacco_printauthMessage = '';
                                let tobaccoLinkPara = {};
                                let printLinkPara = {};
                                if(program_selections.includes('4') || startEndDt[4] || startEndDt[12] || startEndDt[13] || startEndDt[14]){
                                    let Tobacco = 'Tobacco Visit Packet';
                                    let taStartDateTS = (ta_start_date != '') ? await this.commonDateService.DateTimeFormat(ta_start_date, 'timestamp') : '';
                                    let taEndDateTS = (ta_end_date != '') ?  await this.commonDateService.DateTimeFormat(ta_end_date, 'timestamp') : '';
                                    if(currentDateTimeStemp >= taStartDateTS && currentDateTimeStemp <= taEndDateTS){
                                        if(hireDate == 1){
                                            tobaccodownload = formDownloadText;
                                            tobaccodownloadLink = `/health-checkup/form-instructions/get-one`;
                                            tobaccoLinkPara = { 'type' : 'Tobacco', 'startdate': ta_start_date, 'enddate': ta_end_date };
                                            tobacco_printauth = AuthorizationFormText;
                                            tobacco_printauthLink = `/health-checkup/form-instructions/get-one`;
                                            printLinkPara = { 'type' : 'Tobacco-auth', 'c': c, 'd': d, 'open': 'open' };
                                        }else{
                                            tobaccodownload = formDownloadText;
                                            tobaccodownloadLink = `/health-checkup/form-instructions/get-one`;
                                            tobaccoLinkPara = { 'type' : 'Tobacco' };
                                            tobacco_printauth = AuthorizationFormText;
                                            tobacco_printauthLink = `/health-checkup/form-instructions/get-one`;
                                            printLinkPara = { 'type' : 'Tobacco-auth', 'c': c, 'd': d, 'open': 'open' };
                                        }
                                    }else if(currentDateTimeStemp >= start_common_dateTS && currentDateTimeStemp <= end_common_dateTS){
                                        tobaccodownload = formDownloadText;
                                        tobaccodownloadLink = `/health-checkup/form-instructions/get-one`;
                                        tobaccoLinkPara = { 'type' : 'Tobacco' };
                                        tobacco_printauth = AuthorizationFormText;
                                        tobacco_printauthLink = `/health-checkup/form-instructions/get-one`;
                                        printLinkPara = { 'type' : 'Tobacco-auth', 'c': c, 'd': d, 'open': 'open' };
                                    }else{
                                        tobaccodownload = formDownloadText;
                                        tobaccodownloadLink = '#';
                                        tobaccodownloadMessage = labeladdedcommomn;
                                        tobacco_printauth = AuthorizationFormText;
                                        tobacco_printauthLink = `#`;
                                        tobacco_printauthMessage = labeladdedcommomn;
                                    }
                                    tobacco_update = OnlineText;
                                    tobacco_updateLink = `/health-checkup/authorizations/tobacco-use`;
                                }else{
                                    tobaccodownload = DownloadText;
                                    tobaccodownloadLink = '#';
                                    tobaccodownloadMessage = labeladdedcommomn;
                                    tobacco_printauth = AuthorizationFormText;
                                    tobacco_printauthLink = `#`;
                                    tobacco_printauthMessage = labeladdedcommomn;
                                    tobacco_update = OnlineText;
                                    tobacco_updateLink = `/health-checkup/authorizations/tobacco-use`;
                                }
                                let disease_diagnos = '';
                                let diseaseFormsList = [];
                                if(program_selections.includes('1') || startEndDt[2]){
                                    if(activePlugins.includes('Diseasemanagement')){
                                        if(slectedArr){
                                            slectedArr = (slectedArr?.disease_id) ? slectedArr?.disease_id?.split(',') : [];
                                            disease_diagnos = await this.translatorService.frontendReadTranslation(req.lang, 'Additional_Recommended_Disease_Specific_Physician_Visit_Form', `/LC_MESSAGES/Campaign/Campaigns`,`static`);
                                            for (let disRaw of slectedArr){
                                                const diseaseFormsOrder = await this.formInstructionsService.getDiseaseFormOrder(`id = ${disRaw} AND status = 1`);
                                                if(diseaseFormsOrder && diseaseFormsOrder?.forms_order){
                                                    const orderDis: any = {};
                                                    const regex = /i:(\d+);s:\d+:"(.*?)";/g; // Updated regex to handle empty strings
                                                    let match;
                                                    while ((match = regex.exec(diseaseFormsOrder?.forms_order)) !== null) {
                                                        const key = parseInt(match[1], 10);
                                                        const value = match[2] === '' ? '' : parseInt(match[2], 10);
                                                        orderDis[key] = value;
                                                    }
                                                    if (Object.keys(orderDis).length > 0) {
                                                        const sortedForms = Object.entries(orderDis)
                                                        .sort(([, a], [, b]) => Number(a) - Number(b))
                                                        .map(([key]) => Number(key));
                                                        for (let formId of sortedForms){
                                                            const formDetails = await this.formInstructionsService.getDiseaseForms(`id = ${formId} AND status = 1`);
                                                            if(formDetails){
                                                                let diseasedownload = '';
                                                                let diseasedownloadLink = '';
                                                                let diseasedownloadMessage = '';
                                                                let diseaseLinkPara = {};
                                                                if((currentDateTimeStemp >= pfStartDateTS && currentDateTimeStemp <= pfEndDateTS) || (currentDateTimeStemp >= start_common_dateTS && currentDateTimeStemp <= end_common_dateTS)){
                                                                    diseasedownload = formDownloadText;
                                                                    diseasedownloadLink = `/health-checkup/form-instructions/get-one`;
                                                                    diseaseLinkPara = { 'type' : 'Disease', 'user_id': userId, 'form_id': formId };
                                                                }else{
                                                                    diseasedownload = formDownloadText;
                                                                    diseasedownloadLink = '#';
                                                                    diseasedownloadMessage = labeladdedcommomn;
                                                                }
                                                                diseaseFormsList.push({ 'form_name' : formDetails?.title, 'buttonname' : diseasedownload, 'buttonlink' : diseasedownloadLink, 'linkParameter' : diseaseLinkPara, 'message' : diseasedownloadMessage, 'redirectType' : 0 });
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                if(allRewardDatas.length > 0){
                                    let buttonnamefororg = await this.translatorService.frontendReadTranslation(req.lang,`Quick Link`, `/LC_MESSAGES/Campaign/Campaigns`,`static`);
                                    for (let rewRwos of allRewardDatas){
                                        const rewardId = rewRwos['id'];
                                        const campaignId = rewRwos['campaign_id'];
                                        if (showTab == 0) {
                                            campaignRaw['id'] = rewRwos['campaign_id'];
                                        }
                                        if (rewRwos['campaign_id'] == campaignRaw['id']) {
                                            if(rewRwos['Campaignactivity'] && rewRwos['Campaignactivity'].length > 0){
                                                for (let act of rewRwos['Campaignactivity']){
                                                    let actName = '';
                                                    let actDescription = '';
                                                    let actCategoryId = (act?.['activity']) ? act?.['activity']?.['category_id'] : '';
                                                    const rewActId = act['id'];
                                                    if(Object.keys(act).length > 0){
                                                        if (act['is_hidden_on_activity_page'] == 0) {
                                                            actName = await this.translatorService.frontendReadTranslation(req.lang,`activity_name_${campaignId}_${rewardId}_${rewActId}`, `/LC_MESSAGES/Campaign/Campaigns/${companyId}/${campaignId}`,`dynamic`);
                                                            if(act['cust_name'] && act['cust_name'] != ''){
                                                                actName = (actName == '' || actName == `activity_name_${campaignId}_${rewardId}_${rewActId}`) ? act['cust_name'] : actName;
                                                            }else{
                                                                actName = (actName == '' || actName == `activity_name_${campaignId}_${rewardId}_${rewActId}`) ? act?.['activity']?.['activity_name'] : actName;
                                                            }   
                                                            actDescription = await this.translatorService.frontendReadTranslation(req.lang,`activity_desc_${campaignId}_${rewardId}_${rewActId}`, `/LC_MESSAGES/Campaign/Campaigns/${companyId}/${campaignId}`,`dynamic`);
                                                            if(act['cust_description'] && act['cust_description'] != ''){
                                                                actDescription = (actDescription == '' || actDescription == `activity_desc_${campaignId}_${rewardId}_${rewActId}`) ? act['cust_description'] : actDescription;
                                                            }else{
                                                                actDescription = (actDescription == '' || actDescription == `activity_desc_${campaignId}_${rewardId}_${rewActId}`) ? act?.['activity']?.['description'] : actDescription;
                                                            }
                                                            actDescription = await this.urlManageService.onmapUrlContent(actDescription);
                                                            let oid = '';
                                                            if (act['order_id'] != "" && act['order_id'] != 0) {
                                                                oid = act['order_id'];
                                                            }
                                                            let ReqBy = "N";
                                                            if (act['required_by_user'] == "Y" || act['required_by_user'] == "Y") {
                                                                ReqBy = "Y";
                                                            }
                                                            let dateorder:any = "";
                                                            if (act['end_date'] != "" && act['end_date'] != 0) {
                                                                dateorder = await this.commonDateService.DateTimeFormat(act['end_date'], 'timestamp');
                                                            }
                                                            if (act['activity_id'] == 1 && companyId == 922) {
                                                                buttonnamefororg = 'Take HRA';
                                                            }
                                                            const activityName = (act?.['activity']?.['activity_name'] != null) ? act?.['activity']?.['activity_name'].toLowerCase() : '';
                                                            let activityButtonData = [];
                                                            let diseaseFormsData = [];
                                                            let formType = '';
                                                            if(activityName.includes('physician form') || activityName.includes('physician visit')){
                                                                if (companyId != 804 && rewRwos?.hire_date && rewRwos.hire_date == 1) {
                                                                    physicianLinkPara = { 'type' : 'Physician', 'startdate': act['start_date'], 'enddate': act['end_date'] };
                                                                    physiciandownloadLink = `/health-checkup/form-instructions/get-one`;
                                                                    physiciandownloadMessage = '';
                                                                }
                                                                activityButtonData = [
                                                                    { 
                                                                        'name': physician_update, 
                                                                        'link': physician_updateLink ? (physician_updateLink.startsWith('/') ? physician_updateLink : '/' + physician_updateLink) : '',
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
                                                                formType = 'Physician';
                                                            }else if(activityName.includes('dental visit form') || activityName.includes('dental visit')){
                                                                if (companyId != 804 && rewRwos?.hire_date && rewRwos.hire_date == 1) {
                                                                    dentalLinkPara = { 'type' : 'Dentist', 'startdate': act['start_date'], 'enddate': act['end_date'] };
                                                                    dentaldownloadLink = `/health-checkup/form-instructions/get-one`;
                                                                    dentaldownloadMessage = '';
                                                                }
                                                                activityButtonData = [
                                                                    { 
                                                                        'name': dental_update,
                                                                        'link': dental_updateLink ? (dental_updateLink.startsWith('/') ? dental_updateLink : '/' + dental_updateLink) : '',
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
                                                                formType = 'Dentist';
                                                            }else if(activityName.includes('optometrist form') || activityName.includes('optometrist visit')){
                                                                if (companyId != 804 && rewRwos?.hire_date && rewRwos.hire_date == 1) {
                                                                    optometristLinkPara = { 'type' : 'Optometrist', 'startdate': act['start_date'], 'enddate': act['end_date'] };
                                                                    optometristdownloadLink = `/health-checkup/form-instructions/get-one`;
                                                                    optometristdownloadMessage = '';
                                                                }
                                                                activityButtonData = [
                                                                    { 
                                                                        'name': optometrist_update,
                                                                        'link': optometrist_updateLink ? (optometrist_updateLink.startsWith('/') ? optometrist_updateLink : '/' + optometrist_updateLink) : '',
                                                                        'message' : '',
                                                                        'redirectType' : 1
                                                                    },
                                                                    {
                                                                        'name': optometristdownload, 
                                                                        'link': optometristdownloadLink || '',
                                                                        'linkParameter': optometristLinkPara,
                                                                        'message' : optometristdownloadMessage,
                                                                        'redirectType' : 0
                                                                    }
                                                                ];
                                                                formType = 'Optometrist';
                                                            }else if(activityName.includes('tobacco affidavit')){
                                                                if (companyId != 804 && rewRwos?.hire_date && rewRwos.hire_date == 1) {
                                                                    if(tobaccoLinkPara && Object.keys(tobaccoLinkPara).length > 0){
                                                                        if(tobaccoLinkPara?.['type'] && tobaccoLinkPara?.['type'] == 'Tobacco'){
                                                                            tobaccoLinkPara = { 'type' : 'Tobacco', 'startdate': act['start_date'], 'enddate': act['end_date'] };
                                                                            tobaccodownloadLink = `/health-checkup/form-instructions/get-one`;
                                                                            tobaccodownloadMessage = '';
                                                                        }
                                                                    }
                                                                }
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
                                                                            'link': tobacco_updateLink ? (tobacco_updateLink.startsWith('/') ? tobacco_updateLink : '/' + tobacco_updateLink) : '',
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
                                                                }else{
                                                                    activityButtonData = [
                                                                        { 
                                                                            'name': tobacco_update,
                                                                            'link': tobacco_updateLink ? (tobacco_updateLink.startsWith('/') ? tobacco_updateLink : '/' + tobacco_updateLink) : '',
                                                                            'message' : '',
                                                                            'redirectType' : 1
                                                                        }
                                                                    ];
                                                                }
                                                                formType = 'Tobacco';
                                                            }else{
                                                                let createdURL = '';
                                                                if((act['opentype'] == 2 || act['opentype'] == 1) && act['openinternal'] && act['openinternal'] != ''){
                                                                    let path = await this.commonDateService.manageAllURL('g_internal_link', {'inLinkId' : act['openinternal'], 'pageEndPoint': 'activities'},internalLinkData);
                                                                    createdURL = path;
                                                                }else if(act['opentype'] == 3 || act['opentype'] == 5){
                                                                    if (act['openexternal'] == "https://sso.preventioncloud.com/ehealth" || act['openexternal'] == "https://sso.preventioncloud.com/ehealth/view") {
                                                                        let ssolinkdata = '';
                                                                        if (act['openexternal'] == "https://sso.preventioncloud.com/ehealth/view") {
                                                                            ssolinkdata = await this.commonService.userDataToSamlRequest(req?.tokenUser, 'view', '1', '0');
                                                                        } else {
                                                                            ssolinkdata = await this.commonService.userDataToSamlRequest(req?.tokenUser, 'scheduler', '1', '0');
                                                                        }
                                                                        createdURL = `https://sso.preventioncloud.com/ehealth?SAMLRequest=${ssolinkdata}`;
                                                                    } else {
                                                                        createdURL = act['openexternal'];
                                                                    }
                                                                }if(act['opentype'] == 0){
                                                                    if (act?.activity?.plugin != "" && act?.activity?.plugin != null) {
                                                                        let plugin = act?.activity?.plugin.toLowerCase();
                                                                        let controller = (act?.activity?.controller != null) ? act?.activity?.controller.toLowerCase() : '';
                                                                        let action = (act?.activity?.action != null) ? act?.activity?.action.toLowerCase() : '';
                                                                        let path = await this.commonDateService.manageAllURL('g_ac_plugin_link', {'pluginName' : plugin,'controllerName' : controller,'actionName' : action, 'itemId' : act?.activity?.id , 'pageEndPoint': 'activities'},activityLinkData);
                                                                        createdURL = path;
                                                                    } else if (act?.activity?.ext_link != "" && act?.activity?.ext_link != null) {
                                                                        createdURL = act?.activity?.ext_link;
                                                                    }else if (act?.category?.plugin != "" && act?.category?.plugin != null) {
                                                                        let plugin = act?.category?.plugin.toLowerCase();
                                                                        let controller = (act?.category?.controller != null) ? act?.category?.controller.toLowerCase() : '';
                                                                        let action = (act?.category?.action != null) ? act?.category?.action.toLowerCase() : '';
                                                                        let path = await this.commonDateService.manageAllURL('g_ac_plugin_link', {'pluginName' : plugin,'controllerName' : controller,'actionName' : action , 'itemId' : act?.category?.id, 'pageEndPoint': 'activities'},categoryLinkData);
                                                                        createdURL = path;
                                                                    }
                                                                }
                                                                if(createdURL != '' && createdURL != null){
                                                                    activityButtonData = [
                                                                        { 
                                                                            'name': buttonnamefororg,
                                                                            'link': createdURL ? (createdURL.startsWith('/') ? createdURL : '/' + createdURL) : '',
                                                                            'message' : '',
                                                                            'redirectType' : 1
                                                                        }
                                                                    ];
                                                                }
                                                            }
                                                            let NewActivityArray = [
                                                                { 
                                                                    'id': rewActId, 
                                                                    'campaign_id': campaignId,
                                                                    'reward_id': rewardId,
                                                                    'category_id': actCategoryId,
                                                                    'name': actName, 
                                                                    'description': actDescription, 
                                                                    'start_date': await this.commonDateService.DateTimeFormat(act['start_date'], 'MM-DD-YYYY'), 
                                                                    'end_date': await this.commonDateService.DateTimeFormat(act['end_date'], 'MM-DD-YYYY'), 
                                                                    'dateorder': dateorder, 
                                                                    'ReqBy': ReqBy, 
                                                                    'order_id': oid,
                                                                    'buttonData' : activityButtonData,
                                                                    'formType' : formType
                                                                }
                                                            ];
                                                            if(diseaseFormsList.length > 0 && activityName.includes('physician form') || activityName.includes('physician visit')){
                                                                if(!NewActivityArray[0]['diseaseFormsData']){
                                                                    NewActivityArray[0]['diseaseFormsData'] = [
                                                                        {
                                                                            'diseaseFormsTitle' : disease_diagnos,
                                                                            'diseaseForms' : diseaseFormsList
                                                                        }
                                                                    ]
                                                                }
                                                            }
                                                            if(showTab == 1 && rewRwos['campaign_id'] == campaignRaw['id']){
                                                                activitiesData[`${campaignRaw.id}`]['activitys'] = [...activitiesData[`${campaignRaw.id}`]['activitys'], ...NewActivityArray];
                                                            }else{
                                                                finalDataArray = [...finalDataArray, ...NewActivityArray];
                                                            }
                                                            if((activityName.includes('physician form') || activityName.includes('physician visit')) && (optionalpage.includes('3') && (prevent_option == 1 || prevent_option == 2)) && m == 0){
                                                                m++;
                                                                let age_gender_title = await this.translatorService.frontendReadTranslation(req.lang,`Preventive Care Form`, `/LC_MESSAGES/Campaign/Campaigns`,`static`);
                                                                if(forminstructions?.age_gender_title != ''){
                                                                    age_gender_title = await this.translatorService.frontendReadTranslation(req.lang,`age_gender_title_${companyId}`, `/LC_MESSAGES/Activities/${companyId}/Activities`,`dynamic`);
                                                                    if(age_gender_title == `age_gender_title_${companyId}`){
                                                                        age_gender_title = forminstructions?.age_gender_title;
                                                                    }
                                                                }
                                                                let ageDescription = '';
                                                                if(forminstructions?.age_gender_text != ''){
                                                                    ageDescription = await this.translatorService.frontendReadTranslation(req.lang,`age_gender_text_${companyId}`, `/LC_MESSAGES/Activities/${companyId}/Activities`,`dynamic`);
                                                                    if(ageDescription == `age_gender_text_${companyId}`){
                                                                        ageDescription = forminstructions?.age_gender_text;
                                                                    }
                                                                }else{
                                                                    ageDescription = await this.translatorService.frontendReadTranslation(req.lang,`activity_desc_${campaignId}_${rewardId}_${rewActId}`, `/LC_MESSAGES/Campaign/Campaigns/${companyId}/${campaignId}`,`dynamic`);
                                                                    if(act['cust_description'] && act['cust_description'] != ''){
                                                                        ageDescription = (ageDescription == '' || ageDescription == `activity_desc_${campaignId}_${rewardId}_${rewActId}`) ? act['cust_description'] : ageDescription;
                                                                    }else{
                                                                        ageDescription = (ageDescription == '' || ageDescription == `activity_desc_${campaignId}_${rewardId}_${rewActId}`) ? act?.['activity']?.['description'] : ageDescription;
                                                                    }
                                                                }
                                                                ageDescription = await this.urlManageService.onmapUrlContent(ageDescription);
                                                                activityButtonData = [
                                                                    { 
                                                                        'name': physician_update,
                                                                        'link': physician_updateLink ? (physician_updateLink.startsWith('/') ? physician_updateLink : '/' + physician_updateLink) : '',
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
                                                                let NewActivityArray = [
                                                                    { 
                                                                        'id': rewActId, 
                                                                        'campaign_id': campaignId,
                                                                        'reward_id': rewardId,
                                                                        'category_id': actCategoryId,
                                                                        'name': age_gender_title, 
                                                                        'description': ageDescription, 
                                                                        'start_date': await this.commonDateService.DateTimeFormat(act['start_date'], 'MM-DD-YYYY'), 
                                                                        'end_date': await this.commonDateService.DateTimeFormat(act['end_date'], 'MM-DD-YYYY'), 
                                                                        'dateorder': dateorder, 
                                                                        'ReqBy': ReqBy, 
                                                                        'order_id': oid,
                                                                        'buttonData' : activityButtonData,
                                                                        'formType' : 'Physician'
                                                                    }
                                                                ];
                                                                if(showTab == 1 && rewRwos['campaign_id'] == campaignRaw['id']){
                                                                    activitiesData[`${campaignRaw.id}`]['activitys'] = [...activitiesData[`${campaignRaw.id}`]['activitys'], ...NewActivityArray];
                                                                }else{
                                                                    finalDataArray = [...finalDataArray, ...NewActivityArray];
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                            if(rewRwos['Campaigncategory'] && rewRwos['Campaigncategory'].length > 0){
                                                for (let cat of rewRwos['Campaigncategory']){
                                                    const rewCatId = cat['id'];
                                                    const catId = cat['category_id'];
                                                    let catName = '';
                                                    if(cat['cust_name'] && cat['cust_name'] != ''){
                                                        catName = await this.translatorService.frontendReadTranslation(req.lang,`category_name_${campaignId}_${rewardId}_${rewCatId}`, `/LC_MESSAGES/Campaign/Campaigns/${companyId}/${campaignId}`,`dynamic`);
                                                        catName = (catName == '' || catName == `category_name_${campaignId}_${rewardId}_${rewCatId}`) ? cat['cust_name'] : catName;
                                                    }else{
                                                        catName = await this.translatorService.frontendReadTranslation(req.lang,`category_name_${catId}`, `/LC_MESSAGES/Campaign/Category/${catId}`,`dynamic`);
                                                        catName = (catName == '' || catName == `category_name_${catId}`) ? cat?.['category']?.['category_name'] : catName;
                                                    }
                                                    let catDescription = '';
                                                    if(cat['cust_description'] && cat['cust_description'] != ''){
                                                        catDescription = await this.translatorService.frontendReadTranslation(req.lang,`category_desc_${campaignId}_${rewardId}_${rewCatId}`, `/LC_MESSAGES/Campaign/Campaigns/${companyId}/${campaignId}`,`dynamic`);
                                                        catDescription = (catDescription == '' || catDescription == `category_desc_${campaignId}_${rewardId}_${rewCatId}`) ? cat['cust_description'] : catDescription;
                                                    }else{
                                                        catDescription = await this.translatorService.frontendReadTranslation(req.lang,`category_desc_${catId}`, `/LC_MESSAGES/Campaign/Category/${companyId}/${campaignId}`,`dynamic`);
                                                        catDescription = (catDescription == '' || catDescription == `category_desc_${catId}`) ? cat?.['category']?.['description'] : catDescription;
                                                    }
                                                    catDescription = await this.urlManageService.onmapUrlContent(catDescription);
                                                    let oid = '';
                                                    if (cat['order_id'] != "" && cat['order_id'] != 0) {
                                                        oid = cat['order_id'];
                                                    }
                                                    let ReqBy = "N";
                                                    if (cat['required_by_user'] == "Y" || cat['required_by_user'] == "Y") {
                                                        ReqBy = "Y";
                                                    }
                                                    let dateorder:any = "";
                                                    if (cat['end_date'] != "" && cat['end_date'] != 0) {
                                                        dateorder = await this.commonDateService.DateTimeFormat(cat['end_date'], 'timestamp');
                                                    }
                                                    if (cat['is_hidden_on_activity_page'] == 0) {
                                                        let createdURL = '';
                                                        let cativityButtonData = [];
                                                        if (cat?.category?.plugin != "" && cat?.category?.plugin != null) {
                                                            let plugin = cat?.category?.plugin.toLowerCase();
                                                            let controller = (cat?.category?.controller != null) ? cat?.category?.controller.toLowerCase() : '';
                                                            let action = (cat?.category?.action != null) ? cat?.category?.action.toLowerCase() : '';
                                                            let path = await this.commonDateService.manageAllURL('g_ac_plugin_link', {'pluginName' : plugin,'controllerName' : controller,'actionName' : action, 'itemId' : cat?.category?.id, 'pageEndPoint': 'activities'},categoryLinkData);
                                                            createdURL = path;
                                                        }else if (cat?.activity?.ext_link != "" && cat?.activity?.ext_link != null) {
                                                            createdURL = cat?.activity?.ext_link;
                                                        }
                                                        if(createdURL != ''){
                                                            cativityButtonData = [
                                                                { 
                                                                    'name': buttonnamefororg, 
                                                                    'link': createdURL || '',
                                                                }
                                                            ];
                                                        }
                                                        let NewCategoryArray = [
                                                            { 
                                                                'id': rewCatId, 
                                                                'campaign_id': campaignId,
                                                                'reward_id': rewardId,
                                                                'category_id': catId,
                                                                'name': catName, 
                                                                'description': catDescription, 
                                                                'start_date': await this.commonDateService.DateTimeFormat(cat['start_date'], 'MM-DD-YYYY'), 
                                                                'end_date': await this.commonDateService.DateTimeFormat(cat['end_date'], 'MM-DD-YYYY'), 
                                                                'dateorder': dateorder, 
                                                                'ReqBy': ReqBy, 
                                                                'order_id': oid,
                                                                'buttonData' : cativityButtonData
                                                            }
                                                        ];
                                                        if(showTab == 1 && rewRwos['campaign_id'] == campaignRaw['id']){
                                                            activitiesData[`${campaignRaw.id}`]['activitys'] = [...activitiesData[`${campaignRaw.id}`]['activitys'], ...NewCategoryArray];
                                                        }else{
                                                            finalDataArray = [...finalDataArray, ...NewCategoryArray];
                                                        }
                                                    }
                                                    if(cat['activity'] && cat['activity'].length > 0){
                                                        for (let catAct of cat['activity']){
                                                            let catActName = '';
                                                            let catActDescription = '';
                                                            const rewCatActId = catAct['id'];
                                                            let actCategoryId = (catAct?.['activity']) ? catAct?.['activity']?.['category_id'] : '';
                                                            if(Object.keys(catAct).length > 0){
                                                                if (catAct['is_hidden_on_activity_page'] == 0) {
                                                                    catActName = await this.translatorService.frontendReadTranslation(req.lang,`activity_name_${campaignId}_${rewardId}_${rewCatActId}`, `/LC_MESSAGES/Campaign/Campaigns/${companyId}/${campaignId}`,`dynamic`);
                                                                    if(catAct['cust_name'] && catAct['cust_name'] != ''){
                                                                        catActName = (catActName == '' || catActName == `activity_name_${campaignId}_${rewardId}_${rewCatActId}`) ? catAct['cust_name'] : catActName;
                                                                    }else{
                                                                        catActName = (catActName == '' || catActName == `activity_name_${campaignId}_${rewardId}_${rewCatActId}`) ? catAct?.['activity']?.['activity_name'] : catActName;
                                                                    }   
                                                                    catActDescription = await this.translatorService.frontendReadTranslation(req.lang,`activity_desc_${campaignId}_${rewardId}_${rewCatActId}`, `/LC_MESSAGES/Campaign/Campaigns/${companyId}/${campaignId}`,`dynamic`);
                                                                    if(catAct['cust_description'] && catAct['cust_description'] != ''){
                                                                        catActDescription = (catActDescription == '' || catActDescription == `activity_desc_${campaignId}_${rewardId}_${rewCatActId}`) ? catAct['cust_description'] : catActDescription;
                                                                    }else{
                                                                        catActDescription = (catActDescription == '' || catActDescription == `activity_desc_${campaignId}_${rewardId}_${rewCatActId}`) ? catAct?.['activity']?.['description'] : catActDescription;
                                                                    }
                                                                    catActDescription = await this.urlManageService.onmapUrlContent(catActDescription);
                                                                    let oid = '';
                                                                    if (catAct['order_id'] != "" && catAct['order_id'] != 0) {
                                                                        oid = catAct['order_id'];
                                                                    }
                                                                    let ReqBy = "N";
                                                                    if (catAct['required_by_user'] == "Y" || catAct['required_by_user'] == "Y") {
                                                                        ReqBy = "Y";
                                                                    }
                                                                    let dateorder:any = "";
                                                                    if (catAct['end_date'] != "" && catAct['end_date'] != 0) {
                                                                        dateorder = await this.commonDateService.DateTimeFormat(catAct['end_date'], 'timestamp');
                                                                    }
                                                                    let buttonnamefororg = await this.translatorService.frontendReadTranslation(req.lang,`Quick Link`, `/LC_MESSAGES/Campaign/Campaigns`,`static`);
                                                                    if (catAct['activity_id'] == 1 && companyId == 922) {
                                                                        buttonnamefororg = 'Take HRA';
                                                                    }
                                                                    const activityName = (catAct['activity']['activity_name'] != null) ? catAct['activity']['activity_name'].toLowerCase() : '';
                                                                    let activityButtonData = [];
                                                                    let diseaseFormsData = [];
                                                                    let formType = '';
                                                                    if(activityName.includes('physician form') || activityName.includes('physician visit')){
                                                                        activityButtonData = [
                                                                            { 
                                                                                'name': physician_update,
                                                                                'link': physician_updateLink ? (physician_updateLink.startsWith('/') ? physician_updateLink : '/' + physician_updateLink) : '',
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
                                                                        formType = 'Physician';
                                                                    }else if(activityName.includes('dental visit form') || activityName.includes('dental visit')){
                                                                        activityButtonData = [
                                                                            { 
                                                                                'name': dental_update,
                                                                                'link': dental_updateLink ? (dental_updateLink.startsWith('/') ? dental_updateLink : '/' + dental_updateLink) : '',
                                                                                'message' : '',
                                                                                'redirectType' : 1
                                                                            },
                                                                            {
                                                                                'name': dentaldownload, 
                                                                                'link': dentaldownloadLink || '',
                                                                                'linkParameter': dentalLinkPara,
                                                                                'message' : dentaldownloadMessage,
                                                                                'redirectType' : 0
                                                                            }
                                                                        ];
                                                                        formType = 'Dentist';
                                                                    }else if(activityName.includes('optometrist form') || activityName.includes('optometrist visit')){
                                                                        activityButtonData = [
                                                                            { 
                                                                                'name': optometrist_update,
                                                                                'link': optometrist_updateLink ? (optometrist_updateLink.startsWith('/') ? optometrist_updateLink : '/' + optometrist_updateLink) : '',
                                                                                'message' : '',
                                                                                'redirectType' : 1
                                                                            },
                                                                            {
                                                                                'name': optometristdownload, 
                                                                                'link': optometristdownloadLink || '',
                                                                                'linkParameter': optometristLinkPara,
                                                                                'message' : optometristdownloadMessage,
                                                                                'redirectType' : 0
                                                                            }
                                                                        ];
                                                                        formType = 'Optometrist';
                                                                    }else if(activityName.includes('tobacco affidavit')){
                                                                        if(program_selections.includes('3') || startEndDt[5]){
                                                                            activityButtonData = [
                                                                                { 
                                                                                    'name': tobacco_update,
                                                                                    'link': tobacco_updateLink ? (tobacco_updateLink.startsWith('/') ? tobacco_updateLink : '/' + tobacco_updateLink) : '',
                                                                                    'message' : '',
                                                                                    'redirectType' : 1
                                                                                }
                                                                            ];
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
                                                                                        'link': tobacco_updateLink ? (tobacco_updateLink.startsWith('/') ? tobacco_updateLink : '/' + tobacco_updateLink) : '',
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
                                                                            }
                                                                        }
                                                                        formType = 'Tobacco';
                                                                    }else{
                                                                        let createdURL = '';
                                                                        let linkType = 'internal';
                                                                        if((catAct['opentype'] == 2 || catAct['opentype'] == 1) && catAct['openinternal'] && catAct['openinternal'] != ''){
                                                                            let path = await this.commonDateService.manageAllURL('g_internal_link', {'inLinkId' : catAct['openinternal'], 'pageEndPoint': 'activities'},internalLinkData);
                                                                            createdURL = path;
                                                                        }else if(catAct['opentype'] == 3 || catAct['opentype'] == 5){
                                                                            if (catAct['openexternal'] == "https://sso.preventioncloud.com/ehealth" || catAct['openexternal'] == "https://sso.preventioncloud.com/ehealth/view") {
                                                                                let ssolinkdata = '';
                                                                                if (catAct['openexternal'] == "https://sso.preventioncloud.com/ehealth/view") {
                                                                                    ssolinkdata = await this.commonService.userDataToSamlRequest(req?.tokenUser, 'view', '1', '0');
                                                                                } else {
                                                                                    ssolinkdata = await this.commonService.userDataToSamlRequest(req?.tokenUser, 'scheduler', '1', '0');
                                                                                }
                                                                                createdURL = `https://sso.preventioncloud.com/ehealth?SAMLRequest=${ssolinkdata}`;
                                                                            } else {
                                                                                createdURL = catAct['openexternal'];
                                                                            }
                                                                            linkType = 'external';
                                                                        }if(catAct['opentype'] == 0){
                                                                            if (catAct?.activity?.plugin != "" && catAct?.activity?.plugin != null) {
                                                                                let plugin = catAct?.activity?.plugin.toLowerCase();
                                                                                let controller = (catAct?.activity?.controller != null) ? catAct?.activity?.controller.toLowerCase() : '';
                                                                                let action = (catAct?.activity?.action != null) ? catAct?.activity?.action.toLowerCase() : '';
                                                                                let path = await this.commonDateService.manageAllURL('g_ac_plugin_link', {'pluginName' : plugin,'controllerName' : controller,'actionName' : action, 'itemId' : catAct?.activity?.id, 'pageEndPoint': 'activities'},activityLinkData);
                                                                                createdURL = path;
                                                                            } else if (catAct?.activity?.ext_link != "" && catAct?.activity?.ext_link != null) {
                                                                                createdURL = catAct?.activity?.ext_link;
                                                                                linkType = 'external';
                                                                            }else if (catAct?.category?.plugin != "" && catAct?.category?.plugin != null) {
                                                                                let plugin = catAct?.category?.plugin.toLowerCase();
                                                                                let controller = (catAct?.category?.controller != null) ? catAct?.category?.controller.toLowerCase() : '';
                                                                                let action = (catAct?.category?.action != null) ? catAct?.category?.action.toLowerCase() : '';
                                                                                let path = await this.commonDateService.manageAllURL('g_ac_plugin_link', {'pluginName' : plugin,'controllerName' : controller,'actionName' : action, 'itemId' : catAct?.category?.id, 'pageEndPoint': 'activities'},categoryLinkData);
                                                                                createdURL = path;
                                                                            }
                                                                        }
                                                                        if(createdURL != ''){
                                                                            activityButtonData = [
                                                                                { 
                                                                                    'name': buttonnamefororg,
                                                                                    'link': createdURL ? (createdURL.startsWith('/') ? createdURL : '/' + createdURL) : '',
                                                                                    'message' : '',
                                                                                    'redirectType' : 1,
                                                                                    'linkType' : linkType
                                                                                }
                                                                            ];
                                                                        }
                                                                    }
                                                                    let NewActivityArray = [
                                                                        { 
                                                                            'id': rewCatActId, 
                                                                            'campaign_id': campaignId,
                                                                            'reward_id': rewardId,
                                                                            'category_id': actCategoryId,
                                                                            'name': catActName, 
                                                                            'description': catActDescription, 
                                                                            'start_date': await this.commonDateService.DateTimeFormat(catAct['start_date'], 'MM-DD-YYYY'), 
                                                                            'end_date': await this.commonDateService.DateTimeFormat(catAct['end_date'], 'MM-DD-YYYY'), 
                                                                            'dateorder': dateorder, 
                                                                            'ReqBy': ReqBy, 
                                                                            'order_id': oid,
                                                                            'buttonData' : activityButtonData,
                                                                            'formType' : formType
                                                                        }
                                                                    ];
                                                                    if(diseaseFormsList.length > 0 && activityName.includes('physician form') || activityName.includes('physician visit')){
                                                                        if(!NewActivityArray[0]['diseaseFormsData']){
                                                                            NewActivityArray[0]['diseaseFormsData'] = [
                                                                                {
                                                                                    'diseaseFormsTitle' : disease_diagnos,
                                                                                    'diseaseForms' : diseaseFormsList
                                                                                }
                                                                            ]
                                                                        }
                                                                    }
                                                                    if(showTab == 1 && rewRwos['campaign_id'] == campaignRaw['id']){
                                                                        activitiesData[`${campaignRaw.id}`]['activitys'] = [...activitiesData[`${campaignRaw.id}`]['activitys'], ...NewActivityArray];
                                                                    }else{
                                                                        finalDataArray = [...finalDataArray, ...NewActivityArray];
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        if(showTab == 1){
                                            activitiesData[`${campaignRaw.id}`]['activitys'] = activitiesData[`${campaignRaw.id}`]['activitys'].sort((a, b) => {
                                                if (a.order_id === 0 || a.order_id === undefined) return 1;
                                                if (b.order_id === 0 || b.order_id === undefined) return -1;
                                                return a.order_id - b.order_id;
                                            });
                                        }
                                    }
                                }
                            }
                        }
			            if(!returnDatas['datas']){
                        	returnDatas['datas'] = [];
                    	}
                        if(showTab == 0){
                            finalDataArray = finalDataArray.sort((a, b) => {
                                if (a.order_id === 0 || a.order_id === undefined) return 1;
                                if (b.order_id === 0 || b.order_id === undefined) return -1;
                                return a.order_id - b.order_id;
                            });
                            returnDatas['datas'] = finalDataArray;
                        }else{
                            activitiesData = Object.values(activitiesData).sort((a, b) => {
                                if (a['tab_order'] === 0 || a['tab_order'] === undefined) return 1;
                                if (b['tab_order'] === 0 || b['tab_order'] === undefined) return -1;
                                return a['tab_order'] - b['tab_order'];
                            });
                            returnDatas['datas'] = activitiesData;
                        }
                    }
                }
                if ((!forminstructions || Object.keys(forminstructions).length === 0) && (!campaignsData || Object.keys(campaignsData).length === 0)) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_NOT_ACTIVE_PROGRAMS'));
                }
            }else{
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_ACCESS_DENIED'));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: returnDatas,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                  statusCode: 401,
                  success: 0,
                  error: 1,
                  message: error?.message,
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
}
