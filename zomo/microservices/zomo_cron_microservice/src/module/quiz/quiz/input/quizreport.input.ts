import { Allow } from 'class-validator';
export class QuizReportInput {
    @Allow() role_id?: number;
    @Allow() auto_request?: number;
    @Allow() org_id?: number;
    @Allow() membership_code?: string;
    @Allow() start_date?: string;
    @Allow() end_date?: string;
    @Allow() search_str?: string;
    @Allow() type?: string;
    @Allow() department_id?: number[] | string[] | string;
    @Allow() location_id?: number[] | string[] | string;
    @Allow() quiz_id?: number[] | string[] | string;
    @Allow() result_type?: number;
    @Allow() page?: number;
    @Allow() limit?: number;
    @Allow() userDetails?: any;
    @Allow() auto_request_id?: number;
}
