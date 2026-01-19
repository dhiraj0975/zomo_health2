import { Allow } from 'class-validator';
export class EngagementReportInput {
    @Allow() role_id?: number;
    @Allow() auto_request?: number;
    @Allow() result_type?: number;
    @Allow() search_str?: string;
    @Allow() org_id?: number[] | number | string | string[];
    @Allow() department_id?: number[] | string[] | string;
    @Allow() location_id?: number[] | string[] | string;
    @Allow() country?: number[] | string[] | string;
    @Allow() state?: number[] | string[] | string;
    @Allow() city?: number[] | string[] | string;
    @Allow() page?: number;
    @Allow() limit?: number;
    @Allow() userDetails?: any;
    @Allow() submission_date?: string;
    @Allow() filter_by?: string;
    @Allow() show_terminated_users?: number;
    @Allow() on_insurance_plan?: string;
    @Allow() start_date?: string;
    @Allow() end_date?: string;
    @Allow() report_type?: string;
}
