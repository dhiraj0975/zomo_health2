import { appConstant, CommonDateService, CommonHealthService, CommonService, tableConstant } from '@common-constants';
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
import { UrlManageService } from 'src/modules/common';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { Between, In, IsNull, LessThanOrEqual, MoreThanOrEqual, Not, Raw } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    PaginateWithCompanyInput,
} from "../../../input";
import { ActivityService } from "../../activity/activity/activity.service";
import { SubmitFormsService } from "../../activitytracker/submitforms/submitforms.service";
import { CampaignActivityService } from "../../campaign/campaignactivity/campaignactivity.service";
import { ScheduleChallengeService } from '../../challenge/schedulechallenge/schedulechallenge.service';
import { ScheduleChallengeJoinUsersService } from '../../challenge/schedulechallengejoinusers/schedulechallengejoinusers.service';
import { ActivePluginService } from "../../company/activeplugins/activeplugin.service";
import { CompanyService } from '../../company/companies/company.service';
import { InterlinksService } from "../../company/interlinks/interlinks.service";
import { MetaService } from "../../company/meta/meta.service";
import { WellBeingCategoryService } from "../../emotionalwellbeing/wellbeingcategory/wellbeingcategory.service";
import { WellBeingPostService } from "../../emotionalwellbeing/wellbeingpost/wellbeingpost.service";
import { WellBeingPostClickService } from "../../emotionalwellbeing/wellbeingpostclick/wellbeingpostclick.service";
import { EventCategoryService } from "../../events/eventcategory/eventcategory.service";
import { EventService } from "../../events/events/events.service";
import { AssessmentsService } from "../../healthassessment/assessments/assessments.service";
import { AuthorizationsService } from '../../healthcheckup/authorizations/authorizations.service';
import { BiometricsService } from '../../healthcheckup/biometrics/biometrics.service';
import { DentistsService } from '../../healthcheckup/dentists/dentists.service';
import { OptometristsService } from '../../healthcheckup/optometrists/optometrists.service';
import { TobaccoUsesService } from '../../healthcheckup/tobaccouses/tobaccouses.service';
import { FitnessVideoClickService } from "../../mediafitness/videoclick/fitnessvideoclick.service";
import { QuickLinkService } from '../../quicklink/quicklink/quicklink.service';
import { QuickLinkClicksService } from '../../quicklink/quicklinkclicks/quicklinkclicks.service';
import { QuizQuizzesService } from '../../quiz/quizzes/quizzes.service';
import { UserDetailsService } from '../../quiz/userdetails/userdetails.service';
import { ActivityFeedService } from "../../trackers/activityfeeds/activityfeeds.service";
import { FoodFeedService } from "../../trackers/foodfeeds/foodfeeds.service";
import { TranslationService } from "../../translation/translation.service";
import { UserLoginService } from "../../user/userlogin/userlogin.service";
import { MyPlanAssignUserPlanService } from "../assignuserplan/assignuserplan.service";
import { MyPlanCompleteActivityService } from '../completeactivity/completeactivity.service';
import { MyPlanCompleteBlockService } from "../completeblock/completeblock.service";
import { MyPlanDescriptionService } from '../description/description.service';
import { FrontService } from "../front/front.service";
import { MyPlanJoinUserPlanService } from "../joinuserplan/joinuserplan.service";
import { MyPlanPlansService } from "../plans/plans.service";

