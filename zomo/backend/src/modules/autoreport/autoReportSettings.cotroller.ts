import { appConstant, AutoreportsettingsDto, CommonArrayService, CommonService, reportFieldsConstant, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from "express";
import { lastValueFrom } from 'rxjs';
import { AccessGuard, RoleGuard, TokenGuard } from 'src/guard';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { In } from 'typeorm';
import { ActivityService } from '../activity/activity/activity.service';
import { CampaignService } from '../campaign/campaign/campaign.service';
import { ScheduleChallengeService } from '../challenge/schedulechallenge/schedulechallenge.service';
import { UrlManageService } from '../common';
import { CompanyService } from '../company/companies/company.service';
import { DepartmentService } from '../company/departments/department.service';
import { LocationService } from '../company/locations/location.service';
import { SettingsService } from '../company/settings/settings.service';
import { EventService } from '../events/events/events.service';
import { FitnessVideosService } from '../mediafitness/videos/fitnessvideos.service';
import { MyPlanPlansService } from '../myplan/plans/plans.service';
import { QuickLinkService } from '../quicklink/quicklink/quicklink.service';
import { QuizQuizzesService } from '../quiz/quizzes/quizzes.service';
import { CreateFormsService } from '../reimbursement/createforms/createforms.service';
import { TranslationService } from '../translation/translation.service';
import { AutoReportSettingService } from './autoReportSettings.service';
import { GetOneAutoReportInput, PaginateAutoReportInput } from './input';
import { autoReportSettingsInput } from './input/autoReportSettings.input';
@Controller('AutoReportSettings')
@UseGuards(TokenGuard,RoleGuard, AccessGuard)
export class AutoReportSettingController {
    constructor(
        private readonly autoReportSettingService: AutoReportSettingService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly campaignService: CampaignService,
        private readonly myPlanPlansService: MyPlanPlansService,
        private readonly ScheduleChallengeService: ScheduleChallengeService,
        private readonly quickLinkService: QuickLinkService,
        private readonly companySettingsService: SettingsService,
        private readonly fitnessVideosService: FitnessVideosService,
        private readonly eventService: EventService,
        private readonly quizQuizzesService: QuizQuizzesService,
        private readonly createFormsService: CreateFormsService,
        private readonly departmentService: DepartmentService,
        private readonly locationService: LocationService,
        private readonly urlManageService: UrlManageService,
        private readonly companyService: CompanyService,
        private readonly activityService: ActivityService,
        @Inject('CRON_SERVICE') private cronMicroservice: ClientProxy,
        @Inject('TIMEZONE_SERVICE') private client: ClientProxy,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateAutoReportInput) {
        try {
            if (![appConstant.ROLE.ADMIN].includes(req.tokenUser?.role_id)) {
                if (!postData?.org_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING",));
                }
            }
            let where = `autoReport.id IS NOT NULL AND autoReport.org_id = ${postData?.org_id}`;
            if(req.tokenUser?.role_id == appConstant.ROLE.ADMIN){
                where = `autoReport.id IS NOT NULL`;
                if(postData?.org_id){
                    where += ` AND autoReport.org_id = ${postData?.org_id}`;
                }
            }
            if (this.commonService.isValidNumber(postData?.status)) {
                where += ` AND autoReport.status = ${postData?.status} `;
            }else{
                where += ` AND autoReport.status != 2 `;
            }
            if (postData?.frequency) {
                where += ` AND autoReport.frequency_type = '${postData?.frequency}' `;
            }
            if (postData?.report) {
                where += ` AND autoReport.module_id = '${postData?.report}' `;
            }
            const resultedData = await this.autoReportSettingService.paginateList(where,postData);
            let incentiveIDS = [],myplanIDS = [],challengeIDS = [],quicklinkIDS = [],fitnessvideoIDS = [],eventsIDS = [],quizIDS = [],RemIDS = [], 
                campaignName = [],plansName= [],schedules= [],quicklinkName= [],fitnessVideoName= [],eventName= [],quizName= [],RemName= [] 
            if(resultedData['list']){
                for (const [index, Datas] of resultedData['list'].entries()) {
                    if(Datas.f_module_items && Datas.f_module_items != '' && Datas.f_module_items != 0){
                        if(Datas.module_id == 1 || Datas.module_id == 14){
                            let IidS = Datas.f_module_items.split(",");
                            incentiveIDS = incentiveIDS.concat(IidS);
                        }
                        if(Datas.module_id == 2){
                            let IidS = Datas.f_module_items.split(",");
                            myplanIDS = myplanIDS.concat(IidS);
                        }
                        if(Datas.module_id == 3){
                            let IidS = Datas.f_module_items.split(",");
                            challengeIDS = challengeIDS.concat(IidS);
                        }
                        if(Datas.module_id == 5){
                            let IidS = Datas.f_module_items.split(",");
                            quicklinkIDS = quicklinkIDS.concat(IidS);
                        }
                        if(Datas.module_id == 6){
                            let IidS = Datas.f_module_items.split(",");
                            fitnessvideoIDS = fitnessvideoIDS.concat(IidS);
                        }
                        if(Datas.module_id == 8){
                            let IidS = Datas.f_module_items.split(",");
                            eventsIDS = eventsIDS.concat(IidS);
                        }
                        if(Datas.module_id == 11){
                            let IidS = Datas.f_module_items.split(",");
                            quizIDS = quizIDS.concat(IidS);
                        }
                        if(Datas.module_id == 15){
                            let IidS = Datas.f_module_items.split(",");
                            RemIDS = RemIDS.concat(IidS);
                        }
                    }
                }
                if(incentiveIDS.length>0){
                    incentiveIDS = [...new Set(incentiveIDS)]
                    campaignName = await this.campaignService.listRecord(`campaign.status = 1 AND campaign.id IN (${incentiveIDS.join(',')})`)
                }
                if(myplanIDS.length>0){
                    myplanIDS = [...new Set(myplanIDS)]
                    plansName = await this.myPlanPlansService.listRecord(["mp.id","mp.name"],`mp.status = 1 AND mp.id IN (${myplanIDS.join(',')})`)
                }
                if(challengeIDS.length>0){
                    challengeIDS = [...new Set(challengeIDS)]
                    let where = `sc.id IN (${challengeIDS.join(',')})`
                    if(postData?.org_id !== undefined && postData?.org_id !== null ){
                        where += ` AND sc.org_id = ${postData?.org_id}`
                    }   
                    let challengeName = await this.ScheduleChallengeService.listRecord(where, null, ['sc.id', 'sc.custom_cname', 'ch.id', 'ch.challenge_name'])
                    challengeName.forEach(s => {
                        schedules.push({
                            id: s.id,
                            name: s.custom_cname.trim() !== "" ? s.custom_cname : s?.['ch']?.challenge_name
                        });
                    });
                }
                if(quicklinkIDS.length>0){
                    quicklinkIDS = [...new Set(quicklinkIDS)]
                    let where = {id: In(quicklinkIDS)};
                    if(postData?.org_id !== undefined && postData?.org_id !== null ){
                        where['c_companies_id'] = postData?.org_id;
                    }
                    quicklinkName = await this.quickLinkService.quickLinkListRecord(['id','title'], where);
                }
                if(fitnessvideoIDS.length>0){
                    fitnessvideoIDS = [...new Set(fitnessvideoIDS)];
                    let where = `fitness.id IN (${fitnessvideoIDS.join(',')})`
                    if (postData?.org_id !== undefined && postData?.org_id !== null) {
                        const companySetting = await this.companySettingsService.findOne({ org_id: postData?.org_id });
                        if (companySetting.video_setting == 1) {
                            where += ` AND fitness.org_id = ${postData?.org_id}`
                        } else {
                            where += ` AND fitness.org_id IN (${postData?.org_id},0)`
                        }
                    }
                    fitnessVideoName = await this.fitnessVideosService.listRecord(where,["fitness.id","fitness.name"])
                }
                if(eventsIDS.length>0){
                    eventsIDS = [...new Set(eventsIDS)]
                    eventName = await this.eventService.eventsListRecord(["event.id AS id","event.event_name AS event_name"],`event.status = 1 AND event.id IN (${eventsIDS.join(',')})`);
                }
                if(quizIDS.length>0){
                    quizIDS = [...new Set(quizIDS)]
                    quizName = await this.quizQuizzesService.listRecord(['qz.id','qz.quiz_name'],`qz.id IN (${quizIDS.join(',')})`);
                }
                if(RemIDS.length>0){
                    RemIDS = [...new Set(RemIDS)]
                    RemName =await this.createFormsService.listRecord(["id", "title"], {deleted: 0,id: In(RemIDS)}, { id: 'ASC' });
                }
            }
            resultedData['list'] = resultedData['list'].map((Datas) => {
                let updatedData = { ...Datas };
                if(updatedData?.company){
                    updatedData.company = {
                        id: updatedData?.company?.id || '',
                        company_name: updatedData?.company?.company_name || '',
                    }
                }
                if (Datas.f_module_items && Datas.f_module_items !== '' && Datas.f_module_items !== 0) {
                    let f_module_items_array = Datas.f_module_items.split(",").map(item => item.trim());
                    if (Datas.module_id == 1 || Datas.module_id == 14) {
                        updatedData.campaignName = campaignName.filter(item => f_module_items_array.includes(String(item.id)));
                    } 
                    else if (Datas.module_id == 2) {
                        updatedData.plansName = plansName.filter(item => f_module_items_array.includes(String(item.id)));
                    } 
                    else if (Datas.module_id == 3) {
                        updatedData.schedules = schedules.filter(item => f_module_items_array.includes(String(item.id)));
                    } 
                    else if (Datas.module_id == 5) {
                        updatedData.quicklinkName = quicklinkName.filter(item => f_module_items_array.includes(String(item.id)));
                    } 
                    else if (Datas.module_id == 6) {
                        updatedData.fitnessVideoName = fitnessVideoName.filter(item => f_module_items_array.includes(String(item.id)));
                    } 
                    else if (Datas.module_id == 8) {
                        updatedData.eventName = eventName.filter(item => f_module_items_array.includes(String(item.id)));
                    } 
                    else if (Datas.module_id == 11) {
                        updatedData.quizName = quizName.filter(item => f_module_items_array.includes(String(item.id)));
                    } 
                    else if (Datas.module_id == 15) {
                        updatedData.RemName = RemName.filter(item => f_module_items_array.includes(String(item.id)));
                    }
                }
                return updatedData;
            });
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(
                    AutoreportsettingsDto,
                    resultedData['list'],
                    req.lang
                )
            );
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneAutoReportInput) {
        try {
            if (!postData?.id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,"ERR_REQUIRED_PARAM_MISSING",),);
            }
            const where = { id: postData?.id };
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            let autoReportDetails = await this.autoReportSettingService.findOne(where);
            if (!autoReportDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,"ERR_RECORD_NOT_FOUND",),);
            }          
            let incentiveIDS = [], myplanIDS = [], challengeIDS = [], quicklinkIDS = [], fitnessvideoIDS = [], eventsIDS = [], quizIDS = [], RemIDS = [], RemTypeIDS = [],
                campaignName = [], plansName = [], schedules = [], quicklinkName = [], fitnessVideoName = [], eventName = [], quizName = [], RemName = [], RemTypeName = [],
                timeZoneData = [],departmentData = [], locationData = [];
            if (autoReportDetails) {
                if (autoReportDetails.f_module_items && autoReportDetails.f_module_items != '' && autoReportDetails.f_module_items != '0') {
                    if (autoReportDetails.module_id == '1' || autoReportDetails.module_id == '14') {
                        let IidS = autoReportDetails.f_module_items.split(",");
                        incentiveIDS = incentiveIDS.concat(IidS);
                    }
                    if (autoReportDetails.module_id == '2') {
                        let IidS = autoReportDetails.f_module_items.split(",");
                        myplanIDS = myplanIDS.concat(IidS);
                    }
                    if (autoReportDetails.module_id == '3') {
                        let IidS = autoReportDetails.f_module_items.split(",");
                        challengeIDS = challengeIDS.concat(IidS);
                    }
                    if (autoReportDetails.module_id == '5') {
                        let IidS = autoReportDetails.f_module_items.split(",");
                        quicklinkIDS = quicklinkIDS.concat(IidS);
                    }
                    if (autoReportDetails.module_id == '6') {
                        let IidS = autoReportDetails.f_module_items.split(",");
                        fitnessvideoIDS = fitnessvideoIDS.concat(IidS);
                    }
                    if (autoReportDetails.module_id == '8') {
                        let IidS = autoReportDetails.f_module_items.split(",");
                        eventsIDS = eventsIDS.concat(IidS);
                    }
                    if (autoReportDetails.module_id == '11') {
                        let IidS = autoReportDetails.f_module_items.split(",");
                        quizIDS = quizIDS.concat(IidS);
                    }
                    if (autoReportDetails.module_id == '15') {
                        let IidS = autoReportDetails.f_module_items.split(",");
                        RemIDS = RemIDS.concat(IidS);
                    }
                }
                if (incentiveIDS.length > 0) {
                    incentiveIDS = [...new Set(incentiveIDS)]
                    campaignName = await this.campaignService.listRecord(`campaign.status = 1 AND campaign.id IN (${incentiveIDS.join(',')})`)
                }
                if (myplanIDS.length > 0) {
                    myplanIDS = [...new Set(myplanIDS)]
                    plansName = await this.myPlanPlansService.listRecord(["mp.id", "mp.name"], `mp.status = 1 AND mp.id IN (${myplanIDS.join(',')})`)
                }
                if (challengeIDS.length > 0) {
                    challengeIDS = [...new Set(challengeIDS)]
                    let challengeName = await this.ScheduleChallengeService.listRecord(`sc.org_id = ${postData?.org_id} AND sc.id IN (${challengeIDS.join(',')})`, null, ['sc.id', 'sc.custom_cname', 'ch.id', 'ch.challenge_name'])
                    challengeName.forEach(s => {
                        schedules.push({
                            id: s.id,
                            custom_cname: s.custom_cname.trim() !== "" ? s.custom_cname : s?.['ch']?.challenge_name
                        });
                    });
                }
                if (quicklinkIDS.length > 0) {
                    quicklinkIDS = [...new Set(quicklinkIDS)]
                    quicklinkName = await this.quickLinkService.quickLinkListRecord(['id', 'title'], { c_companies_id: postData?.org_id, id: In(quicklinkIDS) });
                }
                if (fitnessvideoIDS.length > 0) {
                    fitnessvideoIDS = [...new Set(fitnessvideoIDS)]
                    const companySetting = await this.companySettingsService.findOne({ org_id: postData?.org_id });
                    let where = `fitness.id IN (${fitnessvideoIDS.join(',')})`
                    if (companySetting.video_setting == 1) {
                        where += ` AND fitness.org_id = ${postData?.org_id}`
                    } else {
                        where += ` AND fitness.org_id IN (${postData?.org_id},0)`
                    }
                    fitnessVideoName = await this.fitnessVideosService.listRecord(where, ["fitness.id", "fitness.name"])
                }
                if (eventsIDS.length > 0) {
                    eventsIDS = [...new Set(eventsIDS)]
                    eventName = await this.eventService.eventsListRecord(["event.id AS id", "event.event_name AS event_name"], `event.status = 1 AND event.id IN (${eventsIDS.join(',')})`);
                }
                if (quizIDS.length > 0) {
                    quizIDS = [...new Set(quizIDS)]
                    quizName = await this.quizQuizzesService.listRecord(['qz.id', 'qz.quiz_name'], `qz.id IN (${quizIDS.join(',')})`);
                }
                if (RemIDS.length > 0) {
                    RemIDS = [...new Set(RemIDS)]
                    RemName = await this.createFormsService.listRecord(["id", "title"], { deleted: 0, id: In(RemIDS) }, { id: 'ASC' });
                }
                if(autoReportDetails?.org_timezone && autoReportDetails.org_timezone !== ''){
                    const timezoneDetails = await lastValueFrom(this.client.send({ cmd: 'find_postcode' },`tz.timezone_name LIKE '%${autoReportDetails.org_timezone}%'`));
                    timeZoneData = timezoneDetails?? null;
                }
                if (autoReportDetails.f_department && autoReportDetails.f_department != '' && autoReportDetails.f_department.trim() != '') {
                    const all_departments = await this.departmentService.listRecord(
                        {
                            id: In(autoReportDetails.f_department.split(',')), 
                            company_id: postData?.org_id
                        }
                    );
                    departmentData = all_departments.map((ele) => {
                        if (ele) {
                            return {
                                id: ele['id'],
                                dept_name: ele['dept_name']
                            }
                        }
                    })
                }
                if (autoReportDetails.f_location && autoReportDetails.f_location != '' && autoReportDetails.f_location.trim() != '') {
                    const all_locations = await this.locationService.listRecord(['id','location_name','country','state','city'], { id: In(autoReportDetails.f_location.split(',')), company_id: postData?.org_id });
                    locationData = all_locations.map((ele) => {
                        if (ele) {
                            return {
                                id: ele['id'],
                                location_name: ele['location_name'],
                                country: ele['country'],
                                state: ele['state'],
                                city: ele['city'],
                            }
                        }
                    })
                }
                if(autoReportDetails?.email_content && autoReportDetails.email_content !== ''){
                    autoReportDetails['email_content'] = await this.urlManageService.onmapUrlContent(autoReportDetails['email_content'],'mailTemplate') || autoReportDetails['email_content'];
                }
                if(autoReportDetails?.f_module_report_type && autoReportDetails.f_module_report_type !== '' && autoReportDetails.f_module_report_type != null ){
                    if (autoReportDetails.module_id == '15') {
                        let IidS = autoReportDetails.f_module_report_type.split(",");
                        RemTypeIDS = RemTypeIDS.concat(IidS);
                    }
                }
                if (RemTypeIDS.length > 0) {
                    RemTypeIDS = [...new Set(RemTypeIDS)]
                    let where: any = { id : In(RemTypeIDS) };
                    RemTypeName = await this.activityService.activityListRecord(where, ["id", "activity_name"], { id: 'ASC' });
                }
                if (autoReportDetails?.otheroptions?.trim()) {
                    if (!autoReportDetails['otheroptionsValue']) {
                        autoReportDetails['otheroptionsValue'] = {};
                    }
                    try {
                        const parsed = JSON.parse(autoReportDetails.otheroptions);
                        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                            const relevantFields = [
                                'are_you_caccinated',
                                'eligible_to_come_to_word',
                                'deviced_type',
                                'event_dates',
                                'event_list',
                                'event_type',
                                'data_source',
                                'hra_status'
                            ] as const;
                            const filtered: Record<string, any> = {};
                            let hasData = false;
                            if(parsed['event_list']?.length){
                                parsed['event_list'] = await this.eventService.eventsListRecord(["event.id AS id", "event.event_name AS event_name"], `event.status = 1 AND event.id IN (${parsed['event_list'].map(ele=>Number(ele)).join(',')})`);
                            }
                            relevantFields.forEach(field => {
                                if (field in parsed) {
                                    filtered[field] = parsed[field] ?? null;
                                    hasData = true;
                                }
                            });
                            if (hasData) {
                                autoReportDetails['otheroptionsValue'] = filtered;
                            }
                        }
                    } catch (error) {
                        autoReportDetails['otheroptionsValue'] = {};
                    }
                }
            }
            let newAutoReportDetails = {
                ...autoReportDetails,
                campaignName: Array.isArray(campaignName) ? campaignName : [],
                plansName: Array.isArray(plansName) ? plansName : [],
                schedules: Array.isArray(schedules) ? schedules : [],
                quicklinkName: Array.isArray(quicklinkName) ? quicklinkName : [],
                fitnessVideoName: Array.isArray(fitnessVideoName) ? fitnessVideoName : [],
                eventName: Array.isArray(eventName) ? eventName : [],
                quizName: Array.isArray(quizName) ? quizName : [],
                RemName: Array.isArray(RemName) ? RemName : [],
                timeZoneData: Array.isArray(timeZoneData) ? timeZoneData : [],
                departmentData: Array.isArray(departmentData) ? departmentData : [],
                locationData: Array.isArray(locationData) ? locationData : [],
                RemTypeName: Array.isArray(RemTypeName) ? RemTypeName : [],
            };
            autoReportDetails = <any>(
                await this.commonArrayService.formatToDto(
                    AutoreportsettingsDto,
                    newAutoReportDetails,
                    req.lang
                )
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: autoReportDetails,
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
    @Post('create')
    async create(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: autoReportSettingsInput,
    ) {
        try {
            if (postData?.org_id == undefined || !this.commonService.isValidNumber(postData?.module_id) || !this.commonService.isValidNumber(postData?.frequency_type) ||!postData?.send_emails || !postData?.email_subject) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,"ERR_REQUIRED_PARAM_MISSING",),);
            }
            let user= Object.create(req.tokenUser);
            let reportData = Object.create(null);
            let userRole = user.role_id;
            let orgId = postData?.org_id ?? user.org_id;
            let companyDetails = await this.companyService.companyFindOne({id: orgId}, ['id','code', 'company_name']);
            let moduleId = Number(postData?.module_id);
            let membershipCode = companyDetails?.code ?? user.membership_code ?? '';
            let frequencyType = Number(postData?.frequency_type);
            reportData['user_role'] = userRole
            reportData['membership_code'] = membershipCode
            reportData['org_id'] = orgId
            reportData['module_id'] = moduleId
            reportData['created_by'] = user.id
            reportData['frequency_type'] = frequencyType
            if(frequencyType === 2 || frequencyType === 3){
                reportData['weekly_days'] = (postData?.weekly_days && postData?.weekly_days?.length)? postData?.weekly_days?.replace(/^\[|\]$/g, '').replace(/['"]/g, '') : null
            }
            else if(frequencyType === 4){
                reportData['monthly_basis']= postData?.monthly_basis || null
                if(postData?.monthly_basis?.toString() === '1'){
                    reportData['monthly_date_basis']= postData?.monthly_date_basis || null
                }else if(postData?.monthly_basis?.toString() === '2'){
                    reportData['monthly_basis_type'] = postData?.monthly_basis_type || null
                    reportData['monthly_basis_day'] = postData?.monthly_basis_day || null
                }
            }
            else if(frequencyType === 5){
                reportData['year_basis_day'] = postData?.year_basis_day || null
                reportData['year_basis_month'] = postData?.year_basis_month || null
            }
            reportData['timezone_time'] = postData?.timezone_time || ''
            reportData['org_timezone'] = (postData?.org_timezone && postData?.org_timezone !== '')? postData?.org_timezone : 'UTC'
            reportData['send_emails'] = postData?.send_emails?.replace(/\s+/g, '') || ''
            reportData['send_cc_emails'] = postData?.send_cc_emails?.replace(/\s+/g, '') ||  ''
            reportData['email_subject'] = postData?.email_subject || ''
            reportData['email_content'] = postData?.email_content || ''
            reportData['status'] = 1
            reportData['f_engagement_report'] = 0
            reportData['f_department'] = (postData?.f_department && postData?.f_department?.length)? postData?.f_department?.replace(/^\[|\]$/g, '').replace(/['"]/g, '') : null
            reportData['f_location'] = (postData?.f_location && postData?.f_location?.length)? postData?.f_location?.replace(/^\[|\]$/g, '').replace(/['"]/g, '') : null
            reportData['f_country'] = (postData?.f_country && postData?.f_country?.length)? postData?.f_country?.replace(/^\[|\]$/g, '').replace(/['"]/g, '') : null
            reportData['f_state'] = (postData?.f_state && postData?.f_state?.length)? postData?.f_state?.replace(/^\[|\]$/g, '').replace(/['"]/g, '') : null
            reportData['f_city'] = (postData?.f_city && postData?.f_city?.length)? postData?.f_city?.replace(/^\[|\]$/g, '').replace(/['"]/g, '') : null
            let conditionData = `User.role_id IN ('2','16') AND User.membership_code = '${membershipCode}'`;
            if(postData?.f_terminated_users && postData?.f_terminated_users?.toString() === '2' ){
                conditionData += ` AND User.status = 1`
            }else if(moduleId === 2){
                conditionData += ` AND User.status = 1`
            }else{
                conditionData += ` AND User.status IN (0,1)`
            }
            if (reportData.f_department !== '' && reportData.f_department !== null) {
                conditionData += ` AND User.department_id IN (${reportData.f_department})`;
            }
            if (reportData.f_country !== '' && reportData.f_country !== null) {
                conditionData += ` AND Location.country IN (${reportData.f_country})`;
            }
            if (reportData.f_state !== '' && reportData.f_state !== null) {
                conditionData += ` AND Location.state IN (${reportData.f_state})`;
            }
            if (reportData.f_city !== '' && reportData.f_city !== null) {
                conditionData += ` AND Location.city IN (${reportData.f_city})`;
            }
            if(postData?.f_health_plans && (postData?.f_health_plans !==  '' || postData?.f_health_plans !== null)){
                if(postData?.f_health_plans !== 'both'){
                    let onInsurancePlan = postData?.f_health_plans || ''
                    conditionData +=` AND User.on_insurance_plan = ${onInsurancePlan}`
                }
            }
            reportData['setting_conditions']=conditionData
            if(moduleId === 1){
                reportData['f_module_report_type']=postData?.f_module_report_type
                reportData['report_type']='Incentive'
                reportData['f_module_items']=0
                if(postData?.f_module_items && Array.isArray(postData?.f_module_items) && postData?.f_module_items.length > 0) {
                    postData.f_module_items = [...new Set(postData?.f_module_items.filter(Boolean))];
                    reportData.f_module_items = postData?.f_module_items.join(',');
                }
                reportData['f_health_plans']=postData?.f_health_plans || null
                reportData['f_from_date']=postData?.f_from_date || null
                reportData['f_to_date']=postData?.f_to_date || null
                reportData['f_terminated_users']=postData?.f_terminated_users || null
                let ReportIncDefaultFields = reportFieldsConstant.ReportIncDefaultFields;
                reportData['report_fields']= null
                if(postData?.report_fields){
                    const filteredReportIncDefaultFields = Object.keys(ReportIncDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportIncDefaultFields[key];
                            return obj;
                        }, {});
                    if (Object.keys(filteredReportIncDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportIncDefaultFields);
                    }
                }
            }
            else if(moduleId === 2){
                reportData['report_type']= 'Myplan';
                reportData['f_engagement_report'] = postData?.f_engagement_report || null
                reportData['f_module_items']=0
                reportData['f_from_date']= postData?.f_from_date || null
                reportData['f_to_date']= postData?.f_to_date || null
                if(postData?.f_module_items && Array.isArray(postData?.f_module_items) && postData?.f_module_items.length > 0) {
                    postData.f_module_items = [...new Set(postData?.f_module_items.filter(Boolean))];
                    reportData.f_module_items = postData?.f_module_items.join(',');
                }
                let ReportMypDefaultFields = reportFieldsConstant.ReportMypDefaultFields_TYPE2;
                reportData['report_fields']= null
                if(postData?.report_fields){
                    const filteredReportIncDefaultFields = Object.keys(ReportMypDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportMypDefaultFields[key];
                            return obj;
                        }, {});
                    if (Object.keys(filteredReportIncDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportIncDefaultFields);
                    }
                }
            }
            else if(moduleId === 3) {
                reportData['report_type'] = 'Challenge';
                reportData['f_module_items'] = 0;
                if(postData?.f_module_items && Array.isArray(postData?.f_module_items) && postData?.f_module_items.length > 0) {
                    postData.f_module_items = [...new Set(postData?.f_module_items.filter(Boolean))];
                    reportData.f_module_items = postData?.f_module_items.join(',');
                }
                reportData['challenge_status'] = postData?.challenge_status || null;
                reportData['challenge_type'] = postData?.challenge_type || null;
                let ReportChallengeDefaultFields = reportFieldsConstant.ReportChallengeDefaultFields_TYPE3;
                reportData['report_fields'] = null;
                if(postData?.report_fields) {
                    const filteredReportChallengeDefaultFields = Object.keys(ReportChallengeDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportChallengeDefaultFields[key];
                            return obj;
                        }, {});
                    if(Object.keys(filteredReportChallengeDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportChallengeDefaultFields);
                    }
                }
            }
            else if (moduleId === 4) {
                reportData['f_module_report_type'] = postData?.f_module_report_type;
                reportData['report_type'] = 'Covid19';
                reportData['f_module_items'] = 0;
                reportData['f_from_date'] = postData?.f_from_date;
                reportData['f_to_date'] = postData?.f_to_date;
                reportData['f_terminated_users'] = postData?.f_terminated_users;
                let ReportChallengeDefaultFields = reportFieldsConstant.ReportChallengeDefaultFields_TYPE4;
                reportData['report_fields'] = null;
                if(postData?.report_fields) {
                    const filteredReportChallengeDefaultFields = Object.keys(ReportChallengeDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportChallengeDefaultFields[key];
                            return obj;
                        }, {});
                    if(Object.keys(filteredReportChallengeDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportChallengeDefaultFields);
                    }
                }
                const Otheroptions = {
                    'are_you_caccinated': postData?.are_you_caccinated,
                    'eligible_to_come_to_word': postData?.eligible_to_come_to_word
                };
                reportData['otheroptions'] = JSON.stringify(Otheroptions);
            }
            else if (moduleId === 5) {
                reportData['report_type'] = 'Quicklink';
                reportData['f_module_items'] = 0;
                if(postData?.f_module_items && Array.isArray(postData?.f_module_items) && postData?.f_module_items.length > 0) {
                    postData.f_module_items = [...new Set(postData?.f_module_items.filter(Boolean))];
                    reportData.f_module_items = postData?.f_module_items.join(',');
                }
                reportData['f_from_date'] = postData?.f_from_date;
                reportData['f_to_date'] = postData?.f_to_date;
                reportData['f_terminated_users'] = postData?.f_terminated_users;
                let ReportQuicklinkDefaultFields = reportFieldsConstant.ReportUserDefaultFields;
                reportData['report_fields'] = null;
                if(postData?.report_fields) {
                    const filteredReportChallengeDefaultFields = Object.keys(ReportQuicklinkDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportQuicklinkDefaultFields[key];
                            return obj;
                        }, {});
                    if(Object.keys(filteredReportChallengeDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportChallengeDefaultFields);
                    }
                }
            }
            else if (moduleId === 6) {
                reportData['report_type'] = 'FitnessVideo';
                reportData['f_module_items'] = 0;
                if (postData?.f_module_items && Array.isArray(postData?.f_module_items) && postData?.f_module_items.length > 0) {
                    postData.f_module_items = [...new Set(postData?.f_module_items.filter(Boolean))];
                    reportData.f_module_items = postData?.f_module_items.join(',');
                }
                reportData['f_from_date'] = postData?.f_from_date;
                reportData['f_to_date'] = postData?.f_to_date;
                reportData['f_terminated_users'] = postData?.f_terminated_users;
                let ReportFitnessVideoDefaultFields = reportFieldsConstant.ReportUserDefaultFields;
                reportData['report_fields'] = null;
                if (postData?.report_fields) {
                    const filteredReportFitnessVideoDefaultFields = Object.keys(ReportFitnessVideoDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportFitnessVideoDefaultFields[key];
                            return obj;
                        }, {});
                    if (Object.keys(filteredReportFitnessVideoDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportFitnessVideoDefaultFields);
                    }
                }
            }
            else if (moduleId === 7) {
                reportData['report_type'] = 'Billboards';
                reportData['f_module_items'] = 0;
                reportData['f_from_date'] = postData?.f_from_date;
                reportData['f_to_date'] = postData?.f_to_date;
                reportData['f_terminated_users'] = postData?.f_terminated_users;
                let ReportBillboardsDefaultFields = reportFieldsConstant.ReportUserDefaultFields;
                reportData['report_fields'] = null;
                if (postData?.report_fields) {
                    const filteredReportBillboardsDefaultFields = Object.keys(ReportBillboardsDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportBillboardsDefaultFields[key];
                            return obj;
                        }, {});
                    if (Object.keys(filteredReportBillboardsDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportBillboardsDefaultFields);
                    }
                }
                const otherOptions = {
                    deviced_type: postData?.deviced_type
                };
                reportData['otheroptions'] = JSON.stringify(otherOptions);
            }
            else if (moduleId === 8) {
                reportData['report_type'] = 'Events';
                reportData['f_module_items'] = 0;
                if (postData?.f_module_items && Array.isArray(postData?.f_module_items) && postData?.f_module_items.length > 0) {
                    postData.f_module_items = [...new Set(postData?.f_module_items.filter(Boolean))];
                    reportData.f_module_items = postData?.f_module_items.join(',');
                }
                const ReportChaDefaultFields = reportFieldsConstant.PreDataFields[moduleId];
                reportData['report_fields'] = null;
                if (postData?.report_fields) {
                    const filteredReportBillboardsDefaultFields = Object.keys(ReportChaDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportChaDefaultFields[key];
                            return obj;
                        }, {});
                    if (Object.keys(filteredReportBillboardsDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportBillboardsDefaultFields);
                    }
                }
                const otherOptions = {
                    event_dates: postData?.event_dates,
                    deviced_type: postData?.deviced_type,
                    event_type: postData?.event_type,
                    event_list: postData?.event_list,
                };
                reportData['otheroptions'] = JSON.stringify(otherOptions);
            }
            else if (moduleId === 9) {
                reportData['report_type'] = 'Health';
                reportData['f_module_items'] = 0;
                reportData['f_health_plans'] = postData?.f_health_plans || null;
                reportData['f_from_date'] = postData?.f_from_date;
                reportData['f_to_date'] = postData?.f_to_date;
                reportData['f_terminated_users'] = postData?.f_terminated_users;
                reportData['report_fields'] = null;
                let otherOptions = Object.create(null)
                otherOptions.data_source= postData?.data_source
                if(user?.company?.setting?.is_emo_health_asssessments === 0){
                    otherOptions.hra_status = postData?.f_module_report_type || null
                }
                reportData['otheroptions'] = JSON.stringify(otherOptions);
            }
            else if (moduleId === 10) {
                reportData['report_type'] = 'Activity';
                reportData['f_module_items'] = 0;
                if (postData?.f_module_items && Array.isArray(postData?.f_module_items) && postData?.f_module_items.length > 0) {
                    postData.f_module_items = [...new Set(postData?.f_module_items.filter(Boolean))];
                    reportData.f_module_items = postData?.f_module_items.join(',');
                }
                reportData['f_from_date'] = postData?.f_from_date;
                reportData['f_to_date'] = postData?.f_to_date;
                reportData['f_terminated_users'] = postData?.f_terminated_users;
                const ReportChaDefaultFields = reportFieldsConstant.ReportChaDefaultFields;
                reportData['report_fields'] = null;
                if (postData?.report_fields) {
                    const filteredReportBillboardsDefaultFields = Object.keys(ReportChaDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportChaDefaultFields[key];
                            return obj;
                        }, {});
                    if (Object.keys(filteredReportBillboardsDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportBillboardsDefaultFields);
                    }
                }
            }
            else if (moduleId === 11) {
                reportData['report_type'] = 'Quizzes';
                reportData['f_module_items'] = 0;
                if (postData?.f_module_items && Array.isArray(postData?.f_module_items) && postData?.f_module_items.length > 0) {
                    postData.f_module_items = [...new Set(postData?.f_module_items.filter(Boolean))];
                    reportData.f_module_items = postData?.f_module_items.join(',');
                }
                reportData['f_from_date'] = postData?.f_from_date;
                reportData['f_to_date'] = postData?.f_to_date;
                const ReportChaDefaultFields = reportFieldsConstant.ReportChaDefaultFields;
                delete ReportChaDefaultFields['USERNAME'];
                delete ReportChaDefaultFields['EMPLOYEE_ID'];
                reportData['report_fields'] = null;
                if (postData?.report_fields) {
                    const filteredReportBillboardsDefaultFields = Object.keys(ReportChaDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportChaDefaultFields[key];
                            return obj;
                        }, {});
                    if (Object.keys(filteredReportBillboardsDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportBillboardsDefaultFields);
                    }
                }
            }
            else if (moduleId === 12) {
                reportData['report_type'] = 'EmotionalWellBeing';
                reportData['f_module_items'] = 0;
                reportData['f_from_date'] = postData?.f_from_date;
                reportData['f_to_date'] = postData?.f_to_date;
                reportData['f_terminated_users'] = postData?.f_terminated_users;
                const ReportChaDefaultFields = reportFieldsConstant.ReportChaDefaultFields_TYEPE12;
                reportData['report_fields'] = null;
                if (postData?.report_fields) {
                    const filteredReportBillboardsDefaultFields = Object.keys(ReportChaDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportChaDefaultFields[key];
                            return obj;
                        }, {});
                    if (Object.keys(filteredReportBillboardsDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportBillboardsDefaultFields);
                    }
                }
            }
            else if (moduleId === 13) {
                reportData['f_module_report_type'] = postData?.f_module_report_type || '';
                reportData['report_type'] = 'Survey';
                reportData['f_module_items'] = 0;
                reportData['f_from_date'] = postData?.f_from_date;
                reportData['f_to_date'] = postData?.f_to_date;
                reportData['f_terminated_users'] = postData?.f_terminated_users;
                const ReportChaDefaultFields = reportFieldsConstant.ReportChaDefaultFields;
                delete ReportChaDefaultFields['USERNAME'];
                delete ReportChaDefaultFields['EMPLOYEE_ID'];
                reportData['report_fields'] = null;
                if (postData?.report_fields) {
                    const filteredReportBillboardsDefaultFields = Object.keys(ReportChaDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportChaDefaultFields[key];
                            return obj;
                        }, {});
                    if (Object.keys(filteredReportBillboardsDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportBillboardsDefaultFields);
                    }
                }
            }
            else if (moduleId === 14) {
                reportData['f_module_report_type'] = postData?.f_module_report_type ||'';
                reportData['report_type'] = 'EngagementComparison';
                reportData['f_module_items'] = 0;
                if (postData?.f_module_items && Array.isArray(postData?.f_module_items) && postData?.f_module_items.length > 0) {
                    postData.f_module_items = [...new Set(postData?.f_module_items.filter(Boolean))];
                    reportData.f_module_items = postData?.f_module_items.join(',');
                }
                reportData['f_from_date'] = postData?.f_from_date;
                reportData['f_health_plans'] = postData?.f_health_plans;
                reportData['f_terminated_users'] = postData?.f_terminated_users;
                reportData['report_fields'] = null;
            }
            else if (moduleId === 15) {
                reportData['report_type'] = 'Reimbursement';
                reportData['f_module_report_type'] = postData?.f_module_report_type ||'';
                reportData['f_module_items'] = 0;
                if (postData?.f_module_items && Array.isArray(postData?.f_module_items) && postData?.f_module_items.length > 0) {
                    postData.f_module_items = [...new Set(postData?.f_module_items.filter(Boolean))];
                    reportData.f_module_items = postData?.f_module_items.join(',');
                }
                reportData['send_emails'] = postData?.send_emails || '';
                reportData['f_from_date'] = postData?.f_from_date || '';
                reportData['f_to_date'] = postData?.f_to_date || '';
                const ReportChaDefaultFields = reportFieldsConstant.ReportChaDefaultFields;
                reportData['report_fields'] = null;
                if (postData?.report_fields) {
                    const filteredReportBillboardsDefaultFields = Object.keys(ReportChaDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportChaDefaultFields[key];
                            return obj;
                        }, {});
                    if (Object.keys(filteredReportBillboardsDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportBillboardsDefaultFields);
                    }
                }
            }
            else if (moduleId === 16) {
                reportData['report_type'] = 'Biometrics';
                reportData['f_module_items'] = 0;
                reportData['send_emails'] = postData?.send_emails || '';
                const ReportChaDefaultFields = reportFieldsConstant.ReportChaDefaultFields_TYEPE16;
                reportData['report_fields'] = null;
                if (postData?.report_fields) {
                    const filteredReportBillboardsDefaultFields = Object.keys(ReportChaDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportChaDefaultFields[key];
                            return obj;
                        }, {});
                    if (Object.keys(filteredReportBillboardsDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportBillboardsDefaultFields);
                    }
                }
            }
            const recordDetails =
                await this.autoReportSettingService.findOne(
                    reportData
                );
            if (!recordDetails) {
                //Condition for new system mail template Changing Domain Link to {{IMAGE_BASE_URL}}
                if (postData?.email_content && postData?.email_content !== '') {
                    const domains = appConstant.DOMAINS_LIST_ZOMO_HEALTH;   // Use Zomo Health domains for new system
                    const pattern = new RegExp(
                        '(' +
                        domains
                            .map(domain => domain.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')) // Escape special characters
                            .join('|') +
                        ')',
                        'gi'
                    );
                    postData.email_content = postData.email_content.replace(pattern, '{{IMAGE_BASE_URL}}');
                }
                await this.autoReportSettingService.save(reportData);
                return res.status(HttpStatus.CREATED).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'Report setting successfully saved...',
                });
            }else{
                return res.status(HttpStatus.CREATED).json({
                    statusCode: 401,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'Sorry! same report setting already exists...',
                });
            }
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
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id || !this.commonService.isValidNumber(postData?.status)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,"ERR_REQUIRED_PARAM_MISSING",),);
            }
            const where = { id: postData?.id };
            const recordDetails =
                await this.autoReportSettingService.findOne(where);
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,"ERR_RECORD_NOT_FOUND",),);
            }
            await this.autoReportSettingService.update(where,{status: postData?.status});
            this.activityLogService.create(recordDetails, postData, tableConstant.TBL_AU_AUTO_REPORT_SETTINGS, req.tokenUser?.id, 'delete');
            if(postData?.status.toString() === '2'){
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'Report Setting successfully deleted.',
                });
            }else{
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'Status successfully changed.',
                });
            }
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
    @Put('update')
    async update(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: autoReportSettingsInput,
    ) {
        try {
            if (!postData?.id || postData?.org_id == undefined || !postData?.module_id || !postData.hasOwnProperty('frequency_type') ||!postData?.send_emails || !postData?.email_subject) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,"ERR_REQUIRED_PARAM_MISSING",),);
            }
            let user= Object.create(req.tokenUser)
            let reportData = Object.create(null)
            let userRole = postData?.user_role
            let orgId = postData?.org_id
            let companyDetails = await this.companyService.companyFindOne({id: orgId}, ['id','code', 'company_name']);
            let membershipCode = companyDetails?.code ?? user.membership_code ?? '';
            let moduleId = Number(postData?.module_id)
            let frequencyType = Number(postData?.frequency_type)
            let where ={id:postData?.id}
            reportData['id'] = postData?.id
            reportData['user_role'] = userRole
            reportData['membership_code'] = membershipCode
            reportData['org_id'] = orgId
            reportData['module_id'] = moduleId
            reportData['created_by'] = user.id
            reportData['frequency_type'] = frequencyType
            if(frequencyType === 2 || frequencyType === 3){
                reportData['weekly_days'] = (postData?.weekly_days && postData?.weekly_days?.length)? postData?.weekly_days?.replace(/^\[|\]$/g, '').replace(/['"]/g, '') : null
            }
            else if(frequencyType === 4){
                reportData['monthly_basis']= postData?.monthly_basis || null
                if(postData?.monthly_basis?.toString() === '1'){
                    reportData['monthly_date_basis']= postData?.monthly_date_basis || null
                }else if(postData?.monthly_basis?.toString() === '2'){
                    reportData['monthly_basis_type'] = postData?.monthly_basis_type || null
                    reportData['monthly_basis_day'] = postData?.monthly_basis_day || null
                }
            }
            else if(frequencyType === 5){
                reportData['year_basis_day'] = postData?.year_basis_day || null
                reportData['year_basis_month'] = postData?.year_basis_month || null
            }
            reportData['timezone_time'] = postData?.timezone_time || ''
            reportData['org_timezone'] = (postData?.org_timezone && postData?.org_timezone !== '')? postData?.org_timezone : 'UTC'
            reportData['send_emails'] = postData?.send_emails?.replace(/\s+/g, '') || ''
            reportData['send_cc_emails'] = postData?.send_cc_emails?.replace(/\s+/g, '') ||  ''
            reportData['email_subject'] = postData?.email_subject || ''
            reportData['email_content'] = postData?.email_content || ''
            reportData['status'] = 1
            reportData['f_engagement_report'] = 0
            reportData['f_department'] = (postData?.f_department && postData?.f_department?.length)? postData?.f_department?.replace(/^\[|\]$/g, '').replace(/['"]/g, '') : null
            reportData['f_location'] = (postData?.f_location && postData?.f_location?.length)? postData?.f_location?.replace(/^\[|\]$/g, '').replace(/['"]/g, '') : null
            reportData['f_country'] = (postData?.f_country && postData?.f_country?.length)? postData?.f_country?.replace(/^\[|\]$/g, '').replace(/['"]/g, '') : null
            reportData['f_state'] = (postData?.f_state && postData?.f_state?.length)? postData?.f_state?.replace(/^\[|\]$/g, '').replace(/['"]/g, '') : null
            reportData['f_city'] = (postData?.f_city && postData?.f_city?.length)? postData?.f_city?.replace(/^\[|\]$/g, '').replace(/['"]/g, '') : null
            let conditionData = `User.role_id IN ('2','16') AND User.membership_code = '${membershipCode}'`;
            if(postData?.f_terminated_users && postData?.f_terminated_users?.toString() === '2' ){
                conditionData += ` AND User.status = 1`
            }else if(moduleId === 2){
                conditionData += ` AND User.status = 1`
            }
            if (reportData.f_department !== '' && reportData.f_department !== null) {
                conditionData += ` AND User.department_id IN (${reportData.f_department})`;
            }
            if (reportData.f_country !== '' && reportData.f_country !== null) {
                conditionData += ` AND Location.country IN (${reportData.f_country})`;
            }
            if (reportData.f_state !== '' && reportData.f_state !== null) {
                conditionData += ` AND Location.state IN (${reportData.f_state})`;
            }
            if (reportData.f_city !== '' && reportData.f_city !== null) {
                conditionData += ` AND Location.city IN (${reportData.f_city})`;
            }
            if(postData?.f_health_plans && (postData?.f_health_plans !==  '' || postData?.f_health_plans !== null)){
                if(postData?.f_health_plans !== 'both'){
                    let onInsurancePlan = postData?.f_health_plans || ''
                    conditionData +=` AND User.on_insurance_plan = ${onInsurancePlan}`
                }
            }
            reportData['setting_conditions']=conditionData
            if(moduleId === 1){
                reportData['f_module_report_type']=postData?.f_module_report_type
                reportData['report_type']='Incentive'
                reportData['f_module_items']=0
                if(postData?.f_module_items && Array.isArray(postData?.f_module_items) && postData?.f_module_items.length > 0) {
                    postData.f_module_items = [...new Set(postData?.f_module_items.filter(Boolean))];
                    reportData.f_module_items = postData?.f_module_items.join(',');
                }
                reportData['f_health_plans']=postData?.f_health_plans || null
                reportData['f_from_date']=postData?.f_from_date || null
                reportData['f_to_date']=postData?.f_to_date || null
                reportData['f_terminated_users']=postData?.f_terminated_users || null
                let ReportIncDefaultFields = reportFieldsConstant.ReportIncDefaultFields;
                reportData['report_fields']= null
                if(postData?.report_fields){
                    const filteredReportIncDefaultFields = Object.keys(ReportIncDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportIncDefaultFields[key];
                            return obj;
                        }, {});
                    if (Object.keys(filteredReportIncDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportIncDefaultFields);
                    }
                }
            }
            else if(moduleId === 2){
                reportData['report_type']= 'Myplan';
                reportData['f_engagement_report'] = postData?.f_engagement_report || null
                reportData['f_module_items']=0
                reportData['f_from_date']= postData?.f_from_date || null
                reportData['f_to_date']= postData?.f_to_date || null
                if(postData?.f_module_items && Array.isArray(postData?.f_module_items) && postData?.f_module_items.length > 0) {
                    postData.f_module_items = [...new Set(postData?.f_module_items.filter(Boolean))];
                    reportData.f_module_items = postData?.f_module_items.join(',');
                }
                let ReportMypDefaultFields = reportFieldsConstant.ReportMypDefaultFields_TYPE2;
                reportData['report_fields']= null
                if(postData?.report_fields){
                    const filteredReportIncDefaultFields = Object.keys(ReportMypDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportMypDefaultFields[key];
                            return obj;
                        }, {});
                    if (Object.keys(filteredReportIncDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportIncDefaultFields);
                    }
                }
            }
            else if(moduleId === 3) {
                reportData['report_type'] = 'Challenge';
                reportData['f_module_items'] = 0;
                if(postData?.f_module_items && Array.isArray(postData?.f_module_items) && postData?.f_module_items.length > 0) {
                    postData.f_module_items = [...new Set(postData?.f_module_items.filter(Boolean))];
                    reportData.f_module_items = postData?.f_module_items.join(',');
                }
                reportData['challenge_status'] = postData?.challenge_status || null;
                reportData['challenge_type'] = postData?.challenge_type || null;
                let ReportChallengeDefaultFields = reportFieldsConstant.ReportChallengeDefaultFields_TYPE3;
                reportData['report_fields'] = null;
                if(postData?.report_fields) {
                    const filteredReportChallengeDefaultFields = Object.keys(ReportChallengeDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportChallengeDefaultFields[key];
                            return obj;
                        }, {});
                    if(Object.keys(filteredReportChallengeDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportChallengeDefaultFields);
                    }
                }
            }
            else if (moduleId === 4) {
                reportData['f_module_report_type'] = postData?.f_module_report_type;
                reportData['report_type'] = 'Covid19';
                reportData['f_module_items'] = 0;
                reportData['f_from_date'] = postData?.f_from_date;
                reportData['f_to_date'] = postData?.f_to_date;
                reportData['f_terminated_users'] = postData?.f_terminated_users;
                let ReportChallengeDefaultFields = reportFieldsConstant.ReportChallengeDefaultFields_TYPE4;
                reportData['report_fields'] = null;
                if(postData?.report_fields) {
                    const filteredReportChallengeDefaultFields = Object.keys(ReportChallengeDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportChallengeDefaultFields[key];
                            return obj;
                        }, {});
                    if(Object.keys(filteredReportChallengeDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportChallengeDefaultFields);
                    }
                }
                const Otheroptions = {
                    'are_you_caccinated': postData?.are_you_caccinated,
                    'eligible_to_come_to_word': postData?.eligible_to_come_to_word
                };
                reportData['otheroptions'] = JSON.stringify(Otheroptions);
            }
            else if (moduleId === 5) {
                reportData['report_type'] = 'Quicklink';
                reportData['f_module_items'] = 0;
                if(postData?.f_module_items && Array.isArray(postData?.f_module_items) && postData?.f_module_items.length > 0) {
                    postData.f_module_items = [...new Set(postData?.f_module_items.filter(Boolean))];
                    reportData.f_module_items = postData?.f_module_items.join(',');
                }
                reportData['f_from_date'] = postData?.f_from_date;
                reportData['f_to_date'] = postData?.f_to_date;
                reportData['f_terminated_users'] = postData?.f_terminated_users;
                let ReportQuicklinkDefaultFields = reportFieldsConstant.ReportUserDefaultFields;
                reportData['report_fields'] = null;
                if(postData?.report_fields) {
                    const filteredReportChallengeDefaultFields = Object.keys(ReportQuicklinkDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportQuicklinkDefaultFields[key];
                            return obj;
                        }, {});
                    if(Object.keys(filteredReportChallengeDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportChallengeDefaultFields);
                    }
                }
            }
            else if (moduleId === 6) {
                reportData['report_type'] = 'FitnessVideo';
                reportData['f_module_items'] = 0;
                if (postData?.f_module_items && Array.isArray(postData?.f_module_items) && postData?.f_module_items.length > 0) {
                    postData.f_module_items = [...new Set(postData?.f_module_items.filter(Boolean))];
                    reportData.f_module_items = postData?.f_module_items.join(',');
                }
                reportData['f_from_date'] = postData?.f_from_date;
                reportData['f_to_date'] = postData?.f_to_date;
                reportData['f_terminated_users'] = postData?.f_terminated_users;
                let ReportFitnessVideoDefaultFields = reportFieldsConstant.ReportUserDefaultFields;
                reportData['report_fields'] = null;
                if (postData?.report_fields) {
                    const filteredReportFitnessVideoDefaultFields = Object.keys(ReportFitnessVideoDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportFitnessVideoDefaultFields[key];
                            return obj;
                        }, {});
                    if (Object.keys(filteredReportFitnessVideoDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportFitnessVideoDefaultFields);
                    }
                }
            }
            else if (moduleId === 7) {
                reportData['report_type'] = 'Billboards';
                reportData['f_module_items'] = 0;
                reportData['f_from_date'] = postData?.f_from_date;
                reportData['f_to_date'] = postData?.f_to_date;
                reportData['f_terminated_users'] = postData?.f_terminated_users;
                let ReportBillboardsDefaultFields = reportFieldsConstant.ReportUserDefaultFields;
                reportData['report_fields'] = null;
                if (postData?.report_fields) {
                    const filteredReportBillboardsDefaultFields = Object.keys(ReportBillboardsDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportBillboardsDefaultFields[key];
                            return obj;
                        }, {});
                    if (Object.keys(filteredReportBillboardsDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportBillboardsDefaultFields);
                    }
                }
                const otherOptions = {
                    deviced_type: postData?.deviced_type
                };
                reportData['otheroptions'] = JSON.stringify(otherOptions);
            }
            else if (moduleId === 8) {
                reportData['report_type'] = 'Events';
                reportData['f_module_items'] = 0;
                if (postData?.f_module_items && Array.isArray(postData?.f_module_items) && postData?.f_module_items.length > 0) {
                    postData.f_module_items = [...new Set(postData?.f_module_items.filter(Boolean))];
                    reportData.f_module_items = postData?.f_module_items.join(',');
                }
                const ReportChaDefaultFields = reportFieldsConstant.PreDataFields[moduleId];
                reportData['report_fields'] = null;
                if (postData?.report_fields) {
                    const filteredReportBillboardsDefaultFields = Object.keys(ReportChaDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportChaDefaultFields[key];
                            return obj;
                        }, {});
                    if (Object.keys(filteredReportBillboardsDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportBillboardsDefaultFields);
                    }
                }
                const otherOptions = {
                    event_dates: postData?.event_dates,
                    deviced_type: postData?.deviced_type,
                    event_type: postData?.event_type,
                    event_list: postData?.event_list,
                };
                reportData['otheroptions'] = JSON.stringify(otherOptions);
            }
            else if (moduleId === 9) {
                reportData['report_type'] = 'Health';
                reportData['f_module_items'] = 0;
                reportData['f_health_plans'] = postData?.f_health_plans || null;
                reportData['f_from_date'] = postData?.f_from_date;
                reportData['f_to_date'] = postData?.f_to_date;
                reportData['f_terminated_users'] = postData?.f_terminated_users;
                reportData['report_fields'] = null;
                let otherOptions = Object.create(null)
                otherOptions.data_source= postData?.data_source
                if(user?.company?.setting?.is_emo_health_asssessments === 0){
                    otherOptions.hra_status = postData?.f_module_report_type || null
                }
                reportData['otheroptions'] = JSON.stringify(otherOptions);
            }
            else if (moduleId === 10) {
                reportData['report_type'] = 'Activity';
                reportData['f_module_items'] = 0;
                if (postData?.f_module_items && Array.isArray(postData?.f_module_items) && postData?.f_module_items.length > 0) {
                    postData.f_module_items = [...new Set(postData?.f_module_items.filter(Boolean))];
                    reportData.f_module_items = postData?.f_module_items.join(',');
                }
                reportData['f_from_date'] = postData?.f_from_date;
                reportData['f_to_date'] = postData?.f_to_date;
                reportData['f_terminated_users'] = postData?.f_terminated_users;
                const ReportChaDefaultFields = reportFieldsConstant.ReportChaDefaultFields;
                reportData['report_fields'] = null;
                if (postData?.report_fields) {
                    const filteredReportBillboardsDefaultFields = Object.keys(ReportChaDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportChaDefaultFields[key];
                            return obj;
                        }, {});
                    if (Object.keys(filteredReportBillboardsDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportBillboardsDefaultFields);
                    }
                }
            }
            else if (moduleId === 11) {
                reportData['report_type'] = 'Quizzes';
                reportData['f_module_items'] = 0;
                if (postData?.f_module_items && Array.isArray(postData?.f_module_items) && postData?.f_module_items.length > 0) {
                    postData.f_module_items = [...new Set(postData?.f_module_items.filter(Boolean))];
                    reportData.f_module_items = postData?.f_module_items.join(',');
                }
                reportData['f_from_date'] = postData?.f_from_date;
                reportData['f_to_date'] = postData?.f_to_date;
                const ReportChaDefaultFields = reportFieldsConstant.ReportChaDefaultFields;
                delete ReportChaDefaultFields['USERNAME'];
                delete ReportChaDefaultFields['EMPLOYEE_ID'];
                reportData['report_fields'] = null;
                if (postData?.report_fields) {
                    const filteredReportBillboardsDefaultFields = Object.keys(ReportChaDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportChaDefaultFields[key];
                            return obj;
                        }, {});
                    if (Object.keys(filteredReportBillboardsDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportBillboardsDefaultFields);
                    }
                }
            }
            else if (moduleId === 12) {
                reportData['report_type'] = 'EmotionalWellBeing';
                reportData['f_module_items'] = 0;
                reportData['f_from_date'] = postData?.f_from_date;
                reportData['f_to_date'] = postData?.f_to_date;
                reportData['f_terminated_users'] = postData?.f_terminated_users;
                const ReportChaDefaultFields = reportFieldsConstant.ReportChaDefaultFields_TYEPE12;
                reportData['report_fields'] = null;
                if (postData?.report_fields) {
                    const filteredReportBillboardsDefaultFields = Object.keys(ReportChaDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportChaDefaultFields[key];
                            return obj;
                        }, {});
                    if (Object.keys(filteredReportBillboardsDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportBillboardsDefaultFields);
                    }
                }
            }
            else if (moduleId === 13) {
                reportData['f_module_report_type'] = postData?.f_module_report_type || '';
                reportData['report_type'] = 'Survey';
                reportData['f_module_items'] = 0;
                reportData['f_from_date'] = postData?.f_from_date;
                reportData['f_to_date'] = postData?.f_to_date;
                reportData['f_terminated_users'] = postData?.f_terminated_users;
                const ReportChaDefaultFields = reportFieldsConstant.ReportChaDefaultFields;
                delete ReportChaDefaultFields['USERNAME'];
                delete ReportChaDefaultFields['EMPLOYEE_ID'];;
                reportData['report_fields'] = null;
                if (postData?.report_fields) {
                    const filteredReportBillboardsDefaultFields = Object.keys(ReportChaDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportChaDefaultFields[key];
                            return obj;
                        }, {});
                    if (Object.keys(filteredReportBillboardsDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportBillboardsDefaultFields);
                    }
                }
            }
            else if (moduleId === 14) {
                reportData['f_module_report_type'] = postData?.f_module_report_type ||'';
                reportData['report_type'] = 'EngagementComparison';
                reportData['f_module_items'] = 0;
                if (postData?.f_module_items && Array.isArray(postData?.f_module_items) && postData?.f_module_items.length > 0) {
                    postData.f_module_items = [...new Set(postData?.f_module_items.filter(Boolean))];
                    reportData.f_module_items = postData?.f_module_items.join(',');
                }
                reportData['f_from_date'] = postData?.f_from_date;
                reportData['f_health_plans'] = postData?.f_health_plans;
                reportData['f_terminated_users'] = postData?.f_terminated_users;
                reportData['report_fields'] = null;
            }
            else if (moduleId === 15) {
                reportData['report_type'] = 'Reimbursement';
                reportData['f_module_report_type'] = postData?.f_module_report_type ||'';
                reportData['f_module_items'] = 0;
                if (postData?.f_module_items && Array.isArray(postData?.f_module_items) && postData?.f_module_items.length > 0) {
                    postData.f_module_items = [...new Set(postData?.f_module_items.filter(Boolean))];
                    reportData.f_module_items = postData?.f_module_items.join(',');
                }
                reportData['send_emails'] = postData?.send_emails || '';
                reportData['f_from_date'] = postData?.f_from_date || '';
                reportData['f_to_date'] = postData?.f_to_date || '';
                const ReportChaDefaultFields = reportFieldsConstant.ReportChaDefaultFields;
                reportData['report_fields'] = null;
                if (postData?.report_fields) {
                    const filteredReportBillboardsDefaultFields = Object.keys(ReportChaDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportChaDefaultFields[key];
                            return obj;
                        }, {});
                    if (Object.keys(filteredReportBillboardsDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportBillboardsDefaultFields);
                    }
                }
            }
            else if (moduleId === 16) {
                reportData['report_type'] = 'Biometrics';
                reportData['f_module_items'] = 0;
                reportData['send_emails'] = postData?.send_emails || '';
                const ReportChaDefaultFields = reportFieldsConstant.ReportChaDefaultFields_TYEPE16;
                reportData['report_fields'] = null;
                if (postData?.report_fields) {
                    const filteredReportBillboardsDefaultFields = Object.keys(ReportChaDefaultFields)
                        .filter(key => postData?.report_fields?.includes(key))
                        .reduce((obj, key) => {
                            obj[key] = ReportChaDefaultFields[key];
                            return obj;
                        }, {});
                    if (Object.keys(filteredReportBillboardsDefaultFields).length > 0) {
                        reportData['report_fields'] = JSON.stringify(filteredReportBillboardsDefaultFields);
                    }
                }
            }
            const recordDetails = await this.autoReportSettingService.findOne({id:postData?.id});
            if (recordDetails) {
                //Condition for new system mail template Changing Domain Link to {{IMAGE_BASE_URL}}
                if (postData?.email_content && postData?.email_content !== '') {
                    const domains = appConstant.DOMAINS_LIST_ZOMO_HEALTH;   // Use Zomo Health domains for new system
                    const pattern = new RegExp(
                        '(' +
                        domains
                            .map(domain => domain.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')) // Escape special characters
                            .join('|') +
                        ')',
                        'gi'
                    );
                    postData.email_content = postData.email_content.replace(pattern, '{{IMAGE_BASE_URL}}');
                }
                await this.autoReportSettingService.update(where,reportData);
                this.activityLogService.create(recordDetails, reportData, tableConstant.TBL_AU_AUTO_REPORT_SETTINGS, req.tokenUser?.id);
                return res.status(HttpStatus.CREATED).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'Report setting successfully updated...',
                });
            }else{
                throw new Error('No result found.');
            }
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = { status: 1 };
            let resultedData = await this.autoReportSettingService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(
                    AutoreportsettingsDto,
                    resultedData,
                    req.lang
                )
            );
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
    @Post('predata-field')
    async predataField(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let resultedData = Object.create(null);
            //TODO CHANGE IMAGE AND LOGIN LINK TO ZOMO
            resultedData['report_list']=appConstant.REPORT_LIST;
            resultedData['email_content']=`
            <!DOCTYPE html>
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-size: 18px; font-family:'Roboto'; margin: 0; padding: 0; color: #111827; line-height: 1.6;">
                    <div style="margin: 0 auto; width: 740px;">
                        <div style="margin: 24px;">
                            <header>
                                <img src="{{IMAGE_BASE_URL}}/templateImages/zomologo.png" alt="zomologo" style="width: 206px; height: 39px;">
                            </header>
                            <div>
                                <div style="margin-top: 72px; text-align: center;">
                                    <img src="{{IMAGE_BASE_URL}}/templateImages/ReportRequest.png" alt="Add Report"
                                        style="width: 522px; height: 319px;" />
                                </div>
                                <div style="width: 652px;">
                                    <div style="margin: 71px 0 26px 0;">
                                        <p style="margin: 0;">Hello <span style="font-weight: 500;"><b>[Full Name],</b></span></p>
                                    </div>
                                    <p style="margin-bottom: 20px;">Campaign Name : <span style="font-weight: 500;"><b>[Report Items Name]</b></span></p>
                                    <a href="{{IMAGE_BASE_URL}}" style="color: #209985; text-decoration: none;">{{IMAGE_BASE_URL}} </a>
                                    <br />
                                    <br />
                                    For any questions regarding the wellness program please ask your HR administrator.
                                    For technical support with zomohealth.com please contact 
                                    <a href="mailto:support@zomohealth.com" style="text-decoration:none;color:#209985;">
                                    support@zomohealth.com</a>.
                                    <br />
                                    <div style="margin-top: 50px;">
                                        <p style="margin: 0;">Thank you,</p>
                                        <p style="margin: 8px 0;"><b>[Company Name]</b></p>
                                        <div class="logo-placeholder" style="width: 200px; height: 100px;">
                                            [Company Logo]
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style="background-color: #f1f7f8; width:740px; height:221px;">
                            <div style="margin-top:40px; width:660px; height:99px;">
                                <p style="padding:40px 0 0 44px;;"><b>Download our Zomo health app</b></p>
                                <table style="font-size: 16px; margin-top:14px;">
                                    <tbody>
                                        <tr>
                                            <td style="padding-left: 40px;"><a href="#" target="_blank"
                                                    style="text-decoration: none;"><img src="{{IMAGE_BASE_URL}}/templateImages/googleplay.png"></a></td>
                                            <td style="padding-left: 8px;"><a href="#" target="_blank"
                                                    style="text-decoration: none;"><img src="{{IMAGE_BASE_URL}}/templateImages/applestore.png"></a></td>
                                            <td style="padding-left: 88px;"><img src="{{IMAGE_BASE_URL}}/templateImages/aicpasoc.png"></td>
                                            <td style="padding-left: 8px;"><img src="{{IMAGE_BASE_URL}}/templateImages/Hippa.png"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div style="margin:75px 0 0 40px; width:474px; height:26px;">
                                <table style="font-size: 15px;">
                                    <tbody>
                                        <tr>
                                            <td style="text-align:center;">1-877-506-5885</td>
                                            <td style="width:40px;text-align:center;margin-left: 20px;"><img src="{{IMAGE_BASE_URL}}/templateImages/ellipse.png">
                                            </td>
                                            <td style="width:30px;text-align:center;margin-left: 15px;"><a
                                                    href="mailto:support@zomohealth.com" style="text-decoration: none;color: #111827;"
                                                    target="_blank">support@zomohealth.com</a></td>
                                            <td style="width:40px;text-align:center;margin-left: 20px;"><img src="{{IMAGE_BASE_URL}}/templateImages/ellipse.png">
                                            </td>
                                            <td style="width:30px;text-align:center;margin-left: 15px;"><a href="#"
                                                    style="text-decoration: none; color: #111827;" target="_blank">
                                                    Unsubscribe</a></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </body>
            </html>`;
            if(resultedData?.['email_content'] && resultedData['email_content'] !== ''){
                resultedData['email_content'] = await this.urlManageService.onmapUrlContent(resultedData['email_content'],'mailTemplate') || resultedData['email_content'];
            }
            if(!resultedData['selectDefaultField']){
                resultedData['selectDefaultField'] = Object.create(null)
            }
            resultedData['selectDefaultField']['1']=reportFieldsConstant.PreDataFields[1]
            resultedData['selectDefaultField']['2']=reportFieldsConstant.PreDataFields[2]
            resultedData['selectDefaultField']['3']=reportFieldsConstant.PreDataFields[3]
            resultedData['selectDefaultField']['4']=reportFieldsConstant.PreDataFields[4]
            resultedData['selectDefaultField']['5']=reportFieldsConstant.PreDataFields[0]
            resultedData['selectDefaultField']['6']=reportFieldsConstant.PreDataFields[0]
            resultedData['selectDefaultField']['7']=reportFieldsConstant.PreDataFields[0]
            resultedData['selectDefaultField']['8']=reportFieldsConstant.PreDataFields[8]
            resultedData['selectDefaultField']['9']={}
            resultedData['selectDefaultField']['10']=reportFieldsConstant.PreDataFields[10]
            resultedData['selectDefaultField']['11']=reportFieldsConstant.PreDataFields[11]
            resultedData['selectDefaultField']['12']=reportFieldsConstant.PreDataFields[12]
            resultedData['selectDefaultField']['13']=reportFieldsConstant.PreDataFields[11]
            resultedData['selectDefaultField']['14']={}
            resultedData['selectDefaultField']['15']=reportFieldsConstant.PreDataFields[15]
            resultedData['selectDefaultField']['16']=reportFieldsConstant.PreDataFields[16]
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
    @Post('cron-report')
    async cronReportRequestSet(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try{
            let data= await lastValueFrom(this.cronMicroservice.send({ cmd: 'cron_report_request' },  {}));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data,
                message: 'success',
            });
        }
        catch (error) {
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
    @Post('cron-auto-report-email')
    async cronAutoEmail(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try{
            let data= await lastValueFrom(this.cronMicroservice.send({ cmd: 'cron_auto_report_email' },  {}));
            if(typeof data === 'object' && data?.success === 0 && data?.error === 1 && data?.message){
                throw new Error(data?.message);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data,
                message: 'success',
            });
        }
        catch (error) {
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
