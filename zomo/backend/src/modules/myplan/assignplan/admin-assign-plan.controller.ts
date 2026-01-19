import {
    appConstant,
    AssessmentEmotionalAssessmentEntity,
    AssessmentsEntity,
    AuthorizationsEntity,
    BiometricsEntity,
    CampaignEntity,
    CommonDateService,
    CommonHealthService,
    CommonService,
    MyPlanAssignUserPlanEntity,
    MyPlanJoinUserPlanEntity,
    tableConstant,
    UserEntity
} from '@common-constants';
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
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { In, IsNull, LessThanOrEqual, MoreThanOrEqual, Not, Raw } from "typeorm";
import {AccessGuard, RoleGuard, TokenGuard} from '../../../guard';
import { ScheduleChallengeJoinUsersService } from '../../challenge/schedulechallengejoinusers/schedulechallengejoinusers.service';
import { CompanyService } from '../../company/companies/company.service';
import { InterlinksService } from "../../company/interlinks/interlinks.service";
import { MetaService } from "../../company/meta/meta.service";
import { WellBeingCategoryService } from "../../emotionalwellbeing/wellbeingcategory/wellbeingcategory.service";
import { AuthorizationsService } from '../../healthcheckup/authorizations/authorizations.service';
import { BiometricsService } from '../../healthcheckup/biometrics/biometrics.service';
import { TobaccoUsesService } from '../../healthcheckup/tobaccouses/tobaccouses.service';
import { QuickLinkClicksService } from '../../quicklink/quicklinkclicks/quicklinkclicks.service';
import { UserDetailsService } from '../../quiz/userdetails/userdetails.service';
import { FoodFeedService } from "../../trackers/foodfeeds/foodfeeds.service";
import { TranslationService } from "../../translation/translation.service";
import { MyPlanAssignUserPlanService } from "../assignuserplan/assignuserplan.service";
import { FrontService } from "../front/front.service";
import { MyPlanJoinUserPlanService } from "../joinuserplan/joinuserplan.service";
import { MyPlanPlansService } from "../plans/plans.service";
import { UrlManageService } from 'src/modules/common';
import {CampaignService} from "../../campaign/campaign/campaign.service";
import {AssessmentEmotionalAssessmentService} from "../../healthassessment/assessmentemotionalassessment/assessmentemotionalassessment.service";
import { AssessmentsService } from '../../healthassessment/assessments/assessments.service';
import {EventUserBookingListsService} from "../../events/userbookinglists/userbookinglists.service";
import {UserService} from "../../user/user/user.service";
import {MyPlanAssignRuleService} from "../assignrule/assignrule.service";
import {assignPlanInput} from "@/modules/myplan/assignplan/inputs";
import {assignPlanInterface} from "../../../interface";
const S3_URL =  process.env.S3_URL_PROD

