import { Allow } from 'class-validator';
export class PaginateWithHealthCheckupInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() user_id: number;
    @Allow() org_id: number;
    @Allow() start_date: string;
    @Allow() end_date: string;
}
