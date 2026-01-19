export interface BiometricData {
    id: number;
    height: string | null;
    weight: string | null;
    bmi: string;
    systolic: string | null;
    diastolic: string | null;
    blood_glucose: string | null;
    hdl: string | null;
    ldl: string | null;
    triglycerides: string | null;
    waist: string | null;
    source: number;
    enter_by: number;
    created: string;
    acl: string;
    frm: string;
    user: any;
    created_copy: string;
    alc?: string | null;
    total_cholesterol?: string | null;
}

export interface ProcessedBiometricData {
    id: number;
    height: string | null;
    weight: string | null;
    bmi: string;
    systolic: string;
    diastolic: string;
    blood_glucose: string;
    alc: string;
    total_cholesterol: string;
    hdl: string;
    ldl: string;
    triglycerides: string;
    waist: string;
    user_type: string;
    frm: string;
    source: number;
    enter_by: number;
    created: string;
}