import { Allow } from 'class-validator';
export class ListEventInput {
    @Allow() created_by_user_id: number;
    @Allow() order: string;
    @Allow() order_by: string;
    @Allow() search_str: string;
    @Allow() category_id: number;
    @Allow() event_type: number;
    @Allow() org_id: string;
    @Allow() department_id: string;
    @Allow() location_id: string;
    @Allow() is_all: number = 0;
}
