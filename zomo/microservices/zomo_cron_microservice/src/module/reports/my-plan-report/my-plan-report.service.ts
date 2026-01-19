import {
    appConstant,
    AssessmentEmotionalAssessmentAnswerEntity,
    AssessmentResultsEntity,
    AssessmentsEntity,
    AuthorizationsEntity,
    BiometricsEntity,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    EventUserBookingListsEntity,
    MyPlanAssignPlanEntity,
    MyPlanCompleteActivityEntity,
    MyPlanCompleteBlockEntity, MyPlanJoinUserPlanEntity,
    QuickLinkClicksEntity,
    ScheduleChallengeJoinUsersEntity,
    tableConstant,
    TobaccoUsesEntity,
    UserDetailsEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { EventUserBookingListsService } from 'src/module/events';
import { Between, In, IsNull, Not, Raw } from 'typeorm';
import { CronCommonService } from '../../../common';
import {
    allPlanInterface,
    biometricInterface,
    PlanMapValue,
} from '../../../interface';
import { ScheduleChallengeJoinUsersService } from '../../challenge';
import {
    AssessmentEmotionalAssessmentAnswerService,
    AssessmentEmotionalAssessmentService,
    AssessmentHraBiometricService,
    AssessmentOptionsService,
    AssessmentResultsService,
} from '../../healthassessment';
import { AssessmentService } from '../../healthassessment/assessments.service';
import { TobaccoUsesService } from '../../healthcheckup';
import { AuthorizationsService } from '../../healthcheckup/authorizations/authorizations.service';
import { BiometricsService } from '../../healthcheckup/biometrics/biometrics.service';
import {
    MyPlanActivityService,
    MyPlanAssignPlanService,
    MyPlanBlocksService,
    MyPlanCompleteActivityService,
    MyPlanCompleteBlockService,
    MyPlanPlansService,
} from '../../myplan';
import { QuickLinkClicksService } from '../../quicklink/quicklinkclicks.service';
import { UserDetailsService } from '../../quiz';
import { FtBiometricsService } from '../../tracker';
import { UserService } from '../../user/user.service';
@Injectable()
export class MyPlanReportService {
    constructor(
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
        private readonly myPlanBlocksService: MyPlanBlocksService,
        private readonly myPlanPlansService: MyPlanPlansService,
        private readonly myPlanActivityService: MyPlanActivityService,
        private readonly myPlanAssignPlanService: MyPlanAssignPlanService,
        private readonly userService: UserService,
        private readonly myPlanCompleteBlockService: MyPlanCompleteBlockService,
        private readonly myPlanCompleteActivityService: MyPlanCompleteActivityService,
        private readonly userDetailsService: UserDetailsService,
        private readonly quickLinkClicksService: QuickLinkClicksService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly biometricsService: BiometricsService,
        private readonly eventUserBookingListsService: EventUserBookingListsService,
        private readonly assessmentService: AssessmentService,
        private readonly authorizationsService: AuthorizationsService,
        private readonly tobaccoUsesService: TobaccoUsesService,
        private readonly assessmentHraBiometricService: AssessmentHraBiometricService,
        private readonly ftBiometricsService: FtBiometricsService,
        private readonly assessmentResultsService: AssessmentResultsService,
        private readonly assessmentEmotionalAssessmentService: AssessmentEmotionalAssessmentService,
        private readonly assessmentEmotionalAssessmentAnswerService: AssessmentEmotionalAssessmentAnswerService,
        private readonly assessmentOptionsService: AssessmentOptionsService,
        private readonly cronCommonService: CronCommonService,
    ) {}

    async allPlan(reportData, userData, userArray, jsonData, userPlanId) {
        let where = `assignPlan.org_id = '${reportData?.org_id}' AND assignPlan.status != '2' AND plans.status = '1' AND joinUserPlan.status = '1'`;
        let fields = [
            'plans.id',
            'plans.name',
            'plans.description',
            'plans.created_by',
            'plans.icon',
            'assignPlan.name',
            'assignPlan.id',
            'assignPlan.activity_id',
            'assignPlan.startdate',
            'assignPlan.enddate',
            'assignPlan.display_plan_to',
            'assignPlan.display_plan_to_health',
            'joinUserPlan.id',
            'joinUserPlan.user_id',
            'joinUserPlan.plan_id',
            'joinUserPlan.activity_id',
            'joinUserPlan.progress',
            'joinUserPlan.is_complete',
            'joinUserPlan.created',
            'joinUserPlan.complete_date',
        ];
        let planData: allPlanInterface[] =
            await this.myPlanPlansService.commonQueryBuilder(
                fields,
                where,
                null,
                [
                    {
                        join_table: 'plans.assignPlan',
                        alias: 'assignPlan',
                        table: tableConstant.MY_PLAN.TBL_MP_ASSIGN_PLAN,
                        on_condition: `assignPlan.plan_id = plans.id`,
                        join_type: 'inner_one',
                    },
                    {
                        join_table: 'plans.joinUserPlan',
                        alias: 'joinUserPlan',
                        table: tableConstant.MY_PLAN.TBL_MP_JOIN_USER_PLAN,
                        on_condition: `joinUserPlan.plan_id = plans.id`,
                        join_type: 'left_many',
                    },
                ],
                'getMany',
            );
        const planMap = new Map<number, PlanMapValue>();
        planData.forEach((plan) => {
            const planName = plan?.assignPlan?.name || plan?.name;
            jsonData[0] = [...jsonData[0],...[`${planName}`,`${planName} Completion Date`]]
            planMap.set(plan.id, {
                planName,
                joinUserPlan: plan.joinUserPlan,
            });
        });

        const result = userData.map((user, i) => {
            const planObj = {};
            const userPlanIds = userPlanId.get(user.id) || [];
            planMap.forEach((planData, planId) => {
                const { planName, joinUserPlan } = planData;
                const userPlan: MyPlanJoinUserPlanEntity = joinUserPlan.find(jp => jp.user_id === user.id);
                let progress = userPlan?.progress
                if (progress == 100) {
                    jsonData[i+1].push(`${progress}%`)
                    let date = this.commonDateService.DateTimeFormat(userPlan.complete_date, 'MM-DD-YYYY')
                    if (this.commonDateService.DateTimeFormat(userPlan.complete_date, 'MM-DD-YYYY') === 'Invalid date') {
                        jsonData[i+1].push('')
                    } else {
                        jsonData[i+1].push(date)
                    }
                } else {
                    if (userPlanIds.includes(planId)) {
                        jsonData[i+1].push('Eligible')
                    } else {
                        jsonData[i+1].push(progress ? `${progress}%` : 'N/A')
                    }
                    jsonData[i+1].push('')
                }
            });
            return jsonData;
        });

        return jsonData;
    }

    async allPlanWithEngagement(
        reportData,
        userData,
        userArray,
        jsonData,
        userPlanId,
    ) {
        try {
            let assignPlanData: MyPlanAssignPlanEntity[] = await this.myPlanAssignPlanService.getAll({org_id: reportData?.org_id,status: Not(2)},['id','plan_id'])
            let campId = reportData.camp_id
            for (let i: number = 0; i < assignPlanData.length; i++) {
                let assignPlan: MyPlanAssignPlanEntity = assignPlanData[i];
                reportData.camp_id = assignPlan?.plan_id;
                reportData.total_plan = assignPlanData.length;
                jsonData = await this.singleOrMultiplePlan(reportData,userData,userArray,jsonData,userPlanId,'engagement');
                reportData.camp_id = campId;
            }
        } catch (error) {
            console.log('error', error);
        }
        return jsonData;
    }

    async singleOrMultiplePlan(
        reportData,
        userData,
        userArray,
        jsonData,
        userPlanId,
        type: string = '',
    ) {
        try {
            let where = `assignPlan.org_id = '${reportData?.org_id}' AND plans.id = '${reportData?.camp_id}' AND assignPlan.status != '2' AND plans.status = '1'`;
            let fields = [
                'plans.id',
                'plans.name',
                'plans.description',
                'plans.created_by',
                'plans.icon',
                'assignPlan.name',
                'assignPlan.id',
                'assignPlan.activity_id',
                'assignPlan.startdate',
                'assignPlan.enddate',
                'assignPlan.display_plan_to',
                'assignPlan.display_plan_to_health',
                'joinUserPlan.id',
                'joinUserPlan.user_id',
                'joinUserPlan.progress',
                'joinUserPlan.is_complete',
                'joinUserPlan.created',
            ];
            let planData = await this.myPlanPlansService.commonQueryBuilder(
                fields,
                where,
                null,
                [
                    {'join_table': 'plans.assignPlan','alias':'assignPlan', 'table' : tableConstant.MY_PLAN.TBL_MP_ASSIGN_PLAN, 'on_condition' : `assignPlan.plan_id = plans.id`, 'join_type': 'inner_one' },
                    {'join_table': 'plans.joinUserPlan','alias':'joinUserPlan', 'table' : tableConstant.MY_PLAN.TBL_MP_JOIN_USER_PLAN, 'on_condition' : `joinUserPlan.plan_id = plans.id AND joinUserPlan.user_id IN(${userArray.join(',')}) AND joinUserPlan.status = '1'`, 'join_type': 'left_many' }
                ]
                ,'getOne')
            let blocksWhere = `blocks.plan_id = '${planData?.id}' AND blocks.status = '1'`;
            let blockFields = [
                'blocks.id',
                'blocks.order_id',
                'blocks.name',
                'blocks.plan_id',
                'blocks.icon',
                'blocks.description',
                'completeBlock.id',
                'completeBlock.complete_date',
                'completeBlock.block_id',
                'completeBlock.status',
                'completeBlock.id',
                'completeBlock.activity_detail',
                'assignBlock.id',
                'assignBlock.name',
                'assignBlock.activity_id',
                'assignBlock.startdate',
                'assignBlock.enddate',
            ];
            let blockData = await this.myPlanBlocksService.commonQueryBuilder(
                blockFields,
                blocksWhere,
                { 'blocks.order_id': 'ASC' },
                [
                    {
                        join_table: 'blocks.assignBlock',
                        alias: 'assignBlock',
                        table: tableConstant.MY_PLAN.TBL_MP_ASSIGN_BLOCK,
                        on_condition: `assignBlock.block_id = blocks.id AND assignBlock.org_id = '${reportData?.org_id}' AND assignBlock.status = '1'`,
                        join_type: 'left_one',
                    },
                    {
                        join_table: 'blocks.completeBlock',
                        alias: 'completeBlock',
                        table: tableConstant.MY_PLAN.TBL_MP_COMPLETE_BLOCK,
                        on_condition: `completeBlock.block_id = blocks.id`,
                        join_type: 'left_one',
                    },
                ],
                'getMany',
            );
            let tempPlanCompleted = {}
            reportData.total_block = blockData.length
            for (let i: number = 0; i < blockData.length; i++) {
                let sheetdata = await this.generateUserJsonData(
                    blockData[i],
                    reportData,
                    userData,
                    userArray,
                    jsonData,
                    userPlanId,
                    planData,
                    type,
                    tempPlanCompleted
                );
                jsonData = sheetdata.jsonData
                tempPlanCompleted = sheetdata.tempPlanCompleted
            }
            if (type == 'multiple') {
                let planName = planData?.assignPlan?.name || planData?.name
                jsonData = { [`${this.commonFileService.sanitizeFileName(planName)}`]: jsonData };
            }

            return jsonData;
        } catch (error) {
            console.log('error', error);
        }
    }

    async generateUserJsonData(
        blockData,
        reportData,
        userData,
        userArray,
        jsonData,
        userPlanId,
        planData,
        type,
        tempPlanCompleted
    ) {
        try {
            let activityNameWhere = `myPlanActivity.block_id = '${blockData?.id}' AND myPlanActivity.status = '1'`;
            let activityNameFields = [
                'assignActivity.id',
                'assignActivity.name',
                'myPlanActivity.id',
                'myPlanActivity.activity_id',
                'myPlanActivity.org_activity_id',
                'myPlanActivity.option_activity_ids',
                'myPlanActivity.module_id',
                'myPlanActivity.is_category',
                'activity.id',
                'activity.activity_name',
                'events.event_name',
                'eventCategory.category_name',
                'assessmentResults.title',
                'scheduleChallenge.custom_cname',
                'quickLink.title',
                'quiz.quiz_name',
                'ewPost.title',
            ];
            let activityNameData =
                await this.myPlanActivityService.commonQueryBuilder(
                    activityNameFields,
                    activityNameWhere,
                    { 'myPlanActivity.order_id': 'ASC' },
                    [
                        {
                            join_table: 'myPlanActivity.assignActivity',
                            alias: 'assignActivity',
                            table: tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY,
                            on_condition: `assignActivity.activity_id = myPlanActivity.id AND assignActivity.status = '1' AND assignActivity.org_id = '${reportData?.org_id}'`,
                            join_type: 'left_one',
                        },
                        {
                            join_table: 'myPlanActivity.activity',
                            alias: 'activity',
                            table: tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                            on_condition: `activity.id = myPlanActivity.activity_id OR (activity.id = myPlanActivity.org_activity_id AND myPlanActivity.module_id = 3)`,
                            join_type: 'left_one',
                        },
                        {
                            join_table: 'myPlanActivity.events',
                            alias: 'events',
                            table: tableConstant.EVENTS.TBL_EV_EVENTS,
                            on_condition: `events.id = myPlanActivity.org_activity_id AND myPlanActivity.module_id = 1 AND myPlanActivity.is_category = 0 AND events.status != '2'`,
                            join_type: 'left_one',
                        },
                        {
                            join_table: 'myPlanActivity.eventCategory',
                            alias: 'eventCategory',
                            table: tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY,
                            on_condition: `eventCategory.id = myPlanActivity.org_activity_id AND myPlanActivity.module_id = 1 AND myPlanActivity.is_category = 1 AND eventCategory.status != '2'`,
                            join_type: 'left_one',
                        },
                        {
                            join_table: 'myPlanActivity.assessmentResults',
                            alias: 'assessmentResults',
                            table: tableConstant.HEALTH_ASSESSMENT
                                .TBL_HA_ASSESSMENT_RESULTS,
                            on_condition: `assessmentResults.id = myPlanActivity.org_activity_id AND myPlanActivity.module_id = 2 AND assessmentResults.status != '2'`,
                            join_type: 'left_one',
                        },
                        {
                            join_table: 'myPlanActivity.scheduleChallenge',
                            alias: 'scheduleChallenge',
                            table: tableConstant.CHALLENGE
                                .TBL_CH_SCHEDULE_CHALLENGE,
                            on_condition: `scheduleChallenge.id = myPlanActivity.org_activity_id AND myPlanActivity.module_id = 4 AND scheduleChallenge.status != '2'`,
                            join_type: 'left_one',
                        },
                        {
                            join_table: 'myPlanActivity.quickLink',
                            alias: 'quickLink',
                            table: tableConstant.QUICK_LINK.TBL_QUICK_LINK,
                            on_condition: `quickLink.id = myPlanActivity.org_activity_id AND myPlanActivity.module_id = 5 AND quickLink.status != '2'`,
                            join_type: 'left_one',
                        },
                        {
                            join_table: 'myPlanActivity.quiz',
                            alias: 'quiz',
                            table: tableConstant.QUIZ.TBL_QZ_QUIZZES,
                            on_condition: `quiz.id = myPlanActivity.org_activity_id AND myPlanActivity.module_id = 6 AND quiz.status != '2'`,
                            join_type: 'left_one',
                        },
                        {
                            join_table: 'myPlanActivity.ewPost',
                            alias: 'ewPost',
                            table: tableConstant.EMOTIONAL_WELLBEING
                                .TBL_EM_POST,
                            on_condition: `ewPost.id = myPlanActivity.org_activity_id OR ewPost.id = myPlanActivity.post_id AND myPlanActivity.module_id = 9 AND ewPost.status != '2'`,
                            join_type: 'left_one',
                        },
                    ],
                    'getMany',
                );

            const HRA_DATA = appConstant.HRA_DATA;
            const BIO_DATA = appConstant.BIO_DATA;
            const userDataLength = userData?.length || 0;
            const activityNameDataLength = activityNameData?.length || 0;

            const createActivityHeader: {
                id: number;
                activity_name: string;
            }[] = [];
            const activityId: number[] = new Array(activityNameDataLength);
            if (type == 'allPlan' || type == 'single' || type == 'multiple') {
                const missing = ['Eligible for the My Plan','Registered for the My Plan','My Plan Completed','My Plan Progress'].filter(item => !jsonData[0].includes(item));
                if (missing.length > 0) {
                    jsonData[0] = [...jsonData[0], ...missing];
                }
            }
            if (type != 'engagement') {
                const blockName = blockData?.assignBlock?.name || blockData?.name || '';
                jsonData[0].push(blockName)
            }
            for (let i: number = 0; i < activityNameDataLength; i++) {
                const activity = activityNameData[i];
                activityId[i] = activity?.id;
                let activityName: string =
                    activity?.activity?.activity_name || '';
                const moduleId = activity?.module_id;
                if (moduleId === 1) {
                    if (activity?.events && activity?.is_category === 0) {
                        activityName = activity.events.event_name;
                    } else if (
                        activity?.eventCategory &&
                        activity?.is_category === 1
                    ) {
                        activityName = activity.eventCategory.category_name;
                    }
                } else if (moduleId === 2 && activity?.assessmentResults) {
                    activityName = activity.assessmentResults.title;
                } else if (moduleId === 4 && activity?.scheduleChallenge) {
                    activityName = activity.scheduleChallenge.custom_cname;
                } else if (moduleId === 5 && activity?.quickLinks) {
                    activityName = activity.quickLink?.title || '';
                } else if (moduleId === 6 && activity?.quiz) {
                    activityName = activity.quiz.quiz_name;
                } else if (moduleId === 7) {
                    activityName = HRA_DATA[activity?.org_activity_id] || '';
                } else if (moduleId === 8) {
                    activityName = BIO_DATA[activity?.org_activity_id] || '';
                } else if (moduleId === 9) {
                    if (activity?.ewPost) {
                        activityName = activity.ewPost.title;
                    } else if (activity?.org_activity_id === '0') {
                        activityName = 'All Emotional Well-Being';
                    }
                }

                activityName = activity?.assignActivity?.name || activityName;
                createActivityHeader.push({
                    id: activity.id,
                    activity_name: activityName,
                });
                jsonData[0].push(activityName)
            }

            let completeBlockData: MyPlanCompleteBlockEntity[] =
                await this.myPlanCompleteBlockService.getAll(
                    {
                        block_id: blockData?.id,
                        user_id: In(userArray),
                        status: Not(2),
                    },
                    ['id','user_id','status','activity_detail'],
                );
            let completeActivityWhere = {
                custom_id: In(activityId),
                user_id: In(userArray),
                status: Not(2),
            };
            if (reportData?.start_date_range && reportData?.end_date_range) {
                completeActivityWhere['created'] = Between(
                    new Date(reportData?.start_date_range),
                    new Date(reportData?.end_date_range),
                );
            }
            let completeActivityData: MyPlanCompleteActivityEntity[] =
                await this.myPlanCompleteActivityService.getAll(
                    completeActivityWhere,
                    ['id', 'user_id', 'custom_id', 'aftercompletestatus','status'],
                );
            const completeBlockResult = new Map<
                number,
                MyPlanCompleteBlockEntity
            >();
            const completeActivityResult = new Map<
                number,
                MyPlanCompleteActivityEntity[]
            >();
            for (let i: number = 0; i < completeBlockData.length; i++) {
                const item: MyPlanCompleteBlockEntity = completeBlockData[i];
                completeBlockResult.set(item.user_id, item);
            }
            for (let i: number = 0; i < completeActivityData.length; i++) {
                const item: MyPlanCompleteActivityEntity = completeActivityData[i];
                const existing: MyPlanCompleteActivityEntity[] = completeActivityResult.get(item.user_id) || [];
                existing.push(item);
                completeActivityResult.set(item.user_id, existing);
            }
            const createActivityHeaderLength: number =
                createActivityHeader.length;
            const targetKey = "Number of My Plan's completed";
            const existingIndex = jsonData[0].indexOf(targetKey);
            for (let j: number = 0; j < userDataLength; j++) {
                const user = userData[j];
                const blockExist: MyPlanCompleteBlockEntity =
                    completeBlockResult.get(user.id);
                const activityExist: MyPlanCompleteActivityEntity[] =
                    completeActivityResult.get(user.id);
                const userPlanIds = userPlanId.get(user.id) || [];
                const userPlan = planData?.joinUserPlan.find(
                    (jp) => jp.user_id === user.id,
                );
                let planCompleted: string = '';
                let planCompletedNumber: number = 0;
                let RegisteredForTheMyPlan = 'No';
                let MyPlanProgress = '';
                if (userPlan) {
                    RegisteredForTheMyPlan = 'Yes';
                    MyPlanProgress = '0.00%';
                }
                if (userPlan?.progress) {
                    planCompleted = 'No';
                    RegisteredForTheMyPlan = 'Yes';
                    MyPlanProgress = Math.round(userPlan?.progress * 100 / 100) + '%';
                }
                if (userPlan?.is_complete == '1') {
                    planCompleted = 'Yes';
                    planCompletedNumber = 1;
                }
                const userDataJsonPair: Record<string, string> = {};
                if (type == 'allPlan' || type == 'single' || type == 'multiple') {
                    const eligibleIndex = jsonData[0].indexOf('Eligible for the My Plan');
                    const registeredIndex = jsonData[0].indexOf('Registered for the My Plan');
                    const completedIndex = jsonData[0].indexOf('My Plan Completed');
                    const progressIndex = jsonData[0].indexOf('My Plan Progress');
                    jsonData[j+1][eligibleIndex] = (userPlanIds.includes(planData?.id) || (planData?.assignPlan?.display_plan_to_health === 0 &&  planData?.assignPlan?.display_plan_to === 1)) ? 'Yes' : 'No'
                    jsonData[j+1][registeredIndex] = RegisteredForTheMyPlan
                    jsonData[j+1][completedIndex] = planCompleted
                    jsonData[j+1][progressIndex] = MyPlanProgress
                }
                if (type != 'engagement') {
                    let blockAnswer = blockExist?.status === 1 && RegisteredForTheMyPlan == 'Yes' ? 'Yes' : ''
                    jsonData[j+1].push(blockAnswer)
                }
                    for (let k: number = 0; k < createActivityHeaderLength; k++) {
                        const activityHeader = createActivityHeader[k];
                        let activityVal: string = '';
                        if (RegisteredForTheMyPlan == 'Yes') {
                            let checkActivityExist: MyPlanCompleteActivityEntity = activityExist?.find((data) => data.custom_id == activityHeader.id,);
                            if (checkActivityExist) {
                                activityVal = checkActivityExist?.aftercompletestatus === 1 ? 'Yes - After Deadline' : checkActivityExist?.status === 1 ? 'Yes' : '';
                            } else if (blockExist) {
                                let activityIds = blockExist?.activity_detail ? Object.keys(JSON.parse(blockExist.activity_detail)) : [];
                                if (activityIds.includes(String(activityHeader.id))) {
                                    activityVal = 'Yes';
                                }
                            }
                        }
                        jsonData[j+1].push(activityVal)
                    }
                if (type == 'engagement') {
                    const existIndex = jsonData[0].indexOf(targetKey);
                    if (existIndex === -1) {
                        jsonData[0].push(targetKey);
                    } else {
                        const [removed] = jsonData[0].splice(existIndex, 1);
                        jsonData[0].push(removed);
                    }
                    if (existingIndex === -1) {
                        jsonData[j+1].push(planCompletedNumber)
                        tempPlanCompleted[blockData?.plan_id] = tempPlanCompleted[blockData?.plan_id] || {}
                        tempPlanCompleted[blockData?.plan_id][user.id] = 1
                    } else {
                        const [removedVal] = jsonData[j+1].splice(existingIndex, 1);
                        if (tempPlanCompleted?.[blockData?.plan_id]?.[user.id] != 1) {
                            let total = Number(removedVal || 0) + planCompletedNumber
                            jsonData[j+1].push(total)
                            tempPlanCompleted[blockData?.plan_id] = tempPlanCompleted[blockData?.plan_id] || {}
                            tempPlanCompleted[blockData?.plan_id][user.id] = 1
                        } else {
                            jsonData[j+1].push(Number(removedVal || 0))
                        }
                    }
                }
            }
            return {jsonData: jsonData,tempPlanCompleted: tempPlanCompleted};
        } catch (error) {
            console.log('error', error);
        }
    }

    async businessRuleData(moduleIdArray, biometricIdArray, userArray, orgId) {
        try {
            let otherDataPass = {};
            otherDataPass['bio_data'] = appConstant.BIO_DATA_LIST;
            if (moduleIdArray.length || biometricIdArray.length) {
                if (
                    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 26].some((value) =>
                        biometricIdArray.includes(value),
                    )
                ) {
                    let biometricData = await this.biometricsRecord(
                        {
                            bio: `user_id IN(${userArray.join(',')}) AND (height != "" OR weight != "" OR waist != "" OR alc != "" OR systolic != "" OR diastolic != "" OR total_cholesterol != "" OR hdl != "" OR ldl != "" OR triglycerides != "" OR blood_glucose != "") AND status = '1'`,
                            hra_bio: `user_id IN(${userArray.join(',')}) AND (weight != '' OR (height_ft != "" AND height_in != "") OR waist != '' OR alc != '' OR bp_systolic != '' OR bp_diastolic != '' OR total_cholesterol != '' OR hdl != '' OR ldl != '' OR triglycerides != '' OR blood_glucose != '') AND status = '1'`,
                            ft_bio: `user_id IN(${userArray.join(',')}) AND (weight != '' OR (height_ft != '' AND height_in != '') OR alc != '' OR systolic != '' OR diastolic != '' OR chol_total != '' OR hdl != '' OR ldl != '' OR triglycerides != '' OR glucose != '') AND status = '1'`,
                        },
                        [
                            tableConstant.HEALTH_ASSESSMENT
                                .TBL_HA_HRABIOMETRICS,
                            tableConstant.TRACKERS.TBL_FT_BIOMETRICS,
                        ],
                        { created: 'DESC', id: 'DESC' },
                    );
                    const biometricResult = new Map<
                        number,
                        biometricInterface[]
                    >();
                    for (let i: number = 0; i < biometricData.length; i++) {
                        const item = biometricData[i];
                        const existing: biometricInterface[] =
                            biometricResult.get(item.user_id) || [];
                        existing.push(item);
                        biometricResult.set(item.user_id, existing);
                    }
                    otherDataPass['biometrics'] = biometricResult;
                }
                if (
                    [13, 14, 15, 16, 17].some((value) =>
                        biometricIdArray.includes(value),
                    )
                ) {
                    let hraData: AssessmentsEntity[] =
                        await this.assessmentService.getAll(
                            { user_id: In(userArray), status: 1 },
                            [],
                            { date: 'DESC' },
                        );
                    const hraResult = new Map<number, AssessmentsEntity[]>();
                    for (let i: number = 0; i < hraData.length; i++) {
                        const item: AssessmentsEntity = hraData[i];
                        item['years'] = this.commonDateService.DateTimeFormat(
                            item.date,
                            'YYYY',
                        );
                        const existing = hraResult.get(item.user_id) || [];
                        existing.push(item);
                        hraResult.set(item.user_id, existing);
                    }
                    otherDataPass['hra'] = hraResult;
                }
                if (biometricIdArray.includes(19)) {
                    let tobaccoUsesData: TobaccoUsesEntity[] =
                        await this.tobaccoUsesService.getAll(
                            { user_id: In(userArray), status: 1 },
                            [],
                            { date_completed: 'DESC' },
                        );
                    const tobaccoUsesResult = new Map<
                        number,
                        TobaccoUsesEntity[]
                    >();
                    for (let i: number = 0; i < tobaccoUsesData.length; i++) {
                        const item: TobaccoUsesEntity = tobaccoUsesData[i];
                        item['years'] = this.commonDateService.DateTimeFormat(
                            item.date_completed,
                            'YYYY',
                        );
                        const existing: TobaccoUsesEntity[] =
                            tobaccoUsesResult.get(item.user_id) || [];
                        existing.push(item);
                        tobaccoUsesResult.set(item.user_id, existing);
                    }
                    otherDataPass['tobacco'] = tobaccoUsesResult;
                }
                if (biometricIdArray.includes(20)) {
                    let recordDetails: AuthorizationsEntity[] =
                        await this.authorizationsService.getAll(
                            {
                                user_id: In(userArray),
                                activity_id: 2,
                                status: 1,
                            },
                            [],
                            { date_completed: 'DESC' },
                        );
                    const authorizationsResult = new Map<
                        number,
                        AuthorizationsEntity[]
                    >();
                    for (let i: number = 0; i < recordDetails.length; i++) {
                        const item: AuthorizationsEntity = recordDetails[i];
                        item['years'] = this.commonDateService.DateTimeFormat(
                            item.date_completed,
                            'YYYY',
                        );
                        const existing: AuthorizationsEntity[] =
                            authorizationsResult.get(item.user_id) || [];
                        existing.push(item);
                        authorizationsResult.set(item.user_id, existing);
                    }
                    let biometricsData: BiometricsEntity[] =
                        await this.biometricsService.getAll(
                            {
                                user_id: In(userArray),
                                activity_id: Raw(
                                    (alias) => `FIND_IN_SET('2',${alias}) > 0`,
                                ),
                                status: 1,
                            },
                            [
                                'id',
                                'created',
                                'activity_id',
                                'user_id',
                                'source',
                            ],
                            { created: 'DESC', id: 'DESC' },
                        );
                    const biometricsResult = new Map<
                        number,
                        BiometricsEntity[]
                    >();
                    for (let i: number = 0; i < biometricsData.length; i++) {
                        const item: BiometricsEntity = biometricsData[i];
                        item['log_date_tmp'] =
                            this.commonDateService.DateTimeFormat(
                                item.created,
                                'YYYY',
                            );
                        item['years'] = this.commonDateService.DateTimeFormat(
                            item.created,
                            'YYYY',
                        );
                        const existing: BiometricsEntity[] =
                            biometricsResult.get(item.user_id) || [];
                        existing.push(item);
                        biometricsResult.set(item.user_id, existing);
                    }
                    otherDataPass['physician'] = {
                        Authorization: authorizationsResult,
                        activity: biometricsResult,
                    };
                }
                if (biometricIdArray.includes(21)) {
                    let authorizationsData: AuthorizationsEntity[] =
                        await this.authorizationsService.getAll(
                            {
                                user_id: In(userArray),
                                activity_id: 3,
                                status: 1,
                            },
                            [
                                'id',
                                'user_id',
                                'signature',
                                'type_of_form',
                                'date_completed',
                                'activity_id',
                            ],
                            { date_completed: 'DESC' },
                        );
                    const authorizationsResult = new Map<
                        number,
                        AuthorizationsEntity[]
                    >();
                    for (
                        let i: number = 0;
                        i < authorizationsData.length;
                        i++
                    ) {
                        const item: AuthorizationsEntity =
                            authorizationsData[i];
                        item['years'] = this.commonDateService.DateTimeFormat(
                            item.date_completed,
                            'YYYY',
                        );
                        const existing: AuthorizationsEntity[] =
                            authorizationsResult.get(item.user_id) || [];
                        existing.push(item);
                        authorizationsResult.set(item.user_id, existing);
                    }
                    otherDataPass['dental'] = authorizationsResult;
                }
                if (biometricIdArray.includes(22)) {
                    let authorizationsData: AuthorizationsEntity[] =
                        await this.authorizationsService.getAll(
                            {
                                user_id: In(userArray),
                                activity_id: 5,
                                status: 1,
                            },
                            [
                                'id',
                                'user_id',
                                'signature',
                                'type_of_form',
                                'date_completed',
                                'activity_id',
                            ],
                            { date_completed: 'DESC' },
                        );
                    const authorizationsResult = new Map<
                        number,
                        AuthorizationsEntity[]
                    >();
                    for (
                        let i: number = 0;
                        i < authorizationsData.length;
                        i++
                    ) {
                        const item: AuthorizationsEntity =
                            authorizationsData[i];
                        item['years'] = this.commonDateService.DateTimeFormat(
                            item.date_completed,
                            'YYYY',
                        );
                        const existing: AuthorizationsEntity[] =
                            authorizationsResult.get(item.user_id) || [];
                        existing.push(item);
                        authorizationsResult.set(item.user_id, existing);
                    }
                    otherDataPass['optimetric'] = authorizationsResult;
                }
                if (biometricIdArray.includes(30)) {
                    let assessmentData: AssessmentsEntity[] =
                        await this.assessmentService.getAll(
                            { user_id: In(userArray), status: 1 },
                            [],
                            { date: 'DESC' },
                        );
                    const assessmentResult = new Map<
                        number,
                        AssessmentsEntity[]
                    >();
                    for (let i: number = 0; i < assessmentData.length; i++) {
                        const item: AssessmentsEntity = assessmentData[i];
                        item['years'] = this.commonDateService.DateTimeFormat(
                            item.date,
                            'YYYY',
                        );
                        const existing: AssessmentsEntity[] =
                            assessmentResult.get(item.user_id) || [];
                        existing.push(item);
                        assessmentResult.set(item.user_id, existing);
                    }
                    otherDataPass['ohassessment'] = assessmentResult;
                }
                if ([25].some((value) => biometricIdArray.includes(value))) {
                    if (moduleIdArray.includes(1)) {
                        let eventData: EventUserBookingListsEntity[] =
                            await this.eventUserBookingListsService.getAll(
                                { ev_user_id: In(userArray), status: 1 },
                                [
                                    'ev_user_id',
                                    'ev_events_id',
                                    'ev_attend_status',
                                    'modified',
                                ],
                                { modified: 'DESC' },
                            );
                        const eventResult = new Map<
                            number,
                            EventUserBookingListsEntity[]
                        >();
                        for (let i: number = 0; i < eventData.length; i++) {
                            const item: EventUserBookingListsEntity =
                                eventData[i];
                            item['years'] =
                                this.commonDateService.DateTimeFormat(
                                    item.modified,
                                    'YYYY',
                                );
                            const existing: EventUserBookingListsEntity[] =
                                eventResult.get(item.ev_user_id) || [];
                            existing.push(item);
                            eventResult.set(item.ev_user_id, existing);
                        }
                        otherDataPass['event'] = eventResult;
                    }
                    if (moduleIdArray.includes(2)) {
                        otherDataPass['eha'] = await this.emotionalResultData(
                            userArray,
                            orgId,
                        );
                    }
                    if (moduleIdArray.includes(3)) {
                        let biometricsData1: BiometricsEntity[] =
                            await this.biometricsService.getAll(
                                {
                                    user_id: In(userArray),
                                    status: 1,
                                    activity_id: Raw(
                                        (alias) =>
                                            `${alias} REGEXP '(^|,)(208|209|210|211|212|213|214|215|216|217|218|219|220|221|222|223|224|225|226|227|228|229|230|1026|1029|1032|6972|6973|6974)(,|$)'`,
                                    ),
                                },
                                [
                                    'id',
                                    'created',
                                    'activity_id',
                                    'user_id',
                                    'source',
                                ],
                                { created: 'DESC', id: 'DESC' },
                            );
                        const biometricsResult = new Map<
                            number,
                            BiometricsEntity[]
                        >();
                        for (
                            let i: number = 0;
                            i < biometricsData1.length;
                            i++
                        ) {
                            const item: BiometricsEntity = biometricsData1[i];
                            item['log_date_tmp'] =
                                this.commonDateService.DateTimeFormat(
                                    item.created,
                                    'YYYY',
                                );
                            item['years'] =
                                this.commonDateService.DateTimeFormat(
                                    item.created,
                                    'YYYY',
                                );
                            const existing: BiometricsEntity[] =
                                biometricsResult.get(item.user_id) || [];
                            existing.push(item);
                            biometricsResult.set(item.user_id, existing);
                        }
                        otherDataPass['agegender'] = biometricsResult;
                    }
                    if (moduleIdArray.includes(4)) {
                        let scheduleChallengeJoinUsersData: ScheduleChallengeJoinUsersEntity[] =
                            await this.scheduleChallengeJoinUsersService.getAll(
                                { user_id: In(userArray), status: 1 },
                                ['user_id', 'schedule_id', 'added_date'],
                                { added_date: 'DESC' },
                            );
                        const scheduleChallengeJoinUsersResult = new Map<
                            number,
                            ScheduleChallengeJoinUsersEntity[]
                        >();
                        for (
                            let i: number = 0;
                            i < scheduleChallengeJoinUsersData.length;
                            i++
                        ) {
                            const item: ScheduleChallengeJoinUsersEntity =
                                scheduleChallengeJoinUsersData[i];
                            item['years'] =
                                this.commonDateService.DateTimeFormat(
                                    item.added_date,
                                    'YYYY',
                                );
                            const existing: ScheduleChallengeJoinUsersEntity[] =
                                scheduleChallengeJoinUsersResult.get(
                                    item.user_id,
                                ) || [];
                            existing.push(item);
                            scheduleChallengeJoinUsersResult.set(
                                item.user_id,
                                existing,
                            );
                        }
                        otherDataPass['challenge'] =
                            scheduleChallengeJoinUsersResult;
                    }
                    if (moduleIdArray.includes(5)) {
                        let quickLinkClicksData: QuickLinkClicksEntity[] =
                            await this.quickLinkClicksService.getAll(
                                {
                                    user_id: In(userArray),
                                    status: 1,
                                    quicklink_id: Not(IsNull()),
                                },
                                ['user_id', 'quicklink_id', 'created_date'],
                                { created_date: 'DESC' },
                            );
                        const quickLinkClicksResult = new Map<
                            number,
                            QuickLinkClicksEntity[]
                        >();
                        for (
                            let i: number = 0;
                            i < quickLinkClicksData.length;
                            i++
                        ) {
                            const item: QuickLinkClicksEntity =
                                quickLinkClicksData[i];
                            item['years'] =
                                this.commonDateService.DateTimeFormat(
                                    item.created_date,
                                    'YYYY',
                                );
                            const existing: QuickLinkClicksEntity[] =
                                quickLinkClicksResult.get(item.user_id) || [];
                            existing.push(item);
                            quickLinkClicksResult.set(item.user_id, existing);
                        }
                        otherDataPass['quicklink'] = quickLinkClicksResult;
                    }
                    if (moduleIdArray.includes(6)) {
                        let quizData: UserDetailsEntity[] =
                            await this.userDetailsService.getAll(
                                { user_id: In(userArray), status: 1 },
                                [
                                    'user_id',
                                    'completed',
                                    'score',
                                    'quiz_id',
                                    'created_date',
                                ],
                                { id: 'DESC' },
                            );
                        const quizResult = new Map<
                            number,
                            UserDetailsEntity[]
                        >();
                        for (let i: number = 0; i < quizData.length; i++) {
                            const item: UserDetailsEntity = quizData[i];
                            item['years'] =
                                this.commonDateService.DateTimeFormat(
                                    item.created_date,
                                    'YYYY',
                                );
                            const existing = quizResult.get(item.user_id) || [];
                            existing.push(item);
                            quizResult.set(item.user_id, existing);
                        }
                        otherDataPass['quiz'] = quizResult;
                    }
                }
            }
            return otherDataPass;
        } catch (error) {
            this.cronCommonService.errorLog(
                0,
                'my-plan-business-rule',
                error?.message,
                error,
            );
            console.log('error', error);
        }
    }
    async biometricsRecord(condition, tableData = [], orderBy = null) {
        try {
            /* TODO remove recordData and add biometricsrecordData here */
            const recordData = async (data) => {
                let responseData = [];
                for (let i = 0; i < data.length; i++) {
                    let bData = data[i];
                    let bmi: number = 0;
                    if (
                        'weight' in bData &&
                        'height_ft' in bData &&
                        'height_in' in bData
                    ) {
                        let weight: number = Number(bData.weight);
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
                            bData.created == '0000-00-00 00:00:00' || bData.created?.includes('1970') ? bData.inserted : bData.created,
                            'YYYY-MM-DD HH:mm:ss',
                        ),
                        years: await this.commonDateService.DateTimeFormat(
                            bData.created == '0000-00-00 00:00:00' || bData.created?.includes('1970') ? bData.inserted : bData.created,
                            'YYYY',
                        ),
                        enter_by: 0,
                        waist: bData?.waist,
                        random_blood_glucose: bData?.random_blood_glucose,
                        fasting_blood_glucose: bData?.fasting_blood_glucose,
                        is_tobacco_user: bData?.is_tobacco_user ?? 0,
                    };
                    responseData.push({ ...bData, ...bioData });
                }
                return responseData;
            };
            let hcData = await this.biometricsService.commonQueryBuilder(
                [
                    'biometrics.id AS id',
                    'biometrics.user_id AS user_id',
                    'biometrics.height AS height',
                    'biometrics.alc AS alc',
                    'biometrics.weight AS weight',
                    'biometrics.bmi AS bmi',
                    'biometrics.systolic AS systolic',
                    'biometrics.diastolic AS diastolic',
                    'IF(biometrics.test_type = 1, biometrics.blood_glucose, 0) AS random_blood_glucose',
                    'IF(biometrics.test_type = 2, biometrics.blood_glucose, 0) AS fasting_blood_glucose',
                    'biometrics.total_cholesterol AS total_cholesterol',
                    'biometrics.hdl AS hdl',
                    'biometrics.ldl AS ldl',
                    'biometrics.triglycerides AS triglycerides',
                    'biometrics.blood_glucose AS blood_glucose',
                    'biometrics.waist AS waist',
                    'biometrics.source AS source',
                    'biometrics.created AS created',
                    'biometrics.inserted AS inserted',
                    "DATE_FORMAT(biometrics.created, '%Y-%m-%d %H:%i:%s') AS log_date_tmp",
                    "DATE_FORMAT(biometrics.inserted, '%Y-%m-%d %H:%i:%s') AS log_date_insert_tmp",
                    'biometrics.enter_by AS enter_by',
                    "'Biometric' AS frm",
                    'biometrics.is_tobacco_user AS is_tobacco_user',
                ],
                condition['bio'],
                null,
                [],
                'getRawMany',
            );
            hcData = await recordData(hcData);
            let resultedData = hcData;
            if (
                tableData.includes(
                    tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS,
                )
            ) {
                let hraData =
                    await this.assessmentHraBiometricService.commonQueryBuilder(
                        [
                            'hraBiometric.id AS id',
                            'hraBiometric.user_id AS user_id',
                            'hraBiometric.alc AS alc',
                            'hraBiometric.weight AS weight',
                            'hraBiometric.height_ft AS height_ft',
                            'hraBiometric.height_in AS height_in',
                            "CONCAT(hraBiometric.height_ft, '.', hraBiometric.height_in) AS height",
                            'hraBiometric.bp_systolic AS systolic',
                            'IF(hraBiometric.test_type = 1, hraBiometric.blood_glucose, 0) AS random_blood_glucose',
                            'IF(hraBiometric.test_type = 2, hraBiometric.blood_glucose, 0) AS fasting_blood_glucose',
                            'hraBiometric.bp_diastolic AS diastolic',
                            'hraBiometric.total_cholesterol AS total_cholesterol',
                            'hraBiometric.hdl AS hdl',
                            'hraBiometric.ldl AS ldl',
                            'hraBiometric.triglycerides AS triglycerides',
                            'hraBiometric.blood_glucose AS blood_glucose',
                            'hraBiometric.waist AS waist',
                            'hraBiometric.source AS source',
                            'hraBiometric.date AS created',
                            "DATE_FORMAT(hraBiometric.date, '%Y-%m-%d %H:%i:%s') AS log_date_tmp",
                            '0 AS enter_by',
                            "'Hrabiometric' AS frm",
                        ],
                        condition['hra_bio'],
                        null,
                        null,
                        'getRawMany',
                    );
                hraData = await recordData(hraData);
                resultedData = [...resultedData, ...hraData];
            }
            if (tableData.includes(tableConstant.TRACKERS.TBL_FT_BIOMETRICS)) {
                let ftBioData =
                    await this.ftBiometricsService.commonQueryBuilder(
                        [
                            'ftBiometrics.id AS id',
                            'ftBiometrics.user_id AS user_id',
                            'ftBiometrics.alc AS alc',
                            "CONCAT(ftBiometrics.height_ft, '.', ftBiometrics.height_in) AS height",
                            'ftBiometrics.height_ft AS height_ft',
                            'ftBiometrics.height_in AS height_in',
                            'ftBiometrics.weight AS weight',
                            'ftBiometrics.systolic AS systolic ',
                            'ftBiometrics.diastolic AS diastolic',
                            'IF(ftBiometrics.glucose_type = 1, ftBiometrics.glucose, 0) AS random_blood_glucose',
                            'IF(ftBiometrics.glucose_type = 2, ftBiometrics.glucose, 0) as fasting_blood_glucose',
                            'ftBiometrics.glucose AS blood_glucose',
                            'ftBiometrics.chol_total AS total_cholesterol',
                            'ftBiometrics.hdl AS hdl',
                            'ftBiometrics.ldl AS ldl',
                            'ftBiometrics.triglycerides AS triglycerides',
                            'ftBiometrics.added_date AS created',
                            "'' AS waist",
                            "DATE_FORMAT(ftBiometrics.added_date, '%Y-%m-%d %H:%i:%s') AS log_date_tmp",
                            '0 AS enter_by',
                            "'FBiometric' AS frm",
                        ],
                        condition['ft_bio'],
                        null,
                        null,
                        'getRawMany',
                    );
                ftBioData = await recordData(ftBioData);
                resultedData = [...resultedData, ...ftBioData];
            }
            resultedData.sort((a, b) => {
                let dateA = this.commonDateService.DateTimeFormat(
                    a['created'],
                    'timestamp',
                    'YYYY-MM-DD HH:mm:ss',
                );
                let dateB = this.commonDateService.DateTimeFormat(
                    b['created'],
                    'timestamp',
                    'YYYY-MM-DD HH:mm:ss',
                );
                let dateATs = this.commonDateService.DateTimeFormat(
                    a['created'],
                    'YYYY-MM-DD',
                    'YYYY-MM-DD HH:mm:ss',
                );
                let dateBTs = this.commonDateService.DateTimeFormat(
                    b['created'],
                    'YYYY-MM-DD',
                    'YYYY-MM-DD HH:mm:ss',
                );
                if (orderBy?.created == 'DESC') {
                    return dateB - dateA;
                } else {
                    return dateA - dateB;
                }
                if (dateATs === dateBTs) {
                    if (orderBy?.id == 'DESC') {
                        return b['id'] - a['id'];
                    } else {
                        return a['id'] - b['id'];
                    }
                }
            });
            return resultedData;
        } catch (error) {
            console.log('error', error);
            throw new Error(error.message);
        }
    }

    async emotionalResultData(userId, orgId, extraData = '', report = '') {
        try {
            let resultArray = {},
                result = [];
            let tabsAll: AssessmentResultsEntity[] =
                await this.assessmentResultsService.getAll(
                    { organization_id: orgId, status: Not(2) },
                    ['id', 'title', 'type'],
                    { id: 'ASC' },
                );
            if (extraData) {
                let qDatas;
                if (report) {
                    /*TODO "*" remove*/
                    qDatas =
                        await this.assessmentEmotionalAssessmentService.commonQueryBuilder(
                            [],
                            { user_id: In(userId), status: 1 },
                            { 'emotionalAssessment.id': 'DESC' },
                            [
                                {
                                    join_table:
                                        'emotionalAssessment.emotionalAssessmentResult',
                                    alias: 'emotionalAssessmentResult',
                                    table: tableConstant.HEALTH_ASSESSMENT
                                        .TBL_HA_EMOTIONAL_ASSESSMENTS_RESULT,
                                    on_condition: `emotionalAssessmentResult.assessment_id = emotionalAssessment.id AND emotionalAssessmentResult.status = '1'`,
                                    join_type: 'left_many',
                                },
                                {
                                    join_table:
                                        'emotionalAssessmentResult.emotionalAssessmentAnswer',
                                    alias: 'emotionalAssessmentAnswer',
                                    table: tableConstant.HEALTH_ASSESSMENT
                                        .TBL_HA_EMOTIONAL_ASSESSMENTS_ANSWER,
                                    on_condition: `emotionalAssessmentAnswer.result_id = emotionalAssessmentResult.id `,
                                    join_type: 'left_many',
                                },
                                {
                                    join_table:
                                        'emotionalAssessmentAnswer.assessmentOption',
                                    alias: 'assessmentOption',
                                    table: tableConstant.HEALTH_ASSESSMENT
                                        .TBL_HA_ASSESSMENT_OPTIONS,
                                    on_condition: `emotionalAssessmentAnswer.option_id = assessmentOption.id AND assessmentOption.status = '1'`,
                                    join_type: 'left_one',
                                },
                                {
                                    join_table:
                                        'assessmentOption.assessmentQuestion',
                                    alias: 'assessmentQuestion',
                                    table: tableConstant.HEALTH_ASSESSMENT
                                        .TBL_HA_ASSESSMENT_QUESTIONS,
                                    on_condition: `assessmentQuestion.id = assessmentOption.question_id AND assessmentQuestion.status = '1'`,
                                    join_type: 'left_one',
                                },
                                {
                                    join_table:
                                        'assessmentQuestion.assessmentResult',
                                    alias: 'assessmentResult',
                                    table: tableConstant.HEALTH_ASSESSMENT
                                        .TBL_HA_ASSESSMENT_QUESTIONS,
                                    on_condition: `assessmentResult.id = assessmentQuestion.result_type`,
                                    join_type: 'left_one',
                                },
                            ],
                            'getMany',
                        );
                } else {
                    qDatas =
                        await this.assessmentEmotionalAssessmentService.commonQueryBuilder(
                            [],
                            { user_id: In(userId), status: 1 },
                            { 'emotionalAssessment.id': 'DESC' },
                            [
                                {
                                    join_table:
                                        'emotionalAssessment.emotionalAssessmentResult',
                                    alias: 'emotionalAssessmentResult',
                                    table: tableConstant.HEALTH_ASSESSMENT
                                        .TBL_HA_EMOTIONAL_ASSESSMENTS_RESULT,
                                    on_condition: `emotionalAssessmentResult.assessment_id = emotionalAssessment.id AND emotionalAssessmentResult.status = '1'`,
                                    join_type: 'left_many',
                                },
                                {
                                    join_table:
                                        'emotionalAssessmentResult.emotionalAssessmentAnswer',
                                    alias: 'emotionalAssessmentAnswer',
                                    table: tableConstant.HEALTH_ASSESSMENT
                                        .TBL_HA_EMOTIONAL_ASSESSMENTS_ANSWER,
                                    on_condition: `emotionalAssessmentAnswer.result_id = emotionalAssessmentResult.id `,
                                    join_type: 'left_many',
                                },
                                {
                                    join_table:
                                        'emotionalAssessmentAnswer.assessmentOption',
                                    alias: 'assessmentOption',
                                    table: tableConstant.HEALTH_ASSESSMENT
                                        .TBL_HA_ASSESSMENT_OPTIONS,
                                    on_condition: `emotionalAssessmentAnswer.option_id = assessmentOption.id AND assessmentOption.status = '1'`,
                                    join_type: 'left_one',
                                },
                                {
                                    join_table:
                                        'assessmentOption.assessmentQuestion',
                                    alias: 'assessmentQuestion',
                                    table: tableConstant.HEALTH_ASSESSMENT
                                        .TBL_HA_ASSESSMENT_QUESTIONS,
                                    on_condition: `assessmentQuestion.id = assessmentOption.question_id AND assessmentQuestion.status = '1'`,
                                    join_type: 'left_one',
                                },
                                {
                                    join_table:
                                        'assessmentQuestion.assessmentResult',
                                    alias: 'assessmentResult',
                                    table: tableConstant.HEALTH_ASSESSMENT
                                        .TBL_HA_ASSESSMENT_QUESTIONS,
                                    on_condition: `assessmentResult.id = assessmentQuestion.result_type`,
                                    join_type: 'left_one',
                                },
                            ],
                            'getOne',
                        );
                }
                if (report) {
                    let questionScore = {},
                        tobaccoVaping = { tobacco: {} },
                        result = {},
                        tabsAllExtraData = {};
                    if (tabsAll && tabsAll.length > 0 && qDatas) {
                        qDatas.forEach((qData) => {
                            if (qData['ear']) {
                                qData['ear'].forEach((results) => {
                                    results['eaa'].forEach((answer) => {
                                        let options = answer['ao'];
                                        if (options) {
                                            let question = options['aq'];
                                            if (question) {
                                                let userId = qData['user_id'];
                                                let resultType =
                                                    question['result_type'];
                                                let riskRating =
                                                    options['risk_rating'];
                                                questionScore[userId] =
                                                    questionScore[userId] || {};
                                                questionScore[userId][
                                                    resultType
                                                ] =
                                                    questionScore[userId][
                                                        resultType
                                                    ] || {};
                                                questionScore[userId][
                                                    resultType
                                                ][riskRating] =
                                                    (questionScore[userId][
                                                        resultType
                                                    ][riskRating] || 0) + 1;
                                                if (
                                                    question?.['ar'] &&
                                                    [1, 2, 3].includes(
                                                        question?.['ar'][
                                                            'type'
                                                        ],
                                                    )
                                                ) {
                                                    if (
                                                        answer['ao']['aq'][
                                                            'ar'
                                                        ]['type'] === 2
                                                    ) {
                                                        if (
                                                            answer['ao']['aq'][
                                                                'ar'
                                                            ][
                                                                'marker-common'
                                                            ] !== ''
                                                        ) {
                                                            tobaccoVaping[
                                                                'tobacco'
                                                            ][
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ][-1] =
                                                                tobaccoVaping[
                                                                    'tobacco'
                                                                ][
                                                                    answer[
                                                                        'ao'
                                                                    ]['aq'][
                                                                        'result_type'
                                                                    ]
                                                                ][-1] || [];
                                                            tobaccoVaping[
                                                                'tobacco'
                                                            ][
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ][-1].push(
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['ar'][
                                                                    'marker-common'
                                                                ],
                                                            );
                                                        }
                                                        if (
                                                            answer['ao'][
                                                                'message_add'
                                                            ] !== ''
                                                        ) {
                                                            tobaccoVaping[
                                                                'tobacco'
                                                            ][
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ][
                                                                answer['ao'][
                                                                    'sort_order'
                                                                ]
                                                            ] =
                                                                answer['ao'][
                                                                    'message_add'
                                                                ];
                                                            let result_type =
                                                                answer['ao'][
                                                                    'aq'
                                                                ][
                                                                    'result_type'
                                                                ];
                                                            let currentTypeTobacco =
                                                                tobaccoVaping[
                                                                    'tobacco'
                                                                ][result_type];
                                                            if (
                                                                currentTypeTobacco[1]
                                                            ) {
                                                                delete currentTypeTobacco[2];
                                                                delete currentTypeTobacco[3];
                                                                delete currentTypeTobacco[4];
                                                                delete currentTypeTobacco[5];
                                                            } else if (
                                                                currentTypeTobacco[2]
                                                            ) {
                                                                delete currentTypeTobacco[3];
                                                                delete currentTypeTobacco[4];
                                                                delete currentTypeTobacco[5];
                                                            } else if (
                                                                currentTypeTobacco[3]
                                                            ) {
                                                                delete currentTypeTobacco[4];
                                                                delete currentTypeTobacco[5];
                                                            } else if (
                                                                currentTypeTobacco[4]
                                                            ) {
                                                                delete currentTypeTobacco[5];
                                                            }
                                                        }
                                                        if (
                                                            [1, 2, 3].includes(
                                                                answer['ao'][
                                                                    'sort_order'
                                                                ],
                                                            ) &&
                                                            answer['ao']['aq'][
                                                                'ar'
                                                            ]['is_response'] ===
                                                                1 &&
                                                            answer['ao']['aq'][
                                                                'ar'
                                                            ][
                                                                'marker-common_last'
                                                            ] !== ''
                                                        ) {
                                                            tobaccoVaping[
                                                                'tobacco'
                                                            ][
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ][100] =
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['ar'][
                                                                    'marker-common_last'
                                                                ];
                                                        }
                                                    } else {
                                                        if (
                                                            answer['ao'][
                                                                'message_add'
                                                            ] !== ''
                                                        ) {
                                                            tobaccoVaping[
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ][
                                                                answer['ao'][
                                                                    'sort_order'
                                                                ]
                                                            ] =
                                                                answer['ao'][
                                                                    'message_add'
                                                                ];
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    });
                                });
                                if (questionScore[qData['user_id']]) {
                                    Object.keys(
                                        questionScore[qData['user_id']],
                                    ).forEach((key) => {
                                        if (
                                            questionScore[qData['user_id']][
                                                key
                                            ][2]
                                        )
                                            questionScore[qData['user_id']][
                                                key
                                            ] = 2;
                                        else if (
                                            questionScore[qData['user_id']][
                                                key
                                            ][1]
                                        )
                                            questionScore[qData['user_id']][
                                                key
                                            ] = 1;
                                        else
                                            questionScore[qData['user_id']][
                                                key
                                            ] = 0;
                                    });
                                }
                            }
                            tabsAll.forEach((tab) => {
                                let resultId = tab['id'];
                                tabsAllExtraData[resultId] = tab['title'];
                                if (
                                    questionScore[qData['user_id']] &&
                                    questionScore[qData['user_id']][resultId]
                                ) {
                                    result[qData['user_id']] =
                                        result[qData['user_id']] || {};
                                    result[qData['user_id']][resultId] =
                                        questionScore[qData['user_id']][
                                            resultId
                                        ];
                                }
                            });
                        });
                        if (extraData === 'Yes') {
                            result['result_detail'] = tabsAllExtraData;
                        }
                    }
                    resultArray = result;
                } else {
                    let questionScore = {},
                        tobaccoVaping = { tobacco: {} },
                        tabsAllExtraData = {};
                    if (tabsAll && tabsAll.length > 0 && qDatas) {
                        if (qDatas['ear']) {
                            qDatas['ear'].forEach((results) => {
                                results['eaa'].forEach((answer) => {
                                    let options = answer['ao'];
                                    if (options) {
                                        let question = options['aq'];
                                        if (question) {
                                            let resultType =
                                                question['result_type'];
                                            let riskRating =
                                                options['risk_rating'];
                                            questionScore[resultType] =
                                                questionScore[resultType] || {};
                                            questionScore[resultType][
                                                riskRating
                                            ] =
                                                (questionScore[resultType][
                                                    riskRating
                                                ] || 0) + 1;
                                            if (
                                                question['ar'] &&
                                                [1, 2, 3].includes(
                                                    question['ar']['type'],
                                                )
                                            ) {
                                                if (
                                                    answer['ao']['aq']['ar'][
                                                        'type'
                                                    ] == 2
                                                ) {
                                                    tobaccoVaping['tobacco'][
                                                        answer['ao']['aq'][
                                                            'result_type'
                                                        ]
                                                    ] =
                                                        tobaccoVaping[
                                                            'tobacco'
                                                        ][
                                                            answer['ao']['aq'][
                                                                'result_type'
                                                            ]
                                                        ] || {};
                                                    if (
                                                        answer['ao']['aq'][
                                                            'ar'
                                                        ]['marker-common'] != ''
                                                    ) {
                                                        tobaccoVaping[
                                                            'tobacco'
                                                        ][
                                                            answer['ao']['aq'][
                                                                'result_type'
                                                            ]
                                                        ][-1] =
                                                            tobaccoVaping[
                                                                'tobacco'
                                                            ][
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ][-1] || [];
                                                        tobaccoVaping[
                                                            'tobacco'
                                                        ][
                                                            answer['ao']['aq'][
                                                                'result_type'
                                                            ]
                                                        ][-1].push(
                                                            answer['ao']['aq'][
                                                                'ar'
                                                            ]['marker-common'],
                                                        );
                                                    }
                                                    if (
                                                        answer['ao'][
                                                            'message_add'
                                                        ] != ''
                                                    ) {
                                                        tobaccoVaping[
                                                            'tobacco'
                                                        ][
                                                            answer['ao']['aq'][
                                                                'result_type'
                                                            ]
                                                        ][
                                                            answer['ao'][
                                                                'sort_order'
                                                            ]
                                                        ] =
                                                            tobaccoVaping[
                                                                'tobacco'
                                                            ][
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ][
                                                                answer['ao'][
                                                                    'sort_order'
                                                                ]
                                                            ] || [];
                                                        tobaccoVaping[
                                                            'tobacco'
                                                        ][
                                                            answer['ao']['aq'][
                                                                'result_type'
                                                            ]
                                                        ][
                                                            answer['ao'][
                                                                'sort_order'
                                                            ]
                                                        ].push(
                                                            answer['ao'][
                                                                'message_add'
                                                            ],
                                                        );
                                                        if (
                                                            tobaccoVaping[
                                                                'tobacco'
                                                            ]?.[
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ]?.[1]
                                                        ) {
                                                            delete tobaccoVaping[
                                                                'tobacco'
                                                            ][
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ][2];
                                                            delete tobaccoVaping[
                                                                'tobacco'
                                                            ][
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ][3];
                                                            delete tobaccoVaping[
                                                                'tobacco'
                                                            ][
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ][4];
                                                            delete tobaccoVaping[
                                                                'tobacco'
                                                            ][
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ][5];
                                                        } else if (
                                                            tobaccoVaping[
                                                                'tobacco'
                                                            ]?.[
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ]?.[2]
                                                        ) {
                                                            delete tobaccoVaping[
                                                                'tobacco'
                                                            ][
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ][3];
                                                            delete tobaccoVaping[
                                                                'tobacco'
                                                            ][
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ][4];
                                                            delete tobaccoVaping[
                                                                'tobacco'
                                                            ][
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ][5];
                                                        } else if (
                                                            tobaccoVaping[
                                                                'tobacco'
                                                            ]?.[
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ]?.[3]
                                                        ) {
                                                            delete tobaccoVaping[
                                                                'tobacco'
                                                            ][
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ][4];
                                                            delete tobaccoVaping[
                                                                'tobacco'
                                                            ][
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ][5];
                                                        } else if (
                                                            tobaccoVaping[
                                                                'tobacco'
                                                            ]?.[
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ]?.[4]
                                                        ) {
                                                            delete tobaccoVaping[
                                                                'tobacco'
                                                            ][
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ][5];
                                                        }
                                                    }
                                                    if (
                                                        [1, 2, 3].includes(
                                                            answer['ao'][
                                                                'sort_order'
                                                            ],
                                                        ) &&
                                                        answer['ao']['aq'][
                                                            'ar'
                                                        ]['is_response'] == 1 &&
                                                        answer['ao']['aq'][
                                                            'ar'
                                                        ][
                                                            'marker-common_last'
                                                        ] != ''
                                                    ) {
                                                        tobaccoVaping[
                                                            'tobacco'
                                                        ][
                                                            answer['ao']['aq'][
                                                                'result_type'
                                                            ]
                                                        ][100] =
                                                            tobaccoVaping[
                                                                'tobacco'
                                                            ][
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ][100] || [];
                                                        tobaccoVaping[
                                                            'tobacco'
                                                        ][
                                                            answer['ao']['aq'][
                                                                'result_type'
                                                            ]
                                                        ][100].push(
                                                            answer['ao']['aq'][
                                                                'ar'
                                                            ][
                                                                'marker-common_last'
                                                            ],
                                                        );
                                                    }
                                                } else {
                                                    if (
                                                        answer['ao'][
                                                            'message_add'
                                                        ] != ''
                                                    ) {
                                                        tobaccoVaping[
                                                            answer['ao']['aq'][
                                                                'result_type'
                                                            ]
                                                        ] =
                                                            tobaccoVaping[
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ] || {};
                                                        tobaccoVaping[
                                                            answer['ao']['aq'][
                                                                'result_type'
                                                            ]
                                                        ][
                                                            answer['ao'][
                                                                'sort_order'
                                                            ]
                                                        ] =
                                                            tobaccoVaping[
                                                                answer['ao'][
                                                                    'aq'
                                                                ]['result_type']
                                                            ][
                                                                answer['ao'][
                                                                    'sort_order'
                                                                ]
                                                            ] || [];
                                                        tobaccoVaping[
                                                            answer['ao']['aq'][
                                                                'result_type'
                                                            ]
                                                        ][
                                                            answer['ao'][
                                                                'sort_order'
                                                            ]
                                                        ].push(
                                                            answer['ao'][
                                                                'message_add'
                                                            ],
                                                        );
                                                    }
                                                }
                                            }
                                        }
                                    }
                                });
                            });
                            const questionScoreKeys =
                                Object.keys(questionScore);
                            for (
                                let i: number = 0;
                                i < questionScoreKeys?.length;
                                i++
                            ) {
                                let questionScoreKey = questionScoreKeys[i];
                                let questionScoreData =
                                    questionScore[questionScoreKey];
                                if (questionScoreData['2'] !== undefined) {
                                    questionScore[questionScoreKey] = 2;
                                } else if (
                                    questionScoreData['1'] !== undefined
                                ) {
                                    questionScore[questionScoreKey] = 1;
                                } else {
                                    questionScore[questionScoreKey] = 0;
                                }
                            }
                        }
                    }
                    for (let i: number = 0; i < tabsAll?.length; i++) {
                        let tab = tabsAll[i];
                        let resultId = tab['id'];
                        tabsAllExtraData[resultId] = tab['title'];
                        if (questionScore[resultId]) {
                            resultArray[resultId] = questionScore[resultId];
                        }
                    }
                    if (extraData === 'Yes') {
                        resultArray['result_detail'] = tabsAllExtraData;
                    }
                }
                return resultArray;
            } else {
                if (!Array.isArray(userId)) {
                    userId = userId.split(',');
                }
                let qData = {};
                let emotional = {};
                const chunkArray = (array, chunkSize) => {
                    const result = [];
                    for (let i: number = 0; i < array?.length; i += chunkSize) {
                        result.push(array.slice(i, i + chunkSize));
                    }
                    return result;
                };
                const userIdChunks = chunkArray(userId, 500);
                for (
                    let userIdKey: number = 0;
                    userIdKey < userIdChunks?.length;
                    userIdKey++
                ) {
                    const userIdChunk = userIdChunks[userIdKey];
                    let userIds = userIdChunk.join(',');
                    let assessmentData =
                        await this.assessmentEmotionalAssessmentService.commonQueryBuilder(
                            [
                                'emotionalAssessment.id',
                                'emotionalAssessment.created',
                                'emotionalAssessment.user_id',
                                'emotionalAssessmentResult.id',
                            ],
                            { user_id: In(userIdChunk), status: 1 },
                            { 'emotionalAssessment.id': 'DESC' },
                            [
                                {
                                    join_table:
                                        'emotionalAssessment.emotionalAssessmentResult',
                                    alias: 'emotionalAssessmentResult',
                                    table: tableConstant.HEALTH_ASSESSMENT
                                        .TBL_HA_EMOTIONAL_ASSESSMENTS_RESULT,
                                    on_condition: `emotionalAssessmentResult.assessment_id = emotionalAssessment.id AND emotionalAssessmentResult.status = '1'`,
                                    join_type: 'left_many',
                                },
                            ],
                            'getMany',
                        );
                    const EmotionalAssessmentsResults = {};
                    for (let i: number = 0; i < assessmentData?.length; i++) {
                        const parent = assessmentData[i];
                        const ears = parent.ear;
                        for (let j: number = 0; j < ears?.length; j++) {
                            const earItem = ears[j];
                            EmotionalAssessmentsResults[earItem.id] = {
                                id: parent.id,
                                created: parent.created,
                                user_id: parent.user_id,
                                years: await this.commonDateService.DateTimeFormat(
                                    parent.created,
                                    'YYYY',
                                    'YYYY-MM-DD HH:mm:ss',
                                ),
                                ear: earItem,
                            };
                        }
                    }
                    let AssessmentResultsKeys = Object.keys(
                        EmotionalAssessmentsResults,
                    );
                    if (AssessmentResultsKeys.length === 0) {
                        continue;
                    }
                    let assessmentAnswerData: AssessmentEmotionalAssessmentAnswerEntity[] =
                        await this.assessmentEmotionalAssessmentAnswerService.getAll(
                            { result_id: In(AssessmentResultsKeys), status: 1 },
                            ['id', 'option_id', 'result_id'],
                        );
                    let emotionalAssessmentsAnswers = {},
                        emotionalAssessmentsAnswersTmp = {};
                    for (
                        let i: number = 0;
                        i < assessmentAnswerData?.length;
                        i++
                    ) {
                        let item: AssessmentEmotionalAssessmentAnswerEntity =
                            assessmentAnswerData[i];
                        if (!emotionalAssessmentsAnswers[item.result_id]) {
                            emotionalAssessmentsAnswers[item.result_id] = {};
                        }
                        emotionalAssessmentsAnswers[item.result_id][item.id] =
                            item.option_id;
                        emotionalAssessmentsAnswersTmp[item.id] =
                            item.option_id;
                    }
                    let uniqueAnswers = Array.from(
                        new Set(Object.values(emotionalAssessmentsAnswersTmp)),
                    );
                    let implodedAnswers = uniqueAnswers.join(',');
                    let assessmentOptionData =
                        await this.assessmentOptionsService.commonQueryBuilder(
                            [
                                'assessmentOptions.id',
                                'assessmentOptions.status',
                                'assessmentOptions.risk_rating',
                                'aq.id',
                                'aq.result_type',
                                'ar.id',
                            ],
                            { id: In(uniqueAnswers), status: 1 },
                            { 'assessmentOptions.sort_order': 'ASC' },
                            [
                                {
                                    join_table:
                                        'assessmentOptions.assessmentQuestion',
                                    alias: 'assessmentQuestion',
                                    table: tableConstant.HEALTH_ASSESSMENT
                                        .TBL_HA_ASSESSMENT_QUESTIONS,
                                    on_condition: `assessmentOptions.question_id = assessmentQuestion.id AND assessmentQuestion.status = '1'`,
                                    join_type: 'left_one',
                                },
                                {
                                    join_table:
                                        'assessmentQuestion.assessmentResult',
                                    alias: 'assessmentResult',
                                    table: tableConstant.HEALTH_ASSESSMENT
                                        .TBL_HA_ASSESSMENT_RESULTS,
                                    on_condition: `assessmentQuestion.result_type = assessmentResult.id AND assessmentResult.status = '1'`,
                                    join_type: 'left_one',
                                },
                            ],
                            'getMany',
                        );
                    let AssessmentOptions = {};
                    for (
                        let i: number = 0;
                        i < assessmentOptionData?.length;
                        i++
                    ) {
                        AssessmentOptions[assessmentOptionData[i].id] =
                            assessmentOptionData[i];
                    }
                    const keys = Object.keys(EmotionalAssessmentsResults);
                    for (let i: number = 0; i < keys?.length; i++) {
                        let key = keys[i];
                        let qDataVal = EmotionalAssessmentsResults[key];
                        if (emotionalAssessmentsAnswers[key]) {
                            const answers =
                                emotionalAssessmentsAnswers[
                                    qDataVal['ear']['id']
                                ];
                            const answersKeys = Object.keys(answers);
                            for (
                                let j: number = 0;
                                j < answersKeys?.length;
                                j++
                            ) {
                                let element = answers[answersKeys[j]];
                                let AssessmentOption = AssessmentOptions[
                                    `${element}`
                                ]
                                    ? AssessmentOptions[`${element}`]
                                    : {};
                                qData[qDataVal['id']] =
                                    qData[qDataVal['id']] || {};
                                qData[qDataVal['id']][
                                    'EmotionalAssessmentsResults'
                                ] =
                                    qData[qDataVal['id']][
                                        'EmotionalAssessmentsResults'
                                    ] || {};
                                qData[qDataVal['id']][
                                    'EmotionalAssessmentsResults'
                                ][qDataVal['ear']['id']] =
                                    qData[qDataVal['id']][
                                        'EmotionalAssessmentsResults'
                                    ][qDataVal['ear']['id']] || {};
                                qData[qDataVal['id']][
                                    'EmotionalAssessmentsResults'
                                ][qDataVal['ear']['id']][
                                    'EmotionalAssessmentsAnswers'
                                ] =
                                    qData[qDataVal['id']][
                                        'EmotionalAssessmentsResults'
                                    ][qDataVal['ear']['id']][
                                        'EmotionalAssessmentsAnswers'
                                    ] || {};
                                qData[qDataVal['id']][
                                    'EmotionalAssessmentsResults'
                                ][qDataVal['ear']['id']][
                                    'EmotionalAssessmentsAnswers'
                                ][answersKeys[j]] =
                                    qData[qDataVal['id']][
                                        'EmotionalAssessmentsResults'
                                    ][qDataVal['ear']['id']][
                                        'EmotionalAssessmentsAnswers'
                                    ][answersKeys[j]] || {};
                                qData[qDataVal['id']][
                                    'EmotionalAssessmentsResults'
                                ][qDataVal['ear']['id']][
                                    'EmotionalAssessmentsAnswers'
                                ][answersKeys[j]]['AssessmentOptions'] =
                                    qData[qDataVal['id']][
                                        'EmotionalAssessmentsResults'
                                    ][qDataVal['ear']['id']][
                                        'EmotionalAssessmentsAnswers'
                                    ][answersKeys[j]]['AssessmentOptions'] ||
                                    {};
                                qData[qDataVal['id']][
                                    'EmotionalAssessmentsResults'
                                ][qDataVal['ear']['id']][
                                    'EmotionalAssessmentsAnswers'
                                ][answersKeys[j]]['AssessmentOptions'][
                                    'risk_rating'
                                ] = AssessmentOption['risk_rating'] ?? '';
                                qData[qDataVal['id']][
                                    'EmotionalAssessmentsResults'
                                ][qDataVal['ear']['id']][
                                    'EmotionalAssessmentsAnswers'
                                ][answersKeys[j]]['AssessmentOptions'][
                                    'AssessmentQuestions'
                                ] =
                                    qData[qDataVal['id']][
                                        'EmotionalAssessmentsResults'
                                    ][qDataVal['ear']['id']][
                                        'EmotionalAssessmentsAnswers'
                                    ][answersKeys[j]]['AssessmentOptions'][
                                        'AssessmentQuestions'
                                    ] || {};
                                qData[qDataVal['id']][
                                    'EmotionalAssessmentsResults'
                                ][qDataVal['ear']['id']][
                                    'EmotionalAssessmentsAnswers'
                                ][answersKeys[j]]['AssessmentOptions'][
                                    'AssessmentQuestions'
                                ]['result_type'] =
                                    AssessmentOption['aq']?.['result_type'] ??
                                    '';
                                qData[qDataVal['id']][
                                    'EmotionalAssessmentsResults'
                                ][qDataVal['ear']['id']][
                                    'EmotionalAssessmentsAnswers'
                                ][answersKeys[j]]['AssessmentOptions'][
                                    'AssessmentQuestions'
                                ]['AssessmentResults'] =
                                    AssessmentOption['aq']?.['ar'] || '';
                            }
                        }
                        qData[qDataVal['id']] = qData[qDataVal['id']] || {};
                        qData[qDataVal['id']]['0'] = qDataVal['years'];
                        qData[qDataVal['id']]['years'] = qDataVal['years'];
                        qData[qDataVal['id']]['EmotionalAssessments'] =
                            qDataVal;
                    }
                }
                emotional['Tabsall'] = tabsAll;
                emotional['qData'] = qData;
                emotional['extradata'] = extraData;
                return emotional;
            }
        } catch (error) {
            console.log('error', error);
            throw new Error(error.message);
        }
    }

    mergeNestedObjects(obj1, obj2) {
        return Object.fromEntries(
            [...new Set([...Object.keys(obj1), ...Object.keys(obj2)])].map(
                (key) => [key, { ...(obj1[key] || {}), ...(obj2[key] || {}) }],
            ),
        );
    }

    filterUserActivityByDate(allActivityData, startDate, endDate) {
        if (!allActivityData) return {};

        if (!startDate || !endDate) return allActivityData;

        const start = new Date(startDate);
        const end = new Date(endDate);

        const isValidDate = (item) => {
            if (!item?.log_date_tmp) return false;
            const logDate =
                item.log_date_tmp instanceof Date
                    ? item.log_date_tmp
                    : new Date(item.log_date_tmp);
            return logDate >= start && logDate <= end;
        };

        const filterNestedData = (data) => {
            if (!data) return data;

            if (Array.isArray(data)) {
                return data.filter(isValidDate);
            }

            if (typeof data === 'object') {
                const filtered = {};
                Object.keys(data).forEach((key) => {
                    const value = data[key];
                    if (Array.isArray(value)) {
                        filtered[key] = value.filter(isValidDate);
                    } else {
                        filtered[key] = filterNestedData(value);
                    }
                });
                return filtered;
            }

            return data;
        };

        const result = {};
        Object.keys(allActivityData).forEach((key) => {
            result[key] = filterNestedData(allActivityData[key]);
        });

        return result;
    }
}
