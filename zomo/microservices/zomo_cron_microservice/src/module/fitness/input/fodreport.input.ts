import { Allow } from 'class-validator';
export class FodReportInput {
    @Allow() role_id?: number;
    @Allow() auto_request?: number;
    @Allow() org_id?: number;
    @Allow() form_id?: number;
    @Allow() activity_id?: number;
    @Allow() type?: string;
    @Allow() membership_code?: string;
    @Allow() location?: string;
    @Allow() start_date?: string;
    @Allow() end_date?: string;
    @Allow() search_str?: string;
    @Allow() department_id?: number[] | string[] | string;
    @Allow() location_id?: number[] | string[] | string;
    @Allow() v_id?: number[] | string[] | string;
    @Allow() result_type?: number;
    @Allow() page?: number;
    @Allow() limit?: number;
    @Allow() show_terminated_users?: number;
    @Allow() userDetails?: any;
    @Allow() auto_request_id?: number;
}
