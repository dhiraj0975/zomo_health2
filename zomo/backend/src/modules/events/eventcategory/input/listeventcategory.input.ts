import { Allow } from 'class-validator';
export class ListEventCategoryInput {
    @Allow() id: number;
    @Allow() c_companies_id: string;
    @Allow() order: string;
    @Allow() order_by: string;
    @Allow() search_str: string;
    @Allow() created_by: number;
    @Allow() updated_by: number;
}
