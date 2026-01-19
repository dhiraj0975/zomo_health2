import { Allow } from 'class-validator';
export class PaginateCovidPassportInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() org_id: number;
    @Allow() approval_status: number;
    @Allow() created_by: number;
    @Allow() is_show_dashboard: number;
    @Allow() submitted_date: string;
}
