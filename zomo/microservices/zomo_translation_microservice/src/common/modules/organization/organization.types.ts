export type EntityKeyMap = Record<string, string>;
export type FieldDataResult = [Record<string, any>, Record<string, any>];

export interface DepartmentListParams {
    companyId?: string;
}

export interface LocationListParams {
    companyId?: string;
}

export interface DepartmentFieldParams {
    departmentId: string;
}

export interface LocationFieldParams {
    locationId: string;
}