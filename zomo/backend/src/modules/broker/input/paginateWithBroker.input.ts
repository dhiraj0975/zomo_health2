import { Allow } from 'class-validator';
export class PaginateWithBrokerInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() filter_by: string;
    @Allow() type: string;
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() broker_admin_id: number;
    @Allow() department: number;
    @Allow() location: number;
}
