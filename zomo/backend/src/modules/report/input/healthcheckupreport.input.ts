import { Allow } from 'class-validator';
export class HealthCheckupReportInput {
    @Allow() role_id?: number;
    @Allow() auto_request?: number;
    @Allow() org_id?: number[] | number | string | string[];
    @Allow() result_type?: number;
    @Allow() type?: string;
    @Allow() membership_code?: string;
    @Allow() start_date?: string;
    @Allow() end_date?: string;
    @Allow() filter_by?: string;
    @Allow() search_str?: string;
    @Allow() on_insurance_plan?: string;
    @Allow() page?: number;
    @Allow() limit?: number;
    @Allow() show_terminated_users?: number;
    @Allow() submission_date?: string;
    @Allow() department_id:  number[] | string[] | string;
    @Allow() location_id: number[] | string[] | string;
    @Allow() country: number[] | string[] | string;
    @Allow() state: number[] | string[] | string;
    @Allow() city: number[] | string[] | string;
    @Allow() source_option: number[];
    @Allow() report_type?: string;
    @Allow() flag?: number;
}
