import { Injectable, Logger } from '@nestjs/common';
import { QuizModuleService } from './modules/quiz/quiz.service';
import { CampaignModuleService } from './modules/campaign/campaign.service';
import { ChallengeModuleService } from './modules/challenge/challenge.service';
import { EventModuleService } from './modules/event/event.service';
import { ActivityModuleService } from './modules/activity/activity.service';
import { AssessmentModuleService } from './modules/assessment/assessment.service';
import { MyPlanModuleService } from './modules/myplan/myplan.service';
import { MediaModuleService } from './modules/media/media.service';
import { TrackerModuleService } from './modules/tracker/tracker.service';
import { CommonModuleService } from './modules/common-module/common-module.service';
import { SupportModuleService } from './modules/support/support.service';
import { EmotionalWellbeingModuleService } from './modules/emotional-wellbeing/emotional-wellbeing-module.service';
import { OrganizationModuleService } from './modules/organization/organization.service';
import {
    ModuleKey,
    FieldDataResult,
    EntityKeyMap,
} from './modules/shared/types';

@Injectable()
export class TranslationCommonService {
    private readonly logger = new Logger(TranslationCommonService.name);

    constructor(
        private readonly quizModuleService: QuizModuleService,
        private readonly campaignModuleService: CampaignModuleService,
        private readonly challengeModuleService: ChallengeModuleService,
        private readonly eventModuleService: EventModuleService,
        private readonly activityModuleService: ActivityModuleService,
        private readonly assessmentModuleService: AssessmentModuleService,
        private readonly myPlanModuleService: MyPlanModuleService,
        private readonly mediaModuleService: MediaModuleService,
        private readonly trackerModuleService: TrackerModuleService,
        private readonly commonModuleService: CommonModuleService,
        private readonly supportModuleService: SupportModuleService,
        private readonly emotionalWellbeingModuleService: EmotionalWellbeingModuleService,
        private readonly organizationModuleService: OrganizationModuleService,
    ) {}