@Controller('my-plan/assign-plan')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class MyPlanAssignPlanUserController {
    constructor(
        private readonly commonService: CommonService,
        private readonly commonDateService: CommonDateService,
        private readonly commonHealthService: CommonHealthService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly companyService: CompanyService,
        private readonly myPlanPlansService: MyPlanPlansService,
        private readonly activityService: ActivityService,
        private readonly companyMetaService: MetaService,
        private readonly myPlanAssignUserPlanService: MyPlanAssignUserPlanService,
        private readonly activePluginService: ActivePluginService,
        private readonly myPlanJoinUserPlanService: MyPlanJoinUserPlanService,
        private readonly campaignActivityService: CampaignActivityService,
        private readonly myPlanDescriptionService: MyPlanDescriptionService,
        private readonly quickLinkService: QuickLinkService,
        private readonly assessmentsService: AssessmentsService,
        private readonly tobaccoUsesService: TobaccoUsesService,
        private readonly authorizationsService: AuthorizationsService,
        private readonly biometricsService: BiometricsService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly quickLinkClicksService: QuickLinkClicksService,
        private readonly myPlanCompleteActivityService: MyPlanCompleteActivityService,
        private readonly myPlanCompleteBlockService: MyPlanCompleteBlockService,
        private readonly eventService: EventService,
        private readonly eventCategoryService: EventCategoryService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly quizQuizzesService: QuizQuizzesService,
        private readonly dentistsService: DentistsService,
        private readonly optometristsService: OptometristsService,
        private readonly submitFormsService: SubmitFormsService,
        private readonly userLoginService: UserLoginService,
        private readonly userDetailsService: UserDetailsService,
        private readonly wellbeingPostService: WellBeingPostService,
        private readonly wellbeingPostClickService: WellBeingPostClickService,
        private readonly fitnessVideoClickService: FitnessVideoClickService,
        private readonly activityFeedsService: ActivityFeedService,
        private readonly foodFeedsService: FoodFeedService,
        private readonly wellBeingCategoryService: WellBeingCategoryService,
        private readonly interlinksService: InterlinksService,
        private readonly frontService: FrontService,
        private readonly urlManageService: UrlManageService,
    ) {}
    /* TODO: dashboard language trans condition add (block & activity)*/
    @Post('plan')
    async plan(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            let insurancePlanName = req.tokenUser?.insurance_plan_name || '';
            let userTimeZone: any = await this.commonDateService.DateTimeFormat(new Date(),'YYYY-MM-DD HH:mm:ss','YYYY-MM-DD HH:mm:ss',req?.tokenUser?.timezone || 'UTC');
            let userDateTimeZone: any = await this.commonDateService.DateTimeFormat(userTimeZone,'YYYY-MM-DD','YYYY-MM-DD HH:mm:ss');
            let dob: any = await this.commonDateService.DateTimeFormat(new Date(req?.tokenUser?.dob), 'YYYY-MM-DD');
            let bDay = await this.commonDateService.numOfYears(dob,userDateTimeZone);
            let userGender = appConstant.GENDER_MAP[req.tokenUser?.gender] || 0;
            let departmentId = req?.tokenUser?.department_id;
            let locationId = req?.tokenUser?.location;
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.org_id || !postData?.user_id || !this.commonService.isValidNumber(postData?.plan_order)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let planLabelData: any = await this.companyMetaService.findOne({org_id: postData?.org_id},['plan_label']);
            if (planLabelData?.plan_label) {
                planLabelData = JSON.parse(planLabelData.plan_label);
                await Promise.all(Object.entries(planLabelData).map(async ([key, value])=>{
                    if(key){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`${key}_${postData?.org_id}`,`/LC_MESSAGES/MyPlan/PlanLabel/${postData?.org_id}`,`dynamic`);
                        if (customName == '' || customName == `${key}_${postData?.org_id}`) {
                            delete planLabelData[key];
                        } else {
                            planLabelData[key] = customName;
                        }
                    }
                }));
            }
            let planLabelDefault: any = {
                'completion': 'Congratulations! You have completed the My Plan requirement for the Dividend Program. You are welcome to complete additional My Plans as you work toward health and fitness goals.',
                'required': 'Required',
                'optional': 'Optional',
                'incomplete': 'Incomplete',
                'plantext': ''
            };
            await Promise.all(Object.entries(planLabelDefault).map(async ([key, value])=>{
                if(key){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,key, `/LC_MESSAGES/MyPlan/PlanLabel`,`static`);
                    planLabelDefault[key] = (customName == '' || customName == `${key}`) ? planLabelDefault[key] : customName;
                }
            }));
            planLabelData = { ...planLabelDefault, ...planLabelData };
            let appendPlanActivityDefine: any = {'label': planLabelData['optional']};
            const assignUserPlan = await this.myPlanAssignUserPlanService.findOne({ user_id: postData?.user_id, status: Not('2')});
            let autoPlan: any[] = [],autoRemovePlan: any[] = [];
            if (assignUserPlan) {
                const { plan_id, gc_plan_id, gc_plan_remove } = assignUserPlan;
                const parseOrDefault = (input: string | undefined) => input ? JSON.parse(input).map(Number) : [];
                autoPlan = [...parseOrDefault(plan_id), ...parseOrDefault(gc_plan_id)];
                autoRemovePlan = parseOrDefault(gc_plan_remove);
                autoPlan = autoPlan.filter((val) => !autoRemovePlan.includes(val));
            }
            let otherDataPass: any = {}, activePlugin: any;
            otherDataPass['bio_data'] = appConstant.BIO_DATA_LIST;
            let where = `mp.status = '1' AND map.status = '1' AND map.org_id = '${postData?.org_id}'`;
            if (postData?.plan_ids) {
                where += ` AND mp.id IN(${postData?.plan_ids.split(',')})`
            }
            let tmpPlans = await this.myPlanPlansService.listRecord(["map.name","map.id","map.activity_id","map.based_on","map.display_block","map.startdate","map.enddate","map.completion_base","map.display_plan_to","map.display_plan_to_health","map.display_plan_to_health_source","map.completion_on","map.join_based_on","map.c_range","map.frequency_base","map.f_range","mp.id","mp.name","mp.description","mp.created_by","mp.icon","mar.plan_id","mar.rule_id","mar.optional","mar.id","mar.org_id","mar.recommended_base","mar.bstart_date","mar.bend_date","br.biometric_id","br.module_id","br.age","br.gender","br.ageoption","br.age_s_range","br.age_e_range","br.progress","br.type","br.s_range","br.e_range","br.activity_id","br.progress_setting","br.c_start_date","br.c_end_date","mb.id","mb.order_id","mb.name","mb.plan_id","mb.icon","mb.description","mcb.id","mcb.complete_date","mcb.block_id","mcb.status","mcb.activity_detail","ac.id","ac.activity_name","ac.category_id","ac.ext_link","ac.description","mca.created","mca.custom_id","mca.image","mca.notes","mca.created_by","mca.status","mca.user_id","jup.id","jup.progress","jup.user_id","jup.plan_id","jup.is_complete","jup.complete_date","jup.created","ma.id","ma.block_id","ma.wellbeing_category_id","ma.display_type","ma.org_activity_id","ma.activity_id","ma.is_category","ma.icon","ma.post_id","ma.fpost_id","ma.s_range","ma.e_range","ma.module_id","ma.option_activity_ids","ma.type","ma.healthplan","ma.healthplan_name","ma.age_e_range","ma.age_s_range","ma.gender","ma.age","ma.ageoption","ma.button_text","ma.link","ma.link_type","ma.link_id","ma.description","ma.add_image","ma.hide_button","ma.wtype","ma.wtypeunit","ma.upload_text","ma.frequency_base","ma.days","ma.f_range","ma.video_second","ma.grater_than","ma.f_type","maa.id","maa.name","maa.startdate","maa.enddate","maa.activity_id","maa.is_month","maa.is_month_days","acAge.id","acAge.activity_name","mab.id","mab.name","mab.activity_id","mab.startdate","mab.enddate"],where, {id: 'ASC'},[tableConstant.MY_PLAN.TBL_MP_ASSIGN_PLAN,tableConstant.MY_PLAN.TBL_MP_ASSIGN_RULE,tableConstant.MY_PLAN.TBL_MP_JOIN_USER_PLAN,tableConstant.MY_PLAN.TBL_MP_BLOCKS,tableConstant.MY_PLAN.TBL_MP_ASSIGN_BLOCK,tableConstant.MY_PLAN.TBL_MP_COMPLETE_BLOCK,tableConstant.MY_PLAN.TBL_MP_ACTIVITY,tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY,tableConstant.ACTIVITIES.TBL_ACTIVITIES,tableConstant.MY_PLAN.TBL_MP_COMPLETE_ACTIVITY], postData);
            let myPlans: any[] = [],userPlans: any = [],assignPlans: any[] = [],planDisplayArray: any[] = [],jsonAutoPlan: any[] = [],myPlansFlag = 0;
            if (postData?.flag_status == '1') {
                let status = tmpPlans.find(item => item.id == postData?.plan_ids)
                if (!status) {
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: null,
                        message: await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'),
                    });
                }
            }
            if (tmpPlans) {
                activePlugin = await this.activePluginService.getActivePluginList(postData?.org_id);
                for (let i: number = 0; i < tmpPlans.length; i++) {
                    let recommendedPlansJoin: boolean = false;
                    if(tmpPlans[i]['map']['name']){
                        tmpPlans[i]['name'] = tmpPlans[i]['map']['name']
                    }
                    if(tmpPlans[i]['name']){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`plan_name_${tmpPlans[i]['map']['id']}_${postData?.org_id}`,`/LC_MESSAGES/MyPlan/MyPlan/${postData?.org_id}/${tmpPlans[i]['map']['id']}`,`dynamic`);
                        tmpPlans[i]['name'] = tmpPlans[i]['map']['name']= (customName == '' || customName == `plan_name_${tmpPlans[i]['map']['id']}_${postData?.org_id}`) ? tmpPlans[i]['name'] : customName;
                    }
                    if (tmpPlans[i]['description']) {
                        if(tmpPlans[i]['description']){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`plan_description_${tmpPlans[i]['map']['id']}_${postData?.org_id}`,`/LC_MESSAGES/MyPlan/MyPlan/${postData?.org_id}/${tmpPlans[i]['map']['id']}`,`dynamic`);
                            tmpPlans[i]['description'] = (customName == '' || customName == `plan_description_${tmpPlans[i]['map']['id']}_${postData?.org_id}`) ? tmpPlans[i]['description'] : customName;
                        }
                    }
                    if (tmpPlans[i]['jup']) {
                        tmpPlans[i] = await this.commonDateService.basedOnPlanDate(tmpPlans[i],insurancePlanName,userGender,bDay)
                        if (tmpPlans[i]['end_date'] && await this.commonDateService.DateTimeFormat(userTimeZone, 'timestamp','YYYY-MM-DD HH:mm:ss') > await this.commonDateService.DateTimeFormat(tmpPlans[i]['end_date'], 'timestamp','YYYY-MM-DD HH:mm:ss')) {
                        } else {
                            myPlans.push(tmpPlans[i]);
                        }
                    } else {
                        let tmpActivityExistOrNot = 0;
                        tmpPlans[i]['mb'].forEach((value, key) => {
                            if (!value['mab']) {
                                tmpPlans[i]['mb'][key]['ma'] = [];
                            } else {
                                tmpPlans[i]['mb'][key]['ma'] = value['ma'].filter(ndata => {
                                    let validHealthPlan: boolean = ndata['healthplan'] === 0 || (ndata.healthplan_name.toLowerCase() && insurancePlanName.toLowerCase().includes(ndata.healthplan_name.toLowerCase()));
                                    let validGender: boolean = ndata['gender'] === 0 || userGender === ndata['gender'];
                                    let validAge: boolean = ndata['age'] == 0;
                                    let validRange: boolean = false;
                                    switch (ndata.ageoption) {
                                        case 0:
                                            validRange = ndata.age_s_range == bDay;
                                            break;
                                        case 1:
                                            validRange = bDay > ndata.age_s_range;
                                            break;
                                        case 2:
                                            validRange = bDay >= ndata.age_s_range;
                                            break;
                                        case 3:
                                            validRange = bDay < ndata.age_s_range;
                                            break;
                                        case 4:
                                            validRange = bDay <= ndata.age_s_range;
                                            break;
                                        case 5:
                                            validRange = bDay >= ndata.age_s_range && bDay <= ndata.age_e_range;
                                            break;
                                    }
                                    return ndata['maa'] && validHealthPlan && validGender && (validAge || validRange);
                                });
                                if (tmpPlans[i]['mb'][key]['ma'].length > 0) {
                                    tmpActivityExistOrNot = 1;
                                    return true;
                                }
                            }
                        });
                        if(tmpActivityExistOrNot == 1 && ([0, 3].includes(tmpPlans[i]['map']['based_on']) || await this.commonDateService.DateTimeFormat(await this.commonDateService.DateTimeFormat(tmpPlans[i]['map']['enddate'], 'YYYY-MM-DD','YYYY-MM-DD HH:mm:ss'), 'timestamp','YYYY-MM-DD') >= await this.commonDateService.DateTimeFormat(await this.commonDateService.DateTimeFormat(userTimeZone, 'YYYY-MM-DD','YYYY-MM-DD HH:mm:ss'), 'timestamp','YYYY-MM-DD'))) {
                            if (!autoRemovePlan.includes(tmpPlans[i]['id'])) {
                                if (!autoPlan.includes(tmpPlans[i]['id'])) {
                                    let planDisplay: boolean = false;
                                    let displayPlanToHealth: number = 1;
                                    if (tmpPlans[i]['map']['display_plan_to_health'] == 1) {
                                        displayPlanToHealth = 0;
                                        let campaignData: any = await this.frontService.findOne({
                                            organization_id: postData?.org_id,
                                            start_date: LessThanOrEqual(userTimeZone),
                                            end_date: MoreThanOrEqual(userDateTimeZone),
                                            status: '1',
                                            department_ids: In([departmentId, '0']),
                                            location_ids: In([locationId, '0', null]),
                                        },['start_date','end_date'],{id :"DESC"});
                                        if (campaignData) {
                                            let whereCon = ``;
                                            let assessmentWhereCon = ``;
                                            if (tmpPlans[i]['map']['display_plan_to_health_source'] == 1) {
                                                whereCon = ` AND ea.hra_status=100`;
                                                assessmentWhereCon = ` AND ha.hra_status=100`;
                                            }
                                            let emotionalAssessmentData: any = await this.frontService.emotionalAssessmentData(['ea.id'],`ea.user_id IN("${postData?.user_id}") AND DATE_FORMAT(CONVERT_TZ(ea.created,'UTC',CASE WHEN users.timezone != '' THEN users.timezone ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s') BETWEEN '${await this.commonDateService.DateTimeFormat(campaignData.start_date,'YYYY-MM-DD HH:mm:ss')}' AND '${await this.commonDateService.DateTimeFormat(campaignData.end_date,'YYYY-MM-DD HH:mm:ss')}' AND ea.status = '1' ${whereCon}`,null,[{'join_table': 'ea.users','alias':'users', 'table' : tableConstant.TBL_USERS, 'on_condition' : `users.id = ea.user_id`, 'join_type': 'left_one' }],'getMany');
                                            if (emotionalAssessmentData.length) {
                                                displayPlanToHealth = 1;
                                            }
                                            let assessmentData: any = await this.frontService.assessmentsData(['ha.id'],`ha.user_id IN("${postData?.user_id}") AND DATE_FORMAT(CONVERT_TZ(ha.date,'UTC',CASE WHEN users.timezone != '' THEN users.timezone ELSE 'UTC' END),'%Y-%m-%d %H:%i:%s') BETWEEN '${await this.commonDateService.DateTimeFormat(campaignData.start_date,'YYYY-MM-DD HH:mm:ss')}' AND '${await this.commonDateService.DateTimeFormat(campaignData.end_date,'YYYY-MM-DD HH:mm:ss')}' AND ha.status = '1' ${assessmentWhereCon}`,{'ha.date': "DESC"},[{'join_table': 'ha.users','alias':'users', 'table' : tableConstant.TBL_USERS, 'on_condition' : `users.id = ha.user_id`, 'join_type': 'left_one' }],'getMany');
                                            if (assessmentData.length) {
                                                displayPlanToHealth = 1;
                                            }
                                        }
                                    }
                                    if (displayPlanToHealth == 1) {
                                        if (tmpPlans[i]['map']['display_plan_to'] == 0) {
                                            if (tmpPlans[i]['mar'].length > 0) {
                                            let biometricIds = tmpPlans[i]['mar'].map(item => item?.br?.biometric_id).filter(Boolean);
                                            if (!otherDataPass['biometrics'] && [1,2,3,4,5,6,7,8,9,10,11,12,26].some(value => biometricIds.includes(value))) {
                                                otherDataPass['biometrics'] = await this.frontService.biometricsRecord({'bio': `user_id = "${postData?.user_id}" AND (height != "" OR weight != "" OR waist != "" OR alc != "" OR systolic != "" OR diastolic != "" OR total_cholesterol != "" OR hdl != "" OR ldl != "" OR triglycerides != "" OR blood_glucose != "") AND status = '1'`,'hra_bio': `user_id = "${postData?.user_id}" AND (weight != '' OR (height_ft != "" AND height_in != "") OR waist != '' OR alc != '' OR bp_systolic != '' OR bp_diastolic != '' OR total_cholesterol != '' OR hdl != '' OR ldl != '' OR triglycerides != '' OR blood_glucose != '') AND status = '1'`,'ft_bio': `user_id = "${postData?.user_id}" AND (weight != '' OR (height_ft != '' AND height_in != '') OR alc != '' OR systolic != '' OR diastolic != '' OR chol_total != '' OR hdl != '' OR ldl != '' OR triglycerides != '' OR glucose != '') AND status = '1'`},postData,[tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS,tableConstant.TRACKERS.TBL_FT_BIOMETRICS],{created: 'DESC',id: 'DESC'});
                                            }
                                            if (!otherDataPass['hra'] && [13,14,15,16,17].some(value => biometricIds.includes(value))) {
                                                otherDataPass['hra'] = await this.assessmentsService.assessmentListRecord({user_id: postData?.user_id, status: '1'},{'ha.date': "DESC"},["*","DATE_FORMAT(date, '%Y') as years"]);
                                            }
                                            if (!otherDataPass['tobacco'] && biometricIds.includes(19)) {
                                                otherDataPass['tobacco'] = await this.tobaccoUsesService.tobaccoListRecord({user_id: postData?.user_id, status: '1'},["*","DATE_FORMAT(tu.date_completed, '%Y') as years"],{'tu.date_completed': "DESC"});
                                            }
                                            if (!otherDataPass['physician'] && biometricIds.includes(20)) {
                                                let recordDetails = await this.authorizationsService.authorizationListRecord({user_id: postData?.user_id, activity_id: '2', status: '1'},["*","DATE_FORMAT(date_completed, '%Y') as years"],{'a.date_completed': "DESC"});
                                                let resultedData = await this.biometricsService.biometricsListRecord({user_id: postData?.user_id,activity_id: Raw(alias => `FIND_IN_SET('2',${alias}) > 0`), status: '1'},['id','DATE_FORMAT(created, "%Y-%m-%d") as log_date_tmp','DATE_FORMAT(created, "%Y") as years','created' ,'activity_id','user_id','source'],{'log_date_tmp, hb.id': "DESC"});
                                                otherDataPass['physician'] = {Authorization: recordDetails,activity: resultedData}
                                            }
                                            if (!otherDataPass['dental'] && biometricIds.includes(21)) {
                                                otherDataPass['dental'] = await this.authorizationsService.authorizationListRecord({user_id: postData?.user_id, activity_id: '3', status: '1'},["a.id AS id","a.user_id AS user_id","a.signature AS signature","a.type_of_form AS type_of_form","a.date_completed AS date_completed","a.activity_id AS activity_id","DATE_FORMAT(a.date_completed, '%Y') as years"],{'a.date_completed': "DESC"});
                                            }
                                            if (!otherDataPass['optimetric'] && biometricIds.includes(22)) {
                                                otherDataPass['optimetric'] = await this.authorizationsService.authorizationListRecord({user_id: postData?.user_id, activity_id: '5', status: '1'},["a.id AS id","a.user_id AS user_id","a.signature AS signature","a.type_of_form AS type_of_form","a.date_completed AS date_completed","a.activity_id AS activity_id","DATE_FORMAT(a.date_completed, '%Y') as years"],{'a.date_completed': "DESC"});
                                            }
                                            if (!otherDataPass['ohassessment'] && biometricIds.includes(30)) {
                                                otherDataPass['ohassessment'] = await this.assessmentsService.assessmentListRecord({user_id: postData?.user_id, status: '1'},{'ha.date': "DESC"},["*","DATE_FORMAT(date, '%Y') as years"]);
                                            }
                                            if ([25].some(value => biometricIds.includes(value))) {
                                                let moduleID = tmpPlans[i]['mar'].map(item => item?.br?.module_id);
                                                if (!otherDataPass['event'] && moduleID.includes(1)) {
                                                    otherDataPass['event'] = await this.frontService.eventUserBookingListsData(['eub.ev_user_id AS ev_user_id','eub.ev_events_id AS ev_events_id','eub.ev_attend_status AS ev_attend_status','eub.modified AS modified','DATE_FORMAT(eub.modified, "%Y") as years'],{ev_user_id: postData?.user_id, status: '1'}, {'eub.modified': "DESC"},[],'getRawMany');
                                                }
                                                if (!otherDataPass['eha'] && moduleID.includes(2)) {
                                                    otherDataPass['eha'] = await this.frontService.emotionalResultData(String(postData?.user_id),postData?.org_id,'','', req)
                                                }
                                                if (!otherDataPass['agegender'] && moduleID.includes(3)) {
                                                    otherDataPass['agegender'] = await this.biometricsService.biometricsListRecord(`hb.user_id = '${postData?.user_id}' AND hb.status = '1' AND hb.activity_id REGEXP '(^|,)(208|209|210|211|212|213|214|215|216|217|218|219|220|221|222|223|224|225|226|227|228|229|230|1026|1029|1032|6972|6973|6974)(,|$)'`,['id','DATE_FORMAT(created, "%Y-%m-%d") as log_date_tmp','DATE_FORMAT(created, "%Y") as years','created','activity_id','user_id','source'],{'log_date_tmp, hb.id': "DESC"});
                                                }
                                                if (!otherDataPass['challenge'] && moduleID.includes(4)) {
                                                    otherDataPass['challenge'] = await this.scheduleChallengeJoinUsersService.joinUserListRecord({user_id: postData?.user_id,status: '1'},{'scj.added_date': "DESC"},['user_id','schedule_id','added_date','DATE_FORMAT(added_date, "%Y") as years']);
                                                }
                                                if (!otherDataPass['quicklink'] && moduleID.includes(5)) {
                                                    otherDataPass['quicklink'] = await this.quickLinkClicksService.listRecord(["user_id","quicklink_id","created_date","DATE_FORMAT(created_date, '%Y') as years"],{user_id: postData?.user_id,status: '1',quicklink_id: Not(IsNull())}, { 'clicks.created_date': "DESC" });
                                                }
                                                if (!otherDataPass['quiz'] && moduleID.includes(6)) {
                                                    otherDataPass['quiz'] = await this.frontService.qzUserDetailsData(['user_id AS user_id','completed AS completed', 'score AS score', 'quiz_id AS quiz_id','created_date AS created_date','DATE_FORMAT(created_date, "%Y") as years'],{ user_id: postData?.user_id,status: '1' },{id: "DESC"},null,"getRawMany");
                                                }
                                                /*TODO add 7 to 9 module*/
                                            }
                                            let planDisplay = await this.commonHealthService.businessRuleCheck(otherDataPass, tmpPlans[i]['mar'], postData?.user_id,userGender,bDay);
                                            if (planDisplay == true) {
                                                if(tmpPlans[i]['map']['join_based_on']==0){
                                                    userPlans.push(JSON.parse(JSON.stringify(tmpPlans[i])));
                                                    recommendedPlansJoin = true;
                                                    planDisplayArray.push(tmpPlans[i]['id']);
                                                    let tmpJsonStore = tmpPlans[i];
                                                    jsonAutoPlan.push(tmpJsonStore);
                                                }
                                            }
                                            }
                                        } else {
                                            if(tmpPlans[i]['map']['join_based_on']==0){
                                                userPlans.push(tmpPlans[i]);
                                            }
                                            recommendedPlansJoin = true;
                                        }
                                    }
                                } else {
                                    if(tmpPlans[i]['map']['join_based_on']==0){
                                        userPlans.push(tmpPlans[i]);
                                    }
                                    recommendedPlansJoin = true;
                                }
                            }
                        }
                    }
                    if (recommendedPlansJoin && tmpPlans[i]['map']?.['join_based_on']==1) {
                        let checkExist: any = await this.frontService.joinUserPlanExists({plan_id: tmpPlans[i]['id'],user_id: postData?.user_id});
                        if (!checkExist) {
                            let joinPlan = {};
                            joinPlan['user_id'] = postData?.user_id;
                            joinPlan['plan_id'] = tmpPlans[i]['id'];
                            joinPlan['activity_id'] = tmpPlans[i]['map']['activity_id'];
                            let saveJoinUser: any = await this.myPlanJoinUserPlanService.save({...joinPlan});
                            if (saveJoinUser) {
                                tmpPlans[i].jup = tmpPlans[i].jup || {}
                                tmpPlans[i].jup = saveJoinUser
                                tmpPlans[i] = await this.commonDateService.basedOnPlanDate(tmpPlans[i],insurancePlanName,userGender,bDay);
                                if (tmpPlans[i]['end_date'] && await this.commonDateService.DateTimeFormat(userTimeZone, 'timestamp','YYYY-MM-DD HH:mm:ss') > await this.commonDateService.DateTimeFormat(tmpPlans[i]['end_date'], 'timestamp','YYYY-MM-DD HH:mm:ss')) {
                                } else {
                                    myPlans.push(tmpPlans[i]);
                                }
                            }
                        }
                    }
                }
            }
            if (myPlans.length > 0) {
                myPlans = myPlans.sort((a, b) => a.name > b.name ? 1 : -1);
                if(postData?.plan_order==0){
                    myPlans = myPlans.sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());
                } else {
                    myPlans = myPlans.sort((a, b) => b.jup.progress - a.jup.progress);
                }
            }
            let planActivityDefine: any = await this.frontService.campaignActivityData(["ca.activity_id AS activity_id","CEILING(ca.max_point/ca.point_for_each) AS linkdata"],`activity.category_id IN('66','67') AND ca.status = '1' AND campaign.organization_id = '${postData?.org_id}' AND DATE_FORMAT(campaign.end_date, '%Y-%m-%d') >= '${userDateTimeZone}' AND campaign.start_date <= '${userTimeZone}' AND campaign.status = '1' AND (FIND_IN_SET(${departmentId}, department_ids) OR department_ids = '0') AND (FIND_IN_SET(${locationId}, location_ids) OR location_ids = '0' OR location_ids IS NULL)`, null,[{'join_table': 'ca.activity','alias':'activity', 'table' : tableConstant.ACTIVITIES.TBL_ACTIVITIES, 'on_condition' : `activity.id = ca.activity_id AND activity.status != '2'`, 'join_type': 'left_one' },{'join_table': 'ca.campaign','alias':'campaign', 'table' : tableConstant.CAMPAIGN.TBL_CAMPAIGN, 'on_condition' : `campaign.id = ca.campaign_id AND campaign.status = 1`, 'join_type': 'left_one' }],'getRawMany');
            let incentiveCompare: any = {},comMsgShowHide = 'no';
            let myPlansCommon: any = myPlans;
            if (myPlansCommon) {
                let myPlansCommonActivity: any = {};
                for (let i = 0; i < myPlansCommon.length; i++) {
                    let value = myPlansCommon[i];
                    if (value.jup && value.jup.is_complete === 1) {
                        if (!incentiveCompare[value.map.activity_id]) {
                            incentiveCompare[value.map.activity_id] = value.jup.is_complete;
                        } else {
                            incentiveCompare[value.map.activity_id] += value.jup.is_complete;
                        }
                    }
                    if ('map' in value) {
                        let activityId = value.map.activity_id;
                        myPlansCommonActivity[activityId] = activityId;
                    }
                }
                myPlansCommonActivity[7780] = 7780;
                if (planActivityDefine) {
                    planActivityDefine = planActivityDefine.filter(
                        item => myPlansCommonActivity[item.activity_id] !== undefined
                    );
                }
                let checkExist: any = await this.frontService.joinUserPlanExists({user_id: postData?.user_id,is_complete: '1'});
                if (!checkExist) {
                    appendPlanActivityDefine['label'] = planLabelData['incomplete'];
                } else {
                    appendPlanActivityDefine['label'] = planLabelData['optional'];
                }
                    if (planActivityDefine?.some(act => act.activity_id == 7780)) {
                        const activityResult = planActivityDefine.find(item => item.activity_id === 7780);
                        if (activityResult?.linkdata <= Object.keys(incentiveCompare).length) {
                            planActivityDefine = planActivityDefine.filter(act => act.activity_id != 7780);
                            comMsgShowHide = 'yes';
                            if (Object.keys(planActivityDefine).length > 0) {
                                comMsgShowHide = 'no';
                                const unmatched = planActivityDefine.filter(
                                    act => !incentiveCompare.hasOwnProperty(act.activity_id)
                                );
                                if (unmatched.length === 0) {
                                    comMsgShowHide = 'yes';
                                }
                            }
                        }
                    } else if (Object.keys(planActivityDefine)?.length > 0 && planActivityDefine.every(act => incentiveCompare.hasOwnProperty(act.activity_id))) {
                        comMsgShowHide = 'yes';
                    }
            }
            if (jsonAutoPlan.length > 0) {
                let jsonAutoPlanTmp = {user_id: postData?.user_id};
                if (!assignUserPlan) {
                    jsonAutoPlanTmp['plan_detail'] = JSON.stringify(jsonAutoPlan);
                    jsonAutoPlanTmp['plan_id'] = JSON.stringify(planDisplayArray);
                    await this.myPlanAssignUserPlanService.save({...jsonAutoPlanTmp});
                } else {
                    jsonAutoPlanTmp['plan_detail'] = JSON.stringify([...(JSON.parse(assignUserPlan['plan_detail'] || '[]')), ...jsonAutoPlan]);
                    jsonAutoPlanTmp['plan_id'] = JSON.stringify([...JSON.parse(assignUserPlan['plan_id'] || '[]'), ...planDisplayArray]);
                    await this.myPlanAssignUserPlanService.update({id: assignUserPlan['id']},{...jsonAutoPlanTmp});
                }
            }
            if (userPlans.length > 0) {
                userPlans = userPlans.sort((a, b) => a.name > b.name ? 1 : -1);
            }
            if (postData?.request_type != '1') {
                userPlans = [...myPlans, ...userPlans];
            } else {
                userPlans = myPlans;
                if (!userPlans?.length) {
                    /* If there are no join plans available, a notification stating "join plan not available" will appear on the front side. */
                    myPlansFlag = 1
                }
            }
            /* date format change start */
            for (let i: number = 0; i < userPlans.length; i++) {
                if (userPlans[i]['start_date']) {
                    userPlans[i]['start_date'] = await this.commonDateService.DateTimeFormat(userPlans[i]['start_date'], 'MMMM D, YYYY', 'YYYY-MM-DD HH:mm:ss');
                }
                if (userPlans[i]['end_date']) {
                    userPlans[i]['end_date'] = await this.commonDateService.DateTimeFormat(userPlans[i]['end_date'], 'MMMM D, YYYY', 'YYYY-MM-DD HH:mm:ss');
                }
                if (userPlans[i]['mb']) {
                    for (let j: number = 0; j < userPlans[i]['mb'].length; j++) {
                        if (userPlans[i]['mb'][j]['ma']) {
                            for (let k: number = 0; k < userPlans[i]['mb'][j]['ma'].length; k++) {
                                if (userPlans[i]['mb'][j]['ma'][k]) {
                                    if (userPlans[i]['mb'][j]['ma']?.[k]?.['maa']?.['startdate']) {
                                        userPlans[i]['mb'][j]['ma'][k]['maa']['startdate'] = await this.commonDateService.DateTimeFormat(userPlans[i]['mb'][j]['ma'][k]['maa']['startdate'], 'MMMM D, YYYY', 'YYYY-MM-DD HH:mm:ss')
                                    }
                                    if (userPlans[i]['mb'][j]['ma']?.[k]?.['maa']?.['enddate']) {
                                        userPlans[i]['mb'][j]['ma'][k]['maa']['enddate'] = await this.commonDateService.DateTimeFormat(userPlans[i]['mb'][j]['ma'][k]['maa']['enddate'], 'MMMM D, YYYY', 'YYYY-MM-DD HH:mm:ss');
                                    }
                                }
                            }
                        }
                    }
                }
            }
            /* date format change end */
            let userPlansFunction = async (value) => {
                value.PlanTotalActivity = value.PlanCompleteActivity = value.PlanTotalBlock = value.PlanCompleteBlock = value.TotalActivityper = 0;
                if (value.mb) {
                    let interLinksData: any = await this.interlinksService.listRecord({status: '1'},null,['id','linktitle','plugin','controller','action','newlink']);
                    let tempLinks = {};
                    for (let i = 0; i < interLinksData.length; i++) {
                        let item = interLinksData[i];
                        tempLinks[item.id] = item;
                    }
                    let linkSSOArray = {};
                    value = await this.commonHealthService.commonDataCalling(value, activityData, activePlugin, defaultDesc, postData?.user_id, postData?.org_id, linkSSOArray);
                    let orgDetails = await this.companyService.companyFindOne({id: postData?.org_id,status: '1'},['code']);
                    let membershipCode = orgDetails?.code;
                    let commonActivity = async (orgId,membershipCode,activePlugin,userId,myPlan,defaultDesc) => {
                        let categoryIds: Record<number, number> = {},orgSpeIds: any = {},eventIds: any = [],quizIds: any = [],quickLinkIds: any = [],postIds: any = [],fPostIds: any = [],orgSpeCatIds: any = {},eventsListIdWise: any = {},eventsListActivityWise = {},eventsCategoryListIdWise = {},quickLinkListActivityWise = {},quickLinkListIdWise = {},qzQuizListActivityWise = {},qzQuizListIdWise = {},hraAssessmentData: any = [],bioMetricDataAssessment: any = [],emotionalWellBeingPost: any = [],scheduleChallengeIdWise: any = {},emotionalResultDataEha: any = {};
                        let activitiesSd = await this.commonDateService.DateTimeFormat(myPlan['start_date'],"YYYY-MM-DD","MMMM D, YYYY");
                        let activitiesEd = await this.commonDateService.DateTimeFormat(myPlan['end_date'],"YYYY-MM-DD","MMMM D, YYYY");
                        if (myPlan['mb'].length > 0) {
                            myPlan['mb'].forEach(item => {
                                if (item['ma']) {
                                    item['ma'].forEach(activity => {
                                        if(activity.ac) {
                                            categoryIds[Number(activity.ac.id)] = Number(activity.ac.category_id);
                                            if(activity.ac.category_id === 21) {
                                                eventIds.push(activity.ac.id);
                                            }
                                            if(activity.ac.category_id === 36) {
                                                quizIds.push(activity.ac.id);
                                            }
                                            if(activity.ac.category_id === 43) {
                                                quickLinkIds.push(activity.ac.id);
                                            }
                                        }
                                        if(activity['is_category'] === 0) {
                                            if(!orgSpeIds[activity['module_id']]) {
                                                orgSpeIds[activity['module_id']] = [];
                                            }
                                            orgSpeIds[activity['module_id']] = [...orgSpeIds[activity['module_id']],...(activity['org_activity_id'] ? activity['org_activity_id'].split(',') : [])];
                                        }
                                        if(activity['is_category'] === 1) {
                                            if(!orgSpeCatIds[activity['module_id']]) {
                                                orgSpeCatIds[activity['module_id']] = [];
                                            }
                                            orgSpeCatIds[activity['module_id']] = [...orgSpeCatIds[activity['module_id']],...(activity['org_activity_id'] ? activity['org_activity_id'].split(',') : [])];
                                        }
                                        if(activity.post_id) {
                                            postIds.push(Number(activity.post_id));
                                        }
                                        if(activity.module_id === 9 && activity.org_activity_id) {
                                            postIds.push(Number(activity.org_activity_id));
                                        }
                                        if(activity.fpost_id) {
                                            fPostIds.push(activity.fpost_id);
                                        }
                                    });
                                }
                            });
                            if (orgSpeIds[1] !== undefined || eventIds.length > 0) {
                                let evCondition = "status = '1' AND ";
                                if(orgSpeIds[1] !== undefined && eventIds.length > 0){
                                    evCondition += `(activity_id IN(${eventIds.join(',')}) OR id IN("${orgSpeIds[1].join('","')}"))`;
                                } else if(orgSpeIds[1] !== undefined ){
                                    evCondition += `id IN('${orgSpeIds[1].join("','")}')`;
                                } else{
                                    evCondition += `activity_id IN(${eventIds.join(',')})`;
                                }
                                let eventData = await this.eventService.eventsListRecord(["event.id AS id","event.organization_id AS organization_id","event.created_by_user_id AS created_by_user_id","event.event_name AS event_name","event.activity_id AS activity_id","event.event_type AS event_type","event.external_link AS external_link","event.category_id AS category_id"],evCondition, { "event.id": "DESC" });
                                await Promise.all(eventData.map(async (ele)=>{
                                    if(ele.event_name){
                                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`event_name_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['organization_id']}/${ele['id']}`,`dynamic`);
                                        ele.event_name = (customeName == '' || customeName == `event_name_${ele['id']}`) ? ele['event_name'] : customeName;
                                    }
                                }));
                                if (eventData.length > 0)  {
                                    for (let i = 0; i < eventData.length; i++) {
                                        const event = eventData[i];
                                        const activityId = event.activity_id;
                                        categoryIds[Number(activityId)] = 21;
                                        eventsListActivityWise[activityId] = event;
                                        eventsListIdWise[event.id] = event;
                                    }
                                }
                            }
                            if (orgSpeCatIds[1]) {
                                let evcCondition = `e_category.id IN (${orgSpeCatIds[1].join(',')}) AND e_category.status = '1'`;
                                evcCondition = evcCondition.replace(/EVC/g, '');
                                let categoryData = await this.eventCategoryService.listRecord(["e_category.id","e_category.category_name"],evcCondition);
                                if(categoryData && categoryData.length){
                                    await Promise.all(categoryData.map(async (ele)=>{
                                        if(ele.category_name){
                                            let customeName = await this.translatorService.frontendReadTranslation(req.lang,`category_name_${ele['id']}`, `/LC_MESSAGES/Events/Category/${ele['c_companies_id']}/${ele['id']}`,`dynamic`);
                                            ele.category_name = (customeName == '' || customeName == `category_name_${ele['id']}`) ? ele['category_name'] : customeName;
                                        }
                                    }));
                                }
                                for (let i = 0; i < categoryData.length; i++) {
                                    const event = categoryData[i];
                                    eventsCategoryListIdWise[event.id] = event;
                                }
                            }
                            if (orgSpeIds[2]) {
                                emotionalResultDataEha = await this.frontService.emotionalResultData(String(postData?.user_id),postData?.org_id,'Yes','',req)
                            }
                            if (orgSpeIds[3]) {
                                let keys = Object.keys(orgSpeIds[3]);
                                let concatCategoryIds: Record<number, number> = {};
                                for (let i = 0; i < keys.length; i++) {
                                    concatCategoryIds[Number(orgSpeIds[3][keys[i]])] = 20;
                                }
                                categoryIds = {...categoryIds, ...concatCategoryIds};
                            }
                            if (orgSpeIds[4]) {
                                let scheduleChallenge = await this.scheduleChallengeService.findChallenge({id: In(orgSpeIds[4]),status: '1'},["id","custom_cname"]);
                                if (scheduleChallenge) {
                                    let concatCategoryIds: Record<number, number> = {};
                                    for (let i = 0; i < scheduleChallenge.length; i++) {
                                        const challengeData = scheduleChallenge[i];
                                        scheduleChallengeIdWise[challengeData.id] = challengeData;
                                        concatCategoryIds[Number(scheduleChallenge[i]['id'])] = 8;
                                    }
                                    categoryIds = {...categoryIds, ...concatCategoryIds};
                                }
                            }
                            if (orgSpeIds[5] || quickLinkIds.length > 0) {
                                let quCondition = `ql.status = 1 AND `;
                                if(quickLinkIds[5] && quickLinkIds.length > 0) {
                                    quCondition += `(ql.activity_id IN(${quickLinkIds.join(',')}) OR ql.id IN(${orgSpeIds[5].join(',')}))`;
                                } else if (orgSpeIds[5] !== undefined) {
                                    quCondition += `ql.id IN(${orgSpeIds[5].join(',')})`;
                                } else {
                                    quCondition += `ql.activity_id IN(${quickLinkIds.join(',')})`;
                                }
                                /* TODO optimize code only use single table u_quicklink*/
                                let quickLinkData = await this.quickLinkService.listRecord(["ql.id","ql.title","ql.activity_id","ql.c_companies_id"],quCondition);
                                if(quickLinkData && quickLinkData.length){
                                    await Promise.all(quickLinkData.map(async (ele)=>{
                                        if(ele.title){
                                            let customeName = await this.translatorService.frontendReadTranslation(req.lang,`title_${ele['id']}`, `/LC_MESSAGES/QuickLink/QuickLink/${ele['c_companies_id']}`,`dynamic`);
                                            ele.title = (customeName == '' || customeName == `title_${ele['id']}`) ? ele['title'] : customeName;
                                        }
                                    }));
                                }
                                if (quickLinkData) {
                                    let concatCategoryIds: Record<number, number> = {};
                                    for (let i:number = 0; i < quickLinkData.length; i++) {
                                        let item = quickLinkData[i];
                                        let key = item.activity_id;
                                        concatCategoryIds[Number(key)] = 43;
                                        quickLinkListActivityWise[key] = item;
                                        quickLinkListIdWise[item.id] = item;
                                    }
                                    categoryIds = { ...categoryIds, ...concatCategoryIds };
                                }
                            }
                            if (orgSpeIds[6] || quizIds.length > 0) {
                                let quCondition = `qz.status = 1 AND aqo.organization_id = "${membershipCode}" AND `;
                                if (orgSpeIds[6] && quizIds.length !== 0) {
                                    quCondition += `(aqo.activity_id IN(${quizIds.join(",")}) OR qz.id IN(${orgSpeIds[6].join(",")}))`;
                                } else if (orgSpeIds[6]) {
                                    quCondition += `qz.id IN(${orgSpeIds[6].join(",")})`;
                                } else {
                                    quCondition += `aqo.activity_id IN(${quizIds.join(",")})`;
                                }
                                let qzQuiz = await this.quizQuizzesService.listRecord(['qz.id','qz.quiz_name','aqo.activity_id'],quCondition, { id: "DESC" },[tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG]);
                                if (qzQuiz) {
                                    let concatCategoryIds: Record<number, number> = {};
                                    for (let i = 0; i < qzQuiz.length; i++) {
                                        let item = qzQuiz[i];
                                        concatCategoryIds[Number(item?.aqo?.activity_id)] = 36;
                                        qzQuizListActivityWise[item?.aqo?.activity_id] = item;
                                        qzQuizListIdWise[item.id] = item;
                                    }
                                    categoryIds = { ...categoryIds, ...concatCategoryIds };
                                }
                            }
                            if (orgSpeIds[7]) {
                                hraAssessmentData = await this.assessmentsService.assessmentListRecord({user_id: postData?.user_id, date: Between(activitiesSd, activitiesEd), status: '1'},{'ha.date': "ASC"});
                            }
                            if (orgSpeIds[8]) {
                                bioMetricDataAssessment = await this.frontService.biometricsRecord({'bio': `user_id = "${postData?.user_id}" AND created BETWEEN "${activitiesSd}" AND "${activitiesEd}" AND (height != "" OR weight != "" OR waist != "" OR alc != "" OR systolic != "" OR diastolic != "" OR total_cholesterol != "" OR hdl != "" OR ldl != "" OR triglycerides != "" OR blood_glucose != "") AND status = '1'`,'hra_bio': `user_id = "${postData?.user_id}" AND date BETWEEN "${activitiesSd}" AND "${activitiesEd}" AND (weight != '' OR (height_ft != "" AND height_in != "") OR waist != '' OR alc != '' OR bp_systolic != '' OR bp_diastolic != '' OR total_cholesterol != '' OR hdl != '' OR ldl != '' OR triglycerides != '' OR blood_glucose != '') AND status = '1'`,'ft_bio': `user_id = "${postData?.user_id}" AND added_date BETWEEN "${activitiesSd}" AND "${activitiesEd}" AND (weight != '' OR (height_ft != '' AND height_in != '') OR alc != '' OR systolic != '' OR diastolic != '' OR chol_total != '' OR hdl != '' OR ldl != '' OR triglycerides != '' OR glucose != '') AND status = '1'`},postData,[tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS,tableConstant.TRACKERS.TBL_FT_BIOMETRICS],{created: 'DESC'});
                            }
                            /*TODO add 9 module condition */

                            let activitiesIds: any = Object.keys(categoryIds).map(Number).filter(Number.isInteger);
                            let allActivityData: any = {};
                            if (activePlugin.includes('Healthcheckup')) {
                                let trBiometricsActivityArray = [2, 14, 20, 80, 126, 127, 128, 129, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 1026, 1029, 1032];
                                if (trBiometricsActivityArray.filter(val => activitiesIds.includes(val)).length > 0) {
                                    let bioData: any = await this.biometricsService.biometricsListRecord({user_id: postData?.user_id, created: Between(activitiesSd, activitiesEd), status: '1',activity_id: Raw(() => `(${activitiesIds.map(id => `FIND_IN_SET('${id}', hb.activity_id) > 0`).join(' OR ')})`)}, ['id','DATE_FORMAT(created, "%Y-%m-%d %H:%i:%s") as log_date_tmp','activity_id'], {"hb.created,hb.id": "ASC"});
                                    if (bioData.length > 0) {
                                        let TrBiometricsActivityDone = {};
                                        for (let i = 0; i < bioData.length; i++) {
                                            let activityIds = bioData[i].activity_id.split(",").filter(Boolean);
                                            for (let j = 0; j < activityIds.length; j++) {
                                                TrBiometricsActivityDone[activityIds[j]] = {...bioData[i]};
                                            }
                                        }
                                        allActivityData['TrBiometrics'] = TrBiometricsActivityDone;
                                    }
                                }
                                if ([40, 49].filter(val => activitiesIds.includes(val)).length > 0) {
                                    let activityData = await this.dentistsService.listRecord({userid: postData?.user_id,activity_id: In(activitiesIds), date_completed: Between(activitiesSd, activitiesEd), status: '1'},['d.id','d.activity_id','d.date_completed'],{"d.date_completed,d.id": "ASC"},1);
                                    if (activityData.length > 0 ) {
                                        let activityDataObj = {};
                                        for(let i = 0; i < activityData.length; i++){
                                            activityData[i]['log_date_tmp'] = activityData[i]['date_completed'];
                                            const activityId = activityData[i]['activity_id'];
                                            if(!activityDataObj[activityId]) {
                                                activityDataObj[activityId] = [];
                                            }
                                            activityDataObj[activityId].push(activityData[i]);
                                        }
                                        allActivityData = {...allActivityData, ...activityDataObj};
                                    }
                                }
                                if ([5, 41, 50].filter(val => activitiesIds.includes(val)).length > 0) {
                                    let optometristsData = await this.optometristsService.listRecord({userid: postData?.user_id,activity_id: In(activitiesIds), date_completed: Between(activitiesSd, activitiesEd), status: '1'},['o.id','o.date_completed','o.activity_id'],{"o.date_completed,o.id": "ASC"},1);
                                    let optometristsDataObj = {};
                                    for(let i = 0; i < optometristsData.length; i++){
                                        optometristsData[i]['log_date_tmp'] = optometristsData[i]['date_completed'];
                                        const activityId = optometristsData[i]['activity_id'];
                                        if(!optometristsDataObj[activityId]) {
                                            optometristsDataObj[activityId] = [];
                                        }
                                        optometristsDataObj[activityId].push(optometristsData[i]);
                                    }
                                    allActivityData = {...allActivityData, ...optometristsDataObj};
                                }
                                if ([4, 12, 13, 14, 20].filter(val => activitiesIds.includes(val)).length > 0) {
                                    let tobaccoData = await this.frontService.tobaccoUsesListRecord({user_id: postData?.user_id,activity_id: In([...activitiesIds,...[4,12,13,14]]), date_completed: Between(activitiesSd, activitiesEd), status: '1'},['id','date_completed','activity_id'],{"date_completed": "ASC","id": "ASC"});
                                    let tobaccoDataObj = {};
                                    for(let i = 0; i < tobaccoData.length; i++){
                                        tobaccoData[i]['log_date_tmp'] = tobaccoData[i]['date_completed'];
                                        const activityId = tobaccoData[i]['activity_id'];
                                        if(!tobaccoDataObj[activityId]) {
                                            tobaccoDataObj[activityId] = [];
                                        }
                                        tobaccoDataObj[activityId].push(tobaccoData[i]);
                                    }
                                    allActivityData = {...allActivityData, ...tobaccoDataObj};
                                }
                                if ([2, 3, 5].filter(val => activitiesIds.includes(val)).length > 0) {
                                    let authData = await this.authorizationsService.authorizationListRecord({user_id: postData?.user_id,activity_id: In(activitiesIds), date_completed: Between(activitiesSd, activitiesEd),status: '1'},['id','date_completed','activity_id'],{"a.date_completed,a.id": "ASC"});
                                    let authDataObj = {};
                                    for(let i = 0; i < authData.length; i++){
                                        authData[i]['log_date_tmp'] = authData[i]['date_completed'];
                                        const activityId = authData[i]['activity_id'];
                                        if(!authDataObj[activityId]) {
                                            authDataObj[activityId] = [];
                                        }
                                        authDataObj[activityId].push(authData[i]);
                                    }
                                    allActivityData['Authorizations'] = authDataObj;
                                }
                            }
                            if (activePlugin.includes('Hra') && [1, 58].filter(val => activitiesIds.includes(val)).length > 0) {
                                let assessmentsData = await this.assessmentsService.assessmentListRecord({user_id: postData?.user_id,activity_id: In(activitiesIds), date: Between(activitiesSd, activitiesEd), status: '1'},{"ha.date,ha.id": "ASC"},['ha.id AS id','DATE_FORMAT(ha.date, "%Y-%m-%d %H:%i:%s") as log_date_tmp','ha.activity_id AS activity_id']);
                                let assessmentsDataObj = {};
                                for(let i = 0; i < assessmentsData.length; i++){
                                    const activityId = assessmentsData[i]['activity_id'];
                                    if(!assessmentsDataObj[activityId]) {
                                        assessmentsDataObj[activityId] = [];
                                    }
                                    assessmentsDataObj[activityId].push(assessmentsData[i]);
                                }
                                allActivityData = Object.assign({}, allActivityData || {}, assessmentsDataObj || {});
                            }
                            if (activePlugin.includes('Activitytracker') && activitiesIds.length > 0) {
                                let formData = await this.submitFormsService.listRecord(['sf.id','sf.activity_date','sf.activity_id'],{status: '1',user_id: postData?.user_id,activity_id: In(activitiesIds), activity_date: Between(activitiesSd, activitiesEd)},{"sf.activity_date,sf.id": "ASC"},[tableConstant.ACTIVITIES.TBL_ACTIVITIES]);
                                let formDataObj = {};
                                for(let i = 0; i < formData.length; i++){
                                    formData[i]['log_date_tmp'] = formData[i]['activity_date'];
                                    const activityId = formData[i]['activity_id'];
                                    if(!formDataObj[activityId]) {
                                        formDataObj[activityId] = [];
                                    }
                                    formDataObj[activityId].push(formData[i]);
                                }
                                allActivityData = {...allActivityData, ...formDataObj};
                            }
                            /* ec_complete_plans table not use*/
                            if (activitiesIds.includes(890)) {
                                let loginData = await this.userLoginService.userLoginlistRecord({user_id: postData?.user_id,login_time: Between(activitiesSd, activitiesEd), status: '1'},{"userLogin.login_time,userLogin.id":"ASC"},['userLogin.id AS id','DATE_FORMAT(userLogin.login_time, "%Y-%m-%d %H:%i:%s") as log_date_tmp']);
                                allActivityData = {...allActivityData, 890: loginData};
                            }
                            if (activePlugin.includes('Quicklink') && Object.values(categoryIds).includes(43)) {
                                let quickLinkData = await this.quickLinkClicksService.listRecord(['id','created_date','activity_id'],{user_id: postData?.user_id,activity_id: In(activitiesIds), created_date: Between(activitiesSd, activitiesEd), status: '1'}, { "created_date,clicks.id": "ASC" });
                                let quickLinkDataObj = {};
                                for(let i = 0; i < quickLinkData.length; i++){
                                    const activityId = quickLinkData[i]['activity_id'];
                                    if(!quickLinkDataObj[activityId]) {
                                        quickLinkDataObj[activityId] = [];
                                    }
                                    quickLinkData[i]['log_date_tmp'] = quickLinkData[i]['created_date'];
                                    quickLinkDataObj[activityId].push(quickLinkData[i]);
                                }
                                allActivityData = {...allActivityData, ...quickLinkDataObj};
                            }
                            if (activePlugin.includes('Events') && Object.values(categoryIds).includes(21)) {
                                let eventData = await this.frontService.eventUserBookingListsData(['eub.id AS id','DATE_FORMAT(eub.modified, "%Y-%m-%d %H:%i:%s") as log_date_tmp','eub.activity_id AS activity_id','eub.ev_attend_status AS ev_attend_status'],{ev_user_id: postData?.user_id,activity_id: In(activitiesIds), modified: Between(activitiesSd, activitiesEd)}, {"eub.modified,eub.id": "ASC"},[],'getRawMany');
                                let eventDataObj = {};
                                for (let i = 0; i < eventData.length; i++) {
                                    const value = eventData[i];
                                    const groupKey = value.activity_id;
                                    if (!eventDataObj[groupKey]) {
                                        eventDataObj[groupKey] = []
                                    }
                                    eventDataObj[groupKey].push(value);
                                }
                                allActivityData['Events'] = eventDataObj;
                            }
                            if (activePlugin.includes('Events') && orgSpeCatIds?.[1]?.length > 0) {
                                let orgSpeCatId = orgSpeCatIds[1].map(id => id.replace(/EVC/g, '')).join(',');
                                let eventData1 = await this.eventService.eventsListRecord(["CONCAT('I-', ubl.id) AS id", "DATE_FORMAT(ubl.modified, '%Y-%m-%d') AS log_date_tmp", "ubl.ev_attend_status", "ubl.activity_id", "event.category_id"],`ubl.ev_user_id = '${postData?.user_id}' AND ubl.modified BETWEEN "${activitiesSd}" AND "${activitiesEd}" AND category_id IN (${orgSpeCatId}) AND ubl.status = '1'`, { "event.id": "DESC" },[tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS]);
                                let eventData2 = await this.eventService.eventsListRecord(["CONCAT('E-', elu.id) AS id", "DATE_FORMAT(elu.created, '%Y-%m-%d') AS log_date_tmp", "'1' AS ev_attend_status", "event.activity_id", "event.category_id"],`elu.user_id = '${postData?.user_id}' AND elu.created BETWEEN "${activitiesSd}" AND "${activitiesEd}" AND category_id IN (${orgSpeCatId}) AND elu.status = '1'`, { "event.id": "DESC" },[tableConstant.EVENTS.TBL_EV_EXTERNAL_LINK_USER]);
                                let activityDone = [...(eventData1 || []), ...(eventData2 || [])];
                                let activityDataObj = {};
                                for (let i = 0; i < activityDone.length; i++) {
                                    const value = activityDone[i];
                                    const groupKey = value.category_id;
                                    if (!activityDataObj[groupKey]) {
                                        activityDataObj[groupKey] = []
                                    }
                                    activityDataObj[groupKey].push(value);
                                }
                                allActivityData['Events_category'] = activityDataObj;
                            }
                            if (activePlugin.includes('Quiz') && Object.values(categoryIds).includes(36)) {
                                const quizUserDetailsData = await this.userDetailsService.listRecord(['id AS id','DATE_FORMAT(created_date, "%Y-%m-%d %H:%i:%s") as log_date_tmp','activity_id AS activity_id','score AS score','completed AS completed'],{user_id: postData?.user_id,activity_id: In(activitiesIds), created_date: Between(activitiesSd, activitiesEd), status: '1'}, {"ud.created_date,ud.id": "ASC"});
                                let quizDataObj = {};
                                for(let i = 0; i < quizUserDetailsData.length; i++){
                                    const value = quizUserDetailsData[i];
                                    const groupKey = value.activity_id;
                                    if (!quizDataObj[groupKey]) {
                                        quizDataObj[groupKey] = []
                                    }
                                    quizDataObj[groupKey].push(value);
                                }
                                allActivityData['Quiz'] = quizDataObj;
                            }
                            if (activitiesIds.includes(5905) || postIds.length > 0) {
                                if (postIds.length > 0) {
                                    emotionalWellBeingPost = await this.frontService.emPostListRecord({id: In(postIds),status: '1'},['id','title','display_area','cat_id','org_id']);
                                    if (emotionalWellBeingPost) {
                                        if(emotionalWellBeingPost && emotionalWellBeingPost.length){
                                            await Promise.all(emotionalWellBeingPost.map(async (ele)=>{
                                                if(ele.title){
                                                    let customeName = await this.translatorService.frontendReadTranslation(req.lang,`post_title_${ele['cat_id']}_${ele['id']}_${ele['org_id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${ele['org_id']}/${ele['cat_id']}`,`dynamic`);
                                                    ele.title = (customeName == '' || customeName == `post_title_${ele['cat_id']}_${ele['id']}_${ele['org_id']}`) ? ele['title'] : customeName;
                                                }
                                            }));
                                        }
                                        let accumulator = {};
                                        for (let i = 0; i < emotionalWellBeingPost.length; i++) {
                                            let item = emotionalWellBeingPost[i];
                                            accumulator[item['id']] = item;
                                        }
                                        emotionalWellBeingPost = accumulator;
                                    }
                                    let emPostClickData = await this.wellbeingPostClickService.listRecord({user_id: postData?.user_id,post_id: In(postIds), created_date: Between(activitiesSd, activitiesEd), status: '1'},{"wellbeing.created_date,wellbeing.id":"ASC"},['wellbeing.id','wellbeing.post_id','wellbeing.created_date']);
                                    let emPostClickDataTemp = Object.create(null);
                                    let clickDataMap = {};
                                    for (let i = 0; i < emPostClickData.length; i++) {
                                        emPostClickData[i]['log_date_tmp'] = emPostClickData[i]['created_date'];
                                        const item = emPostClickData[i];
                                        const postId = item['post_id'];
                                        if (!clickDataMap[postId]) {
                                            clickDataMap[postId] = [];
                                        }
                                        clickDataMap[postId].push(item);
                                    }
                                    emPostClickDataTemp[5905] = clickDataMap;
                                    allActivityData = { ...allActivityData, ...emPostClickDataTemp };
                                }
                            }
                            if (activitiesIds.includes(4887) || fPostIds.length > 0) {
                                let fodVideoClickDataTemp = Object.create(null);
                                if (fPostIds.length > 0) {
                                    let fodVideoClickData = await this.fitnessVideoClickService.listRecord({user_id: postData?.user_id,v_id: In(fPostIds), created: Between(activitiesSd, activitiesEd), status: '1'},{"fitness.created,fitness.id":"ASC"},['id','v_id','DATE_FORMAT(created, "%Y-%m-%d %H:%i:%s") as log_date_tmp']);
                                    let fodVideoClickDataTemp = Object.create(null);
                                    let clickDataMap = {};
                                    for (let i = 0; i < fodVideoClickData.length; i++) {
                                        const item = fodVideoClickData[i];
                                        const postId = item['v_id'];
                                        if (!clickDataMap[postId]) {
                                            clickDataMap[postId] = [];
                                        }
                                        clickDataMap[postId].push(item);
                                    }
                                    fodVideoClickDataTemp[4887] = clickDataMap;
                                    allActivityData = { ...allActivityData, ...fodVideoClickDataTemp };
                                }
                                let fodVideoClickData = await this.fitnessVideoClickService.listRecord({user_id: postData?.user_id, created: Between(activitiesSd, activitiesEd), status: '1'},{"fitness.created,fitness.id":"ASC"},['id','v_id','DATE_FORMAT(created, "%Y-%m-%d %H:%i:%s") as log_date_tmp']);
                                fodVideoClickDataTemp['A-4887'] = fodVideoClickData
                                allActivityData = {...allActivityData, ...fodVideoClickDataTemp};
                            }
                            if (activePlugin.includes('Challenge') && Object.values(categoryIds).includes(8)) {
                                let joinUserData = await this.scheduleChallengeJoinUsersService.joinUserListRecord({user_id: postData?.user_id, added_date: Between(activitiesSd, activitiesEd), status: '1'},{"scj.added_date,scj.id": "ASC"},['id','schedule_id','added_date']);
                                let joinUserDataObj = {};
                                for(let i = 0; i < joinUserData.length; i++){
                                    joinUserData[i]['log_date_tmp'] = joinUserData[i]['added_date'];
                                    const scheduleId = joinUserData[i]['schedule_id'];
                                    if(!joinUserDataObj[scheduleId]) {
                                        joinUserDataObj[scheduleId] = [];
                                    }
                                    joinUserDataObj[scheduleId].push(joinUserData[i]);
                                }
                                allActivityData['Challenge'] = joinUserDataObj;
                            }
                            if (activePlugin.includes('Trackers')) {
                                if ([7, 9, 11, 15, 16, 17, 18, 24].filter(val => activitiesIds.includes(val)).length > 0) {
                                    let activityFeedData;
                                    if ([11, 15].filter(val => activitiesIds.includes(val)).length > 0) {
                                        activityFeedData = await this.activityFeedsService.getUserActivityData({user_id: postData?.user_id,activityTypeId: In([...activitiesIds,...[11,15]]), collectionDate: Between(activitiesSd, activitiesEd), status: '1'}, ['acId','logType','steps','DATE_FORMAT(collectionDate, "%Y-%m-%d") as log_date_tmp','activityTypeId as activity_id'], null, 'food.collectionDate,food.acId');
                                    } else {
                                        activityFeedData = await this.activityFeedsService.getUserActivityData({user_id: postData?.user_id,activityTypeId: In(activitiesIds), collectionDate: Between(activitiesSd, activitiesEd), status: '1'}, ['acId','logType','steps','DATE_FORMAT(collectionDate, "%Y-%m-%d") as log_date_tmp','activityTypeId as activity_id'], null, 'food.collectionDate,food.acId');
                                    }
                                    let activityFeedDataTemp = {};
                                    for(let i = 0; i < activityFeedData.length; i++) {
                                        const activityId = activityFeedData[i]['activity_id'];
                                        if(!activityFeedDataTemp[activityId]) {
                                            activityFeedDataTemp[activityId] = [];
                                        }
                                        activityFeedDataTemp[activityId].push(activityFeedData[i]);
                                    }
                                    allActivityData = {...allActivityData, ...activityFeedDataTemp};
                                }
                                if ([6, 8, 10].filter(val => activitiesIds.includes(val)).length > 0) {
                                    let foodFeedData = await this.foodFeedsService.totalWater({user_id: postData?.user_id,activityTypeId: In([...activitiesIds,...[6,10]]), collectionDate: Between(activitiesSd, activitiesEd), status: '1'},{"collectionDate,food.id":"ASC"},['id','DATE_FORMAT(collectionDate, "%Y-%m-%d") as log_date_tmp','activityTypeId as activity_id','abs(water) as waters']);
                                    let foodFeedDataTemp = {};
                                    for (let i = 0; i < foodFeedData.length; i++) {
                                        const activityId = foodFeedData[i].activity_id;
                                        if(!foodFeedDataTemp[activityId]) {
                                            foodFeedDataTemp[activityId] = [];
                                        }
                                        foodFeedDataTemp[activityId].push(foodFeedData[i]);
                                    }
                                    allActivityData = {...allActivityData, ...foodFeedDataTemp};
                                }
                            }
                            let userBiometricsActivityArray = [51, 52, 53, 54, 55, 56, 57];
                            let adminBiometricsActivityArray = [33, 34, 35, 36, 37, 38, 39];
                            let physicianBiometricsActivityArray = [42, 43, 44, 45, 46, 47, 48, 3811];
                            let biometricSourceBasedActivities = userBiometricsActivityArray.concat(adminBiometricsActivityArray, physicianBiometricsActivityArray);
                            let bodyFeedActivities = [21, 22, 23, 25, 26, 27, 28, 29, 30];
                            if (userBiometricsActivityArray.filter(val => activitiesIds.includes(val)).length > 0 || adminBiometricsActivityArray.filter(val => activitiesIds.includes(val)).length > 0 || physicianBiometricsActivityArray.filter(val => activitiesIds.includes(val)).length > 0) {
                                if (userBiometricsActivityArray.filter(val => activitiesIds.includes(val)).length > 0) {
                                    let userBiometrics = await this.frontService.biometricsRecord({'bio': `user_id = "${postData?.user_id}" AND created BETWEEN "${activitiesSd}" AND "${activitiesEd}" AND source IN(1,13,14,15) AND (height != "" OR weight != "" OR waist != "" OR bmi != "" OR systolic != "" OR diastolic != "" OR total_cholesterol != "" OR hdl != "" OR ldl != "" OR triglycerides != "" OR blood_glucose != "") AND status = '1'`,'hra_bio': `user_id = "${postData?.user_id}" AND date BETWEEN "${activitiesSd}" AND "${activitiesEd}" AND source IN(1,13,14,15) AND (weight != '' OR waist != '' OR total_cholesterol != '' OR hdl != '' OR ldl != '' OR triglycerides != '' OR blood_glucose != '') AND status = '1'`,'ft_bio': `user_id = "${postData?.user_id}" AND added_date BETWEEN "${activitiesSd}" AND "${activitiesEd}" AND (weight != '' OR diastolic != '' OR systolic != '' OR hdl != '' OR ldl != '' OR triglycerides != '') AND status = '1'`},postData,[tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS,tableConstant.TRACKERS.TBL_FT_BIOMETRICS],{created: 'ASC',id: 'ASC'});
                                    allActivityData['userBiometrics'] = userBiometrics
                                }
                                if (adminBiometricsActivityArray.filter(val => activitiesIds.includes(val)).length > 0) {
                                    let adminBiometrics = await this.frontService.biometricsRecord({'bio': `user_id = "${postData?.user_id}" AND created BETWEEN "${activitiesSd}" AND "${activitiesEd}" AND source IN(2) AND status = '1'`,'hra_bio': `user_id = "${postData?.user_id}" AND date BETWEEN "${activitiesSd}" AND "${activitiesEd}" AND source IN(2) AND status = '1'`},postData,[tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS],{created: 'ASC',id: 'ASC'});
                                    allActivityData['adminBiometrics'] = adminBiometrics
                                }
                                if (physicianBiometricsActivityArray.filter(val => activitiesIds.includes(val)).length > 0) {
                                    let bioResultedData = await this.biometricsService.biometricsListRecord(`user_id = "${postData?.user_id}" AND created BETWEEN "${activitiesSd}" AND "${activitiesEd}" AND source IN(3,11,12) AND (height != '' OR weight != '' OR waist != '' OR bmi != '' OR systolic != '' OR diastolic != '' OR total_cholesterol != '' OR hdl != '' OR ldl != '' OR triglycerides != '' OR blood_glucose != '') AND hb.status = '1'`,['id','height','weight','bmi','systolic','diastolic','blood_glucose','total_cholesterol','hdl','ldl','triglycerides','waist','created','DATE_FORMAT(created, "%Y-%m-%d %H:%i:%s") as log_date_tmp'],{'log_date_tmp, hb.id': "ASC"});
                                    allActivityData['physicianBiometrics'] = bioResultedData
                                }
                            }
                            if (bodyFeedActivities.filter(val => activitiesIds.includes(val)).length > 0) {
                                let hraBiometricsData = await this.frontService.assessmentHraBiometricsData(['hra_bio.id AS id', 'hra_bio.body_fat AS body_fat', 'hra_bio.hip AS hip', 'hra_bio.waist AS waist', 'hra_bio.arm AS arm', 'hra_bio.leg AS leg', 'hra_bio.calve AS calve', 'hra_bio.weight AS weight', 'NULL AS chest', 'hra_bio.date AS date', 'DATE_FORMAT(hra_bio.date, "%Y-%m-%d %H:%i:%s") AS log_date_tmp'],`user_id = ${postData?.user_id} AND date BETWEEN "${activitiesSd}" AND "${activitiesEd}" AND (body_fat != '' OR hip != '' OR waist != '' OR arm != '' OR leg != '' OR calve != '' OR weight != '') AND status = '1'`,null,null,'getRawMany');
                                let feedResultedData = await this.frontService.bodyFeedsData(['bf.id AS id', 'bf.thigh AS thigh', 'bf.weight AS weight', 'bf.chest AS chest', 'bf.date AS date', 'DATE_FORMAT(bf.date, "%Y-%m-%d %H:%i:%s") AS log_date_tmp'],`user_id = ${postData?.user_id} AND date BETWEEN "${activitiesSd}" AND "${activitiesEd}" AND (thigh != '' OR weight != '' OR chest != '') AND status = '1'`,null,null,'getRawMany');
                                let ftBioData = await this.frontService.ftBiometricsData(['fb.id AS id','fb.weight AS weight', 'fb.added_date AS added_date','fb.added_date AS date', 'DATE_FORMAT(fb.added_date, "%Y-%m-%d %H:%i:%s") AS log_date_tmp'],`user_id = ${postData?.user_id} AND added_date BETWEEN "${activitiesSd}" AND "${activitiesEd}" AND (weight != '') AND status = '1'`,null,null,'getRawMany');
                                let biometricsData = await this.frontService.biometricsData(['hb.id AS id', 'hb.weight AS weight', 'hb.created AS created', 'hb.created AS date', 'DATE_FORMAT(hb.created, "%Y-%m-%d %H:%i:%s") AS log_date_tmp'],`user_id = ${postData?.user_id} AND created  BETWEEN "${activitiesSd}" AND "${activitiesEd}" AND (weight != '') AND status = '1'`,null,null,'getRawMany')
                                allActivityData['bodyFeeds'] = [...hraBiometricsData , ...feedResultedData, ...ftBioData, ...biometricsData]
                                allActivityData['bodyFeeds'].sort((a, b) => {
                                    let dateA: any = this.commonDateService.DateTimeFormat(a['date'],'timestamp', 'YYYY-MM-DD HH:mm:ss')
                                    let dateB: any = this.commonDateService.DateTimeFormat(b['date'],'timestamp', 'YYYY-MM-DD HH:mm:ss')
                                    let dateATs: any = this.commonDateService.DateTimeFormat(a['date'],'YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss')
                                    let dateBTs: any = this.commonDateService.DateTimeFormat(b['date'],'YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss')
                                    if (dateATs === dateBTs) {
                                        return a['id']- b['id'];
                                    }
                                    return dateA - dateB;
                                });
                            }
                            let totalBlockActivityPer = [],activityStartDate: any = '',blockStartDate: any = '',activityEndDate: any = '',blockEndDate: any = '',index = 0,blockSettingWithFrequency = 0;
                            if (myPlan['mb'].length > 0) {
                                for (let j = 0; j < myPlan['mb'].length; j++) {
                                    if(myPlan['mb'][j]['mab']['name']){
                                        myPlan['mb'][j]['name'] = myPlan['mb'][j]['mab']['name']
                                    }
                                    if(myPlan['mb'][j]['name']){
                                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`block_name_${myPlan['mb'][j]['mab']['id']}_${postData?.org_id}`,`/LC_MESSAGES/MyPlan/MyPlan/${postData?.org_id}/${myPlan['map']['id']}`,`dynamic`);
                                        myPlan['mb'][j]['name'] = (customName == '' || customName == `block_name_${myPlan['mb'][j]['mab']['id']}_${postData?.org_id}`) ? myPlan['mb'][j]['name'] : customName;
                                    }
                                    if(myPlan['mb'][j]['description']){
                                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`block_description_${myPlan['mb'][j]['mab']['id']}_${postData?.org_id}`,`/LC_MESSAGES/MyPlan/MyPlan/${postData?.org_id}/${myPlan['map']['id']}`,`dynamic`);
                                        myPlan['mb'][j]['description'] = (customName == '' || customName == `block_description_${myPlan['mb'][j]['mab']['id']}_${postData?.org_id}`) ? myPlan['mb'][j]['description'] : customName;
                                    }
                                    myPlan['PlanTotalBlock'] += 1;
                                    if (myPlan['map']['based_on'] === 0 || (myPlan['map']['based_on'] === 1 && myPlan['map']['startdate'] === null) || myPlan['map']['based_on'] === 2) {
                                        if (!blockEndDate) {
                                            blockStartDate = await this.commonDateService.DateTimeFormat(myPlan['start_date'], 'timestamp','MMMM D, YYYY');
                                        } else {
                                            if (myPlan['map']['based_on'] !== 2) {
                                                blockStartDate = ((blockEndDate * 1000) + 24 * 60 * 60 * 1000) / 1000;
                                            }
                                        }
                                    }
                                    if (myPlan['map']['based_on'] === 1 && myPlan['map']['startdate'] !== null) {
                                        blockStartDate = (myPlan['mb'][j]['mab']['startdate'] !== null) ? await this.commonDateService.DateTimeFormat(myPlan['mb'][j]['mab']['startdate'], 'timestamp','YYYY-MM-DD HH:mm:ss') : await this.commonDateService.DateTimeFormat(myPlan['map']['startdate'], 'timestamp','YYYY-MM-DD HH:mm:ss');
                                    }
                                    if (myPlan['map']['based_on'] === 0 || (myPlan['map']['based_on'] === 1 && myPlan['map']['enddate'] === null) || (myPlan['map']['based_on'] === 2 && myPlan['map']['enddate'] === null)) {
                                        let blockDays = myPlan['mb'][j]['ma'].reduce((sum, current) => sum + current.days, 0);
                                        blockEndDate = ((blockStartDate * 1000) + (Number(blockDays) - 1) * 24 * 60 * 60 * 1000) / 1000;
                                    }
                                    if ([1,2].includes(myPlan['map']['based_on']) && myPlan['map']['enddate'] !== null) {
                                        blockEndDate = (myPlan['mb'][j]['mab']['enddate'] !== null) ? await this.commonDateService.DateTimeFormat(myPlan['mb'][j]['mab']['enddate'], 'YYYY-MM-DD HH:mm:ss'): await this.commonDateService.DateTimeFormat(myPlan['map']['enddate'], 'YYYY-MM-DD HH:mm:ss');
                                    }
                                    if (myPlan['map']['based_on'] === 3) {
                                        let fRange = myPlan['map']['f_range'] || 1;
                                        let frequencyBase = myPlan['map']['frequency_base'];
                                        switch(frequencyBase) {
                                            case 0:
                                                if (!blockEndDate) {
                                                    blockStartDate = await this.commonDateService.DateTimeFormat(myPlan['start_date'], 'timestamp','MMMM D, YYYY');
                                                } else {
                                                    if (!Number.isInteger(blockSettingWithFrequency)) {
                                                        blockStartDate = activityEndDate;
                                                    } else {
                                                        blockStartDate = ((activityEndDate * 1000) + 24 * 60 * 60 * 1000) / 1000;
                                                    }
                                                }
                                                break;
                                            case 1:
                                                if (!blockEndDate) {
                                                    blockStartDate = await this.commonDateService.DateTimeFormat(myPlan['start_date'], 'timestamp','MMMM D, YYYY');
                                                } else {
                                                    if (!Number.isInteger(blockSettingWithFrequency)) {
                                                        blockStartDate = activityStartDate;
                                                    } else {
                                                        blockStartDate = ((activityStartDate * 1000) + 7 * 24 * 60 * 60 * 1000) / 1000; /*one week*/
                                                    }
                                                }
                                                break;
                                            case 2:
                                                if (!blockEndDate) {
                                                    blockStartDate = await this.commonDateService.DateTimeFormat(myPlan['start_date'], 'timestamp','MMMM D, YYYY');
                                                } else {
                                                    if (!Number.isInteger(blockSettingWithFrequency)) {
                                                        blockStartDate = activityStartDate;
                                                    } else {
                                                        let oneMonthInc = new Date(activityStartDate * 1000);
                                                        oneMonthInc.setMonth(oneMonthInc.getMonth() + 1);
                                                        blockStartDate = await this.commonDateService.DateTimeFormat(oneMonthInc,'timestamp'); /*one month*/
                                                    }
                                                }
                                                break;
                                            case 3:
                                                if (!blockEndDate) {
                                                    blockStartDate = await this.commonDateService.DateTimeFormat(myPlan['start_date'], 'timestamp','MMMM D, YYYY');
                                                } else {
                                                    if (!Number.isInteger(blockSettingWithFrequency)) {
                                                        blockStartDate = activityStartDate;
                                                    } else {
                                                        let fourMonthInc = new Date(activityStartDate * 1000);
                                                        fourMonthInc.setMonth(fourMonthInc.getMonth() + 4);
                                                        blockStartDate = await this.commonDateService.DateTimeFormat(fourMonthInc, 'timestamp'); /*four month*/
                                                    }
                                                }
                                                break;
                                            case 4:
                                                if (!blockEndDate) {
                                                    blockStartDate = await this.commonDateService.DateTimeFormat(myPlan['start_date'], 'timestamp','MMMM D, YYYY');
                                                } else {
                                                    if (!Number.isInteger(blockSettingWithFrequency)) {
                                                        blockStartDate = await this.commonDateService.DateTimeFormat(blockStartDate, 'YYYY-MM-DD HH:mm:ss');
                                                    } else {
                                                        let oneYearsInc = new Date(activityStartDate * 1000);
                                                        oneYearsInc.setFullYear(oneYearsInc.getFullYear() + 1);
                                                        blockStartDate = await this.commonDateService.DateTimeFormat(oneYearsInc, 'timestamp'); /*one year*/
                                                    }
                                                }
                                                break;
                                        }
                                        blockSettingWithFrequency = (myPlan['mb'][j]['ma'].length / fRange) + blockSettingWithFrequency;
                                    }
                                    if (myPlan['mb'][j]['mcb'] && myPlan['mb'][j]['mcb']['status'] === 1) {
                                        myPlan['PlanCompleteBlock'] += 1;
                                        myPlan['mb'][j]['iscomplete'] = 1;
                                        myPlan['mb'][j]['mcb']['activity_detail_data'] = myPlan['mb'][j]['mcb']['activity_detail'] ? JSON.parse(myPlan['mb'][j]['mcb']['activity_detail']) : {};
                                    }
                                    myPlan['mb'][j]['start_date'] = await this.commonDateService.DateTimeFormat(blockStartDate, 'tstodate','YYYY-MM-DD HH:mm:ss');
                                    myPlan['mb'][j]['iscomplete'] = 0;
                                    myPlan['mb'][j]['BlockTotalActivity'] = 0;
                                    myPlan['mb'][j]['BlockCompleteActivity'] = 0;
                                    myPlan['mb'][j]['BlockTotalActivityper'] = 0;
                                    if (myPlan['mb'][j]['ma'].length > 0) {
                                        let finalNotShowActivityIds: number[] = [];
                                        let getOptionActivity = {};
                                        myPlan['mb'][j]['ma'].forEach(function(item) {
                                            if (item.option_activity_ids) {
                                                getOptionActivity[item.id] = item.option_activity_ids;
                                            }
                                        });
                                        if (getOptionActivity) {
                                            let notShowActivityIds = {};
                                            Object.keys(getOptionActivity).forEach(function(keyvalue) {
                                                notShowActivityIds[keyvalue] = getOptionActivity[keyvalue].split(",").map(Number);
                                            });
                                            let mainActivityIds = {};
                                            if (notShowActivityIds) {
                                                Object.keys(notShowActivityIds).forEach(function(keyvalue) {
                                                    let activityData = Object.assign({}, ...notShowActivityIds[keyvalue].map((val) => ({ [val]: parseInt(keyvalue) })));
                                                    Object.keys(activityData).forEach(function(innerKeyvalue) {
                                                        if (!mainActivityIds[innerKeyvalue]) {
                                                            mainActivityIds[innerKeyvalue] = [];
                                                        }
                                                        mainActivityIds[innerKeyvalue].push(activityData[innerKeyvalue]);
                                                    });
                                                });
                                                let notShowActivityIdsMerge = [].concat.apply([], Object.values(notShowActivityIds));
                                                if (notShowActivityIdsMerge && notShowActivityIdsMerge.length) {
                                                    finalNotShowActivityIds = [...new Set(notShowActivityIdsMerge)].map(Number);
                                                }
                                            }
                                            let orderMap: Map<number, number> = new Map(finalNotShowActivityIds.map((id, index) => [id, index]));
                                            myPlan['mb'][j]['ma'].sort((a, b) => {
                                                let aIndex = orderMap.has(a.id) ? orderMap.get(a.id) : Infinity;
                                                let bIndex = orderMap.has(b.id) ? orderMap.get(b.id) : Infinity;
                                                return aIndex - bIndex;
                                            });
                                        }
                                        let completeActivityIds = [];
                                        for (let k: number = 0; k < myPlan['mb'][j]['ma'].length; k++) {
                                            let activityData = JSON.parse(JSON.stringify(myPlan['mb'][j]['ma'][k]));
                                            myPlan['PlanTotalActivity'] += 1;
                                            myPlan['mb'][j]['BlockTotalActivity'] += 1;
                                            let activityId = myPlan['mb'][j]['ma'][k]['activity_id'];
                                            myPlan['mb'][j]['ma'][k]['assign_block_id'] = myPlan['mb'][j]['mab']['id'];
                                            let eCategoryId: any = '';
                                            if (myPlan['mb'][j]['ma'][k]['is_category'] === 1) {
                                                eCategoryId = (myPlan['mb'][j]?.['ma'][k]?.['org_activity_id'] || "");
                                            }
                                            if (myPlan['map']['based_on'] == 0 || (myPlan['map']['based_on'] == 1 && myPlan['map']['startdate'] === null) || myPlan['map']['based_on'] == 2) {
                                                if (!activityEndDate) {
                                                    activityStartDate = await this.commonDateService.DateTimeFormat(myPlan['start_date'], 'timestamp','MMMM D, YYYY');
                                                } else {
                                                    if (myPlan['map']['based_on'] !== 2) {
                                                        activityStartDate = ((activityEndDate * 1000) + 24 * 60 * 60 * 1000) / 1000;
                                                    }
                                                }
                                            }
                                            if (myPlan['map']['based_on'] == 1 && myPlan['map']['startdate']) {
                                                activityStartDate = myPlan['mb'][j]['ma'][k]['maa']['startdate'] ? await this.commonDateService.DateTimeFormat(myPlan['mb'][j]['ma'][k]['maa']['startdate'],'timestamp', 'MMMM D, YYYY') : myPlan['mb'][j]['mab']['startdate'] ? await this.commonDateService.DateTimeFormat(myPlan['mb'][j]['mab']['startdate'],'timestamp', 'YYYY-MM-DD HH:mm:ss') : await this.commonDateService.DateTimeFormat(myPlan['map']['startdate'], 'timestamp','YYYY-MM-DD HH:mm:ss');
                                            }
                                            if (myPlan['map']['based_on'] == 0 || (myPlan['map']['based_on'] == 1 && !myPlan['map']['enddate']) || (myPlan['map']['based_on'] == 2 && !myPlan['map']['enddate'])) {
                                                activityEndDate = ((activityStartDate * 1000) + (Number(myPlan['mb'][j]['ma'][k]['days']) - 1) * 24 * 60 * 60 * 1000) / 1000;
                                            }
                                            if ([1,2].includes(myPlan['map']['based_on']) && myPlan['map']['enddate'] !== null) {
                                                activityEndDate = (myPlan['mb'][j]['ma'][k]['maa']['enddate'] ? await this.commonDateService.DateTimeFormat(myPlan['mb'][j]['ma'][k]['maa']['enddate'],'timestamp','MMMM D, YYYY') : (myPlan['mb'][j]['mab']['enddate'] ? await this.commonDateService.DateTimeFormat(myPlan['mb'][j]['mab']['enddate'],'timestamp','YYYY-MM-DD HH:mm:ss') : await this.commonDateService.DateTimeFormat(myPlan['map']['enddate'],'timestamp','YYYY-MM-DD HH:mm:ss')));
                                            }
                                            if (myPlan['map']['based_on'] == 3) {
                                                let fRange = myPlan['map']['f_range'] || 1;
                                                let frequencyBase = myPlan['map']['frequency_base']
                                                switch(frequencyBase) {
                                                    case 0:
                                                        if(index === 0){
                                                            if (!activityEndDate) {
                                                                activityStartDate = await this.commonDateService.DateTimeFormat(myPlan['start_date'], 'timestamp','MMMM D, YYYY');
                                                            } else {
                                                                activityStartDate = ((activityEndDate * 1000) + 24 * 60 * 60 * 1000) / 1000;
                                                            }
                                                        }
                                                        if(index === fRange) {
                                                            activityStartDate = ((activityEndDate * 1000) + 24 * 60 * 60 * 1000) / 1000;
                                                            index = 0;
                                                        }
                                                        activityEndDate = activityStartDate;
                                                        break;
                                                    case 1:
                                                        if (index === 0) {
                                                            if (!activityEndDate) {
                                                                activityStartDate = await this.commonDateService.DateTimeFormat(myPlan['start_date'], 'timestamp','MMMM D, YYYY');
                                                            } else {
                                                                activityStartDate = ((activityEndDate * 1000) + 24 * 60 * 60 * 1000) / 1000;
                                                            }
                                                            activityEndDate = ((activityStartDate * 1000) + 6 * 24 * 60 * 60 * 1000) / 1000;
                                                        }
                                                        if (index === fRange) {
                                                            activityStartDate = ((activityEndDate * 1000) + 24 * 60 * 60 * 1000) / 1000;
                                                            activityEndDate = ((activityStartDate * 1000) + 6 * 24 * 60 * 60 * 1000) / 1000;
                                                            index = 0;
                                                        }
                                                        break;
                                                    case 2:
                                                        if (index === 0) {
                                                            if (!activityEndDate) {
                                                                activityStartDate = await this.commonDateService.DateTimeFormat(myPlan['start_date'], 'timestamp','MMMM D, YYYY');
                                                            } else {
                                                                activityStartDate = ((activityEndDate * 1000) + 24 * 60 * 60 * 1000) / 1000;
                                                            }
                                                            let oneMonthInc: any = new Date(activityStartDate * 1000);
                                                            oneMonthInc.setMonth(oneMonthInc.getMonth() + 1);
                                                            oneMonthInc = await this.commonDateService.DateTimeFormat(oneMonthInc, 'timestamp');
                                                            activityEndDate = ((oneMonthInc * 1000) - 24 * 60 * 60 * 1000) / 1000;
                                                        }
                                                        if (index === fRange) {
                                                            activityStartDate = ((activityEndDate * 1000) + 24 * 60 * 60 * 1000) / 1000;
                                                            let oneMonthInc: any = new Date(activityStartDate * 1000);
                                                            oneMonthInc.setMonth(oneMonthInc.getMonth() + 1);
                                                            oneMonthInc = await this.commonDateService.DateTimeFormat(oneMonthInc, 'timestamp');
                                                            activityEndDate = ((oneMonthInc * 1000) - 24 * 60 * 60 * 1000) / 1000;
                                                            index = 0;
                                                        }
                                                        break;
                                                    case 3:
                                                        if (index === 0) {
                                                            if (!activityEndDate) {
                                                                activityStartDate = await this.commonDateService.DateTimeFormat(myPlan['start_date'], 'timestamp','MMMM D, YYYY');
                                                            } else {
                                                                activityStartDate = ((activityEndDate * 1000) + 24 * 60 * 60 * 1000) / 1000;
                                                            }
                                                            let fourMonthInc: any = new Date(activityStartDate * 1000);
                                                            fourMonthInc.setMonth(fourMonthInc.getMonth() + 4);
                                                            fourMonthInc = await this.commonDateService.DateTimeFormat(fourMonthInc, 'timestamp');
                                                            activityEndDate = ((fourMonthInc * 1000) - 24 * 60 * 60 * 1000) / 1000;
                                                        }
                                                        if (index === fRange) {
                                                            activityStartDate = ((activityEndDate * 1000) + 24 * 60 * 60 * 1000) / 1000;
                                                            let fourMonthInc: any = new Date(activityStartDate * 1000);
                                                            fourMonthInc.setMonth(fourMonthInc.getMonth() + 4);
                                                            fourMonthInc = await this.commonDateService.DateTimeFormat(fourMonthInc, 'timestamp');
                                                            activityEndDate = ((fourMonthInc * 1000) - 24 * 60 * 60 * 1000) / 1000;
                                                            index = 0;
                                                        }
                                                        break;
                                                    case 4:
                                                        if (index === 0) {
                                                            if (!activityEndDate) {
                                                                activityStartDate = await this.commonDateService.DateTimeFormat(myPlan['start_date'], 'timestamp','MMMM D, YYYY');
                                                            } else {
                                                                activityStartDate = ((activityEndDate * 1000) + 24 * 60 * 60 * 1000) / 1000;
                                                            }
                                                            let oneYearsInc: any = new Date(activityStartDate * 1000);
                                                            oneYearsInc.setFullYear(oneYearsInc.getFullYear() + 1);
                                                            oneYearsInc = await this.commonDateService.DateTimeFormat(oneYearsInc, 'timestamp');
                                                            activityEndDate = ((oneYearsInc * 1000) - 24 * 60 * 60 * 1000) / 1000;
                                                        }
                                                        if (index === fRange) {
                                                            activityStartDate = ((activityEndDate * 1000) + 24 * 60 * 60 * 1000) / 1000;
                                                            let oneYearsInc: any = new Date(activityStartDate * 1000);
                                                            oneYearsInc.setFullYear(oneYearsInc.getFullYear() + 1);
                                                            oneYearsInc = await this.commonDateService.DateTimeFormat(oneYearsInc, 'timestamp');
                                                            activityEndDate = ((oneYearsInc * 1000) - 24 * 60 * 60 * 1000) / 1000;
                                                            index = 0;
                                                        }
                                                        break;
                                                }
                                            }
                                            index++;
                                            myPlan['mb'][j]['ma'][k]['start_date'] = await this.commonDateService.DateTimeFormat(activityStartDate,'tstodate','YYYY-MM-DD HH:mm:ss');
                                            myPlan['mb'][j]['ma'][k]['end_date'] = `${await this.commonDateService.DateTimeFormat(activityEndDate,'tstodate','YYYY-MM-DD')} 23:59:59`;
                                            myPlan['mb'][j]['end_date'] = `${await this.commonDateService.DateTimeFormat(activityEndDate,'tstodate', 'YYYY-MM-DD')} 23:59:59`;
                                            activityEndDate = blockEndDate = await this.commonDateService.DateTimeFormat(new Date(`${await this.commonDateService.DateTimeFormat(activityEndDate,'tstodate', 'YYYY-MM-DD')} 23:59:59`), 'timestamp','YYYY-MM-DD HH:mm:ss');
                                            let eventAllActivityIds: any = {};
                                            myPlan['mb'][j]['ma'][k]['ac'] = myPlan['mb'][j]['ma'][k]['ac'] || {};
                                            if (activityId == -1) {
                                                let tmpNameSetting= '',tmpNameSettingCategory: number;
                                                let moduleId = myPlan['mb'][j]['ma'][k]['module_id']
                                                switch (moduleId) {
                                                    case 1:
                                                            tmpNameSettingCategory = 21;
                                                            let orgActivityID = (myPlan['mb'][j]?.['ma'][k]?.['org_activity_id'] || "").split(',');
                                                            const index = orgActivityID.findIndex(item => item.indexOf('EVC') === 0);
                                                            let evOrgActivityId = '';
                                                            if (index !== -1) {
                                                                evOrgActivityId = orgActivityID[index].substring(3);
                                                            }
                                                            if (eventsListIdWise?.[myPlan['mb'][j]['ma'][k]['org_activity_id']]?.['event_name']) {
                                                                tmpNameSetting = eventsListIdWise[myPlan['mb'][j]['ma'][k]['org_activity_id']]['event_name'];
                                                                myPlan['mb'][j]['ma'][k]['Events'] = [eventsListIdWise[myPlan['mb'][j]['ma'][k]['org_activity_id']]];
                                                                myPlan['mb'][j]['ma'][k]['ac']['id'] = activityId = eventsListIdWise[myPlan['mb'][j]['ma'][k]['org_activity_id']]['activity_id'];
                                                            } else if (eventsCategoryListIdWise?.[evOrgActivityId]?.['category_name']) {
                                                                tmpNameSetting = eventsCategoryListIdWise[evOrgActivityId]['category_name'];
                                                                myPlan['mb'][j]['ma'][k]['Events_category'] = eventsCategoryListIdWise[evOrgActivityId];
                                                            } else {
                                                                const eventsIds = Object.keys(eventsListIdWise);
                                                                let arrayNameArray = {};
                                                                for (let i = 0; i < eventsIds.length; i++) {
                                                                    arrayNameArray[eventsIds[i]] = eventsListIdWise[eventsIds[i]].event_name;
                                                                }
                                                                let intersected = {};
                                                                myPlan['mb'][j]['ma'][k]['Events'] = [];
                                                                for (let i = 0; i < orgActivityID.length; i++) {
                                                                    const key = orgActivityID[i];
                                                                    const item = eventsListIdWise[key];
                                                                    if (arrayNameArray.hasOwnProperty(key)) {
                                                                        intersected[key] = arrayNameArray[key];
                                                                    }
                                                                    myPlan['mb'][j]['ma'][k]['Events'].push(item)
                                                                    if (item) {
                                                                        eventAllActivityIds[item.activity_id] = item.id;
                                                                    }
                                                                }
                                                                tmpNameSetting = (Object.values(intersected) as string[])?.[0] || '';
                                                            }
                                                        break;
                                                    case 2:
                                                        if (emotionalResultDataEha['result_detail'][myPlan['mb'][j]['ma'][k]['org_activity_id']]) {
                                                            tmpNameSettingCategory = -1;
                                                            tmpNameSetting = emotionalResultDataEha['result_detail'][myPlan['mb'][j]['ma'][k]['org_activity_id']];
                                                        }
                                                        break;
                                                    case 3:
                                                        if (myPlan['mb'][j]['ma'][k]['acAge']['activity_name']) {
                                                            tmpNameSetting = myPlan['mb'][j]['ma'][k]['acAge']['activity_name'];
                                                            myPlan['mb'][j]['ma'][k]['ac']['id'] = activityId = myPlan['mb'][j]['ma'][k]['org_activity_id'];
                                                            activityData = {...activityData, type: 2, s_range : 0.99};
                                                            tmpNameSettingCategory = 20;
                                                        }
                                                        break;
                                                    case 4:
                                                        if (scheduleChallengeIdWise?.[myPlan['mb'][j]['ma'][k]['org_activity_id']]?.['custom_cname']) {
                                                            tmpNameSetting = scheduleChallengeIdWise[myPlan['mb'][j]['ma'][k]['org_activity_id']]['custom_cname'];
                                                            tmpNameSettingCategory = 8;
                                                        }
                                                        break;
                                                    case 5:
                                                        if (quickLinkListIdWise[myPlan['mb'][j]['ma'][k]['org_activity_id']]?.['title']) {
                                                            tmpNameSetting = quickLinkListIdWise[myPlan['mb'][j]['ma'][k]['org_activity_id']]['title'];
                                                            tmpNameSettingCategory = 43;
                                                            myPlan['mb'][j]['ma'][k]['ac']['id'] = activityId = quickLinkListIdWise[myPlan['mb'][j]['ma'][k]['org_activity_id']]['activity_id'];
                                                        }
                                                        break;
                                                    case 6:
                                                        if (qzQuizListIdWise[myPlan['mb'][j]['ma'][k]['org_activity_id']]?.['quiz_name']) {
                                                            tmpNameSetting = qzQuizListIdWise[myPlan['mb'][j]['ma'][k]['org_activity_id']]?.['quiz_name'];
                                                            tmpNameSettingCategory = 36;
                                                            myPlan['mb'][j]['ma'][k]['ac']['id'] = activityId = qzQuizListIdWise[myPlan['mb'][j]['ma'][k]['org_activity_id']]['aqo']['activity_id'];
                                                        }
                                                        break;
                                                    case 7:
                                                        tmpNameSetting = appConstant.HRA_DATA[myPlan['mb'][j]['ma'][k]['org_activity_id']]
                                                        tmpNameSettingCategory = -2;
                                                        break;
                                                    case 8:
                                                        tmpNameSetting = appConstant.BIO_DATA[myPlan['mb'][j]['ma'][k]['org_activity_id']];
                                                        tmpNameSettingCategory = -3;
                                                        break;
                                                    case 9:
                                                        tmpNameSetting = 'Emotional Well-Being Post';
                                                        tmpNameSettingCategory = 75;
                                                        myPlan['mb'][j]['ma'][k]['ac']['id'] = activityId = 5905;
                                                        myPlan['mb'][j]['ma'][k]['post_id'] = myPlan['mb'][j]['ma'][k]['org_activity_id']
                                                        if (myPlan['mb'][j]['ma'][k]['org_activity_id'] == 0) {
                                                            let ecvCategoryId = myPlan['mb'][j]['ma'][k]['wellbeing_category_id'];
                                                            if(!ecvCategoryId) {
                                                                ecvCategoryId = await this.wellBeingCategoryService.listRecord({org_id: In([...[0],...[postData?.org_id]]), status: '1'});
                                                                if(ecvCategoryId.length !== 0){
                                                                    ecvCategoryId = ecvCategoryId.map(cat => cat.id).join(',');
                                                                } else {
                                                                    ecvCategoryId = '';
                                                                }
                                                            }
                                                            if (ecvCategoryId) {
                                                                let eventsCategoryList = await this.wellBeingCategoryService.listRecord(`(org_id='0' OR org_id='${postData?.org_id}') AND (parent_id IN ('${ecvCategoryId}') OR id IN ('${ecvCategoryId}')) AND status = '1'`);
                                                                if (eventsCategoryList.length > 0) {
                                                                    let vCategory = eventsCategoryList.map(event => event.id);
                                                                    let eventsCategoryPostList = await this.wellbeingPostService.listRecord({cat_id: In(vCategory),status: '1'},['id']);
                                                                    if (eventsCategoryPostList.length > 0) {
                                                                        let vPostIds = eventsCategoryPostList.map(event => event.id);
                                                                        let eventsCategoryPostClickList = await this.wellbeingPostClickService.findOne({user_id: postData?.user_id,post_id: In(vPostIds),status: '1'},['COUNT(id) as PostclickCount']);
                                                                        if (eventsCategoryPostClickList && eventsCategoryPostClickList['PostclickCount'] > 0) {
                                                                            activityData = {...activityData, type: 2, s_range : 0.99};
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                        break;
                                                }
                                                myPlan['mb'][j]['ma'][k]['ac']['activity_name'] = tmpNameSetting;
                                                myPlan['mb'][j]['ma'][k]['ac']['category_id'] = tmpNameSettingCategory;
                                            } else {
                                                let categoryId =  Number(myPlan['mb'][j]['ma'][k]['ac']['category_id']);
                                                if (categoryId) {
                                                    if ([21,20,8,43,36].includes(categoryId)) {
                                                        let categoryIdArray = {'21':1,'20':3,'8':4,'43':5,'36':6}
                                                        myPlan['mb'][j]['ma'][k]['module_id'] = categoryIdArray[categoryId];
                                                    }
                                                } else {
                                                    myPlan['mb'][j]['ma'][k]['ac']['category_id'] = 0;
                                                }
                                            }
                                            let categoryId =  Number(myPlan['mb'][j]['ma'][k]['ac']['category_id']) || 0;
                                            if (activityId != -1 && categoryId == 21 && eventsListActivityWise[activityId]) {
                                                myPlan['mb'][j]['ma'][k]['Events'] = eventsListActivityWise[activityId];
                                            }
                                            if(myPlan['mb'][j]['ma'][k]['description'] == '' || myPlan['mb'][j]['ma'][k]['description'] == null) {
                                                let defaultDescData = {};
                                                defaultDesc.forEach((item) => {
                                                    defaultDescData[item.module_id] = item.description;
                                                });
                                                let defaultDescriptionPath = defaultDescData[myPlan['mb'][j]['ma'][k]['module_id']];
                                                if(defaultDescriptionPath) {
                                                    myPlan['mb'][j]['ma'][k]['description'] = defaultDescriptionPath;
                                                } else {
                                                    if(![2,3,4,5,8,9,10,21,26,40,43].includes(categoryId)) {
                                                        if (defaultDescData?.[0]) {
                                                            myPlan['mb'][j]['ma'][k]['description'] = defaultDescData[0];
                                                        }
                                                    } else {
                                                        if(categoryId == 21) {
                                                            let customName = await this.translatorService.frontendReadTranslation(req.lang,'Click the button to register for the event', `/LC_MESSAGES/MyPlan/MyPlan`,`static`);
                                                            myPlan['mb'][j]['ma'][k]['description'] = `<p>${customName}</p>`;
                                                        }
                                                        if(![2,3,4,5,8,10,21,36,40,43].includes(categoryId) && myPlan['mb'][j]['ma'][k]['link_type'] == 0 && myPlan['mb'][j]['ma'][k]['link'] != '') {
                                                            let customName = await this.translatorService.frontendReadTranslation(req.lang,'Click the button to complete this activity and learn more', `/LC_MESSAGES/MyPlan/MyPlan`,`static`);
                                                            myPlan['mb'][j]['ma'][k]['description'] = `<p>${customName}</p>`;
                                                        }
                                                        if([2,4,5].includes(categoryId) && [7,9,11,15,16,17,18,24].includes(myPlan['mb'][j]['ma'][k]['ac']['id'])) {
                                                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`Log your distance`, `/LC_MESSAGES/MyPlan/MyPlan`,`static`);
                                                            myPlan['mb'][j]['ma'][k]['description'] = `<p>${customName}<\/p>`;
                                                        }
                                                    }
                                                    if(myPlan['mb'][j]['ma'][k]['description'] == '' || myPlan['mb'][j]['ma'][k]['description'] == null) {
                                                        if (defaultDescData?.[0]) {
                                                            myPlan['mb'][j]['ma'][k]['description'] = defaultDescData[0];
                                                        }
                                                    }
                                                }
                                            } else {
                                                let customName = await this.translatorService.frontendReadTranslation(req.lang,`activity_description_${myPlan['mb'][j]['mab']['id']}_${myPlan['mb'][j]['ma'][k]['maa']['id']}_${postData?.org_id}`,`/LC_MESSAGES/MyPlan/MyPlan/${postData?.org_id}/${myPlan['map']['id']}`,`dynamic`);
                                                myPlan['mb'][j]['ma'][k]['description'] = (customName == '' || customName == `activity_description_${myPlan['mb'][j]['mab']['id']}_${myPlan['mb'][j]['ma'][k]['maa']['id']}_${postData?.org_id}`) ? myPlan['mb'][j]['ma'][k]['description'] : customName;
                                            }
                                            myPlan['mb'][j]['ma'][k]['description'] = myPlan['mb'][j]['ma'][k]['description'] || '';
                                            const preventionCloudLinks = [...myPlan['mb'][j]['ma'][k]['description'].matchAll(/href="\s*(https:\/\/[^"]*preventioncloud[^"]*)"/g)].map(match => match[1]);
                                            if (preventionCloudLinks.length > 0) {
                                                for (let i = 0; i < preventionCloudLinks.length; i++) {
                                                    const originalUrl = preventionCloudLinks[i];
                                                    let data = await this.urlManageService.onmapUrl(originalUrl);
                                                    if (data && typeof data === 'string') {
                                                        const escapedOriginalUrl = originalUrl.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
                                                        const regex = new RegExp(`href\\s*=\\s*"\\s*${escapedOriginalUrl}"`, 'g');
                                                        myPlan['mb'][j]['ma'][k]['description'] = myPlan['mb'][j]['ma'][k]['description'].replace(regex, `href="${data}"`);
                                                    }
                                                }
                                            }
                                            if (myPlan['mb'][j]['ma'][k]['mca'] || (myPlan['mb'][j]['mcb'] && myPlan['mb'][j]['mcb']['activity_detail_data'] && myPlan['mb'][j]['mcb']['activity_detail_data'][myPlan['mb'][j]['ma'][k]['id']] && myPlan['mb'][j]['mcb']['status'] == '1')) {
                                                let activityType = activityData['type'];
                                                let activityId = myPlan['mb'][j]['ma'][k]['ac']['id'];
                                                if (activityType === 3 && activityId === 7717 && myPlan['mb'][j]['ma'][k]['mca']) {
                                                    myPlan['mb'][j]['ma'][k]['custom_completion'] = 1;
                                                    let completionStatus = myPlan['mb'][j]['ma'][k]['mca']['status'];
                                                    if (completionStatus !== undefined && completionStatus === 1) {
                                                        if (!finalNotShowActivityIds.includes(myPlan['mb'][j]['ma'][k]['id'])) {
                                                            myPlan['mb'][j]['BlockCompleteActivity'] += 1;
                                                            myPlan['PlanCompleteActivity'] += 1;
                                                        }
                                                    }
                                                } else {
                                                    if (!finalNotShowActivityIds.includes(myPlan['mb'][j]['ma'][k]['id'])) {
                                                        myPlan['mb'][j]['BlockCompleteActivity'] += 1;
                                                        myPlan['PlanCompleteActivity'] += 1;
                                                    }
                                                }
                                                myPlan['mb'][j]['ma'][k]['completeper'] = 0;
                                                if (myPlan['mb'][j]['ma'][k]['mca']) {
                                                    myPlan['mb'][j]['activity_detail'] = myPlan['mb'][j]['activity_detail'] || {};
                                                    myPlan['mb'][j]['activity_detail'][myPlan['mb'][j]['ma'][k]['id']] = myPlan['mb'][j]['activity_detail'][myPlan['mb'][j]['ma'][k]['id']] || {}
                                                    myPlan['mb'][j]['activity_detail'][myPlan['mb'][j]['ma'][k]['id']]['log_date'] = await this.commonDateService.DateTimeFormat(myPlan['mb'][j]['ma'][k]['mca']['created'],'YYYY-MM-DD','YYYY-MM-DD HH:mm:ss');
                                                    myPlan['mb'][j]['ma'][k]['completeper'] = 100;
                                                } else if (myPlan['mb'][j]['mcb']['activity_detail_data'][myPlan['mb'][j]['ma'][k]['id']]?.hasOwnProperty("log_date")) {
                                                    myPlan['mb'][j]['ma'][k]['completeper'] = 100;
                                                }
                                                if (activityId === 5905) {
                                                    if(emotionalWellBeingPost[myPlan['mb'][j]['ma'][k]['post_id']]) {
                                                        myPlan['mb'][j]['ma'][k]['ew_post'] = emotionalWellBeingPost[myPlan['mb'][j]['ma'][k]['post_id']];
                                                        myPlan['mb'][j]['ma'][k]['ac']['activity_name'] = emotionalWellBeingPost[myPlan['mb'][j]['ma'][k]['post_id']]['title'];
                                                    }
                                                }
                                                if (myPlan['mb'][j]['ma'][k]['completeper']) {
                                                    completeActivityIds.push(myPlan['mb'][j]['ma'][k]['id']);
                                                }
                                            } else {
                                                /* TODO: totalDate check if its not use then remove var and common health function code */
                                                let totalAccount: number = 0,totalDate = '';
                                                if (myPlan['mb'][j]['ma'][k]['module_id'] === 9 && myPlan['mb'][j]['ma'][k]['org_activity_id'] == '0' && activityData['type'] === 2 && activityData['s_range'] === 0.99) {
                                                    totalAccount = 1;
                                                }
                                                let TrBiometricsData = 0;
                                                if (allActivityData?.['TrBiometrics']?.[activityId]) {
                                                    let trBiometricsActivityDone = allActivityData['TrBiometrics'][activityId];
                                                    trBiometricsActivityDone = await this.commonHealthService.countActData(trBiometricsActivityDone, activityStartDate, activityEndDate, myPlan['mb'][j]['ma'][k]);
                                                    totalDate = trBiometricsActivityDone['date'];
                                                    totalAccount = trBiometricsActivityDone['total_account'];
                                                    TrBiometricsData = 1;
                                                }
                                                if ([7, 9, 11, 15, 16, 17, 18, 24].includes(activityId)) {
                                                    if (myPlan['mb'][j]['ma'][k]['frequency_base']!=4) {
                                                        if ([11, 15].includes(activityId)) {
                                                            let trackerActivityDone = [];
                                                            if(allActivityData[activityId]) {
                                                                trackerActivityDone = allActivityData[activityId];
                                                            }
                                                            if (activityId === 15 && allActivityData[11] && Object.keys(allActivityData[11]).length > 0) {
                                                                trackerActivityDone = [...trackerActivityDone, ...allActivityData[11]];
                                                            }
                                                            if (activityId === 11 && allActivityData[15] && Object.keys(allActivityData[15]).length > 0) {
                                                                trackerActivityDone = [...trackerActivityDone, ...allActivityData[15]];
                                                            }
                                                            if (trackerActivityDone?.length > 0) {
                                                                if (myPlan['mb'][j]['ma'][k]['f_type'] === 2) {
                                                                    if(activityData['f_range'] > 0) {
                                                                        activityData['f_range'] = activityData['f_range'] - 1;
                                                                    }
                                                                }
                                                                let totalCountAct: any;
                                                                if (myPlan['mb'][j]['ma'][k]['frequency_base'] === 0) {
                                                                    activityData['type'] = 2;
                                                                    activityData['s_range'] = activityData['f_range'];
                                                                    totalCountAct = await this.commonDateService.countActDataStep(trackerActivityDone, activityStartDate, activityEndDate, 'steps', 'ft_activity_feeds', myPlan['mb'][j]['ma'][k]);
                                                                } else {
                                                                    let dateDiff = Math.floor((activityEndDate - activityStartDate) / (60 * 60 * 24));
                                                                    let totalDays = ++dateDiff;
                                                                    activityData['type'] = 2;
                                                                    activityData['s_range'] = totalDays;
                                                                    totalCountAct = await this.commonDateService.countActDataStepFrequency(trackerActivityDone, activityStartDate, activityEndDate, 'steps', 'ft_activity_feeds', myPlan['mb'][j]['ma'][k], totalDays);
                                                                    if (totalCountAct['total_account'] == totalDays) {
                                                                        totalCountAct['total_account']++
                                                                    }
                                                                }
                                                                totalDate = totalCountAct['date'];
                                                                totalAccount = totalCountAct['total_account'];
                                                            }
                                                        } else {
                                                            if(allActivityData[activityId] && Object.keys(allActivityData[activityId]).length > 0 ) {
                                                                let stepActivityDone = allActivityData[activityId];
                                                                let totalCountAct: any = await this.commonDateService.countActDataStep(stepActivityDone, activityStartDate, activityEndDate, 'steps', 'ft_activity_feeds', myPlan['mb'][j]['ma'][k]);
                                                                activityData['type'] = 2;
                                                                activityData['s_range'] = activityData['f_range'];
                                                                totalDate = totalCountAct['date'];
                                                                totalAccount = totalCountAct['total_account'];
                                                            }
                                                        }
                                                    }
                                                } else if (biometricSourceBasedActivities.includes(activityId)) {
                                                    if (activityData['type'] != 3) {
                                                        if (userBiometricsActivityArray.includes(activityId)) {
                                                            if(allActivityData['userBiometrics'].length > 0) {
                                                                let userBiometricsActivityDone = allActivityData['userBiometrics'];
                                                                let field;
                                                                let fieldsByActivityId = {51: 'bmi', 52: 'total_cholesterol', 53: 'hdl', 54: 'ldl', 55: 'triglycerides', 56: 'blood_glucose', 57: 'systolic'};
                                                                field = fieldsByActivityId[activityId] || null;
                                                                let getPlanActivity: any = await this.commonHealthService.getPlanActivityData(userBiometricsActivityDone, activityStartDate, activityEndDate, field, 'bio', myPlan['mb'][j]['ma'][k]);
                                                                totalDate = getPlanActivity['date'];
                                                                totalAccount = getPlanActivity['total_account'];
                                                            }
                                                        } else if (adminBiometricsActivityArray.includes(activityId)) {
                                                            if (allActivityData['adminBiometrics'].length > 0) {
                                                                let adminBiometricsActivityDone = allActivityData['adminBiometrics'];
                                                                let fieldMappings = {33: 'bmi', 34: 'total_cholesterol', 35: 'hdl', 36: 'ldl', 37: 'triglycerides', 38: 'blood_glucose', 39: 'systolic'};
                                                                let field = fieldMappings[activityId] || null;
                                                                if (field) {
                                                                    let getPlanActivity: any = await this.commonHealthService.getPlanActivityData(adminBiometricsActivityDone, activityStartDate, activityEndDate, field, 'bio', myPlan['mb'][j]['ma'][k]);
                                                                    totalDate = getPlanActivity['date'];
                                                                    totalAccount = getPlanActivity['total_account'];
                                                                }
                                                            }
                                                        } else if (physicianBiometricsActivityArray.includes(activityId)) {
                                                            if(allActivityData['physicianBiometrics'].length > 0) {
                                                                let pbActivityDone = allActivityData['physicianBiometrics'];
                                                                let field;
                                                                const fieldsByActivityId = {42: 'bmi', 43: 'total_cholesterol', 44: 'hdl', 45: 'ldl', 46: 'triglycerides', 47: 'blood_glucose', 48: 'systolic', 3811: 'waist'};
                                                                field = fieldsByActivityId[activityId] || null;
                                                                let getPlanActivity: any = await this.commonHealthService.getPlanActivityData(pbActivityDone, activityStartDate, activityEndDate, field, 'bio', myPlan['mb'][j]['ma'][k]);
                                                                totalDate = getPlanActivity['date'];
                                                                totalAccount = getPlanActivity['total_account'];
                                                            }
                                                        }
                                                    }
                                                } else if (activityId == 10 && myPlan['mb'][j]['ma'][k]['wtype'] == 0) {
                                                    if (activityData['type'] !== 3) {
                                                        if (allActivityData[activityId]) {
                                                            let waterActivityDone = allActivityData[activityId];
                                                            if(myPlan['mb'][j]['ma'][k].wtypeunit === 1){
                                                                let sRange: number = (activityData['s_range']*8);
                                                                let eRange: number = (activityData['e_range']*8);
                                                                activityData['s_range'] = sRange;
                                                                activityData['e_range'] = eRange;
                                                                myPlan['mb'][j]['ma'][k]['s_range'] = sRange;
                                                                myPlan['mb'][j]['ma'][k]['e_range'] = eRange;
                                                            }
                                                            if(myPlan['mb'][j]['ma'][k].wtypeunit === 2){
                                                                let sRange: number = (activityData['s_range']*0.033814);
                                                                let eRange: number = (activityData['e_range']*0.033814);
                                                                activityData['s_range'] = sRange;
                                                                activityData['e_range'] = eRange;
                                                                myPlan['mb'][j]['ma'][k]['s_range'] = sRange;
                                                                myPlan['mb'][j]['ma'][k]['e_range'] = eRange;
                                                            }
                                                            let countActData: any = await this.commonDateService.countActDataStep(waterActivityDone, activityStartDate, activityEndDate, 'waters', null, myPlan['mb'][j]['ma'][k]);
                                                            totalDate = countActData['date'];
                                                            totalAccount = countActData['total_account'];
                                                        }
                                                    }
                                                } else if (activityId == 5905) {
                                                    if (activityData['type'] !== 1) {
                                                        if (emotionalWellBeingPost[myPlan['mb'][j]['ma'][k]['post_id']]) {
                                                            myPlan['mb'][j]['ma'][k]['ew_post'] = emotionalWellBeingPost[myPlan['mb'][j]['ma'][k]['post_id']];
                                                            myPlan['mb'][j]['ma'][k]['ac']['activity_name'] = emotionalWellBeingPost[myPlan['mb'][j]['ma'][k]['post_id']]['title'];
                                                        }
                                                        if (allActivityData[activityId] && allActivityData[activityId][myPlan['mb'][j]['ma'][k]['post_id']]) {
                                                            let ewbActivityDone = allActivityData[activityId][myPlan['mb'][j]['ma'][k]['post_id']];
                                                            let countActData = await this.commonHealthService.countActData(ewbActivityDone, activityStartDate, activityEndDate, myPlan['mb'][j]['ma'][k]);
                                                            totalDate = countActData['date'];
                                                            totalAccount = countActData['total_account'];
                                                            activityData = {...activityData, type: 2, s_range : 0.99};
                                                        }
                                                    }
                                                } else if (activityId == 4887) {
                                                    if (activityData['type'] !== 1) {
                                                        if ((myPlan['mb'][j]['ma'][k].fpost_id == null && allActivityData['A-4887']) || (allActivityData[activityId] && allActivityData[activityId][myPlan['mb'][j]['ma'][k].fpost_id])) {
                                                            let fvActivityDone = myPlan['mb'][j]['ma'][k].fpost_id == null ? allActivityData['A-4887'] : allActivityData[activityId][myPlan['mb'][j]['ma'][k].fpost_id];
                                                            let countActData = await this.commonHealthService.countActData(fvActivityDone, activityStartDate, activityEndDate, myPlan['mb'][j]['ma'][k]);
                                                            totalDate = countActData['date'];
                                                            totalAccount = countActData['total_account'];
                                                            activityData = {...activityData, type: 2, s_range : 0.99};
                                                        }
                                                    }
                                                } else if (bodyFeedActivities.includes(activityId)) {
                                                    if (activityData['type'] !== 3) {
                                                        if (allActivityData['bodyFeeds'].length > 0) {
                                                            let bfActivityDone = allActivityData['bodyFeeds'];
                                                            let field = null;
                                                            let activityFieldMap = {21: 'weight', 22: 'waist', 23: 'body_fat', 25: 'calve', 26: 'chest', 27: 'arm', 28: 'hip', 30: 'leg'};
                                                            if (activityFieldMap.hasOwnProperty(activityId)) {
                                                                field = activityFieldMap[activityId];
                                                                if (activityId === 21) {
                                                                    bfActivityDone = bfActivityDone.reverse();
                                                                }
                                                            }
                                                            let totalAccountData: any = await this.commonHealthService.getPlanActivityData(bfActivityDone, activityStartDate, activityEndDate, field, 'bio', myPlan['mb'][j]['ma'][k]);
                                                            totalDate = totalAccountData['date'];
                                                            totalAccount = totalAccountData['total_account'];
                                                        }
                                                    }
                                                } else if (activityId == 4) {
                                                    if (activityData['type'] !== 2) {
                                                        let tbActivityDone = [];
                                                        if (allActivityData[12]) {
                                                            tbActivityDone = [...tbActivityDone, ...allActivityData[12]];
                                                        }
                                                        if (allActivityData[13]) {
                                                            tbActivityDone = [...tbActivityDone, ...allActivityData[13]];
                                                        }
                                                        if (allActivityData[14]) {
                                                            tbActivityDone = [...tbActivityDone, ...allActivityData[14]];
                                                        }
                                                        if (tbActivityDone.length > 0) {
                                                            let countActData = await this.commonHealthService.countActData(tbActivityDone, activityStartDate, activityEndDate, myPlan['mb'][j]['ma'][k]);
                                                            totalAccount = countActData['total_account'];
                                                            totalDate = countActData['date'];
                                                            if (activityData['s_range'] === 0) {
                                                                activityData = {...activityData, type: 2, s_range : 0.99};
                                                            }
                                                        }
                                                    }
                                                } else if (categoryId == 21 && activityData['type'] != 2) {
                                                    if (myPlan['mb'][j]['ma'][k]['is_category'] == 1) {
                                                        eCategoryId = eCategoryId.replace(/EVC/g, '').split(',');
                                                        if (eCategoryId.length === 1) {
                                                            eCategoryId = eCategoryId[0];
                                                        }
                                                        if (!Array.isArray(eCategoryId) && allActivityData['Events_category']?.[eCategoryId]) {
                                                            let evActivityDone = await this.commonDateService.countActDataEvent(allActivityData['Events_category'][eCategoryId], activityStartDate, activityEndDate, myPlan['mb'][j]['ma'][k]);
                                                            totalAccount = evActivityDone['total_account'];
                                                            totalDate = evActivityDone['date'];
                                                            activityData['type'] = 2;
                                                            activityData['s_range'] = myPlan['mb'][j]['ma'][k]['grater_than'];
                                                            if (myPlan['mb'][j]['ma'][k]['grater_than'] >= 1 &&
                                                                totalAccount < myPlan['mb'][j]['ma'][k]['grater_than'] + 1) {
                                                                totalAccount = 0;
                                                                totalDate = '';
                                                            }
                                                        } else {
                                                            for (let i = 0; i < eCategoryId.length; i++) {
                                                                const value = eCategoryId[i];
                                                                if (allActivityData?.['Events_category']?.[value]) {
                                                                    let evActivityDone = await this.commonDateService.countActDataEvent(allActivityData['Events_category'][value], activityStartDate, activityEndDate, myPlan['mb'][j]['ma'][k]);
                                                                    if (evActivityDone['total_account'] !== 0 && evActivityDone['date'] !== '') {
                                                                        totalAccount += evActivityDone['total_account'];
                                                                        totalDate = evActivityDone['date'];
                                                                    }
                                                                }
                                                            }
                                                            activityData['type'] = 2;
                                                            activityData['s_range'] = myPlan['mb'][j]['ma'][k]['grater_than'];
                                                            if (myPlan['mb'][j]['ma'][k]['grater_than'] >= 1 &&
                                                                totalAccount < myPlan['mb'][j]['ma'][k]['grater_than'] + 1) {
                                                                totalAccount = 0;
                                                                totalDate = '';
                                                            }
                                                        }
                                                    } else {
                                                        let activityIdSplit = (myPlan['mb'][j]?.['ma'][k]?.['org_activity_id'] || "").split(',');
                                                        if (activityIdSplit.length > 1) {
                                                            if (Object.keys(eventAllActivityIds).some(k => allActivityData['Events'][k] !== undefined)) {
                                                                let MEventIds = Object.keys(allActivityData['Events']).find(k => eventAllActivityIds[k] !== undefined);
                                                                let eventsActivityDone = await this.commonDateService.countActDataEvent(allActivityData['Events'][MEventIds], activityStartDate, activityEndDate, myPlan['mb'][j]['ma'][k]);
                                                                totalAccount = eventsActivityDone['total_account'];
                                                                totalDate = eventsActivityDone['date'];
                                                                activityData['type'] = 2;
                                                                activityData['s_range'] = myPlan['mb'][j]['ma'][k]['grater_than'];
                                                                if (myPlan['mb'][j]['ma'][k]['grater_than'] >= 1 && totalAccount < myPlan['mb'][j]['ma'][k]['grater_than'] + 1) {
                                                                    totalAccount = 0;
                                                                    totalDate = '';
                                                                }
                                                            }
                                                        } else {
                                                            if (allActivityData?.['Events']?.[activityId]) {
                                                                let eventActivityDone = await this.commonDateService.countActDataEvent(allActivityData['Events'][activityId], activityStartDate, activityEndDate, myPlan['mb'][j]['ma'][k]);
                                                                totalAccount = eventActivityDone['total_account'];
                                                                totalDate = eventActivityDone['date'];
                                                                activityData['type'] = 2;
                                                                activityData['s_range'] = myPlan['mb'][j]['ma'][k]['grater_than'];
                                                                if (myPlan['mb'][j]['ma'][k]['grater_than'] >= 1 && totalAccount < myPlan['mb'][j]['ma'][k]['grater_than'] + 1) {
                                                                    totalAccount = 0;
                                                                    totalDate = '';
                                                                }
                                                            }
                                                        }
                                                    }
                                                } else if (categoryId == -1 && activityData['type'] !== 3) {
                                                        if (emotionalResultDataEha[myPlan['mb'][j]['ma'][k]['org_activity_id']] == activityData['type']) {
                                                            activityData = {...activityData, type: 2, s_range : 0.99};
                                                            totalAccount = 1;
                                                        }
                                                } else if (categoryId == -2 && activityData['type'] !== 3 && hraAssessmentData) {
                                                    let hraActivityDone = await this.commonHealthService.countActDataHra(hraAssessmentData, activityStartDate, activityEndDate, myPlan['mb'][j]['ma'][k]);
                                                    totalAccount = hraActivityDone['total_account'];
                                                    totalDate = hraActivityDone['date'];
                                                    activityData = {...activityData, type: 2, s_range : 0.99};
                                                } else if (categoryId == -3 && activityData['type'] !== 3 && bioMetricDataAssessment.length > 0) {
                                                    let field = null;
                                                    const fieldMapping = {1: 'height', 2: 'weight', 3: 'bmi', 4: 'systolic', 5: 'diastolic', 6: 'blood_glucose', 7: 'alc', 8: 'total_cholesterol', 9: 'hdl', 10: 'ldl', 11: 'triglycerides', 12: 'waist', 26: 'fasting_blood_glucose'};
                                                    field = fieldMapping[myPlan['mb'][j]['ma'][k]['org_activity_id']];
                                                    let activityData = await this.commonHealthService.getPlanActivityData(bioMetricDataAssessment, activityStartDate, activityEndDate, field, 'bio', myPlan['mb'][j]['ma'][k]);
                                                    totalDate = activityData['date'];
                                                    totalAccount = activityData['total_account'];
                                                    if (field === 'height') {
                                                        totalAccount = Number((activityData['total_account'] ?? '0').toString().replace(':', '.').split('.').slice(0, 2).join('.'));
                                                    }
                                                } else if (categoryId == 8 && activityData['type'] !== 1 && allActivityData?.['Challenge']?.[myPlan['mb'][j]['ma'][k]['org_activity_id']] !== undefined) {
                                                    activityData = {...activityData, type: 2, s_range : 0.99};
                                                    totalAccount = 1;
                                                } else if (categoryId == 36 && activityData['type'] !== 3 && allActivityData['Quiz'][activityId] !== undefined) {
                                                        let quizActivityDone = await this.commonHealthService.countActDataQuiz(allActivityData['Quiz'][activityId], activityStartDate, activityEndDate, myPlan['mb'][j]['ma'][k]);
                                                        totalAccount = quizActivityDone['total_account'];
                                                        totalDate = quizActivityDone['date'];
                                                        activityData = {...activityData, type: 2, s_range : 0.99};
                                                } else {
                                                    if(activityData['type'] != 3 && allActivityData[activityId] && Object.keys(allActivityData[activityId]).length !== 0){
                                                        let activityDone = allActivityData[activityId];
                                                        activityDone = await this.commonHealthService.countActData(activityDone, activityStartDate, activityEndDate, myPlan['mb'][j]['ma'][k]);
                                                        if(categoryId === 43){
                                                            activityData = {...activityData, type: 2, s_range : 0.99};
                                                        }
                                                        totalAccount = activityDone['total_account'];
                                                        totalDate = activityDone['date'];
                                                    }
                                                }
                                                if (activityData['type'] != 3) {
                                                    if (allActivityData?.['Authorizations']?.[activityId]) {
                                                        let actActivityDone = allActivityData['Authorizations'][activityId];
                                                        actActivityDone = await this.commonHealthService.countActData(actActivityDone, activityStartDate, activityEndDate, myPlan['mb'][j]['ma'][k]); // assuming count_act_data is a defined function
                                                        let tmpPoints = actActivityDone['total_account'];
                                                        if (tmpPoints > 0) {
                                                            if (TrBiometricsData === 0) {
                                                                totalAccount = actActivityDone['total_account'];
                                                                totalDate = actActivityDone['date'];
                                                            } else {
                                                                if (![2, 3, 5].includes(activityId)) {
                                                                    totalAccount = actActivityDone['total_account'];
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                                if ((activityData['type'] === 0 && activityData['s_range'] === 0 && activityData['e_range'] === 0) || (activityData['type'] === 1 || activityData['s_range'] === 0)) {
                                                    activityData = {...activityData, type: 2, s_range : 0.99};
                                                }
                                                if (totalAccount !== 0 && ((activityData['type'] === 0 && totalAccount >= activityData['s_range'] && totalAccount <= activityData['e_range']) || (activityData['type'] === 1 && totalAccount < activityData['s_range']) || (activityData['type'] === 2 && totalAccount.toString().split('.').slice(0, 2).join('.') > activityData['s_range']))) {
                                                    if (!finalNotShowActivityIds.includes(myPlan['mb'][j]['ma'][k]['id'])) {
                                                        myPlan['mb'][j]['BlockCompleteActivity'] += 1;
                                                        myPlan['PlanCompleteActivity'] += 1;
                                                    }
                                                    myPlan['mb'][j]['activity_detail'] = myPlan['mb'][j]['activity_detail'] || {};
                                                    myPlan['mb'][j]['activity_detail'][myPlan['mb'][j]['ma'][k]['id']] = myPlan['mb'][j]['activity_detail'][myPlan['mb'][j]['ma'][k]['id']] || {}
                                                    myPlan['mb'][j]['activity_detail'][myPlan['mb'][j]['ma'][k]['id']]['log_date'] = await this.commonDateService.DateTimeFormat(totalDate,'YYYY-MM-DD','MM-DD-YYYY');
                                                    myPlan['mb'][j]['activity_detail'][myPlan['mb'][j]['ma'][k]['id']]['log_value'] = totalAccount;
                                                    myPlan['mb'][j]['ma'][k]['completeper'] = 100;
                                                }
                                                if (!myPlan['mb'][j]['ma'][k]['completeper']) {
                                                    if (activityData['type'] === 2) {
                                                        activityData['s_range'] = activityData['s_range'] + 1;
                                                    }
                                                    myPlan['mb'][j]['ma'][k]['completeper'] = (activityData['s_range'] !== 0 && totalAccount < activityData['s_range']) ? Math.round((totalAccount * 100) / activityData['s_range']) : 0;
                                                }
                                                if (myPlan['mb'][j]['ma'][k]['completeper']){
                                                    completeActivityIds.push(myPlan['mb'][j]['ma'][k]['id']);
                                                }
                                            }
                                            if (finalNotShowActivityIds.includes(myPlan['mb'][j]['ma'][k]['id'])) {
                                                myPlan['mb'][j]['BlockTotalActivity'] -= 1;
                                                myPlan['PlanTotalActivity'] -= 1;
                                            }
                                            myPlan['mb'][j]['ma'][k]['activity_name'] = myPlan['mb'][j]['ma'][k]['maa']['name'] || myPlan['mb'][j]['ma'][k]['ac']['activity_name'];
                                            if(myPlan['mb'][j]['ma'][k]['activity_name']){
                                                let customName = await this.translatorService.frontendReadTranslation(req.lang,`activity_name_${myPlan['mb'][j]['mab']['id']}_${myPlan['mb'][j]['ma'][k]['maa']['id']}_${postData?.org_id}`,`/LC_MESSAGES/MyPlan/MyPlan/${postData?.org_id}/${myPlan['map']['id']}`,`dynamic`);
                                                myPlan['mb'][j]['ma'][k]['activity_name'] = (customName == '' || customName == `activity_name_${myPlan['mb'][j]['mab']['id']}_${myPlan['mb'][j]['ma'][k]['maa']['id']}_${postData?.org_id}`) ? myPlan['mb'][j]['ma'][k]['activity_name'] : customName;
                                            }
                                            if (myPlan['mb'][j]['ma'][k]['button_text']) {
                                                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`button_text_${myPlan['mb'][j]['mab']['id']}_${myPlan['mb'][j]['ma'][k]['maa']['id']}_${req?.tokenUser?.org_id}`,`/LC_MESSAGES/MyPlan/MyPlan/${req?.tokenUser?.org_id}/${myPlan['map']['id']}`,`dynamic`);
                                                myPlan['mb'][j]['ma'][k]['button_text'] = (customeName == '' || customeName == `button_text_${myPlan['mb'][j]['mab']['id']}_${myPlan['mb'][j]['ma'][k]['maa']['id']}_${req?.tokenUser?.org_id}`) ? myPlan['mb'][j]['ma'][k]['button_text'] : customeName;
                                            }
                                            myPlan['mb'][j]['ma'][k]['button_text'] = myPlan['mb'][j]['ma'][k]['button_text'] || await this.translatorService.frontendReadTranslation(req.lang,'Click here', `/LC_MESSAGES/MyPlan/MyPlan`,`static`);
                                            myPlan['mb'][j]['ma'][k]['activity_description'] = null;
                                            myPlan['mb'][j]['ma'][k]['category_status'] = 0;
                                            myPlan['mb'][j]['ma'][k]['internal_like'] = null;
                                            myPlan['mb'][j]['ma'][k]['oa'] = null;
                                            let newLinkPath = await this.urlManageService.onmapUrl(myPlan['mb'][j]['ma'][k]['link']);
                                            myPlan['mb'][j]['ma'][k]['link'] = newLinkPath;
                                            if (!finalNotShowActivityIds.includes(myPlan['mb'][j]['ma'][k]['id']) && categoryId) {
                                                let { activityDescription, categoryStatus, internalLike, internalLink, buttonText, activityName, buttonStatus, startMarkComplete, endMarkComplete, activityButtonText, uploadText } = await this.commonDateService.commonActivityFunction(userTimeZone,myPlan['mb'][j]['ma'][k],myPlan,tempLinks,req,interLinksData)
                                                myPlan['mb'][j]['ma'][k]['activity_description'] = activityDescription;
                                                myPlan['mb'][j]['ma'][k]['category_status'] = categoryStatus;
                                                myPlan['mb'][j]['ma'][k]['internal_like'] = internalLike;
                                                myPlan['mb'][j]['ma'][k]['internal_link'] = internalLink;
                                                myPlan['mb'][j]['ma'][k]['button_text'] = buttonText;
                                                myPlan['mb'][j]['ma'][k]['activity_name'] = activityName;
                                                myPlan['mb'][j]['ma'][k]['button_status'] = buttonStatus;
                                                myPlan['mb'][j]['ma'][k]['start_mark_complete'] = startMarkComplete;
                                                myPlan['mb'][j]['ma'][k]['end_mark_complete'] = endMarkComplete;
                                                myPlan['mb'][j]['ma'][k]['activity_button_text'] = activityButtonText;
                                                myPlan['mb'][j]['ma'][k]['upload_text'] = uploadText;
                                            }
                                            if (myPlan['mb'][j]['ma'][k]['option_activity_ids'] && !myPlan['mb'][j]['ma'][k]['mca']) {
                                                let subOptionActivity = myPlan['mb'][j]['ma'][k]['option_activity_ids'].split(",").map(Number);
                                                let exitInCompleteActivity = subOptionActivity.filter(value => completeActivityIds.includes(value));
                                                if (exitInCompleteActivity.length > 0) {
                                                    myPlan['mb'][j]['ma'][k]['completeper'] = 100;
                                                    myPlan['mb'][j]['BlockCompleteActivity'] += 1;
                                                    myPlan['PlanCompleteActivity'] += 1;
                                                    if (myPlan['mb'][j]['ma'][k]['completeper'] === 100 && !myPlan['mb'][j]['ma'][k]['mca']) {
                                                        let data = {
                                                            'user_id': postData?.user_id,
                                                            'custom_id': myPlan['mb'][j]['ma'][k]['id'],
                                                            'activity_id': -1,
                                                            'created_by': postData?.user_id,
                                                            'status': 1,
                                                            'source': 1
                                                        };
                                                        await this.myPlanCompleteActivityService.save({...data});
                                                        data = undefined;
                                                    }
                                                }
                                            }
                                        }
                                        /* activity percentage complete wise set */
                                        let tmpData10Comp = [],tmpData50Comp = [],tmpData100Comp = [];
                                        let currentDate = new Date().setHours(0,0,0,0);
                                        let activityObj = myPlan['mb'][j]['ma'];
                                        for(let i: number=0; i < Object.keys(activityObj).length; i++) {
                                            let advalue = activityObj[Object.keys(activityObj)[i]];
                                            if(advalue['completeper'] === 100){
                                                tmpData100Comp.push(advalue);
                                            } else {
                                                if(currentDate > new Date(advalue['end_date']).setHours(0,0,0,0)){
                                                    tmpData10Comp.push(advalue);
                                                } else {
                                                    tmpData50Comp.push(advalue);
                                                }
                                            }
                                        }
                                        myPlan['mb'][j]['ma'] = [...tmpData50Comp, ...tmpData10Comp, ...tmpData100Comp];
                                        myPlan['mb'][j]['final_not_show_activity_ids'] = finalNotShowActivityIds;
                                    }
                                    if (myPlan['map']['completion_on'] === 1 && myPlan['map']['c_range'] >= 1 && myPlan['map']['c_range'] < myPlan['mb'][j]['BlockTotalActivity']) {
                                        myPlan['mb'][j]['BlockTotalActivity'] = myPlan['map']['c_range'];
                                        if (myPlan['mb'][j]['BlockCompleteActivity'] > myPlan['mb'][j]['BlockTotalActivity']) {
                                            myPlan['mb'][j]['BlockCompleteActivity'] = myPlan['mb'][j]['BlockTotalActivity'];
                                        }
                                    }
                                    let tempBlockComplete: any = {};
                                    if ((myPlan['mb'][j]['BlockTotalActivity'] !== 0 && myPlan['mb'][j]['BlockTotalActivity'] === myPlan['mb'][j]['BlockCompleteActivity'])) {
                                        if (myPlan['mb'][j]['mcb'] && myPlan['mb'][j]['mcb']['status'] === 0) {
                                            tempBlockComplete['id'] = myPlan['mb'][j]['mcb']['id'];
                                            tempBlockComplete['activity_detail'] = JSON.stringify(myPlan['mb'][j]['activity_detail']);
                                            tempBlockComplete['complete_date'] = await this.commonDateService.DateTimeFormat(new Date(),'YYYY-MM-DD HH:mm:ss');
                                            tempBlockComplete['status'] = 1;
                                        }
                                        if (!myPlan['mb'][j]['mcb']) {
                                            tempBlockComplete['plan_id'] = myPlan['mb'][j]['plan_id'];
                                            tempBlockComplete['block_id'] = myPlan['mb'][j]['id'];
                                            tempBlockComplete['activity_id'] = myPlan['mb'][j]['mab']['activity_id'];
                                            tempBlockComplete['user_id'] = postData?.user_id;
                                            tempBlockComplete['activity_detail'] = JSON.stringify(myPlan['mb'][j]['activity_detail']);
                                        }
                                    } else if (myPlan['mb'][j]['activity_detail']) {
                                        if (myPlan['mb'][j]['mcb']?.['id']) {
                                            tempBlockComplete['id'] = myPlan['mb'][j]['mcb']['id']
                                        }
                                        tempBlockComplete['plan_id'] = myPlan['mb'][j]['plan_id'];
                                        tempBlockComplete['block_id'] = myPlan['mb'][j]['id'];
                                        tempBlockComplete['activity_id'] = myPlan['mb'][j]['mab']['activity_id'];
                                        tempBlockComplete['user_id'] = userId;
                                        tempBlockComplete['status'] = 0;
                                        tempBlockComplete['activity_detail'] = JSON.stringify(myPlan['mb'][j]['activity_detail']);
                                    }
                                    if (myPlan['mb'][j]['BlockCompleteActivity'] !== 0) {
                                        myPlan['mb'][j]['BlockTotalActivityper'] = Math.round(((myPlan['mb'][j]['BlockCompleteActivity'] * 100) / myPlan['mb'][j]['BlockTotalActivity']));
                                    }
                                    if (typeof tempBlockComplete !== 'undefined' && Object.keys(tempBlockComplete).length > 0) {
                                        if (tempBlockComplete?.id) {
                                            await this.myPlanCompleteBlockService.update({id: tempBlockComplete?.id},{...tempBlockComplete});
                                        } else {
                                            await this.myPlanCompleteBlockService.save({...tempBlockComplete});
                                        }
                                        tempBlockComplete = {};
                                    }
                                    [myPlan['mb'][j]['plan_msg'], myPlan['mb'][j]['plan_label'], myPlan['mb'][j]['plan_dates']] = [null, null, null];
                                    myPlan['mb'][j]['plan_msg'] = `${await this.translatorService.frontendReadTranslation(req.lang,'You have completed', `/LC_MESSAGES/MyPlan/MyPlan`,`static`)} ${(myPlan['mb'][j]['BlockCompleteActivity'] || 0)} ${await this.translatorService.frontendReadTranslation(req.lang,'out of the', `/LC_MESSAGES/MyPlan/MyPlan`,`static`)} ${(myPlan['mb'][j]['BlockTotalActivity'] || 0)} ${await this.translatorService.frontendReadTranslation(req.lang,'tasks', `/LC_MESSAGES/MyPlan/MyPlan`,`static`)}`;
                                    myPlan['mb'][j]['plan_label'] = `${(myPlan['mb'][j]['BlockTotalActivityper'] >= 100) ? `${await this.translatorService.frontendReadTranslation(req.lang,'Completed', `/LC_MESSAGES/MyPlan/MyPlan`,`static`)}` : ((planActivityDefine.length && planLabelData && planActivityDefine.some(item => item.activity_id == value.map.activity_id)) ? planLabelData['required'] : appendPlanActivityDefine['label'])}`;
                                    if(myPlan['mb'][j] && myPlan['mb'][j]['start_date'] && myPlan['mb'][j]['end_date']){
                                        let startDateMonth:any = await this.commonDateService.DateTimeFormat(myPlan['mb'][j]['start_date'], 'MMMM');
                                        let startDateApiMonth:any = await this.commonDateService.DateTimeFormat(myPlan['mb'][j]['start_date'], 'MMM');
                                        startDateMonth = await this.translatorService.frontendReadTranslation(req.lang, startDateMonth.toString(), `/LC_MESSAGES/Common/Month`,`static`);
                                        startDateApiMonth = await this.translatorService.frontendReadTranslation(req.lang, startDateApiMonth.toString(), `/LC_MESSAGES/Common/Month`,`static`);
                                        let endDateMonth:any = await this.commonDateService.DateTimeFormat(myPlan['mb'][j]['end_date'], 'MMMM');
                                        let endDateApiMonth:any = await this.commonDateService.DateTimeFormat(myPlan['mb'][j]['end_date'], 'MMM');
                                        endDateMonth = await this.translatorService.frontendReadTranslation(req.lang, endDateMonth.toString(), `/LC_MESSAGES/Common/Month`,`static`);
                                        endDateApiMonth = await this.translatorService.frontendReadTranslation(req.lang, endDateApiMonth.toString(), `/LC_MESSAGES/Common/Month`,`static`);
                                        myPlan['mb'][j]['plan_dates'] = `${startDateMonth + ' ' + await this.commonDateService.DateTimeFormat(myPlan['mb'][j]['start_date'], 'D, YYYY')} - ${endDateMonth + ' ' + await this.commonDateService.DateTimeFormat(myPlan['mb'][j]['end_date'], 'D, YYYY')}`;
                                        myPlan['mb'][j]['api_plan_dates'] = `${startDateApiMonth + ' ' + await this.commonDateService.DateTimeFormat(myPlan['mb'][j]['start_date'], 'D, YYYY')} - ${endDateApiMonth + ' ' + await this.commonDateService.DateTimeFormat(myPlan['mb'][j]['end_date'], 'D, YYYY')}`;
                                    }
                                }
                            }
                            if (myPlan['map']?.display_block == 0 && myPlan['mb']?.length > 1) {
                                const mergedMa = [...myPlan['mb'][0].ma];
                                for (let i: number = 1; i < myPlan['mb']?.length; i++) {
                                    if (Array.isArray(myPlan['mb'][i]?.ma)) {
                                        mergedMa.push(...myPlan['mb'][i]?.ma);
                                    }
                                }
                                myPlan['mb'] = [ { ...myPlan['mb'][0], ma: mergedMa } ];
                            }
                            if (myPlan['map']['completion_on'] == 1 && myPlan['map']['c_range'] >= 1 && myPlan['map']['c_range'] < myPlan['PlanTotalActivity']) {myPlan['PlanTotalActivity'] = myPlan['map']['c_range'];
                                if (myPlan['PlanCompleteActivity'] > myPlan['PlanTotalActivity']) {
                                    myPlan['PlanCompleteActivity'] = myPlan['PlanTotalActivity'];
                                }
                            }
                            if (myPlan['PlanCompleteActivity'] !== 0) {
                                myPlan['TotalActivityper'] = Math.round(((myPlan['PlanCompleteActivity'] * 100) / myPlan['PlanTotalActivity']));
                            }
                            if (myPlan['PlanTotalActivity'] !== 0 && myPlan['PlanTotalActivity'] == myPlan['PlanCompleteActivity']) {
                                if (myPlan['jup']['is_complete'] == 0) {
                                    myPlan['jup']['complete_date'] = await this.commonDateService.DateTimeFormat(new Date(),'YYYY-MM-DD HH:mm:ss');
                                }
                                myPlan['jup']['is_complete'] = 1;
                                myPlan['jup']['progress'] = 100;
                                if (myPlan?.['jup']?.['id']) {
                                    await this.myPlanJoinUserPlanService.update({id: myPlan['jup']['id']},{...myPlan['jup']});
                                } else {
                                    await this.myPlanJoinUserPlanService.save({...myPlan['jup']});
                                }
                            } else {
                                if (myPlan['PlanTotalActivity'] !== 0 && myPlan['TotalActivityper'] !== 0 && myPlan['TotalActivityper'] !== myPlan['jup']['progress']) {
                                    myPlan['jup']['progress'] = Math.round(myPlan['TotalActivityper']);
                                    if (myPlan?.['jup']?.['id']) {
                                        await this.myPlanJoinUserPlanService.update({id: myPlan['jup']['id']},{...myPlan['jup']});
                                    } else {
                                        await this.myPlanJoinUserPlanService.save({...myPlan['jup']});
                                    }
                                }
                            }
                        }
                        return myPlan
                    }
                    if (value['start_date'] && value['end_date']) {
                        value = await commonActivity(postData?.org_id,membershipCode,activePlugin,postData?.user_id,value,defaultDesc)
                    }
                    if (value && value['mb']) {
                        for (let i: number = 0; i < value['mb'].length; i++) {
                            if (value['mb'][i]['ma']) {
                                let finalNotShowActivityIds = value['mb'][i]['final_not_show_activity_ids'];
                                let keyMyActivityData = {};
                                for (let j: number = 0; j < value['mb'][i]['ma'].length; j++) {
                                    if (finalNotShowActivityIds?.includes(value['mb'][i]['ma'][j]['id'])) {
                                        keyMyActivityData[value['mb'][i]['ma'][j]['id']] = value['mb'][i]['ma'][j];
                                        value['mb'][i]['ma'].splice(j, 1);
                                        j--;
                                    }
                                }
                                for (let j: number = 0; j < value['mb'][i]['ma'].length; j++) {
                                    if (value['mb'][i]['ma'][j]['completeper'] == 100 && value['mb'][i]['ma'][j]['module_id'] == 1 && value['mb'][i]['ma'][j]['mca'] && value['mb'][i]['ma'][j]['Events']) {
                                        let eventCusPoint = {
                                            user_id : postData?.user_id,
                                            custom_id : value['mb'][i]['ma'][j]['id'],
                                            created_by : postData?.user_id,
                                            source : 1,
                                            status : 1,
                                        }
                                        await this.myPlanCompleteActivityService.save({...eventCusPoint});
                                    }
                                    if (value['mb'][i]['ma'][j] && value['mb'][i]['ma'][j]['start_date'] && value['mb'][i]['ma'][j]['end_date'] && value['jup'] && (await this.commonDateService.DateTimeFormat(value['mb'][i]['ma'][j]['end_date'], 'timestamp','YYYY-MM-DD HH:mm:ss') > await this.commonDateService.DateTimeFormat(value['jup']['created'], 'timestamp','YYYY-MM-DD HH:mm:ss'))) {
                                        let startDateMonth:any = await this.commonDateService.DateTimeFormat(value['mb'][i]['ma'][j]['start_date'], 'MMMM');
                                        let startDateApiMonth:any = await this.commonDateService.DateTimeFormat(value['mb'][i]['ma'][j]['start_date'], 'MMM');
                                        startDateMonth = await this.translatorService.frontendReadTranslation(req.lang, startDateMonth.toString(), `/LC_MESSAGES/Common/Month`,`static`);
                                        startDateApiMonth = await this.translatorService.frontendReadTranslation(req.lang, startDateApiMonth.toString(), `/LC_MESSAGES/Common/Month`,`static`);
                                        let endDateMonth:any = await this.commonDateService.DateTimeFormat(value['mb'][i]['ma'][j]['end_date'], 'MMMM');
                                        let endDateApiMonth:any = await this.commonDateService.DateTimeFormat(value['mb'][i]['ma'][j]['end_date'], 'MMM');
                                        endDateMonth = await this.translatorService.frontendReadTranslation(req.lang, endDateMonth.toString(), `/LC_MESSAGES/Common/Month`,`static`);
                                        endDateApiMonth = await this.translatorService.frontendReadTranslation(req.lang, endDateApiMonth.toString(), `/LC_MESSAGES/Common/Month`,`static`);
                                        value['mb'][i]['ma'][j]['plan_dates'] = `${startDateMonth + ' ' + await this.commonDateService.DateTimeFormat(value['mb'][i]['ma'][j]['start_date'], 'D, YYYY')} - ${endDateMonth + ' ' + await this.commonDateService.DateTimeFormat(value['mb'][i]['ma'][j]['end_date'], 'D, YYYY')}`;
                                        value['mb'][i]['ma'][j]['api_plan_dates'] = `${startDateApiMonth + ' ' + await this.commonDateService.DateTimeFormat(value['mb'][i]['ma'][j]['start_date'], 'D, YYYY')} - ${endDateApiMonth + ' ' + await this.commonDateService.DateTimeFormat(value['mb'][i]['ma'][j]['end_date'], 'D, YYYY')}`;
                                    }
                                    value['mb'][i]['ma'][j]['plan_label'] = "";
                                    if(value['mb'][i]['ma'][j]['completeper'] >= 100){
                                        value['mb'][i]['ma'][j]['plan_label'] = await this.translatorService.frontendReadTranslation(req.lang,"Completed", `/LC_MESSAGES/MyPlan/MyPlan`,`static`);
                                        if (value['mb'][i]['ma'][j]?.['custom_completion'] === 1) {
                                            let labelTextObj = {0: 'Pending',1: 'Approved',2: 'Decline'};
                                            value['mb'][i]['ma'][j]['plan_label'] = await this.translatorService.frontendReadTranslation(req.lang,labelTextObj[value['mb'][i]['ma'][j]['mca']['status']], `/LC_MESSAGES/MyPlan/MyPlan`,`static`);
                                        }
                                    }
                                    let optionActivityIds: any[];
                                    if (value['mb'][i]['ma'][j]['option_activity_ids']) {
                                        optionActivityIds = (value['mb'][i]?.['ma'][j]?.['option_activity_ids'] || "").split(',');
                                    }
                                    if (optionActivityIds) {
                                        value['mb'][i]['ma'][j]['oa'] = [];
                                        let option: number = 1;
                                        for (let key: number = 0; key <  optionActivityIds.length; key++) {
                                            if (keyMyActivityData[optionActivityIds[key]]) {
                                                let keySingleMyActivityData = keyMyActivityData[optionActivityIds[key]];
                                                if ( optionActivityIds.includes(keySingleMyActivityData['id'].toString())) {
                                                    if (keySingleMyActivityData['ac']['category_id']) {
                                                        let { activityDescription, categoryStatus, internalLike, internalLink, buttonText, activityName, description, mca, buttonStatus, startMarkComplete, endMarkComplete, activityButtonText, uploadText, customCompletion } = await this.commonDateService.commonActivityFunction(userTimeZone,keySingleMyActivityData,value,tempLinks, req,interLinksData)
                                                        value['mb'][i]['ma'][j]['oa'].push({'activity_description': activityDescription,'category_status': categoryStatus,'internal_like': internalLike,'internal_link': internalLink,'button_text': buttonText,'activity_name': `${await this.translatorService.frontendReadTranslation(req.lang,'Option', `/LC_MESSAGES/MyPlan/MyPlan`,`static`)} ${option} - ${activityName}`,'description': description,'add_image': keySingleMyActivityData['add_image'],'hide_button': keySingleMyActivityData['hide_button'],'wtypeunit': keySingleMyActivityData['wtypeunit'], 'mca': mca, 'button_status': buttonStatus, 'start_mark_complete': startMarkComplete, 'end_mark_complete': endMarkComplete, 'activity_button_text': activityButtonText, 'upload_text': uploadText, 'custom_completion': customCompletion});
                                                    }
                                                }
                                                option++;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                let UserPlanProgress: number = (value.jup && await this.commonService.isValidNumber(value.jup.progress)) ? Math.round(value.jup.progress) : 0;
                [value.plan_msg, value.plan_label, value.plan_dates,value.api_plan_dates] = [null,null, null, null];
                if (value.jup) {
                    value.plan_msg = `${await this.translatorService.frontendReadTranslation(req.lang,'You have completed', `/LC_MESSAGES/MyPlan/MyPlan`,`static`)} ${(value.PlanCompleteActivity || 0)} ${await this.translatorService.frontendReadTranslation(req.lang,'out of the', `/LC_MESSAGES/MyPlan/MyPlan`,`static`)} ${(value.PlanTotalActivity || 0)} ${(value.PlanTotalActivity > 1 ? await this.translatorService.frontendReadTranslation(req.lang,'activities', `/LC_MESSAGES/MyPlan/MyPlan`,`static`) : await this.translatorService.frontendReadTranslation(req.lang,'activity', `/LC_MESSAGES/MyPlan/MyPlan`,`static`))}.`;
                    value.plan_label = `${(UserPlanProgress >= 100) ? await this.translatorService.frontendReadTranslation(req.lang,'Completed', `/LC_MESSAGES/MyPlan/MyPlan`,`static`) : ((planActivityDefine.length && planLabelData && planActivityDefine.some(item => item.activity_id == value.map.activity_id)) ? planLabelData['required'] : appendPlanActivityDefine['label'])}`;
                    if(value && value.start_date && value.end_date){
                        let startDateMonth:any = await this.commonDateService.DateTimeFormat(value.start_date, 'MMMM','MMMM D, YYYY');
                        let startDateApiMonth:any = await this.commonDateService.DateTimeFormat(value.start_date, 'MMM','MMMM D, YYYY');
                        startDateMonth = await this.translatorService.frontendReadTranslation(req.lang, startDateMonth.toString(), `/LC_MESSAGES/Common/Month`,`static`);
                        startDateApiMonth = await this.translatorService.frontendReadTranslation(req.lang, startDateApiMonth.toString(), `/LC_MESSAGES/Common/Month`,`static`);
                        let endDateMonth:any = await this.commonDateService.DateTimeFormat(value.end_date, 'MMMM','MMMM D, YYYY');
                        let endDateApiMonth:any = await this.commonDateService.DateTimeFormat(value.end_date, 'MMM','MMMM D, YYYY');
                        endDateMonth = await this.translatorService.frontendReadTranslation(req.lang, endDateMonth.toString(), `/LC_MESSAGES/Common/Month`,`static`);
                        endDateApiMonth = await this.translatorService.frontendReadTranslation(req.lang, endDateApiMonth.toString(), `/LC_MESSAGES/Common/Month`,`static`);
                        value.plan_dates = `${startDateMonth + ' ' + await this.commonDateService.DateTimeFormat(value.start_date, 'D, YYYY','MMMM D, YYYY')} - ${endDateMonth + ' ' + await this.commonDateService.DateTimeFormat(value.end_date, 'D, YYYY','MMMM D, YYYY')}`;
                        value.api_plan_dates = `${startDateApiMonth + ' ' + await this.commonDateService.DateTimeFormat(value.start_date, 'D, YYYY','MMMM D, YYYY')} - ${endDateApiMonth + ' ' + await this.commonDateService.DateTimeFormat(value.end_date, 'D, YYYY','MMMM D, YYYY')}`;
                    }
                    value.plan_button_text = await this.translatorService.frontendReadTranslation(req.lang,'View Your Progress', `/LC_MESSAGES/MyPlan/MyPlan`,`static`);
                } else {
                    value.plan_button_text = await this.translatorService.frontendReadTranslation(req.lang,'Start Plan', `/LC_MESSAGES/MyPlan/MyPlan`,`static`);
                }
                delete value?.mar;
                return new Promise((resolve) => { resolve(value); });
            };
            if(postData?.is_sanmateo != 1){
                myPlans = [];
            }
            let activityData = await this.activityService.listRecord({status: '1'},{id: "DESC"}, ["id","category_id"]);
            let categoryIds: any[] = [], defaultDesc: any[] = [];
            if (myPlans) {
                defaultDesc = await this.myPlanDescriptionService.listRecord({ organization_id: postData?.org_id, status: '1'}, ['id', 'description','module_id','organization_id']);
                await Promise.all(defaultDesc.map(async (ele)=>{
                    if(ele.description){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`description_${ele['module_id']}`, `/LC_MESSAGES/MyPlan/PlanDescription/${ele['organization_id']}`,`dynamic`);
                        ele.description = (customeName == '' || customeName == `description_${ele['module_id']}`) ? ele['description'] : customeName;
                    }
                }));
            }
            let planIdArray: number[] = [];
            for (let i: number = 5; i < userPlans.length; i++) {
                planIdArray.push(userPlans[i].id);
            }
            userPlans = userPlans.slice(0, 5);
            if (userPlans) {
                userPlans = await Promise.all(userPlans.map(userPlansFunction));
            }
            let completion = null;
            if (comMsgShowHide && comMsgShowHide == 'yes' && postData?.org_id == 804) {
                completion = planLabelData['completion']
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: {data: (userPlans.length > 0 ? userPlans : null),id: planIdArray,plan_text: planLabelData['plantext'],completion: completion? completion : '',my_plans_flag: myPlansFlag },
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