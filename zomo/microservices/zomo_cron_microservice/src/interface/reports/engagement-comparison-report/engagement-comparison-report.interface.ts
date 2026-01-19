import {IsString} from "class-validator";

export interface engagementComparisonReportInterface {
    camp_id?: number;
    org_id?: number;
    user_id?: number;
    user_type?: number;
    on_insurance_plan?: string
    department_ids?: number[];
    location_ids?: number[] ;
    date?: string;
    terminated_users?: number;
    user?: any;
    auto_request?: number;
    file_type?: string;
    auto_request_id?: number;
    department_id?: string;
    location_id?: string;
}

export interface Activity {
    id: number;
    cust_name: string;
    activity: {
        activity_name: string;
    };
    users: any[];
    custompoint: any[];
}

export interface Campaign {
    Campaignactivity?: Activity[];
    Campaigncategory?: Array<{
        activity?: Activity[];
    }>;
}

export interface FinalActivityData {
    [key: number]: (string | number)[];
}