    async getDynamicOrgData(parent: string, sidebar: string): Promise<any> {
        try {
            this.logger.log(`Fetching org data: ${parent}_${sidebar}`);

            if (parent === 'MyHealth' && sidebar === 'Assessment')
                return { hra: 'hra', eha: 'eha' };

            if (parent === 'Trackers' && sidebar === 'Nutrition')
                return await this.trackerModuleService.getNutritionData();

            return {};
        } catch (error) {
            this.logger.error(
                `Error in getDynamicOrgData: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    async getDynamicModuleData(
        parent: string,
        sidebar: string,
        companyId?: string,
    ): Promise<EntityKeyMap> {
        try {
            const moduleKey: ModuleKey = `${parent}_${sidebar}`;
            this.logger.log(
                `Fetching module data: ${moduleKey}${companyId ? ` [${companyId}]` : ''}`,
            );

            const handlerMap: Record<ModuleKey, () => Promise<EntityKeyMap>> = {
                Events_Category: () =>
                    this.eventModuleService.getEventCategoryList(companyId),
                Events_Events: () =>
                    this.eventModuleService.getEventList(companyId),
                ActivityForms_Activities: () =>
                    this.activityModuleService.getActivityFormList(companyId),
                ActivityForms_SubmitForm: () =>
                    this.activityModuleService.getActivitySubmitFormList(
                        companyId,
                    ),
                Dashboard_UpcomingActivities: () =>
                    this.activityModuleService.getUpcomingActivityList(
                        companyId,
                    ),
                Reimbursements_Activities: () =>
                    this.activityModuleService.getReimbursementActivityList(
                        companyId,
                    ),
                Reimbursements_SubmitForm: () =>
                    this.activityModuleService.getReimbursementSubmitFormList(
                        companyId,
                    ),
                OrgAdmin_Department: () =>
                    this.organizationModuleService.getDepartmentList(companyId),
                OrgAdmin_Location: () =>
                    this.organizationModuleService.getLocationList(companyId),
                Challenge_MyChallenges: () =>
                    this.challengeModuleService.getChallengeList(companyId),
                Challenge_Activity: () =>
                    this.challengeModuleService.getChallengeActivityList(),
                Campaign_Campaigns: () =>
                    this.campaignModuleService.getCampaignList(companyId),
                Campaign_Category: () =>
                    this.campaignModuleService.getCampaignCategoryList(),
                Quizzes_Quizzes: () =>
                    this.quizModuleService.getQuizList(companyId),
                Quizzes_Categories: () =>
                    this.quizModuleService.getQuizCategoryList(),
                Common_SurveyPopup: () =>
                    this.commonModuleService.getSurveyPopupList(companyId),
                MyPlan_MyPlan: () =>
                    this.myPlanModuleService.getMyPlanList(companyId),
                Media_Media: () =>
                    this.mediaModuleService.getMediaCategoryList(companyId),
                Media_Fitnessvideos: () =>
                    this.mediaModuleService.getFitnessVideoList(companyId),
                Emotionalwellbeing_Emotionalwellbeing: () =>
                    this.mediaModuleService.getEmotionalWellbeingCategoryList(
                        companyId,
                    ),
                MyHealth_Assessment: () =>
                    this.assessmentModuleService.getAssessmentList(companyId),
            };

            const handler = handlerMap[moduleKey];
            return handler ? await handler() : {};
        } catch (error) {
            this.logger.error(
                `Error in getDynamicModuleData: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }

    async getDynamicSubModuleData(
        parent: string,
        sidebar: string,
        companyId: string,
        moduleType: string,
        subModuleLevel: string,
    ): Promise<EntityKeyMap> {
        try {
            const subModuleKey = `${parent}_${sidebar}_${subModuleLevel}`;
            this.logger.log(
                `Fetching sub-module: ${subModuleKey} [${companyId}]`,
            );

            const handlerMap: Record<string, () => Promise<EntityKeyMap>> = {
                Media_Fitnessvideos_subModule1: () =>
                    this.mediaModuleService.getFitnessVideoCategoryList(
                        companyId,
                    ),

                Emotionalwellbeing_Emotionalwellbeing_subModule1: () =>
                    this.mediaModuleService.getEmotionalWellbeingMainCollectionList(
                        companyId,
                        moduleType,
                    ),

                Emotionalwellbeing_Emotionalwellbeing_subModule2: () =>
                    this.mediaModuleService.getEmotionalWellbeingPostList(
                        companyId,
                        moduleType,
                    ),
            };

            const handler = handlerMap[subModuleKey];
            return handler ? await handler() : {};
        } catch (error) {
            this.logger.error(
                `Error in getDynamicSubModuleData: ${error.message}`,
                error.stack,
            );
            throw error;
        }
    }
    async modulewiseFieldLanguage(
        languageValue: any,
        sidebarValue: string,
        parentVal: string,
        selectText: string,
        selectOrgFieldList: string,
        selectFormFieldList: string,
        jsonSuboption1Value: any,
        jsonSuboption2Value: any,
        selectSuboption1Value: string,
        selectSuboption2Value: string,
    ): Promise<FieldDataResult> {
        try {
            this.logger.log(
                `modulewiseFieldLanguage: ${parentVal}_${sidebarValue}`,
            );
            if (parentVal === 'Quizzes') {
                if (sidebarValue === 'Categories')
                    return await this.quizModuleService.getQuizCategoryFields(
                        selectFormFieldList,
                    );
                if (sidebarValue === 'Quizzes')
                    return await this.quizModuleService.getQuizFields(
                        selectOrgFieldList,
                        selectFormFieldList,
                    );
            }
            if (parentVal === 'Campaign') {
                if (sidebarValue === 'Campaigns')
                    return await this.campaignModuleService.getCampaignFields(
                        selectFormFieldList,
                    );
                if (sidebarValue === 'Category')
                    return await this.campaignModuleService.getCampaignCategoryFields(
                        selectFormFieldList,
                    );
            }
            if (parentVal === 'Activities' && sidebarValue === 'Activities')
                return await this.activityModuleService.getActivitiesFields(
                    selectOrgFieldList,
                );
            if (parentVal === 'ActivityForms') {
                if (sidebarValue === 'SubmitForm')
                    return await this.activityModuleService.getActivitySubmitFormFields(
                        selectFormFieldList,
                    );
                if (sidebarValue === 'Activities')
                    return await this.activityModuleService.getActivityFormActivityFields(
                        selectFormFieldList,
                    );
            }
            if (parentVal === 'Reimbursements') {
                if (sidebarValue === 'SubmitForm')
                    return await this.activityModuleService.getReimbursementSubmitFormFields(
                        selectFormFieldList,
                    );
                if (sidebarValue === 'Activities')
                    return await this.activityModuleService.getReimbursementActivityFields(
                        selectFormFieldList,
                    );
            }
            if (parentVal === 'Challenge') {
                if (sidebarValue === 'MyChallenges')
                    return await this.challengeModuleService.getChallengeFields(
                        selectOrgFieldList,
                        selectFormFieldList,
                    );
                if (sidebarValue === 'Activity')
                    return await this.challengeModuleService.getChallengeActivityFields(
                        selectFormFieldList,
                    );
            }
            if (parentVal === 'Events') {
                if (sidebarValue === 'Events')
                    return await this.eventModuleService.getEventFields(
                        selectFormFieldList,
                    );
                if (sidebarValue === 'Category')
                    return await this.eventModuleService.getEventCategoryFields(
                        selectFormFieldList,
                    );
            }
            if (parentVal === 'HealthForms') {
                if (sidebarValue === 'SubmitForm')
                    return await this.activityModuleService.getHealthFormsSubmitFormFields(
                        selectOrgFieldList,
                    );
            }
            if (parentVal === 'MyPlan') {
                if (sidebarValue === 'MyPlan')
                    return await this.myPlanModuleService.getMyPlanFields(
                        selectOrgFieldList,
                        selectFormFieldList,
                    );
                if (sidebarValue === 'PlanLabel')
                    return await this.myPlanModuleService.getMyPlanLabelFields(
                        selectOrgFieldList,
                    );
            }
            if (parentVal === 'Support' && sidebarValue === 'Support')
                return await this.supportModuleService.getSupportFields(
                    selectOrgFieldList,
                );
            if (parentVal === 'QuickLink' && sidebarValue === 'QuickLink')
                return await this.supportModuleService.getQuickLinkFields(
                    selectOrgFieldList,
                );
            if (parentVal === 'MyHealth') {
                if (
                    sidebarValue === 'Assessment' &&
                    selectOrgFieldList === 'hra' &&
                    selectFormFieldList !== ''
                )
                    return await this.assessmentModuleService.getHraAssessmentFields(
                        selectFormFieldList,
                    );
                if (
                    sidebarValue === 'Assessment' &&
                    selectOrgFieldList === 'eha' &&
                    selectFormFieldList !== ''
                )
                    return await this.assessmentModuleService.getEhaAssessmentFields(
                        selectFormFieldList,
                    );
            }
            if (
                parentVal === 'Dashboard' &&
                sidebarValue === 'UpcomingActivities'
            )
                return await this.activityModuleService.getUpcomingActivityFields(
                    selectFormFieldList,
                );
            if (parentVal === 'Trackers') {
                if (sidebarValue === 'Nutrition')
                    return await this.trackerModuleService.getTrackersNutritionFields(
                        selectOrgFieldList,
                    );
                if (
                    sidebarValue === 'CovidPassport' &&
                    selectOrgFieldList !== ''
                )
                    return await this.trackerModuleService.getTrackersCovidPassportFields(
                        selectOrgFieldList,
                        selectFormFieldList,
                    );
            }
            if (parentVal === 'Common') {
                if (sidebarValue === 'Menu')
                    return await this.commonModuleService.getMenuFields(
                        selectOrgFieldList,
                    );
                if (sidebarValue === 'Agreement')
                    return await this.commonModuleService.getAgreementFields(
                        selectOrgFieldList,
                    );
                if (
                    sidebarValue === 'InformationPopup' &&
                    selectOrgFieldList !== ''
                )
                    return await this.commonModuleService.getInformationPopupFields(
                        selectOrgFieldList,
                    );
                if (
                    sidebarValue === 'SurveyPopup' &&
                    selectFormFieldList !== ''
                )
                    return await this.commonModuleService.getSurveyPopupFields(
                        selectOrgFieldList,
                        selectFormFieldList,
                    );
                if (sidebarValue === 'CovidPopup' && selectOrgFieldList !== '')
                    return await this.commonModuleService.getCovidPopupFields(
                        selectOrgFieldList,
                    );
                if (sidebarValue === 'LoginPopup' && selectOrgFieldList !== '')
                    return await this.commonModuleService.getLoginPopupFields(
                        selectOrgFieldList,
                    );
                if (
                    sidebarValue === 'QuestionnairePopup' &&
                    selectOrgFieldList !== ''
                )
                    return await this.commonModuleService.getQuestionnairePopupFields(
                        selectOrgFieldList,
                    );
                if (
                    sidebarValue === 'SpouseAuthorizedPopup' &&
                    selectOrgFieldList !== ''
                )
                    return await this.commonModuleService.getSpouseAuthorizedPopupFields(
                        selectOrgFieldList,
                    );
            }
            if (parentVal === 'Media') {
                if (sidebarValue === 'Media')
                    return await this.mediaModuleService.getMediaFields(
                        selectOrgFieldList,
                        selectFormFieldList,
                    );
                if (sidebarValue === 'Fitnessvideos')
                    return await this.mediaModuleService.getFitnessVideoFields(
                        selectOrgFieldList,
                        selectFormFieldList,
                    );
            }
            if (parentVal === 'Emotionalwellbeing')
                return await this.mediaModuleService.getEmotionalWellbeingFields(
                    selectOrgFieldList,
                    selectFormFieldList,
                );
            if (parentVal === 'OrgAdmin' && sidebarValue === 'Department')
                return await this.organizationModuleService.getDepartmentFields(
                    selectFormFieldList,
                );
            if (parentVal === 'OrgAdmin' && sidebarValue === 'Location')
                return await this.organizationModuleService.getLocationFields(
                    selectFormFieldList,
                );

            return [{}, {}];
        } catch (error) {
            this.logger.error(
                `Error in modulewiseFieldLanguage: ${error.message}`,
                error.stack,
            );
            return [{}, {}];
        }
    }
    async submodulewiseFieldLanguage(
        language_value: any,
        sidebar_value: string,
        parent_val: string,
        selectText: string,
        selectorgfieldlist: string,
        selectformfieldlist: string,
        json_suboption1value: any,
        json_suboption2value: any,
        selectsuboption1value: string,
        selectsuboption2value: string,
        subRequest: string,
        subType: string,
    ): Promise<FieldDataResult> {
        try {
            this.logger.log(
                `submodulewiseFieldLanguage: ${parent_val}_${sidebar_value} [org:${selectorgfieldlist}, form:${selectformfieldlist}, sub1:${selectsuboption1value}, sub2:${selectsuboption2value}, type:${subType}]`,
            );

            if (
                parent_val === 'Emotionalwellbeing' &&
                selectsuboption1value !== '' &&
                subType === '1'
            ) {
                return await this.emotionalWellbeingModuleService.getEmotionalWellbeingMainCollection(
                    selectorgfieldlist,
                    selectformfieldlist,
                    selectsuboption1value,
                );
            }

            if (
                parent_val === 'Emotionalwellbeing' &&
                selectsuboption2value !== '' &&
                subType === '2'
            ) {
                return await this.emotionalWellbeingModuleService.getEmotionalWellbeingPostDetails(
                    selectorgfieldlist,
                    selectformfieldlist,
                    selectsuboption2value,
                );
            }

            if (
                parent_val === 'Media' &&
                sidebar_value === 'Fitnessvideos' &&
                selectsuboption1value !== '' &&
                subType === '1'
            ) {
                return await this.mediaModuleService.getFitnessVideoFieldsDetails(
                    selectorgfieldlist,
                    selectsuboption1value,
                );
            }

            return [{}, {}];
        } catch (error) {
            this.logger.error(
                `Error in submodulewiseFieldLanguage: ${error.message}`,
                error.stack,
            );
            return [{}, {}];
        }
    }
}
