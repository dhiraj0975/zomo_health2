import { Allow } from 'class-validator';
export class PaginateCompanyDashboardInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() org_id: number;
    @Allow() added_by: number;
    @Allow() reference_id: number;
}
