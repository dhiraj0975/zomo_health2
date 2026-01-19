import { Allow } from 'class-validator';
export class PaginateRegionInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() regional_admin: number;
    @Allow() created_by: number;
    @Allow() type: string;
}
