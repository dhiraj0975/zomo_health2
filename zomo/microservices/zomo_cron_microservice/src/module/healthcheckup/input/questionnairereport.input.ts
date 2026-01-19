import { Allow } from 'class-validator';
export class QuestionnaireReportInput {
    @Allow() role_id?: number;
    @Allow() auto_request?: number;
    @Allow() org_id?: number | string;
    @Allow() result_type?: number;
    @Allow() type?: string;
    @Allow() membership_code?: string;
    @Allow() start_date?: string;
    @Allow() end_date?: string;
    @Allow() search_str?: string;
    @Allow() page?: number;
    @Allow() limit?: number;
    @Allow() userDetails?: any;
}
