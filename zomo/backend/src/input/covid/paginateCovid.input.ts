import { Allow } from 'class-validator';
export class PaginateCovidInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() org_id: string;
    @Allow() q_id: number;
    @Allow() user_id: number;
    @Allow() filter_by: string;
    @Allow() from_date: string;
    @Allow() to_date: string;
}
