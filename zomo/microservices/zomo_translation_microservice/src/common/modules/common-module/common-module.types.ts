export type EntityKeyMap = Record<string, string>;
export type FieldDataResult = [Record<string, any>, Record<string, any>];

export interface MenuFieldParams {
    orgId: string;
}

export interface AgreementFieldParams {
    orgId: string;
}

export interface InformationPopupFieldParams {
    orgId: string;
}

export interface SurveyPopupFieldParams {
    orgId: string;
    formId: string;
}

export interface CovidPopupFieldParams {
    orgId: string;
}

export interface LoginPopupFieldParams {
    orgId: string;
}

export interface QuestionnairePopupFieldParams {
    orgId: string;
}

export interface SpouseAuthorizedPopupFieldParams {
    orgId: string;
}