import { Allow } from 'class-validator';
export class PaginateWithAuthUserInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() user_id: number;
    @Allow() app_id: string;
}
