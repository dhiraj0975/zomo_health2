import { Allow } from 'class-validator';
export class ListactivityInput {
    @Allow() id: string;
    @Allow() org_id: string;
    @Allow() activity_display: number;
    @Allow() category_id: number;
    @Allow() user_id: number;
    @Allow() search_str: string;
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() filter_by: string;
    @Allow() enable_activity_tracker: string;
    @Allow() enable_reimbursement: string;
    @Allow() status: number;
}