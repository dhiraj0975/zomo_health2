export type EntityKeyMap = Record<string, string>;
export type FieldDataResult = [Record<string, any>, Record<string, any>];

export interface ActivityFieldParams {
    orgId: string;
}

export interface ActivityFormFieldParams {
    formId: string;
}

export interface ActivitySubmitFormFieldParams {
    formId: string;
}

export interface ReimbursementFieldParams {
    formId: string;
}

export interface UpcomingActivityFieldParams {
    activityId: string;
}