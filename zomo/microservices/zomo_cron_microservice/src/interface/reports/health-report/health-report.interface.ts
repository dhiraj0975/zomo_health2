export interface RiskCounts {
    Low_Risk: number;
    Moderate_Risk: number;
    High_Risk: number;
    Very_High_Risk: number;
}

export interface BiometricResult {
    measurement: string;
    average: number;
    unit?: string;
    lowRisk: { count: number; percentage: string };
    moderateRisk: { count: number; percentage: string };
    highRisk: { count: number; percentage: string };
    veryHighRisk: { count: number; percentage: string };
    total: { count: number; percentage: string };
}

export interface RiskCounter {
    doingGreat: number;
    almostThereMed: number;
    weCanHelpHigh: number;
    almostThereMod: number;
    weCanHelpVeryHigh: number;
    total: number;
}

export interface ReportRow {
    marker_color: string;
    "Health Assesment Section": string;
    "Doing Great"?: string;
    "Almost There - Med"?: string;
    "Almost There - Mod"?: string;
    "We Can Help - High"?: string;
    "We Can Help - Very High"?: string;
    "Almost There"?: string;
    "We Can Help"?: string;
    Total: string;
}

export type RiskLevel = 0 | 1 | 2 | 3 | 4;
export type NoOfRisk = 0 | 1 | 2;
export type ShowResultType = 2 | 3 | 5;

export type RiskCalculator = (maxRisk: RiskLevel, counter: RiskCounter) => void;