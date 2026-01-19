import { Allow } from 'class-validator';
export class PaginateWithFileOrganizationInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() file_id: number;
    @Allow() organization_id: number;
    @Allow() is_global: number;
    @Allow() company_id: number;
    @Allow() filter_by: string;
    @Allow() type: string;
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() broker_admin_id: number;
    @Allow() department: number;
    @Allow() location: number;
}
