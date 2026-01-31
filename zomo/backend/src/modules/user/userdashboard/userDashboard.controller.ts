import { AccessGuard, RoleGuard, TokenGuard } from '@/guard';
import { BiometricService } from '@/modules/biometric/biometric/biometric.service';
import { BiometricOrgSettingService } from '@/modules/biometric/biometricOrgSetting/biometricOrgSetting.service';
import { OrgBiometricService } from '@/modules/biometric/orgBiometric/orgBiometric.service';
import { AssessmentHraBiometricService } from '@/modules/healthassessment/assessmenthrabiometrics/assessmenthrabiometric.service';
import { BiometricsService } from '@/modules/healthcheckup/biometrics/biometrics.service';
import { FtBiometricsService } from '@/modules/trackers/biometrics/biometrics.service';
import { TranslationService } from '@/modules/translation/translation.service';
import { CommonDateService, CommonHealthService, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Request, Response } from "express";
import { CampaignService } from 'src/modules/campaign/campaign/campaign.service';
import { SliderSettingsService } from 'src/modules/campaign/slidersettings/slidersettings.service';
import { ScheduleChallengeService } from 'src/modules/challenge/schedulechallenge/schedulechallenge.service';
import { UrlManageService } from 'src/modules/common';
import { ActivePluginService } from 'src/modules/company/activeplugins/activeplugin.service';
import { CompanyService } from 'src/modules/company/companies/company.service';
import { SettingsService } from 'src/modules/company/settings/settings.service';
import { WellnessAssignmentService } from 'src/modules/company/wellnessassignment/wellnessAssignment.service';
import { EventGlobalEventsService } from 'src/modules/events/globalevents/globalevents.service';
import { EventSlotsService } from 'src/modules/events/slots/slots.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { ManualUpcomingsService } from 'src/modules/upcomingactivities/manualupcomings/manualupcomings.service';
import { SettingService } from 'src/modules/upcomingactivities/setting/setting.service';
import { UserService } from 'src/modules/user/user/user.service';
import { LessThanOrEqual, MoreThanOrEqual, Not } from 'typeorm';
import { SpouseLinkUnlinkInput, WidgetListInput } from './input';
const path = require('path');
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD
@Controller('user')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class UserDashboardController {
    constructor(
        private readonly userService: UserService,
        private readonly commonDateService: CommonDateService,
        private readonly commonHealthService: CommonHealthService,
        private readonly translatorService: TranslationService,
        private readonly companySettingsService: SettingsService,
        private readonly activityLogService: ActivityLogService,
        private readonly activePluginService: ActivePluginService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly settingService: SettingService,
        private readonly eventSlotsService: EventSlotsService,
        private readonly eventGlobalEventsService: EventGlobalEventsService,
        private readonly campaignService: CampaignService,
        private readonly manualUpcomingsService: ManualUpcomingsService,
        private readonly wellnessAssignmentService: WellnessAssignmentService,
        private readonly sliderSettingsService: SliderSettingsService,
        private readonly companyService: CompanyService,
        private readonly urlManageService: UrlManageService,
        private readonly orgBiometricService: OrgBiometricService,
        private readonly biometricOrgSettingService: BiometricOrgSettingService,
        private readonly ftBiometricsService: FtBiometricsService,
        private readonly hcBiometricsService: BiometricsService,
        private readonly assessmentHraBiometricsService: AssessmentHraBiometricService,
        private readonly biometricService: BiometricService,
    ) { }
    /**
     * API for dashboard widget data upcoming activity
     */
    @Post('dashboard')
    async dashboard(@Req() req: Request, @Res() res: Response){
        try {
            let user = Object.create(req.tokenUser);

            let resultedData=Object.create(null);
            let orgId = user.org_id;
            let userId = user.id;
            let deptId = user.department_id;
            let locId = user.location;
            let name = `${user.first_name} ${user.last_name}`
            let memberShipCode = user.membership_code
            let challange =Object.create(null)
            let usersdatawellness = await this.wellnessAssignmentService.listRecord(`wellnessAssignment.user_id = ${user.id} AND wellnessAssignment.org_id = ${user.org_id} AND ((wellnessAssignment.location = ${user.location} AND user.location != '') OR (wellnessAssignment.department = ${user.department_id} AND user.department_id != 0) OR (wellnessAssignment.is_global = 1))`);
            let usersdataChat = usersdatawellness
            let userCompanyData: any = await this.userService.getCompanyDetails({id:userId,status:1});
            let enableWidget ;
            let pluginName ;
            if (userCompanyData && userCompanyData?.company && userCompanyData?.company?.meta && userCompanyData?.company?.meta?.enable_widget
                && userCompanyData?.company?.meta?.enable_widget !== null && userCompanyData?.company?.meta?.enable_widget !== '') {
                enableWidget = JSON.parse(userCompanyData?.company?.meta?.enable_widget);
            }
            resultedData['enableWidget']=(userCompanyData?.company?.meta?.enable_widget !== null && userCompanyData?.company?.meta?.enable_widget !== '')? enableWidget: {}
            let activePlugin: any = await this.activePluginService.findOne(
                { company_id: orgId },
                null,
                ['company_id', 'plugin_name', 'id']
            );
            if(activePlugin && activePlugin.plugin_name && activePlugin.plugin_name !== null){
                pluginName = JSON.parse(activePlugin?.plugin_name);
            }
            if (userCompanyData && userCompanyData?.company && userCompanyData?.company.meta) {
                if (userCompanyData?.company?.meta?.enable_widget !== null) {
                    if(enableWidget && enableWidget?.upcomingactivities && enableWidget?.upcomingactivities == '1'){
                        if(pluginName && pluginName.Upcomingactivities){
                            let timezone = user.timezone;
                            let ucurrentdate = this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss');
                            let ucurrentdatewithouttime = this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD');
                            if (timezone?.trim() !== "") {
                                ucurrentdate = this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss','',timezone);
                                ucurrentdatewithouttime = this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD','',timezone);
                            }
                            let upcomingActivity = Object.create(null)
                            let upsetting= await this.settingService.listRecord(
                                [
                                    'id',
                                    'org_id',
                                    'events',
                                    'challenges',
                                    'manual_entry',
                                    'incentive',
                                    'future_plan',
                                    'timeline',
                                    'status'
                                ],
                                {org_id:orgId});
                            if(upsetting && upsetting.length>0){
                                let ucurrentdatetotmonthcount = upsetting[0]['timeline']
                                let ucurrentdateaddmonth =  moment(ucurrentdate).add(ucurrentdatetotmonthcount, 'months').format("YYYY-MM-DD");
                                if(pluginName && pluginName.Events){
                                    if (upsetting[0]['events']==1) {
                                        let wellnessslotcon = `es.organization_id IN (${orgId},0) AND es.status = 1 AND es.start_date BETWEEN '${ucurrentdatewithouttime}' AND '${ucurrentdateaddmonth}' AND ev_events.status = 1`;
                                        let eventList = await this.eventSlotsService.userEventSlotsData(wellnessslotcon, ['es', 'ev_events','ev_location.locations_id','ev_location.id']);
                                        let globaleventList = await this.eventGlobalEventsService.globalEventIds(['id', 'organization_id','event_id','orderid'],{organization_id :orgId});
                                        let globaleventListIds = globaleventList.map(event => String(event.event_id));
                                        let finalEvntList = [];
                                        const userLocation = user?.location;
                                        eventList.forEach((eventData, eventKey) => {
                                            if(eventData?.['ev_events']){
                                                const organizationId = eventData?.['ev_events']?.organization_id || 0;
                                                const eventId = eventData?.['ev_events']?.id || 0;
                                                if (organizationId !== 0 || globaleventListIds.includes(String(eventId))) {
                                                    if (organizationId == 0) {
                                                        finalEvntList.push(eventData);
                                                    } else {
                                                        let locationList = eventData['ev_events']['ev_location'] || [];
                                                        if (!Array.isArray(locationList)) {
                                                            if(locationList?.locations_id){
                                                                locationList = [parseInt(locationList?.locations_id)];
                                                            }
                                                            else{
                                                                locationList = [locationList];
                                                            }
                                                        }
                                                        if (locationList.includes(userLocation) || locationList.length == 0 || eventData['ev_events'].all_locations == 'all_loc') {
                                                            finalEvntList.push(eventData);
                                                        }
                                                    }
                                                }
                                            }
                                        });
                                        finalEvntList.sort((a, b) => {
                                            const startdate1 = a.start_date.replace(/-/g, '');
                                            const startdate2 = b.start_date.replace(/-/g, '');
                                            return startdate1 - startdate2;
                                        });
                                        const temparray = {};
                                        for (const Evalue of finalEvntList) {
                                            const ele = Evalue['ev_events'];
                                            const eventId = ele.id;

                                            if (!temparray[eventId]) {
                                                temparray[eventId] = [];
                                            }

                                            const startDate = moment(Evalue['start_date']);
                                            const endDate = moment(Evalue['end_date']);

                                            temparray[eventId].datesStart = temparray[eventId].datesStart || [];
                                            temparray[eventId].datesEnd = temparray[eventId].datesEnd || [];
                                            temparray[eventId].datesStart.push(startDate);
                                            temparray[eventId].datesEnd.push(endDate);

                                            const minStartDate = moment.min(temparray[eventId].datesStart);
                                            const maxEndDate = moment.max(temparray[eventId].datesEnd);

                                            if (!temparray[eventId][0]) {
                                                temparray[eventId][0] = { Event: {} };
                                            }

                                            const fieldsToTranslate = [
                                                'event_name',
                                                'event_description',
                                                'event_address',
                                                'event_city',
                                                'event_state',
                                                'user_id',
                                                'event_location'
                                            ];

                                            for (const field of fieldsToTranslate) {
                                                if (ele[field]) {
                                                    let translationKey = field == 'user_id' ? `selectedName_${ele.id}` : `${field}_${ele.id}`;
                                                    let translated = await this.translatorService.frontendReadTranslation(
                                                        req.lang,
                                                        translationKey,
                                                        `/LC_MESSAGES/Events/Events/${ele.organization_id || 0}/${ele.id}`,
                                                        'dynamic'
                                                    );
                                                    ele[field] = (translated == '' || translated == translationKey) ? ele[field] : translated;
                                                }
                                            }

                                            const eventInfo = {
                                                id: eventId,
                                                user_email: ele.user_email,
                                                user_id: ele.user_id,
                                                organization_id: ele.organization_id,
                                                event_name: ele.event_name,
                                                event_location: ele.event_location,
                                                event_address: ele.event_address,
                                                event_city: ele.event_city,
                                                event_state: ele.event_state,
                                                event_zipcode: ele.event_zipcode,
                                                event_description: ele.event_description,
                                                booking_price: ele.booking_price,
                                                event_timezone: ele.event_timezone,
                                                start_date: minStartDate.format('YYYY-MM-DD'),
                                                end_date: maxEndDate.format('YYYY-MM-DD'),
                                                category_id: ele.category_id
                                            };

                                            temparray[eventId][0].Event = eventInfo;

                                            let eventTimezone = Evalue['c_timezones']?.['timezone_name']?.trim() || '';
                                            const timezoneMapping = {
                                                "Pacific Standard Time (PST)": "America/Los_Angeles",
                                                "Mountain Standard Time (MST)": "America/Denver",
                                                "Central Standard Time (CST)": "America/Chicago",
                                                "Eastern Standard Time (EST)": "America/New_York"
                                            };
                                            if (timezoneMapping[eventTimezone]) {
                                                eventTimezone = timezoneMapping[eventTimezone];
                                            }
                                            if (eventTimezone) {
                                                const checkCurrentDate = moment().tz(eventTimezone).format('YYYY-MM-DD');
                                                const checkEndDate = moment(Evalue['end_date']).tz(eventTimezone).format('YYYY-MM-DD');
                                                if (moment(checkCurrentDate).isSameOrAfter(checkEndDate)) {
                                                    delete temparray[eventId];
                                                }
                                            }
                                        }
                                        let temparrayy = [];
                                        if (temparray) {
                                            Object.keys(temparray).forEach(tKey => {
                                                const tValue = temparray[tKey];
                                                if (tValue[0] && tValue[0].Event) {
                                                    temparrayy.push( tValue[0].Event );
                                                }
                                            });
                                        }
                                        const finalEvntListt = temparrayy || [];
                                        upcomingActivity['Events'] = finalEvntListt;
                                        temparrayy = null;
                                    }
                                }
                                if(pluginName && pluginName.Challenge){
                                    let upcomingActivitychallengecondition = `sc.org_id = ${orgId} AND sc.start_date >= '${ucurrentdatewithouttime}' AND sc.start_date <= '${ucurrentdateaddmonth}' AND sc.status = 1 AND ch.status = 1`;
                                    if (usersdataChat && usersdataChat.length > 0) {
                                        const createdByExclusion = usersdataChat.join(", ");
                                        upcomingActivitychallengecondition += ` AND sc.created_by NOT IN (${createdByExclusion})`;
                                    }
                                    if (upsetting[0]['challenges']==1) {
                                        let Challenges = await this.scheduleChallengeService.listRecord(upcomingActivitychallengecondition,null,['sc.org_id','sc.id','sc.custom_cname','sc.custom_desc','sc.start_date','sc.end_date','ch.id','ch.challenge_name','ch.challenge_desc','ch.logo']);
                                        if (Challenges && Challenges.length > 0) {
                                            for (const Challenge of Challenges) {
                                                // Translate name
                                                if (Challenge.custom_cname && Challenge.custom_cname.trim() !== '') {
                                                    const translatedName = await this.translatorService.frontendReadTranslation(
                                                        req.lang,
                                                        `custom_cname_${Challenge.id}`,
                                                        `/LC_MESSAGES/Challenge/MyChallenges/${Challenge.org_id}/${Challenge.id}`,
                                                        'dynamic'
                                                    );
                                                    if (!translatedName.includes('custom_cname_')) {
                                                        Challenge.custom_cname = translatedName;
                                                    }
                                                }else if (Challenge['challenge']?.challenge_name) {
                                                    const translatedName = await this.translatorService.frontendReadTranslation(
                                                        req.lang,
                                                        `challenge_name_${Challenge['challenge'].id}`,
                                                        `/LC_MESSAGES/Challenge/MyChallenges/0/${Challenge['challenge'].id}`,
                                                        'dynamic'
                                                    );
                                                    if (!translatedName.includes('challenge_name_')) {
                                                        Challenge['challenge'].challenge_name = translatedName;
                                                    }
                                                }

                                                if (Challenge.custom_desc && Challenge.custom_desc.trim() !== '') {
                                                    const translatedDesc = await this.translatorService.frontendReadTranslation(
                                                        req.lang,
                                                        `custom_desc_${Challenge.id}`,
                                                        `/LC_MESSAGES/Challenge/MyChallenges/${Challenge.org_id}/${Challenge.id}`,
                                                        'dynamic'
                                                    );
                                                    if (!translatedDesc.includes('custom_desc_')) {
                                                        Challenge.custom_desc = translatedDesc;
                                                    }
                                                } else if (Challenge['challenge']?.challenge_desc) {
                                                    const translatedDesc = await this.translatorService.frontendReadTranslation(
                                                        req.lang,
                                                        `challenge_desc_${Challenge['challenge'].id}`,
                                                        `/LC_MESSAGES/Challenge/MyChallenges/0/${Challenge['challenge'].id}`,
                                                        'dynamic'
                                                    );
                                                    if (!translatedDesc.includes('challenge_desc_')) {
                                                        Challenge['challenge'].challenge_desc = translatedDesc;
                                                    }
                                                }
                                            }
                                        }
                                        upcomingActivity['Challenge'] = Challenges;
                                    }
                                }
                                if(pluginName && pluginName.Incentive){
                                    if (upsetting[0]['incentive'] == 1) {
                                        let incentive = await this.campaignService.listIncentiveData(
                                            `Campaign.organization_id = ${orgId}  AND Campaign.start_date BETWEEN '${ucurrentdatewithouttime}' AND '${ucurrentdateaddmonth}' AND Campaign.status = 1`,
                                            [
                                                'Campaign.id',
                                                'Campaign.campaign_name',
                                                'Campaign.start_date',
                                                'Campaign.end_date',
                                                'Campaign.organization_id',
                                                'CampaignReward.id',
                                                'CampaignReward.reward_name',
                                                'CampaignReward.reward_desc'
                                            ]
                                        );
                                        if(incentive && incentive.length){
                                            await Promise.all(incentive.map(async (ele)=>{
                                                if(ele.campaign_name){
                                                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`campaign_name_${ele['id']}`, `/LC_MESSAGES/Campaign/Campaigns/${ele['organization_id']}/${ele['id']}`,`dynamic`);
                                                    ele.campaign_name = (customName == '' || customName == `campaign_name_${ele['id']}`) ? ele['campaign_name'] : customName;
                                                }
                                            }));
                                        }
                                        upcomingActivity['Incentive'] = incentive;
                                    }
                                }
                                if (upsetting[0]['manual_entry']==1) {
                                    let Manual = await this.manualUpcomingsService.listRecord(
                                        ['id', 'title', 'description', 'link', 'start_date', 'end_date', 'auto_remove_date', 'displayoption', 'org_id'],
                                        [
                                            [
                                                {
                                                    org_id: orgId,
                                                    status: 1,
                                                    displayoption: 0,
                                                    auto_remove_date: MoreThanOrEqual(ucurrentdatewithouttime),
                                                },
                                                {
                                                    org_id: orgId,
                                                    status: 1,
                                                    displayoption: 1,
                                                    start_date: LessThanOrEqual(ucurrentdatewithouttime),
                                                    end_date: MoreThanOrEqual(ucurrentdatewithouttime),
                                                },
                                            ],
                                        ]
                                    );
                                    if(Manual && Manual.length){
                                        await Promise.all(Manual.map(async (ele)=>{
                                            if(ele.displayoption == 1){
                                                ele.auto_remove_date = ele.end_date;
                                            }
                                            if(ele.displayoption == 0){
                                                ele.start_date = null;
                                                ele.end_date = null;
                                            }
                                            if(ele.title){
                                                let customName = await this.translatorService.frontendReadTranslation(req.lang,`title_${ele['id']}`, `/LC_MESSAGES/Dashboard/UpcomingActivities/${ele['org_id']}/${ele['id']}`,`dynamic`);
                                                ele.title = (customName == '' || customName == `title_${ele['id']}`) ? ele['title'] : customName;
                                            }
                                            if(ele.description){
                                                let customName = await this.translatorService.frontendReadTranslation(req.lang,`description_${ele['id']}`, `/LC_MESSAGES/Dashboard/UpcomingActivities/${ele['org_id']}/${ele['id']}`,`dynamic`);
                                                ele.description = (customName == '' || customName == `description_${ele['id']}`) ? ele['description'] : customName;
                                            }
                                        }));
                                    }
                                    upcomingActivity['Manual'] = Manual;
                                }
                            }
                            let tempUpcomingActivity: any[] = [];
                            if (upcomingActivity && typeof upcomingActivity == 'object') {
                                const dateFormat = 'll';

                                for (const [key, valueArray] of Object.entries(upcomingActivity)) {
                                    if (!Array.isArray(valueArray)) continue;

                                    for (const item of valueArray) {
                                        item.category = key;

                                        if (['Events', 'Challenge', 'Incentive'].includes(key)) {
                                            item.start_date = this.commonDateService.DateTimeFormat(item.start_date, dateFormat);
                                            if (item.end_date) {
                                                item.end_date = this.commonDateService.DateTimeFormat(item.end_date, dateFormat);
                                            }
                                        } else if (key == 'Manual') {
                                            let newLinkPath = await this.urlManageService.onmapUrl(item?.link);
                                            item.link = newLinkPath;
                                            if (item.displayoption == 0) {
                                                item.end_date = moment(item.auto_remove_date).format(dateFormat);
                                            } else {
                                                item.start_date = this.commonDateService.DateTimeFormat(item.start_date, dateFormat);
                                                if (item.end_date) {
                                                    item.end_date = this.commonDateService.DateTimeFormat(item.end_date, dateFormat);
                                                }
                                            }
                                        }

                                        if (item.start_date) {
                                            const monthAbbrev = item.start_date.slice(0, 3);
                                            const translatedMonth = await this.translatorService.frontendReadTranslation(
                                                req.lang,
                                                monthAbbrev,
                                                `/LC_MESSAGES/Common/Month`,
                                                `static`
                                            );
                                            item.start_date = item.start_date.replace(monthAbbrev, translatedMonth);
                                        }

                                        if (item.end_date) {
                                            const monthAbbrev = item.end_date.slice(0, 3);
                                            const translatedMonth = await this.translatorService.frontendReadTranslation(
                                                req.lang,
                                                monthAbbrev,
                                                `/LC_MESSAGES/Common/Month`,
                                                `static`
                                            );
                                            item.end_date = item.end_date.replace(monthAbbrev, translatedMonth);
                                        }
                                        tempUpcomingActivity.push(item);
                                    }
                                }

                                if (tempUpcomingActivity.length > 0) {
                                    const parseDate = (d: string) => moment(d, dateFormat, true);
                                    tempUpcomingActivity.sort((a, b) => {
                                        const dateA = parseDate(a.start_date);
                                        const dateB = parseDate(b.start_date);
                                        return dateA.unix() - dateB.unix();
                                    });
                                    await Promise.all(tempUpcomingActivity?.map(async (ele) => {
                                        let checkUrl = process.env.DOMAIN + '/download-document/15/';
                                        let checkpUrl = process.env.DOMAIN + '/download-pdocument/15/';
                                        ele.link = await this.urlManageService.onmapUrl(ele?.link);
                                        let Urlcheck = checkUrl?.replace('https', 'http');
                                        let Urlcheck1 = checkUrl?.replace('http', 'https');
                                        let Urlcheckp = checkpUrl?.replace('https', 'http');
                                        let Urlcheckp1 = checkpUrl?.replace('http', 'https');
                                        const sanitizeId = (value: string) => value.replace(/[^A-Za-z0-9]/g, '');
                                        const getInternalId = (linkValue: string) => {
                                            const baseName = path.basename(linkValue);
                                            return sanitizeId(baseName);
                                        };
                                        ele.Isinternal = 0;
                                        if (ele.link?.includes(Urlcheck)) {
                                            ele.Isinternal = 1;
                                            ele.IsinternalId = parseInt(getInternalId(ele.link));
                                        }
                                        if (ele.link?.includes(Urlcheck1)) {
                                            ele.Isinternal = 1;
                                            ele.IsinternalId = parseInt(getInternalId(ele.link));
                                        }
                                        if (ele.link?.includes(Urlcheckp)) {
                                            ele.Isinternal = 1;
                                            ele.IsinternalId = parseInt(getInternalId(ele.link));
                                        }
                                        if (ele.link?.includes(Urlcheckp1)) {
                                            ele.Isinternal = 1;
                                            ele.IsinternalId = parseInt(getInternalId(ele.link));
                                        }
                                    }));
                                }
                            }
                            resultedData['upcomingActivitys'] = tempUpcomingActivity;
                        }
                    }
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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

    /**
     * API for Widget Listing for dashboard and also for org side listing
     * For org Widget Listing Required params are (type = org)
     */
    @Post('widgetList')
    async widgetList(@Req() req: Request, @Res() res: Response, @Body() postData: WidgetListInput){
        try{
            let user=req.tokenUser
            let pluginName
            let enableWidget
            let userCompanyData: any = await this.userService.getCompanyDetails({id:user.id,status:1});
            if (userCompanyData && userCompanyData?.company && userCompanyData?.company?.meta
                && userCompanyData?.company?.meta?.enable_widget && userCompanyData?.company?.meta?.enable_widget !== null
                && userCompanyData?.company?.meta?.enable_widget !== '') {
                enableWidget = JSON.parse(userCompanyData?.company?.meta?.enable_widget);
            }
            let activePlugin: any = await this.activePluginService.findOne(
                { company_id: user.org_id },
                null,
                ['company_id', 'plugin_name', 'id']
            );
            if(activePlugin && activePlugin.plugin_name && activePlugin.plugin_name !== null){
                pluginName = JSON.parse(activePlugin?.plugin_name);
            }
            let slider = await this.sliderSettingsService.findOne({org_id: user.org_id, status: Not(2)})
            let companySettings = await this.companySettingsService.findOne({org_id:user.org_id})
            if(postData?.type && postData?.type=='org'){
                if(enableWidget && enableWidget !== '' && Object.keys(enableWidget).length > 0 && enableWidget !== undefined){
                    if(pluginName && pluginName !== '' && Object.keys(pluginName).length > 0 && pluginName !== undefined){
                        if (!enableWidget.hasOwnProperty('spouseregistration')) { //to manage orgadmin which is created from old system 
                            enableWidget.spouseregistration = '0';
                        }
                        let updatedEnableWidget = {};
                        if(!enableWidget.hasOwnProperty('biometricresult')){
                            if ('Biometricresult' in pluginName) {
                                enableWidget['biometricresult'] = '1';
                            }
                            else{
                                enableWidget['biometricresult'] = '0';
                            }
                        }
                        for (let key in enableWidget) {
                            if (key == 'participationsummary') {
                                if ('Incentive' in pluginName || 'Healthcheckup' in pluginName) {
                                    updatedEnableWidget[key] = enableWidget[key];
                                }
                            }
                            if (key == 'upcomingactivities') {
                                if ('Upcomingactivities' in pluginName) {
                                    updatedEnableWidget[key] = enableWidget[key];
                                }
                            }
                            if (key == 'chat') {
                                if ('Challenge' in pluginName) {
                                    updatedEnableWidget[key] = enableWidget[key];
                                }
                            }
                            if (key == 'tasklist') {
                                if ('Coach' in pluginName) {
                                    updatedEnableWidget[key] = enableWidget[key];
                                }
                            }
                            if (key == 'Myplan') {
                                if ('Myplan' in pluginName) {
                                    updatedEnableWidget[key] = enableWidget[key];
                                }
                            }
                            if (key == 'currentpoint') {
                                if ('Incentive' in pluginName) {
                                    updatedEnableWidget[key] = enableWidget[key];
                                }
                            }
                            if (key == 'challengeprogress') {
                                if ('Challenge' in pluginName) {
                                    updatedEnableWidget[key] = enableWidget[key];
                                }
                            }
                            if (key == 'quicklinks') {
                                if ('Quicklink' in pluginName) {
                                    updatedEnableWidget[key] = enableWidget[key];
                                }
                            }
                            if (key == 'spouseregistration') {
                                if (companySettings?.spouse_widget == 1) {
                                    updatedEnableWidget[key] = enableWidget[key];
                                }
                            }
                            if (key == 'supports') {
                                updatedEnableWidget[key] = enableWidget[key];
                            }
                            if (key == 'biometricresult') {
                                if ('Biometricresult' in pluginName) {
                                    updatedEnableWidget[key] = enableWidget[key];
                                }
                            }
                        }
                        return res.status(HttpStatus.OK).json({
                            statusCode: 200,
                            success: 1,
                            error: 0,
                            data: updatedEnableWidget,
                            message: 'success',
                        });
                    }
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: enableWidget,
                        message: 'success',
                    });
                }
                else{
                    let newWidget = {
                        participationsummary:0,
                        upcomingactivities:0,
                        chat:0,
                        tasklist:0,
                        Myplan:0,
                        currentpoint:0,
                        challengeprogress:0,
                        quicklinks:0,
                        spouseregistration:0,
                        supports:0,
                        biometricresult:0
                    }
                    if(pluginName && pluginName !== '' && Object.keys(pluginName).length > 0 && pluginName !== undefined){
                        let updatedEnableWidget = {};
                        for (let key in newWidget) {
                            if (key == 'participationsummary') {
                                if ('Incentive' in pluginName || 'Healthcheckup' in pluginName) {
                                    updatedEnableWidget[key] = newWidget[key];
                                }
                            }
                            if (key == 'upcomingactivities') {
                                if ('Upcomingactivities' in pluginName) {
                                    updatedEnableWidget[key] = newWidget[key];
                                }
                            }
                            if (key == 'chat') {
                                if ('Challenge' in pluginName) {
                                    updatedEnableWidget[key] = newWidget[key];
                                }
                            }
                            if (key == 'tasklist') {
                                if ('Coach' in pluginName) {
                                    updatedEnableWidget[key] = newWidget[key];
                                }
                            }
                            if (key == 'Myplan') {
                                if ('Myplan' in pluginName) {
                                    updatedEnableWidget[key] = newWidget[key];
                                }
                            }
                            if (key == 'currentpoint') {
                                if ('Incentive' in pluginName) {
                                    updatedEnableWidget[key] = newWidget[key];
                                }
                            }
                            if (key == 'challengeprogress') {
                                if ('Challenge' in pluginName) {
                                    updatedEnableWidget[key] = newWidget[key];
                                }
                            }
                            if (key == 'quicklinks') {
                                if ('Quicklink' in pluginName) {
                                    updatedEnableWidget[key] = newWidget[key];
                                }
                            }
                            if (key == 'spouseregistration') {
                                if (companySettings?.spouse_widget == 1) {
                                    updatedEnableWidget[key] = newWidget[key];
                                }
                            }
                            if (key == 'supports') {
                                updatedEnableWidget[key] = newWidget[key];
                            }
                            if (key == 'biometricresult') {
                                if ('Biometricresult' in pluginName) {
                                    updatedEnableWidget[key] = newWidget[key];
                                }
                            }
                        }
                        return res.status(HttpStatus.OK).json({
                            statusCode: 200,
                            success: 1,
                            error: 0,
                            data: updatedEnableWidget,
                            message: 'success',
                        });
                    }
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: newWidget,
                        message: 'success',
                    });
                }
            }
            let result =(enableWidget && enableWidget !== '' && Object.keys(enableWidget).length > 0 && enableWidget !== undefined)? enableWidget :
                {
                    participationsummary : 0,
                    supports:1,
                    upcomingactivities:0,
                    chat:0,
                    Myplan:0,
                    currentpoint:0,
                    challengeprogress:0,
                    quicklinks:0,
                    spouseregistration:0,
                    PointsLeaderboard:0,
                    biometricresult:0
                }
            if(pluginName && pluginName !== '' && Object.keys(pluginName).length > 0 && pluginName !== undefined){
                if (Object.keys(pluginName).includes('Incentive') &&(!enableWidget?.participationsummary || enableWidget.participationsummary == '1')) {
                    result['participationsummary'] = '1'
                }else if(Object.keys(pluginName).includes('Healthcheckuptempremove') && (!enableWidget?.participationsummary || enableWidget.participationsummary == '1')) {
                    result['participationsummary'] = '1'
                }else{
                    result['participationsummary'] = '0'
                }
                if(enableWidget?.supports && enableWidget?.supports == '1') {
                    result['supports'] = '1'
                }else{
                    result['supports'] = '0'
                }
                if(Object.keys(pluginName).includes('Upcomingactivities') && (!enableWidget?.upcomingactivities || enableWidget.upcomingactivities == '1')) {
                    result['upcomingactivities']='1'
                }else{
                    result['upcomingactivities']='0'
                }
                if(Object.keys(pluginName).includes('Chat') &&(!enableWidget?.chat || enableWidget.chat == '1'))
                {
                    result['chat']='1'
                }else{
                    result['chat']='0'
                }
                if(Object.keys(pluginName).includes('Myplan') &&(!enableWidget?.Myplan || enableWidget.Myplan == '1')) {
                    result['Myplan']='1'
                }else{
                    result['Myplan']='0'
                }
                if (Object.keys(pluginName).includes('Incentive') && slider?.hide?.toString() == '1' &&
                    (!enableWidget?.currentpoint || enableWidget.currentpoint == '1')){
                    result['currentpoint']='1'
                    if(companySettings?.pointsleaderboard == 0){
                        result['PointsLeaderboard'] = '0'
                    }
                    if(companySettings?.pointsleaderboard == 1){
                        result['PointsLeaderboard'] = '1'
                    }
                }else{
                    result['currentpoint']='0'
                    result['PointsLeaderboard'] = '0'
                }
                if(Object.keys(pluginName).includes('Challenge') &&
                    (!enableWidget?.challengeprogress || enableWidget.challengeprogress == '1')) {
                    result['challengeprogress']='1'
                }else{
                    result['challengeprogress']='0'
                }
                if(Object.keys(pluginName).includes('Quicklink') &&(!enableWidget?.quicklinks || enableWidget.quicklinks == '1')) {
                    result['quicklinks']='1'
                }else{
                    result['quicklinks']='0'
                }
                if((user?.role_id == 2 || user?.role_id == 16) && companySettings?.spouse_widget == 1 &&
                    (!enableWidget?.spouseregistration || enableWidget.spouseregistration == '1')
                ){
                    result['spouseregistration']='1'
                }else{
                    result['spouseregistration']='0'
                }
                if(Object.keys(pluginName).includes('Biometricresult') &&
                    (!enableWidget?.biometricresult || enableWidget.biometricresult == '1')) {
                        result['biometricresult']='1'
                    }else{
                        result['biometricresult']='0'
                    }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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

    @Post('spouse-link-unlink')
    async spouseLinkUnlink(@Req() req: any, @Res() res: Response, @Body() postData: SpouseLinkUnlinkInput) {
        try {
            if (!postData?.id || (postData?.status == undefined || postData?.status == null)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req?.headers?.x_lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let companyDetails = await this.companyService.findOne(`company.code = '${req.tokenUser?.membership_code}'`,['c_company_settings'],['company.company_name','company.id','companySetting.spouse_option']);
            let text;
            if (companyDetails['companySetting']['spouse_option'] == 1) {
                text = await this.translatorService.frontendReadTranslation(req?.headers?.x_lang,'Spouse / Domestic Partner', `/LC_MESSAGES/Dashboard/SpouseRegistration`,`static`);
            }
            else {
                text = await this.translatorService.frontendReadTranslation(req?.headers?.x_lang,'Spouse', `/LC_MESSAGES/Dashboard/SpouseRegistration`,`static`);
            }
            let message;
            if(postData?.status == 1){
                await this.userService.update({id: postData?.id}, {status: 1});
                message = await this.translatorService.frontendReadTranslation(req?.headers?.x_lang,'The Users', `/LC_MESSAGES/Dashboard/SpouseRegistration`,`static`) +
                    ' ' +
                    text +
                    ' ' +
                    await this.translatorService.frontendReadTranslation(req?.headers?.x_lang, 'has been Linked successfully', `/LC_MESSAGES/Dashboard/SpouseRegistration`,`static`);
            } else {
                await this.userService.update({id: postData?.id}, {status: 0});
                message = await this.translatorService.frontendReadTranslation(req?.headers?.x_lang,'The Users', `/LC_MESSAGES/Dashboard/SpouseRegistration`,`static`) +
                    ' ' +
                    text +
                    ' ' +
                    await this.translatorService.frontendReadTranslation(req?.headers?.x_lang, 'has been Unlinked successfully', `/LC_MESSAGES/Dashboard/SpouseRegistration`,`static`);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message,
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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

    @Post('biometric-program-result')
    async biometricProgram(@Req() req: Request, @Res() res: Response){
        try {
            let user = Object.create(req.tokenUser);
            let resultedData=Object.create(null);
            let orgId = user.org_id;
            let userId = user.id;
            let gender = user.gender;
            let hireDate = user?.date_of_hire;
            let userCompanyData: any = await this.userService.getCompanyDetails({id:userId,status:1});
            let pluginName ;
            let activePlugin: any = await this.activePluginService.findOne({ company_id: orgId }, null,['company_id', 'plugin_name', 'id']);
            let regionColor = {
                'Low risk': user?.company?.theme_setting?.progress_hra_low_color ?? '#5B8D36',
                'Moderate risk': user?.company?.theme_setting?.progress_hra_mod_color ?? '#FFB848',
                'High risk': user?.company?.theme_setting?.progress_hra_high_color ?? '#E34D43',
                'Very High risk': user?.company?.theme_setting?.progress_hra_very_high_color ?? '#E02222',
            }; 

            if(activePlugin && activePlugin.plugin_name && activePlugin.plugin_name !== null){
                pluginName = JSON.parse(activePlugin?.plugin_name);
            }
            if (userCompanyData && userCompanyData?.company && userCompanyData?.company?.meta) {
                if(pluginName && pluginName.Biometricresult){
                    let biometricList = await this.biometricService.listRecord({status: 1});
                    let biometricResult = await this.orgBiometricService.listRecord(`orgBiometric.company_id = ${orgId} AND orgBiometric.status = 1`,{ is_optional: 'ASC' });
                    let biometricSetting = await this.biometricOrgSettingService.findOne({ org_id: orgId , status: 1});
                    let widgetbioTop = 'Not Started'; 
                    let widgetbioTopColor = '#575757'; 
                    let IsDeadLine = 0;
                    let todayDate = this.commonDateService.getTodayDate().startOf('day');

                    if(biometricResult.length > 0 && biometricSetting && (biometricSetting['is_hire']==0 || hireDate=='' || this.commonDateService.getTodayDate(hireDate).startOf('day').isSameOrBefore(this.commonDateService.getTodayDate(biometricSetting.is_hire_date).startOf('day')))){
                        let biometricText = await this.translatorService.frontendReadTranslation(req.lang, 'Healthy Biometrics Program', `/LC_MESSAGES/Dashboard/HealthyBiometricsProgram`, `static`);
                        let seeBellowText = await this.translatorService.frontendReadTranslation(req.lang, '(See below)', `/LC_MESSAGES/Dashboard/HealthyBiometricsProgram`, `static`);
                        let completeHalfText = await this.translatorService.frontendReadTranslation(req.lang, 'Complete Half Text', `/LC_MESSAGES/Dashboard/HealthyBiometricsProgram`, `static`);
                        let completeText = await this.translatorService.frontendReadTranslation(req.lang, 'Complete Text', `/LC_MESSAGES/Dashboard/HealthyBiometricsProgram`, `static`);
                        let notCompleteText = await this.translatorService.frontendReadTranslation(req.lang, 'Not Completed', `/LC_MESSAGES/Dashboard/HealthyBiometricsProgram`, `static`);
                        let dynamicCompleteText = biometricSetting['is_complete_message'] ? await this.translatorService.frontendReadTranslation(req.lang, `complete_${biometricSetting['id']}`, `/LC_MESSAGES/Dashboard/HealthyBiometricsProgram/${orgId}`, `dynamic`) : null;
                        let dynamicInCompleteText = biometricSetting['is_incomplete_message'] ? await this.translatorService.frontendReadTranslation(req.lang, `incomplete_${biometricSetting['id']}` , `/LC_MESSAGES/Dashboard/HealthyBiometricsProgram/${orgId}`, `dynamic`) : null;
                        let dynamicOnTarckText = biometricSetting['is_ontrack_message'] ? await this.translatorService.frontendReadTranslation(req.lang, `ontrack_${biometricSetting['id']}` , `/LC_MESSAGES/Dashboard/HealthyBiometricsProgram/${orgId}`, `dynamic`) : null;
                        let onTrackText = await this.translatorService.frontendReadTranslation(req.lang, 'On Track', `/LC_MESSAGES/Dashboard/HealthyBiometricsProgram`, `static`);
                        let toCompleteText = await this.translatorService.frontendReadTranslation(req.lang, 'To Complete', `/LC_MESSAGES/Dashboard/HealthyBiometricsProgram`, `static`);
                        let toQualifyText = await this.translatorService.frontendReadTranslation(req.lang, 'To Qualify', `/LC_MESSAGES/Dashboard/HealthyBiometricsProgram`, `static`);

                        for(let index = 0; index<=1; index++){
                            const startDate = this.commonDateService.getTodayDate(biometricResult[0][`test${index + 1}_start_date`]);
                            const endDate   = this.commonDateService.getTodayDate(biometricResult[0][`test${index + 1}_end_date`]);
                            if (todayDate.isSameOrAfter(startDate) && todayDate.isSameOrBefore(endDate)) {
                                widgetbioTop = dynamicOnTarckText ?? `${onTrackText} <span style="text-decoration: underline;">${toCompleteText}</span> ${toQualifyText} <br>${biometricText}. ${seeBellowText}`;
                                widgetbioTopColor = regionColor['Moderate risk'];
                            }

                            if (todayDate.isAfter(startDate) && todayDate.isAfter(endDate)) {
                                widgetbioTopColor = regionColor['Very High risk'];
                                IsDeadLine = 1;
                                widgetbioTop = dynamicInCompleteText ?? `${notCompleteText} <br>${biometricText}. ${seeBellowText}`;
                            } else {
                                IsDeadLine = 0;
                            }
                            
                            let resultedHcData = await this.hcBiometricsService.commonQueryBuilder(['biometrics.user_id','biometrics.height','biometrics.weight','biometrics.test_type','biometrics.hdl','biometrics.triglycerides','biometrics.blood_glucose','biometrics.bmi','biometrics.waist','biometrics.systolic','biometrics.diastolic','biometrics.total_cholesterol','biometrics.ldl','biometrics.alc','biometrics.created','biometrics.test_type','users.gender'],
                                `users.role_id in(2,16) AND biometrics.user_id = '${userId}' AND DATE_FORMAT(biometrics.created,"%Y-%m-%d") >= '${startDate.format('YYYY-MM-DD')}' AND DATE_FORMAT(biometrics.created,"%Y-%m-%d") <= '${endDate.format('YYYY-MM-DD')}'`,
                                {},
                                [{
                                    join_table: 'biometrics.users',
                                    alias: 'users',
                                    table: tableConstant.TBL_USERS,
                                    on_condition: `users.id = biometrics.user_id`,
                                    join_type: 'inner_one',
                                }],
                            'getMany');

                            let resultedftData = await this.ftBiometricsService.commonQueryBuilder(['ftBiometrics.user_id','ftBiometrics.height_ft','ftBiometrics.height_in','ftBiometrics.weight','ftBiometrics.hdl','ftBiometrics.triglycerides','ftBiometrics.weight','ftBiometrics.glucose','ftBiometrics.systolic','ftBiometrics.diastolic','ftBiometrics.chol_total','ftBiometrics.ldl','ftBiometrics.alc','ftBiometrics.added_date','ftBiometrics.glucose_type','users.gender'],
                                `users.role_id in(2,16) AND ftBiometrics.user_id = '${userId}' AND ftBiometrics.type = 1 AND DATE_FORMAT(ftBiometrics.added_date,"%Y-%m-%d") >= '${startDate.format('YYYY-MM-DD')}' AND DATE_FORMAT(ftBiometrics.added_date,"%Y-%m-%d") <= '${endDate.format('YYYY-MM-DD')}'`,
                                {"ftBiometrics.added_date": "DESC"},
                                [{
                                    join_table: 'ftBiometrics.users',
                                    alias: 'users',
                                    table: tableConstant.TBL_USERS,
                                    on_condition: `users.id = ftBiometrics.user_id`,
                                    join_type: 'inner_one',
                                }],
                            'getMany');

                            let resultedHraData = await this.assessmentHraBiometricsService.commonQueryBuilder(['hraBiometric.user_id','hraBiometric.height_ft','hraBiometric.height_in','hraBiometric.weight','hraBiometric.test_type','hraBiometric.hdl','hraBiometric.triglycerides','hraBiometric.weight','hraBiometric.blood_glucose','hraBiometric.waist','hraBiometric.bp_systolic','hraBiometric.bp_diastolic','hraBiometric.total_cholesterol','hraBiometric.ldl','hraBiometric.alc','hraBiometric.date','hraBiometric.test_type','users.gender'],
                                `users.role_id in(2,16) AND hraBiometric.user_id = '${userId}' AND DATE_FORMAT(hraBiometric.date,"%Y-%m-%d") >= '${startDate.format('YYYY-MM-DD')}' AND DATE_FORMAT(hraBiometric.date,"%Y-%m-%d") <= '${endDate.format('YYYY-MM-DD')}'`,
                                {},
                                [{
                                    join_table: 'hraBiometric.users',
                                    alias: 'users',
                                    table: tableConstant.TBL_USERS,
                                    on_condition: `users.id = hraBiometric.user_id`,
                                    join_type: 'inner_one',
                                }],
                            'getMany');

                            if (resultedHcData && resultedHcData.length) {
                                for(let h_bio of resultedHcData) {
                                    h_bio.waist = h_bio?.waist ? Number(h_bio?.waist) : 0;
                                    h_bio.alc = h_bio?.alc ? Number(h_bio?.alc) : 0;
                                    const dataarr = {
                                        "Height": h_bio?.height.replace(":", "."),
                                        "Weight": h_bio?.weight,
                                        "Total Cholesterol": h_bio?.total_cholesterol,
                                        "HDL Cholesterol": h_bio?.hdl,
                                        "Blood Glucose": h_bio?.blood_glucose,
                                        "LDL Cholesterol": h_bio?.ldl,
                                        "Triglycerides": h_bio?.triglycerides,
                                        "Body Mass Index": h_bio?.bmi,
                                        "Waist Circumference": h_bio?.waist?.toFixed(2),
                                        "Blood Pressure - Systolic": h_bio?.systolic,
                                        "Blood Pressure - Diastolic": h_bio?.diastolic,
                                        "A1C": Number(h_bio?.alc.toFixed(2)),
                                        added_date: h_bio?.created,
                                        Test_type: h_bio?.test_type
                                    };

                                    for(let wb of biometricResult) {
                                        const biometricValue = wb.biometric;
                                        const metric = biometricList?.find(bio => bio.id == biometricValue)?.biometric;
                                        const valueKey = `value${index + 1}`;
                                        const dateKey = `date${index + 1}`;
                                        const testKey = `Test_type${index + 1}`;
                                        if (!wb?.['data']?.[valueKey] && dataarr[metric] !== "") {
                                            if(!wb['data']) {
                                                wb['data'] = {};
                                            }
                                            wb['data'][valueKey] = dataarr[metric];
                                            wb['data'][dateKey] = dataarr.added_date;
                                            wb['data'][testKey] = dataarr.Test_type;
                                        } 
                                        else {
                                            if (wb?.['data']?.[valueKey] && dataarr[metric] !== "" && wb?.['data']?.[dateKey] &&  moment(wb?.['data']?.[dateKey]).isSameOrBefore(moment(dataarr.added_date))) 
                                            {
                                                wb['data'][valueKey] = dataarr[metric];
                                                wb['data'][dateKey] = dataarr.added_date;
                                                wb['data'][testKey] = dataarr.Test_type;
                                            }
                                        }
                                    }
                                }
                            }

                            if (resultedftData && resultedftData.length) {
                                for(let f_bio of resultedftData) {
                                    const heightInches = f_bio?.height_ft && f_bio?.height_in ? (f_bio?.height_ft * 12) + f_bio?.height_in : null;
                                    const bmi = heightInches ? Number(((f_bio?.weight * 703) / (heightInches ** 2)).toFixed(2)) : "";
                                    f_bio.alc = f_bio?.alc ? Number(f_bio?.alc) : 0;
                                    const dataarr = {
                                        "Height": `${f_bio?.height_ft}.${f_bio?.height_in}`,
                                        "Weight": f_bio?.weight,
                                        "Total Cholesterol": f_bio?.chol_total,
                                        "HDL Cholesterol": f_bio?.hdl,
                                        "Blood Glucose": f_bio?.glucose,
                                        "LDL Cholesterol": f_bio?.ldl,
                                        "Triglycerides": f_bio?.triglycerides,
                                        "Body Mass Index": bmi,
                                        "Blood Pressure - Systolic": f_bio?.systolic,
                                        "Blood Pressure - Diastolic": f_bio?.diastolic,
                                        "A1C": Number(f_bio?.alc?.toFixed(2)),
                                        added_date: f_bio?.added_date,
                                        Test_type: f_bio?.glucose_type
                                    };

                                    for(let wb of biometricResult){
                                        const biometricValue = wb.biometric;
                                        const metric = biometricList?.find(bio => bio.id == biometricValue)?.biometric;
                                        const valueKey = `value${index + 1}`;
                                        const dateKey = `date${index + 1}`;
                                        const testKey = `Test_type${index + 1}`;
                                        if (!wb?.['data']?.[valueKey] && dataarr[metric] !== "") {
                                            if(!wb['data']) {
                                                wb['data'] = {};
                                            }
                                            wb['data'][valueKey] = dataarr[metric];
                                            wb['data'][dateKey] = dataarr.added_date;
                                            wb['data'][testKey] = dataarr.Test_type;
                                        } else if (
                                            wb?.['data']?.[valueKey] &&
                                            dataarr[metric] !== "" &&
                                            wb?.['data']?.[dateKey] &&
                                            moment(wb?.['data']?.[dateKey]).isSameOrBefore(moment(dataarr.added_date))
                                        ) {
                                            wb['data'][valueKey] = dataarr[metric];
                                            wb['data'][dateKey] = dataarr.added_date;
                                            wb['data'][testKey] = dataarr.Test_type;
                                        }
                                    }
                                }
                            }

                            if (resultedHraData && resultedHraData.length) {
                                for(let hra_bio of resultedHraData) {
                                    const heightInches = hra_bio?.height_ft && hra_bio?.height_in ? (hra_bio?.height_ft * 12) + hra_bio?.height_in : null;
                                    const bmi = heightInches ? Number(((hra_bio?.weight * 703) / (heightInches ** 2)).toFixed(2)) : "";
                                    hra_bio.alc = hra_bio?.alc ? Number(hra_bio?.alc) : 0;
                                    hra_bio.waist = hra_bio?.waist ? Number(hra_bio?.waist) : 0;
                                    const dataarr = {
                                    "Height": `${hra_bio?.height_ft}.${hra_bio?.height_in}`,
                                    "Weight": hra_bio?.weight,
                                    "Total Cholesterol": hra_bio?.total_cholesterol,
                                    "HDL Cholesterol": hra_bio?.hdl,
                                    "Blood Glucose": hra_bio?.blood_glucose,
                                    "Waist Circumference": Number(hra_bio?.waist?.toFixed(2)),
                                    "LDL Cholesterol": hra_bio?.ldl,
                                    "Triglycerides": hra_bio?.triglycerides,
                                    "Body Mass Index": bmi,
                                    "Blood Pressure - Systolic": hra_bio?.bp_systolic,
                                    "Blood Pressure - Diastolic": hra_bio?.bp_diastolic,
                                    "A1C": Number(hra_bio?.alc?.toFixed(2)),
                                    added_date: hra_bio?.date,
                                    Test_type: hra_bio?.test_type
                                    };

                                    for(let wb of biometricResult) {
                                        const biometricValue = wb.biometric;
                                        const metric = biometricList?.find(bio => bio.id == biometricValue)?.biometric;
                                        const valueKey = `value${index + 1}`;
                                        const dateKey = `date${index+ 1}`;
                                        const testKey = `Test_type${index + 1}`;

                                        if (!wb?.['data']?.[valueKey] && dataarr[metric] !== "") {
                                            if(!wb['data']) {
                                                wb['data'] = {};
                                            }
                                            wb['data'][valueKey] = dataarr[metric];
                                            wb['data'][dateKey] = dataarr.added_date;
                                            wb['data'][testKey] = dataarr.Test_type;
                                        } 
                                        else if (wb?.['data']?.[valueKey] && dataarr[metric] !== "" && wb?.['data']?.[dateKey] && moment(wb?.['data']?.[dateKey]).isSameOrBefore(moment(dataarr.added_date))) 
                                        {
                                            wb['data'][valueKey] = dataarr[metric];
                                            wb['data'][dateKey] = dataarr.added_date;
                                            wb['data'][testKey] = dataarr.Test_type;
                                        }
                                    }
                                }
                            }
                        }
                        
                        let Is_Required = 0;
                        let Is_Completed = 0;
                        let Date1CompTo = 0;
                        let Date2CompTo = 0;
                        let Date1Comp = '';
                        let Date2Comp = ''; 
                        let HRAData = {
                            0: 'Low risk',
                            1: 'Moderate risk',
                            2: 'High risk',
                            3: 'Very High risk'
                        }
                        let Systolic = 0;
                        let Diastolic = 0;
                        let SysDia = 0;
                        let SysDiaCom = 0;
                        let widgetbioheader: Record<string, {}> = {
                            1: {},
                            2: {},
                            3: {}
                        };
                        if(biometricSetting){
                            Is_Required = biometricSetting['is_required'];
                        }
                        let OptionalData = Object.create(null);
                        let HRAOptionsArray = Object.create(null);
                        HRAOptionsArray['Body Mass Index'] = 'bmi';
                        HRAOptionsArray['Blood Pressure - Systolic'] = 'systolic';
                        HRAOptionsArray['Blood Pressure - Diastolic'] = 'diastolic';
                        HRAOptionsArray['LDL Cholesterol'] = 'ldl';
                        HRAOptionsArray['Triglycerides'] = 'triglycerides';
                        HRAOptionsArray['Blood Glucose'] = 'blood_glucose';
                        HRAOptionsArray['Total Cholesterol'] = 'total_cholesterol';
                        HRAOptionsArray['HDL Cholesterol'] = {};
                        HRAOptionsArray['HDL Cholesterol']['f'] = 'hdlw';
                        HRAOptionsArray['HDL Cholesterol']['m'] = 'hdlm';
                        HRAOptionsArray['Waist Circumference'] = {};
                        HRAOptionsArray['Waist Circumference']['f'] = 'waistw';
                        HRAOptionsArray['Waist Circumference']['m'] = 'waistm';
                        HRAOptionsArray['A1C'] = 'alc';
                        let Biomheartcolor;
                        let Biomheartcolorval;
                        for (const [widgetbiokey, widgetbioval] of biometricResult.entries()) {
                            let HRAOptions = '';
                            if(widgetbioval['biometricsList']['biometric']=='Waist Circumference' || widgetbioval['biometricsList']['biometric']=='HDL Cholesterol'){
                                HRAOptions = ((gender && gender!='' && (gender=='f' || gender=='F')) ? HRAOptionsArray[widgetbioval['biometricsList']['biometric']]['f'] : HRAOptionsArray[widgetbioval['biometricsList']['biometric']]['m']);
                            }else{
                                HRAOptions = HRAOptionsArray[widgetbioval['biometricsList']['biometric']];
                            }    
                            if(widgetbioval['is_optional']!=0){                        
                                OptionalData[widgetbioval['is_optional']] = widgetbioval?.id;
                            } 
                            if(widgetbioval?.['data']?.['date1']){
                                if(Date1Comp==''){
                                    Date1Comp = widgetbioval['data']['date1'];
                                }else{
                                    if(widgetbioval['data']['date1'] && moment(widgetbioval['data'].date1).isAfter(moment(Date1Comp))){
                                        Date1Comp = widgetbioval['data']['date1'];
                                    }
                                }
                            }
                            if(widgetbioval?.['data']?.['date2']){    
                                if(Date2Comp==''){
                                    Date2Comp = widgetbioval['data']['date2'];
                                }else{
                                    if(widgetbioval['data']['date2'] && moment(widgetbioval['data']['date2']).isAfter(moment(Date2Comp))){
                                        Date2Comp = widgetbioval['data']['date2'];   
                                    }
                                }
                            }
                            if(gender && gender!='' && (gender=='f' || gender=='F') && widgetbioval['start_range_female']!=0 && widgetbioval['end_range_female']!=0){
                                widgetbioval['start_range_male'] = biometricResult[widgetbiokey]['start_range_male'] = widgetbioval['start_range_female'];
                                widgetbioval['end_range_male'] =  biometricResult[widgetbiokey]['end_range_male'] = widgetbioval['end_range_female'];
                            }
                            if(widgetbioval['start_range_male']==0 && widgetbioval['end_range_male']==0){
                                widgetbioval['start_range_male'] = biometricResult[widgetbiokey]['start_range_male'] = widgetbioval['biometricsList']['start_range'];
                                widgetbioval['end_range_male'] = biometricResult[widgetbiokey]['end_range_male'] = widgetbioval['biometricsList']['end_range'];
                            }
                            if(!biometricResult[widgetbiokey]['data']){
                                biometricResult[widgetbiokey]['data'] = {};
                            }
                            biometricResult[widgetbiokey]['data']['part1val'] = 'region-1';
                            biometricResult[widgetbiokey]['data']['part2val'] = 'region-2';
                            biometricResult[widgetbiokey]['data']['part3val'] = 'region-3';
                            biometricResult[widgetbiokey]['data']['part4val'] = 'region-4';
                            biometricResult[widgetbiokey]['data']['tick1val'] = 'Low';
                            biometricResult[widgetbiokey]['data']['tick2val'] = 'Moderate';
                            biometricResult[widgetbiokey]['data']['tick3val'] = 'High';
                            biometricResult[widgetbiokey]['data']['tick4val'] = 'Very High';
                            biometricResult[widgetbiokey]['data']['part1'] = 0;
                            biometricResult[widgetbiokey]['data']['part2'] = 0;
                            biometricResult[widgetbiokey]['data']['part3'] = 0;
                            biometricResult[widgetbiokey]['data']['part4'] = 0;
                            let limit = 1;

                            if(widgetbioval['graph_low_start']==0 && widgetbioval['graph_low_end']==0 && widgetbioval['graph_mod_start']==0 && widgetbioval['graph_mod_end']==0 && widgetbioval['graph_high_start']==0 && widgetbioval['graph_high_end']==0 && widgetbioval['graph_vhigh_start']==0 && widgetbioval['graph_vhigh_end']==0){
                                widgetbioval['graph_low_start'] = biometricResult[widgetbiokey]['graph_low_start'] = widgetbiokey['biometricsList']['graph_low_start'];
                                widgetbioval['graph_low_end'] = biometricResult[widgetbiokey]['graph_low_end'] = widgetbiokey['biometricsList']['graph_low_end'];
                                widgetbioval['graph_mod_start'] = biometricResult[widgetbiokey]['graph_mod_start'] = widgetbiokey['biometricsList']['graph_mod_start'];
                                widgetbioval['graph_mod_end'] = biometricResult[widgetbiokey]['graph_mod_end'] = widgetbiokey['biometricsList']['graph_mod_end'];
                                widgetbioval['graph_high_start'] = biometricResult[widgetbiokey]['graph_high_start'] = widgetbiokey['biometricsList']['graph_high_start'];
                                widgetbioval['graph_high_end'] = biometricResult[widgetbiokey]['graph_high_end'] = widgetbiokey['biometricsList']['graph_high_end'];
                                widgetbioval['graph_vhigh_start'] = biometricResult[widgetbiokey]['graph_vhigh_start'] = widgetbiokey['biometricsList']['graph_vhigh_start'];
                                widgetbioval['graph_vhigh_end'] = biometricResult[widgetbiokey]['graph_vhigh_end'] = widgetbiokey['biometricsList']['graph_vhigh_end'];
                            }
                            let widgetLOW = 0;
                            let widgetHIGH = 0;
                            if(widgetbioval['biometricsList']['biometric']=='HDL Cholesterol'){
                                biometricResult[widgetbiokey]['data']['part1'] = Number(((widgetbioval['graph_high_end']*100)/widgetbioval['graph_low_end']).toFixed(2));
                                biometricResult[widgetbiokey]['data']['part2'] = Number(((((widgetbioval['graph_mod_end']*100)/widgetbioval['graph_low_end']) - biometricResult[widgetbiokey]['data']['part1'])).toFixed(2));
                                biometricResult[widgetbiokey]['data']['part3'] = Number((100 - (biometricResult[widgetbiokey]['data']['part1'] + biometricResult[widgetbiokey]['data']['part2'])).toFixed(2));
                                biometricResult[widgetbiokey]['data']['part3val'] = 'region-1';
                                biometricResult[widgetbiokey]['data']['part1val'] = 'region-3';
                                limit = widgetbioval['graph_low_end'];
                                biometricResult[widgetbiokey]['data']['tick1val'] = 'High';
                                biometricResult[widgetbiokey]['data']['tick3val'] = 'Low';
                            }else{
                                if(widgetbioval['graph_vhigh_end']!=0){
                                    widgetHIGH = widgetbioval['graph_vhigh_end'];
                                    if(widgetHIGH==0){
                                        widgetHIGH = widgetbioval['graph_high_end'];
                                    }
                                }
                                else{
                                    widgetHIGH = widgetbioval['graph_high_end'];
                                }
                                if(widgetHIGH==0){
                                    widgetHIGH = widgetbioval['graph_mod_end'];
                                    if(widgetHIGH==0){
                                        widgetHIGH = widgetbioval['graph_low_end'];
                                        if(widgetHIGH==0){
                                            widgetHIGH = widgetbioval['graph_low_start'];
                                        }
                                    }
                                }
                                biometricResult[widgetbiokey]['data']['part1'] = widgetHIGH > 0 ? Number(((widgetbioval['graph_low_end']*100)/widgetHIGH).toFixed(2)) : 0;
                                if(widgetbioval['graph_low_start']==widgetHIGH){ 
                                    biometricResult[widgetbiokey]['data']['part1']=100; 
                                }
                                if(widgetbioval['graph_mod_start']==0 && widgetbioval['graph_mod_end']==0){
                                    biometricResult[widgetbiokey]['data']['part2'] = 0;
                                }else{
                                    biometricResult[widgetbiokey]['data']['part2'] = Number((((widgetbioval['graph_mod_end'] * 100)/widgetHIGH) - biometricResult[widgetbiokey]['data']['part1']).toFixed(2));
                                }
                                if(widgetbioval['graph_high_start']==0 || widgetbioval['graph_high_end']==0){
                                    biometricResult[widgetbiokey]['data']['part3'] = 0;
                                }else{
                                    biometricResult[widgetbiokey]['data']['part3'] = Number((((widgetbioval['graph_high_end']*100)/widgetHIGH) - (biometricResult[widgetbiokey]['data']['part1'] + biometricResult[widgetbiokey]['data']['part2'])).toFixed(2));
                                }
                                if(widgetbioval['graph_vhigh_start']==0 && widgetbioval['graph_vhigh_end']==0){
                                    biometricResult[widgetbiokey]['data']['part4'] = 0;
                                }else{
                                    biometricResult[widgetbiokey]['data']['part4'] = Number((100 - (biometricResult[widgetbiokey]['data']['part1'] + biometricResult[widgetbiokey]['data']['part2'] + biometricResult[widgetbiokey]['data']['part3'])).toFixed(2));
                                }
                                limit = widgetHIGH;
                            }
                            if (biometricResult[widgetbiokey]['data']['part1'] == 0) {
                                biometricResult[widgetbiokey]['data']['tick1'] = 0;
                            } else {
                                biometricResult[widgetbiokey]['data']['tick1'] = Number((biometricResult[widgetbiokey]['data']['part1'] / 2).toFixed(2));
                            }
                            biometricResult[widgetbiokey]['data']['tick2'] = Number((Number((biometricResult[widgetbiokey]['data']['part2'] / 2).toFixed(2)) + biometricResult[widgetbiokey]['data']['part1']).toFixed(2));
                            biometricResult[widgetbiokey]['data']['tick3'] = Number((Number((biometricResult[widgetbiokey]['data']['part3'] / 2).toFixed(2)) + biometricResult[widgetbiokey]['data']['part1'] +biometricResult[widgetbiokey]['data']['part2']).toFixed(2));
                            if(biometricResult[widgetbiokey]['data']['part4']){
                                biometricResult[widgetbiokey]['data']['tick4'] = Number((Number((biometricResult[widgetbiokey]['data']['part4'] / 2).toFixed(2)) + biometricResult[widgetbiokey]['data']['part1'] + biometricResult[widgetbiokey]['data']['part2'] + biometricResult[widgetbiokey]['data']['part3']).toFixed(2));
                            }
                            if(biometricResult[widgetbiokey]['data']['part1']==0){
                                delete biometricResult[widgetbiokey]['data']['tick1'];
                            }
                            if(biometricResult[widgetbiokey]['data']['part2']==0){
                                delete biometricResult[widgetbiokey]['data']['tick2'];
                            }
                            if(biometricResult[widgetbiokey]['data']['part3']==0){
                                delete biometricResult[widgetbiokey]['data']['tick3'];
                            }
                            if(biometricResult[widgetbiokey]['data']['part4']==0){
                                delete biometricResult[widgetbiokey]['data']['tick4'];
                            }
                            if(widgetbioval['data']['value1']){ 
                                Date1CompTo++; 
                                biometricResult[widgetbiokey]['data']['value1per'] = ((widgetbioval['data']['value1']*100/limit) > 100) ? 100 : Number((widgetbioval['data']['value1']*100/limit).toFixed(2));
                            }
                            if(widgetbioval['data']['value2']){ 
                                Date2CompTo++; biometricResult[widgetbiokey]['data']['value2per'] = ((widgetbioval['data']['value2']*100/limit) > 100) ? 100 : Number((widgetbioval['data']['value2']*100/limit).toFixed(2));  
                            }
                            if(!biometricSetting || biometricSetting['qualifie_type']==0){
                                if(widgetbioval['data']['value2'] && widgetbioval['data']['value2'] >= widgetbioval['start_range_male'] && widgetbioval['data']['value2'] <= widgetbioval['end_range_male']){
                                    biometricResult[widgetbiokey]['data']['status'] = 'Goal met';
                                    biometricResult[widgetbiokey]['data']['color'] = regionColor['Low risk'];
                                    Is_Completed++;
                                }else{
                                    biometricResult[widgetbiokey]['data']['status'] = ' Goal not met';
                                    biometricResult[widgetbiokey]['data']['color'] = regionColor['Very High risk']; 
                                }
                                biometricResult[widgetbiokey]['data']['Goalstatus'] =  widgetbioval['start_range_male'] + " - " + widgetbioval['end_range_male']; 
                                biometricResult[widgetbiokey]['data']['Tablestatus'] =  '';
                            }
                            else{
                                if(biometricSetting['qualifie_type']==1){
                                    biometricResult[widgetbiokey]['data']['GoalActualstatus'] = '';
                                    biometricResult[widgetbiokey]['data']['Goalstatus'] = '---';
                                    if(widgetbioval['data']['value1'] && widgetbioval['data']['value1']!='' && widgetbioval['data']['value1']!=0 && biometricSetting['option']){
                                        if(widgetbioval['biometricsList']['biometric']=='HDL Cholesterol'){
                                            biometricResult[widgetbiokey]['data']['Goalstatus'] =  widgetbioval['data']['value1'] + ((widgetbioval['data']['value1']*biometricSetting['option'])/100) + '  or higher';
                                            biometricResult[widgetbiokey]['data']['GoalActualstatus'] = widgetbioval['data']['value1'] + ((widgetbioval['data']['value1']*biometricSetting['option'])/100); 
                                        }else{
                                            biometricResult[widgetbiokey]['data']['Goalstatus'] =  Number(Number(widgetbioval['data']['value1'] - ((widgetbioval['data']['value1']*biometricSetting['option'])/100)).toFixed(2)) + '  or lower';
                                            if(widgetbioval['biometricsList']['biometric']!='Waist Circumference' && widgetbioval['biometricsList']['biometric']!='Body Mass Index' && widgetbioval['biometricsList']['biometric']!='A1C'){
                                                biometricResult[widgetbiokey]['data']['Goalstatus'] =  Number(widgetbioval['data']['value1'] - ((widgetbioval['data']['value1']*biometricSetting['option'])/100)) + '  or lower';
                                            }
                                            biometricResult[widgetbiokey]['data']['GoalActualstatus'] = widgetbioval['data']['value1'] - ((widgetbioval['data']['value1']*biometricSetting['option'])/100);
                                        }
                                        if(widgetbioval['biometricsList']['biometric']=='Triglycerides' || widgetbioval['biometricsList']['biometric']=='Blood Glucose' || widgetbioval['biometricsList']['biometric']=='LDL Cholesterol' || widgetbioval['biometricsList']['biometric']=='HDL Cholesterol'){
                                            biometricResult[widgetbiokey]['data']['Goalstatus'] = String(biometricResult[widgetbiokey]['data']['Goalstatus']).replace(/or/g, "mg/dL or");
                                        }
                                        else if(widgetbioval['biometricsList']['biometric']=='Waist Circumference'){
                                            biometricResult[widgetbiokey]['data']['Goalstatus'] = String(biometricResult[widgetbiokey]['data']['Goalstatus']).replace(/or/g, "inches or");
                                        } 
                                    } 
                                    if(widgetbioval['data']['value1'] && widgetbioval['data']['value2'] && biometricSetting['option'] && biometricResult[widgetbiokey]['data']['GoalActualstatus']!='' && ((widgetbioval['biometricsList']['biometric']=='HDL Cholesterol' &&  widgetbioval['data']['value2'] >= widgetbioval['data']['value1'] && widgetbioval['data']['value2'] >= biometricResult[widgetbiokey]['data']['GoalActualstatus'] && ((widgetbioval['data']['value2']==widgetbioval['data']['value1']) ? widgetbioval['data']['value2']>=widgetbioval['start_range_male'] : '1')) || (widgetbioval['biometricsList']['biometric']!='HDL Cholesterol' && widgetbioval['data']['value1'] >= widgetbioval['data']['value2'] &&  widgetbioval['data']['value2'] <= biometricResult[widgetbiokey]['data']['GoalActualstatus'] && ((widgetbioval['data']['value2']==widgetbioval['data']['value1']) ? widgetbioval['data']['value2']<=widgetbioval['end_range_male'] : '1')))){
                                        biometricResult[widgetbiokey]['data']['status'] = 'Goal met';
                                        biometricResult[widgetbiokey]['data']['color'] = regionColor['Low risk'];
                                        Is_Completed++;
                                    }else{
                                        biometricResult[widgetbiokey]['data']['status'] = ' Goal not met';
                                        biometricResult[widgetbiokey]['data']['color'] = regionColor['Very High risk']; 
                                    }
                                    biometricResult[widgetbiokey]['data']['Tablestatus'] =  '';
                                }
                                let tempgoalstatus;
                                let sameStatus;
                                let tempH;
                                if(biometricSetting['qualifie_type']==2 || biometricSetting['qualifie_type']==3){
                                    let HRAstatus = -1;
                                    let HRAstatusT1 = -1;
                                    if(widgetbioval['data']['value1'] && biometricSetting['qualifie_type']==3){
                                        HRAstatusT1 = await this.commonHealthService.getClassificationAchivementStatus(HRAOptions,biometricResult[widgetbiokey]['data']['value1']);
                                    }
                                    if(widgetbioval['data']['value2']){
                                        HRAstatus = await this.commonHealthService.getClassificationAchivementStatus(HRAOptions,biometricResult[widgetbiokey]['data']['value2']);  
                                    }
                                    if((widgetbioval['data']['value1'] && widgetbioval['data']['value1']!='' && widgetbioval['data']['value1']!=0) || (biometricSetting['qualifie_type']==2 && biometricSetting['is_based']==1)){
                                            tempgoalstatus = 'lower';
                                            if(widgetbioval['biometricsList']['biometric']=='HDL Cholesterol'){
                                                tempgoalstatus = 'higher';
                                            }
                                            sameStatus = '';
                                            if(biometricSetting['qualifie_type']==3 && widgetbioval['data']['value1'] && widgetbioval['data']['value1']!='' && widgetbioval['data']['value1']!=0){
                                                if(widgetbioval['biometricsList']['biometric']=='HDL Cholesterol'){
                                                    tempH = (HRAstatusT1 >=2) ? '2' : (HRAstatusT1 + biometricSetting['category_option']); 
                                                    if(tempH >= 2 ){ tempH=2; }
                                                    biometricResult[widgetbiokey]['data']['Goalstatus'] =  HRAData[tempH] + '  or ' + tempgoalstatus;
                                                    biometricResult[widgetbiokey]['data']['Goalactualstatus'] = HRAData[tempH];
                                                    if(biometricResult[widgetbiokey]['data']['Goalstatus']=='High risk or higher') { 
                                                        biometricResult[widgetbiokey]['data']['Goalstatus'] = 'High risk'; 
                                                    } 
                                                    if(HRAstatus==tempH){ 
                                                        sameStatus = '> ' + widgetbioval['data']['value1'];
                                                    }
                                                }
                                                else{
                                                    tempH = ((HRAstatusT1 <=0) ? '0' : ((widgetbioval['biometricsList']['biometric']=='A1C') ? ((HRAstatusT1-2)-biometricSetting['category_option']) : (HRAstatusT1-biometricSetting['category_option'])));
                                                    if(tempH < 0 ){ tempH=0; }
                                                    biometricResult[widgetbiokey]['data']['Goalstatus'] =  HRAData[tempH] + ' or ' + tempgoalstatus;   
                                                    biometricResult[widgetbiokey]['data']['Goalactualstatus'] = HRAData[tempH];
                                                    if(biometricResult[widgetbiokey]['data']['Goalstatus']=='Low risk or lower') { 
                                                        biometricResult[widgetbiokey]['data']['Goalstatus'] = 'Low risk'; 
                                                    }
                                                    if(HRAstatus==tempH){ sameStatus = '< ' +  widgetbioval['data']['value1']; }
                                                }
                                            }else{
                                                biometricResult[widgetbiokey]['data']['Goalstatus'] = HRAData[biometricSetting['option']] + '  or ' + tempgoalstatus;
                                                biometricResult[widgetbiokey]['data']['Goalactualstatus'] = HRAData[biometricSetting['option']];
                                                if(widgetbioval['biometricsList']['biometric']=='HDL Cholesterol' && biometricResult[widgetbiokey]['data']['Goalstatus']=='High risk or higher'){
                                                    biometricResult[widgetbiokey]['data']['Goalstatus'] = 'High risk';
                                                    if(HRAstatus == biometricSetting['option'] && widgetbioval['data']['value1'] && widgetbioval['data']['value1']!='' && widgetbioval['data']['value1']!=0){ 
                                                        sameStatus = '> ' +  widgetbioval['data']['value1']; 
                                                    }
                                                }
                                                else{
                                                    if(biometricResult[widgetbiokey]['data']['Goalstatus']=='Low risk or lower'){
                                                        biometricResult[widgetbiokey]['data']['Goalstatus'] = 'Low risk';
                                                    }
                                                    if(HRAstatus == biometricSetting['option'] && widgetbioval['data']['value1'] && widgetbioval['data']['value1']!='' && widgetbioval['data']['value1']!=0){ sameStatus = '< ' +  widgetbioval['data']['value1']; }
                                                }
                                            }
                                            if(sameStatus==''){
                                                biometricResult[widgetbiokey]['data']['Goalstatus'] += "<br>" + await this.commonHealthService.getClassificationAchivement(HRAOptions,biometricResult[widgetbiokey]['data']['Goalactualstatus']);
                                            }
                                            else{
                                                biometricResult[widgetbiokey]['data']['Goalstatus'] += "<br>" + sameStatus;
                                            } 
                                    }else{
                                        biometricResult[widgetbiokey]['data']['Goalstatus'] = '---';
                                    }
                                    let is_done = 0;
                                    if(HRAstatus >= 0 && biometricSetting['qualifie_type']==2){
                                        if(biometricSetting['is_based']==1 && widgetbioval['data']['value2']){
                                            if((widgetbioval['biometricsList']['biometric']=='HDL Cholesterol' && HRAstatus >= biometricSetting['option']) || (widgetbioval['biometricsList']['biometric']!='HDL Cholesterol' && HRAstatus <= biometricSetting['option'])){
                                                is_done=1;
                                            } 
                                        }
                                        if(biometricSetting['is_based']==0 && widgetbioval['data']['value1'] && widgetbioval['data']['value2']){
                                            if(widgetbioval['biometricsList']['biometric']=='HDL Cholesterol' && (HRAstatus == biometricSetting['option']) ? (widgetbioval['data']['value2'] <= widgetbioval['data']['value1']) : (HRAstatus > biometricSetting['option'])){
                                                is_done=1; 
                                            }
                                            if(widgetbioval['biometricsList']['biometric']!='HDL Cholesterol' && (HRAstatus == biometricSetting['option']) ? (widgetbioval['data']['value2'] <= widgetbioval['data']['value1']) : (HRAstatus < biometricSetting['option'])){
                                                is_done=1;
                                            }
                                        }
                                    }
                                    if(HRAstatus >= 0 && biometricSetting['qualifie_type']==3 && widgetbioval['data']['value1'] && widgetbioval['data']['value2']){
                                        if(widgetbioval['biometricsList']['biometric']=='HDL Cholesterol' && ((HRAstatus == tempH) ? (widgetbioval['data']['value2'] < widgetbioval['data']['value1']) : (HRAstatus > tempH))){
                                            is_done=1; 
                                        }
                                        if(widgetbioval['biometricsList']['biometric']!='HDL Cholesterol' && ((HRAstatus == tempH) ? (widgetbioval['data']['value2'] < widgetbioval['data']['value1']) : (HRAstatus < tempH))){
                                            is_done=1; 
                                        }
                                    } 
                                    if(is_done==1){
                                        biometricResult[widgetbiokey]['data']['status'] = 'Goal met';
                                        biometricResult[widgetbiokey]['data']['color'] = regionColor['Low risk'];
                                        Is_Completed++; 
                                    }else{
                                        biometricResult[widgetbiokey]['data']['status'] = ' Goal not met';
                                        biometricResult[widgetbiokey]['data']['color'] = regionColor['Very High risk'];
                                    }
                                    biometricResult[widgetbiokey]['data']['Tablestatus'] =  '';
                                    if(biometricSetting['qualifie_type'] == 3){
                                        if(widgetbioval['biometricsList']['biometric']=='HDL Cholesterol'){
                                            biometricResult[widgetbiokey]['data']['Tablestatus'] =  '';
                                        }else{
                                            biometricResult[widgetbiokey]['data']['Tablestatus'] =  '';
                                        }
                                    }
                                }
                                if(biometricSetting['qualifie_type']==4){
                                    let AcceptRangecheck = 0;
                                    let AcceptRangecheckgoal = 0;
                                    biometricResult[widgetbiokey]['data']['GoalActualstatus'] = '';
                                    biometricResult[widgetbiokey]['data']['Goalstatus'] = '---';
                                    if(widgetbioval['data']['value1'] && widgetbioval['data']['value1']!='' && widgetbioval['data']['value1']!=0 && biometricSetting['option']){
                                        if(widgetbioval['data']['value1'] > widgetbioval['start_range_male'] && widgetbioval['data']['value1'] < widgetbioval['end_range_male']){
                                            AcceptRangecheckgoal = 1;
                                        }
                                        if(widgetbioval['biometricsList']['biometric']=='HDL Cholesterol'){
                                            biometricResult[widgetbiokey]['data']['Goalstatus'] =  (AcceptRangecheckgoal==1 ? widgetbioval['start_range_male'] : widgetbioval['data']['value1'] + biometricSetting['option'])  + '  or higher';
                                            biometricResult[widgetbiokey]['data']['GoalActualstatus'] = (AcceptRangecheckgoal==1 ? widgetbioval['start_range_male'] : widgetbioval['data']['value1'] + biometricSetting['option']); 
                                        }else{  
                                        
                                            biometricResult[widgetbiokey]['data']['Goalstatus'] =  (AcceptRangecheckgoal==1 ? Number(Number(widgetbioval.end_range_male).toFixed(2))  + '  or lower' : Number(Number(widgetbioval['data']['value1'] - biometricSetting['option']).toFixed(2))  + '  or lower' );
                                            if(widgetbioval['biometricsList']['biometric']!='Waist Circumference' && widgetbioval['biometricsList']['biometric']!='Body Mass Index' && widgetbioval['biometricsList']['biometric']!='A1C'){
                                                biometricResult[widgetbiokey]['data']['Goalstatus'] =  (AcceptRangecheckgoal==1 ? Number(widgetbioval['end_range_male']) : Number(widgetbioval['data']['value1'] - biometricSetting['option']) )  + '  or lower';
                                            }
                                            biometricResult[widgetbiokey]['data']['GoalActualstatus'] = (AcceptRangecheckgoal==1 ? widgetbioval['end_range_male'] : widgetbioval['data']['value1'] - biometricSetting['option']);
                                        }
                                        if(widgetbioval['biometricsList']['biometric']=='Triglycerides' || widgetbioval['biometricsList']['biometric']=='Blood Glucose' || widgetbioval['biometricsList']['biometric']=='LDL Cholesterol' || widgetbioval['biometricsList']['biometric']=='HDL Cholesterol'){
                                            biometricResult[widgetbiokey]['data']['Goalstatus'] = String(biometricResult[widgetbiokey]['data']['Goalstatus']).replace(/or/g, "mg/dL or");
                                        }
                                        else if(widgetbioval['biometricsList']['biometric']=='Waist Circumference'){
                                            biometricResult[widgetbiokey]['data']['Goalstatus'] = String(biometricResult[widgetbiokey]['data']['Goalstatus']).replace(/or/g, "inches or");
                                        } 
                                    } 
                                    if(widgetbioval['data']['value1'] && widgetbioval['data']['value2'] && biometricSetting['option'] && biometricResult[widgetbiokey]['data']['GoalActualstatus']!='' && ((widgetbioval['biometricsList']['biometric']=='HDL Cholesterol' &&  widgetbioval['data']['value2'] >= widgetbioval['data']['value1'] && widgetbioval['data']['value2'] >= biometricResult[widgetbiokey]['data']['GoalActualstatus'] && ((widgetbioval['data']['value2']==widgetbioval['data']['value1']) ? widgetbioval['data']['value2']>=widgetbioval['start_range_male'] : '1')) || (widgetbioval['biometricsList']['biometric']!='HDL Cholesterol' && widgetbioval['data']['value1'] >= widgetbioval['data']['value2'] &&  widgetbioval['data']['value2'] <= biometricResult[widgetbiokey]['data']['GoalActualstatus'] && ((widgetbioval['data']['value2']==widgetbioval['data']['value1']) ? widgetbioval['data']['value2']<=widgetbioval['end_range_male'] : '1')))){
                                        biometricResult[widgetbiokey]['data']['status'] = 'Goal met';
                                        biometricResult[widgetbiokey]['data']['color'] = regionColor['Low risk'];
                                        Is_Completed++;
                                        AcceptRangecheck = 1;
                                        if(widgetbioval['data']['value1']=='' && widgetbioval['biometricsList']['biometric']=='Blood Pressure - Systolic'){ Systolic = 1; }
                                        if(widgetbioval['data']['value1']=='' && widgetbioval['biometricsList']['biometric']=='Blood Pressure - Diastolic'){ Diastolic = 1; }
                                    }
                                    else{                        
                                        biometricResult[widgetbiokey]['data']['status'] = ' Goal not met';
                                        biometricResult[widgetbiokey]['data']['color'] = regionColor['Very High risk']; 
                                    }
                                    if(AcceptRangecheck==0){
                                        if(widgetbioval['biometricsList']['biometric']=='Blood Pressure - Systolic' || widgetbioval['biometricsList']['biometric']=='Blood Pressure - Diastolic'){
                                            SysDia++;
                                        }
                                        if(widgetbioval['data']['value2'] && widgetbioval['data']['value2']!='' && widgetbioval['data']['value2']!=0 && widgetbioval['data']['value2'] >= widgetbioval['start_range_male'] && widgetbioval['data']['value2'] <= widgetbioval['end_range_male']){
                                            biometricResult[widgetbiokey]['data']['status'] = 'Goal met';
                                            biometricResult[widgetbiokey]['data']['color'] = regionColor['Low risk'];
                                            Is_Completed++;
                                            if(widgetbioval['biometricsList']['biometric']=='Blood Pressure - Systolic' || widgetbioval['biometricsList']['biometric']=='Blood Pressure - Diastolic'){
                                            if(widgetbioval['data']['value1'] && widgetbioval['data']['value1']!='' && widgetbioval['data']['value1']!=0 && widgetbioval['data']['value1'] > widgetbioval['start_range_male'] && widgetbioval['data']['value1'] < widgetbioval['end_range_male']){
                                                SysDiaCom++;
                                            }
                                            }
                                            if((!widgetbioval['data']['value1'] || widgetbioval['data']['value1']=='') && widgetbioval['biometricsList']['biometric']=='Blood Pressure - Systolic'){ Systolic = 1; }
                                            if((!widgetbioval['data']['value1'] || widgetbioval['data']['value1']=='') && widgetbioval['biometricsList']['biometric']=='Blood Pressure - Diastolic'){ Diastolic = 1; }
                                        }
                                    }
                                    biometricResult[widgetbiokey]['data']['Tablestatus'] =  '';
                                }
                            }
                            if(widgetbioval['biometricsList']['biometric']=='Blood Glucose' && widgetbioval['data']['value2'] && widgetbioval['data']['value2'] < 100 && widgetbioval['data']['Test_type2'] != 2){
                                if(biometricResult[widgetbiokey]['data']['status']!='Goal met'){
                                    biometricResult[widgetbiokey]['data']['status'] = 'Goal met';
                                    biometricResult[widgetbiokey]['data']['color'] = regionColor['Low risk'];
                                    Is_Completed++;
                                }
                            }
                            if(widgetbioval['biometricsList']['biometric']=='Triglycerides' || widgetbioval['biometricsList']['biometric']=='Blood Glucose' || widgetbioval['biometricsList']['biometric']=='LDL Cholesterol' || widgetbioval['biometricsList']['biometric']=='HDL Cholesterol'){ 
                                if(widgetbioval['data']['value1']){ 
                                    biometricResult[widgetbiokey]['data']['value1'] = widgetbioval['data']['value1'] + '  mg/dL'; 
                                } 
                                if(widgetbioval['data']['value2']){ 
                                    biometricResult[widgetbiokey]['data']['value2'] = widgetbioval['data']['value2'] + '  mg/dL'; 
                                } 
                                if((biometricResult[widgetbiokey]['data']['Goalstatus']!= '---' && biometricSetting && (biometricSetting['qualifie_type']!=1 && biometricSetting['qualifie_type']!=4) ) || (biometricResult[widgetbiokey]['data']['Goalstatus']!= '---' && !biometricSetting) )
                                { 
                                    biometricResult[widgetbiokey]['data']['Goalstatus'] += ' mg/dL'; 
                                } 
                            }
                            if(widgetbioval['biometricsList']['biometric']=='Waist Circumference'){ 
                                if(widgetbioval['data']['value1']){ 
                                    biometricResult[widgetbiokey]['data']['value1'] = widgetbioval['data']['value1'] + '  inches'; 
                                } 
                                if(widgetbioval['data']['value2']){ 
                                    biometricResult[widgetbiokey]['data']['value2'] = widgetbioval['data']['value2'] + '  inches'; 
                                } 
                                if((biometricResult[widgetbiokey]['data']['Goalstatus']!= '---' && biometricSetting && (biometricSetting['qualifie_type'] !=1 && biometricSetting['qualifie_type'] !=4) ) || (biometricResult[widgetbiokey]['data']['Goalstatus']!= '---' && !biometricSetting) ){ 
                                    biometricResult[widgetbiokey]['data']['Goalstatus'] += ' inches'; 
                                } 
                            }
                            if(widgetbioval['data']['value2'] && widgetbioval['data']['value2']!=''){
                                Biomheartcolor = regionColor['High risk'];
                                Biomheartcolorval = 3;
                                let value2 = typeof widgetbioval['data']['value2'] === "string" ?  Number(widgetbioval['data']['value2'].split(' ')[0]): widgetbioval['data']['value2'];
                                if((widgetbioval['graph_low_start']!= 0 || widgetbioval['graph_low_end']!=0) && value2 >= widgetbioval['graph_low_start'] && value2 < (widgetbioval['graph_low_end']+1)){
                                    Biomheartcolor = regionColor['Low risk'];
                                    Biomheartcolorval = 0;
                                }
                                if((widgetbioval['graph_mod_start']!= 0 || widgetbioval['graph_mod_end']!=0) && value2 >= widgetbioval['graph_mod_start'] && value2 < (widgetbioval['graph_mod_end']+1)){
                                    Biomheartcolor = regionColor['Moderate risk'];
                                    Biomheartcolorval = 1;
                                }
                                if((widgetbioval['graph_high_start']!= 0 || widgetbioval['graph_high_end']!=0) && value2 >= widgetbioval['graph_high_start'] && value2 < (widgetbioval['graph_high_end']+1)){
                                    Biomheartcolor = regionColor['High risk'];
                                    Biomheartcolorval = 2;
                                }
                                if((widgetbioval['graph_vhigh_start']!= 0 || widgetbioval['graph_vhigh_end']!=0) && value2 >= widgetbioval['graph_vhigh_start'] && value2 < (widgetbioval['graph_vhigh_end']+1)){
                                    Biomheartcolor = regionColor['Very High risk'];
                                    Biomheartcolorval = 3;
                                } 
                                biometricResult[widgetbiokey]['data']['Tablestatus']= HRAData[Biomheartcolorval]; 
                                biometricResult[widgetbiokey]['data']['TableColor']= Biomheartcolor; 
                            }
                        }
                        for (const [widgetbiokey, widgetbioval] of biometricResult.entries()) {
                            if(OptionalData[widgetbioval['biometricsList']['id']]){
                                const index = biometricResult.findIndex(item => item.id === OptionalData[widgetbioval['biometricsList']['id']]);
                                if(biometricResult[index]){
                                    biometricResult[index]['Sub']=widgetbioval;
                                    if(biometricResult[index]['data']['status'] && biometricResult[index]['data']['status']=='Goal met' && biometricResult[widgetbiokey]['data']['status']=='Goal met'){
                                        Is_Completed--;   
                                    }
                                    if(biometricResult[index]['is_optional_type'] == 1 && ((biometricResult[index]['data']['status'] && biometricResult[index]['data']['status']==' Goal not met' && biometricResult[widgetbiokey]['data']['status']=='Goal met') || ( biometricResult[index]['data']['status'] && biometricResult[index]['data']['status']=='Goal met' && biometricResult[widgetbiokey]['data']['status']==' Goal not met'))){
                                        Is_Completed--;
                                    }
                                    biometricResult.splice(widgetbiokey, 1)
                                }
                            }
                        }
                        if((Systolic==0 && Diastolic==1) || Systolic==1 && Diastolic==0){
                            Is_Completed--;     
                        }
                        if(SysDia==2 && SysDiaCom==1){
                            Is_Completed--; 
                        }
                        if(Date1Comp != '' && (Is_Required == 0 || Date1CompTo >= Is_Required)){
                            widgetbioheader[1]['Status'] = 'Completed On Test 1 ' + this.commonDateService.getTodayDate(Date1Comp).format('MM/DD/YYYY'); 
                            widgetbioheader[1]['Color'] = regionColor['Low risk'];
                        }          
                        if(Is_Completed !=0 && (Is_Required == 0 || Is_Completed >= Is_Required)){
                            widgetbioheader[2]['Status'] = 'Completed On Test 2 ' + this.commonDateService.getTodayDate(Date2Comp).format('MM/DD/YYYY');
                            widgetbioheader[2]['Color'] = regionColor['Low risk'];
                        }
                        if((widgetbioheader[1]['Color'] && widgetbioheader[1]['Color']==regionColor['Low risk'] && widgetbioheader[2]['Color'] && widgetbioheader[2]['Color']==regionColor['Low risk']) || ((biometricSetting['is_based']==1 || biometricSetting['qualifie_type']==4) && (biometricSetting['qualifie_type']==0 || biometricSetting['qualifie_type']==2 || biometricSetting['qualifie_type']==4) && widgetbioheader[2]['Color'] && widgetbioheader[2]['Color']==regionColor['Low risk'])){ 
                            widgetbioTop = dynamicCompleteText ?? `${completeText} <b>${biometricText}!</b>`;
                            widgetbioTopColor = regionColor['Low risk'];
                            widgetbioheader[3]['Status'] = 'All required biometrics are in range.';
                            widgetbioheader[3]['Color'] = regionColor['Low risk']; 
                        }
                        if(Date1Comp == '' && Date2Comp ==''){
                            widgetbioheader[3]['Status'] = '---';
                            widgetbioheader[3]['Color'] = regionColor['Very High risk']; 
                        }
                        if(IsDeadLine==1 && Date1CompTo >=Is_Required && Date2Comp=='' && Date1Comp!=''){
                            widgetbioTopColor = regionColor['Very High risk'];
                            widgetbioTop = dynamicInCompleteText ?? `${notCompleteText} <b>${biometricText}.</b> ${seeBellowText}`;
                        }
                        if(IsDeadLine==1 && Is_Completed < Is_Required && Date2Comp!='' && Date1Comp!=''){
                            widgetbioTopColor = regionColor['Very High risk'];
                            widgetbioTop = dynamicInCompleteText ?? `${notCompleteText} <b>${biometricText}.</b> ${seeBellowText}`;
                        }
                        let widgetbiotmpdate = await this.orgBiometricService.findOne(`orgBiometric.company_id = ${orgId}`,{ is_optional: 'ASC' });
                        widgetbioheader[1]['Title']= 'Complete Test 1 <br>(Results need to be from ' + this.commonDateService.getTodayDate(widgetbiotmpdate['test1_start_date']).format('MM/DD/YYYY') + ' - ' + this.commonDateService.getTodayDate(widgetbiotmpdate['test1_end_date']).format('MM/DD/YYYY')+ ')';
                        widgetbioheader[2]['Title']= 'Complete Test 2 <br>(Results need to be from ' + this.commonDateService.getTodayDate(widgetbiotmpdate['test2_start_date']).format('MM/DD/YYYY') + ' - ' + this.commonDateService.getTodayDate(widgetbiotmpdate['test2_end_date']).format('MM/DD/YYYY')+ ')';
                        widgetbioheader[3]['Title'] = 'You have ' + Is_Completed  +' out of ' + biometricResult?.length  +' biometrics in range.';
                        let Number_array = {0:'Zero',1:'Only one',2:'Only two',3:'Only three',4:'Only four',5:'Only five',6:'Only six',7:'Only seven',8:'Only eight',9:'Only nine',10:'Only ten'}
                        if(!widgetbioheader[1]['Status']){
                            widgetbioheader[1]['Status'] = '---';
                            widgetbioheader[1]['Color'] = regionColor['Very High risk'];
                        }
                        if(!widgetbioheader[2]['Status']){
                            widgetbioheader[2]['Status'] = '---';
                            widgetbioheader[2]['Color'] = regionColor['Very High risk'];
                        }
                        if(Date2Comp!='' && Date1Comp!='' && (widgetbioheader[2]['Color']==regionColor['Very High risk'] || widgetbioheader[1]['Color']==regionColor['Very High risk'])){
                            widgetbioTop = `${completeHalfText} <br>${biometricText}. ${seeBellowText}`;
                        }
                        if(Date2Comp!='' && widgetbioheader[2]['Color']==regionColor['Very High risk']){
                            widgetbioheader[2]['Status'] = 'Completed On Test 2 ' + this.commonDateService.getTodayDate(Date2Comp).format('MM/DD/YYYY');
                            widgetbioheader[2]['Color'] = regionColor['Low risk'];
                        }
                        if(Date1Comp!='' && widgetbioheader[1]['Color']==regionColor['Very High risk']){
                            widgetbioheader[1]['Status'] = 'Completed On Test 1 ' + this.commonDateService.getTodayDate(Date1Comp).format('MM/DD/YYYY');
                            widgetbioheader[1]['Color'] = regionColor['Low risk'];
                        }
                        if(!widgetbioheader[3]['Status']){
                            let Biometricstext = 'biometrics are';
                            if(Is_Completed==1){
                                Biometricstext = 'biometric is';
                            }
                            if((Is_Required-Is_Completed)<=0){
                                widgetbioheader[3]['Status'] = '' + Number_array[Number(Is_Completed)] + ' ' + Biometricstext+ ' in range.';
                            }else{
                                if(!biometricSetting || biometricSetting['qualifie_type']==0){
                                    widgetbioheader[3]['Status'] = '' + Number_array[Number(Is_Completed)] + ' ' + Biometricstext+ ' in range, you need ' + (Is_Required-Is_Completed) + ' more.';
                                }
                                else {
                                    if(biometricSetting['qualifie_type'] == 1){
                                        widgetbioheader[3]['Status'] = '' + Number_array[Number(Is_Completed)] + ' ' + Biometricstext+ ' in range, you need ' + (Is_Required-Is_Completed) + ' more with a biometrics minimum of <b>' +biometricSetting['option']+ '%</b> improvement.';
                                    }
                                    if(biometricSetting['qualifie_type'] == 4){
                                        widgetbioheader[3]['Status'] = '' + Number_array[Number(Is_Completed)] + ' ' + Biometricstext+ ' in range, you need ' + (Is_Required-Is_Completed) + ' more with a biometrics minimum of <b>' +biometricSetting['option']+ '</b> improvement.';
                                    }
                                    if(biometricSetting['qualifie_type'] == 2){
                                        widgetbioheader[3]['Status'] = '' + Number_array[Number(Is_Completed)] + ' ' + Biometricstext+ ' in range, you need ' + (Is_Required-Is_Completed) + ' more biometrics with a <b>' + HRAData[biometricSetting['option']]+ '</b> classification or is better.';
                                    }
                                    if(biometricSetting['qualifie_type'] == 3){
                                        widgetbioheader[3]['Status'] = '' + Number_array[Number(Is_Completed)] + ' ' + Biometricstext+ ' in range, you need ' + (Is_Required-Is_Completed) + ' more biometrics in range.';
                                    }
                                }
                            }
                            widgetbioheader[3]['Color'] = regionColor['Very High risk'];
                        }
                        // changes added for new design
                        widgetbioheader[3]['Status'] = widgetbioheader[3]['Title'];
                        widgetbioheader = Object.fromEntries(
                            Object.entries(widgetbioheader).sort(
                                ([a], [b]) =>  a.localeCompare(b)
                            )
                        );
                        resultedData['widgetbioTopColor'] = widgetbioTopColor;
                        resultedData['widgetbioTop'] = widgetbioTop;
                        resultedData['widgetbio'] = biometricResult;
                        resultedData['widgetbioheader'] = widgetbioheader;
                        resultedData['widgetbiosetting'] = biometricSetting;
                        resultedData['regionColor'] = {
                            'region-1': regionColor['Low risk'],
                            'region-2': regionColor['Moderate risk'],
                            'region-3': regionColor['High risk'],
                            'region-4': regionColor['Very High risk'],
                        };
                    } 
                }
                else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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