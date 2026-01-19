import { Allow } from 'class-validator';
export class PaginateWithUserInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() department_id: string;
    @Allow() location_id: string;
    @Allow() location: string;
    @Allow() role_id: string;
    @Allow() event_id: number;
    @Allow() org_id: string;
    @Allow() user_id: number;
    @Allow() status: number;
    @Allow() filter_by: string;
    @Allow() call_type: string;
}
