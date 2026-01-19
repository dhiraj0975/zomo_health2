import { Allow } from 'class-validator';
export class IndividualReportInput {
    @Allow() role_id?: number;
    @Allow() auto_request?: number;
    @Allow() result_type?: number;
    @Allow() search_str?: string;
    @Allow() page?: number;
    @Allow() limit?: number;
    @Allow() userDetails?: any;
}
