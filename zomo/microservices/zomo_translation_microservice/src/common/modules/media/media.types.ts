export type EntityKeyMap = Record<string, string>;
export type FieldDataResult = [Record<string, any>, Record<string, any>];

export interface MediaFieldParams {
    orgId: string;
    formId: string;
}

export interface FitnessVideoFieldParams {
    orgId: string;
    formId: string;
}

export interface EmotionalWellbeingFieldParams {
    orgId: string;
    categoryId: string;
}

export interface FitnessVideoDetailParams {
    orgId: string;
    videoId: string;
}

export interface FitnessVideoCategoryParams {
    companyId: string;
}

export interface EmotionalWellbeingMainCollectionParams {
    companyId: string;
    categoryId: string;
}

export interface EmotionalWellbeingPostParams {
    companyId: string;
    categoryId: string;
}