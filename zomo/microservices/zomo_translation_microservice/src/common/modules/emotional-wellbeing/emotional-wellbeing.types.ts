export type EntityKeyMap = Record<string, string>;
export type FieldDataResult = [Record<string, any>, Record<string, any>];

export interface EmotionalWellbeingFieldParams {
    orgId: string;
    formId: string;
}

export interface EmotionalWellbeingMainCollectionParams {
    orgId: string;
    formId: string;
    suboption1value: string;
}

export interface EmotionalWellbeingPostDetailsParams {
    orgId: string;
    formId: string;
    suboption2value: string;
}