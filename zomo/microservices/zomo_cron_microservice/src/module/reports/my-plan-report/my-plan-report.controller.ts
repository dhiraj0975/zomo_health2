import {
    ActivePluginsEntity,
    ActivityFeedsEntity,
    appConstant,
    AssessmentHraBiometricEntity,
    AssessmentsEntity,
    AuthorizationsEntity,
    BiometricsEntity,
    BodyFeedsEntity,
    CampaignEntity,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    CompaniesEntity,
    DentistsEntity,
    EmotionalWellBeingCategoryEntity,
    EmotionalWellBeingPostClickEntity,
    EmotionalWellBeingPostEntity,
    EventEntity,
    EventUserBookingListsEntity,
    FoodFeedsEntity,
    FtBiometricsEntity,
    IncentiveReportsEntity,
    MediaFitnessVideoClickEntity,
    MyPlanAssignPlanEntity,
    MyPlanAssignUserPlanEntity,
    MyPlanBlocksEntity,
    MyPlanCompleteActivityEntity,
    MyPlanCompleteBlockEntity,
    MyPlanJoinUserPlanEntity,
    OptometristsEntity,
    QuickLinkClicksEntity,
    QuickLinkEntity,
    ScheduleChallengeEntity,
    ScheduleChallengeJoinUsersEntity,
    SubmitedFormsEntity,
    tableConstant,
    TobaccoUsesEntity,
    UserDetailsEntity,
    UserEntity,
    UserLoginEntity,
    CronStatus,
    AssessmentEmotionalAssessmentEntity, System_Type,
} from '@common-constants';
import { Controller, Inject } from '@nestjs/common';
import { ClientProxy, MessagePattern } from '@nestjs/microservices';
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import {
    Between,
    FindOptionsWhere,
    In,
    LessThanOrEqual,
    MoreThanOrEqual,
    Not,
    Raw,
} from 'typeorm';
import { cronAppConstant, CronCommonService } from '../../../common';
import { SubmitFormsService } from '../../activity-tracker';
import { CampaignService } from '../../campaign/campaign.service';
import { ScheduleChallengeJoinUsersService } from '../../challenge';
import { ScheduleChallengeService } from '../../challenge/schedulechallenge/schedulechallenge.service';
import { ActivePluginService } from '../../company';
import { CompanyService } from '../../company/company.service';
import { DepartmentService } from '../../company/department.service';
import { LocationServices } from '../../company/location.service';
import { WellBeingCategoryService, WellBeingPostClickService } from '../../emotional-well-being';
import { WellBeingPostService } from '../../emotional-well-being/well-being-post/well-being-post.service';
import {
    EventCategoryService,
    EventUserBookingListsService,
} from '../../events';
import { EventService } from '../../events/events.service';
import { FitnessVideoClickService } from '../../fitness/fitnessvideoclick.service';
import {
    AssessmentEmotionalAssessmentService,
    AssessmentHraBiometricService,
} from '../../healthassessment';
import { AssessmentService } from '../../healthassessment/assessments.service';
import {
    BiometricsService,
    DentistsService,
    OptometristsService,
    TobaccoUsesService,
} from '../../healthcheckup';
import { AuthorizationsService } from '../../healthcheckup/authorizations/authorizations.service';
import { IncentiveReportsService } from '../../incentivereports/incentivereports.service';
import {
    MyPlanAssignPlanService,
    MyPlanAssignRuleService,
    MyPlanAssignUserPlanService,
    MyPlanCompleteActivityService,
    MyPlanCompleteBlockService,
    MyPlanJoinUserPlanService,
} from '../../myplan';
import { MyPlanPlansService } from '../../myplan/plan/plans.service';
import { QuickLinkService } from '../../quicklink/quicklink.service';
import { QuickLinkClicksService } from '../../quicklink/quicklinkclicks.service';
import { QuizQuizzesService, UserDetailsService } from '../../quiz';
import { FtBiometricsService } from '../../tracker';
import { ActivityFeedService } from '../../tracker/activityfeeds.service';
import { BodyFeedService } from '../../tracker/body-feeds/body-feeds.service';
import { FoodFeedService } from '../../tracker/foodfeeds.service';
import { UserLoginService } from '../../user';
import { UserService } from '../../user/user.service';
import { UserSettingsService } from '../../user/usersettings.service';
import { MyPlanReportService } from './my-plan-report.service';
import {
    ActivityFeedsEntityType,
    AllBiometricType,
    AssessmentsType,
    assignRuleInterface,
    AuthorizationsType,
    biometricInterface,
    CompleteActivityType,
    CompleteBlockType,
    DentistsType,
    eEventsCategoryType,
    EmotionalWellBeingPostClickType,
    EventUserBookingListsType,
    FoodFeedsType,
    JoinUserPlanType,
    MediaFitnessVideoClickType,
    OptometristsType,
    PlanInterface,
    QuickLinkClicksType,
    QuizInAssignQuizOrgInterface,
    ScheduleChallengeJoinUsersType,
    SubmitedFormsType,
    TobaccoUsesType,
    TrBiometricsType,
    UserDetailsType,
} from '../../../interface';
import { CommunicationTemplateTextsService } from 'src/module/communication/templatetexts/communicationtemplatetexts.service';
import moment from "moment-timezone";
import {spawn} from "child_process";
import {UserChallengeHelperService} from "../../challenge/userChallengeHelper.service";

@Controller('plan-report')
export class MyPlanReportController {
    constructor(
        private readonly commonService: CommonService,
        private readonly userService: UserService,
        private readonly commonArrayService: CommonArrayService,
        private readonly cronCommonService: CronCommonService,
        private readonly myPlanPlansService: MyPlanPlansService,
        private readonly myPlanReportService: MyPlanReportService,
        private readonly incentiveReportsService: IncentiveReportsService,
        private readonly userSettingsService: UserSettingsService,
        private readonly commonFileService: CommonFileService,
        private readonly companyService: CompanyService,
        private readonly commonDateService: CommonDateService,
        private readonly locationServices: LocationServices,
        private readonly departmentService: DepartmentService,
        private readonly myPlanAssignUserPlanService: MyPlanAssignUserPlanService,
        private readonly myPlanAssignPlanService: MyPlanAssignPlanService,
        private readonly myPlanJoinUserPlanService: MyPlanJoinUserPlanService,
        private readonly myPlanAssignRuleService: MyPlanAssignRuleService,
        private readonly campaignService: CampaignService,
        private readonly assessmentEmotionalAssessmentService: AssessmentEmotionalAssessmentService,
        private readonly assessmentService: AssessmentService,
        private readonly quizQuizzesService: QuizQuizzesService,
        private readonly quickLinkService: QuickLinkService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly eventCategoryService: EventCategoryService,
        private readonly eventService: EventService,
        private readonly activePluginService: ActivePluginService,
        private readonly biometricsService: BiometricsService,
        private readonly dentistsService: DentistsService,
        private readonly optometristsService: OptometristsService,
        private readonly tobaccoUsesService: TobaccoUsesService,
        private readonly submitFormsService: SubmitFormsService,
        private readonly userLoginService: UserLoginService,
        private readonly authorizationsService: AuthorizationsService,
        private readonly quickLinkClicksService: QuickLinkClicksService,
        private readonly eventUserBookingListsService: EventUserBookingListsService,
        private readonly userDetailsService: UserDetailsService,
        private readonly wellBeingPostService: WellBeingPostService,
        private readonly wellBeingPostClickService: WellBeingPostClickService,
        private readonly fitnessVideoClickService: FitnessVideoClickService,
        private readonly scheduleChallengeJoinUsersService: ScheduleChallengeJoinUsersService,
        private readonly activityFeedService: ActivityFeedService,
        private readonly foodFeedService: FoodFeedService,
        private readonly assessmentHraBiometricService: AssessmentHraBiometricService,
        private readonly bodyFeedService: BodyFeedService,
        private readonly ftBiometricsService: FtBiometricsService,
        private readonly myPlanCompleteActivityService: MyPlanCompleteActivityService,
        private readonly myPlanCompleteBlockService: MyPlanCompleteBlockService,
        private readonly wellBeingCategoryService: WellBeingCategoryService,
        private readonly commonHealthService: CommonHealthService,
        private readonly communicationTemplateTextService: CommunicationTemplateTextsService,
        private readonly userChallengeHelperService: UserChallengeHelperService,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
    ) {}
    @MessagePattern({ cmd: 'my-plan-report' })
    async myPlanReport() {
        try {
            const reportWhereClause = {status: 0,report_type: 'Myplan',system_type: System_Type.NEW,cron_status: CronStatus.COMPILATION}
            let reportData: IncentiveReportsEntity | null = await this.incentiveReportsService.getOne(reportWhereClause,['id','user_id','condition','camp_id','org_id','membership_code','start_date_range','end_date_range','email','engagement_report'],{id: "DESC"})
            if (!reportData) {
                return true;
            }
            let companyData: CompaniesEntity = await this.companyService.getOne(
                { id: reportData?.org_id, status: 1, deleted: 0 },
                ['id', 'company_name'],
            );
            let companyName = companyData?.company_name;
            if (!companyData) {
                return true;
            }
            let userDetails: UserEntity = await this.userService.getOne(
                { id: reportData?.user_id },
                ['id', 'first_name', 'username', 'email'],
            );
            let sendEmail = userDetails?.email;
            if (reportData?.email) {
                sendEmail = reportData?.email;
            }
            reportData.condition = reportData?.condition
                .replace(/User/g, 'users')
                .replace(/Location/g, 'location');
            let userData = await this.userService.commonQueryBuilder(
                [
                    'users.id',
                    'users.code',
                    'users.is_camp_eligible',
                    'users.username',
                    'users.membership_code',
                    'users.last_name',
                    'users.first_name',
                    'users.middle_name',
                    'users.securitycode',
                    'users.employeeid',
                    'users.dob',
                    'users.on_insurance_plan',
                    'users.insurance_plan_name',
                    'users.gender',
                    'users.date_of_hire',
                    'users.email',
                    'users.location',
                    'users.role_id',
                    'users.relationship_id',
                    'users.department_id',
                    'userSetting.cphone',
                    'userSetting.wphone_ext',
                    'userSetting.jobtitle',
                    'userSetting.wphone',
                    'userSetting.hphone',
                    'userSetting.address',
                    'userSetting.address2',
                    'userSetting.state',
                    'userSetting.zip',
                    'userSetting.country',
                    'userSetting.city',
                    'department.dept_name',
                    'location.lname',
                    'location.address1',
                    'location.address2',
                    'location.city',
                    'location.state',
                    'location.zip',
                    'location.country',
                ],
                reportData?.condition,
                { username: 'ASC' },
                [
                    {
                        join_table: 'users.userSetting',
                        alias: 'userSetting',
                        table: tableConstant.TBL_USERS_SETTINGS,
                        on_condition: `userSetting.user_id=users.id`,
                        join_type: 'left_one',
                    },
                    {
                        join_table: 'users.department',
                        alias: 'department',
                        table: tableConstant.COMPANIES.TBL_DEPARTMENT,
                        on_condition: `department.id=users.department_id`,
                        join_type: 'left_one',
                    },
                    {
                        join_table: 'users.location',
                        alias: 'location',
                        table: tableConstant.COMPANIES.TBL_LOCATION,
                        on_condition: `location.id=users.location`,
                        join_type: 'left_one',
                    },
                ],
                'getMany',
            );
            if (userData.length == 0) {
                return true;
            }
            const userArray = new Array(userData.length);
            for (let i: number = 0; i < userData.length; i++) {
                let user = userData[i];
                userArray[i] = user?.id;
            }
            let assignUserPlanData: MyPlanAssignUserPlanEntity[] =
                await this.myPlanAssignUserPlanService.getAll(
                    { user_id: In(userArray) },
                    ['user_id', 'plan_id', 'gc_plan_id', 'gc_plan_remove'],
                );
            const assignUserPlanResult = new Map<
                number,
                MyPlanAssignUserPlanEntity
            >();
            for (let i: number = 0; i < assignUserPlanData.length; i++) {
                const item: MyPlanAssignUserPlanEntity = assignUserPlanData[i];
                assignUserPlanResult.set(item.user_id, item);
            }

            let headerData: string[] =
                cronAppConstant.MY_PLAN_REPORT_HRADER_DATA;
            let jsonData = [[...headerData]];
            const userPlanId = new Map<number, number[]>();
            for (let i: number = 0; i < userData.length; i++) {
                let user = userData[i];
                const assignUserPlanExist: MyPlanAssignUserPlanEntity =
                    assignUserPlanResult.get(user.id);
                userData[i]['assignUserPlan'] = assignUserPlanExist;
                let userGender =
                    cronAppConstant.GENDER_MAP[user?.gender?.toLowerCase()] ||
                    0;
                let userDataRow = [
                    companyName || '',
                    user?.department?.dept_name || '',
                    user.role_id === 16 ? user.relationship_id : "",
                    user?.username || '',
                    user?.first_name || '',
                    user?.middle_name || '',
                    user?.last_name || '',
                    user?.userSetting?.jobtitle || '',
                    user?.securitycode || '',
                    user?.employeeid || '',
                    cronAppConstant.GENDER[userGender] || '',
                    this.commonDateService.DateTimeFormat(user?.dob, 'MM-DD-YYYY') || '',
                    this.commonDateService.DateTimeFormat(user?.date_of_hire, 'MM-DD-YYYY') || '' ,
                    cronAppConstant.INSURANCE_PLAN[user?.on_insurance_plan.toLowerCase()] || '',
                    user?.insurance_plan_name || '',
                    user?.email || '',
                    user?.userSetting?.wphone || '',
                    user?.userSetting?.wphone_ext || '',
                    user?.location?.lname || '',
                    user?.location?.address1 || '',
                    user?.location?.address2 || '',
                    user?.location?.city || '',
                    user?.location?.state || '',
                    user?.location?.zip || '',
                    user?.location?.country || '',
                    user?.userSetting?.hphone && user?.userSetting?.hphone !== '0' ? user.userSetting.hphone : '',
                    user?.userSetting?.cphone || '',
                    user?.userSetting?.address || '',
                    user?.userSetting?.address2 || '',
                    user?.userSetting?.city || '',
                    user?.userSetting?.state || '',
                    user?.userSetting?.zip || '',
                    user?.userSetting?.country || '',
                    user?.code || '',
                    cronAppConstant.CAMPAIGN_ELIGIBLE[user?.is_camp_eligible] || "No"
                ];
                let planIds = user?.assignUserPlan?.plan_id
                    ? JSON.parse(user?.assignUserPlan?.plan_id).map(Number)
                    : [];
                const gcPlanId = user?.assignUserPlan?.gc_plan_id
                    ? JSON.parse(user?.assignUserPlan?.gc_plan_id).map(Number)
                    : [];
                const gcPlanRemove = user?.assignUserPlan?.gc_plan_remove
                    ? JSON.parse(user?.assignUserPlan?.gc_plan_remove).map(
                          Number,
                      )
                    : [];
                planIds = [...planIds, ...gcPlanId];
                let availablePlan = planIds.filter(
                    (item) => !gcPlanRemove.includes(item),
                );
                userPlanId.set(user.id, availablePlan);
                jsonData[i+ 1] = userDataRow;
            }

            let mailSend = async (reportData) => {
                if (sendEmail) {
                    try {
                        let emailDetails = {
                            'orgAdminName': userDetails?.first_name,
                            type: 11,
                        };
                        const templateText =
                            await this.communicationTemplateTextService.findOne(
                                {
                                    org_id: In([reportData?.org_id, 0]),
                                    type: 11,
                                },
                            );
                        let templateNewText =
                            (await this.cronCommonService.onmapUrlContent(
                                templateText?.['new_text'],
                                'mailTemplate',
                            )) || templateText?.['text'];
                        let emaildata = {
                            sender: ``,
                            receiver: sendEmail,
                            subject: 'Your Report Request Completed.',
                            content: emailDetails,
                            template: templateNewText,
                        };
                        await lastValueFrom(
                            this.commonMicroservice.send(
                                { cmd: 'send_email' },
                                emaildata,
                            ),
                        );
                    } catch (err) {
                        console.error('Error calling common service:', err);
                    }
                }
            };

            let fileUpload = async (sheetData, companyName, reportData) => {
                const jsonString = JSON.stringify(sheetData, null, 2);
                let currentDatetime =
                    await this.commonDateService.DateTimeFormat(
                        'now',
                        'YYYY-MM-DD-HHmmss',
                    );
                let fileName: string = `${companyName.replace(/ /g, '_').replace(/[^a-zA-Z0-9_]/g, "")}_${reportData?.id}_My_Plan_Report_${currentDatetime}.json`;

                const sheet = [{sheet_name: "Report", list: sheetData}];
                let manualReportResult = await this.userChallengeHelperService.createChallengeReportlsxNew(
                    {org_id: 0},
                    sheet,
                    fileName,
                    true
                );
                fileName = fileName.replace('.json', '.xlsx')
                let ReportResult = manualReportResult?.['file_dir']

                            if (await this.commonFileService.fileExist(ReportResult,)) {
                                await lastValueFrom(
                                    this.commonMicroservice.send(
                                        { cmd: 'upload_file' },
                                        {
                                            path: path.resolve(ReportResult),
                                            filename: `reports/myplan/${reportData.org_id}/${reportData?.id}/${fileName}`,
                                            userBucket: 'private',
                                        },
                                    ),
                                );
                                let reportFileUpdate = {
                                    file_name: `myplan/${reportData.org_id}/${reportData?.id}/${fileName}`,
                                    status: 1,
                                };
                                await this.incentiveReportsService.updateRecord(
                                    { id: reportData?.id },
                                    reportFileUpdate,
                                );
                            } else {
                                throw new Error(`File does not exist`);
                            }
                        await mailSend(reportData);
                        return true;
            };
            let multipleFileUpload = async (
                sheetData,
                companyName,
                reportData,
            ) => {
                let currentDatetime = await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD-HHmmss');
                const makeSafeFileName = (name: string): string => name.replace(/\s+/g, "").replace(/[^a-zA-Z0-9._-]/g, "");
                let fileName: string = `${makeSafeFileName(companyName)}_${reportData?.id}_My_Plan_Report_${currentDatetime}.json`;
                let manualReportResult = await this.userChallengeHelperService.createChallengeReportlsxNew({org_id: 0}, sheetData, fileName, true);
                fileName = fileName.replace('.json', '.xlsx')
                let ReportResult = manualReportResult?.['file_dir']
                if (await this.commonFileService.fileExist(ReportResult)) {
                    await lastValueFrom(
                        this.commonMicroservice.send(
                            { cmd: 'upload_file' },
                            {
                                path: path.resolve(ReportResult),
                                filename: `reports/myplan/${reportData.org_id}/${reportData?.id}/${fileName}`,
                                userBucket: 'private',
                            },
                        ),
                    );
                    let reportFileUpdate = {
                        file_name: `myplan/${reportData.org_id}/${reportData?.id}/${fileName}`,
                        status: 1,
                        cron_status: CronStatus.REPORT,
                    };
                    await this.incentiveReportsService.updateRecord(
                        { id: reportData?.id },
                        reportFileUpdate,
                    );
                } else {
                    throw new Error(`File does not exist`);
                }
                await mailSend(reportData);
            };
            let cronStatus: boolean = false;
            if (reportData?.camp_id == '0' && reportData?.engagement_report == 1 && cronStatus == false) {
                /* all + engagement */
                jsonData = await this.myPlanReportService.allPlanWithEngagement(
                    reportData,
                    userData,
                    userArray,
                    jsonData,
                    userPlanId,
                );
                await fileUpload(jsonData, companyName, reportData);
                cronStatus = true;
            }
            if (reportData?.camp_id == '0' && cronStatus == false) {
                /* all plan*/
                jsonData = await this.myPlanReportService.allPlan(
                    reportData,
                    userData,
                    userArray,
                    jsonData,
                    userPlanId,
                );
                await fileUpload(jsonData, companyName, reportData);
                cronStatus = true;
            }
            if (reportData?.camp_id != '0' && cronStatus == false) {
                let campIdArray = reportData?.camp_id.split(',');
                if (campIdArray.length == 1) {
                    /* single plan */
                    jsonData =
                        await this.myPlanReportService.singleOrMultiplePlan(
                            reportData,
                            userData,
                            userArray,
                            jsonData,
                            userPlanId,
                            'single',
                        );
                    await fileUpload(jsonData, companyName, reportData);
                } else {
                    /* multiple plan */
                    const jsonDataArray = [];
                    for (let i: number = 0; i < campIdArray.length; i++) {
                        let existJsonData = JSON.parse(JSON.stringify(jsonData));
                        let campId = campIdArray[i];
                        reportData.camp_id = campId;
                        let sheetJsonData =
                            await this.myPlanReportService.singleOrMultiplePlan(
                                reportData,
                                userData,
                                userArray,
                                jsonData,
                                userPlanId,
                                'multiple',
                            );
                        jsonData = existJsonData;
                        let planName = Object.keys(sheetJsonData)[0];
                        let planValue = sheetJsonData[planName];
                        if (planName) {
                            jsonDataArray.push({sheet_name: planName, list: planValue});
                        }
                    }
                    await multipleFileUpload(
                        jsonDataArray,
                        companyName,
                        reportData,
                    );
                }
            }
            await this.incentiveReportsService.update(
                {
                    id: reportData.id,
                    report_type: 'Myplan',
                    cron_status: CronStatus.COMPILATION,
                    org_id: reportData.org_id,
                },
                { cron_status: CronStatus.REPORT, status: 1 },
            );
            return true;
        } catch (error) {
            this.cronCommonService.errorLog(
                0,
                'my-plan-report',
                error?.message,
                error,
            );
            return true;
        }
    }

