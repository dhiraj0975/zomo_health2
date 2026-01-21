import { appConstant, CommonArrayService } from '@common-constants';
import { Injectable } from '@nestjs/common';
import {
    ActivityFeedService,
    ActivityService,
    ActivityTrackerService,
    BiometricOtherService,
    BiometricService,
    BodyFeedService,
    BrokerService,
    CensusService,
    ChallengeActivityService,
    ChallengeChatService,
    ChallengeDayService,
    ChallengeDayWeekUserService,
    ChallengeInviteService,
    ChallengeOtherService,
    ChallengeScheduleService,
    ChallengeService,
    ChallengeSquareService,
    ChallengeTeamMembersService,
    ChallengeTeamScheduleService,
    ChallengeTeamService,
    ChallengeUserActivityService,
    ChallengeWeekService,
    ClaimService,
    ClientManagerAssignService,
    CoachService,
    CommunicationService,
    CompanyCEMInfoService,
    CompanyDashboardService,
    CompanyDepartmentLocationService,
    CompanyInterlinksService,
    CompanyOtherService,
    CompanyReportMenuService,
    CompanyService,
    CompanySideMenuService,
    CompanySupportService,
    CovidService,
    DataManagementService,
    DefaultService,
    DeviceConfigurationService,
    DiseaseManagementService,
    EmotionalWellbeingPostService,
    EmotionalWellbeingService,
    ErrorLogService,
    EventDepartmentLocationService,
    EventOtherService,
    EventService,
    EventSlotService,
    EventUserBookingListService,
    FoodAuthorizedUserService,
    FoodFeedService,
    FoodNutritionValueService,
    HaEmotionalAssessmentResultService,
    HaEmotionalAssessmentService,
    HaHealthAssessmentService,
    HealthAssessmentAnswersService,
    HealthAssessmentDetailsService,
    HealthAssessmentOtherService,
    HealthAssessmentResultService,
    HealthAssessmentService,
    HealthCheckupFormInstructionService,
    HealthCheckupService,
    HealthCheckupTobaccoUsesService,
    HealthCheckupUserFormService,
    IncentiveCampaignActivityService,
    IncentiveCampaignCategoryService,
    IncentiveCampaignChallengeService,
    IncentiveCampaignRewardService,
    IncentiveCampaignService,
    IncentiveCashRewardService,
    IncentiveCustomPointService,
    IncentiveOtherRewardService,
    IncentiveService,
    IncentiveSettingService,
    LanguageService,
    MediaFitnessOtherService,
    MediaFitnessPostService,
    MediaFitnessVideoService,
    MediaVideoService,
    MembershipPlanService,
    MyPlanAssignUserPlanService,
    MyPlanCompleteService,
    MyPlanJoinUserPlanService,
    MyPlanOtherService,
    MyPlanService,
    PermissionService,
    QuickLinkOtherService,
    QuickLinkService,
    QuizAssignOrgService,
    QuizDetailsService,
    QuizOtherService,
    QuizService,
    QuizUserService,
    ReimbursementService,
    ScheduleChallengeJoinUserService,
    SurveyService,
    ThemeService,
    UpComingActivityService,
    UserOtherService,
    UserService,
} from './module';
import { EmailLogService } from './module/emaillog';
@Injectable()
export class AppService {
    constructor(
        private readonly userOtherService: UserOtherService,
        private readonly userService: UserService,
        private readonly companyService: CompanyService,
        private readonly companyOtherService: CompanyOtherService,
        private readonly companyInterlinkService: CompanyInterlinksService,
        private readonly companyDashboardService: CompanyDashboardService,
        private readonly activityService: ActivityService,
        private readonly activityTrackerService: ActivityTrackerService,
        private readonly upComingActivityService: UpComingActivityService,
        private readonly biometricService: BiometricService,
        private readonly biometricOtherService: BiometricOtherService,
        private readonly brokerService: BrokerService,
        private readonly censusService: CensusService,
        private readonly challengeService: ChallengeService,
        private readonly challengeActivityService: ChallengeActivityService,
        private readonly challengeChatService: ChallengeChatService,
        private readonly challengeDayService: ChallengeDayService,
        private readonly challengeDayWeekUserService: ChallengeDayWeekUserService,
        private readonly challengeInviteService: ChallengeInviteService,
        private readonly challengeOtherService: ChallengeOtherService,
        private readonly challengeScheduleService: ChallengeScheduleService,
        private readonly challengeSquareService: ChallengeSquareService,
        private readonly challengeTeamService: ChallengeTeamService,
        private readonly challengeTeamMembersService: ChallengeTeamMembersService,
        private readonly challengeTeamScheduleService: ChallengeTeamScheduleService,
        private readonly challengeUserActivityService: ChallengeUserActivityService,
        private readonly challengeWeekService: ChallengeWeekService,
        private readonly scheduleChallengeJoinUserService: ScheduleChallengeJoinUserService,
        private readonly claimService: ClaimService,
        private readonly coachService: CoachService,
        private readonly communicationService: CommunicationService,
        private readonly companyDepartmentLocationService: CompanyDepartmentLocationService,
        private readonly companyReportMenuService: CompanyReportMenuService,
        private readonly companySideMenuService: CompanySideMenuService,
        private readonly companySupportService: CompanySupportService,
        private readonly covidService: CovidService,
        private readonly clientManagerAssignService: ClientManagerAssignService,
        private readonly dataManagementService: DataManagementService,
        private readonly deviceConfigurationService: DeviceConfigurationService,
        private readonly diseaseManagementService: DiseaseManagementService,
        private readonly emotionalWellbeingService: EmotionalWellbeingService,
        private readonly emotionalWellbeingPostService: EmotionalWellbeingPostService,
        private readonly eventService: EventService,
        private readonly eventDepartmentLocationService: EventDepartmentLocationService,
        private readonly eventOtherService: EventOtherService,
        private readonly eventSlotService: EventSlotService,
        private readonly eventUserBookingListService: EventUserBookingListService,
        private readonly haEmotionalAssessmentService: HaEmotionalAssessmentService,
        private readonly haEmotionalAssessmentResultService: HaEmotionalAssessmentResultService,
        private readonly haHealthAssessmentService: HaHealthAssessmentService,
        private readonly healthAssessmentService: HealthAssessmentService,
        private readonly healthAssessmentAnswersService: HealthAssessmentAnswersService,
        private readonly healthAssessmentDetailsService: HealthAssessmentDetailsService,
        private readonly healthAssessmentOtherService: HealthAssessmentOtherService,
        private readonly healthAssessmentResultService: HealthAssessmentResultService,
        private readonly healthCheckupService: HealthCheckupService,
        private readonly healthCheckupFormInstructionService: HealthCheckupFormInstructionService,
        private readonly healthCheckupTobaccoUsesService: HealthCheckupTobaccoUsesService,
        private readonly healthCheckupUserFormService: HealthCheckupUserFormService,
        private readonly incentiveService: IncentiveService,
        private readonly incentiveCampaignService: IncentiveCampaignService,
        private readonly incentiveCampaignActivityService: IncentiveCampaignActivityService,
        private readonly incentiveCampaignCategoryService: IncentiveCampaignCategoryService,
        private readonly incentiveCampaignChallengeService: IncentiveCampaignChallengeService,
        private readonly incentiveCampaignRewardService: IncentiveCampaignRewardService,
        private readonly incentiveCashRewardService: IncentiveCashRewardService,
        private readonly incentiveCustomPointService: IncentiveCustomPointService,
        private readonly incentiveOtherRewardService: IncentiveOtherRewardService,
        private readonly incentiveSettingsService: IncentiveSettingService,
        private readonly languageService: LanguageService,
        private readonly mediaFitnessOtherService: MediaFitnessOtherService,
        private readonly mediaFitnessPostService: MediaFitnessPostService,
        private readonly mediaFitnessVideoService: MediaFitnessVideoService,
        private readonly mediaVideoService: MediaVideoService,
        private readonly myPlanService: MyPlanService,
        private readonly myPlanAssignUserPlanService: MyPlanAssignUserPlanService,
        private readonly myPlanCompleteService: MyPlanCompleteService,
        private readonly myPlanJoinUserPlanService: MyPlanJoinUserPlanService,
        private readonly myPlanOtherService: MyPlanOtherService,
        private readonly permissionService: PermissionService,
        private readonly quickLinkService: QuickLinkService,
        private readonly quickLinkOtherService: QuickLinkOtherService,
        private readonly quizService: QuizService,
        private readonly quizAssignOrgService: QuizAssignOrgService,
        private readonly quizDetailsService: QuizDetailsService,
        private readonly quizOtherService: QuizOtherService,
        private readonly quizUserService: QuizUserService,
        private readonly reimbursementService: ReimbursementService,
        private readonly surveyService: SurveyService,
        private readonly themeService: ThemeService,
        private readonly activityFeedService: ActivityFeedService,
        private readonly bodyFeedService: BodyFeedService,
        private readonly foodAuthorizedUserService: FoodAuthorizedUserService,
        private readonly foodFeedService: FoodFeedService,
        private readonly foodNutritionValueService: FoodNutritionValueService,
        private readonly commonArrayService: CommonArrayService,
        private readonly membershipPlanService: MembershipPlanService,
        private readonly errorLogService: ErrorLogService,
        private readonly defaultService: DefaultService,
        private readonly companyCEMInfoService: CompanyCEMInfoService,
        private readonly emailLogService: EmailLogService,
    ) {}
    async create(data: any) {
        try {
            const service = await this.getService(data.table_name);
            if (service) {
                let remark = data?.updatedData?.remark || '';
                const resultedData = this.commonArrayService.compareObjects(
                    data.data,
                    data.updatedData,
                );
                for (const element of resultedData) {
                    await service.create({
                        reference_id: data.id,
                        event: data.event,
                        table_name: data.table_name,
                        field: element.field,
                        instring: element.instring,
                        outstring: element.outstring,
                        remark: remark,
                        created_by: data.user_id,
                    });
                }
                // await Promise.all(resultedData.map(async(element) =>
                //   await service.create({reference_id: data.id, event: data.event, table_name: data.table_name, field: element.field, instring: element.instring, outstring: element.outstring, remark: '', created_by: data.user_id })
                // ));
            }
            return true;
        } catch (error) {
            throw new Error(
                `Service not found for tablename: ${data.table_name}`,
            );
        }
    }
    async createMultiple(data: any) {
        try {
            if(data.length){
                for(let ele of data){
                    try{
                        this.create(ele);
                    }
                    catch(error){
                        let data = {user_id: 0,end_point: 'create/logError', message: 'CreateLogError', log: `${JSON.stringify(ele)}`, req: JSON.stringify(ele) }
                        this.error_log(data);
                    }
                }
            }
            return true;
        } catch (error) {
            throw new Error(
                `Service not found for tablename: ${data.table_name}`,
            );
        }
    }
    async error_log(data: any) {
        try {
            if (data) {
                await this.errorLogService.create(data)
            }
            return true;
        } catch (error) {
            throw new Error(`Error logging failed for data: ${JSON.stringify(data)}`);
        }
    }
    async email_log(data: any) {
        try {
            if (data) {
                await this.emailLogService.create(data)
            }
            return true;
        } catch (error) {
            throw new Error(`Error logging failed for data: ${JSON.stringify(data)}`);
        }
    }
    async getService(tableName: string): Promise<any | undefined> {
        try {
            switch (appConstant.TABLES[tableName]) {
                case 'users':
                    return this.userService;
                case 'user_other':
                    return this.userOtherService;
                case 'company':
                    return this.companyService;
                case 'company_other':
                    return this.companyOtherService;
                case 'c_internallinks':
                    return this.companyInterlinkService;
                case 'c_companydashboards':
                    return this.companyDashboardService;
                case 'activity':
                    return this.activityService;
                case 'activity_tracker':
                    return this.activityTrackerService;
                case 'upcomming_activities':
                    return this.upComingActivityService;
                case 'biometrics':
                    return this.biometricService;
                case 'biometrics_other':
                    return this.biometricOtherService;
                case 'broker':
                    return this.brokerService;
                case 'census':
                    return this.censusService;
                case 'challenge':
                    return this.challengeService;
                case 'challenge_activity':
                    return this.challengeActivityService;
                case 'challenge_chat':
                    return this.challengeChatService;
                case 'challenge_day':
                    return this.challengeDayService;
                case 'challenge_dayweek_users':
                    return this.challengeDayWeekUserService;
                case 'challenge_invite':
                    return this.challengeInviteService;
                case 'challenge_other':
                    return this.challengeOtherService;
                case 'challenge_schedule':
                    return this.challengeScheduleService;
                case 'challenge_square':
                    return this.challengeSquareService;
                case 'challenge_team':
                    return this.challengeTeamService;
                case 'ch_team_members':
                    return this.challengeTeamMembersService;
                case 'ch_team_schedule':
                    return this.challengeTeamScheduleService;
                case 'fitness_users_activity':
                    return this.challengeUserActivityService;
                case 'challenge_week':
                    return this.challengeWeekService;
                case 'ch_schedule_challenge_join_users':
                    return this.scheduleChallengeJoinUserService;
                case 'claim':
                    return this.claimService;
                case 'coach':
                    return this.coachService;
                case 'communication':
                    return this.communicationService;
                case 'company_department_location':
                    return this.companyDepartmentLocationService;
                case 'c_reportmenusettings':
                    return this.companyReportMenuService;
                case 'c_sidemenusettings':
                    return this.companySideMenuService;
                case 'c_supports':
                    return this.companySupportService;
                case 'covid':
                    return this.covidService;
                case 'c_client_manager_assignment':
                    return this.clientManagerAssignService;
                case 'c_membership_plan':
                    return this.membershipPlanService;
                case 'data_management':
                    return this.dataManagementService;
                case 'device_configuration':
                    return this.deviceConfigurationService;
                case 'disease_management':
                    return this.diseaseManagementService;
                case 'emotional_wellbeing':
                    return this.emotionalWellbeingService;
                case 'emotional_wellbeing_post':
                    return this.emotionalWellbeingPostService;
                case 'event':
                    return this.eventService;
                case 'event_department_location':
                    return this.eventDepartmentLocationService;
                case 'event_other':
                    return this.eventOtherService;
                case 'event_slot':
                    return this.eventSlotService;
                case 'ev_userbookinglists':
                    return this.eventUserBookingListService;
                case 'ha_emotional_assessments':
                    return this.haEmotionalAssessmentService;
                case 'ha_emotional_assessments_result':
                    return this.haEmotionalAssessmentResultService;
                case 'ha_assessments':
                    return this.haHealthAssessmentService;
                case 'health_assessment':
                    return this.healthAssessmentService;
                case 'ha_emotional_assessments_answer':
                    return this.healthAssessmentAnswersService;
                case 'health_assessment_details':
                    return this.healthAssessmentDetailsService;
                case 'health_assessment_other':
                    return this.healthAssessmentOtherService;
                case 'health_assessment_results':
                    return this.healthAssessmentResultService;
                case 'health_checkup':
                    return this.healthCheckupService;
                case 'hc_forminstructions':
                    return this.healthCheckupFormInstructionService;
                case 'hc_tabaccouses':
                    return this.healthCheckupTobaccoUsesService;
                case 'health_checkup_userforms':
                    return this.healthCheckupUserFormService;
                case 'incentive':
                    return this.incentiveService;
                case 'in_campaign':
                    return this.incentiveCampaignService;
                case 'in_campaign_activity':
                    return this.incentiveCampaignActivityService;
                case 'in_campaign_category':
                    return this.incentiveCampaignCategoryService;
                case 'in_campaign_challenge':
                    return this.incentiveCampaignChallengeService;
                case 'in_campaign_reward':
                    return this.incentiveCampaignRewardService;
                case 'in_cash_reward':
                    return this.incentiveCashRewardService;
                case 'in_custom_point':
                    return this.incentiveCustomPointService;
                case 'in_other_reward':
                    return this.incentiveOtherRewardService;
                case 'incentive_setting':
                    return this.incentiveSettingsService;
                case 'language':
                    return this.languageService;
                case 'media_fitness_other':
                    return this.mediaFitnessOtherService;
                case 'media_fitness_post':
                    return this.mediaFitnessPostService;
                case 'media_fitness_video':
                    return this.mediaFitnessVideoService;
                case 'me_fod_videos':
                    return this.mediaVideoService;
                case 'my_plan':
                    return this.myPlanService;
                case 'mp_assign_user_plan':
                    return this.myPlanAssignUserPlanService;
                case 'my_plan_complete':
                    return this.myPlanCompleteService;
                case 'mp_join_user_plan':
                    return this.myPlanJoinUserPlanService;
                case 'my_plan_other':
                    return this.myPlanOtherService;
                case 'permission':
                    return this.permissionService;
                case 'u_quicklink':
                    return this.quickLinkService;
                case 'quicklink_other':
                    return this.quickLinkOtherService;
                case 'quiz':
                    return this.quizService;
                case 'qz_assign_quiz_orgs':
                    return this.quizAssignOrgService;
                case 'quiz_details':
                    return this.quizDetailsService;
                case 'quiz_other':
                    return this.quizOtherService;
                case 'quiz_user':
                    return this.quizUserService;
                case 'reimbursement':
                    return this.reimbursementService;
                case 'survey':
                    return this.surveyService;
                case 'theme':
                    return this.themeService;
                case 'ft_activity_feeds':
                    return this.activityFeedService;
                case 'ft_body_feeds':
                    return this.bodyFeedService;
                case 'ft_authorizedusers':
                    return this.foodAuthorizedUserService;
                case 'ft_foods_feeds':
                    return this.foodFeedService;
                case 'ft_food_nutrition_values':
                    return this.foodNutritionValueService;
                case 'error_log':
                    return this.errorLogService;
                case 'c_company_cem_info':
                    return this.companyCEMInfoService;
                default:
                    return this.defaultService;
            }
        } catch (error) {
            console.error(
                `Error fetching service for tableName ${tableName}: ${error.message}`,
            );
            return undefined;
        }
    }
}
