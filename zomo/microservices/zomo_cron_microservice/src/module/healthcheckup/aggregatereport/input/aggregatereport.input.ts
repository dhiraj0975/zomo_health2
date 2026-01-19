import { Allow } from 'class-validator';
export class AggregateReportInput {
    @Allow() role_id?: number;
    @Allow() auto_request?: number;
    @Allow() result_type?: number;
    @Allow() search_str?: string;
    @Allow() org_id?: number[] | number | string | string[];
    @Allow() department_id?: number[] | string[] | string;
    @Allow() page?: number;
    @Allow() limit?: number;
    @Allow() userDetails?: any;
    @Allow() filter_by?: string;
    @Allow() start_date?: string;
    @Allow() end_date?: string;
}
