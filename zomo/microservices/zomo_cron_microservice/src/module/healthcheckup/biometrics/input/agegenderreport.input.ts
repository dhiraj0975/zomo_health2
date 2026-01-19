import { Allow } from 'class-validator';
export class AgeGenderReportInput {
    @Allow() role_id?: number;
    @Allow() auto_request?: number;
    @Allow() result_type?: number;
    @Allow() search_str?: string;
    @Allow() page?: number;
    @Allow() limit?: number;
    @Allow() userDetails?: any;
    @Allow() submission_date?: string;
    @Allow() filter_by?: string;
    @Allow() show_terminated_users?: number;
    @Allow() org_id?: number[] | number | string | string[];
}
