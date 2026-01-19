export type joinType = 'left_join' | 'inner_join' | 'left_one' | 'left_many' | 'inner_one' | 'inner_many' | 'inner_select' | 'left_select';
export type dataType = 'getOne' | 'getMany' | 'getRawOne' | 'getRawMany' | 'getCount' | 'getManyAndCount' | 'getExists';
export type SortDirection = 'ASC' | 'DESC';

export interface joinConditionInterface {
    join_table?: string,
    table: string,
    alias: string,
    on_condition: string,
    join_type: joinType
}

type MultiFieldOrder = {
    [field: string]: SortDirection;
};

export type OrderByOptions = MultiFieldOrder | null;

export type FieldSelection<T> = (keyof T & string)[] | string[]

export type HealthField = 'bmi' | 'systolic' | 'alc' | 'diastolic' | 'ldl' | 'triglycerides' | 'blood_glucose' | 'random_blood_glucose' | 'fasting_blood_glucose' | 'total_cholesterol' | 'hdlm' | 'hdlw' | 'waistm' | 'waistw';

export type RiskLevel = 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Very High Risk' | '';

export type MarkerColor = '#6ca540' | '#ffb848' | '#ff8b38' | '#b76931' | '#734702' | '#ccc';

export interface RiskConfig {
    bmi: (val: number) => RiskLevel;
    systolic: (val: number) => RiskLevel;
    diastolic: (val: number) => RiskLevel;
    blood_glucose: (val: number) => RiskLevel;
    alc: (val: number) => RiskLevel;
    hdlm: (val: number) => RiskLevel;
    hdlw: (val: number) => RiskLevel;
    ldl: (val: number) => RiskLevel;
    triglycerides: (val: number) => RiskLevel;
    total_cholesterol: (val: number) => RiskLevel;
    waist: (val: number) => RiskLevel;
}