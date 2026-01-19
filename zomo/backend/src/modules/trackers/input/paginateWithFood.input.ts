import { Allow } from 'class-validator';
export class PaginateWithFoodInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() user_id: number;
    @Allow() foodId: number;
    @Allow() activityId: number;
    @Allow() app_id: number;
    @Allow() type: number;
    @Allow() NDB_No: string;
    @Allow() method: string;
    @Allow() start_date: string;
    @Allow() end_date: string;
    @Allow() collectDate: any;
    @Allow() collectionDate: string;
}
