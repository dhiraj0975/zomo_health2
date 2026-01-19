export type EntityKeyMap = Record<string, string>;
export type FieldDataResult = [Record<string, any>, Record<string, any>];

export interface NutritionFieldParams {
    orgId: string;
}

export interface CovidPassportFieldParams {
    orgId: string;
    formId: string;
}