@Controller('my-plan/assign-plan')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class MyPlanAssignPlanAdminController {
    constructor(
        private readonly commonService: CommonService,
        private readonly commonDateService: CommonDateService,
        private readonly commonHealthService: CommonHealthService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly companyService: CompanyService,
        private readonly myPlanPlansService: MyPlanPlansService,
        private readonly companyMetaService: MetaService,
        private readonly myPlanAssignUserPlanService: MyPlanAssignUserPlanService,
        private readonly myPlanJoinUserPlanService: MyPlanJoinUserPlanService,
        private readonly tobaccoUsesService: TobaccoUsesService,
        private readonly authorizationsService: AuthorizationsService,
        private readonly biometricsService: BiometricsService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly quickLinkClicksService: QuickLinkClicksService,
        private readonly userDetailsService: UserDetailsService,
        private readonly foodFeedsService: FoodFeedService,
        private readonly wellBeingCategoryService: WellBeingCategoryService,
        private readonly interlinksService: InterlinksService,
        private readonly frontService: FrontService,
        private readonly urlManageService: UrlManageService,
        private readonly campaignService: CampaignService,
        private readonly assessmentEmotionalAssessmentService: AssessmentEmotionalAssessmentService,
        private readonly assessmentsService: AssessmentsService,
        private readonly eventUserBookingListsService: EventUserBookingListsService,
        private readonly userService: UserService,
        private readonly myPlanAssignRuleService: MyPlanAssignRuleService,
    ) {}
    @Post('admin-plan')
    async adminPlan(@Req() req: Request, @Res() res: Response, @Body() postData: assignPlanInput) {
        try {
            if (!postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let getUser: UserEntity | null= await this.userService.getOne({id: postData.user_id},['org_id','timezone','department_id','location','gender','insurance_plan_name','dob'])
            if (!getUser) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            let insurancePlanName = getUser?.insurance_plan_name || '';
            let userTimeZone = await this.commonDateService.DateTimeFormat(new Date(),'YYYY-MM-DD HH:mm:ss','YYYY-MM-DD HH:mm:ss',getUser?.timezone || 'UTC');
            let timeZone = getUser?.timezone || 'UTC';
            let userDateTimeZone = await this.commonDateService.DateTimeFormat(userTimeZone,'YYYY-MM-DD','YYYY-MM-DD HH:mm:ss');
            let dob = await this.commonDateService.DateTimeFormat(new Date(getUser?.dob), 'YYYY-MM-DD');
            let bDay = await this.commonDateService.numOfYears(dob,userDateTimeZone);
            let userGender = appConstant.GENDER_MAP[getUser?.gender] || 0;
            let departmentId = getUser?.department_id;
            let locationId = getUser?.location;
            const assignUserPlan: MyPlanAssignUserPlanEntity = await this.myPlanAssignUserPlanService.findOne({ user_id: postData?.user_id, status: Not('2')});
            let autoPlan: number[] = [],autoRemovePlan: number[] = [];
            if (assignUserPlan) {
                const { plan_id, gc_plan_id, gc_plan_remove } = assignUserPlan;
                const parseOrDefault = (input: string | undefined) => input ? JSON.parse(input).map(Number) : [];
                autoPlan = [...parseOrDefault(plan_id), ...parseOrDefault(gc_plan_id)];
                autoRemovePlan = parseOrDefault(gc_plan_remove);
                autoPlan = autoPlan.filter((val) => !autoRemovePlan.includes(val));
            }
            let otherDataPass: any = {}
            otherDataPass['bio_data'] = appConstant.BIO_DATA_LIST;
            let where = `plans.status = '1' AND map.status = '1' AND map.org_id = '${getUser?.org_id}'`;
            let tmpPlans = await this.myPlanPlansService.commonQueryBuilder(["map.name","map.id","map.activity_id","map.based_on","map.display_block","map.startdate","map.enddate","map.completion_base","map.display_plan_to","map.display_plan_to_health","map.display_plan_to_health_source","map.completion_on","map.join_based_on","map.c_range","map.frequency_base","map.f_range","plans.id","plans.name","plans.description","plans.created_by","plans.icon","mb.id","mb.order_id","mb.name","mb.plan_id","mb.icon","mb.description","ma.id","ma.block_id","ma.wellbeing_category_id","ma.display_type","ma.org_activity_id","ma.activity_id","ma.is_category","ma.icon","ma.post_id","ma.fpost_id","ma.s_range","ma.e_range","ma.module_id","ma.option_activity_ids","ma.type","ma.healthplan","ma.healthplan_name","ma.age_e_range","ma.age_s_range","ma.gender","ma.age","ma.ageoption","ma.button_text","ma.link","ma.link_type","ma.link_id","ma.description","ma.add_image","ma.hide_button","ma.wtype","ma.wtypeunit","ma.upload_text","ma.frequency_base","ma.days","ma.f_range","ma.video_second","ma.grater_than","ma.f_type","maa.id","maa.name","maa.startdate","maa.enddate","maa.activity_id","maa.is_month","maa.is_month_days","mab.id","mab.name","mab.activity_id","mab.startdate","mab.enddate"],
                where,
                {'plans.id': 'ASC'},
                [
                    {
                        join_table: 'plans.map',
                        alias: 'map',
                        table: tableConstant.MY_PLAN.TBL_MP_ASSIGN_PLAN,
                        on_condition: `map.plan_id = plans.id`,
                        join_type: 'inner_one',
                    },
                    {
                        join_table: 'plans.mb',
                        alias: 'mb',
                        table: tableConstant.MY_PLAN.TBL_MP_BLOCKS,
                        on_condition: `mb.plan_id = plans.id AND mb.status = '1'`,
                        join_type: 'left_many',
                    },
                    {
                        join_table: 'mb.mab',
                        alias: 'mab',
                        table: tableConstant.MY_PLAN.TBL_MP_ASSIGN_BLOCK,
                        on_condition: `mab.block_id = mb.id AND mab.org_id = '${getUser?.org_id}' AND mab.status = '1'`,
                        join_type: 'left_one',
                    },
                    {
                        join_table: 'mb.ma',
                        alias: 'ma',
                        table: tableConstant.MY_PLAN.TBL_MP_ACTIVITY,
                        on_condition: `ma.block_id = mb.id AND ma.status = '1' AND (ma.activity_id != '-1' OR ma.organization_id = '${getUser?.org_id}')`,
                        join_type: 'left_many',
                    },
                    {
                        join_table: 'ma.maa',
                        alias: 'maa',
                        table: tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY,
                        on_condition: `maa.activity_id = ma.id AND maa.status = '1' AND maa.org_id = '${getUser?.org_id}'`,
                        join_type: 'left_one',
                    }
                ],
                'getMany'
            );

            let joinUserPlanData: MyPlanJoinUserPlanEntity[] = await this.myPlanJoinUserPlanService.getAll({user_id: postData?.user_id, status: 1},['id','plan_id','user_id','is_complete','complete_date','progress']);
            const joinUserPlanResult = new Map<number, MyPlanJoinUserPlanEntity>();
            for (let i: number = 0; i < joinUserPlanData.length; i++) {
                let joinUserPlan: MyPlanJoinUserPlanEntity = joinUserPlanData[i];
                joinUserPlanResult.set(joinUserPlan.plan_id,joinUserPlan);
            }

            let assignRuleData: assignPlanInterface[] = await this.myPlanAssignRuleService.commonQueryBuilder(
                    ["assignRule.plan_id","assignRule.rule_id","assignRule.optional","assignRule.id","assignRule.org_id","assignRule.recommended_base","assignRule.bstart_date","assignRule.bend_date","br.biometric_id","br.module_id","br.age","br.gender","br.ageoption","br.age_s_range","br.age_e_range","br.progress","br.type","br.s_range","br.e_range","br.activity_id","br.progress_setting","br.c_start_date","br.c_end_date"],
                    { org_id: getUser?.org_id, status: 1 },
                    null,
                    [
                        {
                            join_table: 'assignRule.br',
                            alias: 'br',
                            table: tableConstant.MY_PLAN.TBL_MP_BUSINESS_RULE,
                            on_condition: `br.id=assignRule.rule_id AND br.status = '1'`,
                            join_type: 'left_one',
                        },
                    ],
                    'getMany',
                );
            const assignRuleResult = new Map<number, assignPlanInterface[]>();
            for (let i: number = 0; i < assignRuleData.length; i++) {
                const item: assignPlanInterface = assignRuleData[i];
                let existData: assignPlanInterface[] = assignRuleResult.get(item.plan_id) || []
                existData.push(item)
                assignRuleResult.set(item.plan_id, existData);
            }


            let myPlans = [],userPlans = [],assignPlans = [];
            if (tmpPlans) {
                let campaignData: CampaignEntity = await this.campaignService.getOne({
                    organization_id: getUser?.org_id,
                    start_date: LessThanOrEqual(userTimeZone),
                    end_date: MoreThanOrEqual(userDateTimeZone),
                    status: 1,
                    department_ids: In([departmentId, '0']),
                    location_ids: In([locationId, '0', null]),
                },['start_date','end_date'],{id :"DESC"});
                const campaignStart = await this.commonDateService.DateTimeFormat(campaignData?.start_date,'timestamp','YYYY-MM-DD HH:mm:ss');
                const campaignEnd = await this.commonDateService.DateTimeFormat(campaignData?.end_date,'timestamp','YYYY-MM-DD HH:mm:ss');
                let emotionalAssessmentData: AssessmentEmotionalAssessmentEntity[] = await this.assessmentEmotionalAssessmentService.getAll({ user_id: postData?.user_id, status: 1 },['id', 'user_id', 'hra_status', 'created']);
                let assessmentData: AssessmentsEntity[] = await this.assessmentsService.getAll({ user_id: postData?.user_id, status: 1 },['id', 'user_id', 'hra_status', 'date'],{ date: 'DESC' });
                let emotionalAssessmentObj: AssessmentEmotionalAssessmentEntity;
                let assessmentObj: AssessmentsEntity;
                for (let b: number = 0; b < emotionalAssessmentData?.length; b++) {
                    const ea: AssessmentEmotionalAssessmentEntity = emotionalAssessmentData[b];
                    let createdInTz = await this.commonDateService.DateTimeFormat(ea.created,'timestamp','YYYY-MM-DD HH:mm:ss',timeZone);
                    if (createdInTz >= campaignStart && createdInTz <= campaignEnd) {
                        emotionalAssessmentObj = ea;
                        break;
                    }
                }

                for (let c: number = 0; c < assessmentData?.length; c++) {
                    const assessment: AssessmentsEntity = assessmentData[c];
                    let createdInTz = await this.commonDateService.DateTimeFormat(assessment.date,'timestamp','YYYY-MM-DD HH:mm:ss',timeZone);
                    if (createdInTz >= campaignStart && createdInTz <= campaignEnd) {
                        assessmentObj = assessment;
                        break;
                    }
                }

                for (let i: number = 0; i < tmpPlans.length; i++) {
                    if(tmpPlans[i]['map']['name']){
                        tmpPlans[i]['name'] = tmpPlans[i]['map']['name']
                    }
                    tmpPlans[i]['icon'] = `${S3_URL}${tmpPlans[i]['icon']}`
                    let joinUserPlan: MyPlanJoinUserPlanEntity = joinUserPlanResult.get(tmpPlans[i]['id'])
                    tmpPlans[i]['mar'] = assignRuleResult.get(tmpPlans[i]['id'])
                    if (joinUserPlan) {
                        tmpPlans[i] = await this.commonDateService.basedOnPlanDate(tmpPlans[i],insurancePlanName,userGender,bDay)
                        if (tmpPlans[i]['end_date'] && await this.commonDateService.DateTimeFormat(userTimeZone, 'timestamp','YYYY-MM-DD HH:mm:ss') > await this.commonDateService.DateTimeFormat(tmpPlans[i]['end_date'], 'timestamp','YYYY-MM-DD HH:mm:ss')) {
                        } else {
                            if (tmpPlans[i]['start_date']) {
                                tmpPlans[i]['start_date'] = await this.commonDateService.DateTimeFormat(tmpPlans[i]['start_date'], 'MMMM D, YYYY', 'YYYY-MM-DD HH:mm:ss');
                            }
                            if (tmpPlans[i]['end_date']) {
                                tmpPlans[i]['end_date'] = await this.commonDateService.DateTimeFormat(tmpPlans[i]['end_date'], 'MMMM D, YYYY', 'YYYY-MM-DD HH:mm:ss');
                            }
                            tmpPlans[i]['progress_label'] = (joinUserPlan['is_complete'] == 1 ? 'Complete' : 'Incomplete')
                            tmpPlans[i]['progress'] = joinUserPlan['progress']
                            myPlans.push(tmpPlans[i]);
                        }
                    } else {
                        if (!autoRemovePlan.includes(tmpPlans[i]['id'])) {
                            if (!autoPlan.includes(tmpPlans[i]['id'])) {
                                let planDisplay: boolean = false;
                                let displayPlanToHealth: number = 1;
                                if (tmpPlans[i]['map']['display_plan_to_health'] == 1) {
                                    displayPlanToHealth = 0;
                                    if (campaignData) {
                                        if (tmpPlans[i]['map']['display_plan_to_health_source'] == 1) {
                                            if (emotionalAssessmentObj?.hra_status === 100 || assessmentObj?.hra_status === 100) {
                                                displayPlanToHealth = 1;
                                            }
                                        } else {
                                            if (emotionalAssessmentObj || assessmentObj) {
                                                displayPlanToHealth = 1;
                                            }
                                        }
                                    }
                                }
                                if (displayPlanToHealth == 1) {
                                    if (tmpPlans[i]['map']['display_plan_to'] == 0) {
                                        if (tmpPlans[i]['mar']?.length > 0) {
                                            let biometricIds = tmpPlans[i]['mar'].map(item => item?.br?.biometric_id).filter(Boolean);
                                            if (!otherDataPass['biometrics'] && [1,2,3,4,5,6,7,8,9,10,11,12,26].some(value => biometricIds.includes(value))) {
                                                otherDataPass['biometrics'] = await this.frontService.biometricsRecord(
                                                    {
                                                        bio: `user_id = "${postData?.user_id}" AND (height != "" OR weight != "" OR waist != "" OR alc != "" OR systolic != "" OR diastolic != "" OR total_cholesterol != "" OR hdl != "" OR ldl != "" OR triglycerides != "" OR blood_glucose != "") AND status = '1'`,
                                                        hra_bio: `user_id = "${postData?.user_id}" AND (weight != '' OR (height_ft != "" AND height_in != "") OR waist != '' OR alc != '' OR bp_systolic != '' OR bp_diastolic != '' OR total_cholesterol != '' OR hdl != '' OR ldl != '' OR triglycerides != '' OR blood_glucose != '') AND status = '1'`,
                                                        ft_bio: `user_id = "${postData?.user_id}" AND (weight != '' OR (height_ft != '' AND height_in != '') OR alc != '' OR systolic != '' OR diastolic != '' OR chol_total != '' OR hdl != '' OR ldl != '' OR triglycerides != '' OR glucose != '') AND status = '1'`,
                                                    },{},[tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS,tableConstant.TRACKERS.TBL_FT_BIOMETRICS],{ created: 'DESC', id: 'DESC' });
                                            }
                                            if (!otherDataPass['hra'] && [13,14,15,16,17].some(value => biometricIds.includes(value))) {
                                                otherDataPass['hra']= await this.assessmentsService.commonQueryBuilder(["*","DATE_FORMAT(date, '%Y') as years"],{ user_id: postData?.user_id, status: 1 },{ date: 'DESC' },[],'getRawMany');
                                            }
                                            if (!otherDataPass['tobacco'] && biometricIds.includes(19)) {
                                                otherDataPass['tobacco'] = await this.tobaccoUsesService.commonQueryBuilder(["*","DATE_FORMAT(date_completed, '%Y') as years"],{ user_id: postData?.user_id, status: 1 },{ date_completed: 'DESC' },[],'getRawMany');
                                            }
                                            if (!otherDataPass['physician'] && biometricIds.includes(20)) {
                                                let recordDetails: AuthorizationsEntity[] = await this.authorizationsService.commonQueryBuilder(["*","DATE_FORMAT(date_completed, '%Y') as years"],{user_id: postData?.user_id,activity_id: 2,status: 1,},{ date_completed: 'DESC' },[],'getRawMany');
                                                let resultedData: BiometricsEntity[] = await this.biometricsService.commonQueryBuilder(['id','DATE_FORMAT(created, "%Y-%m-%d") as log_date_tmp','DATE_FORMAT(created, "%Y") as years','created' ,'activity_id','user_id','source'],{user_id: postData?.user_id,activity_id: Raw((alias) => `FIND_IN_SET('2',${alias}) > 0`),status: 1},{ created: 'DESC', id: 'DESC' },[],'getRawMany');
                                                otherDataPass['physician'] = {Authorization: recordDetails,activity: resultedData}
                                            }
                                            if (!otherDataPass['dental'] && biometricIds.includes(21)) {
                                                otherDataPass['dental'] = await this.authorizationsService.commonQueryBuilder(['id','user_id','signature','type_of_form','date_completed','activity_id','DATE_FORMAT(date_completed, "%Y") as years'],{user_id: postData?.user_id,activity_id: 3,status: 1},{ date_completed: 'DESC' },[],'getRawMany');
                                            }
                                            if (!otherDataPass['optimetric'] && biometricIds.includes(22)) {
                                                otherDataPass['optimetric'] = await this.authorizationsService.commonQueryBuilder(['id','user_id','signature','type_of_form','date_completed','activity_id','DATE_FORMAT(date_completed, "%Y") as years'],{user_id: postData?.user_id,activity_id: 5,status: 1},{ date_completed: 'DESC' },[],'getRawMany');
                                            }
                                            if (!otherDataPass['ohassessment'] && biometricIds.includes(30)) {
                                                otherDataPass['ohassessment'] = await this.assessmentsService.commonQueryBuilder(["*","DATE_FORMAT(date, '%Y') as years"],{ user_id: postData?.user_id, status: 1 },{ date: 'DESC' },[],'getRawMany');
                                            }
                                            if ([25].some(value => biometricIds.includes(value))) {
                                                let moduleID = tmpPlans[i]['mar'].map(item => item?.br?.module_id);
                                                if (!otherDataPass['event'] && moduleID.includes(1)) {
                                                    otherDataPass['event'] = await this.eventUserBookingListsService.commonQueryBuilder(['ev_user_id','ev_events_id','ev_attend_status','modified','DATE_FORMAT(modified, "%Y") as years'],{ ev_user_id: postData?.user_id, status: 1 },{ modified: 'DESC' },[],'getRawMany');
                                                }
                                                if (!otherDataPass['eha'] && moduleID.includes(2)) {
                                                    otherDataPass['eha'] = await this.frontService.emotionalResultData(String(postData?.user_id),getUser?.org_id,'','', req)
                                                }
                                                if (!otherDataPass['agegender'] && moduleID.includes(3)) {
                                                    otherDataPass['agegender'] = await this.biometricsService.commonQueryBuilder(['id','created','activity_id','user_id','source','DATE_FORMAT(created, "%Y") as years'],{user_id: postData?.user_id,status: 1,activity_id: Raw((alias) => `${alias} REGEXP '(^|,)(208|209|210|211|212|213|214|215|216|217|218|219|220|221|222|223|224|225|226|227|228|229|230|1026|1029|1032|6972|6973|6974)(,|$)'`,)},{ created: 'DESC', id: 'DESC' },[],'getRawMany');
                                                }
                                                if (!otherDataPass['challenge'] && moduleID.includes(4)) {
                                                    otherDataPass['challenge'] = await this.scheduleChallengeJoinUsersService.commonQueryBuilder(['user_id','schedule_id','added_date','DATE_FORMAT(added_date, "%Y") as years'], { user_id: postData?.user_id, status: 1 },{ added_date: 'DESC' },[], 'getRawMany');
                                                }
                                                if (!otherDataPass['quicklink'] && moduleID.includes(5)) {
                                                    otherDataPass['quicklink'] = await this.quickLinkClicksService.commonQueryBuilder(['user_id', 'quicklink_id', 'created_date','DATE_FORMAT(created_date, "%Y") as years'],{user_id: postData?.user_id,status: 1,quicklink_id: Not(IsNull())},{ created_date: 'DESC' },[],'getRawMany');
                                                }
                                                if (!otherDataPass['quiz'] && moduleID.includes(6)) {
                                                    otherDataPass['quiz'] = await this.userDetailsService.commonQueryBuilder(['user_id','completed','score','quiz_id','created_date','DATE_FORMAT(created_date, "%Y") as years'], { user_id: postData?.user_id, status: 1 },{ id: 'DESC' },[],'getRawMany');
                                                }
                                            }
                                            let planDisplay: boolean = await this.commonHealthService.businessRuleCheck(otherDataPass, tmpPlans[i]['mar'], postData?.user_id,userGender,bDay);
                                            if (planDisplay == true) {
                                                userPlans.push(tmpPlans[i]);
                                            } else {
                                                assignPlans.push(tmpPlans[i])
                                            }
                                        }
                                    } else {
                                        userPlans.push(tmpPlans[i]);
                                    }
                                }
                            } else {
                                userPlans.push(tmpPlans[i]);
                            }
                        } else {
                            assignPlans.push(tmpPlans[i])
                        }
                    }
                }
            }

            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: {plans: myPlans,user_plan: userPlans, assign_plan: assignPlans },
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