import {
    ActivityEntity,
    ActivityFeedsEntity,
    AssessmentHraBiometricEntity,
    AssessmentsEntity,
    AuthorizationsEntity,
    BiometricsEntity,
    BodyFeedsEntity,
    DentistsEntity,
    EmotionalWellBeingPostClickEntity,
    EventUserBookingListsEntity,
    FoodFeedsEntity,
    FtBiometricsEntity,
    MediaFitnessVideoClickEntity,
    MyPlanActivityEntity,
    MyPlanAssignActivityEntity,
    MyPlanAssignBlockEntity,
    MyPlanAssignPlanEntity,
    MyPlanAssignRuleEntity,
    MyPlanBlocksEntity,
    MyPlanBusinessRuleEntity,
    MyPlanCompleteActivityEntity,
    MyPlanCompleteBlockEntity,
    MyPlanJoinUserPlanEntity,
    MyPlanPlansEntity,
    OptometristsEntity,
    QuickLinkClicksEntity,
    QuizAssignQuizOrgEntity,
    QuizQuizzesEntity,
    ScheduleChallengeJoinUsersEntity,
    SubmitedFormsEntity,
    TobaccoUsesEntity,
    UserDetailsEntity,
} from '@common-constants';

export type CompleteActivityType = {
    [custom_id: string]: MyPlanCompleteActivityEntity;
};

export type CompleteBlockType = {
    [block_id: string]: MyPlanCompleteBlockEntity;
};

export type JoinUserPlanType = {
    [plan_id: string]: MyPlanJoinUserPlanEntity;
};

export type TrBiometricsType = {
    [activity_ids: string]: BiometricsEntity[];
};

export type DentistsType = {
    [activity_id: string]: DentistsEntity[];
};

export type OptometristsType = {
    [activity_id: string]: OptometristsEntity[];
};

export type TobaccoUsesType = {
    [activity_id: string]: TobaccoUsesEntity[];
};

export type AuthorizationsType = {
    [activity_id: string]: AuthorizationsEntity[];
};

export type AssessmentsType = {
    [activity_id: string]: AssessmentsEntity[];
};

export type SubmitedFormsType = {
    [activity_id: string]: SubmitedFormsEntity[];
};

export type QuickLinkClicksType = {
    [activity_id: string]: QuickLinkClicksEntity[];
};

export type EventUserBookingListsType = {
    [activity_id: string]: EventUserBookingListsEntity[];
};

export type UserDetailsType = {
    [activity_id: string]: UserDetailsEntity[];
};

export type EmotionalWellBeingPostClickType = {
    [post_id: string]: EmotionalWellBeingPostClickEntity[];
};

export type MediaFitnessVideoClickType = {
    [v_id: string]: MediaFitnessVideoClickEntity[];
};

export type ScheduleChallengeJoinUsersType = {
    [schedule_id: string]: ScheduleChallengeJoinUsersEntity[];
};

export type ActivityFeedsEntityType = {
    [activity_id: string]: ActivityFeedsEntity[];
};

export type FoodFeedsType = {
    [activity_id: string]: FoodFeedsEntity[];
};

export interface biometricInterface {
    user_id: number;
    id: number;
    acl?: number;
    bmi?: number;
    height?: string;
    height_ft?: string;
    height_in?: string;
    weight?: string;
    frm?: string;
    systolic?: string;
    diastolic?: string;
    total_cholesterol?: string;
    hdl?: string;
    ldl?: string;
    triglycerides?: string;
    blood_glucose?: string;
    source: number;
    created: string;
    log_date_tmp: string;
    years: string;
    enter_by: number;
    waist?: string;
    random_blood_glucose?: string;
    fasting_blood_glucose?: number;
}

export interface QuizInAssignQuizOrgInterface extends QuizQuizzesEntity {
    assignQuizOrg: QuizAssignQuizOrgEntity;
}

export interface assignRuleInterface extends MyPlanAssignRuleEntity {
    br: MyPlanBusinessRuleEntity;
}

export interface PlanInterface extends MyPlanPlansEntity {
    blocks?: MyPlanBlocksEntity[];
    assignBlock?: MyPlanAssignBlockEntity;
    myActivity?: MyPlanActivityEntity[];
    assignActivity?: MyPlanAssignActivityEntity;
    activity?: ActivityEntity;
    acAge?: ActivityEntity;
    plan_total_activity?: number;
    plan_complete_activity?: number;
    total_activity_percentage?: number;
    assignPlan?: MyPlanAssignPlanEntity;
    joinPlan?: MyPlanJoinUserPlanEntity;
    completeBlock?: MyPlanCompleteBlockEntity;
    start_date?: string;
    end_date?: string;
}

export interface allPlanInterface extends MyPlanPlansEntity {
    assignPlan?: MyPlanAssignPlanEntity;
    joinUserPlan?: MyPlanJoinUserPlanEntity[];
}
export interface PlanMapValue {
    planName: string;
    joinUserPlan: MyPlanJoinUserPlanEntity[]; // 👈 joinUserPlan ni entity / array type hase to tame replace kari shako
}

export type AllBiometricType =
    | AssessmentHraBiometricEntity
    | BodyFeedsEntity
    | FtBiometricsEntity
    | BiometricsEntity;

export interface EventsCategoryInterface {
    id?: string;
    user_id?: number;
    log_date_tmp?: string;
    category_id?: number;
    activity_id?: number;
    ev_attend_status?: string;
}
export type eEventsCategoryType = {
    [category_id: string]: EventsCategoryInterface[];
};
