import { Allow } from 'class-validator';
export class PaginationCategoryInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() status: string;
}
