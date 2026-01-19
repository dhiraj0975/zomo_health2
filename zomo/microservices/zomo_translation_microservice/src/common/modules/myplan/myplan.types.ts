export type EntityKeyMap = Record<string, string>;
export type FieldDataResult = [Record<string, any>, Record<string, any>];

export interface MyPlanFieldParams {
    orgId: string;
    planId: string;
}

export interface MyPlanLabelFieldParams {
    orgId: string;
}