    @MessagePattern({ cmd: 'my-plan-business-rule' })
    async myPlanBusinessRule() {
        try {
            const reportWhereClause = {
                status: 0,
                report_type: 'Myplan',
                system_type: System_Type.NEW,
                cron_status: CronStatus.DEFAULT
            };
            // const reportWhereClause = {status: 1,report_type: 'Myplan',cron_status: CronStatus.DEFAULT}
            let reportData: IncentiveReportsEntity | null =
                await this.incentiveReportsService.getOne(
                    reportWhereClause,
                    ['id', 'org_id'],
                    { id: 'DESC' },
                );
            if (!reportData) {
                return true;
            }
            let orgId = reportData?.org_id;
            let assignPlanData: MyPlanAssignPlanEntity[] =
                await this.myPlanAssignPlanService.getAll(
                    { status: 1, org_id: orgId },
                    [
                        'id',
                        'org_id',
                        'plan_id',
                        'based_on',
                        'display_plan_to_health',
                        'enddate',
                        'display_plan_to_health_source',
                        'display_plan_to',
                        'join_based_on',
                        'activity_id',
                    ],
                );
            const planArray = new Array(assignPlanData.length);
            const assignPlanResult = new Map<number, MyPlanAssignPlanEntity>();
            for (let i: number = 0; i < assignPlanData.length; i++) {
                let assignPlan: MyPlanAssignPlanEntity = assignPlanData[i];
                planArray[i] = assignPlan?.plan_id;
                assignPlanResult.set(assignPlan?.plan_id, assignPlan);
            }
            let userData: UserEntity[] = await this.userService.getAll(
                { role_id: In([2, 16]), status: 1, org_id: orgId },
                [
                    'id',
                    'code',
                    'gender',
                    'dob',
                    'timezone',
                    'department_id',
                    'location',
                    'insurance_plan_name',
                ],
            );
            if (userData.length == 0) {
                return true;
            }
            const userArray = new Array(userData.length);
            for (let i: number = 0; i < userData.length; i++) {
                let user: UserEntity = userData[i];
                userArray[i] = user?.id;
            }
            let assignUserPlanData: MyPlanAssignUserPlanEntity[] =
                await this.myPlanAssignUserPlanService.getAll(
                    { user_id: In(userArray) },
                    ['id', 'user_id', 'plan_id', 'gc_plan_id', 'gc_plan_remove'],
                );
            const assignUserPlanResult = new Map<
                number,
                MyPlanAssignUserPlanEntity
            >();
            for (let i: number = 0; i < assignUserPlanData.length; i++) {
                const item: MyPlanAssignUserPlanEntity = assignUserPlanData[i];
                assignUserPlanResult.set(item.user_id, item);
            }
            let assignRuleData =
                await this.myPlanAssignRuleService.commonQueryBuilder(
                    [],
                    { org_id: orgId, status: 1 },
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
            const assignRuleResult = new Map<number, assignRuleInterface>();
            let moduleID = [];
            let biometricIds = [];
            for (let i: number = 0; i < assignRuleData.length; i++) {
                const item = assignRuleData[i];
                assignRuleResult.set(item.plan_id, item);
                moduleID.push(item?.br?.module_id);
                biometricIds.push(item?.br?.biometric_id);
            }
            const moduleIdArray: number[] = [
                ...new Set(moduleID.filter((id) => id != null)),
            ];
            const biometricIdArray: number[] = [
                ...new Set(biometricIds.filter((id) => id != null)),
            ];
            let otherDataPass = await this.myPlanReportService.businessRuleData(
                moduleIdArray,
                biometricIdArray,
                userArray,
                orgId,
            );

            let campaignData: CampaignEntity[] =
                await this.campaignService.getAll(
                    {
                        organization_id: orgId,
                        status: 1,
                    },
                    [
                        'start_date',
                        'end_date',
                        'department_ids',
                        'location_ids',
                    ],
                    { id: 'DESC' },
                );

            let emotionalAssessmentData: AssessmentEmotionalAssessmentEntity[] =
                await this.assessmentEmotionalAssessmentService.getAll(
                    { user_id: In(userArray), status: 1 },
                    ['id', 'user_id', 'hra_status', 'created'],
                );
            const emotionalAssessmentResult = new Map<
                number,
                AssessmentEmotionalAssessmentEntity[]
            >();
            for (let i: number = 0; i < emotionalAssessmentData.length; i++) {
                const item: AssessmentEmotionalAssessmentEntity =
                    emotionalAssessmentData[i];
                const existing: AssessmentEmotionalAssessmentEntity[] =
                    emotionalAssessmentResult.get(item.user_id) || [];
                existing.push(item);
                emotionalAssessmentResult.set(item.user_id, existing);
            }

            let assessmentData: AssessmentsEntity[] =
                await this.assessmentService.getAll(
                    { user_id: In(userArray), status: 1 },
                    ['id', 'user_id', 'hra_status', 'date'],
                    { date: 'DESC' },
                );
            const assessmentResult = new Map<number, AssessmentsEntity[]>();
            for (let i: number = 0; i < assessmentData.length; i++) {
                const item: AssessmentsEntity = assessmentData[i];
                const existing: AssessmentsEntity[] =
                    assessmentResult.get(item.user_id) || [];
                existing.push(item);
                assessmentResult.set(item.user_id, existing);
            }

            let planData: PlanInterface[] =
                await this.myPlanPlansService.commonQueryBuilder(
                    [
                        'plans.id',
                        'plans.name',
                        'plans.description',
                        'plans.created_by',
                        'plans.icon',
                        'blocks.id',
                        'blocks.order_id',
                        'blocks.name',
                        'blocks.plan_id',
                        'blocks.icon',
                        'blocks.description',
                        'myActivity.id',
                        'myActivity.block_id',
                        'myActivity.wellbeing_category_id',
                        'myActivity.display_type',
                        'myActivity.org_activity_id',
                        'myActivity.activity_id',
                        'myActivity.is_category',
                        'myActivity.icon',
                        'myActivity.post_id',
                        'myActivity.fpost_id',
                        'myActivity.s_range',
                        'myActivity.e_range',
                        'myActivity.module_id',
                        'myActivity.option_activity_ids',
                        'myActivity.type',
                        'myActivity.healthplan',
                        'myActivity.healthplan_name',
                        'myActivity.age_e_range',
                        'myActivity.age_s_range',
                        'myActivity.gender',
                        'myActivity.age',
                        'myActivity.ageoption',
                        'myActivity.button_text',
                        'myActivity.link',
                        'myActivity.link_type',
                        'myActivity.link_id',
                        'myActivity.description',
                        'myActivity.add_image',
                        'myActivity.hide_button',
                        'myActivity.wtype',
                        'myActivity.wtypeunit',
                        'myActivity.upload_text',
                        'myActivity.frequency_base',
                        'myActivity.days',
                        'myActivity.f_range',
                        'myActivity.video_second',
                        'myActivity.grater_than',
                        'myActivity.f_type',
                        'assignBlock.id',
                        'assignActivity.id',
                        'assignActivity.name',
                        'assignActivity.startdate',
                        'assignActivity.enddate',
                        'assignActivity.activity_id',
                        'assignActivity.is_month',
                        'assignActivity.is_month_days',
                    ],
                    { id: In(planArray), status: 1 },
                    null,
                    [
                        {
                            join_table: 'plans.blocks',
                            alias: 'blocks',
                            table: tableConstant.MY_PLAN.TBL_MP_BLOCKS,
                            on_condition: `blocks.plan_id = plans.id`,
                            join_type: 'left_many',
                        },
                        {
                            join_table: 'blocks.assignBlock',
                            alias: 'assignBlock',
                            table: tableConstant.MY_PLAN.TBL_MP_ASSIGN_BLOCK,
                            on_condition: `assignBlock.block_id = blocks.id AND assignBlock.org_id = '${orgId}' AND assignBlock.status = '1'`,
                            join_type: 'left_one',
                        },
                        {
                            join_table: 'blocks.myActivity',
                            alias: 'myActivity',
                            table: tableConstant.MY_PLAN.TBL_MP_ACTIVITY,
                            on_condition: `myActivity.block_id = blocks.id AND myActivity.status = '1' AND (myActivity.activity_id != '-1' OR myActivity.organization_id = '${orgId}')`,
                            join_type: 'left_many',
                        },
                        {
                            join_table: 'myActivity.assignActivity',
                            alias: 'assignActivity',
                            table: tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY,
                            on_condition: `assignActivity.activity_id = myActivity.id AND assignActivity.status = '1' AND assignActivity.org_id = '${orgId}'`,
                            join_type: 'left_one',
                        },
                    ],
                    'getMany',
                );
            let assignUserPlanUpdate = [];
            let assignUserPlanSave = [];
            let joinUserPlanSave = [];
            for (let i: number = 0; i < userData.length; i++) {
                let user: UserEntity = userData[i];
                const assignUserPlanExist: MyPlanAssignUserPlanEntity =
                    assignUserPlanResult.get(user.id);
                let planIds = assignUserPlanExist?.plan_id
                    ? JSON.parse(assignUserPlanExist?.plan_id).map(Number)
                    : [];
                const gcPlanId = assignUserPlanExist?.gc_plan_id
                    ? JSON.parse(assignUserPlanExist?.gc_plan_id).map(Number)
                    : [];
                const gcPlanRemove = assignUserPlanExist?.gc_plan_remove
                    ? JSON.parse(assignUserPlanExist?.gc_plan_remove).map(
                          Number,
                      )
                    : [];
                planIds = [...planIds, ...gcPlanId];
                let availablePlan = planIds.filter(
                    (item) => !gcPlanRemove.includes(item),
                );
                availablePlan = planArray.filter(
                    (item) => !availablePlan.includes(item),
                );
                let timeZone = user?.timezone || 'UTC';
                let userGender: number =
                    appConstant.GENDER_MAP[user?.gender] || 0;
                let userTimeZone = await this.commonDateService.DateTimeFormat(
                    new Date(),
                    'YYYY-MM-DD HH:mm:ss',
                    'YYYY-MM-DD HH:mm:ss',
                    timeZone,
                );
                let userDateTimeZone =
                    await this.commonDateService.DateTimeFormat(
                        userTimeZone,
                        'YYYY-MM-DD',
                        'YYYY-MM-DD HH:mm:ss',
                    );
                let dob = await this.commonDateService.DateTimeFormat(
                    new Date(user?.dob),
                    'YYYY-MM-DD',
                );
                let bDay: number = await this.commonDateService.numOfYears(
                    dob,
                    userDateTimeZone,
                );
                let departmentId = user?.department_id;
                let locationId = user?.location;
                let insurancePlanName: string = user?.insurance_plan_name || '';
                let planDisplayArray = [],
                    jsonAutoPlan = [];

                let matchedCampaign: any = null;
                for (let a: number = 0; a < campaignData.length; a++) {
                    const campaign: CampaignEntity = campaignData[a];
                    const isValid =
                        campaign.start_date <= userTimeZone &&
                        campaign.end_date >= userDateTimeZone &&
                        [departmentId, '0'].includes(campaign.department_ids) &&
                        [locationId, '0', null].includes(campaign.location_ids);
                    if (isValid) {
                        matchedCampaign = campaign;
                        break;
                    }
                }

                let userEmotionalAssessmentObj: AssessmentEmotionalAssessmentEntity;
                let userAssessmentObj: AssessmentsEntity;
                const campaignStart =
                    await this.commonDateService.DateTimeFormat(
                        matchedCampaign?.start_date,
                        'timestamp',
                        'YYYY-MM-DD HH:mm:ss',
                    );
                const campaignEnd = await this.commonDateService.DateTimeFormat(
                    matchedCampaign?.end_date,
                    'timestamp',
                    'YYYY-MM-DD HH:mm:ss',
                );
                let userEmotionalAssessment: AssessmentEmotionalAssessmentEntity[] =
                    emotionalAssessmentResult.get(user.id);
                for (
                    let b: number = 0;
                    b < userEmotionalAssessment?.length;
                    b++
                ) {
                    const ea: AssessmentEmotionalAssessmentEntity =
                        userEmotionalAssessment[b];
                    let createdInTz =
                        await this.commonDateService.DateTimeFormat(
                            ea.created,
                            'timestamp',
                            'YYYY-MM-DD HH:mm:ss',
                            timeZone,
                        );
                    if (
                        createdInTz >= campaignStart &&
                        createdInTz <= campaignEnd
                    ) {
                        userEmotionalAssessmentObj = ea;
                        break;
                    }
                }

                let userAssessment: AssessmentsEntity[] = assessmentResult.get(
                    user.id,
                );
                for (let c: number = 0; c < userAssessment?.length; c++) {
                    const assessment: AssessmentsEntity = userAssessment[c];
                    let createdInTz =
                        await this.commonDateService.DateTimeFormat(
                            assessment.date,
                            'timestamp',
                            'YYYY-MM-DD HH:mm:ss',
                            timeZone,
                        );
                    if (
                        createdInTz >= campaignStart &&
                        createdInTz <= campaignEnd
                    ) {
                        userAssessmentObj = assessment;
                        break;
                    }
                }

                let userOtherDataPass = { bio_data: otherDataPass['bio_data'] };
                userOtherDataPass['biometrics'] = otherDataPass?.['biometrics']?.get(user.id) || [];
                userOtherDataPass['hra'] = otherDataPass?.['hra']?.get(user.id) || [];
                userOtherDataPass['tobacco'] = otherDataPass?.['tobacco']?.get(user.id) || [];
                userOtherDataPass['physician'] = {Authorization: otherDataPass?.['physician']?.Authorization?.get(user.id) || [], activity: otherDataPass?.['physician']?.activity?.get(user.id) || [],};
                userOtherDataPass['dental'] = otherDataPass?.['dental']?.get(user.id) || [];
                userOtherDataPass['optimetric'] = otherDataPass?.['optimetric']?.get(user.id) || [];
                userOtherDataPass['ohassessment'] = otherDataPass?.['ohassessment']?.get(user.id) || [];
                userOtherDataPass['event'] = otherDataPass?.['event']?.get(user.id) || [];
                // userOtherDataPass['eha'] = otherDataPass['eha']?.get(user.id);
                userOtherDataPass['eha'] = {};
                userOtherDataPass['agegender'] = otherDataPass?.['agegender']?.get(user.id) || [];
                userOtherDataPass['challenge'] = otherDataPass?.['challenge']?.get(user.id) || [];
                userOtherDataPass['quicklink'] = otherDataPass?.['quicklink']?.get(user.id) || [];
                userOtherDataPass['quiz'] = otherDataPass?.['quiz']?.get(user.id) || [];
                for (let j: number = 0; j < planData.length; j++) {
                    let plan: PlanInterface = planData[j];
                    if (availablePlan.includes(plan.id)) {
                        let recommendedPlansJoin: boolean = false;
                        const assignPlanExist: MyPlanAssignPlanEntity =
                            assignPlanResult.get(plan.id);
                        const assignRuleExist: assignRuleInterface[] =
                            assignRuleResult.get(plan.id)
                                ? [assignRuleResult.get(plan.id)]
                                : [];
                        let activityExistOrNot: number = 0;
                        plan['blocks'].forEach((value, key) => {
                            if (!value['assignBlock']) {
                                plan['blocks'][key]['myActivity'] = [];
                            } else {
                                plan['blocks'][key]['myActivity'] = value[
                                    'myActivity'
                                ].filter((ndata) => {
                                    let validHealthPlan: boolean =
                                        ndata['healthplan'] === 0 ||
                                        (ndata.healthplan_name.toLowerCase() &&
                                            insurancePlanName
                                                .toLowerCase()
                                                .includes(
                                                    ndata.healthplan_name.toLowerCase(),
                                                ));
                                    let validGender: boolean =
                                        ndata['gender'] === 0 ||
                                        userGender === ndata['gender'];
                                    let validAge: boolean = ndata['age'] == 0;
                                    let validRange: boolean = false;
                                    switch (ndata.ageoption) {
                                        case 0:
                                            validRange =
                                                ndata.age_s_range == bDay;
                                            break;
                                        case 1:
                                            validRange =
                                                bDay > ndata.age_s_range;
                                            break;
                                        case 2:
                                            validRange =
                                                bDay >= ndata.age_s_range;
                                            break;
                                        case 3:
                                            validRange =
                                                bDay < ndata.age_s_range;
                                            break;
                                        case 4:
                                            validRange =
                                                bDay <= ndata.age_s_range;
                                            break;
                                        case 5:
                                            validRange =
                                                bDay >= ndata.age_s_range &&
                                                bDay <= ndata.age_e_range;
                                            break;
                                    }
                                    return (
                                        ndata['assignActivity'] &&
                                        validHealthPlan &&
                                        validGender &&
                                        (validAge || validRange)
                                    );
                                });
                                if (
                                    plan['blocks'][key]['myActivity'].length > 0
                                ) {
                                    activityExistOrNot = 1;
                                    return true;
                                }
                            }
                        });
                        if (
                            activityExistOrNot == 1 &&
                            ([0, 3].includes(assignPlanExist['based_on']) ||
                                (await this.commonDateService.DateTimeFormat(
                                    await this.commonDateService.DateTimeFormat(
                                        assignPlanExist['enddate'],
                                        'YYYY-MM-DD',
                                        'YYYY-MM-DD HH:mm:ss',
                                    ),
                                    'timestamp',
                                    'YYYY-MM-DD',
                                )) >=
                                    (await this.commonDateService.DateTimeFormat(
                                        await this.commonDateService.DateTimeFormat(
                                            userTimeZone,
                                            'YYYY-MM-DD',
                                            'YYYY-MM-DD HH:mm:ss',
                                        ),
                                        'timestamp',
                                        'YYYY-MM-DD',
                                    )))
                        ) {
                            let displayPlanToHealth: number = 1;
                            if (
                                assignPlanExist['display_plan_to_health'] == 1
                            ) {
                                displayPlanToHealth = 0;
                                if (matchedCampaign) {
                                    if (
                                        assignPlanExist[
                                            'display_plan_to_health_source'
                                        ] == 1
                                    ) {
                                        if (
                                            userEmotionalAssessmentObj?.hra_status ===
                                                100 ||
                                            userAssessmentObj?.hra_status ===
                                                100
                                        ) {
                                            displayPlanToHealth = 1;
                                        }
                                    } else {
                                        if (
                                            userEmotionalAssessmentObj ||
                                            userAssessmentObj
                                        ) {
                                            displayPlanToHealth = 1;
                                        }
                                    }
                                }
                            }
                            if (displayPlanToHealth == 1) {
                                if (assignPlanExist['display_plan_to'] == 0) {
                                    if (assignRuleExist.length > 0) {
                                        let planDisplay =
                                            await this.commonHealthService.businessRuleCheck(
                                                userOtherDataPass,
                                                assignRuleExist,
                                                user?.id,
                                                userGender,
                                                bDay,
                                            );
                                        if (planDisplay == true) {
                                            if (
                                                assignPlanExist[
                                                    'join_based_on'
                                                ] == 0
                                            ) {
                                                recommendedPlansJoin = true;
                                                planDisplayArray.push(
                                                    plan['id'],
                                                );
                                                let tmpJsonStore = plan;
                                                jsonAutoPlan.push(tmpJsonStore);
                                            }
                                        }
                                    }
                                } else {
                                    recommendedPlansJoin = true;
                                }
                            }
                        }
                        if (
                            recommendedPlansJoin &&
                            assignPlanExist?.['join_based_on'] == 1
                        ) {
                            let checkExist =
                                await this.myPlanJoinUserPlanService.checkExists(
                                    { plan_id: plan['id'], user_id: user?.id },
                                );
                            if (!checkExist) {
                                let joinPlan = {};
                                joinPlan['user_id'] = user?.id;
                                joinPlan['plan_id'] = plan['id'];
                                joinPlan['activity_id'] = assignPlanExist['activity_id'];
                                joinUserPlanSave.push(joinPlan)
                            }
                        }
                    }
                }
                if (jsonAutoPlan.length > 0) {
                    let jsonAutoPlanTmp = { user_id: user?.id };
                    if (!assignUserPlanExist) {
                        jsonAutoPlanTmp['plan_detail'] =
                            JSON.stringify(jsonAutoPlan);
                        jsonAutoPlanTmp['plan_id'] =
                            JSON.stringify(planDisplayArray);
                        assignUserPlanSave.push(jsonAutoPlanTmp)
                    } else {
                        jsonAutoPlanTmp['plan_detail'] = JSON.stringify([...JSON.parse(assignUserPlanExist['plan_detail'] || '[]'),...jsonAutoPlan]);
                        jsonAutoPlanTmp['plan_id'] = JSON.stringify([...JSON.parse(assignUserPlanExist['plan_id'] || '[]',),...planDisplayArray]);
                        jsonAutoPlanTmp['id'] = assignUserPlanExist['id']
                        assignUserPlanUpdate.push(jsonAutoPlanTmp)
                    }
                }
            }
            await this.myPlanJoinUserPlanService.createMany(joinUserPlanSave)
            await this.myPlanAssignUserPlanService.createMany(assignUserPlanSave)
            await this.myPlanAssignUserPlanService.bulkUpdate('id',assignUserPlanUpdate)

            await this.incentiveReportsService.update(
                {
                    id: reportData.id,
                    report_type: 'Myplan',
                    cron_status: CronStatus.DEFAULT,
                    org_id: reportData.org_id,
                },
                { cron_status: CronStatus.BUSINESS_RULE },
            );
            return true;
        } catch (error) {
            this.cronCommonService.errorLog(
                0,
                'my-plan-business-rule',
                error?.message,
                error,
            );
            return true;
        }
    }

    @MessagePattern({ cmd: 'my-plan-complete' })
    async myPlanComplete() {
        try {
            const reportWhereClause = {
                status: 0,
                report_type: 'Myplan',
                system_type: System_Type.NEW,
                cron_status: CronStatus.BUSINESS_RULE,
            };
            let reportData: IncentiveReportsEntity | null =
                await this.incentiveReportsService.getOne(
                    reportWhereClause,
                    ['id', 'org_id', 'camp_id'],
                    { id: 'DESC' },
                );
            if (!reportData) {
                return true;
            }
            let orgId = reportData?.org_id;
            let assignPlanWhere = { status: 1, org_id: orgId };
            if (reportData?.camp_id != '0') {
                assignPlanWhere['plan_id'] = In(reportData?.camp_id.split(','));
            }
            let assignPlanData: MyPlanAssignPlanEntity[] =
                await this.myPlanAssignPlanService.getAll(assignPlanWhere, [
                    'id',
                    'plan_id',
                    'completion_on',
                    'c_range',
                    'based_on',
                    'startdate',
                    'enddate',
                    'f_range',
                    'frequency_base',
                ]);
            const planArray = new Array(assignPlanData.length);
            const assignPlanResult = new Map<number, MyPlanAssignPlanEntity>();
            for (let i: number = 0; i < assignPlanData.length; i++) {
                let assignPlan: MyPlanAssignPlanEntity = assignPlanData[i];
                planArray[i] = assignPlan?.plan_id;
                assignPlanResult.set(assignPlan?.plan_id, assignPlan);
            }
            let userData: UserEntity[] = await this.userService.getAll({ role_id: In([2, 16]), status: 1, org_id: orgId },['id', 'code', 'gender', 'dob', 'timezone', 'department_id', 'location', 'insurance_plan_name']);
            if (userData.length == 0) {
                return true;
            }
            const userArray = new Array(userData.length);
            for (let i: number = 0; i < userData.length; i++) {
                let user: UserEntity = userData[i];
                userArray[i] = user?.id;
            }

            let myPlanCompleteActivity: MyPlanCompleteActivityEntity[] =
            await this.myPlanCompleteActivityService.getAll({ user_id: In(userArray) },['created', 'custom_id', 'status', 'user_id']);
            const myPlanCompleteActivityResult = new Map<number, CompleteActivityType>();
            for (let i: number = 0; i < myPlanCompleteActivity.length; i++) {
                let completeActivity: MyPlanCompleteActivityEntity =
                    myPlanCompleteActivity[i];
                let userWiseActivityObj: CompleteActivityType =
                    myPlanCompleteActivityResult.get(completeActivity.user_id) || {};
                const customId: number = completeActivity['custom_id'];
                userWiseActivityObj[customId] = completeActivity;
                myPlanCompleteActivityResult.set(completeActivity.user_id, userWiseActivityObj,);
            }

            let myPlanCompleteBlock: MyPlanCompleteBlockEntity[] =
                await this.myPlanCompleteBlockService.getAll({ user_id: In(userArray) }, ['id','complete_date','block_id','user_id','status','activity_detail'],);
            const myPlanCompleteBlockResult = new Map<
                number,
                CompleteBlockType
            >();
            for (let i: number = 0; i < myPlanCompleteBlock.length; i++) {
                let completeBlock: MyPlanCompleteBlockEntity =
                    myPlanCompleteBlock[i];
                let userWiseActivityObj: CompleteBlockType =
                    myPlanCompleteBlockResult.get(completeBlock.user_id) || {};
                const blockId: number = completeBlock['block_id'];
                userWiseActivityObj[blockId] = completeBlock;
                myPlanCompleteBlockResult.set(
                    completeBlock.user_id,
                    userWiseActivityObj,
                );
            }

            let assignUserPlanData: MyPlanAssignUserPlanEntity[] = await this.myPlanAssignUserPlanService.getAll({ user_id: In(userArray) }, ['id', 'user_id', 'plan_id', 'gc_plan_id', 'gc_plan_remove'],);
            const assignUserPlanResult = new Map<number,MyPlanAssignUserPlanEntity>();
            for (let i: number = 0; i < assignUserPlanData.length; i++) {
                const item: MyPlanAssignUserPlanEntity = assignUserPlanData[i];
                assignUserPlanResult.set(item.user_id, item);
            }

            let planData: PlanInterface[] =
                await this.myPlanPlansService.commonQueryBuilder(
                    [
                        'plans.id',
                        'plans.name',
                        'plans.description',
                        'plans.created_by',
                        'plans.icon',
                        'blocks.id',
                        'blocks.order_id',
                        'blocks.name',
                        'blocks.plan_id',
                        'blocks.icon',
                        'blocks.description',
                        'myActivity.id',
                        'myActivity.block_id',
                        'myActivity.wellbeing_category_id',
                        'myActivity.display_type',
                        'myActivity.org_activity_id',
                        'myActivity.activity_id',
                        'myActivity.is_category',
                        'myActivity.icon',
                        'myActivity.post_id',
                        'myActivity.fpost_id',
                        'myActivity.s_range',
                        'myActivity.e_range',
                        'myActivity.module_id',
                        'myActivity.option_activity_ids',
                        'myActivity.type',
                        'myActivity.healthplan',
                        'myActivity.healthplan_name',
                        'myActivity.age_e_range',
                        'myActivity.age_s_range',
                        'myActivity.gender',
                        'myActivity.age',
                        'myActivity.ageoption',
                        'myActivity.button_text',
                        'myActivity.link',
                        'myActivity.link_type',
                        'myActivity.link_id',
                        'myActivity.description',
                        'myActivity.add_image',
                        'myActivity.hide_button',
                        'myActivity.wtype',
                        'myActivity.wtypeunit',
                        'myActivity.upload_text',
                        'myActivity.frequency_base',
                        'myActivity.days',
                        'myActivity.f_range',
                        'myActivity.video_second',
                        'myActivity.grater_than',
                        'myActivity.f_type',
                        'assignBlock.id',
                        'assignBlock.startdate',
                        'assignBlock.enddate',
                        'assignBlock.activity_id',
                        'assignActivity.id',
                        'assignActivity.name',
                        'assignActivity.startdate',
                        'assignActivity.enddate',
                        'assignActivity.activity_id',
                        'assignActivity.is_month',
                        'assignActivity.is_month_days',
                        'activity.id',
                        'activity.activity_name',
                        'activity.category_id',
                        'activity.ext_link',
                        'activity.description',
                        'acAge.id',
                    ],
                    { id: In(planArray), status: 1 },
                    null,
                    [
                        {
                            join_table: 'plans.blocks',
                            alias: 'blocks',
                            table: tableConstant.MY_PLAN.TBL_MP_BLOCKS,
                            on_condition: `blocks.plan_id = plans.id AND blocks.status = '1'`,
                            join_type: 'left_many',
                        },
                        {
                            join_table: 'blocks.assignBlock',
                            alias: 'assignBlock',
                            table: tableConstant.MY_PLAN.TBL_MP_ASSIGN_BLOCK,
                            on_condition: `assignBlock.block_id = blocks.id AND assignBlock.org_id = '${orgId}' AND assignBlock.status = '1'`,
                            join_type: 'left_one',
                        },
                        {
                            join_table: 'blocks.myActivity',
                            alias: 'myActivity',
                            table: tableConstant.MY_PLAN.TBL_MP_ACTIVITY,
                            on_condition: `myActivity.block_id = blocks.id AND myActivity.status = '1' AND (myActivity.activity_id != '-1' OR myActivity.organization_id = '${orgId}')`,
                            join_type: 'left_many',
                        },
                        {
                            join_table: 'myActivity.assignActivity',
                            alias: 'assignActivity',
                            table: tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY,
                            on_condition: `assignActivity.activity_id = myActivity.id AND assignActivity.status = '1' AND assignActivity.org_id = '${orgId}'`,
                            join_type: 'left_one',
                        },
                        {
                            join_table: 'myActivity.activity',
                            alias: 'activity',
                            table: tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                            on_condition: `myActivity.activity_id = activity.id`,
                            join_type: 'left_one',
                        },
                        {
                            join_table: 'myActivity.acAge',
                            alias: 'acAge',
                            table: tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                            on_condition: `myActivity.org_activity_id = acAge.id`,
                            join_type: 'left_one',
                        },
                    ],
                    'getMany',
                );

            let joinUserPlanData: MyPlanJoinUserPlanEntity[] =
                await this.myPlanJoinUserPlanService.getAll(
                    {
                        plan_id: In(planArray),
                        user_id: In(userArray),
                        status: 1,
                    },
                    [
                        'id',
                        'plan_id',
                        'user_id',
                        'is_complete',
                        'complete_date',
                        'progress',
                    ],
                );
            const joinUserPlanResult = new Map<number, JoinUserPlanType>();
            for (let i: number = 0; i < joinUserPlanData.length; i++) {
                let joinUserPlan: MyPlanJoinUserPlanEntity =
                    joinUserPlanData[i];
                let userWiseActivityObj: JoinUserPlanType =
                    joinUserPlanResult.get(joinUserPlan.user_id) || {};
                userWiseActivityObj[joinUserPlan.plan_id] = joinUserPlan;
                joinUserPlanResult.set(
                    joinUserPlan.user_id,
                    userWiseActivityObj,
                );
            }

            let categoryIds: Record<number, number> = {},
                orgSpeIds = {},
                eventIds = [],
                quizIds = [],
                quickLinkIds = [],
                postIds = [],
                fPostIds = [],
                orgSpeCatIds = {};
            let eventsListIdWise = new Map<number, EventEntity>(),
                quickLinkListActivityWise = {};
            let emotionalResultDataEha = {};
            const bioMetricAssessmentResult = new Map<
                number,
                biometricInterface[]
            >();
            let hraAssessmentResult = new Map<number, AssessmentsEntity[]>();
            let qzQuizListIdWise = new Map<
                number,
                QuizInAssignQuizOrgInterface
            >();
            let quickLinkListIdWise = new Map<number, QuickLinkEntity>();
            let scheduleChallengeIdWise = new Map<
                number,
                ScheduleChallengeEntity
            >();
            let orgDetails: CompaniesEntity | null =
                await this.companyService.getOne({ id: orgId, status: 1 }, [
                    'code',
                ]);
            let membershipCode = orgDetails?.code;
            let activePluginData: ActivePluginsEntity | null =
                await this.activePluginService.getOne(
                    { company_id: orgId },
                    ['plugin_name'],
                    { id: 'DESC' },
                );
            let activePlugin: string[] = [];
            if (activePluginData) {
                activePlugin = Object.keys(
                    JSON.parse(activePluginData.plugin_name),
                );
            }
            let minStartDate = null, maxEndDate = null;
            const userAvailableMyPlan = new Map<number,number[]>();
            for (let h: number = 0; h < userData.length; h++) {
                let user: UserEntity = userData[h];
                let joinUserPlan: JoinUserPlanType = joinUserPlanResult.get?.(user?.id);
                let userGender: number = appConstant.GENDER_MAP[user?.gender] || 0;
                let userTimeZone = await this.commonDateService.DateTimeFormat(new Date(),'YYYY-MM-DD HH:mm:ss','YYYY-MM-DD HH:mm:ss',user?.timezone || 'UTC');
                let userDateTimeZone = await this.commonDateService.DateTimeFormat(userTimeZone,'YYYY-MM-DD','YYYY-MM-DD HH:mm:ss');
                let dob = await this.commonDateService.DateTimeFormat(new Date(user?.dob),'YYYY-MM-DD');
                let bDay: number = await this.commonDateService.numOfYears(dob, userDateTimeZone);
                let insurancePlanName: string = user?.insurance_plan_name || '';
                const assignUserPlanExist: MyPlanAssignUserPlanEntity = assignUserPlanResult.get(user.id);
                let planIds = assignUserPlanExist?.plan_id ? JSON.parse(assignUserPlanExist?.plan_id).map(Number) : [];
                const gcPlanId = assignUserPlanExist?.gc_plan_id ? JSON.parse(assignUserPlanExist?.gc_plan_id).map(Number) : [];
                const gcPlanRemove = assignUserPlanExist?.gc_plan_remove ? JSON.parse(assignUserPlanExist?.gc_plan_remove).map(Number) : [];
                planIds = [...planIds, ...gcPlanId];
                let availablePlan = planIds.filter((item) => !gcPlanRemove.includes(item));
                availablePlan = planArray.filter((item) => !availablePlan.includes(item));
                userAvailableMyPlan.set(user.id, availablePlan);

                for (let i: number = 0; i < planData.length; i++) {
                    planData[i]['joinPlan'] = joinUserPlan?.[planData[i].id];
                    planData[i]['assignPlan'] = assignPlanResult.get(
                        planData[i].id,
                    );
                    let plan = planData[i];
                    if (availablePlan.includes(plan.id)) {
                    if (
                        plan?.['joinPlan']?.['created'] &&
                        (plan['assignPlan']['based_on'] === 0 ||
                            [2, 3].includes(plan['assignPlan']['based_on']) ||
                            (plan['assignPlan']['based_on'] === 1 &&
                                !plan['assignPlan']['startdate']))
                    ) {
                        planData[i]['start_date'] =
                            `${await this.commonDateService.DateTimeFormat(new Date(plan?.['joinPlan']?.['created']), 'YYYY-MM-DD', '', '', 1)} 00:00:00`;
                    } else {
                        planData[i]['start_date'] =
                            `${await this.commonDateService.DateTimeFormat(new Date(), 'YYYY-MM-DD', '', '', 1)} 00:00:00`;
                    }
                    if (
                        plan['assignPlan']['based_on'] === 0 ||
                        ([1, 2].includes(plan['assignPlan']['based_on']) &&
                            !plan['assignPlan']['enddate'])
                    ) {
                        let totalDays: number = 0;
                        for (
                            let j: number = 0;
                            j < plan['blocks'].length;
                            j++
                        ) {
                            if (plan['blocks'][j]['myActivity']) {
                                totalDays += plan['blocks'][j][
                                    'myActivity'
                                ].reduce(
                                    (total, activity) => total + activity.days,
                                    0,
                                );
                            }
                        }
                        let startDate = new Date(planData[i]['start_date']);
                        startDate.setDate(
                            startDate.getDate() +
                                (totalDays > 0 ? totalDays - 1 : 0),
                        );
                        planData[i]['end_date'] =
                            `${await this.commonDateService.DateTimeFormat(new Date(startDate), 'YYYY-MM-DD', '', '', 1)} 23:59:59`;
                    }
                    if (
                        plan['assignPlan']['based_on'] === 1 &&
                        plan['assignPlan']['startdate']
                    ) {
                        planData[i]['start_date'] =
                            await this.commonDateService.DateTimeFormat(
                                new Date(plan['assignPlan']['startdate']),
                                'YYYY-MM-DD HH:mm:ss',
                                '',
                                '',
                                1,
                            );
                    }
                    if (
                        (plan['assignPlan']['based_on'] === 1 ||
                            plan['assignPlan']['based_on'] === 2) &&
                        plan['assignPlan']['enddate']
                    ) {
                        planData[i]['end_date'] =
                            `${await this.commonDateService.DateTimeFormat(new Date(plan['assignPlan']['enddate']), 'YYYY-MM-DD', '', '', 1)} 23:59:59`;
                    }
                    if (plan['assignPlan']['based_on'] === 3) {
                        let fRange = plan['assignPlan']['f_range'] || 1;
                        let totalActivity: number = 0;
                        plan['blocks'].forEach((item) => {
                            if (item['myActivity']) {
                                totalActivity += item['myActivity'].length;
                            }
                        });
                        let totalDays: number = Math.ceil(
                            totalActivity / fRange,
                        );
                        let startDate =
                            await this.commonDateService.DateTimeFormat(
                                planData[i]['start_date'],
                                'timestamp',
                                'YYYY-MM-DD HH:mm:ss',
                            );
                        switch (plan['assignPlan']['frequency_base']) {
                            case 0:
                                startDate =
                                    (startDate * 1000 +
                                        (totalDays - 1) * 24 * 60 * 60 * 1000) /
                                    1000;
                                break;
                            case 1:
                                startDate =
                                    (startDate * 1000 +
                                        (totalDays * 7 - 1) *
                                            24 *
                                            60 *
                                            60 *
                                            1000) /
                                    1000;
                                break;
                            case 2:
                                startDate = new Date(startDate * 1000);
                                startDate.setMonth(
                                    startDate.getMonth() + totalDays,
                                );
                                startDate =
                                    await this.commonDateService.DateTimeFormat(
                                        startDate,
                                        'timestamp',
                                    );
                                startDate =
                                    (startDate * 1000 - 24 * 60 * 60 * 1000) /
                                    1000;
                                break;
                            case 3:
                                startDate = new Date(startDate * 1000);
                                startDate.setMonth(
                                    startDate.getMonth() + totalDays * 4,
                                );
                                startDate =
                                    await this.commonDateService.DateTimeFormat(
                                        startDate,
                                        'timestamp',
                                    );
                                startDate =
                                    (startDate * 1000 - 24 * 60 * 60 * 1000) /
                                    1000;
                                break;
                            case 4:
                                startDate = new Date(startDate * 1000);
                                startDate.setFullYear(
                                    startDate.getFullYear() + totalDays,
                                );
                                startDate =
                                    await this.commonDateService.DateTimeFormat(
                                        startDate,
                                        'timestamp',
                                    );
                                startDate =
                                    (startDate * 1000 - 24 * 60 * 60 * 1000) /
                                    1000;
                                break;
                        }
                        planData[i]['end_date'] =
                            `${await this.commonDateService.DateTimeFormat(startDate, 'tstodate', 'YYYY-MM-DD')} 23:59:59`;
                    }
                    userData[h]['start_date'] = planData[i]['start_date'];
                    userData[h]['end_date'] = planData[i]['end_date'];
                    userData[h]['plan_date'] = userData[h]['plan_date'] || {};
                    userData[h]['plan_date'][planData[i].id] = {
                        start_date: planData[i]['start_date'],
                        end_date: planData[i]['end_date'],
                    };

                    let startDate = await this.commonDateService.DateTimeFormat(
                        planData[i]['start_date'],
                        'timestamp',
                    );
                    let endDate = await this.commonDateService.DateTimeFormat(
                        planData[i]['end_date'],
                        'timestamp',
                    );
                    if (minStartDate === null || startDate < minStartDate) {
                        minStartDate = startDate;
                    }
                    if (maxEndDate === null || endDate > maxEndDate) {
                        maxEndDate = endDate;
                    }
                    for (let j: number = 0; j < plan['blocks'].length; j++) {
                        if (!plan['blocks'][j]['assignBlock']) {
                            planData[i]['blocks'][j]['myActivity'] = [];
                        } else {
                            plan['blocks'][j]['myActivity'] = plan['blocks'][j][
                                'myActivity'
                            ].filter((ndata) => {
                                let validHealthPlan: boolean =
                                    ndata['healthplan'] === 0 ||
                                    (ndata.healthplan_name.toLowerCase() &&
                                        insurancePlanName
                                            .toLowerCase()
                                            .includes(
                                                ndata.healthplan_name.toLowerCase(),
                                            ));
                                let validGender: boolean =
                                    ndata['gender'] === 0 ||
                                    userGender === ndata['gender'];
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
                                        validRange =
                                            bDay >= ndata.age_s_range &&
                                            bDay <= ndata.age_e_range;
                                        break;
                                }
                                return (
                                    ndata['assignActivity'] &&
                                    validHealthPlan &&
                                    validGender &&
                                    (validAge || validRange)
                                );
                            });
                        }
                        const item = plan['blocks'][j];
                        if (item['myActivity']) {
                            for (
                                let k: number = 0;
                                k < item['myActivity'].length;
                                k++
                            ) {
                                const activity = item['myActivity'][k];
                                if (activity.activity) {
                                    categoryIds[Number(activity.activity.id)] =
                                        Number(activity.activity.category_id);
                                    if (activity.activity.category_id === 21) {
                                        eventIds.push(activity.activity.id);
                                    }
                                    if (activity.activity.category_id === 36) {
                                        quizIds.push(activity.activity.id);
                                    }
                                    if (activity.activity.category_id === 43) {
                                        quickLinkIds.push(activity.activity.id);
                                    }
                                }
                                if (activity['is_category'] === 0) {
                                    if (!orgSpeIds[activity['module_id']]) {
                                        orgSpeIds[activity['module_id']] = [];
                                    }
                                    orgSpeIds[activity['module_id']] = [
                                        ...orgSpeIds[activity['module_id']],
                                        ...(activity['org_activity_id']
                                            ? activity['org_activity_id'].split(
                                                  ',',
                                              )
                                            : []),
                                    ];
                                }
                                if (activity['is_category'] === 1) {
                                    if (!orgSpeCatIds[activity['module_id']]) {
                                        orgSpeCatIds[activity['module_id']] =
                                            [];
                                    }
                                    orgSpeCatIds[activity['module_id']] = [
                                        ...orgSpeCatIds[activity['module_id']],
                                        ...(activity['org_activity_id']
                                            ? activity['org_activity_id'].split(
                                                  ',',
                                              )
                                            : []),
                                    ];
                                }
                                if (activity.post_id) {
                                    postIds.push(Number(activity.post_id));
                                }
                                if (
                                    activity.module_id === 9 &&
                                    activity.org_activity_id
                                ) {
                                    postIds.push(
                                        Number(activity.org_activity_id),
                                    );
                                }
                                if (activity.fpost_id) {
                                    fPostIds.push(activity.fpost_id);
                                }
                            }
                        }
                    }
                    }
                }
            }
            let activitiesSd = await this.commonDateService.DateTimeFormat(
                minStartDate,
                'tstodate',
                'YYYY-MM-DD HH:mm:ss',
            );
            let activitiesEd = await this.commonDateService.DateTimeFormat(
                maxEndDate,
                'tstodate',
                'YYYY-MM-DD HH:mm:ss',
            );
            if (orgSpeIds[1] !== undefined || eventIds.length > 0) {
                let eventCondition:
                    | FindOptionsWhere<EventEntity>
                    | FindOptionsWhere<EventEntity>[] = { status: 1 };
                if (orgSpeIds[1] !== undefined && eventIds.length > 0) {
                    eventCondition = [
                        { status: 1, activity_id: In(eventIds) },
                        { status: 1, id: In(orgSpeIds[1]) },
                    ];
                } else if (orgSpeIds[1] !== undefined) {
                    eventCondition = { status: 1, id: In(orgSpeIds[1]) };
                } else {
                    eventCondition = { status: 1, activity_id: In(eventIds) };
                }
                let eventData: EventEntity[] = await this.eventService.getAll(
                    eventCondition,
                    ['id', 'activity_id', 'category_id'],
                    { id: 'DESC' },
                );
                if (eventData.length > 0) {
                    for (let i: number = 0; i < eventData.length; i++) {
                        const event: EventEntity = eventData[i];
                        const activityId: number = Number(event.activity_id);
                        categoryIds[activityId] = 21;
                        eventsListIdWise.set(event.id, event);
                    }
                }
            }
            if (orgSpeIds[2]) {
                emotionalResultDataEha =
                    await this.myPlanReportService.emotionalResultData(
                        userArray,
                        orgId,
                        'Yes',
                        '',
                    );
            }
            if (orgSpeIds[3]) {
                let keys = Object.keys(orgSpeIds[3]);
                let concatCategoryIds: Record<number, number> = {};
                for (let i: number = 0; i < keys.length; i++) {
                    concatCategoryIds[Number(orgSpeIds[3][keys[i]])] = 20;
                }
                categoryIds = { ...categoryIds, ...concatCategoryIds };
            }
            if (orgSpeIds[4]) {
                let scheduleChallenge: ScheduleChallengeEntity[] =
                    await this.scheduleChallengeService.getAll(
                        { id: In(orgSpeIds[4]), status: 1 },
                        ['id'],
                    );
                if (scheduleChallenge) {
                    let concatCategoryIds: Record<number, number> = {};
                    for (let i: number = 0; i < scheduleChallenge.length; i++) {
                        const challengeData: ScheduleChallengeEntity =
                            scheduleChallenge[i];
                        scheduleChallengeIdWise.set(
                            challengeData.id,
                            challengeData,
                        );
                        concatCategoryIds[Number(scheduleChallenge[i]['id'])] =
                            8;
                    }
                    categoryIds = { ...categoryIds, ...concatCategoryIds };
                }
            }
            if (orgSpeIds[5] || quickLinkIds.length > 0) {
                let quickLinkCondition:
                    | FindOptionsWhere<QuickLinkEntity>
                    | FindOptionsWhere<QuickLinkEntity>[] = { status: 1 };
                if (quickLinkIds[5] && quickLinkIds.length > 0) {
                    quickLinkCondition = [
                        { status: 1, activity_id: In(quickLinkIds) },
                        { status: 1, id: In(orgSpeIds[5] || []) },
                    ];
                } else if (orgSpeIds[5] !== undefined) {
                    quickLinkCondition = { status: 1, id: In(orgSpeIds[5]) };
                } else {
                    quickLinkCondition = {
                        status: 1,
                        activity_id: In(quickLinkIds),
                    };
                }
                let quickLinkData: QuickLinkEntity[] =
                    await this.quickLinkService.getAll(quickLinkCondition, [
                        'id',
                        'activity_id',
                    ]);
                if (quickLinkData) {
                    let concatCategoryIds: Record<number, number> = {};
                    for (let i: number = 0; i < quickLinkData.length; i++) {
                        let item: QuickLinkEntity = quickLinkData[i];
                        let key: number = item.activity_id;
                        concatCategoryIds[Number(key)] = 43;
                        quickLinkListActivityWise[key] = item;
                        quickLinkListIdWise.set(item.id, item);
                    }
                    categoryIds = { ...categoryIds, ...concatCategoryIds };
                }
            }
            if (orgSpeIds[6] || quizIds.length > 0) {
                let quCondition = `quiz.status = 1 AND assignQuizOrg.organization_id = "${membershipCode}" AND `;
                if (orgSpeIds[6] && quizIds.length !== 0) {
                    quCondition += `(assignQuizOrg.activity_id IN(${quizIds.join(',')}) OR quiz.id IN(${orgSpeIds[6].join(',')}))`;
                } else if (orgSpeIds[6]) {
                    quCondition += `quiz.id IN(${orgSpeIds[6].join(',')})`;
                } else {
                    quCondition += `assignQuizOrg.activity_id IN(${quizIds.join(',')})`;
                }
                let QuizData = await this.quizQuizzesService.commonQueryBuilder(
                    ['quiz.id', 'assignQuizOrg.activity_id'],
                    quCondition,
                    { 'quiz.id': 'DESC' },
                    [
                        {
                            join_table: 'quiz.assignQuizOrg',
                            alias: 'assignQuizOrg',
                            table: tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG,
                            on_condition: `assignQuizOrg.quiz_id = quiz.id`,
                            join_type: 'left_one',
                        },
                    ],
                    'getMany',
                );

                if (QuizData) {
                    let concatCategoryIds: Record<number, number> = {};
                    for (let i: number = 0; i < QuizData.length; i++) {
                        let item = QuizData[i];
                        concatCategoryIds[
                            Number(item?.assignQuizOrg?.activity_id)
                        ] = 36;
                        qzQuizListIdWise.set(item.id, item);
                    }
                    categoryIds = { ...categoryIds, ...concatCategoryIds };
                }
            }
            if (orgSpeIds[7]) {
                let hraAssessmentData: AssessmentsEntity[] =
                    await this.assessmentService.getAll(
                        {
                            user_id: In(userArray),
                            date: Between(activitiesSd, activitiesEd),
                            status: 1,
                        },
                        [
                            'date',
                            'user_id',
                            '1_qscore',
                            '1_WorstScore',
                            '2_qscore',
                            '2_WorstScore',
                            '3_qscore',
                            '3_WorstScore',
                            '4_qscore',
                            '4_WorstScore',
                            '5_qscore',
                            '5_WorstScore',
                        ],
                        { date: 'ASC' },
                    );
                for (let i: number = 0; i < hraAssessmentData.length; i++) {
                    const item: AssessmentsEntity = hraAssessmentData[i];
                    item['log_date_tmp'] =
                        await this.commonDateService.DateTimeFormat(
                            item['date'],
                            'YYYY-MM-DD HH:mm:ss',
                        );
                    let userWiseActivityObj: AssessmentsEntity[] =
                        hraAssessmentResult.get(item.user_id) || [];
                    userWiseActivityObj.push(item);
                    hraAssessmentResult.set(item.user_id, userWiseActivityObj);
                }
            }
            if (orgSpeIds[8]) {
                let bioMetricDataAssessment =
                    await this.myPlanReportService.biometricsRecord(
                        {
                            bio: `user_id IN(${userArray.join(',')}) AND created BETWEEN "${activitiesSd}" AND "${activitiesEd}" AND (height != "" OR weight != "" OR waist != "" OR alc != "" OR systolic != "" OR diastolic != "" OR total_cholesterol != "" OR hdl != "" OR ldl != "" OR triglycerides != "" OR blood_glucose != "") AND status = '1'`,
                            hra_bio: `user_id IN(${userArray.join(',')}) AND date BETWEEN "${activitiesSd}" AND "${activitiesEd}" AND (weight != '' OR (height_ft != "" AND height_in != "") OR waist != '' OR alc != '' OR bp_systolic != '' OR bp_diastolic != '' OR total_cholesterol != '' OR hdl != '' OR ldl != '' OR triglycerides != '' OR blood_glucose != '') AND status = '1'`,
                            ft_bio: `user_id IN(${userArray.join(',')}) AND added_date BETWEEN "${activitiesSd}" AND "${activitiesEd}" AND (weight != '' OR (height_ft != '' AND height_in != '') OR alc != '' OR systolic != '' OR diastolic != '' OR chol_total != '' OR hdl != '' OR ldl != '' OR triglycerides != '' OR glucose != '') AND status = '1'`,
                        },
                        [
                            tableConstant.HEALTH_ASSESSMENT
                                .TBL_HA_HRABIOMETRICS,
                            tableConstant.TRACKERS.TBL_FT_BIOMETRICS,
                        ],
                        { created: 'DESC' },
                    );
                for (
                    let i: number = 0;
                    i < bioMetricDataAssessment.length;
                    i++
                ) {
                    const item = bioMetricDataAssessment[i];
                    item['log_date_tmp'] =
                        await this.commonDateService.DateTimeFormat(
                            item['created'],
                            'YYYY-MM-DD HH:mm:ss',
                        );
                    let userWiseActivityObj: biometricInterface[] =
                        bioMetricAssessmentResult.get(item.user_id) || [];
                    userWiseActivityObj.push(item);
                    bioMetricAssessmentResult.set(
                        item.user_id,
                        userWiseActivityObj,
                    );
                }
            }

            let activitiesIds = Object.keys(categoryIds)
                .map(Number)
                .filter(Number.isInteger);
            let allActivityData = Object.create(null);
            if (activePlugin.includes('Healthcheckup')) {
                let trBiometricsActivityArray: number[] = [
                    2, 14, 20, 80, 126, 127, 128, 129, 208, 209, 210, 211, 212,
                    213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224,
                    225, 226, 227, 228, 229, 230, 1026, 1029, 1032,
                ];
                if (
                    trBiometricsActivityArray.filter((val) =>
                        activitiesIds.includes(val),
                    ).length > 0
                ) {
                    let bioData: BiometricsEntity[] =
                        await this.biometricsService.getAll(
                            {
                                user_id: In(userArray),
                                created: Between(activitiesSd, activitiesEd),
                                status: 1,
                                activity_id: Raw(
                                    () =>
                                        `(${activitiesIds.map((id) => `FIND_IN_SET('${id}', activity_id) > 0`).join(' OR ')})`,
                                ),
                            },
                            ['id', 'user_id', 'created', 'activity_id'],
                            { created: 'ASC', id: 'ASC' },
                        );
                    if (bioData.length > 0) {
                        let TrBiometricsActivityResult = new Map<
                            number,
                            TrBiometricsType
                        >();
                        for (let i: number = 0; i < bioData.length; i++) {
                            let bio: BiometricsEntity = bioData[i];
                            bio['log_date_tmp'] =
                                await this.commonDateService.DateTimeFormat(
                                    bio['created'],
                                    'YYYY-MM-DD HH:mm:ss',
                                );
                            let activityIds: number[] = bio.activity_id
                                .split(',')
                                .filter(Boolean)
                                .map(Number);
                            for (
                                let j: number = 0;
                                j < activityIds.length;
                                j++
                            ) {
                                let userWiseActivityObj: TrBiometricsType =
                                    TrBiometricsActivityResult.get(
                                        bio.user_id,
                                    ) || {};
                                const activityId: number = activityIds[j];
                                if (!userWiseActivityObj[activityId]) {
                                    userWiseActivityObj[activityId] = [];
                                }
                                userWiseActivityObj[activityId].push(bio);
                                TrBiometricsActivityResult.set(
                                    bio.user_id,
                                    userWiseActivityObj,
                                );
                            }
                        }
                        allActivityData['biometrics'] = Object.fromEntries(
                            TrBiometricsActivityResult,
                        );
                    }
                }
                if (
                    [40, 49].filter((val) => activitiesIds.includes(val))
                        .length > 0
                ) {
                    let activityData: DentistsEntity[] =
                        await this.dentistsService.getAll(
                            {
                                userid: In(userArray),
                                date_completed: Between(
                                    activitiesSd,
                                    activitiesEd,
                                ),
                                activity_id: In(activitiesIds),
                                status: 1,
                            },
                            ['id', 'userid', 'activity_id', 'date_completed'],
                            { date_completed: 'ASC', id: 'ASC' },
                        );
                    if (activityData.length > 0) {
                        let activityResult = new Map<number, DentistsType>();
                        for (let i: number = 0; i < activityData.length; i++) {
                            let activity: DentistsEntity = activityData[i];
                            activity['log_date_tmp'] =
                                activity['date_completed'];
                            let userWiseActivityObj: DentistsType =
                                activityResult.get(activity.userid) || {};
                            const activityId: number = activity['activity_id'];
                            if (!userWiseActivityObj[activityId]) {
                                userWiseActivityObj[activityId] = [];
                            }
                            userWiseActivityObj[activityId].push(activity);
                            activityResult.set(
                                activity.userid,
                                userWiseActivityObj,
                            );
                        }
                        allActivityData =
                            this.myPlanReportService.mergeNestedObjects(
                                allActivityData,
                                Object.fromEntries(activityResult),
                            );
                    }
                }
                if (
                    [5, 41, 50].filter((val) => activitiesIds.includes(val))
                        .length > 0
                ) {
                    let optometristsData: OptometristsEntity[] =
                        await this.optometristsService.getAll(
                            {
                                userid: In(userArray),
                                date_completed: Between(
                                    activitiesSd,
                                    activitiesEd,
                                ),
                                activity_id: In(activitiesIds),
                                status: 1,
                            },
                            ['id', 'userid', 'date_completed', 'activity_id'],
                            { date_completed: 'ASC', id: 'ASC' },
                        );
                    let optometristsResult = new Map<
                        number,
                        OptometristsType
                    >();
                    for (let i: number = 0; i < optometristsData.length; i++) {
                        let optometrist: OptometristsEntity =
                            optometristsData[i];
                        optometrist['log_date_tmp'] =
                            optometrist['date_completed'];
                        let userWiseActivityObj: OptometristsType =
                            optometristsResult.get(optometrist.userid) || {};
                        const activityId: number = optometrist['activity_id'];
                        if (!userWiseActivityObj[activityId]) {
                            userWiseActivityObj[activityId] = [];
                        }
                        userWiseActivityObj[activityId].push(optometrist);
                        optometristsResult.set(
                            optometrist.userid,
                            userWiseActivityObj,
                        );
                    }
                    allActivityData =
                        this.myPlanReportService.mergeNestedObjects(
                            allActivityData,
                            Object.fromEntries(optometristsResult),
                        );
                }
                if (
                    [4, 12, 13, 14, 20].filter((val) =>
                        activitiesIds.includes(val),
                    ).length > 0
                ) {
                    let tobaccoData: TobaccoUsesEntity[] =
                        await this.tobaccoUsesService.getAll(
                            {
                                user_id: In(userArray),
                                activity_id: In([
                                    ...activitiesIds,
                                    ...[4, 12, 13, 14],
                                ]),
                                date_completed: Between(
                                    activitiesSd,
                                    activitiesEd,
                                ),
                                status: 1,
                            },
                            ['id', 'user_id', 'date_completed', 'activity_id'],
                            { date_completed: 'ASC', id: 'ASC' },
                        );
                    let tobaccoResult = new Map<number, TobaccoUsesType>();
                    for (let i: number = 0; i < tobaccoData.length; i++) {
                        let tobacco: TobaccoUsesEntity = tobaccoData[i];
                        tobacco['log_date_tmp'] = tobacco['date_completed'];
                        let userWiseActivityObj: TobaccoUsesType =
                            tobaccoResult.get(tobacco.user_id) || {};
                        const activityId: number = tobacco['activity_id'];
                        if (!userWiseActivityObj[activityId]) {
                            userWiseActivityObj[activityId] = [];
                        }
                        userWiseActivityObj[activityId].push(tobacco);
                        tobaccoResult.set(tobacco.user_id, userWiseActivityObj);
                    }
                    allActivityData =
                        this.myPlanReportService.mergeNestedObjects(
                            allActivityData,
                            Object.fromEntries(tobaccoResult),
                        );
                }
                if (
                    [2, 3, 5].filter((val) => activitiesIds.includes(val))
                        .length > 0
                ) {
                    let authData: AuthorizationsEntity[] =
                        await this.authorizationsService.getAll(
                            {
                                user_id: In(userArray),
                                activity_id: In(activitiesIds),
                                date_completed: Between(
                                    activitiesSd,
                                    activitiesEd,
                                ),
                                status: 1,
                            },
                            ['id', 'user_id', 'date_completed', 'activity_id'],
                            { date_completed: 'ASC', id: 'ASC' },
                        );
                    let authorizationResult = new Map<
                        number,
                        AuthorizationsType
                    >();
                    for (let i: number = 0; i < authData.length; i++) {
                        let authorization: AuthorizationsEntity = authData[i];
                        authorization['log_date_tmp'] =
                            authorization['date_completed'];
                        let userWiseActivityObj: AuthorizationsType =
                            authorizationResult.get(authorization.user_id) ||
                            {};
                        const activityId: number = authorization['activity_id'];
                        if (!userWiseActivityObj[activityId]) {
                            userWiseActivityObj[activityId] = [];
                        }
                        userWiseActivityObj[activityId].push(authorization);
                        authorizationResult.set(
                            authorization.user_id,
                            userWiseActivityObj,
                        );
                    }
                    allActivityData['authorizations'] =
                        Object.fromEntries(authorizationResult);
                }
            }
            if (
                activePlugin.includes('Hra') &&
                [1, 58].filter((val) => activitiesIds.includes(val)).length > 0
            ) {
                let assessmentsData: AssessmentsEntity[] =
                    await this.assessmentService.getAll(
                        {
                            user_id: In(userArray),
                            activity_id: In(activitiesIds),
                            date: Between(activitiesSd, activitiesEd),
                            status: 1,
                        },
                        ['id', 'user_id', 'date', 'activity_id'],
                        { date: 'ASC', id: 'ASC' },
                    );
                let assessmentResult = new Map<number, AssessmentsType>();
                for (let i: number = 0; i < assessmentsData.length; i++) {
                    let assessment: AssessmentsEntity = assessmentsData[i];
                    assessment['log_date_tmp'] =
                        await this.commonDateService.DateTimeFormat(
                            assessment.date,
                            'YYYY-MM-DD HH:mm:ss',
                        );
                    let userWiseActivityObj: AssessmentsType =
                        assessmentResult.get(assessment.user_id) || {};
                    const activityId: number = assessment['activity_id'];
                    if (!userWiseActivityObj[activityId]) {
                        userWiseActivityObj[activityId] = [];
                    }
                    userWiseActivityObj[activityId].push(assessment);
                    assessmentResult.set(
                        assessment.user_id,
                        userWiseActivityObj,
                    );
                }
                allActivityData = this.myPlanReportService.mergeNestedObjects(
                    allActivityData,
                    Object.fromEntries(assessmentResult),
                );
            }
            if (
                activePlugin.includes('Activitytracker') &&
                activitiesIds.length > 0
            ) {
                let submitedFormData: SubmitedFormsEntity[] =
                    await this.submitFormsService.getAll(
                        {
                            status: 1,
                            user_id: In(userArray),
                            activity_id: In(activitiesIds),
                            activity_date: Between(activitiesSd, activitiesEd),
                        },
                        ['id', 'user_id', 'activity_date', 'activity_id'],
                        { activity_date: 'ASC', id: 'ASC' },
                    );
                let submitedFormResult = new Map<number, SubmitedFormsType>();
                for (let i: number = 0; i < submitedFormData.length; i++) {
                    let submitedForm: SubmitedFormsEntity = submitedFormData[i];
                    submitedForm['log_date_tmp'] =
                        submitedForm['activity_date'];
                    let userWiseActivityObj: SubmitedFormsType =
                        submitedFormResult.get(submitedForm.user_id) || {};
                    const activityId: number = submitedForm['activity_id'];
                    if (!userWiseActivityObj[activityId]) {
                        userWiseActivityObj[activityId] = [];
                    }
                    userWiseActivityObj[activityId].push(submitedForm);
                    submitedFormResult.set(
                        submitedForm.user_id,
                        userWiseActivityObj,
                    );
                }
                allActivityData = this.myPlanReportService.mergeNestedObjects(
                    allActivityData,
                    Object.fromEntries(submitedFormResult),
                );
            }
            if (activitiesIds.includes(890)) {
                let loginData: UserLoginEntity[] =
                    await this.userLoginService.getAll(
                        {
                            user_id: In(userArray),
                            login_time: Between(activitiesSd, activitiesEd),
                            status: 1,
                        },
                        ['id', 'user_id', 'login_time'],
                        { login_time: 'ASC', id: 'ASC' },
                    );
                const userLoginResult = new Map<
                    number,
                    {
                        '890': UserLoginEntity[];
                    }
                >();
                for (let i: number = 0; i < loginData.length; i++) {
                    let userLogin: UserLoginEntity = loginData[i];
                    userLogin['log_date_tmp'] =
                        await this.commonDateService.DateTimeFormat(
                            userLogin.login_time,
                            'YYYY-MM-DD HH:mm:ss',
                        );

                    const userId: number = userLogin.user_id;
                    let userWiseActivityObj =
                        userLoginResult.get(userId);
                    if (!userWiseActivityObj) {
                        userWiseActivityObj = {
                            '890': [],
                        };
                    }
                    userWiseActivityObj['890'].push(userLogin)
                    userLoginResult.set(userId, userWiseActivityObj);
                }
                allActivityData = this.myPlanReportService.mergeNestedObjects(
                    allActivityData,
                    Object.fromEntries(userLoginResult),
                );
            }
            if (
                activePlugin.includes('Quicklink') &&
                Object.values(categoryIds).includes(43)
            ) {
                let quickLinkData: QuickLinkClicksEntity[] =
                    await this.quickLinkClicksService.getAll(
                        {
                            user_id: In(userArray),
                            activity_id: In(activitiesIds),
                            created_date: Between(activitiesSd, activitiesEd),
                            status: 1,
                        },
                        ['id', 'user_id', 'created_date', 'activity_id'],
                        { created_date: 'ASC', id: 'ASC' },
                    );
                let quickLinkResult = new Map<number, QuickLinkClicksType>();
                for (let i: number = 0; i < quickLinkData.length; i++) {
                    let quickLink: QuickLinkClicksEntity = quickLinkData[i];
                    quickLink['log_date_tmp'] = quickLink['created_date'];
                    let userWiseActivityObj: QuickLinkClicksType =
                        quickLinkResult.get(quickLink.user_id) || {};
                    const activityId: number = quickLink['activity_id'];
                    if (!userWiseActivityObj[activityId]) {
                        userWiseActivityObj[activityId] = [];
                    }
                    userWiseActivityObj[activityId].push(quickLink);
                    quickLinkResult.set(quickLink.user_id, userWiseActivityObj);
                }
                allActivityData = this.myPlanReportService.mergeNestedObjects(
                    allActivityData,
                    Object.fromEntries(quickLinkResult),
                );
            }
            if (
                activePlugin.includes('Events') &&
                Object.values(categoryIds).includes(21)
            ) {
                let eventData: EventUserBookingListsEntity[] =
                    await this.eventUserBookingListsService.getAll(
                        {
                            ev_user_id: In(userArray),
                            activity_id: In(activitiesIds),
                            modified: Between(activitiesSd, activitiesEd),
                        },
                        [
                            'id',
                            'ev_user_id',
                            'modified',
                            'activity_id',
                            'ev_attend_status',
                        ],
                        { modified: 'ASC', id: 'ASC' },
                    );
                let userBookingListsResult = new Map<
                    number,
                    EventUserBookingListsType
                >();
                for (let i: number = 0; i < eventData.length; i++) {
                    const value: EventUserBookingListsEntity = eventData[i];
                    value['log_date_tmp'] =
                        await this.commonDateService.DateTimeFormat(
                            value['modified'],
                            'YYYY-MM-DD HH:mm:ss',
                        );
                    let userWiseActivityObj: EventUserBookingListsType =
                        userBookingListsResult.get(value.ev_user_id) || {};
                    const activityId: number = value['activity_id'];
                    if (!userWiseActivityObj[activityId]) {
                        userWiseActivityObj[activityId] = [];
                    }
                    userWiseActivityObj[activityId].push(value);
                    userBookingListsResult.set(
                        value.ev_user_id,
                        userWiseActivityObj,
                    );
                }
                allActivityData['events'] = Object.fromEntries(
                    userBookingListsResult,
                );
            }
            if (
                activePlugin.includes('Events') &&
                orgSpeCatIds?.[1]?.length > 0
            ) {
                let orgSpeCatId = orgSpeCatIds[1]
                    .map((id) => id.replace(/EVC/g, ''))
                    .join(',');
                let eventData1 = await this.eventService.commonQueryBuilder(
                    [
                        "CONCAT('I-', userBookingLists.id) AS id",
                        'userBookingLists.ev_user_id AS user_id',
                        "DATE_FORMAT(userBookingLists.modified, '%Y-%m-%d') AS log_date_tmp",
                        'userBookingLists.ev_attend_status',
                        'userBookingLists.activity_id',
                        'event.category_id',
                    ],
                    `userBookingLists.ev_user_id IN(${userArray.join(',')}) AND userBookingLists.modified BETWEEN "${activitiesSd}" AND "${activitiesEd}" AND category_id IN (${orgSpeCatId}) AND userBookingLists.status = '1'`,
                    { 'event.id': 'DESC' },
                    [
                        {
                            join_table: 'event.userBookingLists',
                            alias: 'userBookingLists',
                            table: tableConstant.EVENTS
                                .TBL_EV_USER_BOOKING_LISTS,
                            on_condition: `userBookingLists.ev_events_id = event.id`,
                            join_type: 'left_one',
                        },
                    ],
                    'getRawMany',
                );
                let eventData2 = await this.eventService.commonQueryBuilder(
                    [
                        "CONCAT('E-', externalLinkUser.id) AS id",
                        'externalLinkUser.user_id AS user_id',
                        "DATE_FORMAT(externalLinkUser.created, '%Y-%m-%d') AS log_date_tmp",
                        "'1' AS ev_attend_status",
                        'event.activity_id',
                        'event.category_id',
                    ],
                    `externalLinkUser.user_id IN(${userArray.join(',')}) AND externalLinkUser.created BETWEEN "${activitiesSd}" AND "${activitiesEd}" AND category_id IN (${orgSpeCatId}) AND externalLinkUser.status = '1'`,
                    { 'event.id': 'DESC' },
                    [{join_table: 'event.externalLinkUser', alias: 'externalLinkUser', table: tableConstant.EVENTS.TBL_EV_EXTERNAL_LINK_USER, on_condition: `externalLinkUser.event_id = event.id`, join_type: 'left_one'},
                    ],
                    'getRawMany',
                );
                let activityDone = [
                    ...(eventData1 || []),
                    ...(eventData2 || []),
                ];
                let eventResult = new Map<number, eEventsCategoryType>();
                for (let i: number = 0; i < activityDone.length; i++) {
                    const value = activityDone[i];
                    let userWiseActivityObj: eEventsCategoryType =
                        eventResult.get(value.user_id) || {};
                    const categoryId: number = value['category_id'];
                    if (!userWiseActivityObj[categoryId]) {
                        userWiseActivityObj[categoryId] = [];
                    }
                    userWiseActivityObj[categoryId].push(value);
                    eventResult.set(value.user_id, userWiseActivityObj);
                }
                allActivityData['events_category'] =
                    Object.fromEntries(eventResult);
            }
            if (
                activePlugin.includes('Quiz') &&
                Object.values(categoryIds).includes(36)
            ) {
                const quizUserDetailsData: UserDetailsEntity[] =
                    await this.userDetailsService.getAll(
                        {user_id: In(userArray), activity_id: In(activitiesIds), created_date: Between(activitiesSd, activitiesEd), status: 1},
                        ['id', 'user_id', 'created_date', 'activity_id', 'score', 'completed'],
                        { created_date: 'ASC', id: 'ASC' },
                    );
                let quizUserResult = new Map<number, UserDetailsType>();
                for (let i: number = 0; i < quizUserDetailsData.length; i++) {
                    const value: UserDetailsEntity = quizUserDetailsData[i];
                    value['log_date_tmp'] = await this.commonDateService.DateTimeFormat(value.created_date, 'YYYY-MM-DD HH:mm:ss');
                    let userWiseActivityObj: UserDetailsType = quizUserResult.get(value.user_id) || {};
                    const activityId: number = value['activity_id'];
                    if (!userWiseActivityObj[activityId]) {
                        userWiseActivityObj[activityId] = [];
                    }
                    userWiseActivityObj[activityId].push(value);
                    quizUserResult.set(value.user_id, userWiseActivityObj);
                }
                allActivityData['quiz'] = Object.fromEntries(quizUserResult);
            }
            if (activitiesIds.includes(5905) || postIds.length > 0) {
                if (postIds.length > 0) {
                    let emPostClickData: EmotionalWellBeingPostClickEntity[] =
                        await this.wellBeingPostClickService.getAll(
                            {
                                user_id: In(userArray),
                                post_id: In(postIds),
                                created_date: Between(activitiesSd, activitiesEd),
                                status: 1,
                            },
                            ['id', 'user_id', 'post_id', 'created_date'],
                            { created_date: 'ASC', id: 'ASC' },
                        );
                    const wellBeingPostClickResult = new Map<
                        number,
                        {
                            '5905': {
                                [postId: number]: EmotionalWellBeingPostClickEntity[];
                            };
                        }
                    >();
                    for (let i: number = 0; i < emPostClickData.length; i++) {
                        const item: EmotionalWellBeingPostClickEntity =
                            emPostClickData[i];
                        item['log_date_tmp'] = await this.commonDateService.DateTimeFormat(item.created_date, 'YYYY-MM-DD HH:mm:ss');
                        const userId: number = item.user_id;
                        const postId: number = item.post_id;
                        let userWiseActivityObj =
                            wellBeingPostClickResult.get(userId);
                        if (!userWiseActivityObj) {
                            userWiseActivityObj = {
                                '5905': {},
                            };
                        }
                        if (!userWiseActivityObj['5905'][postId]) {
                            userWiseActivityObj['5905'][postId] = [];
                        }
                        userWiseActivityObj['5905'][postId].push(item);
                        wellBeingPostClickResult.set(userId, userWiseActivityObj);
                    }
                    allActivityData = this.myPlanReportService.mergeNestedObjects(
                        allActivityData,
                        Object.fromEntries(wellBeingPostClickResult),
                    );
                }
            }
            if (activitiesIds.includes(4887) || fPostIds.length > 0) {
                if (fPostIds.length > 0) {
                    let fodVideoClickData: MediaFitnessVideoClickEntity[] =
                        await this.fitnessVideoClickService.getAll(
                            {
                                user_id: In(userArray),
                                v_id: In(fPostIds),
                                created: Between(activitiesSd, activitiesEd),
                                status: 1,
                            },
                            ['id', 'user_id', 'v_id', 'created'],
                            { created: 'ASC', id: 'ASC' },
                        );
                    const fitnessVideoClickResult = new Map<
                        number,
                        {
                            '4887': {
                                [videoId: number]: MediaFitnessVideoClickEntity[];
                            };
                        }
                    >();
                    for (let i: number = 0; i < fodVideoClickData.length; i++) {
                        const item: MediaFitnessVideoClickEntity = fodVideoClickData[i];
                        item['log_date_tmp'] = await this.commonDateService.DateTimeFormat(item.created, 'YYYY-MM-DD HH:mm:ss',);
                        const userId: number = item.user_id;
                        const videoId: number = item.v_id;
                        let userWiseActivityObj =
                            fitnessVideoClickResult.get(userId);
                        if (!userWiseActivityObj) {
                            userWiseActivityObj = {
                                '4887': {},
                            };
                        }
                        if (!userWiseActivityObj['4887'][videoId]) {
                            userWiseActivityObj['4887'][videoId] = [];
                        }
                        userWiseActivityObj['4887'][videoId].push(item);
                        fitnessVideoClickResult.set(userId, userWiseActivityObj);
                    }
                    allActivityData = this.myPlanReportService.mergeNestedObjects(
                        allActivityData,
                        Object.fromEntries(fitnessVideoClickResult),
                    );
                }
                let fodVideoClickData: MediaFitnessVideoClickEntity[] =
                    await this.fitnessVideoClickService.getAll(
                        {
                            user_id: In(userArray),
                            created: Between(activitiesSd, activitiesEd),
                            status: 1,
                        },
                        ['id', 'user_id', 'v_id', 'created'],
                        { created: 'ASC', id: 'ASC' },
                    );
                const mediaFitnessVideoClickResult = new Map<
                    number,
                    {
                        'A-4887': MediaFitnessVideoClickEntity[];
                    }
                >();
                for (let i: number = 0; i < fodVideoClickData.length; i++) {
                    let fodVideoClick: MediaFitnessVideoClickEntity =
                        fodVideoClickData[i];
                    fodVideoClick['log_date_tmp'] =
                        await this.commonDateService.DateTimeFormat(
                            fodVideoClick.created,
                            'YYYY-MM-DD HH:mm:ss',
                        );
                    const userId: number = fodVideoClick.user_id;
                    let userWiseActivityObj = mediaFitnessVideoClickResult.get(userId);
                    if (!userWiseActivityObj) {
                        userWiseActivityObj = {
                            'A-4887': [],
                        };
                    }
                    userWiseActivityObj['A-4887'].push(fodVideoClick);
                    mediaFitnessVideoClickResult.set(userId, userWiseActivityObj);
                }
                allActivityData = this.myPlanReportService.mergeNestedObjects(
                    allActivityData,
                    Object.fromEntries(mediaFitnessVideoClickResult),
                );
            }
            if (
                activePlugin.includes('Challenge') &&
                Object.values(categoryIds).includes(8)
            ) {
                let joinUserData: ScheduleChallengeJoinUsersEntity[] =
                    await this.scheduleChallengeJoinUsersService.getAll(
                        {
                            user_id: In(userArray),
                            added_date: Between(activitiesSd, activitiesEd),
                            status: 1,
                        },
                        ['id', 'user_id', 'schedule_id', 'added_date'],
                        { added_date: 'ASC', id: 'ASC' },
                    );
                let challengeJoinUserResult = new Map<
                    number,
                    ScheduleChallengeJoinUsersType
                >();
                for (let i: number = 0; i < joinUserData.length; i++) {
                    let challengeJoinUser: ScheduleChallengeJoinUsersEntity =
                        joinUserData[i];
                    challengeJoinUser['log_date_tmp'] =
                        challengeJoinUser['added_date'];
                    let userWiseActivityObj: ScheduleChallengeJoinUsersType =
                        challengeJoinUserResult.get(
                            challengeJoinUser.user_id,
                        ) || {};
                    const scheduleId: number = challengeJoinUser['schedule_id'];
                    if (!userWiseActivityObj[scheduleId]) {
                        userWiseActivityObj[scheduleId] = [];
                    }
                    userWiseActivityObj[scheduleId].push(challengeJoinUser);
                    challengeJoinUserResult.set(
                        challengeJoinUser.user_id,
                        userWiseActivityObj,
                    );
                }
                allActivityData['challenge'] = Object.fromEntries(
                    challengeJoinUserResult,
                );
            }
            if (activePlugin.includes('Trackers')) {
                if (
                    [7, 9, 11, 15, 16, 17, 18, 24].filter((val) =>
                        activitiesIds.includes(val),
                    ).length > 0
                ) {
                    let activityFeedData: ActivityFeedsEntity[];
                    if (
                        [11, 15].filter((val) => activitiesIds.includes(val))
                            .length > 0
                    ) {
                        activityFeedData =
                            await this.activityFeedService.getAll(
                                {
                                    user_id: In(userArray),
                                    activityTypeId: In([
                                        ...activitiesIds,
                                        ...[11, 15],
                                    ]),
                                    collectionDate: Between(
                                        activitiesSd,
                                        activitiesEd,
                                    ),
                                    status: 1,
                                },
                                [
                                    'acId',
                                    'user_id',
                                    'logType',
                                    'steps',
                                    'collectionDate',
                                    'activityTypeId',
                                ],
                                { collectionDate: 'ASC', acId: 'ASC' },
                            );
                    } else {
                        activityFeedData =
                            await this.activityFeedService.getAll(
                                {
                                    user_id: In(userArray),
                                    activityTypeId: In(activitiesIds),
                                    collectionDate: Between(
                                        activitiesSd,
                                        activitiesEd,
                                    ),
                                    status: 1,
                                },
                                [
                                    'acId',
                                    'user_id',
                                    'logType',
                                    'steps',
                                    'collectionDate',
                                    'activityTypeId',
                                ],
                                { collectionDate: 'ASC', acId: 'ASC' },
                            );
                    }
                    let activityFeedResult = new Map<
                        number,
                        ActivityFeedsEntityType
                    >();
                    for (let i: number = 0; i < activityFeedData.length; i++) {
                        let activityFeed: ActivityFeedsEntity =
                            activityFeedData[i];
                        activityFeed['activity_id'] =
                            activityFeed['activityTypeId'];
                        activityFeed['log_date_tmp'] =
                            activityFeed['collectionDate'];
                        let userWiseActivityObj: ActivityFeedsEntityType =
                            activityFeedResult.get(activityFeed.user_id) || {};
                        const activityId: number = activityFeed['activity_id'];
                        if (!userWiseActivityObj[activityId]) {
                            userWiseActivityObj[activityId] = [];
                        }
                        userWiseActivityObj[activityId].push(activityFeed);
                        activityFeedResult.set(
                            activityFeed.user_id,
                            userWiseActivityObj,
                        );
                    }
                    allActivityData =
                        this.myPlanReportService.mergeNestedObjects(
                            allActivityData,
                            Object.fromEntries(activityFeedResult),
                        );
                }
                if (
                    [6, 8, 10].filter((val) => activitiesIds.includes(val))
                        .length > 0
                ) {
                    let foodFeedData: FoodFeedsEntity[] =
                        await this.foodFeedService.getAll(
                            {
                                user_id: In(userArray),
                                activityTypeId: In([
                                    ...activitiesIds,
                                    ...[6, 10],
                                ]),
                                collectionDate: Between(
                                    activitiesSd,
                                    activitiesEd,
                                ),
                                status: 1,
                            },
                            [
                                'id',
                                'user_id',
                                'collectionDate',
                                'activityTypeId',
                                'water',
                            ],
                            { collectionDate: 'ASC', id: 'ASC' },
                        );
                    let foodFeedResult = new Map<number, FoodFeedsType>();
                    for (let i: number = 0; i < foodFeedData.length; i++) {
                        let foodFeed: FoodFeedsEntity = foodFeedData[i];
                        foodFeed['log_date_tmp'] =
                            await this.commonDateService.DateTimeFormat(
                                foodFeed.collectionDate,
                                'YYYY-MM-DD',
                            );
                        foodFeed['activity_id'] = foodFeed.activityTypeId;
                        foodFeed['waters'] = Math.abs(foodFeed.water);
                        let userWiseActivityObj: FoodFeedsType =
                            foodFeedResult.get(foodFeed.user_id) || {};
                        const activityId: number = foodFeed['activityTypeId'];
                        if (!userWiseActivityObj[activityId]) {
                            userWiseActivityObj[activityId] = [];
                        }
                        userWiseActivityObj[activityId].push(foodFeed);
                        foodFeedResult.set(
                            foodFeed.user_id,
                            userWiseActivityObj,
                        );
                    }
                    allActivityData =
                        this.myPlanReportService.mergeNestedObjects(
                            allActivityData,
                            Object.fromEntries(foodFeedResult),
                        );
                }
            }
            let userBiometricsActivityArray = [51, 52, 53, 54, 55, 56, 57];
            let adminBiometricsActivityArray = [33, 34, 35, 36, 37, 38, 39];
            let physicianBiometricsActivityArray = [
                42, 43, 44, 45, 46, 47, 48, 3811,
            ];
            let biometricSourceBasedActivities =
                userBiometricsActivityArray.concat(
                    adminBiometricsActivityArray,
                    physicianBiometricsActivityArray,
                );
            let bodyFeedActivities = [21, 22, 23, 25, 26, 27, 28, 29, 30];
            if (
                userBiometricsActivityArray.filter((val) =>
                    activitiesIds.includes(val),
                ).length > 0 ||
                adminBiometricsActivityArray.filter((val) =>
                    activitiesIds.includes(val),
                ).length > 0 ||
                physicianBiometricsActivityArray.filter((val) =>
                    activitiesIds.includes(val),
                ).length > 0
            ) {
                if (
                    userBiometricsActivityArray.filter((val) =>
                        activitiesIds.includes(val),
                    ).length > 0
                ) {
                    let userBiometricsData =
                        await this.myPlanReportService.biometricsRecord(
                            {
                                bio: `user_id IN(${userArray.join(',')}) AND created BETWEEN "${activitiesSd}" AND "${activitiesEd}" AND source IN(1,13,14,15) AND (height != "" OR weight != "" OR waist != "" OR bmi != "" OR systolic != "" OR diastolic != "" OR total_cholesterol != "" OR hdl != "" OR ldl != "" OR triglycerides != "" OR blood_glucose != "") AND status = '1'`,
                                hra_bio: `user_id IN(${userArray.join(',')}) AND source IN(1,13,14,15) AND (weight != '' OR waist != '' OR total_cholesterol != '' OR hdl != '' OR ldl != '' OR triglycerides != '' OR blood_glucose != '') AND status = '1'`,
                                ft_bio: `user_id IN(${userArray.join(',')}) AND (weight != '' OR diastolic != '' OR systolic != '' OR hdl != '' OR ldl != '' OR triglycerides != '') AND status = '1'`,
                            },
                            [
                                tableConstant.HEALTH_ASSESSMENT
                                    .TBL_HA_HRABIOMETRICS,
                                tableConstant.TRACKERS.TBL_FT_BIOMETRICS,
                            ],
                            { created: 'ASC', id: 'ASC' },
                        );
                    let userBiometricsResult = new Map<
                        number,
                        biometricInterface[]
                    >();
                    for (
                        let i: number = 0;
                        i < userBiometricsData.length;
                        i++
                    ) {
                        let userBiometric = userBiometricsData[i];
                        userBiometric['log_date_tmp'] =
                            await this.commonDateService.DateTimeFormat(
                                userBiometric['created'],
                                'YYYY-MM-DD HH:mm:ss',
                            );
                        let userWiseActivityObj: biometricInterface[] =
                            userBiometricsResult.get(userBiometric.user_id) ||
                            [];
                        if (userWiseActivityObj.length > 0) {
                            userWiseActivityObj.push(userBiometric);
                        } else {
                            userWiseActivityObj = [userBiometric];
                        }
                        userBiometricsResult.set(
                            userBiometric.user_id,
                            userWiseActivityObj,
                        );
                    }
                    allActivityData['user_biometrics'] =
                        Object.fromEntries(userBiometricsResult);
                }
                if (
                    adminBiometricsActivityArray.filter((val) =>
                        activitiesIds.includes(val),
                    ).length > 0
                ) {
                    let adminBiometricsData =
                        await this.myPlanReportService.biometricsRecord(
                            {
                                bio: `user_id IN(${userArray.join(',')}) AND created BETWEEN "${activitiesSd}" AND "${activitiesEd}" AND source IN(2) AND status = '1'`,
                                hra_bio: `user_id IN(${userArray.join(',')}) AND source IN(2) AND status = '1'`,
                            },
                            [
                                tableConstant.HEALTH_ASSESSMENT
                                    .TBL_HA_HRABIOMETRICS,
                            ],
                            { created: 'ASC', id: 'ASC' },
                        );
                    let adminBiometricsResult = new Map<
                        number,
                        biometricInterface[]
                    >();
                    for (
                        let i: number = 0;
                        i < adminBiometricsData.length;
                        i++
                    ) {
                        let hraBiometric = adminBiometricsData[i];
                        hraBiometric['log_date_tmp'] =
                            await this.commonDateService.DateTimeFormat(
                                hraBiometric['created'],
                                'YYYY-MM-DD HH:mm:ss',
                            );
                        let userWiseActivityObj: biometricInterface[] =
                            adminBiometricsResult.get(hraBiometric.user_id) ||
                            [];
                        if (userWiseActivityObj.length > 0) {
                            userWiseActivityObj.push(hraBiometric);
                        } else {
                            userWiseActivityObj = [hraBiometric];
                        }
                        adminBiometricsResult.set(
                            hraBiometric.user_id,
                            userWiseActivityObj,
                        );
                    }
                    allActivityData['admin_biometrics'] = Object.fromEntries(
                        adminBiometricsResult,
                    );
                }
                if (
                    physicianBiometricsActivityArray.filter((val) =>
                        activitiesIds.includes(val),
                    ).length > 0
                ) {
                    let bioResultedData: BiometricsEntity[] =
                        await this.biometricsService.getAll(
                            [
                                {
                                    user_id: In(userArray),
                                    source: In([3, 11, 12]),
                                    created: Between(
                                        activitiesSd,
                                        activitiesEd,
                                    ),
                                    status: 1,
                                    height: Not(''),
                                },
                                {
                                    user_id: In(userArray),
                                    source: In([3, 11, 12]),
                                    created: Between(
                                        activitiesSd,
                                        activitiesEd,
                                    ),
                                    status: 1,
                                    weight: Not(''),
                                },
                                {
                                    user_id: In(userArray),
                                    source: In([3, 11, 12]),
                                    created: Between(
                                        activitiesSd,
                                        activitiesEd,
                                    ),
                                    status: 1,
                                    waist: Not(''),
                                },
                                {
                                    user_id: In(userArray),
                                    source: In([3, 11, 12]),
                                    created: Between(
                                        activitiesSd,
                                        activitiesEd,
                                    ),
                                    status: 1,
                                    bmi: Not(''),
                                },
                                {
                                    user_id: In(userArray),
                                    source: In([3, 11, 12]),
                                    created: Between(
                                        activitiesSd,
                                        activitiesEd,
                                    ),
                                    status: 1,
                                    systolic: Not(''),
                                },
                                {
                                    user_id: In(userArray),
                                    source: In([3, 11, 12]),
                                    created: Between(
                                        activitiesSd,
                                        activitiesEd,
                                    ),
                                    status: 1,
                                    diastolic: Not(''),
                                },
                                {
                                    user_id: In(userArray),
                                    source: In([3, 11, 12]),
                                    created: Between(
                                        activitiesSd,
                                        activitiesEd,
                                    ),
                                    status: 1,
                                    total_cholesterol: Not(''),
                                },
                                {
                                    user_id: In(userArray),
                                    source: In([3, 11, 12]),
                                    created: Between(
                                        activitiesSd,
                                        activitiesEd,
                                    ),
                                    status: 1,
                                    hdl: Not(''),
                                },
                                {
                                    user_id: In(userArray),
                                    source: In([3, 11, 12]),
                                    created: Between(
                                        activitiesSd,
                                        activitiesEd,
                                    ),
                                    status: 1,
                                    ldl: Not(''),
                                },
                                {
                                    user_id: In(userArray),
                                    source: In([3, 11, 12]),
                                    created: Between(
                                        activitiesSd,
                                        activitiesEd,
                                    ),
                                    status: 1,
                                    triglycerides: Not(''),
                                },
                                {
                                    user_id: In(userArray),
                                    source: In([3, 11, 12]),
                                    created: Between(
                                        activitiesSd,
                                        activitiesEd,
                                    ),
                                    status: 1,
                                    blood_glucose: Not(''),
                                },
                            ],
                            [
                                'id',
                                'user_id',
                                'height',
                                'weight',
                                'bmi',
                                'systolic',
                                'diastolic',
                                'blood_glucose',
                                'total_cholesterol',
                                'hdl',
                                'ldl',
                                'triglycerides',
                                'waist',
                                'created',
                                'created',
                            ],
                            { created: 'ASC', id: 'ASC' },
                        );
                    let bioResultedResult = new Map<
                        number,
                        BiometricsEntity[]
                    >();
                    for (let i: number = 0; i < bioResultedData.length; i++) {
                        let bioResulted: BiometricsEntity = bioResultedData[i];
                        bioResulted['log_date_tmp'] =
                            await this.commonDateService.DateTimeFormat(
                                bioResulted['created'],
                                'YYYY-MM-DD HH:mm:ss',
                            );
                        let userWiseActivityObj: BiometricsEntity[] =
                            bioResultedResult.get(bioResulted.user_id) || [];
                        if (userWiseActivityObj.length > 0) {
                            userWiseActivityObj.push(bioResulted);
                        } else {
                            userWiseActivityObj = [bioResulted];
                        }
                        bioResultedResult.set(
                            bioResulted.user_id,
                            userWiseActivityObj,
                        );
                    }
                    allActivityData['physician_biometrics'] =
                        Object.fromEntries(bioResultedResult);
                }
            }
            if (
                bodyFeedActivities.filter((val) => activitiesIds.includes(val))
                    .length > 0
            ) {
                let hraBiometricsData: AssessmentHraBiometricEntity[] =
                    await this.assessmentHraBiometricService.getAll(
                        [
                            {
                                user_id: In(userArray),
                                date: Between(activitiesSd, activitiesEd),
                                status: 1,
                                body_fat: Not(0),
                            },
                            {
                                user_id: In(userArray),
                                date: Between(activitiesSd, activitiesEd),
                                status: 1,
                                hip: Not(0),
                            },
                            {
                                user_id: In(userArray),
                                date: Between(activitiesSd, activitiesEd),
                                status: 1,
                                waist: Not(0),
                            },
                            {
                                user_id: In(userArray),
                                date: Between(activitiesSd, activitiesEd),
                                status: 1,
                                arm: Not(0),
                            },
                            {
                                user_id: In(userArray),
                                date: Between(activitiesSd, activitiesEd),
                                status: 1,
                                leg: Not(0),
                            },
                            {
                                user_id: In(userArray),
                                date: Between(activitiesSd, activitiesEd),
                                status: 1,
                                calve: Not(0),
                            },
                            {
                                user_id: In(userArray),
                                date: Between(activitiesSd, activitiesEd),
                                status: 1,
                                weight: Not(0),
                            },
                        ],
                        [
                            'id',
                            'user_id',
                            'body_fat',
                            'hip',
                            'waist',
                            'arm',
                            'leg',
                            'calve',
                            'weight',
                            'date',
                        ],
                    );
                let bodyFeedsResult = new Map<number, AllBiometricType[]>();
                for (let i: number = 0; i < hraBiometricsData.length; i++) {
                    let hraBiometric: AssessmentHraBiometricEntity =
                        hraBiometricsData[i];
                    hraBiometric['chest'] = null;
                    hraBiometric['log_date_tmp'] =
                        await this.commonDateService.DateTimeFormat(
                            hraBiometric['date'],
                            'YYYY-MM-DD HH:mm:ss',
                        );
                    let userWiseActivityObj: AllBiometricType[] =
                        bodyFeedsResult.get(hraBiometric.user_id) || [];
                    if (userWiseActivityObj.length > 0) {
                        userWiseActivityObj.push(hraBiometric);
                    } else {
                        userWiseActivityObj = [hraBiometric];
                    }
                    bodyFeedsResult.set(
                        hraBiometric.user_id,
                        userWiseActivityObj,
                    );
                }

                let bodyFeedData: BodyFeedsEntity[] =
                    await this.bodyFeedService.getAll(
                        [
                            {
                                user_id: In(userArray),
                                date: Between(activitiesSd, activitiesEd),
                                status: 1,
                                thigh: Not(0),
                            },
                            {
                                user_id: In(userArray),
                                date: Between(activitiesSd, activitiesEd),
                                status: 1,
                                weight: Not(0),
                            },
                            {
                                user_id: In(userArray),
                                date: Between(activitiesSd, activitiesEd),
                                status: 1,
                                chest: Not(0),
                            },
                        ],
                        ['id', 'user_id', 'thigh', 'weight', 'chest', 'date'],
                    );
                for (let i: number = 0; i < bodyFeedData.length; i++) {
                    let bodyFeed: BodyFeedsEntity = bodyFeedData[i];
                    bodyFeed['log_date_tmp'] =
                        await this.commonDateService.DateTimeFormat(
                            bodyFeed['date'],
                            'YYYY-MM-DD HH:mm:ss',
                        );
                    let userWiseActivityObj: AllBiometricType[] =
                        bodyFeedsResult.get(bodyFeed.user_id) || [];
                    if (userWiseActivityObj.length > 0) {
                        userWiseActivityObj.push(bodyFeed);
                    } else {
                        userWiseActivityObj = [bodyFeed];
                    }
                    bodyFeedsResult.set(bodyFeed.user_id, userWiseActivityObj);
                }

                let ftBioData: FtBiometricsEntity[] =
                    await this.ftBiometricsService.getAll(
                        [
                            {
                                user_id: In(userArray),
                                added_date: Between(activitiesSd, activitiesEd),
                                status: 1,
                                weight: Not(''),
                            },
                        ],
                        ['id', 'user_id', 'weight', 'added_date'],
                    );
                for (let i: number = 0; i < ftBioData.length; i++) {
                    let ftBio: FtBiometricsEntity = ftBioData[i];
                    ftBio['date'] = ftBio['added_date'];
                    ftBio['log_date_tmp'] =
                        await this.commonDateService.DateTimeFormat(
                            ftBio['added_date'],
                            'YYYY-MM-DD HH:mm:ss',
                        );
                    let userWiseActivityObj: AllBiometricType[] =
                        bodyFeedsResult.get(ftBio.user_id) || [];
                    if (userWiseActivityObj.length > 0) {
                        userWiseActivityObj.push(ftBio);
                    } else {
                        userWiseActivityObj = [ftBio];
                    }
                    bodyFeedsResult.set(ftBio.user_id, userWiseActivityObj);
                }

                let biometricsData: BiometricsEntity[] =
                    await this.biometricsService.getAll(
                        {
                            user_id: In(userArray),
                            created: Between(activitiesSd, activitiesEd),
                            status: 1,
                            weight: Not(''),
                        },
                        ['id', 'user_id', 'weight', 'created'],
                    );
                for (let i: number = 0; i < biometricsData.length; i++) {
                    let biometric: BiometricsEntity = biometricsData[i];
                    biometric['date'] = biometric['created'];
                    biometric['log_date_tmp'] =
                        await this.commonDateService.DateTimeFormat(
                            biometric['created'],
                            'YYYY-MM-DD HH:mm:ss',
                        );
                    let userWiseActivityObj: AllBiometricType[] =
                        bodyFeedsResult.get(biometric.user_id) || [];
                    if (userWiseActivityObj.length > 0) {
                        userWiseActivityObj.push(biometric);
                    } else {
                        userWiseActivityObj = [biometric];
                    }
                    bodyFeedsResult.set(biometric.user_id, userWiseActivityObj);
                }
                allActivityData['body_feeds'] =
                    Object.fromEntries(bodyFeedsResult);
                const keys = Object.keys(allActivityData['body_feeds']);
                for (let i: number = 0; i < keys.length; i++) {
                    const userId = keys[i];
                    allActivityData['body_feeds'][userId] = allActivityData[
                        'body_feeds'
                    ][userId].sort((a, b) => {
                        let dateA = this.commonDateService.DateTimeFormat(
                            a['date'],
                            'timestamp',
                            'YYYY-MM-DD HH:mm:ss',
                        );
                        let dateB = this.commonDateService.DateTimeFormat(
                            b['date'],
                            'timestamp',
                            'YYYY-MM-DD HH:mm:ss',
                        );
                        let dateATs = this.commonDateService.DateTimeFormat(
                            a['date'],
                            'YYYY-MM-DD',
                            'YYYY-MM-DD HH:mm:ss',
                        );
                        let dateBTs = this.commonDateService.DateTimeFormat(
                            b['date'],
                            'YYYY-MM-DD',
                            'YYYY-MM-DD HH:mm:ss',
                        );
                        if (dateATs === dateBTs) {
                            return a['id'] - b['id'];
                        }
                        return dateA - dateB;
                    });
                }
            }
            let joinUserPlanSave = [];
            let joinUserPlanUpdate = [];
            let completeBlockUpdate = [];
            let completeBlockSave = [];
            let completeActivitySave = [];
            for (let i: number = 0; i < userData.length; i++) {
                let user: UserEntity = userData[i];
                let userId = user?.id;
                let joinUserPlan = joinUserPlanResult.get?.(userId);
                let userCompleteBlock: CompleteBlockType = myPlanCompleteBlockResult.get?.(user?.id);
                let userCompleteActivity: CompleteActivityType =
                    myPlanCompleteActivityResult.get?.(userId);
                const userAllActivityOld = {
                    ...allActivityData?.[userId],
                    biometrics: allActivityData['biometrics']?.[userId],
                    authorizations: allActivityData['authorizations']?.[userId],
                    events: allActivityData['events']?.[userId],
                    events_category:
                        allActivityData['events_category']?.[userId],
                    quiz: allActivityData['quiz']?.[userId],
                    challenge: allActivityData['challenge']?.[userId],
                    user_biometrics:
                        allActivityData['user_biometrics']?.[userId],
                    admin_biometrics:
                        allActivityData['admin_biometrics']?.[userId],
                    physician_biometrics:
                        allActivityData['physician_biometrics']?.[userId],
                    body_feeds: allActivityData['body_feeds']?.[userId],
                };
                const availablePlan: number[] = userAvailableMyPlan.get(user.id);

                for (let j: number = 0; j < planData.length; j++) {
                    let plan: PlanInterface = structuredClone(planData[j]);
                if (availablePlan.includes(plan.id)) {
                    let planDate = user['plan_date']?.[plan?.id];
                    const start = planDate['plan_date']
                        ? new Date(planDate['start_date'])
                        : null;
                    const end = planDate['end_date']
                        ? new Date(planDate['end_date'])
                        : null;
                    let userAllActivity =
                        this.myPlanReportService.filterUserActivityByDate(
                            userAllActivityOld,
                            start,
                            end,
                        );
                    plan.plan_total_activity =
                        plan.plan_complete_activity =
                        plan.total_activity_percentage =
                            0;
                    plan['assignPlan'] = assignPlanResult.get(plan.id);
                    plan['joinPlan'] = joinUserPlan?.[plan.id];
                    let activityStartDate: number,
                        blockStartDate: number,
                        activityEndDate: number,
                        blockEndDate: number,
                        index = 0,
                        blockSettingWithFrequency = 0;
                    if (plan['blocks'].length > 0) {
                        for (
                            let k: number = 0;
                            k < plan['blocks'].length;
                            k++
                        ) {
                            let block: MyPlanBlocksEntity = structuredClone(plan['blocks'][k]);
                            block['activity_detail'] = Object.create(null);
                            block['completeBlock'] = userCompleteBlock?.[block['id']] || {};
                            if (
                                plan['assignPlan']['based_on'] === 0 ||
                                (plan['assignPlan']['based_on'] === 1 &&
                                    plan['assignPlan']['startdate'] === null) ||
                                plan['assignPlan']['based_on'] === 2
                            ) {
                                if (!blockEndDate) {
                                    blockStartDate =
                                        await this.commonDateService.DateTimeFormat(
                                            plan['start_date'],
                                            'timestamp',
                                            'MMMM D, YYYY',
                                        );
                                } else {
                                    if (plan['assignPlan']['based_on'] !== 2) {
                                        blockStartDate =
                                            (blockEndDate * 1000 +
                                                24 * 60 * 60 * 1000) /
                                            1000;
                                    }
                                }
                            }
                            if (
                                plan['assignPlan']['based_on'] === 1 &&
                                plan['assignPlan']['startdate'] !== null
                            ) {
                                blockStartDate =
                                    block['assignBlock']?.['startdate'] !== null
                                        ? await this.commonDateService.DateTimeFormat(
                                              block['assignBlock']?.[
                                                  'startdate'
                                              ],
                                              'timestamp',
                                              'YYYY-MM-DD HH:mm:ss',
                                          )
                                        : await this.commonDateService.DateTimeFormat(
                                              plan['assignPlan']['startdate'],
                                              'timestamp',
                                              'YYYY-MM-DD HH:mm:ss',
                                          );
                            }
                            if (
                                plan['assignPlan']['based_on'] === 0 ||
                                (plan['assignPlan']['based_on'] === 1 &&
                                    plan['assignPlan']['enddate'] === null) ||
                                (plan['assignPlan']['based_on'] === 2 &&
                                    plan['assignPlan']['enddate'] === null)
                            ) {
                                let blockDays = block['myActivity'].reduce(
                                    (sum, current) => sum + current.days,
                                    0,
                                );
                                blockEndDate =
                                    (blockStartDate * 1000 +
                                        (Number(blockDays) - 1) *
                                            24 *
                                            60 *
                                            60 *
                                            1000) /
                                    1000;
                            }
                            if (
                                [1, 2].includes(
                                    plan['assignPlan']['based_on'],
                                ) &&
                                plan['assignPlan']['enddate'] !== null
                            ) {
                                blockEndDate =
                                    block['assignBlock']?.['enddate'] !== null
                                        ? await this.commonDateService.DateTimeFormat(
                                              block['assignBlock']?.['enddate'],
                                              'YYYY-MM-DD HH:mm:ss',
                                          )
                                        : await this.commonDateService.DateTimeFormat(
                                              plan['assignPlan']['enddate'],
                                              'YYYY-MM-DD HH:mm:ss',
                                          );
                            }
                            if (plan['assignPlan']['based_on'] === 3) {
                                let fRange = plan['assignPlan']['f_range'] || 1;
                                let frequencyBase =
                                    plan['assignPlan']['frequency_base'];
                                switch (frequencyBase) {
                                    case 0:
                                        if (!blockEndDate) {
                                            blockStartDate =
                                                await this.commonDateService.DateTimeFormat(
                                                    plan['start_date'],
                                                    'timestamp',
                                                    'MMMM D, YYYY',
                                                );
                                        } else {
                                            if (
                                                !Number.isInteger(
                                                    blockSettingWithFrequency,
                                                )
                                            ) {
                                                blockStartDate =
                                                    activityEndDate;
                                            } else {
                                                blockStartDate =
                                                    (activityEndDate * 1000 +
                                                        24 * 60 * 60 * 1000) /
                                                    1000;
                                            }
                                        }
                                        break;
                                    case 1:
                                        if (!blockEndDate) {
                                            blockStartDate =
                                                await this.commonDateService.DateTimeFormat(
                                                    plan['start_date'],
                                                    'timestamp',
                                                    'MMMM D, YYYY',
                                                );
                                        } else {
                                            if (
                                                !Number.isInteger(
                                                    blockSettingWithFrequency,
                                                )
                                            ) {
                                                blockStartDate =
                                                    activityStartDate;
                                            } else {
                                                blockStartDate =
                                                    (activityStartDate * 1000 +
                                                        7 *
                                                            24 *
                                                            60 *
                                                            60 *
                                                            1000) /
                                                    1000; /*one week*/
                                            }
                                        }
                                        break;
                                    case 2:
                                        if (!blockEndDate) {
                                            blockStartDate =
                                                await this.commonDateService.DateTimeFormat(
                                                    plan['start_date'],
                                                    'timestamp',
                                                    'MMMM D, YYYY',
                                                );
                                        } else {
                                            if (
                                                !Number.isInteger(
                                                    blockSettingWithFrequency,
                                                )
                                            ) {
                                                blockStartDate =
                                                    activityStartDate;
                                            } else {
                                                let oneMonthInc = new Date(
                                                    activityStartDate * 1000,
                                                );
                                                oneMonthInc.setMonth(
                                                    oneMonthInc.getMonth() + 1,
                                                );
                                                blockStartDate =
                                                    await this.commonDateService.DateTimeFormat(
                                                        oneMonthInc,
                                                        'timestamp',
                                                    ); /*one month*/
                                            }
                                        }
                                        break;
                                    case 3:
                                        if (!blockEndDate) {
                                            blockStartDate =
                                                await this.commonDateService.DateTimeFormat(
                                                    plan['start_date'],
                                                    'timestamp',
                                                    'MMMM D, YYYY',
                                                );
                                        } else {
                                            if (
                                                !Number.isInteger(
                                                    blockSettingWithFrequency,
                                                )
                                            ) {
                                                blockStartDate =
                                                    activityStartDate;
                                            } else {
                                                let fourMonthInc = new Date(
                                                    activityStartDate * 1000,
                                                );
                                                fourMonthInc.setMonth(
                                                    fourMonthInc.getMonth() + 4,
                                                );
                                                blockStartDate =
                                                    await this.commonDateService.DateTimeFormat(
                                                        fourMonthInc,
                                                        'timestamp',
                                                    ); /*four month*/
                                            }
                                        }
                                        break;
                                    case 4:
                                        if (!blockEndDate) {
                                            blockStartDate =
                                                await this.commonDateService.DateTimeFormat(
                                                    plan['start_date'],
                                                    'timestamp',
                                                    'MMMM D, YYYY',
                                                );
                                        } else {
                                            if (
                                                !Number.isInteger(
                                                    blockSettingWithFrequency,
                                                )
                                            ) {
                                                blockStartDate =
                                                    await this.commonDateService.DateTimeFormat(
                                                        blockStartDate,
                                                        'YYYY-MM-DD HH:mm:ss',
                                                    );
                                            } else {
                                                let oneYearsInc = new Date(
                                                    activityStartDate * 1000,
                                                );
                                                oneYearsInc.setFullYear(
                                                    oneYearsInc.getFullYear() +
                                                        1,
                                                );
                                                blockStartDate =
                                                    await this.commonDateService.DateTimeFormat(
                                                        oneYearsInc,
                                                        'timestamp',
                                                    ); /*one year*/
                                            }
                                        }
                                        break;
                                }
                                blockSettingWithFrequency =
                                    block['myActivity'].length / fRange +
                                    blockSettingWithFrequency;
                            }
                            if (block['completeBlock'] && block['completeBlock']['status'] === 1) {
                                block['iscomplete'] = 1;
                                block['completeBlock']['activity_detail_data'] = block['completeBlock']['activity_detail'] ? JSON.parse(block['completeBlock']['activity_detail']) : {};
                            }
                            block['start_date'] =
                                await this.commonDateService.DateTimeFormat(
                                    blockStartDate,
                                    'tstodate',
                                    'YYYY-MM-DD HH:mm:ss',
                                );
                            block['iscomplete'] = 0;
                            block['block_total_activity'] = 0;
                            block['block_complete_activity'] = 0;
                            if (block['myActivity'].length > 0) {
                                let finalNotShowActivityIds: number[] = [];
                                let getOptionActivity = {};
                                block['myActivity'].forEach(function (item) {
                                    if (item.option_activity_ids) {
                                        getOptionActivity[item.id] =
                                            item.option_activity_ids;
                                    }
                                });
                                if (getOptionActivity) {
                                    let notShowActivityIds = {};
                                    Object.keys(getOptionActivity).forEach(
                                        function (keyvalue) {
                                            notShowActivityIds[keyvalue] =
                                                getOptionActivity[keyvalue]
                                                    .split(',')
                                                    .map(Number);
                                        },
                                    );
                                    let mainActivityIds = {};
                                    if (notShowActivityIds) {
                                        Object.keys(notShowActivityIds).forEach(
                                            function (keyvalue) {
                                                let activityData =
                                                    Object.assign(
                                                        {},
                                                        ...notShowActivityIds[
                                                            keyvalue
                                                        ].map((val) => ({
                                                            [val]: parseInt(
                                                                keyvalue,
                                                            ),
                                                        })),
                                                    );
                                                Object.keys(
                                                    activityData,
                                                ).forEach(
                                                    function (innerKeyvalue) {
                                                        if (
                                                            !mainActivityIds[
                                                                innerKeyvalue
                                                            ]
                                                        ) {
                                                            mainActivityIds[
                                                                innerKeyvalue
                                                            ] = [];
                                                        }
                                                        mainActivityIds[
                                                            innerKeyvalue
                                                        ].push(
                                                            activityData[
                                                                innerKeyvalue
                                                            ],
                                                        );
                                                    },
                                                );
                                            },
                                        );
                                        let notShowActivityIdsMerge =
                                            [].concat.apply(
                                                [],
                                                Object.values(
                                                    notShowActivityIds,
                                                ),
                                            );
                                        if (
                                            notShowActivityIdsMerge &&
                                            notShowActivityIdsMerge.length
                                        ) {
                                            finalNotShowActivityIds = [
                                                ...new Set(
                                                    notShowActivityIdsMerge,
                                                ),
                                            ].map(Number);
                                        }
                                    }
                                    let orderMap: Map<number, number> = new Map(
                                        finalNotShowActivityIds.map(
                                            (id, index) => [id, index],
                                        ),
                                    );
                                    block['myActivity'].sort((a, b) => {
                                        let aIndex = orderMap.has(a.id)
                                            ? orderMap.get(a.id)
                                            : Infinity;
                                        let bIndex = orderMap.has(b.id)
                                            ? orderMap.get(b.id)
                                            : Infinity;
                                        return aIndex - bIndex;
                                    });
                                }
                                let completeActivityIds = [];
                                for (
                                    let l: number = 0;
                                    l < block['myActivity'].length;
                                    l++
                                ) {
                                    let myActivity = structuredClone(block['myActivity'][l]);
                                    if (myActivity['assignActivity']?.['startdate']) {
                                        myActivity['assignActivity']['startdate'] = await this.commonDateService.DateTimeFormat(myActivity['assignActivity']['startdate'], 'MMMM D, YYYY', 'YYYY-MM-DD HH:mm:ss')
                                    }
                                    if (myActivity['assignActivity']?.['enddate']) {
                                        myActivity['assignActivity']['enddate'] = await this.commonDateService.DateTimeFormat(myActivity['assignActivity']['enddate'], 'MMMM D, YYYY', 'YYYY-MM-DD HH:mm:ss');
                                    }
                                    myActivity['maa'] = myActivity['assignActivity'];
                                    myActivity['completeActivity'] =
                                        userCompleteActivity?.[
                                            myActivity['id']
                                        ];
                                    let activityData = JSON.parse(
                                        JSON.stringify(myActivity),
                                    );
                                    plan['plan_total_activity'] += 1;
                                    block['block_total_activity'] += 1;
                                    let activityId = myActivity['activity_id'];
                                    // myActivity['assign_block_id'] = block['assignBlock']['id'];
                                    let eCategoryId: string = '';
                                    if (myActivity['is_category'] === 1) {
                                        eCategoryId =
                                            block?.['myActivity'][k]?.[
                                                'org_activity_id'
                                            ] || '';
                                    }
                                    if (
                                        plan['assignPlan']['based_on'] == 0 ||
                                        (plan['assignPlan']['based_on'] == 1 &&
                                            plan['assignPlan']['startdate'] ===
                                                null) ||
                                        plan['assignPlan']['based_on'] == 2
                                    ) {
                                        if (!activityEndDate) {
                                            activityStartDate =
                                                await this.commonDateService.DateTimeFormat(
                                                    plan['start_date'],
                                                    'timestamp',
                                                    'MMMM D, YYYY',
                                                );
                                        } else {
                                            if (
                                                plan['assignPlan'][
                                                    'based_on'
                                                ] !== 2
                                            ) {
                                                activityStartDate =
                                                    (activityEndDate * 1000 +
                                                        24 * 60 * 60 * 1000) /
                                                    1000;
                                            }
                                        }
                                    }
                                    if (
                                        plan['assignPlan']['based_on'] == 1 &&
                                        plan['assignPlan']['startdate']
                                    ) {
                                        activityStartDate = myActivity[
                                            'assignActivity'
                                        ]['startdate']
                                            ? await this.commonDateService.DateTimeFormat(
                                                  myActivity['assignActivity'][
                                                      'startdate'
                                                  ],
                                                  'timestamp',
                                                  'MMMM D, YYYY',
                                              )
                                            : block['assignBlock']['startdate']
                                              ? await this.commonDateService.DateTimeFormat(
                                                    block['assignBlock'][
                                                        'startdate'
                                                    ],
                                                    'timestamp',
                                                    'YYYY-MM-DD HH:mm:ss',
                                                )
                                              : await this.commonDateService.DateTimeFormat(
                                                    plan['assignPlan'][
                                                        'startdate'
                                                    ],
                                                    'timestamp',
                                                    'YYYY-MM-DD HH:mm:ss',
                                                );
                                    }
                                    if ( plan['assignPlan']['based_on'] == 0 || (plan['assignPlan']['based_on'] == 1 && !plan['assignPlan']['enddate']) || (plan['assignPlan']['based_on'] == 2 && !plan['assignPlan']['enddate'])) {
                                        activityEndDate = (activityStartDate * 1000 + (Number(myActivity['days']) - 1) * 24 * 60 * 60 * 1000) / 1000;
                                    }
                                    if ([1, 2].includes(plan['assignPlan']['based_on']) && plan['assignPlan']['enddate'] !== null) {
                                        activityEndDate = myActivity['assignActivity']['enddate']
                                            ? await this.commonDateService.DateTimeFormat(
                                                  myActivity['assignActivity'][
                                                      'enddate'
                                                  ],
                                                  'timestamp',
                                                  'MMMM D, YYYY',
                                              )
                                            : block['assignBlock']['enddate']
                                              ? await this.commonDateService.DateTimeFormat(
                                                    block['assignBlock'][
                                                        'enddate'
                                                    ],
                                                    'timestamp',
                                                    'YYYY-MM-DD HH:mm:ss',
                                                )
                                              : await this.commonDateService.DateTimeFormat(
                                                    plan['assignPlan'][
                                                        'enddate'
                                                    ],
                                                    'timestamp',
                                                    'YYYY-MM-DD HH:mm:ss',
                                                );
                                    }
                                    if (plan['assignPlan']['based_on'] == 3) {
                                        let fRange =
                                            plan['assignPlan']['f_range'] || 1;
                                        let frequencyBase =
                                            plan['assignPlan'][
                                                'frequency_base'
                                            ];
                                        switch (frequencyBase) {
                                            case 0:
                                                if (index === 0) {
                                                    if (!activityEndDate) {
                                                        activityStartDate =
                                                            await this.commonDateService.DateTimeFormat(
                                                                plan[
                                                                    'start_date'
                                                                ],
                                                                'timestamp',
                                                                'MMMM D, YYYY',
                                                            );
                                                    } else {
                                                        activityStartDate =
                                                            (activityEndDate *
                                                                1000 +
                                                                24 *
                                                                    60 *
                                                                    60 *
                                                                    1000) /
                                                            1000;
                                                    }
                                                }
                                                if (index === fRange) {
                                                    activityStartDate =
                                                        (activityEndDate *
                                                            1000 +
                                                            24 *
                                                                60 *
                                                                60 *
                                                                1000) /
                                                        1000;
                                                    index = 0;
                                                }
                                                activityEndDate =
                                                    activityStartDate;
                                                break;
                                            case 1:
                                                if (index === 0) {
                                                    if (!activityEndDate) {
                                                        activityStartDate =
                                                            await this.commonDateService.DateTimeFormat(
                                                                plan[
                                                                    'start_date'
                                                                ],
                                                                'timestamp',
                                                                'MMMM D, YYYY',
                                                            );
                                                    } else {
                                                        activityStartDate =
                                                            (activityEndDate *
                                                                1000 +
                                                                24 *
                                                                    60 *
                                                                    60 *
                                                                    1000) /
                                                            1000;
                                                    }
                                                    activityEndDate =
                                                        (activityStartDate *
                                                            1000 +
                                                            6 *
                                                                24 *
                                                                60 *
                                                                60 *
                                                                1000) /
                                                        1000;
                                                }
                                                if (index === fRange) {
                                                    activityStartDate =
                                                        (activityEndDate *
                                                            1000 +
                                                            24 *
                                                                60 *
                                                                60 *
                                                                1000) /
                                                        1000;
                                                    activityEndDate =
                                                        (activityStartDate *
                                                            1000 +
                                                            6 *
                                                                24 *
                                                                60 *
                                                                60 *
                                                                1000) /
                                                        1000;
                                                    index = 0;
                                                }
                                                break;
                                            case 2:
                                                if (index === 0) {
                                                    if (!activityEndDate) {
                                                        activityStartDate =
                                                            await this.commonDateService.DateTimeFormat(
                                                                plan[
                                                                    'start_date'
                                                                ],
                                                                'timestamp',
                                                                'MMMM D, YYYY',
                                                            );
                                                    } else {
                                                        activityStartDate =
                                                            (activityEndDate *
                                                                1000 +
                                                                24 *
                                                                    60 *
                                                                    60 *
                                                                    1000) /
                                                            1000;
                                                    }
                                                    let oneMonthInc: Date =
                                                        new Date(
                                                            activityStartDate *
                                                                1000,
                                                        );
                                                    oneMonthInc.setMonth(
                                                        oneMonthInc.getMonth() +
                                                            1,
                                                    );
                                                    let oneMonthTime =
                                                        await this.commonDateService.DateTimeFormat(
                                                            oneMonthInc,
                                                            'timestamp',
                                                        );
                                                    activityEndDate =
                                                        (oneMonthTime * 1000 -
                                                            24 *
                                                                60 *
                                                                60 *
                                                                1000) /
                                                        1000;
                                                }
                                                if (index === fRange) {
                                                    activityStartDate =
                                                        (activityEndDate *
                                                            1000 +
                                                            24 *
                                                                60 *
                                                                60 *
                                                                1000) /
                                                        1000;
                                                    let oneMonthInc: Date =
                                                        new Date(
                                                            activityStartDate *
                                                                1000,
                                                        );
                                                    oneMonthInc.setMonth(
                                                        oneMonthInc.getMonth() +
                                                            1,
                                                    );
                                                    let oneMonthTime =
                                                        await this.commonDateService.DateTimeFormat(
                                                            oneMonthInc,
                                                            'timestamp',
                                                        );
                                                    activityEndDate =
                                                        (oneMonthTime * 1000 -
                                                            24 *
                                                                60 *
                                                                60 *
                                                                1000) /
                                                        1000;
                                                    index = 0;
                                                }
                                                break;
                                            case 3:
                                                if (index === 0) {
                                                    if (!activityEndDate) {
                                                        activityStartDate =
                                                            await this.commonDateService.DateTimeFormat(
                                                                plan[
                                                                    'start_date'
                                                                ],
                                                                'timestamp',
                                                                'MMMM D, YYYY',
                                                            );
                                                    } else {
                                                        activityStartDate =
                                                            (activityEndDate *
                                                                1000 +
                                                                24 *
                                                                    60 *
                                                                    60 *
                                                                    1000) /
                                                            1000;
                                                    }
                                                    let fourMonthInc: Date =
                                                        new Date(
                                                            activityStartDate *
                                                                1000,
                                                        );
                                                    fourMonthInc.setMonth(
                                                        fourMonthInc.getMonth() +
                                                            4,
                                                    );
                                                    let fourMonthTime =
                                                        await this.commonDateService.DateTimeFormat(
                                                            fourMonthInc,
                                                            'timestamp',
                                                        );
                                                    activityEndDate =
                                                        (fourMonthTime * 1000 -
                                                            24 *
                                                                60 *
                                                                60 *
                                                                1000) /
                                                        1000;
                                                }
                                                if (index === fRange) {
                                                    activityStartDate =
                                                        (activityEndDate *
                                                            1000 +
                                                            24 *
                                                                60 *
                                                                60 *
                                                                1000) /
                                                        1000;
                                                    let fourMonthInc: Date =
                                                        new Date(
                                                            activityStartDate *
                                                                1000,
                                                        );
                                                    fourMonthInc.setMonth(
                                                        fourMonthInc.getMonth() +
                                                            4,
                                                    );
                                                    let fourMonthTime =
                                                        await this.commonDateService.DateTimeFormat(
                                                            fourMonthInc,
                                                            'timestamp',
                                                        );
                                                    activityEndDate =
                                                        (fourMonthTime * 1000 -
                                                            24 *
                                                                60 *
                                                                60 *
                                                                1000) /
                                                        1000;
                                                    index = 0;
                                                }
                                                break;
                                            case 4:
                                                if (index === 0) {
                                                    if (!activityEndDate) {
                                                        activityStartDate =
                                                            await this.commonDateService.DateTimeFormat(
                                                                plan[
                                                                    'start_date'
                                                                ],
                                                                'timestamp',
                                                                'MMMM D, YYYY',
                                                            );
                                                    } else {
                                                        activityStartDate =
                                                            (activityEndDate *
                                                                1000 +
                                                                24 *
                                                                    60 *
                                                                    60 *
                                                                    1000) /
                                                            1000;
                                                    }
                                                    let oneYearsInc: Date =
                                                        new Date(
                                                            activityStartDate *
                                                                1000,
                                                        );
                                                    oneYearsInc.setFullYear(
                                                        oneYearsInc.getFullYear() +
                                                            1,
                                                    );
                                                    let oneYearsTime =
                                                        await this.commonDateService.DateTimeFormat(
                                                            oneYearsInc,
                                                            'timestamp',
                                                        );
                                                    activityEndDate =
                                                        (oneYearsTime * 1000 -
                                                            24 *
                                                                60 *
                                                                60 *
                                                                1000) /
                                                        1000;
                                                }
                                                if (index === fRange) {
                                                    activityStartDate =
                                                        (activityEndDate *
                                                            1000 +
                                                            24 *
                                                                60 *
                                                                60 *
                                                                1000) /
                                                        1000;
                                                    let oneYearsInc: Date =
                                                        new Date(
                                                            activityStartDate *
                                                                1000,
                                                        );
                                                    oneYearsInc.setFullYear(
                                                        oneYearsInc.getFullYear() +
                                                            1,
                                                    );
                                                    let oneYearsTime =
                                                        await this.commonDateService.DateTimeFormat(
                                                            oneYearsInc,
                                                            'timestamp',
                                                        );
                                                    activityEndDate =
                                                        (oneYearsTime * 1000 -
                                                            24 *
                                                                60 *
                                                                60 *
                                                                1000) /
                                                        1000;
                                                    index = 0;
                                                }
                                                break;
                                        }
                                    }
                                    index++;
                                    myActivity['start_date'] =
                                        await this.commonDateService.DateTimeFormat(
                                            activityStartDate,
                                            'tstodate',
                                            'YYYY-MM-DD HH:mm:ss',
                                        );
                                    myActivity['end_date'] =
                                        `${await this.commonDateService.DateTimeFormat(activityEndDate, 'tstodate', 'YYYY-MM-DD')} 23:59:59`;
                                    block['end_date'] =
                                        `${await this.commonDateService.DateTimeFormat(activityEndDate, 'tstodate', 'YYYY-MM-DD')} 23:59:59`;
                                    activityEndDate = blockEndDate =
                                        await this.commonDateService.DateTimeFormat(
                                            new Date(
                                                `${await this.commonDateService.DateTimeFormat(activityEndDate, 'tstodate', 'YYYY-MM-DD')} 23:59:59`,
                                            ),
                                            'timestamp',
                                            'YYYY-MM-DD HH:mm:ss',
                                        );
                                    let eventAllActivityIds = new Map<
                                        number,
                                        number
                                    >();
                                    myActivity['activity'] =
                                        myActivity['activity'] || {};
                                    if (activityId == -1) {
                                        let tmpNameSettingCategory: number;
                                        let moduleId = myActivity['module_id'];
                                        switch (moduleId) {
                                            case 1:
                                                tmpNameSettingCategory = 21;
                                                let orgActivityID = (
                                                    block?.['myActivity'][k]?.[
                                                        'org_activity_id'
                                                    ] || ''
                                                ).split(',');
                                                let eventsList: EventEntity =
                                                    eventsListIdWise.get(
                                                        myActivity[
                                                            'org_activity_id'
                                                        ],
                                                    );
                                                if (eventsList?.['id']) {
                                                    myActivity['activity'][
                                                        'id'
                                                    ] = activityId =
                                                        eventsList[
                                                            'activity_id'
                                                        ];
                                                } else {
                                                    myActivity['Events'] = [];
                                                    for (
                                                        let i: number = 0;
                                                        i <
                                                        orgActivityID.length;
                                                        i++
                                                    ) {
                                                        const key =
                                                            orgActivityID[i];
                                                        const item: EventEntity =
                                                            eventsListIdWise.get(
                                                                key,
                                                            );
                                                        myActivity['Events'].push(item)
                                                        if (item) {
                                                            eventAllActivityIds.set(
                                                                item.activity_id,
                                                                item.id,
                                                            );
                                                        }
                                                    }
                                                }
                                                break;
                                            case 2:
                                                /*TODO: varify functionality */
                                                if (
                                                    emotionalResultDataEha[
                                                        'result_detail'
                                                    ][
                                                        myActivity[
                                                            'org_activity_id'
                                                        ]
                                                    ]
                                                ) {
                                                    tmpNameSettingCategory = -1;
                                                }
                                                break;
                                            case 3:
                                                if (
                                                    myActivity['acAge']?.['id']
                                                ) {
                                                    myActivity['activity'][
                                                        'id'
                                                    ] = activityId =
                                                        myActivity[
                                                            'org_activity_id'
                                                        ];
                                                    activityData = {
                                                        ...activityData,
                                                        type: 2,
                                                        s_range: 0.99,
                                                    };
                                                    tmpNameSettingCategory = 20;
                                                }
                                                break;
                                            case 4:
                                                let scheduleChallenge: ScheduleChallengeEntity =
                                                    scheduleChallengeIdWise.get(
                                                        myActivity[
                                                            'org_activity_id'
                                                        ],
                                                    );
                                                if (scheduleChallenge?.['id']) {
                                                    tmpNameSettingCategory = 8;
                                                }
                                                break;
                                            case 5:
                                                let quickLink: QuickLinkEntity =
                                                    quickLinkListIdWise.get(
                                                        myActivity[
                                                            'org_activity_id'
                                                        ],
                                                    );
                                                if (quickLink?.['id']) {
                                                    tmpNameSettingCategory = 43;
                                                    myActivity['activity'][
                                                        'id'
                                                    ] = activityId =
                                                        quickLink[
                                                            'activity_id'
                                                        ];
                                                }
                                                break;
                                            case 6:
                                                let qzQuiz: QuizInAssignQuizOrgInterface =
                                                    qzQuizListIdWise.get(
                                                        myActivity[
                                                            'org_activity_id'
                                                        ],
                                                    );
                                                if (qzQuiz?.['id']) {
                                                    tmpNameSettingCategory = 36;
                                                    myActivity['activity'][
                                                        'id'
                                                    ] = activityId =
                                                        qzQuiz['assignQuizOrg'][
                                                            'activity_id'
                                                        ];
                                                }
                                                break;
                                            case 7:
                                                tmpNameSettingCategory = -2;
                                                break;
                                            case 8:
                                                tmpNameSettingCategory = -3;
                                                break;
                                            case 9:
                                                tmpNameSettingCategory = 75;
                                                myActivity['activity']['id'] =
                                                    activityId = 5905;
                                                myActivity['post_id'] =
                                                    myActivity[
                                                        'org_activity_id'
                                                    ];
                                                if (
                                                    myActivity[
                                                        'org_activity_id'
                                                    ] == 0
                                                ) {
                                                    let ecvCategoryId = [
                                                        myActivity[
                                                            'wellbeing_category_id'
                                                        ],
                                                    ];
                                                    if (!ecvCategoryId) {
                                                        ecvCategoryId =
                                                            await this.wellBeingCategoryService.getAll(
                                                                {
                                                                    org_id: In([
                                                                        ...[0],
                                                                        ...[
                                                                            reportData?.org_id,
                                                                        ],
                                                                    ]),
                                                                    status: 1,
                                                                },
                                                                ['id'],
                                                            );
                                                        if (
                                                            ecvCategoryId.length !==
                                                            0
                                                        ) {
                                                            ecvCategoryId =
                                                                ecvCategoryId.map(
                                                                    (cat) =>
                                                                        cat.id,
                                                                );
                                                        } else {
                                                            ecvCategoryId = [];
                                                        }
                                                    }
                                                    if (
                                                        ecvCategoryId.length > 0
                                                    ) {
                                                        const wellBeingCategoryWhere =
                                                            {
                                                                status: 1,
                                                                org_id: Raw(
                                                                    (alias) =>
                                                                        `${alias} = '0' OR ${alias} = :orgId`,
                                                                    {
                                                                        orgId: reportData?.org_id,
                                                                    },
                                                                ),
                                                                parent_id: Raw(
                                                                    (alias) =>
                                                                        `(${alias} IN (:...ids) OR id IN (:...ids))`,
                                                                    {
                                                                        ids: ecvCategoryId,
                                                                    },
                                                                ),
                                                            };
                                                        let eventsCategoryList: EmotionalWellBeingCategoryEntity[] =
                                                            await this.wellBeingCategoryService.getAll(
                                                                wellBeingCategoryWhere,
                                                                ['id'],
                                                            );
                                                        if (
                                                            eventsCategoryList.length >
                                                            0
                                                        ) {
                                                            let vCategory: number[] =
                                                                eventsCategoryList.map(
                                                                    (event) =>
                                                                        event.id,
                                                                );
                                                            let eventsCategoryPostList: EmotionalWellBeingPostEntity[] =
                                                                await this.wellBeingPostService.getAll(
                                                                    {
                                                                        cat_id: In(
                                                                            vCategory,
                                                                        ),
                                                                        status: 1,
                                                                    },
                                                                    ['id'],
                                                                );
                                                            if (
                                                                eventsCategoryPostList.length >
                                                                0
                                                            ) {
                                                                let vPostIds: number[] =
                                                                    eventsCategoryPostList.map(
                                                                        (
                                                                            event,
                                                                        ) =>
                                                                            event.id,
                                                                    );
                                                                let eventsCategoryPostClickList: number =
                                                                    await this.wellBeingPostClickService.getCount(
                                                                        {
                                                                            user_id:
                                                                                user?.id,
                                                                            post_id:
                                                                                In(
                                                                                    vPostIds,
                                                                                ),
                                                                            status: 1,
                                                                        },
                                                                    );
                                                                if (
                                                                    eventsCategoryPostClickList >
                                                                    0
                                                                ) {
                                                                    activityData =
                                                                        {
                                                                            ...activityData,
                                                                            type: 2,
                                                                            s_range: 0.99,
                                                                        };
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                                break;
                                        }
                                        myActivity['activity']['category_id'] =
                                            tmpNameSettingCategory;
                                    } else {
                                        let categoryId: number = Number(
                                            myActivity['activity'][
                                                'category_id'
                                            ],
                                        );
                                        if (categoryId) {
                                            if (
                                                [21, 20, 8, 43, 36].includes(
                                                    categoryId,
                                                )
                                            ) {
                                                let categoryIdArray = {
                                                    '21': 1,
                                                    '20': 3,
                                                    '8': 4,
                                                    '43': 5,
                                                    '36': 6,
                                                };
                                                myActivity['module_id'] =
                                                    categoryIdArray[categoryId];
                                            }
                                        } else {
                                            myActivity['activity'][
                                                'category_id'
                                            ] = 0;
                                        }
                                    }
                                    let categoryId: number =
                                        Number(
                                            myActivity['activity'][
                                                'category_id'
                                            ],
                                        ) || 0;
                                    if (myActivity['completeActivity'] || (block['completeBlock'] && block['completeBlock']['activity_detail_data'] && block['completeBlock']['activity_detail_data']?.[myActivity['id']] && block['completeBlock']['status'] === 1)) {
                                        let activityType = activityData['type'];
                                        let activityId =
                                            myActivity['activity']['id'];
                                        if (
                                            activityType === 3 &&
                                            activityId === 7717 &&
                                            myActivity['completeActivity']
                                        ) {
                                            myActivity['custom_completion'] = 1;
                                            let completionStatus =
                                                myActivity['completeActivity'][
                                                    'status'
                                                ];
                                            if (
                                                completionStatus !==
                                                    undefined &&
                                                completionStatus === 1
                                            ) {
                                                if (
                                                    !finalNotShowActivityIds.includes(
                                                        myActivity['id'],
                                                    )
                                                ) {
                                                    block[
                                                        'block_complete_activity'
                                                    ] += 1;
                                                    plan[
                                                        'plan_complete_activity'
                                                    ] += 1;
                                                }
                                            }
                                        } else {
                                            if (
                                                !finalNotShowActivityIds.includes(
                                                    myActivity['id'],
                                                )
                                            ) {
                                                block[
                                                    'block_complete_activity'
                                                ] += 1;
                                                plan[
                                                    'plan_complete_activity'
                                                ] += 1;
                                            }
                                        }
                                        myActivity['completeper'] = 0;
                                        if (myActivity['completeActivity']) {
                                            block['activity_detail'] = block['activity_detail'] || {};
                                            block['activity_detail'][myActivity['id']] = block['activity_detail'][myActivity['id']] || {};
                                            block['activity_detail'][myActivity['id']]['log_date'] = await this.commonDateService.DateTimeFormat(myActivity['completeActivity']['created'],'YYYY-MM-DD', 'YYYY-MM-DD HH:mm:ss');
                                            myActivity['completeper'] = 100;
                                        } else if (block['completeBlock']['activity_detail_data']?.[myActivity['id']]?.hasOwnProperty("log_date")) {
                                            myActivity['completeper'] = 100;
                                        }
                                        if (myActivity['completeper']) {
                                            completeActivityIds.push(
                                                myActivity['id'],
                                            );
                                        }
                                    } else {
                                        let bioMetricAssessment: biometricInterface[] =
                                            bioMetricAssessmentResult.get(
                                                userId,
                                            );
                                        let hraAssessment: AssessmentsEntity[] =
                                            hraAssessmentResult.get(userId);
                                        /* TODO: totalDate check if its not use then remove var and common health function code */
                                        let totalAccount: number = 0;
                                        let totalDate = '';
                                        if (
                                            myActivity['module_id'] === 9 &&
                                            myActivity['org_activity_id'] ==
                                                '0' &&
                                            activityData['type'] === 2 &&
                                            activityData['s_range'] === 0.99
                                        ) {
                                            totalAccount = 1;
                                        }
                                        let TrBiometricsData: number = 0;
                                        if (
                                            userAllActivity['biometrics']?.[
                                                activityId
                                            ]
                                        ) {
                                            let trBiometricsActivityDone =
                                                userAllActivity['biometrics'][
                                                    activityId
                                                ];
                                            trBiometricsActivityDone =
                                                await this.commonHealthService.countActData(
                                                    trBiometricsActivityDone,
                                                    activityStartDate,
                                                    activityEndDate,
                                                    myActivity,
                                                );
                                            totalDate = trBiometricsActivityDone['date'];
                                            totalAccount =
                                                trBiometricsActivityDone[
                                                    'total_account'
                                                ];
                                            TrBiometricsData = 1;
                                        }
                                        if (
                                            [
                                                7, 9, 11, 15, 16, 17, 18, 24,
                                            ].includes(activityId)
                                        ) {
                                            if (
                                                myActivity['frequency_base'] !=
                                                4
                                            ) {
                                                if (
                                                    [11, 15].includes(
                                                        activityId,
                                                    )
                                                ) {
                                                    let trackerActivityDone =
                                                        [];
                                                    if (
                                                        userAllActivity[
                                                            activityId
                                                        ]
                                                    ) {
                                                        trackerActivityDone =
                                                            userAllActivity[
                                                                activityId
                                                            ];
                                                    }
                                                    if (
                                                        activityId === 15 &&
                                                        userAllActivity[11] &&
                                                        Object.keys(
                                                            userAllActivity[11],
                                                        ).length > 0
                                                    ) {
                                                        trackerActivityDone = [
                                                            ...trackerActivityDone,
                                                            ...userAllActivity[11],
                                                        ];
                                                    }
                                                    if (
                                                        activityId === 11 &&
                                                        userAllActivity[15] &&
                                                        Object.keys(
                                                            userAllActivity[15],
                                                        ).length > 0
                                                    ) {
                                                        trackerActivityDone = [
                                                            ...trackerActivityDone,
                                                            ...userAllActivity[15],
                                                        ];
                                                    }
                                                    if (
                                                        trackerActivityDone?.length >
                                                        0
                                                    ) {
                                                        if (
                                                            myActivity[
                                                                'f_type'
                                                            ] === 2
                                                        ) {
                                                            if (
                                                                activityData[
                                                                    'f_range'
                                                                ] > 0
                                                            ) {
                                                                activityData[
                                                                    'f_range'
                                                                ] =
                                                                    activityData[
                                                                        'f_range'
                                                                    ] - 1;
                                                            }
                                                        }
                                                        let totalCountAct;
                                                        if (
                                                            myActivity[
                                                                'frequency_base'
                                                            ] === 0
                                                        ) {
                                                            activityData[
                                                                'type'
                                                            ] = 2;
                                                            activityData[
                                                                's_range'
                                                            ] =
                                                                activityData[
                                                                    'f_range'
                                                                ];
                                                            totalCountAct =
                                                                await this.commonDateService.countActDataStep(
                                                                    trackerActivityDone,
                                                                    activityStartDate,
                                                                    activityEndDate,
                                                                    'steps',
                                                                    'ft_activity_feeds',
                                                                    myActivity,
                                                                );
                                                        } else {
                                                            let dateDiff =
                                                                Math.floor(
                                                                    (activityEndDate -
                                                                        activityStartDate) /
                                                                        (60 *
                                                                            60 *
                                                                            24),
                                                                );
                                                            let totalDays =
                                                                ++dateDiff;
                                                            activityData[
                                                                'type'
                                                            ] = 2;
                                                            activityData[
                                                                's_range'
                                                            ] = totalDays;
                                                            totalCountAct =
                                                                await this.commonDateService.countActDataStepFrequency(
                                                                    trackerActivityDone,
                                                                    activityStartDate,
                                                                    activityEndDate,
                                                                    'steps',
                                                                    'ft_activity_feeds',
                                                                    myActivity,
                                                                    totalDays,
                                                                );
                                                            if (
                                                                totalCountAct[
                                                                    'total_account'
                                                                ] == totalDays
                                                            ) {
                                                                totalCountAct[
                                                                    'total_account'
                                                                ]++;
                                                            }
                                                        }
                                                        totalDate = totalCountAct['date'];
                                                        totalAccount =
                                                            totalCountAct[
                                                                'total_account'
                                                            ];
                                                    }
                                                } else {
                                                    if (
                                                        userAllActivity[
                                                            activityId
                                                        ] &&
                                                        Object.keys(
                                                            userAllActivity[
                                                                activityId
                                                            ],
                                                        ).length > 0
                                                    ) {
                                                        let stepActivityDone =
                                                            userAllActivity[
                                                                activityId
                                                            ];
                                                        let totalCountAct =
                                                            await this.commonDateService.countActDataStep(
                                                                stepActivityDone,
                                                                activityStartDate,
                                                                activityEndDate,
                                                                'steps',
                                                                'ft_activity_feeds',
                                                                myActivity,
                                                            );
                                                        activityData['type'] =
                                                            2;
                                                        activityData[
                                                            's_range'
                                                        ] =
                                                            activityData[
                                                                'f_range'
                                                            ];
                                                        totalDate = totalCountAct['date'];
                                                        totalAccount =
                                                            totalCountAct[
                                                                'total_account'
                                                            ];
                                                    }
                                                }
                                            }
                                        } else if (
                                            biometricSourceBasedActivities.includes(
                                                activityId,
                                            )
                                        ) {
                                            if (activityData['type'] != 3) {
                                                if (
                                                    userBiometricsActivityArray.includes(
                                                        activityId,
                                                    )
                                                ) {
                                                    if (
                                                        userAllActivity?.[
                                                            'user_biometrics'
                                                        ]?.length > 0
                                                    ) {
                                                        let userBiometricsActivityDone =
                                                            userAllActivity[
                                                                'user_biometrics'
                                                            ];
                                                        let field;
                                                        let fieldsByActivityId =
                                                            {
                                                                51: 'bmi',
                                                                52: 'total_cholesterol',
                                                                53: 'hdl',
                                                                54: 'ldl',
                                                                55: 'triglycerides',
                                                                56: 'blood_glucose',
                                                                57: 'systolic',
                                                            };
                                                        field =
                                                            fieldsByActivityId[
                                                                activityId
                                                            ] || null;
                                                        let getPlanActivity =
                                                            await this.commonHealthService.getPlanActivityData(
                                                                userBiometricsActivityDone,
                                                                activityStartDate,
                                                                activityEndDate,
                                                                field,
                                                                'bio',
                                                                myActivity,
                                                            );
                                                        totalDate = getPlanActivity['date'];
                                                        totalAccount =
                                                            getPlanActivity[
                                                                'total_account'
                                                            ];
                                                    }
                                                } else if (
                                                    adminBiometricsActivityArray.includes(
                                                        activityId,
                                                    )
                                                ) {
                                                    if (
                                                        userAllActivity?.[
                                                            'admin_biometrics'
                                                        ]?.length > 0
                                                    ) {
                                                        let adminBiometricsActivityDone =
                                                            userAllActivity[
                                                                'admin_biometrics'
                                                            ];
                                                        let fieldMappings = {
                                                            33: 'bmi',
                                                            34: 'total_cholesterol',
                                                            35: 'hdl',
                                                            36: 'ldl',
                                                            37: 'triglycerides',
                                                            38: 'blood_glucose',
                                                            39: 'systolic',
                                                        };
                                                        let field =
                                                            fieldMappings[
                                                                activityId
                                                            ] || null;
                                                        if (field) {
                                                            let getPlanActivity =
                                                                await this.commonHealthService.getPlanActivityData(
                                                                    adminBiometricsActivityDone,
                                                                    activityStartDate,
                                                                    activityEndDate,
                                                                    field,
                                                                    'bio',
                                                                    myActivity,
                                                                );
                                                            totalDate = getPlanActivity['date'];
                                                            totalAccount =
                                                                getPlanActivity[
                                                                    'total_account'
                                                                ];
                                                        }
                                                    }
                                                } else if (
                                                    physicianBiometricsActivityArray.includes(
                                                        activityId,
                                                    )
                                                ) {
                                                    if (
                                                        userAllActivity?.[
                                                            'physician_biometrics'
                                                        ]?.length > 0
                                                    ) {
                                                        let pbActivityDone =
                                                            userAllActivity[
                                                                'physician_biometrics'
                                                            ];
                                                        let field;
                                                        const fieldsByActivityId =
                                                            {
                                                                42: 'bmi',
                                                                43: 'total_cholesterol',
                                                                44: 'hdl',
                                                                45: 'ldl',
                                                                46: 'triglycerides',
                                                                47: 'blood_glucose',
                                                                48: 'systolic',
                                                                3811: 'waist',
                                                            };
                                                        field =
                                                            fieldsByActivityId[
                                                                activityId
                                                            ] || null;
                                                        let getPlanActivity =
                                                            await this.commonHealthService.getPlanActivityData(
                                                                pbActivityDone,
                                                                activityStartDate,
                                                                activityEndDate,
                                                                field,
                                                                'bio',
                                                                myActivity,
                                                            );
                                                        totalDate = getPlanActivity['date'];
                                                        totalAccount =
                                                            getPlanActivity[
                                                                'total_account'
                                                            ];
                                                    }
                                                }
                                            }
                                        } else if (
                                            activityId == 10 &&
                                            myActivity['wtype'] == 0
                                        ) {
                                            if (activityData['type'] !== 3) {
                                                if (
                                                    userAllActivity[activityId]
                                                ) {
                                                    let waterActivityDone =
                                                        userAllActivity[
                                                            activityId
                                                        ];
                                                    if (myActivity.wtypeunit === 1) {
                                                        let sRange: number = activityData['s_range'] * 8;
                                                        let eRange: number = activityData['e_range'] * 8;
                                                        activityData['s_range'] = sRange;
                                                        activityData['e_range'] = eRange;
                                                        myActivity['s_range'] = sRange;
                                                        myActivity['e_range'] = eRange
                                                    }
                                                    if (myActivity.wtypeunit === 2) {
                                                        let sRange: number = activityData['s_range'] * 0.033814;
                                                        let eRange: number = activityData['e_range'] * 0.033814;
                                                        activityData['s_range'] = sRange;
                                                        activityData['e_range'] = eRange;
                                                        myActivity['s_range'] = sRange;
                                                        myActivity['e_range'] = eRange;
                                                    }
                                                    let countActData =
                                                        await this.commonDateService.countActDataStep(
                                                            waterActivityDone,
                                                            activityStartDate,
                                                            activityEndDate,
                                                            'waters',
                                                            null,
                                                            myActivity,
                                                        );
                                                    totalDate = countActData['date'];
                                                    totalAccount =
                                                        countActData[
                                                            'total_account'
                                                        ];
                                                }
                                            }
                                        } else if (activityId == 5905) {
                                            if (activityData['type'] !== 1) {
                                                if (
                                                    userAllActivity?.[
                                                        activityId
                                                    ] &&
                                                    userAllActivity?.[
                                                        activityId
                                                    ]?.[myActivity['post_id']]
                                                ) {
                                                    let ewbActivityDone =
                                                        userAllActivity[
                                                            activityId
                                                        ][
                                                            myActivity[
                                                                'post_id'
                                                            ]
                                                        ];
                                                    let countActData =
                                                        await this.commonHealthService.countActData(
                                                            ewbActivityDone,
                                                            activityStartDate,
                                                            activityEndDate,
                                                            myActivity,
                                                        );
                                                    totalDate = countActData['date'];
                                                    totalAccount =
                                                        countActData[
                                                            'total_account'
                                                        ];
                                                    activityData = {
                                                        ...activityData,
                                                        type: 2,
                                                        s_range: 0.99,
                                                    };
                                                }
                                            }
                                        } else if (activityId == 4887) {
                                            if (activityData['type'] !== 1) {
                                                if (
                                                    (myActivity.fpost_id == null && userAllActivity?.['A-4887']) ||
                                                    (userAllActivity?.[activityId] && userAllActivity?.[activityId][myActivity.fpost_id])
                                                ) {
                                                    let fvActivityDone =
                                                        myActivity.fpost_id ==
                                                        null
                                                            ? userAllActivity[
                                                                  'A-4887'
                                                              ]
                                                            : userAllActivity[
                                                                  activityId
                                                              ][
                                                                  myActivity
                                                                      .fpost_id
                                                              ];
                                                    let countActData =
                                                        await this.commonHealthService.countActData(
                                                            fvActivityDone,
                                                            activityStartDate,
                                                            activityEndDate,
                                                            myActivity,
                                                        );
                                                    totalDate = countActData['date'];
                                                    totalAccount =
                                                        countActData[
                                                            'total_account'
                                                        ];
                                                    activityData = {
                                                        ...activityData,
                                                        type: 2,
                                                        s_range: 0.99,
                                                    };
                                                }
                                            }
                                        } else if (
                                            bodyFeedActivities.includes(
                                                activityId,
                                            )
                                        ) {
                                            if (activityData['type'] !== 3) {
                                                if (
                                                    userAllActivity?.[
                                                        'body_feeds'
                                                    ]?.length > 0
                                                ) {
                                                    let bfActivityDone =
                                                        userAllActivity[
                                                            'body_feeds'
                                                        ];
                                                    let field = null;
                                                    let activityFieldMap = {
                                                        21: 'weight',
                                                        22: 'waist',
                                                        23: 'body_fat',
                                                        25: 'calve',
                                                        26: 'chest',
                                                        27: 'arm',
                                                        28: 'hip',
                                                        30: 'leg',
                                                    };
                                                    if (
                                                        activityFieldMap.hasOwnProperty(
                                                            activityId,
                                                        )
                                                    ) {
                                                        field =
                                                            activityFieldMap[
                                                                activityId
                                                            ];
                                                        if (activityId === 21) {
                                                            bfActivityDone =
                                                                bfActivityDone.reverse();
                                                        }
                                                    }
                                                    let totalAccountData =
                                                        await this.commonHealthService.getPlanActivityData(
                                                            bfActivityDone,
                                                            activityStartDate,
                                                            activityEndDate,
                                                            field,
                                                            'bio',
                                                            myActivity,
                                                        );
                                                    totalDate = totalAccountData['date'];
                                                    totalAccount =
                                                        totalAccountData[
                                                            'total_account'
                                                        ];
                                                }
                                            }
                                        } else if (activityId == 4) {
                                            if (activityData['type'] !== 2) {
                                                let tbActivityDone = [];
                                                if (userAllActivity[12]) {
                                                    tbActivityDone = [
                                                        ...tbActivityDone,
                                                        ...userAllActivity[12],
                                                    ];
                                                }
                                                if (userAllActivity[13]) {
                                                    tbActivityDone = [
                                                        ...tbActivityDone,
                                                        ...userAllActivity[13],
                                                    ];
                                                }
                                                if (userAllActivity[14]) {
                                                    tbActivityDone = [
                                                        ...tbActivityDone,
                                                        ...userAllActivity[14],
                                                    ];
                                                }
                                                if (tbActivityDone.length > 0) {
                                                    let countActData =
                                                        await this.commonHealthService.countActData(
                                                            tbActivityDone,
                                                            activityStartDate,
                                                            activityEndDate,
                                                            myActivity,
                                                        );
                                                    totalAccount =
                                                        countActData[
                                                            'total_account'
                                                        ];
                                                    totalDate = countActData['date'];
                                                    if (
                                                        activityData[
                                                            's_range'
                                                        ] === 0
                                                    ) {
                                                        activityData = {
                                                            ...activityData,
                                                            type: 2,
                                                            s_range: 0.99,
                                                        };
                                                    }
                                                }
                                            }
                                        } else if (
                                            categoryId == 21 &&
                                            activityData['type'] != 2
                                        ) {
                                            if (
                                                myActivity['is_category'] == 1
                                            ) {
                                                let eCategoryIdArray =
                                                    eCategoryId
                                                        .replace(/EVC/g, '')
                                                        .split(',')
                                                        .filter(Boolean)
                                                        .map(Number);
                                                let eventCategoryId: number;
                                                if (
                                                    eCategoryIdArray.length ===
                                                    1
                                                ) {
                                                    eventCategoryId =
                                                        eCategoryIdArray[0];
                                                }
                                                if (
                                                    !Array.isArray(
                                                        eventCategoryId,
                                                    ) &&
                                                    userAllActivity?.[
                                                        'events_category'
                                                    ]?.[eventCategoryId]
                                                ) {
                                                    let evActivityDone =
                                                        await this.commonDateService.countActDataEvent(
                                                            userAllActivity[
                                                                'events_category'
                                                            ][eventCategoryId],
                                                            activityStartDate,
                                                            activityEndDate,
                                                            myActivity,
                                                        );
                                                    totalAccount =
                                                        evActivityDone[
                                                            'total_account'
                                                        ];
                                                    totalDate = evActivityDone['date'];
                                                    activityData['type'] = 2;
                                                    activityData['s_range'] =
                                                        myActivity[
                                                            'grater_than'
                                                        ];
                                                    if (
                                                        myActivity[
                                                            'grater_than'
                                                        ] >= 1 &&
                                                        totalAccount <
                                                            myActivity[
                                                                'grater_than'
                                                            ] +
                                                                1
                                                    ) {
                                                        totalAccount = 0;
                                                        totalDate = '';
                                                    }
                                                } else {
                                                    for (
                                                        let i: number = 0;
                                                        i <
                                                        eCategoryIdArray.length;
                                                        i++
                                                    ) {
                                                        const value: number =
                                                            eCategoryIdArray[i];
                                                        if (
                                                            userAllActivity?.[
                                                                'events_category'
                                                            ]?.[value]
                                                        ) {
                                                            let evActivityDone =
                                                                await this.commonDateService.countActDataEvent(
                                                                    userAllActivity[
                                                                        'events_category'
                                                                    ][value],
                                                                    activityStartDate,
                                                                    activityEndDate,
                                                                    myActivity,
                                                                );
                                                            if (
                                                                evActivityDone[
                                                                    'total_account'
                                                                ] !== 0 &&
                                                                evActivityDone[
                                                                    'date'
                                                                ] !== ''
                                                            ) {
                                                                totalAccount +=
                                                                    evActivityDone[
                                                                        'total_account'
                                                                    ];
                                                                totalDate = evActivityDone['date'];
                                                            }
                                                        }
                                                    }
                                                    activityData['type'] = 2;
                                                    activityData['s_range'] =
                                                        myActivity[
                                                            'grater_than'
                                                        ];
                                                    if (
                                                        myActivity[
                                                            'grater_than'
                                                        ] >= 1 &&
                                                        totalAccount <
                                                            myActivity[
                                                                'grater_than'
                                                            ] +
                                                                1
                                                    ) {
                                                        totalAccount = 0;
                                                        totalDate = '';
                                                    }
                                                }
                                            } else {
                                                let activityIdSplit = (
                                                    block?.['myActivity'][k]?.[
                                                        'org_activity_id'
                                                    ] || ''
                                                ).split(',');
                                                if (activityIdSplit.length > 1) {
                                                    if ([...eventAllActivityIds.keys()].some((k) => userAllActivity?.['events']?.[k]?.length > 0)) {
                                                        let MEventIds = Object.keys(userAllActivity['events']).find((k) => eventAllActivityIds.get(Number(k)) !== undefined);
                                                        let eventsActivityDone =
                                                            await this.commonDateService.countActDataEvent(
                                                                userAllActivity[
                                                                    'events'
                                                                ][MEventIds],
                                                                activityStartDate,
                                                                activityEndDate,
                                                                myActivity,
                                                            );
                                                        totalAccount =
                                                            eventsActivityDone[
                                                                'total_account'
                                                            ];
                                                        totalDate = eventsActivityDone['date'];
                                                        activityData['type'] =
                                                            2;
                                                        activityData[
                                                            's_range'
                                                        ] =
                                                            myActivity[
                                                                'grater_than'
                                                            ];
                                                        if (
                                                            myActivity[
                                                                'grater_than'
                                                            ] >= 1 &&
                                                            totalAccount <
                                                                myActivity[
                                                                    'grater_than'
                                                                ] +
                                                                    1
                                                        ) {
                                                            totalAccount = 0;
                                                            totalDate = '';
                                                        }
                                                    }
                                                } else {
                                                    if (
                                                        userAllActivity?.[
                                                            'events'
                                                        ]?.[activityId]
                                                    ) {
                                                        let eventActivityDone =
                                                            await this.commonDateService.countActDataEvent(
                                                                userAllActivity[
                                                                    'events'
                                                                ][activityId],
                                                                activityStartDate,
                                                                activityEndDate,
                                                                myActivity,
                                                            );
                                                        totalAccount =
                                                            eventActivityDone[
                                                                'total_account'
                                                            ];
                                                        totalDate = eventActivityDone['date'];
                                                        activityData['type'] =
                                                            2;
                                                        activityData[
                                                            's_range'
                                                        ] =
                                                            myActivity[
                                                                'grater_than'
                                                            ];
                                                        if (
                                                            myActivity[
                                                                'grater_than'
                                                            ] >= 1 &&
                                                            totalAccount <
                                                                myActivity[
                                                                    'grater_than'
                                                                ] +
                                                                    1
                                                        ) {
                                                            totalAccount = 0;
                                                            totalDate = '';
                                                        }
                                                    }
                                                }
                                            }
                                        } else if (categoryId == -1 && activityData['type'] !== 3) {
                                            if (emotionalResultDataEha[myActivity['org_activity_id']] == activityData['type']) {
                                                activityData = {...activityData, type: 2, s_range: 0.99};
                                                totalAccount = 1;
                                            }
                                        } else if (
                                            categoryId == -2 &&
                                            activityData['type'] !== 3 &&
                                            hraAssessment
                                        ) {
                                            let hraActivityDone =
                                                await this.commonHealthService.countActDataHra(
                                                    hraAssessment,
                                                    activityStartDate,
                                                    activityEndDate,
                                                    myActivity,
                                                );
                                            totalAccount =
                                                hraActivityDone[
                                                    'total_account'
                                                ];
                                            totalDate = hraActivityDone['date'];
                                            activityData = {
                                                ...activityData,
                                                type: 2,
                                                s_range: 0.99,
                                            };
                                        } else if (categoryId == -3 && activityData['type'] !== 3 && bioMetricAssessment?.length > 0) {
                                            let field = null;
                                            const fieldMapping = {1: 'height', 2: 'weight', 3: 'bmi', 4: 'systolic', 5: 'diastolic', 6: 'blood_glucose', 7: 'alc', 8: 'total_cholesterol', 9: 'hdl', 10: 'ldl', 11: 'triglycerides', 12: 'waist', 26: 'fasting_blood_glucose',};
                                            field = fieldMapping[myActivity['org_activity_id']];
                                            let activityData = await this.commonHealthService.getPlanActivityData(bioMetricAssessment, activityStartDate, activityEndDate, field,'bio', myActivity);
                                            totalDate = activityData['date'];
                                            totalAccount =
                                                activityData['total_account'];
                                            if (field === 'height') {
                                                totalAccount = Number(
                                                    (
                                                        activityData[
                                                            'total_account'
                                                        ] ?? '0'
                                                    )
                                                        .toString()
                                                        .replace(':', '.')
                                                        .split('.')
                                                        .slice(0, 2)
                                                        .join('.'),
                                                );
                                            }
                                        } else if (
                                            categoryId == 8 &&
                                            activityData['type'] !== 1 &&
                                            userAllActivity?.['challenge']?.[
                                                myActivity['org_activity_id']
                                            ]?.length > 0
                                        ) {
                                            activityData = {
                                                ...activityData,
                                                type: 2,
                                                s_range: 0.99,
                                            };
                                            totalAccount = 1;
                                        } else if (
                                            categoryId == 36 &&
                                            activityData['type'] !== 3 &&
                                            userAllActivity?.['quiz']?.[
                                                activityId
                                            ]?.length > 0
                                        ) {
                                            let quizActivityDone =
                                                await this.commonHealthService.countActDataQuiz(
                                                    userAllActivity['quiz'][
                                                        activityId
                                                    ],
                                                    activityStartDate,
                                                    activityEndDate,
                                                    myActivity,
                                                );
                                            totalAccount =
                                                quizActivityDone[
                                                    'total_account'
                                                ];
                                            totalDate = quizActivityDone['date'];
                                            activityData = {
                                                ...activityData,
                                                type: 2,
                                                s_range: 0.99,
                                            };
                                        } else {
                                            if (
                                                activityData['type'] != 3 &&
                                                userAllActivity?.[activityId] &&
                                                Object.keys(
                                                    userAllActivity[activityId],
                                                )?.length !== 0
                                            ) {
                                                let activityDone =
                                                    userAllActivity[activityId];
                                                activityDone =
                                                    await this.commonHealthService.countActData(
                                                        activityDone,
                                                        activityStartDate,
                                                        activityEndDate,
                                                        myActivity,
                                                    );
                                                if (categoryId === 43) {
                                                    activityData = {
                                                        ...activityData,
                                                        type: 2,
                                                        s_range: 0.99,
                                                    };
                                                }
                                                totalAccount =
                                                    activityDone[
                                                        'total_account'
                                                    ];
                                                totalDate = activityDone['date'];
                                            }
                                        }
                                        if (activityData['type'] != 3) {
                                            if (
                                                userAllActivity?.[
                                                    'authorizations'
                                                ]?.[activityId]
                                            ) {
                                                let actActivityDone =
                                                    userAllActivity[
                                                        'authorizations'
                                                    ][activityId];
                                                actActivityDone =
                                                    await this.commonHealthService.countActData(
                                                        actActivityDone,
                                                        activityStartDate,
                                                        activityEndDate,
                                                        myActivity,
                                                    ); // assuming count_act_data is a defined function
                                                let tmpPoints =
                                                    actActivityDone[
                                                        'total_account'
                                                    ];
                                                if (tmpPoints > 0) {
                                                    if (
                                                        TrBiometricsData === 0
                                                    ) {
                                                        totalAccount =
                                                            actActivityDone[
                                                                'total_account'
                                                            ];
                                                        totalDate = actActivityDone['date'];
                                                    } else {
                                                        if (
                                                            ![2, 3, 5].includes(
                                                                activityId,
                                                            )
                                                        ) {
                                                            totalAccount =
                                                                actActivityDone[
                                                                    'total_account'
                                                                ];
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        if (
                                            (activityData['type'] === 0 &&
                                                activityData['s_range'] === 0 &&
                                                activityData['e_range'] ===
                                                    0) ||
                                            activityData['type'] === 1 ||
                                            activityData['s_range'] === 0
                                        ) {
                                            activityData = {
                                                ...activityData,
                                                type: 2,
                                                s_range: 0.99,
                                            };
                                        }
                                        if (
                                            totalAccount !== 0 &&
                                            ((activityData['type'] === 0 &&
                                                totalAccount >=
                                                    activityData['s_range'] &&
                                                totalAccount <=
                                                    activityData['e_range']) ||
                                                (activityData['type'] === 1 &&
                                                    totalAccount <
                                                        activityData[
                                                            's_range'
                                                        ]) ||
                                                (activityData['type'] === 2 &&
                                                    totalAccount
                                                        .toString()
                                                        .split('.')
                                                        .slice(0, 2)
                                                        .join('.') >
                                                        activityData[
                                                            's_range'
                                                        ]))
                                        ) {
                                            if (
                                                !finalNotShowActivityIds.includes(
                                                    myActivity['id'],
                                                )
                                            ) {
                                                block[
                                                    'block_complete_activity'
                                                ] += 1;
                                                plan[
                                                    'plan_complete_activity'
                                                ] += 1;
                                            }
                                            block['activity_detail'] = block['activity_detail'] || {};
                                            block['activity_detail'][myActivity['id']] = block['activity_detail'][myActivity['id']] || {};
                                            block['activity_detail'][myActivity['id']]['log_date'] = await this.commonDateService.DateTimeFormat(totalDate,'YYYY-MM-DD','MM-DD-YYYY');
                                            block['activity_detail'][myActivity['id']]['log_value'] = totalAccount;
                                            myActivity['completeper'] = 100;
                                        }
                                        if (!myActivity['completeper']) {
                                            if (activityData['type'] === 2) {
                                                activityData['s_range'] =
                                                    activityData['s_range'] + 1;
                                            }
                                            myActivity['completeper'] =
                                                activityData['s_range'] !== 0 &&
                                                totalAccount <
                                                    activityData['s_range']
                                                    ? Math.round(
                                                          (totalAccount * 100) /
                                                              activityData[
                                                                  's_range'
                                                              ],
                                                      )
                                                    : 0;
                                        }
                                        if (myActivity['completeper']) {
                                            completeActivityIds.push(
                                                myActivity['id'],
                                            );
                                        }
                                    }
                                    if (
                                        finalNotShowActivityIds.includes(
                                            myActivity['id'],
                                        )
                                    ) {
                                        block['block_total_activity'] -= 1;
                                        plan['plan_total_activity'] -= 1;
                                    }
                                    if (
                                        myActivity['option_activity_ids'] &&
                                        !myActivity['completeActivity']
                                    ) {
                                        let subOptionActivity = myActivity[
                                            'option_activity_ids'
                                        ]
                                            .split(',')
                                            .map(Number);
                                        let exitInCompleteActivity =
                                            subOptionActivity.filter((value) =>
                                                completeActivityIds.includes(
                                                    value,
                                                ),
                                            );
                                        if (exitInCompleteActivity.length > 0) {
                                            myActivity['completeper'] = 100;
                                            block['block_complete_activity'] +=
                                                1;
                                            plan['plan_complete_activity'] += 1;
                                            if (
                                                myActivity['completeper'] ===
                                                    100 &&
                                                !myActivity['completeActivity']
                                            ) {
                                                let data = {
                                                    user_id: userId,
                                                    custom_id: myActivity['id'],
                                                    activity_id: -1,
                                                    created_by: userId,
                                                    status: 1,
                                                    source: 1,
                                                };
                                                completeActivitySave.push(data)
                                                data = undefined;
                                            }
                                        }
                                    }
                                    if (myActivity['completeper'] == 100 && myActivity['module_id'] == 1 && myActivity['completeActivity'] && myActivity['Events']) {
                                        let eventCusPoint = {
                                            user_id : userId,
                                            custom_id : myActivity['id'],
                                            created_by : userId,
                                            source : 1,
                                            status : 1,
                                        }
                                        completeActivitySave.push(eventCusPoint)
                                    }
                                }
                            }
                            if (
                                plan['assignPlan']['completion_on'] === 1 &&
                                plan['assignPlan']['c_range'] >= 1 &&
                                plan['assignPlan']['c_range'] <
                                    block['block_total_activity']
                            ) {
                                block['block_total_activity'] =
                                    plan['assignPlan']['c_range'];
                                if (
                                    block['block_complete_activity'] >
                                    block['block_total_activity']
                                ) {
                                    block['block_complete_activity'] =
                                        block['block_total_activity'];
                                }
                            }
                            let tempBlockComplete: MyPlanCompleteBlockEntity = Object.create(null);
                            if (block['block_total_activity'] !== 0 && block['block_total_activity'] === block['block_complete_activity']) {
                                if (block['completeBlock'] && block['completeBlock']['status'] === 0) {
                                    tempBlockComplete['id'] = block['completeBlock']['id'];
                                    tempBlockComplete['activity_detail'] = Object.keys(block['activity_detail']).length > 0 ? JSON.stringify(block['activity_detail']) : '';
                                    tempBlockComplete['complete_date'] = await this.commonDateService.DateTimeFormat(new Date(), 'YYYY-MM-DD HH:mm:ss');
                                    tempBlockComplete['status'] = 1;
                                }
                                if (!block['completeBlock']) {
                                    tempBlockComplete['plan_id'] = block['plan_id'];
                                    tempBlockComplete['block_id'] = block['id'];
                                    tempBlockComplete['activity_id'] = block['assignBlock']['activity_id'];
                                    tempBlockComplete['user_id'] = userId;
                                    tempBlockComplete['activity_detail'] = Object.keys(block['activity_detail']).length > 0 ? JSON.stringify(block['activity_detail']) : '';
                                }
                            } else if (Object.keys(block['activity_detail']).length > 0) {
                                if (block['completeBlock']?.['id']) {
                                    tempBlockComplete['id'] = block['completeBlock']['id']
                                }
                                tempBlockComplete['plan_id'] = block['plan_id'];
                                tempBlockComplete['block_id'] = block['id'];
                                tempBlockComplete['activity_id'] = block['assignBlock']['activity_id'];
                                tempBlockComplete['user_id'] = userId;
                                tempBlockComplete['status'] = 0;
                                tempBlockComplete['activity_detail'] = JSON.stringify(block['activity_detail']);
                            }
                            if (block['completeBlock']?.['activity_detail'] && Object.keys(block['activity_detail']).length == 0) {
                                if (block['completeBlock']?.['id']) {
                                    tempBlockComplete['id'] = block['completeBlock']['id']
                                }
                                tempBlockComplete['plan_id'] = block['plan_id'];
                                tempBlockComplete['block_id'] = block['id'];
                                tempBlockComplete['user_id'] = userId;
                                tempBlockComplete['activity_detail'] = '';
                            }
                            if (
                                typeof tempBlockComplete !== 'undefined' &&
                                Object.keys(tempBlockComplete).length > 0
                            ) {
                                if (tempBlockComplete?.id) {
                                    completeBlockUpdate.push(tempBlockComplete)
                                } else {
                                    completeBlockSave.push(tempBlockComplete)
                                }
                                tempBlockComplete = Object.create(null);
                            }
                        }
                    }
                    if (
                        plan['assignPlan']['completion_on'] == 1 &&
                        plan['assignPlan']['c_range'] >= 1 &&
                        plan['assignPlan']['c_range'] <
                            plan['plan_total_activity']
                    ) {
                        plan['plan_total_activity'] =
                            plan['assignPlan']['c_range'];
                        if (
                            plan['plan_complete_activity'] >
                            plan['plan_total_activity']
                        ) {
                            plan['plan_complete_activity'] =
                                plan['plan_total_activity'];
                        }
                    }
                    if (plan['plan_complete_activity'] !== 0) {
                        plan['total_activity_percentage'] = Math.round(
                            (plan['plan_complete_activity'] * 100) /
                                plan['plan_total_activity'],
                        );
                    }
                    if (
                        plan['joinPlan'] &&
                        plan['plan_total_activity'] !== 0 &&
                        plan['plan_total_activity'] ==
                            plan['plan_complete_activity']
                    ) {
                        if (plan['joinPlan']['is_complete'] == 0) {
                            plan['joinPlan']['complete_date'] =
                                await this.commonDateService.DateTimeFormat(
                                    'now',
                                    'YYYY-MM-DD HH:mm:ss',
                                );
                        }
                        plan['joinPlan']['complete_date'] = await this.commonDateService.DateTimeFormat(plan['joinPlan']['complete_date'],'YYYY-MM-DD HH:mm:ss');
                        plan['joinPlan']['is_complete'] = 1;
                        plan['joinPlan']['progress'] = 100;
                        if (plan?.['joinPlan']?.['id']) {
                            joinUserPlanUpdate.push(plan['joinPlan'])
                        } else {
                            joinUserPlanSave.push(plan['joinPlan'])
                        }
                    } else {
                        if (
                            plan['joinPlan'] &&
                            plan['plan_total_activity'] !== 0 &&
                            plan['total_activity_percentage'] !== 0 &&
                            plan['total_activity_percentage'] !==
                                plan['joinPlan']?.['progress']
                        ) {
                            plan['joinPlan']['progress'] = Math.round(
                                plan['total_activity_percentage'],
                            );
                            if (plan?.['joinPlan']?.['id']) {
                                joinUserPlanUpdate.push(plan['joinPlan'])
                            } else {
                                joinUserPlanSave.push(plan['joinPlan'])
                            }
                        }
                    }
                }
                }
            }
            await this.myPlanJoinUserPlanService.createMany(joinUserPlanSave);
            await this.myPlanJoinUserPlanService.bulkUpdate('id',joinUserPlanUpdate);
            await this.myPlanCompleteBlockService.createMany(completeBlockSave);
            await this.myPlanCompleteBlockService.bulkUpdate('id',completeBlockUpdate);
            await this.myPlanCompleteActivityService.createMany(completeActivitySave);
            await this.incentiveReportsService.update(
                {
                    id: reportData.id,
                    report_type: 'Myplan',
                    cron_status: CronStatus.BUSINESS_RULE,
                    org_id: reportData.org_id,
                },
                { cron_status: CronStatus.COMPILATION },
            );
            return true;
        } catch (error) {
            console.log("error",error);
            this.cronCommonService.errorLog(
                0,
                'my-plan-complete',
                error?.message,
                error,
            );
            return true;
        }
    }
}
